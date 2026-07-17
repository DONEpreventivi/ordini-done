ORDINI D.ONE V18

FILE PRINCIPALI
- index.html: frontend PWA mobile-first completo.
- Code.gs: backend Google Apps Script V18.
- manifest.webmanifest, sw.js, icone e logo: asset PWA.

NUOVI FOGLI / INTESTAZIONI
UTENTI: Nome | Ruolo | PIN | Attivo | Modifica batch | Vede prezzi
MATERIE_PRIME: Nome | Categoria | UM | Prezzo | Fornitore | Urgenza | Note | Attivo
GIACENZE_BATCH: Batch | Disponibili | Ultimo aggiornamento | Operatore | Attivo
ORDINI: ID | Data | Operatore | Stato | Macrocategoria | Prodotti JSON | Testo

PUBBLICAZIONE
1. Aprire il progetto Apps Script collegato al Google Sheet.
2. Sostituire/integrare il backend con Code.gs.
3. Eseguire una volta setupV18() autorizzando lo script.
4. Distribuisci > Nuova distribuzione > App web.
5. Esegui come proprietario; accesso secondo le esigenze del locale.
6. Copiare l'URL /exec nella costante API_URL di index.html oppure salvarlo in localStorage con chiave done-api-url.
7. Pubblicare i file PWA su hosting HTTPS.

MIGRAZIONE V17
- Il catalogo storico viene letto dai fogli CATALOGO o PRODOTTI tramite intestazioni.
- Gli ordini V18 salvano una copia completa dei prodotti, quindi restano apribili anche dopo aggiornamenti catalogo.
- Il frontend mantiene dati e sessione localmente e continua a funzionare con i dati già sincronizzati in assenza di rete.

CORREZIONE LOGIN 18.0.1
- Il frontend usa action=ordini per il login, compatibile con il deployment V17 già pubblicato.
- Il nuovo Code.gs riconosce sia action=login sia action=ordini.
- Per usare Produzione, MATERIE_PRIME e permessi V18 è comunque necessario salvare Code.gs e creare una nuova versione del deployment Web App.


V18.0.2 - Correzione estetica Home
- Tutte le funzioni V18 restano invariate.
- Rimosse le descrizioni colorate dai pulsanti principali.
- Macro SPIRITS, VINO, BIRRA e SPEZIE disposte verticalmente, una sotto l'altra.
