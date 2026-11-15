"""Crops the watermark corner off each concept and lays them out on one labelled sheet."""
from PIL import Image, ImageDraw, ImageFont
import os, sys
items = [l.split('|') for l in sys.argv[2:]]
cell, pad, label_h = 360, 16, 46
cols = 4; rows = (len(items) + cols - 1) // cols
W = cols * cell + (cols + 1) * pad; H = rows * (cell + label_h) + (rows + 1) * pad
sheet = Image.new('RGB', (W, H), (250, 247, 242))
font = None
for f in ['/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc']:
    if os.path.exists(f): font = ImageFont.truetype(f, 26); break
if font is None:
    font = ImageFont.truetype('/home/user/picnic-road/dev/.fonts/GowunDodum-Regular.ttf', 26) if os.path.exists('/home/user/picnic-road/dev/.fonts/GowunDodum-Regular.ttf') else ImageFont.truetype('/home/user/picnic-fonts-src/GowunDodum-Regular.ttf', 26)
d = ImageDraw.Draw(sheet)
for i, (name, label) in enumerate(items):
    im = Image.open(f'raw/{name}.jpg').convert('RGB')
    w, h = im.size
    im = im.crop((int(w * .09), int(h * .04), int(w * .91), int(h * .86)))   # drops the watermark strip at the bottom right
    im.thumbnail((cell, cell))
    x = pad + (i % cols) * (cell + pad); y = pad + (i // cols) * (cell + label_h + pad)
    sheet.paste(im, (x + (cell - im.width) // 2, y))
    d.text((x + 4, y + cell + 8), label, fill=(40, 40, 50), font=font)
sheet.save(sys.argv[1], quality=92)
print('saved', sys.argv[1], sheet.size)
