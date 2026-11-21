'use strict';
/* =========================================================
   캐릭터: 비둘기 선배, 고양이, 오리, 비둘기, 물고기 (수달은 otter.js)
   관절(타원·캡슐·사각형·다각형) → 명암·가장자리 빛·외곽선
   ========================================================= */
/* ---------- 비둘기 선배 ---------- */
const PGK = { body: ['#47505b', '#66707c', '#8994a0', '#b0bac4'], wing: ['#3e4650', '#59626d', '#77818c', '#9aa4ae'], neck: ['#2c4743', '#3f6a5e', '#5a8f78', '#86b59a'], head: ['#5b6571', '#7d8894', '#a2acb7', '#c6ced6'], leg: ['#a5524a', '#cf7466', '#e89a8a'] };
function pigeonRig(R, s) {
  const bob = s.bob || 0, talk = s.talk && (Math.floor(s.t * 8) % 2 === 0);
  R.P([[-4, -5.2], [-9, -3.8], [-8.6, -2.6], [-3.4, -3.4]], PGK.wing, { flat: 1 });
  R.K2(.2, -3, .4, 0, .7, .6, PGK.leg); R.K2(1.8, -3, 2.2, 0, .7, .6, PGK.leg);
  R.E(0, -6.4, 5, 4.1, -.15, PGK.body);
  R.E(-1.2, -6.6, 3.8, 2.6, -.12, PGK.wing); R.DL(-3.6, -6.2, -.6, -5.6, '#363c45'); R.DL(-3.2, -4.8, -.2, -4.4, '#363c45');
  R.E(2.4 + bob * .4, -9.4, 2.6, 2.3 + (s.puff ? .5 : 0), 0, PGK.neck); R.D(1.6 + bob * .4, -8.6, '#8a6aa8'); R.D(3 + bob * .4, -8.2, '#7a5a98');
  const hx = 3.4 + bob, hy = -12.2;
  R.E(hx, hy, 2.9, 2.7, 0, PGK.head);
  R.P([[hx - 2.8, hy - 1.6], [hx - 2.2, hy - 3.6], [hx, hy - 4.4], [hx + 2, hy - 3.6], [hx + 2.6, hy - 1.8]], OTK.cap);
  R.P([[hx + 1.8, hy - 2], [hx + 5, hy - 1.6], [hx + 4.8, hy - 1], [hx + 1.6, hy - 1.4]], OTK.cap, { flat: 1 });
  R.D(hx + .3, hy - 3.3, '#f2c450');
  R.D(hx + 1, hy, '#111111'); R.D(hx + .2, hy, '#e88b3a');
  R.D(hx + 2.8, hy + .2, '#3a3330'); R.D(hx + 3.6, hy + .4, '#3a3330'); R.D(hx + 2.6, hy - .6, '#e6e1d8');
  if (talk) R.D(hx + 3, hy + 1.2, '#3a3330');
}
const PGB = new PB(40, 36), PGC = makeCanvas(40, 36)[0];
function drawPigeonSenior(g, x, y, face, s) {
  RIG.reset(face, 20, 30); pigeonRig(RIG, s);
  rasterRig(PGB, RIG, { outline: '#1c1f24', rim: 30 }); pbToCanvas(PGB, PGC); g.drawImage(PGC, Math.round(x) - 20, Math.round(y) - 30);
}
function pigeonPortrait() {
  const pb = new PB(40, 40), R = RIG.reset(1, 20, 40);
  R.E(-2, -4, 15, 10, -.1, PGK.body); R.E(-7, -2, 9, 6, -.15, PGK.wing); R.DL(-14, -2, -4, 0, '#363c45'); R.DL(-13, 2, -3, 3, '#363c45');
  R.E(2, -12, 8, 6.4, 0, PGK.neck); R.D(-1, -9, '#8a6aa8'); R.D(0, -8, '#8a6aa8'); R.D(4, -9, '#7a5a98'); R.D(6, -10, '#8a6aa8');
  R.E(4, -22, 9, 8.4, 0, PGK.head);
  R.P([[-4.6, -26], [-3.4, -31.6], [3, -34.4], [9.6, -32], [12.4, -26.4], [3.6, -25]], OTK.cap); R.P([[9.4, -27.2], [18.6, -25.8], [18, -23.8], [9, -25.2]], OTK.cap, { flat: 1 }); R.DL(-4.4, -26.4, 12, -27, '#142538'); R.D(3.4, -31, '#f2c450'); R.D(4.4, -31, '#ffe48a'); R.D(3.4, -30, '#d9a23a');
  R.E(8, -21.6, 2.6, 2.6, 0, ['#b8601e', '#e88b3a', '#f6b06a']); R.D(8.4, -21.6, '#111111'); R.D(8.4, -20.6, '#111111'); R.D(7.4, -22.6, '#ffffff');
  R.P([[12.6, -20.6], [18.4, -18.8], [12.6, -17.4]], ['#2a2420', '#3a3330', '#5a504a'], { flat: 1 }); R.E(12.8, -21.4, 1.8, 1.2, 0, ['#cfc8bc', '#e6e1d8', '#f6f2ea']);
  R.DL(1.6, -24.6, 6, -25.4, '#4a525c');
  rasterRig(pb, R, { outline: '#1c1f24', rim: 40 }); return pb.canvas();
}
/* ---------- 고양이 (담장 위) ---------- */
const CTK = { fur: ['#7a3c18', '#a85626', '#d1772f', '#ec9a4c', '#f8bf78'], white: ['#c9bba6', '#e6dccb', '#fbf5ea'], tail: ['#7a3c18', '#a85626', '#d1772f', '#ec9a4c'] };
const CTB = new PB(32, 30), CTC = makeCanvas(32, 30)[0];
function drawCat(g, x, y, s) {
  const R = RIG.reset(s.face, 16, 27), t = s.t, sw = Math.sin(t * 1.6) * 2.2;
  tailChain(R, [[-3, -1.6], [-6.4, -1 + sw * .2], [-8.6, -3.4 + sw * .6], [-9.2, -7 + sw]], [1.8, 1.5, 1.2, .9], CTK.tail);
  R.E(0, -5, 4.4, 5.2, 0, CTK.fur); R.E(2, -4.6, 2.2, 3.6, 0, CTK.white);
  R.K2(2.4, -3, 2.6, 0, 1.1, 1, CTK.white); R.K2(.4, -3, .4, 0, 1.1, 1, CTK.fur);
  R.DL(-3.4, -7, -1.8, -6.6, '#8a4418'); R.DL(-3.8, -4.6, -2, -4.2, '#8a4418');
  const turn = s.look || 0, hx = 1.2 + turn * .8, hy = -11.4;
  R.P([[hx - 3.4, hy - 1.4], [hx - 3, hy - 5.2], [hx - .9, hy - 2.6]], CTK.fur, { flat: 2 }); R.P([[hx + 3.4, hy - 1.4], [hx + 3, hy - 5.2], [hx + .9, hy - 2.6]], CTK.fur, { flat: 3 });
  R.E(hx, hy, 3.8, 3.3, 0, CTK.fur); R.E(hx + turn * .6, hy + 1.2, 2, 1.4, 0, CTK.white);
  R.DL(hx - 1, hy - 3, hx + 1, hy - 3, '#8a4418');
  const blink = s.blink;
  for (const ex of [hx - 1.6 + turn, hx + 1.6 + turn]) { if (blink) R.D(ex, hy - .4, '#3a2a1a'); else { R.D(ex, hy - .8, '#9fe07a'); R.D(ex, hy, '#2a3a1a'); } }
  R.D(hx + turn * 1.1, hy + .8, '#e88a8a');
  rasterRig(CTB, R, { outline: '#24140c', rim: 27 }); pbToCanvas(CTB, CTC); g.drawImage(CTC, Math.round(x) - 16, Math.round(y) - 27);
}

/* ---------- 오리 · 비둘기 (미리 구워 둠) ---------- */
function bakeSprites() {
  const out = {};
  const bake = (w, h, fn, face) => { const pb = new PB(w, h); const R = RIG.reset(face, w / 2, h - 2); fn(R); rasterRig(pb, R, { outline: '#1c1f24', rim: h }); return pb.canvas(); };
  const duck = (R, bob, male) => {
    R.P([[-4.4, -3.4], [-7, -5], [-6.6, -2.6]], male ? ['#1f2226', '#2b2f33', '#3a3f44'] : ['#5a4634', '#6e5640', '#83684d'], { flat: 1 });
    R.E(0, -3 + bob, 5.4, 2.9, 0, male ? ['#5a4e45', '#7a6c60', '#a09284', '#c2b6a8'] : ['#5a4634', '#7a6048', '#9a7c5c', '#b89a76']);
    R.E(-1, -3.6 + bob, 3.6, 1.8, 0, male ? ['#5d6066', '#7d8086', '#9da0a6', '#bfc2c6'] : ['#6e5640', '#8a6c50', '#a88a68', '#c4a886']);
    R.D(-2, -3 + bob, '#3f5fbf'); R.D(-1, -3 + bob, '#5f7fdf');
    R.E(4, -6.4 + bob, 2.4, 2.2, 0, male ? ['#183a24', '#245a34', '#3a7f4a', '#6fae70'] : ['#5a4634', '#7a6048', '#9a7c5c', '#b89a76']);
    R.P([[5.6, -6.6 + bob], [8.4, -6 + bob], [8.2, -5.2 + bob], [5.6, -5.4 + bob]], ['#b8962a', '#e8c33e', '#f6dc6a'], { flat: 1 });
    R.D(4.6, -7.2 + bob, '#111111'); if (male) R.DL(2.4, -4.4 + bob, 4.8, -4.4 + bob, '#f4f0e8');
  };
  for (const face of [1, -1]) for (const male of [true, false]) for (const bob of [0, 1]) out[`duck${face}${male ? 'm' : 'f'}${bob}`] = bake(22, 14, R => duck(R, bob, male), face);
  const pig = (R, wing) => {
    R.P([[-2.4, -2.6], [-5.2, -1.8], [-5, -1]], ['#3e4650', '#59626d', '#77818c'], { flat: 1 });
    R.E(0, -2.6, 3.2, 2.3, -.1, PGK.body); R.E(2, -4.6, 1.7, 1.6, 0, PGK.head); R.D(2.6, -4.8, '#111111'); R.D(3.8, -4.4, '#3a3330'); R.D(1.2, -3.6, '#5a8f78');
    if (wing === 0) R.E(-.6, -2.8, 2.4, 1.4, -.1, PGK.wing);
    else if (wing === 1) R.P([[-1.6, -3.4], [-3.6, -8.4], [.8, -4.2]], PGK.wing, { flat: 2 });
    else R.P([[-1.6, -2.4], [-4, 1.6], [.8, -2.2]], PGK.wing, { flat: 1 });
  };
  for (const face of [1, -1]) for (const w of [0, 1, 2]) out[`pig${face}${w}`] = bake(14, 12, R => pig(R, w), face);
  return out;
}
function drawFish(g, x, y, face, t, col) {
  const X = Math.round(x), Y = Math.round(y), tail = Math.floor(t * 8) % 2;
  g.fillStyle = col[0]; g.fillRect(X - 2, Y - 1, 5, 2); g.fillStyle = col[1]; g.fillRect(X - 1, Y - 1, 3, 1);
  g.fillStyle = col[0]; g.fillRect(X - 3 * face - (face < 0 ? 0 : 0), Y - 1 + tail, 1, 1); g.fillRect(X - 3 * face, Y - tail, 1, 1);
  g.fillStyle = '#111'; g.fillRect(X + 2 * face - (face < 0 ? 1 : 0), Y - 1, 1, 1);
}
