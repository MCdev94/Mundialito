/* Goné Padel Cup — Avvio dell'app */
"use strict";

D = load() || fresh();
D.albo = D.albo || [];
normalizzaTornei();
try{ localStorage.setItem(KEY, JSON.stringify(D)); }catch(e){}
render();
initSync();

/* app installabile e utilizzabile anche senza rete */
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}
