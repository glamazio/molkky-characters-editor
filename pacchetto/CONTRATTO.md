# Contratto fra il laboratorio avatar e l'app Mölkky

Il laboratorio (`G:\Develop\Mollky\avatar engine`, repository git a parte) sperimenta e **consegna un pacchetto**. L'app (`G:\Develop\Mollky\Mollky`) lo **importa** e usa solo l'interfaccia qui sotto.

## Interfaccia (`avatar3d.js`, modulo ES)
- `monta(elemento, { colore, etichetta })` → Promise di un avatar. `colore` è il colore del giocatore nell'app.
- `avatar.gesto(nome)` → Promise risolta a fine gesto. Nomi in `manifesto.json` → `gesti` (oggi `esulta`, `morte`).
- `avatar.attacca(elemento)`: sposta la tela in un nuovo contenitore (l'app ridisegna il DOM a ogni `render()`).
- `avatar.smonta()`: ferma tutto e libera la memoria.
- `personaggi()` → `{ predefinito, personaggi: [{ id, nome }] }`; `monta(el, { personaggio })`; `avatar.cambia(id)` (Promise); `avatar.personaggio` (id attuale). Trascinando la tela in orizzontale il personaggio ruota.
- `scena(elemento, [{ personaggio, colore }], { fermaARiposo })` → più personaggi in una tela: `gesto(i, nome)`, `evidenzia(i)`, `cambia(i, id)`, `attacca`, `smonta`.
- `versione`, `gesti()`.

L'app non conosce ossa, clip, pacchetti di modelli né Three.js: si cambia base nel laboratorio senza toccare l'app, purché l'interfaccia resti questa. Ogni rilascio va scritto nel CHANGELOG. Aggiunte compatibili alzano la versione minore (0.1 → 0.2); un cambio che costringe a cambiare l'app alza la principale (1.x → 2.0).

## Pacchetto (`rilascio/<versione>/`)
- `avatar3d.js`, `three/` (Three.js locale: niente CDN nell'app), `modelli/` (solo i file scelti, solo le clip usate), `licenze/`, `CHANGELOG.md`.
- `manifesto.json`: versione, nomi di clip e gesti, licenze e lo **SHA-256 di ogni file**.
- Si crea con `npm run esporta` da `pacchetto/pacchetto.json`. Un rilascio non si riscrive: per cambiare, si alza la versione.

## Dati
- I tratti del profilo (genere, carnagione, capelli, maglia, colore) li decide l'app (`soci.profili`, `public/gioca/giocatori.js`). Il laboratorio li riceve come parametri di `monta`, non li ridefinisce.

## Nell'app
- `node scripts/importa-avatar.js "<cartella del rilascio>"` controlla gli SHA-256 del manifesto e copia in `backend/public/avatar/`.
- Il 3D si carica solo dove serve (profilo, VS), con `import()` al primo uso: carte ed elenchi restano 2D.
