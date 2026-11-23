'use strict';
/* =========================================================
   방랑자와 솔 10컷 (실제 비율, 위에서 비스듬히 보는 시점, 200×120)
   방랑자: Rig 로 자세를 잡고 셀 명암 + 진한 외곽선 (빛은 오른쪽 위)
   솔: 픽셀을 한 칸씩 찍은 자세 10가지 (camp2.js 의 앉은 옆모습 포함)
   camp.js · camp2.js 의 배경 도구를 다시 씀
   ========================================================= */
const PW = 200, PH = 120;
const WP2 = {
  HAT: ['#7a5820', '#b88a2e', '#dcb050'], BAND: ['#24180f', '#3e2a1c', '#5a3e28'], SKIN: ['#b07a5c', '#dca988', '#f0c8a8'],
  BEARD: ['#3a2a1e', '#5a4434', '#765a44'], PON: ['#2c4436', '#456650', '#5e8468'], TRIM: ['#1e3026', '#2e4838', '#3e5c48'], STR: ['#28402f', '#3c5a46', '#52745c'],
  LEA: ['#3e2618', '#6a4428', '#8e6038'], SHIRT: ['#3a2618', '#5e4030', '#7a5640'], TRO: ['#24201c', '#383230', '#4e4640'],
  BOOT: ['#1e1814', '#3e3024', '#5e4a36'], SOLE: ['#121010', '#262220', '#3e3832'], CUFF: ['#6e6254', '#9e8e7e', '#c4b4a0'],
  STEEL: ['#24242a', '#3a3a44', '#5c5c6a'], WOOD: ['#4a2e1a', '#7a5032', '#9a6a44'], CLOTH: ['#8a7a56', '#bca878', '#dccca0'],
};
const DUO_ST = { cel: [-.02, .58], cast: true, contour: true, olCol: '#1c1618', outline: '#1c1618', clean: true, light: lightDir(.6, -.55, .58) };
const LACE = { l: '#d6c49a' }, BRASS = { b: '#e2c25a' };

/* ---------- 옆모습 부품 (오른쪽을 봄, 땅이 y=0) ---------- */
function dBoot(R, x, y, ang, g, far) {
  const P = WP2, o = far ? { g, b: -.12 } : { g, ol: 1 };
  R.push(); R.translate(x, y); R.rotate(ang || 0);
  R.K2(0, -4.4, .2, -.6, 2.3, 2.2, P.BOOT, o);
  R.P([[-2.2, -1.4], [1, -2.6], [4, -.6], [4.8, 1], [-2.4, 1]], P.BOOT, o);
  R.K2(-2.4, 1.4, 4.8, 1.4, .75, .75, P.SOLE, { g: g + 's', ol: 1 });
  R.K2(-2.2, -4.8, 2.2, -4.8, 1, 1, P.CUFF, { g: g + 'c', ol: 1 });
  if (!far) { R.stamp(1.6, -1.2, ['l'], LACE); R.stamp(.6, -2.4, ['l'], LACE); R.stamp(3.8, .1, ['h'], { h: '#7e6650' }); }
  R.pop();
}
function dLeg(R, hip, kn, an, far, g, bootAng) {
  const o = far ? { g, b: -.15 } : { g, ol: 2 };
  R.K2(hip[0], hip[1], kn[0], kn[1], 3.1, 2.7, WP2.TRO, o);
  R.K2(kn[0], kn[1], an[0], an[1] - 2, 2.7, 2.3, WP2.TRO, o);
  dBoot(R, an[0], an[1], bootAng, g + 'b', far);
}
function dPoncho(R, sh, front, hemF, hemB, back, o = {}) {
  const P = WP2, pts = [[sh[0] - 3.6, sh[1] - .4], [sh[0] + 1.4, sh[1] - .8], [sh[0] + 4.6, sh[1] + 3], front, hemF, hemB, back];
  const hx = hemF[0] - hemB[0], hy = hemF[1] - hemB[1], hl = Math.hypot(hx, hy), dHem = (x, y) => Math.abs(((x - hemB[0]) * hy - (y - hemB[1]) * hx) / hl);
  R.P(pts, P.PON, R.pat({ g: 'pon', ol: 1, alts: [P.TRIM, P.STR], alt: (x, y) => (dHem(x, y) < 2.2 ? 0 : cmod(x * .55 - y * .28, 5) < .75 ? 1 : -1) }));
  R.E(sh[0] - 3.2, sh[1] + 1.4, 3, 2.4, -.3, P.PON, { g: 'hood', ol: 1 });
  const nx = -hy / hl, ny = hx / hl;
  for (let t = .08; t < .95; t += .12) R.stamp(hemB[0] + hx * t - nx * 2.9, hemB[1] + hy * t - ny * 2.9, ['s'], { s: '#86a48a' });
  for (const t of [.22, .48, .74]) R.stamp(lerp(front[0], hemF[0], t) - 1.6, lerp(front[1], hemF[1], t), ['tw'], { t: '#6a4428', w: '#a87e4c' }, 1, 0);
  if (o.sling !== false) { R.K2(sh[0] + 3.4, sh[1] + 1.6, back[0] + 1.6, back[1] + 11, .8, .8, P.LEA, { g: 'sling', ol: 1 }); R.stamp(lerp(sh[0] + 3.4, back[0] + 1.6, .5), lerp(sh[1] + 1.6, back[1] + 11, .5), ['bb'], BRASS, 1, 0); }
  if (o.pouch) { const [px, py] = o.pouch; R.E(px, py, 2.1, 2.5, 0, P.LEA, { g: 'pouch', ol: 1 }); R.DL(px - 2, py - 1, px + 2, py - 1, P.LEA[0]); R.stamp(px + .4, py + 3.2, ['b'], BRASS); }
}
function sHead(R, h, tilt) {
  const P = WP2;
  R.push(); R.translate(h[0], h[1]); R.rotate(tilt || 0);
  R.E(-.6, 0, 3.5, 4, 0, P.SKIN, { g: 'head' });
  R.E(-2.4, .4, 1.1, 1.5, 0, P.SKIN, { g: 'ear', ol: 1 });
  R.P([[2.2, -1.6], [6, 1.2], [5.2, 2], [2.6, 1.2]], P.SKIN, { g: 'nose', ol: 1 });
  R.P([[-2.9, .6], [2.6, 1.6], [4.8, 2.6], [4.4, 4.8], [1.6, 7], [-1.6, 5.8], [-3.1, 3]], P.BEARD, R.pat({ g: 'beard', ol: 1, alts: [[P.BEARD[0], P.BEARD[2], P.BEARD[2]]], alt: (x, y) => (hash2(Math.round(x * 2), Math.round(y * 2)) > .72 ? 0 : -1) }));
  R.pop();
}
// 오일스킨 사냥 모자: 꼭대기가 눌린 둥근 머리 · 가죽 띠와 놋쇠 고리 · 앞이 처져 눈을 가리는 챙
function sHat(R, h, tilt) {
  const P = WP2;
  R.push(); R.translate(h[0], h[1]); R.rotate(tilt || 0);
  R.P([[-4.4, -3.4], [-4.2, -7.6], [-2.4, -9.4], [-.4, -8.4], [1.4, -9.6], [3.6, -8.6], [4.6, -3.4]], P.HAT, { g: 'crown', ol: 1 });
  R.P([[-4.5, -3.4], [4.6, -3.4], [4.5, -5], [-4.4, -5.2]], P.BAND, { g: 'band', ol: 1 });
  R.stamp(3.2, -4.4, ['b'], BRASS);
  R.P([[-10, -3.6], [-4, -3.8], [3, -3.4], [8.6, -2.2], [10.6, -.4], [9.2, -.2], [4, -1.6], [-3, -2.2], [-9.8, -2.2]], P.HAT, { g: 'brim', ol: 1, cl: 1 });
  R.pop();
}
function dArm(R, el, hand, far, g) { R.K2(el[0], el[1], hand[0], hand[1], 1.9, 1.5, WP2.SHIRT, far ? { g, b: -.15 } : { g, ol: 1 }); R.E(hand[0], hand[1], 1.7, 1.5, 0, WP2.SKIN, { g: g + 'h', ol: 1 }); }
function sRifle(R, ax, ay, bx, by) {
  const P = WP2, dx = bx - ax, dy = by - ay, at = t => [ax + dx * t, ay + dy * t], [x1, y1] = at(.28), [x2, y2] = at(.4), [x3, y3] = at(.7), [x4, y4] = at(.9);
  R.K2(ax, ay, x1, y1, 1.7, 1.1, P.WOOD, { g: 'gs', ol: 1 });
  R.K2(x1, y1, x2, y2, 1.1, 1.1, P.STEEL, { g: 'gr', ol: 1 });
  R.K2(x2, y2, x3, y3, 1.2, 1, P.WOOD, { g: 'gf', ol: 1 });
  R.K2(x2, y2, bx, by, .7, .6, P.STEEL, { g: 'gb', ol: 1 });
  R.K2(x4, y4, bx, by, 1.1, 1.1, P.CLOTH, { g: 'gc', ol: 1 });
}
function sideMan(R, P) {
  if (P.rifleBack) sRifle(R, ...P.rifleBack);
  dLeg(R, P.hip, P.knF, P.anF, true, 'lf', P.bootF);
  dLeg(R, P.hip, P.knN, P.anN, false, 'ln', P.bootN);
  dPoncho(R, P.sh, P.front, P.hemF, P.hemB, P.back, { pouch: P.pouch });
  sHead(R, P.head, P.tilt); sHat(R, P.head, P.hatTilt ?? P.tilt);
  if (P.armF) dArm(R, P.armF[0], P.armF[1], true, 'af');
  if (P.rifle) sRifle(R, ...P.rifle);
  if (P.armN) dArm(R, P.armN[0], P.armN[1], false, 'an');
  if (P.extra) P.extra(R);
}
const KNEEL = { knN: [5.5, -11.5], anN: [6.5, -2.2], knF: [-3, -2.6], anF: [-10, -5], bootF: Math.PI / 2 };
const POSE = {
  walk: { hip: [0, -27], knN: [4, -14.5], anN: [7.5, -2.2], knF: [-3, -14.5], anF: [-6.5, -3], bootF: .25, sh: [1, -45], head: [2.2, -50.5], tilt: .04, hatTilt: .08,
    front: [7, -36], hemF: [9, -18], hemB: [-11, -19.5], back: [-7, -38], pouch: [6, -25], rifleBack: [-9, -20, -5, -57] },
  sitLog: { hip: [0, -10], knN: [8.5, -12.5], anN: [10, -2.2], knF: [7, -12], anF: [8.6, -2.2], sh: [1, -27.5], head: [2.6, -33], tilt: .1, hatTilt: .12,
    front: [7.5, -20], hemF: [13, -11], hemB: [-8, -8], back: [-6, -21], armF: [[6, -19], [12.6, -17]], armN: [[6.4, -18.4], [13.4, -15.4]] },
  aim: { hip: [0, -17], knN: [7, -12], anN: [8, -2.2], knF: [-2, -2.6], anF: [-9, -5], bootF: Math.PI / 2, sh: [1.6, -35], head: [4, -40.5], tilt: .05, hatTilt: .02,
    front: [8, -27], hemF: [10, -14], hemB: [-8, -12], back: [-5, -28], rifle: [0, -33, 26, -35.5], armF: [[2, -29], [5, -32.6]], armN: [[7, -28], [12.5, -33.8]] },
  crouch: { hip: [-1.5, -11], knN: [5, -15], anN: [4.5, -2.2], knF: [4, -14], anF: [3, -2.2], sh: [3.5, -27.5], head: [7.5, -32], tilt: .35, hatTilt: .38,
    front: [9, -20], hemF: [11, -10], hemB: [-7, -5.5], back: [-4, -21], armN: [[8.6, -19], [12.6, -5]], armF: [[7, -18], [9.5, -9]], rifleBack: [-9, -8, -1, -40] },
  pet: Object.assign({ hip: [-1, -16], sh: [1, -33.5], head: [3.5, -39], tilt: .25, hatTilt: .28, front: [7, -26], hemF: [9.5, -13], hemB: [-9, -11], back: [-5.5, -27],
    armN: [[6.5, -23], [12, -13.6]], armF: [[5, -24], [7, -15]], rifleBack: [-9, -14, 1, -48] }, KNEEL),
  hammer: Object.assign({ hip: [-1, -16], sh: [1.5, -33.5], head: [4, -39], tilt: .15, hatTilt: .18, front: [7, -26], hemF: [9.5, -13], hemB: [-9, -11], back: [-5.5, -27],
    armN: [[6, -36], [7.5, -43]], armF: [[6, -24], [12, -6]], rifleBack: [-9, -14, 1, -48],
    extra: R => { R.K2(7.5, -43, 10.5, -47.5, .6, .6, WP2.WOOD, { g: 'mh', ol: 1 }); R.B(11.2, -48.6, 4.4, 2.8, -.6, WP2.WOOD, { g: 'mb', ol: 1 }); R.K2(12.6, -.5, 12.6, -6, .6, .5, WP2.WOOD, { g: 'peg', ol: 1 }); } }, KNEEL),
};
/* ---------- 앞 · 뒤 모습 ---------- */
function fBoot(R, x, y, g, back) {
  const P = WP2;
  R.K2(x, y - 8.6, x, y - 2.4, 2.5, 2.5, P.BOOT, { g, ol: 1 });
  R.E(x, y - 1.6, back ? 2.6 : 3, 1.8, 0, P.BOOT, { g, ol: 1 });
  R.K2(x - 3.2, y + .2, x + 3.2, y + .2, .7, .7, P.SOLE, { g: g + 's', ol: 1 });
  R.K2(x - 2.6, y - 9, x + 2.6, y - 9, 1, 1, P.CUFF, { g: g + 'c', ol: 1 });
  if (!back) { R.stamp(x, y - 7.4, ['l.l', '.l.', 'l.l', '.l.'], LACE, 1, 0); R.stamp(x + 1.4, y - 2.4, ['h'], { h: '#7e6650' }); }
}
function fPoncho(R, top, hem, o = {}) {
  const P = WP2, hL = [-13.5, hem - 2], hC = [0, hem + 1], hR = [13.5, hem - 2];
  const dSeg = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; return Math.abs(((x - a[0]) * dy - (y - a[1]) * dx) / Math.hypot(dx, dy)); };
  R.P([[-5, top], [5, top], [9.5, top + 5], hR, hC, hL, [-9.5, top + 5]], P.PON, R.pat({ g: 'pon', ol: 1, alts: [P.TRIM, P.STR], alt: (x, y) => (Math.min(dSeg(x, y, hL, hC), dSeg(x, y, hC, hR)) < 2.2 ? 0 : cmod(Math.abs(x) * .55 - y * .28, 5) < .75 ? 1 : -1) }));
  for (let t = .1; t < 1; t += .15) for (const [a, b] of [[hL, hC], [hC, hR]]) R.stamp(lerp(a[0], b[0], t), lerp(a[1], b[1], t) - 2.9, ['s'], { s: '#86a48a' });
  if (o.back) {
    R.P([[-5.4, top + .4], [5.4, top + .4], [6, top + 7], [0, top + 12.4], [-6, top + 7]], P.PON, { g: 'hood', ol: 1 });
    R.DL(0, top + 12.4, 0, hem, P.PON[0]);
    R.K2(7, top + 1.4, -9, top + 22, .85, .85, P.LEA, { g: 'sling', ol: 1 });
    return;
  }
  R.E(0, top + .8, 5.6, 2.2, 0, P.PON, { g: 'hood', ol: 1 });
  R.DL(0, top + 2.4, 0, hem, P.PON[0]);
  for (const y of [top + 7, top + 13, top + 19]) R.stamp(1.4, y, ['tw'], { t: '#6a4428', w: '#a87e4c' }, 0, 0);
  R.K2(6.4, top + 1.4, -8.4, top + 22, .85, .85, P.LEA, { g: 'sling', ol: 1 }); R.stamp(-1.2, top + 12, ['bb'], BRASS);
  if (o.pouch !== false) { R.E(10, top + 21, 2.2, 2.6, 0, P.LEA, { g: 'pouch', ol: 1 }); R.DL(8, top + 20, 12, top + 20, P.LEA[0]); R.stamp(10.4, top + 24.4, ['b'], BRASS); }
}
function fHead(R, x, y) {
  const P = WP2;
  R.E(x - 3.9, y + .6, 1.1, 1.6, 0, P.SKIN, { g: 'earL', ol: 1 }); R.E(x + 3.9, y + .6, 1.1, 1.6, 0, P.SKIN, { g: 'earR', ol: 1 });
  R.E(x, y, 3.7, 4.2, 0, P.SKIN, { g: 'face' });
  R.P([[x - 3.8, y + 1], [x + 3.8, y + 1], [x + 3.9, y + 4], [x + 2, y + 7.4], [x, y + 8.4], [x - 2, y + 7.4], [x - 3.9, y + 4]], P.BEARD, R.pat({ g: 'beard', ol: 1, alts: [[P.BEARD[0], P.BEARD[2], P.BEARD[2]]], alt: (X, Y) => (hash2(Math.round(X * 2), Math.round(Y * 2)) > .72 ? 0 : -1) }));
  R.P([[x - .9, y - 1.6], [x + .9, y - 1.6], [x + 1.4, y + 2.4], [x, y + 3], [x - 1.4, y + 2.4]], P.SKIN, { g: 'nose', ol: 1 });
}
function fHat(R, x, y, tilt, drop = 0) {
  const P = WP2;
  R.push(); R.translate(x, y + drop); R.rotate(tilt || 0);
  R.P([[-4.7, -3], [-4.5, -7.8], [-2.2, -9.4], [0, -8.2], [2.2, -9.4], [4.5, -7.8], [4.7, -3]], P.HAT, { g: 'crown', ol: 1 });
  R.P([[-4.8, -3], [4.8, -3], [4.7, -4.8], [-4.7, -4.8]], P.BAND, { g: 'band', ol: 1 }); R.stamp(3.2, -4, ['b'], BRASS);
  R.P([[-11.5, -3.6], [-6, -4.4], [6, -4.4], [11.5, -3.6], [10.6, -1.8], [4.4, -.8], [0, -.4], [-4.4, -.8], [-10.6, -1.8]], P.HAT, { g: 'brim', ol: 1, cl: 1 });
  R.pop();
}
function frontMan(R) {
  sRifle(R, -10, -26, 10, -62);
  for (const x of [-4.2, 4.2]) { R.K2(x, -27, x, -8, 3, 2.5, WP2.TRO, { g: 'lg' + x, ol: 1 }); fBoot(R, x, 0, 'fb' + x); }
  fPoncho(R, -45, -14); fHead(R, 0, -50.5); fHat(R, 0, -50.5);
}
function backMan(R) {
  const P = WP2;
  for (const x of [-4.2, 4.2]) { R.K2(x, -27, x, -8, 3, 2.5, P.TRO, { g: 'lg' + x, ol: 1 }); fBoot(R, x, 0, 'bb' + x, true); }
  fPoncho(R, -45, -14, { back: true });
  sRifle(R, -9, -22, 9, -61);
  R.E(0, -50.5, 3.9, 4.2, 0, P.BEARD, { g: 'hair' }); R.E(-3.9, -50, 1.1, 1.6, 0, P.SKIN, { g: 'earL', ol: 1 }); R.E(3.9, -50, 1.1, 1.6, 0, P.SKIN, { g: 'earR', ol: 1 });
  fHat(R, 0, -50.5);
}
function sitCrossMan(R) {
  const P = WP2;
  R.K2(-3, -12, -11, -7, 3, 2.7, P.TRO, { g: 'tL', ol: 1 }); R.K2(3, -12, 11, -7, 3, 2.7, P.TRO, { g: 'tR', ol: 1 });
  R.K2(-11, -6.5, 2, -3.2, 2.6, 2.3, P.TRO, { g: 'sL', ol: 1 }); R.K2(11, -6.5, -2, -4, 2.6, 2.3, P.TRO, { g: 'sR', ol: 2 });
  R.E(4.6, -3, 3, 2, -.2, P.BOOT, { g: 'bL', ol: 1 }); R.K2(2.6, -1.2, 7.4, -1.8, .6, .6, P.SOLE, { g: 'bLs', ol: 1 });
  R.E(-4.6, -3.8, 3, 2, .2, P.BOOT, { g: 'bR', ol: 1 }); R.K2(-2.6, -2, -7.4, -2.6, .6, .6, P.SOLE, { g: 'bRs', ol: 1 });
  fPoncho(R, -34, -9, { pouch: false }); fHead(R, 0, -39.5); fHat(R, 0, -39.5);
  dArm(R, [9, -21], [14, -19.5], false, 'aR'); dArm(R, [-9.5, -14], [-11.6, -10.6], false, 'aL');
  R.K2(14, -19.5, 28, -25.5, .45, .45, P.WOOD, { g: 'sk' });
  [[22, -23, '#8a4a24'], [25, -24.3, '#d8c8a0'], [27.4, -25.3, '#8a4a24']].forEach(([x, y, c], i) => R.E(x, y, 1.5, 1.2, -.4, [mix(c, '#1a0e08', .4), c, mix(c, '#fff0d0', .3)], { g: 'm' + i, ol: 1 }));
}
function reclineMan(R) {
  const P = WP2;
  for (const s of [-1, 1]) {
    R.K2(s * 4, -11, s * 5.6, -5, 3, 2.6, P.TRO, { g: 'lg' + s, ol: 1 });
    R.E(s * 6, -3, 2.8, 3.2, 0, P.BOOT, { g: 'bt' + s, ol: 1 }); R.E(s * 6, -2.6, 2, 2.4, 0, P.SOLE, { g: 'so' + s });
    R.stamp(s * 6, -4, ['t', '.', 't', '.', 't'], { t: '#0e0c0c' }, 0, 0);
  }
  fPoncho(R, -31, -11, { pouch: false }); fHead(R, 0, -36.5); fHat(R, 0, -36.5, .05, 1.6);
}

/* ---------- 솔 자세 (픽셀) ---------- */
const CATP = Object.assign({}, SOL_SIDE_PAL, { L: '#2a1c18' });
const CATS = {
  walk: ['..s............f.f..', '.fs...........dfpf..', '.f...........dsffefh', '..f.........dsffwwwn', '...fdfsffsfffdfwwg..', '...dfsffsffsffwww...', '...ddffffffffdwwh...',
    '....df.d.....d.w....', '...df...d....d..w...', '...f....d...d...w...', '..ff.....d..d...ww..', '..gw.....g..g...ww..'],
  peek: ['.f...f.', 'fpf.fpf', 'fffffff', 'fefsfef', 'dfwnwfd', '.dwwwd.'],
  loaf: ['..........f.f..', '.........dfpf..', '.........sffefh', '...dsffsfdffwwn', '..dfsffsffdfwg.', '.dffsffsffffww.', '.ddffffffffdww.', 'ssfdddddddd.ww.'],
  puff: ['.sf.............', '.fs...f.f.f.....', '.sf..dfsfsfh....', '..fdfsffsffsfh..', '..dfs......dfff.', '..df.......dfefw', '..df........dwwn', '..d.........gw..',
    '..ff.......d.w..', '..df.......d.w..', '..df.......d.w..', '.gww......gg.ww.'],
  sniff: ['....dffsffsffd....', '...dfsffsffsffd...', '..sdffffffffffdf..', '.s.ddffffffffdwf..', '.f..d.d.....d.wdf.', '.s..d.d.....d.wfef', '.f..d.d.....d.wdww', '....d.d.....d.w.n.', '...gw.gw....gw.ww.'],
  rub: ['...s..............', '...f..........f.f.', '...s.........dfpf.', '...f.........sfefh', '...fdffsffsffdfwwn', '...dfsffsffsffwwg.', '...ddffffffffdww..', '....d.d.....d.w...', '....d.d.....d.w...', '....d.d.....d.w...', '...gw.gw...gw.ww..'],
  sit: SOL_SIDE,
  up: ['......f.f...n.', '.....dfpf..ww.', '.....sffffew..', '......dsfffg..', '.......dffw...', '.......dRrw...'].concat(SOL_SIDE.slice(7)),
  curl: ['....dffffd...', '..dfsffsffsd.', '.dsffsffsffd.', '.f.f.dffsffd.', 'dffffdffsfffd', 'dLfLfdfffffsd', '.dwnwddsffssd', '..sffsffsffs.'],
  back: ['.......f....', '.dff..ffd...', '.dfsffsffd..', 'dfsffsffsfd.', '.dffffffffd.', '..dRrrrrRd..', '..dfsffsfd..', '.dfsffsffsd.', '.dffsffsffd.', 'dfsffsffsffd', 'dffsffsffsfd.s', 'dfsffffffsfd.f', '.ddddddddddsfs'],
};
function catSprite(rows, flip) {
  const w = Math.max(...rows.map(r => r.length)), rr = rows.map(r => r.padEnd(w, '.')).map(r => (flip ? r.split('').reverse().join('') : r));
  const sp = new PB(w + 2, rr.length + 2); sprRows(sp, 1, 1, rr, CATP); return outlineSprite(sp, '#241a16');
}
function putCat(pb, kind, x, y, flip) { const sp = catSprite(CATS[kind], flip); pb.blit(sp, Math.round(x - sp.w / 2), Math.round(y - sp.h + 1)); }
function putMan(pb, x, y, fn, flip) { pbOver(pb, hiBake(pb.w, pb.h, x, y, R => { if (flip) R.m[0] = -R.m[0]; fn(R); }, DUO_ST)); }

/* ---------- 배경 · 빛 · 비 ---------- */
function pGround(pb, o = {}) {
  const W = pb.w, H = pb.h, sd = o.seed || 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = vnoise(x * .08, y * .1, sd), h = hash2(x + sd * 31, y);
    let c = n > .56 ? '#47684a' : '#3d5a40'; if (h > .94) c = '#2f4632'; else if (h < .035) c = '#5b7d55';
    let dirt = false;
    if (o.path) { const d = Math.abs(y - o.path(x)) - (o.pathW || 12) + (vnoise(x * .15, y * .15, sd + 2) - .5) * 6; dirt = d < 0; }
    if (o.clear) { const [cx, cy, rx, ry] = o.clear, d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (vnoise(x * .12, y * .12, 3) - .5) * .5; dirt = dirt || d < 1; }
    if (dirt) { const m = vnoise(x * .1, y * .14, 5); c = m > .6 ? '#5f4a36' : '#6e573f'; if (h > .95) c = '#4e3c2c'; else if (h < .03) c = '#85705a'; }
    pb.d[y * W + x] = C(c);
  }
  const r = RNG(sd + 7);
  for (let i = 0; i < (o.tufts ?? 26); i++) { const x = Math.round(r() * W), y = Math.round(24 + r() * (H - 24)); tuft(pb, x, y, i % 3 ? '#62865a' : '#557a4e'); }
}
function pFire(pb, em, x, y) {
  const W = pb.w;
  pb.ellipse(x, y, 7, 3.6, '#2e2622');
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, sx = Math.round(x + Math.cos(a) * 9), sy = Math.round(y + Math.sin(a) * 4.6); pb.ellipse(sx, sy + 1, 2.6, 1.9, '#1e1a18'); pb.ellipse(sx, sy, 2, 1.5, '#7a7470'); pb.px(sx - 1, sy - 1, '#aca69e'); }
  pb.line(x - 6, y + 1, x + 5, y - 2, '#1e1410'); pb.line(x - 6, y, x + 5, y - 3, '#6a4428'); pb.line(x - 5, y - 2, x + 6, y + 1, '#1e1410'); pb.line(x - 5, y - 3, x + 6, y, '#6a4428');
  const fl = new PB(pb.w, pb.h);
  fl.poly([[x - 5, y], [x - 3, y - 7], [x - 1, y - 5], [x, y - 12], [x + 2, y - 6], [x + 3, y - 9], [x + 5, y]], '#e8642a');
  fl.poly([[x - 3, y], [x - 1, y - 5], [x, y - 8], [x + 2, y - 4], [x + 3, y]], '#ffb43a'); fl.poly([[x - 1, y], [x, y - 5], [x + 1, y]], '#fff2b0');
  for (let i = 0; i < fl.d.length; i++) if (fl.d[i] >>> 24) { pb.d[i] = fl.d[i]; em[i] = 1; }
}
function pLight(pb, em, lights, amb) {
  const W = pb.w, H = pb.h, out = new PB(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, u = pb.d[i], L = amb.slice();
    for (const [lx, ly, lr, lc, li] of lights) { const d = Math.hypot(x - lx, (y - ly) * 1.4) / lr; if (d < 1) { const f = (1 - d) * (1 - d) * li; L[0] += lc[0] * f; L[1] += lc[1] * f; L[2] += lc[2] * f; } }
    const v = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2)), k = em[i] ? 1.25 : 1.1 * (1 - clamp((v - .7) / .5, 0, 1) * .5);
    out.d[i] = rgb2u((u & 255) * (em[i] ? 1 : L[0]) * k, ((u >>> 8) & 255) * (em[i] ? 1 : L[1]) * k, ((u >>> 16) & 255) * (em[i] ? 1 : L[2]) * k);
  }
  return out;
}
function pRain(out, n, seed, fire) {
  const r = RNG(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * (out.w + 30), y = r() * out.h, len = 3 + Math.floor(r() * 4), lit = fire ? Math.max(0, 1 - Math.hypot(x - fire[0], (y - fire[1]) * 1.4) / fire[2]) : 0, col = mix('#9ab4d4', '#ffd8a0', lit * .8);
    for (let k = 0; k < len; k++) out.tint(Math.round(x - k * .3), Math.round(y + k), .38 + lit * .2, col);
  }
}
const FIRE_L = (x, y, r = 100) => [x, y, r, [1, .6, .3], 1.3];
const DAY = [.82, .86, .94], DUSK = [.6, .64, .76], NIGHT = [.36, .42, .58];

/* ---------- 열 컷 ---------- */
AB.DUO = [
  ['함께 걷기', '숲길을 걷는 방랑자 앞에서 솔이 종종걸음으로 길을 잡아요.', () => {
    const pb = new PB(PW, PH), em = new Uint8Array(PW * PH);
    pGround(pb, { seed: 1, path: x => 98 + Math.sin(x * .03) * 4, pathW: 13 });
    trunk(pb, 18, 60, 16); trunk(pb, 180, 52, 18); fern(pb, 44, 72, 12); fern(pb, 150, 70, 12, true);
    shadowEl(pb, 86, 101, 11, 2.6); shadowEl(pb, 126, 102, 8, 1.8);
    putMan(pb, 86, 101, R => sideMan(R, POSE.walk)); putCat(pb, 'walk', 126, 103);
    const out = pLight(pb, em, [], DAY); pRain(out, 150, 11); return out;
  }],
  ['우비 밑의 솔', '장대비가 오면 솔은 방랑자의 우비 밑으로 들어가 얼굴만 내밀어요.', () => {
    const pb = new PB(PW, PH), em = new Uint8Array(PW * PH);
    pGround(pb, { seed: 2 }); puddle(pb, 60, 100, 18, 5); puddle(pb, 146, 108, 14, 4); trunk(pb, 26, 56, 14); fern(pb, 168, 80, 13, true);
    shadowEl(pb, 100, 104, 14, 3);
    putMan(pb, 100, 104, frontMan);
    const sp = catSprite(CATS.peek); pb.blit(sp, 100 - 4, 104 - 13); pb.rect(97, 104, 2, 1, '#f0e9de'); pb.rect(102, 104, 2, 1, '#f0e9de');
    const out = pLight(pb, em, [], DUSK); pRain(out, 300, 12); return out;
  }],
  ['모닥불 앞', '통나무에 앉아 불을 쬐어요. 솔은 불 가까이에서 식빵을 구워요.', () => {
    const pb = new PB(PW, PH), em = new Uint8Array(PW * PH);
    pGround(pb, { seed: 3, clear: [110, 96, 80, 26] }); trunk(pb, 16, 50, 16); trunk(pb, 186, 46, 16);
    shadowEl(pb, 93, 101, 17, 3); logSeat(pb, 78, 92); sRifleProp(pb, 70, 100);
    putMan(pb, 92, 101, R => sideMan(R, POSE.sitLog));
    shadowEl(pb, 119, 105, 8, 1.6); putCat(pb, 'loaf', 119, 106); pFire(pb, em, 138, 100);
    const out = pLight(pb, em, [FIRE_L(138, 95, 90)], NIGHT); pRain(out, 120, 13, [138, 95, 90]); return out;
  }],
  ['경계', '솔이 털을 세우면 방랑자는 무릎을 꿇고 총을 겨눠요. 웅덩이에서 물그림자가 올라와요.', () => {
    const pb = new PB(PW, PH), em = new Uint8Array(PW * PH);
    pGround(pb, { seed: 4 }); puddle(pb, 162, 101, 18, 5); trunk(pb, 20, 54, 15); fern(pb, 186, 82, 12, true);
    for (let y = -10; y <= 0; y++) for (let x = -6; x <= 6; x++) if ((x / 6) ** 2 + ((y + 4) / 7) ** 2 <= 1) pb.tint(160 + x, 99 + y, .5, '#9ab8d8');
    pb.hl(157, 159, 93, '#24384e'); pb.hl(162, 164, 93, '#24384e'); pb.px(158, 94, '#e8f0f8'); pb.px(163, 94, '#e8f0f8');
    shadowEl(pb, 80, 102, 12, 2.6); shadowEl(pb, 118, 103, 8, 1.6);
    putMan(pb, 80, 102, R => sideMan(R, POSE.aim)); putCat(pb, 'puff', 118, 104);
    const out = pLight(pb, em, [], DUSK); pRain(out, 160, 14); return out;
  }],
  ['채집', '나무뿌리 옆 버섯을 따요. 솔이 먼저 냄새를 맡아 봐요.', () => {
    const pb = new PB(PW, PH), em = new Uint8Array(PW * PH);
    pGround(pb, { seed: 5 }); trunk(pb, 172, 92, 20); fern(pb, 30, 80, 13);
    for (const [x, y] of [[133, 101], [137, 103], [141, 100], [146, 103]]) mushroom(pb, x, y);
    shadowEl(pb, 92, 102, 12, 2.6); shadowEl(pb, 121, 103, 8, 1.6);
    putMan(pb, 92, 102, R => sideMan(R, POSE.crouch)); putCat(pb, 'sniff', 121, 104);
    const out = pLight(pb, em, [], DAY); pRain(out, 140, 15); return out;
  }],
  ['쓰다듬기', '무릎을 꿇고 손을 내밀면 솔이 꼬리를 세우고 머리를 비벼요.', () => {
    const pb = new PB(PW, PH), em = new Uint8Array(PW * PH);
    pGround(pb, { seed: 6, clear: [100, 100, 70, 20] }); trunk(pb, 24, 56, 15); trunk(pb, 178, 60, 14);
    shadowEl(pb, 88, 102, 12, 2.6); shadowEl(pb, 106, 103, 8, 1.6);
    putMan(pb, 88, 102, R => sideMan(R, POSE.pet)); putCat(pb, 'rub', 106, 104, true);
    const out = pLight(pb, em, [], DUSK); pRain(out, 140, 16); return out;
  }],
  ['텐트 치기', '말뚝을 박는 동안 솔은 옆에 앉아 망치질을 지켜봐요.', () => {
    const pb = new PB(PW, PH), em = new Uint8Array(PW * PH);
    pGround(pb, { seed: 7, clear: [130, 98, 70, 22] }); trunk(pb, 20, 52, 15);
    pb.poly([[146, 102], [166, 72], [190, 102]], '#a38b5c'); pb.poly([[166, 72], [190, 102], [196, 98], [172, 70]], '#8a7450');
    pb.line(146, 102, 166, 72, '#2e2218'); pb.line(166, 72, 190, 102, '#2e2218'); pb.line(166, 72, 172, 70, '#2e2218'); pb.line(172, 70, 196, 98, '#2e2218'); pb.hl(146, 190, 102, '#2e2218'); pb.line(146, 102, 140, 103, '#c8b48a');
    shadowEl(pb, 126, 103, 12, 2.6); shadowEl(pb, 88, 104, 7, 1.6);
    putMan(pb, 126, 103, R => sideMan(R, POSE.hammer)); putCat(pb, 'sit', 88, 105);
    const out = pLight(pb, em, [], DUSK); pRain(out, 140, 17); return out;
  }],
  ['밥', '책상다리로 앉아 꼬치를 구워요. 솔은 올려다보며 자기 몫을 기다려요.', () => {
    const pb = new PB(PW, PH), em = new Uint8Array(PW * PH);
    pGround(pb, { seed: 8, clear: [110, 100, 80, 24] }); trunk(pb, 14, 48, 15); trunk(pb, 188, 46, 15);
    shadowEl(pb, 98, 104, 16, 3); shadowEl(pb, 72, 106, 7, 1.6);
    putMan(pb, 98, 104, sitCrossMan); putCat(pb, 'up', 72, 107);
    pFire(pb, em, 128, 106);
    const out = pLight(pb, em, [FIRE_L(128, 100, 90)], NIGHT); pRain(out, 120, 18, [128, 100, 90]); return out;
  }],
  ['낮잠', '나무에 기대 모자를 눌러쓰고 쉬어요. 솔은 무릎 위에서 몸을 말고 자요.', () => {
    const pb = new PB(PW, PH), em = new Uint8Array(PW * PH);
    pGround(pb, { seed: 9 }); trunk(pb, 100, 92, 24); fern(pb, 60, 96, 12); fern(pb, 142, 98, 12, true);
    shadowEl(pb, 100, 104, 16, 3);
    putMan(pb, 100, 104, reclineMan);
    const sp = catSprite(CATS.curl); pb.blit(sp, 100 - 7, 104 - 22);
    const out = pLight(pb, em, [], DAY); pRain(out, 110, 19); return out;
  }],
  ['함께 바라보기', '호숫가에서 둘이 같은 곳을 바라봐요.', () => {
    const pb = new PB(PW, PH), em = new Uint8Array(PW * PH);
    pGround(pb, { seed: 10, tufts: 14 });
    for (let y = 0; y < 74; y++) for (let x = 0; x < PW; x++) pb.d[y * PW + x] = C(y < 34 ? mix('#8a96a8', '#a4aebc', y / 34) : mix('#5e7088', '#46586e', (y - 34) / 40));
    for (let x = 0; x < PW; x += 6) { const h = 8 + Math.round(hash1(x) * 8); pb.rect(x, 34 - h, 6, h, '#5a6878'); }
    for (let i = 0; i < 40; i++) { const x = Math.round(hash1(i + 3) * PW), y = 38 + Math.round(hash1(i + 9) * 34); pb.hl(x, x + 3 + (i % 4), y, '#7a8ca4'); }
    pb.hl(0, PW, 74, '#2e3e30');
    shadowEl(pb, 92, 106, 12, 2.6); shadowEl(pb, 112, 107, 7, 1.6);
    putMan(pb, 92, 106, backMan); putCat(pb, 'back', 112, 108);
    const out = pLight(pb, em, [], DUSK); pRain(out, 150, 20); return out;
  }],
];
function sRifleProp(pb, x, y) { putMan(pb, x, y, R => sRifle(R, -2, 0, 8, -34)); }
AB.duoSheet = function (z = 3) {
  const gap = 6, cols = 2, rows = 5, c = document.createElement('canvas');
  c.width = cols * PW * z + (cols + 1) * gap; c.height = rows * PH * z + (rows + 1) * gap;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#12161c'; g.fillRect(0, 0, c.width, c.height);
  AB.DUO.forEach((d, i) => { const pb = d[2](), x = gap + (i % cols) * (PW * z + gap), y = gap + Math.floor(i / cols) * (PH * z + gap); g.drawImage(pb.canvas(), x, y, PW * z, PH * z); });
  return c;
};
