/* Goné Padel Cup — Tabellone, turni della finale, abbinamenti automatici */
"use strict";
/* ---------- tabellone ---------- */
function buildBoard(ev){
  const t = totals(ev.id);
  ev.seeds = {};
  ev.pairs.forEach((pr,i) => ev.seeds[i] = (t[pr[0]]?t[pr[0]].pts:0) + (t[pr[1]]?t[pr[1]].pts:0));
  const order = ev.pairs.map((_,i) => i).sort((a,b) => ev.seeds[b] - ev.seeds[a]);
  ev.matches = [];
  for(let k=0; k<order.length; k+=2)
    ev.matches.push({pa:order[k], pb:(k+1 < order.length ? order[k+1] : null), winner:null});
}
function prossimoTurno(ev){
  if(ev.finale){
    const vin = [], per = [];
    ev.matches.forEach(m => {
      if(m.pb === null || m.pb === undefined){ vin.push(m.pa); return; }
      const a = m.winner === "a";
      vin.push(a ? m.pa : m.pb); per.push(a ? m.pb : m.pa);
    });
    const out = [];
    if(vin.length >= 2) out.push({pa:vin[0], pb:vin[1], winner:null});
    if(per.length >= 2) out.push({pa:per[0], pb:per[1], winner:null});
    return out;
  }
  const campi = ev.matches.length;
  const pos = Array.from({length:campi}, () => []);
  ev.matches.forEach((m,i) => {
    if(m.pb === null || m.pb === undefined){ pos[i].push(m.pa); return; }
    const w = m.winner === "a" ? m.pa : m.pb;
    const l = m.winner === "a" ? m.pb : m.pa;
    pos[Math.max(0, i-1)].push(w);
    pos[Math.min(campi-1, i+1)].push(l);
  });
  return pos.filter(a => a.length)
            .map(a => ({pa:a[0], pb:a.length > 1 ? a[1] : null, winner:null}));
}
function campoLabel(ev, i){
  if(ev.finale){
    const t = (ev.storico || []).length + 1;
    if(t === 1) return "SEMIFINALE " + (i + 1);
    return i === 0 ? "FINALE" : "3° E 4° POSTO";
  }
  const c = ev.campi || D.settings.campi || 5;
  const turno = Math.floor(i / c) + 1;
  return "CAMPO " + (i % c + 1) + (turno > 1 ? " · " + turno + "° TURNO" : "");
}
function autoPairs(ev, modo){
  const t = totals(ev.id);
  const pres = [...(ev.presenti || [])];
  const pt = id => t[id] ? t[id].pts : 0;
  const mix = a => { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
  ev.pairs = [];
  if(C().type === "misto"){
    let U = pres.filter(id => P(id).sex === "M"), F = pres.filter(id => P(id).sex === "F");
    if(modo === "cas"){ mix(U); mix(F); } else { U.sort((a,b)=>pt(b)-pt(a)); F.sort((a,b)=>pt(b)-pt(a)); }
    if(modo === "bil") F.reverse();
    const n = Math.min(U.length, F.length);
    for(let i=0;i<n;i++) ev.pairs.push([F[i], U[i]]);
  } else {
    let ids = pres.slice();
    if(modo === "cas") mix(ids); else ids.sort((a,b)=>pt(b)-pt(a));
    if(modo === "bil"){ while(ids.length >= 2) ev.pairs.push([ids.shift(), ids.pop()]); }
    else for(let i=0; i+1<ids.length; i+=2) ev.pairs.push([ids[i], ids[i+1]]);
  }
}
