# Sentinella — piano tecnico di evoluzione

Stato: **bozza revisionata da Astra; decisioni e implementazione ancora aperte**. Documento di pianificazione: le v1–v5 non sono implementate. La roadmap nell'editor è il riepilogo; questo documento dettaglia i passaggi. Data di riferimento: 20 novembre 2026.

## 1. Obiettivo e perimetro

L'admin seleziona nell'editor un TODO; Sentinella prepara gli input, avvia un lavoro Codex, ne segue l'esito e presenta risultato e file prodotti. Si parte dal funzionamento locale e si aggiungono gradualmente autorizzazione, contenimento e nuove piattaforme.

**Non obiettivi iniziali:** applicare automaticamente modifiche al progetto reale; eseguire compiti in parallelo; pubblicare su Internet; automatizzare operazioni esterne o amministrazione del sistema; trattare la risposta del modello come prova di correttezza o autorizzazione.

Il progetto reale è `G:\Develop\Mollky\avatar engine`. Le versioni indicano tappe sperimentali, non livelli di sicurezza certificati. Docker, VM Windows e Proxmox possono essere confrontati e non necessariamente mantenuti tutti nella soluzione finale.

## 2. Stato verificato della v0

- `pacchetto/strumenti/editor-scena.html` e `editor-scena.js`: elenco TODO e pulsante «Esegui ora».
- `pacchetto/strumenti/servi.mjs`: server locale su `127.0.0.1:3202`; espone registro TODO e inoltra le chiamate a Sentinella.
- `pacchetto/strumenti/todo-scene.json`: elenco persistente, con ETag per segnalare aggiornamenti concorrenti nell'interfaccia.
- `pacchetto/strumenti/sentinella-v0.mjs`: intende consentire un lavoro alla volta, ma il controllo non è atomico; copia parziale in `output/sentinella-v0/lavoro-*`; avvio tramite `codex exec --json --sandbox workspace-write --skip-git-repo-check`; messaggi e lista approssimata di file cambiati.
- Una prova innocua ha prodotto `prova-sentinella.txt` nella copia; contenuto e assenza del file dalla radice del progetto sono stati verificati. Login CLI riscontrato nella sessione di sviluppo; disponibilità, permessi e autenticazione possono cambiare.
- Il processo terminato con codice zero diventa **da verificare**, non completa automaticamente il TODO. Non vengono applicati risultati al progetto.

**Limiti effettivi v0:** nessuna autenticazione o autorizzazione; log e stato dei lavori solo in memoria; senza coda persistente né arresto; copia incompleta; confronto file basato su dimensione e data, non hash; nessuna prova che la sandbox impedisca tutte le letture/scritture esterne; nessuna garanzia contro crash, duplicazioni dopo riavvio o aggiornamenti esterni al JSON. La prenotazione avviene dopo la lettura asincrona del corpo: richieste simultanee possono oltrepassare il controllo; alcuni percorsi di errore possono anche azzerare una prenotazione non propria. I controlli `Origin` e header non identificano un utente. Il server statico serve la radice del progetto, comprese copie e output di lavoro, e la sua API TODO permette modifiche del registro senza autenticazione: non è un confine di sicurezza. Non esporre v0 su LAN, Internet o Cloudflare.

## 3. Componenti previsti e confini

```text
Editor amministratore
    │ ID TODO, stato e risultato (nessun comando arbitrario)
    ▼
Sentinella: autorizzazione → registro lavori → preparatore → esecutore
    │                                                       │
    │        input minimi / copia di lavoro                  ▼
    └─────────────────────────────────────────────── Codex + ambiente
                                                            │
                  revisione ← risultati e differenze ←───────┘
```

**Responsabilità:** l'editor invia richieste e mostra gli stati; Sentinella valida, decide profilo e percorsi, persiste la coda e avvia l'esecutore; l'esecutore comunica con Codex; un passaggio separato analizza gli artefatti e li propone per revisione. L'agente non aggiorna direttamente lo stato autorevole del TODO.

**Livelli di fiducia:** testo TODO, file copiati, dipendenze, output del modello e artefatti sono dati non attendibili; non possono diventare comandi, opzioni di avvio, percorsi o istruzioni di sistema solo perché provengono dal progetto. Un utente autorizzato può comunque inviare richieste pericolose; permessi e revisione restano necessari.

**Autenticazione:** una credenziale casuale ad alta entropia, revocabile, non un hash di identificatori hardware. È una proposta da verificare: autenticare il possesso della credenziale non prova l'identità fisica della persona. Windows DPAPI con ambito utente può proteggere un segreto a riposo, ma non difende necessariamente da codice malevolo eseguito con lo stesso account. Un editor compromesso può abusare della sessione autorizzata; i limiti di esecuzione devono essere indipendenti dalla UI.

**Decisione di base sulle cartelle:** la UI non sceglie un path; Sentinella usa profili statici approvati. Per il primo profilo «editor-scene» si propone lettura dalla sola copia selezionata di `pacchetto/strumenti`, asset KayKit medium e arredi necessari; scrittura limitata alla cartella del singolo lavoro. `.git`, profili personali, credenziali, altre unità e dati di ufficio esclusi dagli input. Dipendenze e script sono eseguibili non attendibili: fissare versioni e verificare provenienza. L'elenco definitivo richiede test pratici, non si deduce dal solo prompt.

## 4. Contratto funzionale da implementare in v1

### 4.1 Modello di lavoro

Persistenza proposta, versionata e modificata solo dal servizio:

```json
{"schema":1,"id":"uuid","todoId":"id-stabile","todoRevision":"hash",
 "descrizioneSnapshot":"testo al momento della richiesta","profilo":"editor-scene",
 "stato":"in_coda","creato":"ISO-8601","aggiornato":"ISO-8601",
 "esecuzione":{"tentativo":1,"ambiente":"locale-v1","threadId":null},
 "risultato":{"esito":null,"verifiche":[],"file":[],"riepilogo":null}}
```

Lo snapshot impedisce che l'editor cambi di nascosto il significato di un lavoro già accodato. Il TODO modificato durante l'esecuzione non va completato automaticamente: mostrare il conflitto. Identificativi e hash non autorizzano richieste; niente token o segreti nei record.

Stati proposti: `in_coda → preparazione → in_esecuzione → da_verificare → completato`, con diramazioni `fallito`, `interrotto`, `bloccato`. **Zero exit code non implica completato.** La revisione umana o un verificatore esplicito approvato registra la decisione; il TODO rimane aperto se il risultato non soddisfa i criteri. L'arresto di un processo non equivale alla sua conclusione, e non deve dichiarare terminato il lavoro finché figli e stato sono stati verificati.

### 4.2 API interna proposta

- `POST /api/jobs` con `{todoId, todoRevision, idempotencyKey}`; il servizio rilegge il TODO e sceglie il profilo. Vincolare la chiave all'identità e a un hash del payload; una ripetizione identica restituisce lo stesso lavoro, ma il riuso della chiave con payload diverso è rifiutato. ID inesistente, già completato o revisione diversa: rifiuto esplicito. Validare identificativi non vuoti e univoci, compresi quelli del registro TODO; evitare più lavori attivi per la stessa coppia TODO/revisione anche con chiavi diverse.
- `GET /api/jobs` e `GET /api/jobs/:id` restituiscono stato e risultato autorizzati; log e artefatti hanno endpoint dedicati, senza accesso arbitrario al filesystem.
- `POST /api/jobs/:id/cancel` chiede l'arresto; `POST /api/jobs/:id/review` registra una decisione esplicita. Niente operazioni mutanti tramite GET.
- Stati, messaggi e file modificati sono visibili nell'editor; il browser non riceve credenziali OpenAI né accesso diretto al processo Codex. Il formato esatto degli errori e la migrazione del registro TODO restano decisioni implementative.
- Stato persistente con scritture atomiche e controllo concorrenza; valutare SQLite transazionale per lavori e coda, mantenendo un'importazione/esportazione del JSON TODO. Una sola fonte autorevole per lo stato: evitare doppie scritture incoerenti tra JSON e database. Backup e migrazione con rollback, senza perdere le voci esistenti. Acquisizione e rilascio dello slot devono essere transazionali e legati all'identificativo del lavoro proprietario.

### 4.3 Esecutore e risultati

- Un adapter avvia `codex exec` con argomenti strutturati, senza shell e con directory di lavoro decisa dal servizio. Il testo del TODO passa come dati. Configurazione sandbox e policy di approvazione esplicite; niente opzioni che disattivino protezioni per aggirare errori. Verificare i flag per la versione effettivamente installata.
- Registrare versione Codex, profilo effettivo verificato, ID lavoro/thread, orari, exit code, errori, test e versione input. All'avvio, se un confine richiesto non è disponibile o verificabile, il profilo protetto non parte; v0 resta chiaramente contrassegnata come prova separata.
- Baseline e inventario contenuti con hash, non solo timestamp; segnalare creazioni, modifiche e cancellazioni; limiti a dimensioni e quantità; percorsi canonicalizzati e gestione esplicita di symlink/junction. Risultati e anteprime sono dati non attendibili. Niente copia automatica nel progetto reale.
- Impostare timeout, budget di consumo e limiti di risorse per tentativo; cancellazione verifica anche i processi figli. Registrare l'ID del tentativo prima del dispatch e deduplicare i risultati. Dopo crash o riavvio, riconciliare processi, lock e stato: se non è possibile determinare se il lavoro sia partito o terminato, indicare **esito incerto**, senza rilancio automatico.

## 5. v0 — chiusura e baseline

**v0.1 — Documentare:** conservare `SENTINELLA-V0.md`, prova, cartella prodotta e limiti; non trattare la copia come isolamento certificato.

**v0.2 — Ripetere senza espansione:** registrare una prova di successo e una simulazione di errore innocua; verificare che il TODO rimanga aperto senza approvazione. Testare richieste simultanee con esecutore finto, documentando il difetto attuale senza avviare più agenti reali. Nessun invio automatico di TODO al modello.

**v0.3 — Baseline migrazione:** fotografare il formato corrente del registro e mantenere inalterate voci e modifiche dell'utente. Definire cosa accade agli eventuali lavori v0 ancora in corso prima di riavviare o migrare.

**Uscita:** prova end-to-end documentata; limite «locale, senza autenticazione, non esporre» visibile. La prima prova v0 è stata eseguita; le ulteriori prove di errore sono da fare.

## 6. v1 — guardiano locale

**v1.1 — Threat model e sessione:** indicare attori (admin, altra pagina, altro processo locale, editor compromesso), capacità consentite e limiti. Progettare bootstrap della sessione senza segreti in URL, repository o log; vincolare il servizio a loopback. Definire scadenza, revoca e rotazione, e chi può attivare la sessione. Il token non distingue un browser compromesso dal browser legittimo.

**v1.2 — API e autorizzazione:** servizio separato dalla v0; per tutte le operazioni sensibili verificare autenticazione e autorizzazione, `Host`, `Origin` esatto e difese CSRF appropriate. Rifiutare richieste senza prove richieste, `Origin: null` e origini non ammesse; CORS non permissivo. Autorizzare lettura di log e artefatti e mutazioni del registro TODO. Distinguere le facoltà di modificare TODO, eseguire, segnare completato, revisionare e applicare; non dare per scontato che siano dello stesso ruolo. Disattivare l'endpoint legacy di avvio e l'accesso alternativo non autenticato durante il passaggio a v1; impedire downgrade silenziosi. Non esporre alcun endpoint di esecuzione attraverso Cloudflare. Definire esplicitamente l'accesso di client non-browser, se mai necessario.

**v1.3 — Archivio e concorrenza:** realizzare il modello §4 con migrazione e backup del registro; coda iniziale a un solo esecutore; idempotenza, revisioni e stati transazionali; fronteggiare la modifica contemporanea del TODO e riavvii senza perdere dati.

**v1.4 — Adapter Codex:** confinare avvio e raccolta eventi; definire e verificare prima dell'avvio eseguibile, integrità/versione, identità del processo, ambiente ereditato, credenziali e policy effettiva. Disabilitare configurazioni, hook e MCP non necessari secondo opzioni effettivamente supportate; non concedere automaticamente trust a progetti sconosciuti. Non usare solo `-C` o il prompt come confine. La documentazione Codex avverte che MCP di progetto possono eseguire comandi fuori sandbox.

**v1.5 — Workspace e artefatti:** implementare preparazione da allowlist per profilo e verifica dei contenuti, inventario hash e confronto; approvazione separata prima di portare il risultato nel progetto; rilevare cambiamenti concorrenti del file originale e rifiutare sovrascritture. Collocare nuovi job, archivio e segreti fuori dalla radice servita via HTTP; servire la UI da un'allowlist. Gli artefatti sono scaricati come dati inerti o visualizzati in un'origine separata e adeguatamente isolata. Nessun diff o GLB eseguito o caricato automaticamente in contesto privilegiato; controllare anche i percorsi legacy e il server statico.

**v1.6 — UI e operazioni:** elenco lavori e storico, avanzamento, errore, log ridotti e depurati prima della persistenza, annullamento, revisione e collegamento al TODO. Distinguere risultato da controllare da task completato. Limiti di coda, consumo/costo, dimensione, durata e conservazione; nessuna cancellazione automatica di dati utente senza una politica concordata.

**v1.7 — Prove negative:** origine non ammessa/assente, token errato o scaduto, host inatteso, richieste contemporanee con stessa chiave e con chiavi diverse, payload diverso con stessa chiave, ID duplicati, TODO modificato o cancellato, dati JSON malformati, processi figli ancora attivi, crash prima/dopo l'avvio del processo e ripartenza con esito incerto, link simbolici/junction, accesso statico e tentativi innocui fuori dall'area. Usare un esecutore finto per i test deterministici, poi una prova reale controllata. Verificare la modalità sandbox Windows effettiva, accessi a file e rete e percorso di fallimento: non dichiarare un limite che non si riesce a dimostrare.

**Uscita:** richieste anonime respinte, lavori persistenti non duplicati, output separato e revisionabile; test documentati. Non è una garanzia contro malware con privilegi dello stesso utente o editor compromesso.

## 7. v2 — Docker

**v2.1 — Specifiche:** scegliere host e piattaforma Docker Desktop/WSL, versione base, risorse e dipendenze minime. Distinguere obiettivo «ambiente ripetibile» da «barriera contro attaccanti». Per Windows verificare compatibilità degli strumenti; il container Linux non esegue automaticamente applicazioni Windows native.

**v2.2 — Immagine:** immagine versionata e bloccata per digest, utente senza privilegi ove possibile, niente Docker socket, privilegi elevati o filesystem host esteso; dipendenze verificabili e niente segreti nell'immagine.

**v2.3 — Dati:** staging di input copiati, output dedicato, filesystem temporaneo e quote; nessun mount dell'intero progetto o dei profili utente. Definire quali file servono realmente per il caso blob e come rilevare asset mancanti.

**v2.4 — Codex e rete:** verificare se la sandbox interna può funzionare nel container e quali permessi richiede; se non funziona, il profilo protetto fallisce senza disattivarla silenziosamente. Separare, per quanto la piattaforma consente e con test, il traffico necessario al modello da quello dei comandi. Non rendere credenziali di lunga durata disponibili ai test del progetto senza un disegno esplicito.

**v2.5 — Ripetibilità e prova avversa:** eseguire due volte lo stesso compito innocuo, confrontare ambiente, manifest, input, dipendenze e controlli applicati, senza pretendere risposte identiche dal modello; tentare accesso a file/rete non concessi con dati fittizi, verificare cancellazione e limiti di risorse; documentare risultati e limiti.

**Uscita:** esecuzione ripetibile e confini testati; non affermare che Docker sia una VM o una protezione completa.

## 8. v3 — VM Windows locale

**v3.1 — Prerequisiti:** rilevare capacità hardware, supporto virtualizzazione, spazio, licenza e necessità di Windows; definire hypervisor e isolamento di rete.

**v3.2 — Immagine VM:** aggiornamenti, account dedicato senza privilegi admin, strumenti minimi, snapshot di ripristino; nessun disco personale o condivisione ampia montata. Snapshot non sostituisce backup.

**v3.3 — Confini Windows:** selezionare e testare la sandbox supportata (MXC se disponibile e policy lo permette, altrimenti fallback appropriato); `unelevated` ha limitazioni documentate sui percorsi di lettura negati e sulla rete. Non assumere che il dispositivo attuale supporti una modalità senza prova.

**v3.4 — Trasferimento:** definire protocollo e autorizzazioni fra Sentinella e VM, input espliciti e output revisionabili; nessuna credenziale personale trasferita implicitamente.

**v3.5 — Prove:** ripetere il TODO di v0; simulare blocco, riavvio e input mancante; verificare accesso a cartelle e servizi esterni alla VM e recupero dei risultati.

**Uscita:** compito completato nella VM e confini misurati; documentare costo operativo e differenze rispetto a v2.

## 9. v4 — Proxmox esterno

**v4.1 — Inventario:** misurare RAM, CPU, spazio e rete del mini PC; identificare servizi esistenti e vincoli dell'ufficio. Non modificare host, firewall o VM senza piano operativo e autorizzazioni appropriate.

**v4.2 — VM dedicata:** scegliere OS in base ai tool effettivi, immagine aggiornata, account limitato, risorse e backup; niente accesso al pannello amministrativo Proxmox, socket di gestione, dischi host o NAS non richiesti.

**v4.3 — Collegamento e identità:** da 127.0.0.1 a due macchine sulla LAN cambia il confine: usare un canale autenticato e cifrato gestito da Sentinella, con credenziali separate e rotazione. Evitare di esporre direttamente Codex alla rete; app-server via stdio all'interno della VM è una candidata. Se si valuta WebSocket, verificare supporto/versione e autenticazione; la documentazione attuale lo definisce sperimentale e segnala il rischio di listener non-loopback non autenticati.

**v4.4 — Segmentazione:** definire esplicitamente destinazioni consentite e blocchi verso rete aziendale e gestione Proxmox. Codex deve raggiungere il servizio modello; valutare separatamente la rete disponibile ai processi generati, senza presumere che un semplice firewall per IP o un proxy risolva ogni rischio.

**v4.5 — Scambio e ritorno:** input minimi verificati, identificativi e hash, artefatti esportati, revisione prima di applicarli. Gestire perdita rete, scadenza credenziali, ripresa, duplicati e tentativi di output fuori perimetro.

**v4.6 — Prove e ripristino:** simulare fallimento rete e crash VM, tentativi non autorizzati e accesso a servizi interni fittizi; verificare recupero da backup/snapshot e corretta attribuzione del lavoro.

**Uscita:** TODO avviato dalla postazione, eseguito nella VM e restituito tramite percorso autorizzato; confini e limitazioni verificati e documentati.

## 10. v5 — ufficio e più utenti

**v5.1 — Governance:** identificare responsabili, classificazione dei dati, policy aziendali e condizioni di uso della modalità OpenAI scelta; distinguere dati in sede da dati inviati al servizio modello.

**v5.2 — Identità e ruoli:** singoli utenti, revoca, separazione per progetto, approvatore distinto dove richiesto; token condiviso di macchina non prova chi abbia premuto il pulsante.

**v5.3 — Isolamento per progetto:** valutare VM/container dedicati per clienti o incarichi che non devono condividere dati; gestione ciclo di vita e cancellazione secondo policy.

**v5.4 — Credenziali e integrazioni:** identità di servizio con privilegi minimi, vault o broker per terze parti, rotazione e audit; non assumere che un segreto in variabile d'ambiente sia nascosto ai comandi eseguiti nello stesso ambiente.

**v5.5 — Operatività:** backup verificati, retention log e privacy, monitoraggio, aggiornamenti, incident response, limiti costi/consumi, gestione approvazioni e malfunzionamenti.

**v5.6 — Verifica indipendente:** test di isolamento, prova di richieste non autorizzate, revisione dell'integrazione e approvazione dei responsabili prima di uso con dati aziendali.

**Uscita:** tracciabilità e confini dimostrabili per utenti, progetti, dati e approvazioni; nessuna pretesa di conformità senza verifica dell'organizzazione.

## 11. Dipendenze e scelte ancora aperte

1. **v1:** come effettuare il bootstrap sicuro dell'admin locale e quale meccanismo di sessione usare? Come proteggere un'azione se la pagina autorizzata è compromessa? Una credenziale nel browser non basta da sola.
2. **v1:** quale sandbox Windows è realmente disponibile su questo PC? Testare anche lettura fuori perimetro e rete; la copia di lavoro e `workspace-write` non costituiscono da soli tale prova.
3. **v1:** come rappresentare in modo transazionale TODO, job e revisione, preservando il file attuale e supportando modifiche concorrenti?
4. **v2/v3:** quali tool richiedono Windows, GPU o Blender? Misurare risorse e tempi prima di scegliere immagini e copie degli asset.
5. **v4:** risorse e rete reali del Proxmox; protocollo, certificati, firewall, responsabilità di gestione e modalità di recupero.
6. **v5:** regole dell'ufficio, classificazione dati, account e fatturazione. Non assumere che credenziali, abbonamenti o permessi esistenti siano automaticamente trasferibili.
7. **v1:** chi può segnare manualmente un TODO completato e chi può approvare/applicare i risultati dell'agente? Il `PUT` attuale permette già di cambiare il flag; la nuova autorizzazione deve coprire anche quel percorso.

## 12. Revisione indipendente

Revisione statica in sola lettura di **GPT-6.2 Astra** sulla bozza e sui file v0, 20 novembre 2026. Integrati nel piano: corsa nella prenotazione v0, esposizione statica delle copie, separazione dei permessi sul registro, idempotenza e stato incerto dopo crash, controllo dell'ambiente Codex, quote e redazione dei log. La revisione non ha eseguito test né corretto i difetti della v0. La decisione sui ruoli di completamento e approvazione resta aperta.

## 13. Fonti tecniche e verifica

- [Codex: esecuzione non interattiva e permessi](https://developers.openai.com/codex/noninteractive/).
- [Codex: app-server e protocollo](https://developers.openai.com/codex/app-server/).
- [Codex: sandbox Windows](https://developers.openai.com/codex/windows/).
- [OpenAI: isolamento di ambienti e credenziali](https://developers.openai.com/api/docs/guides/agents-api/environments/security) — guida Agents API, usata per principi generali, non come descrizione automatica di questa CLI locale.
- [Docker: sicurezza del motore](https://docs.docker.com/engine/security/).
- [OWASP: prevenzione CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
- [Microsoft: protezione dati DPAPI](https://learn.microsoft.com/en-us/dotnet/standard/security/how-to-use-data-protection).

Le fonti e i comportamenti della CLI vanno ricontrollati al momento dell'implementazione. Un test negativo riuscito verifica quel caso e quella configurazione, non prova assenza di vulnerabilità.
