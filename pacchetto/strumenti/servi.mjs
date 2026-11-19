// Serve la cartella del laboratorio solo su questo PC (127.0.0.1), per gli strumenti che leggono modelli e three da node_modules.
// Uso: npm run strumenti   poi apri http://127.0.0.1:3202/pacchetto/strumenti/riadatta.html
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const radice = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTA = Number(process.env.PORTA) || 3202;
const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

http.createServer((req, res) => {
  let p;
  try { p = path.resolve(radice, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname)); } catch { res.writeHead(400).end(); return; }
  // Niente uscite dalla cartella del laboratorio.
  if (p !== radice && !p.startsWith(radice + path.sep)) { res.writeHead(403).end(); return; }
  fs.stat(p, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404).end('non trovato'); return; }
    res.writeHead(200, { 'Content-Type': TIPI[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(p).pipe(res);
  });
}).listen(PORTA, '127.0.0.1', () => console.log(`Strumenti: http://127.0.0.1:${PORTA}/pacchetto/strumenti/riadatta.html  (Ctrl+C per chiudere)`));
