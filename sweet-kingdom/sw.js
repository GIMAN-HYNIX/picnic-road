/* Keeps a copy of the game on the phone so it opens instantly and works with no connection. */
const CACHE = 'sweet-4f20195600';
const FILES = ["./", "index.html", "game.js", "doll.js", "manifest.webmanifest", "fonts/galmuri11.woff2", "fonts/galmuri11-bold.woff2", "icons/icon-192.png", "icons/icon-512.png", "img/hero.png", "img/jelly.png", "img/cookie.png", "img/ice.png", "img/donut.png", "img/boss.png", "img/boss2.png", "img/boss3.png", "img/golem.png", "img/knight.png", "img/queen.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sweet-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
});
