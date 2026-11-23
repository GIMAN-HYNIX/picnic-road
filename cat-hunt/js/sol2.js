'use strict';
/* =========================================================
   솔 리디자인 시안: 부드러운 명암 + 털 질감 + 실제 고양이 비율
   - 여섯 단계 색 띠로 명암 (그림자는 푸른 보라, 빛은 따뜻하게)
   - 외곽선은 검정 대신 바로 옆 색을 어둡게 (선택 외곽선)
   - 빛 받는 쪽 가장자리에 옅은 테두리 빛
   단위: 원점은 발 가운데, 위가 -y, 오른쪽을 봄. 몸길이(코~엉덩이) 약 40
   ========================================================= */
function ramp6(b, cool = '#2a2038', warm = '#fff0d6') { return [mix(b, cool, .56), mix(b, cool, .38), mix(b, cool, .19), b, mix(b, warm, .2), mix(b, warm, .38)]; }
const S2 = {
  FUR: ramp6('#9e8d79'), FURD: ramp6(mix('#9e8d79', '#2a2038', .22)), STR: ramp6('#5e4f43'), STRD: ramp6(mix('#5e4f43', '#2a2038', .22)),
  WHT: ramp6('#eee8de', '#5a6478', '#ffffff'), WHTD: ramp6('#cfc9c2', '#4a5468', '#f4f0ea'), PINK: ramp6('#e6a2a0'), RED: ramp6('#c0432f'), REDD: ramp6('#8e2c20'),
};
const SOFT = { cel: null, cast: true, castStep: true, contour: true, olCol: '#4e3c34', outline: null, clean: true, dither: 0 };
function s2Rim(pb) {
  const W = pb.w, d = pb.d, src = new Uint32Array(d), wc = rgbOf('#fff4e0');
  for (let y = 0; y < pb.h; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!(src[i] >>> 24)) continue;
    const up = y > 0 && (src[i - W] >>> 24), lf = x > 0 && (src[i - 1] >>> 24);
    if (!up || !lf) d[i] = _mixU(src[i], wc, !up && !lf ? .3 : .17);
  }
}
function s2SelOut(pb) {
  const W = pb.w, H = pb.h, d = pb.d, src = new Uint32Array(d), dk = rgbOf('#1c1218');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (src[i] >>> 24) continue;
    let c = 0, t = .66;
    if (y < H - 1 && src[i + W] >>> 24) { c = src[i + W]; t = .52; }
    else if (x < W - 1 && src[i + 1] >>> 24) c = src[i + 1];
    else if (x > 0 && src[i - 1] >>> 24) c = src[i - 1];
    else if (y > 0 && src[i - W] >>> 24) { c = src[i - W]; t = .74; }
    if (c) d[i] = _mixU(c, dk, t);
  }
}
function softBake(W, H, ox, oy, k, fn) { const pb = hiBake(W, H, ox, oy, R => { R.scl(k); fn(R); }, SOFT); s2Rim(pb); s2SelOut(pb); return pb; }

/* ---------- 부품 ---------- */
const s2Stripe = (x, y) => (y < -13 && mod(x + Math.sin(y * .7) * 1.4, 4.4) < 1.5 ? 0 : -1);
function s2Eye(R, x, y, kind) {
  const pal = { L: '#2a1c18', G: '#9cc850', g: '#c8e47a', P: '#141010', w: '#fffaf0' };
  const rows = kind === 'shut' ? ['.LLL.', 'L...L'] : kind === 'half' ? ['LLLL', 'GgPG'] : kind === 'wide' ? ['.LLL.', 'LwgGL', 'LGPGL', '.GGG.'] : ['.LLL', 'LwgP', '.GGP'];
  R.stamp(x, y, rows, pal, 2, 1);
}
// 머리: hx, hy 가 머리뼈 가운데. o.ear: 0 보통 · 1 뒤로 젖힘, o.eye
function s2Head(R, hx, hy, o = {}) {
  const { FUR, FURD, STR, WHT, PINK } = S2, back = o.ear === 1;
  if (back) {
    R.P([[hx - 2.6, hy - 3.4], [hx - 7.6, hy - 6.6], [hx - 1.4, hy - 5.4]], FURD, { g: 'earF' });
    R.P([[hx - .8, hy - 4.2], [hx - 6.4, hy - 8], [hx - 5.2, hy - 7.2], [hx - 5.8, hy - 8.4], [hx + 1, hy - 5]], FUR, { g: 'earN', ol: 1 });
  } else {
    R.P([[hx - 3.2, hy - 3.6], [hx - 2.6, hy - 10], [hx + .6, hy - 4.6]], FURD, { g: 'earF' });
    R.P([[hx - .4, hy - 4.4], [hx + 1.6, hy - 10.4], [hx + 2.3, hy - 9.3], [hx + 2.9, hy - 10.1], [hx + 4.2, hy - 4]], FUR, { g: 'earN', ol: 1 });
    R.P([[hx + .7, hy - 5], [hx + 1.8, hy - 8.4], [hx + 3.1, hy - 4.8]], PINK, { g: 'earIn', cast: 0 });
  }
  R.E(hx, hy, 6.7, 5.8, 0, FUR, R.pat({ g: 'head', alts: [STR], alt: (x, y) => (y < hy - 2.2 && x < hx + 2.4 && Math.abs(mod(x - hx + 10, 2.4) - 1.2) < .42 ? 0 : -1) }));
  R.E(hx - .6, hy + 2.8, 4.8, 3.4, 0, FUR, R.pat({ g: 'head', alts: [STR], alt: (x, y) => (Math.abs(y - (hy + 2.2 + (x - hx) * .22)) < .45 && x < hx + 1 ? 0 : -1) }));
  R.P([[hx - 5.6, hy + 3.4], [hx - 7.2, hy + 4.4], [hx - 5, hy + 5.4]], FUR, { g: 'head' });
  R.E(hx + 4.2, hy + 1.9, 3.1, 2.5, 0, WHT, { g: 'muz' });
  R.E(hx + 3.6, hy + 3.8, 2.4, 1.4, 0, WHT, { g: 'chin' });
  s2Eye(R, hx + 2.8, hy - 1, o.eye);
  R.stamp(hx + 7.4, hy + .4, ['NN', 'N.'], { N: '#d9827e' }, 0, 0);
  if (o.hiss) R.stamp(hx + 5, hy + 3.4, ['MwwM', '.MM.'], { M: '#3a1a18', w: '#fffaf0' }, 1, 0);
  else R.stamp(hx + 6, hy + 3, ['M.', '.M'], { M: '#5a3a34' }, 0, 0);
  R.W(hx + 5, hy + 2.2, hx + 10.6, hy + 1.4, '#f2ece2'); R.W(hx + 5, hy + 2.8, hx + 10.2, hy + 3.4, '#e4ded4');
}
// 빨간 리본 목줄 + 작은 매듭
function s2Ribbon(R, x1, y1, x2, y2) {
  R.K2(x1, y1, x2, y2, 1.05, 1.05, S2.RED, { g: 'rib', ol: 1 });
  R.E(x2 + .6, y2 - .2, 1.5, 1.1, -.4, S2.RED, { g: 'bow', ol: 1 }); R.E(x2 - .4, y2 + .9, 1.2, .9, .4, S2.RED, { g: 'bow2', ol: 1 });
  R.K2(x2 + .2, y2 + .4, x2 + 1, y2 + 2.8, .5, .4, S2.REDD, { g: 'bowT' });
}
// 다리 둘 마디 (어깨→팔꿈치→발). front: 팔꿈치가 뒤로, 뒷다리는 발목이 뒤로
function s2Leg(R, sx, sy, px, py, r1, r2, far, front, g, lift = 0) {
  const { FUR, FURD, STR, STRD, WHT, WHTD } = S2;
  const jx = (sx + px) / 2 + (front ? -.8 : -2.6), jy = (sy + py) / 2 + (front ? 0 : 1.2) - lift * .4;
  const pal = far ? FURD : FUR, band = R.pat({ g, alts: [far ? STRD : STR], alt: (x, y) => (mod(y + 40, 3.4) < 1 ? 0 : -1), ...(far ? { b: -.1 } : { ol: 2 }) });
  R.K2(sx, sy, jx, jy, r1, (r1 + r2) / 2, pal, band);
  R.K2(jx, jy, px, py - 1.1 - lift, (r1 + r2) / 2, r2, pal, R.pat({ g, alts: [far ? STRD : STR], alt: (x, y) => (mod(y + 40, 3.4) < 1 ? 0 : -1), ...(far ? { b: -.1 } : { ol: 2 }) }));
  R.E(px + .7, py - .9 - lift, 2.6, 1.3, 0, far ? WHTD : WHT, { g: g + 'p', ...(far ? { b: -.1 } : {}) });
}

/* ---------- 자세 ---------- */
// 서기 · 걷기 (s.p 가 있으면 걷기 0~1)
function sol2Walk(R, s = {}) {
  const { FUR, STR, WHT } = S2, walk = s.p != null, ph = walk ? s.p * TAU : 0, bob = walk ? Math.cos(ph * 2) * .5 : 0;
  const sw = a => walk ? Math.sin(ph + a) * 4.2 : 0, lf = a => walk ? Math.max(0, Math.cos(ph + a)) * 1.8 : 0, tw = walk ? Math.sin(ph) * 1.4 : 0;
  R.chain([[-14, -19 + bob], [-20, -20 + bob], [-24.4, -24 + bob], [-25.8 + tw * .5, -30 + bob], [-24.2 + tw, -35 + bob]], [2.3, 2.1, 1.9, 1.7, 1.4], FUR, R.pat({ g: 'tail', ol: 1, alts: [STR], alt: (x, y, t) => (mod(t * 2.2, 1) < .4 ? 0 : -1) }));
  s2Leg(R, 6.6, -15 + bob, 7.6 + sw(Math.PI), 0, 2.4, 1.7, true, true, 'ff', lf(Math.PI));
  s2Leg(R, -8.8, -10 + bob, -13.6 + sw(0), 0, 2.6, 1.6, true, false, 'fh', lf(0));
  R.E(-6, -17.6 + bob, 10.5, 7, 0, FUR, R.pat({ g: 'body', alts: [STR], alt: s2Stripe }));
  R.E(6.4, -17.4 + bob, 8.6, 7.8, 0, FUR, R.pat({ g: 'body', alts: [STR], alt: s2Stripe }));
  R.E(-10, -15.6 + bob, 6.6, 7.4, 0, FUR, R.pat({ g: 'body', alts: [STR], alt: (x, y) => (mod(x * .8 + y * .5 + 20, 4) < 1.3 ? 0 : -1) }));
  R.E(1, -11.4 + bob, 9.4, 2.6, 0, WHT, { g: 'belly' });
  R.E(11.6, -15.6 + bob, 3.8, 5.6, -.3, WHT, { g: 'chest' });
  s2Leg(R, 9.4, -15 + bob, 10.6 + sw(0), 0, 2.5, 1.8, false, true, 'nf', lf(0));
  s2Leg(R, -7, -10 + bob, -11.4 + sw(Math.PI), 0, 2.7, 1.7, false, false, 'nh', lf(Math.PI));
  R.K2(11, -21 + bob, 15.4, -26.6 + bob, 4.6, 4, FUR, R.pat({ g: 'neck', alts: [STR], alt: (x, y) => (mod(x - y * .6 + 40, 4) < 1.2 ? 0 : -1) }));
  s2Ribbon(R, 11.2, -25.8 + bob, 15.8, -21.2 + bob);
  s2Head(R, 18, -28.6 + bob, { eye: s.eye });
}
// 앉기 (옆)
function sol2Sit(R, s = {}) {
  const { FUR, FURD, STR, WHT } = S2;
  R.chain([[-11, -3], [-13.6, -1.4], [-7, -.9], [3, -.9], [10.6, -1.3]], [2.1, 2, 1.8, 1.6, 1.4], FUR, R.pat({ g: 'tail', ol: 1, alts: [STR], alt: (x, y, t) => (mod(t * 2.2, 1) < .4 ? 0 : -1) }));
  R.K2(3.6, -13, 4.6, -1.4, 2.2, 1.7, FURD, { g: 'ff', b: -.1 }); R.E(5.4, -.9, 2.5, 1.2, 0, S2.WHTD, { g: 'ffp' });
  R.E(-4, -8, 9, 8, 0, FUR, R.pat({ g: 'hip', alts: [STR], alt: (x, y) => (mod(x * .8 + y * .5 + 20, 4) < 1.3 ? 0 : -1) }));
  R.E(2.6, -1.2, 4.4, 1.5, 0, WHT, { g: 'hp' });
  R.E(1.6, -17, 6.6, 10, -.22, FUR, R.pat({ g: 'torso', alts: [STR], alt: (x, y) => (x < 3 && mod(y + x * .5 + 40, 4.2) < 1.4 ? 0 : -1) }));
  R.E(5.8, -16.6, 3.2, 7, -.18, WHT, { g: 'chest' });
  R.K2(6.4, -13.6, 7.4, -1.6, 2.3, 1.8, FUR, R.pat({ g: 'nf', ol: 2, alts: [STR], alt: (x, y) => (mod(y + 40, 3.4) < 1 && y < -5 ? 0 : -1) })); R.E(8.2, -1, 2.6, 1.3, 0, WHT, { g: 'nfp' });
  s2Ribbon(R, 3, -24.6, 8.6, -21.4);
  s2Head(R, 8.4, -29.6, { eye: s.eye });
}
// 식빵 (옆)
function sol2Loaf(R, s = {}) {
  const { FUR, STR, WHT } = S2;
  R.chain([[-12, -3.4], [-9, -1], [-1, -.7], [7, -1]], [2.1, 1.9, 1.7, 1.5], FUR, R.pat({ g: 'tail', ol: 1, alts: [STR], alt: (x, y, t) => (mod(t * 2.2, 1) < .4 ? 0 : -1) }));
  R.E(-1, -8.4, 13, 8.4, 0, FUR, R.pat({ g: 'body', alts: [STR], alt: (x, y) => (y < -6 && mod(x + Math.sin(y * .7) * 1.4 + 40, 4.4) < 1.5 ? 0 : -1) }));
  R.E(7.4, -8.6, 6, 7, 0, FUR, { g: 'body' });
  R.E(9.6, -5.4, 3.6, 4.4, 0, WHT, { g: 'chest' });
  R.E(11.4, -1.3, 3, 1.3, 0, WHT, { g: 'paw' });
  s2Ribbon(R, 6.4, -15.2, 11, -11.4);
  s2Head(R, 13, -18.4, { eye: s.eye || 'half' });
}
// 경계 (등을 세우고 털을 부풀림)
function sol2Puff(R) {
  const { FUR, STR, WHT } = S2;
  R.chain([[-12, -21], [-15, -27], [-15.4, -33], [-14.2, -38]], [2.9, 3.4, 3.4, 2.8], FUR, R.pat({ g: 'tail', ol: 1, alts: [STR], alt: (x, y, t) => (mod(t * 2.2, 1) < .4 ? 0 : -1) }));
  for (let k = 0; k < 7; k++) { const y = -24 - k * 2.2, sd = k % 2 ? 1 : -1; R.P([[-15 + sd * 2.6, y], [-15 + sd * 4.6, y - 1.2], [-15 + sd * 2.4, y - 1.8]], FUR, { g: 'tail' }); }
  s2Leg(R, 5.6, -17, 7, 0, 2.4, 1.7, true, true, 'ff');
  s2Leg(R, -8, -14, -11.6, 0, 2.6, 1.6, true, false, 'fh');
  R.E(-7.6, -20, 8.6, 6.6, .18, FUR, R.pat({ g: 'body', alts: [STR], alt: s2Stripe }));
  R.E(.6, -26.4, 9, 7.6, 0, FUR, R.pat({ g: 'body', alts: [STR], alt: s2Stripe }));
  R.E(7.6, -19.6, 7, 6.4, -.2, FUR, R.pat({ g: 'body', alts: [STR], alt: s2Stripe }));
  for (let x = -14; x <= 12; x += 2.4) { const t = x / 15, yy = -26.4 - 7.4 * Math.sqrt(Math.max(0, 1 - t * t)) + Math.abs(t) * 5.4; R.P([[x - 1.2, yy + 1.6], [x + .3, yy - 2], [x + 1.3, yy + 1.6]], FUR, { g: 'body' }); }
  R.E(.4, -16.4, 8, 2.4, 0, WHT, { g: 'belly' });
  s2Leg(R, 8.6, -17, 10.4, 0, 2.5, 1.8, false, true, 'nf');
  s2Leg(R, -6.4, -14, -9.4, 0, 2.7, 1.7, false, false, 'nh');
  R.K2(11, -20, 14.6, -21, 4.4, 4, FUR, { g: 'neck' });
  s2Ribbon(R, 12, -24, 14.6, -17.8);
  s2Head(R, 18, -19.6, { eye: 'wide', ear: 1, hiss: true });
}

/* ---------- 아트북용 칸 ---------- */
const SOL2 = { stand: sol2Walk, walk: sol2Walk, sit: sol2Sit, loaf: sol2Loaf, puff: sol2Puff };
AB.sol2 = function (kind, s = {}, bg = '#56698a') {
  const W = 128, H = 92, k = 1.7, ox = 66, oy = 84, pb = new PB(W, H);
  pb.d.fill(C(bg)); pb.ellipse(ox - 4, oy, 40, 3.4, mix(bg, '#1e2a44', .45));
  pbOver(pb, softBake(W, H, ox, oy, k, R => SOL2[kind](R, s)));
  grain(pb, .025, 3);
  return pb;
};
// 비교용: 지금 솔을 같은 크기로
AB.sol1 = function (bg = '#56698a') {
  const W = 128, H = 92, ox = 64, oy = 84, pb = new PB(W, H);
  pb.d.fill(C(bg)); pb.ellipse(ox - 4, oy, 40, 3.4, mix(bg, '#1e2a44', .45));
  pbOver(pb, hiBake(W, H, ox, oy, R => { R.scl(3.2); catSideHi(R, { pose: 'stand' }); }, ED));
  grain(pb, .04, 3);
  return pb;
};
