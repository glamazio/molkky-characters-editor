// Confronto locale di asset 3D, con un accessorio originale montato sul rig.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const el = id => document.getElementById(id);
const view = el('view');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
view.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#273a3b');
scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8971, 1.25));
const light = new THREE.DirectionalLight(0xfff0da, 1.5);
light.position.set(3, 5, 4);
scene.add(light);
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(1.6, 64),
  new THREE.MeshStandardMaterial({ color: '#46615a', roughness: 0.95 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.018;
scene.add(floor);

const camera = new THREE.PerspectiveCamera(34, 1, 0.03, 40);
const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 2.1;
controls.maxDistance = 7;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI * 0.51;

function orient(back = false) {
  camera.position.set(back ? 0.8 : 0.75, 1.52, back ? -4.1 : 4.1);
  controls.target.set(0, 1.03, 0);
  controls.update();
}
orient();

new ResizeObserver(() => {
  renderer.setSize(view.clientWidth, view.clientHeight);
  camera.aspect = view.clientWidth / view.clientHeight;
  camera.updateProjectionMatrix();
}).observe(view);

const packInfo = {
  q: ['Quaternius', 'Assembla quattro parti originali di Adventurer. Prova la testa di Casual Hoodie e lo zaino separato.'],
  k: ['Kenney', 'Passa tra due personaggi Blocky Characters completi e prova le animazioni incluse nel GLB.'],
  v: ['VerseEngine', 'Il runtime three-avatar carica il VRM di esempio di pixiv e ne controlla le espressioni.']
};
const gltf = new GLTFLoader();
const fbx = new FBXLoader();
const clock = new THREE.Clock();
const cache = new Map();
let mode = 'q';
let current;
let loadVersion = 0;
let wantsAccessory = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion) {
  el('animation').value = 'static';
  el('q-motion').value = 'static';
}

// L'origine del GLB coincide con il suo innesto. Lo stesso file si monta su tutti i rig.
let birillo;

function fit(model) {
  const group = new THREE.Group();
  group.add(model);
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const factor = 1.92 / (bounds.max.y - bounds.min.y);
  group.scale.setScalar(factor);
  group.position.set(-center.x * factor, -bounds.min.y * factor, -center.z * factor);
  group.updateMatrixWorld(true);
  return group;
}

// Ogni adattatore sceglie il nodo del proprio rig. Il modulo ha sempre lo stesso orientamento locale.
function makeBackSocket(torso, depth) {
  if (!torso) throw new Error('Nodo del torso assente nel modello');
  const socket = new THREE.Group();
  socket.name = 'back.center';
  const position = torso.getWorldPosition(new THREE.Vector3());
  socket.position.set(position.x, 1.37, position.z - depth);
  torso.attach(socket);
  return socket;
}

async function loadQuaternius() {
  const ids = ['body', 'legs', 'feet', 'head', 'alt', 'backpack'];
  const [files, clipData] = await Promise.all([
    Promise.all(ids.map(id => fbx.loadAsync('modelli/q-' + id + '.fbx'))),
    fetch('modelli/q-idle.json').then(response => response.json())
  ]);
  const [body, legs, feet, head, alt, backpack] = files;
  const model = new THREE.Group();
  model.add(body, legs, feet, head);
  const root = fit(model);
  model.add(alt, backpack);
  const socket = makeBackSocket(body.getObjectByName('Chest'), 0.21);
  const mixer = new THREE.AnimationMixer(new THREE.AnimationObjectGroup(...files));
  const animations = [THREE.AnimationClip.parse(clipData)];
  animations[0].name = 'idle';
  return { root, socket, head, alt, backpack, mixer, animations };
}

async function loadKenney(letter) {
  const { scene: model, animations } = await gltf.loadAsync('modelli/kenney-' + letter + '.glb');
  const root = fit(model);
  const socket = makeBackSocket(model.getObjectByName('torso'), 0.25);
  const mixer = new THREE.AnimationMixer(model);
  return { root, socket, mixer, animations };
}

async function loadVerse() {
  const { createAvatar, preLoadAnimationData } = await import('three-avatar');
  await preLoadAnimationData({});
  const response = await fetch('modelli/verse.vrm');
  if (!response.ok) throw new Error('Modello VRM non trovato');
  const avatar = await createAvatar(new Uint8Array(await response.arrayBuffer()), renderer, false);
  avatar.object3D.rotateY(Math.PI);
  const root = fit(avatar.object3D);
  const humanoid = avatar.vrm.humanoid;
  const torso = humanoid.getRawBoneNode('upperChest') || humanoid.getRawBoneNode('chest') || humanoid.getRawBoneNode('spine');
  const socket = makeBackSocket(torso, 0.17);
  for (const name of avatar.faceExpressionNames) el('expression').add(new Option(name, name));
  return { root, socket, avatar };
}

function refresh() {
  if (!current) return;
  if (mode === 'q') {
    current.head.visible = el('head').value === 'head';
    current.alt.visible = !current.head.visible;
    current.backpack.visible = el('pack').checked;
  }
  const motion = mode === 'q' ? el('q-motion').value : el('animation').value;
  if (current.mixer && current.clip !== motion) {
    current.clip = motion;
    current.mixer.stopAllAction();
    const clip = current.animations.find(animation => animation.name === current.clip);
    if (clip) current.mixer.clipAction(clip).reset().play();
  }
  if (mode === 'v') {
    current.avatar.resetFaceExpression();
    if (el('expression').value) current.avatar.setFaceExpression(el('expression').value, 1);
  }
  const mounted = wantsAccessory && !(mode === 'q' && current.backpack.visible);
  el('accessory').setAttribute('aria-pressed', String(mounted));
  birillo?.removeFromParent();
  if (mounted) current.socket.add(birillo);
  el('status').textContent = mounted
    ? 'Birillo montato su back.center. Ruota il personaggio per vedere l’aggancio.'
    : 'Modello caricato. Trascina per ruotare, scorri o usa due dita per lo zoom.';
}

async function select(next) {
  const version = ++loadVersion;
  mode = next;
  current?.root.removeFromParent();
  current = undefined;
  birillo?.removeFromParent();
  el('accessory').disabled = true;
  el('accessory').setAttribute('aria-pressed', 'false');
  for (const button of document.querySelectorAll('[data-mode]')) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === next));
  }
  for (const key of Object.keys(packInfo)) el(key + '-options').hidden = key !== next;
  [el('name').textContent, el('description').textContent] = packInfo[next];
  el('status').textContent = 'Caricamento del modello…';
  const key = next === 'k' ? next + el('character').value : next;
  if (!cache.has(key)) {
    const promise = next === 'q' ? loadQuaternius() : next === 'k' ? loadKenney(el('character').value) : loadVerse();
    cache.set(key, promise);
  }
  try {
    const [result, accessory] = await Promise.all([
      cache.get(key),
      birillo ?? gltf.loadAsync('modelli/birillo-molkky.glb').then(file => file.scene)
    ]);
    if (version !== loadVersion) return;
    current = result;
    birillo = accessory;
    scene.add(current.root);
    el('accessory').disabled = false;
    refresh();
  } catch (error) {
    cache.delete(key);
    if (version !== loadVersion) return;
    el('status').textContent = 'Caricamento fallito: ' + error.message;
    console.error(error);
  }
}

for (const button of document.querySelectorAll('[data-mode]')) {
  button.addEventListener('click', () => select(button.dataset.mode));
}
for (const id of ['head', 'q-motion', 'animation', 'expression']) el(id).addEventListener('change', refresh);
el('pack').addEventListener('change', () => {
  if (el('pack').checked) wantsAccessory = false;
  refresh();
});
el('character').addEventListener('change', () => select('k'));
el('accessory').addEventListener('click', () => {
  wantsAccessory = !wantsAccessory;
  if (wantsAccessory && mode === 'q') el('pack').checked = false;
  refresh();
});
el('front').addEventListener('click', () => orient());
el('back').addEventListener('click', () => orient(true));

renderer.setAnimationLoop(() => {
  const elapsed = Math.min(clock.getDelta(), 0.05);
  current?.mixer?.update(elapsed);
  current?.avatar?.tick(elapsed);
  renderer.render(scene, camera);
});
select('q');
