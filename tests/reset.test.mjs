import test from "node:test";
import assert from "node:assert/strict";
import { nuovaApp, conDati, finitoSupabase } from "./ambiente.mjs";

test("la partenza pulita ha tre tornei nuovi senza partite, bonus, stelle o vittorie", () => {
  const a = nuovaApp();
  a.run("D = fresh(); normalizzaTornei()");
  assert.equal(a.run("D.champs.length"), 3);
  assert.ok(a.run("D.champs.every(c => c.name.startsWith('GonéPadelCup ') && c.bonus === 0 && c.soglia === 0 && !c.events.length && !Object.keys(c.carry).length)"));
  assert.deepEqual(a.run("alboCompleto()"), []);
  assert.equal(a.run("regolePronte()"), false);
  assert.equal(a.run("backupCompatibile(D)"), true);
});

test("la memoria della competizione precedente non viene letta né accodata", () => {
  const a = nuovaApp();
  const vecchia = ["mundi", "alito.v2"].join("");
  for(const suffisso of ["", ".coda", ".gestore", ".rev"])
    a.memoria.set(vecchia + suffisso, JSON.stringify({punti:999,partite:[1,2]}));
  a.run("pulisciDatiPrecedenti()");
  assert.equal(a.run("load()"), null);
  assert.equal(a.memoria.size, 0);
  assert.notEqual(a.run("KEY"), vecchia);
});

test("un vecchio backup è incompatibile anche se contiene anagrafica e tornei validi", () => {
  const a = nuovaApp();
  a.imposta("__backup", {players:[],champs:[],settings:{campi:5}});
  assert.equal(a.run("backupCompatibile(__backup)"), false);
  a.run("__backup.settings.generation = APP_GENERATION");
  assert.equal(a.run("backupCompatibile(__backup)"), true);
});

test("il nuovo client rifiuta dati remoti della vecchia competizione prima di inviare la coda", async () => {
  const server = conDati([{id:"p",name:"Persona",sex:"M"}]);
  const rows = server.run("rowsOf(D)");
  delete rows.settings[0].data.generation;
  const sb = finitoSupabase(rows), a = conDati([]);
  a.imposta("SB", sb);
  a.run("SESSION = {user:{}}; ls(RKEY,'0')");
  a.imposta("QUEUE", [{op:"up",t:"players",row:{id:"altro",name:"Altro",sex:"M",v:4}}]);
  await a.run("syncNow(true)");
  assert.equal(sb.stat.scritture, 0);
  assert.equal(a.run("SYNC.stato"), "errore");
});

test("l'anagrafica nuova si scarica senza ricreare vecchi risultati", async () => {
  const server = conDati([{id:"p",name:"Persona",sex:"M"}]);
  server.run("D.settings.regolePronte = false");
  const sb = finitoSupabase(server.run("rowsOf(D)")), a = nuovaApp();
  a.run("D = fresh(); normalizzaTornei()"); a.imposta("SB", sb);
  await a.run("syncNow(true)");
  assert.equal(a.run("D.players.length"), 1);
  assert.deepEqual(a.run("totals().p"), {campo:0,pres:0,bonus:0,pts:0});
  assert.equal(a.run("stelle('p')"), "");
  assert.equal(sb.stat.scritture, 0);
});
