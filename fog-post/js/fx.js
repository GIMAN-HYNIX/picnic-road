'use strict';
/* =========================================================
   효과: 안개 · 물 · 빛 · 색 보정 · 파티클
   ========================================================= */
const FX = { parts: [], glow: {}, waterPoly: null, weeds: [], neonCache: new Map(), decals: [] };

function makeFogTex(w, h, seed, density, col, px = 6, py = 3) {
  const [c, g] = makeCanvas(w, h), img = g.createImageData(w, h), d = img.data, rgb = rgbOf(col);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = fbm(x / w * px, y / h * py, seed, 4, px, py);
    const edge = Math.sin(y / h * Math.PI);
    let a = smooth(clamp((n - (1 - density)) / .32, 0, 1)) * edge * edge;
    a = Math.round(a * 6) / 6;
    const i = (y * w + x) * 4; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = a * 255;
  }
  g.putImageData(img, 0, 0); return c;
}
function glowSprite(r, rgba, k = 1) {
  const [c, g] = makeCanvas(r * 2, r * 2); const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, rgba); gr.addColorStop(.35 * k, rgba.replace(/[\d.]+\)$/, m => (parseFloat(m) * .45) + ')')); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); return c;
}
function neonGlow(col) {
  let s = FX.neonCache.get(col); if (s) return s;
  const [r, gg, b] = rgbOf(col); s = glowSprite(26, `rgba(${r},${gg},${b},0.5)`); FX.neonCache.set(col, s); return s;
}
function initFX() {
  FX.fogA = makeFogTex(512, 90, 3, .62, '#e4ebe9');
  FX.fogB = makeFogTex(384, 120, 8, .78, '#e9eeed', 5, 3);
  FX.fogC = makeFogTex(256, 60, 13, .55, '#f1f4f3', 4, 2);
  FX.glow.lamp = glowSprite(38, 'rgba(255,212,150,0.42)');
  FX.glow.pool = glowSprite(30, 'rgba(255,214,160,0.28)');
  FX.glow.small = glowSprite(10, 'rgba(255,222,165,0.55)');
  FX.glow.win = glowSprite(16, 'rgba(255,200,130,0.22)');
  FX.glow.sun = glowSprite(130, 'rgba(255,238,205,0.42)');
  FX.glow.puff = glowSprite(9, 'rgba(238,243,244,0.9)', 1.6);
  FX.glow.puffBig = glowSprite(16, 'rgba(236,242,243,0.85)', 1.6);
  FX.glow.red = glowSprite(8, 'rgba(255,90,60,0.7)');
  FX.glow.amber = glowSprite(10, 'rgba(255,170,60,0.75)');
  FX.glow.green = glowSprite(10, 'rgba(255,230,120,0.7)');
  FX.glow.cyan = glowSprite(14, 'rgba(160,240,255,0.55)');
  // 물 다각형 (개천 단면)
  const W = LV.water; let xl = null, xr = null;
  for (let x = W.x0; x <= W.x1; x++) { const g = groundAt(x); if (g && g.y > W.s) { if (xl === null) xl = x; xr = x; } }
  const pts = [[xl - 1, W.s], [xr + 1, W.s]]; for (let x = xr; x >= xl; x -= 2) pts.push([x, groundAt(x).y + 1]); pts.push([xl, groundAt(xl).y + 1]);
  FX.waterPoly = pts; FX.wx0 = xl; FX.wx1 = xr; FX.uwBack = buildUwBack();
  // 물풀
  const r = RNG(91);
  for (let x = 1322; x < 1700; x += 6 + Math.floor(r() * 10)) { const g = groundAt(x); FX.weeds.push({ x, y: g.y, h: 8 + Math.floor(r() * 18), ph: r() * TAU, c: pick(['#4f7a3e', '#6a9a4a', '#3f6a3a', '#7aa858']) }); }
  // 비네트
  const [vc, vg] = makeCanvas(VW, VH); const gr = vg.createRadialGradient(VW / 2, VH * .48, VH * .32, VW / 2, VH / 2, VH * .95);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#8e8aa6'); vg.fillStyle = gr; vg.fillRect(0, 0, VW, VH); FX.vignette = vc;
}

/* ---------- 안개 ---------- */
function fogBand(g, tex, camx, f, y, alpha, speed, t, x0 = 0, x1 = VW) {
  const w = tex.width; let ox = -(((camx * f + t * speed) % w) + w) % w;
  g.save(); g.beginPath(); g.rect(x0, 0, x1 - x0, VH); g.clip(); g.globalAlpha = alpha;
  for (let x = ox; x < VW; x += w) g.drawImage(tex, Math.round(x), Math.round(y));
  g.restore();
}

/* ---------- 물 ---------- */
function buildUwBack() {
  const w = FX.wx1 - FX.wx0 + 4, h = 140, pb = new PB(w, h), r = RNG(55);
  for (let x = 0; x < w; x++) {
    const fl = Math.round(74 + fbm(x * .03, 1, 4, 3) * 30);
    for (let y = 0; y < h; y++) {
      if (y < fl) { const t = y / fl; if (bay(x, y) < t * .5) pb.px(x, y, '#3a7690'); continue; }
      pb.px(x, y, bay(x, y) < .5 ? '#2a5e74' : '#24546a');
    }
    if (r() < .12) { const hh = 6 + Math.floor(r() * 16); for (let j = 0; j < hh; j++) pb.px(x + Math.round(Math.sin(j * .3) * 1), fl - j, '#2f6a74'); }
  }
  for (let i = 0; i < 14; i++) { const x = r() * w, y = 80 + r() * 30; pb.ellipse(x, y, 5 + r() * 9, 3 + r() * 4, '#22505f'); }
  return pb.canvas();
}
function waterBack(g, cam, t) {
  const W = LV.water, sx0 = Math.max(0, Math.floor(FX.wx0 - 1 - cam.x)), sx1 = Math.min(VW, Math.ceil(FX.wx1 + 1 - cam.x));
  if (sx1 <= sx0) return; const sy = Math.round(W.s - cam.y); if (sy > VH) return;
  g.save(); g.beginPath(); FX.waterPoly.forEach((p, i) => { const x = p[0] - cam.x, y = p[1] - cam.y; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.clip();
  const gr = g.createLinearGradient(0, sy, 0, sy + 110); gr.addColorStop(0, '#78b2bf'); gr.addColorStop(.25, '#4a8aa2'); gr.addColorStop(1, '#173c54');
  g.fillStyle = gr; g.fillRect(sx0, sy, sx1 - sx0, VH - sy + 2);
  g.globalAlpha = .55; g.drawImage(FX.uwBack, Math.round(FX.wx0 - 2 - cam.x), sy + 4); g.globalAlpha = 1;
  g.restore();
}
function drawWeeds(g, cam, t) {
  for (const w of FX.weeds) {
    const sx = w.x - cam.x; if (sx < -10 || sx > VW + 10) continue;
    for (let j = 0; j < w.h; j++) {
      const sway = Math.sin(t * 1.6 + w.ph + j * .25) * (j / w.h) * 2.6;
      g.fillStyle = j > w.h - 3 ? lt(w.c, .25) : (j % 4 === 0 ? dk(w.c, .2) : w.c);
      g.fillRect(Math.round(sx + sway), Math.round(w.y - cam.y - j), 1, 1);
    }
  }
}
function waterFront(g, cam, t) {
  const W = LV.water, sx0 = Math.max(0, Math.floor(FX.wx0 - 1 - cam.x)), sx1 = Math.min(VW, Math.ceil(FX.wx1 + 1 - cam.x));
  if (sx1 <= sx0) return;
  const sy = Math.round(W.s - cam.y); if (sy > VH) return;
  g.save(); g.beginPath(); FX.waterPoly.forEach((p, i) => { const x = p[0] - cam.x, y = p[1] - cam.y; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.clip();
  // 수면 아래 반사 띠
  const RH = 12;
  for (let k = 0; k < RH; k++) {
    const src = sy - 1 - k, dst = sy + 1 + k; if (src < 0 || dst >= VH) continue;
    const off = Math.round(Math.sin(k * .9 + t * 3) * 1.3);
    g.globalAlpha = .3 * (1 - k / RH); g.drawImage(g.canvas, sx0, src, sx1 - sx0, 1, sx0 + off, dst, sx1 - sx0, 1);
  }
  g.globalAlpha = 1;
  const gr = g.createLinearGradient(0, sy, 0, sy + 120);
  gr.addColorStop(0, 'rgba(130,196,210,0.38)'); gr.addColorStop(.18, 'rgba(78,146,170,0.5)'); gr.addColorStop(.6, 'rgba(36,88,116,0.66)'); gr.addColorStop(1, 'rgba(14,40,62,0.82)');
  g.fillStyle = gr; g.fillRect(sx0, sy, sx1 - sx0, VH - sy + 2);
  // 빛 줄기
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = ((i * 83 + t * 5) % (sx1 - sx0 + 90)) + sx0 - 45, a = .045 + Math.sin(t * .7 + i) * .02;
    g.fillStyle = `rgba(190,235,245,${a})`; g.beginPath(); g.moveTo(x, sy); g.lineTo(x + 7, sy); g.lineTo(x + 42, sy + 120); g.lineTo(x + 28, sy + 120); g.fill();
  }
  // 바닥 물결빛
  for (let x = sx0; x < sx1; x++) {
    const wx = x + cam.x, gr2 = groundAt(wx); if (!gr2 || gr2.y <= W.s + 6) continue;
    const v = Math.sin(wx * .31 + t * 2.1) + Math.sin(wx * .13 - t * 1.4) + Math.sin(wx * .07 + t * .6) * .6;
    if (v > 1.25) { g.fillStyle = `rgba(200,245,250,${clamp((v - 1.25) * .5, 0, .45)})`; g.fillRect(x, Math.round(gr2.y - cam.y) - 1, 1, 1); if (v > 1.7) g.fillRect(x, Math.round(gr2.y - cam.y) - 2, 1, 1); }
  }
  g.globalCompositeOperation = 'source-over';
  g.restore();
  // 수면 선
  for (let x = sx0; x < sx1; x++) {
    const wx = x + cam.x, gg = groundAt(wx); if (!gg || gg.y <= W.s + 1) continue;
    const y = sy + Math.round(Math.sin(wx * .19 + t * 2.4) * .6 + Math.sin(wx * .05 - t) * .5);
    g.fillStyle = ((wx * 7 + Math.floor(t * 5)) % 23 < 2) ? '#ffffff' : '#d6eef2'; g.fillRect(x, y, 1, 1);
    g.fillStyle = 'rgba(70,130,150,0.6)'; g.fillRect(x, y + 1, 1, 1);
  }
}

/* ---------- 빛 ---------- */
function lightPass(g, cam, t, L) {
  g.globalCompositeOperation = 'lighter';
  g.drawImage(FX.glow.sun, 372 - 130, 62 - 130);
  // 해에서 내려오는 빛줄기
  for (let i = 0; i < 5; i++) {
    const a = .03 + Math.sin(t * .25 + i * 1.7) * .015, x = 372 - i * 70 - 40 + Math.sin(t * .1 + i) * 10;
    g.fillStyle = `rgba(255,232,190,${a})`; g.beginPath(); g.moveTo(x + 10, -10); g.lineTo(x + 34, -10); g.lineTo(x - 120, VH); g.lineTo(x - 170, VH); g.fill();
  }
  const midX = cam.x * L.mid.f, midY = cam.y * L.mid.fy - L.mid.y0;
  for (const l of META.lamps) {
    const mid = l.layer === 'mid', x = mid ? l.x - midX : l.x - cam.x, y = mid ? l.y - midY : l.y - cam.y;
    if (x < -50 || x > VW + 50) continue;
    let a = mid ? .4 : .85; if (l.flicker) { const f = Math.sin(t * 23) + Math.sin(t * 7.3); a *= (f > 1.5 || (t % 5 < .15)) ? .15 : 1; }
    g.globalAlpha = a; g.drawImage(mid ? FX.glow.small : FX.glow.lamp, Math.round(x - (mid ? 10 : 38)), Math.round(y - (mid ? 10 : 38)));
    if (!mid) { g.globalAlpha = a * .8; const gy = groundAt(l.x); if (gy) g.drawImage(FX.glow.pool, Math.round(x - 30), Math.round(gy.y - cam.y - 18), 60, 26); }
  }
  g.globalAlpha = 1;
  for (const w of META.windows) { const x = w.x - cam.x, y = w.y - cam.y; if (x < -30 || x > VW + 30) continue; g.globalAlpha = w.warm ? .55 : .4; g.drawImage(FX.glow.win, Math.round(x - 16), Math.round(y - 16)); }
  for (const n of META.neons) {
    const x = n.x - cam.x, y = n.y - cam.y; if (x < -40 || x > VW + 40) continue;
    let a = n.steady ? .7 : .9; if (!n.steady) { const f = Math.sin(t * 17 + n.x) + Math.sin(t * 3.1 + n.x * .3); if (f > 1.75) a = .2; }
    g.globalAlpha = a; const s = neonGlow(n.col); g.drawImage(s, Math.round(x - Math.max(26, n.w * .9)), Math.round(y - Math.max(26, n.h * .9)), Math.max(52, n.w * 1.8), Math.max(52, n.h * 1.8));
  }
  for (const b of META.bulbs) { const x = b.x - cam.x, y = b.y - cam.y; if (x < -20 || x > VW + 20) continue; g.globalAlpha = .8; g.drawImage(FX.glow.small, Math.round(x - 10), Math.round(y - 10)); }
  for (const b of META.blinks) { const x = b.x - cam.x, y = b.y - cam.y; if (x < -20 || x > VW + 20) continue; const on = Math.floor(t * 2 + b.x * .1) % 2 === 0; if (on) { g.globalAlpha = .9; g.drawImage(FX.glow.amber, Math.round(x - 9), Math.round(y - 9)); } }
  if (META.craneLight && Math.floor(t * 1.2) % 2 === 0) { const x = META.craneLight.x - midX, y = META.craneLight.y - midY; g.globalAlpha = .8; g.drawImage(FX.glow.red, Math.round(x - 8), Math.round(y - 8)); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function grade(g) {
  g.globalCompositeOperation = 'soft-light';
  const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, 'rgba(80,120,170,0.32)'); gr.addColorStop(.55, 'rgba(255,214,170,0.16)'); gr.addColorStop(1, 'rgba(40,46,80,0.38)');
  g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
  g.globalCompositeOperation = 'multiply'; g.drawImage(FX.vignette, 0, 0);
  g.globalCompositeOperation = 'source-over';
}

/* ---------- 파티클 ---------- */
function addP(o) { FX.parts.push(Object.assign({ life: 0, max: 1, vx: 0, vy: 0, g: 0, kind: 'dot', col: '#ffffff', layer: 'front' }, o)); if (FX.parts.length > 600) FX.parts.shift(); }
function burst(x, y, n, o) { for (let i = 0; i < n; i++) addP(Object.assign({ x: x + rnd(-(o.sp || 2), o.sp || 2), y, vx: rnd(-1, 1) * (o.vx || 30), vy: rnd(o.vy0 ?? -20, o.vy1 ?? -60), max: rnd(.3, .7) * (o.l || 1) }, o)); }
function stepParts(dt) {
  for (let i = FX.parts.length - 1; i >= 0; i--) {
    const p = FX.parts[i]; p.life += dt; if (p.life > p.max) { FX.parts.splice(i, 1); continue; }
    p.vy += p.g * dt;
    if (p.kind === 'leaf') { p.vx = Math.sin(p.life * 3 + p.ph) * 14 + (p.wind || -6); p.vy = 12 + Math.sin(p.life * 2 + p.ph) * 4; const gg = groundAt(p.x); if (gg && p.y > gg.y + (p.dep || 0) && !inWaterX(p.x)) { p.vx = 0; p.vy = 0; p.g = 0; p.rest = 1; } }
    if (p.rest) continue;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'bubble' && p.y < LV.water.s + 1) p.life = p.max;
  }
}
function drawParts(g, cam, layer) {
  for (const p of FX.parts) {
    if (p.layer !== layer) continue;
    const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y); if (x < -20 || x > VW + 20 || y < -20 || y > VH + 20) continue;
    const k = 1 - p.life / p.max;
    switch (p.kind) {
      case 'leaf': { const f = Math.floor(p.life * 6 + p.ph) % 3; g.fillStyle = p.col; if (f === 0) g.fillRect(x, y, 2, 1); else if (f === 1) g.fillRect(x, y, 1, 2); else { g.fillRect(x, y, 1, 1); g.fillStyle = dk(p.col, .25); g.fillRect(x + 1, y + 1, 1, 1); } if (p.rest) { g.globalAlpha = 1; } break; }
      case 'bubble': g.fillStyle = 'rgba(220,245,250,0.85)'; g.fillRect(x, y - 1, 1, 1); g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y + 1, 1, 1); break;
      case 'puff': { g.globalAlpha = k * (p.a ?? .8); const s = p.big ? FX.glow.puffBig : FX.glow.puff, r = s.width / 2 * (p.sc || 1) * (1 + (1 - k) * (p.grow || .6)); g.drawImage(s, Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 2)); g.globalAlpha = 1; break; }
      case 'spark': { g.fillStyle = p.col; const s = k > .5 ? 1 : 0; g.fillRect(x, y, 1, 1); if (s) { g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1); } break; }
      case 'speed': g.fillStyle = `rgba(255,255,255,${k * .7})`; g.fillRect(x, y, p.len || 6, 1); break;
      case 'feather': g.fillStyle = '#e6e9ec'; g.fillRect(x, y, 1, 1); break;
      default: g.globalAlpha = Math.min(1, k * 1.5); g.fillStyle = p.col; g.fillRect(x, y, p.s || 1, p.s || 1); g.globalAlpha = 1;
    }
  }
}
