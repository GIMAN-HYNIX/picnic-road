'use strict';
/* =========================================================
   거리 레이어: 건물 정면 + 땅 + 보도 위 소품
   층 높이 34px · 1층 166~200 · 2층 132~166 · 3층 98~132
   ========================================================= */
const F1 = 166, F2 = 132, F3 = 98;

function gapShadow(pb, x0, x1, top) { for (let x = x0; x < x1; x++) for (let y = top; y < 200; y++) pb.px(x, y, (x - x0) < 2 ? '#2c2a30' : '#3b3940'); }

/* ---------- 0. 우체국 ---------- */
function bPostOffice(pb) {
  const x = 2, w = 188, r = RNG(101), wall = '#e9e1d1';
  wallTile(pb, x, 116, w, 84, wall, 101); parapet(pb, x, 108, w, '#d8cfbe');
  for (let i = x + 2; i < x + w - 2; i += 6) pb.vl(i, 100, 107, '#7d8387'); pb.hl(x + 2, x + w - 3, 100, '#a3a9ad'); pb.hl(x + 2, x + w - 3, 104, '#8d9397');
  antenna(pb, x + 26, 100, 16); dish(pb, x + 52, 95); tank(pb, x + 150, 85, 12, 14, '#3f8f6b'); pb.rect(x + 100, 92, 22, 8, '#c9c4b8'); pb.hl(x + 100, x + 121, 92, '#ddd8cc'); for (let i = 0; i < 4; i++) pb.vl(x + 103 + i * 5, 94, 98, '#9a958a');
  for (let i = 0; i < 5; i++) win(pb, x + 12 + i * 36, 124, 20, 18, { frame: PAL.frameA, wall, blinds: i % 2 ? .55 : 0, lit: i === 3, curtain: false, plant: i === 1 ? 1 : 0, r });
  // 간판 띠
  const sy = 151; dropShadow(pb, x, sy, w, 14);
  pb.rect(x, sy, w, 14, '#c8392f'); pb.hl(x, x + w - 1, sy, '#e2604f'); pb.hl(x, x + w - 1, sy + 13, '#86231c'); pb.hl(x, x + w - 1, sy + 1, '#d44a3d');
  const ex = x + 58, ey = sy + 3; pb.rect(ex, ey, 13, 8, '#fbf6ec'); pb.line(ex, ey, ex + 6, ey + 4, '#c8392f'); pb.line(ex + 12, ey, ex + 6, ey + 4, '#c8392f'); pb.hl(ex, ex + 12, ey + 7, '#d9d2c4');
  pb.text('우체국', x + 98, sy + 1, F11B, '#ffffff', 'center', '#86231c');
  pb.text('POST OFFICE', x + w - 7, sy + 4, F7, '#f8d3cb', 'right');
  // 1층 유리
  shopGlass(pb, x + 8, 170, 62, 27, { lit: true, r });
  pb.rect(x + 10, 188, 58, 4, '#9b7a55'); pb.hl(x + 10, x + 67, 188, '#c09a6c'); pb.rect(x + 16, 182, 5, 6, '#3d4a52'); pb.px(x + 18, 183, '#9fe0f0'); // 번호표 기계
  for (let i = 0; i < 3; i++) { const px = x + 30 + i * 12; pb.rect(px, 174, 8, 10, pick(['#f4efe6', '#e9d9b0', '#d9e6ee'])); pb.hl(px + 1, px + 6, 176, '#c8392f'); pb.hl(px + 1, px + 5, 178, '#7d8387'); pb.hl(px + 1, px + 6, 180, '#7d8387'); }
  // 자동문
  const dx = x + 78; pb.rect(dx - 1, 169, 36, 31, '#4a5056'); for (let k = 0; k < 2; k++) { const gx = dx + 1 + k * 17; for (let j = 0; j < 29; j++) pb.hl(gx, gx + 15, 170 + j, PAL.glass[j < 8 ? 1 : j < 20 ? 2 : 1]); for (let j = 0; j < 29; j++) if ((j + k * 3) % 7 < 2) pb.tint(gx + 10 - Math.floor(j / 3), 170 + j, .25, '#ffffff'); }
  pb.vl(dx + 17, 170, 199, '#4a5056'); pb.rect(dx + 3, 181, 28, 10, '#f4efe6'); pb.text('자동문', dx + 17, 182, F7, '#3d4a52', 'center');
  pb.rect(dx - 3, 197, 40, 3, '#bdb7aa'); pb.hl(dx - 3, dx + 36, 197, '#d6d0c3');
  // 오른쪽 유리 (택배 상자)
  shopGlass(pb, x + 120, 170, 62, 27, { lit: true, r });
  for (let i = 0; i < 4; i++) { const bx = x + 124 + i * 13, bh = 6 + (i % 2) * 4; pb.rect(bx, 196 - bh, 11, bh, '#c49a62'); pb.hl(bx, bx + 10, 196 - bh, '#ddb57c'); pb.vl(bx + 5, 196 - bh, 195, '#e9dcc0'); }
  pb.rect(x, 197, w, 3, '#6f7376'); pb.hl(x, x + w - 1, 197, '#8d9194');
  // 화단
  pb.rect(x + 14, 192, 34, 6, '#7a5134'); pb.hl(x + 14, x + 47, 192, '#966645'); for (let i = 0; i < 34; i += 2) { pb.px(x + 14 + i, 191, '#4a7038'); pb.px(x + 15 + i, 190, pick(['#d9433b', '#f2c94c', '#e98fb0', '#ffffff', '#f2994a'])); pb.px(x + 14 + i, 189, '#5f8a48'); }
}

/* ---------- 1. 큰길 ---------- */
function bLaundry(pb) {
  const x = 192, w = 90, wall = '#a7c6b8', r = RNG(111);
  wallPlaster(pb, x, 124, w, 76, wall, 111, { stain: 3, crack: 1 }); parapet(pb, x, 118, w, '#94b3a5');
  tank(pb, x + 60, 102, 11, 14, '#3f8f6b'); clothesline(pb, x + 8, x + 50, 106, r); antenna(pb, x + 80, 118, 12);
  win(pb, x + 12, 132, 18, 15, { wall, guard: 2, plant: 1, r }); win(pb, x + 48, 132, 18, 15, { wall, lit: true, curtain: '#d98c78', r }); acUnit(pb, x + 74, 136, { pipe: 18 });
  sign(pb, x + 4, 152, 70, 12, '세탁소', '#2b5d8c', '#ffffff', { inner: '#5f8fbf' });
  shopGlass(pb, x + 6, 169, 54, 28, { lit: true, r });
  pb.hl(x + 8, x + 58, 172, '#8d8f8f');
  for (let i = 0; i < 9; i++) { const cx = x + 10 + i * 5.5, c = pick(['#f4efe6', '#9ec0d6', '#e7b8b0', '#3f4a5a', '#d9c27a']); pb.px(cx + 1, 173, '#8d8f8f'); pb.rect(cx, 174, 4, 9 + (i % 3) * 3, c); pb.vl(cx + 3, 174, 182, dk(c, .15)); pb.tintDith(cx, 174, 4, 12, .1, .3, '#ffffff'); }
  door(pb, x + 64, 172, 16, 28, '#d6dde0', { glass: true, wall }); pb.rect(x + 67, 186, 10, 3, '#2b5d8c');
  pb.rect(x + 86, 176, 4, 2, '#8d9397'); pb.rect(x + 88, 172, 2, 5, '#8d9397'); META.steams.push({ x: x + 89, y: 171, rate: 3 });
}
function bVilla(pb) {
  const x = 288, w = 104, r = RNG(121), wall = '#8c4836';
  wallBrick(pb, x, 98, w, 102, PAL.brickRed, 121); parapet(pb, x, 92, w, '#c9c1b2');
  for (const y of [131, 165]) { pb.hl(x, x + w - 1, y, '#c7bba8'); pb.hl(x, x + w - 1, y + 1, '#a89c88'); }
  tank(pb, x + 66, 74, 13, 16, '#3f8f6b'); dish(pb, x + 20, 86); clothesline(pb, x + 30, x + 58, 80, r); antenna(pb, x + 92, 92, 14);
  // 계단실과 입구
  for (const y of [106, 140]) win(pb, x + 10, y, 12, 12, { wall, frame: PAL.frameA, lit: y === 140, curtain: false, mull: false, r });
  pb.rect(x + 4, 166, 26, 3, '#c7c2b6'); pb.hl(x + 4, x + 29, 166, '#e0dbcf'); pb.tintDith(x + 4, 169, 26, 3, .35, .6);
  sign(pb, x + 5, 153, 24, 10, '물빛빌라', '#f4efe6', '#3a3a3a', { font: F7, screws: false });
  door(pb, x + 8, 172, 18, 28, '#c9cfd2', { glass: true, wall }); pb.rect(x + 9, 186, 16, 1, '#8d9397');
  // 집 창문
  for (const [y, f] of [[106, 3], [140, 2], [174, 1]]) {
    win(pb, x + 42, y, 18, 15, { wall, guard: f === 1 ? 2 : 0, lit: f === 2 && 1, curtain: f === 3 ? '#e6c9a8' : '#d98c78', r, plant: f === 3 ? 2 : 0 });
    win(pb, x + 72, y, 18, 15, { wall, guard: f === 1 ? 2 : 0, blinds: f === 2 ? .6 : 0, r });
    pb.rect(x + 41, y - 3, 20, 2, '#c7c2b6'); pb.rect(x + 71, y - 3, 20, 2, '#c7c2b6');
  }
  acUnit(pb, x + 93, 146, { pipe: 14 }); acUnit(pb, x + 93, 112, { pipe: 12 });
  gasPipe(pb, x + 99, 98, 199, [{ x: x + 94, y: 128, meter: 1 }, { x: x + 94, y: 162, meter: 1 }, { x: x + 94, y: 194, meter: 1 }]);
  dish(pb, x + 64, 120);
}
function bAlley(pb, x0, x1) {
  for (let x = x0; x < x1; x++) for (let y = 70; y < 200; y++) pb.px(x, y, mix('#46434b', '#2b2a30', (x - x0) / (x1 - x0) * .6 + (200 - y) / 300));
  for (let k = 0; k < 9; k++) pb.hl(x0 + 2, x1 - 2, 196 - k * 6, '#5a5760');
  pb.vl(x0 + 6, 120, 128, '#2a2a2a'); pb.px(x0 + 6, 129, '#ffe8a8'); META.bulbs.push({ x: x0 + 6.5, y: 130 });
}
function bBunsik(pb) {
  const x = 404, w = 84, wall = '#e6d3ad', r = RNG(131);
  wallPlaster(pb, x, 124, w, 76, wall, 131, { peel: 1, stain: 2 }); parapet(pb, x, 118, w, '#d4c099');
  potPlant(pb, x + 10, 118, 1); potPlant(pb, x + 16, 118, 2); onggi(pb, x + 70, 118, .8);
  win(pb, x + 14, 130, 20, 16, { wall, curtain: '#e8a4b0', r }); win(pb, x + 50, 130, 20, 16, { wall, lit: true, curtain: '#e8a4b0', silh: true, r }); acUnit(pb, x + 72, 134, { pipe: 10 });
  sign(pb, x + 6, 148, 72, 11, '분식', '#c8392f', '#f8d55a', { inner: '#e2604f' });
  pb.text('김밥 떡볶이 라면', x + 42, 160, F7, '#5a3a2a', 'center');
  awning(pb, x, 168, w, 6, '#d9433b', '#f4efe6');
  // 가게 안
  for (let y = 175; y < 200; y++) pb.hl(x + 3, x + w - 4, y, mix('#c8955a', '#7a5434', (y - 175) / 25));
  for (let i = 0; i < 4; i++) { pb.rect(x + 8 + i * 18, 178, 14, 5, '#f4efe6'); pb.hl(x + 9 + i * 18, x + 20 + i * 18, 180, '#c8392f'); }
  pb.rect(x + 3, 190, w - 6, 10, '#b9bec0'); pb.hl(x + 3, x + w - 4, 190, '#e3e7e8'); pb.hl(x + 3, x + w - 4, 191, '#cfd4d5');
  pb.ellipse(x + 20, 188, 7, 3, '#8e9497'); pb.hl(x + 13, x + 27, 186, '#c9cfd2'); pb.rect(x + 36, 185, 18, 4, '#3a3d40'); for (let i = 0; i < 16; i += 2) { pb.px(x + 37 + i, 185, '#d9433b'); pb.px(x + 38 + i, 186, '#e86b4a'); }
  pb.ellipse(x + 66, 188, 6, 3, '#8e9497'); pb.hl(x + 60, x + 72, 186, '#c9cfd2');
  META.steams.push({ x: x + 20, y: 184, rate: 4 }); META.steams.push({ x: x + 66, y: 184, rate: 3 });
  META.windows.push({ x: x + w / 2, y: 186, w: w - 6, h: 22, warm: 1 });
  pb.vl(x, 168, 199, '#6f6a60'); pb.vl(x + w - 1, 168, 199, '#6f6a60');
}
function bSalon(pb) {
  const x = 492, w = 70, wall = '#e3b5ad', r = RNG(141);
  wallPlaster(pb, x, 124, w, 76, wall, 141, { stain: 2 }); parapet(pb, x, 118, w, '#d2a39b');
  win(pb, x + 10, 130, 18, 16, { wall, flowerBox: true, r }); win(pb, x + 42, 130, 18, 16, { wall, blinds: .4, r });
  sign(pb, x + 4, 151, 62, 12, '미용실', '#c4527a', '#ffffff', { inner: '#e48aa8' });
  shopGlass(pb, x + 4, 169, 44, 28, { lit: true, r });
  for (let i = 0; i < 2; i++) { const cx = x + 10 + i * 20; pb.rect(cx, 173, 10, 12, '#dfe9ec'); pb.frame(cx, 173, 10, 12, '#b8c2c5'); pb.rect(cx + 2, 188, 6, 6, '#3a3d40'); pb.rect(cx + 1, 186, 8, 2, '#4a4d50'); }
  pb.rect(x + 7, 171, 8, 9, '#f4efe6'); pb.circle(x + 11, 174, 2, '#d9a37a'); pb.rect(x + 9, 172, 4, 2, '#3a2a22');
  door(pb, x + 51, 172, 13, 28, '#e9eef0', { glass: true, wall });
  META.barber = { x: x + 66, y: 172, h: 16 };
  pb.rect(x + 65, 170, 4, 2, '#c9cfd2'); pb.rect(x + 65, 188, 4, 2, '#c9cfd2');
}
function bSuper(pb) {
  const x = 566, w = 74, wall = '#b6cad6', r = RNG(151);
  wallPlaster(pb, x, 124, w, 76, wall, 151, { stain: 1 }); parapet(pb, x, 118, w, '#a3b8c5');
  tank(pb, x + 8, 104, 10, 12, '#3b78a8'); win(pb, x + 14, 130, 18, 16, { wall, lit: true, r }); win(pb, x + 46, 130, 18, 16, { wall, guard: 1, r });
  sign(pb, x + 4, 151, 66, 12, '슈퍼마켓', '#2f7a55', '#ffffff', { inner: '#5fa77f' });
  shopGlass(pb, x + 4, 169, 40, 28, { shelves: true, lit: true, r });
  door(pb, x + 48, 171, 18, 29, '#d9e1e4', { glass: true, wall });
  pb.rect(x + 68, 176, 6, 18, '#e9eef0'); pb.frame(x + 68, 176, 6, 18, '#9aa3a7'); for (let j = 0; j < 4; j++) pb.hl(x + 69, x + 72, 179 + j * 4, pick(['#d9433b', '#4a8fd0', '#f2c94c']));
}
/* ---------- 2. 계단 골목 · 전망대 · 비탈길 ---------- */
function bHillHouses(pb) {
  // F: 기와 지붕 단층집
  { const x = 646, w = 52, wall = '#efe9dc', r = RNG(161); wallPlaster(pb, x, 162, w, 40, wall, 161, { stain: 1 }); tileRoof(pb, x, 146, w, 14, '#4f5d6e');
    pb.hl(x, x + w - 1, 162, '#2f5f8c'); win(pb, x + 30, 168, 14, 12, { wall, guard: 2, r }); door(pb, x + 8, 170, 14, 30, '#3f6d8f', { wall }); potPlant(pb, x + 26, 196, 2); }
  // G: 2층 + 옥탑방
  { const x = 704, w = 56, wall = '#e8d89c', r = RNG(171), base = 176; wallPlaster(pb, x, base - 68, w, 70, wall, 171, { stain: 2, crack: 1 }); parapet(pb, x, base - 74, w, '#d6c482');
    win(pb, x + 8, base - 60, 16, 14, { wall, lit: true, curtain: '#9ec0d6', r }); win(pb, x + 32, base - 60, 16, 14, { wall, r }); win(pb, x + 8, base - 26, 16, 14, { wall, guard: 2, r }); acUnit(pb, x + 38, base - 28);
    const ox = x + 12, oy = base - 92; wallPlaster(pb, ox, oy, 28, 18, '#f1ece0', 172); pb.rect(ox - 2, oy - 3, 32, 3, '#4f9a6a'); pb.hl(ox - 2, ox + 29, oy - 3, '#6fbf85'); door(pb, ox + 3, oy + 4, 8, 14, '#4f9a6a', { wall: '#f1ece0' }); win(pb, ox + 16, oy + 5, 9, 7, { wall: '#f1ece0', mull: false, r });
    potPlant(pb, x + 48, base - 74, 1); pb.rect(x + 2, base - 79, 6, 1, '#a8784a'); pb.vl(x + 2, base - 79, base - 75, '#a8784a'); pb.vl(x + 7, base - 79, base - 75, '#a8784a'); }
}
function bViewpoint(pb) {
  for (let x = 760; x < 884; x++) { if ((x - 760) % 8 === 0) pb.vl(x, 140, 152, '#4a5a52'); } pb.hl(760, 883, 140, '#6a7a72'); pb.hl(760, 883, 146, '#4a5a52');
  bench(pb, 788, 152);
  // 동전 망원경
  { const x = 846; pb.vl(x, 138, 152, '#3f5f7f'); pb.vl(x + 1, 138, 152, '#5a7fa3'); pb.rect(x - 3, 150, 8, 2, '#3f5f7f'); pb.rect(x - 4, 131, 10, 7, '#3f6d8f'); pb.hl(x - 4, x + 5, 131, '#6a96bd'); pb.rect(x + 5, 132, 3, 4, '#2b4a66'); pb.px(x + 7, 133, '#c9dfe8'); }
  sign(pb, 768, 124, 30, 10, '물빛언덕', '#7a5134', '#f4efe6', { font: F7, screws: false }); pb.vl(782, 134, 151, '#6a4a2c'); pb.vl(783, 134, 151, '#86603a');
}
function bDownHouses(pb) {
  // H: 차고 있는 벽돌집
  { const x = 888, w = 76, base = 178, r = RNG(181); wallBrick(pb, x, base - 70, w, 72, PAL.brickTan, 181); parapet(pb, x, base - 76, w, '#cbbfae');
    win(pb, x + 10, base - 62, 18, 15, { wall: '#9a654a', lit: true, curtain: '#e6c9a8', r }); win(pb, x + 46, base - 62, 18, 15, { wall: '#9a654a', flowerBox: true, r });
    win(pb, x + 10, base - 28, 18, 15, { wall: '#9a654a', guard: 2, r });
    for (let y = base - 30; y < base; y++) pb.hl(x + 40, x + 70, y, ((y - (base - 30)) % 3 === 0) ? '#8e9599' : '#b2b8bb'); pb.rect(x + 39, base - 31, 33, 2, '#6f7578');
    onggi(pb, x + 12, base - 76, .9); onggi(pb, x + 22, base - 76, 1.1); onggi(pb, x + 31, base - 76, .8); tank(pb, x + 56, base - 92, 10, 13, '#3f8f6b'); }
  // I: 철물점
  { const x = 968, w = 74, base = 201, wall = '#d9d4c8', r = RNG(191); wallPlaster(pb, x, base - 76, w, 78, wall, 191, { stain: 2, crack: 2 }); parapet(pb, x, base - 82, w, '#c6c0b2');
    win(pb, x + 10, base - 68, 18, 15, { wall, guard: 2, r }); win(pb, x + 44, base - 68, 18, 15, { wall, blinds: .5, r });
    sign(pb, x + 4, base - 48, 66, 12, '철물점', '#e9bf3a', '#2b2b2b', { inner: '#c99f2a' });
    shopGlass(pb, x + 4, base - 33, 66, 30, { shelves: true, goods: ['#8a8f93', '#c8392f', '#3f6d8f', '#e9bf3a', '#6a4a2c'], r });
    for (let i = 0; i < 4; i++) { const tx = x + 10 + i * 6; pb.vl(tx, base - 24, base - 4, '#7a5a3a'); pb.rect(tx - 1, base - 6, 3, 3, '#8a8f93'); }
    pb.ellipse(x + 50, base - 4, 4, 3, '#3f8fd0'); pb.ellipse(x + 60, base - 4, 4, 3, '#d9433b'); pb.ring(x + 40, base - 20, 4, '#4f9a6a'); pb.ring(x + 40, base - 20, 3, '#3f8a5a'); }
}
/* ---------- 3. 공사장 ---------- */
function bConstruction(pb) {
  const r = RNG(201);
  // 골조
  for (let fl = 0; fl < 5; fl++) { const y = 200 - fl * 30; pb.rect(1044, y - 3, 132, 3, '#a9aaa4'); pb.hl(1044, 1175, y - 3, '#c4c5bf'); }
  for (let cx = 1046; cx < 1176; cx += 32) { pb.rect(cx, 52, 4, 148, '#b3b4ae'); pb.vl(cx + 3, 52, 199, '#8f908a'); }
  for (let cx = 1046; cx < 1176; cx += 32) for (let y = 40; y < 52; y += 3) pb.px(cx + 1, y, '#7a5a3a');
  for (let x = 1040; x < 1180; x += 8) pb.vl(x, 46, 200, '#7b8084'); for (let y = 52; y < 200; y += 15) pb.hl(1040, 1180, y, '#7b8084');
  for (let x = 1040; x < 1180; x++) { const sag = Math.round(Math.sin((x - 1040) / 140 * Math.PI * 3) * 3); for (let y = 46; y < 104 + sag; y++) { const v = bay(x + WOX, y + WOY); if (v < .34 && (x - 1040) % 8 !== 0) pb.px(x, y, v < .12 ? '#2f6a42' : '#4f9362'); } }
  pb.hl(1040, 1179, 46, '#2f6a42'); for (let x = 1040; x < 1180; x += 4) pb.px(x, 47, '#6fb07a');
  // 가림막
  for (let x = 1040; x < 1182; x++) for (let y = 160; y < 200; y++) { let c = '#eef0ec'; if (y >= 165 && y < 171) c = '#3f9a5a'; if (y >= 196) c = '#c9ccc7'; if ((x - 1040) % 36 === 0) c = '#b9bdb8'; pb.px(x, y, c); }
  for (let k = 0; k < 4; k++) { const px = 1040 + k * 36; pb.text(k % 2 ? '공사중' : '안전제일', px + 18, 178, F7, k % 2 ? '#c8392f' : '#2f5f8c', 'center'); pb.hl(px + 6, px + 30, 190, '#d0d3cf'); }
  pb.hl(1040, 1181, 160, '#ffffff'); pb.hl(1040, 1181, 159, '#9aa0a3');
  for (const bx of [1046, 1094, 1142]) META.blinks.push({ x: bx, y: 157 });
  for (const bx of [1046, 1094, 1142]) { pb.rect(bx - 1, 156, 3, 3, '#7a4a1a'); }
}
function bPharmacy(pb) {
  const x = 1182, w = 64, wall = '#ece8df', r = RNG(211);
  wallPlaster(pb, x, 124, w, 76, wall, 211, { stain: 1 }); parapet(pb, x, 118, w, '#dcd7cc'); pb.hl(x, x + w - 1, 124, '#2e8a57');
  win(pb, x + 8, 130, 18, 16, { wall, blinds: .5, r }); win(pb, x + 38, 130, 18, 16, { wall, lit: true, r });
  sign(pb, x + 18, 151, 44, 12, '약국', '#2e8a57', '#ffffff', { inner: '#5fb487' });
  { const cx = x + 8, cy = 157; pb.rect(cx - 5, cy - 6, 12, 12, '#f4efe6'); pb.rect(cx - 1, cy - 4, 4, 8, '#2e8a57'); pb.rect(cx - 3, cy - 2, 8, 4, '#2e8a57'); META.neons.push({ x: cx + 1, y: cy, w: 12, h: 12, col: '#7fe0a8', steady: true }); }
  shopGlass(pb, x + 4, 169, 38, 28, { shelves: true, lit: true, goods: ['#ffffff', '#e98fb0', '#4a8fd0', '#f2c94c', '#6fbf73'], r });
  door(pb, x + 45, 172, 16, 28, '#e9eef0', { glass: true, wall });
}
/* ---------- 5. 운하 관리소 + 셔터 통로 ---------- */
function bOffice(pb) {
  const x = 1738, w = 124, wall = '#bcb7ab', r = RNG(221);
  wallConcrete(pb, x, 112, w, 88, wall, 221); parapet(pb, x, 106, w, '#aaa598');
  antenna(pb, x + 18, 106, 18); pb.rect(x + 90, 96, 8, 10, '#9aa0a3'); pb.rect(x + 88, 92, 12, 4, '#7a8084'); pb.ellipse(x + 104, 100, 3, 4, '#c9cfd2'); pb.px(x + 103, 99, '#7a8084');
  // 수위 눈금
  for (let y = 150; y < 200; y++) pb.hl(x + 2, x + 5, y, (Math.floor(y / 4) % 2) ? '#c8392f' : '#f4efe6'); for (let y = 152; y < 200; y += 8) pb.px(x + 7, y, '#2b2b2b');
  sign(pb, x + 12, 134, 70, 12, '운하 관리소', '#2f5f8c', '#ffffff', { inner: '#5f8fbf' });
  win(pb, x + 14, 116, 16, 13, { wall, blinds: .7, frame: PAL.frameA, r }); win(pb, x + 50, 116, 16, 13, { wall, blinds: .4, frame: PAL.frameA, lit: true, curtain: false, r });
  win(pb, x + 14, 160, 16, 14, { wall, guard: 1, frame: PAL.frameA, r }); door(pb, x + 44, 168, 16, 32, '#3f5f7f', { wall });
  pb.rect(x + 66, 168, 12, 16, '#9aa0a3'); pb.frame(x + 66, 168, 12, 16, '#6f7578'); pb.rect(x + 69, 171, 6, 4, '#e8c33e'); pb.text('!', x + 72, 170, F7, '#2b2b2b', 'center'); for (let i = 0; i < 3; i++) pb.px(x + 69 + i * 2, 179, i === 1 ? '#5fd07a' : '#d9433b');
  // 통로
  const a = LV.arch; for (let xx = a.x0; xx < a.x1; xx++) for (let y = a.top; y < 200; y++) pb.px(xx, y, mix('#3c4246', '#1f2326', (y - a.top) / 60 + Math.abs(xx - (a.x0 + a.x1) / 2) / 60));
  for (let y = a.top; y < 200; y++) for (const xx of [a.x0, a.x0 + 1, a.x0 + 2, a.x1 - 3, a.x1 - 2, a.x1 - 1]) pb.px(xx, y, (Math.floor((y + xx) / 3) % 2) ? '#e8c33e' : '#2b2b2b');
  pb.rect(a.x0 - 2, a.top - 8, a.x1 - a.x0 + 4, 8, '#8e9599'); for (let xx = a.x0; xx < a.x1; xx += 3) pb.vl(xx, a.top - 7, a.top - 2, '#6f7578'); pb.hl(a.x0 - 2, a.x1 + 1, a.top - 8, '#b2b8bb');
  pb.rect(a.x0 + 12, a.top + 3, 8, 2, '#2f363a'); META.bulbs.push({ x: a.x0 + 16, y: a.top + 6, tunnel: 1 });
  win(pb, a.x0 + 6, 116, 20, 13, { wall, frame: PAL.frameA, blinds: .3, r });
}
/* ---------- 6. 안개 골목 ---------- */
function bFogAlley(pb) {
  // K: 낡은 3층, 만화방
  { const x = 1866, w = 84, wall = '#9bb0a4', r = RNG(231); wallPlaster(pb, x, 98, w, 102, wall, 231, { stain: 5, crack: 3, peel: 2 }); parapet(pb, x, 92, w, '#8ba094');
    for (const y of [106, 140]) { win(pb, x + 10, y, 18, 15, { wall, r, curtain: y === 106 ? '#c9b48a' : 0, lit: y === 140, curtain2: 1 }); win(pb, x + 44, y, 18, 15, { wall, r, blinds: .7 }); }
    pb.rect(x + 43, 108, 20, 2, '#8a6a44'); pb.rect(x + 43, 114, 20, 2, '#7a5a3a'); pb.line(x + 44, 107, x + 61, 117, '#6a4a2a');
    acUnit(pb, x + 68, 110); acUnit(pb, x + 68, 144, { pipe: 24 });
    for (let y = 168; y < 200; y++) pb.hl(x + 6, x + 60, y, ((y - 168) % 3 === 0) ? '#6f7578' : (y < 182 ? '#9aa0a3' : '#3a3f43')); pb.rect(x + 5, 166, 57, 3, '#5a6064');
    const vh = vsign(pb, x + w - 14, 140, 11, '만화방', '#1f2a33', '#7fe8ff'); META.neons.push({ x: x + w - 8.5, y: 140 + vh / 2, w: 11, h: vh, col: '#5fd8ff' });
    META.laundry.push({ x0: x + 30, y0: 126, x1: x + 120, y1: 130, seed: 1 }); }
  // L: 어두운 벽돌, 다방, 바깥 계단
  { const x = 1954, w = 86, r = RNG(241); wallBrick(pb, x, 132, w, 68, PAL.brickDark, 241); parapet(pb, x, 126, w, '#8c8478');
    win(pb, x + 44, 138, 18, 15, { wall: '#6c3e39', lit: true, curtain: '#c96a7a', silh: true, r }); acUnit(pb, x + 68, 140);
    for (let k = 0; k < 11; k++) { const sx = x + 6 + k * 3, sy = 198 - k * 3; pb.rect(sx, sy, 6, 2, '#5a6064'); pb.hl(sx, sx + 5, sy, '#7a8084'); }
    pb.line(x + 6, 188, x + 40, 156, '#3a3f43'); pb.line(x + 6, 182, x + 40, 150, '#3a3f43'); for (let k = 0; k < 6; k++) pb.vl(x + 8 + k * 6, 186 - k * 6, 192 - k * 6, '#3a3f43');
    door(pb, x + 30, 138, 12, 18, '#6a3a2a', { wall: '#6c3e39' });
    shopGlass(pb, x + 46, 170, 36, 27, { lit: true, r }); for (let i = 0; i < 3; i++) { pb.rect(x + 50 + i * 11, 186, 7, 2, '#5a3a2a'); pb.vl(x + 53 + i * 11, 188, 196, '#5a3a2a'); }
    sign(pb, x + 46, 158, 36, 10, '다방', '#2a1a22', '#ff8fc2', { screws: false }); META.neons.push({ x: x + 64, y: 163, w: 36, h: 10, col: '#ff6fae' });
    META.steams.push({ x: x + 84, y: 150, rate: 2 }); pb.rect(x + 82, 150, 4, 3, '#7a8084'); }
  // M: 3층 빌라, 노래방
  { const x = 2044, w = 96, wall = '#c9c2b4', r = RNG(251); wallPlaster(pb, x, 98, w, 102, wall, 251, { stain: 4, crack: 2 }); parapet(pb, x, 92, w, '#b6af9f');
    tank(pb, x + 70, 74, 12, 16, '#3b78a8'); clothesline(pb, x + 10, x + 50, 80, r);
    for (const y of [104, 138]) { win(pb, x + 10, y, 18, 15, { wall, r, lit: y === 104, curtain: '#7f9ec0' }); win(pb, x + 40, y, 18, 15, { wall, r, curtain: '#e8c88a' }); win(pb, x + 70, y, 18, 15, { wall, r, guard: 1 }); }
    for (let i = 0; i < 3; i++) acUnit(pb, x + 30 + i * 30, 122 + (i % 2) * 34);
    pb.hl(x + 6, x + 92, 154, '#3a3f43'); for (let xx = x + 6; xx < x + 92; xx += 3) pb.vl(xx, 154, 162, '#3a3f43'); pb.hl(x + 6, x + 92, 162, '#55595c');
    for (let i = 0; i < 5; i++) potPlant(pb, x + 10 + i * 16, 162, i % 2 + 1);
    shopGlass(pb, x + 6, 172, 52, 25, { lit: true, r }); door(pb, x + 64, 170, 16, 30, '#3a2f4a', { glass: true, wall });
    sign(pb, x + 6, 164, 52, 8, '노래방', '#2a1f3a', '#ffe36f', { font: F7, screws: false }); META.neons.push({ x: x + 32, y: 168, w: 52, h: 8, col: '#c58fff' }); }
  // N: 닫힌 문구점
  { const x = 2144, w = 96, wall = '#d6cdb8', r = RNG(261); wallPlaster(pb, x, 132, w, 68, wall, 261, { stain: 4, peel: 2, crack: 2 }); parapet(pb, x, 126, w, '#c4bba6');
    win(pb, x + 14, 138, 18, 15, { wall, r }); pb.rect(x + 13, 141, 20, 2, '#8a6a44'); pb.rect(x + 13, 147, 20, 2, '#8a6a44'); win(pb, x + 56, 138, 18, 15, { wall, r, blinds: .9 });
    sign(pb, x + 8, 156, 50, 11, '문구', mix('#3f7fbf', '#d6cdb8', .45), mix('#ffffff', '#d6cdb8', .2), {});
    for (let y = 170; y < 200; y++) pb.hl(x + 6, x + 88, y, ((y - 170) % 3 === 0) ? '#7c8286' : '#a7adb0'); pb.rect(x + 5, 168, 85, 3, '#5f6569');
    // 셔터 낙서: 수달
    { const gx = x + 30, gy = 180; pb.ellipse(gx, gy, 7, 4, '#3f7fbf'); pb.circle(gx + 7, gy - 2, 3, '#3f7fbf'); pb.px(gx + 8, gy - 3, '#ffffff'); pb.line(gx - 7, gy, gx - 12, gy + 3, '#3f7fbf'); pb.text('hi', gx + 20, gy - 4, F7, '#d9433b'); }
    cone(pb, x + 80, 200); }
  // O: 담쟁이 3층
  { const x = 2244, w = 96, r = RNG(271); wallBrick(pb, x, 98, w, 102, PAL.brickRed, 271); parapet(pb, x, 92, w, '#c9c1b2');
    for (const y of [104, 138, 172]) { win(pb, x + 14, y, 18, 15, { wall: '#8c4836', r, lit: y === 138, curtain: '#e6c9a8', guard: y === 172 ? 2 : 0 }); win(pb, x + 60, y, 18, 15, { wall: '#8c4836', r, curtain: '#9ec0d6' }); }
    for (let i = 0; i < 1600; i++) { const vx = x + Math.floor(r() * w), vy = 100 + Math.floor(Math.pow(r(), .6) * 100); if (vx - x > (200 - vy) * 1.1 + 10) continue; const k = r(); pb.px(vx, vy, k < .3 ? '#2f5a2c' : k < .7 ? '#3f7038' : k < .9 ? '#558a45' : '#b5452f'); } }
  // P: 담장 (고양이 자리)
  { const x = 2342, w = 58; wallConcrete(pb, x, 168, w, 32, '#b9b4a8', 281); pb.rect(x - 1, 165, w + 2, 3, '#5d6b78'); pb.hl(x - 1, x + w, 165, '#7d8b98'); for (let xx = x; xx < x + w; xx += 4) pb.px(xx, 167, '#4a5662');
    META.cat = { x: 2380, y: 165 };
    pb.circle(x + 14, 152, 9, '#4f7a52'); pb.circle(x + 20, 148, 7, '#5f8a5a'); pb.circle(x + 8, 150, 6, '#45704a'); }
}
/* ---------- 7. 물빛동 3번지 ---------- */
function bResidential(pb) {
  const r = RNG(301);
  // 담 뒤 집들
  { const x = 2406, w = 112, wall = '#efe6d2'; wallPlaster(pb, x, 132, w, 50, wall, 302, { stain: 1 }); tileRoof(pb, x, 116, w, 14, '#8a4a3a');
    win(pb, x + 14, 140, 18, 15, { wall, lit: true, curtain: '#e8a4b0', r }); win(pb, x + 46, 140, 18, 15, { wall, r, flowerBox: true }); win(pb, x + 78, 140, 18, 15, { wall, r, blinds: .5 }); }
  { const x = 2530, w = 128, wall = '#d6dde2'; wallPlaster(pb, x, 120, w, 62, wall, 303, { stain: 2 }); pb.rect(x - 1, 116, w + 2, 4, '#4f9a6a'); pb.hl(x - 1, x + w, 116, '#6fbf85');
    for (let i = 0; i < 5; i++) onggi(pb, x + 12 + i * 10, 116, .8 + (i % 2) * .3); clothesline(pb, x + 70, x + 116, 102, r);
    win(pb, x + 14, 128, 18, 15, { wall, r, curtain: '#9ec0d6' }); win(pb, x + 52, 128, 18, 15, { wall, r, lit: true }); win(pb, x + 92, 128, 18, 15, { wall, r, guard: 2 }); acUnit(pb, x + 114, 132); }
  // 감나무 (담 뒤에서 솟아남)
  persimmon(pb, 2716, 172, 84, 311);
  // 목적지 집: 파란 지붕
  { const x = 2786, w = 132, wall = '#f1e8d0'; wallPlaster(pb, x, 126, w, 56, wall, 304, {}); tileRoof(pb, x, 108, w, 16, '#3b6fa3', { slope: .55 });
    win(pb, x + 52, 134, 18, 15, { wall, r, flowerBox: true, lit: true, curtain: '#f2c46d' }); win(pb, x + 92, 134, 18, 15, { wall, r, curtain: '#9ec0d6' }); antenna(pb, x + 110, 106, 14); }
  // 끝: 위로 오르는 계단
  { // 끝: 언덕으로 오르는 돌계단과 석축, 덤불
    const r2 = RNG(305);
    for (let sy = 92; sy < 200; sy += 7) for (let sx = 2926 + ((sy / 7) % 2) * 5; sx < 3110; sx += 10 + Math.floor(r2() * 4)) { const w = 9 + Math.floor(r2() * 4), base = PAL.stone[1 + Math.floor(r2() * 3)]; if (sy < 200 - (sx - 2926) * 1.6 + 40) continue; for (let j = 0; j < 6; j++) for (let i = 0; i < w; i++) { if ((i === 0 || i === w - 1) && (j === 0 || j === 5)) continue; let c = base; if (j === 0) c = lt(base, .14); if (j === 5 || i === 0) c = dk(base, .2); pb.px(sx + i, sy + j, c); } }
    for (let k = 0; k < 16; k++) { const sx = 2936 + k * 4, sy = 199 - k * 6; pb.rect(sx, sy - 6, 16, 6, '#c3bdb0'); pb.hl(sx, sx + 15, sy - 6, '#ddd7ca'); pb.hl(sx, sx + 15, sy - 1, '#9d978a'); }
    railing(pb, 2936, 2936, 9); for (let k = 0; k <= 16; k += 4) pb.vl(2938 + k * 4, 190 - k * 6, 199 - k * 6, '#3e5a4c'); pb.line(2938, 190, 3002, 94, '#5a7a6a'); pb.line(2938, 189, 3002, 93, '#3e5a4c');
    foliage(pb, 3040, 84, 34, 22, PAL.leafG, 309); foliage(pb, 3080, 110, 26, 18, PAL.leafG, 310); foliage(pb, 2990, 70, 20, 14, PAL.ginkgo, 311);
    lamp(pb, 3010, 96, 40, -1); }
  // 담장 (붉은 벽돌 + 기와 덮개)
  const x0 = 2400, x1 = 2950, top = 172;
  wallBrick(pb, x0, top, x1 - x0, 28, PAL.brickRed, 306);
  for (let x = x0 - 1; x <= x1; x++) { pb.px(x, top - 4, '#7d8b98'); pb.px(x, top - 3, (x % 4 === 0) ? '#3f4b56' : '#5d6b78'); pb.px(x, top - 2, '#4a5662'); pb.px(x, top - 1, '#3a434c'); }
  pb.tintDith(x0, top, x1 - x0, 3, .35, .6);
  // 문들
  const gate = (gx, gw, col, roof) => {
    pb.rect(gx - 4, top - 10, 4, 38, '#9a5d47'); pb.rect(gx + gw, top - 10, 4, 38, '#9a5d47'); pb.vl(gx - 4, top - 10, 199, '#7e4b3a'); pb.vl(gx + gw + 3, top - 10, 199, '#b56f57');
    for (let y = top - 6; y < 200; y++) for (let xx = gx; xx < gx + gw; xx++) { const lx = xx - gx; let c = col; if (lx === Math.floor(gw / 2) || lx === Math.floor(gw / 2) - 1) c = dk(col, .35); else if ((y - top) % 8 === 0 || lx === 1 || lx === gw - 2) c = lt(col, .18); else if ((lx % 4 === 0) && y > top + 4) c = dk(col, .15); pb.px(xx, y, c); }
    for (let k = 0; k < 2; k++) { const cx = gx + Math.floor(gw / 4) + k * Math.floor(gw / 2); pb.ring(cx, top + 6, 2.5, lt(col, .35)); }
    pb.px(gx + Math.floor(gw / 2) - 3, top + 16, '#e8c25a'); pb.px(gx + Math.floor(gw / 2) + 2, top + 16, '#e8c25a');
    if (roof) { tileRoof(pb, gx - 6, top - 16, gw + 12, 5, roof, { over: 3, slope: .5 }); }
  };
  gate(2452, 26, '#3f8a5a'); gate(2612, 26, '#8a4a3a');
  gate(2790, 32, '#2f6fb0', '#3b6fa3');
  // 문패, 우편함, 초인종
  { pb.rect(2830, 174, 38, 11, '#f7f3ea'); pb.frame(2830, 174, 38, 11, '#8a7a62'); pb.text('물빛동 3', 2849, 175, F7, '#2b2b2b', 'center');
    const mx = LV.postbox.x - 6, my = 186; bevelRect(pb, mx, my, 13, 10, '#c9cfd2'); pb.hl(mx + 2, mx + 10, my + 3, '#2b2f33'); pb.rect(mx + 4, my + 6, 5, 2, '#c8392f');
    pb.rect(2779, 180, 5, 7, '#9aa0a3'); pb.px(2781, 182, '#2b2f33'); pb.px(2781, 185, '#e8c25a'); }
}

/* ---------- 땅 ---------- */
function roadCol(pb, x, y, wet) {
  for (let yy = y + 9; yy < WH - WOY; yy++) {
    const t = (yy - y - 9) / 70, f = t * 5, k = Math.min(4, Math.floor(f)), fr = f - k;
    let c = PAL.road[k]; if (k < 5 && bay(x, yy) < fr) c = PAL.road[Math.min(5, k + 1)];
    if (wet) c = mix(c, '#24303a', .35);
    pb.px(x, yy, c);
  }
}
function buildGround(pb) {
  const r = RNG(77);
  for (let x = LV.x0 - 60; x <= WW - WOX; x++) {
    if (inWaterX(x)) continue;
    const g = groundAt(x);
    if (!g) continue;
    const y = Math.round(g.y), hill = x >= 640 && x < 1062, wet = x > 1866 && x < 2400;
    pb.px(x, y, PAL.walk[0]); pb.px(x, y + 1, PAL.walk[1]); pb.px(x, y + 2, PAL.walk[1]); pb.px(x, y + 3, PAL.walk[2]); pb.px(x, y + 4, PAL.walk[4]);
    if (!hill) { pb.px(x, y + 5, PAL.curb[0]); pb.px(x, y + 6, PAL.curb[1]); pb.px(x, y + 7, PAL.curb[2]); pb.px(x, y + 8, PAL.curb[3]); roadCol(pb, x, y, wet); }
    else { for (let yy = y + 5; yy < WH - WOY; yy++) pb.px(x, yy, '#4a4741'); }
  }
  // 보도 이음매
  for (let x = LV.x0; x < LV.x1 + 100; x += 7) { const g = groundAt(x); if (!g || inWaterX(x)) continue; const y = Math.round(g.y); pb.px(x, y + 1, PAL.walk[3]); pb.px(x, y + 2, PAL.walk[3]); pb.px(x + 1, y + 1, lt(PAL.walk[1], .2)); }
  // 계단
  for (let x = LV.stairsUp[0]; x < LV.stairsUp[1]; x += 5) { const g = groundAt(x); const y = Math.round(g.y); pb.vl(x, y, y + 3, PAL.walk[3]); pb.px(x + 1, y, '#f3ebdc'); }
  // 석축 (언덕 아래)
  for (let sy = 150; sy < 430; sy += 7) for (let sx = 636 + ((sy / 7) % 2) * 5; sx < 1064; sx += 10 + Math.floor(r() * 4)) {
    const w = 8 + Math.floor(r() * 4), h = 5 + Math.floor(r() * 2), g = groundAt(sx), g2 = groundAt(sx + w);
    if (!g || !g2 || sy < Math.max(g.y, g2.y) + 5) continue;
    const base = PAL.stone[1 + Math.floor(r() * 3)];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if ((i === 0 || i === w - 1) && (j === 0 || j === h - 1)) continue; let c = base; if (j === 0 || i === w - 1) c = lt(base, .14); if (j === h - 1 || i === 0) c = dk(base, .2); pb.px(sx + i, sy + j, c); }
    if (r() < .25) pb.dith(sx, sy + h - 2, w, 2, PAL.moss[1], .5);
  }
  for (let x = 640; x < 1062; x++) { const g = groundAt(x); for (let yy = Math.round(g.y) + 5; yy < WH - WOY; yy++) pb.tint(x, yy, clamp((yy - g.y) / 260, 0, .55)); }
  // 도로 디테일
  for (let i = 0; i < 2600; i++) { const x = LV.x0 + Math.floor(r() * (LV.x1 - LV.x0)); if (x >= 640 && x < 1062 || inWaterX(x)) continue; const g = groundAt(x); if (!g) continue; const y = Math.round(g.y) + 10 + Math.floor(r() * 70); pb.px(x, y, r() < .5 ? '#676a71' : '#2c2e35'); }
  const lanes = [[-60, 640], [1150, 1290], [1728, 1866]];
  for (const [a, b] of lanes) for (let x = a; x < b; x += 24) for (let i = 0; i < 12; i++) { const g = groundAt(x + i); if (!g) continue; pb.px(x + i, Math.round(g.y) + 34, '#cfc8b4'); pb.px(x + i, Math.round(g.y) + 35, '#a9a392'); }
  for (let x = -40; x < 2950; x += 140) { if (x >= 640 && x < 1062 || inWaterX(x) || inWaterX(x + 10) || (x > 1050 && x < 1160)) continue; const g = groundAt(x); if (!g) continue; const y = Math.round(g.y) + 10; pb.rect(x, y, 10, 3, '#2b2d33'); for (let i = 0; i < 10; i += 2) pb.px(x + i, y + 1, '#5a5d63'); }
  // 금
  for (let k = 0; k < 40; k++) { let x = LV.x0 + r() * (LV.x1 - LV.x0); if (x >= 640 && x < 1062 || inWaterX(x)) continue; const g = groundAt(x); if (!g) continue; let y = g.y + 14 + r() * 50; for (let j = 0; j < 8 + r() * 10; j++) { pb.px(x, y, '#2a2c32'); x += r() < .5 ? 1 : 0; y += r() < .7 ? 1 : 0; } }
  // 젖은 도로 물웅덩이 (안개 골목)
  for (const [a, b, d] of [[1900, 1960, 22], [2050, 2120, 30], [2190, 2280, 18], [2320, 2380, 40]]) { puddle(pb, a, b, d); }
  // 맨홀 뚜껑
  for (const v of LV.vents) { const y = 200; for (let i = -9; i <= 9; i++) { pb.px(v.x + i, y, i % 3 === 0 ? '#5d636a' : '#3d4249'); pb.px(v.x + i, y + 1, '#2f3338'); } pb.hl(v.x - 10, v.x + 10, y - 1, '#6b7178'); }
  // 구덩이
  const P = LV.pit;
  for (let x = P.x0 - 2; x < P.x1 + 2; x++) for (let y = 200; y < WH - WOY; y++) {
    const edge = Math.min(x - P.x0, P.x1 - x); let c;
    const t = (y - 200) / 160;
    if (y < 204) c = edge < 3 ? '#43464e' : null;
    else if (y < 212) c = (bay(x, y) < .3) ? '#8a857a' : '#6f6a60';
    else c = mix((Math.floor((y + Math.sin(x * .2) * 2) / 9) % 2) ? '#5a4232' : '#4c372a', '#140f0c', clamp(t, 0, .92));
    if (c) pb.px(x, y, c);
  }
  pb.rect(P.x0, 234, P.x1 - P.x0, 5, '#3f7fbf'); pb.hl(P.x0, P.x1 - 1, 234, '#6aa6d9'); pb.hl(P.x0, P.x1 - 1, 238, '#2a5a8a');
  for (let x = P.x0 + 6; x < P.x1; x += 22) pb.rect(x, 233, 3, 7, '#2a5a8a');
  pb.rect(P.x0, 252, 24, 8, '#8a8f93'); pb.hl(P.x0, P.x0 + 23, 252, '#a9aeb2'); pb.ellipse(P.x0 + 24, 256, 2, 4, '#1b1e20');
  for (const ex of [P.x0 - 3, P.x0 - 1, P.x1, P.x1 + 2]) for (let y = 196; y < 204; y++) if (r() < .5) pb.px(ex, y, '#5a5d64');
  // 운하 둑과 바닥
  const W = LV.water;
  for (let x = W.x0; x < W.x1; x++) {
    const g = groundAt(x), y = Math.round(g.y), bank = x < 1318 || x > 1700;
    for (let yy = y; yy < WH - WOY; yy++) {
      let c;
      if (bank && yy < 302) {
        const row = Math.floor((yy - 190) / 5), mort = (yy - 190) % 5 === 0 || ((x + (row % 2) * 4) % 8 === 0);
        const id = Math.floor((x + (row % 2) * 4) / 8) * 31 + row; c = mort ? '#4c4842' : PAL.stone[1 + Math.floor(hash1(id) * 3)];
        if (!mort && (yy - 190) % 5 === 1) c = lt(c, .1);
        if (yy > W.s - 4 && yy < W.s + 8 && bay(x, yy) < .5) c = PAL.moss[(x + yy) % 3];
        if (yy > W.s + 8) c = dk(c, .25);
      } else {
        const d = yy - y; c = d < 2 ? '#7d765f' : d < 5 ? '#655f4c' : mix('#4f4a3c', '#1d1c17', clamp((yy - 300) / 120, 0, .9));
      }
      pb.px(x, yy, c);
    }
  }
  for (let x = W.x0 - 4; x < W.x0 + 2; x++) { pb.px(x, 200, '#d9d3c6'); pb.px(x, 201, '#b9b3a6'); } for (let x = W.x1 - 2; x < W.x1 + 4; x++) { pb.px(x, 200, '#d9d3c6'); pb.px(x, 201, '#b9b3a6'); }
  // 은행잎, 감
  for (const t of META.trees) { const n = t.kind === 'ginkgo' ? 70 : 12; for (let i = 0; i < n; i++) { const x = Math.round(t.x + (r() - .5) * t.w * 2.6); const g = groundAt(x); if (!g || inWaterX(x)) continue; const yy = Math.round(g.y) + (r() < .7 ? Math.floor(r() * 3) : 10 + Math.floor(r() * 50)); pb.px(x, yy, t.kind === 'ginkgo' ? pick(PAL.ginkgo.slice(2)) : '#e8702a'); } }
}


/* ---------- 물속 소품 (물빛 배경 위에 따로 그림) ---------- */
function buildUnderwater() {
  const pb = new PB(480, 150); pb.ox = -1280; pb.oy = -220; const r = RNG(78);
  for (let i = 0; i < 90; i++) { const x = 1320 + Math.floor(r() * 380), g = groundAt(x); if (!g) continue; const c = PAL.stone[Math.floor(r() * 4)], s = 1 + Math.floor(r() * 3); pb.ellipse(x, g.y + .5, s, s * .6, c); pb.px(x - 1, g.y - s * .4, lt(c, .2)); }
  bicycle(pb, 1398, 301, '#8a5a3a'); pb.tintRect(1396, 286, 26, 15, .25, '#3f5a3a');
  { const x = 1470, y = 298; pb.rect(x, y, 7, 3, '#3f7a52'); pb.rect(x + 7, y + 1, 2, 1, '#3f7a52'); pb.px(x + 1, y, '#8fd0a0'); }
  { const x = 1652; pb.ellipse(x, 298, 7, 3, '#1f2124'); pb.ellipse(x, 298, 4, 1.5, '#4a4d52'); }
  { const x = 1500, y = 298; pb.rect(x, y, 9, 5, '#d9ceb4'); pb.line(x, y, x + 4, y + 3, '#a8402f'); pb.line(x + 8, y, x + 4, y + 3, '#a8402f'); pb.rect(x + 6, y + 1, 2, 2, '#2f5f8c'); }
  { const x = 1622; for (let k = 0; k < 3; k++) pb.ellipse(x + k * 3, 299 - k, 3, 2, ['#6a4a2c', '#7a5634', '#5a3e26'][k]); }
  // 웅덩이 속 배관과 밸브 받침
  { const v = LV.valve; pb.rect(v.x - 2, v.y - 14, 5, 14, '#7f878b'); pb.vl(v.x - 2, v.y - 14, v.y - 1, '#5d6468'); pb.vl(v.x + 2, v.y - 14, v.y - 1, '#a2a9ad'); pb.rect(v.x - 4, v.y - 3, 9, 3, '#5d6468'); pb.rect(v.x - 3, v.y - 16, 7, 2, '#a2a9ad');
    pb.ellipse(1590, 318, 9, 11, '#8e9497'); pb.ellipse(1590, 318, 6, 8, '#1a1c1e'); pb.ellipse(1589, 317, 6, 8, '#2a2d30'); }
  return { cv: pb.canvas(), x: 1280, y: 220 };
}

/* ---------- 보도 위 소품 ---------- */
function buildProps(pb) {
  const r = RNG(401);
  mailbox(pb, 194, 200);
  scooter(pb, 128, 200);
  // 전봇대와 전깃줄
  const poles = [[226, 200, 58], [436, 200, 56], [634, 200, 60], [1252, 200, 62], [2042, 200, 70], [2244, 200, 62], [2560, 200, 64]];
  for (const [x, yb, top] of poles) pole(pb, x, yb, top, { trans: x === 436 || x === 2244 });
  const tops = poles.map(p => ({ x: p[0], y: p[2] }));
  for (let i = 0; i < tops.length - 1; i++) {
    const a = tops[i], b = tops[i + 1]; if (b.x - a.x > 520) continue;
    wire(pb, a.x - 9, a.y + 5, b.x - 9, b.y + 5, 9 + (b.x - a.x) * .02); wire(pb, a.x + 13, a.y + 5, b.x + 13, b.y + 5, 12 + (b.x - a.x) * .025);
    wire(pb, a.x + 2, a.y + 14, b.x + 2, b.y + 14, 16 + (b.x - a.x) * .03, '#22262a');
  }
  wire(pb, 634 + 13, 65, 780, 40, 8, '#2b2f33'); pb.vl(780, 40, 152, '#5a6064'); pb.vl(781, 40, 152, '#7a8084');
  wire(pb, 1252 + 13, 67, 1742, 108, 34); wire(pb, 1252 - 9, 67, 1742, 112, 40);
  wire(pb, 226, 72, 300, 104, 4, '#2b2f33', false); wire(pb, 436, 72, 392, 110, 4, '#2b2f33', false); wire(pb, 2244, 76, 2300, 108, 4, '#2b2f33', false); wire(pb, 2560, 78, 2470, 122, 6, '#2b2f33', false);
  // 가로등
  lamp(pb, 350, 200, 56); lamp(pb, 812, 152, 44, -1); lamp(pb, 1236, 200, 56); lamp(pb, 1796, 200, 54, -1); lamp(pb, 2170, 200, 58); lamp(pb, 2700, 200, 56, -1);
  META.lamps.find(l => Math.abs(l.x - 2176.5) < 2).flicker = true;
  // 나무
  ginkgo(pb, 522, 200, 96, 501); ginkgo(pb, 868, 152, 104, 502); willow(pb, 1268, 200, 503);
  // 큰길 소품
  bicycle(pb, 452, 200); stool(pb, 420, 200, '#d9433b'); stool(pb, 432, 200, '#3f7fbf'); stool(pb, 444, 200, '#d9433b');
  { const x = 470; pb.line(x, 200, x + 4, 186, '#7a5134'); pb.line(x + 10, 200, x + 6, 186, '#7a5134'); pb.rect(x + 1, 187, 9, 11, '#f4efe6'); pb.frame(x + 1, 187, 9, 11, '#7a5134'); for (let i = 0; i < 3; i++) pb.hl(x + 3, x + 7, 189 + i * 3, '#c8392f'); }
  crate(pb, 598, 200, '#f2994a'); crate(pb, 612, 200, '#d9433b'); crate(pb, 605, 194, '#f2c94c');
  potPlant(pb, 650, 198, 2); potPlant(pb, 668, 194, 1); { const x = 682, y = Math.round(groundAt(682).y); pb.ellipse(x, y - 2, 6, 3, '#c8392f'); pb.hl(x - 6, x + 5, y - 4, '#e05a4a'); for (let i = -4; i <= 4; i += 2) { pb.px(x + i, y - 5, '#79a356'); pb.px(x + i + 1, y - 6, '#9cc46a'); } }
  railing(pb, 646, 758, 9); railing(pb, 888, 1040, 9);
  // 공사 표지
  { const x = 1046, yb = 205; pb.vl(x, yb - 22, yb, '#55595c'); pb.poly([[x, yb - 36], [x + 11, yb - 18], [x - 11, yb - 18]], '#e8c33e'); pb.poly([[x, yb - 33], [x + 8, yb - 20], [x - 8, yb - 20]], '#2b2b2b'); pb.poly([[x, yb - 31], [x + 6, yb - 21], [x - 6, yb - 21]], '#e8c33e'); pb.text('!', x, yb - 30, F7, '#2b2b2b', 'center'); }
  cone(pb, 1056, 207); cone(pb, 1158, 200);
  // 운하 앞
  sign(pb, 1258, 160, 28, 10, '물빛천', '#2f5f8c', '#ffffff', { font: F7, screws: false }); pb.vl(1271, 170, 200, '#55595c');
  { const x = 1282, y = 176; pb.circle(x, y, 6, '#c8392f'); pb.circle(x, y, 4.5, '#ffffff'); pb.line(x - 3, y + 3, x + 3, y - 3, '#c8392f'); pb.px(x - 1, y - 1, '#3f7fbf'); pb.px(x, y, '#3f7fbf'); pb.vl(x, y + 6, 200, '#55595c'); pb.rect(x - 8, y + 8, 17, 7, '#f4efe6'); pb.text('수영금지', x, y + 8, F7, '#c8392f', 'center'); }
  reeds(pb, 1276, 1296, 200, 511); reeds(pb, 1724, 1748, 200, 512);
  // 운하 관리소 앞
  potPlant(pb, 1820, 200, 1);
  // 물빛동
  bicycle(pb, 2652, 200, '#c8392f'); potPlant(pb, 2770, 200, 2); potPlant(pb, 2862, 200, 1); potPlant(pb, 2870, 200, 2);
  bench(pb, 1214, 200);
}

/* ---------- 거리 레이어 조립 ---------- */
function buildWorld() {
  const pb = new PB(WW, WH); pb.ox = WOX; pb.oy = WOY;
  bPostOffice(pb); gapShadow(pb, 190, 192, 124);
  bLaundry(pb); gapShadow(pb, 282, 288, 118); bVilla(pb); bAlley(pb, 392, 404); bBunsik(pb); gapShadow(pb, 488, 492, 124); bSalon(pb); gapShadow(pb, 562, 566, 124); bSuper(pb);
  bHillHouses(pb); bViewpoint(pb); bDownHouses(pb); bConstruction(pb); bPharmacy(pb);
  bOffice(pb); bFogAlley(pb); bResidential(pb);
  buildGround(pb);
  buildProps(pb);
  return { cv: pb.canvas() };
}

/* ---------- 맨 앞 실루엣 ---------- */
function buildFore() {
  const W = 4300, H = 120, pb = new PB(W, H), r = RNG(601), c0 = '#141d21', c1 = '#1f2c31', c2 = '#2c3d42';
  const bush = (x, h) => { for (let i = 0; i < 9; i++) pb.circle(x + (r() - .5) * h * 1.6, H - r() * h * .8, h * (.3 + r() * .35), i % 3 ? c0 : c1); };
  const rail = (x0, x1, y) => { pb.rect(x0, y, x1 - x0, 3, c1); pb.hl(x0, x1, y, c2); for (let x = x0; x < x1; x += 14) pb.rect(x, y, 3, H - y, c0); };
  const post = (x) => { pb.rect(x, 0, 9, H, c0); pb.vl(x + 8, 0, H, c1); };
  const leaves = (x) => { for (let i = 0; i < 30; i++) { const lx = x + (r() - .5) * 70, ly = H - 6 - r() * 26; pb.ellipse(lx, ly, 4, 2, r() < .5 ? c0 : c1); } pb.line(x - 40, H, x + 30, H - 34, c0); };
  const reedF = (x0, x1) => { for (let x = x0; x < x1; x += 2) { const h = 26 + r() * 40; for (let j = 0; j < h; j++) pb.px(x + Math.sin(j * .05) * 3, H - j, j > h - 6 ? c2 : c0); } };
  // 위치: 화면 x = fx - cam.x*1.32
  const at = wx => Math.round(240 + (wx - 240) * 1.32 + 260);
  bush(at(40), 22); leaves(at(470)); bush(at(980), 26); reedF(at(1262), at(1300)); reedF(at(1712), at(1748)); bush(at(2140), 20); leaves(at(2560)); bush(at(2880), 24);
  return { cv: pb.canvas(), f: 1.32, H, ox: 260 };
}
