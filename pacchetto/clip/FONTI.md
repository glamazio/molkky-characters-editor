# Clip riadattate

Clip prese da altri pacchetti (Quaternius: animati, donna, mostri «Big», RPG; KayKit 1.0) e riadattate sugli scheletri KayKit 2.0 con `pacchetto/strumenti/riadatta.html`
(si apre con `npm run strumenti`, poi http://127.0.0.1:3202/pacchetto/strumenti/riadatta.html; un file per clip, `Rig_<Scheletro>_<Nome>.glb`)
(per ogni osso, la rotazione rispetto alla posa di partenza, nello spazio del mondo, va all'osso gemello).
`esporta.mjs` le legge insieme alle librerie KayKit (`Rig_Medium_*.glb`, `Rig_Large_*.glb`).

| File | Clip | Da | Licenza | Note |
|---|---|---|---|---|
| `Rig_Medium_Delusione.glb` | `Delusione` (2,5 s, 30 fps) | Quaternius, Ultimate Animated Character Pack, `BaseCharacter.glb`, clip «Defeat» (`confronto-avatar-3d/modelli/quaternius-animati/`) | CC0 1.0 | Personaggio di riferimento Knight; parte da `Idle_A` (Rig_Medium_General). Solo scheletro medio. |
