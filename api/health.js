import { json, getTursoClient } from '../_lib/db.js';

// GET /api/health - Health check
export async function GET() {
  try {
    const client = getTursoClient();
    await client.execute('SELECT 1');
    return json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (e) {
    return json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: e.message
    }, 503);
  }
} 
