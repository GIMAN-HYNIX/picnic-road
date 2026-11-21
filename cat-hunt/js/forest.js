'use strict';
/* =========================================================
   아침 숲 · 탑뷰 세계 (세계 좌표 = 픽셀 1920×1280, 화면 640×360)
   땅(풀 · 오솔길 · 개울 · 다리) → 나무 · 소품 → 작은 동물(다람쥐 · 청설모 · 새 · 나비)
   ========================================================= */
const WW = 1920, WH = 1280;
const FT = edPal('#2c4a2a');
const TREE_STY = Object.assign({}, ED, { cel: [.04, .74] });
const GCOL = { g0: '#5a8d40', g1: '#72a44c', g2: '#8aba5a', g3: '#a6ce68', blade: '#4f8238', bladeL: '#b6da7a', dirt: '#d8b37c', dirtE: '#b98e5a', dirtR: '#caa36e', sand: '#dccb92', water: '#5aa6cf', waterD: '#4590bd', waterL: '#a2d6ec', plank: '#a8763e', plankD: '#7a5228', rail: '#5a3a20', pebble: '#a89c88' };
const TER = { GRASS: 0, PATH: 1, WATER: 2, BANK: 3, BRIDGE: 4 };
const WORLD = {
  pathMain: [[880, 1300, 30], [900, 1140, 30], [858, 960, 32], [930, 790, 28], [1000, 650, 26], [1110, 520, 26], [1200, 380, 26], [1160, 220, 24], [1240, -20, 24]],
  pathWest: [[866, 930, 24], [700, 860, 24], [520, 800, 22], [360, 760, 22], [180, 650, 20], [-20, 600, 20]],
  stream: [[-20, 360, 22], [320, 440, 24], [640, 520, 26], [990, 646, 28], [1300, 700, 26], [1620, 820, 24], [1940, 900, 22]],
  start: [884, 1036],
  clear: [[884, 1036, 120], [520, 1010, 110], [1460, 470, 110], [1120, 560, 60], [300, 900, 70]],
  meadows: [[520, 1010], [1460, 470], [300, 900]],
};
// 점 사이를 부드럽게 이은 촘촘한 점 목록 (Catmull-Rom). 세 번째 값(너비)도 같이 이어 줌
function spline(pts, step = 2) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), p1[2] + (p2[2] - p1[2]) * t]);
    }
  }
  out.push(pts[pts.length - 1].slice()); return out;
}
function bakeEnv(W, H, ox, oy, fn, seed, sty) { const pb = hiBake(W, H, ox, oy, fn, sty || TREE_STY); grain(pb, .035, seed); return pb.canvas(); }

/* ---------- 나무 · 소품 그림 ---------- */
const leafTex = (seed, i) => (x, y) => { const h = hash2(Math.round(x / 2) + seed, Math.round(y / 2) + i * 7); return h > .86 ? 1 : h < .1 ? -1 : 0; };
function lobeTop(l, r) { const dx = (r() - .5) * l[2] * .9; return [l[0] + dx, l[1] - l[3] * Math.sqrt(Math.max(0, 1 - (dx / l[2]) ** 2)) + 1]; }
function oakSpr(seed) {
  const r = RNG(seed), W = 84, H = 104, ox = 42, oy = 98, TR = FT('#76502f'), LF = FT('#5e9a45', .3), cy = -64;
  const lobes = [[-17, 6, 15, 12], [17, 5, 15, 12], [0, -10, 20, 15], [-11, -4, 16, 13], [12, -6, 16, 13], [0, 8, 19, 12]].map(b => [b[0] + (r() - .5) * 4, cy + b[1] + (r() - .5) * 4, b[2] + (r() - .5) * 3, b[3] + (r() - .5) * 2]);
  const c = bakeEnv(W, H, ox, oy, R => {
    R.E(-5, -1.6, 3.6, 2, 0, TR, { g: 'root' }); R.E(5.4, -1.4, 3.4, 1.8, 0, TR, { g: 'root' });
    R.K2(0, -2, .8, -40, 4.8, 3.8, TR, R.pat({ g: 'trunk', tex: (x, y) => (mod(Math.round(x * 1.3 + Math.sin(y * .35) * 1.4), 3) === 0 ? -1 : 0) }));
    R.K2(.6, -34, -9, -48, 1.8, 1.3, TR, { g: 'br1' }); R.K2(.8, -36, 10, -50, 1.8, 1.3, TR, { g: 'br2' });
    lobes.forEach((l, i) => R.E(l[0], l[1], l[2], l[3], 0, LF, R.pat({ g: 'lf' + i, ol: 2, tex: leafTex(seed, i) })));
  }, seed);
  return { c, ox, oy, r: 6, crown: [-30, cy - 24, 60, 42], perches: lobes.filter(l => l[1] < cy + 2).map(l => lobeTop(l, r)), kind: 'oak' };
}
function pineSpr(seed) {
  const r = RNG(seed), W = 76, H = 118, ox = 38, oy = 112, TR = FT('#a8582e'), LF = FT('#3f6e4c', .26);
  const cl = [[-13, -46, 14, 6.4], [12, -58, 15, 6.6], [-8, -72, 15, 6.8], [9, -86, 12, 6], [-1, -98, 9, 5.2]].map(b => [b[0] + (r() - .5) * 4, b[1] + (r() - .5) * 3, b[2] + (r() - .5) * 2, b[3]]);
  const c = bakeEnv(W, H, ox, oy, R => {
    R.E(-4.4, -1.4, 3, 1.8, 0, TR, { g: 'root' }); R.E(4.6, -1.2, 3, 1.6, 0, TR, { g: 'root' });
    R.chain([[0, -1], [1.6, -22], [-.6, -44], [1.2, -70], [0, -96]], [4.4, 3.8, 3.2, 2.6, 1.8], TR, R.pat({ g: 'trunk', tex: (x, y) => (hash2(Math.round(x * .8), Math.round(y / 3)) > .7 ? -1 : 0) }));
    cl.forEach((b, i) => { const tx = i % 2 ? 1 : -1; R.K2(0, b[1] + 2, b[0] * .7, b[1], 1.2, .9, TR, { g: 'br' + i }); });
    cl.forEach((b, i) => R.E(b[0], b[1], b[2], b[3], 0, LF, R.pat({ g: 'nd' + i, ol: 2, tex: (x, y) => (mod(Math.round(x * .9 - y * 1.6) + i, 4) === 0 ? -1 : hash2(Math.round(x / 2) + seed, Math.round(y / 2)) > .9 ? 1 : 0) })));
  }, seed);
  return { c, ox, oy, r: 5, crown: [-28, -106, 56, 66], perches: cl.map(b => lobeTop(b, r)), kind: 'pine' };
}
function birchSpr(seed) {
  const r = RNG(seed), W = 60, H = 108, ox = 30, oy = 102, BK = ['#b9b4aa', '#ece8df'], LF = FT('#82b85a', .28), MK = ['#2a2626', '#3a3434'];
  const lobes = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + r(), rr = 6 + r() * 9; lobes.push([Math.cos(a) * rr, -72 + Math.sin(a) * rr * .8 - 4, 7 + r() * 3, 6 + r() * 2]); }
  lobes.sort((a, b) => a[1] - b[1]);
  const mark = (x, y) => (hash2(7 + Math.round(x * .3), Math.round(y)) > .74 && Math.abs(x) < 2.2 ? 0 : -1);
  const c = bakeEnv(W, H, ox, oy, R => {
    R.K2(1, -20, 7, -58, 1.8, 1.4, BK, R.pat({ g: 'trunk2', alts: [MK], alt: mark }));
    R.K2(0, -1, .6, -66, 2.8, 2.2, BK, R.pat({ g: 'trunk', alts: [MK], alt: mark }));
    lobes.forEach((l, i) => R.E(l[0], l[1], l[2], l[3], 0, LF, R.pat({ g: 'lf' + i, ol: 2, tex: leafTex(seed, i) })));
  }, seed);
  return { c, ox, oy, r: 4, crown: [-22, -92, 44, 40], perches: lobes.filter(l => l[1] < -70).map(l => lobeTop(l, r)), kind: 'birch' };
}
function bushSpr(seed, berry) {
  const r = RNG(seed), LF = FT('#4f8a3e', .28);
  const c = bakeEnv(36, 28, 18, 25, R => {
    [[-7, -8, 8, 6.4], [7, -8, 8, 6.4], [0, -12, 9.4, 7.4]].forEach((b, i) => R.E(b[0] + (r() - .5) * 2, b[1], b[2], b[3], 0, LF, R.pat({ g: 'b' + i, ol: 2, tex: leafTex(seed, i) })));
    if (berry) for (let i = 0; i < 6; i++) R.stamp(-8 + r() * 16, -14 + r() * 10, ['r'], { r: i % 2 ? '#d8392f' : '#e85a40' });
  }, seed);
  return { c, ox: 18, oy: 25, r: 8 };
}
function rockSpr(seed, s) {
  const r = RNG(seed), ST = FT('#8e9088', .3), MO = FT('#6a9a46');
  const c = bakeEnv(36, 26, 18, 23, R => {
    R.scl(s);
    R.P([[-11, -2], [-12, -8], [-7, -14], [2, -15.4], [9, -12], [12, -6], [10, -1]], ST, { g: 'rock' });
    R.E(-2 + r() * 2, -12.4, 6.6, 2.6, 0, MO, R.pat({ g: 'moss', tex: (x, y) => (hash2(Math.round(x), Math.round(y)) > .8 ? -1 : 0) }));
    R.DL(2, -8, 5, -4, ST[0]); R.DL(-6, -6, -4, -3, ST[0]);
  }, seed);
  return { c, ox: 18, oy: 23, r: 8 * s };
}
function logSpr(seed) {
  const BK = FT('#6e4a2c'), EN = FT('#c99a62', .3), MO = FT('#6a9a46');
  const c = bakeEnv(54, 24, 27, 19, R => {
    R.K2(-19, -6, 17, -6, 5.4, 5.2, BK, R.pat({ g: 'log', tex: (x, y) => (mod(Math.round(y * 1.2 + Math.sin(x * .5)), 3) === 0 ? -1 : 0) }));
    R.E(18.6, -6, 2.8, 5.2, 0, EN, { g: 'end', ol: 1 });
    R.stamp(18.6, -6, ['.e.', 'e.e', '.e.'], { e: '#a87a48' }, 1, 1);
    R.E(-7, -10.6, 6, 2, 0, MO, { g: 'moss' }); R.E(6, -10.4, 3.6, 1.6, 0, MO, { g: 'moss2' });
    R.K2(-12, -10, -12, -12.6, .7, .7, ['#d9cbb4', '#f1e6d4'], { g: 'mst' }); R.E(-12, -13.2, 2, 1.2, 0, FT('#b0744a'), { g: 'mcap' });
    R.K2(-9.4, -10.4, -9.4, -12, .6, .6, ['#d9cbb4', '#f1e6d4'], { g: 'mst2' }); R.E(-9.4, -12.4, 1.5, 1, 0, FT('#b0744a'), { g: 'mcap2' });
  }, seed);
  return { c, ox: 27, oy: 19, r: 6 };
}
function stumpSpr(seed) {
  const BK = FT('#6e4a2c'), TOP = FT('#d2a66c', .3);
  const c = bakeEnv(28, 22, 14, 19, R => {
    R.E(-6, -1.2, 2.6, 1.4, 0, BK, { g: 'root' }); R.E(6.2, -1, 2.4, 1.3, 0, BK, { g: 'root2' });
    R.P([[-8, -1], [-8.6, -9], [8.6, -9], [8, -1]], BK, R.pat({ g: 'body', side: .66, tex: (x) => (mod(Math.round(x * 1.4), 3) === 0 ? -1 : 0) }));
    R.E(0, -9, 8.6, 3.2, 0, TOP, { g: 'top' });
    R.stamp(0, -9, ['.rrr.', 'r...r', '.rrr.'], { r: '#b0844e' }, 2, 1);
  }, seed);
  return { c, ox: 14, oy: 19, r: 7 };
}
function fernSpr(seed) {
  const r = RNG(seed), LF = FT('#4f9a48', .3);
  const c = bakeEnv(32, 22, 16, 20, R => {
    for (let k = 0; k < 6; k++) {
      const a = Math.PI * (-.92 + k * .17) + (r() - .5) * .12, L = 9 + r() * 4, ex = Math.cos(a) * L, ey = Math.sin(a) * L * .8;
      R.K2(0, -1, ex, ey - 1, .6, .4, LF, { g: 'st' + k });
      for (let j = 2; j < 6; j++) { const t = j / 6; R.E(ex * t + Math.sin(a) * 1.4, ey * t - 1 - Math.cos(a) * .8, 1.6 - t * .6, .9, a, LF, { g: 'lf' + k + j }); R.E(ex * t - Math.sin(a) * 1.4, ey * t - 1 + Math.cos(a) * .8, 1.6 - t * .6, .9, a, LF, { g: 'lf' + k + j }); }
    }
  }, seed);
  return { c, ox: 16, oy: 20, r: 0 };
}
function mushSpr(seed, red) {
  const CAP = red ? FT('#d8452e', .3) : FT('#b0744a', .3), STM = ['#d9cbb4', '#f3eadc'];
  const c = bakeEnv(16, 14, 8, 12, R => {
    R.K2(-2.4, -1, -2.4, -4, .9, .9, STM, { g: 's1' }); R.E(-2.4, -4.6, 2.6, 1.6, 0, CAP, { g: 'c1' });
    R.K2(2.4, -1, 2.4, -3, .8, .8, STM, { g: 's2' }); R.E(2.4, -3.4, 2, 1.3, 0, CAP, { g: 'c2' });
    if (red) { R.stamp(-3, -5, ['w.w'], { w: '#fff6ea' }); R.stamp(2, -4, ['w'], { w: '#fff6ea' }); }
  }, seed);
  return { c, ox: 8, oy: 12, r: 0 };
}
function grassSpr(seed, f) {
  const r = RNG(seed), A = FT('#5f9a46', .32), sway = [0, .7, -.5][f];
  const c = bakeEnv(18, 16, 9, 15, R => {
    for (let k = 0; k < 5; k++) { const bx = -4 + k * 2 + (r() - .5), h = 7 + r() * 5, lean = (k - 2) * .8 + sway * (h / 10); R.K2(bx, -.5, bx + lean, -h, .9, .3, A, { g: 'b' + k }); }
  }, seed);
  return { c, ox: 9, oy: 15, r: 0 };
}

/* ---------- 작은 동물 그림 ---------- */
const CRIT = {
  chO: FT('#c87a3c'), chW: ['#e2c69a', '#f4e2c0'], chT: FT('#b06a34'), chD: '#4a2e1c',
  sqB: FT('#6e5c54', .24), sqT: FT('#5c4c46', .3), sqW: ['#c9c2b6', '#ece6dc'],
};
function chipRig(R, f) {
  const O = CRIT.chO, W = CRIT.chW, T = CRIT.chT, D = CRIT.chD;
  if (f === 'sit' || f === 'nibble') {
    R.chain([[-1.6, -1.4], [-4, -3.4], [-4.4, -6.6], [-3, -8.6]], [1.1, 1.5, 1.5, .9], T, { g: 'tail' });
    R.E(0, -3.4, 2.6, 3.4, -.15, O, { g: 'body' });
    R.E(.8, -3, 1.3, 2.3, -.15, W, { g: 'belly' });
    R.DL(-1.8, -5.6, -1.6, -1.6, D);
    const hx = .9, hy = -7.6, pu = f === 'nibble' ? .8 : 0;
    R.E(hx - .6, hy - 2, .9, 1, 0, O, { g: 'ear' });
    R.E(hx, hy, 2.3, 2, 0, O, { g: 'head' });
    R.E(hx + 1.8, hy + .4, 1.2, 1, 0, O, { g: 'snout' });
    R.DL(hx - 1.6, hy - .6, hx + 2.4, hy - .2, D);
    R.stamp(hx + .8, hy - .6, ['k'], { k: '#120c0a' });
    R.E(hx + 1.6, hy + 2.2 - pu, .9, .8, 0, O, { g: 'paw', ol: 1 });
    R.stamp(hx + 2.4, hy + 1.6 - pu, ['a'], { a: '#8a5a2a' });
    R.E(.4, -.5, 1.6, .7, 0, O, { g: 'feet' });
  } else {
    const st = f === 'hop1' ? 1.15 : f === 'hop2' ? .9 : 1, up = f === 'hop2' ? 1.6 : 0, ext = f === 'hop1' ? 1.1 : 0;
    R.chain([[-3.6 * st, -3 - up], [-6.2 * st, -4.8 - up], [-6.8 * st, -7.6 - up], [-5.6 * st, -9.2 - up]], [1.1, 1.5, 1.5, .9], T, { g: 'tail' });
    R.K2(-2.6 * st, -2 - up, -3.4 * st - ext, -.4 - up * .4, .9, .8, O, { g: 'legB' });
    R.E(0, -3.2 - up, 4 * st, 2.4, 0, O, { g: 'body' });
    R.E(.6, -2 - up, 2.8 * st, .9, 0, W, { g: 'belly' });
    R.DL(-3.4 * st, -5 - up, 2 * st, -5.4 - up, D); R.DL(-3.2 * st, -4.2 - up, 2.2 * st, -4.4 - up, W[1]);
    R.K2(2.8 * st, -2 - up, 3.4 * st + ext, -.4 - up * .4, .8, .7, O, { g: 'legF', ol: 1 });
    const hx = 3.9 * st, hy = -4.6 - up;
    R.E(hx - .8, hy - 2, .9, 1, 0, O, { g: 'ear' });
    R.E(hx, hy, 2.4, 2, 0, O, { g: 'head' });
    R.E(hx + 1.8, hy + .4, 1.2, 1, 0, O, { g: 'snout' });
    R.DL(hx - 1.6, hy - .6, hx + 2.4, hy - .2, D);
    R.stamp(hx + .6, hy - .6, ['k'], { k: '#120c0a' });
  }
}
function sqRig(R, f) {
  const B = CRIT.sqB, T = CRIT.sqT, W = CRIT.sqW;
  if (f === 'sit') {
    R.chain([[-2, -2], [-5.4, -4.6], [-6.4, -9], [-5, -13], [-2, -14.4]], [1.6, 2.4, 2.8, 2.4, 1.4], T, { g: 'tail' });
    R.E(-.6, -1.8, 2.2, 1.6, 0, B, { g: 'thigh' });
    R.E(0, -4.8, 3, 4.4, -.12, B, { g: 'body' });
    R.E(1, -4.4, 1.5, 3, -.12, W, { g: 'belly' });
    const hx = 1.2, hy = -10;
    R.P([[hx - 1.2, hy - 1.8], [hx - .9, hy - 5], [hx + .2, hy - 2.2]], B, { g: 'ear' });
    R.E(hx, hy, 2.6, 2.3, 0, B, { g: 'head' });
    R.E(hx + 2, hy + .4, 1.3, 1.1, 0, B, { g: 'snout' });
    R.stamp(hx - .9, hy - 5.6, ['t'], { t: '#2e2422' });
    R.stamp(hx + .6, hy - .6, ['k'], { k: '#0e0a0a' });
    R.E(hx + 1.6, hy + 2.6, .9, .9, 0, B, { g: 'paw', ol: 1 });
    R.stamp(hx + 2.4, hy + 2.2, ['a'], { a: '#8a5a2a' });
  } else {
    const st = f === 'run1' ? 1.2 : .85, up = f === 'run2' ? 1.4 : 0, ext = f === 'run1' ? 1.4 : 0;
    R.chain([[-4 * st, -4 - up], [-7.4 * st, -6.4 - up], [-8.4 * st, -10 - up], [-6.6 * st, -12.6 - up], [-3.6 * st, -13 - up]], [1.4, 2.2, 2.6, 2.2, 1.2], T, { g: 'tail' });
    R.E(-2.6 * st, -2.6 - up, 2.2, 1.8, 0, B, { g: 'thigh' });
    R.K2(-2.6 * st, -1.6 - up, -4 * st - ext, -.4 - up * .4, .8, .7, B, { g: 'foot' });
    R.E(0, -4 - up, 4.4 * st, 2.8, 0, B, { g: 'body' });
    R.E(.8, -2.6 - up, 3 * st, 1, 0, W, { g: 'belly' });
    R.K2(3 * st, -2.6 - up, 3.8 * st + ext, -.4 - up * .4, .8, .7, B, { g: 'legF', ol: 1 });
    const hx = 4.6 * st, hy = -5.6 - up;
    R.P([[hx - 1.2, hy - 1.8], [hx - .9, hy - 5], [hx + .2, hy - 2.2]], B, { g: 'ear' });
    R.E(hx, hy, 2.6, 2.2, 0, B, { g: 'head' });
    R.E(hx + 2, hy + .4, 1.3, 1.1, 0, B, { g: 'snout' });
    R.stamp(hx - .9, hy - 5.6, ['t'], { t: '#2e2422' });
    R.stamp(hx + .6, hy - .6, ['k'], { k: '#0e0a0a' });
  }
}
const BIRD = {
  tit: { head: FT('#24242c'), back: FT('#7a9a4a'), belly: FT('#e8cf4a'), wing: FT('#6a7a8a'), tail: FT('#4a525c'), beak: '#24242c', cheek: '#f6f2ea', len: 4.6 },
  sparrow: { head: FT('#7a4a2a'), back: FT('#9a6a3a'), belly: FT('#d9d2c4'), wing: FT('#7a5434'), tail: FT('#6a4a30'), beak: '#3a2a20', cheek: '#f2ece0', len: 4.4 },
  magpie: { head: FT('#1c1c24', .2), back: FT('#1c1c24', .2), belly: ['#c9c6c0', '#f2f0ea'], wing: FT('#26303a', .3), tail: FT('#1e2a3a', .35), beak: '#1a1a20', cheek: null, len: 9 },
};
function birdRig(R, sp, f) {
  const P = BIRD[sp];
  if (f === 'fly1' || f === 'fly2') {
    R.K2(-2, -4, -2 - P.len, -3.6, .9, .5, P.tail, { g: 'tail' });
    R.E(0, -4, 2.8, 1.6, 0, P.back, { g: 'body' });
    R.E(.4, -3.2, 2, .9, 0, P.belly, { g: 'belly' });
    R.E(2.8, -4.6, 1.6, 1.4, 0, P.head, { g: 'head' });
    R.stamp(4.4, -4.6, ['b'], { b: P.beak });
    if (f === 'fly1') R.P([[-1.4, -4.6], [1.4, -4.8], [.2, -10], [-2.6, -9]], P.wing, { g: 'wing', ol: 1 });
    else R.P([[-1.4, -3.4], [1.4, -3.4], [.6, .8], [-2.2, .2]], P.wing, { g: 'wing', ol: 1 });
    if (sp === 'magpie') R.stamp(-.4, f === 'fly1' ? -7.6 : -1.4, ['ww'], { w: '#f2f0ea' });
    return;
  }
  const peck = f === 'peck', ch = f === 'chirp', hop = f === 'hop' ? -1 : 0;
  R.K2(-1.2, -2.2 + hop, -1.6 - P.len * .55, .4 + hop, .9, .5, P.tail, { g: 'tail' });
  R.E(0, -3.6 + hop, 2.1, 2.6, -.45, P.back, { g: 'body' });
  R.E(.8, -3.2 + hop, 1.3, 1.9, -.45, P.belly, { g: 'belly' });
  if (sp === 'tit') R.DL(1.2, -4.6 + hop, .8, -2 + hop, '#24242c');
  R.E(-.8, -3.4 + hop, 1.3, 1.9, -.5, P.wing, { g: 'wing', ol: 2 });
  if (sp === 'magpie') R.stamp(-.8, -4.4 + hop, ['w', 'w'], { w: '#f2f0ea' });
  const hx = peck ? 2.6 : 1.4, hy = (peck ? -3.6 : ch ? -7.4 : -6.8) + hop;
  R.E(hx, hy, 1.7, 1.5, 0, P.head, { g: 'head' });
  if (P.cheek) R.stamp(hx - .4, hy + .2, sp === 'sparrow' ? ['cc', 'k.'] : ['cc'], { c: P.cheek, k: '#24242c' });
  if (sp === 'sparrow') R.stamp(hx + .6, hy + 1.2, ['k'], { k: '#24242c' });
  R.stamp(hx + .6, hy - .6, ['e'], { e: '#0e0a0a' });
  R.stamp(hx + 1.6, hy - (ch ? .6 : 0), ch ? ['b', '.', 'b'] : ['b'], { b: P.beak });
  R.stamp(0, -1 + hop, ['l.l'], { l: '#5a4a3a' }, 1, 0);
}
function bflyFrame(open) {
  const pb = new PB(9, 8), R = HR.reset(1, 4, 6);
  if (open) R.stamp(0, 0, ['k...k', 'ww.ww', 'wwwww', '.w.w.'], { w: '#f6f2e6', k: '#3a3434' }, 2, 3);
  else R.stamp(0, 0, ['..k..', '.www.', '..w..'], { w: '#f6f2e6', k: '#3a3434' }, 2, 2);
  rasterHi(pb, R, { outline: '#5a6a4a' });
  return pb.canvas();
}
// 동물 그림 묶음: SP.chip[f][dir 0:오른쪽 1:왼쪽]
const SP = {};
function bakeFauna() {
  const two = c => [c, mirrorCanvas(c)];
  SP.chip = {}; for (const f of ['stand', 'hop1', 'hop2', 'sit', 'nibble']) SP.chip[f] = two(bakeEnv(22, 16, 11, 14, R => chipRig(R, f), 3, ED));
  SP.sq = {}; for (const f of ['sit', 'run1', 'run2']) SP.sq[f] = two(bakeEnv(28, 24, 14, 21, R => sqRig(R, f), 4, ED));
  SP.sq.up = ['run1', 'run2'].map(f => bakeEnv(24, 28, 12, 14, R => { R.rotate(-Math.PI / 2); R.translate(-6, 0); sqRig(R, f); }, 4, ED));
  SP.sq.down = ['run1', 'run2'].map(f => bakeEnv(24, 28, 12, 14, R => { R.rotate(Math.PI / 2); R.translate(-6, 0); sqRig(R, f); }, 4, ED));
  SP.bird = {}; for (const sp of ['tit', 'sparrow', 'magpie']) { SP.bird[sp] = {}; for (const f of ['perch', 'hop', 'peck', 'chirp', 'fly1', 'fly2']) SP.bird[sp][f] = two(bakeEnv(sp === 'magpie' ? 26 : 18, 16, sp === 'magpie' ? 15 : 9, 13, R => { if (sp === 'magpie') R.scl(1.3); birdRig(R, sp, f); }, 6, ED)); }
  SP.bfly = [bflyFrame(true), bflyFrame(false)];
}

/* ---------- 세계 만들기 ---------- */
function genWorld(seed = 7) {
  const rnd = RNG(seed), W = WORLD;
  const terr = new Uint8Array(WW * WH), pb = new PB(WW, WH), d = pb.d;
  const G = [C(GCOL.g0), C(GCOL.g1), C(GCOL.g2), C(GCOL.g3)];
  // 1) 풀 바탕: 성긴 잡음을 부드럽게 이어 평면 색 3~4단
  const gw = (WW >> 3) + 2, gh = (WH >> 3) + 2, nv = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) nv[y * gw + x] = fbm(x * .07, y * .07, 11, 3) * .78 + vnoise(x * .3, y * .3, 5) * .22;
  for (let y = 0; y < WH; y++) {
    const fy = y / 8, iy = fy | 0, ty = fy - iy;
    for (let x = 0; x < WW; x++) {
      const fx = x / 8, ix = fx | 0, tx = fx - ix, o = iy * gw + ix;
      const v = (nv[o] * (1 - tx) + nv[o + 1] * tx) * (1 - ty) + (nv[o + gw] * (1 - tx) + nv[o + gw + 1] * tx) * ty;
      d[y * WW + x] = G[v < .37 ? 0 : v < .5 ? 1 : v < .63 ? 2 : 3];
    }
  }
  const stamp = (cx, cy, r, fn) => {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(WW - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(WH - 1, Math.ceil(cy + r)), rr = r * r;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x + .5 - cx, dy = y + .5 - cy; if (dx * dx + dy * dy <= rr) fn(y * WW + x, x, y); }
  };
  // 2) 개울: 모래 둑 → 물 → 깊은 가운데
  const st = spline(W.stream, 2);
  const SAND = C(GCOL.sand), WAT = C(GCOL.water), WATD = C(GCOL.waterD), WATL = C(GCOL.waterL);
  for (const p of st) stamp(p[0], p[1], p[2] / 2 + 5, i => { if (terr[i] !== TER.WATER) { terr[i] = TER.BANK; d[i] = SAND; } });
  for (const p of st) stamp(p[0], p[1], p[2] / 2, i => { terr[i] = TER.WATER; d[i] = WAT; });
  for (const p of st) stamp(p[0], p[1], p[2] / 4.5, i => { d[i] = WATD; });
  for (let k = 0; k < st.length; k += 9) {   // 물결 줄
    const p = st[k], q = st[Math.min(st.length - 1, k + 3)], a = Math.atan2(q[1] - p[1], q[0] - p[0]), off = (rnd() - .5) * p[2] * .7;
    const x = p[0] - Math.sin(a) * off, y = p[1] + Math.cos(a) * off, L = 3 + rnd() * 5;
    pb.line(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, WATL);
  }
  for (let k = 0; k < st.length; k += 7) {   // 둑의 돌
    const p = st[k], q = st[Math.min(st.length - 1, k + 2)], a = Math.atan2(q[1] - p[1], q[0] - p[0]), sd = rnd() < .5 ? -1 : 1, off = sd * (p[2] / 2 + 2 + rnd() * 3);
    const x = p[0] - Math.sin(a) * off, y = p[1] + Math.cos(a) * off;
    if (rnd() < .6) { pb.ellipse(x, y, 1.6 + rnd() * 1.4, 1.2 + rnd(), '#8a867a'); pb.px(x - 1, y - 1, '#b8b4a8'); }
  }
  // 3) 오솔길: 가장자리 → 흙 → 가운데 발길 자국 · 자갈
  const DIRT = C(GCOL.dirt), DIRTE = C(GCOL.dirtE), DIRTR = C(GCOL.dirtR);
  const paths = [spline(W.pathMain, 2), spline(W.pathWest, 2)];
  for (const sp of paths) {
    for (const p of sp) stamp(p[0], p[1], p[2] / 2, i => { if (terr[i] === TER.GRASS) { terr[i] = TER.PATH; d[i] = DIRTE; } });
    for (const p of sp) stamp(p[0], p[1], p[2] / 2 - 2.2, i => { if (terr[i] === TER.PATH) d[i] = DIRT; });
    for (let k = 0; k < sp.length; k++) { const p = sp[k]; if (k % 2) stamp(p[0] + Math.sin(k * .07) * 3, p[1], 2.2, (i, x, y) => { if (terr[i] === TER.PATH && hash2(x, y) > .35) d[i] = DIRTR; }); }
    for (let k = 0; k < sp.length; k += 5) { const p = sp[k]; if (rnd() < .5) { const x = p[0] + (rnd() - .5) * p[2] * .7, y = p[1] + (rnd() - .5) * p[2] * .7; if (terr[(y | 0) * WW + (x | 0)] === TER.PATH) { pb.px(x, y, GCOL.pebble); if (rnd() < .4) pb.px(x + 1, y, '#c9bfae'); } } }
  }
  // 4) 다리: 큰길이 개울을 건너는 곳
  const mp = paths[0]; let wi = [];
  mp.forEach((p, k) => { const x = p[0] | 0, y = p[1] | 0; if (x >= 0 && y >= 0 && x < WW && y < WH && terr[y * WW + x] === TER.WATER) wi.push(k); });
  const bridge = { x: 1000, y: 650, a: -1, len: 50, w: 22 };
  if (wi.length) {
    const k0 = wi[0], k1 = wi[wi.length - 1], km = (k0 + k1) >> 1, pa = mp[Math.max(0, k0 - 4)], pz = mp[Math.min(mp.length - 1, k1 + 4)];
    bridge.x = mp[km][0]; bridge.y = mp[km][1]; bridge.a = Math.atan2(pz[1] - pa[1], pz[0] - pa[0]); bridge.len = Math.hypot(pz[0] - pa[0], pz[1] - pa[1]) + 6;
  }
  {
    const ca = Math.cos(bridge.a), sa = Math.sin(bridge.a), hl = bridge.len / 2, hw = bridge.w / 2;
    const PL = C(GCOL.plank), PD = C(GCOL.plankD), RA = C(GCOL.rail);
    const x0 = Math.floor(bridge.x - hl - hw), x1 = Math.ceil(bridge.x + hl + hw), y0 = Math.floor(bridge.y - hl - hw), y1 = Math.ceil(bridge.y + hl + hw);
    for (let y = Math.max(0, y0); y <= Math.min(WH - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(WW - 1, x1); x++) {
      const dx = x + .5 - bridge.x, dy = y + .5 - bridge.y, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      if (Math.abs(u) > hl || Math.abs(v) > hw) continue;
      const i = y * WW + x; terr[i] = TER.BRIDGE;
      d[i] = Math.abs(v) > hw - 2 ? RA : (mod(Math.floor(u + 100), 4) === 0 ? PD : PL);
    }
  }
  // 5) 비워 둘 곳 (길 · 물 · 공터) → 나무 · 소품 배치
  const kw = WW >> 3, kh = WH >> 3, near = new Uint8Array(kw * kh);
  for (let y = 0; y < kh; y++) for (let x = 0; x < kw; x++) { let t = 0; for (let j = 0; j < 8 && !t; j += 3) for (let i = 0; i < 8; i += 3) { const v = terr[(y * 8 + j) * WW + x * 8 + i]; if (v) { t = v; break; } } near[y * kw + x] = t ? 1 : 0; }
  const keep = (x, y, rad) => {
    for (const c of W.clear) if ((x - c[0]) ** 2 + (y - c[1]) ** 2 < c[2] * c[2]) return true;
    const cx = x >> 3, cy = y >> 3, R = Math.ceil(rad / 8);
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) { const X = cx + i, Y = cy + j; if (X >= 0 && Y >= 0 && X < kw && Y < kh && near[Y * kw + X]) return true; }
    return false;
  };
  const streamDist = (x, y) => { let m = 1e9; for (let k = 0; k < st.length; k += 10) { const p = st[k], q = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (q < m) m = q; } return Math.sqrt(m); };
  const SPR_T = { oak: [11, 12, 13, 14].map(oakSpr), pine: [21, 22, 23].map(pineSpr), birch: [31, 32, 33].map(birchSpr) };
  const objs = [], trees = [];
  for (let k = 0; k < 5000 && trees.length < 120; k++) {
    const x = 16 + rnd() * (WW - 32), y = 70 + rnd() * (WH - 70);
    if (keep(x, y, 18)) continue;
    const dens = fbm(x * .004, y * .004, 21, 2);
    if (rnd() > dens * 1.5 - .12) continue;
    const n = vnoise(x * .0032, y * .0032, 31), sd = streamDist(x, y);
    const kind = sd < 120 && rnd() < .55 ? 'birch' : n < .42 ? 'pine' : n > .78 ? 'birch' : 'oak';
    const minD = kind === 'birch' ? 34 : kind === 'pine' ? 44 : 50;
    if (!trees.every(t => (t.x - x) ** 2 + (t.y - y) ** 2 > minD * minD)) continue;
    const sp = SPR_T[kind][(rnd() * SPR_T[kind].length) | 0];
    trees.push({ t: 'tree', x, y, kind, sp, r: sp.r, perches: sp.perches.map(q => [x + q[0], y + q[1]]) });
  }
  const free = (x, y, r) => trees.every(t => (t.x - x) ** 2 + (t.y - y) ** 2 > (r + 10) ** 2) && objs.every(o => (o.x - x) ** 2 + (o.y - y) ** 2 > (r + (o.r || 4) + 4) ** 2);
  const put = (t, x, y, sp, r, extra) => { const o = Object.assign({ t, x, y, sp, r }, extra); objs.push(o); return o; };
  const SPR_O = { bush: [bushSpr(41, false), bushSpr(42, true), bushSpr(43, false)], rock: [rockSpr(51, 1), rockSpr(52, .8), rockSpr(53, 1.2)], log: logSpr(61), stump: [stumpSpr(71), stumpSpr(72)], fern: [fernSpr(81), fernSpr(82)], mush: [mushSpr(91, true), mushSpr(92, false)], grass: [[0, 1, 2].map(f => grassSpr(101, f)), [0, 1, 2].map(f => grassSpr(102, f))] };
  const logs = [[620, 1112], [1196, 946], [1520, 566]].map(p => put('log', p[0], p[1], SPR_O.log, 6, { caps: [[p[0] - 13, p[1]], [p[0], p[1]], [p[0] + 13, p[1]]] }));
  const stumps = [[760, 1100], [1330, 1086], [420, 900], [1500, 380], [300, 1120]].map((p, i) => put('stump', p[0], p[1], SPR_O.stump[i % 2], 7));
  for (let k = 0, n = 0; k < 400 && n < 12; k++) { const p = st[(rnd() * st.length) | 0], sd = rnd() < .5 ? -1 : 1, x = p[0] + sd * (p[2] / 2 + 12 + rnd() * 10), y = p[1] + (rnd() - .5) * 10; if (!keep(x, y, 4) && free(x, y, 8)) { put('rock', x, y, SPR_O.rock[n % 3], SPR_O.rock[n % 3].r); n++; } }
  for (let k = 0, n = 0; k < 600 && n < 10; k++) { const x = rnd() * WW, y = 60 + rnd() * (WH - 60); if (!keep(x, y, 10) && free(x, y, 9)) { put('rock', x, y, SPR_O.rock[n % 3], SPR_O.rock[n % 3].r); n++; } }
  for (let k = 0, n = 0; k < 1200 && n < 40; k++) { const x = rnd() * WW, y = 60 + rnd() * (WH - 60); if (!keep(x, y, 10) && free(x, y, 9)) { put('bush', x, y, SPR_O.bush[n % 3], 8); n++; } }
  const deco = [];   // 부딪히지 않는 장식 (고사리 · 버섯 · 풀포기)
  for (let k = 0, n = 0; k < 1500 && n < 60; k++) { const t = trees[(rnd() * trees.length) | 0], a = rnd() * TAU, rr = 14 + rnd() * 26, x = t.x + Math.cos(a) * rr, y = t.y + Math.sin(a) * rr * .6; if (!keep(x, y, 2) && free(x, y, 2)) { deco.push({ t: 'fern', x, y, sp: SPR_O.fern[n % 2] }); n++; } }
  for (let k = 0, n = 0; k < 800 && n < 16; k++) { const t = trees[(rnd() * trees.length) | 0], x = t.x + (rnd() - .5) * 40, y = t.y + 6 + rnd() * 14; if (!keep(x, y, 1) && free(x, y, 1)) { deco.push({ t: 'mush', x, y, sp: SPR_O.mush[n % 2] }); n++; } }
  for (let k = 0, n = 0; k < 2000 && n < 140; k++) { const x = rnd() * WW, y = 40 + rnd() * (WH - 40), i = (y | 0) * WW + (x | 0); if (terr[i] === TER.GRASS && !keep(x, y, 1)) { deco.push({ t: 'grass', x, y, sp: SPR_O.grass[n % 2], ph: rnd() * TAU }); n++; } }
  // 6) 땅 꾸미기: 나무 그림자 · 낙엽 · 풀잎 · 토끼풀 · 꽃
  const dmap = new Map(), DK = rgbOf('#1e3a26');
  const darker = u => { let v = dmap.get(u); if (v === undefined) { v = _mixU(u, DK, .25); dmap.set(u, v); } return v; };
  for (const t of trees) {
    const rx = t.kind === 'oak' ? 30 : t.kind === 'pine' ? 26 : 19, ry = rx * .5, cx = t.x + 10, cy = t.y - 5;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (x < 0 || y < 0 || x >= WW || y >= WH) continue;
      const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2, i = y * WW + x;
      if (q > 1 || (q > .82 && bay(x, y) > .5) || terr[i] === TER.WATER || terr[i] === TER.BRIDGE) continue;
      if (vnoise(x * .2, y * .2, 3) > .78) continue;   // 사이로 새는 햇빛
      d[i] = darker(d[i]);
    }
    const leafC = t.kind === 'oak' ? ['#b8763a', '#d9a84a', '#6a8a3a'] : t.kind === 'pine' ? ['#8a5a34', '#a8703e'] : ['#d9c25a', '#a8b85a'];
    for (let k = 0; k < (t.kind === 'birch' ? 8 : 16); k++) {
      const a = rnd() * TAU, rr = 6 + rnd() * 30, x = t.x + Math.cos(a) * rr, y = t.y + Math.sin(a) * rr * .55, i = (y | 0) * WW + (x | 0);
      if (x < 1 || y < 1 || x >= WW - 2 || y >= WH - 2 || terr[i] !== TER.GRASS) continue;
      const c = leafC[(rnd() * leafC.length) | 0];
      if (t.kind === 'pine') pb.line(x, y, x + (rnd() < .5 ? 2 : -2), y + 1, c); else { pb.px(x, y, c); pb.px(x + 1, y, c); if (rnd() < .5) pb.px(x, y + 1, c); }
    }
  }
  const BL = C(GCOL.blade), BLL = C(GCOL.bladeL);
  for (let k = 0; k < 9000; k++) {
    const x = (rnd() * (WW - 2)) | 0, y = 1 + (rnd() * (WH - 3)) | 0, i = y * WW + x;
    if (terr[i] !== TER.GRASS) continue;
    const c = (d[i] === G[3] || d[i] === G[2]) && rnd() < .5 ? BLL : BL;
    d[i] = c; d[i - WW + (rnd() < .5 ? 1 : 0)] = c;
  }
  for (let k = 0; k < 260; k++) {
    const cx = rnd() * WW, cy = rnd() * WH;
    for (let j = 0; j < 4; j++) { const x = (cx + (rnd() - .5) * 10) | 0, y = (cy + (rnd() - .5) * 8) | 0; if (x < 1 || y < 1 || x >= WW - 1 || y >= WH - 1 || terr[y * WW + x] !== TER.GRASS) continue; pb.px(x, y, '#5e9a3e'); pb.px(x - 1, y, '#5e9a3e'); pb.px(x, y - 1, '#5e9a3e'); pb.px(x + 1, y + 1, '#4a7a34'); }
  }
  const FL = [['#f6f0dc', '#f2c94a'], ['#f2c94a', '#fff2a8'], ['#a98ad6', '#e0d4f4'], ['#f29ab4', '#ffd8e4']];
  const flower = (x, y, t) => {
    if (x < 2 || y < 2 || x >= WW - 2 || y >= WH - 2 || terr[(y | 0) * WW + (x | 0)] !== TER.GRASS) return;
    const [a, b] = FL[t];
    if (t === 0) { pb.px(x - 1, y, a); pb.px(x + 1, y, a); pb.px(x, y - 1, a); pb.px(x, y + 1, a); pb.px(x, y, b); }
    else { pb.px(x, y, a); pb.px(x + 1, y, a); pb.px(x, y - 1, b); }
  };
  for (const m of W.meadows) for (let k = 0; k < 110; k++) { const a = rnd() * TAU, rr = Math.sqrt(rnd()) * 100; flower(m[0] + Math.cos(a) * rr, m[1] + Math.sin(a) * rr * .7, (rnd() * 4) | 0); }
  for (let k = 0; k < 260; k++) flower(rnd() * WW, rnd() * WH, (rnd() * 4) | 0);
  grain(pb, .028, 13);
  const ground = pb.canvas();
  // 충돌: 원(나무 밑동 · 바위 · 덤불 · 그루터기 · 통나무) + 물
  const solids = [];
  for (const t of trees) solids.push([t.x, t.y - 1, t.r]);
  for (const o of objs) { if (o.t === 'log') for (const c of o.caps) solids.push([c[0], c[1] - 4, 6]); else solids.push([o.x, o.y - 2, o.r]); }
  const SC = 16, sgw = Math.ceil(WW / SC), sgh = Math.ceil(WH / SC), sgrid = Array.from({ length: sgw * sgh }, () => []);
  solids.forEach(s => { for (let y = Math.floor((s[1] - s[2]) / SC); y <= Math.floor((s[1] + s[2]) / SC); y++) for (let x = Math.floor((s[0] - s[2]) / SC); x <= Math.floor((s[0] + s[2]) / SC); x++) if (x >= 0 && y >= 0 && x < sgw && y < sgh) sgrid[y * sgw + x].push(s); });
  function blocked(x, y, r) {
    if (x < r || y < r + 4 || x > WW - r || y > WH - r) return true;
    const i = (y | 0) * WW + (x | 0); if (terr[i] === TER.WATER) return true;
    for (const [ox, oy] of [[-r, 0], [r, 0], [0, -r * .6], [0, r * .6]]) { const j = ((y + oy) | 0) * WW + ((x + ox) | 0); if (terr[j] === TER.WATER) return true; }
    const cell = sgrid[(y / SC | 0) * sgw + (x / SC | 0)];
    if (cell) for (const s of cell) { const dx = x - s[0], dy = (y - s[1]) * 1.6; if (dx * dx + dy * dy < (r + s[2]) ** 2) return true; }
    return false;
  }
  const terrAt = (x, y) => terr[(Math.max(0, Math.min(WH - 1, y)) | 0) * WW + (Math.max(0, Math.min(WW - 1, x)) | 0)];
  return { ground, terr, terrAt, trees, objs, deco, logs, stumps, bridge, stream: st, blocked, rnd };
}

/* ---------- 작은 동물: 다람쥐 · 청설모 · 새 · 나비 ---------- */
// 위협 = 사냥꾼과 고양이. 동물마다 '겁먹는 거리'가 있어서 고양이가 눈치채기 전에 먼저 거리를 둔다
function makeFauna(Wd) {
  const r = Wd.rnd, list = [], S = WORLD.start;
  const homes = [...Wd.logs, ...Wd.stumps];
  homes.forEach((h, i) => { if (i < 6) list.push({ k: 'chip', x: h.x + (r() - .5) * 30, y: h.y + 10 + r() * 10, hx: h.x, hy: h.y + 8, hide: h.t === 'log', st: 'idle', t: r() * 2, dir: r() < .5 ? 0 : 1, f: 'stand', ph: 0 }); });
  const byDist = Wd.trees.map(t => ({ t, d: Math.hypot(t.x - S[0], t.y - S[1]) })).sort((a, b) => a.d - b.d);
  const sqTrees = byDist.filter(o => o.d > 170 && o.t.kind !== 'birch').slice(0, 12).filter((o, i) => i % 3 === 0).map(o => o.t);
  sqTrees.forEach((t, i) => list.push({ k: 'sq', tree: t, st: i === 0 ? 'ground' : 'trunk', h: i === 0 ? 0 : 10 + r() * 14, side: r() < .5 ? -1 : 1, x: t.x + 16, y: t.y + 6, gx: t.x + 16, gy: t.y + 6, t: 2 + r() * 3, dir: 0, ph: 0, f: 'sit' }));
  const perchTrees = byDist.filter(o => o.t.perches.length).map(o => o.t);
  const used = new Set();
  const takePerch = (cands) => { for (let n = 0; n < 60; n++) { const t = cands[(r() * cands.length) | 0], k = (r() * t.perches.length) | 0, key = t.x + ',' + k; if (!used.has(key)) { used.add(key); return [t, k]; } } return null; };
  const species = ['tit', 'tit', 'sparrow', 'tit', 'sparrow', 'magpie', 'sparrow', 'tit', 'sparrow', 'magpie', 'tit', 'sparrow'];
  species.forEach((sp, i) => {
    const pk = takePerch(perchTrees.slice(0, i < 7 ? 14 : 50)); if (!pk) return;
    const [t, k] = pk, p = t.perches[k];
    list.push({ k: 'bird', sp, tree: t, pk: k, x: p[0], y: p[1], st: 'perch', dir: r() < .5 ? 0 : 1, t: r() * 2, f: 'perch', act: 0, sing: 2 + r() * 6 });
  });
  WORLD.meadows.forEach((m, i) => { for (let j = 0; j < (i === 0 ? 2 : 1); j++) list.push({ k: 'bfly', x: m[0] + (r() - .5) * 80, y: m[1] + (r() - .5) * 50, z: 8, cx: m[0], cy: m[1], tx: m[0], ty: m[1], t: 0, ph: r() * TAU }); });
  for (let j = 0; j < 2; j++) list.push({ k: 'bird', sp: 'sparrow', tree: null, x: 520 + (r() - .5) * 60, y: 1000 + (r() - .5) * 40, st: 'ground', dir: 0, t: r(), f: 'peck', act: 0, sing: 3 + r() * 5 });
  return list;
}
function threatDist(c, threats) { let best = 1e9, bx = 0, by = 0; for (const th of threats) { const d = Math.hypot(c.x - th.x, c.y - th.y) - (th.fear || 0); if (d < best) { best = d; bx = th.x; by = th.y; } } return { d: best, x: bx, y: by }; }
function updFauna(list, dt, Wd, threats, ev) {
  const r = Math.random;
  for (const c of list) {
    if (c.k === 'chip') updChip(c, dt, Wd, threats, r);
    else if (c.k === 'sq') updSq(c, dt, Wd, threats, r);
    else if (c.k === 'bird') updBird(c, dt, Wd, threats, r, ev, list);
    else if (c.k === 'bfly') updBfly(c, dt, r);
  }
}
function updChip(c, dt, Wd, th, r) {
  c.ph += dt;
  if (c.st === 'hidden') { c.t -= dt; if (c.t <= 0 && threatDist(c, th).d > 170) { c.st = 'idle'; c.t = 1 + r() * 2; c.f = 'stand'; } return; }
  const T = threatDist(c, th);
  if (T.d < 120 && c.st !== 'flee') { c.st = 'flee'; c.t = .8 + r() * .5; const a = Math.atan2(c.y - T.y, c.x - T.x); c.vx = Math.cos(a); c.vy = Math.sin(a); }
  if (c.st === 'flee') {
    const toH = Math.atan2(c.hy - c.y, c.hx - c.x), away = Math.atan2(c.vy, c.vx), a = Math.hypot(c.hx - c.x, c.hy - c.y) > 20 && Math.cos(toH - away) > -.2 ? toH : away;
    const nx = c.x + Math.cos(a) * 118 * dt, ny = c.y + Math.sin(a) * 118 * dt;
    if (!Wd.blocked(nx, ny, 2)) { c.x = nx; c.y = ny; } else { c.vx = -c.vx; c.vy = -c.vy; }
    c.dir = Math.cos(a) >= 0 ? 0 : 1; c.f = (c.ph * 12 | 0) % 2 ? 'hop1' : 'hop2';
    c.t -= dt;
    if (c.t <= 0) { if (c.hide && Math.hypot(c.hx - c.x, c.hy - c.y) < 26) { c.st = 'hidden'; c.t = 4 + r() * 5; } else { c.st = 'idle'; c.t = 1 + r() * 1.5; c.f = 'stand'; } }
  } else if (c.st === 'idle') {
    c.t -= dt;
    if ((c.ph * 2 | 0) !== ((c.ph - dt) * 2 | 0) && r() < .25) c.f = ['stand', 'sit', 'nibble', 'sit'][(r() * 4) | 0];
    if (c.f === 'nibble' || c.f === 'sit') c.f = (c.ph * 4 | 0) % 2 && c.f !== 'stand' ? 'nibble' : 'sit';
    if (r() < dt * .3) c.dir ^= 1;
    if (c.t <= 0) { const a = r() * TAU, rr = 10 + r() * 46; c.tx = c.hx + Math.cos(a) * rr; c.ty = c.hy + Math.sin(a) * rr * .7; c.st = 'hop'; c.t = 4; }
  } else if (c.st === 'hop') {
    const dx = c.tx - c.x, dy = c.ty - c.y, dd = Math.hypot(dx, dy), go = (c.ph * 3 % 1) < .55;
    c.dir = dx >= 0 ? 0 : 1; c.f = go ? ((c.ph * 10 | 0) % 2 ? 'hop1' : 'hop2') : 'stand';
    if (go && dd > 1) { const nx = c.x + dx / dd * 50 * dt, ny = c.y + dy / dd * 50 * dt; if (!Wd.blocked(nx, ny, 2)) { c.x = nx; c.y = ny; } else c.t = 0; }
    c.t -= dt; if (dd < 2 || c.t <= 0) { c.st = 'idle'; c.t = 1.5 + r() * 3; c.f = 'sit'; }
  }
}
function updSq(c, dt, Wd, th, r) {
  // 땅에서 놀다가 사람이 오면 줄기 중간까지 올라가 매달려서 지켜봄 (보이는 채로). 아주 가까이 와야 나무 위로 숨음
  const t = c.tree, top = t.sp.kind === 'pine' ? 40 : 34, Tt = threatDist({ x: t.x, y: t.y }, th), Tg = threatDist(c, th);
  c.ph += dt; c.t -= dt;
  if (c.st === 'canopy') { if (c.t <= 0 && Tt.d > 170) { c.st = 'down'; c.h = top; } return; }
  if (c.st === 'ground' && Tg.d < 125) { c.st = 'run'; c.fast = true; c.goal = 16 + r() * 10; }
  if (c.st === 'trunk' && Tt.d < 70) { c.st = 'up'; c.fast = true; c.goal = top; }
  if (c.st === 'down' && Tt.d < 120) { c.st = 'trunk'; c.t = 2 + r() * 3; }
  if (c.st === 'trunk') { c.f = 'cling'; if (c.t <= 0) { if (Tt.d > 150) c.st = 'down'; else c.t = 1.5 + r() * 2; } }
  else if (c.st === 'down') { if ((c.ph * 2.4 % 1) < .7) c.h -= 16 * dt; c.f = 'down'; if (c.h <= 0) { c.h = 0; c.st = 'ground'; c.x = t.x + c.side * 7; c.y = t.y + 3; c.t = 5 + r() * 6; c.gx = c.x; c.gy = c.y; c.sub = 'sit'; c.subT = 1; } }
  else if (c.st === 'up') { c.h += (c.fast ? 44 : 18) * dt; c.f = 'up'; if (c.h >= c.goal) { if (c.goal >= top - 1) { c.st = 'canopy'; c.t = 5 + r() * 6; c.h = top; } else { c.h = c.goal; c.st = 'trunk'; c.t = 3 + r() * 4; } } }
  else if (c.st === 'run') {
    const tx = t.x + c.side * 7, ty = t.y + 3, dx = tx - c.x, dy = ty - c.y, dd = Math.hypot(dx, dy);
    c.dir = dx >= 0 ? 0 : 1; c.f = (c.ph * 12 | 0) % 2 ? 'run1' : 'run2';
    if (dd < 3) { c.st = 'up'; c.h = 0; } else { const sp = c.fast ? 120 : 60; c.x += dx / dd * sp * dt; c.y += dy / dd * sp * dt; }
  } else if (c.st === 'ground') {
    c.subT -= dt;
    if (c.sub === 'sit') { c.f = 'sit'; if (c.subT <= 0) { const a = r() * TAU, rr = 10 + r() * 34; c.gx = t.x + Math.cos(a) * rr; c.gy = t.y + 4 + Math.abs(Math.sin(a)) * rr * .6; c.sub = 'move'; c.subT = 3; } }
    else { const dx = c.gx - c.x, dy = c.gy - c.y, dd = Math.hypot(dx, dy); c.dir = dx >= 0 ? 0 : 1; c.f = (c.ph * 10 | 0) % 2 ? 'run1' : 'run2'; if (dd < 2 || c.subT <= 0) { c.sub = 'sit'; c.subT = 1.5 + r() * 2.5; } else { const nx = c.x + dx / dd * 54 * dt, ny = c.y + dy / dd * 54 * dt; if (!Wd.blocked(nx, ny, 2)) { c.x = nx; c.y = ny; } else c.subT = 0; } }
    if (c.t <= 0) { c.st = 'run'; c.fast = false; c.goal = r() < .4 ? top : 14 + r() * 12; }
  }
}
function updBird(c, dt, Wd, th, r, ev, list) {
  c.t -= dt; c.sing -= dt;
  if (c.st === 'fly') {
    c.ft += dt / c.fd; const u = Math.min(1, c.ft), a = c.a, b = c.b, m = c.m;
    c.x = (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * m[0] + u * u * b[0]; c.y = (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * m[1] + u * u * b[1];
    c.f = (c.ft * c.fd * 14 | 0) % 2 ? 'fly1' : 'fly2';
    if (u >= 1) { c.st = c.toGround ? 'ground' : 'perch'; c.f = 'perch'; c.t = 1 + r() * 2; }
    return;
  }
  const flyTo = (gnd) => {
    let tgt = null;
    if (gnd) { const m = WORLD.meadows[(r() * WORLD.meadows.length) | 0], x = m[0] + (r() - .5) * 120, y = m[1] + (r() - .5) * 80; if (Math.hypot(x - c.x, y - c.y) < 480 && threatDist({ x, y }, th).d > 150 && !Wd.blocked(x, y, 2)) tgt = { x, y }; else return; }
    for (let n = 0; n < 30 && !tgt; n++) {
      const t = Wd.trees[(r() * Wd.trees.length) | 0]; if (!t.perches.length) continue;
      const k = (r() * t.perches.length) | 0, p = t.perches[k], dd = Math.hypot(p[0] - c.x, p[1] - c.y);
      if (dd < 60 || dd > 420 || list.some(o => o !== c && o.k === 'bird' && o.tree === t && o.pk === k)) continue;
      if (threatDist({ x: t.x, y: t.y }, th).d < 120) continue;
      tgt = { x: p[0], y: p[1], t, k };
    }
    if (!tgt) return;
    c.a = [c.x, c.y]; c.b = [tgt.x, tgt.y]; c.m = [(c.x + tgt.x) / 2, Math.min(c.y, tgt.y) - 30 - r() * 40];
    c.fd = Math.max(.6, Math.hypot(tgt.x - c.x, tgt.y - c.y) / 110); c.ft = 0; c.st = 'fly'; c.tree = tgt.t || null; c.pk = tgt.k; c.toGround = !!gnd;
    c.dir = tgt.x >= c.x ? 0 : 1;
  };
  if (c.st === 'ground') {
    const T = threatDist(c, th);
    if (T.d < 92) { flyTo(false); return; }
    if (c.t <= 0) { c.t = .4 + r() * 1.2; const a = r(); if (a < .5) { c.f = 'peck'; } else if (a < .8) { c.f = 'hop'; const nx = c.x + (c.dir ? -3 : 3), ny = c.y + (r() - .5) * 3; if (!Wd.blocked(nx, ny, 1)) { c.x = nx; c.y = ny; } } else { c.dir ^= 1; c.f = 'perch'; } }
  } else {
    if (c.tree && threatDist({ x: c.tree.x, y: c.tree.y }, th).d < 44) { flyTo(false); return; }
    if (c.t <= 0) {
      c.t = .5 + r() * 1.8;
      if (c.sp === 'sparrow' && r() < .03) { flyTo(true); if (c.st === 'fly') return; }
      const a = r();
      if (a < .3) c.f = 'peck'; else if (a < .55) { c.f = 'hop'; c.act = .18; } else if (a < .75) { c.dir ^= 1; c.f = 'perch'; } else c.f = 'perch';
      if (r() < .045 * (c.t + 1)) flyTo(false);
    }
  }
  if (c.act > 0) { c.act -= dt; if (c.act <= 0 && c.f === 'hop') c.f = 'perch'; }
  if (c.sing <= 0) { c.sing = 2.5 + r() * 7; c.f = 'chirp'; c.t = .35; if (ev) ev.push({ type: 'chirp', sp: c.sp, x: c.x, y: c.y }); }
}
function updBfly(c, dt, r) {
  c.t -= dt; c.ph += dt * 9;
  if (c.t <= 0) { c.t = 1.5 + r() * 2.5; const a = r() * TAU, rr = r() * 90; c.tx = c.cx + Math.cos(a) * rr; c.ty = c.cy + Math.sin(a) * rr * .7; }
  const dx = c.tx - c.x, dy = c.ty - c.y, dd = Math.hypot(dx, dy) || 1, sp = 18;
  c.x += dx / dd * sp * dt + Math.sin(c.ph * .7) * 6 * dt; c.y += dy / dd * sp * dt; c.z = 8 + Math.sin(c.ph * .5) * 3;
  c.f = (c.ph | 0) % 2;
}
