import test from "node:test";
import assert from "node:assert/strict";
import { conDati, finitoSupabase } from "./ambiente.mjs";

const G = (id, sex = "M") => ({ id, name: "G" + id, sex });

test("ogni riga mandata al database dichiara la versione dell'app", () => {
  const app = conDati([G("a")], { a:{ pts:4, pres:1 } });
  const righe = app.run("rowsOf(D)");
  const v = app.run("VERSIONE_DATI");
  for(const [tabella, elenco] of Object.entries(righe))
    for(const r of elenco) assert.equal(r.v, v, tabella);
});

test("andata e ritorno dal database non perde niente", () => {
  const app = conDati([G("a"), G("b", "F")], { a:{ pts:4, pres:1 } });
  app.run(`C().dataFinale = "2026-10-31"; C().oraFinale = "pomeriggio";
    D.albo.push({ id:"x", champ_id:C().id, tipo:"maschile", edizione:"1", data:"", giocatori:["a","b"], nomi:["Ga","Gb"] })`);
  const prima = JSON.stringify(app.run("rowsOf(D)"));
  const dopo = JSON.stringify(app.run("rowsOf(stateFromRows(rowsOf(D)))"));
  assert.equal(dopo, prima);
});

test("un dispositivo mai sincronizzato scarta la sua coda vecchia e prende i dati dal database", async () => {
  const server = conDati([G("a")], { a:{ pts:92, pres:5 } });
  const remoto = server.run("rowsOf(D)");
  const sb = finitoSupabase(remoto);

  const telefono = conDati([G("vecchio")], { vecchio:{ pts:1, pres:1 } });
  telefono.imposta("QUEUE", [{ op:"up", t:"players", row:{ id:"vecchio", name:"Gvecchio", sex:"M" } }]);
  telefono.imposta("SB", sb);
  telefono.run(`SESSION = { user:{} }; localStorage.removeItem(RKEY)`);
  await telefono.run("syncNow(true)");

  assert.equal(sb.stat.scritture, 0, "il database non viene toccato");
  assert.equal(telefono.run("QUEUE.length"), 0);
  assert.equal(telefono.run(`totals(null, D.champs.find(c => c.type === "maschile")).a.pts`), 92);
});

test("un dispositivo già sincronizzato manda le sue modifiche in coda", async () => {
  const server = conDati([G("a")], { a:{ pts:10, pres:1 } });
  const sb = finitoSupabase(server.run("rowsOf(D)"));
  const telefono = conDati([G("a")]);
  telefono.imposta("SB", sb);
  telefono.run(`SESSION = { user:{} }; localStorage.setItem(RKEY, "0")`);
  telefono.imposta("QUEUE", [{ op:"up", t:"players", row:{ id:"a", name:"Nome corretto", sex:"M", archived:false, v:3 } }]);
  await telefono.run("syncNow(true)");
  assert.ok(sb.stat.scritture >= 1);
  assert.equal(sb.db.players.find(p => p.id === "a").name, "Nome corretto");
});
