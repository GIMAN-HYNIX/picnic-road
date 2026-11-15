"""Turns the painted sprites into small pixel-art sprites with a dark outline.  python3 art/tools/pixelate.py  (run from sweet-kingdom/)"""
from PIL import Image, ImageEnhance
import numpy as np
JOBS = {'hero': ('hero', 38), 'jelly': ('jelly', 22), 'cookie': ('cookie', 26), 'ice': ('icecream', 26), 'donut': ('donut-knight', 42), 'boss': ('boss-cake', 74)}
OUT = (26, 14, 34)
for name, (src, h) in JOBS.items():
    im = Image.open(f'art/sprites/{src}.png').convert('RGBA'); im = im.crop(im.getbbox())
    w = max(1, round(im.width * h / im.height))
    sm = im.resize((w * 4, h * 4), Image.LANCZOS)
    sm = Image.merge('RGBA', (*ImageEnhance.Contrast(ImageEnhance.Color(sm.convert('RGB')).enhance(1.25)).enhance(1.15).split(), sm.split()[3]))
    sm = sm.resize((w, h), Image.BOX)
    a = np.array(sm); alpha = a[..., 3] > 120
    rgb = np.array(Image.fromarray(a[..., :3]).quantize(colors=16, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
    out = np.zeros((h + 2, w + 2, 4), np.uint8); m = np.zeros((h + 2, w + 2), bool); m[1:-1, 1:-1] = alpha
    out[1:-1, 1:-1, :3] = rgb; out[1:-1, 1:-1, 3] = alpha * 255
    ring = (np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)) & ~m
    out[ring] = [*OUT, 255]
    Image.fromarray(out).save(f'img/{name}.png'); print(name, w + 2, h + 2)
# hand touch-up: the hero's face is too small for the automatic pass to keep, so eyes, blush and mouth are placed by hand
h = Image.open('img/hero.png'); p = h.load()
for x, y, c in [(12, 16, (58, 30, 34)), (12, 17, (58, 30, 34)), (17, 16, (58, 30, 34)), (17, 17, (58, 30, 34)), (13, 16, (255, 255, 255)), (18, 16, (255, 255, 255)),
                (11, 18, (255, 150, 170)), (18, 18, (255, 150, 170)), (14, 19, (200, 80, 100)), (15, 19, (200, 80, 100))]:
    p[x, y] = (*c, 255)
h.save('img/hero.png')
