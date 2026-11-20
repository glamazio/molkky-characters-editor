import * as THREE from 'three';

// Punto iniziale di prova, non punto di contatto validato: usa la posizione
// dell'osso hips alla fine della clip, nel sistema locale del personaggio.
export function stimaSeduta({group, object, mixer, action, duration}) {
  action.reset().play(); mixer.setTime(Math.max(0, duration - 0.001));
  group.updateWorldMatrix(true, true);
  const hips = object.getObjectByName('hips');
  if (!hips) throw Error('Osso hips non trovato');
  return group.worldToLocal(hips.getWorldPosition(new THREE.Vector3()));
}
