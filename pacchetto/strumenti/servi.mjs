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

// Pacchetti con scheletro umano e animazioni, da cui riadattare (licenza e cartella). I mostri: solo i «Big», gli altri non hanno gambe.
const MODELLI = path.join(radice, 'confronto-avatar-3d', 'modelli');
const PACCHETTI = [
  { id: 'quaternius-ual', nome: 'Quaternius, Universal Animation Library 1 e 2 (Standard)', licenza: 'CC0 1.0' },
  { id: 'quaternius-robot', nome: 'Quaternius, Animated Robot (RobotExpressive di three.js)', licenza: 'CC0 1.0' },
  { id: 'quaternius-animati', nome: 'Quaternius, Ultimate Animated Character Pack', licenza: 'CC0 1.0' },
  { id: 'quaternius-donna', nome: 'Quaternius, Ultimate Modular Women', licenza: 'CC0 1.0' },
  { id: 'quaternius-rpg', nome: 'Quaternius, RPG Characters', licenza: 'CC0 1.0' },
  { id: 'quaternius-mostri', nome: 'Quaternius, Ultimate Monsters (Big)', licenza: 'CC0 1.0', filtro: /^Big_/ },
  { id: 'kaykit', nome: 'KayKit Adventurers 1.0 e Skeletons 1.0', licenza: 'CC0 1.0' },
];
function elenco() {
  return PACCHETTI.map(({ filtro, ...pk }) => ({ ...pk,
    file: fs.readdirSync(path.join(MODELLI, pk.id)).filter(f => f.endsWith('.glb') && (!filtro || filtro.test(f))).sort() }));
}

http.createServer((req, res) => {
  if (req.url === '/elenco-sorgenti') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(elenco())); return; }
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
