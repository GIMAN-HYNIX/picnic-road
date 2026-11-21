'use strict';
/* =========================================================
   수달 우체부: 날씬한 몸 · 관절 애니메이션
   자세 묶음: 선 자세(stand) · 네 발 자세(quad) · 헤엄(swim) · 매달리기(hang)
   좌표: 발바닥 가운데가 (0,0), 앞쪽이 +x, 위쪽이 -y
   ========================================================= */
const OTK = {
  fur: ['#3a2316', '#583824', '#7a5236', '#9d6f4a', '#bb8e64'],
  furFar: ['#2a190f', '#3e2819', '#573a26', '#6f4f35'],
  furLt: ['#583824', '#7a5236', '#9d6f4a', '#bb8e64', '#d4ac82'],
  cream: ['#ae8a63', '#d0b28b', '#e9d5b7', '#f8eedb'],
  cap: ['#16293f', '#1f4063', '#2b5a88', '#4a7fb2'],
  bag: ['#651b16', '#8f271e', '#b9382c', '#d95a48'],
  env: ['#bfb29a', '#e3dac7', '#f7f1e3'],
  eye: '#160d09', glint: '#ffffff', nose: '#1d120c', blush: '#e48a78', strap: '#3a2418', whisker: '#f5ead6', outline: '#21130c',
};
const OTK_WET = Object.assign({}, OTK, {
  fur: ['#24140b', '#382214', '#50331f', '#69462d', '#835e3f'],
  furFar: ['#1a0e07', '#29180d', '#3a2515', '#4c3320'],
  furLt: ['#382214', '#50331f', '#69462d', '#835e3f', '#9f7752'],
  cream: ['#86694c', '#a28666', '#bca282', '#d2bca0'],
  whisker: '#e2d4bc', outline: '#140b06',
});
const RIG = new Rig();
Rig.prototype.K2 = function (x1, y1, x2, y2, r1, r2, ramp, o) { const s = Math.hypot(this.m[0], this.m[1]); this.K(x1, y1, x2, y2, r1 * s, r2 * s, ramp, o); };
function tailChain(R, pts, rad, ramp) { for (let i = 0; i < pts.length - 1; i++) R.K2(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], rad[i], rad[i + 1], ramp); }
function rotP(x, y, a) { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; }
function ik(ax, ay, bx, by, l1, l2, bend) {
  const dx = bx - ax, dy = by - ay, d = Math.min(Math.hypot(dx, dy), l1 + l2 - .01) || .01;
  const a = Math.atan2(dy, dx), A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  return [ax + Math.cos(a + bend * A) * l1, ay + Math.sin(a + bend * A) * l1];
}
// 두 마디 팔다리 + 발
function limb(R, ax, ay, px, py, l1, l2, bend, r1, r2, r3, ramp, paw) {
  const [kx, ky] = ik(ax, ay, px, py, l1, l2, bend);
  R.K2(ax, ay, kx, ky, r1, r2, ramp); R.K2(kx, ky, px, py, r2, r3, ramp);
  if (paw) R.E(px + (paw.dx || 0), py + (paw.dy || 0), paw.rx, paw.ry, paw.a || 0, paw.ramp || ramp);
}
function eyes(R, ex, ey, kind, look = 0) {
  const E = OTK.eye;
  switch (kind) {
    case 'blink': R.DL(ex - 1, ey + .5, ex + 1, ey + .5, E); return;
    case 'happy': R.D(ex - 1, ey + .5, E); R.D(ex, ey - .5, E); R.D(ex + 1, ey + .5, E); return;
    case 'squeeze': R.D(ex - 1, ey - 1, E); R.D(ex, ey, E); R.D(ex - 1, ey + 1, E); return;
    case 'wide': for (let i = -1; i <= 1; i++) for (let j = -2; j <= 1; j++) R.D(ex + i * .9, ey + j, E); R.D(ex - 1, ey - 2, OTK.glint); R.D(ex, ey - 2, OTK.glint); return;
    case 'down': R.D(ex - .5, ey + .5, E); R.D(ex + .5, ey + .5, E); R.D(ex - .5, ey + 1.5, E); R.D(ex + .5, ey + 1.5, E); return;
  }
  const lx = look;
  R.D(ex - .5 + lx, ey - 1, OTK.glint); R.D(ex + .5 + lx, ey - 1, E); R.D(ex - .5 + lx, ey, E); R.D(ex + .5 + lx, ey, E); R.D(ex - .5 + lx, ey + 1, E); R.D(ex + .5 + lx, ey + 1, '#3a2418');
}
function envelope(R, x, y, w, h, a) {
  R.B(x, y, w, h, a, OTK.env, { b: .1 });
  R.push(); R.translate(x, y); R.rotate(a || 0);
  R.DL(-w / 2 + .5, -h / 2 + .5, 0, .2, '#c9402f'); R.DL(w / 2 - .5, -h / 2 + .5, 0, .2, '#c9402f'); R.D(w / 2 - 1.2, h / 2 - 1, '#2f5f8c');
  R.pop();
}
function bag(R, x, y, a, s) {
  R.push(); R.translate(x, y); R.rotate(a);
  R.B(0, 0, 5, 4.4, 0, OTK.bag);
  R.P([[-2.5, -2.2], [2.5, -2.2], [2.1, -.3], [-2.1, -.3]], OTK.bag, { b: -.2 });
  if (!s.noLetter) envelope(R, -.5, -3, 4.2, 2.4, .25);
  R.D(.2, -.8, '#f2c450');
  R.pop();
}

/* ---------- 머리: 넓적하고 납작한 수달 머리 ---------- */
function otterHead(R, K, hx, hy, tilt, o = {}) {
  R.push(); R.translate(hx, hy); R.rotate(tilt);
  R.E(-4.3 + (o.earBack ? -.8 : 0), -3.1 - (o.earUp ? .9 : 0), 1.5, 1.4, 0, K.fur);
  R.E(0, 0, 6.2, 5, 0, K.fur);
  R.E(-.4, 1.9, 4.6, 2.6, 0, K.fur);
  R.E(4.9, 1, 3.3, 2.4, 0, K.cream);
  R.E(2.2, 2.9, 3.2, 1.5, .1, K.cream);
  if (!o.noCap) {
    R.push(); R.translate(0, o.capDy || 0); R.rotate(o.capTilt || 0);
    R.P([[-5.6, -2.4], [-4.8, -5], [-2, -6.4], [1.4, -6.5], [4.2, -5.4], [5.2, -3.2], [0, -2.8]], OTK.cap);
    R.P([[2.6, -3.7], [8.2, -3.1], [8, -2.2], [2.2, -2.7]], OTK.cap, { flat: 1 });
    R.DL(-5.2, -2.8, 4.8, -3.3, '#142538'); R.D(-.2, -5.2, '#f2c450'); R.D(.8, -5.2, '#ffe48a');
    R.pop();
  }
  eyes(R, 2.4, -1.2 + (o.eyeDy || 0), o.eyes || 'open', o.look || 0);
  const nz = o.sniff ? (Math.floor(o.t * 16) % 2) * .6 : 0;
  R.D(7.6, -.4 - nz, OTK.nose); R.D(8.4, -.4 - nz, OTK.nose); R.D(7.6, -1.2 - nz, '#5a3a2a');
  if (o.mouth === 'open') { R.D(6.8, 1.8, '#5a2418'); R.D(7.6, 1.8, '#5a2418'); R.D(7.2, 2.6, '#c9605a'); }
  else if (o.mouth === 'o') { R.D(7.2, 1.9, '#5a2418'); R.D(7.2, 2.6, '#5a2418'); }
  else { R.D(7, 1.6, '#3a2418'); R.D(8, 2, '#3a2418'); }
  R.D(1.4, 1.6, OTK.blush); R.D(2.4, 1.6, OTK.blush);
  const wz = (o.whisk || 0) + (o.sniff ? Math.sin(o.t * 30) * .5 : 0);
  R.W(7.6, .6, 11.6, -.2 + wz, K.whisker); R.W(7.6, 1.6, 11.6, 2.4 - wz, K.whisker);
  R.pop();
}

/* ---------- 선 자세 ---------- */
function poseStand(R, s, K) {
  const t = s.t, m = s.mode, ph = s.phase || 0;
  const walk = m === 'walk', jump = m === 'jump', fall = m === 'fall', land = m === 'land', skid = m === 'skid', shake = m === 'shake';
  const groom = m === 'groom', peri = m === 'periscope', sniff = m === 'sniff', deliver = m === 'deliver', bump = m === 'bump';
  const read = s.read || 0, sq = s.squash || 0;
  const sw = walk ? Math.sin(ph) : 0, cw = walk ? Math.cos(ph) : 0;
  const breathe = Math.sin(t * 2.4) * .22;
  const bob = walk ? -Math.round(Math.abs(sw)) : 0;
  const crouch = sq * 2.4 + (sniff ? 2.6 : 0) + (land ? 1.6 : 0);
  const tall = peri ? 1.6 : (jump ? .9 : 0);
  let lean = walk ? .09 + Math.sin(ph * 2) * .025 : read * .04;
  if (skid) lean = -.34; if (fall) lean = -.06; if (sniff) lean = .62; if (bump) lean = -.24 + Math.sin(t * 30) * .04; if (groom) lean = .06; if (deliver) lean = s.dph === 'insert' ? .14 : s.dph === 'reach' ? .1 : 0;
  const shakeA = shake ? Math.sin(t * 46) * .27 * Math.max(0, 1 - (s.at || 0) / .75) : 0;
  const hipY = -6.6 + crouch, ang = lean + shakeA;
  R.push(); R.translate(0, bob);
  // 꼬리 (바닥에 대고 몸을 받침)
  const ts = s.tailSw || 0, tw = walk ? Math.sin(ph) * 1.1 : Math.sin(t * 1.6) * .9, tsh = shake ? Math.sin(t * 46 + 1) * 2.4 : 0, tl = jump ? 3 : fall ? -2.6 : 0;
  tailChain(R, [[-2.2, hipY + .4], [-6.4, Math.min(-1.2, hipY + 3.6 + tl * .25)], [-10.4, -1.9 + tl * .5 + (ts + tw) * .4 + tsh * .4], [-14, -2.4 + tl * .8 + (ts + tw) * .8 + tsh * .8], [-16.8, -3.8 + tl + ts + tw + tsh]], [2.6, 2.2, 1.7, 1.1, .6], K.fur);
  // 발 위치
  const lift = k => Math.max(0, k) * 2.6, stride = 3.1;
  let ff = [-1.2, -1], nf = [2.2, -1];
  if (walk) { ff = [-1.2 - sw * stride, -1 - lift(-cw)]; nf = [2.2 + sw * stride, -1 - lift(cw)]; }
  if (jump) { ff = [-.3, hipY + 3.8]; nf = [2.9, hipY + 3.4]; }
  if (fall) { ff = [-1.8, .3 + Math.sin(t * 18) * .5]; nf = [2.4, .6 - Math.sin(t * 18) * .5]; }
  if (skid) { ff = [3.2, -1]; nf = [5.8, -1]; }
  if (peri) { ff = [-1, -.5]; nf = [2, -.5]; }
  if (sniff || land) { ff = [-1.8, -1]; nf = [3, -1]; }
  const footFar = { rx: 2.2, ry: 1, dx: .9, dy: .1 }, footNear = { rx: 2.3, ry: 1.05, dx: 1, dy: .1, ramp: K.furLt };
  limb(R, -.5, hipY, ff[0], ff[1], 3.6, 3.4, -1, 1.9, 1.45, 1.1, K.furFar, footFar);
  // 어깨 (몸통 회전 반영)
  const pv = [.5, hipY], sh = (x, y) => { const p = rotP(x, y - tall, ang); return [pv[0] + p[0], pv[1] + p[1]]; };
  const Sf = sh(0, -8.6), Sn = sh(2, -8.4), Hc = sh(2.5, -15.4);
  // 손 위치
  let fh = [Sf[0] + 2.2, Sf[1] + 3.6], nh = [Sn[0] + 2.4, Sn[1] + 3.4];      // 기본: 가슴 앞에 앞발을 모음
  if (walk) { fh = [Sf[0] + .8 + sw * 2.4, Sf[1] + 4.6]; nh = [Sn[0] + 1.2 - sw * 2.4, Sn[1] + 4.6]; }
  if (jump) { fh = [Sf[0] + 1.2, Sf[1] - 5]; nh = [Sn[0] + 2, Sn[1] - 5.2]; }
  if (fall) { fh = [Sf[0] - 4.8, Sf[1] - 1 + Math.sin(t * 20) * .7]; nh = [Sn[0] + 5.6, Sn[1] - 1.4 + Math.cos(t * 20) * .7]; }
  if (skid) { fh = [Sf[0] - 3.4, Sf[1] + 2.2]; nh = [Sn[0] - 2.2, Sn[1] + 2.4]; }
  if (peri) { fh = [Sf[0] + 2.6, Sf[1] + 1.8]; nh = [Sn[0] + 2.8, Sn[1] + 1.6]; }
  if (sniff) { fh = [Sf[0] + 3.2, Sf[1] + 4.6]; nh = [Sn[0] + 3.6, Sn[1] + 4.4]; }
  if (land) { fh = [Sf[0] - 1.8, Sf[1] + 3.6]; nh = [Sn[0] + 3.8, Sn[1] + 3]; }
  if (bump) { fh = [Sf[0] + 3.4, Sf[1] - 1.6]; nh = [Sn[0] + 4, Sn[1] - 2]; }
  if (shake) { const q = Math.sin(t * 46); fh = [Sf[0] - 1 + q, Sf[1] + 4.4]; nh = [Sn[0] + 1.8 - q, Sn[1] + 4.4]; }
  if (groom) { const c = Math.cos(t * 13) * 1.3, d = Math.sin(t * 13) * 1; fh = [Hc[0] + 3.6 + c, Hc[1] + 1.8 + d]; nh = [Hc[0] + 4.8 - c, Hc[1] + 1.4 - d]; }
  if (read) { fh = [lerp(fh[0], Sf[0] + 3.8, read), lerp(fh[1], Sf[1] + 2.4, read)]; nh = [lerp(nh[0], Sn[0] + 5, read), lerp(nh[1], Sn[1] + 2.2, read)]; }
  if (deliver) {
    const d = s.dph;
    if (d === 'reach') nh = [Sn[0] - 4.8, Sn[1] + 6.2];
    else if (d === 'hold') nh = [Sn[0] + 4.4, Sn[1] - 2];
    else if (d === 'insert') nh = [Sn[0] + 7.2, Sn[1] - .6];
    else if (d === 'yay') { fh = [Sf[0] + 1.4, Sf[1] - 5.8]; nh = [Sn[0] + 2.2, Sn[1] - 6]; }
    else if (d === 'wave') nh = [Sn[0] + 2.4 + Math.sin(t * 14) * 1.6, Sn[1] - 6];
  }
  limb(R, Sf[0], Sf[1], fh[0], fh[1], 2.7, 2.7, 1, 1.35, 1.15, 1, K.furFar, { rx: 1.25, ry: 1.1 });
  // 몸통
  R.push(); R.translate(pv[0], pv[1]); R.rotate(ang);
  const puff = shake ? .6 : 0;
  R.E(0, -4.4 - tall * .5, 4.2 + puff + sq * .5, 6.9 + tall * .5 - sq * .8 + breathe * .5, .02, K.fur);
  R.E(1.6, -4.9 - tall * .5, 2.3 + puff * .5, 5.2 + tall * .4, .02, K.cream);
  bag(R, -3.3, -2.3, .12 + (s.bagA || 0), s);
  R.DL(2.4, -10 - tall, -2.2, -4.6, OTK.strap);
  R.E(1.5, -10.6 - tall, 3.3, 2.8, 0, K.fur); R.E(2.7, -10.2 - tall, 1.7, 2.2, 0, K.cream);
  let tilt = read * .17 + (sniff ? .4 : 0) + (peri ? -.2 + Math.sin(t * 1.4) * .1 : 0) + (groom ? .12 + Math.sin(t * 6) * .05 : 0) + (fall ? -.12 : 0) + (bump ? -.15 : 0) + (s.headTilt || 0);
  let ey = s.blink ? 'blink' : 'open';
  if (read > .5) ey = 'down'; if (fall) ey = 'wide'; if (groom || shake) ey = 'squeeze'; if (deliver && (s.dph === 'yay' || s.dph === 'wave')) ey = 'happy'; if (bump) ey = 'squeeze'; if (land && sq > .6) ey = 'squeeze';
  const look = peri ? (Math.sin(t * 1.4) > 0 ? .6 : -.4) : 0;
  otterHead(R, K, 2.5, -15.4 - tall, tilt - ang * .55, { eyes: ey, look, eyeDy: read > .5 ? .5 : 0, mouth: (fall || bump) ? 'o' : (deliver && s.dph === 'yay') ? 'open' : 'smile', earUp: fall || peri, earBack: shake || skid, capDy: (s.capDy || 0) + (jump ? -.6 : 0), capTilt: fall ? -.2 : jump ? -.08 : skid ? .16 : 0, sniff, t, whisk: walk ? sw * .4 : 0 });
  R.pop();
  // 가까운 다리
  limb(R, 1.6, hipY, nf[0], nf[1], 3.6, 3.4, -1, 2, 1.5, 1.15, K.fur, footNear);
  R.D(nf[0] + 2.6, nf[1] + .1, '#3a2418');
  // 들고 있는 편지
  if (read > .5) envelope(R, (fh[0] + nh[0]) / 2 + .4, (fh[1] + nh[1]) / 2 - .6, 5.8, 3.8, -.1);
  if (deliver && (s.dph === 'hold' || s.dph === 'insert') && !s.thrown) envelope(R, nh[0] + 2, nh[1] - .8, 5.4, 3.6, -.25);
  // 가까운 팔
  limb(R, Sn[0], Sn[1], nh[0], nh[1], 2.8, 2.8, 1, 1.45, 1.2, 1.05, K.fur, { rx: 1.3, ry: 1.15, ramp: K.furLt });
  R.pop();
}

/* ---------- 네 발 자세: 달리기 · 달리며 뛰기 · 뛰어들기 · 배 미끄럼 · 일어나기 ---------- */
function poseQuad(R, s, K) {
  const t = s.t, m = s.mode, ph = s.phase || 0, k = s.k || 0;
  const run = m === 'run', rj = m === 'runjump', slide = m === 'slide', dive = m === 'dive', getup = m === 'getup';
  R.push(); R.rotate(s.angle || 0);
  let C, H, arch = 0, e = .8, bob = 0;
  if (run) { e = Math.cos(ph); bob = -Math.abs(Math.sin(ph)) * 1.5; C = [4.6 + 1.9 * e, -7.6 + bob]; H = [-4.6 - 1.9 * e, -7.2 + bob - (1 - e) * 1.1]; arch = (1 - e) * 1.3; }
  else if (rj) { C = [6.6, -8.6]; H = [-6.4, -7.8]; arch = -.6; }
  else {
    const f = slide ? 1 : dive ? smooth(k) : 1;
    C = [lerp(4.4, 5.8, f), lerp(-9, -3.9, f)]; H = [lerp(-4.2, -5.6, f), lerp(-7.2, -3.6, f)];
    if (getup) { const u = smooth(k); C = [lerp(5.8, 2.8, u), lerp(-3.9, -11.6, u)]; H = [lerp(-5.6, -1.4, u), lerp(-3.6, -6.8, u)]; }
  }
  const bodyA = Math.atan2(C[1] - H[1], C[0] - H[0]);
  const Mx = (C[0] + H[0]) / 2, My = (C[1] + H[1]) / 2 - arch;
  // 꼬리
  const tsw = (s.tailSw || 0) + (run ? Math.sin(ph + 1.2) * 1.4 : 0) + Math.sin(t * 3) * .3;
  let tp;
  if (slide || dive) tp = [[H[0] - 3.4, H[1] + .3], [H[0] - 7.6, H[1] - .4], [H[0] - 11.6, H[1] - 1.1 + tsw * .2], [H[0] - 15, H[1] - 1.9 + tsw * .4], [H[0] - 17.6, H[1] - 2.9 + tsw * .5]];
  else if (rj) tp = [[H[0] - 3.4, H[1] + .3], [H[0] - 7.8, H[1] + .2], [H[0] - 12, H[1] - .2 + tsw * .3], [H[0] - 15.6, H[1] - .8 + tsw * .6], [H[0] - 18.2, H[1] - 1.6 + tsw * .8]];
  else if (getup) tp = [[H[0] - 2.6, H[1] + .8], [H[0] - 6.4, H[1] + 3.4], [H[0] - 10.4, -1.8], [H[0] - 14, -2.4 + tsw * .4], [H[0] - 16.8, -3.6 + tsw * .6]];
  else tp = [[H[0] - 3.4, H[1] + .4], [H[0] - 7.4, H[1] + .8 + tsw * .3], [H[0] - 11.2, H[1] + .4 + tsw * .7], [H[0] - 14.6, H[1] - .5 + tsw], [H[0] - 17.2, H[1] - 1.8 + tsw * 1.2]];
  tailChain(R, tp, [2.6, 2.2, 1.7, 1.1, .6], K.fur);
  // 다리 위치
  const S = [C[0] + 1.6, C[1] + 1.6], J = [H[0] - .6, H[1] + 1.8];
  let fF, nF, fH, nH;
  if (run) {
    const fp = o => { const c = Math.cos(ph + o), sn = Math.sin(ph + o); return [S[0] + 4.4 * c, -(sn < 0 ? -sn * 3 : 0)]; };
    const hp = o => { const c = Math.cos(ph + o), sn = Math.sin(ph + o); return [J[0] - 4.4 * c, -(sn > 0 ? sn * 3 : 0)]; };
    fF = fp(.55); nF = fp(0); fH = hp(.55); nH = hp(0);
  } else if (rj) { fF = [C[0] + 7, C[1] + 4.6]; nF = [C[0] + 8.2, C[1] + 3.6]; fH = [H[0] - 6.4, H[1] + 3.8]; nH = [H[0] - 7.6, H[1] + 3]; }
  else if (getup) { const u = smooth(k); fF = [S[0] + lerp(7.6, .6, u), lerp(C[1] + .8, -.6, u)]; nF = [S[0] + lerp(8.4, 1.4, u), lerp(C[1] + 1.6, -.6, u)]; fH = [lerp(H[0] - 6, -1.6, u), lerp(H[1] + 1.6, -1, u)]; nH = [lerp(H[0] - 6.8, 1.8, u), lerp(H[1] + 2, -1, u)]; }
  else { const f = slide ? 1 : smooth(k); fF = [lerp(S[0] + 3, C[0] + 8.2, f), lerp(-.6, C[1] + .2, f)]; nF = [lerp(S[0] + 3.6, C[0] + 8.8, f), lerp(-.6, C[1] + 1.2, f)]; fH = [lerp(J[0] - 1, H[0] - 6, f), lerp(-1, H[1] + 1.4, f)]; nH = [lerp(J[0], H[0] - 6.8, f), lerp(-1, H[1] + 2, f)]; }
  const pawF = { rx: 1.7, ry: 1, dx: .6 }, pawH = { rx: 2, ry: 1, dx: .8 };
  limb(R, S[0] - .5, S[1], fF[0], fF[1], 3.2, 3.4, 1, 1.4, 1.15, 1, K.furFar, pawF);
  limb(R, J[0] - .3, J[1], fH[0], fH[1], 3.6, 3.6, -1, 1.9, 1.45, 1.1, K.furFar, pawH);
  // 몸통: 엉덩이 · 등 · 가슴
  R.E(H[0], H[1], 4.4, 3.8, bodyA * .4, K.fur);
  R.E(Mx, My, 4.4, 3.4, bodyA, K.fur);
  R.E(C[0], C[1], 4.4, 3.7, bodyA, K.fur);
  R.E(lerp(Mx, C[0], .6), lerp(My, C[1], .6) + 2.3, 4.8, 1.3, bodyA, K.cream);
  bag(R, Mx - 1.2, My + .5, bodyA + (s.bagA || 0) + .05, s);
  R.DL(C[0] + 1.2, C[1] - 2.6, Mx - 1.4, My - 1.8, OTK.strap);
  // 목과 머리
  const hb = run ? Math.sin(ph + .7) * .8 : 0;
  R.E(C[0] + 3, C[1] - 1.6 + hb * .5, 3, 2.6, bodyA, K.fur); R.E(C[0] + 3.6, C[1] - .4 + hb * .5, 1.8, 1.6, 0, K.cream);
  otterHead(R, K, C[0] + 5.8, C[1] - 3.2 + hb, (slide ? -.14 : rj ? -.1 : getup ? -.05 : .04) - bodyA * .5,
    { eyes: (slide || dive) ? 'happy' : (s.blink ? 'blink' : 'open'), mouth: (slide || rj) ? 'open' : 'smile', earBack: run || rj || slide || dive, capDy: s.capDy || 0, capTilt: slide ? -.36 : run ? -.12 : rj ? -.22 : 0, t, whisk: run ? Math.sin(ph) * .6 : 0 });
  // 가까운 다리
  limb(R, J[0] + .3, J[1] + .2, nH[0], nH[1], 3.6, 3.6, -1, 2, 1.5, 1.15, K.fur, Object.assign({ ramp: K.furLt }, pawH));
  limb(R, S[0] + .4, S[1] + .2, nF[0], nF[1], 3.2, 3.4, 1, 1.5, 1.2, 1.05, K.fur, Object.assign({ ramp: K.furLt }, pawF));
  R.pop();
}

/* ---------- 헤엄: 몸 전체 물결 · 수면 · 도약 · 둥둥 ---------- */
function poseSwim(R, s, K) {
  const t = s.t, m = s.mode, mv = s.moving ? 1 : .35, surf = m === 'surface', leap = m === 'leap', flt = m === 'float';
  R.push(); R.translate(0, flt ? -3.4 : -6.4); R.rotate(s.angle || 0);
  if (flt) {
    const wag = Math.sin(t * 2.2) * .6, rub = s.rub ? Math.sin(t * 12) * .8 : 0;
    tailChain(R, [[-8.6, .4], [-12.8, .6 + wag * .5], [-16.6, .5 + wag], [-19.8, .1 + wag]], [2.5, 2, 1.4, .8], K.fur);
    R.E(-1, .2, 6.6, 3.6, 0, K.fur); R.E(4, -.2, 5.2, 3.7, 0, K.fur);
    R.E(1.2, -2, 6.6, 1.9, 0, K.cream);
    R.E(-6.6, -3.6, 1.5, 2.1, -.3, K.furLt); R.E(-4.4, -4, 1.5, 2.1, -.2, K.furLt); R.D(-7, -5.4, '#5a3a25'); R.D(-4.8, -6, '#5a3a25');
    R.P([[-4.6, -2.8], [-4, -5.6], [-1.6, -6.6], [.8, -5.8], [1.4, -3], [-1.6, -2.6]], OTK.cap); R.P([[.8, -3.8], [3.8, -3.4], [3.6, -2.6], [.6, -3]], OTK.cap, { flat: 1 }); R.D(-1.6, -5, '#f2c450');
    envelope(R, 4.4, -5.6, 6.4, 3.9, -.06);
    R.E(1.6 + rub, -4.6, 1.4, 1.4, 0, K.furLt); R.E(7.4 - rub, -5, 1.4, 1.4, 0, K.furLt);
    otterHead(R, K, 10, -1.6, -.8 + Math.sin(t * 1.3) * .05, { eyes: s.blink ? 'blink' : 'happy', mouth: 'smile', noCap: true, t });
    R.pop(); return;
  }
  const amp = leap ? 0 : surf ? .55 : 1.5 * mv, spd = 7 + mv * 3, wave = i => Math.sin(t * spd - i * .95) * amp;
  const bend = s.bend || 0, arc = leap ? 2.4 : 0;
  const node = i => [6.4 - i * 4.1, wave(i) * (.3 + i * .25) + bend * Math.min(i, 4) * Math.min(i, 4) * .4 - arc * Math.sin(clamp(i / 5, 0, 1) * Math.PI) * 1.3];
  const N = [0, 1, 2, 3].map(node), T = [3, 4, 5, 6, 7].map(i => { const p = node(i); return [p[0] + (i > 3 ? (i - 3) * .3 : 0), p[1]]; });
  tailChain(R, T, [2.5, 2.1, 1.6, 1, .55], K.fur);
  const kick = Math.sin(t * 9) * 1.8 * mv;
  R.E(N[3][0] - 1.6 + kick, N[3][1] + 3, 2.2, 1.1, .3, K.furFar);
  const sF = [N[0][0] + 1.2, N[0][1] + 1.8];
  const pF = surf ? [sF[0] + 1.6 + Math.cos(t * 9 + 1.6) * 2, sF[1] + 1.6 + Math.sin(t * 9 + 1.6) * 1.1] : [sF[0] + 1.2, sF[1] + 1.4];
  limb(R, sF[0], sF[1], pF[0], pF[1], 2, 2, 1, 1.3, 1.1, .95, K.furFar, { rx: 1.3, ry: 1 });
  for (let i = 0; i < 3; i++) { const a = N[i], b = N[i + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, an = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI; R.E(mx, my, 3.2, 3.5 - i * .15, an, K.fur); }
  const a01 = Math.atan2(N[0][1] - N[1][1], N[0][0] - N[1][0]);
  R.E(N[0][0], N[0][1], 4.2, 3.6, a01, K.fur);
  R.E((N[0][0] + N[1][0]) / 2 + .6, (N[0][1] + N[1][1]) / 2 + 2.2, 4.8, 1.3, a01, K.cream);
  bag(R, (N[1][0] + N[2][0]) / 2, (N[1][1] + N[2][1]) / 2 - .4, a01 + .05 + (s.bagA || 0), s);
  R.DL(N[0][0] + 1, N[0][1] - 2.8, N[1][0], N[1][1] - 2.4, OTK.strap);
  R.E(N[3][0] - .4 - kick, N[3][1] + 3.2, 2.3, 1.15, .3, K.fur);
  const pN = surf ? [sF[0] + 2.2 + Math.cos(t * 9) * 2, sF[1] + 1.8 + Math.sin(t * 9) * 1.1] : [sF[0] + 1.8, sF[1] + 1.8];
  R.E(N[0][0] + 3.4, N[0][1] - 1.2, 2.8, 2.6, a01, K.fur);
  otterHead(R, K, N[0][0] + 5.8, N[0][1] - 1.6 - (surf ? 1.4 : 0), (surf ? -.3 : -.05) - (s.angle || 0) * .4 + wave(0) * .04,
    { eyes: leap ? 'happy' : (s.blink ? 'blink' : 'open'), mouth: leap ? 'open' : 'smile', earBack: true, capTilt: -.12, capDy: s.capDy || 0, t });
  limb(R, sF[0] + .4, sF[1] + .3, pN[0], pN[1], 2.1, 2.1, 1, 1.4, 1.15, 1, K.fur, { rx: 1.35, ry: 1.05, ramp: K.furLt });
  R.pop();
}

/* ---------- 가장자리 매달리기 · 영차 올라가기 ---------- */
function poseHang(R, s, K) {
  const t = s.t, k = s.k || 0, lx = s.lx, ly = s.ly, pull = clamp((k - .3) / .7, 0, 1);
  const kick = (1 - pull) * Math.sin(t * 15) * 1.5, lean = .08 + pull * .55, hipY = -6.6;
  tailChain(R, [[-2.2, hipY + .4], [-4.2, -2.6], [-5.4, 1.4 - pull * 2], [-6, 4.8 - pull * 4], [-6.2, 7.4 - pull * 6]], [2.6, 2.2, 1.7, 1.1, .6], K.fur);
  limb(R, -.5, hipY, -.8 + kick, -.6 + Math.abs(kick) * .3, 3.6, 3.4, -1, 1.9, 1.45, 1.1, K.furFar, { rx: 2.2, ry: 1, dx: .9 });
  const pv = [.5, hipY], sh = (x, y) => { const p = rotP(x, y, lean); return [pv[0] + p[0], pv[1] + p[1]]; };
  const Sf = sh(0, -8.6), Sn = sh(2, -8.4);
  limb(R, Sf[0], Sf[1], lx - .4, ly + .6, 3.2, 3.2, 1, 1.35, 1.15, 1, K.furFar, { rx: 1.3, ry: 1.1 });
  R.push(); R.translate(pv[0], pv[1]); R.rotate(lean);
  R.E(0, -4.4, 4.2, 6.9, .02, K.fur); R.E(1.6, -4.9, 2.3, 5.2, .02, K.cream);
  bag(R, -3.3, -2.3, .3 + Math.sin(t * 15) * .08 * (1 - pull), s);
  R.DL(2.4, -10, -2.2, -4.6, OTK.strap);
  R.E(1.5, -10.6, 3.3, 2.8, 0, K.fur); R.E(2.7, -10.2, 1.7, 2.2, 0, K.cream);
  otterHead(R, K, 2.5, -15.4, -.22 + pull * .3 - lean * .5, { eyes: pull > .1 ? 'squeeze' : 'open', mouth: pull > .1 ? 'o' : 'smile', earBack: true, t, capDy: s.capDy || 0 });
  R.pop();
  const nfoot = pull > .45 ? [lerp(2.2, lx + 2.4, (pull - .45) / .55), lerp(-.6, ly - .6, (pull - .45) / .55)] : [2 - kick, -.4];
  limb(R, 1.6, hipY, nfoot[0], nfoot[1], 3.6, 3.4, -1, 2, 1.5, 1.15, K.fur, { rx: 2.3, ry: 1.05, dx: 1, ramp: K.furLt });
  limb(R, Sn[0], Sn[1], lx + 1.4, ly + .3, 3.3, 3.3, 1, 1.45, 1.2, 1.05, K.fur, { rx: 1.35, ry: 1.15, ramp: K.furLt });
}

const OTB = new PB(88, 72), OTC = makeCanvas(88, 72)[0];
const QUAD_MODES = new Set(['run', 'runjump', 'slide', 'dive', 'getup']), SWIM_MODES = new Set(['swim', 'surface', 'leap', 'float']);
function drawOtter(g, x, y, face, s) {
  const K = s.wet > .3 ? OTK_WET : OTK;
  RIG.reset(face, 44, 54);
  if (QUAD_MODES.has(s.mode)) poseQuad(RIG, s, K);
  else if (SWIM_MODES.has(s.mode)) poseSwim(RIG, s, K);
  else if (s.mode === 'hang') poseHang(RIG, s, K);
  else poseStand(RIG, s, K);
  rasterRig(OTB, RIG, { outline: K.outline, rim: 54, rimCol: '#ffe2b8' });
  pbToCanvas(OTB, OTC);
  g.drawImage(OTC, Math.round(x) - 44, Math.round(y) - 54);
}
function otterPortrait() {
  const pb = new PB(40, 40); RIG.reset(1, 0, 0); RIG.m = [1.5, 0, 0, 1.5, 15, 64]; poseStand(RIG, { mode: 'idle', t: 1 }, OTK);
  rasterRig(pb, RIG, { outline: OTK.outline }); return pb.canvas();
}
