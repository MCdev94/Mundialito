/* Mundialito — Stato condiviso, utilità, salvataggio locale */
"use strict";
const SEED = null;   // i dati stanno nel database: un dispositivo nuovo li scarica al primo avvio
const KEY = "mundialito.v2";
const app = document.getElementById("app");
const tabsEl = document.getElementById("tabs");

let D = null, tab = "giornate", openEvent = null, step = "presenti";
let sel = [], search = "", sheet = null;

const uid = () => Math.random().toString(36).slice(2,9);
const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const P = id => D.players.find(p => p.id === id) || {name:"?", sex:"M"};
const nm = id => P(id).name;
const oggi = () => new Date().toISOString().slice(0,10);
const dataIt = s => { if(!s) return ""; const [a,m,g]=s.split("-"); return g+"/"+m+"/"+a.slice(2); };
const C = () => D.champs.find(c => c.id === D.cur) || D.champs[0];
const EV = id => C().events.find(e => e.id === id);
const tipoLabel = t => t === "femminile" ? "Femminile" : t === "misto" ? "Misto" : "Maschile";
const partecipanti = (ch = C(), plurale = true) => ch.type === "femminile"
  ? (plurale ? "giocatrici" : "giocatrice") : (plurale ? "giocatori" : "giocatore");
const dotCls = t => t === "femminile" ? "dot dot--f" : t === "misto" ? "dot dot--x" : "dot";
const eligible = p => { const t = C().type;
  return !p.archived && (t === "misto" || (t === "maschile" ? p.sex === "M" : p.sex === "F")); };

let tPush;
function salvaLocale(){
  try{ localStorage.setItem(KEY, JSON.stringify(D)); }catch(e){ toast("Memoria piena: esporta un backup"); }
}
function save(){
  D.rev = (D.rev || 0) + 1;
  salvaLocale();
  clearTimeout(tPush); tPush = setTimeout(() => { try{ pushDiff(); }catch(e){} }, 600);
}
function load(){ try{ const r = localStorage.getItem(KEY); if(r){ const d = JSON.parse(r); if(d && d.champs) return d; } }catch(e){} return null; }
function fresh(){
  const d = {v:2, settings:{campi:5}, players:[], champs:[], albo:[], cur:null};
  const byName = {};
  (SEED && SEED.players || []).forEach(p => {
    const id = uid(); d.players.push({id, name:p.n, sex:p.s}); byName[p.n] = id;
  });
  (SEED && SEED.champs || []).forEach(c => {
    const ch = {id:uid(), name:c.name, ed:c.ed, type:c.type, soglia:c.soglia, bonus:c.bonus,
      settimane:c.settimane || 8, base:c.base || 0, carry:{}, bonusAss:null, events:[]};
    Object.keys(c.carry || {}).forEach(n => { if(byName[n]) ch.carry[byName[n]] = c.carry[n]; });
    d.champs.push(ch);
  });
  if(!d.champs.length) d.champs.push({id:uid(), name:"Mundialito", ed:"1ª edizione", type:"maschile",
    soglia:8, bonus:5, carry:{}, events:[]});
  d.cur = d.champs[0].id;
  return d;
}
let tt;
function toast(m){
  document.querySelectorAll(".toast").forEach(n=>n.remove());
  const el = document.createElement("div");
  el.className = "toast"; el.textContent = m; el.setAttribute("role","status");
  document.body.appendChild(el); clearTimeout(tt); tt = setTimeout(()=>el.remove(), 2600);
}
