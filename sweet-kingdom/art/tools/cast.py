"""Shows the cut-out sprites on a candy-coloured ground, sized roughly as they would be in battle, with labels."""
from PIL import Image, ImageDraw, ImageFont
import random
W, H = 1400, 900
bg = Image.new('RGBA', (W, H), (255, 228, 236, 255)); d = ImageDraw.Draw(bg)
random.seed(4)
for _ in range(260):   # sprinkles on the ground
    x, y = random.randint(0, W), random.randint(0, H); c = random.choice([(255, 190, 210), (200, 235, 220), (255, 240, 190), (210, 210, 255)])
    d.rounded_rectangle((x, y, x + 14, y + 5), 3, fill=c + (255,))
font = ImageFont.truetype('/home/user/picnic-fonts-src/Jua-Regular.ttf', 30)
small = ImageFont.truetype('/home/user/picnic-fonts-src/GowunDodum-Regular.ttf', 22)
cast = [('boss-cake', 560, 40, 420, '보스', '곰팡이 케이크'), ('hero', 120, 300, 330, '주인공', '슈크림 망토 제빵사'),
        ('donut-knight', 1050, 330, 300, '엘리트', '딱딱 도넛 기사'), ('jelly', 470, 560, 210, '잡몹', '곰팡이 젤리'),
        ('cookie', 700, 560, 210, '잡몹', '탄 쿠키곰'), ('icecream', 930, 600, 190, '잡몹', '녹은 아이스크림')]
for name, x, y, h, role, label in cast:
    im = Image.open(f'sprites/{name}.png'); im = im.resize((int(im.width * h / im.height), h), Image.LANCZOS)
    sh = Image.new('RGBA', (int(im.width * .8), 26), (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse((0, 0, sh.width, 26), fill=(120, 60, 90, 60))
    bg.alpha_composite(sh, (x + (im.width - sh.width) // 2, y + h - 16)); bg.alpha_composite(im, (x, y))
    d.text((x + im.width // 2, y + h + 18), role, font=small, fill=(120, 70, 95), anchor='mt')
    d.text((x + im.width // 2, y + h + 46), label, font=font, fill=(60, 30, 50), anchor='mt')
bg.convert('RGB').save('cast-sheet.jpg', quality=92); print('ok')
