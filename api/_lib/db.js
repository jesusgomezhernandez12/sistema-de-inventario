import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

// ============================================
// Turso Client (Singleton para Serverless)
// ============================================
let tursoClient = null;

export function getTursoClient() {
  if (!tursoClient) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    if (!url || !authToken) {
      throw new Error('TURSO_DATABASE_URL y TURSO_AUTH_TOKEN requeridos');
    }
    
    tursoClient = createClient({ url, authToken });
  }
  return tursoClient;
}

// ============================================
// Helpers de DB
// ============================================
export async function dbQuery(sql, args = []) {
  const client = getTursoClient();
  const result = await client.execute({ sql, args });
  return result.rows;
}

export async function dbExecute(sql, args = []) {
  const client = getTursoClient();
  const result = await client.execute({ sql, args });
  return {
    lastInsertRowid: result.lastInsertRowid,
    rowsAffected: result.rowsAffected
  };
}

export async function dbBatch(statements) {
  const client = getTursoClient();
  const result = await client.batch(statements.map(s => ({
    sql: s.sql,
    args: s.args ?? []
  })));
  return result;
}

export async function dbTransaction(statements) {
  const client = getTursoClient();
  return await client.transaction(
    statements.map(s => ({ sql: s.sql, args: s.args ?? [] }))
  );
}

// ============================================
// Auth: JWT (stateless, sin sesiones PHP)
// ============================================
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
);
const JWT_EXPIRY = '2h';

export async function createToken(user) {
  return await new SignJWT({
    sub: String(user.id),
    nombre: user.nombre,
    email: user.email,
    rol: user.rol
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return await bcrypt.verify(password, hash);
}

// ============================================
// Helpers para API Responses
// ============================================
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

export function getUserFromRequest(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export function requireAuth(request, allowedRoles = null) {
  const user = getUserFromRequest(request);
  if (!user) throw new Response(null, { status: 401 });
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    throw new Response(null, { status: 403 });
  }
  return user;
}