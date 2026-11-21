'use strict';
/* =========================================================
   고양이 '보리': 치즈 태비 + 흰 턱받이 · 흰 양말
   시점: 옆(s) · 앞(d) · 뒤(u). 원점은 발바닥 가운데, 앞쪽이 +x.
   자세: stand · walk · sit · punch · claw · leap · knead · loaf · sleep · peek
   ========================================================= */
const RIG = new Rig();
Rig.prototype.K2 = function (x1, y1, x2, y2, r1, r2, ramp, o) { const s = Math.hypot(this.m[0], this.m[1]); this.K(x1, y1, x2, y2, r1 * s, r2 * s, ramp, o); };
Rig.prototype.scl = function (s) { const m = this.m; m[0] *= s; m[1] *= s; m[2] *= s; m[3] *= s; };
function tailChain(R, pts, rad, ramp) { for (let i = 0; i < pts.length - 1; i++) R.K2(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], rad[i], rad[i + 1], ramp); }
function bakeRig(w, h, ox, oy, face, fn, opt) { const pb = new PB(w, h), R = RIG.reset(face, ox, oy); fn(R); rasterRig(pb, R, opt || {}); return pb.canvas(); }

const CK = {
  fur: ['#8a4418', '#b8621f', '#e08a35', '#f7b863', '#ffd59a'],
  furFar: ['#6a3212', '#8e4a18', '#b86e2a', '#d99448'],
  white: ['#bfb29d', '#e6dcc9', '#faf4e6'],
  stripe: '#8a4418', nose: '#f08a8a', eye: '#1d120c', iris: '#a7e08a', outline: '#2a160c', ear: '#f2a0a0',
};

/* ---------- 얼굴 ---------- */
function catEyeSide(R, x, y, mood) {
  const E = CK.eye;
  if (mood === 'closed' || mood === 'happy') { R.DL(x - 1, y + .4, x + 1, y + .4, E); if (mood === 'happy') { R.D(x - 1, y + 1, E); R.D(x + 1, y + 1, E); } return; }
  if (mood === 'sleepy') { R.DL(x - 1, y, x + 1, y, E); return; }
  if (mood === 'angry') { R.D(x, y + .4, E); R.D(x + 1, y + .4, E); R.DL(x - 1, y - 1.2, x + 1.4, y - .2, E); return; }
  if (mood === 'wide') { R.D(x, y - 1, CK.iris); R.D(x, y, E); R.D(x + 1, y, E); R.D(x, y + 1, E); R.D(x + 1, y + 1, E); R.D(x - .2, y - 1, '#ffffff'); return; }
  R.D(x, y - .6, CK.iris); R.D(x + 1, y - .6, CK.iris); R.D(x, y + .4, E); R.D(x + 1, y + .4, E); R.D(x + .4, y - .6, E);
}
function catEyeFront(R, x, y, mood, s = 1) {
  const E = CK.eye;
  if (mood === 'closed') { R.DL(x - 1, y + .4, x + 1, y + .4, E); return; }
  if (mood === 'happy') { R.D(x - 1, y + .8, E); R.D(x, y - .2, E); R.D(x + 1, y + .8, E); return; }
  if (mood === 'sleepy') { R.DL(x - 1, y + .4, x + 1, y + .4, E); return; }
  if (mood === 'angry') { R.D(x - .4, y, E); R.D(x + .4, y, E); R.D(x - .4, y + 1, E); R.D(x + .4, y + 1, E); R.DL(x - 1.2, y - 1.2, x + 1.2, y - .4 * s, E); return; }
  R.D(x - .4, y - 1, '#ffffff'); R.D(x + .4, y - 1, CK.iris); R.D(x - .4, y, E); R.D(x + .4, y, E); R.D(x - .4, y + 1, E); R.D(x + .4, y + 1, E);
}

/* ---------- 옆모습 ---------- */
function catSide(R, o) {
  const P = o.pose, t = o.t || 0, f = o.f || 0, mood = o.mood || 'open', ext = o.ext || 0;
  const sw = P === 'walk' ? [0, 1, 0, -1][f & 3] : 0, sw2 = P === 'walk' ? [1, 0, -1, 0][f & 3] : 0;
  const bob = P === 'walk' ? ((f & 1) ? -.7 : 0) : 0;
  const ta = Math.sin(t * 3) * 1.1 + (o.tailSw || 0);
  const ears = (hx, hy, back) => {
    R.P([[hx - 2.6, hy - 1.6], [hx - 2.2, hy - 5.6], [hx - 0.4, hy - 2.8]], CK.furFar, { flat: 1 });
    R.P([[hx - .6 - (back || 0), hy - 2.4], [hx + .4 - (back || 0) * 1.4, hy - 6.2], [hx + 2.6, hy - 1.8]], CK.fur, { flat: 2 });
    R.D(hx + .2, hy - 3.6, CK.ear);
  };
  if (P === 'sit' || P === 'punch' || P === 'claw' || P === 'peek') {
    if (P === 'peek') {
      R.E(0, -3.2, 3.8, 3.4, 0, CK.fur); ears(.4, -5.6, 0); R.E(2.6, -2.4, 1.6, .9, 0, CK.white); R.E(-.6, -2.4, 1.6, .9, 0, CK.white);
      R.E(2.2, -2.9, 2, 1.4, 0, CK.white); catEyeSide(R, 1.6, -3.6, mood); R.D(3.8, -2.6, CK.nose); return;
    }
    tailChain(R, [[-4, -1.6], [-8, -1.2], [-10.6, -2.4 + ta * .3], [-11, -5.4 + ta * .7]], [1.5, 1.4, 1.2, .9], CK.fur);
    R.E(-2, -2.8, 3.8, 2.8, 0, CK.fur);
    R.E(-.4, -5.8, 3.3, 4.4, .12, CK.fur); R.E(1.2, -5.4, 1.8, 3.2, .1, CK.white);
    for (let i = 0; i < 2; i++) R.DL(-3.2 + i * 1.6, -8, -2.6 + i * 1.6, -4.6, CK.stripe);
    if (P === 'sit') { R.K2(1.4, -4.4, 2.4, -.8, 1.1, 1, CK.fur); R.E(3, -.9, 1.6, .85, 0, CK.white); }
    else {
      const a = P === 'punch' ? ext : ext;
      const px = P === 'punch' ? 5 + a * 3.4 : 3.4 + a * 4.6, py = P === 'punch' ? -8.4 - a * .6 : -13.2 + a * 8;
      R.K2(1.2, -4.4, 2.2, -.8, 1.1, 1, CK.furFar); R.E(2.8, -.9, 1.5, .8, 0, CK.white);
      R.K2(1.4, -7.2, px, py, 1.15, 1, CK.fur); R.E(px + .6, py, 1.5, 1.3, 0, CK.white);
    }
    const hx = 2.4, hy = -11; R.E(hx, hy, 4, 3.7, 0, CK.fur); R.E(hx + 3.1, hy + 1.2, 2, 1.6, 0, CK.white);
    ears(hx - .4, hy - .4, 0); catEyeSide(R, hx + 1.6, hy - .6, P === 'claw' || P === 'punch' ? (mood === 'open' ? 'angry' : mood) : mood); R.D(hx + 5, hy + .2, CK.nose);
    R.DL(hx + 2.6, hy + 2, hx + 3.4, hy + 2.4, '#5a2418'); R.W(hx + 4, hy + .8, hx + 6.8, hy - .2, '#fff4e4'); R.W(hx + 4, hy + 1.6, hx + 6.6, hy + 2, '#fff4e4');
    R.DL(hx - 1, hy - 2.8, hx - .6, hy - 1.4, CK.stripe); R.DL(hx + 1, hy - 3, hx + 1, hy - 1.6, CK.stripe);
    return;
  }
  if (P === 'loaf') {
    tailChain(R, [[-5, -1.8], [-8, -1.4], [-9.4, -2.6 + ta * .2]], [1.5, 1.3, 1], CK.fur);
    R.E(0, -3.5 + bob, 6.4, 3.5, 0, CK.fur); R.E(1.4, -2.2, 4.4, 1.5, 0, CK.white);
    for (let i = 0; i < 3; i++) R.DL(-3 + i * 2, -6.2, -2.4 + i * 2, -4, CK.stripe);
    R.E(5.6, -1.4, 2.4, 1, 0, CK.white);
    const hx = 4.6, hy = -5.8; R.E(hx, hy, 3.3, 3, 0, CK.fur); R.E(hx + 2.5, hy + 1, 1.7, 1.2, 0, CK.white);
    ears(hx - .6, hy - .2, 0); catEyeSide(R, hx + 1.4, hy - .4, mood === 'open' ? 'sleepy' : mood); R.D(hx + 4.2, hy + .2, CK.nose);
    return;
  }
  if (P === 'sleep') {
    R.E(0, -3, 6, 3.3, 0, CK.fur); R.E(.8, -4.2, 4.2, 1.7, 0, CK.fur);
    for (let i = 0; i < 3; i++) R.DL(-3 + i * 2, -5.8, -2.4 + i * 2, -3.6, CK.stripe);
    tailChain(R, [[3.6, -.6], [0, 0], [-4.6, -.4], [-7, -2.4]], [1.4, 1.5, 1.4, 1.1], CK.fur);
    R.E(5.4, -3.2, 3, 2.6, 0, CK.fur); ears(5, -3.4, 0); R.E(6.6, -1.8, 1.7, 1, 0, CK.white); catEyeSide(R, 6.6, -3.6, 'closed'); R.D(8, -2.4, CK.nose); return;
  }
  if (P === 'leap') {
    const a = -.22;
    tailChain(R, [[-5.4, -6.6], [-9, -6.8], [-12, -6.2 + ta * .3], [-14.6, -6.2]], [1.5, 1.3, 1.1, .8], CK.fur);
    R.K2(-3, -6, -8, -3.6, 1.3, 1, CK.furFar); R.E(-8.6, -3.4, 1.5, .85, 0, CK.white); R.K2(3, -4.6, 8, -2.4, 1.2, 1, CK.furFar); R.E(8.8, -2.2, 1.5, .85, 0, CK.white);
    R.E(0, -6.4, 7, 2.9, a, CK.fur); R.E(1.6, -5, 4.4, 1.4, a, CK.white);
    for (let i = 0; i < 3; i++) R.DL(-3.4 + i * 2, -8.6, -2.6 + i * 2, -6, CK.stripe);
    R.K2(-3.4, -5.6, -9, -7.8, 1.3, 1, CK.fur); R.E(-9.6, -7.9, 1.5, .85, 0, CK.white); R.K2(3.6, -5.2, 9, -6.4, 1.2, 1, CK.fur); R.E(9.8, -6.4, 1.5, .85, 0, CK.white);
    const hx = 7.4, hy = -8.4; R.E(hx, hy, 3.3, 3, 0, CK.fur); R.E(hx + 2.6, hy + 1, 1.7, 1.3, 0, CK.white); ears(hx - .6, hy - .2, 1); catEyeSide(R, hx + 1.4, hy - .6, 'wide'); R.D(hx + 4.2, hy, CK.nose); return;
  }
  // stand · walk · knead  (통통하고 짧은 몸 · 큰 머리)
  const kn = P === 'knead';
  const legs = (xs, far) => {
    const [fx, bx] = xs, lf = far ? (-sw2) : sw, ramp = far ? CK.furFar : CK.fur;
    R.K2(bx, -3 + bob, bx + (-lf) * 1.5, -.7 - Math.max(0, lf) * 1, 1.35, 1.1, ramp); R.E(bx + (-lf) * 1.5 + .7, -.7 - Math.max(0, lf) * 1, 1.5, .8, 0, CK.white);
    const kl = kn ? (far ? Math.sin(t * 9 + 1.6) : Math.sin(t * 9)) : lf; const lift = kn ? Math.max(0, kl) * 1.4 : Math.max(0, -lf) * 1;
    R.K2(fx, -3 + bob, fx + (kn ? 0 : lf * 1.5), -.7 - lift, 1.3, 1.05, ramp); R.E(fx + (kn ? 0 : lf * 1.5) + .7, -.7 - lift, 1.5, .8, 0, CK.white);
  };
  tailChain(R, [[-4.4, -5 + bob], [-7.4, -6.8 + bob], [-9, -9.6 + ta * .4], [-8, -12.6 + ta * .9 + (kn ? Math.sin(t * 8) * .8 : 0)]], [1.6, 1.45, 1.2, .9], CK.fur);
  legs([2.2, -2.6], true);
  R.E(-.4, -5 + bob, 5, 3.6, kn ? .05 : 0, CK.fur); R.E(-2.6, -4.8 + bob, 3, 3.4, 0, CK.fur); R.E(2.6, -5 + bob, 2.8, 3.4, 0, CK.fur);
  R.E(.6, -3.4 + bob, 3.6, 1.4, 0, CK.white);
  for (let i = 0; i < 3; i++) R.DL(-3 + i * 2, -7.6 + bob, -2.4 + i * 2, -5 + bob, CK.stripe);
  legs([3.2, -3.6], false);
  const hx = kn ? 5.6 : 5.2, hy = (kn ? -6.2 : -7.8) + bob;
  R.E(hx, hy, 4.1, 3.8, 0, CK.fur); R.E(hx + 2.8, hy + 1.2, 2, 1.6, 0, CK.white);
  ears(hx - .4, hy - .4, kn ? 1 : 0); catEyeSide(R, hx + 1.6, hy - .6, kn ? 'happy' : mood); R.D(hx + 4.8, hy + .2, CK.nose);
  R.DL(hx + 2.6, hy + 2, hx + 3.4, hy + 2.4, '#5a2418'); R.W(hx + 4, hy + .8, hx + 6.8, hy - .2, '#fff4e4'); R.W(hx + 4, hy + 1.6, hx + 6.6, hy + 2, '#fff4e4');
  R.DL(hx - 1.4, hy - 3.2, hx - 1, hy - 1.6, CK.stripe); R.DL(hx + .8, hy - 3.4, hx + .8, hy - 1.8, CK.stripe);
}

/* ---------- 앞모습 ---------- */
function catFront(R, o) {
  const P = o.pose, t = o.t || 0, f = o.f || 0, mood = o.mood || 'open', ext = o.ext || 0;
  const walk = P === 'walk', bob = walk ? ((f & 1) ? -.8 : 0) : 0, lf = walk ? [0, 1, 0, -1][f & 3] : 0;
  const ta = Math.sin(t * 3) * 1.2 + (o.tailSw || 0);
  const ears = (hy, back) => {
    R.P([[-4.4, hy + 1.2], [-4.2, hy - 3.8 + (back || 0)], [-1.2, hy - 1.4]], CK.fur, { flat: 2 }); R.P([[4.4, hy + 1.2], [4.2, hy - 3.8 + (back || 0)], [1.2, hy - 1.4]], CK.fur, { flat: 2 });
    R.P([[-3.6, hy - .2], [-3.5, hy - 2.6 + (back || 0)], [-2, hy - 1]], [CK.ear, CK.ear], { flat: 1 }); R.P([[3.6, hy - .2], [3.5, hy - 2.6 + (back || 0)], [2, hy - 1]], [CK.ear, CK.ear], { flat: 1 });
  };
  const face = (hy, m) => {
    catEyeFront(R, -2, hy - .4, m); catEyeFront(R, 2, hy - .4, m);
    R.D(-.4, hy + 1.6, CK.nose); R.D(.4, hy + 1.6, CK.nose); R.DL(-1.4, hy + 2.6, -.4, hy + 3.2, '#5a2418'); R.DL(.4, hy + 3.2, 1.4, hy + 2.6, '#5a2418');
    R.W(-3.4, hy + 1.6, -6.8, hy + 1, '#fff4e4'); R.W(-3.4, hy + 2.6, -6.6, hy + 3, '#fff4e4'); R.W(3.4, hy + 1.6, 6.8, hy + 1, '#fff4e4'); R.W(3.4, hy + 2.6, 6.6, hy + 3, '#fff4e4');
    for (let i = -1; i <= 1; i++) R.DL(i * 1.5, hy - 3.6, i * 1.5, hy - 2.2, CK.stripe);
    R.D(-3.8, hy + 1, CK.stripe); R.D(3.8, hy + 1, CK.stripe);
  };
  if (P === 'peek') { R.E(0, -3, 4.2, 3.6, 0, CK.fur); ears(-4.6, 0); R.E(0, -2, 2.6, 1.6, 0, CK.white); face(-3.2, mood); R.E(-3.4, .4, 1.5, .85, 0, CK.white); R.E(3.4, .4, 1.5, .85, 0, CK.white); return; }
  if (P === 'loaf' || P === 'sleep') {
    tailChain(R, [[3.8, -1.6], [6.8, -1.2], [7.6, -3.2]], [1.4, 1.3, 1], CK.fur);
    R.E(0, -3.4, 5.6, 3.4, 0, CK.fur); R.E(0, -2.4, 3.4, 2, 0, CK.white); R.E(-2.4, -.8, 1.6, .9, 0, CK.white); R.E(2.4, -.8, 1.6, .9, 0, CK.white);
    for (let i = -1; i <= 1; i++) R.DL(i * 2.6, -6, i * 2.4, -4.4, CK.stripe);
    ears(-8.2, 0); R.E(0, -6.8, 4.5, 3.8, 0, CK.fur); ears(-8.4, 0); R.E(0, -5.8, 3, 1.8, 0, CK.white);
    face(-7, P === 'sleep' ? 'closed' : (mood === 'open' ? 'sleepy' : mood)); return;
  }
  // stand · walk · sit · knead · punch/claw (앞발을 번쩍)
  const sit = P === 'sit', kn = P === 'knead', att = P === 'punch' || P === 'claw';
  tailChain(R, [[3.2, -2.8 + bob], [6.4, -4.2 + bob], [7.8, -7.4 + ta * .3], [6.6, -10.4 + ta]], [1.4, 1.3, 1.1, .85], CK.fur);
  if (sit) { R.E(0, -2.6, 4.4, 2.6, 0, CK.fur); }
  else { R.E(-3.2, -2.6 + bob, 1.9, 2.1, 0, CK.fur); R.E(3.2, -2.6 + bob, 1.9, 2.1, 0, CK.fur); }
  R.E(0, -5 + bob, 4.6, 4.3, 0, CK.fur); R.E(0, -4.2 + bob, 2.6, 3.2, 0, CK.white);
  for (let i = -1; i <= 1; i += 2) { R.DL(i * 3.4, -7.4 + bob, i * 3, -4.8 + bob, CK.stripe); R.DL(i * 2.4, -7.8 + bob, i * 2, -5.8 + bob, CK.stripe); }
  const lift = i => kn ? Math.max(0, Math.sin(t * 9 + i * 3.14)) * 1.5 : (walk ? Math.max(0, i ? lf : -lf) * 1.3 : 0);
  if (att) {
    R.E(-1.8, -1, 1.4, .85, 0, CK.white); R.E(1.8, -1, 1.4, .85, 0, CK.white);
    const px = 3 + ext * -4, py = -11 + ext * 6; R.K2(2.6, -6, px, py, 1.15, 1, CK.fur); R.E(px, py, 1.6, 1.4, 0, CK.white);
  } else { R.E(-1.8, -1 - lift(0), 1.4, .9, 0, CK.white); R.E(1.8, -1 - lift(1), 1.4, .9, 0, CK.white); }
  R.E(0, -10 + bob, 4.7, 3.9, 0, CK.fur); ears(-11.6 + bob, kn ? 1 : 0); R.E(0, -8.8 + bob, 3, 2, 0, CK.white);
  face(-10 + bob, kn ? 'happy' : att ? 'angry' : mood);
}

/* ---------- 뒷모습 ---------- */
function catBack(R, o) {
  const P = o.pose, t = o.t || 0, f = o.f || 0, walk = P === 'walk', bob = walk ? ((f & 1) ? -.8 : 0) : 0, lf = walk ? [0, 1, 0, -1][f & 3] : 0;
  const ta = Math.sin(t * 3) * 1.4 + (o.tailSw || 0), sit = P === 'sit' || P === 'loaf' || P === 'peek';
  tailChain(R, [[0, -4.2 + bob], [1.2, -8 + bob], [2.4 + ta * .2, -12 + bob], [1.4 + ta * .5, -15.4 + bob]], [1.6, 1.4, 1.2, .9], CK.fur);
  R.E(-1.8, -1 - Math.max(0, lf) * 1.1, 1.4, .9, 0, CK.white); R.E(1.8, -1 - Math.max(0, -lf) * 1.1, 1.4, .9, 0, CK.white);
  R.E(0, -4.4 + bob, sit ? 4.8 : 4.4, sit ? 4.2 : 3.8, 0, CK.fur);
  for (let i = -1; i <= 1; i++) R.DL(i * 2.4, -7 + bob, i * 2.2, -3.8 + bob, CK.stripe);
  R.E(0, -9.4 + bob, 4.6, 3.9, 0, CK.fur);
  R.P([[-4.4, -10.6 + bob], [-4.2, -14.8 + bob], [-1.2, -12.4 + bob]], CK.fur, { flat: 2 }); R.P([[4.4, -10.6 + bob], [4.2, -14.8 + bob], [1.2, -12.4 + bob]], CK.fur, { flat: 2 });
  for (let i = -1; i <= 1; i++) R.DL(i * 1.6, -12 + bob, i * 1.6, -10 + bob, CK.stripe);
}
function drawCatRig(R, o) { const v = o.view; if (v === 's') catSide(R, o); else if (v === 'd') catFront(R, o); else catBack(R, o); }

/* ---------- 구워 둔 고양이 ---------- */
const CAT_CACHE = new Map(), CAT_OPT = { outline: CK.outline, rim: 40, rimCol: '#ffe6bf' };
function catSprite(view, pose, f, face, extra) {
  const e = extra || {}, key = [view, pose, f, face, e.ext || 0, e.mood || '', Math.round((e.tailSw || 0) * 2), Math.round(((e.t || 0) * 3) % 6.28 * 2), e.small || ''].join('|');
  let c = CAT_CACHE.get(key); if (c) return c;
  const W = 48, H = 40;
  c = bakeRig(W, H, 24, 34, face, R => drawCatRig(R, Object.assign({ view, pose, f }, e)), CAT_OPT);
  CAT_CACHE.set(key, c); if (CAT_CACHE.size > 900) CAT_CACHE.delete(CAT_CACHE.keys().next().value);
  return c;
}
function drawCat(g, x, y, view, pose, f, face, extra) { const c = catSprite(view, pose, f, face, extra); g.drawImage(c, Math.round(x) - 24, Math.round(y) - 34); }
function catPortrait() { return bakeRig(40, 40, 20, 38, 1, R => { R.scl(2.2); drawCatRig(R, { view: 'd', pose: 'sit', f: 0, t: 1 }); }, CAT_OPT); }
