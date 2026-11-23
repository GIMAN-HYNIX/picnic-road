'use strict';
/* =========================================================
   물그림자 (임시 디자인: 냄비를 품은 물방울 몸)
   정식 몬스터 · 물건 목록은 따로 설계함. 여기서는 설정 노트의 규칙만 지킴
   - 물로 된 몸이라 속의 물건이 비쳐 보임   - 눈은 늘 반쯤 감겨 있음
   상태: idle · move · windup(덮치기 전 웅크림) · lunge · recover · spit · hit · stagger(흐트러짐) · emerge · dissolve
   ========================================================= */
const FOEP = { W: ['#3e6884', '#6a9cc0', '#a8d0e8'], WD: ['#2c4c64', '#4e7c9c', '#7aa8c8'], POT: ['#35556c', '#4a6e88', '#6a90aa'], POTR: ['#2c485c', '#3e6078', '#587e98'] };
const FOE_W = 96, FOE_H = 76, FOE_OX = 48, FOE_OY = 68, FOE_N = { idle: 4, move: 6, windup: 3, lunge: 2, recover: 2, spit: 3, hit: 1, stagger: 4, emerge: 5, dissolve: 5 };
const FOE_EYE = { k: '#1c3448', w: '#e8f6ff', B: '#1c3448', G: '#ffffff' };
function foeDraw(R, st, fr, o = {}) {
  const P = FOEP, k = o.k || 1;
  let sx = 1, sy = 1, lean = 0, eye = 'half', step = 0, sink = 0, hi = true;
  if (st === 'idle') sy = 1 + [0, .03, .05, .03][fr % 4];
  else if (st === 'move') { step = Math.sin(fr / 6 * TAU); sy = 1 + Math.abs(step) * .05; lean = .1; }
  else if (st === 'windup') { const t = [.35, .7, 1][fr % 3]; sy = 1 - t * .36; sx = 1 + t * .28; lean = -.12 * t; eye = 'glint'; }
  else if (st === 'lunge') { sx = 1.34; sy = .76; lean = .5; eye = 'glint'; }
  else if (st === 'recover') { sy = [.62, .84][fr % 2]; sx = [1.3, 1.1][fr % 2]; }
  else if (st === 'spit') { const t = [.4, 1, 0][fr % 3]; lean = -.3 * t + (fr % 3 === 2 ? .25 : 0); sy = 1 + t * .08; eye = 'glint'; }
  else if (st === 'hit') { sx = 1.16; sy = .82; lean = -.36; eye = 'shut'; }
  else if (st === 'stagger') { sx = [1.1, .92, 1.14, .96][fr % 4]; sy = [.9, 1.08, .86, 1.04][fr % 4]; lean = [.14, -.1, -.16, .1][fr % 4]; eye = 'swirl'; }
  else if (st === 'emerge') { const t = (fr % 5 + 1) / 5; sy = .25 + t * .75; sx = 1.3 - t * .3; sink = (1 - t) * 3; hi = t > .5; }
  else if (st === 'dissolve') { const t = (fr % 5 + 1) / 5; sy = 1 - t * .8; sx = 1 + t * .5; eye = 'shut'; hi = false; }
  R.scl(k);
  if (st !== 'emerge' && st !== 'dissolve') for (const sd of [-1, 1]) R.E(sd * 4.8, -1.4 - Math.max(0, sd * step) * 1.6, 3.2, 1.7, 0, P.WD, { g: 'ft' + sd, ol: 1 });
  R.push(); R.translate(0, sink);
  R.m[0] *= sx; R.m[1] *= sx; R.m[2] *= sy; R.m[3] *= sy; R.m[2] -= lean * R.m[0]; R.m[3] -= lean * R.m[1];
  R.P([[-8.6, -9], [-14.4, -3.4], [-7.6, -3]], P.W, { g: 'b' });
  R.E(0, -8.2, 11, 8, 0, P.W, { g: 'b' });
  R.E(1.5, -13.6, 7.4, 6, 0, P.W, { g: 'b' });
  if (st !== 'dissolve' || fr < 3) {   // 속에 비쳐 보이는 냄비
    R.push(); R.translate(-.6, -7.6); R.rotate(.16);
    R.P([[-5.4, -2.6], [5.4, -2.6], [4.5, 3.6], [-4.5, 3.6]], P.POT, { g: 'pot', cast: 0, recv: 0, flat: 1 });
    R.E(0, -2.6, 5.6, 1.5, 0, P.POTR, { g: 'pot', cast: 0, recv: 0, flat: 0 });
    R.B(-6.6, -1.4, 1.8, 1.2, 0, P.POTR, { g: 'pot', cast: 0, recv: 0, flat: 0 }); R.B(6.6, -1.4, 1.8, 1.2, 0, P.POTR, { g: 'pot', cast: 0, recv: 0, flat: 0 });
    R.DL(-3.4, -.4, -3.4, 2.4, '#7ea4bc');
    R.pop();
  }
  if (hi) { R.W(4.6, -17, 7, -15.4, '#e8f6ff'); R.WD(8.4, -13.2, '#e8f6ff'); R.W(-7, -12.6, -8.6, -10.4, '#c4e2f4'); }
  const rows = eye === 'glint' ? ['kkkk', 'GGGG', '.GG.'] : eye === 'shut' ? ['....', 'kkkk', '....'] : eye === 'swirl' ? ['.kk.', 'k..k', '.kk.'] : ['kkkk', 'wBBw', '.ww.'];
  R.stampM(2.6, -13.4, rows, FOE_EYE, 1, 1, true); R.stampM(7.4, -12.6, rows, FOE_EYE, 1, 1, true);
  R.pop();
}
