# Sentinella v0 — prova locale

Sentinella v0 collega il registro TODO all'esecuzione di `codex exec`. Il limite previsto di un lavoro alla volta **non è garantito con richieste simultanee**: il controllo ha una finestra di concorrenza. Il server statico rende raggiungibili anche i file delle copie di lavoro. È una prova di funzionamento, non un servizio di sicurezza e non deve essere pubblicata su Internet o tramite Cloudflare. I difetti e le correzioni previste sono nel `PIANO-TECNICO-SENTINELLA.md`.

## Uso

Avviare `npm run strumenti` e aprire `http://127.0.0.1:3202/pacchetto/strumenti/editor-scena.html`. Nella sezione TODO premere **Esegui ora** sulla voce desiderata. Il lavoro crea una nuova cartella sotto `output/sentinella-v0/`; la pagina mostra stato, messaggi, percorso e file cambiati.

La copia è parziale: contiene il pacchetto, gli script `tools`, i file di primo livello del confronto avatar, i modelli KayKit 2, gli arredi Furniture glTF, le dipendenze Node e i manifest del progetto. Esclude `.git`, gli altri output, molti asset originali e gli altri pacchetti di personaggi: un compito che ne ha bisogno può restare incompleto. I collegamenti simbolici non vengono copiati.

La copia non è una VM né una garanzia di isolamento: i permessi effettivi dipendono dalla sandbox di Codex e dalla configurazione del sistema. La v0 chiede `workspace-write`, usa l'autenticazione CLI disponibile e non attiva l'opzione che disabilita sandbox e approvazioni. Le richieste partono solo esplicitamente dall'editor locale; non vengono applicate modifiche dalla copia al progetto originale.

## Risultati

- `in_coda`: preparazione della copia.
- `in_esecuzione`: processo Codex avviato.
- `da_verificare`: il processo è terminato con codice zero; non significa che il TODO sia corretto o completato. Controllare risultato, file modificati e verifiche prima di spuntare manualmente il TODO.
- `fallito`: errore di preparazione o processo fallito; il TODO resta aperto.

Gli stati e i messaggi sono conservati solo nella memoria del server e non sopravvivono a un suo riavvio. La cartella del lavoro rimane su disco. La v0 non offre ancora coda multipla, arresto, autenticazione, autorizzazioni differenziate, integrazione nel progetto o ripristino automatico dopo il riavvio.

## Prima prova

Il 20 novembre 2026 il TODO di prova ha richiesto la creazione di `prova-sentinella.txt`. Il lavoro è stato eseguito in una copia separata, il processo ha restituito codice zero e il contenuto `Sentinella funziona` è stato controllato indipendentemente. Non è stato creato un file con quel nome nella radice del progetto.
