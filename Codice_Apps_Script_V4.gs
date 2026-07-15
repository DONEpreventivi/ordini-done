const SHEETS={CATALOGO:'CATALOGO',ORDINI:'ORDINI',DETTAGLIO:'DETTAGLIO_ORDINI',UTENTI:'UTENTI'};

function setupDatabase(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss,SHEETS.CATALOGO,['Macrocategoria','Sottocategoria','Prodotto','Formato','Unità ordine','Prezzo netto','IVA','Menu drink','Attivo']);
  ensureSheet(ss,SHEETS.UTENTI,['Nome','Ruolo','PIN','Attivo']);
  ensureSheet(ss,SHEETS.ORDINI,['ID ordine','Data ora','Operatore','Ruolo','Macrocategoria','Pezzi totali','Imponibile','IVA','Totale','Stato','Note','Metodo condivisione']);
  ensureSheet(ss,SHEETS.DETTAGLIO,['ID ordine','Data ora','Operatore','Macrocategoria','Sottocategoria','Prodotto','Formato','Unità ordine','Quantità','Prezzo netto','IVA','Totale netto','Totale IVA','Totale lordo','Menu drink']);
}
function doGet(e){
  try{
    const a=String(e&&e.parameter&&e.parameter.action||'health').toLowerCase();
    if(a==='health')return json({ok:true});
    if(a==='catalogo')return json({ok:true,catalogo:leggiCatalogo(),aggiornatoIl:new Date().toISOString()});
    if(a==='ordini'){const l=verificaLogin(e.parameter.pin);if(!l.ok)return json(l);return json({ok:true,utente:l.utente,ordini:leggiOrdini(l.utente)})}
    return json({ok:false,errore:'Azione GET non riconosciuta'});
  }catch(err){return json({ok:false,errore:err.message})}
}
function doPost(e){
  try{
    const b=JSON.parse(e&&e.postData&&e.postData.contents||'{}'),a=String(b.action||'').toLowerCase();
    if(a==='login')return json(verificaLogin(b.pin));
    if(a==='salvaordine')return json(salvaOrdine(b));
    if(a==='eliminaordine')return json(eliminaOrdine(b));
    return json({ok:false,errore:'Azione POST non riconosciuta'});
  }catch(err){return json({ok:false,errore:err.message})}
}
function leggiCatalogo(){
  const v=getSheet(SHEETS.CATALOGO).getDataRange().getValues();if(v.length<2)return[];const h=v[0].map(normalizzaHeader);
  return v.slice(1).map(r=>rowToObject(h,r)).filter(r=>String(r.prodotto||'').trim()).filter(r=>r.attivo===undefined||String(r.attivo).trim()===''||booleanValue(r.attivo)).map(r=>({
    macrocategoria:stringValue(r.macrocategoria).toUpperCase(),sottocategoria:stringValue(r.sottocategoria).toUpperCase(),prodotto:stringValue(r.prodotto),formato:stringValue(r.formato),unitaOrdine:stringValue(r.unitaordine||r.unita||r.unitadiordine),prezzoNetto:numberValue(r.prezzonetto||r.prezzo),iva:numberValue(r.iva),menuDrink:booleanValue(r.menudrink||r.menu)
  }))
}
function verificaLogin(pin){
  const x=String(pin||'').trim();if(!x)return{ok:false,errore:'Inserisci il PIN'};
  const v=getSheet(SHEETS.UTENTI).getDataRange().getDisplayValues(),h=v[0].map(normalizzaHeader);
  for(let i=1;i<v.length;i++){const r=rowToObject(h,v[i]);if(booleanValue(r.attivo)&&String(r.pin||'').trim()===x){const ruolo=stringValue(r.ruolo).toUpperCase();return{ok:true,utente:{nome:stringValue(r.nome),ruolo:ruolo,admin:ruolo==='ADMIN'}}}}
  return{ok:false,errore:'PIN non valido'}
}
function salvaOrdine(p){
  const l=verificaLogin(p.pin);if(!l.ok)return l;
  const prodotti=Array.isArray(p.prodotti)?p.prodotti:[];if(!prodotti.length)return{ok:false,errore:"L'ordine non contiene prodotti"};
  const map={};leggiCatalogo().forEach(x=>map[chiaveProdotto(x)]=x);
  const righe=[];let pezzi=0,imp=0,ivaT=0;
  prodotti.forEach(x=>{const q=Math.max(0,parseInt(x.quantita,10)||0);if(!q)return;const c=map[chiaveProdotto(x)];if(!c)throw new Error('Prodotto non trovato: '+x.prodotto);const net=c.prezzoNetto*q,iv=net*c.iva/100;pezzi+=q;imp+=net;ivaT+=iv;righe.push(Object.assign({},c,{quantita:q,totaleNetto:net,totaleIva:iv,totaleLordo:net+iv}))});
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    setupDatabase();const id=stringValue(p.ordineId)||creaIdOrdine(),now=new Date(),tot=imp+ivaT,macro=stringValue(p.macrocategoria||righe[0].macrocategoria).toUpperCase(),stato=stringValue(p.stato||'BOZZA').toUpperCase(),note=stringValue(p.note),metodo=stringValue(p.metodoCondivisione);
    const sh=getSheet(SHEETS.ORDINI),data=sh.getDataRange().getValues();let row=0;
    for(let i=1;i<data.length;i++)if(String(data[i][0])===id){row=i+1;break}
    const values=[id,now,l.utente.nome,l.utente.ruolo,macro,pezzi,roundMoney(imp),roundMoney(ivaT),roundMoney(tot),stato,note,metodo];
    if(row)sh.getRange(row,1,1,values.length).setValues([values]);else sh.appendRow(values);
    eliminaDettagli(id);
    const det=getSheet(SHEETS.DETTAGLIO),rows=righe.map(r=>[id,now,l.utente.nome,r.macrocategoria,r.sottocategoria,r.prodotto,r.formato,r.unitaOrdine,r.quantita,roundMoney(r.prezzoNetto),r.iva,roundMoney(r.totaleNetto),roundMoney(r.totaleIva),roundMoney(r.totaleLordo),r.menuDrink?'SI':'NO']);
    det.getRange(det.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
    return{ok:true,ordine:{id:id,data:now.toISOString(),operatore:l.utente.nome,ruolo:l.utente.ruolo,macrocategoria:macro,pezziTotali:pezzi,imponibile:roundMoney(imp),iva:roundMoney(ivaT),totale:roundMoney(tot),stato:stato,note:note,metodoCondivisione:metodo,prodotti:righe}};
  }finally{lock.releaseLock()}
}
function eliminaOrdine(p){
  const l=verificaLogin(p.pin);if(!l.ok)return l;const id=stringValue(p.ordineId);if(!id)return{ok:false,errore:'ID ordine mancante'};
  const sh=getSheet(SHEETS.ORDINI),v=sh.getDataRange().getValues();for(let i=v.length-1;i>=1;i--)if(String(v[i][0])===id)sh.deleteRow(i+1);eliminaDettagli(id);return{ok:true}
}
function eliminaDettagli(id){const sh=getSheet(SHEETS.DETTAGLIO),v=sh.getDataRange().getValues();for(let i=v.length-1;i>=1;i--)if(String(v[i][0])===id)sh.deleteRow(i+1)}
function leggiOrdini(u){
  setupDatabase();const ov=getSheet(SHEETS.ORDINI).getDataRange().getValues(),dv=getSheet(SHEETS.DETTAGLIO).getDataRange().getValues();if(ov.length<2)return[];
  const oh=ov[0].map(normalizzaHeader),dh=dv[0].map(normalizzaHeader),dm={};
  dv.slice(1).forEach(row=>{const r=rowToObject(dh,row),id=stringValue(r.idordine);if(!id)return;(dm[id]||(dm[id]=[])).push(Object.assign({macrocategoria:stringValue(r.macrocategoria),sottocategoria:stringValue(r.sottocategoria),prodotto:stringValue(r.prodotto),formato:stringValue(r.formato),unitaOrdine:stringValue(r.unitaordine),quantita:numberValue(r.quantita),menuDrink:booleanValue(r.menudrink)},u.admin?{prezzoNetto:numberValue(r.prezzonetto),iva:numberValue(r.iva),totaleNetto:numberValue(r.totalenetto),totaleIva:numberValue(r.totaleiva),totaleLordo:numberValue(r.totalelordo)}:{}))});
  return ov.slice(1).filter(r=>stringValue(r[0])).map(row=>{const r=rowToObject(oh,row),id=stringValue(r.idordine),o={id:id,data:r.dataora instanceof Date?r.dataora.toISOString():stringValue(r.dataora),operatore:stringValue(r.operatore),ruolo:stringValue(r.ruolo),macrocategoria:stringValue(r.macrocategoria),pezziTotali:numberValue(r.pezzitotali),stato:stringValue(r.stato),note:stringValue(r.note),metodoCondivisione:stringValue(r.metodocondivisione),prodotti:dm[id]||[]};if(u.admin){o.imponibile=numberValue(r.imponibile);o.iva=numberValue(r.iva);o.totale=numberValue(r.totale)}return o}).reverse()
}
function ensureSheet(ss,n,h){let sh=ss.getSheetByName(n)||ss.insertSheet(n);if(sh.getLastRow()===0){sh.getRange(1,1,1,h.length).setValues([h]);return}if(sh.getLastColumn()<h.length)sh.getRange(1,1,1,h.length).setValues([h])}
function getSheet(n){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n);if(!sh)throw new Error('Foglio "'+n+'" non trovato');return sh}
function creaIdOrdine(){return'ORD-'+Utilities.formatDate(new Date(),SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone()||'Europe/Rome','yyyyMMdd-HHmmss')+'-'+Math.floor(1000+Math.random()*9000)}
function chiaveProdotto(x){return[stringValue(x.macrocategoria).toUpperCase(),stringValue(x.sottocategoria).toUpperCase(),stringValue(x.prodotto).toUpperCase(),stringValue(x.formato).toUpperCase()].join('||')}
function rowToObject(h,r){const o={};h.forEach((x,i)=>o[x]=r[i]);return o}
function normalizzaHeader(v){return stringValue(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function stringValue(v){return String(v==null?'':v).trim()}
function numberValue(v){if(typeof v==='number')return v;let s=stringValue(v).replace('€','').replace('%','').replace(/\s/g,'');if(s.indexOf(',')>=0&&s.indexOf('.')>=0)s=s.replace(/\./g,'').replace(',','.');else s=s.replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0}
function booleanValue(v){return['SI','SÌ','TRUE','VERO','1','ATTIVO'].includes(stringValue(v).toUpperCase())}
function roundMoney(v){return Math.round((Number(v)+Number.EPSILON)*100)/100}
function json(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON)}
