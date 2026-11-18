#!/usr/bin/env python3
"""Makes the fonts (only the letters the game shows), the app manifest and the offline service worker.
   pip install fonttools brotli ; python3 sweet-kingdom/build.py   (full fonts are fetched once into ../dev/.fonts)"""
import hashlib, json, os, subprocess, sys, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); FONTS = os.path.join(HERE, '..', 'dev', '.fonts'); os.makedirs(FONTS, exist_ok=True); os.makedirs(os.path.join(HERE, 'fonts'), exist_ok=True)
text = ''.join(open(os.path.join(HERE, f), encoding='utf-8').read() for f in ('index.html', 'game.js', 'doll.js'))
chars = set(text) | set('▶?0123456789 .,!?:;()/%+-~"\'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
tf = os.path.join(HERE, 'fonts', '_g.txt'); open(tf, 'w', encoding='utf-8').write(''.join(sorted(c for c in chars if c >= ' ')))
for name, out in (('Galmuri11.ttf', 'galmuri11.woff2'), ('Galmuri11-Bold.ttf', 'galmuri11-bold.woff2')):
    src = os.path.join(FONTS, name)
    if not os.path.exists(src): urllib.request.urlretrieve(f'https://raw.githubusercontent.com/quiple/galmuri/main/dist/{name}', src)
    subprocess.run([sys.executable, '-m', 'fontTools.subset', src, f'--text-file={tf}', '--flavor=woff2', f'--output-file={os.path.join(HERE, "fonts", out)}'], check=True)
os.remove(tf)
json.dump({'name': '쪈이의 디저트 대작전', 'short_name': '디저트 대작전', 'lang': 'ko', 'id': './', 'start_url': './', 'scope': './', 'display': 'standalone', 'orientation': 'portrait',
           'background_color': '#1A0E22', 'theme_color': '#1A0E22',
           'icons': [{'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'}, {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'}, {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]},
          open(os.path.join(HERE, 'manifest.webmanifest'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
PFX = sorted(os.path.relpath(os.path.join(d, n), HERE).replace(os.sep, '/') for d, _, fs in os.walk(os.path.join(HERE, 'pfx')) for n in fs if n.endswith('.js'))
files = ['./', 'index.html', 'game.js', 'doll.js', 'manifest.webmanifest', 'fonts/galmuri11.woff2', 'fonts/galmuri11-bold.woff2', 'icons/icon-192.png', 'icons/icon-512.png'] + [f'img/{n}.png' for n in ('hero', 'jelly', 'cookie', 'ice', 'donut', 'boss', 'boss2', 'boss3', 'golem', 'knight', 'queen')]  + PFX
h = hashlib.sha256()
for f in files[1:]: h.update(open(os.path.join(HERE, f), 'rb').read()) if f != 'manifest.webmanifest' else None
open(os.path.join(HERE, 'sw.js'), 'w', encoding='utf-8').write('''/* Keeps a copy of the game on the phone so it opens instantly and works with no connection. */
const CACHE = 'sweet-%s';
const FILES = %s;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sweet-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
});
''' % (h.hexdigest()[:10], json.dumps(files)))
print('built', h.hexdigest()[:10])
