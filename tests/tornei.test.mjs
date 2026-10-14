import test from "node:test";
import assert from "node:assert/strict";
import { nuovaApp } from "./ambiente.mjs";

const torneo = (id, type, carry = {}, extra = {}) => ({ id, name:"x", type, soglia:8, bonus:5, carry, events:[], ...extra });
function app(champs, players = [{ id:"a", name:"Anna", sex:"M" }]){
  const a = nuovaApp();
  a.imposta("D", { v:2, settings:{}, albo:[], cur:null, players, champs });
  a.run("normalizzaTornei()");
  return a;
}

test("restano sempre esattamente tre tornei, uno per tipo", () => {
  const a = app([]);
  assert.deepEqual(a.run("D.champs.map(c => c.type)"), ["maschile", "femminile", "misto"]);
});

test("un doppione vuoto viene eliminato", () => {
  const a = app([torneo("m1", "maschile", { a:{ pts:10, pres:1 } }), torneo("m2", "maschile")]);
  assert.equal(a.run(`D.champs.filter(c => c.type === "maschile").length`), 1);
  assert.deepEqual(a.run(`D.champs[0].carry.a`), { pts:10, pres:1 });
});

test("una copia identica non raddoppia i punti", () => {
  const a = app([torneo("m1", "maschile", { a:{ pts:10, pres:1 } }), torneo("m2", "maschile", { a:{ pts:10, pres:1 } })]);
  assert.deepEqual(a.run(`D.champs[0].carry.a`), { pts:10, pres:1 });
});

test("un doppione con una giornata vera viene sommato", () => {
  const a = app([torneo("m1", "maschile", { a:{ pts:10, pres:1 } }, { base:8 }),
                 torneo("m2", "maschile", { a:{ pts:4, pres:1 } }, { base:1 })]);
  assert.deepEqual(a.run(`D.champs[0].carry.a`), { pts:14, pres:2 });
  assert.equal(a.run(`D.champs[0].base`), 9);
});

test("unire due schede somma i punti e sposta le vittorie", () => {
  const a = app([torneo("m1", "maschile", { a:{ pts:10, pres:1 }, b:{ pts:6, pres:1 } })],
    [{ id:"a", name:"Anna", sex:"M" }, { id:"b", name:"Anna B.", sex:"M" }]);
  a.run(`D.albo.push({ id:"x", tipo:"maschile", edizione:"1", giocatori:["b","z"], nomi:["Anna B.","Z"] })`);
  a.run(`mergePlayers("b", "a")`);
  assert.deepEqual(a.run(`D.champs[0].carry.a`), { pts:16, pres:2 });
  assert.equal(a.run(`D.players.length`), 1);
  assert.deepEqual(a.run(`D.albo[0].giocatori`), ["a", "z"]);
});
