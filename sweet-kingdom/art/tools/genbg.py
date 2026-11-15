import os, time, urllib.parse, urllib.request, sys
jobs = [
 ('title1', 'cute candy kingdom castle made of cookies and cake, cartoon mobile game title background, warm sunny sky, soft clouds, vibrant, no text, no characters', 11, 768, 1344),
 ('title2', 'whimsical dessert kingdom landscape with gingerbread castle, chocolate river, candy trees, cartoon mobile game background, bright warm colors, no text', 23, 768, 1344),
 ('title3', 'cookie castle on a hill of cream, lollipop trees, pastel sky, casual mobile game lobby background, cartoon painting, no text', 37, 768, 1344),
 ('ground1', 'top down seamless texture of golden biscuit cookie tiles, cartoon game floor, warm, flat lighting', 5, 768, 768),
 ('map1', 'old parchment treasure map texture, cartoon game, warm beige, empty, no text', 8, 768, 1024),
]
for name, p, seed, w, h in jobs:
    path = name + '.jpg'
    if os.path.exists(path): continue
    url = f'https://image.pollinations.ai/prompt/{urllib.parse.quote(p)}?width={w}&height={h}&nologo=true&seed={seed}'
    for a in range(8):
        try:
            d = urllib.request.urlopen(url, timeout=150).read()
            if d[:3] == b'\xff\xd8\xff': open(path, 'wb').write(d); print('ok', name, flush=True); break
            print('bad', name, d[:80], flush=True)
        except Exception as e: print('retry', name, getattr(e, 'code', e), flush=True)
        time.sleep(14)
    time.sleep(10)
