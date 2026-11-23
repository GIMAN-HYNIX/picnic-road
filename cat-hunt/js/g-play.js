'use strict';
/* =========================================================
   방랑자 조작
   - 출발과 멈춤이 바로 됨 (미끄러지지 않음), 장애물은 비껴 지나감
   - 누른 동작은 잠깐 기억해 뒀다가(0.16초) 가능해지는 순간 실행 → 연타가 씹히지 않음
   - 칼: 3연속. 가까운 물그림자 쪽으로 방향을 살짝 맞춰 줌. 베는 순간 구르기로 끊을 수 있음
   - 총: 겨누고 가만히 있으면 숨을 골라 탄착이 모임(무릎쏴). 한 발 쏘면 노리쇠를 당김
   - 구르기: 짧은 무적. 방향 입력이 없으면 뒤로 물러남
   ========================================================= */
const PL = { x: 0, y: 0, vx: 0, vy: 0, dir: 'd', st: 'move', t: 0, ph: 0, gait: 'idle', sneak: false, hp: 10, walked: 0, ammo: 8, inv: 0, combo: 0, comboT: 0, swA: 0, swHit: false, aimA: 0, steady: 0, kneel: false,
  bolt: 0, boltSnd: 0, recoil: 0, buf: '', bufT: 0, dodgeCd: 0, dvx: 0, dvy: 0, hidden: false, hx: 0, hy: 1, idleT: 0, lock: null, eT: 0, eUsed: true, tUsed: false, arg: null, done: 0, hurtT: 0, kills: 0 };
const BAG = new Array(10).fill(null), GITEMS = [], FOES = [];
const UI = { bag: 0, sel: -1, help: true, ammoT: 0, prompt: null, fade: 0, tent: 0 };
const ITEM = {
  shroom: { n: '버섯', d: '갓이 갈색인 숲 버섯. 텐트에서 구워 먹어요.', food: 1 }, berry: { n: '산딸기', d: '새콤한 열매. 텐트에서 밥으로 먹어요.', food: 1 },
  bird: { n: '솔이 잡아 온 참새', d: '솔의 선물이에요. 불에 구워 둘이 나눠 먹어요.', food: 1 },
  pot_d: { n: '찌그러진 냄비', d: '훼손된 물건. 물을 한 번 끓이면 못 쓰게 돼요.' }, pot: { n: '온전한 냄비', d: '잊힌 물건. 제 쓰임대로 써 주면 해방돼요.' }, pot_f: { n: '해방된 냄비', d: '쓰임을 다해 평온해졌어요. 계속 쓸 수 있어요.' },
};
const bagAdd = k => { const i = BAG.indexOf(null); if (i < 0) return false; BAG[i] = k; return true; };
const bagTake = k => { const i = BAG.indexOf(k); if (i < 0) return false; BAG[i] = null; return true; };
const bagFood = () => BAG.find(k => k && ITEM[k].food);
const pBuf = a => { PL.buf = a; PL.bufT = .16; };
const pTake = a => { if (PL.buf === a && PL.bufT > 0) { PL.buf = ''; return true; } return false; };
const DIRA = { r: 0, l: Math.PI, u: -Math.PI / 2, d: Math.PI / 2 };

function pMove(tx, ty, dt, resp) {
  const k = 1 - Math.exp(-dt * resp); PL.vx += (tx - PL.vx) * k; PL.vy += (ty - PL.vy) * k;
  if (!tx && !ty && Math.hypot(PL.vx, PL.vy) < 7) PL.vx = PL.vy = 0;
  const ox = PL.x, oy = PL.y; let n = WORLD.push(PL.x + PL.vx * dt, PL.y + PL.vy * dt, 9); n = campPush(n[0], n[1], 9);
  PL.x = n[0]; PL.y = n[1]; return Math.hypot(PL.x - ox, PL.y - oy);
}
function pSteps(moved) {
  const lam = MG[PL.gait] ? MG[PL.gait].lam * 2 : 90, b = PL.ph; PL.ph = (PL.ph + moved / lam) % 1;
  PL.walked += moved * (PL.gait === 'run' ? 1.5 : 1);
  if (PL.walked > 26000) { PL.walked = 0; if (PL.hp > 1) { PL.hp--; say('오래 걸어서 조금 지쳤어요.'); } }
  if ((b < .5 && PL.ph >= .5) || PL.ph < b) {
    const t = WORLD.terr(PL.x, PL.y), w = t === 4 || t === 5;
    GSFX.step(w ? 'water' : t === 1 ? 'dirt' : t === 3 ? 'litter' : t === 6 ? 'wood' : 'grass', PL.gait === 'sneak' ? .35 : PL.gait === 'run' ? 1.25 : .8);
    if (w) { ring(PL.x, PL.y, 8, .45); drops(PL.x, PL.y, 2, 3, 40, '#9ab8d4', 70); }
    if (PL.gait === 'run') noise(PL.x, PL.y, 210); else if (PL.gait === 'walk') noise(PL.x, PL.y, 95);
  }
  brushFerns(PL.x, PL.y, PL.vx, PL.gait === 'sneak' ? .4 : 1);
}
// 솔을 데리고 있으면 내려 주고(또는 솔이 뛰쳐나가고) 동작을 이어 감
function pUnload(kind) { if (SO.mode === 'arms' || SO.mode === 'under' || (SO.mode === 'bag' && kind === 'dodge')) solEject(kind === 'dodge' ? 'jolt' : 'down'); }
function pStart(st, arg, tx) { PL.st = st; PL.t = 0; PL.arg = arg || null; PL.done = 0; PL.sneak = false; if (tx != null) PL.dir = tx >= PL.x ? 'r' : 'l'; else if (PL.dir === 'u' || PL.dir === 'd') PL.dir = 'r'; }

function pDodge() {
  pUnload('dodge');
  let dx = IN.mx, dy = IN.my; if (!dx && !dy) { dx = -Math.cos(DIRA[PL.dir]); dy = -Math.sin(DIRA[PL.dir]); } else PL.dir = dir4(dx, dy, PL.dir);
  const l = Math.hypot(dx, dy); PL.dvx = dx / l; PL.dvy = dy / l; PL.st = 'dodge'; PL.t = 0; PL.sneak = false; PL.kneel = false;
  GSFX.dodge(); noise(PL.x, PL.y, 120); drops(PL.x, PL.y, 2, 4, 50, '#9ab8d4', 60);
}
const KNF = [[.06, .1, .16, 1, 58, 16], [.06, .1, .16, 1, 58, 16], [.1, .12, .26, 2, 72, 30]];   // 준비 · 베기 · 거두기 · 피해 · 닿는 거리 · 내딛는 거리
function pKnife(c) {
  pUnload('knife'); PL.combo = c; PL.st = 'knife'; PL.t = 0; PL.swHit = false; PL.sneak = false;
  let a = IN.stick ? Math.atan2(IN.ay, IN.ax) : IN.mouseT < 2.5 && !V.touch ? Math.atan2(IN.cy + CAM.y - (PL.y - 40), IN.cx + CAM.x - PL.x) : IN.mx || IN.my ? Math.atan2(IN.my, IN.mx) : DIRA[PL.dir];
  let best = null, bd = 112; for (const f of FOES) if (f.live) { const d = dist(f, PL); if (d < bd && Math.abs(angDiff(Math.atan2(f.y - PL.y, f.x - PL.x), a)) < 1.05) { bd = d; best = f; } }
  if (best) a = Math.atan2(best.y - PL.y, best.x - PL.x);
  PL.swA = a; PL.dir = dir4(Math.cos(a), Math.sin(a), PL.dir);
}
function pSlash(K) {
  let any = false;
  for (const f of FOES) { if (!f.live) continue; const d = dist(f, PL); if (d < K[4] + 16 * f.k && (d < 30 || Math.abs(angDiff(Math.atan2(f.y - PL.y, f.x - PL.x), PL.swA)) < 1.15)) { foeHurt(f, K[3], PL.swA, PL.combo === 2 ? 240 : 130, 'knife'); any = true; } }
  if (any) { V.hitstop = PL.combo === 2 ? .09 : .05; V.shake = Math.max(V.shake, PL.combo === 2 ? 5 : 2.5); GSFX.slash(); noise(PL.x, PL.y, 160); }
  brushFerns(PL.x + Math.cos(PL.swA) * 30, PL.y + Math.sin(PL.swA) * 30, Math.cos(PL.swA) * 100, 1.4);
}
function pAimAngle(oy) {   // 오른쪽 막대 > 마우스 > 자동(가장 가까운 물그림자)
  if (IN.stick) { PL.lock = null; return Math.atan2(IN.ay, IN.ax); }
  if (IN.mouseT < 3 && !V.touch) { PL.lock = null; return Math.atan2(IN.cy + CAM.y - (PL.y - oy), IN.cx + CAM.x - PL.x); }
  let best = null, bd = 560; for (const f of FOES) if (f.live) { const d = dist(f, PL); if (d < bd) { bd = d; best = f; } }
  PL.lock = best;
  return best ? Math.atan2(best.y - 14 * best.k - (PL.y - oy), best.x - PL.x) : IN.mx || IN.my ? Math.atan2(IN.my, IN.mx) : PL.aimA;
}
// 지금 조준 자세의 그림 옵션 (그리기와 총구 위치 계산이 같이 씀)
function pAimOpt() {
  const loc = PL.dir === 'l' ? angDiff(Math.PI - PL.aimA, 0) : PL.aimA, q = Math.round(loc * 12 / Math.PI) * Math.PI / 12;
  return { a: q, kneel: PL.kneel && (PL.dir === 'l' || PL.dir === 'r'), recoil: PL.recoil > .45 ? 1 : 0, bolt: PL.bolt > .3 && PL.bolt < .7 ? 1 : 0, cat: solCarryOpt() };
}
function pFire(oy) {
  UI.ammoT = 3;
  if (PL.ammo <= 0) { GSFX.dry(); say('총알이 없어요.'); return; }
  PL.ammo--;
  let a = PL.aimA, tf = null, td = .075;   // 과녁이 조준선에서 4도 안이면 조금 끌어 줌
  for (const f of FOES) if (f.live) { const fa = Math.atan2(f.y - 14 * f.k - (PL.y - oy), f.x - PL.x), d = Math.abs(angDiff(fa, a)); if (d < td) { td = d; tf = fa; } }
  if (tf != null) a += angDiff(tf, a) * .6;
  a += (Math.random() * 2 - 1) * (lerp(7, .6, PL.steady) + (Math.hypot(PL.vx, PL.vy) > 8 ? 4 : 0)) * Math.PI / 180;
  const dx = Math.cos(a), dy = Math.sin(a), ox = PL.x, oyy = PL.y - oy; let max = WORLD.ray(PL.x, PL.y, dx, dy, 760), hit = null;
  for (const f of FOES) { if (!f.live) continue; const cx = f.x - ox, cy = f.y - 14 * f.k - oyy, t = cx * dx + cy * dy; if (t > 0 && t < max && Math.abs(cx * dy - cy * dx) < 16 * f.k + 3) { max = t; hit = f; } }
  const s = manSpr('aim', 0, PL.dir, pAimOpt()), m = s.a ? [PL.x - s.ox + s.a.muz[0], PL.y - s.oy + s.a.muz[1]] : [ox + dx * 50, oyy + dy * 50], ex = ox + dx * max, ey = oyy + dy * max;
  part({ k: 'tracer', x: m[0], y: m[1], x2: ex, y2: ey, life: .09 }); part({ k: 'flash', x: m[0], y: m[1], a, life: .07 });
  for (let i = 0; i < 6; i++) part({ k: 'smoke', x: m[0] + dx * 4, y: m[1] + dy * 4, vx: dx * (30 + Math.random() * 70) + (Math.random() - .5) * 24, vy: dy * (30 + Math.random() * 70) - 14, life: .5 + Math.random() * .6, s: 2 + Math.random() * 3 });
  if (hit) { foeHurt(hit, PL.steady >= .9 ? 6 : 4, a, 280, 'gun'); V.hitstop = .1; }
  else if (max < 759) for (let i = 0; i < 6; i++) part({ k: 'drop', x: ex, y: ey + oy, z: oy, vx: -dx * 60 + (Math.random() - .5) * 80, vy: (Math.random() - .5) * 30, vz: 60 + Math.random() * 80, life: .5, c: '#8a6a4a' });
  PL.recoil = 1; PL.bolt = .85; PL.boltSnd = 1; PL.steady *= .25; V.shake = Math.max(V.shake, 7); V.flash = .07; PL.vx -= dx * 70; PL.vy -= dy * 70;
  GSFX.shot(); noise(PL.x, PL.y, 560, true); solGunshot(); birdsScare(PL.x, PL.y, 900);
  hint('bolt', '쏘고 나면 노리쇠를 당기는 동안 잠깐 못 쏴요. 총소리에 놀란 솔은 숨었다가 돌아와요.');
}
function pHurt(n, fx, fy) {
  if (PL.inv > 0 || PL.st === 'down' || PL.st === 'camp' || PL.st === 'tent' || (PL.st === 'dodge' && PL.t < .25)) return false;
  PL.hp = Math.max(0, PL.hp - n); PL.inv = 1.1; PL.st = 'hit'; PL.t = 0; PL.sneak = false; PL.kneel = false; PL.hurtT = .5;
  const a = Math.atan2(PL.y - fy, PL.x - fx); PL.vx = Math.cos(a) * 190; PL.vy = Math.sin(a) * 190;
  V.shake = Math.max(V.shake, 6); V.hitstop = .07; GSFX.hurt(); drops(PL.x, PL.y, 40, 8, 70);
  if (SO.mode !== 'free') solEject('jolt'); SO.fear = Math.min(1, SO.fear + .25);
  if (PL.hp <= 0) { PL.st = 'down'; PL.t = 0; }
  else if (PL.hp <= 3) hint('low', '체력이 얼마 안 남았어요. 조용한 곳에서 T를 길게 눌러 텐트를 쳐요.');
  return true;
}
function pInteract() {
  const p = IN.p;
  for (let i = GITEMS.length - 1; i >= 0; i--) {   // 줍기는 지나가기만 해도 됨
    const it = GITEMS[i]; if (it.t < .5 || Math.hypot(it.x - PL.x, it.y - PL.y) > 30) continue;
    if (bagAdd(it.k)) { GITEMS.splice(i, 1); GSFX.pick(); say(ITEM[it.k].n + ' 획득'); UI.bag = 2.2; if (it.k === 'pot_d') hint('pot', '찌그러진 냄비는 텐트에서 물을 끓일 때 한 번 쓸 수 있어요. Tab으로 가방을 열어요.'); }
    else if (!it.full) { it.full = 1; say('가방이 가득 찼어요.'); }
  }
  let tg = null;
  if (SO.mode === 'arms' || SO.mode === 'bag') tg = { k: 'carry' };
  else {
    let bd = 48; for (const f of WORLD.forage) { if (f.n <= 0) continue; const d = Math.hypot(f.x - PL.x, f.y - 6 - PL.y); if (d < bd) { bd = d; tg = { k: 'forage', f }; } }
    if (!tg && solTouchable()) tg = { k: 'sol' };
  }
  UI.prompt = tg;
  if (p.e) { PL.eT = 0; PL.eUsed = false; }
  if (!tg) return;
  const tap = p.eUp && !PL.eUsed && IN.eHold === 0, hold = IN.eHold >= .42 && !PL.eUsed;
  if (tg.k === 'forage') { if (p.e) { PL.eUsed = true; pStart('gather', tg.f, tg.f.x); } }
  else if (tg.k === 'sol') {
    if (hold) { PL.eUsed = true; if (SO.mode === 'under') solEject('down'); pStart('lift', null, SO.x); solBeHeld(); }
    else if (tap) { if (SO.mode === 'under') solEject('down'); pStart('pet', null, SO.x); solBePet(); }
  } else if (hold) { PL.eUsed = true; pStart('putdown'); }
  else if (tap) { pStart('swap'); GSFX.cloth(); }
}
function pUpdate(dt) {
  const p = IN.p; PL.t += dt; PL.inv = Math.max(0, PL.inv - dt); PL.dodgeCd -= dt; PL.recoil = Math.max(0, PL.recoil - dt * 6); PL.hurtT -= dt; PL.comboT -= dt; UI.ammoT -= dt;
  if (PL.bufT > 0) PL.bufT -= dt;
  if (PL.bolt > 0) { PL.bolt -= dt; if (PL.boltSnd && PL.bolt < .55) { PL.boltSnd = 0; GSFX.bolt(); } }
  if (p.dodge) pBuf('dodge');
  if (p.lmb || p.knife) pBuf(IN.aim || PL.st === 'aim' ? 'fire' : 'knife');
  if (p.fireT) pBuf('fire');
  if (p.sneak && (PL.st === 'move' || PL.st === 'aim')) { PL.sneak = !PL.sneak; if (PL.sneak) hint('sneak', '몸을 낮추면 발소리가 안 나요. 고사리 속에서는 물그림자가 못 봐요. 솔도 같이 몸을 낮춰요.'); }
  if (IN.tHold === 0) PL.tUsed = false;
  PL.hidden = PL.sneak && nearCover(PL.x, PL.y);
  const st = PL.st;
  if (st === 'move') {
    if (pTake('dodge') && PL.dodgeCd <= 0) return pDodge();
    if (IN.aim) { pUnload('aim'); PL.st = 'aim'; PL.t = 0; PL.steady = 0; PL.kneel = false; PL.aimA = pAimAngle(84); GSFX.cloth(); hint('aim', '가만히 겨누면 숨을 골라 탄착이 모여요. 다 모이면 한 방이 더 세요. 왼쪽 단추로 쏴요.'); return; }
    if (pTake('knife')) return pKnife(PL.comboT > 0 ? (PL.combo + 1) % 3 : 0);
    const sp = (PL.sneak ? 50 : IN.run && SO.mode !== 'arms' ? 195 : 100) * (WORLD.wet(PL.x, PL.y) ? .72 : 1) * (PL.hp <= 2 && !PL.sneak ? .85 : 1);
    const moved = pMove(IN.mx * sp, IN.my * sp, dt, IN.mx || IN.my ? 16 : 22), v = Math.hypot(PL.vx, PL.vy);
    if (IN.mx || IN.my) { PL.dir = dir4(IN.mx, IN.my, PL.dir); const l = Math.hypot(IN.mx, IN.my); PL.hx = IN.mx / l; PL.hy = IN.my / l; }
    const g = v > 12 ? (PL.sneak ? 'sneak' : v > 150 ? 'run' : 'walk') : PL.sneak ? 'sneakIdle' : 'idle';
    if (g !== PL.gait) { if (v <= 12) PL.ph = 0; PL.gait = g; }
    if (v > 12) { pSteps(moved); PL.idleT = 0; } else PL.idleT += dt;
    pInteract();
    if (IN.tHold >= .9 && !PL.tUsed) { PL.tUsed = true; campTry(); }
  } else if (st === 'aim') {
    if (pTake('dodge') && PL.dodgeCd <= 0) return pDodge();
    if (!IN.aim && PL.t > .12 && !(PL.buf === 'fire' && PL.bufT > 0)) { PL.st = 'move'; PL.kneel = false; PL.lock = null; return; }
    const oy = PL.kneel ? 64 : 84, want = pAimAngle(oy);
    PL.aimA += angDiff(want, PL.aimA) * Math.min(1, dt * (PL.lock ? 10 : 40));
    pMove(IN.mx * 46, IN.my * 46, dt, 16); const v = Math.hypot(PL.vx, PL.vy);
    if (v > 8) { PL.steady = Math.max(0, PL.steady - dt * 1.6); PL.kneel = false; PL.ph = (PL.ph + v * dt / 90) % 1; }
    else { PL.steady = Math.min(1, PL.steady + dt / .9); if (PL.steady > .4) PL.kneel = true; }
    const c = Math.cos(PL.aimA), s = Math.sin(PL.aimA); PL.dir = Math.abs(c) > .383 ? (c > 0 ? 'r' : 'l') : s > 0 ? 'd' : 'u';
    UI.ammoT = 2.5; PL.gait = 'idle';
    if (PL.buf === 'fire' && PL.bufT > 0 && PL.bolt <= 0 && PL.t > .14) { PL.buf = ''; pFire(oy); }
  } else if (st === 'dodge') {
    const u = PL.t / .3, sp = 760 * (1 - u) * (1 - u) + 60; pMove(PL.dvx * sp, PL.dvy * sp, dt, 80);
    brushFerns(PL.x, PL.y, PL.dvx * 200, 1.4);
    if (PL.t >= .3) { PL.st = 'move'; PL.dodgeCd = .2; PL.vx *= .25; PL.vy *= .25; drops(PL.x, PL.y, 2, 3, 40, '#9ab8d4', 50); GSFX.step('grass', 1); }
  } else if (st === 'knife') {
    const K = KNF[PL.combo], t = PL.t, a = PL.swA;
    if (t >= K[0] && t < K[0] + K[1]) pMove(Math.cos(a) * K[5] / K[1], Math.sin(a) * K[5] / K[1], dt, 80); else pMove(0, 0, dt, 30);
    if (t >= K[0] && !PL.swHit) { PL.swHit = true; GSFX.swish(PL.combo); part({ k: 'arc', x: PL.x, y: PL.y - 38, a, c: PL.combo, life: .15 }); pSlash(K); }
    if (t > K[0] + .03 && pTake('dodge') && PL.dodgeCd <= 0) return pDodge();
    if (t >= K[0] + K[1] + .05 && PL.buf === 'knife' && PL.bufT > 0) { PL.buf = ''; return pKnife((PL.combo + 1) % 3); }
    if (t >= K[0] + K[1] + K[2]) { PL.st = 'move'; PL.comboT = .4; }
  } else if (st === 'hit') { pMove(0, 0, dt, 7); if (PL.t >= .26) PL.st = 'move'; }
  else if (st === 'down') {
    pMove(0, 0, dt, 12);
    if (PL.t > 1.5) UI.fade = Math.min(1, UI.fade + dt * 1.4);
    if (PL.t > 2.7) { const c = CAMP.last || WORLD.START; PL.x = c[0]; PL.y = c[1]; PL.hp = 4; PL.st = 'move'; PL.dir = 'd'; PL.inv = 2; foesReset(); solTeleport(PL.x + 30, PL.y + 12); say('솔이 얼굴을 핥아 깨웠어요. 조용한 곳에 텐트를 치고 쉬어 가요.', 5); }
  } else if (st === 'gather') {
    pMove(0, 0, dt, 30);
    if (PL.t >= .42 && !PL.done) { PL.done = 1; const f = PL.arg, k = f.t === 'berry' ? 'berry' : 'shroom'; if (bagAdd(k)) { f.n--; f.re = 150; GSFX.pick(); say(ITEM[k].n + ' 획득'); UI.bag = 2.2; } else say('가방이 가득 찼어요.'); }
    if (PL.t >= .72) PL.st = 'move';
  } else if (st === 'pet') { pMove(0, 0, dt, 30); if (PL.t >= 1.8 || (PL.t > .5 && (IN.mx || IN.my))) PL.st = 'move'; }
  else if (st === 'lift') { pMove(0, 0, dt, 30); if (PL.t >= .5) { solCarry('arms'); PL.st = 'move'; hint('carry', '솔을 품에 안았어요. E를 누르면 배낭에 태우고, 길게 누르면 내려놓아요. 안고 있으면 개울도 건널 수 있어요.', 8); } }
  else if (st === 'putdown') { pMove(0, 0, dt, 30); if (PL.t >= .32) { solEject('down'); PL.st = 'move'; } }
  else if (st === 'swap') { pMove(0, 0, dt, 30); if (PL.t >= .3) { solCarry(SO.mode === 'arms' ? 'bag' : 'arms'); PL.st = 'move'; } }
  else if (st === 'tent' || st === 'camp' || st === 'pack') campUpdate(dt);
  if (PL.st !== 'down' && UI.fade > 0) UI.fade = Math.max(0, UI.fade - dt * 1.2);
}
// 방랑자 그림: 상태 → 동작 · 프레임
function pSprite() {
  const st = PL.st, cat = solCarryOpt(); let a = 'idle', fr = 0, dir = PL.dir, o = { cat };
  if (st === 'move') { a = PL.gait; fr = a === 'idle' ? Math.floor(V.time * 2.2) % 4 : a === 'sneakIdle' ? Math.floor(V.time * 1.6) % 2 : Math.floor(PL.ph * 12) % 12; }
  else if (st === 'aim') { a = 'aim'; o = pAimOpt(); }
  else if (st === 'dodge') { a = 'dodge'; fr = Math.min(4, Math.floor(PL.t / .3 * 5)); }
  else if (st === 'knife') { const K = KNF[PL.combo]; a = 'knife' + (PL.combo + 1); fr = PL.t < K[0] ? 0 : PL.t < K[0] + K[1] * .5 ? 1 : PL.t < K[0] + K[1] + .06 ? 2 : 3; }
  else if (st === 'hit') a = 'hit';
  else if (st === 'down') { a = 'down'; fr = PL.t > .6 ? 1 : 0; dir = dir === 'l' ? 'l' : 'r'; }
  else if (st === 'gather') { a = 'gather'; fr = PL.t > .3 && PL.t < .55 ? 1 : 0; }
  else if (st === 'pet') { a = 'pet'; fr = Math.floor(PL.t * 4) % 2; }
  else if (st === 'lift' || st === 'putdown') { a = 'lift'; fr = st === 'lift' ? (PL.t > .25 ? 1 : 0) : (PL.t > .16 ? 0 : 1); o = {}; }
  else if (st === 'tent' || st === 'pack') { a = 'hammer'; fr = Math.floor(PL.t / .3) % 2; }
  else if (st === 'camp') { if (CAMP.eat > 0) { a = 'eat'; fr = Math.floor(V.time * 2) % 2; dir = 'd'; } else { a = 'sit'; fr = Math.floor(V.time * 1.2) % 2; dir = 'l'; } o = {}; }
  if ((a === 'gather' || a === 'pet' || a === 'lift' || a === 'hammer' || a === 'down') && (dir === 'u' || dir === 'd')) dir = 'r';
  return manSpr(a, fr, dir, o);
}
