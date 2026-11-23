'use strict';
/* =========================================================
   물그림자 · 드롭 · 소리 퍼짐 · 날씨 · 참새 · 텐트
   물그림자는 덮치기 전에 반드시 몸을 웅크려 예고함(0.6초). 덮친 뒤에는 빈틈이 생김
   솔의 리본 앞에서는 가끔 멈칫함 — 분위기만 내고 싸움에는 영향을 주지 않음
   드롭: 없음 84% · 훼손된 물건 15% · 온전한 물건 1% (첫 사냥만 훼손된 냄비 확정)
   ========================================================= */
const WX = { lv: 1, target: 1, t: 0, i: 0, seq: [1, 2, 0, 1, 2, 1, 0], dur: 46 };
const DBG = { intact: false };
const GLOBS = [], BIRDS = [], FLOCKS = [{ x: 1780, y: 1380, away: 0 }, { x: 610, y: 1440, away: 0 }, { x: 1250, y: 470, away: 0 }];
const CAMP = { on: false, x: 0, y: 0, fx: 0, fy: 0, sx: 0, sy: 0, seatX: 0, seatY: 0, eat: 0, cap: 0, ate: false, last: null, t: 0, tick: 0, glow: 0 };
let POTFOE = null;
function wxUpdate(dt) {
  WX.t += dt;
  if (WX.t > WX.dur) { WX.t = 0; WX.i = (WX.i + 1) % WX.seq.length; WX.target = WX.seq[WX.i]; WX.dur = 40 + Math.random() * 20; say(['비가 안개비로 잦아들어요.', '보슬비가 내려요.', '장대비가 쏟아져요.'][WX.target]); }
  WX.lv += clamp(WX.target - WX.lv, -dt * .2, dt * .2); GSFX.rain(WX.lv / 2);
}

/* ---------- 물그림자 ---------- */
function mkFoe(p, minRain, k, j) { return { p, hx: p.x + j * 30, hy: p.y + j * 5, x: p.x + j * 30, y: p.y + j * 5, k, minRain, hp: 6 * k, mhp: 6 * k, st: 'dormant', t: 0, flip: j > 0, kx: 0, ky: 0, vx: 0, vy: 0, flash: 0, aware: 0, cd: 1, stag: 0, mT: 4, live: false, tx: p.x, ty: p.y, la: 0, hitDone: false, tr: 0, re: 0, grad: false, wT: 2 + Math.random() * 5, idle: 0, lost: 0, prev: 'wander' }; }
function foesInit() { FOES.length = 0; WORLD.PUD.forEach((p, i) => { if (!p.home) return; for (let j = 0; j < p.home; j++) FOES.push(mkFoe(p, i === 0 ? 0 : i === 3 ? 2 : 1 + (i % 2), p.home > 1 && !j ? 1.2 : j ? .9 : 1, j)); }); }
function foesReset() { for (const f of FOES) if (f.st !== 'gone') { f.st = 'dormant'; f.live = false; f.x = f.hx; f.y = f.hy; f.hp = f.mhp; f.aware = 0; f.stag = 0; f.wT = 8; f.kx = f.ky = 0; } GLOBS.length = 0; }
const foeSet = (f, st) => { f.st = st; f.t = 0; };
const foePan = f => clamp((f.x - PL.x) / 420, -1, 1);
function foeHurt(f, dmg, ang, kb, src) {
  if (!f.live || f.st === 'dissolve') return;
  let m = 1; if (f.aware === 0 && src !== 'cat') { m = 3; say('기습!', 1.2); } else if (f.stag > 0 && src !== 'cat') m = 2;
  f.hp -= dmg * m; f.flash = .12; f.kx = Math.cos(ang) * kb; f.ky = Math.sin(ang) * kb; if (src !== 'cat') f.aware = 2;
  drops(f.x, f.y, 16 * f.k, src === 'cat' ? 4 : 10, 90, '#a8d0e8', 110); GSFX.splash(foePan(f), src === 'cat' ? .35 : .8);
  if (f.hp <= 0) { foeSet(f, 'dissolve'); f.kx *= .4; f.ky *= .4; GSFX.dissolve(foePan(f)); V.shake = Math.max(V.shake, 4); }
  else if (src !== 'cat') { if (src === 'knife' && PL.combo === 2) f.stag = Math.max(f.stag, 1.2); foeSet(f, 'hit'); }
  for (const q of FOES) if (q !== f && q.live && q.aware < 2 && dist(q, f) < 220) { q.aware = 2; foeSet(q, 'chase'); }
}
function foeStagger(f, t) { if (f.live && f.st !== 'dissolve') { f.stag = t; foeSet(f, 'stagger'); hint('stag', '솔의 펀치에 물그림자가 흐트러졌어요. 지금 치면 피해가 두 배예요.'); } }
function foeDrop(f) {
  PL.kills++; const r = Math.random(); let k = null;
  if (DBG.intact) { k = 'pot'; DBG.intact = false; } else if (PL.kills === 1) k = 'pot_d'; else if (r < .01) k = 'pot'; else if (r < .16) k = 'pot_d';
  if (k) { GITEMS.push({ k, x: f.x, y: f.y + 2, t: 0, z: 8, vz: 110 }); if (k === 'pot') POTFOE = f; }
  else say('물로 돌아갔어요. 남은 것은 없어요.');
  decal(f.x, f.y, 22 * f.k, 40); ring(f.x, f.y, 26 * f.k, .6); ring(f.x, f.y, 14 * f.k, .45); drops(f.x, f.y, 8, 22, 130, '#a8d0e8', 170);
  if (PL.kills === 1) hint('drop', '물그림자는 물로 돌아가요. 운이 좋으면 물건이 남아요. 지나가면 주워요.', 8);
}
function foeMove(f, tx, ty, sp, dt) {
  const dx = tx - f.x, dy = ty - f.y, l = Math.hypot(dx, dy) || 1, ox = f.x, oy = f.y, n = WORLD.push(f.x + dx / l * sp * dt, f.y + dy / l * sp * dt, 11 * f.k);
  f.x = n[0]; f.y = n[1]; if (Math.abs(dx) > 4) f.flip = dx < 0;
  f.tr += Math.hypot(f.x - ox, f.y - oy); if (f.tr > 18) { f.tr = 0; decal(f.x + (Math.random() - .5) * 6, f.y + 2, 4 + Math.random() * 3, 26); }
  return l;
}
function foeUpdate(f, dt) {
  f.t += dt; f.flash -= dt; if (f.sq > 0) f.sq = Math.max(0, f.sq - dt * 5); f.cd -= dt; f.mT -= dt; const s = f.st, dp = dist(f, PL), quiet = PL.st === 'camp' || PL.st === 'down' || PL.st === 'tent';
  if (f.kx || f.ky) { const n = WORLD.push(f.x + f.kx * dt, f.y + f.ky * dt, 11 * f.k); f.x = n[0]; f.y = n[1]; const e = Math.exp(-dt * 9); f.kx *= e; f.ky *= e; if (Math.hypot(f.kx, f.ky) < 6) f.kx = f.ky = 0; }
  if (s === 'gone') { f.live = false; f.re -= dt; if (f.re <= 0 && !f.grad && dp > 520) { f.hp = f.mhp; f.x = f.hx; f.y = f.hy; f.aware = 0; f.stag = 0; f.wT = 5; f.st = 'dormant'; } return; }
  if (s === 'dormant') {
    f.live = false;
    if (WX.lv >= f.minRain - .3 && !quiet) { f.wT -= dt; if (f.wT <= 0) { foeSet(f, 'emerge'); f.aware = 0; GSFX.blob(foePan(f), clamp(1 - dp / 500, 0, 1)); } }
    if (dp < 44 && !quiet) { foeSet(f, 'emerge'); f.aware = 2; GSFX.blob(foePan(f)); }
    return;
  }
  if (s === 'emerge') { f.live = f.t > .5; if (f.t < dt * 2) ring(f.x, f.y, 20 * f.k, .7); if (f.t >= 1) foeSet(f, f.aware === 2 ? 'chase' : 'wander'); return; }
  if (s === 'sink') { f.live = false; if (f.t >= .6) { f.st = 'dormant'; f.hp = f.mhp; f.aware = 0; f.wT = 6 + Math.random() * 6; ring(f.x, f.y, 18 * f.k, .6); } return; }
  f.live = s !== 'dissolve';
  // 멈칫: 솔의 리본이 가까우면 잠깐 형태가 흔들림 (덮치는 중에는 일어나지 않음)
  if ((s === 'wander' || s === 'chase') && f.mT <= 0 && SO.mode === 'free' && !SO.hidden && Math.hypot(SO.x - f.x, SO.y - f.y) < 76) { f.mT = 9; f.prev = s; foeSet(f, 'pause'); hint('pause', '물그림자가 솔 앞에서 잠깐 멈칫했어요. 왜 그럴까요?'); return; }
  if (s === 'pause') { if (f.t > .4) foeSet(f, f.prev); return; }
  if (s === 'wander') {
    if (WX.lv < f.minRain - .7 || quiet) return foeSet(f, 'return');
    if (f.idle > 0) f.idle -= dt;
    else if (foeMove(f, f.tx, f.ty, 22, dt) < 6 || f.t > 7) { f.t = 0; f.idle = 1 + Math.random() * 2.4; const a = Math.random() * TAU, d = 30 + Math.random() * 70, n = WORLD.nearestOpen(f.hx + Math.cos(a) * d, f.hy + Math.sin(a) * d * .7, true); if (n) { f.tx = n[0]; f.ty = n[1]; } }
    const see = PL.hidden ? 34 : PL.sneak ? 78 : PL.gait === 'run' ? 300 : 190, front = (PL.x - f.x) * (f.flip ? -1 : 1) > 0;
    if (dp < see * (front ? 1 : .55)) { foeSet(f, 'notice'); f.flip = PL.x < f.x; GSFX.blob(foePan(f)); }
  } else if (s === 'notice') {
    f.flip = PL.x < f.x;
    if (f.t > .7) { if (PL.hidden || (PL.sneak && dp > 120)) { f.aware = 0; foeSet(f, 'wander'); } else { f.aware = 2; f.cd = .5; foeSet(f, 'chase'); } }
  } else if (s === 'chase') {
    if (quiet || dp > 580 || Math.hypot(f.x - f.hx, f.y - f.hy) > 620) return foeSet(f, 'return');
    if (PL.hidden && dp > 90) { f.lost += dt; if (f.lost > 3) { f.lost = 0; f.aware = 0; return foeSet(f, 'return'); } } else f.lost = 0;
    if (dp < 132 && f.cd <= 0) { foeSet(f, 'windup'); f.hitDone = false; GSFX.wind(foePan(f)); f.flip = PL.x < f.x; }
    else if (dp > 150 && dp < 320 && f.cd <= 0 && Math.random() < dt * .7) { foeSet(f, 'spit'); f.flip = PL.x < f.x; GSFX.blob(foePan(f)); }
    else if (dp > 96) foeMove(f, PL.x, PL.y, f.k > 1.1 ? 66 : 80, dt); else f.flip = PL.x < f.x;
  } else if (s === 'windup') {
    if (f.t < .46) { f.la = Math.atan2(PL.y - f.y, PL.x - f.x); f.flip = PL.x < f.x; }
    if (f.t >= .62) { foeSet(f, 'lunge'); f.vx = Math.cos(f.la) * 640; f.vy = Math.sin(f.la) * 640; GSFX.lunge(foePan(f)); }
  } else if (s === 'lunge') {
    const n = WORLD.push(f.x + f.vx * dt, f.y + f.vy * dt, 11 * f.k); f.x = n[0]; f.y = n[1]; f.tr += 640 * dt; if (f.tr > 14) { f.tr = 0; decal(f.x, f.y + 2, 6, 20); drops(f.x, f.y, 8, 1, 40); }
    if (!f.hitDone && dp < 25 * f.k) f.hitDone = pHurt(1, f.x, f.y);
    if (SO.mode === 'free' && !SO.hidden && SO.z === 0 && SO.st !== 'flee' && Math.hypot(SO.x - f.x, SO.y - f.y) < 26) solDodgeHop(f);
    if (f.t >= .26) { foeSet(f, 'recover'); f.cd = 1.2 + Math.random() * .6; }
  } else if (s === 'recover') { if (f.t >= .8) foeSet(f, 'chase'); }
  else if (s === 'spit') {
    if (f.t >= .55 && !f.hitDone) { f.hitDone = true; GLOBS.push({ x0: f.x, y0: f.y - 26 * f.k, x1: PL.x + PL.vx * .3, y1: PL.y + PL.vy * .3, t: 0, T: .85 }); GSFX.lunge(foePan(f)); }
    if (f.t >= .85) { f.hitDone = false; f.cd = 1.8; foeSet(f, 'chase'); }
  } else if (s === 'hit') { if (f.t >= .2) foeSet(f, f.stag > 0 ? 'stagger' : 'chase'); }
  else if (s === 'stagger') { f.stag -= dt; if (f.stag <= 0) { f.stag = 0; f.aware = 2; f.cd = .6; foeSet(f, 'chase'); } }
  else if (s === 'dissolve') { if (f.t >= .6) { foeDrop(f); f.st = 'gone'; f.re = 100; f.live = false; } }
  else if (s === 'return') { f.aware = 0; if (foeMove(f, f.hx, f.hy, 60, dt) < 8) foeSet(f, 'sink'); }
  if (f.stag > 0 && s !== 'stagger') f.stag -= dt;
}
function solDodgeHop(f) {   // 덮쳐 오면 솔은 옆으로 펄쩍 뛰어 피함 (다치지 않음)
  const a = f.la + (Math.random() < .5 ? 1.5 : -1.5), n = WORLD.nearestOpen(SO.x + Math.cos(a) * 60, SO.y + Math.sin(a) * 44) || [SO.x, SO.y];
  SO.target = f; SO.st = 'hunt'; SO.sub = 'hop'; SO.t = 0; SO.jx = SO.x; SO.jy = SO.y; SO.kx = n[0]; SO.ky = n[1]; SO.fear = Math.min(1, SO.fear + .2); GSFX.hiss(solPan(), .7);
}
function globsUpdate(dt) {
  for (let i = GLOBS.length - 1; i >= 0; i--) {
    const b = GLOBS[i]; b.t += dt; if (b.t < b.T) continue;
    if (Math.hypot(PL.x - b.x1, PL.y - b.y1) < 30) pHurt(1, b.x1, b.y1 + 1);
    ring(b.x1, b.y1, 30, .5); ring(b.x1, b.y1, 16, .35); drops(b.x1, b.y1, 2, 14, 110, '#a8d0e8', 130); decal(b.x1, b.y1, 20, 24); GSFX.splash(clamp((b.x1 - PL.x) / 400, -1, 1), .7); GLOBS.splice(i, 1);
  }
}
// 소리가 퍼짐. 빗소리가 셀수록 덜 들림
function noise(x, y, r, loud) {
  r *= 1 - WX.lv * .16;
  for (const f of FOES) { const d = Math.hypot(f.x - x, f.y - y); if (d > r) continue; if (f.st === 'dormant' && f.re <= 0 && (loud || d < r * .45)) { foeSet(f, 'emerge'); f.aware = 2; } else if (f.st === 'wander') { foeSet(f, 'notice'); f.flip = x < f.x; } }
}
function brushFerns(x, y, vx, k) {
  WORLD.near(x, y, 30, p => { if (p.t !== 'fern' || Math.abs(p.x - x) > 18 || Math.abs(p.y - 4 - y) > 12) return; if (Math.abs(p.bv) < .3 && k >= .9 && V.time - (p.rt || 0) > .5) { p.rt = V.time; GSFX.rustle(k * .6); } p.bv = clamp(p.bv + (vx >= 0 ? 1 : -1) * k * .5, -1.4, 1.4); });
}
function nearCover(x, y) { let h = false; WORLD.near(x, y, 30, p => { if ((p.t === 'fern' || p.t === 'bush') && Math.abs(p.x - x) < 24 && Math.abs(p.y - 4 - y) < 15) h = true; }); return h; }

/* ---------- 참새 ---------- */
function birdsInit() { BIRDS.length = 0; FLOCKS.forEach((fl, i) => { for (let k = 0; k < 4 + (i % 2); k++) BIRDS.push({ fl, x: fl.x + (Math.random() - .5) * 70, y: fl.y + (Math.random() - .5) * 40, z: 0, vx: 0, vy: 0, vz: 0, st: 'ground', t: Math.random() * 3, k: 'stand', flip: Math.random() < .5 }); }); }
function birdsScare(x, y, r) { for (const fl of FLOCKS) if (!fl.away && Math.hypot(fl.x - x, fl.y - y) < r) { fl.away = 20 + Math.random() * 10; GSFX.flutter(clamp((fl.x - PL.x) / 400, -1, 1), clamp(1.2 - Math.hypot(fl.x - PL.x, fl.y - PL.y) / 500, 0, 1)); for (const b of BIRDS) if (b.fl === fl) { const a = Math.atan2(b.y - y, b.x - x) + (Math.random() - .5); b.st = 'fly'; b.t = 0; b.vx = Math.cos(a) * (120 + Math.random() * 60); b.vy = Math.sin(a) * 60 - 40; b.vz = 150 + Math.random() * 60; b.flip = b.vx < 0; } } }
function birdsNear(x, y, r) { for (const fl of FLOCKS) if (!fl.away && Math.hypot(fl.x - x, fl.y - y) < r) return fl; return null; }
function birdsUpdate(dt) {
  for (const fl of FLOCKS) {
    if (fl.away > 0) { fl.away -= dt; if (fl.away <= 0) { fl.away = 0; for (const b of BIRDS) if (b.fl === fl) { b.st = 'land'; b.t = 0; b.x = fl.x + (Math.random() - .5) * 240; b.y = fl.y - 60; b.z = 200; b.tx = fl.x + (Math.random() - .5) * 70; b.ty = fl.y + (Math.random() - .5) * 40; } } continue; }
    const dpl = Math.hypot(fl.x - PL.x, fl.y - PL.y);
    if (dpl < (PL.sneak ? 62 : PL.gait === 'run' ? 170 : 118) || (SO.mode === 'free' && !SO.hidden && Math.hypot(fl.x - SO.x, fl.y - SO.y) < (SO.gait === 'stalk' || !SO.gait ? 46 : 92))) birdsScare(fl.x, fl.y, 10);
    else if (dpl < 420 && Math.random() < dt * .25) GSFX.chirp(clamp((fl.x - PL.x) / 400, -1, 1), clamp(1 - dpl / 420, 0, 1) * (1 - WX.lv * .3));
  }
  for (const b of BIRDS) {
    b.t += dt;
    if (b.st === 'ground') { if (b.t > 1.2) { b.t = Math.random() * -1.5; if (Math.random() < .5) { b.k = 'peck'; } else { b.k = 'stand'; b.x += (Math.random() - .5) * 12; b.y += (Math.random() - .5) * 6; b.flip = Math.random() < .5; b.z = 3; } } else if (b.t > .25) { b.z = 0; if (b.k === 'peck' && b.t > .5) b.k = 'stand'; } }
    else if (b.st === 'fly') { b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.k = Math.floor(b.t * 14) % 2 ? 'fly1' : 'fly2'; if (b.z > 420) b.st = 'away'; }
    else if (b.st === 'land') { const u = Math.min(1, b.t / 1.4); b.x += (b.tx - b.x) * dt * 3; b.y += (b.ty - b.y) * dt * 3; b.z = 200 * (1 - u) * (1 - u); b.k = Math.floor(b.t * 14) % 2 ? 'fly1' : 'fly2'; b.flip = b.tx < b.x; if (u >= 1) { b.st = 'ground'; b.z = 0; b.k = 'stand'; b.t = 0; } }
  }
}

/* ---------- 텐트 ---------- */
function campTry() {
  const x = PL.x - 26, y = PL.y - 40; let why = '';
  if (SO.mood === 'alert' || FOES.some(f => f.st !== 'gone' && Math.hypot(f.x - PL.x, f.y - PL.y) < 250)) why = '솔이 털을 세우는 곳에는 텐트를 칠 수 없어요.';
  else if (WORLD.wet(x, y) || WORLD.wet(PL.x - 4, PL.y + 16) || WORLD.wet(PL.x + 46, PL.y + 22) || WORLD.wet(x - 50, y - 20) || WORLD.wet(x + 50, y - 20)) why = '물 위에는 텐트를 칠 수 없어요.';
  else if (WORLD.hitSolid(x, y - 44, 74) || WORLD.hitSolid(PL.x + 40, PL.y + 22, 22) || y < 340 || !WORLD.walkable(PL.x + 46, PL.y + 24)) why = '자리가 좁아요. 나무와 바위에서 조금 떨어져요.';
  if (why) { GSFX.deny(); say(why); return; }
  Object.assign(CAMP, { x, y, fx: PL.x - 4, fy: PL.y + 16, seatX: PL.x + 46, seatY: PL.y + 24, sx: PL.x - 56, sy: PL.y + 30, t: 0, eat: 0, cap: 0, ate: false, tick: 0, building: true });
  if (SO.mode !== 'free') solEject('down');
  PL.st = 'tent'; PL.t = 0; PL.dir = 'l'; PL.sneak = false; noise(PL.x, PL.y, 260);
}
function campPush(x, y, r) {
  if (!CAMP.on && !CAMP.building) return [x, y];
  for (const [cx, cy, cr] of [[CAMP.x, CAMP.y - 30, 44], [CAMP.x - 34, CAMP.y - 16, 30], [CAMP.x + 34, CAMP.y - 16, 30], [CAMP.fx, CAMP.fy - 4, 15]]) { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), m = cr + r; if (d < m && d > .01) { x = cx + dx / d * m; y = cy + dy / d * m; } }
  return [x, y];
}
function campUpdate(dt) {
  const p = IN.p; CAMP.t += dt; CAMP.glow = Math.max(0, CAMP.glow - dt);
  if (PL.st === 'tent') {
    if (Math.floor(PL.t / .6) !== Math.floor((PL.t - dt) / .6)) GSFX.hammer();
    if (PL.t >= 2.4) { CAMP.on = true; CAMP.building = false; CAMP.last = [CAMP.seatX, CAMP.seatY]; PL.x = CAMP.seatX; PL.y = CAMP.seatY; PL.vx = PL.vy = 0; PL.st = 'camp'; PL.t = 0; CAMP.t = 0; GSFX.fire(1); GSFX.cloth(); }
    return;
  }
  if (PL.st === 'pack') { if (PL.t >= .8) { CAMP.on = false; GSFX.fire(0); GSFX.cloth(); PL.st = 'move'; PL.dir = 'd'; say('텐트를 걷었어요.'); } return; }
  if (Math.random() < dt * 5) GSFX.crackle();
  if (CAMP.eat > 0) { CAMP.eat -= dt; if (Math.floor(CAMP.eat * 2) !== Math.floor((CAMP.eat + dt) * 2)) GSFX.eat(); return; }
  if (CAMP.cap > PL.hp) { CAMP.tick += dt; if (CAMP.tick > .55) { CAMP.tick = 0; PL.hp++; GSFX.drip(0); } }
  const food = bagFood();
  if (p.e && !CAMP.ate) { if (food) { bagTake(food); CAMP.ate = true; CAMP.eat = 3; CAMP.cap = 10; SO.bond = Math.min(1, SO.bond + .08); say(ITEM[food].n + (BAG.includes('pot_f') ? '을(를) 해방된 냄비에 끓여 솔과 나눠 먹어요.' : '을(를) 구워 솔과 나눠 먹어요.'), 4); } else { GSFX.deny(); say('먹을 것이 없어요. 버섯이나 산딸기를 따 오거나, 솔의 선물을 기다려요.', 4); } }
  else if (p.r) { CAMP.cap = Math.max(CAMP.cap, 5); say(PL.hp >= 5 ? '불가에서 숨을 돌려요.' : '밥 없이 쉬면 체력이 절반까지만 돌아와요.', 4); }
  else if (p.g) {
    if (BAG.includes('pot')) { bagTake('pot'); bagAdd('pot_f'); if (POTFOE) POTFOE.grad = true; CAMP.cap = 10; CAMP.glow = 4; GSFX.release(); say('냄비가 물을 끓이며 제 쓰임을 다했어요. 미련이 풀렸어요. (해방)', 6); }
    else if (BAG.includes('pot_d')) { bagTake('pot_d'); CAMP.cap = Math.max(CAMP.cap, 8); say('찌그러진 냄비로 물을 끓여 마셨어요. 냄비는 더 못 쓰게 됐어요.', 5); GSFX.pick(); }
    else { GSFX.deny(); say('물을 끓일 냄비가 없어요.'); }
  } else if ((p.t || p.t_tent) && CAMP.t > .6) { PL.st = 'pack'; PL.t = 0; PL.dir = 'l'; PL.tUsed = true; }
}
