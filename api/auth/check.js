import { json, error, requireAuth, getTursoClient } from '../_lib/db.js';

// GET /api/auth/check - Verificar autenticación
export async function GET(request) {
  try {
    const user = requireAuth(request);
    return json({ authenticated: true, user });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ authenticated: false, user: null });
  }
}