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
if (false) { r.maxHp = m; }
/* 난이도: 적이 나오는 수, 적 속도, 적 체력, 맞은 뒤 무적 시간, 엘리트·보스 공격 예고 시간 */
const DIFF = {
  easy: { name: '쉬움', spawn: 0.7, spd: 0.85, hp: 0.72, inv: 1.7, warn: 1.3, desc: '적이 적고 느려요. 맞은 뒤 무적 시간이 길어요.' },
  normal: { name: '보통', spawn: 1, spd: 1, hp: 1, inv: 1.3, warn: 1, desc: '원래 난이도예요.' },
  hard: { name: '어려움', spawn: 1.2, spd: 1.08, hp: 1.2, inv: 1.1, warn: 0.85, desc: '적이 많고 빨라요.' }
};
if (!DIFF[S.diff]) S.diff = 'easy';
const DF = () => DIFF[S.diff] || DIFF.easy;
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
let run = null;

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

/* ───── 소리와 진동 ───── */
let ac, bus, noiseBuf;
function audio() {
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); const comp = ac.createDynamicsCompressor(); bus = ac.createGain(); bus.gain.value = 0.8; bus.connect(comp); comp.connect(ac.destination); }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function voice(f, d, o = {}) {
  const a = audio(), t0 = a.currentTime + (o.at || 0), osc = a.createOscillator(), g = a.createGain();
  osc.type = o.type || 'square'; if (osc.type === 'square') o = { ...o, vol: (o.vol || 0.1) * 0.45 }; osc.frequency.setValueAtTime(f, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  osc.connect(g); g.connect(bus); osc.start(t0); osc.stop(t0 + d + 0.05);
}
function hiss(d, o = {}) {
  const a = audio(), t0 = a.currentTime + (o.at || 0);
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const src = a.createBufferSource(), flt = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf; src.loop = true; flt.type = o.type || 'bandpass'; flt.Q.value = o.q || 0.8; flt.frequency.setValueAtTime(o.f || 3000, t0);
  if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(flt); flt.connect(g); g.connect(bus); src.start(t0, Math.random() * 0.5); src.stop(t0 + d + 0.05);
}
const bell = (f, d, vol = 0.08, at = 0) => { voice(f, d, { vol, at }); voice(f * 2.76, d * 0.6, { vol: vol * 0.35, at }); };
let headless = false;                         // 테스트용 빠른 진행에서는 소리와 연출을 건너뛰어요
const lastPlayed = {};
function play(name, fn, gap = 0) {
  if (headless || S.muted) return;
  const now = performance.now(); if (gap && now - (lastPlayed[name] || 0) < gap) return; lastPlayed[name] = now;
  try { fn(); } catch (e) { if (window.__soundDebug) throw e; }
}
function buzz(p) { if (headless || !S.vib || !navigator.vibrate) return; try { navigator.vibrate(p); } catch (e) {} }
const sfx = {
  hit() { play('hit', () => { const k = rand(0.85, 1.2); hiss(.035, { type: 'highpass', f: 2600 * k, vol: .07 }); voice(170 * k, .07, { to: 70, vol: .12 }); voice(560 * k, .04, { to: 300, type: 'triangle', vol: .04 }); }, 40); },
  crit() { play('crit', () => { voice(1200, .07, { to: 1800, type: 'square', vol: .035 }); hiss(.06, { type: 'highpass', f: 4000, vol: .08 }); voice(130, .12, { to: 50, vol: .18 }); }, 70); },
  kill() { play('kill', () => { const k = rand(0.9, 1.15); voice(820 * k, .1, { to: 300, vol: .08 }); voice(210 * k, .12, { to: 60, vol: .16 }); hiss(.08, { f: 1500, to: 500, vol: .09 }); }, 45); buzz(8); },
  bigKill() { play('bigKill', () => { voice(90, .7, { to: 35, vol: .28 }); hiss(.6, { type: 'lowpass', f: 3000, to: 150, vol: .2 }); [784, 1047, 1318, 1568].forEach((f, i) => bell(f, .35, .07, .15 + i * .07)); }); buzz([30, 30, 90]); },
  gem(k = 0) { play('gem', () => { const f = 880 * Math.pow(1.06, Math.min(k, 14)); voice(f, .07, { vol: .045 }); voice(f * 2, .05, { vol: .02, at: .02 }); }, 35); },
  swing() { play('swing', () => hiss(.12, { f: 900, to: 2600, vol: .07 }), 80); },
  shot() { play('shot', () => voice(640, .05, { to: 900, vol: .035 }), 90); },
  hurt() { play('hurt', () => { voice(220, .3, { to: 70, type: 'triangle', vol: .2 }); voice(110, .35, { to: 40, vol: .22 }); hiss(.2, { type: 'lowpass', f: 1600, to: 200, vol: .14 }); }); buzz([70, 40, 50]); },
  block() { play('block', () => { bell(1046, .25, .09); hiss(.06, { f: 5000, vol: .06 }); }); buzz(20); },
  level() { play('level', () => { voice(220, .5, { to: 880, type: 'triangle', vol: .08 }); hiss(.5, { f: 600, to: 6000, vol: .06 }); [523, 659, 784, 1047, 1319].forEach((f, i) => bell(f, .45, .08, .28 + i * .06)); voice(130, .4, { to: 50, vol: .2, at: .28 }); }); buzz([15, 30, 25, 30, 60]); },
  warn() { play('warn', () => { voice(330, .14, { type: 'square', vol: .05 }); voice(330, .14, { type: 'square', vol: .05, at: .2 }); }, 300); },
  slam() { play('slam', () => { voice(120, .4, { to: 45, vol: .24 }); hiss(.3, { type: 'lowpass', f: 2000, to: 200, vol: .16 }); }); buzz(60); },
  boss() { play('boss', () => { voice(98, .9, { to: 62, type: 'triangle', vol: .2 }); hiss(.9, { type: 'lowpass', f: 300, to: 1600, vol: .1 }); }); buzz(120); },
  revive() { play('revive', () => { [392, 523, 659, 784, 1047].forEach((f, i) => bell(f, .4, .09, i * .08)); }); buzz([40, 40, 80]); },
  flip() { play('flip', () => { hiss(.09, { f: 1200, to: 4200, vol: .07 }); voice(900, .04, { to: 1300, type: 'triangle', vol: .05, at: .06 }); }, 60); buzz(6); },
  rare() { play('rare', () => { [1047, 1319, 1568, 2093].forEach((f, i) => bell(f, .5, .07, i * .06)); hiss(.4, { type: 'highpass', f: 6000, vol: .05 }); }); buzz([10, 20, 30]); },
  coinTick() { play('coinTick', () => bell(1568 + Math.random() * 300, .12, .05), 45); },
  fanfare() { play('fanfare', () => { [523, 659, 784].forEach((f, i) => voice(f, .16, { type: 'triangle', vol: .1, at: i * .09 })); [1047, 1319, 1568].forEach(f => voice(f, .7, { type: 'triangle', vol: .07, at: .3 })); bell(2093, .8, .05, .32); hiss(.5, { type: 'highpass', f: 5000, vol: .05, at: .3 }); }); buzz([20, 30, 20, 30, 80]); },
  tap() { play('tap', () => voice(660, .05, { to: 880, vol: .06 })); buzz(6); },
  coin() { play('coin', () => { bell(1318, .2, .07); bell(1760, .3, .07, .07); }); },
  good() { play('good', () => { [784, 1047, 1318].forEach((f, i) => bell(f, .4, .08, i * .08)); }); buzz([15, 30, 30]); },
  no() { play('no', () => { voice(200, .08, { to: 150, type: 'triangle', vol: .1 }); voice(160, .1, { to: 115, type: 'triangle', vol: .1, at: .09 }); }); },
  win() { play('win', () => { [523, 659, 784, 1047].forEach((f, i) => { voice(f, .45, { type: 'triangle', vol: .1, at: i * .11 }); }); bell(1568, 1, .08, .5); }); buzz([20, 40, 20, 40, 60]); },
  lose() { play('lose', () => { [392, 349, 294].forEach((f, i) => voice(f, .34, { type: 'triangle', vol: .11, at: i * .17 })); }); buzz([60, 40, 60]); }
};

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
  ench: `<path d="M50 8L60 40L92 50L60 60L50 92L40 60L8 50L40 40Z" fill="#B58CFF" stroke="#6A3FC0" stroke-width="3" stroke-linejoin="round"/>`
};
/* type w = 무기, p = 패시브. rar 0 일반 / 1 고급 / 2 희귀 */
const CARDS = {
  pin: { name: '롤링핀 휘두르기', type: 'w', rar: 0, desc: '가까운 적 쪽으로 롤링핀을 크게 휘둘러요.' },
  cream: { name: '휘핑크림 분사', type: 'w', rar: 0, desc: '가장 가까운 적에게 크림을 쏴요.' },
  star: { name: '별사탕 산탄', type: 'w', rar: 0, desc: '움직이는 방향으로 별사탕 3알을 뿌려요.' },
  macaron: { name: '마카롱 회전', type: 'w', rar: 1, desc: '마카롱 2개가 몸 주위를 돌며 부딪혀요.' },
  honey: { name: '꿀 장판', type: 'w', rar: 1, desc: '3초마다 발밑에 꿀을 깔아요. 적이 느려지고 다쳐요.' },
  lemon: { name: '레몬즙 물총', type: 'w', rar: 1, desc: '가까운 적에게 쏴서 산성을 2 쌓아요. 산성은 계속 피해를 줘요.' },
  skewer: { name: '탕후루 꼬치', type: 'w', rar: 2, desc: '움직이는 방향으로 적을 전부 꿰뚫는 꼬치를 던져요.' },
  hands: { name: '날쌘 손', type: 'p', rar: 1, desc: '쏘는 무기의 발사 수가 1 늘어요.' },
  sour: { name: '새콤 촉진', type: 'p', rar: 2, desc: '산성이 2배로 쌓여요.' },
  dough: { name: '든든한 반죽', type: 'p', rar: 1, desc: '전투 중 하트가 1칸 늘어요.' },
  magnet: { name: '설탕 자석', type: 'p', rar: 0, desc: '경험치 보석을 더 멀리서 끌어와요.' },
  glove: { name: '오븐 장갑', type: 'p', rar: 0, desc: '맞은 뒤 무적 시간이 50% 늘어요.' }
};
const ENCH = {
  pierce: { name: '관통', desc: '쏘는 무기는 적을 2마리 더 뚫고, 그 밖의 무기는 범위가 넓어져요.' },
  split: { name: '분열', desc: '이 무기로 적을 잡으면 파편 2개가 튀어 나가요.' },
  acid: { name: '산성 부여', desc: '이 무기에 맞은 적에게 산성이 1 쌓여요.' }
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
const cardLabel = c => CARDS[c.id].name + (c.plus ? '+' : '') + (c.ench ? ` (${ENCH[c.ench].name})` : '');
/* Lv5 각성: 무기마다 모양과 효과가 바뀌어요 */
const AWAKE = {
  pin: '한 바퀴 빙 돌며 휘두르고 충격파가 퍼져요.',
  cream: '맞은 자리에 크림 웅덩이가 생겨 적이 느려져요.',
  star: '별사탕이 적에 맞으면 옆 적으로 2번 튕겨요.',
  macaron: '2.5초마다 마카롱이 터져 주변에 피해를 줘요.',
  honey: '꿀 장판이 나를 따라다니고 더 넓어져요.',
  lemon: '산성이 쌓인 적이 죽으면 터지며 주변에 산성이 옮아요.',
  skewer: '꼬치가 부메랑처럼 돌아오며 한 번 더 꿰뚫어요.'
};
const HERO_R = 6.5;              // 주인공이 맞는 범위 (몸 크기보다 작게)
const AW = 5, WMAX = 8, awake = w => w.lv >= AW;
const cardDesc = c => CARDS[c.id].desc + (c.plus ? ' 강화돼서 더 세요.' : '') + (c.ench ? ' ' + ENCH[c.ench].desc : '') + (AWAKE[c.id] ? ` 각성(전투 중 Lv5): ${AWAKE[c.id]}` : '');
const TYPE = { w: '무기', p: '패시브' }, RAR = ['일반', '고급', '희귀'];
function cardOpt(c, i, o = {}) {
  const d = CARDS[c.id];
  return `<button class="opt r${d.rar}${o.on ? ' on' : ''}" type="button" data-act="${o.act || 'pick'}" data-i="${i}"${o.off ? ' aria-disabled="true"' : ''}${o.pref ? ' data-pref' : ''}><span class="ic">${svg(ICON[c.id])}</span><span class="tx"><b>${cardLabel(c)}</b><span>${RAR[d.rar]} ${TYPE[d.type]}. ${cardDesc(c)}</span></span>${o.price != null ? `<em>${o.price}골드</em>` : ''}</button>`;
}
function rollCard(minRar = 0) {
  const have = new Set(run.deck.filter(c => CARDS[c.id].type === 'p').map(c => c.id));
  const x = Math.random(), rar = Math.max(minRar, x < 0.6 ? 0 : x < 0.9 ? 1 : 2);
  const pool = Object.keys(CARDS).filter(id => CARDS[id].rar === rar && !have.has(id));
  const all = Object.keys(CARDS).filter(id => !have.has(id));
  return { id: pick(pool.length ? pool : all), plus: false, ench: null };
}
function rollCards(n, minRar) { const out = []; for (let g = 0; out.length < n && g < 40; g++) { const c = rollCard(minRar); if (!out.some(o => o.id === c.id)) out.push(c); } return out; }
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
let vw = 390, vh = 780, PXS = 2, lw = 195, lh = 390;      // PXS: 픽셀 한 칸의 화면 크기, lw·lh: 낮은 해상도 화면 크기
function resize() {
  const w = window.innerWidth, h = window.innerHeight, d = Math.min(2, window.devicePixelRatio || 1);
  PXS = Math.max(2, Math.round(w / 195)); lw = Math.ceil(w / PXS); lh = Math.ceil(h / PXS);
  cv.width = lw; cv.height = lh; cv.style.width = lw * PXS + 'px'; cv.style.height = lh * PXS + 'px'; ctx.imageSmoothingEnabled = false;
  vw = lw * 2; vh = lh * 2; cv2.width = Math.round(w * d); cv2.height = Math.round(h * d);
}
addEventListener('resize', resize);

function battleStats() {
  const eq = run.equip.map(i => run.deck[i]).filter(Boolean), n = id => eq.filter(c => c.id === id).reduce((s, c) => s + (c.plus ? 1.5 : 1), 0);
  return {
    dmg: has('whisk') ? 1.15 : 1, xp: has('cup') ? 1.25 : 1, spd: has('boots') ? 1.12 : 1,
    proj: Math.round(n('hands')), acid: n('sour') ? 2 * (n('sour') > 1 ? 1.5 : 1) : 1, hpAdd: Math.floor(n('dough')),
    pickup: 58 * (1 + 0.6 * n('magnet')), invK: 1 + 0.5 * n('glove')
  };
}
function startBattle(kind, floor, onEnd) {
  const st = battleStats(), dur = kind === 'boss' ? 300 : 180;
  B = {
    kind, floor, onEnd, t: 0, dur, st, paused: false, over: false,
    p: { x: 0, y: 0, hp: run.hp + st.hpAdd, max: run.maxHp + st.hpAdd, inv: 0, face: 1, dirX: 0, dirY: -1, moving: false, bob: 0, shield: has('cloud') },
    foes: [], shots: [], foeShots: [], gems: [], zones: [], fx: [], texts: [], telegraphs: [],
    weapons: run.equip.map(i => run.deck[i]).filter(c => c && CARDS[c.id].type === 'w').map(c => ({ id: c.id, lv: 1 + (c.plus ? 1 : 0), ench: c.ench, cd: Math.random() * 0.5, ang: 0 })),
    lvl: 1, xp: 0, need: 5, kills: 0, spawnAcc: 0, shake: 0, buffDmg: 1, buffSpd: 1, hitstop: 0, hsCool: 0, slow: 0, flashScr: null, heartPop: 0,
    eliteAt: kind === 'elite' ? 90 : -1, bossAt: kind === 'boss' ? 180 : -1, big: null, bigDead: false, joy: null, hudT: -1, hudHp: -1, hudXp: -1
  };
  if (!headless) {
    show('battle'); resize();
    $('#bossBar').hidden = true; $('#potHud').innerHTML = run.potion ? svg(ICON.cocoa) : '';
    toast(kind === 'boss' ? '3분 뒤에 보스가 나타나요' : kind === 'elite' ? '1분 30초 뒤에 엘리트가 나타나요' : '3분만 버텨요!');
    if (window.__dbg.autoAll) B.auto = true;
    last = performance.now(); requestAnimationFrame(frame);
  }
}
let toastTimer = 0;
function toast(t) { if (headless) return; const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { e.hidden = true; }, 2200); }

function spawnFoe(type, x, y) {
  const d = FOES[type], grow = 1 + 0.2 * B.floor + (B.t / 120) * 0.5;
  const big = type === 'donut' || type === 'boss';
  const f = { type, x, y, r: d.r, hp: d.hp * (big ? 1 + 0.12 * B.floor : grow) * DF().hp, spd: d.spd * DF().spd, dmg: d.dmg * (1 + 0.1 * B.floor), flash: 0, acid: 0, acidT: 0, slow: 0, hitT: {}, ph: Math.random() * 6.28, st: 0, stT: big ? 3 : 0, vx: 0, vy: 0, kx: 0, ky: 0, sq: 0, born: B.t, dead: false };
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

function hurtFoe(f, d, w, ax, ay) {
  if (f.dead) return;
  const crit = Math.random() < 0.12; if (crit) d *= 1.8;
  d *= B.st.dmg * B.buffDmg; f.hp -= d; f.flash = 0.08; f.sq = 0.35;
  if (w && w.ench === 'acid') f.acid += B.st.acid;
  /* 맞은 방향으로 밀려나요 (큰 적은 조금만) */
  let dx = ax, dy = ay; if (dx == null) { dx = f.x - B.p.x; dy = f.y - B.p.y; } const m = Math.hypot(dx, dy) || 1, kb = (f === B.big ? 40 : 230) * (crit ? 1.5 : 1);
  f.kx = dx / m * kb; f.ky = dy / m * kb;
  if (!headless) { const a = Math.atan2(dy, dx); spark(f.x - dx / m * f.r * 0.5, f.y - FOES[f.type].h * 0.35 - dy / m * f.r * 0.3, a, crit ? '#FFE066' : '#FFFFFF', crit); }
  textAdd(f.x, f.y - FOES[f.type].h * 0.8, Math.round(d) + (crit ? '!' : ''), crit ? '#FF9A1F' : '#4A2040', crit);
  if (crit) { sfx.crit(); hitStop(0.045); } else sfx.hit();
  if (f.hp <= 0) killFoe(f, w);
}
function killFoe(f, w) {
  f.dead = true; B.kills++;
  const d = FOES[f.type], col = FOE_COL[f.type], big = f === B.big;
  if (d.xp) { const n = big ? 6 : 1; for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = big ? rand(60, 160) : rand(20, 60); B.gems.push({ x: f.x, y: f.y, v: big ? Math.ceil(d.xp / n) + 1 : d.xp, pull: false, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, z: 4, vz: rand(150, 230), ph: Math.random() * 6.28, px: f.x, py: f.y }); } }
  burst(f.x, f.y - d.h * 0.3, col, big ? 40 : 10, big ? 320 : 190); burst(f.x, f.y - d.h * 0.3, '#FFFFFF', big ? 14 : 4, 120);
  fxAdd({ k: 'ghost', img: d.img, x: f.x, y: f.y + f.r * 0.7, h: d.h, flip: f.x > B.p.x ? -1 : 1, life: big ? 0.5 : 0.2, max: big ? 0.5 : 0.2 });
  fxAdd({ k: 'ring', x: f.x, y: f.y - d.h * 0.3, r: f.r * 0.6, to: f.r * (big ? 5 : 2.6), life: big ? 0.45 : 0.22, max: big ? 0.45 : 0.22, col: big ? '#FFC83D' : '#FFFFFF', w: big ? 8 : 4 });
  if (big) { sfx.bigKill(); B.hitstop = 0.18; B.slow = 0.6; B.shake = 0.6; B.flashScr = { col: '255,255,255', t: 0.25, max: 0.25 }; }
  else { sfx.kill(); hitStop(f.type === 'cookie' ? 0.035 : 0.02); B.shake = Math.max(B.shake, f.type === 'cookie' ? 0.1 : 0.05); }
  if (f.acid > 0 && B.weapons.some(x => x.id === 'lemon' && awake(x))) {   // 레몬 각성: 산성 폭발이 옮아요
    for (const g of B.foes) if (!g.dead && g !== f && (g.x - f.x) ** 2 + (g.y - f.y) ** 2 < 80 * 80) { g.acid += 3 * B.st.acid; g.flash = 0.06; }
    fxAdd({ k: 'ring', x: f.x, y: f.y - d.h * 0.3, r: 10, to: 80, life: 0.3, max: 0.3, col: '#B9DD52', w: 6 }); burst(f.x, f.y - d.h * 0.3, '#C8F06A', 8, 160);
  }
  if (w && w.ench === 'split') for (let i = 0; i < 2; i++) { const a = Math.random() * 6.283; B.shots.push({ k: 'shard', x: f.x, y: f.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 5, dmg: 7, pierce: 0, life: 0.7, w: null, hit: new Set([f]) }); }
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
function nearestFoe(range) { let best = null, bd = range * range; const p = B.p; for (const f of B.foes) { if (f.dead) continue; const d = (f.x - p.x) ** 2 + (f.y - p.y) ** 2; if (d < bd) { bd = d; best = f; } } return best; }
const wDmg = (w, base) => base * (1 + 0.28 * (w.lv - 1));
const area = w => w.ench === 'pierce' ? 1.25 : 1;

function fireWeapons(dt) {
  const p = B.p;
  for (const w of B.weapons) {
    w.cd -= dt;
    if (w.id === 'macaron') {            // 늘 돌고 있어요
      w.ang += dt * (awake(w) ? 4 : 3.2); const n = 2 + (w.lv >= 3 ? 1 : 0) + (w.lv >= 5 ? 1 : 0) + (w.lv >= 7 ? 1 : 0) + B.st.proj, R = (awake(w) ? 66 : 58) * area(w);
      if (awake(w)) { w.burstT = (w.burstT ?? 2.5) - dt; }
      w.orbs = [];
      for (let i = 0; i < n; i++) {
        const a = w.ang + i * 6.283 / n, ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R; w.orbs.push([ox, oy]);
        for (const f of B.foes) { if (f.dead) continue; if ((f.x - ox) ** 2 + (f.y - oy) ** 2 < (f.r + 11) ** 2 && (f.hitT.mac || 0) <= B.t) { f.hitT.mac = B.t + 0.45; hurtFoe(f, wDmg(w, 8), w, f.x - ox, f.y - oy); } }
        if (awake(w) && w.burstT <= 0) { for (const f of B.foes) if (!f.dead && (f.x - ox) ** 2 + (f.y - oy) ** 2 < (f.r + 52) ** 2) hurtFoe(f, wDmg(w, 10), w, f.x - ox, f.y - oy); fxAdd({ k: 'ring', x: ox, y: oy, r: 8, to: 56, life: 0.28, max: 0.28, col: '#FF8FB8', w: 6 }); fxAdd({ k: 'flash', x: ox, y: oy, r: 18, life: 0.1, max: 0.1, col: '#FFFFFF' }); }
      }
      if (awake(w) && w.burstT <= 0) { w.burstT = 2.5; sfx.swing(); B.shake = Math.max(B.shake, 0.06); }
      continue;
    }
    if (w.cd > 0) continue;
    if (w.id === 'pin') {
      const aw = awake(w), R = (72 + 6 * w.lv) * area(w) * (aw ? 1.1 : 1), t = nearestFoe(R + 30);
      if (!t) { w.cd = 0.15; continue; }
      const a = Math.atan2(t.y - p.y, t.x - p.x); w.cd = 1.05;
      for (const f of B.foes) { if (f.dead) continue; const dx = f.x - p.x, dy = f.y - p.y, m = Math.hypot(dx, dy); if (m < R + f.r) { let da = Math.abs(Math.atan2(dy, dx) - a); if (da > Math.PI) da = 6.283 - da; if (aw || da < 1.25) hurtFoe(f, wDmg(w, 15), w, dx, dy); } else if (aw && m < R * 1.6 + f.r) hurtFoe(f, wDmg(w, 6), w, dx, dy); }
      if (aw) { fxAdd({ k: 'spin', x: p.x, y: p.y, a, r: R, life: 0.3, max: 0.3 }); fxAdd({ k: 'ring', x: p.x, y: p.y - 12, r: R * 0.8, to: R * 1.6, life: 0.3, max: 0.3, col: '#FFE1A8', w: 6 }); }
      else fxAdd({ k: 'arc', x: p.x, y: p.y, a, r: R, life: 0.22, max: 0.22 }); B.shake = Math.max(B.shake, 0.04); sfx.swing();
    } else if (w.id === 'cream' || w.id === 'lemon') {
      const t = nearestFoe(300); if (!t) { w.cd = 0.2; continue; }
      const a = Math.atan2(t.y - p.y, t.x - p.x), n = 1 + B.st.proj; w.cd = w.id === 'cream' ? 0.78 : 0.95;
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.16; if (i === 0) fxAdd({ k: 'flash', x: p.x + Math.cos(a) * 18, y: p.y - 10 + Math.sin(a) * 18, r: 11, life: 0.07, max: 0.07, col: w.id === 'cream' ? '#FFFFFF' : '#F4E04D' }); B.shots.push({ k: w.id, x: p.x, y: p.y - 10, vx: Math.cos(aa) * 330, vy: Math.sin(aa) * 330, r: 7, dmg: wDmg(w, w.id === 'cream' ? 10 : 5), acid: w.id === 'lemon' ? 2 : 0, pierce: w.ench === 'pierce' ? 2 : 0, life: 1.2, w, hit: new Set(), aw: awake(w), puddle: w.id === 'cream' && awake(w) }); }
      sfx.shot();
    } else if (w.id === 'star') {
      const a = Math.atan2(p.dirY, p.dirX), n = 3 + B.st.proj + (w.lv >= 4 ? 1 : 0); w.cd = 1.25;
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.22; B.shots.push({ k: 'star', x: p.x, y: p.y - 10, vx: Math.cos(aa) * 300, vy: Math.sin(aa) * 300, r: 7, dmg: wDmg(w, 7), pierce: w.ench === 'pierce' ? 2 : 0, life: 0.9, w, hit: new Set(), aw: awake(w), bounce: awake(w) ? 2 : 0 }); }
      sfx.shot();
    } else if (w.id === 'skewer') {
      const a = Math.atan2(p.dirY, p.dirX), n = 1 + B.st.proj; w.cd = 1.5;
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.14; B.shots.push({ k: 'skewer', x: p.x, y: p.y - 10, vx: Math.cos(aa) * 430, vy: Math.sin(aa) * 430, r: 9, dmg: wDmg(w, 17), pierce: 99, life: awake(w) ? 1.5 : 0.9, w, hit: new Set(), a: aa, aw: awake(w), boom: awake(w) }); }
      sfx.shot();
    } else if (w.id === 'honey') {
      w.cd = 3; B.zones.push({ x: p.x, y: p.y, r: (52 + 4 * w.lv) * area(w) * (awake(w) ? 1.35 : 1), life: 3, tick: 0, dmg: wDmg(w, 5), w, follow: awake(w) });
    }
  }
}

function awakenFx(w) {
  if (headless) return; const p = B.p;
  toast(`${CARDS[w.id].name} 각성!`); sfx.rare();
  fxAdd({ k: 'beam', x: p.x, y: p.y, life: 0.7, max: 0.7 });
  for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283, sp = rand(140, 260); fxAdd({ k: 'star', x: p.x, y: p.y - 26, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7, max: 0.7, col: i % 2 ? '#FFD23F' : '#FFFFFF', r: 6 }); }
  fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 20, to: 170, life: 0.5, max: 0.5, col: '#FFD23F', w: 8 });
}
function levelUp() {
  B.lvl++; B.xp -= B.need; B.need = Math.round(5 + 2.6 * (B.lvl - 1));
  if (has('sprinkle')) { B.foes.forEach(f => { if (!f.dead && (f.x - B.p.x) ** 2 + (f.y - B.p.y) ** 2 < 130 * 130) hurtFoe(f, 30, null); }); fxAdd({ k: 'ring', x: B.p.x, y: B.p.y, r: 10, to: 130, life: 0.3, max: 0.3, col: '#FF8FB8', w: 6 }); }
  const ups = B.weapons.filter(w => w.lv < WMAX).map(w => w.lv + 1 === AW ? { t: 'up', w, aw: true, title: `${CARDS[w.id].name} 각성!`, desc: `Lv${w.lv} → Lv${AW}. ${AWAKE[w.id]}`, icon: w.id } : { t: 'up', w, title: `${CARDS[w.id].name} 강화`, desc: `이번 전투 동안 Lv${w.lv} → Lv${w.lv + 1}. 더 세져요.${w.lv + 2 === AW ? ' 한 번 더 올리면 각성해요!' : ''}`, icon: w.id });
  ups.sort((a, b) => (b.aw ? 1 : 0) - (a.aw ? 1 : 0));
  const buffs = [
    ...(B.p.hp < B.p.max ? [{ t: 'heal', title: '달콤한 한 입', desc: '하트를 1칸 채워요.', icon: 'heart' }] : []),
    { t: 'dmg', title: '설탕 폭주', desc: '이번 전투 동안 주는 피해가 12% 늘어요.', icon: 'star' },
    { t: 'spd', title: '가벼운 발걸음', desc: '이번 전투 동안 10% 빨리 달려요.', icon: 'honey' }
  ];
  const aws = ups.filter(u => u.aw), rest = shuffle(ups.filter(u => !u.aw)); rest.sort((a, b) => b.w.lv - a.w.lv + (Math.random() - 0.5) * 1.5); const opts = aws.slice(0, 1).concat(rest).slice(0, 2).concat(shuffle(buffs)).slice(0, 3);
  const apply = o => { if (o.t === 'up') { o.w.lv++; if (o.w.lv === AW) awakenFx(o.w); } else if (o.t === 'heal') B.p.hp = Math.min(B.p.max, B.p.hp + 1); else if (o.t === 'dmg') B.buffDmg *= 1.12; else B.buffSpd *= 1.1; };
  if (headless) { apply(opts[0]); return; }
  /* 빛기둥, 고리, 별가루, 큰 글자. 주변 적은 밀려나고 잠깐 느려져요 */
  const p = B.p; B.lvlPending = true; sfx.level(); B.slow = 1.1; p.inv = Math.max(p.inv, 1.4);
  fxAdd({ k: 'beam', x: p.x, y: p.y, life: 0.9, max: 0.9 });
  [0, 0.12, 0.24].forEach((dl, i) => fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 16, to: 150 + i * 40, life: 0.5 + dl, max: 0.5 + dl, col: i === 1 ? '#FFFFFF' : '#FFD23F', w: 7 - i * 2 }));
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, sp = rand(160, 300); fxAdd({ k: 'star', x: p.x, y: p.y - 26, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: rand(0.5, 0.8), max: 0.8, col: pick(['#FFD23F', '#FFFFFF', '#FF8FB8', '#8FD3FF']), r: rand(4, 7) }); }
  B.foes.forEach(f => { const dx = f.x - p.x, dy = f.y - p.y, m = Math.hypot(dx, dy) || 1; if (m < 170 && f !== B.big) { f.kx = dx / m * 600; f.ky = dy / m * 600; } });
  B.flashScr = { col: '255,230,140', t: 0.4, max: 0.4 };
  const ban = el('div', 'lvl-ban', `<b>LEVEL UP!</b><span>Lv ${B.lvl}</span>`); fxLayer.appendChild(ban); setTimeout(() => ban.remove(), 760);
  const lv = $('#lvText'); lv.classList.remove('pop'); void lv.offsetWidth; lv.classList.add('pop');
  setTimeout(() => { if (!B || B.over) { if (B) B.lvlPending = false; return; } B.lvlPending = false; B.paused = true; openLevelSheet(); }, 720);
  const openLevelSheet = () => {
  sheet(`<h2 id="cardTitle">레벨 ${B.lvl}!</h2><p>하나를 골라요. 이번 전투가 끝날 때까지 이어져요.</p><div class="opts">${opts.map((o, i) => `<button class="opt${o.aw ? ' r2' : ''}" type="button" data-act="pick" data-i="${i}"><span class="ic">${svg(ICON[o.icon])}</span><span class="tx"><b>${o.title}</b><span>${o.desc}</span></span></button>`).join('')}</div>`,
    (act, b) => { if (b.closest('.lock')) return; apply(opts[+b.dataset.i]); closeSheet(); sfx.good(); B.paused = false; last = performance.now();
      fxAdd({ k: 'ring', x: B.p.x, y: B.p.y - 20, r: 10, to: 90, life: 0.35, max: 0.35, col: '#FFFFFF', w: 5 }); });
  cardEl.classList.add('lvl'); flipReveal();
  };
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
    const sp = 172 * B.st.spd * B.buffSpd * (has('cape') && p.hp <= 1 ? 1.25 : 1), k = Math.min(1, mm);
    p.x += mx / mm * sp * k * dt; p.y += my / mm * sp * k * dt; p.dirX = mx / mm; p.dirY = my / mm; if (Math.abs(mx) > 0.1) p.face = mx > 0 ? 1 : -1; p.bob += dt * 12;
  }
  if (p.inv > 0) p.inv -= dt;
  /* 적 등장 */
  const rate = (0.85 + 2.05 * Math.min(1, B.t / Math.min(120, B.dur))) * (1 + 0.12 * B.floor) * (B.big ? 0.5 : 1) * DF().spawn;
  B.spawnAcc += rate * dt;
  while (B.spawnAcc >= 1 && B.foes.length < 140) { B.spawnAcc -= 1; const pool = ['jelly', 'jelly']; const ramp = Math.min(120, B.dur); if (B.floor >= 1 || B.t > ramp * 0.5) pool.push('ice'); if (B.floor >= 2 || B.t > ramp * 0.75) pool.push('cookie'); spawnRing(pick(pool)); }
  if (B.spawnAcc > 3) B.spawnAcc = 3;
  if (B.eliteAt > 0 && B.t >= B.eliteAt && !B.big) { B.big = spawnRing('donut'); bigIntro(); }
  if (B.bossAt > 0 && B.t >= B.bossAt && !B.big) { B.big = spawnRing('boss'); bigIntro(); }
  /* 적 움직임 */
  for (const f of B.foes) {
    if (f.dead) continue;
    if (f.flash > 0) f.flash -= dt;
    if (f.slow > 0) f.slow -= dt;
    if (f.acid > 0) { f.acidT -= dt; if (f.acidT <= 0) { f.acidT = 0.5; const d = f.acid * 0.9; f.hp -= d * B.st.dmg; f.acid = Math.max(0, f.acid - 0.5); textAdd(f.x, f.y - f.r, Math.round(d), '#7FA81E'); if (f.hp <= 0) { killFoe(f, null); continue; } } }
    let busy = false;
    if (f.type === 'boss') bossThink(f, dt); else if (f.type === 'donut') busy = eliteThink(f, dt);
    const dx = p.x - f.x, dy = p.y - f.y, m = Math.hypot(dx, dy) || 1;
    if (f.sq > 0) f.sq = Math.max(0, f.sq - dt * 3);
    if (f.kx || f.ky) { f.x += f.kx * dt; f.y += f.ky * dt; const dec = Math.exp(-dt * 11); f.kx *= dec; f.ky *= dec; if (Math.abs(f.kx) + Math.abs(f.ky) < 8) f.kx = f.ky = 0; }
    if (!busy) { const sp = f.spd * (f.slow > 0 ? 0.55 : 1) * (f.kx || f.ky ? 0.25 : 1); f.x += dx / m * sp * dt; f.y += dy / m * sp * dt; }
    f.ph += dt * 7;
    if (m < f.r + HERO_R) hurtPlayer(f.type);
    if (m > 900) { const a = Math.random() * 6.283, R = Math.hypot(vw, vh) / 2 + 40; f.x = p.x + Math.cos(a) * R; f.y = p.y + Math.sin(a) * R; }   // 너무 멀어지면 다시 근처로
  }
  /* 서로 겹치지 않게 살짝 밀어내요 */
  const F = B.foes;
  for (let i = 0; i < F.length; i++) { const a = F[i]; if (a.dead) continue; for (let j = i + 1; j < F.length; j++) { const b = F[j]; if (b.dead) continue; const dx = b.x - a.x; if (dx > 40 || dx < -40) continue; const dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy; if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2), push = (rr - d) * 0.5 / d, wa = a === B.big ? 0 : b === B.big ? 2 : 1; a.x -= dx * push * wa; a.y -= dy * push * wa; b.x += dx * push * (2 - wa); b.y += dy * push * (2 - wa); } } }
  fireWeapons(dt);
  /* 내 탄 */
  for (const s of B.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.boom) {            // 부메랑 꼬치: 반쯤 날아가면 나에게 돌아와요
      if (!s.back && s.life < 0.75) { s.back = true; s.hit = new Set(); }
      if (s.back) { const dx = p.x - s.x, dy = p.y - 10 - s.y, d = Math.hypot(dx, dy) || 1; s.vx += (dx / d * 520 - s.vx) * Math.min(1, dt * 6); s.vy += (dy / d * 520 - s.vy) * Math.min(1, dt * 6); s.a = Math.atan2(s.vy, s.vx); if (d < 22) s.life = 0; }
    }
    for (const f of B.foes) { if (f.dead || s.hit.has(f)) continue; if ((f.x - s.x) ** 2 + (f.y - s.y) ** 2 < (f.r + s.r) ** 2) { s.hit.add(f); if (s.acid) f.acid += s.acid * B.st.acid; hurtFoe(f, s.dmg, s.w, s.vx, s.vy);
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
      const d = Math.sqrt(d2) || 1; g.sp = Math.min(900, g.sp + 1500 * dt);     // 살짝 튕겨 나갔다가 빨려 들어와요
      g.x += dx / d * g.sp * dt; g.y += dy / d * g.sp * dt;
      if (d < 18) { g.got = true; B.xp += g.v * B.st.xp * (1 + 0.12 * B.floor); B.gemCombo = B.gemT > 0 ? B.gemCombo + 1 : 0; B.gemT = 0.5; sfx.gem(B.gemCombo); B.xpFlash = 0.25;
        fxAdd({ k: 'flash', x: p.x, y: p.y - 26, r: 12, life: 0.12, max: 0.12, col: g.v >= 5 ? '#FFC2DA' : g.v >= 2 ? '#C9F7B8' : '#BFE6FF' });
        if (Math.random() < 0.5) fxAdd({ k: 'star', x: p.x + rand(-16, 16), y: p.y - rand(20, 50), vx: rand(-30, 30), vy: -70, life: 0.45, max: 0.45, col: '#FFFFFF', r: 5 }); }
    }
  }
  B.gems = B.gems.filter(g => !g.got); if (B.gems.length > 220) B.gems.splice(0, B.gems.length - 220);
  if (B.gemT > 0) B.gemT -= dt; if (B.xpFlash > 0) B.xpFlash -= dt;
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
function bigIntro() { toast(`${FOES[B.big.type].name} 등장!`); sfx.boss(); if (!headless) { $('#bossBar').hidden = false; $('#bossName').textContent = FOES[B.big.type].name; } }

/* 테스트와 구경용 자동 조종: 가까운 적과 위험 표시에서 멀어지고, 보석 쪽으로 살짝 끌려요 */
function autopilot() {
  const p = B.p; let x = 0, y = 0;
  for (const f of B.foes) { const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy) || 1, reach = 120 + f.r; if (d < reach) { const k = (reach - d) / reach; x += dx / d * k * 2; y += dy / d * k * 2; } }
  for (const s of B.foeShots) { const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy) || 1; if (d < 70) { x += dx / d; y += dy / d; } }
  for (const t of B.telegraphs) if (t.k === 'line') { const c = Math.cos(t.a), sn = Math.sin(t.a), rx = p.x - t.f.x, ry = p.y - t.f.y, along = rx * c + ry * sn, side = -rx * sn + ry * c; if (along > -30 && along < t.len + 60 && Math.abs(side) < t.f.r + 50) { const sg = side >= 0 ? 1 : -1; x += -sn * sg * 4; y += c * sg * 4; } }
  for (const s of B.foes) if (s.type === 'donut' && s.st === 2) { const c = Math.cos(s.da), sn = Math.sin(s.da), rx = p.x - s.x, ry = p.y - s.y, side = -rx * sn + ry * c; if (rx * c + ry * sn > 0 && Math.abs(side) < s.r + 50) { const sg = side >= 0 ? 1 : -1; x += -sn * sg * 4; y += c * sg * 4; } }
  for (const t of B.telegraphs) if (t.k === 'circle') { const dx = p.x - t.x, dy = p.y - t.y, d = Math.hypot(dx, dy) || 1; if (d < t.r + 30) { x += dx / d * 3; y += dy / d * 3; } }
  let g = null, gd = 220 * 220; for (const q of B.gems) { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < gd) { gd = d; g = q; } }
  if (g) { const dx = g.x - p.x, dy = g.y - p.y, d = Math.hypot(dx, dy) || 1; x += dx / d * 0.6; y += dy / d * 0.6; }
  if (Math.hypot(x, y) < 0.05) { x = Math.cos(B.t * 0.7); y = Math.sin(B.t * 0.7); }
  return [x, y];
}

function endBattle(won) {
  if (B.over) return; B.over = true;
  const info = { won, kind: B.kind, floor: B.floor, bigDead: B.bigDead, kills: B.kills, time: B.t };
  run.hp = Math.max(won ? 1 : 0, Math.min(run.maxHp, B.p.hp));
  run.kills = (run.kills || 0) + B.kills;
  const cb = B.onEnd;
  if (headless) { B.result = info; return; }
  if (won) sfx.win(); else sfx.lose();
  setTimeout(() => { B = null; cb(info); }, 900);
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
  [[7, 8, '#FF4F9A'], [39, 24, '#7FE3FF'], [22, 44, '#FFD86B']].forEach(([x, y, col]) => { r(col, x, y, 2, 1); });
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
const GEM = { s: gemSprite(2, 3, '#59B8FF', '#CFEFFF', '#2C7FC4'), m: gemSprite(3, 4, '#5CD66A', '#D9FFD0', '#2E9A3C'), l: gemSprite(4, 5, '#FF5C9E', '#FFD0E4', '#C92E6E') };
const GEM_COL = { s: '#59B8FF', m: '#5CD66A', l: '#FF5C9E' };
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
    R('rgba(14,6,20,.45)', gx - 2, gy + 2, 4, 1);
    if (g.pull) { ctx.globalAlpha = 0.6; R(GEM_COL[key], X(g.px - (g.x - g.px)), Y(g.py - (g.y - g.py)) - z, 2, 2); R(GEM_COL[key], X(g.px), Y(g.py) - z, 2, 2); ctx.globalAlpha = 1; }
    ctx.drawImage(G, gx - (G.width >> 1), gy - z - (G.height >> 1));
    if (Math.sin(g.ph * 0.7 + g.x) > 0.95) pstar(gx + 2, gy - z - 3, 1, '#FFFFFF');
  }
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
  for (const w of B.weapons) if (w.id === 'macaron' && w.orbs) for (const [ox, oy] of w.orbs) { if (awake(w)) putDisc(X(ox), Y(oy), 7, 7, '#FFD86B', Math.round(4 + 8 * (1 - Math.max(0, w.burstT) / 2.5))); ctx.drawImage(MAC, X(ox) - 4, Y(oy) - 4); }
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
  /* 효과 */
  for (const f of B.fx) {
    const k = Math.max(0, f.life / f.max), fx = X(f.x), fy = Y(f.y);
    if (f.k === 'dot') { const s = Math.max(1, Math.round(f.r / WP * (0.5 + 0.5 * k))); R(f.col, fx, fy, s, s); }
    else if (f.k === 'line') pline(fx, fy, X(f.x - f.vx * 0.04), Y(f.y - f.vy * 0.04), f.col);
    else if (f.k === 'star') pstar(fx, fy, k > 0.5 ? 2 : 1, f.col);
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
  for (let i = 0; i < 14; i++) { const sx = Math.round(((i * 53 + B.t * (4 + i % 5 * 2)) % (lw + 10)) - 5), sy = Math.round(((i * 91 - B.t * (7 + i % 4 * 3)) % lh + lh) % lh); if (Math.sin(B.t * 2 + i) > -0.3) R(i % 3 ? '#FFE7F0' : '#7FE3FF', sx, sy, 1, 1); }
  /* 글자, 번쩍임, 조이스틱은 위에 겹친 선명한 판에 그려요 */
  const d = cv2.width / innerWidth, U = PXS * d; tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, cv2.width, cv2.height);
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
    act => { if (act === 'sound') { S.muted = !S.muted; persist(); closeSheet(); B.paused = false; pauseSheet(); return; } closeSheet(); B.paused = false; last = performance.now(); });
}
$('#btnPause').addEventListener('click', pauseSheet);

/* ═════ 화면과 카드 창 ═════ */
function show(id) { ['title', 'map', 'battle'].forEach(s => { $('#' + s).hidden = s !== id; }); }
const overlay = $('#overlay'), cardEl = $('#card');
let onCard = null;
function sheet(html, handler) { cardEl.innerHTML = html; overlay.hidden = false; onCard = handler; cardEl.scrollTop = 0; }
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
    setTimeout(() => { if (!o.isConnected) return; o.classList.add('shown'); if (o.classList.contains('r2')) { const r = o.getBoundingClientRect(); sfx.rare(); sparkle(r.left + 36, r.top + r.height / 2, 14); } }, d + 300);
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
  battle: { name: '전투', desc: '3분 동안 버텨요. 끝나면 카드 3장 중 1장을 골라요.', img: 'jelly' },
  elite: { name: '엘리트 전투', desc: '1분 30초에 딱딱 도넛 기사가 나타나요. 잡으면 유물에 더해 인챈트도 받아요.', img: 'donut' },
  boss: { name: '보스: 곰팡이 케이크', desc: '3분에 보스가 나타나요. 잡거나 5분을 버티면 이겨요.', img: 'boss' },
  shop: { name: '상점', desc: '골드로 카드, 유물, 코코아를 사거나 카드를 덱에서 빼요.', icon: 'shop' },
  rest: { name: '휴식처', desc: '하트를 채우거나 카드 1장을 강화해요.', icon: 'rest' },
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

/* ───── 장착 ───── */
function fixEquip() { run.equip = run.equip.filter(i => i < run.deck.length); if (run.deck.length <= 6) run.equip = run.deck.map((_, i) => i); }
function equipSheet(next) {
  fixEquip();
  if (run.deck.length <= 6) { next(); return; }
  const draw = () => sheet(`<h2 id="cardTitle">들고 갈 카드 고르기</h2><p>6장까지 들고 갈 수 있어요. 지금 ${run.equip.length}장 골랐어요.</p><div class="opts">${run.deck.map((c, i) => cardOpt(c, i, { act: 'toggle', on: run.equip.includes(i) })).join('')}</div><button class="cta" type="button" data-act="go" data-pref>전투 시작</button>`,
    (act, b) => {
      if (act === 'go') { if (!run.equip.some(i => CARDS[run.deck[i].id].type === 'w')) { sfx.no(); return; } closeSheet(); persist(); next(); return; }
      const i = +b.dataset.i, at = run.equip.indexOf(i);
      if (at >= 0) run.equip.splice(at, 1); else if (run.equip.length < 6) run.equip.push(i); else { sfx.no(); return; }
      sfx.tap(); const top = cardEl.scrollTop; draw(); cardEl.scrollTop = top;
    });
  draw();
}
function deckSheet() {
  sheet(`<h2 id="cardTitle">내 덱 ${run.deck.length}장</h2><p>6장이 넘으면 전투 전에 들고 갈 카드를 골라요.</p><div class="opts">${run.deck.map((c, i) => cardOpt(c, i, { act: 'none', on: run.equip.includes(i) })).join('')}</div><button class="cta" type="button" data-act="close" data-pref>닫기</button>`,
    act => { if (act === 'close') closeSheet(); });
}
$('#btnDeck').addEventListener('click', () => { sfx.tap(); fixEquip(); deckSheet(); });

/* ───── 칸에 들어가기 ───── */
function enter(id) {
  if (!canGo(id)) return; const n = run.map.nodes[id]; sfx.tap();
  if (n.type === 'battle' || n.type === 'elite' || n.type === 'boss') equipSheet(() => startBattle(n.type, diffOf(n.row, mapRows()), r => afterBattle(id, r)));
  else if (n.type === 'rest') { arrive(id); showMap(); restSheet(); }
  else if (n.type === 'shop') { arrive(id); showMap(); shopSheet(); }
  else if (n.type === 'chest') { arrive(id); showMap(); const r = rollRelic(); if (r) relicSheet(r, '보물 상자를 열었어요', showMap); else { run.gold += 40; showMap(); } }
  else { arrive(id); showMap(); eventSheet(); }
}
function afterBattle(id, r) {
  if (!r.won) { gameOver(r); return; }
  arrive(id);
  const healed = run.hp < run.maxHp; run.hp = Math.min(run.maxHp, run.hp + 1 + (has('jar') && r.kind === 'elite' ? 1 : 0));
  const gold = goldGain(18 + 6 * r.floor + (r.kind === 'elite' ? 25 : 0)), oldGold = run.gold; run.gold += gold; persist();
  if (r.kind === 'boss') { victory(r); return; }
  showMap();
  const steps = [];
  steps.push(next => winFx(r.kind === 'elite' ? '엘리트 격파!' : '승리!', gold, oldGold, next));
  steps.push(next => rewardCards(`카드 보상${healed ? ' · 하트 +1' : ''}`, next));
  if (r.kind === 'elite') { const rel = rollRelic(); if (rel) steps.push(next => relicSheet(rel, '엘리트 전투 보상', next)); if (r.bigDead) steps.push(enchantSheet); else if (!run.potion && Math.random() < 0.5) steps.push(next => { run.potion = true; noteSheet('따뜻한 코코아를 얻었어요', '하트가 다 없어지면 저절로 마시고 하트 1칸으로 다시 일어나요.', 'cocoa', next); }); }
  const go = () => { const s = steps.shift(); if (s) s(go); else { persist(); showMap(); } };
  go();
}
function rewardCards(title, next) {
  const opts = rollCards(3);
  sheet(`<h2 id="cardTitle">${title}</h2><p>카드 1장을 덱에 넣어요. 건너뛰면 골드 10을 받아요.</p><div class="opts">${opts.map((c, i) => cardOpt(c, i)).join('')}</div><button class="btn" type="button" data-act="skip">건너뛰고 골드 10 받기</button>`,
    (act, b) => { if (b.closest('.lock')) return; if (act === 'skip') { run.gold += 10; sfx.coin(); } else { run.deck.push(opts[+b.dataset.i]); sfx.good(); } closeSheet(); fixEquip(); next(); });
  flipReveal();
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
function enchantSheet(next) {
  const kind = pick(Object.keys(ENCH)), list = run.deck.map((c, i) => [c, i]).filter(([c]) => CARDS[c.id].type === 'w' && !c.ench);
  if (!list.length) { next(); return; }
  sheet(`<h2 id="cardTitle">인챈트: ${ENCH[kind].name}</h2><p>엘리트를 잡아서 얻었어요. ${ENCH[kind].desc} 붙일 무기 1장을 골라요.</p><div class="opts">${list.map(([c, i]) => cardOpt(c, i)).join('')}</div>`,
    (act, b) => { run.deck[+b.dataset.i].ench = kind; sfx.good(); closeSheet(); next(); });
}
function restSheet() {
  const heal = has('icepack') ? 2 : 1, can = run.deck.map((c, i) => [c, i]).filter(([c]) => !c.plus);
  sheet(`<div class="pic">${svg(ICON.rest)}</div><h2 id="cardTitle">휴식처</h2><p>따뜻한 오븐 옆에서 쉬어 가요. 하나만 고를 수 있어요.</p><div class="opts"><button class="opt" type="button" data-act="heal" data-pref><span class="ic">${svg(ICON.heart)}</span><span class="tx"><b>푹 쉬기</b><span>하트를 ${heal}칸 채워요. 지금 ${run.hp}/${run.maxHp}칸.</span></span></button><button class="opt" type="button" data-act="up"${can.length ? '' : ' aria-disabled="true"'}><span class="ic">${svg(ICON.ench)}</span><span class="tx"><b>카드 1장 강화하기</b><span>고른 카드가 이번 모험 내내 더 세져요.</span></span></button></div>`,
    act => {
      if (act === 'heal') { run.hp = Math.min(run.maxHp, run.hp + heal); sfx.good(); closeSheet(); persist(); showMap(); return; }
      sheet(`<h2 id="cardTitle">강화할 카드</h2><p>카드마다 한 번만 강화할 수 있어요.</p><div class="opts">${can.map(([c, i]) => cardOpt(c, i)).join('')}</div>`, (a, b) => { run.deck[+b.dataset.i].plus = true; sfx.good(); closeSheet(); persist(); showMap(); });
    });
}
function shopSheet() {
  const stock = rollCards(3).map(c => ({ c, price: [40, 60, 90][CARDS[c.id].rar], sold: false })), rel = rollRelic(), state = { rel: rel ? { id: rel, price: 110, sold: false } : null, pot: !run.potion };
  const draw = () => sheet(`<div class="pic">${svg(ICON.shop)}</div><h2 id="cardTitle">상점</h2><p>가진 골드는 ${run.gold}이에요.</p><div class="opts">`
    + stock.map((s, i) => s.sold ? '' : cardOpt(s.c, i, { act: 'card', price: s.price, off: run.gold < s.price })).join('')
    + (state.rel && !state.rel.sold ? `<button class="opt r2" type="button" data-act="relic"${run.gold < state.rel.price ? ' aria-disabled="true"' : ''}><span class="ic">${svg(ICON[RELICS[state.rel.id].icon])}</span><span class="tx"><b>유물: ${RELICS[state.rel.id].name}</b><span>${RELICS[state.rel.id].desc}</span></span><em>${state.rel.price}골드</em></button>` : '')
    + (state.pot ? `<button class="opt" type="button" data-act="pot"${run.gold < 60 ? ' aria-disabled="true"' : ''}><span class="ic">${svg(ICON.cocoa)}</span><span class="tx"><b>따뜻한 코코아</b><span>하트가 다 없어지면 저절로 마시고 다시 일어나요. 하나만 들 수 있어요.</span></span><em>60골드</em></button>` : '')
    + (run.deck.length > 2 ? `<button class="opt" type="button" data-act="remove"${run.gold < 50 ? ' aria-disabled="true"' : ''}><span class="ic">${svg(ICON.event)}</span><span class="tx"><b>카드 1장 빼기</b><span>안 쓰는 카드를 덱에서 없애요.</span></span><em>50골드</em></button>` : '')
    + `</div><button class="cta" type="button" data-act="leave" data-pref>상점 나가기</button>`,
    (act, b) => {
      if (act === 'leave') { closeSheet(); fixEquip(); persist(); showMap(); return; }
      if (act === 'card') { const s = stock[+b.dataset.i]; run.gold -= s.price; s.sold = true; run.deck.push(s.c); }
      else if (act === 'relic') { run.gold -= state.rel.price; state.rel.sold = true; gainRelic(state.rel.id); }
      else if (act === 'pot') { run.gold -= 60; run.potion = true; state.pot = false; }
      else if (act === 'remove') {
        sheet(`<h2 id="cardTitle">뺄 카드</h2><p>고른 카드는 덱에서 사라져요.</p><div class="opts">${run.deck.map((c, i) => cardOpt(c, i)).join('')}</div><button class="btn" type="button" data-act="back">그만두기</button>`,
          (a, bb) => { if (a !== 'back') { const i = +bb.dataset.i; if (CARDS[run.deck[i].id].type === 'w' && run.deck.filter(c => CARDS[c.id].type === 'w').length <= 1) { sfx.no(); return; } run.deck.splice(i, 1); run.equip = []; run.gold -= 50; fixEquip(); sfx.coin(); } draw(); });
        return;
      }
      sfx.coin(); renderBar(); draw();
    });
  draw();
}
function eventSheet() {
  const up = run.deck.map((c, i) => [c, i]).filter(([c]) => !c.plus);
  const EVENTS = [
    { title: '수상한 오븐', text: '혼자 달궈진 오븐에서 좋은 냄새가 나요. 손을 넣으면 데일 것 같아요.', a: ['손을 넣어 꺼내기', '하트를 1칸 잃고 희귀 카드 1장을 얻어요. 마지막 1칸은 남아요.', () => { run.hp = Math.max(1, run.hp - 1); run.deck.push(rollCard(2)); }], b: ['그냥 지나가기', '바닥에 떨어진 골드 15만 주워요.', () => { run.gold += 15; }] },
    { title: '길 잃은 마카롱 상인', text: '보따리를 멘 마카롱이 물건 하나를 싸게 넘기겠다고 해요.', a: ['골드 45에 사기', '유물 1개를 얻어요.', () => { const r = rollRelic(); run.gold -= 45; if (r) gainRelic(r); }, () => run.gold >= 45 && !!rollRelic()], b: ['정중히 거절하기', '아무 일도 일어나지 않아요.', () => {}] },
    { title: '설탕 샘', text: '반짝이는 설탕물이 솟는 샘을 찾았어요. 한 가지만 할 수 있어요.', a: ['한 모금 마시기', '하트를 1칸 채워요.', () => { run.hp = Math.min(run.maxHp, run.hp + 1); }], b: ['카드를 담그기', '아무 카드 1장이 강화돼요.', () => { if (up.length) pick(up)[0].plus = true; }, () => up.length > 0] }
  ];
  const ev = pick(EVENTS), row = (k, o) => `<button class="opt" type="button" data-act="${k}"${o[3] && !o[3]() ? ' aria-disabled="true"' : ''}${k === 'b' ? ' data-pref' : ''}><span class="tx"><b>${o[0]}</b><span>${o[1]}</span></span></button>`;
  sheet(`<div class="pic">${svg(ICON.event)}</div><h2 id="cardTitle">${ev.title}</h2><p>${ev.text}</p><div class="opts">${row('a', ev.a)}${row('b', ev.b)}</div>`,
    act => { ev[act][2](); sfx.good(); closeSheet(); fixEquip(); persist(); showMap(); });
}

/* ───── 모험의 시작과 끝 ───── */
function newRun() {
  run = S.run = { map: genMap(), at: null, done: [], floor: 0, hp: 3, maxHp: 3, gold: 30, potion: true, kills: 0,
    deck: [{ id: 'pin', plus: false, ench: null }, { id: 'cream', plus: false, ench: null }, { id: 'magnet', plus: false, ench: null }], equip: [0, 1, 2], relics: ['cape'] };
  persist(); showMap();
  sheet(`<div class="pic"><img src="img/hero.png" alt=""></div><h2 id="cardTitle">간식 왕국을 지켜요</h2><p>곰팡이 케이크가 간식들을 상하게 만들고 있어요. 길을 골라 올라가서 케이크를 물리쳐요.</p><p>전투에서는 화면을 누른 채 끌어서 움직이기만 하면 돼요. 공격은 저절로 나가요. 처음엔 롤링핀과 휘핑크림, 코코아 한 잔을 들고, 무기 1장을 더 골라 출발해요.</p><button class="cta" type="button" data-act="go" data-pref>출발하기</button>`, () => { sfx.tap(); starterPick(); });
}
/* 출발할 때 무기 1장을 더 골라요 */
function starterPick() {
  const opts = shuffle(['star', 'macaron', 'honey', 'lemon']).slice(0, 3).map(id => ({ id, plus: false, ench: null }));
  sheet(`<h2 id="cardTitle">첫 무기 고르기</h2><p>롤링핀, 휘핑크림, 설탕 자석에 더해 무기 1장을 골라 들고 가요.</p><div class="opts">${opts.map((c, i) => cardOpt(c, i)).join('')}</div>`,
    (act, b) => { if (act !== 'pick' || b.closest('.lock')) return; run.deck.push(opts[+b.dataset.i]); fixEquip(); persist(); sfx.good(); closeSheet(); });
  flipReveal();
}
function victory(r) {
  S.wins++; const kills = run.kills, deck = run.deck.length; run = S.run = null; persist();
  show('title'); renderTitle(); winFx('왕국을 지켰어요!', 0, 0, () => {}, true); setTimeout(() => confetti(50, innerWidth / 2, innerHeight * 0.3, 1.3), 1500);
  sheet(`<div class="pic"><img src="img/hero.png" alt=""></div><h2 id="cardTitle">간식 왕국을 지켰어요!</h2><p>${r.bigDead ? '곰팡이 케이크를 물리쳤어요.' : '곰팡이 케이크의 공격을 끝까지 버텨 냈어요.'} 적 ${kills}마리를 잡았고, 카드 ${deck}장으로 끝까지 왔어요.</p><p>지금까지 ${S.wins}번 지켜 냈어요.</p><button class="cta" type="button" data-act="go" data-pref>처음 화면으로</button>`, () => { closeSheet(); });
}
function gameOver(r) {
  const kills = run.kills, floor = run.floor + 1; run = S.run = null; persist();
  show('title'); renderTitle();
  sheet(`<div class="pic"><img src="img/${r.kind === 'boss' ? 'boss' : r.kind === 'elite' ? 'donut' : 'jelly'}.png" alt=""></div><h2 id="cardTitle">쓰러졌어요</h2><p>${floor}층에서 쓰러졌어요. 적 ${kills}마리를 잡았어요. 다음엔 다른 길과 다른 카드로 가 봐요.</p><button class="cta" type="button" data-act="go" data-pref>처음 화면으로</button>`, () => { closeSheet(); });
}

/* ───── 처음 화면, 메뉴, 설치 ───── */
let installEvt = null, newArmed = 0;
const isInstalled = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function renderTitle() {
  const going = !!(S.run && S.run.map);
  $('#btnContinue').hidden = !going;
  const b = $('#btnNew'); b.className = going ? 'btn' : 'cta green'; b.textContent = going ? '새 모험 떠나기' : '모험 떠나기';
  $('#titleSub').textContent = going ? `${(S.run.floor || 0) + 1}층까지 왔어요. 하트 ${S.run.hp}/${S.run.maxHp}칸, 카드 ${S.run.deck.length}장.` : S.wins ? `간식 왕국을 ${S.wins}번 지켜 냈어요.` : '자동으로 공격하는 전투와, 길을 고르고 카드를 모으는 모험.';
  $('#btnInstall').hidden = !installEvt || isInstalled; clearTimeout(newArmed); newArmed = 0;
}
$('#btnContinue').addEventListener('click', () => { run = S.run; fixEquip(); sfx.tap(); showMap(); });
$('#btnNew').addEventListener('click', () => {
  const b = $('#btnNew');
  if (S.run && S.run.map && !newArmed) { b.textContent = '한 번 더 누르면 지금 모험을 버리고 새로 떠나요'; newArmed = setTimeout(() => { newArmed = 0; b.textContent = '새 모험 떠나기'; }, 3000); return; }
  clearTimeout(newArmed); newArmed = 0; sfx.tap(); newRun();
});
function menuSheet(home) {
  const row = (act, t, d) => `<button class="opt" type="button" data-act="${act}"><span class="tx"><b>${t}</b><span>${d}</span></span></button>`;
  const draw = () => sheet(`<h2 id="cardTitle">메뉴</h2><div class="opts">` + row('sound', S.muted ? '소리 켜기' : '소리 끄기', `지금은 소리가 ${S.muted ? '꺼져' : '켜져'} 있어요.`)
    + (navigator.vibrate ? row('vib', S.vib ? '진동 끄기' : '진동 켜기', `지금은 진동이 ${S.vib ? '켜져' : '꺼져'} 있어요.`) : '')
    + row('diff', `난이도: ${DF().name}`, `${DF().desc} 누르면 바뀌어요. 다음 전투부터 적용돼요.`)
    + (home ? row('home', '처음 화면으로 가기', '모험은 저장돼 있어서 이어서 할 수 있어요.') : '') + `</div><button class="cta" type="button" data-act="close" data-pref>닫기</button>`,
    act => { if (act === 'diff') { const k = Object.keys(DIFF); S.diff = k[(k.indexOf(S.diff) + 1) % k.length]; persist(); sfx.tap(); draw(); } else if (act === 'sound') { S.muted = !S.muted; persist(); sfx.tap(); draw(); } else if (act === 'vib') { S.vib = !S.vib; persist(); buzz(20); draw(); } else if (act === 'home') { closeSheet(); show('title'); renderTitle(); } else closeSheet(); });
  draw();
}
$('#btnMenu').addEventListener('click', () => menuSheet(true));
$('#btnSet').addEventListener('click', () => menuSheet(false));
$('#btnInstall').addEventListener('click', () => { if (!installEvt) return; installEvt.prompt(); installEvt = null; $('#btnInstall').hidden = true; });
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; renderTitle(); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
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
