// Camerino Quaternius. I pezzi condividono il rig e la clip originale del pack.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { prepareGrip } from './presa-quaternius.js';
import { gripClosure, prepareFlight, prepareThrow, releaseTime, throwDuration } from './lancio-quaternius.js';
import { loadVerseAvatar, prepareVerseGrip, relaxVerseArms, verseCatalog, verseThrowSettings } from './rig-verse.js';
import { kaykitArm, kaykitCatalog, loadKaykit, prepareKaykitGrip } from './rig-kaykit.js';
import { donnaCatalog, loadDonna } from './rig-quaternius-donna.js';
import { loadPersonaggio, personaggiCatalog, profiliProva } from './rig-personaggi.js';

const view = document.querySelector('#view');
const status = document.querySelector('#status');
const form = document.querySelector('#closet');
const params = new URLSearchParams(location.search);
const mode = ['verse', 'kaykit', 'animati', 'rpg'].includes(params.get('base')) ? params.get('base') : 'quaternius';
const verseMode = mode === 'verse';
const kaykitMode = mode === 'kaykit';
// Animated e RPG: un personaggio Quaternius per file, caricato uno alla volta.
const singleMode = mode in personaggiCatalog;
const titles = { quaternius: 'Quaternius', verse: 'VerseEngine', kaykit: 'KayKit', animati: 'Quaternius Animated', rpg: 'Quaternius RPG' };
for (const node of document.querySelectorAll('[data-modes]')) node.hidden = !node.dataset.modes.split(' ').includes(mode);
for (const link of document.querySelectorAll('#bases [data-base]')) {
  if (link.dataset.base === mode) link.setAttribute('aria-current', 'page');
}
document.querySelector('#rig-label').textContent = 'Anteprima · ' + titles[mode];
if (verseMode) document.querySelector('#intro').textContent = 'Prova lo stesso bastone e i due lanci su diversi personaggi VRM.';
if (kaykitMode) document.querySelector('#intro').textContent = 'Combina i pezzi dei personaggi KayKit e prova il bastone con le loro clip.';
if (mode === 'animati') document.querySelector('#intro').textContent = 'Scegli un personaggio e vestilo con i colori di un socio.';
if (mode === 'rpg') document.querySelector('#intro').textContent = 'Le sei classi del pacchetto RPG con il bastone in mano.';

// Le scelte di VRM e KayKit nascono dai cataloghi degli adattatori.
function fillChoices(name, entries, checked) {
  const box = form.querySelector(`[data-choices="${name}"]`);
  for (const { id, label } of entries) {
    const option = document.createElement('label');
    option.className = 'option';
    const input = Object.assign(document.createElement('input'), { type: 'radio', name, value: id, checked: id === checked });
    const text = Object.assign(document.createElement('span'), { textContent: label });
    option.append(input, text);
    box.append(option);
  }
}
if (verseMode) fillChoices('vrm', verseCatalog, verseCatalog.some(entry => entry.id === params.get('vrm')) ? params.get('vrm') : 'demo');
if (mode === 'quaternius') {
  for (const name of ['whead', 'wbody', 'wlegs']) fillChoices(name, donnaCatalog, 'casual');
  for (const node of form.querySelectorAll('[data-figure]')) node.hidden = node.dataset.figure !== 'uomo';
}
if (singleMode) {
  const { entries, initial } = personaggiCatalog[mode];
  fillChoices('pg', entries, entries.some(entry => entry.id === params.get('pg')) ? params.get('pg') : initial);
  if (mode === 'animati') fillChoices('colori', [{ id: 'originali', label: 'Originali' }, ...Object.keys(profiliProva).map(nik => ({ id: nik, label: nik }))], 'originali');
}
if (kaykitMode) {
  fillChoices('khead', kaykitCatalog, 'knight');
  const whole = kaykitCatalog.filter(entry => entry.parts.includes('body'));
  fillChoices('kbody', whole, 'rogue');
  fillChoices('klegs', whole, 'rogue');
}
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
view.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#243c3d');
scene.add(new THREE.HemisphereLight(0xffffff, 0x799684, verseMode ? 0.9 : kaykitMode ? 1.3 : 1.7));
const key = new THREE.DirectionalLight(0xffe9c8, verseMode ? 0.95 : kaykitMode ? 1.6 : 2.1);
key.position.set(3, 5, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = key.shadow.camera.bottom = -2;
key.shadow.camera.right = key.shadow.camera.top = 2;
key.shadow.camera.far = 12;
key.shadow.normalBias = 0.025;
scene.add(key);
const rim = new THREE.DirectionalLight(0xacddd0, verseMode ? 0.5 : 1.15);
rim.position.set(-3, 3, -3);
scene.add(rim);
const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(1.23, 1.27, 0.10, 64),
  new THREE.MeshStandardMaterial({ color: '#536e61', roughness: 0.94 })
);
platform.position.y = -0.054;
platform.receiveShadow = true;
scene.add(platform);
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(3.7, 64),
  new THREE.MeshStandardMaterial({ color: '#354d48', roughness: 1 })
);
ground.position.set(0, -0.009, 0.7);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 30);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minDistance = 2.15;
controls.maxDistance = 7;
controls.maxPolarAngle = Math.PI * 0.51;
function orient(back = false) {
  camera.position.set(back ? -0.7 : 0.6, 1.36, back ? -3.95 : 3.95);
  controls.target.set(0, 0.99, 0);
  controls.update();
}
function orientThrow() {
  camera.position.set(-4.6, 2.25, 3.05);
  controls.target.set(0, 0.92, 0.82);
  controls.update();
}
orient();
document.querySelector('#front').onclick = () => orient();
document.querySelector('#back').onclick = () => orient(true);
new ResizeObserver(() => {
  renderer.setSize(view.clientWidth, view.clientHeight);
  camera.aspect = view.clientWidth / view.clientHeight;
  camera.updateProjectionMatrix();
}).observe(view);

const catalog = {
  adventurer: { head: 'q-head', body: 'q-body', legs: 'q-legs', feet: 'q-feet' },
  hoodie: { head: 'q-alt', body: 'q-hoodie-body', legs: 'q-hoodie-legs', feet: 'q-hoodie-feet' },
  farmer: { head: 'q-farmer-head', body: 'q-farmer-body', legs: 'q-farmer-legs', feet: 'q-farmer-feet' }
};
const groups = ['head', 'body', 'legs', 'feet'];
const fbx = new FBXLoader();
const gltf = new GLTFLoader();
const root = new THREE.Group();
const assembled = new THREE.Group();
root.add(assembled);
scene.add(root);
const variants = {};
const surfaces = [];
const clock = new THREE.Clock();
let mixer, idle, accessories;
let moving = false;
let activeGrip;
let throwing;
let verseRig;
let kaykit;
let single;
let loops = {};
// Quaternius: due figure con scheletri diversi. Ognuna ha la sua inquadratura, il suo mixer e i suoi innesti.
let women;
let womenLoading;
const figures = {};
if (params.has('debug')) window.camerino = { THREE, scene, root, camera, controls, get verseRig() { return verseRig; }, get kaykit() { return kaykit; }, get single() { return single; } };

// Unisce solo le normali dei vertici coincidenti su facce vicine per inclinazione.
// Posizioni, UV, materiali e pesi del rig restano nei buffer originali.
function smoothNormals(geometry) {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const buckets = new Map();
  const keyOf = index => [position.getX(index), position.getY(index), position.getZ(index)]
    .map(value => Math.round(value * 10000)).join(',');
  for (let index = 0; index < position.count; index++) {
    const key = keyOf(index);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(index);
  }
  const base = new THREE.Vector3();
  const candidate = new THREE.Vector3();
  const sum = new THREE.Vector3();
  const smooth = normal.clone();
  const limit = Math.cos(THREE.MathUtils.degToRad(60));
  for (const group of buckets.values()) {
    for (const index of group) {
      base.fromBufferAttribute(normal, index);
      sum.set(0, 0, 0);
      for (const other of group) {
        candidate.fromBufferAttribute(normal, other);
        if (base.dot(candidate) >= limit) sum.add(candidate);
      }
      sum.normalize();
      smooth.setXYZ(index, sum.x, sum.y, sum.z);
    }
  }
  return smooth;
}

function prepare(part) {
  part.traverse(mesh => {
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    const original = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const materials = original.map(source => new THREE.MeshStandardMaterial({
      color: source.color,
      map: source.map,
      vertexColors: source.vertexColors,
      side: source.side,
      roughness: 0.82
    }));
    mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    const normals = mesh.geometry.getAttribute('normal');
    if (normals) surfaces.push({ mesh, materials, normals, smooth: smoothNormals(mesh.geometry) });
  });
}

function createAttachment(body, { socket: name, grip }) {
  if (grip) return prepareGrip(body, name, grip);
  const chest = body.getObjectByName('Chest');
  if (name !== 'back.center' || !chest) throw new Error('Attacco del rig non trovato: ' + name);
  const socket = new THREE.Group();
  socket.name = name;
  chest.getWorldPosition(socket.position);
  socket.position.y += 0.035;
  socket.position.z -= 0.16;
  chest.attach(socket);
  return { socket };
}

function update() {
  if (!mixer && !verseRig) return;
  const options = new FormData(form);
  const donna = mode === 'quaternius' && options.get('figure') === 'donna' && Boolean(women);
  for (const [id, variant] of Object.entries(variants)) {
    for (const slot of groups) {
      variant[slot].visible = !donna && options.get(slot === 'feet' ? 'legs' : slot) === id;
    }
  }
  women?.apply(options, donna);
  kaykit?.apply(options);
  activeGrip?.restore();
  activeGrip = undefined;
  if (mode === 'quaternius') useFigure(donna ? 'donna' : 'uomo');
  if (single && mode === 'animati') {
    const tinted = single.recolor(profiliProva[options.get('colori')]);
    colorNote.textContent = options.get('colori') === 'originali'
      ? 'Carnagione, capelli e maglia dei soci disegnati nella tela, presi dalla caricatura 2D.'
      : 'Materiali ricolorati: ' + (tinted.length ? tinted.join(', ') : 'nessuno') + '.';
  }
  const attachments = verseRig?.attachments ?? kaykit?.attachments(options) ?? single?.attachments
    ?? (donna ? women.outfits[options.get('wbody')].attachments : variants[options.get('body')].attachments);
  for (const { control, grip, model, scale } of accessories) {
    if (!options.has(control)) {
      model.removeFromParent();
      continue;
    }
    const attachment = attachments[control];
    if (!attachment) {
      model.removeFromParent();
      continue;
    }
    model.position.set(0, 0, 0);
    model.quaternion.identity();
    model.scale.setScalar(attachment.scale ?? scale ?? 1);
    attachment.socket.add(model);
    if (grip) activeGrip = attachment;
  }
  activeGrip?.apply();
  const flat = options.get('shade') === 'flat';
  for (const { mesh, materials, normals, smooth } of surfaces) {
    mesh.geometry.setAttribute('normal', flat ? normals : smooth);
    for (const material of materials) {
      if (material.flatShading === flat) continue;
      material.flatShading = flat;
      material.needsUpdate = true;
    }
  }
  // KayKit ha più clip in ciclo: la scelta del movimento cambia l'azione attiva.
  if (kaykit && options.get('motion') === 'clip') {
    const chosen = kaykit.allClips.find(item => item.name === options.get('kclip'));
    if (chosen) loops.clip = mixer.clipAction(chosen);
  }
  const loop = loops[options.get('motion')];
  if (loop && loop !== idle && !throwing) {
    idle?.stop();
    idle = loop;
  }
  moving = Boolean(idle && options.get('motion') !== 'static');
  if (idle) {
    if (moving && !idle.isRunning()) idle.play();
    idle.paused = !moving;
  }
}
form.addEventListener('change', event => {
  if (event.target.name === 'vrm') swapVerse(event.target.value);
  else if (event.target.name === 'pg') swapPersonaggio(event.target.value);
  else if (event.target.name === 'figure') chooseFigure(event.target.value);
  else if (event.target.name === 'kclip') {
    form.elements.motion.value = 'clip';
    update();
  }
  else update();
});

// Mostra i pezzi della figura scelta; la figura femminile si scarica solo la prima volta che serve.
async function chooseFigure(value) {
  for (const node of form.querySelectorAll('[data-figure]')) node.hidden = node.dataset.figure !== value;
  if (value === 'donna' && !women) {
    throwButtons.disabled = true;
    status.textContent = 'Caricamento della figura femminile…';
    try {
      womenLoading ??= loadWomen();
      await womenLoading;
      status.textContent = 'Trascina per ruotare · scorri o usa due dita per lo zoom';
    } catch (error) {
      womenLoading = undefined;
      status.textContent = 'Caricamento della figura femminile fallito. Riprova o ricarica la pagina.';
      console.error(error);
    }
    throwButtons.disabled = false;
  }
  update();
}

// Passa inquadratura e animazione alla figura indicata, mantenendo la scelta del movimento.
function useFigure(name) {
  const figure = figures[name];
  if (!figure) return;
  root.scale.setScalar(figure.scale);
  root.position.copy(figure.position);
  root.updateMatrixWorld(true);
  if (mixer === figure.mixer) return;
  idle?.stop();
  mixer = figure.mixer;
  idle = figure.idle;
  idle.play();
  mixer.update(0);
}

function saveFigure(name, figureMixer, figureIdle) {
  figures[name] = { scale: root.scale.x, position: root.position.clone(), mixer: figureMixer, idle: figureIdle };
}
form.addEventListener('submit', event => event.preventDefault());
if (matchMedia('(prefers-reduced-motion: reduce)').matches) form.elements.motion.value = 'static';

const throwButtons = document.querySelector('#throws');
const fieldsets = [...form.querySelectorAll('fieldset')];
for (const button of throwButtons.querySelectorAll('[data-throw]')) {
  button.addEventListener('click', () => startThrow(button.dataset.throw));
}

function startThrow(style) {
  if ((!mixer && !verseRig) || throwing) return;
  form.elements.stick.checked = true;
  update();
  activeGrip.restore();
  // Tutti i lanci partono dalla stessa posa verificabile, anche se il riposo è in movimento.
  if (idle) {
    idle.time = 0;
    idle.paused = true;
    mixer.update(0);
  }
  activeGrip.apply();
  const options = new FormData(form);
  const donna = options.get('figure') === 'donna' && women;
  const arm = verseRig?.arm ?? single?.arm ?? (kaykit ? kaykitArm(kaykit.bodyScene(options))
    : armOf(donna ? women.outfits[options.get('wbody')].scene : variants[options.get('body')].body));
  const { model } = accessories.find(entry => entry.control === 'stick');
  const motion = style === 'pack' ? packMotion() : prepareThrow(arm, activeGrip, style, verseMode ? verseThrowSettings : undefined);
  throwing = {
    time: 0, grip: activeGrip, model, motion,
    release: motion.release ?? releaseTime, duration: motion.duration ?? throwDuration
  };
  for (const fieldset of fieldsets) fieldset.disabled = true;
  orientThrow();
  status.textContent = { baguette: 'Preparazione · a baguette', horizontal: 'Preparazione · orizzontale', pack: 'Preparazione · clip del pacchetto' }[style];
}

// La clip «Throw» di KayKit al posto del gesto calcolato: il bastone si stacca nel punto più avanzato del braccio.
const packRelease = 0.56;
function packMotion() {
  const throwClip = kaykit.clips.throw;
  const action = mixer.clipAction(throwClip);
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  idle.stop();
  action.reset().play();
  const duration = throwClip.duration;
  return {
    release: duration * packRelease,
    duration: duration + 0.6,
    pose(time) {
      action.time = Math.min(time, duration);
      mixer.update(0);
    },
    restore() {
      action.stop();
      idle.play();
      idle.time = 0;
      mixer.update(0);
    }
  };
}

function stepThrow(elapsed) {
  const shot = throwing;
  const releaseTime = shot.release;
  const throwDuration = shot.duration;
  shot.time = Math.min(throwDuration, shot.time + elapsed);
  if (!shot.fly && shot.time >= releaseTime) {
    shot.motion.pose(releaseTime);
    scene.attach(shot.model);
    shot.fly = prepareFlight(shot.model);
    form.elements.stick.checked = false;
    activeGrip = undefined;
    status.textContent = 'Rilascio · il bastone è in volo';
  }
  shot.motion.pose(shot.time);
  if (shot.fly) {
    const flightTime = shot.time - releaseTime;
    shot.grip.restore();
    const closure = gripClosure(flightTime);
    if (closure > 0) shot.grip.apply(closure);
    if (shot.fly(flightTime) && !shot.landed) {
      shot.landed = true;
      status.textContent = 'Atterraggio · il braccio torna a riposo';
    }
  }
  if (shot.time === throwDuration) {
    shot.motion.restore();
    shot.grip.restore();
    throwing = undefined;
    if (idle) idle.paused = !moving;
    for (const fieldset of fieldsets) fieldset.disabled = false;
    status.textContent = 'Lancio concluso · puoi ripeterlo';
  }
}

function armOf(body) {
  return { upper: body.getObjectByName('UpperArmR'), elbow: body.getObjectByName('LowerArmR') };
}

// Misura solo le mesh visibili, partendo da scala 1: si può richiamare a ogni cambio di personaggio.
// Con «posed» misura i vertici dopo le ossa (posa animata): più lento, serve dove la posa del file è diversa.
function fitAvatar(posed = false) {
  root.scale.setScalar(1);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  assembled.traverseVisible(node => { if (node.isMesh) bounds.expandByObject(node, posed); });
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 1.92 / (bounds.max.y - bounds.min.y);
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  root.updateMatrixWorld(true);
}

async function loadAccessories() {
  const response = await fetch('modelli/accessori-camerino.json');
  if (!response.ok) throw new Error('Catalogo degli accessori non trovato');
  const entries = await response.json();
  const selected = mode === 'quaternius' ? entries : entries.filter(entry => entry.control === 'stick');
  return Promise.all(selected.map(async entry => {
    const { scene: model } = await gltf.loadAsync('modelli/' + entry.asset);
    model.scale.setScalar(entry.scale ?? 1);
    model.traverse(node => { if (node.isMesh) node.castShadow = true; });
    return { ...entry, model };
  }));
}

async function mountVerse(id) {
  const entry = verseCatalog.find(item => item.id === id);
  const { avatar, bone } = await loadVerseAvatar(renderer, entry.file);
  assembled.add(avatar.object3D);
  fitAvatar();
  const grip = prepareVerseGrip(bone, accessories[0].grip);
  relaxVerseArms(bone);
  verseRig = {
    avatar,
    arm: { upper: bone('rightUpperArm'), elbow: bone('rightLowerArm') },
    attachments: { stick: grip }
  };
  document.querySelector('#vrm-license').textContent = entry.license;
}

async function loadVerse() {
  accessories = await loadAccessories();
  await mountVerse(form.elements.vrm.value);
}

// Cambio di personaggio: il bastone esce dalla mano prima che il vecchio modello venga smontato.
const vrmChoice = document.querySelector('#vrm-choice');
async function swapVerse(id) {
  if (!verseRig) return;
  vrmChoice.disabled = throwButtons.disabled = true;
  status.textContent = 'Caricamento del personaggio…';
  activeGrip?.restore();
  activeGrip = undefined;
  for (const { model } of accessories) model.removeFromParent();
  const previous = verseRig.avatar;
  verseRig = undefined;
  assembled.remove(previous.object3D);
  previous.dispose();
  try {
    await mountVerse(id);
    history.replaceState(null, '', '?base=verse&vrm=' + encodeURIComponent(id));
    update();
    status.textContent = 'Trascina per ruotare · scorri o usa due dita per lo zoom';
  } catch (error) {
    status.textContent = 'Caricamento del personaggio fallito. Scegline un altro o ricarica la pagina.';
    console.error(error);
  }
  vrmChoice.disabled = throwButtons.disabled = false;
}

const colorNote = document.querySelector('#colori-note');

// Animated e RPG: monta un personaggio, con inquadratura, innesto del bastone e clip del suo file.
async function mountPersonaggio(id) {
  const loaded = await loadPersonaggio(gltf, mode, id);
  assembled.add(loaded.scene);
  mixer = new THREE.AnimationMixer(loaded.scene);
  loops = { idle: mixer.clipAction(loaded.clips.idle) };
  if (loaded.clips.cheer) loops.cheer = mixer.clipAction(loaded.clips.cheer);
  // L'inquadratura si misura nella posa di riposo: quella del file è più raccolta e taglierebbe la testa.
  loops.idle.play();
  mixer.update(0);
  fitAvatar(true);
  loops.idle.stop();
  idle = loops[form.elements.motion.value] ?? loops.idle;
  idle.play();
  mixer.update(0);
  const stick = accessories.find(entry => entry.control === 'stick');
  loaded.grip.scale = stickScale(loaded.grip.socket, stick, 0.3);
  single = { ...loaded, attachments: { stick: loaded.grip } };
}

async function loadSingleBase() {
  accessories = await loadAccessories();
  await mountPersonaggio(form.elements.pg.value);
}

const pgChoice = document.querySelector('#pg-choice');
async function swapPersonaggio(id) {
  if (!single) return;
  pgChoice.disabled = throwButtons.disabled = true;
  status.textContent = 'Caricamento del personaggio…';
  activeGrip = undefined;
  for (const { model } of accessories) model.removeFromParent();
  const previous = single;
  single = undefined;
  idle?.stop();
  mixer = idle = undefined;
  assembled.remove(previous.scene);
  previous.dispose();
  try {
    await mountPersonaggio(id);
    history.replaceState(null, '', `?base=${mode}&pg=${encodeURIComponent(id)}`);
    update();
    status.textContent = 'Trascina per ruotare · scorri o usa due dita per lo zoom';
  } catch (error) {
    status.textContent = 'Caricamento del personaggio fallito. Scegline un altro o ricarica la pagina.';
    console.error(error);
  }
  pgChoice.disabled = throwButtons.disabled = false;
}

async function loadKaykitBase() {
  const [rig, loadedAccessories] = await Promise.all([loadKaykit(gltf), loadAccessories()]);
  accessories = loadedAccessories;
  assembled.add(...rig.scenes);
  rig.apply(new FormData(form));
  fitAvatar();
  // Ogni personaggio ha il suo innesto: il bastone segue il busto scelto.
  const grips = Object.fromEntries(rig.characters.map(character => [character.id, prepareKaykitGrip(character.scene)]));
  const stick = accessories.find(entry => entry.control === 'stick');
  // Il bastone tiene la stessa lunghezza a schermo delle altre basi, qualunque sia la scala dello scheletro.
  for (const grip of Object.values(grips)) grip.scale = stickScale(grip.socket, stick, 0.42);
  kaykit = { ...rig, attachments: options => ({ stick: grips[options.get('kbody')] }) };
  const select = document.querySelector('#kclip');
  select.append(...rig.allClips.map(item => new Option(`${item.name} · ${item.duration.toFixed(1)} s`, item.name)));
  select.value = 'Idle';
  document.querySelector('#kclip-note').textContent = `${rig.allClips.length} clip. Le clip partono a ciclo continuo; il bastone resta in mano.`;
  mixer = new THREE.AnimationMixer(new THREE.AnimationObjectGroup(...rig.scenes));
  loops = { idle: mixer.clipAction(rig.clips.idle), cheer: mixer.clipAction(rig.clips.cheer) };
  idle = loops[form.elements.motion.value] ?? loops.idle;
  idle.play();
  mixer.update(0);
}

// Lunghezza del bastone in unità di scena (figura alta 1,92). Quaternius e VerseEngine stanno a 0,26;
// con mani più grandi, come KayKit (0,42) e i personaggi a pugno (0,30), il bastone cresce con loro.
function stickScale(socket, stick, stickWorldLength) {
  const probe = stick.model.clone();
  probe.scale.setScalar(1);
  probe.position.set(0, 0, 0);
  probe.quaternion.identity();
  probe.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(probe).getSize(new THREE.Vector3());
  const socketScale = socket.getWorldScale(new THREE.Vector3()).x;
  return stickWorldLength / (Math.max(size.x, size.y, size.z) * socketScale);
}

async function load() {
  const loadVariant = async ([id, files]) => {
    const parts = await Promise.all(groups.map(slot => fbx.loadAsync('modelli/' + files[slot] + '.fbx')));
    variants[id] = Object.fromEntries(groups.map((slot, index) => [slot, parts[index]]));
    for (const part of parts) prepare(part);
  };
  const [, clipData, loadedAccessories] = await Promise.all([
    Promise.all(Object.entries(catalog).map(loadVariant)),
    fetch('modelli/q-idle.json').then(response => response.json()),
    loadAccessories()
  ]);
  accessories = loadedAccessories;
  assembled.add(...groups.map(slot => variants.hoodie[slot]));
  fitAvatar();
  const allParts = Object.values(variants).flatMap(variant => groups.map(slot => variant[slot]));
  assembled.add(...allParts);
  root.updateMatrixWorld(true);
  for (const variant of Object.values(variants)) {
    variant.attachments = Object.fromEntries(accessories.map(entry => [
      entry.control, createAttachment(variant.body, entry)
    ]));
  }
  mixer = new THREE.AnimationMixer(new THREE.AnimationObjectGroup(...allParts));
  idle = mixer.clipAction(THREE.AnimationClip.parse(clipData));
  idle.play();
  mixer.update(0);
  saveFigure('uomo', mixer, idle);
  // Grandezza a schermo di bastone e mantello sulla figura maschile: la figura femminile la copia.
  for (const entry of accessories) {
    entry.worldScale = variants.hoodie.attachments[entry.control].socket.getWorldScale(new THREE.Vector3()).x * (entry.scale ?? 1);
  }
}

// I GLB femminili usano un'unità diversa dagli FBX maschili: inquadratura e scala degli accessori si ricalcolano.
async function loadWomen() {
  const loaded = await loadDonna(gltf);
  const options = new FormData(form);
  for (const [id, variant] of Object.entries(variants)) for (const slot of groups) variant[slot].visible = false;
  assembled.add(...loaded.scenes);
  for (const scene of loaded.scenes) prepare(scene);
  loaded.apply(options, true);
  fitAvatar();
  for (const outfit of Object.values(loaded.outfits)) {
    outfit.attachments = Object.fromEntries(accessories.map(entry => {
      const attachment = createAttachment(outfit.scene, entry);
      attachment.scale = entry.worldScale / attachment.socket.getWorldScale(new THREE.Vector3()).x;
      return [entry.control, attachment];
    }));
  }
  const womenMixer = new THREE.AnimationMixer(new THREE.AnimationObjectGroup(...loaded.scenes));
  saveFigure('donna', womenMixer, womenMixer.clipAction(loaded.idle));
  women = loaded;
}

renderer.setAnimationLoop(() => {
  const elapsed = Math.min(clock.getDelta(), 0.05);
  if (throwing) stepThrow(elapsed);
  // Durante il cambio di personaggio il mixer non c'è: un errore qui fermerebbe il disegno per sempre.
  else if (moving && mixer) {
    // La clip muove il polso. La presa sovrascrive solo la posa delle dita.
    activeGrip?.restore();
    mixer.update(elapsed);
    activeGrip?.apply();
  }
  verseRig?.avatar.tick(elapsed);
  renderer.render(scene, camera);
});
({ verse: loadVerse, kaykit: loadKaykitBase, quaternius: load, animati: loadSingleBase, rpg: loadSingleBase }[mode]()).then(() => {
  update();
  throwButtons.disabled = false;
  status.textContent = 'Trascina per ruotare · scorri o usa due dita per lo zoom';
  // Il browser può ripristinare «Donna» dopo un ricaricamento della pagina.
  if (mode === 'quaternius' && form.elements.figure.value === 'donna') chooseFigure('donna');
}).catch(error => {
  status.textContent = 'Caricamento del camerino fallito. Ricarica la pagina per riprovare.';
  console.error(error);
});
