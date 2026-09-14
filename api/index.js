import { json, error, requireAuth, dbQuery, dbExecute, dbTransaction, dbBatch } from '../../_lib/db.js';

// Helper: stats SQL
const statsSql = `
  SELECT 
    COUNT(*) AS total_medicamentos,
    SUM(CASE WHEN tipo = 'vacuna' THEN 1 ELSE 0 END) AS total_vacunas,
    SUM(CASE WHEN date(fecha_caducidad) < date('now') AND cantidad > 0 THEN 1 ELSE 0 END) AS caducados,
    SUM(CASE WHEN date(fecha_caducidad) BETWEEN date('now') AND date('now', '+30 days') AND cantidad > 0 THEN 1 ELSE 0 END) AS criticos,
    SUM(CASE WHEN date(fecha_caducidad) BETWEEN date('now', '+31 days') AND date('now', '+90 days') AND cantidad > 0 THEN 1 ELSE 0 END) AS advertencia
  FROM medicamentos
`;

// GET /api/index?action=bootstrap|stats|medicamentos|actividades
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const user = requireAuth(request);

    if (action === 'bootstrap') {
      const [medicamentos, statsRows] = await Promise.all([
        dbQuery('SELECT * FROM medicamentos ORDER BY fecha_caducidad ASC'),
        dbQuery(statsSql)
      ]);
      
      const stats = statsRows[0] || {};
      return json({
        medicamentos,
        stats: {
          totalMedicamentos: Number(stats.total_medicamentos ?? 0),
          totalVacunas: Number(stats.total_vacunas ?? 0),
          caducados: Number(stats.caducados ?? 0),
          criticos: Number(stats.criticos ?? 0),
          advertencia: Number(stats.advertencia ?? 0),
          proximosCaducar: Number(stats.criticos ?? 0) + Number(stats.advertencia ?? 0)
        }
      });
    }

    if (action === 'stats') {
      const statsRows = await dbQuery(statsSql);
      const stats = statsRows[0] || {};
      return json({
        totalMedicamentos: Number(stats.total_medicamentos ?? 0),
        totalVacunas: Number(stats.total_vacunas ?? 0),
        caducados: Number(stats.caducados ?? 0),
        criticos: Number(stats.criticos ?? 0),
        advertencia: Number(stats.advertencia ?? 0),
        proximosCaducar: Number(stats.criticos ?? 0) + Number(stats.advertencia ?? 0)
      });
    }

    if (action === 'medicamentos') {
      const rows = await dbQuery('SELECT * FROM medicamentos ORDER BY fecha_caducidad ASC');
      return json({ data: rows });
    }

    if (action === 'actividades') {
      const rows = await dbQuery('SELECT * FROM actividades ORDER BY fecha DESC LIMIT 50');
      return json({ data: rows });
    }

    return error('Endpoint no encontrado', 404);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('API GET error:', e);
    return error('Error interno del servidor', 500);
  }
}

// POST /api/index?action=medicamentos|actividades|operacion
export async function POST(request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const user = requireAuth(request, ['admin', 'veterinario', 'tecnico']);
    const body = await request.json();

    if (action === 'medicamentos') {
      return await handleCreateMedicamento(body, user);
    }
    if (action === 'actividades') {
      return await handleCreateActividad(body, user);
    }
    if (action === 'operacion') {
      return await handleOperacion(body, user);
    }
    return error('Endpoint no encontrado', 404);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('API POST error:', e);
    return error('Error interno del servidor', 500);
  }
}

async function handleCreateMedicamento(input, user) {
  const required = ['nombre', 'tipo', 'cantidad', 'fecha_caducidad'];
  for (const field of required) {
    if (!input[field]) return error(`Campo requerido: ${field}`);
  }

  const result = await dbExecute(
    `INSERT INTO medicamentos 
     (nombre, tipo, presentacion, concentracion, cantidad, unidad, fecha_caducidad, fecha_ingreso, observaciones, requiere_receta, es_controlado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.nombre,
      input.tipo,
      input.presentacion ?? '',
      input.concentracion ?? '',
      Number(input.cantidad),
      input.unidad ?? 'frascos',
      input.fecha_caducidad,
      input.fecha_ingreso ?? new Date().toISOString().split('T')[0],
      input.observaciones ?? '',
      Number(input.requiere_receta ?? 0),
      Number(input.es_controlado ?? 0)
    ]
  );

  const id = result.lastInsertRowid;
  
  // Registrar actividad de entrada
  await dbExecute(
    `INSERT INTO actividades (tipo, medicamento_id, medicamento, cantidad, descripcion, fecha, usuario)
     VALUES ('entrada', ?, ?, ?, ?, datetime('now'), ?)`,
    [id, input.nombre, Number(input.cantidad), `Alta de inventario: ${input.nombre}`, user.nombre]
  );

  const rows = await dbQuery('SELECT * FROM medicamentos WHERE id = ?', [id]);
  return json(rows[0]);
}

async function handleCreateActividad(input, user) {
  const required = ['tipo', 'descripcion', 'fecha'];
  for (const field of required) {
    if (!input[field]) return error(`Campo requerido: ${field}`);
  }

  const result = await dbExecute(
    `INSERT INTO actividades (tipo, medicamento_id, medicamento, lote, cantidad, descripcion, fecha, usuario)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.tipo,
      input.medicamento_id ?? null,
      input.medicamento ?? '',
      input.lote ?? '',
      input.cantidad ?? null,
      input.descripcion,
      input.fecha,
      user.nombre
    ]
  );

  const id = result.lastInsertRowid;
  const rows = await dbQuery('SELECT * FROM actividades WHERE id = ?', [id]);
  return json(rows[0]);
}

async function handleOperacion(input, user) {
  const medicamentoId = Number(input.medicamento_id);
  const tipo = input.tipo;
  const cantidad = input.cantidad !== undefined ? Number(input.cantidad) : null;

  if (medicamentoId < 1 || !['baja', 'salida', 'ajuste'].includes(tipo)) {
    return error('Operación o medicamento inválido');
  }

  let updateSql, updateArgs, activityType, activityQuantity, activityPrefix;

  if (tipo === 'baja') {
    updateSql = 'UPDATE medicamentos SET cantidad = 0, updated_at = datetime(\'now\') WHERE id = ? AND cantidad > 0';
    updateArgs = [medicamentoId];
    activityType = 'baja';
    activityQuantity = 0;
    activityPrefix = 'Baja de inventario: ';
  } else if (tipo === 'salida') {
    if (!cantidad || cantidad < 1) return error('La cantidad de salida debe ser mayor que cero');
    updateSql = 'UPDATE medicamentos SET cantidad = cantidad - ?, updated_at = datetime(\'now\') WHERE id = ? AND cantidad >= ?';
    updateArgs = [cantidad, medicamentoId, cantidad];
    activityType = 'salida';
    activityQuantity = cantidad;
    activityPrefix = 'Salida de inventario: ';
  } else { // ajuste
    if (cantidad === null || cantidad < 0) return error('La cantidad ajustada no puede ser negativa');
    updateSql = 'UPDATE medicamentos SET cantidad = ?, updated_at = datetime(\'now\') WHERE id = ?';
    updateArgs = [cantidad, medicamentoId];
    activityType = 'ajuste';
    activityQuantity = cantidad;
    activityPrefix = 'Ajuste de inventario: ';
  }

  const results = await dbTransaction([
    { sql: updateSql, args: updateArgs },
    {
      sql: `INSERT INTO actividades (tipo, medicamento_id, medicamento, cantidad, descripcion, fecha, usuario)
            SELECT ?, id, nombre, ?, ? || nombre, datetime('now'), ?
            FROM medicamentos WHERE id = ? AND changes() > 0`,
      args: [activityType, activityQuantity, activityPrefix, user.nombre, medicamentoId]
    },
    { sql: 'SELECT * FROM medicamentos WHERE id = ?', args: [medicamentoId] },
    { sql: 'SELECT * FROM actividades WHERE medicamento_id = ? ORDER BY id DESC LIMIT 1', args: [medicamentoId] }
  ]);

  if (Number(results[0].rowsAffected ?? 0) !== 1) {
    return error(
      tipo === 'salida' 
        ? 'La cantidad de salida supera el stock disponible' 
        : 'El producto no tiene stock disponible', 
      400
    );
  }

  return json({
    medicamento: results[2].rows[0] ?? null,
    actividad: results[3].rows[0] ?? null
  });
}