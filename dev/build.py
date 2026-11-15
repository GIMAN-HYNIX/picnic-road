#!/usr/bin/env python3
"""Builds the installable app at the repository root from the single game file dev/picnic-road.html.

  pip install fonttools brotli
  python3 dev/build.py        # writes index.html, manifest.webmanifest, sw.js, fonts/*.woff2
  node dev/make-icons.js      # only when the icon drawing changes (needs playwright)

GitHub Pages serves the repository root, so a push after building is a release.
"""
import hashlib, json, os, re, subprocess, sys, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'picnic-road.html')
OUT = os.path.dirname(ROOT)
FONT_SRC = os.path.join(ROOT, '.fonts')      # full fonts, downloaded once, not committed
os.makedirs(os.path.join(OUT, 'fonts'), exist_ok=True)
os.makedirs(FONT_SRC, exist_ok=True)
for folder, name in (('jua', 'Jua-Regular.ttf'), ('gowundodum', 'GowunDodum-Regular.ttf')):
    dest = os.path.join(FONT_SRC, name)
    if not os.path.exists(dest):
        urllib.request.urlretrieve(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{folder}/{name}', dest)

page = open(SRC, encoding='utf-8').read()

# every character the game can show, so the fonts shipped with the app hold exactly those
chars = set(page) | set('0123456789 .,!?:;()/%+-~·…"\'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz→✓')
text_file = os.path.join(OUT, 'fonts', '_glyphs.txt')
open(text_file, 'w', encoding='utf-8').write(''.join(sorted(c for c in chars if c >= ' ')))
for src, dst in (('Jua-Regular.ttf', 'jua.woff2'), ('GowunDodum-Regular.ttf', 'gowun-dodum.woff2')):
    subprocess.run([sys.executable, '-m', 'fontTools.subset', os.path.join(FONT_SRC, src), f'--text-file={text_file}',
                    '--flavor=woff2', '--layout-features=*', f'--output-file={os.path.join(OUT, "fonts", dst)}'], check=True)
os.remove(text_file)

# the game file is written for the artifact viewer, which adds its own page shell; give it a real one here
page = re.sub(r'<title>.*?</title>\s*', '', page, count=1)
page = re.sub(r'<meta name="claude:[^>]*>\s*', '', page)
page = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>\s*', '', page)

head = '''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<title>소풍 가는 길</title>
<meta name="description" content="갈림길을 골라 퍼즐을 풀며 언덕을 오르는 소풍 모험">
<meta name="theme-color" content="#DCF0FB" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#161A35" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="소풍 가는 길">
<meta name="robots" content="noindex">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>
@font-face{font-family:'Jua'; src:url(fonts/jua.woff2) format('woff2'); font-display:swap}
@font-face{font-family:'Gowun Dodum'; src:url(fonts/gowun-dodum.woff2) format('woff2'); font-display:swap}
:root{color-scheme:light; padding:env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px)}
html{-webkit-text-size-adjust:100%; touch-action:manipulation}
body{margin:0}
[hidden]{display:none!important}
</style>
</head>
<body>
'''
html = head + page.strip() + '\n</body>\n</html>\n'
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)

manifest = {
    'name': '소풍 가는 길', 'short_name': '소풍 가는 길', 'description': '갈림길을 골라 퍼즐을 풀며 언덕을 오르는 소풍 모험',
    'lang': 'ko', 'id': './index.html', 'start_url': './index.html', 'scope': './index.html', 'display': 'standalone', 'orientation': 'portrait',
    'background_color': '#DCF0FB', 'theme_color': '#DCF0FB',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}
open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8').write(json.dumps(manifest, ensure_ascii=False, indent=2))

# the version changes whenever the game does, so phones drop the old copy and keep the new one
version = hashlib.sha256(html.encode('utf-8')).hexdigest()[:10]
files = ['./', 'index.html', 'manifest.webmanifest', 'fonts/jua.woff2', 'fonts/gowun-dodum.woff2',
         'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png']
sw = '''/* Keeps a copy of the game on the phone so it opens instantly and works with no connection. */
const CACHE = 'picnic-%s';
const FILES = %s;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('picnic-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match('index.html'))));
});
''' % (version, json.dumps(files))
open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(sw)

sizes = {f: os.path.getsize(os.path.join(OUT, f)) for f in ('index.html', 'fonts/jua.woff2', 'fonts/gowun-dodum.woff2')}
print('built picnic-app', version, sizes)
