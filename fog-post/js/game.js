'use strict';
/* =========================================================
   게임 진행: 입력 · 물리 · 카메라 · 대사 · 생물 · 배달 · 그리기
   ========================================================= */
const GRAV = 640, WALK = 82, JUMP = 228, SWIM = 98, LEAP = 252, SLIDE_BOOST = 122, SLOPE_ACC = 440, MAXV = 300, AIR_ACC = 380;
const G = { mode: 'boot', t: 0, fade: 0, shake: 0, stamps: 0, deaths: 0, cam: { x: 0, y: -6 }, L: {}, sp: null, hint: {}, playT: 0, msg: null, intro: null, introI: 0 };
const P = { x: 118, y: 200, vx: 0, vy: 0, face: 1, onGround: true, slide: false, slideCd: 0, inWater: false, leap: 0, coyote: 0, phase: 0, squash: 0, ang: 0, idle: 0, idleW: 0, floating: false, read: 0, stepT: 0, puddleT: 0, leapt: false };
const K = { left: false, right: false, up: false, down: false, act: false, jumpBuf: 0, actBuf: 0 };
const ST = { shell: false, gateOpen: 0, gateOpening: false, cps: [], stamps: [], valveRot: 0, deliver: null, meow: 0 };
const CR = { pigeons: [], ducks: [], fish: [] };
const $ = id => document.getElementById(id);

/* ---------- 입력 ---------- */
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down', KeyE: 'act', Enter: 'act' };
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'KeyM') { toggleMute(); return; }
  const k = KEYMAP[e.code]; if (!k) return;
  if (G.mode === 'title' && (k === 'act')) { e.preventDefault(); startGame(); return; }
  e.preventDefault(); if (e.repeat) return;
  if (G.mode === 'intro' && (k === 'up' || k === 'act')) { advanceIntro(); return; }
  setKey(k, true);
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) { e.preventDefault(); setKey(k, false); } });
addEventListener('blur', () => { K.left = K.right = K.up = K.down = false; });
function setKey(k, v) { if (v && k === 'up') K.jumpBuf = .14; if (v && k === 'act') K.actBuf = .2; K[k] = v; }
function toggleMute() { AU.muted = !AU.muted; $('mute').textContent = AU.muted ? '×' : '♪'; $('mute').setAttribute('aria-pressed', AU.muted); }

/* ---------- 대사 ---------- */
const INTRO = [
  { who: 'pigeon', text: '어이 신입! 오늘부터 너도 안개 우체국 배달부다.' },
  { who: 'pigeon', text: '첫 배달이야. 이 편지를 물빛동 3번지 파란 대문 집에 전해 줘.' },
  { who: 'otter', text: '넵! 근데 선배, 제 가방에 원래 있던 이 낡은 편지는요...?' },
  { who: 'pigeon', text: '...그건 나중에 얘기하자. 안개 조심하고, 다녀와!' },
];
const HINTS = [
  { id: 'go', who: 'pigeon', t: '→ 키로 걸어가. 점프는 Space야!', when: () => G.playT > .4 },
  { id: 'hill', who: 'pigeon', t: '계단 골목이야. 꼭대기 전망대에서 동네가 한눈에 보여.', when: () => P.x > 650 && P.x < 760 },
  { id: 'slide', who: 'pigeon', t: '내리막에서 ↓를 누르면 배로 쭉 미끄러질 수 있어!', when: () => P.x > 886 && P.x < 990 },
  { id: 'gap', who: 'pigeon', t: '공사장 구멍이다! 미끄러진 속도 그대로 점프해서 건너.', when: () => P.x > 990 && P.x < 1062 && P.onGround },
  { id: 'canal', who: 'otter', t: '수영 금지...? 나는 수달인데.', when: () => P.x > 1258 && P.x < 1292 && P.onGround },
  { id: 'swim', who: 'pigeon', t: '물속에선 방향키로 헤엄쳐. 가만히 있으면 둥둥 떠서 쉴 수도 있어.', when: () => P.inWater },
  { id: 'dive', who: 'pigeon', t: '바닥 깊은 곳에 빨간 밸브가 보여. 돌려 볼까?', when: () => P.inWater && P.x > 1470 && !ST.shell },
  { id: 'valve', who: 'pigeon', t: '끼이익! 관리소 셔터가 올라가는 소리야.', when: () => ST.shell, prio: 1 },
  { id: 'leap', who: 'pigeon', t: '물 위에서 Space를 누르면 휙 뛰어올라 둑에 오를 수 있어.', when: () => P.inWater && P.x > 1640 && !P.leapt },
  { id: 'gate', who: 'otter', t: '셔터가 꽉 닫혀 있네. 운하에 뭔가 장치가 있었던 것 같은데.', when: () => P.x > 1790 && P.x < 1834 && ST.gateOpen < .05 },
  { id: 'fog', who: 'pigeon', t: '안개 골목이야. 맨홀에서 안개가 뿜어져. "!"가 뜨면 기다렸다 지나가.', when: () => P.x > 1880 && P.x < 1960 },
  { id: 'house', who: 'pigeon', t: '저기 파란 대문! 문 옆 우편함에 E 키로 편지를 넣어 줘.', when: () => P.x > 2700 },
];
function say(who, text, opt = {}) {
  G.msg = { who, text, shown: 0, t: 0, secs: opt.secs || Math.max(3.2, text.length * .09), blocking: !!opt.blocking, sfxT: 0 };
  $('msgFace').innerHTML = ''; $('msgFace').appendChild(who === 'otter' ? G.portraitO : G.portraitP);
  $('msgWho').textContent = who === 'otter' ? '수달' : '비둘기 선배';
  $('msg').classList.add('on'); $('msg').classList.toggle('blocking', !!opt.blocking); $('msg').classList.toggle('top', !opt.blocking); $('msgNext').hidden = true;
}
function updateMsg(dt) {
  const m = G.msg; if (!m) return;
  m.t += dt; const prev = Math.floor(m.shown); m.shown = Math.min(m.text.length, m.shown + dt * 30);
  if (Math.floor(m.shown) !== prev) { $('msgText').textContent = m.text.slice(0, Math.floor(m.shown)); if (Math.floor(m.shown) % 2 === 0 && m.text[Math.floor(m.shown) - 1] !== ' ') SFX.talk(); }
  const done = m.shown >= m.text.length;
  if (m.blocking) { $('msgNext').hidden = !done; return; }
  if (done && m.t > m.secs) { $('msg').classList.remove('on'); G.msg = null; }
}
function advanceIntro() {
  const m = G.msg; if (m && m.shown < m.text.length) { m.shown = m.text.length; $('msgText').textContent = m.text; return; }
  G.introI++;
  if (G.introI >= INTRO.length) { G.mode = 'play'; $('msg').classList.remove('on'); G.msg = null; $('hud').classList.add('on'); return; }
  say(INTRO[G.introI].who, INTRO[G.introI].text, { blocking: true });
}

/* ---------- 시작과 재시작 ---------- */
function resetRun() {
  Object.assign(P, { x: 118, y: 200, vx: 0, vy: 0, face: 1, onGround: true, slide: false, slideCd: 0, inWater: false, leap: 0, coyote: 0, phase: 0, squash: 0, ang: 0, idle: 0, idleW: 0, floating: false, read: 0, leapt: false });
  Object.assign(ST, { shell: false, gateOpen: 0, gateOpening: false, valveRot: 0, deliver: null });
  ST.cps = LV.cps.map((c, i) => ({ x: c.x, on: i === 0 })); ST.stamps = LV.stamps.map(s => ({ x: s.x, y: s.y, got: false }));
  G.stamps = 0; G.deaths = 0; G.playT = 0; G.hint = {}; G.fade = 0;
  $('stamps').textContent = '0 / 3';
  setupCritters(); setUnderwater(false);
}
function startGame() {
  auInit(); AU.started = true;
  $('title').hidden = true; resetRun();
  G.mode = 'intro'; G.introI = 0; say(INTRO[0].who, INTRO[0].text, { blocking: true });
}
function restart() { $('end').hidden = true; resetRun(); G.mode = 'play'; G.cam.x = P.x - VW * .42; $('hud').classList.add('on'); }

/* ---------- 생물 ---------- */
function setupCritters() {
  CR.pigeons.length = 0; CR.ducks.length = 0; CR.fish.length = 0;
  const w0 = META.wires[0], wB = META.wires.find(w => w.x0 > 2230 && w.x0 < 2260);
  for (const x of [262, 292, 336, 374, 406]) CR.pigeons.push({ hx: x, w: w0, x, y: wireY(w0, x), st: 'sit', vx: 0, vy: 0, face: hash1(x) < .5 ? 1 : -1, t: hash1(x * 3) * 5, back: 0 });
  if (wB) for (const x of [2300, 2336, 2440]) CR.pigeons.push({ hx: x, w: wB, x, y: wireY(wB, x), st: 'sit', vx: 0, vy: 0, face: -1, t: hash1(x) * 5, back: 0 });
  for (const [x, f, m] of [[1376, 1, true], [1402, -1, false], [1626, -1, true]]) CR.ducks.push({ x, face: f, male: m, st: 'idle', vx: 0, t: hash1(x) * 9, quack: 0 });
  for (let i = 0; i < 9; i++) CR.fish.push({ x: 1340 + hash1(i * 7) * 340, y: 244 + hash1(i * 13) * 70, face: hash1(i) < .5 ? 1 : -1, sp: 10 + hash1(i * 5) * 12, t: hash1(i * 9) * 9, col: i % 3 === 0 ? ['#e8823a', '#f6b06a'] : ['#9fb4bc', '#dce8ec'] });
}
function stepCritters(dt) {
  for (const b of CR.pigeons) {
    b.t += dt;
    if (b.st === 'sit') {
      if (Math.abs(P.x - b.x) < 46 && !P.inWater && G.mode === 'play' && Math.abs(P.y - b.y) < 160) { b.st = 'fly'; b.vx = (b.x > P.x ? 1 : -1) * rnd(50, 80); b.vy = rnd(-70, -50); b.face = Math.sign(b.vx); SFX.flap(); if (Math.random() < .5) addP({ kind: 'feather', x: b.x, y: b.y - 3, vx: rnd(-8, 8), vy: 6, max: 2.2, g: 4 }); }
      else if (Math.random() < dt * .3) b.face *= -1;
    } else if (b.st === 'fly') {
      b.vy += -12 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < G.cam.y - 40 || b.x < G.cam.x - 60 || b.x > G.cam.x + VW + 60) { b.st = 'gone'; b.back = 9; }
    } else if (b.st === 'gone') { b.back -= dt; if (b.back <= 0 && Math.abs(P.x - b.hx) > 260) { b.st = 'sit'; b.x = b.hx; b.y = wireY(b.w, b.hx); } }
  }
  for (const d of CR.ducks) {
    d.t += dt; const near = P.inWater && Math.abs(P.x - d.x) < 44;
    if (near && d.st !== 'flee') { d.st = 'flee'; d.face = d.x > P.x ? 1 : -1; d.vx = d.face * 34; if (d.quack <= 0) { SFX.quack(); d.quack = 2.5; } }
    if (d.quack > 0) d.quack -= dt;
    if (d.st === 'flee') { d.x += d.vx * dt; if (!near && Math.random() < dt * .8) { d.st = 'idle'; d.vx = 0; } }
    else { d.x += Math.sin(d.t * .4) * 3 * dt * d.face; if (Math.random() < dt * .1) d.face *= -1; }
    if (d.x < FX.wx0 + 14) { d.x = FX.wx0 + 14; d.face = 1; d.vx = Math.abs(d.vx); } if (d.x > FX.wx1 - 14) { d.x = FX.wx1 - 14; d.face = -1; d.vx = -Math.abs(d.vx); }
  }
  for (const f of CR.fish) {
    f.t += dt; const dx = f.x - P.x, dy = f.y - (P.y - 6), near = P.inWater && Math.hypot(dx, dy) < 34;
    if (near) { f.face = dx > 0 ? 1 : -1; f.x += f.face * 60 * dt; f.y += Math.sign(dy || 1) * 20 * dt; }
    else { f.x += f.face * f.sp * dt; f.y += Math.sin(f.t * 1.3) * 4 * dt; if (Math.random() < dt * .15) f.face *= -1; }
    const gg = groundAt(f.x); f.y = clamp(f.y, LV.water.s + 8, (gg ? gg.y : 300) - 4);
    if (f.x < FX.wx0 + 30) { f.x = FX.wx0 + 30; f.face = 1; } if (f.x > FX.wx1 - 30) { f.x = FX.wx1 - 30; f.face = -1; }
  }
  const cat = META.cat; if (cat) { const d = Math.abs(P.x - cat.x); if (d < 60 && ST.meow <= 0 && G.mode === 'play') { SFX.meow(); ST.meow = 9; ST.meowT = 1.6; } if (ST.meow > 0) ST.meow -= dt; if (ST.meowT > 0) ST.meowT -= dt; }
}

/* ---------- 물리 ---------- */
function respawn(reason) {
  G.deaths++; G.fade = 1; SFX.hurt();
  let cp = ST.cps[0]; for (const c of ST.cps) if (c.on) cp = c;
  Object.assign(P, { x: cp.x + 6, y: groundAt(cp.x + 6).y, vx: 0, vy: 0, onGround: true, slide: false, inWater: false, floating: false, leap: 0 });
  setUnderwater(false);
  say('pigeon', reason === 'fog' ? '앗, 안개에 밀려났어! "!" 신호를 보고 다시 가 보자.' : '괜찮아, 우체통 표시에서 다시 해 보자!', { secs: 3 });
}
function startJump() { P.vy = -JUMP; P.onGround = false; P.slide = false; P.squash = 0; SFX.jump(); burst(P.x, P.y, 4, { kind: 'dot', col: '#d9cfbd', vx: 20, vy0: -6, vy1: -24, g: 60 }); }
function step(dt) {
  G.t += dt; if (K.jumpBuf > 0) K.jumpBuf -= dt; if (K.actBuf > 0) K.actBuf -= dt;
  if (G.fade > 0) G.fade = Math.max(0, G.fade - dt * 1.5); if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2.2);
  if (P.squash > 0) P.squash = Math.max(0, P.squash - dt * 6); if (P.slideCd > 0) P.slideCd -= dt; if (P.leap > 0) P.leap -= dt;
  if (ST.gateOpening && ST.gateOpen < 1) ST.gateOpen = Math.min(1, ST.gateOpen + dt * .55);
  if (ST.shell) ST.valveRot += dt * Math.max(0, 6 - ST.valveRot * .4);
  stepCritters(dt); ambientParticles(dt); updateMsg(dt);
  if (G.mode === 'deliver') { stepDeliver(dt); return; }
  if (G.mode !== 'play') { P.idle += dt; P.read = lerp(P.read, (P.idle % 10 > 6 && P.idle % 10 < 9) ? 1 : 0, dt * 5); return; }
  G.playT += dt;
  const dir = (K.right ? 1 : 0) - (K.left ? 1 : 0), Wt = LV.water;
  const cy = P.y - 6, wasW = P.inWater;
  P.inWater = inWaterX(P.x) && (wasW ? cy > Wt.s - 3 : cy > Wt.s + 3);
  if (P.inWater !== wasW) {
    const fast = Math.abs(P.vy) > 120; SFX.splash(fast ? 1 : .45); setUnderwater(P.inWater);
    burst(P.x, Wt.s, fast ? 16 : 7, { kind: 'dot', col: '#d6eef2', vx: 50, vy0: -60, vy1: -130, g: 380, s: 1 });
    if (!P.inWater) P.floating = false;
  }
  const px = P.x, py = P.y;
  if (P.inWater) {
    P.onGround = false; P.slide = false; if (dir) P.face = dir;
    const ty = (K.down ? 1 : 0) - (K.up ? 1 : 0), idle = !dir && !ty;
    if (idle) P.idleW += dt; else P.idleW = 0;
    if (P.idleW > 1.1 && P.y - 6 <= Wt.s + 10 && !P.floating) { P.floating = true; addRipple(P.x); }
    if (!idle && P.floating && !(K.jumpBuf > 0)) P.floating = false;
    if (P.floating) {
      P.vx *= 1 - 3 * dt; P.vy = 0; P.x += P.vx * dt; P.y = lerp(P.y, Wt.s + 4 + Math.sin(G.t * 2) * .7, Math.min(1, dt * 4));
      if (Math.random() < dt * .6) addRipple(P.x + rnd(-8, 8));
    } else {
      const tvx = dir * SWIM, tvy = ty ? ty * SWIM : -14, k = Math.min(1, 4.2 * dt);
      P.vx += (tvx - P.vx) * k; P.vy += (tvy - P.vy) * k; P.x += P.vx * dt; P.y += P.vy * dt;
      if (P.leap <= 0 && P.y - 6 < Wt.s + 2) { P.y = Wt.s + 8; if (P.vy < 0) P.vy = 0; }
    }
    if (K.jumpBuf > 0 && P.y - 6 < Wt.s + 14 && P.leap <= 0) {
      K.jumpBuf = 0; P.vy = -LEAP; P.vx = P.vx || P.face * 40; P.leap = .3; P.floating = false; P.leapt = true; SFX.leap();
      burst(P.x, Wt.s, 12, { kind: 'dot', col: '#e6f6f8', vx: 60, vy0: -80, vy1: -160, g: 380 }); addRipple(P.x);
    }
    const g = groundAt(P.x);
    if (g && P.y > g.y) { if (py <= g.y + 5) { P.y = g.y; if (P.vy > 0) P.vy = 0; } else { P.x = px; P.vx = 0; } }
    const tAng = clamp(Math.atan2(P.vy, Math.abs(P.vx) + 30), -.7, .7); P.ang = P.floating ? 0 : lerp(P.ang, tAng, Math.min(1, dt * 6));
    if (Math.random() < dt * 1.6 && !P.floating) addP({ kind: 'bubble', x: P.x + P.face * 12, y: P.y - 9, vx: rnd(-4, 4), vy: -18, max: 2.5 });
    P.phase += dt * (1 + Math.hypot(P.vx, P.vy) / 60);
    if (P.y - 6 < Wt.s + 4 && Math.abs(P.vx) > 30 && Math.random() < dt * 8) burst(P.x - P.face * 10, Wt.s, 1, { kind: 'dot', col: '#e6f6f8', vx: 10, vy0: -20, vy1: -40, g: 300 });
  } else if (P.onGround) {
    const g0 = groundAt(P.x), slope = g0 ? g0.slope : 0;
    if (P.slide) {
      P.vx += slope * SLOPE_ACC * dt; P.vx *= 1 - (K.down ? .28 : 1.5) * dt;
      if (K.jumpBuf > 0) { K.jumpBuf = 0; startJump(); }
      else if (Math.abs(P.vx) < 34 || (!K.down && Math.abs(P.vx) < 70)) { P.slide = false; P.slideCd = .25; }
      if (Math.random() < dt * 16) addP({ kind: 'dot', x: P.x - Math.sign(P.vx) * 12, y: P.y - 1, vx: -Math.sign(P.vx) * rnd(5, 20), vy: rnd(-20, -5), g: 60, col: '#d9cfbd', max: .4 });
      if (Math.abs(P.vx) > 150 && Math.random() < dt * 12) addP({ kind: 'speed', x: P.x - Math.sign(P.vx) * rnd(16, 30), y: P.y - rnd(3, 12), vx: -Math.sign(P.vx) * 40, max: .25, len: 5 + Math.floor(Math.random() * 5) });
    } else {
      if (dir) P.face = dir;
      const up = dir * slope < -.2, sp = WALK * (up ? .85 : 1), acc = dir ? 720 : 640;
      P.vx += clamp(dir * sp - P.vx, -acc * dt, acc * dt);
      if (K.down && P.slideCd <= 0 && (Math.abs(P.vx) > 14 || slope * P.face > .15)) {
        P.slide = true; const f = P.vx ? Math.sign(P.vx) : P.face; P.face = f; P.vx = f * Math.max(Math.abs(P.vx) * 1.15, SLIDE_BOOST);
        SFX.slide(); burst(P.x, P.y, 6, { kind: 'dot', col: '#d9cfbd', vx: 30, vy0: -10, vy1: -40, g: 80 });
      } else if (K.jumpBuf > 0) { K.jumpBuf = 0; startJump(); }
      P.stepT -= dt * Math.abs(P.vx) / WALK; if (Math.abs(P.vx) > 20 && P.stepT <= 0) { P.stepT = .27; SFX.step(); if (inPuddle(P.x)) { SFX.puddle(); burst(P.x, P.y, 3, { kind: 'dot', col: '#b9d4dc', vx: 20, vy0: -20, vy1: -50, g: 300 }); } }
    }
    P.vx = clamp(P.vx, -MAXV, MAXV);
    if (P.onGround) {
      P.x += P.vx * dt; const g = groundAt(P.x);
      if (g) { const dy = g.y - P.y, steep = g.slope * Math.sign(P.vx) < -1.2; if (steep && dy < -1) { P.x = px; P.vx = 0; } else if (dy <= 6) P.y = g.y; else { P.onGround = false; P.slide = false; P.coyote = .1; } }
      else { P.onGround = false; P.slide = false; P.coyote = .1; }
    }
    P.phase += dt * Math.abs(P.vx) / WALK * 9.5;
  } else {
    P.vy = Math.min(420, P.vy + GRAV * dt);
    if (P.coyote > 0) { P.coyote -= dt; if (K.jumpBuf > 0 && P.vy >= 0) { K.jumpBuf = 0; startJump(); } }
    if (!K.up && P.vy < -90 && P.leap <= 0) P.vy *= 1 - 7 * dt;
    if (dir) { if (Math.abs(P.vx) < WALK || Math.sign(P.vx) !== dir) P.vx += dir * AIR_ACC * dt; P.face = dir; } else P.vx *= 1 - .3 * dt;
    P.x += P.vx * dt; P.y += P.vy * dt;
    let g = groundAt(P.x);
    if (g && P.y > g.y + 3 && py > g.y + 6) { P.x = px; P.vx *= -.1; g = groundAt(P.x); }
    if (g && P.vy >= 0 && py <= g.y + 6 && P.y >= g.y) {
      const hard = P.vy > 200; P.y = g.y; P.onGround = true; P.squash = hard ? 1 : .5; P.vy = 0;
      if (hard) { SFX.land(); burst(P.x, P.y, 6, { kind: 'dot', col: '#d9cfbd', vx: 30, vy0: -6, vy1: -30, g: 80 }); }
    }
  }
  if (P.x < LV.x0) { P.x = LV.x0; P.vx = 0; } if (P.x > LV.x1) { P.x = LV.x1; P.vx = 0; }
  if (P.y > 360) respawn('pit');
  // 셔터
  const a = LV.arch, gx0 = a.x0 + 3, gx1 = a.x1 - 3;
  if (ST.gateOpen < .9 && P.x + 5 > gx0 && P.x - 5 < gx1 && P.y > a.top) { P.x = px < (gx0 + gx1) / 2 ? gx0 - 5 : gx1 + 5; P.vx = 0; }
  // 밸브
  const v = LV.valve; if (!ST.shell && P.inWater && Math.hypot(P.x - v.x, P.y - 6 - (v.y - 16)) < 16) { ST.shell = true; SFX.valve(); setTimeout(() => SFX.shutter(), 700); ST.gateOpening = true; G.shake = .5; burst(v.x, v.y - 16, 14, { kind: 'spark', col: '#fff3b0', vx: 50, vy0: -10, vy1: -60, g: -10, l: 1.5 }); }
  // 우표
  for (const s of ST.stamps) if (!s.got && Math.hypot(P.x - s.x, P.y - 12 - s.y) < 13) {
    s.got = true; G.stamps++; SFX.stamp(); $('stamps').textContent = G.stamps + ' / 3'; burst(s.x, s.y, 14, { kind: 'spark', col: '#fff3b0', vx: 40, vy0: -20, vy1: -70, g: 40, l: 1.4 });
    if (G.stamps === 1) say('pigeon', '잃어버린 우표다! 동네 곳곳에 세 장이 숨어 있대.', { secs: 3.4 });
  }
  // 체크포인트
  for (const c of ST.cps) if (!c.on && P.x > c.x) { c.on = true; SFX.check(); const gy = groundAt(c.x).y; burst(c.x, gy - 15, 10, { kind: 'spark', col: '#ffe48a', vx: 30, vy0: -20, vy1: -60, g: 30, l: 1.2 }); }
  // 맨홀 안개
  for (const vt of LV.vents) { const s = ventState(vt, G.t); if (s.k === 'active' && Math.abs(P.x - vt.x) < 17 && P.y > 94 && P.y <= 206) { SFX.fog(); respawn('fog'); break; } }
  // 힌트
  if (!G.msg) for (const h of HINTS) { if (G.hint[h.id] || !h.when()) continue; G.hint[h.id] = 1; say(h.who, h.t); break; }
  else for (const h of HINTS) if (h.prio && !G.hint[h.id] && h.when()) { G.hint[h.id] = 1; say(h.who, h.t); }
  // 걷기 외 자세 값
  const idleNow = P.onGround && !P.slide && Math.abs(P.vx) < 8; if (idleNow) P.idle += dt; else P.idle = 0;
  P.read = lerp(P.read, (P.idle > 5 && P.idle % 10 > 5 && P.idle % 10 < 8.5) ? 1 : 0, Math.min(1, dt * 5));
  // 배달
  G.nearDoor = P.onGround && Math.abs(P.x - (LV.postbox.x - 10)) < 26;
  if (G.nearDoor && K.actBuf > 0) { K.actBuf = 0; startDeliver(); }
}
function inPuddle(x) { for (const p of META.puddles) if (x > p.x0 && x < p.x1) return true; return false; }
function addRipple(x) { addP({ kind: 'ripple', x, y: LV.water.s, max: 1.2, layer: 'ripple' }); }

/* ---------- 배달 장면 ---------- */
function startDeliver() { G.mode = 'deliver'; ST.deliver = { t: 0, thrown: false, yay: false, bell: false, done: false }; P.vx = 0; P.slide = false; P.face = 1; K.left = K.right = K.up = K.down = false; }
function stepDeliver(dt) {
  const d = ST.deliver; d.t += dt;
  const tx = LV.postbox.x - 14; P.x = lerp(P.x, tx, Math.min(1, dt * 4)); P.phase += dt * 6;
  if (d.t > 1.15 && !d.thrown) { d.thrown = true; SFX.clunk(); burst(LV.postbox.x, LV.postbox.y + 10, 12, { kind: 'spark', col: '#fff3b0', vx: 30, vy0: -20, vy1: -60, g: 30, l: 1.2 }); }
  if (d.t > 1.7 && !d.bell) { d.bell = true; SFX.bell(); }
  if (d.t > 2.3 && !d.yay) { d.yay = true; SFX.yay(); P.vy = -120; P.onGround = false; }
  if (!P.onGround) { P.vy += GRAV * dt; P.y += P.vy * dt; if (P.y >= 200) { P.y = 200; P.onGround = true; P.squash = .6; } }
  if (d.t > 3.6 && !d.done) { d.done = true; showEnd(); }
}
function showEnd() {
  G.mode = 'end'; $('hud').classList.remove('on');
  const m = Math.floor(G.playT / 60), s = Math.floor(G.playT % 60);
  $('stats').innerHTML = `<span>걸린 시간 ${m}분 ${String(s).padStart(2, '0')}초</span><span>잃어버린 우표 ${G.stamps} / 3</span><span>안개에 밀린 횟수 ${G.deaths}</span>`;
  $('end').hidden = false; $('againBtn').focus({ preventScroll: true });
}

/* ---------- 주변 파티클 ---------- */
function ambientParticles(dt) {
  const cx = G.cam.x;
  for (const t of META.leavesFrom) if (t.x1 > cx - 40 && t.x0 < cx + VW + 40 && Math.random() < dt * 1.6) addP({ kind: 'leaf', x: rnd(t.x0, t.x1), y: t.y + rnd(-6, 10), max: 14, ph: Math.random() * 6, col: pick(PAL.ginkgo.slice(2)), dep: Math.random() < .7 ? rnd(0, 3) : rnd(10, 50), wind: rnd(-10, -3) });
  for (const s of META.steams) if (s.x > cx - 30 && s.x < cx + VW + 30 && Math.random() < dt * s.rate) addP({ kind: 'puff', x: s.x + rnd(-1, 1), y: s.y, vx: rnd(-3, 3), vy: rnd(-14, -8), max: rnd(1.4, 2.2), sc: .5, grow: 1.4, a: .55 });
  if (META.chimney && Math.random() < dt * 2) addP({ kind: 'puff', x: META.chimney.x + rnd(-1, 1), y: META.chimney.y, vx: rnd(3, 7), vy: rnd(-8, -5), max: rnd(3, 5), sc: .6, grow: 2, a: .5, layer: 'mid' });
  for (const v of LV.vents) {
    if (v.x < cx - 40 || v.x > cx + VW + 40) continue; const s = ventState(v, G.t);
    if (s.k === 'warn' && Math.random() < dt * 14) addP({ kind: 'puff', x: v.x + rnd(-6, 6), y: 199, vx: rnd(-6, 6), vy: rnd(-40, -22), max: rnd(.6, 1), sc: .7, grow: 1, a: .55 });
    if (s.k === 'active' && Math.random() < dt * 40) addP({ kind: 'puff', x: v.x + rnd(-8, 8), y: 198, vx: rnd(-10, 10), vy: rnd(-120, -80), max: rnd(.8, 1.3), sc: 1.1, grow: 1.4, a: .9, big: true });
  }
  if (Math.random() < dt * 3) addP({ kind: 'dot', x: cx + rnd(0, VW), y: G.cam.y + rnd(20, 200), vx: rnd(-3, -1), vy: rnd(-2, 2), max: rnd(2, 4), col: '#fff6dc', layer: 'front' });
}

/* ---------- 그리기 ---------- */
const SC = $('screen'), SG = SC.getContext('2d');
const [LB, lg] = makeCanvas(VW + 1, VH + 1);
let UP = null, ug = null; const VIEW = { s: 1, k: 1, ox: 0, oy: 0, dpr: 1 };
function resize() {
  const dpr = Math.min(3, devicePixelRatio || 1), w = innerWidth, h = innerHeight;
  SC.width = Math.round(w * dpr); SC.height = Math.round(h * dpr); SC.style.width = w + 'px'; SC.style.height = h + 'px';
  const s = Math.min(SC.width / VW, SC.height / VH), k = Math.max(1, Math.ceil(s - .001));
  Object.assign(VIEW, { s, k, dpr, ox: Math.round((SC.width - VW * s) / 2), oy: Math.round((SC.height - VH * s) / 2) });
  if (!UP || UP.width !== (VW + 1) * k) { [UP, ug] = makeCanvas((VW + 1) * k, (VH + 1) * k); }
  const fr = $('frame'), u = s / dpr; fr.style.left = VIEW.ox / dpr + 'px'; fr.style.top = VIEW.oy / dpr + 'px'; fr.style.width = VW * u + 'px'; fr.style.height = VH * u + 'px';
  fr.style.setProperty('--u', u + 'px'); fr.style.setProperty('--n', clamp(Math.round(u * .72), 1, 4));
}
addEventListener('resize', resize);

function poseState() {
  const s = { t: G.t, blink: (G.t % 3.7) < .12, squash: P.squash };
  if (G.mode === 'deliver') { s.mode = 'deliver'; s.yay = ST.deliver.yay; s.thrown = ST.deliver.thrown; s.noLetter = true; return s; }
  if (P.inWater) { s.mode = P.floating ? 'float' : 'swim'; s.angle = P.ang; s.moving = Math.hypot(P.vx, P.vy) > 25; return s; }
  if (P.slide) { const g = groundAt(P.x); s.mode = 'slide'; s.angle = Math.atan(g ? g.slope : 0) * P.face; return s; }
  if (!P.onGround) { s.mode = P.vy < 0 ? 'jump' : 'fall'; return s; }
  if (Math.abs(P.vx) > 12) { s.mode = 'walk'; s.phase = P.phase; return s; }
  s.mode = 'idle'; s.read = P.read; return s;
}
function drawDynamicsBack(g, cx, cy) {
  const t = G.t;
  // 이발소 기둥
  const b = META.barber; if (b && b.x - cx > -10 && b.x - cx < VW + 10) {
    const cols = ['#d9433b', '#f4efe6', '#3f6fbf', '#f4efe6'];
    for (let j = 0; j < b.h; j++) for (let i = 0; i < 4; i++) { let c = cols[((Math.floor((j + i * 1.3 + t * 10) / 2.5) % 4) + 4) % 4]; if (i === 0 || i === 3) c = dk(c, .22); g.fillStyle = c; g.fillRect(b.x - cx + i - 2, b.y - cy + j, 1, 1); }
    g.fillStyle = '#c9cfd2'; g.fillRect(b.x - cx - 3, b.y - cy - 2, 6, 2); g.fillRect(b.x - cx - 3, b.y - cy + b.h, 6, 2);
  }
  // 빨래줄
  for (const L of META.laundry) {
    if (L.x1 - cx < -20 || L.x0 - cx > VW + 20) continue;
    const r = RNG(L.seed), n = 26; let prev = null;
    for (let i = 0; i <= n; i++) { const tt = i / n, x = lerp(L.x0, L.x1, tt), y = lerp(L.y0, L.y1, tt) + 7 * 4 * tt * (1 - tt); g.fillStyle = '#e6e2d8'; if (prev) { g.fillRect(Math.round(x - cx), Math.round(y - cy), 1, 1); } prev = [x, y]; }
    for (let k = 0; k < 9; k++) {
      const tt = .08 + k * .1 + r() * .03, x = lerp(L.x0, L.x1, tt), y = lerp(L.y0, L.y1, tt) + 7 * 4 * tt * (1 - tt), sw = Math.round(Math.sin(t * 1.8 + k) * 1.2);
      const kind = Math.floor(r() * 3), c = pick(['#f4efe6', '#9ec0d6', '#e8a4b0', '#f2d27a', '#7fae8a', '#ffffff']);
      g.fillStyle = c; const X = Math.round(x - cx), Y = Math.round(y - cy);
      if (kind === 0) { g.fillRect(X - 3, Y + 1, 7, 2); g.fillRect(X - 2 + sw, Y + 3, 5, 5); g.fillStyle = dk(c, .18); g.fillRect(X + 2 + sw, Y + 3, 1, 5); }
      else if (kind === 1) { g.fillRect(X - 2 + sw, Y + 1, 2, 6); g.fillRect(X + 1 + sw, Y + 1, 2, 6); g.fillRect(X - 2, Y + 1, 5, 2); }
      else { g.fillRect(X - 1 + sw, Y + 1, 3, 4); g.fillRect(X + sw, Y + 5, 3, 1); }
      g.fillStyle = '#8a8f93'; g.fillRect(X, Y, 1, 1);
    }
  }
  // 셔터
  { const a = LV.arch, x0 = a.x0 + 3, x1 = a.x1 - 3, hgt = Math.round((200 - a.top) * (1 - ST.gateOpen)); const sh = ST.gateOpening && ST.gateOpen < 1 ? Math.round(Math.sin(t * 40)) : 0;
    if (x1 - cx > -5 && x0 - cx < VW + 5 && hgt > 0) { for (let y = 0; y < hgt; y++) { g.fillStyle = (y % 3 === 0) ? '#7f878b' : (y % 3 === 1 ? '#b8bfc2' : '#a2a9ad'); g.fillRect(x0 - cx + sh, a.top + y - cy, x1 - x0, 1); }
      g.fillStyle = '#5d6468'; g.fillRect(x0 - cx + sh, a.top + hgt - 2 - cy, x1 - x0, 2); g.fillStyle = '#e8c33e'; g.fillRect((x0 + x1) / 2 - 3 - cx + sh, a.top + hgt - 2 - cy, 6, 1); } }
  // 밸브 손잡이
  { const v = LV.valve, X = v.x - cx, Y = v.y - 18 - cy; if (X > -20 && X < VW + 20) {
    if (!ST.shell) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = .45 + Math.sin(t * 4) * .25; g.drawImage(FX.glow.amber, Math.round(X - 10), Math.round(Y - 10)); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    const rot = ST.valveRot; for (let a = 0; a < TAU; a += .2) { g.fillStyle = '#c8392f'; g.fillRect(Math.round(X + Math.cos(a) * 5), Math.round(Y + Math.sin(a) * 5), 1, 1); }
    g.fillStyle = '#e05a4a'; for (let k = 0; k < 4; k++) { const a = rot + k * TAU / 4; for (let r = 1; r < 5; r++) g.fillRect(Math.round(X + Math.cos(a) * r), Math.round(Y + Math.sin(a) * r), 1, 1); }
    g.fillStyle = '#7d1e18'; g.fillRect(Math.round(X) - 1, Math.round(Y) - 1, 2, 2); } }
  // 체크포인트: 작은 우체통
  for (const c of ST.cps) { const gy = groundAt(c.x).y, X = Math.round(c.x - cx), Y = Math.round(gy - cy); if (X < -20 || X > VW + 20) continue;
    g.fillStyle = '#5a2420'; g.fillRect(X - 1, Y - 4, 3, 4); g.fillStyle = '#c9382d'; g.fillRect(X - 3, Y - 13, 7, 9); g.fillStyle = '#de5546'; g.fillRect(X - 1, Y - 13, 2, 9); g.fillStyle = '#9e2a22'; g.fillRect(X + 3, Y - 13, 1, 9);
    g.fillStyle = '#3a1714'; g.fillRect(X - 2, Y - 10, 5, 1); g.fillStyle = c.on ? '#ffe48a' : '#6f6a62'; g.fillRect(X - 1, Y - 16, 3, 3); g.fillStyle = '#3a3f44'; g.fillRect(X - 2, Y - 14, 5, 1);
    if (c.on) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = .7 + Math.sin(t * 3) * .2; g.drawImage(FX.glow.green, X - 10 + .5, Y - 25); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } }
  // 우표
  for (const s of ST.stamps) { if (s.got) continue; const X = Math.round(s.x - cx), Y = Math.round(s.y - cy + Math.sin(t * 2.4 + s.x) * 2); if (X < -20 || X > VW + 20) continue;
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = .5; g.drawImage(FX.glow.green, X - 10, Y - 10); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#f4efe6'; g.fillRect(X - 4, Y - 5, 9, 11); g.fillStyle = '#b8b0a0'; for (let i = -4; i <= 4; i += 2) { g.fillRect(X + i, Y - 6, 1, 1); g.fillRect(X + i, Y + 6, 1, 1); } for (let j = -5; j <= 5; j += 2) { g.fillRect(X - 5, Y + j, 1, 1); g.fillRect(X + 5, Y + j, 1, 1); }
    const col = ['#c8392f', '#2f5f8c', '#3f8a5a'][ST.stamps.indexOf(s)]; g.fillStyle = col; g.fillRect(X - 3, Y - 4, 7, 7); g.fillStyle = '#f4efe6'; g.fillRect(X - 1, Y - 2, 3, 3); g.fillStyle = '#2b2b2b'; g.fillRect(X - 3, Y + 4, 4, 1);
    if (Math.random() < .03) addP({ kind: 'spark', x: s.x + rnd(-6, 6), y: s.y + rnd(-6, 6), max: .5, col: '#fff3b0' }); }
  // 비둘기 선배 (우체통 위)
  { const X = 200 - cx, Y = 178 - cy; if (X > -30 && X < VW + 30) drawPigeonSenior(g, X, Y, P.x > 200 ? 1 : -1, { t, bob: Math.round(Math.sin(t * 3)) * (Math.sin(t * .7) > .3 ? 1 : 0), talk: G.msg && G.msg.who === 'pigeon' && G.msg.shown < G.msg.text.length }); }
  // 고양이
  const cat = META.cat; if (cat && cat.x - cx > -30 && cat.x - cx < VW + 30) { const f = P.x < cat.x ? -1 : 1; drawCat(g, cat.x - cx, cat.y - cy, { face: f, t, look: clamp((P.x - cat.x) / 80, -1, 1) * f, blink: (t % 4.3) < .14 });
    if (ST.meowT > 0) { const m = G.meowSpr; g.drawImage(m, Math.round(cat.x - cx - m.width / 2 + 4), Math.round(cat.y - cy - 34)); } }
  // 전깃줄 비둘기
  for (const p of CR.pigeons) { if (p.st === 'gone') continue; const X = p.x - cx, Y = p.y - cy; if (X < -20 || X > VW + 20) continue; const w = p.st === 'fly' ? 1 + (Math.floor(t * 12 + p.hx) % 2) : 0; g.drawImage(G.sp[`pig${p.face}${w}`], Math.round(X - 7), Math.round(Y - 10)); }
  // 물속
  drawWeeds(g, { x: cx, y: cy }, t);
  for (const f of CR.fish) drawFish(g, f.x - cx, f.y - cy, f.face, f.t, f.col);
}
function drawVentColumns(g, cx, cy) {
  for (const v of LV.vents) {
    const X = v.x - cx; if (X < -40 || X > VW + 40) continue; const s = ventState(v, G.t);
    if (s.k === 'active' || s.k === 'fade') {
      const a = s.k === 'active' ? 1 : s.a, n = 12;
      for (let i = 0; i < n; i++) { const yy = 200 - cy - i * 10 - (G.t * 40 % 10), w = 12 + Math.sin(G.t * 3 + i) * 3 + i * .5; g.globalAlpha = a * (1 - i / n * .5) * .85; g.drawImage(FX.glow.puffBig, Math.round(X - w + Math.sin(G.t * 2 + i * .7) * 3), Math.round(yy - w), Math.round(w * 2), Math.round(w * 2)); }
      g.globalAlpha = 1;
    }
    if (s.k === 'warn') { const bob = Math.round(Math.sin(G.t * 16)); g.drawImage(G.warnSpr, Math.round(X - 3), Math.round(200 - cy - 30 + bob)); }
  }
}
function drawDucks(g, cx, cy) {
  for (const d of CR.ducks) { const X = d.x - cx; if (X < -20 || X > VW + 20) continue; const bob = Math.floor(d.t * 2) % 2; g.drawImage(G.sp[`duck${d.face}${d.male ? 'm' : 'f'}${bob}`], Math.round(X - 11), Math.round(LV.water.s - cy - 10)); if (d.st === 'flee' && Math.random() < .3) addP({ kind: 'dot', x: d.x - d.face * 6, y: LV.water.s, vx: -d.face * 10, vy: -10, g: 200, col: '#e6f6f8', max: .3 }); }
}
function drawRipples(g, cx, cy) {
  for (const p of FX.parts) { if (p.layer !== 'ripple') continue; const k = p.life / p.max, r = Math.round(3 + k * 14), X = Math.round(p.x - cx), Y = Math.round(p.y - cy); g.fillStyle = `rgba(235,250,252,${(1 - k) * .8})`; g.fillRect(X - r, Y, 3, 1); g.fillRect(X + r - 2, Y, 3, 1); }
}
function render() {
  const L = G.L, cam = G.cam, sh = G.shake > 0 ? (Math.random() - .5) * 4 * G.shake : 0;
  const cx = Math.floor(cam.x + sh), cy = Math.floor(cam.y), fx = cam.x + sh - cx, fy = cam.y - cy, t = G.t, g = lg, C2 = { x: cx, y: cy };
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.drawImage(L.sky, 0, 0, VW + 1, VH + 1);
  for (let i = 0; i < L.clouds.length; i++) { const c = L.clouds[i], w = VW + c.width + 40; const x = ((i * 160 + 40 - cx * .03 - t * (1.5 + i * .4)) % w + w) % w - c.width - 20; g.drawImage(c, Math.round(x), 18 + i * 17 - Math.round(cy * .02)); }
  for (let i = 0; i < 3; i++) { const bx = ((t * (9 + i * 2) + i * 170) % (VW + 60)) - 30, by = 60 + i * 14 + Math.sin(t + i) * 3, wf = Math.floor(t * 6 + i) % 2; g.fillStyle = '#6f7f88'; g.fillRect(Math.round(bx), Math.round(by), 1, 1); g.fillRect(Math.round(bx) - 1, Math.round(by) - wf, 1, 1); g.fillRect(Math.round(bx) + 1, Math.round(by) - wf, 1, 1); }
  g.drawImage(L.far.cv, -Math.round(cx * L.far.f), Math.round(L.far.y0 - cy * L.far.fy));
  fogBand(g, FX.fogA, cx, .2, 118 - cy * .08, .45, 2, t);
  g.drawImage(L.mid.cv, -Math.round(cx * L.mid.f), Math.round(L.mid.y0 - cy * L.mid.fy));
  drawParts(g, { x: cx * L.mid.f, y: cy * L.mid.fy - L.mid.y0 }, 'mid');
  fogBand(g, FX.fogA, cx, .5, 146 - cy * .3, .5, 4, t);
  g.drawImage(L.world.cv, -(cx + WOX), -(cy + WOY));
  waterBack(g, C2, t); g.drawImage(L.uw.cv, L.uw.x - cx, L.uw.y - cy);
  drawDynamicsBack(g, cx, cy);
  drawParts(g, C2, 'back');
  drawOtter(g, P.x - cx, P.y - cy, P.face, poseState());
  if (G.mode === 'deliver' && ST.deliver && !ST.deliver.thrown && ST.deliver.t > .6) {
    const k = clamp((ST.deliver.t - .6) / .55, 0, 1), sx = P.x + 12, sy = P.y - 17, ex = LV.postbox.x, ey = LV.postbox.y + 11;
    const x = lerp(sx, ex, k) - cx, y = lerp(sy, ey, k) - Math.sin(k * Math.PI) * 10 - cy; g.fillStyle = '#f7f1e3'; g.fillRect(Math.round(x) - 3, Math.round(y) - 2, 6, 4); g.fillStyle = '#c9402f'; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 1, 1); g.fillRect(Math.round(x) + 1, Math.round(y) - 2, 1, 1); g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 1);
  }
  waterFront(g, C2, t);
  drawDucks(g, cx, cy); drawRipples(g, cx, cy);
  drawParts(g, C2, 'front');
  drawVentColumns(g, cx, cy);
  // 땅 안개
  fogBand(g, FX.fogC, cx, 1, 188 - cy, .28, 6, t);
  { const a0 = 1880 - cx, a1 = 2400 - cx; if (a1 > 0 && a0 < VW) { fogBand(g, FX.fogB, cx, 1, 118 - cy, .3, 5, t, Math.max(0, a0 - 40), Math.min(VW, a1 + 40)); fogBand(g, FX.fogC, cx, 1.1, 174 - cy, .45, 9, t, Math.max(0, a0), Math.min(VW, a1)); } }
  { const p0 = LV.pit.x0 - cx, p1 = LV.pit.x1 - cx; if (p1 > 0 && p0 < VW) { fogBand(g, FX.fogC, cx, 1, 196 - cy, .85, 7, t, Math.max(0, p0), Math.min(VW, p1)); fogBand(g, FX.fogB, cx, 1, 214 - cy, .9, 4, t, Math.max(0, p0), Math.min(VW, p1)); } }
  { const w0 = FX.wx0 - cx, w1 = FX.wx1 - cx; if (w1 > 0 && w0 < VW) fogBand(g, FX.fogC, cx, .9, LV.water.s - 26 - cy, .3, 3, t, Math.max(0, w0), Math.min(VW, w1)); }
  g.drawImage(L.fore.cv, -Math.round(cx * L.fore.f + L.fore.ox), VH - L.fore.H + 22 + Math.round((10 - cy) * .25));
  lightPass(g, C2, t, L);
  grade(g);
  // 전달 표시
  if (G.mode === 'play' && G.nearDoor) { const s = G.promptSpr; g.drawImage(s, Math.round(LV.postbox.x - 10 - cx - s.width / 2), Math.round(152 - cy + Math.sin(t * 4) * 1.5)); }
  if (G.fade > 0) { g.fillStyle = `rgba(236,242,244,${Math.min(1, G.fade * 1.3)})`; g.fillRect(0, 0, VW + 1, VH + 1); }
  // 확대해서 화면에
  ug.imageSmoothingEnabled = false; ug.drawImage(LB, 0, 0, UP.width, UP.height);
  SG.setTransform(1, 0, 0, 1, 0, 0); SG.fillStyle = '#0d1216'; SG.fillRect(0, 0, SC.width, SC.height);
  SG.save(); SG.beginPath(); SG.rect(VIEW.ox, VIEW.oy, Math.ceil(VW * VIEW.s), Math.ceil(VH * VIEW.s)); SG.clip();
  SG.imageSmoothingEnabled = Math.abs(VIEW.s - VIEW.k) > .01; SG.imageSmoothingQuality = 'high';
  SG.drawImage(UP, VIEW.ox - fx * VIEW.s, VIEW.oy - fy * VIEW.s, (VW + 1) * VIEW.s, (VH + 1) * VIEW.s);
  SG.restore();
}
function updateCam(dt) {
  let tx = P.x - VW * .42 + P.face * 22, ty = P.y - (P.inWater ? 172 : 205);
  if (G.mode === 'title' || G.mode === 'intro' || G.mode === 'boot') { tx = -40; ty = -8; }
  tx = clamp(tx, LV.x0, LV.camMax); ty = clamp(ty, -80, 150);
  const k = 1 - Math.exp(-dt * 4.2); G.cam.x += (tx - G.cam.x) * k; G.cam.y += (ty - G.cam.y) * k * .85;
}
let last = 0, acc = 0;
function frame(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; acc += dt;
  while (acc >= 1 / 120) { step(1 / 120); stepParts(1 / 120); acc -= 1 / 120; }
  updateCam(dt); render(); requestAnimationFrame(frame);
}

/* ---------- 준비 ---------- */
function smallSprite(text, bg, fg) { const m = textMask(text, F9), pb = new PB(m.w + 8, m.h + 7); pb.rect(0, 1, pb.w, pb.h - 3, bg); pb.rect(1, 0, pb.w - 2, pb.h - 1, bg); pb.hl(1, pb.w - 2, pb.h - 2, dk(bg, .3)); pb.text(text, pb.w / 2, 3, F9, fg, 'center'); pb.px(pb.w / 2 - 1, pb.h - 1, bg); pb.px(pb.w / 2, pb.h - 1, bg); return pb.canvas(); }
function boot() {
  const t0 = performance.now();
  G.L = { sky: buildSky(), clouds: buildClouds(), far: buildFar(), mid: buildMid(), world: buildWorld(), fore: buildFore(), uw: buildUnderwater() };
  initFX(); G.sp = bakeSprites(); G.portraitP = pigeonPortrait(); G.portraitO = otterPortrait();
  G.promptSpr = smallSprite('E 편지 넣기', '#f4efe6', '#2b2520'); G.meowSpr = smallSprite('야옹', '#f4efe6', '#2b2520');
  { const pb = new PB(7, 12); pb.rect(2, 0, 3, 8, '#e05a4a'); pb.rect(2, 9, 3, 3, '#e05a4a'); pb.rect(3, 0, 1, 8, '#ffd9cf'); G.warnSpr = pb.canvas(); }
  for (const c of [G.portraitP, G.portraitO]) c.className = 'portrait';
  resetRun(); resize(); G.cam.x = -40; G.cam.y = -8;
  G.mode = 'title'; G.bootMs = performance.now() - t0;
  $('loading').hidden = true; $('title').hidden = false; $('startBtn').focus({ preventScroll: true });
  requestAnimationFrame(ts => { last = ts; requestAnimationFrame(frame); });
}
$('startBtn').onclick = startGame;
$('againBtn').onclick = restart;
$('mute').onclick = toggleMute;
$('msg').addEventListener('click', () => { if (G.mode === 'intro') advanceIntro(); });
const touchEl = $('touch');
if (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window) touchEl.classList.add('on');
touchEl.querySelectorAll('.tb').forEach(b => {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); b.classList.add('on'); auInit(); if (G.mode === 'intro' && (k === 'up' || k === 'act')) { advanceIntro(); return; } setKey(k, true); };
  const off = e => { e.preventDefault(); b.classList.remove('on'); setKey(k, false); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
});
resize();
(window.FONTS_READY || Promise.resolve()).then(() => setTimeout(boot, 30));
window.GAME = { G, P, K, ST, CR, setKey, step, startGame, restart, respawn };
