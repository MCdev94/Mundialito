import test from "node:test";
import assert from "node:assert/strict";
import {conDati} from "./ambiente.mjs";

test("il femminile precompila soltanto il giovedì alle 20:00", () => {
  const a=conDati([]);
  a.run("D.cur=D.champs.find(c=>c.type==='femminile').id");
  assert.equal(a.run("orarioEvento(C(),'2026-11-05')"),"20:00");
  assert.equal(a.run("orarioEvento(C(),'2026-11-12')"),"20:00");
  assert.equal(a.run("orarioEvento(C(),'2026-11-04')"),"");
  assert.match(a.run("notaOrarioEvento(C(),'2026-11-04')"),/giovedì/);
});

test("il misto precompila soltanto la domenica alle 14:30", () => {
  const a=conDati([]);
  a.run("D.cur=D.champs.find(c=>c.type==='misto').id");
  assert.equal(a.run("orarioEvento(C(),'2026-11-08')"),"14:30");
  assert.equal(a.run("orarioEvento(C(),'2026-11-15')"),"14:30");
  assert.equal(a.run("orarioEvento(C(),'2026-11-07')"),"");
  assert.match(a.run("notaOrarioEvento(C(),'2026-11-07')"),/domenica/);
});

test("femminile e misto inseriscono in classifica solo chi è stato scelto per i rispettivi eventi", () => {
  const a=conDati([{id:'f',name:'Donna',sex:'F'},{id:'m',name:'Uomo',sex:'M'}]);
  a.run(`D.settings.regolePronte=false;
    var f=D.champs.find(c=>c.type==='femminile'),m=D.champs.find(c=>c.type==='misto');
    f.events.push({id:'f1',name:'Giovedì',date:'2026-11-05',ora:'20:00',created:1,status:'bozza',presenti:['f'],pairs:[],matches:[]})`);
  assert.deepEqual(a.run("classificaFinal8(f).map(r=>r.id)"),['f']);
  assert.deepEqual(a.run("classificaFinal8(m)"),[]);
  a.run("m.events.push({id:'m1',name:'Domenica',date:'2026-11-08',ora:'14:30',created:1,status:'bozza',presenti:['f','m'],pairs:[],matches:[]})");
  assert.equal(a.run("classificaFinal8(m).length"),2);
  assert.deepEqual(a.run("totals(null,f).f"),{campo:0,pres:0,bonus:0,pts:0});
  assert.deepEqual(a.run("totals(null,m).f"),{campo:0,pres:0,bonus:0,pts:0});
  a.run("D=stateFromRows(rowsOf(D))");
  assert.equal(a.run("D.champs.find(c=>c.type==='femminile').events[0].ora"),'20:00');
  assert.equal(a.run("D.champs.find(c=>c.type==='misto').events[0].ora"),'14:30');
});
