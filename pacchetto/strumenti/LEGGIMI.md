# Strumenti del laboratorio

## Aprire gli strumenti

```
npm run strumenti
```

Il comando avvia `servi.mjs`, un piccolo server che serve la cartella del laboratorio **solo su questo PC** (127.0.0.1, porta 3202; un'altra porta con `PORTA=...`). Si chiude con Ctrl+C. Le pagine vanno aperte da lì, non come file: devono caricare i modelli e three.js da `node_modules`.

Il server risponde solo a file dentro il laboratorio e a una rotta, `GET /elenco-sorgenti`. Questa restituisce i pacchetti da cui si può riadattare, con nome, licenza e file GLB (elenco `PACCHETTI` in `servi.mjs`; per aggiungere un pacchetto basta una riga lì).

## Riadatta una clip

Pagina: http://127.0.0.1:3202/pacchetto/strumenti/riadatta.html (`riadatta.html`).

Prende un'animazione da un altro pacchetto e la porta su uno scheletro KayKit 2.0. Il risultato è un file `Rig_<Medium|Large>_<Nome>.glb` da mettere in `pacchetto/clip/`; da lì `esporta.mjs` lo unisce alle clip KayKit del pacchetto per l'app. La clip vale per **tutti i personaggi dello stesso scheletro** (medio o grande), non solo per quello scelto per la prova.

### Pacchetti sorgente

Tutti CC0. Fonti, SHA-256 e clip sono in `FONTI.md`, sezione «Animazioni da riadattare».

| Pacchetto | Cartella | Clip | Note |
|---|---|---|---|
| Universal Animation Library 1 e 2 (Standard) | `quaternius-ual/` | 43 + 43 | Il più ricco: seduto, braccia conserte, sì/no, ballo, colpi, cadute. Riferimento a T. |
| Animated Robot (RobotExpressive) | `quaternius-robot/` | 14 | Gesti del pubblico: ThumbsUp, Wave, Yes, No, Dance. |
| Ultimate Animated Character Pack | `quaternius-animati/` | 16-17 | Defeat (da qui la «Delusione»), Death, PickUp, SitDown… |
| Ultimate Modular Women | `quaternius-donna/` | 24 | Wave, Interact, Kick, HitRecieve… |
| RPG Characters | `quaternius-rpg/` | 11-14 | |
| Ultimate Monsters (solo «Big») | `quaternius-mostri/` | 14 | Yes, No, Wave, Duck. Mani senza polso: le mani non si muovono. |
| KayKit Adventurers/Skeletons 1.0 | `kaykit/` | 76 | Stessi nomi di ossa dei 2.0; alcune clip (Cheer, Lie_*) non ci sono nelle librerie 2.0. |

Esclusi: i mostri Blob e volanti (niente gambe), l'omino KayKit Animations 1.2 (6 ossa), i 100avatars e verse (scheletro umano ma nessuna clip).

### I campi

- **Personaggio sorgente**: il file da cui si prende la clip, raggruppato per pacchetto. Le sue clip riempiono la tendina accanto; a sinistra, sotto, l'originale si muove nel suo pacchetto.
- **Clip della sorgente**: l'animazione da copiare (il prefisso `CharacterArmature|` dei file Quaternius non si mostra).
- **Personaggio KayKit**: quello su cui si prova; conta il suo scheletro (medio o grande, scritto fra parentesi).
- **Riposo della sorgente** e **Posa di partenza KayKit**: le due pose che si considerano «uguali». Da lì in poi ogni rotazione della sorgente diventa la stessa rotazione sul KayKit. Si scelgono da sole:
  - se la sorgente ha un'Idle neutra (`Idle`, `Idle_Loop`): Idle della sorgente con **Idle_A** di KayKit. La clip parte dal riposo vero del personaggio.
  - se non c'è ma c'è una posa a T (UAL: `A_TPose`): posa a T con la **T-Pose** di KayKit.
  - altrimenti: primo fotogramma della clip con Idle_A. Va bene per i gesti che partono in piedi (Defeat), ma una clip che parte già da una posa (seduto, braccia conserte) la perderebbe.
  - Si possono cambiare a mano: cambiando il riposo, la posa KayKit si riallinea (a T con a T, riposo con riposo). «Posa di legatura» usa la posa in cui la pelle è stata attaccata alle ossa: serve solo per prove.
- **Nome della clip nuova**: lettere, cifre e `_`. È il nome che si scrive in `pacchetto.json` e il nome del file.

### I pulsanti e le viste

- **Riadatta**: calcola la clip a 30 fotogrammi al secondo. Poi mostra:
  - il personaggio KayKit che la ripete a ciclo (trascinando lo si gira);
  - quattro istanti fermi (10%, 40%, 70%, fine);
  - gli abbinamenti delle ossa trovati;
  - la **riga pronta per `pacchetto/clip/FONTI.md`**, con pacchetto, file, clip, licenza e riferimenti usati.
- **Ambiente** (casella accanto ai pulsanti, ricordata nel browser): attorno ai personaggi in movimento mette un piccolo campo da Mölkky: prato, linea di lancio, il mölkky a terra, una cassettina di legno a listelli senza coperchio con i 12 birilli numerati in piedi (6 e 9 sottolineati), due bottiglie di birra. È tutto disegnato in codice in `pacchetto/campo.js` (`creaCampo(THREE)`, circa 7 KB, nessun file da scaricare), pensato per passare all'app. Le misure sono per un KayKit medio e si scalano con l'altezza del personaggio. Si gira tutto insieme trascinando; le ombre sono vere. Serve solo a vedere la clip in situazione: nel file scaricato non entra.
- **Scarica il file**: salva `Rig_<Scheletro>_<Nome>.glb`. Il file contiene solo lo scheletro di prova (niente mesh) e la clip; nella scena è scritta la fonte (`extras.fonte`).

### Come funziona

1. **Ossa**: per ogni osso KayKit (`hips`, `spine`, `chest`, `head`, braccio, avambraccio, polso, coscia, gamba, piede, per i due lati) cerca nella sorgente un nome fra quelli possibili, senza maiuscole, `_`, `.` e spazi. Esempi: `chest` ← Chest, Torso o spine_03; `wrist.l` ← Wrist.L, Fist.L o hand_l; `upperleg.l` ← UpperLeg.L o thigh_l; `lowerleg.l` ← LowerLeg.L o calf_l. Se manca un osso essenziale (fianchi, testa, braccia, gambe) si ferma con l'errore «scheletro sorgente non adatto». La tabella è `CANDIDATI` nella pagina.
2. **Rotazioni nel mondo**: a ogni fotogramma, per ogni osso, la rotazione della sorgente rispetto alla sua posa di riferimento (nello spazio del mondo) si applica all'osso KayKit gemello, a partire dalla sua posa di riferimento. Così non conta come sono orientati gli assi delle ossa nei due pacchetti. Le ossa non abbinate (mani, dita, agganci) restano nella posa di riferimento KayKit.
3. **Fianchi**: lo spostamento dei fianchi (abbassarsi, sedersi, saltare) si copia in proporzione all'altezza dei fianchi dei due scheletri.
4. **File**: GLTFExporter di three scrive i nomi delle ossa senza punti (`upperarm.l` → `upperarml`); `esporta.mjs` li ritrova sullo scheletro KayKit.

### Limiti

- Si muovono busto, testa, braccia e gambe; **dita e mani no** (i KayKit hanno il pugno fisso).
- Nessun oggetto: chi si siede, si siede nel vuoto; chi raccoglie, non tiene niente.
- Proporzioni diverse: i KayKit hanno testa grande e braccia corte. Mani che toccano la testa o braccia incrociate possono compenetrare; va guardato a occhio e, se serve, si sceglie un'altra clip.
- I fianchi seguono la sorgente: clip con spostamento in avanti (camminate) portano il personaggio fuori centro. Meglio clip sul posto (nella UAL quelle senza `_RM`).

### Dalla clip all'app

1. Scaricare il file in `pacchetto/clip/` e aggiungere la riga in `pacchetto/clip/FONTI.md`.
2. In `pacchetto/pacchetto.json`: un gesto (nome per l'app in `gesti`) e per ogni scheletro `{ "clip": ["NomeClip"] }`. Se la clip esiste solo per lo scheletro medio, al grande va dato un ripiego (come per `delusione`: Hit_A).
3. Alzare `versione`, scrivere `CHANGELOG.md`, poi `npm run esporta`. Nel rilascio, `licenze/Quaternius.txt` raccoglie le note di licenza Quaternius del laboratorio (`Licenza-Quaternius-pacchetti.txt`, `-UAL.txt`, `-Robot.txt`).
4. Nell'app: `cd Mollky/backend && node scripts/importa-avatar.js "<rilascio>"`, prove, deploy.

### Da script

La pagina espone `window.riadatta(opzioni)`, che restituisce `{ durata, fotogrammi, glb (base64), mappa }`, e `window.PRONTO` quando è pronta. Opzioni:

| Opzione | Significato |
|---|---|
| `sorgente`, `clipNome` | file GLB e nome della clip |
| `bersaglio` | file del personaggio KayKit |
| `nome` | nome della clip nuova |
| `partenza` | `{ file, clip }`: posa di riferimento KayKit (per esempio `Rig_Medium_General.glb`, `Idle_A` o `T-Pose`) |
| `riposoS` | clip della sorgente il cui primo fotogramma è il suo riferimento (senza: primo fotogramma di `clipNome`) |
| `mappa` | abbinamento a mano `{ ossoKayKit: ossoSorgente }` (senza: automatico) |
| `fianchiB`, `fianchiS` | ossa dei fianchi (predefinite `hips` e quella abbinata) |
| `tposa` | alternativa a `partenza` (vecchia) |
| `fonte` | testo della fonte scritto nel file |
| `fps` | fotogrammi al secondo (30) |

### Clip fatte con lo strumento

`pacchetto/clip/FONTI.md`.
