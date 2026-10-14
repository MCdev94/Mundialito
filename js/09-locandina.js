/* Goné Padel Cup — Locandina del tabellone, salvataggio e condivisione delle immagini */
"use strict";
/* ---------- locandina ---------- */
let LOCA = [];   // pagine da scaricare (locandina o classifica)
const GIORNI = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];

function rrect(x,a,b,w,h,r){
  x.beginPath();
  x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r);
  x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath();
}
function fitFont(x, txt, maxW, weight, size, min){
  let s = size;
  while(s > (min||16)){ x.font = weight + " " + s + "px Archivo, Arial"; if(x.measureText(txt).width <= maxW) break; s -= 2; }
  x.font = weight + " " + s + "px Archivo, Arial";
  return s;
}
function pallina(x, cx, cy, r, fill, txt, col, size){
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI*2); x.fillStyle = fill; x.fill();
  x.fillStyle = col; x.textAlign = "center"; x.textBaseline = "middle";
  fitFont(x, txt, r*1.7, "700", size, 14);
  x.fillText(txt, cx, cy+1);
}
function dataLunga(ev){
  if(!ev.date) return "";
  const d = new Date(ev.date + "T12:00:00");
  let s = GIORNI[d.getDay()] + " " + d.getDate() + " " + MESI[d.getMonth()];
  if(ev.ora) s += " ore " + ev.ora;
  return s;
}
function loadImg(src){
  return new Promise((ok,no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
}

async function drawLocandina(ev){
  const ch = C(), t = totals(ev.id);
  const W = 1080, n = ev.matches.length;
  let logo = null;
  if(D.settings.logo){ try{ logo = await loadImg(D.settings.logo); }catch(e){} }
  const dataF = testoFinali(ch);
  const HEAD = 300, ROW = 196, FASCIA = dataF ? 92 : 0, FOOT = (D.settings.firma ? 120 : 70) + FASCIA;
  const H = HEAD + n*ROW + FOOT;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const x = cv.getContext("2d");
  try{
    await Promise.all(["800 60px Archivo","700 40px Archivo","600 30px Archivo","500 30px Archivo"]
      .map(f => document.fonts.load(f)));
    await document.fonts.ready;
  }catch(e){}

  const g = x.createLinearGradient(0,0,W,H);
  g.addColorStop(0,"#F4F4F2"); g.addColorStop(1,"#D8DAD8");
  x.fillStyle = g; x.fillRect(0,0,W,H);

  const L = 40, R = W - 40;
  if(logo){
    const s = 186, ar = logo.width / logo.height;
    const w = ar >= 1 ? s : s*ar, h = ar >= 1 ? s/ar : s;
    x.drawImage(logo, L, 34, w, h);
  }
  const left = logo ? L + 210 : L;

  x.textAlign = "right"; x.textBaseline = "alphabetic"; x.fillStyle = "#16365C";
  const titolo = (ch.name + " " + edizioneDi(ch)).trim().toUpperCase();
  fitFont(x, titolo, R - left, "800", 62, 24);
  x.fillText(titolo, R, 96);

  x.fillStyle = "#2F5F8E";
  const turno = (ev.storico || []).length + 1;
  const riga1 = ev.finale ? (turno === 1 ? "SEMIFINALI" : "FINALE")
                          : (turno === 1 ? "INGRESSO IN CAMPO" : turno + "° TURNO");
  fitFont(x, riga1, R - left, "700", 42, 20);
  x.fillText(riga1, R, 152);
  const sub = "(" + (ev.name || "").toUpperCase() + ")";
  fitFont(x, sub, R - left, "700", 42, 20);
  x.fillText(sub, R, 202);

  const dl = dataLunga(ev);
  if(dl){ x.fillStyle = "#39434A"; fitFont(x, dl, R - left, "400", 30, 16); x.fillText(dl, R, 250); }

  for(let i=0; i<n; i++){
    const m = ev.matches[i], top = HEAD + i*ROW;
    x.fillStyle = "#C7B079"; rrect(x, 130, top, 820, 40, 5); x.fill();
    x.fillStyle = "#2B2B2B"; x.textAlign = "center"; x.textBaseline = "middle";
    fitFont(x, campoLabel(ev,i).replace(/ · .*/,""), 760, "600", 31, 18);
    x.fillText(campoLabel(ev,i).replace("CAMPO","CAMPO"), 540, top+21);

    const cy1 = top + 104, cy2 = top + 160, cym = (cy1+cy2)/2;
    const A = ev.pairs[m.pa], B = (m.pb === null || m.pb === undefined) ? null : ev.pairs[m.pb];
    const won = s => m.winner === s;

    const lato = (ids, dir, win) => {
      const cxC = dir < 0 ? 58 : W - 58;
      const nx  = dir < 0 ? 104 : W - 104;
      const u1  = dir < 0 ? 98 : 640, u2 = dir < 0 ? 440 : W - 98;
      x.textAlign = dir < 0 ? "left" : "right";
      ids.forEach((id, k) => {
        const cy = k ? cy2 : cy1;
        pallina(x, cxC, cy, 28, "#A98A4F", String(t[id] ? t[id].pts : 0), "#FFFFFF", 28);
        x.fillStyle = "#15191C"; x.textBaseline = "middle";
        x.textAlign = dir < 0 ? "left" : "right";
        const tipi = tipiVittorie(id), rS = 13, wS = larghezzaStelle(tipi.length, rS);
        fitFont(x, nm(id), 334 - (wS ? wS + 10 : 0), win ? "700" : "500", 31, 15);
        x.fillText(nm(id), nx, cy);
        if(tipi.length){
          const wN = x.measureText(nm(id)).width;
          disegnaStelle(x, tipi, dir < 0 ? nx + wN + 10 : nx - wN - 10 - wS, cy, rS, null);
        }
      });
      x.strokeStyle = "#13171A"; x.lineWidth = 5; x.lineCap = "round";
      x.beginPath(); x.moveTo(u1, cym); x.lineTo(u2, cym); x.stroke();
    };

    lato(A, -1, won("a"));
    if(B) lato(B, 1, won("b"));
    else {
      x.fillStyle = "#7A8488"; x.textAlign = "right"; x.textBaseline = "middle";
      fitFont(x, "riposo", 300, "500", 31, 18);
      x.fillText("riposo", W - 104, cym);
    }

    pallina(x, 492, cym, 42, "#F6E7C6", String(ev.seeds ? ev.seeds[m.pa] : 0), "#2B2B2B", 34);
    if(B) pallina(x, 592, cym, 42, "#F7C98C", String(ev.seeds ? ev.seeds[m.pb] : 0), "#2B2B2B", 34);
  }

  if(dataF){
    const fy = HEAD + n*ROW + 12;
    x.fillStyle = "#16365C"; rrect(x, 130, fy, 820, 62, 10); x.fill();
    x.textAlign = "center"; x.textBaseline = "middle";
    const tf = "FINALS TOP 8 · " + dataF.toUpperCase();
    x.fillStyle = "#F3D27A"; fitFont(x, tf, 770, "800", 30, 16);
    x.fillText(tf, 540, fy + 32);
  }
  if(D.settings.firma){
    x.fillStyle = "#4C5559"; x.textAlign = "center"; x.textBaseline = "middle";
    fitFont(x, D.settings.firma, W - 120, "700", 36, 18);
    x.fillText(D.settings.firma, W/2, H - 62);
  }
  return cv;
}

async function offriFile(filename, blob){
  try{
    if(typeof claude !== "undefined" && claude.use){
      const dl = await claude.use("downloads");
      if(dl){ await dl.save({filename, data:blob}); toast("Salvato"); return; }
    }
  }catch(e){ if(e && e.code === "declined") return; }
  try{
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 5000);
    toast("Scaricato");
  }catch(e){
    try{ window.open(URL.createObjectURL(blob), "_blank"); toast("Aperto in una nuova scheda"); }
    catch(e2){ toast("Download non disponibile qui"); }
  }
}
function baseNome(){
  const ev = sheet && sheet.tipo === "locandina" ? EV(sheet.id) : null;
  const t = ev ? C().name + " " + ev.name : C().name + " classifica";
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^\w\s-]/g,"").trim().replace(/\s+/g,"-").toLowerCase();
}
async function pagineBlob(){
  return Promise.all(LOCA.map(cv => new Promise(r => cv.toBlob(r, "image/png"))));
}
async function locaSave(fmt){
  if(!LOCA.length || !sheet){ toast("Immagine non pronta"); return; }
  const base = baseNome();
  if(fmt === "png"){
    const blobs = await pagineBlob();
    for(let i=0; i<blobs.length; i++)
      await offriFile(base + (blobs.length > 1 ? "-" + (i+1) : "") + ".png", blobs[i]);
  } else {
    const J = window.jspdf && window.jspdf.jsPDF;
    if(!J){ toast("PDF non disponibile, scarica l'immagine"); return; }
    let doc = null;
    LOCA.forEach((cv, i) => {
      if(i === 0) doc = new J({orientation:"p", unit:"px", format:[cv.width, cv.height], compress:true});
      else doc.addPage([cv.width, cv.height], "p");
      doc.addImage(cv.toDataURL("image/png"), "PNG", 0, 0, cv.width, cv.height);
    });
    await offriFile(base + ".pdf", doc.output("blob"));
  }
}
async function locaShare(){
  if(!LOCA.length) return;
  const base = baseNome();
  const blobs = await pagineBlob();
  const files = blobs.map((b,i) => new File([b], base + (blobs.length > 1 ? "-" + (i+1) : "") + ".png", {type:"image/png"}));
  if(navigator.canShare && navigator.canShare({files})){
    try{ await navigator.share({files}); return; }
    catch(e){ if(e && e.name === "AbortError") return; }
  }
  toast("Condivisione non disponibile: scarica le immagini");
}
function setLogo(file){
  if(!file) return;
  const r = new FileReader();
  r.onload = () => {
    const i = new Image();
    i.onload = () => {
      const s = 320, ar = i.width / i.height;
      const cv = document.createElement("canvas");
      cv.width = ar >= 1 ? s : Math.round(s*ar);
      cv.height = ar >= 1 ? Math.round(s/ar) : s;
      cv.getContext("2d").drawImage(i, 0, 0, cv.width, cv.height);
      D.settings.logo = cv.toDataURL("image/png");
      save(); render(); toast("Logo caricato");
    };
    i.onerror = () => toast("Immagine non valida");
    i.src = r.result;
  };
  r.readAsDataURL(file);
}
