// Piccolo campo da Mölkky attorno a un personaggio: prato, linea di lancio, bastone (il mölkky) a terra,
// cassettina di legno a listelli (senza coperchio) con dentro i 12 birilli numerati, due bottiglie di birra.
// Tutto disegnato qui, senza file da scaricare: basta THREE, passato da fuori (laboratorio con import map, app con three locale).
// Misure pensate per un personaggio KayKit medio (alto 2,54 con l'elmo) all'origine, rivolto verso +z:
// per altri personaggi si scala il gruppo con altezza / 2,54. Birilli e bastone sono un po' più grandi del vero
// (proporzioni dei personaggi KayKit, testa grande). Niente numeri casuali: il campo è sempre uguale.

export function creaCampo(THREE) {
  const g = new THREE.Group();
  const mat = (color, roughness = 0.9, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const ombre = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; return b; };

  // ---- prato ----
  const prato = new THREE.Mesh(new THREE.CircleGeometry(3.4, 48), mat('#3a6b2f', 1));
  prato.rotation.x = -Math.PI / 2; prato.receiveShadow = true; g.add(prato);
  const bordo = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.65, 48), mat('#2e5726', 1));
  bordo.rotation.x = -Math.PI / 2; bordo.position.y = -0.002; g.add(bordo);
  const ciuffo = new THREE.ConeGeometry(0.035, 0.16, 4), verde = mat('#2c5a25', 1);
  for (let i = 0; i < 70; i++) {
    const a = i * 2.399963, d = 1.0 + (i * 0.61803 % 1) * 2.3, c = new THREE.Mesh(ciuffo, verde);
    c.position.set(Math.cos(a) * d, 0.07, Math.sin(a) * d); c.rotation.z = ((i % 5) - 2) * 0.12; g.add(c);
  }

  // ---- legno chiaro (betulla) per birilli e bastone ----
  const betulla = mat('#dfbd85', 0.75), testa = mat('#ead2a4', 0.7);

  // ---- linea di lancio e bastone a terra ----
  g.add(box(1.4, 0.04, 0.1, mat('#b8875a'), 0, 0.02, 0.85));
  const bastone = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.34, 4, 14), betulla);
  bastone.rotation.set(0, 0.7, Math.PI / 2); bastone.position.set(-0.8, 0.06, 0.35); bastone.castShadow = bastone.receiveShadow = true; g.add(bastone);

  // ---- birillo: cilindro con la cima tagliata in obliquo e il numero sulla faccia inclinata ----
  const R = 0.062, HA = 0.36, HB = 0.29;                   // raggio, lato alto, lato basso
  const corpo = new THREE.CylinderGeometry(R, R, 1, 18, 1, false);
  const pos = corpo.attributes.position;
  for (let i = 0; i < pos.count; i++) {                    // y da -0,5..0,5 a 0..altezza, la cima scende verso +x
    const x = pos.getX(i), alto = pos.getY(i) > 0;
    pos.setY(i, alto ? HA - (x + R) / (2 * R) * (HA - HB) : 0);
  }
  corpo.computeVertexNormals();
  const pendenza = Math.atan((HA - HB) / (2 * R));
  const numeri = new Map();
  const numero = n => {                                    // faccina tonda col numero, disegnata su una tela
    if (!numeri.has(n)) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d');
      x.fillStyle = '#ead2a4'; x.beginPath(); x.arc(64, 64, 64, 0, 7); x.fill();
      x.fillStyle = '#3b2a1a'; x.font = 'bold 74px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(String(n), 64, 70);
      if (n === 6 || n === 9) x.fillRect(42, 104, 44, 7);   // sottolineato, per distinguerli
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      numeri.set(n, new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }));
    }
    return numeri.get(n);
  };
  const faccia = new THREE.CircleGeometry(R * 0.92, 24);
  const birillo = n => {
    const b = new THREE.Group();
    b.add(new THREE.Mesh(corpo, [betulla, testa, betulla]));   // gruppi del cilindro: lato, cima, fondo
    const f = new THREE.Mesh(faccia, numero(n));
    f.position.y = (HA + HB) / 2 + 0.002; f.rotation.set(-Math.PI / 2, 0, 0); f.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -pendenza);
    f.scale.set(1 / Math.cos(pendenza), 1, 1); b.add(f);   // la faccia obliqua è un'ellisse
    return ombre(b);
  };

  // ---- cassettina a listelli con i 12 birilli in piedi (4 per 3) ----
  const colonne = 4, file = 3, passo = 2 * R + 0.035;
  const W = colonne * passo + 0.09, D = file * passo + 0.09, H = 0.25;     // misure esterne
  const legno = mat('#c9a16b'), scuro = mat('#9c7442'), cassa = new THREE.Group();
  const listello = 0.075, spazio = 0.04, sp = 0.022;                       // altezza listello, fessura, spessore
  for (const y of [0.035 + listello / 2, 0.035 + listello * 1.5 + spazio]) {
    cassa.add(box(W, listello, sp, legno, 0, y, D / 2 - sp / 2), box(W, listello, sp, legno, 0, y, -D / 2 + sp / 2));
    cassa.add(box(sp, listello, D - 2 * sp, legno, W / 2 - sp / 2, y, 0), box(sp, listello, D - 2 * sp, legno, -W / 2 + sp / 2, y, 0));
  }
  for (let i = 0; i < 3; i++) cassa.add(box(W - 0.02, 0.022, (D - 0.04) / 3 - 0.012, legno, 0, 0.011, -D / 2 + 0.02 + (i + 0.5) * (D - 0.04) / 3));
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cassa.add(box(0.045, H, 0.045, scuro, x * (W / 2 - 0.0225), H / 2, z * (D / 2 - 0.0225)));
  let n = 1;
  for (let f = 0; f < file; f++) for (let c = 0; c < colonne; c++) {
    const b = birillo(n++);
    b.position.set((c - (colonne - 1) / 2) * passo, 0.022, (f - (file - 1) / 2) * passo);
    b.rotation.y = -Math.PI / 2 + ((c * 7 + f * 3) % 5 - 2) * 0.25;      // numeri verso il davanti, un po' in disordine
    cassa.add(b);
  }
  cassa.position.set(1.3, 0, -0.7); cassa.rotation.y = -0.45; g.add(cassa);

  // ---- due bottiglie di birra (vetro scuro, etichetta, tappo) ----
  const profilo = [[0, 0], [0.072, 0], [0.078, 0.01], [0.078, 0.27], [0.07, 0.31], [0.04, 0.37], [0.03, 0.42], [0.03, 0.47], [0.034, 0.48], [0.034, 0.5], [0, 0.5]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const vetro = new THREE.LatheGeometry(profilo, 20);
  const etichetta = new THREE.CylinderGeometry(0.0795, 0.0795, 0.11, 20, 1, true), collarino = new THREE.CylinderGeometry(0.0335, 0.036, 0.04, 16, 1, true);
  const tappo = new THREE.CylinderGeometry(0.036, 0.036, 0.018, 16);
  const bottiglia = () => {
    const b = new THREE.Group();
    b.add(new THREE.Mesh(vetro, mat('#4a2208', 0.25, { metalness: 0.05 })));
    const e = new THREE.Mesh(etichetta, mat('#f1e6c8', 0.8)); e.position.y = 0.16; b.add(e);
    const k = new THREE.Mesh(collarino, mat('#f1e6c8', 0.8)); k.position.y = 0.43; b.add(k);
    const t = new THREE.Mesh(tappo, mat('#d4af37', 0.35, { metalness: 0.7 })); t.position.y = 0.508; b.add(t);
    return ombre(b);
  };
  const b1 = bottiglia(); b1.scale.setScalar(0.8); b1.position.set(1.8, 0, -0.3); b1.rotation.y = 0.8; g.add(b1);
  const b2 = bottiglia(); b2.scale.setScalar(0.8); b2.position.set(1.95, 0, -0.47); b2.rotation.y = -0.4; g.add(b2);

  return g;
}
