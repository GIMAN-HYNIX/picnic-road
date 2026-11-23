'use strict';
/* 그리기: 한 장을 픽셀 캔버스로 */
const _wpb = new PB(W_W, W_H), _wsm = new PB(W_W, W_H);
function wRender(F, o = {}) {
  const R = HR.reset(1, W_OX, W_OY); wDraw(R, F); rasterHi(_wpb, R, G_ST);
  const [cv, g] = makeCanvas(W_W, W_H);
  if (F.smear && o.smear !== false) {
    _wsm.clear(); const sm = F.smear, T = p => [W_OX + p[0] * W_S, W_OY + p[1] * W_S], n = sm.tips.length;
    _wsm.poly(sm.tips.map(T).concat(sm.inner.slice().reverse().map(T)), '#dfe6f2');
    const mid = sm.tips.map((p, i) => { const q = sm.inner[i], k = .55 + .3 * i / (n - 1); return [q[0] + (p[0] - q[0]) * k, q[1] + (p[1] - q[1]) * k]; });
    _wsm.poly(sm.tips.slice(Math.floor(n / 2)).map(T).concat(mid.slice(Math.floor(n / 2)).reverse().map(T)), '#ffffff');
    g.putImageData(_wsm.img, 0, 0);
    const [c2, g2] = makeCanvas(W_W, W_H); g2.putImageData(_wpb.img, 0, 0); g.drawImage(c2, 0, 0);
  } else g.putImageData(_wpb.img, 0, 0);
  return cv;
}
