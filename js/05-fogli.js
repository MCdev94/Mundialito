/* Mundialito — Pannelli a comparsa: tornei, giocatore, giornata, decreto campioni, stampe */
"use strict";
/* --- fogli --- */
function renderSheet(){
  document.querySelectorAll(".sheet").forEach(n => n.remove());
  if(!sheet) return;
  let inner = "";

  if(sheet.tipo === "champs"){
    inner = `<h3>Tornei</h3><p class="hint">${C().type === "femminile" ? "Le giocatrici sono le stesse" : "I giocatori sono gli stessi"}, i punti di ogni torneo restano separati.</p>
      ${D.champs.map(c => `<button class="card card--tap" data-act="setchamp" data-id="${c.id}">
        <div class="card__row"><span class="card__t"><span class="${dotCls(c.type)}" style="display:inline-block;margin-right:8px"></span>${esc(c.name)}</span>
        ${c.id===D.cur?'<span class="badge">attivo</span>':''}</div>
        <p class="card__s">${tipoLabel(c.type)} · ${giornateChiuse(c)} giornate giocate</p></button>`).join("")}
      <div class="block"><button class="btn btn--quiet" data-act="closesheet">Chiudi</button></div>`;
  }

  if(sheet.tipo === "newchamp"){
    const t = sheet.tmp;
    inner = `<h3>Nuovo campionato</h3>
      <label class="fld"><span>Nome</span><input id="ch_name" value="${esc(t.name)}" placeholder="Mundialito maschile"></label>
      <div class="block" style="margin-top:0"><h2>Tipo</h2><div class="chips">
        ${["maschile","femminile","misto"].map(x=>`<button class="chip" data-act="chtype" data-v="${x}" aria-pressed="${t.type===x}">${tipoLabel(x)}</button>`).join("")}
      </div></div>
      <div class="block"><h2>Durata</h2>
        <div class="stepper"><button data-act="chset" data-k="settimane" data-v="-1">−</button>
          <b>${t.settimane}</b><button data-act="chset" data-k="settimane" data-v="1">+</button><small>settimane</small></div></div>
      <div class="block"><h2>Bonus presenze</h2>
        <div class="stepper" style="margin-bottom:10px"><button data-act="chset" data-k="soglia" data-v="-1">−</button>
          <b>${t.soglia}</b><button data-act="chset" data-k="soglia" data-v="1">+</button><small>presenze minime</small></div>
        <div class="stepper"><button data-act="chset" data-k="bonus" data-v="-1">−</button>
          <b>${t.bonus}</b><button data-act="chset" data-k="bonus" data-v="1">+</button><small>punti bonus</small></div></div>
      <div class="block"><button class="btn" data-act="savechamp">Crea</button>
      <button class="btn btn--quiet" data-act="closesheet">Annulla</button></div>`;
  }

  if(sheet.tipo === "player"){
    const p = P(sheet.id);
    const vinte = vittorieDi(sheet.id).sort((x,y) => (x.tipo > y.tipo ? 1 : -1) || (parseInt(x.edizione)||0) - (parseInt(y.edizione)||0));
    const htmlVinte = vinte.length ? `<div class="block"><h2>Vittorie ${stelle(sheet.id)}</h2>
      ${vinte.map(a => { const comp = (a.giocatori||[]).find(x => x !== sheet.id);
        const nomeComp = comp ? nm(comp) : ((a.nomi||[]).find(n => n !== p.name) || "");
        const ch = D.champs.find(c => c.type === a.tipo);
        return `<p class="note" style="margin:6px 0">🏆 ${esc(ch ? ch.name : a.tipo)}, ${esc(a.edizione)}ª edizione — con ${esc(nomeComp)}</p>`; }).join("")}</div>` : "";
    const righe = [];
    D.champs.forEach(ch => {
      const t = totals(null, ch);
      const r = t[sheet.id]; if(!r || (!r.campo && !r.pres)) return;
      const pos = classificaFinal8(ch).findIndex(x => x.id === sheet.id) + 1;
      righe.push(`<tr><td>${esc(ch.name)}<br><span class="pt">${pos?`${pos}° posto`:""}</span></td>
        <td class="pts">${r.pts}${r.bonus ? `<br><span class="pt">di cui ${r.bonus} di bonus</span>` : ""}</td><td>${r.pres}</td></tr>`);
    });
    const sto = ordered().filter(e => e.status === "chiuso" && e.pairs.flat().includes(sheet.id)).reverse()
      .map(e => { const pp = eventPoints(e); const pr = e.pairs.find(x => x.includes(sheet.id));
        const comp = pr[0] === sheet.id ? pr[1] : pr[0];
        return `<tr><td>${esc(e.name)}<br><span class="pt">con ${esc(nm(comp))}</span></td><td class="pts">${pp[sheet.id]}</td></tr>`; });
    const altri = D.players.filter(x => x.id !== sheet.id && x.sex === p.sex && !x.archived)
      .sort((a,b) => a.name.localeCompare(b.name));
    inner = `<h3>${esc(p.name)} ${stelle(sheet.id)}</h3><p class="hint">${p.sex === "F" ? "Donna" : "Uomo"}</p>
      ${righe.length?`<table class="table"><thead><tr><th>Campionato</th><th>Punti</th><th>Pres.</th></tr></thead>
        <tbody>${righe.join("")}</tbody></table>`:`<p class="empty">Nessuna presenza registrata.</p>`}
      ${htmlVinte}
      ${sto.length?`<div class="block"><h2>Giornate in ${esc(C().name)}</h2>
        <table class="table"><tbody>${sto.join("")}</tbody></table></div>`:""}
      <div class="block"><h2>Correzioni</h2>
        <button class="btn btn--quiet" data-act="rename" data-id="${sheet.id}">Cambia nome</button>
        <button class="btn btn--quiet" data-act="sex" data-id="${sheet.id}">Segna come ${p.sex==="F"?"uomo":"donna"}</button>
        <button class="btn btn--quiet" data-act="archive" data-id="${sheet.id}">${p.archived?"Rimetti in lista":"Segna come ritirato"}</button>
        <label class="fld" style="margin-top:12px"><span>È la stessa persona di…</span>
          <select id="mergeTo"><option value="">— scegli per unire le schede —</option>
          ${altri.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></label>
        <button class="btn btn--quiet" data-act="merge" data-id="${sheet.id}">Unisci le due schede</button>
        <button class="btn btn--ghost" data-act="closesheet">Chiudi</button></div>`;
  }

  if(sheet.tipo === "login"){
    inner = `<h3>Accesso gestore</h3>
      <p class="hint">Serve solo a chi gestisce le giornate. Si fa una volta sola: la sessione resta su questo dispositivo.</p>
      <form data-act="dologin">
        <label class="fld"><span>Mail</span><input id="lg_mail" type="email" autocomplete="username" inputmode="email"></label>
        <label class="fld"><span>Password</span><input id="lg_pwd" type="password" autocomplete="current-password"></label>
        <button class="btn" type="submit">Entra</button>
      </form>
      <div class="block"><button class="btn btn--quiet" data-act="closesheet">Annulla</button></div>`;
  }

  if(sheet.tipo === "classifica"){
    inner = `<h3>Classifica da condividere</h3>
      <p class="hint">Classifica completa su più pagine, con le qualifiche alla Final 8 in evidenza. Immagini per WhatsApp o PDF da stampare.</p>
      <label class="fld" style="margin-bottom:10px"><span>Edizione da stampare</span>
        <input data-act="edizione" inputmode="numeric" value="${esc(edizioneDi(C()))}" placeholder="es. 2" style="max-width:120px"></label>
      <div id="locaWrap" style="background:var(--paper);border:1px solid var(--line);border-radius:12px;
        padding:8px;min-height:140px;display:grid;gap:8px;place-items:center;color:var(--ink-soft);font-size:14px">Preparo le immagini…</div>
      <div class="block">
        <button class="btn" data-act="loca-png">Scarica le immagini</button>
        <button class="btn btn--ghost" data-act="loca-share">Condividi</button>
        <button class="btn btn--quiet" data-act="loca-pdf">Scarica il PDF</button>
        <button class="btn btn--quiet" data-act="closesheet">Chiudi</button>
      </div>`;
  }

  if(sheet.tipo === "locandina"){
    inner = `<h3>Locandina</h3>
      <p class="hint">Immagine pronta per WhatsApp, o PDF da stampare.</p>
      <label class="fld" style="margin-bottom:10px"><span>Edizione da stampare</span>
        <input data-act="edizione" inputmode="numeric" value="${esc(edizioneDi(C()))}" placeholder="es. 2" style="max-width:120px"></label>
      <div id="locaWrap" style="background:var(--paper);border:1px solid var(--line);border-radius:12px;
        padding:8px;min-height:140px;display:grid;place-items:center;color:var(--ink-soft);font-size:14px">Preparo l'immagine…</div>
      <div class="block">
        <button class="btn" data-act="loca-png">Scarica l'immagine</button>
        <button class="btn btn--ghost" data-act="loca-share">Condividi</button>
        <button class="btn btn--quiet" data-act="loca-pdf">Scarica il PDF</button>
        <button class="btn btn--quiet" data-act="closesheet">Chiudi</button>
      </div>`;
  }

  if(sheet.tipo === "decreta"){
    const c = C(), t = sheet.tmp;
    const cand = D.players.filter(p => eligible(p) || t.p1 === p.id || t.p2 === p.id)
      .sort((a,b) => a.name.localeCompare(b.name));
    const opz = sel => `<option value="">— scegli —</option>` +
      cand.map(p => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.name)}</option>`).join("");
    inner = `<div class="trofeo">🏆</div>
      <h3 style="text-align:center">Decreta i campioni</h3>
      <p class="hint" style="text-align:center">${esc(c.name)}${t.daFinale ? " · coppia vincitrice della finale" : ""}</p>
      <label class="fld"><span>Primo campione</span><select id="dv_p1">${opz(t.p1)}</select></label>
      <label class="fld"><span>Secondo campione</span><select id="dv_p2">${opz(t.p2)}</select></label>
      <div class="row2">
        <label class="fld"><span>Edizione</span><input id="dv_ed" inputmode="numeric" value="${esc(t.ed)}" placeholder="es. 2"></label>
        <label class="fld"><span>Data</span><input id="dv_data" type="date" value="${t.data}"></label>
      </div>
      <button class="btn btn--oro" data-act="incorona">Incorona i campioni</button>
      <button class="btn btn--quiet" data-act="closesheet">Annulla</button>`;
  }

  if(sheet.tipo === "campioni" || sheet.tipo === "albovoce"){
    const a = voceAlbo(sheet.id);
    if(!a){ sheet = null; return; }
    const ch = D.champs.find(c => c.type === a.tipo);
    inner = `<div class="festa">
        <div class="trofeo">🏆</div>
        <p class="festa__sopra">${sheet.tipo === "campioni" ? "I campioni del" : "Campioni del"}</p>
        <p class="festa__torneo">${esc(ch ? ch.name : a.tipo)} · ${esc(a.edizione)}ª edizione</p>
        <p class="festa__nome">${esc(nomeAlbo(a,0))}</p>
        <p class="festa__e">e</p>
        <p class="festa__nome">${esc(nomeAlbo(a,1))}</p>
        ${a.data ? `<p class="festa__data">${esc(dataLunga({date:a.data}))}</p>` : ""}
      </div>
      <div class="block">
        <button class="btn" data-act="closesheet">${sheet.tipo === "campioni" ? "Fantastico" : "Chiudi"}</button>
        ${sheet.tipo === "albovoce" && canWrite() && (D.albo || []).some(x => x.id === a.id) ? `<button class="btn btn--danger" data-act="albotogli" data-id="${a.id}">Togli dall'albo d'oro</button>` : ""}
      </div>`;
  }

  if(sheet.tipo === "event"){
    const ev = sheet.id ? EV(sheet.id) : null;
    const v = ev || {name:"", date:oggi(), ora:""};
    inner = `<h3>${ev?"Modifica giornata":"Nuova giornata"}</h3>
      <label class="fld"><span>Nome</span><input id="ev_name" value="${esc(v.name)}" placeholder="${giornateChiuse()+1}ª giornata"></label>
      <div class="row2"><label class="fld" style="flex:2"><span>Data</span><input id="ev_date" type="date" value="${v.date}"></label>
        <label class="fld" style="flex:1"><span>Ora</span><input id="ev_ora" value="${esc(v.ora||"")}" placeholder="11:30"></label></div>
      <div class="block" style="margin-top:0"><h2>Campi</h2><div class="stepper">
        <button data-act="evcampi" data-v="-1">−</button><b id="ev_campi">${sheet.tmp.campi}</b>
        <button data-act="evcampi" data-v="1">+</button></div></div>
      <div class="block"><button class="btn" data-act="saveev">${ev?"Salva":"Crea la giornata"}</button>
        <button class="btn btn--quiet" data-act="closesheet">Annulla</button>
        ${ev?`<button class="btn btn--danger" data-act="delev">Elimina la giornata</button>`:""}</div>`;
  }

  const d = document.createElement("div");
  d.className = "sheet"; d.innerHTML = `<div class="sheet__in">${inner}</div>`;
  d.addEventListener("click", e => { if(e.target === d){ sheet = null; render(); } });
  document.body.appendChild(d);
  if(sheet.tipo === "login"){
    inner = `<h3>Accesso gestore</h3>
      <p class="hint">Serve solo a chi gestisce le giornate. Si fa una volta sola: la sessione resta su questo dispositivo.</p>
      <form data-act="dologin">
        <label class="fld"><span>Mail</span><input id="lg_mail" type="email" autocomplete="username" inputmode="email"></label>
        <label class="fld"><span>Password</span><input id="lg_pwd" type="password" autocomplete="current-password"></label>
        <button class="btn" type="submit">Entra</button>
      </form>
      <div class="block"><button class="btn btn--quiet" data-act="closesheet">Annulla</button></div>`;
  }

  if(sheet.tipo === "locandina" || sheet.tipo === "classifica") disegnaFoglio();
}
function disegnaFoglio(){
  const w = document.querySelector("#locaWrap");
  if(!w || !sheet) return;
  const lavoro = sheet.tipo === "locandina"
    ? drawLocandina(EV(sheet.id)).then(cv => [cv])
    : drawClassifica(C());
  lavoro.then(pagine => {
    LOCA = pagine; w.innerHTML = "";
    pagine.forEach(cv => { cv.style.width = "100%"; cv.style.height = "auto"; cv.style.display = "block"; w.appendChild(cv); });
  }).catch(e => { w.textContent = "Non riesco a disegnarla: " + ((e && e.message) || ""); });
}
