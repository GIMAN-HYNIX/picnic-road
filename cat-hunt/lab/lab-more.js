'use strict';
/* =========================================================
   칼질 실험실 · 한 장 그리기와 비교용 '지난 시안'
   ========================================================= */
const _wpb = new PB(W_W, W_H), _wsm = new PB(W_W, W_H);
// 한 장을 픽셀로 찍고, 빈 둘레를 잘라 낸 캔버스와 그 위치를 돌려줌 { cv, x, y }
function wRender(F, o = {}) {
  if (F.old) { const R = HR.reset(1, W_OX + F.old.x, W_OY); KN_VAR = 0; manDraw(R, F.old.anim, F.old.fr, 's', {}); rasterHi(_wpb, R, G_ST); }
  else { const R = HR.reset(1, W_OX, W_OY); wDraw(R, F); rasterHi(_wpb, R, G_ST); }
  const d = _wpb.d, W = W_W, H = W_H;
  if (F.smear && o.smear !== false) {   // 칼 잔상은 몸 뒤에 깔림
    _wsm.clear(); const sm = F.smear, T = p => [W_OX + p[0] * W_S, W_OY + p[1] * W_S], n = sm.tips.length, h = Math.floor(n / 2);
    _wsm.poly(sm.tips.map(T).concat(sm.inner.slice().reverse().map(T)), '#d3dcec');
    const mid = sm.tips.map((p, i) => { const q = sm.inner[i], k = .5 + .32 * i / (n - 1); return [q[0] + (p[0] - q[0]) * k, q[1] + (p[1] - q[1]) * k]; });
    _wsm.poly(sm.tips.slice(h).map(T).concat(mid.slice(h).reverse().map(T)), '#ffffff');
    const s = _wsm.d; for (let i = 0; i < d.length; i++) if (!(d[i] >>> 24) && (s[i] >>> 24)) d[i] = s[i];
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[y * W + x] >>> 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; }
  const [cv, g] = makeCanvas(x1 - x0 + 1, y1 - y0 + 1); g.putImageData(_wpb.img, -x0, -y0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  return { cv, x: x0, y: y0 };
}
// 확인용: 잘라 내지 않은 전체 캔버스
function wRenderFull(F, o) { const s = wRender(F, o), [cv, g] = makeCanvas(W_W, W_H); g.drawImage(s.cv, s.x, s.y); return cv; }

/* ---------- 지난 시안 1 '바른 검술' (비교 기준) ---------- */
const OLD_KT = [[.09, .09, .18], [.07, .09, .18], [.17, .1, .32]], OLD_STEP = [10, 10, 18];
function oldPose(T) {
  const ez = x => 1 - (1 - x) * (1 - x), sm = x => x * x * (3 - 2 * x);
  let t = T, x = 0;
  for (let c = 0; c < 3; c++) {
    const K = OLD_KT[c], full = K[0] + K[1] + K[2], len = c < 2 ? K[0] + K[1] + .1 : full + .5;
    if (t < len) {
      const tt = Math.min(t, full); let u;
      if (tt < K[0]) u = ez(tt / K[0]); else if (tt < K[0] + K[1]) u = 1 + 2 * ez((tt - K[0]) / K[1]); else { const r = Math.min(1, (tt - K[0] - K[1]) / K[2]); u = r < .4 ? 3 + ez(r / .4) : 4 + sm((r - .4) / .6); }
      const fr = Math.round(u * KN_SUB), step = OLD_STEP[c] * (tt < K[0] ? -.25 * tt / K[0] : ez(Math.min(1, (tt - K[0]) / K[1])));
      return { anim: 'knife' + (c + 1) + (c > 0 && fr < KN_SUB ? 'c' : ''), fr, x: Math.round(x + step) };
    }
    t -= len; x += OLD_STEP[c];
  }
  return { anim: 'knife3', fr: KN_N - 1, x: 38 };
}
const OLD_T0 = [0, OLD_KT[0][0] + OLD_KT[0][1] + .1, OLD_KT[0][0] + OLD_KT[0][1] + .1 + OLD_KT[1][0] + OLD_KT[1][1] + .1];
VARIANTS.unshift({
  id: 'O', old: true, N: 112,
  hits: [['정면 내려베기', 0], ['가로베기', 1], ['찌르기', 2]].map(([name, c]) => ({ name, cuts: [.01, .5, 1, 1.5, 2.2, 4].map(k => Math.round((OLD_T0[c] + (k <= 1 ? k * OLD_KT[c][0] : k <= 2 ? OLD_KT[c][0] + (k - 1) * OLD_KT[c][1] : OLD_KT[c][0] + OLD_KT[c][1] + (k - 2) / 3 * OLD_KT[c][2])) * 60)) })),
});
const _wBake = wBake;
wBake = function (V, body) {
  if (!V.old) return _wBake(V, body);
  const out = []; for (let f = 0; f < V.N; f++) out.push({ old: oldPose(f / 60), f });
  return out;
};
