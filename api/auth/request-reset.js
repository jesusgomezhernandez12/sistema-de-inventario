import { json, error, hashPassword, dbQuery, dbExecute } from '../../_lib/db.js';

// POST /api/auth/request-reset - Solicitar reset de contraseña
export async function POST(request) {
  try {
    const { email } = await request.json();
    const message = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

    if (!email || !email.includes('@')) {
      return json({ success: true, message });
    }

    const users = await dbQuery(
      'SELECT id, nombre, email FROM usuarios WHERE email = ? AND activo = 1',
      [email.toLowerCase().trim()]
    );
    const user = users[0];

    if (!user) {
      return json({ success: true, message });
    }

    // Invalidar tokens previos
    await dbExecute(
      "UPDATE password_reset_tokens SET used_at = datetime('now') WHERE usuario_id = ? AND used_at IS NULL",
      [user.id]
    );

    // Generar token
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await dbExecute(
      "INSERT INTO password_reset_tokens (usuario_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+1 hour'))",
      [user.id, tokenHash]
    );

    // En producción: enviar email con el enlace
    // const resetLink = `${process.env.APP_URL}/restablecer.html?token=${encodeURIComponent(token)}`;
    // await sendEmail(user.email, 'Recuperación de contraseña', `Usa este enlace: ${resetLink}`);

    // Para desarrollo: loguear el token
    console.log(`🔑 Password reset token for ${user.email}: ${token}`);
    console.log(`   Link: ${process.env.APP_URL || 'http://localhost:3000'}/restablecer.html?token=${token}`);

    return json({ success: true, message });
  } catch (err) {
    console.error('Request reset error:', err);
    return error('Error interno del servidor', 500);
  }
}