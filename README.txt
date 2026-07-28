D.ONE ORDINI — V1.9

NOVITÀ
- I prodotti possono essere salvati senza prezzo.
- Prezzo mancante evidenziato in rosso nel catalogo, nelle categorie, nel riepilogo e nell'archivio.
- I totali con prezzi mancanti sono indicati come parziali.
- Quando si completa il prezzo nel catalogo, vengono aggiornati automaticamente soltanto i prezzi vuoti degli ordini vecchi.
- I prezzi storici già presenti non vengono mai sostituiti.

DATABASE LOCAL-FIRST
- Nessuna chiamata automatica al server.
- L'app lavora sempre sulla copia locale.
- "Condividi sul server" invia manualmente:
  catalogo, bozze, ordini effettuati, CHECK e note condivise.
- "Scarica aggiornamenti" recupera manualmente le modifiche.
- Ogni nota può essere PERSONALE oppure CONDIVISA.
- Conflitti: prevale l'elemento con updatedAt più recente.
- Le eliminazioni vengono sincronizzate tramite soft-delete.

SERVER
1. Caricare tutta la cartella su un hosting PHP.
2. Aprire server/api.php e cambiare:
   $TOKEN = 'CAMBIA-QUESTA-CHIAVE';
3. Nell'app, sezione Database > Configura:
   - API: ./server/api.php
   - Chiave: la stessa impostata in api.php
4. Verificare che la cartella server sia scrivibile da PHP.
5. Non usare GitHub Pages per il file PHP: serve un hosting con PHP.


D.ONE ORDINI — V1.10

CORREZIONE CHECK
- Nel dettaglio CHECK scorre soltanto l'elenco dei prodotti.
- Titolo, avanzamento e pulsanti non partecipano allo scroll.
- La barra con “Rimuovi consegnati” e “Prodotti non consegnati” rimane ferma in basso.
- Bloccato lo scroll elastico della pagina durante il controllo consegna.
- Mantenute tutte le funzioni introdotte nella V1.9.


D.ONE ORDINI — V1.11

CORREZIONE SCROLL
- CHECK: resta invariato lo scroll indipendente già introdotto nella V1.10.
- PRODOTTI: scorrono solo le schede prodotto; titolo, ricerca e pulsante “Nuovo prodotto” restano fermi.
- BACHECA: scorrono solo i promemoria; titolo e pulsante “Nuovo promemoria” restano fermi.
- Bloccato lo spostamento dell’intera pagina nei tre tab.
- Ottimizzato lo scroll fluido su iPhone.


D.ONE ORDINI — V1.12

SINCRONIZZAZIONE
- Card database spostata in cima alla Home.
- Eliminato il doppio comando operativo dalla Home.
- Un solo pulsante “Sincronizza”.
- Il pulsante esegue in sequenza:
  1. invio modifiche locali;
  2. download aggiornamenti;
  3. fusione dati;
  4. aggiornamento della copia locale.
- Stato visibile subito all'apertura:
  dati solo locali / modifiche locali / database allineato / errore.
- Mostrato l'orario dell'ultima sincronizzazione.
- Progressione visiva durante invio e download.
- URL API e chiave restano nella configurazione del database.


D.ONE ORDINI — V1.13

CORREZIONE HOME
- Eliminato completamente il vecchio riquadro Database in fondo alla Home.
- La card Sincronizza è ora il primo elemento reale della Home.
- Compare prima di “Pannello operativo”, “Ordini” e di qualsiasi altro contenuto.
- Un solo comando operativo: Sincronizza.
- La configurazione del collegamento resta accessibile tramite un link secondario.
- Aggiunta progressione visiva durante invio e download.
