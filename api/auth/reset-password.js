import { json, error, hashPassword, dbQuery, dbExecute } from '../../_lib/db.js';
import { createHash } from 'crypto';

// POST /api/auth/reset-password - Restablecer contraseña
export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !/^[a-f0-9]{64}$/.test(token) || !password || password.length < 8) {
      return error('El enlace o la contraseña no son válidos', 400);
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');

    const resets = await dbQuery(
      `SELECT usuario_id FROM password_reset_tokens 
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')`,
      [tokenHash]
    );
    const reset = resets[0];

    if (!reset) {
      return error('El enlace no es válido o ya expiró', 400);
    }

    // Actualizar contraseña
    const newHash = await hashPassword(password);
    await dbExecute(
      "UPDATE usuarios SET password = ?, updated_at = datetime('now') WHERE id = ?",
      [newHash, reset.usuario_id]
    );

    // Marcar token como usado
    await dbExecute(
      "UPDATE password_reset_tokens SET used_at = datetime('now') WHERE token_hash = ?",
      [tokenHash]
    );

    return json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    return error('Error interno del servidor', 500);
  }
}