/* Mundialito — Immagine della classifica e stelline disegnate */
"use strict";
/* ---------- immagine della classifica ---------- */
const CL = {
  sfondoA:"#143B70", sfondoB:"#050E20", riga:"#17477A", verde:"#0C5B45",
  verdeChiaro:"#2BC79A", testo:"#FFFFFF", tenue:"#9FB6D4", rosso:"#5A1726", oro:"#C7B079"
};
function edizioneDi(ch){
  ch = ch || C();
  const salvata = D.settings.edizioni && D.settings.edizioni[ch.id];
  if(salvata !== undefined && salvata !== null) return String(salvata);
  const m = (ch.ed || "").match(/\d+/); return m ? m[0] : "";
}
function edNum(ch){ return edizioneDi(ch); }

function rigaClass(x, X, Y, W, H, dati, verde){
  rrect(x, X, Y, W, H, H/2.4);
  x.fillStyle = verde ? CL.verde : CL.riga; x.fill();
  if(verde){
    x.strokeStyle = CL.verdeChiaro; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(X+26, Y+H-9); x.lineTo(X+W*0.62, Y+H-9); x.stroke();
  }
  const s = H > 60 ? 28 : 21, cy = Y + H/2;
  x.textBaseline = "middle"; x.fillStyle = CL.testo;
  x.textAlign = "center"; fitFont(x, String(dati.pos), 46, "700", s+2, 14);
  x.fillText(String(dati.pos), X + 34, cy);
  const tipi = dati.id ? tipiVittorie(dati.id) : [], rS = H > 60 ? 11 : 9;
  const wS = larghezzaStelle(tipi.length, rS);
  x.textAlign = "left"; fitFont(x, dati.nome, W - 178 - (wS ? wS + 10 : 0), "700", s, 13);
  x.fillText(dati.nome, X + 64, cy);
  if(tipi.length) disegnaStelle(x, tipi, X + 64 + x.measureText(dati.nome).width + 10, cy, rS, "rgba(255,255,255,.85)");
  x.textAlign = "center"; fitFont(x, String(dati.pl), 50, "700", s-2, 13);
  x.fillText(String(dati.pl), X + W - 96, cy);
  x.textAlign = "center"; fitFont(x, String(dati.pts), 66, "700", s, 13);
  x.fillText(String(dati.pts), X + W - 36, cy);
}
function intestaCol(x, X, W, Y){
  x.fillStyle = CL.tenue; x.textBaseline = "middle";
  x.font = "600 21px Archivo, Arial";
  x.textAlign = "center"; x.fillText("#", X + 34, Y);
  x.textAlign = "left";   x.fillText("GIOCATORE", X + 64, Y);
  x.textAlign = "center"; x.fillText("PL", X + W - 96, Y);
  x.fillText("PTS", X + W - 36, Y);
}

/* stelline disegnate come forme, uguali su ogni telefono */
const COL_STELLA = {maschile:["#2F6FDB"], femminile:["#E0569B"], misto:["#2F6FDB","#E0569B"]};
function tipiVittorie(id){
  return vittorieDi(id).sort((a,b) => (ORDINE_TIPI[a.tipo] - ORDINE_TIPI[b.tipo]) || ((parseInt(a.edizione)||0) - (parseInt(b.edizione)||0)))
    .map(a => a.tipo);
}
function stellaPath(x, cx, cy, r){
  x.beginPath();
  for(let i=0; i<10; i++){
    const ang = -Math.PI/2 + i*Math.PI/5, rr = i % 2 ? r*0.46 : r;
    x.lineTo(cx + rr*Math.cos(ang), cy + rr*Math.sin(ang));
  }
  x.closePath();
}
function larghezzaStelle(n, r){ return n ? n*(2*r) + (n-1)*Math.round(r*0.35) : 0; }
function disegnaStelle(x, tipi, X, cy, r, bordo){
  const passo = 2*r + Math.round(r*0.35);
  tipi.forEach((tipo, i) => {
    const cx = X + r + i*passo, col = COL_STELLA[tipo] || ["#D4A017"];
    x.save();
    stellaPath(x, cx, cy, r); x.fillStyle = col[0]; x.fill();
    if(col[1]){
      x.save(); x.beginPath(); x.rect(cx, cy - r - 2, r + 2, 2*r + 4); x.clip();
      stellaPath(x, cx, cy, r); x.fillStyle = col[1]; x.fill(); x.restore();
    }
    if(bordo){ stellaPath(x, cx, cy, r); x.lineWidth = 1.6; x.strokeStyle = bordo; x.stroke(); }
    x.restore();
  });
  return larghezzaStelle(tipi.length, r);
}
function orarioFinali(ch){
  const o = (ch.oraFinale || "").trim();
  if(!o) return "";
  return /^\d/.test(o) ? "ore " + o : o;
}
function testoFinali(ch){
  const d = ch.dataFinale || ((finaleDi(ch) || {}).date) || "";
  if(!d) return "";
  const o = orarioFinali(ch);
  return dataLunga({date:d}) + (o ? " · " + o : "");
}

async function drawClassifica(ch){
  ch = ch || C();
  const lista = classifica(ch).filter(r => r.pres > 0)
    .map((r,i) => ({id:r.id, pos:i+1, nome:r.name.toUpperCase(), pl:r.pres, pts:r.tot}));
  if(!lista.length) throw new Error("classifica vuota");
  const dataF = testoFinali(ch);

  let logo = null;
  if(D.settings.logo){ try{ logo = await loadImg(D.settings.logo); }catch(e){} }
  try{
    await Promise.all(["800 56px Archivo","700 30px Archivo","600 21px Archivo"].map(f => document.fonts.load(f)));
    await document.fonts.ready;
  }catch(e){}

  const fin = finaleDi(ch);
  const pagine = [];
  const blocchi = [];
  if(lista.length <= 20) blocchi.push({sx:lista.slice(0,8), dx:lista.slice(8,20)});
  else {
    blocchi.push({sx:lista.slice(0,8), dx:lista.slice(8,20)});
    for(let i=20; i<lista.length; i+=26) blocchi.push({sx:lista.slice(i,i+13), dx:lista.slice(i+13,i+26)});
  }

  blocchi.forEach((bl, idx) => {
    const W = 1080, HEAD = 356, LEG = 150;
    const primaPag = idx === 0;
    const hSx = primaPag ? 72 : 50, hDx = 50;
    const conFinale = !!dataF && idx === blocchi.length - 1 && !bl.dx.length;
    const corpo = Math.max(bl.sx.length * hSx, bl.dx.length * hDx, conFinale ? 400 : 240);
    const H = HEAD + corpo + LEG;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const x = cv.getContext("2d");

    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, CL.sfondoA); g.addColorStop(.55, "#0A2550"); g.addColorStop(1, CL.sfondoB);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const gl = x.createRadialGradient(150, 60, 10, 150, 60, 420);
    gl.addColorStop(0, "rgba(120,170,230,.30)"); gl.addColorStop(1, "rgba(120,170,230,0)");
    x.fillStyle = gl; x.fillRect(0, 0, 620, 480);

    if(logo){
      const s = 150, ar = logo.width / logo.height;
      x.drawImage(logo, 36, 24, ar >= 1 ? s : s*ar, ar >= 1 ? s/ar : s);
    }
    /* titolo in corsivo come nel modello */
    const tit = ((edNum(ch) ? edNum(ch) + "° " : "") + ch.name).toUpperCase();
    x.save(); x.transform(1, 0, -0.14, 1, 0, 0);
    x.textAlign = "right"; x.textBaseline = "alphabetic"; x.fillStyle = CL.testo;
    fitFont(x, tit, 820, "800", 58, 24); x.fillText(tit, 1040 + 0.14*80, 80);
    fitFont(x, "A CLASSIFICA SINGOLA", 820, "800", 50, 22);
    x.fillText("A CLASSIFICA SINGOLA", 1040 + 0.14*140, 140);
    x.restore();

    /* barra informazioni: a sinistra la giornata, a destra le finali */
    const sett = ch.settimane || 8;
    const iy = 182, ih = 100;
    const gw = dataF ? 320 : 440, gx = dataF ? 40 : (W - gw) / 2;
    rrect(x, gx, iy, gw, ih, 24);
    x.fillStyle = "rgba(103,199,245,.10)"; x.fill();
    x.strokeStyle = "rgba(103,199,245,.55)"; x.lineWidth = 2; rrect(x, gx, iy, gw, ih, 24); x.stroke();
    const numero = giornateChiuse(ch) + "ª";
    x.font = "800 64px Archivo, Arial"; const wNum = x.measureText(numero).width;
    x.font = "700 24px Archivo, Arial"; const wLab = x.measureText("GIORNATA").width;
    const sx = gx + (gw - (wNum + 14 + wLab)) / 2;
    x.textBaseline = "middle"; x.textAlign = "left";
    x.fillStyle = "#67C7F5"; x.font = "800 64px Archivo, Arial"; x.fillText(numero, sx, iy + ih/2 + 3);
    x.fillStyle = CL.testo;   x.font = "700 24px Archivo, Arial"; x.fillText("GIORNATA", sx + wNum + 14, iy + ih/2 + 4);
    if(dataF){
      const fx = gx + gw + 24, fw = 1040 - fx;
      rrect(x, fx, iy, fw, ih, 24); x.fillStyle = CL.verde; x.fill();
      x.strokeStyle = CL.verdeChiaro; x.lineWidth = 2; rrect(x, fx, iy, fw, ih, 24); x.stroke();
      x.textAlign = "center"; x.fillStyle = CL.testo;
      fitFont(x, "FINALS TOP 8", fw - 48, "800", 34, 18); x.fillText("FINALS TOP 8", fx + fw/2, iy + 36);
      x.fillStyle = "#F3D27A"; fitFont(x, dataF.toUpperCase(), fw - 48, "700", 26, 14);
      x.fillText(dataF.toUpperCase(), fx + fw/2, iy + 72);
    }

    /* colonne */
    const Wc = 440, Xsx = 40, Xdx = 600;
    intestaCol(x, Xsx, Wc, 324); if(bl.dx.length) intestaCol(x, Xdx, Wc, 324);
    bl.sx.forEach((r,i) => rigaClass(x, Xsx, HEAD + i*hSx, Wc, hSx - 8, r, primaPag && r.pos <= 8));
    bl.dx.forEach((r,i) => rigaClass(x, Xdx, HEAD + i*hDx, Wc, hDx - 8, r, false));
    if(bl.dx.length || conFinale){
      x.strokeStyle = "rgba(255,255,255,.22)"; x.lineWidth = 2;
      x.beginPath(); x.moveTo(530, HEAD - 22); x.lineTo(530, HEAD + corpo); x.stroke();
    }

    /* riquadro finale nell'ultima pagina, se c'è spazio */
    if(conFinale){
      x.textAlign = "center"; x.fillStyle = CL.testo;
      fitFont(x, "FINALS", Wc, "800", 54, 24); x.fillText("FINALS", Xdx + Wc/2, HEAD + 110);
      fitFont(x, ch.name.toUpperCase(), Wc, "800", 42, 20);
      x.fillText(ch.name.toUpperCase(), Xdx + Wc/2, HEAD + 175);
      const dF = ch.dataFinale || (fin && fin.date) || "";
      fitFont(x, dataIt(dF), Wc, "800", 42, 20);
      x.fillText(dataIt(dF), Xdx + Wc/2, HEAD + 235);
      if(orarioFinali(ch)){ x.fillStyle = "#F3D27A"; fitFont(x, orarioFinali(ch).toUpperCase(), Wc, "700", 26, 14);
        x.fillText(orarioFinali(ch).toUpperCase(), Xdx + Wc/2, HEAD + 272); x.fillStyle = CL.testo; }
      x.fillStyle = CL.tenue; x.font = "600 22px Archivo, Arial";
      x.fillText("I migliori 8 giocatori si", Xdx + Wc/2, HEAD + 316);
      x.fillText("sfideranno al tabellone F8", Xdx + Wc/2, HEAD + 346);
    }

    /* legenda */
    const Ly = H - LEG + 40;
    rrect(x, 48, Ly - 18, 72, 40, 12); x.fillStyle = CL.verde; x.fill();
    x.textAlign = "left"; x.fillStyle = CL.testo; x.font = "700 28px Archivo, Arial";
    x.fillText("Qualifica Finals 8", 136, Ly - 4);
    x.fillStyle = CL.tenue; x.font = "600 19px Archivo, Arial";
    x.fillText("al termine delle " + sett + " settimane", 136, Ly + 24);
    rrect(x, 596, Ly - 18, 72, 40, 12); x.fillStyle = CL.rosso; x.fill();
    x.fillStyle = CL.testo; x.font = "700 28px Archivo, Arial";
    x.fillText("Bonus +" + ch.bonus, 684, Ly - 4);
    x.fillStyle = CL.tenue; x.font = "600 19px Archivo, Arial";
    x.fillText("dopo " + ch.soglia + " partite disputate", 684, Ly + 24);

    x.textAlign = "center"; x.fillStyle = "rgba(255,255,255,.45)";
    x.font = "600 22px Archivo, Arial";
    if(x.letterSpacing !== undefined) x.letterSpacing = "6px";
    x.fillText(D.settings.firma || "Gonetta Go", W/2, H - 34);
    if(x.letterSpacing !== undefined) x.letterSpacing = "0px";

    pagine.push(cv);
  });
  return pagine;
}
