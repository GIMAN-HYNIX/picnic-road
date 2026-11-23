'use strict';
/* =========================================================
   컨셉아트북 장면: 지역 다섯 곳 (비 / 갠 뒤), 지도, 표지, 게임 화면, 사냥 콘티
   480×270, 화면 픽셀 좌표
   ========================================================= */
const RW = 480, RH = 270;
AB.R = [];
AB.HK = .36;   // 장면 속 방랑자 크기

/* ── 1. 안개 숲 ── */
AB.R[0] = function (clear, o = {}) {
  const pb = new PB(RW, RH);
  const K = clear ? {
    sky: [[0, '#f6e7bd'], [.6, '#ead39a'], [1, '#d2b97e']], fog: '#f1dca2', far: '#b9a679', mid: '#806c4e', near: '#4c3a2c', bark: '#3a2a20',
    floor: '#8d8048', floor2: '#76703e', path: '#cdab72', path2: '#b48f5c', fern: '#5c8c3c', moss: '#7ea44a', tint: '#5a3a1a'
  } : {
    sky: [[0, '#adbcb7'], [.6, '#96a8a3'], [1, '#7f928d']], fog: '#a2b3ae', far: '#71877f', mid: '#4f635b', near: '#2f3631', bark: '#252a26',
    floor: '#4b5b48', floor2: '#3f4f3e', path: '#7d735a', path2: '#6a624c', fern: '#3d6646', moss: '#4b6f3f', tint: '#1e2a34'
  };
  const T = edPal(K.tint);
  AB.sky(pb, K.sky);
  // 먼 줄기 (선 없음, 안개 많이)
  const far = AB.layer(RW, RH, R => {
    const r = RNG(11);
    for (let i = 0; i < 15; i++) { const x = 6 + i * 33 + r() * 16; R.K2(x, 196, x + (r() - .5) * 5, -10, 4.5 + r() * 4, 3.5, T(K.far), { g: 'f' + i }); }
  }, AB_FAR);
  AB.fog(far, K.fog, .5, .3, 0, 200); AB.over(pb, far);
  AB.mist(pb, 150, 46, K.fog, .85, 3);
  // 중간 줄기
  const mid = AB.layer(RW, RH, R => {
    [[78, 206, 14], [152, 212, 11], [214, 204, 16], [338, 210, 12], [404, 206, 15]].forEach(([x, y, r], i) => AB.trunk(R, x, y, r, r * .78, T(K.mid), { bark: T(mix(K.mid, '#0a0a0a', .2)), g: 'm' + i, nr: 3, moss: T(K.moss) }));
    R.K2(214, 70, 262, 58, 3.4, 2, T(K.mid), { g: 'br' }); R.K2(262, 58, 286, 62, 2, 1.4, T(K.mid), { g: 'br' });
  }, abLine(mix(INK, K.fog, .5)));
  AB.fog(mid, K.fog, .36, .18, 0, 220); AB.over(pb, mid);
  // 안개 올빼미의 단서: 가지 위 둥근 안개 덩어리와 졸린 두 눈
  if (!clear && o.owl !== false) {
    const ow = AB.layer(RW, RH, R => { R.E(266, 46, 13, 12, 0, T(mix(K.fog, '#ffffff', .2)), { g: 'ow' }); R.P([[256, 38], [255, 30], [261, 36]], T(mix(K.fog, '#ffffff', .2)), { g: 'ow' }); R.P([[276, 38], [277, 30], [271, 36]], T(mix(K.fog, '#ffffff', .2)), { g: 'ow' }); }, AB_FAR);
    AB.fog(ow, K.fog, .45); AB.over(pb, ow);
    for (const ex of [261, 271]) { pb.rect(ex - 2, 44, 4, 1, '#5a6a66'); pb.rect(ex - 1, 45, 3, 1, '#f2e2a0'); }
  }
  AB.mist(pb, 206, 22, K.fog, .55, 9);
  // 땅과 길
  const ground = AB.layer(RW, RH, R => {
    R.P([[0, 200], [RW, 196], [RW, RH], [0, RH]], T(K.floor), R.pat({ g: 'gr', flat: 1, alts: [T(K.floor2)], alt: (x, y) => (vnoise(x * .05, y * .14, 4) > .56 ? 0 : -1) }));
    R.P([[246, 201], [266, 201], [306, 226], [352, 270], [168, 270], [226, 226]], T(K.path), R.pat({ g: 'path', flat: 1, alts: [T(K.path2)], alt: (x, y) => (vnoise(x * .12, y * .3, 8) > .62 ? 0 : -1) }));
  }, AB_FAR);
  AB.fog(ground, K.fog, .45, 0, 196, 262); AB.over(pb, ground);
  // 웅덩이 (하늘빛)
  const pud = [[300, 246, 18, 4], [232, 232, 10, 2.6], [276, 262, 22, 5]];
  const inPud = (x, y) => pud.some(p => ((x - p[0]) / p[2]) ** 2 + ((y - p[1]) / p[3]) ** 2 <= 1);
  for (const p of pud) { pb.ellipse(p[0], p[1], p[2] + 1, p[3] + 1, mix(K.path2, '#000000', .25)); pb.ellipse(p[0], p[1], p[2], p[3], mix(K.fog, K.sky[0][1], .5)); }
  // 방랑자와 솔
  if (o.hero !== false) {
    const h = AB.hero(AB.HK, o.f || 0), hx = 262, hy = 240;
    AB.shadow(pb, hx + 1, hy, 13, 2.6, .3);
    const hl = new PB(RW, RH); AB.put(hl, h, hx, hy);
    AB.reflect(pb, hl, hy + 3, K.fog, .35, inPud, 0, 0);
    AB.put(pb, h, hx, hy);
  }
  if (!clear) { AB.rings(pb, 30, 4, [210, 228, 110, 40, inPud], '#e8f0f4', .5); }
  // 가까운 층: 양옆 거대한 줄기, 고사리
  const near = AB.layer(RW, RH, R => {
    AB.trunk(R, 30, 262, 42, 32, T(K.near), { bark: T(K.bark), moss: T(K.moss), g: 'n0', nr: 5, mossH: 120 });
    AB.trunk(R, 456, 270, 36, 28, T(K.near), { bark: T(K.bark), moss: T(K.moss), g: 'n1', nr: 5, mossH: 100 });
    AB.fern(R, 112, 272, 48, T(K.fern, .14), 3); AB.fern(R, 392, 274, 56, T(K.fern, .14), 5); AB.fern(R, 176, 274, 30, T(K.fern, .1), 8, { n: 5 });
    AB.fern(R, 350, 276, 26, T(K.fern, .1), 9, { n: 5 });
    AB.rock(R, 196, 262, 9, 5, T(mix(K.floor, '#8a8a80', .4)), 'rk', { moss: T(K.moss) });
  });
  AB.over(pb, near);
  if (clear) {
    // 빛줄기, 꽃, 반짝이는 회중시계
    AB.shaft(pb, [[150, 0], [196, 0], [318, 270], [256, 270]], '#fff6d6', .3, .08);
    AB.shaft(pb, [[300, 0], [326, 0], [420, 270], [384, 270]], '#fff6d6', .22, .05);
    const r = RNG(21); for (let i = 0; i < 90; i++) { const x = r() * RW, y = 214 + r() * 56; if (inPud(x, y)) continue; const c = ['#f6e8f0', '#f4c0c8', '#fff0a0', '#ffffff'][i % 4]; pb.px(x, y, c); pb.px(x + 1, y, c); }
    for (let i = 0; i < 40; i++) { const x = 140 + r() * 260, y = 20 + r() * 200; pb.tint(x, y, .6, '#fffbe8'); }
    AB.spark(pb, 214, 254, '#fff6c8', true);
  } else {
    AB.rain(pb, { n: 520, len: 13, seed: 5, slant: -.26 });
    AB.splash(pb, 60, 6, [60, 214, 360, 52]);
  }
  grain(pb, .035, 101);
  return pb;
};

// 꺾은선 위의 점 (t: 0~1, 길이 기준)과 진행 방향
function along(P, t) {
  const seg = []; let tot = 0;
  for (let i = 0; i < P.length - 1; i++) { const l = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); seg.push(l); tot += l; }
  let d = clamp(t, 0, 1) * tot;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) { const u = Math.min(1, d / (seg[i] || 1)); return { x: lerp(P[i][0], P[i + 1][0], u), y: lerp(P[i][1], P[i + 1][1], u), a: Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]) }; }
    d -= seg[i];
  }
}
// 널빤지 길 (나무 데크, 잔교, 출렁다리). 반폭 w0 → w1, 두께 th. 널 사이가 선으로 나뉨
AB.planks = function (R, path, w0, w1, n, P, Pside, g, th = 3) {
  const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, p = along(path, t), w = lerp(w0, w1, t), nx = -Math.sin(p.a), ny = Math.cos(p.a); pts.push({ t, x: p.x, y: p.y, nx, ny, w }); }
  const side = [], top = [];
  for (const q of pts) { side.push([q.x + q.nx * q.w, q.y + q.ny * q.w + th * (1 - q.t * .5)]); top.push([q.x + q.nx * q.w, q.y + q.ny * q.w]); }
  R.P(top.concat(side.slice().reverse()), Pside, { g: g + 's', flat: 0 });
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[i + 1], gap = .12;
    const ax = lerp(a.x, b.x, gap), ay = lerp(a.y, b.y, gap), anx = a.nx, any = a.ny;
    R.P([[ax - anx * a.w, ay - any * a.w], [b.x - b.nx * b.w, b.y - b.ny * b.w], [b.x + b.nx * b.w, b.y + b.ny * b.w], [ax + anx * a.w, ay + any * a.w]], i % 3 === 1 ? [P[0], mix(P[1], '#000000', .08)] : P, { g: g + i, ol: 1 });
  }
  return pts;
};

/* ── 2. 젖은 늪 ── */
AB.R[1] = function (clear, o = {}) {
  const pb = new PB(RW, RH), WL = 150;
  const K = clear ? {
    sky: [[0, '#f7d8a2'], [.7, '#efcfa0'], [1, '#d9d2ac']], fog: '#f2d8aa', water: '#7f9e94', water2: '#c8c8a4', far: '#9aa47c', shell: '#7a7448', moss: '#8aaa52', skin: '#8a9468',
    wood: '#5a4a36', leaf: '#86a85a', mud: '#7a6a4a', reed: '#8a9a52', boat: '#9a6a44', lily: '#6c9c4c', plank: '#a8865c', side: '#6a5038', tint: '#5a3a1a'
  } : {
    sky: [[0, '#8fa29e'], [.7, '#7e938f'], [1, '#71877f']], fog: '#90a49f', water: '#3f5753', water2: '#6a827d', far: '#56706a', shell: '#4a5238', moss: '#5f7f42', skin: '#5a6650',
    wood: '#363a2e', leaf: '#4f6a44', mud: '#43483a', reed: '#566a3e', boat: '#5e4634', lily: '#4a7444', plank: '#6a5642', side: '#3e3226', tint: '#1e2a34'
  };
  const T = edPal(K.tint);
  AB.sky(pb, K.sky, 0, WL); AB.sky(pb, [[0, K.water2], [1, K.water]], WL, RH, 6);
  const far = AB.layer(RW, RH, R => { const r = RNG(31), pts = [[0, WL]]; for (let x = 0; x <= RW; x += 10) pts.push([x, WL - 14 - r() * 12 - (Math.sin(x * .021) + 1) * 8]); pts.push([RW, WL]); R.P(pts, T(K.far), { g: 'tl', flat: 1 }); }, AB_FAR);
  AB.fog(far, K.fog, .5); AB.over(pb, far); AB.reflect(pb, far, WL, K.water, .4, null, 1, 1, 200);
  AB.mist(pb, WL - 8, 18, K.fog, .7, 5);
  // 거북 섬: 등딱지에 이끼와 작은 버드나무, 물 위로 졸린 머리
  const tu = AB.layer(RW, RH, R => {
    R.E(124, WL + 4, 78, 32, 0, T(K.shell), R.pat({ g: 'sh', alts: [T(mix(K.shell, '#000000', .22)), T(K.moss)], alt: (x, y) => (y < WL - 20 + vnoise(x * .07, 1, 2) * 10 ? 1 : AB.vor(x, y * 1.8, 22, 22, 3) < .1 ? 0 : -1) }));
    AB.willow(R, 108, WL - 25, 54, T(K.wood), T(K.leaf), 7);
    AB.tuft(R, 152, WL - 22, 8, T(K.moss), 2); AB.tuft(R, 78, WL - 17, 7, T(K.moss), 3);
    R.K2(194, WL, 210, WL - 9, 6.4, 5.6, T(K.skin), { g: 'th' }); R.E(216, WL - 12, 8.4, 6.6, -.08, T(K.skin), { g: 'th', ol: 1 });
    R.stamp(218, WL - 15, ['LLL', '.wP'], { L: INK, w: '#e8e0c8', P: '#1b1214' }, 1, 0); R.stamp(223, WL - 12, ['n'], { n: '#2a2a20' });
  }, abLine(mix(INK, K.fog, .35)));
  AB.clipBelow(tu, WL + 2); AB.fog(tu, K.fog, .2); AB.over(pb, tu); AB.reflect(pb, tu, WL + 2, K.water, .32, null, 1.5, 2, 215);
  // 진흙 둔덕 위 버드나무
  const wi = AB.layer(RW, RH, R => {
    R.E(378, 168, 44, 6, 0, T(K.mud), { g: 'bank' });
    AB.willow(R, 378, 166, 124, T(K.wood), T(K.leaf), 3);
    AB.tuft(R, 344, 166, 10, T(K.reed), 4); AB.tuft(R, 408, 167, 12, T(K.reed), 5);
  }, abLine(mix(INK, K.fog, .28)));
  AB.fog(wi, K.fog, .12); AB.over(pb, wi); AB.reflect(pb, wi, 169, K.water, .3, null, 1.5, 3);
  // 반쯤 잠긴 나룻배 (갠 뒤에는 떠오름)
  const bt = AB.layer(RW, RH, R => AB.boat(R, clear ? 300 : 292, clear ? 182 : 186, 24, T(K.boat), 'bt', clear ? .02 : -.24));
  AB.clipBelow(bt, clear ? 186 : 188); AB.over(pb, bt); AB.reflect(pb, bt, clear ? 186 : 188, K.water, .35, null, 1, 4);
  // 연잎
  const deck = [[-24, 262], [110, 236], [190, 218], [262, 204]];
  const lil = AB.layer(RW, RH, R => {
    const r = RNG(41);
    for (let i = 0; i < 30; i++) { const x = r() * RW, y = 186 + r() * 84; const dp = along(deck, clamp((x + 24) / 290, 0, 1)); if (x < 280 && Math.abs(y - dp.y) < 22) continue; AB.lily(R, x, y, 4 + r() * 8 * (y - 160) / 110, T(K.lily, .1), 'ly' + i); }
  }, abLine(mix(INK, K.water, .35)));
  AB.over(pb, lil);
  if (clear) { const r = RNG(42); for (let i = 0; i < 9; i++) { const x = 290 + r() * 180, y = 196 + r() * 70; pb.ellipse(x, y - 2, 2.4, 1.6, '#f4a6bc'); pb.px(x, y - 3, '#fff0f4'); } }
  // 나무 데크 + 말뚝
  const dk = AB.layer(RW, RH, R => {
    const pts = AB.planks(R, deck, 15, 6, 30, T(K.plank, .12), T(K.side), 'dk', 4);
    for (let i = 2; i < pts.length; i += 5) { const q = pts[i]; R.K2(q.x + q.nx * q.w - 2, q.y + q.ny * q.w + 2, q.x + q.nx * q.w - 2, q.y + q.ny * q.w + 14 * (1 - q.t * .5), 1.8 * (1 - q.t * .4), 1.6, T(K.side), { g: 'post' + i }); }
  }, abLine(INK));
  AB.over(pb, dk);
  const hp = along(deck, .62), h = AB.hero(AB.HK, o.f || 0);
  if (o.hero !== false) {
    const hl = new PB(RW, RH); AB.put(hl, h, hp.x, hp.y + 1);
    AB.reflect(pb, hl, hp.y + 9, K.water, .38, (x, y) => !(dk.d[y * RW + x] >>> 24) && !(lil.d[y * RW + x] >>> 24), 1, 5);
    AB.shadow(pb, hp.x + 1, hp.y + 1, 12, 2.4, .25);
    AB.put(pb, h, hp.x, hp.y + 1);
  }
  // 가까운 갈대
  const near = AB.layer(RW, RH, R => {
    const r = RNG(51);
    for (let i = 0; i < 14; i++) { const x = 400 + r() * 90, L = 40 + r() * 46, lean = (r() - .5) * 10; R.K2(x, 272, x + lean, 272 - L, 1.3, .8, T(K.reed), { g: 'rd' + i }); if (i % 2) R.K2(x + lean * .92, 272 - L * .92, x + lean * .78, 272 - L * .72, 2.4, 2.4, T('#6a4a2e'), { g: 'ct' + i, ol: 1 }); }
    AB.lily(R, 60, 262, 18, T(K.lily, .12), 'lyN');
  });
  AB.over(pb, near);
  if (clear) {
    AB.shaft(pb, [[60, 0], [120, 0], [260, WL], [180, WL]], '#fff2cc', .22, .06);
    AB.ripple(pb, 50, 6, [0, WL + 4, RW, 110], '#fff4d8', .28);
  } else {
    AB.rings(pb, 90, 6, [0, WL + 6, RW, 120, (x, y) => !(dk.d[y * RW + x] >>> 24)], '#cfdde0', .4);
    AB.rain(pb, { n: 480, len: 12, seed: 15 });
  }
  grain(pb, .035, 102);
  return pb;
};

/* ── 3. 이끼 폐허 ── */
AB.R[2] = function (clear, o = {}) {
  const pb = new PB(RW, RH), GY = 198;
  const K = clear ? {
    sky: [[0, '#edf1e2'], [1, '#cfdcc4']], fog: '#e2e9d6', hill: '#a9b896', tile: '#5c6670', tile2: '#4a525c', moss: '#82ac4c', wood: '#8a5a3a', wall: '#a49680', stone: '#8c8676',
    jar: '#7a4a2e', ground: '#8a8a62', ground2: '#76784e', dog: '#6e9a48', dog2: '#5a8640', tint: '#3a3a1a'
  } : {
    sky: [[0, '#6e7887'], [1, '#5b6572']], fog: '#76818d', hill: '#55606b', tile: '#3c444e', tile2: '#323942', moss: '#56763c', wood: '#5a4232', wall: '#706858', stone: '#625e54',
    jar: '#553828', ground: '#4b5142', ground2: '#41473a', dog: '#4e6e3c', dog2: '#405e32', tint: '#1e2434'
  };
  const T = edPal(K.tint);
  AB.sky(pb, K.sky);
  const far = AB.layer(RW, RH, R => {
    const r = RNG(61), pts = [[0, 170]]; for (let x = 0; x <= RW; x += 16) pts.push([x, 120 + Math.sin(x * .012 + 1) * 18 + r() * 6]); pts.push([RW, 170]); R.P(pts, T(K.hill), { g: 'hl', flat: 1 });
  }, AB_FAR);
  AB.fog(far, K.fog, .4); AB.over(pb, far);
  AB.mist(pb, 166, 22, K.fog, .7, 7);
  // 돌담, 솟을대문
  const mid = AB.layer(RW, RH, R => {
    const stone = (x0, x1) => {
      R.P([[x0, GY - 30], [x1, GY - 30], [x1, GY], [x0, GY]], T(K.wall), R.pat({ g: 'wl' + x0, alts: [T(K.stone, .1), T(K.moss)], alt: (x, y) => { if (y < GY - 22 && vnoise(x * .1, y * .2, 3) > .55) return 1; const row = Math.floor((y - GY) / 6), u = mod(x + (row % 2) * 5, 10); return (u > 1.2 && mod(y - GY, 6) > 1) ? 0 : -1; } }));
      R.P([[x0 - 3, GY - 30], [x1 + 3, GY - 30], [x1, GY - 36], [x0, GY - 36]], T(K.tile), R.pat({ g: 'wt' + x0, ol: 1, alts: [T(K.moss)], alt: (x, y) => (vnoise(x * .15, 2, x0) > .6 ? 0 : -1) }));
    };
    stone(-10, 128); stone(214, 330);
    R.B(140, GY - 26, 7, 52, 0, T(K.wood), { g: 'pl1', ol: 1 }); R.B(202, GY - 26, 7, 52, 0, T(K.wood), { g: 'pl2', ol: 1 });
    R.P([[144, GY - 50], [171, GY - 50], [171, GY], [144, GY]], T(K.wood), R.pat({ g: 'd1', ol: 1, alts: [T(mix(K.wood, '#000000', .25))], alt: x => (mod(x, 6) < 1 ? 0 : -1) }));
    R.P([[176, GY - 49], [196, GY - 47], [196, GY + 1], [176, GY]], T(mix(K.wood, '#000000', .1)), R.pat({ g: 'd2', ol: 1, alts: [T(mix(K.wood, '#000000', .3))], alt: x => (mod(x, 6) < 1 ? 0 : -1) }));
    R.P([[171, GY - 50], [176, GY - 49], [176, GY], [171, GY]], [mix(K.wood, '#000000', .7), mix(K.wood, '#000000', .6)], { g: 'gap', flat: 0 });
    R.B(171, GY - 54, 70, 6, 0, T(K.wood), { g: 'lin', ol: 1 });
    AB.roof(R, 171, GY - 58, 46, 24, T(K.tile2), T(K.tile), 'rf', T(K.moss));
    for (let i = 0; i < 9; i++) { const x = 128 + i * 11 + (i % 3) * 2, L = 6 + (i * 7) % 11; R.K2(x, GY - 60 + Math.abs(x - 171) * .25, x + 1, GY - 60 + Math.abs(x - 171) * .25 + L, 1.2, .6, T(K.moss), { g: 'mo' + i }); }
    // 장독대
    R.B(380, GY + 10, 96, 12, 0, T(K.stone), { g: 'jp', ol: 1 });
    [[346, 1.1], [368, 1.35], [392, 1.2], [414, 1.0], [360, .8], [404, .85]].forEach(([x, s], i) => AB.jar(R, x, GY + 6 - (i > 3 ? 7 : 0), 20 * s, T(K.jar, .16), 'jar' + i));
  }, abLine(mix(INK, K.fog, .25)));
  AB.fog(mid, K.fog, .14); AB.over(pb, mid);
  // 땅
  const gr = AB.layer(RW, RH, R => {
    R.P([[0, GY], [RW, GY], [RW, RH], [0, RH]], T(K.ground), R.pat({ g: 'gd', flat: 1, alts: [T(K.ground2)], alt: (x, y) => (vnoise(x * .06, y * .15, 9) > .55 ? 0 : -1) }));
    for (let i = 0; i < 6; i++) R.E(250 + i * 34, 214 + i * 9, 11 - i * .4, 3.6, 0, T(K.stone), { g: 'ss' + i, flat: 1 });
  }, AB_FAR);
  AB.over(pb, gr);
  const pud = [[300, 236, 20, 4], [120, 222, 14, 3]], inPud = (x, y) => pud.some(p => ((x - p[0]) / p[2]) ** 2 + ((y - p[1]) / p[3]) ** 2 <= 1);
  for (const p of pud) pb.ellipse(p[0], p[1], p[2], p[3], mix(K.fog, K.sky[0][1], .4));
  // 문 앞에서 기다리는 이끼 큰개 (엎드려 고개를 든 채 졸고 있음)
  const dog = AB.layer(RW, RH, R => {
    const D = T(K.dog), D2 = T(K.dog2), fur = (sd) => R.pat({ g: 'dg', alts: [D2], alt: (x, y) => (vnoise(x * .22, y * .22, sd) > .6 ? 0 : -1) });
    R.chain([[122, GY + 8], [108, GY + 2], [104, GY - 8], [110, GY - 14]], [5, 4.4, 3.6, 2.8], D, { g: 'tl', ol: 1 });
    R.E(142, GY - 1, 24, 15, 0, D, fur(5)); R.E(172, GY + 3, 36, 13, 0, D, fur(5)); R.E(204, GY - 3, 17, 17, 0, D, fur(5));
    R.K2(198, GY + 10, 226, GY + 14, 5.4, 4.8, D, { g: 'lg1', ol: 1 }); R.E(230, GY + 14, 8, 4.6, 0, D, { g: 'pw1', ol: 1 });
    R.K2(208, GY + 6, 234, GY + 8, 5, 4.4, D2, { g: 'lg2', ol: 1 }); R.E(238, GY + 8, 7.6, 4.4, 0, D2, { g: 'pw2', ol: 1 });
    R.E(222, GY - 25, 14, 12, 0, D, R.pat({ g: 'hd', ol: 1, alts: [D2], alt: (x, y) => (vnoise(x * .3, y * .3, 6) > .62 ? 0 : -1) }));
    R.E(238, GY - 20, 9.6, 6.8, .08, T(mix(K.dog, '#c8d8b0', .25)), { g: 'sn', ol: 1 });
    R.E(212, GY - 21, 5.4, 11, .35, D2, { g: 'ear', ol: 1 });
    for (let k = 0; k < 5; k++) R.K2(196 + k * 6, GY + 10, 197 + k * 6, GY + 15 + (k % 2) * 3, 1.3, .6, D2, { g: 'mh' + k });
    R.stamp(228, GY - 29, ['LLL', '.wP'], { L: INK, w: '#e8f0d8', P: '#1b1214' }, 1, 0); R.stamp(246, GY - 23, ['NN', 'NN'], { N: '#2a2420' });
    R.DL(240, GY - 15, 246, GY - 16, '#2a2420');
    R.E(212, GY - 9, 3.4, 4, 0, ['#8a6a2a', '#c8a040'], { g: 'tag', ol: 1 });
  }, abLine(mix(INK, K.fog, .15)));
  AB.over(pb, dog);
  // 우물
  const near = AB.layer(RW, RH, R => {
    R.K2(56, 214, 56, 252, 2.4, 2.4, T(K.wood), { g: 'wp1', ol: 1 }); R.K2(112, 214, 112, 252, 2.4, 2.4, T(K.wood), { g: 'wp2', ol: 1 }); R.K2(52, 214, 116, 214, 2.4, 2.4, T(K.wood), { g: 'wb', ol: 1 });
    R.B(84, 248, 54, 22, 0, T(K.stone), R.pat({ g: 'wl', ol: 1, alts: [T(K.moss)], alt: (x, y) => (vnoise(x * .2, y * .2, 4) > .58 ? 0 : -1) }));
    R.E(84, 237, 27, 5, 0, [mix(K.stone, '#000000', .6), mix(K.stone, '#000000', .5)], { g: 'wi' });
    R.DL(84, 214, 84, 226, '#2a2018'); R.B(84, 229, 8, 7, 0, T(K.wood), { g: 'bk', ol: 1 });
    AB.tuft(R, 34, 262, 14, T(K.moss, .1), 7); AB.tuft(R, 140, 266, 12, T(K.moss, .1), 8); AB.tuft(R, 452, 268, 16, T(K.moss, .1), 9);
  });
  if (o.hero !== false) { const h = AB.hero(AB.HK, o.f || 0), hx = 356, hy = 252; AB.shadow(pb, hx, hy, 12, 2.4, .3); AB.put(pb, h, hx, hy, true); }
  AB.over(pb, near);
  if (clear) {
    AB.shaft(pb, [[260, 0], [310, 0], [250, GY], [190, GY]], '#ffffff', .25, .05);
    const r = RNG(71); for (let i = 0; i < 70; i++) { const x = r() * RW, y = GY + 4 + r() * 70; if (inPud(x, y)) continue; pb.px(x, y, ['#f6f0a0', '#ffffff', '#f0b8c0'][i % 3]); }
  } else {
    for (let i = 0; i < 18; i++) { const x = 122 + i * 6.4, y0 = GY - 58 + Math.abs(x - 171) * .26 + 2; for (let y = y0; y < GY + 10; y += 7) AB.tline(pb, x, y, x, y + 3, '#d8e4ec', .4); }
    AB.rain(pb, { n: 900, len: 17, seed: 25, slant: -.22, t: .3, t2: .5 });
    AB.splash(pb, 120, 26, [0, GY + 2, RW, 70]);
    AB.rings(pb, 20, 27, [100, 216, 230, 26, inPud]);
  }
  grain(pb, .035, 103);
  return pb;
};

/* ── 4. 비구름 산 ── */
AB.R[3] = function (clear, o = {}) {
  const pb = new PB(RW, RH);
  const K = clear ? {
    sky: [[0, '#7fb2df'], [.7, '#b8d6ee'], [1, '#d6e6f2']], fog: '#d4e4f0', far: '#8aa4c0', mid: '#5e7c8e', cliff: '#6a7a7e', cliff2: '#56666a', cloud: '#fbfcfe', cloud2: '#dfe8f2',
    fall: '#eef6fb', pine: '#b45a3e', needle: '#3e6a4c', rope: '#9a7650', plank: '#8a6844', tint: '#2a3a5a'
  } : {
    sky: [[0, '#79849d'], [.6, '#8d97ad'], [1, '#a2abbd']], fog: '#9aa3b6', far: '#69728b', mid: '#4f5869', cliff: '#4a5160', cliff2: '#3e4452', cloud: '#d6dce6', cloud2: '#aab3c2',
    fall: '#dfe8f0', pine: '#9a4c38', needle: '#344c40', rope: '#7a6044', plank: '#5e4a36', tint: '#1e2434'
  };
  const T = edPal(K.tint);
  AB.sky(pb, K.sky);
  const far = AB.layer(RW, RH, R => { R.P([[0, 170], [40, 118], [90, 132], [150, 92], [200, 120], [250, 104], [310, 128], [370, 96], [430, 122], [480, 110], [480, 200], [0, 200]], T(K.far), { g: 'fr', side: .55 }); }, AB_FAR);
  AB.fog(far, K.fog, .45); AB.over(pb, far);
  // 능선에 엎드려 자는 구름 곰 (머리는 왼쪽, 앞발에 턱을 괴고)
  const bear = AB.layer(RW, RH, R => {
    const CL = [K.cloud2, K.cloud];
    [[258, 100, 46, 22], [304, 90, 50, 28], [350, 98, 40, 22], [226, 112, 30, 12], [306, 114, 70, 14], [380, 108, 26, 14]].forEach(b => R.E(b[0], b[1], b[2], b[3], 0, CL, { g: 'cb' }));
    R.E(170, 78, 9, 9, 0, CL, { g: 'e1', ol: 1 }); R.E(206, 76, 9, 9, 0, CL, { g: 'e2', ol: 1 });
    R.E(188, 98, 28, 23, 0, CL, { g: 'hd', ol: 1 });
    R.E(176, 122, 15, 7, 0, CL, { g: 'p1', ol: 1 }); R.E(206, 121, 15, 7, 0, CL, { g: 'p2', ol: 1 });
    R.E(186, 110, 12, 8, 0, [K.cloud2, mix(K.cloud, '#ffffff', .3)], { g: 'mz', ol: 1 });
    R.stamp(186, 105, ['NNN', '.N.'], { N: '#5a6070' }, 1, 0);
    R.stamp(176, 94, ['L..L', '.LL.'], { L: '#5a6070' }, 2, 0); R.stamp(198, 94, ['L..L', '.LL.'], { L: '#5a6070' }, 1, 0);
  }, abLine(mix(INK, K.fog, .55)));
  AB.over(pb, bear);
  if (!clear) for (let i = 0; i < 60; i++) { const x = 226 + (i * 37) % 170, y = 112 + (i * 13) % 20; AB.tline(pb, x, y, x - 4, y + 22 + (i % 5) * 6, '#7e889e', .35); }
  const mid = AB.layer(RW, RH, R => { R.P([[0, 200], [60, 150], [120, 168], [200, 140], [280, 166], [360, 146], [430, 170], [480, 156], [480, 240], [0, 240]], T(K.mid), { g: 'md', side: .6 }); }, AB_FAR);
  AB.fog(mid, K.fog, .3); AB.over(pb, mid);
  AB.mist(pb, 196, 30, K.fog, .8, 11);
  // 절벽 두 개, 폭포, 출렁다리, 적송
  const cl = AB.layer(RW, RH, R => {
    const strata = (x, y) => (mod(y + Math.sin(x * .05) * 4, 11) < 1.3 ? 0 : -1);
    R.P([[0, 128], [22, 133], [40, 126], [70, 136], [90, 131], [108, 132], [112, 140], [128, 140], [132, 134], [150, 141], [176, 146], [171, 172], [166, 204], [158, 238], [150, 270], [0, 270]], T(K.cliff), R.pat({ g: 'cL', side: .78, alts: [T(K.cliff2)], alt: strata }));
    R.P([[328, 152], [346, 146], [362, 141], [380, 134], [400, 137], [420, 130], [440, 128], [462, 124], [480, 122], [480, 270], [346, 270], [339, 240], [334, 208], [330, 180]], T(K.cliff), R.pat({ g: 'cR', sideL: .14, alts: [T(K.cliff2)], alt: strata }));
    R.P([[112, 140], [128, 140], [130, 270], [110, 270]], T(K.fall, .2), R.pat({ g: 'wf', alts: [[mix(K.fall, '#8aa0b8', .3), K.fall]], alt: (x, y) => (mod(y + x * 3, 9) < 2 ? 0 : -1) }));
    AB.fir(R, 30, 130, 26, T(K.needle), 'f1'); AB.fir(R, 52, 134, 20, T(K.needle), 'f2'); AB.fir(R, 154, 144, 22, T(K.needle), 'f3');
    AB.pine(R, 400, 134, 104, T(K.pine, .14), T(K.needle), 21); AB.pine(R, 456, 126, 76, T(K.pine, .14), T(K.needle), 22);
  }, abLine(mix(INK, K.fog, .3)));
  AB.over(pb, cl);
  const br = [];
  for (let i = 0; i <= 12; i++) { const u = i / 12; br.push([lerp(174, 334, u), lerp(146, 152, u) + 20 * (1 - (2 * u - 1) ** 2)]); }
  const bl = AB.layer(RW, RH, R => {
    AB.planks(R, br, 3.2, 3.2, 22, T(K.plank, .1), T(mix(K.plank, '#000000', .3)), 'bp', 2);
    const rail = br.map(p => [p[0], p[1] - 9]);
    for (let i = 0; i < rail.length - 1; i++) { R.DL(rail[i][0], rail[i][1], rail[i + 1][0], rail[i + 1][1], K.rope); if (i % 2 === 0) R.DL(rail[i][0], rail[i][1], br[i][0], br[i][1], K.rope); }
  }, abLine(INK));
  AB.over(pb, bl);
  if (o.hero !== false) { const hp = along(br, .55), h = AB.hero(.3, o.f || 0); AB.put(pb, h, hp.x, hp.y - 1); }
  AB.mist(pb, 262, 34, K.fog, .9, 13);
  if (clear) { AB.shaft(pb, [[380, 0], [440, 0], [300, 270], [230, 270]], '#ffffff', .2, .04); for (let i = 0; i < 8; i++) AB.spark(pb, 118 + (i * 5) % 12, 170 + i * 11, '#ffffff'); }
  else AB.rain(pb, { n: 520, len: 13, seed: 35 });
  grain(pb, .035, 104);
  return pb;
};

/* ── 5. 근원의 호수 ── */
AB.R[4] = function (clear, o = {}) {
  const pb = new PB(RW, RH), WL = 146;
  const K = clear ? {
    sky: [[0, '#f5d6cf'], [.55, '#f2e2e2'], [1, '#dde6f4']], fog: '#f0e0e4', water: '#c8cfe6', shore: '#b8aec8', isl: '#8e84a4', tree: '#fbf8f4', whaleT: .78,
    umb: ['#d87a6a', '#e8c050', '#7a9ac8', '#e8e0d0'], pier: '#8a7472', pside: '#5e4c50', tint: '#5a3a5a'
  } : {
    sky: [[0, '#8a80a6'], [.55, '#a397bd'], [1, '#bdb2d0']], fog: '#b0a5c8', water: '#8c80ae', shore: '#6c628e', isl: '#544a6e', tree: '#e8e2ec', whaleT: .6,
    umb: ['#b0605c', '#c8a048', '#5e7aa8', '#d0c8c0'], pier: '#5e4e5a', pside: '#3e3240', tint: '#2a1e3a'
  };
  const T = edPal(K.tint);
  AB.sky(pb, K.sky, 0, WL);
  // 하늘을 헤엄치는 비고래 (흐릿하게)
  const wh = AB.layer(RW, RH, R => {
    const WP = T(mix(K.sky[1][1], '#3a3050', .42));
    R.E(232, 66, 158, 32, -.05, WP, { g: 'w' });
    R.P([[378, 56], [424, 28], [446, 36], [416, 62], [448, 88], [430, 94], [378, 76]], WP, { g: 'w' });
    R.P([[196, 90], [226, 122], [240, 94]], WP, { g: 'w' });
    for (let k = 0; k < 5; k++) R.W(110 + k * 16, 84 - k * .8, 170 + k * 18, 88 - k * .8, mix(K.sky[1][1], '#ffffff', .25));
    R.stamp(104, 68, ['.LLLL.', 'LwPPwL', '.LLLL.'], { L: '#3a3050', P: '#2a2040', w: '#e8e4f4' }, 3, 0);
  }, AB_FAR);
  AB.fog(wh, K.sky[1][1], K.whaleT); AB.over(pb, wh);
  if (!clear) for (let i = 0; i < 26; i++) { const x = 120 + (i * 41) % 230, y = 84 + (i * 7) % 10; AB.tline(pb, x, y, x - 2, y + 12 + (i % 4) * 8, mix(K.sky[1][1], '#5a5070', .5), .3); }
  const sh = AB.layer(RW, RH, R => { R.P([[0, WL], [0, 132], [60, 126], [120, 134], [180, 130], [300, 136], [380, 128], [440, 132], [480, 126], [480, WL]], T(K.shore), { g: 'sh', flat: 1 }); }, AB_FAR);
  AB.fog(sh, K.fog, .35); AB.over(pb, sh);
  // 죽은 나무 섬
  const is = AB.layer(RW, RH, R => {
    R.E(240, WL + 1, 30, 6, 0, T(K.isl), { g: 'is' });
    const br = (x, y, a, L, r, d) => { const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L; R.K2(x, y, ex, ey, r, r * .65, T(K.tree, .1), { g: 'tr' }); if (d > 0) { br(ex, ey, a - .45, L * .7, r * .65, d - 1); br(ex, ey, a + .4, L * .66, r * .65, d - 1); } };
    br(240, WL - 3, -Math.PI / 2 - .05, 22, 2.6, 3);
  }, abLine(mix(INK, K.fog, .3)));
  AB.clipBelow(is, WL + 2); AB.over(pb, is);
  // 거울 같은 물
  AB.sky(pb, [[0, K.water], [1, mix(K.water, '#2a2440', .2)]], WL, RH, 5);
  const above = AB.copy(pb); for (let y = WL; y < RH; y++) for (let x = 0; x < RW; x++) above.d[y * RW + x] = 0;
  AB.reflect(pb, above, WL, K.water, .22, null, .6, 6);
  AB.ripple(pb, 40, 8, [0, WL + 3, RW, 120], mix(K.fog, '#ffffff', .4), .3);
  // 떠다니는 우산과 등
  const fl = AB.layer(RW, RH, R => {
    [[88, 190, 14, 0, -.2], [176, 172, 9, 1, .15], [300, 184, 12, 2, .3], [400, 168, 8, 3, -.1], [60, 236, 18, 1, .25]].forEach(([x, y, s, c, a], i) => AB.umbrella(R, x, y, s, T(K.umb[c], .14), 'u' + i, a));
    [[140, 200], [228, 182], [350, 206], [420, 196], [262, 164]].forEach(([x, y], i) => { R.B(x, y - 3, 5, 6, 0, ['#8a5a2a', '#f0b850', '#fff2c0'], { g: 'ln' + i, ol: 1 }); R.E(x, y, 4, 1.4, 0, T('#6a4a3a'), { g: 'lb' + i }); });
  }, abLine(mix(INK, K.water, .2)));
  AB.over(pb, fl);
  for (const [x, y] of [[140, 197], [228, 179], [350, 203], [420, 193], [262, 161]]) AB.glow(pb, x, y, 9, '#ffe2a0', .5);
  // 잔교
  const pier = [[500, 258], [420, 232], [346, 212]];
  const pl = AB.layer(RW, RH, R => {
    const pts = AB.planks(R, pier, 13, 7, 18, T(K.pier, .1), T(K.pside), 'pr', 4);
    for (let i = 1; i < pts.length; i += 4) { const q = pts[i]; R.K2(q.x + q.nx * q.w, q.y + q.ny * q.w + 3, q.x + q.nx * q.w, q.y + q.ny * q.w + 18, 2, 1.8, T(K.pside), { g: 'pp' + i }); }
  }, abLine(INK));
  AB.over(pb, pl);
  if (o.hero !== false) {
    const hp = along(pier, .93), h = AB.hero(AB.HK, o.f || 0, { view: 'back' }), c = AB.sol(.86, 'sit');
    AB.shadow(pb, hp.x, hp.y, 11, 2.2, .25); AB.put(pb, h, hp.x - 4, hp.y); AB.put(pb, c, hp.x + 9, hp.y + 1);
  }
  if (clear) { AB.shaft(pb, [[180, 0], [300, 0], [330, WL], [150, WL]], '#fff8f0', .18, .05); AB.rise(pb, 30, 9, [20, 60, 440, 190], '#ffffff'); }
  else AB.rise(pb, 240, 9, [0, 20, RW, 240], '#fbf8ff');
  grain(pb, .035, 105);
  return pb;
};

/* ── 지도: 네 지역이 가운데 호수를 둘러쌈. 이름은 HTML 로 얹음 ── */
AB.MAPLAB = [[1, '안개 숲', .2, .86], [2, '젖은 늪', .8, .86], [3, '이끼 폐허', .8, .14], [4, '비구름 산', .2, .14], [5, '근원의 호수', .5, .64]];
AB.map = function () {
  const W = 480, H = 300, pb = new PB(W, H), T = edPal('#4a3a2a'), ink = '#3a2a1e';
  AB.sky(pb, [[0, '#e6dcc0'], [1, '#d6caa8']], 0, H, 5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = vnoise(x * .02, y * .02, 4); if (n > .66) pb.tint(x, y, (n - .66) * 1.1, '#8e9ca6'); }
  const blob = (cx, cy, rx, ry, col, t, sd) => { for (let y = cy - ry * 1.4; y < cy + ry * 1.4; y++) for (let x = cx - rx * 1.4; x < cx + rx * 1.4; x++) { const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (vnoise(x * .05, y * .05, sd) - .5) * .9; if (q < 1 && bay(x, y) < .85) pb.tint(x, y, t, col); } };
  blob(110, 225, 100, 62, '#6e8a6a', .4, 1); blob(370, 225, 100, 62, '#5e8a86', .4, 2); blob(370, 78, 100, 60, '#7a8a52', .4, 3); blob(110, 78, 100, 60, '#6e7a96', .42, 4);
  const L = AB.layer(W, H, R => {
    const lake = []; for (let a = 0; a < TAU; a += .2) { const r = 1 + Math.sin(a * 3 + 1) * .12 + Math.sin(a * 5) * .06; lake.push([240 + Math.cos(a) * 64 * r, 152 + Math.sin(a) * 40 * r]); }
    R.P(lake, T('#a89cc4'), R.pat({ g: 'lake', flat: 1, alts: [T('#c4b8dc')], alt: (x, y) => (mod(y, 6) < 1 && mod(x + y, 9) < 5 ? 0 : -1) }));
    R.E(244, 150, 7, 3.6, 0, T('#6a5a7a'), { g: 'isl', flat: 1 }); R.K2(244, 149, 244, 140, .7, .5, ['#f4f0f0', '#f4f0f0'], { g: 'dt', flat: 1 });
    const r = RNG(5);
    for (let i = 0; i < 16; i++) { const x = 40 + r() * 150, y = 200 + r() * 70; AB.fir(R, x, y, 10 + r() * 5, T('#4e6a52'), 'tr' + i); }
    for (let i = 0; i < 9; i++) { const x = 300 + r() * 150, y = 210 + r() * 60; R.E(x, y, 8 + r() * 6, 2.4, 0, T('#7aa8a4'), { g: 'pd' + i, flat: 1 }); AB.tuft(R, x + 6, y, 5, T('#5a7a4a'), i); }
    [[330, 70], [372, 58], [410, 76], [356, 96], [430, 104]].forEach(([x, y], i) => { R.B(x, y + 4, 12, 7, 0, T('#a08a6a'), { g: 'hw' + i, flat: 1 }); AB.roof(R, x, y, 8, 5, T('#4a5258'), T('#5a6268'), 'hr' + i); });
    [[60, 92, 34], [96, 74, 44], [140, 96, 30], [176, 84, 24]].forEach(([x, y, h], i) => R.P([[x - h * .7, y + 10], [x, y - h * .8], [x + h * .7, y + 10]], T('#6a7490'), { g: 'pk' + i, side: .55 }));
    [[70, 40], [120, 34], [160, 46]].forEach(([x, y], i) => { R.E(x, y, 14, 6, 0, T('#f0f2f6'), { g: 'cl' + i, flat: 1 }); R.E(x + 9, y - 3, 9, 6, 0, T('#f0f2f6'), { g: 'cl' + i, flat: 1 }); });
  }, abLine(ink));
  AB.over(pb, L);
  const river = (pts, sd) => { for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]]; for (let t = 0; t < 1; t += .02) { const x = lerp(a[0], b[0], t) + Math.sin((i + t) * 5 + sd) * 2, y = lerp(a[1], b[1], t); pb.px(x, y, '#5a7aa0'); pb.px(x + 1, y, '#7a9ac0'); } } };
  river([[150, 100], [184, 124], [196, 140]], 1); river([[330, 104], [300, 126], [286, 140]], 2); river([[120, 200], [170, 180], [196, 166]], 3); river([[360, 196], [310, 180], [290, 168]], 4);
  const dash = (pts) => { let k = 0; for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], n = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let t = 0; t < n; t++, k++) if (k % 7 < 4) { const x = lerp(a[0], b[0], t / n), y = lerp(a[1], b[1], t / n); pb.px(x, y, '#8a3a26'); pb.px(x, y + 1, '#8a3a26'); } } };
  dash([[96, 246], [170, 268], [260, 262], [330, 252], [380, 236], [420, 200], [424, 150], [410, 116], [380, 100], [300, 54], [220, 44], [150, 52], [110, 64], [80, 100], [120, 128], [174, 140], [190, 148]]);
  // 출발점 텐트, 번호
  pb.poly([[84, 252], [96, 236], [108, 252]], '#c8a060'); pb.line(84, 252, 96, 236, ink); pb.line(96, 236, 108, 252, ink); pb.hl(84, 108, 252, ink); pb.line(96, 240, 96, 252, '#5a3a1e');
  [[1, 64, 238], [2, 436, 238], [3, 436, 56], [4, 44, 56], [5, 240, 112]].forEach(([n, x, y]) => AB.badge(pb, x, y, n, n === 5 ? '#c8b8e8' : '#e0b032'));
  // 나침반, 테두리, 비 빗금
  pb.line(450, 268, 450, 248, ink); pb.poly([[446, 252], [450, 244], [454, 252]], ink); pb.px(449, 241, ink); pb.px(451, 241, ink); pb.px(450, 240, ink);
  pb.frame(6, 6, W - 12, H - 12, ink); pb.frame(9, 9, W - 18, H - 18, ink);
  for (let i = 0; i < 40; i++) { const x = 14 + (i * 53) % 450, y = 14 + (i * 31) % 270; if (Math.hypot(x - 240, y - 152) < 90) continue; pb.line(x, y, x - 2, y + 5, '#8e9cb0'); }
  grain(pb, .03, 77);
  return pb;
};

/* ── 텐트: 바깥, 안쪽 단면 ── */
AB.tentOut = function () {
  const W = 240, H = 150, pb = new PB(W, H), GY = 120, T = edPal('#1e2434');
  AB.sky(pb, [[0, '#3c475a'], [1, '#56627a']], 0, GY, 6);
  const far = AB.layer(W, H, R => { const r = RNG(3); for (let i = 0; i < 8; i++) { const x = 8 + i * 31 + r() * 10; R.K2(x, GY, x, -5, 5 + r() * 4, 4, T('#2e3a40'), { g: 'f' + i }); } }, AB_FAR);
  AB.fog(far, '#56627a', .45); AB.over(pb, far);
  const gr = AB.layer(W, H, R => R.P([[0, GY], [W, GY], [W, H], [0, H]], T('#3a4434'), R.pat({ g: 'g', flat: 1, alts: [T('#323b2e')], alt: (x, y) => (vnoise(x * .08, y * .2, 2) > .55 ? 0 : -1) })), AB_FAR);
  AB.over(pb, gr);
  pb.ellipse(150, 134, 30, 4, '#56627a'); pb.ellipse(70, 140, 16, 2.6, '#56627a');
  const CAN = T('#b09a68', .14), CAN2 = T('#8e7a52');
  const tent = AB.layer(W, H, R => {
    R.P([[96, 52], [158, 60], [206, GY - 2], [146, GY]], CAN2, R.pat({ g: 'sd', alts: [T('#7a6844')], alt: x => (mod(x, 9) < 1 ? 0 : -1) }));
    R.K2(140, 62, 146, 34, 2, 2, T('#3a3a42', .2), { g: 'pp', ol: 1 }); R.B(146, 32, 7, 3, 0, T('#3a3a42'), { g: 'pc', ol: 1 });
    R.P([[46, GY], [96, 50], [146, GY]], CAN, { g: 'fr', ol: 1 });
    R.P([[80, GY], [96, 76], [112, GY]], ['#a05a20', '#f0b050', '#ffe8a8'], { g: 'door', ol: 1 });
    R.K2(28, 66, 28, GY, 1.2, 1.2, T('#6a4a2e'), { g: 'p1', ol: 1 }); R.K2(62, 74, 62, GY + 6, 1.2, 1.2, T('#6a4a2e'), { g: 'p2', ol: 1 });
    R.P([[96, 50], [26, 64], [28, 68], [62, 74], [100, 58]], T('#5a6a4a', .12), { g: 'tarp', ol: 1 });
    R.K2(206, 80, 232, 76, .5, .5, ['#2a2018', '#2a2018'], { g: 'ln' }); R.K2(232, 76, 232, GY + 4, 1.2, 1.2, T('#6a4a2e'), { g: 'p3', ol: 1 });
    R.P([[210, 80], [222, 79], [226, 98], [208, 99]], WPAL.PON, { g: 'pon', ol: 1 });
    R.E(228, 84, 5, 2, 0, WPAL.HAT, { g: 'hat', ol: 1 });
  }, abLine(INK));
  AB.over(pb, tent);
  AB.glow(pb, 96, 104, 26, '#ffd890', .4);
  const lamp = AB.layer(W, H, R => { R.DL(44, 67, 44, 72, '#2a2018'); R.B(44, 76, 5, 7, 0, ['#5a4020', '#f0c050', '#fff2c0'], { g: 'lp', ol: 1 }); });
  AB.over(pb, lamp); AB.glow(pb, 44, 77, 18, '#ffe0a0', .45);
  const c = AB.sol(2.2, 'sit'); AB.put(pb, c, 118, GY);
  for (let i = 0; i < 4; i++) pb.ellipse(150 + i * 3, 26 - i * 7, 3 + i, 2 + i * .6, mix('#56627a', '#c8d0dc', .5 - i * .1));
  const dry = new PB(W, H); dry.poly([[26, 64], [96, 50], [146, GY + 2], [26, GY + 2]], '#ffffff'); dry.poly([[46, GY + 2], [96, 50], [140, 52], [146, GY + 2]], '#ffffff');
  const before = AB.copy(pb);
  AB.rain(pb, { n: 260, len: 9, seed: 31 }); AB.splash(pb, 40, 32, [0, GY + 2, W, 28]);
  for (let i = 0; i < pb.d.length; i++) if (dry.d[i] >>> 24) pb.d[i] = before.d[i];
  for (const x of [210, 216, 222]) { pb.px(x, 103, '#a8c0d8'); pb.px(x + 1, 108, '#a8c0d8'); }
  grain(pb, .04, 61);
  return pb;
};
AB.TENTLAB = [[1, '난로', '우비와 솔을 말려요'], [2, '빨랫줄', '모자와 우비를 걸어요'], [3, '수집품 벽', '모은 물건이 쌓이면 텐트가 도감이 돼요'], [4, '솔 자리', '방석 위에서 털을 말려요'], [5, '작업대', '지도와 등불, 다음 길을 고르는 곳'], [6, '침낭', '자고 나면 하루가 지나요']];
AB.tentIn = function () {
  const W = 240, H = 150, pb = new PB(W, H), GY = 126, T = edPal('#3a2418');
  pb.d.fill(C('#1e2430'));
  const L = AB.layer(W, H, R => {
    R.P([[16, GY], [120, 14], [224, GY]], T('#b09a68', .14), { g: 'out', ol: 1 });
    R.P([[28, GY], [120, 28], [212, GY]], T('#6a5040'), R.pat({ g: 'in', flat: 1, alts: [T('#5e4638')], alt: x => (mod(x, 10) < 1 ? 0 : -1) }));
    R.P([[16, GY], [224, GY], [224, GY + 8], [16, GY + 8]], T('#5a4232'), { g: 'fl', ol: 1 });
    R.P([[34, GY], [206, GY], [200, GY + 4], [40, GY + 4]], T('#8a3a2e'), R.pat({ g: 'rug', alts: [T('#c8a050')], alt: x => (mod(x, 8) < 2 ? 0 : -1) }));
    R.B(56, GY - 9, 18, 14, 0, T('#3a3a42', .2), { g: 'st', ol: 1 }); R.B(56, GY - 9, 7, 6, 0, ['#c85a20', '#ffb040'], { g: 'fire' }); R.K2(60, GY - 16, 60, 70, 1.6, 1.6, T('#3a3a42'), { g: 'pipe', ol: 1 }); R.K2(60, 70, 72, 52, 1.6, 1.6, T('#3a3a42'), { g: 'pipe', ol: 1 });
    R.E(50, GY - 19, 5, 3.4, 0, T('#5a6a7a'), { g: 'kt', ol: 1 });
    R.K2(80, 52, 166, 52, .4, .4, ['#2a2018', '#2a2018'], { g: 'line' });
    R.P([[90, 52], [104, 52], [110, 76], [86, 76]], WPAL.PON, { g: 'pon', ol: 1 }); R.E(124, 56, 7, 2.6, 0, WPAL.HAT, { g: 'hat', ol: 1 }); R.B(144, 58, 4, 9, 0, T('#a83a2a'), { g: 'sk', ol: 1 }); R.B(152, 58, 4, 9, 0, T('#d8c8a0'), { g: 'sk2', ol: 1 });
    R.E(108, GY - 3, 13, 4, 0, T('#a83a2e', .1), { g: 'cush', ol: 1 });
    R.B(156, GY - 9, 22, 16, 0, T('#8a6a44', .12), R.pat({ g: 'cr', ol: 1, alts: [T('#6a5034')], alt: (x, y) => (mod(y, 6) < 1 ? 0 : -1) })); R.P([[146, GY - 18], [164, GY - 18], [166, GY - 16], [148, GY - 16]], T('#e8dcc0'), { g: 'map', ol: 1 }); R.B(162, GY - 22, 4, 6, 0, ['#5a4020', '#f0c050', '#fff2c0'], { g: 'lp', ol: 1 });
    R.K2(178, GY - 4, 204, GY - 4, 5, 5, T('#4a5a74', .12), R.pat({ g: 'bag', ol: 1, alts: [T('#3a4a62')], alt: x => (mod(x, 6) < 1 ? 0 : -1) }));
    [[176, 84, '#d8b040'], [186, 96, '#f0e8d4'], [170, 100, '#c8bca8']].forEach(([x, y, c], i) => R.B(x, y, 7, 7, (i - 1) * .15, T(c, .1), { g: 'it' + i, ol: 1 }));
  }, abLine(INK));
  AB.over(pb, L);
  const c = AB.sol(2, 'loaf', {}); AB.put(pb, c, 108, GY - 4);
  AB.glow(pb, 56, GY - 9, 22, '#ffb860', .35); AB.glow(pb, 162, GY - 22, 26, '#ffe0a0', .35);
  [[1, 56, 100], [2, 84, 44], [3, 196, 78], [4, 108, 140], [5, 156, 98], [6, 214, 112]].forEach(([n, x, y]) => AB.badge(pb, x, y, n));
  grain(pb, .04, 62);
  return pb;
};

/* ── 사냥 콘티 5칸 (160×96) ── */
AB.BOARD = [['흔적 찾기', '진흙 발자국과 쓰러진 풀로 방향을 읽어요. 솔이 냄새를 맡아요.'], ['살금살금', '빗소리가 발소리를 덮어 줘요. 고사리 뒤에 몸을 낮춰요.'], ['솔이 먼저', '방랑자는 멈추고 솔이 풀숲으로 들어가요. 언제 들어갈지는 플레이어가 골라요.'], ['냥냥펀치', '짧은 한 방. 물그림자가 물로 돌아가요.'], ['식빵 굽기', '솔이 그 자리에서 쉬어요. 운이 좋으면 온전한 잊힌 물건이 남아요.']];
AB.board = function (i) {
  const W = 160, H = 96, GY = 74, pb = new PB(W, H), T = edPal('#1e2a34'), clearC = i === 4;
  AB.sky(pb, [[0, '#a6b6b2'], [1, '#8a9e99']], 0, GY, 5);
  const far = AB.layer(W, H, R => { const r = RNG(i + 3); for (let k = 0; k < 6; k++) { const x = 8 + k * 30 + r() * 12; R.K2(x, GY, x, -4, 4 + r() * 3, 3, T('#6a7e78'), { g: 'f' + k }); } }, AB_FAR);
  AB.fog(far, '#a2b3ae', .45); AB.over(pb, far);
  pb.rect(0, GY, W, H - GY, '#4b5b48'); pb.dith(0, GY, W, H - GY, '#3f4f3e', .35);
  const M = AB.MON[0], mouse = (x, y, k) => { const b = hiBake(W, H, x, y, R => { R.scl(k); M.body(R); }, abLine(WINK)), o = hiBake(W, H, x, y, R => { R.scl(k); M.obj(R); }, ED); seeThrough(b, o, .55); pbOver(pb, b); };
  if (i === 0) {
    for (let k = 0; k < 6; k++) { const x = 70 + k * 14, y = 84 - k * 1.6; pb.ellipse(x, y, 2, 1, '#2e3a2c'); pb.ellipse(x + 4, y + 2, 2, 1, '#2e3a2c'); }
    AB.put(pb, AB.hero(.3, 0, { cat: false }), 40, 86); AB.put(pb, AB.sol(.95, 'side', { pose: 'stand', sniff: 1 }), 66, 88);
  } else if (i === 1) {
    AB.put(pb, AB.hero(.3, 0, { cat: false }), 70, 92); AB.put(pb, AB.sol(.95, 'side', { pose: 'walk', p: .25 }), 104, 90);
    const f = AB.layer(W, H, R => { AB.fern(R, 66, 98, 40, T('#3d6646', .14), 4, { n: 9 }); }); AB.over(pb, f);
  } else if (i === 2) {
    mouse(128, 84, 1.3); pb.ellipse(128, 85, 12, 2, '#6a8288');
    const g = AB.layer(W, H, R => { for (let k = 0; k < 40; k++) AB.tuft(R, 20 + k * 2.4, 92, 18 + (k % 3) * 4, T('#4e7a4a'), k, 'gt'); });
    AB.over(pb, g); pb.rect(76, 66, 2, 3, '#978672'); pb.rect(80, 66, 2, 3, '#978672'); pb.px(77, 65, '#544a40');
    for (let k = 0; k < 4; k++) pb.px(60 - k, 70 - k * 2, '#544a40');
  } else if (i === 3) {
    mouse(110, 86, 2.4); AB.put(pb, AB.sol(2.4, 'punch'), 62, 92);
    const r = RNG(9); for (let k = 0; k < 14; k++) { const a = -Math.PI / 2 + (r() - .5) * 2.4, d = 8 + r() * 14; pb.ellipse(100 + Math.cos(a) * d, 66 + Math.sin(a) * d, 1.4, 1.4, '#cfe2f0'); }
  } else {
    AB.shaft(pb, [[60, 0], [110, 0], [120, H], [50, H]], '#fff2c8', .4, .2);
    pb.ellipse(86, 86, 14, 3, '#7a8a7a'); AB.put(pb, AB.sol(2, 'loaf', {}), 86, 86);
    const o = hiBake(W, H, 118, 88, R => { R.scl(1.8); M.obj(R); }, ED); pbOver(pb, o); AB.spark(pb, 120, 74, '#fffbe0', true);
    AB.put(pb, AB.hero(.3, 0, { cat: false }), 22, 92);
  }
  if (!clearC) AB.rain(pb, { n: 110, len: 8, seed: 20 + i });
  else { const before = AB.copy(pb); AB.rain(pb, { n: 110, len: 8, seed: 24 }); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.abs(x - 86) < 34 + (H - y) * .1) pb.d[y * W + x] = before.d[y * W + x]; }
  grain(pb, .04, 50 + i);
  return pb;
};

/* ── 게임 화면 목업 (위에서 비스듬히 보는 시점) ── */
AB.game = function () {
  const pb = new PB(RW, RH), T = edPal('#1e2a34');
  const gr = AB.layer(RW, RH, R => {
    R.P([[0, 0], [RW, 0], [RW, RH], [0, RH]], T('#4a5a44'), R.pat({ g: 'g', flat: 1, alts: [T('#3e4e3a'), T('#56664a')], alt: (x, y) => { const n = vnoise(x * .04, y * .05, 3); return n > .62 ? 0 : n < .3 ? 1 : -1; } }));
    const path = [[120, 280], [180, 200], [250, 150], [330, 110], [420, -10]];
    for (let k = 0; k < 60; k++) { const p = along(path, k / 60); R.E(p.x, p.y, 22, 12, 0, T('#7a6e54'), { g: 'path', flat: 1 }); }
  }, AB_FAR);
  AB.over(pb, gr);
  const pud = [[300, 168, 22, 7], [150, 238, 16, 5]], inPud = (x, y) => pud.some(p => ((x - p[0]) / p[2]) ** 2 + ((y - p[1]) / p[3]) ** 2 <= 1);
  for (const p of pud) { pb.ellipse(p[0], p[1], p[2] + 1, p[3] + 1, '#3a4436'); pb.ellipse(p[0], p[1], p[2], p[3], '#8ea4a8'); }
  const tr = [[70, 110, 26], [400, 210, 30], [40, 250, 22], [450, 60, 20], [230, 40, 18]];
  for (const [x, y, r] of tr) AB.shadow(pb, x + r * .8, y + 4, r * 1.6, r * .5, .3);
  const L = AB.layer(RW, RH, R => {
    for (const [x, y, r] of tr) AB.trunk(R, x, y, r, r * .85, T('#3a3a30'), { bark: T('#2a2a24'), moss: T('#4b6f3f'), g: 't' + x, nr: 5, top: -40 });
    AB.fern(R, 120, 120, 26, T('#3d6646', .14), 2); AB.fern(R, 360, 250, 30, T('#3d6646', .14), 3); AB.fern(R, 470, 140, 22, T('#3d6646', .14), 5);
    AB.rock(R, 338, 178, 8, 5, T('#6a6a60'), 'rk', { moss: T('#4b6f3f') });
  });
  const M = AB.MON[0], b = hiBake(RW, RH, 318, 166, R => { R.scl(1.2); M.body(R); }, abLine(WINK)), o = hiBake(RW, RH, 318, 166, R => { R.scl(1.2); M.obj(R); }, ED); seeThrough(b, o, .55);
  AB.over(pb, b);
  AB.put(pb, AB.hero(.3, 0, { cat: false }), 236, 176); AB.put(pb, AB.sol(.86, 'side', { pose: 'walk', p: .3 }), 258, 172);
  AB.over(pb, L);
  AB.spark(pb, 84, 140, '#fff6c8', true); AB.spark(pb, 412, 238, '#fff6c8');
  AB.rings(pb, 30, 3, [130, 160, 200, 90, inPud], '#e8f0f4', .5);
  AB.rain(pb, { n: 420, len: 10, seed: 41 });
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) { const v = Math.hypot((x - 240) / 240, (y - 135) / 135); if (v > .82) pb.tint(x, y, Math.min(.45, (v - .82) * 1.2), '#141822'); }
  grain(pb, .035, 70);
  return pb;
};

/* ── 표지: 안개 숲 + 크게 선 방랑자 (16장 반복) ── */
let _coverBg = null;
AB.cover = function (f) {
  if (!_coverBg) _coverBg = AB.R[0](false, { hero: false });
  const pb = AB.copy(_coverBg), h = AB.hero(1.12, f, { grain: false });
  AB.shadow(pb, 344, 264, 34, 4, .35); AB.put(pb, h, 342, 265);
  return pb;
};
