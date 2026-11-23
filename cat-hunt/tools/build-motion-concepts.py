#!/usr/bin/env python3
"""두 손 칼질 모션 시안 5가지를 컷과 미리보기로 보여 주는 페이지를 만든다 (아티팩트용 파일 하나).
사용: python3 tools/build-motion-concepts.py [나올 파일]   (기본 dist/motion-concepts.html)"""
import pathlib, sys
base = pathlib.Path(__file__).resolve().parent.parent
root = base / 'js'
js = '\n'.join('<script>\n' + (root / f).read_text().replace('</script', '<\\/script') + '\n</script>' for f in ['core.js', 'hires.js', 'g-cat.js', 'g-man.js'])
page = r'''<title>두 손 칼질 시안</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
  /* 한 가지 어두운 숲 색으로 고정. 시안마다: 제목 → 이어 치는 미리보기 → 1·2·3타 컷 줄 */
  :root { --bg: #10161a; --panel: #18222a; --line: #2c3a40; --ink: #e9e2cf; --dim: #9aa39a; --gold: #e6c36a; --moss: #3a5a44; color-scheme: dark;
    --sans: "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif; }
  html { background: var(--bg); }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.6 var(--sans); padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
  main { max-width: 1180px; margin: 0 auto; display: flex; flex-direction: column; gap: 36px; }
  header h1 { font-size: 26px; margin: 0 0 6px; letter-spacing: -.01em; text-wrap: balance; }
  header p { margin: 0; color: var(--dim); max-width: 62ch; }
  .bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 14px; }
  button { font: inherit; color: var(--ink); background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 6px 14px; cursor: pointer; }
  button[aria-pressed="true"] { border-color: var(--gold); color: var(--gold); }
  button:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
  #load { color: var(--dim); font-size: 13px; font-variant-numeric: tabular-nums; }
  section { border-top: 1px solid var(--line); padding-top: 22px; display: grid; grid-template-columns: minmax(0, 260px) minmax(0, 1fr); gap: 20px 28px; }
  .head { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
  .head h2 { margin: 0; font-size: 20px; } .head h2 small { display: block; font-size: 13px; font-weight: 500; color: var(--gold); letter-spacing: .06em; }
  .head p { margin: 0; color: var(--dim); font-size: 14px; }
  canvas { image-rendering: pixelated; display: block; background: var(--moss); border-radius: 6px; max-width: 100%; }
  .live { width: 260px; height: auto; }
  .rows { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .row h3 { margin: 0 0 6px; font-size: 14px; font-weight: 600; } .row h3 b { color: var(--gold); font-weight: 600; margin-right: 8px; }
  .scroll { overflow-x: auto; } .scroll canvas { width: 100%; min-width: 720px; height: auto; }
  .caps { display: grid; grid-template-columns: repeat(6, 1fr); min-width: 720px; font-size: 12px; color: var(--dim); text-align: center; margin-top: 4px; }
  @media (max-width: 760px) { section { grid-template-columns: minmax(0, 1fr); } }
</style>
<main>
  <header>
    <h1>두 손 칼질 시안 다섯 가지</h1>
    <p>사냥칼을 두 손으로 잡고 치는 3타 구성을 다섯 가지로 짰어요. 왼쪽은 1타부터 3타까지 이어 치는 모습이고, 오른쪽은 한 타씩 끊어 본 컷이에요.</p>
    <div class="bar"><button id="slow" aria-pressed="false">천천히 보기</button><span id="load">그리는 중 0%</span></div>
  </header>
  <div id="list" style="display:contents"></div>
</main>
__JS__
<script>
'use strict';
const DESC = ['군더더기 없는 기본기예요. 곧게 내려 베고, 옆으로 쓸고, 찔러요. 가장 읽기 쉬워요.', '칼을 도끼처럼 써요. 어깨에 멨다가 찍고, 마지막엔 뛰어올라 온몸으로 내려찍어요. 느리지만 묵직해요.', '몸을 낮추고 아래에서 위로 쳐요. 발밑을 후리고, 마지막엔 칼을 거꾸로 잡고 내려꽂아요. 물웅덩이에서 솟는 적과 잘 맞아요.', '우비 자락을 크게 날리며 돌려 쳐요. 마지막엔 솟구치며 올려 베어요. 가장 화려해요.', '칼집에서 뽑듯 한 번에 베고, 마지막엔 길게 밀고 들어가 찔러요. 가장 빠르고 멀리 나가요.'];
const CW = 190, CH = 196, CX = MAN_OX - 62, CUTS = [3, 4, 6, 8, 9, 12], CAP = ['준비', '휘두름', '베기', '지나감', '끝', '거두기'];
const KT = [[.09, .09, .18], [.07, .09, .18], [.17, .1, .32]];   // 게임과 같은 박자: 준비 · 베기 · 거두기
const cache = new Map();
function bake(v, anim, fr) {
  const k = v + anim + '_' + fr; let c = cache.get(k); if (c) return c;
  KN_VAR = v; const pb = new PB(MAN_W, MAN_H), R = HR.reset(1, MAN_OX, MAN_OY); manDraw(R, anim, fr, 's', {}); rasterHi(pb, R, G_ST);
  c = pb.canvas(); cache.set(k, c); return c;
}
function cell(g, x, spr, a) {
  g.fillStyle = 'rgba(16,22,26,.28)'; g.beginPath(); g.ellipse(x + 62, CH - 9, 30, 6, 0, 0, 6.3); g.fill();
  g.globalAlpha = a == null ? 1 : a; g.drawImage(spr, CX, 0, CW, CH, x, 0, CW, CH); g.globalAlpha = 1;
}
const list = document.getElementById('list'), lives = [], jobs = [];
M_KNS.forEach((_, v) => {
  const sec = document.createElement('section');
  sec.innerHTML = `<div class="head"><h2><small>모션 시안 ${v + 1}</small>${M_KN_NAMES[v]}</h2><canvas class="live" width="${CW + 70}" height="${CH}" aria-label="시안 ${v + 1} 이어 치기 미리보기"></canvas><p>${DESC[v]}</p></div><div class="rows"></div>`;
  const rows = sec.querySelector('.rows');
  for (let c = 0; c < 3; c++) {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<h3><b>${c + 1}타</b>${M_KN_MOVES[v][c]}</h3><div class="scroll"><canvas width="${CW * 6}" height="${CH}" aria-label="시안 ${v + 1}의 ${c + 1}타 컷 여섯 장"></canvas><div class="caps">${CAP.map(t => `<span>${t}</span>`).join('')}</div></div>`;
    rows.appendChild(row); const g = row.querySelector('canvas').getContext('2d'); g.imageSmoothingEnabled = false;
    CUTS.forEach((fr, i) => jobs.push(() => { if (i) { g.fillStyle = 'rgba(16,22,26,.35)'; g.fillRect(i * CW - 1, 0, 2, CH); } cell(g, i * CW, bake(v, 'knife' + (c + 1), fr)); }));
  }
  list.appendChild(sec); lives.push({ v, g: sec.querySelector('.live').getContext('2d'), ready: false });
});
// 미리보기에 쓸 나머지 프레임
M_KNS.forEach((_, v) => { for (let c = 1; c <= 3; c++) { for (let f = 0; f < KN_N; f++) jobs.push(() => bake(v, 'knife' + c, f)); for (let f = 0; f < KN_SUB; f++) jobs.push(() => bake(v, 'knife' + c + 'c', f)); } jobs.push(() => { lives[v].ready = true; }); });
const total = jobs.length, load = document.getElementById('load');
(function pump() { const t = performance.now(); while (jobs.length && performance.now() - t < 14) jobs.shift()(); load.textContent = jobs.length ? '그리는 중 ' + Math.round((1 - jobs.length / total) * 100) + '%' : ''; if (jobs.length) setTimeout(pump, 0); })();
// 이어 치기: 1타 → 2타 → 3타 → 잠깐 쉼
const ez = x => 1 - (1 - x) * (1 - x), sm = x => x * x * (3 - 2 * x);
function pose(T) {
  let t = T, x = 0;
  for (let c = 0; c < 3; c++) {
    const K = KT[c], full = K[0] + K[1] + K[2], len = c < 2 ? K[0] + K[1] + .1 : full + .7;
    if (t < len) {
      const tt = Math.min(t, full); let u;
      if (tt < K[0]) u = ez(tt / K[0]); else if (tt < K[0] + K[1]) u = 1 + 2 * ez((tt - K[0]) / K[1]); else { const r = Math.min(1, (tt - K[0] - K[1]) / K[2]); u = r < .4 ? 3 + ez(r / .4) : 4 + sm((r - .4) / .6); }
      const fr = Math.round(u * KN_SUB), step = [10, 10, 18][c] * (tt < K[0] ? -.25 * tt / K[0] : ez(Math.min(1, (tt - K[0]) / K[1])));
      return { anim: 'knife' + (c + 1) + (c > 0 && fr < KN_SUB ? 'c' : ''), fr, x: x + step };
    }
    t -= len; x += [10, 10, 18][c];
  }
  return null;
}
const LOOP = KT.reduce((s, K, c) => s + (c < 2 ? K[0] + K[1] + .1 : K[0] + K[1] + K[2] + .7), 0);
let slow = false, clock = 0, last = 0; const btn = document.getElementById('slow');
btn.addEventListener('click', () => { slow = !slow; btn.setAttribute('aria-pressed', slow); });
const still = matchMedia('(prefers-reduced-motion: reduce)').matches; if (still) { slow = true; btn.setAttribute('aria-pressed', true); }
function frame(ts) {
  const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts; clock = (clock + dt * (slow ? .22 : 1)) % LOOP;
  for (const L of lives) { if (!L.ready) continue; const p = pose(clock) || { anim: 'knife3', fr: KN_N - 1, x: 38 }, g = L.g; g.imageSmoothingEnabled = false; g.clearRect(0, 0, CW + 70, CH); g.fillStyle = 'rgba(16,22,26,.28)'; g.beginPath(); g.ellipse(62 + p.x, CH - 9, 30, 6, 0, 0, 6.3); g.fill(); g.drawImage(bake(L.v, p.anim, p.fr), CX, 0, CW, CH, Math.round(p.x), 0, CW, CH); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
</script>
'''
out = page.replace('__JS__', js)
dst = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else base / 'dist' / 'motion-concepts.html'
dst.parent.mkdir(parents=True, exist_ok=True); dst.write_text(out); print(dst, len(out))
