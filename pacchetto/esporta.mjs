// Prepara il pacchetto per l'app: rilascio/<versione>/ con modulo, Three.js locale, modelli scelti, licenze e manifesto.
// Uso: npm run esporta   (legge pacchetto/pacchetto.json). Dall'app: node scripts/importa-avatar.js <cartella del rilascio>.
// Dalle librerie di clip si tengono solo le clip dichiarate: il resto (e le mesh di prova delle librerie) si toglie.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { mergeDocuments, prune, resample, unpartition } from '@gltf-transform/functions';

const qui = path.dirname(fileURLToPath(import.meta.url));
const radice = path.resolve(qui, '..');
// Configurazione: pacchetto/pacchetto.json, oppure un altro file passato come argomento (prove di clip).
const cfg = JSON.parse(fs.readFileSync(process.argv[2] ? path.resolve(process.argv[2]) : path.join(qui, 'pacchetto.json'), 'utf8'));
const kk = path.join(radice, 'confronto-avatar-3d', 'modelli', 'kaykit2');
const out = path.join(radice, 'rilascio', cfg.versione);
const io = new NodeIO();

if (fs.existsSync(out)) throw new Error(`il rilascio ${cfg.versione} esiste già: alza la versione in pacchetto.json`);
fs.mkdirSync(path.join(out, 'three'), { recursive: true });
fs.mkdirSync(path.join(out, 'modelli'), { recursive: true });
fs.mkdirSync(path.join(out, 'licenze'), { recursive: true });

// ---- modulo e Three.js (import riscritti: niente import map né CDN nell'app) ----
fs.writeFileSync(path.join(out, 'avatar3d.js'), fs.readFileSync(path.join(qui, 'avatar3d.js'), 'utf8').replace('__VERSIONE__', cfg.versione));
const three = path.join(radice, 'node_modules', 'three');
fs.copyFileSync(path.join(three, 'build', 'three.module.min.js'), path.join(out, 'three', 'three.module.min.js'));
const riscrivi = (src, dst, sost) => fs.writeFileSync(path.join(out, 'three', dst), sost.reduce((s, [a, b]) => s.split(a).join(b), fs.readFileSync(path.join(three, src), 'utf8')));
riscrivi('examples/jsm/loaders/GLTFLoader.js', 'GLTFLoader.js', [["from 'three'", "from './three.module.min.js'"], ["'../utils/BufferGeometryUtils.js'", "'./BufferGeometryUtils.js'"]]);
riscrivi('examples/jsm/utils/BufferGeometryUtils.js', 'BufferGeometryUtils.js', [["from 'three'", "from './three.module.min.js'"]]);

// ---- clip: per ogni scheletro solo riposo e clip dei gesti, unite in un file su un solo scheletro ----
async function clipDi(rig, sk) {
  const volute = new Set([sk.riposo, ...Object.values(sk.gesti).flatMap(g => [...g.clip, ...(g.poi && g.poi !== 'fermo' && g.poi !== 'riposo' ? [g.poi] : [])])]);
  const pref = rig === 'large' ? 'Rig_Large_' : 'Rig_Medium_';
  let clip = null;
  // Librerie KayKit, poi le nostre (pacchetto/clip: clip riadattate da altri pacchetti, vedi clip/FONTI.md).
  const librerie = [path.join(kk, 'animazioni'), path.join(qui, 'clip')]
    .flatMap(d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.startsWith(pref) && f.endsWith('.glb')).map(f => path.join(d, f)) : []);
  for (const f of librerie) {
    const doc = await io.read(f);
    const root = doc.getRoot();
    // Canali e campionatori vanno tolti a mano: dispose() dell'animazione non li stacca, e i loro dati resterebbero nel file.
    // Gli accessori dei dati li toglie prune, solo se nessuna clip tenuta li usa. A parità di nome vince la prima libreria.
    const giàPrese = new Set(clip ? clip.getRoot().listAnimations().map(a => a.getName()) : []);
    for (const a of root.listAnimations()) if (!volute.has(a.getName()) || giàPrese.has(a.getName())) { a.listChannels().forEach(c => c.dispose()); a.listSamplers().forEach(x => x.dispose()); a.dispose(); }
    if (!root.listAnimations().length) continue;
    for (const mesh of root.listMeshes()) mesh.dispose();
    for (const node of root.listNodes()) node.setSkin(null);
    await doc.transform(prune({ keepLeaves: true }));
    if (!clip) { clip = doc; continue; }
    // Un solo scheletro nel file: le clip delle altre librerie puntano alle ossa omonime del primo
    // (con due scheletri il caricatore rinomina i doppioni «osso_1» e quelle clip non muovono più niente).
    mergeDocuments(clip, doc);
    const [primo, ...altri] = clip.getRoot().listScenes();
    // Le clip riadattate nel browser hanno i nomi come li scrive three («upperarm.l» -> «upperarml»): si cercano anche così.
    const pulito = n => n.replace(/\s/g, '_').replace(/[\[\].:\/]/g, '');
    const ossa = new Map();
    primo.traverse(n => { if (!ossa.has(n.getName())) ossa.set(n.getName(), n); });
    primo.traverse(n => { if (!ossa.has(pulito(n.getName()))) ossa.set(pulito(n.getName()), n); });
    const nelPrimo = new Set(ossa.values());
    for (const a of clip.getRoot().listAnimations()) for (const c of a.listChannels()) {
      const n = c.getTargetNode();
      if (n && !nelPrimo.has(n)) {
        const t = ossa.get(n.getName());
        if (!t) throw new Error(`osso ${n.getName()} della clip ${a.getName()} assente nel primo scheletro`);
        c.setTargetNode(t);
      }
    }
    for (const sc of altri) { const nodi = []; sc.traverse(n => nodi.push(n)); nodi.forEach(n => n.dispose()); sc.dispose(); }
  }
  const trovate = clip ? clip.getRoot().listAnimations().map(a => a.getName()) : [];
  const mancano = [...volute].filter(n => !trovate.includes(n));
  if (mancano.length) throw new Error(`clip ${rig} non trovate: ${mancano.join(', ')}`);
  await clip.transform(resample(), unpartition(), prune({ keepLeaves: true }));   // resample: toglie i fotogrammi ridondanti
  const nomi = clip.getRoot().listNodes().map(n => n.getName());
  if (new Set(nomi).size !== nomi.length) throw new Error('nomi di ossa doppi nel file delle clip');
  // Ossa che le clip muovono: ogni personaggio di questo scheletro deve averle tutte.
  const mosse = new Set(clip.getRoot().listAnimations().flatMap(a => a.listChannels().map(c => c.getTargetNode()?.getName()).filter(Boolean)));
  await io.write(path.join(out, 'modelli', `clip-${rig}.glb`), clip);
  console.log(`clip ${rig}: ${trovate.join(', ')}`);
  return mosse;
}
const mosse = {};
for (const [rig, sk] of Object.entries(cfg.scheletri)) {
  for (const g of Object.keys(sk.gesti)) if (!cfg.gesti[g]) throw new Error(`gesto ${g} dello scheletro ${rig} senza nome in «gesti»`);
  for (const g of Object.keys(cfg.gesti)) if (!sk.gesti[g]) throw new Error(`lo scheletro ${rig} non ha il gesto ${g}`);
  mosse[rig] = await clipDi(rig, sk);
}

// ---- personaggi interi (uno per file: l'app scarica solo quello scelto) ----
// Si tiene un personaggio solo se ha tutte le ossa che le clip del suo scheletro muovono.
fs.mkdirSync(path.join(out, 'modelli', 'personaggi'), { recursive: true });
const catalogo = JSON.parse(fs.readFileSync(path.join(kk, 'catalogo.json'), 'utf8'));
const scelti = (cfg.personaggi === 'tutti' ? catalogo : catalogo.filter(e => cfg.personaggi.includes(e.id)))
  .filter(e => !cfg.escludi.includes(e.id) && cfg.scheletri[e.rig]);
const personaggi = [], esclusi = [];
for (const e of scelti) {
  const doc = await io.read(path.join(kk, 'personaggi', e.id + '.glb'));
  // Gli agganci delle mani (handslot) sono nodi vuoti per le armi: chi non li ha li riceve, con la posa degli altri personaggi.
  for (const lato of ['r', 'l']) {
    const nodi = doc.getRoot().listNodes();
    if (nodi.some(n => n.getName() === 'handslot.' + lato)) continue;
    const mano = nodi.find(n => n.getName() === 'hand.' + lato);
    if (mano) mano.addChild(doc.createNode('handslot.' + lato).setTranslation([0, 0.0961, -0.0575]).setRotation([0, 0, Math.SQRT1_2, Math.SQRT1_2]));
  }
  const ossa = new Set(doc.getRoot().listNodes().map(n => n.getName()));
  const manca = [...mosse[e.rig]].filter(n => !ossa.has(n));
  if (manca.length) { esclusi.push(`${e.id} (mancano ${manca.join(', ')})`); continue; }
  await doc.transform(prune({ keepLeaves: true }));
  await io.write(path.join(out, 'modelli', 'personaggi', e.id + '.glb'), doc);
  personaggi.push({ id: e.id, nome: cfg.nomi[e.id] || e.label, gruppo: e.pack, rig: e.rig, file: `modelli/personaggi/${e.id}.glb` });
}
if (esclusi.length) console.log('esclusi: ' + esclusi.join('; '));
if (!personaggi.some(p => p.id === cfg.predefinito)) throw new Error('il predefinito non è fra i personaggi');

// ---- licenze e changelog ----
fs.copyFileSync(path.join(kk, '..', 'Licenza-KayKit2.txt'), path.join(out, 'licenze', 'KayKit.txt'));
fs.copyFileSync(path.join(three, 'LICENSE'), path.join(out, 'licenze', 'three.js.txt'));
// Clip riadattate da Quaternius (pacchetto/clip/FONTI.md)
// (una sola nota con tutte quelle Quaternius del laboratorio: pacchetti, Universal Animation Library, Robot)
if (fs.existsSync(path.join(qui, 'clip'))) fs.writeFileSync(path.join(out, 'licenze', 'Quaternius.txt'),
  ['Licenza-Quaternius-pacchetti.txt', 'Licenza-Quaternius-UAL.txt', 'Licenza-Quaternius-Robot.txt']
    .map(f => path.join(kk, '..', f)).filter(f => fs.existsSync(f)).map(f => fs.readFileSync(f, 'utf8').trim()).join('\n\n----------\n\n') + '\n');
fs.copyFileSync(path.join(qui, 'CHANGELOG.md'), path.join(out, 'CHANGELOG.md'));

// ---- manifesto: nomi per il modulo e SHA-256 di ogni file per l'importazione ----
const file = [];
(function giro(d) {
  for (const n of fs.readdirSync(d).sort()) {
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) giro(p);
    else { const b = fs.readFileSync(p); file.push({ path: path.relative(out, p).split(path.sep).join('/'), bytes: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex') }); }
  }
})(out);
const manifesto = {
  versione: cfg.versione, nota: cfg.nota, creato: new Date().toISOString(),
  predefinito: cfg.predefinito, personaggi,
  gesti: cfg.gesti,
  scheletri: Object.fromEntries(Object.entries(cfg.scheletri).map(([rig, sk]) => [rig, { ...sk, clip: `modelli/clip-${rig}.glb` }])),
  licenze: { 'KayKit (Kay Lousberg)': 'CC0 1.0, licenze/KayKit.txt', 'Quaternius (clip riadattate, fonti in pacchetto/clip/FONTI.md)': 'CC0 1.0, licenze/Quaternius.txt', 'three.js 0.153.0': 'MIT, licenze/three.js.txt' },
  file,
};
fs.writeFileSync(path.join(out, 'manifesto.json'), JSON.stringify(manifesto, null, 1) + '\n');
const tot = file.reduce((s, f) => s + f.bytes, 0);
console.log(`rilascio ${cfg.versione}: ${personaggi.length} personaggi, ${file.length} file, ${(tot / 1024).toFixed(0)} KB`);
for (const f of file) if (!f.path.startsWith('modelli/personaggi/')) console.log(`  ${f.path}  ${(f.bytes / 1024).toFixed(0)} KB`);
const pk = file.filter(f => f.path.startsWith('modelli/personaggi/')).map(f => f.bytes / 1024);
console.log(`  personaggi: da ${Math.min(...pk).toFixed(0)} a ${Math.max(...pk).toFixed(0)} KB l'uno`);
