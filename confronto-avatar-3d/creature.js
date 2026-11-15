// Creature di Ultimate Monsters (Quaternius, CC0) ordinate per stadi: una specie cresce di stadio con i livelli.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const files = ('Big_Alien Big_Birb Big_BlueDemon Big_Bunny Big_Cactoro Big_Demon Big_Dino Big_Fish Big_Frog Big_Monkroose '
  + 'Big_MushroomKing Big_Ninja Big_Orc Big_Orc_Skull Big_Tribal Big_Yeti Blob_Alien Blob_Birb Blob_Cactoro Blob_Cat '
  + 'Blob_Chicken Blob_Dog Blob_Fish Blob_GreenBlob Blob_GreenSpikyBlob Blob_Mushnub Blob_Mushnub_Evolved Blob_Ninja '
  + 'Blob_Orc Blob_Pigeon Blob_PinkBlob Blob_Wizard Blob_Yeti Flying_Alpaking Flying_Alpaking_Evolved Flying_Armabee '
  + 'Flying_Armabee_Evolved Flying_Demon Flying_Dragon Flying_Dragon_Evolved Flying_Ghost Flying_Ghost_Skull Flying_Glub '
  + 'Flying_Glub_Evolved Flying_Goleling Flying_Goleling_Evolved Flying_Hywirl Flying_Pigeon Flying_Squidle Flying_Tribal').split(' ');

// Ordine degli stadi: blob, volante, grande, poi la versione evoluta.
const families = { Blob: ['Piccolo', 0], Flying: ['Volante', 1], Big: ['Grande', 2] };
const species = new Map();
for (const file of files) {
  const [family, ...rest] = file.split('_');
  const evolved = rest.at(-1) === 'Evolved';
  const name = (evolved ? rest.slice(0, -1) : rest).join('_');
  const [label, rank] = families[family];
  if (!species.has(name)) species.set(name, []);
  species.get(name).push({ file, label: evolved ? 'Evoluto' : label, rank: rank + (evolved ? 10 : 0) });
}
for (const stages of species.values()) stages.sort((a, b) => a.rank - b.rank);
const nameOf = id => id.replace(/([a-z])([A-Z])/g, '$1 $2').replace('_', ' ');

const clipLabels = {
  Idle: 'Riposo', Flying_Idle: 'Riposo in volo', Yes: 'Sì', No: 'No', Dance: 'Balla', Wave: 'Saluta', Jump: 'Salta',
  Punch: 'Pugno', Bite_Front: 'Morso', Headbutt: 'Testata', Walk: 'Cammina', Run: 'Corre', Fast_Flying: 'Vola veloce',
  Duck: 'Si abbassa', HitReact: 'Colpito', HitRecieve: 'Colpito', Weapon: 'Arma', Death: 'Cade'
};
const ringColors = { Moz: '#F2705A', Mos: '#4DA9F0', Dile: '#F6C23B', Sangio: '#5CC46A', Umbi: '#A98BEF', Katia: '#F7943D' };

const view = document.querySelector('#view');
const status = document.querySelector('#status');
const form = document.querySelector('#closet');
const params = new URLSearchParams(location.search);

function fillChoices(name, entries, checked) {
  const box = form.querySelector(`[data-choices="${name}"]`);
  box.replaceChildren();
  for (const { id, label } of entries) {
    const option = document.createElement('label');
    option.className = 'option';
    const input = Object.assign(document.createElement('input'), { type: 'radio', name, value: id, checked: id === checked });
    option.append(input, Object.assign(document.createElement('span'), { textContent: label }));
    box.append(option);
  }
}
const all = [...species.keys()].sort();
const evolving = all.filter(id => species.get(id).length > 1);
const first = species.has(params.get('specie')) ? params.get('specie') : 'Dragon';
// Le due liste sono un solo gruppo di scelta: un nome comune per i radio.
fillChoices('evolve', evolving.map(id => ({ id, label: nameOf(id) })), first);
fillChoices('single', all.filter(id => species.get(id).length === 1).map(id => ({ id, label: nameOf(id) })), first);
for (const input of form.querySelectorAll('[data-choices="evolve"] input, [data-choices="single"] input')) input.name = 'specie';
fillChoices('ring', Object.keys(ringColors).map(id => ({ id, label: id })), 'Moz');

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
key.shadow.camera.left = key.shadow.camera.bottom = -2;
key.shadow.camera.right = key.shadow.camera.top = 2;
scene.add(key);
const ground = new THREE.Mesh(new THREE.CircleGeometry(3.7, 64), new THREE.MeshStandardMaterial({ color: '#354d48', roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.12, 64), new THREE.MeshBasicMaterial({ color: '#F2705A' }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.004;
scene.add(ring);
const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 30);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minDistance = 2;
controls.maxDistance = 8;
controls.maxPolarAngle = Math.PI * 0.51;
camera.position.set(0.8, 1.5, 4.4);
controls.target.set(0, 0.85, 0);
controls.update();
new ResizeObserver(() => {
  renderer.setSize(view.clientWidth, view.clientHeight);
  camera.aspect = view.clientWidth / view.clientHeight;
  camera.updateProjectionMatrix();
}).observe(view);

const loader = new GLTFLoader();
const cache = new Map();
const load = file => {
  if (!cache.has(file)) cache.set(file, loader.loadAsync(`modelli/quaternius-mostri/${file}.glb`).then(gltf => {
    gltf.scene.traverse(node => { if (node.isMesh) { node.castShadow = true; node.frustumCulled = false; } });
    // Le trasformazioni del file vanno applicate prima di misurare, o le ossa scalate sballano l'altezza.
    gltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    return { ...gltf, height: box.max.y - box.min.y, box };
  }));
  return cache.get(file);
};

const holder = new THREE.Group();
scene.add(holder);
let current, mixer, rest, gesture;
const clock = new THREE.Clock();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Tutti gli stadi di una specie usano la stessa scala: lo stadio più alto sta in 1,7 unità, gli altri restano più piccoli.
async function show() {
  const options = new FormData(form);
  const stages = species.get(options.get('specie'));
  const stageIndex = Math.min(Number(options.get('stage') ?? 0), stages.length - 1);
  status.textContent = 'Caricamento…';
  const loaded = await Promise.all(stages.map(stage => load(stage.file)));
  const scale = 1.7 / Math.max(...loaded.map(item => item.height));
  const gltf = loaded[stageIndex];
  holder.clear();
  holder.add(gltf.scene);
  gltf.scene.scale.setScalar(scale);
  gltf.scene.position.set(0, -gltf.box.min.y * scale, 0);
  current = gltf;
  mixer = new THREE.AnimationMixer(gltf.scene);
  const idleClip = gltf.animations.find(clip => clip.name === 'Flying_Idle') ?? gltf.animations.find(clip => clip.name === 'Idle');
  rest = idleClip && mixer.clipAction(idleClip);
  if (rest && !reduced) rest.play();
  mixer.update(0);
  const clips = document.querySelector('#clips');
  clips.replaceChildren(...gltf.animations
    .filter(clip => clip !== idleClip && clipLabels[clip.name])
    .map(clip => Object.assign(document.createElement('button'), { type: 'button', textContent: clipLabels[clip.name], onclick: () => play(clip) })));
  document.querySelector('#stages').hidden = stages.length < 2;
  document.querySelector('#stage-note').textContent = stages.length > 1
    ? `${stages.length} stadi: ${stages.map(stage => stage.label.toLowerCase()).join(', ')}. File: ${stages[stageIndex].file}.glb`
    : '';
  document.querySelector('#label').textContent = `${nameOf(options.get('specie'))} · ${stages[stageIndex].label}`;
  status.textContent = 'Trascina per ruotare · scorri o usa due dita per lo zoom';
}

function play(clip) {
  gesture?.stop();
  gesture = mixer.clipAction(clip);
  gesture.setLoop(THREE.LoopOnce, 1);
  gesture.clampWhenFinished = clip.name === 'Death';
  rest?.fadeOut(0.15);
  gesture.reset().fadeIn(0.15).play();
  mixer.addEventListener('finished', function back(event) {
    if (event.action !== gesture) return;
    mixer.removeEventListener('finished', back);
    if (clip.name === 'Death') return;
    gesture.fadeOut(0.2);
    rest?.reset().fadeIn(0.2).play();
  });
}

function refreshStages() {
  const stages = species.get(new FormData(form).get('specie'));
  const wanted = Math.min(Number(params.get('stadio') ?? 0), stages.length - 1);
  fillChoices('stage', stages.map((stage, index) => ({ id: String(index), label: `${index + 1} · ${stage.label}` })), String(wanted));
  params.delete('stadio');
}

form.addEventListener('change', event => {
  if (event.target.name === 'ring') {
    ring.material.color.set(ringColors[event.target.value]);
    return;
  }
  if (event.target.name === 'specie') refreshStages();
  history.replaceState(null, '', `?specie=${new FormData(form).get('specie')}&stadio=${new FormData(form).get('stage')}`);
  show().catch(error => { status.textContent = 'Caricamento della creatura fallito.'; console.error(error); });
});

renderer.setAnimationLoop(() => {
  mixer?.update(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
});
refreshStages();
show().catch(error => { status.textContent = 'Caricamento della creatura fallito.'; console.error(error); });
