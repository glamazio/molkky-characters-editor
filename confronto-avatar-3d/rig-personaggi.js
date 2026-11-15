// Personaggi Quaternius in un file unico (CC0): Ultimate Animated Character Pack e RPG Characters.
// Stesso scheletro di base (Fist.R per la mano), un personaggio alla volta, con le clip del proprio file.
import * as THREE from 'three';

const pair = (id, label) => [
  { id: id + '_Male', label: label + ' · uomo' },
  { id: id + '_Female', label: label + ' · donna' }
];

export const personaggiCatalog = {
  animati: {
    folder: 'modelli/quaternius-animati/',
    title: 'Quaternius Animated',
    entries: [
      ...pair('Casual', 'Casual'), ...pair('Casual2', 'Casual 2'), ...pair('Casual3', 'Casual 3'),
      { id: 'Casual_Bald', label: 'Casual · calvo' }, { id: 'BaseCharacter', label: 'Figura base' },
      ...pair('Suit', 'Completo'), ...pair('Worker', 'Operaio'), ...pair('Chef', 'Cuoco'), { id: 'Chef_Hat', label: 'Cuoco col cappello' },
      ...pair('Doctor', 'Medico').map(entry => ({ id: entry.id + '_Young', label: entry.label + ' giovane' })),
      ...pair('Doctor', 'Medico').map(entry => ({ id: entry.id + '_Old', label: entry.label + ' anziano' })),
      ...pair('OldClassy', 'Elegante'), ...pair('Cowboy', 'Cowboy'), ...pair('Kimono', 'Kimono'), ...pair('Viking', 'Vichingo'),
      ...pair('Pirate', 'Pirata'), ...pair('Ninja', 'Ninja'), ...pair('Knight_Golden', 'Cavaliere'),
      { id: 'Wizard', label: 'Mago' }, { id: 'Witch', label: 'Strega' }, { id: 'Elf', label: 'Elfo' }
    ],
    initial: 'Casual_Male'
  },
  rpg: {
    folder: 'modelli/quaternius-rpg/',
    title: 'Quaternius RPG',
    entries: [
      { id: 'Warrior', label: 'Guerriero' }, { id: 'Ranger', label: 'Ranger' }, { id: 'Rogue', label: 'Furfante' },
      { id: 'Cleric', label: 'Chierico' }, { id: 'Monk', label: 'Monaco' }, { id: 'Wizard', label: 'Mago' }
    ],
    initial: 'Warrior'
  }
};

// Tratti disegnati a mano per i soci della tela, copiati da Mollky/backend/public/gioca/giocatori.js:
// servono a vedere come la figura 3D riprende carnagione, capelli e maglia del profilo.
export const profiliProva = {
  Moz: { skin: '#F0C08E', hairC: '#3B2416', shirt: '#2F4B8F' },
  Mos: { skin: '#E6AE82', hairC: '#1F1A17', shirt: '#8A2D4E' },
  Dile: { skin: '#F6D1A8', hairC: '#8A4B22', shirt: '#7A3E9D' },
  Sangio: { skin: '#D9A074', hairC: '#231A14', shirt: '#234E3A' },
  Umbi: { skin: '#F3D3B5', hairC: '#D9B25A', shirt: '#35335E' },
  Giachi: { skin: '#E9B78F', hairC: '#5B2E1E', shirt: '#1F5D73' },
  Johnny: { skin: '#C98D63', hairC: '#1B1512', shirt: '#8F2D3B' },
  Katia: { skin: '#F4CBA4', hairC: '#2A1B1B', shirt: '#3E3A78' },
  Ceci: { skin: '#EBC094', hairC: '#9A9A9A', shirt: '#5A3B1E' },
  Eleonora: { skin: '#F2C9A6', hairC: '#6B3A1E', shirt: '#B04070' },
  Cami: { skin: '#E2AB80', hairC: '#E1B642', shirt: '#1E6E5E' }
};

// Il capo principale ha nomi diversi da un personaggio all'altro: si prende il primo presente.
const garments = ['Shirt', 'Main', 'Clothes', 'Jacket', 'Top', 'Armor'];
const traitOf = (name, garment) => {
  if (name === 'Skin') return 'skin';
  if (name === 'Hair' || name === 'Moustache') return 'hairC';
  if (name === garment) return 'shirt';
};

const bone = (scene, name) => scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));

// Le armi del pacchetto RPG hanno l'impugnatura sull'origine e la lunghezza lungo Z, come il bastone:
// l'innesto copia la loro posa sull'osso Weapon.R. Senza quell'osso (Animated) si parte dal pugno.
const weaponPose = {
  position: new THREE.Vector3(-0.064, 0.063, -0.039),
  quaternion: new THREE.Quaternion(0.527, -0.472, -0.527, 0.472).normalize()
};
const fistOffset = new THREE.Vector3(0.021, 0.109, 0);

export async function loadPersonaggio(gltf, base, id) {
  const { folder } = personaggiCatalog[base];
  const loaded = await gltf.loadAsync(folder + id + '.glb');
  const scene = loaded.scene;
  const weapon = bone(scene, 'Weapon.R');
  const materials = new Map();
  scene.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.frustumCulled = false;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.set(material, material.color.clone());
    }
  });
  // Bastone e scudo del pacchetto restano fuori: il camerino prova solo il bastone Mölkky.
  if (weapon) for (const child of [...weapon.children]) child.visible = false;
  const hand = weapon ?? bone(scene, 'Fist.R');
  if (!hand) throw new Error('Mano destra assente: ' + id);
  const socket = new THREE.Group();
  socket.name = 'hand.right.quaternius-pugno';
  socket.position.copy(weaponPose.position);
  if (!weapon) socket.position.add(fistOffset);
  socket.quaternion.copy(weaponPose.quaternion);
  hand.add(socket);
  const clip = name => loaded.animations.find(item => item.name === name);
  const names = [...materials.keys()].map(material => material.name);
  const garment = garments.find(name => names.includes(name));
  return {
    scene,
    clips: { idle: clip('Idle'), cheer: clip('Victory') },
    grip: { socket, apply() {}, restore() {} },
    arm: { upper: bone(scene, 'UpperArm.R'), elbow: bone(scene, 'LowerArm.R') },
    // Applica carnagione, capelli e maglia del profilo; senza profilo torna ai colori del pacchetto.
    recolor(profile) {
      const tinted = [];
      for (const [material, original] of materials) {
        const trait = traitOf(material.name, garment);
        if (profile && trait && !material.map) {
          material.color.set(profile[trait]);
          tinted.push(material.name);
        } else material.color.copy(original);
      }
      return tinted;
    },
    textured: [...materials.keys()].some(material => material.map),
    dispose() {
      scene.traverse(node => {
        if (!node.isMesh) return;
        node.geometry.dispose();
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
          material.map?.dispose();
          material.dispose();
        }
      });
    }
  };
}
