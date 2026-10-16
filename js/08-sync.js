/* Mundialito — Sincronizzazione con Supabase: coda, regole, accesso gestore */
"use strict";
/* ---------- sincronizzazione Supabase ---------- */
const SB_URL = "https://fmjraciijqjelnthxwhq.supabase.co";
const SB_KEY = "sb_publishable_WP0-Q7i10-F2RTJgCCwAiw_tcEdHHox";
const QKEY = KEY + ".coda", GKEY = KEY + ".gestore", RKEY = KEY + ".rev";
const VERSIONE_DATI = 3;   // deve combaciare con il controllo "v >= 3" sul database

let SB = null, SESSION = null, QUEUE = [], SNAP = null, flushing = false;
let SYNC = {stato:"avvio", msg:""};

const ls = (k,v) => { try{ return v === undefined ? localStorage.getItem(k) : (v === null ? localStorage.removeItem(k) : localStorage.setItem(k,v)); }catch(e){ return null; } };
const canWrite = () => !!SESSION || ls(GKEY) === "1";   // permesso nell'interfaccia
const canSync  = () => !!SB && !!SESSION;               // permesso di scrivere sul database
const dirty    = () => ls(RKEY) !== null && String(D.rev || 0) !== String(ls(RKEY));
const setSynced = () => ls(RKEY, String(D.rev || 0));
function setSync(stato, msg){ SYNC = {stato, msg:msg || "", at:Date.now()}; }

function qLoad(){ try{ QUEUE = JSON.parse(ls(QKEY) || "[]"); }catch(e){ QUEUE = []; } }
function qSave(){ ls(QKEY, JSON.stringify(QUEUE)); }

/* --- conversione stato <-> righe --- */
function rowsOf(st){
  const out = {players:[], champs:[], events:[], settings:[], albo:[]};
  st.players.forEach(p => out.players.push({id:p.id, name:p.name, sex:p.sex || "M", archived:!!p.archived, v:VERSIONE_DATI}));
  st.champs.forEach((c,i) => out.champs.push({id:c.id, name:c.name, ed:c.ed || "", type:c.type,
    soglia:c.soglia, bonus:c.bonus, settimane:c.settimane || 8, giornate_base:c.base || 0,
    data_finale:c.dataFinale || null, ora_finale:c.oraFinale || null,
    bonus_ass:c.bonusAss || null, ultima:c.ultima || null, carry:c.carry || {}, ordine:i, v:VERSIONE_DATI}));
  st.champs.forEach(c => (c.events || []).forEach(e => out.events.push({
    id:e.id, champ_id:c.id, name:e.name, data:e.date || null, ora:e.ora || null,
    mult:e.mult || 1, campi:e.campi || 5, status:e.status || "bozza", finale:!!e.finale,
    presenti:e.presenti || [], pairs:e.pairs || [], matches:e.matches || [], seeds:e.seeds || {},
    storico:e.storico || [], ordine:e.ordine || null, punti:e.punti || null, created:e.created || 0, v:VERSIONE_DATI})));
  out.settings.push({id:1, data:st.settings || {}, v:VERSIONE_DATI});
  out.albo = (st.albo || []).map(a => ({id:a.id, champ_id:a.champ_id || null, tipo:a.tipo,
    edizione:String(a.edizione), data:a.data || null, giocatori:a.giocatori || [], nomi:a.nomi || [], v:VERSIONE_DATI}));
  return out;
}
function stateFromRows(r){
  const d = {v:2, rev:(D && D.rev) || 0, settings:(r.settings[0] && r.settings[0].data) || {campi:5},
    players:[], champs:[], cur:null};
  d.players = r.players.map(p => ({id:p.id, name:p.name, sex:p.sex || "M", archived:!!p.archived}));
  d.champs = [...r.champs].sort((a,b) => (a.ordine || 0) - (b.ordine || 0)).map(c => ({
    id:c.id, name:c.name, ed:c.ed || "", type:c.type, soglia:c.soglia, bonus:c.bonus,
    settimane:c.settimane || 8, base:c.giornate_base || 0, dataFinale:c.data_finale || "", oraFinale:c.ora_finale || "",
    bonusAss:c.bonus_ass || null, ultima:c.ultima || null,
    carry:c.carry || {}, events:[]}));
  const idx = {}; d.champs.forEach(c => idx[c.id] = c);
  r.events.forEach(e => {
    const c = idx[e.champ_id]; if(!c) return;
    c.events.push({id:e.id, created:Number(e.created) || 0, name:e.name, date:e.data || "",
      ora:e.ora || "", mult:e.mult || 1, campi:e.campi || 5, status:e.status || "bozza", finale:!!e.finale,
      presenti:e.presenti || [], pairs:e.pairs || [], matches:e.matches || [], seeds:e.seeds || {},
      storico:e.storico || [], ordine:e.ordine || null, punti:e.punti || null});
  });
  d.albo = (r.albo || []).map(a => ({id:a.id, champ_id:a.champ_id, tipo:a.tipo, edizione:String(a.edizione),
    data:a.data || "", giocatori:a.giocatori || [], nomi:a.nomi || []}));
  d.cur = d.champs.length ? d.champs[0].id : null;
  return d;
}
function snapOf(rows){
  const s = {};
  for(const t in rows){ s[t] = {}; rows[t].forEach(r => s[t][String(r.id)] = JSON.stringify(r)); }
  return s;
}

/* --- accoda le differenze; funziona anche senza rete --- */
function pushDiff(){
  if(!canWrite()) return;
  const now = snapOf(rowsOf(D));
  const prev = SNAP || {players:{}, champs:{}, events:{}, settings:{}};
  for(const t in now){
    const p = prev[t] || {};
    for(const id in now[t]) if(p[id] !== now[t][id]) QUEUE.push({op:"up", t, row:JSON.parse(now[t][id])});
    for(const id in p) if(!(id in now[t])) QUEUE.push({op:"del", t, id});
  }
  SNAP = now; compatta(); qSave(); flush();
}
function compatta(){
  const m = new Map();
  QUEUE.forEach(o => m.set(o.t + "|" + (o.op === "del" ? o.id : o.row.id), o));
  QUEUE = [...m.values()];
}
async function flush(){
  if(flushing || !canSync() || !QUEUE.length) return;
  flushing = true; compatta(); qSave();
  const rev = D.rev || 0;
  try{
    while(QUEUE.length){
      const o = QUEUE[0];
      const res = o.op === "up"
        ? await SB.from(o.t).upsert(o.row)
        : await SB.from(o.t).delete().eq("id", o.id);
      if(res.error) throw res.error;
      QUEUE.shift(); qSave();
    }
    ls(RKEY, String(rev));
    setSync("ok");
  }catch(e){
    setSync("errore", (e && e.message) || "rete non raggiungibile");
  }
  flushing = false;
  if(!openEvent && !sheet && tab === "altro") render();
}
async function pull(){
  const [p,c,e,s,a] = await Promise.all([
    SB.from("players").select("*"), SB.from("champs").select("*"),
    SB.from("events").select("*"), SB.from("settings").select("*"), SB.from("albo").select("*")]);
  const err = p.error || c.error || e.error || s.error || a.error;
  if(err) throw err;
  return {players:p.data || [], champs:c.data || [], events:e.data || [], settings:s.data || [], albo:a.data || []};
}

async function syncNow(silenzioso){
  if(!SB){ setSync("locale"); if(!silenzioso) toast("Database non raggiungibile"); render(); return; }
  try{
    setSync("corso"); if(!silenzioso) render();
    let r = await pull();
    let vuoto = !r.champs.length && !r.players.length;
    // un dispositivo che non ha mai completato una sincronizzazione non ha niente da imporre:
    // se il database ha già i dati, la sua coda è vecchia e va scartata
    if(ls(RKEY) === null && !vuoto && QUEUE.length){ QUEUE = []; qSave(); }
    if(QUEUE.length && canSync()){
      await flush();
      r = await pull();
      vuoto = !r.champs.length && !r.players.length;
    }
    const remoto = stateFromRows(r);

    if(canSync() && (vuoto || dirty() || QUEUE.length)){
      // il dispositivo del gestore ha la versione buona: allineo il database
      SNAP = snapOf(rowsOf(remoto));
      normalizzaTornei();
      pushDiff();
      await flush();
      if(!silenzioso) toast(vuoto ? "Dati caricati sul database" : "Database allineato");
    } else if(!vuoto){
      const prima = D.cur;
      D = remoto;
      if(prima && D.champs.some(c => c.id === prima)) D.cur = prima;
      SNAP = snapOf(rowsOf(D));
      salvaLocale(); setSynced();
      if(normalizzaTornei()){
        if(canSync()){ save(); if(!silenzioso) toast("Tornei doppi sistemati"); }
        else salvaLocale();
      }
      if(!silenzioso) toast("Dati aggiornati");
    }
    if(SYNC.stato !== "errore") setSync("ok");
  }catch(e){
    setSync("errore", (e && e.message) || "rete non raggiungibile");
    if(!silenzioso) toast("Sincronizzazione fallita");
  }
  if(openEvent && !EV(openEvent)) openEvent = null;
  render();
}

async function initSync(){
  qLoad();
  if(!window.supabase || !window.supabase.createClient){
    setSync("locale", "libreria non caricata"); render(); return;
  }
  try{
    SB = window.supabase.createClient(SB_URL, SB_KEY);
    const {data} = await SB.auth.getSession();
    SESSION = (data && data.session) || null;
    if(SESSION) ls(GKEY, "1");
    SB.auth.onAuthStateChange((ev, s) => {
      SESSION = s || null;
      if(SESSION){ ls(GKEY, "1"); flush(); }
      render();
    });
    await syncNow(true);
  }catch(e){
    setSync("errore", (e && e.message) || "connessione fallita"); render();
  }
  window.addEventListener("online", () => { if(canSync()) syncNow(true); });
}
async function login(mail, pwd){
  if(!SB){ toast("Database non raggiungibile: riprova quando hai rete"); return; }
  const {error} = await SB.auth.signInWithPassword({email:mail, password:pwd});
  if(error){
    toast(/Invalid login/i.test(error.message) ? "Mail o password sbagliate" : error.message);
    return;
  }
  ls(GKEY, "1"); sheet = null;
  toast("Sei in modalità gestore");
  await syncNow(true);
}
async function logout(){
  ls(GKEY, null); SESSION = null; sheet = null;
  if(SB) await SB.auth.signOut();
  await syncNow(true);
  toast("Uscito dalla modalità gestore");
}
function testoSync(){
  const coda = QUEUE.length ? " Ci sono " + QUEUE.length + " modifiche in attesa di partire." : "";
  if(SYNC.stato === "corso") return "Sto sincronizzando…";
  if(SYNC.stato === "errore") return "Database non raggiungibile (" + SYNC.msg + "). Continua a segnare: le modifiche restano sul telefono e partono da sole appena torna la rete." + coda;
  if(SYNC.stato === "locale") return "Senza rete. L'app funziona lo stesso e salva sul telefono." + coda;
  if(canWrite() && !SESSION) return "Modalità gestore attiva su questo dispositivo, ma la sessione è scaduta: rifai l'accesso per rimandare i dati online." + coda;
  if(canWrite()) return "Modalità gestore: ogni modifica finisce subito sul database." + coda;
  return "Sola lettura: vedi i dati aggiornati ma non puoi modificarli.";
}
const AZIONI_LETTURA = new Set(["home","closesheet","champs","setchamp","openev","step","player","albovedi",
  "loca","stampaclass","loca-png","loca-pdf","loca-share","shareclass","shareev","export","sync","login","logout","dologin"]);
