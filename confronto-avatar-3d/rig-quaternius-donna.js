// Ultimate Modular Women (Quaternius, CC0). Ogni GLB è un personaggio completo con testa, busto, gambe e piedi
// separati: le parti di personaggi diversi si combinano perché tutti condividono lo stesso scheletro.
// Dopo il caricamento le ossa si chiamano come nel rig maschile (WristR, Index2R…), quindi la presa è la stessa.

export const donnaCatalog = [
  { id: 'casual', label: 'Casual' },
  { id: 'adventurer', label: 'Avventuriera' },
  { id: 'formal', label: 'Elegante' },
  { id: 'suit', label: 'Completo' },
  { id: 'worker', label: 'Da lavoro' },
  { id: 'punk', label: 'Punk' },
  { id: 'medieval', label: 'Medievale' },
  { id: 'soldier', label: 'Divisa' },
  { id: 'scifi', label: 'Fantascienza' },
  { id: 'witch', label: 'Strega' }
];

const slots = ['head', 'body', 'legs', 'feet'];
// Una mesh con più materiali arriva divisa in primitive: «Casual_Body» diventa «Casual_Body_1», «Casual_Body_2»…
const slotOf = name => ({ Head: 'head', Body: 'body', Legs: 'legs', Feet: 'feet' })[/_(Head|Body|Legs|Feet)(_\d+)?$/.exec(name)?.[1]];

export async function loadDonna(gltf) {
  const loaded = await Promise.all(donnaCatalog.map(entry => gltf.loadAsync(`modelli/quaternius-donna/${entry.id}.glb`)));
  const outfits = {};
  donnaCatalog.forEach(({ id }, index) => {
    const scene = loaded[index].scene;
    const parts = { head: [], body: [], legs: [], feet: [], extra: [] };
    scene.traverse(node => {
      if (!node.isMesh) return;
      // Spada e pistola di alcuni personaggi restano nascoste: il camerino prova solo il bastone.
      parts[slotOf(node.name) ?? 'extra'].push(node);
    });
    outfits[id] = { scene, parts };
  });
  const idle = loaded[0].animations.find(clip => /\|Idle$/.test(clip.name));
  if (!idle) throw new Error('Clip Idle assente dal pacchetto femminile');
  return {
    outfits,
    scenes: Object.values(outfits).map(outfit => outfit.scene),
    idle,
    // Testa, busto e gambe dalle scelte; i piedi seguono le gambe.
    apply(options, visible) {
      for (const [id, { parts }] of Object.entries(outfits)) {
        const chosen = { head: 'whead', body: 'wbody', legs: 'wlegs', feet: 'wlegs' };
        for (const slot of slots) for (const mesh of parts[slot]) mesh.visible = visible && options.get(chosen[slot]) === id;
        for (const mesh of parts.extra) mesh.visible = false;
      }
    }
  };
}
