'use strict';
/* =========================================================
   아침 숲 걷기 데모: 사냥꾼 조작 · 고양이 따라오기 · 카메라 · 그리기
   화면 내부 해상도는 짧은 변 360픽셀 (가로 화면이면 640×360)
   ========================================================= */
const FG = (() => {
  let Wd, fauna, scene, sg, disp, dg, VW = 640, VH = 360, K = 1, SCALE = 1, last = 0, time = 0, started = false;
  const keys = {}, joy = { on: false, x: 0, y: 0, m: 0, sx: 0, sy: 0, cx: 0, cy: 0, id: -1 };
  const H = { x: 0, y: 0, dir: 'd', moving: false, ph: 0, idle: 0, blinkT: 3, blink: 0, stepF: 0, trail: [] };
  const Cc = { x: 0, y: 0, dir: 'd', mode: 'sit', ph: 0, t: 0, spot: null, ear: 0, stuck: 0, tail: 0, blinkT: 2, blink: 0 };
  const cam = { x: 0, y: 0 };
  let vign = null, events = [];

  function init(canvas) {
    disp = canvas; dg = disp.getContext('2d');
    bakeSprites(); bakeFauna();
    Wd = genWorld(7); fauna = makeFauna(Wd);
    H.x = WORLD.start[0]; H.y = WORLD.start[1];
    Cc.x = H.x + 20; Cc.y = H.y + 6;
    for (let i = 0; i < 60; i++) H.trail.push({ x: H.x, y: H.y + i * .5 });
    resize(); cam.x = H.x - VW / 2; cam.y = H.y - 24 - VH / 2; clampCam();
    addEventListener('resize', resize);
    addEventListener('keydown', e => { const k = keyName(e); if (k) { keys[k] = true; if (k !== 'shift') e.preventDefault(); } });
    addEventListener('keyup', e => { const k = keyName(e); if (k) keys[k] = false; });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; joy.on = false; });
    disp.addEventListener('pointerdown', pdown); addEventListener('pointermove', pmove); addEventListener('pointerup', pup); addEventListener('pointercancel', pup);
    requestAnimationFrame(loop);
  }
  function keyName(e) {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') return 'left'; if (k === 'ArrowRight' || k === 'd' || k === 'D') return 'right';
    if (k === 'ArrowUp' || k === 'w' || k === 'W') return 'up'; if (k === 'ArrowDown' || k === 's' || k === 'S') return 'down';
    if (k === 'Shift') return 'shift'; return null;
  }
  // 손가락으로 누른 곳이 조이스틱 중심
  function pdown(e) { if (joy.on) return; joy.on = true; joy.id = e.pointerId; joy.sx = e.clientX; joy.sy = e.clientY; joy.x = joy.y = joy.m = 0; try { disp.setPointerCapture(e.pointerId); } catch (_) { } }
  function pmove(e) { if (!joy.on || e.pointerId !== joy.id) return; const R = 42, dx = e.clientX - joy.sx, dy = e.clientY - joy.sy, d = Math.hypot(dx, dy); joy.m = Math.min(1, d / R); joy.x = d > 4 ? dx / d * joy.m : 0; joy.y = d > 4 ? dy / d * joy.m : 0; }
  function pup(e) { if (e.pointerId !== joy.id) return; joy.on = false; joy.x = joy.y = joy.m = 0; }

  function resize() {
    const vw = Math.max(1, innerWidth), vh = Math.max(1, innerHeight), asp = vw / vh;
    if (asp >= 1) { VH = 360; VW = Math.round(Math.min(760, 360 * asp)); } else { VW = 360; VH = Math.round(Math.min(760, 360 / asp)); }
    SCALE = Math.min(vw / VW, vh / VH); K = Math.max(1, Math.min(4, Math.ceil(SCALE * (devicePixelRatio || 1))));
    if (!scene) { scene = document.createElement('canvas'); }
    scene.width = VW + 2; scene.height = VH + 2; sg = scene.getContext('2d'); sg.imageSmoothingEnabled = false;
    disp.width = VW * K; disp.height = VH * K; disp.style.width = (VW * SCALE) + 'px'; disp.style.height = (VH * SCALE) + 'px';
    dg.imageSmoothingEnabled = false;
    vign = makeVignette();
  }
  // 아침 햇살 색 보정: 왼쪽 위는 따뜻하게, 가장자리는 살짝 어둡게
  function makeVignette() {
    const [c, g] = makeCanvas(VW, VH);
    let gr = g.createRadialGradient(VW * .15, -VH * .1, 10, VW * .15, -VH * .1, Math.max(VW, VH) * .9);
    gr.addColorStop(0, 'rgba(255,236,180,0.20)'); gr.addColorStop(.5, 'rgba(255,236,180,0.06)'); gr.addColorStop(1, 'rgba(255,236,180,0)');
    g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    gr = g.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .45, VW / 2, VH / 2, Math.max(VW, VH) * .75);
    gr.addColorStop(0, 'rgba(20,40,30,0)'); gr.addColorStop(1, 'rgba(20,40,30,0.28)');
    g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    return c;
  }
  function clampCam() { cam.x = Math.max(0, Math.min(WW - VW, cam.x)); cam.y = Math.max(0, Math.min(WH - VH, cam.y)); }

  /* ---------- 사냥꾼 ---------- */
  function updHunter(dt) {
    let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + joy.x, iy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + joy.y;
    const m = Math.min(1, Math.hypot(ix, iy));
    if (m > .18) {
      const n = Math.hypot(ix, iy), nx = ix / n, ny = iy / n, slow = keys.shift || (joy.on && joy.m < .6);
      const sp = (slow ? 32 : 62) * (joy.on ? Math.max(.55, m) : 1);
      const ox = H.x, oy = H.y;
      if (!Wd.blocked(H.x + nx * sp * dt, H.y, 5)) H.x += nx * sp * dt;
      if (!Wd.blocked(H.x, H.y + ny * sp * dt, 5)) H.y += ny * sp * dt;
      const moved = Math.hypot(H.x - ox, H.y - oy);
      H.dir = Math.abs(nx) > Math.abs(ny) * .9 ? (nx > 0 ? 'r' : 'l') : (ny > 0 ? 'd' : 'u');
      H.moving = moved > .01;
      const before = H.ph; H.ph = (H.ph + moved / 30) % 1;
      if ((before < .25 && H.ph >= .25) || (before < .75 && H.ph >= .75) || (H.ph < before && before < .75)) {
        const t = Wd.terrAt(H.x, H.y); SFX.step(t === TER.PATH ? 'path' : t === TER.BRIDGE ? 'bridge' : 'grass');
      }
      const L = H.trail[0]; if (!L || Math.hypot(L.x - H.x, L.y - H.y) > 2) { H.trail.unshift({ x: H.x, y: H.y }); if (H.trail.length > 240) H.trail.pop(); }
      H.idle = 0;
    } else { H.moving = false; H.idle += dt; }
    H.blinkT -= dt; if (H.blinkT <= 0) { H.blink = .13; H.blinkT = 2.5 + Math.random() * 3; } if (H.blink > 0) H.blink -= dt;
  }
  function hunterSprite() {
    const set = SPR.hunter[H.dir];
    if (H.moving) return set.walk[Math.floor(H.ph * 8) % 8];
    if (H.blink > 0) return set.idle[2];
    return set.idle[(time * 1.1 | 0) % 2];
  }

  /* ---------- 고양이: 발자국을 따라오다 멈추면 옆에 앉고, 오래 서 있으면 그루밍 → 식빵 ---------- */
  function trailPoint(dist) {
    let acc = 0, prev = { x: H.x, y: H.y };
    for (const p of H.trail) { const d = Math.hypot(p.x - prev.x, p.y - prev.y); if (acc + d >= dist) { const t = (dist - acc) / (d || 1); return { x: prev.x + (p.x - prev.x) * t, y: prev.y + (p.y - prev.y) * t }; } acc += d; prev = p; }
    return prev;
  }
  function updCat(dt) {
    const dH = Math.hypot(Cc.x - H.x, Cc.y - H.y);
    let tx, ty, want = 0;
    if (H.moving || H.idle < .5) {
      const p = trailPoint(28); tx = p.x; ty = p.y; Cc.spot = null;
      const dd = Math.hypot(tx - Cc.x, ty - Cc.y);
      want = dd > 34 ? 96 : dd > 6 ? 64 : 0;
    } else {
      if (!Cc.spot) {   // 옆자리 고르기 (사냥꾼이 보는 쪽 반대편 옆)
        const sides = [[20, 7], [-20, 7], [16, 12], [-16, 12]];
        sides.sort((a, b) => Math.hypot(H.x + a[0] - Cc.x, H.y + a[1] - Cc.y) - Math.hypot(H.x + b[0] - Cc.x, H.y + b[1] - Cc.y));
        Cc.spot = sides.map(s => ({ x: H.x + s[0], y: H.y + s[1] })).find(s => !Wd.blocked(s.x, s.y, 3)) || { x: Cc.x, y: Cc.y };
      }
      tx = Cc.spot.x; ty = Cc.spot.y;
      const dd = Math.hypot(tx - Cc.x, ty - Cc.y); want = dd > 3 ? 46 : 0;
    }
    if (want > 0) {
      const dx = tx - Cc.x, dy = ty - Cc.y, dd = Math.hypot(dx, dy) || 1, sp = Math.min(want, dd / dt);
      const nx = Cc.x + dx / dd * sp * dt, ny = Cc.y + dy / dd * sp * dt;
      if (!Wd.blocked(nx, ny, 3)) { Cc.x = nx; Cc.y = ny; Cc.stuck = 0; }
      else if (!Wd.blocked(nx, Cc.y, 3)) Cc.x = nx; else if (!Wd.blocked(Cc.x, ny, 3)) Cc.y = ny; else Cc.stuck += dt;
      if (Cc.stuck > .6 || dH > 150) { const p = trailPoint(14); Cc.x = p.x; Cc.y = p.y; Cc.stuck = 0; }
      Cc.dir = Math.abs(dx) > Math.abs(dy) * .8 ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
      Cc.mode = want > 70 ? 'trot' : 'walk'; Cc.ph = (Cc.ph + sp * dt / (want > 70 ? 22 : 16)) % 1; Cc.t = 0;
    } else {
      if (Cc.mode === 'walk' || Cc.mode === 'trot') { Cc.mode = 'sit'; Cc.t = 0; }
      Cc.t += dt;
      if (Cc.mode === 'sit' && Cc.t > 3.2 && H.idle > 3) { Cc.mode = Math.random() < .55 ? 'groom' : 'loaf'; Cc.t = 0; }
      else if (Cc.mode === 'groom' && Cc.t > 2.6) { Cc.mode = 'sit2'; Cc.t = 0; }
      else if (Cc.mode === 'sit2' && Cc.t > 1.6) { Cc.mode = 'loaf'; Cc.t = 0; }
    }
    if (Cc.ear > 0) Cc.ear -= dt;
    Cc.blinkT -= dt; if (Cc.blinkT <= 0) { Cc.blink = .15; Cc.blinkT = 2 + Math.random() * 4; } if (Cc.blink > 0) Cc.blink -= dt;
  }
  function catSprite() {
    const S = SPR.cat;
    if (Cc.mode === 'walk') return S[Cc.dir].walk[Math.floor(Cc.ph * 8) % 8];
    if (Cc.mode === 'trot') return S[Cc.dir].trot[Math.floor(Cc.ph * 6) % 6];
    if (Cc.mode === 'groom') return S.groom[(time * 3 | 0) % 2];
    if (Cc.mode === 'loaf') return Cc.ear > 0 ? S.loafPeek : S.loaf[(time * .9 | 0) % 2];
    if (Cc.ear > 0) return S.sitEar;
    if (Cc.blink > 0) return S.sit[3];
    return S.sit[(time * 1.3 | 0) % 3];
  }

  /* ---------- 갱신 ---------- */
  function update(dt) {
    time += dt;
    updHunter(dt); updCat(dt);
    events.length = 0;
    updFauna(fauna, dt, Wd, [{ x: H.x, y: H.y, fear: 0 }, { x: Cc.x, y: Cc.y, fear: -26 }], events);
    for (const e of events) {
      const cx = cam.x + VW / 2, cy = cam.y + VH / 2, d = Math.hypot(e.x - cx, e.y - cy);
      if (e.type === 'chirp') {
        SFX.chirp(e.sp, (e.x - cx) / (VW * .6), Math.max(0, 1 - d / 520));
        if (Math.hypot(e.x - Cc.x, e.y - Cc.y) < 240 && (Cc.mode === 'sit' || Cc.mode === 'sit2' || Cc.mode === 'loaf') && Math.random() < .6) Cc.ear = .35;
      }
    }
    // 개울 소리: 가장 가까운 물까지 거리
    let md = 1e9; for (let k = 0; k < Wd.stream.length; k += 8) { const p = Wd.stream[k], d = Math.hypot(p[0] - H.x, p[1] - H.y); if (d < md) md = d; }
    SFX.setStream(1 - Math.min(1, Math.max(0, (md - 20) / 260)));
    const lx = H.dir === 'r' ? 22 : H.dir === 'l' ? -22 : 0, ly = H.dir === 'd' ? 16 : H.dir === 'u' ? -16 : 0;
    const tx = H.x + lx - VW / 2, ty = H.y - 26 + ly - VH / 2, k = 1 - Math.exp(-dt * 3.2);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; clampCam();
  }

  /* ---------- 그리기 ---------- */
  function drawSpr(c, wx, wy, ox, oy, a) {
    const x = Math.round(wx - cam0x - ox), y = Math.round(wy - cam0y - oy);
    if (x > VW + 2 || y > VH + 2 || x + c.width < 0 || y + c.height < 0) return;
    if (a !== undefined) { sg.globalAlpha = a; sg.drawImage(c, x, y); sg.globalAlpha = 1; } else sg.drawImage(c, x, y);
  }
  let cam0x = 0, cam0y = 0;
  function shadow(wx, wy, rx, ry) { sg.fillStyle = 'rgba(30,52,30,0.30)'; sg.beginPath(); sg.ellipse(Math.round(wx - cam0x), Math.round(wy - cam0y), rx, ry, 0, 0, TAU); sg.fill(); }
  function render() {
    cam0x = Math.floor(cam.x); cam0y = Math.floor(cam.y);
    sg.drawImage(Wd.ground, cam0x, cam0y, VW + 2, VH + 2, 0, 0, VW + 2, VH + 2);
    // 물 반짝임 · 풀잎 이슬
    sg.fillStyle = '#eaf8ff';
    for (let k = 0; k < Wd.stream.length; k += 5) {
      const p = Wd.stream[k], x = p[0] - cam0x, y = p[1] - cam0y; if (x < -20 || y < -20 || x > VW + 20 || y > VH + 20) continue;
      const h = hash1(k * 1.7), ph = (time * (.6 + h * .5) + h * 7) % 1; if (ph > .5) continue;
      const q = Wd.stream[Math.min(Wd.stream.length - 1, k + 3)], a = Math.atan2(q[1] - p[1], q[0] - p[0]), off = (h - .5) * p[2] * .6, along = ph * 10;
      sg.fillRect(Math.round(x - Math.sin(a) * off + Math.cos(a) * along), Math.round(y + Math.cos(a) * off + Math.sin(a) * along), ph < .25 ? 2 : 1, 1);
    }
    sg.fillStyle = '#fbfff0';
    for (let k = 0; k < 46; k++) {
      const slot = Math.floor(time * .8 + k * .37), h1 = hash2(k, slot), h2 = hash2(slot, k + 9);
      const wx = cam0x + h1 * VW, wy = cam0y + h2 * VH; if (Wd.terrAt(wx, wy) !== TER.GRASS) continue;
      const ph = (time * .8 + k * .37) % 1, x = Math.round(wx - cam0x), y = Math.round(wy - cam0y);
      if (ph < .45) { sg.fillRect(x, y, 1, 1); if (ph > .15 && ph < .3) { sg.fillRect(x - 1, y, 1, 1); sg.fillRect(x + 1, y, 1, 1); sg.fillRect(x, y - 1, 1, 1); sg.fillRect(x, y + 1, 1, 1); } }
    }
    // 그림자 (움직이는 것들)
    shadow(H.x + 1, H.y, 11, 3.4); shadow(Cc.x, Cc.y, Cc.mode === 'loaf' ? 7 : 6, 2);
    for (const c of fauna) { if (c.k === 'chip' && c.st !== 'hidden') shadow(c.x, c.y, 4, 1.4); else if (c.k === 'sq' && (c.st === 'ground' || c.st === 'run')) shadow(c.x, c.y, 5, 1.6); else if (c.k === 'bird' && c.st === 'ground') shadow(c.x, c.y, 3, 1); }
    // 깊이 순서대로 (발 위치 y)
    const list = [], vx0 = cam0x - 60, vx1 = cam0x + VW + 60, vy0 = cam0y - 20, vy1 = cam0y + VH + 130;
    const inView = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;
    for (const t of Wd.trees) if (inView(t.x, t.y)) list.push({ y: t.y, o: t, k: 'tree' });
    for (const o of Wd.objs) if (inView(o.x, o.y)) list.push({ y: o.y, o, k: 'obj' });
    for (const o of Wd.deco) if (inView(o.x, o.y)) list.push({ y: o.y - 2, o, k: 'deco' });
    for (const c of fauna) {
      if (c.k === 'chip') { if (c.st !== 'hidden' && inView(c.x, c.y)) list.push({ y: c.y, o: c, k: 'chip' }); }
      else if (c.k === 'sq') { if (c.st === 'canopy') continue; const onT = c.st === 'trunk' || c.st === 'up' || c.st === 'down'; const y = onT ? c.tree.y + .5 : c.y; if (inView(onT ? c.tree.x : c.x, y)) list.push({ y, o: c, k: 'sq' }); }
      else if (c.k === 'bird') { if (c.st === 'perch' && c.tree) { if (inView(c.tree.x, c.tree.y)) list.push({ y: c.tree.y + .6, o: c, k: 'bird' }); } else if (c.st === 'ground' && inView(c.x, c.y)) list.push({ y: c.y, o: c, k: 'bird' }); }
    }
    list.push({ y: H.y, k: 'hunter' }); list.push({ y: Cc.y, k: 'cat' });
    list.sort((a, b) => a.y - b.y);
    const hx0 = H.x - 14, hx1 = H.x + 14, hy0 = H.y - 66, hy1 = H.y;
    for (const it of list) {
      const o = it.o;
      if (it.k === 'tree') {
        const sp = o.sp, cr = sp.crown;
        const behind = (H.y < o.y - 2 && hx1 > o.x + cr[0] && hx0 < o.x + cr[0] + cr[2] && hy0 < o.y + cr[1] + cr[3] && hy1 > o.y + cr[1]) || (Cc.y < o.y - 2 && Math.abs(Cc.x - o.x) < cr[2] / 2 && Cc.y > o.y + cr[1] && Cc.y < o.y + cr[1] + cr[3] + 20);
        o.fade = (o.fade || 1) + ((behind ? .5 : 1) - (o.fade || 1)) * .15;
        drawSpr(sp.c, o.x, o.y, sp.ox, sp.oy, o.fade < .99 ? o.fade : undefined);
      } else if (it.k === 'obj') drawSpr(o.sp.c, o.x, o.y, o.sp.ox, o.sp.oy);
      else if (it.k === 'deco') { const sp = o.t === 'grass' ? o.sp[(Math.sin(time * 1.6 + o.ph) * 1.4 + 1.4 | 0) % 3] : o.sp; drawSpr(sp.c, o.x, o.y, sp.ox, sp.oy); }
      else if (it.k === 'chip') drawSpr(SP.chip[o.f][o.dir], o.x, o.y, 11, 14);
      else if (it.k === 'sq') {
        if (o.st === 'trunk' || o.st === 'up' || o.st === 'down') { const fr = o.st === 'trunk' ? SP.sq.up[0] : (o.st === 'up' ? SP.sq.up : SP.sq.down)[(o.ph * 10 | 0) % 2]; const c = o.side < 0 ? fr : mirrorCache(fr); drawSpr(c, o.tree.x + o.side * 3.5, o.tree.y - 12 - o.h, 12, 14); }
        else drawSpr(SP.sq[o.f === 'sit' ? 'sit' : o.f][o.dir], o.x, o.y, 14, 21);
      } else if (it.k === 'bird') drawSpr(SP.bird[o.sp][o.f][o.dir], o.x, o.y, o.sp === 'magpie' ? 15 : 9, 13);
      else if (it.k === 'hunter') drawSpr(hunterSprite(), H.x, H.y, HUNTER_OX, HUNTER_OY);
      else if (it.k === 'cat') drawSpr(catSprite(), Cc.x, Cc.y, CAT_OX, CAT_OY);
    }
    // 하늘을 나는 것들
    for (const c of fauna) {
      if (c.k === 'bird' && c.st === 'fly') drawSpr(SP.bird[c.sp][c.f][c.dir], c.x, c.y, c.sp === 'magpie' ? 15 : 9, 13);
      else if (c.k === 'bfly') drawSpr(SP.bfly[c.f], c.x, c.y - c.z, 4, 6);
    }
    // 아침 햇살 기둥 · 안개 · 색 보정
    sg.save(); sg.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const w = 26 + (i % 2) * 24, b = mod(i * 230 + time * 3 - cam.x * .25, VW + 420) - 260;
      sg.fillStyle = `rgba(110,96,48,${i % 2 ? .09 : .065})`;
      sg.beginPath(); sg.moveTo(b, -2); sg.lineTo(b + w, -2); sg.lineTo(b + w + VH * .55, VH + 2); sg.lineTo(b + VH * .55, VH + 2); sg.closePath(); sg.fill();
    }
    sg.restore();
    for (let k = 0; k < Wd.stream.length; k += 60) {
      const p = Wd.stream[k], x = p[0] - cam0x + Math.sin(time * .15 + k) * 18, y = p[1] - cam0y + 6; if (x < -90 || y < -60 || x > VW + 90 || y > VH + 60) continue;
      const gr = sg.createRadialGradient(x, y, 4, x, y, 70); gr.addColorStop(0, 'rgba(240,248,240,0.16)'); gr.addColorStop(1, 'rgba(240,248,240,0)');
      sg.fillStyle = gr; sg.fillRect(x - 72, y - 40, 144, 80);
    }
    sg.drawImage(vign, 0, 0);
    // 조이스틱
    if (joy.on) {
      const r = disp.getBoundingClientRect(), sx = (joy.sx - r.left) / SCALE, sy = (joy.sy - r.top) / SCALE;
      sg.strokeStyle = 'rgba(255,250,235,.55)'; sg.lineWidth = 1; sg.beginPath(); sg.arc(sx, sy, 42 / SCALE, 0, TAU); sg.stroke();
      sg.fillStyle = 'rgba(255,250,235,.6)'; sg.beginPath(); sg.arc(sx + joy.x * 42 / SCALE, sy + joy.y * 42 / SCALE, 12 / SCALE, 0, TAU); sg.fill();
    }
    // 화면으로 (정수배 확대 + 카메라 소수점 이동)
    const fx = cam.x - cam0x, fy = cam.y - cam0y;
    dg.drawImage(scene, 0, 0, VW + 2, VH + 2, -fx * K, -fy * K, (VW + 2) * K, (VH + 2) * K);
  }
  const _mc = new Map();
  function mirrorCache(c) { let m = _mc.get(c); if (!m) { m = mirrorCanvas(c); _mc.set(c, m); } return m; }

  function loop(ts) {
    const dt = Math.min(.05, Math.max(0, (ts - last) / 1000 || 0)); last = ts;
    update(dt); render();
    requestAnimationFrame(loop);
  }
  return {
    init, start() { started = true; SFX.init(); },
    get state() { return { H, Cc, cam, fauna, time, started, VW, VH }; },
    clock() { const m = 6 * 60 + 40 + Math.floor(time / 6); return `오전 ${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; },
    keys,
  };
})();
