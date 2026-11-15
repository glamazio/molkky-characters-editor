// Lancio sottomano del Mölkky per lo scheletro KayKit (ossa upperarm.r, lowerarm.r, spine…).
// Il braccio oscilla come un pendolo nel piano del tiro; il bastone segue la mano fino al rilascio, poi vola da solo.
// «horizontal»: impugnato al centro, di traverso al tiro, rotola sul proprio asse.
// «baguette»: impugnato a un'estremità, in linea con l'avambraccio, si ribalta in avanti in volo.
import * as THREE from 'three';

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const deg = THREE.MathUtils.degToRad;

// Tempo, oscillazione del braccio (negativa = in avanti), flessione del gomito, busto in avanti, rotazione del busto,
// braccio verso il fianco (le braccia KayKit a riposo sono larghe).
const keys = [
  [0.00, 0, 4, 0, 0, 0],
  [0.34, -40, 12, 6, 0, 14],     // mira: bastone davanti, verso i birilli
  [0.62, -40, 12, 6, 0, 14],
  [1.02, 78, 16, 18, -14, 16],   // caricamento: braccio ben dietro, busto piegato e girato
  [1.24, -35, 6, 14, 6, 16],     // rilascio poco davanti al fianco
  [1.52, -105, 14, 4, 12, 10],   // accompagnamento verso l'alto
  [2.35, 0, 4, 0, 0, 0]
];
export const release = 1.24;

// Posizioni di partenza. Misure in lunghezze di gamba (anca → caviglia); il piede sinistro è quello d'appoggio,
// opposto al braccio destro che tira. lean/side/swing in gradi si sommano al gesto (chinati il braccio va più avanti,
// così il bastone non tocca terra).
export const stances = {
  dritto: { label: 'Dritto in piedi', drop: 0, shift: [0, 0], front: [0, 0, 0], back: [0, 0, 0], toe: 0, lean: 0, side: 0, swing: 0 },
  arcuato: { label: 'In piedi, busto arcuato', drop: 0.03, shift: [0.09, 0], front: [0.03, 0, 0.06], back: [-0.03, 0, -0.04], toe: 0, lean: 6, side: 16, swing: 0 },
  affondo: { label: 'Chinato in affondo', drop: 0.36, shift: [0.05, 0.1], front: [0.06, 0, 0.5], back: [-0.03, 0.1, -0.8], toe: 35, lean: 26, side: 4, swing: -18 }
};
// La posizione si prende durante la mira e si lascia dopo l'accompagnamento.
const stanceWeight = time => THREE.MathUtils.smoothstep(time, 0, 0.32) * (1 - THREE.MathUtils.smoothstep(time, 1.85, 2.35));

function sample(time) {
  const next = keys.findIndex(key => key[0] > time);
  if (next < 0) return keys.at(-1).slice(1);
  if (next === 0) return keys[0].slice(1);
  const a = keys[next - 1];
  const b = keys[next];
  const k = THREE.MathUtils.smoothstep(time, a[0], b[0]);
  return a.slice(1).map((value, index) => THREE.MathUtils.lerp(value, b[index + 1], k));
}

const bone = (scene, name) => scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));

function setWorldRotation(node, rotation) {
  const parent = node.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  node.quaternion.multiplyQuaternions(parent, rotation);
  node.updateMatrixWorld(true);
}

// Misure del bastone nel suo spazio: estremità lungo Z e raggio.
export function measureStick(stick) {
  const probe = stick.clone();
  probe.position.set(0, 0, 0);
  probe.quaternion.identity();
  probe.scale.setScalar(1);
  probe.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(probe);
  return { zMin: box.min.z, zMax: box.max.z, radius: Math.max(box.max.x - box.min.x, box.max.y - box.min.y) / 2 };
}

// Prepara il gesto sulla posa attuale (di riposo). Il bastone deve stare già nella scena, non nella mano.
export function prepareKaykitThrow(scene, stick, style, stanceName = 'dritto') {
  const stance = stances[stanceName] ?? stances.dritto;
  const upper = bone(scene, 'upperarm.r');
  const lower = bone(scene, 'lowerarm.r');
  const wrist = bone(scene, 'wrist.r');
  const slot = bone(scene, 'handslot.r') ?? bone(scene, 'hand.r');
  const spine = bone(scene, 'spine');
  const other = bone(scene, 'upperarm.l');
  const hips = bone(scene, 'hips');
  // Gambe: [anca, ginocchio, caviglia]; la sinistra è d'appoggio (davanti), la destra resta dietro.
  const legs = ['l', 'r'].map(side => {
    const chain = ['upperleg', 'lowerleg', 'foot'].map(name => bone(scene, `${name}.${side}`));
    const [a, b, c] = chain.map(node => node.getWorldPosition(new THREE.Vector3()));
    return { chain, front: side === 'l', ankle: c, thigh: a.distanceTo(b), shin: b.distanceTo(c), foot: chain[2].getWorldQuaternion(new THREE.Quaternion()) };
  });
  const leg = legs[0].thigh + legs[0].shin;
  const moved = [hips, spine, upper, lower, other, ...legs.flatMap(item => item.chain)];
  const start = moved.map(node => node.quaternion.clone());
  const hipsStart = hips.position.clone();
  const hipsRest = hips.getWorldPosition(new THREE.Vector3());
  const restSpine = spine.getWorldQuaternion(new THREE.Quaternion());
  const size = measureStick(stick);
  const scale = stick.getWorldScale(new THREE.Vector3()).x;
  const q = new THREE.Quaternion();
  const twist = new THREE.Quaternion();
  const elbow = new THREE.Vector3();
  const hand = new THREE.Vector3();
  const along = new THREE.Vector3();
  const across = new THREE.Quaternion().setFromAxisAngle(Y, Math.PI / 2);

  function restore() {
    moved.forEach((node, index) => node.quaternion.copy(start[index]));
    hips.position.copy(hipsStart);
    hips.updateMatrixWorld(true);
  }

  // Ruota un osso (in coordinate del mondo) perché la direzione verso il figlio punti a «to».
  const from = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const base = new THREE.Vector3();
  function point(node, child, to) {
    node.getWorldPosition(base);
    from.subVectors(child.getWorldPosition(from), base);
    aim.subVectors(to, base);
    node.getWorldQuaternion(q);
    setWorldRotation(node, q.premultiply(twist.setFromUnitVectors(from.normalize(), aim.normalize())));
  }

  // IK a due ossa: caviglia sul bersaglio, ginocchio verso l'avanti (+Z).
  const target = new THREE.Vector3();
  const hip = new THREE.Vector3();
  const knee = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const pole = new THREE.Vector3();
  function placeLeg(item, weight) {
    const [thighBone, shinBone, footBone] = item.chain;
    const offset = item.front ? stance.front : stance.back;
    target.set(offset[0], offset[1], offset[2]).multiplyScalar(leg * weight).add(item.ankle);
    thighBone.getWorldPosition(hip);
    const reach = Math.min(hip.distanceTo(target), (item.thigh + item.shin) * 0.999);
    dir.subVectors(target, hip).normalize();
    pole.copy(Z).addScaledVector(dir, -dir.dot(Z)).normalize();
    const cos = THREE.MathUtils.clamp((item.thigh ** 2 + reach ** 2 - item.shin ** 2) / (2 * item.thigh * reach), -1, 1);
    knee.copy(hip).addScaledVector(dir, item.thigh * cos).addScaledVector(pole, item.thigh * Math.sqrt(1 - cos * cos));
    point(thighBone, shinBone, knee);
    point(shinBone, footBone, target);
    // Piede piatto a terra; quello dietro poggia sulla punta, col tallone alzato.
    q.copy(item.foot);
    if (!item.front) q.premultiply(twist.setFromAxisAngle(X, deg(stance.toe * weight)));
    setWorldRotation(footBone, q);
  }

  // Il bastone segue la mano: al centro e di traverso, oppure tenuto per un'estremità lungo l'avambraccio.
  function holdStick() {
    slot.getWorldPosition(hand);
    if (style === 'baguette') {
      lower.getWorldPosition(elbow);
      wrist.getWorldPosition(along).sub(elbow).normalize();
      stick.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), along);
      // L'estremità vicina (zMin) sta nel pugno, con un margine; il resto del bastone prosegue il braccio.
      const grip = -size.zMin * scale - (size.zMax - size.zMin) * scale * 0.1;
      stick.position.copy(hand).addScaledVector(along, grip);
    } else {
      stick.quaternion.copy(across);
      stick.position.copy(hand);
    }
  }

  return {
    release,
    size,
    scale,
    restore,
    pose(time, holding) {
      restore();
      const [swing, bend, lean, turn, inward] = sample(time);
      // Bacino: si abbassa e si sposta secondo la posizione; poi le gambe ritrovano i piedi a terra.
      const weight = stanceWeight(time);
      aim.set(stance.shift[0] * leg * weight, -stance.drop * leg * weight, stance.shift[1] * leg * weight).add(hipsRest);
      hips.position.copy(hips.parent.worldToLocal(aim));
      hips.updateMatrixWorld(true);
      legs.forEach(item => placeLeg(item, weight));
      twist.setFromEuler(new THREE.Euler(deg(lean + stance.lean * weight), deg(turn), deg(stance.side * weight), 'YXZ'));
      setWorldRotation(spine, q.copy(restSpine).premultiply(twist));
      // Prima il braccio verso il fianco (asse verticale del tiro), poi l'oscillazione a pendolo.
      upper.getWorldQuaternion(q);
      q.premultiply(twist.setFromAxisAngle(Z, deg(inward)));
      setWorldRotation(upper, q.premultiply(twist.setFromAxisAngle(X, deg(swing + stance.swing * weight))));
      // Il braccio sinistro oscilla poco e al contrario, per l'equilibrio.
      other.getWorldQuaternion(q);
      setWorldRotation(other, q.premultiply(twist.setFromAxisAngle(X, -deg(swing) * 0.35)));
      lower.getWorldQuaternion(q);
      setWorldRotation(lower, q.premultiply(twist.setFromAxisAngle(X, -deg(bend))));
      if (holding) holdStick();
    }
  };
}

// Volo: parabola in avanti, rotazione propria, atterraggio e breve scivolata fino a restare di piatto.
export function prepareFlight(stick, style, size, scale) {
  const start = stick.position.clone();
  const startRotation = stick.quaternion.clone();
  const velocity = new THREE.Vector3(0, 2.0, 4.0);
  const gravity = 9.81;
  const radius = size.radius * scale;
  // Baguette: si ribalta in avanti (asse laterale). Orizzontale: rotola sul proprio asse, che è già laterale.
  const spin = style === 'baguette' ? -2 * Math.PI * 1.35 : -2 * Math.PI * 2.2;
  const landing = (velocity.y + Math.sqrt(velocity.y ** 2 + 2 * gravity * Math.max(0, start.y - radius))) / gravity;
  const spinRotation = new THREE.Quaternion();
  let landed;
  return elapsed => {
    const time = Math.min(elapsed, landing);
    stick.position.copy(start).addScaledVector(velocity, time);
    stick.position.y = Math.max(radius, start.y + velocity.y * time - gravity * time ** 2 / 2);
    spinRotation.setFromAxisAngle(X, spin * time);
    stick.quaternion.copy(startRotation).premultiply(spinRotation);
    if (elapsed < landing) return false;
    // A terra: scivola ancora un poco e si adagia con l'asse orizzontale.
    landed ??= (() => {
      const axis = new THREE.Vector3(0, 0, 1).applyQuaternion(stick.quaternion);
      axis.y = 0;
      if (axis.lengthSq() < 1e-4) axis.set(0, 0, 1);
      axis.normalize();
      return { from: stick.quaternion.clone(), to: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis), position: stick.position.clone() };
    })();
    const settle = Math.min(1, (elapsed - landing) / 0.35);
    const ease = 1 - (1 - settle) ** 2;
    stick.position.copy(landed.position);
    stick.position.z += velocity.z * 0.12 * ease;
    stick.position.y = radius;
    stick.quaternion.slerpQuaternions(landed.from, landed.to, ease);
    return settle === 1;
  };
}
