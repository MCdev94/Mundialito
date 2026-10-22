/* Mundialito — Disegno delle schermate: giornate, giornata, classifica, giocatori, altro */
"use strict";
/* ============================ RENDER ============================ */
function render(){
  tabsEl.querySelectorAll("button").forEach(b => b.setAttribute("aria-current", String(b.dataset.tab === tab)));
  const schedaPersone = tabsEl.querySelector('[data-tab="giocatori"]');
  if(schedaPersone) schedaPersone.lastChild.textContent = C().type === "femminile" ? "Giocatrici" : "Giocatori";
  if(openEvent) renderEvento();
  else if(tab === "giornate") renderGiornate();
  else if(tab === "classifica") renderClassifica();
  else if(tab === "giocatori") renderGiocatori();
  else renderAltro();
  renderSheet();
}
function champBtn(){
  const c = C();
  return `<button class="champsel" data-act="champs"><span class="${dotCls(c.type)}"></span>${esc(c.name)} ▾</button>`;
}

/* --- giornate --- */
function renderGiornate(){
  const c = C(), list = ordered().reverse();
  const u = c.ultima;
  app.innerHTML = `
  <header class="top">${champBtn()}
    <div class="top__row"><div>
      <h1 class="top__title">Giornate</h1>
      <p class="top__meta">${giornateChiuse(c)} giocate${list.length ? " · " + list.length + " in corso" : ""}</p>
    </div></div></header>
  ${canWrite() ? `<button class="btn" data-act="newev">Nuova giornata</button>`
    : `<p class="empty">Stai guardando in sola lettura. Per gestire le giornate entra da Altro → Accedi come gestore.</p>`}
  <div class="block">
  ${list.length ? list.map(e => `
    <button class="card card--tap" data-act="openev" data-id="${e.id}">
      <div class="card__row"><span class="card__t">${esc(e.name)}</span>
        <span class="badge badge--soft">${e.finale ? (e.status === "chiuso" ? "conclusa" : "finale") : "in corso"}</span></div>
      <p class="card__s">${dataIt(e.date)} · ${e.finale ? "finale a 8" : e.pairs.length + " copp" + (e.pairs.length===1?"ia":"ie")}</p>
    </button>`).join("")
  : `<p class="empty">Nessuna giornata in corso. Quelle chiuse spariscono da qui: i loro punti sono già in classifica.</p>`}
  </div>
  ${u && canWrite() ? `<div class="block"><h2>Ultima chiusa</h2>
    <div class="card"><div class="card__row"><span class="card__t">${esc(u.nome)}</span>
      <span class="card__s">${dataIt(u.data)}</span></div>
      <p class="card__s">Punti già entrati in classifica. Se hai sbagliato l'ordine, puoi toglierli e riaprirla.</p>
      <button class="btn btn--quiet" data-act="annullaultima" style="margin-top:10px">Togli i punti e riapri</button>
    </div></div>` : ""}`;
}

/* --- evento --- */
function renderEvento(){
  const ev = EV(openEvent);
  if(!ev){ openEvent = null; return render(); }
  if(ev.status === "chiuso") return renderEventoChiuso(ev);
  const misto = C().type === "misto";
  const presenti = ev.presenti || [];
  const inPair = new Set(ev.pairs.flat());
  let body = "";

  if(step === "presenti"){
    const q = search.toLowerCase();
    const list = D.players.filter(p => eligible(p) && p.name.toLowerCase().includes(q))
      .sort((a,b) => a.name.localeCompare(b.name));
    const t = totals(ev.id);
    const nF = presenti.filter(id => P(id).sex === "F").length;
    const sub = misto ? `${nF} donne · ${presenti.length-nF} uomini` :
      `${presenti.length} selezionati${presenti.length%2?" · dispari, uno resta fuori":""}`;
    body = `
    <div class="block"><h2>Chi c'è stasera</h2><p class="hint">${sub}</p>
    <label class="fld"><input id="q" placeholder="Cerca un nome" value="${esc(search)}" data-act="search" autocomplete="off"></label>
    <form class="row2" data-act="addp">
      <input id="newp" placeholder="${C().type === "femminile" ? "Giocatrice nuova" : "Giocatore nuovo"}" autocomplete="off" enterkeyhint="done"
        style="padding:13px 14px;border:1px solid var(--line);border-radius:12px;background:var(--paper);">
      ${misto?`<select id="newsex" style="flex:0 0 86px;padding:13px 8px;border:1px solid var(--line);border-radius:12px;background:var(--paper);">
        <option value="F">Donna</option><option value="M">Uomo</option></select>`:""}
      <button class="btn btn--ghost btn--sm" type="submit" style="flex:0 0 auto;">Aggiungi</button>
    </form>
    <ul class="plist">${list.map(p => `<li class="${presenti.includes(p.id)?"on":""}">
      <button class="ptap" data-act="togglep" data-id="${p.id}">
        <span class="tick">✓</span><span class="nm">${esc(p.name)}</span>
        ${misto?`<span class="sx">${p.sex}</span>`:""}
        <span class="pt">${t[p.id]?t[p.id].pts:0} pt</span></button></li>`).join("")}</ul></div>
    <div class="block"><button class="btn" data-act="step" data-v="coppie" ${presenti.length>=4?"":"disabled"}>Passa alle coppie</button></div>`;
  }

  if(step === "coppie"){
    const t = totals(ev.id);
    const liberi = presenti.filter(id => !inPair.has(id));
    body = `
    <div class="block"><h2>Coppie</h2>
    <p class="hint">${misto?"Ogni coppia è una donna e un uomo. ":""}Tocca due nomi per abbinarli, o lascia fare all'app.</p>
    <div class="row2">
      <button class="btn btn--ghost btn--sm" data-act="auto" data-m="bil">Bilanciate</button>
      <button class="btn btn--ghost btn--sm" data-act="auto" data-m="liv">Per livello</button>
    </div>
    ${ev.pairs.length?`<div class="block">${ev.pairs.map((pr,i)=>`
      <div class="pair"><span class="seed">${(t[pr[0]]?t[pr[0]].pts:0)+(t[pr[1]]?t[pr[1]].pts:0)}</span>
        <span class="nm">${esc(nm(pr[0]))}<br>${esc(nm(pr[1]))}</span>
        <button data-act="unpair" data-i="${i}">Sciogli</button></div>`).join("")}</div>`:""}
    ${liberi.length?`<div class="block"><h2>Ancora liberi</h2><ul class="plist">${liberi.map(id=>`
      <li class="${sel.includes(id)?"sel":""}"><button class="ptap" data-act="pick" data-id="${id}">
        <span class="nm">${esc(nm(id))}</span>${misto?`<span class="sx">${P(id).sex}</span>`:""}
        <span class="pt">${t[id]?t[id].pts:0} pt</span></button></li>`).join("")}</ul></div>`:""}
    </div>
    <div class="block">
      <button class="btn" data-act="board" ${ev.pairs.length>=2?"":"disabled"}>Genera il tabellone</button>
      <button class="btn btn--quiet" data-act="step" data-v="presenti">Torna ai presenti</button>
    </div>`;
  }

  if(step === "tabellone"){
    const turno = (ev.storico || []).length + 1;
    if(ev.finale){
      body = `<div class="block"><h2>${turno === 1 ? "Semifinali" : "Finale"}</h2>
      <p class="hint">${turno === 1 ? (misto ? "I primi 4 uomini e le prime 4 donne della classifica, in coppie miste. Tocca chi passa."
                                    : C().type === "femminile" ? "Le prime 8 della classifica, accoppiate prima con ottava e così via. Tocca chi passa."
                                    : "I primi 8 della classifica, accoppiati primo con ottavo e così via. Tocca chi passa.")
                                    : "Le due vincenti si giocano il titolo, le due perdenti il terzo posto."}</p>
      ${ev.matches.map((m,i) => matchCard(ev,m,i,true)).join("")}</div>
      <div class="block">
        ${turno >= 2
          ? `<button class="btn btn--oro" data-act="decreta" data-fin="${ev.id}" ${evReady(ev)?"":"disabled"}>🏆 Decreta i campioni</button>`
          : `<button class="btn" data-act="turno" ${evReady(ev)?"":"disabled"}>Vai alla finale</button>`}
        ${!evReady(ev)?`<p class="note">Segna il vincitore di ogni campo.</p>`:""}
        <button class="btn btn--quiet" data-act="loca">Crea la locandina</button>
        ${turno > 1 ? `<button class="btn btn--quiet" data-act="indietro">Torna alle semifinali</button>` : ""}
      </div>`;
    } else {
      body = `<div class="block"><h2>Tabellone</h2>
      <p class="hint">Coppie ordinate per somma punti, a due a due sui campi. Si gioca, e a fine giornata si passa al punteggio.</p>
      ${ev.matches.map((m,i) => matchCard(ev,m,i,false)).join("")}</div>
      <div class="block">
        <button class="btn" data-act="vaipunteggio">Vai al punteggio</button>
        <button class="btn btn--ghost" data-act="loca">Crea la locandina</button>
        <button class="btn btn--quiet" data-act="step" data-v="coppie">Modifica le coppie</button>
      </div>`;
    }
  }

  if(step === "punteggio"){
    ev.ordine = (ev.ordine || []).filter(i => ev.pairs[i]);
    const messi = new Set(ev.ordine);
    const liberi = ev.pairs.map((_,i) => i).filter(i => !messi.has(i));
    const prossimo = ev.ordine.length + 1;
    body = `<div class="block"><h2>Ordine di arrivo</h2>
    <p class="hint">Tocca le coppie dalla prima classificata all'ultima. ${numCampi(ev)} camp${numCampi(ev)===1?"o":"i"}: ${baseGiornata(ev)} punti alla prima, poi 2 in meno per ogni posizione. Per togliere una coppia dall'ordine toccala di nuovo.</p>
    ${ev.ordine.length ? ev.ordine.map((pi,k) => `
      <button class="pair pair--tap pair--fatta" data-act="togli" data-k="${k}">
        <span class="seed">${k+1}°</span>
        <span class="nm">${esc(nm(ev.pairs[pi][0]))}<br>${esc(nm(ev.pairs[pi][1]))}</span>
        <span class="pp">${puntiDefault(ev,k)} pt</span>
      </button>`).join("") : `<p class="empty">Comincia toccando la coppia arrivata prima.</p>`}
    </div>
    ${liberi.length ? `<div class="block"><h2>Da piazzare</h2>
      ${liberi.map(pi => `
        <button class="pair pair--tap" data-act="piazza" data-pi="${pi}">
          <span class="seed">+</span>
          <span class="nm">${esc(nm(ev.pairs[pi][0]))}<br>${esc(nm(ev.pairs[pi][1]))}</span>
          <span class="pp pp--next">diventa ${prossimo}°</span>
        </button>`).join("")}</div>` : ""}
    <div class="block">
      <button class="btn" data-act="assegna" ${liberi.length || !ev.ordine.length ? "disabled" : ""}>Assegna i punti e chiudi la giornata</button>
      ${liberi.length ? `<p class="note">Manca${liberi.length===1?"":"no"} ${liberi.length} copp${liberi.length===1?"ia":"ie"} da piazzare.</p>` : ""}
      ${ev.ordine.length ? `<button class="btn btn--quiet" data-act="ricomincia">Ricomincia l'ordine</button>` : ""}
      <button class="btn btn--quiet" data-act="step" data-v="tabellone">Torna al tabellone</button>
    </div>`;
  }

  app.innerHTML = `
  <header class="top"><button class="back" data-act="home">← Giornate</button>
    <div class="top__row"><div><h1 class="top__title">${esc(ev.name)}</h1>
      <p class="top__meta">${dataIt(ev.date)} · ${ev.campi} camp${ev.campi===1?"o":"i"}</p></div>
      <button class="badge badge--soft" data-act="editev">Modifica</button></div>
  </header>${body}`;
}

function matchCard(ev,m,i,cliccabile){
  const A = ev.pairs[m.pa], B = (m.pb===null||m.pb===undefined) ? null : ev.pairs[m.pb];
  const sA = ev.seeds ? ev.seeds[m.pa] : 0, sB = B && ev.seeds ? ev.seeds[m.pb] : 0;
  const pos = 2*i+1;
  return `<article class="match">
    <div class="match__head"><span class="match__n">${campoLabel(ev,i)}</span>
      <span class="match__p">${ev.finale ? "" : (B ? "coppie " + pos + " e " + (pos+1) : "riposo")}</span></div>
    <${cliccabile?"button":"div"} class="side ${cliccabile && m.winner==="a"?"side--win":""}" ${cliccabile?`data-act="win" data-i="${i}" data-s="a"`:""}>
      <span class="nm">${esc(nm(A[0]))} · ${esc(nm(A[1]))}</span><span class="seed">${sA}</span></${cliccabile?"button":"div"}>
    ${B?`<div class="net"></div>
    <${cliccabile?"button":"div"} class="side ${cliccabile && m.winner==="b"?"side--win":""}" ${cliccabile?`data-act="win" data-i="${i}" data-s="b"`:""}>
      <span class="nm">${esc(nm(B[0]))} · ${esc(nm(B[1]))}</span><span class="seed">${sB}</span></${cliccabile?"button":"div"}>`
    :`<div class="net"></div><div class="side"><span class="nm" style="color:var(--ink-soft)">riposo</span></div>`}
  </article>`;
}

function renderEventoChiuso(ev){
  const pts = eventPoints(ev), pl = placements(ev);
  if(ev.finale){
    const podio = ["Campioni", "Finalisti", "Terzo posto", "Quarto posto"];
    return app.innerHTML = `
    <header class="top"><button class="back" data-act="home">← Giornate</button>
      <div class="top__row"><div><h1 class="top__title">${esc(ev.name)}</h1>
        <p class="top__meta">${dataIt(ev.date)} · ${esc(C().name)}</p></div>
        <span class="badge">chiusa</span></div></header>
    <table class="table"><thead><tr><th>Posizione</th><th></th></tr></thead><tbody>
      ${pl.map((pi,k) => { const pr = ev.pairs[pi];
        return `<tr class="${k===0?"lead":""}">
          <td><span class="nmc"><span class="pos">${k+1}°</span>${esc(nm(pr[0]))} · ${esc(nm(pr[1]))}</span></td>
          <td>${podio[k] || ""}</td></tr>`; }).join("")}
    </tbody></table>
    <div class="block">
      <button class="btn btn--ghost" data-act="loca">Crea la locandina</button>
      <button class="btn btn--quiet" data-act="reopen">Riapri la finale</button>
      <button class="btn btn--danger" data-act="delev">Elimina la finale</button>
    </div>`;
  }
  app.innerHTML = `
  <header class="top"><button class="back" data-act="home">← Giornate</button>
    <div class="top__row"><div><h1 class="top__title">${esc(ev.name)}</h1>
      <p class="top__meta">${dataIt(ev.date)} · ${ev.pairs.length} coppie · ${(ev.storico||[]).length+1} turni</p></div>
      <span class="badge">chiusa</span></div></header>
  <table class="table"><thead><tr><th>Coppia</th><th>Punti</th></tr></thead><tbody>
    ${pl.map((pi,k)=>{ const pr = ev.pairs[pi];
      return `<tr class="${k===0?"lead":""}">
        <td><span class="nmc"><span class="pos">${k+1}°</span>${esc(nm(pr[0]))} · ${esc(nm(pr[1]))}</span></td>
        <td class="pts">${pts[pr[0]]||0}</td></tr>`;}).join("")}
  </tbody></table>
  <div class="block">
    <button class="btn btn--ghost" data-act="loca">Crea la locandina</button>
    <button class="btn btn--ghost" data-act="shareev">Copia il risultato</button>
    <button class="btn btn--quiet" data-act="correggi">Correggi ordine e punti</button>
    <button class="btn btn--quiet" data-act="reopen">Riapri il tabellone</button>
    <button class="btn btn--danger" data-act="delev">Elimina la giornata</button>
  </div>`;
}

/* --- classifica --- */
function renderClassifica(){
  const c = C(), list = classificaFinal8(c);
  const premiati = list.filter(r => r.bonus).length;
  const mod = canWrite();
  app.innerHTML = `
  <header class="top">${champBtn()}
    <div class="top__row"><div><h1 class="top__title">Classifica</h1>
    <p class="top__meta">${giornateChiuse(c)} giornat${giornateChiuse(c)===1?"a":"e"} su ${giornatePreviste(c)}</p></div>
    <button type="button" class="aggiorna-classifica" data-act="sync" aria-label="Aggiorna classifica"
      title="Aggiorna classifica" aria-busy="${SYNC.stato === "corso"}" ${SYNC.stato === "corso" ? "disabled" : ""}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 17.9 17"/></svg>
    </button></div></header>

  <section class="bonus">
    <h2 class="bonus__t">BONUS</h2>
    <div class="bonus__row">
      <label class="bonus__f"><span>Punti da assegnare</span>
        <input type="number" inputmode="numeric" min="0" max="50" data-act="bonuspunti" value="${c.bonus || 0}" ${mod?"":"disabled"}></label>
      <label class="bonus__f"><span>Presenze da raggiungere</span>
        <input type="number" inputmode="numeric" min="0" max="40" data-act="bonuspres" value="${c.soglia || 0}" ${mod?"":"disabled"}></label>
    </div>
    <p class="bonus__n" id="bonusNota">${notaBonus(c, premiati)}</p>
  </section>

  <div id="tabClass">${tabellaClassifica(list)}</div>
  ${list.length ? `
  <button class="btn" style="margin-top:16px" data-act="stampaclass">Crea l'immagine della classifica</button>
  <button class="btn btn--ghost" data-act="shareclass">Copia la classifica come testo</button>
  ${(() => { const f = finaleDi(c);
    if(f) return `<button class="btn btn--quiet" data-act="openev" data-id="${f.id}">Apri la finale a 8</button>`;
    if(!coppieFinal8(c).length) return `<p class="note">${c.type === "misto" ? "Servono almeno 4 uomini e 4 donne con presenze" : "Servono almeno 8 " + partecipanti(c) + " con presenze"} per creare la Final 8.</p>`;
    return `<button class="btn btn--quiet" data-act="finale8">Crea la finale a 8</button>`;
  })()}` : ""}
  ${renderAlbo(c)}`;
}
function renderAlbo(c){
  const voci = albumDi(c);
  return `<section class="albo">
    <h2 class="albo__t">ALBO D'ORO</h2>
    ${voci.length ? voci.map(a => `
      <button class="albo__voce" data-act="albovedi" data-id="${a.id}">
        <span class="albo__ed">${esc(a.edizione)}ª</span>
        <span class="albo__nomi">${esc(nomeAlbo(a,0))}<br>${esc(nomeAlbo(a,1))}</span>
        <span class="albo__data">${a.data ? dataIt(a.data) : ""}</span>
      </button>`).join("")
    : `<p class="albo__vuoto">Nessuna edizione ancora. I campioni compariranno qui dopo la finale.</p>`}
    ${canWrite() ? `<button class="btn btn--oro" data-act="decreta" style="margin-top:12px">🏆 Decreta i campioni</button>` : ""}
  </section>`;
}
function notaBonus(c, premiati){
  if(!(c.bonus > 0) || !(c.soglia > 0)) return "Bonus spento: metti punti e presenze per attivarlo.";
  return `Chi arriva ad almeno ${c.soglia} presenze prende ${c.bonus} punti in più, una volta sola, e valgono anche per tabellone e abbinamenti. `
    + (premiati ? `Finora l'hanno raggiunto in ${premiati}: hanno il punteggio nel bollino rosso.` : "Per ora non l'ha raggiunto nessuno.");
}
function tabellaClassifica(list = classificaFinal8(), ch = C()){
  if(!list.length) return `<p class="empty">Ancora nessuna giornata chiusa qui.</p>`;
  return `<p class="hint">Final 8: ${ch.type === "misto" ? "primi 4 uomini e prime 4 donne" : "prime 8 posizioni"} in evidenza.</p>
  <table class="table table--classifica"><thead><tr><th>${ch.type === "femminile" ? "Giocatrice" : "Giocatore"}</th><th>Punti</th><th>Presenze</th></tr></thead>
   <tbody>${list.map((r,i) => `<tr class="rowtap ${r.final8?"final8":""}" data-act="player" data-id="${r.id}">
      <td><span class="nmc"><span class="pos">${i+1}</span><span class="nome-classifica">${esc(r.name)} ${stelle(r.id)}</span></span></td>
      <td class="pts">${r.bonus ? `<span class="punteggio-bonus" title="Bonus +${r.bonus} incluso">${r.tot}</span>` : r.tot}</td>
      <td>${r.pres}</td></tr>`).join("")}</tbody></table>`;
}

/* --- giocatori --- */
function renderGiocatori(){
  const c = C(), t = totals(), q = search.toLowerCase();
  const list = D.players.filter(p => eligible(p) && p.name.toLowerCase().includes(q))
    .sort((a,b) => a.name.localeCompare(b.name));
  const fuori = D.players.filter(p => p.archived).length;
  app.innerHTML = `
  <header class="top">${champBtn()}
    <div class="top__row"><div><h1 class="top__title">${c.type === "femminile" ? "Giocatrici" : "Giocatori"}</h1>
    <p class="top__meta">${list.length} disponibili per questo campionato${fuori?` · ${fuori} ritirati`:""}</p>
    ${alboCompleto().length ? `<p class="legenda"><span><span class="stella stella--maschile">★</span> Maschile</span>
      <span><span class="stella stella--femminile">★</span> Femminile</span>
      <span><span class="stella stella--misto">★</span> Misto</span></p>` : ""}</div></div></header>
  <label class="fld"><input id="q" placeholder="Cerca un nome" value="${esc(search)}" data-act="search" autocomplete="off"></label>
  <form class="row2" data-act="addp2">
    <input id="newp2" placeholder="${c.type === "femminile" ? "Nuova giocatrice" : "Nuovo giocatore"}" autocomplete="off" enterkeyhint="done"
      style="padding:13px 14px;border:1px solid var(--line);border-radius:12px;background:var(--paper);">
    ${c.type==="misto"?`<select id="newsex2" style="flex:0 0 86px;padding:13px 8px;border:1px solid var(--line);border-radius:12px;background:var(--paper);">
      <option value="F">Donna</option><option value="M">Uomo</option></select>`:""}
    <button class="btn btn--ghost btn--sm" type="submit" style="flex:0 0 auto;">Aggiungi</button>
  </form>
  <ul class="plist">${list.map(p=>`<li><button class="ptap" data-act="player" data-id="${p.id}">
    <span class="nm">${esc(p.name)} ${stelle(p.id)}</span>${c.type==="misto"?`<span class="sx">${p.sex}</span>`:""}
    <span class="pt">${t[p.id].pts} pt · ${t[p.id].pres} pres.</span></button></li>`).join("")}</ul>`;
}

/* --- altro --- */
function renderAltro(){
  const c = C();
  app.innerHTML = `
  <header class="top">${champBtn()}
    <div class="top__row"><h1 class="top__title">Impostazioni</h1></div></header>
  <div class="block"><h2>${esc(c.name)}</h2>
    <h2 style="margin-top:14px">Durata dell'edizione</h2>
    <div class="stepper">
      <button data-act="cset" data-k="settimane" data-v="-1">−</button><b>${c.settimane || 8}</b>
      <button data-act="cset" data-k="settimane" data-v="1">+</button><small>settimane, 2 giornate ciascuna</small></div>
    <p class="note">${giornateChiuse(c)} giornat${giornateChiuse(c)===1?"a":"e"} su ${giornatePreviste(c)} previste.</p>
    <h2 style="margin-top:18px">Data della Final 8</h2>
    <div class="row2" style="max-width:420px">
      <label class="fld" style="flex:3"><span>Data</span><input type="date" data-act="datafinale" value="${c.dataFinale || ""}" ${canWrite() ? "" : "disabled"}></label>
      <label class="fld" style="flex:2"><span>Orario</span><input data-act="orafinale" value="${esc(c.oraFinale || "")}" placeholder="pomeriggio, 15:00" ${canWrite() ? "" : "disabled"}></label>
    </div>
    <p class="note" style="margin-top:-4px">Compare su tutte le locandine e sull'immagine della classifica.</p>
    <h2 style="margin-top:18px">Giornate già giocate prima dell'app</h2>
    <div class="stepper">
      <button data-act="cset" data-k="base" data-v="-1">−</button><b>${c.base || 0}</b>
      <button data-act="cset" data-k="base" data-v="1">+</button><small>quelle dei vecchi fogli</small></div>
  </div>

  <div class="block"><h2>Campi del circolo</h2>
    <div class="stepper"><button data-act="set" data-k="campi" data-v="-1">−</button><b>${D.settings.campi}</b>
      <button data-act="set" data-k="campi" data-v="1">+</button><small>valore di partenza</small></div></div>
  <div class="block"><h2>Database</h2>
    <p class="hint">${testoSync()}</p>
    ${canWrite()
      ? `<button class="btn btn--quiet" data-act="logout">Esci dalla modalità gestore</button>`
      : `<button class="btn" data-act="login">Accedi come gestore</button>`}
    <button class="btn btn--quiet" data-act="sync">Sincronizza adesso</button>
  </div>
  <div class="block"><h2>Locandina</h2>
    <p class="hint">Logo e scritta usati nell'immagine della giornata.</p>
    <label class="btn btn--quiet" style="cursor:pointer">${D.settings.logo?"Cambia il logo":"Carica il logo"}
      <input type="file" accept="image/*" data-act="logo" style="display:none"></label>
    ${D.settings.logo?`<button class="btn btn--quiet" data-act="dellogo">Togli il logo</button>`:""}
    <label class="fld" style="margin-top:12px"><span>Scritta in fondo</span>
      <input value="${esc(D.settings.firma||"")}" data-act="firma" placeholder="Sport Club San Carlo Canavese"></label>
  </div>
  <div class="block"><h2>Backup</h2>
    <p class="hint">Tutto sta in questo browser. Esporta ogni tanto: il file si reimporta qui o su un altro telefono.</p>
    <button class="btn btn--ghost" data-act="export">Esporta tutto</button>
    <label class="btn btn--quiet" style="cursor:pointer">Importa un backup
      <input type="file" accept="application/json,.json" data-act="import" style="display:none"></label>
    <button class="btn btn--danger" data-act="wipe">Azzera tutto</button></div>`;
}
