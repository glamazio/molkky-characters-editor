// Avatar 3D di Mölkky: il modulo che il laboratorio consegna all'app (contratto in pacchetto/CONTRATTO.md).
// L'app conosce solo queste funzioni: niente nomi di ossa, clip o pacchetti di modelli.
//   const elenco = await personaggi();                    // { predefinito, personaggi: [{ id, nome, gruppo }] }
//   const nomi = await gesti();                           // [{ id: 'bel_tiro', nome: 'Bel tiro' }, …]
//   const a = await monta(elemento, { colore: '#e63946', personaggio: 'Knight' });
//   a.gesto('bel_tiro');           // Promise che si risolve a fine gesto (poi riposo, fermo o una posa in ciclo)
//   a.cambia('Mage');              // Promise: cambia personaggio, stessa rotazione, torna a riposo
//   a.attacca(nuovoElemento);      // se la pagina ridisegna il DOM, la tela si sposta senza ricaricare
//   a.smonta();
// Trascinando in orizzontale sulla tela il personaggio ruota; in verticale la pagina scorre come sempre.
// Tutto quello che serve sta accanto a questo file: Three.js in three/, modelli in modelli/, nomi in manifesto.json.
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

export const versione = '0.3.0';
export const gesti = () => carica().then(m => Object.entries(m.gesti).map(([id, nome]) => ({ id, nome })));
export const personaggi = () => carica().then(m => ({ predefinito: m.predefinito, personaggi: m.personaggi.map(({ id, nome, gruppo }) => ({ id, nome, gruppo })) }));

export async function monta(el, opz = {}) {
  const m = await carica();
  const scena = new THREE.Scene();
  scena.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 2.2));
  const sole = new THREE.DirectionalLight(0xffffff, 1.6); sole.position.set(2, 4, 3); scena.add(sole);
  const perno = new THREE.Group(); scena.add(perno);   // la rotazione sta sul perno: resta uguale cambiando personaggio
  const disco = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: opz.colore || '#888888', transparent: true, opacity: 0.85 }));
  disco.rotation.x = -Math.PI / 2; scena.add(disco);   // disco del colore del giocatore (come il cerchio della caricatura)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // Personaggio corrente: figura, mixer, clip e gesti del suo scheletro, azione in corso, gesto in corso.
  let fig = null, mixer = null, clip = null, sk = null, attuale = null, finito = null, idAttuale = null;
  const azione = nome => mixer.clipAction(clip.get(nome));
  function passa(nuova, ciclo) {
    nuova.reset();
    nuova.setLoop(ciclo ? THREE.LoopRepeat : THREE.LoopOnce, ciclo ? Infinity : 1);
    nuova.clampWhenFinished = !ciclo;
    nuova.play();
    if (attuale && attuale !== nuova) attuale.crossFadeTo(nuova, 0.25, false);
    attuale = nuova;
  }
  async function metti(id) {
    const { p, gltf, clip: c, sk: s } = await modello(id);
    if (fig) { mixer.stopAllAction(); perno.remove(fig); }
    if (finito) { finito.risolvi(); finito = null; }
    clip = c; sk = s;
    fig = gltf.scene.clone(true);
    rilegaScheletri(fig);   // clone() non duplica gli scheletri
    perno.add(fig);
    mixer = new THREE.AnimationMixer(fig);
    // Fine di una clip del gesto: la prossima della sequenza, oppure il «poi» (riposo, fermo, o una clip in ciclo).
    mixer.addEventListener('finished', e => {
      if (e.action !== attuale || !finito) return;
      const g = finito;
      if (g.coda.length) return passa(azione(g.coda.shift()), false);
      finito = null;
      if (g.poi !== 'fermo') passa(azione(g.poi === 'riposo' ? sk.riposo : g.poi), true);
      g.risolvi();
    });
    attuale = null; passa(azione(sk.riposo), true);
    mixer.update(0);
    // Ingombro nella posa di riposo (con le ossa, non a braccia aperte): inquadratura e disco.
    const box = ingombro(fig), h = box.max.y - box.min.y;
    disco.scale.setScalar(h * 0.32); disco.position.y = box.min.y + 0.002;
    camera.position.set(0, box.min.y + h * 0.72, h * 2.35); camera.lookAt(0, box.min.y + h * 0.43, 0);
    idAttuale = p.id;
    tela.setAttribute('aria-label', (opz.etichetta || 'Personaggio 3D') + ': ' + p.nome);
    return p.id;
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const tela = renderer.domElement;
  tela.style.display = 'block'; tela.style.width = '100%'; tela.style.height = '100%';
  tela.style.touchAction = 'pan-y'; tela.style.cursor = 'grab';
  tela.setAttribute('role', 'img');
  await metti(opz.personaggio);

  // Rotazione col dito o col mouse; lasciando, continua un poco e rallenta.
  let presa = null, vel = 0;
  tela.addEventListener('pointerdown', e => { presa = { x: e.clientX, id: e.pointerId, t: performance.now() }; vel = 0; tela.setPointerCapture(e.pointerId); tela.style.cursor = 'grabbing'; });
  tela.addEventListener('pointermove', e => {
    if (!presa || e.pointerId !== presa.id) return;
    const dx = e.clientX - presa.x, t = performance.now(), d = dx / Math.max(tela.clientWidth, 1) * Math.PI * 2;
    perno.rotation.y += d; vel = d / Math.max((t - presa.t) / 1000, 0.016); presa.x = e.clientX; presa.t = t;
  });
  const lascia = e => { if (presa && e.pointerId === presa.id) { presa = null; tela.style.cursor = 'grab'; } };
  tela.addEventListener('pointerup', lascia); tela.addEventListener('pointercancel', lascia);

  let vivo = true, ultimo = performance.now(), quadro = 0;
  function dimensiona() {
    const w = tela.parentElement ? tela.parentElement.clientWidth : 0, hh = tela.parentElement ? tela.parentElement.clientHeight : 0;
    if (!w || !hh) return;
    renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix();
  }
  function giro() {
    if (!vivo) return;
    quadro = requestAnimationFrame(giro);
    // Orologio proprio e mai negativo: con un passo negativo Three.js chiude subito le clip «una volta sola».
    const t = performance.now(), dt = Math.max(0, Math.min((t - ultimo) / 1000, 0.1)); ultimo = t;
    if (!tela.isConnected) return;   // la pagina ha tolto la tela: si aspetta che torni, senza consumare batteria
    if (!presa && Math.abs(vel) > 0.01) { perno.rotation.y += vel * dt; vel *= Math.pow(0.04, dt); }
    mixer.update(dt);
    renderer.render(scena, camera);
  }
  const attacca = nuovo => { if (nuovo && tela.parentElement !== nuovo) nuovo.appendChild(tela); dimensiona(); };
  attacca(el);
  window.addEventListener('resize', dimensiona);
  quadro = requestAnimationFrame(giro);

  return {
    tela,
    attacca,
    get personaggio() { return idAttuale; },
    cambia: id => metti(id),
    gesto(nome) {
      const g = sk.gesti[nome];
      if (!g) return Promise.reject(new Error('gesto sconosciuto: ' + nome));
      if (finito) finito.risolvi();
      const [prima, ...coda] = g.clip;
      return new Promise(risolvi => { finito = { nome, coda, poi: g.poi || 'riposo', risolvi }; passa(azione(prima), false); });
    },
    smonta() {
      vivo = false; cancelAnimationFrame(quadro); window.removeEventListener('resize', dimensiona);
      mixer.stopAllAction(); renderer.dispose(); tela.remove();
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
