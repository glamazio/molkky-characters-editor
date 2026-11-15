// Avatar 3D di Mölkky: il modulo che il laboratorio consegna all'app (contratto in pacchetto/CONTRATTO.md).
// L'app conosce solo queste funzioni: niente nomi di ossa, clip o pacchetti di modelli.
//   const a = await monta(elemento, { colore: '#e63946' });
//   a.gesto('esulta' | 'morte');   // Promise che si risolve a fine gesto
//   a.attacca(nuovoElemento);      // se la pagina ridisegna il DOM, la tela si sposta senza ricaricare
//   a.smonta();
// Tutto quello che serve sta accanto a questo file: Three.js in three/, modelli in modelli/, nomi in manifesto.json.
import * as THREE from './three/three.module.min.js';
import { GLTFLoader } from './three/GLTFLoader.js';

const base = new URL('.', import.meta.url);
let caricati = null;   // manifesto, personaggio e clip si scaricano una volta sola per pagina

function carica() {
  if (!caricati) caricati = (async () => {
    const m = await (await fetch(new URL('manifesto.json', base))).json();
    const loader = new GLTFLoader();
    const [pers, clip] = await Promise.all([
      loader.loadAsync(new URL(m.modelli.personaggio, base).href),
      loader.loadAsync(new URL(m.modelli.clip, base).href),
    ]);
    return { m, pers, clip: new Map(clip.animations.map(c => [c.name, c])) };
  })().catch(e => { caricati = null; throw e; });
  return caricati;
}

export const versione = '0.1.0';
export const gesti = () => carica().then(({ m }) => Object.keys(m.gesti));

export async function monta(el, opz = {}) {
  const { m, pers, clip } = await carica();
  const scena = new THREE.Scene();
  const figura = pers.scene.clone(true);
  // clone() non duplica gli scheletri: si rifanno i legami delle mesh con le ossa della copia.
  rilegaScheletri(pers.scene, figura);
  scena.add(figura);
  scena.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 2.2));
  const sole = new THREE.DirectionalLight(0xffffff, 1.6); sole.position.set(2, 4, 3); scena.add(sole);

  const mixer = new THREE.AnimationMixer(figura);
  const azione = nome => mixer.clipAction(clip.get(nome));
  let attuale = azione(m.riposo); attuale.play();
  mixer.update(0);
  // Ingombro nella posa di riposo: le mesh con scheletro vanno misurate con le ossa, non a braccia aperte.
  const box = ingombro(figura), h = box.max.y - box.min.y;
  // Disco del colore del giocatore sotto i piedi (lo stesso del cerchio della caricatura).
  const disco = new THREE.Mesh(new THREE.CircleGeometry(h * 0.32, 48), new THREE.MeshBasicMaterial({ color: opz.colore || '#888888', transparent: true, opacity: 0.85 }));
  disco.rotation.x = -Math.PI / 2; disco.position.y = box.min.y + 0.002; scena.add(disco);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, box.min.y + h * 0.72, h * 2.35); camera.lookAt(0, box.min.y + h * 0.43, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const tela = renderer.domElement;
  tela.style.display = 'block'; tela.style.width = '100%'; tela.style.height = '100%';
  tela.setAttribute('role', 'img'); tela.setAttribute('aria-label', opz.etichetta || 'Personaggio 3D');

  let finito = null;
  mixer.addEventListener('finished', e => {
    if (e.action !== attuale) return;
    const g = finito; finito = null;
    if (g && !m.resta_a_terra.includes(g.nome)) passa(azione(m.riposo), true);
    g && g.risolvi();
  });
  function passa(nuova, ciclo) {
    nuova.reset();
    nuova.setLoop(ciclo ? THREE.LoopRepeat : THREE.LoopOnce, ciclo ? Infinity : 1);
    nuova.clampWhenFinished = !ciclo;
    nuova.play();
    if (attuale !== nuova) attuale.crossFadeTo(nuova, 0.25, false);
    attuale = nuova;
  }

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
    gesto(nome) {
      const c = m.gesti[nome];
      if (!c || !clip.has(c)) return Promise.reject(new Error('gesto sconosciuto: ' + nome));
      if (finito) finito.risolvi();
      return new Promise(risolvi => { finito = { nome, risolvi }; passa(azione(c), false); });
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

function rilegaScheletri(orig, copia) {
  const ossa = new Map(); copia.traverse(o => { if (o.isBone) ossa.set(o.name, o); });
  copia.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const s = o.skeleton;
    o.bind(new THREE.Skeleton(s.bones.map(b => ossa.get(b.name)), s.boneInverses), o.bindMatrix);
  });
}
