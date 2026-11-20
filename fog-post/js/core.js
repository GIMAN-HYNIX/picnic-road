'use strict';
/* =========================================================
   안개 우체국 · 공통 도구
   색, 픽셀 버퍼, 픽셀 글자, 캐릭터 래스터라이저
   ========================================================= */
const VW = 480, VH = 270;               // 내부 해상도 (16:9)
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const smooth = t => t * t * (3 - 2 * t);
function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7 + 17.3) * 43758.5453; return s - Math.floor(s); }
function RNG(seed) {
  let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
  return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

function vnoise(x, y, seed, px, py) {
  const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi);
  const w = (a, p) => p ? ((a % p) + p) % p : a;
  const h = (i, j) => hash2(w(i, px) + seed * 13.1, w(j, py) - seed * 7.7);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
function fbm(x, y, seed, oct = 4, px, py) {
  let s = 0, a = .5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, seed + i * 31, px ? px * f : 0, py ? py * f : 0); n += a; f *= 2; a *= .5; }
  return s / n;
}

/* ---------- 색 ---------- */
const SHADOW = '#2a2440', HILITE = '#fff2d6';
const _cc = new Map();
function C(h) {
  let v = _cc.get(h); if (v !== undefined) return v;
  const n = parseInt(h.slice(1, 7), 16), a = h.length > 7 ? parseInt(h.slice(7, 9), 16) : 255;
  v = ((a << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0;
  _cc.set(h, v); return v;
}
function rgbOf(h) { const n = parseInt(h.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function hexOf(r, g, b) { return '#' + ((1 << 24) | (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)).toString(16).slice(1); }
function mix(a, b, t) { const x = rgbOf(a), y = rgbOf(b); return hexOf(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); }
const dk = (a, t = .25) => mix(a, SHADOW, t);
const lt = (a, t = .25) => mix(a, HILITE, t);
const ramp4 = b => [dk(b, .5), dk(b, .24), b, lt(b, .32)];
function u2rgb(u) { return [u & 255, (u >>> 8) & 255, (u >>> 16) & 255]; }
function rgb2u(r, g, b, a = 255) { return ((a << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0; }

/* ---------- 픽셀 버퍼 ---------- */
class PB {
  constructor(w, h) { this.w = w; this.h = h; this.ox = 0; this.oy = 0; this.img = new ImageData(w, h); this.d = new Uint32Array(this.img.data.buffer); }
  clear() { this.d.fill(0); }
  _c(c) { return typeof c === 'string' ? C(c) : c; }
  px(x, y, c) { x = Math.floor(x + this.ox); y = Math.floor(y + this.oy); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[y * this.w + x] = this._c(c); }
  get(x, y) { x = Math.floor(x + this.ox); y = Math.floor(y + this.oy); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[y * this.w + x]; }
  has(x, y) { return (this.get(x, y) >>> 24) > 0; }
  rect(x, y, w, h, c) {
    c = this._c(c); x = Math.round(x + this.ox); y = Math.round(y + this.oy); w = Math.round(w); h = Math.round(h);
    const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(this.w, x + w), y1 = Math.min(this.h, y + h);
    for (let j = y0; j < y1; j++) { const o = j * this.w; for (let i = x0; i < x1; i++) this.d[o + i] = c; }
  }
  hl(x0, x1, y, c) { if (x1 < x0) [x0, x1] = [x1, x0]; this.rect(x0, y, x1 - x0 + 1, 1, c); }
  vl(x, y0, y1, c) { if (y1 < y0) [y0, y1] = [y1, y0]; this.rect(x, y0, 1, y1 - y0 + 1, c); }
  frame(x, y, w, h, c) { this.hl(x, x + w - 1, y, c); this.hl(x, x + w - 1, y + h - 1, c); this.vl(x, y, y + h - 1, c); this.vl(x + w - 1, y, y + h - 1, c); }
  // 디더: 패턴 밀도 lv(0~1)만큼 c를 찍음
  dith(x, y, w, h, c, lv) {
    c = this._c(c); x = Math.round(x + this.ox); y = Math.round(y + this.oy);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue; if (bay(X, Y) < lv) this.d[Y * this.w + X] = c; }
  }
  // 기존 픽셀을 목표색 쪽으로 섞기 (그림자, 때)
  tint(x, y, t, to = SHADOW) {
    x = Math.floor(x + this.ox); y = Math.floor(y + this.oy); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x, u = this.d[i]; if (!(u >>> 24)) return;
    const a = u2rgb(u), b = rgbOf(to);
    this.d[i] = rgb2u(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, u >>> 24);
  }
  tintRect(x, y, w, h, t, to = SHADOW) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.tint(x + i, y + j, t, to); }
  tintDith(x, y, w, h, t, lv, to = SHADOW) { x = Math.round(x); y = Math.round(y); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (bay(x + i + this.ox, y + j + this.oy) < lv) this.tint(x + i, y + j, t, to); }
  line(x0, y0, x1, y1, c) {
    c = this._c(c); x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (; ;) { this.px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  ellipse(cx, cy, rx, ry, c) {
    c = this._c(c);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const dy = (y + .5 - cy) / ry; if (Math.abs(dy) > 1) continue;
      const hw = rx * Math.sqrt(1 - dy * dy);
      for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) this.px(x, y, c);
    }
  }
  circle(cx, cy, r, c) { this.ellipse(cx, cy, r, r, c); }
  ring(cx, cy, r, c) { for (let a = 0; a < TAU; a += .5 / Math.max(1, r)) this.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c); }
  poly(pts, c) {
    c = this._c(c);
    let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + .5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c);
    }
  }
  // 다른 버퍼를 겹쳐 찍기 (투명은 건너뜀)
  blit(src, dx, dy, flip = false) {
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      const u = src.d[j * src.w + (flip ? src.w - 1 - i : i)]; if (!(u >>> 24)) continue;
      const X = dx + i + this.ox, Y = dy + j + this.oy; if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue; this.d[Y * this.w + X] = u;
    }
  }
  // 텍스트 (픽셀 폰트를 임계값으로 잘라 또렷하게)
  text(str, x, y, font, col, align = 'left', sh) {
    const m = textMask(str, font); let X = Math.round(x);
    if (align === 'center') X = Math.round(x - m.w / 2); else if (align === 'right') X = Math.round(x - m.w);
    const c = this._c(col), s = sh ? this._c(sh) : 0;
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.mask[j * m.w + i]) {
      if (s) { if (!m.mask[(j + 1) * m.w + i] || j + 1 >= m.h) this.px(X + i, y + j + 1, s); }
      this.px(X + i, y + j, c);
    }
    return m.w;
  }
  canvas() { const [c, g] = makeCanvas(this.w, this.h); g.putImageData(this.img, 0, 0); return c; }
}
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }

const _tc = document.createElement('canvas'), _tg = _tc.getContext('2d', { willReadFrequently: true });
const _tm = new Map();
function textMask(str, font) {
  const key = font + '|' + str; let m = _tm.get(key); if (m) return m;
  const size = parseInt(font.match(/(\d+)px/)[1], 10);
  _tg.font = font; const w = Math.ceil(_tg.measureText(str).width) + 4, h = Math.ceil(size * 1.6) + 4;
  _tc.width = w; _tc.height = h; _tg.font = font; _tg.textBaseline = 'alphabetic'; _tg.fillStyle = '#fff'; _tg.clearRect(0, 0, w, h);
  _tg.fillText(str, 2, size + 1);
  const d = _tg.getImageData(0, 0, w, h).data;
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  const raw = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] > 72) { raw[j * w + i] = 1; x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); }
  if (x1 < 0) { m = { w: 0, h: 0, mask: new Uint8Array(0) }; _tm.set(key, m); return m; }
  // 세로 기준선을 맞추려고 위쪽 여백은 폰트 기준으로 유지
  const top = Math.min(1, y0), mw = x1 - x0 + 1, mh = y1 - top + 1, mask = new Uint8Array(mw * mh);
  for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) mask[j * mw + i] = raw[(j + top) * w + i + x0];
  m = { w: mw, h: mh, mask }; _tm.set(key, m); return m;
}
const F9 = '10px Galmuri9', F7 = '8px Galmuri7', F11 = '12px Galmuri11', F11B = '12px Galmuri11B';

/* ---------- 캐릭터 래스터라이저 ----------
   타원, 캡슐, 사각형, 다각형을 관절 좌표로 받아
   빛 방향에 따라 단계 명암 + 디더 → 가장자리 빛 → 외곽선 */
const LIGHT = (() => { const v = [-.48, -.74, .47], l = Math.hypot(...v); return v.map(a => a / l); })();
const _rampCache = new Map();
function R_(arr) { const k = arr.join(); let r = _rampCache.get(k); if (!r) { r = arr.map(C); _rampCache.set(k, r); } return r; }

class Rig {
  constructor() { this.p = []; this.d = []; this.post = []; this.st = []; this.m = [1, 0, 0, 1, 0, 0]; }
  reset(face, ox, oy) { this.p.length = 0; this.d.length = 0; this.post.length = 0; this.st.length = 0; this.m = [face, 0, 0, 1, ox, oy]; return this; }
  push() { this.st.push(this.m.slice()); } pop() { this.m = this.st.pop(); }
  translate(x, y) { const m = this.m; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; }
  rotate(a) { const m = this.m, c = Math.cos(a), s = Math.sin(a); const [a0, b0, c0, d0] = m; m[0] = a0 * c + c0 * s; m[1] = b0 * c + d0 * s; m[2] = -a0 * s + c0 * c; m[3] = -b0 * s + d0 * c; }
  pt(x, y) { const m = this.m; return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  _lin(a, sx, sy) { const m = this.m, c = Math.cos(a), s = Math.sin(a); return [(m[0] * c + m[2] * s) * sx, (m[1] * c + m[3] * s) * sx, (-m[0] * s + m[2] * c) * sy, (-m[1] * s + m[3] * c) * sy]; }
  E(x, y, rx, ry, a, ramp, o) { const [X, Y] = this.pt(x, y); this.p.push(Object.assign({ t: 'e', x: X, y: Y, L: this._lin(a || 0, rx, ry), rz: (rx + ry) / 2, r: R_(ramp) }, o)); }
  K(x1, y1, x2, y2, r1, r2, ramp, o) { const [X1, Y1] = this.pt(x1, y1), [X2, Y2] = this.pt(x2, y2); this.p.push(Object.assign({ t: 'c', x1: X1, y1: Y1, x2: X2, y2: Y2, r1, r2, r: R_(ramp) }, o)); }
  B(x, y, w, h, a, ramp, o) { const [X, Y] = this.pt(x, y); this.p.push(Object.assign({ t: 'b', x: X, y: Y, L: this._lin(a || 0, w / 2, h / 2), r: R_(ramp) }, o)); }
  P(pts, ramp, o) { const q = pts.map(p => this.pt(p[0], p[1])); this.p.push(Object.assign({ t: 'p', pts: q, r: R_(ramp) }, o)); }
  D(x, y, col) { const [X, Y] = this.pt(x, y); this.d.push([X, Y, C(col)]); }
  DL(x0, y0, x1, y1, col) { const a = this.pt(x0, y0), b = this.pt(x1, y1); this.d.push([a[0], a[1], C(col), b[0], b[1]]); }
  W(x0, y0, x1, y1, col) { const a = this.pt(x0, y0), b = this.pt(x1, y1); this.post.push([a[0], a[1], C(col), b[0], b[1]]); }
  WD(x, y, col) { const [X, Y] = this.pt(x, y); this.post.push([X, Y, C(col)]); }
}

function _inv2(L) { const det = L[0] * L[3] - L[1] * L[2] || 1e-6; return [L[3] / det, -L[1] / det, -L[2] / det, L[0] / det]; }
function rasterRig(pb, rig, opt = {}) {
  pb.clear();
  const W = pb.w, H = pb.h, d = pb.d;
  for (const p of rig.p) {
    let x0, y0, x1, y1, inv;
    if (p.t === 'e' || p.t === 'b') {
      const ext = Math.abs(p.L[0]) + Math.abs(p.L[2]) + 1, eyt = Math.abs(p.L[1]) + Math.abs(p.L[3]) + 1;
      x0 = p.x - ext; x1 = p.x + ext; y0 = p.y - eyt; y1 = p.y + eyt; inv = _inv2(p.L);
    } else if (p.t === 'c') {
      const r = Math.max(p.r1, p.r2) + 1; x0 = Math.min(p.x1, p.x2) - r; x1 = Math.max(p.x1, p.x2) + r; y0 = Math.min(p.y1, p.y2) - r; y1 = Math.max(p.y1, p.y2) + r;
    } else {
      x0 = Infinity; x1 = -Infinity; y0 = Infinity; y1 = -Infinity;
      for (const q of p.pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
      p.cy = (y0 + y1) / 2; p.hh = Math.max(1, (y1 - y0) / 2);
    }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W - 1, Math.ceil(x1)); y1 = Math.min(H - 1, Math.ceil(y1));
    const ramp = p.r, n = ramp.length, bias = p.b || 0, flat = p.flat;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const cx = x + .5, cy = y + .5; let nx = 0, ny = 0, nz = 1;
      if (p.t === 'e') {
        const dx = cx - p.x, dy = cy - p.y, u = inv[0] * dx + inv[2] * dy, v = inv[1] * dx + inv[3] * dy, q = u * u + v * v;
        if (q > 1) continue;
        nx = inv[0] * u + inv[1] * v; ny = inv[2] * u + inv[3] * v; nz = Math.sqrt(1 - q) / p.rz;
      } else if (p.t === 'b') {
        const dx = cx - p.x, dy = cy - p.y, u = inv[0] * dx + inv[2] * dy, v = inv[1] * dx + inv[3] * dy;
        if (Math.abs(u) > 1 || Math.abs(v) > 1) continue;
        const uu = u * u * u * .5, vv = v * v * v * .5; nx = inv[0] * uu + inv[1] * vv; ny = inv[2] * uu + inv[3] * vv; nz = .35;
      } else if (p.t === 'c') {
        const ax = p.x2 - p.x1, ay = p.y2 - p.y1, ll = ax * ax + ay * ay || 1e-6;
        let t = ((cx - p.x1) * ax + (cy - p.y1) * ay) / ll; t = clamp(t, 0, 1);
        const qx = p.x1 + ax * t, qy = p.y1 + ay * t, r = lerp(p.r1, p.r2, t), dx = cx - qx, dy = cy - qy, dd = dx * dx + dy * dy;
        if (dd > r * r) continue;
        nx = dx / r; ny = dy / r; nz = Math.sqrt(Math.max(0, 1 - dd / (r * r)));
      } else {
        let ins = false; const pts = p.pts;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if (((a[1] > cy) !== (b[1] > cy)) && (cx < (b[0] - a[0]) * (cy - a[1]) / (b[1] - a[1]) + a[0])) ins = !ins; }
        if (!ins) continue;
        nx = -.15; ny = (cy - p.cy) / p.hh * .7; nz = .8;
      }
      let k;
      if (flat) k = Math.min(n - 1, flat);
      else {
        const l = Math.hypot(nx, ny, nz) || 1;
        let v = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / l * .56 + .48 + bias + (bay(x, y) - .5) * .17;
        k = Math.floor(clamp(v, 0, .999) * n);
      }
      d[y * W + x] = ramp[k];
    }
  }
  for (const q of rig.d) { if (q.length > 3) pb.line(q[0], q[1], q[3], q[4], q[2]); else pb.px(q[0], q[1], q[2]); }
  // 가장자리 빛 (아침 해가 오른쪽 위에 있음)
  if (opt.rim) {
    const rimSet = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (!(d[i] >>> 24)) continue;
      if (!(d[i + 1] >>> 24) && (d[i - W] >>> 24 ? 1 : (d[i - W + 1] >>> 24 ? 1 : 1)) && y < opt.rim) rimSet.push(i);
      else if (!(d[i - W] >>> 24) && !(d[i - W + 1] >>> 24) && y < opt.rim) rimSet.push(i);
    }
    const rc = rgbOf(opt.rimCol || '#ffe0b0');
    for (const i of rimSet) { const a = u2rgb(d[i]); d[i] = rgb2u(lerp(a[0], rc[0], .38), lerp(a[1], rc[1], .38), lerp(a[2], rc[2], .38)); }
  }
  if (opt.outline) {
    const oc = C(opt.outline), out = new Uint32Array(d);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (d[i] >>> 24) continue;
      if ((x > 0 && d[i - 1] >>> 24) || (x < W - 1 && d[i + 1] >>> 24) || (y > 0 && d[i - W] >>> 24) || (y < H - 1 && d[i + W] >>> 24)) out[i] = oc;
    }
    d.set(out);
  }
  for (const q of rig.post) { if (q.length > 3) pb.line(q[0], q[1], q[3], q[4], q[2]); else pb.px(q[0], q[1], q[2]); }
}
// 버퍼 → 캔버스 (재사용)
function pbToCanvas(pb, cv) { if (!cv) { cv = makeCanvas(pb.w, pb.h)[0]; } cv.getContext('2d').putImageData(pb.img, 0, 0); return cv; }
