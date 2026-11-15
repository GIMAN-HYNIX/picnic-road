"""Turns the painted sprites into small pixel-art sprites with a dark outline.  python3 art/tools/pixelate.py  (run from sweet-kingdom/)"""
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
JOBS = {'hero': ('hero', 38), 'jelly': ('jelly', 22), 'cookie': ('cookie', 26), 'ice': ('icecream', 26), 'donut': ('donut-knight', 42), 'boss': ('boss-cake', 74)}
COLS = {'hero': 16, 'jelly': 7, 'cookie': 8, 'ice': 7, 'donut': 9, 'boss': 11}   # 적은 색을 줄여서 면을 또렷하게
OUT = (26, 14, 34)
for name, (src, h) in JOBS.items():
    im = Image.open(f'art/sprites/{src}.png').convert('RGBA'); im = im.crop(im.getbbox())
    w = max(1, round(im.width * h / im.height))
    sm = im.resize((w * 4, h * 4), Image.LANCZOS)
    sm = Image.merge('RGBA', (*ImageEnhance.Contrast(ImageEnhance.Color(sm.convert('RGB')).enhance(1.25)).enhance(1.15).split(), sm.split()[3]))
    sm = Image.merge('RGBA', (*sm.convert('RGB').filter(ImageFilter.UnsharpMask(3, 160 if name != 'hero' else 60, 2)).split(), sm.split()[3])).resize((w, h), Image.BOX)
    a = np.array(sm); alpha = a[..., 3] > 120
    rgb = np.array(Image.fromarray(a[..., :3]).quantize(colors=COLS[name], method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
    out = np.zeros((h + 2, w + 2, 4), np.uint8); m = np.zeros((h + 2, w + 2), bool); m[1:-1, 1:-1] = alpha
    out[1:-1, 1:-1, :3] = rgb; out[1:-1, 1:-1, 3] = alpha * 255
    ring = (np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)) & ~m
    out[ring] = [*OUT, 255]
    # 셀 음영: 왼쪽 위 가장자리는 밝게, 오른쪽 아래 가장자리는 어둡게 (빛은 왼쪽 위에서)
    inside = out[..., 3] > 0; inside &= ~((out[..., 0] == OUT[0]) & (out[..., 1] == OUT[1]) & (out[..., 2] == OUT[2]))
    col = out[..., :3].astype(int); lum = col.sum(2) / 3
    lit = inside & ~np.roll(inside, 1, 0) | inside & ~np.roll(inside, 1, 1)
    shade = inside & ~np.roll(inside, -1, 0) | inside & ~np.roll(inside, -1, 1)
    k = 0.35 if name != 'hero' else 0.18
    col[lit & ~shade] = col[lit & ~shade] + ((255 - col[lit & ~shade]) * k).astype(int)
    col[shade & ~lit] = (col[shade & ~lit] * (1 - k * 0.9)).astype(int)
    if name != 'hero':   # 눈 반짝이: 어두운 눈동자 덩어리의 왼쪽 위 칸을 하얗게
        dark = inside & (lum < 60)
        deep = inside.copy()
        for dy in (-2, -1, 0, 1, 2):
            for dx in (-2, -1, 0, 1, 2): deep &= np.roll(np.roll(inside, dy, 0), dx, 1)
        corner = deep & dark & ~np.roll(dark, 1, 0) & ~np.roll(dark, 1, 1) & np.roll(dark, -1, 0) & np.roll(dark, -1, 1)
        col[corner] = 255
    out[..., :3] = np.clip(col, 0, 255)
    Image.fromarray(out).save(f'img/{name}.png'); print(name, w + 2, h + 2)
# hand touch-up: the hero's face is too small for the automatic pass to keep, so eyes, blush and mouth are placed by hand
h = Image.open('img/hero.png'); p = h.load()
for x, y, c in [(12, 16, (58, 30, 34)), (12, 17, (58, 30, 34)), (17, 16, (58, 30, 34)), (17, 17, (58, 30, 34)), (13, 16, (255, 255, 255)), (18, 16, (255, 255, 255)),
                (11, 18, (255, 150, 170)), (18, 18, (255, 150, 170)), (14, 19, (200, 80, 100)), (15, 19, (200, 80, 100))]:
    p[x, y] = (*c, 255)
h.save('img/hero.png')
