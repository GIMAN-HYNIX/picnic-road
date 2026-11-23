'use strict';
/* =========================================================
   칼질 실험실 · 뼈대 몸
   자세 값(엉덩이 · 허리 · 가슴 돌림 · 발 · 칼)에서 관절을 풀고(IK) 방랑자를 그림
   단위는 g-man.js와 같음: 발 가운데가 원점, 위가 -y, 오른쪽을 봄. 화면엔 2배로 찍음
   가까운 쪽 = 오른팔 · 오른다리 (오른손이 코등이 쪽, 왼손이 자루 끝)
   ========================================================= */
const W_W = 344, W_H = 224, W_OX = 84, W_OY = 210, W_S = 2;
// 체형 두 가지: 지금 게임 비율 / 팔다리가 길고 가는 사람 비율
const W_BODY = {
  classic: { L1: 13.1, L2: 10.9, UA: 8.6, FA: 8.6, sp1: 7.5, sp2: 10.5, SW: 4.6, HW: 2.2, th: [3.1, 2.7], sh: [2.7, 2.3], ua: [2.4, 2], fa: [1.9, 1.5], ch: 4.6 },
  human: { L1: 15.4, L2: 13.4, UA: 9.8, FA: 9.4, sp1: 7.6, sp2: 10.6, SW: 5, HW: 2.4, th: [3, 2.2], sh: [2.3, 1.6], ua: [2.2, 1.7], fa: [1.7, 1.25], ch: 4.4 },
};
// 자세 채널
const W_CH = ['hx', 'hy', 'lean', 'bend', 'pyaw', 'cy', 'head', 'nx', 'ny', 'na', 'fx', 'fy', 'fa', 'gx', 'gy', 'a', 'bl', 'ed', 'el', 'sq'];
const W_GUARD = { hx: 0, hy: -24.8, lean: .1, bend: .04, pyaw: 0, cy: .2, head: -.02, nx: 7, ny: -2.2, na: 0, fx: -6, fy: -2.2, fa: .12, gx: 8, gy: 9.5, a: -.8, bl: 1, ed: 1, el: 0, sq: 0 };
const W_BLADE = 25, W_HILT = 7.4;
const wu = a => [Math.sin(a), -Math.cos(a)];

function wKnee(hip, an, B) {
  const tx = an[0], ty = an[1] - 2, dx = tx - hip[0], dy = ty - hip[1], d0 = Math.hypot(dx, dy), d = Math.min(d0, B.L1 + B.L2 - .05), a = Math.atan2(dy, dx);
  const b = Math.acos(clamp((B.L1 * B.L1 + d * d - B.L2 * B.L2) / (2 * B.L1 * d), -1, 1));
  return [hip[0] + Math.cos(a - b) * B.L1, hip[1] + Math.sin(a - b) * B.L1];
}
// 팔꿈치: 어깨–손 축을 중심으로 도는 것까지 흉내 (옆에서 보면 팔이 짧아 보이는 순간이 생김)
function wElbow(S, H, B, bias) {
  const L1 = B.UA, L2 = B.FA, dx = H[0] - S[0], dy = H[1] - S[1], d0 = Math.hypot(dx, dy) || 1e-3, d = clamp(d0, .6, L1 + L2 - .02);
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a)), ux = dx / d0, uy = dy / d0, px = -uy, py = ux;
  const sg = Math.tanh((py + .35 * px + (bias || 0)) * 4);
  return [S[0] + ux * a + px * h * sg, S[1] + uy * a + py * h * sg];
}
// 자세 → 관절 위치
function wSolve(p, B) {
  const kL = (B.L1 + B.L2) / 24, kA = (B.UA + B.FA) / 17.2, S = { p, B };
  const hip = S.hip = [p.hx * kL, -(B.L1 + B.L2 + 4.2) + (p.hy + 28.2) * kL];
  // 다리가 닿지 않을 만큼 엉덩이가 높으면 닿는 데까지 내림
  for (let it = 0; it < 3; it++) for (const [fx, fy] of [[p.nx * kL - p.pyaw * -B.HW, -2.2 + (p.ny + 2.2) * kL], [p.fx * kL - p.pyaw * B.HW, -2.2 + (p.fy + 2.2) * kL]]) {
    const dx = fx - hip[0], dy = fy - 2 - hip[1], d = Math.hypot(dx, dy), mx = B.L1 + B.L2 - .15;
    if (d > mx && dy > 0) hip[1] += Math.min(d - mx, 3) * 1.05;
  }
  const a1 = p.lean, a2 = p.lean + p.bend, u1 = wu(a1), uc = wu(a2), fw = [Math.cos(a2), Math.sin(a2)];
  S.a1 = a1; S.a2 = a2; S.fw = fw;
  const W = S.W = [hip[0] + u1[0] * B.sp1, hip[1] + u1[1] * B.sp1];
  const SC = S.SC = [W[0] + uc[0] * (B.sp2 - 1.6), W[1] + uc[1] * (B.sp2 - 1.6)];
  const NK = S.NK = [W[0] + uc[0] * B.sp2, W[1] + uc[1] * B.sp2];
  S.sN = [SC[0] - p.cy * B.SW * fw[0], SC[1] - p.cy * B.SW * fw[1] + .7];
  S.sF = [SC[0] + p.cy * B.SW * fw[0], SC[1] + p.cy * B.SW * fw[1] + .3];
  S.hN = [hip[0] - p.pyaw * B.HW, hip[1]]; S.hF = [hip[0] + p.pyaw * B.HW, hip[1]];
  const hu = wu(a2 * .45 + p.head);
  S.head = [NK[0] + hu[0] * 4 + 1.1, NK[1] + hu[1] * 4]; S.tilt = a2 * .5 + p.head + .04;
  S.aN = [p.nx * kL, -2.2 + (p.ny + 2.2) * kL]; S.aF = [p.fx * kL, -2.2 + (p.fy + 2.2) * kL];
  S.kN = wKnee(S.hN, S.aN, B); S.kF = wKnee(S.hF, S.aF, B);
  // 칼이 화면 쪽으로 향할 때(bl이 1보다 작을 때)는 살짝 아래로 처져 보임: 가로베기가 납작한 타원을 그림
  const G = S.G = [SC[0] + p.gx * kA, SC[1] + p.gy * kA], c = Math.cos(p.a) * p.bl, s = Math.sin(p.a) * p.bl + .3 * Math.sqrt(Math.max(0, 1 - p.bl * p.bl));
  S.dir = [c, s]; S.sAng = Math.atan2(s, c); S.sLen = Math.hypot(c, s);
  S.handN = [G[0] - c * 1.6, G[1] - s * 1.6]; S.handF = [G[0] - c * 6, G[1] - s * 6];
  S.tip = [G[0] + c * (W_BLADE + 2), G[1] + s * (W_BLADE + 2)];
  S.eN = wElbow(S.sN, S.handN, B, p.el); S.eF = wElbow(S.sF, S.handF, B, p.el);
  // 닿지 않는 자세를 찾는 용도
  S.over = Math.max(Math.hypot(S.handN[0] - S.sN[0], S.handN[1] - S.sN[1]) - B.UA - B.FA, Math.hypot(S.handF[0] - S.sF[0], S.handF[1] - S.sF[1]) - B.UA - B.FA,
    Math.hypot(S.aN[0] - S.hN[0], S.aN[1] - 2 - S.hN[1]) - B.L1 - B.L2, Math.hypot(S.aF[0] - S.hF[0], S.aF[1] - 2 - S.hF[1]) - B.L1 - B.L2);
  return S;
}

/* ---------- 우비 자락 (천 시뮬레이션) ----------
   세 줄 × 여섯 칸의 점을 실로 엮어 목덜미와 어깨에 매닮. 몸이 움직이면 끌려오고, 멈추면 흔들리다 가라앉음 */
const CL_R = 8, CL_C = 3, CL_SEG = 3.75;
const clW = r => 3 + r * .64;                // 줄 사이 간격 (아래로 갈수록 넓어짐)
function clRoots(S) {
  const NK = S.NK, fw = S.fw, uc = wu(S.a2);
  const b = [NK[0] - fw[0] * 3.4 - uc[0] * .5, NK[1] - fw[1] * 3.4 - uc[1] * .5], f = [S.sN[0] + fw[0] * .6 - uc[0] * 1.2, S.sN[1] + fw[1] * .6 - uc[1] * 1.2];
  // 뿌리 세 점: 목덜미 뒤 → 가운데 → 가까운 어깨
  const d = Math.hypot(f[0] - b[0], f[1] - b[1]);
  if (d < 3) { f[0] = b[0] + fw[0] * 3; f[1] = b[1] + fw[1] * 3; }
  return [b, [(b[0] + f[0]) / 2, (b[1] + f[1]) / 2 - .4], f];
}
function clInit(S) {
  const rt = clRoots(S), P = [], O = [];
  for (let r = 0; r < CL_R; r++) for (let c = 0; c < CL_C; c++) { const x = rt[1][0] - 1.5 * r * .5 + (c - 1) * clW(r), y = rt[c][1] + r * CL_SEG; P.push([x, y]); O.push([x, y]); }
  return { P, O };
}
function clStep(cl, S, dt, grav = 460, drag = 2.6) {
  const P = cl.P, O = cl.O, rt = clRoots(S), k = Math.exp(-drag * dt);
  for (let i = CL_C; i < P.length; i++) {
    const p = P[i], o = O[i], vx = (p[0] - o[0]) * k, vy = (p[1] - o[1]) * k;
    o[0] = p[0]; o[1] = p[1]; p[0] += vx; p[1] += vy + grav * dt * dt;
  }
  for (let c = 0; c < CL_C; c++) { O[c][0] = P[c][0]; O[c][1] = P[c][1]; P[c][0] = rt[c][0]; P[c][1] = rt[c][1]; }
  const hip = S.hip, SC = S.SC, link = (i, j, L, st) => {
    const a = P[i], b = P[j], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-3, f = (d - L) / d * st, wa = i < CL_C ? 0 : j < CL_C ? 1 : .5, wb = j < CL_C ? 0 : i < CL_C ? 1 : .5;
    a[0] += dx * f * wa; a[1] += dy * f * wa; b[0] -= dx * f * wb; b[1] -= dy * f * wb;
  };
  for (let it = 0; it < 8; it++) {
    for (let r = 0; r < CL_R; r++) for (let c = 0; c < CL_C; c++) {
      const i = r * CL_C + c;
      if (r + 1 < CL_R) link(i, i + CL_C, CL_SEG, 1);
      if (c + 1 < CL_C && r > 0) link(i, i + 1, clW(r), .7);
      if (r + 1 < CL_R && c + 1 < CL_C) { link(i, i + CL_C + 1, Math.hypot(CL_SEG, (clW(r) + clW(r + 1)) / 2 + .3), .25); link(i + 1, i + CL_C, Math.hypot(CL_SEG, (clW(r) + clW(r + 1)) / 2 - .3), .25); }
    }
    // 몸을 뚫고 앞으로 넘어가지 않게: 등줄기(엉덩이–어깨 선)보다 조금 앞까지만
    for (let i = CL_C; i < P.length; i++) {
      const p = P[i], c = i % CL_C, t = clamp((p[1] - SC[1]) / (hip[1] - SC[1] || 1), 0, 1.6), bx = SC[0] + (hip[0] - SC[0]) * Math.min(t, 1) + (c - 1) * 2.2 + 1.5;
      if (p[0] > bx) p[0] += (bx - p[0]) * .6;
      if (p[1] > -1) p[1] = -1;
    }
  }
}
function clCopy(cl) { return { P: cl.P.map(p => p.slice()), O: cl.O.map(p => p.slice()) }; }

/* ---------- 부품 ---------- */
function wLeg(R, hip, kn, an, far, g, bootAng, B) {
  const o = far ? { g, b: -.15 } : { g, ol: 2 };
  R.K2(hip[0], hip[1], kn[0], kn[1], B.th[0], B.th[1], MANP.TRO, o);
  R.K2(kn[0], kn[1], an[0], an[1] - 2, B.sh[0], B.sh[1], MANP.TRO, o);
  mBoot(R, an[0], an[1], bootAng, g + 'b', far);
}
function wArmU(R, S, E, far, g, B) { R.K2(S[0], S[1], E[0], E[1], B.ua[0], B.ua[1], MANP.SHIRT, far ? { g, b: -.15 } : { g, ol: 1 }); }
function wArmL(R, E, H, far, g, B) {
  const o = far ? { g, b: -.15 } : { g, ol: 1 }, mx = lerp(E[0], H[0], .58), my = lerp(E[1], H[1], .58);
  R.K2(E[0], E[1], H[0], H[1], B.fa[0], B.fa[1], MANP.SHIRT, o);
  R.K2(mx, my, lerp(E[0], H[0], .9), lerp(E[1], H[1], .9), B.fa[1] + .45, B.fa[1] + .3, MANP.LEA, far ? { g: g + 'c', b: -.15 } : { g: g + 'c', ol: 1 });   // 가죽 손목 보호대
  R.E(H[0], H[1], 1.7, 1.5, 0, MANP.SKIN, { g: g + 'h', ol: 1 });
}
function wSword(R, G, ang, bl, ed) {
  const c = Math.cos(ang) * bl, s = Math.sin(ang) * bl, nx = -Math.sin(ang) * ed, ny = Math.cos(ang) * ed, at = (d, w) => [G[0] + c * d + nx * w, G[1] + s * d + ny * w];
  const L = W_BLADE;
  R.P([at(1.5, -1.5), at(L - 5, -1.4), at(L - 1.6, -.5), at(L + 2, 1.1), at(1.5, 1.6)], MANP.BLADE, { g: 'kb', ol: 1 });
  const f0 = at(3.5, -.5), f1 = at(L - 5, -.4); R.DL(f0[0], f0[1], f1[0], f1[1], MANP.BLADE[0]);
  const g0 = [G[0] + c * 1.1 - Math.sin(ang) * 2.9, G[1] + s * 1.1 + Math.cos(ang) * 2.9], g1 = [G[0] + c * 1.1 + Math.sin(ang) * 2.9, G[1] + s * 1.1 - Math.cos(ang) * 2.9];
  R.K2(g0[0], g0[1], g1[0], g1[1], .85, .85, ['#8a6a20', '#d8b040', '#fff0a0'], { g: 'kg', ol: 1 });
  const a = at(-W_HILT, 0), b = at(.6, 0); R.K2(a[0], a[1], b[0], b[1], 1.1, 1.1, MANP.LEA, { g: 'kh', ol: 1 });
  const p = at(-W_HILT - .7, 0); R.E(p[0], p[1], 1.25, 1.25, 0, ['#8a6a20', '#d8b040', '#fff0a0'], { g: 'kp', ol: 1 });
}
// 꺾은선을 둥글게 (점 사이를 곡선으로 채움)
function wRound(pts, n = 3) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], d = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([.5 * (2 * b[0] + (c[0] - a[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (3 * b[0] - a[0] - 3 * c[0] + d[0]) * t3), .5 * (2 * b[1] + (c[1] - a[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (3 * b[1] - a[1] - 3 * c[1] + d[1]) * t3)]); }
  }
  out.push(pts[pts.length - 1]); return out;
}
function wCape(R, cl) {
  const M = MANP, P = cl.P, at = (r, c) => P[r * CL_C + c], L = [], Rt = [], n = CL_R - 1;
  for (let r = 0; r < CL_R; r++) { L.push(at(r, 0)); Rt.push(at(r, 2)); }
  // 밑단 가운데는 조금 더 처져서 자락 끝이 둥글게
  const h0 = at(n, 0), h2 = at(n, 2), m0 = at(n, 1), m1 = at(n - 1, 1), ex = m0[0] - m1[0], ey = m0[1] - m1[1], el = Math.hypot(ex, ey) || 1, h1 = [m0[0] + ex / el * 1.6, m0[1] + ey / el * 1.6];
  const hem = wRound([h0, h1, h2], 3), pts = wRound(L).concat(hem.slice(1, -1), wRound(Rt).reverse());
  const dSeg = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l, 0, 1); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
  const dHem = (x, y) => { let d = 99; for (let i = 0; i < hem.length - 1; i++) d = Math.min(d, dSeg(x, y, hem[i], hem[i + 1])); return d; };
  R.P(pts, M.PON, R.pat({ g: 'cape', ol: 1, alts: [M.TRIM], alt: (x, y) => (dHem(x, y) < 2 ? 0 : -1) }));
  // 주름: 가운데 줄을 따라 어두운 선
  const D = [M.PON[0], M.PON[0], M.PON[0]], mid = [];
  for (let r = 1; r < CL_R; r++) mid.push([lerp(at(r, 1)[0], at(r, 0)[0], .15), at(r, 1)[1]]);
  const mr = wRound(mid, 2); for (let i = 0; i < mr.length - 2; i++) R.K2(mr[i][0], mr[i][1], mr[i + 1][0], mr[i + 1][1], .4, .4, D, { g: 'cape', flat: 0 });
}
function wTorso(R, S) {
  const M = MANP, hip = S.hip, W = S.W, SC = S.SC, p = S.p, B = S.B, yw = Math.abs(p.cy), u1 = wu(S.a1), f1 = [Math.cos(S.a1), Math.sin(S.a1)], fw = S.fw, uc = wu(S.a2);
  R.E(hip[0], hip[1] + 1, 4.3 + Math.abs(p.pyaw) * .8, 3.2, 0, M.TRO, { g: 'seat', ol: 1 });
  R.K2(hip[0] + u1[0] * 1.2, hip[1] + u1[1] * 1.2, W[0], W[1], 4.1, 3.8, M.SHIRT, { g: 'body', ol: 1 });
  R.K2(W[0], W[1], SC[0] - uc[0] * 2.2, SC[1] - uc[1] * 2.2, 3.9, B.ch + yw * 1.5, M.SHIRT, { g: 'body', ol: 1 });
  const bc = [hip[0] + u1[0] * 2.2, hip[1] + u1[1] * 2.2];
  R.K2(bc[0] - f1[0] * 4.2, bc[1] - f1[1] * 4.2, bc[0] + f1[0] * 4.4, bc[1] + f1[1] * 4.4, 1.1, 1.1, M.LEA, { g: 'belt', ol: 1 }); R.stamp(bc[0] + f1[0] * 3.6, bc[1] + f1[1] * 3.6, ['b'], M_BRASS);
  R.E(hip[0] - 2.6, hip[1] + 1.8, 2, 2.4, 0, M.LEA, { g: 'pouch', ol: 1 });
  const sw = S.sheath || 0, sa = S.a1 + .5 + sw;   // 빈 칼집은 허리에서 덜렁거림
  R.K2(bc[0] + 1.4, bc[1] + 1.2, bc[0] + 1.4 - Math.sin(sa) * 10.5, bc[1] + 1.2 + Math.cos(sa) * 10.5, 1.5, 1, M.BOOT, { g: 'sheath', ol: 1 });
  // 가슴을 가로지르는 총 멜빵: 몸을 틀면 위치가 달라져 가슴이 도는 게 보임
  const top = [SC[0] + fw[0] * (2.6 - p.cy * 1.6), SC[1] + fw[1] * (2.6 - p.cy * 1.6) + 1], bot = [W[0] - f1[0] * (3 + p.cy * .6), W[1] - f1[1] * 3 + 1.2];
  R.K2(top[0], top[1], bot[0], bot[1], .75, .75, M.LEA, { g: 'sling', ol: 1 });
}
// 목에 두른 우비 깃과 두건 뭉치
function wCollar(R, S) {
  const M = MANP, NK = S.NK, fw = S.fw, uc = wu(S.a2), sN = S.sN;
  const b = [NK[0] - fw[0] * 3.4, NK[1] - fw[1] * 3.4], f = [NK[0] + fw[0] * 3.6 - uc[0] * -2.6, NK[1] + fw[1] * 3.6 - uc[1] * -2.6];
  R.E(b[0] - uc[0] * 1, b[1] - uc[1] * 1 + .8, 3.2, 2.6, S.a2 - .3, M.PON, { g: 'hood', ol: 1 });
  R.K2(b[0], b[1] + 1.2, sN[0] - uc[0] * 1.6, sN[1] - uc[1] * 1.6, 2.3, 2.5, M.PON, { g: 'pon', ol: 1 });
  R.K2(sN[0] - uc[0] * 1.6, sN[1] - uc[1] * 1.6, f[0], f[1], 2.5, 1.7, M.PON, { g: 'pon', ol: 1 });
}
function wRifle(R, S) {
  const SC = S.SC, a = S.a2 + (S.rifle || 0), c = Math.cos(a), s = Math.sin(a), at = (x, y) => [SC[0] + x * c - y * s, SC[1] + x * s + y * c];
  const b = at(-8.5, 22), m = at(-4.6, -12.5); mRifle(R, b[0], b[1], m[0], m[1]);
}

/* ---------- 한 장 그리기 ---------- */
// F = { S: wSolve 결과, cl: 천, hat: 모자 흔들림 }, o.bones: 뼈대만
function wDraw(R, F) {
  const S = F.S, p = S.p, B = S.B;
  S.rifle = F.rifle || 0; S.sheath = F.sheath || 0;
  R.scl(W_S);
  if (p.sq) { const m = R.m, k = 1 + p.sq; m[2] *= k; m[3] *= k; m[0] /= Math.sqrt(k); m[1] /= Math.sqrt(k); }   // 눌림 · 늘어남
  if (F.cl) wCape(R, F.cl);
  wRifle(R, S);
  wArmU(R, S.sF, S.eF, true, 'uf', B);
  wLeg(R, S.hF, S.kF, S.aF, true, 'lf', p.fa, B);
  wLeg(R, S.hN, S.kN, S.aN, false, 'ln', p.na, B);
  wTorso(R, S);
  wCollar(R, S);
  mHeadS(R, S.head, S.tilt); mHatS(R, S.head, S.tilt + .04 + (F.hat || 0));
  wArmL(R, S.eF, S.handF, true, 'af', B);
  wSword(R, S.G, S.sAng, S.sLen, p.ed);
  R.E(S.sN[0], S.sN[1] + .4, B.ua[0] + .5, B.ua[0] + .3, 0, MANP.SHIRT, { g: 'un' });
  wArmU(R, S.sN, S.eN, false, 'un', B);
  wArmL(R, S.eN, S.handN, false, 'an', B);
}
