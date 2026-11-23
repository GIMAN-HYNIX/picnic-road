'use strict';
/* =========================================================
   솔의 습성 (평범한 고양이답게)
   - 개처럼 발맞춰 걷지 않음: 앞서가다 멈춰 냄새를 맡고, 뒤처지면 종종걸음으로 따라붙음
   - 비를 싫어함: 젖으면 몸을 털고 그루밍. 장대비엔 우비 밑으로 들어옴. 물은 건너지 않음(다리로 돌아옴)
   - 물그림자가 가까우면(리본이 느낌) 그쪽을 노려보고, 더 가까우면 등을 세우고 하악질. 방랑자 뒤에 붙음
   - 보내면(Q) 낮게 기어가 엉덩이를 흔들고 덮쳐 냥냥펀치, 곧장 옆으로 뛰어 물러남 (치고 빠짐)
   - 총소리엔 멀리 달아나 숨음. 유대가 깊을수록 빨리 돌아옴. 돌아오면 다리에 몸을 비빔
   - 참새를 보면 채터링 → 몰래 접근 → 덤불로 사라졌다가 선물을 물고 옴 (잡는 장면은 안 보임)
   - 안기면 한동안 골골대다가 싫증 나면 버둥거려 내려감. 너무 쓰다듬으면 꼬리를 치고 가 버림
   ========================================================= */
const SO = { x: 0, y: 0, vx: 0, vy: 0, flip: false, face: 's', pose: 'sit', fr: 0, o: {}, at: 0, ph: 0, gait: '', st: 'settle', sub: 'sit', t: 0, mode: 'free', bond: .5, fear: 0, wet: .15, energy: 1, path: null, pi: 0, pathT: 0, ptx: 0, pty: 0, blocked: false,
  z: 0, hidden: false, slot: 'ahead', side: 1, slotT: 0, pauseT: 6, pk: '', pd: 0, rubCd: 0, petCd: 0, petN: 0, askCd: 25, preyCd: 30, huntCd: 0, target: null, carryT: 0, cst: 'look', cT: 0, mood: 'calm', calm: 0, lastFoe: null, sndT: 0, hx: 0, hy: 0, hideFor: 8, n: 0, jx: 0, jy: 0, kx: 0, ky: 0, poi: null, sitFor: 6, flock: null };
const SGAIT = { walk: [50, 25.2], trot: [108, 36.4], run: [255, 64.4], stalk: [34, 16.8] };
const solPan = () => clamp((SO.x - PL.x) / 400, -1, 1);
function solSet(st, sub) { SO.st = st; SO.sub = sub || ''; SO.t = 0; SO.at = 0; SO.path = null; SO.gait = ''; }
function solFace(dx, dy) { if (Math.abs(dx) > Math.abs(dy) * .7) { SO.face = 's'; SO.flip = dx < 0; } else SO.face = dy > 0 ? 'd' : 'u'; }
function solLook(tx) { SO.face = 's'; SO.flip = tx < SO.x; }
function solPose(pose, fr, o) { SO.pose = pose; SO.fr = fr || 0; SO.o = o || {}; }
// 목표로 감 (길찾기 + 장애물 비껴 가기). 닿으면 true
function solGo(tx, ty, gait, dt, arrive, k) {
  const d = Math.hypot(tx - SO.x, ty - SO.y); if (d <= (arrive || 10)) { SO.gait = ''; SO.vx = SO.vy = 0; return true; }
  SO.pathT -= dt;
  if (!SO.path || SO.pathT <= 0 || Math.hypot(tx - SO.ptx, ty - SO.pty) > 28) { SO.path = WORLD.path(SO.x, SO.y, tx, ty, false); SO.pi = 0; SO.pathT = .7; SO.ptx = tx; SO.pty = ty; SO.blocked = !SO.path; if (!SO.path) { SO.gait = ''; return false; } }
  let wp = SO.path[SO.pi]; while (wp && Math.hypot(wp[0] - SO.x, wp[1] - SO.y) < 9 && SO.pi < SO.path.length - 1) wp = SO.path[++SO.pi];
  if (!wp) return true;
  const dx = wp[0] - SO.x, dy = wp[1] - SO.y, l = Math.hypot(dx, dy) || 1; let sp = SGAIT[gait][0] * (k || 1);
  if (d < 26 && gait !== 'stalk') sp = Math.min(sp, 40 + d * 3);
  const q = 1 - Math.exp(-dt * 12); SO.vx += (dx / l * sp - SO.vx) * q; SO.vy += (dy / l * sp - SO.vy) * q;
  const n = WORLD.push(SO.x + SO.vx * dt, SO.y + SO.vy * dt, 5), moved = Math.hypot(n[0] - SO.x, n[1] - SO.y); SO.x = n[0]; SO.y = n[1];
  SO.gait = gait; SO.ph = (SO.ph + moved / SGAIT[gait][1]) % 1; solFace(SO.vx, SO.vy); brushFerns(SO.x, SO.y, SO.vx, .3);
  return false;
}
function solMovePose(o) {
  const g = SO.gait, fr = Math.floor(SO.ph * 8) % 8;
  solPose(SO.face === 's' ? g : (SO.face === 'd' ? 'f' : 'b') + (g === 'run' ? 'run' : g === 'stalk' ? 'stalk' : 'walk'), fr, o);
}
function solIdle(kind) {
  const a = SO.at;
  if (kind === 'sniff') solPose('sniff', Math.floor(a * 3) % 2);
  else if (kind === 'look') solPose('stand', 0, { ear: Math.floor(a * 1.6) % 2 ? 2 : 0 });
  else if (kind === 'flick') solPose('flick', Math.floor(a * 10) % 2);
  else if (kind === 'shake') solPose('shake', Math.floor(a * 14) % 4);
  else solPose('stand', 0, {});
}
function solShake() { SO.wet = Math.max(0, SO.wet - .28); GSFX.shake(solPan()); for (let i = 0; i < 14; i++) { const a = Math.random() * TAU; part({ k: 'drop', x: SO.x, y: SO.y, z: 12, vx: Math.cos(a) * 80, vy: Math.sin(a) * 40, vz: 40 + Math.random() * 60, life: .45, c: '#b8d0e4' }); } }
function solSense() { let b = null, bd = 235; for (const f of FOES) { if (f.st === 'gone') continue; const d = Math.hypot(f.x - SO.x, f.y - SO.y); if (d < bd) { bd = d; b = f; } } return b; }
const solTouchable = () => (SO.mode === 'under' || (SO.mode === 'free' && !SO.hidden && dist(SO, PL) < 54 && !['flee', 'hide', 'hunt', 'prey', 'alert'].includes(SO.st))) && PL.st === 'move';
const solCarryOpt = () => (SO.mode === 'free' ? null : { mode: SO.mode, st: SO.cst, fr: Math.floor(V.time * 7) });
function solTeleport(x, y) { const n = WORLD.nearestOpen(x, y) || [x, y]; SO.x = n[0]; SO.y = n[1]; SO.mode = 'free'; SO.hidden = false; SO.z = 0; SO.fear = 0; solSet('settle', 'sit'); }
function solCarry(mode) { SO.mode = mode; SO.carryT = mode === SO.mode ? 0 : SO.carryT; SO.carryT = 0; SO.cst = 'look'; SO.hidden = true; SO.gait = ''; SO.z = 0; if (SO.st === 'ask') SO.bond = Math.min(1, SO.bond + .03); solSet('carried'); }
// 품 · 배낭 · 우비 밑에서 나옴. down 내려놓음 · jolt 놀라 뛰쳐나감 · leap 사냥하러 뛰어내림
function solEject(kind) {
  if (SO.mode === 'free') return;
  const was = SO.mode, a = DIRA[PL.dir], n = WORLD.nearestOpen(PL.x + Math.cos(a) * 20 + (kind === 'jolt' ? (Math.random() - .5) * 30 : 0), PL.y + Math.sin(a) * 14 + 6) || [PL.x, PL.y];
  SO.mode = 'free'; SO.hidden = false; SO.x = n[0]; SO.y = n[1]; SO.z = was === 'bag' ? 30 : was === 'arms' ? 18 : 0; SO.vz = 0; GSFX.purr(0);
  if (kind === 'jolt') { SO.fear = Math.min(1, SO.fear + .15); GSFX.mew(solPan()); solSet('follow'); }
  else if (kind === 'leap') solSet('hunt', 'stalk');
  else solSet('settle', 'sit');
}
function solBePet() { solSet('pet'); solLook(PL.x); }
function solBeHeld() { solSet('held'); solLook(PL.x); }
function solGunshot() {
  if (SO.mode === 'bag') { SO.cst = 'hide'; SO.cT = 6; SO.bond = Math.max(0, SO.bond - .02); return; }
  if (SO.mode !== 'free') solEject('jolt');
  SO.bond = Math.max(0, SO.bond - .03); SO.fear = 1; solFlee(PL.x, PL.y);
}
function solFlee(fx, fy) {
  let best = null, bs = -1e9; const a0 = Math.atan2(SO.y - fy, SO.x - fx);
  for (const c of WORLD.covers) { const d = Math.hypot(c.x - fx, c.y - fy); if (d < 230 || d > 480 || !WORLD.walkable(c.x, c.y - 6)) continue; const sc = -Math.abs(angDiff(Math.atan2(c.y - fy, c.x - fx), a0)) * 120 - Math.hypot(c.x - SO.x, c.y - SO.y) * .3 + Math.random() * 40; if (sc > bs) { bs = sc; best = c; } }
  if (best) { SO.hx = best.x; SO.hy = best.y - 5; } else { const n = WORLD.nearestOpen(SO.x + Math.cos(a0) * 300, SO.y + Math.sin(a0) * 300) || [SO.x, SO.y]; SO.hx = n[0]; SO.hy = n[1]; }
  SO.z = 0; SO.hidden = false; SO.target = null; solSet('flee');
}
// Q: 물그림자가 가까우면 솔을 보냄. 없으면 솔을 부름
function solCommand() {
  let f = null, bd = 330; for (const q of FOES) if (q.live) { const d = dist(q, PL); if (d < bd) { bd = d; f = q; } }
  if (!f) for (const q of FOES) if (q.st === 'dormant' && q.re <= 0) { const d = dist(q, PL); if (d < bd) { bd = d; f = q; } }   // 웅덩이에 숨은 놈은 솔이 물을 쳐서 끌어냄
  if (f) {
    if (SO.st === 'flee' || SO.st === 'hide' || SO.fear > .85) { GSFX.deny(); say('솔이 겁을 먹어서 나서지 않아요.'); return; }
    if (SO.st === 'hunt') return;
    if (SO.huntCd > 0) { GSFX.deny(); say('솔이 숨을 고르고 있어요.'); return; }
    if (SO.mode !== 'free') solEject('leap');
    SO.target = f; solSet('hunt', 'stalk'); GSFX.trill(solPan()); return;
  }
  // 부르기: 고양이는 부르면 '올 때도' 있음. 유대가 깊을수록 잘 옴
  GSFX.drip(0); if (SO.mode !== 'free') return;
  if (SO.st === 'flee' || SO.st === 'hide') { SO.hideFor -= 2; return; }
  if (Math.random() < .35 + SO.bond * .65 || dist(SO, PL) > 200) { GSFX.trill(solPan()); solSet('settle', 'approach'); } else { SO.at = 0; SO.pk = 'look'; }
}
const SOLST = {
  follow(dt) {
    const d = dist(SO, PL), moving = PL.st === 'dodge' || (PL.st === 'move' && PL.gait !== 'idle' && PL.gait !== 'sneakIdle');
    if (!moving && PL.idleT > 1.1 && d < 130) return solSet('settle', 'approach');
    if (SO.sub === 'pause') { SO.gait = ''; solIdle(SO.pk); if (SO.t > SO.pd || d > 150) { SO.sub = ''; SO.pauseT = 7 + Math.random() * 10; } return; }
    SO.slotT -= dt; if (SO.slotT <= 0) { SO.slotT = 6 + Math.random() * 9; SO.slot = WORLD.terr(PL.x, PL.y) === 1 ? pick(['ahead', 'ahead', 'side']) : pick(['ahead', 'side', 'side', 'behind']); SO.side = Math.random() < .5 ? -1 : 1; }
    const hx = PL.hx, hy = PL.hy, a = SO.slot === 'ahead' ? 56 : SO.slot === 'behind' ? -44 : 6, b = (SO.slot === 'side' ? 34 : 14) * SO.side;
    let tx = PL.x + hx * a - hy * b, ty = PL.y + hy * a + hx * b; if (!WORLD.walkable(tx, ty)) { tx = PL.x - hx * 30; ty = PL.y - hy * 30; }
    const ds = Math.hypot(tx - SO.x, ty - SO.y), gait = PL.sneak ? (ds > 120 ? 'trot' : 'stalk') : ds > 150 || (PL.gait === 'run' && ds > 40) ? 'run' : ds > 20 ? 'trot' : 'walk';
    if (ds > 14) { solGo(tx, ty, gait, dt, 8); if (SO.blocked) return solSet('wait'); } else SO.gait = '';
    SO.pauseT -= dt;
    if (SO.pauseT <= 0 && moving && !PL.sneak && d < 110) { SO.sub = 'pause'; SO.t = 0; SO.at = 0; SO.pk = SO.wet > .55 ? 'shake' : WORLD.terr(SO.x, SO.y) !== 0 && Math.random() < .4 ? 'flick' : pick(['sniff', 'sniff', 'look']); SO.pd = SO.pk === 'shake' ? .7 : 1 + Math.random() * 1.4; if (SO.pk === 'shake') solShake(); }
    if (SO.gait) solMovePose(SO.gait === 'trot' && SO.bond >= .5 && SO.wet < .5 ? { tail: 'up' } : SO.gait === 'stalk' ? { eye: 'wide' } : {}); else solIdle('stand');
  },
  settle(dt) {
    const d = dist(SO, PL), moving = PL.st === 'move' && (PL.gait === 'walk' || PL.gait === 'run' || PL.gait === 'sneak'), s = SO.sub;
    if (moving && d > 70 && s !== 'stretch') { if (s === 'loaf' || s === 'sleep') { SO.sub = 'stretch'; SO.t = 0; } else return solSet('follow'); }
    if (s === 'approach') { const sd = SO.x < PL.x ? -1 : 1; if (solGo(PL.x + sd * 32, PL.y + 10, d > 160 ? 'run' : d > 60 ? 'trot' : 'walk', dt, 9) || SO.t > 6) { if (SO.rubCd <= 0 && SO.bond >= .4 && Math.random() < .7) { SO.sub = 'rub'; SO.t = 0; SO.side = sd; SO.rubCd = 26; GSFX.trill(solPan(), .7); } else { SO.sub = 'sit'; SO.t = 0; SO.sitFor = 5 + Math.random() * 5; } } if (SO.gait) solMovePose(SO.bond >= .5 ? { tail: 'up' } : {}); else solIdle('stand'); if (SO.blocked) return solSet('wait'); }
    else if (s === 'rub') { if (solGo(PL.x - SO.side * 30, PL.y + 9, 'walk', dt, 6) || SO.t > 3) { SO.sub = 'sit'; SO.t = 0; SO.sitFor = 5 + Math.random() * 4; SO.bond = Math.min(1, SO.bond + .005); } if (SO.gait) solMovePose({ tail: 'up', eye: 'half' }); }
    else if (s === 'sit') {
      solLook(PL.x); const k = SO.t % 6; solPose('sit', 0, k > 4.2 && k < 5.6 ? { tilt: -.5, eye: 'half' } : SO.t > 2 && SO.t < 3 && SO.sitFor > 8 ? { yawn: 1, eye: 'shut' } : {});
      if (SO.t > SO.sitFor) { SO.t = 0; SO.at = 0; SO.sub = SO.wet > .25 ? 'groom' : Math.random() < .4 && WX.lv < 1.5 ? 'explore' : Math.random() < .3 ? 'scratch' : 'loaf'; if (SO.sub === 'explore') solPickPoi(); }
    } else if (s === 'groom') { solPose(SO.t < 2.6 ? 'lick' : 'wash', Math.floor(SO.at * (SO.t < 2.6 ? 4 : 5))); if (SO.t > 5.2) { SO.wet = Math.max(0, SO.wet - .2); SO.sub = 'sit'; SO.t = 0; SO.sitFor = 5 + Math.random() * 3; } }
    else if (s === 'scratch') { solPose('scratch', Math.floor(SO.at * 12)); if (SO.t > 1.3) { SO.sub = 'sit'; SO.t = 0; SO.sitFor = 4 + Math.random() * 4; } }
    else if (s === 'loaf') { solPose('loaf', Math.floor(SO.at * .8), { eye: SO.t > 6 ? 'shut' : 'half' }); if (SO.t > 24 && WX.lv < 1.2) { SO.sub = 'sleep'; SO.t = 0; } }
    else if (s === 'sleep') solPose('curl', Math.floor(SO.at * .7));
    else if (s === 'stretch') { solPose('bow', 0); if (SO.t > .9) return solSet('follow'); }
    else if (s === 'explore') {
      const p = SO.poi; if (!p || d > 260) { SO.sub = 'approach'; SO.t = 0; return; }
      if (!SO.n) { if (solGo(p.x, p.y, 'trot', dt, 8) || SO.t > 7) { SO.n = 1; SO.t = 0; SO.at = 0; solLook(p.lx); } if (SO.gait) solMovePose({}); if (SO.blocked) { SO.sub = 'sit'; SO.t = 0; } }
      else { if (p.k === 'sniff') solPose('sniff', Math.floor(SO.at * 3)); else if (p.k === 'claw') { solPose('standup', Math.floor(SO.at * 7)); if (Math.floor(SO.at * 7) !== Math.floor((SO.at - dt) * 7)) GSFX.paw(2); } else if (p.k === 'drink') solPose('drink', Math.floor(SO.at * 5)); else { solPose('swat', Math.floor(SO.at * 8)); if (p.p) p.p.bv = Math.sin(SO.at * 14) * 1.2; }
        if (SO.t > p.d) { SO.n = 0; SO.sub = 'approach'; SO.t = 0; } }
    }
  },
  alert(dt, foe) {
    if (foe) { SO.calm = 0; SO.lastFoe = foe; } else if ((SO.calm += dt) > 2) return solSet(PL.idleT > 1 ? 'settle' : 'follow', 'approach');
    const f = SO.lastFoe; if (!f) return solSet('follow');
    const df = dist(SO, f), danger = f.live && (df < 135 || f.aware === 2), a = Math.atan2(PL.y - f.y, PL.x - f.x), tx = PL.x + Math.cos(a) * 30 + Math.cos(a + 1.57) * 20 * SO.side, ty = PL.y + Math.sin(a) * 30 + Math.sin(a + 1.57) * 20 * SO.side, ds = Math.hypot(tx - SO.x, ty - SO.y);
    if (ds > (PL.sneak ? 22 : danger ? 30 : 64)) solGo(tx, ty, PL.sneak && ds < 110 ? 'stalk' : ds > 140 ? 'run' : 'trot', dt, 8); else SO.gait = '';
    if (SO.gait) solMovePose({ eye: 'wide', ear: danger ? 1 : 0 });
    else { solLook(f.x); if (danger) solPose('puff', Math.floor(SO.at * 6), { hiss: SO.at % 2.4 < .7 }); else if (PL.sneak) solPose('crouch', 0, { tw: 0 }); else solPose('alert', 0, { ear: SO.t > 1.2 ? 2 : 0 }); }
    SO.sndT -= dt; if (SO.sndT <= 0) { SO.sndT = danger ? 2.6 : 5; if (danger) GSFX.hiss(solPan(), .8); else GSFX.growl(solPan(), .7); }
    if (!MSG.seen.alert) hint('alert', '솔이 털을 세웠어요. 솔이 보는 쪽에 물그림자가 있어요. C로 몸을 낮춰 다가가고, Q로 솔을 먼저 보낼 수 있어요.', 9);
  },
  hunt(dt) {
    const f = SO.target, s = SO.sub, dorm = f && (f.st === 'dormant' || f.st === 'emerge'); if (!f || (!f.live && !dorm && s !== 'hop')) { SO.z = 0; SO.target = null; return solSet('alert'); }
    const d = dist(SO, f);
    if (dorm && s === 'stalk') {   // 물가까지만 가서 앞발로 물을 침 (물에는 안 들어감)
      const sd = SO.x < f.hx ? -1 : 1; if (solGo(f.hx + sd * (f.p.rx + 13), f.hy + 2, d > 150 ? 'trot' : 'stalk', dt, 7) || SO.blocked) { SO.sub = 'wiggle'; SO.t = 0; SO.at = 0; solLook(f.hx); } else if (SO.gait) solMovePose({ eye: 'wide' });
      if (SO.t > 10) return solSet('alert'); return;
    }
    if (s === 'paw') {
      solPose('swat', Math.floor(SO.t / .08) % 4, {});
      if (SO.t >= SO.n * .17 + .08 && SO.n < 3) { SO.n++; const wx = SO.x + (SO.flip ? -12 : 12); ring(wx, SO.y, 9, .4); drops(wx, SO.y, 2, 5, 60, '#a8d0e8', 90); GSFX.splash(solPan(), .3); }
      if (SO.t > .6) { if (f.st === 'dormant') { foeSet(f, 'emerge'); f.aware = 0; GSFX.blob(solPan()); } SO.flush = true; SO.sub = 'hop'; SO.t = 0; SO.jx = SO.x; SO.jy = SO.y; const a = Math.atan2(SO.y - f.hy, SO.x - f.hx), n = WORLD.nearestOpen(SO.x + Math.cos(a) * 70, SO.y + Math.sin(a) * 50) || [SO.x, SO.y]; SO.kx = n[0]; SO.ky = n[1]; }
      return;
    }
    if (s === 'stalk') { if (d > 62) { solGo(f.x, f.y, d > 150 ? 'trot' : 'stalk', dt, 56); if (SO.gait) solMovePose({ eye: 'wide' }); if (SO.t > 10 || SO.blocked) return solSet('alert'); } else { SO.sub = 'wiggle'; SO.t = 0; SO.at = 0; solLook(f.x); } }
    else if (s === 'wiggle') { solPose('crouch', Math.floor(SO.at * 9)); if (SO.t > .65 && dorm) { SO.sub = 'paw'; SO.t = 0; SO.n = 0; } else if (SO.t > .65) { SO.sub = 'pounce'; SO.t = 0; SO.jx = SO.x; SO.jy = SO.y; SO.kx = f.x - (SO.flip ? -1 : 1) * 18 * f.k; SO.ky = f.y + 2; } }
    else if (s === 'pounce') { const u = Math.min(1, SO.t / .34); SO.x = lerp(SO.jx, SO.kx, u); SO.y = lerp(SO.jy, SO.ky, u); SO.z = Math.sin(u * Math.PI) * 24; solPose('pounce', u < .25 ? 0 : u < .8 ? 1 : 2); if (u >= 1) { SO.z = 0; SO.sub = 'punch'; SO.t = 0; SO.n = 0; } }
    else if (s === 'punch') {
      solPose('swat', Math.floor(SO.t / .065) % 4, {});
      if (SO.t >= SO.n * .13 + .06 && SO.n < 4) { SO.n++; if (SO.n === 1) foeStagger(f, f.aware === 0 ? 3 : 2.2); foeHurt(f, .5, Math.atan2(f.y - SO.y, f.x - SO.x), 30, 'cat'); GSFX.punch(solPan()); V.shake = Math.max(V.shake, 1.5); }
      if (SO.t > .58) { SO.sub = 'hop'; SO.t = 0; SO.jx = SO.x; SO.jy = SO.y; const a = Math.atan2(SO.y - f.y, SO.x - f.x) + (Math.random() < .5 ? .7 : -.7), n = WORLD.nearestOpen(SO.x + Math.cos(a) * 66, SO.y + Math.sin(a) * 50) || [SO.x, SO.y]; SO.kx = n[0]; SO.ky = n[1]; }
    } else { const u = Math.min(1, SO.t / .3); SO.x = lerp(SO.jx, SO.kx, u); SO.y = lerp(SO.jy, SO.ky, u); SO.z = Math.sin(u * Math.PI) * 14; solPose('hop', 0); if (u >= 1) { SO.z = 0; SO.huntCd = SO.flush ? 1.5 : 4.5; SO.flush = false; SO.bond = Math.min(1, SO.bond + .01); SO.energy = Math.max(0, SO.energy - .05); SO.lastFoe = f; solSet('alert'); } }
  },
  flee(dt) { const ok = solGo(SO.hx, SO.hy, 'run', dt, 9, 1.2); if (SO.gait) solMovePose({ ear: 1, eye: 'wide' }); if (ok || SO.t > 5 || SO.blocked) { solSet('hide'); SO.hideFor = lerp(15, 5, SO.bond) + Math.random() * 3; } },
  hide(dt, foe) { solLook(PL.x); const peek = SO.t > SO.hideFor * .5 && SO.t % 3 < 1.2; solPose(peek ? 'alert' : 'crouch', 0, { ear: 2, eye: 'wide', tw: 0 }); if (SO.t > SO.hideFor && !(foe && foe.aware === 2)) solSet('return'); },
  return(dt) {   // 조심조심: 몇 걸음 가다 멈춰 둘러봄. 유대가 깊으면 서둘러 옴
    const d = dist(SO, PL);
    if (SO.sub === 'sitfar') { solLook(PL.x); solPose('sit', 0, { ear: SO.t < 1.4 ? 2 : 0, tail: 'out' }); if (SO.t > lerp(3.5, 1.2, SO.bond)) { SO.fear = Math.min(SO.fear, .2); SO.rubCd = 0; GSFX.mew(solPan(), .8); solSet('settle', 'approach'); } return; }
    if (d < 70) { SO.sub = 'sitfar'; SO.t = 0; return; }
    if (SO.t % 2.6 < lerp(1.3, 2.2, SO.bond)) { solGo(PL.x, PL.y, d > 220 ? 'trot' : SO.bond > .6 ? 'walk' : 'stalk', dt, 60); if (SO.gait) solMovePose({ ear: 2, eye: 'wide' }); if (SO.blocked) return solSet('wait'); } else { SO.gait = ''; solPose('alert', 0, { ear: Math.floor(SO.t * 2) % 2 ? 2 : 0 }); }
  },
  prey(dt) {
    const fl = SO.flock, s = SO.sub; if (!fl || dist(SO, PL) > 520) { SO.hidden = false; return solSet('follow'); }
    const d = Math.hypot(fl.x - SO.x, fl.y - SO.y);
    if (s === 'chatter') { solLook(fl.x); solPose('sit', 0, { eye: 'wide', tail: 'out', tw: Math.sin(SO.at * 9) }); if (SO.t > 1.5) { SO.sub = 'stalk'; SO.t = 0; } }
    else if (s === 'stalk') { if (fl.away) return solSet('follow'); if (d > 74) { solGo(fl.x, fl.y, 'stalk', dt, 66); if (SO.gait) solMovePose({ eye: 'wide' }); if (SO.t > 14 || SO.blocked) return solSet('follow'); } else { SO.sub = 'wiggle'; SO.t = 0; SO.at = 0; solLook(fl.x); } }
    else if (s === 'wiggle') { solPose('crouch', Math.floor(SO.at * 9)); if (SO.t > .7) { SO.sub = 'dash'; SO.t = 0; const a = Math.atan2(fl.y - SO.y, fl.x - SO.x); let c = null, bd = 1e9; for (const q of WORLD.covers) { const dd = Math.hypot(q.x - fl.x, q.y - fl.y), ad = Math.abs(angDiff(Math.atan2(q.y - fl.y, q.x - fl.x), a)); if (dd > 50 && dd < 240 && ad < 1.3 && dd < bd && WORLD.walkable(q.x, q.y - 6)) { bd = dd; c = q; } } SO.hx = c ? c.x : fl.x + Math.cos(a) * 120; SO.hy = c ? c.y - 5 : fl.y + Math.sin(a) * 120; } }
    else if (s === 'dash') { if (d < 60) birdsScare(SO.x, SO.y, 200); const ok = solGo(SO.hx, SO.hy, 'run', dt, 10, 1.15); if (SO.gait) solMovePose({ eye: 'wide' }); if (ok || SO.t > 3 || SO.blocked) { SO.sub = 'gone'; SO.t = 0; SO.hidden = true; SO.n = Math.random() < .6 ? 1 : 0; SO.pd = 5 + Math.random() * 4; brushFerns(SO.x, SO.y, 200, 2); GSFX.rustle(.8); } }
    else if (s === 'gone') { if (SO.t > SO.pd) { SO.hidden = false; SO.sub = 'bring'; SO.t = 0; SO.preyCd = SO.n ? 90 : 45; } }
    else if (s === 'bring') { const ok = solGo(PL.x + (SO.x < PL.x ? -22 : 22), PL.y + 8, SO.n ? 'trot' : 'walk', dt, 8); if (SO.gait) solMovePose(SO.n ? { prey: 1, tail: 'up' } : { tw: Math.sin(SO.at * 8) }); if (ok || SO.t > 12) { if (SO.n) { GITEMS.push({ k: 'bird', x: lerp(SO.x, PL.x, .5), y: lerp(SO.y, PL.y, .5) + 4, t: 0, z: 6, vz: 30 }); GSFX.mew(solPan()); SO.bond = Math.min(1, SO.bond + .03); say('솔이 선물을 물어 왔어요.'); hint('gift', '고양이는 고맙다는 뜻으로 잡은 것을 가져다줘요. 텐트에서 구워 같이 먹어요.'); } SO.sub = 'give'; SO.t = 0; } if (SO.blocked) return solSet('wait'); }
    else { solLook(PL.x); solPose('sit', 0, SO.n ? { tilt: -.5, eye: SO.t % 2 < .5 ? 'half' : 'open' } : { tail: 'out', tw: Math.sin(SO.at * 7) }); if (SO.t > 3) solSet('settle', 'sit'); }
  },
  ask(dt) {   // 안아 달라고 다리에 앞발을 올림
    const d = dist(SO, PL);
    if (SO.sub !== 'up') { const sd = SO.x < PL.x ? -1 : 1; if (solGo(PL.x + sd * 15, PL.y + 5, 'trot', dt, 6)) { SO.sub = 'up'; SO.t = 0; solLook(PL.x); GSFX.meow(solPan()); } if (SO.gait) solMovePose({}); if (SO.t > 6 || SO.blocked) return solSet('follow'); }
    else { solPose('standup', Math.floor(SO.at * 3)); if (SO.t > 3 && SO.t - dt <= 3) GSFX.mew(solPan()); if (SO.t > 6.5 || d > 40) { SO.askCd = 60; return solSet('under'); } }
  },
  under(dt) {   // 우비 밑으로 들어가려고 다가옴
    if (PL.st !== 'move' || PL.gait === 'run' || PL.sneak) return solSet('follow');
    if (solGo(PL.x, PL.y + 4, dist(SO, PL) > 120 ? 'run' : 'trot', dt, 15)) { SO.mode = 'under'; SO.carryT = 0; SO.cst = 'look'; SO.hidden = true; solSet('carried'); hint('under', '비가 세지면 솔은 우비 밑으로 들어와요. 달리거나 싸우면 다시 나와요.'); return; }
    if (SO.gait) solMovePose({ ear: 2 }); if (SO.blocked) return solSet('wait');
  },
  wait(dt) {   // 물에 막힘: 물가에 앉아 울며 기다림
    solLook(PL.x); solPose('sit', 0, { tilt: -.3, tail: 'out', tw: Math.sin(SO.at * 5) });
    SO.sndT -= dt; if (SO.sndT <= 0) { SO.sndT = 4 + Math.random() * 2; GSFX.meow(solPan(), .8); hint('water', '솔은 물을 건너지 않아요. 통나무 다리로 돌아오거나, 곁에서 E를 길게 눌러 안고 건너요.', 9); }
    if (SO.t % 1 < dt && WORLD.path(SO.x, SO.y, PL.x, PL.y, false)) solSet('follow');
  },
  pet(dt) {
    solLook(PL.x); solPose(SO.t % 1.2 < .6 ? 'stand' : 'sit', 0, { tail: 'up', eye: 'half', tilt: -.2 }); GSFX.purr(1);
    if (PL.st !== 'pet') { GSFX.purr(0); if (SO.petCd <= 0) { SO.bond = Math.min(1, SO.bond + .02); SO.petN = 0; } SO.petCd = 22; if (++SO.petN >= 3) { SO.petN = 0; say('솔이 이제 그만하래요.'); SO.poi = { x: SO.x + (SO.flip ? 60 : -60), y: SO.y + 20, lx: SO.x, k: 'sniff', d: 2 }; SO.n = 0; solSet('settle', 'explore'); } else solSet('settle', 'sit'); }
  },
  held() { solPose('stand', 0, { tail: 'up' }); if (PL.st !== 'lift') solSet('follow'); },
  camp(dt) {
    if (!CAMP.on) return solSet('follow');
    const s = SO.sub;
    if (!s) { if (solGo(CAMP.sx, CAMP.sy, 'trot', dt, 8) || SO.t > 8) { SO.sub = 'dry'; SO.t = 0; SO.at = 0; SO.flip = false; SO.face = 's'; } if (SO.gait) solMovePose({}); }
    else if (s === 'dry') { if (SO.wet > .15) solPose(SO.t % 5.2 < 2.6 ? 'lick' : 'wash', Math.floor(SO.at * 4)); else solPose(CAMP.eat > 0 ? 'sit' : SO.t > 30 ? 'curl' : SO.t % 9 < 2 ? 'knead' : 'loaf', Math.floor(SO.at * (SO.t % 9 < 2 ? 5 : .8)), CAMP.eat > 0 ? { tilt: -.4 } : { eye: 'shut' }); GSFX.purr(SO.wet < .15 ? .7 : 0); }
  },
  carried() { },
};
function solPickPoi() {
  const c = []; SO.n = 0;
  for (const f of WORLD.forage) if (f.n > 0 && Math.hypot(f.x - PL.x, f.y - PL.y) < 220) c.push({ x: f.x + (f.x < SO.x ? 16 : -16), y: f.y + 2, lx: f.x, k: 'sniff', d: 2.2 });
  WORLD.near(PL.x, PL.y, 220, p => { const d = Math.hypot(p.x - PL.x, p.y - PL.y); if (d > 230 || d < 40) return; if (p.t === 'tree' && p.y < WORLD.WH - 260) c.push({ x: p.x + (p.x < SO.x ? 1 : -1) * (WORLD.TR[p.v] * .8 + 9), y: p.y + 3, lx: p.x, k: 'claw', d: 2.4 }); else if (p.t === 'fern') c.push({ x: p.x + (p.x < SO.x ? 15 : -15), y: p.y + 2, lx: p.x, k: 'bat', d: 1.6, p }); });
  for (const p of WORLD.PUD) if (!p.home && Math.hypot(p.x - PL.x, p.y - PL.y) < 220) c.push({ x: p.x + (p.x < SO.x ? 1 : -1) * (p.rx + 11), y: p.y, lx: p.x, k: 'drink', d: 3 });
  SO.poi = c.length ? pick(c) : null; if (!SO.poi) SO.sub = 'loaf';
}
function solUpdate(dt) {
  SO.t += dt; SO.at += dt; SO.fear = Math.max(0, SO.fear - dt * .04); SO.rubCd -= dt; SO.petCd -= dt; SO.askCd -= dt; SO.preyCd -= dt; SO.huntCd -= dt;
  const foe = solSense(), free = SO.mode === 'free';
  if (free && !SO.hidden) { const shelter = SO.st === 'camp' || WORLD.terr(SO.x, SO.y) === 3; SO.wet = clamp(SO.wet + (shelter ? (SO.st === 'camp' ? -.08 : -.012) : WX.lv * .02 + .003) * dt, 0, 1); } else if (!free) SO.wet = Math.max(0, SO.wet - dt * (SO.mode === 'bag' ? .012 : .05));
  SO.energy = clamp(SO.energy + dt * (SO.gait === 'run' ? -.012 : !free || !SO.gait ? .012 : .002), 0, 1);
  if (SO.z > 0 && SO.st !== 'hunt') { SO.vz = (SO.vz || 0) - 400 * dt; SO.z = Math.max(0, SO.z + SO.vz * dt); }
  if (!free) {   // 품 · 배낭 · 우비 밑
    SO.x = PL.x; SO.y = PL.y + 1; SO.carryT += dt; let st = 'look';
    if (SO.cst === 'hide' && SO.cT > 0) { SO.cT -= dt; st = 'hide'; }
    else if (foe) { st = 'alert'; SO.sndT -= dt; if (SO.sndT <= 0) { SO.sndT = 5; GSFX.growl(0, .6); } if (!MSG.seen.alert) hint('alert', '솔이 귀를 젖혔어요. 가까이에 물그림자가 있어요. C로 몸을 낮춰 다가가고, Q로 솔을 보낼 수 있어요.', 9); }
    else if (SO.mode === 'arms') { const pat = 35 + SO.bond * 50 + (WX.lv > 1.4 || SO.wet > .5 ? 60 : 0); if (SO.carryT > pat + 5) { solEject('down'); GSFX.mew(0); say('솔이 내려 달래요.'); return; } st = SO.carryT > pat ? 'squirm' : SO.carryT > 4 ? 'purr' : 'look'; if (st === 'purr') SO.bond = Math.min(1, SO.bond + dt * .0015); }
    else if (SO.mode === 'bag') { const pat = 150 + SO.bond * 150; if (SO.carryT > pat + 5) { solEject('down'); GSFX.mew(0); return; } st = SO.carryT > pat ? 'squirm' : SO.carryT > 25 && PL.st === 'move' ? 'sleep' : 'look'; }
    else { if (PL.sneak || PL.gait === 'run' || PL.st === 'camp' || PL.st === 'tent') { solEject('down'); solSet(PL.st === 'tent' || PL.st === 'camp' ? 'camp' : 'follow'); return; } if (WX.lv < 1.2 && SO.wet < .12 && SO.carryT > 9 && Math.random() < dt * .12) { solEject('down'); return; } }
    if (SO.cst !== 'squirm' && st === 'squirm') GSFX.meow(0);
    SO.cst = st; GSFX.purr(st === 'purr' ? 1 : 0); SO.mood = st === 'alert' ? 'alert' : st === 'hide' ? 'scared' : st === 'sleep' ? 'sleepy' : st === 'purr' ? 'happy' : 'calm';
    return;
  }
  const st = SO.st, soft = st === 'follow' || st === 'settle';
  if (CAMP.on && st !== 'camp' && st !== 'flee' && st !== 'hide' && st !== 'hunt') solSet('camp');
  else if (foe && (soft || st === 'under' || st === 'wait' || st === 'ask' || st === 'return' || (st === 'prey' && SO.sub !== 'gone'))) { SO.hidden = false; SO.sndT = 0; solSet('alert'); }
  else if (soft && PL.st === 'move' && PL.gait !== 'run' && !PL.sneak && dist(SO, PL) < 260) {
    if ((WX.lv > 1.55 || SO.wet > .72) && SO.sub !== 'explore') { if (SO.askCd <= 0 && SO.bond >= .4 && (SO.wet > .75 || SO.energy < .3)) solSet('ask'); else solSet('under'); }
    else if (SO.preyCd <= 0 && SO.energy > .4 && WX.lv < 1.5) { const fl = birdsNear(SO.x, SO.y, 250); if (fl) { SO.flock = fl; solSet('prey', 'chatter'); solLook(fl.x); GSFX.chatter(solPan()); } }
  }
  SOLST[SO.st](dt, foe);
  const s2 = SO.st;
  SO.mood = s2 === 'alert' || s2 === 'hunt' ? 'alert' : s2 === 'flee' || s2 === 'hide' || s2 === 'return' ? 'scared' : SO.wet > .6 ? 'wet' : s2 === 'pet' || SO.sub === 'rub' || (s2 === 'prey' && SO.n) ? 'happy' : SO.sub === 'loaf' || SO.sub === 'sleep' || (s2 === 'camp' && SO.sub === 'dry') ? 'sleepy' : 'calm';
}
