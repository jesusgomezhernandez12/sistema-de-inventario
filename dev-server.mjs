import { statSync, existsSync, createReadStream, readFileSync } from 'fs';
import { join, extname } from 'path';
import { createServer as createHttpServer } from 'http';
import { parse } from 'url';
import apiHandler from './api/index.js';

// Load .env file
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    process.env[key] = value;
  }
}

const __dirname = new URL('.', import.meta.url).pathname;
const staticRoot = join(__dirname);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

const server = createHttpServer(async (req, res) => {
  const parsedUrl = parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '/';

  if (pathname.startsWith('/api')) {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const query = Object.fromEntries(url.searchParams.entries());
    const body = await readBody(req);
    const fakeReq = {
      method: req.method,
      url: req.url || '',
      query: query,
      headers: req.headers || {},
      body: body,
    };
    const fakeRes = {
      status: (code) => {
        res.statusCode = code;
        return fakeRes;
      },
      json: (data) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return fakeRes;
      },
      setHeader: (name, value) => {
        res.setHeader(name, value);
        return fakeRes;
      },
    };
    try {
      await apiHandler(fakeReq, fakeRes);
    } catch (e) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    }
    return;
  }

  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = join(staticRoot, filePath);

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  if (!existsSync(filePath)) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  createReadStream(filePath).pipe(res);
});

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString();
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
});