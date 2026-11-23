'use strict';
/* =========================================================
   비 오는 숲 · 1막 시험판 — 화면, 입력, 그림 창고, 글자, 알갱이
   내부 화면은 짧은 변이 540쯤 되도록 잡고(1080p에서 딱 2배) 정수 · 반정수 배율로만 키움
   ========================================================= */
const V = { w: 960, h: 540, cvs: null, g: null, out: null, og: null, k: 1, css: 1, time: 0, shake: 0, sx: 0, sy: 0, hitstop: 0, touch: false, flash: 0, kx: 0, ky: 0, slow: 0, far: 2, hs: 2, hw: 480, hh: 270 };   // far: 멀리 보는 배율 · hs: 화면 표시(글자 · 단추)를 키우는 배율
const CAM = { x: 0, y: 0 };
function gResize() {
  const dpr = window.devicePixelRatio || 1, dw = Math.max(320, Math.round(innerWidth * dpr)), dh = Math.max(240, Math.round(innerHeight * dpr));
  const want = Math.min(dw / (dw < dh ? 520 : 880), dh / 500) / V.far;
  let sd = 1, best = 9; for (const c of [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8]) { const e = Math.abs(Math.log(c / Math.max(1, want))); if (e < best) { best = e; sd = c; } }
  V.w = Math.ceil(dw / sd); V.h = Math.ceil(dh / sd); V.hw = Math.ceil(V.w / V.hs); V.hh = Math.ceil(V.h / V.hs); V.k = 1;   // 멀리 보는 화면은 점이 작아서 반정수 배율도 그대로 키움 (두 배로 그렸다 줄이면 너무 무거움) V.css = sd / dpr;
  V.cvs.width = V.w; V.cvs.height = V.h; V.g.imageSmoothingEnabled = false;
  V.out.width = V.w * V.k; V.out.height = V.h * V.k; V.og.imageSmoothingEnabled = false;
  const cs = getComputedStyle(document.documentElement); V.safeT = Math.round((parseFloat(cs.paddingTop) || 0) / V.css / V.hs); V.safeB = Math.round((parseFloat(cs.paddingBottom) || 0) / V.css / V.hs);   // 휴대폰 위아래 막대만큼 표시를 안쪽으로
  V.out.style.width = V.w * V.css + 'px'; V.out.style.height = V.h * V.css + 'px'; V.out.style.imageRendering = 'pixelated';
}

/* ---------- 입력: 키보드 · 마우스 · 패드 · 터치를 한 가지 '동작'으로 모음 ---------- */
const IN = { mx: 0, my: 0, run: false, aim: false, cx: 0, cy: 0, mouseT: 9, ax: 0, ay: 0, stick: false, eHold: 0, tHold: 0, p: {}, keys: {}, mb: [false, false, false], pad: {}, tch: { id: -1, sx: 0, sy: 0, x: 0, y: 0, btn: {} } };
const press = k => { IN.p[k] = true; };
function gInput() {
  const el = V.out, pos = e => { const r = el.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * V.w, (e.clientY - r.top) / r.height * V.h]; };
  const posH = e => { const q = pos(e); return [q[0] / V.hs, q[1] / V.hs]; };   // 터치 단추는 화면 표시 좌표로
  const MAP = { Space: 'dodge', KeyX: 'dodge', KeyJ: 'knife', KeyZ: 'knife', KeyQ: 'sol', KeyF: 'sol', KeyC: 'sneak', ControlLeft: 'sneak', Tab: 'bag', KeyI: 'bag', KeyH: 'help', F1: 'help', KeyM: 'mute', Escape: 'esc', KeyE: 'e', KeyR: 'r', KeyT: 't', KeyG: 'g', F2: 'f2', F3: 'f3', F4: 'f4', F6: 'f6', F7: 'f7' };
  // 다른 쪽 안에 끼워져 돌아갈 때(아티팩트 등): 화면을 눌러도 글쇠가 이 창으로 안 들어오는 일이 없도록 누를 때마다 초점을 가져옴
  const grab = () => { try { window.focus(); if (document.activeElement !== el) el.focus({ preventScroll: true }); } catch (e) {} };
  addEventListener('pointerdown', grab, true); addEventListener('mousedown', grab, true); addEventListener('touchstart', grab, { capture: true, passive: true });
  addEventListener('keydown', e => {
    if (e.repeat) { if (MAP[e.code] || e.code.startsWith('Arrow')) e.preventDefault(); return; }
    IN.keys[e.code] = true; IN.p.any = true; GSFX.init();
    if (MAP[e.code]) { press(MAP[e.code]); e.preventDefault(); }
    if (/^Digit\d$/.test(e.code)) press('n' + e.code[5]);
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', e => { IN.keys[e.code] = false; if (e.code === 'KeyE') press('eUp'); if (e.code === 'KeyK') press('fireUp'); if (MAP[e.code] || e.code.startsWith('Arrow')) e.preventDefault(); });
  addEventListener('blur', () => { IN.keys = {}; IN.mb = [false, false, false]; });
  el.addEventListener('mousemove', e => { [IN.cx, IN.cy] = pos(e); IN.mouseT = 0; });
  el.addEventListener('mousedown', e => { GSFX.init(); IN.p.any = true; [IN.cx, IN.cy] = pos(e); IN.mouseT = 0; IN.mb[e.button] = true; if (e.button === 0) press('lmb'); e.preventDefault(); });
  addEventListener('mouseup', e => { IN.mb[e.button] = false; });
  el.addEventListener('contextmenu', e => e.preventDefault());
  // 터치: 왼쪽 반은 움직이는 막대, 오른쪽은 단추
  const tb = (x, y) => { for (const b of gTouchButtons()) if (Math.hypot(x - b.x, y - b.y) < b.r + 6) return b; return null; };
  el.addEventListener('touchstart', e => {
    e.preventDefault(); V.touch = true; GSFX.init(); IN.p.any = true;
    for (const t of e.changedTouches) { const [x, y] = posH(t), b = tb(x, y); if (b) { IN.tch.btn[t.identifier] = b.k; press('t_' + b.k); } else if (x < V.hw * .5 && IN.tch.id < 0) { IN.tch.id = t.identifier; IN.tch.sx = IN.tch.x = x; IN.tch.sy = IN.tch.y = y; } }
  }, { passive: false });
  el.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === IN.tch.id) [IN.tch.x, IN.tch.y] = posH(t); }, { passive: false });
  const tend = e => { for (const t of e.changedTouches) { if (t.identifier === IN.tch.id) IN.tch.id = -1; const k = IN.tch.btn[t.identifier]; if (k) { press('tu_' + k); delete IN.tch.btn[t.identifier]; } } };
  el.addEventListener('touchend', tend); el.addEventListener('touchcancel', tend);
}
function gTouchButtons() {
  const w = V.hw, h = V.hh, r = Math.max(22, Math.min(34, w * .045));
  return [{ k: 'knife', x: w - r * 1.6, y: h - r * 3.6, r, t: '칼' }, { k: 'dodge', x: w - r * 3.9, y: h - r * 1.7, r, t: '구르기' }, { k: 'gun', x: w - r * 1.6, y: h - r * 1.3, r, t: '총' },
    { k: 'sol', x: w - r * 3.9, y: h - r * 4.1, r: r * .8, t: '솔' }, { k: 'e', x: w - r * 6, y: h - r * 2.8, r: r * .8, t: 'E' }, { k: 'tent', x: w - r * 1.3, y: r * 1.4, r: r * .7, t: '텐트' }, { k: 'bag', x: w - r * 3.1, y: r * 1.4, r: r * .7, t: '가방' }, { k: 'sneak', x: w - r * 6, y: h - r * .9, r: r * .7, t: '살금' }];
}
const held = k => Object.values(IN.tch.btn).includes(k);
// 프레임마다: 여러 기기의 입력을 동작으로
function gPoll(dt) {
  const K = IN.keys, p = IN.p; let x = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0), y = (K.KeyS || K.ArrowDown ? 1 : 0) - (K.KeyW || K.ArrowUp ? 1 : 0);
  IN.run = !!(K.ShiftLeft || K.ShiftRight); IN.aim = !!(IN.mb[2] || K.KeyK); IN.stick = false; IN.mouseT += dt;
  if (IN.tch.id >= 0) { const dx = IN.tch.x - IN.tch.sx, dy = IN.tch.y - IN.tch.sy, d = Math.hypot(dx, dy), R = 44; if (d > 8) { x = dx / Math.max(d, R); y = dy / Math.max(d, R); IN.run = d > R * 1.7; } }
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(q => q && q.connected) : null;
  if (gp) {
    const dz = v => (Math.abs(v) < .22 ? 0 : v), b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), was = IN.pad;
    if (dz(gp.axes[0]) || dz(gp.axes[1])) { x = dz(gp.axes[0]); y = dz(gp.axes[1]); }
    if (Math.hypot(gp.axes[2] || 0, gp.axes[3] || 0) > .35) { IN.ax = gp.axes[2]; IN.ay = gp.axes[3]; IN.stick = true; IN.mouseT = 9; }
    IN.aim = IN.aim || b(6); IN.run = IN.run || b(4);
    const edge = (i, k) => { if (b(i) && !was[i]) { press(k); p.any = true; GSFX.init(); } was[i] = b(i); };
    edge(0, 'dodge'); edge(2, 'lmb'); edge(7, 'lmb'); edge(3, 'sol'); edge(1, 'sneak'); edge(9, 'help'); edge(8, 'bag');
    if (b(5) && !was[5]) press('e'); if (!b(5) && was[5]) press('eUp'); was[5] = b(5); K.PadE = b(5); K.PadT = b(12);
  }
  if (p.t_knife) press('lmb'); if (p.t_dodge) press('dodge'); if (p.t_sol) press('sol'); if (p.t_bag) press('bag'); if (p.t_sneak) press('sneak'); if (p.t_e) press('e'); if (p.tu_e) press('eUp');
  if (held('gun')) IN.aim = true; if (p.tu_gun) press('fireT');
  const m = Math.hypot(x, y); IN.mx = m > 1 ? x / m : x; IN.my = m > 1 ? y / m : y;
  IN.eHold = K.KeyE || K.PadE || held('e') ? IN.eHold + dt : 0; IN.tHold = K.KeyT || K.PadT || held('tent') ? IN.tHold + dt : 0;
}

/* ---------- 그림 창고: 관절 그림을 처음 쓸 때 굽고 다시 씀 ---------- */
const SPRS = new Map();
function gBake(key, W, H, ox, oy, mir, fn) {
  let s = SPRS.get(key); if (s) return s;
  const pb = new PB(W, H), R = HR.reset(mir ? -1 : 1, ox, oy), a = fn(R) || null; rasterHi(pb, R, G_ST);
  s = { c: pb.canvas(), ox, oy, w: W, h: H, a }; SPRS.set(key, s); return s;
}
function manSpr(anim, fr, dir, o) {
  const side = dir === 'l' || dir === 'r', c = o && o.cat, ck = c ? c.mode[0] + c.st + (c.st === 'squirm' ? c.fr % 2 : '') : '';
  const ak = anim === 'aim' ? Math.round(o.a * 12 / Math.PI) + (o.kneel ? 'k' : '') + (o.recoil ? 'r' : '') + (o.bolt ? 'b' : '') : '';
  return gBake('m' + anim + fr + dir + ck + ak, MAN_W, MAN_H, MAN_OX, MAN_OY, dir === 'l', R => manDraw(R, anim, fr, side ? 's' : dir, o || {}));
}
function solSpr(pose, fr, flip, o) {
  o = o || {}; fr = fr % (SOL_N[pose] || 1);   // 프레임 수만큼만 구움 (창고가 끝없이 늘지 않게)
  return gBake('c' + pose + fr + (flip ? 'L' : '') + (o.ear || 0) + (o.eye || '') + (o.tail || '') + (o.prey ? 'p' : '') + (o.hiss ? 'h' : '') + (o.tilt || '') + (o.yawn ? 'y' : ''), 84, 64, 42, 58, flip, R => { R.scl(.7); solDraw(R, pose, fr, o); });
}
function foeSpr(st, fr, flip, k) { return gBake('f' + st + fr + (flip ? 'L' : '') + k, FOE_W, FOE_H, FOE_OX, FOE_OY, flip, R => { R.scl(2); foeDraw(R, st, fr, { k }); }); }
function gDraw(s, x, y, a) { const g = V.g; if (a != null && a < 1) { g.globalAlpha = a; g.drawImage(s.c, Math.round(x - CAM.x) - s.ox, Math.round(y - CAM.y) - s.oy); g.globalAlpha = 1; } else g.drawImage(s.c, Math.round(x - CAM.x) - s.ox, Math.round(y - CAM.y) - s.oy); }
// 흰 실루엣 (맞았을 때 번쩍)
const _wh = new Map();
function gWhite(s) { let c = _wh.get(s); if (!c) { c = document.createElement('canvas'); c.width = s.w; c.height = s.h; const q = c.getContext('2d'); q.drawImage(s.c, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = '#eaf6ff'; q.fillRect(0, 0, s.w, s.h); _wh.set(s, c); } return c; }

/* ---------- 글자: 픽셀 글꼴을 또렷하게 ---------- */
const _txt = new Map();
function gText(str, x, y, o) {
  o = o || {}; const f = o.f || F9, col = o.c || '#f1e9d6', key = f + col + (o.sh || '') + str; let t = _txt.get(key);
  if (!t) {
    const m = textMask(str, f), c = document.createElement('canvas'); c.width = Math.max(1, m.w + 2); c.height = Math.max(1, m.h + 2); const q = c.getContext('2d'), put = (cc, dx, dy) => { q.fillStyle = cc; for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.mask[j * m.w + i]) q.fillRect(i + dx, j + dy, 1, 1); };
    if (o.sh) { put(o.sh, 2, 1); put(o.sh, 0, 1); put(o.sh, 1, 2); put(o.sh, 1, 0); } put(col, 1, 1);
    t = { c, w: m.w }; _txt.set(key, t);
  }
  const X = Math.round(o.al === 'center' ? x - t.w / 2 : o.al === 'right' ? x - t.w : x);
  V.g.drawImage(t.c, X - 1, Math.round(y) - 1); return t.w;
}
const gTextW = (str, f) => textMask(str, f || F9).w;

/* ---------- 알갱이 · 자국 ---------- */
const PARTS = [], DECALS = [];
function part(o) { if (PARTS.length < 700) PARTS.push(Object.assign({ z: 0, vx: 0, vy: 0, vz: 0, t: 0, life: .5 }, o)); }
function drops(x, y, z, n, sp, col, up) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (.4 + Math.random() * .8); part({ k: 'drop', x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .5, vz: (up || 90) * (.5 + Math.random()), life: .5 + Math.random() * .3, c: col || '#a8d0e8' }); } }
// 한쪽으로 튀는 물방울 (베인 쪽으로 흩어짐)
function spray(x, y, z, n, a, sp, col, wide) { for (let i = 0; i < n; i++) { const aa = a + (Math.random() - .5) * (wide || 1.1), v = sp * (.45 + Math.random()); part({ k: 'drop', x, y, z, vx: Math.cos(aa) * v, vy: Math.sin(aa) * v * .6, vz: 50 + Math.random() * 130, life: .45 + Math.random() * .3, c: col || '#a8d0e8' }); } }
function ring(x, y, r, life, col) { part({ k: 'ring', x, y, r, life: life || .35, c: col || '#9ab4d4' }); }
function decal(x, y, r, life) { if (DECALS.length > 220) DECALS.shift(); DECALS.push({ x, y, r, t: 0, life }); }
function gParts(dt) {
  for (let i = PARTS.length - 1; i >= 0; i--) {
    const p = PARTS[i]; p.t += dt;
    if (p.k === 'drop') { p.vz -= 520 * dt; p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.z <= 0 && p.vz < 0) { if (Math.random() < .35) ring(p.x, p.y, 3, .22, p.c); p.t = p.life; } }
    else if (p.k === 'smoke' || p.k === 'leaf') { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 1 - dt * 2; }
    if (p.t >= p.life) { PARTS[i] = PARTS[PARTS.length - 1]; PARTS.pop(); }
  }
  for (let i = DECALS.length - 1; i >= 0; i--) { DECALS[i].t += dt; if (DECALS[i].t > DECALS[i].life) DECALS.splice(i, 1); }
}
// 또렷한 타원 (가로줄로 채움)
function gEll(x, y, rx, ry, col) { const g = V.g; g.fillStyle = col; x = Math.round(x - CAM.x); y = Math.round(y - CAM.y); for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j / ry) * (j / ry)))); if (w > 0) g.fillRect(x - w, y + j, w * 2, 1); } }
function gRingPx(x, y, rx, ry, col) { const g = V.g; g.fillStyle = col; x = Math.round(x - CAM.x); y = Math.round(y - CAM.y); const n = Math.max(8, Math.round(rx * 2.4)); for (let i = 0; i < n; i++) { const a = i / n * TAU; g.fillRect(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), 1, 1); } }
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
const dir4 = (vx, vy, cur) => { const ax = Math.abs(vx), ay = Math.abs(vy), hz = cur === 'l' || cur === 'r' ? ax > ay * .7 : ax > ay * 1.15; return hz ? (vx > 0 ? 'r' : 'l') : (vy > 0 ? 'd' : 'u'); };
const MSG = { s: '', t: 0, hint: '', ht: 0, seen: {} };
function say(s, t) { MSG.s = s; MSG.t = t || 2.6; }
function hint(id, s, t) { if (MSG.seen[id]) return; MSG.seen[id] = 1; MSG.hint = s; MSG.ht = t || 7; }
