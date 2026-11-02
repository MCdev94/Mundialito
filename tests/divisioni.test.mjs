import test from "node:test";
import assert from "node:assert/strict";
import {conDati} from "./ambiente.mjs";

function app(){
  const a = conDati([{id:"p",name:"Persona",sex:"M"},{id:"q",name:"Compagno",sex:"M"}]);
  a.run(`var avanzato = D.champs.find(c => c.divisione === 'avanzato');
    var intermedio = D.champs.find(c => c.divisione === 'intermedio')`);
  return a;
}

test("normalizzare non unisce i due maschili, nemmeno con lo stesso giocatore e punti differenti", () => {
  const a = app();
  a.run("avanzato.carry.p={pts:20,pres:2};intermedio.carry.p={pts:7,pres:1};normalizzaTornei();normalizzaTornei()");
  assert.equal(a.run("D.champs.length"),4);
  assert.equal(a.run("totals(null,avanzato).p.pts"),20);
  assert.equal(a.run("totals(null,intermedio).p.pts"),7);
  assert.deepEqual(a.run("D.players"),[{id:"p",name:"Persona",sex:"M"},{id:"q",name:"Compagno",sex:"M"}]);
});

test("l'iscrizione all'evento inserisce nella classifica giusta senza assegnare un livello alla persona", () => {
  const a = app();
  a.run("D.settings.regolePronte=false");
  assert.equal(a.run("partecipazioniMaschili('p')"),"Da classificare");
  a.run("avanzato.events.push({id:'a',status:'bozza',created:1,presenti:['p'],pairs:[],matches:[]})");
  assert.deepEqual(a.run("classificaFinal8(avanzato).map(r=>[r.id,r.tot,r.pres,r.final8])"),[["p",0,0,false]]);
  assert.deepEqual(a.run("classificaFinal8(intermedio)"),[]);
  assert.equal(a.run("partecipazioniMaschili('p')"),"Avanzato");
  a.run("intermedio.events.push({id:'i',status:'bozza',created:2,presenti:['p'],pairs:[],matches:[]})");
  assert.equal(a.run("partecipazioniMaschili('p')"),"Avanzato · Intermedio");
  assert.deepEqual(a.run("classificaFinal8(intermedio).map(r=>r.id)"),["p"]);
  assert.ok(a.run("D.players.every(p => !('livello' in p) && !('divisione' in p))"));
});

test("la chiusura di una giornata aggiorna soltanto il campionato selezionato", () => {
  const a = app();
  a.run(`avanzato.carry.p={pts:20,pres:2}; D.cur=intermedio.id;
    intermedio.events.push({id:'i',name:'Intermedio',date:'2026-11-03',status:'bozza',created:1,
      presenti:['p','q'],pairs:[['p','q']],matches:[{pa:0,pb:null}],ordine:[0]});
    chiudiGiornata(EV('i'))`);
  assert.deepEqual(a.run("avanzato.carry.p"),{pts:20,pres:2});
  assert.deepEqual(a.run("intermedio.carry.p"),{pts:4,pres:1});
  assert.equal(a.run("partecipazioniMaschili('p')"),"Avanzato · Intermedio");
});

test("rimuovere una presenza da una categoria non cancella l'altra", () => {
  const a = app();
  a.run("avanzato.events.push({id:'a',presenti:['p'],pairs:[]});intermedio.events.push({id:'i',presenti:['p'],pairs:[]});avanzato.events[0].presenti=[]");
  assert.equal(a.run("partecipaAlCampionato('p',avanzato)"),false);
  assert.equal(a.run("partecipaAlCampionato('p',intermedio)"),true);
  assert.equal(a.run("partecipazioniMaschili('p')"),"Intermedio");
});

test("martedì e sabato precompilano le quattro fasce; gli altri giorni sono manuali", () => {
  const a = app();
  assert.equal(a.run("orarioEvento(avanzato,'2026-11-03')"),"20:00–21:30");
  assert.equal(a.run("orarioEvento(intermedio,'2026-11-03')"),"21:30–23:00");
  assert.equal(a.run("orarioEvento(avanzato,'2026-11-07')"),"14:00–15:30");
  assert.equal(a.run("orarioEvento(intermedio,'2026-11-07')"),"15:30–17:00");
  assert.equal(a.run("orarioEvento(avanzato,'2026-11-04')"),"");
  assert.equal(a.run("orarioEvento(avanzato,'')"),"");
  assert.equal(a.run("orarioEvento(D.champs.find(c=>c.type==='misto'),'2026-11-03')"),"");
  assert.ok(a.run("D.champs.every(c=>c.events.length===0)"));
});

test("salvataggio e sincronizzazione conservano divisioni, orari ed eventi separati", () => {
  const a = app();
  a.run(`avanzato.events.push({id:'a',name:'Avanzato',date:'2026-11-03',ora:'20:00–21:30',status:'bozza',created:1,presenti:['p'],pairs:[],matches:[]});
    intermedio.events.push({id:'i',name:'Intermedio',date:'2026-11-03',ora:'21:30–23:00',status:'bozza',created:2,presenti:['p'],pairs:[],matches:[]})`);
  const prima=a.run("rowsOf(D)");
  a.run("D=stateFromRows(rowsOf(D));normalizzaTornei()");
  assert.deepEqual(a.run("rowsOf(D)"),prima);
  assert.equal(a.run("D.champs.find(c=>c.divisione==='intermedio').events[0].ora"),"21:30–23:00");
});

test("le vittorie della stessa edizione sono distinte tra i due campionati maschili", () => {
  const a=app();
  a.run(`D.albo=[{id:'va',tipo:'maschile',champ_id:avanzato.id,edizione:'1',giocatori:['p']},
    {id:'vi',tipo:'maschile',champ_id:intermedio.id,edizione:'1',giocatori:['q']}]; normalizzaTornei()`);
  assert.deepEqual(a.run("albumDi(avanzato).map(a=>a.id)"),["va"]);
  assert.deepEqual(a.run("albumDi(intermedio).map(a=>a.id)"),["vi"]);
  assert.match(a.run("stelle('q')"),/Intermedio/);
});

test("sono abilitati soltanto gli eventi maschili, con punteggi e finali ancora in attesa", () => {
  const a=app();a.run("D.settings.regolePronte=false");
  assert.equal(a.run("eventiAbilitati(avanzato)"),true);
  assert.equal(a.run("eventiAbilitati(intermedio)"),true);
  assert.equal(a.run("eventiAbilitati(D.champs.find(c=>c.type==='femminile'))"),false);
  assert.equal(a.run("regolePronte()"),false);
});
