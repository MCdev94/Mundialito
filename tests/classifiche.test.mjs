import test from "node:test";
import assert from "node:assert/strict";
import { conDati } from "./ambiente.mjs";

function campionato(tipo, n = 52, donne = 9){
  const giocatori = Array.from({length:n}, (_, i) => ({
    id:"p" + i, name:"Persona " + String(i).padStart(2, "0"),
    sex:tipo === "femminile" || (tipo === "misto" && i < donne) ? "F" : "M"
  }));
  const a = conDati(giocatori);
  a.imposta("__tipo", tipo);
  a.run("D.cur = D.champs.find(c => c.type === __tipo).id; C().soglia = 0; C().dataFinale = '2026-11-01'");
  a.imposta("C().carry", Object.fromEntries(giocatori.map((p, i) => [p.id, {pts:n - i, pres:1}])));
  return a;
}

test("misto: prima quattro donne e quattro uomini, poi il resto per punteggio, senza duplicati", () => {
  const a = campionato("misto");
  const lista = a.run("classificaFinal8()");
  assert.deepEqual(lista.slice(0, 8).map(r => r.id), ["p0", "p1", "p2", "p3", "p9", "p10", "p11", "p12"]);
  assert.equal(lista.filter(r => r.final8 && r.sex === "M").length, 4);
  assert.equal(lista.filter(r => r.final8 && r.sex === "F").length, 4);
  assert.equal(new Set(lista.map(r => r.id)).size, 52);
  const resto = lista.filter(r => !r.final8);
  assert.ok(resto.every((r, i) => !i || resto[i - 1].tot >= r.tot));
  assert.equal(a.run("classifica()[4].id"), "p4", "la graduatoria per punteggio resta intatta");
  assert.equal(a.run("coppieFinal8().length"), 4);
  assert.ok(a.run("coppieFinal8().every(pr => P(pr[0]).sex !== P(pr[1]).sex)"));
});

test("misto: con solo tre donne non si può creare la Final 8 anche con più di otto presenti", () => {
  const a = campionato("misto", 20, 3);
  assert.equal(a.run("classificaFinal8().filter(r => r.final8).length"), 7);
  assert.deepEqual(a.run("coppieFinal8()"), []);
});

test("maschile e femminile mantengono i primi otto e gli abbinamenti previsti", () => {
  for(const tipo of ["maschile", "femminile"]){
    const a = campionato(tipo);
    assert.deepEqual(a.run("classificaFinal8().filter(r => r.final8).map(r => r.id)"),
      Array.from({length:8}, (_, i) => "p" + i));
    assert.deepEqual(a.run("coppieFinal8()"), [["p0","p7"], ["p3","p4"], ["p1","p6"], ["p2","p5"]]);
  }
});

test("le pagine disegnate contengono ogni nome una volta e nessuna riga supera il margine", async () => {
  for(const tipo of ["maschile", "femminile", "misto"]){
    for(const n of [1, 8, 9, 20, 21, 27, 46, 52, 53, 80]){
      const a = campionato(tipo, n);
      const righe = [], testi = [], pagine = [];
      a.ctx.document.createElement = () => {
        const cv = {width:0, height:0};
        const x = new Proxy({
          measureText:t => ({width:String(t).length * 10}),
          fillText:t => testi.push(t),
          createLinearGradient:() => ({addColorStop(){}}),
          createRadialGradient:() => ({addColorStop(){}})
        }, {get:(obj, k) => k in obj ? obj[k] : () => {}});
        cv.getContext = () => x;
        pagine.push(cv);
        return cv;
      };
      a.imposta("rigaClass", (x, X, Y, W, H, r, verde) => {
        assert.ok(Y + H <= pagine.at(-1).height - 150, tipo + " " + n);
        righe.push({id:r.id, verde});
      });
      await a.run("drawClassifica()");
      assert.equal(righe.length, n);
      assert.equal(new Set(righe.map(r => r.id)).size, n);
      assert.equal(righe.filter(r => r.verde).length, a.run("classificaFinal8().filter(r => r.final8).length"));
      assert.ok(testi.includes(tipo === "femminile" ? "GIOCATRICE" : "GIOCATORE"));
      assert.ok(testi.includes("Final 8"));
      assert.ok(!testi.some(t => /TOP 8/i.test(t)));
    }
  }
});

test("PDF: ogni pagina usa il proprio orientamento e l'immagine resta entro i bordi", () => {
  const a = campionato("femminile");
  const orientamenti = [];
  class Pdf {
    constructor(opz){ this.imposta(opz.format, opz.orientation); }
    imposta(formato, orientamento){
      orientamenti.push(orientamento);
      const [a, b] = [...formato].sort((a,b) => a - b);
      this.w = orientamento === "l" ? b : a;
      this.h = orientamento === "l" ? a : b;
      this.internal = {pageSize:{getWidth:() => this.w, getHeight:() => this.h}};
    }
    addPage(formato, orientamento){ this.imposta(formato, orientamento); }
    addImage(src, fmt, x, y, w, h){
      assert.ok(x >= -0.01 && y >= -0.01);
      assert.ok(x + w <= this.w + 0.01 && y + h <= this.h + 0.01);
    }
  }
  a.imposta("__Pdf", Pdf);
  a.imposta("__pagine", [[1080,1106], [1080,906], [1080,746]].map(([width,height]) => ({
    width, height, toDataURL:() => "data:image/png;base64,"
  })));
  a.run("creaPdf(__pagine, __Pdf)");
  assert.deepEqual(orientamenti, ["p", "l", "l"]);
});

test("il femminile usa Giocatrici in navigazione, elenco e intestazione della classifica", () => {
  const a = campionato("femminile");
  const bottone = {lastChild:{textContent:"Giocatori"}};
  a.vivo("tabsEl").querySelector = () => bottone;
  a.run("tab = 'giocatori'; render()");
  assert.equal(bottone.lastChild.textContent, "Giocatrici");
  assert.match(a.run("app.innerHTML"), /Giocatrici/);
  assert.doesNotMatch(a.run("app.innerHTML"), /giocator[ei]/i);
  a.run("tab = 'classifica'; render()");
  assert.match(a.run("app.innerHTML"), /Giocatrice/);
  assert.doesNotMatch(a.run("app.innerHTML"), /giocator[ei]/i);
  a.run("D.cur = D.champs.find(c => c.type === 'maschile').id; render()");
  assert.equal(bottone.lastChild.textContent, "Giocatori");
});
