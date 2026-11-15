// Adattatore per lo scheletro umanoide del VRM dimostrativo usato da VerseEngine.
import * as THREE from 'three';
import { createCylindricalGrip } from './presa-quaternius.js';

const cylindrical55 = {
  palmFraction: 0.735,
  clearance: 0.0581,
  tilt: 0.210,
  curls: {
    rightIndexProximal: 35, rightIndexIntermediate: 42.4, rightIndexDistal: 19.6,
    rightMiddleProximal: 35, rightMiddleIntermediate: 60.9, rightMiddleDistal: 14.7,
    rightRingProximal: 47, rightRingIntermediate: 33.9, rightRingDistal: 36.5,
    rightLittleProximal: 48.6, rightLittleIntermediate: 41.4,
    rightThumbMetacarpal: -21.2, rightThumbProximal: 35.6
  }
};

// La rotazione del polso libera il bordo della manica nel lancio longitudinale.
export const verseThrowSettings = { exit: { baguette: [-1.3, 1, 0.1] } };

export function prepareVerseGrip(bone, profile) {
  if (profile !== 'cilindrica-55') throw new Error('Presa VRM non supportata: ' + profile);
  const hand = {
    wrist: bone('rightHand'),
    middle: bone('rightMiddleProximal'),
    index: bone('rightIndexProximal'),
    pinky: bone('rightLittleProximal')
  };
  const curls = Object.entries(cylindrical55.curls).map(([name, degrees]) => [bone(name), degrees]);
  return createCylindricalGrip(hand, curls, cylindrical55);
}

export function relaxVerseArms(bone) {
  const axis = new THREE.Vector3(0, 0, 1);
  for (const [side, angle] of [['right', 1.31], ['left', -1.36]]) {
    const upper = bone(side + 'UpperArm');
    const parent = upper.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    const rotation = upper.getWorldQuaternion(new THREE.Quaternion());
    rotation.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, angle));
    upper.quaternion.multiplyQuaternions(parent, rotation);
  }
}

// Personaggi VRM provabili nel camerino. 100Avatars di Polygonal Mind: CC0 nei metadati di ogni file.
export const verseCatalog = [
  { id: 'demo', label: 'Demo pixiv', file: 'modelli/verse.vrm', license: 'Modello dimostrativo © 2022 pixiv Inc., VRM Public License 1.0. Solo per la prova.' },
  ...['003_Jimmy', '004_OldMoustache', '008_Hugo', '012_Chill', '038_Kate', '047_David', '050_Samuela', '052_Jennifer',
    '053_Erika', '054_Lydia', '056_Olivia', '069_Kyle', '070_Robert', '072_Mikel', '074_Baldman', '079_Chad']
    .map(name => ({
      id: name,
      label: name.slice(4).replace(/([a-z])([A-Z])/g, '$1 $2'),
      file: 'modelli/100avatars/' + name + '.vrm',
      license: `100Avatars n. ${name.slice(0, 3)} di Polygonal Mind, CC0 1.0 (licenza scritta nei metadati del file VRM).`
    }))
];

let animationsReady;
export async function loadVerseAvatar(renderer, file = 'modelli/verse.vrm') {
  const { createAvatar, preLoadAnimationData } = await import('three-avatar');
  animationsReady ??= preLoadAnimationData({});
  await animationsReady;
  const response = await fetch(file);
  if (!response.ok) throw new Error('Modello VRM non trovato');
  const avatar = await createAvatar(new Uint8Array(await response.arrayBuffer()), renderer, false);
  avatar.object3D.rotateY(Math.PI);
  const humanoid = avatar.vrm.humanoid;
  humanoid.autoUpdateHumanBones = false;
  const bone = name => {
    const result = humanoid.getRawBoneNode(name);
    if (!result) throw new Error('Osso VRM assente: ' + name);
    return result;
  };
  return { avatar, bone };
}
