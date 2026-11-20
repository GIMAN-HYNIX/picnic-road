'use strict';
/* =========================================================
   캐릭터: 수달 우체부, 비둘기 선배, 고양이, 오리, 비둘기, 물고기
   관절(타원·캡슐·사각형·다각형) → 명암·가장자리 빛·외곽선
   ========================================================= */
const OTK = {
  fur: ['#3b2417', '#5a3a25', '#7d5536', '#a1744c', '#c09367'],
  furFar: ['#2b1a10', '#41291a', '#5a3d28', '#735237'],
  furLt: ['#5a3a25', '#7d5536', '#a1744c', '#c09367', '#d8b088'],
  cream: ['#b08b64', '#d3b58e', '#ecd8ba', '#faefdb'],
  cap: ['#16293f', '#1f4063', '#2b5a88', '#4a7fb2'],
  bag: ['#651b16', '#8f271e', '#b9382c', '#d95a48'],
  env: ['#bfb29a', '#e3dac7', '#f7f1e3'],
  eye: '#160d09', glint: '#ffffff', nose: '#1d120c', blush: '#e48a78', strap: '#3a2418', whisker: '#f5ead6', outline: '#21130c',
};
const RIG = new Rig();
Rig.prototype.K2 = function (x1, y1, x2, y2, r1, r2, ramp, o) { const s = Math.hypot(this.m[0], this.m[1]); this.K(x1, y1, x2, y2, r1 * s, r2 * s, ramp, o); };

function tailChain(R, pts, rad, ramp) { for (let i = 0; i < pts.length - 1; i++) R.K2(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], rad[i], rad[i + 1], ramp); }
function eyes(R, ex, ey, kind) {
  const E = OTK.eye;
  if (kind === 'blink') { R.DL(ex - 1, ey, ex + 1, ey, E); return; }
  if (kind === 'happy') { R.D(ex - 1, ey, E); R.D(ex, ey - 1, E); R.D(ex + 1, ey, E); return; }
  if (kind === 'wide') { for (let i = -1; i <= 1; i++) for (let j = -2; j <= 1; j++) R.D(ex + i * .9, ey + j, E); R.D(ex - 1, ey - 2, OTK.glint); R.D(ex, ey - 2, OTK.glint); return; }
  if (kind === 'down') { R.D(ex - .5, ey, E); R.D(ex + .5, ey, E); R.D(ex - .5, ey + 1, E); R.D(ex + .5, ey + 1, E); return; }
  R.D(ex - .5, ey - 1, OTK.glint); R.D(ex + .5, ey - 1, E); R.D(ex - .5, ey, E); R.D(ex + .5, ey, E); R.D(ex - .5, ey + 1, E); R.D(ex + .5, ey + 1, '#3a2418');
}
function envelope(R, x, y, w, h, a) {
  R.B(x, y, w, h, a, OTK.env, { b: .1 });
  R.push(); R.translate(x, y); R.rotate(a || 0);
  R.DL(-w / 2 + .5, -h / 2 + .5, 0, .3, '#c9402f'); R.DL(w / 2 - .5, -h / 2 + .5, 0, .3, '#c9402f'); R.D(w / 2 - 1.2, h / 2 - 1, '#2f5f8c');
  R.pop();
}
function otterHead(R, s, hx, hy, tilt, o = {}) {
  R.push(); R.translate(hx, hy); R.rotate(tilt);
  R.E(-6.2, -4.4 + (o.earUp ? -1 : 0), 2, 2, 0, OTK.fur);
  R.E(0, 0, 7.5, 6.7, 0, OTK.fur);
  R.E(5.5, 1.8, 4, 3, 0, OTK.cream);
  // 모자
  if (!o.noCap) {
  R.push(); R.rotate(o.capTilt || 0);
  R.P([[-7.1, -3.4], [-6.3, -6.5], [-3.2, -8.3], [1, -8.5], [4.4, -7.1], [5.8, -4.3], [0, -3.7]], OTK.cap);
  R.P([[3.1, -4.6], [9.2, -4.1], [9.0, -3.1], [2.7, -3.5]], OTK.cap, { flat: 1 });
  R.DL(-6.7, -3.8, 5.3, -4.3, '#142538'); R.D(-.2, -6.7, '#f2c450'); R.D(.8, -6.7, '#ffe48a');
  R.pop();
  }
  eyes(R, 3.1, -1.4 + (o.eyeDy || 0), o.eyes || 'open');
  R.D(8.4, .2, OTK.nose); R.D(9.2, .2, OTK.nose); R.D(8.4, -.6, '#5a3a2a');
  if (o.mouth === 'open') { R.D(7.6, 2.6, '#5a2418'); R.D(8.4, 2.6, '#5a2418'); R.D(8, 3.4, '#c9605a'); }
  else { R.D(7.8, 2.2, '#3a2418'); R.D(8.8, 2.6, '#3a2418'); }
  R.D(2, 2.1, OTK.blush); R.D(3, 2.1, OTK.blush);
  R.W(8.6, 1.3, 12.6, .5, OTK.whisker); R.W(8.6, 2.4, 12.6, 2.9, OTK.whisker);
  R.pop();
}
/* 선 자세: 서기·걷기·점프·낙하·착지·편지 읽기·배달 */
function otterUpright(R, s) {
  const walk = s.mode === 'walk', ph = s.phase || 0, t = s.t;
  const sw = walk ? Math.sin(ph) : 0, cw = walk ? Math.cos(ph) : 0;
  const jump = s.mode === 'jump', fall = s.mode === 'fall', sq = s.squash || 0;
  const read = s.read || 0, deliver = s.mode === 'deliver';
  let bob = walk ? -Math.round(Math.abs(Math.sin(ph))) : 0;
  if (s.mode === 'idle' && Math.sin(t * 2.3) > .7) bob = 0;
  R.push(); R.translate(0, bob + Math.round(sq * 1.2));
  const lean = walk ? .05 + Math.sin(ph * 2) * .02 : (fall ? -.06 : 0);
  // 꼬리
  const tsw = walk ? Math.sin(ph) * 1.6 : Math.sin(t * 1.7) * 1.2, tl = jump ? 3 : fall ? -3 : 0;
  tailChain(R, [[-4, -5.2], [-8.6, -3.2 + tl * .2 + tsw * .2], [-12.6, -3.6 + tl * .5 + tsw * .7], [-15.6, -5.4 + tl + tsw]], [3.3, 2.7, 2, 1.1], OTK.fur);
  // 먼쪽 다리와 팔
  const lift = k => Math.max(0, k) * 2.2, stride = 3;
  if (jump) R.E(-1.6, -2.4, 2.3, 2.6, 0, OTK.furFar); else if (fall) R.E(-2, -1.4, 2.2, 3, 0, OTK.furFar);
  else { const lx = -2 - sw * stride, ly = -3 - lift(-cw); R.E(lx, ly, 2.4, 3.2 - sq * .5, 0, OTK.furFar); R.E(lx + 1.1, ly + 2.2, 2.2, 1.2, 0, OTK.furFar); }
  let fh = [1.2 + sw * 2.2, -11];
  if (jump) fh = [1.4, -19.4]; else if (fall) fh = [-4.6, -14.8]; else if (read) fh = [lerp(1.2, 5, read), lerp(-11, -12.6, read)]; else if (deliver && s.yay) fh = [2.4, -20];
  R.K2(-.8, -15.2, fh[0], fh[1], 1.6, 1.45, OTK.furFar);
  // 몸통
  R.push(); R.rotate(lean);
  R.E(.2, -10.4 + sq * .9, 6 + sq * .8, 7.6 - sq * 1 + (jump ? .5 : 0) + Math.sin(t * 2.2) * .18, .06, OTK.fur);
  R.E(1.9, -9.4 + sq * .7, 3.8 + sq * .4, 5.8 - sq * .7, .06, OTK.cream);
  // 가방
  R.B(-5.3, -8.8, 6.2, 5.6, .14, OTK.bag);
  R.P([[-8.3, -11.4], [-2.4, -11.4], [-2.8, -9.2], [-7.9, -9.2]], OTK.bag, { b: -.2 });
  if (!s.noLetter) envelope(R, -5.6, -12.5, 5, 2.8, .3);
  R.D(-5.1, -9.6, '#f2c450');
  R.DL(3.4, -16.4, -2.8, -11.4, OTK.strap);
  R.pop();
  // 가까운 다리
  if (jump) R.E(2.6, -2, 2.4, 2.6, 0, OTK.fur); else if (fall) R.E(2.4, -1.2, 2.3, 3.1, 0, OTK.fur);
  else { const lx = 2.4 + sw * stride, ly = -2.9 - lift(cw); R.E(lx, ly, 2.5 + sq * .3, 3.2 - sq * .5, 0, OTK.fur); R.E(lx + 1.3, ly + 2.2, 2.3, 1.2, 0, OTK.furLt); }
  // 편지 들고 읽기
  if (read > .5) envelope(R, 7.8, -12.6, 6, 4, -.1);
  // 가까운 팔
  let nh = [5.6 - sw * 2.2, -10.4];
  if (jump) nh = [5.6, -19.2]; else if (fall) nh = [8.4, -14.2]; else if (read) nh = [lerp(5.6, 9.4, read), lerp(-10.4, -12.4, read)];
  else if (deliver) nh = s.yay ? [6.8, -20.4] : [10.4, -16];
  R.K2(2.9, -14.6, nh[0], nh[1], 1.75, 1.55, OTK.fur);
  R.E(nh[0] + .2, nh[1] + .2, 1.6, 1.5, 0, OTK.furLt);
  if (deliver && !s.yay && !s.thrown) envelope(R, nh[0] + 2.4, nh[1] - .6, 5.4, 3.6, -.2);
  // 머리
  let ey = 'open'; if (s.blink) ey = 'blink'; if (read > .5) ey = 'down'; if (fall) ey = 'wide'; if (deliver && s.yay) ey = 'happy';
  otterHead(R, s, 2.6, -21.6 + (walk ? -Math.round(Math.abs(cw) * .8) : 0) + Math.round(sq), (read ? .14 * read : 0) + (fall ? -.08 : 0) + (s.headTilt || 0),
    { eyes: ey, eyeDy: read > .5 ? .6 : 0, mouth: (fall || (deliver && s.yay)) ? 'open' : 'smile', earUp: fall, capTilt: fall ? -.18 : (jump ? -.06 : 0) });
  R.pop();
}
/* 누운 자세: 헤엄·미끄럼·둥둥 */
function otterFlat(R, s) {
  const t = s.t, swim = s.mode === 'swim', slide = s.mode === 'slide', flt = s.mode === 'float';
  const th = s.angle || 0, mv = s.moving ? 1 : .35;
  R.push(); R.translate(0, flt ? -3.6 : slide ? -5.4 : -6.6); R.rotate(th);
  if (flt) {
    const wag = Math.sin(t * 2.2) * .6;
    tailChain(R, [[-9, .6], [-13.6, .8 + wag * .5], [-17.6, .6 + wag], [-20.8, .2 + wag]], [3, 2.4, 1.7, 1], OTK.fur);
    R.E(0, 0, 9.6, 4.6, 0, OTK.fur);
    R.E(.6, -2.3, 7.4, 2.4, 0, OTK.cream);
    R.E(-7.2, -4.3, 1.6, 2.2, -.3, OTK.furLt); R.E(-4.8, -4.8, 1.6, 2.2, -.2, OTK.furLt);
    R.D(-7.6, -6.2, '#5a3a25'); R.D(-5.2, -6.8, '#5a3a25');
    R.P([[-5.6, -3.4], [-5, -6.4], [-2.4, -7.4], [.2, -6.6], [.8, -3.6]], OTK.cap); R.P([[.2, -4.4], [3.6, -4], [3.4, -3.2], [0, -3.6]], OTK.cap, { flat: 1 }); R.D(-2.4, -5.8, '#f2c450');
    envelope(R, 3.6, -6.4, 7, 4.2, -.06);
    R.E(.4, -5.2, 1.6, 1.5, 0, OTK.furLt); R.E(6.8, -5.6, 1.6, 1.5, 0, OTK.furLt);
    otterHead(R, s, 10.2, -1.8, -.78 + Math.sin(t * 1.3) * .05, { eyes: s.blink ? 'blink' : 'happy', mouth: 'smile', noCap: true });
    R.pop(); return;
  }
  // 꼬리
  const amp = swim ? 1.7 * mv : 0, ws = k => Math.sin(t * 9 - k * .9) * amp;
  if (slide) tailChain(R, [[-9.4, -.4], [-13.8, -1.2], [-17.8, -1.8], [-21, -2.6]], [3, 2.4, 1.7, 1], OTK.fur);
  else tailChain(R, [[-9.4, 0], [-13.8, -.4 + ws(1)], [-17.8, -.2 + ws(2)], [-20.8, .4 + ws(3)]], [3, 2.4, 1.7, 1], OTK.fur);
  // 먼쪽 다리·팔
  const kick = swim ? Math.sin(t * 8) * 1.6 * mv : 0;
  if (slide) { R.E(-9.4, 2.4, 2.8, 1.4, .1, OTK.furFar); R.K2(5.8, .6, 13.4, 1.4, 1.5, 1.35, OTK.furFar); }
  else { R.E(-7 + kick, 2.6, 2.3, 1.5, .2, OTK.furFar); R.K2(5.4, 2, 7.4 + Math.sin(t * 8 + 1.6) * 2 * mv, 4.2 + Math.cos(t * 8 + 1.6) * mv, 1.4, 1.3, OTK.furFar); }
  // 몸통
  R.E(0, 0, 10.2, 5.3, 0, OTK.fur);
  R.E(1.4, 2.4, 7.6, 2.5, 0, OTK.cream);
  R.B(-2.2, -1.4, 7.2, 5.6, .06, OTK.bag); R.P([[-5.8, -4.2], [1.4, -4.2], [.9, -1.7], [-5.3, -1.7]], OTK.bag, { b: -.18 }); envelope(R, -3.2, -4.8, 4.6, 2.4, .2); R.D(-2, -2, '#f2c450');
  R.DL(4.6, -4.8, -1, -4, OTK.strap);
  // 가까운 다리·팔
  if (slide) { R.E(-8.2, 3, 2.8, 1.4, .1, OTK.fur); R.K2(6.4, 1.6, 14.2, 2.8, 1.65, 1.45, OTK.fur); R.E(14.4, 2.9, 1.6, 1.4, 0, OTK.furLt); }
  else { R.E(-5.2 - kick, 3, 2.4, 1.6, .2, OTK.fur); const a = t * 8; R.K2(6.4, 2.4, 9 + Math.sin(a) * 2.2 * mv, 4.6 + Math.cos(a) * 1.2 * mv, 1.6, 1.4, OTK.fur); }
  // 머리
  otterHead(R, s, 10.6, -2.6, slide ? -.18 : (-th * .45 + Math.sin(t * 3) * .03), { eyes: slide ? 'happy' : (s.blink ? 'blink' : 'open'), mouth: slide ? 'open' : 'smile', capTilt: slide ? -.32 : -.1, earUp: false });
  R.pop();
}
const OTB = new PB(80, 64), OTC = makeCanvas(80, 64)[0];
function drawOtter(g, x, y, face, s) {
  RIG.reset(face, 40, 50);
  if (s.mode === 'swim' || s.mode === 'slide' || s.mode === 'float') otterFlat(RIG, s); else otterUpright(RIG, s);
  rasterRig(OTB, RIG, { outline: OTK.outline, rim: 40, rimCol: '#ffe2b8' });
  pbToCanvas(OTB, OTC);
  g.drawImage(OTC, Math.round(x) - 40, Math.round(y) - 50);
}

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
function otterPortrait() {
  const pb = new PB(40, 40); RIG.reset(1, 0, 0); RIG.m = [1.5, 0, 0, 1.5, 15, 62]; otterUpright(RIG, { mode: 'idle', t: 1 });
  rasterRig(pb, RIG, { outline: OTK.outline }); return pb.canvas();
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
