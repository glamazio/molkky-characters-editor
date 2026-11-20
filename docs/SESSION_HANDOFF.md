# Handoff operativo — laboratorio avatar Mölkky

Aggiornato: 20 novembre 2026. Dashboard sintetica; verificare sempre lo stato attuale prima di intervenire.

Questa pagina conserva il contesto operativo corrente. Alla chiusura di una fase o quando cresce troppo, spostare lo storico utile in `docs/handoff/` secondo `AGENTS.md`, lasciando qui decisioni valide e attività aperte.

## Scopo e contesto

Laboratorio 3D e modulo avatar destinato all'app Mölkky, in un repository Git separato da `G:\Develop\Mollky\Mollky`. L'utente vuole un collaboratore critico e proattivo, con verifiche concrete e comunicazione franca su limiti e incertezze.

## Stato attuale

- Repository avatar: branch `main`; remote `origin` configurato su `https://github.com/glamazio/molkky-characters-editor.git`. Alla verifica del 20 novembre 2026 non risultavano branch remote e non era stato eseguito alcun push. Il lavoro recente è stato suddiviso in commit tematici da `33c8aee` a `b8706f9`; il contenuto finale corrisponde al precedente commit unico `4ac1709`.
- L'editor di scena è `pacchetto/strumenti/editor-scena.html`; avvio del laboratorio: `npm run strumenti`, normalmente porta locale 3202. Verificare il processo realmente in esecuzione prima di fare affidamento su modifiche al server.
- Le animazioni create o riadattate nel laboratorio vanno in `confronto-avatar-3d/modelli/kaykit2/animazioni-custom/`, salvo quelle confermate già conservate nella destinazione prevista dall'app. Le clip per il pacchetto attuale seguono `pacchetto/strumenti/LEGGIMI.md` e `pacchetto/clip/FONTI.md`.
- La scena usa un manichino medium, animazioni statiche iniziali, un blob approssimato e una seduta di prova. Provenienza, decisioni e limiti: `pacchetto/strumenti/SCENE-APPUNTI.md`.
- `pacchetto/strumenti/todo-scene.json` contiene il registro usato dalla pagina. Le spunte storiche non dimostrano la pubblicazione. Non dichiarare completo un lavoro eseguito solo in copia.
- Sentinella v0 avvia Codex in una copia parziale e non integra né pubblica le modifiche. La pagina mostra stati manuali, che non realizzano ancora il flusso richiesto con transizioni gestite dall'agente. Le modifiche alla persistenza richiedono il riavvio del server se è ancora in esecuzione la vecchia versione; l'ultimo tentativo automatico di riavvio è stato respinto dalla policy. Verificare lo stato prima di riprovare.
- L'ultimo lavoro noto in copia riguarda la modifica delle coordinate della seduta collegata: stato `da_verificare`, non integrato nel progetto. Sono state individuate criticità su cambio animazione, scala e verifica del contatto; la soluzione è specifica per la seduta. La copia e l'archivio delle esecuzioni sono in `output/sentinella-v0/`, escluso da Git.

## Decisioni e questioni aperte

- La scena parte dai requisiti dell'animazione: spazio occupato, asset necessari e zone disponibili. La pipeline di generazione blob, associazione e requisiti va sviluppata per componenti separati. I dati di prototipo non sono compatibilità certificata.
- Si è discusso di una coda con un solo TODO attivo, app di test separata, verifica utente e pubblicazione gestita dall'agente. Sono ipotesi di flusso, **non una pipeline implementata né una decisione definitiva sulle branch**. Prima va verificato l'ambiente reale e provato un percorso end-to-end semplice.
- L'app Mölkky principale ha procedure e repository propri; non presumere che un commit del laboratorio equivalga a un rilascio o a un'integrazione nell'app.
- I pacchetti originali scaricati e molti modelli sono esclusi da Git; un clone non è ancora autosufficiente. La sola configurazione del remote non costituisce un backup finché non vengono caricati i commit.

## Riferimenti

- Contesto storico: `CLAUDE.md` e `Avatar e personaggio — riepilogo e proposte.md`.
- Contratto modulo: `pacchetto/CONTRATTO.md`; fonti e licenze: `FONTI.md` e file di licenza.
- Stato scene e futura skill: `pacchetto/strumenti/SCENE-APPUNTI.md`.
- Piani Sentinella: `pacchetto/strumenti/PIANO-TECNICO-SENTINELLA.md` e pagina roadmap. Possono descrivere proposte o dettagli superati: confrontarli con il codice.

## Verifiche recenti

La suddivisione dei commit è stata confrontata con `4ac1709`: nessuna differenza nei file finali. `git diff --check` e i controlli sintattici Node dei principali file del server e dell'editor sono passati. Questi controlli non sostituiscono prove interattive.
