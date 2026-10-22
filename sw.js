/* Mundialito — service worker: l'app si apre anche senza rete.
   I file dell'app: prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata.
   Librerie e font esterni: copia salvata, aggiornata in background.
   I dati di Supabase non passano mai di qui: li gestisce l'app con la sua coda. */
const VERSIONE = "mundialito-2026-10-22-1";
const ESTERNI = "mundialito-esterni";
const PREFISSO_VERSIONE_SUCCESSIVA = ["gone", "-padel-cup-"].join("");
const GUSCIO = [
  "./", "./index.html", "./css/style.css", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png",
  "./js/01-base.js", "./js/02-punteggi.js", "./js/03-tabellone.js", "./js/04-schermate.js",
  "./js/05-fogli.js", "./js/06-azioni.js", "./js/07-stampa-classifica.js", "./js/08-sync.js",
  "./js/09-locandina.js", "./js/10-backup.js", "./js/11-avvio.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(GUSCIO)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(n => (n.startsWith("mundialito-") || n.startsWith(PREFISSO_VERSIONE_SUCCESSIVA)) && n !== VERSIONE && n !== ESTERNI)
                              .map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function conLimite(promessa, ms){
  return new Promise((ok, no) => {
    const t = setTimeout(() => no(new Error("rete lenta")), ms);
    promessa.then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); no(e); });
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.hostname.endsWith("supabase.co")) return;

  if(url.origin === self.location.origin){
    e.respondWith(
      conLimite(fetch(req), 4000)
        .then(r => {
          if(r && r.ok){ const copia = r.clone(); caches.open(VERSIONE).then(c => c.put(req, copia)); }
          return r;
        })
        .catch(() => caches.match(req, {ignoreSearch:true})
          .then(r => r || (req.mode === "navigate" ? caches.match("./index.html") : undefined))
          .then(r => r || Response.error()))
    );
    return;
  }

  if(/(^|\.)(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)){
    e.respondWith(caches.open(ESTERNI).then(async c => {
      const salvata = await c.match(req);
      const rete = fetch(req).then(r => {
        if(r && (r.ok || r.type === "opaque")) c.put(req, r.clone());
        return r;
      }).catch(() => salvata || Response.error());
      return salvata || rete;
    }));
  }
});
