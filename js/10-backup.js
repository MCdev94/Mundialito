/* Mundialito — Testi da copiare, esportazione e importazione del backup */
"use strict";
/* ---------- testo e backup ---------- */
function testoClassifica(){
  const c = C(), l = classifica().filter(r => r.pres > 0);
  return [c.name, "Classifica generale", ""]
    .concat(l.map((r,i) => `${i+1}. ${r.name} — ${r.tot} pt (${r.pres} pres.)`)).join("\n");
}
function testoEvento(ev){
  const pts = eventPoints(ev);
  return [C().name, ev.name + " · " + dataIt(ev.date), ""]
    .concat(placements(ev).map((pi,k) => {
      const pr = ev.pairs[pi];
      return `${k+1}. ${nm(pr[0])} e ${nm(pr[1])} — ${pts[pr[0]]||0} pt`;
    })).join("\n");
}
function copia(txt){
  if(navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(txt).then(()=>toast("Copiato")).catch(()=>fallback(txt));
  else fallback(txt);
}
function fallback(txt){
  const ta = document.createElement("textarea");
  ta.value = txt; ta.style.position="fixed"; ta.style.opacity="0";
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); toast("Copiato"); }catch(e){ toast("Copia non riuscita"); }
  ta.remove();
}
async function doExport(){
  const blob = new Blob([JSON.stringify(D, null, 1)], {type:"application/json"});
  await offriFile("mundialito-" + oggi() + ".json", blob);
}
function doImport(file){
  if(!file) return;
  const r = new FileReader();
  r.onload = () => {
    try{
      const d = JSON.parse(r.result);
      if(!d || !d.players || !d.champs) throw 0;
      if(!confirm("Sostituisco i dati di questo browser con il backup?")) return;
      D = d; D.settings = D.settings || {campi:5}; D.cur = D.cur || D.champs[0].id;
      openEvent = null; sheet = null; save(); render(); toast("Backup caricato");
    }catch(e){ toast("File non valido"); }
  };
  r.readAsText(file);
}
