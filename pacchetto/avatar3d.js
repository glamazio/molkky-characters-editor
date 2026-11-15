// Avatar 3D di Mölkky: il modulo che il laboratorio consegna all'app (contratto in pacchetto/CONTRATTO.md).
// L'app conosce solo queste funzioni: niente nomi di ossa, clip o pacchetti di modelli.
//   const elenco = await personaggi();                    // { predefinito, personaggi: [{ id, nome, gruppo }] }
//   const nomi = await gesti();                           // [{ id: 'bel_tiro', nome: '12' }, …]
// Un personaggio solo (profilo):
//   const a = await monta(elemento, { colore: '#e63946', personaggio: 'Knight' });
//   a.gesto('bel_tiro'); a.cambia('Mage'); a.attacca(nuovoElemento); a.smonta();
// Più personaggi nella stessa tela (partita, fine partita):
//   const s = await scena(elemento, [{ personaggio: 'Knight', colore: '#e63946' }, …], { fermaARiposo: true });
//   s.gesto(0, 'vittoria'); s.evidenzia(1); s.cambia(2, 'Witch'); s.attacca(el); s.smonta();
// Con fermaARiposo la tela disegna solo durante i gesti (e mentre la si gira), poi si ferma: niente batteria a riposo.
// Trascinando in orizzontale sulla tela i personaggi ruotano; in verticale la pagina scorre come sempre.
import * as THREE from './three/three.module.min.js';
import { GLTFLoader } from './three/GLTFLoader.js';

const base = new URL('.', import.meta.url);
const loader = new GLTFLoader();
let caricati = null;            // manifesto: una volta sola per pagina
const modelli = new Map();      // id -> Promise del modello: si scarica solo il personaggio scelto
const clipSet = new Map();      // scheletro -> Promise delle sue clip: si scaricano solo se serve quello scheletro
const unaVolta = (mappa, chiave, fn) => { if (!mappa.has(chiave)) mappa.set(chiave, fn().catch(e => { mappa.delete(chiave); throw e; })); return mappa.get(chiave); };

function carica() {
  if (!caricati) caricati = fetch(new URL('manifesto.json', base)).then(r => r.json()).catch(e => { caricati = null; throw e; });
  return caricati;
}
async function modello(id) {
  const m = await carica();
  const p = m.personaggi.find(x => x.id === id) || m.personaggi.find(x => x.id === m.predefinito);
  const [gltf, clip] = await Promise.all([
    unaVolta(modelli, p.id, () => loader.loadAsync(new URL(p.file, base).href)),
    unaVolta(clipSet, p.rig, () => loader.loadAsync(new URL(m.scheletri[p.rig].clip, base).href).then(g => new Map(g.animations.map(c => [c.name, c])))),
  ]);
  return { p, gltf, clip, sk: m.scheletri[p.rig] };
}

export const versione = '__VERSIONE__';
export const gesti = () => carica().then(m => Object.entries(m.gesti).map(([id, nome]) => ({ id, nome })));
export const personaggi = () => carica().then(m => ({ predefinito: m.predefinito, personaggi: m.personaggi.map(({ id, nome, gruppo }) => ({ id, nome, gruppo })) }));

// ---- una figura: modello, clip del suo scheletro, gesti in sequenza, disco del colore del giocatore ----
class Figura {
  constructor(colore, sveglia) {
    this.gruppo = new THREE.Group();
    this.disco = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: colore || '#888888', transparent: true, opacity: 0.85 }));
    this.disco.rotation.x = -Math.PI / 2; this.gruppo.add(this.disco);
    this.sveglia = sveglia; this.fig = null; this.finito = null; this.id = null; this.nome = '';
  }
  async metti(id) {
    const { p, gltf, clip, sk } = await modello(id);
    if (this.fig) { this.mixer.stopAllAction(); this.gruppo.remove(this.fig); }
    if (this.finito) { this.finito.risolvi(); this.finito = null; }
    this.clip = clip; this.sk = sk;
    this.fig = gltf.scene.clone(true);
    rilegaScheletri(this.fig);   // clone() non duplica gli scheletri
    this.gruppo.add(this.fig);
    this.mixer = new THREE.AnimationMixer(this.fig);
    // Fine di una clip del gesto: la prossima della sequenza, oppure il «poi» (riposo, fermo, o una clip in ciclo).
    this.mixer.addEventListener('finished', e => {
      if (e.action !== this.attuale || !this.finito) return;
      const g = this.finito;
      if (g.coda.length) return this.passa(this.azione(g.coda.shift()), false);
      this.finito = null;
      if (g.poi !== 'fermo') this.passa(this.azione(g.poi === 'riposo' ? sk.riposo : g.poi), true);
      g.risolvi();
    });
    this.attuale = null; this.passa(this.azione(sk.riposo), true);
    this.mixer.update(0);
    // Ingombro nella posa di riposo (con le ossa, non a braccia aperte): serve all'inquadratura e al disco.
    const box = ingombro(this.fig);
    this.h = box.max.y - box.min.y; this.base = box.min.y;
    this.disco.scale.setScalar(this.h * 0.32); this.disco.position.y = box.min.y + 0.002;
    this.id = p.id; this.nome = p.nome;
    this.sveglia();
    return p.id;
  }
  azione(nome) { return this.mixer.clipAction(this.clip.get(nome)); }
  passa(nuova, ciclo) {
    if (nuova.getClip().duration === 0) ciclo = false;   // una posa ferma (durata zero) non si ripete: si tiene
    nuova.reset();
    nuova.setLoop(ciclo ? THREE.LoopRepeat : THREE.LoopOnce, ciclo ? Infinity : 1);
    nuova.clampWhenFinished = !ciclo;
    nuova.play();
    if (this.attuale && this.attuale !== nuova) this.attuale.crossFadeTo(nuova, 0.25, false);
    this.attuale = nuova;
  }
  gesto(nome) {
    const g = this.sk && this.sk.gesti[nome];
    if (!g) return Promise.reject(new Error('gesto sconosciuto: ' + nome));
    if (this.finito) this.finito.risolvi();
    const [prima, ...coda] = g.clip;
    const p = new Promise(risolvi => { this.finito = { nome, coda, poi: g.poi || 'riposo', risolvi }; this.passa(this.azione(prima), false); });
    this.sveglia();
    return p;
  }
  get inGesto() { return !!this.finito; }
  aggiorna(dt) { if (this.mixer) this.mixer.update(dt); }
}

// ---- il palco: tela, luci, camera, rotazione col dito, giro di disegno che si ferma a riposo ----
function palco(el, opz) {
  const scena = new THREE.Scene();
  scena.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 2.2));
  const sole = new THREE.DirectionalLight(0xffffff, 1.6); sole.position.set(2, 4, 3); scena.add(sole);
  const perno = new THREE.Group(); scena.add(perno);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opz.densitaMax || 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const tela = renderer.domElement;
  tela.style.display = 'block'; tela.style.width = '100%'; tela.style.height = '100%';
  tela.style.touchAction = 'pan-y'; tela.style.cursor = 'grab';
  tela.setAttribute('role', 'img'); tela.setAttribute('aria-label', opz.etichetta || 'Personaggi 3D');

  const P = { scena, perno, camera, renderer, tela, figure: [], inquadra: () => {} };
  let presa = null, vel = 0, vivo = true, quadro = 0, ultimo = 0, ultimoMoto = 0;
  const ferma = !!opz.fermaARiposo;
  // Il giro gira finché c'è qualcosa che si muove; con fermaARiposo, a riposo disegna un ultimo quadro e si ferma.
  function giro() {
    quadro = 0;
    if (!vivo) return;
    const t = performance.now(), dt = Math.max(0, Math.min((t - ultimo) / 1000, 0.1)); ultimo = t;
    if (!tela.isConnected) { quadro = requestAnimationFrame(giro); return; }   // tela tolta dalla pagina: si aspetta
    if (!presa && Math.abs(vel) > 0.01) { perno.rotation.y += vel * dt; vel *= Math.pow(0.04, dt); } else if (!presa) vel = 0;
    const moto = presa || vel || P.figure.some(f => f.inGesto);
    if (moto) ultimoMoto = t;
    P.figure.forEach(f => f.aggiorna(dt));
    renderer.render(scena, camera);
    if (!ferma || t - ultimoMoto < 400) quadro = requestAnimationFrame(giro);   // un poco dopo il gesto, per la dissolvenza
  }
  P.sveglia = () => { if (vivo && !quadro) { ultimo = performance.now(); quadro = requestAnimationFrame(giro); } };

  tela.addEventListener('pointerdown', e => { presa = { x: e.clientX, id: e.pointerId, t: performance.now() }; vel = 0; tela.setPointerCapture(e.pointerId); tela.style.cursor = 'grabbing'; P.sveglia(); });
  tela.addEventListener('pointermove', e => {
    if (!presa || e.pointerId !== presa.id) return;
    const t = performance.now(), d = (e.clientX - presa.x) / Math.max(tela.clientWidth, 1) * Math.PI * 2;
    if (P.figure.length === 1) perno.rotation.y += d; else P.figure.forEach(f => { f.gruppo.rotation.y += d; });
    vel = P.figure.length === 1 ? d / Math.max((t - presa.t) / 1000, 0.016) : 0; presa.x = e.clientX; presa.t = t;
  });
  const lascia = e => { if (presa && e.pointerId === presa.id) { presa = null; tela.style.cursor = 'grab'; } };
  tela.addEventListener('pointerup', lascia); tela.addEventListener('pointercancel', lascia);

  function dimensiona() {
    const w = tela.parentElement ? tela.parentElement.clientWidth : 0, hh = tela.parentElement ? tela.parentElement.clientHeight : 0;
    if (!w || !hh) return;
    renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); P.inquadra(); P.sveglia();
  }
  P.attacca = nuovo => { if (nuovo && tela.parentElement !== nuovo) nuovo.appendChild(tela); dimensiona(); };
  window.addEventListener('resize', dimensiona);
  P.smonta = () => {
    vivo = false; if (quadro) cancelAnimationFrame(quadro); window.removeEventListener('resize', dimensiona);
    P.figure.forEach(f => f.mixer && f.mixer.stopAllAction()); renderer.dispose(); tela.remove();
  };
  P.attacca(el);
  return P;
}

// Un personaggio solo, che ruota tutto (profilo).
export async function monta(el, opz = {}) {
  await carica();
  const P = palco(el, opz);
  const f = new Figura(opz.colore, P.sveglia);
  P.figure.push(f); P.perno.add(f.gruppo);
  P.inquadra = () => { if (!f.h) return; P.camera.position.set(0, f.base + f.h * 0.72, f.h * 2.35); P.camera.lookAt(0, f.base + f.h * 0.43, 0); };
  await f.metti(opz.personaggio); P.inquadra();
  P.tela.setAttribute('aria-label', (opz.etichetta || 'Personaggio 3D') + ': ' + f.nome);
  P.sveglia();
  return {
    tela: P.tela, attacca: P.attacca, smonta: P.smonta,
    get personaggio() { return f.id; },
    cambia: id => f.metti(id).then(x => { P.inquadra(); return x; }),
    gesto: nome => f.gesto(nome),
  };
}

// Più personaggi in fila nella stessa tela: una sola scena, un solo contesto WebGL.
export async function scena(el, giocatori, opz = {}) {
  await carica();
  const P = palco(el, { fermaARiposo: true, ...opz });
  const figure = giocatori.map(g => new Figura(g.colore, P.sveglia));
  figure.forEach(f => { P.figure.push(f); P.perno.add(f.gruppo); });
  let acceso = -1;
  P.inquadra = () => {
    const h = Math.max(...figure.map(f => f.h || 0)); if (!h) return;
    const passo = h * 0.78, n = figure.length;
    figure.forEach((f, i) => { f.gruppo.position.x = (i - (n - 1) / 2) * passo; });
    const largo = passo * (n - 1) + h * 0.85, alto = h * 1.15, t = Math.tan(THREE.MathUtils.degToRad(P.camera.fov / 2));
    const d = Math.max(alto / (2 * t), largo / (2 * t * P.camera.aspect)) * 1.05;
    P.camera.position.set(0, h * 0.75, d); P.camera.lookAt(0, h * 0.45, 0);
  };
  await Promise.all(figure.map((f, i) => f.metti(giocatori[i].personaggio)));
  P.inquadra(); P.sveglia();
  return {
    tela: P.tela, attacca: P.attacca, smonta: P.smonta,
    get personaggi() { return figure.map(f => f.id); },
    gesto: (i, nome) => figure[i] ? figure[i].gesto(nome) : Promise.reject(new Error('figura inesistente: ' + i)),
    cambia: (i, id) => figure[i].metti(id).then(x => { P.inquadra(); return x; }),
    // Chi tira: il suo disco si accende, gli altri si smorzano.
    evidenzia(i) {
      acceso = i;
      figure.forEach((f, k) => { f.disco.material.opacity = i < 0 || k === i ? 0.9 : 0.3; });
      P.sveglia();
    },
  };
}

function ingombro(obj) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3(), v = new THREE.Vector3();
  obj.traverse(o => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (o.isSkinnedMesh) o.applyBoneTransform(i, v);
      b.expandByPoint(v.applyMatrix4(o.matrixWorld));
    }
  });
  return b;
}

function rilegaScheletri(copia) {
  const ossa = new Map(); copia.traverse(o => { if (o.isBone) ossa.set(o.name, o); });
  copia.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const s = o.skeleton;
    o.bind(new THREE.Skeleton(s.bones.map(b => ossa.get(b.name)), s.boneInverses), o.bindMatrix);
  });
}
