'use strict';
/* =========================================================
   컨셉아트북 그림 도구
   장면은 하늘 → 먼 층 → 중간 층 → 땅 → 인물 → 가까운 층 → 비 순서로 쌓는다.
   층마다 hires.js 의 Rig 로 칠하고(셀 명암 + 잉크 선), 멀수록 안개 색을 섞는다.
   좌표는 화면 픽셀, 아래쪽이 +y
   ========================================================= */
const AB = {};
const AB_FAR = { cel: [.06, .9], cast: false, contour: false, clean: true };                 // 먼 층: 선 없음
const abLine = col => ({ cel: [.06, .9], cast: true, contour: true, olCol: col, outline: col, clean: true });

function grad(stops, t) {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 0; i < stops.length - 1; i++) { const a = stops[i], b = stops[i + 1]; if (t <= b[0]) return mix(a[1], b[1], (t - a[0]) / Math.max(1e-6, b[0] - a[0])); }
  return stops[stops.length - 1][1];
}
// 하늘: 단계 띠 + 바이어 디더
AB.sky = function (pb, stops, y0 = 0, y1 = pb.h, n = 8) {
  const band = []; for (let i = 0; i < n; i++) band.push(C(grad(stops, i / (n - 1))));
  for (let y = Math.max(0, y0); y < Math.min(pb.h, y1); y++) {
    const v = (y - y0) / Math.max(1, y1 - y0 - 1) * (n - 1), i = Math.min(n - 2, Math.floor(v)), f = v - i, o = y * pb.w;
    for (let x = 0; x < pb.w; x++) pb.d[o + x] = bay(x, y) < f ? band[i + 1] : band[i];
  }
};
AB.layer = (W, H, fn, sty) => hiBake(W, H, 0, 0, fn, sty || ED);
AB.over = (dst, src) => pbOver(dst, src);
// 층 전체에 안개 색 섞기 (ya에서 t0 → yb에서 t1)
AB.fog = function (L, col, t0, t1 = t0, ya = 0, yb = L.h) {
  const c = rgbOf(col), W = L.w, d = L.d;
  for (let y = 0; y < L.h; y++) {
    const t = clamp(lerp(t0, t1, (y - ya) / Math.max(1, yb - ya)), 0, 1); if (t <= 0) continue;
    for (let x = 0, o = y * W; x < W; x++) { const u = d[o + x]; if (u >>> 24) d[o + x] = _mixU(u, c, t); }
  }
  return L;
};
// 층에서 y 아래를 지움 (물에 잠긴 부분)
AB.clipBelow = function (L, y, x0 = 0, x1 = L.w) { for (let j = Math.max(0, y); j < L.h; j++) for (let x = Math.max(0, x0); x < Math.min(L.w, x1); x++) L.d[j * L.w + x] = 0; return L; };
// 안개 띠: 가운데 y, 반두께 h, 가장 진한 곳 t. 4단계로 끊고 디더
AB.mist = function (pb, y, h, col, t, seed = 0, sx = .02) {
  const c = rgbOf(col), W = pb.w, d = pb.d;
  for (let j = Math.max(0, Math.floor(y - h)); j < Math.min(pb.h, Math.ceil(y + h)); j++) for (let x = 0; x < W; x++) {
    const n = vnoise(x * sx, j * .07, seed) * .7 + .3, k = (1 - Math.abs(j - y) / h) * n; if (k <= 0) continue;
    const lv = Math.floor(k * 4 + bay(x, j)) / 4; if (lv <= 0) continue;
    const i = j * W + x; if (d[i] >>> 24) d[i] = _mixU(d[i], c, Math.min(1, lv) * t);
  }
};
// 색을 섞어 긋는 선 (빗줄기)
AB.tline = function (pb, x0, y0, x1, y1, col, t) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (; ;) { pb.tint(x0, y0, t, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
};
// 비: 먼 빗줄기(짧고 흐림) + 가까운 빗줄기(길고 밝음). slant 는 세로 1칸당 가로 이동
AB.rain = function (pb, o = {}) {
  const r = RNG(o.seed || 7), W = pb.w, H = pb.h, n = o.n || 260, len = o.len || 10, sl = o.slant ?? -.28, y0 = o.y0 || 0;
  for (let i = 0; i < n; i++) {
    const near = r() < (o.near ?? .3), L = near ? len * (1 + r() * .6) : len * (.4 + r() * .3);
    const x = r() * (W + 60) - 30, y = y0 + r() * (H - y0 + L) - L;
    AB.tline(pb, x, y, x + sl * L, y + L, near ? (o.col2 || '#e2ecf4') : (o.col || '#b8c8d8'), near ? (o.t2 || .45) : (o.t || .26));
  }
};
// 거꾸로 오르는 물방울 (근원의 호수)
AB.rise = function (pb, n, seed, area, col = '#f4f0ff') {
  const r = RNG(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.round(area[0] + r() * area[2]), y = Math.round(area[1] + r() * area[3]), L = 2 + Math.floor(r() * 5);
    pb.tint(x, y, .85, col); pb.tint(x, y - 1, .75, col); pb.tint(x + 1, y, .4, col);
    for (let k = 1; k <= L; k++) pb.tint(x, y + 1 + k, .3 * (1 - k / (L + 1)), col);
  }
};
// 물튀김 (바닥), 빗방울 동심원 (물 위). area = [x, y, w, h, 판정함수]
AB.splash = function (pb, n, seed, area, col = '#e4eef6', t = .55) {
  const r = RNG(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.round(area[0] + r() * area[2]), y = Math.round(area[1] + r() * area[3]); if (area[4] && !area[4](x, y)) continue;
    pb.tint(x - 1, y - 1, t, col); pb.tint(x + 1, y - 1, t, col); pb.tint(x, y, t * .6, col);
  }
};
AB.rings = function (pb, n, seed, area, col = '#d8e6f0', t = .38) {
  const r = RNG(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.round(area[0] + r() * area[2]), y = Math.round(area[1] + r() * area[3]); if (area[4] && !area[4](x, y)) continue;
    const w = 2 + Math.floor(r() * 3 * (0.5 + (y - area[1]) / area[3]));
    for (let k = -w + 1; k <= w - 1; k++) { pb.tint(x + k, y - 1, t, col); pb.tint(x + k, y + 1, t * .6, col); }
    pb.tint(x - w, y, t, col); pb.tint(x + w, y, t, col);
  }
};
// 물결 줄 (밝은 가로줄)
AB.ripple = function (pb, n, seed, area, col, t = .25) {
  const r = RNG(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.round(area[0] + r() * area[2]), y = Math.round(area[1] + r() * area[3]), w = 2 + Math.round(r() * 3 + 10 * (y - area[1]) / area[3]);
    if (area[4] && !area[4](x, y)) continue; for (let k = 0; k < w; k++) pb.tint(x + k, y, t, col);
  }
};
// 층 L 을 바닥선 yb 기준으로 뒤집어 물에 비춤
AB.reflect = function (dst, L, yb, col, t, water, amp = 1, seed = 0, y1) {
  const W = L.w, H = L.h, c = rgbOf(col), s = L.d, d = dst.d, ye = Math.min(H, y1 || H);
  for (let ty = yb; ty < ye; ty++) {
    const sy = 2 * yb - ty - 1; if (sy < 0) break;
    const off = Math.round(Math.sin(ty * .9 + seed) * amp * Math.min(1, (ty - yb) / 16)), k = clamp(t + (ty - yb) / H * .5, 0, .92);
    for (let x = 0; x < W; x++) {
      const sx = x + off; if (sx < 0 || sx >= W) continue; const u = s[sy * W + sx]; if (!(u >>> 24)) continue;
      if (water && !water(x, ty)) continue; d[ty * W + x] = _mixU(u, c, k);
    }
  }
};
AB.copy = pb => { const o = new PB(pb.w, pb.h); o.d.set(pb.d); return o; };
// 둥근 빛 (등불)
AB.glow = function (pb, x, y, r, col, t = .6) {
  const c = rgbOf(col);
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    const q = Math.hypot(i, j) / r; if (q > 1) continue;
    const lv = Math.floor((1 - q) * (1 - q) * 4 + bay(x + i, y + j)) / 4; if (lv <= 0) continue;
    const X = Math.round(x + i), Y = Math.round(y + j); if (X < 0 || Y < 0 || X >= pb.w || Y >= pb.h) continue;
    const idx = Y * pb.w + X; if (pb.d[idx] >>> 24) pb.d[idx] = _mixU(pb.d[idx], c, Math.min(1, lv) * t);
  }
};
// 빛줄기: 다각형 안을 디더로 밝힘 (위 t0 → 아래 t1)
AB.shaft = function (pb, pts, col, t0, t1 = t0) {
  const m = new PB(pb.w, pb.h); m.poly(pts, '#ffffff'); const c = rgbOf(col);
  let ya = 1e9, yb = -1e9; for (const p of pts) { ya = Math.min(ya, p[1]); yb = Math.max(yb, p[1]); }
  for (let y = 0; y < pb.h; y++) for (let x = 0; x < pb.w; x++) {
    const i = y * pb.w + x; if (!(m.d[i] >>> 24) || !(pb.d[i] >>> 24)) continue;
    const t = lerp(t0, t1, clamp((y - ya) / Math.max(1, yb - ya), 0, 1)); pb.d[i] = _mixU(pb.d[i], c, t * (bay(x, y) < .5 ? 1 : .55));
  }
};
// 바닥 그림자
AB.shadow = function (pb, x, y, rx, ry, t = .35, col = '#141020') {
  for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) for (let i = -Math.ceil(rx); i <= Math.ceil(rx); i++) if ((i / rx) ** 2 + (j / ry) ** 2 <= 1) pb.tint(x + i, y + j, t, col);
};
// 반짝임 (수집품 위치)
AB.spark = function (pb, x, y, col = '#fff6d0', big) { star4(pb, x, y, col, big); };
// 3×5 숫자, 번호 동그라미
const DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001010010', '111101111101111', '111101111001111'];
AB.num = function (pb, x, y, n, col) { const s = String(n); for (let k = 0; k < s.length; k++) { const g = DIG[+s[k]]; for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') pb.px(x + k * 4 + i, y + j, col); } };
AB.badge = function (pb, x, y, n, bg = '#e0b032', fg = '#1a1410') { pb.circle(x, y, 5.6, INK); pb.circle(x, y, 4.6, bg); const w = String(n).length * 4 - 1; AB.num(pb, Math.round(x - w / 2), Math.round(y - 2.5), n, fg); };
AB.toCanvas = pb => pb.canvas();
// 세포 무늬 경계 거리 (거북 등딱지): 0 에 가까울수록 경계
AB.vor = function (x, y, sx, sy, seed) {
  const gx = Math.floor(x / sx), gy = Math.floor(y / sy); let d1 = 1e9, d2 = 1e9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = (gx + i + .2 + hash2(gx + i, gy + j + seed) * .6) * sx, cy = (gy + j + .2 + hash2(gx + i + 7, gy + j - seed) * .6) * sy, d = Math.hypot((x - cx) / sx, (y - cy) / sy);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return d2 - d1;
};

/* ---------- 인물 스프라이트 ---------- */
const _heroCache = new Map();
// 우비 방랑자(6번). view: 'q' 3/4(기본) · 'front' · 'back' · 'pack'(텐트를 짊어짐). cat:false 면 우비 밑 솔을 뺌
AB.hero = function (k, f = 0, o = {}) {
  const v = o.view || 'q', key = [k, f, v, o.cat].join('|'); let hit = _heroCache.get(key); if (hit) return hit;
  const s = edState(f), sc = 1.08 * k, W = Math.ceil(64 * sc) + 8, H = Math.ceil(142 * sc) + 8, ox = Math.round(W / 2), oy = H - 4;
  let fns;
  if (v === 'q') { const L = HCD[5].layers(s); fns = o.cat === false ? [L[0].fn, L[2].fn] : L.map(l => l.fn); }
  else if (v === 'front') fns = [R => wFront(R, s, 'low'), R => wFront(R, s)];
  else fns = [R => wBack(R, s, 'low'), R => wBack(R, s, null, v === 'pack')];
  const out = new PB(W, H); let n = 0;
  for (const fn of fns) { const L = hiBake(W, H, ox, oy, R => { R.scl(sc); fn(R); }, ED); if (n++) pbCast(out, L, '#1e2a44', .42); pbOver(out, L); }
  if (o.grain !== false) grain(out, .035, 5);
  hit = { pb: out, ox, oy }; _heroCache.set(key, hit); return hit;
};
AB.put = function (dst, spr, x, y, flip) { const pb = spr.pb; dst.blit(pb, Math.round(x - (flip ? pb.w - 1 - spr.ox : spr.ox)), Math.round(y - spr.oy), flip); };
// 아무 Rig 그림을 투명 스프라이트로 (원점 = 발)
AB.spr = function (W, H, ox, oy, k, fn, sty) { const pb = hiBake(W, H, ox, oy, R => { R.scl(k); fn(R); }, sty || ED); return { pb, ox, oy }; };
// 솔 (hunter.js 그림 + 이 책에서 새로 그린 자세)
AB.sol = function (k, kind, s = {}) {
  const W = Math.ceil(34 * k) + 6, H = Math.ceil(28 * k) + 6;
  const fn = { side: catSideHi, sit: catSitHi, loaf: catLoafHi, front: catFrontHi, back: catBackHi, punch: catPunch, scratch: catScratch }[kind];
  return AB.spr(W, H, Math.round(W / 2), H - 3, k, R => fn(R, s));
};

/* ---------- 장면 부품 (Rig, 화면 픽셀 좌표) ---------- */
// 큰 줄기: 아래 r0 → 위 r1, 화면 위 밖까지. 뿌리, 세로 나무껍질 줄, 밑동 이끼
AB.trunk = function (R, x, yb, r0, r1, P, o = {}) {
  const top = o.top ?? -30, lean = o.lean || 0, g = o.g || ('tr' + x), bw = o.bw || 7, mh = o.mossH || r0 * 2.4;
  const alts = [o.bark || P]; if (o.moss) alts.push(o.moss);
  const alt = (X, Y) => {
    if (o.moss && Y > yb - mh + vnoise(X * .2, 3, x) * r0 * 1.2 && X < x + r0 * .25) return 1;
    return mod(X - x + Math.sin(Y * .06 + x) * 2.4, bw) < 1.4 ? 0 : -1;
  };
  R.K2(x, yb - r0 * .2, x + lean, top, r0, r1, P, R.pat({ g, ol: o.ol, alts, alt }));
  const nr = o.nr ?? 4;
  for (let i = 0; i < nr; i++) {
    const a = nr > 1 ? (i / (nr - 1) - .5) * 2 : 0;
    R.K2(x + a * r0 * .45, yb - r0 * .55, x + a * r0 * 1.55, yb + 1.5 - Math.abs(a) * 1.5, r0 * .36, r0 * .12, P, R.pat({ g, alts, alt }));
  }
};
// 잎 덩어리
AB.leaves = function (R, x, y, rx, ry, P, seed, o = {}) {
  const r = RNG(seed), n = o.n || 7;
  for (let i = 0; i < n; i++) { const a = r() * TAU, d = r() * .62; R.E(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d * .8, rx * (.36 + r() * .3), ry * (.4 + r() * .3), 0, P, o.alt ? R.pat({ g: o.g || 'lf' + seed, alts: o.alts, alt: o.alt }) : { g: o.g || 'lf' + seed }); }
};
// 고사리 잎 한 장: 톱니 가장자리, 끝으로 갈수록 가늘고 아래로 휨
AB.frond = function (R, x, y, ang, L, w, P, g, curl = .5) {
  const n = 10, left = [], right = [], sg = ang < -Math.PI / 2 ? -1 : 1; let px = x, py = y, a = ang;
  for (let k = 0; k <= n; k++) {
    const t = k / n, ww = w * Math.sin(Math.PI * Math.min(1, .12 + t * .95)) * (k % 2 ? 1 : .6), nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
    left.push([px + nx * ww, py + ny * ww]); right.push([px - nx * ww, py - ny * ww]);
    px += Math.cos(a) * L / n; py += Math.sin(a) * L / n; a += sg * curl * 2 / n;
  }
  R.P(left.concat(right.reverse()), P, { g });
};
AB.fern = function (R, x, y, s, P, seed = 1, o = {}) {
  const r = RNG(seed), n = o.n || 7;
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / (n - 1) - .5) * (o.spread || 2.7) + (r() - .5) * .25; AB.frond(R, x + (r() - .5) * s * .2, y, a, s * (.7 + r() * .45), s * .15, P, (o.g || 'fern' + seed) + i, o.curl ?? .55); }
};
// 풀 포기
AB.tuft = function (R, x, y, s, P, seed = 1, g) {
  const r = RNG(seed);
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (r() - .5) * 1.6, L = s * (.6 + r() * .5); R.P([[x - 1.2 + i * .5, y], [x + Math.cos(a) * L, y + Math.sin(a) * L], [x + 1.2 + i * .5, y]], P, { g: g || 'tf' + seed }); }
};
AB.rock = (R, x, y, rx, ry, P, g, o = {}) => R.E(x, y - ry * .7, rx, ry, o.a || 0, P, R.pat({ g: g || 'rk' + x, ol: o.ol, alts: o.moss ? [o.moss] : undefined, alt: o.moss ? (X, Y) => (Y < y - ry * 1.2 + Math.sin(X * .45) * 1.6 ? 0 : -1) : undefined }));
// 수양버들
AB.willow = function (R, x, yb, h, P, PL, seed) {
  const r = RNG(seed), g = 'wt' + seed, gl = 'wl' + seed;
  R.K2(x, yb, x - 3, yb - h * .55, h * .065, h * .045, P, { g });
  R.K2(x - 3, yb - h * .55, x + h * .2, yb - h * .86, h * .04, h * .022, P, { g });
  R.K2(x - 3, yb - h * .5, x - h * .24, yb - h * .82, h * .035, h * .02, P, { g });
  AB.leaves(R, x - 2, yb - h * .84, h * .34, h * .16, PL, seed, { g: gl, n: 7 });
  for (let i = 0; i < 26; i++) { const sx = x - 2 + (r() - .5) * h * .66, sy = yb - h * (.8 + r() * .08), L = h * (.3 + r() * .34); R.K2(sx, sy, sx + (r() - .5) * 2, sy + L, 1.5, .6, PL, { g: gl }); }
};
// 적송: 비틀린 붉은 줄기 + 납작한 솔잎 방석
AB.pine = function (R, x, yb, h, P, PL, seed) {
  const r = RNG(seed), g = 'pt' + seed, pts = [[x, yb]]; let px = x, py = yb;
  for (let k = 0; k < 5; k++) { px += (r() - .5) * h * .14 + h * .02; py -= h * .18; pts.push([px, py]); }
  R.chain(pts, [h * .05, h * .042, h * .036, h * .03, h * .024, h * .018], P, R.pat({ g, alts: [[P[0], mix(P[1], '#3a1a10', .35)]], alt: (X, Y) => (hash2(Math.round(X * .7), Math.round(Y * .35)) > .7 ? 0 : -1) }));
  const pad = (bx, by, w) => R.E(bx, by, w, w * .32, 0, PL, R.pat({ g: 'pp' + seed + Math.round(bx), alts: [[PL[0], mix(PL[1], '#0a140a', .3)]], alt: (X, Y) => (mod(Math.round(X + Y * 2), 3) === 0 && Y > by - w * .1 ? 0 : -1) }));
  for (let k = 2; k <= 4; k++) { const [bx, by] = pts[k], sd = k % 2 ? 1 : -1, ex = bx + sd * h * (.14 + r() * .1), ey = by - h * .02; R.K2(bx, by, ex, ey, h * .018, h * .012, P, { g }); pad(ex, ey - h * .03, h * (.12 + r() * .05)); }
  pad(px, py - h * .03, h * .17);
};
// 침엽수 실루엣 (먼 산)
AB.fir = function (R, x, yb, h, P, g) { for (let k = 0; k < 3; k++) { const y = yb - h * (.25 + k * .25), w = h * (.3 - k * .07); R.P([[x - w, y + h * .12], [x, y - h * .25], [x + w, y + h * .12]], P, { g }); } R.K2(x, yb, x, yb - h * .2, h * .04, h * .04, P, { g }); };
// 한옥 지붕: 처마 끝이 들림. x 가운데, y 처마선, w 반폭, h 지붕 높이
AB.roof = function (R, x, y, w, h, P, Pt, g, moss) {
  const lift = h * .38, alts = [P]; if (moss) alts.push(moss);
  R.P([[x - w - 5, y - lift], [x - w * .62, y + 1.5], [x + w * .62, y + 1.5], [x + w + 5, y - lift], [x + w * .72, y - h * .55], [x + w * .46, y - h], [x - w * .46, y - h], [x - w * .72, y - h * .55]], Pt,
    R.pat({ g, alts, alt: (X, Y) => (moss && vnoise(X * .09, Y * .2, x) > .58 ? 1 : mod(X - x, 4) < 1.1 ? 0 : -1) }));
  R.P([[x - w * .5, y - h - 2.5], [x + w * .5, y - h - 2.5], [x + w * .5, y - h + 1.2], [x - w * .5, y - h + 1.2]], P, { g: g + 'r', ol: 1 });
};
// 옹기
AB.jar = function (R, x, yb, s, P, g) { R.E(x, yb - s * .56, s * .52, s * .56, 0, P, { g, ol: 1 }); R.E(x, yb - s * 1.1, s * .32, s * .1, 0, P, { g: g + 'n' }); R.E(x, yb - s * 1.16, s * .36, s * .13, 0, P, { g: g + 'l', ol: 1 }); };
// 펼쳐진 우산 (물에 뜸)
AB.umbrella = function (R, x, y, s, P, g, tilt = 0) {
  R.push(); R.translate(x, y); R.rotate(tilt);
  R.E(0, 0, s, s * .4, 0, P, R.pat({ g, ol: 1, alts: [[P[0], mix(P[1], '#ffffff', .22)]], alt: (X, Y) => (mod(Math.floor((Math.atan2(Y * 2.5, X) + 7) * 8 / TAU), 2) ? 0 : -1) }));
  R.K2(0, -s * .02, s * .1, -s * .55, .7, .7, ['#2a2018', '#4a3828'], { g: g + 'h' });
  R.pop();
};
// 연잎: 한쪽이 파인 타원
AB.lily = function (R, x, y, s, P, g) { const pts = []; for (let a = .35; a <= TAU - .35; a += .3) pts.push([x + Math.cos(a) * s, y + Math.sin(a) * s * .38]); pts.push([x, y]); R.P(pts, P, { g, ol: 1 }); };
// 나룻배 (sunk: 0~1, 기울어 잠김)
AB.boat = function (R, x, y, s, P, g, tilt = 0) {
  R.push(); R.translate(x, y); R.rotate(tilt);
  R.P([[-s, -s * .3], [s * 1.05, -s * .38], [s * .72, s * .14], [-s * .74, s * .14]], P, R.pat({ g, ol: 1, alts: [[P[0], mix(P[1], '#000000', .18)]], alt: (X, Y) => (mod(Y + s, s * .22) < 1 ? 0 : -1) }));
  R.P([[-s * .86, -s * .3], [s * .92, -s * .37], [s * .8, -s * .26], [-s * .78, -s * .2]], [mix(P[0], '#000', .3), P[0]], { g: g + 'i', flat: 0 });
  R.pop();
};
