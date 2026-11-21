'use strict';
/* =========================================================
   주인공 (성별을 정하지 않은 작은 사냥꾼): 단발머리 · 큰 머플러 · 숲색 코트 · 가죽 가방 · 대빗자루
   시점: 앞(d) · 뒤(u) · 옆(s). 원점은 발 가운데.
   자세: idle · walk · attack · roll · hurt · sit · faint
   고양이 동행: none · shoulder · arms · bag
   ========================================================= */
const HK = {
  skin: ['#7c4a38', '#a96a4c', '#d99c7a', '#f2c3a3'],
  hair: ['#241812', '#3a251b', '#563623', '#76492f'],
  coat: ['#1c3a3a', '#2a5a52', '#3e7e70', '#62a490'],
  scarf: ['#8a5a14', '#c08a22', '#e8b43a', '#ffda6e'],
  pants: ['#2e2622', '#44362f', '#5c4a40'],
  boot: ['#22150f', '#38261a', '#54392a'],
  bag: ['#5a2a1e', '#8a3f2c', '#b85a3f', '#d98462'],
  handle: ['#5a3d22', '#7a5530', '#a07846'],
  bristle: ['#8a6a24', '#b8942f', '#dcc050', '#f2e08a'],
  outline: '#1b1210',
};
function broom(R, hx, hy, ang, len = 17) {
  R.push(); R.translate(hx, hy); R.rotate(ang);
  R.K2(-3, 0, len - 7, 0, .95, .95, HK.handle);
  R.P([[len - 9, -1.4], [len + 1, -3.6], [len + 4, -.4], [len + 4, .4], [len + 1, 3.6], [len - 9, 1.4]], HK.bristle);
  for (let i = -2; i <= 2; i++) R.DL(len - 8, i * .8, len + 3, i * 1.5, HK.bristle[1]);
  R.DL(len - 9, -1.6, len - 9, 1.6, '#6a4a28');
  R.pop();
}
/* 어깨 위나 가방 속의 작은 고양이 (같은 장비 안에 그려서 함께 외곽선이 생김) */
function miniCat(R, x, y, view, pose, s, sc, face) {
  R.push(); R.translate(x, y); if (face < 0) { R.m[0] *= -1; R.m[1] *= -1; } R.scl(sc);
  drawCatRig(R, { view, pose, f: 0, t: s.t, mood: s.catMood || 'open', tailSw: s.catTail || 0 });
  R.pop();
}
function limbs(R, lx, rx, lLift, rLift, side) {
  // 다리: 바지 + 장화
  for (const [x, lift, far] of [[lx, lLift, true], [rx, rLift, false]]) {
    R.K2(x, -8, x + (side ? lift * -.8 : 0), -2 - Math.max(0, lift), 1.7, 1.45, HK.pants, far ? { b: -.1 } : null);
    R.E(x + (side ? lift * -.8 : 0) + (side ? 1 : 0), -1.4 - Math.max(0, lift), 2.5, 1.5, 0, HK.boot);
  }
}
function heroFront(R, s) {
  const P = s.pose, f = s.f || 0, t = s.t, walk = P === 'walk', carry = s.carry || 'none';
  const lf = walk ? [0, 1, 0, -1][f & 3] : 0, bob = walk ? ((f & 1) ? -1 : 0) : 0, att = P === 'attack', hurt = P === 'hurt';
  limbs(R, -2.6, 2.6, walk ? Math.max(0, lf) * 1.6 : 0, walk ? Math.max(0, -lf) * 1.6 : 0, false);
  R.push(); R.translate(0, bob + (hurt ? 1 : 0));
  // 가방 (옆구리) · 어깨끈
  R.B(6.2, -9, 4, 4.4, 0, HK.bag); R.P([[4.4, -11.2], [8, -11.2], [7.8, -9.6], [4.6, -9.6]], HK.bag, { b: -.2 }); R.D(6.2, -9.6, '#f2c450');
  // 코트
  R.P([[-5.4, -9.4], [5.4, -9.4], [7, -3.8], [-7, -3.8]], HK.coat);
  R.E(0, -13, 5.6, 5.8, 0, HK.coat); R.DL(0, -16, 0, -5, HK.coat[1]);
  for (const y of [-12, -9]) R.D(1.6, y, '#d9b84a');
  // 어깨끈
  R.DL(-4.4, -16.4, 3.8, -8, HK.bag[0]);
  // 팔
  const swing = walk ? lf * 1.6 : 0;
  let aL = [-7, -9.6 + swing], aR = [7, -9.6 - swing];
  if (att) { aR = [s.ax, s.ay]; aL = [-4.8, -9.8]; }
  if (hurt) { aL = [-7.6, -16]; aR = [7.6, -16]; }
  if (carry === 'arms') { aL = [-4, -10.6]; aR = [4.4, -10.2]; }
  R.K2(-4.6, -15, aL[0], aL[1], 1.7, 1.45, HK.coat); R.E(aL[0], aL[1] + .6, 1.6, 1.6, 0, HK.skin);
  
  R.K2(4.6, -15, aR[0], aR[1], 1.7, 1.45, HK.coat); R.E(aR[0], aR[1] + .6, 1.6, 1.6, 0, HK.skin);
  // 머플러
  R.E(0, -17.2, 6.3, 2.4, 0, HK.scarf);
  R.P([[1.8, -16], [5.2, -16], [5.8, -8], [3.2, -8.4]], HK.scarf); for (const y of [-14, -11]) R.DL(2, y, 5.6, y + .2, HK.scarf[0]);
  // 가방 속 고양이 (앞에서는 어깨 너머로 귀만)
  
  // 머리
  const hy = -23.6 + (hurt ? 1 : 0);
  R.E(-6.6, hy + 1, 2, 3.6, 0, HK.hair);
  R.E(0, hy, 6.8, 6, 0, HK.skin);
  R.P([[-7.4, hy + 1.2], [-7, hy - 4.4], [-3.8, hy - 6.8], [0, hy - 7.4], [3.8, hy - 6.8], [7, hy - 4.4], [7.4, hy + 1.2], [5.8, hy - 1.4], [2.8, hy - 2.8], [-1, hy - 2.4], [-4.6, hy - 1.6]], HK.hair);
  R.E(6.6, hy + 1, 2, 3.6, 0, HK.hair);
  if (hurt) { R.DL(-3.6, hy + .6, -1.6, hy + 1.6, '#2a1814'); R.DL(1.6, hy + 1.6, 3.6, hy + .6, '#2a1814'); R.D(0, hy + 3.6, '#7a2e26'); R.D(-.6, hy + 3.2, '#7a2e26'); R.D(.6, hy + 3.2, '#7a2e26'); }
  else {
    const bl = s.blink;
    if (bl) { R.DL(-3.6, hy + 1.2, -1.6, hy + 1.2, '#2a1814'); R.DL(1.6, hy + 1.2, 3.6, hy + 1.2, '#2a1814'); }
    else for (const x of [-2.6, 2.6]) { R.D(x, hy + .4, '#2a1814'); R.D(x, hy + 1.4, '#2a1814'); R.D(x - .4, hy + .2, '#ffffff'); }
    R.D(-4.4, hy + 2.8, '#e58a78'); R.D(4.4, hy + 2.8, '#e58a78'); R.D(-.6, hy + 3.8, '#7a3a30'); R.D(.6, hy + 3.8, '#7a3a30');
  }
  
  R.pop();
  if (att) broom(R, s.ax, s.ay + bob, s.ba, 17);
}
function heroBack(R, s) {
  const P = s.pose, f = s.f || 0, walk = P === 'walk', carry = s.carry || 'none', hurt = P === 'hurt', att = P === 'attack';
  const lf = walk ? [0, 1, 0, -1][f & 3] : 0, bob = walk ? ((f & 1) ? -1 : 0) : 0;
  limbs(R, -2.6, 2.6, walk ? Math.max(0, lf) * 1.6 : 0, walk ? Math.max(0, -lf) * 1.6 : 0, false);
  R.push(); R.translate(0, bob);
  const swing = walk ? lf * 1.6 : 0;
  let aL = [-7, -9.6 - swing], aR = [7, -9.6 + swing];
  if (att) { aL = [s.ax, s.ay]; aR = [4.8, -9.8]; }
  if (hurt) { aL = [-7.6, -16]; aR = [7.6, -16]; }
  R.K2(-4.6, -15, aL[0], aL[1], 1.7, 1.45, HK.coat); R.E(aL[0], aL[1] + .6, 1.6, 1.6, 0, HK.skin);
  R.P([[-5.4, -9.4], [5.4, -9.4], [7, -3.8], [-7, -3.8]], HK.coat); R.E(0, -13, 5.6, 5.8, 0, HK.coat); R.DL(0, -17, 0, -5, HK.coat[0]);
  // 배낭
  R.B(0, -11.4, 9, 9.6, 0, HK.bag); R.P([[-4.4, -16], [4.4, -16], [4, -12.4], [-4, -12.4]], HK.bag, { b: .1 }); R.D(0, -12.6, '#f2c450'); R.D(-1, -12.6, '#f2c450');
  R.DL(-4, -15, -4, -7.6, HK.bag[0]); R.DL(4, -15, 4, -7.6, HK.bag[0]);
  R.E(0, -17.2, 6.3, 2.4, 0, HK.scarf);
  
  R.K2(4.6, -15, aR[0], aR[1], 1.7, 1.45, HK.coat); R.E(aR[0], aR[1] + .6, 1.6, 1.6, 0, HK.skin);
  const hy = -23.6;
  R.E(0, hy, 6.8, 6, 0, HK.hair); R.P([[-6.8, hy + 1], [-4, hy - 6.2], [0, hy - 7.4], [4, hy - 6.2], [6.8, hy + 1], [3.6, hy + 4.2], [-3.6, hy + 4.2]], HK.hair);
  R.E(0, hy + 4.4, 3, 1.8, 0, HK.hair); R.DL(-2, hy - 2, 2, hy - 2, HK.hair[3]); R.DL(-3.4, hy, -3, hy + 3, HK.hair[0]); R.DL(3.4, hy, 3, hy + 3, HK.hair[0]);
  
  R.pop();
  if (att) broom(R, s.ax, s.ay + bob, s.ba, 17);
}
function heroSide(R, s) {
  const P = s.pose, f = s.f || 0, t = s.t, walk = P === 'walk', carry = s.carry || 'none', hurt = P === 'hurt', att = P === 'attack';
  const sw = walk ? [0, 1, 0, -1][f & 3] : 0, bob = walk ? ((f & 1) ? -1 : 0) : 0;
  // 다리 (앞뒤로 벌어짐)
  R.K2(0, -8, -sw * 3, -2 - Math.max(0, sw) * 1.6, 1.7, 1.45, HK.pants, { b: -.1 }); R.E(-sw * 3 + 1, -1.4 - Math.max(0, sw) * 1.6, 2.6, 1.5, 0, HK.boot);
  R.K2(0, -8, sw * 3, -2 - Math.max(0, -sw) * 1.6, 1.7, 1.45, HK.pants); R.E(sw * 3 + 1, -1.4 - Math.max(0, -sw) * 1.6, 2.6, 1.5, 0, HK.boot);
  R.push(); R.translate(0, bob);
  // 멀리 있는 팔
  const asw = walk ? sw * 3 : 0;
  let far = [-asw, -9.4], near = [asw, -9.4];
  if (att) { near = [s.ax, s.ay]; far = [s.ax - 1, s.ay + 1]; }
  if (hurt) { near = [-3, -16]; far = [-5, -15]; }
  if (carry === 'arms') { near = [4.8, -10.6]; far = [3.6, -10.2]; }
  R.K2(0, -15, far[0], far[1], 1.5, 1.3, HK.coat, { b: -.15 }); R.E(far[0], far[1] + .6, 1.5, 1.5, 0, HK.skin);
  // 가방 (등)
  R.B(-5.4, -11, 3.6, 7, 0, HK.bag); R.P([[-7.4, -14.4], [-3.4, -14.4], [-3.6, -12], [-7.2, -12]], HK.bag, { b: -.2 }); R.D(-5.4, -12.4, '#f2c450');
  
  // 코트
  R.P([[-4.6, -9.4], [4.6, -9.4], [5.8, -3.8], [-5.8, -3.8]], HK.coat); R.E(0, -13, 4.8, 5.8, 0, HK.coat); R.DL(1.6, -16, 1.6, -5, HK.coat[3]);
  R.DL(-3.4, -15, 3.6, -8.6, HK.bag[0]);
  
  // 머플러와 날리는 꼬리
  const fl = Math.sin(t * 7) * .8 + (walk ? 1.6 : .4) + (s.scarfV || 0);
  R.E(.6, -17.2, 5, 2.4, 0, HK.scarf);
  R.K2(-3, -16.2, -6, -14.8 + fl * .3, 1.6, 1.4, HK.scarf); R.K2(-6, -14.8 + fl * .3, -8.6, -12.8 + fl * .7, 1.4, 1.1, HK.scarf);
  // 가까운 팔
  R.K2(1, -15, near[0], near[1], 1.6, 1.4, HK.coat); R.E(near[0], near[1] + .6, 1.6, 1.6, 0, HK.skin);
  // 머리 (옆)
  const hy = -23.6 + (hurt ? 1 : 0);
  R.E(-4, hy + 1, 3.6, 5, 0, HK.hair);
  R.E(.8, hy, 6.2, 6, 0, HK.skin);
  R.P([[-5.8, hy + 2], [-5.4, hy - 4.6], [-2, hy - 7], [2.4, hy - 7], [5.6, hy - 4.6], [6, hy - 1.6], [3.4, hy - 3], [.4, hy - 2.6], [-1.4, hy - .4], [-2.4, hy + 3.6]], HK.hair);
  R.E(-4.8, hy + 4.4, 2.2, 2, 0, HK.hair);
  R.D(6.8, hy + 1.6, HK.skin[3]); R.D(7.2, hy + 2, HK.skin[3]);
  if (hurt) { R.DL(2.4, hy + .6, 4.4, hy + 1.6, '#2a1814'); R.D(6.2, hy + 3.8, '#7a2e26'); }
  else { if (s.blink) R.DL(2.6, hy + 1.4, 4.6, hy + 1.4, '#2a1814'); else { R.D(3.6, hy + .4, '#2a1814'); R.D(3.6, hy + 1.4, '#2a1814'); R.D(3.2, hy + .2, '#ffffff'); } R.D(2.4, hy + 3, '#e58a78'); R.D(5.8, hy + 3.8, '#7a3a30'); R.D(6.4, hy + 3.6, '#7a3a30'); }
  
  R.pop();
  if (att) broom(R, s.ax, s.ay + bob, s.ba, 17);
}
/* 구르기: 둥글게 말린 공 */
function heroRoll(R, s) {
  const a = s.ang || 0, carry = s.carry;
  R.push(); R.translate(0, -7); R.rotate(a);
  R.E(0, 0, 6.8, 6.4, 0, HK.coat); R.E(1.4, 1.6, 3.4, 3.2, 0, HK.scarf); R.E(-3.4, -2.4, 2.6, 2.4, 0, HK.hair); R.E(3.2, -4.6, 3.2, 2.8, 0, HK.hair); R.E(3.6, -3.8, 2.4, 2, 0, HK.skin);
  R.B(-4.4, 2.8, 3.4, 3.6, 0, HK.bag); R.E(5.4, 3, 2.2, 1.7, 0, HK.boot); R.E(-1.4, 5.6, 2.2, 1.7, 0, HK.boot);
  
  R.pop();
}
/* 앉기 (모닥불 곁): 두 다리를 접고 고양이를 무릎에 */
function heroSit(R, s) {
  const t = s.t, pet = s.pet || 0;
  R.E(-5, -2, 4.4, 2.2, .2, HK.pants); R.E(5, -2, 4.4, 2.2, -.2, HK.pants); R.E(-7.4, -1.4, 2.6, 1.6, 0, HK.boot); R.E(7.4, -1.4, 2.6, 1.6, 0, HK.boot);
  R.B(7.8, -5, 3.6, 4, 0, HK.bag);
  R.P([[-6, -4], [6, -4], [7, -1], [-7, -1]], HK.coat); R.E(0, -9, 5.6, 6.2, 0, HK.coat); R.DL(0, -14, 0, -4, HK.coat[1]); R.D(1.6, -8, '#d9b84a'); R.D(1.6, -10.6, '#d9b84a');
  R.DL(-4.4, -13, 3.8, -5, HK.bag[0]);
  
  const hand = pet ? Math.sin(t * 9) * 1.6 : 0;
  R.K2(-4.6, -12, -3.4, -5.4, 1.7, 1.45, HK.coat); R.E(-3.4, -4.8, 1.6, 1.6, 0, HK.skin);
  R.K2(4.6, -12, 2.2 + hand, -6.6 - (pet ? 1 : 0), 1.7, 1.45, HK.coat); R.E(2 + hand, -6 - (pet ? 1 : 0), 1.6, 1.6, 0, HK.skin);
  R.E(0, -14.6, 6.3, 2.3, 0, HK.scarf); R.P([[1.8, -13.6], [5, -13.6], [5.6, -6.6], [3.2, -7]], HK.scarf);
  const hy = -20.4;
  R.E(-6.6, hy + 1, 2, 3.4, 0, HK.hair); R.E(0, hy, 6.8, 6, 0, HK.skin);
  R.P([[-7.4, hy + 1.2], [-7, hy - 4.4], [-3.8, hy - 6.8], [0, hy - 7.4], [3.8, hy - 6.8], [7, hy - 4.4], [7.4, hy + 1.2], [5.8, hy - 1.4], [2.8, hy - 2.8], [-1, hy - 2.4], [-4.6, hy - 1.6]], HK.hair);
  R.E(6.6, hy + 1, 2, 3.4, 0, HK.hair);
  R.DL(-3.6, hy + 1.2, -1.6, hy + 1.8, '#2a1814'); R.DL(1.6, hy + 1.8, 3.6, hy + 1.2, '#2a1814'); R.D(-4.4, hy + 2.8, '#e58a78'); R.D(4.4, hy + 2.8, '#e58a78'); R.D(-.6, hy + 3.8, '#7a3a30'); R.D(.6, hy + 3.8, '#7a3a30');
}
/* 기절: 대(大)자로 누움 */
function heroFaint(R, s) {
  R.E(-8, -2, 5, 2.6, 0, HK.pants); R.E(-11, -1.4, 2.6, 1.6, 0, HK.boot);
  R.E(0, -3.4, 6.6, 3.4, 0, HK.coat); R.B(-1, -6, 4, 2.6, 0, HK.bag);
  R.E(2, -5.6, 5, 1.8, 0, HK.scarf);
  R.E(7.6, -2.8, 4.6, 4, 0, HK.skin); R.P([[3.4, -3.4], [4.2, -7], [8.4, -7.6], [11.8, -5.4], [11.6, -3], [8.6, -4.6], [5.4, -4]], HK.hair);
  R.DL(8.6, -3.6, 9.6, -2.6, '#2a1814'); R.DL(9.6, -3.6, 8.6, -2.6, '#2a1814'); R.D(10.8, -1.4, '#7a3a30');
  R.E(-2.4, -5, 2.6, 1.6, .6, HK.skin);
}
const HERO_CACHE = new Map(), HERO_OPT = { outline: HK.outline, rim: 60, rimCol: '#ffe6c0' };
const HW = 76, HH = 64, HOX = 38, HOY = 56;
/* 고양이 자리: 방향과 동행 방식마다 위치·크기·앞뒤를 정함 (front=true면 주인공 앞에 겹침) */
function catLayer(dir, s) {
  if (s.pose === 'sit') return { x: 0, y: -3.4, view: 'd', pose: s.catPose || 'loaf', sc: 1.02, front: true };
  const c = s.carry || 'none'; if (c === 'none' || s.pose === 'roll' || s.pose === 'faint') return null;
  if (dir === 'd') return c === 'shoulder' ? { x: -9, y: -14.6, view: 'd', pose: 'sit', sc: .68, front: true } : c === 'arms' ? { x: 0, y: -8.6, view: 'd', pose: 'loaf', sc: .8, front: true } : { x: -8.4, y: -14.4, view: 'd', pose: 'peek', sc: .9, front: true };
  if (dir === 'u') return c === 'shoulder' ? { x: 9, y: -14.6, view: 'u', pose: 'sit', sc: .68, front: true } : c === 'arms' ? { x: -7.4, y: -12.4, view: 'u', pose: 'peek', sc: .72, front: false } : { x: 3.4, y: -16.8, view: 'u', pose: 'peek', sc: .9, front: true };
  return c === 'shoulder' ? { x: -2.4, y: -15.8, view: 's', pose: 'sit', sc: .64, front: true } : c === 'arms' ? { x: 5.4, y: -10, view: 's', pose: 'loaf', sc: .84, front: true } : { x: -5.8, y: -15.6, view: 's', pose: 'peek', sc: .9, front: true };
}
function heroSprite(dir, s) {
  const face = dir === 'l' ? -1 : 1, view = dir === 'l' || dir === 'r' ? 's' : dir;
  const key = [dir, s.pose, s.f || 0, s.carry || 'none', Math.round((s.ax || 0) * 2), Math.round((s.ay || 0) * 2), Math.round((s.ba || 0) * 10), s.blink ? 1 : 0, s.pet ? 1 : 0, s.catPose || '', Math.round((s.ang || 0) * 5), Math.round((s.scarfV || 0) * 2), (s.pose === 'walk' || s.carry !== 'none') ? Math.round(s.t * 2) % 5 : 0, s.catMood || '', Math.round((s.catTail || 0) * 2)].join('|');
  let c = HERO_CACHE.get(key); if (c) return c;
  const hp = new PB(HW, HH), R = RIG.reset(face, HOX, HOY);
  if (s.pose === 'roll') heroRoll(R, s); else if (s.pose === 'sit') heroSit(R, s); else if (s.pose === 'faint') heroFaint(R, s);
  else if (view === 'd') heroFront(R, s); else if (view === 'u') heroBack(R, s); else heroSide(R, s);
  rasterRig(hp, R, HERO_OPT);
  let out = hp; const L = catLayer(dir, s);
  if (L) {
    const cp = new PB(HW, HH), R2 = RIG.reset(face, HOX, HOY); R2.translate(L.x, L.y); R2.scl(L.sc);
    drawCatRig(R2, { view: L.view, pose: L.pose, f: 0, t: s.t, mood: s.catMood || 'open', tailSw: s.catTail || 0 });
    rasterRig(cp, R2, CAT_OPT);
    out = new PB(HW, HH); if (L.front) { out.blit(hp, 0, 0); out.blit(cp, 0, 0); } else { out.blit(cp, 0, 0); out.blit(hp, 0, 0); }
  }
  c = out.canvas(); HERO_CACHE.set(key, c); if (HERO_CACHE.size > 1400) HERO_CACHE.delete(HERO_CACHE.keys().next().value);
  return c;
}
function drawHero(g, x, y, dir, s) { g.drawImage(heroSprite(dir, s), Math.round(x) - HOX, Math.round(y) - HOY); }
/* 공격 자세 계산: 프레임 0~3 → 손 위치와 빗자루 각도 */
function atkPose(dir, f, swing) {
  const k = clamp(f, 0, 3);
  if (dir === 'r' || dir === 'l') { const a = [-2.3, -1.1, .2, .55][k]; return { ax: [1.4, 5.8, 8.2, 8][k], ay: [-17, -15.4, -11.8, -10.6][k], ba: a }; }
  if (dir === 'd') { const a = [-2.7, -1.2, .4, 1.1][k]; return { ax: [5.6, 7.4, 8.4, 6.4][k], ay: [-18.2, -15.6, -10.8, -7.2][k], ba: a }; }
  const a = [-.5, -1.7, -2.6, -3][k]; return { ax: [-5.6, -7.4, -8.4, -7][k], ay: [-17.6, -15.8, -12.4, -9.6][k], ba: a };
}
function heroPortrait() { return bakeRig(40, 44, 20, 42, 1, R => { R.scl(1.4); heroFront(R, { pose: 'idle', f: 0, t: 1, carry: 'none' }); }, HERO_OPT); }
