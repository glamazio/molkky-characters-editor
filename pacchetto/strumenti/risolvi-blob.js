// Prototipo di associazione: per ora unicamente il manichino medium.
// Dati assenti o non compatibili non sono sostituiti da un blob di un'altra clip.
const key = (animation, character) => `blob-scena:${animation.id}:${character}`;
export function blobCompatibile(data, animation, character) {
  return !!data && data.versione === 1 && data.clip === animation?.clip && data.personaggio === character &&
    Number.isFinite(data.passo) && data.passo > 0 && data.passo <= 1 && Array.isArray(data.celle) &&
    data.celle.length > 0 && data.celle.length <= 100000 && data.celle.every(c => Array.isArray(c) && c.length === 3 && c.every(n => Number.isInteger(n) && Math.abs(n) <= 10000));
}
export async function risolviBlob(animation, character) {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(key(animation, character)) || 'null'); } catch (e) { console.warn('Blob locale non disponibile', e); }
  if (blobCompatibile(data, animation, character)) return { data, fonte: 'browser' };
  if (animation.blob) { const response = await fetch(animation.blob); if (response.ok) { data = await response.json(); if (blobCompatibile(data, animation, character)) return { data, fonte: 'libreria' }; } }
  return null;
}
export function memorizzaBlob(data, animation, character) {
  if (!blobCompatibile(data, animation, character)) throw Error('Blob non compatibile con questa clip e questo personaggio.');
  localStorage.setItem(key(animation, character), JSON.stringify(data));
}
