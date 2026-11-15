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
