'use strict';
/* =========================================================
   방랑자 · 게임용 관절 그림 (2배 해상도: 배율 2, 키 약 120픽셀)
   옆(오른쪽을 봄) · 앞 · 뒤 세 방향. 왼쪽은 구울 때 뒤집음
   걷기 · 달리기 · 살금살금은 발이 땅에서 미끄러지지 않도록
   '한 바퀴에 나아가는 거리(lam)'에서 발 폭을 정하고 무릎은 뼈 길이로 풂
   솔 동행 세 가지: 우비 밑 다리 사이(under) · 품에 안기(arms) · 배낭(bag)
   ========================================================= */
const MANP = {
  HAT: ['#7a5820', '#b88a2e', '#dcb050'], BAND: ['#24180f', '#3e2a1c', '#5a3e28'], SKIN: ['#b07a5c', '#dca988', '#f0c8a8'],
  BEARD: ['#3a2a1e', '#5a4434', '#765a44'], PON: ['#2c4436', '#456650', '#5e8468'], TRIM: ['#1e3026', '#2e4838', '#3e5c48'], STR: ['#28402f', '#3c5a46', '#52745c'],
  LEA: ['#3e2618', '#6a4428', '#8e6038'], SHIRT: ['#3a2618', '#5e4030', '#7a5640'], TRO: ['#24201c', '#383230', '#4e4640'],
  BOOT: ['#1e1814', '#3e3024', '#5e4a36'], SOLE: ['#121010', '#262220', '#3e3832'], CUFF: ['#6e6254', '#9e8e7e', '#c4b4a0'],
  STEEL: ['#24242a', '#3a3a44', '#5c5c6a'], WOOD: ['#4a2e1a', '#7a5032', '#9a6a44'], CLOTH: ['#8a7a56', '#bca878', '#dccca0'], BLADE: ['#7a7a88', '#c4c4d0', '#f4f4fc'],
};
const M_BRASS = { b: '#e2c25a' }, M_LACE = '#d6c49a';
const MAN_W = 256, MAN_H = 196, MAN_OX = 112, MAN_OY = 186, MAN_S = 2, CAT_K = .35;   // CAT_K: 방랑자 좌표 안에서 솔의 배율 (.7 ÷ 2)

/* ---------- 옆모습 부품 ---------- */
function mBoot(R, x, y, ang, g, far) {
  const P = MANP, o = far ? { g, b: -.12 } : { g, ol: 1 };
  R.push(); R.translate(x, y); R.rotate(ang || 0);
  R.K2(0, -4.4, .2, -.6, 2.3, 2.2, P.BOOT, o);
  R.P([[-2.2, -1.4], [1, -2.6], [4, -.6], [4.8, 1], [-2.4, 1]], P.BOOT, o);
  R.K2(-2.4, 1.4, 4.8, 1.4, .75, .75, P.SOLE, { g: g + 's', ol: 1 });
  R.K2(-2.2, -4.8, 2.2, -4.8, 1, 1, P.CUFF, { g: g + 'c', ol: 1 });
  if (!far) {
    R.DL(-.4, -3.8, 1.8, -2.4, M_LACE); R.DL(1.8, -3.8, -.4, -2.4, M_LACE); R.DL(.2, -2.2, 2.4, -1.2, M_LACE); R.DL(2.4, -2.2, .6, -1, M_LACE);
    for (let k = 0; k < 5; k++) R.stamp(-2 + k * 1.6, 1.9, ['t'], { t: '#0c0a0a' });
    R.DL(2, -.4, 4.4, .5, '#6e5640'); R.stamp(3.6, -.2, ['hh'], { h: '#8a7056' });
    for (let k = 0; k < 4; k++) R.stamp(-1.8 + k * 1.2, -4.9, ['w'], { w: '#d8ccb8' });
  }
  R.pop();
}
function mLeg(R, hip, kn, an, far, g, bootAng) {
  const o = far ? { g, b: -.15 } : { g, ol: 2 };
  R.K2(hip[0], hip[1], kn[0], kn[1], 3.1, 2.7, MANP.TRO, o);
  R.K2(kn[0], kn[1], an[0], an[1] - 2, 2.7, 2.3, MANP.TRO, o);
  mBoot(R, an[0], an[1], bootAng, g + 'b', far);
}
function mPoncho(R, sh, front, hemF, hemB, back, o = {}) {
  const P = MANP, e = o.open || 0, L2 = (a, b) => [lerp(a[0], b[0], e), lerp(a[1], b[1], e)];
  if (e > 0) { front = L2(front, [sh[0] + 5.4, sh[1] + 6]); hemF = L2(hemF, [sh[0] + 3.4, sh[1] + 10]); hemB = L2(hemB, [sh[0] - 5.5, sh[1] + 9.4]); back = L2(back, [sh[0] - 7, sh[1] + 5]); }   // 칼을 쓸 땐 앞자락을 어깨 뒤로 넘김
  const pts = [[sh[0] - 3.6, sh[1] - .4], [sh[0] + 1.4, sh[1] - .8], [sh[0] + 4.6, sh[1] + 3], front, hemF, hemB, back], plain = e > .3;
  const hx = hemF[0] - hemB[0], hy = hemF[1] - hemB[1], hl = Math.hypot(hx, hy) || 1, dHem = (x, y) => Math.abs(((x - hemB[0]) * hy - (y - hemB[1]) * hx) / hl);
  const alt = (x, y) => (dHem(x, y) < 2.2 ? 0 : gmod(x * .55 - y * .28, 5) < .75 ? 1 : -1);
  R.P(pts, P.PON, R.pat({ g: 'pon', ol: 1, alts: [P.TRIM, P.STR], alt }));
  if (o.bulge) R.E(front[0] - 1.6, front[1] + 5.4, 5.4, 6.6, .1, P.PON, R.pat({ g: 'pon', ol: 1, alts: [P.TRIM, P.STR], alt: (x, y) => (gmod(x * .55 - y * .28, 5) < .75 ? 1 : -1) }));
  R.E(sh[0] - 3.2, sh[1] + 1.4, 3, 2.4, -.3, P.PON, { g: 'hood', ol: 1 });
  let nx = -hy / hl, ny = hx / hl; if ((sh[0] - hemB[0]) * nx + (sh[1] - hemB[1]) * ny > 0) { nx = -nx; ny = -ny; }   // 바늘땀은 늘 우비 안쪽에
  if (!plain) for (let t = .08; t < .95; t += .05) R.stamp(hemB[0] + hx * t - nx * 2.9, hemB[1] + hy * t - ny * 2.9, ['s'], { s: '#86a48a' });
  if (!o.bulge && !plain) for (const t of [.22, .48, .74]) { const x = lerp(front[0], hemF[0], t) - 1.6, y = lerp(front[1], hemF[1], t); R.B(x, y, 2, .9, -.35, P.LEA, { g: 'tg' + t, ol: 1 }); R.DL(x + 1, y, x + 2, y + .3, '#2a1a10'); }
  R.DL(sh[0] - 1, sh[1] + 1.4, sh[0] - .4, sh[1] + 5, '#d8c8a0'); R.stamp(sh[0] - .4, sh[1] + 5.4, ['k'], { k: '#d8c8a0' });
  if (!plain) for (let k = 0; k < 6; k++) R.DL(front[0] - 1 - k * .4, front[1] + 4 + k * 3, front[0] - 2.2 - k * .4, front[1] + 5.4 + k * 3, P.PON[0]);
  if (o.sling !== false && !plain) { R.K2(sh[0] + 3.4, sh[1] + 1.6, back[0] + 1.6, back[1] + 11, .8, .8, P.LEA, { g: 'sling', ol: 1 }); R.stamp(lerp(sh[0] + 3.4, back[0] + 1.6, .5), lerp(sh[1] + 1.6, back[1] + 11, .5), ['bb'], M_BRASS, 1, 0); }
  if (o.pouch) { const [px, py] = o.pouch; R.E(px, py, 2.1, 2.5, 0, P.LEA, { g: 'pouch', ol: 1 }); R.DL(px - 2, py - 1, px + 2, py - 1, P.LEA[0]); R.stamp(px + .4, py + 3.2, ['b'], M_BRASS); }
}
function mHeadS(R, h, tilt) {
  const P = MANP;
  R.push(); R.translate(h[0], h[1]); R.rotate(tilt || 0);
  R.E(-.6, 0, 3.5, 4, 0, P.SKIN, { g: 'head' });
  R.E(-2.4, .4, 1.1, 1.5, 0, P.SKIN, { g: 'ear', ol: 1 });
  R.P([[2.2, -1.6], [6, 1.2], [5.2, 2], [2.6, 1.2]], P.SKIN, { g: 'nose', ol: 1 });
  R.P([[-2.9, .6], [2.6, 1.6], [4.8, 2.6], [4.4, 4.8], [1.6, 7], [-1.6, 5.8], [-3.1, 3]], P.BEARD, R.pat({ g: 'beard', ol: 1, alts: [[P.BEARD[0], P.BEARD[2], P.BEARD[2]]], alt: (x, y) => (hash2(Math.round(x * 2), Math.round(y * 2)) > .72 ? 0 : -1) }));
  R.stamp(5.2, 1.4, ['n'], { n: '#8a5040' }); R.DL(2.6, 2, 4.6, 2.8, P.BEARD[0]); R.DL(-1, 3, 0, 6, P.BEARD[0]); R.DL(1.6, 3.4, 2, 6.4, P.BEARD[0]); R.DL(3.4, 3.4, 3, 5.4, P.BEARD[0]); R.DL(3, -1, 4.4, -.6, '#f6d8bc');
  R.pop();
}
// 오일스킨 사냥 모자: 꼭대기가 눌린 둥근 머리 · 가죽 띠와 놋쇠 고리 · 앞이 처져 눈을 가리는 챙
function mHatS(R, h, tilt) {
  const P = MANP;
  R.push(); R.translate(h[0], h[1]); R.rotate(tilt || 0);
  R.P([[-4.4, -3.4], [-4.2, -7.6], [-2.4, -9.4], [-.4, -8.4], [1.4, -9.6], [3.6, -8.6], [4.6, -3.4]], P.HAT, { g: 'crown', ol: 1 });
  R.P([[-4.5, -3.4], [4.6, -3.4], [4.5, -5], [-4.4, -5.2]], P.BAND, { g: 'band', ol: 1 });
  R.E(3.2, -4.3, .8, .8, 0, ['#8a6a20', '#d8b040', '#fff0a0'], { g: 'ring', ol: 1 });
  for (let k = 0; k < 8; k++) R.stamp(-4 + k * 1.1, -5.4, ['s'], { s: '#7a5a34' });
  R.DL(-.4, -8.4, -.2, -5.6, P.HAT[0]); R.DL(-2.6, -8.8, -3.4, -6, P.HAT[2]);
  R.P([[-10, -3.6], [-4, -3.8], [3, -3.4], [8.6, -2.2], [10.6, -.4], [9.2, -.2], [4, -1.6], [-3, -2.2], [-9.8, -2.2]], P.HAT, { g: 'brim', ol: 1, cl: 1 });
  R.DL(-3, -3.7, 3, -3.4, P.HAT[2]); R.DL(3, -3.4, 8.6, -2.2, P.HAT[2]); R.DL(-9, -2.6, 4, -1.8, P.HAT[0]);
  R.pop();
}
function mArm(R, el, hand, far, g) { R.K2(el[0], el[1], hand[0], hand[1], 1.9, 1.5, MANP.SHIRT, far ? { g, b: -.15 } : { g, ol: 1 }); R.E(hand[0], hand[1], 1.7, 1.5, 0, MANP.SKIN, { g: g + 'h', ol: 1 }); }
// 어깨와 손 위치에서 팔꿈치를 풂 (sg: 굽는 쪽)
function mElbow(S, H, sg) {
  const L = 8.6, dx = H[0] - S[0], dy = H[1] - S[1], d = clamp(Math.hypot(dx, dy), .6, L * 2 - .05), a = Math.atan2(dy, dx), b = Math.acos(clamp(d / (2 * L), -1, 1));
  return [S[0] + Math.cos(a + sg * b) * L, S[1] + Math.sin(a + sg * b) * L];
}
function mUpper(R, S, E, far, g) { R.K2(S[0], S[1], E[0], E[1], 2.4, 2, MANP.SHIRT, far ? { g, b: -.15 } : { g, ol: 1 }); }
// 뒤로 넘어가 펄럭이는 우비 자락 (옆)
function mCapeS(R, P) {
  const M = MANP, sh = P.sh, hip = P.hip, alt = (x, y) => (gmod(x * .55 - y * .28, 5) < .75 ? 1 : -1);
  R.P([[sh[0] - 3.6, sh[1] - .4], [sh[0] + 1.6, sh[1] + .6], [hip[0] - 1.5, hip[1] + 5], [lerp(hip[0] - 1.5, P.hemB[0], .55), P.hemB[1] + 1.6], P.hemB, P.back], M.PON, R.pat({ g: 'cape', ol: 1, alts: [M.TRIM, M.STR], alt }));
}
// 우비 속 몸: 셔츠 · 허리띠 · 주머니 (옆)
function mBodyS(R, P) {
  const M = MANP, sh = P.sh, hip = P.hip;
  R.E(hip[0], hip[1] + 1, 4.4, 3.2, 0, M.TRO, { g: 'seat', ol: 1 });
  R.K2(hip[0], hip[1] - 1.5, sh[0] + .6, sh[1] + 4, 4.4, 4.7, M.SHIRT, { g: 'body', ol: 1 });
  R.K2(hip[0] - 4, hip[1] - 1.4, hip[0] + 4.4, hip[1] - 1, 1.1, 1.1, M.LEA, { g: 'belt', ol: 1 }); R.stamp(hip[0] + 3.6, hip[1] - 1.2, ['b'], M_BRASS);
  R.E(hip[0] - 2.6, hip[1] + 1.6, 2, 2.4, 0, M.LEA, { g: 'pouch', ol: 1 });
  R.K2(hip[0] + 1.6, hip[1] - .6, hip[0] - 3.6, hip[1] + 9.5, 1.5, 1, M.BOOT, { g: 'sheath', ol: 1 }); R.stamp(hip[0] + 1.4, hip[1] - .2, ['b'], M_BRASS);   // 빈 사냥칼 칼집
  R.K2(sh[0] + 3.2, sh[1] + 3, hip[0] - 3.4, hip[1] - 3, .7, .7, M.LEA, { g: 'sling', ol: 1 });
}
function mRifle(R, ax, ay, bx, by) {
  const P = MANP, dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, at = t => [ax + dx * t, ay + dy * t], [x1, y1] = at(.28), [x2, y2] = at(.4), [x3, y3] = at(.7), [x4, y4] = at(.9);
  R.K2(ax, ay, x1, y1, 1.7, 1.1, P.WOOD, { g: 'gs', ol: 1 });
  R.K2(x1, y1, x2, y2, 1.1, 1.1, P.STEEL, { g: 'gr', ol: 1 });
  R.K2(x2, y2, x3, y3, 1.2, 1, P.WOOD, { g: 'gf', ol: 1 });
  R.K2(x2, y2, bx, by, .7, .6, P.STEEL, { g: 'gb', ol: 1 });
  R.K2(x4, y4, bx, by, 1.1, 1.1, P.CLOTH, { g: 'gc', ol: 1 });
  const nx = -dy / l, ny = dx / l;
  for (const t of [.93, .97]) { const [px, py] = at(t); R.DL(px - nx * 1.1, py - ny * 1.1, px + nx * 1.1, py + ny * 1.1, '#6a5a3a'); }
  const [gx, gy] = at(.12); R.DL(ax + nx * .5, ay + ny * .5, gx + nx * .3, gy + ny * .3, P.WOOD[2]);
  const [qx, qy] = at(.34); R.stamp(qx, qy, ['bb'], M_BRASS, 1, 0);
}
// 칼 두 자루. hunt: 사냥칼 — 팔뚝보다 긴 외날, 놋쇠 코등이, 가죽 감은 자루 (물그림자를 벨 때)
//          forage: 채집칼 — 손바닥만 한 굽은 날, 나무 자루 (버섯 · 열매를 딸 때)
function mKnife(R, hand, ang, kind) {
  const c = Math.cos(ang), s = Math.sin(ang), at = (d, w) => [hand[0] + c * d - s * w, hand[1] + s * d + c * w];
  if (kind === 'forage') {
    R.P([at(1.2, -.8), at(4.4, -1.1), at(6.4, .4), at(5.2, 1.5), at(1.2, .9)], MANP.BLADE, { g: 'kb', ol: 1 });
    const a = at(-1.6, 0), b = at(1.2, 0); R.K2(a[0], a[1], b[0], b[1], .9, .9, MANP.WOOD, { g: 'kh', ol: 1 });
    return;
  }
  R.P([at(2, -1.5), at(16.5, -1.4), at(19.4, -.6), at(22, 1), at(2, 1.6)], MANP.BLADE, { g: 'kb', ol: 1 });
  const f0 = at(4, -.6), f1 = at(17, -.5); R.DL(f0[0], f0[1], f1[0], f1[1], MANP.BLADE[0]);   // 피홈
  const g0 = at(1.6, -2.5), g1 = at(1.6, 2.6); R.K2(g0[0], g0[1], g1[0], g1[1], .8, .8, ['#8a6a20', '#d8b040', '#fff0a0'], { g: 'kg', ol: 1 });
  const a = at(-2.6, 0), b = at(1.2, 0); R.K2(a[0], a[1], b[0], b[1], 1.1, 1.1, MANP.LEA, { g: 'kh', ol: 1 });
  const p = at(-3.2, 0); R.stamp(p[0], p[1], ['b'], M_BRASS);
}

/* ---------- 솔 동행 (옆) ---------- */
function mCatAt(R, x, y, fn) { R.push(); R.translate(x, y); R.scl(CAT_K); fn(R); R.pop(); }
const mCatFace = c => (c.st === 'alert' ? { ear: 1, eye: 'wide' } : c.st === 'sleep' ? { eye: 'shut' } : c.st === 'purr' ? { eye: 'half' } : c.st === 'squirm' ? { ear: 2, eye: 'open' } : { eye: 'open' });
// 배낭: 솔이 턱과 앞발을 걸치고 밖을 봄. 숨으면 귀만 보임
function mBagS(R, sh, c) {
  const P = MANP, bx = sh[0] - 11.4, by = sh[1] + 9, hide = c.st === 'hide' ? 3.2 : c.st === 'sleep' ? 1.2 : 0, wig = c.st === 'squirm' && c.fr % 2 ? .8 : 0;
  mCatAt(R, bx + 1 + wig, by - 11.4 + hide, r => solHead(r, 0, 0, Object.assign({ tilt: c.st === 'sleep' ? .25 : -.05 }, mCatFace(c))));
  R.P([[bx - 3.6, by - 8.6], [bx + 3.4, by - 9.4], [bx + 4.6, by + 5.6], [bx + 1.6, by + 8.4], [bx - 4.4, by + 7]], P.LEA, { g: 'bag', ol: 1 });
  R.P([[bx - 3.8, by - 8.8], [bx + 3.6, by - 9.6], [bx + 3.9, by - 5.2], [bx - 4, by - 4.4]], P.BOOT, { g: 'bagF', ol: 1 });
  R.DL(bx - 3, by - 1, bx + 4, by - 1.6, P.LEA[0]); R.stamp(bx + .4, by - 4.6, ['b'], M_BRASS); R.stamp(bx - 2.4, by + 3, ['ss'], { s: '#a8845a' });
  if (!hide) { R.E(bx + 3.4 + wig, by - 9.2, 1.2, .9, 0, SOLP.WHT, { g: 'cp1', ol: 1 }); R.E(bx + 1.2 + wig, by - 9.5, 1.2, .9, 0, SOLP.WHT, { g: 'cp2', ol: 1 }); }
}
// 품: 우비 앞이 불룩하고 목 언저리로 솔의 머리가 나옴
function mArmsS(R, sh, c) {
  const wig = c.st === 'squirm' && c.fr % 2 ? .9 : 0, hide = c.st === 'hide' ? 2.6 : 0;
  mCatAt(R, sh[0] + 6.6 + wig, sh[1] + 5.6 + hide, r => solHead(r, 0, 0, Object.assign({ tilt: c.st === 'sleep' ? .35 : .05 }, mCatFace(c))));
  if (!hide) R.E(sh[0] + 8.4 + wig, sh[1] + 9.4, 1.3, 1, .2, SOLP.WHT, { g: 'cp1', ol: 1 });
}

/* ---------- 옆모습 자세 ---------- */
const M_L1 = 13.1, M_L2 = 10.9;
function mKnee(hip, an) {
  const tx = an[0], ty = an[1] - 2, dx = tx - hip[0], dy = ty - hip[1], d = Math.min(Math.hypot(dx, dy), M_L1 + M_L2 - .05), a = Math.atan2(dy, dx);
  const b = Math.acos(clamp((M_L1 * M_L1 + d * d - M_L2 * M_L2) / (2 * M_L1 * d), -1, 1));
  return [hip[0] + Math.cos(a - b) * M_L1, hip[1] + Math.sin(a - b) * M_L1];
}
// 엉덩이 위치와 몸 기울기에서 어깨 · 머리 · 우비 · 등에 멘 총을 만듦
function mTorso(P, hip, lean, o = {}) {
  const sn = Math.sin(lean), cs = Math.cos(lean), sw = o.sway || 0, fl = o.flare || 0;
  P.hip = hip; P.sh = [hip[0] + 1 + 18 * sn, hip[1] - 18 * cs];
  P.head = [P.sh[0] + 1.2 + 4 * sn, P.sh[1] - 5.5 + 2.4 * sn * sn];
  P.tilt = (o.tilt == null ? .04 : o.tilt) + lean * .55; P.hatTilt = P.tilt + .04;
  P.front = [P.sh[0] + 6, P.sh[1] + 9]; P.hemF = [hip[0] + 9.6 + sw + 6 * sn, hip[1] + 11 - fl * .5]; P.hemB = [hip[0] - 12 - sw * .6 - fl * 3.4, hip[1] + 9.6 - fl * 3]; P.back = [P.sh[0] - 8, P.sh[1] + 7];
  P.pouch = [hip[0] + 6 + sw * .5, hip[1] + 2];
  if (o.rifleBack !== false) P.rifleBack = [P.sh[0] - 10 - fl, P.sh[1] + 25 - fl * 2, P.sh[0] - 6 + (o.rsw || 0), P.sh[1] - 12];
  return P;
}
function mLegs(P, anN, anF, bN, bF) { P.anN = anN; P.anF = anF; P.bootN = bN || 0; P.bootF = bF || 0; P.knN = mKnee(P.hip, anN); P.knF = mKnee(P.hip, anF); return P; }
const MG = {   // lam: 한 바퀴(두 걸음)에 나아가는 거리 (단위. 픽셀은 ×2)
  walk: { lam: 45, duty: .62, lift: 3.4, hip: -26.6, lean: .04, toe: .55 },
  run: { lam: 74, duty: .38, lift: 7, hip: -25.4, lean: .2, toe: .8 },
  sneak: { lam: 34, duty: .7, lift: 2.6, hip: -20.5, lean: .34, toe: .4 },
};
// 발 하나: 뒤꿈치로 딛고 → 발바닥 → 발끝으로 밀기. 발목은 그만큼 들림
function mFoot(p, G) {
  p -= Math.floor(p);
  const f = gaitF(p, G.lam * G.duty / 2, G.lift, G.duty), st = p < G.duty;
  let th;
  if (st) { const t = p / G.duty; th = t < .15 ? -.3 * (1 - t / .15) : t > .68 ? G.toe * (t - .68) / .32 : 0; }
  else th = lerp(G.toe, -.3, smooth((p - G.duty) / (1 - G.duty)));
  const rise = th > 0 ? 4.5 * Math.sin(th) : 2.4 * Math.sin(-th);
  return [[f[0] + (th > 0 ? 4.5 * (1 - Math.cos(th)) : 0), -2.2 - f[1] - rise], th, st];
}
function mGait(g, p) {
  const G = MG[g], a = p * TAU, N = mFoot(p, G), F = mFoot(p + .5, G), run = g === 'run';
  let hy = G.hip;   // 디딘 다리가 닿을 수 있는 만큼 엉덩이가 내려감 → 걸음마다 자연스럽게 오르내림
  for (const L of [N, F]) if (L[2]) { const need = L[0][1] - 2 - Math.sqrt(Math.max(1, 23.9 * 23.9 - L[0][0] * L[0][0])); if (need > hy) hy = need; }
  if (run) hy += 1.5 * Math.cos((p - .19) * TAU * 2);
  const P = mTorso({}, [0, hy], G.lean + (run ? Math.sin(a * 2) * .03 : 0), { sway: Math.sin(a) * (run ? 2.8 : g === 'sneak' ? 1.2 : 2.1), flare: run ? 1.1 + Math.sin(a * 2 + 1) * .65 : g === 'sneak' ? 0 : .3 + Math.sin(a * 2 + 1) * .32, rsw: Math.sin(a * 2) * .6 });
  return mLegs(P, N[0], F[0], N[1], F[1]);
}
/* ---------- 자세 잇기 ----------
   열쇠 자세 몇 개를 부드러운 곡선으로 이어 사이 프레임을 만들어 냄 (뚝뚝 끊기지 않게)
   칼: 쉬는 자세 → 준비 → 베기 → 끝 → 거두기 → 쉬는 자세. 연속 베기는 앞 동작의 끝 자세에서 바로 이어짐 */
const GAIT_N = 24, KN_SUB = 3, KN_N = KN_SUB * 5 + 1, DG_N = 13;
function mKeys(keys, u) {
  const n = keys.length - 1, i = Math.min(n - 1, Math.max(0, Math.floor(u))), t = clamp(u - i, 0, 1), a = keys[Math.max(0, i - 1)], b = keys[i], c = keys[i + 1], d = keys[Math.min(n, i + 2)];
  return b.map((v, k) => .5 * (2 * v + (c[k] - a[k]) * t + (2 * a[k] - 5 * v + 4 * c[k] - d[k]) * t * t + (3 * v - a[k] - 3 * c[k] + d[k]) * t * t * t));
}
const M_KREST = [2, 14, 1.2, 0, 0], M_KRESTF = [-1, 14, 1.4, 0, 0], _kk = {};
function mKnifeKeys(c, front, chain) {
  const id = c + (front ? 'f' : 's') + (chain ? 'c' : ''); if (_kk[id]) return _kk[id];
  const T = front ? M_KNF : M_KN, rest = front ? M_KRESTF : M_KREST;
  const ks = [chain ? T[(c + 2) % 3][2] : rest, ...T[c], rest].map(k => k.slice());
  for (let i = 1; i < ks.length; i++) { while (ks[i][2] - ks[i - 1][2] > Math.PI) ks[i][2] -= TAU; while (ks[i][2] - ks[i - 1][2] < -Math.PI) ks[i][2] += TAU; }   // 칼 방향은 가까운 쪽으로 돎
  ks.forEach((k, i) => k.push((i === 0 && !chain) || i === ks.length - 1 ? 0 : 1));   // 마지막 값: 우비를 열고 싸움 자세에 든 정도
  return (_kk[id] = ks);
}
function mKnifeAt(anim, fr, front) { const k = mKeys(mKnifeKeys(+anim[5] - 1, front, anim[6] === 'c'), fr / KN_SUB); k[5] = clamp(k[5], 0, 1); return k; }
const M_DG = [[-1, -21, .3, 5, -2.2, -5, -2.2, 0, 0, 0], [2, -22, .75, 10, -4, -9, -2.6, -.2, .5, 1], [0, -19, 1, 9, -5, -12, -8, -.1, .9, 1.6], [0, -19, .55, 8, -2.2, -8, -3, 0, .5, .8], [0, -23.5, .2, 5, -2.2, -5, -2.2, 0, 0, .2]];
const M_DGF = [[5, 0, 0], [8, 1.4, 1], [10, 2, 2], [7, 1, 1.6], [2, .2, .5]];
const M_KNEEL = { knN: [5.5, -11.5], anN: [6.5, -2.2], knF: [-3, -2.6], anF: [-10, -5], bootF: Math.PI / 2, bootN: 0 };
const M_KN = [   // 칼 세 번: [어깨에서 본 손 x, y, 칼 방향, 몸이 나가는 정도, 자락이 날리는 정도] × 네 자세 (준비 · 베기 · 끝 · 거두기)
  [[-8, -13.5, -2.6, -.9, .1], [15.5, -6, -.6, 1.2, 1.6], [7, 14, 1.25, 1.45, 1.1], [6, 10.5, 1, .5, .4]],     // 머리 뒤로 젖혔다가 몸을 실어 내려 벰
  [[2, 14.5, 1.6, .2, .3], [15.5, 4, .25, 1.25, 1.4], [2, -16, -1.75, 1.1, 1.7], [4.5, -11, -1.3, .5, .5]],    // 낮게 깔았다가 위로 크게 걷어 올림
  [[-9.5, 3, -.1, -1, 0], [16.8, -.5, 0, 2, 2.1], [16.8, 0, 0, 1.85, 1.5], [9, 4, .2, .6, .5]],                // 한껏 당겼다가 뛰어들며 깊게 찌름
];
function mSidePose(anim, fr, o) {
  let P;
  switch (anim) {
    case 'walk': case 'run': case 'sneak': return mGait(anim, fr / GAIT_N);
    case 'sneakIdle': return mLegs(mTorso({}, [0, -20.5 + (fr % 2) * .3], .34), [4.5, -2.2], [-5, -2.2]);
    case 'dodge': {
      const D = mKeys(M_DG, fr / (DG_N - 1) * 4);
      return mLegs(mTorso({}, [D[0], D[1]], D[2], { flare: D[9] }), [D[3], Math.min(-2.2, D[4])], [D[5], Math.min(-2.2, D[6])], D[7], D[8]);
    }
    case 'knife1': case 'knife2': case 'knife3': case 'knife1c': case 'knife2c': case 'knife3c': {
      // 우비 앞자락을 뒤로 넘기고, 어깨부터 팔 전체로 크게 휘두름. 내디딘 무릎이 굽고 몸이 실림
      const K = mKnifeAt(anim, fr, false), lu = K[3], e = K[5], fw = Math.max(0, lu);
      P = mLegs(mTorso({}, [lu * 3.8, lerp(-27, -25.2, e) + fw * 2.7], e * .06 + lu * .2, { flare: K[4] + fw * .3, tilt: .04 - lu * .06 }), [lerp(3.4, 6, e) + fw * 8.2, -2.2], [lerp(-3.2, -6.5, e) - fw * 1.6 + Math.min(0, lu) * 2, -2.2], 0, e * .1 + clamp((lu - .3) * 2, 0, 1) * .6);
      const S = [P.sh[0] + 1.6 + lu * 1.2, P.sh[1] + 3], H = [S[0] + K[0], S[1] + K[1]], S2 = [P.sh[0] - 1, P.sh[1] + 3.4], H2 = [S2[0] + 2.5 - K[0] * .5, S2[1] + 11 - Math.abs(K[0]) * .22];
      P.open = e; P.armU = [S, mElbow(S, H, 1)]; P.armN = [P.armU[1], H]; P.knife = K[2];
      P.armB = [S2, mElbow(S2, H2, 1), H2]; P.rifleBack = [P.sh[0] - 9 - K[4], P.sh[1] + 24 - K[4] * 2, P.sh[0] - 5, P.sh[1] - 12];
      return P;
    }
    case 'aim': {
      const a = o.a || 0, rc = o.recoil || 0, dx = Math.cos(a - rc * .12), dy = Math.sin(a - rc * .12);
      if (o.kneel) P = Object.assign(mTorso({}, [0, -17], .03 - rc * .05, { rifleBack: false }), M_KNEEL, { hemF: [10, -14], hemB: [-8, -12] });
      else P = mLegs(mTorso({}, [0, -26 + (o.br || 0)], .05 - rc * .06, { rifleBack: false }), [6.5, -2.2], [-5.5, -2.2]);
      const b = [P.sh[0] - 1.6 - rc * 1.8 * dx, P.sh[1] + 2 - rc * 1.8 * dy], at = d => [b[0] + dx * d, b[1] + dy * d];
      P.rifle = [b[0], b[1], ...at(26)]; P.muz = at(27.5);
      const tr = o.bolt ? at(8.4) : at(5.4); P.armF = [[P.sh[0] + .4, P.sh[1] + 6], [tr[0], tr[1] + (o.bolt ? -1.6 : .9)]];
      const su = at(12.8); P.armN = [[P.sh[0] + 5.4 + dx, P.sh[1] + 7 + dy * 2], [su[0], su[1] + 1.2]];
      P.tilt += a * .35; P.hatTilt += a * .35; P.pouch = null;
      return P;
    }
    case 'hit': return mLegs(mTorso({}, [-1, -25], -.24, { tilt: -.2, flare: -.4 }), [4, -2.2], [-7, -2.2]);
    case 'down': return Object.assign(mTorso({}, [-1, -16], .5, { tilt: .5 }), M_KNEEL);
    case 'gather': P = mLegs(mTorso({}, [-1.5, -11], .3, { tilt: .2 }), [4.5, -2.2], [3, -2.2]); P.hemF = [11, -10]; P.hemB = [-7, -5.5]; P.rifleBack = [-9, -8, -1, -40]; P.pouch = null;
      P.armN = [[8.6, -19], [12.6, fr % 2 ? -9 : -5]]; P.armF = [[7, -18], [9.5, -9]]; P.knife = fr % 2 ? 1.2 : .7; P.knifeK = 'forage'; return P;
    case 'pet': case 'lift': P = Object.assign(mTorso({}, [-1, -16], .12, { tilt: .2 }), M_KNEEL); P.hemF = [9.5, -13]; P.hemB = [-9, -11]; P.rifleBack = [-9, -14, 1, -48]; P.pouch = null;
      if (anim === 'pet') { P.armN = [[6.5, -23], [12 + (fr % 2) * 1.6, -13.6 + (fr % 2) * .8]]; P.armF = [[5, -24], [7, -15]]; } else { P.armN = [[7, -22], [12.4, -15 - fr * 3]]; P.armF = [[6, -22], [10.6, -14 - fr * 3]]; }
      return P;
    case 'hammer': P = Object.assign(mTorso({}, [-1, -16], .14, { tilt: .1 }), M_KNEEL); P.hemF = [9.5, -13]; P.hemB = [-9, -11]; P.rifleBack = [-9, -14, 1, -48]; P.pouch = null;
      { const up = fr % 2 === 0, h = up ? [7.5, -43] : [12, -20]; P.armN = [[6, up ? -36 : -27], h]; P.armF = [[6, -24], [12, -6]];
        P.extra = R => { const d = up ? [3, -4.5] : [3.2, 3.6]; R.K2(h[0], h[1], h[0] + d[0], h[1] + d[1], .6, .6, MANP.WOOD, { g: 'mh', ol: 1 }); R.B(h[0] + d[0] * 1.24, h[1] + d[1] * 1.24, 4.4, 2.8, up ? -.6 : .8, MANP.WOOD, { g: 'mb', ol: 1 }); R.K2(12.6, -.5, 12.6, up ? -6 : -4, .6, .5, MANP.WOOD, { g: 'peg', ol: 1 }); }; }
      return P;
    case 'sit': P = mTorso({}, [0, -10], .06 + (fr % 2) * .01, { tilt: .08, rifleBack: false }); P.knN = [8.5, -12.5]; P.anN = [10, -2.2]; P.knF = [7, -12]; P.anF = [8.6, -2.2]; P.bootN = P.bootF = 0;
      P.hemF = [13, -11]; P.hemB = [-8, -8]; P.pouch = null; P.armF = [[6, -19], [12.6, -17]]; P.armN = [[6.4, -18.4], [13.4, -15.4 - (fr % 2) * .6]]; return P;
  }
  return mLegs(mTorso({}, [0, -27 + [0, .25, .45, .25][fr % 4]], 0), [3.4, -2.2], [-3.2, -2.2]);
}
function mSide(R, anim, fr, o = {}) {
  const c = o.cat, P = mSidePose(anim, fr, o), op = P.open || 0;
  if (anim === 'down' && fr > 0) { R.translate(-20, -8); R.rotate(1.3); }
  if (P.rifleBack) mRifle(R, P.rifleBack[0], P.rifleBack[1], P.rifleBack[2], P.rifleBack[3]);
  if (op > 0) mCapeS(R, P);
  if (op > .3 && P.armB) { mUpper(R, P.armB[0], P.armB[1], true, 'ub'); mArm(R, P.armB[1], P.armB[2], true, 'ab'); }
  mLeg(R, P.hip, P.knF, P.anF, true, 'lf', P.bootF);
  if (c && c.mode === 'under') { if (anim === 'walk') mCatAt(R, 5, 0, r => solDraw(r, 'trot', fr / GAIT_N * 16, { tail: 'level', eye: 'open' })); else mCatAt(R, 9.4, 0, r => solDraw(r, 'sit', 0, { eye: c.st === 'alert' ? 'wide' : 'open', ear: c.st === 'alert' ? 1 : 0, tail: 'wrap' })); }
  mLeg(R, P.hip, P.knN, P.anN, false, 'ln', P.bootN);
  if (op > 0) mBodyS(R, P);
  mPoncho(R, P.sh, P.front, P.hemF, P.hemB, P.back, { pouch: op > .3 ? null : P.pouch, bulge: c && c.mode === 'arms', open: op });
  if (c && c.mode === 'bag') mBagS(R, P.sh, c);
  mHeadS(R, P.head, P.tilt); mHatS(R, P.head, P.hatTilt);
  if (c && c.mode === 'arms') mArmsS(R, P.sh, c);
  if (P.armF) mArm(R, P.armF[0], P.armF[1], true, 'af');
  if (P.rifle) mRifle(R, P.rifle[0], P.rifle[1], P.rifle[2], P.rifle[3]);
  if (P.armU) mUpper(R, P.armU[0], P.armU[1], false, 'au');
  if (P.knife != null) mKnife(R, P.armN[1], P.knife, P.knifeK);
  if (P.armN) mArm(R, P.armN[0], P.armN[1], false, 'an');
  if (P.extra) P.extra(R);
  return P.muz ? { muz: R.pt(P.muz[0], P.muz[1]) } : null;
}

/* ---------- 앞 · 뒤 부품 ---------- */
function mBootF(R, x, y, g, back) {
  const P = MANP;
  R.K2(x, y - 8.6, x, y - 2.4, 2.5, 2.5, P.BOOT, { g, ol: 1 });
  R.E(x, y - 1.6, back ? 2.6 : 3, 1.8, 0, P.BOOT, { g, ol: 1 });
  R.K2(x - 3.2, y + .2, x + 3.2, y + .2, .7, .7, P.SOLE, { g: g + 's', ol: 1 });
  R.K2(x - 2.6, y - 9, x + 2.6, y - 9, 1, 1, P.CUFF, { g: g + 'c', ol: 1 });
  if (back) R.DL(x, y - 8, x, y - 3, P.BOOT[0]);
  else { R.DL(x - 1.2, y - 7.6, x + 1.2, y - 6.4, M_LACE); R.DL(x + 1.2, y - 7.6, x - 1.2, y - 6.4, M_LACE); R.DL(x - 1.2, y - 5.4, x + 1.2, y - 4.2, M_LACE); R.DL(x + 1.2, y - 5.4, x - 1.2, y - 4.2, M_LACE); R.stamp(x + 1.4, y - 2.4, ['hh'], { h: '#7e6650' }); }
  for (let k = 0; k < 4; k++) R.stamp(x - 1.8 + k * 1.2, y - 9.1, ['w'], { w: '#d8ccb8' });
}
// o.sw 걸음에 따른 자락 흔들림 · o.fl 펄럭임 · o.cx 가운데 쏠림 · o.back 뒷모습 · o.bulge 품에 솔 · o.bag 배낭
function mPonchoF(R, top, hem, o = {}) {
  const P = MANP, sw = o.sw || 0, fl = o.fl || 0, cx = o.cx || 0, op = o.open || 0, sd = o.back ? -1 : 1;
  let hL = [-13.5 - fl, hem - 2 + sw - fl * .6], hC = [cx, hem + 1], hR = [13.5 + fl, hem - 2 - sw - fl * .6];
  if (op > 0) {   // 칼 든 쪽 자락을 어깨 위로 걷어 올림 (뒷모습은 반대쪽)
    const up = [-sd * 8.5, top + 10.5], q = sd > 0 ? hL : hR; q[0] = lerp(q[0], up[0], op); q[1] = lerp(q[1], up[1], op); hC = [cx + sd * 4.5 * op, hem + 1 - op * 1.5];
    const far = sd > 0 ? hR : hL; far[0] += sd * fl * 1.2; far[1] -= fl * 1.4;
  }
  const dSeg = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; return Math.abs(((x - a[0]) * dy - (y - a[1]) * dx) / Math.hypot(dx, dy)); };
  const alt = (x, y) => (Math.min(dSeg(x, y, hL, hC), dSeg(x, y, hC, hR)) < 2.2 ? 0 : gmod(Math.abs(x) * .55 - y * .28, 5) < .75 ? 1 : -1);
  R.P([[-5, top], [5, top], [9.5, top + 5], hR, hC, hL, [-9.5, top + 5]], P.PON, R.pat({ g: 'pon', ol: 1, alts: [P.TRIM, P.STR], alt }));
  if (o.bulge) R.E(0, top + 13, 8.8, 7.8, 0, P.PON, R.pat({ g: 'pon', ol: 1, alts: [P.TRIM, P.STR], alt: (x, y) => (gmod(Math.abs(x) * .55 - y * .28, 5) < .75 ? 1 : -1) }));
  for (let t = .06; t < 1; t += .075) for (const [a, b] of [[hL, hC], [hC, hR]]) if (op < .3 || a[1] > top + 16 && b[1] > top + 16) R.stamp(lerp(a[0], b[0], t), lerp(a[1], b[1], t) - 2.9, ['s'], { s: '#86a48a' });
  if (o.back) {
    R.P([[-5.4, top + .4], [5.4, top + .4], [6, top + 7], [0, top + 12.4], [-6, top + 7]], P.PON, { g: 'hood', ol: 1 });
    R.DL(0, top + 12.4, cx, hem, P.PON[0]);
    if (!o.bag) R.K2(7, top + 1.4, -9, top + 22, .85, .85, P.LEA, { g: 'sling', ol: 1 });
    else for (const sd of [-1, 1]) R.K2(sd * 6, top + 1, sd * 7.4, top + 16, .8, .8, P.LEA, { g: 'strap' + sd, ol: 1 });
    return;
  }
  R.E(0, top + .8, 5.6, 2.2, 0, P.PON, { g: 'hood', ol: 1 });
  R.DL(0, top + 2.4, cx, hem, P.PON[0]);
  R.DL(-1.2, top + 2.6, -1.7, top + 6.4, '#d8c8a0'); R.DL(1.2, top + 2.6, 1.7, top + 6.4, '#d8c8a0');
  if (!o.bulge && op < .3) for (const y of [top + 8, top + 14, top + 20]) R.B(2, y, 2.2, .9, 0, P.LEA, { g: 'tg' + y, ol: 1 });
  if (o.bag) for (const sd of [-1, 1]) R.K2(sd * 6, top + 1, sd * 7.6, top + 15, .8, .8, P.LEA, { g: 'strap' + sd, ol: 1 });
  else { R.K2(6.4, top + 1.4, -8.4, top + 22, .85, .85, P.LEA, { g: 'sling', ol: 1 }); R.stamp(-1.2, top + 12, ['bb'], M_BRASS); }
  if (op > .3) R.E(-7.6, top + 6.5, 3.6, 3, .3, P.PON, { g: 'fold', ol: 1 });
  if (o.pouch !== false) { R.E(10, top + 21, 2.2, 2.6, 0, P.LEA, { g: 'pouch', ol: 1 }); R.DL(8, top + 20, 12, top + 20, P.LEA[0]); R.stamp(10.4, top + 24.4, ['b'], M_BRASS); }
}
function mHeadF(R, x, y) {
  const P = MANP;
  R.E(x - 3.9, y + .6, 1.1, 1.6, 0, P.SKIN, { g: 'earL', ol: 1 }); R.E(x + 3.9, y + .6, 1.1, 1.6, 0, P.SKIN, { g: 'earR', ol: 1 });
  R.E(x, y, 3.7, 4.2, 0, P.SKIN, { g: 'face' });
  R.P([[x - 3.8, y + 1], [x + 3.8, y + 1], [x + 3.9, y + 4], [x + 2, y + 7.4], [x, y + 8.4], [x - 2, y + 7.4], [x - 3.9, y + 4]], P.BEARD, R.pat({ g: 'beard', ol: 1, alts: [[P.BEARD[0], P.BEARD[2], P.BEARD[2]]], alt: (X, Y) => (hash2(Math.round(X * 2), Math.round(Y * 2)) > .72 ? 0 : -1) }));
  R.P([[x - .9, y - 1.6], [x + .9, y - 1.6], [x + 1.4, y + 2.4], [x, y + 3], [x - 1.4, y + 2.4]], P.SKIN, { g: 'nose', ol: 1 });
  R.DL(x - 2.8, y + 3.8, x - 1, y + 3.3, P.BEARD[0]); R.DL(x + 2.8, y + 3.8, x + 1, y + 3.3, P.BEARD[0]);
}
function mHatF(R, x, y, tilt, drop) {
  const P = MANP;
  R.push(); R.translate(x, y + (drop || 0)); R.rotate(tilt || 0);
  R.P([[-4.7, -3], [-4.5, -7.8], [-2.2, -9.4], [0, -8.2], [2.2, -9.4], [4.5, -7.8], [4.7, -3]], P.HAT, { g: 'crown', ol: 1 });
  R.P([[-4.8, -3], [4.8, -3], [4.7, -4.8], [-4.7, -4.8]], P.BAND, { g: 'band', ol: 1 });
  R.E(3.2, -3.9, .8, .8, 0, ['#8a6a20', '#d8b040', '#fff0a0'], { g: 'ring', ol: 1 });
  for (let k = 0; k < 8; k++) R.stamp(-4.2 + k * 1.1, -5.1, ['s'], { s: '#7a5a34' });
  R.DL(0, -8.2, 0, -5.4, P.HAT[0]);
  R.P([[-11.5, -3.6], [-6, -4.4], [6, -4.4], [11.5, -3.6], [10.6, -1.8], [4.4, -.8], [0, -.4], [-4.4, -.8], [-10.6, -1.8]], P.HAT, { g: 'brim', ol: 1, cl: 1 });
  R.DL(-6, -4.3, 6, -4.3, P.HAT[2]); R.DL(-10, -2.2, -4.4, -1.2, P.HAT[0]); R.DL(10, -2.2, 4.4, -1.2, P.HAT[0]);
  R.pop();
}
// 앞 · 뒤 공통 몸놀림: s 걸음(-1~1) · cr 웅크림 · fl 우비 펄럭임 · bob · wide 발 벌림
function mFB(anim, fr, o) {
  const q = { s: 0, cr: 0, fl: 0, bob: 0, wide: 0 };
  if (anim === 'walk' || anim === 'run' || anim === 'sneak') {
    const a = fr / GAIT_N * TAU, run = anim === 'run'; q.s = Math.sin(a) * (run ? 1.5 : anim === 'sneak' ? .7 : 1); q.bob = Math.abs(Math.sin(a)) * (run ? 1.8 : 1) - .5;
    if (run) q.fl = 1.2 + Math.sin(a * 2) * .7; else if (anim === 'walk') q.fl = .35 + Math.sin(a * 2 + 1) * .35; if (anim === 'sneak') q.cr = 6;
  } else if (anim === 'sneakIdle') q.cr = 6 + (fr % 2) * .3;
  else if (anim === 'dodge') { const D = mKeys(M_DGF, fr / (DG_N - 1) * 4); q.cr = D[0]; q.fl = Math.max(0, D[1]); q.wide = Math.max(0, D[2]); }
  else if (anim.startsWith('knife')) { const K = mKnifeAt(anim, fr, true), e = K[5], u = fr / KN_SUB, bl = (c, w) => Math.exp(-(u - c) * (u - c) / w); q.cr = 2 * e - 2 * bl(1, .3) + 5 * bl(2.3, .5); q.wide = e * 1.6 + 2.6 * bl(2.3, .5); q.fl = Math.max(0, K[4]) * 1.5; q.open = e; q.lean = -2.4 * bl(1, .4) + 3.6 * bl(2.4, .6); }   // 준비 때 살짝 일어섰다가 베면서 낮게 가라앉음
  else if (anim === 'aim') { q.wide = .8; q.cr = o.kneel ? 5 : 0; q.bob = o.br || 0; }
  else if (anim === 'hit') { q.cr = 1.5; q.fl = .8; }
  else q.bob = [0, .25, .45, .25][fr % 4];
  return q;
}
const M_KNF = [   // 앞모습 칼: [어깨에서 본 손 x, y, 칼 방향, (안 씀), 자락이 날리는 정도]
  [[-6, -15, -1.8, 0, .2], [-16.5, -2, -3.1, 0, 1.4], [4, 14, .8, 0, 1.1], [0, 10.5, 1.2, 0, .4]],
  [[4, 14, .8, 0, .3], [-15.5, 6, 2.6, 0, 1.3], [-8, -15.5, -2.1, 0, 1.6], [-6, -10.5, -1.9, 0, .5]],
  [[-4, -1, 1.57, 0, 0], [3.5, 14.5, 1.57, 0, 1.8], [3.5, 14.5, 1.57, 0, 1.4], [0, 9, 1.5, 0, .5]],
];
// 우비 속 몸 (앞 · 뒤): 셔츠와 허리띠
function mBodyF(R, sx, y0) { const M = MANP; R.K2(sx, -41 + y0, sx * .4, -27 + y0, 7, 6.4, M.SHIRT, { g: 'body', ol: 1 }); R.K2(-6.4 + sx * .4, -27.6 + y0, 6.4 + sx * .4, -27.6 + y0, 1.1, 1.1, M.LEA, { g: 'belt', ol: 1 }); R.stamp(sx * .4, -27.6 + y0, ['b'], M_BRASS); }
function mEat(R, fr) {   // 책상다리로 앉아 꼬치를 굽기
  const P = MANP, k = fr % 2;
  R.K2(-3, -12, -11, -7, 3, 2.7, P.TRO, { g: 'tL', ol: 1 }); R.K2(3, -12, 11, -7, 3, 2.7, P.TRO, { g: 'tR', ol: 1 });
  R.K2(-11, -6.5, 2, -3.2, 2.6, 2.3, P.TRO, { g: 'sL', ol: 1 }); R.K2(11, -6.5, -2, -4, 2.6, 2.3, P.TRO, { g: 'sR', ol: 2 });
  R.E(4.6, -3, 3, 2, -.2, P.BOOT, { g: 'bL', ol: 1 }); R.K2(2.6, -1.2, 7.4, -1.8, .6, .6, P.SOLE, { g: 'bLs', ol: 1 });
  R.E(-4.6, -3.8, 3, 2, .2, P.BOOT, { g: 'bR', ol: 1 }); R.K2(-2.6, -2, -7.4, -2.6, .6, .6, P.SOLE, { g: 'bRs', ol: 1 });
  mPonchoF(R, -34, -9, { pouch: false }); mHeadF(R, 0, -39.5); mHatF(R, 0, -39.5);
  mArm(R, [9, -21], [14, -19.5 - k * .6], false, 'aR'); mArm(R, [-9.5, -14], [-11.6, -10.6], false, 'aL');
  R.K2(14, -19.5 - k * .6, 28, -25.5 - k, .45, .45, P.WOOD, { g: 'sk' });
  [[22, -23, '#8a4a24'], [25, -24.3, '#d8c8a0'], [27.4, -25.3, '#8a4a24']].forEach(([x, y, c], i) => R.E(x, y - k * .8, 1.5, 1.2, -.4, [mix(c, '#1a0e08', .4), c, mix(c, '#fff0d0', .3)], { g: 'm' + i, ol: 1 }));
}
function mFront(R, anim, fr, o = {}) {
  if (anim === 'eat') return mEat(R, fr);
  const P = MANP, q = mFB(anim, fr, o), c = o.cat, y0 = q.cr + q.bob, sx = q.s * .6 + (q.lean || 0), under = c && c.mode === 'under', aim = anim === 'aim', op = q.open || 0;
  const kk = anim.startsWith('knife') ? mKnifeAt(anim, fr, true) : null, hitX = anim === 'hit' ? -1 : 0;
  let muz = null;
  if (!aim) mRifle(R, -10 + sx, -26 + y0, 10 + sx, -62 + y0);
  if (c && c.mode === 'bag') mCatAt(R, 8.6 + sx + (c.st === 'squirm' && c.fr % 2 ? .8 : 0), -43.8 + y0 + (c.st === 'hide' ? 3 : c.st === 'sleep' ? 1 : 0), r => solHeadF(r, 0, 0, mCatFace(c)));
  const wd = 4.2 + q.wide + (under ? 1 : 0);
  for (const L of [-1, 1].map(sd => ({ sd, k: sd * q.s })).sort((A, B) => A.k - B.k)) {
    const x = L.sd * wd, lift = Math.max(0, -L.k) * 3.4, fw = Math.max(0, L.k) * 2;
    R.K2(x + sx * .4, -27 + y0, x, -8 - lift + fw, 3, 2.5, P.TRO, { g: 'lg' + L.sd, ol: 1 }); mBootF(R, x, -lift + fw, 'fb' + L.sd, false);
  }
  if (under) mCatAt(R, 0, 2.6, r => solDraw(r, anim === 'walk' ? 'fwalk' : 'fsit', fr / GAIT_N * 16, { eye: c.st === 'alert' ? 'wide' : 'open', ear: c.st === 'alert' ? 1 : 0 }));
  if (op > 0) mBodyF(R, sx, y0);
  mPonchoF(R, -45 + y0, -12 + y0, { sw: q.s * 2, fl: q.fl, cx: sx, bulge: c && c.mode === 'arms', bag: c && c.mode === 'bag', open: op, pouch: op > .3 ? false : undefined });
  if (c && c.mode === 'bag' && c.st !== 'hide') R.E(7.4 + sx, -41.4 + y0, 1.3, 1, 0, SOLP.WHT, { g: 'cp', ol: 1 });
  if (aim) {
    const a = o.a == null ? Math.PI / 2 : o.a, rc = o.recoil || 0, dx = Math.cos(a), dy = Math.sin(a) * .8, b = [-3.2 - dx * rc * 1.5, -38 + y0 - dy * rc * 1.5], at = d => [b[0] + dx * d, b[1] + dy * d];
    mArm(R, [-8.6, -33 + y0], o.bolt ? at(6) : at(3.2), false, 'af'); mRifle(R, b[0], b[1], at(17)[0], at(17)[1]); mArm(R, [7, -32 + y0], at(10), false, 'an'); muz = at(18.5);
  }
  if (kk) { const S = [-7.6 + sx, -40.5 + y0], H = [S[0] + kk[0], S[1] + kk[1]], E = mElbow(S, H, 1); mUpper(R, S, E, false, 'au'); mKnife(R, H, kk[2]); mArm(R, E, H, false, 'an'); }
  const nod = aim ? 1 : anim === 'hit' ? -1 : 0;
  mHeadF(R, sx + hitX, -50.5 + y0 + nod); mHatF(R, sx + hitX, -50.5 + y0 + nod, anim === 'hit' ? -.12 : q.s * .02, aim ? .8 : 0);
  if (c && c.mode === 'arms') {
    const wig = c.st === 'squirm' && c.fr % 2 ? .8 : 0, hide = c.st === 'hide' ? 2.6 : 0;
    mCatAt(R, .5 + sx + wig, -38.4 + y0 + hide, r => solHeadF(r, 0, 0, mCatFace(c)));
    if (!hide) for (const sd of [-1, 1]) R.E(.5 + sx + sd * 2.6 + wig, -34.6 + y0, 1.3, 1, 0, SOLP.WHT, { g: 'cp' + sd, ol: 1 });
  }
  return muz ? { muz: R.pt(muz[0], muz[1]) } : null;
}
function mBack(R, anim, fr, o = {}) {
  const P = MANP, q = mFB(anim, fr, o), c = o.cat, y0 = q.cr + q.bob, sx = q.s * .6 - (q.lean || 0), under = c && c.mode === 'under', aim = anim === 'aim', bag = c && c.mode === 'bag', op = q.open || 0;
  const kk = anim.startsWith('knife') ? mKnifeAt(anim, fr, true) : null;
  let muz = null;
  if (aim) {
    const a = o.a == null ? -Math.PI / 2 : o.a, rc = o.recoil || 0, dx = Math.cos(a), dy = Math.sin(a), b = [3.2 - dx * rc * 1.5, -39 + y0 - dy * rc * 1.5], at = d => [b[0] + dx * d, b[1] + dy * d];
    mArm(R, [9, -35 + y0], o.bolt ? at(7) : at(4), false, 'af'); mRifle(R, b[0], b[1], at(26)[0], at(26)[1]); mArm(R, [-7.5, -34 + y0], at(11), false, 'an'); muz = at(27.5);
  }
  if (kk) { const S = [7.6 + sx, -40.5 + y0], H = [S[0] - kk[0], S[1] + kk[1]], E = mElbow(S, H, -1); mUpper(R, S, E, false, 'au'); mKnife(R, H, Math.PI - kk[2]); mArm(R, E, H, false, 'an'); }
  if (under) mCatAt(R, 0, -1.8, r => solDraw(r, anim === 'walk' ? 'bwalk' : 'bsit', fr / GAIT_N * 16, { ear: c.st === 'alert' ? 1 : 0 }));
  const wd = 4.2 + q.wide + (under ? 1 : 0);
  for (const L of [-1, 1].map(sd => ({ sd, k: sd * q.s })).sort((A, B) => B.k - A.k)) {
    const x = L.sd * wd, lift = Math.max(0, L.k) * 3.4, fw = Math.max(0, -L.k) * 1.2;
    R.K2(x + sx * .4, -27 + y0, x, -8 - lift + fw, 3, 2.5, P.TRO, { g: 'lg' + L.sd, ol: 1 }); mBootF(R, x, -lift + fw, 'bb' + L.sd, true);
  }
  mPonchoF(R, -45 + y0, -12 + y0, { back: true, sw: q.s * 2, fl: q.fl, cx: sx, bag, open: op * .6 });
  if (bag) {
    R.P([[-7, -42 + y0], [7, -42 + y0], [8, -26 + y0], [-8, -26 + y0]], P.LEA, { g: 'bag', ol: 1 });
    R.P([[-7.2, -42.2 + y0], [7.2, -42.2 + y0], [7.6, -35.6 + y0], [-7.6, -35.6 + y0]], P.BOOT, { g: 'bagF', ol: 1 });
    R.stamp(-3, -35 + y0, ['b'], M_BRASS); R.stamp(3, -35 + y0, ['b'], M_BRASS); R.DL(-7.4, -30 + y0, 7.4, -30 + y0, P.LEA[0]);
  }
  if (!aim) { if (bag) mRifle(R, -11.4 + sx, -22 + y0, -9 + sx, -60 + y0); else mRifle(R, -9 + sx, -22 + y0, 9 + sx, -61 + y0); }
  R.E(sx, -50.5 + y0, 3.9, 4.2, 0, P.BEARD, { g: 'hair' }); R.E(sx - 3.9, -50 + y0, 1.1, 1.6, 0, P.SKIN, { g: 'earL', ol: 1 }); R.E(sx + 3.9, -50 + y0, 1.1, 1.6, 0, P.SKIN, { g: 'earR', ol: 1 });
  mHatF(R, sx, -50.5 + y0, anim === 'hit' ? .12 : q.s * .02);
  if (bag) mCatAt(R, c.st === 'squirm' && c.fr % 2 ? .8 : 0, -44.6 + y0 + (c.st === 'hide' ? 3 : c.st === 'sleep' ? 1 : 0), r => solHeadB(r, 0, 0, mCatFace(c)));
  return muz ? { muz: R.pt(muz[0], muz[1]) } : null;
}

/* ---------- 자세 목록 ----------
   manDraw(R, 동작, 프레임, 방향 's' | 'd' | 'u', { a 조준 각도, kneel, recoil, bolt, cat: { mode, st, fr } }) → { muz } */
const MAN_N = { idle: 4, walk: GAIT_N, run: GAIT_N, sneak: GAIT_N, sneakIdle: 2, dodge: DG_N, knife1: KN_N, knife2: KN_N, knife3: KN_N, hit: 1, down: 2, gather: 2, pet: 2, lift: 2, hammer: 2, sit: 2, eat: 2, aim: 1 };
function manDraw(R, anim, fr, dir, o) { R.scl(MAN_S); return dir === 'd' ? mFront(R, anim, fr, o) : dir === 'u' ? mBack(R, anim, fr, o) : mSide(R, anim, fr, o); }
