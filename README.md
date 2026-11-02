# GonéPadelCup

GonéPadelCup: nuova competizione maschile, femminile e mista. Dal 2 novembre 2026 i giocatori sono conservati, mentre partite, punti, presenze, finali, bonus e vittorie ripartono da zero. Le nuove regole sono in attesa di configurazione.

App statica pubblicata con GitHub Pages, dati su Supabase. Nessuna compilazione: i file del repository sono esattamente quelli che il browser carica.

## Struttura

| File | Cosa contiene |
|---|---|
| `index.html` | La pagina: struttura, barra in basso, caricamento degli script |
| `css/style.css` | Tutto lo stile, tema chiaro e scuro |
| `js/01-base.js` | Stato condiviso, utilità, salvataggio sul telefono |
| `js/02-punteggi.js` | Scala dei punti, bonus presenze, classifica, i tre tornei, albo d'oro |
| `js/03-tabellone.js` | Tabellone per somma punti, turni della finale, abbinamenti automatici |
| `js/04-schermate.js` | Le schermate: Giornate, giornata aperta, Classifica, Giocatori, Altro |
| `js/05-fogli.js` | I pannelli a comparsa: tornei, scheda giocatore, nuova giornata, decreto campioni, stampe |
| `js/06-azioni.js` | Cosa succede a ogni tocco, modulo o campo di testo |
| `js/07-stampa-classifica.js` | Immagine della classifica e stelline disegnate |
| `js/08-sync.js` | Sincronizzazione con Supabase: coda offline, regole, accesso gestore |
| `js/09-locandina.js` | Locandina del tabellone, salvataggio e condivisione di immagini e PDF |
| `js/10-backup.js` | Testi da copiare, esportazione e importazione del backup |
| `js/11-avvio.js` | Avvio dell'app e registrazione del service worker |
| `sw.js` | Service worker: l'app si apre anche senza rete |
| `manifest.webmanifest`, `icons/` | App installabile sulla schermata Home |
| `tests/` | Test automatici della logica |

Gli script sono normali file JavaScript che condividono lo stesso ambiente e vanno caricati **in questo ordine**: `index.html` li elenca già così.

## Regole da rispettare quando si modifica

- **Nuovo file JavaScript**: va aggiunto sia in `index.html` sia nell'elenco `GUSCIO` di `sw.js`, altrimenti offline non c'è.
- **Versione dei dati**: ogni riga mandata al database porta `v = VERSIONE_DATI` (attualmente 4). Il database rifiuta versioni inferiori a 4; una policy restrittiva richiede inoltre la generazione corrente nelle richieste dei client autenticati, anche per le cancellazioni.
- **Il telefono del gestore comanda solo se è già sincronizzato**: un dispositivo che non ha mai completato una sincronizzazione butta la sua coda e prende i dati dal database. È la regola che protegge i dati quando il gestore cambia telefono.
- **Il bonus non si scrive nei punti**: nel database restano i punti fatti in campo; il bonus si applica sopra con soglia e punti del riquadro BONUS. Così cambiando i numeri o annullando una giornata tutto si ricalcola giusto.
- **Nessun albo incorporato**: vittorie e stelle derivano soltanto dai dati della nuova competizione.
- **Separazione delle competizioni**: memoria locale e coda nuove; i backup precedenti non si importano. Il database ammette le scritture soltanto dai client con la nuova generazione, oltre all'accesso autenticato già richiesto.
- **Nuove regole**: `settings.regolePronte` resta `false` fino alla prossima configurazione. La gestione dell'anagrafica resta disponibile.

## Test

Serve solo Node 20 o più recente, nessuna installazione:

```
npm test
```

I test caricano gli script dell'app in un ambiente isolato e controllano scala dei punti, chiusura e annullamento delle giornate, bonus, classifica, abbinamenti (anche misto), tabellone, finale a 8, riparazione dei tornei doppi, unione delle schede e regole di sincronizzazione.

## Database (Supabase)

Tabelle: `players` (anagrafica), `champs` (i tre tornei, con punti e presenze in `carry`, soglia e bonus, data e orario delle finali), `events` (giornate aperte e finale a 8), `settings` (impostazioni e locandine), `albo` (vincitori di ogni edizione). Lettura per tutti, scrittura solo per chi ha fatto l'accesso. La vista `classifica` restituisce la classifica di ogni torneo con bonus e totale già calcolati.

La chiave in `08-sync.js` è quella *publishable*: è pubblica per definizione e può stare nel codice. La chiave segreta non va mai messa nel repository.

## Pubblicazione

Tutti i file stanno nella radice del repository; GitHub Pages pubblica il ramo `main`. Dopo ogni modifica conviene lanciare `npm test` prima del commit.
