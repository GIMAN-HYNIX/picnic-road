#!/usr/bin/env python3
"""swing-lab.html의 <script src>를 전부 파일 안에 넣어 한 파일짜리 페이지를 만듦 (아티팩트로 올릴 때 씀)
   쓰는 법: python3 build.py 나올파일.html"""
import re, sys, os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'swing-lab.html'), encoding='utf8').read()
def inline(m):
    return '<script>\n' + open(os.path.join(here, m.group(1)), encoding='utf8').read().replace('</script', '<\\/script') + '\n</script>'
out = re.sub(r'<script src="([^"]+)"></script>', inline, src)
open(sys.argv[1], 'w', encoding='utf8').write(out)
print(len(out) // 1024, 'KB')
