import { json } from '../../_lib/db.js';

// POST /api/auth/logout - Cerrar sesión (stateless, solo respuesta OK)
export async function POST(request) {
  return json({ success: true, message: 'Sesión cerrada' });
}