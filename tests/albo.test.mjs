import test from "node:test";
import assert from "node:assert/strict";
import { conDati } from "./ambiente.mjs";

const G = (id, name, sex = "M") => ({ id, name, sex });

test("la prima edizione maschile assegna una stella ai vincitori storici", () => {
  const app = conDati([
    G("roberto", "Regini Roberto"),
    G("walter", "De Tommaso Walter")
  ]);

  const voce = app.run(`alboCompleto().find(a => a.tipo === "maschile" && a.edizione === "1")`);
  assert.deepEqual(voce.giocatori, ["roberto", "walter"]);
  assert.deepEqual(voce.nomi, ["Roberto Regini", "De Tommaso Walter"]);
  assert.match(app.run(`stelle("roberto")`), /stella--maschile/);
  assert.match(app.run(`stelle("walter")`), /stella--maschile/);
  assert.match(app.run(`tabellaClassifica([{id:"roberto", name:"Regini Roberto", pts:0, pres:0, tot:0, bonus:0}])`), /stella--maschile/);
});

test("una voce ufficiale sostituisce quella storica senza creare doppioni", () => {
  const app = conDati([G("a", "Altro Uno"), G("b", "Altro Due")]);
  app.run(`D.albo.push({id:"ufficiale", champ_id:C().id, tipo:"maschile", edizione:"1",
    data:"2026-01-01", giocatori:["a","b"], nomi:["Altro Uno","Altro Due"]})`);

  assert.equal(app.run(`alboCompleto().filter(a => a.tipo === "maschile" && a.edizione === "1").length`), 1);
  assert.equal(app.run(`alboCompleto().find(a => a.tipo === "maschile" && a.edizione === "1").id`), "ufficiale");
});

test("le vittorie usano i tre colori previsti", () => {
  const app = conDati([G("a", "Giocatore A"), G("b", "Giocatore B", "F")]);
  app.run(`D.albo.push(
    {id:"m", tipo:"maschile", edizione:"2", giocatori:["a"], nomi:["Giocatore A"]},
    {id:"f", tipo:"femminile", edizione:"1", giocatori:["a"], nomi:["Giocatore A"]},
    {id:"x", tipo:"misto", edizione:"1", giocatori:["a","b"], nomi:["Giocatore A","Giocatore B"]}
  )`);

  const html = app.run(`stelle("a")`);
  assert.match(html, /stella--maschile/);
  assert.match(html, /stella--femminile/);
  assert.match(html, /stella--misto/);
});
