'use strict';
/* =========================================================
   게임 장면 시안 2: 인물을 실제 비율로 (camp.js 의 배경 도구를 다시 씀)
   방랑자 키 60픽셀(7등신 가까이), 솔은 무릎 높이의 옆모습, 텐트는 사람보다 조금 낮은 큰 텐트
   ========================================================= */
function outlineSprite(sp, col = '#1c1618') {
  const W = sp.w, H = sp.h, s = new Uint32Array(sp.d), oc = C(col);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (s[i] >>> 24) continue; if ((x > 0 && s[i - 1] >>> 24) || (x < W - 1 && s[i + 1] >>> 24) || (y > 0 && s[i - W] >>> 24) || (y < H - 1 && s[i + W] >>> 24)) sp.d[i] = oc; }
  return sp;
}
/* ---------- 솔: 앉은 옆모습 (불 쪽을 봄) ---------- */
const SOL_SIDE = [
  '........f.f...', '.......dffpf..', '.......sffffh.', '......dsffefh.', '......dsfffwwn',
  '.......dffwwg.', '.......dfRrww.', '......dfsfrww.', '.....dfsffwww.', '....dsffsfwwh.',
  '...dfsffsfdwh.', '..dffsfffsdwh.', '..dfsffffsdww.', '.ssdffffffdwww', 'fsffsffsfh.gw.',
];
const SOL_SIDE_PAL = { f: '#94806a', d: '#68574a', s: '#43352c', h: '#b29e84', w: '#f0e9de', g: '#c9c0b4', p: '#e8a09c', n: '#d98a84', e: '#e0d870', r: '#c84430', R: '#8a2a1e' };
function solSideSprite() { const sp = new PB(16, 17); sprRows(sp, 1, 1, SOL_SIDE, SOL_SIDE_PAL); return outlineSprite(sp, '#241a16'); }

/* ---------- 방랑자: 앞모습, 실제 비율 ---------- */
function wanSprite() {
  const sp = new PB(32, 62), cx = 16, P = (x, y, c) => sp.px(x, y, c);
  const span = (y, x0, x1, fn) => { for (let x = x0; x <= x1; x++) { const c = fn(x, (x - x0) / Math.max(1, x1 - x0)); if (c) P(x, y, c); } };
  // 등 뒤 총 (총구에 감은 천)
  for (let y = 2; y <= 16; y++) { const x = Math.round(24 - (y - 2) * .16); P(x, y, '#3c3c46'); P(x + 1, y, '#6a6a78'); }
  for (let y = 2; y <= 4; y++) { P(24, y, '#c8b48a'); P(25, y, '#e0d0a8'); }
  // 다리, 장화
  for (let y = 45; y <= 51; y++) { span(y, 12, 15, (x, u) => u > .7 ? '#4e4a42' : '#3a3630'); span(y, 17, 20, (x, u) => u > .7 ? '#4e4a42' : '#3a3630'); }
  for (let y = 51; y <= 60; y++) { const e = y >= 57 ? 1 : 0, c = (x, u) => y === 60 ? '#18181c' : u > .72 ? '#4a4e56' : '#2a2c30'; span(y, 11 - e, 15, c); span(y, 17, 21 + e, c); }
  // 우비: 어깨에서 아래로 넓어지는 세모, 앞자락이 조금 처짐. 접힌 주름 두 줄
  for (let y = 14; y <= 47; y++) {
    let x0, x1;
    if (y === 14) { x0 = 10; x1 = 22; } else if (y === 15) { x0 = 8; x1 = 24; } else if (y === 16) { x0 = 7; x1 = 25; }
    else { const t = (y - 16) / 31; x0 = Math.round(7 - t * 4); x1 = Math.round(25 + t * 4); }
    span(y, x0, x1, (x, u) => {
      const hem = 44 + (1 - Math.abs(x - cx) / 14) * 3; if (y > hem) return null;
      if (y >= hem - 1 || u < .2) return '#344e3e';
      if (u > .84) return '#62886b';
      if ((x === 11 || x === 21) && y > 24) return '#3a5444';
      if ((x === 12 || x === 22) && y > 24) return '#56785f';
      return cmod(Math.round(x * .5 - y * .2), 6) === 0 ? '#3e5b48' : '#4b6c56';
    });
  }
  span(14, 12, 20, () => '#3e5b48'); span(15, 13, 19, () => '#3e5b48');
  for (let y = 19; y <= 24; y++) { P(13, y, '#2e2a24'); P(14, y, '#45403a'); }
  P(13, 17, '#a07a4a'); P(14, 17, '#c09a64'); P(13, 18, '#a07a4a'); span(18, 12, 15, () => '#c0c0c8');
  P(22, 30, '#e2b294'); P(23, 30, '#e2b294'); P(22, 31, '#bf8a6c'); P(23, 31, '#e2b294');
  // 얼굴, 긴 코, 수염
  for (let y = 9; y <= 13; y++) span(y, 12, 20, (x, u) => y === 9 ? '#a8745a' : u < .25 ? '#bf8a6c' : '#e2b294');
  for (let y = 9; y <= 12; y++) { P(16, y, '#e8bc9a'); P(17, y, '#f4d0b2'); }
  P(15, 11, '#bf8a6c'); P(15, 12, '#a8745a');
  [[11, [[12, 13], [19, 20]]], [12, [[12, 14], [18, 20]]], [13, [[12, 20]]], [14, [[12, 20]]], [15, [[13, 19]]], [16, [[13, 19]]], [17, [[14, 18]]], [18, [[15, 17]]]].forEach(([y, segs]) => segs.forEach(([a, b]) => span(y, a, b, (x, u) => (u < .15 || u > .85) ? '#3e2e22' : hash2(x * 3, y * 5) > .6 ? '#6e5440' : '#5a4434')));
  P(15, 15, '#2e2018'); P(16, 15, '#2e2018'); P(17, 15, '#3a2a20');
  // 노란 방수모: 둥근 머리 · 띠 · 넓은 챙(앞이 처져 눈을 가림) · 양옆 귀덮개
  [[1, 3], [2, 4], [3, 5], [4, 5], [5, 5]].forEach(([y, w]) => span(y, cx - w, cx + w - 1, (x, u) => y === 5 ? '#9a6e22' : u < .28 ? '#b5862a' : u > .72 ? '#f7d97c' : '#e3b23c'));
  span(6, cx - 10, cx + 9, (x, u) => u < .2 ? '#c8962e' : u > .8 ? '#f7d97c' : '#e3b23c');
  span(7, cx - 11, cx + 10, (x, u) => u < .15 ? '#b5862a' : '#d4a438');
  span(8, cx - 10, cx + 9, () => '#9a6e22');
  for (let y = 8; y <= 12; y++) { span(y, cx - 10, cx - 8, (x, u) => u < .5 ? '#b5862a' : '#c8962e'); span(y, cx + 7, cx + 9, (x, u) => u > .5 ? '#e3b23c' : '#c8962e'); }
  return outlineSprite(sp);
}
/* ---------- 큰 텐트 (camp.js 텐트를 배율 s 로) ---------- */
function tent2(pb, em, bx, by, s) {
  const O = '#2e2218', q = (x, y) => [bx + x * s, by + y * s], Q = pts => pts.map(p => q(p[0], p[1]));
  const Lp = Q([[-30, 0], [0, -34], [0, -52], [-30, -18]]), Rp = Q([[30, 0], [0, -34], [0, -52], [30, -18]]), F = Q([[-30, 0], [0, -34], [30, 0]]);
  pb.poly(Lp, '#8a7450'); pb.poly(Rp, '#b29a6a');
  for (let k = 1; k < 4; k++) { const a = q(-30, -k * 4.5), b = q(0, -34 - k * 4.5), c = q(30, -k * 4.5); pb.line(a[0], a[1], b[0], b[1], '#7a6646'); pb.line(c[0], c[1], b[0], b[1], '#9c8658'); }
  pb.poly(F, '#a38b5c');
  { const ap = q(0, -34), l = q(-14, 0), r = q(14, 0); pb.line(ap[0], ap[1], l[0], l[1], '#8e784e'); pb.line(ap[0], ap[1], r[0], r[1], '#8e784e'); }
  pb.poly(Q([[-11, 0], [0, -21], [11, 0]]), '#3a2216');
  const g1 = Q([[-8, 0], [0, -15], [8, 0]]), g2 = Q([[-5, 0], [0, -9], [5, 0]]);
  const gl = new PB(CW, CH); gl.poly(g1, '#e8923e'); gl.poly(g2, '#ffc870');
  for (let i = 0; i < gl.d.length; i++) if (gl.d[i] >>> 24) { pb.d[i] = gl.d[i]; em[i] = 1; }
  for (const P of [Lp, Rp, F]) for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; pb.line(a[0], a[1], b[0], b[1], O); }
  for (const [a, b, c] of [[[-30, -18], [-44, -2], [-45, -2]], [[30, -18], [44, -4], [44, -4]]]) { const A = q(...a), B = q(...b); pb.line(A[0], A[1], B[0], B[1], '#c8b48a'); pb.rect(B[0] - 1, B[1], 2, 2, O); }
  const pp = q(17, -50); pb.rect(pp[0], pp[1], 5, 16, '#3a3a42'); pb.vl(pp[0] - 1, pp[1], pp[1] + 16, '#1a1a20'); pb.vl(pp[0] + 5, pp[1], pp[1] + 16, '#1a1a20'); pb.rect(pp[0] - 1, pp[1] - 2, 7, 2, '#24242a');
  const ap = q(0, -34); pb.vl(ap[0], ap[1], ap[1] + 5, '#1a1410'); pb.rect(ap[0] - 3, ap[1] + 5, 7, 8, '#2a2018'); pb.rect(ap[0] - 2, ap[1] + 6, 5, 6, '#ffd060');
  for (let y = ap[1] + 6; y < ap[1] + 12; y++) for (let x = ap[0] - 2; x < ap[0] + 3; x++) em[Math.round(y) * CW + Math.round(x)] = 1;
  return { door: q(0, -8), lamp: q(0, -26), pipe: [pp[0] + 2, pp[1] - 4] };
}
/* ---------- 장면 ---------- */
function campScene2() {
  const pb = new PB(CW, CH), em = new Uint8Array(CW * CH);
  ground(pb);
  puddle(pb, 62, 182, 22, 7); puddle(pb, 304, 188, 16, 6); puddle(pb, 322, 112, 12, 5);
  const r = RNG(4);
  for (let i = 0; i < 70; i++) { const x = Math.round(r() * CW), y = Math.round(r() * CH); const d = ((x - 196) / 118) ** 2 + ((y - 124) / 60) ** 2; if (d > 1.05) tuft(pb, x, y, i % 3 ? '#62865a' : '#557a4e'); else if (i % 2) pebble(pb, x, y); }
  trunk(pb, 30, 72, 24); trunk(pb, 352, 58, 28); trunk(pb, 374, 190, 18);
  fern(pb, 58, 84, 14); fern(pb, 330, 74, 16, true); fern(pb, 14, 120, 12); fern(pb, 356, 206, 14, true);
  mushroom(pb, 44, 80); mushroom(pb, 48, 82); mushroom(pb, 340, 66);
  shadowEl(pb, 124, 114, 46, 6, .45);
  const T = tent2(pb, em, 122, 112, 1.4);
  const W = wanSprite(), S = solSideSprite(), wx = 188, wy = 128, sx = 210, sy = 129;
  shadowEl(pb, wx, wy, 11, 3); shadowEl(pb, sx, sy, 8, 2);
  pb.blit(W, wx - 16, wy - 60); pb.blit(S, sx - 8, sy - 15);
  shadowEl(pb, 150, 168, 17, 3, .35); logSeat(pb, 134, 158);
  campfire(pb, 240, 150, em);
  const lights = [[240, 144, 130, [1, .6, .3], 1.3], [T.door[0], T.door[1], 44, [1, .7, .38], .7], [T.lamp[0], T.lamp[1], 30, [1, .82, .5], .6]];
  const out = new PB(CW, CH), amb = [.36, .42, .58];
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = y * CW + x, u = pb.d[i], b = [u & 255, (u >>> 8) & 255, (u >>> 16) & 255], L = amb.slice();
    for (const [lx, ly, lr, lc, li] of lights) { const d = Math.hypot(x - lx, (y - ly) * 1.4) / lr; if (d < 1) { const f = (1 - d) * (1 - d) * li; L[0] += lc[0] * f; L[1] += lc[1] * f; L[2] += lc[2] * f; } }
    const v = Math.hypot((x - CW / 2) / (CW / 2), (y - CH / 2) / (CH / 2)), k = em[i] ? 1.25 : 1.12 * (1 - clamp((v - .62) / .55, 0, 1) * .6);
    out.d[i] = rgb2u(b[0] * (em[i] ? 1 : L[0]) * k, b[1] * (em[i] ? 1 : L[1]) * k, b[2] * (em[i] ? 1 : L[2]) * k);
  }
  for (let i = 0; i < 5; i++) out.ellipse(T.pipe[0] + i * 2, T.pipe[1] - i * 6, 2 + i * .6, 1.6 + i * .4, mix('#4a5260', '#7a8290', .3 - i * .05));
  for (let i = 0; i < 4; i++) { const x = 242 + i * 3, y = 124 - i * 7; for (let j = -2; j <= 2; j++) out.tint(x + j, y, .25, '#c8c0b8'); }
  for (let i = 0; i < 240; i++) {
    const x = r() * (CW + 40), y = r() * CH, len = 4 + Math.floor(r() * 4), lit = Math.max(0, 1 - Math.hypot(x - 240, (y - 144) * 1.4) / 130), col = mix('#8aa6c8', '#ffd8a0', lit * .8);
    for (let k = 0; k < len; k++) out.tint(Math.round(x - k * .3), Math.round(y + k), .4 + lit * .2, col);
  }
  for (const [px, py, prx, pry] of [[62, 182, 22, 7], [304, 188, 16, 6], [322, 112, 12, 5]]) for (let k = 0; k < 4; k++) { const x = Math.round(px + (r() - .5) * prx * 1.4), y = Math.round(py + (r() - .5) * pry); out.tint(x - 1, y, .5, '#9ab8d4'); out.tint(x + 1, y, .5, '#9ab8d4'); out.tint(x, y - 1, .4, '#9ab8d4'); out.tint(x, y + 1, .4, '#9ab8d4'); }
  return out;
}
