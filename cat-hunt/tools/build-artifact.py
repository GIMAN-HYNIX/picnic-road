#!/usr/bin/env python3
"""play.html의 <script src>를 모두 안에 넣어 파일 하나로 만든다 (아티팩트로 올릴 때 씀).
사용: python3 tools/build-artifact.py [나올 파일]   (cat-hunt 폴더에서 실행, 기본 dist/play-single.html)"""
import pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist' / 'play-single.html'
html = (root / 'play.html').read_text()
def rep(m):
    return '<script>\n' + (root / m.group(1)).read_text().replace('</script', '<\\/script') + '\n</script>'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(re.sub(r'<script src="([^"]+)"></script>', rep, html))
print(out, out.stat().st_size)
