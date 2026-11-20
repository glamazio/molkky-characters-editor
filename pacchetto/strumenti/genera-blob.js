import * as THREE from 'three';

// Prototipo isolato: riempie il bounding box di ciascuna mesh del manichino
// a ogni posa. L'unione di scatole piene è prudenziale e non è una voxelizzazione
// esatta della superficie. Coordinate locali rispetto al gruppo del personaggio.
export async function generaBlob({ object, mixer, action, duration, clip, step = .12, fps = 30, margin = .05, progress = () => {} }) {
  const meshes = [];
  object.traverse(o => { if (o.isSkinnedMesh && o.geometry.attributes.position) meshes.push(o); });
  if (!meshes.length) throw new Error('Nessuna mesh animata nel manichino');
  const inverse = new THREE.Matrix4(), vertex = new THREE.Vector3(), matrix = new THREE.Matrix4();
  const cells = new Set(); const count = Math.ceil(duration * fps);
  for (let frame = 0; frame <= count; frame++) {
    action.reset().play(); mixer.setTime(Math.min(frame / fps, duration));
    object.updateWorldMatrix(true, true); inverse.copy(object.parent.matrixWorld).invert();
    for (const mesh of meshes) {
      mesh.skeleton.update(); matrix.multiplyMatrices(inverse, mesh.matrixWorld);
      const box = new THREE.Box3();
      for (let i=0; i<mesh.geometry.attributes.position.count; i++) {
        mesh.getVertexPosition(i, vertex); box.expandByPoint(vertex.applyMatrix4(matrix));
      }
      box.expandByScalar(margin);
      const min = box.min.clone().divideScalar(step).floor(), max = box.max.clone().divideScalar(step).floor();
      for(let x=min.x;x<=max.x;x++) for(let y=min.y;y<=max.y;y++) for(let z=min.z;z<=max.z;z++) cells.add(`${x},${y},${z}`);
    }
    if (frame % 5 === 0) { progress(frame, count); await new Promise(resolve => setTimeout(resolve, 0)); }
  }
  action.reset().play(); mixer.setTime(0);
  return { versione:1, metodo:'unione-scatole-piene-per-mesh', personaggio:'Mannequin_Medium', clip, fps, passo:step, margine:margin, celle:[...cells].map(key=>key.split(',').map(Number)) };
}
