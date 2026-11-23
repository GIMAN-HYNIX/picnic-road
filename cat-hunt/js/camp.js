'use strict';
/* =========================================================
   게임 장면 시안: 텐트 옆 모닥불, 방랑자와 곁에 앉은 솔
   위에서 비스듬히 보는 시점, 384×216. 인물은 픽셀을 한 칸씩 찍은 2등신 그림.
   모닥불·등불 빛을 곱해서 주변은 어둡고 불 가까이는 따뜻하게.
   ========================================================= */
const CW = 384, CH = 216;
const cmod = (a, n) => ((a % n) + n) % n;
function sprRows(pb, x, y, rows, pal) { for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const ch = rows[j][i]; if (ch !== '.' && pal[ch]) pb.px(x + i, y + j, pal[ch]); } }
function mirrorHalf(half, extra) { return half.map(r => r + r.split('').reverse().join('') + '.'.repeat(extra)); }
function setc(rows, x, y, ch) { const r = rows[y].split(''); r[x] = ch; rows[y] = r.join(''); }

/* ---------- 솔: 앉은 앞모습 (왼쪽 절반을 그리고 뒤집어 붙임) ---------- */
const SOL_HALF = [
  '..o...', '.ofo..', '.opooo', '.ohfsf', 'ohEeff', 'ofeeff', 'opffwn',
  '.offow', '..oRrR', '.odfww', '.odfww', 'odfoww', 'oddowg', '.ooooo',
];
const SOL_PAL = { o: '#2b1d1a', f: '#ad9882', d: '#816f5e', h: '#cdbca6', s: '#5f4d41', w: '#f4eee4', g: '#cfc6ba', p: '#eda5a0', n: '#de7f7b', e: '#1d1517', E: '#ffffff', r: '#cc4430', R: '#8e2a1e' };
function solRows() {
  const R = mirrorHalf(SOL_HALF, 3);
  setc(R, 9, 0, '.'); setc(R, 9, 1, '.'); setc(R, 9, 2, 'o');          // 왼쪽 귀 끝이 찢어짐 (보는 쪽에서 오른쪽)
  setc(R, 8, 4, 'E'); setc(R, 9, 4, 'e');                              // 눈 반짝임은 둘 다 왼쪽 위
  for (const y of [4, 5, 6]) setc(R, 10, y, 'd'); setc(R, 9, 3, 'd'); setc(R, 9, 7, 'd'); // 오른쪽은 그늘
  [[13, 6, 'o'], [12, 7, 'o'], [13, 7, 's'], [14, 7, 'o'], [12, 8, 'o'], [13, 8, 'f'], [14, 8, 'o'], [12, 9, 'o'], [13, 9, 'f'], [14, 9, 'o'],
   [12, 10, 'o'], [13, 10, 's'], [14, 10, 'o'], [12, 11, 'f'], [13, 11, 'f'], [14, 11, 'o'], [12, 12, 'd'], [13, 12, 'o'], [11, 13, 'o'], [12, 13, 'o']].forEach(([x, y, c]) => setc(R, x, y, c));
  return R;
}
/* ---------- 방랑자: 앞모습 ---------- */
const WAN_HALF = [
  '......ooooo', '.....oZZYYY', '.....oZYYYY', '....oyyyyyy', '.ooooYYYYYY', 'oZZYYYYYYYY', 'oyyyyyyyyyy',
  '.oooooooKKk', '......obkKk', '......obbKk', '....oqPBbbK', '...oqPPBbbb', '...oqPPPBbb', '..oqPPPPBbb',
  '..oqPPPPPBB', '..oqPPLPPPP', '.oqPPPPLPPP', '.oqPPPPPLPP', '.oqPLPPPPLP', '.oqPPLPPPPL', 'oqPPPPLPPPP',
  'oqPPPPPLPPP', 'oqPLPPPPLPP', 'oqPPLPPPPLP', 'oQQQQQQQQQQ', 'ooooooooooo', '......oTtto', '......oTtto', '.....otttto', '.....oooooo',
];
const WAN_PAL = { o: '#1f1a1c', Y: '#e3b23c', y: '#b0822a', Z: '#f7d97c', k: '#eab996', K: '#c28a6c', b: '#6c503c', B: '#4a3628', P: '#4b6c56', Q: '#344e3e', q: '#62886b', L: '#3e5b48', t: '#2e3238', T: '#4c525a', G: '#3c3c46' };
function wanRows() {
  const R = mirrorHalf(WAN_HALF, 0);
  for (let y = 0; y < R.length; y++) { const row = R[y].split(''); for (let x = 11; x < 22; x++) { if (row[x] === 'Z') row[x] = 'Y'; } const q = row.lastIndexOf('q'); if (q > 11) row[q] = 'Q'; R[y] = row.join(''); }
  setc(R, 11, 7, 'K'); setc(R, 11, 8, 'K'); setc(R, 11, 9, 'K');      // 코의 그늘진 쪽
  [[19, 0, 'o'], [18, 1, 'o'], [19, 1, 'G'], [20, 1, 'o'], [18, 2, 'o'], [19, 2, 'G'], [20, 2, 'o'], [18, 3, 'o'], [19, 3, 'G'], [20, 3, 'o']].forEach(([x, y, c]) => setc(R, x, y, c)); // 등 뒤 총구
  return R;
}

/* ---------- 바닥과 물건 ---------- */
function ground(pb) {
  const cx = 196, cy = 124, rx = 118, ry = 60;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const n = vnoise(x * .07, y * .09, 1), h = hash2(x, y);
    let c = n > .56 ? '#47684a' : '#3d5a40';
    if (h > .94) c = '#2f4632'; else if (h < .035) c = '#5b7d55';
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (vnoise(x * .12, y * .12, 3) - .5) * .5;
    if (d < 1 && !(d > .9 && bay(x, y) < (d - .9) * 10)) {
      const m = vnoise(x * .1, y * .14, 5);
      c = m > .6 ? '#5f4a36' : '#6e573f';
      if (h > .95) c = '#4e3c2c'; else if (h < .03) c = '#85705a';
    }
    pb.d[y * CW + x] = C(c);
  }
}
function puddle(pb, x, y, rx, ry) {
  for (let j = -ry - 1; j <= ry + 1; j++) for (let i = -rx - 1; i <= rx + 1; i++) {
    const q = (i / rx) ** 2 + (j / ry) ** 2 + (vnoise((x + i) * .2, (y + j) * .2, 7) - .5) * .4;
    if (q < 1) pb.px(x + i, y + j, q > .7 ? '#24384a' : '#2e4658');
    else if (q < 1.25) pb.px(x + i, y + j, '#2a2420');
  }
  pb.hl(x - rx * .4, x + rx * .1, y - ry * .3, '#5a7690');
}
function trunk(pb, x, yb, r) {
  const O = '#1a1412';
  for (let k = 0; k < 5; k++) { const a = (k / 4 - .5) * 2.4, ex = x + Math.sin(a) * r * 1.5, ey = yb + 3 - Math.abs(a) * 2; pb.poly([[x + Math.sin(a) * r * .5 - 3, yb - 4], [ex, ey], [x + Math.sin(a) * r * .5 + 3, yb - 4]], '#4a3a2e'); pb.line(x + Math.sin(a) * r * .5 - 3, yb - 4, ex, ey, O); pb.line(ex, ey, x + Math.sin(a) * r * .5 + 3, yb - 4, O); }
  for (let y = -4; y < yb; y++) for (let i = -r; i <= r; i++) {
    const u = i / r, band = u < -.45 ? '#3a2e26' : u > .35 ? '#2f2520' : '#4f3e32';
    const bark = cmod(i + Math.round(Math.sin(y * .08 + x) * 2), 6) === 0;
    pb.px(x + i, y, bark ? '#2a201a' : band);
    if (y > yb - 26 && hash2(x + i, y) > .8 && u < .2) pb.px(x + i, y, (y + i) % 3 ? '#4a6a3e' : '#3c5a34');
  }
  pb.vl(x - r - 1, -4, yb, O); pb.vl(x + r + 1, -4, yb, O);
}
function tuft(pb, x, y, c = '#62865a') { pb.px(x, y, c); pb.px(x - 1, y - 1, c); pb.px(x + 1, y - 1, c); pb.px(x, y - 2, c); pb.px(x + 2, y - 2, c); }
function pebble(pb, x, y) { pb.rect(x, y, 3, 2, '#8a847c'); pb.px(x, y, '#aaa49c'); pb.hl(x, x + 2, y + 2, '#2a2420'); pb.px(x + 3, y + 1, '#2a2420'); }
function mushroom(pb, x, y) { pb.vl(x, y - 2, y, '#e8dcc8'); pb.rect(x - 2, y - 4, 5, 2, '#c8402e'); pb.px(x - 1, y - 4, '#f0e0d0'); pb.hl(x - 3, x + 3, y - 3, '#2a1a14'); pb.hl(x - 2, x + 2, y - 5, '#2a1a14'); }
function fern(pb, x, y, s, flip) {
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .45, ex = x + Math.cos(a) * s * (flip ? -1 : 1), ey = y + Math.sin(a) * s * .7; pb.line(x, y, ex, ey, '#2c4a30'); for (let t = .3; t < 1; t += .18) { const px = lerp(x, ex, t), py = lerp(y, ey, t); pb.px(px - 1, py, '#5a8a4e'); pb.px(px + 1, py, '#4a7442'); } }
}
function tent(pb, em) {
  const O = '#2e2218';
  const Lp = [[96, 100], [126, 66], [126, 48], [96, 82]], Rp = [[156, 100], [126, 66], [126, 48], [156, 82]], F = [[96, 100], [126, 66], [156, 100]];
  pb.poly(Lp, '#8a7450'); pb.poly(Rp, '#b29a6a');
  for (let k = 1; k < 4; k++) { pb.line(96, 100 - k * 4.5, 126, 66 - k * 4.5, '#7a6646'); pb.line(156, 100 - k * 4.5, 126, 66 - k * 4.5, '#9c8658'); }
  pb.poly(F, '#a38b5c');
  pb.line(126, 66, 112, 100, '#8e784e'); pb.line(126, 66, 140, 100, '#8e784e');
  pb.poly([[115, 100], [126, 79], [137, 100]], '#3a2216');
  pb.poly([[118, 100], [126, 85], [134, 100]], '#e8923e'); pb.poly([[121, 100], [126, 91], [131, 100]], '#ffc870');
  for (let y = 80; y <= 100; y++) for (let x = 115; x <= 137; x++) if (pb.get(x, y) === C('#e8923e') || pb.get(x, y) === C('#ffc870')) em[y * CW + x] = 1;
  for (const P of [Lp, Rp, F]) for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; pb.line(a[0], a[1], b[0], b[1], O); }
  pb.line(96, 82, 82, 98, '#c8b48a'); pb.line(156, 82, 170, 96, '#c8b48a'); pb.rect(81, 98, 2, 2, O); pb.rect(170, 96, 2, 2, O);
  pb.rect(143, 50, 4, 12, '#3a3a42'); pb.vl(142, 50, 62, '#1a1a20'); pb.vl(147, 50, 62, '#1a1a20'); pb.rect(142, 48, 6, 2, '#24242a');
  pb.vl(126, 66, 70, '#1a1410'); pb.rect(124, 70, 5, 6, '#2a2018'); pb.rect(125, 71, 3, 4, '#ffd060');
  for (let y = 71; y < 75; y++) for (let x = 125; x < 128; x++) em[y * CW + x] = 1;
}
function logSeat(pb, x, y) {
  const O = '#1e1410';
  pb.rect(x, y, 30, 8, '#6a4a30'); for (let i = 2; i < 30; i += 5) pb.vl(x + i, y + 1, y + 6, '#54381f');
  pb.hl(x, x + 29, y, '#86603e'); pb.frame(x - 1, y - 1, 32, 10, O);
  pb.ellipse(x + 30, y + 4, 3, 4.5, '#b08a5a'); pb.ellipse(x + 30, y + 4, 1.6, 2.6, '#8a6840'); pb.px(x + 30, y + 4, '#6a4a30');
}
function campfire(pb, x, y, em) {
  pb.ellipse(x, y, 9, 4.5, '#2e2622');
  for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, sx = Math.round(x + Math.cos(a) * 11), sy = Math.round(y + Math.sin(a) * 5.6); pb.ellipse(sx, sy + 1, 3, 2.2, '#1e1a18'); pb.ellipse(sx, sy, 2.4, 1.7, '#7a7470'); pb.px(sx - 1, sy - 1, '#aca69e'); }
  const log = (x0, y0, x1, y1) => { pb.line(x0, y0, x1, y1, '#1e1410'); pb.line(x0, y0 - 1, x1, y1 - 1, '#6a4428'); pb.line(x0, y0 - 2, x1, y1 - 2, '#1e1410'); };
  log(x - 8, y + 2, x + 7, y - 2); log(x - 7, y - 2, x + 8, y + 2);
  const fl = new PB(CW, CH);
  fl.poly([[x - 6, y], [x - 4, y - 8], [x - 1, y - 6], [x, y - 14], [x + 2, y - 7], [x + 4, y - 10], [x + 6, y]], '#e8642a');
  fl.poly([[x - 4, y], [x - 2, y - 6], [x, y - 10], [x + 2, y - 5], [x + 4, y]], '#ffb43a');
  fl.poly([[x - 2, y], [x, y - 6], [x + 2, y]], '#fff2b0');
  for (let i = 0; i < fl.d.length; i++) if (fl.d[i] >>> 24) { pb.d[i] = fl.d[i]; em[i] = 1; }
  for (const [ex, ey] of [[x - 3, y - 17], [x + 4, y - 20], [x + 1, y - 24]]) { pb.px(ex, ey, '#ffb040'); em[ey * CW + ex] = 1; }
}
function shadowEl(pb, x, y, rx, ry, t = .4) { for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) if ((i / rx) ** 2 + (j / ry) ** 2 <= 1) pb.tint(x + i, y + j, t, '#141016'); }

/* ---------- 장면 ---------- */
function campScene() {
  const pb = new PB(CW, CH), em = new Uint8Array(CW * CH);
  ground(pb);
  puddle(pb, 62, 176, 22, 7); puddle(pb, 300, 184, 16, 6); puddle(pb, 322, 116, 12, 5);
  const r = RNG(4);
  for (let i = 0; i < 70; i++) { const x = Math.round(r() * CW), y = Math.round(r() * CH); const d = ((x - 196) / 118) ** 2 + ((y - 124) / 60) ** 2; if (d > 1.05) tuft(pb, x, y, i % 3 ? '#62865a' : '#557a4e'); else if (i % 2) pebble(pb, x, y); }
  trunk(pb, 30, 72, 24); trunk(pb, 352, 58, 28); trunk(pb, 374, 190, 18);
  fern(pb, 58, 84, 14); fern(pb, 330, 74, 16, true); fern(pb, 14, 120, 12); fern(pb, 356, 206, 14, true);
  mushroom(pb, 44, 80); mushroom(pb, 48, 82); mushroom(pb, 340, 66);
  shadowEl(pb, 128, 101, 34, 5, .45);
  tent(pb, em);
  // 방랑자와 솔 (발 위치 기준)
  const W = wanRows(), S = solRows();
  const wx = 174, wy = 112, sx = 193, sy = 114;
  shadowEl(pb, wx, wy, 10, 3); shadowEl(pb, sx, sy, 7, 2);
  sprRows(pb, wx - 11, wy - W.length, W, WAN_PAL);
  sprRows(pb, sx - 6, sy - S.length, S, SOL_PAL);
  shadowEl(pb, 166, 157, 17, 3, .35); logSeat(pb, 150, 148);
  campfire(pb, 218, 138, em);
  // 빛: 어두운 비의 숲 + 모닥불 · 문 · 등불
  const lights = [[218, 132, 120, [1, .6, .3], 1.3], [126, 92, 36, [1, .7, .38], .7], [126, 73, 26, [1, .82, .5], .6]];
  const out = new PB(CW, CH), amb = [.36, .42, .58];
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = y * CW + x, u = pb.d[i], b = [u & 255, (u >>> 8) & 255, (u >>> 16) & 255];
    let L = amb.slice();
    for (const [lx, ly, lr, lc, li] of lights) { const d = Math.hypot(x - lx, (y - ly) * 1.4) / lr; if (d < 1) { const f = (1 - d) * (1 - d) * li; L[0] += lc[0] * f; L[1] += lc[1] * f; L[2] += lc[2] * f; } }
    const vx = (x - CW / 2) / (CW / 2), vy = (y - CH / 2) / (CH / 2), v = Math.hypot(vx, vy), vig = 1 - clamp((v - .62) / .55, 0, 1) * .6;
    const k = em[i] ? 1.25 : 1.12 * vig;
    out.d[i] = rgb2u(b[0] * (em[i] ? 1 : L[0]) * k, b[1] * (em[i] ? 1 : L[1]) * k, b[2] * (em[i] ? 1 : L[2]) * k);
  }
  // 연기, 비, 물웅덩이 동심원
  for (let i = 0; i < 5; i++) { const x = 145 + i * 2, y = 44 - i * 6; out.ellipse(x, y, 2 + i * .6, 1.6 + i * .4, mix('#4a5260', '#7a8290', .3 - i * .05)); }
  for (let i = 0; i < 4; i++) { const x = 220 + i * 3, y = 112 - i * 7; for (let j = -2; j <= 2; j++) out.tint(x + j, y, .25, '#c8c0b8'); }
  for (let i = 0; i < 240; i++) {
    const x = r() * (CW + 40), y = r() * CH, len = 4 + Math.floor(r() * 4), lit = Math.max(0, 1 - Math.hypot(x - 218, (y - 132) * 1.4) / 120);
    const col = mix('#8aa6c8', '#ffd8a0', lit * .8);
    for (let k = 0; k < len; k++) out.tint(Math.round(x - k * .3), Math.round(y + k), .4 + lit * .2, col);
  }
  for (const [px, py, prx, pry] of [[62, 176, 22, 7], [300, 184, 16, 6], [322, 116, 12, 5]]) for (let k = 0; k < 4; k++) { const x = Math.round(px + (r() - .5) * prx * 1.4), y = Math.round(py + (r() - .5) * pry); out.tint(x - 1, y, .5, '#9ab8d4'); out.tint(x + 1, y, .5, '#9ab8d4'); out.tint(x, y - 1, .4, '#9ab8d4'); out.tint(x, y + 1, .4, '#9ab8d4'); }
  return out;
}
