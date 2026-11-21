'use strict';
/* =========================================================
   숲의 생물들 (귀엽게 생긴 안개 정령) + 쓰러지면 되는 반죽 + 구운 빵
   acorn 도토리 요정 · mush 버섯돌이 · boss 밤송이 대장
   ========================================================= */
const AK = {
  body: ['#4a2a14', '#6e4222', '#955b30', '#bd8048', '#dcaa6e'],
  cap: ['#3a2210', '#553418', '#74481f', '#946030'],
  cream: ['#c4a98a', '#e0cdb0', '#f4e8d2'],
  mcap: ['#6a1a1a', '#9a2a24', '#cc4036', '#ee6a58'],
  mstem: ['#b8a58a', '#dccdb4', '#f4ead8'],
  burr: ['#3a2410', '#573419', '#7a4a22', '#9c6630'],
  spike: ['#7a5a2a', '#b08a44', '#e0c070', '#f6e4a0'],
  outline: '#24140c',
};
function foeEyes(R, x, y, s, kind) {
  const E = '#1a1210';
  if (kind === 'x') { R.DL(x - 1.4, y - 1, x + .4, y + 1, E); R.DL(x + .4, y - 1, x - 1.4, y + 1, E); return; }
  if (kind === 'closed') { R.DL(x - 1.2, y + .4, x + 1.2, y + .4, E); return; }
  if (kind === 'angry') { R.D(x, y, E); R.D(x + .8, y, E); R.D(x, y + 1, E); R.D(x + .8, y + 1, E); R.DL(x - 1.6, y - 1.4, x + 1.6, y - .2, E); return; }
  if (kind === 'swirl') { R.D(x - 1, y, E); R.D(x, y - 1, E); R.D(x + 1, y, E); R.D(x, y + 1, E); R.D(x + .2, y, '#ffffff'); return; }
  R.D(x, y - 1, E); R.D(x + .8, y - 1, E); R.D(x, y, E); R.D(x + .8, y, E); R.D(x, y + 1, E); R.D(x + .8, y + 1, E); R.D(x - .2, y - 1, '#ffffff');
}
function foeAcorn(R, s) {
  const sq = s.sq || 0, st = s.pose, bob = s.bob || 0, ang = s.ang || 0, rollp = st === 'roll';
  R.push(); R.translate(0, bob);
  if (!rollp) { R.E(-2.6, -1.4 + (s.f & 1) * -.8, 2.2, 1.4, 0, AK.cap); R.E(2.6, -1.4 + ((s.f + 1) & 1) * -.8, 2.2, 1.4, 0, AK.cap); }
  R.push(); R.translate(0, rollp ? -7 : 0); if (rollp) R.rotate(ang);
  const w = 6.2 + sq * 1.4, h = 6.4 - sq * 1.4, cy = rollp ? 0 : -6 + sq * .6;
  R.E(0, cy, w, h, 0, AK.body); R.E(.8, cy + 1.6, w * .55, h * .5, 0, AK.cream);
  R.E(0, cy - h + 1.2, w + 1.1, 3.2 - sq * .4, 0, AK.cap);
  for (let i = -3; i <= 3; i++) for (let j = 0; j < 2; j++) R.D(i * 1.9 + (j & 1), cy - h + 1.2 + j * 1.5 - 1, AK.cap[1]);
  R.DL(0, cy - h - 1.8, 0, cy - h - .2, AK.cap[0]); R.D(0, cy - h - 2.2, AK.cap[2]);
  if (!rollp) { const k = st === 'stun' ? 'swirl' : st === 'windup' || st === 'roll' ? 'angry' : 'open'; foeEyes(R, -2.4, cy - .6, s, k); foeEyes(R, 1.6, cy - .6, s, k); R.D(-.4, cy + 2, '#7a3a30'); R.D(.4, cy + 2, '#7a3a30'); R.D(-3.8, cy + 1.6, '#e58a78'); R.D(3.6, cy + 1.6, '#e58a78'); }
  else { foeEyes(R, 1, -1, s, 'angry'); foeEyes(R, 4, -1, s, 'angry'); }
  R.pop(); R.pop();
}
function foeMush(R, s) {
  const sq = s.sq || 0, st = s.pose, bob = s.bob || 0, inf = s.inflate || 0;
  R.push(); R.translate(0, bob);
  R.E(-2, -1.2 + (s.f & 1) * -.8, 2, 1.3, 0, AK.mstem); R.E(2, -1.2 + ((s.f + 1) & 1) * -.8, 2, 1.3, 0, AK.mstem);
  R.E(0, -5.4 + sq * .4, 3.8 + sq * .8, 4.8 - sq * .8, 0, AK.mstem);
  const k = st === 'stun' ? 'swirl' : st === 'windup' || st === 'attack' ? 'angry' : 'open';
  foeEyes(R, -2.2, -5.8, s, k); foeEyes(R, 1.4, -5.8, s, k); R.D(-.4, -3.6, '#7a3a30'); R.D(.4, -3.6, '#7a3a30'); R.D(-3.2, -4, '#e58a78'); R.D(3.2, -4, '#e58a78');
  const cw = 8.6 + inf * 2.4 - sq * .6, ch = 5 + inf * 1.4 - sq * .4;
  R.E(0, -10.4, cw, ch, 0, AK.mcap); R.E(0, -8.6, cw - .6, 1.8, 0, AK.mstem);
  for (const [x, y, r] of [[-4, -12, 1.4], [3.6, -12.4, 1.7], [0, -14, 1.2], [-6.4, -9.8, 1.1], [6.4, -9.8, 1.1]]) R.E(x * (1 + inf * .2), y, r, r * .8, 0, AK.mstem);
  R.pop();
}
function foeBoss(R, s) {
  const sq = s.sq || 0, st = s.pose, bob = s.bob || 0, ang = s.ang || 0, roll = st === 'roll', br = s.bristle || 0;
  R.push(); R.translate(0, bob);
  if (!roll) { R.E(-5.6, -2, 3.2, 2, 0, AK.burr); R.E(5.6, -2, 3.2, 2, 0, AK.burr); }
  R.push(); R.translate(0, roll ? -12 : -11 + sq * .8); if (roll) R.rotate(ang);
  const r = 11.6 + br * 1.6;
  const n = 26;
  for (let i = 0; i < n; i++) { const a = i / n * TAU + (roll ? 0 : .1), L = r + 3.4 + br * 2.4 + (i % 2) * 1.4; if (!roll && Math.sin(a) > .78) continue; R.P([[Math.cos(a - .12) * (r - 2), Math.sin(a - .12) * (r - 2)], [Math.cos(a) * L, Math.sin(a) * L], [Math.cos(a + .12) * (r - 2), Math.sin(a + .12) * (r - 2)]], AK.spike, { flat: (i % 3) + 1 }); }
  R.E(0, 0, r, r * (1 - sq * .08), 0, AK.burr);
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, d = r * .62 + (i % 2) * 2.4; R.D(Math.cos(a) * d, Math.sin(a) * d, AK.spike[1]); }
  if (!roll) {
    R.E(.4, 2.4, 7, 5.6, 0, AK.cream); const k = st === 'stun' ? 'swirl' : (st === 'windup' || st === 'burst' || st === 'attack') ? 'angry' : 'open';
    foeEyes(R, -3.6, .6, s, k); foeEyes(R, 2.4, .6, s, k); R.D(-.6, 4.4, '#7a3a30'); R.D(.6, 4.4, '#7a3a30'); R.D(-.6, 5, '#7a3a30'); R.D(.6, 5, '#7a3a30'); R.D(-5.6, 3.2, '#e58a78'); R.D(5.6, 3.2, '#e58a78');
    R.E(0, -9.4, 5.4, 2.2, 0, AK.cap); R.D(0, -12, AK.cap[2]);
  } else { foeEyes(R, 3, -1, s, 'angry'); }
  R.pop(); R.pop();
}
/* 쓰러지면 퐁 하고 부드러운 반죽 덩어리가 된다 */
function foeDough(R, s) {
  const tone = { acorn: ['#9a6a3c', '#c18f58', '#e0b27c', '#f6d3a4'], mush: ['#c4a898', '#e0c8b8', '#f2ddd0', '#fff0e6'], boss: ['#8a5a2c', '#b07c44', '#d8a468', '#f2c78c'] }[s.type] || ['#9a6a3c', '#c18f58', '#e0b27c', '#f6d3a4'];
  const k = s.type === 'boss' ? 1.7 : 1, sq = s.sq || 0;
  R.E(0, -3.2 * k, (6.4 + sq) * k, (3.8 - sq * .8) * k, 0, tone); R.E(-1.6 * k, -4.4 * k, 2.4 * k, 1.3 * k, 0, [tone[2], tone[3], tone[3], '#ffffff']);
  if (s.type === 'acorn') { R.E(0, -6.4, 3.2, 1.4, 0, AK.cap); R.D(0, -8, AK.cap[2]); }
  if (s.type === 'mush') R.E(0, -6.2, 4.4, 2, 0, AK.mcap);
  if (s.type === 'boss') { for (let i = 0; i < 5; i++) R.P([[i * 2.6 - 6.4, -5.6], [i * 2.6 - 5.2, -9.4], [i * 2.6 - 4, -5.6]], AK.spike, { flat: 2 }); }
  R.DL(-2.4 * k, -3 * k, -1 * k, -3 * k, tone[0]); R.DL(1 * k, -3 * k, 2.4 * k, -3 * k, tone[0]); R.D(-.4, -2 * k, tone[0]); R.D(.4, -2 * k, tone[0]);
}
/* 구운 빵 아이템 */
function breadSprite(kind) {
  const col = { acorn: ['#8a5a2a', '#b07a3c', '#d49f58', '#f0c888'], mush: ['#a07048', '#c8946a', '#e8b890', '#f8d8b4'], boss: ['#7a4a22', '#a8703a', '#d09a58', '#efc486'] }[kind];
  return bakeRig(24, 20, 12, 17, 1, R => {
    R.E(0, -4, 7.4, 4.4, 0, col); R.E(0, -2, 6.8, 2.2, 0, [col[0], col[1], col[1], col[2]]);
    R.DL(-3, -7, -1.4, -5.4, col[3]); R.DL(-.6, -7.4, 1, -5.6, col[3]); R.DL(1.8, -7, 3.2, -5.4, col[3]);
    if (kind === 'acorn') { R.D(-4, -6, AK.cap[2]); R.D(4, -5.6, AK.cap[2]); R.D(0, -3.4, '#f6e4a0'); }
    if (kind === 'mush') { R.D(-3.6, -6.2, '#d94a3a'); R.D(3.4, -6, '#d94a3a'); R.D(0, -7.6, '#ffffff'); }
    if (kind === 'boss') { R.D(-4, -6, '#6a2a1a'); R.D(4, -6, '#6a2a1a'); R.D(0, -8, '#f2c450'); R.D(1, -8, '#f2c450'); }
  }, { outline: '#2a160c', rim: 20, rimCol: '#fff0c8' });
}
const FOE_CACHE = new Map(), FOE_OPT = { outline: AK.outline, rim: 60, rimCol: '#ffe6c0' };
function foeSprite(type, s) {
  const big = type === 'boss', W = big ? 80 : 40, H = big ? 70 : 40, OX = W / 2, OY = big ? 62 : 36;
  const key = [type, s.pose, s.f & 1, Math.round((s.sq || 0) * 6), Math.round((s.bob || 0) * 2), Math.round((s.ang || 0) * 6), Math.round((s.inflate || 0) * 5), Math.round((s.bristle || 0) * 5), s.face].join('|');
  let c = FOE_CACHE.get(key); if (c) return { c, ox: OX, oy: OY };
  const face = s.face || 1;
  c = bakeRig(W, H, OX, OY, face, R => { const o = Object.assign({ type }, s); if (s.pose === 'dead') foeDough(R, o); else if (type === 'acorn') foeAcorn(R, o); else if (type === 'mush') foeMush(R, o); else foeBoss(R, o); }, FOE_OPT);
  FOE_CACHE.set(key, c); if (FOE_CACHE.size > 800) FOE_CACHE.delete(FOE_CACHE.keys().next().value);
  return { c, ox: OX, oy: OY };
}
function drawFoe(g, x, y, type, s) { const o = foeSprite(type, s); g.drawImage(o.c, Math.round(x) - o.ox, Math.round(y) - o.oy); }
