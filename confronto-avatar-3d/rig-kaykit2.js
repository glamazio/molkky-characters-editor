// KayKit formato 2.0 (CC0): personaggi senza clip (0,2–1,5 MB) e librerie di clip separate per scheletro.
// Stessi nomi di ossa per tutti: dentro lo stesso scheletro (medio o grande) testa, busto e gambe si mescolano.
import * as THREE from 'three';

const folder = 'modelli/kaykit2/';
export const libraries = {
  medium: ['General', 'MovementBasic', 'MovementAdvanced', 'Simulation', 'CombatMelee', 'CombatRanged', 'Tools', 'Special'].map(name => 'Rig_Medium_' + name),
  large: ['General', 'MovementBasic', 'MovementAdvanced', 'Simulation', 'CombatMelee', 'Special'].map(name => 'Rig_Large_' + name)
};

export async function loadCatalog() {
  const response = await fetch(folder + 'catalogo.json');
  if (!response.ok) throw new Error('Catalogo KayKit 2.0 non trovato');
  return response.json();
}

const bone = (scene, name) => scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
const core = { Head: 'head', ArmLeft: 'body', ArmRight: 'body', Right: 'body', Body: 'body', Chest: 'body', LegLeft: 'legs', LegRight: 'legs' };
// Gli accessori seguono la testa o il busto: cappelli, occhiali e maschere la testa; zaini, mantelli e ali il busto.
const headish = /(Hat|Helmet|Glasses|Goggles|Headband|Crown|Hood|Mask|FaceNet|Visor|Cigar|Horns|Hair|Ears|Beard)/i;

const loaded = new Map();
export function loadCharacter(gltf, entry) {
  if (!loaded.has(entry.id)) loaded.set(entry.id, gltf.loadAsync(`${folder}personaggi/${entry.id}.glb`).then(({ scene }) => {
    // Il Mannequin non ha gli innesti delle mani che le clip muovono: si aggiungono con la posa degli altri personaggi.
    for (const side of ['r', 'l']) {
      if (bone(scene, 'handslot.' + side)) continue;
      const slot = new THREE.Object3D();
      slot.name = THREE.PropertyBinding.sanitizeNodeName('handslot.' + side);
      slot.position.copy(slotFallback.position);
      slot.quaternion.copy(slotFallback.quaternion);
      bone(scene, 'hand.' + side)?.add(slot);
    }
    const parts = { head: [], body: [], legs: [], acc: [] };
    scene.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.frustumCulled = false;
      // Le mesh a più materiali arrivano divise in un gruppo di sole mesh: conta il nome del gruppo.
      const group = node.parent;
      const owner = group?.type === 'Group' && group.name && group.children.every(child => child.isMesh) ? group : node;
      const suffix = owner.name.split('_').at(-1);
      if (core[suffix]) parts[core[suffix]].push(node);
      else {
        const parentBone = owner.parent?.isBone ? owner.parent.name : '';
        const anchor = parentBone === 'head' || headish.test(owner.name) ? 'head' : 'body';
        const label = owner.name.replace(entry.id.split('_')[0] + '_', '').replace(/^[A-Za-z]+_[AB]_/, '').replace(/_/g, ' ');
        let acc = parts.acc.find(item => item.key === owner.name);
        if (!acc) parts.acc.push(acc = { key: owner.name, label, anchor, meshes: [] });
        acc.meshes.push(node);
      }
    });
    return { entry, scene, parts };
  }));
  return loaded.get(entry.id);
}

const clipSets = new Map();
// Unisce le clip delle librerie di uno scheletro, senza la T-Pose.
export function loadClips(gltf, rig) {
  if (!clipSets.has(rig)) clipSets.set(rig, Promise.all(libraries[rig].map(name => gltf.loadAsync(`${folder}animazioni/${name}.glb`)))
    .then(files => {
      const byName = new Map();
      files.forEach((file, index) => {
        const group = libraries[rig][index].replace(/^Rig_(Medium|Large)_/, '');
        for (const clip of file.animations) if (clip.name !== 'T-Pose' && !byName.has(clip.name)) byName.set(clip.name, { clip, group });
      });
      return [...byName.values()];
    }));
  return clipSets.get(rig);
}

// Il bastone va nell'innesto delle armi. Il Mannequin non ce l'ha: lo si ricrea con la posa degli altri personaggi.
const toShaft = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const slotFallback = {
  position: new THREE.Vector3(0, 0.0961, -0.0575),
  quaternion: new THREE.Quaternion(0, 0, Math.SQRT1_2, Math.SQRT1_2)
};
export function prepareGrip(scene) {
  const hand = bone(scene, 'hand.r');
  const slot = bone(scene, 'handslot.r');
  const socket = new THREE.Group();
  socket.name = 'hand.right.kaykit2';
  socket.position.copy(slot?.position ?? slotFallback.position);
  socket.quaternion.copy(slot?.quaternion ?? slotFallback.quaternion).multiply(toShaft);
  hand.add(socket);
  return { socket, apply() {}, restore() {} };
}

export const armOf = scene => ({ upper: bone(scene, 'upperarm.r'), elbow: bone(scene, 'lowerarm.r') });
