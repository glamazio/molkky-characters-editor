// Visore delle clip: un modello per pacchetto, un pulsante per ogni clip del file.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const models = [
  { id: 'kk-anim', label: 'KayKit Animations 1.2', file: 'modelli/kaykit-animazioni/KayKit_AnimatedCharacter_v1.2.glb', note: 'Omino di prova del pacchetto Character Animations 1.2 (CC0). Scheletro a 6 ossa, non compatibile con gli avventurieri.' },
  { id: 'kk-knight', label: 'KayKit Adventurers', file: 'modelli/kaykit/Knight.glb', note: 'Cavaliere di KayKit Adventurers (CC0). Le clip valgono per tutti gli avventurieri e gli scheletri.' },
  { id: 'kk-skeleton', label: 'KayKit Skeletons', file: 'modelli/kaykit/Skeleton_Minion.glb', note: 'Scheletro servo di KayKit Skeletons (CC0). Ha le clip degli avventurieri più quelle proprie degli scheletri.' },
  { id: 'q-animati', label: 'Quaternius Animated', file: 'modelli/quaternius-animati/Casual_Female.glb', note: 'Ultimate Animated Character Pack (CC0). Stesse clip per tutti i 49 personaggi del pacchetto.' },
  { id: 'q-donna', label: 'Quaternius Modular Women', file: 'modelli/quaternius-donna/casual.glb', note: 'Ultimate Modular Women (CC0). Stesse clip per i 10 personaggi femminili.' },
  { id: 'q-rpg', label: 'Quaternius RPG', file: 'modelli/quaternius-rpg/Warrior.glb', note: 'RPG Characters (CC0). Ogni classe ha le sue clip di attacco.' }
];

const view = document.querySelector('#view');
const status = document.querySelector('#status');
const form = document.querySelector('#closet');
const loopBox = document.querySelector('#loop');
const params = new URLSearchParams(location.search);

const box = form.querySelector('[data-choices="model"]');
const first = models.some(model => model.id === params.get('modello')) ? params.get('modello') : 'kk-anim';
for (const { id, label } of models) {
  const option = document.createElement('label');
  option.className = 'option';
  option.append(
    Object.assign(document.createElement('input'), { type: 'radio', name: 'model', value: id, checked: id === first }),
    Object.assign(document.createElement('span'), { textContent: label })
  );
  box.append(option);
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
view.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#243c3d');
scene.add(new THREE.HemisphereLight(0xffffff, 0x799684, 1.5));
const key = new THREE.DirectionalLight(0xffe9c8, 1.9);
key.position.set(3, 5, 4);
key.castShadow = true;
key.shadow.camera.left = key.shadow.camera.bottom = -2.5;
key.shadow.camera.right = key.shadow.camera.top = 2.5;
scene.add(key);
const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: '#354d48', roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 40);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minDistance = 2;
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI * 0.51;
camera.position.set(1.4, 1.6, 5);
controls.target.set(0, 0.9, 0);
controls.update();
new ResizeObserver(() => {
  renderer.setSize(view.clientWidth, view.clientHeight);
  camera.aspect = view.clientWidth / view.clientHeight;
  camera.updateProjectionMatrix();
}).observe(view);

const loader = new GLTFLoader();
const holder = new THREE.Group();
scene.add(holder);
const clock = new THREE.Clock();
let mixer, action, pressed;

const restClip = clips => clips.find(clip => /^(Idle|CharacterArmature\|Idle)$/.test(clip.name)) ?? clips[0];
const shortName = name => name.replace(/^CharacterArmature\|/, '');

async function show() {
  const model = models.find(item => item.id === new FormData(form).get('model'));
  status.textContent = 'Caricamento…';
  const gltf = await loader.loadAsync(model.file);
  holder.clear();
  const root = gltf.scene;
  root.traverse(node => { if (node.isMesh) { node.castShadow = true; node.frustumCulled = false; } });
  holder.add(root);
  mixer = new THREE.AnimationMixer(root);
  const rest = restClip(gltf.animations);
  action = mixer.clipAction(rest).play();
  mixer.update(0);
  // Altezza misurata nella posa di riposo, con le ossa applicate ai vertici.
  root.scale.setScalar(1);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  root.traverseVisible(node => { if (node.isMesh) bounds.expandByObject(node, true); });
  const scale = 1.8 / (bounds.max.y - bounds.min.y);
  root.scale.setScalar(scale);
  root.position.set(-((bounds.min.x + bounds.max.x) / 2) * scale, -bounds.min.y * scale, -((bounds.min.z + bounds.max.z) / 2) * scale);
  const clips = document.querySelector('#clips');
  clips.replaceChildren(...[...gltf.animations].sort((a, b) => shortName(a.name).localeCompare(shortName(b.name))).map(clip => {
    const button = Object.assign(document.createElement('button'), {
      type: 'button',
      textContent: `${shortName(clip.name)} · ${clip.duration.toFixed(1)} s`,
      onclick: () => play(clip, button)
    });
    button.setAttribute('aria-pressed', String(clip === rest));
    if (clip === rest) pressed = button;
    return button;
  }));
  document.querySelector('#model-note').textContent = `${model.note} ${gltf.animations.length} clip.`;
  document.querySelector('#label').textContent = `${model.label} · ${shortName(rest.name)}`;
  history.replaceState(null, '', '?modello=' + model.id);
  status.textContent = 'Trascina per ruotare · scorri o usa due dita per lo zoom';
}

function play(clip, button) {
  const next = mixer.clipAction(clip);
  next.reset();
  next.setLoop(loopBox.checked ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  next.clampWhenFinished = true;
  if (action && action !== next) action.crossFadeTo(next.play(), 0.2, false);
  else next.play();
  action = next;
  pressed?.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-pressed', 'true');
  pressed = button;
  document.querySelector('#label').textContent = `${models.find(item => item.id === new FormData(form).get('model')).label} · ${shortName(clip.name)}`;
}

form.addEventListener('change', event => {
  if (event.target.name !== 'model') return;
  show().catch(error => { status.textContent = 'Caricamento del modello fallito.'; console.error(error); });
});
loopBox.addEventListener('change', () => action?.setLoop(loopBox.checked ? THREE.LoopRepeat : THREE.LoopOnce, Infinity));

renderer.setAnimationLoop(() => {
  mixer?.update(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
});
show().catch(error => { status.textContent = 'Caricamento del modello fallito.'; console.error(error); });
