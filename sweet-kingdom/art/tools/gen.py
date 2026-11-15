"""Free concept art through Pollinations' classic API (no key). Retries politely on its rate limit."""
import json, os, sys, time, urllib.parse, urllib.request
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'raw')
STYLE = ('cute chibi game character concept art, mobile game sprite style, bold clean dark outline, flat cel shading, '
         'vibrant candy pastel colors, full body, front three-quarter view, single character centered with wide empty margin, '
         'plain white background, no text')
JOBS = json.load(open(sys.argv[1], encoding='utf-8'))
for name, subject, seed in JOBS:
    path = os.path.join(OUT, name + '.jpg')
    if os.path.exists(path): continue
    q = urllib.parse.quote(f'{subject}, {STYLE}')
    url = f'https://image.pollinations.ai/prompt/{q}?width=768&height=768&nologo=true&seed={seed}'
    for attempt in range(8):
        try:
            with urllib.request.urlopen(url, timeout=150) as r:
                data = r.read()
            if data[:3] == b'\xff\xd8\xff':
                open(path, 'wb').write(data); print('ok', name, flush=True); break
            print('not an image', name, data[:120], flush=True)
        except Exception as e:
            print('retry', name, getattr(e, 'code', e), flush=True)
        time.sleep(14)
    time.sleep(12)
