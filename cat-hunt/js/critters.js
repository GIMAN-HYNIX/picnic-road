'use strict';
/* =========================================================
   숲의 작은 동물 (에디토리얼 캐리커처 픽셀, 예전보다 2배 잘게)
   다람쥐 · 청설모 · 박새 · 곤줄박이 · 참새 · 까치 · 오색딱다구리 · 나비
   모두 옆모습(오른쪽을 봄)으로 그리고, 왼쪽은 좌우 반전. 원점은 발 아래
   ========================================================= */
const CT = edPal('#2c4a2a');
// 좌우 다른 배율 (머리 돌리기 반전용)
Rig.prototype.sxy = function (sx, sy) { const m = this.m; m[0] *= sx; m[1] *= sx; m[2] *= sy; m[3] *= sy; };
const CR = {
  // 다람쥐: 주황 갈색 + 등에 검정/크림 줄무늬
  chO: CT('#c47a3e', .26), chB: ['#e8cfa2', '#f6e6c6'], chD: '#3e2618', chL: '#f4e2bc', chT: CT('#9a6a42', .24),
  // 청설모: 짙은 회갈색, 흰 배, 귀 끝 털
  sqB: CT('#5c4c46', .24), sqT: CT('#3e3430', .3), sqW: ['#d6cfc4', '#f0ebe2'], sqE: '#2a201e',
};
// 줄무늬 무늬: 몸통 타원 등쪽에 고리 모양 띠
const ringStripe = (cx, cy, rx, ry, bands) => (x, y) => {
  const u = (x - cx) / rx, v = (y - cy) / ry; if (v > -.05) return -1;
  const r = Math.hypot(u, v); for (const [a, b, k] of bands) if (r > a && r < b) return k; return -1;
};

/* ---------- 다람쥐 ---------- */
// p: { pose: 'stand'|'hop'|'sit'|'nibble'|'forage'|'groom', b (뜀 0 모음~1 뻗음), lift, look ('f'|'up'|'back'), t (작은 움직임 -1~1), tail (꼬리 흔들림) }
function chipRig(R, p) {
  const O = CR.chO, B = CR.chB, D = CR.chD, T = CR.chT, pose = p.pose || 'stand', t = p.t || 0, tl = p.tail || 0;
  const eye = (x, y) => R.stamp(x, y, ['KK', 'Kw'], { K: '#140c08', w: '#fff6e6' }, 0, 0);
  const head = (hx, hy, dn) => {
    R.E(hx - 1.6, hy - 3.6, 1.5, 1.9, -.2, O, { g: 'ear', ol: 1 });
    R.E(hx, hy, 4.4, 3.8, dn || 0, O, { g: 'head' });
    R.E(hx + 3.6, hy + .9, 2.2, 1.8, dn || 0, O, { g: 'snout' });
    R.E(hx + 1, hy + 1.8, 2.2, 1.5, 0, B, { g: 'cheek' });
    R.DL(hx - 3.2, hy - .8, hx + 3.8, hy + .2, D); R.DL(hx - 2.8, hy - 2, hx + 2.8, hy - 1.4, CR.chL);
    eye(hx + 1, hy - 1.2);
    R.stamp(hx + 5.6, hy + .6, ['n'], { n: '#2a1610' });
  };
  const tail = pts => { R.chain(pts, [1.8, 2.6, 3, 2.8, 2], T, { g: 'tail' }); for (let i = 0; i < pts.length - 1; i++) R.DL(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#5a3a24'); };
  if (pose === 'sit' || pose === 'nibble' || pose === 'groom') {
    // 뒷다리로 앉아 상체를 세움
    tail([[-3.6, -2.6], [-7.6, -4], [-9.6 - tl, -8.6], [-9 - tl * 1.4, -13.6], [-6.6 - tl, -16.4]]);
    R.E(-1.6, -4.4, 4.6, 4, 0, O, { g: 'haunch' });
    R.E(1.6, -1.2, 3.4, 1.3, 0, O, { g: 'foot' });
    R.E(-.2, -10, 4.8, 7, -.12, O, R.pat({ g: 'body', alts: [[D, D], [CR.chL, CR.chL]], alt: (x, y) => { const d = x + .6 + (y + 10) * .12; return d < -3.4 ? 0 : d < -2.4 ? 1 : d < -1.6 ? 0 : -1; } }));
    R.E(1.8, -9.4, 2.6, 5.4, -.12, B, { g: 'belly' });
    const hx = 2 + (pose === 'nibble' ? .6 : 0), hy = -18.4 + (pose === 'nibble' ? 1.2 + t * .5 : 0) + (p.look === 'up' ? -.6 : 0);
    if (p.look === 'back') { // 고개를 뒤로
      R.push(); R.translate(hx, hy); R.sxy(-1, 1); R.translate(-hx, -hy); head(hx, hy); R.pop();
    } else head(hx, hy, p.look === 'up' ? -.35 : 0);
    if (pose === 'nibble') { R.E(hx + 4.6, hy + 3.4 - t * .4, 1.6, 1.4, 0, O, { g: 'pawF', ol: 1 }); R.stamp(hx + 6, hy + 2.6 - t * .4, ['aa', 'a.'], { a: '#8a5a2a' }, 0, 0); }
    else if (pose === 'groom') { R.E(hx + 2.6, hy - .4 + t, 1.7, 1.5, 0, O, { g: 'pawF', ol: 1 }); R.E(hx + 1, hy + .4 - t, 1.6, 1.4, 0, O, { g: 'pawF2', ol: 1 }); }
    else R.E(3.8, -11.6, 1.5, 1.3, 0, O, { g: 'pawF', ol: 1 });
    return;
  }
  // 네 발: 뜀(b: 0 모음 ~ 1 뻗음), 서기, 먹이 찾기
  const b = pose === 'hop' ? p.b || 0 : 0, lift = pose === 'hop' ? p.lift || 0 : 0, fg = pose === 'forage';
  const by = -7.4 - lift + (fg ? .8 : 0), st = 1 + b * .14 - (pose === 'hop' ? (1 - b) * .08 : 0);
  const tilt = pose === 'hop' ? (b - .5) * -.18 : fg ? .16 : 0;
  R.push(); R.translate(0, by); R.rotate(tilt);
  tail([[-7.2 * st, -.8], [-11 * st, -2.6 - b], [-13 * st - tl, -6.6 - b * 1.6], [-12.6 * st - tl * 1.4, -11 - b * 1.6], [-10.4 * st - tl, -13.4 - b]]);
  // 뒷다리
  const hx = lerp(-1.2, -9.4, b), hy = lerp(7.2, 5.2, b) - (b > .6 ? (b - .6) * 3 : 0);
  R.E(-4.6 * st + (1 - b) * 1.2, -1 - (1 - b) * 1.4, 4.4, 4.2, 0, O, { g: 'haunch' });
  R.E(hx, hy, 3.4, 1.3, b * .5, O, { g: 'foot' });
  R.E(0, 0, 8.2 * st, 5, 0, O, R.pat({ g: 'body', alts: [[D, D], [CR.chL, CR.chL]], alt: ringStripe(0, 0, 8.2 * st, 5, [[.42, .54, 0], [.6, .7, 1], [.7, .8, 0]]) }));
  R.E(1, 2.6, 5.6 * st, 2.2, 0, B, { g: 'belly' });
  // 앞다리
  const fx = lerp(5.4, 9.6, b) + (fg ? 1.2 * t : 0), fy = lerp(6.4, 4.4, b) - (b > .7 ? (b - .7) * 4 : 0);
  R.K2(4.4 * st, 2.4, fx, fy, 1.3, 1.1, O, { g: 'legF', ol: 1 }); R.E(fx + .5, fy + .6, 1.6, .9, 0, O, { g: 'pawF', ol: 1 });
  R.pop();
  // 머리 (몸과 함께 기울기)
  const ca = Math.cos(tilt), sa = Math.sin(tilt), lx = 8.4 * st + (fg ? 1.2 : 0), ly = -2.4 + (fg ? 4.2 + t * .5 : 0);
  head(lx * ca - ly * sa, by + lx * sa + ly * ca, fg ? .35 : tilt);
}

/* ---------- 청설모 ---------- */
// p: { pose: 'stand'|'hop'|'sit'|'nibble'|'forage', b, lift, look, t, tail }
function sqRig(R, p) {
  const Bd = CR.sqB, T = CR.sqT, W = CR.sqW, pose = p.pose || 'stand', t = p.t || 0, tl = p.tail || 0;
  const head = (hx, hy, dn, ear2) => {
    R.P([[hx - 2.6, hy - 2.6], [hx - 2.2, hy - 7.2], [hx - .4, hy - 3.2]], Bd, { g: 'ear', ol: 1 });
    R.DL(hx - 2.2, hy - 7.2, hx - 2.8, hy - 9.6, CR.sqE); R.DL(hx - 1.8, hy - 7, hx - 1.6, hy - 9.4, CR.sqE);
    R.E(hx, hy, 4.8, 4.2, dn || 0, Bd, { g: 'head' });
    R.E(hx + 4, hy + 1, 2.4, 2, dn || 0, Bd, { g: 'snout' });
    R.E(hx + 1.6, hy + 2.6, 2.6, 1.3, 0, W, { g: 'chin' });
    R.stamp(hx + 1.2, hy - 1.4, ['KK', 'Kw'], { K: '#0e0a0a', w: '#f6f0e6' }, 0, 0);
    R.stamp(hx + 6.2, hy + .6, ['n'], { n: '#1a1212' });
  };
  // 크고 풍성한 꼬리: S자로 등 위에
  const tail = (pts, rr) => { R.chain(pts, rr || [2.2, 3.6, 4.4, 4.2, 3.4, 2.2], T, R.pat({ g: 'tail', alts: [CT('#6e5e56')], alt: (x, y, u) => (u > .2 && hash2(Math.round(x * .9), Math.round(y * .9)) > .78 ? 0 : -1) })); };
  if (pose === 'sit' || pose === 'nibble') {
    tail([[-4, -3], [-9, -6], [-11.4 - tl, -12], [-10.6 - tl, -19], [-7 - tl, -24], [-2.6 - tl * .6, -25.4]]);
    R.E(-1.8, -5.2, 5.6, 5, 0, Bd, { g: 'haunch' });
    R.E(2.4, -1.4, 4.4, 1.5, 0, Bd, { g: 'foot' });
    R.E(0, -12.4, 5.8, 8.6, -.12, Bd, { g: 'body' });
    R.E(2.2, -11.6, 3.2, 6.6, -.12, W, { g: 'belly' });
    const hx = 2.4 + (pose === 'nibble' ? .8 : 0), hy = -22.6 + (pose === 'nibble' ? 1.4 + t * .5 : 0) + (p.look === 'up' ? -.8 : 0);
    if (p.look === 'back') { R.push(); R.translate(hx, hy); R.sxy(-1, 1); R.translate(-hx, -hy); head(hx, hy); R.pop(); }
    else head(hx, hy, p.look === 'up' ? -.35 : 0);
    if (pose === 'nibble') { R.E(hx + 5, hy + 4 - t * .5, 1.9, 1.6, 0, Bd, { g: 'pawF', ol: 1 }); R.stamp(hx + 6.6, hy + 3 - t * .5, ['aa', 'aa'], { a: '#9a6a32' }, 0, 0); }
    else R.E(4.6, -14.6, 1.8, 1.6, 0, Bd, { g: 'pawF', ol: 1 });
    return;
  }
  const b = pose === 'hop' ? p.b || 0 : 0, lift = pose === 'hop' ? p.lift || 0 : 0, fg = pose === 'forage';
  const by = -9.4 - lift + (fg ? 1 : 0), st = 1 + b * .16 - (pose === 'hop' ? (1 - b) * .08 : 0), tilt = pose === 'hop' ? (b - .5) * -.2 : fg ? .18 : 0;
  R.push(); R.translate(0, by); R.rotate(tilt);
  tail([[-8.6 * st, -1.6], [-13.6 * st, -4 - b * 1.4], [-16 * st - tl, -9.6 - b * 2.4], [-15 * st - tl * 1.4, -16 - b * 2.8], [-11 * st - tl, -20 - b * 2.2], [-6.4 * st - tl * .6, -21 - b * 1.4]]);
  const hx = lerp(-1.6, -12, b), hy = lerp(9.2, 6.8, b) - (b > .6 ? (b - .6) * 3.6 : 0);
  R.E(-5.6 * st + (1 - b) * 1.4, -1.2 - (1 - b) * 1.8, 5.4, 5.2, 0, Bd, { g: 'haunch' });
  R.E(hx, hy, 4.4, 1.5, b * .5, Bd, { g: 'foot' });
  R.E(0, 0, 10 * st, 6.2, 0, Bd, { g: 'body' });
  R.E(1.4, 3.4, 6.8 * st, 2.6, 0, W, { g: 'belly' });
  const fx = lerp(6.6, 12, b) + (fg ? 1.4 * t : 0), fy = lerp(8.2, 5.6, b) - (b > .7 ? (b - .7) * 4.4 : 0);
  R.K2(5.6 * st, 3, fx, fy, 1.6, 1.3, Bd, { g: 'legF', ol: 1 }); R.E(fx + .6, fy + .7, 2, 1.1, 0, Bd, { g: 'pawF', ol: 1 });
  R.pop();
  const ca = Math.cos(tilt), sa = Math.sin(tilt), lx = 10.4 * st + (fg ? 1.4 : 0), ly = -3 + (fg ? 5.2 + t * .6 : 0);
  head(lx * ca - ly * sa, by + lx * sa + ly * ca, fg ? .35 : tilt);
}
// 나무 타는 청설모 (등이 보임, 머리 위). k: 0~3 다리 번갈아, down: 머리 아래로
function sqClimb(R, k, down) {
  const Bd = CR.sqB, T = CR.sqT, ph = k / 4 * TAU, a = Math.sin(ph) * 2.2;
  R.push(); if (down) { R.translate(0, -14); R.rotate(Math.PI); R.translate(0, 14); }
  R.chain([[0, -6], [1.4, -1], [-1 + Math.sin(ph) * .8, 4.6], [1.8, 9.4], [.4, 13]], [3.2, 4.2, 4.4, 3.8, 2.4], T, { g: 'tail' });
  R.K2(-3.4, -10, -6.6, -6.6 + a, 1.5, 1.3, Bd, { g: 'lh', ol: 1 }); R.K2(3.4, -10, 6.6, -6.6 - a, 1.5, 1.3, Bd, { g: 'rh', ol: 1 });
  R.E(0, -13, 5.2, 7.4, 0, Bd, { g: 'body' });
  R.K2(-3, -17, -6.4, -20 - a, 1.4, 1.2, Bd, { g: 'lf', ol: 1 }); R.K2(3, -17, 6.4, -20 + a, 1.4, 1.2, Bd, { g: 'rf', ol: 1 });
  R.E(0, -22.6, 4.2, 3.8, 0, Bd, { g: 'head' });
  R.P([[-3.6, -24], [-3.2, -28.4], [-1.6, -25]], Bd, { g: 'earL', ol: 1 }); R.P([[3.6, -24], [3.2, -28.4], [1.6, -25]], Bd, { g: 'earR', ol: 1 });
  R.DL(-3.2, -28.4, -3.6, -30.6, CR.sqE); R.DL(3.2, -28.4, 3.6, -30.6, CR.sqE);
  R.pop();
}

/* ---------- 새 ---------- */
const BRD = {
  tit: { len: 1, head: CT('#24242c'), cheek: '#f4f1e8', back: CT('#7a8a5a'), body: CT('#8a929a'), belly: ['#d8d6cc', '#f2f0e6'], wing: CT('#5e6c7c'), bar: '#f0eee6', tail: CT('#4a525c'), beak: '#1e1e24', tie: '#22222a' },
  vtit: { len: 1, head: CT('#26222a'), cheek: '#f0e2bc', back: CT('#6a7a8c'), body: CT('#6a7a8c'), belly: CT('#c46a38', .26), wing: CT('#5a6a7c'), tail: CT('#4a5664'), beak: '#24201e', nape: '#f0e2bc' },
  sparrow: { len: 1, head: CT('#8a4a2a'), cheek: '#f2ece0', back: CT('#9a6a3e'), body: CT('#a88a6a'), belly: ['#d4cec2', '#ece6da'], wing: CT('#7a5434'), bar: '#efe8d8', tail: CT('#6a4a30'), beak: '#2e2620', bib: '#22201e', spot: '#22201e' },
  magpie: { len: 1.9, head: CT('#1a1a22', .2), back: CT('#1a1a22', .2), body: CT('#1a1a22', .2), belly: ['#d8d6d0', '#f4f2ec'], wing: CT('#22303e', .32), tail: CT('#1c2a3a', .36), beak: '#16161c', shoulder: ['#e2e0da', '#f6f4ee'] },
  pecker: { len: 1.2, head: CT('#1c1c22', .2), cheek: '#f2eee6', back: CT('#1c1c22', .2), body: CT('#1c1c22', .2), belly: ['#d8d2c6', '#efe9de'], wing: CT('#1e1e26', .2), tail: CT('#1c1c22', .2), beak: '#3e3e46', red: CT('#c8362a', .3), shoulder: ['#e8e4dc', '#f8f4ec'] },
};
// p: { pose: 'perch'|'sing'|'hop'|'peck'|'fly'|'glide', look ('f'|'back'|'up'), wing (날개 위치 -1 아래 ~ 1 위), t }
function birdRig(R, sp, p) {
  const P = BRD[sp], s = sp === 'magpie' ? 1.9 : sp === 'pecker' ? 1.25 : 1, pose = p.pose || 'perch', t = p.t || 0;
  R.push(); R.scl(s);
  const eye = (x, y) => R.stamp(x, y, ['K'], { K: '#0a0808' });
  const headAt = (hx, hy, back, sing) => {
    R.push(); if (back) { R.translate(hx, hy); R.sxy(-1, 1); R.translate(-hx, -hy); }
    R.E(hx, hy, 3, 2.7, 0, P.head, { g: 'head' });
    if (sp === 'tit') R.E(hx + .6, hy + .7, 1.9, 1.3, 0, [mix(P.cheek, '#9a9890', .25), P.cheek], { g: 'cheek', flat: 1 });
    if (sp === 'vtit') { R.E(hx + .9, hy + .4, 2.2, 1.6, 0, [mix(P.cheek, '#9a8a70', .3), P.cheek], { g: 'cheek', flat: 1 }); R.E(hx - 1.8, hy - .6, 1, 1.2, 0, [P.nape, P.nape], { g: 'nape', flat: 1 }); }
    if (sp === 'sparrow') { R.E(hx + .3, hy + 1, 2, 1.4, 0, [mix(P.cheek, '#9a9488', .25), P.cheek], { g: 'cheek', flat: 1 }); R.stamp(hx + .4, hy + 1.2, ['k'], { k: P.spot }); }
    if (sp === 'pecker') { R.E(hx + .6, hy + .6, 2, 1.3, 0, [mix(P.cheek, '#9a968e', .25), P.cheek], { g: 'cheek', flat: 1 }); R.E(hx - 1.8, hy - 1.4, 1.2, 1, 0, P.red, { g: 'nape', flat: 1 }); }
    const bl = sp === 'pecker' ? 3.6 : sp === 'magpie' ? 2.6 : 1.8;
    if (sing) { R.DL(hx + 2.4, hy - .4, hx + 2.4 + bl, hy - 1.4, P.beak); R.DL(hx + 2.4, hy + .4, hx + 2.2 + bl, hy + 1.2, P.beak); }
    else R.K2(hx + 2.4, hy, hx + 2.4 + bl, hy + .2, .7, .3, [P.beak, P.beak], { g: 'beak', flat: 1 });
    eye(hx + 1, hy - .5);
    R.pop();
  };
  if (pose === 'fly' || pose === 'glide') {
    const w = pose === 'glide' ? .1 : p.wing || 0;
    R.K2(-2.6, -6, -2.6 - 5.4 * P.len, -5.4, 1.4, .8, P.tail, { g: 'tail' });
    if (w < 0) R.P([[-2, -6.6], [1.6, -6.8], [.4 - w * 1.6, -6.2 - w * 6.4], [-3.4 - w * 1.4, -6 - w * 5.6]], P.wing, { g: 'wingF', b: -.2 });
    R.E(0, -6.4, 4.4, 2.4, 0, P.body, { g: 'body' });
    R.E(.6, -5.4, 3.2, 1.3, 0, P.belly, { g: 'belly' });
    headAt(4, -7.2, false, false);
    if (w >= 0) R.P([[-2, -6.8], [1.8, -7], [.6 + w * .6, -7 - w * 8], [-3.6 + w * .4, -6.8 - w * 7.4]], P.wing, R.pat({ g: 'wing', ol: 1, alts: [P.shoulder || P.wing], alt: (x, y) => (sp === 'magpie' && x < 0 && y < -7 - w * 4 ? 0 : -1) }));
    else R.P([[-2, -6.2], [1.8, -6.2], [1 - w, -4.4 - w * 1.6], [-2.6, -4.6 - w * 1.2]], P.wing, { g: 'wing', ol: 1 });
    R.pop(); return;
  }
  const hop = pose === 'hop' ? -(p.lift || 0) : 0, peck = pose === 'peck', cling = pose === 'cling';
  if (cling) {   // 딱다구리: 줄기 옆에 세로로 매달림 (줄기는 오른쪽)
    const pk = t;   // -1 머리 뒤로 ~ 1 쪼기
    R.K2(-1.2, -2, -1.8, 4.6, 1.5, .7, P.tail, { g: 'tail' });
    R.E(0, -6, 2.6, 4.6, .1, P.body, { g: 'body' });
    R.E(.9, -5.6, 1.5, 3.4, .1, P.belly, { g: 'belly' });
    R.E(-1, -5.6, 1.8, 3.6, .15, P.wing, R.pat({ g: 'wing', ol: 2, alts: [P.shoulder], alt: (x, y) => (y < -7.4 || (y > -5 && mod(Math.round(y * 1.2), 2) === 0) ? 0 : -1) }));
    R.E(.6, 1.6, 1.2, 1, 0, P.red, { g: 'vent', flat: 1 });
    R.stamp(1.6, -1, ['l', 'l'], { l: '#4a4a52' });
    headAt(1 + pk * 1.2, -11.6 + Math.abs(pk) * .3, false, false);
    R.pop(); return;
  }
  // 앉기 · 노래 · 깡충 · 쪼기
  const lean = peck ? .9 : pose === 'hop' ? .25 : 0;
  R.push(); R.translate(0, -2 + hop); R.rotate(lean); R.translate(0, 2);
  R.K2(-1.6, -3.2, -2.2 - 5 * P.len * .62, 1.6 - (p.flick || 0) * 2, 1.4, .8, P.tail, { g: 'tail' });
  R.E(0, -6.4, 3.6, 4, -.42, P.body, R.pat({ g: 'body', alts: [P.back], alt: (x, y) => (x < -.4 && y < -6.4 ? 0 : -1) }));
  R.E(1.2, -5.4, 2.2, 3, -.42, P.belly, { g: 'belly' });
  if (sp === 'tit') R.DL(1.8, -8.2, 1.2, -3.2, P.tie);
  if (sp === 'sparrow') R.E(2, -8.4, 1.1, 1.2, 0, [P.bib, P.bib], { g: 'bib', flat: 1 });
  if (sp === 'magpie') R.E(-.6, -7.4, 1.6, 1.2, -.4, P.shoulder, { g: 'sh', flat: 1 });
  R.E(-1.2, -6.4, 2.6, 3.6, -.5, P.wing, R.pat({ g: 'wing', ol: 2, alts: [[P.bar || P.wing[1], P.bar || P.wing[1]]], alt: (x, y) => (P.bar && Math.abs(y + 7.4 + x * .5) < .5 ? 0 : -1) }));
  R.pop();
  const hx = peck ? 3.8 : 1.6 + (p.look === 'back' ? -.4 : 0), hy = (peck ? -2.6 : pose === 'sing' ? -11.6 : p.look === 'up' ? -11.4 : -10.8) + hop;
  headAt(hx, hy, p.look === 'back', pose === 'sing');
  if (pose !== 'hop' || (p.lift || 0) < 1) R.stamp(-.4, -1 + hop, ['l.l', 'l.l'], { l: sp === 'sparrow' ? '#8a6a58' : '#4a4652' }, 1, 0);
  R.pop();
}
function bflyRig(R, open, col) {
  const c = [['#e8e4d8', '#fbf8ee'], ['#e0c040', '#f6dc5e'], ['#d8904a', '#f0aa64']][col];
  if (open > .5) { R.E(-2.6, -2, 2.4, 2, -.3, c, { g: 'wl', ol: 1 }); R.E(2.6, -2, 2.4, 2, .3, c, { g: 'wr', ol: 1 }); R.E(-1.8, .6, 1.6, 1.4, .3, c, { g: 'wl2', ol: 1 }); R.E(1.8, .6, 1.6, 1.4, -.3, c, { g: 'wr2', ol: 1 }); R.stamp(-3, -2.6, ['k'], { k: '#3a3434' }); R.stamp(3, -2.6, ['k'], { k: '#3a3434' }); }
  else if (open > 0) { R.E(-1.4, -2.4, 1.2, 2.2, -.1, c, { g: 'wl', ol: 1 }); R.E(1.4, -2.4, 1.2, 2.2, .1, c, { g: 'wr', ol: 1 }); }
  else { R.E(0, -2.8, 1, 2.6, 0, c, { g: 'w', ol: 1 }); }
  R.K2(0, -3, 0, 1.4, .5, .4, ['#2a2622', '#3e3832'], { g: 'body' });
}

/* ---------- 굽기 ----------
   SPC.chip[이름][방향 0:오른쪽 1:왼쪽][프레임], SPC.bird[종][이름][방향][프레임] */
const SPC = {};
function bakeCritters() {
  const two = c => [c, mirrorCanvas(c)], bk = (W, H, ox, oy, fn, seed) => { const pb = hiBake(W, H, ox, oy, fn, ED); grain(pb, .035, seed); return pb.canvas(); };
  const set = (W, H, ox, oy, rig, list, seed) => list.map(p => two(bk(W, H, ox, oy, R => rig(R, p), seed)));
  const HOP = [0, .17, .33, .5, .67, .83].map(u => ({ pose: 'hop', b: (1 - Math.cos(u * TAU)) / 2, lift: Math.pow((1 - Math.cos(u * TAU)) / 2, 1.5) * 3.4, tail: Math.sin(u * TAU) * .8 }));
  const rod = (rig, W, H, ox, oy) => ({
    stand: set(W, H, ox, oy, rig, [{ pose: 'stand' }, { pose: 'stand', tail: .5 }, { pose: 'stand', tail: -.4 }], 3),
    hop: set(W, H, ox, oy, rig, HOP, 3),
    sit: set(W, H, ox, oy, rig, [{ pose: 'sit' }, { pose: 'sit', look: 'up' }, { pose: 'sit', look: 'back' }, { pose: 'sit', tail: .6 }], 3),
    nibble: set(W, H, ox, oy, rig, [-1, 0, 1, 0].map(t => ({ pose: 'nibble', t })), 3),
    forage: set(W, H, ox, oy, rig, [-1, 0, 1, 0].map(t => ({ pose: 'forage', t })), 3),
  });
  SPC.chip = rod(chipRig, 46, 34, 23, 31); SPC.chip.groom = set(46, 34, 23, 31, chipRig, [-1, 1].map(t => ({ pose: 'groom', t })), 3);
  SPC.sq = rod(sqRig, 60, 48, 30, 44);
  SPC.sq.climb = [0, 1, 2, 3].map(k => bk(34, 46, 17, 34, R => sqClimb(R, k, false), 4));
  SPC.sq.down = [0, 2].map(k => bk(34, 46, 17, 34, R => sqClimb(R, k, true), 4));
  // 줄기 옆면 오르기: 옆모습을 세워서
  SPC.sq.side = [0, 2, 3, 5].map(i => two(bk(44, 56, 22, 28, R => { R.rotate(-Math.PI / 2); R.translate(-8, 0); sqRig(R, HOP[i]); }, 4)));
  SPC.bird = {};
  for (const sp in BRD) {
    const big = sp === 'magpie', W = big ? 64 : sp === 'pecker' ? 34 : 28, H = big ? 40 : sp === 'pecker' ? 30 : 24, ox = W >> 1, oy = H - 3;
    const r = (p) => two(bk(W, H, ox, oy, R => birdRig(R, sp, p), 6));
    SPC.bird[sp] = {
      perch: [{ pose: 'perch' }, { pose: 'perch', look: 'back' }, { pose: 'perch', look: 'up' }, { pose: 'perch', flick: 1 }].map(r),
      sing: [{ pose: 'sing' }, { pose: 'perch', look: 'up' }].map(r),
      hop: [0, 1.6, 2.6].map(l => r({ pose: 'hop', lift: l })),
      peck: [0, 1, 0].map(k => r(k ? { pose: 'peck' } : { pose: 'perch' })),
      fly: [1, .3, -1, -.3].map(w => r({ pose: 'fly', wing: w })),
      glide: [r({ pose: 'glide' })],
    };
  }
  SPC.bird.pecker.cling = [0, -1, 1, -1].map(t => two(bk(34, 36, 17, 26, R => birdRig(R, 'pecker', { pose: 'cling', t }), 6)));
  SPC.bfly = [0, 1, 2].map(col => [1, .4, 0].map(o => bk(14, 12, 7, 8, R => bflyRig(R, o, col), 9)));
}
