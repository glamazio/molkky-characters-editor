import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as kaykit from './rig-kaykit2.js';

const fps = 30;
const $ = id => document.getElementById(id);
const form = $('editor');
const view = $('view');
const status = $('status');
const loader = new GLTFLoader();
const clock = new THREE.Clock();
const radians = degrees => degrees * Math.PI / 180;
const rounded = value => Math.round(value * 10) / 10;

const baseDelusione = () => ({
  label: 'Delusione · da Defeat', frames: 75, keys: {
    // Tempi dedotti da Quaternius Defeat (60 frame a 24 fps), convertiti a 30 fps.
    // Capo: oscillazione breve 6–44; il gesto torna neutro al frame 75.
    head: { 0: [0, 0, 0], 6: [18, 0, -5], 12: [21, 0, 7], 19: [18, 0, -5], 25: [21, 0, 7], 31: [18, 0, -5], 37: [21, 0, 7], 44: [0, 0, 0], 75: [0, 0, 0] },
    // Nel riferimento il corpo cede al frame 12 e risale solo alla fine.
    chest: { 0: [0, 0, 0], 12: [2, 0, 0], 75: [0, 0, 0] },
    // Le braccia entrano in ritardo, come nella clip Defeat: destra F25, sinistra F29.
    upperarmr: { 0: [0, 0, 0], 25: [0, -105, 0], 48: [0, -105, 0], 68: [0, 0, 0], 75: [0, 0, 0] },
    upperarml: { 0: [0, 0, 0], 29: [0, 105, 0], 46: [0, 105, 0], 68: [0, 0, 0], 75: [0, 0, 0] },
    lowerarmr: { 0: [0, 0, 0], 26: [85, -35, -68], 51: [85, -35, -68], 69: [0, 0, 0], 75: [0, 0, 0] },
    lowerarml: { 0: [0, 0, 0], 26: [85, 35, 68], 51: [85, 35, 68], 66: [0, 0, 0], 75: [0, 0, 0] }
  }
});
const animations = new Map([['delusione', baseDelusione()]]);
let animationId = 'delusione';
let catalog, char, helper, rest = new Map(), playing = false, currentFrame = 0;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
view.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#203436');
scene.add(new THREE.HemisphereLight(0xffffff, 0x799684, 1.35));
const sun = new THREE.DirectionalLight(0xffe9c8, 1.7); sun.position.set(3, 5, 4); sun.castShadow = true; scene.add(sun);
const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.23, 1.27, .1, 64), new THREE.MeshStandardMaterial({ color: '#536e61', roughness: .95 })); floor.position.y = -.05; floor.receiveShadow = true; scene.add(floor);
const root = new THREE.Group(); scene.add(root);
const camera = new THREE.PerspectiveCamera(34, 1, .05, 30);
const controls = new OrbitControls(camera, renderer.domElement); controls.enablePan = false; controls.minDistance = 1.6; controls.maxDistance = 8; controls.maxPolarAngle = Math.PI * .51;
const views = { front: [[.6, 1.36, 3.95], [0, .99, 0]], side: [[3.95, 1.3, .5], [0, .99, 0]], back: [[-.7, 1.36, -3.95], [0, .99, 0]] };
function orient(name) { const [position, target] = views[name]; camera.position.set(...position); controls.target.set(...target); controls.update(); }
orient('front');
for (const button of document.querySelectorAll('[data-view]')) button.onclick = () => orient(button.dataset.view);
new ResizeObserver(() => { renderer.setSize(view.clientWidth, view.clientHeight); camera.aspect = view.clientWidth / view.clientHeight; camera.updateProjectionMatrix(); }).observe(view);

function active() { return animations.get(animationId); }
function bone(name) { return char?.scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)); }
function cloneData(value) { return JSON.parse(JSON.stringify(value)); }
function refreshAnimationChoices() { $('animation').replaceChildren(...[...animations].map(([id, item]) => new Option(item.label, id))); $('animation').value = animationId; }
function setFrame(frame) { currentFrame = Math.max(0, Math.min(active().frames, Math.round(frame))); $('frame').max = $('frame-number').max = active().frames; $('frame').value = $('frame-number').value = currentFrame; $('frame-label').textContent = `Fotogramma ${currentFrame} · ${(currentFrame / fps).toFixed(2).replace('.', ',')} s`; $('duration').textContent = `${(active().frames / fps).toFixed(2).replace('.', ',')} s`; applyPose(); refreshControls(); }
function poseAt(name, frame) { const keys = active().keys[name]; if (!keys) return [0, 0, 0]; const points = Object.keys(keys).map(Number).sort((a, b) => a - b); const left = [...points].reverse().find(point => point <= frame); const right = points.find(point => point >= frame); if (left == null) return [0, 0, 0]; if (right == null || left === right) return [...keys[left]]; const mix = (frame - left) / (right - left); return keys[left].map((value, index) => value + (keys[right][index] - value) * mix); }
function applyPose(override) { if (!char) return; for (const [name, quaternion] of rest) bone(name)?.quaternion.copy(quaternion); for (const name of Object.keys(active().keys)) { const target = bone(name); if (!target) continue; const values = name === $('bone').value && override ? override : poseAt(name, currentFrame); target.quaternion.copy(rest.get(name)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...values.map(radians), 'XYZ'))); } char.scene.updateMatrixWorld(true); }
function refreshControls() { const values = poseAt($('bone').value, currentFrame); for (const [axis, value] of [['x', values[0]], ['y', values[1]], ['z', values[2]]]) { $(axis).value = $(axis + '-number').value = rounded(value); } const keys = active().keys[$('bone').value] ?? {}; $('keys').replaceChildren(...Object.keys(keys).map(frame => { const button = document.createElement('button'); button.type = 'button'; button.className = 'key'; button.textContent = `F${frame}`; button.onclick = () => setFrame(Number(frame)); return button; })); }
function currentAxes() { return ['x', 'y', 'z'].map(axis => Number($(axis).value)); }
function setKey() { const name = $('bone').value; if (!name) return; active().keys[name] ??= {}; active().keys[name][currentFrame] = currentAxes(); applyPose(); refreshControls(); status.textContent = `Keyframe salvato · ${name} · F${currentFrame}`; }
function deleteKey() { const keys = active().keys[$('bone').value]; if (!keys || !(currentFrame in keys)) return; delete keys[currentFrame]; if (!Object.keys(keys).length) delete active().keys[$('bone').value]; applyPose(); refreshControls(); status.textContent = `Keyframe eliminato · F${currentFrame}`; }
function fit() { root.scale.setScalar(1); root.position.set(0, 0, 0); root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(char.scene); const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3()); const scale = 1.92 / size.y; root.scale.setScalar(scale); root.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale); }
async function mount(id) { playing = false; status.textContent = 'Caricamento del rig…'; helper?.removeFromParent(); char?.scene.removeFromParent(); const entry = catalog.find(item => item.id === id); const [loaded, clipList] = await Promise.all([kaykit.loadCharacter(loader, entry), kaykit.loadClips(loader, entry.rig)]); char = loaded; root.add(char.scene); const idle = clipList.find(item => item.clip.name === 'Idle_A')?.clip; const poseMixer = new THREE.AnimationMixer(char.scene); if (idle) { poseMixer.clipAction(idle).reset().play(); poseMixer.update(1 / fps); }
  // La posa di riferimento Ã¨ Idle_A, non la T-pose tecnica con cui i GLB vengono esportati.
  rest = new Map(); char.scene.traverse(node => { if (node.isBone) rest.set(node.name, node.quaternion.clone()); if (node.isMesh) { node.castShadow = true; node.frustumCulled = false; } }); poseMixer.stopAllAction(); helper = new THREE.SkeletonHelper(char.scene); helper.material.color.set('#d8fa9c'); helper.visible = $('show-rig').checked; root.add(helper); $('bone').replaceChildren(...[...rest.keys()].filter(name => name !== 'root').map(name => new Option(name, name))); fit(); setFrame(0); $('label').textContent = `${char.entry.label} · ${active().label}`; status.textContent = 'Pronto · parte dalla posa Idle_A'; }

$('character').addEventListener('change', () => mount($('character').value));
$('animation').addEventListener('change', () => { animationId = $('animation').value; $('label').textContent = `${char.entry.label} · ${active().label}`; setFrame(0); });
$('frame').addEventListener('input', () => setFrame($('frame').value)); $('frame-number').addEventListener('input', () => setFrame($('frame-number').value));
$('bone').addEventListener('change', () => { applyPose(); refreshControls(); });
for (const axis of ['x', 'y', 'z']) { $(axis).addEventListener('input', () => { $(axis + '-number').value = $(axis).value; applyPose(currentAxes()); }); $(axis + '-number').addEventListener('input', () => { $(axis).value = $(axis + '-number').value; applyPose(currentAxes()); }); }
$('set-key').onclick = setKey; $('delete-key').onclick = deleteKey;
$('play').onclick = () => { playing = !playing; $('play').setAttribute('aria-pressed', String(playing)); $('play').textContent = playing ? '❚❚ Pausa' : '▶ Riproduci'; };
$('stop').onclick = () => { playing = false; $('play').setAttribute('aria-pressed', 'false'); $('play').textContent = '▶ Riproduci'; setFrame(0); };
$('show-rig').onchange = () => { if (helper) helper.visible = $('show-rig').checked; };
$('reset').onclick = () => { animations.set(animationId, baseDelusione()); setFrame(0); status.textContent = 'Delusione ripristinata'; };
$('new-animation').onclick = () => { const label = prompt('Nome della nuova animazione'); if (!label?.trim()) return; const id = `custom-${Date.now()}`; animations.set(id, { label: label.trim(), frames: 90, keys: {} }); animationId = id; refreshAnimationChoices(); setFrame(0); $('label').textContent = `${char.entry.label} · ${active().label}`; };
$('export').onclick = () => { const file = new Blob([JSON.stringify({ fps, animation: active() }, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(file); link.download = `${active().label.toLowerCase().replace(/[^a-z0-9]+/gi, '-') || 'animazione'}.json`; link.click(); URL.revokeObjectURL(link.href); status.textContent = 'JSON esportato'; };
form.addEventListener('submit', event => event.preventDefault());

renderer.setAnimationLoop(() => { const elapsed = Math.min(clock.getDelta(), .05); if (playing) { const next = currentFrame + elapsed * fps; setFrame(next > active().frames ? 0 : next); } renderer.render(scene, camera); });
(async () => { catalog = await kaykit.loadCatalog(); const select = $('character'); const packs = [...new Set(catalog.map(entry => entry.pack))]; select.replaceChildren(...packs.map(pack => { const group = document.createElement('optgroup'); group.label = pack; group.append(...catalog.filter(entry => entry.pack === pack).map(entry => new Option(entry.label + (entry.rig === 'large' ? ' (grande)' : ''), entry.id))); return group; })); select.value = 'Mannequin_Medium'; refreshAnimationChoices(); await mount(select.value); window.animationEditor = { get animation() { return active(); }, setFrame, setKey, export: () => $('export').click() }; })().catch(error => { status.textContent = 'Caricamento fallito. Apri dal server locale.'; console.error(error); });
