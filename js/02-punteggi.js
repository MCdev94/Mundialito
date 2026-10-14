/* Mundialito — Punteggi, bonus, classifica, tornei e albo d'oro */
"use strict";
/* ---------- punteggi ---------- */
function ordineDaTabellone(ev){
  const out = [];
  (ev.matches || []).forEach(m => {
    if(m.pb === null || m.pb === undefined){ out.push(m.pa); return; }
    const a = m.winner === "a";
    out.push(a ? m.pa : m.pb); out.push(a ? m.pb : m.pa);
  });
  return out;
}
function placements(ev){
  if(ev.ordine && ev.ordine.length) return ev.ordine.filter(i => ev.pairs[i]);
  return ordineDaTabellone(ev);
}
/* base: 4 punti per campo in gioco -> 3 campi 12, 4 campi 16, 5 campi 20 */
function baseGiornata(ev){
  const campi = (ev.matches && ev.matches.length) || Math.ceil(ev.pairs.length / 2);
  return 4 * Math.max(1, campi);
}
function numCampi(ev){ return (ev.matches && ev.matches.length) || Math.ceil(ev.pairs.length / 2); }
function puntiDefault(ev, k){ return Math.max(2, baseGiornata(ev) - 2 * k); }

/* chiude la giornata: scrive i punti nella classifica e la toglie dall'elenco */
function chiudiGiornata(ev){
  const c = C(), delta = {};
  ev.ordine.forEach((pi, k) => {
    const pts = puntiDefault(ev, k);
    ev.pairs[pi].forEach(id => delta[id] = pts);
  });
  Object.keys(delta).forEach(id => {
    const v = c.carry[id] || {pts:0, pres:0};
    c.carry[id] = {pts:(v.pts || 0) + delta[id], pres:(v.pres || 0) + 1};
  });
  c.base = (c.base || 0) + 1;
  c.ultima = {nome:ev.name, data:ev.date, quando:Date.now(), delta, ev:JSON.parse(JSON.stringify(ev))};
  c.events = c.events.filter(e => e.id !== ev.id);
  return Object.keys(delta).length;
}
function annullaUltima(){
  const c = C(), u = c.ultima; if(!u) return false;
  Object.keys(u.delta).forEach(id => {
    const v = c.carry[id]; if(!v) return;
    v.pts = Math.max(0, (v.pts || 0) - u.delta[id]);
    v.pres = Math.max(0, (v.pres || 0) - 1);
  });
  c.base = Math.max(0, (c.base || 0) - 1);
  if(u.ev){ const e = u.ev; e.status = "bozza"; c.events.push(e); }
  c.ultima = null;
  return u.ev ? u.ev.id : null;
}
/* i punti stanno sulla posizione, non sulla coppia: il 1° posto vale sempre uguale */
function initPunti(ev){
  if(!ev.ordine || !ev.ordine.length) ev.ordine = ordineDaTabellone(ev);
  if(!Array.isArray(ev.punti) || ev.punti.length !== ev.ordine.length){
    const vecchi = Array.isArray(ev.punti) ? ev.punti : [];
    ev.punti = ev.ordine.map((pi, k) => vecchi[k] !== undefined && vecchi[k] !== null ? vecchi[k] : puntiDefault(ev, k));
  }
}
function eventPoints(ev){
  const out = {};
  if(ev.status !== "chiuso" || ev.finale) return out;
  placements(ev).forEach((pi, k) => {
    const v = (Array.isArray(ev.punti) && ev.punti[k] !== undefined && ev.punti[k] !== null)
      ? Number(ev.punti[k]) : puntiDefault(ev, k);
    ev.pairs[pi].forEach(id => out[id] = v || 0);
  });
  return out;
}
const matchDone = m => (m.pb === null || m.pb === undefined) || m.winner === "a" || m.winner === "b";
const evReady = ev => ev.matches.length > 0 && ev.matches.every(matchDone);
const TORNEI = [["maschile","Mundialito Maschile",8], ["femminile","Mundialito Femminile",4], ["misto","Mundialito Misto",5]];
function pesoTorneo(c){ return Object.keys(c.carry || {}).length + (c.events || []).length * 10 + (c.base || 0); }
function firmaCarry(c){
  return Object.keys(c.carry || {}).map(id => {
    const v = c.carry[id] || {};
    return ((D.players.find(p => p.id === id) || {}).name || id).toLowerCase() + ":" + (v.pts||0) + "/" + (v.pres||0);
  }).sort().join("|");
}
/* lascia esattamente un torneo per tipo; ritorna true se ha dovuto sistemare qualcosa */
function normalizzaTornei(){
  let cambiato = false;
  const nuovi = TORNEI.map(([tipo, nome, soglia]) => {
    const gruppo = D.champs.filter(c => c.type === tipo).sort((a,b) => pesoTorneo(b) - pesoTorneo(a));
    let main = gruppo[0];
    if(!main){
      main = {id:uid(), name:nome, ed:"", type:tipo, soglia, bonus:5, settimane:8, base:0,
              carry:{}, bonusAss:null, ultima:null, events:[]};
      cambiato = true;
    }
    gruppo.slice(1).forEach(x => {
      cambiato = true;
      const vuoto = !Object.keys(x.carry || {}).length && !(x.events || []).length;
      if(vuoto) return;
      (x.events || []).forEach(e => main.events.push(e));
      if(firmaCarry(x) === firmaCarry(main)){
        main.base = Math.max(main.base || 0, x.base || 0);      // copia identica: non sommo
      } else {
        Object.keys(x.carry || {}).forEach(id => {
          const a = main.carry[id] || {pts:0, pres:0}, b = x.carry[id] || {};
          main.carry[id] = {pts:(a.pts||0) + (b.pts||0), pres:(a.pres||0) + (b.pres||0)};
        });
        main.base = (main.base || 0) + (x.base || 0);
      }
      if(!main.ultima && x.ultima) main.ultima = x.ultima;
      if(!main.bonusAss && x.bonusAss) main.bonusAss = x.bonusAss;
    });
    if(main.name !== nome){ main.name = nome; cambiato = true; }
    return main;
  });
  if(D.champs.length !== nuovi.length || D.champs.some((c,i) => c !== nuovi[i])) cambiato = true;
  D.champs = nuovi;
  if(!D.champs.some(c => c.id === D.cur)){ D.cur = D.champs[0].id; cambiato = true; }
  (D.albo || []).forEach(a => {
    const m = D.champs.find(c => c.type === a.tipo);
    if(m && a.champ_id !== m.id){ a.champ_id = m.id; cambiato = true; }
  });

  /* giocatori doppi con lo stesso nome: li unisco */
  const gruppi = {};
  D.players.forEach(p => {
    const k = p.name.trim().toLowerCase().replace(/\s+/g," ") + "|" + p.sex;
    (gruppi[k] = gruppi[k] || []).push(p);
  });
  Object.values(gruppi).filter(g => g.length > 1).forEach(g => {
    const usi = p => D.champs.reduce((n,c) => n + (c.carry[p.id] ? 1 : 0), 0);
    g.sort((a,b) => usi(b) - usi(a));
    g.slice(1).forEach(dup => { mergePlayers(dup.id, g[0].id); cambiato = true; });
  });
  return cambiato;
}
/* --- albo d'oro --- */
/* Le edizioni precedenti all'albo digitale restano visibili anche se non sono ancora
   state salvate su Supabase. Una voce registrata dall'interfaccia per lo stesso
   torneo e la stessa edizione prende sempre il posto di quella storica. */
const ALBO_STORICO = [
  {id:"storico-maschile-1", tipo:"maschile", edizione:"1", data:"",
   nomi:["Roberto Regini", "De Tommaso Walter"]}
];
function chiaveNome(s){
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
function chiaveNomeLibera(s){ return chiaveNome(s).split(" ").filter(Boolean).sort().join(" "); }
function giocatorePerNome(nome){
  const esatta = chiaveNome(nome), libera = chiaveNomeLibera(nome);
  return D.players.find(p => chiaveNome(p.name) === esatta)
    || D.players.find(p => chiaveNomeLibera(p.name) === libera)
    || null;
}
function alboCompleto(){
  const salvato = D.albo || [];
  const presenti = new Set(salvato.map(a => a.tipo + "|" + String(a.edizione)));
  const storico = ALBO_STORICO.filter(a => !presenti.has(a.tipo + "|" + String(a.edizione))).map(a => ({
    ...a,
    champ_id:(D.champs.find(c => c.type === a.tipo) || {}).id || null,
    giocatori:a.nomi.map(nome => { const p = giocatorePerNome(nome); return p ? p.id : null; })
  }));
  return salvato.concat(storico);
}
function voceAlbo(id){ return alboCompleto().find(a => a.id === id) || null; }
function vittorieDi(id){ return alboCompleto().filter(a => (a.giocatori || []).includes(id)); }
/* una stella per vittoria: blu maschile, rosa femminile, metà e metà misto */
const ORDINE_TIPI = {maschile:0, femminile:1, misto:2};
function stelle(id){
  const v = vittorieDi(id).sort((a,b) => (ORDINE_TIPI[a.tipo] - ORDINE_TIPI[b.tipo]) || ((parseInt(a.edizione)||0) - (parseInt(b.edizione)||0)));
  if(!v.length) return "";
  return `<span class="stelle">${v.map(a => {
    const ch = D.champs.find(c => c.type === a.tipo);
    return `<span class="stella stella--${a.tipo}" title="${esc((ch ? ch.name : a.tipo) + " · " + a.edizione + "ª edizione")}">★</span>`;
  }).join("")}</span>`;
}
function nomeAlbo(a, i){ const id = (a.giocatori || [])[i]; const p = id && D.players.find(x => x.id === id); return p ? p.name : ((a.nomi || [])[i] || "?"); }
function albumDi(ch){
  return alboCompleto().filter(a => a.tipo === ch.type)
    .sort((x,y) => (parseInt(y.edizione,10) || 0) - (parseInt(x.edizione,10) || 0));
}
function vincitoreFinale(ev){
  if(!ev || !ev.finale || (ev.storico || []).length < 1) return null;
  const m = ev.matches && ev.matches[0];
  if(!m || (m.winner !== "a" && m.winner !== "b")) return null;
  return ev.pairs[m.winner === "a" ? m.pa : m.pb] || null;
}
function giornateChiuse(ch){
  ch = ch || C();
  return (ch.base || 0) + ch.events.filter(e => e.status === "chiuso" && !e.finale).length;
}
function finaleDi(ch){ return (ch || C()).events.find(e => e.finale) || null; }
function giornatePreviste(ch){ return ((ch || C()).settimane || 8) * 2; }
function anteprimaBonus(ch){
  ch = ch || C();
  const t = totals(null, ch);
  return D.players.filter(p => t[p.id].pres > ch.soglia).length;
}
function assegnaBonus(ch){
  const t = totals(null, ch);
  const mappa = {};
  D.players.forEach(p => { if(t[p.id].pres > ch.soglia) mappa[p.id] = ch.bonus; });
  ch.bonusAss = {quando:oggi(), soglia:ch.soglia, bonus:ch.bonus, mappa};
}
function ordered(ch){ return [...(ch||C()).events].sort((a,b) => (a.date||"").localeCompare(b.date||"") || a.created - b.created); }

/* Punteggio vero di ogni giocatore nel torneo: punti fatti in campo + bonus presenze, se raggiunto.
   pts    -> il punteggio che conta ovunque (classifica, tabellone, abbinamenti, locandina)
   campo  -> i soli punti fatti giocando, senza bonus
   bonus  -> i punti bonus presi (0 se non ancora raggiunto) */
function totals(upTo, ch){
  ch = ch || C();
  const t = {};
  D.players.forEach(p => { const c = ch.carry[p.id] || {}; t[p.id] = {campo:c.pts||0, pres:c.pres||0}; });
  for(const ev of ordered(ch)){
    if(upTo && ev.id === upTo) break;
    if(ev.status !== "chiuso") continue;
    const pp = eventPoints(ev);
    Object.keys(pp).forEach(id => { if(t[id]){ t[id].campo += pp[id]; t[id].pres += 1; } });
  }
  Object.values(t).forEach(v => {
    v.bonus = haBonus(v.pres, ch) ? ch.bonus : 0;
    v.pts = v.campo + v.bonus;
  });
  return t;
}
function haBonus(pres, ch){ return (ch.soglia || 0) > 0 && (ch.bonus || 0) > 0 && pres >= ch.soglia; }
function classifica(ch){
  ch = ch || C();
  const t = totals(null, ch);
  return D.players.map(p => {
    const v = t[p.id];
    return {id:p.id, name:p.name, sex:p.sex, pts:v.campo, pres:v.pres, bonus:v.bonus, tot:v.pts};
  }).sort((a,b) => b.tot - a.tot || b.pres - a.pres || a.name.localeCompare(b.name));
}
