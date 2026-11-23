'use strict';
/* =========================================================
   솔 · 게임용 관절 그림 (실제 고양이 비율)
   단위: 발 가운데가 원점, 위가 -y, 오른쪽을 봄. 몸길이(코~엉덩이) 약 40. 게임에서는 배율 .7
   걸음걸이는 실제 고양이의 발 순서를 따름
     걷기      뒷발 → 같은 쪽 앞발 → 반대쪽 뒷발 → 앞발 (네 박자, 뒷발이 앞발 자국을 밟음)
     종종걸음  대각선 두 발이 함께 (두 박자)
     달리기    뒷발 둘이 차고 앞발 둘이 받음. 등이 펴졌다 말렸다 함
     몰래 걷기 배를 땅에 붙이고 한 발씩, 머리는 흔들리지 않음
   발이 미끄러지지 않도록 '한 바퀴에 나아가는 거리(lam)'로 발 폭을 정함
   ========================================================= */
const gmod = (a, n) => ((a % n) + n) % n;
const G_ST = { cel: [-.02, .58], cast: true, contour: true, olCol: '#1c1618', outline: '#1c1618', clean: true, light: lightDir(.6, -.55, .58) };
// 좌우가 다른 도장: 뒤집어 그릴 때 줄을 거꾸로
Rig.prototype.stampM = function (x, y, rows, pal, ax = 0, ay = 0, post) {
  const m = this.m;
  if (m[0] * m[3] - m[1] * m[2] < 0) { rows = rows.map(r => r.split('').reverse().join('')); ax = rows[0].length - 1 - ax; }
  this.stamp(x, y, rows, pal, ax, ay, post);
};
// 발 하나의 한 바퀴: 딛는 동안(duty) 뒤로 밀리고, 뗀 동안 앞으로 돌아오며 들림 → [x, 들린 높이]
function gaitF(p, amp, lift, duty) {
  p -= Math.floor(p);
  if (p < duty) return [amp * (1 - 2 * p / duty), 0];
  const t = (p - duty) / (1 - duty);
  return [amp * (-1 + 2 * smooth(t)), lift * Math.sin(t * Math.PI)];
}

const SOLP = {
  FUR: ['#68574a', '#94806a', '#b29e84'], FURD: ['#544638', '#7a6858', '#94806a'], STR: ['#2e241e', '#43352c', '#5a4a3e'], STRD: ['#241c16', '#382c24', '#4a3c32'],
  WHT: ['#c9c0b4', '#f0e9de', '#ffffff'], WHTD: ['#a8a094', '#cfc6ba', '#e4dcd0'], PINK: ['#c47a76', '#e8a09c', '#f4c0bc'], RED: ['#8a2a1e', '#c84430', '#e06a50'], REDD: ['#5e1a12', '#8a2a1e', '#a83a2a'],
  NOSE: ['#b8605c', '#e08a86', '#f4b0aa'], BIRD: ['#4e3c2c', '#7e6248', '#a4866a'],
};
const SOL_EYE = { L: '#2a1c18', G: '#9cc850', g: '#c8e47a', P: '#141010', s: '#5a463c' };
const SOL_EYES = { open: ['LL', 'gP'], wide: ['LL', 'PP'], half: ['..', 'LL'], shut: ['..', 'ss'] };
const solStripeT = (x, y, t) => (gmod(t * 2.2, 1) < .4 ? 0 : -1);

/* ---------- 머리 (옆) ---------- */
// o.ear 0 앞 · 1 뒤로 젖힘 · 2 옆으로(불안), o.eye, o.tilt(+ 코가 아래로), o.hiss, o.yawn, o.prey
function solHead(R, hx, hy, o = {}) {
  const { FUR, FURD, STR, WHT, PINK } = SOLP, e = o.ear || 0;
  R.push(); R.translate(hx, hy); R.rotate(o.tilt || 0);
  if (e === 1) {
    R.P([[-2.6, -3.4], [-7.6, -6.6], [-1.4, -5.4]], FURD, { g: 'earF' });
    R.P([[-.8, -4.2], [-6.4, -8], [-5.2, -7.2], [-5.8, -8.4], [1, -5]], FUR, { g: 'earN', ol: 1 });
  } else if (e === 2) {
    R.P([[-3.4, -3.6], [-6.6, -8.2], [-.6, -4.8]], FURD, { g: 'earF' });
    R.P([[-.8, -4.4], [-2.6, -9.8], [-1.7, -9], [-1.3, -10], [3.2, -4.4]], FUR, { g: 'earN', ol: 1 });
  } else {
    R.P([[-3.2, -3.6], [-2.6, -10], [.6, -4.6]], FURD, { g: 'earF' });
    R.P([[-.4, -4.4], [1.6, -10.4], [2.3, -9.3], [2.9, -10.1], [4.2, -4]], FUR, { g: 'earN', ol: 1 });
    R.P([[.7, -5], [1.8, -8.4], [3.1, -4.8]], PINK, { g: 'earIn', cast: 0 });
  }
  R.E(0, 0, 6.7, 5.8, 0, FUR, R.pat({ g: 'head', alts: [STR], alt: (x, y) => (y < -2.2 && x < 2.4 && Math.abs(gmod(x + 10, 2.4) - 1.2) < .42 ? 0 : -1) }));
  R.E(-.6, 2.8, 4.8, 3.4, 0, FUR, R.pat({ g: 'head', alts: [STR], alt: (x, y) => (Math.abs(y - (2.2 + x * .22)) < .45 && x < 1 ? 0 : -1) }));
  R.P([[-5.6, 3.4], [-7.2, 4.4], [-5, 5.4]], FUR, { g: 'head' });
  R.E(3.8, 1.8, 2.6, 2.1, 0, WHT, { g: 'muz' }); R.E(2.8, 2.6, 2.6, 2, 0, WHT, { g: 'muz' }); R.E(3.4, 4, 1.9, 1.1, 0, WHT, { g: 'chin' });
  R.stampM(2.8, -1, SOL_EYES[o.eye || 'open'], SOL_EYE, 1, 0);
  R.P([[4.8, -.9], [7.1, -.6], [6.3, 1.2]], SOLP.NOSE, { g: 'nose', ol: 1, cast: 0 });
  if (o.hiss) R.stampM(4.6, 2.8, ['MMMM', 'MwwM', '.MM.'], { M: '#3a1a18', w: '#fffaf0' }, 1, 0);
  else if (o.yawn) { R.E(5, 3.4, 2.1, 2.5, .2, ['#4a1616', '#7a2626', '#a04040'], { g: 'yawn', ol: 1 }); R.stampM(5.6, 1.6, ['w.w'], { w: '#fffaf0' }, 1, 0); }
  else { R.DL(6.1, 1.3, 6, 2.6, '#3a2220'); R.DL(6, 2.6, 5.1, 3.3, '#3a2220'); R.DL(5.1, 3.3, 4, 3, '#3a2220'); R.DL(6, 2.6, 6.6, 3.1, '#3a2220'); }
  if (o.prey) { R.E(8.6, 3.6, 3, 2.1, .25, SOLP.BIRD, { g: 'prey', ol: 1 }); R.P([[10.4, 4.2], [14, 6.4], [11.6, 6]], SOLP.BIRD, { g: 'preyT', ol: 1 }); R.E(7.4, 4.6, 1.5, 1.2, 0, ['#b8a48a', '#dccab0', '#f0e2cc'], { g: 'preyB' }); }
  R.W(3.6, 2.4, 5.6, 4.6, '#cac4ba'); R.W(3, 2.8, 4.4, 5.2, '#bcb6ac');
  R.pop();
}
function solRibbon(R, x1, y1, x2, y2) {
  const { RED, REDD } = SOLP;
  R.K2(x1, y1, x2, y2, 1.05, 1.05, RED, { g: 'rib', ol: 1 });
  R.E(x2 + .6, y2 - .2, 1.5, 1.1, -.4, RED, { g: 'bow', ol: 1 }); R.E(x2 - .4, y2 + .9, 1.2, .9, .4, RED, { g: 'bow2', ol: 1 });
  R.K2(x2 + .2, y2 + .4, x2 + 1, y2 + 2.8, .5, .4, REDD, { g: 'bowT' });
}
// 다리: 몸에 붙는 곳 tp → 발 ft. 다리가 접히면(웅크림) 관절이 뒤로 튀어나옴
function solLeg(R, tp, ft, r1, r2, far, front, g) {
  const { FUR, FURD, STR, STRD, WHT, WHTD } = SOLP; r1 *= .8; r2 *= .8;
  const ex = ft[0], ey = ft[1] - 1.1, d = Math.hypot(ex - tp[0], ey - tp[1]), L = front ? 14 : 10, sl = d < L ? Math.sqrt(L * L - d * d) * .5 : 0;
  const jx = (tp[0] + ex) / 2 - (front ? .8 : 2.6) - sl * (front ? .9 : .7), jy = (tp[1] + ey) / 2 + (front ? -sl * .2 : 1.2);
  const pal = far ? FURD : FUR, o = () => R.pat(Object.assign({ g, alts: [far ? STRD : STR], alt: (x, y) => (gmod(y + 40, 3.4) < 1 ? 0 : -1) }, far ? { b: -.1 } : { ol: 2 }));
  R.K2(tp[0], tp[1], jx, jy, r1, (r1 + r2) / 2, pal, o()); R.K2(jx, jy, ex, ey, (r1 + r2) / 2, r2, pal, o());
  R.E(ex + .6, ey + .2, 2.2, 1.15, 0, far ? WHTD : WHT, Object.assign({ g: g + 'p' }, far ? { b: -.1 } : {}));
}

/* ---------- 몸 (옆) ----------
   q.drop 몸을 낮춤 · q.pitch 몸 기울기(+ 앞이 낮음) · q.st 등이 늘어남 · q.arch 등이 솟음 · q.puff 털 세움
   q.f {nf, ff, nh, fh: [앞뒤, 들린 높이]} · q.head [dx, dy] · q.tilt · q.tail 이름 · q.tw 꼬리 흔들림 */
const SOL_TAIL = {
  level: [[-14, -19], [-20, -19.6], [-25, -18.6], [-29.4, -17.4], [-33, -17.8]],
  up: [[-13.4, -21], [-15.6, -27], [-16, -33], [-15.2, -38.4], [-12.6, -41]],
  low: [[-14, -18], [-19.4, -15], [-23, -10.4], [-24.6, -5.4], [-23.6, -2]],
  flat: [[-14, -18.4], [-21, -17], [-27.4, -16], [-33.6, -16.4], [-38, -17.6]],
  puff: [[-12, -21], [-15, -27], [-15.4, -33], [-14.6, -38], [-13.4, -41.6]],
};
function solTail(R, pts, puff) {
  const { FUR, STR } = SOLP;
  R.chain(pts, puff ? [2.3, 2.8, 2.8, 2.5, 2] : [1.84, 1.68, 1.52, 1.36, 1.12], FUR, R.pat({ g: 'tail', ol: 1, alts: [STR], alt: solStripeT }));
  if (puff) for (let i = 0; i < pts.length - 1; i++) for (const sd of [-1, 1]) {
    const a = pts[i], b = pts[i + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l * sd, ny = (b[0] - a[0]) / l * sd;
    R.P([[mx + nx * 2 - ny * .9, my + ny * 2 + nx * .9], [mx + nx * 4.4, my + ny * 4.4], [mx + nx * 2 + ny * .9, my + ny * 2 - nx * .9]], FUR, { g: 'tail' });
  }
}
function solSide(R, q = {}) {
  const { FUR, STR, WHT } = SOLP;
  const drop = q.drop || 0, pitch = q.pitch || 0, st = q.st || 0, arch = q.arch || 0, puff = q.puff || 0, f = q.f || {}, tw = q.tw || 0;
  const c = Math.cos(pitch), s = Math.sin(pitch);
  const D = (x, y) => [x + (x > 0 ? 1 : -1) * st * Math.min(1, Math.abs(x) / 8), y - arch * Math.max(0, 1 - x * x / 256)];
  const T = (x, y) => { const d = D(x, y), dy = d[1] + 17; return [d[0] * c - dy * s, -17 + d[0] * s + dy * c + drop]; };
  const tn = q.tail || 'level', vert = tn === 'up' || tn === 'puff';
  const tl = q.tailAbs || SOL_TAIL[tn].map((p, i, a) => { const t = T(p[0], p[1]), k = i / (a.length - 1); return vert ? [t[0] + tw * k * k * 3.4, t[1]] : [t[0], t[1] + tw * k * k * 3]; });
  if (!q.tailFront) solTail(R, tl, puff);
  const leg = (k, tx, ty, nx, r1, r2, far, front) => { const o = f[k] || [0, 0], tp = T(tx, ty); tp[0] += o[0] * .3; solLeg(R, tp, [nx + o[0], -(o[1] || 0)], r1, r2, far, front, k); };
  leg('ff', 6.6, -15, 7.6, 2.4, 1.7, true, true); leg('fh', -8.8, -10, -13.6, 2.6, 1.6, true, false);
  R.push(); R.translate(0, drop - 17); R.rotate(pitch); R.translate(0, 17);
  const dors = x => -23.4 - arch * Math.max(0, 1 - x * x / 256);
  const stripe = (x, y) => (y < dors(x) + Math.sin(x * .4) * .4 || (y < -13 && gmod(x + Math.sin(y * .7) * 1.4, 4.4) < 1.5) ? 0 : -1);
  const E = (x, y, rx, ry, a, pal, o) => { const d = D(x, y); R.E(d[0], d[1], rx, ry, a, pal, o); };
  E(-6, -17.6, 10.5 + st * .4, 7, 0, FUR, R.pat({ g: 'body', alts: [STR], alt: stripe }));
  E(6.4, -17.4, 8.6, 7.8, 0, FUR, R.pat({ g: 'body', alts: [STR], alt: stripe }));
  E(-10, -15.6, 6.6, 7.4, 0, FUR, R.pat({ g: 'body', alts: [STR], alt: (x, y) => (gmod(x * .8 + y * .5 + 20, 4) < 1.3 ? 0 : -1) }));
  if (puff) for (let x = -14; x <= 12; x += 2.4) { const yy = -17.6 - 7.2 * Math.sqrt(Math.max(0, 1 - (x + 1) * (x + 1) / 230)) - arch * Math.max(0, 1 - x * x / 256); R.P([[x - 1.2, yy + 1.6], [x + .3, yy - 2.2 * puff], [x + 1.3, yy + 1.6]], FUR, { g: 'body' }); }
  E(1, -11.4, 9.4 + st * .4, 2.6, 0, WHT, { g: 'belly' });
  E(11.8, -14.6, 3.6, 4.8, -.3, WHT, { g: 'chest' });
  R.pop();
  leg('nf', 9.4, -15, 10.6, 2.5, 1.8, false, true); leg('nh', -7, -10, -11.4, 2.7, 1.7, false, false);
  const nb = T(11, -21), hd = T(18, -28.6), ho = q.head || [0, 0]; hd[0] += ho[0]; hd[1] += ho[1];
  const ne = [hd[0] - 2.6, hd[1] + 2], dx = ne[0] - nb[0], dy = ne[1] - nb[1], l = Math.hypot(dx, dy) || 1, px = -dy / l * 3.3, py = dx / l * 3.3, mx = (nb[0] + ne[0]) / 2, my = (nb[1] + ne[1]) / 2;
  R.K2(nb[0], nb[1], ne[0], ne[1], 4.6, 4, FUR, R.pat({ g: 'neck', alts: [STR], alt: (x, y) => (gmod(x - y * .6 + 40, 4) < 1.2 ? 0 : -1) }));
  solRibbon(R, mx - px, my - py, mx + px, my + py);
  solHead(R, hd[0], hd[1], q);
  if (q.tailFront) solTail(R, tl, puff);
}
const SOLG = {
  walk: { lam: 36, duty: .64, lift: 2.2, ph: { nh: 0, nf: .25, fh: .5, ff: .75 } },
  trot: { lam: 52, duty: .5, lift: 3.2, ph: { nf: 0, fh: 0, ff: .5, nh: .5 } },
  run: { lam: 92, duty: .26, lift: 5, ph: { fh: 0, nh: .1, ff: .5, nf: .62 } },
  stalk: { lam: 24, duty: .76, lift: 1.6, ph: { nh: 0, nf: .25, fh: .5, ff: .75 } },
};
function solGait(g, p, q = {}) {
  const G = SOLG[g], amp = G.lam * G.duty / 2, a = p * TAU; q.f = {};
  for (const k in G.ph) q.f[k] = gaitF(p + G.ph[k], amp, G.lift, G.duty);
  if (g === 'walk') { q.drop = Math.cos(a * 2) * .35; if (q.tw == null) q.tw = Math.sin(a) * .5; }
  else if (g === 'trot') { q.drop = Math.cos(a * 2) * .7; if (q.tw == null) q.tw = Math.sin(a * 2) * .4; }
  else if (g === 'run') { const e = Math.cos((p - .42) * TAU); q.st = e * 4.5; q.arch = Math.max(0, -e) * 3.2; q.pitch = Math.sin((p - .2) * TAU) * .1; q.drop = -1.2 - Math.cos((p - .42) * TAU * 2) * 1.1; q.tail = q.tail || 'flat'; q.tw = e * .5; q.head = [e * 1.5, 1.5 - e]; }
  else { q.drop = 6.2 + Math.cos(a * 2) * .2; q.head = [3.5, 7]; q.tail = q.tail || 'flat'; if (q.tw == null) q.tw = Math.sin(a * 3) * .25; q.eye = q.eye || 'wide'; }
  return q;
}

/* ---------- 앉기 · 식빵 · 말고 자기 (옆) ---------- */
// q.act: 'lick' 앞발 핥기 · 'wash' 얼굴 닦기 · 'scratch' 뒷발로 목 긁기, q.fr 프레임, q.tail 'wrap' | 'out'
function solSit(R, q = {}) {
  const { FUR, FURD, STR, WHT, WHTD } = SOLP, fr = q.fr || 0, act = q.act, tw = q.tw || 0;
  const tp = q.tail === 'out' ? [[-10, -3], [-15.4, -1.6], [-21, -1.2], [-26, -1.5 - tw * 1.6], [-30, -2 - tw * 4]] : [[-11, -3], [-13.6, -1.4], [-7, -.9], [3, -.9], [10.6, -1.3 - tw * 1.4]];
  R.chain(tp, [1.68, 1.6, 1.44, 1.28, 1.12], FUR, R.pat({ g: 'tail', ol: 1, alts: [STR], alt: solStripeT }));
  R.K2(3.6, -13, 4.6, -1.4, 1.76, 1.36, FURD, { g: 'ff', b: -.1 }); R.E(5.4, -.9, 2.5, 1.2, 0, WHTD, { g: 'ffp' });
  R.E(-4, -8, 9, 8, 0, FUR, R.pat({ g: 'hip', alts: [STR], alt: (x, y) => (gmod(x * .8 + y * .5 + 20, 4) < 1.3 ? 0 : -1) }));
  if (act === 'scratch') { const k = fr % 2 ? 1 : 0; R.K2(-1, -8, 3.6, -13 - k, 2.2, 1.6, FUR, { g: 'hl', ol: 1 }); R.K2(3.6, -13 - k, 8 + k * .6, -20 + k * 1.6, 1.5, 1.2, FUR, { g: 'hl', ol: 1 }); R.E(8.6 + k * .6, -20.6 + k * 1.6, 2, 1.2, -.8, WHT, { g: 'hlp' }); }
  else R.E(2.6, -1.2, 4.4, 1.5, 0, WHT, { g: 'hp' });
  R.E(1.6, -17, 6.6, 10, -.22, FUR, R.pat({ g: 'torso', alts: [STR], alt: (x, y) => (x < 3 && gmod(y + x * .5 + 40, 4.2) < 1.4 ? 0 : -1) }));
  R.E(5.8, -16.6, 3.2, 7, -.18, WHT, { g: 'chest' });
  const legO = () => R.pat({ g: 'nf', ol: 2, alts: [STR], alt: (x, y) => (gmod(y + 40, 3.4) < 1 && y < -5 ? 0 : -1) });
  let head = [8.4, -29.6], tilt = q.tilt || 0;
  if (act === 'lick') { const k = fr % 2; R.K2(6.4, -14, 10, -12.6, 1.84, 1.6, FUR, legO()); R.K2(10, -12.6, 12.2, -20.4 + k * .8, 1.6, 1.3, FUR, legO()); R.E(12.4, -21.2 + k * .8, 1.9, 1.5, 0, WHT, { g: 'nfp' }); head = [8.8, -28.4 + k * .9]; tilt = .5; }
  else if (act === 'wash') { const k = [0, 1, 2, 1][fr % 4]; R.K2(6.4, -14, 11, -14, 1.84, 1.6, FUR, legO()); R.K2(11, -14, 13.6 - k * .5, -25 - k * 2.2, 1.6, 1.3, FUR, legO()); head = [8.6, -28.6]; tilt = .32; }
  else { R.K2(6.4, -13.6, 7.4, -1.6, 1.84, 1.44, FUR, legO()); R.E(8.2, -1, 2.6, 1.3, 0, WHT, { g: 'nfp' }); }
  if (act === 'scratch') { head = [7.6, -28.2]; tilt = -.3 + (fr % 2 ? .08 : 0); }
  const ho = q.head || [0, 0];
  solRibbon(R, 3, -24.6, 8.6, -21.4);
  solHead(R, head[0] + ho[0], head[1] + ho[1], Object.assign({}, q, { tilt, eye: act ? 'shut' : q.eye, ear: act === 'scratch' ? 2 : q.ear }));
  if (act === 'wash') { const k = [0, 1, 2, 1][fr % 4]; R.E(13.8 - k * .5, -25.8 - k * 2.2, 2, 1.6, 0, WHT, { g: 'nfp', ol: 1 }); }
}
function solLoaf(R, q = {}) {
  const { FUR, STR, WHT } = SOLP, br = q.fr % 2 ? .35 : 0;
  R.chain([[-12, -3.4], [-9, -1], [-1, -.7], [7, -1]], [1.68, 1.52, 1.36, 1.2], FUR, R.pat({ g: 'tail', ol: 1, alts: [STR], alt: solStripeT }));
  R.E(-1, -8.4 - br * .5, 13, 8.4 + br, 0, FUR, R.pat({ g: 'body', alts: [STR], alt: (x, y) => (y < -6 && gmod(x + Math.sin(y * .7) * 1.4 + 40, 4.4) < 1.5 ? 0 : -1) }));
  R.E(7.4, -8.6, 6, 7, 0, FUR, { g: 'body' });
  R.E(9.6, -5.4, 3.6, 4.4, 0, WHT, { g: 'chest' });
  if (q.knead) { const k = q.fr % 2; R.E(12.6, -1.2 - k * 1.6, 2.6, 1.3, 0, WHT, { g: 'pawA', ol: 1 }); R.E(15, -1.2 - (1 - k) * 1.6, 2.6, 1.3, 0, WHT, { g: 'pawB', ol: 1 }); }
  else R.E(11.4, -1.3, 3, 1.3, 0, WHT, { g: 'paw' });
  solRibbon(R, 6.4, -15.2, 11, -11.4);
  solHead(R, 13, -18.4 + br * .4, Object.assign({ eye: 'half' }, q));
}
function solCurl(R, q = {}) {
  const { FUR, STR, WHT } = SOLP, br = q.fr % 2 ? .4 : 0;
  R.E(-1, -6.8 - br * .5, 13.4, 6.8 + br, 0, FUR, R.pat({ g: 'body', alts: [STR], alt: (x, y) => (y < -5 && gmod(x * .9 + Math.sin(y * .8) * 1.2 + 40, 4.4) < 1.5 ? 0 : -1) }));
  R.E(-6, -6.4, 7.6, 6.6, 0, FUR, R.pat({ g: 'body', alts: [STR], alt: (x, y) => (gmod(x * .8 + y * .5 + 20, 4) < 1.3 ? 0 : -1) }));
  solHead(R, 7.6, -6.4, Object.assign({}, q, { tilt: .62, eye: 'shut' }));
  R.E(11, -1.4, 3, 1.3, 0, WHT, { g: 'paw', ol: 1 });
  R.chain([[-12.6, -4], [-10, -1.2], [-2, -.8], [6, -1.2], [10.4, -3]], [1.76, 1.6, 1.44, 1.28, 1.12], FUR, R.pat({ g: 'tail', ol: 1, alts: [STR], alt: solStripeT }));
}

/* ---------- 앞모습 · 뒷모습 ---------- */
function solHeadF(R, x, y, o = {}) {
  const { FUR, STR, WHT, PINK } = SOLP, e = o.ear || 0;
  R.push(); R.translate(x, y); R.rotate(o.tilt || 0);
  for (const sd of [-1, 1]) {
    if (e === 1) R.P([[sd * 3.2, -3.4], [sd * 8.8, -4.4], [sd * 5.6, -1]], FUR, { g: 'ear' + sd, ol: 1 });
    else if (e === 2) R.P([[sd * 2.6, -4], [sd * 8, -8], [sd * 6.4, -2.4]], FUR, { g: 'ear' + sd, ol: 1 });
    else {   // 보는 쪽에서 오른쪽(솔의 왼쪽) 귀 끝이 찢어짐
      R.P(sd > 0 ? [[2, -4.2], [4.6, -10.2], [5.3, -9.2], [6, -10], [6.8, -2.8]] : [[-2, -4.2], [-5.4, -10.6], [-6.8, -2.8]], FUR, { g: 'ear' + sd, ol: 1 });
      R.P([[sd * 3, -4.6], [sd * 5.2, -8.6], [sd * 5.9, -3.6]], PINK, { g: 'earIn' + sd, cast: 0 });
    }
  }
  R.E(0, 0, 7, 5.9, 0, FUR, R.pat({ g: 'head', alts: [STR], alt: (px, py) => (py < -2.4 && Math.abs(gmod(px + 1.2, 2.4) - 1.2) < .42 ? 0 : Math.abs(px) > 3.6 && Math.abs(py - .6 - Math.abs(px) * .2) < .45 ? 0 : -1) }));
  for (const sd of [-1, 1]) R.P([[sd * 5.8, 1.4], [sd * 8.2, 3.2], [sd * 5.2, 4.4]], FUR, { g: 'head' });
  R.E(0, 2.5, 3.4, 2.4, 0, WHT, { g: 'muz' }); R.E(0, 4.2, 2, 1.1, 0, WHT, { g: 'muz' });
  const ey = SOL_EYES[o.eye || 'open'];
  R.stamp(-2.9, -.8, ey, SOL_EYE, 1, 0); R.stamp(2.9, -.8, ey.map(r => r.split('').reverse().join('')), SOL_EYE, 0, 0);
  R.stamp(0, 1.2, ['n'], { n: '#e08a86' }, 0, 0);
  if (o.hiss) R.stamp(0, 2.4, ['MMM', 'MwM'], { M: '#3a1a18', w: '#fffaf0' }, 1, 0);
  else if (o.yawn) R.E(0, 3.6, 2, 2.4, 0, ['#4a1616', '#7a2626', '#a04040'], { g: 'yawn', ol: 1 });
  else R.stamp(0, 2.4, ['m'], { m: '#7a5a52' }, 0, 0);
  if (o.prey) { R.E(0, 5, 3.6, 2, 0, SOLP.BIRD, { g: 'prey', ol: 1 }); R.P([[3, 5], [6.4, 7.4], [3.6, 6.6]], SOLP.BIRD, { g: 'preyT', ol: 1 }); }
  for (const sd of [-1, 1]) R.W(sd * 4, 2.8, sd * 7.4, 3.8, '#cac4ba');
  R.pop();
}
function solHeadB(R, x, y, o = {}) {
  const { FUR, FURD, STR } = SOLP, e = o.ear || 0;
  R.push(); R.translate(x, y); R.rotate(o.tilt || 0);
  for (const sd of [-1, 1]) R.P(e === 1 ? [[sd * 3.2, -3.4], [sd * 8.6, -4.2], [sd * 5.6, -1]] : sd > 0 ? [[2, -4.2], [4.6, -10.2], [5.3, -9.2], [6, -10], [6.8, -2.8]] : [[-2, -4.2], [-5.4, -10.6], [-6.8, -2.8]], FURD, { g: 'ear' + sd, ol: 1 });
  R.E(0, 0, 6.8, 5.7, 0, FUR, R.pat({ g: 'head', alts: [STR], alt: (px, py) => (Math.abs(gmod(px + 1.2, 2.4) - 1.2) < .42 && py < 1.4 ? 0 : -1) }));
  R.pop();
}
const solLegO = (R, g) => R.pat({ g, ol: 2, alts: [SOLP.STR], alt: (x, y) => (gmod(y + 40, 3.4) < 1 && y < -5 ? 0 : -1) });
// q.p 걷기(0~1) · q.amp 걸음 크기 · q.sit 앉기 · q.tail 'up'
function solFront(R, q = {}) {
  const { FUR, FURD, STR, WHT, WHTD, RED } = SOLP, w = q.p != null, a = w ? q.p * TAU : 0, amp = q.amp || 1, s = Math.sin(a) * amp, bob = w ? Math.abs(Math.cos(a)) * .7 * amp : 0, tw = q.tw || 0;
  const tailO = () => R.pat({ g: 'tail', ol: 1, alts: [STR], alt: solStripeT });
  if (q.tail === 'up' || q.puff) solTail(R, [[1, -18], [2.4 + tw, -26], [3 + tw * 1.6, -32], [2.2 + tw * 2.4, -37.6], [-.6 + tw * 3, -40]], q.puff);
  else if (!q.sit) R.chain([[5, -15 - bob], [9, -14.4], [12 + tw, -11.6], [13 + tw * 1.6, -8]], [1.6, 1.5, 1.3, 1.1], FURD, tailO());
  if (q.sit) {
    R.E(0, -8.4, 9.2, 8.2, 0, FUR, R.pat({ g: 'hip', alts: [STR], alt: (x, y) => (Math.abs(x) > 4.4 && gmod(y + Math.abs(x) * .5 + 40, 4) < 1.3 ? 0 : -1) }));
    for (const sd of [-1, 1]) R.E(sd * 6.6, -1.2, 3, 1.4, 0, WHT, { g: 'hp' + sd });
    R.E(0, -15, 5.6, 7.6, 0, FUR, { g: 'torso' }); R.E(0, -13, 3.4, 6.4, 0, WHT, { g: 'bib' });
    for (const sd of [-1, 1]) { R.K2(sd * 2.2, -12, sd * 2.2, -1.8, 1.7, 1.4, FUR, solLegO(R, 'f' + sd)); R.E(sd * 2.2, -1, 2.1, 1.2, 0, WHT, { g: 'fp' + sd }); }
    if (q.tail !== 'up') R.chain([[8.4, -4], [9.8, -1.6], [4, -.8], [-3, -.9 - tw]], [1.6, 1.5, 1.3, 1.1], FUR, tailO());
    R.K2(-3.4, -19.6, 3.4, -19.6, 1, 1, RED, { g: 'rib', ol: 1 }); R.E(2.8, -18.4, 1.5, 1.2, 0, RED, { g: 'bow', ol: 1 });
    solHeadF(R, (q.head || [0, 0])[0], -25.4 + (q.head || [0, 0])[1], q);
    return;
  }
  const dr = q.drop || 0;
  R.E(0, -19.4 - bob + dr, 8.2 + (q.puff ? 1.4 : 0), 8.4 + (q.puff ? 2 : 0), 0, FURD, R.pat({ g: 'rump', alts: [SOLP.STRD], alt: (x, y) => (Math.abs(gmod(x + 1.4, 2.8) - 1.4) < .5 && y < -21 ? 0 : -1) }));
  if (q.puff) for (let x = -7; x <= 7; x += 2.4) R.P([[x - 1.2, -26.4 + Math.abs(x) * .5 + dr], [x, -31 + Math.abs(x) * .6 + dr], [x + 1.2, -26.4 + Math.abs(x) * .5 + dr]], FURD, { g: 'rump' });
  for (const sd of [-1, 1]) { const k = -sd * s, lift = Math.max(0, k) * 2.4; R.K2(sd * 5.8, -9 + dr, sd * 6.2, -1.6 - lift, 1.5, 1.2, FURD, { g: 'h' + sd, b: -.1 }); R.E(sd * 6.2, -.9 - lift, 2, 1.1, 0, WHTD, { g: 'hp' + sd }); }
  for (const sd of [-1, 1]) { const k = sd * s, lift = Math.max(0, -k) * 3, fw = Math.max(0, k) * 1.2; if (k < 0) { R.K2(sd * 3.2, -12 - bob + dr, sd * 3.2, -1.8 - lift, 1.6, 1.35, FUR, solLegO(R, 'f' + sd)); R.E(sd * 3.2, -1 - lift, 2, 1.1, 0, WHT, { g: 'fp' + sd }); } else q['_f' + sd] = [lift, fw]; }
  R.E(0, -14 - bob + dr, 5.6, 6, 0, FUR, { g: 'chest' }); R.E(0, -12.4 - bob + dr, 3.2, 4.6, 0, WHT, { g: 'bib' });
  for (const sd of [-1, 1]) { const v = q['_f' + sd]; if (!v) continue; R.K2(sd * 3.2, -12 - bob + dr, sd * 3.2, -1.8 + v[1], 1.7, 1.45, FUR, solLegO(R, 'f' + sd)); R.E(sd * 3.2, -1 + v[1], 2.2, 1.2, 0, WHT, { g: 'fp' + sd }); delete q['_f' + sd]; }
  R.K2(-3.4, -18 - bob + dr, 3.4, -18 - bob + dr, 1, 1, RED, { g: 'rib', ol: 1 }); R.E(2.8, -16.8 - bob + dr, 1.5, 1.2, 0, RED, { g: 'bow', ol: 1 });
  const ho = q.head || [0, 0];
  solHeadF(R, ho[0], -23.6 - bob * .5 + dr + ho[1], q);
}
function solBack(R, q = {}) {
  const { FUR, FURD, STR, WHT, RED } = SOLP, w = q.p != null, a = w ? q.p * TAU : 0, amp = q.amp || 1, s = Math.sin(a) * amp, bob = w ? Math.abs(Math.cos(a)) * .7 * amp : 0, tw = q.tw || 0, dr = q.drop || 0;
  const ho = q.head || [0, 0];
  if (q.sit) {
    solHeadB(R, ho[0], -25 + ho[1], q);
    R.K2(-3.2, -20.4, 3.2, -20.4, 1, 1, RED, { g: 'rib', ol: 1 });
    R.E(0, -15, 5.8, 7.2, 0, FUR, R.pat({ g: 'torso', alts: [STR], alt: (x, y) => (Math.abs(x) < .8 || gmod(y + Math.abs(x) * .4 + 40, 4.2) < 1.4 ? 0 : -1) }));
    R.E(0, -8, 9.4, 8, 0, FUR, R.pat({ g: 'hip', alts: [STR], alt: (x, y) => (Math.abs(x) < .8 && y < -6 || Math.abs(x) > 3 && gmod(y + Math.abs(x) * .5 + 40, 4) < 1.3 ? 0 : -1) }));
    R.chain([[1, -3], [5, -1.2], [11, -1], [15, -2.4 - tw * 2]], [1.7, 1.5, 1.3, 1.1], FUR, R.pat({ g: 'tail', ol: 1, alts: [STR], alt: solStripeT }));
    return;
  }
  solHeadB(R, ho[0], -25.6 - bob * .5 + dr + ho[1], q);
  R.K2(-3.2, -21 - bob + dr, 3.2, -21 - bob + dr, 1, 1, RED, { g: 'rib', ol: 1 });
  for (const sd of [-1, 1]) { const k = sd * s; if (k >= 0) continue; const lift = -k * 2.6; R.K2(sd * 4.6, -9 + dr, sd * 5, -1.7 - lift, 1.9, 1.4, FURD, { g: 'h' + sd, b: -.08 }); R.E(sd * 5, -1 - lift, 2.1, 1.2, 0, SOLP.WHTD, { g: 'hp' + sd }); }
  R.E(0, -14 - bob + dr, 8 + (q.puff ? 1.4 : 0), 8.6 + (q.puff ? 1.6 : 0), 0, FUR, R.pat({ g: 'body', alts: [STR], alt: (x, y) => (Math.abs(x) < .8 || gmod(y + Math.abs(x) * .35 + 40, 4.2) < 1.4 ? 0 : -1) }));
  if (q.puff) for (let x = -7; x <= 7; x += 2.4) R.P([[x - 1.2, -20.6 + Math.abs(x) * .5 + dr], [x, -25.4 + Math.abs(x) * .6 + dr], [x + 1.2, -20.6 + Math.abs(x) * .5 + dr]], FUR, { g: 'body' });
  for (const sd of [-1, 1]) { const k = sd * s; if (k < 0) continue; R.K2(sd * 4.6, -9 + dr, sd * 5, -1.7 + k * .8, 2, 1.5, FUR, solLegO(R, 'h' + sd)); R.E(sd * 5, -1 + k * .8, 2.3, 1.2, 0, WHT, { g: 'hp' + sd }); }
  if (q.tail === 'up' || q.puff) solTail(R, [[0, -16 + dr], [.8 + tw, -24], [1.2 + tw * 1.6, -31], [.4 + tw * 2.4, -36.4], [-2 + tw * 3, -39]], q.puff);
  else R.chain([[0, -15 - bob + dr], [-3 + tw, -10.4], [-6.4 + tw * 1.6, -6.2], [-8.4 + tw * 2, -2.4]], [1.8, 1.6, 1.4, 1.1], FUR, R.pat({ g: 'tail', ol: 1, alts: [STR], alt: solStripeT }));
}

/* ---------- 자세 목록 ----------
   solDraw(R, 자세, 프레임, {ear, eye, tail, tw, prey, hiss}) */
const SOL_N = { walk: 8, trot: 8, run: 8, stalk: 8, crouch: 2, pounce: 3, swat: 4, puff: 2, sniff: 2, drink: 2, shake: 4, flick: 2, standup: 2, lick: 2, wash: 4, scratch: 2, loaf: 2, knead: 2, curl: 2, fwalk: 8, bwalk: 8, frun: 8, brun: 8, fstalk: 8, bstalk: 8 };
function solDraw(R, pose, fr = 0, o = {}) {
  const q = Object.assign({}, o), k = fr % 2;
  switch (pose) {
    case 'stand': return solSide(R, q);
    case 'walk': case 'trot': case 'run': case 'stalk': return solSide(R, solGait(pose, fr / 8, q));
    case 'crouch': return solSide(R, Object.assign({ drop: 6.6, pitch: k ? .1 : .02, head: [3.5, 7.4], tail: 'flat', tw: k ? .7 : -.7, eye: 'wide', f: { nh: [k ? 1.6 : -1, 0], fh: [k ? -1 : 1.6, 0] } }, q));
    case 'pounce': return solSide(R, Object.assign([
      { pitch: -.3, st: 3, tail: 'flat', head: [2, 1], f: { nf: [7, 7], ff: [8, 9], nh: [-5, 0], fh: [-6, 0] } },
      { pitch: -.04, st: 6, tail: 'flat', head: [2, 2], f: { nf: [10, 5], ff: [11, 6.4], nh: [-9, 4], fh: [-10, 5] } },
      { pitch: .24, st: 1, tail: 'flat', tw: -1, head: [1, 3], f: { nf: [6, 0], ff: [7, 0], nh: [3, 5], fh: [2, 6] } }][fr % 3], { eye: 'wide' }, q));
    case 'swat': return solSide(R, Object.assign({ pitch: -.66, drop: 3.4, tailAbs: [[-12.3, -6.6], [-17, -3.4], [-22, -1.8], [-27, -2.2 - k * 2], [-30, -4.6 - k * 5]], ear: 1, eye: 'wide', head: [1, 4],
      f: { nh: [7, 0], fh: [6, 0], nf: [[4, 15], [11, 20], [3, 13], [2, 12]][fr % 4], ff: [[3, 13], [2, 12], [4, 16], [12, 21]][fr % 4] } }, q));
    case 'hop': return solSide(R, Object.assign({ arch: 7, puff: 1, tail: 'puff', ear: 1, eye: 'wide', head: [-1.5, 6.5], f: { nf: [-2, 3], ff: [-1, 3.4], nh: [2, 3], fh: [3, 3.4] } }, q));
    case 'puff': return solSide(R, Object.assign({ arch: 7.5, puff: 1 + k * .25, drop: -1.5, tail: 'puff', tw: k ? .3 : -.3, ear: 1, eye: 'wide', head: [-1.5, 6.5] }, q));
    case 'alert': return solSide(R, Object.assign({ head: [-1.5, -2.6], tail: 'low', eye: 'wide', f: { nf: [1.5, 3.2] } }, q));
    case 'sniff': return solSide(R, Object.assign({ head: [4.5 + k, 18.5], tilt: .8, pitch: .07, tw: k ? .4 : -.4 }, q));
    case 'drink': return solSide(R, Object.assign({ drop: 4.4, pitch: .12, head: [5.4, 15.4 + k * .8], tilt: .72, tail: 'flat', eye: 'half' }, q));
    case 'lookup': return solSide(R, Object.assign({ head: [-2, -2.6], tilt: -.55 }, q));
    case 'bow': return solSide(R, Object.assign({ pitch: .42, drop: 2.4, st: 2, tail: 'up', tw: -1, eye: 'shut', head: [4, 4], tilt: -.25, f: { nf: [9, 0], ff: [10, 0] } }, q));
    case 'shake': return solSide(R, Object.assign({ puff: .7, tilt: [-.3, .3, -.22, .22][fr % 4], head: [0, 1], tw: k ? 1 : -1, eye: 'shut', ear: 2 }, q));
    case 'flick': return solSide(R, Object.assign({ head: [1, 3.4], tilt: .34, ear: 2, f: { nf: [4 + k * 2.4, 5 + k * 1.6] } }, q));
    case 'standup': return solSide(R, Object.assign({ pitch: -1.05, drop: 1.5, head: [5, 2], tilt: -.6, tailAbs: [[-8.6, -6], [-13, -3], [-18, -1.8], [-23, -2.2], [-26.4, -4]],
      f: { nh: [12, 0], fh: [13, 0], nf: [1.5 + k * 1.4, 31 - k * 3], ff: [3 - k * 1.4, 28 + k * 3] } }, q));
    case 'sit': return solSit(R, q);
    case 'lick': case 'wash': case 'scratch': return solSit(R, Object.assign(q, { act: pose, fr, tail: 'out' }));
    case 'loaf': return solLoaf(R, Object.assign(q, { fr }));
    case 'knead': return solLoaf(R, Object.assign(q, { fr, knead: 1, eye: 'shut' }));
    case 'curl': return solCurl(R, Object.assign(q, { fr }));
    case 'fwalk': return solFront(R, Object.assign(q, { p: fr / 8 }));
    case 'frun': return solFront(R, Object.assign(q, { p: fr / 8, amp: 1.7 }));
    case 'fstalk': return solFront(R, Object.assign({ eye: 'wide' }, q, { p: fr / 8, amp: .6, drop: 5 }));
    case 'fstand': return solFront(R, q);
    case 'fsit': return solFront(R, Object.assign(q, { sit: 1 }));
    case 'fpuff': return solFront(R, Object.assign({ ear: 1, eye: 'wide', hiss: k }, q, { puff: 1 }));
    case 'bwalk': return solBack(R, Object.assign(q, { p: fr / 8 }));
    case 'brun': return solBack(R, Object.assign(q, { p: fr / 8, amp: 1.7 }));
    case 'bstalk': return solBack(R, Object.assign(q, { p: fr / 8, amp: .6, drop: 5 }));
    case 'bstand': return solBack(R, q);
    case 'bsit': return solBack(R, Object.assign(q, { sit: 1 }));
    case 'bpuff': return solBack(R, Object.assign({ ear: 1 }, q, { puff: 1 }));
  }
  return solSide(R, q);
}
