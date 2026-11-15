// Gesto di lancio sotto mano, applicato sopra una posa del rig Quaternius.
import * as THREE from 'three';

export const releaseTime = 1.12;
export const throwDuration = 2.16;
export const gripClosure = elapsed => 1 - THREE.MathUtils.smoothstep(elapsed, 0, 0.075);
const poses = [
  // Tempo, oscillazione della spalla, apertura laterale, flessione del gomito, orientamento del polso.
  [0, 0, 0, 0, 0],
  [0.23, 0.06, -0.56, 0.02, 0.02],
  [0.62, 0.85, -0.91, 0.13, 0.28],
  [0.82, 0.57, -0.91, 0.09, 0.55],
  [releaseTime, -0.99, -0.39, -0.18, 1],
  [1.39, -1.31, -0.31, -0.24, 1],
  [throwDuration, 0, 0, 0, 0]
];
const xAxis = new THREE.Vector3(1, 0, 0);

function samplePose(time) {
  const next = poses.findIndex(pose => pose[0] > time);
  if (next < 0) return poses.at(-1).slice(1);
  const a = poses[next - 1];
  const b = poses[next];
  const progress = THREE.MathUtils.smoothstep(time, a[0], b[0]);
  return a.slice(1).map((value, index) => THREE.MathUtils.lerp(value, b[index + 1], progress));
}

function aimSocket(style, initialOrientation, settings) {
  const along = style === 'baguette' ? new THREE.Vector3(0, 0.08, 1) : new THREE.Vector3(1, 0, 0);
  along.normalize();
  const defaultExit = style === 'baguette' ? [1.2, 1, 0.12] : [0, 0.46, 0.89];
  const exit = new THREE.Vector3(...(settings.exit?.[style] ?? defaultExit));
  // Il cilindro può puntare in entrambi i versi. Scegli il verso più naturale per il polso.
  const target = direction => {
    const side = new THREE.Vector3().crossVectors(exit, direction).normalize();
    const palm = new THREE.Vector3().crossVectors(direction, side);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, palm, direction));
  };
  const a = target(along);
  const b = target(along.negate());
  return initialOrientation.angleTo(a) < initialOrientation.angleTo(b) ? a : b;
}

export function prepareThrow({ upper, elbow }, grip, style, settings = {}) {
  const wrist = grip.socket.parent;
  if (!upper || !elbow || !wrist) throw new Error('Braccio di lancio assente dal rig');
  const bones = [upper, elbow, wrist];
  const start = bones.map(bone => bone.quaternion.clone());
  const socketAim = aimSocket(style, grip.socket.getWorldQuaternion(new THREE.Quaternion()), settings);
  const wristAim = socketAim.multiply(grip.socket.quaternion.clone().invert());
  const current = new THREE.Quaternion();
  const parentRotation = new THREE.Quaternion();
  const twist = new THREE.Quaternion();
  const euler = new THREE.Euler();

  function setWorldRotation(bone, rotation) {
    bone.parent.getWorldQuaternion(parentRotation);
    bone.quaternion.multiplyQuaternions(parentRotation.invert(), rotation);
    bone.updateWorldMatrix(false, false);
  }

  function restore() {
    bones.forEach((bone, index) => bone.quaternion.copy(start[index]));
  }

  return {
    restore,
    pose(time) {
      restore();
      const [swing, open, flex, aim] = samplePose(time);
      upper.getWorldQuaternion(current);
      twist.setFromEuler(euler.set(swing, 0, open));
      setWorldRotation(upper, current.premultiply(twist));
      elbow.getWorldQuaternion(current);
      twist.setFromAxisAngle(xAxis, flex);
      setWorldRotation(elbow, current.premultiply(twist));
      wrist.getWorldQuaternion(current);
      setWorldRotation(wrist, current.slerp(wristAim, aim));
    }
  };
}

// Il bastone parte dalla trasformazione esatta dell'innesto al rilascio.
export function prepareFlight(model) {
  const start = model.position.clone();
  const exit = new THREE.Vector3(0, 1, 0).applyQuaternion(model.quaternion);
  const shaftY = Math.abs(new THREE.Vector3(0, 0, 1).applyQuaternion(model.quaternion).y);
  const upSpeed = 1.85;
  const gravity = 9.81;
  const ground = 0.028 * Math.sqrt(1 - shaftY ** 2) + 0.125 * shaftY - 0.009;
  const landingTime = (upSpeed + Math.sqrt(upSpeed ** 2 + 2 * gravity * (start.y - ground))) / gravity;
  return elapsed => {
    // Raccorda il distacco alla traiettoria mentre le dita iniziano ad aprirsi.
    const transition = 0.03;
    const travel = elapsed - transition * (1 - Math.exp(-elapsed / transition));
    const time = Math.min(travel, landingTime);
    model.position.copy(start);
    model.position.z += 2.65 * time;
    model.position.y = Math.max(ground, start.y + upSpeed * time - gravity * time ** 2 / 2);
    // La prima spinta è nella direzione in cui si apre il palmo.
    const separation = 0.025 * (1 - Math.exp(-time / 0.035)) * (1 - time / landingTime);
    model.position.addScaledVector(exit, separation);
    return travel >= landingTime;
  };
}
