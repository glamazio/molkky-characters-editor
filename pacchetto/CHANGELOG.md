# Pacchetto avatar 3D: cambiamenti

## 0.1.0 (15 novembre 2026)
Prima prova del contratto con l'app. Personaggio KayKit «Knight» scelto a caso, clip Idle_A (riposo), Cheering (esulta) e Death_A (morte, resta a terra).
Modulo `avatar3d.js` con `monta`, `gesto`, `attacca`, `smonta`. Three.js 0.153.0 locale.

## 0.2.0 (15 novembre 2026)
Scelta del personaggio fra gli otto interi di KayKit Adventurers 2.0 sullo scheletro medio (Barbarian_Large escluso: altro scheletro, senza clip di esultanza). Un file per personaggio, scaricato solo quando serve.
Interfaccia: aggiunti `personaggi()`, l'opzione `personaggio` di `monta`, `cambia(id)` e `personaggio`; rotazione trascinando la tela (in verticale la pagina scorre). Manifesto: `personaggi` e `predefinito` al posto di `modelli.personaggio`.

## 0.3.0 (15 novembre 2026)
Tutti i personaggi interi di KayKit 2.0 (scheletro medio e grande); chi non ha gli agganci vuoti delle mani li riceve nell'esportazione. Clip separate per scheletro (`clip-medium.glb`, `clip-large.glb`), scaricate solo se serve quello scheletro.
Gesti della partita al posto di esulta/morte: `bel_tiro`, `zero`, `sforo`, `eliminato`, `vittoria`, `sconfitta`, `lancio`. Un gesto è una sequenza di clip con un «poi»: riposo, fermo, o una clip in ciclo. `gesti()` restituisce `[{ id, nome }]`; `personaggi()` ha anche `gruppo`. Cambio incompatibile per l'app (nomi dei gesti).

## 0.4.0 (15 novembre 2026)
Sei momenti della partita con animazioni distinte: `bel_tiro` (12), `salvataggio` (punti dopo due zeri), `vittoria`, `zero`, `sforo` (sballo, oltre 50), `sconfitta` (tre zeri o partita persa; tolto `eliminato`), più `lancio`. Clip scelte guardando un foglio di pose (Cheering, Skeletons_Death_Resurrect, salto + Skeletons_Taunt_Longer, Hit_B, seduto a terra e rialzato, Death_A).
Nuova `scena(el, giocatori, opz)`: più personaggi nella stessa tela (un solo contesto WebGL), `gesto(i, nome)`, `evidenzia(i)`, `cambia(i, id)`. Opzione `fermaARiposo`: la tela disegna solo durante i gesti e mentre la si gira. `monta` resta uguale.

## 0.5.0 (15 novembre 2026)
Nuovo gesto `disperato` per i compagni di squadra nei momenti negativi (zero, sballo, sconfitta): sussulto (Hit_A) e poi testa china (Skeletons_Inactive_Standing_Pose) finché la scena resta aperta; scheletro grande: Melee_Block_Hit. Le pose ferme (clip di durata zero) si tengono invece di ripetersi.

## 0.6.0 (19 novembre 2026)
Nuovo gesto `delusione`: la clip «Defeat» di Quaternius (Ultimate Animated Character Pack, CC0) riadattata sullo scheletro medio KayKit con `strumenti/riadatta.html`, partendo da Idle_A (2,5 s: si piega, mano alla testa, si rialza). Scheletro grande: per ora Hit_A.
`esporta.mjs` legge anche le librerie di `pacchetto/clip/` (fonti in `clip/FONTI.md`) e ritrova le ossa coi nomi scritti da three (senza punti). Licenza Quaternius nel rilascio.

