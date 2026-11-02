/* GonéPadelCup — Stato condiviso, utilità, salvataggio locale */
"use strict";
const APP_GENERATION = "gone-padel-cup-2026-11-02";
const APP_STRUCTURE = "male-divisions-v1";
const KEY = "gone-padel-cup.v2";
const REGOLE_BASE = {maschile:{soglia:8,bonus:5,settimane:10},
  femminile:{soglia:4,bonus:5,settimane:7}, misto:{soglia:5,bonus:5,settimane:7}};
const regolePronte = () => D.settings.regolePronte === true;
const divisioneMaschile = ch => ch.type === "maschile" && ["avanzato", "intermedio"].includes(ch.divisione);
const eventiAbilitati = (ch = C()) => regolePronte() || ["maschile", "femminile", "misto"].includes(ch.type);
const nomeDivisione = d => d === "intermedio" ? "Intermedio" : "Avanzato";
function orarioEvento(ch, data){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data || "")) return "";
  const giorno = new Date(data + "T12:00:00").getDay();
  if(ch.type === "femminile") return giorno === 4 ? "20:00" : "";
  if(ch.type === "misto") return giorno === 0 ? "14:30" : "";
  if(!divisioneMaschile(ch)) return "";
  if(giorno === 2) return ch.divisione === "avanzato" ? "20:00–21:30" : "21:30–23:00";
  if(giorno === 6) return ch.divisione === "avanzato" ? "14:00–15:30" : "15:30–17:00";
  return "";
}
function notaOrarioEvento(ch, data){
  if(orarioEvento(ch,data)) return "Orario precompilato e modificabile.";
  const giorni = ch.type === "femminile" ? "giovedì" : ch.type === "misto" ? "domenica" : "martedì e sabato";
  return "Giorno diverso da " + giorni + ": imposta manualmente l'orario.";
}
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
function backupCompatibile(d){ return !!(d && Array.isArray(d.players) && Array.isArray(d.champs) && d.settings && d.settings.generation === APP_GENERATION && d.settings.structure === APP_STRUCTURE); }
function load(){ try{ const r = localStorage.getItem(KEY); if(r){ const d = JSON.parse(r); if(backupCompatibile(d)) return d; } }catch(e){} return null; }
function pulisciDatiPrecedenti(){
  const precedente = ["mundi", "alito.v2"].join("");
  for(const suffisso of ["", ".coda", ".gestore", ".rev"]){
    try{ localStorage.removeItem(precedente + suffisso); }catch(e){}
  }
}
function fresh(){
  const d = {v:2, settings:{campi:5, generation:APP_GENERATION, structure:APP_STRUCTURE, regolePronte:true, firma:"GonéPadelCup"}, players:[], champs:[], albo:[], cur:null};
  d.champs.push({id:uid(), name:"GonéPadelCup Maschile Avanzato", ed:"", type:"maschile", divisione:"avanzato",
    ...REGOLE_BASE.maschile, carry:{}, events:[]});
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
