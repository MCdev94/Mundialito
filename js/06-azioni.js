/* Mundialito — Gestione di tocchi, moduli e campi di testo */
"use strict";
/* ============================ AZIONI ============================ */
tabsEl.addEventListener("click", e => {
  const b = e.target.closest("button[data-tab]"); if(!b) return;
  tab = b.dataset.tab; openEvent = null; sheet = null; search = ""; render();
});

document.addEventListener("submit", e => {
  const f = e.target.closest("form[data-act]"); if(!f) return;
  e.preventDefault();
  if(f.dataset.act === "dologin"){
    login(document.getElementById("lg_mail").value.trim(), document.getElementById("lg_pwd").value);
    return;
  }
  if(!canWrite()){ toast("Serve l'accesso da gestore per modificare"); return; }
  const misto = C().type === "misto";
  if(f.dataset.act === "addp"){
    const i = document.getElementById("newp"), v = i.value.trim(); if(!v) return;
    const sx = misto ? document.getElementById("newsex").value : (C().type === "femminile" ? "F" : "M");
    const id = uid(); D.players.push({id, name:v, sex:sx});
    const ev = EV(openEvent); ev.presenti = ev.presenti || []; ev.presenti.push(id);
    save(); render(); toast(v + " aggiunto e segnato presente");
  }
  if(f.dataset.act === "addp2"){
    const i = document.getElementById("newp2"), v = i.value.trim(); if(!v) return;
    const sx = misto ? document.getElementById("newsex2").value : (C().type === "femminile" ? "F" : "M");
    D.players.push({id:uid(), name:v, sex:sx}); save(); render(); toast(v + " aggiunto");
  }
});

document.addEventListener("input", e => {
  if(e.target.matches('[data-act="search"]')){
    search = e.target.value; const pos = e.target.selectionStart; render();
    const n = document.getElementById("q"); if(n){ n.focus(); n.setSelectionRange(pos,pos); }
  }
  if(e.target.matches('[data-act="edizione"]')){
    D.settings.edizioni = D.settings.edizioni || {};
    D.settings.edizioni[C().id] = e.target.value.trim();
    if(canWrite()) save(); else salvaLocale();
    clearTimeout(window._tEd); window._tEd = setTimeout(disegnaFoglio, 350);
  }
  if(e.target.matches('[data-act="pt"]') && canWrite()){
    const ev2 = EV(openEvent); if(!ev2) return;
    const v = e.target.value === "" ? null : Math.max(0, Math.min(999, parseInt(e.target.value,10)));
    if(Array.isArray(ev2.punti)) ev2.punti[+e.target.dataset.k] = Number.isNaN(v) ? null : v;
    save();
  }
  if((e.target.matches('[data-act="bonuspunti"]') || e.target.matches('[data-act="bonuspres"]')) && canWrite()){
    const c2 = C();
    const v = parseInt(e.target.value, 10);
    const val = Number.isNaN(v) ? 0 : Math.max(0, Math.min(e.target.dataset.act === "bonuspunti" ? 50 : 40, v));
    if(e.target.dataset.act === "bonuspunti") c2.bonus = val; else c2.soglia = val;
    save();
    const list = classificaFinal8();
    const tab = document.getElementById("tabClass"); if(tab) tab.innerHTML = tabellaClassifica(list);
    const nota = document.getElementById("bonusNota"); if(nota) nota.textContent = notaBonus(c2, list.filter(r => r.bonus).length);
  }
  if(e.target.matches('[data-act="datafinale"]') && canWrite()){ C().dataFinale = e.target.value || ""; save(); }
  if(e.target.matches('[data-act="orafinale"]') && canWrite()){ C().oraFinale = e.target.value; save(); }
  if(e.target.matches('[data-act="firma"]') && canWrite()){ D.settings.firma = e.target.value; save(); }
  if(e.target.matches('[data-act="logo"]')) setLogo(e.target.files[0]);
  if(e.target.matches('[data-act="import"]')) doImport(e.target.files[0]);
});

document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if(!el) return;
  const a = el.dataset.act, ev = EV(openEvent), c = C();
  if(!canWrite() && !AZIONI_LETTURA.has(a)){
    toast("Serve l'accesso da gestore per modificare"); return;
  }

  if(a === "home"){ openEvent = null; render(); return; }
  if(a === "closesheet"){ sheet = null; render(); return; }

  /* campionati */
  if(a === "champs"){ sheet = {tipo:"champs"}; render(); return; }
  if(a === "setchamp"){ D.cur = el.dataset.id; sheet = null; openEvent = null; tab = "giornate"; search = ""; save(); render(); return; }
  if(a === "newchamp"){ return; }
  if(a === "chtype"){ sheet.tmp.type = el.dataset.v; render(); return; }
  if(a === "chset"){
    const k = el.dataset.k;
    const lim = k === "soglia" ? [0,40] : k === "settimane" ? [6,12] : [0,50];
    sheet.tmp[k] = Math.max(lim[0], Math.min(lim[1], sheet.tmp[k] + (+el.dataset.v))); render(); return;
  }
  if(a === "savechamp"){
    const name = (document.getElementById("ch_name").value || "").trim() || "Mundialito " + tipoLabel(sheet.tmp.type).toLowerCase();
    const ed = "";
    const id = uid();
    D.champs.push({id, name, ed, type:sheet.tmp.type, soglia:sheet.tmp.soglia, bonus:sheet.tmp.bonus,
      settimane:sheet.tmp.settimane || 8, base:0, carry:{}, bonusAss:null, events:[]});
    D.cur = id; sheet = null; tab = "giornate"; save(); render(); toast("Campionato creato"); return;
  }

  /* giornate */
  if(a === "newev"){ sheet = {tipo:"event", id:null, tmp:{mult:1, campi:D.settings.campi}}; render(); return; }
  if(a === "editev"){ sheet = {tipo:"event", id:openEvent, tmp:{mult:ev.mult, campi:ev.campi}}; render(); return; }
  if(a === "openev"){ openEvent = el.dataset.id; const x = EV(openEvent);
    step = x.finale ? "tabellone"
      : (x.ordine && x.ordine.length) ? "punteggio"
      : (x.matches && x.matches.length) ? "tabellone"
      : x.pairs.length ? "coppie" : "presenti";
    sel = []; search = ""; render(); return; }
  if(a === "evcampi"){ sheet.tmp.campi = Math.max(1, Math.min(12, sheet.tmp.campi + (+el.dataset.v)));
    document.getElementById("ev_campi").textContent = sheet.tmp.campi; return; }
  if(a === "saveev"){
    const name = (document.getElementById("ev_name").value || "").trim() || "Giornata del " + dataIt(oggi());
    const date = document.getElementById("ev_date").value || oggi();
    const ora = (document.getElementById("ev_ora").value || "").trim();
    if(sheet.id) Object.assign(EV(sheet.id), {name, date, ora, mult:sheet.tmp.mult, campi:sheet.tmp.campi});
    else{
      const id = uid();
      c.events.push({id, created:Date.now(), name, date, ora, mult:sheet.tmp.mult, campi:sheet.tmp.campi,
        status:"bozza", presenti:[], pairs:[], matches:[], seeds:{}});
      openEvent = id; step = "presenti"; sel = [];
    }
    sheet = null; save(); render(); return;
  }
  if(a === "delev"){
    const id = (sheet && sheet.id) ? sheet.id : openEvent;
    if(confirm("Elimino questa giornata e i suoi punti?")){
      c.events = c.events.filter(x => x.id !== id); sheet = null; openEvent = null; save(); render();
    } return;
  }

  /* wizard */
  if(a === "step"){ step = el.dataset.v; sel = []; search = ""; render(); return; }
  if(a === "togglep"){
    const id = el.dataset.id; ev.presenti = ev.presenti || [];
    if(ev.presenti.includes(id)){
      ev.presenti = ev.presenti.filter(x => x !== id);
      ev.pairs = ev.pairs.filter(pr => !pr.includes(id));
    } else ev.presenti.push(id);
    save(); render(); return;
  }
  if(a === "pick"){
    const id = el.dataset.id;
    if(sel.includes(id)) sel = sel.filter(x => x !== id); else sel.push(id);
    if(sel.length === 2){
      if(c.type === "misto" && P(sel[0]).sex === P(sel[1]).sex){
        sel = []; render(); toast("Nel misto la coppia è una donna e un uomo"); return;
      }
      const pr = c.type === "misto" && P(sel[0]).sex === "M" ? [sel[1], sel[0]] : [sel[0], sel[1]];
      ev.pairs.push(pr); sel = []; save();
    }
    render(); return;
  }
  if(a === "unpair"){ ev.pairs.splice(+el.dataset.i, 1); save(); render(); return; }
  if(a === "auto"){
    autoPairs(ev, el.dataset.m); save(); render();
    const fuori = (ev.presenti||[]).length - ev.pairs.length*2;
    if(fuori > 0) toast(fuori === 1 ? "Uno resta senza coppia" : fuori + " restano senza coppia");
    return;
  }
  if(a === "board"){ buildBoard(ev); step = "tabellone"; save(); render(); return; }
  if(a === "win"){ const m = ev.matches[+el.dataset.i];
    m.winner = (m.winner === el.dataset.s) ? null : el.dataset.s; save(); render(); return; }
  if(a === "finale8"){
    if(finaleDi(c)){ toast("La finale esiste già"); return; }
    const top = classificaFinal8(c).filter(r => r.final8);
    const coppie = coppieFinal8(c);
    if(!coppie.length){ toast(c.type === "misto" ? "Servono almeno 4 uomini e 4 donne con presenze" : "Servono almeno 8 " + partecipanti(c) + " con presenze"); return; }
    if(!confirm("Creo la Final 8: " + top.map(r => r.name).join(", ") + "?")) return;
    const ids = top.map(r => r.id);
    const seeds = {}; const t = totals(null, c);
    coppie.forEach((pr,i) => seeds[i] = (t[pr[0]] ? t[pr[0]].pts : 0) + (t[pr[1]] ? t[pr[1]].pts : 0));
    const id = uid();
    c.events.push({id, created:Date.now(), name:"Finale a 8", date:c.dataFinale || oggi(),
      ora:/^\d/.test((c.oraFinale || "").trim()) ? c.oraFinale.trim() : "", mult:1, campi:2,
      finale:true, status:"bozza", presenti:ids, pairs:coppie, seeds,
      matches:[{pa:0, pb:1, winner:null}, {pa:2, pb:3, winner:null}],
      storico:[], ordine:null, punti:null});
    openEvent = id; step = "tabellone"; save(); render();
    toast("Finale creata: controlla le coppie"); return;
  }
  if(a === "turno"){
    ev.storico = ev.storico || [];
    ev.storico.push(ev.matches.map(m => ({pa:m.pa, pb:m.pb, winner:m.winner})));
    ev.matches = prossimoTurno(ev);
    ev.ordine = null; ev.punti = null;
    save(); render(); toast((ev.storico.length + 1) + "° turno pronto");
    return;
  }
  if(a === "indietro"){
    if(!(ev.storico || []).length) return;
    ev.matches = ev.storico.pop();
    ev.ordine = null; ev.punti = null;
    save(); render(); return;
  }
  if(a === "vaipunteggio"){ ev.ordine = ev.ordine || []; step = "punteggio"; save(); render(); return; }
  if(a === "piazza"){
    ev.ordine = ev.ordine || [];
    const pi = +el.dataset.pi; if(!ev.ordine.includes(pi)) ev.ordine.push(pi);
    save(); render(); return;
  }
  if(a === "togli"){ ev.ordine.splice(+el.dataset.k, 1); save(); render(); return; }
  if(a === "ricomincia"){ ev.ordine = []; save(); render(); return; }
  if(a === "assegna"){
    const nGioc = ev.ordine.length * 2;
    if(!confirm(`Assegno i punti di "${ev.name}" a ${nGioc} ${partecipanti(c)} e chiudo la giornata? La classifica si aggiorna e la giornata sparisce dall'elenco.`)) return;
    const n = chiudiGiornata(ev);
    openEvent = null; tab = "giornate"; save(); render();
    toast("Classifica aggiornata per " + n + " " + partecipanti(c)); return;
  }
  if(a === "annullaultima"){
    const u = c.ultima; if(!u) return;
    if(!confirm(`Tolgo dalla classifica i punti di "${u.nome}" e la riapro per correggere l'ordine?`)) return;
    const id = annullaUltima();
    if(id){ openEvent = id; step = "punteggio"; }
    save(); render(); toast("Punti tolti, giornata riaperta"); return;
  }
  if(a === "su" || a === "giu"){
    const k = +el.dataset.k, j = a === "su" ? k-1 : k+1;
    if(j < 0 || j >= ev.ordine.length) return;
    const t2 = ev.ordine[k]; ev.ordine[k] = ev.ordine[j]; ev.ordine[j] = t2;
    save(); render(); return;
  }
  if(a === "ricalcola"){
    ev.ordine = ordineDaTabellone(ev); ev.punti = null; initPunti(ev);
    save(); render(); toast("Punti ricalcolati"); return;
  }
  if(a === "close"){ ev.status = "chiuso"; save(); render(); toast("Classifica aggiornata"); return; }
  if(a === "decreta"){
    const fin = el.dataset.fin ? EV(el.dataset.fin) : finaleDi(c);
    const coppia = vincitoreFinale(fin);
    sheet = {tipo:"decreta", tmp:{p1:coppia ? coppia[0] : "", p2:coppia ? coppia[1] : "",
      ed:edizioneDi(c), data:oggi(), finaleId:fin && coppia ? fin.id : null, daFinale:!!coppia}};
    render(); return;
  }
  if(a === "incorona"){
    const p1 = document.getElementById("dv_p1").value, p2 = document.getElementById("dv_p2").value;
    const ed = (document.getElementById("dv_ed").value || "").trim();
    const data = document.getElementById("dv_data").value || oggi();
    sheet.tmp = {...sheet.tmp, p1, p2, ed, data};
    if(!p1 || !p2){ toast("Scegli tutti e due i campioni"); return; }
    if(p1 === p2){ toast(c.type === "femminile" ? "Servono due giocatrici diverse" : "Servono due giocatori diversi"); return; }
    if(c.type === "misto" && P(p1).sex === P(p2).sex){ toast("Nel misto la coppia è una donna e un uomo"); return; }
    if(!ed){ toast("Scrivi il numero dell'edizione"); return; }
    const gia = (D.albo || []).find(x => x.tipo === c.type && String(x.edizione) === ed);
    if(gia && !confirm(`Per la ${ed}ª edizione c'è già ${nomeAlbo(gia,0)} e ${nomeAlbo(gia,1)}. Li sostituisco?`)) return;
    D.albo = (D.albo || []).filter(x => x !== gia);
    const rec = {id:uid(), champ_id:c.id, tipo:c.type, edizione:ed, data, giocatori:[p1,p2], nomi:[nm(p1), nm(p2)]};
    D.albo.push(rec);
    if(sheet.tmp.finaleId){ const f = EV(sheet.tmp.finaleId); if(f) f.status = "chiuso"; }
    D.settings.edizioni = D.settings.edizioni || {};
    if(!D.settings.edizioni[c.id]) D.settings.edizioni[c.id] = ed;
    sheet = {tipo:"campioni", id:rec.id}; save(); render(); return;
  }
  if(a === "albovedi"){ sheet = {tipo:"albovoce", id:el.dataset.id}; render(); return; }
  if(a === "albotogli"){
    const x = (D.albo || []).find(y => y.id === el.dataset.id); if(!x) return;
    if(!confirm(`Tolgo ${nomeAlbo(x,0)} e ${nomeAlbo(x,1)} dall'albo d'oro della ${x.edizione}ª edizione?`)) return;
    D.albo = D.albo.filter(y => y !== x); sheet = null; save(); render(); toast("Tolti dall'albo d'oro"); return;
  }
  if(a === "reopen"){ ev.status = "bozza"; step = "tabellone"; save(); render(); return; }
  if(a === "correggi"){ ev.status = "bozza"; initPunti(ev); step = "punti"; save(); render(); return; }

  /* giocatori */
  if(a === "player"){ sheet = {tipo:"player", id:el.dataset.id}; render(); return; }
  if(a === "rename"){ const p = P(el.dataset.id), v = prompt("Nome", p.name);
    if(v && v.trim()){ p.name = v.trim(); save(); render(); } return; }
  if(a === "sex"){ const p = P(el.dataset.id); p.sex = p.sex === "F" ? "M" : "F"; save(); render(); return; }
  if(a === "archive"){ const p = P(el.dataset.id); p.archived = !p.archived; save(); render(); return; }
  if(a === "merge"){
    const to = document.getElementById("mergeTo").value, from = el.dataset.id;
    if(!to){ toast("Scegli prima con chi unirla"); return; }
    if(!confirm(`Unisco ${P(from).name} dentro ${P(to).name}? Punti e presenze si sommano.`)) return;
    mergePlayers(from, to); sheet = {tipo:"player", id:to}; save(); render(); toast("Schede unite"); return;
  }

  /* impostazioni */
  if(a === "cset"){
    const k = el.dataset.k;
    const lim = k === "soglia" ? [0,40] : k === "settimane" ? [6,12] : k === "base" ? [0,40] : [0,50];
    const base = k === "settimane" ? (c.settimane || 8) : k === "base" ? (c.base || 0) : c[k];
    c[k] = Math.max(lim[0], Math.min(lim[1], base + (+el.dataset.v))); save(); render(); return;
  }
  if(a === "set"){ D.settings.campi = Math.max(1, Math.min(12, D.settings.campi + (+el.dataset.v))); save(); render(); return; }
  if(a === "export"){ doExport(); return; }
  if(a === "wipe"){ if(confirm("Cancello tutto da questo browser?")){
      try{ localStorage.removeItem(KEY); }catch(e){}
      D = fresh(); openEvent = null; sheet = null; save(); render(); } return; }
  if(a === "login"){ sheet = {tipo:"login"}; render(); return; }
  if(a === "logout"){ if(confirm("Esco dalla modalità gestore su questo dispositivo?")) logout(); return; }
  if(a === "sync"){ syncNow(false); return; }
  if(a === "loca"){ LOCA = []; sheet = {tipo:"locandina", id:openEvent}; render(); return; }
  if(a === "stampaclass"){ LOCA = []; sheet = {tipo:"classifica"}; render(); return; }
  if(a === "loca-png"){ locaSave("png"); return; }
  if(a === "loca-pdf"){ locaSave("pdf"); return; }
  if(a === "loca-share"){ locaShare(); return; }
  if(a === "dellogo"){ D.settings.logo = null; save(); render(); return; }
  if(a === "shareclass"){ copia(testoClassifica()); return; }
  if(a === "shareev"){ copia(testoEvento(ev)); return; }
});

function mergePlayers(from, to){
  D.champs.forEach(ch => {
    const f = ch.carry[from];
    if(f){ const t = ch.carry[to] || {pts:0, pres:0};
      ch.carry[to] = {pts:(t.pts||0)+(f.pts||0), pres:(t.pres||0)+(f.pres||0)}; delete ch.carry[from]; }
    ch.events.forEach(ev => {
      ev.presenti = (ev.presenti||[]).map(x => x === from ? to : x).filter((x,i,arr) => arr.indexOf(x) === i);
      ev.pairs = (ev.pairs||[]).map(pr => pr.map(x => x === from ? to : x));
    });
  });
  (D.albo || []).forEach(a => { a.giocatori = (a.giocatori || []).map(x => x === from ? to : x); });
  D.players = D.players.filter(p => p.id !== from);
}
