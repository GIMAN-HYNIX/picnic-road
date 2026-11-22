'use strict';
/* =========================================================
   사냥꾼 시안 10종 (에디토리얼 캐리커처 픽셀)
   공통: 무뚝뚝한 남자 사냥꾼 · 모자챙이 눈을 가림 · 총 한 자루 + 사냥칼 · 고양이 솔과 함께
   캔버스 160×160, 원점은 발 가운데 (위쪽이 -y), 오른쪽을 향한 3/4 각도
   ========================================================= */
const HC_F = 16;
const HCD = [];
// 솔 (고등어 태비 · 흰 양말 · 왼쪽 귀 끝이 찢어짐 · 빨간 목걸이)는 hunter.js 의 CP 팔레트와 그림을 다시 씀
function catAt(R, x, y, k, fn) { R.push(); R.translate(x, y); R.scl(k); fn(R); R.pop(); }
// 사냥칼: 칼집이 아래로 매달리고 손잡이가 위로
function hcKnife(R, x, y, len, lean, P, id = '') {
  const tx = x + lean * len, ty = y + len;
  R.P([[x - 2.4, y], [x + 2.4, y], [tx + 1.3, ty - 2.6], [tx, ty], [tx - 1.5, ty - 2.4]], P.sheath, { g: 'sheath' + id, ol: 1 });
  R.K2(x - lean, y - .6, x - lean * 6, y - 7, 1.5, 1.8, P.handle, { g: 'khandle' + id, ol: 1 });
  R.DL(x - 3, y - .9, x + 3, y - .9, P.guard || '#d8b04c');
  R.stamp(x + .2, y + 3, ['s', '.', 's', '.', 's'], { s: P.stitch || '#d8c49a' }, 0, 0);
}
// 총: a 개머리판 끝 → b 총구. o: double, scope, lever, match(화승), bands(놋쇠 띠), brass(놋쇠 몸통)
function hcGun(R, ax, ay, bx, by, P, o = {}) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, at = t => [ax + dx * t, ay + dy * t];
  const [a1, b1] = at(.24), [a2, b2] = at(.34), [a3, b3] = at(.46), [a4, b4] = at(o.longFore ? .86 : .7);
  R.K2(ax, ay, a1, b1, o.stockR || 3.4, 2.2, P.wood, { g: 'stock', ol: o.ol });
  R.K2(a1, b1, a2, b2, 2.1, 2, P.wood, { g: 'grip', ol: o.ol });
  R.K2(a2, b2, a3, b3, 2.3, 2.1, o.brass ? ['#a8782a', '#d8a840', '#f4d27a'] : P.steel, { g: 'recv', ol: o.ol });
  if (o.double) { R.K2(a3 + nx * .9, b3 + ny * .9, bx + nx * .9, by + ny * .9, 1.15, 1.05, P.steel, { g: 'brl1', ol: o.ol }); R.K2(a3 - nx * .9, b3 - ny * .9, bx - nx * .9, by - ny * .9, 1.15, 1.05, P.steel, { g: 'brl2', ol: o.ol }); }
  else R.K2(a3, b3, bx, by, o.barR || 1.35, (o.barR || 1.35) * .85, P.steel, { g: 'brl', ol: o.ol });
  if (!o.noFore) R.K2(a3, b3, a4, b4, 2.1, 1.7, P.wood, { g: 'fore', ol: o.ol });
  if (o.scope) { const [s1, t1] = at(.36), [s2, t2] = at(.56); R.K2(s1 + nx * 3.2, t1 + ny * 3.2, s2 + nx * 3.2, t2 + ny * 3.2, 1.6, 1.6, ['#141418', '#26262e', '#4a4a56'], { g: 'scope', ol: 1 }); }
  if (o.lever) R.stamp(a2 - nx * 3, b2 - ny * 3, ['.kk.', 'k..k', '.kk.'], { k: '#2a2a30' }, 2, 1);
  if (o.bands) for (const t of [.52, .64, .78, .9]) { const [p, q] = at(t); R.stamp(p, q, ['bb'], { b: '#e0b850' }, 1, 0); }
  if (o.match) { const [p, q] = at(.4); R.DL(p - nx * 2, q - ny * 2, p - nx * 5 + dx / L * 3, q - ny * 5 + dy / L * 3, '#c8a46a'); R.stamp(p - nx * 5 + dx / L * 3, q - ny * 5 + dy / L * 3, ['r'], { r: '#ff6a2a' }); }
  if (o.sling) R.DL(a1 + nx * 2.4, b1 + ny * 2.4, a4 + nx * 2, b4 + ny * 2, P.sling || '#5a3a24');
}
const GUN = { wood: ['#5a3420', '#8a5432', '#b0784a'], steel: ['#22222a', '#3a3a46', '#6c6c7a'] };
// 모자 그늘이 얼굴에 드리우게: 챙은 얼굴보다 나중에, cl 로 그림자 길이
const smoke = (pb, x, y, t, col) => { for (let i = 0; i < 4; i++) { const u = (t + i * .25) % 1; pb.px(Math.round(x + Math.sin(u * 7 + i) * 2 + u * 6), Math.round(y - u * 18), col); if (u < .5) pb.px(Math.round(x + Math.sin(u * 7 + i) * 2 + u * 6) + 1, Math.round(y - u * 18), col); } };

/* ── 1. 키다리 추적자 & 어깨 위 솔 ── */
HCD.push((() => {
  const tint = '#7a2416', T = edPal(tint);
  const SK = skinPal('#e6b088'), STB = ['#a77a5c', '#c09070'], HAT = T('#3a2c24'), BAND = T('#1e1612'), COAT = T('#6e5640', .14), CAPE = T('#5a4632'), SCARF = T('#d8c8a2'), PANT = T('#3a383a'), BOOT = T('#2a1e18'), MUST = T('#3e2c22');
  const KP = { sheath: T('#3e2a1e'), handle: T('#9a6a3a'), guard: '#d8b04c' };
  function hero(R, s) {
    const sw = s.sw;
    hcGun(R, -12, -72, 7, -156, GUN, { sling: true });
    R.chain([[3, -66], [5, -35], [6, -6]], [3, 2.7, 2.5], PANT, { g: 'legF', b: -.15 });
    R.P([[1.6, -7], [8, -7.8], [14, -4.2], [14.4, -.4], [1.6, -.4]], BOOT, { g: 'bootF', b: -.15 });
    R.chain([[-4, -66], [-5.6, -35], [-5.2, -6]], [3.2, 2.9, 2.7], PANT, { g: 'legN', ol: 1 });
    R.P([[-9.6, -7], [-1.4, -7.8], [5, -4.2], [5.4, -.4], [-9.6, -.4]], BOOT, { g: 'bootN', ol: 1 });
    R.DL(-9.6, -.8, 5.4, -.8, '#140c08'); R.DL(1.6, -.8, 14.4, -.8, '#140c08');
    R.push(); R.translate(0, s.by);
    R.chain([[7, -116], [12, -100], [7, -92]], [2.7, 2.4, 2.2], COAT, { g: 'armF', b: -.18 });
    R.P([[-11, -118], [8, -118], [11, -101], [13, -80], [16.6, -44 + sw], [4, -39], [0, -52], [-4, -40], [-15.6, -42 - sw * .6], [-13.4, -80], [-14, -101]], COAT, { g: 'coat', side: .62 });
    R.DL(1, -115, .6, -52, COAT[0]);
    hcKnife(R, 5.2, -86, 15, .12, KP);
    R.K2(-9.4, -117, 6.6, -92, .95, .95, T('#4a2e1e'), { g: 'sling', ol: 1 });
    R.E(6, -91.4, 2.5, 2.4, 0, SK, { g: 'handF', ol: 1 });
    R.P([[-12.6, -120], [9.6, -120], [14, -109], [11, -104.4], [-15, -104.4]], CAPE, { g: 'cape', ol: 1 });
    R.chain([[-12.6, -116], [-16.6, -98], [-12.6, -84]], [2.9, 2.6, 2.4], COAT, { g: 'armN', ol: 1 });
    R.P([[-16, -86], [-9, -86], [-9.4, -81.6], [-15.6, -81.6]], CAPE, { g: 'pocket', ol: 1, flat: 0 });
    R.E(-1, -119, 9.4, 3.4, -.05, SCARF, { g: 'scarf', ol: 1 });
    R.P([[2.6, -118], [6.4, -117.4], [5.6, -101], [2.4, -102]], SCARF, { g: 'scarfT', ol: 1 });
    // 머리: 길쭉한 얼굴 · 꺾인 긴 코 · 처진 콧수염 · 수염 자국
    R.K2(0, -119, 1, -126, 2.6, 2.4, SK, { g: 'neck' });
    R.P([[-5.6, -154], [6.2, -154], [7.8, -142], [7.6, -131], [5.8, -124], [2, -121], [-2, -121.4], [-5, -124.6], [-6.6, -136]], SK, R.pat({ g: 'face', lt: [-.1, .95], rs: 0, alts: [STB], alt: (x, y) => (y > -129 && hash2(Math.round(x) + 9, Math.round(y)) > .45 ? 0 : -1) }));
    R.E(-4.8, -137, 1.6, 2.6, 0, SK, { g: 'ear', ol: 1 });
    R.P([[4.6, -138], [10.6, -132], [14.8, -128.6], [13.6, -127.2], [6, -129.6]], SK, { g: 'nose', flat: 1 });
    R.DL(5, -137.4, 6, -130, SK[0]); R.stamp(12.6, -128.4, ['n'], { n: '#7a3a30' });
    R.P([[4.2, -127.6], [10.4, -127], [12.4, -122], [10.4, -122.6], [7.6, -125.4], [4.6, -124.8]], MUST, { g: 'must', ol: 1 });
    R.DL(5.4, -123.4, 8.2, -123.6, '#5a2a24');
    // 모자: 납작한 챙이 눈 높이로 내려옴
    R.P([[-7.4, -162], [0, -164.4], [6.4, -162.4], [8.6, -149], [-8.8, -149]], HAT, { g: 'crown', side: .6 });
    R.DL(-1.6, -163, 2.6, -162.6, HAT[0]);
    R.P([[-8.8, -152.4], [8.6, -152.4], [9, -148.6], [-9.2, -148.6]], BAND, { g: 'band', ol: 1 });
    R.E(1.4, -146.6, 18, 3.8, -.05, HAT, { g: 'brim', cl: 6 });
    R.pop();
  }
  function cat(R, s) {
    // 가까운 어깨 위에 식빵처럼 웅크림, 꼬리는 가슴 앞으로
    R.push(); R.translate(0, s.by);
    R.chain([[-27, -118], [-29.4, -110], [-27.6, -102], [-24.4 + s.sw, -98]], [1.8, 1.7, 1.5, 1.2], CP.F, R.pat({ g: 'ctail', alts: [CP.S], alt: (x, y, t) => (t > .4 && t < .7 ? 0 : -1) }));
    catAt(R, -20.4, -116.6, 2, R2 => catLoafHi(R2, { breath: s.by, peek: !s.cblink }));
    R.pop();
  }
  return {
    title: '키다리 추적자', hero: '장대 같은 키 · 무릎까지 오는 기름 먹인 코트 · 납작한 챙 모자 · 꺾인 긴 코', gun: '등에 비스듬히 멘 긴 소총', knife: '코트 앞섶에 매단 긴 칼', catPos: '어깨 위 식빵', body: '키다리',
    point: '말없이 길게 걷는 실루엣, 어깨 위에서만 표정이 있는 솔', bg: '#d4552f', tint, ox: 76, oy: 152, sc: .9, shadows: [[82, 152, 22, 3]],
    swatch: ['#d4552f', '#6e5640', '#3a2c24', '#d8c8a2', '#978672'],
    layers: s => [{ fn: R => hero(R, s) }, { fn: R => cat(R, s) }],
    back(pb, s) { for (let i = 0; i < 10; i++) { const x = mod(hash1(i + 5) * 160 - s.t * 20, 160), y = 20 + hash1(i + 50) * 110; pb.hl(x, x + 6 + (i % 3) * 3, y, '#e2704a'); } },
  };
})());

/* ── 2. 곰 같은 덩치 & 품에 안긴 솔 ── */
HCD.push((() => {
  const tint = '#14382a', T = edPal(tint);
  const SK = skinPal('#e6a07c'), NOSE = skinPal('#e2806a'), BEARD = T('#2c201c', .16), PL = T('#b8342a'), PLD = ['#2a1616', '#3a1e1e'], BEAN = T('#e2b84a', .2), PANT = T('#4a4440'), BOOT = T('#3a2418');
  const KP = { sheath: T('#4a2e1e'), handle: T('#c8b48a'), guard: '#c0c0c8' };
  const plaid = (x, y) => (mod(Math.round(x), 9) < 3 || mod(Math.round(y), 9) < 3 ? 0 : -1);
  function hero(R, s) {
    R.chain([[7, -40], [9, -20], [9.6, -7]], [5.6, 5.2, 4.8], PANT, { g: 'legF', b: -.15 });
    R.P([[4, -9], [13, -9.6], [19.6, -5], [20, -.4], [4, -.4]], BOOT, { g: 'bootF', b: -.15 });
    R.chain([[-8, -40], [-9, -20], [-8.4, -7]], [6, 5.4, 5], PANT, { g: 'legN', ol: 1 });
    R.P([[-15, -9], [-3, -9.6], [4, -5], [4.4, -.4], [-15, -.4]], BOOT, { g: 'bootN', ol: 1 });
    R.DL(-15, -.8, 4.4, -.8, '#140c08'); R.DL(4, -.8, 20, -.8, '#140c08');
    R.push(); R.translate(0, s.by);
    // 산탄총: 먼 어깨에 걸쳐 총열이 뒤로
    hcGun(R, 22, -60, -24, -104, GUN, { double: true, noFore: false });
    R.chain([[16, -82], [22, -70], [21, -61]], [5, 4.6, 4.2], PL, R.pat({ g: 'armF', b: -.15, alts: [PLD], alt: plaid }));
    R.E(21.4, -60, 3.6, 3.4, 0, SK, { g: 'handF', ol: 1 });
    R.E(0, -60, 22, 25, 0, PL, R.pat({ g: 'body', alts: [PLD], alt: plaid }));
    R.P([[-20, -44], [20, -44], [19, -38], [-19, -38]], PANT, { g: 'hip' });
    R.P([[-19, -45], [19, -45], [18.6, -40.6], [-18.6, -40.6]], T('#3a2418'), { g: 'belt', ol: 1 });
    R.stamp(2, -44, ['bbb', 'b.b', 'bbb'], { b: '#c8a040' }, 1, 0);
    hcKnife(R, 15, -46, 13, .06, KP);
    // 머리: 큰 얼굴, 수염이 가슴까지, 털모자가 눈을 덮음
    R.E(4, -96, 11, 11, 0, SK, FACE);
    R.P([[-7, -96], [15, -96], [18, -88], [17, -78], [11, -70], [2, -68], [-6, -73], [-9, -84]], BEARD, R.pat({ g: 'beard', alts: [T('#45342c')], alt: (x, y) => (mod(Math.round(x * .7 + y * .5), 4) === 0 && hash2(Math.round(x), Math.round(y)) > .3 ? 0 : -1) }));
    R.E(12.4, -93.6, 3.8, 3.3, 0, NOSE, { g: 'nose', ol: 1 });
    R.DL(9, -86.6, 13.6, -86.8, '#1a1210');
    R.P([[-9, -112], [-2, -118.6], [9, -118.6], [16, -111], [17, -98], [-9, -98]], BEAN, R.pat({ g: 'beanie', alts: [T('#c89a30')], alt: x => (mod(Math.round(x), 3) === 0 ? 0 : -1) }));
    R.P([[-9.6, -104], [17.4, -104], [17.8, -96.6], [-9.8, -96.8]], BEAN, R.pat({ g: 'fold', cl: 3, alts: [T('#b88a28')], alt: x => (mod(Math.round(x), 2) === 0 ? 0 : -1) }));
    R.E(3, -120.4, 3.6, 3.2, 0, T('#f2e2b4', .2), { g: 'pom', ol: 1 });
    R.E(-7.4, -94, 2, 3, 0, SK, { g: 'ear', ol: 1 });
    R.pop();
  }
  function cat(R, s) {
    // 가까운 팔에 아기처럼 안긴 솔 (팔이 고양이 아래로 감쌈)
    R.push(); R.translate(0, s.by);
    catAt(R, -6, -45, 2.3, R2 => catLoafHi(R2, { breath: s.by, peek: !s.cblink }));
    R.chain([[-20, -82], [-25, -62], [-18, -42], [2, -41]], [5.2, 4.8, 4.6, 4.2], PL, R.pat({ g: 'armN', ol: 1, alts: [PLD], alt: plaid }));
    R.E(4.6, -42, 3.8, 3.6, 0, SK, { g: 'handN', ol: 1 });
    R.pop();
  }
  return {
    title: '곰 같은 덩치', hero: '술통 같은 몸 · 가슴까지 덮은 검은 수염 · 눈까지 눌러쓴 털실 모자 · 빨간 체크 모직 재킷', gun: '어깨에 걸친 쌍대 산탄총', knife: '허리띠의 뼈 손잡이 칼', catPos: '품에 안김', body: '술통',
    point: '무섭게 생긴 덩치가 고양이만큼은 아기처럼 안고 다님', bg: '#2f6b4c', tint, ox: 78, oy: 150, sc: 1.08, shadows: [[82, 150, 30, 3.6]],
    swatch: ['#2f6b4c', '#b8342a', '#2c201c', '#e2b84a', '#978672'],
    layers: s => [{ fn: R => hero(R, s) }, { fn: R => cat(R, s) }],
    back(pb, s) { for (let i = 0; i < 7; i++) { const x = mod(hash1(i + 9) * 170 + s.t * 12, 170) - 5, y = mod(hash1(i + 70) * 170 + s.t * 30, 170) - 5; polyAt(pb, x, y, s.t * TAU * .3 + i, 1, [[0, -2.6], [1.6, 0], [0, 2.6], [-1.6, 0]], i % 2 ? '#3f8360' : '#d9a441'); } },
  };
})());

/* ── 3. 털모자 덫사냥꾼 & 코트 앞섶의 솔 ── */
HCD.push((() => {
  const tint = '#1c3a5a', T = edPal(tint);
  const SK = skinPal('#efc0a0'), NOSE = skinPal('#e06a5a'), COAT = T('#7a4e2e', .14), FUR = T('#e2d2b0', .16), HATF = T('#6e5a46', .16), RING = T('#2e241e'), MUST = T('#e6e2da', .1), MITT = T('#b03a2a'), BOOT = T('#5a4636'), PANT = T('#4a4a58');
  const KP = { sheath: T('#3e2a1e'), handle: T('#d8c49a'), guard: '#c0c0c8' };
  function hero(R, s) {
    // 등에 진 설피 (눈신)
    R.E(-14, -86, 8, 15, -.3, T('#a07a4a'), R.pat({ g: 'shoe', ol: 1, alts: [T('#d8c08a')], alt: (x, y) => (mod(Math.round(x + y), 4) === 0 || mod(Math.round(x - y), 4) === 0 ? 0 : -1) }));
    // 긴 소총을 옆에 세워 짚음
    hcGun(R, 20, -1, 24, -146, GUN, { longFore: true, stockR: 3 });
    R.chain([[5, -36], [6, -18], [6.6, -6]], [4.6, 4.2, 4], PANT, { g: 'legF', b: -.15 });
    R.P([[0, -12], [12, -12], [15, -5], [15, -.4], [0, -.4]], BOOT, R.pat({ g: 'bootF', b: -.15, alts: [FUR], alt: (x, y) => (y < -9.4 ? 0 : -1) }));
    R.chain([[-6, -36], [-7, -18], [-6.4, -6]], [4.8, 4.4, 4.2], PANT, { g: 'legN', ol: 1 });
    R.P([[-13, -12], [-1, -12], [3, -5], [3, -.4], [-13, -.4]], BOOT, R.pat({ g: 'bootN', ol: 1, alts: [FUR], alt: (x, y) => (y < -9.4 ? 0 : -1) }));
    R.K2(-3, -13, -2, -19, 1.4, 1.6, KP.handle, { g: 'bootKnife', ol: 1 });
    R.push(); R.translate(0, s.by);
    R.chain([[12, -88], [19, -76], [20, -72]], [4.4, 4, 3.8], COAT, { g: 'armF', b: -.15 });
    R.E(20.4, -71.6, 3.6, 3.6, 0, MITT, { g: 'mittF', ol: 1 });
    R.P([[-15, -92], [13, -92], [17, -60], [19, -30], [-19, -30], [-16, -60]], COAT, { g: 'coat', side: .6 });
    R.P([[-19.6, -33], [19.6, -33], [20, -26], [-20, -26]], FUR, R.pat({ g: 'hem', ol: 1, alts: [T('#c8b48c')], alt: x => (mod(Math.round(x), 3) === 0 ? 0 : -1) }));
    R.P([[-1, -92], [4, -92], [4, -33], [-1, -33]], FUR, { g: 'placket', ol: 1 });
    for (const y of [-80, -66, -52]) R.stamp(1.6, y, ['tt'], { t: '#5a3a22' }, 1, 0);
    R.P([[-17, -60], [17, -60], [17, -56], [-17, -56]], T('#3a2a1e'), { g: 'belt', ol: 1 });
    R.chain([[-13, -88], [-18, -70], [-12, -60]], [4.6, 4.2, 4], COAT, { g: 'armN', ol: 1 });
    R.E(-11, -59, 3.6, 3.4, 0, MITT, { g: 'mittN', ol: 1 });
    R.E(1, -92, 15, 5, 0, FUR, R.pat({ g: 'collar', ol: 1, alts: [T('#c8b48c')], alt: (x, y) => (hash2(Math.round(x), Math.round(y)) > .7 ? 0 : -1) }));
    // 머리: 동그란 볼 · 빨간 코 · 서리 낀 큰 콧수염. 너구리 털모자의 털 술이 눈을 덮음
    R.E(3, -103, 9.6, 9.4, 0, SK, FACE);
    R.E(9, -100.6, 3.6, 3.2, 0, NOSE, { g: 'nose', ol: 1 });
    R.P([[0, -97], [8, -97.6], [15, -96], [17, -91], [13, -92.6], [8, -94], [3, -92.6], [-1, -93.6]], MUST, R.pat({ g: 'must', ol: 1, alts: [T('#bcc4cc')], alt: (x, y) => (y > -93.6 ? 0 : -1) }));
    R.chain([[-8, -112], [-14, -106], [-17, -96], [-16.6 + s.sw * .6, -86]], [3.4, 3.2, 3, 2.4], HATF, R.pat({ g: 'tail', alts: [RING], alt: (x, y, t) => (mod(t * 6, 1) < .45 ? 0 : -1) }));
    R.P([[-9, -108], [-6, -116], [3, -119], [12, -116], [15, -108], [15.6, -103], [12, -104.6], [9, -102.6], [6, -105], [3, -102.4], [0, -105], [-3, -102.6], [-6, -104.6], [-9.6, -103]], HATF, R.pat({ g: 'hat', cl: 4, alts: [T('#8a7660')], alt: (x, y) => (hash2(Math.round(x * .8), Math.round(y)) > .72 ? 0 : -1) }));
    R.pop();
  }
  function cat(R, s) {
    // 코트 앞섶 사이로 고개만 쏙
    R.push(); R.translate(0, s.by);
    catAt(R, 1.6, -45, 2.3, R2 => catHeadFront(R2, -11.6, { blink: s.cblink }));
    R.E(-2.6, -58.6, 2.6, 1.8, 0, CP.W, { g: 'pawL', ol: 1 }); R.E(6, -58.4, 2.6, 1.8, 0, CP.W, { g: 'pawR', ol: 1 });
    R.pop();
  }
  return {
    title: '털모자 덫사냥꾼', hero: '동글한 털 코트 · 너구리 꼬리 털모자 · 서리 낀 흰 콧수염 · 빨간 코 · 등에 진 설피', gun: '옆에 세워 짚은 긴 소총', knife: '털 장화에 꽂은 칼', catPos: '코트 앞섶에서 고개만', body: '동글',
    point: '털모자 술이 눈을 덮고, 따뜻한 코트 속에서 솔이 내다봄', bg: '#4f86b8', tint, ox: 74, oy: 150, sc: 1.08, shadows: [[80, 150, 28, 3.4]],
    swatch: ['#4f86b8', '#7a4e2e', '#e2d2b0', '#6e5a46', '#b03a2a'],
    layers: s => [{ fn: R => hero(R, s) }, { fn: R => cat(R, s) }],
    back(pb, s) { for (let i = 0; i < 26; i++) { const x = mod(hash1(i + 1) * 160 + Math.sin(s.t * TAU + i) * 3, 160), y = mod(hash1(i + 30) * 160 + s.t * 40 * (.6 + hash1(i) * .6), 160); pb.px(x, y, '#e8f2fa'); if (i % 3 === 0) pb.px(x + 1, y, '#e8f2fa'); } },
    front(pb, s) { const u = s.t; for (let i = 0; i < 3; i++) { const k = (u + i / 3) % 1; if (k < .6) pb.ellipse(Math.round(100 + k * 14), Math.round(42 - k * 10), 1.6 + k * 3, 1 + k * 2, '#f2f6fa'); } },
  };
})());

/* ── 4. 조선 산포수 & 발치의 솔 ── */
HCD.push((() => {
  const tint = '#5e2416', T = edPal(tint);
  const SK = skinPal('#d8a074'), JK = T('#ece2cc', .1), PA = T('#d8ccb2'), WRAP = T('#3e4e62'), SHOE = T('#c8a46a'), HAT = T('#26222a', .14), RED = T('#d8322a', .2), SASH = T('#2e6a8a'), POUCH = T('#8a5a32'), BEARD = T('#2a2220');
  const KP = { sheath: T('#2a2220'), handle: T('#7a3a2a'), guard: '#e0b850', stitch: '#e0b850' };
  const quilt = (x, y) => (mod(Math.round(y), 4) === 0 ? 0 : -1);
  function hero(R, s) {
    // 화승총: 가까운 손으로 세워 어깨에 기댐 (불씨 끈에서 연기)
    hcGun(R, -6, -36, -16, -152, { wood: T('#7a4a2a'), steel: ['#1e1e24', '#34343e', '#5a5a66'] }, { bands: true, match: true, barR: 1.2, stockR: 2.8 });
    // 넓게 버틴 다리: 바지 · 행전 · 미투리
    R.chain([[5, -48], [12, -26], [14, -8]], [4.6, 3.4, 2.6], PA, { g: 'legF', b: -.12 });
    R.chain([[12.6, -22], [14, -8]], [2.8, 2.6], WRAP, { g: 'wrapF', b: -.12 });
    R.P([[10, -5], [17, -5.6], [21, -2.6], [21, -.4], [10, -.4]], SHOE, { g: 'shoeF', b: -.12 });
    R.chain([[-5, -48], [-11, -26], [-12, -8]], [4.8, 3.6, 2.8], PA, { g: 'legN', ol: 1 });
    R.chain([[-11, -22], [-12, -8]], [3, 2.8], WRAP, { g: 'wrapN', ol: 1 });
    R.P([[-16, -5], [-8, -5.6], [-3.6, -2.6], [-3.6, -.4], [-16, -.4]], SHOE, { g: 'shoeN', ol: 1 });
    R.stamp(-12, -14, ['w', '.', 'w', '.', 'w'], { w: '#e8e0cc' }, 0, 0);
    R.push(); R.translate(0, s.by);
    // 먼 손은 허리에 (당당하게)
    R.chain([[10, -84], [18, -70], [12, -58]], [3.6, 3.2, 3], JK, R.pat({ g: 'armF', b: -.15, alts: [T('#c8bca4')], alt: quilt }));
    R.P([[-12, -88], [10, -88], [13, -66], [12, -50], [-13, -50], [-14, -66]], JK, R.pat({ g: 'jk', side: .62, alts: [T('#cfc4ac')], alt: quilt }));
    R.P([[-1, -88], [4, -87], [10, -60], [6, -58]], JK, { g: 'lapel', ol: 1 });
    R.P([[-14, -56], [13, -56], [13.6, -50], [-14.6, -50]], SASH, { g: 'sash', ol: 1 });
    R.P([[8, -54], [13, -54], [15, -40], [10, -42]], SASH, { g: 'sashT', ol: 1 });
    hcKnife(R, -6, -52, 12, .05, KP);
    R.chain([[-5.6, -40], [-6.4, -35], [-5.4, -31]], [.6, .6, .6], RED, { g: 'tassel' }); R.E(-5.6, -30, 1.4, 2.2, 0, RED, { g: 'tasselE', ol: 1 });
    R.E(-15, -48, 3.4, 4.4, .3, POUCH, { g: 'pouch', ol: 1 });
    R.chain([[-12, -86], [-14, -66], [-8, -50]], [3.6, 3.3, 3], JK, R.pat({ g: 'armN', ol: 1, alts: [T('#c8bca4')], alt: quilt }));
    R.E(-7.6, -49, 2.8, 2.8, 0, SK, { g: 'handN', ol: 1 });
    // 머리: 가는 콧수염 · 짧은 염소수염 · 광대. 전립의 넓은 챙이 눈을 가림
    R.K2(0, -88, .6, -95, 2.8, 2.6, SK, { g: 'neck' });
    R.P([[-6, -119], [6, -119], [7.6, -110], [7.4, -101], [5, -95], [1, -92.6], [-3, -94], [-6, -98], [-7, -108]], SK, FACE);
    R.E(-5.4, -106, 1.6, 2.6, 0, SK, { g: 'ear', ol: 1 });
    R.P([[5, -108], [10.6, -101.6], [9.6, -100.4], [5.6, -101.6]], SK, { g: 'nose', flat: 1 });
    R.DL(4.6, -99, 8, -98.6, BEARD[1]); R.DL(8, -98.6, 11.4, -96, BEARD[1]); R.DL(4, -99, 1, -97.6, BEARD[1]);
    R.P([[2.6, -94.6], [5.4, -94.6], [4.6, -89], [3.4, -89]], BEARD, { g: 'goatee', ol: 1 });
    R.DL(4.4, -96.6, 7, -96.6, '#5a2a24');
    R.E(.6, -117, 8, 6.4, 0, HAT, { g: 'crown' });
    R.chain([[.6, -123], [.2, -128], [-2 + s.sw, -131]], [1.4, 2.2, 1.6], RED, { g: 'sangmo' });
    R.E(1, -112, 19, 4, -.06, HAT, { g: 'brim', cl: 6 });
    for (let k = 0; k < 6; k++) R.stamp(7.4 - k * .4, -108 + k * 3, ['o'], { o: k % 2 ? '#e0b850' : '#4a8ab8' });
    R.pop();
  }
  function cat(R, s) { catAt(R, 30, -1, 1, R2 => catPoster(R2, { sw: s.sw, cblink: s.cblink })); }
  return {
    title: '조선 산포수', hero: '누빈 흰 저고리 · 파란 허리띠 · 행전과 미투리 · 붉은 상모를 단 전립 · 가는 콧수염', gun: '놋쇠 띠를 두른 화승총 (불씨 끈)', knife: '붉은 술을 단 장도', catPos: '발치에 앉아 올려다봄', body: '당당한 자세',
    point: '범을 쫓던 산포수의 차림, 한국적인 실루엣이 확 드러남', bg: '#c9573a', tint, ox: 70, oy: 150, sc: 1.02, shadows: [[74, 150, 26, 3.2], [118, 150, 12, 2.4]],
    swatch: ['#c9573a', '#ece2cc', '#26222a', '#2e6a8a', '#d8322a'],
    layers: s => [{ fn: R => hero(R, s) }, { fn: R => cat(R, s) }],
    back(pb, s) { smoke(pb, 54, 24, s.t, '#e8b8a0'); for (let i = 0; i < 6; i++) { const x = mod(hash1(i + 17) * 160 + s.t * 16, 160), y = mod(hash1(i + 71) * 160 + s.t * 24, 160); polyAt(pb, x, y, s.t * TAU * .5 + i, 1, [[0, -2.4], [1.4, 0], [0, 2.4], [-1.4, 0]], i % 2 ? '#e8a040' : '#a8402a'); } },
  };
})());

/* ── 5. 산림 감시원 & 배낭 속 솔 ── */
HCD.push((() => {
  const tint = '#7a4a12', T = edPal(tint);
  const SK = skinPal('#e2a47c'), SH = T('#c8a874', .14), PA = T('#56603a'), BOOT = T('#3e2a1e'), HAT = T('#8a6a3e', .12), BAND = T('#3a2a1e'), NK = T('#3a7a52'), PACK = T('#6a7a4a'), BEARD = T('#4a3424');
  const KP = { sheath: T('#2e2a24'), handle: T('#3a3a40'), guard: '#a0a0a8' };
  function hero(R, s) {
    R.P([[-26, -94], [-4, -98], [-2, -60], [-24, -58]], PACK, { g: 'pack', side: .6 });
    R.P([[-21, -76], [-15, -76], [-15, -62], [-21, -62]], T('#56643a'), { g: 'packP', ol: 1 });
    hcGun(R, 15, -52, 22, -140, GUN, { scope: true, sling: true });
    R.chain([[5, -50], [7, -26], [8, -7]], [3.8, 3.4, 3.2], PA, { g: 'legF', b: -.15 });
    R.P([[3.4, -10], [11, -10.6], [17, -5], [17.4, -.4], [3.4, -.4]], BOOT, { g: 'bootF', b: -.15 });
    R.chain([[-5, -50], [-6, -26], [-5.6, -7]], [4, 3.6, 3.4], PA, { g: 'legN', ol: 1 });
    R.P([[-11, -10], [-2, -10.6], [4, -5], [4.4, -.4], [-11, -.4]], BOOT, { g: 'bootN', ol: 1 });
    R.P([[-10, -40], [-3, -40], [-3, -28], [-10, -28]], T('#4a5232'), { g: 'thighPocket', ol: 1 });
    hcKnife(R, -8.4, -30, 12, -.04, KP, 'T');
    R.push(); R.translate(0, s.by);
    R.chain([[12, -88], [17, -72], [12, -60]], [3.6, 3.2, 2.8], SH, { g: 'armF', b: -.15 });
    R.E(12, -59, 2.8, 2.8, 0, SK, { g: 'handF', ol: 1 });
    R.P([[-14, -92], [13, -92], [14, -70], [11, -50], [-12, -50], [-15, -70]], SH, { g: 'shirt', side: .62 });
    R.P([[2, -84], [10, -84], [10, -76], [2, -76]], T('#b8986a'), { g: 'pocR', ol: 1 }); R.P([[-11, -84], [-3, -84], [-3, -76], [-11, -76]], T('#b8986a'), { g: 'pocL', ol: 1 });
    R.E(-12.4, -84, 2.4, 2.4, 0, T('#d8a832'), { g: 'patch', ol: 1, flat: 1 });
    R.P([[-13, -53], [12, -53], [12, -48], [-13, -48]], T('#3a2a1e'), { g: 'belt', ol: 1 });
    R.K2(-8, -92, -12, -60, 1.6, 1.6, T('#4a5a32'), { g: 'strapN', ol: 1 });
    R.chain([[-14, -88], [-17, -72], [-13, -62]], [3.8, 3.4, 3], SH, { g: 'armN', ol: 1 });
    R.chain([[-16.6, -72], [-13, -62]], [3, 2.8], SK, { g: 'forearmN', ol: 1 });
    R.E(-12.6, -60.6, 2.9, 2.9, 0, SK, { g: 'handN', ol: 1 });
    R.P([[-5, -93], [6, -93], [1, -84]], NK, { g: 'kerchief', ol: 1 });
    // 머리: 네모난 턱 · 짧은 수염 · 단단한 입. 몬태나 모자의 챙이 눈을 가림
    R.K2(0, -92, .6, -99, 3, 2.8, SK, { g: 'neck' });
    R.P([[-6.6, -122], [6.6, -122], [8, -112], [8, -102], [6, -96], [0, -94], [-5, -96], [-7, -104], [-7.6, -114]], SK, FACE);
    R.P([[-6, -106], [8, -106], [8.4, -100], [6, -95.6], [0, -93.6], [-5, -96], [-6.6, -101]], BEARD, R.pat({ g: 'beard', alts: [T('#5e4430')], alt: (x, y) => (hash2(Math.round(x), Math.round(y)) > .6 ? 0 : -1) }));
    R.E(-5.8, -110, 1.8, 2.8, 0, SK, { g: 'ear', ol: 1 });
    R.P([[5, -114], [10.6, -106], [9.4, -104.8], [5.6, -106]], SK, { g: 'nose', flat: 1 });
    R.DL(3.6, -100, 7.6, -100.2, '#2a1a12');
    R.P([[-6, -129], [-3, -136], [0, -132.6], [3, -136.4], [6, -129], [7.6, -119], [-7.6, -119]], HAT, { g: 'crown', side: .6 });
    R.P([[-7.8, -122.6], [7.8, -122.6], [8, -118.8], [-8, -118.8]], BAND, { g: 'band', ol: 1 });
    R.E(.6, -117.6, 18, 3.6, -.04, HAT, { g: 'brim', cl: 6 });
    R.pop();
  }
  function cat(R, s) {
    // 배낭 위로 귀와 눈만 (사냥꾼 뒤)
    R.push(); R.translate(0, s.by);
    catAt(R, -18, -78, 2.2, R2 => catHeadFront(R2, -11.6, { blink: s.cblink, ear: s.sw > .7 ? 1 : 0 }));
    R.E(-23, -91, 2.4, 1.6, 0, CP.W, { g: 'paw', ol: 1 }); R.E(-13.4, -91.4, 2.4, 1.6, 0, CP.W, { g: 'paw2', ol: 1 });
    R.pop();
  }
  return {
    title: '산림 감시원', hero: '어깨 넓은 탄탄한 몸 · 반팔 카키 셔츠 · 초록 목수건 · 몬태나 모자 · 짧은 수염', gun: '조준경 단 볼트액션 소총', knife: '허벅지 주머니에 꽂은 칼', catPos: '배낭 위로 빼꼼', body: '탄탄',
    point: '든든한 아저씨 등 뒤에서 세상을 구경하는 솔', bg: '#e0a032', tint, ox: 78, oy: 150, sc: 1.05, shadows: [[82, 150, 24, 3.2]],
    swatch: ['#e0a032', '#c8a874', '#56603a', '#8a6a3e', '#3a7a52'],
    layers: s => [{ fn: R => cat(R, s) }, { fn: R => hero(R, s) }],
    back(pb, s) { for (let i = 0; i < 3; i++) { const x = mod(30 + i * 50 + s.t * 10, 180) - 10; pb.ellipse(x, 28 + i * 9, 10, 2.4, '#ecb85a'); pb.ellipse(x + 6, 26 + i * 9, 6, 2, '#ecb85a'); } },
  };
})());

/* ── 6. 우비 방랑자 & 우비 밑의 솔 ── */
HCD.push((() => {
  const tint = '#1e2a44', T = edPal(tint);
  const SK = skinPal('#e2b294'), PON = T('#3e5a4a', .1), HAT = T('#e0b032', .18), BOOT = T('#2a2e34'), BEARD = T('#5a4434');
  const KP = { sheath: T('#2e2a24'), handle: T('#a07a4a'), guard: '#c0c0c8' };
  function low(R, s) {
    hcGun(R, -10, -60, 14, -130, GUN, {});
    R.chain([[5, -26], [6, -14], [7, -6]], [3.4, 3.2, 3.2], BOOT, { g: 'bootF', b: -.15 });
    R.P([[3, -8], [10, -8.6], [14, -4], [14.4, -.4], [3, -.4]], BOOT, { g: 'footF', b: -.15 });
    R.chain([[-6, -26], [-7, -14], [-6.6, -6]], [3.6, 3.4, 3.4], BOOT, { g: 'bootN', ol: 1 });
    R.P([[-11, -8], [-3, -8.6], [2, -4], [2.4, -.4], [-11, -.4]], BOOT, { g: 'footN', ol: 1 });
  }
  function hero(R, s) {
    R.push(); R.translate(0, s.by);
    // 큰 세모 우비 (바람에 아랫단이 흔들림)
    const f = s.sw * 1.4;
    R.P([[-6, -98], [7, -98], [16, -70], [24, -24 + f], [12, -20 - f * .5], [2, -23 + f * .4], [-8, -19 - f * .3], [-22, -23 + f * .6], [-15, -70]], PON, R.pat({ g: 'poncho', side: .6, alts: [T('#334c3e')], alt: (x, y) => (mod(Math.round(x * .5 - y * .2), 6) === 0 ? 0 : -1) }));
    R.DL(1, -96, 3, -30, PON[0]);
    hcKnife(R, 4, -70, 11, .1, KP);
    R.E(12, -60, 2.8, 2.8, 0, SK, { g: 'hand', ol: 1 });
    // 머리: 긴 코와 덥수룩한 수염만 보임. 노란 방수모의 챙이 눈을 덮음
    R.K2(0, -98, .6, -104, 2.6, 2.4, SK, { g: 'neck' });
    R.P([[-5.6, -127], [6, -127], [7.4, -118], [7, -108], [4.6, -102], [0, -100], [-4, -101.6], [-6, -108], [-6.6, -118]], SK, FACE);
    R.P([[-5, -112], [7.4, -112], [7.6, -105], [5, -99], [1, -96], [-3, -98], [-5.6, -104]], BEARD, R.pat({ g: 'beard', alts: [T('#6e5440')], alt: (x, y) => (mod(Math.round(x + y * .3), 3) === 0 ? 0 : -1) }));
    R.P([[4.4, -119], [12, -111], [10.6, -109.6], [5.2, -111]], SK, { g: 'nose', flat: 1 });
    R.stamp(10, -110.4, ['n'], { n: '#7a3a30' });
    R.P([[-7.4, -132], [0, -136], [7.4, -132], [8.4, -123], [-8.4, -123]], HAT, { g: 'crown', side: .6 });
    R.P([[-9, -125], [-20, -116 + f * .3], [-18, -112], [-6, -118]], HAT, { g: 'backBrim', ol: 1 });
    R.E(2, -122.4, 14, 3.6, .05, HAT, { g: 'brim', cl: 6 });
    R.DL(-6, -126, 6, -126.4, HAT[0]);
    R.pop();
  }
  function cat(R, s) {
    // 우비 아랫단 아래 장화 사이로 얼굴만
    catAt(R, 1.6, 14.6, 2.2, R2 => catHeadFront(R2, -11.6, { blink: s.cblink, ear: s.sw < -.7 ? 1 : 0 }));
    R.E(-3.4, -1.4, 2.4, 1.6, 0, CP.W, { g: 'pawL', ol: 1 }); R.E(6.6, -1.2, 2.4, 1.6, 0, CP.W, { g: 'pawR', ol: 1 });
  }
  return {
    title: '우비 방랑자', hero: '몸 전체를 덮는 세모 우비 · 노란 방수모 · 길고 뾰족한 코 · 덥수룩한 수염 · 고무장화', gun: '우비 밖으로 삐져나온 소총', knife: '가슴끈의 칼', catPos: '우비 밑 장화 사이', body: '세모',
    point: '비 오는 숲을 걷는 커다란 세모, 그 밑에서 비를 피하는 솔', bg: '#56698a', tint, ox: 78, oy: 150, sc: 1.08, shadows: [[80, 150, 26, 3.2]],
    swatch: ['#56698a', '#3e5a4a', '#e0b032', '#2a2e34', '#978672'],
    layers: s => [{ fn: R => low(R, s) }, { fn: R => cat(R, s) }, { fn: R => hero(R, s) }],
    back(pb, s) { for (let i = 0; i < 22; i++) { const x = mod(hash1(i + 3) * 180 - s.t * 30, 180) - 10, y = mod(hash1(i + 40) * 170 + s.t * 120, 170) - 10; pb.line(x, y, x - 2, y + 6, '#8a9cba'); } },
    front(pb, s) { for (let i = 0; i < 6; i++) { const x = mod(hash1(i + 90) * 180 - s.t * 30, 180) - 10, y = mod(hash1(i + 60) * 170 + s.t * 140, 170) - 10; pb.line(x, y, x - 2, y + 7, '#b4c4dc'); } },
  };
})());

/* ── 7. 노련한 영감 & 앞서 걷는 솔 ── */
HCD.push((() => {
  const tint = '#3a4a2a', T = edPal(tint);
  const SK = skinPal('#eab494'), NOSE = skinPal('#e0907a'), VEST = T('#6e5a3e'), SHIRT = T('#ece0c8', .1), PA = T('#5a5a6a'), BOOT = T('#3a2a20'), HAT = T('#7a6a52', .12), FEA = T('#b45e2c'), MUST = T('#f0ece4', .08), PIPE = T('#5a3a2a');
  const KP = { sheath: T('#4a3424'), handle: T('#8a6a4a'), guard: '#b0a080' };
  function hero(R, s) {
    // 총구를 아래로 메는 옛 방식 (비 맞지 않게)
    hcGun(R, -8, -92, -22, -16, GUN, { sling: true });
    R.chain([[5, -40], [9, -22], [8, -6]], [4, 3.6, 3.2], PA, { g: 'legF', b: -.15 });
    R.P([[4, -8], [12, -8.6], [16, -4], [16.4, -.4], [4, -.4]], BOOT, { g: 'bootF', b: -.15 });
    R.chain([[-5, -40], [-9, -22], [-7, -6]], [4.2, 3.8, 3.4], PA, { g: 'legN', ol: 1 });
    R.P([[-12, -8], [-4, -8.6], [1, -4], [1.4, -.4], [-12, -.4]], BOOT, { g: 'bootN', ol: 1 });
    R.push(); R.translate(0, s.by);
    R.chain([[10, -74], [16, -60], [12, -50]], [3.4, 3, 2.8], SHIRT, R.pat({ g: 'armF', b: -.15, alts: [T('#6a8ab0')], alt: x => (mod(Math.round(x), 3) === 0 ? 0 : -1) }));
    R.E(12, -49, 2.8, 2.8, 0, SK, { g: 'handF', ol: 1 });
    // 굽은 등 · 볼록한 배
    R.P([[-14, -80], [10, -76], [16, -60], [14, -44], [-12, -42], [-16, -62]], SHIRT, R.pat({ g: 'shirt', alts: [T('#6a8ab0')], alt: x => (mod(Math.round(x), 3) === 0 ? 0 : -1) }));
    R.E(4, -54, 12, 11, 0, SHIRT, R.pat({ g: 'belly', alts: [T('#6a8ab0')], alt: x => (mod(Math.round(x), 3) === 0 ? 0 : -1) }));
    R.P([[-14, -80], [-2, -78], [0, -46], [-12, -44], [-16, -62]], VEST, { g: 'vestN', ol: 1 });
    R.P([[6, -76], [11, -74], [15, -58], [13, -46], [8, -46]], VEST, { g: 'vestF', ol: 1 });
    R.P([[-11, -62], [-4, -62], [-4, -56], [-11, -56]], T('#8a6a3a'), { g: 'patch1', ol: 1 }); R.P([[-12, -52], [-5, -52], [-5, -47], [-12, -47]], T('#4a6a8a'), { g: 'patch2', ol: 1 });
    R.P([[-13, -45], [14, -45], [14, -40], [-13, -40]], T('#3a2a1e'), { g: 'belt', ol: 1 });
    hcKnife(R, 9, -43, 10, .1, KP);
    R.chain([[-12, -78], [-17, -64], [-12, -54]], [3.6, 3.2, 3], SHIRT, R.pat({ g: 'armN', ol: 1, alts: [T('#6a8ab0')], alt: x => (mod(Math.round(x), 3) === 0 ? 0 : -1) }));
    R.E(-11, -53, 2.9, 2.9, 0, SK, { g: 'handN', ol: 1 });
    R.K2(-10, -80, -12, -54, 1, 1, T('#4a2e1e'), { g: 'sling', ol: 1 });
    // 머리: 앞으로 쑥 내민 목 · 뭉툭한 코 · 입을 덮는 흰 바다코끼리 콧수염 · 곰방대
    R.K2(0, -80, 3, -86, 2.8, 2.6, SK, { g: 'neck' });
    R.E(5, -98, 8.6, 9, 0, SK, FACE);
    R.E(12, -96, 4, 3.6, 0, NOSE, { g: 'nose', ol: 1 });
    R.P([[3, -93], [10, -93.6], [17, -91], [18, -84], [14, -86.4], [10, -88], [6, -86.4], [2, -88]], MUST, { g: 'must', ol: 1 });
    R.K2(14, -87, 21, -84, .9, .9, PIPE, { g: 'pipe', ol: 1 }); R.E(21.6, -86, 1.8, 2, 0, PIPE, { g: 'bowl', ol: 1 });
    R.E(-2.4, -98, 2.4, 4, 0, T('#e8e4dc'), { g: 'side', ol: 1 });
    // 찌그러진 중절모: 챙이 앞으로 처져 눈을 덮음
    R.P([[-5, -116], [3, -120], [10, -117], [12, -106], [-6, -106]], HAT, { g: 'crown', side: .6 });
    R.DL(0, -118.6, 6, -117, HAT[0]);
    R.P([[-6, -109], [12, -109], [12.4, -105.6], [-6.4, -105.6]], T('#3a2e22'), { g: 'band', ol: 1 });
    R.P([[-7, -108], [-10, -113], [-14, -121], [-12, -121], [-8, -114], [-5, -109]], FEA, { g: 'fea', ol: 1 });
    R.P([[-12, -105], [4, -107.4], [16, -106], [21, -100], [17, -101.6], [4, -102], [-11, -102]], HAT, { g: 'brim', cl: 5 });
    R.pop();
  }
  function cat(R, s) { catAt(R, 34, -2, 1.9, R2 => catSideHi(R2, { pose: 'walk', p: s.t, tail: s.sw * .6, blink: s.cblink })); }
  return {
    title: '노련한 영감', hero: '굽은 등 · 볼록한 배 · 기운 조끼 · 입을 덮는 흰 콧수염 · 곰방대 · 처진 중절모', gun: '총구를 아래로 멘 오래된 소총', knife: '닳은 손잡이 칼', catPos: '앞서 걸으며 길 안내', body: '꾸부정',
    point: '숲을 손바닥처럼 아는 할아버지, 솔이 앞장섬', bg: '#8aa36c', tint, ox: 64, oy: 150, sc: 1.12, shadows: [[66, 150, 22, 3], [128, 150, 14, 2.4]],
    swatch: ['#8aa36c', '#6e5a3e', '#ece0c8', '#7a6a52', '#f0ece4'],
    layers: s => [{ fn: R => hero(R, s) }, { fn: R => cat(R, s) }],
    back(pb, s) { smoke(pb, 92, 50, s.t, '#c8d8b4'); smoke(pb, 94, 48, (s.t + .5) % 1, '#c8d8b4'); },
  };
})());

/* ── 8. 트위드 신사 & 목도리 두른 솔 ── */
HCD.push((() => {
  const tint = '#3a1018', T = edPal(tint);
  const SK = skinPal('#ecbc98'), TW = T('#8a6a46', .12), CAP = T('#6e5a3a', .12), TIE = T('#2a4a3a'), SOCK = T('#3a5a8a'), SHOE = T('#5a3020'), MUST = T('#3a2418');
  const herring = (x, y) => (mod(Math.round(x) + (mod(Math.floor(y / 3), 2) ? Math.round(y) : -Math.round(y)), 4) === 0 ? 0 : -1);
  const KP = { sheath: T('#4a2a1a'), handle: T('#c8b48a'), guard: '#d8c8a0' };
  function hero(R, s) {
    R.chain([[4, -60], [6, -38]], [3.8, 3.4], TW, R.pat({ g: 'kneeF', b: -.15, alts: [T('#6e5236')], alt: herring }));
    R.chain([[6, -38], [7, -6]], [2.8, 2.6], SOCK, R.pat({ g: 'sockF', b: -.15, alts: [['#a88a30', '#c8a040']], alt: (x, y) => (mod(Math.round(x * 1.5 + y), 6) < 1.5 || mod(Math.round(-x * 1.5 + y), 6) < 1.5 ? 0 : -1) }));
    R.P([[2.6, -7], [10, -7.6], [15, -4], [15.4, -.4], [2.6, -.4]], SHOE, { g: 'shoeF', b: -.15 });
    R.chain([[-4, -60], [-5, -38]], [4, 3.6], TW, R.pat({ g: 'kneeN', ol: 1, alts: [T('#6e5236')], alt: herring }));
    R.chain([[-5, -38], [-5, -6]], [3, 2.8], SOCK, R.pat({ g: 'sockN', ol: 1, alts: [['#a88a30', '#c8a040']], alt: (x, y) => (mod(Math.round(x * 1.5 + y), 6) < 1.5 || mod(Math.round(-x * 1.5 + y), 6) < 1.5 ? 0 : -1) }));
    R.P([[-10, -7], [-2, -7.6], [3, -4], [3.4, -.4], [-10, -.4]], SHOE, { g: 'shoeN', ol: 1 });
    R.stamp(-4, -4, ['b.b.b'], { b: '#a87048' }, 2, 0);
    R.push(); R.translate(0, s.by);
    R.chain([[10, -98], [15, -80], [11, -66]], [3.4, 3, 2.8], TW, R.pat({ g: 'armF', b: -.15, alts: [T('#6e5236')], alt: herring }));
    R.E(11, -65, 2.6, 2.6, 0, SK, { g: 'handF', ol: 1 });
    R.P([[-12, -102], [10, -102], [12, -80], [11, -58], [-11, -56], [-13, -80]], TW, R.pat({ g: 'jacket', side: .62, alts: [T('#6e5236')], alt: herring }));
    R.P([[-12, -76], [11, -76], [11, -72], [-12, -72]], TW, R.pat({ g: 'jbelt', ol: 1, alts: [T('#6e5236')], alt: herring }));
    for (const y of [-92, -82, -66]) R.stamp(1, y, ['b'], { b: '#d8c8a0' });
    R.P([[-2, -102], [4, -102], [2, -90]], ['#e8e2d6', '#f6f2ea'], { g: 'shirt', ol: 1 });
    R.P([[0, -101], [2.4, -101], [3, -88], [1.2, -86], [-.6, -88]], TIE, { g: 'tie', ol: 1 });
    hcKnife(R, 9, -58, 8, .08, KP);
    // 부러뜨려 연 쌍대 산탄총을 팔에 걸침
    R.K2(-22, -70, -2, -66, 3, 2.4, GUN.wood, { g: 'stock', ol: 1 });
    R.K2(-2, -66, 2, -65, 2.4, 2.4, GUN.steel, { g: 'hinge', ol: 1 });
    R.K2(2, -66, 12, -36, 1.2, 1.1, GUN.steel, { g: 'brl1', ol: 1 }); R.K2(4, -66, 14, -36, 1.2, 1.1, GUN.steel, { g: 'brl2', ol: 1 });
    R.chain([[-12, -98], [-17, -80], [-6, -68]], [3.6, 3.2, 3], TW, R.pat({ g: 'armN', ol: 1, alts: [T('#6e5236')], alt: herring }));
    R.E(-4, -67, 2.8, 2.8, 0, SK, { g: 'handN', ol: 1 });
    // 머리: 뾰족한 턱 · 꼬아 올린 콧수염. 헌팅캡 챙이 눈을 덮음
    R.K2(0, -102, .6, -108, 2.6, 2.4, SK, { g: 'neck' });
    R.P([[-5.6, -130], [6, -130], [7.4, -121], [7, -112], [4, -106], [1, -103.6], [-3, -106], [-6, -112], [-6.6, -121]], SK, FACE);
    R.E(-5, -118, 1.6, 2.6, 0, SK, { g: 'ear', ol: 1 });
    R.P([[4.6, -121], [11, -114], [9.6, -112.6], [5, -114]], SK, { g: 'nose', flat: 1 });
    R.P([[3, -111], [8, -112], [12, -110], [14, -113], [15, -110.6], [12, -108], [8, -109.4], [3, -108.6]], MUST, { g: 'must', ol: 1 });
    R.P([[3, -111], [-1, -111.6], [-3, -113.6], [-3.8, -111.4], [-1, -109], [3, -108.6]], MUST, { g: 'mustB', ol: 1 });
    R.DL(4, -106.6, 6.4, -106.8, '#5a2a24');
    R.P([[-7.6, -128], [-4, -135], [5, -136], [10, -131], [10.6, -126], [-7.8, -124]], CAP, R.pat({ g: 'cap', side: .6, alts: [T('#56462c')], alt: herring }));
    R.P([[4, -128], [17, -125.6], [16, -122.6], [3, -123]], CAP, R.pat({ g: 'peak', cl: 5, alts: [T('#56462c')], alt: herring }));
    R.stamp(2, -134, ['b'], { b: '#3e3020' });
    R.pop();
  }
  function cat(R, s) {
    catAt(R, 30, -1, 1, R2 => catPoster(R2, { sw: s.sw, cblink: s.cblink }));
    R.E(35, -19, 5, 1.8, -.1, TW, R.pat({ g: 'cscarf', ol: 1, alts: [T('#6e5236')], alt: herring }));
    R.P([[33, -19], [36, -19], [37, -13], [34.4, -13.4]], TW, R.pat({ g: 'cscarfT', ol: 1, alts: [T('#6e5236')], alt: herring }));
  }
  return {
    title: '트위드 신사', hero: '꼿꼿한 키 · 헤링본 트위드 재킷과 무릎 바지 · 아가일 양말 · 헌팅캡 · 꼬아 올린 콧수염', gun: '팔에 걸친 쌍대 산탄총 (꺾어 엶)', knife: '허리 가죽 주머니의 접이칼', catPos: '옆에 앉음 (같은 천 목도리)', body: '꼿꼿',
    point: '숲에서도 멋을 포기 못 하는 신사, 솔과 커플 목도리', bg: '#7c2e3c', tint, ox: 66, oy: 150, sc: 1.04, shadows: [[70, 150, 20, 3], [116, 150, 12, 2.4]],
    swatch: ['#7c2e3c', '#8a6a46', '#3a5a8a', '#6e5a3a', '#2a4a3a'],
    layers: s => [{ fn: R => hero(R, s) }, { fn: R => cat(R, s) }],
    back(pb, s) { for (let i = 0; i < 5; i++) { const x = mod(20 + i * 34 + s.t * 8, 180) - 10, y = 18 + (i % 2) * 10; for (let k = 0; k < 7; k++) pb.px(x + k, y + (k % 2), '#9a4454'); } },
  };
})());

/* ── 9. 떠돌이 총잡이 & 모자 위의 솔 ── */
HCD.push((() => {
  const tint = '#6a2a24', T = edPal(tint);
  const SK = skinPal('#d89a72'), STB = ['#9a6a4c', '#b48262'], SER = T('#c8402e'), SH = T('#e8d8b8', .1), PA = T('#5a4a3a'), BOOT = T('#6a3a24'), HAT = T('#3a2e26', .12), BAND = T('#a8742e');
  const serape = (x, y) => { const k = mod(Math.round(y + x * .35), 9); return k < 1 ? 0 : k < 2 ? 1 : k > 6 && k < 8 ? 2 : -1; };
  const SALT = [['#e6d6b4', '#f4e8cc'], ['#1e5e5e', '#2e7a7a'], ['#241a16', '#2e221c']];
  const KP = { sheath: T('#4a2a18'), handle: T('#d8c49a'), guard: '#d8b04c' };
  function hero(R, s) {
    // 짝다리: 가까운 다리로 버티고 먼 다리는 느슨하게
    R.chain([[5, -54], [10, -30], [9, -6]], [3.4, 3, 2.8], PA, { g: 'legF', b: -.15 });
    R.P([[5, -8], [12, -8.6], [17, -4], [17.4, -.4], [5, -.4]], BOOT, { g: 'bootF', b: -.15 });
    R.chain([[-5, -54], [-6, -30], [-5, -6]], [3.6, 3.2, 3], PA, { g: 'legN', ol: 1 });
    R.P([[-10, -8], [-2, -8.6], [3, -4], [3.4, -.4], [-10, -.4]], BOOT, { g: 'bootN', ol: 1 });
    R.push(); R.translate(0, s.by);
    hcGun(R, 15, -54, 24, -132, GUN, { lever: true, brass: true });
    R.chain([[10, -96], [18, -82], [18.6, -72]], [3.2, 2.8, 2.6], SH, { g: 'armF', b: -.15 });
    R.E(18.8, -70.6, 2.6, 2.6, 0, SK, { g: 'handF', ol: 1 });
    R.P([[-11, -98], [10, -98], [11, -76], [10, -56], [-10, -56], [-12, -76]], SH, { g: 'shirt', side: .62 });
    R.P([[-11, -58], [11, -58], [11, -53], [-11, -53]], T('#3a2418'), { g: 'belt', ol: 1 });
    R.stamp(1, -57, ['bbb', 'b.b', 'bbb'], { b: '#c8a040' }, 1, 0);
    hcKnife(R, -10, -54, 13, -.12, KP);
    // 가까운 어깨에 걸친 줄무늬 담요 망토
    R.P([[-13, -100], [4, -100], [8, -88], [2, -60 + s.sw], [-8, -58], [-16, -64 - s.sw * .5], [-15, -86]], SER, R.pat({ g: 'serape', ol: 1, alts: SALT, alt: serape }));
    R.stamp(-6, -57, ['f.f.f', 'f.f.f'], { f: '#e6d6b4' }, 2, 0);
    // 머리: 수염 자국 · 입에 문 풀줄기. 납작한 챙이 눈을 가림
    R.K2(0, -98, .6, -104, 2.6, 2.4, SK, { g: 'neck' });
    R.P([[-5.6, -127], [6, -127], [7.4, -118], [7, -108], [4.6, -102], [1, -99.6], [-3, -101.6], [-6, -108], [-6.6, -118]], SK, R.pat({ g: 'face', lt: [-.1, .95], rs: 0, alts: [STB], alt: (x, y) => (y > -110 && hash2(Math.round(x) + 3, Math.round(y)) > .42 ? 0 : -1) }));
    R.E(-5, -114, 1.6, 2.6, 0, SK, { g: 'ear', ol: 1 });
    R.P([[4.6, -118], [10, -111], [8.6, -109.6], [5, -111]], SK, { g: 'nose', flat: 1 });
    R.DL(4, -105, 7, -104.6, '#5a2a24'); R.DL(7, -104.8, 13, -107.4, '#a8c060');
    R.P([[-6.6, -134], [6.6, -134], [7.6, -122], [-7.6, -122]], HAT, { g: 'crown', side: .6 });
    R.P([[-7.6, -125.4], [7.6, -125.4], [7.8, -121.6], [-7.8, -121.6]], BAND, { g: 'band', ol: 1 });
    R.E(.6, -120.6, 19, 3.2, -.04, HAT, { g: 'brim', cl: 6 });
    R.pop();
  }
  function cat(R, s) {
    // 모자 꼭대기에서 식빵 굽는 솔
    R.push(); R.translate(0, s.by);
    R.chain([[-6, -135], [-11, -133], [-12, -128], [-10 + s.sw, -125]], [1.7, 1.6, 1.4, 1.1], CP.F, R.pat({ g: 'ctail', alts: [CP.S], alt: (x, y, t) => (t > .4 && t < .7 ? 0 : -1) }));
    catAt(R, 1, -133.6, 2.1, R2 => catLoafHi(R2, { breath: s.by, peek: !s.cblink }));
    R.pop();
  }
  return {
    title: '떠돌이 총잡이', hero: '마른 짝다리 · 줄무늬 담요 망토 · 납작한 챙 모자 · 수염 자국 · 입에 문 풀줄기', gun: '놋쇠 몸통 레버액션 소총', knife: '허리 뒤의 보위 칼', catPos: '모자 꼭대기 식빵', body: '짝다리',
    point: '말 대신 고양이를 모자에 태우고 다니는 떠돌이', bg: '#d0877a', tint, ox: 76, oy: 152, sc: .9, shadows: [[82, 150, 22, 3]],
    swatch: ['#d0877a', '#c8402e', '#e8d8b8', '#3a2e26', '#2e7a7a'],
    layers: s => [{ fn: R => hero(R, s) }, { fn: R => cat(R, s) }],
    back(pb, s) { for (let i = 0; i < 8; i++) { const x = mod(hash1(i + 33) * 180 + s.t * 26, 180) - 10, y = 120 + hash1(i + 3) * 28; pb.hl(x, x + 3, y, '#dc9c8e'); } },
  };
})());

/* ── 10. 산사람 & 지게 위의 솔 ── */
HCD.push((() => {
  const tint = '#2a3214', T = edPal(tint);
  const SK = skinPal('#cc8c64'), CL = T('#c8b48a', .1), PELT = T('#8a6a4a', .16), STR = T('#d8b860', .2), HAIR = T('#4a3a2e', .14), JIGE = T('#9a7044'), WOOD = T('#8a6038'), ROPE = '#e0c890', SHOE = T('#c8a46a');
  const KP = { sheath: T('#6a4a2a'), handle: T('#4a3424'), guard: '#a08a5a' };
  function hero(R, s) {
    // 지게: 긴 다리 두 개 · 가로대 · 장작 짐 · 짐에 묶은 총
    R.K2(-16, -2, -20, -128, 1.8, 1.6, JIGE, { g: 'jigeL', ol: 1 }); R.K2(-6, -2, -10, -128, 1.8, 1.6, JIGE, { g: 'jigeR', ol: 1 });
    for (const y of [-60, -88, -116]) R.K2(-19, y, -8, y, 1.2, 1.2, JIGE, { g: 'bar' + y, ol: 1 });
    R.P([[-30, -122], [2, -122], [4, -100], [-32, -100]], WOOD, R.pat({ g: 'bundle', side: .6, alts: [T('#6a4a2a')], alt: (x, y) => (mod(Math.round(y), 4) === 0 ? 0 : -1) }));
    for (let k = 0; k < 6; k++) R.stamp(3, -119 + k * 3.4, ['oo'], { o: '#d8b07a' }, 0, 0);
    R.DL(-30, -111, 4, -111, ROPE);
    hcGun(R, -26, -40, -30, -140, GUN, { sling: false });
    R.chain([[6, -42], [10, -22], [10, -6]], [4.4, 4, 3.6], CL, { g: 'legF', b: -.15 });
    R.P([[6, -6], [14, -6.6], [18, -3], [18.4, -.4], [6, -.4]], SHOE, { g: 'shoeF', b: -.15 });
    R.chain([[-6, -42], [-8, -22], [-7, -6]], [4.6, 4.2, 3.8], CL, R.pat({ g: 'legN', ol: 1, alts: [T('#a8946a')], alt: (x, y) => (y > -20 && y < -16 ? 0 : -1) }));
    R.P([[-12, -6], [-3, -6.6], [2, -3], [2.4, -.4], [-12, -.4]], SHOE, { g: 'shoeN', ol: 1 });
    R.push(); R.translate(0, s.by);
    R.chain([[12, -80], [20, -64], [16, -52]], [4.2, 3.8, 3.4], CL, { g: 'armF', b: -.15 });
    R.E(16, -51, 3.2, 3.2, 0, SK, { g: 'handF', ol: 1 });
    R.P([[-14, -86], [12, -84], [15, -64], [13, -42], [-12, -42], [-16, -64]], CL, R.pat({ g: 'body', side: .62, alts: [T('#a8946a')], alt: (x, y) => (mod(Math.round(x * .5 + y * .1), 7) === 0 ? 0 : -1) }));
    R.P([[0, -70], [8, -70], [8, -60], [0, -60]], T('#8a7a5a'), { g: 'patch', ol: 1 });
    R.P([[-13, -47], [13, -47], [13, -43], [-13, -43]], [ROPE, ROPE], { g: 'rope', ol: 1, flat: 1 });
    hcKnife(R, 8, -45, 15, .06, KP);
    // 어깨에 두른 털가죽
    R.P([[-16, -92], [14, -90], [16, -78], [8, -72], [0, -76], [-8, -71], [-17, -76]], PELT, R.pat({ g: 'pelt', ol: 1, alts: [T('#5a4430')], alt: (x, y) => (mod(Math.round(x * .6), 5) === 0 ? 0 : -1) }));
    R.K2(-12, -90, -14, -62, 1.2, 1.2, [ROPE, ROPE], { g: 'strapJ', ol: 1 });
    R.chain([[-13, -86], [-18, -66], [-10, -54]], [4.4, 4, 3.6], CL, { g: 'armN', ol: 1 });
    R.E(-9, -53, 3.2, 3.2, 0, SK, { g: 'handN', ol: 1 });
    // 머리: 모자 밑으로 흘러내린 긴 머리 · 가슴까지 오는 수염 · 큰 코. 해진 밀짚모자가 눈을 덮음
    R.P([[-9, -112], [-14, -96], [-13, -80], [-8, -84], [-5, -100]], HAIR, R.pat({ g: 'hairB', alts: [T('#5e4a3a')], alt: (x, y) => (mod(Math.round(x * .6 - y * .3), 3) === 0 ? 0 : -1) }));
    R.E(3, -102, 9, 9.4, 0, SK, FACE);
    R.P([[-5, -100], [12, -100], [15, -90], [13, -76], [6, -68], [-1, -72], [-6, -82], [-7, -92]], HAIR, R.pat({ g: 'beard', alts: [T('#5e4a3a')], alt: (x, y) => (mod(Math.round(x * .5 + y * .4), 3) === 0 ? 0 : -1) }));
    R.E(11, -99, 3.8, 3.4, 0, SK, { g: 'nose', ol: 1 });
    R.DL(8, -91, 12, -91.4, '#1e1410');
    R.P([[-7, -112], [-3, -120], [6, -121], [11, -116], [12, -108], [-8, -108]], STR, R.pat({ g: 'crown', side: .6, alts: [T('#b89840')], alt: (x, y) => (mod(Math.round(x + y), 3) === 0 ? 0 : -1) }));
    R.P([[-20, -108], [-8, -111], [10, -111], [24, -106], [20, -103], [24, -100.6], [16, -101.6], [12, -99.4], [6, -102], [0, -100], [-6, -102.4], [-12, -100], [-18, -103]], STR, R.pat({ g: 'brim', cl: 6, alts: [T('#b89840')], alt: (x, y) => (mod(Math.round(x - y), 3) === 0 ? 0 : -1) }));
    R.stamp(16, -104, ['..', 'x.'], { x: '#3a3016' });
    R.pop();
  }
  function cat(R, s) { catAt(R, -14, -122.4, 1, R2 => catPoster(R2, { sw: s.sw, cblink: s.cblink })); }
  return {
    title: '산사람', hero: '구부정한 큰 몸 · 해진 밀짚모자 · 흘러내린 머리와 가슴까지 오는 수염 · 어깨 털가죽 · 새끼줄 허리띠', gun: '지게 짐에 묶은 소총', knife: '나무 칼집의 큰 칼', catPos: '지게 장작 위에 앉음', body: '구부정',
    point: '산에서 사는 사람, 지게 꼭대기가 솔의 전망대', bg: '#6c7a3a', tint, ox: 84, oy: 152, sc: .92, shadows: [[80, 150, 28, 3.2]],
    swatch: ['#6c7a3a', '#c8b48a', '#d8b860', '#4a3a2e', '#9a7044'],
    layers: s => [{ fn: R => hero(R, s) }, { fn: R => cat(R, s) }],
    back(pb, s) { for (let i = 0; i < 7; i++) { const x = mod(hash1(i + 12) * 170 - s.t * 14, 170) - 5, y = mod(hash1(i + 52) * 170 + s.t * 22, 170) - 5; polyAt(pb, x, y, s.t * TAU * .4 + i, 1, [[0, -2.6], [1.6, 0], [0, 2.6], [-1.6, 0]], i % 2 ? '#8a9a4a' : '#c8a040'); } },
  };
})());

/* ---------- 프레임 ---------- */
function hcFrame(i, f, mini) {
  const D = HCD[i], s = edState(f), W = mini ? 80 : 160, out = new PB(W, W);
  if (mini) out.d.fill(C('#6e5a40'));
  else { out.d.fill(C(D.bg)); if (D.back) D.back(out, s); }
  const k = mini ? .47 : 1, ox = mini ? 40 + (D.ox - 80) * .47 : D.ox, oy = mini ? 75 : D.oy;
  const shc = mini ? '#4a3c2c' : mix(D.bg, D.tint, .45);
  for (const e of D.shadows || []) out.ellipse(mini ? 40 + (e[0] - 80) * k : e[0], mini ? 75 : e[1], e[2] * k, Math.max(1, e[3] * k), shc);
  const chr = new PB(W, W);
  let n = 0;
  for (const L of D.layers(s)) {
    const pb = hiBake(W, W, ox, oy, R => { R.scl((D.sc || 1) * k); L.fn(R); }, ED);
    if (n++ && L.cast !== false) pbCast(chr, pb, mini ? '#2a2018' : D.tint, .42);
    pbOver(chr, pb);
  }
  pbOver(out, chr);
  if (D.front && !mini) D.front(out, s);
  grain(out, .045, i * 37 + 11);
  return out;
}
