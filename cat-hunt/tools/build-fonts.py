#!/usr/bin/env python3
"""게임에 실제로 쓰인 글자만 골라 갈무리 픽셀 폰트를 작게 묶어 js/fonts.js로 만든다.
사용법: npm pack galmuri && tar xzf galmuri-*.tgz  →  python3 tools/build-fonts.py <package/dist 경로>
필요: pip install fonttools brotli
"""
import base64, glob, io, os, sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist = sys.argv[1]
chars = set(chr(c) for c in range(0x20, 0x7f)) | set('·…“”‘’—–♪×←→↑↓▲▼◀▶★☆♥')
for f in glob.glob(os.path.join(ROOT, 'js', '*.js')) + [os.path.join(ROOT, 'index.html')]:
    if f.endswith('fonts.js'):
        continue
    chars |= set(open(f, encoding='utf8').read())
chars = {c for c in chars if ord(c) >= 0x20}
text = ''.join(sorted(chars))
faces = [('Galmuri9', 'Galmuri9.ttf'), ('Galmuri7', 'Galmuri7.ttf'), ('Galmuri11', 'Galmuri11.ttf'), ('Galmuri11B', 'Galmuri11-Bold.ttf')]
css = []
total = 0
for fam, fn in faces:
    font = TTFont(os.path.join(dist, fn))
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.notdef_outline = True
    sub = subset.Subsetter(opts); sub.populate(text=text); sub.subset(font)
    buf = io.BytesIO(); font.flavor = 'woff2'; font.save(buf)
    data = base64.b64encode(buf.getvalue()).decode(); total += len(buf.getvalue())
    css.append("@font-face{font-family:'%s';src:url(data:font/woff2;base64,%s) format('woff2');font-display:block}" % (fam, data))
js = """/* 자동 생성 파일: tools/build-fonts.py
   갈무리(Galmuri) 픽셀 폰트 · SIL Open Font License 1.1 (fonts/OFL-galmuri.txt) · 게임에 쓰인 글자만 포함 */
(function () {
  var st = document.createElement('style');
  st.textContent = %r;
  (document.head || document.documentElement).appendChild(st);
  var fs = ['10px Galmuri9', '8px Galmuri7', '12px Galmuri11', '12px Galmuri11B'];
  window.FONTS_READY = Promise.all(fs.map(function (f) { return document.fonts.load(f, '가나다ABC'); })).catch(function () {});
})();
""" % '\n'.join(css)
open(os.path.join(ROOT, 'js', 'fonts.js'), 'w', encoding='utf8').write(js)
print('glyph chars:', len(chars), 'woff2 bytes:', total)
