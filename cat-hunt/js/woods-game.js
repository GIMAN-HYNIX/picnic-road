'use strict';
/* =========================================================
   거대한 숲 걷기 (에디토리얼 캐리커처 픽셀)
   화면 · 조작 · 사냥꾼 · 솔 · 숲 동물 · 평평한 빛
   내부 해상도는 짧은 변 약 720 (픽셀이 이전의 절반 크기 → 캐릭터가 화면에서 절반)
   ========================================================= */
const WG = (() => {
  let W, disp, dg, scene, sg, mid, mg, lightC, lgc, shC, shG, vign = null;
  let VW = 1280, VH = 720, SC = 1, KI = 1, time = 0, last = 0, started = false, ready = false;
  const keys = {}, joy = { on: false, x: 0, y: 0, m: 0, sx: 0, sy: 0, id: -1 };
  const VZ = WOODS.VZ, BASE = WOODS.BASE, TAU2 = Math.PI * 2;
  const H = { x: 0, y: 0, vx: 0, vy: 0, dir: 'u', mode: 'idle', ph: 0, idle: 0, look: -1, trail: [], rustleT: 0, sp: 0, blinkT: 3, blink: 0 };
  const Cc = { x: 0, y: 0, dir: 'u', mode: 'stand', ph: 0, t: 0, spot: null, ear: 0, blink: 0, blinkT: 2, stuck: 0 };
  const cam = { x: 0, y: 0 };
  let fauna = [], events = [], leaves = [];
  const pause = () => new Promise(r => setTimeout(r, 0));

  /* ---------- 시작 ---------- */
  async function init(canvas, onProgress) {
    disp = canvas; dg = disp.getContext('2d');
    scene = document.createElement('canvas'); sg = scene.getContext('2d');
    mid = document.createElement('canvas'); mg = mid.getContext('2d');
    lightC = document.createElement('canvas'); lgc = lightC.getContext('2d');
    shC = document.createElement('canvas'); shG = shC.getContext('2d');
    const P = (p, m) => onProgress && onProgress(p, m);
    P(.04, '사냥꾼과 솔을 그리는 중'); await pause();
    bakeSprites();
    P(.22, '숲 동물을 그리는 중'); await pause();
    bakeCritters();
    P(.38, '나무를 심는 중'); await pause();
    W = WOODS.gen(11);
    P(.86, '오솔길을 다지는 중'); await pause();
    H.x = W.LAY.start[0]; H.y = W.LAY.start[1];
    Cc.x = H.x + 18; Cc.y = H.y + 24;
    for (let i = 0; i < 80; i++) H.trail.push({ x: H.x, y: H.y + i * .6 });
    fauna = makeFauna();
    resize(); cam.x = H.x - VW / 2; cam.y = H.y - 40 - VH / 2; clampCam();
    const cx0 = Math.floor((cam.x - 256) / 256), cy0 = Math.floor((cam.y - 256) / 256);
    for (let cy = cy0; cy <= cy0 + Math.ceil((VH + 512) / 256); cy++) for (let cx = cx0; cx <= cx0 + Math.ceil((VW + 512) / 256); cx++) if (cx >= 0 && cy >= 0 && cx * 256 < W.WW && cy * 256 < W.WH) W.chunk(cx, cy);
    P(.99, '거의 다 됐어요'); await pause();
    addEventListener('resize', resize);
    addEventListener('keydown', e => { const k = keyName(e); if (k) { keys[k] = true; if (k !== 'shift') e.preventDefault(); } });
    addEventListener('keyup', e => { const k = keyName(e); if (k) keys[k] = false; });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; joy.on = false; });
    disp.addEventListener('pointerdown', pdown); addEventListener('pointermove', pmove); addEventListener('pointerup', pup); addEventListener('pointercancel', pup);
    ready = true;
    requestAnimationFrame(loop);
  }
  function keyName(e) {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') return 'left'; if (k === 'ArrowRight' || k === 'd' || k === 'D') return 'right';
    if (k === 'ArrowUp' || k === 'w' || k === 'W') return 'up'; if (k === 'ArrowDown' || k === 's' || k === 'S') return 'down';
    if (k === 'Shift') return 'shift'; return null;
  }
  function pdown(e) { if (joy.on) return; joy.on = true; joy.id = e.pointerId; joy.sx = e.clientX; joy.sy = e.clientY; joy.x = joy.y = joy.m = 0; try { disp.setPointerCapture(e.pointerId); } catch (_) { } }
  function pmove(e) { if (!joy.on || e.pointerId !== joy.id) return; const R = 46, dx = e.clientX - joy.sx, dy = e.clientY - joy.sy, d = Math.hypot(dx, dy); joy.m = Math.min(1, d / R); joy.x = d > 4 ? dx / d * joy.m : 0; joy.y = d > 4 ? dy / d * joy.m : 0; }
  function pup(e) { if (e.pointerId !== joy.id) return; joy.on = false; joy.x = joy.y = joy.m = 0; }

  /* ---------- 화면 크기: 짧은 변 720 기준 (작게 줄이지는 않음) ---------- */
  function resize() {
    const cw = Math.max(1, innerWidth), ch = Math.max(1, innerHeight), dpr = devicePixelRatio || 1, dw = Math.round(cw * dpr), dh = Math.round(ch * dpr);
    SC = Math.max(1, Math.min(dw, dh) / (dw >= dh ? 720 : 620));
    if (Math.abs(SC - Math.round(SC)) < .03) SC = Math.round(SC);
    VW = Math.min(1720, Math.ceil(dw / SC)); VH = Math.min(1720, Math.ceil(dh / SC));
    disp.width = dw; disp.height = dh; disp.style.width = cw + 'px'; disp.style.height = ch + 'px';
    scene.width = VW + 2; scene.height = VH + 2; sg.imageSmoothingEnabled = false;
    KI = Math.ceil(SC - 1e-6);
    if (SC !== Math.round(SC)) { mid.width = (VW + 2) * KI; mid.height = (VH + 2) * KI; mg.imageSmoothingEnabled = false; } else { mid.width = mid.height = 1; }
    lightC.width = Math.ceil(VW / 2) + 4; lightC.height = Math.ceil(VH / 2) + 4;
    vign = makeVignette();
  }
  function makeVignette() {
    const [c, g] = makeCanvas(VW, VH);
    let gr = g.createLinearGradient(0, 0, 0, VH * .4); gr.addColorStop(0, 'rgba(196,212,196,0.16)'); gr.addColorStop(1, 'rgba(196,212,196,0)');
    g.fillStyle = gr; g.fillRect(0, 0, VW, VH * .4);
    gr = g.createRadialGradient(VW / 2, VH * .55, Math.min(VW, VH) * .45, VW / 2, VH * .55, Math.max(VW, VH) * .8);
    gr.addColorStop(0, 'rgba(14,20,12,0)'); gr.addColorStop(1, 'rgba(14,20,12,0.42)');
    g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    return c;
  }
  function clampCam() { cam.x = clamp(cam.x, 0, W.WW - VW); cam.y = clamp(cam.y, 0, W.WH - VH); }
  // 4방향 그림 고르기 (대각선은 좌우 우선, 흔들림 방지)
  function dir4(vx, vy, cur) {
    const ax = Math.abs(vx), ay = Math.abs(vy), horiz = cur === 'l' || cur === 'r' ? ax > ay * .7 : ax > ay * 1.15;
    return horiz ? (vx > 0 ? 'r' : 'l') : (vy > 0 ? 'd' : 'u');
  }

  /* ---------- 사냥꾼 ---------- */
  function updHunter(dt) {
    let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + joy.x, iy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + joy.y;
    const m = Math.min(1, Math.hypot(ix, iy)), sneak = keys.shift || (joy.on && joy.m < .55);
    let tx = 0, ty = 0;
    if (m > .15) { const n = Math.hypot(ix, iy), sp = (sneak ? 22 : 48) * (joy.on ? Math.max(.6, m) : 1); tx = ix / n * sp; ty = iy / n * sp; }
    const k = 1 - Math.exp(-dt * 10);
    H.vx += (tx - H.vx) * k; H.vy += (ty - H.vy) * k;
    if (Math.hypot(H.vx, H.vy) > 3 && m > .15) {
      const ox = H.x, oy = H.y, nx = H.x + H.vx * dt, ny = H.y + H.vy * dt;
      if (!W.blocked(nx, ny, 6)) { H.x = nx; H.y = ny; } else if (!W.blocked(nx, H.y, 6)) H.x = nx; else if (!W.blocked(H.x, ny, 6)) H.y = ny;
      const moved = Math.hypot(H.x - ox, H.y - oy);
      H.mode = sneak ? 'sneak' : 'walk'; H.sp = moved / dt;
      H.dir = dir4(H.vx, H.vy, H.dir);
      const cyc = sneak ? 24 : 30, before = H.ph;
      H.ph = (H.ph + moved / cyc) % 1;
      if ((before < .25 && H.ph >= .25) || (before < .75 && H.ph >= .75) || (H.ph < before && before < .75)) footstep();
      const L = H.trail[0]; if (!L || Math.hypot(L.x - H.x, L.y - H.y) > 2) { H.trail.unshift({ x: H.x, y: H.y }); if (H.trail.length > 300) H.trail.pop(); }
      H.idle = 0; H.look = -1;
      H.rustleT -= dt;
      for (const f of nearFerns(H.x, H.y, 18)) { f.bv += (f.x < H.x ? -1 : 1) * 26 * dt * Math.min(1.5, moved / dt / 40); if (H.rustleT <= 0 && moved > .2) { SFX.rustle(sneak ? .4 : .75); H.rustleT = .42 + Math.random() * .2; } }
    } else {
      H.vx = H.vy = 0; H.mode = 'idle'; H.idle += dt; H.sp = 0;
      if (H.look < 0 && H.idle > 4 && H.dir === 'd' && Math.random() < dt * .3) H.look = 0;
      if (H.look >= 0) { H.look += dt; if (H.look > 4.2) { H.look = -1; H.idle = 1.2; } }
    }
    H.blinkT -= dt; if (H.blinkT <= 0) { H.blink = .13; H.blinkT = 2.5 + Math.random() * 3; } if (H.blink > 0) H.blink -= dt;
  }
  function footstep() { const t = W.terrAt(H.x, H.y); SFX.step(t === 'trail' ? 'path' : t === 'bridge' ? 'bridge' : t === 'grass' ? 'grass' : 'litter', H.mode === 'sneak' ? .45 : 1); }
  let _ferns = [];
  function nearFerns(x, y, r) { const out = []; for (const f of _ferns) if (Math.abs(f.x - x) < r && Math.abs(f.y - y) < r * .6) out.push(f); return out; }
  function hunterSprite() {
    const s = SPR.hunter[H.dir];
    if (H.mode === 'walk') return s.walk[Math.floor(H.ph * HWALK) % HWALK];
    if (H.mode === 'sneak') return s.sneak[Math.floor(H.ph * HWALK) % HWALK];
    if (H.look >= 0 && s.look.length) { const t = H.look; return t < .5 ? s.idle[0] : t < 1.6 ? s.look[0] : t < 1.9 ? s.look[1] : t < 2.3 ? s.idle[0] : t < 2.6 ? s.look[2] : t < 3.7 ? s.look[3] : s.idle[0]; }
    if (H.blink > 0) return s.idle[2];
    return s.idle[(time * 1.1 | 0) % 2];
  }

  /* ---------- 솔 ---------- */
  function trailPoint(dist) {
    let acc = 0, prev = { x: H.x, y: H.y };
    for (const p of H.trail) { const d = Math.hypot(p.x - prev.x, p.y - prev.y); if (acc + d >= dist) { const t = (dist - acc) / (d || 1); return { x: prev.x + (p.x - prev.x) * t, y: prev.y + (p.y - prev.y) * t }; } acc += d; prev = p; }
    return prev;
  }
  function updCat(dt) {
    const dH = Math.hypot(Cc.x - H.x, Cc.y - H.y);
    let tx, ty, want = 0;
    if (H.mode !== 'idle' || H.idle < .7) {
      const p = trailPoint(34); tx = p.x; ty = p.y; Cc.spot = null;
      const dd = Math.hypot(tx - Cc.x, ty - Cc.y);
      want = dd > 44 ? 66 : dd > 20 ? Math.max(30, H.sp * 1.05) : dd > 6 ? Math.max(18, H.sp * .9) : 0;
    } else {
      if (!Cc.spot) {
        const sides = [[24, 10], [-24, 10], [18, 18], [-18, 18], [28, -4], [-28, -4]];
        sides.sort((a, b) => Math.hypot(H.x + a[0] - Cc.x, H.y + a[1] - Cc.y) - Math.hypot(H.x + b[0] - Cc.x, H.y + b[1] - Cc.y));
        Cc.spot = sides.map(s => ({ x: H.x + s[0], y: H.y + s[1] })).find(s => !W.blocked(s.x, s.y, 4)) || { x: Cc.x, y: Cc.y };
      }
      tx = Cc.spot.x; ty = Cc.spot.y; const dd = Math.hypot(tx - Cc.x, ty - Cc.y); want = dd > 3 ? 26 : 0;
    }
    if (want > 0) {
      const dx = tx - Cc.x, dy = ty - Cc.y, dd = Math.hypot(dx, dy) || 1, sp = Math.min(want, dd / dt);
      const nx = Cc.x + dx / dd * sp * dt, ny = Cc.y + dy / dd * sp * dt;
      if (!W.blocked(nx, ny, 3.5)) { Cc.x = nx; Cc.y = ny; Cc.stuck = 0; }
      else if (!W.blocked(nx, Cc.y, 3.5)) Cc.x = nx; else if (!W.blocked(Cc.x, ny, 3.5)) Cc.y = ny; else Cc.stuck += dt;
      if (Cc.stuck > .5 || dH > 200) { const p = trailPoint(18); Cc.x = p.x; Cc.y = p.y; Cc.stuck = 0; }
      Cc.dir = dir4(dx, dy, Cc.dir);
      const trot = want > 50; Cc.mode = trot ? 'trot' : 'walk';
      Cc.ph = (Cc.ph + sp * dt / (trot ? 22 : 16)) % 1; Cc.t = 0;
      for (const f of nearFerns(Cc.x, Cc.y, 12)) f.bv += (f.x < Cc.x ? -1 : 1) * 16 * dt;
    } else {
      if (Cc.mode === 'walk' || Cc.mode === 'trot') { Cc.mode = (Cc.dir === 'l' || Cc.dir === 'r') && Math.random() < .45 ? 'sniff' : 'stand'; Cc.t = 0; }
      Cc.t += dt;
      if (Cc.mode === 'sniff' && Cc.t > 2.2) { Cc.mode = 'stand'; Cc.t = 0; }
      else if (Cc.mode === 'stand' && Cc.t > 1.6) { Cc.mode = 'sit'; Cc.t = 0; }
      else if (Cc.mode === 'sit' && Cc.t > 4 && H.idle > 4) { Cc.mode = Math.random() < .5 ? 'groom' : 'loaf'; Cc.t = 0; }
      else if (Cc.mode === 'groom' && Cc.t > 3.6) { Cc.mode = 'sit'; Cc.t = -3; }
    }
    if (Cc.ear > 0) Cc.ear -= dt;
    Cc.blinkT -= dt; if (Cc.blinkT <= 0) { Cc.blink = .16; Cc.blinkT = 2 + Math.random() * 4; } if (Cc.blink > 0) Cc.blink -= dt;
  }
  function catSprite() {
    const S = SPR.cat, d = S[Cc.dir];
    if (Cc.mode === 'walk') return d.walk[Math.floor(Cc.ph * CWALK) % CWALK];
    if (Cc.mode === 'trot') return d.trot[Math.floor(Cc.ph * CTROT) % CTROT];
    if (Cc.mode === 'sniff' && d.sniff.length) return d.sniff[Math.floor(time * 3) % d.sniff.length];
    if (Cc.mode === 'stand' || Cc.mode === 'sniff') return Cc.ear > 0 ? d.stand[2] : Cc.blink > 0 ? d.stand[1] : d.stand[[0, 2, 0, 3][(time * .9 | 0) % 4]];
    if (Cc.mode === 'groom') return S.groom[Math.floor(time * 3) % 4];
    if (Cc.mode === 'loaf') return Cc.ear > 0 ? S.loafPeek : S.loaf[(time * .9 | 0) % 2];
    if (Cc.ear > 0) return S.sitEar;
    if (Cc.blink > 0) return S.sit[4];
    return S.sit[[0, 1, 2, 3, 2, 1][(time * 1.4 | 0) % 6]];
  }

  /* ---------- 숲 동물 ---------- */
  function makeFauna() {
    const r = RNG(77), list = [], far = (x, y) => Math.hypot(x - H.x, y - H.y) > 220;
    const hides = W.hides.filter(h => far(h.x, h.y));
    for (let i = 0; i < 12 && hides.length; i++) { const h = hides[(r() * hides.length) | 0], x = h.x + (r() - .5) * 60, y = h.y + 10 + r() * 30; if (W.blocked(x, y, 3)) continue; list.push({ k: 'chip', x, y, f: r() < .5 ? 0 : 1, st: 'idle', t: r() * 2, ph: 0, home: h, anim: 'stand', look: 0 }); }
    const big = W.trees.filter(t => t.sp !== 'birch' && t.w > 34 && far(t.x, t.y));
    for (let i = 0; i < 8; i++) { const t = big[(r() * big.length) | 0], x = t.x + (r() - .5) * 80, y = t.y + 20 + r() * 30; if (W.blocked(x, y, 3)) continue; list.push({ k: 'sq', x, y, f: r() < .5 ? 0 : 1, st: 'ground', t: r() * 2, ph: 0, tree: t, h: 0, anim: 'stand', look: 0, calm: 0 }); }
    const per = W.perches.filter(p => far(p.x, p.y));
    for (const sp of ['tit', 'tit', 'tit', 'vtit', 'vtit', 'tit', 'vtit', 'sparrow', 'tit', 'vtit', 'tit', 'sparrow']) { const p = per[(r() * per.length) | 0]; if (p.taken) continue; p.taken = 1; list.push({ k: 'bird', sp, x: p.x, y: p.y, h: p.h, f: r() < .5 ? 0 : 1, st: 'perch', perch: p, t: r() * 2, ph: 0, pf: 0, song: 2 + r() * 6 }); }
    for (let i = 0; i < 7; i++) { const e = i < 4 ? W.LAY.clearing : W.LAY.glade, a = r() * TAU2, rr = Math.sqrt(r()) * .8; list.push({ k: 'bird', sp: 'sparrow', x: e.x + Math.cos(a) * e.rx * rr, y: e.y + Math.sin(a) * e.ry * rr, h: 0, f: r() < .5 ? 0 : 1, st: 'ground', t: r() * 2, ph: 0, pf: 0, song: 3 + r() * 6 }); }
    for (let i = 0; i < 2; i++) { const e = W.LAY.clearing; list.push({ k: 'bird', sp: 'magpie', x: e.x + (r() - .5) * 200, y: e.y + (r() - .5) * 120, h: 0, f: r() < .5 ? 0 : 1, st: 'ground', t: r() * 2, ph: 0, pf: 0, song: 5 + r() * 8 }); }
    for (let i = 0; i < 2; i++) { const t = big[(r() * big.length) | 0]; list.push({ k: 'pecker', tree: t, side: r() < .5 ? 'L' : 'R', h: 70 + r() * 90, t: r() * 3, ph: 0, st: 'cling', drum: 3 + r() * 6 }); }
    for (let i = 0; i < 12; i++) { const e = i < 6 ? W.LAY.clearing : i < 9 ? W.LAY.glade : null; let x, y; if (e) { x = e.x + (r() - .5) * e.rx * 1.4; y = e.y + (r() - .5) * e.ry * 1.4; } else { const p = W.stream.p[(r() * W.stream.p.length) | 0]; x = p[0]; y = p[1] - 30; } list.push({ k: 'bfly', x, y, z: 10, vx: 0, vy: 0, t: r() * 5, col: r() < .6 ? 0 : r() < .5 ? 1 : 2, hx: x, hy: y }); }
    return list;
  }
  function threat(c, rH, rC) {
    const k = H.mode === 'sneak' ? .65 : H.mode === 'idle' ? .8 : 1;
    const dh = Math.hypot(c.x - H.x, c.y - H.y) / (rH * k), dc = Math.hypot(c.x - Cc.x, c.y - Cc.y) / rC;
    return dh < dc ? { d: dh, x: H.x, y: H.y } : { d: dc, x: Cc.x, y: Cc.y };
  }
  function moveTo(c, tx, ty, sp, dt, r = 2.5) {
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy); if (d < 1) return 0;
    const s = Math.min(sp * dt, d), nx = c.x + dx / d * s, ny = c.y + dy / d * s;
    if (!W.blocked(nx, ny, r) || c.st === 'flee' || c.st === 'run') { c.x = nx; c.y = ny; } else { c.tx = c.x + (Math.random() - .5) * 40; c.ty = c.y + (Math.random() - .5) * 40; }
    if (Math.abs(dx) > .3) c.f = dx > 0 ? 0 : 1;
    return s;
  }
  function updChip(c, dt) {
    const th = threat(c, 125, 160); c.t -= dt;
    if (c.st === 'hidden') { if (c.t <= 0 && th.d > 1.7) { c.st = 'alert'; c.t = 1.5 + Math.random(); c.x = c.home.x + (Math.random() - .5) * 8; c.y = c.home.y + 4; } return; }
    if (th.d < .72 && c.st !== 'flee') {
      c.st = 'flee'; c.anim = 'hop'; events.push({ type: 'chip', x: c.x, y: c.y });
      let best = null, bd = 280; for (const h of W.hides) { const d = Math.hypot(h.x - c.x, h.y - c.y), away = (h.x - th.x) * (c.x - th.x) + (h.y - th.y) * (c.y - th.y); if (d < bd && away > -400) { bd = d; best = h; } }
      if (best) { c.home = best; c.tx = best.x; c.ty = best.y; } else { const a = Math.atan2(c.y - th.y, c.x - th.x); c.tx = c.x + Math.cos(a) * 160; c.ty = c.y + Math.sin(a) * 160; }
    }
    if (c.st === 'flee') { const s = moveTo(c, c.tx, c.ty, 150, dt); c.ph = (c.ph + s / 12) % 1; if (Math.hypot(c.tx - c.x, c.ty - c.y) < 4) { c.st = 'hidden'; c.t = 5 + Math.random() * 6; } return; }
    if (th.d < 1 && c.st !== 'alert') { c.st = 'alert'; c.t = 2 + Math.random() * 2; }
    if (c.st === 'alert') { c.anim = 'sit'; c.f = th.x > c.x ? 0 : 1; c.look = Math.random() < .02 ? 1 : c.look; if (c.t <= 0) { c.st = 'idle'; c.t = 1; } return; }
    if (c.st === 'move') { const s = moveTo(c, c.tx, c.ty, 64, dt); c.ph = (c.ph + s / 11) % 1; c.anim = 'hop'; if (s === 0 || Math.hypot(c.tx - c.x, c.ty - c.y) < 2 || c.t <= 0) { c.st = 'idle'; c.t = .3; } return; }
    if (c.t <= 0) {
      const r = Math.random();
      if (r < .32) { c.st = 'move'; const a = Math.random() * TAU2, d = 18 + Math.random() * 40; c.tx = clamp(c.x + Math.cos(a) * d, c.home.x - 110, c.home.x + 110); c.ty = clamp(c.y + Math.sin(a) * d, c.home.y - 80, c.home.y + 80); c.t = 2; }
      else { c.st = 'idle'; c.anim = r < .5 ? 'forage' : r < .66 ? 'nibble' : r < .76 ? 'groom' : r < .9 ? 'sit' : 'stand'; c.look = (Math.random() * 3) | 0; c.t = 1.2 + Math.random() * 2.6; }
    }
  }
  function updSq(c, dt) {
    const th = threat(c, 140, 175); c.t -= dt;
    const onTrunk = c.st === 'climb' || c.st === 'cling' || c.st === 'descend' || c.st === 'canopy';
    if (!onTrunk && th.d < .8 && c.st !== 'run') { c.st = 'run'; events.push({ type: 'sqchat', x: c.x, y: c.y }); const t2 = W.nearestTree(c.x, c.y, 260); if (t2) c.tree = t2; }
    if (c.st === 'run') { const T = c.tree, s = moveTo(c, T.x, T.y + 3, 135, dt, 1); c.ph = (c.ph + s / 16) % 1; c.anim = 'hop'; if (Math.hypot(T.x - c.x, T.y + 3 - c.y) < T.w * .5 + 3) { c.st = 'climb'; c.h = 2; c.ph = 0; } return; }
    if (c.st === 'climb') { const goal = th.d < .55 ? 560 : 80 + (c.calm || 0); c.h += 46 * dt; c.ph = (c.ph + dt * 3.6) % 1; if (c.h > 470) { c.st = 'canopy'; c.t = 10 + Math.random() * 12; } else if (c.h >= goal && th.d > .55) { c.st = 'cling'; c.t = 3 + Math.random() * 4; c.calm = 30 + Math.random() * 70; } return; }
    if (c.st === 'cling') { if (th.d < .5) { c.st = 'climb'; return; } if (c.t <= 0) { if (th.d > 1.5) c.st = 'descend'; else { c.t = 2 + Math.random() * 3; if (Math.random() < .5) events.push({ type: 'sqchat', x: c.tree.x, y: c.tree.y }); } } return; }
    if (c.st === 'canopy') { if (c.t <= 0 && th.d > 1.6) { c.st = 'descend'; c.h = 320; } return; }
    if (c.st === 'descend') { if (th.d < .7) { c.st = 'climb'; return; } c.h -= 32 * dt; c.ph = (c.ph + dt * 2.4) % 1; if (c.h <= 0) { c.h = 0; c.st = 'ground'; c.x = c.tree.x + (Math.random() < .5 ? -1 : 1) * (c.tree.w * .5 + 8); c.y = c.tree.y + 6; c.t = 1; c.anim = 'sit'; } return; }
    if (c.st === 'move') { const s = moveTo(c, c.tx, c.ty, 58, dt); c.ph = (c.ph + s / 15) % 1; c.anim = 'hop'; if (s === 0 || Math.hypot(c.tx - c.x, c.ty - c.y) < 2 || c.t <= 0) { c.st = 'ground'; c.t = .4; } return; }
    if (th.d < 1.15) { c.anim = 'sit'; c.f = th.x > c.x ? 0 : 1; return; }
    if (c.t <= 0) {
      const r = Math.random(), T = c.tree;
      if (r < .3) { c.st = 'move'; const a = Math.random() * TAU2, d = 20 + Math.random() * 50; c.tx = clamp(c.x + Math.cos(a) * d, T.x - 130, T.x + 130); c.ty = clamp(c.y + Math.sin(a) * d, T.y - 60, T.y + 110); c.t = 2.5; }
      else { c.st = 'ground'; c.anim = r < .5 ? 'forage' : r < .75 ? 'nibble' : r < .9 ? 'sit' : 'stand'; c.look = (Math.random() * 3) | 0; c.t = 1.5 + Math.random() * 3; }
    }
  }
  function flyTo(c, p) {
    c.fx0 = c.x; c.fy0 = c.y; c.fh0 = c.h; c.st = 'fly'; c.fp = 0;
    if (p) { c.perch = p; p.taken = 1; c.fx1 = p.x; c.fy1 = p.y; c.fh1 = p.h; }
    else { c.perch = null; const a = Math.random() * TAU2; c.fx1 = c.x + Math.cos(a) * 300; c.fy1 = c.y - 220 - Math.random() * 200; c.fh1 = 560; }
    c.fdur = Math.max(.8, Math.hypot(c.fx1 - c.fx0, c.fy1 - c.fy0) / 140); c.f = c.fx1 > c.fx0 ? 0 : 1;
  }
  function updBird(c, dt) {
    const mag = c.sp === 'magpie'; c.t -= dt; c.song -= dt;
    if (c.st === 'fly') {
      c.fp += dt / c.fdur; const t = Math.min(1, c.fp), e = t * t * (3 - 2 * t);
      c.x = lerp(c.fx0, c.fx1, e); c.y = lerp(c.fy0, c.fy1, e); c.h = lerp(c.fh0, c.fh1, e) + Math.sin(t * Math.PI) * 40; c.ph = (c.ph + dt * (mag ? 5 : 9)) % 1;
      if (t >= 1) { if (c.perch) { c.st = 'perch'; c.t = 1 + Math.random() * 2; } else { c.st = 'away'; c.t = 8 + Math.random() * 14; } }
      return;
    }
    if (c.st === 'away') {
      if (c.t <= 0) { const cands = W.perches.filter(p => !p.taken && Math.abs(p.x - cam.x - VW / 2) > VW * .6); const p = cands[(Math.random() * cands.length) | 0]; if (p) { c.x = p.x + (Math.random() - .5) * 300; c.y = p.y - 300; c.h = 420; flyTo(c, p); } else c.t = 5; }
      return;
    }
    const th = threat(c, c.st === 'ground' ? (mag ? 115 : 80) : 46 + Math.max(0, 120 - c.h) * .25, c.st === 'ground' ? 100 : 70);
    if (th.d < 1) {
      if (c.perch) c.perch.taken = 0;
      const cands = W.perches.filter(p => !p.taken && Math.hypot(p.x - c.x, p.y - c.y) > 170 && Math.hypot(p.x - c.x, p.y - c.y) < 520 && Math.hypot(p.x - H.x, p.y - H.y) > 140);
      flyTo(c, Math.random() < .75 && cands.length ? cands[(Math.random() * cands.length) | 0] : null);
      events.push({ type: 'flush', x: c.x, y: c.y }); return;
    }
    if (c.song <= 0) { c.song = (mag ? 6 : 3) + Math.random() * 7; events.push({ type: 'chirp', sp: c.sp, x: c.x, y: c.y }); c.sing = .55; }
    if (c.sing > 0) c.sing -= dt;
    if (c.st === 'perch') { if (c.t <= 0) { c.pf = [0, 0, 1, 2, 3][(Math.random() * 5) | 0]; c.t = .5 + Math.random() * 1.4; if (Math.random() < .2) c.f = 1 - c.f; } return; }
    if (c.hopT > 0) { c.hopT -= dt; c.ph = Math.min(.999, c.ph + dt * 4); const s = (mag ? 30 : 22) * dt * (c.f ? -1 : 1), nx = c.x + s; if (!W.blocked(nx, c.y, 2)) c.x = nx; return; }
    if (c.t <= 0) {
      const r = Math.random();
      if (r < .45) { c.hopT = .25; c.ph = 0; if (Math.random() < .35) c.f = 1 - c.f; c.gm = 'hop'; c.t = .3 + Math.random() * .4; }
      else if (r < .85) { c.gm = 'peck'; c.t = .8 + Math.random() * 1.2; c.ph = 0; }
      else { c.gm = 'look'; c.pf = (Math.random() * 4) | 0; c.t = .6 + Math.random(); }
    }
    if (c.gm === 'peck') c.ph = (c.ph + dt * 2.2) % 1;
  }
  function updPecker(c, dt) {
    c.t -= dt; c.drum -= dt;
    const T = c.tree, th = threat({ x: T.x, y: T.y }, 105, 120);
    if (c.st === 'fly') {
      c.fp += dt / c.fdur; const t = Math.min(1, c.fp), e = t * t * (3 - 2 * t);
      c.x = lerp(c.fx0, c.fx1, e); c.y = lerp(c.fy0, c.fy1, e); c.hh = lerp(c.fh0, c.fh1, e) + Math.sin(t * Math.PI) * 30; c.ph = (c.ph + dt * 8) % 1;
      if (t >= 1) { c.st = 'cling'; c.tree = c.nt; c.h = c.fh1; c.t = 1; }
      return;
    }
    if (th.d < 1) {
      const cands = W.trees.filter(t => t.sp !== 'birch' && t.w > 30 && Math.hypot(t.x - T.x, t.y - T.y) > 200 && Math.hypot(t.x - T.x, t.y - T.y) < 600 && Math.hypot(t.x - H.x, t.y - H.y) > 200);
      const nt = cands[(Math.random() * cands.length) | 0]; if (!nt) return;
      const sx = T.x + (c.side === 'L' ? -T.w / 2 : T.w / 2);
      c.fx0 = sx; c.fy0 = T.y; c.fh0 = c.h; c.nt = nt; c.side = Math.random() < .5 ? 'L' : 'R';
      c.fx1 = nt.x + (c.side === 'L' ? -nt.w / 2 : nt.w / 2); c.fy1 = nt.y; c.fh1 = 70 + Math.random() * 90; c.fp = 0; c.fdur = Math.hypot(c.fx1 - c.fx0, c.fy1 - c.fy0) / 150;
      c.st = 'fly'; c.f = c.fx1 > c.fx0 ? 0 : 1; events.push({ type: 'flush', x: sx, y: T.y }); return;
    }
    if (c.drum <= 0) { c.drum = 4 + Math.random() * 7; c.drumming = .9; events.push({ type: 'drum', x: T.x, y: T.y }); }
    if (c.drumming > 0) { c.drumming -= dt; c.ph = (c.ph + dt * 14) % 1; }
    else if (c.t <= 0) { c.t = 1.5 + Math.random() * 2.5; if (Math.random() < .4) c.h = Math.min(220, c.h + 6); c.ph = 0; }
  }
  function updBfly(c, dt) {
    c.t += dt;
    const d = Math.hypot(c.x - H.x, c.y - H.y) || 1;
    let ax = Math.sin(c.t * 1.3 + c.hx) * 40 + (c.hx - c.x) * .3, ay = Math.cos(c.t * 1.1 + c.hy) * 30 + (c.hy - c.y) * .3;
    if (d < 50) { ax += (c.x - H.x) / d * 160; ay += (c.y - H.y) / d * 160; }
    c.vx += (ax - c.vx) * dt * 2; c.vy += (ay - c.vy) * dt * 2; c.x += c.vx * dt; c.y += c.vy * dt; c.z = 12 + Math.sin(c.t * 2.3) * 5;
  }

  /* ---------- 갱신 ---------- */
  function update(dt) {
    time += dt;
    updHunter(dt); updCat(dt);
    events.length = 0;
    for (const c of fauna) { if (c.k === 'chip') updChip(c, dt); else if (c.k === 'sq') updSq(c, dt); else if (c.k === 'bird') updBird(c, dt); else if (c.k === 'pecker') updPecker(c, dt); else updBfly(c, dt); }
    const cx = cam.x + VW / 2, cy = cam.y + VH / 2;
    for (const e of events) {
      const d = Math.hypot(e.x - cx, e.y - cy), pan = (e.x - cx) / (VW * .6), vol = Math.max(0, 1 - d / 900);
      if (e.type === 'chirp') { SFX.chirp(e.sp, pan, vol); if (Math.hypot(e.x - Cc.x, e.y - Cc.y) < 260 && /sit|loaf|stand/.test(Cc.mode) && Math.random() < .7) Cc.ear = .4; }
      else if (e.type === 'chip') SFX.chip(pan, vol);
      else if (e.type === 'sqchat') SFX.chatter(pan, vol);
      else if (e.type === 'drum') SFX.drum(pan, vol);
      else if (e.type === 'flush') { SFX.flutter(pan, vol); if (/sit|loaf|stand/.test(Cc.mode)) Cc.ear = .5; }
    }
    SFX.setStream(1 - clamp((W.stream.dist(H.x, H.y) - 20) / 320, 0, 1));
    if (Math.random() < dt * .03) SFX.dove((Math.random() - .5) * 1.6, .5);
    for (const f of _ferns) { f.bv += (-f.bend * 24 - f.bv * 5.5) * dt; f.bend = clamp(f.bend + f.bv * dt, -1.6, 1.6); }
    const lx = H.dir === 'r' ? 40 : H.dir === 'l' ? -40 : 0, ly = H.dir === 'd' ? 28 : H.dir === 'u' ? -28 : 0;
    const tx = H.x + lx - VW / 2, ty = H.y - 34 + ly - VH / 2, k = 1 - Math.exp(-dt * 2.6);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; clampCam();
    if (leaves.length < 7 && Math.random() < dt * .8) leaves.push({ x: cam.x + Math.random() * VW, y: cam.y - 40 + Math.random() * VH * .3, h: 160 + Math.random() * 200, vx: -6 - Math.random() * 8, ph: Math.random() * 6, c: (Math.random() * 3) | 0, life: 0 });
    for (const l of leaves) { l.life += dt; if (l.h > 0) { l.h -= dt * (14 + Math.sin(l.ph + time * 3) * 6); l.x += (l.vx + Math.sin(time * 1.7 + l.ph) * 16) * dt; } }
    leaves = leaves.filter(l => l.life < 14 && l.x > cam.x - 100 && l.x < cam.x + VW + 100);
    if ((time * 2 | 0) % 6 === 0) W.trimChunks(90);
  }

  /* ---------- 그리기 ---------- */
  let c0x = 0, c0y = 0;
  const _list = [], _trees = [], _objs = [], _fl = [], _rects = [];
  function render() {
    c0x = Math.floor(cam.x); c0y = Math.floor(cam.y);
    const g = sg;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false;
    // 1) 땅
    const CH = W.CHK;
    for (let cy = Math.floor(c0y / CH); cy <= Math.floor((c0y + VH + 2) / CH); cy++) for (let cx = Math.floor(c0x / CH); cx <= Math.floor((c0x + VW + 2) / CH); cx++) {
      if (cx < 0 || cy < 0 || cx * CH >= W.WW || cy * CH >= W.WH) continue;
      g.drawImage(W.chunk(cx, cy).c, cx * CH - c0x, cy * CH - c0y);
    }
    prefetch();
    drawWater(g);
    // 2) 그림자: 발밑 타원, 햇빛 조각 안에서는 납작한 긴 그림자
    const hs = hunterSprite(), cs = catSprite();
    contact(g, H.x, H.y, 10, 3.4, .3); contact(g, Cc.x, Cc.y, Cc.mode === 'loaf' ? 8 : 7, 2.4, .28);
    const sunH = sunAmt(H.x, H.y), sunC = sunAmt(Cc.x, Cc.y);
    if (sunH > .05) castShadow(g, hs, HUNTER_OX, HUNTER_OY, H.x - c0x, H.y - c0y, .34 * sunH);
    if (sunC > .05) castShadow(g, cs, CAT_OX, CAT_OY, Cc.x - c0x, Cc.y - c0y, .32 * sunC);
    for (const c of fauna) {
      if ((c.k === 'chip' || c.k === 'sq') && c.st !== 'hidden' && !(c.h > 0)) contact(g, c.x, c.y, c.k === 'sq' ? 7 : 6, 2, .26);
      else if (c.k === 'bird' && c.st === 'ground') contact(g, c.x, c.y, c.sp === 'magpie' ? 8 : 4, 1.4, .24);
      else if (c.k === 'bird' && c.st === 'fly' && c.h < 300) contact(g, c.x - c.h * .3, c.y + c.h * .05, 4, 1.2, .12 * (1 - c.h / 300));
    }
    // 3) 깊이 순서대로: 줄기 밑동 · 아래층 식물 · 동물 · 사냥꾼 · 솔
    const x0 = c0x - 140, x1 = c0x + VW + 140, y0 = c0y - 20, y1 = c0y + VH + BASE + 40;
    _list.length = 0; _trees.length = 0; _objs.length = 0;
    W.treesIn(x0, y0, x1, c0y + VH + 1200, _trees);
    for (const t of _trees) if (t.y < y1) _list.push({ y: t.y, k: 0, o: t });
    W.inView(x0, y0, x1, c0y + VH + 160, _objs);
    _ferns = []; for (const o of _objs) { _list.push({ y: o.y, k: 1, o }); if (o.k === 'fern') _ferns.push(o); }
    for (const c of fauna) {
      if (c.k === 'chip') { if (c.st !== 'hidden') _list.push({ y: c.y, k: 2, o: c }); }
      else if (c.k === 'sq') { if (c.st === 'canopy') continue; _list.push({ y: c.h > 0 ? c.tree.y + .5 : c.y, k: 2, o: c }); }
      else if (c.k === 'bird') { if (c.st === 'perch') _list.push({ y: c.perch.y + .6, k: 2, o: c }); else if (c.st === 'ground') _list.push({ y: c.y, k: 2, o: c }); }
      else if (c.k === 'pecker' && c.st === 'cling') _list.push({ y: c.tree.y + .6, k: 2, o: c });
    }
    _list.push({ y: H.y, k: 3 }, { y: Cc.y, k: 4 });
    _list.sort((a, b) => a.y - b.y);
    // 줄기 뒤에 숨으면 줄기를 반투명하게
    for (const t of _trees) { const occ = (who, hh) => t.y > who.y + 1 && who.y - hh > t.y - 1400 && Math.abs(t.x - who.x) < t.w / 2 + 6; const want = occ(H, 30) || occ(Cc, 8) ? .4 : 1; t.fade += (want - t.fade) * .16; }
    let hDrawn = false, cDrawn = false, hOcc = false, cOcc = false;
    const hr = [H.x - 12, H.y - 66, H.x + 12, H.y], cr = [Cc.x - 10, Cc.y - 16, Cc.x + 10, Cc.y];
    _rects.length = 0;
    for (const it of _list) {
      const o = it.o;
      if (it.k === 0) drawTrunk(g, o);
      else if (it.k === 1) {
        let s;
        if (o.k === 'fern') { const w = Math.sin(time * 1.1 + o.x * .01 + o.ph) * .5; s = o.fr[clamp(Math.round(o.bend + w) + 1, 0, 2)]; }
        else if (o.k === 'tuft') { const w = Math.sin(time * 1.4 + o.x * .012 + o.ph); s = o.fr[w < -.4 ? 2 : w > .4 ? 1 : 0]; }
        else s = o.s;
        g.drawImage(s.c, Math.round(o.x - s.ox - c0x), Math.round(o.y - s.oy - c0y));
        if (hDrawn && !hOcc && o.k !== 'tuft' && o.k !== 'mush' && o.y > H.y && overlap(o, s, hr)) hOcc = true;
        if (cDrawn && !cOcc && o.k !== 'mush' && o.y > Cc.y && overlap(o, s, cr)) cOcc = true;
      }
      else if (it.k === 2) drawCritter(g, o);
      else if (it.k === 3) { g.drawImage(hs, Math.round(H.x - HUNTER_OX - c0x), Math.round(H.y - HUNTER_OY - c0y)); hDrawn = true; }
      else if (it.k === 4) { g.drawImage(cs, Math.round(Cc.x - CAT_OX - c0x), Math.round(Cc.y - CAT_OY - c0y)); cDrawn = true; }
    }
    // 가려진 사냥꾼 · 솔은 흐린 윤곽으로 한 번 더
    if (hOcc) { g.globalAlpha = .32; g.drawImage(hs, Math.round(H.x - HUNTER_OX - c0x), Math.round(H.y - HUNTER_OY - c0y)); g.globalAlpha = 1; }
    if (cOcc) { g.globalAlpha = .36; g.drawImage(cs, Math.round(Cc.x - CAT_OX - c0x), Math.round(Cc.y - CAT_OY - c0y)); g.globalAlpha = 1; }
    // 나는 것들
    for (const c of fauna) {
      if (c.k === 'bird' && c.st === 'fly') { const S = SPC.bird[c.sp], f = c.fp > .78 ? S.glide[0] : S.fly[Math.floor(c.ph * 4) % 4]; spr(g, f[c.f], c.x, c.y - c.h * VZ); }
      else if (c.k === 'pecker' && c.st === 'fly') spr(g, SPC.bird.pecker.fly[Math.floor(c.ph * 4) % 4][c.f], c.x, c.y - c.hh * VZ);
      else if (c.k === 'bfly') { const fr = SPC.bfly[c.col][Math.floor(c.t * 14) % 3]; g.drawImage(fr, Math.round(c.x - 7 - c0x), Math.round(c.y - c.z - 8 - c0y)); }
    }
    for (const l of leaves) drawLeaf(g, l);
    // 4) 빛: 그늘과 햇빛 조각을 평평하게 곱하기
    lightPass(g);
    // 5) 빛줄기 · 먼지 · 높은 가지 · 안개 · 앞쪽 고사리 · 테두리
    effects(g);
    if (joy.on) {
      const r = disp.getBoundingClientRect(), k = VW / r.width, sx = (joy.sx - r.left) * k, sy = (joy.sy - r.top) * k, R = 46 * k;
      g.strokeStyle = 'rgba(255,250,235,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy, R, 0, TAU2); g.stroke();
      g.fillStyle = 'rgba(255,250,235,.55)'; g.beginPath(); g.arc(sx + joy.x * R, sy + joy.y * R, R * .3, 0, TAU2); g.fill();
    }
    // 6) 화면으로: 정수배면 그대로, 아니면 정수배로 키운 뒤 부드럽게 줄임
    const fx = cam.x - c0x, fy = cam.y - c0y;
    if (SC === Math.round(SC)) { dg.imageSmoothingEnabled = false; dg.drawImage(scene, -fx * SC, -fy * SC, (VW + 2) * SC, (VH + 2) * SC); }
    else { mg.drawImage(scene, 0, 0, (VW + 2) * KI, (VH + 2) * KI); dg.imageSmoothingEnabled = true; dg.imageSmoothingQuality = 'high'; dg.drawImage(mid, -fx * SC, -fy * SC, (VW + 2) * SC, (VH + 2) * SC); }
  }
  const spr = (g, c, x, y, ox, oy) => g.drawImage(c, Math.round(x - (ox === undefined ? c.width >> 1 : ox) - c0x), Math.round(y - (oy === undefined ? c.height - 3 : oy) - c0y));
  function overlap(o, s, r) { const x = o.x - s.ox, y = o.y - s.oy; return x < r[2] && x + s.c.width > r[0] && y < r[3] && y + s.c.height > r[1] + 8; }
  function contact(g, x, y, rx, ry, a) { g.fillStyle = `rgba(30,22,14,${a})`; g.beginPath(); g.ellipse(Math.round(x - c0x), Math.round(y - c0y), rx, ry, 0, 0, TAU2); g.fill(); }
  function sunAmt(x, y) { return clamp((W.lightAt(x, y, time) - .55) / .3, 0, 1); }
  // 납작한 긴 그림자: 그림 실루엣을 서남서로 눕혀서
  function castShadow(g, c, ox, oy, x, y, a) {
    if (shC.width !== c.width || shC.height !== c.height) { shC.width = c.width; shC.height = c.height; } else shG.clearRect(0, 0, c.width, c.height);
    shG.globalCompositeOperation = 'source-over'; shG.drawImage(c, 0, 0); shG.globalCompositeOperation = 'source-in'; shG.fillStyle = '#20180e'; shG.fillRect(0, 0, c.width, c.height);
    const kx = 1.25, ky = .26;
    g.globalAlpha = a; g.setTransform(1, 0, kx, -ky, Math.round(x) - ox - kx * oy, Math.round(y) + ky * oy); g.drawImage(shC, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  }
  function prefetch() {
    const CH = W.CHK, ax = H.vx > 5 ? 1 : H.vx < -5 ? -1 : 0, ay = H.vy > 5 ? 1 : H.vy < -5 ? -1 : 0;
    const cx0 = Math.floor((cam.x + VW / 2 + ax * (VW / 2 + 200)) / CH), cy0 = Math.floor((cam.y + VH / 2 + ay * (VH / 2 + 200)) / CH);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) { const cx = cx0 + dx, cy = cy0 + dy; if (cx < 0 || cy < 0 || cx * CH >= W.WW || cy * CH >= W.WH) continue; if (!W.hasChunk(cx, cy)) { W.chunk(cx, cy); return; } }
  }
  // 줄기: 밑동 그림 + 위로 반복되는 무늬가 화면 위까지
  function drawTrunk(g, t) {
    const b = W.base(t), sh = W.shaft(t), bx = Math.round(t.x - c0x), by = Math.round(t.y - c0y);
    if (t.fade < .99) g.globalAlpha = t.fade;
    g.drawImage(b.c, bx - b.ox, by - b.oy);
    let y = by - BASE - sh.H + (t.ph % 8);   // 밑동 위에서 시작 (약간 겹침)
    const top = by - BASE + 4, xs = bx - (sh.W >> 1);
    g.drawImage(sh.c, 0, 0, sh.W, sh.H, xs, y + 4, sh.W, sh.H);
    for (y = y + 4 - sh.H; y > -sh.H; y -= sh.H) g.drawImage(sh.c, xs, y);
    g.globalAlpha = 1;
    // 빛 지도에서 줄기 기둥 전체를 그 자리 밝기 한 가지로 (밑동 뿌리 쪽만 땅빛을 받음)
    const yb = by - 14; if (yb > 0) _rects.push([xs, 0, sh.W, yb, t]);
  }
  function drawCritter(g, c) {
    if (c.k === 'chip' || c.k === 'sq') {
      if (c.h > 0) {   // 줄기 위의 청설모: 정면(등)으로 오르거나, 옆면, 머리를 아래로
        const T = c.tree, y = T.y - c.h * VZ;
        if (c.st === 'cling' || c.st === 'descend') { const f = SPC.sq.down[c.st === 'cling' ? ((time * 2.4) | 0) % 2 : ((c.ph * 4) | 0) % 2]; spr(g, f, T.x + 1, y, 17, 34); return; }
        const k = Math.floor(c.h / 46) % 3;
        if (k === 0) spr(g, SPC.sq.climb[Math.floor(c.ph * 4) % 4], T.x, y, 17, 34);
        else { const side = k === 1 ? 1 : -1, f = SPC.sq.side[Math.floor(c.ph * 4) % 4][side > 0 ? 1 : 0]; spr(g, f, T.x + side * (T.w / 2 + 6), y + 6, 22, 28); }
        return;
      }
      const S = SPC[c.k];
      let f;
      if (c.anim === 'hop') f = S.hop[Math.floor(c.ph * 6) % 6];
      else if (c.anim === 'sit') f = S.sit[c.look % 4 || 0];
      else if (c.anim === 'nibble') f = S.nibble[Math.floor(time * 6) % 4];
      else if (c.anim === 'forage') f = S.forage[Math.floor(time * 4) % 4];
      else if (c.anim === 'groom' && S.groom) f = S.groom[Math.floor(time * 5) % 2];
      else f = S.stand[[0, 1, 0, 2][Math.floor(time * 1.3) % 4]];
      const cv = f[c.f], oy = c.k === 'chip' ? 31 : 44;
      spr(g, cv, c.x, c.y, cv.width >> 1, oy);
    } else if (c.k === 'bird') {
      const S = SPC.bird[c.sp], oyy = c.sp === 'magpie' ? 37 : 21;
      if (c.st === 'perch') { const p = c.perch, fr = c.sing > 0 ? S.sing[0] : S.perch[c.pf]; spr(g, fr[c.f], p.x, p.y - c.h * VZ, fr[c.f].width >> 1, oyy); }
      else { const fr = c.hopT > 0 ? S.hop[Math.min(2, Math.floor(c.ph * 3))] : c.gm === 'peck' ? S.peck[Math.floor(c.ph * 3) % 3] : S.perch[c.pf || 0]; spr(g, fr[c.f], c.x, c.y, fr[c.f].width >> 1, oyy); }
    } else if (c.k === 'pecker') {
      const T = c.tree, side = c.side === 'L' ? -1 : 1, f = SPC.bird.pecker.cling[c.drumming > 0 ? 1 + (Math.floor(c.ph * 2) % 2) : (c.t < .3 ? 3 : 0)][side > 0 ? 1 : 0];
      spr(g, f, T.x + side * (T.w / 2 + 3), T.y - c.h * VZ, 17, 26);
    }
  }
  const LEAFC = ['#c8922e', '#9aa83a', '#d4702a'];
  function drawLeaf(g, l) {
    const x = Math.round(l.x - c0x), y = Math.round(l.y - l.h * VZ - c0y), s = Math.sin(l.ph + time * 4);
    g.globalAlpha = l.h <= 0 ? Math.max(0, 1 - (l.life - 8) / 4) : 1;
    g.fillStyle = INK; if (s > .3) g.fillRect(x - 1, y - 1, 5, 4); else if (s < -.3) g.fillRect(x - 1, y - 1, 4, 5); else g.fillRect(x - 1, y - 1, 5, 3);
    g.fillStyle = LEAFC[l.c]; if (s > .3) g.fillRect(x, y, 3, 2); else if (s < -.3) g.fillRect(x, y, 2, 3); else g.fillRect(x, y, 3, 1);
    g.globalAlpha = 1;
  }
  function drawWater(g) {
    const pts = W.stream.p; g.fillStyle = '#f2fbf8';
    for (let k = 0; k < pts.length; k += 2) {
      const p = pts[k], x = p[0] - c0x, y = p[1] - c0y; if (x < -30 || y < -30 || x > VW + 30 || y > VH + 30) continue;
      const q = pts[Math.min(pts.length - 1, k + 2)], a = Math.atan2(q[1] - p[1], q[0] - p[0]), sw = W.streamW(p[0], p[1]);
      const h = hash1(k * 3.1), ph = (time * (.35 + h * .4) + h * 9) % 1; if (ph > .5) continue;
      const off = (h - .5) * sw * 1.4, along = ph * 16;
      g.fillRect(Math.round(x - Math.sin(a) * off + Math.cos(a) * along), Math.round(y + Math.cos(a) * off + Math.sin(a) * along), ph < .25 ? 4 : 2, 1);
    }
  }
  function lightPass(g) {
    const LWc = lightC.width, LHc = lightC.height, ox = Math.floor(c0x / 2) * 2, oy = Math.floor(c0y / 2) * 2, lg = lgc, S = W.SG;
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.globalAlpha = 1; lg.imageSmoothingEnabled = false;
    // 세 단계 그늘 지도 (8px 칸 → 빛 캔버스에서는 4px)
    const sx = ox / S, sy = oy / S;
    lg.drawImage(W.shadeC, Math.floor(sx), Math.floor(sy), Math.ceil(LWc * 2 / S) + 2, Math.ceil(LHc * 2 / S) + 2, -(sx - Math.floor(sx)) * S / 2, -(sy - Math.floor(sy)) * S / 2, (Math.ceil(LWc * 2 / S) + 2) * S / 2, (Math.ceil(LHc * 2 / S) + 2) * S / 2);
    // 햇빛 조각: 바깥 반그늘 + 안쪽 햇빛 (경계가 또렷한 평평한 타원)
    _fl.length = 0; W.flecksIn(ox - 60, oy - 60, ox + LWc * 2 + 60, oy + LHc * 2 + 60, _fl);
    for (const f of _fl) {
      const r = f.r * (.86 + .14 * Math.sin(time * f.sp + f.ph)), x = (f.x - ox + Math.sin(time * .7 + f.ph) * 1.5) / 2, y = (f.y - oy) / 2;
      lg.fillStyle = '#bcc0ae'; lg.beginPath(); lg.ellipse(x, y, r * .8 + 1, r * .5 + 1, 0, 0, TAU2); for (const q of f.sub) { lg.moveTo(x + q[0] / 2 + q[2] * .8 + 1, y + q[1] / 2); lg.ellipse(x + q[0] / 2, y + q[1] / 2, q[2] * .8 + 1, q[2] * .5 + 1, 0, 0, TAU2); } lg.fill();
      lg.fillStyle = '#fff6e2'; lg.beginPath(); lg.ellipse(x, y, r * .6, r * .36, 0, 0, TAU2); for (const q of f.sub) { lg.moveTo(x + q[0] / 2 + q[2] * .6, y + q[1] / 2); lg.ellipse(x + q[0] / 2, y + q[1] / 2, q[2] * .6, q[2] * .36, 0, 0, TAU2); } lg.fill();
    }
    // 줄기 위쪽: 일정한 그늘 + 오른쪽(해 쪽) 가장자리 빛
    for (const [x, y, w, h, t] of _rects) {
      const X = (x + c0x - ox) / 2, Y = (y + c0y - oy) / 2;
      if (t.lt === undefined) t.lt = clamp(W.openAt(t.x, t.y) * 1.25, 0, 1);
      const L = t.lt, c = (a, b) => Math.round(a + (b - a) * L);
      lg.fillStyle = `rgb(${c(128, 236)},${c(138, 230)},${c(134, 210)})`; lg.fillRect(X, Y, w / 2, h / 2);
      lg.fillStyle = `rgb(${c(214, 255)},${c(206, 246)},${c(184, 224)})`; lg.fillRect(X + w * .36, Y, Math.max(1, w * .12), h / 2);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'multiply'; g.imageSmoothingEnabled = false;
    g.drawImage(lightC, ox - c0x, oy - c0y, LWc * 2, LHc * 2);
    // 큰 햇빛 조각에 따뜻한 빛
    g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,230,180,.09)';
    for (const f of _fl) { if (f.r < 12) continue; const r = f.r * (.86 + .14 * Math.sin(time * f.sp + f.ph)); g.beginPath(); g.ellipse(Math.round(f.x - c0x), Math.round(f.y - c0y), r * 1.2, r * .74, 0, 0, TAU2); g.fill(); }
    g.globalCompositeOperation = 'source-over';
  }
  function effects(g) {
    // 빛줄기: 평평한 띠 두 겹 (해가 있는 오른쪽 위로)
    g.globalCompositeOperation = 'screen';
    for (const b of W.beams) {
      const x = b.x - c0x, y = b.y - c0y; if (x < -900 || x > VW + 200 || y < -200 || y > VH + 700) continue;
      const pulse = .7 + .3 * Math.sin(time * .35 + b.ph), L = 900, dx = .7 * L, dy = -.71 * L;
      for (const [w, a] of [[b.w, .05], [b.w * .45, .06]]) {
        g.fillStyle = `rgba(255,236,190,${a * pulse})`;
        g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.lineTo(x + w / 2 + dx, y + dy); g.lineTo(x - w / 2 + dx, y + dy); g.closePath(); g.fill();
      }
      g.fillStyle = 'rgba(255,248,224,.8)';
      for (let k = 0; k < 9; k++) {
        const h = hash1(b.x * .1 + k * 1.37), u = (time * (.012 + h * .02) + h) % 1, dist = u * 560, side = (hash1(k * 9.1 + b.y) - .5) * b.w * .7;
        g.globalAlpha = Math.sin(u * Math.PI) * pulse; g.fillRect(Math.round(x + .7 * dist + side + Math.sin(time * .8 + k) * 3), Math.round(y - .71 * dist), 1, 1);
      }
      g.globalAlpha = 1;
    }
    // 안개 (부드럽게, 아주 옅게)
    g.imageSmoothingEnabled = true;
    for (const m of W.mists) {
      const xx = ((m.x + Math.sin(time * .05 + m.y) * 30 + time * m.sp * .5 - c0x + 600) % (W.WW + 1200) + (W.WW + 1200)) % (W.WW + 1200) - 600, y = m.y - c0y;
      if (xx < -m.w || xx > VW + m.w || y < -m.h || y > VH + m.h) continue;
      g.globalAlpha = m.a; g.drawImage(W.mistTex, xx - m.w / 2, y - m.h / 2, m.w, m.h);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false;
    // 높은 가지와 잎 (그늘 색 그대로)
    const hx = H.x - c0x, hy = H.y - c0y, kx = Cc.x - c0x, ky = Cc.y - c0y;
    for (const t of _trees) for (const b of t.br) {
      const sp = W.branches[b.i][b.side > 0 ? 0 : 1], x = Math.round(t.x - c0x + b.side * (t.w / 2 - 2)), y = Math.round(t.y - c0y - b.h);
      if (y < -110 || y > VH + 60 || x < -260 || x > VW + 260) continue;
      // 사냥꾼이나 솔을 가리면 반투명하게
      const L = x - sp.ox, T = y - sp.oy, Rr = L + sp.c.width, B = T + sp.c.height;
      const hide = (hx + 12 > L && hx - 12 < Rr && hy > T + 10 && hy - 66 < B - 10) || (kx + 10 > L && kx - 10 < Rr && ky > T + 10 && ky - 16 < B - 10);
      b.fade = (b.fade === undefined ? 1 : b.fade) + ((hide ? .32 : 1) - (b.fade === undefined ? 1 : b.fade)) * .15;
      const a = Math.min(b.fade, t.fade < .99 ? Math.min(1, t.fade + .2) : 1);
      if (a < .99) g.globalAlpha = a;
      g.drawImage(sp.c, L, T); g.globalAlpha = 1;
    }
    // 앞쪽 고사리 실루엣 (화면 아래 가장자리, 땅보다 빠르게 지나감)
    const P = 1.32;
    for (const f of W.fgs) {
      const s = W.fgFerns[f.i], sx = ((f.x - cam.x * P) % (VW + 600) + VW + 600) % (VW + 600) - 300, sy = ((f.y - cam.y * P) % (VH + 900) + VH + 900) % (VH + 900) - 300;
      if (sy < VH - 60 || sy > VH + 200) continue;
      if (f.f < 0) { g.save(); g.translate(Math.round(sx), 0); g.scale(-1, 1); g.drawImage(s.c, -s.ox, Math.round(sy - s.oy)); g.restore(); }
      else g.drawImage(s.c, Math.round(sx - s.ox), Math.round(sy - s.oy));
    }
    g.drawImage(vign, 0, 0);
  }

  function loop(ts) {
    const dt = Math.min(.05, Math.max(0, (ts - last) / 1000 || 0)); last = ts;
    if (ready) { update(dt); render(); }
    requestAnimationFrame(loop);
  }
  return {
    init, start() { started = true; SFX.init(); },
    get state() { return { H, Cc, cam, fauna, time, VW, VH, SC }; },
    clock() { const m = 6 * 60 + 40 + Math.floor(time / 6); return `오전 ${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; },
    keys, get W() { return W; },
  };
})();
