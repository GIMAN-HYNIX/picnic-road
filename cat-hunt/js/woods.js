'use strict';
/* =========================================================
   거대한 나무 숲 (에디토리얼 캐리커처 픽셀)
   평평한 색 · 잉크 테두리 · 종이 질감. 흐림이나 원근 기울기는 쓰지 않음
   - 큰 줄기: 밑동 그림(나무마다) + 위로 반복되는 줄기 무늬 → 화면 위로 빠져나감
   - 땅은 256 조각으로 필요할 때 굽고, 줄기 밑동 그림도 필요할 때 굽는다
   1 픽셀 ≈ 2.6cm (사냥꾼 키 약 66, 큰 나무 지름 18~90)
   ========================================================= */
const WOODS = (() => {
  const WW = 3600, WH = 2600, CHK = 256, BASE = 210, VZ = .88;
  const WCLS = [18, 22, 26, 30, 34, 40, 46, 52, 58, 66, 74, 82, 90];
  const snapW = w => WCLS.reduce((a, b) => Math.abs(b - w) < Math.abs(a - w) ? b : a);

  /* ---------- 값 잡음 (빠른 표) ---------- */
  const PERM = new Uint8Array(512), RV = new Float32Array(256);
  (() => { const r = RNG(1234), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; for (let i = 0; i < 256; i++) RV[i] = r(); })();
  const lat = (i, j) => RV[PERM[(PERM[i & 255] + j) & 255]];
  function vn(x, y, py) {
    let xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    let y1 = yi + 1; if (py) { yi = ((yi % py) + py) % py; y1 = (yi + 1) % py; }
    const a = lat(xi, yi), b = lat(xi + 1, yi), c = lat(xi, y1), d = lat(xi + 1, y1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fb = (x, y, o = 3) => { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vn(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= .5; f *= 2.03; } return s / n; };
  const hh = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const U = h => C(h);
  const mixU = (a, b, t) => { const ar = a & 255, ag = (a >>> 8) & 255, ab = (a >>> 16) & 255, br = b & 255, bg = (b >>> 8) & 255, bb = (b >>> 16) & 255; return rgb2u(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t, a >>> 24); };
  const shadeU = (a, f) => rgb2u((a & 255) * f, ((a >>> 8) & 255) * f, ((a >>> 16) & 255) * f, a >>> 24);
  const INKU = U(INK);
  function toCanvas(d, W, H) { const [c, g] = makeCanvas(W, H), img = g.createImageData(W, H); new Uint32Array(img.data.buffer).set(d); g.putImageData(img, 0, 0); return c; }
  // 종이 질감: 밝기를 아주 살짝 흔듦
  function grainBuf(d, W, H, x0, y0, amt) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, u = d[i]; if (!(u >>> 24)) continue;
      const f = 1 + (hh(x + x0, y + y0) - .5) * amt * 2 + (vn((x + x0) * .09, (y + y0) * .09) - .5) * amt * 1.2;
      d[i] = rgb2u((u & 255) * f, ((u >>> 8) & 255) * f, ((u >>> 16) & 255) * f, u >>> 24);
    }
  }
  // 바깥 잉크 테두리 (topSkip: 맨 위 몇 줄은 줄기와 이어지므로 테두리 없음)
  function inkOut(d, W, H, topSkip = 0) {
    const out = new Uint32Array(d);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (d[i] >>> 24) continue;
      const side = (x > 0 && d[i - 1] >>> 24) || (x < W - 1 && d[i + 1] >>> 24), below = y < H - 1 && d[i + W] >>> 24, above = y > 0 && d[i - W] >>> 24;
      if (side || below || (above && y > topSkip)) out[i] = INKU;
    }
    return out;
  }

  /* ---------- 선 (오솔길, 개울) ---------- */
  function spline(pts, step = 4) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1].slice()); return out;
  }
  class Poly {
    constructor(pts) {
      this.p = pts; this.g = new Map(); const G = 128;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], x0 = Math.floor((Math.min(a[0], b[0]) - 160) / G), x1 = Math.floor((Math.max(a[0], b[0]) + 160) / G), y0 = Math.floor((Math.min(a[1], b[1]) - 160) / G), y1 = Math.floor((Math.max(a[1], b[1]) + 160) / G);
        for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const k = gx + gy * 1000; let l = this.g.get(k); if (!l) this.g.set(k, l = []); l.push(i); }
      }
    }
    dist(x, y) {
      const l = this.g.get(Math.floor(x / 128) + Math.floor(y / 128) * 1000); if (!l) return 1e9;
      let best = 1e9; const p = this.p;
      for (const i of l) {
        const a = p[i], b = p[i + 1], ax = b[0] - a[0], ay = b[1] - a[1], L = ax * ax + ay * ay || 1;
        const t = clamp(((x - a[0]) * ax + (y - a[1]) * ay) / L, 0, 1), dx = x - a[0] - ax * t, dy = y - a[1] - ay * t, d = dx * dx + dy * dy;
        if (d < best) best = d;
      }
      return Math.sqrt(best);
    }
  }

  /* ---------- 지도 뼈대 ---------- */
  const LAY = {
    trail: [[1500, 2680], [1510, 2420], [1450, 2220], [1500, 2000], [1630, 1820], [1660, 1620], [1580, 1440], [1575, 1250], [1700, 1080], [1950, 930], [2250, 860], [2520, 770], [2800, 700], [3120, 720], [3700, 640]],
    west: [[1500, 2010], [1300, 1930], [1080, 1900], [860, 1820], [640, 1770], [470, 1690]],
    stream: [[-60, 880], [300, 990], [620, 1070], [900, 1170], [1200, 1225], [1575, 1250], [1900, 1335], [2200, 1480], [2500, 1570], [2800, 1700], [3100, 1860], [3400, 1950], [3700, 2010]],
    clearing: { x: 2720, y: 520, rx: 330, ry: 230 },
    glade: { x: 900, y: 1060, rx: 160, ry: 110 },
    hollow: { x: 420, y: 1640, r: 120 },
    start: [1505, 2290],
    bridge: { x: 1575, y: 1250, hw: 16, hl: 56 },
  };
  const ellIn = (e, x, y, m = 0) => { const dx = (x - e.x) / (e.rx + m), dy = (y - e.y) / (e.ry + m); return dx * dx + dy * dy; };

  /* ---------- 색 (평평한 몇 가지 색. 햇빛 받은 밝기로 칠하고 그늘은 빛 지도로 곱함) ---------- */
  const COL = {
    lit: ['#8a6a48', '#9a7852'].map(U), humus: U('#6e533c'),
    moss: ['#6a8a3c', '#7c9c46'].map(U), need: ['#a8643a', '#b87444'].map(U),
    acc: ['#c08a42', '#cc6e32', '#8a9440', '#5e4630', '#d8b25c', '#a85a2e'].map(U),
    twig: U('#4a3020'), sprout: ['#5a8a3a', '#7aaa4a'].map(U),
    trail: ['#c8a46c', '#d4b47c', '#b8925c'].map(U), trailE: U('#a07a4a'), peb: ['#9a948a', '#c4beb2'].map(U),
    water: ['#4a8aa4', '#5a9cb4', '#78b4c8'].map(U), foam: U('#e8f4f2'), sand: ['#c8ae7e', '#b49a6c'].map(U), mud: U('#7a6248'),
    grass: ['#86ad52', '#97be5e', '#76a046'].map(U), blade: U('#5e8a3c'),
    flower: ['#f6f2e4', '#f4d65a', '#d8a0d8', '#ee9aa8'].map(U),
    plank: ['#b07a44', '#9a6838', '#c48a52'].map(U),
    root: ['#5c4232', '#76563e', '#94704e'].map(U),
  };
  const BARK = {
    oak: { s: '#4e3e34', b: '#6e5a4a', l: '#8e7864' },
    giant: { s: '#463830', b: '#64503f', l: '#846c56' },
    pine: { s: '#58362a', b: '#82503a', l: '#a46c4c', lo: { s: '#4c3c32', b: '#6c5848', l: '#8a7462' } },
    birch: { s: '#b6b0a4', b: '#e8e4da', l: '#faf7ee', mk: '#2c2826' },
  };
  const BU = {}; for (const k in BARK) { const b = BARK[k]; BU[k] = { t: [U(b.s), U(b.b), U(b.l)], lo: b.lo ? [U(b.lo.s), U(b.lo.b), U(b.lo.l)] : null, mk: b.mk ? U(b.mk) : 0, ink: mixU(U(b.s), INKU, .55) }; }
  const MOSSU = ['#4e6a2c', '#6a8a3a', '#86a64a'].map(U);

  /* ---------- 큰 줄기: 왼쪽(서쪽) 그늘 · 가운데 · 오른쪽 빛 줄. 경계는 손으로 그린 듯 물결 ---------- */
  function toneAt(vari, u, hRel) {
    const p = 256, yy = ((Math.floor(-hRel) % p) + p) % p;
    const wav = (vn(vari * 13 + 5, yy * (12 / 256), 12) - .5) * .34;
    return u < -.3 + wav ? 0 : u > .48 + wav * .6 ? 2 : 1;
  }
  // 줄기 잉크 획 (세로 짧은 선) · 자작나무는 가로 점선. wrapH 가 있으면 위아래로 이어지게
  function barkMarks(d, W, H, x0, x1, hwAt, ox, sp, seed, wrap) {
    const r = RNG(seed), n = Math.round(H * (x1 - x0) / (sp === 'birch' ? 75 : 44));
    const at = (x, y) => { if (wrap) y = ((y % H) + H) % H; if (x < x0 || x >= x1 || y < 0 || y >= H) return -1; const i = y * W + x; return d[i] >>> 24 ? i : -1; };
    for (let k = 0; k < n; k++) {
      const y0 = Math.floor(r() * H), u0 = (r() * 2 - 1) * .86, len = 5 + (r() * 14 | 0), ph = r() * 6;
      if (sp === 'birch') { const wd = 2 + (r() * 5 | 0), xc = Math.round(ox + u0 * hwAt(y0)); for (let i = 0; i < wd; i++) { const j = at(xc + i, y0); if (j >= 0) d[j] = BU.birch.mk; } continue; }
      for (let s = 0; s < len; s++) { const y = y0 + s, x = Math.round(ox + u0 * hwAt(((y % H) + H) % H) + Math.sin(s * .45 + ph) * .7), j = at(x, y); if (j >= 0) d[j] = mixU(d[j], INKU, u0 < -.3 ? .5 : .62); }
    }
  }
  function trunkBase(t) {
    const w = t.w, R = w / 2, sp = t.sp, fl = w * (sp === 'giant' ? .85 : sp === 'birch' ? .22 : sp === 'pine' ? .42 : .55);
    const snagW = t.snags.reduce((m, s) => Math.max(m, s.len + 4), 0);
    const W = Math.ceil(w + fl * 2 + snagW * 2 + 12), dep = Math.ceil(R * .5 + 3), H = BASE + dep + 3, ox = W >> 1, oy = BASE;
    const d = new Uint32Array(W * H), B = BU[sp], seed = t.seed, lobeK = (seed % 7) * .9;
    const hwAt = y => { const h = (oy - y) / VZ; return R * (1 + (fl / R) * Math.exp(-Math.max(0, h) / (w * .26))); };
    for (let y = 0; y < H; y++) {
      const h = (oy - y) / VZ, hw0 = hwAt(y);
      for (let x = 0; x < W; x++) {
        const dx = x + .5 - ox;
        const hw = h < w * .5 ? hw0 * (1 + .14 * Math.sin(dx / (R + fl) * 5.5 + lobeK) * ss(w * .5, 0, h)) : hw0;
        if (Math.abs(dx) > hw) continue;
        const u = dx / hw;
        if (y - oy > Math.sqrt(Math.max(0, 1 - u * u)) * hw * .45) continue;
        let tone = toneAt(t.vari, u, h - BASE / VZ);
        if (h < 6 && tone > 0) tone--;
        const pal = sp === 'pine' && h < 70 + vn(x * .2 + seed, 2) * 40 ? B.lo : B.t;
        d[y * W + x] = pal[tone];
      }
    }
    barkMarks(d, W, H, 0, W, y => hwAt(y), ox, sp, seed, false);
    const r = RNG(seed + 5);
    // 옹이
    for (let k = 0; k < (sp === 'birch' ? 2 : 1 + (r() * 2 | 0)); k++) {
      const y = Math.floor(30 + r() * (BASE - 70)), hw = hwAt(y), x = Math.round(ox + (r() - .4) * hw * .9), rx = 1.6 + r() * (sp === 'birch' ? 3 : 2.4), ry = rx * (sp === 'birch' ? .55 : 1.3);
      for (let j = -Math.ceil(ry) - 1; j <= Math.ceil(ry) + 1; j++) for (let i = -Math.ceil(rx) - 1; i <= Math.ceil(rx) + 1; i++) {
        const q = (i / rx) ** 2 + (j / ry) ** 2, X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= W || Y >= H || !(d[Y * W + X] >>> 24)) continue;
        if (q < .45) d[Y * W + X] = sp === 'birch' ? B.mk : mixU(B.t[0], INKU, .5); else if (q < 1.25) d[Y * W + X] = sp === 'birch' ? mixU(B.mk, B.t[1], .3) : B.ink;
      }
    }
    // 이끼: 밑동 왼쪽에 평평한 초록 덩어리
    if (sp !== 'birch') for (let k = 0, nm = 2 + (r() * 3 | 0) + (sp === 'giant' ? 3 : 0); k < nm; k++) {
      const y = Math.floor(oy - r() * 22 - (k % 2) * 8), hw = hwAt(y), x = Math.round(ox - hw * (.2 + r() * .7)), rx = 3 + r() * 6, ry = 2 + r() * 3;
      for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) for (let i = -Math.ceil(rx); i <= Math.ceil(rx); i++) {
        if ((i / rx) ** 2 + (j / ry) ** 2 > 1) continue; const X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= W || Y >= H || !(d[Y * W + X] >>> 24)) continue;
        d[Y * W + X] = MOSSU[j < -ry * .3 ? 2 : j > ry * .3 ? 0 : 1];
      }
    }
    // 마른 가지 그루터기 (새가 앉는 곳)
    for (const sn of t.snags) {
      const y0 = Math.round(oy - sn.h * VZ), x0 = ox + sn.side * (hwAt(y0) - 1);
      for (let k = 0; k <= sn.len; k++) {
        const x = Math.round(x0 + sn.side * k), y = Math.round(y0 - k * .4), rad = Math.max(.8, 2.4 - k * .12);
        for (let j = -Math.ceil(rad); j <= Math.ceil(rad); j++) { const yy = y + j; if (yy < 0 || yy >= H || x < 0 || x >= W) continue; d[yy * W + x] = B.t[j < 0 ? 2 : j > 0 ? 0 : 1]; }
      }
    }
    grainBuf(d, W, H, seed * 7, seed * 3, .035);
    return { c: toCanvas(inkOut(d, W, H, 3), W, H), ox, oy };
  }
  // 위로 반복되는 줄기 무늬 (256 높이로 이어짐). 양옆 잉크선
  const SHAFT = new Map();
  function shaft(sp, w, vari) {
    const key = sp + w + ':' + vari; let s = SHAFT.get(key); if (s) return s;
    const H = 256, W = w + 2, R = w / 2, ox = W / 2, d = new Uint32Array(W * H), B = BU[sp];
    for (let y = 0; y < H; y++) for (let x = 1; x < W - 1; x++) { const u = (x + .5 - ox) / R; if (Math.abs(u) <= 1) d[y * W + x] = B.t[toneAt(vari, u, H - y)]; }
    barkMarks(d, W, H, 1, W - 1, () => R, ox, sp, 900 + vari * 77 + w + sp.length, true);
    if (sp !== 'birch') { const r = RNG(w * 31 + vari); for (let k = 0; k < 2; k++) { const y = Math.floor(r() * H), x = Math.round(ox + (r() - .4) * R * .8), rr = 1.6 + r() * 2; for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const q = (i / rr) ** 2 + (j / (rr * 1.3)) ** 2, X = x + i, Y = ((y + j) % H + H) % H; if (X < 1 || X >= W - 1 || !(d[Y * W + X] >>> 24)) continue; if (q < .45) d[Y * W + X] = mixU(B.t[0], INKU, .5); else if (q < 1.25) d[Y * W + X] = B.ink; } } }
    grainBuf(d, W, H, w * 13 + vari * 5, vari * 17, .035);
    for (let y = 0; y < H; y++) { d[y * W] = INKU; d[y * W + W - 1] = INKU; }
    s = { c: toCanvas(d, W, H), W, H }; SHAFT.set(key, s); return s;
  }

  /* ---------- 아래층 식물과 물건 (hires 에디토리얼 엔진) ---------- */
  const FT = edPal('#2c4a2a'), STY = Object.assign({}, ED, { cel: [.04, .74] });
  const bake = (W, H, ox, oy, fn, seed, sty) => { const pb = hiBake(W, H, ox, oy, fn, sty || STY); grain(pb, .035, seed); return { c: pb.canvas(), ox, oy }; };
  const leafTex = (seed, i) => (x, y) => { const h = hash2(Math.round(x / 2) + seed, Math.round(y / 2) + i * 7); return h > .86 ? 1 : h < .1 ? -1 : 0; };
  function fernSet(seed, sz) {
    const r = RNG(seed), LF = FT(['#4f9a48', '#5aa04c', '#468a40'][seed % 3], .3), fronds = [];
    for (let k = 0; k < 7; k++) fronds.push({ a: Math.PI * (-.94 + k * .145) + (r() - .5) * .12, L: (9 + r() * 4) * sz });
    return [-1, 0, 1].map(bend => bake(Math.ceil(38 * sz), Math.ceil(26 * sz), Math.ceil(19 * sz), Math.ceil(23 * sz), R => {
      for (let k = 0; k < fronds.length; k++) {
        const f = fronds[k], ex = Math.cos(f.a) * f.L + bend * 2.2 * sz, ey = Math.sin(f.a) * f.L * .8;
        R.K2(0, -1, ex, ey - 1, .7 * sz, .45 * sz, LF, { g: 'st' + k });
        for (let j = 2; j < 7; j++) { const t = j / 7, px = ex * t, py = ey * t - 1; R.E(px + Math.sin(f.a) * 1.6 * sz, py - Math.cos(f.a) * .9 * sz, (1.8 - t * .8) * sz, sz, f.a, LF, { g: 'lf' + k + j }); R.E(px - Math.sin(f.a) * 1.6 * sz, py + Math.cos(f.a) * .9 * sz, (1.8 - t * .8) * sz, sz, f.a, LF, { g: 'lf' + k + j }); }
      }
    }, seed));
  }
  function bushSpr(seed, sz, kind) {
    const r = RNG(seed), LF = FT(['#4f8a3e', '#5a9444', '#467e3a'][seed % 3], .28), W = Math.ceil(42 * sz), H = Math.ceil(34 * sz);
    const s = bake(W, H, W >> 1, H - 3, R => {
      [[-8, -8, 8.6, 6.8], [8, -8, 8.6, 6.8], [0, -13, 10, 8], [-3, -5, 9, 5.6]].forEach((b, i) => R.E((b[0] + (r() - .5) * 2) * sz, b[1] * sz, b[2] * sz, b[3] * sz, 0, LF, R.pat({ g: 'b' + i, ol: 2, tex: leafTex(seed, i) })));
      if (kind) for (let i = 0; i < 8; i++) R.stamp((-9 + r() * 18) * sz, (-16 + r() * 11) * sz, kind === 1 ? ['w'] : ['r'], { w: '#f8f4ea', r: i % 2 ? '#d8392f' : '#e85a40' });
    }, seed);
    s.top = [0, -19 * sz]; return s;
  }
  function youngTree(seed, kind) {
    const r = RNG(seed);
    if (kind === 'birch') {
      const BK = ['#b9b4aa', '#ece8df'], LF = FT('#82b85a', .28), MK = ['#2a2626', '#3a3434'], lobes = [];
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + r(), rr = 7 + r() * 10; lobes.push([Math.cos(a) * rr, -94 + Math.sin(a) * rr * .8, 8 + r() * 3.4, 7 + r() * 2]); }
      lobes.sort((a, b) => a[1] - b[1]);
      const mark = (x, y) => (hash2(7 + Math.round(x * .3), Math.round(y)) > .74 && Math.abs(x) < 2.2 ? 0 : -1);
      const s = bake(76, 132, 38, 126, R => {
        R.K2(0, -1, .6, -84, 3, 2.2, BK, R.pat({ g: 'trunk', alts: [MK], alt: mark }));
        R.K2(.6, -40, 8, -76, 1.8, 1.3, BK, R.pat({ g: 'br', alts: [MK], alt: mark }));
        lobes.forEach((l, i) => R.E(l[0], l[1], l[2], l[3], 0, LF, R.pat({ g: 'lf' + i, ol: 2, tex: leafTex(seed, i) })));
      }, seed);
      s.top = [0, -112]; return s;
    }
    if (kind === 'pine') {
      const TR = FT('#a8582e'), LF = FT('#3f6e4c', .26);
      const cl = [[-14, -52, 15, 6.6], [13, -66, 16, 6.8], [-9, -82, 15, 7], [9, -96, 12.6, 6.2], [-1, -110, 9.4, 5.4]].map(b => [b[0] + (r() - .5) * 4, b[1] + (r() - .5) * 3, b[2] + (r() - .5) * 2, b[3]]);
      const s = bake(80, 130, 40, 124, R => {
        R.chain([[0, -1], [1.6, -26], [-.6, -50], [1.2, -80], [0, -108]], [4.4, 3.8, 3.2, 2.6, 1.8], TR, R.pat({ g: 'trunk', tex: (x, y) => (hash2(Math.round(x * .8), Math.round(y / 3)) > .7 ? -1 : 0) }));
        cl.forEach((b, i) => R.K2(0, b[1] + 2, b[0] * .7, b[1], 1.2, .9, TR, { g: 'br' + i }));
        cl.forEach((b, i) => R.E(b[0], b[1], b[2], b[3], 0, LF, R.pat({ g: 'nd' + i, ol: 2, tex: (x, y) => (mod(Math.round(x * .9 - y * 1.6) + i, 4) === 0 ? -1 : hash2(Math.round(x / 2) + seed, Math.round(y / 2)) > .9 ? 1 : 0) })));
      }, seed);
      s.top = [cl[4][0], -116]; return s;
    }
    const TR = FT('#76502f'), LF = FT('#5e9a45', .3), cy = -74;
    const lobes = [[-19, 6, 16, 13], [19, 5, 16, 13], [0, -11, 21, 16], [-12, -4, 17, 14], [13, -6, 17, 14], [0, 8, 20, 13]].map(b => [b[0] + (r() - .5) * 4, cy + b[1] + (r() - .5) * 4, b[2] + (r() - .5) * 3, b[3] + (r() - .5) * 2]);
    const s = bake(92, 120, 46, 114, R => {
      R.E(-5, -1.6, 3.8, 2, 0, TR, { g: 'root' }); R.E(5.6, -1.4, 3.6, 1.8, 0, TR, { g: 'root' });
      R.K2(0, -2, .8, -46, 5, 4, TR, R.pat({ g: 'trunk', tex: (x, y) => (mod(Math.round(x * 1.3 + Math.sin(y * .35) * 1.4), 3) === 0 ? -1 : 0) }));
      R.K2(.6, -40, -10, -56, 1.9, 1.4, TR, { g: 'br1' }); R.K2(.8, -42, 11, -58, 1.9, 1.4, TR, { g: 'br2' });
      lobes.forEach((l, i) => R.E(l[0], l[1], l[2], l[3], 0, LF, R.pat({ g: 'lf' + i, ol: 2, tex: leafTex(seed, i) })));
    }, seed);
    s.top = [lobes[2][0], lobes[2][1] - lobes[2][3] + 2]; return s;
  }
  function rockSpr(seed, sz) {
    const r = RNG(seed), ST = FT('#8e9088', .3), MO = FT('#6a9a46'), W = Math.ceil(40 * sz), H = Math.ceil(30 * sz);
    return bake(W, H, W >> 1, H - 3, R => {
      R.scl(sz);
      R.P([[-12, -2], [-13, -9], [-8, -15], [2, -16.6], [10, -13], [13, -6.6], [11, -1]], ST, { g: 'rock' });
      R.E(-2 + r() * 2, -13.4, 7, 2.8, 0, MO, R.pat({ g: 'moss', tex: (x, y) => (hash2(Math.round(x), Math.round(y)) > .8 ? -1 : 0) }));
      R.DL(2, -9, 5, -4.4, ST[0]); R.DL(-6.6, -6.6, -4.4, -3.4, ST[0]);
    }, seed);
  }
  function logSpr(seed, len) {
    const BK = FT('#6e4a2c'), EN = FT('#c99a62', .3), MO = FT('#6a9a46'), r = RNG(seed), L = len / 2;
    const s = bake(Math.ceil(len + 22), 34, Math.ceil(len / 2 + 10), 27, R => {
      R.K2(-L, -9, L - 3, -9, 8, 7.6, BK, R.pat({ g: 'log', tex: (x, y) => (mod(Math.round(y * 1.1 + Math.sin(x * .3) * 1.4), 3) === 0 ? -1 : 0) }));
      R.E(L - 1, -9, 4, 7.6, 0, EN, { g: 'end', ol: 1 });
      R.stamp(L - 1, -9, ['.ee.', 'e..e', 'e..e', '.ee.'], { e: '#a87a48' }, 2, 2);
      for (let k = 0; k < 3; k++) { const x = -L + 8 + r() * (len - 24); R.E(x, -15.6, 5 + r() * 5, 2.2, 0, MO, { g: 'moss' + k }); }
      if (r() < .7) { const x = -L + 10 + r() * (len - 30); R.K2(x, -15, x, -18.4, .9, .9, ['#d9cbb4', '#f1e6d4'], { g: 'mst' }); R.E(x, -19, 2.6, 1.5, 0, FT('#b0744a'), { g: 'mcap' }); R.K2(x + 3, -15, x + 3, -17.4, .8, .8, ['#d9cbb4', '#f1e6d4'], { g: 'mst2' }); R.E(x + 3, -17.8, 2, 1.2, 0, FT('#b0744a'), { g: 'mcap2' }); }
      if (r() < .6) { const x = -L + 6 + r() * (len - 20); R.E(x, -6, 3.4, 1.4, 0, ['#c8b48a', '#e8d6ae'], { g: 'shelf', ol: 1 }); R.E(x + 4, -4.6, 2.6, 1.2, 0, ['#c8b48a', '#e8d6ae'], { g: 'shelf2', ol: 1 }); }
    }, seed);
    s.len = len; return s;
  }
  function stumpSpr(seed, sz) {
    const BK = FT('#6e4a2c'), TOP = FT('#d2a66c', .3), W = Math.ceil(32 * sz), H = Math.ceil(26 * sz);
    return bake(W, H, W >> 1, H - 3, R => {
      R.scl(sz);
      R.E(-6.6, -1.2, 2.8, 1.5, 0, BK, { g: 'root' }); R.E(6.8, -1, 2.6, 1.4, 0, BK, { g: 'root2' });
      R.P([[-9, -1], [-9.6, -10], [9.6, -10], [9, -1]], BK, R.pat({ g: 'body', side: .66, tex: (x) => (mod(Math.round(x * 1.4), 3) === 0 ? -1 : 0) }));
      R.E(0, -10, 9.6, 3.4, 0, TOP, { g: 'top' });
      R.stamp(0, -10, ['.rrr.', 'r...r', '.rrr.'], { r: '#b0844e' }, 2, 1);
    }, seed);
  }
  function mushSpr(seed) {
    const red = seed % 4 === 0, CAP = red ? FT('#d8452e', .3) : FT('#b0744a', .3), STM = ['#d9cbb4', '#f3eadc'];
    return bake(20, 16, 10, 14, R => {
      R.K2(-2.8, -1, -2.8, -5, 1, 1, STM, { g: 's1' }); R.E(-2.8, -5.6, 3, 1.8, 0, CAP, { g: 'c1' });
      R.K2(2.8, -1, 2.8, -3.6, .9, .9, STM, { g: 's2' }); R.E(2.8, -4, 2.3, 1.4, 0, CAP, { g: 'c2' });
      if (red) { R.stamp(-3.4, -6, ['w.w'], { w: '#fff6ea' }); R.stamp(2.4, -4.6, ['w'], { w: '#fff6ea' }); }
    }, seed);
  }
  function tuftSet(seed, grassy) {
    const r = RNG(seed), A = FT(grassy ? '#6aa04c' : '#5a8a42', .32), blades = [];
    for (let k = 0; k < 6; k++) blades.push([-5 + k * 2 + (r() - .5), 8 + r() * (grassy ? 8 : 5), (k - 2.5) * .9]);
    return [0, .9, -.7].map(sw => bake(22, 22, 11, 20, R => { blades.forEach(([bx, h, ln], k) => R.K2(bx, -.5, bx + ln + sw * (h / 10), -h, 1, .35, A, { g: 'b' + k })); }, seed));
  }
  // 높은 가지: 줄기 오른쪽으로 뻗는 가지와 잎 (그늘 색, 빛 지도를 받지 않음)
  function highBranch(seed) {
    const r = RNG(seed), TR = ['#2e2620', '#3e342a'], LF = ['#203420', '#2e4c28', '#466a32'], len = 70 + r() * 70, W = Math.ceil(len + 70), H = 100;
    return bake(W, H, 6, 60, R => {
      const ex = len, ey = -18 - r() * 18;
      R.K2(0, 0, ex * .55, ey * .6, 3.4, 2.2, TR, { g: 'br' }); R.K2(ex * .55, ey * .6, ex, ey, 2.2, 1.2, TR, { g: 'br2' });
      R.K2(ex * .4, ey * .45, ex * .62, ey * .45 - 16, 1.4, .8, TR, { g: 'tw' });
      const lobes = []; for (let k = 0; k < 7; k++) { const t = .4 + r() * .62; lobes.push([ex * t + (r() - .5) * 18, ey * t - 6 + (r() - .5) * 14, 11 + r() * 9, 8 + r() * 5]); }
      lobes.sort((a, b) => a[1] - b[1]).forEach((l, i) => R.E(l[0], l[1], l[2], l[3], 0, LF, R.pat({ g: 'lf' + i, ol: 2, tex: leafTex(seed, i) })));
    }, seed, Object.assign({}, ED, { cel: [.12, .86] }));
  }
  // 앞쪽(카메라 가까이) 고사리 실루엣: 아주 짙은 평평한 색
  function fgFern(seed, sz) {
    const r = RNG(seed), C1 = ['#0e1a10', '#16261a'], fr = [];
    for (let k = 0; k < 7; k++) fr.push({ a: Math.PI * (-.95 + k * .15) + (r() - .5) * .1, L: (12 + r() * 6) * sz });
    return bake(Math.ceil(46 * sz), Math.ceil(30 * sz), Math.ceil(23 * sz), Math.ceil(28 * sz), R => {
      for (let k = 0; k < fr.length; k++) {
        const f = fr[k], ex = Math.cos(f.a) * f.L, ey = Math.sin(f.a) * f.L * .8;
        R.K2(0, -1, ex, ey - 1, .9 * sz, .5 * sz, C1, { g: 'st' + k, flat: 1 });
        for (let j = 2; j < 8; j++) { const t = j / 8; R.E(ex * t + Math.sin(f.a) * 1.8 * sz, ey * t - 1 - Math.cos(f.a) * sz, (2 - t) * sz, 1.1 * sz, f.a, C1, { g: 'l' + k + j, flat: 1 }); R.E(ex * t - Math.sin(f.a) * 1.8 * sz, ey * t - 1 + Math.cos(f.a) * sz, (2 - t) * sz, 1.1 * sz, f.a, C1, { g: 'l' + k + j, flat: 1 }); }
      }
    }, seed, { outline: '#070c08' });
  }

  /* ---------- 세계 만들기 ---------- */
  function gen(seed = 11) {
    const rnd = RNG(seed), W = { WW, WH, CHK, BASE, VZ, LAY, COL };
    const trail = new Poly(spline(LAY.trail)), west = new Poly(spline(LAY.west)), stream = new Poly(spline(LAY.stream));
    W.trail = trail; W.west = west; W.stream = stream;
    const trailD = (x, y) => Math.min(trail.dist(x, y), west.dist(x, y));
    const streamW = (x, y) => 20 + 7 * vn(x * .004 + 3, y * .004);
    const onBridge = (x, y) => { const b = LAY.bridge; return Math.abs(x - b.x) < b.hw && Math.abs(y - b.y) < b.hl; };
    W.trailD = trailD; W.streamW = streamW; W.onBridge = onBridge;
    const inOpen = (x, y, m = 0) => ellIn(LAY.clearing, x, y, m) < 1 || ellIn(LAY.glade, x, y, m) < 1;

    /* 충돌 격자 */
    const COLG = new Map(), CG = 96;
    const addCol = o => { const r = o.r; for (let gy = Math.floor((o.y - r) / CG); gy <= Math.floor((o.y + r) / CG); gy++) for (let gx = Math.floor((o.x - r) / CG); gx <= Math.floor((o.x + r) / CG); gx++) { const k = gx + gy * 1000; let l = COLG.get(k); if (!l) COLG.set(k, l = []); l.push(o); } };
    const near = (x, y, rad, test) => { for (let gy = Math.floor((y - rad) / CG); gy <= Math.floor((y + rad) / CG); gy++) for (let gx = Math.floor((x - rad) / CG); gx <= Math.floor((x + rad) / CG); gx++) { const l = COLG.get(gx + gy * 1000); if (l) for (const o of l) if (test(o)) return true; } return false; };

    /* 큰 나무 */
    const trees = [];
    const mkTree = (sp, x, y, w) => {
      w = snapW(w);
      const t = { sp, x, y, w, seed: Math.floor(rnd() * 1e5), vari: (rnd() * 2) | 0, snags: [], fade: 1, base: null, ph: Math.floor(rnd() * 256) };
      const ns = sp === 'birch' ? 0 : rnd() < .5 ? 1 + (rnd() < .3 ? 1 : 0) : 0;
      for (let k = 0; k < ns; k++) t.snags.push({ h: 64 + rnd() * 110, side: rnd() < .5 ? -1 : 1, len: 7 + rnd() * 9 });
      t.br = []; const nb = sp === 'birch' ? (rnd() < .3 ? 1 : 0) : rnd() < .6 ? 1 : rnd() < .2 ? 2 : 0;
      for (let k = 0; k < nb; k++) t.br.push({ h: 340 + rnd() * 380, side: rnd() < .5 ? -1 : 1, i: (rnd() * 6) | 0 });
      trees.push(t); addCol({ x, y, r: w * .42, tree: t }); return t;
    };
    mkTree('giant', LAY.hollow.x, LAY.hollow.y - 30, 90); mkTree('giant', 2060, 1140, 74); mkTree('giant', 1250, 2160, 74); mkTree('giant', 2960, 1310, 82); mkTree('giant', 3300, 2300, 74); mkTree('giant', 640, 640, 74);
    for (let tries = 0; tries < 15000 && trees.length < 300; tries++) {
      const x = 30 + rnd() * (WW - 60), y = 50 + rnd() * (WH - 70);
      const edge = Math.min(x, y, WW - x, WH - y) < 110, nearWater = stream.dist(x, y) < 160, nearOpen = ellIn(LAY.clearing, x, y, 120) < 1;
      const sp = (nearWater || nearOpen) && rnd() < .45 ? 'birch' : rnd() < .32 ? 'pine' : 'oak';
      const w = sp === 'birch' ? 18 + rnd() * 10 : sp === 'pine' ? 28 + rnd() * 20 : 32 + rnd() * 28;
      if (inOpen(x, y, 40) || trailD(x, y) < 30 + w * .7 || stream.dist(x, y) < streamW(x, y) + 14 + w * .6 || Math.hypot(x - LAY.start[0], y - LAY.start[1]) < 70) continue;
      const minD = edge ? 70 : sp === 'birch' ? 90 : 150;
      if (near(x, y, 260, o => o.tree && Math.hypot(o.x - x, o.y - y) < minD + (o.tree.w + w) * .9)) continue;
      mkTree(sp, x, y, w);
    }
    W.trees = trees;

    /* 아래층 */
    const objs = [], ferns = [], perches = [], hides = [];
    const okSpot = (x, y, r, trailM = 22) => !(trailD(x, y) < trailM || stream.dist(x, y) < streamW(x, y) + 8 || near(x, y, r + 60, o => Math.hypot(o.x - x, o.y - y) < o.r + r));
    const YT = ['oak', 'oak', 'birch', 'pine'].map((k, i) => [0, 1, 2].map(v => youngTree(700 + i * 31 + v * 7, k))).flat();
    for (let k = 0, tries = 0; k < 120 && tries < 5000; tries++) {
      const x = 40 + rnd() * (WW - 80), y = 60 + rnd() * (WH - 90); if (inOpen(x, y, -20) || !okSpot(x, y, 12, 28)) continue;
      const s = YT[(rnd() * YT.length) | 0], o = { k: 'yt', x, y, s, r: 4 };
      objs.push(o); addCol(o); perches.push({ x: x + s.top[0], y, h: -s.top[1] / VZ, kind: 'yt', o }); k++;
    }
    const BSH = []; for (let i = 0; i < 10; i++) BSH.push(bushSpr(400 + i * 13, 1.2 + (i % 4) * .22, i % 5 === 1 ? 1 : i % 7 === 3 ? 2 : 0));
    for (let k = 0, tries = 0; k < 240 && tries < 8000; tries++) {
      let x = 30 + rnd() * (WW - 60), y = 50 + rnd() * (WH - 80);
      if (rnd() < .4) { const e = rnd() * 4 | 0; if (e === 0) x = 20 + rnd() * 90; else if (e === 1) x = WW - 20 - rnd() * 90; else if (e === 2) y = 30 + rnd() * 80; else y = WH - 20 - rnd() * 80; }
      if (inOpen(x, y, -40) || !okSpot(x, y, 14, 24)) continue;
      const s = BSH[(rnd() * BSH.length) | 0], o = { k: 'bush', x, y, s, r: s.c.width * .3 };
      objs.push(o); addCol(o); perches.push({ x: x + (rnd() - .5) * 8, y, h: -s.top[1] / VZ, kind: 'bush', o }); k++;
    }
    const logs = [];
    for (let k = 0, tries = 0; k < 26 && tries < 3000; tries++) {
      const x = 80 + rnd() * (WW - 160), y = 100 + rnd() * (WH - 200), len = 70 + rnd() * 90;
      let bad = false; for (let t = -.5; t <= .5; t += .25) { const px = x + len * t; if (inOpen(px, y, 20) || !okSpot(px, y, 10, 30)) { bad = true; break; } }
      if (bad) continue;
      const s = logSpr(Math.floor(rnd() * 1e5), len), o = { k: 'log', x, y, s, r: 7 };
      objs.push(o); logs.push(o);
      for (let t = -.5; t <= .5; t += .1) addCol({ x: x + len * t, y: y - 2, r: 8, log: o });
      hides.push({ x: x + len * .25, y: y + 8, o }); perches.push({ x: x - len * .2, y, h: 18 / VZ, kind: 'log', o }); k++;
    }
    for (let k = 0, tries = 0; k < 60 && tries < 4000; tries++) {
      const x = 40 + rnd() * (WW - 80), y = 60 + rnd() * (WH - 90), sz = .8 + rnd() * 1.1; if (inOpen(x, y, -60) || !okSpot(x, y, 14 * sz, 24)) continue;
      const s = rockSpr(Math.floor(rnd() * 1e5), sz), o = { k: 'rock', x, y, s, r: 11 * sz }; objs.push(o); addCol(o); if (sz > 1.2) hides.push({ x, y: y + 6, o }); k++;
    }
    for (let k = 0, tries = 0; k < 22 && tries < 2000; tries++) {
      const x = 60 + rnd() * (WW - 120), y = 80 + rnd() * (WH - 140), sz = 1 + rnd() * .6; if (inOpen(x, y, 0) || !okSpot(x, y, 12 * sz, 26)) continue;
      const s = stumpSpr(Math.floor(rnd() * 1e5), sz), o = { k: 'stump', x, y, s, r: 9 * sz }; objs.push(o); addCol(o); hides.push({ x, y: y + 6, o }); perches.push({ x, y, h: 12 * sz / VZ, kind: 'stump', o }); k++;
    }
    const FS = []; for (let k = 0; k < 9; k++) FS.push(fernSet(300 + k * 17, 1.3 + (k % 3) * .3));
    for (let c = 0; c < 240; c++) {
      const cx = 40 + rnd() * (WW - 80), cy = 60 + rnd() * (WH - 90); if (inOpen(cx, cy, 30)) continue;
      const n = 4 + (rnd() * 11 | 0);
      for (let k = 0; k < n; k++) {
        const x = cx + (rnd() - .5) * 130, y = cy + (rnd() - .5) * 80;
        if (trailD(x, y) < 18 || stream.dist(x, y) < streamW(x, y) + 6 || inOpen(x, y, 10)) continue;
        if (near(x, y, 80, o => !o.log && Math.hypot(o.x - x, o.y - y) < o.r + 4)) continue;
        ferns.push({ k: 'fern', x, y, fr: FS[(rnd() * FS.length) | 0], bend: 0, bv: 0, ph: rnd() * 6.28 });
      }
    }
    const tufts = [], TS = [tuftSet(71, 0), tuftSet(72, 0), tuftSet(73, 1), tuftSet(74, 1), tuftSet(75, 1)];
    for (let k = 0; k < 900; k++) {
      let x, y, grassy; const m = rnd();
      if (m < .45) { const e = LAY.clearing, a = rnd() * 6.283, rr = Math.sqrt(rnd()) * 1.1; x = e.x + Math.cos(a) * e.rx * rr; y = e.y + Math.sin(a) * e.ry * rr; grassy = 1; }
      else if (m < .55) { const e = LAY.glade, a = rnd() * 6.283, rr = Math.sqrt(rnd()) * 1.1; x = e.x + Math.cos(a) * e.rx * rr; y = e.y + Math.sin(a) * e.ry * rr; grassy = 1; }
      else if (m < .8) { const p = stream.p[(rnd() * stream.p.length) | 0], s = rnd() < .5 ? -1 : 1; x = p[0] + (rnd() - .5) * 30; y = p[1] + s * (streamW(p[0], p[1]) + 8 + rnd() * 14); grassy = 0; }
      else { const p = trail.p[(rnd() * trail.p.length) | 0], s = rnd() < .5 ? -1 : 1; x = p[0] + s * (18 + rnd() * 8); y = p[1] + (rnd() - .5) * 20; grassy = 0; }
      if (stream.dist(x, y) < streamW(x, y) + 4 || onBridge(x, y) || trailD(x, y) < 15) continue;
      tufts.push({ k: 'tuft', x, y, fr: TS[grassy ? 2 + ((rnd() * 3) | 0) : (rnd() * 2) | 0], ph: rnd() * 6.28 });
    }
    const mush = [], MS = [0, 1, 2, 3, 4, 5].map(i => mushSpr(i * 31 + 4));
    for (let k = 0; k < 90; k++) { const t = trees[(rnd() * trees.length) | 0], a = rnd() * 6.28; const x = t.x + Math.cos(a) * (t.w * .7 + 6 + rnd() * 20), y = t.y + Math.sin(a) * (t.w * .3 + 4 + rnd() * 10) + 3; if (trailD(x, y) < 16 || stream.dist(x, y) < streamW(x, y) + 4) continue; mush.push({ k: 'mush', x, y, s: MS[(rnd() * MS.length) | 0] }); }
    for (const t of trees) for (const sn of t.snags) perches.push({ x: t.x + sn.side * (t.w / 2 + sn.len - 2), y: t.y, h: sn.h + sn.len * .4 / VZ, kind: 'snag', tree: t });
    W.objs = objs; W.ferns = ferns; W.tufts = tufts; W.mush = mush; W.logs = logs; W.perches = perches; W.hides = hides;

    /* 그리기용 공간 격자 */
    const DG = new Map(), DGS = 256;
    const addD = o => { const k = Math.floor(o.x / DGS) + Math.floor(o.y / DGS) * 1000; let l = DG.get(k); if (!l) DG.set(k, l = []); l.push(o); };
    for (const o of objs) addD(o); for (const o of ferns) addD(o); for (const o of tufts) addD(o); for (const o of mush) addD(o);
    W.inView = (x0, y0, x1, y1, out) => { for (let gy = Math.floor(y0 / DGS); gy <= Math.floor(y1 / DGS); gy++) for (let gx = Math.floor(x0 / DGS); gx <= Math.floor(x1 / DGS); gx++) { const l = DG.get(gx + gy * 1000); if (l) for (const o of l) if (o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1) out.push(o); } return out; };
    const TG = new Map(); for (const t of trees) { const k = Math.floor(t.x / DGS) + Math.floor(t.y / DGS) * 1000; let l = TG.get(k); if (!l) TG.set(k, l = []); l.push(t); }
    W.treesIn = (x0, y0, x1, y1, out) => { for (let gy = Math.floor(y0 / DGS); gy <= Math.floor(y1 / DGS); gy++) for (let gx = Math.floor(x0 / DGS); gx <= Math.floor(x1 / DGS); gx++) { const l = TG.get(gx + gy * 1000); if (l) for (const t of l) if (t.x > x0 && t.x < x1 && t.y > y0 && t.y < y1) out.push(t); } return out; };

    /* 막힘 */
    W.water = (x, y) => !onBridge(x, y) && stream.dist(x, y) < streamW(x, y) - 3;
    W.blocked = (x, y, r) => { if (x < 26 || y < 40 || x > WW - 26 || y > WH - 24) return true; if (W.water(x, y)) return true; return near(x, y, r + 50, o => Math.hypot(o.x - x, o.y - y) < o.r + r); };
    W.nearestTree = (x, y, maxD) => { let best = null, bd = maxD; for (const t of trees) { const d = Math.hypot(t.x - x, t.y - y); if (d < bd && t.sp !== 'birch') { bd = d; best = t; } } return best; };
    W.terrAt = (x, y) => { if (onBridge(x, y)) return 'bridge'; if (stream.dist(x, y) < streamW(x, y)) return 'water'; if (trailD(x, y) < 15) return 'trail'; if (inOpen(x, y)) return 'grass'; return 'litter'; };

    /* ---------- 빛 지도 ---------- */
    const LG = 16, LW = Math.ceil(WW / LG), LH = Math.ceil(WH / LG), open = new Float32Array(LW * LH);
    for (let j = 0; j < LH; j++) for (let i = 0; i < LW; i++) {
      const x = i * LG + 8, y = j * LG + 8;
      let o = .1 + .14 * fb(x * .006, y * .006, 2);
      o = Math.max(o, 1.05 - ss(.55, 1.6, ellIn(LAY.clearing, x, y)) * .9, .9 - ss(.5, 1.7, ellIn(LAY.glade, x, y)) * .78);
      o += .22 * ss(110, 20, stream.dist(x, y)) + .06 * ss(40, 10, trailD(x, y)) + (fb(x * .01 + 40, y * .01, 2) > .68 ? .16 : 0);
      open[j * LW + i] = clamp(o, 0, 1);
    }
    W.openAt = (x, y) => { const fx = x / LG - .5, fy = y / LG - .5, i = clamp(Math.floor(fx), 0, LW - 2), j = clamp(Math.floor(fy), 0, LH - 2), u = clamp(fx - i, 0, 1), v = clamp(fy - j, 0, 1); return lerp(lerp(open[j * LW + i], open[j * LW + i + 1], u), lerp(open[(j + 1) * LW + i], open[(j + 1) * LW + i + 1], u), v); };
    // 평평한 세 단계 그늘 지도 (8px 칸, 경계는 바둑판 점묘)
    const SG = 4, SW = Math.ceil(WW / SG), SH = Math.ceil(WH / SG), [sc, sgc] = makeCanvas(SW, SH), simg = sgc.createImageData(SW, SH), sd = new Uint32Array(simg.data.buffer);
    const LV = [U('#727e7c'), U('#aab2a4'), U('#fff4dc')];
    for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) { const v = W.openAt(i * SG + 2, j * SG + 2) * 2.4 + (vn(i * .22 + 11, j * .22) - .5) * .5; sd[j * SW + i] = LV[v < 1 ? 0 : v < 1.8 ? 1 : 2]; }
    sgc.putImageData(simg, 0, 0); W.shadeC = sc; W.SG = SG;
    // 햇빛 조각 (나뭇잎 틈), 동서로 길쭉한 타원
    const flecks = [];
    for (let k = 0; k < 1700; k++) {
      const x = rnd() * WW, y = rnd() * WH, o = W.openAt(x, y);
      if (o > .85 || rnd() > .2 + o * .9) continue;
      const big = rnd() < .08 + o * .25, r = big ? 14 + rnd() * 20 : 4 + rnd() * 8, sub = [];
      for (let q = 0, n = 1 + (rnd() * 2.6 | 0); q < n; q++) { const a = rnd() * 6.28; sub.push([Math.cos(a) * r * (.7 + rnd() * .5), Math.sin(a) * r * .45, r * (.35 + rnd() * .3)]); }
      flecks.push({ x, y, r, sub, ph: rnd() * 6.28, sp: .4 + rnd() * .9 });
    }
    const FG2 = new Map(); for (const f of flecks) { const k = Math.floor(f.x / 256) + Math.floor(f.y / 256) * 1000; let l = FG2.get(k); if (!l) FG2.set(k, l = []); l.push(f); }
    W.flecksIn = (x0, y0, x1, y1, out) => { for (let gy = Math.floor(y0 / 256); gy <= Math.floor(y1 / 256); gy++) for (let gx = Math.floor(x0 / 256); gx <= Math.floor(x1 / 256); gx++) { const l = FG2.get(gx + gy * 1000); if (l) for (const f of l) if (f.x > x0 && f.x < x1 && f.y > y0 && f.y < y1) out.push(f); } return out; };
    W.beams = flecks.filter(f => f.r > 26 && rnd() < .22).map(f => ({ x: f.x, y: f.y, w: f.r * 2, ph: rnd() * 6.28 }));
    W.beams.push({ x: LAY.glade.x, y: LAY.glade.y, w: 110, ph: 0 }, { x: LAY.clearing.x - 200, y: LAY.clearing.y + 120, w: 150, ph: 2 }, { x: LAY.clearing.x + 120, y: LAY.clearing.y + 80, w: 120, ph: 4 });
    W.lightAt = (x, y, t) => {
      let l = W.openAt(x, y); const arr = []; W.flecksIn(x - 40, y - 40, x + 40, y + 40, arr);
      for (const f of arr) { const r = f.r * (.85 + .15 * Math.sin(t * f.sp + f.ph)), dx = (x - f.x) / (r * 1.6), dy = (y - f.y) / r; if (dx * dx + dy * dy < 1) l = Math.max(l, .95); }
      return clamp(l, 0, 1);
    };

    /* ---------- 땅 조각 ---------- */
    const chunks = new Map(), pines = trees.filter(t => t.sp === 'pine');
    W.chunk = (cx, cy) => { const k = cx + cy * 100; let c = chunks.get(k); if (!c) { c = genChunk(cx, cy); chunks.set(k, c); } c.used = performance.now(); return c; };
    W.hasChunk = (cx, cy) => chunks.has(cx + cy * 100);
    W.trimChunks = max => { if (chunks.size <= max) return; const arr = [...chunks.entries()].sort((a, b) => a[1].used - b[1].used); for (let i = 0; i < arr.length - max; i++) chunks.delete(arr[i][0]); };
    function genChunk(cx, cy) {
      const X0 = cx * CHK, Y0 = cy * CHK, N = CHK, d = new Uint32Array(N * N), L = COL;
      const G = 4, GN = N / G + 2, fT = new Float32Array(GN * GN), fS = new Float32Array(GN * GN), fW = new Float32Array(GN * GN), fP = new Float32Array(GN * GN), fO = new Float32Array(GN * GN);
      const pn = pines.filter(t => t.x > X0 - 200 && t.x < X0 + N + 200 && t.y > Y0 - 200 && t.y < Y0 + N + 200);
      for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
        const x = X0 + (i - 1) * G, y = Y0 + (j - 1) * G, k = j * GN + i;
        fT[k] = trailD(x, y); fS[k] = stream.dist(x, y); fW[k] = streamW(x, y);
        let p = 0; for (const t of pn) { const dd = Math.hypot(t.x - x, (t.y - y) * 1.3); if (dd < 170) p += (1 - dd / 170) * 1.3; } fP[k] = p;
        fO[k] = Math.min(ellIn(LAY.clearing, x, y), ellIn(LAY.glade, x, y));
      }
      const samp = (f, px, py) => { const fx = px / G + 1, fy = py / G + 1, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, a = f[j * GN + i], b = f[j * GN + i + 1], c = f[(j + 1) * GN + i], e = f[(j + 1) * GN + i + 1]; return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v; };
      for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
        const x = X0 + px, y = Y0 + py, i = py * N + px, g = hh(x, y);
        const dT = samp(fT, px, py), dS = samp(fS, px, py), sw = samp(fW, px, py), pin = samp(fP, px, py), eo = samp(fO, px, py);
        // 평평한 구역: 낙엽 바탕 · 밝은 낙엽 얼룩 · 짙은 부엽토 · 이끼 · 솔잎 · 풀밭
        const n1 = fb(x * .006, y * .006, 2), n2 = vn(x * .022, y * .022), n3 = vn(x * .05 + 7, y * .05), edge = (g - .5) * .03;
        let c = L.lit[0];
        if (n2 > .64 + edge) c = L.lit[1]; else if (n2 < .3 + edge) c = L.humus;
        const moss = n1 + .2 * ss(110, 30, dS) + (Math.hypot(x - LAY.hollow.x, y - LAY.hollow.y) < 180 ? .24 : 0);
        if (moss > .66 + edge) c = n3 > .55 ? L.moss[1] : L.moss[0];
        if (pin > .45 + edge * 4) c = n3 > .5 ? L.need[1] : L.need[0];
        if (eo < 1.08 + edge * 3) c = n3 > .62 ? L.grass[1] : n3 < .32 ? L.grass[2] : L.grass[0];
        // 오솔길: 밝은 흙, 가장자리에 짙은 선
        const tw = 13 + 4 * vn(x * .02, y * .02);
        if (dT < tw + 1.4) c = dT > tw - .2 ? L.trailE : (n3 > .66 ? L.trail[1] : n3 < .3 ? L.trail[2] : L.trail[0]);
        // 개울
        if (dS < sw + 9) {
          if (dS < sw - 5) c = dS < sw * .5 ? L.water[0] : L.water[1];
          else if (dS < sw - 1.6) c = L.water[2];
          else if (dS < sw) c = L.foam;
          else if (dS < sw + 5) c = L.sand[g > .5 ? 0 : 1];
          else c = L.mud;
        }
        d[i] = c;
      }
      // 낙엽 · 풀싹 · 잔가지 · 꽃 (24칸마다 정해진 무작위)
      const cell = 24;
      for (let gy = Math.floor((Y0 - 8) / cell); gy <= Math.floor((Y0 + N + 8) / cell); gy++) for (let gx = Math.floor((X0 - 8) / cell); gx <= Math.floor((X0 + N + 8) / cell); gx++) {
        const r = RNG(gx * 7919 + gy * 104729 + 13), n = 2 + (r() * 5 | 0);
        for (let k = 0; k < n; k++) {
          const x = gx * cell + r() * cell, y = gy * cell + r() * cell, px = Math.floor(x - X0), py = Math.floor(y - Y0), kind = r(), col = L.acc[(r() * L.acc.length) | 0];
          if (trailD(x, y) < 12 || stream.dist(x, y) < streamW(x, y) + 6) continue;
          if (Math.min(ellIn(LAY.clearing, x, y), ellIn(LAY.glade, x, y)) < 1) {
            if (kind < .3) { const fc = L.flower[(r() * 4) | 0]; for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, -1], [0, 1]]) { const X = px + a, Y = py + b; if (X >= 0 && Y >= 0 && X < N && Y < N) d[Y * N + X] = a || b ? fc : U('#e8b030'); } }
            else for (let s = 0; s < 3; s++) { const X = px + (s - 1), Y = py - s % 2; if (X >= 0 && Y >= 0 && X < N && Y < N) d[Y * N + X] = L.blade; }
            continue;
          }
          if (kind < .7) {
            const sh = r() < .5 ? [[0, 0], [1, 0], [2, 0], [1, -1]] : r() < .5 ? [[0, 0], [0, 1], [1, 1], [1, 2]] : [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1]];
            for (let s = 0; s < sh.length; s++) { const X = px + sh[s][0], Y = py + sh[s][1]; if (X >= 0 && Y >= 0 && X < N && Y < N) d[Y * N + X] = s === sh.length - 1 ? shadeU(col, .72) : col; }
          } else if (kind < .9) {
            const h2 = 2 + (r() * 3 | 0);
            for (let s = 0; s < h2; s++) { const Y = py - s; if (px >= 1 && Y >= 0 && px < N - 1 && Y < N) { d[Y * N + px] = L.sprout[s > 1 ? 1 : 0]; if (s === h2 - 1) { d[Y * N + px - 1] = L.sprout[1]; d[Y * N + px + 1] = L.sprout[1]; } } }
          } else {
            const len = 5 + r() * 10, a = r() * Math.PI;
            for (let s = 0; s < len; s++) { const X = Math.round(px + Math.cos(a) * s), Y = Math.round(py + Math.sin(a) * s * .7); if (X >= 0 && Y >= 0 && X < N && Y < N) d[Y * N + X] = L.twig; }
          }
        }
      }
      // 개울 물결 · 자갈
      for (let k = 0; k < 160; k++) {
        const r = RNG(cx * 911 + cy * 37 + k), x = X0 + r() * N, y = Y0 + r() * N, sd2 = stream.dist(x, y), sw2 = streamW(x, y), px = x - X0 | 0, py = y - Y0 | 0;
        if (sd2 < sw2 - 6) { for (let s = 0; s < 4; s++) { const X = px + s; if (X < N) d[py * N + X] = s === 0 || s === 3 ? L.water[2] : L.foam; } }
        else if (sd2 > sw2 && sd2 < sw2 + 6 && px > 0 && py > 0 && px < N - 2 && py < N - 2) { d[py * N + px] = L.peb[1]; d[py * N + px + 1] = L.peb[0]; d[(py + 1) * N + px] = INKU; d[(py + 1) * N + px + 1] = INKU; }
      }
      // 나무 밑동: 평평한 그림자 타원 + 뿌리 (잉크 테두리)
      const near2 = trees.filter(t => t.x > X0 - t.w * 3 && t.x < X0 + N + t.w * 3 && t.y > Y0 - t.w * 2 && t.y < Y0 + N + t.w * 2);
      for (const t of near2) {
        const rx = t.w * 1.15, ry = t.w * .5, shc = U('#3e3428');
        for (let y = Math.floor(t.y - ry); y <= t.y + ry; y++) for (let x = Math.floor(t.x - rx); x <= t.x + rx; x++) {
          const px = x - X0, py = y - Y0; if (px < 0 || py < 0 || px >= N || py >= N) continue;
          if (((x - t.x) / rx) ** 2 + ((y - t.y) / ry) ** 2 < 1) d[py * N + px] = mixU(d[py * N + px], shc, .45);
        }
        const r = RNG(t.seed + 77), nr = t.sp === 'birch' ? 2 : 4 + (r() * 3 | 0), pts = [];
        for (let k = 0; k < nr; k++) {
          const a = (k / nr) * Math.PI * 2 + r() * .6, len = t.w * (.6 + r() * 1.1), w0 = t.w * (.13 + r() * .05);
          let x = t.x + Math.cos(a) * t.w * .36, y = t.y + Math.sin(a) * t.w * .16, dir = a;
          for (let s = 0; s < len; s++) {
            dir += (r() - .5) * .16; x += Math.cos(dir); y += Math.sin(dir) * .55;
            const rad = w0 * (1 - s / len) + .7;
            for (let j = -Math.ceil(rad); j <= Math.ceil(rad); j++) for (let i2 = -Math.ceil(rad); i2 <= Math.ceil(rad); i2++) if (i2 * i2 + j * j <= rad * rad) pts.push([Math.round(x + i2), Math.round(y + j * .8), j < -rad * .35 ? 2 : j > rad * .35 ? 0 : 1]);
          }
        }
        const occ = new Set(pts.map(p => p[0] * 9973 + p[1]));
        for (const [x, y] of pts) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + a, Y = y + b; if (occ.has(X * 9973 + Y)) continue; const px = X - X0, py = Y - Y0; if (px >= 0 && py >= 0 && px < N && py < N) d[py * N + px] = INKU; }
        for (const [x, y, k] of pts) { const px = x - X0, py = y - Y0; if (px >= 0 && py >= 0 && px < N && py < N) d[py * N + px] = L.root[k]; }
      }
      // 다리
      const b = LAY.bridge;
      if (b.x + b.hw + 4 > X0 && b.x - b.hw - 4 < X0 + N && b.y + b.hl > Y0 && b.y - b.hl < Y0 + N) {
        for (let y = Math.floor(b.y - b.hl); y < b.y + b.hl; y++) for (let x = Math.floor(b.x - b.hw - 3); x <= b.x + b.hw + 3; x++) {
          const px = x - X0, py = y - Y0; if (px < 0 || py < 0 || px >= N || py >= N) continue;
          const ax = Math.abs(x - b.x), row = Math.floor((y - b.y + b.hl) / 6), gap = (y - b.y + b.hl) % 6 === 0;
          d[py * N + px] = ax > b.hw + 1.5 ? INKU : ax > b.hw - 1 ? L.plank[1] : gap ? INKU : L.plank[hh(row, 3) > .66 ? 2 : hh(row, 3) < .25 ? 1 : 0];
        }
      }
      grainBuf(d, N, N, X0, Y0, .03);
      return { c: toCanvas(d, N, N), used: 0 };
    }

    /* ---------- 그림 묶음 ---------- */
    W.base = t => t.base || (t.base = trunkBase(t));
    W.shaft = t => shaft(t.sp, t.w, t.vari);
    W.branches = [0, 1, 2, 3, 4, 5].map(k => { const c = highBranch(900 + k * 37); return [c, { c: mirrorCanvas(c.c), ox: c.c.width - c.ox, oy: c.oy }]; });
    W.fgFerns = [0, 1, 2, 3].map(k => fgFern(500 + k * 23, 2.6 + k * .6));
    W.mists = []; for (let k = 0; k < 70; k++) { const p = rnd() < .55 ? stream.p[(rnd() * stream.p.length) | 0] : [rnd() * WW, rnd() * WH]; W.mists.push({ x: p[0] + (rnd() - .5) * 140, y: p[1] + (rnd() - .5) * 80, w: 220 + rnd() * 260, h: 80 + rnd() * 70, a: .05 + rnd() * .06, sp: 2 + rnd() * 4 }); }
    W.fgs = []; for (let k = 0; k < 110; k++) W.fgs.push({ x: rnd() * WW * 1.3, y: rnd() * WH * 1.3, i: (rnd() * 4) | 0, f: rnd() < .5 ? -1 : 1 });
    const [mc, mg] = makeCanvas(256, 256), gr = mg.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(236,242,232,.9)'); gr.addColorStop(.6, 'rgba(236,242,232,.35)'); gr.addColorStop(1, 'rgba(236,242,232,0)'); mg.fillStyle = gr; mg.fillRect(0, 0, 256, 256);
    W.mistTex = mc;
    return W;
  }
  return { gen, WW, WH, CHK, BASE, VZ, vn, hh };
})();
