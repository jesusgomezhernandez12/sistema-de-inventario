import { json, error, hashPassword, verifyPassword, createToken, dbQuery, dbExecute } from '../../_lib/db.js';

// POST /api/auth/login - Iniciar sesión
export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return error('Email y contraseña son requeridos');
    }

    const users = await dbQuery(
      'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
      [email.toLowerCase().trim()]
    );
    
    const user = users[0];
    if (!user || !(await verifyPassword(password, user.password))) {
      return error('Credenciales inválidas', 401);
    }

    // Actualizar último acceso
    await dbExecute(
      "UPDATE usuarios SET ultimo_acceso = datetime('now') WHERE id = ?",
      [user.id]
    );

    const token = await createToken(user);
    
    return json({
      authenticated: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return error('Error interno del servidor', 500);
  }
}