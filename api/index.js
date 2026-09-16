import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL || '').replace(/\/$/, '');
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY || '';
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || getSupabaseSecretKey();
  return new TextEncoder().encode(secret);
}

function configError() {
  if (!getSupabaseUrl() || !getSupabaseSecretKey()) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY');
  }
}

function send(res, status, body) {
  res.status(status).json(body);
}

function error(res, message, status = 400) {
  send(res, status, { error: message });
}

async function supabase(path, options = {}) {
  configError();
  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.error || 'Error al consultar Supabase');
  }
  return data;
}

async function createToken(user) {
  return new SignJWT({
    sub: String(user.id),
    nombre: user.nombre,
    email: user.email,
    rol: user.rol
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(getJwtSecret());
}

async function getUser(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), getJwtSecret());
    return payload;
  } catch {
    return null;
  }
}

async function requireUser(req, roles = null) {
  const user = await getUser(req);
  if (!user) {
    const authError = new Error('No autorizado');
    authError.status = 401;
    throw authError;
  }
  if (roles && !roles.includes(user.rol)) {
    const roleError = new Error('No tienes permiso para realizar esta acción');
    roleError.status = 403;
    throw roleError;
  }
  return user;
}

function parseBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
}

function toNumber(value, name, { min = 0 } = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min) {
    const validationError = new Error(`${name} no es válido`);
    validationError.status = 400;
    throw validationError;
  }
  return number;
}

async function login(req, res) {
  const { email, password } = parseBody(req);
  if (!email || !password) return error(res, 'Email y contraseña son requeridos');

  const normalizedEmail = String(email).trim().toLowerCase();
  const rows = await supabase(`usuarios?email=eq.${encodeURIComponent(normalizedEmail)}&activo=eq.true&select=*`);
  const user = rows[0];
  const normalizedHash = user?.password?.replace(/^\$2y\$/, '$2b$');
  if (!user || !normalizedHash || !(await bcrypt.compare(String(password), normalizedHash))) {
    return error(res, 'Credenciales inválidas', 401);
  }

  await supabase(`usuarios?id=eq.${user.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ultimo_acceso: new Date().toISOString() })
  });

  const token = await createToken(user);
  return send(res, 200, {
    authenticated: true,
    token,
    user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
  });
}

async function getStats() {
  const products = await supabase('medicamentos?select=tipo,cantidad,fecha_caducidad');
  const today = new Date().toISOString().slice(0, 10);
  const inDays = days => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const stats = { totalMedicamentos: products.length, totalVacunas: 0, caducados: 0, criticos: 0, advertencia: 0 };
  for (const product of products) {
    if (product.tipo === 'vacuna') stats.totalVacunas += 1;
    if (Number(product.cantidad) <= 0) continue;
    if (product.fecha_caducidad < today) stats.caducados += 1;
    else if (product.fecha_caducidad <= inDays(30)) stats.criticos += 1;
    else if (product.fecha_caducidad <= inDays(90)) stats.advertencia += 1;
  }
  return { ...stats, proximosCaducar: stats.criticos + stats.advertencia };
}

async function createMedicamento(input, user) {
  const required = ['nombre', 'tipo', 'cantidad', 'fechaCaducidad'];
  for (const field of required) {
    if (input[field] === undefined || input[field] === '') {
      const validationError = new Error(`Campo requerido: ${field}`);
      validationError.status = 400;
      throw validationError;
    }
  }
  if (!['medicamento', 'vacuna'].includes(input.tipo)) {
    const validationError = new Error('Tipo de producto inválido');
    validationError.status = 400;
    throw validationError;
  }
  const cantidad = toNumber(input.cantidad, 'La cantidad', { min: 1 });
  const payload = {
    nombre: String(input.nombre).trim(),
    tipo: input.tipo,
    presentacion: String(input.presentacion || ''),
    concentracion: String(input.concentracion || ''),
    cantidad,
    unidad: String(input.unidad || 'frascos'),
    fecha_caducidad: input.fechaCaducidad,
    fecha_ingreso: input.fechaIngreso || new Date().toISOString().slice(0, 10),
    observaciones: String(input.observaciones || ''),
    imagen_url: String(input.imagenUrl || input.imagen_url || ''),
    requiere_receta: Boolean(input.requiereReceta),
    es_controlado: Boolean(input.esControlado)
  };
  const created = await supabase('medicamentos', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  });
  const medicamento = created[0];
  await supabase('actividades', {
    method: 'POST',
    body: JSON.stringify({
      tipo: 'entrada', medicamento_id: medicamento.id, medicamento: medicamento.nombre,
      cantidad, descripcion: `Alta de inventario: ${medicamento.nombre}`,
      fecha: new Date().toISOString(), usuario: user.nombre
    })
  });
  return medicamento;
}

async function createActividad(input, user) {
  if (!input.tipo || !input.descripcion || !input.fecha) {
    const validationError = new Error('Tipo, descripción y fecha son requeridos');
    validationError.status = 400;
    throw validationError;
  }
  const rows = await supabase('actividades', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      tipo: input.tipo, medicamento_id: input.medicamentoId || null,
      medicamento: input.medicamento || '', lote: input.lote || '',
      cantidad: input.cantidad ?? null, descripcion: input.descripcion,
      fecha: input.fecha, usuario: user.nombre
    })
  });
  return rows[0];
}

async function operation(input, user) {
  const medicamentoId = toNumber(input.medicamento_id, 'El medicamento', { min: 1 });
  const cantidad = input.cantidad === undefined ? null : toNumber(input.cantidad, 'La cantidad', { min: 0 });
  if (!['baja', 'salida', 'ajuste'].includes(input.tipo)) {
    const validationError = new Error('Operación inválida');
    validationError.status = 400;
    throw validationError;
  }
  return supabase('rpc/operar_inventario', {
    method: 'POST',
    body: JSON.stringify({
      p_medicamento_id: medicamentoId, p_tipo: input.tipo,
      p_cantidad: cantidad, p_usuario: user.nombre
    })
  });
}

export default async function handler(req, res) {
  try {
    const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
    if (req.method === 'POST' && action === 'login') return await login(req, res);
    if (action === 'check') {
      const user = await getUser(req);
      return send(res, user ? 200 : 401, { authenticated: Boolean(user), user: user || null });
    }
    if (req.method === 'POST' && action === 'logout') return send(res, 200, { success: true });

    if (req.method === 'GET') {
      await requireUser(req);
      if (action === 'medicamentos') return send(res, 200, { data: await supabase('medicamentos?select=*&order=fecha_caducidad.asc') });
      if (action === 'actividades') return send(res, 200, { data: await supabase('actividades?select=*&order=fecha.desc&limit=50') });
      if (action === 'stats') return send(res, 200, await getStats());
    }

    if (req.method === 'POST') {
      const user = await requireUser(req, ['admin', 'veterinario', 'tecnico']);
      const body = parseBody(req);
      if (action === 'medicamentos') return send(res, 201, await createMedicamento(body, user));
      if (action === 'actividades') return send(res, 201, await createActividad(body, user));
      if (action === 'operacion') return send(res, 200, await operation(body, user));
    }
    return error(res, 'Endpoint no encontrado', 404);
  } catch (caught) {
    console.error('API error:', caught);
    return error(res, caught.message || 'Error interno del servidor', caught.status || 500);
  }
}
