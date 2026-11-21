'use strict';
/* =========================================================
   에디토리얼 캐리커처 픽셀 시안 10종 · 주인공 + 고양이
   과장된 몸 · 면 색 + 그림자 한 톤 · 강한 단색 배경 · 종이 질감 · 시큰둥한 표정
   캔버스 160×160, 원점은 주인공 발 가운데 (위쪽이 -y), 얼굴은 오른쪽을 향한 3/4 각도
   ========================================================= */
const EW = 160, EH = 160, ED_F = 16;
function lum(h) { const c = rgbOf(h); return c[0] * .3 + c[1] * .59 + c[2] * .11; }
// 팔레트: 면 색 → [그림자, 면] 또는 [그림자, 면, 빛]. 그림자는 배경과 어울리게 tint 쪽으로 기울임
function edPal(tint) {
  return (b, hl) => {
    let s = mix(mix(b, tint, .34), '#170d1a', .2);
    if (lum(s) > lum(b) * .84) s = mix(b, '#0d0811', .34);
    return hl ? [s, b, mix(b, '#fff7e6', hl)] : [s, b];
  };
}
/* 도장 (화면 픽셀 단위): L 선, P 눈동자, w 흰자/반짝, I 홍채 */
const EYE = {
  lid: ['LLLL', '.wP.'], lidS: ['LLL', 'wP.'],                // 시큰둥 (가까운 눈 / 먼 눈)
  happy: ['.L.', 'L.L'], arch: ['.LL.', 'L..L'], shut: ['LLL'], dot: ['P', 'P'],
  round: ['.LL.', 'LwPL', 'LPPL', '.LL.'], roundS: ['LL.', 'wPL', 'PPL'],
  roundL: ['.LLL.', 'LwwPL', 'LwPPL', 'LPPPL', 'LPPIL', '.LLL.'], roundLS: ['.LL.', 'LwPL', 'LPPL', 'LPIL', '.LL.'],
  cLid: ['LLL', 'IPI'], cLidS: ['LL', 'IP'], cShut: ['LL'], cHappy: ['.L.', 'L.L'],
  cGrumpL: ['L..', '.LL', 'IPI'], cGrumpR: ['..L', 'LL.', 'IPI'],
  cUp: ['.wP', 'IPP', 'III'], cXL: ['wI', 'IP'], cXR: ['wI', 'PI'],
};
function eye(R, x, y, kind, iris) { const rows = EYE[kind]; R.stamp(x, y, rows, { L: INK, P: '#1b1214', w: '#fffaf0', I: iris || '#1b1214' }, rows[0].length >> 1, 0); }
const MOUTH = { flat: ['MM'], smile: ['M..M', '.MM.'], smileS: ['M.M', '.M.'], o: ['MM', 'MM'], smirk: ['..M', 'MM.'], grin: ['M...M', '.MMM.'], frown: ['.M.', 'M.M'], cat: ['M.M'] };
function mouth(R, x, y, kind, col) { const rows = MOUTH[kind]; R.stamp(x, y, rows, { M: col || INK }, rows[0].length >> 1, 0); }
// 고양이 앞얼굴: 눈 · 코 · 입 · 수염
function catFace(R, x, y, o) {
  const sp = o.sp ?? 2.6;
  if (o.blink) { eye(R, x - sp, y + 1, 'cShut'); eye(R, x + sp, y + 1, 'cShut'); }
  else { eye(R, x - sp, y, o.eyesL || o.eyes || 'cLid', o.iris); eye(R, x + sp, y, o.eyesR || o.eyes || 'cLid', o.iris2 || o.iris); }
  const ny = y + (o.ny ?? 2.4);
  R.stamp(x, ny, ['N'], { N: o.nose || '#e8828a' });
  if (o.mouth !== false) mouth(R, x, ny + 1, o.mouth || 'cat', o.mcol || INK);
  if (o.whisk !== false) {
    const wc = o.wc || '#fff6e8', wl = o.wl ?? 5, a = x - sp - 1.6, b = x + sp + 1.6;
    R.W(a, ny, a - wl, ny - 1, wc); R.W(a, ny + 1, a - wl + .6, ny + 2, wc); R.W(b, ny, b + wl, ny - 1, wc); R.W(b, ny + 1, b + wl - .6, ny + 2, wc);
  }
}
// 피부는 배경색과 상관없이 따뜻한 그림자 · 얼굴은 거의 밝게 (그림자는 가장자리만)
const skinPal = b => [mix(b, '#b0524a', .36), b];
const FACE = { g: 'face', lt: [-.1, .95], rs: 0 };
// 무늬: [x, y, rx, ry, 색번호] 타원 목록
function blobs(list) { return (x, y) => { for (const b of list) { const dx = (x - b[0]) / b[2], dy = (y - b[1]) / b[3]; if (dx * dx + dy * dy <= 1) return b[4]; } return -1; }; }
const mod = (a, n) => ((a % n) + n) % n;
// 배경 장식용: 로컬 좌표를 돌려 찍는 다각형
function polyAt(pb, x, y, a, s, pts, col) { const c = Math.cos(a), sn = Math.sin(a); pb.poly(pts.map(p => [x + (p[0] * c - p[1] * sn) * s, y + (p[0] * sn + p[1] * c) * s]), col); }
function star4(pb, x, y, col, big) { pb.px(x, y, col); pb.px(x - 1, y, col); pb.px(x + 1, y, col); pb.px(x, y - 1, col); pb.px(x, y + 1, col); if (big) { pb.px(x - 2, y, col); pb.px(x + 2, y, col); pb.px(x, y - 2, col); pb.px(x, y + 2, col); } }
function bowLine(R, cx, y0, w, sag, col) { let px = cx - w, py = y0; for (let i = 1; i <= 8; i++) { const x = cx - w + 2 * w * i / 8, u = (x - cx) / w, y = y0 + sag * (1 - u * u); R.DL(px, py, x, y, col); px = x; py = y; } }

const ED_DESIGNS = [];

/* ── 1. 은행나무 약초꾼 & 보리 : 키다리 + 공처럼 동글한 치즈냥 (어깨 위) ── */
ED_DESIGNS.push((() => {
  const tint = '#9a2620', T = edPal(tint);
  const SK = skinPal('#f2c79c'), HA = T('#1d4a55'), SH = T('#f2e0bb'), SC = T('#eaa52e'), PA = T('#2c4a3c'), BO = T('#3a2420'), BG = T('#8c4a2b'), WD = T('#c88e4e'), MESH = T('#f6ead0'), MESHD = T('#d6c095');
  const CF = T('#f0973a'), CW = T('#fbf0da'), CS = T('#c25d1c'), EAR = T('#f2a2a2');
  const meshAlt = (cx, cy) => (x, y) => { const u = Math.round(x - cx), v = Math.round(y - cy); return (mod(u + v, 3) === 0 || mod(u - v, 3) === 0) ? 0 : -1; };
  function net(R, hx, hy) {
    R.K2(hx + 1.2, hy - 49, hx - .4, hy + 22, 1.05, 1.05, WD, { g: 'netH', ol: 1 });
    const rx = hx + 3.4, ry = hy - 57;
    R.P([[rx - 5.4, ry + 2.4], [rx + 6, ry + 1.6], [rx + 3.6, ry + 9.4], [rx + .6, ry + 12.6], [rx - 2.6, ry + 9.8]], MESH, R.pat({ g: 'netBag', flat: 1, alts: [MESHD], alt: meshAlt(rx, ry) }));
    R.E(rx, ry, 6.6, 7.6, .25, BG, { g: 'netR' });
    R.E(rx, ry, 5.2, 6.2, .25, MESH, R.pat({ g: 'netM', flat: 1, cast: 0, alts: [MESHD], alt: meshAlt(rx, ry) }));
  }
  function hero(R, s) {
    R.chain([[3, -45], [4, -24], [5, -5]], [2.5, 2.2, 2], PA, { g: 'legF' });
    R.P([[2.2, -5.6], [7.4, -6.4], [12.8, -3.6], [13.2, -1.2], [11, .2], [2.6, .2]], BO, { g: 'shoeF' });
    R.chain([[-2, -45], [-2.6, -24], [-2.2, -5]], [2.7, 2.4, 2.2], PA, { g: 'legN', ol: 1 });
    R.P([[-5.6, -5.6], [.8, -6.4], [7.2, -3.4], [7.6, -1.2], [5.6, .2], [-5.6, .2]], BO, { g: 'shoeN', ol: 1 });
    R.push(); R.translate(0, s.by);
    const fl = s.sw * 1.4;   // 바람에 날리는 목도리 끝 (몸 뒤, 오른쪽으로)
    R.P([[2, -73], [9, -73.4 + fl * .3], [16, -72 + fl * .6], [23, -71.4 + fl], [27.4, -67.4 + fl], [22, -67.6 + fl * .8], [15, -68.4 + fl * .5], [6, -69.2]], SC, { g: 'scarfB' });
    R.chain([[4.2, -69], [9.6, -59], [12.4, -50.4]], [2.2, 2, 1.8], SH, { g: 'armF' });
    net(R, 13.4, -50);
    R.E(12.8, -49.4, 2.3, 2.2, 0, SK, { g: 'handF', ol: 1 });
    R.P([[-6.8, -47], [5.6, -47], [6.2, -40], [-7.2, -40]], PA, { g: 'hip' });
    R.P([[-7.6, -70.6], [5.6, -70.6], [6.8, -58], [5.4, -46.4], [-6.6, -46.4], [-8.4, -58]], SH, { g: 'torso', side: .6 });
    R.DL(-6.6, -46.6, 5.4, -46.6, INK);
    R.K2(-6.2, -69.4, 6.6, -47.4, .9, .9, BG, { g: 'strap', ol: 1 });
    R.B(8.8, -43.4, 7.4, 6.8, 0, BG, { g: 'bag', ol: 1 });
    R.P([[5, -47], [12.6, -47], [12.4, -43], [5.2, -43]], BG, { g: 'flap', ol: 1, flat: 0 });
    R.stamp(8.8, -43, ['y'], { y: '#f2c94a' });
    R.K2(0, -70, .6, -77.6, 2, 1.9, SK, { g: 'neck' });
    R.E(-.6, -71.4, 7.4, 3.1, -.06, SC, { g: 'scarf', ol: 1 });
    R.P([[.6, -70.4], [5.2, -70], [4.8, -55.4], [1, -56.4]], SC, { g: 'scarfF', ol: 1 });
    R.stamp(3, -55, ['L.L', '.L.'], { L: SC[0] });
    R.chain([[-7, -68.6], [-9.2, -56.4], [-6.6, -47]], [2.4, 2.1, 1.9], SH, { g: 'armN', ol: 1 });
    R.DL(-8.4, -46.4, -5, -46.4, INK);
    // 머리: 길쭉한 얼굴 · 큰 코 · 부스스한 머리
    const hx = 1, hy = -85;
    R.P([[-7, -79], [-8.6, -86], [-7.4, -92.4], [-3.6, -96.6], [1.6, -97.6], [6.4, -95.8], [8.8, -91.8], [9, -87], [5, -88.8], [1, -88.2], [-2.2, -86.2], [-3.4, -81], [-5.4, -78]], HA, { g: 'hairB' });
    R.P([[-7.6, -90.4], [-12, -92], [-8.2, -94]], HA, { g: 'hairB' });
    R.P([[-5, -95.6], [-7.4, -100], [-2, -97]], HA, { g: 'hairB' });
    R.E(hx, hy, 6.2, 8, 0, SK, FACE);
    R.E(-2.8, hy + .8, 1.7, 2.5, 0, SK, { g: 'ear', ol: 1 });
    R.P([[-3.4, -90.4], [0, -94], [5, -94.4], [8.8, -91.8], [9.4, -87.2], [7.6, -89.6], [4.2, -88.6], [1, -89.8], [-1.6, -88.4]], HA, { g: 'bang', cl: 1 });
    R.P([[5, -85.6], [12.4, -80], [11.6, -78.8], [6.2, -79]], SK, { g: 'nose', flat: 1 });
    R.DL(5, -85, 5.8, -80.2, SK[0]);
    if (s.blink) { eye(R, hx, hy, 'shut'); eye(R, 6.2, hy - .2, 'shut'); }
    else { eye(R, hx, hy - 1, 'lid'); eye(R, 6.2, hy - 1.2, 'lidS'); }
    R.DL(-1.2, hy - 2.8, 2.2, hy - 3, INK); R.DL(5, hy - 3, 6.8, hy - 2.8, INK);
    mouth(R, 6, hy + 7, 'flat');
    R.pop();
  }
  function cat(R, s) {
    R.push(); R.translate(-2.8, s.by + .6);   // 얼굴을 가리지 않게 어깨 바깥쪽으로
    const sw = s.sw;
    R.chain([[-13.6, -71.6], [-16.4, -66.6], [-16.4, -61.4], [-14.8 + sw * .5, -57.6], [-12.4 + sw, -57.4]], [1.9, 1.8, 1.6, 1.4, 1.2], CF, R.pat({ g: 'cTail', alts: [CS], alt: (x, y, t) => (t > .4 && t < .72) ? 0 : -1 }));
    R.E(-9.4, -74.6, 6.8, 6.2, 0, CF, R.pat({ g: 'cBody', alts: [CS], alt: (x, y) => { const dx = x + 9.4, dy = y + 74.6; return (Math.abs(dx) > 3 && mod(dy - Math.abs(dx) * .4, 3.4) < 1.2) ? 0 : -1; } }));
    R.E(-8, -72.6, 3.8, 3.8, 0, CW, { g: 'cBelly' });
    R.E(-6.2, -68.8, 1.9, 1.3, 0, CW, { g: 'cPaw1', ol: 1 }); R.E(-10.4, -68.6, 1.9, 1.3, 0, CW, { g: 'cPaw2', ol: 1 });
    const hx = -11.8, hy = -83;
    R.P([[hx - 5, hy - 1], [hx - 4.4, hy - 7.6], [hx - 1, hy - 3.8]], CF, { g: 'cEar' });
    R.P([[hx + 4.8, hy - 1.6], [hx + 4.6, hy - 8], [hx + 1, hy - 4]], CF, { g: 'cEar' });
    R.P([[hx - 4, hy - 2.4], [hx - 3.8, hy - 6], [hx - 2, hy - 3.8]], EAR, { g: 'cEarIn', flat: 1, cast: 0 });
    R.P([[hx + 3.8, hy - 2.6], [hx + 3.8, hy - 6.4], [hx + 2, hy - 4]], EAR, { g: 'cEarIn', flat: 1, cast: 0 });
    R.E(hx, hy, 5.8, 5, 0, CF, R.pat({ g: 'cHead', alts: [CS], alt: (x, y) => { const dx = x - hx, dy = y - hy; return (dy < -2.2 && dy > -5 && (Math.abs(dx) < .6 || Math.abs(Math.abs(dx) - 2) < .5)) || (Math.abs(dx) > 4.2 && Math.abs(dy - .8) < .6) ? 0 : -1; } }));
    R.E(hx + .4, hy + 2.4, 3, 1.8, 0, CW, { g: 'cMuz' });
    catFace(R, hx + .4, hy - .4, { eyes: s.cblink ? 'cShut' : 'cHappy', sp: 2.4, ny: 2, wl: 2.6 });
    R.pop();
  }
  function leaf(pb, x, y, a) { polyAt(pb, x, y, a, 1, [[0, 0], [-3.4, -3.6], [-2.4, -5.4], [-.4, -5.8], [0, -4.6], [.4, -5.8], [2.4, -5.4], [3.4, -3.6]], '#f4c63a'); polyAt(pb, x, y, a, 1, [[-.4, 0], [.4, 0], [.4, 2.6], [-.4, 2.6]], '#b8862a'); }
  return {
    title: '은행나무 약초꾼', hero: '키다리 약초꾼 · 바람에 날리는 긴 목도리 · 잠자리채', catName: '보리', catDesc: '공처럼 동글한 치즈 태비', carry: '어깨 위', body: '키다리',
    point: '길쭉한 사람과 공 같은 고양이의 대비', bg: '#e0502f', tint, ox: 74, oy: 150, sc: 1.08, shadows: [[82, 150, 23, 3.2]],
    swatch: ['#e0502f', '#1d4a55', '#f2e0bb', '#eaa52e', '#f0973a'],
    layers: s => [{ fn: R => hero(R, s) }, { fn: R => cat(R, s) }],
    back: (pb, s) => { const L = [[22, 30, .6], [128, 18, -.4], [140, 96, 1.1], [16, 108, -.9], [112, 132, .3]]; L.forEach((l, i) => leaf(pb, l[0] + Math.sin((s.t + i * .2) * TAU) * 2, mod(l[1] + s.t * 24 + i * 7, 170) - 6, l[2] + s.t * TAU * .25)); },
  };
})());

/* ── 2. 한복 마을지기 & 설기 : 종 모양 치마 + 목이 긴 흰 고양이 (나란히) ── */
ED_DESIGNS.push((() => {
  const tint = '#0e3c48', T = edPal(tint);
  const SK = skinPal('#f3caa4'), HA = T('#1d1a28'), JE = T('#f4d27a'), CH = T('#d4392f'), GO = T('#7b2d5c'), WH = T('#fbf6ea'), SHO = T('#f8e6ee');
  const BANDS = ['#e8473a', '#f4d050', '#4caf6a', '#3f7fd0', '#f08fb0'].map(c => T(c));
  const FR = T('#d8392f'), FB = T('#2f5fb0'), FY = T('#f2c94a'), FH = T('#8a5a32'), DG = T('#d8392f');
  const CW = ['#c3cde0', '#f7f3ec'], CEAR = T('#f2a6b4'), CRB = T('#f07aa0'), BELL = T('#f2c94a', .4);
  function fan(R, hx, hy) {
    R.K2(hx, hy, hx + 2.4, hy - 5.6, .9, .9, FH, { g: 'fanH', ol: 1 });
    const cx = hx + 4, cy = hy - 10.2, r = 6.6, ca = Math.cos(-.6), sa = Math.sin(-.6);
    R.E(cx, cy, r, r, 0, FR, R.pat({ g: 'fan', flat: 1, alts: [FB, FY], alt: (x, y) => {
      const ux = x - cx, uy = y - cy, dx = ux * ca - uy * sa, dy = ux * sa + uy * ca, dd = Math.hypot(dx, dy);
      if (dd > r - 1.1) return 1;
      const a = Math.hypot(dx + r / 2, dy) < r / 2, b = Math.hypot(dx - r / 2, dy) < r / 2;
      return a ? -1 : b ? 0 : (dy < 0 ? -1 : 0);
    } }));
  }
  function hero(R, s) {
    R.P([[-8.4, -2.8], [-2.8, -3.2], [-.2, -1.8], [.6, -2.8], [.4, -.6], [-1, .2], [-8, .2]], SHO, { g: 'shoeN', ol: 1 });
    R.P([[2.6, -3], [7.6, -2.8], [10.2, -1.6], [11, -2.6], [10.8, -.4], [9.4, .2], [3, .2]], SHO, { g: 'shoeF' });
    R.stamp(-4, -2, ['r'], { r: '#d8392f' }); R.stamp(6, -2, ['r'], { r: '#d8392f' });
    R.push(); R.translate(0, s.by);
    const fl = s.sw;
    // 땋은 머리 + 댕기 (몸 뒤)
    R.chain([[-5, -66], [-8, -60], [-10.6 + fl * .3, -52], [-11.8 + fl * .6, -45], [-11.4 + fl, -40]], [2.2, 2.1, 1.9, 1.7, 1.5], HA, R.pat({ g: 'braid', tex: (x, y) => (mod(Math.round(y * .8 + x * .5), 3) === 0 ? -1 : 0) }));
    R.P([[-13.8 + fl, -40.4], [-9.2 + fl, -41], [-8.4 + fl, -34], [-10.8 + fl * 1.3, -35.8], [-13.6 + fl * 1.4, -33.4]], DG, { g: 'daenggi', ol: 1 });
    // 먼 팔 + 태극선
    R.K2(4.6, -60.4, 9.8, -55.4, 2.2, 2.3, JE, { g: 'armF' });
    R.K2(9.8, -55.4, 10.8, -63.6, 2.3, 2.3, JE, R.pat({ g: 'armF', alts: BANDS, alt: (x, y, t) => Math.min(4, Math.floor(t * 5)) }));
    fan(R, 10.8, -63.6);
    R.E(10.6, -63.2, 2, 2, 0, SK, { g: 'handF', ol: 1 });
    // 치마 (종 모양)
    R.P([[-6.6, -51], [6.2, -51], [9.4, -41], [15.4, -22], [21.4, -6], [22.4, -3], [17, -1.4], [6, -.8], [-6, -.8], [-17, -1.4], [-22.4, -3], [-21.4, -6], [-15.4, -22], [-9.4, -41]], CH, { g: 'chima', side: .64, tilt: .25 });
    for (const [a, b] of [[-3.4, -12], [-.4, -4.6], [2.6, 4.2], [5, 12.4]]) R.DL(a, -49, b, -2.4, CH[0]);
    // 저고리 · 깃 · 고름
    R.P([[-6.6, -62.6], [5.4, -62.6], [6.8, -50.6], [-7.8, -50.6]], JE, { g: 'jeo', side: .64, ol: 2 });
    R.P([[-2.8, -62.8], [-.8, -62.8], [4.8, -55.4], [3.6, -54.2]], WH, { g: 'git', ol: 1, flat: 1 });
    R.chain([[4.6, -54.4], [5.4, -47], [5.8, -39]], [1.1, 1, .9], GO, { g: 'gor', ol: 1 });
    R.chain([[5, -54.4], [7.4, -48], [8.6, -42]], [1.1, 1, .9], GO, { g: 'gor', ol: 1 });
    R.P([[3, -56.2], [6.6, -57.8], [7, -54.2], [4, -54]], GO, { g: 'gorK', ol: 1 });
    // 가까운 팔 (색동 소매) → 손을 치마 앞에
    R.K2(-6.8, -61, -9.6, -53.4, 2.4, 2.4, JE, { g: 'armN', ol: 1 });
    R.K2(-9.6, -53.4, -5.4, -49.8, 2.4, 2.2, JE, R.pat({ g: 'armN', ol: 1, alts: BANDS, alt: (x, y, t) => Math.min(4, Math.floor(t * 5)) }));
    R.E(-5, -49.4, 1.9, 1.9, 0, SK, { g: 'handN', ol: 1 });
    // 머리
    R.K2(0, -62, .4, -65.4, 1.8, 1.7, SK, { g: 'neck' });
    const hx = 1, hy = -70.6;
    // 뒷머리 (뒤통수 · 목덜미까지 매끈하게) → 얼굴 → 가르마 탄 앞머리
    R.P([[-5.4, -64.2], [-7.6, -70], [-6.6, -75.4], [-2.8, -78.8], [2.6, -79.2], [6.6, -77], [8, -72.6], [6.4, -73.6], [2, -74], [-2.2, -72.2], [-3.8, -68.4], [-4, -64.6]], HA, { g: 'hairB' });
    R.E(hx, hy, 6.4, 6.6, 0, SK, FACE);
    R.E(-2.4, hy + 1.2, 1.5, 2.2, 0, SK, { g: 'ear', ol: 1 });
    R.P([[-4.6, -71.4], [-4.2, -75.2], [-1, -78.2], [2.2, -78.8], [2.6, -76.4], [1, -75.4], [-1.6, -73.8], [-3.2, -71.4]], HA, { g: 'bang', cl: 1 });
    R.P([[3, -78.8], [6.4, -77.2], [7.8, -73.2], [7, -72.4], [5.2, -74.8], [3.2, -75.8]], HA, { g: 'bang', cl: 1 });
    R.DL(-3, -75.4, 0, -77.4, '#4a4a66'); R.DL(4.4, -77.4, 6.4, -75.6, '#4a4a66');
    R.P([[6, -70], [8.6, -67.4], [6.2, -66.8]], SK, { g: 'nose', ol: 2, flat: 1 });
    if (s.blink) { eye(R, hx, hy, 'shut'); eye(R, 5.2, hy - .2, 'shut'); } else { eye(R, hx, hy - .6, 'happy'); eye(R, 5.2, hy - .8, 'happy'); }
    R.stamp(.6, hy + 2.6, ['bb'], { b: '#f08a8a' });
    mouth(R, 4.8, hy + 4.4, 'smileS');
    R.stamp(-3.4, -76.4, ['.p.', 'pyp', '.p.'], { p: '#f59ab8', y: '#f2c94a' }, 1, 1);
    R.pop();
  }
  function cat(R, s) {
    const sw = s.sw;
    R.chain([[-4.6, -3.6], [-10.4, -2.6], [-13.6, -7], [-13, -13.6], [-10.6 + sw * .4, -16.6], [-8.4 + sw, -15.4]], [1.7, 1.6, 1.5, 1.4, 1.2, 1], CW, { g: 'cTail' });
    R.E(-1.4, -5.4, 6.6, 5.4, 0, CW, { g: 'cHip' });
    R.E(2.6, -1.2, 3, 1.4, 0, CW, { g: 'cFoot', ol: 2 });
    R.E(2.4, -13, 4.4, 7.6, -.1, CW, { g: 'cChest' });
    R.K2(3, -17, 4.8, -29.4, 3.2, 2.6, CW, { g: 'cChest' });
    R.K2(2.6, -10, 2.2, -1.4, 1.4, 1.3, CW, { g: 'cLegF' });
    R.K2(5.4, -10, 6.2, -1.4, 1.5, 1.3, CW, { g: 'cLegN', ol: 1 });
    R.E(4.6, -26.4, 3.2, 1.2, -.2, CRB, { g: 'cCollar', ol: 1 });
    R.E(5.4, -24.6, 1.3, 1.3, 0, BELL, { g: 'cBell', ol: 1 });
    const hx = 5.6, hy = -33.4;
    R.P([[hx - 4.6, hy - 1], [hx - 3.8, hy - 10.4], [hx - .6, hy - 3.6]], CW, { g: 'cEar' });
    R.P([[hx + .2, hy - 3.8], [hx + 3.6, hy - 10.8], [hx + 4.4, hy - 1.6]], CW, { g: 'cEar' });
    R.P([[hx - 3.8, hy - 2.4], [hx - 3.2, hy - 7.6], [hx - 1.6, hy - 3.6]], CEAR, { g: 'cEarIn', flat: 1, cast: 0 });
    R.P([[hx + 1.2, hy - 3.8], [hx + 3.4, hy - 8], [hx + 3.6, hy - 2.6]], CEAR, { g: 'cEarIn', flat: 1, cast: 0 });
    R.E(hx, hy, 4.6, 4, 0, CW, { g: 'cHead' });
    R.P([[hx + 2, hy - .6], [hx + 6.6, hy + 1.6], [hx + 2.6, hy + 2.8]], CW, { g: 'cSnout' });
    if (s.cblink) { eye(R, hx - .6, hy, 'cShut'); eye(R, hx + 2.8, hy - .2, 'cShut'); }
    else { eye(R, hx - .6, hy - .8, 'cLid', '#4aa8e8'); eye(R, hx + 2.8, hy - 1, 'cLidS', '#e8b830'); }
    R.stamp(hx + 6, hy + 1, ['N'], { N: '#e8828a' });
    R.W(hx + 4, hy + 2, hx + 9, hy + 1, '#fffaf2'); R.W(hx + 4, hy + 2.8, hx + 8.6, hy + 3.6, '#fffaf2');
  }
  function petal(pb, x, y, a) { polyAt(pb, x, y, a, 1, [[0, -2], [1.6, -.6], [1, 1.4], [-1, 1.4], [-1.6, -.6]], '#f7b4c6'); pb.px(x, y, '#e889a6'); }
  return {
    title: '한복 마을지기', hero: '종 모양 다홍치마 · 색동 소매 · 태극선 부채 · 댕기머리', catName: '설기', catDesc: '목이 긴 흰 고양이 (짝짝이 눈)', carry: '나란히 걷기', body: '종 모양',
    point: '조그만 머리와 커다란 치마, 우아하게 늘씬한 고양이', bg: '#2a8a84', tint, ox: 100, oy: 150, sc: 1.25, shadows: [[104, 150, 31, 3.4], [42, 150, 12, 2.4]],
    swatch: ['#2a8a84', '#d4392f', '#f4d27a', '#1d1a28', '#f7f3ec'],
    layers: s => [{ fn: R => cat(R, s), x: 40 }, { fn: R => hero(R, s), cast: false }],
    back: (pb, s) => { const P = [[30, 20], [120, 34], [146, 80], [18, 70], [70, 14], [100, 110]]; P.forEach((p, i) => petal(pb, p[0] + Math.sin((s.t * 2 + i * .3) * TAU) * 3, mod(p[1] + s.t * 30 + i * 9, 170) - 6, s.t * TAU + i)); },
  };
})());

/* ── 3. 겨울 짐꾼 & 구름 : 공처럼 둥근 패딩 + 목도리가 된 장모 고양이 ── */
ED_DESIGNS.push((() => {
  const tint = '#0f1d60', T = edPal(tint);
  const SK = skinPal('#f2c4a0'), CO = T('#f07a36'), MI = T('#efe4cc'), HAT = T('#7a4a2e'), FUR = T('#f1e6cc'), NOSE = T('#e0453c'), BOOT = T('#3a2a28'), PANT = T('#2a2a44'), BLADE = T('#d8392f'), WD = T('#c08a4a');
  const CG = T('#9aa4b4'), CL = T('#dfe3ea'), EARP = T('#e8a6b0');
  function body(R, s) {
    R.E(-7, -3, 6, 3.6, 0, BOOT, { g: 'bootN', ol: 1 }); R.E(7.6, -3, 6, 3.6, 0, BOOT, { g: 'bootF' });
    R.K2(-6.4, -12, -6.8, -5, 3.4, 3.2, PANT, { g: 'legN' }); R.K2(6.4, -12, 7, -5, 3.4, 3.2, PANT, { g: 'legF' });
    R.push(); R.translate(0, s.by);
    R.K2(23.4, -54, 25.6, -10.4, 1.2, 1.2, WD, { g: 'shH', ol: 1 });
    R.K2(20.6, -54.4, 27, -54.4, 1.1, 1.1, WD, { g: 'shT', ol: 1 });
    R.P([[19.8, -11.6], [31.4, -11.6], [30.6, -.6], [20.4, -.6]], BLADE, { g: 'shB', ol: 1, side: .62 });
    R.K2(14, -34, 21.4, -27, 3.2, 3, CO, { g: 'armF' });
    R.E(23, -26.4, 4.2, 4, 0, MI, { g: 'mitF', ol: 1 });
    R.E(0, -26, 19.6, 21, 0, CO, { g: 'ball' });
    for (const yy of [-40, -31.4, -22.6, -13.8]) { const w = 19.4 * Math.sqrt(Math.max(0, 1 - ((yy + 26) / 21) ** 2)); bowLine(R, 0, yy, w - .8, 1.8, CO[0]); }
    R.DL(3.6, -46, 4.6, -6.6, CO[0]);
    R.stamp(3.6, -40, ['y', 'y'], { y: '#e8e2d0' });
    R.K2(-14.6, -33, -21.6, -24.6, 3.4, 3.2, CO, { g: 'armN', ol: 1 });
    R.E(-23, -22.8, 4.4, 4.2, 0, MI, { g: 'mitN', ol: 1 });
    R.P([[-8.4, -46.6], [10, -46.6], [11.4, -41], [-9.6, -41]], CO, { g: 'collar', ol: 1, side: .66 });
    R.pop();
  }
  function head(R, s) {
    R.push(); R.translate(0, s.by);
    const hx = 2, hy = -46.6;
    R.E(hx, hy, 8, 7, 0, SK, FACE);
    if (s.blink) { eye(R, hx - 1.6, hy - .4, 'shut'); eye(R, hx + 3.2, hy - .6, 'shut'); } else { eye(R, hx - 1.6, hy - 1.6, 'dot'); eye(R, hx + 3.2, hy - 1.8, 'dot'); }
    R.stamp(hx - 4.6, hy + 1.4, ['bb'], { b: '#f0907e' });
    R.E(hx + 6.4, hy + .4, 2.7, 2.5, 0, NOSE, { g: 'nose', ol: 1 });
    mouth(R, hx + 2.8, hy + 3.4, 'o');
    R.E(hx - .6, hy - 11, 10.8, 7, 0, HAT, { g: 'hat', cl: 2 });
    R.E(hx - .4, hy - 6.4, 11.8, 3, 0, FUR, R.pat({ g: 'brim', cl: 1, ol: 1, tex: (x, y) => (hash2(Math.round(x), Math.round(y)) > .74 ? -1 : 0) }));
    R.E(-8.4, hy + 2, 3.4, 5.6, .08, FUR, R.pat({ g: 'flapN', ol: 1, tex: (x, y) => (hash2(Math.round(x) + 3, Math.round(y)) > .78 ? -1 : 0) }));
    R.E(hx + 10, hy + 1.6, 2.8, 5, -.1, FUR, { g: 'flapF', ol: 1 });
    R.E(hx - 1, hy - 18.6, 3.2, 3, 0, FUR, { g: 'pom', ol: 1 });
    R.pop();
  }
  function catBody(R, s) {
    R.push(); R.translate(0, s.by);
    for (const [x, y] of [[-15.6, -42.6], [-10, -46.4], [-2, -48.6], [7, -48], [14.4, -44]]) R.E(x, y, 6.2, 5, 0, CG, R.pat({ g: 'cB', alts: [CL], alt: (lx, ly) => (ly > y + 2.4 ? 0 : -1) }));
    for (const [x, y] of [[-17, -47.4], [-12, -51.4], [-5, -53.6], [3, -53.8], [10, -52.4], [16, -49]]) R.P([[x - 1.8, y + 2.4], [x, y - 1.6], [x + 1.8, y + 2.4]], CG, { g: 'cB' });
    R.K2(15.4, -41, 16, -32, 2.2, 2, CG, { g: 'cLeg', ol: 1 }); R.E(16.4, -31, 2.4, 1.6, 0, CL, { g: 'cPaw', ol: 1 });
    R.chain([[18.6, -42], [21.6, -34], [20.6 + s.sw * .6, -25], [22 + s.sw, -18]], [3.4, 3.2, 2.9, 2.4], CG, { g: 'cTail', ol: 1 });
    R.E(22 + s.sw, -17.4, 2.4, 2.2, 0, CL, { g: 'cTailTip' });
    R.pop();
  }
  function catHead(R, s) {
    R.push(); R.translate(0, s.by);
    const hx = -16.6, hy = -49.2;
    R.K2(hx - 2.6, hy + 3, hx - 3.2, hy + 11.4, 1.9, 1.7, CG, { g: 'cArmL', ol: 1 }); R.E(hx - 3.2, hy + 12.2, 2.2, 1.5, 0, CL, { g: 'cPawL', ol: 1 });
    R.K2(hx + 2.4, hy + 3, hx + 2.8, hy + 10.4, 1.9, 1.7, CG, { g: 'cArmR', ol: 1 }); R.E(hx + 2.8, hy + 11.2, 2.2, 1.5, 0, CL, { g: 'cPawR', ol: 1 });
    R.P([[hx - 5, hy - 1.6], [hx - 4, hy - 8], [hx - 1.2, hy - 3.8]], CG, { g: 'cEar' }); R.P([[hx + 1.4, hy - 3.8], [hx + 4.2, hy - 8.2], [hx + 5, hy - 1.6]], CG, { g: 'cEar' });
    R.P([[hx - 4, hy - 2.6], [hx - 3.4, hy - 6], [hx - 2, hy - 3.8]], EARP, { g: 'cEarIn', flat: 1, cast: 0 }); R.P([[hx + 2.2, hy - 3.8], [hx + 3.6, hy - 6.2], [hx + 4, hy - 2.6]], EARP, { g: 'cEarIn', flat: 1, cast: 0 });
    R.E(hx, hy, 5.8, 4.8, 0, CG, { g: 'cH' });
    R.P([[hx - 6.8, hy + 1.4], [hx - 4.4, hy - 1.4], [hx - 4.2, hy + 3.6]], CG, { g: 'cH' }); R.P([[hx + 6.8, hy + 1.4], [hx + 4.4, hy - 1.4], [hx + 4.2, hy + 3.6]], CG, { g: 'cH' });
    R.E(hx, hy + 2.2, 3.2, 2, 0, CL, { g: 'cMuz' });
    catFace(R, hx, hy - .4, { eyes: 'cShut', sp: 2.4, wl: 4, ny: 2.2 });
    R.pop();
  }
  return {
    title: '겨울 짐꾼', hero: '공처럼 동그란 패딩 · 귀덮개 털모자 · 빨간 코 · 눈삽', catName: '구름', catDesc: '목도리처럼 감긴 회색 장모', carry: '목도리', body: '공',
    point: '고양이가 그대로 목도리가 되는 겨울 짝꿍', bg: '#3155b5', tint, ox: 76, oy: 148, sc: 1.4, shadows: [[84, 148, 36, 4]],
    swatch: ['#3155b5', '#f07a36', '#efe4cc', '#7a4a2e', '#9aa4b4'],
    layers: s => [{ fn: R => body(R, s) }, { fn: R => catBody(R, s) }, { fn: R => head(R, s) }, { fn: R => catHead(R, s) }],
    back: (pb, s) => { for (let i = 0; i < 22; i++) { const x = mod(hash1(i) * 160 + Math.sin((s.t + i * .13) * TAU) * 3, 160), y = mod(hash1(i + 50) * 160 + s.t * 40, 164) - 2; if (i % 4 === 0) star4(pb, x | 0, y | 0, '#e8eefc'); else pb.px(x, y, '#dfe8fb'); } },
  };
})());

/* ── 4. 견습 마녀 & 먹물 : 몸보다 큰 고깔모자 + 챙 위에 앉은 날씬한 검은 고양이 ── */
ED_DESIGNS.push((() => {
  const tint = '#83440f', T = edPal(tint);
  const SK = skinPal('#f6d0ae'), HA = T('#e0702e'), RO = T('#2f2348'), HAT = T('#6b3da0'), BAND = T('#f2c94a'), BOOT = T('#7a2a2a'), WD = T('#8a5a32'), BR = T('#c99a3a'), BRD = T('#9a7428'), COL = T('#f6efe2'), BRT = T('#d8392f'), PATCH = T('#55308a');
  const CK = ['#100d14', '#26222e', '#4a4458'], CKIN = T('#7a4a6e');
  function hero(R, s) {
    R.P([[-6.6, -3.2], [-1, -3.8], [3.2, -2.4], [4.6, -4.4], [4.4, -.6], [2.6, .2], [-6.6, .2]], BOOT, { g: 'bootN', ol: 1 });
    R.P([[1.8, -3.2], [6.6, -3.6], [10.6, -2.6], [12.4, -4.6], [12.2, -.6], [10.4, .2], [1.8, .2]], BOOT, { g: 'bootF' });
    R.K2(17.4, -63, 19.6, -15, 1.1, 1.1, WD, { g: 'brH', ol: 1 });
    R.P([[15.4, -17.6], [23.4, -17.6], [27.4, -3.4], [24.6, .2], [13.6, .2], [12.2, -3.4]], BR, R.pat({ g: 'brB', ol: 1, side: .62, alts: [BRD], alt: (x, y) => (mod(Math.round(x * 1.2 - y * .25), 3) === 0 ? 0 : -1) }));
    R.B(19.4, -17, 8.6, 2.6, 0, BRT, { g: 'brT', ol: 1 });
    R.push(); R.translate(0, s.by);
    R.P([[-6.4, -52], [-8.2, -44], [-9, -34], [-8.2, -27], [-4.4, -29], [-3.8, -38], [-2.2, -46]], HA, { g: 'hairB' });
    R.chain([[4.4, -38.6], [10, -31.6], [16.2, -38.8]], [2, 2.6, 3.4], RO, { g: 'armF' });
    R.E(17.2, -40.2, 1.9, 1.9, 0, SK, { g: 'handF', ol: 1 });
    R.P([[-6.2, -40.6], [5.2, -40.6], [8.4, -30], [12.8, -12], [15.2, -3.2], [12, -1.4], [-12, -1.4], [-15.2, -3.2], [-12.8, -12], [-8.4, -30]], RO, { g: 'robe', side: .62, tilt: .2 });
    R.E(-1.8, -40.4, 3, 1.8, .2, COL, { g: 'col', ol: 1 }); R.E(3.2, -40.4, 2.8, 1.7, -.2, COL, { g: 'col', ol: 1 });
    R.stamp(.8, -38.6, ['y'], { y: '#f2c94a' });
    R.chain([[-6.4, -39], [-8.8, -30.4], [-8, -21]], [2.2, 2.8, 4], RO, { g: 'armN', ol: 1 });
    R.K2(.6, -41, 1, -44.4, 1.6, 1.6, SK, { g: 'neck' });
    const hx = 1, hy = -48.6;
    R.E(hx, hy, 6, 6.4, 0, SK, FACE);
    R.E(-2.4, hy + 1, 1.4, 2, 0, SK, { g: 'ear', ol: 1 });
    R.P([[-5.8, -53.6], [7.6, -53.6], [7.6, -49.8], [5, -50.6], [2, -49.6], [-1, -50.6], [-3.6, -49.8], [-5.6, -50.6]], HA, { g: 'bang', cl: 1 });
    R.P([[-6, -52], [-3.6, -52], [-4, -44], [-6.4, -45]], HA, { g: 'side', ol: 2 });
    R.P([[5.8, -48.2], [9.2, -45.2], [6.4, -44.8]], SK, { g: 'nose', ol: 2, flat: 1 });
    if (s.blink) { eye(R, hx + .4, hy, 'shut'); eye(R, 5.4, hy - .2, 'shut'); } else { eye(R, hx + .4, hy - .8, 'lid'); eye(R, 5.4, hy - 1, 'lidS'); }
    R.stamp(-1, hy + 2.2, ['f.f', '.f.'], { f: '#c97a5a' });
    mouth(R, 4.8, hy + 4.4, 'flat');
    // 고깔모자: 원뿔 → 띠 → 챙(앞)
    R.P([[-7, -55.4], [9.4, -55.4], [8, -66], [6.6, -78], [9.6, -89], [15.6, -96.4], [12.4, -97.6], [4, -89.4], [.4, -77.4], [-3.6, -65.4]], HAT, { g: 'cone', side: .58 });
    R.P([[-7.4, -58.8], [9.2, -58.8], [9.4, -55.4], [-7.6, -55.4]], BAND, { g: 'band', ol: 1 });
    R.stamp(2.4, -57.6, ['.s.', 'sss', '.s.'], { s: '#fff2c8' }, 1, 1);
    R.E(1.4, -54.4, 18, 4.2, -.04, HAT, { g: 'brim', cl: 2 });
    R.pop();
  }
  function cat(R, s) {
    R.push(); R.translate(0, s.by);
    const sw = s.sw;
    R.chain([[-14.6, -58], [-17.6, -55.6], [-18.4, -50], [-17 + sw * .6, -45], [-15 + sw, -44]], [1.4, 1.3, 1.2, 1.1, 1], CK, { g: 'cTail' });
    R.E(-12.8, -60.4, 4.2, 3.4, 0, CK, { g: 'cHip' });
    R.E(-10.2, -64, 3, 5, -.15, CK, { g: 'cChest' });
    R.K2(-9.6, -66, -8.6, -72, 2.4, 2, CK, { g: 'cChest' });
    R.K2(-10.6, -62, -11, -57.8, 1, .9, CK, { g: 'cLegF' }); R.K2(-8.6, -62, -8.2, -57.8, 1.05, .95, CK, { g: 'cLegN', ol: 1 });
    const hx = -7.6, hy = -75;
    R.P([[hx - 4.2, hy - .8], [hx - 3.2, hy - 9.6], [hx - .6, hy - 3]], CK, { g: 'cEar' });
    R.P([[hx + .2, hy - 3.2], [hx + 3.2, hy - 9.8], [hx + 3.8, hy - .8]], CK, { g: 'cEar' });
    R.P([[hx - 3.4, hy - 1.8], [hx - 2.8, hy - 7], [hx - 1.4, hy - 3]], CKIN, { g: 'cEarIn', flat: 1, cast: 0 });
    R.P([[hx + 1, hy - 3], [hx + 2.8, hy - 7.2], [hx + 3, hy - 1.8]], CKIN, { g: 'cEarIn', flat: 1, cast: 0 });
    R.E(hx, hy, 4, 3.6, 0, CK, { g: 'cHead' });
    R.P([[hx + 1.6, hy - .4], [hx + 5.8, hy + 1.4], [hx + 2, hy + 2.6]], CK, { g: 'cSnout' });
    if (s.cblink) { eye(R, hx - .8, hy, 'cShut'); eye(R, hx + 2.4, hy - .2, 'cShut'); } else { eye(R, hx - .8, hy - .8, 'cLid', '#f2d23a'); eye(R, hx + 2.4, hy - 1, 'cLidS', '#f2d23a'); }
    R.stamp(hx + 5.2, hy + .8, ['N'], { N: '#8a5a7a' });
    R.W(hx + 4.4, hy + 2, hx + 7.4, hy + 1.4, '#b8a888');
    R.pop();
  }
  function moon(pb) { pb.ellipse(24, 26, 9, 9, '#fff2c8'); pb.ellipse(28, 23, 8, 8, '#e8ad35'); }
  return {
    title: '견습 마녀', hero: '몸보다 큰 고깔모자 · 종 모양 로브 · 말린 장화 · 빗자루', catName: '먹물', catDesc: '목이 긴 검은 고양이 (노란 눈)', carry: '모자챙 위', body: '큰 모자',
    point: '모자가 몸의 절반, 그 챙 위에서 내려다보는 고양이', bg: '#e8ad35', tint, ox: 82, oy: 150, sc: 1.15, shadows: [[90, 150, 25, 3.2]],
    swatch: ['#e8ad35', '#6b3da0', '#2f2348', '#e0702e', '#26222e'],
    layers: s => [{ fn: R => hero(R, s) }, { fn: R => cat(R, s) }],
    back: (pb, s) => { moon(pb); [[132, 20, 1], [146, 54, 0], [18, 70, 0], [120, 70, 0], [40, 46, 1], [150, 110, 0], [12, 120, 1]].forEach((p, i) => { if ((s.f + i) % 6 !== 0) star4(pb, p[0], p[1], '#fff2c8', p[2]); }); },
  };
})());

/* ── 5. 갯벌 할머니 & 삼순이 : 꼬부랑 뒷짐 할머니 + 빨간 고무대야 속 삼색이 ── */
ED_DESIGNS.push((() => {
  const tint = '#22507c', T = edPal(tint);
  const SK = skinPal('#e9b48a'), HA = T('#5a5258'), STR = T('#e7c46a'), STRD = T('#c9a24a'), RIB = T('#d8453a'), TOW = T('#f7f3ea'), SN = T('#2f3f72'), SW = T('#f3efe6'), PU = T('#5a2f6e'), PK = T('#f08ab0'), BOOT = T('#f2f2ee'), IRON = T('#6a6e78', .3), WD = T('#b07a40');
  const BA = T('#e0342e', .35), CAW = T('#fbf3e6'), CAO = T('#e9933a'), CAB = T('#2a2428'), EARP = T('#f2a2a2');
  function hero(R, s) {
    R.K2(-3, -10, -3.2, -4, 3.1, 3.2, BOOT, { g: 'bootN', ol: 1 }); R.E(-2.4, -2.8, 4.6, 2.9, 0, BOOT, { g: 'bootN', ol: 1 });
    R.K2(5.4, -10, 6, -4, 3, 3.1, BOOT, { g: 'bootF' }); R.E(6.6, -2.8, 4.6, 2.9, 0, BOOT, { g: 'bootF' });
    const flower = (x, y) => (hash2(Math.round(x * .7), Math.round(y * .7)) > .8 ? 0 : -1);
    R.K2(4.6, -23, 5.8, -9, 4.2, 3.4, PU, R.pat({ g: 'legF', alts: [PK], alt: flower }));
    R.K2(-2.4, -23, -3, -9, 4.4, 3.6, PU, R.pat({ g: 'legN', ol: 1, alts: [PK], alt: flower }));
    R.push(); R.translate(0, s.by);
    // 먼 팔 + 호미 (앞으로 축 늘어뜨림)
    R.chain([[12.4, -36.4], [16.8, -29.6], [20.4, -24]], [2.2, 2, 1.9], SN, { g: 'armF' });
    R.K2(18.6, -25.8, 23.4, -21, 1.2, 1.2, WD, { g: 'hoeH', ol: 1 });
    R.P([[22.8, -22], [26.4, -18.8], [28.2, -12.8], [25.8, -11.2], [23.6, -17.2]], IRON, { g: 'hoeB', ol: 1 });
    R.E(20.2, -23.8, 2.1, 2.1, 0, SK, { g: 'handF', ol: 1 });
    // 굽은 등 (혹처럼 둥근 윗등)
    R.P([[-7.2, -22], [6.4, -22], [11.4, -27.4], [15.4, -33.4], [14.4, -38.4], [9, -42.6], [2, -42.4], [-3.4, -38.6], [-6.8, -31]], SW, R.pat({ g: 'torso', side: .7, tilt: .3, alts: [SN], alt: (x, y) => ((Math.floor((y - x * .55) / 2.2) & 1) ? 0 : -1) }));
    R.P([[-7.8, -24.4], [6.8, -24.4], [6.4, -21.6], [-7.4, -21.6]], PU, { g: 'waist' });
    R.E(14, -37.4, 4.6, 2.2, -.5, TOW, { g: 'towel', ol: 1 });
    R.P([[15.4, -36.4], [17.8, -35.4], [17.4, -29.4], [15.4, -30]], TOW, { g: 'towel2', ol: 1 });
    // 가까운 팔: 뒷짐
    R.chain([[4.4, -40.4], [-2.2, -35.4], [-6, -28.4]], [2.3, 2.1, 1.9], SN, R.pat({ g: 'armN', ol: 1, alts: [SW], alt: (x, y) => ((Math.floor((x + y) / 2.2) & 1) ? 0 : -1) }));
    R.E(-5.6, -27.4, 2.1, 2, 0, SK, { g: 'handN', ol: 1 });
    // 머리 (등보다 앞으로 쭉) · 뽀글머리 · 밀짚모자
    const hx = 18, hy = -42;
    for (const [x, y, r] of [[12.6, -43.2, 3.2], [13.6, -39, 2.8], [11.6, -39.8, 2.4], [14.8, -45.2, 2.6]]) R.E(x, y, r, r, 0, HA, R.pat({ g: 'perm', tex: (lx, ly) => (mod(Math.round(lx * 1.3) + Math.round(ly * 1.3), 3) === 0 ? -1 : 0) }));
    R.E(hx, hy, 6.2, 6.4, 0, SK, FACE);
    R.E(hx + 6.2, hy + 1.6, 2.7, 2.5, 0, SK, { g: 'nose', ol: 1 });
    if (s.blink) { eye(R, hx - .4, hy, 'shut'); eye(R, hx + 3.6, hy - .2, 'shut'); } else { eye(R, hx - .6, hy - .8, 'arch'); eye(R, hx + 3.6, hy - 1, 'happy'); }
    R.stamp(hx - 3.6, hy - .4, ['w', '.w'], { w: SK[0] });
    R.stamp(hx + .4, hy + 2.4, ['bb'], { b: '#e88a7a' });
    mouth(R, hx + 4, hy + 4.6, 'smile');
    R.E(hx - .8, hy - 6.2, 14.2, 3.8, -.16, STR, R.pat({ g: 'hbrim', cl: 4, alts: [STRD], alt: (x, y) => (mod(Math.round(x) + Math.round(y), 4) === 0 ? 0 : -1) }));
    R.E(hx - .6, hy - 9.6, 6.8, 4.2, -.1, STR, { g: 'crown' });
    R.P([[hx - 7, hy - 8.6], [hx + 5.8, hy - 10], [hx + 6, hy - 7.8], [hx - 6.8, hy - 6.4]], RIB, { g: 'ribbon', ol: 1 });
    R.pop();
  }
  function cat(R, s) {
    R.P([[-13.2, -11.4], [13.2, -11.4], [11.4, -.8], [-11.4, -.8]], BA, { g: 'baBody', side: .66 });
    R.E(0, -11.4, 13.8, 3.4, 0, BA, { g: 'baRim', flat: 2 });
    R.E(0, -11.6, 11.8, 2.4, 0, BA, { g: 'baIn', flat: 0 });
    const cal = blobs([[3, -15, 3.2, 3, 0], [-4, -13.4, 2.8, 2.6, 1]]);
    R.E(0, -14.4, 7.4, 5, 0, CAW, R.pat({ g: 'cBody', alts: [CAO, CAB], alt: cal }));
    const hx = -.6, hy = -21.4;
    R.P([[hx - 5, hy - 1.4], [hx - 4.2, hy - 8], [hx - 1, hy - 4]], CAO, { g: 'cEar' }); R.P([[hx + 1, hy - 4], [hx + 4.4, hy - 8.2], [hx + 5, hy - 1.4]], CAB, { g: 'cEar' });
    R.P([[hx - 4, hy - 2.6], [hx - 3.6, hy - 6], [hx - 2, hy - 4]], EARP, { g: 'cEarIn', flat: 1, cast: 0 });
    R.E(hx, hy, 5.8, 5, 0, CAW, R.pat({ g: 'cHead', alts: [CAO, CAB], alt: blobs([[hx - 3.6, hy - 2.4, 3.6, 3.2, 0], [hx + 3.2, hy - 3, 3, 2.6, 1]]) }));
    if (s.cblink) catFace(R, hx, hy - .4, { blink: true, sp: 2.4, wl: 4 }); else catFace(R, hx, hy - .4, { eyes: 'cLid', iris: '#a6c63a', sp: 2.4, wl: 4 });
    R.P([[-13.8, -11.4], [13.8, -11.4], [13.2, -9.6], [6, -8.2], [-6, -8.2], [-13.2, -9.6]], BA, { g: 'baLip', flat: 2 });
    R.E(-4.4, -10.6, 2, 1.4, 0, CAW, { g: 'cPaw', ol: 1 }); R.E(3.4, -10.8, 2, 1.4, 0, CAB, { g: 'cPaw2', ol: 1 });
  }
  function crab(pb, x, y) { pb.ellipse(x, y, 3.4, 2.2, '#e0553a'); pb.ellipse(x - 4, y - 2, 1.4, 1.2, '#e0553a'); pb.ellipse(x + 4, y - 2, 1.4, 1.2, '#e0553a'); pb.px(x - 1, y - 2, INK); pb.px(x + 1, y - 2, INK); pb.line(x - 3, y + 1, x - 4, y + 2, '#c2442e'); pb.line(x + 3, y + 1, x + 4, y + 2, '#c2442e'); }
  function gull(pb, x, y) { pb.line(x - 3, y - 1, x - 1, y, '#f6f6f2'); pb.line(x, y, x + 2, y - 1, '#f6f6f2'); pb.px(x - 1, y, '#f6f6f2'); }
  return {
    title: '갯벌 할머니', hero: '꼬부랑 뒷짐 · 뽀글머리 · 밀짚모자 · 꽃무늬 몸빼 · 호미', catName: '삼순이', catDesc: '빨간 고무대야 속 삼색이', carry: '대야에 태우기', body: '꼬부랑',
    point: '한국 갯벌 감성 그대로, 웃긴데 정이 가는 조합', bg: '#79bde0', tint, ox: 98, oy: 150, sc: 1.35, shadows: [[108, 150, 25, 3.6], [44, 150, 20, 3]],
    swatch: ['#79bde0', '#e0342e', '#e7c46a', '#5a2f6e', '#e9933a'],
    layers: s => [{ fn: R => cat(R, s), x: 44 }, { fn: R => hero(R, s), cast: false }],
    back: (pb, s) => { const o = Math.round(s.sw * 2); gull(pb, 30 + o, 22); gull(pb, 44 + o, 30); gull(pb, 120 - o, 16); crab(pb, 13, 147 + ((s.f >> 2) & 1)); },
  };
})());

/* ── 6. 텃밭 정원사 & 버터 : 서양배 몸 + 머리보다 큰 털뭉치 고양이 (머리 위) ── */
ED_DESIGNS.push((() => {
  const tint = '#9a3c42', T = edPal(tint);
  const SK = skinPal('#f6d2b0'), HA = T('#7a3f26'), DR = T('#e8b13a'), AP = T('#3f7d4a'), BOOT = T('#c43c2e'), GL = T('#f2d04a'), CAN = T('#3f9aa0', .3), LENS = T('#e6f2f2'), TROW = T('#8a6a4a');
  const CC = T('#f4e2c0'), EARP = T('#f2a6a6');
  function can(R, s) {
    R.K2(20.6, -31.6, 28.6, -39.4, 1.5, 1.1, CAN, { g: 'spout', ol: 1 });
    R.E(29.4, -40.2, 1.9, 1.7, -.7, CAN, { g: 'rose', ol: 1 });
    R.E(17.6, -28.6, 6.4, 5.6, 0, CAN, { g: 'canB', ol: 1 });
    R.chain([[13.6, -33], [15.4, -35.6], [20, -35.4], [21.4, -32.6]], [.9, .9, .9, .9], CAN, { g: 'canH' });
    const ph = (s.t * 4) % 1;
    for (let i = 0; i < 3; i++) { const k = (ph + i / 3) % 1; R.stamp(31.4 + k * 3, -38 + k * 22, ['w', 'w'], { w: '#bfe4f4' }, 0, 0, true); }
  }
  function hero(R, s) {
    R.K2(-3.6, -14, -3.8, -4, 3, 3.2, BOOT, { g: 'bootN', ol: 1 }); R.E(-2.8, -2.8, 4.4, 2.8, 0, BOOT, { g: 'bootN', ol: 1 });
    R.K2(4.2, -14, 4.6, -4, 2.9, 3.1, BOOT, { g: 'bootF' }); R.E(5.6, -2.8, 4.4, 2.8, 0, BOOT, { g: 'bootF' });
    R.push(); R.translate(0, s.by);
    R.chain([[-5.4, -58], [-9, -55], [-10.6, -50], [-9.8, -45.6]], [2.4, 2.2, 1.8, 1.3], HA, { g: 'pony' });
    R.chain([[4.6, -51], [9.2, -42.4], [13.4, -36.4]], [2, 1.9, 1.8], DR, { g: 'armF' });
    can(R, s);
    R.E(13.4, -35.6, 2.1, 2.1, 0, GL, { g: 'gloveF', ol: 1 });
    R.P([[-5.4, -52.4], [5, -52.4], [8.6, -40], [13.8, -22], [14.2, -15], [-14.6, -15], [-14.2, -22], [-9.2, -40]], DR, { g: 'dress', side: .64 });
    R.P([[-4.2, -48.4], [4.6, -48.4], [8, -36], [12.2, -20], [11.8, -16.4], [-12.2, -16.4], [-12.6, -20], [-8, -36]], AP, { g: 'apron', ol: 1, side: .64 });
    R.K2(-3.6, -48, -4.6, -52, .8, .8, AP, { g: 'apS' }); R.K2(4, -48, 4.6, -52, .8, .8, AP, { g: 'apS' });
    R.K2(-4, -28.4, -3, -34.4, .9, .8, TROW, { g: 'trowel', ol: 1 });
    R.P([[-7.4, -29], [-1.4, -29], [-1.6, -22.6], [-7.2, -22.6]], AP, { g: 'pocket', ol: 1, flat: 0 });
    R.chain([[-5.4, -51], [-9.6, -42.4], [-7.6, -34.4]], [2, 1.9, 1.8], DR, { g: 'armN', ol: 1 });
    R.E(-7.2, -33.6, 2.2, 2.2, 0, GL, { g: 'gloveN', ol: 1 });
    R.K2(0, -52, .4, -55, 1.7, 1.7, SK, { g: 'neck' });
    const hx = 1, hy = -60;
    R.P([[-5.8, -57.6], [-6.8, -63], [-4.2, -66.8], [1, -67.6], [5.8, -66.2], [7.4, -62.6], [4.8, -63.6], [1.2, -63], [-2, -61], [-3.4, -56]], HA, { g: 'hairB' });
    R.E(hx, hy, 5.8, 6.2, 0, SK, FACE);
    R.E(-2.4, hy + 1, 1.4, 2, 0, SK, { g: 'ear', ol: 1 });
    R.P([[-3.6, -63.4], [-1, -66.2], [3.6, -66.4], [7.2, -63.6], [6.8, -61.6], [3.6, -63], [0, -62.6]], HA, { g: 'bang', cl: 1 });
    R.E(.6, hy, 2.2, 2.2, 0, LENS, { g: 'lens', ol: 1, flat: 1, cast: 0 }); R.E(5.2, hy - .2, 1.6, 2, 0, LENS, { g: 'lens2', ol: 1, flat: 1, cast: 0 });
    if (s.blink) { R.stamp(.6, hy, ['PP'], { P: INK }, 1); R.stamp(5.4, hy, ['P'], { P: INK }); } else { eye(R, .8, hy - 1, 'dot'); eye(R, 5.2, hy - 1.2, 'dot'); }
    R.P([[5.8, hy + .8], [8.4, hy + 3.6], [6, hy + 3.8]], SK, { g: 'nose', ol: 2, flat: 1 });
    R.stamp(-1.4, hy + 3, ['f.f'], { f: '#c98a6a' });
    mouth(R, 4.4, hy + 4.8, 'smileS');
    R.pop();
  }
  function cat(R, s) {
    R.push(); R.translate(0, s.by);
    const sw = s.sw;
    R.chain([[-7.6, -70.6], [-11.4, -67], [-12.2, -61], [-11 + sw * .6, -56.4]], [3.2, 3, 2.6, 2.2], CC, { g: 'cTail' });
    R.E(.4, -72.4, 9.8, 7.6, 0, CC, { g: 'cB' });
    for (let k = 0; k < 9; k++) { const a = Math.PI * (1.05 + k * .11), x = .4 + Math.cos(a) * 9.6, y = -72.4 + Math.sin(a) * 7.4; R.P([[x - 1.6 * Math.sin(a), y + 1.6 * Math.cos(a)], [x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2], [x + 1.6 * Math.sin(a), y - 1.6 * Math.cos(a)]], CC, { g: 'cB' }); }
    R.P([[-6.6, -77], [-6, -81.4], [-3.4, -78.6]], CC, { g: 'cEar' }); R.P([[4.4, -78.6], [6.8, -81.6], [7.4, -77]], CC, { g: 'cEar' });
    R.P([[-5.8, -78], [-5.6, -80.2], [-4.4, -78.8]], EARP, { g: 'cEarIn', flat: 1, cast: 0 });
    R.E(-3.6, -65.6, 1.9, 1.3, 0, CC, { g: 'cPaw', ol: 1 }); R.E(4.2, -65.8, 1.9, 1.3, 0, CC, { g: 'cPaw2', ol: 1 });
    if (s.cblink) catFace(R, .6, -72.4, { blink: true, sp: 2.8, wl: 5, mouth: 'frown' });
    else catFace(R, .6, -73.2, { eyesL: 'cGrumpL', eyesR: 'cGrumpR', iris: '#e8a030', sp: 2.8, ny: 3.4, mouth: 'frown', wl: 5 });
    for (const [x, y, c] of [[-6.4, -77.6, '#f27aa0'], [-3, -80.2, '#fff6ea'], [.8, -80.8, '#6aa0e8'], [4.4, -80.2, '#f27aa0'], [7.6, -77.4, '#fff6ea']]) R.stamp(x, y, ['.p.', 'pyp', '.p.'], { p: c, y: '#f2c94a' }, 1, 1);
    for (const [x, y] of [[-4.8, -79.4], [2.6, -81.2], [6, -79.2]]) R.stamp(x, y, ['g'], { g: '#4f8f45' });
    R.pop();
  }
  function sprout(pb, x, y) { pb.line(x, y, x, y - 3, '#3f7d4a'); pb.ellipse(x - 1.6, y - 3.6, 1.8, 1, '#5aa04f'); pb.ellipse(x + 1.6, y - 3.8, 1.8, 1, '#5aa04f'); }
  return {
    title: '텃밭 정원사', hero: '서양배 같은 몸 · 동그란 안경 · 노란 장갑 · 물뿌리개', catName: '버터', catDesc: '머리보다 큰 크림색 털뭉치 (화관)', carry: '머리 위', body: '서양배',
    point: '심통 난 털뭉치를 모자처럼 이고 다니는 사람', bg: '#ef9984', tint, ox: 76, oy: 150, sc: 1.25, shadows: [[86, 150, 27, 3.4]],
    swatch: ['#ef9984', '#3f7d4a', '#e8b13a', '#f4e2c0', '#c43c2e'],
    layers: s => [{ fn: R => hero(R, s) }, { fn: R => cat(R, s) }],
    back: (pb, s) => { sprout(pb, 24, 146); sprout(pb, 34, 150); sprout(pb, 134, 144); sprout(pb, 146, 150); [[20, 30], [140, 24], [130, 70]].forEach((p, i) => { pb.ellipse(p[0], p[1] + Math.round(Math.sin((s.t + i * .3) * TAU)), 1.6, 1.6, '#fff1ea'); }); },
  };
})());

/* ── 7. 우비 꼬마 & 양말 : 머리가 몸만 한 아이 + 안기면 액체처럼 늘어나는 턱시도 ── */
ED_DESIGNS.push((() => {
  const tint = '#1c2e58', T = edPal(tint);
  const SK = skinPal('#f6d0ae'), HA = T('#5a3424'), RC = T('#f3c431'), BOOT = T('#d8392f');
  const CB = ['#121016', '#26222c', '#45404e'], CWH = T('#f7f2ea');
  function hero(R, s) {
    R.K2(-4.4, -10.6, -4.6, -4, 3.2, 3.4, BOOT, { g: 'bootN', ol: 1 }); R.E(-3.8, -2.8, 4.4, 3, 0, BOOT, { g: 'bootN', ol: 1 });
    R.K2(5, -10.6, 5.4, -4, 3.1, 3.3, BOOT, { g: 'bootF' }); R.E(6.2, -2.8, 4.4, 3, 0, BOOT, { g: 'bootF' });
    R.push(); R.translate(0, s.by);
    R.P([[-7.4, -32.6], [7.4, -32.6], [11.6, -14], [11, -10.6], [-11, -10.6], [-11.6, -14]], RC, { g: 'coat', side: .64 });
    R.DL(1, -31, 1.6, -11.4, RC[0]);
    for (const y of [-27, -21, -15.6]) R.stamp(3.4, y, ['tt'], { t: '#8a5a32' });
    R.K2(-6.8, -30.6, -9.6, -24.4, 2.6, 2.4, RC, { g: 'armN', ol: 1 });
    R.K2(6.6, -30.6, 9.6, -24.6, 2.6, 2.4, RC, { g: 'armF', ol: 1 });
    const hx = 2.2, hy = -44;
    R.E(.4, -45.8, 13.8, 12.8, 0, RC, { g: 'hood' });
    R.E(hx, hy, 10.4, 9.6, 0, SK, FACE);
    R.P([[-6.4, -51.6], [10.6, -51.6], [11.8, -48.6], [8.6, -50], [5.4, -48.4], [2, -50], [-1.4, -48.4], [-4.4, -50], [-7, -48.2]], HA, { g: 'bang', cl: 1 });
    R.P([[-9.4, -49.4], [-7.4, -55], [0, -57.8], [7.4, -57.4], [12.8, -52.8], [13.6, -47.6], [11.8, -50.4], [6.2, -54.2], [0, -54.6], [-5.6, -52.4], [-8.2, -47.4]], RC, { g: 'hoodRim', ol: 1 });
    if (s.blink) { eye(R, hx - 2.6, hy + .4, 'shut'); eye(R, hx + 4.6, hy + .4, 'shut'); } else { eye(R, hx - 2.6, hy - 2.4, 'roundL'); eye(R, hx + 4.6, hy - 2, 'roundLS'); }
    R.stamp(hx + 7.8, hy + 2, ['n'], { n: SK[0] });
    R.stamp(hx - 5.6, hy + 3, ['bb'], { b: '#f0908a' }); R.stamp(hx + 6.4, hy + 3, ['b'], { b: '#f0908a' });
    mouth(R, hx + 2, hy + 5, 'o');
    R.pop();
  }
  function cat(R, s) {
    R.push(); R.translate(0, s.by);
    const sw = s.sw;
    R.chain([[2.6, -9], [6.6, -5], [10.6, -2.2], [14, -2.8], [15.6 + sw * .6, -5.4]], [1.5, 1.4, 1.3, 1.2, 1], CB, { g: 'cTail' });
    R.K2(-1.4, -9, -2.4, -2, 1.7, 1.5, CB, { g: 'cLegF' }); R.E(-2.6, -1.4, 1.9, 1.3, 0, CWH, { g: 'cSock' });
    R.K2(3.4, -9, 4.4, -2.2, 1.7, 1.5, CB, { g: 'cLegN', ol: 1 }); R.E(4.6, -1.6, 1.9, 1.3, 0, CWH, { g: 'cSock2', ol: 1 });
    R.K2(.8, -22, 1.2, -9.6, 4, 4.6, CB, { g: 'cBody' });
    R.K2(.8, -21, 1.1, -12, 1.8, 2.2, CWH, { g: 'cBelly' });
    R.K2(-2.4, -22, -6.6, -26, 1.5, 1.3, CB, { g: 'cArmL', ol: 1 }); R.E(-7.2, -26.4, 1.8, 1.4, 0, CWH, { g: 'cPawL', ol: 1 });
    R.K2(3.8, -22, 7.6, -26.2, 1.5, 1.3, CB, { g: 'cArmR', ol: 1 }); R.E(8.2, -26.6, 1.8, 1.4, 0, CWH, { g: 'cPawR', ol: 1 });
    const hx = .8, hy = -26.4;
    R.P([[hx - 4.4, hy - 1], [hx - 3.8, hy - 7], [hx - 1, hy - 3.6]], CB, { g: 'cEar' }); R.P([[hx + 1, hy - 3.6], [hx + 3.8, hy - 7], [hx + 4.4, hy - 1]], CB, { g: 'cEar' });
    R.E(hx, hy, 5, 4.2, 0, CB, { g: 'cHead' });
    R.P([[hx - .6, hy - 4], [hx + .6, hy - 4], [hx + 1.4, hy + .6], [hx - 1.4, hy + .6]], CWH, { g: 'cBlaze', flat: 1 });
    R.E(hx, hy + 2, 2.8, 1.8, 0, CWH, { g: 'cMuz' });
    catFace(R, hx, hy - .4, { eyes: 'cLid', iris: '#c8d84a', sp: 2.3, wl: 4, blink: s.cblink, ny: 2 });
    R.pop();
  }
  function hands(R, s) {
    R.push(); R.translate(0, s.by);
    R.K2(-9.6, -24.4, -5.2, -21.4, 2.4, 2.2, RC, { g: 'armN2', ol: 1 }); R.E(-4.6, -21.2, 2.2, 2.1, 0, SK, { g: 'handN', ol: 1 });
    R.K2(9.6, -24.6, 6, -21.6, 2.4, 2.2, RC, { g: 'armF2', ol: 1 }); R.E(5.6, -21.4, 2.2, 2.1, 0, SK, { g: 'handF', ol: 1 });
    R.pop();
  }
  return {
    title: '우비 꼬마', hero: '몸만 한 머리 · 노란 우비 · 빨간 장화 · 동그란 눈', catName: '양말', catDesc: '안기면 쭉 늘어나는 턱시도', carry: '품에 안기', body: '큰 머리',
    point: '"고양이는 액체" 짤을 그대로 옮긴 조합', bg: '#5a7db0', tint, ox: 78, oy: 150, sc: 1.5, shadows: [[84, 150, 22, 3.4]],
    swatch: ['#5a7db0', '#f3c431', '#d8392f', '#26222c', '#f7f2ea'],
    layers: s => [{ fn: R => hero(R, s) }, { fn: R => cat(R, s) }, { fn: R => hands(R, s) }],
    back: (pb, s) => {
      pb.ellipse(84, 150, 40, 6, '#7c9ccb'); pb.ellipse(84, 150, 30, 4.2, '#6a8cc0');
      const r = (s.f % 8) * 1.2; pb.ellipse(110, 151, 3 + r, 1.2 + r * .3, '#a9c3e6'); pb.ellipse(110, 151, 2 + r, .6 + r * .3, '#6a8cc0');
      for (let i = 0; i < 26; i++) { const x = mod(hash1(i + 9) * 170 - s.t * 30, 170) - 5, y = mod(hash1(i + 70) * 170 + s.t * 120, 170) - 5; pb.line(x, y, x - 2, y + 5, '#93b2dc'); }
    },
  };
})());

/* ── 8. 수리공 & 라떼 : 어깨 넓은 역삼각 몸 + 멜빵 주머니 속 샴 ── */
ED_DESIGNS.push((() => {
  const tint = '#215a4e', T = edPal(tint);
  const SK = skinPal('#c98a5e'), HA = T('#2a1c1a'), BAN = T('#e9b23a'), DEN = T('#3c5f9a'), DENL = T('#5a7fbe'), SHI = T('#e0553a'), BOOT = T('#5a3424'), BRASS = T('#c99a3a', .35), LENS = T('#7ad0e8', .4), STEEL = T('#9aa4ae', .4), STRAP = T('#4a3026');
  const SC = T('#f1e2c6'), SD = T('#4a3026');
  function hero(R, s) {
    R.P([[-7.4, -6.4], [-.4, -6.4], [3, -3.2], [3.2, .2], [-7.4, .2]], BOOT, { g: 'bootN', ol: 1 });
    R.P([[2.2, -6.4], [8.4, -6.4], [11.6, -3.2], [11.8, .2], [2.2, .2]], BOOT, { g: 'bootF' });
    R.K2(3.6, -40, 5, -6, 2.7, 2.4, DEN, { g: 'legF' });
    R.K2(-3, -40, -3.4, -6, 2.9, 2.6, DEN, { g: 'legN', ol: 1 });
    R.E(-3.4, -7.4, 3.2, 1.4, 0, DENL, { g: 'cuffN' }); R.E(5, -7.4, 3, 1.3, 0, DENL, { g: 'cuffF' });
    R.push(); R.translate(0, s.by);
    R.chain([[11.6, -65], [19.6, -60], [19.4, -53]], [2.8, 2.6, 2.4], SHI, { g: 'armF' });
    R.K2(19.6, -44, 17.6, -82, 2, 2, STEEL, { g: 'wrH', ol: 1 });
    R.E(19.8, -43, 3.2, 3.2, 0, STEEL, { g: 'wrR', ol: 1 }); R.stamp(19.8, -43, ['oo', 'oo'], { o: INK }, 1, 1);
    R.P([[13.6, -83.6], [21.6, -83.6], [23.2, -90], [20.6, -96.6], [19, -91], [16.4, -91], [14.8, -96.6], [12.2, -90]], STEEL, { g: 'wrJ', ol: 1 });
    R.E(19.4, -52.4, 2.6, 2.6, 0, SK, { g: 'handF', ol: 1 });
    R.P([[-16.4, -67.4], [13.4, -67.4], [9.4, -52], [5.6, -40.4], [-6.2, -40.4], [-10.4, -52]], SHI, { g: 'torso', side: .64 });
    R.P([[-6.4, -58.4], [5.2, -58.4], [5.6, -40.4], [-6.2, -40.4]], DEN, { g: 'bib', ol: 1, side: .66 });
    R.K2(-5.6, -57.6, -9, -66.4, 1.3, 1.3, DEN, { g: 'strapN', ol: 1 }); R.K2(4.6, -57.6, 7.6, -66.4, 1.3, 1.3, DEN, { g: 'strapF', ol: 1 });
    R.stamp(-5.6, -57.6, ['b'], { b: '#f2c94a' }); R.stamp(4.6, -57.6, ['b'], { b: '#f2c94a' });
    R.P([[-7, -41.6], [6, -41.6], [6.2, -36.4], [-7.2, -36.4]], DEN, { g: 'hip', ol: 1 });
    R.K2(-15.4, -65, -21.4, -54, 3, 2.8, SHI, { g: 'armN', ol: 1 });
    R.K2(-21.4, -54, -9, -44, 2.8, 2.4, SK, { g: 'foreN', ol: 1 });
    R.E(-8.4, -43.4, 2.6, 2.6, 0, SK, { g: 'handN', ol: 1 });
    R.K2(.2, -67, .6, -71, 3.2, 3, SK, { g: 'neck' });
    R.P([[-5, -84.4], [7, -84.4], [8.2, -78], [7.8, -72], [5.2, -69.6], [-2.6, -69.6], [-5.2, -72.6], [-6.2, -78]], SK, FACE);
    R.E(-4.6, -77, 1.6, 2.4, 0, SK, { g: 'ear', ol: 1 });
    R.P([[-6.4, -80], [-3.6, -80], [-3.8, -74.6], [-5.6, -75]], HA, { g: 'burn' });
    R.P([[-6.8, -80.6], [-5.6, -86.2], [0, -88.8], [6.2, -87.8], [8.6, -83], [8.2, -80.6], [0, -82.6]], BAN, { g: 'bandana' });
    R.P([[-6.6, -86], [-11, -89], [-10, -84.6]], BAN, { g: 'knot', ol: 1 }); R.P([[-6.6, -85.4], [-10.4, -82], [-7.4, -82.6]], BAN, { g: 'knot', ol: 1 });
    R.K2(-6.6, -82.4, 8.6, -82.4, .8, .8, STRAP, { g: 'gStrap' });
    R.E(1.4, -82.8, 2.6, 2.4, 0, BRASS, { g: 'gogN', ol: 1 }); R.E(1.4, -82.8, 1.5, 1.4, 0, LENS, { g: 'lensN', flat: 2, cast: 0 });
    R.E(6, -83, 2.2, 2.2, 0, BRASS, { g: 'gogF', ol: 1 }); R.E(6, -83, 1.2, 1.2, 0, LENS, { g: 'lensF', flat: 2, cast: 0 });
    R.DL(-.6, -79.6, 2.6, -80.2, INK); R.DL(4.8, -80.2, 6.8, -79.8, INK);
    if (s.blink) { eye(R, 1, -77.6, 'shut'); eye(R, 5.8, -77.8, 'shut'); } else { eye(R, 1, -78.4, 'lid'); eye(R, 5.8, -78.6, 'lidS'); }
    R.P([[6.2, -78], [9.4, -74.6], [6.6, -74.2]], SK, { g: 'nose', ol: 2, flat: 1 });
    mouth(R, 4.6, -72.6, 'smirk');
    R.pop();
  }
  function cat(R, s) {
    R.push(); R.translate(0, s.by);
    const hx = -.6, hy = -57.8;
    R.P([[hx - 4.8, hy - .4], [hx - 4.2, hy - 7], [hx - 1.4, hy - 3]], SD, { g: 'cEar' }); R.P([[hx + 1.4, hy - 3], [hx + 4, hy - 7.2], [hx + 4.6, hy - .6]], SD, { g: 'cEar' });
    R.E(hx, hy, 4.8, 4, 0, SC, R.pat({ g: 'cHead', alts: [SD], alt: blobs([[hx, hy + 2.4, 1.5, 1.2, 0]]) }));
    if (s.cblink) catFace(R, hx, hy - .4, { blink: true, sp: 2.2, wl: 2, ny: 2, nose: '#2a1814', wc: '#e8dcc4', mouth: false });
    else catFace(R, hx, hy - 1.2, { eyes: 'cLid', iris: '#4aa6f0', sp: 2.2, wl: 2, ny: 2.6, nose: '#2a1814', wc: '#e8dcc4', mouth: false });
    R.P([[-5, -54.4], [3.8, -54.4], [3.6, -47.2], [-4.8, -47.2]], DEN, { g: 'pocket', ol: 1, flat: 1 });
    R.stamp(-4.2, -53.4, ['s.s.s.s.s'], { s: '#7f9fd6' });
    R.E(-3.4, -54.4, 1.4, 1, 0, SD, { g: 'cPaw', ol: 1 }); R.E(1.8, -54.6, 1.4, 1, 0, SD, { g: 'cPaw2', ol: 1 });
    R.pop();
  }
  function gear(pb, x, y, r, col, a) { for (let k = 0; k < 8; k++) { const t = a + k * TAU / 8; pb.ellipse(x + Math.cos(t) * r, y + Math.sin(t) * r, 1.6, 1.6, col); } pb.ellipse(x, y, r, r, col); pb.ellipse(x, y, r * .4, r * .4, '#86ceae'); }
  return {
    title: '거리 수리공', hero: '어깨 넓은 역삼각 몸 · 두건과 고글 · 멜빵바지 · 거대한 스패너', catName: '라떼', catDesc: '멜빵 주머니 속 샴 (살짝 사시)', carry: '앞주머니', body: '역삼각',
    point: '든든한 덩치 앞주머니에 쏙 들어간 작은 고양이', bg: '#86ceae', tint, ox: 72, oy: 150, sc: 1.22, shadows: [[82, 150, 24, 3.4]],
    swatch: ['#86ceae', '#e0553a', '#3c5f9a', '#e9b23a', '#f1e2c6'],
    layers: s => [{ fn: R => hero(R, s) }, { fn: R => cat(R, s) }],
    back: (pb, s) => { gear(pb, 22, 28, 5, '#6fb898', s.t * TAU * .25); gear(pb, 138, 120, 7, '#6fb898', -s.t * TAU * .2); gear(pb, 146, 30, 3.4, '#6fb898', s.t * TAU * .4); },
  };
})());

/* ── 9. 등불지기 & 꼬마 : 장대처럼 긴 사람 + 등불을 올려다보는 아기 고양이 ── */
ED_DESIGNS.push((() => {
  const tint = '#0b1030', T = edPal(tint);
  const SK = skinPal('#f0c49c'), HA = T('#e8e4ea'), COAT = T('#c98b3a'), SCF = T('#c8402e'), HAT = ['#0e0c14', '#1c1a26', '#3a3646'], HB = T('#7a2f3a'), PANT = T('#2a2436'), SHOE = ['#0c0a10', '#18161e'], POLE = T('#8a6a4a'), BRASS = T('#c99a3a', .35), GLASS = ['#f2c94a', '#ffe48a', '#fff6c8'];
  const KT = T('#9a8e86'), KS = T('#5e544e'), KW = T('#f2ece4');
  const STY = Object.assign({}, ED, { light: lightDir(.62, -.6, .5), castR: true });
  const LX = 27, LY = -120.6;
  function hero(R, s) {
    R.P([[-5.4, -4], [1.6, -4.6], [9, -2.4], [9.4, -.4], [-5.4, .2]], SHOE, { g: 'shoeN', ol: 1 });
    R.P([[.8, -4], [6.8, -4.6], [14.2, -2.6], [14.6, -.6], [.8, .2]], SHOE, { g: 'shoeF' });
    R.K2(3, -60, 5, -4, 2, 1.7, PANT, { g: 'legF' }); R.K2(-2, -60, -1.6, -4, 2.2, 1.8, PANT, { g: 'legN', ol: 1 });
    R.push(); R.translate(0, s.by);
    R.K2(17, -1, 19.4, -134, 1.1, 1.1, POLE, { g: 'pole', ol: 1 });
    R.K2(19.4, -133.4, 27, -131.4, 1, 1, POLE, { g: 'hook', ol: 1 });
    R.DL(27, -131, 27, -127.6, INK);
    R.P([[24, -127.6], [30, -127.6], [31.2, -125.4], [22.8, -125.4]], BRASS, { g: 'lTop', ol: 1 });
    R.B(LX, LY, 6.4, 9, 0, GLASS, { g: 'lGlass', flat: 2, cast: 0 });
    R.DL(25, -125, 25, -116.4, BRASS[0]); R.DL(29, -125, 29, -116.4, BRASS[0]);
    R.P([[23.2, -116.4], [30.8, -116.4], [29.6, -114.4], [24.4, -114.4]], BRASS, { g: 'lBot', ol: 1 });
    R.chain([[5, -88], [12, -79], [17.6, -82.6]], [2, 1.9, 1.8], COAT, { g: 'armF' });
    R.E(18.2, -82.4, 2.1, 2.1, 0, SK, { g: 'handF', ol: 1 });
    R.P([[-7.4, -90], [6.4, -90], [7.6, -70], [8.6, -40], [10.4, -16], [-8.8, -16], [-8.6, -40], [-8.6, -70]], COAT, { g: 'coat', sideL: .36 });
    R.DL(1.4, -88, 1.8, -17, COAT[0]);
    for (const y of [-80, -70, -60, -50]) R.stamp(3.2, y, ['b'], { b: '#f2d26a' });
    R.DL(-7, -44, -2.6, -44, COAT[0]);
    R.K2(0, -90, .6, -97, 1.6, 1.5, SK, { g: 'neck' });
    R.E(-.4, -91, 5.6, 2.4, 0, SCF, { g: 'scarf', ol: 1 });
    R.P([[1, -90], [4.2, -90], [3.6, -73], [1.2, -74]], SCF, { g: 'scarfF', ol: 1 });
    R.chain([[-6.8, -88], [-9.4, -72], [-6.8, -60]], [2.1, 1.9, 1.8], COAT, { g: 'armN', ol: 1 });
    const hx = 1, hy = -104;
    R.P([[-4.6, -106], [-7.6, -103], [-5, -101.4]], HA, { g: 'wisp', ol: 1 }); R.P([[-4.6, -101.4], [-7, -98], [-4.2, -98.6]], HA, { g: 'wisp', ol: 1 });
    R.E(hx, hy, 5, 7.6, 0, SK, FACE);
    R.E(-2.6, hy + 1, 1.3, 2, 0, SK, { g: 'ear', ol: 1 });
    R.P([[3.4, -105.6], [10, -100.6], [9, -98], [5.4, -99.4]], SK, { g: 'nose', ol: 1, flat: 1 });
    if (s.blink) { eye(R, hx, hy - 1, 'shut'); eye(R, 5, hy - 1.2, 'shut'); } else { eye(R, hx, hy - 1.8, 'lid'); eye(R, 5, hy - 2, 'lidS'); }
    R.stamp(-.4, hy - 4.4, ['www.', '.www'], { w: '#eceaf0' }, 1, 0);
    mouth(R, 3.6, hy + 6, 'smileS');
    R.P([[-5, -111.4], [6, -111.4], [7, -128], [-4, -128.6]], HAT, { g: 'hTop', sideL: .3 });
    R.P([[-5, -114.6], [6.2, -114.6], [6.4, -111.6], [-5.2, -111.6]], HB, { g: 'hBand', ol: 1 });
    R.E(.6, -110.6, 8.6, 2, 0, HAT, { g: 'hBrim', cl: 3 });
    R.pop();
  }
  function cat(R, s) {
    const sw = s.sw;
    R.chain([[-3.4, -3.6], [-6.6, -6.4], [-6.4, -11.4], [-4.6 + sw * .5, -14]], [1.4, 1.3, 1.1, .9], KT, R.pat({ g: 'kTail', alts: [KS], alt: (x, y, t) => (t > .5 ? 0 : -1) }));
    R.E(0, -4.4, 4.4, 4.2, 0, KT, R.pat({ g: 'kBody', alts: [KS], alt: (x, y) => ((mod(Math.round(y), 3) === 0 && Math.abs(x) > 1.6) ? 0 : -1) }));
    R.E(1, -3, 2, 2.4, 0, KW, { g: 'kBelly' });
    R.E(-.6, -.8, 1.4, 1, 0, KW, { g: 'kPaw' }); R.E(2.6, -.8, 1.4, 1, 0, KW, { g: 'kPaw2', ol: 1 });
    const hx = 1.6, hy = -12;
    R.P([[hx - 4.6, hy - 1], [hx - 4, hy - 6.6], [hx - 1.2, hy - 3.4]], KT, { g: 'kEar' }); R.P([[hx + 1.4, hy - 3.6], [hx + 4.4, hy - 6.8], [hx + 4.8, hy - 1.2]], KT, { g: 'kEar' });
    R.E(hx, hy, 5, 4.4, 0, KT, R.pat({ g: 'kHead', alts: [KS], alt: (x, y) => { const dx = x - hx, dy = y - hy; return (dy < -2 && (Math.abs(dx) < .5 || Math.abs(Math.abs(dx) - 1.8) < .45)) ? 0 : -1; } }));
    R.E(hx + .4, hy + 1.8, 2.4, 1.6, 0, KW, { g: 'kMuz' });
    if (s.cblink) { eye(R, hx - 1.8, hy, 'cShut'); eye(R, hx + 2.4, hy, 'cShut'); } else { eye(R, hx - 1.8, hy - 1.4, 'cUp', '#e8c84a'); eye(R, hx + 2.4, hy - 1.4, 'cUp', '#e8c84a'); }
    R.stamp(hx + .4, hy + 1.2, ['N'], { N: '#e8828a' });
    R.W(hx - 2.4, hy + 1.6, hx - 6.6, hy + .8, '#f6efe4'); R.W(hx + 3, hy + 1.6, hx + 7.2, hy + .8, '#f6efe4');
  }
  return {
    title: '등불지기', hero: '장대처럼 긴 몸 · 실크해트 · 매부리코 · 등불 장대', catName: '꼬마', catDesc: '등불을 올려다보는 아기 고등어 태비', carry: '나란히 걷기', body: '장대',
    point: '밤 사냥: 등불이 비추는 쪽만 밝게 (빛 방향이 반대)', bg: '#1e2754', tint, ox: 92, oy: 152, style: STY, shadows: [[80, 152, 20, 2.6], [50, 152, 8, 2]],
    swatch: ['#1e2754', '#c98b3a', '#c8402e', '#ffe48a', '#9a8e86'],
    layers: s => [{ fn: R => cat(R, s), x: 56, cast: false }, { fn: R => hero(R, s), cast: false }],
    back: (pb, s) => {
      const x = 92 + LX, y = 152 + LY + (s.by || 0), fl = (s.f % 4 < 2) ? 0 : 1;
      pb.ellipse(x, y, 40 + fl, 40 + fl, '#26306a'); pb.ellipse(x, y, 26 + fl, 26 + fl, '#323d7c'); pb.ellipse(x, y, 14 + fl, 14 + fl, '#4a4f86');
      [[14, 18], [40, 40], [18, 90], [60, 24], [146, 100], [130, 140], [30, 124], [150, 60]].forEach((p, i) => { if ((s.f + i * 3) % 7) pb.px(p[0], p[1], '#e8e4c8'); else star4(pb, p[0], p[1], '#e8e4c8'); });
    },
  };
})());

/* ── 10. 동네 제빵사 & 콩떡 : 달걀 같은 몸 + 식빵 위에서 '식빵 굽는' 젖소 고양이 ── */
ED_DESIGNS.push((() => {
  const tint = '#a4452c', T = edPal(tint);
  const SK = skinPal('#f3c8a2'), CHEF = T('#f8f2e6', .5), AP = T('#8a5a3a'), NK = T('#d23a32'), CLOG = T('#2a2224'), PIN = T('#d9a865', .35), PCK = ['#2a2224', '#3a3236'], PCW = T('#efe8dc');
  const CRUST = T('#c97a32', .3), CRUMB = T('#f3dcae'), KW = T('#f9f4ea'), KB = ['#1a171c', '#2c282f'], EARP = T('#f2a6a6');
  function pin(R, hx, hy) {
    R.K2(hx + .4, hy + 2.4, hx - 1.4, hy - 3, 1.1, 1.1, PIN, { g: 'pinH', ol: 1 });
    R.K2(hx - 1.6, hy - 3.4, hx - 7.4, hy - 16, 2.8, 2.8, PIN, { g: 'pinB', ol: 1 });
    R.K2(hx - 7.6, hy - 16.4, hx - 9, hy - 19.6, 1.1, 1.1, PIN, { g: 'pinH2', ol: 1 });
  }
  function hero(R, s) {
    R.E(-5, -2.6, 4.6, 2.6, 0, CLOG, { g: 'clogN', ol: 1 }); R.E(5.4, -2.6, 4.6, 2.6, 0, CLOG, { g: 'clogF' });
    const check = (x, y) => (((Math.floor(x / 1.6) + Math.floor(y / 1.6)) & 1) ? 0 : -1);
    R.K2(4.6, -12, 5, -4, 3, 2.8, PCW, R.pat({ g: 'legF', alts: [PCK], alt: check }));
    R.K2(-4.6, -12, -4.8, -4, 3, 2.8, PCW, R.pat({ g: 'legN', ol: 1, alts: [PCK], alt: check }));
    R.push(); R.translate(0, s.by);
    R.chain([[11.6, -44], [16.6, -36], [12.6, -29.6]], [2.6, 2.4, 2.2], CHEF, { g: 'armF' });
    R.E(12.2, -29.4, 2.3, 2.3, 0, SK, { g: 'handF', ol: 1 });
    R.E(0, -31, 15.8, 21.4, 0, CHEF, { g: 'egg' });
    for (const y of [-46, -41, -36]) { R.stamp(-3.4, y, ['b'], { b: '#b8a888' }); R.stamp(3, y, ['b'], { b: '#b8a888' }); }
    R.P([[-13.4, -30.4], [13.4, -30.4], [15.4, -20], [12.6, -12], [0, -9.6], [-12.6, -12], [-15.4, -20]], AP, { g: 'apron', ol: 1, side: .66 });
    R.DL(-13, -30.6, 13, -30.6, INK);
    R.P([[-5, -24], [3, -24], [2.8, -17], [-4.8, -17]], AP, { g: 'apPocket', ol: 1, flat: 0 });
    R.stamp(-1, -15, ['w..', '..w'], { w: '#f8f2e6' });
    R.K2(-11.6, -44, -18.6, -38.6, 2.8, 2.6, CHEF, { g: 'armN', ol: 1 });
    R.K2(-18.6, -38.6, -17.4, -47.4, 2.6, 2.4, CHEF, { g: 'armN', ol: 1 });
    pin(R, -17.4, -48.4);
    R.E(-17.4, -47.8, 2.4, 2.4, 0, SK, { g: 'handN', ol: 1 });
    const hx = 2.2, hy = -57.4;
    R.E(hx, hy, 7.6, 7, 0, SK, FACE);
    R.P([[0, -51.2], [6.4, -51.2], [3.6, -47.2]], NK, { g: 'kerchief', ol: 1 });
    if (s.blink) { eye(R, hx - 1.4, hy - 1, 'shut'); eye(R, hx + 3.6, hy - 1.2, 'shut'); } else { eye(R, hx - 1.4, hy - 1.6, 'happy'); eye(R, hx + 3.6, hy - 1.8, 'happy'); }
    R.stamp(hx - 4.4, hy + 1.4, ['bb', 'bb'], { b: '#ee8a80' }); R.stamp(hx + 5.6, hy + 1.2, ['b'], { b: '#ee8a80' });
    R.E(hx + 7, hy + .8, 2.4, 2.2, 0, SK, { g: 'nose', ol: 1 });
    R.stamp(hx + 7, hy, ['w'], { w: '#ffffff' });
    mouth(R, hx + 2.4, hy + 3.6, 'grin');
    R.B(hx - .6, hy - 7.6, 14.4, 3.6, 0, CHEF, { g: 'hBand', cl: 2 });
    R.E(hx - 5.2, hy - 13, 5.4, 5, 0, CHEF, { g: 'hTop' }); R.E(hx + 4.4, hy - 13.2, 5, 4.6, 0, CHEF, { g: 'hTop' }); R.E(hx - .4, hy - 16.6, 6.2, 5.8, 0, CHEF, { g: 'hTop' });
    R.DL(hx - 3, hy - 10.4, hx - 3.4, hy - 13.4, CHEF[0]); R.DL(hx + 2.4, hy - 10.4, hx + 2.6, hy - 14, CHEF[0]);
    R.pop();
  }
  function cat(R, s) {
    R.B(0, -7.4, 24.4, 14.6, 0, CRUST, { g: 'bCrust' });
    R.E(0, -14.6, 13.6, 7, 0, CRUST, { g: 'bCrust' });
    R.B(0, -7.6, 20.6, 11.4, 0, CRUMB, { g: 'bCrumb', flat: 1 });
    R.E(0, -14, 11.2, 5.2, 0, CRUMB, { g: 'bCrumb', flat: 1 });
    R.stamp(-5, -9, ['c...c', '..c..', 'c....'], { c: '#e2c48e' }); R.stamp(3, -5, ['c..c', '.c..'], { c: '#e2c48e' });
    R.chain([[8.6, -21.6], [11.6, -22.4], [11.6 + s.sw * .4, -25.4]], [1.6, 1.4, 1.1], KB, { g: 'cTail' });
    R.E(0, -25.6, 10.2, 6.2, 0, KW, R.pat({ g: 'cBody', alts: [KB], alt: blobs([[4.4, -28.4, 4, 2.8, 0], [-6.4, -24.4, 2.8, 2.4, 0]]) }));
    R.E(-3.4, -20.2, 2, 1.2, 0, KW, { g: 'cPaw', ol: 1 }); R.E(2, -20.2, 2, 1.2, 0, KW, { g: 'cPaw2', ol: 1 });
    const hx = -.4, hy = -29.6;
    R.P([[hx - 5, hy - 1.4], [hx - 4.2, hy - 7.6], [hx - 1, hy - 3.8]], KB, { g: 'cEar' }); R.P([[hx + 1, hy - 3.8], [hx + 4.4, hy - 7.8], [hx + 5, hy - 1.4]], KW, { g: 'cEar' });
    R.P([[hx + 2, hy - 3.6], [hx + 3.8, hy - 6.2], [hx + 4, hy - 2.4]], EARP, { g: 'cEarIn', flat: 1, cast: 0 });
    R.E(hx, hy, 5.4, 4.6, 0, KW, R.pat({ g: 'cHead', alts: [KB], alt: blobs([[hx - 3, hy - 2.6, 3.2, 2.8, 0]]) }));
    catFace(R, hx, hy - .2, { eyes: s.cblink ? 'cShut' : 'cHappy', sp: 2.4, wl: 4, nose: '#f08a9a', ny: 2.2 });
  }
  return {
    title: '동네 제빵사', hero: '달걀 같은 몸 · 높은 요리사 모자 · 밀대 · 밀가루 묻은 코', catName: '콩떡', catDesc: '식빵 위에서 "식빵 굽는" 젖소 고양이', carry: '빵 위에 태우기', body: '달걀',
    point: '게임의 "빵 굽기" 연출과 바로 이어지는 조합', bg: '#f3a578', tint, ox: 62, oy: 150, sc: 1.2, shadows: [[70, 150, 24, 3.4], [127, 150, 19, 3]],
    swatch: ['#f3a578', '#f8f2e6', '#8a5a3a', '#c97a32', '#2c282f'],
    layers: s => [{ fn: R => cat(R, s), x: 126 }, { fn: R => hero(R, s), cast: false }],
    back: (pb, s) => {
      for (let i = 0; i < 14; i++) { const x = mod(hash1(i + 3) * 160 + Math.sin((s.t + i * .1) * TAU) * 2, 160), y = mod(hash1(i + 33) * 160 - s.t * 10, 160); pb.px(x, y, '#fbe2cc'); }
      const k = s.t * TAU; for (let j = 0; j < 2; j++) { const bx = 120 + j * 8; for (let i = 0; i < 5; i++) pb.px(bx + Math.round(Math.sin(k + i * .9 + j) * 1.4), 112 - i * 2 - Math.round(s.t * 6) % 2, '#fde9da'); }
    },
  };
})());

/* ---------- 프레임 ---------- */
function edState(f) { const g = f % ED_F, t = g / ED_F; return { f: g, t, sw: Math.sin(t * TAU), by: (g % 8) >= 4 ? -1 : 0, blink: g === 11, cblink: g === 5 }; }
function edFrame(i, f) {
  const D = ED_DESIGNS[i], s = edState(f), out = new PB(EW, EH);
  out.d.fill(C(D.bg));
  if (D.back) D.back(out, s);
  const shc = mix(D.bg, D.tint, .45);
  for (const e of D.shadows || []) out.ellipse(e[0], e[1], e[2], e[3], shc);
  const chr = new PB(EW, EH), sty = D.style || ED;
  let n = 0;
  for (const L of D.layers(s)) {
    const pb = hiBake(EW, EH, L.x ?? D.ox, L.y ?? D.oy, R => { if (D.sc) R.scl(D.sc); L.fn(R); }, sty);
    if (n++ && L.cast !== false) pbCast(chr, pb, D.tint, .42, sty.castR);
    pbOver(chr, pb);
  }
  pbOver(out, chr);
  if (D.front) D.front(out, s);
  grain(out, .045, i * 37 + 11);
  return out;
}
