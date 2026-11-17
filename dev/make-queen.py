"""마카롱 여왕 (100스테이지 뒤 새 보스) 픽셀 그림을 만들어요.
   python3 dev/make-queen.py  →  sweet-kingdom/img/queen.png"""
import math, os
from PIL import Image

W, H = 64, 76
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
px = img.load()
INK = (26, 14, 34, 255)
BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

def hexc(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
PINK = [hexc(c) for c in ('#FFE3F0', '#FFB3D3', '#FF7FB4', '#E0558F', '#9C2E62')]
MINT = [hexc(c) for c in ('#E8FFF4', '#B8F0D8', '#7FD8B4', '#4AA88A', '#2A6E5C')]
CREAM = [hexc(c) for c in ('#FFFFFF', '#FFF6E2', '#F2DDB4', '#C9A87A')]
GOLD = [hexc(c) for c in ('#FFF7C0', '#FFD23F', '#E0A000', '#9C6A00')]
SKIN = [hexc(c) for c in ('#FFF0E0', '#FFD6B8', '#E8A88A')]

def shade(ramp, l, x, y):
    """l: 0(밝음)~1(어두움). 사이 값은 점무늬로 섞어요"""
    t = max(0.0, min(0.999, l)) * (len(ramp) - 1)
    k = int(t); f = t - k
    if f * 16 > BAYER[(y & 3) * 4 + (x & 3)] and k + 1 < len(ramp): k += 1
    return ramp[k]

def ellipse(cx, cy, rx, ry, ramp, light=(-0.55, -0.7), base=0.25, span=0.75, clip=None):
    for y in range(H):
        for x in range(W):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = dx * dx + dy * dy
            if d > 1 or (clip and not clip(x, y)): continue
            nz = math.sqrt(max(0, 1 - d))
            lam = max(0, -(dx * light[0] + dy * light[1]) + nz * 0.6)
            l = base + span * (1 - min(1, lam))
            px[x, y] = shade(ramp, l, x, y)

def rect(x0, y0, x1, y1, col):
    for y in range(y0, y1):
        for x in range(x0, x1): px[x, y] = col

# 망토 (뒤쪽, 민트)
for y in range(34, 72):
    w = 10 + (y - 34) * 0.62
    for x in range(int(32 - w), int(32 + w) + 1):
        if 0 <= x < W:
            edge = abs(x - 32) / w
            px[x, y] = shade(MINT, 0.25 + 0.6 * edge + 0.15 * (y - 34) / 38, x, y)
for y in range(40, 72, 1):
    for x in range(int(32 - 10 - (y - 34) * 0.62), int(32 + 10 + (y - 34) * 0.62) + 1):
        if 0 <= x < W and (x * 7 + y * 3) % 23 == 0: px[x, y] = MINT[0]
# 몸 아래 마카롱 껍질 (분홍)
ellipse(32, 60, 20, 10, PINK)
# 크림 띠
for y in range(46, 52):
    for x in range(10, 54):
        dx = (x + 0.5 - 32) / 22
        if dx * dx <= 1: px[x, y] = shade(CREAM, 0.1 + 0.55 * abs(dx) + (0.25 if y > 49 else 0), x, y)
for x in range(12, 52, 5): rect(x, 51, x + 2, 53 + (x % 3), CREAM[1])      # 흘러내린 크림
# 위 마카롱 껍질 = 얼굴
ellipse(32, 36, 22, 14, PINK)
# 껍질 테두리 주름 (마카롱 발)
for x in range(11, 53):
    if x % 2 == 0: px[x, 45] = PINK[3]
    else: px[x, 46] = PINK[2]
# 얼굴: 눈, 볼, 입
for ex in (24, 40):
    rect(ex - 2, 34, ex + 2, 40, INK)
    rect(ex - 1, 35, ex + 1, 37, (255, 255, 255, 255)); px[ex + 1, 38] = (255, 255, 255, 255)
    rect(ex - 2, 33, ex + 3, 34, INK)          # 화난 눈썹
for cx in (19, 45):
    for x in range(cx - 2, cx + 3):
        if (x + 41) % 2: px[x, 41] = PINK[1]
rect(29, 42, 36, 43, INK); px[28, 41] = INK; px[36, 41] = INK      # 입
# 왕관
for y in range(14, 24):
    for x in range(20, 45):
        teeth = (y >= 19) or (((x - 20) % 6) in (1, 2, 3) and y >= 14 + abs(((x - 20) % 6) - 2))
        if teeth: px[x, y] = shade(GOLD, 0.15 + 0.6 * (x - 20) / 25 + (0.2 if y > 21 else 0), x, y)
for gx, col in ((23, '#FF4F9A'), (32, '#7FE3FF'), (41, '#B8F03C')):
    rect(gx - 1, 20, gx + 1, 22, hexc(col)); px[gx - 1, 20] = (255, 255, 255, 255)
rect(20, 23, 45, 24, GOLD[3])
# 팔과 손
for side in (-1, 1):
    for t in range(12):
        x = int(32 + side * (22 + t * 0.55)); y = 44 + t
        for k in range(-2, 2): px[x + k * side, y] = shade(PINK, 0.35 + 0.05 * k, x, y)
    hx, hy = int(32 + side * 29), 57
    ellipse(hx, hy, 3.5, 3.5, SKIN, base=0.0, span=1.0)
# 홀: 오른손에 마카롱 지팡이
for y in range(20, 62): px[60, y] = GOLD[2]; px[59, y] = GOLD[1]
ellipse(59.5, 18, 5, 4, MINT, base=0.1)
for x in range(55, 64): px[x, 18] = CREAM[1]
# 발
rect(22, 68, 28, 71, PINK[3]); rect(36, 68, 42, 71, PINK[3])
# 안쪽 선을 한 번 더: 서로 다른 부분 사이에 잉크
out = img.copy(); po = out.load()
def part(c):
    if c[3] == 0: return None
    for name, r in (('p', PINK), ('m', MINT), ('c', CREAM), ('g', GOLD), ('s', SKIN)):
        if c in r: return name
    return 'o'
for y in range(1, H - 1):
    for x in range(1, W - 1):
        a = part(px[x, y])
        if a in (None, 'o'): continue
        b = part(px[x + 1, y]); c = part(px[x, y + 1])
        if (b and b != a and b != 'o' and a == 'm') or (c and c != a and c != 'o' and a == 'm' and c == 'p'): po[x, y] = MINT[4]
out.save(os.path.join(os.path.dirname(__file__), '..', 'sweet-kingdom', 'img', 'queen.png'))
print('saved', out.size)
