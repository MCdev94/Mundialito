/* GonéPadelCup — Avvio dell'app */
"use strict";

pulisciDatiPrecedenti();
D = load() || fresh();
D.albo = D.albo || [];
normalizzaTornei();
try{ localStorage.setItem(KEY, JSON.stringify(D)); }catch(e){}
render();
initSync();

/* app installabile e utilizzabile anche senza rete */
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", {updateViaCache:"none"}).then(reg => {
      reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => {
        if(document.visibilityState === "visible") reg.update().catch(() => {});
      });
    }).catch(() => {});
  });
  const giaControllata = !!navigator.serviceWorker.controller;
  let ricaricata = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if(!giaControllata || ricaricata) return;
    // Una modifica in corso rimane aperta: la nuova versione arriverà alla riapertura.
    if(sheet || openEvent || QUEUE.length){
      toast("Aggiornamento pronto: chiudi e riapri l’app appena hai finito.");
      return;
    }
    ricaricata = true;
    location.reload();
  });
}
