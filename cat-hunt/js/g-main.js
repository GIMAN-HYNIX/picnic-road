'use strict';
/* =========================================================
   그리기 · 화면 표시 · 한 프레임
   화면 위 표시는 왼쪽 위 한 줄(체력 10칸 · 비 세기 · 솔의 기분)뿐. 가방은 열 때와 주울 때만 보임
   ========================================================= */
const GFX = { rain: [], fog: null, vig: null }, CAMV = { x: 0, y: 0, lx: 0, ly: 0 };
function gfxInit() {
  for (const [n, len, a] of [[70, 5, .5], [170, 9, .55], [430, 13, .6]]) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const q = c.getContext('2d'), r = RNG(n); q.fillStyle = '#b4cae4';
    for (let i = 0; i < n; i++) { const x = r() * 256, y = r() * 256, L = len * (.6 + r() * .8); q.globalAlpha = a * (.5 + r() * .5); for (let k = 0; k < L; k++) q.fillRect((Math.round(x - k * .3) + 256) % 256, Math.round(y + k) % 256, 1, 1); }
    GFX.rain.push(c);
  }
  const pb = new PB(256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const v = fbm(x / 64, y / 64, 5, 3, 4, 4); pb.d[y * 256 + x] = rgb2u(196, 212, 214, v > .62 ? 72 : v > .54 ? 46 : v > .47 ? 22 : 0); } GFX.fog = pb.canvas();
  const vc = document.createElement('canvas'); vc.width = 240; vc.height = 136; const vg = vc.getContext('2d'), gr = vg.createRadialGradient(120, 68, 40, 120, 68, 150); gr.addColorStop(0, 'rgba(10,14,24,0)'); gr.addColorStop(.6, 'rgba(10,14,24,.1)'); gr.addColorStop(1, 'rgba(10,14,24,.46)'); vg.fillStyle = gr; vg.fillRect(0, 0, 240, 136); GFX.vig = vc;
}
function camUpdate(dt, snap) {
  let tx = PL.x, ty = PL.y - 44, lx = PL.vx * .22, ly = PL.vy * .22;
  if (PL.st === 'aim') { lx = Math.cos(PL.aimA) * 90; ly = Math.sin(PL.aimA) * 60; }   // 겨누는 쪽을 더 보여 줌
  if (PL.st === 'camp' || PL.st === 'tent' || PL.st === 'pack') { tx = CAMP.x + 10; ty = CAMP.y - 34; lx = ly = 0; }
  CAMV.lx += (lx - CAMV.lx) * Math.min(1, dt * 3); CAMV.ly += (ly - CAMV.ly) * Math.min(1, dt * 3);
  const gx = tx + CAMV.lx - V.w / 2, gy = ty + CAMV.ly - V.h / 2, k = snap ? 1 : 1 - Math.exp(-dt * 9);
  CAMV.x += (gx - CAMV.x) * k; CAMV.y += (gy - CAMV.y) * k;
  V.shake *= Math.exp(-dt * 14); if (V.shake < .3) V.shake = 0; V.sx = (Math.random() - .5) * 2 * V.shake; V.sy = (Math.random() - .5) * 2 * V.shake;
  const ke = Math.exp(-dt * 16); V.kx *= ke; V.ky *= ke; if (Math.hypot(V.kx, V.ky) < .4) V.kx = V.ky = 0;   // 베는 쪽으로 밀렸다 돌아옴
  CAM.x = Math.round(clamp(CAMV.x, 0, Math.max(0, WORLD.WW - V.w)) + V.sx + V.kx); CAM.y = Math.round(clamp(CAMV.y, 0, Math.max(0, WORLD.WH - V.h)) + V.sy + V.ky);
}
function gUpdate(dt) {
  const p = IN.p; V.time += dt; wxUpdate(dt);
  if (p.mute) say(GSFX.toggle() ? '소리 켬' : '소리 끔', 1.2);
  if (p.bag) { UI.open = !UI.open; UI.sel = -1; } for (let i = 0; i < 10; i++) if (p['n' + i]) { UI.open = true; UI.sel = (i + 9) % 10; }
  if (p.esc) UI.open = false;
  if (p.f2) { PL.ammo = 8; say('총알을 채웠어요. (시험용)'); } if (p.f4) { WX.target = (WX.target + 1) % 3; WX.t = 0; say(['안개비', '보슬비', '장대비'][WX.target] + ' (시험용)'); }
  if (p.f6) { DBG.intact = true; say('다음 사냥에서 온전한 냄비가 나와요. (시험용)'); } if (p.f7) { bagAdd('shroom'); UI.bag = 2; }
  if (p.f3) { const f = FOES.find(q => !q.live && q.st !== 'dissolve') || FOES[0], a = DIRA[PL.dir], n = WORLD.nearestOpen(PL.x + Math.cos(a) * 170, PL.y + Math.sin(a) * 130, true) || [PL.x + 150, PL.y]; f.x = n[0]; f.y = n[1]; f.hp = f.mhp; f.stag = 0; f.re = 0; f.aware = 0; f.st = 'emerge'; f.t = 0; f.tx = f.x; f.ty = f.y; f.hx = f.x; f.hy = f.y; say('물그림자를 불렀어요. (시험용)'); }
  if (p.sol && PL.st !== 'camp' && PL.st !== 'down' && PL.st !== 'tent') solCommand();
  pUpdate(dt); solUpdate(dt); for (const f of FOES) foeUpdate(f, dt); globsUpdate(dt); birdsUpdate(dt);
  for (const it of GITEMS) { it.t += dt; if (it.z > 0 || it.vz > 0) { it.vz -= 520 * dt; it.z += it.vz * dt; if (it.z <= 0) { it.z = 0; it.vz = 0; } } }
  for (const f of WORLD.forage) if (f.re > 0) { f.re -= dt; if (f.re <= 0) f.n = f.t === 'berry' ? 3 : 1; }
  gParts(dt);
  for (let i = 0; i < 4; i++) if (Math.random() < WX.lv * .5 + .1) ring(CAM.x + Math.random() * V.w, CAM.y + Math.random() * V.h, 2 + Math.random() * 3, .24, '#9ab4d4');
  if (MSG.t > 0) MSG.t -= dt; if (MSG.ht > 0) MSG.ht -= dt; if (UI.bag > 0) UI.bag -= dt;
  let bd = 1e9; for (let i = 0; i < WORLD.BROOK.length; i++) bd = Math.min(bd, Math.hypot(WORLD.BROOK[i][0] - PL.x, WORLD.BROOK[i][1] - PL.y)); GSFX.brook(1 - bd / 420);
  if (PL.kills === 0 && PL.st === 'move' && V.time > 3) hint('move', 'WASD로 걸어요. Shift를 누르면 달려요. 젖은 길을 따라 동쪽으로 가 봐요.', 8);
}

/* ---------- 그리기 ---------- */
function drawWorld() {
  const g = V.g, cx = CAM.x, cy = CAM.y;
  for (let j = Math.floor(cy / 256); j <= Math.floor((cy + V.h) / 256); j++) for (let i = Math.floor(cx / 256); i <= Math.floor((cx + V.w) / 256); i++) if (i >= 0 && j >= 0 && i < WORLD.WW / 256 && j < Math.ceil(WORLD.WH / 256)) g.drawImage(WORLD.chunk(i, j), i * 256 - cx, j * 256 - cy);
  // 개울 물결
  g.fillStyle = 'rgba(140,180,200,.5)'; const B = WORLD.BROOK;
  for (let k = 0; k < B.length - 1; k++) { const a = B[k], b = B[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L; if (Math.min(a[1], b[1]) > cy + V.h + 40 || Math.max(a[1], b[1]) < cy - 40) continue; for (let n = 0; n < L / 22; n++) { const t = (n * 22 + V.time * 26 + hash1(k * 9 + n) * 22) % L, w = (hash1(n * 3.3 + k) - .5) * 24; g.fillRect(Math.round(a[0] + ux * t - uy * w - cx), Math.round(a[1] + uy * t + ux * w - cy), 1, 3); } }
  for (const d of DECALS) gEll(d.x, d.y, d.r, d.r * .45, `rgba(28,44,62,${(.42 * (1 - d.t / d.life)).toFixed(2)})`);
  for (const f of FOES) if (f.st === 'dormant' && f.re <= 0 || f.st === 'sink') {   // 웅덩이 속에서 반쯤 감은 눈
    const u = (V.time * .5 + f.hx * .01) % 1; gRingPx(f.hx, f.hy, 8 + u * 18, (8 + u * 18) * .4, `rgba(150,190,214,${(.5 * (1 - u)).toFixed(2)})`);
    if ((V.time + f.hx) % 5 < 3.4) { g.fillStyle = 'rgba(210,236,250,.75)'; g.fillRect(Math.round(f.hx - 5 - cx), Math.round(f.hy - 1 - cy), 3, 1); g.fillRect(Math.round(f.hx + 2 - cx), Math.round(f.hy - 1 - cy), 3, 1); }
  }
  for (const b of GLOBS) { const u = b.t / b.T; gEll(b.x1, b.y1, 6 + u * 22, (6 + u * 22) * .42, 'rgba(18,30,46,.38)'); gRingPx(b.x1, b.y1, 30, 12.6, 'rgba(170,205,230,.5)'); }
  for (const pt of PARTS) if (pt.k === 'ring') { const u = pt.t / pt.life, r = pt.r * (.4 + .6 * u); gRingPx(pt.x, pt.y, r, r * .45, pt.c + (u < .5 ? 'cc' : '66')); }
  // 밑그림자
  if (PL.st !== 'down' || PL.t < .6) gEll(PL.x, PL.y + 1, 20, 5, 'rgba(14,12,20,.34)'); else gEll(PL.x + 40 * (PL.dir === 'l' ? -1 : 1), PL.y + 2, 44, 6, 'rgba(14,12,20,.34)');
  if (SO.mode === 'free' && !SO.hidden) gEll(SO.x, SO.y + 1, 11 - SO.z * .12, 3, 'rgba(14,12,20,.34)');
  for (const f of FOES) if (f.live || f.st === 'dissolve' || f.st === 'emerge') gEll(f.x, f.y + 1, 17 * f.k, 5 * f.k, 'rgba(14,20,34,.34)');
  for (const it of GITEMS) gEll(it.x, it.y + 1, 6, 2, 'rgba(14,12,20,.3)');
  for (const b of BIRDS) if (b.st !== 'away' && b.z < 90) gEll(b.x, b.y + 1, 3, 1, 'rgba(14,12,20,.3)');
  // 앞뒤 순서대로
  const L = [], S = WORLD.SP, vx0 = cx - 130, vx1 = cx + V.w + 130, vy0 = cy - 40, vy1 = cy + V.h + 300;
  WORLD.near(cx + V.w / 2, cy + V.h / 2 + 130, Math.max(V.w, V.h) / 2 + 330, p => {
    if (p.x < vx0 || p.x > vx1 || p.y < vy0 || p.y > vy1) return;
    if (CAMP.on || CAMP.building) { if ((p.t === 'fern' || p.t === 'bush' || p.t === 'reed' || p.t === 'shroom') && Math.abs(p.x - CAMP.x) < 96 && p.y > CAMP.y - 110 && p.y < CAMP.y + 70) return; }
    L.push(p);
  });
  const E = [];
  E.push({ y: PL.y, f: drawMan });
  if (SO.mode === 'free' && !SO.hidden) E.push({ y: SO.y, f: () => gDraw(solSpr(SO.pose, SO.fr, SO.flip, SO.o), SO.x, SO.y - SO.z) });
  for (const f of FOES) if (f.live || f.st === 'dissolve' || f.st === 'emerge' || f.st === 'sink') E.push({ y: f.y, f: () => drawFoe(f) });
  for (const it of GITEMS) E.push({ y: it.y, f: () => { const s = S.item[it.k]; gDraw(s, it.x, it.y - it.z - (it.z > 0 ? 0 : Math.round(Math.sin(V.time * 3 + it.x) * 1))); if ((V.time * 1.3 + it.x) % 1 < .15) { g.fillStyle = '#fff6d0'; g.fillRect(Math.round(it.x + 4 - cx), Math.round(it.y - 14 - cy), 1, 3); g.fillRect(Math.round(it.x + 3 - cx), Math.round(it.y - 13 - cy), 3, 1); } } });
  for (const b of BIRDS) if (b.st !== 'away') E.push({ y: b.y, f: () => { const s = S.bird[b.k]; if (b.flip) { g.save(); g.translate(Math.round(b.x - cx), 0); g.scale(-1, 1); g.drawImage(s.c, -s.ox, Math.round(b.y - b.z - cy) - s.oy); g.restore(); } else gDraw(s, b.x, b.y - b.z); } });
  if (CAMP.on || CAMP.building) {
    E.push({ y: CAMP.y, f: () => { const s = S.tent; if (CAMP.building) { const u = clamp(PL.t / 2.4, 0, 1), h = Math.round(s.h * u); g.drawImage(s.c, 0, s.h - h, s.w, h, Math.round(CAMP.x - cx) - s.ox, Math.round(CAMP.y - cy) - s.oy + s.h - h, s.w, h); } else gDraw(s, CAMP.x, CAMP.y); } });
    if (CAMP.on) { E.push({ y: CAMP.fy, f: () => gDraw(S.fire[1 + Math.floor(V.time * 9) % 3], CAMP.fx, CAMP.fy) }); E.push({ y: CAMP.seatY - 2, f: () => gDraw(S.seat, CAMP.seatX + 4, CAMP.seatY + 4) }); }
  }
  for (const b of GLOBS) { const u = b.t / b.T, x = lerp(b.x0, b.x1, u), y = lerp(b.y0, b.y1, u) - Math.sin(u * Math.PI) * 70; E.push({ y: lerp(b.y0, b.y1, u) + 20, f: () => { gEll(x, y, 6, 6, '#6a9cc0'); gEll(x - 1, y - 2, 3, 2, '#c4e2f4'); } }); }
  for (const p of L) E.push({ y: p.y, p });
  E.sort((a, b) => a.y - b.y);
  const dtc = Math.exp(-V.dt * 3.2);
  for (const e of E) {
    if (e.f) { e.f(); continue; }
    const p = e.p; let s;
    if (p.t === 'fern') { p.bv *= dtc; s = S.fern[p.v][1 + clamp(Math.round(p.bv), -1, 1)]; }
    else if (p.t === 'berry') s = S.berry[clamp(p.n, 0, 3)];
    else if (p.t === 'shroom') { if (p.n <= 0) continue; s = S.shroom; }
    else s = Array.isArray(S[p.t]) ? S[p.t][p.v] : S[p.t];
    if (!s) continue;
    let al = 1;
    if (p.t === 'tree' || p.t === 'sap') { const beh = q => p.y > q.y && p.y - q.y < s.h - 30 && Math.abs(p.x - q.x) < (p.t === 'tree' ? WORLD.TR[p.v] + 14 : 26); p.fa = lerp(p.fa == null ? 1 : p.fa, beh(PL) || (SO.mode === 'free' && beh(SO)) || FOES.some(f => f.live && beh(f)) ? .4 : 1, Math.min(1, V.dt * 8)); al = p.fa; }
    if (p.flip) { g.save(); g.translate(Math.round(p.x - cx), 0); g.scale(-1, 1); g.drawImage(s.c, -s.ox, Math.round(p.y - cy) - s.oy); g.restore(); } else gDraw(s, p.x, p.y, al);
  }
}
function drawMan() {
  if (PL.inv > 0 && PL.st !== 'hit' && PL.st !== 'down' && Math.floor(V.time * 14) % 2) return;
  const s = pSprite(), bob = PL.st === 'aim' && Math.hypot(PL.vx, PL.vy) > 8 && Math.floor(PL.ph * 4) % 2 ? 1 : 0;
  for (let i = GHOSTS.length - 1; i >= 0; i--) { const q = GHOSTS[i]; if (V.hitstop <= 0) q.t += V.dt; if (q.t > .14) { GHOSTS.splice(i, 1); continue; } V.g.globalAlpha = .34 * (1 - q.t / .14); V.g.drawImage(gWhite(q.s), Math.round(q.x - CAM.x) - q.s.ox, Math.round(q.y - CAM.y) - q.s.oy); V.g.globalAlpha = 1; }
  gDraw(s, PL.x, PL.y + bob);
  if (PL.hurtT > .38) { V.g.globalAlpha = .7; V.g.drawImage(gWhite(s), Math.round(PL.x - CAM.x) - s.ox, Math.round(PL.y - CAM.y) - s.oy); V.g.globalAlpha = 1; }
}
function drawFoe(f) {
  const st = f.st, t = f.t; let a = 'idle', fr = Math.floor(V.time * 4 + f.hx) % 4, jx = 0;
  if (st === 'emerge') { a = 'emerge'; fr = Math.min(4, Math.floor(t * 5)); } else if (st === 'sink') { a = 'emerge'; fr = Math.max(0, 4 - Math.floor(t / .6 * 5)); }
  else if (st === 'wander') { if (f.idle <= 0) { a = 'move'; fr = Math.floor(V.time * 5) % 6; } } else if (st === 'chase' || st === 'return') { a = 'move'; fr = Math.floor(V.time * 9) % 6; }
  else if (st === 'windup') { a = 'windup'; fr = Math.min(2, Math.floor(t / .62 * 3)); jx = t > .4 ? (Math.floor(V.time * 30) % 2 ? 1 : -1) : 0; } else if (st === 'lunge') { a = 'lunge'; fr = t > .13 ? 1 : 0; }
  else if (st === 'recover') { a = 'recover'; fr = t > .4 ? 1 : 0; } else if (st === 'spit') { a = 'spit'; fr = t < .3 ? 0 : t < .55 ? 1 : 2; }
  else if (st === 'hit') { a = 'hit'; fr = 0; } else if (st === 'stagger') { a = 'stagger'; fr = Math.floor(V.time * 9) % 4; } else if (st === 'pause') jx = Math.floor(V.time * 24) % 2 ? 1 : -1;
  else if (st === 'dissolve') { a = 'dissolve'; fr = Math.min(4, Math.floor(t / .6 * 5)); }
  if (V.hitstop > 0 && f.flash > 0) jx += Math.floor(V.hitstop * 60) % 2 ? 2 : -2;   // 멈춘 동안 부르르 떪
  const s = foeSpr(a, fr, f.flip, f.k), g = V.g, x = Math.round(f.x + jx - CAM.x) - s.ox, y = Math.round(f.y - CAM.y) - s.oy;
  if (f.sq > 0) {   // 맞으면 납작하게 눌렸다가 펴짐 (발밑 기준)
    const q = f.sq, w = Math.round(s.w * (1 + q * .26)), h = Math.round(s.h * (1 - q * .22)), X = Math.round(f.x + jx - CAM.x - s.ox * w / s.w), Y = Math.round(f.y - CAM.y - s.oy * h / s.h);
    g.globalAlpha = .9; g.drawImage(s.c, X, Y, w, h); g.globalAlpha = 1; if (f.flash > 0) { g.globalAlpha = .85; g.drawImage(gWhite(s), X, Y, w, h); g.globalAlpha = 1; }
  } else { g.globalAlpha = .9; g.drawImage(s.c, x, y); g.globalAlpha = 1; if (f.flash > 0) { g.globalAlpha = .85; g.drawImage(gWhite(s), x, y); g.globalAlpha = 1; } }
  if (st === 'notice') gText('!', f.x - CAM.x, f.y - CAM.y - 52 * f.k, { f: F11B, c: '#fff2b0', sh: '#1c1618', al: 'center' });
  else if (st === 'pause') gText('?', f.x - CAM.x, f.y - CAM.y - 52 * f.k, { f: F11B, c: '#c4e2f4', sh: '#1c1618', al: 'center' });
}
function drawFx() {
  const g = V.g, cx = CAM.x, cy = CAM.y;
  for (const pt of PARTS) {
    const u = pt.t / pt.life, x = Math.round(pt.x - cx), y = Math.round(pt.y - pt.z - cy);
    if (pt.k === 'drop') { g.fillStyle = pt.c; g.fillRect(x, y, 2, u > .6 ? 1 : 2); }
    else if (pt.k === 'smoke') { g.globalAlpha = .5 * (1 - u); g.fillStyle = '#d8dce0'; const s = Math.round(pt.s * (1 + u * 2)); g.fillRect(x - (s >> 1), y - (s >> 1), s, s); g.globalAlpha = 1; }
    else if (pt.k === 'arc') {   // 칼이 지나간 자리
      // 방랑자를 따라다니는 초승달 꼴 궤적: 칼끝 쪽이 두껍고 꼬리로 갈수록 가늘어지며 뒤에서부터 사라짐
      const px = Math.round(PL.x - cx), py = Math.round(PL.y - 38 - cy), ez = v => 1 - (1 - v) * (1 - v), hd = ez(clamp(pt.t / pt.sw, 0, 1)), tl = ez(clamp((pt.t - pt.sw * .5) / (pt.life - pt.sw * .5), 0, 1)), fade = 1 - tl * .5;
      if (pt.c === 2) {   // 찌르기: 앞으로 뻗는 창 모양
        const ca = Math.cos(pt.a), sa = Math.sin(pt.a) * .85, r0 = 16, r1 = r0 + (pt.reach + 6) * hd, rs = r0 + (r1 - r0) * tl;
        for (let r = rs; r <= r1; r += 1) { const ld = (r - rs) / Math.max(1, r1 - rs), w = 1 + 8 * Math.sin(Math.min(1, ld * 1.08) * Math.PI * .86), X = px + ca * r, Y = py + sa * r; g.globalAlpha = .55 * fade; g.fillStyle = '#b4dcf6'; g.fillRect(Math.round(X - w / 2), Math.round(Y - w / 2), Math.ceil(w), Math.ceil(w)); if (w > 3) { g.globalAlpha = fade; g.fillStyle = '#ffffff'; g.fillRect(Math.round(X - w / 4), Math.round(Y - w / 4), Math.ceil(w / 2), Math.ceil(w / 2)); } }
        if (hd >= 1 && tl < .6) { g.globalAlpha = 1 - tl; gRingPx(PL.x + ca * r1, PL.y - 38 + sa * r1, 5 + tl * 16, (5 + tl * 16) * .8, '#ffffff'); }
      } else {
        const dir = pt.c === 1 ? -1 : 1, span = 2.7, a0 = pt.a - span / 2 * dir, R = pt.reach - 4, n = 72;
        for (let i = Math.floor(tl * n); i <= hd * n; i++) {
          const q = i / n, a = a0 + span * dir * q, ld = (q - tl) / Math.max(.02, hd - tl), w = 1 + 12 * Math.pow(ld, 1.4) * (.35 + .65 * Math.sin(q * Math.PI)), ca = Math.cos(a), sa = Math.sin(a) * .8;
          g.globalAlpha = .5 * fade; g.fillStyle = '#b4dcf6'; for (let r = R - w; r < R - 2; r += 1.5) g.fillRect(Math.round(px + ca * r), Math.round(py + sa * r), 2, 2);
          g.globalAlpha = fade; g.fillStyle = '#ffffff'; for (let r = R - Math.min(w, 3.5); r <= R; r += 1) g.fillRect(Math.round(px + ca * r), Math.round(py + sa * r), 2, 2);
        }
      }
      g.globalAlpha = 1;
    } else if (pt.k === 'spark') {   // 맞은 자리의 별 모양 불꽃
      const r0 = pt.r * u * .95, r1 = pt.r * (.4 + u * .7), s = u < .45 ? 2 : 1; g.fillStyle = u < .5 ? '#ffffff' : '#d4ecfa';
      for (let i = 0; i < pt.n; i++) { const a = pt.a + i * TAU / pt.n, L = i % 2 ? .62 : 1, ca = Math.cos(a), sa = Math.sin(a) * .85; for (let r = r0 * L; r <= r1 * L; r += 1.5) g.fillRect(Math.round(x + ca * r), Math.round(y + sa * r), s, s); }
      if (u < .3) { const c = Math.round(pt.r * .3 * (1 - u * 2)); g.fillRect(x - c, y - c, c * 2, c * 2); }
    } else if (pt.k === 'cut') {   // 베인 금
      const L = pt.r * Math.min(1, u * 5), ca = Math.cos(pt.a), sa = Math.sin(pt.a) * .85, w = u < .35 ? 3 : u < .7 ? 2 : 1; g.fillStyle = '#ffffff'; g.globalAlpha = u < .6 ? 1 : 1 - (u - .6) * 2;
      for (let r = -L; r <= L; r += 1) { const th = Math.max(1, Math.round(w * (1 - Math.abs(r) / (pt.r + 1)))); g.fillRect(Math.round(x + ca * r - th / 2), Math.round(y + sa * r - th / 2), th, th); }
      g.globalAlpha = 1;
    } else if (pt.k === 'tracer') { g.globalAlpha = 1 - u; g.strokeStyle = '#fff6c8'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + .5, y + .5); g.lineTo(Math.round(pt.x2 - cx) + .5, Math.round(pt.y2 - cy) + .5); g.stroke(); g.globalAlpha = 1; }
    else if (pt.k === 'flash') { g.fillStyle = u < .5 ? '#fffbe0' : '#ffc860'; for (let i = 0; i < 9; i++) { const w = 7 - Math.abs(i - 3) * 1.4; g.fillRect(Math.round(x + Math.cos(pt.a) * i * 2.4 - w / 2), Math.round(y + Math.sin(pt.a) * i * 2.4 - w / 2), Math.max(1, Math.round(w)), Math.max(1, Math.round(w))); } }
  }
  if (PL.st === 'aim') {   // 조준선: 탄착이 퍼지는 범위. 숨을 다 고르면 한 줄로 모임
    const oy = PL.kneel ? 64 : 84, sp = (lerp(7, .6, PL.steady) + (Math.hypot(PL.vx, PL.vy) > 8 ? 4 : 0)) * Math.PI / 180, full = PL.steady >= .9 && PL.bolt <= 0;
    g.fillStyle = PL.bolt > 0 ? 'rgba(255,255,255,.18)' : full ? 'rgba(255,246,200,.8)' : 'rgba(255,255,255,.42)';
    for (const da of full ? [0] : [-sp, sp]) for (let d = 46; d < 330; d += 5) g.fillRect(Math.round(PL.x + Math.cos(PL.aimA + da) * d - cx), Math.round(PL.y - oy + Math.sin(PL.aimA + da) * d - cy), 1, 1);
    if (PL.lock && PL.lock.live) { const f = PL.lock, x = Math.round(f.x - cx), y = Math.round(f.y - 16 * f.k - cy), r = Math.round(22 * f.k); g.fillStyle = 'rgba(255,246,200,.9)'; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.fillRect(x + sx * r - (sx > 0 ? 4 : 0), y + sy * r, 5, 1); g.fillRect(x + sx * r, y + sy * r - (sy > 0 ? 4 : 0), 1, 5); } }
  }
}
function drawSky() {
  const g = V.g, lv = WX.lv, t = V.time;
  for (let L = 0; L < 3; L++) { const a = clamp(L === 0 ? 1 - lv * .25 : L === 1 ? lv : lv - 1, 0, 1); if (a <= 0) continue; g.globalAlpha = a; const ox = ((-CAM.x * .3 - t * (30 + L * 14)) % 256 + 256) % 256, oy = ((t * (380 + L * 90) - CAM.y * .3) % 256 + 256) % 256; for (let y = oy - 256; y < V.h; y += 256) for (let x = ox - 256; x < V.w; x += 256) g.drawImage(GFX.rain[L], Math.round(x), Math.round(y)); }
  g.globalAlpha = clamp(.62 - lv * .16, .2, .7);
  for (const [sp, sc, ph] of [[7, 2, 0], [-4, 3, 97]]) { const T = 256 * sc, ox = ((-CAM.x - t * sp + ph) % T + T) % T, oy = ((-CAM.y - t * sp * .3 + ph) % T + T) % T; for (let y = -oy; y < V.h; y += T) for (let x = -ox; x < V.w; x += T) g.drawImage(GFX.fog, Math.round(x), Math.round(y), T, T); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'multiply';
  const c = lv < 1 ? mix('#e8edf4', '#d6dceb', lv) : mix('#d6dceb', '#a8b2cc', lv - 1); g.fillStyle = c; g.fillRect(0, 0, V.w, V.h);
  g.globalCompositeOperation = 'source-over';
  if (CAMP.on) { const x = CAMP.fx - CAM.x, y = CAMP.fy - 10 - CAM.y, fl = .85 + Math.sin(t * 13) * .06 + Math.sin(t * 7.3) * .05; g.globalCompositeOperation = 'lighter'; for (const [r, a] of [[150, .05], [100, .06], [60, .08], [30, .1]]) { g.fillStyle = `rgba(255,150,70,${(a * fl).toFixed(3)})`; g.beginPath(); g.ellipse(x, y, r * fl, r * .62 * fl, 0, 0, TAU); g.fill(); } g.globalCompositeOperation = 'source-over'; }
  if (CAMP.glow > 0) { g.fillStyle = `rgba(255,244,200,${(Math.min(1, CAMP.glow) * .25).toFixed(3)})`; g.fillRect(0, 0, V.w, V.h); }
  if (V.flash > 0) { g.fillStyle = `rgba(255,240,200,${(V.flash * 2.2).toFixed(3)})`; g.fillRect(0, 0, V.w, V.h); V.flash -= V.dt; }
  g.imageSmoothingEnabled = true; g.drawImage(GFX.vig, 0, 0, V.w, V.h); g.imageSmoothingEnabled = false;
}

/* ---------- 화면 표시 ---------- */
function gWrap(str, maxW, f) { if (gTextW(str, f) <= maxW) return [str]; const w = str.split(' '), out = []; let cur = ''; for (const s of w) { const t = cur ? cur + ' ' + s : s; if (gTextW(t, f) > maxW && cur) { out.push(cur); cur = s; } else cur = t; } if (cur) out.push(cur); return out; }
function drawKey(k, label, x, y) {   // 작은 글쇠 표시 + 설명 (가운데 정렬)
  const g = V.g, kw = gTextW(k) + 6, lw = gTextW(label), w = kw + 4 + lw, x0 = Math.round(x - w / 2); y = Math.round(y);
  g.fillStyle = '#1c1618'; g.fillRect(x0 - 1, y - 2, kw + 2, 15); g.fillStyle = '#f1e9d6'; g.fillRect(x0, y - 1, kw, 12); g.fillStyle = '#b8ac90'; g.fillRect(x0, y + 11, kw, 1);
  gText(k, x0 + 3, y + 1, { c: '#2a1c14' }); gText(label, x0 + kw + 4, y + 1, { sh: '#1c1618' });
}
function drawSolFace(x, y, m) {
  const g = V.g, O = '#1c1618', flat = m === 'scared' || m === 'alert';
  g.fillStyle = O; g.fillRect(x, y + 2, 13, 9); if (flat) { g.fillRect(x - 2, y + 2, 3, 3); g.fillRect(x + 12, y + 2, 3, 3); } else { g.fillRect(x, y - 1, 4, 4); g.fillRect(x + 9, y - 1, 4, 4); }
  g.fillStyle = '#94806a'; g.fillRect(x + 1, y + 3, 11, 7); if (flat) { g.fillRect(x - 1, y + 3, 2, 1); g.fillRect(x + 12, y + 3, 2, 1); } else { g.fillRect(x + 1, y, 2, 3); g.fillRect(x + 10, y, 2, 3); }
  g.fillStyle = '#43352c'; g.fillRect(x + 5, y + 3, 1, 2); g.fillRect(x + 7, y + 3, 1, 2);
  g.fillStyle = '#f0e9de'; g.fillRect(x + 4, y + 7, 5, 3); g.fillStyle = '#e08a86'; g.fillRect(x + 6, y + 7, 1, 1);
  if (m === 'happy' || m === 'sleepy') { g.fillStyle = O; g.fillRect(x + 2, y + 6, 3, 1); g.fillRect(x + 8, y + 6, 3, 1); if (m === 'happy') { g.fillRect(x + 3, y + 5, 1, 1); g.fillRect(x + 9, y + 5, 1, 1); } }
  else { const w = m === 'alert' || m === 'scared'; g.fillStyle = w ? '#e4f48a' : '#9cc850'; g.fillRect(x + 2, y + 5, 3, w ? 3 : 2); g.fillRect(x + 8, y + 5, 3, w ? 3 : 2); g.fillStyle = O; g.fillRect(x + 3, y + 5, 1, w ? 3 : 2); g.fillRect(x + 9, y + 5, 1, w ? 3 : 2); }
  g.fillStyle = '#c84430'; g.fillRect(x + 3, y + 10, 7, 1);
  if (m === 'wet') { g.fillStyle = '#9ac4e8'; g.fillRect(x + 15, y + 2, 1, 1); g.fillRect(x + 14, y + 3, 3, 2); }
  if (m === 'sleepy') gText('z', x + 15, y - 2, { f: F7, c: '#c4d4e4' });
}
function drawHud() {
  const g = V.g, y = 8 + (V.safeT || 0); let x = 8;
  for (let i = 0; i < 10; i++) { const on = i < PL.hp, low = PL.hp <= 3 && Math.floor(V.time * 3) % 2; g.fillStyle = '#1c1618'; g.fillRect(x + i * 8, y, 7, 9); g.fillStyle = on ? (low ? '#e88a5a' : '#e6c36a') : '#3a3a44'; g.fillRect(x + i * 8 + 1, y + 1, 5, 7); if (on) { g.fillStyle = low ? '#f4b890' : '#fbe6a8'; g.fillRect(x + i * 8 + 1, y + 1, 5, 2); } }
  x += 86;
  for (let i = 0; i < 3; i++) { const on = WX.lv > i - .5; g.fillStyle = '#1c1618'; g.fillRect(x + i * 7 + 1, y, 3, 2); g.fillRect(x + i * 7, y + 2, 5, 6); g.fillRect(x + i * 7 + 1, y + 8, 3, 1); g.fillStyle = on ? '#9ac4e8' : '#3a3a44'; g.fillRect(x + i * 7 + 2, y + 1, 1, 2); g.fillRect(x + i * 7 + 1, y + 3, 3, 4); }
  x += 28; drawSolFace(x, y - 1, SO.mood);
  if (UI.ammoT > 0) for (let i = 0; i < 8; i++) { g.fillStyle = '#1c1618'; g.fillRect(8 + i * 6, y + 13, 5, 9); g.fillStyle = i < PL.ammo ? '#e2c25a' : '#3a3a44'; g.fillRect(9 + i * 6, y + 14, 3, 7); if (i < PL.ammo) { g.fillStyle = '#8a6a20'; g.fillRect(9 + i * 6, y + 19, 3, 2); } }
}
function drawUi() {
  const g = V.g, cx = CAM.x, cy = CAM.y, W = V.w, H = V.h, tg = UI.prompt;
  if (PL.st === 'move' && tg) {
    if (tg.k === 'forage') drawKey('E', '따기', tg.f.x - cx, tg.f.y - cy - (tg.f.t === 'berry' ? 56 : 36));
    else if (tg.k === 'sol') { const x = (SO.mode === 'under' ? PL.x : SO.x) - cx, yy = (SO.mode === 'under' ? PL.y : SO.y) + 9 - cy; drawKey('E', SO.st === 'ask' ? '길게 눌러 안기' : '쓰다듬기 · 길게 안기', x, yy); if (IN.eHold > .08) { g.fillStyle = '#1c1618'; g.fillRect(Math.round(x) - 13, Math.round(yy) + 14, 26, 4); g.fillStyle = '#e6c36a'; g.fillRect(Math.round(x) - 12, Math.round(yy) + 15, Math.round(24 * clamp(IN.eHold / .42, 0, 1)), 2); } }
    else if (SO.carryT < 5 || SO.cst === 'squirm') drawKey('E', (SO.mode === 'arms' ? '배낭에 태우기' : '품에 안기') + ' · 길게 내려놓기', PL.x - cx, PL.y - cy - 136);
  }
  if (PL.st === 'move' && IN.tHold > .12 && !PL.tUsed) { const x = Math.round(PL.x - cx), yy = Math.round(PL.y - cy) + 8; g.fillStyle = '#1c1618'; g.fillRect(x - 17, yy, 34, 5); g.fillStyle = '#e6c36a'; g.fillRect(x - 16, yy + 1, Math.round(32 * clamp(IN.tHold / .9, 0, 1)), 3); gText('텐트', x, yy + 7, { al: 'center', sh: '#1c1618' }); }
  let by = H - 12 - (V.safeB || 0);
  if (V.touch && W < 700) by = H - Math.round(gTouchButtons()[0].r * 5.4);   // 좁은 터치 화면: 단추 위로 올림
  if (UI.open || UI.bag > 0) {   // 가방 10칸
    const x0 = Math.round((W - 198) / 2), y0 = by - 20;
    for (let i = 0; i < 10; i++) { const x = x0 + i * 20; if (V.touch && IN.p.any && Math.abs(IN.cx - x - 9) < 10 && Math.abs(IN.cy - y0 - 9) < 12) UI.sel = i; g.fillStyle = 'rgba(16,18,24,.78)'; g.fillRect(x, y0, 18, 18); g.fillStyle = UI.open && UI.sel === i ? '#e6c36a' : '#5a5448'; g.fillRect(x, y0, 18, 1); g.fillRect(x, y0 + 17, 18, 1); g.fillRect(x, y0, 1, 18); g.fillRect(x + 17, y0, 1, 18); if (BAG[i]) { const s = WORLD.SP.item[BAG[i]]; g.drawImage(s.c, x + 1, y0 + 1); } }
    by = y0 - 4;
    if (UI.open) { const k = UI.sel >= 0 ? BAG[UI.sel] : null, L = gWrap(k ? ITEM[k].n + ' — ' + ITEM[k].d : UI.sel >= 0 ? '빈칸이에요.' : '가방 ' + BAG.filter(Boolean).length + ' / 10 · 숫자 1~0으로 살펴봐요 · Tab으로 닫기', W - 16); L.forEach((t, i) => gText(t, W / 2, by - 12 * (L.length - i) + 1, { al: 'center', sh: '#1c1618' })); by -= 12 * L.length + 3; }
  }
  if (PL.st === 'camp' && CAMP.eat <= 0) { const food = bagFood(), pot = BAG.includes('pot') ? '물 끓여 해방하기' : BAG.includes('pot_d') ? '물 끓이기' : null, items = [['E', CAMP.ate ? '먹었어요' : food ? '먹고 쉬기' : '먹을 것 없음'], ['R', '그냥 쉬기']].concat(pot ? [['G', pot]] : [], [['T', '텐트 걷기']]);
    let tw = 0; for (const it of items) tw += gTextW(it[0]) + 10 + gTextW(it[1]) + 14; let x = (W - tw) / 2; for (const it of items) { const w = gTextW(it[0]) + 10 + gTextW(it[1]); drawKey(it[0], it[1], x + w / 2, by - 12); x += w + 14; } by -= 17; }
  if (MSG.t > 0) { g.globalAlpha = Math.min(1, MSG.t * 3); gText(MSG.s, W / 2, by - 13, { f: F11, al: 'center', sh: '#1c1618' }); g.globalAlpha = 1; by -= 17; }
  if (MSG.ht > 0) { const L = gWrap(MSG.hint, Math.min(W - 24, 560)); g.globalAlpha = Math.min(1, MSG.ht * 2) * .95; L.forEach((s, i) => gText(s, W / 2, by - 12 * (L.length - i), { al: 'center', c: '#e8dcc0', sh: '#1c1618' })); g.globalAlpha = 1; }
  if (V.touch) for (const b of gTouchButtons()) { const on = held(b.k); g.globalAlpha = on ? .6 : .32; g.fillStyle = '#10141a'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); g.strokeStyle = '#f1e9d6'; g.lineWidth = 1; g.stroke(); g.globalAlpha = on ? 1 : .75; gText(b.t, b.x, b.y - 5, { al: 'center', sh: '#1c1618' }); g.globalAlpha = 1; }
  if (V.touch && IN.tch.id >= 0) { g.globalAlpha = .3; g.strokeStyle = '#f1e9d6'; g.beginPath(); g.arc(IN.tch.sx, IN.tch.sy, 44, 0, TAU); g.stroke(); g.fillStyle = '#f1e9d6'; g.beginPath(); g.arc(IN.tch.sx + clamp(IN.tch.x - IN.tch.sx, -44, 44), IN.tch.sy + clamp(IN.tch.y - IN.tch.sy, -44, 44), 14, 0, TAU); g.fill(); g.globalAlpha = 1; }
  if (UI.fade > 0) { g.fillStyle = `rgba(8,10,14,${UI.fade.toFixed(3)})`; g.fillRect(0, 0, W, H); }
  if (UI.help) drawHelp();
}
const HELP = [['이동', 'WASD · 방향키'], ['달리기', 'Shift (소리가 커요)'], ['살금살금', 'C (켜고 끄기)'], ['구르기', 'Space · X'], ['칼', '마우스 왼쪽 · J · Z (3연속)'], ['총', '오른쪽 누른 채 겨누고 왼쪽으로 발사 (K + J)'],
  ['솔 보내기 · 부르기', 'Q'], ['줍기 · 쓰다듬기', 'E (솔 곁에서 길게: 안기)'], ['텐트', 'T 길게'], ['가방', 'Tab'], ['도움말 · 소리', 'H · M'], ['시험용', 'F2 총알 · F3 물그림자 · F4 비 · F6 온전한 드롭 · F7 버섯']];
function drawHelp() {
  const g = V.g, W = V.w, H = V.h, pw = Math.min(W - 16, 430), ph = 64 + HELP.length * 13, x0 = Math.round((W - pw) / 2), y0 = Math.max(4, Math.round((H - ph) / 2));
  g.fillStyle = 'rgba(8,10,14,.5)'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(18,22,28,.94)'; g.fillRect(x0, y0, pw, ph); g.fillStyle = '#5a5448'; g.fillRect(x0, y0, pw, 1); g.fillRect(x0, y0 + ph - 1, pw, 1); g.fillRect(x0, y0, 1, ph); g.fillRect(x0 + pw - 1, y0, 1, ph);
  gText('비 오는 숲', x0 + 14, y0 + 11, { f: F11B, c: '#e6c36a' }); gText('1막 젖은 길 · 시험판', x0 + 14 + gTextW('비 오는 숲', F11B) + 8, y0 + 13, { c: '#a89c84' });
  HELP.forEach((r, i) => { const y = y0 + 32 + i * 13; gText(r[0], x0 + 14, y, { c: i === HELP.length - 1 ? '#8a8272' : '#c4d4e4' }); gText(r[1], x0 + 122, y, { c: i === HELP.length - 1 ? '#8a8272' : '#f1e9d6' }); });
  if (Math.floor(V.time * 2) % 2) gText(V.touch ? '화면을 누르면 시작해요' : document.hasFocus() ? '아무 글쇠나 누르면 시작해요' : '화면을 한 번 누르면 시작해요', x0 + pw / 2, y0 + ph - 20, { al: 'center', c: '#e6c36a' });
}

/* ---------- 한 프레임 ---------- */
function gFrame(ts) {
  const dt = Math.min(.05, (ts - (V.last || ts)) / 1000); V.last = ts; V.dt = dt; gPoll(dt);
  if (IN.p.help) { UI.help = !UI.help; V.ht = 0; }
  if (UI.help) { V.ht = (V.ht || 0) + dt; V.time += dt; if (IN.p.any && !IN.p.help) UI.help = false; gParts(dt); }
  else if (V.hitstop > 0) V.hitstop -= dt;
  else if (V.slow > 0) { V.slow -= dt; gUpdate(dt * .35); }   // 마지막 일격 · 처치 뒤 잠깐 느리게
  else gUpdate(dt);
  camUpdate(dt); drawWorld(); drawFx(); drawSky(); drawHud(); drawUi();
  if (!UI.help && !V.touch && !document.hasFocus() && Math.floor(ts / 600) % 2) gText('화면을 한 번 누르면 키보드가 켜져요', V.w / 2, V.h - 34, { al: 'center', c: '#e6c36a', sh: '#1c1618' });
  V.og.drawImage(V.cvs, 0, 0, V.w * V.k, V.h * V.k);
  IN.p = {};
  if (!V.manual) requestAnimationFrame(gFrame);
}
async function gStart(canvas) {
  V.out = canvas; V.og = canvas.getContext('2d'); V.cvs = document.createElement('canvas'); V.g = V.cvs.getContext('2d');
  gResize(); addEventListener('resize', gResize); gInput();
  const tick = (s, u) => new Promise(r => { const g = V.g; g.fillStyle = '#12161c'; g.fillRect(0, 0, V.w, V.h); gText(s, V.w / 2, V.h / 2 - 8, { f: F11, al: 'center' }); g.fillStyle = '#3a3a44'; g.fillRect(V.w / 2 - 60, V.h / 2 + 12, 120, 3); g.fillStyle = '#e6c36a'; g.fillRect(V.w / 2 - 60, V.h / 2 + 12, Math.round(120 * u), 3); V.og.drawImage(V.cvs, 0, 0, V.w * V.k, V.h * V.k); setTimeout(r, 0); });
  await tick('숲을 심는 중', .05); WORLD.gen(7); gfxInit(); foesInit(); birdsInit();
  PL.x = WORLD.START[0]; PL.y = WORLD.START[1]; SO.x = PL.x + 38; SO.y = PL.y + 16; SO.flip = true; camUpdate(0, true);
  await tick('방랑자와 솔을 그리는 중', .2);
  for (const d of ['r', 'l', 'd', 'u']) { for (let i = 0; i < GAIT_N; i++) manSpr('walk', i, d, {}); for (let i = 0; i < 4; i++) manSpr('idle', i, d, {}); }
  for (let c = 1; c <= 3; c++) { await tick('칼을 가는 중', .2 + c * .03); for (const d of ['r', 'l', 'd', 'u']) { for (let i = 0; i < KN_N; i++) manSpr('knife' + c, i, d, {}); for (let i = 0; i < KN_SUB; i++) manSpr('knife' + c + 'c', i, d, {}); } }
  for (const d of ['r', 'l', 'd', 'u']) for (let i = 0; i < DG_N; i++) manSpr('dodge', i, d, {});
  for (let i = 0; i < 8; i++) for (const fl of [false, true]) { solSpr('trot', i, fl, {}); solSpr('walk', i, fl, {}); }
  const nx = WORLD.WW / 256, ny = Math.ceil(WORLD.WH / 256);
  for (let j = 0; j < ny; j++) { await tick('땅을 다지는 중', .3 + .7 * j / ny); for (let i = 0; i < nx; i++) WORLD.chunk(i, j); }
  V.ready = true; requestAnimationFrame(gFrame);
}
