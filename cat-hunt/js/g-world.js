'use strict';
/* =========================================================
   1막 · 안개 숲 (젖은 길) — 2배 해상도 맵
   2560×1920. 젖은 길이 남서쪽 야영지에서 북동쪽으로 이어지고,
   길가 웅덩이마다 물그림자가 살며, 북동쪽에 얕은 개울이 흐름
   땅은 256 조각으로 나눠 그리고, 나무 · 고사리 · 바위는 발 위치로 앞뒤를 가림
   ========================================================= */
const WORLD = (() => {
  const WW = 2560, WH = 1920, CHK = 256, FS = 8, FW = WW / FS + 1, FH = WH / FS + 1, NS = 16, NW = WW / NS, NH = WH / NS;
  const TRAIL = [[60, 1664], [420, 1632], [700, 1480], [1010, 1500], [1300, 1330], [1520, 1120], [1400, 900], [1250, 760], [1420, 560], [1760, 500], [2080, 380], [2500, 318]];
  const BROOK = [[1900, -20], [1880, 180], [1960, 330], [1930, 470], [2010, 640], [2160, 800], [2230, 1010], [2380, 1180], [2580, 1262]];
  const TW = 27, BW = 21;
  const CLEAR = [[330, 1590, 150, 78, 1], [1780, 1380, 180, 112, 0], [1250, 420, 120, 70, 0]];   // [x, y, rx, ry, 흙바닥?]
  const PUD = [   // 물그림자가 사는 웅덩이 (home) + 작은 웅덩이
    { x: 1010, y: 1436, rx: 46, ry: 19, home: 1 }, { x: 1574, y: 1016, rx: 54, ry: 23, home: 1 }, { x: 1176, y: 690, rx: 44, ry: 19, home: 1 }, { x: 2296, y: 566, rx: 60, ry: 25, home: 2 }, { x: 640, y: 930, rx: 56, ry: 24, home: 1 },
    { x: 560, y: 1548, rx: 22, ry: 9 }, { x: 836, y: 1508, rx: 18, ry: 8 }, { x: 1196, y: 1410, rx: 24, ry: 10 }, { x: 1452, y: 1186, rx: 20, ry: 8 }, { x: 1330, y: 846, rx: 22, ry: 9 }, { x: 1590, y: 540, rx: 24, ry: 10 }, { x: 1700, y: 1290, rx: 26, ry: 11 }, { x: 900, y: 1180, rx: 20, ry: 8 }, { x: 2140, y: 420, rx: 18, ry: 7 },
  ];
  const BRIDGE = [[1898, 448], [1982, 416]];
  const START = [330, 1600];
  let fTrail, fBrook, fTree, props = [], solids = [], buckets, sbuckets, nav, chunks = new Map(), SP = {}, forage = [], covers = [], rnd;

  /* ---------- 거리 장 ---------- */
  function segDist(px, py, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], t = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t); }
  function polyField(pts) { const F = new Float32Array(FW * FH); for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) { let d = 1e9; for (let k = 0; k < pts.length - 1; k++) d = Math.min(d, segDist(i * FS, j * FS, pts[k], pts[k + 1])); F[j * FW + i] = d; } return F; }
  function fs(F, x, y) {
    const fx = clamp(x / FS, 0, FW - 1.001), fy = clamp(y / FS, 0, FH - 1.001), i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, o = j * FW + i;
    return (F[o] * (1 - u) + F[o + 1] * u) * (1 - v) + (F[o + FW] * (1 - u) + F[o + FW + 1] * u) * v;
  }
  const trailD = (x, y) => fs(fTrail, x, y) - TW + (vnoise(x * .075, y * .075, 3) - .5) * 12;
  const brookD = (x, y) => fs(fBrook, x, y) - BW + (vnoise(x * .05, y * .05, 11) - .5) * 10;
  const clearD = (x, y, c) => ((x - c[0]) / c[2]) ** 2 + ((y - c[1]) / c[3]) ** 2 + (vnoise(x * .06, y * .06, 3) - .5) * .5;
  const pudQ = (x, y, p) => ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 + (vnoise(x * .1, y * .1, 7) - .5) * .4;
  const onBridge = (x, y) => segDist(x, y, BRIDGE[0], BRIDGE[1]) < 9;
  // 땅 종류: 0 풀 · 1 흙길 · 3 숲 바닥 · 4 개울 · 5 웅덩이 · 6 통나무 다리
  function terr(x, y) {
    if (onBridge(x, y)) return 6;
    for (const p of PUD) if (Math.abs(x - p.x) < p.rx * 1.2 && Math.abs(y - p.y) < p.ry * 1.2 && pudQ(x, y, p) < 1) return 5;
    if (fs(fBrook, x, y) < BW + 8 && brookD(x, y) < 0) return 4;
    if (fs(fTrail, x, y) < TW + 8 && trailD(x, y) < 0) return 1;
    for (const c of CLEAR) if (c[4] && Math.abs(x - c[0]) < c[2] * 1.3 && Math.abs(y - c[1]) < c[3] * 1.3 && clearD(x, y, c) < 1) return 1;
    return fs(fTree, x, y) < 40 ? 3 : 0;
  }
  const wet = (x, y) => { const t = terr(x, y); return t === 4 || t === 5; };

  /* ---------- 배치 ---------- */
  function free(x, y, pad) {   // 길 · 개울 · 웅덩이 · 빈터를 피함
    if (fs(fTrail, x, y) < TW + pad || fs(fBrook, x, y) < BW + pad) return false;
    for (const c of CLEAR) if (((x - c[0]) / (c[2] + pad)) ** 2 + ((y - c[1]) / (c[3] + pad)) ** 2 < 1) return false;
    for (const p of PUD) if (((x - p.x) / (p.rx + pad)) ** 2 + ((y - p.y) / (p.ry + pad)) ** 2 < 1) return false;
    return true;
  }
  function far(x, y, d, type) { for (const p of props) if ((!type || p.t === type) && Math.abs(p.x - x) < d && Math.abs(p.y - y) < d && Math.hypot(p.x - x, p.y - y) < d) return false; return true; }
  function add(t, x, y, o) { const p = Object.assign({ t, x: Math.round(x), y: Math.round(y), v: 0 }, o); props.push(p); return p; }
  function place() {
    const R = rnd;
    // 가장자리 나무 벽 (길과 개울이 드나드는 곳은 비움). 아래쪽 줄은 화면 밖에 뿌리를 둔 앞 나무
    for (let k = 0; k < 2; k++) {
      for (let x = 30; x < WW; x += 84) for (const y of [34 + k * 76, WH + 24 + k * 74]) { const X = x + R() * 46 + k * 40, Y = y + R() * 34; if (free(X, Y, 30)) add('tree', X, Y, { v: (R() * 4) | 0 }); }
      for (let y = 120; y < WH - 150; y += 88) for (const x of [34 + k * 74, WW - 34 - k * 74]) { const X = x + R() * 36, Y = y + R() * 50 + k * 40; if (free(X, Y, 30)) add('tree', X, Y, { v: (R() * 4) | 0 }); }
    }
    add('tree', 1250, 372, { v: 4 });   // 북쪽의 아주 큰 나무
    for (let i = 0, n = 0; i < 1400 && n < 52; i++) { const x = 190 + R() * (WW - 380), y = 230 + R() * (WH - 520); if (free(x, y, 44) && far(x, y, 150, 'tree')) { add('tree', x, y, { v: (R() * 4) | 0, rn: 1 }); n++; } }
    for (let i = 0; i < 300; i++) { const x = 140 + R() * (WW - 280), y = 160 + R() * (WH - 300); if (free(x, y, 30) && far(x, y, 62)) add('sap', x, y, { v: (R() * 2) | 0, rn: 1 }); if (props.filter(p => p.t === 'sap').length > 34) break; }
    for (let i = 0; i < 400; i++) {   // 바위: 개울가에 많이
      const nb = i < 160, x = nb ? lerp(1860, 2500, R()) : 130 + R() * (WW - 260), y = nb ? R() * 1300 : 150 + R() * (WH - 300), bd = fs(fBrook, x, y);
      if (nb ? (bd > BW + 6 && bd < BW + 60 && fs(fTrail, x, y) > TW + 20) : free(x, y, 26)) if (far(x, y, 46)) add('rock', x, y, { v: (R() * 3) | 0, rn: 1 });
      if (props.filter(p => p.t === 'rock').length > 52) break;
    }
    for (const [x, y, f] of [[770, 1330, 0], [1420, 1420, 1], [1040, 980, 0], [1660, 760, 1], [520, 1220, 0], [2140, 1160, 1], [1500, 300, 0]]) add('log', x, y, { flip: f });
    for (const [x, y] of [[860, 1600], [1700, 1100], [1050, 560], [2320, 900], [460, 1360]]) add('stump', x, y);
    for (const [x, y] of [[470, 1520], [1640, 1440], [1930, 1330], [1120, 1270], [1350, 480], [2200, 300], [760, 1010]]) add('berry', x, y, { n: 3 });
    prune();
    for (let i = 0; i < 500; i++) { const x = 130 + R() * (WW - 260), y = 150 + R() * (WH - 290); if (free(x, y, 22) && far(x, y, 54)) add('bush', x, y, { v: (R() * 2) | 0 }); if (props.filter(p => p.t === 'bush').length > 44) break; }
    // 버섯: 큰 나무 밑동 옆
    const trees = props.filter(p => p.t === 'tree' && p.x > 200 && p.x < WW - 200 && p.y > 240 && p.y < WH - 160);
    for (let i = 0, n = 0; i < trees.length && n < 12; i += 5) { const t = trees[i], x = t.x + (R() < .5 ? -1 : 1) * (38 + R() * 14), y = t.y + 8 + R() * 10; if (free(x, y, 10)) { add('shroom', x, y, { n: 1 }); n++; } }
    // 고사리: 덤불 지대(몸을 숨기는 곳)는 빽빽하게, 나머지는 나무 밑동 둘레
    const THK = [[1100, 1250, 230, 110], [1750, 840, 190, 120], [640, 1180, 170, 100], [1380, 660, 150, 90], [2200, 700, 150, 110], [860, 760, 150, 100]];
    for (const [cx, cy, rx, ry] of THK) for (let i = 0; i < 70; i++) { const a = R() * TAU, d = Math.sqrt(R()), x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d; if (free(x, y, 8) && far(x, y, 20)) add('fern', x, y, { v: (R() * 3) | 0, bv: 0 }); }
    for (const t of trees) for (let k = 0; k < 2; k++) { const a = R() * TAU, x = t.x + Math.cos(a) * (46 + R() * 30), y = t.y + 6 + Math.sin(a) * 24; if (free(x, y, 8) && far(x, y, 22)) add('fern', x, y, { v: (R() * 3) | 0, bv: 0 }); }
    // 갈대: 개울과 큰 웅덩이 둘레
    for (let i = 0; i < 260; i++) { const x = 1840 + R() * 720, y = R() * 1300, bd = fs(fBrook, x, y); if (bd > BW + 3 && bd < BW + 16 && fs(fTrail, x, y) > TW + 6 && far(x, y, 20)) add('reed', x, y, { v: (R() * 2) | 0 }); }
    for (const p of PUD) if (p.home) for (let k = 0; k < 7; k++) { const a = R() * TAU, x = p.x + Math.cos(a) * (p.rx + 7), y = p.y + Math.sin(a) * (p.ry + 5); if (Math.sin(a) < .5 && far(x, y, 14)) add('reed', x, y, { v: (R() * 2) | 0 }); }
  }
  const TR = [22, 27, 33, 39, 54];   // 나무 굵기
  // 물건 하나의 충돌 모양: 원 [x, y, r] 또는 가로 캡슐 [x, y, r, 반길이]
  function shape(p) {
    if (p.t === 'tree') return [p.x, p.y - 4, TR[p.v] * .8]; if (p.t === 'sap') return [p.x, p.y - 2, 5];
    if (p.t === 'rock') { const r = [9, 15, 24][p.v]; return [p.x, p.y - r * .35, r]; }
    if (p.t === 'stump') return [p.x, p.y - 6, 15]; if (p.t === 'log') return [p.x, p.y - 9, 10, 44]; if (p.t === 'berry') return [p.x, p.y - 6, 13];
    return null;
  }
  function gap(a, b) { const dx = Math.max(0, Math.abs(a[0] - b[0]) - (a[3] || 0) - (b[3] || 0)); return Math.hypot(dx, a[1] - b[1]) - a[2] - b[2]; }
  // 레이아웃 정리: 아무 데나 뿌린 나무 · 묘목 · 바위가 다른 장애물과 겹치거나, 방랑자가 못 지나갈 만큼(지름 18) 좁은 틈을 만들면 뺌
  // 손으로 놓은 통나무 · 그루터기 · 산딸기 · 가장자리 나무는 그대로 두고, 작은 것부터 뺌
  function prune() {
    const rank = { sap: 0, rock: 1, tree: 2 }, cand = props.filter(p => p.rn).sort((a, b) => rank[a.t] - rank[b.t] || b.v - a.v), dead = new Set();
    for (const p of cand) {
      const a = shape(p);
      for (const q of props) {
        if (q === p || dead.has(q)) continue; const b = shape(q); if (!b) continue;
        const d = gap(a, b), fixed = !q.rn && q.t !== 'tree';
        if (fixed ? d < 22 : d > -4 && d < 22 && (q.rn ? rank[q.t] >= rank[p.t] : true)) { dead.add(p); break; }
      }
    }
    props = props.filter(p => !dead.has(p));
  }
  function index() {
    solids = []; forage = []; covers = [];
    for (const p of props) {
      const sh = shape(p);
      if (sh) { const o = { x: sh[0], y: sh[1], r: sh[2], p }; if (sh[3]) o.hl = sh[3]; if (p.t === 'log' || p.t === 'berry') o.low = 1; if (p.t === 'tree' || p.t === 'rock') p.r = sh[2]; solids.push(o); }
      if (p.t === 'berry') forage.push(p);
      else if (p.t === 'shroom') forage.push(p);
      else if (p.t === 'fern' || p.t === 'bush') covers.push(p);
    }
    buckets = new Map(); sbuckets = new Map();
    const put = (M, k, v) => { let a = M.get(k); if (!a) M.set(k, a = []); a.push(v); };
    for (const p of props) put(buckets, (p.y >> 8) * 64 + (p.x >> 8), p);
    for (const s of solids) for (let j = (s.y - s.r) >> 7; j <= (s.y + s.r) >> 7; j++) for (let i = (s.x - s.r - (s.hl || 0)) >> 7; i <= (s.x + s.r + (s.hl || 0)) >> 7; i++) put(sbuckets, j * 64 + i, s);
    // 솔의 길찾기 격자: 0 갈 수 있음 · 1 막힘 · 2 물 (솔은 물을 건너지 않음)
    nav = new Uint8Array(NW * NH);
    for (let j = 0; j < NH; j++) for (let i = 0; i < NW; i++) {
      const x = i * NS + NS / 2, y = j * NS + NS / 2; let v = 0;
      if (x < 60 || y < 70 || x > WW - 60 || y > WH - 210) v = 1;
      else if (hitSolid(x, y, 7)) v = 1;
      else if (segDist(x, y, BRIDGE[0], BRIDGE[1]) < 14) v = 0;   // 통나무 다리는 솔도 건넘
      else { const t = terr(x, y); if (t === 4 || t === 5) v = 2; }
      nav[j * NW + i] = v;
    }
  }
  function near(M, x, y, r, sh, fn) { for (let j = (y - r) >> sh; j <= (y + r) >> sh; j++) for (let i = (x - r) >> sh; i <= (x + r) >> sh; i++) { const a = M.get(j * 64 + i); if (a) for (const o of a) fn(o); } }
  // 장애물에서 가장 가까운 점: 원은 가운데, 통나무(가로 캡슐)는 선분 위의 점
  const cpx = (s, x) => s.hl ? clamp(x, s.x - s.hl, s.x + s.hl) : s.x;
  function hitSolid(x, y, r) { let h = null; near(sbuckets, x, y, r + 60, 7, s => { if (!h && Math.hypot(cpx(s, x) - x, s.y - y) < s.r + r) h = s; }); return h; }
  const inB = (x, y) => [clamp(x, 70, WW - 70), clamp(y, 96, WH - 216)];
  // 원을 장애물 밖으로 밀어냄 (미끄러지듯 비껴 감)
  // 원래 자리(ox, oy)를 주면: 나무와 맵 가장자리 사이처럼 풀 수 없는 구석에서는 파고들거나 뒤로 튕기지 않고 제자리에 머묾
  function push(x, y, r, ox, oy) {
    const ix = x, iy = y;
    for (let it = 0; it < 4; it++) {
      let hit = false;
      [x, y] = inB(x, y);
      near(sbuckets, x, y, r + 60, 7, s => { const qx = cpx(s, x), dx = x - qx, dy = y - s.y, d = Math.hypot(dx, dy), m = s.r + r; if (d < m) { hit = true; if (d > .001) { x = qx + dx / d * m; y = s.y + dy / d * m; } else y = s.y + m; } });
      if (!hit) break;
    }
    [x, y] = inB(x, y);
    if (ox == null) return [x, y];
    const bad = hitSolid(x, y, r - .5) || (x - ox) * (ix - ox) + (y - oy) * (iy - oy) < 0;
    return bad && !hitSolid(ox, oy, r - .5) ? inB(ox, oy) : [x, y];
  }
  // 총알: 나무 · 바위에 막히는 거리 (낮은 것은 넘어감)
  function ray(x, y, dx, dy, max) {
    let best = max;
    for (const s of solids) { if (s.low || s.p.t === 'sap') continue; const ox = s.x - x, oy = s.y - y, t = ox * dx + oy * dy; if (t < 0 || t > best + s.r) continue; const d2 = ox * ox + oy * oy - t * t, r = s.r * .9; if (d2 < r * r) best = Math.min(best, t - Math.sqrt(r * r - d2)); }
    return best;
  }

  /* ---------- 솔의 길찾기 (A*) ---------- */
  const nOk = (i, j, water) => i >= 0 && j >= 0 && i < NW && j < NH && (nav[j * NW + i] === 0 || (water && nav[j * NW + i] === 2));
  function walkable(x, y, water) { return nOk((x / NS) | 0, (y / NS) | 0, water); }
  function clearLine(ax, ay, bx, by, water) { const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 8); for (let k = 1; k <= n; k++) if (!walkable(lerp(ax, bx, k / n), lerp(ay, by, k / n), water)) return false; return true; }
  function nearestOpen(x, y, water) { const ci = (x / NS) | 0, cj = (y / NS) | 0; for (let r = 0; r < 12; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (Math.max(Math.abs(i), Math.abs(j)) === r && nOk(ci + i, cj + j, water)) return [(ci + i) * NS + NS / 2, (cj + j) * NS + NS / 2]; return null; }
  function path(ax, ay, bx, by, water) {
    if (clearLine(ax, ay, bx, by, water)) return [[bx, by]];
    const s = nearestOpen(ax, ay, water), e = nearestOpen(bx, by, water); if (!s || !e) return null;
    const si = ((s[1] / NS) | 0) * NW + ((s[0] / NS) | 0), ei = ((e[1] / NS) | 0) * NW + ((e[0] / NS) | 0), ex = ei % NW, ey = (ei / NW) | 0;
    const g = new Float32Array(NW * NH).fill(1e9), from = new Int32Array(NW * NH).fill(-1), open = [si], inO = new Uint8Array(NW * NH), fsc = new Float32Array(NW * NH);
    g[si] = 0; let found = false, guard = 0;
    while (open.length && guard++ < 14000) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (fsc[open[k]] < fsc[open[bi]]) bi = k;
      const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop(); inO[cur] = 2;
      if (cur === ei) { found = true; break; }
      const cx = cur % NW, cy = (cur / NW) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const nx = cx + di, ny = cy + dj; if (!nOk(nx, ny, water)) continue;
        if (di && dj && (!nOk(cx + di, cy, water) || !nOk(cx, cy + dj, water))) continue;
        const ni = ny * NW + nx; if (inO[ni] === 2) continue;
        const ng = g[cur] + (di && dj ? 1.414 : 1) + (nav[ni] === 2 ? 3 : 0);
        if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; fsc[ni] = ng + Math.hypot(nx - ex, ny - ey) * 1.05; if (!inO[ni]) { inO[ni] = 1; open.push(ni); } }
      }
    }
    if (!found) return null;
    const pts = []; for (let c = ei; c !== si && c >= 0; c = from[c]) pts.push([(c % NW) * NS + NS / 2, ((c / NW) | 0) * NS + NS / 2]);
    pts.reverse(); if (clearLine(e[0], e[1], bx, by, water)) pts.push([bx, by]);
    const out = []; let px = ax, py = ay;   // 꺾이는 곳만 남김
    for (let k = 0; k < pts.length; k++) { let far = k; for (let m = Math.min(pts.length - 1, k + 14); m > k; m--) if (clearLine(px, py, pts[m][0], pts[m][1], water)) { far = m; break; } out.push(pts[far]); px = pts[far][0]; py = pts[far][1]; k = far; }
    return out;
  }

  /* ---------- 물건 그림 (픽셀을 직접 찍음) ---------- */
  const cv = (pb, ox, oy) => ({ c: pb.canvas(), ox, oy, w: pb.w, h: pb.h });
  function outline(pb, col) {
    const W = pb.w, H = pb.h, s = new Uint32Array(pb.d), oc = C(col);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (s[i] >>> 24) continue; if ((x > 0 && s[i - 1] >>> 24) || (x < W - 1 && s[i + 1] >>> 24) || (y > 0 && s[i - W] >>> 24) || (y < H - 1 && s[i + W] >>> 24)) pb.d[i] = oc; }
    return pb;
  }
  function rows(pb, x, y, rr, pal) { for (let j = 0; j < rr.length; j++) for (let i = 0; i < rr[j].length; i++) { const ch = rr[j][i]; if (pal[ch]) pb.px(x + i, y + j, pal[ch]); } }
  // 아름드리나무 밑동: 위로 갈수록 안개 속으로 흩어짐
  function paintTrunk(r, H, sd) {
    const fl = Math.round(r * .8), W = (r + fl) * 2 + 24, pb = new PB(W, H + 18), cx = W >> 1, yb = H, base = r * .26, hw = y => r + fl * Math.exp(-(yb - y) / (r * .6));
    for (let k = 0; k < 5; k++) {
      const a = (k / 4 - .5) * 2.5, bx = cx + Math.sin(a) * (r + fl) * .62, ex = cx + Math.sin(a) * (r + fl + 10), ey = yb + 6 - Math.abs(a) * 3.4;
      pb.poly([[bx - 7, yb - 12], [ex, ey], [bx + 7, yb - 5]], k < 2 ? '#3a2e26' : '#43352b'); pb.line(bx - 7, yb - 12, ex, ey, '#1a1412'); pb.line(ex, ey, bx + 7, yb - 5, '#1a1412');
    }
    for (let y = 0; y <= yb + base; y++) {
      let w = hw(Math.min(y, yb)); if (y > yb) w *= Math.sqrt(Math.max(0, 1 - ((y - yb) / base) ** 2));
      if (w < 1) continue;
      for (let i = -Math.ceil(w); i <= Math.ceil(w); i++) {
        const u = i / w; if (Math.abs(u) > 1) continue;
        if (y < 96 && bay(cx + i, y) > y / 96 * 1.06 - .03) continue;
        const col = Math.round(u * r + Math.sin(y * .035 + sd + u * 3) * 2.2), m = gmod(col + sd * 7, 7), mh = yb - y;
        let c = u < -.5 ? '#3a2e26' : u > .3 ? '#2f2520' : '#4f3e32';
        if (m === 0) c = '#2a201a'; else if (m === 1 && u > -.5 && u < .3) c = '#5e4a3a';
        if (hash2(col * 3.1 + sd, Math.floor(y / 9)) > .88) c = '#2a201a';
        if (mh < 80 && u < .2 && hash2(i + sd * 13, y) > .46 + mh / 170 + (u + .6) * .28) c = (y + i) % 3 ? '#4a6a3e' : '#3c5a34';
        if (Math.abs(i) > w - 1.4) c = '#1a1412';
        if (y < 120) c = mix(c, '#5c7470', (1 - y / 120) * .5);   // 위로 갈수록 안개 빛
        pb.px(cx + i, y, c);
      }
    }
    return cv(pb, cx, yb);
  }
  function leafBlob(pb, bx, by, rx, ry, pal) {
    pal = pal || ['#24402c', '#35593c', '#4a7650', '#6a965e'];
    for (let j = -ry - 1; j <= ry + 1; j++) for (let i = -rx - 1; i <= rx + 1; i++) {
      const q = (i / rx) ** 2 + (j / ry) ** 2 + (hash2(Math.round((bx + i) / 3), Math.round((by + j) / 3)) - .5) * .36; if (q > 1) continue;
      const l = (i / rx) * .6 - (j / ry) * .75 + (hash2(Math.round((bx + i) / 2) + 7, Math.round((by + j) / 2)) - .5) * .7;
      pb.px(bx + i, by + j, q > .82 ? '#16261c' : l > .62 ? pal[3] : l > .12 ? pal[2] : l > -.45 ? pal[1] : pal[0]);
    }
  }
  function paintSap(v) {
    const pb = new PB(88, 136), cx = 44, yb = 130;
    for (let y = 48; y <= yb; y++) { const w = 2.4 + (y - 48) / 80 * 1.6 + (y > yb - 5 ? (y - yb + 5) * .6 : 0), sx = Math.round(Math.sin(y * .05 + v) * 1.5); for (let i = -Math.ceil(w); i <= Math.ceil(w); i++) pb.px(cx + i + sx, y, Math.abs(i) > w - 1 ? '#1a1412' : i < 0 ? '#3e3028' : '#54433a'); }
    for (const [bx, by, rx, ry] of (v ? [[44, 42, 23, 17], [27, 54, 15, 12], [61, 52, 16, 13], [42, 25, 17, 12]] : [[44, 46, 21, 16], [25, 42, 15, 12], [63, 46, 17, 13], [46, 27, 19, 13], [33, 62, 12, 9]])) leafBlob(pb, bx, by, rx, ry);
    return cv(pb, cx, yb);
  }
  function paintBush(v, berries) {
    const pb = new PB(60, 44);
    for (const [bx, by, rx, ry] of (v ? [[30, 25, 25, 15], [15, 30, 12, 9], [46, 29, 12, 10]] : [[28, 26, 22, 14], [44, 28, 14, 11], [14, 31, 11, 8]])) leafBlob(pb, bx, by, rx, ry, berries != null ? ['#223a2a', '#32533a', '#44704a', '#5e8a56'] : null);
    if (berries) for (const [x, y] of [[20, 22], [33, 18], [41, 27], [26, 31], [14, 30], [47, 22]].slice(0, berries * 2)) { pb.ellipse(x + .5, y + .5, 2, 2, '#b02a36'); pb.px(x, y - 1, '#f08a8a'); pb.px(x + 2, y + 1, '#6a1420'); }
    return cv(pb, 30, 40);
  }
  function paintFern(v, lean) {
    const s = [22, 27, 32][v], W = s * 2 + 18, H = Math.round(s * .95) + 12, pb = new PB(W, H), ox = W >> 1, oy = H - 3, n = 7 + v;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI * (.12 + .76 * (k / (n - 1))), len = s * (.72 + .28 * Math.sin(k / (n - 1) * Math.PI)), dr = 5 + Math.abs(Math.cos(a)) * 5, nx = -Math.sin(a), ny = Math.cos(a) * .82;
      for (let t = .08; t <= 1; t += 1 / len) {
        const x = ox + Math.cos(a) * len * t + lean * t * t * 7, y = oy + Math.sin(a) * len * t * .82 + dr * t * t;
        pb.px(x, y, '#2c4a30');
        if (t > .2 && Math.round(t * len) % 2 === 0) { const wl = (1 - t) * 4.4 + 1.2; for (let w = 1; w <= wl; w++) { pb.px(x + nx * w, y + ny * w - .4 * w, w > wl - 1 ? '#7aa860' : '#5a8a4e'); pb.px(x - nx * w, y - ny * w + .2 * w, w > wl - 1 ? '#5a8a4e' : '#4a7442'); } }
      }
    }
    return cv(pb, ox, oy);
  }
  function paintRock(v) {
    const rx = [11, 18, 30][v], ry = [8, 13, 21][v], W = rx * 2 + 6, H = ry * 2 + 8, pb = new PB(W, H), cx = W >> 1, cy = ry + 3;
    for (let j = -ry - 1; j <= ry + 1; j++) for (let i = -rx - 1; i <= rx + 1; i++) {
      const a = Math.atan2(j / ry, i / rx), q = Math.hypot(i / rx, j / ry) / (1 + (vnoise(Math.cos(a) * 1.6 + v * 5, Math.sin(a) * 1.6, 17) - .5) * .34); if (q > 1) continue;
      const l = (i / rx) * .55 - (j / ry) * .8 + (vnoise((cx + i) * .22, (cy + j) * .22, 5 + v) - .5) * .8;
      let c = l > .5 ? '#a09c94' : l > .05 ? '#807c76' : l > -.5 ? '#5e5a58' : '#444040';
      if (j < -ry * .25 && hash2(i + v * 9, j) > .52 && l > -.2) c = (i + j) % 3 ? '#5a7a4a' : '#4a6a40';
      if (q > 1 - 2 / Math.max(rx, ry)) c = '#1e1a1a';
      pb.px(cx + i, cy + j, c);
    }
    return cv(pb, cx, cy + Math.round(ry * .6));
  }
  function paintLog(len) {
    const W = len, pb = new PB(W, 30), r = 10, cy = 14;
    for (let x = 6; x < W - 10; x++) for (let j = -r; j <= r; j++) {
      const u = j / r; let c = u < -.45 ? '#6a5240' : u < .3 ? '#4f3e32' : '#33281f';
      if (gmod(x + Math.round(u * 3), 9) === 0) c = '#2a201a';
      if (u < -.3 && hash2(x, j) > .45) c = (x + j) % 3 ? '#4a6a3e' : '#5a7a4a';
      if (Math.abs(u) > .9) c = '#1a1412';
      pb.px(x, cy + j + Math.round(Math.sin(x * .09) * 1.2), c);
    }
    for (let j = -r; j <= r; j++) for (let i = -5; i <= 5; i++) { const q = (i / 5) ** 2 + (j / r) ** 2; if (q <= 1) pb.px(W - 10 + i, cy + j, q > .78 ? '#1a1412' : q > .5 ? '#b08a5a' : q > .22 ? '#8a6840' : '#a07a4c'); }
    pb.vl(5, cy - r + 2, cy + r - 2, '#1a1412');
    return cv(pb, W >> 1, cy + r - 1);
  }
  function paintStump() {
    const pb = new PB(44, 36), cx = 22;
    for (let y = 12; y < 32; y++) for (let i = -16; i <= 16; i++) { const w = 14 + (y > 26 ? (y - 26) * .5 : 0); if (Math.abs(i) > w) continue; let c = i < -6 ? '#3a2e26' : i > 5 ? '#2f2520' : '#4f3e32'; if (gmod(i, 5) === 0) c = '#2a201a'; if (Math.abs(i) > w - 1.2) c = '#1a1412'; if (y > 22 && i < 2 && hash2(i, y) > .6) c = '#4a6a3e'; pb.px(cx + i, y, c); }
    for (let j = -6; j <= 6; j++) for (let i = -15; i <= 15; i++) { const q = (i / 15) ** 2 + (j / 6) ** 2; if (q <= 1) pb.px(cx + i, 12 + j, q > .82 ? '#1a1412' : q > .55 ? '#b08a5a' : q > .25 ? '#8a6840' : '#a07a4c'); }
    pb.hl(cx - 14, cx + 14, 32, '#1a1412');
    return cv(pb, cx, 31);
  }
  function paintShroom() {
    const pb = new PB(28, 22);
    const one = (x, y, s) => { pb.rect(x - 1, y - 3 * s, 3, 3 * s + 1, '#e8dcc8'); pb.vl(x + 1, y - 3 * s, y, '#c4b49c'); pb.ellipse(x + .5, y - 4 * s, 3.4 * s, 2.2 * s, '#a8703e'); pb.ellipse(x + 1.5, y - 4 * s - .8, 2 * s, 1.1 * s, '#cc9860'); pb.hl(x - 3 * s + 1, x + 3 * s, y - 3 * s, '#5e3a1e'); };
    one(9, 18, 2); one(19, 19, 1.5); one(14, 20, 1);
    return cv(outline(pb, '#241812'), 14, 20);
  }
  function paintReed(v) {
    const pb = new PB(22, 32);
    for (const [dx, h, ln, c] of [[4, 20, -1, '#5a7a48'], [7, 26, 0, '#6a8c54'], [10, 22, 1, '#557446'], [13, 27, 0, '#6a8c54'], [16, 18, 1, '#5a7a48']]) { for (let k = 0; k < h; k++) pb.px(dx + Math.round(ln * k / h * 3), 30 - k, k > h - 3 ? '#8aa868' : c); if (v && dx % 6 === 1) pb.rect(dx + Math.round(ln * 3) - 1, 30 - h - 4, 2, 5, '#6a4428'); }
    return cv(pb, 10, 30);
  }
  function paintTent() {
    const s = 2.4, pb = new PB(240, 150), bx = 120, by = 140, O = '#2e2218', q = (x, y) => [bx + x * s, by + y * s], Q = p => p.map(a => q(a[0], a[1]));
    const Lp = Q([[-30, 0], [0, -34], [0, -52], [-30, -18]]), Rp = Q([[30, 0], [0, -34], [0, -52], [30, -18]]), F = Q([[-30, 0], [0, -34], [30, 0]]);
    pb.poly(Lp, '#8a7450'); pb.poly(Rp, '#b29a6a');
    for (let k = 1; k < 8; k++) { const a = q(-30, -k * 2.25), b = q(0, -34 - k * 2.25), c = q(30, -k * 2.25); pb.line(a[0], a[1], b[0], b[1], '#7a6646'); pb.line(c[0], c[1], b[0], b[1], '#9c8658'); }
    pb.poly(F, '#a38b5c');
    for (const x of [-14, 14]) { const ap = q(0, -34), l = q(x, 0); pb.line(ap[0], ap[1], l[0], l[1], '#8e784e'); }
    pb.poly(Q([[-11, 0], [0, -21], [11, 0]]), '#3a2216'); pb.poly(Q([[-8, 0], [0, -15], [8, 0]]), '#1e120c');
    for (const P of [Lp, Rp, F]) for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; pb.line(a[0], a[1], b[0], b[1], O); }
    for (const [a, b] of [[[-30, -18], [-44, -2]], [[30, -18], [44, -4]]]) { const A = q(a[0], a[1]), B = q(b[0], b[1]); pb.line(A[0], A[1], B[0], B[1], '#c8b48a'); pb.rect(B[0] - 1, B[1], 3, 4, O); }
    for (let k = 1; k < 9; k++) { const a = q(-30 + k * 3.3, -k * 3.75); pb.px(a[0] + 2, a[1], '#d8c8a0'); const b = q(30 - k * 3.3, -k * 3.75); pb.px(b[0] - 2, b[1], '#d8c8a0'); }
    pb.rect(bx - 40, by - 44, 9, 7, '#7a6646'); pb.frame(bx - 40, by - 44, 9, 7, '#5e4c34');
    return cv(pb, bx, by - 3);
  }
  function paintFire(fr) {
    const pb = new PB(46, 46), x = 23, y = 35;
    pb.ellipse(x, y, 14, 7, '#2e2622');
    for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, sx = Math.round(x + Math.cos(a) * 17), sy = Math.round(y + Math.sin(a) * 8); pb.ellipse(sx, sy + 1, 4.4, 3.2, '#1e1a18'); pb.ellipse(sx, sy, 3.6, 2.6, '#7a7470'); pb.hl(sx - 2, sx - 1, sy - 1, '#aca69e'); }
    const lg = (x0, y0, x1, y1) => { for (let k = -1; k <= 1; k++) pb.line(x0, y0 + k, x1, y1 + k, k ? '#1e1410' : '#6a4428'); pb.line(x0 + 1, y0 - 1, x1 - 1, y1 - 1, '#86603e'); };
    lg(x - 12, y + 3, x + 11, y - 3); lg(x - 11, y - 3, x + 12, y + 3);
    if (fr >= 0) {
      const w = [0, 1.5, -1.5][fr], h = [0, 3, -2][fr];
      pb.poly([[x - 9, y], [x - 6 + w, y - 13], [x - 2, y - 9], [x + w, y - 23 - h], [x + 3, y - 11], [x + 6 + w, y - 16 - h * .5], [x + 9, y]], '#e8642a');
      pb.poly([[x - 6, y], [x - 3 + w, y - 9], [x + w * .6, y - 15 - h * .6], [x + 3, y - 7], [x + 6, y]], '#ffb43a');
      pb.poly([[x - 3, y], [x + w * .4, y - 9 - h * .4], [x + 3, y]], '#fff2b0');
    }
    return cv(pb, x, y + 2);
  }
  const BIRDP = { c: '#5a3e2a', e: '#141010', o: '#c89040', b: '#8a6a4a', w: '#e0d6c4', t: '#4a3626', l: '#2a1c14', W: '#3e2e22' };
  const BIRD = { stand: ['...cc..', '..cceo.', 't.bbbw.', 'ttbbww.', '.tbbw..', '..l.l..'], peck: ['.......', 't......', 'ttbb...', '.tbbcc.', '..bwceo', '..l.l..'], fly1: ['.WWW...', 'tWWcc..', 'ttbceo.', '.tbbw..', '.......', '.......'], fly2: ['.......', 't..cc..', 'ttbceo.', '.WWbw..', '.WWW...', '.......'] };
  function paintBird(k) { const pb = new PB(9, 8); rows(pb, 1, 1, BIRD[k], BIRDP); return cv(pb, 4, 7); }
  function paintItem(k) {
    const pb = new PB(16, 16);
    if (k === 'shroom') { pb.rect(7, 8, 3, 6, '#e8dcc8'); pb.vl(9, 8, 13, '#c4b49c'); pb.ellipse(8.5, 6.5, 6, 4, '#a8703e'); pb.ellipse(9.5, 5.4, 3.4, 1.8, '#cc9860'); pb.hl(3, 13, 9, '#5e3a1e'); }
    else if (k === 'berry') { for (const [x, y] of [[5, 9], [10, 10], [8, 5]]) { pb.ellipse(x + .5, y + .5, 3, 3, '#b02a36'); pb.px(x, y - 1, '#f08a8a'); } pb.line(8, 2, 11, 1, '#3e6a3a'); pb.rect(10, 1, 3, 2, '#4a7a44'); }
    else if (k === 'bird') { pb.ellipse(8, 9, 5.4, 3.4, '#8a6a4a'); pb.ellipse(9, 10.4, 3.6, 1.8, '#e0d6c4'); pb.ellipse(12, 7.6, 2.4, 2.2, '#5a3e2a'); pb.px(14, 8, '#c89040'); pb.line(3, 9, 1, 11, '#4a3626'); pb.line(3, 10, 1, 12, '#4a3626'); }
    else {
      pb.ellipse(8, 9.5, 6, 4.6, '#3a3c44'); pb.rect(2, 6, 12, 4, '#3a3c44'); pb.ellipse(8, 6, 6, 2, '#5c5e6a'); pb.ellipse(8, 6, 4.4, 1.2, '#22242a');
      pb.rect(0, 6, 2, 2, '#2a2c32'); pb.rect(14, 6, 2, 2, '#2a2c32'); pb.vl(4, 8, 11, '#6e7080');
      if (k === 'pot_d') { pb.line(9, 8, 11, 12, '#16171c'); pb.line(11, 12, 10, 13, '#16171c'); pb.px(12, 9, '#16171c'); pb.rect(5, 12, 2, 1, '#7a4a2a'); }
      if (k === 'pot_f') for (const [x, y] of [[13, 2], [12, 3], [14, 3], [13, 4], [3, 3]]) pb.px(x, y, '#fff2b0');
    }
    return cv(outline(pb, '#1c1618'), 8, 13);
  }
  function sprites() {
    SP.tree = TR.map((r, i) => paintTrunk(r, [176, 190, 202, 214, 262][i], i * 3 + 1));
    SP.sap = [paintSap(0), paintSap(1)]; SP.bush = [paintBush(0), paintBush(1)]; SP.berry = [0, 1, 2, 3].map(n => paintBush(1, n));
    SP.fern = [0, 1, 2].map(v => [-1, 0, 1].map(l => paintFern(v, l)));
    SP.rock = [0, 1, 2].map(paintRock); SP.log = paintLog(124); SP.seat = paintLog(66); SP.stump = paintStump(); SP.shroom = paintShroom(); SP.reed = [paintReed(0), paintReed(1)];
    SP.tent = paintTent(); SP.fire = [-1, 0, 1, 2].map(paintFire);
    SP.bird = {}; for (const k in BIRD) SP.bird[k] = paintBird(k);
    SP.item = {}; for (const k of ['shroom', 'berry', 'bird', 'pot_d', 'pot', 'pot_f']) SP.item[k] = paintItem(k);
  }

  /* ---------- 땅 ---------- */
  const U = h => C(h);
  const G1 = U('#47684a'), G2 = U('#3d5a40'), G3 = U('#2f4632'), G4 = U('#5b7d55'), F1 = U('#3a5340'), F2 = U('#34493a'), FL = U('#5e4a34'), FG = U('#4a6a46'),
    D1 = U('#5f4a36'), D2 = U('#6e573f'), D3 = U('#4e3c2c'), D4 = U('#85705a'), DE = U('#4a5a3a'), DW = U('#54402e'),
    W1 = U('#27404e'), W2 = U('#2f4b5a'), W3 = U('#4a5e66'), WE = U('#1e2c36'), BK1 = U('#4a4034'), BK2 = U('#7a766e'), P1 = U('#2e4658'), P2 = U('#24384a'), PM = U('#3e3428');
  function tuft(pb, x, y, dark) { const c = dark ? '#557a4e' : '#62865a', t = dark ? '#7a9c6a' : '#88a878'; for (const [dx, h, ln] of [[-2, 4, -1], [-1, 6, 0], [0, 5, 1], [1, 7, 0], [2, 4, 1]]) for (let k = 0; k < h; k++) pb.px(x + dx + Math.round(ln * k / h * 2), y - k, k > h - 2 ? t : c); }
  function paintChunk(cx, cy) {
    const pb = new PB(CHK, CHK), X0 = cx * CHK, Y0 = cy * CHK, d = pb.d, mx = X0 + 128, my = Y0 + 128;
    const nT = fs(fTrail, mx, my) < 240, nB = fs(fBrook, mx, my) < 240, cl = CLEAR.filter(c => c[4] && Math.abs(mx - c[0]) < c[2] + 200 && Math.abs(my - c[1]) < c[3] + 200), pu = PUD.filter(p => Math.abs(mx - p.x) < p.rx + 170 && Math.abs(my - p.y) < p.ry + 170);
    for (let j = 0; j < CHK; j++) for (let i = 0; i < CHK; i++) {
      const x = X0 + i, y = Y0 + j, n = vnoise(x * .04, y * .05, 1), h = hash2(x + 31, y);
      let c = n > .56 ? G1 : G2; if (h > .95) c = G3; else if (h < .03) c = G4;
      const dt = fs(fTree, x, y);
      if (dt < 78 && dt / 78 + (vnoise(x * .09, y * .09, 9) - .5) * .5 < .6) { c = n > .5 ? F1 : F2; if (h > .94) c = FL; else if (h < .035) c = FG; }
      let dirt = false, edge = false;
      if (nT && fs(fTrail, x, y) < TW + 8) { const pd = trailD(x, y); if (pd < 0) { dirt = true; edge = pd > -3; } }
      for (const q of cl) { const e = clearD(x, y, q); if (e < 1) { dirt = true; edge = edge || e > .9; } }
      if (dirt) { const m = vnoise(x * .05, y * .07, 5); c = m > .6 ? D1 : m < .28 ? DW : D2; if (h > .96) c = D3; else if (h < .025) c = D4; if (edge && hash2(x, y + 9) > .5) c = DE; }
      if (nB && fs(fBrook, x, y) < BW + 16) { const bd = brookD(x, y); if (bd < 0) { c = bd < -9 ? W1 : W2; if (h > .965) c = W3; if (bd > -2.5) c = WE; } else if (bd < 7) c = h > .78 ? BK2 : BK1; }
      for (const p of pu) { if (Math.abs(x - p.x) > p.rx * 1.3 || Math.abs(y - p.y) > p.ry * 1.4) continue; const q = pudQ(x, y, p); if (q < 1) c = q > .72 ? P2 : P1; else if (q < 1.22) c = PM; }
      d[j * CHK + i] = c;
    }
    pb.ox = -X0; pb.oy = -Y0;
    for (const p of pu) { pb.hl(p.x - p.rx * .45, p.x - p.rx * .05, p.y - p.ry * .3, '#5a7690'); pb.hl(p.x + p.rx * .1, p.x + p.rx * .4, p.y + p.ry * .2, '#4a6680'); }
    {   // 개울을 건너는 통나무
      const a = BRIDGE[0], b = BRIDGE[1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      if (Math.abs(mx - (a[0] + b[0]) / 2) < 300 && Math.abs(my - (a[1] + b[1]) / 2) < 300) for (let t = -6; t <= L + 6; t += .5) for (let w = -8; w <= 8; w += .5) {
        const x = Math.round(a[0] + ux * t - uy * w), y = Math.round(a[1] + uy * t + ux * w), k = w / 8;
        let c = k < -.4 ? '#6a5240' : k < .35 ? '#55443a' : '#33281f'; if (gmod(Math.round(t) + Math.round(k * 3), 9) === 0) c = '#2a201a'; if (k < -.2 && hash2(Math.round(t), Math.round(w)) > .6) c = '#4a6a3e'; if (Math.abs(k) > .88 || t < -5 || t > L + 5) c = '#1a1412';
        pb.px(x, y, c);
      }
    }
    for (let gj = Math.floor((Y0 - 12) / 22); gj <= Math.floor((Y0 + CHK + 12) / 22); gj++) for (let gi = Math.floor((X0 - 12) / 22); gi <= Math.floor((X0 + CHK + 12) / 22); gi++) {
      const hh = hash2(gi * 7.1 + 3, gj * 3.7 + 1); if (hh > .62) continue;
      const x = Math.round(gi * 22 + hash2(gi, gj + 50) * 20), y = Math.round(gj * 22 + hash2(gi + 50, gj) * 20), t = terr(x, y);
      if (t === 0) { if (hh < .36) tuft(pb, x, y, hh < .13); else if (hh < .42 && ((x - 1780) / 200) ** 2 + ((y - 1380) / 130) ** 2 < 1) { pb.px(x, y, '#f0e8d0'); pb.px(x - 1, y + 1, '#f0e8d0'); pb.px(x + 1, y + 1, '#f0e8d0'); pb.px(x, y + 1, '#e8c060'); pb.px(x, y + 2, '#4a7442'); } }
      else if (t === 1) { if (hh < .1) { pb.rect(x, y, 3, 2, '#8a847c'); pb.px(x, y, '#aaa49c'); pb.hl(x, x + 2, y + 2, '#2a2420'); } else if (hh < .14) tuft(pb, x, y, true); }
      else if (t === 3) { if (hh < .2) { const c = hh < .1 ? '#8a6a3a' : '#6e5230'; pb.hl(x, x + 2, y, c); pb.px(x + 1, y - 1, c); pb.px(x + 1, y + 1, '#4a3822'); } else if (hh < .3) tuft(pb, x, y, true); }
    }
    near(buckets, mx, my, 256, 8, p => {   // 밑그림자 (빛이 오른쪽 위에서 오므로 왼쪽 아래로)
      const sh = p.t === 'tree' ? [TR[p.v] * 1.7, TR[p.v] * .52, -TR[p.v] * .5, 3] : p.t === 'rock' ? [[13, 20, 33][p.v], [4, 6, 9][p.v], -4, 1] : p.t === 'sap' ? [16, 5, -6, 1] : p.t === 'bush' || p.t === 'berry' ? [27, 7, -3, 1] : p.t === 'log' ? [60, 6, -3, 2] : p.t === 'stump' ? [19, 6, -3, 1] : p.t === 'fern' ? [14, 4, 0, 0] : null;
      if (!sh) return;
      for (let j = -sh[1]; j <= sh[1]; j++) for (let i = -sh[0]; i <= sh[0]; i++) if ((i / sh[0]) ** 2 + (j / sh[1]) ** 2 <= 1) pb.tint(p.x + sh[2] + i, p.y + sh[3] + j, p.t === 'fern' ? .22 : .36, '#141016');
    });
    pb.ox = pb.oy = 0;
    return pb.canvas();
  }
  function chunk(cx, cy) { const k = cy * 64 + cx; let c = chunks.get(k); if (!c) chunks.set(k, c = paintChunk(cx, cy)); return c; }
  function gen(seed) {
    rnd = RNG(seed || 7); props = []; chunks.clear();
    fTrail = polyField(TRAIL); fBrook = polyField(BROOK); fTree = new Float32Array(FW * FH).fill(999);
    place();
    for (const p of props) if (p.t === 'tree') { const r = TR[p.v]; for (let j = Math.max(0, ((p.y - 130) / FS) | 0); j <= Math.min(FH - 1, ((p.y + 130) / FS) | 0); j++) for (let i = Math.max(0, ((p.x - 150) / FS) | 0); i <= Math.min(FW - 1, ((p.x + 150) / FS) | 0); i++) { const dd = Math.hypot(i * FS - p.x, (j * FS - p.y) * 1.5) - r, o = j * FW + i; if (dd < fTree[o]) fTree[o] = dd; } }
    index(); sprites();
  }
  return { WW, WH, CHK, PUD, START, BRIDGE, TRAIL, BROOK, TR, SP, gen, chunk, terr, wet, push, hitSolid, ray, path, walkable, clearLine, nearestOpen, onBridge, navAt: (x, y) => { const i = (x / NS) | 0, j = (y / NS) | 0; return i < 0 || j < 0 || i >= NW || j >= NH ? 1 : nav[j * NW + i]; }, hasChunk: (cx, cy) => chunks.has(cy * 64 + cx),
    near: (x, y, r, fn) => near(buckets, x, y, r, 8, fn), get props() { return props; }, get forage() { return forage; }, get covers() { return covers; }, get solids() { return solids; } };
})();
