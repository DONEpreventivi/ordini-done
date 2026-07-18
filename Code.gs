const V18_HEADERS = {
  UTENTI: ['Nome','Ruolo','PIN','Attivo','Modifica batch','Vede prezzi'],
  MATERIE_PRIME: ['Nome','Categoria','UM','Prezzo','Fornitore','Urgenza','Note','Attivo'],
  GIACENZE_BATCH: ['Batch','Categoria','Disponibili','Quantità minima','Ultimo aggiornamento','Operatore','Attivo'],
  STORICO_BATCH: ['ID aggiornamento','Data','Operatore','Batch','Disponibili'],
  PREPARAZIONI_BATCH: ['Preparazione','Necessaria','Ultimo aggiornamento','Operatore','Attivo'],
  ORDINI: ['ID','Data','Operatore','Ruolo','Macrocategoria','Pezzi totali','Stato','Note','Metodo condivisione','Prodotti JSON','Testo']
};

function doGet(e) {
  try { return json_(routeGet_(e && e.parameter ? e.parameter : {})); }
  catch (err) { return json_({ok:false, errore:String(err && err.message || err)}); }
}
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return json_(routePost_(body));
  } catch (err) { return json_({ok:false, errore:String(err && err.message || err)}); }
}

function routeGet_(p) {
  const action = String(p.action || '').trim();
  if (action === 'login' || action === 'ordini') {
    const user = login_(p.pin);
    return {ok:true, utente:user, ordini:readOrders_(user)};
  }
  if (action === 'catalogo') {
    const user = login_(p.pin);
    return {ok:true, catalogo:readCatalog_(user)};
  }
  if (action === 'bootstrap') {
    const user = login_(p.pin);
    return {ok:true, utente:user, catalogo:readCatalog_(user), materiePrime:readMaterials_(user), batches:readBatches_(), preparazioni:readPreparations_(), ordini:readOrders_(user)};
  }
  if (action === 'materiePrime') {
    const user = login_(p.pin);
    return {ok:true, materiePrime:readMaterials_(user)};
  }
  if (action === 'batches') {
    login_(p.pin);
    return {ok:true, batches:readBatches_(), preparazioni:readPreparations_()};
  }
  throw new Error('Azione GET non riconosciuta: ' + action);
}

function routePost_(b) {
  const user = login_(b.pin);
  const action = String(b.action || '').trim();
  if (action === 'salvaOrdine') return saveOrder_(b, user);
  if (action === 'eliminaOrdine') return deleteOrder_(b.ordineId || b.id, user);
  if (action === 'aggiornaBatch') return updateBatch_(b, user);
  if (action === 'aggiornaBatches') return updateBatches_(b, user);
  if (action === 'aggiornaPreparazione') return updatePreparation_(b, user);
  if (action === 'aggiornaPreparazioni') return updatePreparations_(b, user);
  throw new Error('Azione non valida: ' + action);
}

function setupV18() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(V18_HEADERS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      const h = V18_HEADERS[name];
      sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#202022').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    } else {
      ensureHeaders_(sh,V18_HEADERS[name]);
      sh.getRange(1,1,1,sh.getLastColumn()).setFontWeight('bold').setBackground('#202022').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
  });
  return 'Setup V18 completato';
}

function login_(pin) {
  pin = String(pin || '').trim();
  if (!pin) throw new Error('PIN mancante');
  const rows = objects_('UTENTI');
  const row = rows.find(r => String(get_(r,'PIN')).trim() === pin);
  if (!row || !yes_(get_(row,'Attivo'))) throw new Error('PIN non valido o utente non attivo');
  const ruolo = String(get_(row,'Ruolo') || 'OPERATORE').trim();
  const admin = ruolo.toUpperCase() === 'ADMIN';
  return {
    nome: String(get_(row,'Nome') || 'Utente').trim(),
    ruolo: ruolo,
    admin: admin,
    modificaBatch: admin || yes_(get_(row,'Modifica batch')),
    vedePrezzi: admin || yes_(get_(row,'Vede prezzi'))
  };
}

function readCatalog_(user) {
  const ss = SpreadsheetApp.getActive();
  const names = ['CATALOGO','PRODOTTI'];
  let sh = null;
  for (let i=0;i<names.length;i++) { sh=ss.getSheetByName(names[i]); if(sh) break; }
  if (!sh || sh.getLastRow()<2) return [];
  const values=sh.getDataRange().getValues(), headers=values[0], idx=headers_(headers);
  return values.slice(1).filter(r=>r.some(v=>String(v).trim()!=='' )).map(r=>{
    const o={
      macrocategoria:String(val_(r,idx,['macrocategoria','macro'])||'').trim(),
      sottocategoria:String(val_(r,idx,['sottocategoria','categoria'])||'').trim(),
      prodotto:String(val_(r,idx,['prodotto','nome'])||'').trim(),
      formato:String(val_(r,idx,['formato'])||'').trim(),
      unitaOrdine:String(val_(r,idx,['unita ordine','unitaordine','unità ordine','um'])||'').trim(),
      fornitore:String(val_(r,idx,['fornitore'])||'').trim(),
      menuDrink:yes_(val_(r,idx,['menu drink','menudrink','menu']))
    };
    if (user.vedePrezzi) {
      o.prezzoNetto=num_(val_(r,idx,['prezzo netto','prezzonetto','prezzo','costo']));
      o.iva=num_(val_(r,idx,['iva'])) || 22;
    }
    return o;
  }).filter(x=>x.prodotto && x.macrocategoria);
}

function readMaterials_(user) {
  return objects_('MATERIE_PRIME').filter(r=>yes_(get_(r,'Attivo')) && String(get_(r,'Nome')).trim()).map(r=>{
    const o={
      nome:String(get_(r,'Nome')).trim(), categoria:String(get_(r,'Categoria')||'').trim(),
      um:String(get_(r,'UM')||'unità').trim(), fornitore:String(get_(r,'Fornitore')||'').trim(),
      urgenza:String(get_(r,'Urgenza')||'').trim(), note:String(get_(r,'Note')||'').trim()
    };
    if(user.vedePrezzi) o.prezzo=num_(get_(r,'Prezzo'));
    return o;
  });
}

function readBatches_() {
  const sh = sheet_('GIACENZE_BATCH');
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  // Struttura vincolante del foglio:
  // A Batch | B Categoria | C Disponibili | D Quantità minima |
  // E Ultimo aggiornamento | F Operatore | G Attivo
  return values.slice(1).filter(row => {
    const batch = String(row[0] || '').trim();
    const active = row.length > 6 ? row[6] : true;
    return batch && yes_(active);
  }).map(row => {
    const minRaw = row[3];
    return {
      batch: String(row[0] || '').trim(),
      categoria: String(row[1] || '').trim() || 'SENZA CATEGORIA',
      disponibili: num_(row[2]),
      minimo: String(minRaw == null ? '' : minRaw).trim() === '' ? 2 : num_(minRaw),
      ultimoAggiornamento: formatDate_(row[4]),
      operatore: String(row[5] || '').trim()
    };
  });
}

function readPreparations_() {
  return objects_('PREPARAZIONI_BATCH').filter(r=>yes_(get_(r,'Attivo')) && String(get_(r,'Preparazione')).trim()).map(r=>({
    preparazione:String(get_(r,'Preparazione')).trim(),
    necessaria:yes_(get_(r,'Necessaria')),
    ultimoAggiornamento:formatDate_(get_(r,'Ultimo aggiornamento')),
    operatore:String(get_(r,'Operatore')||'').trim()
  }));
}


function updateBatches_(b,user) {
  if(!user.modificaBatch) throw new Error('Utente non autorizzato alla modifica batch');
  const updates=Array.isArray(b.batches)?b.batches:[];if(!updates.length) throw new Error('Nessun batch da aggiornare');
  const sh=sheet_('GIACENZE_BATCH'), data=sh.getDataRange().getValues();if(data.length<2) throw new Error('Nessun batch configurato');
  const idx=headers_(data[0]), rows={};for(let i=1;i<data.length;i++)rows[norm_(data[i][idx['batch']])]=i+1;
  updates.forEach(x=>{if(!rows[norm_(x.batch)])throw new Error('Batch non trovato: '+x.batch)});
  const now=new Date(), updateId=Utilities.getUuid();
  updates.forEach(x=>{const r=rows[norm_(x.batch)];sh.getRange(r,idx['disponibili']+1).setValue(num_(x.disponibili));sh.getRange(r,idx['ultimo aggiornamento']+1).setValue(now);sh.getRange(r,idx['operatore']+1).setValue(user.nome)});
  const hist=sheet_('STORICO_BATCH');ensureHeaders_(hist,V18_HEADERS.STORICO_BATCH);const rowsHist=updates.map(x=>[updateId,now,user.nome,String(x.batch),num_(x.disponibili)]);hist.getRange(hist.getLastRow()+1,1,rowsHist.length,rowsHist[0].length).setValues(rowsHist);
  return {ok:true, aggiornati:updates.length, idAggiornamento:updateId, data:iso_(now)};
}

function updateBatch_(b,user) {
  if(!user.modificaBatch) throw new Error('Utente non autorizzato alla modifica batch');
  const sh=sheet_('GIACENZE_BATCH'), data=sh.getDataRange().getValues();
  if(data.length<2) throw new Error('Nessun batch configurato');
  const idx=headers_(data[0]), name=norm_(b.batch);
  for(let i=1;i<data.length;i++) {
    if(norm_(data[i][idx['batch']])===name) {
      sh.getRange(i+1,idx['disponibili']+1).setValue(num_(b.disponibili));
      sh.getRange(i+1,idx['ultimo aggiornamento']+1).setValue(new Date());
      sh.getRange(i+1,idx['operatore']+1).setValue(user.nome);
      return {ok:true, batch:b.batch, disponibili:num_(b.disponibili)};
    }
  }
  throw new Error('Batch non trovato');
}


function updatePreparations_(b,user) {
  if(!user.modificaBatch) throw new Error('Utente non autorizzato alla modifica preparazioni');
  const updates=Array.isArray(b.preparazioni)?b.preparazioni:[];
  if(!updates.length) throw new Error('Nessuna preparazione da aggiornare');
  const sh=sheet_('PREPARAZIONI_BATCH'), data=sh.getDataRange().getValues();
  if(data.length<2) throw new Error('Nessuna preparazione configurata');
  const idx=headers_(data[0]), rows={};
  for(let i=1;i<data.length;i++) rows[norm_(data[i][idx['preparazione']])]=i+1;
  updates.forEach(x=>{if(!rows[norm_(x.preparazione)]) throw new Error('Preparazione non trovata: '+x.preparazione)});
  const now=new Date();
  updates.forEach(x=>{
    const r=rows[norm_(x.preparazione)];
    sh.getRange(r,idx['necessaria']+1).setValue(x.necessaria?'SI':'NO');
    sh.getRange(r,idx['ultimo aggiornamento']+1).setValue(now);
    sh.getRange(r,idx['operatore']+1).setValue(user.nome);
  });
  return {ok:true, aggiornate:updates.length, data:iso_(now)};
}

function updatePreparation_(b,user) {
  if(!user.modificaBatch) throw new Error('Utente non autorizzato alla modifica preparazioni');
  const sh=sheet_('PREPARAZIONI_BATCH'), data=sh.getDataRange().getValues();
  if(data.length<2) throw new Error('Nessuna preparazione configurata');
  const idx=headers_(data[0]), name=norm_(b.preparazione);
  for(let i=1;i<data.length;i++) {
    if(norm_(data[i][idx['preparazione']])===name) {
      sh.getRange(i+1,idx['necessaria']+1).setValue(b.necessaria?'SI':'NO');
      sh.getRange(i+1,idx['ultimo aggiornamento']+1).setValue(new Date());
      sh.getRange(i+1,idx['operatore']+1).setValue(user.nome);
      return {ok:true, preparazione:b.preparazione, necessaria:Boolean(b.necessaria)};
    }
  }
  throw new Error('Preparazione non trovata');
}

function saveOrder_(b,user) {
  const products=Array.isArray(b.prodotti) ? b.prodotti : (b.ordine && b.ordine.prodotti || []);
  const id=String(b.ordineId || (b.ordine && b.ordine.id) || Utilities.getUuid());
  const macro=String(b.macrocategoria || (b.ordine && b.ordine.macrocategoria) || '').trim();
  if(!macro) throw new Error('Macrocategoria mancante');
  const status=String(b.stato || (b.ordine && b.ordine.stato) || 'BOZZA').toUpperCase();
  const total=products.reduce((n,p)=>n+num_(p.quantita),0);
  const order={id:id,data:new Date(),operatore:user.nome,ruolo:user.ruolo,macrocategoria:macro,pezziTotali:total,stato:status,note:String(b.note||''),metodoCondivisione:String(b.metodoCondivisione||''),prodotti:products,testo:String(b.testo||'')};
  const sh=sheet_('ORDINI'); ensureHeaders_(sh,V18_HEADERS.ORDINI);
  const data=sh.getDataRange().getValues(), idx=headers_(data[0]);
  let row=-1;
  for(let i=1;i<data.length;i++) if(String(data[i][idx['id']]||'')===id){row=i+1;break;}
  if(row<0) row=sh.getLastRow()+1;
  setByHeader_(sh,row,idx,'ID',order.id); setByHeader_(sh,row,idx,'Data',order.data);
  setByHeader_(sh,row,idx,'Operatore',order.operatore); setByHeader_(sh,row,idx,'Ruolo',order.ruolo);
  setByHeader_(sh,row,idx,'Macrocategoria',order.macrocategoria); setByHeader_(sh,row,idx,'Pezzi totali',order.pezziTotali);
  setByHeader_(sh,row,idx,'Stato',order.stato); setByHeader_(sh,row,idx,'Note',order.note);
  setByHeader_(sh,row,idx,'Metodo condivisione',order.metodoCondivisione); setByHeader_(sh,row,idx,'Prodotti JSON',JSON.stringify(order.prodotti));
  setByHeader_(sh,row,idx,'Testo',order.testo);
  return {ok:true, ordine:serializeOrder_(order,user)};
}

function readOrders_(user) {
  if(!SpreadsheetApp.getActive().getSheetByName('ORDINI')) return [];
  return objects_('ORDINI').map(r=>{
    const products=parse_(get_(r,'Prodotti JSON'),[]);
    const o={
      id:String(get_(r,'ID')||''), data:iso_(get_(r,'Data')), operatore:String(get_(r,'Operatore')||''),
      ruolo:String(get_(r,'Ruolo')||''), macrocategoria:String(get_(r,'Macrocategoria')||''),
      pezziTotali:num_(get_(r,'Pezzi totali')) || products.reduce((n,p)=>n+num_(p.quantita),0),
      stato:String(get_(r,'Stato')||'BOZZA'), note:String(get_(r,'Note')||''), prodotti:products,
      testo:String(get_(r,'Testo')||'')
    };
    if(!user.vedePrezzi) o.prodotti=o.prodotti.map(p=>{const c=Object.assign({},p);delete c.prezzo;delete c.prezzoNetto;delete c.costo;return c;});
    return o;
  }).filter(o=>o.id).sort((a,b)=>new Date(b.data)-new Date(a.data));
}
function serializeOrder_(o,user){const x={id:o.id,data:iso_(o.data),operatore:o.operatore,ruolo:o.ruolo,macrocategoria:o.macrocategoria,pezziTotali:o.pezziTotali,stato:o.stato,note:o.note,prodotti:o.prodotti,testo:o.testo};if(!user.vedePrezzi)x.prodotti=x.prodotti.map(p=>{const c=Object.assign({},p);delete c.prezzo;delete c.prezzoNetto;return c;});return x;}
function deleteOrder_(id,user){if(!id)throw new Error('ID ordine mancante');const sh=sheet_('ORDINI'),v=sh.getDataRange().getValues(),idx=headers_(v[0]);for(let i=v.length-1;i>=1;i--)if(String(v[i][idx['id']]||'')===String(id)){sh.deleteRow(i+1);return {ok:true}}return {ok:true};}

function ensureHeaders_(sh,headers){if(sh.getLastRow()===0){sh.getRange(1,1,1,headers.length).setValues([headers]);return;}const current=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);headers.forEach(h=>{if(!current.some(x=>norm_(x)===norm_(h))){sh.getRange(1,sh.getLastColumn()+1).setValue(h);current.push(h);}});}
function setByHeader_(sh,row,idx,name,value){const key=norm_(name);if(idx[key]===undefined){const col=sh.getLastColumn()+1;sh.getRange(1,col).setValue(name);idx[key]=col-1;}sh.getRange(row,idx[key]+1).setValue(value);}
function sheet_(name){const sh=SpreadsheetApp.getActive().getSheetByName(name);if(!sh)throw new Error('Foglio mancante: '+name+'. Eseguire setupV18().');return sh;}
function objects_(name){const sh=sheet_(name),v=sh.getDataRange().getValues();if(v.length<2)return [];const h=v[0].map(x=>String(x).trim());return v.slice(1).filter(r=>r.some(x=>String(x).trim()!=='' )).map(r=>Object.fromEntries(h.map((x,i)=>[x,r[i]])));}
function get_(o,name){const k=Object.keys(o).find(x=>norm_(x)===norm_(name));return k?o[k]:'';}
function norm_(s){return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function yes_(v){return ['SI','SÌ','TRUE','VERO','1','YES'].includes(String(v||'').trim().toUpperCase());}
function num_(v){if(typeof v==='number')return isFinite(v)?v:0;let s=String(v||'0').trim();if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(',','.');const n=Number(s);return isFinite(n)?n:0;}
function headers_(row){const x={};row.forEach((v,i)=>x[norm_(v)]=i);return x;}
function val_(r,idx,names){for(let i=0;i<names.length;i++){const k=norm_(names[i]);if(idx[k]!==undefined)return r[idx[k]];}return '';}
function parse_(v,d){try{return JSON.parse(v||'')}catch(e){return d;}}
function iso_(v){return v instanceof Date?v.toISOString():String(v||'');}
function formatDate_(v){return v instanceof Date?Utilities.formatDate(v,Session.getScriptTimeZone()||'Europe/Rome','dd/MM/yyyy HH:mm'):String(v||'');}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
