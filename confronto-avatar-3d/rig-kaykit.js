// Adattatore per KayKit Adventurers (Kay Lousberg, CC0). I cinque personaggi condividono lo stesso scheletro:
// testa, busto e gambe si possono prendere da personaggi diversi e la stessa clip li muove tutti insieme.
import * as THREE from 'three';

export const kaykitCatalog = [
  { id: 'barbarian', file: 'Barbarian', label: 'Barbaro', parts: ['head', 'body', 'legs'] },
  { id: 'knight', file: 'Knight', label: 'Cavaliere', parts: ['head', 'body', 'legs'] },
  { id: 'mage', file: 'Mage', label: 'Mago', parts: ['head', 'body', 'legs'] },
  { id: 'rogue', file: 'Rogue', label: 'Furfante', parts: ['head', 'body', 'legs'] },
  { id: 'hooded', file: 'Rogue_Hooded', label: 'Cappuccio', parts: ['head'] },
  // KayKit Skeletons (CC0): stesso scheletro, quindi le parti si mescolano con gli avventurieri.
  { id: 'sk-minion', file: 'Skeleton_Minion', label: 'Scheletro servo', parts: ['head', 'body', 'legs'] },
  { id: 'sk-warrior', file: 'Skeleton_Warrior', label: 'Scheletro guerriero', parts: ['head', 'body', 'legs'] },
  { id: 'sk-rogue', file: 'Skeleton_Rogue', label: 'Scheletro furfante', parts: ['head', 'body', 'legs'] },
  { id: 'sk-mage', file: 'Skeleton_Mage', label: 'Scheletro mago', parts: ['head', 'body', 'legs'] }
];

const bone = (scene, name) => {
  const node = scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  if (!node) throw new Error('Osso KayKit assente: ' + name);
  return node;
};

// Ogni mesh va in uno slot: le armi del pacchetto restano sempre nascoste.
function slotOf(mesh) {
  const parent = mesh.parent?.name ?? '';
  if (parent.startsWith('handslot')) return 'weapon';
  if (parent === 'head') return 'hat';
  if (parent === 'chest') return 'cape';
  // Negli scheletri la testa è fatta di cranio, mandibola e occhi.
  if (/_(Head|Skull|Jaw|Eyes)/.test(mesh.name)) return 'head';
  if (/_Leg/.test(mesh.name)) return 'legs';
  return 'body';
}

export async function loadKaykit(gltf) {
  const loaded = await Promise.all(kaykitCatalog.map(entry => gltf.loadAsync('modelli/kaykit/' + entry.file + '.glb')));
  const characters = kaykitCatalog.map((entry, index) => {
    const scene = loaded[index].scene;
    const slots = { head: [], hat: [], body: [], cape: [], legs: [], weapon: [] };
    scene.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = true;
      // Le mesh skinnate di KayKit hanno box di partenza piccoli: senza questo sparirebbero ai bordi dell'inquadratura.
      node.frustumCulled = false;
      slots[slotOf(node)].push(node);
    });
    return { ...entry, scene, slots };
  });
  // Le clip valgono per tutti (stesse ossa): si uniscono quelle di ogni file, 76 negli avventurieri e 95 negli scheletri.
  const byName = new Map();
  for (const { animations } of loaded) for (const item of animations) if (!byName.has(item.name)) byName.set(item.name, item);
  const clips = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  const clip = name => {
    const found = clips.find(item => item.name === name);
    if (!found) throw new Error('Clip KayKit assente: ' + name);
    return found;
  };
  return {
    characters,
    scenes: characters.map(character => character.scene),
    clips: { idle: clip('Idle'), cheer: clip('Cheer'), throw: clip('Throw') },
    allClips: clips,
    // Mostra solo le parti scelte. Cappello e mantello seguono il personaggio di testa e busto.
    apply(options) {
      for (const { id, slots } of characters) {
        const show = {
          head: options.get('khead') === id,
          hat: options.get('khead') === id && options.has('hat'),
          body: options.get('kbody') === id,
          cape: options.get('kbody') === id && options.has('kcape'),
          legs: options.get('klegs') === id,
          weapon: false
        };
        for (const [slot, meshes] of Object.entries(slots)) for (const mesh of meshes) mesh.visible = show[slot];
      }
    },
    bodyScene(options) {
      return characters.find(character => character.id === options.get('kbody')).scene;
    }
  };
}

// Le mani KayKit non hanno dita: il bastone va nell'innesto delle armi del pacchetto.
// Le armi hanno l'impugnatura sull'origine e la lama lungo +Y dell'innesto; il bastone ha l'asse lungo +Z.
const toShaft = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

export function prepareKaykitGrip(scene) {
  const hand = bone(scene, 'hand.r');
  const slot = bone(scene, 'handslot.r');
  const socket = new THREE.Group();
  socket.name = 'hand.right.kaykit';
  socket.position.copy(slot.position);
  socket.quaternion.copy(slot.quaternion).multiply(toShaft);
  hand.add(socket);
  return { socket, apply() {}, restore() {} };
}

export function kaykitArm(scene) {
  return { upper: bone(scene, 'upperarm.r'), elbow: bone(scene, 'lowerarm.r') };
}
