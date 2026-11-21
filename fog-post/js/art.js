'use strict';
/* =========================================================
   배경 그림 (전부 코드로 찍는 픽셀 아트)
   늦가을 안개 낀 아침의 오래된 동네
   ========================================================= */
const WOX = 100, WOY = 170, WW = 3200, WH = 600;   // 거리 레이어: 월드 x -100~3100, y -170~430
const META = { wires: [], lamps: [], neons: [], steams: [], blinks: [], laundry: [], puddles: [], trees: [], windows: [], barber: null, cat: null, bulbs: [], leavesFrom: [] };

/* ---------- 팔레트 ---------- */
const PAL = {
  brickRed: { b: ['#5d2e25', '#773c2e', '#8c4836', '#a05641', '#b4684f'], m: '#bba68f' },
  brickDark: { b: ['#47292a', '#5a3331', '#6c3e39', '#7e4a43', '#8f5b50'], m: '#8c7e72' },
  brickTan: { b: ['#6e432d', '#85543c', '#9a654a', '#ac7659', '#bd896a'], m: '#c6b69f' },
  glass: ['#33505d', '#46677a', '#5f8392', '#86a8b2', '#c9dfe0'],
  lit: ['#ffe7a6', '#f7d18a', '#eeb468', '#d8904e', '#b8703c'],
  frameW: ['#f1eee6', '#cdc8bc', '#a29c90'],
  frameA: ['#d3d8d9', '#a9b0b3', '#7f878b'],
  frameD: ['#5d6268', '#43474d', '#2e3236'],
  walk: ['#e6ddcc', '#d0c5b0', '#bcb09b', '#a69a85', '#8b806d'],
  curb: ['#cfd0cb', '#b1b4b0', '#959996', '#737777'],
  road: ['#5a5d64', '#4d5058', '#43464e', '#393c44', '#2f3139', '#25272e'],
  stone: ['#5f5c57', '#77736b', '#8f8a80', '#a6a094', '#bbb5a8'],
  moss: ['#46613a', '#5b7a45', '#749555'],
  ginkgo: ['#9c6a1f', '#c48a26', '#e2a92e', '#f3c544', '#fbe07a'],
  leafG: ['#3f5f3a', '#557a45', '#6f9453', '#8fae63'],
  soil: ['#3b2a20', '#4e382a', '#634733', '#77583f'],
  fog: '#dde5e3',
};

/* ---------- 작은 도구 ---------- */
function bevelRect(pb, x, y, w, h, c) { pb.rect(x, y, w, h, c); pb.hl(x, x + w - 1, y, lt(c, .22)); pb.hl(x, x + w - 1, y + h - 1, dk(c, .3)); pb.vl(x + w - 1, y + 1, y + h - 2, lt(c, .1)); pb.vl(x, y + 1, y + h - 2, dk(c, .14)); }
function grime(pb, x, y, w, h, lv = .5, t = .18) { pb.tintDith(x, y, w, h, t, lv); }
function dropShadow(pb, x, y, w, h) { pb.tintDith(x - 1, y + 1, w, h, .32, .55); }
function speckle(pb, r, x, y, w, h, base, n = .05) { for (let i = 0; i < w * h * n; i++) { const X = x + Math.floor(r() * w), Y = y + Math.floor(r() * h); pb.px(X, Y, r() < .55 ? dk(base, .07 + r() * .06) : lt(base, .06 + r() * .05)); } }

function wallBrick(pb, x, y, w, h, pal, seed) {
  const r = RNG(seed); pb.rect(x, y, w, h, pal.m);
  for (let row = 0, yy = y; yy < y + h; row++, yy += 3) {
    const off = (row % 2) ? 3 : 0;
    for (let xx = x - off; xx < x + w; xx += 6) {
      const a = Math.max(x, xx), b = Math.min(x + w - 1, xx + 4); if (b < a) continue;
      const k = r(); const col = k < .07 ? pal.b[0] : k < .3 ? pal.b[1] : k < .78 ? pal.b[2] : k < .95 ? pal.b[3] : pal.b[4];
      pb.rect(a, yy, b - a + 1, Math.min(2, y + h - yy), col);
      if (r() < .4) pb.px(a, yy, lt(col, .14));
      if (r() < .15) pb.px(b, yy + 1, dk(col, .18));
    }
  }
}
function wallPlaster(pb, x, y, w, h, base, seed, o = {}) {
  const r = RNG(seed); pb.rect(x, y, w, h, base);
  speckle(pb, r, x, y, w, h, base, .045);
  // 위는 하늘빛으로 살짝 밝게, 아래는 때
  pb.tintDith(x, y, w, 3, .08, .5, '#ffffff');
  grime(pb, x, y + h - 8, w, 8, .35, .12); grime(pb, x, y + h - 4, w, 4, .5, .16);
  if (o.stain) for (let i = 0; i < o.stain; i++) { const sx = x + 4 + Math.floor(r() * (w - 8)), sy = y + Math.floor(r() * h * .6), sl = 6 + Math.floor(r() * 18); for (let j = 0; j < sl; j++) { if (r() < .75) pb.tint(sx + (r() < .2 ? 1 : 0), sy + j, .14 * (1 - j / sl)); } }
  if (o.crack) for (let i = 0; i < o.crack; i++) { let cx = x + 6 + r() * (w - 12), cy = y + 6 + r() * (h - 20); const c = dk(base, .32); for (let j = 0; j < 10 + r() * 12; j++) { pb.px(cx, cy, c); cx += r() < .5 ? (r() < .5 ? -1 : 1) : 0; cy += 1; } }
  if (o.peel) for (let i = 0; i < o.peel; i++) { const px = x + 4 + Math.floor(r() * (w - 20)), py = y + 4 + Math.floor(r() * (h - 24)), pw = 8 + Math.floor(r() * 10), ph = 5 + Math.floor(r() * 6); wallBrick(pb, px, py, pw, ph, PAL.brickTan, seed + i * 7); pb.frame(px - 1, py - 1, pw + 2, ph + 2, lt(base, .1)); for (let k = 0; k < pw; k += 2) pb.tint(px + k, py + ph, .2); }
}
function wallTile(pb, x, y, w, h, base, seed) {
  const r = RNG(seed); pb.rect(x, y, w, h, base);
  for (let yy = y; yy < y + h; yy += 5) pb.hl(x, x + w - 1, yy, dk(base, .07));
  for (let yy = y, k = 0; yy < y + h; yy += 5, k++) for (let xx = x + (k % 2 ? 5 : 0); xx < x + w; xx += 10) pb.vl(xx, yy, Math.min(y + h - 1, yy + 4), dk(base, .06));
  speckle(pb, r, x, y, w, h, base, .02);
}
function wallConcrete(pb, x, y, w, h, base, seed) {
  const r = RNG(seed); pb.rect(x, y, w, h, base); speckle(pb, r, x, y, w, h, base, .05);
  for (let yy = y + 6; yy < y + h; yy += 9) { pb.hl(x, x + w - 1, yy, dk(base, .08)); for (let xx = x + 4; xx < x + w; xx += 12) pb.px(xx, yy - 3, dk(base, .22)); }
  grime(pb, x, y + h - 8, w, 8, .4, .14);
}

/* 창문 */
function win(pb, x, y, w, h, o = {}) {
  const fr = o.frame || PAL.frameW, r = o.r || Math.random;
  pb.rect(x - 1, y - 1, w + 2, h + 2, dk(o.wall || '#999999', .38));     // 벽에 파인 그늘
  pb.rect(x, y, w, h, fr[0]); pb.vl(x, y, y + h - 1, fr[1]); pb.hl(x, x + w - 1, y + h - 1, fr[1]);
  const gx = x + 1, gy = y + 1, gw = w - 2, gh = h - 2;
  if (o.lit) {
    for (let j = 0; j < gh; j++) { const t = j / gh; pb.hl(gx, gx + gw - 1, gy + j, PAL.lit[t < .2 ? 0 : t < .5 ? 1 : t < .85 ? 2 : 3]); }
    if (o.curtain !== false) { const cc = o.curtain || '#c97e62'; pb.rect(gx, gy, 2, gh, cc); pb.rect(gx + gw - 2, gy, 2, gh, cc); pb.vl(gx + 1, gy, gy + gh - 1, dk(cc, .25)); pb.vl(gx + gw - 2, gy, gy + gh - 1, dk(cc, .25)); }
    if (o.silh) { pb.rect(gx + Math.floor(gw * .35), gy + gh - 6, 3, 6, PAL.lit[4]); pb.rect(gx + Math.floor(gw * .35) - 1, gy + gh - 8, 5, 3, PAL.lit[4]); }
    META.windows.push({ x: x + w / 2, y: y + h / 2, w, h });
  } else {
    for (let j = 0; j < gh; j++) { const t = j / gh; pb.hl(gx, gx + gw - 1, gy + j, PAL.glass[t < .3 ? 0 : t < .62 ? 1 : t < .88 ? 2 : 3]); }
    // 대각선 반사
    for (let k = 0; k < 2; k++) { const s = Math.floor(gw * .55) + k * 2; for (let j = 0; j < gh; j++) { const X = gx + s - j; if (X >= gx && X < gx + gw) pb.px(X, gy + j, k ? PAL.glass[3] : PAL.glass[4]); } }
    if (o.curtain) { pb.rect(gx, gy, Math.ceil(gw * .3), gh, o.curtain); pb.vl(gx + Math.ceil(gw * .3) - 1, gy, gy + gh - 1, dk(o.curtain, .2)); }
    if (o.blinds) for (let j = gy; j < gy + Math.floor(gh * o.blinds); j += 2) pb.hl(gx, gx + gw - 1, j, '#d9d6cc');
  }
  if (gw > 7 && o.mull !== false) pb.vl(gx + Math.floor(gw / 2), gy, gy + gh - 1, fr[0]);
  if (o.transom) pb.hl(gx, gx + gw - 1, gy + Math.floor(gh / 3), fr[0]);
  // 창턱
  pb.rect(x - 2, y + h, w + 4, 1, o.sill || '#d8d1c3'); pb.tintDith(x - 2, y + h + 1, w + 4, 2, .3, .6);
  if (o.guard) {
    const gc = o.guardCol || '#3a3f45';
    pb.hl(x - 1, x + w, y - 2, gc); pb.hl(x - 1, x + w, y + h + 1, gc);
    for (let i = x; i <= x + w; i += 2) pb.vl(i, y - 2, y + h + 1, gc);
    if (o.guard === 2) { for (let i = x + 1; i < x + w; i += 4) { pb.px(i, y + 2, gc); pb.px(i + 1, y + 3, gc); pb.px(i, y + h - 3, gc); pb.px(i + 1, y + h - 4, gc); } }
  }
  if (o.plant) potPlant(pb, x + 2 + Math.floor((w - 6) * r()), y + h, o.plant);
  if (o.flowerBox) { pb.rect(x - 1, y + h - 2, w + 2, 3, '#7a5134'); pb.hl(x - 1, x + w, y + h - 2, '#966645'); for (let i = 0; i < w; i += 2) { pb.px(x + i, y + h - 3, pick(['#d9433b', '#f2c94c', '#e98fb0', '#ffffff'])); pb.px(x + i + 1, y + h - 4, '#5f8a48'); pb.px(x + i, y + h - 4, '#4a7038'); } }
}
function potPlant(pb, x, yb, kind = 1) {
  if (kind === 1) { pb.rect(x, yb - 3, 4, 3, '#b0573c'); pb.hl(x, x + 3, yb - 3, '#c96c4d'); pb.px(x + 1, yb - 4, '#5d8a46'); pb.px(x + 2, yb - 5, '#79a356'); pb.px(x, yb - 5, '#4a7038'); pb.px(x + 3, yb - 6, '#5d8a46'); pb.px(x + 1, yb - 6, '#79a356'); pb.px(x + 2, yb - 7, '#8fb865'); }
  else { pb.rect(x, yb - 3, 5, 3, '#ece8de'); pb.hl(x, x + 4, yb - 3, '#ffffff'); for (let i = 0; i < 5; i++) pb.vl(x + i, yb - 4 - (i % 2 ? 4 : 2), yb - 4, i % 2 ? '#6b9a4e' : '#88b55e'); }
}
function door(pb, x, y, w, h, col, o = {}) {
  pb.rect(x - 1, y - 1, w + 2, h + 1, dk(o.wall || '#888888', .4));
  pb.rect(x, y, w, h, col); pb.vl(x, y, y + h - 1, lt(col, .15)); pb.vl(x + w - 1, y, y + h - 1, dk(col, .25)); pb.hl(x, x + w - 1, y, dk(col, .2));
  if (o.glass) { pb.rect(x + 2, y + 2, w - 4, Math.floor(h * .45), PAL.glass[1]); pb.px(x + w - 4, y + 3, PAL.glass[4]); pb.px(x + w - 5, y + 4, PAL.glass[3]); }
  else { pb.frame(x + 2, y + 2, w - 4, Math.floor(h * .4), dk(col, .18)); pb.frame(x + 2, y + Math.floor(h * .5), w - 4, Math.floor(h * .4), dk(col, .18)); }
  pb.px(x + w - 3, y + Math.floor(h * .55), '#e8c25a'); pb.px(x + w - 3, y + Math.floor(h * .55) + 1, '#a8822f');
  pb.rect(x - 2, y + h, w + 4, 1, '#bdb7aa');
}
function sign(pb, x, y, w, h, text, bg, fg, o = {}) {
  dropShadow(pb, x, y, w, h);
  pb.rect(x, y, w, h, bg); pb.hl(x, x + w - 1, y, lt(bg, .3)); pb.hl(x, x + w - 1, y + h - 1, dk(bg, .38)); pb.vl(x, y, y + h - 1, lt(bg, .12)); pb.vl(x + w - 1, y, y + h - 1, dk(bg, .3));
  if (o.inner) pb.frame(x + 2, y + 2, w - 4, h - 4, o.inner);
  const font = o.font || F9, m = textMask(text, font);
  const tx = o.tx !== undefined ? o.tx : x + w / 2;
  pb.text(text, tx, y + Math.round((h - m.h) / 2) + (o.dy || 0), font, fg, o.tx !== undefined ? 'left' : 'center', o.shadow);
  if (o.screws !== false) { pb.px(x + 1, y + 1, lt(bg, .45)); pb.px(x + w - 2, y + 1, lt(bg, .45)); pb.px(x + 1, y + h - 2, dk(bg, .2)); pb.px(x + w - 2, y + h - 2, dk(bg, .2)); }
}
function vsign(pb, x, y, w, text, bg, fg, font = F9) {
  const chars = [...text], step = 11, h = chars.length * step + 4;
  dropShadow(pb, x, y, w, h); bevelRect(pb, x, y, w, h, bg);
  chars.forEach((ch, i) => pb.text(ch, x + w / 2, y + 2 + i * step, font, fg, 'center'));
  return h;
}
function awning(pb, x, y, w, h, c1, c2) {
  for (let i = 0; i < w; i++) {
    const col = (Math.floor(i / 4) % 2) ? c2 : c1;
    for (let j = 0; j < h; j++) pb.px(x + i, y + j, j < 2 ? dk(col, .2) : j > h - 3 ? lt(col, .1) : col);
    const k = i % 4; if (k === 1 || k === 2) pb.px(x + i, y + h, col);
  }
  pb.hl(x, x + w - 1, y, dk(c1, .45));
  pb.tintDith(x, y + h + 1, w, 4, .38, .62); pb.tintDith(x, y + h + 5, w, 3, .25, .4);
}
function acUnit(pb, x, y, o = {}) {
  dropShadow(pb, x, y, 11, 8);
  pb.rect(x, y, 11, 8, '#d3d6d1'); pb.frame(x, y, 11, 8, '#8f9590'); pb.hl(x + 1, x + 9, y + 1, '#eceee9');
  for (let i = 0; i < 3; i++) pb.vl(x + 2 + i, y + 2, y + 5, i % 2 ? '#aab0ab' : '#c3c8c3');
  pb.circle(x + 7.5, y + 4, 2.6, '#7b827d'); pb.circle(x + 7.5, y + 4, 1.4, '#a8aea9'); pb.px(x + 7, y + 3, '#5f6661'); pb.px(x + 8, y + 4, '#5f6661');
  pb.line(x + 1, y + 8, x + 3, y + 10, '#5b605d'); pb.line(x + 9, y + 8, x + 7, y + 10, '#5b605d');
  if (o.pipe) pb.vl(x + 10, y + 8, y + 8 + o.pipe, '#e7e6df');
}
function gasPipe(pb, x, y0, y1, branches = []) {
  pb.vl(x, y0, y1, '#e7c33e'); pb.vl(x + 1, y0, y1, '#b5932b');
  for (const b of branches) { pb.hl(b.x, x, b.y, '#e7c33e'); pb.hl(b.x, x, b.y + 1, '#b5932b'); if (b.meter) { pb.rect(b.x - 2, b.y - 2, 5, 6, '#9ea4a3'); pb.px(b.x - 1, b.y, '#2d3236'); pb.px(b.x, b.y, '#f0f0e8'); } }
  pb.rect(x - 1, y1 - 1, 4, 2, '#8d7330');
}
function tank(pb, x, y, w, h, col) {
  dropShadow(pb, x, y, w, h);
  for (let i = 0; i < w; i++) { const t = i / (w - 1); const c = t < .18 ? dk(col, .32) : t < .4 ? dk(col, .1) : t < .72 ? lt(col, .14) : t < .86 ? col : dk(col, .2); pb.vl(x + i, y + 1, y + h - 1, c); }
  pb.hl(x + 1, x + w - 2, y, lt(col, .32)); pb.hl(x + 1, x + w - 2, y + 1, lt(col, .18));
  pb.hl(x, x + w - 1, y + Math.floor(h * .36), dk(col, .3)); pb.hl(x, x + w - 1, y + Math.floor(h * .7), dk(col, .3));
  pb.rect(x + Math.floor(w / 2) - 1, y - 2, 3, 2, dk(col, .2));
  pb.vl(x + 1, y + h, y + h + 2, '#555a5d'); pb.vl(x + w - 2, y + h, y + h + 2, '#555a5d'); pb.hl(x, x + w - 1, y + h + 2, '#43474a');
}
function antenna(pb, x, yb, h) { pb.vl(x, yb - h, yb, '#4a4f53'); for (let i = 0; i < 3; i++) { const yy = yb - h + 2 + i * 3, ww = 7 - i * 2; pb.hl(x - ww, x + ww, yy, '#5a6064'); } }
function dish(pb, x, y) { pb.ellipse(x, y, 3.5, 4.5, '#d9dcd9'); pb.ellipse(x + .5, y, 2.4, 3.4, '#b9bdba'); pb.px(x + 3, y, '#4a4f53'); pb.line(x + 1, y, x + 4, y + 1, '#4a4f53'); pb.vl(x + 1, y + 4, y + 6, '#6a6f73'); }
function clothesline(pb, x0, x1, y, r) {
  pb.line(x0, y, x1, y + 1, '#d9d6cf'); pb.vl(x0, y, y + 8, '#6a6f73'); pb.vl(x1, y, y + 8, '#6a6f73');
  for (let x = x0 + 3; x < x1 - 4; x += 5 + Math.floor(r() * 3)) { const c = pick(['#f1efe8', '#e7b8b0', '#9ec0d6', '#f2d27a', '#ffffff']); const h = 3 + Math.floor(r() * 4); pb.rect(x, y + 1, 4, h, c); pb.vl(x + 3, y + 1, y + h, dk(c, .15)); }
}
function onggi(pb, x, yb, s = 1) {
  const w = Math.round(7 * s), h = Math.round(8 * s);
  pb.ellipse(x, yb - h / 2, w / 2, h / 2, '#4a2c1e'); pb.ellipse(x - .7, yb - h / 2 - 1, w / 2 - 1.2, h / 2 - 1.6, '#5f3a28');
  pb.px(x + Math.round(w * .18), yb - h + 2, '#9a6b4f'); pb.px(x + Math.round(w * .18), yb - h + 3, '#7d523b');
  pb.rect(x - Math.round(w * .32), yb - h - 1, Math.round(w * .64), 2, '#3a2217'); pb.hl(x - Math.round(w * .32), x + Math.round(w * .32) - 1, yb - h - 1, '#6e4630');
}
function tileRoof(pb, x, y, w, h, col, o = {}) {   // 기와 지붕 (정면)
  const over = o.over || 4;
  for (let j = 0; j < h; j++) {
    const yy = y + j, inset = Math.round((h - j) * (o.slope || .6));
    const xa = x - over + inset, xb = x + w + over - inset;
    for (let xx = xa; xx <= xb; xx++) {
      const col2 = ((xx - x) % 4 === 0) ? dk(col, .3) : (j % 3 === 0 ? lt(col, .12) : col);
      pb.px(xx, yy, col2);
    }
  }
  pb.hl(x - over - 1, x + w + over, y + h, dk(col, .45)); pb.hl(x - over, x + w + over - 1, y + h - 1, lt(col, .25));
  for (let xx = x - over; xx <= x + w + over; xx += 4) pb.px(xx, y + h, lt(col, .35));
  // 용마루
  const rx0 = x - over + Math.round(h * (o.slope || .6)), rx1 = x + w + over - Math.round(h * (o.slope || .6));
  pb.rect(rx0 - 1, y - 2, rx1 - rx0 + 3, 2, dk(col, .35)); pb.hl(rx0 - 1, rx1 + 1, y - 2, lt(col, .2));
  pb.tintDith(x - 2, y + h + 1, w + 4, 4, .35, .6);
}
function parapet(pb, x, y, w, col) { pb.rect(x - 1, y, w + 2, 2, lt(col, .3)); pb.rect(x - 1, y + 2, w + 2, 4, col); pb.hl(x - 1, x + w, y + 6, dk(col, .4)); pb.tintDith(x, y + 7, w, 2, .25, .5); }
function shopGlass(pb, x, y, w, h, o = {}) {
  const r = o.r || Math.random, fr = o.frame || PAL.frameA;
  pb.rect(x - 1, y - 1, w + 2, h + 2, fr[2]); pb.rect(x, y, w, h, fr[1]);
  const gx = x + 1, gy = y + 1, gw = w - 2, gh = h - 2;
  const inside = o.lit ? ['#8a6a48', '#7a5c3e', '#6b4f35', '#5b432e'] : ['#4b5b63', '#43525a', '#3b4950', '#344047'];
  for (let j = 0; j < gh; j++) pb.hl(gx, gx + gw - 1, gy + j, inside[Math.min(3, Math.floor(j / gh * 4))]);
  if (o.shelves) for (let s = 0; s < 3; s++) { const yy = gy + 3 + s * Math.floor((gh - 4) / 3); pb.hl(gx + 1, gx + gw - 2, yy, o.lit ? '#b8956a' : '#6f7f86'); for (let xx = gx + 2; xx < gx + gw - 2; xx += 2) if (r() < .8) { const c = pick(o.goods || ['#d9433b', '#f2c94c', '#4a8fd0', '#ffffff', '#6fbf73', '#e98fb0']); pb.px(xx, yy - 1, c); if (r() < .5) pb.px(xx, yy - 2, dk(c, .2)); } }
  if (o.mull) for (let xx = gx + o.mull; xx < gx + gw; xx += o.mull) pb.vl(xx, gy, gy + gh - 1, fr[0]);
  for (let k = 0; k < 3; k++) { const s = Math.floor(gw * (.25 + k * .3)); for (let j = 0; j < gh; j++) { const X = gx + s - Math.floor(j * .7); if (X >= gx && X < gx + gw && (j + k) % 5 !== 0) pb.tint(X, gy + j, .22, '#ffffff'); } }
  pb.hl(x - 1, x + w, y - 1, fr[0]);
  if (o.lit) META.windows.push({ x: x + w / 2, y: y + h / 2, w, h, warm: 1 });
}
function digit(pb, x, y, d, c) {
  const F = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];
  const s = F[d]; for (let i = 0; i < 15; i++) if (s[i] === '1') pb.px(x + i % 3, y + Math.floor(i / 3), c);
}
function wire(pb, x0, y0, x1, y1, sag, col = '#2b2f33', keep = true) {
  let px0 = x0, py0 = y0; const n = Math.max(8, Math.ceil(Math.abs(x1 - x0) / 3));
  for (let i = 1; i <= n; i++) { const t = i / n, x = lerp(x0, x1, t), y = lerp(y0, y1, t) + sag * 4 * t * (1 - t); pb.line(px0, py0, x, y, col); px0 = x; py0 = y; }
  if (keep) META.wires.push({ x0, y0, x1, y1, sag });
}
function wireY(w, x) { const t = (x - w.x0) / (w.x1 - w.x0); return lerp(w.y0, w.y1, t) + w.sag * 4 * t * (1 - t); }

/* 전봇대 */
function pole(pb, x, yb, top, o = {}) {
  for (let y = top; y <= yb + 2; y++) { pb.px(x, y, '#7c817f'); pb.px(x + 1, y, '#9da19e'); pb.px(x + 2, y, '#b7bab6'); pb.px(x + 3, y, '#c9ccc7'); }
  for (let y = top + 22; y < yb - 22; y += 7) pb.px(((y / 7) | 0) % 2 ? x - 1 : x + 4, y, '#454a4d');
  pb.rect(x - 11, top + 7, 26, 2, '#666b6b'); pb.hl(x - 11, x + 14, top + 7, '#8b908f');
  for (const ix of [x - 10, x - 5, x + 8, x + 13]) { pb.px(ix, top + 6, '#e9e7df'); pb.px(ix, top + 5, '#f7f5ee'); }
  if (o.trans) { const tx = x + 4, ty = top + 14; pb.rect(tx, ty, 6, 10, '#9aa09e'); pb.vl(tx + 4, ty, ty + 9, '#b9bebb'); pb.vl(tx, ty, ty + 9, '#7d8380'); pb.hl(tx, tx + 5, ty, '#c9ceca'); pb.hl(tx, tx + 5, ty + 4, '#7d8380'); }
  // 전단지
  if (o.flyer !== false) { const fy = yb - 34; pb.rect(x - 1, fy, 6, 8, '#f4f0e4'); pb.hl(x, x + 3, fy + 2, '#d0402f'); pb.hl(x, x + 4, fy + 4, '#888888'); pb.hl(x, x + 2, fy + 6, '#888888'); pb.rect(x, fy + 10, 5, 6, '#f2d27a'); pb.hl(x + 1, x + 3, fy + 12, '#5a4a2a'); }
  // 전주 번호판
  { const py = yb - 50; pb.rect(x - 1, py, 6, 7, '#f4f0e4'); pb.frame(x - 1, py, 6, 7, '#7a7f80'); pb.hl(x, x + 3, py + 2, '#3a3f44'); pb.hl(x, x + 2, py + 4, '#3a3f44'); }
  // 아래 노랑검정 띠
  for (let y = yb - 16; y < yb - 4; y++) for (let i = 0; i < 4; i++) pb.px(x + i, y, (Math.floor((y + i) / 2) % 2) ? '#e8c33e' : '#2b2b2b');
  pb.tintDith(x - 2, yb + 1, 8, 2, .3, .6);
}
function lamp(pb, x, yb, h, dir = 1) {
  pb.vl(x, yb - h, yb + 1, '#3f474c'); pb.vl(x + 1, yb - h, yb + 1, '#586166');
  pb.rect(x - 1, yb - 3, 4, 4, '#3f474c');
  for (let i = 0; i < 6; i++) pb.px(x + 1 + i * dir, yb - h - Math.round(Math.sin(i / 6 * Math.PI) * 2), '#3f474c');
  const hx = x + 6 * dir; pb.rect(hx - 3, yb - h, 7, 2, '#2f363a'); pb.hl(hx - 2, hx + 2, yb - h + 2, '#fff1c4'); pb.px(hx, yb - h + 3, '#ffe8a8');
  META.lamps.push({ x: hx + .5, y: yb - h + 3 });
}
function bench(pb, x, yb) {
  pb.rect(x, yb - 6, 18, 2, '#9a6a44'); pb.hl(x, x + 17, yb - 6, '#b98458'); pb.rect(x, yb - 11, 18, 2, '#8b5e3c'); pb.hl(x, x + 17, yb - 11, '#a87650');
  for (const lx of [x + 1, x + 15]) { pb.vl(lx, yb - 11, yb, '#3a3f44'); pb.vl(lx + 1, yb - 6, yb, '#3a3f44'); }
}
function cone(pb, x, yb) { pb.rect(x - 4, yb - 1, 9, 1, '#2b2b2b'); for (let j = 0; j < 9; j++) { const w = Math.round(1 + j * .38); const c = (j > 2 && j < 5) ? '#f2f0e8' : '#e8642e'; pb.hl(x - w, x + w, yb - 10 + j, c); pb.px(x + w, yb - 10 + j, dk(c, .2)); } }
function stool(pb, x, yb, c) { pb.rect(x, yb - 5, 6, 2, c); pb.hl(x, x + 5, yb - 5, lt(c, .25)); pb.vl(x, yb - 3, yb, dk(c, .2)); pb.vl(x + 5, yb - 3, yb, dk(c, .2)); pb.vl(x + 2, yb - 3, yb - 2, dk(c, .3)); }
function crate(pb, x, yb, fruit) { pb.rect(x, yb - 6, 12, 6, '#b88b56'); pb.hl(x, x + 11, yb - 6, '#d4a76c'); pb.hl(x, x + 11, yb - 3, '#94693d'); for (let i = 0; i < 6; i++) { pb.px(x + 1 + i * 2, yb - 7, fruit); pb.px(x + 1 + i * 2, yb - 8, i % 2 ? lt(fruit, .3) : fruit); } }
function bicycle(pb, x, yb, c = '#3f6d8f') {
  pb.ring(x + 4, yb - 4, 4, '#2b2f33'); pb.ring(x + 18, yb - 4, 4, '#2b2f33'); pb.px(x + 4, yb - 4, '#8a8f93'); pb.px(x + 18, yb - 4, '#8a8f93');
  pb.line(x + 4, yb - 4, x + 9, yb - 10, c); pb.line(x + 9, yb - 10, x + 16, yb - 10, c); pb.line(x + 11, yb - 4, x + 9, yb - 10, c); pb.line(x + 11, yb - 4, x + 16, yb - 10, c); pb.line(x + 16, yb - 10, x + 18, yb - 4, c); pb.line(x + 4, yb - 4, x + 11, yb - 4, c);
  pb.hl(x + 7, x + 10, yb - 11, '#2b2b2b'); pb.line(x + 16, yb - 10, x + 16, yb - 13, '#55595c'); pb.hl(x + 15, x + 18, yb - 13, '#2b2b2b');
  pb.rect(x + 17, yb - 13, 5, 3, '#a8784a');
}
function scooter(pb, x, yb) {
  pb.circle(x + 4, yb - 3, 3.5, '#202326'); pb.circle(x + 4, yb - 3, 1.5, '#9aa0a3'); pb.circle(x + 23, yb - 3, 3.5, '#202326'); pb.circle(x + 23, yb - 3, 1.5, '#9aa0a3');
  pb.poly([[x + 2, yb - 8], [x + 18, yb - 8], [x + 22, yb - 12], [x + 25, yb - 12], [x + 26, yb - 6], [x + 9, yb - 4], [x + 3, yb - 5]], '#c8392f');
  pb.hl(x + 3, x + 18, yb - 8, '#e05a4a'); pb.rect(x + 8, yb - 10, 9, 2, '#2b2b2b');
  pb.line(x + 22, yb - 12, x + 20, yb - 19, '#55595c'); pb.hl(x + 18, x + 22, yb - 19, '#2b2b2b'); pb.rect(x + 22, yb - 17, 3, 2, '#f7e9b0');
  bevelRect(pb, x, yb - 17, 10, 9, '#c8392f'); pb.rect(x + 2, yb - 15, 6, 4, '#f4efe6'); pb.line(x + 2, yb - 15, x + 4, yb - 13, '#c8392f'); pb.line(x + 7, yb - 15, x + 5, yb - 13, '#c8392f');
}
function mailbox(pb, x, yb) {  // 빨간 우체통
  const w = 12, h = 18, top = yb - 4 - h;
  pb.rect(x + 3, yb - 4, 6, 4, '#5a2420'); pb.hl(x + 2, x + 9, yb - 1, '#3a1714');
  for (let i = 0; i < w; i++) { const t = i / (w - 1); const c = t < .15 ? '#9e2a22' : t < .55 ? '#c9382d' : t < .8 ? '#de5546' : '#b53126'; pb.vl(x + i, top + 3, yb - 5, c); }
  pb.ellipse(x + 6, top + 3, 6, 3.4, '#c9382d'); pb.hl(x + 3, x + 9, top, '#de5546'); pb.px(x + 8, top + 1, '#f08a7a');
  pb.hl(x + 2, x + 9, top + 6, '#3a1714'); pb.hl(x + 2, x + 9, top + 7, '#e86d5e');
  pb.rect(x + 3, top + 10, 6, 4, '#f4efe6'); pb.line(x + 3, top + 10, x + 5, top + 12, '#c9382d'); pb.line(x + 8, top + 10, x + 6, top + 12, '#c9382d');
  pb.hl(x, x + w - 1, yb - 5, '#7d211b');
}
function railing(pb, x0, x1, yOff, col = '#3e5a4c') {
  for (let x = x0; x <= x1; x++) { const g = groundAt(x); if (!g) continue; const y = Math.round(g.y) - yOff; pb.px(x, y, lt(col, .2)); pb.px(x, y + 1, col); if ((x - x0) % 11 === 0) pb.vl(x, y + 1, Math.round(g.y), col); if ((x - x0) % 11 === 5) pb.px(x, y + Math.round(yOff / 2), col); }
}
function puddle(pb, x0, x1, y) { META.puddles.push({ x0, x1, y }); }

/* 나무 */
function foliage(pb, cx, cy, W, H, pal, seed, o = {}) {
  // 노이즈로 깎은 잎 덩어리: 위·오른쪽이 밝고 아래·안쪽이 어둡다
  const n = pal.length;
  for (let y = Math.floor(cy - H * 1.25); y <= Math.ceil(cy + H * 1.25); y++) for (let x = Math.floor(cx - W * 1.25); x <= Math.ceil(cx + W * 1.25); x++) {
    const dx = (x - cx) / W, dy = (y - cy) / H, d = Math.sqrt(dx * dx + dy * dy);
    const nz = fbm(x * .11, y * .11, seed, 3), nz2 = fbm(x * .35, y * .35, seed + 9, 2);
    if (d + (nz - .5) * .9 + (nz2 - .5) * .35 > (o.th || .95)) continue;
    if (o.holes && nz2 > .74 && d > .3) continue;
    let lit = .55 + dx * .3 - dy * .42 + (nz2 - .5) * .7 - d * .18;
    lit += (bay(x + pb.ox, y + pb.oy) - .5) * .22;
    pb.px(x, y, pal[clamp(Math.floor(lit * n), 0, n - 1)]);
  }
}
function ginkgo(pb, x, yb, size, seed) {
  const r = RNG(seed), top = yb - size;
  META.trees.push({ x, y: top + size * .35, w: size * .55, kind: 'ginkgo' });
  for (let y = yb; y > yb - size * .6; y--) { const t = (yb - y) / size; const xx = Math.round(x + Math.sin(t * 5) * 1.2); pb.px(xx - 1, y, '#3c2d24'); pb.px(xx, y, '#594536'); pb.px(xx + 1, y, '#6e5644'); if (t < .12) pb.px(xx + 2, y, '#3c2d24'); }
  const cx = x, cy = top + size * .4, W = size * .42, H = size * .36;
  foliage(pb, cx, cy, W, H, PAL.ginkgo, seed, { holes: true });
  foliage(pb, cx - W * .55, cy + H * .45, W * .45, H * .4, PAL.ginkgo, seed + 3);
  foliage(pb, cx + W * .6, cy + H * .35, W * .42, H * .38, PAL.ginkgo, seed + 5);
  const br = [[-.7, .5], [.65, .52], [-.35, .72], [.42, .75]];
  for (const b of br) { const ex = x + b[0] * size * .38, ey = yb - size * b[1]; for (let k = 0; k <= 8; k++) { const t = k / 8, X = lerp(x, ex, t), Y = lerp(yb - size * (b[1] - .22), ey, t); if (hash2(X | 0, Y | 0) < .55) pb.px(X, Y, '#4a3a2e'); } }
  for (let i = 0; i < 60; i++) { const a = r() * TAU, d = .9 + r() * .4; pb.px(cx + Math.cos(a) * W * d, cy + Math.sin(a) * H * d + r() * 6, PAL.ginkgo[1 + Math.floor(r() * 4)]); }
  META.leavesFrom.push({ x0: cx - W, x1: cx + W, y: cy, kind: 'ginkgo' });
}
function persimmon(pb, x, yb, size, seed) {
  const r = RNG(seed), cy = yb - size * .62;
  META.trees.push({ x, y: cy, w: size * .5, kind: 'persimmon' });
  for (let y = yb; y > yb - size * .5; y--) { pb.px(x - 2, y, '#2f2219'); pb.px(x - 1, y, '#3a2a22'); pb.px(x, y, '#514034'); pb.px(x + 1, y, '#5f4c3e'); pb.px(x + 2, y, '#3a2a22'); }
  const ends = [];
  for (let i = 0; i < 14; i++) {
    let bx = x, by = yb - size * (.4 + r() * .1); const a0 = -Math.PI / 2 + (i - 6.5) * .22 + (r() - .5) * .2;
    for (let k = 0; k < 4; k++) { const a = a0 + (r() - .5) * .5, l = size * (.1 + r() * .08); const nx = bx + Math.cos(a) * l, ny = by + Math.sin(a) * l; pb.line(bx, by, nx, ny, k < 2 ? '#3f2f26' : '#5a473a'); bx = nx; by = ny; if (k > 1) ends.push([bx, by]); }
  }
  for (const e of ends) foliage(pb, e[0], e[1], 4 + r() * 3, 3 + r() * 2, ['#7a4a1e', '#a8622a', '#c9842e', '#dea446'], seed + Math.floor(e[0]), { th: .8 });
  for (const e of ends) if (r() < .8) { const fx = Math.round(e[0] + (r() - .5) * 4), fy = Math.round(e[1] + 1 + r() * 3); pb.rect(fx, fy, 2, 2, '#e8702a'); pb.px(fx, fy, '#ffa45c'); pb.px(fx + 1, fy + 1, '#b9521f'); pb.px(fx, fy - 1, '#3f5a2a'); }
}
function willow(pb, x, yb, seed) {
  const r = RNG(seed);
  for (let y = yb; y > yb - 46; y--) { const xx = Math.round(x + (yb - y) * .12); pb.px(xx, y, '#3c3128'); pb.px(xx + 1, y, '#56473a'); pb.px(xx + 2, y, '#3c3128'); }
  for (let i = 0; i < 26; i++) {
    const sx = x + 4 + (r() - .3) * 44, sy = yb - 44 + r() * 10, len = 14 + r() * 30; const c = pick(['#7f9f4f', '#98b55e', '#6a8a42', '#b3c36d']);
    for (let j = 0; j < len; j++) { const X = Math.round(sx + Math.sin(j * .12 + i) * 1.2 + j * .15), Y = Math.round(sy + j); if (j % 3 !== 2) pb.px(X, Y, j < 3 ? lt(c, .2) : c); }
  }
  pb.line(x + 2, yb - 40, x + 20, yb - 48, '#4a3d32'); pb.line(x + 2, yb - 36, x - 10, yb - 44, '#4a3d32');
}
function reeds(pb, x0, x1, yb, seed) {
  const r = RNG(seed);
  for (let x = x0; x < x1; x += 1 + Math.floor(r() * 2)) { const h = 8 + Math.floor(r() * 14), c = pick(['#8a8a4a', '#a39a58', '#6f7a3e', '#b9a96a']); for (let j = 0; j < h; j++) pb.px(x + Math.round(Math.sin(j * .3) * .6), yb - j, j > h - 3 ? lt(c, .2) : c); if (r() < .35) { pb.vl(x, yb - h - 3, yb - h, '#7a5a3a'); pb.px(x, yb - h - 4, '#9a7a52'); } }
}

/* ---------- 하늘 ---------- */
function buildSky() {
  const pb = new PB(VW, VH);
  const stops = [[0, '#7c9fb6'], [.25, '#a2bccb'], [.48, '#c9d6d4'], [.66, '#e6dcc7'], [.8, '#f1d8b4'], [1, '#f3cfa6']];
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    const t = y / VH; let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
    const a = stops[i], b = stops[i + 1], f = (t - a[0]) / (b[0] - a[0]);
    pb.d[y * VW + x] = C(bay(x, y) < f ? b[1] : a[1]);
  }
  // 해
  const sx = 372, sy = 62;
  for (let y = sy - 40; y <= sy + 40; y++) for (let x = sx - 40; x <= sx + 40; x++) {
    const d = Math.hypot(x - sx, y - sy);
    if (d < 13) pb.px(x, y, d < 11 ? '#fffaea' : '#fff3d2');
    else if (d < 19 && bay(x, y) < .55) pb.px(x, y, '#fbecc8');
    else if (d < 28 && bay(x, y) < .25) pb.px(x, y, '#f6e3c0');
    else if (d < 38 && bay(x, y) < .08) pb.px(x, y, '#f2ddba');
  }
  return pb.canvas();
}
function buildClouds() {
  const out = [];
  for (let k = 0; k < 5; k++) {
    const r = RNG(40 + k), w = 50 + Math.floor(r() * 70), h = 16 + Math.floor(r() * 10), pb = new PB(w + 4, h + 4);
    const blobs = []; for (let i = 0; i < 7; i++) blobs.push([6 + r() * (w - 12), h * .55 + (r() - .5) * h * .3, 4 + r() * (h * .45)]);
    for (let y = 0; y < h + 4; y++) for (let x = 0; x < w + 4; x++) {
      let inside = false, top = 1; for (const b of blobs) { const d = Math.hypot(x - b[0], (y - b[1]) * 1.4); if (d < b[2]) { inside = true; top = Math.min(top, (y - (b[1] - b[2] / 1.4)) / (b[2] * 1.4)); } }
      if (!inside || y > h * .8) continue;
      pb.px(x, y, top < .25 ? '#fbf3e4' : (top < .55 ? (bay(x, y) < .5 ? '#f1e7d6' : '#fbf3e4') : '#e3d9c9'));
    }
    out.push(pb.canvas());
  }
  return out;
}

/* ---------- 먼 배경: 산과 아파트 ---------- */
function buildFar() {
  const W = 920, H = 270, pb = new PB(W, H), r = RNG(7);
  const ridge = (x, base, amp, s) => base - fbm(x * .006, s, s, 4) * amp - Math.sin(x * .004 + s) * amp * .25;
  for (let x = 0; x < W; x++) { const y1 = Math.round(ridge(x, 160, 70, 3)); for (let y = y1; y < H; y++) pb.px(x, y, bay(x, y) < .1 ? '#a9bcc1' : '#b4c5c9'); pb.px(x, y1, '#c3d1d3'); }
  for (let x = 0; x < W; x++) { const y1 = Math.round(ridge(x, 182, 60, 11)); for (let y = y1; y < H; y++) { const tex = fbm(x * .15, y * .2, 5, 2); pb.px(x, y, tex > .58 ? '#94aab0' : (tex < .38 ? '#a8bbc0' : '#9fb3b8')); } pb.px(x, y1, '#b9c8cb'); }
  // 송신탑
  { const tx = 640, ty = Math.round(ridge(tx, 182, 60, 11)); pb.line(tx - 4, ty, tx, ty - 26, '#8197a0'); pb.line(tx + 4, ty, tx, ty - 26, '#8197a0'); for (let i = 0; i < 4; i++) pb.hl(tx - 3 + i, tx + 3 - i, ty - 6 - i * 5, '#8197a0'); pb.px(tx, ty - 28, '#d9604a'); }
  // 아파트 단지
  let num = 101;
  for (let x = 12; x < W - 40; x += 46 + Math.floor(r() * 30)) {
    const w = 30 + Math.floor(r() * 14), h = 50 + Math.floor(r() * 44), base = 214, top = base - h;
    for (let y = top; y < base + 30; y++) for (let i = 0; i < w; i++) pb.px(x + i, y, i > w - 4 ? '#a5b6bb' : '#bccbcd');
    pb.hl(x, x + w - 1, top, '#cfdad9');
    for (let y = top + 9; y < base; y += 4) for (let i = 2; i < w - 4; i += 3) pb.px(x + i, y, r() < .1 ? '#e8dcbc' : '#a3b4b8');
    digit(pb, x + 3, top + 2, Math.floor(num / 100), '#8ea2a8'); digit(pb, x + 7, top + 2, Math.floor(num / 10) % 10, '#8ea2a8'); digit(pb, x + 11, top + 2, num % 10, '#8ea2a8'); num++;
    pb.rect(x + w - 10, top - 4, 6, 4, '#b0c0c3');
  }
  for (let x = 0; x < W; x += 6 + Math.floor(r() * 10)) { const w = 6 + Math.floor(r() * 12), h = 8 + Math.floor(r() * 18); pb.rect(x, 222 - h, w, h + 50, r() < .5 ? '#aabbbf' : '#b2c2c5'); pb.hl(x, x + w - 1, 222 - h, '#c4d1d2'); }
  // 안개로 감싸기
  for (let y = 0; y < H; y++) { const f = clamp((y - 150) / 90, 0, 1) * .55; if (f <= 0) continue; for (let x = 0; x < W; x++) if (bay(x, y) < f) { if (pb.get(x, y) >>> 24) pb.px(x, y, PAL.fog); } }
  return { cv: pb.canvas(), f: .12, fy: .05, y0: 0 };
}

/* ---------- 중간 배경: 언덕 동네, 목욕탕 굴뚝, 돌다리, 크레인 ---------- */
function buildMid() {
  const W = 1560, H = 300, pb = new PB(W, H), r = RNG(21);
  const hill = x => 120 + fbm(x * .004, 1, 9, 3) * 70 + Math.sin(x * .006) * 18 - (x > 660 && x < 860 ? -40 * Math.sin((x - 660) / 200 * Math.PI) : 0);
  const fogT = c => mix(c, '#c9d5d4', .42);
  // 언덕 바탕
  for (let x = 0; x < W; x++) { const y1 = Math.round(hill(x)); for (let y = y1; y < H; y++) pb.px(x, y, fogT(y < y1 + 2 ? '#7e9481' : (bay(x, y) < .15 ? '#6b8270' : '#738a77'))); }
  // 집들
  const roofs = ['#4f7fa8', '#b5523f', '#5f9a6a', '#e9e3d6', '#c9a24a', '#7a8a96'];
  const walls = ['#ece2cf', '#e4c9bf', '#cfe0d6', '#d6dfe8', '#efe3b8', '#e8e8e2'];
  for (let row = 0; row < 12; row++) {
    const yb = 262 - row * 13;
    for (let x = 4 + (row % 2) * 9; x < W - 20; x += 15 + Math.floor(r() * 14)) {
      if (x > 690 && x < 840 && yb > 200) continue;        // 다리 자리 비우기
      if (yb - 14 < hill(x + 8) - 4) continue;
      if (r() < .12) { // 나무
        const c = r() < .5 ? PAL.ginkgo[3] : '#4f7a52'; pb.circle(x + 6, yb - 8, 5 + r() * 2, fogT(c)); pb.circle(x + 8, yb - 10, 3, fogT(lt(c, .2))); continue;
      }
      const w = 12 + Math.floor(r() * 12), h = 9 + Math.floor(r() * 7), wc = fogT(pick(walls)), rc = fogT(pick(roofs));
      pb.rect(x, yb - h, w, h, wc); pb.vl(x + w - 1, yb - h, yb - 1, dk(wc, .12));
      if (r() < .45) { pb.poly([[x - 2, yb - h], [x + w / 2, yb - h - 5], [x + w + 2, yb - h]], rc); pb.hl(x - 2, x + w + 1, yb - h, dk(rc, .25)); }
      else { pb.rect(x - 1, yb - h - 2, w + 2, 2, rc); if (r() < .5) { const tc = fogT(pick(['#3f8f6b', '#3b78a8', '#d9b84a'])); pb.rect(x + 2 + Math.floor(r() * (w - 6)), yb - h - 6, 4, 4, tc); pb.hl(x + 2, x + 2, yb - h - 6, lt(tc, .2)); } }
      for (let wx = x + 2; wx < x + w - 3; wx += 5) { const lit = r() < .14; pb.rect(wx, yb - h + 3, 2, 3, fogT(lit ? '#f2c46d' : '#50646c')); }
      if (r() < .3) pb.rect(x + 2, yb - 5, 3, 5, fogT('#6d5a4a'));
    }
    // 계단 골목
    if (row % 3 === 1) { const sx = 60 + Math.floor(r() * (W - 120)); for (let k = 0; k < 12; k++) pb.px(sx + k, yb - k, fogT('#d9d2c2')); }
  }
  // 목욕탕 굴뚝
  { const cx = 440, top = 66, base = 230; for (let y = top; y < base; y++) for (let i = 0; i < 9; i++) { const c = i < 2 ? '#7e4b3a' : i < 6 ? '#9a5d47' : '#874f3d'; pb.px(cx + i, y, fogT(((y >> 1) % 2 && i === 4) ? dk(c, .15) : c)); } pb.rect(cx - 1, top - 3, 11, 3, fogT('#5e3a2e')); ['목', '욕', '탕'].forEach((ch, i) => pb.text(ch, cx + 4.5, top + 10 + i * 11, F9, fogT('#f4efe6'), 'center')); pb.hl(cx, cx + 8, top + 46, fogT('#f4efe6')); META.chimney = { x: cx + 4, y: top - 3, layer: 'mid' }; }
  // 타워 크레인 (공사장 뒤)
  { const mx = 560, base = 214, top = 40; for (let y = top; y < base; y++) { pb.px(mx, y, fogT('#c99a3a')); pb.px(mx + 5, y, fogT('#c99a3a')); if ((y - top) % 6 === 0) pb.hl(mx, mx + 5, y, fogT('#c99a3a')); if ((y - top) % 6 < 6) pb.px(mx + ((y - top) % 6), y, fogT('#b5882f')); }
    pb.hl(mx - 40, mx + 70, top, fogT('#c99a3a')); pb.hl(mx - 40, mx + 70, top + 4, fogT('#c99a3a')); for (let x = mx - 40; x < mx + 70; x += 4) pb.line(x, top, x + 4, top + 4, fogT('#b5882f'));
    pb.rect(mx - 40, top + 4, 12, 7, fogT('#8a8f93')); pb.rect(mx - 2, top - 8, 10, 8, fogT('#d9b04a')); pb.line(mx + 2, top - 8, mx - 38, top, fogT('#6a6f73')); pb.line(mx + 2, top - 8, mx + 68, top, fogT('#6a6f73'));
    pb.vl(mx + 50, top + 4, top + 60, fogT('#55595c')); pb.rect(mx + 48, top + 60, 5, 3, fogT('#d9b04a')); pb.px(mx + 2, top - 10, '#e8644a'); META.craneLight = { x: mx + 2, y: top - 10 }; }
  // 아래 안개
  for (let y = 0; y < H; y++) { const f = clamp((y - 196) / 60, 0, 1) * .8; if (f <= 0) continue; for (let x = 0; x < W; x++) if (bay(x, y) < f && (pb.get(x, y) >>> 24)) pb.px(x, y, '#d7e0de'); }
  // 돌다리 (개천 자리, 안개 위에 다시 그림)
  { const x0 = 676, x1 = 856, yT = 206; const cxm = (x0 + x1) / 2;
    // 다리 상판과 아치
    for (let x = x0; x <= x1; x++) for (let y = yT; y < 250; y++) {
      const t = (x - cxm) / ((x1 - x0) / 2 - 6); const archInner = 250 - Math.sqrt(Math.max(0, 1 - t * t)) * 36;
      if (y > archInner && Math.abs(t) < 1) continue;
      const brick = ((y - yT) % 5 === 0) || ((x + ((((y - yT) / 5) | 0) % 2) * 4) % 8 === 0);
      pb.px(x, y, fogT(brick ? '#8f8a80' : (y < yT + 3 ? '#c9c2b4' : '#aca598')));
    }
    for (let x = x0; x <= x1; x += 3) { pb.vl(x, yT - 6, yT - 1, fogT('#9a948a')); } pb.hl(x0, x1, yT - 7, fogT('#b9b2a5')); pb.hl(x0, x1, yT - 6, fogT('#8f8a80'));
    for (const lx of [x0 + 10, cxm, x1 - 10]) { pb.vl(lx, yT - 22, yT - 7, fogT('#4a5256')); pb.rect(lx - 2, yT - 26, 5, 4, fogT('#4a5256')); pb.px(lx, yT - 23, '#ffe8a8'); META.lamps.push({ x: lx + .5, y: yT - 23, layer: 'mid' }); }
    // 다리 아래 먼 물
    for (let y = 236; y < 252; y++) for (let x = x0 - 30; x < x1 + 30; x++) { if (pb.get(x, y) >>> 24 && !(y > 236 && Math.abs(x - cxm) < (x1 - x0) / 2 - 8)) continue; pb.px(x, y, fogT(((x + y * 3) % 11 === 0) ? '#cfe3e6' : (y < 240 ? '#8fb4bd' : '#7aa1ab'))); }
  }
  for (let x = 640; x < 900; x++) for (let y = 196; y < 262; y++) if (bay(x, y) < clamp((y - 214) / 50, 0, .7) && (pb.get(x, y) >>> 24)) pb.px(x, y, '#d7e0de');
  return { cv: pb.canvas(), f: .36, fy: .2, y0: -40 };
}

/* ---------- 한국 거리 소품 ---------- */
function stairHouse(pb, x, y, w, h) {   // 옥상 계단실
  wallConcrete(pb, x, y, w, h, '#cbc6ba', x * 7 + y); pb.rect(x - 1, y - 2, w + 2, 2, '#4f9a6a'); pb.hl(x - 1, x + w, y - 2, '#6fbf85');
  door(pb, x + 3, y + h - 12, 7, 12, '#6f8f8a', { wall: '#cbc6ba' }); pb.rect(x + w - 8, y + 3, 5, 4, '#7d8387'); for (let i = 0; i < 3; i++) pb.hl(x + w - 7, x + w - 5, y + 4 + i, '#5a6064');
}
function addrPlate(pb, x, y, num) {     // 파란 도로명주소판
  const s = String(num), w = s.length * 4 + 5;
  pb.rect(x, y, w, 8, '#2c5aa0'); pb.frame(x, y, w, 8, '#e8eef6'); pb.hl(x + 1, x + w - 2, y + 1, '#3d6db8');
  for (let i = 0; i < s.length; i++) digit(pb, x + 3 + i * 4, y + 2, +s[i], '#ffffff');
  pb.tintDith(x - 1, y + 8, w, 1, .3, .6);
}
function glassText(pb, cx, y, text, col = '#ffffff') { pb.text(text, cx, y, F7, col, 'center', '#3a4a52'); }
function banner(pb, x0, x1, y, text, bg, fg) {   // 현수막
  const h = 11; pb.line(x0 - 6, y - 4, x0, y, '#d9d6cf'); pb.line(x1 + 6, y - 4, x1, y, '#d9d6cf'); pb.line(x0 - 6, y + h + 4, x0, y + h, '#d9d6cf'); pb.line(x1 + 6, y + h + 4, x1, y + h, '#d9d6cf');
  for (let x = x0; x <= x1; x++) { const sag = Math.round(Math.sin((x - x0) / (x1 - x0) * Math.PI) * 1.5); for (let j = 0; j < h; j++) pb.px(x, y + j + sag, j === 0 ? lt(bg, .2) : (j === h - 1 ? dk(bg, .18) : bg)); }
  for (let x = x0; x <= x1; x += 18) pb.vl(x, y + 1, y + h - 2, dk(bg, .06));
  pb.text(text, (x0 + x1) / 2, y + 1, F9, fg, 'center');
}
function exerciseGym(pb, x, yb) {       // 동네 야외 운동기구: 허리돌리기 + 윗몸일으키기
  const Y = '#e8b33a', G2 = '#3f9a5a';
  pb.vl(x, yb - 22, yb, Y); pb.vl(x + 1, yb - 22, yb, dk(Y, .2)); pb.vl(x + 16, yb - 22, yb, Y); pb.vl(x + 17, yb - 22, yb, dk(Y, .2)); pb.hl(x, x + 17, yb - 22, lt(Y, .2)); pb.hl(x, x + 17, yb - 21, Y);
  pb.rect(x + 4, yb - 17, 10, 2, G2); pb.px(x + 4, yb - 16, '#2b2b2b'); pb.px(x + 13, yb - 16, '#2b2b2b');
  pb.ellipse(x + 9, yb - 2, 6, 1.6, G2); pb.hl(x + 4, x + 14, yb - 3, lt(G2, .25)); pb.vl(x + 9, yb - 2, yb, '#5a6064');
  const bx = x + 24; pb.line(bx, yb - 3, bx + 18, yb - 10, '#d9433b'); pb.line(bx, yb - 2, bx + 18, yb - 9, '#a8302a'); pb.vl(bx + 1, yb - 3, yb, '#5a6064'); pb.vl(bx + 17, yb - 9, yb, '#5a6064'); pb.rect(bx + 16, yb - 13, 3, 3, Y);
}
function wheel(pb, x, y, r) { pb.circle(x, y, r, '#1c1f22'); pb.circle(x, y, r * .5, '#8a9094'); pb.px(x - 1, y - 1, '#c9cfd2'); }
function truck(pb, x, y) {              // 파란 1톤 트럭 (도로 위)
  const B = '#2f63b8';
  pb.rect(x + 34, y - 15, 15, 12, B); pb.hl(x + 34, x + 47, y - 15, lt(B, .3)); pb.rect(x + 46, y - 7, 4, 4, dk(B, .2));
  pb.rect(x + 36, y - 13, 9, 5, '#9fc4dc'); pb.px(x + 43, y - 12, '#e6f2f8'); pb.px(x + 42, y - 11, '#e6f2f8'); pb.rect(x + 48, y - 8, 2, 2, '#ffe9a8');
  pb.rect(x, y - 6, 34, 3, '#7d8387'); pb.hl(x, x + 33, y - 6, '#a2a8ac'); pb.rect(x, y - 9, 1, 3, '#7d8387'); pb.rect(x + 33, y - 9, 1, 3, '#7d8387');
  for (let i = 0; i < 4; i++) { const cx = x + 2 + i * 8; pb.rect(cx, y - 13, 7, 7, '#c49a62'); pb.hl(cx, cx + 6, y - 13, '#ddb57c'); pb.vl(cx + 3, y - 13, y - 7, '#e9dcc0'); }
  pb.rect(x + 3, y - 18, 6, 5, '#c49a62'); pb.hl(x + 3, x + 8, y - 18, '#ddb57c');
  pb.rect(x - 1, y - 3, 52, 2, '#3a3f44'); wheel(pb, x + 8, y, 3.5); wheel(pb, x + 41, y, 3.5);
  pb.tintDith(x - 2, y + 2, 56, 2, .35, .6);
}
function compactCar(pb, x, y, col = '#e9ecef') {   // 경차 (도로 위)
  pb.poly([[x, y - 3], [x + 2, y - 9], [x + 8, y - 15], [x + 24, y - 15], [x + 30, y - 9], [x + 34, y - 7], [x + 34, y - 3]], col);
  pb.hl(x + 8, x + 24, y - 15, lt(col, .3)); pb.poly([[x + 9, y - 13], [x + 15, y - 13], [x + 15, y - 9], [x + 5, y - 9]], '#7fa3b8'); pb.poly([[x + 17, y - 13], [x + 23, y - 13], [x + 28, y - 9], [x + 17, y - 9]], '#7fa3b8');
  pb.px(x + 21, y - 12, '#e6f2f8'); pb.hl(x + 1, x + 33, y - 6, dk(col, .15)); pb.rect(x + 32, y - 8, 2, 2, '#ffe9a8'); pb.rect(x, y - 7, 2, 2, '#d9433b');
  wheel(pb, x + 7, y - 1, 3.2); wheel(pb, x + 27, y - 1, 3.2); pb.tintDith(x - 1, y + 2, 37, 2, .35, .6);
}
function deliveryBike(pb, x, y) {       // 배달 오토바이
  wheel(pb, x + 3, y - 1, 3); wheel(pb, x + 19, y - 1, 3);
  pb.poly([[x + 4, y - 6], [x + 15, y - 6], [x + 18, y - 9], [x + 20, y - 9], [x + 20, y - 4], [x + 6, y - 3]], '#2b2f33'); pb.rect(x + 7, y - 8, 8, 2, '#1c1f22');
  pb.line(x + 18, y - 9, x + 17, y - 14, '#55595c'); pb.hl(x + 15, x + 19, y - 14, '#2b2b2b');
  bevelRect(pb, x, y - 16, 10, 8, '#c8392f'); pb.text('배달', x + 5, y - 15, F7, '#ffffff', 'center');
}
function trashBags(pb, x, yb) {         // 종량제 봉투
  const bag = (cx, w, h) => { pb.ellipse(cx, yb - h / 2, w / 2, h / 2, '#e9ecef'); pb.ellipse(cx + 1, yb - h / 2 + 1, w / 2 - 1, h / 2 - 1.5, '#d6dadd'); pb.hl(cx - w / 2 + 2, cx + w / 2 - 2, yb - h / 2, '#5f8fc9'); pb.px(cx, yb - h, '#e9ecef'); pb.px(cx - 1, yb - h - 1, '#d6dadd'); pb.px(cx + 1, yb - h - 1, '#d6dadd'); };
  bag(x + 4, 8, 8); bag(x + 11, 9, 10); bag(x + 7, 7, 6);
  pb.rect(x + 16, yb - 10, 8, 10, '#3f7fbf'); pb.hl(x + 16, x + 23, yb - 10, '#6aa6d9'); pb.rect(x + 18, yb - 7, 4, 3, '#f4efe6');
}
function convexMirror(pb, x, yb) {      // 골목 반사경
  pb.vl(x, yb - 52, yb, '#7a8084'); pb.vl(x + 1, yb - 52, yb, '#9aa0a4');
  const cx = x + 1, cy = yb - 58; pb.circle(cx, cy, 7, '#e8642e'); pb.circle(cx, cy, 5.6, '#bcd2dc'); pb.ellipse(cx - 1.5, cy - 1.5, 2.6, 1.8, '#eef6f8'); pb.hl(cx - 4, cx + 3, cy + 2, '#8fa8b4'); pb.px(cx + 2, cy + 3, '#c8392f');
  pb.rect(cx - 7, yb - 45, 15, 7, '#f2c94c'); pb.text('천천히', cx, yb - 45, F7, '#2b2b2b', 'center');
}
function cctv(pb, x, y) {
  pb.hl(x, x + 7, y, '#5a6064'); pb.rect(x + 6, y - 2, 7, 4, '#d9dcd9'); pb.px(x + 12, y - 1, '#2b2f33'); pb.px(x + 12, y, '#5fd07a');
  pb.rect(x - 4, y + 6, 18, 8, '#f2c94c'); pb.frame(x - 4, y + 6, 18, 8, '#2b2b2b'); pb.text('CCTV', x + 5, y + 6, F7, '#2b2b2b', 'center');
}
