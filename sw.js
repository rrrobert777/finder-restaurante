/* Mănânc – memorie pentru lucrul fără internet.
   Pagina și iconițele se salvează pe telefon. Cererile către servere (locuri, hărți) NU se ating.
   Când ai internet, primești mereu versiunea nouă; fără internet, o versiune salvată. */
const V = "mananc-v1";
const FISIERE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(FISIERE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;           // serverele de date rămân neatinse
  if (r.mode === "navigate") {                              // pagina: întâi internetul (max 4 s), apoi memoria
    e.respondWith(new Promise(resolve => {
      const ceas = setTimeout(() => caches.match(r).then(x => x || caches.match("index.html")).then(x => x && resolve(x)), 4000);
      fetch(r).then(res => {
        clearTimeout(ceas);
        if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
        resolve(res);
      }).catch(() => {
        clearTimeout(ceas);
        caches.match(r).then(x => x || caches.match("index.html")).then(x => resolve(x || Response.error()));
      });
    }));
    return;
  }
  e.respondWith(caches.match(r).then(hit => {              // iconițe etc.: din memorie, reînnoite pe fundal
    const net = fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
