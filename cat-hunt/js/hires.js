'use strict';
/* =========================================================
   고해상도 픽셀 엔진 · 에디토리얼 캐리커처 스타일
   core.js의 Rig(관절 도형)를 그대로 쓰고 칠하는 방식만 바꿈
   1) 셀 명암: 면 색 + 그림자 한 톤(+빛 한 톤), 경계가 딱 떨어짐
   2) 드리운 그림자: 앞 부품이 뒤 부품에 (앞머리 → 이마, 모자챙 → 얼굴)
   3) 부품 경계선: 겹친 부품 사이에 선 (선화 느낌)
   4) 한 가지 색 외곽선 → 종이 질감(그레인)
   원점은 발 가운데, 위쪽이 -y
   ========================================================= */
const HR = new Rig();
if (!Rig.prototype.K2) Rig.prototype.K2 = function (x1, y1, x2, y2, r1, r2, ramp, o) { const s = Math.hypot(this.m[0], this.m[1]); this.K(x1, y1, x2, y2, r1 * s, r2 * s, ramp, o); };
if (!Rig.prototype.scl) Rig.prototype.scl = function (s) { const m = this.m; m[0] *= s; m[1] *= s; m[2] *= s; m[3] *= s; };
// 무늬용: 지금 좌표계의 역행렬을 옵션에 붙여 둠 → 래스터 단계에서 '부품 로컬 좌표'로 무늬를 계산
Rig.prototype.pat = function (o) { const m = this.m, det = m[0] * m[3] - m[1] * m[2] || 1e-6; o.im = [m[3] / det, -m[2] / det, -m[1] / det, m[0] / det, m[4], m[5]]; return o; };
// 도장: 로컬 점을 화면 픽셀로 반올림한 뒤 그 둘레에 '화면 픽셀 단위' 무늬를 찍음 (작게 그려도 눈이 안 뭉개짐)
Rig.prototype.stamp = function (x, y, rows, pal, ax = 0, ay = 0, post) {
  const [X, Y] = this.pt(x, y), bx = Math.round(X) - ax, by = Math.round(Y) - ay, L = post ? this.post : this.d;
  for (let j = 0; j < rows.length; j++) { const row = rows[j]; for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.' || ch === ' ') continue; L.push([bx + i, by + j, C(pal[ch])]); } }
};
// 사슬: 점들을 캡슐로 이어 그림 (팔다리 · 꼬리 · 땋은 머리)
Rig.prototype.chain = function (pts, rad, ramp, o) { for (let i = 0; i < pts.length - 1; i++) this.K2(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], rad[Math.min(i, rad.length - 1)], rad[Math.min(i + 1, rad.length - 1)], ramp, o); };

const INK = '#2a1714';
const ED = { cel: [.06, .9], cast: true, contour: true, olCol: INK, outline: INK, clean: true };
const _N4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
function _mixU(u, c, t) { const r = u & 255, g = (u >>> 8) & 255, b = (u >>> 16) & 255; return rgb2u(r + (c[0] - r) * t, g + (c[1] - g) * t, b + (c[2] - b) * t, u >>> 24); }
const _grp = p => p.g || p.r;
function lightDir(x, y, z) { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; }

/* 부품 옵션 (R.E/K/P/B의 마지막 인자)
   g: 무리 이름 (같은 무리끼리는 그림자 · 경계선 없음)   ol: 1 둘레 전체 경계선, 2 그늘진 쪽만
   cl: 아래로 드리우는 그림자 길이(기본 2)   cast:0 그림자 안 드리움   recv:0 그림자 안 받음   rs:0 옆 그림자는 안 받음
   flat: 명암 고정(0 그림자, 1 면, 2 빛)   side: 다각형을 세로로 나눠 오른쪽을 그림자로 (sideL은 왼쪽)
   lt: [그림자 문턱, 빛 문턱]   alt/alts: 로컬 좌표 → 다른 색 줄   tex: 로컬 좌표 → 명암 더하기 */
function rasterHi(pb, rig, o = ED) {
  pb.clear();
  const W = pb.w, H = pb.h, N = W * H, d = pb.d, P = rig.p, LT = o.light || LIGHT;
  const id = new Int16Array(N).fill(-1), tn = new Int8Array(N), ar = new Int8Array(N).fill(-1);
  const cel = o.cel, gb = o.bias || 0;
  for (let pi = 0; pi < P.length; pi++) {
    const p = P[pi];
    let x0, y0, x1, y1, inv;
    if (p.t === 'e' || p.t === 'b') {
      const ex = Math.abs(p.L[0]) + Math.abs(p.L[2]) + 1, ey = Math.abs(p.L[1]) + Math.abs(p.L[3]) + 1;
      x0 = p.x - ex; x1 = p.x + ex; y0 = p.y - ey; y1 = p.y + ey; inv = _inv2(p.L);
    } else if (p.t === 'c') {
      const r = Math.max(p.r1, p.r2) + 1; x0 = Math.min(p.x1, p.x2) - r; x1 = Math.max(p.x1, p.x2) + r; y0 = Math.min(p.y1, p.y2) - r; y1 = Math.max(p.y1, p.y2) + r;
    } else {
      x0 = Infinity; x1 = -Infinity; y0 = Infinity; y1 = -Infinity;
      for (const q of p.pts) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
      p.bx = x0; p.by = y0; p.bw = Math.max(1, x1 - x0); p.bh = Math.max(1, y1 - y0);
    }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W - 1, Math.ceil(x1)); y1 = Math.min(H - 1, Math.ceil(y1));
    const ramp = p.r, n = ramp.length, bias = (p.b || 0) + gb, im = p.im, lt = p.lt || cel;
    if (p.alts && !p._A) p._A = p.alts.map(R_);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const cx = x + .5, cy = y + .5; let nx = 0, ny = 0, nz = 1, tt = 0;
      if (p.t === 'e') {
        const dx = cx - p.x, dy = cy - p.y, u = inv[0] * dx + inv[2] * dy, v = inv[1] * dx + inv[3] * dy, q = u * u + v * v;
        if (q > 1) continue;
        nx = inv[0] * u + inv[1] * v; ny = inv[2] * u + inv[3] * v; nz = Math.sqrt(1 - q) / p.rz;
      } else if (p.t === 'b') {
        const dx = cx - p.x, dy = cy - p.y, u = inv[0] * dx + inv[2] * dy, v = inv[1] * dx + inv[3] * dy;
        if (u > 1 || u < -1 || v > 1 || v < -1) continue;
        const uu = u * u * u * .5, vv = v * v * v * .5; nx = inv[0] * uu + inv[1] * vv; ny = inv[2] * uu + inv[3] * vv; nz = .35;
      } else if (p.t === 'c') {
        const ax = p.x2 - p.x1, ay = p.y2 - p.y1, ll = ax * ax + ay * ay || 1e-6;
        let t = ((cx - p.x1) * ax + (cy - p.y1) * ay) / ll; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = p.x1 + ax * t, qy = p.y1 + ay * t, r = p.r1 + (p.r2 - p.r1) * t, dx = cx - qx, dy = cy - qy, dd = dx * dx + dy * dy;
        if (dd > r * r) continue;
        nx = dx / r; ny = dy / r; nz = Math.sqrt(Math.max(0, 1 - dd / (r * r))); tt = t;
      } else {
        let ins = false; const pts = p.pts;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if (((a[1] > cy) !== (b[1] > cy)) && (cx < (b[0] - a[0]) * (cy - a[1]) / (b[1] - a[1]) + a[0])) ins = !ins; }
        if (!ins) continue;
        const fx = (cx - p.bx) / p.bw, fy = (cy - p.by) / p.bh;
        if (p.side !== undefined) { const s = fx + (p.tilt || 0) * (fy - .5); nx = s > p.side ? .9 : -.4; ny = 0; nz = .5; }
        else if (p.sideL !== undefined) { const s = fx + (p.tilt || 0) * (fy - .5); nx = s < p.sideL ? -.9 : .4; ny = 0; nz = .5; }
        else { nx = (fx - .5) * 1.7 - .08; ny = (fy - .5) * 1.7; const q = nx * nx + ny * ny; nz = Math.sqrt(Math.max(.06, 1 - (q > 1 ? 1 : q))); }
      }
      let k;
      if (p.flat !== undefined) k = p.flat;
      else {
        const l = Math.hypot(nx, ny, nz) || 1, dot = (nx * LT[0] + ny * LT[1] + nz * LT[2]) / l + bias;
        if (lt) k = n < 2 ? 0 : dot < lt[0] ? 0 : (n > 2 && dot > lt[1]) ? n - 1 : 1;
        else { const v = dot * .56 + .48 + (bay(x, y) - .5) * (o.dither || 0); k = Math.floor((v < 0 ? 0 : v > .999 ? .999 : v) * n); }
      }
      let rr = ramp, ai = -1;
      if (im) {
        const dX = cx - im[4], dY = cy - im[5], lx = im[0] * dX + im[1] * dY, ly = im[2] * dX + im[3] * dY;
        if (p.alt) { const a = p.alt(lx, ly, tt); if (a >= 0) { ai = a; rr = p._A[a]; } }
        if (p.tex) k += p.tex(lx, ly, tt);
      }
      k = k < 0 ? 0 : k >= rr.length ? rr.length - 1 : k;
      const i = y * W + x; d[i] = rr[k]; id[i] = pi; tn[i] = k; ar[i] = ai;
    }
  }
  // 드리운 그림자: 바로 위(최대 cl칸) · 왼쪽 위 대각 · 왼쪽에 '앞 부품'이 있으면 그늘
  if (o.cast) {
    const sh = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, a = id[i]; if (a < 0) continue; const pa = P[a]; if (pa.recv === 0) continue; const ga = _grp(pa);
      let hit = false;
      for (let s = 1; s <= 6 && !hit; s++) { if (y - s < 0) break; const b = id[i - s * W]; if (b > a) { const q = P[b]; if (q.cast !== 0 && _grp(q) !== ga && s <= (q.cl || 2)) hit = true; } }
      const sx = o.castR ? 1 : -1;   // 빛이 오른쪽에서 오면 그림자도 반대로
      if (!hit && pa.rs !== 0 && x + sx >= 0 && x + sx < W) for (let s = 0; s <= 2 && !hit; s++) { if (y - s < 0) break; const b = id[i - s * W + sx]; if (b > a) { const q = P[b]; if (q.cast !== 0 && _grp(q) !== ga && s <= (q.cl || 2) && !q.noSide) hit = true; } }
      if (hit) sh[i] = 1;
    }
    for (let i = 0; i < N; i++) if (sh[i]) { const p = P[id[i]], rr = ar[i] >= 0 ? p._A[ar[i]] : p.r, k = o.castStep ? Math.max(0, tn[i] - 1) : 0; tn[i] = k; d[i] = rr[k]; }
  }
  // 부품 경계선: 경계선을 원하는 앞 부품(ol) 둘레의 뒤 픽셀을 선 색으로
  if (o.contour) {
    const oc = C(o.olCol || INK), mk = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, a = id[i]; if (a < 0) continue; const ga = _grp(P[a]);
      for (let q = 0; q < 4; q++) {
        const dx = _N4[q][0], dy = _N4[q][1], X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const b = id[Y * W + X]; if (b <= a) continue; const f = P[b]; if (!f.ol || _grp(f) === ga) continue;
        if (f.ol === 2 && dx !== -1 && dy !== -1) continue;
        mk[i] = 1; break;
      }
    }
    for (let i = 0; i < N; i++) if (mk[i]) d[i] = oc;
  }
  // 외톨이 픽셀 정리 (8방향 이웃 중 같은 색이 하나도 없는 점)
  if (o.clean) {
    const src = new Uint32Array(d);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, c = src[i]; if (!(c >>> 24)) continue;
      let alone = true;
      for (let j = -1; j <= 1 && alone; j++) for (let k = -1; k <= 1; k++) { if (!j && !k) continue; if (src[i + j * W + k] === c) { alone = false; break; } }
      if (!alone) continue;
      const nb = [src[i - 1], src[i + 1], src[i - W], src[i + W]].filter(u => u >>> 24); if (nb.length < 3) continue;
      let best = 0, bc = 0; for (const u of nb) { let cnt = 0; for (const v of nb) if (v === u) cnt++; if (cnt > bc) { bc = cnt; best = u; } }
      if (bc >= 2) d[i] = best;
    }
  }
  for (const q of rig.d) { if (q.length > 3) pb.line(q[0], q[1], q[3], q[4], q[2]); else pb.px(q[0], q[1], q[2]); }
  if (o.outline) {
    const src = new Uint32Array(d), oc = C(o.outline);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (src[i] >>> 24) continue;
      if ((x > 0 && src[i - 1] >>> 24) || (x < W - 1 && src[i + 1] >>> 24) || (y > 0 && src[i - W] >>> 24) || (y < H - 1 && src[i + W] >>> 24)) d[i] = oc;
    }
  }
  for (const q of rig.post) { if (q.length > 3) pb.line(q[0], q[1], q[3], q[4], q[2]); else pb.px(q[0], q[1], q[2]); }
}

/* ---------- 층 합성 ---------- */
function hiBake(W, H, ox, oy, fn, opt) { const pb = new PB(W, H), R = HR.reset(1, ox, oy); fn(R); rasterHi(pb, R, opt || ED); return pb; }
function pbOver(dst, src) { const a = dst.d, b = src.d; for (let i = 0; i < a.length; i++) if (b[i] >>> 24) a[i] = b[i]; }
// 앞 층(src)이 뒤 층(dst)에 드리우는 그림자: 오른쪽 아래로 2칸
function pbCast(dst, src, tint, t = .42, right) {
  const W = dst.w, H = dst.h, a = dst.d, b = src.d, sc = rgbOf(mix(tint, '#120a14', .35)), sx = right ? 1 : -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!(a[i] >>> 24) || (b[i] >>> 24)) continue;
    const okx = x + sx >= 0 && x + sx < W;
    if ((y > 0 && b[i - W] >>> 24) || (y > 1 && b[i - 2 * W] >>> 24) || (okx && y > 0 && b[i - W + sx] >>> 24) || (okx && b[i + sx] >>> 24)) a[i] = _mixU(a[i], sc, t);
  }
}
// 종이 질감: 픽셀마다 아주 살짝 밝기를 흔들고, 크게는 얼룩
function grain(pb, amt = .05, seed = 0) {
  const W = pb.w, H = pb.h, d = pb.d;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, u = d[i]; if (!(u >>> 24)) continue;
    const f = 1 + (hash2(x * 1.37 + seed, y * 1.91 - seed) - .5) * amt * 2 + (vnoise(x * .09, y * .09, seed) - .5) * amt * 1.4;
    d[i] = rgb2u((u & 255) * f, ((u >>> 8) & 255) * f, ((u >>> 16) & 255) * f, u >>> 24);
  }
}
