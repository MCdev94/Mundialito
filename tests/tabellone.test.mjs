import test from "node:test";
import assert from "node:assert/strict";
import { conDati } from "./ambiente.mjs";

const G = (id, sex = "M") => ({ id, name: "G" + id, sex });
const quattro = { p1:{ pts:40, pres:1 }, p2:{ pts:30, pres:1 }, p3:{ pts:20, pres:1 }, p4:{ pts:10, pres:1 } };

test("abbinamenti per livello e bilanciati", () => {
  const app = conDati([G("p1"), G("p2"), G("p3"), G("p4")], quattro);
  app.run(`C().soglia = 0; C().events.push({ id:"g", status:"bozza", created:1, presenti:["p4","p2","p1","p3"], pairs:[], matches:[] })`);
  app.run(`autoPairs(EV("g"), "liv")`);
  assert.deepEqual(app.run(`EV("g").pairs`), [["p1","p2"], ["p3","p4"]]);
  app.run(`autoPairs(EV("g"), "bil")`);
  assert.deepEqual(app.run(`EV("g").pairs`), [["p1","p4"], ["p2","p3"]]);
});

test("misto: ogni coppia è una donna e un uomo, anche con numeri diversi", () => {
  const app = conDati([G("f1","F"), G("f2","F"), G("f3","F"), G("m1"), G("m2")]);
  app.run(`D.cur = D.champs.find(c => c.type === "misto").id`);
  app.run(`C().events.push({ id:"g", status:"bozza", created:1, presenti:["f1","f2","f3","m1","m2"], pairs:[], matches:[] })`);
  for(const modo of ["liv", "bil"]){
    app.run(`autoPairs(EV("g"), "${modo}")`);
    const coppie = app.run(`EV("g").pairs.map(p => p.map(id => P(id).sex).sort().join(""))`);
    assert.deepEqual(coppie, ["FM", "FM"], modo);
  }
});

test("il tabellone ordina le coppie per somma dei punti, bonus compreso", () => {
  const app = conDati([G("p1"), G("p2"), G("p3"), G("p4")],
    { p1:{ pts:40, pres:1 }, p2:{ pts:30, pres:1 }, p3:{ pts:20, pres:5 }, p4:{ pts:10, pres:1 } });
  app.run("C().soglia = 5; C().bonus = 50");
  app.run(`C().events.push({ id:"g", status:"bozza", created:1, pairs:[["p1","p4"], ["p2","p3"]], matches:[] })`);
  app.run(`buildBoard(EV("g"))`);
  assert.deepEqual(app.run(`EV("g").seeds`), { 0:50, 1:100 }, "p3 prende 50 di bonus");
  assert.deepEqual(app.run(`EV("g").matches[0]`), { pa:1, pb:0, winner:null }, "la coppia più forte va prima");
});

test("finale a 8: le vincenti si giocano il titolo, le perdenti il terzo posto", () => {
  const app = conDati([]);
  app.imposta("__ev", { finale:true, pairs:[[1,2],[3,4],[5,6],[7,8]],
    matches:[{ pa:0, pb:1, winner:"b" }, { pa:2, pb:3, winner:"a" }] });
  assert.deepEqual(app.run("prossimoTurno(__ev)"),
    [{ pa:1, pb:2, winner:null }, { pa:0, pb:3, winner:null }]);
});
