// Studio KayKit: personaggi KayKit 2.0, accessori, clip delle librerie e bastone, in una pagina dedicata.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { measureStick, prepareFlight, prepareKaykitThrow, stances } from './lancio-kaykit.js';
import * as kaykit from './rig-kaykit2.js';

const view = document.querySelector('#view');
const status = document.querySelector('#status');
const form = document.querySelector('#closet');
const params = new URLSearchParams(location.search);
const ready = 'Trascina per ruotare · scorri o usa due dita per lo zoom';

// Colori fissi dei soci della tela (Mollky/backend/public/gioca/giocatori.js).
const ringColors = {
  Moz: '#F2705A', Mos: '#4DA9F0', Dile: '#F6C23B', Sangio: '#5CC46A', Umbi: '#A98BEF', Giachi: '#F27DB5',
  Johnny: '#34C2B0', Katia: '#F7943D', Ceci: '#B9DB45', Eleonora: '#7C93F4', Cami: '#C9AB8E'
};
// Gesti utili all'app, in italiano; compaiono solo se lo scheletro ha la clip.
const quickClips = [
  ['Idle_A', 'Riposo'], ['Idle_B', 'Riposo 2'], ['Cheering', 'Esulta'], ['Waving', 'Saluta'], ['Flexing', 'Muscoli'],
  ['Hit_B', 'Colpito'], ['Sit_Floor_Down', 'Si siede'], ['Death_A', 'Cade'], ['Interact', 'Interagisce'], ['PickUp', 'Raccoglie']
];

// Scena.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
view.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#243c3d');
scene.add(new THREE.HemisphereLight(0xffffff, 0x799684, 1.3));
const key = new THREE.DirectionalLight(0xffe9c8, 1.6);
key.position.set(3, 5, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = key.shadow.camera.bottom = -2;
key.shadow.camera.right = key.shadow.camera.top = 2;
key.shadow.camera.far = 12;
key.shadow.normalBias = 0.025;
scene.add(key);
const rim = new THREE.DirectionalLight(0xacddd0, 0.9);
rim.position.set(-3, 3, -3);
scene.add(rim);
const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.23, 1.27, 0.1, 64), new THREE.MeshStandardMaterial({ color: '#536e61', roughness: 0.94 }));
platform.position.y = -0.054;
platform.receiveShadow = true;
scene.add(platform);
const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: '#354d48', roughness: 1 }));
ground.position.set(0, -0.11, 0.7);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.16, 64), new THREE.MeshBasicMaterial({ color: ringColors.Moz }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.002;
scene.add(ring);

const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 30);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minDistance = 1.6;
controls.maxDistance = 8;
controls.maxPolarAngle = Math.PI * 0.51;
const views = {
  front: [[0.6, 1.36, 3.95], [0, 0.99, 0]],
  side: [[3.95, 1.3, 0.5], [0, 0.99, 0]],
  back: [[-0.7, 1.36, -3.95], [0, 0.99, 0]],
  throw: [[-8.2, 2.5, 2.6], [0, 0.75, 1.6]]
};
function orient(name) {
  const [position, target] = views[name];
  camera.position.set(...position);
  controls.target.set(...target);
  controls.update();
}
orient('front');
for (const button of document.querySelectorAll('[data-view]')) button.onclick = () => orient(button.dataset.view);
new ResizeObserver(() => {
  renderer.setSize(view.clientWidth, view.clientHeight);
  camera.aspect = view.clientWidth / view.clientHeight;
  camera.updateProjectionMatrix();
}).observe(view);

const gltf = new GLTFLoader();
const root = new THREE.Group();
const assembled = new THREE.Group();
root.add(assembled);
scene.add(root);
const clock = new THREE.Clock();

let catalog, stick, current;
let raincoats;
let mixer, action, throwing;
let composing = Promise.resolve();
const selects = ['kall', 'khead', 'kbody', 'klegs'].map(name => form.elements[name]);
const clipSelect = form.elements.clip;
const byId = id => catalog.find(entry => entry.id === id);
let hold = false;
// Con ?debug: window.studio.scrub('baguette', 1.2) ferma il lancio a quell'istante, per le prove fotogramma per fotogramma.
if (params.has('debug')) window.studio = {
  THREE, scene, root, camera, controls, orient,
  get current() { return current; }, get mixer() { return mixer; },
  scrub(style, time, stance) {
    hold = true;
    if (stance) form.elements.stance.value = stance;
    if (!throwing) startThrow(style);
    while (throwing && throwing.time < time - 1e-6) stepThrow(Math.min(1 / 60, time - throwing.time));
  }
};

// Inquadratura misurata nella posa animata, con le ossa applicate ai vertici.
function fit() {
  root.scale.setScalar(1);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  assembled.traverseVisible(node => { if (node.isMesh) bounds.expandByObject(node, true); });
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 1.92 / (bounds.max.y - bounds.min.y);
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  root.updateMatrixWorld(true);
}

// Il bastone ha la stessa lunghezza a schermo qualunque sia la scala dello scheletro.
function stickScale(socket, length) {
  const probe = stick.clone();
  probe.scale.setScalar(1);
  probe.position.set(0, 0, 0);
  probe.quaternion.identity();
  probe.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(probe).getSize(new THREE.Vector3());
  return length / (Math.max(size.x, size.y, size.z) * socket.getWorldScale(new THREE.Vector3()).x);
}

function placeStick() {
  if (!current || throwing) return;
  stick.removeFromParent();
  if (!form.elements.stick.checked) return;
  stick.position.set(0, 0, 0);
  stick.quaternion.identity();
  stick.scale.setScalar(current.grip.scale);
  current.grip.socket.add(stick);
}

function applyVisibility() {
  if (!current) return;
  const options = new FormData(form);
  const { ids, chars } = current;
  for (const char of chars) {
    const id = char.entry.id;
    for (const slot of ['head', 'body', 'legs']) for (const mesh of char.parts[slot]) mesh.visible = ids[slot] === id;
    for (const acc of char.parts.acc) {
      const shown = ids[acc.anchor] === id && options.has('acc:' + acc.key);
      for (const mesh of acc.meshes) mesh.visible = shown;
    }
  }
  for (const piece of current.raincoatPieces ?? []) piece.visible = form.elements.raincoat.checked;
}

// L'impermeabile Ã¨ diviso in pezzi low-poly: ogni pezzo viene agganciato alla sua osso
// nel pose di riposo. CosÃ¬ uno stesso accessorio segue tutte le clip e tutti i personaggi
// che condividono il rispettivo rig, senza riscrivere i GLB KayKit originali.
function mountRaincoat() {
  current.raincoatPieces = mountBoneAccessory(raincoats[current.rig].scene, 'Raincoat');
}

function mountBoneAccessory(source, prefix) {
  const coat = source.clone(true);
  const pieces = [];
  assembled.add(coat);
  assembled.updateMatrixWorld(true);
  const meshes = [];
  coat.traverse(node => { if (node.isMesh) meshes.push(node); });
  // Raccogli prima i nodi: attach() li rimuove dal loro genitore e non deve alterare traverse().
  for (const node of meshes) {
    const match = new RegExp(`^${prefix}_(.+)_[^_]+$`).exec(node.name);
    const bone = match && current.bodyScene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(match[1]));
    if (!bone) { console.warn('Osso impermeabile assente:', node.name); continue; }
    bone.attach(node);
    node.castShadow = true;
    node.frustumCulled = false;
    pieces.push(node);
  }
  return pieces;
}

function fillSelects(start) {
  const packs = [...new Set(catalog.map(entry => entry.pack))];
  for (const select of selects) {
    select.replaceChildren(...packs.map(pack => {
      const group = document.createElement('optgroup');
      group.label = pack;
      group.append(...catalog.filter(entry => entry.pack === pack)
        .map(entry => new Option(entry.label + (entry.rig === 'large' ? ' (grande)' : ''), entry.id)));
      return group;
    }));
    select.value = start;
  }
}

function setBusy(busy, text) {
  for (const select of selects) select.disabled = busy;
  for (const button of document.querySelectorAll('[data-throw]')) button.disabled = busy;
  status.textContent = text ?? ready;
}

async function mount() {
  const ids = { head: form.elements.khead.value, body: form.elements.kbody.value, legs: form.elements.klegs.value };
  const rig = byId(ids.body).rig;
  setBusy(true, 'Caricamento del personaggio…');
  const unique = [...new Set(Object.values(ids))];
  const [chars, clipList] = await Promise.all([
    Promise.all(unique.map(id => kaykit.loadCharacter(gltf, byId(id)))),
    kaykit.loadClips(gltf, rig)
  ]);
  // Smonta la composizione precedente.
  stick.removeFromParent();
  mixer?.stopAllAction();
  for (const child of [...assembled.children]) assembled.remove(child);
  for (const char of chars) {
    char.scene.getObjectByName('hand.right.kaykit2')?.removeFromParent();
    assembled.add(char.scene);
  }
  const clips = clipList.map(item => item.clip);
  const charOf = id => chars.find(char => char.entry.id === id);
  current = { ids, rig, chars, clips, clipList, bodyScene: charOf(ids.body).scene };
  // Accessori della testa e del busto scelti, ricordando quelli già spenti.
  const box = document.querySelector('#acc');
  const previous = new Map([...box.querySelectorAll('input')].map(input => [input.name, input.checked]));
  const accs = [...charOf(ids.head).parts.acc.filter(acc => acc.anchor === 'head'), ...charOf(ids.body).parts.acc.filter(acc => acc.anchor === 'body')];
  box.replaceChildren(...accs.map(acc => {
    const option = document.createElement('label');
    option.className = 'option';
    option.append(Object.assign(document.createElement('input'), { type: 'checkbox', name: 'acc:' + acc.key, checked: previous.get('acc:' + acc.key) ?? true }),
      Object.assign(document.createElement('span'), { textContent: acc.label }));
    return option;
  }));
  if (!accs.length) box.textContent = 'Nessun accessorio separato.';
  applyVisibility();
  mixer = new THREE.AnimationMixer(new THREE.AnimationObjectGroup(...chars.map(char => char.scene)));
  const idle = clips.find(clip => clip.name === 'Idle_A');
  mixer.clipAction(idle).play();
  mixer.update(0);
  fit();
  mixer.stopAllAction();
  action = undefined;
  current.grip = kaykit.prepareGrip(current.bodyScene);
  current.grip.scale = stickScale(current.grip.socket, rig === 'large' ? 0.55 : 0.42);
  mountRaincoat();
  applyVisibility();
  placeStick();
  fillClips();
  const wanted = clips.some(clip => clip.name === params.get('clip')) ? params.get('clip') : (clips.some(clip => clip.name === clipSelect.dataset.last) ? clipSelect.dataset.last : 'Idle_A');
  params.delete('clip');
  play(wanted);
  const sources = unique.map(id => `${byId(id).label} (${byId(id).pack})`).join(', ');
  document.querySelector('#who-note').textContent = `Scheletro ${rig === 'large' ? 'grande' : 'medio'}. Da: ${sources}.`;
  document.querySelector('#label').textContent = unique.length === 1 ? byId(ids.body).label : 'Composto';
  setBusy(false);
}

function fillClips() {
  const { clipList, clips } = current;
  clipSelect.replaceChildren(...[...new Set(clipList.map(item => item.group))].map(group => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group;
    optgroup.append(...clipList.filter(item => item.group === group)
      .map(({ clip }) => new Option(`${clip.name} · ${clip.duration.toFixed(1)} s`, clip.name)));
    return optgroup;
  }));
  const quick = document.querySelector('#quick');
  quick.replaceChildren(...quickClips.filter(([name]) => clips.some(clip => clip.name === name)).map(([name, label]) => {
    const button = Object.assign(document.createElement('button'), { type: 'button', textContent: label, onclick: () => play(name) });
    button.dataset.clip = name;
    return button;
  }));
  document.querySelector('#clip-note').textContent = `${clips.length} clip di Character Animations 1.1 per lo scheletro ${current.rig === 'large' ? 'grande' : 'medio'}.`;
}

function play(name) {
  if (!current || throwing) return;
  const clip = current.clips.find(item => item.name === name);
  if (!clip) return;
  const next = mixer.clipAction(clip);
  next.reset();
  next.setLoop(document.querySelector('#loop').checked ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  next.clampWhenFinished = true;
  next.play();
  if (action && action !== next) action.crossFadeTo(next, 0.2, false);
  action = next;
  action.paused = document.querySelector('#pause').checked;
  clipSelect.value = name;
  clipSelect.dataset.last = name;
  for (const button of document.querySelectorAll('#quick button')) button.setAttribute('aria-pressed', String(button.dataset.clip === name));
  history.replaceState(null, '', `?pg=${encodeURIComponent(current.ids.body)}&clip=${encodeURIComponent(name)}`);
}

// Lanci: il gesto sottomano per KayKit (orizzontale, baguette) o la clip «Throw» del pacchetto.
const packRelease = 0.42;
function startThrow(style) {
  if (!current || throwing) return;
  form.elements.stick.checked = true;
  placeStick();
  const paused = action;
  let motion;
  // Tutti i lanci partono dalla posa di riposo, con le clip ferme.
  mixer.stopAllAction();
  if (style === 'pack') {
    const clip = current.clips.find(item => item.name === 'Throw');
    const throwAction = mixer.clipAction(clip);
    throwAction.setLoop(THREE.LoopOnce, 1);
    throwAction.clampWhenFinished = true;
    throwAction.reset().play();
    mixer.update(0);
    const size = measureStick(stick);
    motion = {
      release: clip.duration * packRelease,
      duration: clip.duration + 0.7,
      size,
      pose(time) { throwAction.time = Math.min(time, clip.duration); mixer.update(0); },
      restore() { throwAction.stop(); }
    };
  } else {
    const idle = mixer.clipAction(current.clips.find(item => item.name === 'Idle_A'));
    idle.reset().play();
    mixer.update(0);
    idle.paused = true;
    // Il bastone esce dalla mano e la segue da fuori: così l'impugnatura cambia con lo stile.
    scene.attach(stick);
    motion = prepareKaykitThrow(current.bodyScene, stick, style, form.elements.stance.value);
    motion.duration = 2.6;
    const restore = motion.restore;
    motion.restore = () => { restore(); idle.stop(); };
  }
  throwing = { time: 0, style, motion, resume: paused?.getClip().name ?? 'Idle_A' };
  for (const fieldset of form.querySelectorAll('fieldset')) fieldset.disabled = true;
  orient('throw');
  status.textContent = { horizontal: 'Preparazione · orizzontale', baguette: 'Preparazione · a baguette', pack: 'Preparazione · clip del pacchetto' }[style];
}

function stepThrow(elapsed) {
  const shot = throwing;
  const { motion } = shot;
  shot.time = Math.min(motion.duration, shot.time + elapsed);
  if (!shot.fly && shot.time >= motion.release) {
    motion.pose(motion.release, true);
    if (stick.parent !== scene) scene.attach(stick);
    const scale = stick.getWorldScale(new THREE.Vector3()).x;
    shot.fly = prepareFlight(stick, shot.style === 'pack' ? 'baguette' : shot.style, motion.size, scale);
    status.textContent = 'Rilascio · il bastone è in volo';
  }
  motion.pose(shot.time, !shot.fly);
  if (shot.fly && shot.fly(shot.time - motion.release) && !shot.landed) {
    shot.landed = true;
    status.textContent = 'A terra · il braccio torna a riposo';
  }
  if (shot.time === motion.duration) {
    motion.restore();
    throwing = undefined;
    action = undefined;
    for (const fieldset of form.querySelectorAll('fieldset')) fieldset.disabled = false;
    placeStick();
    play(shot.resume);
    orient('front');
    status.textContent = 'Lancio concluso · puoi ripeterlo';
  }
}

form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('change', event => {
  const { name } = event.target;
  if (['kall', 'khead', 'kbody', 'klegs'].includes(name)) {
    if (name === 'kall') for (const select of selects.slice(1)) select.value = form.elements.kall.value;
    else {
      // Scheletri diversi non si mescolano: un pezzo di altro scheletro porta con sé tutto il personaggio.
      const picked = byId(event.target.value);
      for (const select of selects.slice(1)) if (byId(select.value).rig !== picked.rig) select.value = picked.id;
      form.elements.kall.value = form.elements.kbody.value;
    }
    composing = composing.then(mount).catch(error => {
      setBusy(false, 'Caricamento del personaggio fallito. Scegline un altro o ricarica la pagina.');
      console.error(error);
    });
  } else if (name === 'clip') play(clipSelect.value);
  else if (name === 'stick') placeStick();
  else if (name === 'raincoat') applyVisibility();
  else if (name === 'ring') ring.material.color.set(ringColors[event.target.value]);
  else if (name === 'speed') mixer && (mixer.timeScale = Number(event.target.value));
  else if (event.target.id === 'loop') play(clipSelect.value);
  else if (event.target.id === 'pause') { if (action) action.paused = event.target.checked; }
  else if (name.startsWith('acc:')) applyVisibility();
});
for (const button of document.querySelectorAll('[data-throw]')) button.addEventListener('click', () => startThrow(button.dataset.throw));

// Posizione di partenza del lancio (?posa=affondo): vale per orizzontale e baguette, non per la clip del pacchetto.
document.querySelector('#stances').append(...Object.entries(stances).map(([id, stance]) => {
  const option = document.createElement('label');
  option.className = 'option';
  option.innerHTML = `<input type="radio" name="stance" value="${id}"><span>${stance.label}</span>`;
  option.querySelector('input').checked = id === (stances[params.get('posa')] ? params.get('posa') : 'dritto');
  return option;
}));

const ringBox = document.querySelector('#ring');
ringBox.append(...Object.entries(ringColors).map(([nik, color], index) => {
  const option = document.createElement('label');
  option.className = 'option swatch';
  option.style.setProperty('--c', color);
  option.append(Object.assign(document.createElement('input'), { type: 'radio', name: 'ring', value: nik, checked: index === 0 }),
    Object.assign(document.createElement('span'), { textContent: nik }));
  return option;
}));

renderer.setAnimationLoop(() => {
  const elapsed = Math.min(clock.getDelta(), 0.05);
  if (throwing && !hold) stepThrow(elapsed);
  else mixer?.update(elapsed);
  renderer.render(scene, camera);
});

(async () => {
  const [loadedCatalog, stickFile, mediumRaincoat, largeRaincoat] = await Promise.all([
    kaykit.loadCatalog(),
    gltf.loadAsync('modelli/bastone-molkky.glb'),
    gltf.loadAsync('modelli/kaykit2/accessori/impermeabile-giallo-medium.glb'),
    gltf.loadAsync('modelli/kaykit2/accessori/impermeabile-giallo-large.glb')
  ]);
  catalog = loadedCatalog;
  stick = stickFile.scene;
  raincoats = { medium: mediumRaincoat, large: largeRaincoat };
  stick.traverse(node => { if (node.isMesh) node.castShadow = true; });
  fillSelects(catalog.some(entry => entry.id === params.get('pg')) ? params.get('pg') : 'Mannequin_Medium');
  await mount();
})().catch(error => {
  status.textContent = 'Caricamento dello studio fallito. Ricarica la pagina per riprovare.';
  console.error(error);
});
