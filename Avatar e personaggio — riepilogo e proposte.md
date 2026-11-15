# Avatar e personaggio — riepilogo e proposte

Nov 8, 2026 · @mauro grespigna

Gli avatar sono partiti come caricature colorate dei giocatori e stanno diventando un personaggio che cresce con le statistiche; oggi la caricatura personalizzabile è fatta, il personaggio è in bozza.

## La richiesta

La richiesta è arrivata in due tempi.

1. **Caricature e profilo (fino al 6 novembre 2026).** Ogni giocatore deve riconoscersi a colpo d'occhio in elenchi, classifiche e partite. Dalla tela «Mölkky: proposte grafiche» è stata scelta la proposta C: un colore fisso per giocatore e una caricatura. Poi la richiesta di poterla personalizzare: genere, capelli, colori, occhiali, barba, maglia, oppure una foto o una caricatura propria.
2. **Personaggio da videogioco (segnalazione del 6 novembre 2026).** Far restare i soci sull'app legando tutto alle statistiche: più si gioca in serata, più il personaggio cresce. Dai giochi di ruolo online si prendono solo le meccaniche (livelli, classi, sbloccabili), mai personaggi o grafica di giochi esistenti.

## Lo scopo

L'avatar serve a due cose, una già raggiunta e una ancora da costruire.

- **Riconoscersi subito.** Sul telefono, in campo, si legge poco: un colore fisso e una faccia dicono chi tira, chi è in squadra con chi e chi sta in testa alla classifica prima di leggere il nome.
- **Tornare sull'app.** Il personaggio trasforma le statistiche di allenamento in qualcosa da far crescere: attributi, classe, livello, medaglie. Più si gioca in serata, più il personaggio migliora, e il testa a testa diventa una sfida da guardare insieme.

## I ragionamenti fatti

Ogni scelta è nata da un vincolo concreto: rispetto per le persone, stabilità nel tempo, telefoni lenti in campo, nessun prestito da giochi esistenti.

| Questione | Scelta | Perché |
| --- | --- | --- |
| Colore del giocatore | Uno per sempre, non modificabile dal profilo | È l'appiglio visivo in anelli, bordi e fasce; se cambiasse, gli altri non ritroverebbero più la persona. Mai usato per il testo (leggibilità). |
| Faccia di partenza | Tratti scelti dal nik con un hash; i soci della tela hanno quelli disegnati a mano | Tutti hanno subito una faccia senza dover compilare nulla. Gli elenchi di partenza non vanno toccati, o cambierebbe la faccia a chi non ha scelto. |
| Genere | Mai indovinato dal nome; lo sceglie la persona (m, f o nessuno) | Indovinarlo dal nome sbaglia e offende. Con «f»: capelli lunghi, coda o caschetto, ciglia, orecchini, niente barba. |
| Personalizzazione | Carnagione, capelli (8 forme, 10 colori), occhiali, barba, maglia; oppure una foto o una caricatura propria | Chi non si riconosce nel disegno può correggerlo; chi vuole la propria immagine può usarla. |
| Foto | Ritagliata e rimpicciolita sul telefono; il server accetta solo jpeg, webp o png fino a 60 KB e ne controlla i primi byte | Niente spazio di archiviazione a parte, niente file non immagine spacciati per foto. |
| Controllo | Ognuno cambia solo il proprio profilo; l'organizzatore corregge il genere e toglie una foto inadatta, con traccia nel registro | Il server controlla sempre i permessi (regola del progetto). |
| Ospiti | Statistiche sì, profilo e caricatura personalizzata no | Non hanno un'identità registrata; dalla terza serata l'admin propone di farli soci. |
| Personaggio | Solo meccaniche dei giochi di ruolo (livelli, classi, sbloccabili), grafica originale | Niente personaggi o grafica di giochi esistenti. |
| Dati del personaggio | Solo allenamenti confermati, come la scheda | Coerente con la scheda del giocatore; le classifiche ufficiali restano separate. |
| Esclusioni | Scansione del campo con la fotocamera per la difficoltà del tiro: esclusa | Visione artificiale complessa e rallenta il gioco in campo. |

Nella bozza VS l'attributo «testa fredda» della segnalazione è diventato «costanza» (100 meno la percentuale di lanci a vuoto), perché si calcola dai lanci già registrati.

## Il risultato

La caricatura personalizzabile è in uso dal 6 novembre 2026 (commit 61e19ae); il personaggio esiste solo come bozza grafica del 7 novembre, giudicata così: «il VS piace, l'avatar va rifatto».

**Fatto nel codice**

| Parte | Dove | Cosa fa |
| --- | --- | --- |
| Caricature | `backend/public/gioca/giocatori.js` | Disegna in SVG la faccia nel cerchio del colore del giocatore; con una foto la mostra al posto del disegno. Tratti finali = base dal nik, poi genere, poi scelte del profilo. |
| Profilo | `backend/src/profili.js` | `GET /v1/aspetti` (aspetto di tutti), `GET` e `PUT /v1/profilo` (il proprio), `PUT /v1/admin/profili/:nik` (correzioni dell'organizzatore). |
| Dati | migrazione `010` | Tabella `soci.profili` per nik: genere, aspetto (json), foto (data URL), chi e quando l'ha cambiato. |
| Schermata | `/gioca?pr=1` «Il mio profilo» | Anteprima dal vivo, scelta dei tratti, caricamento della foto ritagliata in cerchio. |
| Admin | `/admin/` | Corregge il genere, toglie foto inadatte; l'azione va nel registro. |
| Prove | `backend/test/profili.test.js` | Permessi, valori ammessi, foto non valide. |

**In bozza** (tela [Mölkky · bozza VS](https://claude.ai/artifact/BUEvZg5PbJC5HVYJ4CBZX3))

- **Schermata VS del testa a testa:** due figure intere che entrano dai lati, classe e livello, sfide dirette, sei barre di attributi a confronto, una frase di sintesi, «Sfida in serata». Dati veri: Armadilly e Umbi, 4 sfide, 2 a 2.
- **Carta del giocatore:** figura intera che respira, classe, livello con barra di avanzamento, esagono dei sei attributi, sei medaglie (tre sbloccate) che danno pezzi del personaggio.
- **Formule provvisorie (0–99):** precisione = media a lancio (8 punti = 99); costanza = 100 meno % vuoti; potenza = dodici; nervi = salvataggi e rimonte per partita; killer = % vittorie; resistenza = partite rispetto a chi ne ha giocate di più. Classe dall'attributo più alto, livello dalle partite giocate.

Nel piano del Cantiere è la voce «Avatar e personaggio», percorso a parte; la segnalazione «Personaggio da videogioco» è in corso.

## Proposte per lo sviluppo futuro

Il prossimo passo utile è rifare la figura intera e mettere in produzione carta e VS con formule decise; il resto viene dopo, solo se la carta piace in serata.

**Ordine proposto** (dalla segnalazione, con i dettagli tecnici aggiunti)

1. **Figura intera nuova.** Rifare l'avatar della bozza, che non convince, partendo dagli stessi tratti di `giocatori.js` (carnagione, capelli, maglia, genere): chi ha già scelto il proprio aspetto lo ritrova uguale. Con una foto, la foto resta nel cerchio e la figura usa i tratti di base.
2. **Carta del giocatore e VS in produzione.** Attributi, classe e livello calcolati da una funzione pura sul server accanto a `scheda()`, ricostruiti ogni volta dalle partite confermate, senza salvarli a parte. Prove come per scheda e classifiche.
3. **Traguardi e medaglie** che sbloccano pezzi (fascia da capitano per la rimonta, mantello al livello 5). Anche le medaglie si ricavano dai lanci, così una correzione o una partita eliminata le aggiorna da sola.
4. **Creatura di fantasia** a parti, che evolve con livelli e medaglie.
5. **Arena 3D leggera** solo per il testa a testa (three.js con licenza MIT, modelli CC0 come Kenney o Quaternius), caricata solo quando serve.
6. **Mini-gioco** di Mölkky simulato con fisica 2D (per esempio matter.js).

**Decisioni da prendere**

- [ ] Stile della figura intera (proporzioni, quanto è caricaturale, animazioni).
- [ ] Formule definitive dei sei attributi e scala: assoluta (8 punti = 99) o rispetto al gruppo.
- [ ] Minimo di partite prima di mostrare attributi e classe, per evitare valori estremi con 1–2 partite.
- [ ] Elenco delle classi (per ora Cecchino e Rimontatore) e regola per i pareggi tra attributi.
- [ ] Cosa sblocca ogni medaglia e ogni livello, e se si può perdere qualcosa.
- [ ] Se gli ospiti hanno una carta: oggi no, per coerenza con scheda e profilo.
- [ ] Varianti di gioco (baguette) come regola scelta all'apertura della partita: fuori dal personaggio, da decidere a parte.

**Accorgimenti tecnici**

- `GET /v1/aspetti` manda insieme tutte le foto (fino a 60 KB ciascuna): con molti soci conviene una rotta per la singola foto con cache, o un'impronta per scaricarla solo quando cambia.
- Le animazioni della bozza vanno ridotte quando il telefono chiede meno movimento (`prefers-reduced-motion`).
- Restano aperti nel Profilo: «Conosciuto anche come», visibilità delle statistiche, consenso privacy; da valutare caricature in stile fumetto generate da una foto.
