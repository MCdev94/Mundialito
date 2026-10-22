import test from "node:test";
import assert from "node:assert/strict";
import { conDati } from "./ambiente.mjs";

function finale(tipo = "misto"){
  const players = ["M", "F"].flatMap(sex => Array.from({length:6}, (_,i) => ({
    id:sex + i, name:sex + " Persona " + i, sex
  })));
  const a = conDati(players);
  a.imposta("__tipo", tipo);
  a.run("D.cur = D.champs.find(c => c.type === __tipo).id; C().soglia = 0");
  a.imposta("C().carry", Object.fromEntries(players
    .filter(p => tipo === "misto" || p.sex === (tipo === "maschile" ? "M" : "F"))
    .filter(p => Number(p.id.slice(1)) < 4)
    .map((p,i) => [p.id, {pts:100 - i*5, pres:2}])));
  // Per i tornei non misti aggiungiamo due titolari, mantenendo riserve senza presenze.
  if(tipo !== "misto"){
    const sex = tipo === "maschile" ? "M" : "F";
    a.run(`D.players.push({id:'${sex}6',name:'Titolare 6',sex:'${sex}'}, {id:'${sex}7',name:'Titolare 7',sex:'${sex}'},
      {id:'${sex}8',name:'Titolare 8',sex:'${sex}'}, {id:'${sex}9',name:'Titolare 9',sex:'${sex}'});
      ['${sex}6','${sex}7','${sex}8','${sex}9'].forEach(id => C().carry[id] = {pts:10,pres:1})`);
  }
  a.run(`C().events.push({id:'finale',finale:true,status:'bozza',created:1,
    pairs:coppieFinal8(),presenti:coppieFinal8().flat(),seeds:{},
    matches:[{pa:0,pb:1,winner:null},{pa:2,pb:3,winner:null}],storico:[],ordine:null,punti:null})`);
  return a;
}

test("le sostituzioni sono libere anche senza presenze, con candidati dello stesso sesso e fuori dal tabellone", () => {
  const a = finale();
  assert.deepEqual(a.run("candidatiFinale(EV('finale'), 'M0').map(p => p.id)"), ["M4","M5"]);
  assert.deepEqual(a.run("candidatiFinale(EV('finale'), 'F0').map(p => p.id)"), ["F4","F5"]);
  assert.equal(a.run("totals().M4.pres"), 0);
});

test("la riserva mantiene il posto nella coppia, aggiorna i punti del tabellone e lascia intatta la classifica", () => {
  const a = finale();
  const coppie = a.run("EV('finale').pairs"), graduatoria = a.run("classifica()"), carry = a.run("C().carry");
  a.run("sostituisciFinalista(EV('finale'), 'M0', 'M4')");
  assert.deepEqual(a.run("EV('finale').pairs"), coppie.map(pr => pr.map(id => id === "M0" ? "M4" : id)));
  assert.ok(a.run("EV('finale').pairs.every(pr => P(pr[0]).sex !== P(pr[1]).sex)"));
  assert.equal(a.run("new Set(EV('finale').presenti).size"), 8);
  assert.ok(!a.run("EV('finale').presenti.includes('M0')"));
  assert.ok(a.run("EV('finale').presenti.includes('M4')"));
  assert.ok(a.run("EV('finale').pairs.every((pr,i) => EV('finale').seeds[i] === pr.reduce((s,id) => s + totals()[id].pts,0))"));
  assert.deepEqual(a.run("classifica()"), graduatoria);
  assert.deepEqual(a.run("C().carry"), carry);
});

test("vengono rifiutati sesso diverso, doppioni e nomi inesistenti senza cambiare la finale", () => {
  const a = finale(), prima = a.run("EV('finale')");
  for(const [da, aId] of [["M0","F4"],["M0","M1"],["M0","nessuno"],["nessuno","M4"],["M0","M0"]]){
    assert.throws(() => a.run(`sostituisciFinalista(EV('finale'), '${da}', '${aId}')`));
    assert.deepEqual(a.run("EV('finale')"), prima);
  }
});

test("sostituire dopo risultati azzera semifinale e finale e ripristina il tabellone iniziale", () => {
  const a = finale();
  a.run(`EV('finale').storico = [[{pa:0,pb:1,winner:'a'},{pa:2,pb:3,winner:'b'}]];
    EV('finale').matches = [{pa:0,pb:3,winner:'a'},{pa:1,pb:2,winner:'b'}];
    EV('finale').ordine = [0,3,1,2]; EV('finale').punti = [10,8,6,4]`);
  assert.equal(a.run("finaleConRisultati(EV('finale'))"), true);
  a.run("sostituisciFinalista(EV('finale'), 'F0', 'F4')");
  assert.equal(a.run("finaleConRisultati(EV('finale'))"), false);
  assert.deepEqual(a.run("EV('finale').matches"), [{pa:0,pb:1,winner:null},{pa:2,pb:3,winner:null}]);
  assert.deepEqual(a.run("EV('finale').storico"), []);
  assert.equal(a.run("EV('finale').ordine"), null);
  assert.equal(a.run("EV('finale').punti"), null);
});

test("le finali chiuse e le giornate normali non consentono sostituzioni", () => {
  const a = finale();
  a.run("EV('finale').status = 'chiuso'");
  assert.deepEqual(a.run("candidatiFinale(EV('finale'), 'M0')"), []);
  assert.throws(() => a.run("sostituisciFinalista(EV('finale'), 'M0', 'M4')"));
  a.run("EV('finale').status = 'bozza'; EV('finale').finale = false");
  assert.throws(() => a.run("sostituisciFinalista(EV('finale'), 'M0', 'M4')"));
});

test("maschile e femminile consentono riserve dello stesso torneo; le modifiche sopravvivono alla sincronizzazione", () => {
  for(const [tipo, sex] of [["maschile","M"],["femminile","F"],["misto","M"]]){
    const a = finale(tipo);
    a.run(`sostituisciFinalista(EV('finale'), '${sex}0', '${sex}4')`);
    const prima = a.run("EV('finale')");
    a.imposta("__id", a.run("C().id"));
    a.run("D = stateFromRows(rowsOf(D)); D.cur = __id");
    assert.deepEqual(a.run("EV('finale').pairs"), prima.pairs);
    assert.deepEqual(a.run("EV('finale').presenti"), prima.presenti);
    assert.deepEqual(a.run("EV('finale').seeds"), prima.seeds);
  }
});
