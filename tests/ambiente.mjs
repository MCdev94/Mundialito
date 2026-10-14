/* Carica i file dell'app in un ambiente isolato, senza browser, per provarne la logica. */
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const FILE = ["01-base.js", "02-punteggi.js", "03-tabellone.js", "04-schermate.js", "05-fogli.js",
  "06-azioni.js", "07-stampa-classifica.js", "08-sync.js", "09-locandina.js", "10-backup.js"];

function elemento(){
  return { addEventListener(){}, querySelectorAll: () => [], querySelector: () => null, setAttribute(){},
    remove(){}, appendChild(){}, focus(){}, style:{}, dataset:{}, classList:{ toggle(){}, add(){}, remove(){} },
    innerHTML: "", textContent: "" };
}

export function nuovaApp(){
  const memoria = new Map();
  const ctx = {
    console, setTimeout, clearTimeout,
    localStorage: {
      getItem: k => memoria.has(k) ? memoria.get(k) : null,
      setItem: (k, v) => memoria.set(k, String(v)),
      removeItem: k => memoria.delete(k),
      clear: () => memoria.clear()
    },
    document: { getElementById: elemento, querySelectorAll: () => [], querySelector: () => null,
      createElement: elemento, body: elemento(), addEventListener(){},
      fonts: { load: async () => {}, ready: Promise.resolve() } },
    navigator: {}, location: { protocol: "file:" },
    confirm: () => true, alert: () => {}, prompt: () => null
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for(const f of FILE) vm.runInContext(fs.readFileSync(path.join(qui, "..", "js", f), "utf8"), ctx, { filename: f });
  /* run: i risultati vengono copiati, così i confronti nei test funzionano; le promesse restano tali.
     vivo: restituisce l'oggetto originale, per modificarlo dal test. */
  const vivo = codice => vm.runInContext(codice, ctx);
  const run = codice => {
    const r = vivo(codice);
    if(r && typeof r.then === "function") return r;
    return (r !== null && typeof r === "object") ? JSON.parse(JSON.stringify(r)) : r;
  };
  const imposta = (nome, valore) => { ctx.__valore = valore; vivo(`${nome} = __valore`); };
  return { ctx, run, vivo, imposta, memoria };
}

/* Un piccolo campionato di prova: 3 tornei, giocatori con punti e presenze scelti a mano. */
export function conDati(giocatori, carryMaschile = {}){
  const app = nuovaApp();
  app.imposta("D", { v:2, settings:{ campi:5 }, albo:[], cur:null, players: giocatori, champs:[] });
  app.run("normalizzaTornei()");
  app.run(`(() => { const c = D.champs.find(x => x.type === "maschile"); D.cur = c.id; })()`);
  const c = app.vivo(`D.champs.find(x => x.type === "maschile")`);
  Object.assign(c.carry, carryMaschile);
  return app;
}

/* Un finto Supabase in memoria, che rifiuta le righe senza versione come quello vero. */
export function finitoSupabase(tabelle){
  const db = JSON.parse(JSON.stringify(tabelle));
  const stat = { scritture: 0 };
  const tab = t => (db[t] = db[t] || []);
  return {
    db, stat,
    from(t){
      return {
        select: async () => ({ data: JSON.parse(JSON.stringify(tab(t))), error: null }),
        upsert: async riga => {
          if(riga.v == null) return { error: { message: "null value in column \"v\"" } };
          const i = tab(t).findIndex(r => String(r.id) === String(riga.id));
          if(i >= 0) tab(t)[i] = { ...tab(t)[i], ...riga }; else tab(t).push(riga);
          stat.scritture++; return { error: null };
        },
        delete: () => ({ eq: async (col, val) => {
          db[t] = tab(t).filter(r => String(r[col]) !== String(val)); stat.scritture++; return { error: null };
        } })
      };
    }
  };
}
