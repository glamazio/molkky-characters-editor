# Scene e futura skill — appunti di progetto

Questi appunti raccolgono le decisioni condivise e le questioni da verificare. Non sono ancora una specifica definitiva né una skill pronta.

## Direzione condivisa

- L'editor è inizialmente per amministratori che preparano scene per eventi predefiniti: si parte da evento e animazione, poi si compone l'ambiente attorno ai loro requisiti.
- Distinguere zone vietate dal movimento, oggetti obbligatori in punti precisi e zone utilizzabili per arredi o altri personaggi. Pavimenti e superfici calpestabili non sono automaticamente ostacoli.
- Una scena può essere verificata per una o più varianti di animazione; se l'app ne sceglie una casualmente, vanno considerate tutte le varianti ammesse.
- Una bozza incompleta può essere salvata; il futuro salvataggio come scena validata dovrà impedire violazioni di requisiti obbligatori effettivamente verificati e spiegare il motivo.
- Partire da un editor di scene con pianta 2D, vista 3D e una libreria di oggetti esistenti.
- Usare inizialmente un personaggio KayKit medium standard come riferimento di scala; non introdurre ancora regole d'ingombro per ogni personaggio specifico.
- Aggiungere in seguito un'animazione reale alla volta e osservarne l'ingombro con il personaggio.
- Descrivere i requisiti delle animazioni e le caratteristiche offerte dalle scene per individuare animazioni incompatibili.
- La pianta mostra il fronte del personaggio e un cono orientativo della visuale. Il cono non dimostra da solo che un oggetto sia visibile.
- L'obiettivo futuro comprende più personaggi della stessa squadra, che dovranno coordinarsi nello spazio e nel tempo.

## Esempi da verificare, non parametri definitivi

- `Death`: potrebbe richiedere spazio davanti al personaggio per il corpo disteso; misurare direzione e ingombro sulla clip effettivamente utilizzata.
- `SitDown`: richiede una seduta posizionata e orientata rispetto al punto raggiunto dall'animazione; verificare altezza e contatto sulla clip reale.
- Il cono segue inizialmente il fronte del corpo; una futura animazione della testa può modificare la direzione dello sguardo.

## Prova Death_A — 20 novembre 2026

- Il primo prototipo usa la clip nativa KayKit `Death_A` su `Mannequin_Medium`, non la clip Quaternius `Death`. Le due non sono intercambiabili senza un'analisi distinta.
- L'editor campiona la mesh deformata a 30 Hz e visualizza un rettangolo complessivo in pianta. Nella prova corrente misura circa 1,98 × 1,01 unità KayKit; il rettangolo è prudenziale, non una collisione precisa o un margine approvato.
- Verificato nell'editor: un divano inserito nel rettangolo produce un avviso; spostandolo fuori l'avviso scompare. Il tappeto è trattato come superficie ammessa. La clip viene riprodotta fino alla posa distesa.
- Restano da verificare la direzione della caduta rispetto al fronte, eventuali margini e i falsi positivi del rettangolo; non è ancora una regola validata né impedisce il salvataggio della bozza.
- Le clip statiche sono il primo gruppo da analizzare progressivamente; la corsa e le animazioni con spostamento sono una fase successiva.

## Prototipo blob — processo isolato

- Prima prova: un solo `Mannequin_Medium`, clip `Death_A`, senza casi speciali o accessori aggiunti.
- Il generatore separato campiona a 30 Hz; per ogni mesh del manichino riempie la scatola che la contiene nella posa corrente, con margine 0,05 unità. Unisce le celle in una griglia 3D con passo 0,12 unità.
- Le celle sono volumi pieni; la rappresentazione è volutamente approssimata e può occupare spazio vuoto. Non è un inviluppo preciso della superficie né una garanzia tra i campioni.
- Il blob può essere visualizzato in 3D e proiettato in pianta, esportato e riaperto come JSON. L'editor verifica la sovrapposizione con una scatola approssimata per ciascun arredo solido; tappeto e pavimento sono esentati per questa prova.
- Verificato nel browser: generazione del blob, segnalazione di un divano in conflitto e scomparsa dell'avviso dopo spostamento. Le celle e i parametri non sono ancora approvati per uso definitivo.
- Il controllo del corpo effettivamente contenuto tra i campioni, i punti di contatto obbligatori e l'analisi degli altri personaggi sono fasi successive, indipendenti dal prototipo di utilizzo.

## Pipeline candidata e prova seduta

- Separare i servizi: generazione blob; risoluzione dell'associazione animazione/personaggio/blob; requisiti della clip e degli asset; verifica rispetto alla scena. Il prototipo usa moduli separati, non servizi distribuiti.
- Per ora l'associazione è limitata a `Mannequin_Medium`: il blob `Death_A` è in libreria; quelli generati o importati nell'editor sono memorizzati nel browser per la coppia clip/manichino. Versioni e distribuzione condivisa degli altri blob restano da progettare.
- La clip nativa `Sit_Chair_Down` e la clip `siedi` fornita dall'utente sono selezionabili separatamente. La posizione finale stimata dell'osso `hips` è un riferimento provvisorio, non un punto di contatto con la seduta verificato.
- La poltrona di prova segue il personaggio, ma usa un'approssimazione dell'altezza; è attualmente esclusa per intero dai controlli del blob quando è collegata. Ciò non dimostra l'assenza di compenetrazioni: servono zone di contatto consentito e verifica visiva.
- La libreria Quaternius UAL1 contiene `Sitting_Enter`, `Sitting_Exit`, `Sitting_Idle_Loop` e `Sitting_Talking_Loop`: sono candidate da riadattare e confrontare sul rig medium; non sono ancora verificate.
- In pianta le superfici sono disegnate sotto gli arredi, il personaggio è sopra; la selezione usa lo stesso ordine. I livelli elencano gli oggetti della scena.
- TODO e bug dell'editor sono memorizzati in `todo-scene.json`; l'interfaccia e il server verificano la versione del file prima di salvare, per evitare di sovrascrivere modifiche concorrenti.
- Sentinella v0 esegue un singolo TODO alla volta tramite Codex in una copia di prova parziale; il risultato rimane da verificare e non è applicato automaticamente al progetto. I limiti operativi sono descritti in `SENTINELLA-V0.md`.

## Requisiti candidati per la futura skill

- Consultare le caratteristiche della scena e i requisiti delle animazioni, senza trattare dati mancanti come compatibilità dimostrata.
- Distinguere incompatibilità verificata, compatibilità verificata e situazione da verificare, spiegando le ragioni.
- Confrontare proporzioni e punti di contatto con il personaggio di riferimento; controllare la scena da più viste e verificare visivamente il risultato.
- Riconoscere che l'ingombro di un'animazione cambia nel tempo: una zona complessiva è utile come controllo preliminare, non dimostra da sola una collisione.
- Conservare provenienza degli asset, parametri della scena, requisiti e prove effettuate, distinguendo misure automatiche, valori inseriti e giudizi visivi.
- Per più personaggi considerare posizioni e orientamenti individuali, spazio condiviso, percorsi, tempi e conflitti simultanei. La presenza di spazio totale sufficiente non garantisce coordinamento.
- Non dichiarare completata una verifica che non sia stata effettivamente eseguita.

## Questioni aperte

- Come rappresentare zone libere, ostacoli, sedute e altri punti d'uso senza vincolare prematuramente il formato?
- Come misurare ingombri delle clip: campionamento, precisione e rappresentazione nel tempo?
- Quali controlli impediscono una combinazione e quali producono solo un avviso?
- Come gestire posizioni iniziali, orientamento, contatti e sincronizzazione tra più personaggi?
- Come salvare e riutilizzare le scene, mantenendo riferimenti stabili agli asset e alle relative licenze?
- Come distinguere una scena adatta a un'anteprima da una scena pronta per interazioni effettive?

## Metodo di aggiornamento

Quando una conclusione emerge, annotare il contesto e la prova che la sostiene. Le decisioni possono essere riviste: spostare le ipotesi tra le conclusioni solo dopo una verifica significativa. Preparare la skill quando il flusso sarà stato provato su almeno una scena con seduta e una scena con azione nello spazio, poi estenderlo al coordinamento di squadra.
