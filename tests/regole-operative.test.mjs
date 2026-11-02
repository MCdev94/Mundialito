import test from "node:test";
import assert from "node:assert/strict";
import {nuovaApp,conDati} from "./ambiente.mjs";

test("le regole precedenti sono attive, con parametri separati per i quattro campionati", () => {
  const a=nuovaApp();a.run("D=fresh();normalizzaTornei()");
  assert.equal(a.run("regolePronte()"),true);
  assert.ok(a.run("D.champs.every(c=>edizioneDi(c)==='1'&&!c.dataFinale&&!c.oraFinale)"));
  assert.deepEqual(a.run("D.champs.map(c=>[c.soglia,c.bonus,c.settimane,giornatePreviste(c)])"),
    [[8,5,10,20],[8,5,10,20],[4,5,7,7],[5,5,7,7]]);
  assert.ok(a.run("D.champs.every(c=>c.events.length===0&&Object.keys(c.carry).length===0)"));
  assert.deepEqual(a.run("alboCompleto()"),[]);
});

test("otto iscritti senza presenze non possono ancora creare la finale", () => {
  const a=conDati(Array.from({length:8},(_,i)=>({id:'p'+i,name:'Nome '+i,sex:'M'})));
  a.run("C().events.push({id:'g',status:'bozza',created:1,presenti:D.players.map(p=>p.id),pairs:[],matches:[]})");
  assert.equal(a.run("classificaFinal8().length"),8);
  assert.equal(a.run("classificaFinal8().filter(r=>r.final8).length"),0);
  assert.deepEqual(a.run("coppieFinal8()"),[]);
});

test("titoli delle locandine e delle classifiche usano il nome del campionato corrente", async () => {
  const players=['M','F'].flatMap(sex=>Array.from({length:8},(_,i)=>({id:sex+i,name:'Persona '+sex+i,sex})));
  const a=conDati(players),testi=[];
  a.ctx.document.createElement=()=>({width:0,height:0,getContext:()=>new Proxy({
    measureText:t=>({width:String(t).length*10}),fillText:t=>testi.push(t),
    createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})
  },{get:(o,k)=>k in o?o[k]:()=>{}})});
  for(const id of a.run("D.champs.map(c=>c.id)")){
    a.imposta("D.cur",id);testi.length=0;
    a.run(`var selezionati=D.players.filter(p=>C().type==='misto'||p.sex===(C().type==='femminile'?'F':'M')).slice(0,8).map(p=>p.id);
      C().events.push({id:'g',name:'Giornata',date:'2026-11-03',status:'bozza',created:1,presenti:selezionati,
        pairs:Array.from({length:4},(_,i)=>[selezionati[i*2],selezionati[i*2+1]]),matches:[],seeds:{},storico:[]});buildBoard(EV('g'))`);
    const titolo=a.run("C().name.toUpperCase()");
    await a.run("drawLocandina(EV('g'))");assert.ok(testi.some(t=>String(t).trim()===titolo+' 1'));
    testi.length=0;await a.run("drawClassifica()");assert.ok(testi.includes('1° '+titolo));
  }
});
