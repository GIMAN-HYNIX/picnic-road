'use strict';
/* =========================================================
   무뚝뚝한 사냥꾼과 고양이 '솔'
   - 게임용: 앞(d) · 뒤(u) · 옆(s) × 서기 · 걷기 8프레임 (왼쪽은 옆 그림을 좌우 반전)
   - 고양이: 앞 · 뒤 · 옆 × 걷기 · 종종걸음 / 앉기 · 그루밍 · 식빵 자세
   - 포스터: 3/4 각도 에디토리얼 캐리커처 (시작 화면)
   원점은 발 가운데, 위쪽이 -y
   ========================================================= */
const HT = edPal('#3c4a26');
const HP = {
  SK: skinPal('#e3a982'), STB: ['#a3715a', '#bb8a6c'],
  HAIR: HT('#4a3428', .26), HAT: HT('#6e5638'), BAND: HT('#33261c'), FEA: HT('#b45e2c'),
  JK: HT('#68723e'), JKD: HT('#535c32'), COL: HT('#7a4a2e'), NK: HT('#a83a2c'),
  PANT: HT('#8c6c48'), BOOT: HT('#4a2e22'), SOLE: '#2a1812', BELT: HT('#5a3a24'),
  GLOVE: HT('#6a4430'), STOCK: HT('#8a5432', .3), STEEL: ['#22222a', '#3a3a46', '#6c6c7a'],
  SLING: HT('#6a4026'), KNH: HT('#7a4a2a'), SHE: HT('#3e2a1e'), BRASS: '#d8b04c', LACE: '#a8826a', MOUTH: '#5a2a24',
};
const CP = { F: HT('#978672'), S: HT('#544a40'), W: ['#cfc6b8', '#f4efe6'], EAR: HT('#e2a09a'), NOSE: '#d97c78', EYE: '#a8d25a', COL: HT('#8a3a26'), TAG: '#e0b84a' };
const stubble = (lim, xmax = 99) => (x, y) => (y > lim && x < xmax && hash2(Math.round(x) + 9, Math.round(y) - 3) > .42 ? 0 : -1);

/* ---------- 사냥꾼: 앞 ---------- */
function hunterFront(R, s) {
  const walk = !!s.walk, sw = walk ? Math.sin(s.p * TAU) : 0, cr = s.crouch || 0, lk = (s.look || 0) * 1.7;
  const lL = Math.max(0, sw) * 2.4 * (1 - cr * .35), lR = Math.max(0, -sw) * 2.4 * (1 - cr * .35);
  const bob = (walk ? (Math.abs(sw) < .38 ? -1 : 0) : (s.breath || 0)) + cr * 4.6, as = sw * 1.8 * (1 - cr * .5);
  R.push(); R.translate(0, bob);   // 등 뒤 총: 왼쪽 어깨 위로 총구, 오른쪽 엉덩이 뒤로 개머리판
  R.K2(-9.6, -40, -12.6, -63, 1.05, .95, HP.STEEL, { g: 'barrel' });
  R.P([[9.8, -28], [14.8, -24.2], [13.4, -19.4], [9.2, -23]], HP.STOCK, { g: 'stock' });
  R.pop();
  for (const [x, l] of [[-4.6, lL], [4.6, lR]]) {
    const g = x < 0 ? 'L' : 'R';
    const kx = x * (1.05 + cr * .22);
    R.K2(x, -21 + cr * 4.6, kx, -9.6 - l, 3.7, 3.3, HP.PANT, { g: 'leg' + g });
    R.K2(kx, -10.6 - l, x * 1.1, -3.8 - l, 3.4, 3.6, HP.BOOT, { g: 'boot' + g, ol: 2 });
    R.E(x * 1.12, -2.8 - l, 4.3, 2.8, 0, HP.BOOT, { g: 'boot' + g, ol: 2 });
    R.DL(x * 1.12 - 3.4, -.6 - l, x * 1.12 + 3.4, -.6 - l, HP.SOLE);
    R.stamp(x * 1.1, -7.6 - l, ['l.l', '.l.'], { l: HP.LACE }, 1, 0);
  }
  R.push(); R.translate(0, bob);
  R.P([[-9.8, -24], [9.8, -24], [9.6, -17.6], [-9.6, -17.6]], HP.PANT, { g: 'hip' });
  R.P([[-11.2, -45.4], [11.2, -45.4], [13, -34], [12.2, -24.6], [-12.2, -24.6], [-13, -34]], HP.JK, { g: 'jk', side: .64 });
  R.E(0, -41.8, 12.2, 5, 0, HP.JK, { g: 'jk' });
  R.DL(0, -43, 0, -25, HP.JK[0]);
  R.P([[2.6, -39.4], [8.6, -39.4], [8.4, -37], [2.8, -37]], HP.JKD, { g: 'pocR', ol: 1, flat: 1 });
  R.P([[-8.6, -39.4], [-2.6, -39.4], [-2.8, -37], [-8.4, -37]], HP.JKD, { g: 'pocL', ol: 1, flat: 1 });
  R.stamp(5.6, -38, ['b'], { b: HP.BRASS }); R.stamp(-5.6, -38, ['b'], { b: HP.BRASS });
  R.P([[-12, -25.6], [12, -25.6], [11.8, -23], [-11.8, -23]], HP.BELT, { g: 'belt', ol: 1 });
  R.stamp(0, -25, ['bb', 'bb'], { b: HP.BRASS }, 1, 0);
  R.P([[-11.6, -25], [-8.2, -25], [-8.6, -15.6], [-10, -14.4], [-11.6, -16]], HP.SHE, { g: 'sheath', ol: 1 });
  R.K2(-9.9, -25.6, -9.9, -30.2, 1.1, 1, HP.KNH, { g: 'knife', ol: 1 });
  R.DL(-11.4, -25.8, -8.4, -25.8, HP.BRASS);
  R.K2(-8.4, -44.8, 9.6, -26, .95, .95, HP.SLING, { g: 'sling', ol: 1 });
  for (const [sd, a] of [[-1, as], [1, -as]]) {
    const g = 'arm' + sd;
    R.K2(sd * 11.4, -42.8, sd * 13, -34.4 + a * .4, 3.6, 3.3, HP.JK, { g, ol: 2 });
    R.K2(sd * 13, -34.4 + a * .4, sd * 12.8, -28 + a, 3.3, 3, HP.JK, { g, ol: 2 });
    R.K2(sd * 12.8, -29.6 + a, sd * 12.8, -28.2 + a, 3.1, 3.1, HP.JKD, { g: g + 'c' });
    R.E(sd * 12.8, -26.2 + a, 2.7, 2.8, 0, HP.GLOVE, { g: g + 'h', ol: 1 });
  }
  R.P([[-7.2, -46.6], [-2.2, -43.2], [-.8, -46], [-5, -48]], HP.COL, { g: 'colL', ol: 1 });
  R.P([[7.2, -46.6], [2.2, -43.2], [.8, -46], [5, -48]], HP.COL, { g: 'colR', ol: 1 });
  R.P([[-3.2, -45.6], [3.2, -45.6], [0, -40.8]], HP.NK, { g: 'nk', ol: 1 });
  // 머리: 네모난 턱 · 수염 자국 · 뭉툭한 큰 코 · 짙은 눈썹
  R.K2(0, -44, 0, -47.6, 3.4, 3.4, HP.SK, { g: 'neck' });
  R.E(-7.1, -50.4, 1.5, 2.4, 0, HP.SK, { g: 'earL', ol: 1 }); R.E(7.1, -50.4, 1.5, 2.4, 0, HP.SK, { g: 'earR', ol: 1 });
  R.P([[-6.4, -56.6], [6.4, -56.6], [7, -50.6], [6.6, -45.8], [4.2, -43], [-4.2, -43], [-6.6, -45.8], [-7, -50.6]], HP.SK, R.pat({ g: 'face', lt: [-.1, .95], rs: 0, alts: [HP.STB], alt: stubble(-48.4) }));
  R.P([[-7, -55.4], [-5.6, -55.4], [-5.8, -50.6], [-7.2, -51.4]], HP.HAIR, { g: 'burnL' });
  R.P([[7, -55.4], [5.6, -55.4], [5.8, -50.6], [7.2, -51.4]], HP.HAIR, { g: 'burnR' });
  R.P([[-1.2 + lk, -51], [1.2 + lk, -51], [2.7 + lk * 1.2, -46.8], [1.9 + lk * 1.2, -45.4], [-1.9 + lk * 1.2, -45.4], [-2.7 + lk * 1.2, -46.8]], HP.SK, { g: 'nose', side: .62 });
  R.stamp(-1 + lk * 1.2, -46, ['n.n'], { n: '#7a3a30' });
  const pupil = lk > .6 ? '..P' : lk < -.6 ? 'P..' : '.P.';
  if (s.blink) { R.stamp(-3.6 + lk, -50, ['LLL'], { L: INK }, 1); R.stamp(3.6 + lk, -50, ['LLL'], { L: INK }, 1); }
  else { R.stamp(-3.6 + lk, -50.4, ['LLL', pupil], { L: INK, P: '#1a1214' }, 1); R.stamp(3.6 + lk, -50.4, ['LLL', pupil], { L: INK, P: '#1a1214' }, 1); }
  R.stamp(-3.8 + lk, -52.6, ['HHHH.', '.HHHH'], { H: HP.HAIR[0] }, 2, 0); R.stamp(3.8 + lk, -52.6, ['.HHHH', 'HHHH.'], { H: HP.HAIR[0] }, 2, 0);
  R.DL(-2.2 + lk, -44.2, 2.2 + lk, -44.2, HP.MOUTH);
  hatFront(R, 1);
  R.pop();
}
function hatFront(R, side) {
  R.P([[-6.2, -64], [-2, -65.2], [2, -65.2], [6.2, -64], [7, -57.6], [-7, -57.6]], HP.HAT, { g: 'crown', side: .62 });
  R.DL(-2, -64.6, 2, -64.6, HP.HAT[0]);
  R.P([[-7, -60], [7, -60], [7.2, -57.4], [-7.2, -57.4]], HP.BAND, { g: 'band', ol: 1 });
  R.P([[side * 5.4, -59.6], [side * 9.8, -65.4], [side * 10.6, -64.8], [side * 6.8, -58.8]], HP.FEA, { g: 'fea', ol: 1 });
  R.E(0, -57.2, 12.8, 3.2, 0, HP.HAT, { g: 'brim', cl: 3 });
}
/* ---------- 사냥꾼: 뒤 ---------- */
function hunterBack(R, s) {
  const walk = !!s.walk, sw = walk ? Math.sin(s.p * TAU) : 0, cr = s.crouch || 0;
  const lL = Math.max(0, -sw) * 2.4 * (1 - cr * .35), lR = Math.max(0, sw) * 2.4 * (1 - cr * .35);
  const bob = (walk ? (Math.abs(sw) < .38 ? -1 : 0) : (s.breath || 0)) + cr * 4.6, as = sw * 1.8 * (1 - cr * .5);
  for (const [x, l] of [[-4.6, lL], [4.6, lR]]) {
    const g = x < 0 ? 'L' : 'R', kx = x * (1.05 + cr * .22);
    R.K2(x, -21 + cr * 4.6, kx, -9.6 - l, 3.7, 3.3, HP.PANT, { g: 'leg' + g });
    R.K2(kx, -10.6 - l, x * 1.1, -3.8 - l, 3.4, 3.6, HP.BOOT, { g: 'boot' + g, ol: 2 });
    R.E(x * 1.12, -2.6 - l, 4, 2.6, 0, HP.BOOT, { g: 'boot' + g, ol: 2 });
    R.DL(x * 1.12 - 3.2, -.4 - l, x * 1.12 + 3.2, -.4 - l, HP.SOLE);
  }
  R.push(); R.translate(0, bob);
  R.P([[-9.8, -24], [9.8, -24], [9.6, -17.6], [-9.6, -17.6]], HP.PANT, { g: 'hip' });
  R.P([[-11.2, -45.4], [11.2, -45.4], [13, -34], [12.2, -24.6], [-12.2, -24.6], [-13, -34]], HP.JK, { g: 'jk', side: .64 });
  R.E(0, -41.8, 12.2, 5, 0, HP.JK, { g: 'jk' });
  R.DL(0, -45, 0, -31, HP.JK[0]);
  R.P([[-11.6, -31.4], [11.6, -31.4], [11.9, -26.4], [-11.9, -26.4]], HP.JKD, { g: 'gameP', ol: 1, flat: 1 });
  R.P([[-12, -25.6], [12, -25.6], [11.8, -23], [-11.8, -23]], HP.BELT, { g: 'belt', ol: 1 });
  R.P([[8.2, -25], [11.6, -25], [11.6, -16], [10, -14.4], [8.6, -15.6]], HP.SHE, { g: 'sheath', ol: 1 });
  R.K2(9.9, -25.6, 9.9, -30.2, 1.1, 1, HP.KNH, { g: 'knife', ol: 1 });
  R.K2(8.6, -44.8, -9.6, -26, .95, .95, HP.SLING, { g: 'sling', ol: 1 });
  R.K2(-11, -22, -4.4, -32, 2.3, 1.9, HP.STOCK, { g: 'stock', ol: 1 });
  R.K2(-4.4, -32, .6, -38.4, 1.5, 1.4, HP.STEEL, { g: 'recv', ol: 1 });
  R.K2(.6, -38.4, 11.8, -63, 1.05, .95, HP.STEEL, { g: 'barrel', ol: 1 });
  R.stamp(-1.6, -35.4, ['k'], { k: '#18181e' });
  for (const [sd, a] of [[-1, as], [1, -as]]) {
    const g = 'arm' + sd;
    R.K2(sd * 11.4, -42.8, sd * 13, -34.4 + a * .4, 3.6, 3.3, HP.JK, { g, ol: 2 });
    R.K2(sd * 13, -34.4 + a * .4, sd * 12.8, -28 + a, 3.3, 3, HP.JK, { g, ol: 2 });
    R.K2(sd * 12.8, -29.6 + a, sd * 12.8, -28.2 + a, 3.1, 3.1, HP.JKD, { g: g + 'c' });
    R.E(sd * 12.8, -26.2 + a, 2.7, 2.8, 0, HP.GLOVE, { g: g + 'h', ol: 1 });
  }
  R.P([[-6.4, -46.4], [6.4, -46.4], [7.2, -43.6], [-7.2, -43.6]], HP.COL, { g: 'col', ol: 1 });
  R.K2(0, -44, 0, -47.6, 3.4, 3.4, HP.SK, { g: 'neck' });
  R.E(-7.1, -50.4, 1.5, 2.4, 0, HP.SK, { g: 'earL', ol: 1 }); R.E(7.1, -50.4, 1.5, 2.4, 0, HP.SK, { g: 'earR', ol: 1 });
  R.E(0, -52.4, 6.6, 4.8, 0, HP.HAIR, { g: 'hair' });
  R.P([[-6, -51], [6, -51], [4.4, -47.6], [-4.4, -47.6]], HP.HAIR, { g: 'hair' });
  R.DL(-3, -53.6, 1, -54.4, HP.HAIR[2]);
  hatFront(R, -1);
  R.pop();
}
/* ---------- 사냥꾼: 옆 (오른쪽을 봄) ---------- */
function hunterSide(R, s) {
  const walk = !!s.walk, sw = walk ? Math.sin(s.p * TAU) : 0, cw = walk ? Math.cos(s.p * TAU) : 0, cr = s.crouch || 0;
  const bob = (walk ? (Math.abs(sw) < .38 ? -1 : 0) : (s.breath || 0)) + cr * 4.4, st = 5.4 * (1 - cr * .25);
  const lean = () => { if (cr) { R.translate(0, -21); R.rotate(cr * .16); R.translate(cr * 1.2, 21); } };
  const leg = (fx, lift, near) => {
    const g = near ? 'legN' : 'legF', o = near ? { g, ol: 2 } : { g, b: -.18 };
    R.K2(0, -21 + cr * 4.4, fx * .55 + cr * 3.4, -12.4 - lift * .4 + cr * 1.4, 3.6, 3.3, HP.PANT, o);
    R.K2(fx * .55 + cr * 3.4, -12.4 - lift * .4 + cr * 1.4, fx, -8.8 - lift, 3.3, 3.2, HP.PANT, o);
    const ob = near ? { g: g + 'b', ol: 2 } : { g: g + 'b', b: -.18 };
    R.K2(fx, -9.8 - lift, fx + .2, -4 - lift, 3.3, 3.5, HP.BOOT, ob);
    R.P([[fx - 3.4, -5.6 - lift], [fx + 2.6, -5.6 - lift], [fx + 6, -2.6 - lift], [fx + 6, -.2 - lift], [fx - 3.4, -.2 - lift]], HP.BOOT, ob);
    R.DL(fx - 3.4, -.4 - lift, fx + 5.8, -.4 - lift, HP.SOLE);
  };
  R.push(); R.translate(0, bob); lean();
  R.K2(1, -42.4, 1 + sw * 3, -34, 3.3, 3, HP.JK, { g: 'armF', b: -.2 });
  R.K2(1 + sw * 3, -34, 1 + sw * 3.6, -28, 3, 2.8, HP.JK, { g: 'armF', b: -.2 });
  R.E(1.4 + sw * 3.6, -26.4, 2.5, 2.6, 0, HP.GLOVE, { g: 'handF', b: -.2 });
  R.K2(-7.2, -24.4, -6.2, -33, 2.3, 1.9, HP.STOCK, { g: 'stock' });
  R.K2(-6.2, -33, -6.8, -38.6, 1.5, 1.4, HP.STEEL, { g: 'recv' });
  R.K2(-6.8, -38.6, -15, -60, 1.05, .95, HP.STEEL, { g: 'barrel' });
  R.pop();
  leg(-sw * st, walk ? Math.max(0, -cw) * 2.2 : 0, false);
  leg(sw * st, walk ? Math.max(0, cw) * 2.2 : 0, true);
  R.push(); R.translate(0, bob); lean();
  R.P([[-6.8, -24.6], [6.6, -24.6], [6.2, -18], [-6.6, -18]], HP.PANT, { g: 'hip' });
  R.P([[-6.6, -45.2], [5.2, -45.2], [8, -38], [7.6, -30], [6.8, -24.8], [-7, -24.8], [-7.8, -31], [-7.6, -39]], HP.JK, { g: 'jk', side: .66 });
  R.P([[1, -39.6], [6.8, -39.6], [6.8, -37.2], [1.2, -37.2]], HP.JKD, { g: 'poc', ol: 1, flat: 1 });
  R.stamp(4, -38.2, ['b'], { b: HP.BRASS });
  R.P([[-7.4, -25.6], [7.2, -25.6], [7, -23], [-7.2, -23]], HP.BELT, { g: 'belt', ol: 1 });
  R.P([[1, -25], [4.4, -25], [4, -15.6], [2.6, -14.4], [1.2, -15.6]], HP.SHE, { g: 'sheath', ol: 1 });
  R.K2(2.7, -25.6, 2.7, -30.2, 1.1, 1, HP.KNH, { g: 'knife', ol: 1 });
  R.DL(1.2, -25.8, 4.2, -25.8, HP.BRASS);
  R.K2(-2.4, -45, 6.2, -27.4, .95, .95, HP.SLING, { g: 'sling', ol: 1 });
  const ax = -sw * 3.6;
  R.K2(0, -42.4, ax * .5, -34, 3.5, 3.2, HP.JK, { g: 'armN', ol: 2 });
  R.K2(ax * .5, -34, ax, -27.8, 3.2, 2.9, HP.JK, { g: 'armN', ol: 2 });
  R.K2(ax, -29.4, ax, -28, 3, 3, HP.JKD, { g: 'cuff' });
  R.E(ax + .4, -26.2, 2.7, 2.8, 0, HP.GLOVE, { g: 'handN', ol: 1 });
  R.P([[-4.6, -47.4], [1, -46.2], [2.4, -43.4], [-5, -44]], HP.COL, { g: 'col', ol: 1 });
  R.P([[2.4, -46.2], [6.2, -45.2], [4.2, -41.4]], HP.NK, { g: 'nk', ol: 1 });
  R.K2(.4, -44, .8, -47.6, 3.4, 3.2, HP.SK, { g: 'neck' });
  R.P([[-5.4, -56.8], [4.8, -56.8], [6.2, -52.6], [6.6, -49.6], [6.2, -46.2], [4.6, -43.2], [.4, -42.6], [-3, -44], [-5.4, -47.6], [-6, -52.6]], HP.SK, R.pat({ g: 'face', lt: [-.1, .95], rs: 0, alts: [HP.STB], alt: stubble(-48.4, 4.6) }));
  R.P([[-6.2, -55.6], [-6.6, -50], [-5.6, -46.8], [-3.6, -47.4], [-3, -52], [-2.2, -55.8]], HP.HAIR, { g: 'hair' });
  R.E(-1.4, -50.2, 1.6, 2.4, 0, HP.SK, { g: 'ear', ol: 1 });
  R.P([[-.2, -55.4], [1, -55.4], [1, -51.6], [-.2, -52]], HP.HAIR, { g: 'burn' });
  R.P([[5.4, -51.8], [9.8, -47.2], [9.4, -45.8], [6.2, -45.8]], HP.SK, { g: 'nose', flat: 1 });
  R.stamp(8, -46.4, ['n'], { n: '#7a3a30' });
  R.stamp(4.2, -52.8, ['HHH.', '.HHH'], { H: HP.HAIR[0] }, 1, 0);
  if (s.blink) R.stamp(4.4, -50, ['LL'], { L: INK }); else R.stamp(4.4, -50.4, ['LL', 'P.'], { L: INK, P: '#1a1214' });
  R.DL(4, -44.4, 5.8, -44.4, HP.MOUTH);
  R.P([[-5, -64.4], [3, -65], [5, -63.6], [5.8, -57.6], [-6.2, -57.6]], HP.HAT, { g: 'crown', side: .6 });
  R.P([[-6.2, -60], [5.6, -60], [5.8, -57.4], [-6.4, -57.4]], HP.BAND, { g: 'band', ol: 1 });
  R.P([[-4.6, -59.6], [-8.6, -66.4], [-9.4, -65.6], [-6, -58.8]], HP.FEA, { g: 'fea', ol: 1 });
  R.E(.4, -57.2, 12, 2.4, 0, HP.HAT, { g: 'brim', cl: 3 });
  R.pop();
}

/* ---------- 고양이 '솔' (고등어 태비 · 흰 양말 · 한쪽 귀 끝이 찢어짐) ---------- */
const catStripe = (cx, cy) => (x, y) => (mod(x - cx + Math.abs(y - cy) * .4, 3.2) < 1.1 && y < cy + .6 ? 0 : -1);
function catSideHi(R, s) {
  const p = s.p || 0, trot = s.pose === 'trot', walk = s.pose === 'walk' || trot;
  const A = walk ? (trot ? 3.2 : 2.4) : 0, sw = Math.sin(p * TAU), bob = trot && Math.abs(sw) < .5 ? -1 : 0, ts = s.tail || 0;
  R.chain([[-6.6, -8.6 + bob], [-9.6, -10.6 + bob], [-10.8 + ts * .4, -14 + bob], [-9.8 + ts, -16.8 + bob]], [1.5, 1.4, 1.2, 1], CP.F, R.pat({ g: 'ctail', alts: [CP.S], alt: (x, y, t) => (t > .45 && t < .75 ? 0 : -1) }));
  const leg = (x, ph, far) => {
    const off = Math.sin(ph) * A, lift = walk ? Math.max(0, Math.cos(ph)) * (trot ? 1.8 : 1.2) : 0;
    const o = far ? { g: 'cfl' + x, b: -.25 } : { g: 'cnl' + x, ol: 2 };
    R.K2(x, -6.4 + bob, x + off, -1.4 - lift, 1.4, 1.2, CP.F, o);
    R.E(x + off + .5, -1 - lift, 1.6, 1, 0, far ? CP.F : CP.W, { g: o.g + 'p', b: far ? -.25 : 0 });
  };
  leg(4.4, p * TAU + Math.PI, true); leg(-4.6, p * TAU, true);
  R.E(-.6, -8.4 + bob, 7.4, 3.8, 0, CP.F, R.pat({ g: 'cb', alts: [CP.S], alt: catStripe(-.6, -8.6 + bob) }));
  R.E(1, -6.2 + bob, 4.6, 1.4, 0, CP.W, { g: 'cbelly' });
  leg(4.6, p * TAU, false); leg(-4.4, p * TAU + Math.PI, false);
  R.K2(4.6, -9.6 + bob, 5.4, -12.6 + bob, 1, 1, CP.COL, { g: 'ccol' });
  R.stamp(5.6, -8.6 + bob, ['t'], { t: CP.TAG });
  const sn = s.sniff ? 1 : 0, hx = 7.6 + sn * 1.6, hy = -12.4 + bob + sn * (4.6 + (s.nod || 0));
  if (sn) R.K2(4.6, -9.6 + bob, hx - 1.4, hy - .4, 2.4, 2.2, CP.F, { g: 'cneck' });
  R.P([[hx - .6, hy - 2.4], [hx + .6, hy - 6.4], [hx + 2.4, hy - 2.6]], CP.F, { g: 'cearF', b: -.25 });
  R.E(hx, hy, 3.8, 3.3, 0, CP.F, R.pat({ g: 'ch', alts: [CP.S], alt: (x, y) => (y < hy - 1.6 && mod(Math.round(x - hx), 2) === 0 ? 0 : -1) }));
  R.P([[hx - 3.2, hy - 1.4], [hx - 2.8, hy - 5.4], [hx - 2, hy - 4.6], [hx - 1.6, hy - 5.8], [hx - .2, hy - 2]], CP.F, { g: 'cearN' });
  R.E(hx + 2.6, hy + .9, 1.8, 1.4, 0, CP.W, { g: 'cmuz' });
  R.stamp(hx + 1.2, hy - .8, s.blink ? ['LL'] : ['LL', 'IP'], { L: INK, I: CP.EYE, P: '#141010' });
  R.stamp(hx + 4.2, hy + .2, ['N'], { N: CP.NOSE });
  R.W(hx + 3.4, hy + 1.6, hx + 5.6, hy + 1.4, '#e6ddce');
}
function catHeadFront(R, hy, s, tilt = 0) {
  const ear = s.ear || 0;
  R.P([[-4.4, hy - 1], [-3.8 - ear, hy - 5.6 + ear * 1.4], [-3, hy - 4.8 + ear], [-2.6, hy - 5.8 + ear], [-1.2, hy - 2.8]], CP.F, { g: 'cearL' });
  R.P([[1.2, hy - 2.8], [3.6, hy - 5.8], [4.4, hy - 1]], CP.F, { g: 'cearR' });
  R.P([[2, hy - 3], [3.4, hy - 4.6], [3.8, hy - 1.6]], CP.EAR, { g: 'cearIn', flat: 1, cast: 0 });
  R.E(tilt, hy, 4.4, 3.8, 0, CP.F, R.pat({ g: 'ch', alts: [CP.S], alt: (x, y) => (y < hy - 1.4 && (Math.abs(x - tilt) < .5 || Math.abs(Math.abs(x - tilt) - 1.6) < .4) ? 0 : -1) }));
  R.E(tilt, hy + 1.7, 2.4, 1.6, 0, CP.W, { g: 'cmuz' });
  if (s.closed) { R.stamp(tilt - 2, hy - .2, ['LL'], { L: INK }, 1); R.stamp(tilt + 2, hy - .2, ['LL'], { L: INK }, 0); }
  else if (s.blink) { R.stamp(tilt - 2, hy, ['LL'], { L: INK }, 1); R.stamp(tilt + 2, hy, ['LL'], { L: INK }, 0); }
  else { R.stamp(tilt - 2, hy - .8, ['LL', 'IP'], { L: INK, I: CP.EYE, P: '#141010' }, 1); R.stamp(tilt + 2, hy - .8, ['LL', 'PI'], { L: INK, I: CP.EYE, P: '#141010' }, 0); }
  R.stamp(tilt, hy + 1, ['N'], { N: CP.NOSE });
  R.W(tilt - 2.8, hy + 1.6, tilt - 4.8, hy + 1.2, '#e6ddce'); R.W(tilt + 2.8, hy + 1.6, tilt + 4.8, hy + 1.2, '#e6ddce');
}
function catFrontHi(R, s) {
  const walk = s.pose === 'walk' || s.pose === 'trot', sw = Math.sin((s.p || 0) * TAU), ts = s.tail || 0;
  const lL = walk ? Math.max(0, sw) * 1.4 : 0, lR = walk ? Math.max(0, -sw) * 1.4 : 0, bob = walk && Math.abs(sw) < .4 ? -.6 : 0;
  R.chain([[1, -7], [3, -10.4], [3.6 + ts, -13.4]], [1.3, 1.2, 1], CP.F, { g: 'ctail' });
  R.E(-2.8, -2 - lR * .5, 1.6, 1.2, 0, CP.W, { g: 'chl', b: -.2 }); R.E(2.8, -2 - lL * .5, 1.6, 1.2, 0, CP.W, { g: 'chr', b: -.2 });
  R.E(0, -6 + bob, 4.8, 4.4, 0, CP.F, R.pat({ g: 'cb', alts: [CP.S], alt: (x, y) => (Math.abs(x) > 2.6 && mod(y, 2.8) < 1 ? 0 : -1) }));
  R.E(0, -5.4 + bob, 2.4, 3, 0, CP.W, { g: 'cchest' });
  R.K2(-2, -4 + bob, -2.2, -1.4 - lL, 1.3, 1.2, CP.F, { g: 'cfl', ol: 2 }); R.E(-2.2, -1 - lL, 1.6, 1, 0, CP.W, { g: 'cflp' });
  R.K2(2, -4 + bob, 2.2, -1.4 - lR, 1.3, 1.2, CP.F, { g: 'cfr', ol: 2 }); R.E(2.2, -1 - lR, 1.6, 1, 0, CP.W, { g: 'cfrp' });
  R.P([[-2.8, -8.6 + bob], [2.8, -8.6 + bob], [2.6, -7.4 + bob], [-2.6, -7.4 + bob]], CP.COL, { g: 'ccol' });
  R.stamp(0, -7.2 + bob, ['t'], { t: CP.TAG });
  catHeadFront(R, -11.6 + bob, s);
}
function catBackHi(R, s) {
  const walk = s.pose === 'walk' || s.pose === 'trot', sw = Math.sin((s.p || 0) * TAU), ts = s.tail || 0;
  const lL = walk ? Math.max(0, sw) * 1.4 : 0, lR = walk ? Math.max(0, -sw) * 1.4 : 0, bob = walk && Math.abs(sw) < .4 ? -.6 : 0;
  R.E(-2.2, -1.4 - lR, 1.5, 1, 0, CP.W, { g: 'cfl', b: -.2 }); R.E(2.2, -1.4 - lL, 1.5, 1, 0, CP.W, { g: 'cfr', b: -.2 });
  R.E(0, -6.2 + bob, 4.6, 4.2, 0, CP.F, R.pat({ g: 'cb', alts: [CP.S], alt: (x, y) => (mod(y + Math.abs(x) * .3, 2.8) < 1 ? 0 : -1) }));
  R.E(-2.6, -2.6 - lL, 2.2, 2, 0, CP.F, { g: 'chl', ol: 2 }); R.E(2.6, -2.6 - lR, 2.2, 2, 0, CP.F, { g: 'chr', ol: 2 });
  const hy = -11.2 + bob;
  R.P([[-4.4, hy - .6], [-3.8, hy - 5.4], [-3, hy - 4.6], [-2.6, hy - 5.6], [-1.2, hy - 2.6]], CP.F, { g: 'cearL' });
  R.P([[1.2, hy - 2.6], [3.6, hy - 5.6], [4.4, hy - .6]], CP.F, { g: 'cearR' });
  R.E(0, hy, 4.2, 3.6, 0, CP.F, R.pat({ g: 'ch', alts: [CP.S], alt: (x, y) => (Math.abs(x) < .5 || Math.abs(Math.abs(x) - 1.8) < .4 ? 0 : -1) }));
  R.P([[-2.8, hy + 2.4], [2.8, hy + 2.4], [2.6, hy + 3.4], [-2.6, hy + 3.4]], CP.COL, { g: 'ccol' });
  R.chain([[0, -3.4 + bob], [.8, -8.6 + bob], [1.8 + ts, -13.6 + bob], [1.2 + ts * 1.4, -16.4 + bob]], [1.4, 1.3, 1.1, .9], CP.F, R.pat({ g: 'ctail', ol: 1, alts: [CP.S], alt: (x, y, t) => (t > .45 && t < .75 ? 0 : -1) }));
}
function catSitHi(R, s) {
  const ts = s.tail || 0;
  R.chain([[3.4, -1.8], [5.8, -1.2], [5.2, .2 + ts * .2], [1.4, .6], [-1.6 + ts * .4, .2]], [1.3, 1.3, 1.2, 1.1, .9], CP.F, R.pat({ g: 'ctail', alts: [CP.S], alt: (x, y, t) => (t > .5 && t < .8 ? 0 : -1) }));
  R.E(-3.4, -2.6, 2.8, 2.6, 0, CP.F, R.pat({ g: 'chip', alts: [CP.S], alt: catStripe(-3.4, -2.6) })); R.E(3.4, -2.6, 2.8, 2.6, 0, CP.F, R.pat({ g: 'chip', alts: [CP.S], alt: catStripe(3.4, -2.6) }));
  R.E(0, -6.2, 4.2, 4.6, 0, CP.F, R.pat({ g: 'cb', alts: [CP.S], alt: (x, y) => (Math.abs(x) > 2.4 && mod(y, 2.6) < 1 ? 0 : -1) }));
  R.E(0, -5.6, 2.2, 3.2, 0, CP.W, { g: 'cchest' });
  if (s.groom) {
    R.K2(-1.6, -5, -1.7, -1.2, 1.2, 1.1, CP.F, { g: 'cfl', ol: 2 }); R.E(-1.8, -.9, 1.5, .9, 0, CP.W, { g: 'cflp' });
    const up = s.groom === 2 ? .8 : 0;
    R.K2(1.8, -6, 1, -10.4 - up, 1.2, 1.1, CP.F, { g: 'cfr', ol: 1 }); R.E(.8, -10.8 - up, 1.5, 1.1, 0, CP.W, { g: 'cfrp', ol: 1 });
  } else {
    R.K2(-1.6, -5, -1.7, -1.2, 1.2, 1.1, CP.F, { g: 'cfl', ol: 2 }); R.E(-1.8, -.9, 1.5, .9, 0, CP.W, { g: 'cflp' });
    R.K2(1.6, -5, 1.7, -1.2, 1.2, 1.1, CP.F, { g: 'cfr', ol: 2 }); R.E(1.8, -.9, 1.5, .9, 0, CP.W, { g: 'cfrp' });
  }
  R.P([[-2.6, -9], [2.6, -9], [2.4, -7.9], [-2.4, -7.9]], CP.COL, { g: 'ccol' });
  R.stamp(0, -7.8, ['t'], { t: CP.TAG });
  if (s.groom) {
    catHeadFront(R, -11.4 + (s.groom === 2 ? .4 : 0), { closed: true }, -1);
    R.stamp(-.4, -9.2, ['r'], { r: '#e8707a' });
  } else catHeadFront(R, -12, s);
}
function catLoafHi(R, s) {
  R.chain([[5.6, -1.6], [6.6, -.6], [3, .4], [-1.6, .2]], [1.3, 1.2, 1.1, .9], CP.F, { g: 'ctail' });
  R.E(0, -3.4 + (s.breath || 0) * .4, 6.2, 3.4, 0, CP.F, R.pat({ g: 'cb', alts: [CP.S], alt: (x, y) => (Math.abs(x) > 2.4 && mod(x + 40, 2.8) < 1 && y < -2.6 ? 0 : -1) }));
  R.E(-2.2, -.6, 1.6, .9, 0, CP.W, { g: 'cpL' }); R.E(1.6, -.6, 1.6, .9, 0, CP.W, { g: 'cpR' });
  catHeadFront(R, -7.2, { closed: !s.peek, blink: false });
}

/* ---------- 포스터 (3/4 각도, 160×160) ---------- */
function hunterPoster(R, s) {
  const by = s.by || 0;
  // 등 뒤 총
  R.push(); R.translate(0, by);
  R.K2(-12, -44, -17, -66, 3.6, 3, HP.STOCK, { g: 'stock' });
  R.K2(-17, -66, -18.4, -74, 2.2, 2, HP.STEEL, { g: 'recv' });
  R.K2(-18.4, -74, -25, -114, 1.7, 1.5, HP.STEEL, { g: 'barrel' });
  R.stamp(-25, -115, ['k'], { k: '#18181e' });
  R.pop();
  // 다리 · 장화 (가까운 다리에 체중)
  R.chain([[6, -46], [9, -25], [10, -8]], [5, 4.6, 4.4], HP.PANT, { g: 'legF', b: -.15 });
  R.P([[4.4, -10], [13, -10], [19.6, -5.6], [20.4, -.2], [4.4, -.2]], HP.BOOT, { g: 'bootF' });
  R.chain([[-6, -46], [-6.4, -24], [-5.4, -8]], [5.4, 5, 4.6], HP.PANT, { g: 'legN', ol: 1 });
  R.P([[-11, -10], [-1.4, -10], [6.4, -5.4], [7, -.2], [-11, -.2]], HP.BOOT, { g: 'bootN', ol: 1 });
  R.DL(-11, -.6, 7, -.6, HP.SOLE); R.DL(4.4, -.6, 20.4, -.6, HP.SOLE);
  R.stamp(-3.6, -8.4, ['l.l.l', '.l.l.'], { l: HP.LACE }, 0, 0);
  R.push(); R.translate(0, by);
  R.P([[-12.4, -51], [12.4, -51], [13, -40], [-13, -40]], HP.PANT, { g: 'hip' });
  // 먼 팔 (칼자루에 손)
  R.chain([[12, -76], [18.6, -61], [14.6, -53]], [4.6, 4.2, 4], HP.JK, { g: 'armF', b: -.15 });
  // 재킷
  R.P([[-19, -80], [12, -80], [16, -70], [16.6, -56], [14, -48.6], [-14.4, -48.6], [-17.4, -56], [-20, -70]], HP.JK, { g: 'jk', side: .62 });
  R.DL(1.6, -79, 2.6, -49, HP.JK[0]);
  R.P([[-14, -70], [-4.4, -70], [-4.6, -66], [-13.6, -66]], HP.JKD, { g: 'pocL', ol: 1, flat: 1 });
  R.P([[5, -70], [13, -70], [12.8, -66.2], [5.2, -66.2]], HP.JKD, { g: 'pocR', ol: 1, flat: 1 });
  R.stamp(-9.2, -68, ['b'], { b: HP.BRASS }); R.stamp(9, -68.2, ['b'], { b: HP.BRASS });
  R.P([[-14.6, -51.6], [14.4, -51.6], [14.2, -47.4], [-14.4, -47.4]], HP.BELT, { g: 'belt', ol: 1 });
  R.stamp(1, -50.6, ['bbb', 'b.b', 'bbb'], { b: HP.BRASS }, 1, 0);
  R.P([[10.6, -50.6], [16, -50.6], [15.6, -33], [13, -30.6], [10.8, -33]], HP.SHE, { g: 'sheath', ol: 1 });
  R.K2(13.2, -51.4, 13.4, -58.4, 1.8, 1.6, HP.KNH, { g: 'knife', ol: 1 });
  R.DL(10.6, -51.8, 16, -51.8, HP.BRASS);
  R.K2(-14.6, -79, 13, -51, 1.7, 1.7, HP.SLING, { g: 'sling', ol: 1 });
  R.stamp(-1.4, -66, ['bb', 'bb'], { b: HP.BRASS }, 1, 1);
  R.E(14.4, -55, 3.8, 3.6, 0, HP.GLOVE, { g: 'handF', ol: 1 });
  // 가까운 팔 (엄지를 허리띠에 걸고)
  R.chain([[-17.6, -76], [-24, -61], [-10, -50]], [5, 4.6, 4.2], HP.JK, { g: 'armN', ol: 1 });
  R.K2(-13.4, -52.8, -11.4, -51.4, 4.2, 4.2, HP.JKD, { g: 'cuffN' });
  R.E(-8.6, -49.6, 3.8, 3.6, 0, HP.GLOVE, { g: 'handN', ol: 1 });
  // 깃 · 목수건
  R.P([[-8, -82.4], [2, -78], [4.4, -82.6], [-3, -86]], HP.COL, { g: 'colL', ol: 1 });
  R.P([[4.4, -82.6], [10.6, -79.4], [9.6, -84.8], [6, -86]], HP.COL, { g: 'colR', ol: 1 });
  R.P([[0, -82.4], [8.6, -82.4], [4, -74]], HP.NK, { g: 'nk', ol: 1 });
  // 머리 (오른쪽 3/4)
  R.K2(0, -80, 1, -87, 5, 4.8, HP.SK, { g: 'neck' });
  R.P([[-8.4, -102], [-9.4, -95], [-8, -89.6], [-4.6, -91], [-4, -100]], HP.HAIR, { g: 'hairB' });
  R.P([[-8, -108], [8, -108], [10.4, -100], [10.6, -92], [8.6, -86], [4, -83], [-3, -83], [-7, -86], [-9, -94]], HP.SK, R.pat({ g: 'face', lt: [-.1, .95], rs: 0, alts: [HP.STB], alt: stubble(-92.4, 8.6) }));
  R.E(-6.4, -95.4, 2.2, 3.4, 0, HP.SK, { g: 'ear', ol: 1 });
  R.P([[-3.4, -105], [-1.4, -105], [-1.6, -98.4], [-3.6, -99.4]], HP.HAIR, { g: 'burn' });
  R.P([[7, -101.4], [16.4, -92.4], [15.4, -90.2], [8.6, -90.2]], HP.SK, { g: 'nose', flat: 1 });
  R.DL(7.4, -100.4, 8.4, -91, HP.SK[0]);
  R.stamp(12.4, -91, ['n'], { n: '#7a3a30' });
  R.stamp(3.6, -102.6, ['HHHHH.', '.HHHHH'], { H: HP.HAIR[0] }, 2, 0);
  R.stamp(9.4, -102.4, ['HH', '.H'], { H: HP.HAIR[0] }, 0, 0);
  if (s.blink) { R.stamp(3, -99.6, ['LLLL'], { L: INK }, 2); R.stamp(9.6, -99.6, ['LL'], { L: INK }, 0); }
  else { R.stamp(3, -100.4, ['LLLL', '.wP.'], { L: INK, w: '#f6f0e4', P: '#1a1214' }, 2); R.stamp(9.6, -100.4, ['LL', 'P.'], { L: INK, P: '#1a1214' }, 0); }
  R.DL(6.4, -87.6, 10, -87.4, HP.MOUTH);
  // 모자
  R.P([[-10, -122.4], [-2, -124.6], [4, -124.2], [9.4, -122], [11.4, -108.6], [-11.6, -108.6]], HP.HAT, { g: 'crown', side: .6 });
  R.DL(-3, -123.6, 4, -123.2, HP.HAT[0]);
  R.P([[-11.4, -113.4], [11.2, -113.4], [11.6, -108.4], [-11.8, -108.4]], HP.BAND, { g: 'band', ol: 1 });
  R.P([[-8.4, -113], [-12.4, -117], [-16.4, -127.4], [-13.6, -126.4], [-10, -120.4], [-6.2, -112.6]], HP.FEA, R.pat({ g: 'fea', ol: 1, alts: [HT('#e8b46a')], alt: (x, y) => (mod(Math.round(y * .8), 3) === 0 ? 0 : -1) }));
  R.DL(-7.2, -112.8, -14.8, -126, HP.FEA[0]);
  R.E(.6, -108.8, 22, 5, -.05, HP.HAT, { g: 'brim', cl: 5 });
  R.pop();
}
function catPoster(R, s) {
  const ts = s.sw || 0;
  R.chain([[-5, -2.6], [-9, -1.6], [-8, .6], [-2, 1], [4 + ts * .6, .6]], [2.2, 2.2, 2, 1.8, 1.4], CP.F, R.pat({ g: 'ctail', alts: [CP.S], alt: (x, y, t) => (t > .45 && t < .75 ? 0 : -1) }));
  R.E(-1.4, -6.2, 7, 5.6, 0, CP.F, R.pat({ g: 'chip', alts: [CP.S], alt: (x, y) => { const r = Math.hypot((x + 1.4) * 1.1, y + 6.2); return r > 2 && mod(r, 3.2) < 1.1 ? 0 : -1; } }));
  R.E(3, -13, 4.6, 7.2, -.1, CP.F, R.pat({ g: 'cb', alts: [CP.S], alt: (x, y) => (x < 1.6 && mod(y, 3) < 1.1 ? 0 : -1) }));
  R.E(4.6, -12, 2.6, 5.2, -.1, CP.W, { g: 'cbib' });
  R.K2(2.2, -9, 2, -1.4, 1.7, 1.6, CP.F, { g: 'clegF', b: -.15 }); R.E(2.4, -1, 2.2, 1.3, 0, CP.W, { g: 'cpF' });
  R.K2(5.8, -9, 6.4, -1.4, 1.8, 1.6, CP.F, { g: 'clegN', ol: 1 }); R.E(6.8, -1, 2.3, 1.3, 0, CP.W, { g: 'cpN', ol: 1 });
  R.E(4.6, -19.4, 3.6, 1.5, -.1, CP.COL, { g: 'ccol', ol: 1 });
  R.stamp(6, -17.6, ['tt', 'tt'], { t: CP.TAG }, 0, 0);
  const hx = 5.4, hy = -24.4;
  R.P([[hx - 4.6, hy - 1.4], [hx - 4.2, hy - 8], [hx - 3.2, hy - 6.8], [hx - 2.8, hy - 8.8], [hx - .8, hy - 3.6]], CP.F, { g: 'cearN' });
  R.P([[hx + .4, hy - 3.8], [hx + 3.4, hy - 9.2], [hx + 4.4, hy - 1.8]], CP.F, { g: 'cearF' });
  R.P([[hx + 1.4, hy - 3.6], [hx + 3.2, hy - 7], [hx + 3.6, hy - 2.6]], CP.EAR, { g: 'cearIn', flat: 1, cast: 0 });
  R.E(hx, hy, 5.8, 5, 0, CP.F, R.pat({ g: 'ch', alts: [CP.S], alt: (x, y) => (y < hy - 2 && (Math.abs(x - hx + .6) < .6 || Math.abs(Math.abs(x - hx + .6) - 2) < .5) ? 0 : -1) }));
  R.P([[hx + 2, hy - .4], [hx + 7, hy + 1.6], [hx + 2.6, hy + 3.2]], CP.F, { g: 'csnout' });
  R.E(hx + 3.4, hy + 1.8, 2.6, 1.6, 0, CP.W, { g: 'cmuz' });
  if (s.cblink) { R.stamp(hx - .6, hy - .2, ['LLL'], { L: INK }, 1); R.stamp(hx + 3, hy - .4, ['LL'], { L: INK }, 0); }
  else { R.stamp(hx - .6, hy - .8, ['LLL', 'IPI'], { L: INK, I: CP.EYE, P: '#141010' }, 1); R.stamp(hx + 3, hy - 1, ['LL', 'IP'], { L: INK, I: CP.EYE, P: '#141010' }, 0); }
  R.stamp(hx + 6.4, hy + 1, ['N'], { N: CP.NOSE });
  R.W(hx + 5, hy + 2.4, hx + 8.4, hy + 1.8, '#e6ddce'); R.W(hx + 5, hy + 3.2, hx + 8, hy + 3.8, '#e6ddce');
}
const POSTER_BG = '#e3803c', POSTER_TINT = '#8f3f1c';
function posterFrame(f) {
  const s = edState(f), out = new PB(160, 160);
  out.d.fill(C(POSTER_BG));
  for (let i = 0; i < 9; i++) { const x = mod(hash1(i + 4) * 160 + Math.sin((s.t + i * .17) * TAU) * 3, 160), y = mod(hash1(i + 41) * 170 + s.t * 26, 170) - 6; polyAt(out, x, y, s.t * TAU * .4 + i, 1, [[0, -2.6], [1.4, -.4], [0, 2.6], [-1.4, -.4]], i % 3 ? '#f3c37a' : '#a8b45a'); }
  out.ellipse(84, 151, 30, 3.4, mix(POSTER_BG, POSTER_TINT, .45)); out.ellipse(126, 151, 12, 2.4, mix(POSTER_BG, POSTER_TINT, .45));
  const chr = new PB(160, 160);
  const h = hiBake(160, 160, 72, 151, R => hunterPoster(R, s), ED), c = hiBake(160, 160, 118, 151, R => { R.scl(1.18); catPoster(R, s); }, ED);
  pbOver(chr, h); pbCast(chr, c, POSTER_TINT); pbOver(chr, c);
  pbOver(out, chr);
  grain(out, .045, 77);
  return out;
}

/* ---------- 게임용 스프라이트 굽기 ---------- */
const HUNTER_W = 64, HUNTER_H = 80, HUNTER_OX = 32, HUNTER_OY = 74;
const CAT_W = 40, CAT_H = 34, CAT_OX = 20, CAT_OY = 30;
function mirrorCanvas(c) { const [m, g] = makeCanvas(c.width, c.height); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return m; }
function bakeChar(W, H, ox, oy, fn, seed) { const pb = hiBake(W, H, ox, oy, fn, ED); grain(pb, .03, seed); return pb.canvas(); }
// 사냥꾼: SPR.hunter[dir][pose][frame]  dir: d u r l / pose: idle(0 숨 · 1 숨 들이쉼 · 2 눈 감음) walk(0..7)
// 고양이: SPR.cat[dir][pose][frame]  dir: d u r l (sit · groom · loaf은 d만)
const SPR = { hunter: {}, cat: {} };
const HWALK = 12, CWALK = 12, CTROT = 8;
function bakeSprites() {
  const H = SPR.hunter, Cc = SPR.cat;
  const views = { d: hunterFront, u: hunterBack, r: hunterSide };
  const B = fn => bakeChar(HUNTER_W, HUNTER_H, HUNTER_OX, HUNTER_OY, fn, 3);
  for (const dir of ['d', 'u', 'r']) {
    const fn = views[dir];
    H[dir] = { idle: [], walk: [], sneak: [], look: [] };
    H[dir].idle.push(B(R => fn(R, { breath: 0 })), B(R => fn(R, { breath: -1 })), B(R => fn(R, { breath: 0, blink: true })));
    for (let f = 0; f < HWALK; f++) H[dir].walk.push(B(R => fn(R, { walk: true, p: f / HWALK })));
    for (let f = 0; f < HWALK; f++) H[dir].sneak.push(B(R => fn(R, { walk: true, p: f / HWALK, crouch: 1 })));
    if (dir === 'd') for (const lk of [-1, -.5, .5, 1]) H[dir].look.push(B(R => fn(R, { breath: 0, look: lk })));
  }
  H.l = { idle: H.r.idle.map(mirrorCanvas), walk: H.r.walk.map(mirrorCanvas), sneak: H.r.sneak.map(mirrorCanvas), look: [] };
  const cv = { d: catFrontHi, u: catBackHi, r: catSideHi };
  const K = fn => bakeChar(CAT_W, CAT_H, CAT_OX, CAT_OY, fn, 5);
  for (const dir of ['d', 'u', 'r']) {
    const fn = cv[dir];
    Cc[dir] = { walk: [], trot: [], stand: [], sniff: [] };
    for (let f = 0; f < CWALK; f++) Cc[dir].walk.push(K(R => fn(R, { pose: 'walk', p: f / CWALK, tail: Math.sin(f / CWALK * TAU) * .8 })));
    for (let f = 0; f < CTROT; f++) Cc[dir].trot.push(K(R => fn(R, { pose: 'trot', p: f / CTROT, tail: Math.sin(f / CTROT * TAU) * .6 })));
    for (const [tl, bl] of [[0, false], [0, true], [.6, false], [-.4, false]]) Cc[dir].stand.push(K(R => fn(R, { pose: 'stand', p: 0, blink: bl, tail: tl })));
    if (dir === 'r') for (let f = 0; f < 4; f++) Cc[dir].sniff.push(K(R => fn(R, { pose: 'stand', p: 0, sniff: true, nod: [0, .8, 0, -.4][f], tail: [0, .3, .6, .3][f] })));
  }
  Cc.l = { walk: Cc.r.walk.map(mirrorCanvas), trot: Cc.r.trot.map(mirrorCanvas), stand: Cc.r.stand.map(mirrorCanvas), sniff: Cc.r.sniff.map(mirrorCanvas) };
  Cc.sit = [0, 1, 2, 3, 4, 5].map(k => K(R => catSitHi(R, { tail: [0, .4, .8, 1, .6, .2][k], blink: k === 4 })));
  Cc.sitEar = K(R => catSitHi(R, { ear: 1 }));
  Cc.groom = [1, 2, 1, 2].map((g, k) => K(R => catSitHi(R, { groom: g, tail: k * .25 })));
  Cc.loaf = [0, -1].map(b => K(R => catLoafHi(R, { breath: b })));
  Cc.loafPeek = K(R => catLoafHi(R, { peek: true }));
}
