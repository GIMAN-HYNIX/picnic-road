'use strict';
/* 쪈이의 디저트 대작전 — 전투는 이동만 하는 자동 공격, 전투 사이에는 갈림길을 고르고 카드 덱을 짜는 게임 */

const $ = s => document.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const rnd = n => Math.floor(Math.random() * n), rand = (a, b) => a + Math.random() * (b - a), pick = a => a[rnd(a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/* 아이콘: 벡터 그림을 16칸 픽셀 그림으로 바꿔 두고 써요 (바꾸기 전에는 벡터 그대로) */
const PXI = new Map();
const svg = inner => PXI.has(inner) ? `<img class="pxi" src="${PXI.get(inner)}" alt="" aria-hidden="true">` : `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${inner}</svg>`;
function pixelIcon(inner) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => {
      try {
        const n = 16, a = document.createElement('canvas'); a.width = a.height = n; const q = a.getContext('2d'); q.drawImage(im, 0, 0, n, n);
        const d = q.getImageData(0, 0, n, n), o = document.createElement('canvas'); o.width = o.height = n + 2; const w = o.getContext('2d'), on = (x, y) => x >= 0 && y >= 0 && x < n && y < n && d.data[(y * n + x) * 4 + 3] > 110;
        for (let y = -1; y <= n; y++) for (let x = -1; x <= n; x++) {
          if (on(x, y)) { const i = (y * n + x) * 4, k = v => Math.min(255, (v >> 4 << 4) + 8); w.fillStyle = `rgb(${k(d.data[i])},${k(d.data[i + 1])},${k(d.data[i + 2])})`; }
          else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) w.fillStyle = '#1A0E22'; else continue;
          w.fillRect(x + 1, y + 1, 1, 1);
        }
        PXI.set(inner, o.toDataURL());
      } catch (e) {}
      res();
    };
    im.onerror = () => res();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="64" height="64">${inner}</svg>`);
  });
}

/* ───── 저장 (이 폰에만) ───── */
const KEY = 'sweet-kingdom-v1';
let S = { muted: false, vib: true, wins: 0, run: null };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
if (S.run && S.run.maxHp > 10) { const r = S.run, m = 3 + (r.relics || []).includes('apron'); r.hp = Math.max(1, Math.round(r.hp / r.maxHp * m)); r.maxHp = m; }
/* 난이도: 적이 나오는 수, 적 속도, 적 체력, 맞은 뒤 무적 시간, 엘리트·보스 공격 예고 시간 */
const DIFF = {
  easy: { name: '쉬움', spawn: 0.7, spd: 0.85, hp: 0.72, inv: 1.7, warn: 1.3, desc: '적이 적고 느려요. 맞은 뒤 무적 시간이 길어요.' },
  normal: { name: '보통', spawn: 1, spd: 1, hp: 1, inv: 1.3, warn: 1, desc: '원래 난이도예요.' },
  hard: { name: '어려움', spawn: 1.2, spd: 1.08, hp: 1.2, inv: 1.1, warn: 0.85, desc: '적이 많고 빨라요.' }
};
S.diff = 'normal';                 // 난이도는 보통으로 고정
const DF = () => DIFF.normal;
if (S.run && S.run.deck && !S.run.wpn) {   // 예전 덱 저장을 새 무기 방식으로 옮겨요
  const r = S.run, ids = [...new Set(r.deck.map(c => c.id))].filter(id => ['pin', 'cream', 'star', 'macaron', 'honey', 'lemon', 'skewer'].includes(id));
  r.wpn = (ids.length ? ids : ['pin']).map(id => ({ id, lv: 1 })); r.lvl = 1; r.xp = 0; r.bonus = { spd: 0, dmg: 0, crit: 0 }; r.rerolls = 0; delete r.deck; delete r.equip;
}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
let run = null;

/* ───── 성장 트리: 모험이 끝날 때마다 받는 설탕 별로 주인공의 기본 능력을 키워요 ───── */
/* col 0~4, row 0~5. req: 먼저 1단계 이상 배워야 하는 칸 */
const TREE = [
  { id: 'atk', name: '단단한 팔', desc: '모든 피해 +5%', max: 5, cost: [1, 2, 2, 3, 3], col: 0, row: 0, icon: 'star' },
  { id: 'hp', name: '포근한 앞치마', desc: '최대 하트 +1칸', max: 2, cost: [5, 10], col: 2, row: 0, icon: 'heart' },
  { id: 'spd', name: '가벼운 신발', desc: '이동 속도 +4%', max: 5, cost: [1, 2, 2, 3, 3], col: 4, row: 0, icon: 'honey' },
  { id: 'crit', name: '날카로운 눈', desc: '치명타 확률 +3%', max: 5, cost: [2, 2, 3, 3, 4], col: 0, row: 1, req: 'atk', icon: 'ench' },
  { id: 'guard', name: '설탕 갑옷', desc: '맞은 뒤 무적 시간 +15%', max: 3, cost: [2, 3, 4], col: 2, row: 1, req: 'hp', icon: 'dough' },
  { id: 'mag', name: '설탕 자석', desc: '보석 줍는 거리 +20%', max: 3, cost: [1, 2, 3], col: 4, row: 1, req: 'spd', icon: 'magnet' },
  { id: 'critd', name: '치명 한 방', desc: '치명타 피해 +25%', max: 3, cost: [3, 4, 5], col: 1, row: 2, req: 'crit', icon: 'pin' },
  { id: 'shield', name: '솜사탕 방패', desc: '전투마다 처음 맞는 공격 1번을 막아요', max: 1, cost: [6], col: 2, row: 2, req: 'guard', icon: 'cream' },
  { id: 'xp', name: '계량 노트', desc: '경험치 +8%', max: 5, cost: [2, 2, 3, 3, 4], col: 3, row: 2, req: 'mag', icon: 'cup' },
  { id: 'size', name: '큰 손', desc: '무기 범위 +8%', max: 3, cost: [3, 4, 5], col: 0, row: 3, req: 'critd', icon: 'glove' },
  { id: 'start2', name: '두 번째 무기', desc: '무기 1개를 더 들고 출발해요', max: 1, cost: [8], col: 2, row: 3, req: 'shield', icon: 'chest' },
  { id: 'gold', name: '행운 지갑', desc: '골드 +15%', max: 3, cost: [1, 2, 3], col: 4, row: 3, req: 'xp', icon: 'coin' },
  { id: 'choice', name: '넓은 선택', desc: '레벨업 선택지가 4장이 돼요', max: 1, cost: [10], col: 1, row: 4, req: 'size', icon: 'event' },
  { id: 'reroll', name: '다시 굽기', desc: '모험마다 레벨업 선택지를 다시 뽑는 기회 +2번', max: 2, cost: [4, 6], col: 3, row: 4, req: 'gold', icon: 'rest' },
  { id: 'veteran', name: '숙련 제빵사', desc: '처음 무기가 Lv3으로 시작해요', max: 1, cost: [12], col: 2, row: 5, req: 'start2', icon: 'ench' }
];
if (!S.meta || typeof S.meta !== 'object' || !S.meta.n) S.meta = { pts: 0, total: 0, n: {} };
const M = id => S.meta.n[id] || 0;
const TNODE = Object.fromEntries(TREE.map(t => [t.id, t]));
const canLearn = t => M(t.id) < t.max && (!t.req || M(t.req) > 0);
/* 모험이 끝나면 설탕 별을 받아요: 올라간 층, 잡은 적, 엘리트, 승리 */
function sugarStars(r, won) { return Math.max(1, Math.round((run.floor + 1) * 2 + Math.min(5, (run.kills || 0) / 800) + (run.elites || 0) * 2 + (won ? 8 : 0))     /* 이기면 30개 남짓: 5~6번 이기면 트리를 다 배워요 */); }
function treeSheet(back) {
  let sel = null;
  const cell = 64, W = 5 * cell, H = 6 * 78 + 20, pos = t => [t.col * cell + cell / 2, t.row * 78 + 40];
  const draw = () => {
    let lines = ''; TREE.forEach(t => { if (!t.req) return; const [a, b] = pos(TNODE[t.req]), [c, d] = pos(t); lines += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" class="${M(t.req) ? 'on' : ''}"/>`; });
    const nodes = TREE.map(t => { const [x, y] = pos(t), r = M(t.id), st = r >= t.max ? 'max' : canLearn(t) ? 'can' : 'lock'; return `<button class="tn ${st}${r ? ' got' : ''}${sel === t.id ? ' sel' : ''}" type="button" data-act="node" data-id="${t.id}" style="left:${x}px; top:${y}px" aria-label="${t.name}"><span class="ti">${svg(ICON[t.icon])}</span><span class="tr">${r}/${t.max}</span></button>`; }).join('');
    const t = sel && TNODE[sel], r = t ? M(t.id) : 0, cost = t && r < t.max ? t.cost[r] : 0;
    const detail = t ? `<div class="td"><b>${t.name} ${r}/${t.max}</b><span>${t.desc}${t.max > 1 ? ` (1단계마다)` : ''}.${t.req && !M(t.req) ? ` 먼저 '${TNODE[t.req].name}'을 배워야 해요.` : ''}</span>${r < t.max ? `<button class="cta" type="button" data-act="learn"${canLearn(t) && S.meta.pts >= cost ? '' : ' aria-disabled="true"'}>배우기 · 설탕 별 ${cost}개</button>` : `<em>다 배웠어요</em>`}</div>` : `<div class="td"><span>칸을 눌러 보면 무엇을 키우는지 알려 줘요. 위에서부터 이어진 길을 따라 배워요.</span></div>`;
    sheet(`<h2 id="cardTitle">성장 트리</h2><p class="pts">설탕 별 <b>${S.meta.pts}</b>개</p><div class="tree" style="width:${W}px; height:${H}px"><svg class="tl" viewBox="0 0 ${W} ${H}" aria-hidden="true">${lines}</svg>${nodes}</div>${detail}<button class="btn" type="button" data-act="close">닫기</button>`,
      (act, b) => {
        if (act === 'close') { closeSheet(); if (back) back(); return; }
        if (act === 'node') { sel = b.dataset.id; sfx.tap(); const sc = cardEl.scrollTop; draw(); cardEl.scrollTop = sc; return; }
        if (act === 'learn') { const t2 = TNODE[sel], c = t2.cost[M(sel)]; if (!canLearn(t2) || S.meta.pts < c) { sfx.no(); return; } S.meta.pts -= c; S.meta.n[sel] = M(sel) + 1; persist(); sfx.rare(); const sc = cardEl.scrollTop; draw(); cardEl.scrollTop = sc; const n = cardEl.querySelector('.tn.sel'); if (n) { const q = n.getBoundingClientRect(); sparkle(q.left + q.width / 2, q.top + q.height / 2, 12); } }
      });
  };
  draw();
}

/* ───── 그림 ───── */
const IMG = {};
const SPRITES = ['hero', 'jelly', 'cookie', 'ice', 'donut', 'boss'];
/* 움직임 프레임: 주인공은 다리를 번갈아 드는 4프레임 걷기, 적은 한 줄 눌린 2프레임 */
function whiteOf(im) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); return c; }
function walkFrames(im) {
  const w = im.width, h = im.height, LEG = 4, sp = Math.floor(w / 2) + 1, body = h - LEG;
  // [왼발 들기, 오른발 들기, 몸 올리기]  다리 → 몸 순서로 그려서 든 발은 치마 밑으로 숨어요
  return [[2, 0, 0], [0, 0, 1], [0, 2, 0], [0, 0, 1], [0, 0, 0]].map(([l, r, b]) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h + 1; const x = c.getContext('2d');
    x.drawImage(im, 0, body, sp, LEG, 0, body + 1 - l, sp, LEG); x.drawImage(im, sp, body, w - sp, LEG, sp, body + 1 - r, w - sp, LEG);
    x.drawImage(im, 0, 0, w, body, 0, 1 - b, w, body); if (l || r) { x.drawImage(im, l ? sp : 0, h - 1, l ? w - sp : sp, 1, l ? sp : 0, h, l ? w - sp : sp, 1); } return c;
  });
}
function squashFrame(im) {
  const w = im.width, h = im.height, cut = Math.floor(h * 0.45), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.drawImage(im, 0, 0, w, cut, 0, 1, w, cut); x.drawImage(im, 0, cut + 1, w, h - cut - 1, 0, cut + 1, w, h - cut - 1); return c;
}
function loadImages() {
  return Promise.all(SPRITES.map(n => new Promise(res => {
    const im = new Image();
    im.onload = () => {      // 맞았을 때 번쩍이는 흰 실루엣도 같이 만들어 둬요
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      IMG[n] = { im, white: c, ratio: im.width / im.height }; IMG[n].frames = n === 'hero' ? walkFrames(im) : [im, squashFrame(im)]; IMG[n].whites = IMG[n].frames.map(whiteOf); res();
    };
    im.onerror = () => { IMG[n] = null; res(); };
    im.src = `img/${n}.png`;
  })));
}

/* ───── 소리와 진동: 옛날 게임기처럼 펄스파·삼각파·잡음으로만 만들어요 ───── */
let ac, bus, mbus, noiseBuf; const PW = {};
function audio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)(); const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    bus = ac.createGain(); bus.gain.value = 0.8; bus.connect(comp); mbus = ac.createGain(); mbus.gain.value = S.music === false ? 0 : 0.32; mbus.connect(comp); comp.connect(ac.destination);
    for (const d of [0.125, 0.25, 0.5]) { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * d); PW[d] = ac.createPeriodicWave(re, im); }
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function setWave(osc, type) { if (type === 'p12' || type === 'p25' || type === 'p50') { osc.setPeriodicWave(PW[{ p12: 0.125, p25: 0.25, p50: 0.5 }[type]]); return 0.42; } osc.type = type; return type === 'square' || type === 'sawtooth' ? 0.42 : 1; }
function voice(f, d, o = {}) {
  const a = audio(), t0 = o.t != null ? o.t : a.currentTime + (o.at || 0), osc = a.createOscillator(), g = a.createGain(), k = setWave(osc, o.type || 'p25'), v = (o.vol || 0.1) * k;
  osc.frequency.setValueAtTime(f, t0); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + d);
  if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 6; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(osc.frequency); l.start(t0 + 0.12); l.stop(t0 + d + 0.05); }
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.004);
  if (o.sus) { g.gain.setValueAtTime(v, t0 + d * 0.7); } g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  osc.connect(g); g.connect(o.music ? mbus : bus); osc.start(t0); osc.stop(t0 + d + 0.05);
}
function hiss(d, o = {}) {
  const a = audio(), t0 = o.t != null ? o.t : a.currentTime + (o.at || 0);
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch = noiseBuf.getChannelData(0); let v = 0; for (let i = 0; i < ch.length; i++) { if (i % 3 === 0) v = Math.random() * 2 - 1; ch[i] = v; } }
  const src = a.createBufferSource(), flt = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf; src.loop = true; flt.type = o.type || 'bandpass'; flt.Q.value = o.q || 0.8; flt.frequency.setValueAtTime(o.f || 3000, t0);
  if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(flt); flt.connect(g); g.connect(o.music ? mbus : bus); src.start(t0, Math.random() * 0.5); src.stop(t0 + d + 0.05);
}
const bell = (f, d, vol = 0.08, at = 0) => { voice(f, d, { vol, at, type: 'p25' }); voice(f * 2, d * 0.5, { vol: vol * 0.3, at: at + 0.01, type: 'p12' }); };
const arp = (fs, step, d, vol, type = 'p25', at = 0) => fs.forEach((f, i) => voice(f, d, { vol, type, at: at + i * step }));
let headless = false;                         // 테스트용 빠른 진행에서는 소리와 연출을 건너뛰어요
const lastPlayed = {};
function play(name, fn, gap = 0) {
  if (headless || S.muted) return;
  const now = performance.now(); if (gap && now - (lastPlayed[name] || 0) < gap) return; lastPlayed[name] = now;
  try { fn(); } catch (e) { if (window.__soundDebug) throw e; }
}
function buzz(p) { if (headless || !S.vib || !navigator.vibrate) return; try { navigator.vibrate(p); } catch (e) {} }
const sfx = {
  /* 때리는 소리: 짧은 잡음 + 아래로 떨어지는 펄스 = 퍽! */
  hit() { play('hit', () => { const k = rand(0.85, 1.2); hiss(.04, { f: 2800 * k, q: 1.2, vol: .1 }); voice(420 * k, .06, { to: 110, type: 'p50', vol: .12 }); voice(90, .05, { to: 45, type: 'triangle', vol: .22 }); }, 38); },
  crit() { play('crit', () => { hiss(.07, { type: 'highpass', f: 3500, vol: .12 }); voice(1400, .05, { to: 2400, type: 'p12', vol: .09 }); voice(150, .14, { to: 40, type: 'triangle', vol: .3 }); voice(600, .1, { to: 120, type: 'p50', vol: .1, at: .02 }); }, 60); buzz(12); },
  kill(type) { play('kill', () => {
    const k = rand(0.92, 1.1);
    if (type === 'cookie') { hiss(.1, { f: 1300, q: 2, vol: .16 }); hiss(.06, { f: 600, q: 3, vol: .12, at: .04 }); voice(180 * k, .12, { to: 50, type: 'triangle', vol: .28 }); }                  // 와삭
    else if (type === 'ice') { voice(1700 * k, .1, { to: 900, type: 'p12', vol: .08 }); voice(2300 * k, .08, { type: 'p12', vol: .05, at: .04 }); hiss(.08, { type: 'highpass', f: 5000, vol: .09 }); voice(100, .08, { to: 45, type: 'triangle', vol: .2 }); }  // 쨍그랑
    else { voice(520 * k, .12, { to: 70, type: 'p50', vol: .13 }); hiss(.07, { type: 'lowpass', f: 1400, to: 300, vol: .14 }); voice(110, .1, { to: 40, type: 'triangle', vol: .26 }); }  // 뿅 철퍽
  }, 42); buzz(8); },
  bigKill() { play('bigKill', () => { voice(110, .8, { to: 30, type: 'triangle', vol: .38 }); hiss(.7, { type: 'lowpass', f: 3200, to: 120, vol: .26 }); hiss(.25, { f: 900, q: 1, vol: .14, at: .05 }); arp([523, 659, 784, 1047, 1319, 1568], .06, .3, .08, 'p25', .2); }); buzz([30, 30, 90]); },
  gem(k = 0) { play('gem', () => { const f = 988 * Math.pow(2, Math.min(k, 12) / 12); voice(f, .05, { type: 'p25', vol: .06 }); voice(f * 1.5, .06, { type: 'p12', vol: .04, at: .035 }); }, 32); },
  swing() { play('swing', () => { hiss(.1, { f: 700, to: 3200, q: 1.5, vol: .1 }); voice(260, .08, { to: 520, type: 'p12', vol: .04 }); }, 80); },
  shot() { play('shot', () => voice(760 + rand(-60, 60), .045, { to: 1500, type: 'p12', vol: .06 }), 85); },
  hurt() { play('hurt', () => { voice(330, .1, { to: 160, type: 'p50', vol: .16 }); voice(250, .12, { to: 110, type: 'p50', vol: .14, at: .09 }); voice(120, .35, { to: 35, type: 'triangle', vol: .32 }); hiss(.25, { type: 'lowpass', f: 2200, to: 200, vol: .2 }); }); buzz([70, 40, 50]); },
  block() { play('block', () => { arp([1568, 2093], .05, .18, .08, 'p12'); hiss(.05, { type: 'highpass', f: 6000, vol: .08 }); }); buzz(20); },
  level() { play('level', () => { voice(196, .45, { to: 784, type: 'p50', vol: .07 }); hiss(.45, { f: 500, to: 7000, vol: .07 }); arp([523, 659, 784, 1047, 1319, 1568, 2093], .05, .22, .08, 'p25', .3); voice(65, .5, { to: 40, type: 'triangle', vol: .3, at: .3 }); }); buzz([15, 30, 25, 30, 60]); },
  warn() { play('warn', () => { voice(880, .09, { type: 'p50', vol: .07 }); voice(660, .09, { type: 'p50', vol: .07, at: .12 }); }, 300); },
  slam() { play('slam', () => { voice(140, .5, { to: 30, type: 'triangle', vol: .38 }); hiss(.4, { type: 'lowpass', f: 2400, to: 150, vol: .24 }); }); buzz(60); },
  boss() { play('boss', () => { [98, 92, 87, 82].forEach((f, i) => voice(f, .3, { type: 'p50', vol: .1, at: i * .22 })); voice(55, 1.1, { to: 41, type: 'triangle', vol: .32 }); hiss(1, { type: 'lowpass', f: 300, to: 1800, vol: .12 }); }); buzz(120); },
  revive() { play('revive', () => arp([392, 523, 659, 784, 1047, 1319], .07, .3, .08, 'p25')); buzz([40, 40, 80]); },
  flip() { play('flip', () => { hiss(.07, { f: 1500, to: 5000, vol: .08 }); voice(1200, .04, { to: 1800, type: 'p12', vol: .05, at: .05 }); }, 60); buzz(6); },
  rare() { play('rare', () => { arp([1047, 1319, 1568, 2093, 2637], .05, .3, .07, 'p12'); hiss(.3, { type: 'highpass', f: 7000, vol: .05 }); }); buzz([10, 20, 30]); },
  coinTick() { play('coinTick', () => { voice(1976, .04, { type: 'p25', vol: .05 }); voice(2637, .1, { type: 'p25', vol: .05, at: .04 }); }, 45); },
  fanfare() { play('fanfare', () => { arp([523, 523, 523], .1, .09, .1, 'p25'); voice(698, .12, { type: 'p25', vol: .1, at: .32 }); voice(784, .12, { type: 'p25', vol: .1, at: .44 }); voice(1047, .6, { type: 'p25', vol: .1, at: .56, vib: 1, sus: 1 }); [262, 330, 392].forEach((f, i) => voice(f, .7, { type: 'triangle', vol: .12, at: .56 })); hiss(.4, { type: 'highpass', f: 6000, vol: .05, at: .56 }); }); buzz([20, 30, 20, 30, 80]); },
  magnet() { play('magnet', () => { voice(300, .5, { to: 1200, type: 'p25', vol: .08 }); arp([784, 988, 1175, 1568], .05, .15, .06, 'p12', .3); hiss(.4, { f: 800, to: 5000, vol: .06 }); }); buzz([20, 20, 40]); },
  zap() { play('zap', () => { hiss(.12, { type: 'highpass', f: 3000, to: 8000, vol: .1 }); voice(1800, .1, { to: 300, type: 'p12', vol: .08 }); voice(120, .08, { to: 50, type: 'triangle', vol: .18 }); }, 90); },
  boom() { play('boom', () => { hiss(.25, { type: 'lowpass', f: 2200, to: 150, vol: .2 }); voice(120, .22, { to: 35, type: 'triangle', vol: .32 }); }, 60); buzz(10); },
  thud() { play('thud', () => { voice(600, .06, { to: 200, type: 'p25', vol: .08 }); voice(140, .16, { to: 40, type: 'triangle', vol: .3 }); hiss(.1, { f: 1200, vol: .12 }); }, 60); },
  tap() { play('tap', () => voice(880, .035, { to: 1320, type: 'p25', vol: .06 })); buzz(6); },
  coin() { play('coin', () => { voice(1976, .06, { type: 'p25', vol: .07 }); voice(2637, .25, { type: 'p25', vol: .07, at: .06 }); }); },
  good() { play('good', () => arp([784, 988, 1175, 1568], .055, .16, .07, 'p25')); buzz([15, 30, 30]); },
  no() { play('no', () => { voice(220, .08, { type: 'p50', vol: .08 }); voice(165, .12, { type: 'p50', vol: .08, at: .09 }); }); },
  win() { play('win', () => { arp([523, 659, 784, 1047], .1, .2, .1, 'p25'); voice(1047, .8, { type: 'p25', vol: .09, at: .42, vib: 1, sus: 1 }); voice(262, .9, { type: 'triangle', vol: .14, at: .42 }); }); buzz([20, 40, 20, 40, 60]); },
  lose() { play('lose', () => { [392, 370, 349, 330].forEach((f, i) => voice(f, .28, { type: 'p50', vol: .08, at: i * .2 })); voice(165, .8, { to: 82, type: 'triangle', vol: .16, at: .8 }); }); buzz([60, 40, 60]); }
};

/* ───── 배경음악: 직접 쓴 짧은 곡 3개를 16분음표 단위로 미리 예약해서 연주해요 ───── */
const NOTE = n => { const m = /^([A-G])(#?)(\d)$/.exec(n); return 440 * Math.pow(2, ({ C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0) + (m[3] - 4) * 12) / 12); };
const seq = s => s.replace(/\|/g, ' ').trim().split(/\s+/);      // 음 이름, '.' 쉼, '-' 이어서
const CH = { C: ['C3', 'E4', 'G4', 'C5'], Am: ['A2', 'C4', 'E4', 'A4'], F: ['F2', 'A3', 'C4', 'F4'], G: ['G2', 'B3', 'D4', 'G4'], Em: ['E2', 'G3', 'B3', 'E4'], E: ['E2', 'G#3', 'B3', 'E4'], Dm: ['D2', 'F3', 'A3', 'D4'] };
const SONGS = {
  /* 지도와 제목: 느긋한 오후 산책 */
  map: { bpm: 92, chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'], drums: 'calm',
    lead: seq(`A5 - - - C6 - A5 - G5 - - - F5 - - - | G5 - - - B5 - D6 - C6 - B5 - G5 - - - | E5 - - - G5 - B5 - A5 - G5 - E5 - - - | A5 - - - C6 - E6 - D6 - C6 - A5 - - -
               F5 - A5 - C6 - - - A5 - G5 - F5 - . . | G5 - B5 - D6 - - - C6 - B5 - G5 - . . | E5 - G5 - C6 - - - D6 - E6 - - - - - | C6 - - - - - - - . . . . . . . .`) },
  /* 전투: 신나는 행진 */
  battle: { bpm: 150, chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'], drums: 'beat',
    lead: seq(`E5 . G5 . C6 . G5 . E5 . G5 . A5 G5 E5 . | C5 . E5 . A5 . E5 . C6 . B5 . A5 . G5 . | A5 . C6 . F5 . A5 . C6 . D6 . C6 . A5 . | B5 . D6 . G5 . B5 . D6 - - - . . . .
               G5 - E5 - C5 . E5 G5 C6 - - . G5 . E5 . | A5 - E5 - C5 . E5 A5 C6 - B5 - A5 . E5 . | F5 . A5 . C6 . A5 . D6 - C6 - A5 . F5 . | G5 . B5 . D6 . F6 . E6 - D6 - B5 - G5 .`) },
  /* 보스: 긴박한 단조 */
  boss: { bpm: 164, chords: ['Am', 'F', 'G', 'E', 'Am', 'F', 'Dm', 'E'], drums: 'drive',
    lead: seq(`A4 . A4 . C5 . A4 . E5 . D5 . C5 . B4 . | A4 . A4 . C5 . F5 . E5 - D5 - C5 . A4 . | B4 . B4 . D5 . G5 . F5 - E5 - D5 . B4 . | G#4 . B4 . E5 . G#5 . B5 - - - A5 - G#5 -
               A5 . E5 . C5 . E5 . A5 . B5 . C6 . B5 . | A5 . F5 . C5 . F5 . A5 - G5 - F5 . E5 . | F5 . D5 . A4 . D5 . F5 - E5 - D5 . F5 . | E5 - - - G#5 - - - B5 - - - E6 - - -`) }
};
const MUS = { cur: null, step: 0, next: 0, timer: 0 };
function music(name) {
  if (MUS.cur === name) return; MUS.cur = name; MUS.step = 0; MUS.next = 0;
  if (!MUS.timer) MUS.timer = setInterval(musicTick, 30);
}
function musicTick() {
  if (!MUS.cur || headless || !ac || S.muted || S.music === false || document.hidden) { MUS.next = 0; return; }
  const song = SONGS[MUS.cur], t16 = 60 / song.bpm / 4, now = ac.currentTime; if (!MUS.next || MUS.next < now - 0.2) MUS.next = now + 0.06;
  while (MUS.next < now + 0.14) {
    const i = MUS.step % song.lead.length, bar = Math.floor(i / 16), pos = i % 16, ch = CH[song.chords[bar % song.chords.length]], t = MUS.next;
    /* 멜로디 */
    const n = song.lead[i]; if (n !== '.' && n !== '-') { let len = 1; while (song.lead[(i + len) % song.lead.length] === '-') len++; voice(NOTE(n), t16 * len * 0.95, { t, type: song.drums === 'calm' ? 'p50' : 'p25', vol: song.drums === 'calm' ? 0.07 : 0.085, music: 1, sus: 1, vib: len >= 4 }); }
    /* 반주: 화음을 쪼개서 빠르게 (아르페지오) */
    if (song.drums === 'calm') { if (pos % 2 === 0) voice(NOTE(ch[1 + (pos / 2) % 3]), t16 * 1.8, { t, type: 'p12', vol: 0.035, music: 1 }); }
    else voice(NOTE(ch[1 + pos % 3]) * 2, t16 * 0.9, { t, type: 'p12', vol: 0.022, music: 1 });
    /* 베이스: 삼각파 */
    const root = NOTE(ch[0]);
    if (song.drums === 'calm') { if (pos % 8 === 0) voice(root, t16 * 7.5, { t, type: 'triangle', vol: 0.16, music: 1, sus: 1 }); }
    else if (song.drums === 'beat') { if (pos % 2 === 0) voice(pos % 4 === 0 ? root : root * 2, t16 * 1.6, { t, type: 'triangle', vol: 0.17, music: 1, sus: 1 }); }
    else voice(pos % 2 ? root * 2 : root, t16 * 0.9, { t, type: 'triangle', vol: 0.17, music: 1, sus: 1 });
    /* 북: 킥은 삼각파가 뚝 떨어지는 소리, 스네어와 하이햇은 잡음 */
    const kick = () => voice(150, 0.12, { t, to: 40, type: 'triangle', vol: 0.32, music: 1 }), snare = () => hiss(0.12, { t, f: 1800, q: 0.7, vol: 0.12, music: 1 }), hat = v => hiss(0.03, { t, type: 'highpass', f: 7000, vol: v, music: 1 });
    if (song.drums === 'calm') { if (pos === 0) kick(); if (pos % 4 === 2) hat(0.03); }
    else if (song.drums === 'beat') { if (pos === 0 || pos === 8 || pos === 10) kick(); if (pos === 4 || pos === 12) snare(); if (pos % 2 === 0) hat(0.04); }
    else { if (pos % 4 === 0) kick(); if (pos === 4 || pos === 12) snare(); hat(pos % 2 ? 0.025 : 0.045); if (pos === 14 && bar % 2) snare(); }
    MUS.next += t16; MUS.step++;
  }
}
const setMusicVol = () => { if (mbus) mbus.gain.setTargetAtTime(S.muted || S.music === false ? 0 : 0.32, ac.currentTime, 0.05); };

/* ───── 카드 ───── */
const ICON = {
  pin: `<rect x="14" y="40" width="72" height="20" rx="10" fill="#D9A066" transform="rotate(-35 50 50)"/><rect x="2" y="45" width="18" height="10" rx="5" fill="#B9783F" transform="rotate(-35 50 50)"/><rect x="80" y="45" width="18" height="10" rx="5" fill="#B9783F" transform="rotate(-35 50 50)"/>`,
  cream: `<path d="M50 12C62 26 78 30 78 50C78 68 66 84 50 84C34 84 22 68 22 50C22 38 34 34 40 24C44 32 50 30 50 12Z" fill="#FFFFFF" stroke="#E3B7C6" stroke-width="4"/>`,
  star: `<path d="M50 10L61 38L91 40L68 59L76 88L50 72L24 88L32 59L9 40L39 38Z" fill="#FFC83D" stroke="#E0A000" stroke-width="3" stroke-linejoin="round"/>`,
  macaron: `<ellipse cx="50" cy="36" rx="34" ry="18" fill="#FF8FB8"/><rect x="18" y="44" width="64" height="12" fill="#FFF3E0"/><ellipse cx="50" cy="64" rx="34" ry="18" fill="#FF8FB8"/>`,
  honey: `<path d="M50 10C66 34 78 46 78 62C78 78 66 90 50 90C34 90 22 78 22 62C22 46 34 34 50 10Z" fill="#F7B733" stroke="#C88A0C" stroke-width="4"/>`,
  lemon: `<ellipse cx="50" cy="50" rx="36" ry="27" fill="#F4E04D" stroke="#B9B21E" stroke-width="4"/><path d="M14 50L4 50M86 50L96 50" stroke="#B9B21E" stroke-width="6" stroke-linecap="round"/>`,
  skewer: `<path d="M14 86L88 12" stroke="#B9783F" stroke-width="5" stroke-linecap="round"/><circle cx="36" cy="64" r="13" fill="#E8323C"/><circle cx="54" cy="46" r="13" fill="#B9DD52"/><circle cx="72" cy="28" r="13" fill="#FF9A1F"/>`,
  hands: `<circle cx="36" cy="54" r="20" fill="#FFD9C2" stroke="#C98E74" stroke-width="4"/><path d="M62 30V58M48 44H76" stroke="#FF4F86" stroke-width="9" stroke-linecap="round"/>`,
  sour: `<circle cx="38" cy="58" r="22" fill="#C8F06A" stroke="#7FA81E" stroke-width="4"/><circle cx="68" cy="34" r="13" fill="#C8F06A" stroke="#7FA81E" stroke-width="4"/><circle cx="74" cy="70" r="8" fill="#C8F06A" stroke="#7FA81E" stroke-width="3"/>`,
  dough: `<path d="M50 86C20 64 10 48 10 34C10 20 21 12 32 12C41 12 47 17 50 23C53 17 59 12 68 12C79 12 90 20 90 34C90 48 80 64 50 86Z" fill="#FF6B8E"/>`,
  magnet: `<path d="M22 20V54A28 28 0 0 0 78 54V20H60V54A10 10 0 0 1 40 54V20Z" fill="#E8323C"/><rect x="22" y="14" width="18" height="14" fill="#DDE3EA"/><rect x="60" y="14" width="18" height="14" fill="#DDE3EA"/>`,
  glove: `<path d="M30 90V52C22 46 18 36 26 30C32 26 38 32 38 40V22C38 12 62 10 62 22V28C74 26 80 34 78 46V90Z" fill="#FF9A5C" stroke="#C9642A" stroke-width="4"/>`,
  heart: `<path d="M50 86C20 64 10 48 10 34C10 20 21 12 32 12C41 12 47 17 50 23C53 17 59 12 68 12C79 12 90 20 90 34C90 48 80 64 50 86Z" fill="#E0445A"/>`,
  coin: `<circle cx="50" cy="50" r="38" fill="#FFC83D" stroke="#C88A0C" stroke-width="6"/><path d="M50 30V70M38 40H58A8 8 0 0 1 58 56H40" fill="none" stroke="#C88A0C" stroke-width="7" stroke-linecap="round"/>`,
  cocoa: `<path d="M20 34H70V66A20 20 0 0 1 50 86H40A20 20 0 0 1 20 66Z" fill="#FFFFFF" stroke="#4A2040" stroke-width="5"/><path d="M70 42H80A10 10 0 0 1 80 62H70" fill="none" stroke="#4A2040" stroke-width="5"/><path d="M34 22Q30 14 36 8M52 22Q48 14 54 8" fill="none" stroke="#8A5F7C" stroke-width="4" stroke-linecap="round"/><rect x="24" y="38" width="42" height="12" fill="#8B5A3C"/>`,
  shop: `<path d="M14 40L22 16H78L86 40Z" fill="#FF8FB8"/><rect x="18" y="40" width="64" height="46" fill="#FFF3E0" stroke="#4A2040" stroke-width="4"/><rect x="42" y="56" width="18" height="30" fill="#B9783F"/>`,
  rest: `<path d="M12 78H88" stroke="#4A2040" stroke-width="6" stroke-linecap="round"/><path d="M24 78V50A26 26 0 0 1 76 50V78Z" fill="#FFF3E0" stroke="#4A2040" stroke-width="4"/><path d="M40 30Q36 20 42 12M58 30Q54 20 60 12" fill="none" stroke="#8A5F7C" stroke-width="4" stroke-linecap="round"/>`,
  event: `<circle cx="50" cy="50" r="38" fill="#C9B6FF"/><path d="M38 40A12 12 0 1 1 54 52C50 54 50 58 50 62" fill="none" stroke="#4A2040" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="76" r="4.5" fill="#4A2040"/>`,
  chest: `<rect x="14" y="40" width="72" height="44" rx="6" fill="#D9A066" stroke="#4A2040" stroke-width="4"/><path d="M14 44A36 30 0 0 1 86 44Z" fill="#E9B878" stroke="#4A2040" stroke-width="4"/><rect x="43" y="46" width="14" height="18" rx="3" fill="#FFC83D" stroke="#4A2040" stroke-width="3"/>`,
  ench: `<path d="M50 8L60 40L92 50L60 60L50 92L40 60L8 50L40 40Z" fill="#B58CFF" stroke="#6A3FC0" stroke-width="3" stroke-linejoin="round"/>`,
  choco: `<circle cx="48" cy="58" r="32" fill="#6B3A1E" stroke="#3B1C0A" stroke-width="5"/><circle cx="36" cy="46" r="9" fill="#A0663C"/><path d="M64 30Q72 14 86 16" stroke="#FFD23F" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="88" cy="14" r="6" fill="#FF6B3D"/>`,
  cotton: `<path d="M20 58a16 16 0 0 1 8-30a20 20 0 0 1 38-4a16 16 0 0 1 14 34Z" fill="#FFB3D9" stroke="#C2507E" stroke-width="4"/><path d="M52 52L40 74H54L46 96L70 66H56L64 52Z" fill="#FFE45C" stroke="#B5651D" stroke-width="3" stroke-linejoin="round"/>`,
  cane: `<path d="M40 94V40a16 16 0 0 1 32 0v8" fill="none" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round"/><path d="M40 94V40a16 16 0 0 1 32 0v8" fill="none" stroke="#E8323C" stroke-width="14" stroke-dasharray="9 9"/>`,
  cup: `<path d="M22 28H78L70 86H30Z" fill="#DDF0FF" stroke="#2F74C0" stroke-width="5" stroke-linejoin="round"/><path d="M28 50H72M30 66H70" stroke="#2F74C0" stroke-width="4"/>`
};
/* ───── 무기 10가지: 레벨이 오를 때마다 투사체가 1개씩 늘어요. Lv5와 Lv10에 특별한 힘 ───── */
const WMAX = 10;
const WEAPONS = {
  pin: { name: '롤링핀', desc: '가까운 적 쪽으로 롤링핀을 크게 휘둘러요.', more: '휘두르는 방향이 1개 늘어요.', s5: '휘두르는 범위가 넓어지고 적을 더 멀리 밀쳐요.', s10: '한 바퀴 빙 돌며 휘두르고 충격파가 퍼져요.' },
  cream: { name: '휘핑크림', desc: '가장 가까운 적에게 크림을 쏴요.', more: '크림이 1발 늘어요.', s5: '맞은 자리에 크림 웅덩이가 생겨 적이 느려져요.', s10: '크림이 커지고 적을 전부 꿰뚫어요.' },
  star: { name: '별사탕', desc: '움직이는 방향으로 별사탕을 흩뿌려요.', more: '별사탕이 1알 늘어요.', s5: '별사탕이 옆 적으로 1번 튕겨요.', s10: '사방으로 흩뿌리고 3번까지 튕겨요.' },
  macaron: { name: '마카롱', desc: '마카롱이 몸 주위를 돌며 부딪혀요.', more: '마카롱이 1개 늘어요.', s5: '더 넓게, 더 빠르게 돌아요.', s10: '2초마다 마카롱이 한꺼번에 터져요.' },
  honey: { name: '꿀 장판', desc: '꿀을 깔아 적을 느리게 하고 다치게 해요.', more: '장판이 1개 늘어요.', s5: '장판이 넓어지고 오래가요.', s10: '커다란 꿀 웅덩이가 나를 따라다녀요.' },
  lemon: { name: '레몬즙', desc: '가까운 적에게 쏴서 산성을 쌓아요. 산성은 계속 피해를 줘요.', more: '물총이 1발 늘어요.', s5: '산성이 2배로 쌓여요.', s10: '산성 쌓인 적이 죽으면 터지며 주변에 옮아요.' },
  skewer: { name: '탕후루 꼬치', desc: '가까운 적 쪽으로 적을 전부 꿰뚫는 꼬치를 던져요.', more: '꼬치가 1개 늘어요.', s5: '더 빠르고 멀리 날아가요.', s10: '꼬치가 부메랑처럼 돌아오며 또 꿰뚫어요.' },
  choco: { name: '초코 폭탄', desc: '근처 적에게 초코볼을 던져 터뜨려요.', more: '폭탄이 1개 늘어요.', s5: '폭발 범위가 넓어져요.', s10: '터질 때 작은 초코볼 3개가 더 튀어 터져요.' },
  cotton: { name: '솜사탕 번개', desc: '가까운 적에게 번개가 치고 옆 적으로 이어져요.', more: '번개 줄기가 1개 늘어요.', s5: '번개가 2마리 더 이어져요.', s10: '번개가 자주 치고 맞은 적이 잠깐 멈춰요.' },
  cane: { name: '지팡이 사탕', desc: '하늘에서 지팡이 사탕이 떨어져 주변 적을 내리쳐요.', more: '사탕이 1개 더 떨어져요.', s5: '내리치는 범위가 넓어져요.', s10: '떨어진 자리에서 별 파편이 사방으로 튀어요.' }
};
const STATS = {
  spd: { name: '이동 속도 +5%', icon: 'honey' },
  dmg: { name: '공격력 +10%', icon: 'star' },
  crit: { name: '치명타 확률 +5%', icon: 'ench' }
};
const RELICS = {
  cape: { name: '슈크림 망토', desc: '하트가 1칸 남으면 더 빨리 달려요.', icon: 'cream' },
  whisk: { name: '황금 거품기', desc: '주는 피해가 15% 늘어요.', icon: 'star' },
  cup: { name: '계량컵', desc: '경험치를 25% 더 얻어요.', icon: 'ench' },
  boots: { name: '버터 장화', desc: '이동 속도가 12% 빨라져요.', icon: 'honey' },
  apron: { name: '두꺼운 앞치마', desc: '최대 하트가 1칸 늘어요.', icon: 'dough' },
  fortune: { name: '행운의 쿠키', desc: '골드를 30% 더 얻어요.', icon: 'coin' },
  icepack: { name: '얼음 주머니', desc: '휴식처에서 하트를 1칸 더 채워요.', icon: 'rest' },
  sprinkle: { name: '스프링클 통', desc: '레벨이 오르면 주변 적에게 피해를 줘요.', icon: 'sour' },
  jar: { name: '꿀단지', desc: '엘리트 전투를 이기면 하트를 1칸 더 채워요.', icon: 'honey' },
  cloud: { name: '솜사탕 구름', desc: '전투마다 처음 맞는 공격 한 번을 막아 줘요.', icon: 'cream' }
};
const HERO_R = 6.5;              // 주인공이 맞는 범위 (몸 크기보다 작게)
const wLv = id => { const w = run.wpn.find(x => x.id === id); return w ? w.lv : 0; };
const wDescFull = id => { const W = WEAPONS[id]; return `${W.desc} Lv5: ${W.s5} Lv10: ${W.s10}`; };
function wOpt(id, i, o = {}) {      // 무기 선택 줄
  const W = WEAPONS[id], lv = wLv(id), nx = lv + 1, sp = nx === 5 ? W.s5 : nx === 10 ? W.s10 : '';
  const title = lv ? `${W.name} Lv${lv} → Lv${nx}${nx === 5 || nx === 10 ? ' ★' : ''}` : `새 무기: ${W.name}`;
  const desc = lv ? (sp ? `특별 효과! ${sp} ${W.more}` : W.more) : wDescFull(id);
  return `<button class="opt${nx === 10 ? ' r2' : nx === 5 ? ' r1' : ''}" type="button" data-act="${o.act || 'pick'}" data-i="${i}"${o.off ? ' aria-disabled="true"' : ''}><span class="ic">${svg(ICON[id])}</span><span class="tx"><b>${title}</b><span>${desc}</span></span>${o.price != null ? `<em>${o.price}골드</em>` : ''}</button>`;
}
function rollRelic() { const pool = Object.keys(RELICS).filter(id => id !== 'cape' && !run.relics.includes(id)); return pool.length ? pick(pool) : null; }
function gainRelic(id) { run.relics.push(id); if (id === 'apron') { run.maxHp += 1; run.hp += 1; } }
const HEART_EMPTY = `<path d="M50 86C20 64 10 48 10 34C10 20 21 12 32 12C41 12 47 17 50 23C53 17 59 12 68 12C79 12 90 20 90 34C90 48 80 64 50 86Z" fill="#4A2A4A"/>`;
const heartsHtml = (hp, max) => Array.from({ length: max }, (_, i) => `<i class="hrt${i < hp ? '' : ' off'}">${svg(i < hp ? ICON.heart : HEART_EMPTY)}</i>`).join('');
const has = id => run.relics.includes(id);
const goldGain = n => Math.round(n * (has('fortune') ? 1.3 : 1));

/* ───── 적 ───── */
const FOES = {
  jelly: { img: 'jelly', hp: 14, spd: 68, dmg: 7, r: 15, h: 48, xp: 1 },
  ice: { img: 'ice', hp: 9, spd: 118, dmg: 5, r: 12, h: 56, xp: 1 },
  cookie: { img: 'cookie', hp: 36, spd: 50, dmg: 11, r: 17, h: 56, xp: 2 },
  donut: { img: 'donut', hp: 520, spd: 78, dmg: 16, r: 28, h: 88, xp: 12, name: '딱딱 도넛 기사' },
  boss: { img: 'boss', hp: 1700, spd: 34, dmg: 20, r: 56, h: 152, xp: 0, name: '곰팡이 케이크' }
};

/* ═════ 전투 ═════ */
let B = null;                    // 지금 전투
const cv = $('#cv'), ctx = cv.getContext('2d'), cv2 = $('#cv2'), tx = cv2.getContext('2d');
let vw = 390, vh = 780, PXS = 2, PZ = 2, ZOOM = 1, lw = 195, lh = 390;      // PXS: 픽셀 한 칸의 화면 크기, PZ: 줌을 적용한 크기, lw·lh: 낮은 해상도 화면 크기
function resize() {
  const w = window.innerWidth, h = window.innerHeight, d = Math.min(2, window.devicePixelRatio || 1);
  PXS = Math.max(2, Math.round(w / 195)); PZ = PXS * ZOOM; lw = Math.ceil(w / PZ); lh = Math.ceil(h / PZ);
  if (cv.width !== lw || cv.height !== lh) { cv.width = lw; cv.height = lh; } cv.style.width = lw * PZ + 'px'; cv.style.height = lh * PZ + 'px'; ctx.imageSmoothingEnabled = false;
  vw = lw * 2; vh = lh * 2; cv2.width = Math.round(w * d); cv2.height = Math.round(h * d);
}
addEventListener('resize', resize);

function battleStats() {
  const b = run.bonus || { spd: 0, dmg: 0, crit: 0 };
  return {
    dmg: (has('whisk') ? 1.15 : 1) * (1 + 0.1 * b.dmg) * (1 + 0.05 * M('atk')),
    crit: 0.05 + 0.05 * b.crit + 0.03 * M('crit'), critMul: 1.8 + 0.25 * M('critd'),
    spd: (has('boots') ? 1.12 : 1) * (1 + 0.05 * b.spd) * (1 + 0.04 * M('spd')),
    xp: (has('cup') ? 1.25 : 1) * (1 + 0.08 * M('xp')), pickup: 88 * (1 + 0.2 * M('mag')), invK: 1 + 0.15 * M('guard'), area: 1 + 0.08 * M('size')
  };
}
const needOf = lvl => Math.round(4 + 3 * (lvl - 1) + 0.06 * (lvl - 1) ** 2);
function startBattle(kind, floor, onEnd) {
  const st = battleStats(), dur = kind === 'boss' ? 300 : 180;
  B = {
    kind, floor, onEnd, t: 0, dur, st, paused: false, over: false,
    p: { x: 0, y: 0, hp: run.hp, max: run.maxHp, inv: 0, face: 1, dirX: 0, dirY: -1, moving: false, bob: 0, shield: has('cloud') || M('shield') > 0 },
    foes: [], shots: [], foeShots: [], gems: [], zones: [], fx: [], texts: [], telegraphs: [], lobs: [],
    weapons: run.wpn.map(x => ({ id: x.id, lv: x.lv, src: x, cd: 0.3 + Math.random() * 0.6, ang: 0 })),
    lvl: run.lvl, xp: run.xp, need: needOf(run.lvl), kills: 0, spawnAcc: 0, shake: 0, hitstop: 0, hsCool: 0, slow: 0, flashScr: null, heartPop: 0,
    eliteAt: kind === 'elite' ? 90 : -1, bossAt: kind === 'boss' ? 180 : -1, big: null, bigDead: false, joy: null, hudT: -1, hudHp: -1, hudXp: -1
  };
  if (!headless) {
    ZOOM = 1; show('battle'); resize();
    $('#bossBar').hidden = true; $('#potHud').innerHTML = run.potion ? svg(ICON.cocoa) : '';
    toast(kind === 'boss' ? '3분 뒤에 보스가 나타나요' : kind === 'elite' ? '1분 30초 뒤에 엘리트가 나타나요' : '3분만 버텨요!');
    if (window.__dbg.autoAll) B.auto = true;
    last = performance.now(); requestAnimationFrame(frame);
  }
}
let toastTimer = 0;
function toast(t) { if (headless) return; const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { e.hidden = true; }, 2200); }

/* 판이 지날수록(층이 오를수록) 적이 확실히 많아져요: 첫 판 1배 → 보스 판 약 5배 */
const stageMul = () => 0.8 + 0.5 * B.floor;
function spawnFoe(type, x, y) {
  const d = FOES[type], grow = 1 + 0.6 * B.floor + (B.t / 120) * 0.6;
  const big = type === 'donut' || type === 'boss';
  const f = { type, x, y, r: d.r, hp: d.hp * (big ? 1 + 0.12 * B.floor : grow) * DF().hp, spd: d.spd * DF().spd * (0.95 + 0.06 * B.floor), dmg: d.dmg * (1 + 0.1 * B.floor), flash: 0, acid: 0, acidT: 0, slow: 0, hitT: {}, ph: Math.random() * 6.28, st: 0, stT: big ? 3 : 0, vx: 0, vy: 0, kx: 0, ky: 0, sq: 0, born: B.t, dead: false };
  f.max = f.hp; B.foes.push(f); return f;
}
function spawnRing(type) {
  const a = Math.random() * 6.283, R = Math.hypot(vw, vh) / 2 + 40;
  return spawnFoe(type, B.p.x + Math.cos(a) * R, B.p.y + Math.sin(a) * R);
}
function fxAdd(o) { if (!headless && B.fx.length < 260) B.fx.push(o); }
function textAdd(x, y, t, col, big) { if (!headless && B.texts.length < 40) B.texts.push({ x: x + rand(-8, 8), y, vx: rand(-30, 30), vy: -150 - (big ? 40 : 0), t, col: col || '#4A2040', life: big ? 0.8 : 0.6, max: big ? 0.8 : 0.6, big: !!big }); }
/* 부스러기: 중력을 받아 튀었다 떨어져요 */
function burst(x, y, col, n = 6, sp = 150) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = rand(sp * 0.3, sp); fxAdd({ k: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, g: 420, life: rand(0.3, 0.55), max: 0.55, col, r: rand(2, 5) }); } }
/* 맞은 자리에 별 모양 섬광 */
function spark(x, y, a, col = '#FFFFFF', big) { fxAdd({ k: 'flash', x, y, r: big ? 26 : 16, life: 0.09, max: 0.09, col }); for (let i = 0; i < (big ? 6 : 4); i++) { const aa = a + rand(-1.1, 1.1), s = rand(220, 420); fxAdd({ k: 'line', x, y, vx: Math.cos(aa) * s, vy: Math.sin(aa) * s, life: rand(0.1, 0.18), max: 0.18, col, w: big ? 3.5 : 2.5 }); } }
const FOE_COL = { jelly: '#3FCF7A', cookie: '#B9783F', ice: '#9FDBFF', donut: '#FF8FB8', boss: '#C77DFF' };
function hitStop(t) { if (!headless && B.hsCool <= 0) { B.hitstop = Math.max(B.hitstop, t); B.hsCool = 0.12; } }

function hurtFoe(f, d, w, ax, ay, kbm = 1) {
  if (f.dead) return;
  const crit = Math.random() < B.st.crit; if (crit) d *= B.st.critMul;
  d *= B.st.dmg; f.hp -= d; f.flash = 0.08; f.sq = 0.35;
  /* 맞은 방향으로 밀려나요 (큰 적은 조금만) */
  let dx = ax, dy = ay; if (dx == null) { dx = f.x - B.p.x; dy = f.y - B.p.y; } const m = Math.hypot(dx, dy) || 1, kb = (f === B.big ? 40 : 230) * (crit ? 1.5 : 1) * kbm;
  f.kx = dx / m * kb; f.ky = dy / m * kb;
  if (!headless) { const a = Math.atan2(dy, dx); spark(f.x - dx / m * f.r * 0.5, f.y - FOES[f.type].h * 0.35 - dy / m * f.r * 0.3, a, crit ? '#FFE066' : '#FFFFFF', crit); }
  textAdd(f.x, f.y - FOES[f.type].h * 0.8, Math.round(d) + (crit ? '!' : ''), crit ? '#FF9A1F' : '#4A2040', crit);
  if (crit) { sfx.crit(); hitStop(0.06); B.shake = Math.max(B.shake, 0.08); fxAdd({ k: 'slash', x: f.x, y: f.y - FOES[f.type].h * 0.4, a: Math.atan2(dy, dx), life: 0.16, max: 0.16 }); } else { sfx.hit(); if (f.hp > 0) hitStop(0.012); }
  if (f.hp <= 0) killFoe(f, w);
}
function killFoe(f, w) {
  f.dead = true; B.kills++;
  const d = FOES[f.type], col = FOE_COL[f.type], big = f === B.big;
  if (!big && !B.magnet && Math.random() < 1 / 90) B.magnet = { x: f.x, y: f.y, ph: 0 };      // 가끔 자석을 떨어뜨려요
  if (big && !B.magnet) B.magnet = { x: f.x + 20, y: f.y, ph: 0 };
  if (d.xp) { const n = big ? 6 : 1; for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = big ? rand(60, 160) : rand(20, 60); B.gems.push({ x: f.x, y: f.y, v: big ? Math.ceil(d.xp / n) + 1 : d.xp, pull: false, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, z: 4, vz: rand(150, 230), ph: Math.random() * 6.28, px: f.x, py: f.y }); } }
  burst(f.x, f.y - d.h * 0.3, col, big ? 40 : 10, big ? 320 : 190); burst(f.x, f.y - d.h * 0.3, '#FFFFFF', big ? 14 : 4, 120);
  fxAdd({ k: 'ghost', img: d.img, x: f.x, y: f.y + f.r * 0.7, h: d.h, flip: f.x > B.p.x ? -1 : 1, life: big ? 0.5 : 0.2, max: big ? 0.5 : 0.2 });
  fxAdd({ k: 'ring', x: f.x, y: f.y - d.h * 0.3, r: f.r * 0.6, to: f.r * (big ? 5 : 2.6), life: big ? 0.45 : 0.22, max: big ? 0.45 : 0.22, col: big ? '#FFC83D' : '#FFFFFF', w: big ? 8 : 4 });
  fxAdd({ k: 'pop', x: f.x, y: f.y - d.h * 0.35, r: big ? 30 : 12, life: big ? 0.35 : 0.2, max: big ? 0.35 : 0.2, col: col });
  if (big) { sfx.bigKill(); B.hitstop = 0.18; B.slow = 0.6; B.shake = 0.6; B.flashScr = { col: '255,255,255', t: 0.25, max: 0.25 }; }
  else { sfx.kill(f.type); hitStop(f.type === 'cookie' ? 0.035 : 0.02); B.shake = Math.max(B.shake, f.type === 'cookie' ? 0.1 : 0.05); }
  if (f.acid > 0 && B.weapons.some(x => x.id === 'lemon' && x.lv >= 10)) {   // 레몬 각성: 산성 폭발이 옮아요
    for (const g of B.foes) if (!g.dead && g !== f && (g.x - f.x) ** 2 + (g.y - f.y) ** 2 < 80 * 80) { g.acid += 4; g.flash = 0.06; }
    fxAdd({ k: 'ring', x: f.x, y: f.y - d.h * 0.3, r: 10, to: 80, life: 0.3, max: 0.3, col: '#B9DD52', w: 6 }); burst(f.x, f.y - d.h * 0.3, '#C8F06A', 8, 160);
  }
  if (big) { B.bigDead = true; if (B.kind === 'boss') endBattle(true); else toast('엘리트를 잡았어요!'); }
}
/* 하트 3칸: 무엇에 맞든 한 번에 1칸 */
function hurtPlayer(src) {
  const p = B.p; if (p.inv > 0 || B.over) return; if (window.__dbg) (window.__dbg.hits = window.__dbg.hits || {})[src || '?'] = ((window.__dbg.hits || {})[src || '?'] || 0) + 1;
  const push = (R, d) => B.foes.forEach(f => { const dx = f.x - p.x, dy = f.y - p.y, m = Math.hypot(dx, dy) || 1; if (m < R && f !== B.big) { f.kx = dx / m * d; f.ky = dy / m * d; } });
  if (p.shield) { p.shield = false; p.inv = 0.8; textAdd(p.x, p.y - 50, '막음!', '#59B8FF', true); sfx.block(); push(120, 400); fxAdd({ k: 'ring', x: p.x, y: p.y - 24, r: 30, to: 120, life: 0.3, max: 0.3, col: '#59B8FF', w: 6 }); return; }
  p.hp -= 1; p.inv = DF().inv * B.st.invK; B.shake = 0.35; B.hitstop = 0.12; B.slow = 0.35; B.flashScr = { col: '224,68,90', t: 0.35, max: 0.35 }; B.heartPop = 0.5;
  push(130, 520); burst(p.x, p.y - 30, '#E0445A', 12, 220); fxAdd({ k: 'ring', x: p.x, y: p.y - 24, r: 38, to: 140, life: 0.32, max: 0.32, col: '#E0445A', w: 5 });
  sfx.hurt();
  if (p.hp <= 0) {
    if (run.potion) {      // 따뜻한 코코아: 저절로 마시고 하트 1칸으로 다시 일어나요
      run.potion = false; p.hp = 1; p.inv = 2.2;
      push(200, 700);
      fxAdd({ k: 'ring', x: p.x, y: p.y, r: 10, to: 200, life: 0.5, max: 0.5, col: '#FFC83D', w: 8 }); toast('코코아를 마시고 다시 일어났어요!'); sfx.revive();
      if (!headless) $('#potHud').innerHTML = '';
    } else { p.hp = 0; endBattle(false); }
  }
}
function nearestFoe(range, from) { let best = null, bd = range * range; const p = from || B.p; for (const f of B.foes) { if (f.dead) continue; const d = (f.x - p.x) ** 2 + (f.y - p.y) ** 2; if (d < bd) { bd = d; best = f; } } return best; }
function nearFoes(range, n) { const p = B.p, r2 = range * range, l = B.foes.filter(f => !f.dead && (f.x - p.x) ** 2 + (f.y - p.y) ** 2 < r2); l.sort((a, b) => ((a.x - p.x) ** 2 + (a.y - p.y) ** 2) - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2)); return l.slice(0, n); }
const ar = () => B.st.area;
/* 폭발: 범위 안 적을 모두 때려요 */
function blast(x, y, r, dmg, w, col) {
  for (const f of B.foes) if (!f.dead && (f.x - x) ** 2 + (f.y - y) ** 2 < (r + f.r) ** 2) hurtFoe(f, dmg, w, f.x - x, f.y - y);
  fxAdd({ k: 'ring', x, y, r: r * 0.3, to: r, life: 0.25, max: 0.25, col, w: 6 }); fxAdd({ k: 'flash', x, y, r: r * 0.5, life: 0.08, max: 0.08, col: '#FFFFFF' }); burst(x, y, col, 8, 180);
}
function fireWeapons(dt) {
  const p = B.p;
  for (const w of B.weapons) {
    const lv = w.lv, s5 = lv >= 5, s10 = lv >= 10; w.cd -= dt;
    if (w.id === 'macaron') {            /* 늘 돌고 있어요 */
      w.ang += dt * (s5 ? 4.2 : 3.2); const n = 1 + lv, R = (s5 ? 74 : 58) * ar();
      if (s10) w.burstT = (w.burstT ?? 2) - dt;
      w.orbs = [];
      for (let i = 0; i < n; i++) {
        const a = w.ang + i * 6.283 / n, ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R; w.orbs.push([ox, oy]);
        for (const f of B.foes) { if (f.dead) continue; if ((f.x - ox) ** 2 + (f.y - oy) ** 2 < (f.r + 11) ** 2 && (f.hitT.mac || 0) <= B.t) { f.hitT.mac = B.t + 0.4; hurtFoe(f, 9, w, f.x - ox, f.y - oy); } }
        if (s10 && w.burstT <= 0) blast(ox, oy, 46 * ar(), 14, w, '#FF8FB8');
      }
      if (s10 && w.burstT <= 0) { w.burstT = 2; sfx.swing(); B.shake = Math.max(B.shake, 0.08); }
      continue;
    }
    if (w.cd > 0) continue;
    if (w.id === 'pin') {
      const R = 82 * (s5 ? 1.25 : 1) * ar(), t = nearestFoe(R + 40);
      if (!t) { w.cd = 0.15; continue; }
      const a = Math.atan2(t.y - p.y, t.x - p.x), dirs = Array.from({ length: lv }, (_, i) => a + i * 6.283 / lv); w.cd = 0.8;
      for (const f of B.foes) { if (f.dead) continue; const dx = f.x - p.x, dy = f.y - p.y, m = Math.hypot(dx, dy); if (m > R + f.r && !(s10 && m < R * 1.7 + f.r)) continue; const fa = Math.atan2(dy, dx); const inArc = s10 || dirs.some(d => { let da = Math.abs(fa - d) % 6.283; if (da > Math.PI) da = 6.283 - da; return da < 1.1; }); if (m <= R + f.r && inArc) hurtFoe(f, 16, w, dx, dy, s5 ? 1.6 : 1); else if (s10) hurtFoe(f, 8, w, dx, dy); }
      if (s10) { fxAdd({ k: 'spin', x: p.x, y: p.y, a, r: R, life: 0.3, max: 0.3 }); fxAdd({ k: 'ring', x: p.x, y: p.y - 12, r: R * 0.8, to: R * 1.7, life: 0.3, max: 0.3, col: '#FFE1A8', w: 6 }); }
      else dirs.forEach(d => fxAdd({ k: 'arc', x: p.x, y: p.y, a: d, r: R, life: 0.22, max: 0.22 }));
      B.shake = Math.max(B.shake, 0.04); sfx.swing();
    } else if (w.id === 'cream' || w.id === 'lemon') {
      const t = nearestFoe(320); if (!t) { w.cd = 0.2; continue; }
      const a = Math.atan2(t.y - p.y, t.x - p.x), n = lv, cream = w.id === 'cream'; w.cd = cream ? 0.8 : 0.95;
      fxAdd({ k: 'flash', x: p.x + Math.cos(a) * 18, y: p.y - 10 + Math.sin(a) * 18, r: 11, life: 0.07, max: 0.07, col: cream ? '#FFFFFF' : '#F4E04D' });
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.13; B.shots.push({ k: w.id, x: p.x, y: p.y - 10, vx: Math.cos(aa) * 340, vy: Math.sin(aa) * 340, r: cream && s10 ? 11 : 7, dmg: cream ? (s10 ? 14 : 11) : 7, acid: cream ? 0 : (s5 ? 6 : 3), pierce: cream && s10 ? 99 : 0, life: 1.2, w, hit: new Set(), aw: s10, puddle: cream && s5 }); }
      sfx.shot();
    } else if (w.id === 'star') {
      const a = Math.atan2(p.dirY, p.dirX), n = 2 + lv; w.cd = 1.2;
      for (let i = 0; i < n; i++) { const aa = s10 ? a + i * 6.283 / n : a + (i - (n - 1) / 2) * 0.2; B.shots.push({ k: 'star', x: p.x, y: p.y - 10, vx: Math.cos(aa) * 310, vy: Math.sin(aa) * 310, r: 7, dmg: 8, pierce: 0, life: 0.9, w, hit: new Set(), aw: s10, bounce: s10 ? 3 : s5 ? 1 : 0 }); }
      sfx.shot();
    } else if (w.id === 'skewer') {
      const tg = nearestFoe(360), a = tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : Math.atan2(p.dirY, p.dirX), n = lv, sp = s5 ? 560 : 430; w.cd = 1.4;
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.12; B.shots.push({ k: 'skewer', x: p.x, y: p.y - 10, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, r: 9, dmg: 18, pierce: 99, life: s10 ? 1.5 : s5 ? 1.1 : 0.9, w, hit: new Set(), a: aa, aw: s10, boom: s10 }); }
      sfx.shot();
    } else if (w.id === 'honey') {
      w.cd = 3; const r = (s5 ? 64 : 50) * ar(), life = s5 ? 4 : 3;
      for (let i = 0; i < lv; i++) { let x = p.x, y = p.y; if (i) { const t = pick(nearFoes(220, 8)) || null; if (t) { x = t.x; y = t.y; } else { const a = Math.random() * 6.283, d = rand(60, 150); x += Math.cos(a) * d; y += Math.sin(a) * d; } } B.zones.push({ x, y, r, life, tick: 0, dmg: 6, w }); }
      if (s10 && !B.zones.some(z => z.follow)) B.zones.push({ x: p.x, y: p.y, r: 92 * ar(), life: 1e9, tick: 0, dmg: 8, w, follow: true });
    } else if (w.id === 'choco') {
      const ts = nearFoes(280, lv); if (!ts.length) { w.cd = 0.3; continue; } w.cd = 1.6;
      for (let i = 0; i < lv; i++) { const t = ts[i % ts.length], j = i >= ts.length ? 30 : 0; B.lobs.push({ k: 'bomb', x0: p.x, y0: p.y - 10, x: t.x + rand(-j, j), y: t.y + rand(-j, j), t: 0, dur: 0.45 + i * 0.04, r: (s5 ? 60 : 44) * ar(), dmg: 20, w, cluster: s10 }); }
      sfx.swing();
    } else if (w.id === 'cotton') {
      const ts = nearFoes(260, lv); if (!ts.length) { w.cd = 0.25; continue; } w.cd = s10 ? 0.75 : 1.3;
      const chain = s10 ? 8 : s5 ? 4 : 2;
      for (const t of ts) {
        const pts = [[p.x, p.y - 30]], hit = new Set(); let cur = t;
        for (let k = 0; k <= chain && cur; k++) { hit.add(cur); pts.push([cur.x, cur.y - FOES[cur.type].h * 0.4]); hurtFoe(cur, 12, w, cur.x - pts[pts.length - 2][0], cur.y - pts[pts.length - 2][1]); if (s10 && cur !== B.big) cur.stun = 0.6; let nb = null, nd = 120 * 120; for (const g of B.foes) { if (g.dead || hit.has(g)) continue; const d2 = (g.x - cur.x) ** 2 + (g.y - cur.y) ** 2; if (d2 < nd) { nd = d2; nb = g; } } cur = nb; }
        fxAdd({ k: 'bolt', pts, life: 0.16, max: 0.16 });
      }
      sfx.zap();
    } else if (w.id === 'cane') {
      w.cd = 2; const ts = B.foes.filter(f => !f.dead && Math.abs(f.x - p.x) < vw / 2 && Math.abs(f.y - p.y) < vh / 2);
      for (let i = 0; i < lv; i++) { const t = ts.length ? pick(ts) : null, x = t ? t.x : p.x + rand(-150, 150), y = t ? t.y : p.y + rand(-200, 200); B.lobs.push({ k: 'cane', x, y, t: -i * 0.07, dur: 0.38, r: (s5 ? 50 : 36) * ar(), dmg: 22, w, shards: s10 }); }
    }
  }
}
/* 던진 폭탄과 떨어지는 사탕: 정해진 시간 뒤에 터져요 */
function updateLobs(dt) {
  for (const L of B.lobs) {
    L.t += dt; if (L.t < L.dur) continue; L.done = true;
    if (L.k === 'bomb') {
      blast(L.x, L.y, L.r, L.dmg, L.w, '#8B5A3C'); sfx.boom();
      if (L.cluster && !L.mini) for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283, d = rand(40, 70); B.lobs.push({ k: 'bomb', mini: true, x0: L.x, y0: L.y, x: L.x + Math.cos(a) * d, y: L.y + Math.sin(a) * d, t: 0, dur: 0.3, r: L.r * 0.55, dmg: 10, w: L.w }); }
    } else {
      blast(L.x, L.y, L.r, L.dmg, L.w, '#E8323C'); sfx.thud(); B.shake = Math.max(B.shake, 0.06);
      if (L.shards) for (let i = 0; i < 6; i++) { const a = i * 1.047 + Math.random() * 0.3; B.shots.push({ k: 'star', x: L.x, y: L.y, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, r: 6, dmg: 9, pierce: 1, life: 0.5, w: L.w, hit: new Set() }); }
    }
  }
  B.lobs = B.lobs.filter(L => !L.done);
}
function levelUp() {
  B.lvl++; B.xp -= B.need; B.need = needOf(B.lvl); run.lvl = B.lvl;
  if (has('sprinkle')) { B.foes.forEach(f => { if (!f.dead && (f.x - B.p.x) ** 2 + (f.y - B.p.y) ** 2 < 130 * 130) hurtFoe(f, 30, null); }); fxAdd({ k: 'ring', x: B.p.x, y: B.p.y, r: 10, to: 130, life: 0.3, max: 0.3, col: '#FF8FB8', w: 6 }); }
  if (headless) { const o = rollLevelOpts(); applyLevel(o[0]); return; }
  /* 빛기둥, 고리, 별가루, 큰 글자. 주변 적은 밀려나고 잠깐 느려져요 */
  const p = B.p; B.lvlPending = true; sfx.level(); B.slow = 1.1; p.inv = Math.max(p.inv, 1.4);
  fxAdd({ k: 'beam', x: p.x, y: p.y, life: 0.9, max: 0.9 });
  [0, 0.12, 0.24].forEach((dl, i) => fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 16, to: 150 + i * 40, life: 0.5 + dl, max: 0.5 + dl, col: i === 1 ? '#FFFFFF' : '#FFD23F', w: 7 - i * 2 }));
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, sp = rand(160, 300); fxAdd({ k: 'star', x: p.x, y: p.y - 26, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: rand(0.5, 0.8), max: 0.8, col: pick(['#FFD23F', '#FFFFFF', '#FF8FB8', '#8FD3FF']), r: rand(4, 7) }); }
  B.foes.forEach(f => { const dx = f.x - p.x, dy = f.y - p.y, m = Math.hypot(dx, dy) || 1; if (m < 170 && f !== B.big) { f.kx = dx / m * 600; f.ky = dy / m * 600; } });
  B.flashScr = { col: '255,230,140', t: 0.4, max: 0.4 };
  const ban = el('div', 'lvl-ban', `<b>LEVEL UP!</b><span>Lv ${B.lvl}</span>`); fxLayer.appendChild(ban); setTimeout(() => ban.remove(), 760);
  const lv = $('#lvText'); lv.classList.remove('pop'); void lv.offsetWidth; lv.classList.add('pop');
  setTimeout(() => { if (!B || B.over) { if (B && B.lvlLost) return; run.picks = (run.picks || 0) + 1; if (B) B.lvlPending = false; return; } B.lvlPending = false; B.paused = true; levelSheet(rollLevelOpts()); }, 720);
}
/* 선택지: 아직 Lv10이 아닌 무기 10가지 + 능력 3가지가 모두 같은 확률 */
function rollLevelOpts() {
  const pool = Object.keys(WEAPONS).filter(id => wLv(id) < WMAX).map(id => ({ t: 'w', id })).concat(Object.keys(STATS).map(id => ({ t: 's', id })));
  return shuffle(pool).slice(0, M('choice') ? 4 : 3);
}
function applyLevel(o) {
  if (o.t === 's') { run.bonus[o.id]++; if (B) B.st = battleStats(); return; }
  let w = run.wpn.find(x => x.id === o.id);
  if (w) { w.lv++; const bw = B && B.weapons.find(x => x.src === w); if (bw) bw.lv = w.lv; if (B && (w.lv === 5 || w.lv === 10)) specialFx(w); }
  else { w = { id: o.id, lv: 1 }; run.wpn.push(w); if (B) B.weapons.push({ id: w.id, lv: 1, src: w, cd: 0.2, ang: 0 }); }
}
function levelSheet(opts, after) {
  /* 짧게: 무기는 레벨만, 능력은 한 줄. Lv5·Lv10이 되는 카드는 색으로 구분 */
  const optHtml = (o, i) => {
    if (o.t === 's') return `<button class="opt lvc" type="button" data-act="pick" data-i="${i}"><span class="ic">${svg(ICON[STATS[o.id].icon])}</span><span class="tx"><b>${STATS[o.id].name}</b></span></button>`;
    const lv = wLv(o.id), nx = lv + 1, W = WEAPONS[o.id];
    const sp = nx === 5 || nx === 10;
    return `<button class="opt lvc${nx === 10 ? ' lv10' : nx === 5 ? ' lv5' : ''}" type="button" data-act="pick" data-i="${i}">${sp ? `<i class="shine"></i><em class="tag">${nx === 10 ? '★ 최강 각성' : '★ 특별 효과'}</em>` : ''}<span class="ic">${svg(ICON[o.id])}</span><span class="tx"><b>${W.name}</b><span>${lv ? `Lv${lv} → Lv${nx}` : '새 무기 Lv1'}</span></span></button>`;
  };
  sheet(`<h2 id="cardTitle">레벨 ${run.lvl}!</h2><div class="opts">${opts.map(optHtml).join('')}</div>${run.rerolls > 0 ? `<button class="btn" type="button" data-act="reroll">다시 뽑기 (${run.rerolls}번 남음)</button>` : ''}`,
    (act, b) => {
      if (b.closest('.lock')) return;
      if (act === 'reroll') { run.rerolls--; sfx.flip(); levelSheet(rollLevelOpts(), after); return; }
      applyLevel(opts[+b.dataset.i]); closeSheet(); sfx.good();
      if (after) { after(); return; }
      B.paused = false; last = performance.now();
      fxAdd({ k: 'ring', x: B.p.x, y: B.p.y - 20, r: 10, to: 90, life: 0.35, max: 0.35, col: '#FFFFFF', w: 5 });
    });
  cardEl.classList.add('lvl'); flipReveal();
}
function specialFx(w) {
  if (headless) return; const p = B.p;
  toast(`${WEAPONS[w.id].name} Lv${w.lv} 특별 효과!`); sfx.rare();
  fxAdd({ k: 'beam', x: p.x, y: p.y, life: 0.7, max: 0.7 });
  for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283, sp = rand(140, 260); fxAdd({ k: 'star', x: p.x, y: p.y - 26, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7, max: 0.7, col: i % 2 ? '#FFD23F' : '#FFFFFF', r: 6 }); }
  fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 20, to: 170, life: 0.5, max: 0.5, col: '#FFD23F', w: 8 });
}
function bossThink(f, dt) {
  const p = B.p; f.stT -= dt;
  if (f.st === 0 && f.stT <= 0) {
    const r = Math.random();
    if (r < 0.4) { const wt = 1.4 * DF().warn; f.st = 1; f.stT = wt; f.tx = p.x; f.ty = p.y; B.telegraphs.push({ k: 'circle', x: p.x, y: p.y, r: 92, life: wt, max: wt }); sfx.warn(); }
    else if (r < 0.75) { f.st = 2; f.stT = 1.0; B.telegraphs.push({ k: 'ring', f, r: f.r + 26, life: 1.0, max: 1.0 }); sfx.warn(); }
    else { f.st = 0; f.stT = 4; for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283; spawnFoe('jelly', f.x + Math.cos(a) * 80, f.y + Math.sin(a) * 80); } }
  } else if (f.st === 1 && f.stT <= 0) {
    if ((p.x - f.tx) ** 2 + (p.y - f.ty) ** 2 < 92 * 92) hurtPlayer('slam');
    fxAdd({ k: 'ring', x: f.tx, y: f.ty, r: 20, to: 96, life: 0.3, max: 0.3, col: '#9B59D0', w: 8 }); burst(f.tx, f.ty, '#9B59D0', 16, 260); B.shake = 0.4; sfx.slam(); f.st = 0; f.stT = 3.2;
  } else if (f.st === 2 && f.stT <= 0) {
    for (let i = 0; i < 14; i++) { const a = i * 6.283 / 14 + Math.random() * 0.2; B.foeShots.push({ x: f.x, y: f.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, r: 8, dmg: 1, life: 3 }); }
    sfx.slam(); f.st = 0; f.stT = 3.4;
  }
}
function eliteThink(f, dt) {
  const p = B.p; f.stT -= dt;
  if (f.st === 0 && f.stT <= 0) { const wt = 0.8 * DF().warn; f.st = 1; f.stT = wt; const a = Math.atan2(p.y - f.y, p.x - f.x); f.da = a; B.telegraphs.push({ k: 'line', f, a, len: 230, life: wt, max: wt }); sfx.warn(); }
  else if (f.st === 1 && f.stT <= 0) { f.st = 2; f.stT = 0.55; }
  else if (f.st === 2) { f.x += Math.cos(f.da) * 480 * dt; f.y += Math.sin(f.da) * 480 * dt; if (f.stT <= 0) { f.st = 0; f.stT = 4; } return true; }
  return f.st === 1;
}

function update(dt) {
  const p = B.p; B.t += dt;
  /* 이동 */
  let mx = 0, my = 0;
  if (B.auto) [mx, my] = autopilot(); else if (B.joy) { mx = B.joy.dx; my = B.joy.dy; }
  const mm = Math.hypot(mx, my); p.moving = mm > 0.12;
  if (p.moving) {
    const sp = 172 * B.st.spd * (has('cape') && p.hp <= 1 ? 1.25 : 1), k = Math.min(1, mm);
    p.x += mx / mm * sp * k * dt; p.y += my / mm * sp * k * dt; p.dirX = mx / mm; p.dirY = my / mm; if (Math.abs(mx) > 0.1) p.face = mx > 0 ? 1 : -1; p.bob += dt * 12;
  }
  if (p.inv > 0) p.inv -= dt;
  /* 적 등장 */
  const rate = (0.6 + 2.05 * Math.min(1, B.t / Math.min(120, B.dur))) * stageMul() * (B.big ? 0.5 : 1) * DF().spawn * 1.2;
  if (!B.rush && B.t >= 120) { B.rush = true; if (!headless) { toast('몰려와요! 적이 더 많아져요'); sfx.warn(); } }
  if (B.rush && !headless && ZOOM > 0.78) { ZOOM = Math.max(0.78, ZOOM - dt * 0.15); resize(); }     // 화면을 천천히 넓혀서 더 많이 보여요
  B.spawnAcc += rate * (B.rush ? 1.3 : 1) * dt;
  while (B.spawnAcc >= 1 && B.foes.length < (B.rush ? 220 : 168)) { B.spawnAcc -= 1; const pool = ['jelly', 'jelly']; const ramp = Math.min(120, B.dur); if (B.floor >= 1 || B.t > ramp * 0.5) pool.push('ice'); if (B.floor >= 2 || B.t > ramp * 0.75) pool.push('cookie'); spawnRing(pick(pool)); }
  if (B.spawnAcc > 3) B.spawnAcc = 3;
  if (B.eliteAt > 0 && B.t >= B.eliteAt && !B.big) { B.big = spawnRing('donut'); bigIntro(); }
  if (B.bossAt > 0 && B.t >= B.bossAt && !B.big) { B.big = spawnRing('boss'); bigIntro(); }
  /* 적 움직임 */
  for (const f of B.foes) {
    if (f.dead) continue;
    if (f.flash > 0) f.flash -= dt;
    if (f.slow > 0) f.slow -= dt; if (f.stun > 0) f.stun -= dt;
    if (f.acid > 0) { f.acidT -= dt; if (f.acidT <= 0) { f.acidT = 0.5; const d = f.acid * 0.9; f.hp -= d * B.st.dmg; f.acid = Math.max(0, f.acid - 0.5); textAdd(f.x, f.y - f.r, Math.round(d), '#7FA81E'); if (f.hp <= 0) { killFoe(f, null); continue; } } }
    let busy = false;
    if (f.type === 'boss') bossThink(f, dt); else if (f.type === 'donut') busy = eliteThink(f, dt);
    const dx = p.x - f.x, dy = p.y - f.y, m = Math.hypot(dx, dy) || 1;
    if (f.sq > 0) f.sq = Math.max(0, f.sq - dt * 3);
    if (f.kx || f.ky) { f.x += f.kx * dt; f.y += f.ky * dt; const dec = Math.exp(-dt * 11); f.kx *= dec; f.ky *= dec; if (Math.abs(f.kx) + Math.abs(f.ky) < 8) f.kx = f.ky = 0; }
    if (!busy && !(f.stun > 0)) { const sp = f.spd * (f.slow > 0 ? 0.55 : 1) * (f.kx || f.ky ? 0.25 : 1); f.x += dx / m * sp * dt; f.y += dy / m * sp * dt; }
    f.ph += dt * 7;
    if (m < f.r + HERO_R) hurtPlayer(f.type);
    if (m > 900) { const a = Math.random() * 6.283, R = Math.hypot(vw, vh) / 2 + 40; f.x = p.x + Math.cos(a) * R; f.y = p.y + Math.sin(a) * R; }   // 너무 멀어지면 다시 근처로
  }
  /* 서로 겹치지 않게 살짝 밀어내요 */
  const F = B.foes;
  for (let i = 0; i < F.length; i++) { const a = F[i]; if (a.dead) continue; for (let j = i + 1; j < F.length; j++) { const b = F[j]; if (b.dead) continue; const dx = b.x - a.x; if (dx > 40 || dx < -40) continue; const dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy; if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2), push = (rr - d) * 0.5 / d, wa = a === B.big ? 0 : b === B.big ? 2 : 1; a.x -= dx * push * wa; a.y -= dy * push * wa; b.x += dx * push * (2 - wa); b.y += dy * push * (2 - wa); } } }
  fireWeapons(dt); updateLobs(dt);
  /* 내 탄 */
  for (const s of B.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.boom) {            // 부메랑 꼬치: 반쯤 날아가면 나에게 돌아와요
      if (!s.back && s.life < 0.75) { s.back = true; s.hit = new Set(); }
      if (s.back) { const dx = p.x - s.x, dy = p.y - 10 - s.y, d = Math.hypot(dx, dy) || 1; s.vx += (dx / d * 520 - s.vx) * Math.min(1, dt * 6); s.vy += (dy / d * 520 - s.vy) * Math.min(1, dt * 6); s.a = Math.atan2(s.vy, s.vx); if (d < 22) s.life = 0; }
    }
    for (const f of B.foes) { if (f.dead || s.hit.has(f)) continue; if ((f.x - s.x) ** 2 + (f.y - s.y) ** 2 < (f.r + s.r) ** 2) { s.hit.add(f); if (s.acid) f.acid += s.acid; hurtFoe(f, s.dmg, s.w, s.vx, s.vy);
      if (s.puddle && B.zones.length < 24) B.zones.push({ x: f.x, y: f.y, r: 34, life: 2.5, tick: 0.2, dmg: s.dmg * 0.25, w: s.w, cream: true });
      if (s.bounce > 0) {   // 튕기는 별사탕: 가까운 다른 적에게
        let nb = null, nd = 170 * 170; for (const g of B.foes) { if (g.dead || s.hit.has(g) || g === f) continue; const d2 = (g.x - s.x) ** 2 + (g.y - s.y) ** 2; if (d2 < nd) { nd = d2; nb = g; } }
        if (nb) { s.bounce--; const dx = nb.x - s.x, dy = nb.y - s.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(s.vx, s.vy); s.vx = dx / d * sp; s.vy = dy / d * sp; s.life = Math.max(s.life, 0.6); s.trail = []; fxAdd({ k: 'flash', x: s.x, y: s.y, r: 12, life: 0.08, max: 0.08, col: '#FFE45C' }); break; }
      }
      if (s.pierce-- <= 0) { s.life = 0; break; } } }
  }
  B.shots = B.shots.filter(s => s.life > 0);
  /* 꿀 장판 */
  for (const z of B.zones) { if (z.follow) { z.x = p.x; z.y = p.y; } z.life -= dt; z.tick -= dt; if (z.tick <= 0) { z.tick = 0.5; for (const f of B.foes) if (!f.dead && (f.x - z.x) ** 2 + (f.y - z.y) ** 2 < (z.r + f.r) ** 2) { f.slow = 0.7; hurtFoe(f, z.dmg, z.w, 0.001, 0.001); } } }
  B.zones = B.zones.filter(z => z.life > 0);
  /* 적의 탄 */
  for (const s of B.foeShots) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 < (s.r + HERO_R * 0.85) ** 2) { hurtPlayer('shot'); s.life = 0; } }
  B.foeShots = B.foeShots.filter(s => s.life > 0);
  for (const t of B.telegraphs) t.life -= dt; B.telegraphs = B.telegraphs.filter(t => t.life > 0 && !(t.f && t.f.dead));
  B.foes = B.foes.filter(f => !f.dead);
  /* 보석 */
  const pr2 = B.st.pickup ** 2;
  for (const g of B.gems) {
    const dx = p.x - g.x, dy = p.y - g.y, d2 = dx * dx + dy * dy;
    g.px = g.x; g.py = g.y; g.ph += dt * 5;
    if (g.vz != null) { g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; g.vz -= 700 * dt; if (g.z <= 0) { if (g.vz < -120) { g.vz *= -0.35; g.z = 0.1; g.vx *= 0.5; g.vy *= 0.5; } else { g.z = 0; g.vz = null; } } continue; }
    if (!g.pull && d2 < pr2) { g.pull = true; g.sp = -120; }
    if (g.pull) {
      const d = Math.sqrt(d2) || 1; g.sp = Math.min(d > 400 ? 1600 : 900, g.sp + 1500 * dt);     // 살짝 튕겨 나갔다가 빨려 들어와요
      g.x += dx / d * g.sp * dt; g.y += dy / d * g.sp * dt;
      if (d < 18) { g.got = true; B.xp += g.v * B.st.xp * (1 + 0.12 * B.floor); B.gemCombo = B.gemT > 0 ? B.gemCombo + 1 : 0; B.gemT = 0.5; sfx.gem(B.gemCombo); B.xpFlash = 0.25;
        fxAdd({ k: 'flash', x: p.x, y: p.y - 26, r: 12, life: 0.12, max: 0.12, col: g.v >= 5 ? '#FFC2DA' : g.v >= 2 ? '#C9F7B8' : '#BFE6FF' });
        if (Math.random() < 0.5) fxAdd({ k: 'star', x: p.x + rand(-16, 16), y: p.y - rand(20, 50), vx: rand(-30, 30), vy: -70, life: 0.45, max: 0.45, col: '#FFFFFF', r: 5 }); }
    }
  }
  B.gems = B.gems.filter(g => !g.got); if (B.gems.length > 220) B.gems.splice(0, B.gems.length - 220);
  if (B.gemT > 0) B.gemT -= dt; if (B.xpFlash > 0) B.xpFlash -= dt;
  /* 자석: 먹으면 화면 밖까지 모든 보석이 빨려 와요 */
  if (B.magnet) { const m = B.magnet; m.ph += dt * 5; if ((p.x - m.x) ** 2 + (p.y - m.y) ** 2 < 26 * 26) { B.magnet = null; for (const g of B.gems) { g.vz = null; g.z = 0; if (!g.pull) { g.pull = true; g.sp = 200; } } sfx.magnet(); if (!headless) { toast('자석! 보석이 전부 모여요'); fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 20, to: 260, life: 0.5, max: 0.5, col: '#FF4F6B', w: 6 }); fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 10, to: 200, life: 0.4, max: 0.4, col: '#FFFFFF', w: 4 }); } } }
  /* 걸을 때 발밑 먼지 */
  if (p.moving && !headless) { B.dustT = (B.dustT || 0) - dt; if (B.dustT <= 0) { B.dustT = 0.16; fxAdd({ k: 'dot', x: p.x + rand(-6, 6), y: p.y + 2, vx: -p.dirX * 30 + rand(-15, 15), vy: rand(-30, -10), life: 0.4, max: 0.4, col: 'rgba(200,150,90,.55)', r: rand(3, 5) }); } }
  while (B.xp >= B.need && !B.over && !B.paused && !B.lvlPending) levelUp();
  /* 연출 */
  for (const f of B.fx) { f.life -= dt; if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.g) f.vy += f.g * dt; else { f.vx *= 0.9; f.vy *= 0.9; } } } B.fx = B.fx.filter(f => f.life > 0);
  for (const t of B.texts) { t.life -= dt; t.x += t.vx * dt; t.y += t.vy * dt; t.vy += 380 * dt; } B.texts = B.texts.filter(t => t.life > 0);
  if (B.shake > 0) B.shake -= dt; if (B.hsCool > 0) B.hsCool -= dt; if (B.heartPop > 0) B.heartPop -= dt;
  for (const s of B.shots) if (s.k !== 'skewer') { s.trail = s.trail || []; s.trail.push(s.x, s.y); if (s.trail.length > 10) s.trail.splice(0, 2); }
  if (!B.over && B.t >= B.dur) endBattle(true);
}
function bigIntro() { if (B.big.type === 'boss' && !headless) music('boss'); toast(`${FOES[B.big.type].name} 등장!`); sfx.boss(); if (!headless) { $('#bossBar').hidden = false; $('#bossName').textContent = FOES[B.big.type].name; } }

/* 테스트와 구경용 자동 조종: 가까운 적과 위험 표시에서 멀어지고, 보석 쪽으로 살짝 끌려요 */
function autopilot() {
  const p = B.p; let x = 0, y = 0;
  for (const f of B.foes) { const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy) || 1, reach = 120 + f.r; if (d < reach) { const k = (reach - d) / reach; x += dx / d * k * 2; y += dy / d * k * 2; } }
  for (const s of B.foeShots) { const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy) || 1; if (d < 70) { x += dx / d; y += dy / d; } }
  for (const t of B.telegraphs) if (t.k === 'line') { const c = Math.cos(t.a), sn = Math.sin(t.a), rx = p.x - t.f.x, ry = p.y - t.f.y, along = rx * c + ry * sn, side = -rx * sn + ry * c; if (along > -30 && along < t.len + 60 && Math.abs(side) < t.f.r + 50) { const sg = side >= 0 ? 1 : -1; x += -sn * sg * 4; y += c * sg * 4; } }
  for (const s of B.foes) if (s.type === 'donut' && s.st === 2) { const c = Math.cos(s.da), sn = Math.sin(s.da), rx = p.x - s.x, ry = p.y - s.y, side = -rx * sn + ry * c; if (rx * c + ry * sn > 0 && Math.abs(side) < s.r + 50) { const sg = side >= 0 ? 1 : -1; x += -sn * sg * 4; y += c * sg * 4; } }
  for (const t of B.telegraphs) if (t.k === 'circle') { const dx = p.x - t.x, dy = p.y - t.y, d = Math.hypot(dx, dy) || 1; if (d < t.r + 30) { x += dx / d * 3; y += dy / d * 3; } }
  let g = null, gd = 300 * 300; for (const q of B.gems) { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < gd) { gd = d; g = q; } }
  if (g) { const dx = g.x - p.x, dy = g.y - p.y, d = Math.hypot(dx, dy) || 1; x += dx / d * 1.1; y += dy / d * 1.1; }
  if (B.magnet) { const dx = B.magnet.x - p.x, dy = B.magnet.y - p.y, d = Math.hypot(dx, dy) || 1; x += dx / d * 1.5; y += dy / d * 1.5; }
  if (Math.hypot(x, y) < 0.05) { x = Math.cos(B.t * 0.7); y = Math.sin(B.t * 0.7); }
  return [x, y];
}

function endBattle(won) {
  if (B.over) return; B.over = true;
  const info = { won, kind: B.kind, floor: B.floor, bigDead: B.bigDead, kills: B.kills, time: B.t };
  run.hp = Math.max(won ? 1 : 0, Math.min(run.maxHp, B.p.hp));
  run.kills = (run.kills || 0) + B.kills; run.lvl = B.lvl; run.xp = B.xp;
  const cb = B.onEnd;
  if (B.lvlPending) { run.picks = (run.picks || 0) + 1; B.lvlPending = false; B.lvlLost = true; }
  if (headless) { B.result = info; return; }
  if (won) sfx.win(); else sfx.lose();
  setTimeout(() => { B = null; ZOOM = 1; cb(info); }, 900);
}

/* ───── 그리기: 낮은 해상도로 그린 뒤 크게 키우는 픽셀 화면. 화면 1칸 = 게임 속 길이 2 ───── */
const WP = 2, BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], INK = '#1A0E22';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
let pcx = 0, pcy = 0;
const X = v => Math.round(v / WP) - pcx, Y = v => Math.round(v / WP) - pcy;
const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const backOut = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
/* 점을 섞어 찍은 타원 (빛, 장판, 기운). 한 번 만들면 다시 써요 */
const discs = new Map();
function dDisc(rx, ry, col, dens) {
  const key = rx + ',' + ry + col + dens; let c = discs.get(key); if (c) return c;
  c = mk(rx * 2 + 1, ry * 2 + 1); const q = c.getContext('2d'); q.fillStyle = col;
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) { const d = (i * i) / (rx * rx) + (j * j) / (ry * ry); if (d <= 1 && BAYER[((j + 64) & 3) * 4 + ((i + 64) & 3)] < dens * (d > 0.6 ? 1 - (d - 0.6) * 1.6 : 1)) q.fillRect(i + rx, j + ry, 1, 1); }
  if (discs.size > 300) discs.clear(); discs.set(key, c); return c;
}
const putDisc = (x, y, rx, ry, col, dens) => ctx.drawImage(dDisc(Math.max(1, rx), Math.max(1, ry), col, dens), x - rx, y - ry);
function pdisc(x, y, r, col) { ctx.fillStyle = col; for (let j = -r; j <= r; j++) { const w = Math.floor(Math.sqrt(r * r - j * j)); ctx.fillRect(x - w, y + j, w * 2 + 1, 1); } }
function pcircle(x, y, r, col, t = 1) {
  ctx.fillStyle = col; let i = r, j = 0, e = 1 - r;
  while (i >= j) { for (const [a, b] of [[i, j], [j, i], [-i, j], [-j, i], [i, -j], [j, -i], [-i, -j], [-j, -i]]) ctx.fillRect(x + a, y + b, t, t); j++; if (e < 0) e += 2 * j + 1; else { i--; e += 2 * (j - i) + 1; } }
}
function pline(x0, y0, x1, y1, col, t = 1) { ctx.fillStyle = col; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), t, t); }
function pstar(x, y, s, col) { ctx.fillStyle = col; ctx.fillRect(x - s, y, s * 2 + 1, 1); ctx.fillRect(x, y - s, 1, s * 2 + 1); }
/* 바닥: 초콜릿 타일 무늬를 한 번 그려 두고 이어 붙여요 */
const FLOOR = (() => {
  const c = mk(64, 64), q = c.getContext('2d'), r = (col, x, y, w, h) => { q.fillStyle = col; q.fillRect(x, y, w, h); };
  for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) { const x = gx * 16, y = gy * 16; r((gx + gy) & 1 ? '#3A2030' : '#43263A', x, y, 16, 16); r('#2A1424', x, y + 15, 16, 1); r('#2A1424', x + 15, y, 1, 16); r('#5A3450', x + 1, y + 1, 4, 1); r('#5A3450', x + 1, y + 2, 1, 2); }
  [[7, 8, '#6A3C58'], [39, 24, '#5A4466'], [22, 44, '#6A4A50']].forEach(([x, y, col]) => { r(col, x, y, 2, 1); });
  [[20, 10], [56, 36], [4, 30], [36, 52]].forEach(([x, y]) => { r('#2A1424', x, y, 3, 1); r('#2A1424', x + 2, y + 1, 2, 1); });
  return c;
})();
/* 경험치 보석과 마카롱: 작은 픽셀 그림 */
function gemSprite(w, h, col, light, dark) {
  const c = mk(w * 2 + 3, h * 2 + 3), q = c.getContext('2d'), inside = (i, j) => Math.abs(i) * h + Math.abs(j) * w <= w * h;
  for (let j = -h - 1; j <= h + 1; j++) for (let i = -w - 1; i <= w + 1; i++) {
    if (inside(i, j)) q.fillStyle = i < 0 && j <= 0 ? light : i > 0 && j >= 0 ? dark : col;
    else if (inside(i - 1, j) || inside(i + 1, j) || inside(i, j - 1) || inside(i, j + 1)) q.fillStyle = INK; else continue;
    q.fillRect(i + w + 1, j + h + 1, 1, 1);
  }
  q.fillStyle = '#FFFFFF'; q.fillRect(w, h - Math.ceil(h / 2), 1, 1); return c;
}
const GEM = { s: gemSprite(3, 4, '#4FD8FF', '#E6FBFF', '#1E8FC9'), m: gemSprite(4, 5, '#6CFF6A', '#E8FFE0', '#2EA83A'), l: gemSprite(5, 6, '#FF5CB0', '#FFE0F0', '#C92E7E') };
const GEM_COL = { s: '#4FD8FF', m: '#6CFF6A', l: '#FF5CB0' };
/* 보석 뒤의 은은한 빛 (반짝일 때 크게) */
const GEM_GLOW = Object.fromEntries(Object.entries(GEM_COL).map(([k, c]) => [k, [dDisc(7, 5, c, 5), dDisc(9, 7, c, 7)]]));
const gemKey = v => v >= 5 ? 'l' : v >= 2 ? 'm' : 's';
const MAC = (() => { const c = mk(9, 8), q = c.getContext('2d'), r = (col, x, y, w, h) => { q.fillStyle = col; q.fillRect(x, y, w, h); }; r(INK, 1, 0, 7, 8); r(INK, 0, 1, 9, 6); r('#FF8FB8', 2, 1, 5, 1); r('#FF8FB8', 1, 2, 7, 1); r('#FFD0E2', 2, 2, 2, 1); r('#FFF3E0', 1, 3, 7, 2); r('#FF8FB8', 1, 5, 7, 1); r('#D9578A', 2, 6, 5, 1); return c; })();
let VIG = null;
function vignette() { if (VIG && VIG.width === lw && VIG.height === lh) return VIG; VIG = mk(lw, lh); const q = VIG.getContext('2d'); q.fillStyle = 'rgba(14,6,20,.6)'; for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) { const dx = (x - lw / 2) / (lw / 2), dy = (y - lh / 2) / (lh / 2), d = dx * dx + dy * dy; if (d > 0.9 && (d - 0.9) * 22 > BAYER[(y & 3) * 4 + (x & 3)]) q.fillRect(x, y, 1, 1); } return VIG; }
function spr(name, wx, wy, flip, white, lift = 0, fr = -1) {
  const s = IMG[name]; if (!s) return; const im = fr >= 0 && s.frames ? (white ? s.whites : s.frames)[fr % s.frames.length] : white ? s.white : s.im, w = im.width, h = im.height, x = X(wx), y = Y(wy) - lift;
  if (flip < 0) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(im, -Math.ceil(w / 2), y - h); ctx.restore(); } else ctx.drawImage(im, x - Math.floor(w / 2), y - h);
}
const SHOT_COL = { cream: '#FFFFFF', lemon: '#F4E04D', star: '#FFD86B', shard: '#C9B6FF' };
function draw() {
  const p = B.p;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const sk = B.shake > 0 ? Math.min(1, B.shake * 3) * 4 : 0;
  pcx = Math.round((p.x - vw / 2) / WP + rand(-sk, sk)); pcy = Math.round((p.y - vh * 0.48) / WP + rand(-sk, sk));
  /* 바닥 */
  for (let y = -(((pcy % 64) + 64) % 64); y < lh; y += 64) for (let x = -(((pcx % 64) + 64) % 64); x < lw; x += 64) ctx.drawImage(FLOOR, x, y);
  /* 꿀 장판, 크림 웅덩이 */
  for (const z of B.zones) { const r = Math.round(z.r / WP), col = z.cream ? '#FFF3E6' : z.follow ? '#FFC23D' : '#F7B733'; if (z.life < 0.5 && Math.floor(B.t * 14) % 2) continue; putDisc(X(z.x), Y(z.y), r, Math.round(r * 0.8), col, z.cream ? 9 : 7); if (z.follow) pcircle(X(z.x), Y(z.y), r, '#FFE27A'); }
  /* 위험 예고 */
  for (const t of B.telegraphs) {
    const k = 1 - t.life / t.max, on = Math.floor(B.t * 10) % 2;
    if (t.k === 'circle') { const r = Math.round(t.r / WP); putDisc(X(t.x), Y(t.y), r, r, '#FF3B5C', 5); pcircle(X(t.x), Y(t.y), r, on ? '#FF3B5C' : '#FFD86B'); pcircle(X(t.x), Y(t.y), Math.round(r * k), '#FF3B5C'); }
    else if (t.k === 'ring') pcircle(X(t.f.x), Y(t.f.y), Math.round((t.r + k * 30) / WP), on ? '#FF3B5C' : '#FFD86B');
    else { const c = Math.cos(t.a), s = Math.sin(t.a), w = t.f.r / WP; for (const side of [-1, 1]) pline(X(t.f.x) - s * w * side, Y(t.f.y) + c * w * side, X(t.f.x + c * t.len) - s * w * side, Y(t.f.y + s * t.len) + c * w * side, on ? '#FF3B5C' : '#FFD86B'); for (let d = (B.t * 80) % 16; d < t.len; d += 16) R('#FF3B5C', X(t.f.x + c * d), Y(t.f.y + s * d), 2, 2); }
  }
  /* 보석 */
  for (const g of B.gems) {
    const key = gemKey(g.v), G = GEM[key], bob = g.pull ? 0 : Math.round(Math.sin(g.ph) * 1.2 + 1.5), z = Math.round((g.z || 0) / WP) + bob, gx = X(g.x), gy = Y(g.y);
    const pulse = Math.floor(B.t * 4 + g.x * 0.03) % 4 === 0, gl = GEM_GLOW[key][pulse ? 1 : 0];
    ctx.drawImage(gl, gx - (gl.width >> 1), gy - z - (gl.height >> 1));
    R('rgba(14,6,20,.55)', gx - 3, gy + 3, 6, 1);
    if (g.pull) { ctx.globalAlpha = 0.6; R(GEM_COL[key], X(g.px - (g.x - g.px)), Y(g.py - (g.y - g.py)) - z, 2, 2); R(GEM_COL[key], X(g.px), Y(g.py) - z, 2, 2); ctx.globalAlpha = 1; }
    ctx.drawImage(G, gx - (G.width >> 1), gy - z - (G.height >> 1));
    if (pulse) { pstar(gx + 3, gy - z - 4, 2, '#FFFFFF'); }
  }
  /* 자석 아이템 */
  if (B.magnet) { const m = B.magnet, mx = X(m.x), my = Y(m.y) - 3 - Math.round(Math.abs(Math.sin(m.ph)) * 3), big = Math.floor(B.t * 4) % 2;
    ctx.drawImage(dDisc(big ? 11 : 9, big ? 8 : 6, '#FF4F6B', 6), mx - (big ? 11 : 9), my - (big ? 8 : 6)); R('rgba(14,6,20,.5)', mx - 4, Y(m.y) + 2, 8, 1);
    R(INK, mx - 6, my - 6, 13, 12); R('#E8323C', mx - 5, my - 5, 11, 9); R(INK, mx - 2, my - 5, 5, 6); R('#DDE3EA', mx - 5, my + 2, 3, 2); R('#DDE3EA', mx + 3, my + 2, 3, 2); R('#FF9AA6', mx - 4, my - 4, 2, 1);
    if (big) pstar(mx + 6, my - 7, 2, '#FFFFFF'); }
  /* 적과 나를 아래쪽에 있는 것부터 겹쳐 그려요 */
  const list = B.foes.slice(); list.push(p); list.sort((a, b) => a.y - b.y);
  for (const o of list) {
    if (o === p) {
      const px = X(p.x), py = Y(p.y);
      putDisc(px, py + 1, 16, 6, '#8A5A7A', 6); R('rgba(14,6,20,.55)', px - 7, py, 14, 2); R('rgba(14,6,20,.55)', px - 5, py + 2, 10, 1);
      if (!(p.inv > 0 && Math.floor(p.inv * 14) % 2)) spr('hero', p.x, p.y + 4, p.face, false, 0, p.moving ? Math.floor(p.bob / 1.6) % 4 : (Math.floor(B.t * 1.6) % 2 ? 4 : 3));
      if (p.shield) pcircle(px, py - 12, 17, Math.floor(B.t * 6) % 2 ? '#7FE3FF' : '#FFFFFF');
    } else {
      const d = FOES[o.type], age = B.t - (o.born || 0), ox = X(o.x), oy = Y(o.y), rr = Math.round(o.r / WP);
      if (o === B.big) putDisc(ox, oy, Math.round(rr * 2.2), Math.round(rr * 1.6), '#C77DFF', Math.floor(B.t * 5) % 2 ? 4 : 3);
      R('rgba(14,6,20,.5)', ox - rr, oy + Math.round(rr * 0.6), rr * 2, 2);
      if (o !== B.big && o.hp < o.max && o.max > 25) { const bw = rr * 2; R(INK, ox - rr - 1, oy + rr + 2, bw + 2, 3); R('#FF4F6B', ox - rr, oy + rr + 3, Math.max(0, Math.round(bw * o.hp / o.max)), 1); }
      const up = Math.sin(o.ph) > 0, hop = (o.type === 'jelly' && up ? 2 : 0) + (o.sq > 0.15 ? 1 : 0);
      spr(d.img, o.x + (o.sq > 0.2 ? rand(-2, 2) : 0), o.y + o.r * 0.7, o.x > p.x ? -1 : 1, o.flash > 0 || age < 0.08, hop, up || o.sq > 0.2 ? 0 : 1);
      if (o.acid > 0) { R(INK, ox + rr - 1, oy - Math.round(d.h * 0.3) - 1, 4, 4); R('#B9F03E', ox + rr, oy - Math.round(d.h * 0.3), 2, 2); }
    }
  }
  /* 무기 */
  for (const w of B.weapons) if (w.id === 'macaron' && w.orbs) for (const [ox, oy] of w.orbs) { if (w.lv >= 10) putDisc(X(ox), Y(oy), 7, 7, '#FFD86B', Math.round(4 + 8 * (1 - Math.max(0, w.burstT) / 2.5))); ctx.drawImage(MAC, X(ox) - 4, Y(oy) - 4); }
  for (const s of B.shots) {
    const sx = X(s.x), sy = Y(s.y);
    if (s.k === 'skewer') {
      const a = s.aw ? B.t * 18 : s.a, c = Math.cos(a), sn = Math.sin(a);
      if (!s.aw) for (let i = 1; i <= 4; i++) { ctx.globalAlpha = 0.5 - i * 0.1; R('#FFFFFF', Math.round(sx - c * (8 + i * 4)), Math.round(sy - sn * (8 + i * 4)), 2, 2); } ctx.globalAlpha = 1;
      pline(Math.round(sx - c * 9), Math.round(sy - sn * 9), Math.round(sx + c * 10), Math.round(sy + sn * 10), s.aw ? '#FFD86B' : '#D9A066');
      ['#E8323C', '#B9DD52', '#FF9A1F'].forEach((col, i) => { const bx = Math.round(sx + c * (-5 + i * 5)), by = Math.round(sy + sn * (-5 + i * 5)); R(INK, bx - 2, by - 2, 5, 5); R(col, bx - 1, by - 1, 3, 3); R('#FFFFFF', bx - 1, by - 1, 1, 1); });
      continue;
    }
    const col = SHOT_COL[s.k] || '#FFFFFF', t = s.trail;
    if (t) for (let i = Math.max(0, t.length - 6); i < t.length; i += 2) { ctx.globalAlpha = 0.25 + 0.12 * (i - t.length + 6); R(s.aw ? '#FFD86B' : col, X(t[i]), Y(t[i + 1]), 2, 2); } ctx.globalAlpha = 1;
    if (s.k === 'star') { const big = Math.floor(B.t * 12 + s.x) % 2; R(INK, sx - 2, sy - 2, 5, 5); if (big) { R(col, sx - 2, sy, 5, 1); R(col, sx, sy - 2, 1, 5); R('#FFFFFF', sx, sy, 1, 1); } else { R(col, sx - 1, sy - 1, 3, 3); R('#FFFFFF', sx - 1, sy - 1, 1, 1); } }
    else { R(INK, sx - 1, sy - 2, 3, 5); R(INK, sx - 2, sy - 1, 5, 3); R(col, sx - 1, sy - 1, 3, 3); R(s.k === 'lemon' ? '#FFFFC0' : '#FFD9E6', sx - 1, sy - 1, 1, 1); }
  }
  for (const s of B.foeShots) { const sx = X(s.x), sy = Y(s.y); R(INK, sx - 2, sy - 3, 5, 7); R(INK, sx - 3, sy - 2, 7, 5); R('#B14FE0', sx - 2, sy - 2, 5, 5); R('#F0C8FF', sx - 1, sy - 1, 2, 2); }
  /* 던진 초코 폭탄, 떨어지는 지팡이 사탕 */
  for (const L of B.lobs) {
    const k = Math.max(0, Math.min(1, L.t / L.dur)), tx0 = X(L.x), ty0 = Y(L.y);
    if (L.k === 'bomb') {
      const bx = Math.round(X(L.x0) + (tx0 - X(L.x0)) * k), by = Math.round(Y(L.y0) + (ty0 - Y(L.y0)) * k - Math.sin(k * Math.PI) * 26), s2 = L.mini ? 2 : 3;
      R('rgba(14,6,20,.5)', tx0 - 3, ty0 + 1, 6, 1); pcircle(tx0, ty0, Math.round(L.r / WP * k), 'rgba(255,107,61,.5)');
      R(INK, bx - s2 - 1, by - s2 - 1, s2 * 2 + 3, s2 * 2 + 3); R('#6B3A1E', bx - s2, by - s2, s2 * 2 + 1, s2 * 2 + 1); R('#A0663C', bx - s2, by - s2, 2, 2); if (Math.floor(B.t * 20) % 2) R('#FFD23F', bx + s2, by - s2 - 2, 1, 1);
    } else {
      if (L.t < 0) continue;
      const r = Math.round(L.r / WP); pcircle(tx0, ty0, Math.max(1, Math.round(r * (0.4 + 0.6 * k))), k > 0.7 ? '#FFFFFF' : '#FF8FA8');
      const cy0 = Math.round(ty0 - 90 * (1 - k)), sx = tx0;
      R(INK, sx - 2, cy0 - 18, 5, 19); for (let j = 0; j < 17; j++) R(Math.floor((j + B.t * 30) / 3) % 2 ? '#E8323C' : '#FFFFFF', sx - 1, cy0 - 17 + j, 3, 1);
      R(INK, sx - 1, cy0 - 21, 7, 4); R('#FFFFFF', sx, cy0 - 20, 4, 2); R('#E8323C', sx + 3, cy0 - 19, 2, 3);
    }
  }
  /* 효과 */
  for (const f of B.fx) {
    const k = Math.max(0, f.life / f.max), fx = X(f.x), fy = Y(f.y);
    if (f.k === 'dot') { const s = Math.max(1, Math.round(f.r / WP * (0.5 + 0.5 * k))); R(f.col, fx, fy, s, s); }
    else if (f.k === 'line') pline(fx, fy, X(f.x - f.vx * 0.04), Y(f.y - f.vy * 0.04), f.col);
    else if (f.k === 'star') pstar(fx, fy, k > 0.5 ? 2 : 1, f.col);
    else if (f.k === 'bolt') {   /* 솜사탕 번개: 지그재그 줄기 */
      for (let i = 1; i < f.pts.length; i++) { const [ax, ay] = f.pts[i - 1], [bx, by] = f.pts[i], mx = (ax + bx) / 2 + rand(-10, 10), my = (ay + by) / 2 + rand(-10, 10);
        for (const [c, t] of [[k > 0.5 ? '#FF8FD0' : '#C77DFF', 3], [k > 0.4 ? '#FFFFFF' : '#FFE7F0', 1]]) { pline(X(ax), Y(ay), X(mx), Y(my), c, t); pline(X(mx), Y(my), X(bx), Y(by), c, t); }
        pstar(X(bx), Y(by), 2, '#FFFFFF'); }
    }
    else if (f.k === 'slash') {   /* 치명타: 맞은 자리를 가르는 X자 섬광 */
      const L = Math.round(16 * (k > 0.5 ? 1 : k * 2)), a = f.a + 0.785;
      for (const b of [a, a + 1.571]) { const c = Math.cos(b), s2 = Math.sin(b); pline(Math.round(fx - c * L), Math.round(fy - s2 * L), Math.round(fx + c * L), Math.round(fy + s2 * L), INK, 3); pline(Math.round(fx - c * L), Math.round(fy - s2 * L), Math.round(fx + c * L), Math.round(fy + s2 * L), k > 0.6 ? '#FFFFFF' : '#FFD86B', 1); }
    }
    else if (f.k === 'pop') {    /* 처치: 8방향으로 뻗는 빛살 */
      const r0 = Math.round(f.r / WP * (1 - k) * 1.2), r1 = r0 + Math.max(2, Math.round(5 * k));
      for (let i = 0; i < 8; i++) { const b = i * 0.785, c = Math.cos(b), s2 = Math.sin(b); pline(Math.round(fx + c * r0), Math.round(fy + s2 * r0), Math.round(fx + c * r1), Math.round(fy + s2 * r1), i % 2 ? f.col : '#FFFFFF', k > 0.5 ? 2 : 1); }
      if (k > 0.7) pdisc(fx, fy, 2, '#FFFFFF');
    }
    else if (f.k === 'flash') { const r = Math.max(1, Math.round(f.r / WP * (1.2 - 0.5 * k))); pdisc(fx, fy, r, f.col); pstar(fx, fy, r + 2, f.col); }
    else if (f.k === 'ghost') { if (Math.floor(k * 8) % 2 === 0) spr(f.img, f.x, f.y, f.flip, true, Math.round((1 - k) * 5)); }
    else if (f.k === 'beam') {
      /* 레벨업 빛기둥 */
      const w = Math.max(1, Math.round(9 * Math.min(1, k * 1.6))) + (Math.floor(B.t * 20) % 2);
      ctx.globalAlpha = 0.45; R('#FFD86B', fx - w, 0, w * 2, fy + 2); ctx.globalAlpha = 1; R('#FFF3C0', fx - Math.ceil(w / 2), 0, w, fy + 2); R('#FFFFFF', fx - 1, 0, 2, fy + 2);
      putDisc(fx, fy + 1, 16 + Math.round((1 - k) * 14), 6 + Math.round((1 - k) * 4), '#FFD86B', 10);
    }
    else if (f.k === 'arc' || f.k === 'spin') {
      /* 롤링핀 궤적: 점으로 찍은 호와 앞쪽 끝의 방망이 */
      const e = 1 - k, spin = f.k === 'spin', a0 = spin ? f.a : f.a - 1.3, a1 = a0 + (spin ? 6.283 * Math.min(1, e * 1.6) : 2.6 * Math.min(1, e * 2.2)), rr = f.r * 0.82 / WP, cx0 = X(f.x), cy0 = Y(f.y - 12);
      for (let a = Math.max(a0, a1 - (spin ? 2.4 : 1.6)); a < a1; a += 1.5 / rr) { const near = a1 - a; R(near < 0.5 ? '#FFFFFF' : spin ? '#FFD86B' : '#FFE1A8', Math.round(cx0 + Math.cos(a) * rr), Math.round(cy0 + Math.sin(a) * rr), near < 0.8 ? 3 : 2, near < 0.8 ? 3 : 2); if (near > 0.5 && near < 1.4) R(spin ? '#FFD86B' : '#FFE1A8', Math.round(cx0 + Math.cos(a) * (rr - 3)), Math.round(cy0 + Math.sin(a) * (rr - 3)), 1, 1); }
      const hx = cx0 + Math.cos(a1) * rr, hy = cy0 + Math.sin(a1) * rr, tx0 = -Math.sin(a1), ty0 = Math.cos(a1);
      pline(Math.round(hx - tx0 * 5), Math.round(hy - ty0 * 5), Math.round(hx + tx0 * 5), Math.round(hy + ty0 * 5), INK, 4); pline(Math.round(hx - tx0 * 4), Math.round(hy - ty0 * 4), Math.round(hx + tx0 * 4), Math.round(hy + ty0 * 4), spin ? '#FFD86B' : '#D9A066', 2);
    }
    else { const r = Math.round((f.r + (f.to - f.r) * (1 - k * k)) / WP); if (r > 0) { pcircle(fx, fy, r, f.col, (f.w || 5) > 5 && k > 0.4 ? 2 : 1); if (k > 0.6 && r > 3) pcircle(fx, fy, r - 2, f.col); } }
  }
  /* 가장자리 그늘, 떠다니는 설탕 가루 */
  ctx.drawImage(vignette(), 0, 0);
  for (let i = 0; i < 14; i++) { const sx = Math.round(((i * 53 + B.t * (4 + i % 5 * 2)) % (lw + 10)) - 5), sy = Math.round(((i * 91 - B.t * (7 + i % 4 * 3)) % lh + lh) % lh); if (Math.sin(B.t * 2 + i) > -0.3) R(i % 3 ? 'rgba(255,231,240,.45)' : 'rgba(201,182,217,.45)', sx, sy, 1, 1); }
  /* 글자, 번쩍임, 조이스틱은 위에 겹친 선명한 판에 그려요 */
  const d = cv2.width / innerWidth, U = PZ * d; tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, cv2.width, cv2.height);
  if (B.flashScr) { const fk = B.flashScr.t / B.flashScr.max; if (fk <= 0) B.flashScr = null; else { tx.fillStyle = `rgba(${B.flashScr.col},${0.4 * fk})`; tx.fillRect(0, 0, cv2.width, cv2.height); } }
  tx.textAlign = 'center';
  for (const t of B.texts) {
    const e = 1 - t.life / t.max, pop = e < 0.12 ? 1 : 0, size = Math.round((t.big ? 12 : 10) * (PXS + pop) * d), sx = Math.round(X(t.x) * U), sy = Math.round(Y(t.y) * U);
    if (t.life < 0.15 && Math.floor(t.life * 40) % 2) continue;
    tx.font = `${size}px ${t.big ? 'Galmuri11B' : 'Galmuri9'}, sans-serif`; tx.fillStyle = INK;
    for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) tx.fillText(t.t, sx + a * U, sy + b * U);
    tx.fillStyle = t.col === '#4A2040' ? '#FFFFFF' : t.col; tx.fillText(t.t, sx, sy);
  }
  if (B.joy) { const q = v => Math.round(v * d); tx.strokeStyle = 'rgba(255,243,230,.5)'; tx.lineWidth = U; tx.setLineDash([U * 2, U * 2]); tx.beginPath(); tx.arc(q(B.joy.ox), q(B.joy.oy), 46 * d, 0, 6.283); tx.stroke(); tx.setLineDash([]); const kx = q(B.joy.ox + B.joy.dx * 46), ky = q(B.joy.oy + B.joy.dy * 46), s = 16 * d; tx.fillStyle = INK; tx.fillRect(kx - s - U, ky - s - U, (s + U) * 2, (s + U) * 2); tx.fillStyle = '#FF4F9A'; tx.fillRect(kx - s, ky - s, s * 2, s * 2); tx.fillStyle = '#FFB0D2'; tx.fillRect(kx - s, ky - s, s * 2, U); }
  /* 위쪽 표시 */
  const left = Math.max(0, Math.ceil((B.bossAt > 0 && !B.big ? B.bossAt : B.dur) - B.t));
  if (left !== B.hudT) { B.hudT = left; $('#timer').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; }
  const hk = p.hp * 10 + p.max; if (hk !== B.hudHp) { const lost = B.hudHp > 0 && p.hp < Math.floor(B.hudHp / 10); B.hudHp = hk; const e = $('#hearts'); e.innerHTML = heartsHtml(p.hp, p.max); if (lost) { const off = e.children[p.hp]; if (off) off.classList.add('broke'); e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); } }
  const xpK = Math.round(clamp(B.xp / B.need, 0, 1) * 100); if (xpK !== B.hudXp) { B.hudXp = xpK; $('#xpBar').style.transform = `scaleX(${xpK / 100})`; $('#lvText').textContent = `Lv ${B.lvl}`; }
  const xf = B.xpFlash > 0; if (xf !== B.hudXf) { B.hudXf = xf; $('#xpMeter').classList.toggle('gain', xf); }
  if (B.big && !B.big.dead) $('#bossHp').style.transform = `scaleX(${clamp(B.big.hp / B.big.max, 0, 1)})`; else if (B.bigDead) $('#bossBar').hidden = true;
}
let last = 0;
function frame(now) {
  if (!B || headless) return;
  const raw = Math.min(0.05, (now - last) / 1000); last = now;
  if (B.flashScr) B.flashScr.t -= raw;
  if (B.hitstop > 0) B.hitstop -= raw;      // 타격 순간 아주 잠깐 멈춰요
  else {
    let dt = raw; if (B.slow > 0) { B.slow -= raw; dt *= 0.35 + 0.65 * Math.max(0, 1 - B.slow / 0.35); }
    for (let i = 0; i < (window.__dbg.speed || 1); i++) if (B && !B.paused && !B.over) update(dt);
  }
  if (B) { draw(); requestAnimationFrame(frame); }
}
/* 화면 어디든 누른 자리가 조이스틱 중심 */
cv.addEventListener('pointerdown', e => { if (!B || B.paused) return; B.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
cv.addEventListener('pointermove', e => { if (!B || !B.joy || B.joy.id !== e.pointerId) return; let dx = (e.clientX - B.joy.ox) / 46, dy = (e.clientY - B.joy.oy) / 46; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } B.joy.dx = dx; B.joy.dy = dy; });
['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, e => { if (B && B.joy && B.joy.id === e.pointerId) B.joy = null; }));
document.addEventListener('visibilitychange', () => { if (document.hidden && B && !B.paused && !B.over) pauseSheet(); });
function pauseSheet() {
  if (!B || B.over || B.paused) return; B.paused = true; B.joy = null;
  sheet(`<h2 id="cardTitle">잠깐 멈춤</h2><p>이어서 하려면 아래 버튼을 눌러요. 전투 도중에 앱을 끄면 이 전투는 처음부터 다시 해요.</p><button class="cta" type="button" data-act="go" data-pref>이어서 하기</button><button class="btn" type="button" data-act="sound">${S.muted ? '소리 켜기' : '소리 끄기'}</button>`,
    act => { if (act === 'sound') { S.muted = !S.muted; persist(); setMusicVol(); closeSheet(); B.paused = false; pauseSheet(); return; } closeSheet(); B.paused = false; last = performance.now(); });
}
$('#btnPause').addEventListener('click', pauseSheet);

/* ═════ 화면과 카드 창 ═════ */
function show(id) { ['title', 'map', 'battle'].forEach(s => { $('#' + s).hidden = s !== id; }); if (!headless) music(id === 'battle' ? 'battle' : 'map'); }
const overlay = $('#overlay'), cardEl = $('#card');
let onCard = null;
function sheet(html, handler) { cardEl.className = 'card'; cardEl.innerHTML = html; overlay.hidden = false; onCard = handler; cardEl.scrollTop = 0; }
function closeSheet() { overlay.hidden = true; cardEl.innerHTML = ''; onCard = null; cardEl.classList.remove('reward', 'lvl'); }

/* ───── 보상 연출 ───── */
const fxLayer = $('#fx'), calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const CONF = ['#FF5C8A', '#FFD23F', '#86D44A', '#59B8FF', '#C77DFF', '#FFFFFF', '#FF9A1F'];
function confetti(n, x = innerWidth / 2, y = innerHeight * 0.4, spread = 1) {
  if (headless || calm()) return;
  for (let i = 0; i < n; i++) {
    const e = el('i', 'conf'); e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.background = pick(CONF);
    if (Math.random() < 0.3) e.style.borderRadius = '50%';
    fxLayer.appendChild(e);
    const a = rand(-Math.PI, 0), sp = rand(120, 340) * spread, dx = Math.cos(a) * sp, up = Math.sin(a) * sp, r = rand(-720, 720);
    e.animate([{ transform: 'translate(-50%,-50%) rotate(0deg) scale(.4)' }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${up}px)) rotate(${r / 2}deg) scale(1)`, offset: 0.3 }, { transform: `translate(calc(-50% + ${dx * 1.4}px), calc(-50% + ${up + rand(260, 460)}px)) rotate(${r}deg) scale(.9)`, opacity: 0 }],
      { duration: rand(1300, 1900), easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).onfinish = () => e.remove();
  }
}
/* 반짝이: 한 점에서 별가루가 퍼져요 */
function sparkle(x, y, n = 12) {
  if (headless || calm()) return;
  for (let i = 0; i < n; i++) {
    const e = el('i', 'spk'); e.style.left = x + 'px'; e.style.top = y + 'px'; fxLayer.appendChild(e);
    const a = i / n * 6.283 + rand(-.2, .2), d = rand(40, 90);
    e.animate([{ transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(1) rotate(180deg)`, opacity: 1, offset: .6 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.2}px), calc(-50% + ${Math.sin(a) * d * 1.2}px)) scale(0) rotate(240deg)`, opacity: 0 }],
      { duration: 700, easing: 'ease-out', fill: 'forwards' }).onfinish = () => e.remove();
  }
}
/* 카드 뒤집기: 뒷면으로 깔렸다가 하나씩 뒤집혀요. 희귀 카드는 반짝여요 */
function flipReveal() {
  const box = cardEl.querySelector('.opts'); if (!box) return;
  const list = [...box.querySelectorAll('.opt')];
  if (headless || calm()) { list.forEach(o => o.classList.add('shown')); return; }
  box.classList.add('flip', 'lock');
  list.forEach((o, i) => {
    const d = 350 + i * 260; o.style.setProperty('--d', d + 'ms');
    setTimeout(() => { if (o.isConnected) sfx.flip(); }, d + 120);
    setTimeout(() => { if (!o.isConnected) return; o.classList.add('shown'); if (o.classList.contains('r2') || o.classList.contains('lv5') || o.classList.contains('lv10')) { const r = o.getBoundingClientRect(), big = o.classList.contains('lv10'); sfx.rare(); sparkle(r.left + 36, r.top + r.height / 2, big ? 20 : 14); if (big) { sparkle(r.right - 40, r.top + r.height / 2, 14); confetti(24, r.left + r.width / 2, r.top + r.height / 2, .7); } } }, d + 300);
  });
  setTimeout(() => box.classList.remove('lock'), 350 + list.length * 260 + 250);
}
/* 승리 연출: 빛줄기, 큰 글자, 색종이, 골드가 위쪽 지갑으로 날아가요. 누르면 넘어가요 */
function winFx(title, gold, oldGold, next, big) {
  if (headless) { next(); return; }
  const wrap = el('div', 'win' + (big ? ' big' : ''), `<div class="rays"></div><div class="win-t">${title}</div>${gold ? `<div class="win-g"><i>${svg(ICON.coin)}</i>+${gold}</div>` : ''}`);
  fxLayer.appendChild(wrap); sfx.fanfare();
  confetti(big ? 90 : 46, innerWidth / 2, innerHeight * 0.38, big ? 1.4 : 1);
  if (big) setTimeout(() => confetti(60, innerWidth / 2, innerHeight * 0.3, 1.6), 450);
  const chip = $('#goldChip'), N = Math.min(12, Math.max(4, Math.round(gold / 4)));
  let shown = oldGold, done = false;
  const paint = () => { if (chip) chip.innerHTML = `<i>${svg(ICON.coin)}</i>${shown}`; };
  if (gold && chip && chip.offsetParent && !calm()) {
    paint(); const to = chip.getBoundingClientRect(), tx = to.left + 16, ty = to.top + to.height / 2;
    for (let i = 0; i < N; i++) {
      const c = el('i', 'fly', svg(ICON.coin)), sx = innerWidth / 2 + rand(-60, 60), sy = innerHeight * 0.5 + rand(-20, 30); fxLayer.appendChild(c);
      c.style.left = sx + 'px'; c.style.top = sy + 'px';
      const mx = (sx + tx) / 2 + rand(-80, 80), my = Math.min(sy, ty) - rand(20, 90);
      c.animate([{ transform: 'translate(-50%,-50%) scale(0)' }, { transform: 'translate(-50%,-50%) scale(1.2)', offset: .15 }, { transform: `translate(calc(-50% + ${mx - sx}px), calc(-50% + ${my - sy}px)) scale(1)`, offset: .6 }, { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) scale(.6)` }],
        { duration: 750, delay: 450 + i * 60, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'both' }).onfinish = () => {
          c.remove(); if (done) return;
          shown = i === N - 1 ? oldGold + gold : Math.min(oldGold + gold, shown + Math.ceil(gold / N)); paint(); sfx.coinTick();
          chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
        };
    }
  }
  const finish = () => { if (done) return; done = true; wrap.classList.add('out'); setTimeout(() => wrap.remove(), 250); if (gold && chip) { shown = oldGold + gold; paint(); } next(); };
  setTimeout(finish, big ? 2600 : 1900); wrap.addEventListener('pointerdown', finish, { once: true });
}

cardEl.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || !onCard) return; if (b.getAttribute('aria-disabled') === 'true') { sfx.no(); return; } onCard(b.dataset.act, b); });

/* ───── 지도 ───── */
const NODE = {
  battle: { name: '전투', desc: '3분 동안 버텨요. 이기면 골드와 하트 1칸을 받아요.', img: 'jelly' },
  elite: { name: '엘리트 전투', desc: '1분 30초에 딱딱 도넛 기사가 나타나요. 이기면 유물을 받아요.', img: 'donut' },
  boss: { name: '보스: 곰팡이 케이크', desc: '3분에 보스가 나타나요. 잡거나 5분을 버티면 이겨요.', img: 'boss' },
  shop: { name: '상점', desc: '골드로 유물, 무기 손질, 케이크, 코코아를 사요.', icon: 'shop' },
  rest: { name: '휴식처', desc: '하트를 채우거나 무기 하나의 레벨을 올려요.', icon: 'rest' },
  event: { name: '수상한 일', desc: '무슨 일이 생길지 몰라요. 둘 중 하나를 골라요.', icon: 'event' },
  chest: { name: '보물 상자', desc: '유물 1개를 얻어요.', icon: 'chest' }
};
const MAP_ROWS = 8;                      // 보스 앞까지 11층 (보스 칸 id는 ROWS*3)
const diffOf = (row, rows) => row * 7 / rows;   // 층이 늘어도 난이도는 원래처럼 보스 직전 7단계까지만 올라가요
function genMap() {
  const ROWS = MAP_ROWS, on = Array.from({ length: ROWS }, () => [false, false, false]), E = new Set();
  for (let p = 0; p < 4; p++) { let c = p < 3 ? p : rnd(3); for (let r = 0; r < ROWS; r++) { on[r][c] = true; if (r === ROWS - 1) break; let nc = clamp(c + rnd(3) - 1, 0, 2); if (nc !== c && E.has(`${r},${nc}>${c}`)) nc = c; E.add(`${r},${c}>${nc}`); c = nc; } }
  const nodes = {};
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < 3; c++) if (on[r][c]) nodes[r * 3 + c] = { id: r * 3 + c, row: r, col: c, jx: rnd(9) - 4, type: 'battle', next: [] };
  E.forEach(k => { const [a, b] = k.split('>'), [r, c] = a.split(',').map(Number); nodes[r * 3 + c].next.push((r + 1) * 3 + Number(b)); });
  const BOSS = ROWS * 3; nodes[BOSS] = { id: BOSS, row: ROWS, col: 1, jx: 0, type: 'boss', next: [] };
  const list = Object.values(nodes);
  list.forEach(n => {
    if (n.type === 'boss') return;
    if (n.row === ROWS - 1) { n.type = 'rest'; n.next = [BOSS]; return; }
    if (n.row === Math.floor(ROWS / 2)) { n.type = 'chest'; return; }
    if (n.row === 0) return;
    const x = Math.random();
    n.type = x < 0.45 ? 'battle' : x < 0.6 ? (n.row >= 2 ? 'elite' : 'battle') : x < 0.76 ? 'event' : x < 0.87 ? 'shop' : x < 0.94 ? 'chest' : 'rest';
  });
  const need = (type, rows) => { if (list.some(n => n.type === type)) return; const pool = list.filter(n => n.type === 'battle' && rows.includes(n.row)); if (pool.length) pick(pool).type = type; };
  need('elite', [2, 3, 5, 6]); need('shop', [2, 3, 5, 6]); need('event', [1, 2, 3, 5]);
  if (list.filter(n => n.type === 'elite').length < 2) need2('elite', [5, 6]);
  if (list.filter(n => n.type === 'shop').length < 2) need2('shop', [5, 6]);
  function need2(type, rows) { const pool = list.filter(n => n.type === 'battle' && rows.includes(n.row)); if (pool.length) pick(pool).type = type; }
  return { nodes, rows: ROWS };
}
const canGo = id => { const n = run.map.nodes[id]; if (run.done.includes(id)) return false; return run.at == null ? n.row === 0 : run.map.nodes[run.at].next.includes(id); };
const mapRows = () => run.map.rows || 7;
const xy = n => [n.type === 'boss' ? 50 : [18, 50, 82][n.col] + n.jx, (1 - n.row / mapRows()) * 100];
let picked = null;
function renderBar() {
  $('#hpChip').innerHTML = heartsHtml(run.hp, run.maxHp);
  $('#goldChip').innerHTML = `<i>${svg(ICON.coin)}</i>${run.gold}`;
  $('#potChip').innerHTML = run.potion ? `<i>${svg(ICON.cocoa)}</i>` : '';
  $('#relics').innerHTML = run.relics.map(id => `<button class="relic" type="button" data-relic="${id}" aria-label="${RELICS[id].name}">${svg(ICON[RELICS[id].icon])}</button>`).join('');
}
function renderMap() {
  const N = run.map.nodes; let lines = '';
  Object.values(N).forEach(n => n.next.forEach(t => { const [a, b] = xy(n), [c, d] = xy(N[t]), walked = run.done.includes(n.id) && run.done.includes(t); lines += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}"${walked ? ' class="walked"' : ''}/>`; }));
  const m = $('#mapBox'); m.innerHTML = `<div class="map-in" style="height:${mapRows() * 92}px"><svg class="roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg></div>`;
  Object.values(N).forEach(n => {
    const [x, y] = xy(n), d = NODE[n.type], dn = run.done.includes(n.id);
    const b = el('button', `node ${n.type}${dn ? ' done' : ''}${n.id === run.at ? ' here' : ''}${canGo(n.id) ? ' open' : ''}`, d.img ? `<img src="img/${d.img}.png" alt="">` : svg(ICON[d.icon]));
    b.type = 'button'; b.dataset.id = n.id; b.style.left = x + '%'; b.style.top = y + '%'; b.setAttribute('aria-label', d.name + (dn ? ', 지나온 곳' : canGo(n.id) ? ', 지금 갈 수 있는 곳' : ''));
    m.firstElementChild.appendChild(b);
  });
  /* 지금 갈 수 있는 칸이 화면 아래쪽 2/3 지점에 오도록 스크롤해요 */
  const t = m.querySelector('.node.open') || m.querySelector('.node.here');
  if (t) m.scrollTo({ top: t.offsetTop + 56 - m.clientHeight * 0.62, behavior: 'instant' });
}
function info(html, goId) { $('#info').innerHTML = `<div>${html}</div>${goId != null ? `<button class="cta" type="button" id="btnGo" data-id="${goId}">들어가기</button>` : ''}`; }
function showMap() {
  show('map'); renderBar(); picked = null; renderMap();
  if (!run.wpn.length && overlay.hidden) { starterPick(); return; }     // 첫 무기를 고르기 전에 앱을 껐다 켠 경우
  const open = Object.values(run.map.nodes).filter(n => canGo(n.id));
  if (open.length === 1) pickNode(open[0].id, true);
  else info(`<h3>${run.at == null ? '어느 길로 출발할까요?' : '다음엔 어디로 갈까요?'}</h3><p>금빛으로 빛나는 칸이 지금 갈 수 있는 곳이에요. 위아래로 밀어서 지도를 볼 수 있어요. 눌러 보면 어떤 곳인지 알려 줘요. 하트는 3칸이고, 무엇에 맞든 1칸씩 줄어요. 전투에서 이기면 1칸 차요.</p>`);
}
function pickNode(id, quiet) {
  picked = id; const n = run.map.nodes[id], d = NODE[n.type];
  document.querySelectorAll('.node').forEach(b => b.classList.toggle('sel', +b.dataset.id === id));
  if (!quiet) sfx.tap();
  info(`<h3>${d.name}</h3><p>${run.done.includes(id) ? '이미 지나온 곳이에요.' : d.desc}</p>`, canGo(id) ? id : null);
}
$('#mapBox').addEventListener('click', e => { const b = e.target.closest('.node'); if (b) pickNode(+b.dataset.id); });
$('#info').addEventListener('click', e => { const b = e.target.closest('#btnGo'); if (b) enter(+b.dataset.id); });
$('#relics').addEventListener('click', e => { const b = e.target.closest('.relic'); if (!b) return; const r = RELICS[b.dataset.relic]; sfx.tap(); info(`<h3>${r.name}</h3><p>유물. ${r.desc}</p>`); });
function arrive(id) { run.at = id; run.done.push(id); run.floor = run.map.nodes[id].row; persist(); }

/* ───── 무기 보기 ───── */
function weaponSheet() {
  const st = battleStats(), list = run.wpn.map(w => `<div class="opt${w.lv >= 10 ? ' r2' : w.lv >= 5 ? ' r1' : ''}"><span class="ic">${svg(ICON[w.id])}</span><span class="tx"><b>${WEAPONS[w.id].name} Lv${w.lv}${w.lv >= WMAX ? ' (최고)' : ''}</b><span>${wDescFull(w.id)}</span></span></div>`).join('');
  sheet(`<h2 id="cardTitle">내 무기 ${run.wpn.length}개 · Lv ${run.lvl}</h2><p>공격력 ${Math.round(st.dmg * 100)}% · 치명타 ${Math.round(st.crit * 100)}% · 이동 속도 ${Math.round(st.spd * 100)}%</p><div class="opts">${list}</div><button class="cta" type="button" data-act="close" data-pref>닫기</button>`, () => closeSheet());
}
$('#btnDeck').addEventListener('click', () => { sfx.tap(); weaponSheet(); });

/* ───── 칸에 들어가기 ───── */
function enter(id) {
  if (!canGo(id)) return; const n = run.map.nodes[id]; sfx.tap();
  if (n.type === 'battle' || n.type === 'elite' || n.type === 'boss') startBattle(n.type, diffOf(n.row, mapRows()), r => afterBattle(id, r));
  else if (n.type === 'rest') { arrive(id); showMap(); restSheet(); }
  else if (n.type === 'shop') { arrive(id); showMap(); shopSheet(); }
  else if (n.type === 'chest') { arrive(id); showMap(); const r = rollRelic(); if (r) relicSheet(r, '보물 상자를 열었어요', showMap); else { run.gold += 40; renderBar(); noteSheet('보물 상자를 열었어요', '유물을 다 모아서 대신 골드 40을 찾았어요.', 'coin', showMap); } }
  else { arrive(id); showMap(); eventSheet(); }
}
function afterBattle(id, r) {
  if (!r.won) { gameOver(r); return; }
  arrive(id); if (r.kind === 'elite' && r.bigDead) run.elites = (run.elites || 0) + 1;
  run.hp = Math.min(run.maxHp, run.hp + 1 + (has('jar') && r.kind === 'elite' ? 1 : 0));
  const gold = goldGain(18 + 6 * r.floor + (r.kind === 'elite' ? 25 : 0)), oldGold = run.gold; run.gold += gold; persist();
  if (r.kind === 'boss') { victory(r); return; }
  showMap();
  const steps = [next => winFx(r.kind === 'elite' ? '엘리트 격파!' : '승리!', gold, oldGold, next)];
  if (r.kind === 'elite') { const rel = rollRelic(); if (rel) steps.push(next => relicSheet(rel, '엘리트 전투 보상', next)); if (!run.potion && Math.random() < 0.5) steps.push(next => { run.potion = true; noteSheet('따뜻한 코코아를 얻었어요', '하트가 다 없어지면 저절로 마시고 하트 1칸으로 다시 일어나요.', 'cocoa', next); }); }
  for (let i = 0; i < (run.picks || 0); i++) steps.push(next => { run.picks--; levelSheet(rollLevelOpts(), next); });
  const go = () => { const s = steps.shift(); if (s) s(go); else { persist(); showMap(); } };
  go();
}
function relicSheet(id, title, next) {
  const r = RELICS[id]; gainRelic(id); sfx.rare();
  sheet(`<h2 id="cardTitle">${title}</h2><div class="prize"><div class="rays"></div><div class="medal">${svg(ICON[r.icon])}</div></div><div class="opts"><div class="opt r2"><span class="ic">${svg(ICON[r.icon])}</span><span class="tx"><b>유물: ${r.name}</b><span>${r.desc} 이번 모험 내내 이어져요.</span></span></div></div><button class="cta" type="button" data-act="go" data-pref>받기</button>`,
    () => { closeSheet(); next(); });
  cardEl.classList.add('reward'); if (!headless) setTimeout(() => { const m = cardEl.querySelector('.medal'); if (m) { const q = m.getBoundingClientRect(); sparkle(q.left + q.width / 2, q.top + q.height / 2, 16); confetti(30, q.left + q.width / 2, q.top + q.height / 2, .8); } }, 260);
}
function noteSheet(title, text, icon, next) {
  sheet(`<h2 id="cardTitle">${title}</h2><div class="opts"><div class="opt"><span class="ic">${svg(ICON[icon])}</span><span class="tx"><span>${text}</span></span></div></div><button class="cta" type="button" data-act="go" data-pref>확인</button>`, () => { closeSheet(); next(); });
}
/* 가진 무기 하나를 골라 1레벨 올려요 */
function upWeaponSheet(title, done) {
  const can = run.wpn.filter(w => w.lv < WMAX);
  if (!can.length) { done(false); return; }
  sheet(`<h2 id="cardTitle">${title}</h2><p>고른 무기의 레벨이 1 올라요.</p><div class="opts">${can.map((w, i) => wOpt(w.id, i)).join('')}</div>`, (a, b) => { const w = can[+b.dataset.i]; w.lv++; sfx.good(); closeSheet(); done(true); });
}
function restSheet() {
  const heal = has('icepack') ? 3 : 2, can = run.wpn.some(w => w.lv < WMAX);
  sheet(`<div class="pic">${svg(ICON.rest)}</div><h2 id="cardTitle">휴식처</h2><p>따뜻한 오븐 옆에서 쉬어 가요. 하나만 고를 수 있어요.</p><div class="opts"><button class="opt" type="button" data-act="heal" data-pref><span class="ic">${svg(ICON.heart)}</span><span class="tx"><b>푹 쉬기</b><span>하트를 ${heal}칸 채워요. 지금 ${run.hp}/${run.maxHp}칸.</span></span></button><button class="opt" type="button" data-act="up"${can ? '' : ' aria-disabled="true"'}><span class="ic">${svg(ICON.ench)}</span><span class="tx"><b>무기 손질하기</b><span>가진 무기 하나의 레벨이 1 올라요.</span></span></button></div>`,
    act => {
      if (act === 'heal') { run.hp = Math.min(run.maxHp, run.hp + heal); sfx.good(); closeSheet(); persist(); showMap(); return; }
      upWeaponSheet('손질할 무기', () => { persist(); showMap(); });
    });
}
function shopSheet() {
  const rel = rollRelic(), state = { rel: rel ? { id: rel, price: 110, sold: false } : null, pot: !run.potion, heart: true, up: true };
  const row = (act, ic, t, d, price, off) => `<button class="opt" type="button" data-act="${act}"${off || run.gold < price ? ' aria-disabled="true"' : ''}><span class="ic">${svg(ICON[ic])}</span><span class="tx"><b>${t}</b><span>${d}</span></span><em>${price}골드</em></button>`;
  const draw = () => sheet(`<div class="pic">${svg(ICON.shop)}</div><h2 id="cardTitle">상점</h2><p>가진 골드는 ${run.gold}이에요.</p><div class="opts">`
    + (state.rel && !state.rel.sold ? row('relic', RELICS[state.rel.id].icon, `유물: ${RELICS[state.rel.id].name}`, RELICS[state.rel.id].desc, state.rel.price).replace('class="opt"', 'class="opt r2"') : '')
    + (state.up ? row('up', 'ench', '무기 손질', '가진 무기 하나의 레벨이 1 올라요.', 90, !run.wpn.some(w => w.lv < WMAX)) : '')
    + (state.heart ? row('heart', 'heart', '딸기 케이크 한 조각', '하트를 1칸 채워요.', 45, run.hp >= run.maxHp) : '')
    + (state.pot ? row('pot', 'cocoa', '따뜻한 코코아', '하트가 다 없어지면 저절로 마시고 다시 일어나요. 하나만 들 수 있어요.', 60) : '')
    + `</div><button class="cta" type="button" data-act="leave" data-pref>상점 나가기</button>`,
    act => {
      if (act === 'leave') { closeSheet(); persist(); showMap(); return; }
      if (act === 'relic') { run.gold -= state.rel.price; state.rel.sold = true; gainRelic(state.rel.id); }
      else if (act === 'pot') { run.gold -= 60; run.potion = true; state.pot = false; }
      else if (act === 'heart') { run.gold -= 45; run.hp = Math.min(run.maxHp, run.hp + 1); state.heart = false; }
      else if (act === 'up') { upWeaponSheet('손질할 무기', ok => { if (ok) { run.gold -= 90; state.up = false; sfx.coin(); } renderBar(); draw(); }); return; }
      sfx.coin(); renderBar(); draw();
    });
  draw();
}
function eventSheet() {
  const EVENTS = [
    { title: '수상한 오븐', text: '혼자 달궈진 오븐에서 좋은 냄새가 나요. 손을 넣으면 데일 것 같아요.', a: ['손을 넣어 꺼내기', '하트를 1칸 잃고 가진 무기 하나가 1레벨 올라요. 마지막 1칸은 남아요.', () => { run.hp = Math.max(1, run.hp - 1); const c = run.wpn.filter(w => w.lv < WMAX); if (c.length) pick(c).lv++; }], b: ['그냥 지나가기', '바닥에 떨어진 골드 15만 주워요.', () => { run.gold += 15; }] },
    { title: '길 잃은 마카롱 상인', text: '보따리를 멘 마카롱이 물건 하나를 싸게 넘기겠다고 해요.', a: ['골드 45에 사기', '유물 1개를 얻어요.', () => { const r = rollRelic(); run.gold -= 45; if (r) gainRelic(r); }, () => run.gold >= 45 && !!rollRelic()], b: ['정중히 거절하기', '아무 일도 일어나지 않아요.', () => {}] },
    { title: '설탕 샘', text: '반짝이는 설탕물이 솟는 샘을 찾았어요. 한 가지만 할 수 있어요.', a: ['한 모금 마시기', '하트를 2칸 채워요.', () => { run.hp = Math.min(run.maxHp, run.hp + 2); }], b: ['병에 담아 가기', '경험치 보석 한 움큼을 얻어요. 다음 전투가 시작되면 바로 들어와요.', () => { run.xp += needOf(run.lvl) * 0.8; }] }
  ];
  const ev = pick(EVENTS), row = (k, o) => `<button class="opt" type="button" data-act="${k}"${o[3] && !o[3]() ? ' aria-disabled="true"' : ''}${k === 'b' ? ' data-pref' : ''}><span class="tx"><b>${o[0]}</b><span>${o[1]}</span></span></button>`;
  sheet(`<div class="pic">${svg(ICON.event)}</div><h2 id="cardTitle">${ev.title}</h2><p>${ev.text}</p><div class="opts">${row('a', ev.a)}${row('b', ev.b)}</div>`,
    act => { ev[act][2](); sfx.good(); closeSheet(); persist(); showMap(); });
}

/* ───── 모험의 시작과 끝 ───── */
function newRun() {
  const hearts = 3 + M('hp');
  run = S.run = { map: genMap(), at: null, done: [], floor: 0, hp: hearts, maxHp: hearts, gold: 30, potion: true, kills: 0, elites: 0,
    wpn: [], lvl: 1, xp: 0, bonus: { spd: 0, dmg: 0, crit: 0 }, rerolls: 2 * M('reroll'), relics: ['cape'] };
  persist(); showMap();
  sheet(`<div class="pic"><img src="img/hero.png" alt=""></div><h2 id="cardTitle">간식 왕국을 지켜요</h2><p>곰팡이 케이크가 간식들을 상하게 만들고 있어요. 길을 골라 올라가서 케이크를 물리쳐요.</p><p>전투에서는 화면을 누른 채 끌어서 움직이기만 하면 돼요. 공격은 저절로 나가요. 레벨이 오르면 무기와 능력을 골라요. 고른 것은 모험이 끝날 때까지 이어져요.</p><button class="cta" type="button" data-act="go" data-pref>출발하기</button>`, () => { sfx.tap(); starterPick(); });
}
/* 출발할 때 첫 무기를 골라요 (성장 트리에 따라 하나 더, 또는 Lv3으로) */
function starterPick(second) {
  const ids = shuffle(['pin', 'cream', 'lemon', 'skewer', 'choco', 'cotton', 'cane'].filter(id => !wLv(id))).slice(0, 3);     // 혼자서도 싸울 수 있는 무기 중에서
  sheet(`<h2 id="cardTitle">${second ? '두 번째 무기 고르기' : '첫 무기 고르기'}</h2><p>${second ? '성장 트리 덕분에 무기를 하나 더 들고 가요.' : `무기 1개를 골라 들고 가요.${M('veteran') ? ' 숙련 제빵사라서 Lv3으로 시작해요.' : ''}`}</p><div class="opts">${ids.map((id, i) => wOpt(id, i)).join('')}</div>`,
    (act, b) => {
      if (act !== 'pick' || b.closest('.lock')) return;
      run.wpn.push({ id: ids[+b.dataset.i], lv: !second && M('veteran') ? 3 : 1 }); persist(); sfx.good(); closeSheet();
      if (!second && M('start2')) starterPick(true); else showMap();
    });
  flipReveal();
}
function endStars(r, won) { const n = sugarStars(r, won); S.meta.pts += n; S.meta.total += n; return n; }
function victory(r) {
  const stars = endStars(r, true);
  S.wins++; const kills = run.kills, lvl = run.lvl, nw = run.wpn.length; run = S.run = null; persist();
  show('title'); renderTitle(); winFx('왕국을 지켰어요!', 0, 0, () => {}, true); setTimeout(() => confetti(50, innerWidth / 2, innerHeight * 0.3, 1.3), 1500);
  sheet(`<div class="pic"><img src="img/hero.png" alt=""></div><h2 id="cardTitle">간식 왕국을 지켰어요!</h2><p>${r.bigDead ? '곰팡이 케이크를 물리쳤어요.' : '곰팡이 케이크의 공격을 끝까지 버텨 냈어요.'} 적 ${kills}마리를 잡았고, Lv ${lvl}, 무기 ${nw}개로 끝까지 왔어요.</p><p class="pts">설탕 별 <b>+${stars}</b>개 · 지금 ${S.meta.pts}개</p><button class="cta" type="button" data-act="tree" data-pref>성장 트리 열기</button><button class="btn" type="button" data-act="go">처음 화면으로</button>`, act => { closeSheet(); if (act === 'tree') treeSheet(); });
}
function gameOver(r) {
  const stars = endStars(r, false);
  const kills = run.kills, floor = run.floor + 1; run = S.run = null; persist();
  show('title'); renderTitle();
  sheet(`<div class="pic"><img src="img/${r.kind === 'boss' ? 'boss' : r.kind === 'elite' ? 'donut' : 'jelly'}.png" alt=""></div><h2 id="cardTitle">쓰러졌어요</h2><p>${floor}층에서 쓰러졌어요. 적 ${kills}마리를 잡았어요.</p><p class="pts">설탕 별 <b>+${stars}</b>개 · 지금 ${S.meta.pts}개</p><button class="cta" type="button" data-act="tree" data-pref>성장 트리에서 강해지기</button><button class="btn" type="button" data-act="go">처음 화면으로</button>`, act => { closeSheet(); if (act === 'tree') treeSheet(); });
}
/* ───── 처음 화면, 메뉴, 설치 ───── */
let installEvt = null, newArmed = 0;
const isInstalled = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function renderTitle() {
  const going = !!(S.run && S.run.map);
  $('#btnContinue').hidden = !going;
  const b = $('#btnNew'); b.className = going ? 'btn' : 'cta green'; b.textContent = going ? '새 모험 떠나기' : '모험 떠나기';
  $('#titleSub').textContent = going ? `${(S.run.floor || 0) + 1}층까지 왔어요. 하트 ${S.run.hp}/${S.run.maxHp}칸, Lv ${S.run.lvl}.` : S.wins ? `간식 왕국을 ${S.wins}번 지켜 냈어요.` : '자동으로 공격하는 전투와, 길을 골라 올라가는 모험.';
  $('#btnTree').textContent = `성장 트리 · 설탕 별 ${S.meta.pts}개`;
  $('#btnInstall').hidden = !installEvt || isInstalled; clearTimeout(newArmed); newArmed = 0;
}
$('#btnContinue').addEventListener('click', () => { run = S.run; sfx.tap(); showMap(); });
$('#btnTree').addEventListener('click', () => { sfx.tap(); treeSheet(() => renderTitle()); });
$('#btnNew').addEventListener('click', () => {
  const b = $('#btnNew');
  if (S.run && S.run.map && !newArmed) { b.textContent = '한 번 더 누르면 지금 모험을 버리고 새로 떠나요'; newArmed = setTimeout(() => { newArmed = 0; b.textContent = '새 모험 떠나기'; }, 3000); return; }
  clearTimeout(newArmed); newArmed = 0; sfx.tap(); newRun();
});
function menuSheet(home) {
  const row = (act, t, d) => `<button class="opt" type="button" data-act="${act}"><span class="tx"><b>${t}</b><span>${d}</span></span></button>`;
  const draw = () => sheet(`<h2 id="cardTitle">메뉴</h2><div class="opts">` + row('sound', S.muted ? '소리 켜기' : '소리 끄기', `지금은 소리가 ${S.muted ? '꺼져' : '켜져'} 있어요.`)
    + (navigator.vibrate ? row('vib', S.vib ? '진동 끄기' : '진동 켜기', `지금은 진동이 ${S.vib ? '켜져' : '꺼져'} 있어요.`) : '')
    + row('music', S.music === false ? '배경음악 켜기' : '배경음악 끄기', `지금은 배경음악이 ${S.music === false ? '꺼져' : '켜져'} 있어요.`)
    + (home ? row('home', '처음 화면으로 가기', '모험은 저장돼 있어서 이어서 할 수 있어요.') : '') + `</div><button class="cta" type="button" data-act="close" data-pref>닫기</button>`,
    act => { if (act === 'music') { S.music = S.music === false; persist(); setMusicVol(); sfx.tap(); draw(); return; } if (act === 'diff') { const k = Object.keys(DIFF); S.diff = k[(k.indexOf(S.diff) + 1) % k.length]; persist(); sfx.tap(); draw(); } else if (act === 'sound') { S.muted = !S.muted; persist(); setMusicVol(); sfx.tap(); draw(); } else if (act === 'vib') { S.vib = !S.vib; persist(); buzz(20); draw(); } else if (act === 'home') { closeSheet(); show('title'); renderTitle(); } else closeSheet(); });
  draw();
}
$('#btnMenu').addEventListener('click', () => menuSheet(true));
$('#btnSet').addEventListener('click', () => menuSheet(false));
addEventListener('pointerdown', () => { if (!headless && !S.muted) audio(); }, { once: true });
$('#btnInstall').addEventListener('click', () => { if (!installEvt) return; installEvt.prompt(); installEvt = null; $('#btnInstall').hidden = true; });
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; renderTitle(); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  /* 새 버전이 깔리면 전투 중이 아닐 때 저절로 새로 고쳐요 (예전엔 앱을 두 번 껐다 켜야 했어요) */
  const hadCtrl = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadCtrl || reloaded) return; const go = () => { if (B) { setTimeout(go, 2000); return; } reloaded = true; location.reload(); }; go(); });
  navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {});
}
document.addEventListener('gesturestart', e => e.preventDefault());

/* 테스트용: 화면을 그리지 않고 전투 하나를 끝까지 빨리 돌려요 */
window.__dbg = {
  simBattle(kind, floor) { headless = true; startBattle(kind, floor, () => {}); B.auto = true; for (let i = 0; i < 30 * 320 && !B.over; i++) update(1 / 30); const out = B.result; B = null; headless = false; return out; },
  auto(on) { if (B) B.auto = on; }
};

/* 제목과 지도 뒤의 배경: 해 질 녘 과자 도시를 낮은 해상도로 한 번 그려요 */
function drawBg() {
  const c = $('#bgCv'), px = Math.max(2, Math.round(innerWidth / 195)), W = Math.ceil(innerWidth / px), H = Math.ceil(innerHeight / px); c.width = W; c.height = H;
  const q = c.getContext('2d'), r = (col, x, y, w, h) => { q.fillStyle = col; q.fillRect(x, y, w, h); }, hz = Math.round(H * 0.62), stops = ['#1A0E3A', '#3A1858', '#7A2A6E', '#D9566E', '#FF9A6B'];
  for (let y = 0; y < hz; y++) for (let x = 0; x < W; x++) { const t = y / hz * (stops.length - 1), k = Math.floor(t); q.fillStyle = (t - k) * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? stops[Math.min(k + 1, stops.length - 1)] : stops[k]; q.fillRect(x, y, 1, 1); }
  for (let i = 0; i < 60; i++) r(i % 5 ? '#B9A2FF' : '#FFFFFF', (i * 37) % W, (i * 53) % Math.round(hz * 0.55), 1, 1);
  const mx = Math.round(W * 0.72), my = Math.round(H * 0.09); r('#FFE7B0', mx, my, 18, 18); r('#FFE7B0', mx - 2, my + 3, 22, 12); r('#FFE7B0', mx + 3, my - 2, 12, 22); r('#F4C98A', mx + 5, my + 5, 4, 4); r('#F4C98A', mx + 11, my + 10, 3, 3);
  let x = -4, i = 0; while (x < W) { const w = 12 + (i * 7) % 12, h = 40 + (i * 29) % 46; r('#4A1E5E', x, hz - h, w, h + 4); r('#4A1E5E', x + 2, hz - h - 4, w - 4, 4); r('#4A1E5E', x + (w >> 1) - 1, hz - h - 11, 2, 7); for (let k = 0; k < 5; k++) r((i + k) % 3 ? '#FF4F9A' : '#7FE3FF', x + 2 + (k * 5 + i * 3) % (w - 3), hz - h + 6 + (k * 11 + i * 5) % (h - 8), 1, 2); x += w + 3 + (i * 5) % 6; i++; }
  x = -6; i = 0; while (x < W) { const w = 20 + (i * 11) % 22, h = 14 + (i * 13) % 20; r('#2A0E38', x, hz - h, w, h + 4); for (let k = 0; k < w; k += 4) r('#2A0E38', x + k, hz - h - 2, 2, 2); for (let k = 0; k < 3; k++) r('#FFD86B', x + 3 + (k * 7 + i) % (w - 5), hz - h + 4 + (k * 5) % (h - 4), 2, 2); x += w + (i * 3) % 5; i++; }
  r('#1A0E22', 0, hz, W, H - hz); for (let k = 0; k < W; k += 2) r('#2A1838', k, hz, 1, 1);
}
addEventListener('resize', drawBg);
Promise.all([loadImages(), ...Object.values(ICON).concat(HEART_EMPTY).map(pixelIcon), ...(document.fonts ? ['12px Galmuri11', '12px Galmuri11B', '12px Galmuri9'].map(f => document.fonts.load(f, '가0').catch(() => {})) : [])]).then(() => { drawBg(); show('title'); renderTitle(); });
