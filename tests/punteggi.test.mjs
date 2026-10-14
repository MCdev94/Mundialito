import test from "node:test";
import assert from "node:assert/strict";
import { nuovaApp, conDati } from "./ambiente.mjs";

const G = (id, sex = "M") => ({ id, name: "Giocatore " + id, sex });

test("scala dei punti: 4 punti per campo alla prima coppia, poi 2 in meno", () => {
  const app = nuovaApp();
  for(const [campi, attesi] of [[3, [12,10,8,6,4,2]], [4, [16,14,12,10,8,6,4,2]], [5, [20,18,16,14,12,10,8,6,4,2]]]){
    app.imposta("__ev", { pairs: Array(campi * 2).fill(["x","y"]), matches: Array(campi).fill({}) });
    assert.deepEqual(attesi.map((_, k) => app.run(`puntiDefault(__ev, ${k})`)), attesi, campi + " campi");
  }
});

test("chiudere una giornata scrive punti e presenze, conta la giornata e la toglie dall'elenco", () => {
  const app = conDati([G("a"), G("b"), G("c"), G("d")]);
  app.run(`C().events.push({ id:"g1", name:"9ª giornata", date:"2026-10-10", status:"bozza", created:1,
    pairs:[["a","b"],["c","d"]], matches:[{pa:0, pb:1, winner:null}], ordine:[1,0] })`);
  const base = app.run("C().base || 0");
  app.run(`chiudiGiornata(EV("g1"))`);
  assert.deepEqual(app.run("C().carry.c"), { pts:4, pres:1 });
  assert.deepEqual(app.run("C().carry.a"), { pts:2, pres:1 });
  assert.equal(app.run("C().base"), base + 1);
  assert.equal(app.run("C().events.length"), 0);
  assert.equal(app.run("C().ultima.nome"), "9ª giornata");

  app.run("annullaUltima()");
  assert.deepEqual(app.run("C().carry.c"), { pts:0, pres:0 });
  assert.equal(app.run("C().base"), base);
  assert.equal(app.run("C().events[0].status"), "bozza", "la giornata torna aperta per correggerla");
});

test("bonus: scatta da N presenze in su, una volta sola, ed entra nel punteggio", () => {
  const app = conDati([G("a"), G("b")], { a:{ pts:50, pres:4 }, b:{ pts:40, pres:5 } });
  app.run("C().soglia = 5; C().bonus = 5");
  const t = app.run("totals()");
  assert.deepEqual([t.a.pts, t.a.campo, t.a.bonus], [50, 50, 0]);
  assert.deepEqual([t.b.pts, t.b.campo, t.b.bonus], [45, 40, 5]);
  app.run("C().soglia = 0");
  assert.equal(app.run("totals().b.pts"), 40, "con soglia a zero il bonus è spento");
});

test("classifica: prima il totale, poi le presenze, poi il nome", () => {
  const app = conDati([G("a"), G("b"), G("c")], { a:{ pts:30, pres:2 }, b:{ pts:30, pres:3 }, c:{ pts:40, pres:1 } });
  app.run("C().soglia = 0");
  assert.deepEqual(app.run("classifica().filter(r => r.pres > 0).map(r => r.id)"), ["c", "b", "a"]);
});
