// Prese compatibili con lo scheletro Ultimate Modular Men di Quaternius.
import * as THREE from 'three';

const profiles = {
  'cilindrica-55': {
    palmFraction: 0.651,
    clearance: 0.0622,
    tilt: 0.105,
    curls: {
      Index2R: 66.2, Index3R: 50.7,
      Middle2R: 66.6, Middle3R: 61.2,
      Ring2R: 73.1, Ring3R: 16.2,
      Pinky2R: 70.4, Pinky3R: 55.7,
      Thumb2R: -36.6
    }
  }
};

const point = bone => bone.getWorldPosition(new THREE.Vector3());

// Calcola attacco e posa una volta, dalla posa di riferimento del rig.
export function prepareGrip(body, socketName, profileName) {
  const profile = profiles[profileName];
  if (socketName !== 'hand.right' || !profile) throw new Error('Presa non supportata: ' + profileName);
  const bone = name => {
    const node = body.getObjectByName(name);
    if (!node) throw new Error('Osso della mano assente: ' + name);
    return node;
  };
  return createCylindricalGrip(
    { wrist: bone('WristR'), middle: bone('Middle2R'), index: bone('Index2R'), pinky: bone('Pinky2R') },
    Object.entries(profile.curls).map(([name, degrees]) => [bone(name), degrees]),
    profile
  );
}

export function createCylindricalGrip({ wrist, middle, index, pinky }, curls, profile) {
  const wristPosition = point(wrist);
  const knuckle = point(middle);
  const fingers = knuckle.clone().sub(wristPosition).normalize();
  const across = point(index).sub(point(pinky)).normalize();
  const inward = new THREE.Vector3().crossVectors(across, fingers).normalize();
  const curlAxis = new THREE.Vector3().crossVectors(fingers, inward).normalize();
  const socket = new THREE.Group();
  socket.name = 'hand.right.cilindrica-55';
  socket.position.copy(wristPosition).lerp(knuckle, profile.palmFraction).addScaledVector(inward, profile.clearance);
  const shaftAxis = across.clone().addScaledVector(fingers, profile.tilt).normalize();
  // Assi dell'innesto: Z lungo il cilindro, Y verso l'uscita dal palmo.
  const side = new THREE.Vector3().crossVectors(inward, shaftAxis).normalize();
  const palmExit = new THREE.Vector3().crossVectors(shaftAxis, side);
  socket.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, palmExit, shaftAxis));
  wrist.attach(socket);

  const joints = curls.map(([joint, degrees]) => {
    const axis = curlAxis.clone().applyQuaternion(joint.getWorldQuaternion(new THREE.Quaternion()).invert());
    const bend = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(degrees));
    return {
      joint,
      closed: joint.quaternion.clone().multiply(bend),
      animated: new THREE.Quaternion()
    };
  });
  let applied = false;
  return {
    socket,
    apply(amount = 1) {
      if (applied) return;
      for (const { joint, closed, animated } of joints) {
        animated.copy(joint.quaternion);
        joint.quaternion.slerp(closed, amount);
      }
      applied = true;
    },
    restore() {
      if (!applied) return;
      for (const { joint, animated } of joints) joint.quaternion.copy(animated);
      applied = false;
    }
  };
}
