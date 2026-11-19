'use strict';
/* 쪈이의 디저트 대작전 — 전투는 이동만 하는 자동 공격, 전투 사이에는 갈림길을 고르고 카드 덱을 짜는 게임 */

const $ = s => document.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const rnd = n => Math.floor(Math.random() * n), rand = (a, b) => a + Math.random() * (b - a), pick = a => a[rnd(a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/* 아이콘: 벡터 그림을 16칸 픽셀 그림으로 바꿔 두고 써요 (바꾸기 전에는 벡터 그대로) */
const PXI = new Map();
const svg = inner => PXI.has(inner) ? `<img class="pxi" src="${PXI.get(inner)}" alt="" aria-hidden="true">` : `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${inner}</svg>`;
function pixelIcon(inner) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => {
      try {
        const n = 16, a = document.createElement('canvas'); a.width = a.height = n; const q = a.getContext('2d'); q.drawImage(im, 0, 0, n, n);
        const d = q.getImageData(0, 0, n, n), o = document.createElement('canvas'); o.width = o.height = n + 2; const w = o.getContext('2d'), on = (x, y) => x >= 0 && y >= 0 && x < n && y < n && d.data[(y * n + x) * 4 + 3] > 110;
        for (let y = -1; y <= n; y++) for (let x = -1; x <= n; x++) {
          if (on(x, y)) { const i = (y * n + x) * 4, k = v => Math.min(255, (v >> 4 << 4) + 8); w.fillStyle = `rgb(${k(d.data[i])},${k(d.data[i + 1])},${k(d.data[i + 2])})`; }
          else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) w.fillStyle = '#1A0E22'; else continue;
          w.fillRect(x + 1, y + 1, 1, 1);
        }
        PXI.set(inner, o.toDataURL());
      } catch (e) {}
      res();
    };
    im.onerror = () => res();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="64" height="64">${inner}</svg>`);
  });
}

/* ───── 저장 (이 폰에만) ───── */
const KEY = 'sweet-kingdom-v1';
let S = { muted: false, vib: true, wins: 0, run: null };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
/* 지우기 번호: 전부 지우기를 하면 바뀌어요. 다른 창(열려 있던 앱·브라우저 탭)이 옛 기록을 다시 덮어쓰지 못하게 막아요 */
const WKEY = KEY + '-wipe'; let WID = ''; try { WID = localStorage.getItem(WKEY) || ''; } catch (e) {}
let wiped = false;
addEventListener('storage', e => { if (e.key === WKEY && (e.newValue || '') !== WID) { wiped = true; location.reload(); } });

/* 난이도: 적이 나오는 수, 적 속도, 적 체력, 맞은 뒤 무적 시간, 엘리트·보스 공격 예고 시간 */
const DIFF = {
  easy: { name: '쉬움', spawn: 0.7, spd: 0.85, hp: 0.72, inv: 1.7, warn: 1.3, desc: '적이 적고 느려요. 맞은 뒤 무적 시간이 길어요.' },
  normal: { name: '보통', spawn: 0.85, spd: 0.94, hp: 0.85, inv: 1.3, warn: 1, desc: '보통 난이도예요.' },      /* 몬스터 수·체력 85%, 속도 94% */
  hard: { name: '어려움', spawn: 1.2, spd: 1.08, hp: 1.2, inv: 1.1, warn: 0.85, desc: '적이 많고 빨라요.' }
};
S.diff = 'normal';                 // 난이도는 보통으로 고정
const DF = () => DIFF.normal;
if (S.run && S.run.deck && !S.run.wpn) {   // 예전 덱 저장을 새 무기 방식으로 옮겨요
  const r = S.run, ids = [...new Set(r.deck.map(c => c.id))].filter(id => ['pin', 'cream', 'star', 'macaron', 'honey', 'lemon', 'skewer'].includes(id));
  r.wpn = (ids.length ? ids : ['pin']).map(id => ({ id, lv: 1 })); r.lvl = 1; r.xp = 0; r.bonus = { spd: 0, dmg: 0, crit: 0 }; r.rerolls = 0; delete r.deck; delete r.equip;
}
const persist = () => { if (wiped) return; try { if ((localStorage.getItem(WKEY) || '') !== WID) { wiped = true; location.reload(); return; } localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
let run = null;

/* ───── 펫: 모험이 끝날 때마다 하나를 얻어요. 같은 펫을 또 얻으면 레벨이 올라요 (최고 Lv5) ───── */
const PETS = {
  kong: { name: '젤리곰 콩이', desc: '몇 초마다 말랑한 젤리 방패를 씌워 줘요. 방패는 공격 한 번을 막고 주변 적을 튕겨내요.', lvDesc: lv => `${(14 - 1.6 * lv).toFixed(1)}초마다 방패${lv >= 5 ? ', 막을 때 주변 적 잠깐 기절' : ''}` },
  shu: { name: '천사 슈', desc: '하트가 다 닳는 순간 부활시켜 주고 적을 모두 없애요. 보스는 일부 피해만 받아요.', lvDesc: lv => `한 판에 1번, 하트 ${lv}칸으로 부활, 보스 체력 ${8 + 2 * lv}% 피해` },
  byul: { name: '별사탕 요정 별이', desc: '내 무기를 랜덤으로 대신 한 번 더 써 줘요. 전설로 각성한 스킬이 있으면 전설 스킬을 약한 위력으로 대신 써요.', lvDesc: lv => `전설 스킬이 있으면 ${Math.max(6, 12 - 1.2 * lv).toFixed(1)}초마다 위력 ${Math.round((0.4 + 0.05 * lv) * 100)}%로 대신 사용, 없으면 ${Math.max(2.4, 5 - 0.4 * lv).toFixed(1)}초마다 무기 ${lv >= 5 ? 2 : 1}개 사용` }
};
const PMAX = 5;
if (!S.pets || typeof S.pets !== 'object') S.pets = {};
const petLv = id => Math.min(PMAX, S.pets[id] || 0);
/* 펫 그림: 2배 촘촘한 그림을 붓질처럼 직접 그려요 (명암, 반짝임, 테두리). 전투에서는 절반 크기로 보여요 */
const PW_ = 30, PH_ = 36, PINK_ = '#FF8FB8';
function petPainter() {
  const c = mk(PW_, PH_), q = c.getContext('2d'), d = q.createImageData(PW_, PH_), A = new Uint32Array(d.data.buffer);
  const hexv = h => { const n = parseInt(h.slice(1), 16); return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16); };
  const set = (x, y, col) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < PW_ && y < PH_) A[y * PW_ + x] = hexv(col); };
  const get = (x, y) => x >= 0 && y >= 0 && x < PW_ && y < PH_ ? A[y * PW_ + x] : 0;
  /* 타원: 왼쪽 위에서 빛이 와요. ramp = [밝음 … 어두움] */
  const ell = (cx, cy, rx, ry, ramp, o = {}) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dd = dx * dx + dy * dy; if (dd > 1) continue; if (o.ring && dd < o.ring) continue;
    const lam = Math.max(0, -(dx * -0.55 + dy * -0.75) * 0.8 + Math.sqrt(Math.max(0, 1 - dd)) * 0.55), l = (o.base ?? 0.15) + (o.span ?? 0.85) * (1 - Math.min(1, lam)), t = Math.min(0.999, Math.max(0, l)) * (ramp.length - 1); let k = Math.floor(t); if ((t - k) * 16 > BAYER[(y & 3) * 4 + (x & 3)] && k + 1 < ramp.length) k++; set(x, y, ramp[k]); } };
  const poly = (pts, col) => { const ys = pts.map(p => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys)); for (let y = y0; y <= y1; y++) for (let x = 0; x < PW_; x++) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) ins = !ins; } if (ins) set(x, y, typeof col === 'function' ? col(x, y) : col); } };
  const outline = ink => { const B0 = new Uint32Array(A); for (let y = 0; y < PH_; y++) for (let x = 0; x < PW_; x++) if (!B0[y * PW_ + x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const xx = x + a, yy = y + b; return xx >= 0 && yy >= 0 && xx < PW_ && yy < PH_ && B0[yy * PW_ + xx]; })) A[y * PW_ + x] = hexv(ink); };
  return { c, q, d, set, get, ell, poly, outline, done: () => { q.putImageData(d, 0, 0); c.k = 2; return c; } };
}
const RAMP_ = {
  orange: ['#FFE6C0', '#FFBE6E', '#FF9433', '#E0661A', '#9A3E10'], cream: ['#FFFFFF', '#FFF7E6', '#F4E2BE', '#DEC094', '#A8865A'], gold: ['#FFF8C8', '#FFE15A', '#FFC21F', '#D99000', '#8F5E00'],
  sky: ['#FFFFFF', '#E6F6FF', '#BFE4FF', '#8CC4F0'], pink: ['#FFE3EE', '#FFB0CC', '#FF7FAA', '#D9507F'], red: ['#FFB0B0', '#FF5A5A', '#D92E3C', '#8C1A26'], green: ['#D8FFB8', '#8FE06A', '#4FB840', '#2E7A2A'], blue: ['#D6F0FF', '#7FC8FF', '#3E8EDE', '#24589C']
};
/* 펫마다 머리 꼭대기(모자 자리)와 눈 자리 */
const PET_ANCHOR = { kong: { cx: 15, top: 9, eyes: [11.5, 18.5], ey: 15 }, shu: { cx: 15, top: 12, eyes: [11.5, 18.5], ey: 19 }, byul: { cx: 15, top: 13, eyes: [11.5, 18.5], ey: 21 } };
const eyes2 = (P, a) => { for (const ex of a.eyes) { const x = Math.round(ex) - 1, y = a.ey - 1; for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]) P.set(x + i, y + j, '#2A1430'); P.set(x, y, '#FFFFFF'); } };
const PET_PAINT = {
  kong(P) {      /* 젤리곰: 말랑한 주황 젤리, 반투명한 반짝임 */
    const o = RAMP_.orange; P.ell(15, 30, 3.2, 2, o); P.ell(15 + 0, 30, 3.2, 2, o); P.ell(10.5, 31, 3, 2, o); P.ell(19.5, 31, 3, 2, o);
    P.ell(15, 25, 7.5, 6.5, o); P.ell(7.5, 23.5, 2.6, 3.6, o); P.ell(22.5, 23.5, 2.6, 3.6, o); P.ell(15, 26, 4, 3.5, ['#FFF2D8', '#FFD9A0', '#FFC27A'], { base: 0 });
    P.ell(8.5, 9.5, 3.4, 3.4, o); P.ell(21.5, 9.5, 3.4, 3.4, o); P.ell(8.5, 9.8, 1.6, 1.6, ['#FFD9A0', '#FFC27A'], { base: 0 }); P.ell(21.5, 9.8, 1.6, 1.6, ['#FFD9A0', '#FFC27A'], { base: 0 });
    P.ell(15, 15, 9, 7, o); P.ell(15, 17.6, 3.6, 2.4, ['#FFF2D8', '#FFDDB0'], { base: 0 }); P.set(14, 16.5, '#5A2410'); P.set(15, 16.5, '#5A2410'); P.set(14.5, 18.5, '#7A3416');
    for (const [x, y] of [[9, 11], [10, 10], [11, 10], [9, 12], [10, 22], [11, 21]]) P.set(x, y, '#FFFFFF');
    eyes2(P, PET_ANCHOR.kong); for (const x of [9, 21]) { P.set(x, 18, '#FF9AA8'); P.set(x + 1, 18, '#FF9AA8'); }
  },
  shu(P, hat) {      /* 천사 슈: 하얀 찹쌀떡 몸, 날개, 금빛 고리 */
    const s = RAMP_.sky, cr = RAMP_.cream; P.ell(5.5, 20, 5, 4.2, s, { base: 0 }); P.ell(24.5, 20, 5, 4.2, s, { base: 0 }); P.ell(4, 23, 3.5, 2.6, s, { base: 0 }); P.ell(26, 23, 3.5, 2.6, s, { base: 0 });
    for (const x of [3, 5, 7]) P.set(x, 21, '#8CC4F0'); for (const x of [23, 25, 27]) P.set(x, 21, '#8CC4F0');
    P.ell(15, 22, 9, 9, cr, { base: 0, span: 0.62 }); P.ell(11, 31, 2.6, 1.6, cr); P.ell(19, 31, 2.6, 1.6, cr);
    for (const [x, y] of [[10, 16], [11, 15], [12, 15]]) P.set(x, y, '#FFFFFF');
    eyes2(P, PET_ANCHOR.shu); for (const x of [9, 20]) { P.set(x, 22, PINK_); P.set(x + 1, 22, PINK_); } P.set(14, 23, '#C2607A'); P.set(15, 23, '#C2607A');
    if (!hat) P.ell(15, 7, 5.5, 1.8, RAMP_.gold, { ring: 0.35, base: 0 });
  },
  byul(P) {      /* 별사탕 요정 별이: 노란 별, 작은 날개, 반짝이 */
    P.ell(6.5, 14, 4, 3, RAMP_.sky, { base: 0 }); P.ell(23.5, 14, 4, 3, RAMP_.sky, { base: 0 });
    const cx = 15, cy = 21, R0 = 12, r0 = 5.2, pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r0 : R0; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    const g = RAMP_.gold; P.poly(pts, (x, y) => { const l = 0.18 + 0.5 * ((x - cx) + (y - cy)) / R0 + 0.25 * Math.hypot(x - cx, y - cy) / R0, t = Math.min(0.999, Math.max(0, l)) * (g.length - 1); let k = Math.floor(t); if ((t - k) * 16 > BAYER[(y & 3) * 4 + (x & 3)] && k + 1 < g.length) k++; return g[k]; });
    for (const [x, y] of [[13, 13], [14, 12], [12, 15]]) P.set(x, y, '#FFFFFF');
    eyes2(P, PET_ANCHOR.byul); for (const x of [9, 20]) { P.set(x, 24, PINK_); P.set(x + 1, 24, PINK_); } P.set(14, 25, '#B86A00'); P.set(15, 25, '#B86A00');
  }
};
/* 펫 꾸미기: 머리 장식(꼭대기 기준)과 안경(눈 기준) */
const PET_COS = {
  crown: { name: '작은 왕관', paint(P, a) { const { cx, top } = a, g = RAMP_.gold; for (let x = cx - 5; x <= cx + 5; x++) for (let y = top - 3; y <= top; y++) { const k = (x - cx + 5) % 5; if (y >= top - 1 || (y >= top - 3 + Math.abs(k - 2) && k !== 2) || (k === 2 && y >= top - 3)) P.set(x, y, g[Math.min(3, 1 + (x > cx) + (y === top))]); } P.set(cx, top - 1, '#E8323C'); P.set(cx - 4, top - 1, '#59B8FF'); P.set(cx + 4, top - 1, '#59B8FF'); P.set(cx, top - 4, '#FFF8C8'); } },
  ribbon: { name: '분홍 리본', paint(P, a) { const x0 = a.cx + 5, y0 = a.top + 1; P.poly([[x0, y0], [x0 - 5, y0 - 3], [x0 - 5, y0 + 3]], '#FF6FA5'); P.poly([[x0, y0], [x0 + 5, y0 - 3], [x0 + 5, y0 + 3]], '#FF6FA5'); P.set(x0 - 4, y0 - 1, '#FFC2DA'); P.set(x0 + 3, y0 - 1, '#FFC2DA'); P.ell(x0 + 0.5, y0 + 0.5, 1.6, 1.6, ['#FFB3CF', '#E0457B'], { base: 0 }); } },
  party: { name: '고깔모자', paint(P, a) { const { cx, top } = a; P.poly([[cx, top - 10], [cx - 5, top + 0.5], [cx + 5, top + 0.5]], (x, y) => ((x + y) >> 1) % 2 ? '#59B8FF' : '#FF6FA5'); P.ell(cx, top - 10, 1.8, 1.8, ['#FFF8C8', '#FFD23F'], { base: 0 }); for (let x = cx - 5; x <= cx + 5; x++) P.set(x, top, '#FFD23F'); } },
  flower: { name: '꽃핀', paint(P, a) { const x0 = a.cx + 6, y0 = a.top + 1; for (let i = 0; i < 5; i++) { const t = i * 1.2566 - 1.57; P.ell(x0 + Math.cos(t) * 2.2, y0 + Math.sin(t) * 2.2, 1.7, 1.7, RAMP_.pink, { base: 0 }); } P.ell(x0, y0, 1.2, 1.2, ['#FFF3A8', '#FFD23F'], { base: 0 }); } },
  leaf: { name: '새싹', paint(P, a) { const { cx, top } = a; for (let y = top - 4; y <= top; y++) P.set(cx, y, '#2E9A3C'); P.ell(cx - 2.5, top - 5, 2.6, 1.5, RAMP_.green, { base: 0 }); P.ell(cx + 2.5, top - 6, 2.6, 1.5, RAMP_.green, { base: 0 }); } },
  star: { name: '별 머리띠', paint(P, a) { const { cx, top } = a; for (let x = cx - 7; x <= cx + 7; x++) P.set(x, top + 1 + Math.round(Math.abs(x - cx) * Math.abs(x - cx) / 40), '#FF8FB8'); const pts = []; for (let i = 0; i < 10; i++) { const t = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 1.6 : 3.6; pts.push([cx + Math.cos(t) * rr, top - 2 + Math.sin(t) * rr]); } P.poly(pts, (x, y) => x + y < cx + top - 3 ? '#FFF8C8' : '#FFD23F'); } },
  glass: { name: '동그란 안경', face: 1, paint(P, a) { glassesP(P, a, '#2B3A67', '#BFE6FF', 'round'); } },
  sun: { name: '선글라스', face: 1, paint(P, a) { glassesP(P, a, '#1A0E22', '#3A3550', 'sun'); } },
  heartg: { name: '분홍 안경', face: 1, paint(P, a) { glassesP(P, a, '#E0457B', '#FFD0E4', 'heart'); } },
  goldg: { name: '금테 안경', face: 1, paint(P, a) { glassesP(P, a, '#C98A00', '#FFF6C0', 'round'); } },
  greeng: { name: '초록 안경', face: 1, paint(P, a) { glassesP(P, a, '#2E8A44', '#D8FFB8', 'round'); } },
  chef: { name: '요리사 모자', paint(P, a) { const { cx, top } = a; P.ell(cx, top - 4, 5.5, 3.5, ['#FFFFFF', '#F4ECE0', '#D9CCBA'], { base: 0 }); P.ell(cx - 3, top - 6, 2.6, 2.4, ['#FFFFFF', '#F4ECE0'], { base: 0 }); P.ell(cx + 3, top - 6, 2.6, 2.4, ['#FFFFFF', '#F4ECE0'], { base: 0 }); for (let x = cx - 5; x <= cx + 5; x++) { P.set(x, top, '#E6D9C4'); P.set(x, top - 1, '#F4ECE0'); } } },
  witch: { name: '마녀 모자', paint(P, a) { const { cx, top } = a; P.poly([[cx + 1, top - 12], [cx - 5, top], [cx + 5, top]], () => '#8A4FD0'); for (let x = cx - 8; x <= cx + 8; x++) { P.set(x, top + 1, '#6A3FB0'); P.set(x, top, '#8A4FD0'); } for (let x = cx - 4; x <= cx + 4; x++) P.set(x, top - 2, '#FFD23F'); } },
  cherry: { name: '체리 머리핀', paint(P, a) { const x0 = a.cx + 6, y0 = a.top + 1; P.ell(x0 - 1.5, y0 + 1, 1.8, 1.8, ['#FF8A9A', '#E8323C', '#8E1430'], { base: 0 }); P.ell(x0 + 2, y0 + 1.5, 1.8, 1.8, ['#FF8A9A', '#E8323C', '#8E1430'], { base: 0 }); P.set(x0 - 1, y0 - 1, '#3F8F2A'); P.set(x0, y0 - 2, '#3F8F2A'); P.set(x0 + 1, y0 - 1, '#3F8F2A'); P.set(x0 + 1, y0 - 2, '#5CC04A'); } },
  bear: { name: '곰돌이 귀', paint(P, a) { const { cx, top } = a; for (const sx of [-5, 5]) { P.ell(cx + sx, top - 1, 2.8, 2.6, ['#C08A5A', '#8A5230', '#5A3418'], { base: 0 }); P.ell(cx + sx, top - 1, 1.3, 1.2, ['#FFC9A8', '#E8A080'], { base: 0 }); } } },
  heartc: { name: '하트 머리핀', paint(P, a) { const x0 = a.cx + 6, y0 = a.top + 1; P.ell(x0 - 1.2, y0, 1.6, 1.6, ['#FFB0C8', '#FF6FA5'], { base: 0 }); P.ell(x0 + 1.2, y0, 1.6, 1.6, ['#FFB0C8', '#FF6FA5'], { base: 0 }); P.poly([[x0 - 2.6, y0 + 0.5], [x0 + 2.6, y0 + 0.5], [x0, y0 + 3.4]], () => '#FF6FA5'); } }
};
function glassesP(P, a, frame, lens, kind) {
  for (const ex of a.eyes) { const cx = Math.round(ex) - 0.5, cy = a.ey;
    for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
      if (kind === 'heart') { const hx = Math.abs(dx) / 3, hy = (dy + 0.6) / 3, v = hx * hx + Math.pow(hy - Math.sqrt(hx) * 0.6, 2); if (v < 0.75) P.set(x, y, v > 0.42 ? frame : lens); continue; }
      if (r <= 3.1) P.set(x, y, r > 2.2 ? frame : kind === 'sun' ? lens : lens); }
    if (kind === 'sun') { P.set(cx - 1.5, cy - 1.5, '#FFFFFF'); P.set(cx - 0.5, cy - 1.5, '#8C88A8'); } else P.set(cx - 1, cy - 1, '#FFFFFF'); }
  const [l, r] = a.eyes; for (let x = Math.round(l) + 2; x <= Math.round(r) - 3; x++) P.set(x, a.ey - 1, frame);
}
if (!S.cos || typeof S.cos !== 'object') S.cos = { hero: [], pet: [] };
if (!S.petCos || typeof S.petCos !== 'object') S.petCos = {};
if (!S.petFace || typeof S.petFace !== 'object') S.petFace = {};
const PET_SPR_C = new Map();
function petSpr(id) {
  const cos = S.petCos[id], fc = S.petFace[id], key = id + (cos || '') + '/' + (fc || ''); let c = PET_SPR_C.get(key); if (c) return c;
  const P = petPainter(), a = PET_ANCHOR[id], H = cos && PET_COS[cos] && !PET_COS[cos].face ? PET_COS[cos] : null, F = fc && PET_COS[fc] && PET_COS[fc].face ? PET_COS[fc] : null;
  PET_PAINT[id](P, !!H); if (F) F.paint(P, a); if (H) H.paint(P, a); P.outline('#1A0E22'); c = P.done();
  PET_SPR_C.set(key, c); return c;
}
const PET_BASE = new Proxy({}, { get: (_, id) => petSpr(id) });
const petImg = (id, size = 40) => { const s = petSpr(id), c = document.createElement('canvas'), k = Math.max(1, Math.round(size * 1.5 / Math.max(s.width, s.height))); c.width = s.width * k; c.height = s.height * k; const q = c.getContext('2d'); q.imageSmoothingEnabled = false; q.drawImage(s, 0, 0, c.width, c.height); return `<img class="pxi" src="${c.toDataURL()}" alt="">`; };
/* 모험이 끝나면 펫 하나 */
function gainPet() {
  const id = pick(Object.keys(PETS)), was = petLv(id);
  if (was >= PMAX) { S.meta.pts += 5; S.meta.total += 5; return { id, lv: was, extra: 5 }; }
  S.pets[id] = (S.pets[id] || 0) + 1; if (!S.pet) S.pet = id;
  return { id, lv: petLv(id), isNew: was === 0 };
}
function petLine(g) { return `<div class="opt r2 petget"><span class="ic">${petImg(g.id)}</span><span class="tx"><b>${g.isNew ? '새 펫' : '펫 레벨 업'}: ${PETS[g.id].name} Lv${g.lv}</b><span>${g.extra ? `이미 최고 레벨이라 설탕 별 ${g.extra}개로 바꿨어요.` : PETS[g.id].desc}</span></span></div>`; }
function petSheet(back) {
  let slot = 0;
  const draw = () => { const n = petSlots(), two = n > 1, NM = ['첫째', '둘째', '셋째'], sid = S[PET_K[slot]], cur = sid && petLv(sid) ? sid : null, own = S.cos.pet || [];
    sheet(`<h2 id="cardTitle">펫</h2><p>보스를 잡으면 가끔 펫이나 펫 꾸미기를 받아요. 같은 펫이면 레벨이 올라요. ${two ? `${n}마리를 데리고 갈 수 있어요. 칸을 고른 뒤 펫을 눌러요.${n < 3 ? ' 200스테이지를 깨면 세 마리까지 데리고 갈 수 있어요.' : ''}` : '하나를 골라 데리고 가요. 100스테이지를 깨면 두 마리, 200스테이지를 깨면 세 마리를 데리고 갈 수 있어요.'}</p>${two ? `<div class="tabs ctr">${Array.from({ length: n }, (_, k) => { const id = S[PET_K[k]]; return `<button class="tb${slot === k ? ' on' : ''}" type="button" data-act="slot" data-k="${k}">${NM[k]} 칸 · ${id && petLv(id) ? PETS[id].name.split(' ').pop() : '비어 있음'}</button>`; }).join('')}</div>` : ''}<div class="opts">${Object.keys(PETS).map(id => { const lv = petLv(id), tag = PET_K.slice(0, n).map((k, q) => S[k] === id ? NM[q] : '').find(Boolean) || ''; return `<button class="opt${S[PET_K[slot]] === id ? ' on' : ''}" type="button" data-act="pet" data-id="${id}"${lv ? '' : ' aria-disabled="true"'}>${tag ? `<em class="tag wt">${tag}</em>` : ''}<span class="ic">${lv ? petImg(id) : '?'}</span><span class="tx"><b>${lv ? `${PETS[id].name} Lv${lv}` : '아직 못 만났어요'}</b><span>${lv ? `${PETS[id].desc} (${PETS[id].lvDesc(lv)})` : '보스를 잡으면 만날 수 있어요.'}</span></span></button>`; }).join('')}</div>${cur ? `<h3 class="sub3">${PETS[cur].name.split(' ').pop()} 꾸미기</h3><div class="pic" style="text-align:center"><span style="display:inline-block;width:112px;height:120px">${petImg(cur, 120)}</span></div>${own.length ? [['머리', 0], ['안경', 1]].map(([lab, fc]) => { const T = fc ? S.petFace : S.petCos, l = own.filter(c => !!PET_COS[c].face === !!fc); return l.length ? `<div class="cosrow big"><span class="coslab">${lab}</span><button class="cos${T[cur] ? '' : ' on'}" type="button" data-act="pcos" data-fc="${fc}" data-id="">없음</button>${l.map(c => `<button class="cos${T[cur] === c ? ' on' : ''}" type="button" data-act="pcos" data-fc="${fc}" data-id="${c}" aria-label="${PET_COS[c].name}">${cosPetIcon(cur, c)}</button>`).join('')}</div>` : ''; }).join('') : '<p>아직 펫 꾸미기가 없어요. 보스를 잡으면 받을 수 있어요.</p>'}` : ''}<button class="btn" type="button" data-act="close">닫기</button>`,
    (act, b) => { if (act === 'close') { closeSheet(); if (back) back(); return; }
      if (act === 'pcos') { const T = b.dataset.fc === '1' ? S.petFace : S.petCos; if (b.dataset.id) T[cur] = b.dataset.id; else delete T[cur]; persist(); sfx.tap(); draw(); return; }
      if (act === 'slot') { slot = +b.dataset.k; sfx.tap(); draw(); return; }
      const id = b.dataset.id, k = PET_K[slot], old = S[k], other = PET_K.slice(0, petSlots()).find(q => q !== k && S[q] === id); if (other) S[other] = old; S[k] = id; persist(); sfx.tap(); draw(); }); };      /* 이미 다른 칸에 있는 펫이면 서로 바꿔요 */
  draw();
}
function cosPetIcon(id, c) { const T = PET_COS[c].face ? S.petFace : S.petCos, was = T[id]; T[id] = c; const h = petImg(id, 36); if (was) T[id] = was; else delete T[id]; return h; }
/* 전투 속 펫 */
/* 펫 두 마리: 100스테이지를 처음 깨면 둘째 칸이 열려요 */
const pet2On = () => !!S.pet2On, pet3On = () => !!S.pet3On, PET_K = ['pet', 'pet2', 'pet3'], petSlots = () => 1 + pet2On() + pet3On();      /* 200스테이지를 처음 깨면 셋째 칸도 열려요 */
const petTeam = () => PET_K.slice(0, petSlots()).map(k => S[k]).filter((id, i, a) => id && petLv(id) && a.indexOf(id) === i);
function petStart() {
  B.pets = petTeam().map((id, i) => ({ id, lv: petLv(id), slot: i, x: B.p.x - 20 + i * 30, y: B.p.y, cd: 2 + i * 0.7, t: i, go: null }));
  return B.pets[0] || null;
}
function petUpdate(dt) { for (const P of B.pets || []) petUpdate1(P, dt); }
function petUpdate1(P, dt) {
  const p = B.p; P.t += dt; P.cd -= dt;
  let tx = p.x - 22 * p.face * (P.slot === 1 ? -1 : 1) - (P.slot === 2 ? 4 * p.face : 0), ty = p.y - 18 - (P.slot === 1 ? 6 : 0) - (P.slot === 2 ? 30 : 0);
  if (P.go) { tx = P.go.x; ty = P.go.y; P.go.t -= dt; if (P.go.t <= 0) P.go = null; }
  const k = Math.min(1, dt * (P.go ? 12 : 6)); P.x += (tx - P.x) * k; P.y += (ty - P.y) * k;
  if (P.id === 'kong' && P.cd <= 0) {      /* 젤리 방패: 방패가 없을 때만 새로 씌워요 */
    if (p.shield) P.cd = 0.5; else { P.cd = 14 - 1.6 * P.lv; p.shield = true; p.kongShield = P.lv >= 5; P.go = { x: p.x, y: p.y - 10, t: 0.25 }; if (!headless) { fxAdd({ k: 'ring', x: p.x, y: p.y - 12, r: 34, to: 8, life: 0.35, max: 0.35, col: '#FF9A3D', w: 5 }); textAdd(p.x, p.y - 46, '젤리 방패!', '#FFB560'); sfx.block(); } }
  }
  if (P.id === 'byul' && P.cd <= 0) {      /* 별이: 내 무기를 랜덤으로 하나씩 대신 써 줘요 */
    if (!B.foes.some(f => !f.dead)) { P.cd = 0.4; return; }
    const legs = B.weapons.filter(w => isLeg(w.id));
    if (legs.length) {      /* 전설 스킬이 있으면: 가끔 전설 스킬 하나를 약한 위력으로 대신 써요 */
      P.cd = Math.max(6, 12 - 1.2 * P.lv); const rest = legs.filter(w => w.id !== P.last), w = pick(rest.length ? rest : legs); P.last = w.id; byulLeg(P, w); return;
    }
    const pool = B.weapons.slice(); if (!pool.length) { P.cd = 0.4; return; }
    P.cd = Math.max(2.4, 5 - 0.4 * P.lv);
    const times = P.lv >= 5 ? 2 : 1; for (let k = 0; k < times; k++) { const rest = pool.filter(w => w.id !== P.last), w = pick(rest.length ? rest : pool); P.last = w.id; byulUse(P, w); }
  }
}
/* 별이가 전설 스킬을 대신 써요: 위력 0.45~0.65배 */
function byulLeg(P, w) {
  const K = 0.4 + 0.05 * P.lv; B.legPet = true; try { castLeg(w, K); } finally { B.legPet = false; } P.go = { x: B.p.x + (P.x > B.p.x ? 34 : -34), y: B.p.y - 30, t: 0.7 };
  if (!headless) { fxAdd({ k: 'ring', x: P.x, y: P.y, r: 6, to: 60, life: 0.45, max: 0.45, col: '#FFD23F', w: 6 }); burst(P.x, P.y, '#FFE27A', 10, 220); textAdd(P.x, P.y - 30, `별이: ${LEG[w.id].name}!`, '#FFD23F', true); }
}
/* 별이가 무기 하나를 한 번 더 써요: 그 무기의 원래 타이머는 건드리지 않아요 */
function byulUse(P, w) {
  const c0 = w.cd, d0 = (w.dr || []).map(o => o && o.cd); w.cd = 0; if (w.dr) w.dr.forEach(o => { if (o && o.m === 0) o.cd = 0; });      /* 마카롱은 도는 구슬이 바로 날아가요 */
  const A = B.weapons.find(x => x === w); const had = B.shots.length; B.legPet = true; try { fireOne(w, 0, true); } finally { B.legPet = false; } w.cd = c0; if (w.dr) w.dr.forEach((o, i) => { if (o && d0[i] != null && o.m === 0 && o.cd <= 0) o.cd = 0.5; });
  P.go = { x: B.p.x + (P.x > B.p.x ? 30 : -30), y: B.p.y - 26, t: 0.4 };
  if (!headless) { fxAdd({ k: 'ring', x: P.x, y: P.y, r: 6, to: 40, life: 0.35, max: 0.35, col: '#FFD23F', w: 5 }); burst(P.x, P.y, '#FFE27A', 7, 180); textAdd(P.x, P.y - 28, WEAPONS[w.id].name + '!', '#FFD23F', false); sfx.pet && sfx.pet(); }
}
/* 천사 슈: 부활 + 적 전부 없애기 (보스는 일부만) */
function petRevive() {
  const P = (B.pets || []).find(q => q.id === 'shu'); if (!P) return false;
  const uses = 1;      /* 부활은 한 판에 한 번만 */ if ((run.petUsed || 0) >= uses) return false;
  run.petUsed = (run.petUsed || 0) + 1; const p = B.p;
  if (!headless) { p.hp = 0; p.inv = 99; B.foeShots = []; B.telegraphs = []; B.haz = []; B.rv = { t: 0, P, lv: P.lv, hx: P.x, hy: P.y, step: 0, hit: new Set() }; return true; }      /* 쓰러지는 모습 → 슈의 거대한 빛 → 부활 연출 (rvTick) */
  p.hp = Math.min(p.max, P.lv); p.inv = 2.5;      /* 레벨만큼 하트를 채워요 */
  for (const f of B.foes) { if (f.dead) continue; if (f === B.big) hurtFoe(f, f.max * (0.08 + 0.02 * P.lv) / B.st.dmg, { id: 'pet' }); else { f.hp = 0; killFoe(f, { id: 'pet' }); } }
  B.foeShots = []; B.telegraphs = [];
  if (!headless) { toast('천사 슈가 다시 일으켜 줬어요!'); sfx.revive(); sfx.bigKill(); B.flashScr = { col: '255,255,255', t: 0.6, max: 0.6 }; fxAdd({ k: 'beam', x: p.x, y: p.y, life: 0.9, max: 0.9 }); fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 20, to: 420, life: 0.6, max: 0.6, col: '#FFE45C', w: 8 }); }
  return true;
}
/* 슈 부활 연출 (pixelfx '부활' 이펙트를 입혀서): 0~0.6초 쓰러짐, 슈가 날아옴 → 0.95초 하늘에서 빛이 쏟아지고 몸을 타고 올라옴 → 날개와 천사 링 → 2.7초 힘찬 날갯짓과 함께 일반 적 전멸 → 깃털이 흩어지며 부활 */
const RV_END = 4.0, RV_FX0 = 0.95, RV_SPD = 1.3, RV_WIPE = 2.72;
function rvFxMake() {
  const F = window.PFX; if (!F) return null; const C = F.core;
  try { const fr = C.createFrame(192, 160), img = new ImageData(192, 160), cvs = document.createElement('canvas'); cvs.width = 192; cvs.height = 160;
    return { fr, img, cvs, g: cvs.getContext('2d'), fx: C.createFx(F.fx.resurrection, { x: 96, y: 140, actor: C.stockActor(2), seed: 7 }), C }; } catch (e) { return null; }
}
function rvTick(dt) {
  const r = B.rv, p = B.p, P = r.P, t0 = r.t; r.t += dt; const t = r.t, cross = s => t0 < s && t >= s;
  if (r.f === undefined) r.f = rvFxMake();
  if (r.f && t > RV_FX0) r.f.fx.update(dt * RV_SPD);
  if (t > 0.3 && t < 0.95) { const k = Math.min(1, (t - 0.3) / 0.65), e = k * k * (3 - 2 * k); P.x = r.hx + (p.x - r.hx) * e; P.y = r.hy + (p.y - 96 - r.hy) * e; }      /* 슈가 쓰러진 나의 머리 위로 날아와요 */
  if (cross(0.05)) { sfx.hurt(); B.shake = Math.max(B.shake, 0.3); }
  if (cross(RV_FX0)) sfx.leg();
  if (cross(RV_WIPE)) { sfx.boom(); sfx.bigKill(); B.flashScr = { col: '255,250,220', t: 0.7, max: 0.7 }; B.shake = 0.9;
    if (B.big && !B.big.dead) hurtFoe(B.big, B.big.max * (0.08 + 0.02 * r.lv) / B.st.dmg, { id: 'pet' }); }
  if (t >= RV_WIPE && t < RV_WIPE + 0.8) { const rr = (t - RV_WIPE) / 0.65 * 760; for (const f of B.foes) { if (f.dead || f === B.big || r.hit.has(f)) continue; if ((f.x - p.x) ** 2 + (f.y - p.y) ** 2 < rr * rr) { r.hit.add(f); fxAdd({ k: 'beam', x: f.x, y: f.y, life: 0.5, max: 0.5 }); burst(f.x, f.y - 10, '#FFE45C', 5, 160); f.hp = 0; killFoe(f, { id: 'pet' }); } } }      /* 날갯짓의 빛이 닿는 순서대로 적이 사라져요 */
  if (cross(RV_WIPE + 0.85)) { for (const f of B.foes) if (!f.dead && f !== B.big) { f.hp = 0; killFoe(f, { id: 'pet' }); } B.foes = B.foes.filter(f => !f.dead); }
  if (cross(1.85)) { p.hp = Math.min(p.max, r.lv); fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 20, to: 260, life: 0.6, max: 0.6, col: '#FFE45C', w: 8 }); burst(p.x, p.y - 20, '#FFFFFF', 18, 260); toast('천사 슈가 다시 일으켜 줬어요!'); B.heartPop = 0.5; sfx.revive(); }
  for (const f of B.fx) { f.life -= dt; if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.g) f.vy += f.g * dt; else { f.vx *= 0.9; f.vy *= 0.9; } } } B.fx = B.fx.filter(f => f.life > 0);
  for (const q of B.texts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 380 * dt; } B.texts = B.texts.filter(q => q.life > 0);
  if (B.shake > 0) B.shake -= dt;
  if (t >= RV_END) { B.rv = null; p.inv = 2.5; }
}
function rvDraw() {
  const r = B.rv; if (!r) return; const t = r.t, P = r.P, sx = X(P.x), sy = Y(P.y), p = B.p, hx = X(p.x), hy = Y(p.y);
  const dim = t < 1.1 ? 0.5 * t / 1.1 : t < RV_END - 0.9 ? 0.5 : Math.max(0, 0.5 * (RV_END - t) / 0.9);
  ctx.fillStyle = `rgba(12,4,30,${dim.toFixed(3)})`; ctx.fillRect(0, 0, lw, lh);
  drawHeroLayer();
  const F = r.f; if (F && t > RV_FX0) { const { fr, img, cvs, g, fx, C } = F; C.clearFrame(fr); fx.draw(fr, 'back'); fx.draw(fr, 'front'); C.composite(fr, img.data, null); g.putImageData(img, 0, 0);
    const k = 0.75; ctx.drawImage(cvs, Math.round(hx - 96 * k), Math.round(hy + 6 - 140 * k), 192 * k, 160 * k); }      /* pixelfx가 그린 빛기둥·날개·천사 링·깃털 (우리 캐릭터 크기에 맞게 3/4 크기로) */
  if (t >= RV_WIPE && t < RV_WIPE + 0.9) { const e = (t - RV_WIPE) / 0.9, R0 = Math.round(e * Math.max(lw, lh) * 1.2), a = Math.max(0, 1 - e);      /* 날갯짓과 함께 퍼지는 큰 빛 고리 */
    ctx.globalAlpha = a; for (let i = 0; i < 16; i++) { const ang = i * 0.3927 + e * 0.5, L = Math.round(R0 * (i % 2 ? 1 : 0.75)); pline(hx, hy, Math.round(hx + Math.cos(ang) * L), Math.round(hy + Math.sin(ang) * L), i % 2 ? '#FFFFFF' : '#FFE45C', i % 2 ? 3 : 2); }
    pcircle(hx, hy, R0, '#FFFFFF', 3); pcircle(hx, hy, Math.max(1, R0 - 8), '#FFE45C', 2); pcircle(hx, hy, Math.max(1, Math.round(R0 * 0.6)), '#FFF3C0', 2); ctx.globalAlpha = 1; }
  const sp = petSpr('shu'), sc = t > 0.3 ? 1 + 0.6 * Math.min(1, (t - 0.3) / 0.65) : 1, pw = sp.width / (sp.k || 1) * sc, ph = sp.height / (sp.k || 1) * sc, bob = Math.round(Math.sin(t * 6) * 2), out = t > RV_END - 1 ? Math.max(0, (RV_END - t)) : 1;      /* 슈는 하늘 위에서 지켜봐요 */
  if (out > 0) { ctx.globalAlpha = Math.min(1, out); putDisc(sx, sy + bob, Math.round(pw * 0.7), Math.round(ph * 0.6), '#FFE45C', 6); ctx.drawImage(sp, sx - pw / 2, sy - ph / 2 + bob, pw, ph); ctx.globalAlpha = 1; }
}
/* ───── 플레이 기록: 기기마다 저장하고, 코드로 바꿔 리포트 페이지에 붙여 넣어요 ───── */
if (!Array.isArray(S.hist)) S.hist = [];
if (!S.dev) S.dev = Math.random().toString(36).slice(2, 8);
function recordRun(won, stars, petGot) {
  const t = Math.round(run.time || 0), dmg = run.dmg || {};
  S.hist.push({ id: S.dev + '-' + Date.now().toString(36), dev: S.dev, nm: S.devName || '', at: Date.now(), won: won ? 1 : 0, act: actOf(), fl: floorNo(), rows: 0, lv: run.lvl, k: run.kills || 0, t, hits: run.hits || 0, by: run.hitBy || {}, el: run.elites || 0,
    w: run.wpn.map(w => [w.id, w.lv, Math.round(dmg[w.id] || 0)]), pd: Math.round(dmg.pet || 0), ac: Math.round(dmg.acid || 0), lg: Object.keys(run.leg || {}), dx: Object.fromEntries(Object.entries(dmg).filter(([k]) => !WEAPONS[k] && k !== 'pet' && k !== 'acid' && k !== '?').map(([k, v]) => [k, Math.round(v)])), b: run.bonus, hp: run.maxHp, pet: S.pet ? [S.pet, petLv(S.pet)] : null, pg: petGot ? petGot.id : null, st: stars, tree: S.meta.total - S.meta.pts, eq: SLOTS.map(s => eqOf()[s] ? eqOf()[s].g : -1) });
  if (S.hist.length > 120) S.hist.splice(0, S.hist.length - 120);
}
async function exportCode() {
  const json = JSON.stringify({ v: 1, dev: S.dev, nm: S.devName || '', runs: S.hist });
  try {
    const cs = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')), buf = new Uint8Array(await new Response(cs).arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
    return 'DDJZ' + btoa(s);
  } catch (e) { return 'DDJ0' + btoa(unescape(encodeURIComponent(json))); }
}
function exportSheet() {
  const draw = async () => {
    const code = await exportCode(), wins = S.hist.filter(r => r.won).length;
    sheet(`<h2 id="cardTitle">기록 보내기</h2><p>이 폰의 모험 기록 ${S.hist.length}개 (이긴 판 ${wins}개). 아래 코드를 리포트 페이지에 붙여 넣으면 통계에 들어가요.</p>
      <label class="fld"><span>이 폰 이름</span><input id="devName" type="text" maxlength="12" value="${(S.devName || '').replace(/"/g, '')}" placeholder="예: 쪈이 폰"></label>
      <textarea id="codeBox" class="code" readonly>${code}</textarea>
      <button class="cta" type="button" data-act="copy" data-pref>코드 복사하기</button>${navigator.share ? '<button class="btn" type="button" data-act="share">카톡 등으로 보내기</button>' : ''}<button class="btn" type="button" data-act="close">닫기</button>`,
      async act => {
        S.devName = $('#devName').value.trim(); S.hist.forEach(r => { if (r.dev === S.dev) r.nm = S.devName; }); persist();
        const c = await exportCode(); $('#codeBox').value = c;
        if (act === 'copy') { try { await navigator.clipboard.writeText(c); toastSheet('복사했어요'); } catch (e) { $('#codeBox').select(); document.execCommand('copy'); toastSheet('복사했어요'); } sfx.good(); }
        else if (act === 'share') { try { await navigator.share({ text: c }); } catch (e) {} }
        else closeSheet();
      });
    $('#devName').addEventListener('change', () => { S.devName = $('#devName').value.trim(); S.hist.forEach(r => { if (r.dev === S.dev) r.nm = S.devName; }); persist(); });
  };
  draw();
}
function toastSheet(t) { const b = cardEl.querySelector('[data-act="copy"]'); if (b) { b.textContent = t; setTimeout(() => { if (b.isConnected) b.textContent = '코드 복사하기'; }, 1500); } }

/* ───── 성장 트리: 모험이 끝날 때마다 받는 설탕 별로 주인공의 기본 능력을 키워요 ───── */
/* col 0~4, row 0~5. req: 먼저 1단계 이상 배워야 하는 칸 */
/* 성장 트리: 별로 배우는 영구 강화. 공격(왼쪽) · 기동 · 성장 · 보상 · 방어(오른쪽). 하트는 트리에 없어요 (옷과 레벨업으로만 늘어요) */
const TREE = [
  { id: 'atk', name: '단단한 팔', desc: '공격력 +4%', max: 6, cost: [1, 2, 2, 3, 3, 4], col: 0, row: 0, icon: 'star' },
  { id: 'crit', name: '날카로운 눈', desc: '치명타 확률 +3%', max: 5, cost: [2, 2, 3, 3, 4], col: 0, row: 1, req: 'atk', icon: 'ench' },
  { id: 'critd', name: '치명 한 방', desc: '치명타 피해 +20%', max: 4, cost: [3, 4, 5, 6], col: 0, row: 2, req: 'crit', icon: 'pin' },
  { id: 'veteran', name: '숙련 제빵사', desc: '모든 피해 +6%', max: 2, cost: [12, 20], col: 0, row: 3, req: 'critd', icon: 'glove' },
  { id: 'aspd', name: '빠른 손', desc: '공격 속도 +3%', max: 5, cost: [2, 2, 3, 3, 4], col: 1, row: 0, icon: 'cane' },
  { id: 'spd', name: '가벼운 신발', desc: '이동 속도 +3%', max: 5, cost: [1, 2, 2, 3, 3], col: 1, row: 1, req: 'aspd', icon: 'honey' },
  { id: 'size', name: '큰 손', desc: '무기 범위 +6%', max: 4, cost: [3, 4, 5, 6], col: 1, row: 2, req: 'spd', icon: 'macaron' },
  { id: 'reroll', name: '다시 굽기', desc: '스테이지마다 레벨업 카드를 다시 뽑는 기회 +1번', max: 3, cost: [4, 6, 9], col: 1, row: 3, req: 'size', icon: 'rest' },
  { id: 'xp', name: '계량 노트', desc: '경험치 +6%', max: 6, cost: [1, 2, 2, 3, 3, 4], col: 2, row: 0, icon: 'cup' },
  { id: 'mag', name: '설탕 자석', desc: '보석 줍는 거리 +15%', max: 4, cost: [1, 2, 3, 4], col: 2, row: 1, req: 'xp', icon: 'magnet' },
  { id: 'gold', name: '반짝 자석', desc: '적이 자석을 30% 더 자주 떨어뜨려요', max: 3, cost: [3, 5, 7], col: 2, row: 2, req: 'mag', icon: 'coin' },
  { id: 'luck', name: '행운의 쿠키', desc: '유물 이상 장비가 나올 확률 +15%(상대적으로)', max: 4, cost: [6, 9, 12, 16], col: 2, row: 3, req: 'gold', icon: 'chest' },
  { id: 'choice', name: '넓은 선택', desc: '레벨업 카드가 4장이 돼요', max: 1, cost: [30], col: 2, row: 4, req: 'luck', icon: 'event' },
  { id: 'star', name: '설탕 장인', desc: '스테이지를 처음 깰 때 설탕 별 +1개', max: 3, cost: [10, 20, 35], col: 3, row: 1, req: 'mag', icon: 'sour' },
  { id: 'guard', name: '설탕 갑옷', desc: '맞은 뒤 무적 시간 +10%', max: 4, cost: [2, 3, 4, 5], col: 4, row: 0, icon: 'dough' },
  { id: 'shield', name: '솜사탕 방패', desc: '전투마다 처음 맞는 공격 1번을 막아요', max: 1, cost: [8], col: 4, row: 1, req: 'guard', icon: 'cream' },
  { id: 'start2', name: '두 번째 바람', desc: '스테이지마다 한 번, 쓰러지면 하트 1칸으로 다시 일어나요', max: 1, cost: [20], col: 4, row: 2, req: 'shield', icon: 'cocoa' },
  { id: 'dodge', name: '아슬아슬 피하기', desc: '맞을 공격을 6% 확률로 피해요', max: 3, cost: [20, 35, 55], col: 4, row: 3, req: 'start2', icon: 'cotton' },
  /* 후반을 위한 노드: 한참 키운 뒤에 쓸 별이 생기도록 비싸요 */
  { id: 'master', name: '제빵 명인', desc: '모든 피해 +8%', max: 3, cost: [30, 50, 80], col: 0, row: 4, req: 'veteran', icon: 'pin' },
  { id: 'haste2', name: '번개 손', desc: '공격 속도 +4%', max: 4, cost: [25, 40, 60, 80], col: 1, row: 4, req: 'reroll', icon: 'cane' },
  { id: 'hunter', name: '보스 사냥꾼', desc: '보스와 엘리트에게 주는 피해 +10%', max: 3, cost: [20, 30, 45], col: 3, row: 2, req: 'star', icon: 'dough' },
  { id: 'sweep', name: '잡몹 청소부', desc: '일반 몬스터에게 주는 피해 +8%', max: 3, cost: [15, 25, 40], col: 3, row: 3, req: 'hunter', icon: 'macaron' },
  { id: 'shield2', name: '다시 부풀기', desc: '솜사탕 방패가 막은 뒤 다시 생겨요 (50초, 레벨마다 10초씩 빨라져요)', max: 3, cost: [35, 60, 90], col: 4, row: 4, req: 'dodge', icon: 'cream' },
  { id: 'shardplus', name: '든든한 하트', desc: '하트 +1칸', max: 1, cost: [70], col: 2, row: 5, req: 'choice', icon: 'heart' }      /* 예전 '조각 수집가' 자리 (저장 이름은 그대로) */
];
if (!S.meta || typeof S.meta !== 'object' || !S.meta.n) S.meta = { pts: 0, total: 0, n: {} };
const M = id => S.meta.n[id] || 0;
const TNODE = Object.fromEntries(TREE.map(t => [t.id, t]));
const canLearn = t => M(t.id) < t.max && (!t.req || M(t.req) > 0);
/* 모험이 끝나면 설탕 별을 받아요: 올라간 층, 잡은 적, 엘리트, 승리 */
function sugarStars(r, won) { return Math.max(1, Math.round(floorNo() * 1.5 + Math.min(8, (run.kills || 0) / 1500) + (run.elites || 0) * 2 + (won ? 10 : 0))     /* 3막까지 이기면 50개 남짓: 서너 번 이기면 트리를 다 배워요 */); }
function treeSheet(back) {
  let sel = null;
  const cell = 64, W = 5 * cell, H = 6 * 78 + 40, pos = t => [t.col * cell + cell / 2, t.row * 78 + 60], COLN = ['공격', '기동', '성장', '보상', '방어'];
  const draw = () => {
    let lines = ''; TREE.forEach(t => { if (!t.req) return; const [a, b] = pos(TNODE[t.req]), [c, d] = pos(t); lines += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" class="${M(t.req) ? 'on' : ''}"/>`; });
    const nodes = TREE.map(t => { const [x, y] = pos(t), r = M(t.id), st = r >= t.max ? 'max' : canLearn(t) ? 'can' : 'lock'; return `<button class="tn ${st}${r ? ' got' : ''}${sel === t.id ? ' sel' : ''}" type="button" data-act="node" data-id="${t.id}" style="left:${x}px; top:${y}px" aria-label="${t.name}"><span class="ti">${svg(ICON[t.icon])}</span><span class="tr">${r}/${t.max}</span></button>`; }).join('');
    const t = sel && TNODE[sel], r = t ? M(t.id) : 0, cost = t && r < t.max ? t.cost[r] : 0;
    const detail = t ? `<div class="td"><b>${t.name} ${r}/${t.max}</b><span>${t.desc}${t.max > 1 ? ` (1단계마다)` : ''}.${t.req && !M(t.req) ? ` 먼저 '${TNODE[t.req].name}'을 배워야 해요.` : ''}</span>${r < t.max ? `<button class="cta" type="button" data-act="learn"${canLearn(t) && S.meta.pts >= cost ? '' : ' aria-disabled="true"'}>배우기 · 설탕 별 ${cost}개</button>` : `<em>다 배웠어요</em>`}</div>` : `<div class="td"><span>칸을 눌러 보면 무엇을 키우는지 알려 줘요. 위에서부터 이어진 길을 따라 배워요.</span></div>`;
    sheet(`<h2 id="cardTitle">성장 트리</h2><p class="pts">설탕 별 <b>${S.meta.pts}</b>개</p><div class="tree" style="width:${W}px; height:${H}px"><svg class="tl" viewBox="0 0 ${W} ${H}" aria-hidden="true">${lines}</svg>${COLN.map((n, i) => `<span class="tcol" style="left:${i * cell + cell / 2}px">${n}</span>`).join('')}${nodes}</div>${detail}<button class="btn" type="button" data-act="close">닫기</button>`,
      (act, b) => {
        if (act === 'close') { closeSheet(); if (back) back(); return; }
        if (act === 'node') { sel = b.dataset.id; sfx.tap(); const sc = cardEl.scrollTop; draw(); cardEl.scrollTop = sc; return; }
        if (act === 'learn') { const t2 = TNODE[sel], c = t2.cost[M(sel)]; if (!canLearn(t2) || S.meta.pts < c) { sfx.no(); return; } S.meta.pts -= c; S.meta.n[sel] = M(sel) + 1; persist(); sfx.rare(); const sc = cardEl.scrollTop; draw(); cardEl.scrollTop = sc; const n = cardEl.querySelector('.tn.sel'); if (n) { const q = n.getBoundingClientRect(); sparkle(q.left + q.width / 2, q.top + q.height / 2, 12); } }
      });
  };
  draw();
}

/* ───── 그림 ───── */
const IMG = {};
const SPRITES = ['hero', 'jelly', 'cookie', 'ice', 'donut', 'boss', 'boss2', 'boss3', 'golem', 'knight', 'queen'];
/* 움직임 프레임: 주인공은 다리를 번갈아 드는 4프레임 걷기, 적은 한 줄 눌린 2프레임 */
function whiteOf(im) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); return c; }
function walkFrames(im, LEG = 4, k = 1) {
  const w = im.width, h = im.height, sp = Math.floor(w / 2) + 1, body = h - LEG;
  // [왼발 들기, 오른발 들기, 몸 올리기]  다리 → 몸 순서로 그려서 든 발은 치마 밑으로 숨어요
  return [[2 * k, 0, 0], [0, 0, 1], [0, 2 * k, 0], [0, 0, 1], [0, 0, 0]].map(([l, r, b]) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h + 1; const x = c.getContext('2d');
    x.drawImage(im, 0, body, sp, LEG, 0, body + 1 - l, sp, LEG); x.drawImage(im, sp, body, w - sp, LEG, sp, body + 1 - r, w - sp, LEG);
    x.drawImage(im, 0, 0, w, body, 0, 1 - b, w, body); if (l || r) { x.drawImage(im, l ? sp : 0, h - 1, l ? w - sp : sp, 1, l ? sp : 0, h, l ? w - sp : sp, 1); } return c;
  });
}
function squashFrame(im) {
  const w = im.width, h = im.height, cut = Math.floor(h * 0.45), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.drawImage(im, 0, 0, w, cut, 0, 1, w, cut); x.drawImage(im, 0, cut + 1, w, h - cut - 1, 0, cut + 1, w, h - cut - 1); return c;
}
const FOE_ART = {
  jumper: { pal: { k: '#1A0E22', p: '#FF8FB8', P: '#E0507A', w: '#FFFFFF', b: '#FF4F8A', c: '#FFF3E6', f: '#C98A4E' }, rows: [
    '....kkkkkk....', '..kkppppppkk..', '.kppwwpppppPk.', '.kppkppppkpPk.', '.kpbppppppbPk.', 'kkkkkkkkkkkkkk', 'kcccwcccccwcck', 'kkkkkkkkkkkkkk', '.kPppppppppPk.', '..kkkkkkkkkk..', '...kfk..kfk...', '...kk....kk...'] },
  pudding: { pal: { k: '#1A0E22', D: '#7A3E16', d: '#B8682A', y: '#FFD86B', Y: '#F2B73C', o: '#D9962A', w: '#FFFFFF', c: '#E8323C', g: '#3F8F2A' }, rows: [
    '......gc......', '.....kcck.....', '...kkDDDDkk...', '..kDdDDDdDDk..', '..kyyyyyyyyk..', '.kywyyyyyyyok.', '.kyykyyyykyok.', '.kyyyyyyyyyok.', 'kyyyyyyyyyyyok', 'kYYYYYYYYYYYok', 'kkkkkkkkkkkkkk', 'kwwwwwwwwwwwwk', '.kkkkkkkkkkkk.'] },
  puff: { pal: { k: '#1A0E22', w: '#F6D9A8', l: '#FFF3DA', y: '#C98A4E', m: '#8B3A2E', c: '#FFFFFF', p: '#FFB3D3' }, rows: [
    '.....cccc.....', '...kkccccckk..', '..kwlcccwwwyk.', '.kwlwwwwwwwwyk', 'kwlwwwwwwwwwyk', 'kwwwkwwwwkwwyk', 'kwwwkwwwwkwwyk', 'kwpwwwwwwwwpyk', 'kywwwwmmwwwyyk', '.kyyyyyyyyyyk.', '..kkkkkkkkkk..'] },
  bee: { pal: { k: '#1A0E22', c: '#BFE6FF', w: '#FFFFFF', y: '#FFD23F', o: '#FF9A1F', b: '#3A2030', p: '#FF8FB8' }, rows: [
    '.cc......cc.', 'cwwc....cwwc', 'cwwwckkcwwwc', '.ckkyyyyykc.', '.kyyybbyyyk.', 'kyykwybkwyyk', 'kyykkybkkyyk', 'kpyyybbyyypk', '.kooobboook.', '..kkobbokk..', '....kkkk....'] },
  zip: { pal: { k: '#1A0E22', p: '#B8F03C', l: '#F0FFC0', d: '#6FA81E', w: '#FFFFFF', y: '#FFE45C' }, rows: [
    '...kkkkkk...', '.kkpppppkk..', 'kpllpppppdk.', 'kplpkwppkwdk', 'kpppkkppkkdk', 'kpppppppppdk', '.kdpppppddk.', '..kkkkkkkk..', '.kyk....kyk.'] },
  pop: { pal: { k: '#1A0E22', w: '#FFF7DA', y: '#FFD86B', r: '#E8323C', c: '#FFFFFF', o: '#FF9A1F' }, rows: [
    '.....o.......', '....kyk......', '..kkwwkkwk...', '.kwwwwwwwwk..', 'kwwywwwwywwk.', 'kwwwwywwwwwk.', '.kkkkkkkkkk..', '.krcrcrcrck..', '.krkkrckkrk..', '.krkcrckcrk..', '.krcrcrcrck..', '.krckkkkcrk..', '.krcrcrcrck..', '..kkkkkkkk...'] },
  gum: { pal: { k: '#1A0E22', p: '#FF8FD0', l: '#FFD0EC', d: '#C2508E', w: '#FFFFFF', m: '#7A1E52' }, rows: [
    '....kkkkkk....', '..kkppppppkk..', '.kpllppppppdk.', '.kplpppppppdk.', 'kpppppppppppdk', 'kppkwppkwpppdk', 'kppkkppkkpppdk', 'kpppppppppppdk', 'kppppmmmppppdk', '.kpppmwmpppdk.', '.kpppppppppdk.', '..kkdpppddkk..', '...kdk..kdk...', '...kk....kk...'] },
  ginger: { pal: { k: '#1A0E22', g: '#C9823E', d: '#8B5228', l: '#E9AE6A', w: '#FFFFFF', m: '#9AA6B4', s: '#DDE3EA', r: '#E8323C' }, rows: [
    '....kkkkk....', '...kmssmmk...', '...kmmmmmk...', '..kkkkkkkkk..', '...kgwggwk...', '...kgggggk...', '...kgrrrgk...', '.kkkkgggkkkk.', 'kmsmkgwgkgggk', 'kmmmkgggkgdk.', 'kmsmkgwgkkk..', '.kkkgggggk...', '...kgdkgdk...', '...kgk.kgk...', '...kkk.kkk...'] },
  churro: { pal: { k: '#1A0E22', b: '#C98A4E', t: '#E9B878', d: '#8B5A2C', w: '#FFFFFF', s: '#FFF3E6', m: '#5A2E14' }, rows: [
    '.kkkkkkkkkkkkkk.', 'kbtbtbtbsbtbtbdk', 'kbbbbbbbbbbbbbdk', 'kbkwbbbbbbkwbbdk', 'kbkkbbbbbbkkbbdk', 'kbbbbbmmmmbbbbdk', 'kbtbsbtbtbtbsbdk', 'kddddddddddddddk', '.kkkkkkkkkkkkkk.', '..kdk......kdk..', '..kk........kk..'] }
};
/* 적은 테두리를 진한 붉은색으로, 주인공은 바깥에 크림색 한 줄을 더 둘러서 한눈에 구분돼요 */
function foeStyle(src) {
  const w = src.width, h = src.height, c = document.createElement('canvas'); c.width = w; c.height = h; const q = c.getContext('2d'); q.drawImage(src, 0, 0);
  const d = q.getImageData(0, 0, w, h), a = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : d.data[(y * w + x) * 4 + 3];
  const edge = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a(x, y) > 0 && (!a(x - 1, y) || !a(x + 1, y) || !a(x, y - 1) || !a(x, y + 1))) edge.push((y * w + x) * 4);
  for (const i of edge) { d.data[i] = 150; d.data[i + 1] = 18; d.data[i + 2] = 52; d.data[i + 3] = 255; }
  q.putImageData(d, 0, 0); return c;
}
function heroStyle(src, ring0) {
  const w = src.width + 2, h = src.height + 2, c = document.createElement('canvas'); c.width = w; c.height = h; const q = c.getContext('2d');
  q.drawImage(src, 1, 1); const d = q.getImageData(0, 0, w, h), a = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : d.data[(y * w + x) * 4 + 3], ring = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) ring.push((y * w + x) * 4);
  const rc = ring0 || [255, 243, 214]; for (const i of ring) { d.data[i] = rc[0]; d.data[i + 1] = rc[1]; d.data[i + 2] = rc[2]; d.data[i + 3] = 255; }
  q.putImageData(d, 0, 0); return c;
}
function pixelFoes() {
  for (const [id, a] of Object.entries(FOE_ART)) {
    const w = Math.max(...a.rows.map(r => r.length)), h = a.rows.length, c = document.createElement('canvas'); c.width = w; c.height = h; const q = c.getContext('2d');
    a.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (a.pal[ch]) { q.fillStyle = a.pal[ch]; q.fillRect(x, y, 1, 1); } }));
    const st = foeStyle(c); IMG[id] = { im: st, white: whiteOf(st), ratio: w / h }; IMG[id].frames = [st, squashFrame(st)]; IMG[id].whites = IMG[id].frames.map(whiteOf);
  }
}
/* 2막·3막 변종: 같은 적을 얼음빛, 불빛으로 물들여 둬요 (지원하지 않는 브라우저에서는 원래 색) */
function tintFoes() {
  const probe = document.createElement('canvas').getContext('2d'); if (!('filter' in probe)) return;
  const F = { 2: 'hue-rotate(150deg) saturate(0.85) brightness(1.12)', 3: 'hue-rotate(-95deg) saturate(1.25) brightness(0.92)', 4: 'hue-rotate(235deg) saturate(1.15) brightness(1.08)' };
  for (const n of ['jelly', 'cookie', 'ice', 'donut', 'pop', 'ginger', 'churro', 'zip']) { const s = IMG[n]; if (!s) continue;
    for (const act of [2, 3, 4]) { const fr = s.frames.map(im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const q = c.getContext('2d'); q.filter = F[act]; q.drawImage(im, 0, 0); return foeStyle(c); }); IMG[n + '@' + act] = { im: fr[0], white: s.white, ratio: s.ratio, frames: fr, whites: s.whites }; } }
}
/* 픽셀아트 2배 확대 (Scale2x): 계단진 외곽선을 반 칸씩 다듬어서 촘촘하게 키워요 */
const HI = new WeakMap();
function scale2x(src) {
  if (HI.has(src)) return HI.get(src); const w = src.width, h = src.height, c = mk(w * 2, h * 2); if (!w || !h) return src;
  const si = src.getContext ? src.getContext('2d').getImageData(0, 0, w, h) : (() => { const t = mk(w, h), q = t.getContext('2d'); q.drawImage(src, 0, 0); return q.getImageData(0, 0, w, h); })();
  const a = new Uint32Array(si.data.buffer), q = c.getContext('2d'), od = q.createImageData(w * 2, h * 2), o = new Uint32Array(od.data.buffer), P = (x, y) => a[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const E = a[y * w + x], A = P(x, y - 1), Bq = P(x + 1, y), C = P(x - 1, y), D = P(x, y + 1); let e0 = E, e1 = E, e2 = E, e3 = E;
    if (A !== D && C !== Bq) { if (C === A) e0 = C; if (A === Bq) e1 = Bq; if (C === D) e2 = C; if (D === Bq) e3 = Bq; }
    const r = y * 2 * w * 2 + x * 2; o[r] = e0; o[r + 1] = e1; o[r + w * 2] = e2; o[r + w * 2 + 1] = e3; }
  q.putImageData(od, 0, 0); HI.set(src, c); return c;
}
/* 2배로 키운 몬스터를 다듬어요: 테두리는 반 칸으로 얇게, 위쪽엔 빛, 아래쪽엔 그늘과 점무늬 그림자를 넣어 입체감을 줘요 */
const RELIT = new WeakMap();
function relight(src) {
  if (RELIT.has(src)) return RELIT.get(src); const w = src.width, h = src.height, c = mk(w, h), q = c.getContext('2d'); q.drawImage(src, 0, 0);
  const d = q.getImageData(0, 0, w, h), D = d.data, o = new Uint8ClampedArray(D), A = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : D[(y * w + x) * 4 + 3];
  const isOut = i => D[i] === 150 && D[i + 1] === 18 && D[i + 2] === 52, isInk = i => D[i] + D[i + 1] + D[i + 2] < 120;
  let top = h, bot = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (A(x, y)) { top = Math.min(top, y); bot = Math.max(bot, y); }
  const set = (i, f) => { o[i] = Math.max(0, Math.min(255, D[i] * f[0] + f[1])); o[i + 1] = Math.max(0, Math.min(255, D[i + 1] * f[0] + f[1])); o[i + 2] = Math.max(0, Math.min(255, D[i + 2] * f[0] + f[1])); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (!D[i + 3]) continue;
    if (isOut(i)) {      /* 바깥 테두리의 안쪽 절반은 몸 색으로 */
      if (A(x - 1, y) && A(x + 1, y) && A(x, y - 1) && A(x, y + 1)) { for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [2, 0], [-2, 0], [0, -2]]) { const j = ((y + dy) * w + x + dx) * 4; if (A(x + dx, y + dy) && !isOut(j)) { o[i] = D[j]; o[i + 1] = D[j + 1]; o[i + 2] = D[j + 2]; break; } } }
      continue; }
    if (isInk(i)) continue;
    const up = (k) => { const j = ((y - k) * w + x) * 4; return !A(x, y - k) || isOut(j); }, dn = (k) => { const j = ((y + k) * w + x) * 4; return !A(x, y + k) || isOut(j); }, lf = (k) => { const j = (y * w + x - k) * 4; return !A(x - k, y) || isOut(j); };
    const t = (y - top) / Math.max(1, bot - top);
    if (up(1) || up(2)) set(i, [1.12, 34]); else if (lf(1) || lf(2)) set(i, [1.06, 16]);      /* 빛 받는 위·왼쪽 가장자리 */
    else if (dn(1) || dn(2)) set(i, [0.72, 0]); else if (dn(3) && (x + y) % 2) set(i, [0.84, 0]);      /* 아래쪽 그늘 */
    else if (t > 0.62 && (x + y) % 2 === 0) set(i, [0.9, 0]);      /* 몸 아래쪽 점무늬 그림자 */
    else if (t < 0.3 && (x * 3 + y * 5) % 23 === 0) set(i, [1.08, 30]);      /* 반짝이는 결 */
  }
  d.data.set(o); q.putImageData(d, 0, 0); RELIT.set(src, c); return c;
}
const hiFoe = im => relight(scale2x(im));
function hiSprites() { for (const [n, s] of Object.entries(IMG)) { if (!s || !s.im || s.k || n === 'hero' || n === 'heroBig') continue; s.im = hiFoe(s.im); s.white = scale2x(s.white); if (s.frames) s.frames = s.frames.map(hiFoe); if (s.whites) s.whites = s.whites.map(scale2x); s.k = 2; } }
/* 주인공 꾸미기: 머리 염색 */
const HERO_COS = {
  pink: { name: '분홍 머리', ramp: ['#FF9AC0', '#E0507A', '#9C1E5C'] }, blond: { name: '금발', ramp: ['#FFE08A', '#E0A030', '#9A6010'] },
  mint: { name: '민트 머리', ramp: ['#A8F0D8', '#3FBF9A', '#1E7A60'] }, lilac: { name: '보라 머리', ramp: ['#D9B8FF', '#9A6AE0', '#5A3A9A'] },
  sky: { name: '하늘 머리', ramp: ['#BFE6FF', '#4A9AE0', '#2A5A9A'] }, silver: { name: '은발', ramp: ['#F4F4F8', '#BFC3CF', '#7A7F8E'] },
  bigbow: { name: '왕리본' }, catears: { name: '고양이 귀 머리띠' }, bunny: { name: '토끼 귀' }, halo: { name: '천사 링' }, flower: { name: '꽃 화관' },
  shades: { name: '선글라스' }, specs: { name: '금테 안경' }, hearts: { name: '하트 볼터치' }, angel: { name: '천사 날개' }, devil: { name: '악마 날개' },
  cherryd: { name: '체리 머리', ramp: ['#FF8A9A', '#E0324A', '#8E1430'] }, chocod: { name: '초코 머리', ramp: ['#C08A5A', '#7A4A28', '#3E2414'] }, peachd: { name: '복숭아 머리', ramp: ['#FFD2BA', '#FF9A7A', '#C0604A'] },
  lemond: { name: '레몬 머리', ramp: ['#FFF6A0', '#F2D23C', '#A8880F'] }, graped: { name: '포도 머리', ramp: ['#D8B0F0', '#8A3ACA', '#4A1478'] }, matchad: { name: '말차 머리', ramp: ['#D8F0A8', '#8AB040', '#4A6A18'] },
  nightd: { name: '밤하늘 머리', ramp: ['#8C9CE8', '#3A3E9A', '#1A1A50'] }, snowd: { name: '눈꽃 머리', ramp: ['#FFFFFF', '#DDE6F0', '#9AA8BA'] }, rosed: { name: '로즈골드 머리', ramp: ['#FFD9C8', '#E8A090', '#9A5A50'] },
  crown: { name: '작은 왕관' }, chef: { name: '요리사 모자' }, witch: { name: '마녀 모자' }, bear: { name: '곰돌이 귀' }, beret: { name: '빨간 베레모' }, horns: { name: '아기 뿔' }, cherry: { name: '체리 머리핀' }, phones: { name: '하늘 헤드폰' }, starclip: { name: '별 머리핀' },
  roundp: { name: '분홍 동그란 안경' }, sticker: { name: '별 스티커' }, mask: { name: '하얀 마스크' }, freckle: { name: '주근깨' },
  butterfly: { name: '나비 날개' }, fairy: { name: '요정 날개' }, leafw: { name: '나뭇잎 날개' }
};
/* 꾸미기 종류: 머리색(dye), 머리 장식(head, 투구 대신 보여요), 얼굴(face), 등(back, 망토 대신 보여요) */
const cosType = k => (DOLL.COS[k] && DOLL.COS[k].t) || 'dye';
const COS_T = [['dye', '머리색'], ['head', '머리 장식'], ['face', '얼굴'], ['back', '등']];
/* 무한의 탑 꾸미기: 층마다 하나씩, 기존 모양에 새 색을 입혀서 만들어요 (tw + 층 번호) */
const TW_PAL = [['노을', ['#FFC9A0', '#F07A4A', '#A8402A']], ['민트', ['#C8F7E4', '#4CCFA0', '#1E7A60']], ['라벤더', ['#E6D6FF', '#A47FE8', '#5E3FA0']], ['체리', ['#FFB8C8', '#E8325A', '#8E1438']], ['레몬', ['#FFF6A8', '#F2D23C', '#A88A10']], ['하늘', ['#D2EEFF', '#5AAEF0', '#2A5EA0']], ['초코', ['#D8A878', '#8A5430', '#4A2814']], ['솜사탕', ['#FFE0F0', '#FF9ACD', '#C0508A']],
  ['밤하늘', ['#8C9CE8', '#3A3E9A', '#1A1A50']], ['에메랄드', ['#A8F0B8', '#2EB860', '#126830']], ['루비', ['#FF9AA8', '#D0203E', '#701020']], ['황금', ['#FFF0A0', '#F0B020', '#9A6200']], ['얼음', ['#F4FCFF', '#A8E0F4', '#5A9AB8']], ['복숭아', ['#FFE2CC', '#FFA888', '#C86450']], ['포도', ['#D8B0F0', '#8A3ACA', '#4A1478']], ['말차', ['#E0F0B0', '#8AB040', '#4A6A18']]];
const TW_SHAPE = { head: ['bigbow', 'catears', 'bunny', 'halo', 'flower'], dye: ['dye'], face: ['shades', 'specs', 'hearts'], back: ['angel', 'devil'] };
const TW_COL = { bigbow: c => ({ q: c[1], Q: c[2] }), catears: c => ({ e: c[1], k: c[0] }), bunny: c => ({ W: c[0], k: c[1] }), halo: c => ({ G: c[0] }), flower: c => ({ k: c[1], G: c[0], L: c[2] }), shades: c => ({ e: c[2], N: c[1] }), specs: c => ({ G: c[1] }), hearts: c => ({ q: c[1], k: c[0] }), angel: c => ({ W: c[0], V: c[1] }), devil: c => ({ U: c[1], u: c[2] }) };
function ensureTw(k) {
  if (HERO_COS[k] || !/^tw\d+$/.test(k)) return k; const f = +k.slice(2), t = ['head', 'dye', 'face', 'back'][(f - 1) % 4], sh = TW_SHAPE[t], idx = Math.floor((f - 1) / 4), n = TW_PAL.length * sh.length, c = idx % n, round = Math.floor(idx / n);
  const [pn, col] = TW_PAL[(c * 7 + (f % 3)) % TW_PAL.length], shape = sh[Math.floor(c / TW_PAL.length)], star = round ? ' ' + '★'.repeat(Math.min(3, round)) : '';
  if (t === 'dye') HERO_COS[k] = { name: `${pn} 머리${star}`, ramp: col, tw: f };
  else { const b = DOLL.COS[shape]; HERO_COS[k] = { name: `${pn} ${HERO_COS[shape].name}${star}`, tw: f }; DOLL.COS[k] = { t: b.t, L: b.L, wide: b.wide, col: TW_COL[shape](col), shades: shape === 'shades' }; }
  return k;
}
for (const k of (S.cos && S.cos.hero) || []) ensureTw(k);
if (!S.heroLook || typeof S.heroLook !== 'object') S.heroLook = {};
const lookNow = () => ({ dye: S.heroCos, ...S.heroLook });
/* 주인공 그림 위에 장비를 그려요. 옷·장갑·신발은 색을 바꾸고, 투구는 머리 위에, 망토는 몸 뒤에 */
let HERO_RAW = null, heroUrlC = null;
const RAGS = ['#D8CBB0', '#A8957A', '#76664F'];
function composeHero(raw, eq, dye) { return DOLL.compose(eq, dye); }
/* 세트 효과 모습: 장비를 4칸 이상 끼고 모두 유물 이상이면 몸 테두리가 등급 색으로 빛나요 (영웅 이상은 발밑에 오라) */
function setGrade(eq) { const l = SLOTS.map(s => eq[s]).filter(Boolean); return l.length >= 4 ? Math.min(...l.map(i => i.g)) : -1; }
function buildHero() {
  const eq = run ? eqOf() : {}, sg = setGrade(eq), rc = sg >= 2 ? (h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)])(GRADES[sg].ramp[0]) : null, doll = composeHero(HERO_RAW, eq, lookNow()), big = heroStyle(doll, rc), im = heroStyle(doll.mini, rc);      /* 전투에서는 절반 크기, 창에서는 큰 그림 */
  IMG.heroBig = { im: big };
  IMG.hero = { aura: sg >= 3 ? GRADES[sg].ramp[1] : null, auraG: sg, im: big, k: 2, white: whiteOf(big), ratio: big.width / big.height }; IMG.hero.frames = walkFrames(big, 6, 1); IMG.hero.whites = IMG.hero.frames.map(whiteOf); heroUrlC = null;      /* 전투에서도 큰 그림을 2배 촘촘하게 */
}
function heroDirty() { buildHero(); }
function heroUrl(k = 4) { if (heroUrlC && heroUrlC.k === k) return heroUrlC.u; const s = IMG.heroBig && IMG.heroBig.im; if (!s) return 'img/hero.png'; const c = mk(s.width * k, s.height * k), q = c.getContext('2d'); q.imageSmoothingEnabled = false; q.drawImage(s, 0, 0, c.width, c.height); heroUrlC = { k, u: c.toDataURL() }; return heroUrlC.u; }
function loadImages() {
  pixelFoes();
  return Promise.all(SPRITES.map(n => new Promise(res => {
    let im = new Image();
    im.onload = () => {      // 맞았을 때 번쩍이는 흰 실루엣도 같이 만들어 둬요
      const raw = im; if (n === 'hero') HERO_RAW = raw; im = n === 'hero' ? heroStyle(raw) : foeStyle(raw);
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      IMG[n] = { im, white: c, ratio: im.width / im.height }; IMG[n].frames = n === 'hero' ? walkFrames(im) : [im, squashFrame(im)]; IMG[n].whites = IMG[n].frames.map(whiteOf); res();
    };
    im.onerror = () => { IMG[n] = null; res(); };
    im.src = `img/${n}.png`;
  }))).then(() => { for (const n of ['boss2', 'boss3']) if (!IMG[n]) IMG[n] = IMG.boss; tintFoes(); hiSprites(); });
}

/* ───── 소리와 진동: 칩튠 음색에 넓은 울림(리버브), 따뜻한 패드, 묵직한 저음, 종소리(FM)를 섞었어요 ───── */
let ac, bus, mbus, rvb, dly, noiseBuf; const PW = {}, MVOL = 0.34;
function audio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -17; comp.knee.value = 14; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
    const out = ac.createGain(); out.gain.value = 0.95; comp.connect(out); out.connect(ac.destination);
    bus = ac.createGain(); bus.gain.value = 0.8; bus.connect(comp);
    const mlp = ac.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 10000; mbus = ac.createGain(); mbus.gain.value = S.music === false ? 0 : MVOL; mbus.connect(mlp); mlp.connect(comp);
    /* 울림: 잦아드는 잡음으로 만든 공간 */
    const len = Math.floor(ac.sampleRate * 2.2), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4) * Math.min(1, i / 300); }
    rvb = ac.createConvolver(); rvb.buffer = ir; const rhp = ac.createBiquadFilter(); rhp.type = 'highpass'; rhp.frequency.value = 260; const rg = ac.createGain(); rg.gain.value = 0.55; rvb.connect(rhp); rhp.connect(rg); rg.connect(comp);
    /* 메아리: 음악의 멜로디에만 살짝 */
    dly = ac.createDelay(1); dly.delayTime.value = 0.3; const fb = ac.createGain(); fb.gain.value = 0.3; const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400; dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(mbus);
    for (const d of [0.125, 0.25, 0.5]) { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * d); PW[d] = ac.createPeriodicWave(re, im); }
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function setWave(osc, type) { if (type === 'p12' || type === 'p25' || type === 'p50') { osc.setPeriodicWave(PW[{ p12: 0.125, p25: 0.25, p50: 0.5 }[type]]); return 0.42; } osc.type = type; return type === 'square' || type === 'sawtooth' ? 0.42 : 1; }
/* 소리 한 줄기를 내보내요: 본 소리 + 울림 + (음악이면) 메아리, 좌우 위치 */
function route(g, o, t0, d) {
  const a = ac; let node = g;
  if (o.pan && a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = o.pan; g.connect(p); node = p; }
  node.connect(o.music ? mbus : bus);
  const rv = o.rev != null ? o.rev : o.music ? 0.2 : 0.1; if (rv > 0) { const s = a.createGain(); s.gain.value = rv * (o.music ? MVOL : 0.8); node.connect(s); s.connect(rvb); }
  if (o.dly && o.music) { const s = a.createGain(); s.gain.value = o.dly; node.connect(s); s.connect(dly); }
}
function voice(f, d, o = {}) {
  const a = audio(), t0 = o.t != null ? o.t : a.currentTime + (o.at || 0), g = a.createGain(), type = o.type || 'p25', at = o.a || 0.004; let k = 1, last = g;
  if (o.lp) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = o.q || 0.7; fl.frequency.setValueAtTime(o.lp, t0); if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t0 + d); fl.connect(g); last = fl; }
  for (const c of o.det ? [-o.det, o.det] : [0]) {
    const osc = a.createOscillator(); k = setWave(osc, type); osc.detune.value = c;
    osc.frequency.setValueAtTime(f, t0); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + d);
    if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 5.5; lg.gain.value = f * 0.011; l.connect(lg); lg.connect(osc.frequency); l.start(t0 + 0.14); l.stop(t0 + d + 0.05); }
    osc.connect(last); osc.start(t0); osc.stop(t0 + d + 0.05);
  }
  const v = (o.vol || 0.1) * k * (o.det ? 0.7 : 1);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + at);
  if (o.sus) g.gain.setValueAtTime(v, t0 + Math.max(at, d * 0.7)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  route(g, o, t0, d);
}
/* 종·전자 피아노 소리 (FM): 맑게 울리는 음 */
function fm(f, d, o = {}) {
  const a = audio(), t0 = o.t != null ? o.t : a.currentTime + (o.at || 0), car = a.createOscillator(), mod = a.createOscillator(), mg = a.createGain(), g = a.createGain(), idx = (o.idx != null ? o.idx : 2) * f, v = o.vol || 0.1;
  car.type = 'sine'; mod.type = 'sine'; car.frequency.setValueAtTime(f, t0); if (o.to) car.frequency.exponentialRampToValueAtTime(o.to, t0 + d); mod.frequency.setValueAtTime(f * (o.ratio || 2), t0);
  mg.gain.setValueAtTime(idx, t0); mg.gain.exponentialRampToValueAtTime(Math.max(1, idx * 0.08), t0 + d * 0.7); mod.connect(mg); mg.connect(car.frequency);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + (o.a || 0.003)); if (o.sus) g.gain.setValueAtTime(v, t0 + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  car.connect(g); car.start(t0); mod.start(t0); car.stop(t0 + d + 0.05); mod.stop(t0 + d + 0.05);
  route(g, o, t0, d);
}
function hiss(d, o = {}) {
  const a = audio(), t0 = o.t != null ? o.t : a.currentTime + (o.at || 0);
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const src = a.createBufferSource(), flt = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf; src.loop = true; flt.type = o.type || 'bandpass'; flt.Q.value = o.q || 0.8; flt.frequency.setValueAtTime(o.f || 3000, t0);
  if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t0 + (o.a || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(flt); flt.connect(g); src.start(t0, Math.random() * 0.5); src.stop(t0 + d + 0.05);
  route(g, Object.assign({ rev: o.music ? 0.1 : 0.06 }, o), t0, d);
}
/* 자주 쓰는 악기 */
const sub = (f, d, vol = 0.3, o = {}) => voice(f, d, Object.assign({ type: 'sine', vol, to: f * 0.32, rev: 0.04 }, o));                       // 가슴을 치는 저음
const brass = (f, d, vol = 0.08, o = {}) => voice(f, d, Object.assign({ type: 'sawtooth', det: 9, lp: 700, lpTo: 2600, q: 1.2, vol, a: 0.03, sus: 1, rev: 0.3 }, o));      // 금관 느낌
const chime = (fs, step, d, vol, o = {}) => fs.forEach((f, i) => fm(f, d, Object.assign({ vol, ratio: 3.5, idx: 1.4, at: (o.at0 || 0) + i * step, rev: 0.35, pan: (i % 2 ? 0.3 : -0.3) }, o)));
const bell = (f, d, vol = 0.08, at = 0) => fm(f, d, { vol, at, ratio: 3.5, idx: 1.6, rev: 0.3 });
const arp = (fs, step, d, vol, type = 'p25', at = 0) => fs.forEach((f, i) => voice(f, d, { vol, type, at: at + i * step, rev: 0.2 }));
let headless = false;                         // 테스트용 빠른 진행에서는 소리와 연출을 건너뛰어요
const lastPlayed = {};
function play(name, fn, gap = 0) {
  if (headless || S.muted) return;
  const now = performance.now(); if (gap && now - (lastPlayed[name] || 0) < gap) return; lastPlayed[name] = now;
  try { fn(); } catch (e) { if (window.__soundDebug) throw e; }
}
const LVN = ['끔', '줄임', '보통'], LVK = [0, 0.5, 1], lvOf = (v, legacy) => v == null ? (legacy === false ? 0 : 2) : v;      /* 진동·화면 흔들림: 보통 → 줄임 → 끔 */
const vibLv = () => lvOf(S.vibK, S.vib), shkLv = () => lvOf(S.shkK);
const LEG_AS = [20, 40, 60, 80, 100], legAlpha = () => (LEG_AS.includes(S.legA) ? S.legA : 60) / 100;      /* 전설 이펙트 진하기: 설정에서 골라요 */
function buzz(p) { const k = LVK[vibLv()]; if (headless || !k || !navigator.vibrate) return; try { navigator.vibrate(Array.isArray(p) ? p.map(v => Math.max(1, Math.round(v * k))) : Math.max(1, Math.round(p * k))); } catch (e) {} }
const PENT = [0, 2, 4, 7, 9];      /* 보석 소리가 올라가는 음계 (어느 음이 겹쳐도 듣기 좋아요) */
const sfx = {
  /* 타격: 딱 하는 앞소리 + 묵직한 몸통 */
  hit() { play('hit', () => { const k = rand(0.88, 1.15), pn = rand(-0.25, 0.25); hiss(.022, { type: 'highpass', f: 3800 * k, vol: .1, pan: pn }); voice(230 * k, .07, { to: 80, type: 'sine', vol: .2, pan: pn, rev: .05 }); voice(520 * k, .035, { to: 240, type: 'p25', vol: .06, pan: pn }); }, 38); },
  crit() { play('crit', () => { hiss(.05, { type: 'highpass', f: 5000, vol: .12 }); fm(1568, .22, { ratio: 3.5, idx: 2.4, vol: .1, rev: .35 }); fm(2349, .18, { ratio: 2, idx: 1, vol: .05, at: .03, rev: .35 }); sub(170, .16, .34); }, 60); buzz(12); },
  kill(type) { play('kill', () => {
    const k = rand(0.92, 1.1), pn = rand(-0.3, 0.3);
    if (type === 'cookie') { hiss(.09, { f: 1500, q: 2, vol: .15, pan: pn }); hiss(.05, { f: 700, q: 3, vol: .1, at: .035, pan: pn }); sub(170 * k, .12, .26); }                  // 와삭
    else if (type === 'ice') { fm(1900 * k, .16, { ratio: 2.7, idx: 2.2, vol: .07, pan: pn, rev: .3 }); fm(2600 * k, .12, { ratio: 3.1, idx: 1.6, vol: .04, at: .04, pan: pn, rev: .3 }); hiss(.06, { type: 'highpass', f: 6000, vol: .08 }); sub(110, .08, .18); }  // 쨍그랑
    else { voice(560 * k, .1, { to: 90, type: 'sine', vol: .16, pan: pn }); hiss(.06, { type: 'lowpass', f: 1600, to: 300, vol: .12, pan: pn }); fm(1175 * k, .1, { ratio: 2, idx: .8, vol: .035, at: .02, pan: pn }); sub(120, .1, .22); }  // 뿅 철퍽
  }, 42); buzz(8); },
  bigKill() { play('bigKill', () => { sub(95, 1.1, .5, { to: 26 }); hiss(.9, { type: 'lowpass', f: 3600, to: 110, vol: .26, rev: .3 }); hiss(.22, { f: 900, q: 1, vol: .14, at: .04 }); brass(131, 1.0, .09, { at: .12 }); brass(196, 1.0, .07, { at: .12 }); chime([523, 659, 784, 988, 1175, 1568, 1976], .055, .5, .06, { at0: .22 }); }); buzz([30, 30, 90]); },
  gem(k = 0) { play('gem', () => { const n = Math.min(k, 14), f = 880 * Math.pow(2, (PENT[n % 5] + 12 * Math.floor(n / 5)) / 12); fm(f, .13, { ratio: 2, idx: 1.1, vol: .1, rev: .22, pan: rand(-0.2, 0.2) }); fm(f * 2, .08, { ratio: 3, idx: .6, vol: .035, at: .02 }); }, 32); },
  swing() { play('swing', () => { hiss(.13, { f: 500, to: 3400, q: 1.2, vol: .11, a: .03 }); voice(150, .1, { to: 320, type: 'sine', vol: .08 }); }, 80); },
  shot() { play('shot', () => { const f = 820 + rand(-70, 70); voice(f, .05, { to: f * 1.9, type: 'sine', vol: .07, pan: rand(-0.2, 0.2) }); hiss(.012, { type: 'highpass', f: 6000, vol: .04 }); }, 85); },
  hurt() { play('hurt', () => { fm(196, .32, { ratio: 1.41, idx: 5, vol: .16, rev: .2 }); voice(311, .14, { to: 150, type: 'p50', vol: .12 }); sub(130, .4, .4, { to: 30 }); hiss(.26, { type: 'lowpass', f: 2400, to: 180, vol: .2 }); }); buzz([70, 40, 50]); },
  block() { play('block', () => { fm(1245, .35, { ratio: 3.7, idx: 3.5, vol: .1, rev: .4 }); fm(1865, .25, { ratio: 2.3, idx: 2, vol: .05, at: .02, rev: .4 }); hiss(.04, { type: 'highpass', f: 7000, vol: .08 }); }); buzz(20); },
  level() { play('level', () => { voice(196, .42, { to: 784, type: 'sawtooth', det: 8, lp: 500, lpTo: 5000, vol: .07, rev: .3 }); hiss(.42, { f: 600, to: 8000, vol: .06, a: .2 }); chime([523, 659, 784, 988, 1175, 1568, 1976, 2349], .045, .55, .075, { at0: .3 }); brass(262, .8, .06, { at: .32 }); brass(392, .8, .05, { at: .32 }); sub(98, .5, .32, { at: .3, to: 49 }); }); buzz([15, 30, 25, 30, 60]); },
  warn() { play('warn', () => { voice(932, .1, { type: 'sawtooth', det: 6, lp: 2600, vol: .26, rev: .15 }); voice(698, .12, { type: 'sawtooth', det: 6, lp: 2600, vol: .26, at: .12, rev: .15 }); }, 300); },
  slam() { play('slam', () => { sub(150, .55, .46, { to: 28 }); hiss(.4, { type: 'lowpass', f: 2600, to: 140, vol: .24, rev: .25 }); hiss(.03, { type: 'highpass', f: 2500, vol: .1 }); }); buzz(60); },
  boss() { play('boss', () => { [55, 82.4].forEach(f => brass(f, 1.6, .16, { lp: 300, lpTo: 1800 })); [98, 92.5, 87.3, 82.4].forEach((f, i) => { sub(f, .34, .34, { at: i * .24, to: f * 0.6 }); hiss(.08, { type: 'lowpass', f: 900, vol: .12, at: i * .24 }); }); hiss(1.3, { type: 'lowpass', f: 250, to: 2600, vol: .12, a: .8, rev: .3 }); }); buzz(120); },
  /* 전설 스킬: 솟구치는 소리 → 합창 같은 화음 → 큰 한 방 */
  leg() { play('leg', () => { voice(110, .4, { to: 880, type: 'sawtooth', det: 14, lp: 400, lpTo: 6000, vol: .1, rev: .35 }); hiss(.4, { f: 400, to: 9000, vol: .09, a: .3 }); [220, 277, 330, 440, 554].forEach((f, i) => brass(f, 1.3, .05, { at: .34, pan: (i - 2) * 0.2, rev: .5 })); chime([880, 1109, 1319, 1760, 2217], .05, .7, .06, { at0: .36 }); sub(82, .9, .5, { at: .34, to: 27 }); hiss(.5, { type: 'lowpass', f: 3000, to: 150, vol: .2, at: .34, rev: .3 }); }, 400); buzz([20, 40, 80]); },
  epic() { play('epic', () => { brass(131, 1.4, .08, { at: 0 }); brass(196, 1.3, .06, { at: .08 }); chime([523, 659, 784, 1047, 1319, 1568, 2093, 2637], .07, 1.1, .09); }); buzz([30, 30, 60, 30, 120]); },
  revive() { play('revive', () => { chime([392, 523, 659, 784, 1047, 1319, 1568], .06, .7, .08); brass(196, 1.0, .06, { at: .1 }); }); buzz([40, 40, 80]); },
  flip() { play('flip', () => { hiss(.08, { f: 1200, to: 5200, vol: .08, a: .02 }); fm(1320, .06, { ratio: 2, idx: .8, vol: .09, at: .055 }); }, 60); buzz(6); },
  rare() { play('rare', () => { chime([1047, 1319, 1568, 2093, 2637, 3136], .05, .6, .1); hiss(.5, { type: 'highpass', f: 8000, vol: .035, a: .1, rev: .3 }); brass(523, .7, .04, { at: .05 }); }); buzz([10, 20, 30]); },
  coinTick() { play('coinTick', () => { fm(1976, .07, { ratio: 3, idx: 1, vol: .08 }); fm(2637, .16, { ratio: 3, idx: 1, vol: .08, at: .04, rev: .25 }); }, 45); },
  fanfare() { play('fanfare', () => { [[523, 0, .11], [523, .11, .11], [523, .22, .11], [698, .34, .14], [784, .48, .14], [1047, .62, .9]].forEach(([f, at, d]) => { brass(f, d, .1, { at }); brass(f / 2, d, .07, { at }); }); [262, 330, 392].forEach(f => brass(f, .9, .05, { at: .62 })); chime([1047, 1319, 1568, 2093], .07, .7, .06, { at0: .66 }); sub(65, .8, .3, { at: .62, to: 40 }); }); buzz([20, 40, 20, 40, 80]); },
  magnet() { play('magnet', () => { voice(260, .5, { to: 1300, type: 'sine', vol: .1, rev: .25 }); chime([784, 988, 1175, 1568, 1976], .05, .35, .055, { at0: .28 }); hiss(.45, { f: 700, to: 6000, vol: .05, a: .25 }); }); buzz([20, 20, 40]); },
  zap() { play('zap', () => { hiss(.1, { type: 'highpass', f: 3500, to: 9000, vol: .1 }); voice(1900, .11, { to: 240, type: 'sawtooth', det: 20, lp: 5000, vol: .08, rev: .15 }); sub(130, .09, .2); }, 90); },
  boom() { play('boom', () => { hiss(.28, { type: 'lowpass', f: 2600, to: 130, vol: .2, rev: .2 }); sub(125, .26, .38, { to: 30 }); hiss(.02, { type: 'highpass', f: 2000, vol: .08 }); }, 60); buzz(10); },
  thud() { play('thud', () => { voice(520, .05, { to: 180, type: 'sine', vol: .12 }); sub(150, .18, .34); hiss(.08, { f: 1100, vol: .1 }); }, 60); },
  tap() { play('tap', () => { voice(720, .045, { to: 980, type: 'sine', vol: .09 }); hiss(.008, { type: 'highpass', f: 5000, vol: .05 }); }); buzz(6); },
  coin() { play('coin', () => { fm(1976, .09, { ratio: 3, idx: 1.2, vol: .11 }); fm(2637, .4, { ratio: 3, idx: 1.2, vol: .11, at: .06, rev: .35 }); }); },
  good() { play('good', () => { chime([784, 1175, 1568], .06, .4, .12); }); buzz([15, 30, 30]); },
  no() { play('no', () => { voice(196, .09, { type: 'triangle', vol: .16 }); voice(147, .14, { type: 'triangle', vol: .16, at: .09 }); }); },
  win() { play('win', () => { [[523, 0], [659, .1], [784, .2], [1047, .3]].forEach(([f, at]) => { brass(f, .16, .1, { at }); brass(f / 2, .16, .06, { at }); }); [523, 659, 784, 1047].forEach((f, i) => brass(f, 1.1, .055, { at: .44, pan: (i - 1.5) * 0.25 })); chime([1047, 1319, 1568, 2093, 2637], .06, .8, .06, { at0: .46 }); sub(131, 1.0, .3, { at: .44, to: 65 }); }); buzz([20, 40, 20, 40, 60]); },
  lose() { play('lose', () => { [392, 370, 349, 330].forEach((f, i) => { brass(f, .34, .07, { at: i * .22, lp: 500, lpTo: 1200 }); }); [165, 196, 247].forEach(f => brass(f, 1.4, .05, { at: .9, lp: 400, lpTo: 900 })); sub(82, 1.2, .3, { at: .9, to: 41 }); }); buzz([60, 40, 60]); }
};

/* ───── 배경음악: 직접 쓴 곡 3개. 16분음표 단위로 미리 예약해서 연주해요 (패드·베이스·아르페지오·멜로디·북) ───── */
const NOTE = n => { const m = /^([A-G])(#?)(\d)$/.exec(n); return 440 * Math.pow(2, ({ C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0) + (m[3] - 4) * 12) / 12); };
const seq = s => s.replace(/\|/g, ' ').trim().split(/\s+/);      // 음 이름, '.' 쉼, '-' 이어서
const CH = { C: ['C3', 'E4', 'G4', 'C5'], Am: ['A2', 'C4', 'E4', 'A4'], F: ['F2', 'A3', 'C4', 'F4'], G: ['G2', 'B3', 'D4', 'G4'], Em: ['E2', 'G3', 'B3', 'E4'], E: ['E2', 'G#3', 'B3', 'E4'], Dm: ['D2', 'F3', 'A3', 'D4'],
  FM7: ['F2', 'A3', 'C4', 'E4'], G6: ['G2', 'B3', 'D4', 'E4'], Em7: ['E2', 'G3', 'B3', 'D4'], Am7: ['A2', 'G3', 'C4', 'E4'], CM7: ['C3', 'E3', 'G3', 'B3'], Dm7: ['D2', 'F3', 'A3', 'C4'] };
const SONGS = {
  /* 지도와 제목: 느긋한 오후 (전자 피아노와 패드) */
  map: { bpm: 84, style: 'calm', chords: ['FM7', 'G6', 'Em7', 'Am7', 'FM7', 'G6', 'CM7', 'CM7', 'Dm7', 'G6', 'CM7', 'Am7', 'Dm7', 'G6', 'CM7', 'CM7'],
    lead: seq(`A5 - - - C6 - A5 - G5 - - - F5 - - - | G5 - - - B5 - D6 - C6 - B5 - G5 - - - | E5 - - - G5 - B5 - A5 - G5 - E5 - - - | A5 - - - C6 - E6 - D6 - C6 - A5 - - -
               F5 - A5 - C6 - - - A5 - G5 - F5 - . . | G5 - B5 - D6 - - - C6 - B5 - G5 - . . | E5 - G5 - C6 - - - D6 - E6 - - - - - | C6 - - - - - - - . . . . . . . .
               F5 - - - A5 - - - D6 - - - C6 - A5 - | B5 - - - D6 - - - G5 - - - . . . . | E5 - - - G5 - - - C6 - - - B5 - G5 - | A5 - - - - - - - E5 - - - . . . .
               D5 - F5 - A5 - - - D6 - C6 - A5 - - - | G5 - B5 - D6 - - - F6 - E6 - D6 - - - | E6 - - - - - C6 - G5 - - - E5 - - - | C5 - - - - - - - . . . . . . . .`) },
  /* 전투: 달리는 느낌 */
  battle: { bpm: 148, style: 'beat', chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
    lead: seq(`E5 . G5 . C6 . G5 . E5 . G5 . A5 G5 E5 . | C5 . E5 . A5 . E5 . C6 . B5 . A5 . G5 . | A5 . C6 . F5 . A5 . C6 . D6 . C6 . A5 . | B5 . D6 . G5 . B5 . D6 - - - . . . .
               G5 - E5 - C5 . E5 G5 C6 - - . G5 . E5 . | A5 - E5 - C5 . E5 A5 C6 - B5 - A5 . E5 . | F5 . A5 . C6 . A5 . D6 - C6 - A5 . F5 . | G5 . B5 . D6 . F6 . E6 - D6 - B5 - G5 .
               A5 - C6 - F6 - E6 - C6 - A5 - C6 - - . | B5 - D6 - G6 - F6 - D6 - B5 - D6 - - . | G5 - B5 - E6 - D6 - B5 - G5 - B5 - - . | A5 - C6 - E6 - A6 - G6 - E6 - C6 - A5 -
               F5 . A5 . C6 . F6 . E6 - C6 - A5 . C6 . | G5 . B5 . D6 . G6 . F6 - D6 - B5 . D6 . | E6 - - - D6 - C6 - G5 - - - E5 - G5 - | C6 - - - - - - - . . G5 . C6 . E6 .`) },
  /* 보스: 어둡고 긴박하게 */
  boss: { bpm: 166, style: 'drive', chords: ['Am', 'F', 'G', 'E', 'Am', 'F', 'Dm', 'E', 'Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'],
    lead: seq(`A4 . A4 . C5 . A4 . E5 . D5 . C5 . B4 . | A4 . A4 . C5 . F5 . E5 - D5 - C5 . A4 . | B4 . B4 . D5 . G5 . F5 - E5 - D5 . B4 . | G#4 . B4 . E5 . G#5 . B5 - - - A5 - G#5 -
               A5 . E5 . C5 . E5 . A5 . B5 . C6 . B5 . | A5 . F5 . C5 . F5 . A5 - G5 - F5 . E5 . | F5 . D5 . A4 . D5 . F5 - E5 - D5 . F5 . | E5 - - - G#5 - - - B5 - - - E6 - - -
               E5 - - - A5 - - - C6 - B5 - A5 - E5 - | F5 - - - A5 - - - C6 - B5 - A5 - F5 - | G5 - - - C6 - - - E6 - D6 - C6 - G5 - | D6 - - - B5 - - - G5 - A5 - B5 - D6 -
               E6 . E6 . C6 . A5 . E6 . E6 . C6 . A5 . | F6 . F6 . C6 . A5 . F6 . F6 . C6 . A5 . | D6 . D6 . A5 . F5 . D6 - E6 - F6 - D6 - | E6 - - - G#5 - - - B5 - - - E6 - - -`) }
};
for (const [k, s] of Object.entries(SONGS)) if (s.lead.length !== s.chords.length * 16) console.warn('song length', k, s.lead.length, s.chords.length * 16);
const MUS = { cur: null, step: 0, next: 0, timer: 0 };
function music(name) {
  if (MUS.cur === name) return; MUS.cur = name; MUS.step = 0; MUS.next = 0;
  if (!MUS.timer) MUS.timer = setInterval(musicTick, 30);
}
/* 북: 킥은 뚝 떨어지는 사인파, 스네어는 잡음 + 통 울림, 하이햇은 높은 잡음 */
const dKick = (t, v = 0.5) => { voice(155, 0.17, { t, to: 43, type: 'sine', vol: v, music: 1, rev: 0, a: 0.002 }); hiss(0.012, { t, type: 'highpass', f: 2500, vol: v * 0.18, music: 1, rev: 0 }); };
const dSnare = (t, v = 0.16) => { hiss(0.17, { t, f: 1900, q: 0.6, vol: v, music: 1, rev: 0.35 }); hiss(0.08, { t, type: 'highpass', f: 5500, vol: v * 0.55, music: 1, rev: 0.1 }); voice(195, 0.09, { t, to: 125, type: 'triangle', vol: v * 0.9, music: 1, rev: 0 }); };
const dHat = (t, v, open) => hiss(open ? 0.13 : 0.03, { t, type: 'highpass', f: 8500, vol: v, music: 1, rev: 0, pan: 0.25 });
const dCrash = (t, v = 0.09) => hiss(1.3, { t, type: 'highpass', f: 4500, vol: v, music: 1, rev: 0.4 });
const dTom = (t, f, v = 0.3) => voice(f, 0.16, { t, to: f * 0.55, type: 'sine', vol: v, music: 1, rev: 0.15 });
const pad = (ns, d, t, vol) => ns.forEach((n, i) => voice(NOTE(n), d, { t, type: 'sawtooth', det: 8, lp: 1100, q: 0.5, vol, a: Math.min(0.3, d * 0.3), sus: 1, music: 1, rev: 0.35, pan: (i - 1) * 0.35 }));
function musicTick() {
  if (!MUS.cur || headless || !ac || S.muted || S.music === false || document.hidden) { MUS.next = 0; return; }
  const song = SONGS[MUS.cur], st = song.style, t16 = 60 / song.bpm / 4, now = ac.currentTime; if (!MUS.next || MUS.next < now - 0.2) MUS.next = now + 0.06;
  if (MUS.dl !== MUS.cur) { MUS.dl = MUS.cur; dly.delayTime.setTargetAtTime(Math.min(0.95, t16 * 3), now, 0.05); }
  while (MUS.next < now + 0.14) {
    const i = MUS.step % song.lead.length, bar = Math.floor(i / 16), pos = i % 16, ch = CH[song.chords[bar % song.chords.length]], root = NOTE(ch[0]), up = ch.slice(1);
    const t = MUS.next + (st === 'calm' && pos % 2 ? t16 * 0.2 : 0);      /* 느긋한 곡은 살짝 뒤로 미는 박자 */
    const n = song.lead[i]; let len = 1; if (n !== '.' && n !== '-') while (song.lead[(i + len) % song.lead.length] === '-') len++;
    const f = n !== '.' && n !== '-' ? NOTE(n) : 0, d = t16 * len * 0.96;
    if (st === 'calm') {
      if (pos === 0) pad(up, t16 * 15.5, t, 0.034);
      if (f) { fm(f, Math.max(d, 0.5), { t, ratio: 1, idx: 1.3, vol: 0.12, music: 1, rev: 0.3, dly: 0.22 }); fm(f * 2, 0.3, { t, ratio: 3.5, idx: 0.5, vol: 0.018, music: 1, rev: 0.3 }); }
      if (pos === 0) voice(root, t16 * 7, { t, type: 'sine', vol: 0.3, music: 1, sus: 1, rev: 0 }); if (pos === 10) voice(root, t16 * 4.5, { t, type: 'sine', vol: 0.24, music: 1, sus: 1, rev: 0 });
      if (pos % 4 === 2) fm(NOTE(up[(pos / 4 | 0) % 3]) * 2, 0.5, { t, ratio: 2, idx: 0.7, vol: 0.03, music: 1, rev: 0.4, pan: pos % 8 === 2 ? -0.4 : 0.4 });
      if (pos === 0 || pos === 10) dKick(t, 0.36); if (pos === 4 || pos === 12) { hiss(0.06, { t, f: 2400, q: 1.5, vol: 0.06, music: 1, rev: 0.3 }); voice(330, 0.03, { t, type: 'triangle', vol: 0.05, music: 1 }); }
      if (pos % 2 === 0) dHat(t, pos % 4 === 2 ? 0.03 : 0.016);
    } else if (st === 'beat') {
      if (pos === 0) pad(up, t16 * 15.5, t, 0.02);
      if (f) { voice(f, d, { t, type: 'p25', vol: 0.085, music: 1, sus: 1, vib: len >= 4, rev: 0.22, dly: 0.2 }); voice(f, d, { t, type: 'sawtooth', det: 9, lp: 3400, vol: 0.036, music: 1, sus: 1, rev: 0.22 }); }
      voice(NOTE(up[[0, 1, 2, 1][pos % 4]]) * 2, t16 * 1.1, { t, type: 'sawtooth', lp: 3800, lpTo: 700, q: 2, vol: 0.036, music: 1, rev: 0.15, pan: pos % 2 ? 0.35 : -0.35 });
      if (pos % 2 === 0) { const bf = [1, 1, 2, 1, 1, 2, 1, 2][pos / 2] * root; voice(bf, t16 * 1.7, { t, type: 'sawtooth', lp: 520, q: 1.5, vol: 0.2, music: 1, sus: 1, rev: 0 }); voice(bf, t16 * 1.7, { t, type: 'sine', vol: 0.2, music: 1, sus: 1, rev: 0 }); }
      if (pos % 4 === 0) dKick(t, 0.46); if (pos === 4 || pos === 12) dSnare(t, 0.15); dHat(t, pos % 4 === 2 ? 0.05 : pos % 2 ? 0.014 : 0.026, pos % 4 === 2);
      if (pos === 0 && bar % 8 === 0) dCrash(t); if (bar % 4 === 3 && pos >= 12) dSnare(t, 0.07 + (pos - 12) * 0.03);
    } else {
      if (pos === 0) pad([ch[1], ch[2], ch[3]], t16 * 15.5, t, 0.022);
      if (f) { voice(f, d, { t, type: 'sawtooth', det: 12, lp: 4200, vol: 0.075, music: 1, sus: 1, vib: len >= 4, rev: 0.25, dly: 0.18 }); voice(f / 2, d, { t, type: 'p25', vol: 0.04, music: 1, sus: 1, rev: 0.15 }); }
      { const bf = pos % 4 === 3 ? root * 2 : root; voice(bf, t16 * 0.92, { t, type: 'sawtooth', lp: 600, q: 2, vol: 0.19, music: 1, sus: 1, rev: 0 }); voice(bf, t16 * 0.92, { t, type: 'sine', vol: 0.19, music: 1, sus: 1, rev: 0 }); }
      if ([0, 3, 6, 8, 11, 14].includes(pos)) up.forEach((nn, k) => voice(NOTE(nn), t16 * 1.6, { t, type: 'sawtooth', det: 10, lp: 2600, lpTo: 900, vol: 0.03, music: 1, rev: 0.3, pan: (k - 1) * 0.4 }));
      if (pos % 4 === 0 || (bar % 2 && (pos === 10 || pos === 14))) dKick(t, 0.48); if (pos === 4 || pos === 12) dSnare(t, 0.17); dHat(t, pos % 2 ? 0.02 : 0.034, pos === 14);
      if (pos === 0 && bar % 4 === 0) dCrash(t, 0.1); if (bar % 8 === 7 && pos >= 8 && pos % 2 === 0) dTom(t, [196, 165, 131, 98][(pos - 8) / 2]);
    }
    MUS.next += t16; MUS.step++;
  }
}
const setMusicVol = () => { if (mbus) mbus.gain.setTargetAtTime(S.muted || S.music === false ? 0 : MVOL, ac.currentTime, 0.05); };

/* ───── 카드 ───── */
const GRADES_ICON = [['#E8DCCB', '#B9A68C', '#7A6650'], ['#BFE6FF', '#59B8FF', '#2C6FB0'], ['#E3CCFF', '#B07CFF', '#6A3FC0'], ['#FFC9A8', '#FF7A3D', '#B8401A'], ['#FFF3B0', '#FFD23F', '#C98A00']];
/* 무기마다 대표 색 (망토 문양, 망토 끝단) */
const WCOL = { pin: '#D9A066', cream: '#FFFFFF', star: '#FFD23F', macaron: '#FF8FB8', honey: '#F7B733', lemon: '#E8E04D', skewer: '#E8323C', choco: '#6B3A1E', cotton: '#FFB3D9', cane: '#E8323C' };
const ICON = {
  pin: `<rect x="14" y="40" width="72" height="20" rx="10" fill="#D9A066" transform="rotate(-35 50 50)"/><rect x="2" y="45" width="18" height="10" rx="5" fill="#B9783F" transform="rotate(-35 50 50)"/><rect x="80" y="45" width="18" height="10" rx="5" fill="#B9783F" transform="rotate(-35 50 50)"/>`,
  cream: `<path d="M50 12C62 26 78 30 78 50C78 68 66 84 50 84C34 84 22 68 22 50C22 38 34 34 40 24C44 32 50 30 50 12Z" fill="#FFFFFF" stroke="#E3B7C6" stroke-width="4"/>`,
  star: `<path d="M50 10L61 38L91 40L68 59L76 88L50 72L24 88L32 59L9 40L39 38Z" fill="#FFC83D" stroke="#E0A000" stroke-width="3" stroke-linejoin="round"/>`,
  macaron: `<ellipse cx="50" cy="36" rx="34" ry="18" fill="#FF8FB8"/><rect x="18" y="44" width="64" height="12" fill="#FFF3E0"/><ellipse cx="50" cy="64" rx="34" ry="18" fill="#FF8FB8"/>`,
  honey: `<path d="M50 10C66 34 78 46 78 62C78 78 66 90 50 90C34 90 22 78 22 62C22 46 34 34 50 10Z" fill="#F7B733" stroke="#C88A0C" stroke-width="4"/>`,
  lemon: `<ellipse cx="50" cy="50" rx="36" ry="27" fill="#F4E04D" stroke="#B9B21E" stroke-width="4"/><path d="M14 50L4 50M86 50L96 50" stroke="#B9B21E" stroke-width="6" stroke-linecap="round"/>`,
  skewer: `<path d="M14 86L88 12" stroke="#B9783F" stroke-width="5" stroke-linecap="round"/><circle cx="36" cy="64" r="13" fill="#E8323C"/><circle cx="54" cy="46" r="13" fill="#B9DD52"/><circle cx="72" cy="28" r="13" fill="#FF9A1F"/>`,
  hands: `<circle cx="36" cy="54" r="20" fill="#FFD9C2" stroke="#C98E74" stroke-width="4"/><path d="M62 30V58M48 44H76" stroke="#FF4F86" stroke-width="9" stroke-linecap="round"/>`,
  sour: `<circle cx="38" cy="58" r="22" fill="#C8F06A" stroke="#7FA81E" stroke-width="4"/><circle cx="68" cy="34" r="13" fill="#C8F06A" stroke="#7FA81E" stroke-width="4"/><circle cx="74" cy="70" r="8" fill="#C8F06A" stroke="#7FA81E" stroke-width="3"/>`,
  dough: `<path d="M50 86C20 64 10 48 10 34C10 20 21 12 32 12C41 12 47 17 50 23C53 17 59 12 68 12C79 12 90 20 90 34C90 48 80 64 50 86Z" fill="#FF6B8E"/>`,
  magnet: `<path d="M22 20V54A28 28 0 0 0 78 54V20H60V54A10 10 0 0 1 40 54V20Z" fill="#E8323C"/><rect x="22" y="14" width="18" height="14" fill="#DDE3EA"/><rect x="60" y="14" width="18" height="14" fill="#DDE3EA"/>`,
  glove: `<path d="M30 90V52C22 46 18 36 26 30C32 26 38 32 38 40V22C38 12 62 10 62 22V28C74 26 80 34 78 46V90Z" fill="#FF9A5C" stroke="#C9642A" stroke-width="4"/>`,
  heart: `<path d="M50 86C20 64 10 48 10 34C10 20 21 12 32 12C41 12 47 17 50 23C53 17 59 12 68 12C79 12 90 20 90 34C90 48 80 64 50 86Z" fill="#E0445A"/>`,
  coin: `<circle cx="50" cy="50" r="38" fill="#FFC83D" stroke="#C88A0C" stroke-width="6"/><path d="M50 30V70M38 40H58A8 8 0 0 1 58 56H40" fill="none" stroke="#C88A0C" stroke-width="7" stroke-linecap="round"/>`,
  cocoa: `<path d="M20 34H70V66A20 20 0 0 1 50 86H40A20 20 0 0 1 20 66Z" fill="#FFFFFF" stroke="#4A2040" stroke-width="5"/><path d="M70 42H80A10 10 0 0 1 80 62H70" fill="none" stroke="#4A2040" stroke-width="5"/><path d="M34 22Q30 14 36 8M52 22Q48 14 54 8" fill="none" stroke="#8A5F7C" stroke-width="4" stroke-linecap="round"/><rect x="24" y="38" width="42" height="12" fill="#8B5A3C"/>`,
  shop: `<path d="M14 40L22 16H78L86 40Z" fill="#FF8FB8"/><rect x="18" y="40" width="64" height="46" fill="#FFF3E0" stroke="#4A2040" stroke-width="4"/><rect x="42" y="56" width="18" height="30" fill="#B9783F"/>`,
  rest: `<path d="M12 78H88" stroke="#4A2040" stroke-width="6" stroke-linecap="round"/><path d="M24 78V50A26 26 0 0 1 76 50V78Z" fill="#FFF3E0" stroke="#4A2040" stroke-width="4"/><path d="M40 30Q36 20 42 12M58 30Q54 20 60 12" fill="none" stroke="#8A5F7C" stroke-width="4" stroke-linecap="round"/>`,
  event: `<circle cx="50" cy="50" r="38" fill="#C9B6FF"/><path d="M38 40A12 12 0 1 1 54 52C50 54 50 58 50 62" fill="none" stroke="#4A2040" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="76" r="4.5" fill="#4A2040"/>`,
  chest: `<rect x="14" y="40" width="72" height="44" rx="6" fill="#D9A066" stroke="#4A2040" stroke-width="4"/><path d="M14 44A36 30 0 0 1 86 44Z" fill="#E9B878" stroke="#4A2040" stroke-width="4"/><rect x="43" y="46" width="14" height="18" rx="3" fill="#FFC83D" stroke="#4A2040" stroke-width="3"/>`,
  ench: `<path d="M50 8L60 40L92 50L60 60L50 92L40 60L8 50L40 40Z" fill="#B58CFF" stroke="#6A3FC0" stroke-width="3" stroke-linejoin="round"/>`,
  choco: `<circle cx="48" cy="58" r="32" fill="#6B3A1E" stroke="#3B1C0A" stroke-width="5"/><circle cx="36" cy="46" r="9" fill="#A0663C"/><path d="M64 30Q72 14 86 16" stroke="#FFD23F" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="88" cy="14" r="6" fill="#FF6B3D"/>`,
  cotton: `<path d="M20 58a16 16 0 0 1 8-30a20 20 0 0 1 38-4a16 16 0 0 1 14 34Z" fill="#FFB3D9" stroke="#C2507E" stroke-width="4"/><path d="M52 52L40 74H54L46 96L70 66H56L64 52Z" fill="#FFE45C" stroke="#B5651D" stroke-width="3" stroke-linejoin="round"/>`,
  cane: `<path d="M40 94V40a16 16 0 0 1 32 0v8" fill="none" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round"/><path d="M40 94V40a16 16 0 0 1 32 0v8" fill="none" stroke="#E8323C" stroke-width="14" stroke-dasharray="9 9"/>`,
  cup: `<path d="M22 28H78L70 86H30Z" fill="#DDF0FF" stroke="#2F74C0" stroke-width="5" stroke-linejoin="round"/><path d="M28 50H72M30 66H70" stroke="#2F74C0" stroke-width="4"/>`
};
/* 장비 아이콘: 칸 5가지 × 등급 5가지 */
{ /* 장비 아이콘: 종류(앞치마, 원피스, 갑옷...)마다 모양이 다르고 등급마다 색이 달라요. 망토는 무기 문양 */
  const D = {
    armor0: (a, b, c) => `<path d="M30 14L42 10Q50 18 58 10L70 14L88 30L78 44L70 38V88H30V38L22 44L12 30Z" fill="${b}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><path d="M36 40H64V86H36Z" fill="${a}" stroke="${c}" stroke-width="5"/><path d="M42 62H58" stroke="${c}" stroke-width="6"/>`,
    armor1: (a, b, c) => `<path d="M38 10H62L66 34L88 84H12L34 34Z" fill="${b}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><path d="M38 10Q50 24 62 10" fill="none" stroke="${a}" stroke-width="7"/><path d="M12 84Q19 94 26 84Q33 94 40 84Q47 94 54 84Q61 94 68 84Q75 94 82 84Q86 90 88 84" fill="none" stroke="${a}" stroke-width="7"/>`,
    armor2: (a, b, c) => `<circle cx="20" cy="26" r="14" fill="${b}" stroke="${c}" stroke-width="6"/><circle cx="80" cy="26" r="14" fill="${b}" stroke="${c}" stroke-width="6"/><path d="M24 20H76L78 64L50 90L22 64Z" fill="${b}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><path d="M34 30V62" stroke="${a}" stroke-width="8"/><circle cx="64" cy="32" r="5" fill="#FFFFFF"/>`,
    shoes0: (a, b, c) => `<path d="M26 10H52V56L82 62Q92 64 92 76V88H18V10Z" fill="${b}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><path d="M22 22H50" stroke="${a}" stroke-width="8"/>`,
    shoes1: (a, b, c) => `<path d="M8 60Q10 38 30 38L52 46L72 58Q94 62 94 76V80H8Z" fill="${b}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><path d="M8 80H94V90H8Z" fill="#FFFFFF" stroke="${c}" stroke-width="5"/><path d="M36 46L44 54M46 44L54 52" stroke="${a}" stroke-width="6"/>`,
    shoes2: (a, b, c) => `<path d="M10 62Q40 50 62 62L90 58V74H64L60 90H52L50 74H10Z" fill="${b}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><path d="M24 52L34 60L24 66ZM44 52L34 60L44 66Z" fill="${a}" stroke="${c}" stroke-width="3"/>`,
    gloves0: (a, b, c) => `<path d="M24 92V40Q24 12 46 12Q64 12 64 34V44L76 32Q88 26 92 40L72 66V92Z" fill="${b}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><path d="M24 78H72" stroke="${a}" stroke-width="10"/>`,
    gloves1: (a, b, c) => `<path d="M30 92V50L22 30Q20 22 28 22L36 40V14Q36 8 42 8Q48 8 48 14V38V10Q48 4 54 4Q60 4 60 10V38V14Q60 8 66 8Q72 8 72 14V60L80 46Q86 40 90 46L76 76V92Z" fill="${a}" stroke="${c}" stroke-width="5" stroke-linejoin="round"/><path d="M30 80H76V92H30Z" fill="${b}"/>`,
    gloves2: (a, b, c) => `<path d="M22 92V36L34 20H70L80 36V92Z" fill="${b}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><path d="M22 52H80M22 70H80" stroke="${c}" stroke-width="5"/><circle cx="36" cy="36" r="5" fill="${a}"/><circle cx="66" cy="36" r="5" fill="${a}"/>`,
    helm0: (a, b, c) => `<path d="M10 74Q10 16 50 16Q90 16 90 74Z" fill="${b}" stroke="${c}" stroke-width="6"/><rect x="10" y="64" width="80" height="14" fill="${c}"/><circle cx="34" cy="40" r="6" fill="#5A3418"/><circle cx="60" cy="32" r="6" fill="#5A3418"/><circle cx="70" cy="52" r="5" fill="#5A3418"/>`,
    helm1: (a, b, c) => `<path d="M14 86H86L78 68H22ZM24 66H76L68 48H32ZM34 46H66L60 30H40ZM42 28H58L50 6Z" fill="${a}" stroke="${c}" stroke-width="5" stroke-linejoin="round"/><path d="M22 76H78M32 56H68" stroke="${b}" stroke-width="6"/>`,
    helm2: (a, b, c) => `<ellipse cx="50" cy="56" rx="42" ry="30" fill="#E3B36A" stroke="${c}" stroke-width="6"/><path d="M8 52Q10 26 50 26Q90 26 92 52Q80 46 70 54Q60 44 50 54Q40 44 30 54Q20 46 8 52Z" fill="${b}"/><ellipse cx="50" cy="58" rx="14" ry="9" fill="#3A2420"/><path d="M28 36L34 40M62 34L66 40M46 32L50 36M76 42L80 46" stroke="#FFFFFF" stroke-width="5"/>`,
    cape: (a, b, c, w) => `<path d="M30 10H70L92 90Q50 78 8 90Z" fill="${b}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><circle cx="50" cy="52" r="18" fill="${WCOL[w] || a}" stroke="${c}" stroke-width="5"/>`
  };
  for (let g = 0; g < 5; g++) { const [a, b, c] = GRADES_ICON[g], spark = g === 4 ? '<path d="M78 8l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#FFFFFF"/>' : '';
    for (const s of ['armor', 'shoes', 'gloves', 'helm']) for (let v = 0; v < 3; v++) ICON[`eq_${s}${v}_${g}`] = D[s + v](a, b, c) + spark;
    for (const w of Object.keys(WCOL)) ICON[`eq_cape_${w}_${g}`] = D.cape(a, b, c, w) + spark; }
}
/* ───── 무기 10가지: 레벨이 오를 때마다 투사체가 1개씩 늘어요. Lv5와 Lv10에 특별한 힘 ───── */
const WMAX = 10;
const WEAPONS = {
  pin: { name: '롤링핀', desc: '가까운 적 쪽으로 롤링핀을 크게 휘둘러요.', more: '휘두르는 방향이 1개 늘어요.', s5: '휘두르는 범위가 넓어지고 적을 더 멀리 밀쳐요.', s10: '한 바퀴 빙 돌며 휘두르고 충격파가 퍼져요.' },
  cream: { name: '휘핑크림', desc: '가장 가까운 적에게 크림을 쏴요.', more: '크림이 1발 늘어요.', s5: '맞은 자리에 크림 웅덩이가 생겨 적이 느려져요.', s10: '크림이 커지고 적을 전부 꿰뚫어요.' },
  star: { name: '별사탕', desc: '가까운 적 쪽으로 별사탕을 흩뿌려요.', more: '별사탕이 1알 늘어요.', s5: '별사탕이 옆 적으로 1번 튕겨요.', s10: '사방으로 흩뿌리고 3번까지 튕겨요.' },
  macaron: { name: '마카롱', desc: '마카롱이 몸 주위를 돌다가 가까운 적에게 날아가 부딪혀요.', more: '마카롱이 1개 늘어요.', s5: '더 넓게, 더 빠르게 돌아요.', s10: '2초마다 마카롱이 한꺼번에 터져요.' },
  honey: { name: '꿀 장판', desc: '꿀을 깔아 적을 느리게 하고 다치게 해요.', more: '장판이 1개 늘어요.', s5: '장판이 넓어지고 오래가요.', s10: '커다란 꿀 웅덩이가 나를 따라다녀요.' },
  lemon: { name: '레몬즙', desc: '가까운 적에게 쏴서 산성을 쌓아요. 산성은 계속 피해를 줘요.', more: '물총이 1발 늘어요.', s5: '산성이 2배로 쌓여요.', s10: '산성 쌓인 적이 죽으면 터지며 주변에 옮아요.' },
  skewer: { name: '탕후루 꼬치', desc: '가까운 적 쪽으로 적을 전부 꿰뚫는 꼬치를 던져요.', more: '꼬치가 1개 늘어요.', s5: '더 빠르고 멀리 날아가요.', s10: '꼬치가 부메랑처럼 돌아오며 또 꿰뚫어요.' },
  choco: { name: '초코 폭탄', desc: '근처 적에게 초코볼을 던져 터뜨려요.', more: '폭탄이 1개 늘어요.', s5: '폭발 범위가 넓어져요.', s10: '터질 때 작은 초코볼 3개가 더 튀어 터져요.' },
  cotton: { name: '솜사탕 번개', desc: '가까운 적에게 번개가 치고 옆 적으로 이어져요.', more: '번개 줄기가 1개 늘어요.', s5: '번개가 2마리 더 이어져요.', s10: '번개가 자주 치고 맞은 적이 잠깐 멈춰요.' },
  cane: { name: '지팡이 사탕', desc: '하늘에서 지팡이 사탕이 떨어져 주변 적을 내리쳐요.', more: '사탕이 1개 더 떨어져요.', s5: '내리치는 범위가 넓어져요.', s10: '떨어진 자리에서 별 파편이 사방으로 튀어요.' }
};
const STATS = {
  spd: { name: '이동 속도 +5% (최대 6장)', icon: 'honey' },
  dmg: { name: '공격력 +10% (최대 10장)', icon: 'star' },
  crit: { name: '치명타 확률 +5%', icon: 'ench' },
  heart: { name: '하트 +1', icon: 'heart' }
};
const RELICS = {
  cape: { name: '슈크림 망토', desc: '하트가 1칸 남으면 더 빨리 달려요.', icon: 'cream' },
  whisk: { name: '황금 거품기', desc: '주는 피해가 15% 늘어요.', icon: 'star' },
  cup: { name: '계량컵', desc: '경험치를 25% 더 얻어요.', icon: 'ench' },
  boots: { name: '버터 장화', desc: '이동 속도가 12% 빨라져요.', icon: 'honey' },
  apron: { name: '두꺼운 앞치마', desc: '최대 하트가 1칸 늘어요.', icon: 'dough' },
  sprinkle: { name: '스프링클 통', desc: '레벨이 오르면 주변 적에게 피해를 줘요.', icon: 'sour' },
  cloud: { name: '솜사탕 구름', desc: '전투마다 처음 맞는 공격 한 번을 막아 줘요.', icon: 'cream' }
};
const HERO_R = 6.5;              // 주인공이 맞는 범위 (몸 크기보다 작게)
/* 전설 스킬: Lv10 무기의 조각을 10개 모으면 무기가 전설로 바뀌어 커다란 기술이 주기적으로 터져요 */
const LEG = {
  pin: { name: '천지 가르기', desc: '적이 몰린 쪽을 노려 거대한 베기가 세 번 이어지고, 벤 자리에 여진이 한 번 더 지나가요. 마지막 충격파가 주변 적을 밀쳐내요.', cd: 6.8 },
  cream: { name: '휘핑 해일', desc: '화면 끝에서 끝까지 크림 파도가 두 번 쓸고 가며 적을 느리게 해요.', cd: 9.2 },
  star: { name: '별똥별 소나기', desc: '별똥별 22개가 쏟아지고, 마지막에 거대한 별이 떨어져요.', cd: 8.0 },
  macaron: { name: '마카롱 은하', desc: '몸 주위에 은하가 펼쳐져 적을 끌어당겨 갈아버리고, 마지막에 폭발해요.', cd: 7.6 },
  honey: { name: '꿀 폭포', desc: '하늘에서 꿀 폭포가 쏟아지고, 꿀 바다가 나를 따라다녀요. 꿀 바다에 오래 있던 적일수록 더 아프고, 끝날 때 꿀이 한꺼번에 터져요.', cd: 11.6 },
  lemon: { name: '레몬 폭풍', desc: '초록 회오리 세 개가 적이 뭉친 곳을 휩쓸며 산성 표식을 쌓아요. 폭풍이 끝나면 표식이 한꺼번에 터지고, 많이 쌓인 적일수록 세게 터져요.', cd: 10.0 },
  skewer: { name: '꼬치 소나기', desc: '사방 16방향으로 거대한 꼬치가 두 번 꿰뚫고 지나가요.', cd: 7.2 },
  choco: { name: '초코 메테오', desc: '적이 가장 많은 곳에 거대한 운석이 떨어져 큰 폭발과 용암을 남겨요.', cd: 10.8 },
  cotton: { name: '심판의 빛', desc: '하늘이 갈라지며 화면 전체에 빛이 내려 모든 적을 태워요.', cd: 9.6 },
  cane: { name: '지팡이 대폭격', desc: '거대한 지팡이 사탕이 두 겹으로 내리꽂히고, 마지막에 초대형 한 방이 떨어져요.', cd: 8.6 }
};
const LEG_N = 10;
/* 전설 피해 배율: 각성 전 무기(Lv10)가 내던 피해의 약 3배가 되게 무기마다 재서 맞춘 값이에요. 전설 스킬은 그 무기를 대신해요 */
const LEGF = { pin: 0.516, cream: 0.792, star: 0.618, macaron: 0.508, honey: 2.7, lemon: 1.26, skewer: 0.704, choco: 0.682, cotton: 1.15, cane: 0.672 };      /* 각성 전 피해의 약 4.5배. 쿨타임을 2배로 늘린 만큼 한 방 피해도 2배 */
const legAll = () => run && Object.keys(WEAPONS).every(id => isLeg(id));      /* 전설 스킬을 전부 얻었는지 */
const legUnlocked = () => Object.keys(WEAPONS).every(id => wLv(id) >= WMAX);      /* 기본 스킬 10개를 모두 Lv10으로 마스터해야 전설 조각이 나와요 */
/* 보스를 처음 잡으면 전설 조각 2~3개 (기본 무기를 모두 Lv10으로 만든 뒤부터). 절반은 가장 많이 모은 무기로 가서 하나씩 완성돼요 */
function bossShards() {
  if (!legUnlocked() || legAll()) return null; const S2 = run.shards || (run.shards = {}), got = [], done = [];
  for (let k = 2 + (Math.random() < 0.5 ? 1 : 0); k > 0; k--) {
    const left = run.wpn.filter(w => !isLeg(w.id)).map(w => w.id); if (!left.length) break;
    const top = left.reduce((a, b) => (S2[b] || 0) > (S2[a] || 0) ? b : a, left[0]), id = Math.random() < 0.5 ? top : pick(left);
    S2[id] = (S2[id] || 0) + 1; got.push(id); if (S2[id] >= LEG_N) { (run.leg || (run.leg = {}))[id] = 1; done.push(id); }
  }
  return { got, done };
}
const isLeg = id => !!(run && run.leg && run.leg[id]);
const legLater = (t, f) => { const pet = B.legPet; B.legQ.push({ t, f: pet ? () => { const o = B.legPet; B.legPet = pet; try { f(); } finally { B.legPet = o; } } : f }); };      /* 별이가 쓴 스킬의 늦게 터지는 피해도 별이 몫으로 */
/* ═════ 전설 연출: 기 모으기 → 화면이 어두워지고 → 스킬마다 전용 대형 기술이 터져요 ═════ */
const legK = () => Math.max(1, ((1 + 0.92 * Math.pow(hpFloor(), 0.8)) * lateMul()) / 5.9);      /* 전설 데미지는 그 스테이지 몬스터 체력에 맞춰 같이 커져요 (적을 확확 밀어버리는 맛) */
const lfxAdd = o => { if (!headless) B.lfx.push(o); return o; };
const legTick = (t0, dur, step, fn) => { for (let t = 0; t <= dur + 1e-6; t += step) legLater(t0 + t, () => fn(t / dur)); };
const LEGW = 0.32;      /* 기 모으는 시간 */
function castLeg(w, K = 1) {      /* K: 위력 배율 (별이가 대신 쓸 때는 절반쯤) */
  const p = B.p, id = w.id, W = id === 'cotton' ? 0.55 : id === 'choco' ? 0.4 : LEGW, D = d => d * LEGF[id] * lStarK(id) * K;
  const big = (x, y, r, d, col) => blast(x, y, r, D(d), { id, noAcc: true }, col);
  const alive = () => B.foes.filter(f => !f.dead), onScreen = () => B.foes.filter(f => !f.dead && Math.abs(f.x - p.x) < vw * 0.58 && Math.abs(f.y - p.y) < vh * 0.58);
  const rnd = (t, a) => t.length ? t[(Math.random() * t.length) | 0] : null;
  const up = Math.min(lwOn(id), 4);      /* 전설 강화 장비를 끼면 각성한 뒤에도 전설 스킬이 한 단계 더 세져요 */
  if (!headless) { sfx.leg(); lfxAdd({ k: 'charge', life: W, max: W }); }      /* 이름 배너와 화면 어둡게 하기는 없앴어요 */
  const at = (t, f) => legLater(W + t, f), shake = s => { B.shake = Math.max(B.shake, s); }, flash = (c, t) => { B.flashScr = { col: c, t, max: t }; };
  if (id === 'pin') {      /* 히어로 브랜디쉬: 화면을 가로지르는 세 번의 거대한 베기 */
    const aim = () => { const near = onScreen(); let best = null, bn = -1; for (const f of near) { let n = 0; for (const g of near) if ((g.x - f.x) ** 2 + (g.y - f.y) ** 2 < 160 * 160) n++; if (n > bn) { bn = n; best = f; } } return best ? Math.atan2(best.y - p.y, best.x - p.x) : Math.random() * 6.283; };      /* 적이 제일 많이 몰린 쪽 */
    const cut = (px, py, a, len, T, d, vis) => { const c = Math.cos(a), s = Math.sin(a); if (vis) lfxAdd(vis); for (const f of alive()) { const rx = f.x - px, ry = f.y - py; if (Math.abs(rx * c + ry * s) < len && Math.abs(-rx * s + ry * c) < T * 0.5 + f.r) hurtFoe(f, D(d), { id, noAcc: true }, c, s); } };
    [...[0, 0.42, -0.42, 0.21, -0.21, 0.63].slice(0, 2 + up).map((o, i) => [o, i * 0.16, 540, 140, false]), [0, (2 + up) * 0.16, 620, 170, true]].forEach(([o, t, len, T, fin]) => at(t, () => {      /* 베기마다 적이 몰린 쪽을 노려요 */
      const px = p.x, py = p.y, a = aim() + o; cut(px, py, a, len, T, fin ? 330 : 260, { k: 'slash', x: px, y: py, a, len, bow: fin ? 90 : 60, T, life: 0.42, max: 0.42 }); shake(0.35); flash('255,240,200', 0.12);
      legLater(0.3, () => cut(px, py, a, len, T * 0.8, fin ? 150 : 110, { k: 'slash', x: px, y: py, a, len, bow: 20, T: T * 0.5, life: 0.25, max: 0.25 }));      /* 여진: 갈라진 자리를 한 번 더 베어요 */
    }));
    at((2 + up) * 0.16 + 0.02, () => { const px = p.x, py = p.y; big(p.x, p.y, 380, 320, '#FFD86B');
      for (const f of alive()) { const dx = f.x - px, dy = f.y - py, m = Math.hypot(dx, dy) || 1; if (m > 300 || FOES[f.type].noKb) continue; const k = f === B.big ? 0.2 : 1; f.kx = dx / m * 1800 * k; f.ky = dy / m * 1800 * k; }      /* 마지막 베기와 함께 충격파가 주변 적을 밀쳐내요 (보스는 조금만) */ lfxAdd({ k: 'pop', x: p.x, y: p.y, r: 200, life: 0.35, max: 0.35, col: '#FFF1B0' }); lfxAdd({ k: 'ring', x: p.x, y: p.y, r: 30, to: 420, life: 0.3, max: 0.3, col: '#FFFFFF', w: 14 });      /* 충격파가 주변 적을 멀리 밀쳐내요 (보스는 조금만). 피해를 준 뒤에 밀어야 밀림이 덮어써지지 않아요 */ lfxAdd({ k: 'ring', x: p.x, y: p.y, r: 20, to: 380, life: 0.4, max: 0.4, col: '#FFFFFF', w: 10 }); lfxAdd({ k: 'ring', x: p.x, y: p.y, r: 10, to: 300, life: 0.45, max: 0.45, col: '#FFD23F', w: 10 }); shake(0.7); flash('255,255,255', 0.25); });
  }
  if (id === 'cream') {      /* 휘핑 해일: 화면 끝에서 끝까지 쓸고 가는 크림 파도 두 번 */
    Array.from({ length: 2 + Math.min(up, 4) }, (_, i) => [i % 2 ? 1 : -1, i * 0.62]).forEach(([dir, t]) => at(t, () => {
      const x0 = p.x - dir * vw * 0.62, sp = vw * 1.3 / 0.95, hit = new Set(); lfxAdd({ k: 'wave', x0, dir, sp, y: p.y, life: 1.0, max: 1.0, vw }); shake(0.3);
      legTick(0, 0.95, 0.05, u => { const xw = x0 + dir * sp * 0.95 * u; for (const f of alive()) if (!hit.has(f) && Math.abs(f.x - xw) < 80 && Math.abs(f.y - p.y) < vh * 0.62) { hit.add(f); hurtFoe(f, D(250), { id, noAcc: true }, dir, 0); f.slow = 3; } });
    }));
  }
  if (id === 'star') {      /* 별똥별 소나기 → 마지막에 거대한 별 */
    for (let i = 0; i < 22 + 8 * up; i++) at(i * 0.055, () => {
      const f = rnd(onScreen()), a = Math.random() * 6.283, x = f ? f.x + (Math.random() - 0.5) * 30 : p.x + Math.cos(a) * 200, y = f ? f.y : p.y + Math.sin(a) * 200;
      lfxAdd({ k: 'meteor', x, y, dx: 150, dy: -320, life: 0.3, max: 0.3, cols: ['#FFB020', '#FFE27A', '#FFFFFF'], r: 3, sk: 'star', hue: i }); legLater(0.3, () => { big(x, y, 82, 240, '#FFD23F'); lfxAdd({ k: 'pop', x, y, r: 50, life: 0.3, max: 0.3, col: '#FFD23F' }); });
    });
    at((22 + 8 * up) * 0.055 + 0.15, () => { let best = p, bn = -1; for (const f of onScreen()) { let n = 0; for (const g of B.foes) if (!g.dead && (g.x - f.x) ** 2 + (g.y - f.y) ** 2 < 170 * 170) n++; if (n > bn) { bn = n; best = f; } } const x = best.x, y = best.y;
      lfxAdd({ k: 'meteor', x, y, dx: 200, dy: -440, life: 0.4, max: 0.4, cols: ['#FF9A1F', '#FFE27A', '#FFFFFF'], r: 14, sk: 'big' }); legLater(0.4, () => { big(x, y, 250, 520, '#FFD23F'); lfxAdd({ k: 'ring', x, y, r: 20, to: 250, life: 0.4, max: 0.4, col: '#FFFFFF', w: 10 }); lfxAdd({ k: 'pop', x, y, r: 120, life: 0.45, max: 0.45, col: '#FFD23F' }); shake(0.8); flash('255,240,180', 0.25); }); });
  }
  if (id === 'macaron') {      /* 마카롱 은하: 내 주변 먼 곳에 은하가 생겨서 적을 끌어당겨 터뜨려요 */
    const T = 1.5 + 0.3 * up, near = onScreen(); let best = null, bn = -1;
    for (const f of near) { let n = 0; for (const g of near) if ((g.x - f.x) ** 2 + (g.y - f.y) ** 2 < 200 * 200) n++; if (n > bn) { bn = n; best = f; } }
    const a0 = best ? Math.atan2(best.y - p.y, best.x - p.x) : Math.random() * 6.283, gd = best ? Math.min(300, Math.max(220, Math.hypot(best.x - p.x, best.y - p.y))) : 260, gx = p.x + Math.cos(a0) * gd, gy = p.y + Math.sin(a0) * gd;      /* 적이 몰린 쪽 멀리에 만들어요 */
    at(0, () => lfxAdd({ k: 'galaxy', gx, gy, life: T, max: T }));
    legTick(W, T, 0.1, u => { const rr = 60 + u * 270; for (const f of alive()) { const dx = gx - f.x, dy = gy - f.y, d = Math.hypot(dx, dy) || 1; if (d < 420 && d > 18 && !FOES[f.type].noKb && f !== B.big) { f.x += dx / d * Math.min(26, d); f.y += dy / d * Math.min(26, d); } if (d < rr + f.r) hurtFoe(f, D(52), { id, noAcc: true }, -dx, -dy, 0.2); } });
    at(T, () => { big(gx, gy, 360 + 80 * up, 400 + 80 * up, '#FF8FB8'); lfxAdd({ k: 'ring', x: gx, y: gy, r: 20, to: 360, life: 0.4, max: 0.4, col: '#FF8FB8', w: 10 }); lfxAdd({ k: 'ring', x: gx, y: gy, r: 10, to: 280, life: 0.45, max: 0.45, col: '#C77DFF', w: 10 }); shake(0.5); flash('255,200,230', 0.2); });
  }
  if (id === 'honey') {      /* 꿀 폭포: 하늘에서 쏟아지는 꿀 기둥, 그 뒤로 꿀 바다 */
    at(0, () => { lfxAdd({ k: 'fall', x: p.x, y: p.y, life: 0.9, max: 0.9 }); });
    at(0.28, () => { big(p.x, p.y, 270 + 60 * up, 220, '#FFC23D'); B.zones.push({ x: p.x, y: p.y, r: 230 + 60 * up, life: 4 + up, tick: 0, dmg: D(30 + 10 * up), pop: D(26), w, follow: true, leg: true, sticky: true, pet: !!B.legPet });      /* 끈적 꿀: 오래 있을수록 더 아프고, 끝날 때 터져요 */ shake(0.5); flash('255,210,100', 0.2); });
  }
  if (id === 'lemon') {      /* 레몬 폭풍: 회오리가 적에게 산성 표식을 쌓고, 폭풍이 끝나면 표식이 한꺼번에 터져요 */
    at(0, () => { for (const f of onScreen()) { f.acid = Math.min((f.acid || 0) + 2.5, 22); f.lmk = 1; f.flash = 0.1; } flash('200,240,90', 0.25);
      const T = 1.7, ts = shuffle(onScreen()).slice(0, 3 + up); while (ts.length < 3 + up) ts.push({ x: p.x + (Math.random() - 0.5) * 300, y: p.y + (Math.random() - 0.5) * 300 });
      ts.forEach((f, i) => { const tw = { k: 'twister', x: f.x, y: f.y, seed: i * 2.1, life: T, max: T }; lfxAdd(tw);
        legTick(0, T, 0.12, u => { let b = null, bn = -1; for (const g of alive()) { if ((g.x - tw.x) ** 2 + (g.y - tw.y) ** 2 > 420 * 420) continue; let n = 0; for (const h of B.foes) if (!h.dead && (h.x - g.x) ** 2 + (h.y - g.y) ** 2 < 120 * 120) n++; n -= Math.hypot(g.x - tw.x, g.y - tw.y) / 120; if (n > bn) { bn = n; b = g; } }      /* 가까우면서 적이 뭉친 곳으로 */
          if (b) { const d = Math.hypot(b.x - tw.x, b.y - tw.y) || 1; tw.x += (b.x - tw.x) / d * Math.min(26, d); tw.y += (b.y - tw.y) / d * Math.min(26, d); }
          for (const g of alive()) if ((g.x - tw.x) ** 2 + (g.y - tw.y) ** 2 < (130 + g.r) ** 2) { hurtFoe(g, D(40), { id, noAcc: true }, g.x - tw.x, g.y - tw.y); g.acid = Math.min((g.acid || 0) + 0.6, 22); g.lmk = Math.min(12, (g.lmk || 0) + 1); } });
        legLater(T, () => big(tw.x, tw.y, 150, 200, '#B9DD52')); });
      legLater(T + 0.15, () => { let n = 0; for (const g of alive()) if (g.lmk) { const k = g.lmk; g.lmk = 0; hurtFoe(g, D(30 + 22 * k), { id, noAcc: true }, g.x - p.x, g.y - p.y, 0.3); if (!headless && n++ < 40) lfxAdd({ k: 'pop', x: g.x, y: g.y, r: 22 + k * 3, life: 0.3, max: 0.3, col: '#B9DD52' }); } if (n) { shake(0.5); flash('210,245,110', 0.2); } });      /* 산성 대폭발: 표식이 많을수록 세게 */
    });
  }
  if (id === 'skewer') {      /* 꼬치 소나기: 거대한 꼬치가 사방으로 두 번 꿰뚫고 지나가요 */
    Array.from({ length: 2 + up }, (_, i) => i * 0.3).forEach((t, v) => at(t, () => { const px = p.x, py = p.y; shake(0.35);
      for (let i = 0; i < 16; i++) { const a = i * 0.3927 + v * 0.196, c = Math.cos(a), s = Math.sin(a); lfxAdd({ k: 'spear', x: px, y: py - 10, a, len: 560, life: 0.38, max: 0.38, col: v ? '#FF5A3D' : '#FF9A1F' });
        for (const f of alive()) { const rx = f.x - px, ry = f.y - py, al = rx * c + ry * s; if (al > 0 && al < 560 && Math.abs(-rx * s + ry * c) < 30 + f.r) hurtFoe(f, D(230), { id, noAcc: true }, c, s); } }
      lfxAdd({ k: 'ring', x: px, y: py, r: 10, to: 120, life: 0.3, max: 0.3, col: '#FFFFFF', w: 8 }); }));
  }
  if (id === 'choco') {      /* 초코 메테오: 경고 표시 → 거대한 운석 → 큰 폭발과 용암 */
    let best = null, bn = -1; at(0, () => { for (const f of onScreen()) { let n = 0; for (const g of B.foes) if (!g.dead && (g.x - f.x) ** 2 + (g.y - f.y) ** 2 < 170 * 170) n++; if (n > bn) { bn = n; best = f; } }
      const x = best ? best.x : p.x, y = best ? best.y : p.y - 120; lfxAdd({ k: 'warn', x, y, r: 230, life: 0.85, max: 0.85 }); lfxAdd({ k: 'meteor', x, y, dx: 260, dy: -560, life: 0.85, max: 0.85, cols: ['#7A2E10', '#FF7A1F', '#FFE27A'], r: 26, slow: true, sk: 'choco' });
      legLater(0.85, () => { big(x, y, 240 + 40 * up, 760, '#6B3A1E'); for (let k = 0; k < 8 + 4 * up; k++) { const a = k * 6.283 / (8 + 4 * up); big(x + Math.cos(a) * 170, y + Math.sin(a) * 170, 90, 220, '#A0663C'); }
        lfxAdd({ k: 'quake', x, y, life: 0.9, max: 0.9 }); lfxAdd({ k: 'ring', x, y, r: 20, to: 330, life: 0.5, max: 0.5, col: '#FFFFFF', w: 12 }); lfxAdd({ k: 'ring', x, y, r: 10, to: 250, life: 0.55, max: 0.55, col: '#FF7A1F', w: 12 });
        B.zones.push({ x, y, r: 200, life: 3.5, tick: 0, dmg: D(30), w, fire: true, leg: true, pet: !!B.legPet }); shake(1); flash('255,210,150', 0.4); }); });
  }
  if (id === 'cotton') {      /* 제네시스: 하늘이 갈라지고 화면 전체에 빛이 내려요 */
    at(0, () => { lfxAdd({ k: 'rise', x: p.x, y: p.y, life: 0.55, max: 0.55 }); flash('255,250,220', 0.2); shake(0.3); });      /* 먼저 내 몸에서 빛이 하늘로 솟구쳐요 */
    at(0.55, () => { const px = p.x, py = p.y; flash('255,250,220', 0.5); shake(0.9);      /* 그 빛이 하늘에서 적에게 내리쳐요 */
      for (const f of onScreen().slice(0, 30)) hurtFoe(f, D(430), { id, noAcc: true }, f.x - px, f.y - py);
      big(px, py, 420, 260, '#FFF6C0'); lfxAdd({ k: 'ring', x: px, y: py, r: 20, to: 420, life: 0.5, max: 0.5, col: '#FFFFFF', w: 12 });
      shuffle(onScreen()).slice(0, 14 + 6 * up).forEach((f, i) => legLater(0.05 + i * 0.05, () => { lfxAdd({ k: 'beam', x: f.x, y: f.y, life: 0.4, max: 0.4 }); big(f.x, f.y, 70, 180, '#FFF6C0'); })); });
  }
  if (id === 'cane') {      /* 지팡이 대폭격: 거대한 지팡이 사탕이 두 겹으로 내리꽂혀요 */
    [[180, 0, 12], [320, 0.5, 16], [440, 1.0, 20], [560, 1.5, 24], [680, 2.0, 28]].slice(0, 2 + up).forEach(([R0, t0, n], ring) => { for (let i = 0; i < n; i++) at(t0 + i * 0.035, () => { const a = i * 6.283 / n + ring * 0.26, x = p.x + Math.cos(a) * R0, y = p.y + Math.sin(a) * R0;
      lfxAdd({ k: 'cane', x, y, life: 0.55, max: 0.55, fall: 0.22 }); legLater(0.22, () => { big(x, y, 86, 200, '#FF5A7A'); lfxAdd({ k: 'pop', x, y, r: 44, life: 0.3, max: 0.3, col: '#FF5A7A' }); }); }); });
    at(1.2 + 0.55 * up, () => { lfxAdd({ k: 'cane', x: p.x, y: p.y, life: 0.7, max: 0.7, fall: 0.3, huge: true }); legLater(0.3, () => { big(p.x, p.y, 280, 380, '#FF5A7A'); lfxAdd({ k: 'ring', x: p.x, y: p.y, r: 20, to: 280, life: 0.4, max: 0.4, col: '#FFFFFF', w: 10 }); shake(0.8); flash('255,200,210', 0.25); }); });
  }
}
function legUpdate(dt) {
  if (B.cin) { B.cin.t += dt; if (B.cin.t > B.cin.max) B.cin = null; }
  for (const f of B.lfx) f.life -= dt; B.lfx = B.lfx.filter(f => f.life > 0);
  if (!run.leg) return;
  for (const w of B.weapons) if (isLeg(w.id)) { w.ut = (w.ut ?? 2.5) - dt * atkNow(); if (w.ut <= 0 && B.foes.length) { w.ut = lStarCd(w.id); castLeg(w); } }
  for (const q of B.legQ) { q.t -= dt; if (q.t <= 0) q.f(); } B.legQ = B.legQ.filter(q => q.t > 0);
}
/* 연출 그리기: 어두워지는 화면과 위아래 검은 띠 */
function legDim() {
  if (!B.cin) return; const c = B.cin, env = Math.min(1, c.t / 0.2, (c.max - c.t) / 0.45);
  ctx.fillStyle = `rgba(10,0,34,${(0.5 * env).toFixed(3)})`; ctx.fillRect(0, 0, lw, lh);
  const bh = Math.round(13 * env); R('#0A0014', 0, 0, lw, bh); R('#0A0014', 0, lh - bh, lw, bh);
}
const LEGCOL = { cotton: '#FFF6C0', pin: '#FFD23F', cream: '#FFFFFF', star: '#FFD23F', macaron: '#FF8FB8', honey: '#FFC23D', lemon: '#B9DD52', skewer: '#FF9A1F', choco: '#FF7A1F', cane: '#FF5A7A' };
/* ───── 전설 스킬 소품 그림: 작은 디테일들 ───── */
const PASTEL = ['#FF8FB8', '#8FD3FF', '#FFE27A', '#B6F08A', '#C9A4FF', '#FFB38A'];
function starPx(cx, cy, r, col, rot, ink) {      /* 다섯 꼭지 별 (한 칸씩 찍어요) */
  const rr = r + (ink ? 1 : 0), S5 = 1.2566, inner = 0.48;
  for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) { const d = Math.hypot(x, y); if (d > rr) continue; let t = (Math.atan2(y, x) - rot + Math.PI / 2) % S5; if (t < 0) t += S5; t = Math.abs(t - S5 / 2) / (S5 / 2); const b = rr * (inner + (1 - inner) * (1 - t)); if (d <= b) R(ink ? INK : col, cx + x, cy + y, 1, 1); }
}
function cuteFace(x, y, s, mood) {      /* 눈 두 개, 볼터치, 웃는 입 */
  const g = Math.max(1, Math.round(s * 0.35)); R(INK, x - g - 1, y - 1, 1, 2); R(INK, x + g, y - 1, 1, 2);
  if (s >= 4) { R('#FF8FB8', x - g - 2, y + 1, 2, 1); R('#FF8FB8', x + g + 1, y + 1, 2, 1); }
  if (mood === 'o') R(INK, x, y + 1, 1, 1); else { R(INK, x - 1, y + 1, 1, 1); R(INK, x + 1, y + 1, 1, 1); R(INK, x, y + 2, 1, 1); }
}
function bee(x, y, t, face) {      /* 꿀벌: 노랑·까망 줄무늬, 파닥이는 날개 */
  const fl = Math.floor(t * 30) % 2; x = Math.round(x); y = Math.round(y);
  R('#FFFFFF', x - 2, y - 4 - fl, 3, 2 + fl); R('#FFFFFF', x + 1, y - 4 - fl, 3, 2 + fl); R('#BFE6FF', x - 1, y - 3, 1, 1); R('#BFE6FF', x + 2, y - 3, 1, 1);
  R(INK, x - 4, y - 2, 9, 5); R('#FFD23F', x - 3, y - 1, 7, 3); R(INK, x - 1, y - 1, 1, 3); R(INK, x + 1, y - 1, 1, 3);
  R(INK, x + (face > 0 ? 4 : -5), y, 1, 1); R(INK, x + (face > 0 ? -5 : 4), y, 1, 1);
}
function cherry(x, y) { x = Math.round(x); y = Math.round(y); pline(x, y - 2, x + 2, y - 6, '#3F8F2A'); R('#5CC04A', x + 2, y - 7, 2, 1); pdisc(x, y, 3, INK); pdisc(x, y, 2, '#E8323C'); R('#FFFFFF', x - 1, y - 1, 1, 1); }
function mint(x, y, s) { x = Math.round(x); y = Math.round(y); pdisc(x, y, s + 1, INK); pdisc(x, y, s, '#FFFFFF'); for (let i = 0; i < 3; i++) { const a = i * 2.094 + B.t * 4; pline(x, y, Math.round(x + Math.cos(a) * s), Math.round(y + Math.sin(a) * s), '#E8323C'); } }
function cloudPuff(x, y, w, cols) { x = Math.round(x); y = Math.round(y); for (const [dx, dy, r] of [[-w, 1, 0.55], [w, 1, 0.55], [-w * 0.45, -2, 0.75], [w * 0.45, -2, 0.75], [0, -4, 0.9]]) pdisc(Math.round(x + dx), Math.round(y + dy), Math.round(w * r) + 1, INK); for (const [dx, dy, r, c] of [[-w, 1, 0.55, 1], [w, 1, 0.55, 1], [-w * 0.45, -2, 0.75, 0], [w * 0.45, -2, 0.75, 0], [0, -4, 0.9, 2]]) pdisc(Math.round(x + dx), Math.round(y + dy), Math.round(w * r), cols[c]); R('#FFFFFF', x - 2, y - 7, 3, 1); }
const FRUIT = [['#E8323C', '#FFB0B8', 'straw'], ['#7BD15A', '#D8FFB8', 'grape'], ['#FF9A1F', '#FFE0A8', 'orange'], ['#8A4FD0', '#E0C8FF', 'grape'], ['#E8323C', '#FFB0B8', 'straw']];
function legDraw() {
  const p = B.p;
  for (const f of B.lfx) {
    const k = Math.max(0, f.life / f.max), e = 1 - k, fx = X(f.x), fy = Y(f.y), pxw = v => Math.round(v / WP);
    if (f.k === 'charge') {      /* 기 모으기: 몸으로 빛이 빨려 들어와요 */
      const cx = X(p.x), cy = Y(p.y) - 6; putDisc(cx, cy + 6, 8 + Math.round(e * 14), 5 + Math.round(e * 8), '#FFF3C0', 7);
      for (let i = 0; i < 14; i++) { const a = i * 0.449 + e * 5, d = (1 - e) * 46 + 3; pstar(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.8), e > 0.7 ? 2 : 1, i % 2 ? '#FFFFFF' : '#FFD23F'); }
      pcircle(cx, cy + 6, Math.round(34 * (1 - e)) + 3, '#FFFFFF');
    }
    else if (f.k === 'slash') {      /* 화면을 가르는 초승달 베기 */
      const h = Math.min(1, e * 2.6), fade = k > 0.5 ? 1 : k / 0.5, c = Math.cos(f.a), s = Math.sin(f.a), L = pxw(f.len), nx = -s, ny = c, bow = pxw(f.bow), T = pxw(f.T) * fade, pts = [];
      for (let i = 0, n = Math.ceil(L * 2); i <= n; i++) { const u = i / n; if (u > h) break; const t = (u * 2 - 1) * L, b = Math.sin(Math.PI * u) * bow; pts.push([fx + c * t + nx * b, fy + s * t + ny * b, Math.max(1, T * Math.pow(Math.sin(Math.PI * u), 0.55) * Math.min(1, (h - u) * 9 + 0.12))]); }
      for (const [col, m, add] of [[INK, 1, 4], ['#FFB020', 1, 1], ['#FFF3C0', 0.7, 0], ['#FFFFFF', 0.38, 0]]) { ctx.fillStyle = col; for (const [x, y, th] of pts) { const r = Math.max(1, Math.round(th * m) + add); ctx.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), r, r); } }
      for (let i = 6; i < pts.length; i += 9) { const [x, y] = pts[i], u = i / Math.max(1, pts.length - 1), age = Math.max(0, h - u) + e * 0.5, rr = Math.min(6, 2 + age * 9), dy = age * 26;      /* 밀가루 구름: 지나간 자리에서 몽글몽글 내려앉아요 */
        if (rr > 1.5 && k > 0.12) { pdisc(Math.round(x + nx * 6), Math.round(y + ny * 6 + dy), Math.round(rr), '#EDE3D2'); pdisc(Math.round(x + nx * 6 - 1), Math.round(y + ny * 6 + dy - 1), Math.max(1, Math.round(rr - 2)), '#FFFFFF'); if (i % 18 === 6) R('#D9C7A8', Math.round(x - nx * 4), Math.round(y - ny * 4 + dy * 1.4), 1, 1); } }
      if (pts.length > 2 && h < 1.0 + 1e-6 && k > 0.25) { const [hx, hy] = pts[pts.length - 1], [px0, py0] = pts[pts.length - 2], ta = Math.atan2(hy - py0, hx - px0) + Math.PI / 2, tc = Math.cos(ta) * 11, ts = Math.sin(ta) * 11, spin = Math.floor(B.t * 24) % 3;      /* 굴러가는 나무 밀대 */
        for (let q = -1.55; q <= 1.551; q += 0.2) { const ax = Math.round(hx + tc * q), ay = Math.round(hy + ts * q), hd = Math.abs(q) > 1.05; pdisc(ax, ay, hd ? 3 : 5, INK); }
        for (let q = -1.55; q <= 1.551; q += 0.2) { const ax = Math.round(hx + tc * q), ay = Math.round(hy + ts * q), hd = Math.abs(q) > 1.05; pdisc(ax, ay, hd ? 2 : 4, hd ? '#8A5230' : '#D9A066'); if (!hd) R('#F4D2A0', ax - 1, ay - 3, 2, 1); }      /* 손잡이 달린 둥근 나무 밀대 */
        for (let g = -1; g <= 1; g++) { const q = (g + spin * 0.33) * 0.45; R('#B9783F', Math.round(hx + tc * q), Math.round(hy + ts * q), 1, 1); R('#B9783F', Math.round(hx + tc * q + 1), Math.round(hy + ts * q + 1), 1, 1); } }
    }
    else if (f.k === 'wave') {      /* 크림 파도 */
      const xw = f.x0 + f.dir * f.sp * e * f.max, fe0 = X(xw), d = f.dir, a = Math.min(1, k * 3);
      ctx.globalAlpha = 0.5 * a; for (let y = 0; y < lh; y++) { const fe = fe0 + d * Math.round(Math.sin(y * 0.28 + B.t * 14) * 3 + Math.sin(y * 0.11) * 4); R('#FFD9EA', d > 0 ? fe - 92 : fe, y, 92, 1); } ctx.globalAlpha = 0.85 * a;
      for (let y = 0; y < lh; y++) { const fe = fe0 + d * Math.round(Math.sin(y * 0.28 + B.t * 14) * 3 + Math.sin(y * 0.11) * 4); R('#FFF3E6', d > 0 ? fe - 40 : fe, y, 40, 1); } ctx.globalAlpha = a;
      for (let y = -6; y < lh + 10; y += 11) { const bx = fe0 + d * Math.round(Math.sin(y * 0.28 + B.t * 14) * 3 + 6); pdisc(bx, y, 9, INK); pdisc(bx, y, 8, '#FFFFFF'); pdisc(bx - d * 2, y + 2, 4, '#FFD9EA'); pdisc(bx + d, y - 3, 2, '#FFFFFF'); }
      for (let i = 0; i < 34; i++) { const yy = (i * 47 + Math.floor(B.t * 30) * 7) % lh, xx = fe0 - d * (8 + (i * 29) % 70), c = PASTEL[i % PASTEL.length], o = (i + Math.floor(B.t * 6)) % 4; if (o < 2) R(c, xx, yy, 3, 1); else R(c, xx, yy, 1, 3); }      /* 크림에 박힌 무지개 스프링클 */
      for (let y = 4, n = 0; y < lh; y += 11, n++) { const bx = fe0 + d * Math.round(Math.sin(y * 0.28 + B.t * 14) * 3 + 6); if (n % 3 === 1) cherry(bx + d * 2, y - 8 + Math.round(Math.sin(B.t * 8 + n) * 1.5)); else if (n % 3 === 2) { R('#FFFFFF', bx + d * 4, y - 5, 2, 2); R('#FFFFFF', bx + d * 6, y - 7, 1, 2); } }      /* 파도 꼭대기에 탄 체리와 크림 뿔 */
      for (let i = 0; i < 10; i++) { const yy = (i * 71 + Math.floor(B.t * 12) * 5) % lh, xx = fe0 - d * (30 + (i * 17) % 50), dr = ((B.t * 2 + i * 0.37) % 1) * 8; R('#FFF3E6', xx, yy + Math.round(dr), 2, 3); R('#FFD9EA', xx, yy + Math.round(dr) + 3, 2, 1); }      /* 흘러내리는 크림 방울 */
      ctx.globalAlpha = 1;
    }
    else if (f.k === 'meteor') {      /* 떨어지는 별똥별 / 운석 */
      const h = f.slow ? e * e : e, hx = fx + pxw(f.dx) * (1 - h), hy = fy + pxw(f.dy) * (1 - h), tl = f.r > 8 ? 70 : 34, ux = f.dx / Math.hypot(f.dx, f.dy), uy = f.dy / Math.hypot(f.dx, f.dy), r = f.r;
      f.cols.forEach((col, i) => { const t = Math.max(1, Math.round((r + 3 - i * (r * 0.3 + 1)) * 0.9)); pline(Math.round(hx), Math.round(hy), Math.round(hx + ux * tl * (1 - i * 0.18)), Math.round(hy + uy * tl * (1 - i * 0.18)), col, t); });
      if (f.sk === 'star' || f.sk === 'big') { const big = f.sk === 'big', c = big ? '#FFD23F' : PASTEL[(f.hue || 0) % PASTEL.length], rr = big ? r + 2 : r + 3, rot = B.t * (big ? 3 : 8) + (f.hue || 0);
        for (let i = 1; i <= (big ? 8 : 4); i++) { const q = i * (big ? 7 : 6), tw = Math.floor(B.t * 16 + i) % 2; pstar(Math.round(hx + ux * q + Math.sin(B.t * 20 + i) * 2), Math.round(hy + uy * q), tw ? 2 : 1, i % 2 ? '#FFFFFF' : c); }      /* 반짝이 꼬리 */
        starPx(Math.round(hx), Math.round(hy), rr, null, rot, true); starPx(Math.round(hx), Math.round(hy), rr, c, rot); starPx(Math.round(hx - 1), Math.round(hy - 1), Math.max(1, Math.round(rr * 0.45)), '#FFFFFF', rot);
        if (big) cuteFace(Math.round(hx), Math.round(hy) + 1, rr, Math.floor(B.t * 3) % 2 ? 'o' : 'u'); continue; }
      if (f.sk === 'choco') { const X0 = Math.round(hx), Y0 = Math.round(hy);      /* 초코볼 운석: 갈라진 금, 박힌 초코칩, 녹아 떨어지는 방울 */
        pdisc(X0, Y0, r + 1, INK); pdisc(X0, Y0, r, '#6B3A1E'); pdisc(X0 - 4, Y0 - 4, Math.round(r * 0.7), '#8A5230'); pdisc(X0 - 7, Y0 - 7, Math.round(r * 0.25), '#C08A5A');
        for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.4, d = r * (0.3 + (i % 3) * 0.22); R('#3A1E0E', Math.round(X0 + Math.cos(a) * d), Math.round(Y0 + Math.sin(a) * d), 3, 2); }
        pline(X0 - 6, Y0 + 3, X0 + 2, Y0 - 2, '#3A1E0E'); pline(X0 + 2, Y0 - 2, X0 + 9, Y0 + 1, '#3A1E0E');
        for (let i = 0; i < 6; i++) { const q = (i * 13 + B.t * 90) % 60; pdisc(Math.round(X0 + ux * (r + q)), Math.round(Y0 + uy * (r + q) + q * 0.3), Math.max(1, 3 - (i % 3)), i % 2 ? '#8A5230' : '#FF9A3D'); } continue; }
      pdisc(Math.round(hx), Math.round(hy), r + 1, INK); pdisc(Math.round(hx), Math.round(hy), r, f.cols[0]); pdisc(Math.round(hx - r * 0.2), Math.round(hy - r * 0.2), Math.max(1, Math.round(r * 0.6)), f.cols[1]); pdisc(Math.round(hx - r * 0.3), Math.round(hy - r * 0.3), Math.max(1, Math.round(r * 0.28)), '#FFFFFF');
      if (r > 8) for (let i = 0; i < 10; i++) pstar(Math.round(hx + ux * (8 + i * 6) + Math.sin(B.t * 30 + i) * 4), Math.round(hy + uy * (8 + i * 6)), 1 + i % 2, i % 2 ? '#FFB020' : '#FFFFFF');
    }
    else if (f.k === 'warn') {      /* 낙하 지점 경고 */
      const R0 = pxw(f.r), pul = Math.floor(B.t * 12) % 2, rr = Math.round(R0 * (0.35 + 0.65 * e));
      ctx.globalAlpha = 0.28; pdisc(fx, fy, R0, '#FF3B1F'); ctx.globalAlpha = 1; pcircle(fx, fy, R0, pul ? '#FFE27A' : '#FF3B1F', 2); pcircle(fx, fy, rr, '#FFFFFF');
      for (let i = 0; i < 8; i++) { const a = i * 0.785 + B.t * 2; pline(Math.round(fx + Math.cos(a) * R0 * 0.2), Math.round(fy + Math.sin(a) * R0 * 0.2), Math.round(fx + Math.cos(a) * R0), Math.round(fy + Math.sin(a) * R0), '#FF7A3D'); }
    }
    else if (f.k === 'quake') {      /* 큰 폭발: 불덩이와 갈라지는 땅 */
      const R0 = pxw(250) * Math.min(1, e * 2.4), a = Math.min(1, k * 2.2);
      ctx.globalAlpha = a; putDisc(fx, fy, Math.max(2, R0), Math.max(2, Math.round(R0 * 0.8)), '#FFB020', 9); putDisc(fx, fy, Math.round(R0 * 0.6), Math.round(R0 * 0.48), '#FFE27A', 10); putDisc(fx, fy, Math.round(R0 * 0.3), Math.round(R0 * 0.24), '#FFFFFF', 12);
      for (let i = 0; i < 14; i++) { const ang = i * 0.449 + 0.2, len = R0 * (0.7 + (i % 3) * 0.25); pline(fx, fy, Math.round(fx + Math.cos(ang) * len), Math.round(fy + Math.sin(ang) * len * 0.8), INK, 3); pline(fx, fy, Math.round(fx + Math.cos(ang) * len), Math.round(fy + Math.sin(ang) * len * 0.8), '#FF7A1F', 1); }
      for (let i = 0; i < 20; i++) { const ang = i * 0.314, d = R0 * (0.4 + (i % 5) * 0.2) , yy = fy + Math.sin(ang) * d * 0.8 - e * (20 + (i % 4) * 14); pdisc(Math.round(fx + Math.cos(ang) * d), Math.round(yy), 2 + i % 3, i % 2 ? '#6B3A1E' : '#A0663C'); } ctx.globalAlpha = 1;
    }
    else if (f.k === 'galaxy') {      /* 마카롱 은하: 소용돌이 팔과 도는 마카롱 */
      const cx = X(f.gx), cy = Y(f.gy), rr = pxw(60 + e * 270), a = Math.min(1, k * 4), cols = ['#FF8FB8', '#C77DFF', '#FFFFFF', '#8FD3FF'];
      ctx.globalAlpha = a; putDisc(cx, cy, Math.round(rr * 0.5) + 8, Math.round(rr * 0.4) + 6, '#3A1A6A', 8); putDisc(cx, cy, Math.round(rr * 0.22) + 4, Math.round(rr * 0.18) + 3, '#C77DFF', 8);
      for (let arm = 0; arm < 4; arm++) for (let s = 1; s <= 46; s++) { const ang = arm * 1.571 + s * 0.13 + e * 7, d = rr * s / 46, sz = s > 36 ? 3 : s > 18 ? 2 : 1; R(cols[arm], Math.round(cx + Math.cos(ang) * d), Math.round(cy + Math.sin(ang) * d * 0.85), sz, sz); }
      for (let i = 0; i < 8; i++) { const ang = i * 0.785 + e * 4.5, d = rr * (0.55 + 0.45 * ((i % 2) ? 1 : 0.7)), mx = Math.round(cx + Math.cos(ang) * d), my = Math.round(cy + Math.sin(ang) * d * 0.85), r = 6 + (i % 3);
        pdisc(mx, my + 1, r + 1, INK); const mc = ['#FF8FB8', '#C9A4FF', '#B6F08A', '#8FD3FF'][i % 4]; pdisc(mx, my - 2, r, mc); pdisc(mx, my + 2, r, mc); R('#FFF3E6', mx - r + 1, my - 1, r * 2 - 1, 3); R(INK, mx - r + 2, my + 2, r * 2 - 3, 1); pstar(mx - 3, my - 5, 1, '#FFFFFF'); cuteFace(mx, my - 3, r, (i + Math.floor(B.t * 2)) % 3 ? 'u' : 'o'); }      /* 웃는 마카롱 */
      for (let i = 0; i < 3; i++) { const ang = -e * 3 + i * 2.094, d = rr * 0.33, dx = Math.round(cx + Math.cos(ang) * d), dy = Math.round(cy + Math.sin(ang) * d * 0.85); pdisc(dx, dy, 6, INK); pdisc(dx, dy, 5, '#FFB38A'); pdisc(dx, dy - 1, 4, ['#FF8FB8', '#FFFFFF', '#6B3A1E'][i]); pdisc(dx, dy, 2, '#3A1A6A'); R(PASTEL[(i * 2 + 1) % 6], dx - 3, dy - 3, 1, 1); R(PASTEL[i * 2 % 6], dx + 2, dy - 2, 1, 1); }      /* 도넛 행성 */
      for (let i = 0; i < 22; i++) { const ang = i * 2.4 + i * i * 0.01, d = rr * (0.15 + ((i * 37) % 85) / 100), tw = Math.floor(B.t * 6 + i) % 3; if (tw) pstar(Math.round(cx + Math.cos(ang) * d), Math.round(cy + Math.sin(ang) * d * 0.85), tw - 1, '#FFFFFF'); }      /* 반짝이는 설탕 별 */
      ctx.globalAlpha = 1;
    }
    else if (f.k === 'fall') {      /* 꿀 폭포 */
      const env = Math.min(1, e * 6, k * 2.5), w = Math.round(pxw(130) * env), bx = fx, by = fy + 4;
      ctx.globalAlpha = 0.5 * env; R('#FFE9A8', bx - w - 5, 0, w * 2 + 10, by); ctx.globalAlpha = 1; R(INK, bx - w - 1, 0, 2, by); R(INK, bx + w - 1, 0, 2, by); R('#F7A81B', bx - w + 1, 0, w * 2 - 2, by); R('#FFC23D', bx - w + 4, 0, w * 2 - 8, by);
      for (let i = 0; i < 20; i++) { const sx = bx - w + 4 + ((i * 17) % Math.max(1, w * 2 - 10)), sy = ((i * 41 + B.t * 520) % (by + 30)) - 20; R('#FFF3C0', sx, sy, 2, 12 + i % 3 * 6); }
      putDisc(bx, by, w + 18, Math.round(w * 0.45) + 6, '#FFC23D', 10); pcircle(bx, by, w + 12 + Math.round(e * 10), '#FFE9A8', 2); pcircle(bx, by, Math.round((w + 6) * 0.75) + Math.round(e * 10), '#FFD23F', 1);
      for (let i = 0; i < 16; i++) { const ang = i * 0.393 + 0.1, d = (w + 6) * (0.6 + e * 1.1), yy = by - Math.abs(Math.sin(ang)) * (14 + (i % 4) * 8) * (1 - e * 0.6), xx = Math.round(bx + Math.cos(ang) * d); pdisc(xx, Math.round(yy), 2 + i % 2, i % 2 ? '#FFE9A8' : '#F7A81B'); R('#F7A81B', xx, Math.round(yy) - 3 - i % 2, 1, 2); }      /* 꿀방울 (물방울 모양) */
      if (env > 0.3) { const dy0 = 10 + Math.round(Math.sin(B.t * 3) * 2); R(INK, bx - 3, 0, 7, dy0 + 2); R('#B9783F', bx - 2, 0, 5, dy0); for (let r0 = 0; r0 < 3; r0++) { R(INK, bx - 7, dy0 + r0 * 4, 15, 4); R(r0 % 2 ? '#D9A066' : '#B9783F', bx - 6, dy0 + 1 + r0 * 4, 13, 2); } }      /* 하늘에서 내려온 나무 꿀 국자 */
      for (let i = 0; i < 4; i++) { const a = B.t * (2 + i * 0.3) + i * 1.57, bxx = bx + Math.cos(a) * (w + 22 + i * 6), byy = by - 22 - i * 9 + Math.sin(a * 2) * 6; bee(bxx, byy, B.t + i, Math.sin(a + 1.57) > 0 ? 1 : -1); }      /* 꿀 냄새에 날아온 꿀벌들 */
    }
    else if (f.k === 'twister') {      /* 레몬 회오리 */
      const a = Math.min(1, e * 6, k * 3); ctx.globalAlpha = a;
      for (let i = 0; i < 26; i++) { const yy = fy - i * 4 - 2, w = 5 + Math.round(i * 1.7), wob = Math.round(Math.sin(B.t * 9 + i * 0.5 + f.seed) * (2 + i * 0.22)), col = ['#7FAF1E', '#B9DD52', '#E6F58A'][(i + Math.floor(B.t * 14)) % 3];
        R(INK, fx + wob - w - 1, yy, w * 2 + 3, 5); R(col, fx + wob - w, yy, w * 2 + 1, 4); R('#FFFFFF', fx + wob - w + ((i * 7 + Math.floor(B.t * 20)) % (w * 2)), yy + 1, 3, 1); }
      for (let i = 0; i < 9; i++) { const ang = B.t * 6 + i * 0.7 + f.seed, hh = (i * 11 + B.t * 30) % 100, w = 12 + hh * 0.5, sx = Math.round(fx + Math.cos(ang) * w), sy = Math.round(fy - hh - 4 + Math.sin(ang) * 5);
        pdisc(sx, sy, 5, INK); pdisc(sx, sy, 4, '#FFE84A'); pdisc(sx, sy, 2, '#FFFBD0'); R('#E0C81E', sx - 4, sy, 9, 1); R('#E0C81E', sx, sy - 4, 1, 9); }
      for (let i = 0; i < 8; i++) { const ang = B.t * 4 + i * 0.785 + f.seed, q = ((B.t * 1.5 + i * 0.13) % 1), dd = 18 + q * 40, sx = Math.round(fx + Math.cos(ang) * dd), sy = Math.round(fy - 30 + Math.sin(ang) * dd * 0.5 + q * q * 30); if (i % 3 === 0) { R('#3F8F2A', sx - 2, sy, 5, 2); R('#7BD15A', sx - 1, sy, 3, 1); R('#2E6A1E', sx + 2, sy + 1, 1, 1); } else if (i % 3 === 1) { pdisc(sx, sy, 2, '#FFFBD0'); R('#FFFBD0', sx, sy - 3, 1, 2); } else { R('#F4ECC0', sx, sy, 2, 1); R(INK, sx - 1, sy, 1, 1); } }      /* 잎사귀, 레몬즙 방울, 씨앗 */
      putDisc(fx, fy + 2, 40, 12, '#B9DD52', 6); ctx.globalAlpha = 1;
    }
    else if (f.k === 'spear') {      /* 거대한 꼬치 */
      const h = Math.min(1, e * 2.8), L = pxw(f.len), c = Math.cos(f.a), s = Math.sin(f.a), hd = L * h, tl = Math.min(hd, pxw(260)), x1 = Math.round(fx + c * hd), y1 = Math.round(fy + s * hd), x0 = Math.round(fx + c * (hd - tl)), y0 = Math.round(fy + s * (hd - tl)), fade = k > 0.45 ? 1 : k / 0.45, t = Math.max(1, Math.round(5 * fade)), nx = -s, ny = c;
      pline(x0, y0, x1, y1, INK, t + 1); pline(x0, y0, x1, y1, '#C99A5E', Math.max(1, t - 1)); pline(x0, y0, x1, y1, '#E8C48A', 1);      /* 나무 꼬치 막대 */
      if (fade > 0.3) { for (let q = 0; q < 5; q++) { const dd = 8 + q * 11, fxp = Math.round(x1 - c * dd), fyp = Math.round(y1 - s * dd), [fc, fh, ft] = FRUIT[q], fr = ft === 'grape' ? 4 : 5;      /* 꼬치에 꿰인 과일 */
          pdisc(fxp, fyp, fr + 1, INK); pdisc(fxp, fyp, fr, fc); if (ft === 'straw') { R('#FFE27A', fxp - 2, fyp, 1, 1); R('#FFE27A', fxp + 1, fyp + 2, 1, 1); R('#FFE27A', fxp + 2, fyp - 1, 1, 1); R('#3F8F2A', Math.round(fxp - c * fr) - 1, Math.round(fyp - s * fr) - 1, 3, 2); } if (ft === 'orange') { R('#FFC864', fxp - 1, fyp + 1, 1, 1); R('#FFC864', fxp + 2, fyp, 1, 1); } R(fh, fxp - 2, fyp - 3, 2, 1); R('#FFFFFF', fxp - 2, fyp - 2, 1, 1); }      /* 설탕 코팅 반짝임 */
        pline(Math.round(x1), Math.round(y1), Math.round(x1 + c * 7), Math.round(y1 + s * 7), '#C99A5E', 2);
        for (let q = 0; q < 4; q++) { const tt = (q * 0.27 + B.t * 3) % 1, sx = Math.round(x0 + (x1 - x0) * tt + nx * ((q % 2) * 2 - 1) * 5), sy = Math.round(y0 + (y1 - y0) * tt + ny * ((q % 2) * 2 - 1) * 5); pstar(sx, sy, Math.floor(B.t * 14 + q) % 2 ? 1 : 2, '#FFFFFF'); } }      /* 흩날리는 설탕 조각 */
    }
    else if (f.k === 'pillar') {      /* 제네시스: 하늘에서 내리는 거대한 빛기둥 */
      const env = Math.pow(Math.sin(Math.PI * Math.min(1, e * 1.05)), 0.45), w = Math.round(pxw(f.w) * env), bx = fx, by = fy + 6;
      ctx.globalAlpha = 0.28 * env; R('#FFD86B', bx - Math.round(w * 2.2), 0, Math.round(w * 4.4), by + 20); ctx.globalAlpha = 0.5 * env; R('#FFF3C0', bx - Math.round(w * 1.5), 0, Math.round(w * 3), by + 8); ctx.globalAlpha = 1;
      R('#FFE27A', bx - w, 0, w * 2, by + 4); R('#FFFFFF', bx - Math.round(w * 0.62), 0, Math.round(w * 1.24), by + 4);
      for (let i = 0; i < 14; i++) { const sx = bx - w + ((i * 23) % Math.max(1, w * 2)), sy = ((i * 53 + B.t * 700) % (by + 40)) - 30; R('#FFFFFF', sx, sy, 1 + i % 2, 22 + (i % 3) * 14); }
      putDisc(bx, by, Math.round(w * 3.2), Math.round(w * 1.1), '#FFFFFF', 9); putDisc(bx, by, Math.round(w * 2), Math.round(w * 0.7), '#FFFFFF', 13);
      const ln = Math.round(110 * env); R('#FFFFFF', bx - ln, by - 1, ln * 2, 3); R('#FFE27A', bx - ln, by - 2, ln * 2, 1); R('#FFE27A', bx - ln, by + 2, ln * 2, 1);
      for (let i = 0; i < 16; i++) { const ang = i * 0.3927 + e * 0.6, len = Math.round(150 * env * (0.7 + (i % 3) * 0.2)); pline(bx, by, Math.round(bx + Math.cos(ang) * len), Math.round(by + Math.sin(ang) * len * 0.62), i % 2 ? '#FFF3C0' : '#FFFFFF', 1); }
      for (let i = 0; i < 28; i++) { const sx = bx + (((i * 37) % 120) - 60) * (0.4 + env), sy = ((i * 29 + e * 260 + B.t * 60) % (lh + 20)) - 10; pstar(Math.round(sx), Math.round(sy), 1 + i % 2, i % 2 ? '#FFFFFF' : '#FFE27A'); }
    }
    else if (f.k === 'cane') {      /* 거대한 지팡이 사탕 */
      const sc = f.huge ? 2.2 : 1, fl = f.fall / f.max, h = Math.min(1, e / fl), top = fy - Math.round(pxw(520) * (1 - h * h)) - Math.round(34 * sc), a = k > 0.35 ? 1 : k / 0.35, len = Math.round(50 * sc), w = Math.round(4 * sc), seg = Math.max(3, Math.round(4 * sc));
      ctx.globalAlpha = a; for (let y = 0; y < len; y++) { const yy = top + y; R(Math.floor((y + 3) / seg) % 2 ? '#FFFFFF' : '#E8323C', fx - w, yy, w * 2 + 1, 1); } R(INK, fx - w - 1, top, 1, len); R(INK, fx + w + 1, top, 1, len); R(INK, fx - w - 1, top + len, w * 2 + 3, 1);
      for (let i = -3; i <= 10; i++) { const ang = Math.PI + i * 0.3, hx = Math.round(fx + w + Math.cos(ang) * (w + 3 * sc) + 2 * sc), hy = Math.round(top + Math.sin(ang) * (w + 3 * sc)); R(INK, hx - w - 1, hy - 1, w * 2 + 3, w * 2 + 3); } 
      for (let i = -3; i <= 10; i++) { const ang = Math.PI + i * 0.3, hx = Math.round(fx + w + Math.cos(ang) * (w + 3 * sc) + 2 * sc), hy = Math.round(top + Math.sin(ang) * (w + 3 * sc)); R(i % 2 ? '#FFFFFF' : '#E8323C', hx - w, hy, w * 2 + 1, w * 2 + 1); }
      R('#FFFFFF', fx - w + 1, top + 2, 1, len - 4);      /* 사탕 표면의 반짝 줄 */
      if (f.huge) { const ry = top + 4, rx = fx; pdisc(rx - 6, ry, 5, INK); pdisc(rx + 6, ry, 5, INK); pdisc(rx - 6, ry, 4, '#3FAF5A'); pdisc(rx + 6, ry, 4, '#3FAF5A'); R(INK, rx - 3, ry - 3, 7, 7); R('#2E8A44', rx - 2, ry - 2, 5, 5); pline(rx - 1, ry + 3, rx - 6, ry + 12, INK, 3); pline(rx + 1, ry + 3, rx + 6, ry + 12, INK, 3); pline(rx - 1, ry + 3, rx - 6, ry + 12, '#3FAF5A', 1); pline(rx + 1, ry + 3, rx + 6, ry + 12, '#3FAF5A', 1); R('#B6F08A', rx - 8, ry - 2, 2, 1); }      /* 초록 리본 */
      if (h >= 1) { const q = (e - fl) / (1 - fl); pcircle(fx, fy, Math.round(14 * sc * q * 2) + 4, '#FFFFFF', 2);
        for (let i = 0; i < (f.huge ? 8 : 3); i++) { const a = -Math.PI / 2 + (i - (f.huge ? 3.5 : 1)) * 0.5, sp = (f.huge ? 46 : 22) * q, hy2 = Math.sin(Math.PI * Math.min(1, q * 1.2)) * (f.huge ? 30 : 14); mint(fx + Math.cos(a) * sp * 1.4, fy - hy2 + (1 - Math.abs(Math.sin(a))) * 4, f.huge ? 4 : 2); } }      /* 튀어 오르는 박하사탕 */
      ctx.globalAlpha = 1;
    }
    else if (f.k === 'ring') { const r = Math.round((f.r + (f.to - f.r) * (1 - k * k)) / WP); if (r > 0) { pcircle(fx, fy, r, f.col, 3); pcircle(fx, fy, Math.max(1, r - 3), f.col, 2); if (k > 0.5) pcircle(fx, fy, Math.max(1, r - 6), '#FFFFFF', 1); } }
    else if (f.k === 'rise') {      /* 몸에서 하늘로 솟구치는 빛 */
      const env = Math.sin(Math.PI * Math.min(1, e)), w = Math.max(2, Math.round(pxw(40) * (0.4 + 0.6 * env))), top = Math.round(fy * (1 - Math.min(1, e * 1.5))), hh = fy - top + 4;
      ctx.globalAlpha = 0.3 * env; R('#FFD86B', fx - w * 2, top, w * 4, hh + 2); ctx.globalAlpha = 1; R('#FFE27A', fx - w, top, w * 2, hh); R('#FFFFFF', fx - Math.ceil(w / 2), top, w, hh);
      for (let i = 0; i < 20; i++) { const sx = fx - w * 2 + ((i * 31) % (w * 4 + 1)), sy = fy - ((i * 47 + e * 520) % Math.max(12, hh)); R(i % 2 ? '#FFFFFF' : '#FFE27A', sx, sy, 1 + i % 2, 6 + (i % 3) * 6); }
      putDisc(fx, fy + 4, 36 + Math.round(e * 22), 14, '#FFF3C0', 10); pstar(fx, top, 3, '#FFFFFF');
      for (let i = 0; i < 5; i++) { const q = (e * 1.4 + i * 0.2) % 1, yy = fy - q * (fy - 10), xx = fx + Math.sin(i * 2.1 + e * 6) * 14; const cc = i % 2 ? '#FFB8DC' : '#B8E4FF', X1 = Math.round(xx), Y1 = Math.round(yy); pdisc(X1, Y1, 3, INK); pdisc(X1, Y1, 2, cc); R('#FFFFFF', X1 - 1, Y1 - 1, 1, 1); }      /* 동글동글 솜사탕 조각이 함께 떠올라요 */
    }
    else if (f.k === 'beam') { { const cy0 = 16 + Math.round(Math.sin(B.t * 3 + f.x) * 2), pc = (Math.round(f.x) >> 3) % 2; cloudPuff(fx, cy0, 9 + Math.round(e * 3), pc ? ['#FFC9E4', '#FF9ACD', '#FFFFFF'] : ['#C9ECFF', '#8FD3FF', '#FFFFFF']); }      /* 솜사탕 구름에서 빛이 내려요 */
      const w = Math.max(2, Math.round(11 * Math.min(1, k * 1.6))), hd = Math.min(1, e / 0.3), y1 = Math.round((fy + 2) * hd), y0 = hd < 1 ? Math.max(0, y1 - 150) : 0; ctx.globalAlpha = 0.5; R('#FFD86B', fx - w, y0, w * 2, y1 - y0); ctx.globalAlpha = 1; R('#FFF3C0', fx - Math.ceil(w / 2), y0, w, y1 - y0); R('#FFFFFF', fx - 1, y0, 2, y1 - y0); putDisc(fx, fy + 1, 18 + Math.round(e * 14), 7 + Math.round(e * 5), '#FFF3C0', 10); }
    else if (f.k === 'pop') { const r0 = Math.round(f.r / WP * e * 1.2), r1 = r0 + Math.max(2, Math.round(7 * k)); for (let i = 0; i < 10; i++) { const b = i * 0.628, c = Math.cos(b), s2 = Math.sin(b); pline(Math.round(fx + c * r0), Math.round(fy + s2 * r0), Math.round(fx + c * r1), Math.round(fy + s2 * r1), i % 2 ? f.col : '#FFFFFF', k > 0.5 ? 3 : 1); } if (k > 0.6) pdisc(fx, fy, 4, '#FFFFFF'); }
  }
}
function legBanner(U, d) {      /* 스킬 이름 배너 (겹친 판에 선명하게) */
  const c = B.cin; if (!c) return; const env = Math.min(1, c.t / 0.18, (c.max - c.t) / 0.4), cx = cv2.width / 2, cy = Math.round(cv2.height * 0.2), sz = Math.round(18 * PXS * d * (0.85 + 0.15 * env));
  tx.save(); tx.globalAlpha = env; tx.textAlign = 'center'; tx.textBaseline = 'middle';
  const sw = cv2.width * 0.9 * Math.min(1, c.t / 0.3); tx.fillStyle = 'rgba(0,0,0,.55)'; tx.fillRect(cx - sw / 2, cy - sz * 0.95, sw, sz * 1.9);
  const g = tx.createLinearGradient(0, cy - sz / 2, 0, cy + sz / 2); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#FFE27A'); g.addColorStop(1, '#FF9A1F');
  tx.font = `${Math.round(8 * PXS * d)}px Galmuri11B, sans-serif`; tx.fillStyle = '#FFD23F'; tx.fillText('★ 전설 스킬 ★', cx, cy - sz * 0.72);
  tx.font = `${sz}px Galmuri11B, sans-serif`; tx.fillStyle = INK; for (const [a, b] of [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2], [-2, -2]]) tx.fillText(c.name, cx + a * U * 0.5, cy + sz * 0.1 + b * U * 0.5);
  tx.fillStyle = g; tx.fillText(c.name, cx, cy + sz * 0.1); tx.restore();
}
const wLv = id => { const w = run.wpn.find(x => x.id === id); return w ? w.lv : 0; };
const wDescFull = id => { const W = WEAPONS[id]; return `${W.desc} Lv5: ${W.s5} Lv10: ${W.s10}`; };
function wOpt(id, i, o = {}) {      // 무기 선택 줄
  const W = WEAPONS[id], lv = wLv(id), nx = lv + 1, sp = nx === 5 ? W.s5 : nx === 10 ? W.s10 : '';
  const title = lv ? `${W.name} Lv${lv} → Lv${nx}${nx === 5 || nx === 10 ? ' ★' : ''}` : `새 무기: ${W.name}`;
  const desc = lv ? (sp ? `특별 효과! ${sp} ${W.more}` : W.more) : wDescFull(id);
  return `<button class="opt${nx === 10 ? ' r2' : nx === 5 ? ' r1' : ''}" type="button" data-act="${o.act || 'pick'}" data-i="${i}"${o.off ? ' aria-disabled="true"' : ''}><span class="ic">${svg(ICON[id])}</span><span class="tx"><b>${title}</b><span>${desc}</span></span>${o.price != null ? `<em>${o.price}골드</em>` : ''}</button>`;
}
const HEART_EMPTY = `<path d="M50 86C20 64 10 48 10 34C10 20 21 12 32 12C41 12 47 17 50 23C53 17 59 12 68 12C79 12 90 20 90 34C90 48 80 64 50 86Z" fill="#4A2A4A"/>`;
const heartsHtml = (hp, max) => Array.from({ length: max }, (_, i) => `<i class="hrt${i < hp ? '' : ' off'}">${svg(i < hp ? ICON.heart : HEART_EMPTY)}</i>`).join('');
/* ═════ 장비: 옷, 신발, 장갑, 투구, 망토. 등급은 일반 < 희귀 < 유물 < 영웅 < 전설 ═════ */
const SLOTS = ['armor', 'shoes', 'gloves', 'helm', 'cape', 'weapon'], DROP_SLOTS = SLOTS.slice(0, 5), WEP_MAXG = 3;      /* 무기 칸: 레벨업 카드를 다 채운 뒤에만 얻어요. 지금은 희귀까지 */
const SLOT = {
  armor: { name: '옷', nouns: ['제빵 앞치마', '레이스 원피스', '설탕 갑옷'] },
  shoes: { name: '신발', nouns: ['버터 장화', '초코 운동화', '솜사탕 구두'] },
  gloves: { name: '장갑', nouns: ['오븐 장갑', '크림 장갑', '쿠키 건틀릿'] },
  helm: { name: '투구', nouns: ['쿠키 투구', '머랭 모자', '도넛 헬멧'] },
  cape: { name: '망토', nouns: ['망토'] },
  weapon: { name: '무기', nouns: ['밀대', '거품기', '케이크 칼'] }
};
const GRADES = [
  { name: '일반', pre: '평범한', ramp: ['#E8DCCB', '#B9A68C', '#7A6650'] },
  { name: '희귀', pre: '반짝이는', ramp: ['#BFE6FF', '#59B8FF', '#2C6FB0'] },
  { name: '유물', pre: '옛 왕국의', ramp: ['#E3CCFF', '#B07CFF', '#6A3FC0'] },
  { name: '영웅', pre: '영웅의', ramp: ['#FFC9A8', '#FF7A3D', '#B8401A'] },
  { name: '전설', pre: '전설의', ramp: ['#FFF3B0', '#FFD23F', '#C98A00'] }
];
/* 칸마다 하는 일이 달라요. 너무 세지 않게: 등급이 올라도 한 칸이 판을 뒤집지는 않아요
   옷: 방어 (맞은 뒤 무적, 주기적 방패, 하트)  신발: 이동 속도  장갑: 공격 속도  투구: 치명타  망토: 무기 하나를 키우는 특수 효과 */
const eqOf = () => (run && run.eq) || {};
const eqList = () => SLOTS.map(s => eqOf()[s]).filter(Boolean);
function rollGrade(n, boss) {
  const w = [Math.max(40, 66 - n * 0.5), 28 + n * 0.1, 4 + n * 0.08, 1 + n * 0.03, 0.2 + n * 0.012].map((v, i) => v * (boss && i >= 2 ? 1.6 : 1) * (i >= 2 ? 1 + 0.15 * M('luck') : 1));      /* 30스테이지에서도 유물 7%, 영웅 2%, 전설 0.6% 정도 */
  let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let g = 0; g < 5; g++) { r -= w[g]; if (r < 0) return g; } return 0;
}
const GV = (arr, g) => arr[Math.min(g, arr.length - 1)];
/* 망토: 무기마다 다른 특수 효과. 유물부터 붙고, 전설은 발사 수까지 늘어요 */
const CAPE_FX = {
  pin: ['area', '휘두르는 범위', [15, 22, 30]], cream: ['cd', '공격 속도', [12, 18, 25]], star: ['proj', '발사 수', [1, 1, 1]], macaron: ['proj', '마카롱 수', [1, 1, 1]], honey: ['area', '꿀 웅덩이 크기', [15, 22, 30]],
  lemon: ['cd', '공격 속도', [12, 18, 25]], skewer: ['proj', '꼬치 수', [1, 1, 1]], choco: ['area', '폭발 범위', [15, 22, 30]], cotton: ['proj', '번개 줄기', [1, 1, 1]], cane: ['cd', '공격 속도', [12, 18, 25]]
};
/* 옷: 일반 무적 시간 → 희귀 무적 시간이나 방패 → 유물 방패 → 영웅 하트+방패 → 전설 하트+빠른 방패+무적 시간 */
function armorFx(fx, g, lk = 1) {
  const r1 = v => Math.round(v * lk * 10) / 10;
  if (g === 0) fx.inv = r1(10); else if (g === 1) { if (Math.random() < 0.5) fx.inv = r1(16); else fx.guard = Math.round(30 / lk); }
  else if (g === 2) fx.guard = Math.round(24 / lk); else if (g === 3) { fx.heart = 1; fx.guard = Math.round(22 / lk); } else { fx.heart = 1; fx.guard = Math.round(16 / lk); fx.inv = r1(20); }
}
/* 고유 효과: 영웅 이상 장비에 칸마다 하나씩 붙어요. 전설은 1.5배 */
const SP = {
  thorn: { s: 'armor', name: '가시 설탕', d: k => `맞으면 주변 적에게 ${Math.round(160 * k)} 피해를 주고 밀쳐내요` },
  bulwark: { s: 'armor', name: '철벽', d: k => `방패가 공격을 막으면 주변 적이 ${(1.5 * k).toFixed(1)}초 동안 기절해요` },
  grit: { s: 'armor', name: '오기', d: k => `하트가 1칸 남으면 모든 피해 +${Math.round(20 * k)}%` },
  flame: { s: 'shoes', name: '불꽃 발자국', d: k => `걸어간 자리에 불길이 남아 적을 태워요 (피해 ${Math.round(10 * k)})` },
  gust: { s: 'shoes', name: '돌풍', d: k => `${(8 / k).toFixed(1)}초마다 주변 적을 멀리 밀쳐내요` },
  magnetic: { s: 'shoes', name: '자석 걸음', d: k => `보석 줍는 거리 +${Math.round(40 * k)}%` },
  echo: { s: 'gloves', name: '연타', d: k => `공격이 ${Math.round(12 * k)}% 확률로 한 번 더 들어가요 (절반 피해)` },
  boom: { s: 'gloves', name: '폭죽 주먹', d: k => `적을 잡으면 ${Math.round(8 * k)}% 확률로 폭발해요` },
  frenzy: { s: 'gloves', name: '광란', d: k => `하트가 1칸 남으면 공격 속도 +${Math.round(20 * k)}%` },
  mark: { s: 'helm', name: '약점 간파', d: k => `치명타를 맞은 적은 3초 동안 피해를 ${Math.round(15 * k)}% 더 받아요` },
  execute: { s: 'helm', name: '마무리', d: k => `체력이 ${Math.round(12 * k)}% 아래로 떨어진 일반 몬스터는 바로 쓰러져요` },
  lucky: { s: 'helm', name: '행운의 일격', d: k => `치명타로 잡은 적은 ${Math.round(20 * k)}% 확률로 보석을 하나 더 떨어뜨려요` },
  twin: { s: 'cape', name: '메아리', d: k => `망토의 무기가 ${Math.round(18 * k)}% 확률로 바로 한 번 더 공격해요` },
  giant: { s: 'cape', name: '거인 사냥꾼', d: k => `망토의 무기가 보스와 엘리트에게 ${Math.round(30 * k)}% 더 세요` },
  chill: { s: 'cape', name: '서리', d: k => `망토의 무기에 맞은 적이 ${(1.5 * k).toFixed(1)}초 동안 느려져요` },
  wrath: { s: 'weapon', name: '대장 사냥', d: k => `보스와 엘리트에게 주는 피해 +${Math.round(25 * k)}%` },
  swift: { s: 'weapon', name: '날랜 손', d: k => `공격 속도 +${Math.round(10 * k)}%` }
};
/* 전설 장비 강화: 전설 장비는 칸과 상관없이 기본 스킬 하나를 한 층 특별하게 만들어요. 생김새와 쓰는 법은 그대로, 조금 더 세고 조금 달라져요 */
const LW = {
  pin: { name: '연속 베기', d: '롤링핀 휘두르기가 바로 한 번 더 이어져요' },
  cream: { name: '얼음 크림', d: '휘핑크림 +1발, 맞은 적이 1초 동안 느려져요' },
  star: { name: '왕별사탕', d: '별사탕이 커지고 옆 적으로 1번 더 튕겨요' },
  macaron: { name: '폭죽 마카롱', d: '마카롱 +1개, 적에게 날아가 부딪힐 때 작게 터져요' },
  honey: { name: '꿀 홍수', d: '꿀 장판이 25% 넓어지고 피해가 50% 세져요' },
  lemon: { name: '진한 레몬즙', d: '레몬즙 +1발, 산성이 1.5배로 쌓여요' },
  skewer: { name: '왕꼬치', d: '꼬치 +1개, 꼬치가 굵어져서 더 잘 맞아요' },
  choco: { name: '대왕 초코볼', d: '초코 폭탄 +1개, 폭발 범위 +15%' },
  cotton: { name: '고압 번개', d: '번개가 1마리 더 이어지고 맞은 적이 잠깐 멈춰요' },
  cane: { name: '사탕 비', d: '지팡이 사탕 +1개, 내리치는 범위 +20%' }
};
/* 그 무기를 전설로 각성했을 때의 강화 효과 */
const LWL = { pin: '천지 가르기 베기가 한 번 더 이어져요 (겹치면 더)', cream: '휘핑 해일이 한 번 더 쓸고 가요 (같은 장비 겹치면 더)', star: '별똥별이 8개 더 늘어요 (겹치면 더)', macaron: '은하가 더 넓고 오래 펼쳐지고 마지막 폭발이 커져요', honey: '꿀 바다가 더 넓고 오래가며 피해가 늘어요', lemon: '회오리가 1개 더 늘어요 (겹치면 더)', skewer: '꼬치가 한 번 더 꿰뚫어요 (겹치면 더)', choco: '운석 폭발이 넓어지고 파편이 12개로 늘어요', cotton: '심판의 빛 낙뢰가 6개 더 늘어요 (겹치면 더)', cane: '지팡이 사탕이 한 겹 더 내리꽂혀요 (겹치면 더)' };
function rollLw(it) { if (it.g !== 4 || it.lw) return; const own = run && run.wpn && run.wpn.length && Math.random() < 0.7 ? pick(run.wpn).id : pick(Object.keys(LW)); it.lw = own; }
const lwOn = id => (B && B.st && B.st.lw && B.st.lw[id]) || 0;      /* 같은 무기 강화 장비를 여러 개 끼면 개수만큼 */
const spK = it => it && it.g === 3 && it.sp && SP[it.sp] ? 1 : 0;      /* 고유 효과는 영웅 등급만. 전설은 그 대신 스킬 강화가 붙어요 */
function rollSp(it) { if (it.g !== 3) return; const c = Object.keys(SP).filter(k => SP[k].s === it.s && !(k === 'twin' && ['macaron', 'honey'].includes(fxOf(it).w))); it.sp = pick(c); }
const capeSp = (k, id) => { const c = eqOf().cape; return c && c.sp === k && fxOf(c).w === id ? spK(c) : 0; };
let itemSeq = 0;
function rollItem(n, minG = 0, slot) {
  const s = slot || pick(DROP_SLOTS), g = s === 'weapon' ? Math.min(minG, WEP_MAXG) : Math.max(minG, rollGrade(n)), lk = 1 + 0.01 * (n - 1), r1 = v => Math.round(v * lk * 10) / 10, fx = {};
  if (s === 'armor') armorFx(fx, g, lk);
  if (s === 'shoes') { fx.spd = r1([3, 4.5, 6, 8, 10][g]); if (g >= 2) { const k = pick(['hitHaste', 'killHaste', 'lowHaste']), i = g - 2; fx[k] = { hitHaste: [25, 35, 45], killHaste: [20, 28, 36], lowHaste: [10, 14, 18] }[k][i]; } }
  if (s === 'gloves') { fx.atk = r1([3, 4.5, 6, 8, 10][g]); if (g >= 2) { const k = pick(['open', 'rush']), i = g - 2; fx[k] = { open: [15, 22, 30], rush: [8, 12, 16] }[k][i]; } }
  if (s === 'helm') { fx.crit = r1([1.5, 2.2, 3, 4, 5][g]); if (g >= 2) fx.critd = [15, 22, 30][g - 2]; }
  if (s === 'cape') { const own = run && run.wpn && run.wpn.length && Math.random() < 0.65 ? pick(run.wpn).id : pick(Object.keys(WEAPONS)); fx.w = own; fx.wd = [8, 12, 16, 22, 30][g]; fx.critd = [6, 10, 15, 22, 30][g]; if (g >= 2) { const [k, , v] = CAPE_FX[own]; fx[k] = v[g - 2]; } if (g === 4) fx.proj = (fx.proj || 0) + 1; }
  if (s === 'weapon') { fx.wdmg = r1([4, 6, 9, 13][g]); if (g >= 1) fx.critd = [0, 8, 12, 18][g]; if (g >= 2) fx.atk = [0, 0, 4, 6][g]; }      /* 무기: 모든 공격 피해, 희귀부터 치명타 피해, 유물부터 공격 속도. 영웅은 고유 효과도 */      /* 무기: 모든 공격 피해 */
  const v = rnd(SLOT[s].nouns.length), nm = s === 'cape' ? `${GRADES[g].pre} ${WEAPONS[fx.w].name} 망토` : `${GRADES[g].pre} ${SLOT[s].nouns[v]}`;
  const it = { id: Date.now().toString(36) + (itemSeq++), s, g, n, nm, fx, v }; rollSp(it); rollLw(it); return it;
}
const varOf = it => it.v != null ? it.v : Math.max(0, SLOT[it.s].nouns.findIndex(n => it.nm.endsWith(n)));
const eqIcon = (it, s) => !it ? `eq_${s === 'cape' ? 'cape_pin' : s + '0'}_0` : it.s === 'cape' ? `eq_cape_${fxOf(it).w}_${it.g}` : `eq_${it.s}${varOf(it)}_${it.g}`;
const WEP_IC = ['pin', 'cream', 'skewer'];
const eqImg = (it, s) => (it ? it.s : s) === 'weapon' ? `<span class="pxi wico">${svg(ICON[WEP_IC[it ? varOf(it) : 0] || 'pin'])}</span>` : `<img class="pxi" src="${it ? DOLL.icon(it.s, it.s === 'cape' ? 0 : varOf(it), it.g, fxOf(it).w) : DOLL.icon(s, 0, 0, 'pin')}" alt="">`;
const fxOf = it => (it && it.fx) || {};
const eqSum = k => eqList().reduce((n, it) => n + (typeof fxOf(it)[k] === 'number' ? fxOf(it)[k] : 0), 0);
const eqMax = k => eqList().reduce((n, it) => Math.max(n, fxOf(it)[k] || 0), 0);
const guardSec = () => { const v = eqList().map(it => fxOf(it).guard).filter(Boolean); return v.length ? Math.min(...v) : 0; };
const capeFor = id => { const c = eqOf().cape; return c && fxOf(c).w === id ? fxOf(c) : null; };
const capeD = id => { const c = capeFor(id); return c ? c.wd / 100 : 0; };
const capeP = id => { const c = capeFor(id); return c ? c.proj || 0 : 0; };
const capeA = id => { const c = capeFor(id); return c ? (c.area || 0) / 100 : 0; };
const capeC = id => { const c = capeFor(id); return c ? (c.cd || 0) / 100 : 0; };
const has = () => false;
const heartsMax = () => 1 + ((run && run.bonus && run.bonus.heart) || 0) + eqSum('heart') + Math.min(1, M('shardplus'));
function fxLines(it) {
  const f = fxOf(it), o = [];
  if (f.heart) o.push(`하트 +${f.heart}칸`); if (f.inv) o.push(`맞은 뒤 무적 시간 +${f.inv}%`); if (f.guard) o.push(`${f.guard}초마다 공격 한 번을 막는 방패`);
  if (f.spd) o.push(`이동 속도 +${f.spd}%`); if (f.hitHaste) o.push(`맞으면 3초 동안 이동 속도 +${f.hitHaste}%`); if (f.killHaste) o.push(`적 30마리마다 3초 동안 이동 속도 +${f.killHaste}%`); if (f.lowHaste) o.push(`하트가 1칸 남으면 이동 속도 +${f.lowHaste}%`);
  if (f.atk) o.push(`공격 속도 +${f.atk}%`); if (f.open) o.push(`전투 처음 30초 동안 공격 속도 +${f.open}%`); if (f.rush) o.push(`적을 잡을 때마다 3초 동안 공격 속도 +1% (최대 +${f.rush}%)`);
  if (f.wdmg) o.push(`모든 공격 피해 +${f.wdmg}%`);
  if (f.crit) o.push(`치명타 확률 +${f.crit}%`); if (f.critd) o.push(`치명타 피해 +${f.critd}%`);
  if (f.w) { const n = WEAPONS[f.w].name, [, lab] = CAPE_FX[f.w]; o.push(`${n} 피해 +${f.wd}%`); if (f.area) o.push(`${n} ${lab} +${f.area}%`); if (f.cd) o.push(`${n} ${lab} +${f.cd}%`); if (f.proj) o.push(`${n} ${f.proj > 1 || CAPE_FX[f.w][0] !== 'proj' ? '발사 수' : lab} +${f.proj}`); if (!wLv(f.w)) o.push(`(${n}이 없으면 효과가 없어요)`); }
  if (spK(it)) o.push(`<b>[${SP[it.sp].name}]</b> ${SP[it.sp].d(spK(it))}`);
  if (it.lw && LW[it.lw]) o.push(`<b class="lwt">[전설 강화: ${WEAPONS[it.lw].name} · ${LW[it.lw].name}]</b> ${isLeg(it.lw) ? LWL[it.lw] : LW[it.lw].d}${run && wLv(it.lw) ? '' : ' (이 무기가 있어야 해요)'}`);
  return o;
}
const statLine = it => fxLines(it).join(' · ');
const itemScore = it => itemScore0(it) + (it && it.lw ? (wLv(it.lw) ? 3 : 0.5) : 0);
const itemScore0 = it => { if (!it) return -1; const f = fxOf(it); if (it.s === 'cape') return (wLv(f.w) ? 1 + it.g * 1.2 : 0.05 * it.g) + (f.critd || 0) / 15 + (it.sp ? 2 : 0);
  return (f.heart || 0) * 4 + (f.inv || 0) / 10 + (f.guard ? 40 / f.guard : 0) + (f.spd || 0) / 3 + ((f.hitHaste || 0) + (f.killHaste || 0)) / 25 + (f.lowHaste || 0) / 10 + (f.atk || 0) / 3 + ((f.open || 0) + (f.rush || 0) * 1.5) / 15 + (f.crit || 0) / 1.5 + (f.critd || 0) / 15 + (f.wdmg || 0) / 2 + (it.sp ? 2.5 : 0); };
const betterThanWorn = it => itemScore(it) > itemScore(eqOf()[it.s]) + 0.01;
function equip(it) { const e = run.eq || (run.eq = {}), inv = run.inv || (run.inv = []), k = inv.indexOf(it); if (k >= 0) inv.splice(k, 1); if (e[it.s]) inv.push(e[it.s]); e[it.s] = it; heroDirty(); }
function unequip(s) { const e = run.eq || {}; if (!e[s]) return; (run.inv || (run.inv = [])).push(e[s]); e[s] = null; heroDirty(); }
/* 좋은 걸로 끼기는 희귀 등급까지만: 유물 이상은 직접 골라서 껴요. 이미 낀 유물 이상 장비도 자동으로 바꾸지 않아요 */
const AUTO_EQ_MAXG = 1;
function autoEquip() { const inv = run.inv || []; let n = 0; for (const s of SLOTS) { const worn = eqOf()[s]; if (worn && worn.g > AUTO_EQ_MAXG) continue; const best = inv.filter(it => it.s === s && it.g <= AUTO_EQ_MAXG).sort((a, b) => itemScore(b) - itemScore(a))[0]; if (best && betterThanWorn(best)) { equip(best); n++; } } return n; }
function addItems(list) { const inv = run.inv || (run.inv = []); inv.push(...list); if (inv.length > 600) { inv.sort((a, b) => b.g - a.g || itemScore(b) - itemScore(a)); inv.length = 600; } }
/* 정리: 지금 낀 것보다 약한 일반·희귀·유물 장비를 치워요 (망토는 무기마다 달라서 남겨요) */
function tidyItems() { const inv = run.inv || [], before = inv.length; run.inv = inv.filter(it => it.g >= 3 || it.s === 'cape' || betterThanWorn(it)); return before - run.inv.length; }

/* ───── 적 ───── */
const FOES = {
  queen: { img: 'queen', big: true, hp: 2600, spd: 44, dmg: 20, r: 52, h: 150, xp: 0, name: '마카롱 여왕' },      // 100스테이지 뒤 새 보스
  jumper: { img: 'jumper', hp: 34, spd: 58, dmg: 1, r: 14, h: 30, xp: 3, ai: 'jump' },      // 점프 마카롱: 웅크렸다가 내 자리로 폴짝 뛰어와 쿵 떨어져요 (공중에선 안 맞고 안 밀려요)
  pudding: { img: 'pudding', hp: 90, spd: 36, dmg: 1, r: 17, h: 34, xp: 4, noKb: true },      // 묵직한 푸딩: 무거워서 밀쳐내도 거의 안 밀리고 꾸준히 걸어와요
  puff: { img: 'puff', hp: 40, spd: 54, dmg: 1, r: 15, h: 30, xp: 3, ai: 'puff' },      // 슈크림 퍼프: 터지면 크림 방울이 사방으로 튀어요
  bee: { img: 'bee', hp: 16, spd: 125, dmg: 1, r: 11, h: 26, xp: 2, ai: 'orbit' },      // 꿀벌 마카롱: 내 주위를 돌다가 쏜살같이 찔러 와요
  jelly: { img: 'jelly', hp: 14, spd: 68, dmg: 7, r: 15, h: 48, xp: 1 },
  ice: { img: 'ice', hp: 9, spd: 118, dmg: 5, r: 12, h: 56, xp: 1 },
  cookie: { img: 'cookie', hp: 36, spd: 50, dmg: 11, r: 17, h: 56, xp: 2 },
  donut: { img: 'donut', big: true, hp: 520, spd: 78, dmg: 16, r: 28, h: 88, xp: 12, name: '딱딱 도넛 기사' },
  pop: { img: 'pop', hp: 10, spd: 104, dmg: 1, r: 11, h: 30, xp: 1, ai: 'bomb' },          // 팝콘 폭탄: 달려와서 터져요
  gum: { img: 'gum', hp: 18, spd: 62, dmg: 1, r: 13, h: 30, xp: 2, ai: 'shoot' },          // 풍선껌: 멀리서 풍선을 쏴요
  ginger: { img: 'ginger', hp: 38, spd: 36, dmg: 1, r: 15, h: 32, xp: 3, noKb: true },   // 진저 병정: 맞아도 밀려나지 않고 꾸준히 걸어와요
  zip: { img: 'zip', hp: 9, spd: 250, dmg: 1, r: 10, h: 18, xp: 2, ai: 'zip' },      // 번개 젤리빈: 아주 빨라요. 대신 방향을 늦게 틀어서 옆으로 비키면 지나쳐 가요
  churro: { img: 'churro', hp: 34, spd: 58, dmg: 1, r: 14, h: 22, xp: 3, ai: 'dash' },     // 츄러스: 멈췄다가 돌진해요
  boss: { img: 'boss', big: true, hp: 1500, spd: 34, dmg: 20, r: 56, h: 152, xp: 0, name: '곰팡이 케이크' },
  golem: { img: 'golem', big: true, hp: 760, spd: 52, dmg: 16, r: 26, h: 92, xp: 14, name: '얼음사탕 골렘' },
  knight: { img: 'knight', big: true, hp: 900, spd: 66, dmg: 16, r: 24, h: 92, xp: 16, name: '불꽃 창기사' },
  boss2: { img: 'boss2', big: true, hp: 1850, spd: 40, dmg: 20, r: 56, h: 152, xp: 0, name: '초코 분수 대왕' },
  boss3: { img: 'boss3', big: true, hp: 2500, spd: 46, dmg: 20, r: 56, h: 152, xp: 0, name: '탄 설탕 마왕' }
};

/* ═════ 전투 ═════ */
let B = null;                    // 지금 전투
const cv = $('#cv'), ctx = cv.getContext('2d'), cv2 = $('#cv2'), tx = cv2.getContext('2d');
let vw = 390, vh = 780, PXS = 2, PZ = 2, ZOOM = 1, lw = 195, lh = 390;      // PXS: 픽셀 한 칸의 화면 크기, PZ: 줌을 적용한 크기, lw·lh: 낮은 해상도 화면 크기
function resize() {
  const w = window.innerWidth, h = window.innerHeight, d = Math.min(2, window.devicePixelRatio || 1);
  PXS = Math.max(2, Math.round(w / 195)); PZ = PXS * ZOOM; lw = Math.ceil(w / PZ); lh = Math.ceil(h / PZ);
  if (cv.width !== lw * Q || cv.height !== lh * Q) { cv.width = lw * Q; cv.height = lh * Q; } cv.style.width = lw * PZ + 'px'; cv.style.height = lh * PZ + 'px'; ctx.imageSmoothingEnabled = false;
  vw = lw * 2; vh = lh * 2; cv2.width = Math.round(w * d); cv2.height = Math.round(h * d);
}
addEventListener('resize', resize);

function battleStats() {
  const b = run.bonus || { spd: 0, dmg: 0, crit: 0 }, sp = Object.fromEntries(eqList().filter(it => spK(it)).map(it => [it.sp, spK(it)]));
  return {
    dmg: (1 + 0.1 * b.dmg) * (1 + eqSum('wdmg') / 100) * (1 + 0.04 * M('atk')) * (1 + 0.06 * M('veteran')) * (1 + 0.08 * M('master')),
    crit: 0.05 + 0.05 * b.crit + 0.03 * M('crit') + eqSum('crit') / 100, critMul: 1.8 + 0.2 * M('critd') + eqSum('critd') / 100,
    spd: (1 + 0.05 * b.spd) * (1 + 0.03 * M('spd')) * (1 + eqSum('spd') / 100),
    lw: eqList().filter(it => it.g === 4 && it.lw).reduce((o, it) => (o[it.lw] = (o[it.lw] || 0) + 1, o), {}),
    xp: 1 + 0.06 * M('xp'), pickup: 88 * (1 + 0.15 * M('mag')) * (1 + 0.4 * (sp.magnetic || 0)), sp, invK: (1 + 0.1 * M('guard')) * (1 + eqSum('inv') / 100), area: 1 + 0.06 * M('size'),
    atk: 1 + eqSum('atk') / 100 + 0.1 * (sp.swift || 0) + 0.03 * M('aspd') + 0.04 * M('haste2'), guard: guardSec(), open: eqSum('open') / 100, rush: eqMax('rush'), hitHaste: eqMax('hitHaste') / 100, killHaste: eqMax('killHaste') / 100, lowHaste: eqMax('lowHaste') / 100
  };
}
const needOf = lvl => Math.round(5 + 3 * (lvl - 1) + 0.07 * (lvl - 1) ** 2 + 0.012 * (lvl - 1) ** 3);      /* 스테이지가 끝없이 이어지니까 뒤로 갈수록 레벨이 천천히 올라요 */
function startBattle(kind, floor, onEnd, stg) {
  const st = battleStats(), dur = kind === 'boss' ? 300 : stg ? 120 : 180;      /* 스테이지 한 판은 2분 */
  B = {
    kind, floor, act: actOf(), onEnd, t: 0, dur, st, paused: false, over: false,
    p: { x: 0, y: 0, hp: run.hp, max: run.maxHp, inv: 0, face: 1, dirX: 0, dirY: -1, moving: false, bob: 0, shield: M('shield') > 0 || guardSec() > 0 },
    legQ: [], lfx: [], cin: null, foes: [], shots: [], foeShots: [], gems: [], magnets: [], bombs: [], zones: [], fx: [], texts: [], telegraphs: [], lobs: [],
    weapons: run.wpn.map(x => ({ id: x.id, lv: x.lv + capeP(x.id), src: x, cd: 0.3 + Math.random() * 0.6, ang: 0 })),
    lvl: run.lvl, xp: run.xp, need: needOf(run.lvl), kills: 0, spawnAcc: 0, shake: 0, hitstop: 0, hsCool: 0, slow: 0, flashScr: null, heartPop: 0,
    eliteAt: kind === 'elite' ? 90 : -1, bossAt: kind === 'boss' ? (stg ? 45 : 180) : -1, g: (stg && stg.g) || [], bigType: stg && stg.boss, stageN: stg ? floorNo() : 0, big: null, bigDead: false, joy: null, hudT: -1, hudHp: -1, hudXp: -1
  };
  B.pet = petStart();
  gimInit();
  if (!headless) {
    ZOOM = 1; show('battle'); resize();
    $('#bossBar').hidden = true; $('#potHud').innerHTML = run.potion ? svg(ICON.cocoa) : '';
    if (stg) { toast(stg.tower ? stg.n : `${B.stageN}. ${stg.n}`); const hint = stg.boss ? `45초 뒤에 ${FOES[stg.boss].name}이(가) 나타나요` : B.g.length ? B.g.map(k => GIM[k].hint).join(' · ') : '2분만 버텨요!'; const b0 = B; setTimeout(() => { if (B === b0 && !B.over) toast(hint); }, 2400); } else toast(kind === 'boss' ? '3분 뒤에 보스가 나타나요' : kind === 'elite' ? '1분 30초 뒤에 엘리트가 나타나요' : '3분만 버텨요!');
    if (window.__dbg.autoAll) B.auto = true;
    last = performance.now(); requestAnimationFrame(frame);
  }
}
/* ═════ 스테이지: 끝없이 이어지고, 5번째마다 보스. 스테이지마다 기믹이 달라요 ═════ */
const GIM = {
  cross: { name: '촛불 십자', hint: '내 자리에 십자 불길이 와요', desc: '몇 초마다 내가 선 자리에 가로세로 십자 불길이 그어져요. 예고선을 보고 비켜요.' },
  sugar: { name: '설탕 폭주', hint: '가끔 적이 확 빨라져요', desc: '가끔 설탕에 취한 적들이 몇 초 동안 아주 빨라져요. 화면이 분홍빛이 되면 조심해요.' },
  sprinkle: { name: '스프링클 소나기', hint: '작은 사탕이 비처럼 떨어져요', desc: '작은 스프링클 사탕이 쉴 새 없이 떨어져요. 작은 빨간 원을 피해요.' },
  gemrain: { name: '보석 비', hint: '보석이 쏟아져요', desc: '여기저기서 보석이 솟아나요. 주우러 다니면 빨리 커요.' },
  charge: { name: '돌진 떼', hint: '츄러스 떼가 돌진해 와요', desc: '츄러스가 줄지어 돌진해 와요. 빨간 줄이 보이면 옆으로 피해요.' },
  fog: { name: '안개', hint: '안개 때문에 가까이만 보여요', desc: '안개가 껴서 내 주변만 보여요.' },
  ice: { name: '빙판', hint: '바닥이 미끄러워요', desc: '바닥이 미끄러워서 바로 멈추거나 꺾을 수 없어요.' },
  bombs: { name: '팝콘 밭', hint: '팝콘 폭탄이 몰려와요', desc: '팝콘 폭탄이 계속 달려와요. 빨간 원 밖으로 피해요.' },
  meteor: { name: '사탕 우박', hint: '빨간 원을 피해요', desc: '빨간 원이 생긴 자리에 사탕이 떨어져요.' },
  giant: { name: '거인의 날', hint: '적이 적지만 크고 단단해요', desc: '적이 적게 나오지만 두 배로 크고 단단해요. 대신 보석을 많이 줘요.' },
  wind: { name: '바람', hint: '바람에 밀려요', desc: '센 바람이 나를 한쪽으로 밀어요. 방향이 가끔 바뀌어요.' },
  swarm: { name: '개미 떼', hint: '약한 적이 엄청 많아요', desc: '약한 적이 떼로 몰려와요.' },
  mud: { name: '꿀 늪', hint: '꿀 늪에서는 느려져요', desc: '노란 꿀 늪을 밟으면 느려져요.' },
  ring: { name: '포위', hint: '적이 둥글게 에워싸요', desc: '가끔 적이 사방에서 둥글게 에워싸요. 한쪽을 뚫고 나가요.' },
  beams: { name: '번개 줄', hint: '빨간 줄을 피해요', desc: '빨간 줄이 그어진 곳에 번개가 쳐요.' },
  goldrush: { name: '황금 젤리', hint: '도망가는 황금 젤리를 잡아요', desc: '도망 다니는 황금 젤리가 나와요. 잡으면 노란 보석이 쏟아져요.' },
  pulse: { name: '얼음땡', hint: '적이 멈췄다 빨라졌다 해요', desc: '적이 잠깐 얼어붙었다가, 풀리면 훨씬 빨라져요.' },
  shrink: { name: '설탕 울타리', hint: '분홍 울타리 안에 있어요', desc: '분홍 울타리가 점점 좁아져요. 밖에 오래 있으면 다쳐요.' },
  trail: { name: '뜨거운 발자국', hint: '계속 움직여요', desc: '내가 서 있던 자리가 곧 뜨거워져요. 멈추지 말아요.' },
  ghost: { name: '유령', hint: '적이 보였다 안 보였다 해요', desc: '적이 가끔 거의 안 보이게 흐려져요.' },
  elites: { name: '꼬마 대장', hint: '꼬마 대장이 계속 나와요', desc: '꼬마 대장들이 줄지어 나와요.' },
  fast: { name: '광란', hint: '적이 아주 빨라요', desc: '적이 평소보다 훨씬 빨리 달려와요.' },
  vortex: { name: '소용돌이', hint: '소용돌이가 끌어당겨요', desc: '시럽 소용돌이가 나를 끌어당겨요.' },
  split: { name: '분열', hint: '잡은 적이 둘로 쪼개져요', desc: '적을 잡으면 작은 적 둘로 쪼개져요.' },
  balls: { name: '사탕공', hint: '튕기는 사탕공을 피해요', desc: '커다란 사탕공이 화면 안을 튕겨 다녀요. 닿으면 다쳐요.' },
  mines: { name: '초코 지뢰', hint: '바닥의 지뢰를 밟지 말아요', desc: '바닥에 초코 지뢰가 깔려 있어요. 가까이 가면 잠깐 뒤에 터져요.' },
  bounty: { name: '현상금', hint: '빛나는 현상범을 잡으면 폭탄이 나와요', desc: '단단한 현상범이 나타나요. 잡으면 폭탄을 떨어뜨려요.' },
  blackout: { name: '정전', hint: '가끔 불이 꺼져요', desc: '가끔 불이 꺼져서 내 주변만 보여요.' },
  stalker: { name: '그림자', hint: '쓰러지지 않는 그림자가 쫓아와요', desc: '절대 쓰러지지 않는 그림자가 끝까지 쫓아와요. 점점 빨라지니 계속 달아나요.' },
  portal: { name: '차원문', hint: '가까운 차원문에서 적이 나와요', desc: '보라색 차원문에서 적이 튀어나와요. 문 가까이는 위험해요.' },
  turret: { name: '사탕 포탑', hint: '포탑이 쏘는 빨간 탄을 피해요', desc: '사탕 포탑이 나를 겨냥해 빨간 탄을 쏴요. 포탑은 부술 수 없어요.' },
  regen: { name: '끈질긴 반죽', hint: '안 맞은 적은 다시 회복해요', desc: '잠깐 안 맞은 적은 체력을 다시 채워요. 한 번에 몰아서 잡아요.' },
  spiral: { name: '시럽 나선', hint: '빙글 도는 원을 피해요', desc: '내 자리에서 시럽 방울이 나선을 그리며 바깥으로 번져요. 원이 차례로 터지니 나선 밖으로 빠져나가요.' },
  roll: { name: '롤케이크', hint: '굴러오는 롤케이크를 피해요', desc: '굵은 줄 위로 거대한 롤케이크가 굴러가요. 나는 피하고, 줄 위의 적은 깔려서 크게 다쳐요.' },
  coat: { name: '설탕 코팅', hint: '반짝이는 적은 단단해요', desc: '적이 설탕 껍질을 두르고 나와요. 껍질이 깨질 때까지는 피해가 덜 들어가요.' },
  grid: { name: '와플 격자', hint: '격자 줄 사이 칸으로 피해요', desc: '내 주변에 와플 같은 가로세로 줄이 그어지고 곧 뜨거워져요. 줄과 줄 사이 빈칸으로 들어가요.' },
  donut: { name: '도넛 포위망', hint: '조여 오는 고리 안쪽에 있어요', desc: '내 둘레에 도넛 모양으로 빨간 원들이 둘러싸요. 고리 위에 있으면 다쳐요. 안쪽에 머물거나 빈틈으로 빠져나가요.' }
};
const STAGES = [
  { n: '과자 골목', g: [] }, { n: '보석 비 광장', g: ['gemrain'] }, { n: '츄러스 돌진로', g: ['charge'] }, { n: '안개 낀 뒷골목', g: ['fog'] }, { n: '도넛 기사의 문', boss: 'donut' },
  { n: '버터 빙판', g: ['ice'] }, { n: '팝콘 밭', g: ['bombs'] }, { n: '사탕 우박 언덕', g: ['meteor'] }, { n: '거인의 날', g: ['giant'] }, { n: '곰팡이 케이크의 방', boss: 'boss' },
  { n: '눈보라 길', g: ['wind'] }, { n: '개미 떼 창고', g: ['swarm'] }, { n: '꿀 늪', g: ['mud'] }, { n: '포위된 광장', g: ['ring'] }, { n: '얼음사탕 골렘의 동굴', boss: 'golem' },
  { n: '번개 얼음길', g: ['beams'] }, { n: '황금 젤리 사냥터', g: ['goldrush'] }, { n: '얼음땡 호수', g: ['pulse'] }, { n: '좁아지는 설탕 울타리', g: ['shrink'] }, { n: '초코 분수 대왕의 궁전', boss: 'boss2' },
  { n: '뜨거운 발자국', g: ['trail'] }, { n: '유령 주방', g: ['ghost'] }, { n: '꼬마 대장 행진', g: ['elites'] }, { n: '광란의 오븐', g: ['fast'] }, { n: '불꽃 창기사의 다리', boss: 'knight' },
  { n: '얼음 우박', g: ['ice', 'meteor'] }, { n: '소용돌이 시럽', g: ['vortex'] }, { n: '끈질긴 반죽', g: ['regen'] }, { n: '마왕성 앞마당', g: ['meteor', 'ring'] }, { n: '탄 설탕 마왕의 방', boss: 'boss3' }
,
  { n: '다시 찾은 과자 골목', g: ['swarm', 'gemrain'] }, { n: '돌진하는 안개', g: ['charge', 'fog'] }, { n: '쪼개지는 젤리 언덕', g: ['split'] }, { n: '팝콘 번개 들판', g: ['bombs', 'beams'] }, { n: '골렘 왕의 우박 동굴', boss: 'golem', g: ['meteor'] },
  { n: '안개 속 거인들', g: ['giant', 'fog'] }, { n: '유령 안개 숲', g: ['ghost', 'fog'] }, { n: '튕기는 사탕공 마당', g: ['balls'] }, { n: '황금 광란', g: ['goldrush', 'fast'] }, { n: '초코 분수 대왕의 복수', boss: 'boss2', g: ['ring'] },
  { n: '발자국 빙판', g: ['trail', 'ice'] }, { n: '끈질긴 쪼개짐', g: ['regen', 'split'] }, { n: '얼음땡 번개', g: ['pulse', 'beams'] }, { n: '좁아지는 안개 울타리', g: ['shrink', 'fog'] }, { n: '창기사 군단', boss: 'knight', g: ['elites'] },
  { n: '소용돌이 우박', g: ['vortex', 'meteor'] }, { n: '거인 사탕공', g: ['balls', 'giant'] }, { n: '유령 꼬마 대장', g: ['ghost', 'elites'] }, { n: '마지막 관문', g: ['ring', 'beams', 'bombs'] }, { n: '탄 설탕 마왕의 진짜 모습', boss: 'boss3', g: ['trail'] },
  { n: '초코 지뢰밭', g: ['mines'] }, { n: '현상금 사냥', g: ['bounty'] }, { n: '정전된 주방', g: ['blackout', 'swarm'] }, { n: '쫓아오는 그림자', g: ['stalker'] }, { n: '도넛 기사단장', boss: 'donut', g: ['mines'] },
  { n: '지뢰밭 돌진로', g: ['mines', 'charge'] }, { n: '황금과 현상금', g: ['goldrush', 'bounty'] }, { n: '그림자 빙판', g: ['stalker', 'ice'] }, { n: '거인의 정전', g: ['giant', 'blackout'] }, { n: '되살아난 곰팡이 케이크', boss: 'boss', g: ['bombs'] },
  { n: '눈보라 지뢰밭', g: ['wind', 'mines'] }, { n: '쪼개지는 개미 떼', g: ['split', 'swarm'] }, { n: '그림자 숨바꼭질', g: ['stalker', 'fog'] }, { n: '번개 눈보라', g: ['beams', 'wind'] }, { n: '얼음땡 골렘 형제', boss: 'golem', g: ['pulse'] },
  { n: '현상금 광란', g: ['bounty', 'fast'] }, { n: '뜨거운 지뢰밭', g: ['trail', 'mines'] }, { n: '정전 속 유령', g: ['blackout', 'ghost'] }, { n: '세 겹의 시련', g: ['stalker', 'meteor', 'ring'] }, { n: '초코 분수 대왕 최종전', boss: 'boss2', g: ['wind'] },
  { n: '차원문 광장', g: ['portal'] }, { n: '사탕 포탑 요새', g: ['turret'] }, { n: '차원문과 지뢰', g: ['portal', 'mines'] }, { n: '포탑 빙판', g: ['turret', 'ice'] }, { n: '불꽃 창기사 대장', boss: 'knight', g: ['turret'] },
  { n: '현상금 차원문', g: ['bounty', 'portal'] }, { n: '그림자 포탑', g: ['stalker', 'turret'] }, { n: '정전 지뢰밭', g: ['blackout', 'mines'] }, { n: '거인 차원문', g: ['giant', 'portal'] }, { n: '탄 설탕 마왕의 분노', boss: 'boss3', g: ['portal'] },
  { n: '개미 떼 포탑', g: ['swarm', 'turret'] }, { n: '유령 차원문', g: ['ghost', 'portal'] }, { n: '분열 현상금', g: ['split', 'bounty'] }, { n: '소용돌이 지뢰밭', g: ['vortex', 'mines'] }, { n: '골렘 왕의 귀환', boss: 'golem', g: ['beams'] },
  { n: '광란의 차원문', g: ['fast', 'portal'] }, { n: '그림자 정전', g: ['stalker', 'blackout'] }, { n: '사방 포화', g: ['turret', 'meteor'] }, { n: '마지막 계단', g: ['portal', 'stalker', 'bounty'] }, { n: '거대 곰팡이 케이크', boss: 'boss', g: ['turret'] },
  { n: '번개 지뢰밭', g: ['beams', 'mines'] }, { n: '황금 소용돌이', g: ['goldrush', 'vortex'] }, { n: '얼음땡 포탑', g: ['pulse', 'turret'] }, { n: '쪼개지는 그림자', g: ['split', 'stalker'] }, { n: '창기사 대장의 돌격', boss: 'knight', g: ['charge'] },
  { n: '정전 속 개미 떼', g: ['blackout', 'swarm'] }, { n: '거인의 빙판', g: ['giant', 'ice'] }, { n: '유령 포화', g: ['ghost', 'meteor'] }, { n: '마지막 시험', g: ['fast', 'portal', 'mines'] }, { n: '백 번째 왕좌: 초코 분수 대왕', boss: 'boss2', g: ['turret'] },
  { n: '별빛 궁전 입구', g: ['sprinkle'] }, { n: '슈크림 정원', g: ['swarm'] }, { n: '촛불 복도', g: ['cross'] }, { n: '꿀벌 둥지', g: ['fast'] }, { n: '마카롱 여왕 등장', boss: 'queen', g: ['sprinkle'] },
  { n: '설탕에 취한 무도회', g: ['sugar'] }, { n: '십자 촛불과 지뢰', g: ['cross', 'mines'] }, { n: '스프링클 빙판', g: ['sprinkle', 'ice'] }, { n: '폭주하는 개미 떼', g: ['sugar', 'swarm'] }, { n: '초코 분수 대왕의 반격', boss: 'boss2', g: ['cross'] },
  { n: '촛불 정전', g: ['cross', 'blackout'] }, { n: '거인의 설탕 폭주', g: ['sugar', 'giant'] }, { n: '스프링클 차원문', g: ['sprinkle', 'portal'] }, { n: '그림자 무도회', g: ['stalker', 'sugar'] }, { n: '탄 설탕 마왕의 귀환', boss: 'boss3', g: ['sprinkle'] },
  { n: '별빛 포탑', g: ['turret', 'cross'] }, { n: '쪼개지는 슈크림', g: ['split', 'sprinkle'] }, { n: '촛불 소용돌이', g: ['vortex', 'cross'] }, { n: '여왕의 계단', g: ['sugar', 'sprinkle', 'bounty'] }, { n: '마카롱 여왕의 진짜 힘', boss: 'queen', g: ['cross'] },
  { n: '시럽 분수 광장', g: ['spiral'] }, { n: '롤케이크 언덕', g: ['roll'] }, { n: '반짝이는 슈크림', g: ['coat', 'swarm'] }, { n: '나선 촛불', g: ['spiral', 'gemrain'] }, { n: '탄 설탕 마왕의 굴', boss: 'boss3', g: ['roll'] },
  { n: '코팅된 거인', g: ['coat', 'giant'] }, { n: '굴러오는 무도회', g: ['roll', 'sugar'] }, { n: '시럽 보석 비', g: ['spiral', 'gemrain'] }, { n: '단단한 그림자', g: ['coat', 'stalker'] }, { n: '마카롱 여왕의 연회', boss: 'queen', g: ['spiral'] },
  { n: '롤케이크 포탑', g: ['roll', 'turret'] }, { n: '설탕 껍질 차원문', g: ['coat', 'portal'] }, { n: '나선 스프링클', g: ['spiral', 'sprinkle'] }, { n: '쪼개지는 롤케이크', g: ['roll', 'split'] }, { n: '초코 분수 대왕의 분노', boss: 'boss2', g: ['coat'] },
  { n: '시럽 나선 광장', g: ['spiral'] }, { n: '코팅 개미 떼', g: ['coat', 'swarm'] }, { n: '굴러가는 보석', g: ['roll', 'gemrain'] }, { n: '마지막 시럽 계단', g: ['roll', 'coat'] }, { n: '백사십 번째 왕좌: 여왕의 마지막 춤', boss: 'queen', g: ['roll'] },
  { n: '시럽 폭포 계단', g: ['spiral', 'ice'] }, { n: '굴러오는 거인', g: ['roll', 'giant'] }, { n: '코팅된 별빛', g: ['coat', 'sprinkle'] }, { n: '촛불 나선', g: ['spiral', 'cross'] }, { n: '초코 분수 대왕의 환영', boss: 'boss2', g: ['spiral'] },
  { n: '설탕 껍질 포탑', g: ['coat', 'turret'] }, { n: '롤케이크 차원문', g: ['roll', 'portal'] }, { n: '쪼개지는 나선', g: ['spiral', 'split'] }, { n: '단단한 설탕 폭주', g: ['coat', 'sugar'] }, { n: '탄 설탕 마왕의 분노', boss: 'boss3', g: ['roll'] },
  { n: '코팅 소용돌이', g: ['coat', 'vortex'] }, { n: '나선 지뢰밭', g: ['spiral', 'mines'] }, { n: '굴러가는 안개 숲', g: ['roll', 'fog'] }, { n: '설탕 껍질 개미 떼', g: ['coat', 'swarm'] }, { n: '마카롱 여왕의 환영', boss: 'queen', g: ['coat'] },
  { n: '시럽 정전', g: ['spiral', 'blackout'] }, { n: '롤케이크 번개 줄', g: ['roll', 'beams'] }, { n: '코팅 그림자', g: ['coat', 'stalker'] }, { n: '마지막 나선 계단', g: ['spiral', 'roll'] }, { n: '백육십 번째 왕좌: 별빛 대마왕', boss: 'boss3', g: ['coat', 'spiral'] },
  { n: '와플 광장', g: ['grid'] }, { n: '도넛 가게 앞', g: ['donut'] }, { n: '격자 위의 보석', g: ['grid', 'gemrain'] }, { n: '포위된 슈크림', g: ['donut', 'coat'] }, { n: '곰팡이 케이크의 귀환', boss: 'boss', g: ['grid'] },
  { n: '와플 황금 젤리', g: ['grid', 'goldrush'] }, { n: '도넛 차원문', g: ['donut', 'portal'] }, { n: '굴러오는 와플', g: ['grid', 'roll'] }, { n: '도넛과 나선', g: ['donut', 'spiral'] }, { n: '마카롱 여왕의 무도회', boss: 'queen', g: ['donut'] },
  { n: '와플 포탑', g: ['grid', 'turret'] }, { n: '설탕 폭주 도넛', g: ['donut', 'sugar'] }, { n: '격자 속 그림자', g: ['grid', 'stalker'] }, { n: '도넛 지뢰밭', g: ['donut', 'mines'] }, { n: '초코 분수 대왕의 마지막 분수', boss: 'boss2', g: ['grid'] },
  { n: '코팅 와플', g: ['grid', 'coat'] }, { n: '쪼개지는 도넛', g: ['donut', 'split'] }, { n: '와플 현상범', g: ['grid', 'bounty'] }, { n: '거인의 도넛', g: ['donut', 'giant'] }, { n: '탄 설탕 마왕의 최후', boss: 'boss3', g: ['donut'] },
  { n: '별빛 와플 길', g: ['grid', 'sprinkle'] }, { n: '도넛 소용돌이', g: ['donut', 'vortex'] }, { n: '와플 위 번개', g: ['grid', 'beams'] }, { n: '도넛 롤케이크', g: ['donut', 'roll'] }, { n: '여왕의 두 번째 무대', boss: 'queen', g: ['grid'] },
  { n: '격자 시럽 나선', g: ['grid', 'spiral'] }, { n: '도넛 안개', g: ['donut', 'fog'] }, { n: '와플 십자 촛불', g: ['grid', 'cross'] }, { n: '단단한 도넛 떼', g: ['donut', 'coat'] }, { n: '초코 분수 대왕의 마지막 춤', boss: 'boss2', g: ['donut'] },
  { n: '와플 광란', g: ['grid', 'fast'] }, { n: '도넛 그림자', g: ['donut', 'stalker'] }, { n: '마지막 와플', g: ['grid', 'roll'] }, { n: '마지막 도넛', g: ['donut', 'spiral'] }, { n: '탄 설탕 마왕, 다시 깨어나다', boss: 'boss3', g: ['grid'] },
  { n: '왕좌로 가는 와플 다리', g: ['grid', 'coat'] }, { n: '왕좌를 두른 도넛', g: ['donut', 'sugar'] }, { n: '마지막 시험의 격자', g: ['grid', 'spiral'] }, { n: '왕좌 앞의 고요', g: ['donut'] }, { n: '이백 번째 왕좌: 디저트 여왕의 진짜 왕관', boss: 'queen', g: ['donut'] }
];
const DIFF_K = 0.85, stageDiff = n => (n - 1) * DIFF_K;      /* 스테이지마다 오르는 폭은 처음부터 끝까지 같아요. 전설 스킬을 얻으면 시원하게 밀고 나가는 게 맞아요 */
const G = k => !!(B && B.g && B.g.includes(k));
function gimInit() {
  B.haz = []; B.gt = {}; B.rateK = 1; B.hpK = 1; B.fspK = 1; B.spdK = 1; B.pulseK = 1; B.ghostA = null; B.slip = G('ice'); B.shrinkR = 560;
  if (G('giant')) { B.rateK *= 0.45; B.hpK *= 2.3; } if (G('swarm')) { B.rateK *= 2.1; B.hpK *= 0.4; B.fspK *= 1.1; } if (G('fast')) { B.fspK *= 1.35; B.rateK *= 0.85; } if (G('ring')) B.rateK *= 0.7; if (G('bombs')) B.rateK *= 0.8;
  if (G('balls')) B.balls = Array.from({ length: B.floor > 40 ? 3 : 2 }, (_, i) => ({ rx: (i - 0.5) * 160, ry: -260 + i * 120, vx: (i % 2 ? -1 : 1) * 95, vy: 80 + i * 15, r: 16 }));
  if (G('mines')) B.mineOff = new Set();
  if (G('portal')) { B.ports = [{ x: 190, y: -150 }, { x: -200, y: 170 }]; B.rateK *= 0.6; }
  if (G('turret')) B.turs = [{ x: 210, y: 120, cd: 2 }, { x: -220, y: -140, cd: 3.5 }];
  if (G('vortex')) B.vort = [{ x: 180, y: -120 }, { x: -200, y: 160 }];
  B.gt.gold = 10; B.gt.ring = 6; B.gt.bounty = 12;
}
/* 위험 예고: 원(c) 또는 긴 줄(l). 시간이 다 되면 그 안에 있을 때 다쳐요 */
function hazard(o) { B.haz.push(o); if (o.k === 'c') B.telegraphs.push({ k: 'circle', x: o.x, y: o.y, r: o.r, life: o.t, max: o.t }); else B.telegraphs.push({ k: 'line', f: { x: o.x, y: o.y, r: o.w }, a: o.a, len: o.len, w: o.w, life: o.t, max: o.t }); }
/* 지뢰: 칸마다 정해진 자리에 하나씩 (꿀 늪과 같은 방식). 밟은 지뢰는 사라져요 */
const MINE_C = 170, mineHash = (i, j) => (Math.imul(i, 83492791) ^ Math.imul(j, 2971215073 | 0)) >>> 0;
function minePos(i, j) { const h = mineHash(i, j); if (h % 3 !== 0 || (i === 0 && j === 0)) return null; return [(i + 0.5) * MINE_C + (h % 71) - 35, (j + 0.5) * MINE_C + ((h >> 8) % 71) - 35]; }
function mudAt(x, y) { const C = 230, cx = Math.floor(x / C), cy = Math.floor(y / C); for (let j = cy - 1; j <= cy + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) { const h = (Math.imul(i, 73856093) ^ Math.imul(j, 19349663)) >>> 0; if (h % 5 > 1) continue; const mx = (i + 0.5) * C + (h % 61) - 30, my = (j + 0.5) * C + ((h >> 8) % 61) - 30; if ((x - mx) ** 2 + (y - my) ** 2 < 66 * 66) return true; } return false; }
function gimUpdate(dt) {
  const p = B.p, T = B.gt, every = (k, s) => { T[k] = (T[k] || 0) + dt; if (T[k] >= s) { T[k] -= s; return true; } return false; }, far = Math.hypot(vw, vh) / 2 + 40;
  if (B.slip) { const tx = p.moving ? B.ux : 0, ty = p.moving ? B.uy : 0, k = Math.min(1, dt * (p.moving ? 2.6 : 1.4)); p.vx = (p.vx || 0) + (tx - (p.vx || 0)) * k; p.vy = (p.vy || 0) + (ty - (p.vy || 0)) * k; p.x += p.vx * dt; p.y += p.vy * dt; }
  if (!B.g.length && !B.haz.length) return;
  if (G('gemrain') && every('gr', 5)) for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283, d = rand(70, 260); B.gems.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.8, v: i ? 1 : 3, pull: false, vx: 0, vy: 0, z: 4, vz: rand(150, 230), ph: Math.random() * 6.28, px: p.x, py: p.y }); }
  if (G('charge') && every('ch', 11)) { const a = Math.random() * 6.283, c = Math.cos(a), s = Math.sin(a); for (let i = -3; i <= 3; i++) spawnFoe('churro', p.x + c * far - s * i * 44, p.y + s * far + c * i * 44); if (!headless) sfx.warn(); }
  if (G('bombs') && every('bo', 2.4)) { spawnRing('pop'); spawnRing('pop'); }
  if (G('meteor') && every('me', 1.8)) { const a = Math.random() * 6.283, d = Math.random() < 0.4 ? 0 : rand(40, 150); hazard({ k: 'c', x: p.x + Math.cos(a) * d + (p.moving ? p.dirX * 50 : 0), y: p.y + Math.sin(a) * d + (p.moving ? p.dirY * 50 : 0), r: 56, t: 1.25 }); }
  if (G('beams') && every('be', 4.2)) { const off = rand(-30, 30); if (Math.random() < 0.5) hazard({ k: 'l', x: p.x - 520, y: p.y + off, a: 0, len: 1040, w: 24, t: 1.3 }); else hazard({ k: 'l', x: p.x + off, y: p.y - 520, a: 1.5708, len: 1040, w: 24, t: 1.3 }); if (!headless) sfx.warn(); }
  if (G('trail') && every('tr', 0.7)) hazard({ k: 'c', x: p.x, y: p.y, r: 34, t: 1.5 });
  if (G('ring') && every('ring', 13)) { const n = Math.round((12 + Math.floor(B.floor / 2)) * (G('giant') ? 0.5 : 1)), ty = B.floor > 12 ? 'cookie' : B.floor > 5 ? 'ice' : 'jelly', a0 = Math.random() * 6.283; for (let i = 0; i < n; i++) spawnFoe(ty, p.x + Math.cos(a0 + i / n * 6.283) * 330, p.y + Math.sin(a0 + i / n * 6.283) * 330); if (!headless) { sfx.warn(); toast('포위됐어요! 한쪽을 뚫어요'); } }
  if (G('goldrush')) { if (every('gold', 18)) { const a = Math.random() * 6.283, f = spawnFoe('jelly', p.x + Math.cos(a) * 190, p.y + Math.sin(a) * 190); f.gold = f.flee = true; f.hp *= 2; f.max = f.hp; f.spd = 140; f.life = 10; if (!headless) toast('황금 젤리다! 잡아요'); } for (const f of B.foes) if (f.gold && !f.dead) { f.life -= dt; if (f.life <= 0) f.dead = true; } }
  if (G('pulse')) { const ph = B.t % 7, k = ph < 4 ? 1.5 : 0.1; if (k !== B.pulseK) { B.pulseK = k; if (!headless) toast(k < 1 ? '얼음!' : '땡! 빨라져요'); } }
  if (G('shrink')) { B.shrinkR = Math.max(250, 560 - B.t * 2.5); if (Math.hypot(p.x, p.y) > B.shrinkR) { T.out = (T.out || 0) + dt; if (T.out > 0.9) { T.out = 0; hurtPlayer('gim'); } } else T.out = 0; }
  if (G('elites') && every('el', 22)) spawnRing(pick(['donut', 'golem', 'knight'].slice(0, Math.max(1, B.act))), true);
  if (G('vortex')) { if (every('vo', 10)) { const v = B.vort[Math.floor(Math.random() * B.vort.length)], a = Math.random() * 6.283; v.x = p.x + Math.cos(a) * 200; v.y = p.y + Math.sin(a) * 200; } for (const v of B.vort) { const dx = v.x - p.x, dy = v.y - p.y, d = Math.hypot(dx, dy) || 1; if (d < 250 && d > 8) { p.x += dx / d * 70 * dt; p.y += dy / d * 70 * dt; } } }
  if (G('wind')) { if (T.wa == null || every('wi', 9)) { T.wa = Math.random() * 6.283; if (!headless) toast('바람 방향이 바뀌었어요'); } p.x += Math.cos(T.wa) * 46 * dt; p.y += Math.sin(T.wa) * 46 * dt; if (!headless && Math.random() < dt * 14) fxAdd({ k: 'line', x: p.x + rand(-vw / 2, vw / 2), y: p.y + rand(-vh / 2, vh / 2), vx: Math.cos(T.wa) * 520, vy: Math.sin(T.wa) * 520, life: 0.5, max: 0.5, col: '#FFFFFF', g: 0.0001 }); }
  if (G('balls')) { const hw = vw / 2 - 20, hh = vh / 2 - 20; for (const o of B.balls) { o.rx += o.vx * dt; o.ry += o.vy * dt; if (Math.abs(o.rx) > hw) { o.rx = Math.sign(o.rx) * hw; o.vx *= -1; } if (Math.abs(o.ry) > hh) { o.ry = Math.sign(o.ry) * hh; o.vy *= -1; } if (o.rx * o.rx + o.ry * o.ry < (o.r + HERO_R) ** 2) hurtPlayer('gim'); } }
  if (G('mines')) { const ci = Math.floor(p.x / MINE_C), cj = Math.floor(p.y / MINE_C); for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) { const k = i + ',' + j; if (B.mineOff.has(k)) continue; const m = minePos(i, j); if (m && (p.x - m[0]) ** 2 + (p.y - m[1]) ** 2 < 46 * 46) { B.mineOff.add(k); hazard({ k: 'c', x: m[0], y: m[1], r: 62, t: 0.75 }); if (!headless) sfx.warn(); } } }
  if (G('bounty') && every('bounty', 20)) { const f = spawnRing('cookie'); f.bounty = true; f.gold = true; f.hp *= 7; f.max = f.hp; f.spd *= 1.25; f.sc = 2; f.r *= 1.4; if (!headless) toast('현상범 등장! 잡으면 폭탄이 나와요'); }
  if (G('blackout')) { const ph = B.t % 11, dark = ph > 7.5; if (dark !== !!B.dark) { B.dark = dark; if (!headless) { toast(dark ? '정전! 불이 꺼졌어요' : '불이 다시 켜졌어요'); if (dark) sfx.warn(); } } }
  if (G('stalker')) { if (!B.stalk || B.stalk.dead) { const a = Math.random() * 6.283; B.stalk = spawnFoe('ginger', p.x + Math.cos(a) * 420, p.y + Math.sin(a) * 420); B.stalk.immortal = true; B.stalk.r = 16; } B.stalk.spd = Math.min(150, 62 + B.t * 0.55); }
  if (G('portal')) { if (every('pmove', 12)) { const v = B.ports[Math.floor(Math.random() * B.ports.length)], a = Math.random() * 6.283; v.x = p.x + Math.cos(a) * 230; v.y = p.y + Math.sin(a) * 230; if (!headless) fxAdd({ k: 'ring', x: v.x, y: v.y, r: 60, to: 10, life: 0.4, max: 0.4, col: '#C77DFF', w: 5 }); }
    if (every('pspawn', 1.3) && B.foes.length < 200) for (const v of B.ports) { const a = Math.random() * 6.283; spawnFoe(pick(B.floor > 12 ? ['jelly', 'ice', 'cookie', 'zip'] : ['jelly', 'ice']), v.x + Math.cos(a) * 14, v.y + Math.sin(a) * 14); } }
  if (G('turret')) for (const t of B.turs) { if ((t.x - p.x) ** 2 + (t.y - p.y) ** 2 > 520 * 520) { const a = Math.random() * 6.283; t.x = p.x + Math.cos(a) * 260; t.y = p.y + Math.sin(a) * 260; t.cd = 2; }
    t.cd -= dt; if (t.cd <= 0) { t.cd = 3.2; const dx = p.x - t.x, dy = p.y - t.y - 10, m = Math.hypot(dx, dy) || 1; B.foeShots.push({ x: t.x, y: t.y - 10, vx: dx / m * 135, vy: dy / m * 135, r: 6, dmg: 1, life: 4 }); if (!headless) fxAdd({ k: 'flash', x: t.x, y: t.y - 10, r: 12, life: 0.1, max: 0.1, col: '#FF8FA8' }); } }
  if (G('mud')) B.spdK = mudAt(p.x, p.y) ? 0.5 : 1;
  if (G('cross') && every('cr', 4.4)) { hazard({ k: 'l', x: p.x - 560, y: p.y, a: 0, len: 1120, w: 22, t: 1.4 }); hazard({ k: 'l', x: p.x, y: p.y - 560, a: 1.5708, len: 1120, w: 22, t: 1.4 }); if (!headless) sfx.warn(); }
  if (G('sprinkle') && every('sp', 0.42)) { const a = Math.random() * 6.283, d = rand(30, 230); hazard({ k: 'c', x: p.x + Math.cos(a) * d + (p.moving ? p.dirX * 40 : 0), y: p.y + Math.sin(a) * d + (p.moving ? p.dirY * 40 : 0), r: 28, t: 0.95 }); }
  if (G('sugar')) { const ph = B.t % 12, on = ph > 9.6; if (ph > 8.6 && !T.swarn) { T.swarn = true; if (!headless) { toast('설탕 폭주가 와요!'); sfx.warn(); } } if (ph < 1) T.swarn = false; B.sugarK = on ? 1.85 : 1; B.sugarOn = on; }
  if (G('ghost')) B.ghostA = B.t % 5 < 2.6 ? 1 : 0.14;
  if (G('spiral') && every('spi', 8)) { const a0 = Math.random() * 6.283, dir = Math.random() < 0.5 ? 1 : -1, cx = p.x, cy = p.y; for (let i = 0; i < 14; i++) { const a = a0 + dir * i * 0.5, d = 30 + i * 21; hazard({ k: 'c', x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: 34, t: 1.0 + i * 0.09 }); } if (!headless) sfx.warn(); }      /* 시럽 나선: 안쪽부터 차례로 터져요 */
  if (G('grid') && every('grd', 7.5)) { const ox = p.x + rand(-30, 30), oy = p.y + rand(-30, 30), gap = 120; for (const k of [-1, 1]) { hazard({ k: 'l', x: ox - 560, y: oy + k * gap / 2, a: 0, len: 1120, w: 18, t: 1.6 }); hazard({ k: 'l', x: ox + k * gap / 2, y: oy - 560, a: 1.5708, len: 1120, w: 18, t: 1.6 }); } for (const k of [-1.5, 1.5]) { hazard({ k: 'l', x: ox - 560, y: oy + k * gap, a: 0, len: 1120, w: 18, t: 1.6 }); hazard({ k: 'l', x: ox + k * gap, y: oy - 560, a: 1.5708, len: 1120, w: 18, t: 1.6 }); } if (!headless) sfx.warn(); }      /* 와플 격자: 줄 사이 칸이 안전해요 */
  if (G('donut') && every('dnt', 9)) { const cx = p.x, cy = p.y, n = 16, gapI = Math.floor(Math.random() * n); for (let i = 0; i < n; i++) { if (i === gapI || i === (gapI + 1) % n) continue; const a = i / n * 6.283; hazard({ k: 'c', x: cx + Math.cos(a) * 170, y: cy + Math.sin(a) * 170, r: 40, t: 1.7 }); } if (!headless) sfx.warn(); }      /* 도넛 포위망: 안쪽이나 빈틈이 안전해요 */
  if (G('roll') && every('rol', 7)) { const a = Math.random() * 6.283, c = Math.cos(a), sn = Math.sin(a), off = rand(-40, 40); hazard({ k: 'l', x: p.x - c * 560 - sn * off, y: p.y - sn * 560 + c * off, a, len: 1120, w: 36, t: 1.5, roll: true }); if (!headless) sfx.warn(); }      /* 롤케이크: 굵은 줄을 따라 굴러가요 */
  if (G('regen') && every('re', 1)) for (const f of B.foes) if (!f.dead && f !== B.big && f.hp < f.max && B.t - (f.lastHit || 0) > 2) f.hp = Math.min(f.max, f.hp + f.max * 0.12);
  if (B.haz.length) {
    for (const o of B.haz) { o.t -= dt; if (o.t > 0) continue;
      let hit; if (o.k === 'c') hit = (p.x - o.x) ** 2 + (p.y - o.y) ** 2 < (o.r - 4) ** 2; else { const c = Math.cos(o.a), s = Math.sin(o.a), rx = p.x - o.x, ry = p.y - o.y, al = rx * c + ry * s; hit = al > 0 && al < o.len && Math.abs(-rx * s + ry * c) < o.w - 3; }
      if (hit) hurtPlayer('gim');
      if (o.roll) { const c = Math.cos(o.a), s = Math.sin(o.a); for (const f of B.foes) { if (f.dead) continue; const rx = f.x - o.x, ry = f.y - o.y, al = rx * c + ry * s; if (al > 0 && al < o.len && Math.abs(-rx * s + ry * c) < o.w + f.r) hurtFoe(f, FOES[f.type].big ? f.max * 0.03 : f.max * 0.3, null, -s, c); } if (!headless) { for (let d = 0; d < o.len; d += 80) burst(o.x + c * d, o.y + s * d, '#C98A4B', 3, 120); B.shake = Math.max(B.shake, 0.25); } }      /* 줄 위의 적은 롤케이크에 깔려요 */
      if (!headless) { if (o.k === 'c') { fxAdd({ k: 'ring', x: o.x, y: o.y, r: o.r * 0.4, to: o.r, life: 0.25, max: 0.25, col: '#FF3B5C', w: 6 }); burst(o.x, o.y, '#FF8FA8', 6, 140); } else { for (let d = 0; d < o.len; d += 60) fxAdd({ k: 'flash', x: o.x + Math.cos(o.a) * d, y: o.y + Math.sin(o.a) * d, r: 22, life: 0.12, max: 0.12, col: '#FFE066' }); B.shake = Math.max(B.shake, 0.12); } }
    }
    B.haz = B.haz.filter(o => o.t > 0);
  }
}
/* 바닥에 그리는 기믹: 꿀 늪, 울타리, 소용돌이 */
function gimGround() {
  const p = B.p;
  if (G('mud')) { const C = 230; for (let j = Math.floor((p.y - vh) / C); j <= Math.floor((p.y + vh) / C); j++) for (let i = Math.floor((p.x - vw) / C); i <= Math.floor((p.x + vw) / C); i++) { const h = (Math.imul(i, 73856093) ^ Math.imul(j, 19349663)) >>> 0; if (h % 5 > 1) continue; const mx = (i + 0.5) * C + (h % 61) - 30, my = (j + 0.5) * C + ((h >> 8) % 61) - 30; putDisc(X(mx), Y(my), 33, 27, '#E0A020', 9); pcircle(X(mx), Y(my), 33, '#FFD86B'); } }
  if (G('mines')) { const C = MINE_C; for (let j = Math.floor((p.y - vh) / C); j <= Math.floor((p.y + vh) / C); j++) for (let i = Math.floor((p.x - vw) / C); i <= Math.floor((p.x + vw) / C); i++) { if (B.mineOff.has(i + ',' + j)) continue; const m = minePos(i, j); if (!m) continue; const mx = X(m[0]), my = Y(m[1]), bl = Math.floor(B.t * 3 + i + j) % 2; pdisc(mx, my, 5, INK); pdisc(mx, my, 4, '#6B3A1E'); R('#A0663C', mx - 2, my - 3, 2, 2); R(bl ? '#FF3B5C' : '#7A1E2E', mx, my - 1, 2, 2); } }
  if (G('portal')) for (const v of B.ports) { const vx = X(v.x), vy = Y(v.y); putDisc(vx, vy, 16, 12, '#3A1E5A', 12); for (let k = 0; k < 4; k++) { const a = -B.t * 4 + k * 1.571; pline(Math.round(vx + Math.cos(a) * 15), Math.round(vy + Math.sin(a) * 11), Math.round(vx + Math.cos(a + 1) * 6), Math.round(vy + Math.sin(a + 1) * 4), k % 2 ? '#C77DFF' : '#FFFFFF'); } pcircle(vx, vy, 16, '#C77DFF'); }
  if (G('turret')) for (const t of B.turs) { const tx0 = X(t.x), ty0 = Y(t.y), hot = t.cd < 0.6 && Math.floor(B.t * 12) % 2; R('rgba(14,6,20,.5)', tx0 - 7, ty0 + 2, 14, 2); R(INK, tx0 - 6, ty0 - 4, 12, 7); R('#8E9AA8', tx0 - 5, ty0 - 3, 10, 5); R(INK, tx0 - 4, ty0 - 12, 8, 9); R(hot ? '#FFFFFF' : '#E8323C', tx0 - 3, ty0 - 11, 6, 7); R('#FFB0BC', tx0 - 2, ty0 - 10, 2, 2); R(INK, tx0 - 1, ty0 - 15, 2, 4); }
  if (G('shrink')) { const r = Math.round(B.shrinkR / WP); pcircle(X(0), Y(0), r, Math.floor(B.t * 6) % 2 ? '#FF4F9A' : '#FFD0E4', 2); pcircle(X(0), Y(0), r + 3, '#9C1E5C'); }
  if (G('balls')) for (const o of B.balls) { const bx = X(p.x + o.rx), by = Y(p.y + o.ry), r = Math.round(o.r / WP); putDisc(bx, by + r, r, Math.round(r * 0.4), '#1A0E22', 8); pdisc(bx, by, r + 1, INK); pdisc(bx, by, r, '#FFFFFF'); for (let k = 0; k < 3; k++) { const a = B.t * 4 + k * 2.094; pline(bx, by, Math.round(bx + Math.cos(a) * r), Math.round(by + Math.sin(a) * r), '#E8323C', 2); } pdisc(bx - 2, by - 2, 2, '#FFE0E6'); }
  if (G('vortex')) for (const v of B.vort) { const vx = X(v.x), vy = Y(v.y); putDisc(vx, vy, 30, 24, '#8B5A3C', 7); for (let k = 0; k < 3; k++) { const a = B.t * 3 + k * 2.094; pline(Math.round(vx + Math.cos(a) * 26), Math.round(vy + Math.sin(a) * 20), Math.round(vx + Math.cos(a + 0.9) * 10), Math.round(vy + Math.sin(a + 0.9) * 8), '#FFE1A8'); } }
}
/* 화면 위에 덮는 기믹: 안개 */
function gimOver() {
  if (B.sugarOn) { ctx.fillStyle = `rgba(255,79,154,${(0.1 + 0.06 * Math.sin(B.t * 20)).toFixed(3)})`; ctx.fillRect(0, 0, lw, lh); }      /* 설탕 폭주 중에는 화면이 분홍빛 */
  if (!G('fog') && !B.dark) return; const p = B.p, px = X(p.x), py = Y(p.y) - 10, r = 93 + (Math.floor(B.t * 3) % 2);      /* 보이는 범위: 예전 62에서 1.5배 */
  for (const [rr, a] of [[r + 18, 0.5], [r, 0.82]]) { ctx.fillStyle = `rgba(20,10,30,${a})`; ctx.beginPath(); ctx.rect(0, 0, lw, lh); ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.closePath(); ctx.fill('evenodd'); }
}
let toastTimer = 0;
function toast(t) { if (headless) return; const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { e.hidden = true; }, 2200); }

/* 판이 지날수록(층이 오를수록) 적이 확실히 많아져요: 첫 판 1배 → 보스 판 약 5배 */
const stageMul = () => Math.min(6.5, 0.8 + 0.5 * B.floor);
/* 2막부터는 적이 훨씬 단단해져요. 캐릭터가 무기를 다 키우는 속도에 맞춘 값 */
/* 100번 스테이지(층 85)를 넘으면 몬스터 체력이 느는 속도를 30%로 줄여요. 그 전까지는 그대로예요 */
/* 무기마다 쓰임새: 잡몹을 쓸어 담는 무기와 보스를 때리는 무기가 달라요. 보스·엘리트에게 주는 피해 배율 */
const BOSSK = { pin: 1.5, macaron: 1.5, honey: 1.5, cotton: 1.8, choco: 1.4, cream: 1.15 };
const hpFloor = () => B.floor <= 85 ? B.floor : 85 + (B.floor - 85) * 0.2;      /* 85층 뒤로는 체력이 아주 천천히 늘어요 */
const lateMul = (fl = hpFloor()) => { const k = Math.max(0, fl - 5); return 1 + LATE * k + 0.006 * k * k; };
const LATE = 0.18;
function spawnFoe(type, x, y, minion) {
  const HF = hpFloor(), d = FOES[type], grow = (1 + 0.92 * Math.pow(HF, 0.8) + (B.t / 120) * 0.6) * lateMul();     /* 초반 판에서 빨리 단단해지고 뒤로 갈수록 완만하게 */
  const big = !!d.big && !minion;
  const f = { type, x, y, r: d.r, hp: d.hp * (big ? (1 + 0.2 * HF + 0.012 * HF * HF) * lateMul() / (1 + 0.06 * Math.max(0, HF - 20) + 0.004 * Math.max(0, HF - 20) ** 2) : grow) * DF().hp,      /* 뒤쪽 보스는 체력이 너무 불어나지 않게 */ spd: d.spd * DF().spd * Math.min(1.5, 0.95 + 0.06 * B.floor), dmg: d.dmg * (1 + 0.1 * B.floor), flash: 0, acid: 0, acidT: 0, slow: 0, hitT: {}, ph: Math.random() * 6.28, st: 0, stT: big ? 3 : rand(0.8, 2.5), vx: 0, vy: 0, kx: 0, ky: 0, sq: 0, born: B.t, dead: false };
  if (minion) { f.minion = true; f.hp = d.hp * 0.15 * grow * DF().hp; f.r = d.r * 0.85; }     // 지난 막의 엘리트가 일반 몬스터로: 체력은 엘리트의 15%
  if (type === 'zip') f.spd = d.spd * Math.min(1.25, 0.95 + 0.012 * B.floor);
  if (!big && B.hpK && B.hpK !== 1) f.hp *= B.hpK; if (!big && G('giant')) { f.r *= 1.5; f.sc = 2; f.xpK = 3; } f.max = f.hp; if (!big && G('coat')) f.coat = f.max * 0.3; B.foes.push(f); return f;
}
function spawnRing(type, minion) {
  const a = Math.random() * 6.283, R = Math.hypot(vw, vh) / 2 + 40;
  return spawnFoe(type, B.p.x + Math.cos(a) * R, B.p.y + Math.sin(a) * R, minion);
}
function fxAdd(o) { if (!headless && B.fx.length < 260) B.fx.push(o); }
function textAdd(x, y, t, col, big) { if (!headless && B.texts.length < 40) B.texts.push({ x: x + rand(-8, 8), y, vx: rand(-30, 30), vy: -150 - (big ? 40 : 0), t, col: col || '#4A2040', life: big ? 0.8 : 0.6, max: big ? 0.8 : 0.6, big: !!big }); }
/* 부스러기: 중력을 받아 튀었다 떨어져요 */
function burst(x, y, col, n = 6, sp = 150) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = rand(sp * 0.3, sp); fxAdd({ k: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, g: 420, life: rand(0.3, 0.55), max: 0.55, col, r: rand(2, 5) }); } }
/* 맞은 자리에 별 모양 섬광 */
function spark(x, y, a, col = '#FFFFFF', big) { fxAdd({ k: 'flash', x, y, r: big ? 26 : 16, life: 0.09, max: 0.09, col }); for (let i = 0; i < (big ? 6 : 4); i++) { const aa = a + rand(-1.1, 1.1), s = rand(220, 420); fxAdd({ k: 'line', x, y, vx: Math.cos(aa) * s, vy: Math.sin(aa) * s, life: rand(0.1, 0.18), max: 0.18, col, w: big ? 3.5 : 2.5 }); } }
const FOE_COL = { queen: '#FF7FB4', puff: '#F6D9A8', bee: '#FFD23F', zip: '#B8F03C', golem: '#59B8FF', knight: '#FF6B3D', ginger: '#C9823E', boss2: '#8B5A3C', boss3: '#FF6B3D', jelly: '#3FCF7A', cookie: '#B9783F', ice: '#9FDBFF', donut: '#FF8FB8', boss: '#C77DFF', pop: '#FFF3C0', gum: '#FF8FD0', churro: '#C98A4E' };
function hitStop(t) { if (!headless && B.hsCool <= 0) { B.hitstop = Math.max(B.hitstop, t); B.hsCool = 0.12; } }

function hurtFoe(f, d, w, ax, ay, kbm = 1) {
  f.lastHit = B.t;
  if (f.dead || f.immortal || f.air) return;
  const SPv = B.st.sp, d0 = d, crit = Math.random() < B.st.crit; if (crit) d *= B.st.critMul;
  if (SPv.grit && B.p.hp <= 1) d *= 1 + 0.2 * SPv.grit; if (f.markT > B.t) d *= 1 + 0.15 * (SPv.mark || 0); if (crit && SPv.mark) f.markT = B.t + 3;
  if (w && w.id) { const gk = capeSp('giant', w.id), ck = capeSp('chill', w.id); if (gk && FOES[f.type].big) d *= 1 + 0.3 * gk; if (ck) f.slow = Math.max(f.slow || 0, 1.5 * ck); }
  f.critHit = crit;
  d *= FOES[f.type].big ? (1 + 0.1 * M('hunter')) * (1 + 0.25 * (SPv.wrath || 0)) : 1 + 0.08 * M('sweep');
  if (w && FOES[f.type].big) d *= BOSSK[w.id] || 1;      // 보스·엘리트에게: 근접 무기는 더 세게, 번개·폭탄·크림도 조금 보강
  d *= B.st.dmg * (1 + capeD(w && w.id)); if (f.coat > 0) { f.coat -= d; d *= 0.35; if (f.coat <= 0 && !headless) burst(f.x, f.y - FOES[f.type].h * 0.4, '#FFFFFF', 8, 170); }      /* 설탕 껍질이 깨질 때까지는 피해가 덜 들어가요 */ f.hp -= d; f.flash = 0.08; f.sq = 0.35;
  if (SPv.execute && f.hp > 0 && !FOES[f.type].big && f.hp < f.max * 0.12 * SPv.execute) f.hp = 0;
  if (w && w.id && run) { const D = run.dmg || (run.dmg = {}), key = B.legPet ? 'pet' : w.id; D[key] = (D[key] || 0) + Math.min(d, f.hp + d); }
  /* 맞은 방향으로 밀려나요 (큰 적은 조금만) */
  let dx = ax, dy = ay; if (dx == null) { dx = f.x - B.p.x; dy = f.y - B.p.y; } const m = Math.hypot(dx, dy) || 1, kb = (f === B.big ? 40 : 230) * (crit ? 1.5 : 1) * kbm;
  if (!FOES[f.type].noKb) { f.kx = dx / m * kb; f.ky = dy / m * kb; }
  if (!headless) { const a = Math.atan2(dy, dx); spark(f.x - dx / m * f.r * 0.5, f.y - FOES[f.type].h * 0.35 - dy / m * f.r * 0.3, a, crit ? '#FFE066' : '#FFFFFF', crit); }
  textAdd(f.x, f.y - FOES[f.type].h * 0.8, Math.round(d) + (crit ? '!' : ''), crit ? '#FF9A1F' : '#4A2040', crit);
  if (crit) { sfx.crit(); hitStop(0.06); B.shake = Math.max(B.shake, 0.08); fxAdd({ k: 'slash', x: f.x, y: f.y - FOES[f.type].h * 0.4, a: Math.atan2(dy, dx), life: 0.16, max: 0.16 }); } else { sfx.hit(); if (f.hp > 0) hitStop(0.012); }
  if (f.hp <= 0) killFoe(f, w);
  else if (SPv.echo && !B.inEcho && w && Math.random() < 0.12 * SPv.echo) { B.inEcho = true; hurtFoe(f, d0 * 0.5, w, ax, ay, 0); B.inEcho = false; }
}
/* ───── 전설 별 강화: 몬스터를 잡다 보면 아주 낮은 확률로 '전설 별 조각'이 떨어져요 (던파 에픽처럼 빛기둥 + 느린 화면). 저절로 주워요 ───── */
const LSTAR_N = [1, 2, 3, 4, 5], LSTAR_MAX = 5, EPIC_P = 1 / 6000;      /* 별마다 필요한 조각 수, 일반 몹 드랍 확률 */
const lStar = id => ((run && run.lstar) || {})[id] || 0;
const lStarK = id => 1 + 0.12 * lStar(id);      /* 별 하나마다 피해 +12% */
const lStarCd = id => LEG[id].cd * (1 - 0.08 * (lStar(id) >= 3) - 0.08 * (lStar(id) >= 5));      /* ★3, ★5에서 쿨타임 8%씩 짧아져요 */
const lStarTxt = id => lStar(id) ? ' ' + '★'.repeat(lStar(id)) : '';
function epicRoll(f) {
  if (!run.leg) return; const ids = Object.keys(run.leg).filter(id => lStar(id) < LSTAR_MAX); if (!ids.length) return;
  const ch = f === B.big ? 0.03 : FOES[f.type].big ? 0.015 : EPIC_P * (f.xpK || 1);      /* 보스 3%, 꼬마 대장 1.5%, 일반 몹 1/6000: 평균 10판에 1개 꼴 */ if (Math.random() >= ch) return;
  const id = pick(ids); epicGet(id); if (headless) return;      /* 떨어지는 순간 바로 얻어요. 판이 끝나도 사라지지 않아요 */
  (B.epics || (B.epics = [])).push({ x: f.x, y: f.y, id, t: 0 }); B.hitstop = Math.max(B.hitstop, 0.25); B.slow = Math.max(B.slow, 1.6); B.shake = Math.max(B.shake, 0.5); sfx.epic();
  textAdd(f.x, f.y - 46, '전설 별 조각!', '#FF4FD8', true);
}
function epicGet(id) {
  const L = run.lsp || (run.lsp = {}), T = run.lstar || (run.lstar = {}); L[id] = (L[id] || 0) + 1; const need = LSTAR_N[T[id] || 0];
  if (L[id] >= need) { L[id] -= need; T[id] = (T[id] || 0) + 1; if (!headless) { toast(`${LEG[id].name} ★${T[id]} 달성! 피해 +${12 * T[id]}%${T[id] === 3 || T[id] === 5 ? ', 쿨타임 감소' : ''}`); setTimeout(() => sfx.leg(), 700); textAdd(B.p.x, B.p.y - 60, `${LEG[id].name} ★${T[id]}`, '#FF4FD8', true); } }
  else if (!headless) toast(`${LEG[id].name} 별 조각 ${L[id]}/${need} 획득!`);
  if (!headless) persist();
}
/* 별 조각 결정: 떨어진 뒤 10초 동안 바닥에 남아요. 직접 가서 닿으면 화면의 일반 몬스터가 전부 사라져요 */
const EPIC_GATHER = 0.9, EPIC_LIFE = 11;
function epicUpdate(dt) {
  if (!B.epics || !B.epics.length) return; const p = B.p;
  for (const e of B.epics) { e.t += dt; if (e.t > EPIC_LIFE) { e.done = true; continue; }
    if (e.t > EPIC_GATHER && (p.x - e.x) ** 2 + (p.y - e.y) ** 2 < 36 * 36) { e.done = true; epicBomb(e); } }
  B.epics = B.epics.filter(e => !e.done);
}
function epicBomb(e) {
  const p = B.p; B.noSplit = true; B.bombing = true; let n = 0;
  for (const f of B.foes.slice()) { if (f.dead || f === B.big || f.immortal || /^boss|queen/.test(f.type)) continue; f.hp = 0; killFoe(f, null); n++; }
  B.noSplit = false; B.bombing = false; B.foeShots = []; B.telegraphs = B.telegraphs.filter(t => !(t.f && t.f.dead));
  if (headless) return; sfx.boom(); sfx.bigKill(); sfx.epic(); B.shake = Math.max(B.shake, 0.9); B.hitstop = Math.max(B.hitstop, 0.18); B.flashScr = { col: '200,120,255', t: 0.6, max: 0.6 };
  for (const [r, w, c] of [[60, 10, '#FFFFFF'], [200, 9, '#4FE8FF'], [400, 8, '#FF4FD8'], [640, 7, '#9B3DFF'], [900, 6, '#FFFFFF']]) fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 10, to: r, life: 0.6, max: 0.6, col: c, w });
  burst(p.x, p.y - 20, '#FF4FD8', 30, 480); burst(p.x, p.y - 20, '#4FE8FF', 24, 380); toast(n ? `별의 폭발! 몬스터 ${n}마리가 사라졌어요` : '별의 폭발!');
}
/* 연출: ① 0.9초 동안 화면 끝에서 강한 기운이 그 자리로 빨려 들어요 ② 터지면서 보라·하늘빛 기둥이 서요 ③ 바닥에 결정이 남아요. 투명하지 않게, 전설 이펙트 위에 그려요 */
const EP_C = ['#FFFFFF', '#4FE8FF', '#FF4FD8', '#9B3DFF', '#2A0650'];
function epicDraw() {
  if (!B.epics || !B.epics.length) return; const C = EP_C;
  for (const e of B.epics) { const ex = X(e.x), ey = Y(e.y), t = e.t, bl = Math.floor(t * 14) % 2, rd = Math.round;
    if (t < EPIC_GATHER) { const u = t / EPIC_GATHER, R0 = rd((1 - u * u) * Math.max(lw, lh) * 0.6) + 8;
      for (let i = 0; i < 30; i++) { const a = i * 0.2094 + u * 2.4, r1 = R0 * (0.55 + 0.45 * ((i * 37) % 10) / 10), r2 = Math.max(3, r1 * 0.45); pline(rd(ex + Math.cos(a) * r1), rd(ey + Math.sin(a) * r1), rd(ex + Math.cos(a + 0.3) * r2), rd(ey + Math.sin(a + 0.3) * r2), C[1 + i % 3], i % 3 ? 1 : 2); }      /* 빨려 드는 기운 줄기 */
      for (let i = 0; i < 44; i++) { const a = i * 0.1428 - u * 6, r = (1 - ((u * 1.7 + i * 0.0613) % 1)) * R0; pstar(rd(ex + Math.cos(a) * r), rd(ey + Math.sin(a) * r * 0.85), 1 + (i % 3 === 0), C[i % 4]); }
      pcircle(ex, ey, Math.max(4, rd(R0 * 0.42)), C[3], 3); pcircle(ex, ey, Math.max(3, rd(R0 * 0.26)), C[2], 2); pcircle(ex, ey, Math.max(2, rd(R0 * 0.14)), C[1], 2);
      const cr = rd(4 + u * 12); pdisc(ex, ey, cr + 3, C[4]); pdisc(ex, ey, cr + 1, bl ? C[2] : C[3]); pdisc(ex, ey, Math.max(1, cr - 3), C[1]); pdisc(ex, ey, Math.max(1, cr - 6), C[0]); continue; }
    const k = t - EPIC_GATHER, burst0 = Math.max(0, 1 - k / 1.4), end = t > EPIC_LIFE - 1 ? Math.max(0, EPIC_LIFE - t) : 1, ww = Math.max(1, rd((4 + 10 * burst0 + bl) * end));
    if (k < 0.75) { const q = k / 0.75; for (const [m, c, th] of [[1, C[0], 3], [0.82, C[1], 3], [0.64, C[2], 3], [0.46, C[3], 3], [0.28, C[0], 2]]) pcircle(ex, ey, rd(q * m * 260) + 4, c, th); for (let i = 0; i < 16; i++) { const a = i * 0.3927, L = rd((1 - q) * 120 + 20); pline(ex, ey, rd(ex + Math.cos(a) * L * (1 + q)), rd(ey + Math.sin(a) * L * (1 + q) * 0.8), i % 2 ? C[0] : C[2], 2); } }      /* 터지는 순간 */
    R(C[4], ex - ww * 2 - 2, 0, ww * 4 + 4, ey); R(C[3], ex - ww * 2, 0, ww * 4, ey); R(C[2], ex - rd(ww * 1.35), 0, rd(ww * 2.7), ey); R(C[1], ex - rd(ww * 0.75), 0, Math.max(2, rd(ww * 1.5)), ey); R(C[0], ex - Math.max(1, rd(ww * 0.3)), 0, Math.max(2, rd(ww * 0.6)), ey);      /* 겹겹이 빛기둥 */
    for (const sd of [-1, 1]) { let x = ex + sd * (ww * 2 + 2), y = 0; const st = Math.max(8, rd(ey / 12)); while (y < ey) { const ny = Math.min(ey, y + st), nx = ex + sd * (ww * 2 + 2 + ((y * 7 + Math.floor(t * 24) * 3) % 7) - 3); pline(x, y, nx, ny, (y / st) % 2 ? C[1] : C[0], 1); x = nx; y = ny; } }      /* 기둥 둘레 번개 */
    for (let i = 0; i < 18; i++) { const sx = ex - ww * 2 + ((i * 13) % (ww * 4 + 1)), sy = ey - ((i * 37 + t * 320) % Math.max(20, ey)); R(i % 2 ? C[0] : C[1], sx, sy, 1, 5 + (i % 3) * 3); }
    const rr = rd((24 + 6 * burst0) * Math.max(0.3, end)) + bl; pcircle(ex, ey + 3, rr, C[2], 2); pcircle(ex, ey + 3, rd(rr * 0.68), C[1], 1); for (let i = 0; i < 8; i++) { const a = i * 0.785 + t * 1.6; pline(ex, ey + 3, rd(ex + Math.cos(a) * rr), rd(ey + 3 + Math.sin(a) * rr * 0.5), C[3], 1); }      /* 바닥 마법진 */
    const iy = ey - 14 + rd(Math.sin(t * 5) * 3), sz = Math.max(3, rd(8 * Math.max(0.5, end)));      /* 결정: 먹으면 폭발 */
    for (let y = -sz * 2 - 1; y <= sz * 2 + 1; y++) { const hw = rd((sz + 1) * (1 - Math.abs(y) / (sz * 2 + 1))); if (hw >= 0) R(INK, ex - hw - 1, iy + y, hw * 2 + 3, 1); }
    for (let y = -sz * 2; y <= sz * 2; y++) { const hw = rd(sz * (1 - Math.abs(y) / (sz * 2))); if (hw >= 0) R(y < -sz * 0.6 ? C[1] : y < sz * 0.6 ? C[2] : C[3], ex - hw, iy + y, hw * 2 + 1, 1); }
    R(C[0], ex - 1, iy - sz, 2, sz); pstar(ex, iy, sz + 5 + bl * 3, C[0]); }
}
function killFoe(f, w) {
  f.dead = true; B.kills++; epicRoll(f);
  if (B.st.rush) { B.rushN = Math.min(B.st.rush, (B.rushN || 0) + 1); B.rushT = 3; } if (B.st.killHaste && B.kills % 30 === 0) B.khT = 3;
  if (G('split') && !B.noSplit && !f.mini && f !== B.big && f.type !== 'pop' && !FOES[f.type].big) for (let k = 0; k < 2; k++) { const m = spawnFoe(f.type, f.x + (k ? 12 : -12), f.y); m.mini = true; m.hp = m.max = f.max * 0.35; m.r = f.r * 0.7; m.sc = 0.7; m.xpK = 0.5; }
  if (f.bounty && B.bombs.length < 3) B.bombs.push({ x: f.x, y: f.y, ph: 0 });
  if (f.type === 'puff' && !B.bombing && B.foeShots.length < 70) { const a0 = Math.random() * 6.283; for (let k = 0; k < 6; k++) { const a = a0 + k * 1.047; B.foeShots.push({ x: f.x, y: f.y - 6, vx: Math.cos(a) * 92, vy: Math.sin(a) * 92, r: 6, dmg: 1, life: 2.4 }); } }      /* 슈크림이 터지며 크림 방울 6개 */
  if (f.gold) for (let k = 0; k < 12; k++) { const a = Math.random() * 6.283, sp = rand(40, 130); B.gems.push({ gold: true, x: f.x, y: f.y, v: 4, pull: false, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, z: 4, vz: rand(150, 230), ph: Math.random() * 6.28, px: f.x, py: f.y }); }
  const d = FOES[f.type], col = FOE_COL[f.type], big = f === B.big;
  if (!big && B.magnets.length < 6 && Math.random() < (1 + 0.3 * M('gold')) / 90) B.magnets.push({ x: f.x, y: f.y, ph: 0 });      // 가끔 자석을 떨어뜨려요 (여러 개가 같이 있을 수 있어요)
  if (!big && B.bombs.length < 2 && !f.mini && Math.random() < 1 / 140) B.bombs.push({ x: f.x - 14, y: f.y, ph: 0 });      // 폭탄: 먹으면 일반 몬스터가 전부 터져요
  if (big) B.magnets.push({ x: f.x + 20, y: f.y, ph: 0 });
  const elite = ['donut', 'golem', 'knight'].includes(f.type);
  /* 엘리트는 체력에 비례한 경험치: 지금 스테이지의 젤리 몇 마리 몫인지로 계산해요 */
  const eliteXp = elite ? Math.max(d.xp, Math.round(f.max / (14 * (1 + 0.92 * Math.pow(hpFloor(), 0.8) + (B.t / 120) * 0.6) * lateMul() * DF().hp))) : 0;
  if (B.st.sp.lucky && f.critHit && !elite && d.xp && Math.random() < 0.2 * B.st.sp.lucky) B.gems.push({ x: f.x + 6, y: f.y, v: d.xp, pull: false, vx: rand(-40, 40), vy: rand(-20, 20), z: 4, vz: rand(150, 230), ph: Math.random() * 6.28, px: f.x, py: f.y });
  if (B.st.sp.boom && !B.inBoom && !big && Math.random() < 0.08 * B.st.sp.boom) { B.inBoom = true; blast(f.x, f.y, 70, 60, { id: 'gear', noAcc: true }, '#FF9A3D'); B.inBoom = false; }
  if (d.xp) { const n = elite ? Math.min(8, Math.max(1, Math.ceil(eliteXp / 5))) : 1; for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = elite ? rand(60, 160) : rand(20, 60); B.gems.push({ gold: elite, x: f.x, y: f.y, v: elite ? Math.ceil(eliteXp / n) : d.xp * (f.xpK || 1), pull: false, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, z: 4, vz: rand(150, 230), ph: Math.random() * 6.28, px: f.x, py: f.y }); } }
  burst(f.x, f.y - d.h * 0.3, col, big ? 40 : 10, big ? 320 : 190); burst(f.x, f.y - d.h * 0.3, '#FFFFFF', big ? 14 : 4, 120);
  fxAdd({ k: 'ghost', img: d.img, x: f.x, y: f.y + f.r * 0.7, h: d.h, flip: f.x > B.p.x ? -1 : 1, life: big ? 0.5 : 0.2, max: big ? 0.5 : 0.2 });
  fxAdd({ k: 'ring', x: f.x, y: f.y - d.h * 0.3, r: f.r * 0.6, to: f.r * (big ? 5 : 2.6), life: big ? 0.45 : 0.22, max: big ? 0.45 : 0.22, col: big ? '#FFC83D' : '#FFFFFF', w: big ? 8 : 4 });
  fxAdd({ k: 'pop', x: f.x, y: f.y - d.h * 0.35, r: big ? 30 : 12, life: big ? 0.35 : 0.2, max: big ? 0.35 : 0.2, col: col });
  if (big) { sfx.bigKill(); B.hitstop = 0.18; B.slow = 0.6; B.shake = 0.6; B.flashScr = { col: '255,255,255', t: 0.25, max: 0.25 }; }
  else { sfx.kill(f.type); hitStop(f.type === 'cookie' ? 0.035 : 0.02); B.shake = Math.max(B.shake, f.type === 'cookie' ? 0.1 : 0.05); }
  if (f.acid > 0 && B.weapons.some(x => x.id === 'lemon' && x.lv >= 10)) {   // 레몬 각성: 산성 폭발이 옮아요
    for (const g of B.foes) if (!g.dead && g !== f && (g.x - f.x) ** 2 + (g.y - f.y) ** 2 < 80 * 80) { g.acid = Math.min(g.acid + 4, 50); g.flash = 0.06; }
    fxAdd({ k: 'ring', x: f.x, y: f.y - d.h * 0.3, r: 10, to: 80, life: 0.3, max: 0.3, col: '#B9DD52', w: 6 }); burst(f.x, f.y - d.h * 0.3, '#C8F06A', 8, 160);
  }
  if (big) { B.bigDead = true; if (B.kind === 'boss') endBattle(true); else toast('엘리트를 잡았어요!'); }
}
/* 하트 3칸: 무엇에 맞든 한 번에 1칸 */
function hurtPlayer(src) {
  const p = B.p; if (p.inv > 0 || B.over) return; if (window.__dbg) (window.__dbg.hits = window.__dbg.hits || {})[src || '?'] = ((window.__dbg.hits || {})[src || '?'] || 0) + 1;
  const push = (R, d) => B.foes.forEach(f => { const dx = f.x - p.x, dy = f.y - p.y, m = Math.hypot(dx, dy) || 1; if (m < R && f !== B.big && !FOES[f.type].noKb) { f.kx = dx / m * d; f.ky = dy / m * d; } });
  if (M('dodge') && Math.random() < 0.06 * M('dodge')) { p.inv = 0.5; textAdd(p.x, p.y - 50, '피함!', '#7FFF8A', true); sfx.block(); return; }
  if (p.shield && B.st.sp.bulwark) { for (const f of B.foes) if (!f.dead && f !== B.big && (f.x - p.x) ** 2 + (f.y - p.y) ** 2 < 170 * 170) f.stun = Math.max(f.stun || 0, 1.5 * B.st.sp.bulwark); fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 20, to: 170, life: 0.35, max: 0.35, col: '#FFD23F', w: 6 }); }
  if (p.shield && p.kongShield) { p.kongShield = false; for (const f of B.foes) if (!f.dead && f !== B.big && (f.x - p.x) ** 2 + (f.y - p.y) ** 2 < 150 * 150) f.stun = Math.max(f.stun || 0, 1); }
  if (p.shield) { p.shield = false; if (M('shield2')) p.reshield = 60 - 10 * M('shield2'); p.inv = 0.8; textAdd(p.x, p.y - 50, '막음!', '#59B8FF', true); sfx.block(); push(120, 400); fxAdd({ k: 'ring', x: p.x, y: p.y - 24, r: 30, to: 120, life: 0.3, max: 0.3, col: '#59B8FF', w: 6 }); return; }
  if (B.st.sp.thorn) blast(p.x, p.y, 140, 160 * B.st.sp.thorn / Math.max(0.01, B.st.dmg), { id: 'gear', noAcc: true }, '#FF8FB8');
  run.hits = (run.hits || 0) + 1; const HB = run.hitBy || (run.hitBy = {}); HB[src || '?'] = (HB[src || '?'] || 0) + 1; if (B.st.hitHaste) B.hasteT = 3;
  p.hp -= 1; p.inv = DF().inv * B.st.invK; B.shake = 0.35; B.hitstop = 0.12; B.slow = 0.35; B.flashScr = { col: '224,68,90', t: 0.35, max: 0.35 }; B.heartPop = 0.5;
  push(130, 520); burst(p.x, p.y - 30, '#E0445A', 12, 220); fxAdd({ k: 'ring', x: p.x, y: p.y - 24, r: 38, to: 140, life: 0.32, max: 0.32, col: '#E0445A', w: 5 });
  sfx.hurt();
  if (p.hp <= 0) {
    if (run.potion) {      // 따뜻한 코코아: 저절로 마시고 하트 1칸으로 다시 일어나요
      run.potion = false; p.hp = 1; p.inv = 2.2;
      push(200, 700);
      fxAdd({ k: 'ring', x: p.x, y: p.y, r: 10, to: 200, life: 0.5, max: 0.5, col: '#FFC83D', w: 8 }); toast('두 번째 바람! 다시 일어났어요'); sfx.revive();
      if (!headless) $('#potHud').innerHTML = '';
    } else if (!petRevive()) { p.hp = 0; endBattle(false); }
  }
}
function nearestFoe(range, from) { let best = null, bd = range * range; const p = from || B.p; for (const f of B.foes) { if (f.dead || f.immortal) continue; const d = (f.x - p.x) ** 2 + (f.y - p.y) ** 2; if (d < bd) { bd = d; best = f; } } return best; }
function nearFoes(range, n) { const p = B.p, r2 = range * range, l = B.foes.filter(f => !f.dead && !f.immortal && (f.x - p.x) ** 2 + (f.y - p.y) ** 2 < r2); l.sort((a, b) => ((a.x - p.x) ** 2 + (a.y - p.y) ** 2) - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2)); return l.slice(0, n); }
const ar = () => B.st.area * (1 + capeA(B.wid));
const atkNow = () => B.st.atk + (B.t < 30 ? B.st.open : 0) + (B.rushT > 0 ? B.rushN / 100 : 0) + (B.p.hp <= 1 ? 0.2 * (B.st.sp.frenzy || 0) : 0);
/* 폭발: 범위 안 적을 모두 때려요 */
function blast(x, y, r, dmg, w, col) {
  let n = 0; for (const f of B.foes) if (!f.dead && (f.x - x) ** 2 + (f.y - y) ** 2 < (r + f.r) ** 2) { hurtFoe(f, dmg, w, f.x - x, f.y - y); n++; }
  if (w && w.id && !w.noAcc) { accFire(w.id); if (n) accHit(w.id); }
  fxAdd({ k: 'ring', x, y, r: r * 0.3, to: r, life: 0.25, max: 0.25, col, w: 6 }); fxAdd({ k: 'flash', x, y, r: r * 0.5, life: 0.08, max: 0.08, col: '#FFFFFF' }); burst(x, y, col, 8, 180);
}
const ACC = {};      /* 명중률: 무기별로 공격을 낸 수와 적에게 실제로 닿은 수 */
const accFire = (id, n = 1) => { const a = ACC[id] || (ACC[id] = { fire: 0, hit: 0 }); a.fire += n; };
const accHit = (id, n = 1) => { const a = ACC[id] || (ACC[id] = { fire: 0, hit: 0 }); a.hit += n; };
window.__acc = ACC;
function fireWeapons(dt) { for (const w of B.weapons) fireOne(w, dt); }
/* 무기 하나를 한 번 쓰는 몸통 (별이가 무기를 대신 쓸 때도 이걸 불러요) */
function fireOne(w, dt, force) {
  const p = B.p;
    if (isLeg(w.id) && !force) { if (w.id === 'honey' && !w.legClean) { w.legClean = true; B.zones = B.zones.filter(z => !(z.w === w && !z.leg)); } return; }      /* 각성한 무기는 전설 스킬이 대신해요 */
    const lv = w.lv, s5 = lv >= 5, s10 = lv >= 10, lw = lwOn(w.id); if (w.lcd != null && w.cd > w.lcd + 0.05) { const tk = capeSp('twin', w.id); if (tk && Math.random() < 0.18 * tk) w.cd *= 0.2; } w.cd -= dt * (atkNow() + capeC(w.id)); w.lcd = w.cd; B.wid = w.id;
    if (w.id === 'macaron') {            /* 늘 돌고 있어요 */
      w.ang += dt * (s5 ? 4.2 : 3.2); w.pulse = ((w.pulse || 0) + dt) % 2.2;
      const near = nearestFoe(230), base = (s5 ? 84 : 66) * ar(), want = near ? Math.min(Math.hypot(near.x - p.x, near.y - p.y), base * 2.1) : base;   // 가까운 적까지 궤도를 넓혀요
      w.rad = (w.rad || base) + (Math.max(base, want) - (w.rad || base)) * Math.min(1, dt * 3);
      const n = 1 + lv + (lw ? 1 : 0), R = w.rad * (1 + 0.6 * Math.max(0, Math.sin(w.pulse / 0.7 * Math.PI)) * (w.pulse < 0.7 ? 1 : 0));
      if (s10) w.burstT = (w.burstT ?? 2) - dt;
      w.orbs = [];
      for (let i = 0; i < n; i++) {
        const a = w.ang + i * 6.283 / n; let ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R;
        /* 돌던 마카롱이 가까운 적에게 날아가 부딪히고 돌아와요 */
        const dr = (w.dr || (w.dr = []))[i] || (w.dr[i] = { m: 0, cd: i * 0.3, t: 0 }); dr.cd -= dt;
        if (dr.m === 0 && dr.cd <= 0) { const tg = nearestFoe(230, { x: ox, y: oy }); if (tg) { dr.m = 1; dr.t = 0; dr.tg = tg; accFire('macaron'); } else dr.cd = 0.2; }
        if (dr.m === 1) { dr.t += dt * 4.5; const e = Math.min(1, dr.t), tx2 = dr.tg.x, ty2 = dr.tg.y - 10; ox += (tx2 - ox) * e; oy += (ty2 - oy) * e; dr.lx = tx2; dr.ly = ty2;
          if (dr.t >= 1) { if (!dr.tg.dead) { hurtFoe(dr.tg, 28, w, dr.tg.x - p.x, dr.tg.y - p.y); accHit('macaron'); if (lw) blast(tx2, ty2, 40 * ar(), 14, { id: 'macaron', lv: w.lv, noAcc: true }, '#FF8FB8'); fxAdd({ k: 'flash', x: tx2, y: ty2, r: 10, life: 0.07, max: 0.07, col: '#FFD0E2' }); } dr.m = 2; dr.t = 0; } }
        else if (dr.m === 2) { dr.t += dt * 4.5; const e = Math.min(1, dr.t); ox = dr.lx + (ox - dr.lx) * e; oy = dr.ly + (oy - dr.ly) * e; if (dr.t >= 1) { dr.m = 0; dr.cd = s5 ? 0.9 : 1.2; } }
        w.orbs.push([ox, oy]);
        for (const f of B.foes) { if (f.dead) continue;
          if ((f.x - ox) ** 2 + (f.y - oy) ** 2 < (f.r + 11) ** 2 && (f.hitT.mac || 0) <= B.t) { f.hitT.mac = B.t + 0.28; hurtFoe(f, 32, w, f.x - ox, f.y - oy); } }
        if (s10 && w.burstT <= 0) blast(ox, oy, 52 * ar(), 30, w, '#FF8FB8');
      }
      if (s10 && w.burstT <= 0) { w.burstT = 2; sfx.swing(); B.shake = Math.max(B.shake, 0.08); }
      return;
    }
    if (w.cd > 0) return;
    if (w.id === 'pin') {
      const R = 108 * (s5 ? 1.25 : 1) * ar(), t = nearestFoe(R + 40);
      if (!t) { w.cd = 0.15; return; }
      const a = Math.atan2(t.y - p.y, t.x - p.x), dirs = [a]; w.cd = lw ? (w.dbl ? 0.95 : 0.16) : 0.7; w.dbl = lw && !w.dbl;
      for (const g of nearFoes(R + 40, 12)) { if (dirs.length >= lv) break; const ga = Math.atan2(g.y - p.y, g.x - p.x); if (dirs.every(d => { let da = Math.abs(ga - d) % 6.283; if (da > Math.PI) da = 6.283 - da; return da > 0.9; })) dirs.push(ga); }   // 다른 적 쪽으로 먼저
      for (let i = 1; dirs.length < lv; i++) dirs.push(a + i * 6.283 / lv);
      accFire('pin', dirs.length); const hitDirs = new Set();
      for (const f of B.foes) { if (f.dead) continue; const dx = f.x - p.x, dy = f.y - p.y, m = Math.hypot(dx, dy); const fr = FOES[f.type].big ? f.r * 1.6 : f.r; if (m > R + fr && !(s10 && m < R * 1.7 + fr)) continue; dirs.forEach((d, di) => { let da = Math.abs(Math.atan2(dy, dx) - d) % 6.283; if (da > Math.PI) da = 6.283 - da; if (da < 1.1 && m <= R + fr) hitDirs.add(di); }); const fa = Math.atan2(dy, dx); const nIn = dirs.filter(d => { let da = Math.abs(fa - d) % 6.283; if (da > Math.PI) da = 6.283 - da; return da < 1.1; }).length, hitsN = Math.min(4, s10 ? Math.max(nIn, 3) : nIn); if (m <= R + fr && hitsN) { for (let h = 0; h < hitsN && !f.dead; h++) hurtFoe(f, 21, w, dx, dy, s5 ? 1.6 : 1); } else if (s10) hurtFoe(f, 14, w, dx, dy); }
      accHit('pin', s10 ? dirs.length : hitDirs.size);
      if (s10) { fxAdd({ k: 'spin', x: p.x, y: p.y, a, r: R, life: 0.3, max: 0.3 }); fxAdd({ k: 'ring', x: p.x, y: p.y - 12, r: R * 0.8, to: R * 1.7, life: 0.3, max: 0.3, col: '#FFE1A8', w: 6 }); }
      else dirs.forEach(d => fxAdd({ k: 'arc', x: p.x, y: p.y, a: d, r: R, life: 0.22, max: 0.22 }));
      B.shake = Math.max(B.shake, 0.04); sfx.swing();
    } else if (w.id === 'cream' || w.id === 'lemon') {
      const t = nearestFoe(320); if (!t) { w.cd = 0.2; return; }
      const a = Math.atan2(t.y - p.y, t.x - p.x), n = lv + (lw ? 1 : 0), cream = w.id === 'cream'; w.cd = cream ? 0.8 : 0.95;
      fxAdd({ k: 'flash', x: p.x + Math.cos(a) * 18, y: p.y - 10 + Math.sin(a) * 18, r: 11, life: 0.07, max: 0.07, col: cream ? '#FFFFFF' : '#F4E04D' });
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.13; B.shots.push({ k: w.id, x: p.x, y: p.y - 10, vx: Math.cos(aa) * 340, vy: Math.sin(aa) * 340, r: cream && s10 ? 11 : 7, dmg: cream ? (s10 ? 15 : 12) : 13, acid: cream ? 0 : (s5 ? 10 : 5) * (lw ? 1.5 : 1), pierce: cream && s10 ? 99 : 0, life: 1.2, w, hit: new Set(), aw: s10, puddle: cream && s5, chill: cream && lw }); }
      sfx.shot();
    } else if (w.id === 'star') {
      const tg = nearestFoe(340), a = tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : Math.atan2(p.dirY, p.dirX), n = 2 + lv; w.cd = 0.9;
      for (let i = 0; i < n; i++) { const aa = s10 ? a + i * 6.283 / n : a + (i - (n - 1) / 2) * 0.2; B.shots.push({ k: 'star', x: p.x, y: p.y - 10, vx: Math.cos(aa) * 310, vy: Math.sin(aa) * 310, r: lw ? 10 : 7, dmg: 30, pierce: 1, life: 1.0, w, hit: new Set(), aw: s10, bounce: (s10 ? 3 : s5 ? 1 : 0) + (lw ? 1 : 0), big: lw }); }
      sfx.shot();
    } else if (w.id === 'skewer') {
      const tg = nearestFoe(360), a = tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : Math.atan2(p.dirY, p.dirX), n = lv + (lw ? 1 : 0), sp = s5 ? 560 : 430; w.cd = 1.4;
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.12; B.shots.push({ k: 'skewer', x: p.x, y: p.y - 10, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, r: lw ? 14 : 9, dmg: 18, pierce: 99, life: s10 ? 1.5 : s5 ? 1.1 : 0.9, w, hit: new Set(), a: aa, aw: s10, boom: s10 }); }
      sfx.shot();
    } else if (w.id === 'honey') {
      w.cd = 3; const r = (s5 ? 64 : 50) * ar() * (lw ? 1.25 : 1), life = s5 ? 4 : 3, hd = lw ? 1.5 : 1;
      for (let i = 0; i < lv; i++) { let x = p.x, y = p.y; if (i) { const t = pick(nearFoes(220, 8)) || null; if (t) { x = t.x; y = t.y; } else { const a = Math.random() * 6.283, d = rand(60, 150); x += Math.cos(a) * d; y += Math.sin(a) * d; } } B.zones.push({ x, y, r, life, tick: 0, dmg: 9 * hd, w }); }
      if (s10 && !B.zones.some(z => z.follow)) B.zones.push({ x: p.x, y: p.y, r: 92 * ar() * (lw ? 1.25 : 1), life: 1e9, tick: 0, dmg: 11 * hd, w, follow: true });
    } else if (w.id === 'choco') {
      const nb = lv + (lw ? 1 : 0), ts = nearFoes(280, nb); if (!ts.length) { w.cd = 0.3; return; } w.cd = 1.6;
      for (let i = 0; i < nb; i++) { const t = ts[i % ts.length], j = i >= ts.length ? 30 : 0; B.lobs.push({ k: 'bomb', x0: p.x, y0: p.y - 10, x: t.x + rand(-j, j), y: t.y + rand(-j, j), t: 0, dur: 0.45 + i * 0.04, r: (s5 ? 60 : 44) * ar() * (lw ? 1.15 : 1), dmg: 29, w, cluster: s10 }); }
      sfx.swing();
    } else if (w.id === 'cotton') {
      const ts = nearFoes(260, lv); if (!ts.length) { w.cd = 0.25; return; } w.cd = s10 ? 0.75 : 1.3;
      const chain = (s10 ? 8 : s5 ? 4 : 2) + (lw ? 1 : 0);
      for (const t of ts) {
        const pts = [[p.x, p.y - 30]], hit = new Set(); let cur = t;
        for (let k = 0; k <= chain && cur; k++) { hit.add(cur); pts.push([cur.x, cur.y - FOES[cur.type].h * 0.4]); hurtFoe(cur, 12, w, cur.x - pts[pts.length - 2][0], cur.y - pts[pts.length - 2][1]); if ((s10 || lw) && cur !== B.big) cur.stun = s10 ? 0.6 + (lw ? 0.2 : 0) : 0.3; let nb = null, nd = 120 * 120; for (const g of B.foes) { if (g.dead || hit.has(g)) continue; const d2 = (g.x - cur.x) ** 2 + (g.y - cur.y) ** 2; if (d2 < nd) { nd = d2; nb = g; } } if (!nb) { for (let e = 0; e < Math.min(3, chain - k) && !cur.dead; e++) hurtFoe(cur, 8, w, 0.001, 0.001); } cur = nb; }
        fxAdd({ k: 'bolt', pts, life: 0.16, max: 0.16 }); accFire('cotton'); accHit('cotton');
      }
      sfx.zap();
    } else if (w.id === 'cane') {
      w.cd = 2; const ts = B.foes.filter(f => !f.dead && Math.abs(f.x - p.x) < vw / 2 && Math.abs(f.y - p.y) < vh / 2);
      for (let i = 0; i < lv + (lw ? 1 : 0); i++) { const t = ts.length ? pick(ts) : null, x = t ? t.x : p.x + rand(-150, 150), y = t ? t.y : p.y + rand(-200, 200); B.lobs.push({ k: 'cane', x, y, t: -i * 0.07, dur: 0.38, r: (s5 ? 50 : 36) * ar() * (lw ? 1.2 : 1), dmg: 22, w, shards: s10 }); }
    }
}
/* 던진 폭탄과 떨어지는 사탕: 정해진 시간 뒤에 터져요 */
function updateLobs(dt) {
  for (const L of B.lobs) {
    L.t += dt; if (L.t < L.dur) continue; L.done = true;
    if (L.k === 'bomb') {
      blast(L.x, L.y, L.r, L.dmg, L.w, '#8B5A3C'); sfx.boom();
      if (L.cluster && !L.mini) for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283, d = rand(40, 70); B.lobs.push({ k: 'bomb', mini: true, x0: L.x, y0: L.y, x: L.x + Math.cos(a) * d, y: L.y + Math.sin(a) * d, t: 0, dur: 0.3, r: L.r * 0.55, dmg: 14, w: L.w }); }
    } else {
      blast(L.x, L.y, L.r, L.dmg, L.w, '#FFF3C0'); sfx.thud(); B.shake = Math.max(B.shake, 0.06);
      if (L.shards) for (let i = 0; i < 6; i++) { const a = i * 1.047 + Math.random() * 0.3; B.shots.push({ k: 'star', x: L.x, y: L.y, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, r: 6, dmg: 9, pierce: 1, life: 0.5, w: L.w, hit: new Set() }); }
    }
  }
  B.lobs = B.lobs.filter(L => !L.done);
}
function levelUp() {
  B.lvl++; B.xp -= B.need; B.need = needOf(B.lvl); run.lvl = B.lvl;
  if (has('sprinkle')) { B.foes.forEach(f => { if (!f.dead && (f.x - B.p.x) ** 2 + (f.y - B.p.y) ** 2 < 130 * 130) hurtFoe(f, 30, null); }); fxAdd({ k: 'ring', x: B.p.x, y: B.p.y, r: 10, to: 130, life: 0.3, max: 0.3, col: '#FF8FB8', w: 6 }); }
  if (headless) { const o = rollLevelOpts(); applyLevel(o[0]); return; }
  /* 빛기둥, 고리, 별가루, 큰 글자. 주변 적은 밀려나고 잠깐 느려져요 */
  const p = B.p; B.lvlPending = true; sfx.level(); B.slow = 1.1; p.inv = Math.max(p.inv, 1.4);
  fxAdd({ k: 'beam', x: p.x, y: p.y, life: 0.9, max: 0.9 });
  [0, 0.12, 0.24].forEach((dl, i) => fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 16, to: 150 + i * 40, life: 0.5 + dl, max: 0.5 + dl, col: i === 1 ? '#FFFFFF' : '#FFD23F', w: 7 - i * 2 }));
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, sp = rand(160, 300); fxAdd({ k: 'star', x: p.x, y: p.y - 26, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: rand(0.5, 0.8), max: 0.8, col: pick(['#FFD23F', '#FFFFFF', '#FF8FB8', '#8FD3FF']), r: rand(4, 7) }); }
  B.foes.forEach(f => { const dx = f.x - p.x, dy = f.y - p.y, m = Math.hypot(dx, dy) || 1; if (m < 170 && f !== B.big && !FOES[f.type].noKb) { f.kx = dx / m * 600; f.ky = dy / m * 600; } });
  B.flashScr = { col: '255,230,140', t: 0.4, max: 0.4 };
  const ban = el('div', 'lvl-ban', `<b>LEVEL UP!</b><span>Lv ${B.lvl}</span>`); fxLayer.appendChild(ban); setTimeout(() => ban.remove(), 760);
  const lv = $('#lvText'); lv.classList.remove('pop'); void lv.offsetWidth; lv.classList.add('pop');
  setTimeout(() => { if (!B || B.over) { if (B && B.lvlLost) return; run.picks = (run.picks || 0) + 1; if (B) B.lvlPending = false; return; } B.lvlPending = false; B.paused = true; levelSheet(rollLevelOpts()); }, 720);
}
/* 선택지: 아직 Lv10이 아닌 무기 10가지 + 능력 3가지가 모두 같은 확률 */
function rollLevelOpts() {
  const pool = Object.keys(WEAPONS).filter(id => wLv(id) < WMAX).map(id => ({ t: 'w', id })).concat(legUnlocked() ? run.wpn.filter(w => !isLeg(w.id)).map(w => ({ t: 'leg', id: w.id })) : []).concat(Object.keys(STATS).filter(id => id === 'heart' ? ((run.bonus.heart || 0) < 1 && Math.random() < 0.2) : id === 'spd' ? (run.bonus.spd || 0) < 6 : id === 'crit' ? (run.bonus.crit || 0) < 10 : id === 'dmg' ? (run.bonus.dmg || 0) < 10 : true).map(id => ({ t: 's', id })));
  if (!pool.length) return [{ t: 'eqw' }];      /* 카드를 다 채웠으면: 무기 장비 상자 */
  return shuffle(pool).slice(0, M('choice') ? 4 : 3);
}
function applyLevel(o) {
  if (o.t === 'leg') { const S2 = run.shards || (run.shards = {}); S2[o.id] = (S2[o.id] || 0) + 1; if (S2[o.id] >= LEG_N) { (run.leg || (run.leg = {}))[o.id] = 1; if (B && !headless) { toast(`전설 스킬: ${LEG[o.id].name}!`); B.flashScr = { col: '255,216,107', t: 0.6, max: 0.6 }; confetti(60); } } return; }
  if (o.t === 'eqw') { const r0 = Math.random(), it = rollItem(Math.max(1, run.stage || 1), r0 < 0.01 ? 3 : r0 < 0.05 ? 2 : r0 < 0.2 ? 1 : 0, 'weapon'); addItems([it]); if (!headless) { toast(`레벨업! 무기 획득: ${it.nm} (${GRADES[it.g].name})`); if (B) textAdd(B.p.x, B.p.y - 56, `${GRADES[it.g].name} 무기 획득!`, it.g ? '#59B8FF' : '#FFFFFF', true); } return; }
  if (o.t === 's') { run.bonus[o.id] = (run.bonus[o.id] || 0) + 1; if (o.id === 'heart') { run.maxHp++; run.hp++; if (B) { B.p.max++; B.p.hp++; } } if (B) B.st = battleStats(); return; }
  let w = run.wpn.find(x => x.id === o.id);
  if (w) { w.lv++; const bw = B && B.weapons.find(x => x.src === w); if (bw) bw.lv = w.lv + capeP(w.id); if (B && (w.lv === 5 || w.lv === 10)) specialFx(w); }
  else { w = { id: o.id, lv: 1 }; run.wpn.push(w); if (B) B.weapons.push({ id: w.id, lv: 1 + capeP(w.id), src: w, cd: 0.2, ang: 0 }); }
}
function levelSheet(opts, after, shown) {
  if (opts.length === 1 && opts[0].t === 'eqw') { applyLevel(opts[0]); sfx.good(); if (after) { after(); return; } if (B) { B.paused = false; last = performance.now(); } return; }      /* 카드를 다 채웠으면 고를 것 없이 바로 무기를 받아요 */
  /* 짧게: 무기는 레벨만, 능력은 한 줄. Lv5·Lv10이 되는 카드는 색으로 구분 */
  const optHtml = (o, i) => {
    if (o.t === 'leg') { const n = ((run.shards || {})[o.id] || 0) + 1; return `<button class="opt lvc lv10 leg" type="button" data-act="pick" data-i="${i}"><i class="shine"></i><em class="tag">${n >= LEG_N ? '★ 전설 각성!' : '★ 전설 조각'}</em><span class="ic">${svg(ICON[o.id])}</span><span class="tx"><b>${LEG[o.id].name} ${n}/${LEG_N}</b><span>${n >= LEG_N ? LEG[o.id].desc : `${WEAPONS[o.id].name}의 전설 조각. 10개를 모으면 전설 스킬이 돼요.`}</span></span></button>`; }
    if (o.t === 'eqw') return `<button class="opt lvc" type="button" data-act="pick" data-i="${i}"><span class="ic">${svg(ICON.pin)}</span><span class="tx"><b>무기 장비 상자</b><span>무기 칸 장비를 하나 받아요. 일반 80%, 희귀 15%, 유물 4%, 영웅 1%. 가방에 들어가요.</span></span></button>`;
    if (o.t === 's') return `<button class="opt lvc" type="button" data-act="pick" data-i="${i}"><span class="ic">${svg(ICON[STATS[o.id].icon])}</span><span class="tx"><b>${STATS[o.id].name}</b></span></button>`;
    const lv = wLv(o.id), nx = lv + 1, W = WEAPONS[o.id];
    const sp = nx === 5 || nx === 10;
    return `<button class="opt lvc${nx === 10 ? ' lv10' : nx === 5 ? ' lv5' : ''}" type="button" data-act="pick" data-i="${i}">${sp ? `<i class="shine"></i><em class="tag">${nx === 10 ? '★ 최강 각성' : '★ 특별 효과'}</em>` : ''}<span class="ic">${svg(ICON[o.id])}</span><span class="tx"><b>${W.name}</b><span>${lv ? `Lv${lv} → Lv${nx}` : '새 무기 Lv1'}</span></span></button>`;
  };
  sheet(`<h2 id="cardTitle">레벨 ${shown || run.lvl}!</h2><div class="opts">${opts.map(optHtml).join('')}</div>${run.rerolls > 0 ? `<button class="btn" type="button" data-act="reroll">다시 뽑기 (${run.rerolls}번 남음)</button>` : ''}`,
    (act, b) => {
      if (b.closest('.lock')) return;
      if (act === 'reroll') { run.rerolls--; sfx.flip(); levelSheet(rollLevelOpts(), after, shown); return; }
      applyLevel(opts[+b.dataset.i]); closeSheet(); sfx.good();
      if (after) { after(); return; }
      B.paused = false; last = performance.now();
      fxAdd({ k: 'ring', x: B.p.x, y: B.p.y - 20, r: 10, to: 90, life: 0.35, max: 0.35, col: '#FFFFFF', w: 5 });
    });
  cardEl.classList.add('lvl'); flipReveal();
}
function specialFx(w) {
  if (headless) return; const p = B.p;
  toast(`${WEAPONS[w.id].name} Lv${w.lv} 특별 효과!`); sfx.rare();
  fxAdd({ k: 'beam', x: p.x, y: p.y, life: 0.7, max: 0.7 });
  for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283, sp = rand(140, 260); fxAdd({ k: 'star', x: p.x, y: p.y - 26, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7, max: 0.7, col: i % 2 ? '#FFD23F' : '#FFFFFF', r: 6 }); }
  fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 20, to: 170, life: 0.5, max: 0.5, col: '#FFD23F', w: 8 });
}
/* 새 적들의 행동. true를 돌려주면 그 순간에는 걸어오지 않아요 */
function foeAI(f, dt, ai) {
  const p = B.p, dx = p.x - f.x, dy = p.y - f.y, m = Math.hypot(dx, dy) || 1;
  if (f.stun > 0) return true;
  if (ai === 'puff') return false;      /* 그냥 걸어와요. 터질 때가 무서워요 (killFoe) */
  if (ai === 'jump') {      /* 점프 마카롱: 걸어오다가 → 웅크리고(예고 원) → 공중으로 폴짝 → 쿵 */
    f.stT = (f.stT ?? 1 + Math.random() * 1.5) - dt; f.st = f.st || 0;
    if (f.st === 0) { if (m < 270 && f.stT <= 0) { const wt = 0.55 * DF().warn; f.st = 1; f.stT = wt; f.jx0 = f.x; f.jy0 = f.y; f.jx = p.x + (p.moving ? p.dirX * 40 : 0); f.jy = p.y + (p.moving ? p.dirY * 40 : 0); B.telegraphs.push({ k: 'circle', x: f.jx, y: f.jy, r: 50, life: wt + 0.62, max: wt + 0.62 }); f.sq = 0.4; } return false; }
    if (f.st === 1) { f.flash = Math.floor(f.stT * 14) % 2 ? 0.05 : 0; f.sq = 0.35; if (f.stT <= 0) { f.st = 2; f.stT = 0.62; f.air = true; } return true; }
    if (f.st === 2) { const u = 1 - Math.max(0, f.stT) / 0.62; f.x = f.jx0 + (f.jx - f.jx0) * u; f.y = f.jy0 + (f.jy - f.jy0) * u; f.zh = Math.sin(Math.PI * u) * 70; f.kx = f.ky = 0;
      if (f.stT <= 0) { f.air = false; f.zh = 0; f.st = 0; f.stT = 3.2 + Math.random(); f.sq = 0.6; if ((p.x - f.x) ** 2 + (p.y - f.y) ** 2 < (50 + HERO_R) ** 2) hurtPlayer('jumper'); if (!headless) { fxAdd({ k: 'ring', x: f.x, y: f.y, r: 10, to: 60, life: 0.3, max: 0.3, col: '#FF8FB8', w: 6 }); burst(f.x, f.y, '#FFF3E6', 8, 160); B.shake = Math.max(B.shake, 0.1); } } return true; }
  }
  if (ai === 'orbit') {      /* 꿀벌: 내 주위를 돌다가 예고선을 긋고 찔러 와요 */
    f.stT = (f.stT ?? 1.6 + Math.random()) - dt; f.ob = f.ob ?? (Math.random() < 0.5 ? 1 : -1);
    if (!f.st) { if (m > 175) return false; const tx = -dy / m * f.ob, ty = dx / m * f.ob, pull = (m - 150) / m; f.x += (tx + dx / m * pull) * f.spd * 0.9 * dt; f.y += (ty + dy / m * pull) * f.spd * 0.9 * dt;
      if (f.stT <= 0) { const wt = 0.75 * DF().warn; f.st = 1; f.stT = wt; f.da = Math.atan2(dy, dx); B.telegraphs.push({ k: 'line', f, a: f.da, len: 330, life: wt, max: wt }); } return true; }
    if (f.st === 1) { if (f.stT <= 0) { f.st = 2; f.stT = 0.55; } return true; }
    f.x += Math.cos(f.da) * 560 * dt; f.y += Math.sin(f.da) * 560 * dt; if (f.stT <= 0) { f.st = 0; f.stT = 2.4 + Math.random(); } return true;
  }
  if (ai === 'zip') {      /* 빠르게 달리지만 방향은 천천히 틀어요 */
    const sp = f.spd * (f.slow > 0 ? 0.55 : 1), tx = dx / m * sp, ty = dy / m * sp, k = Math.min(1, dt * 2.2); f.vx += (tx - f.vx) * k; f.vy += (ty - f.vy) * k;
    if (f.kx || f.ky) return true; f.x += f.vx * dt; f.y += f.vy * dt;
    if (!headless && Math.random() < dt * 20) fxAdd({ k: 'dot', x: f.x - f.vx * 0.04, y: f.y - 6, vx: -f.vx * 0.2, vy: -f.vy * 0.2, life: 0.25, max: 0.25, col: '#D9FF6A', r: 3 }); return true;
  }
  if (ai === 'bomb') {
    if (f.st === 0 && m < 52) { f.st = 1; f.stT = 0.8 * DF().warn; B.telegraphs.push({ k: 'circle', x: f.x, y: f.y, r: 52, life: f.stT, max: f.stT, f }); sfx.warn(); }
    if (f.st === 1) { f.stT -= dt; f.flash = Math.floor(f.stT * 12) % 2 ? 0.05 : 0; if (f.stT <= 0) { if (m < 52 + HERO_R) hurtPlayer('pop'); fxAdd({ k: 'ring', x: f.x, y: f.y, r: 12, to: 60, life: 0.25, max: 0.25, col: '#FF2E4D', w: 6 }); burst(f.x, f.y, '#FF6B7A', 12, 220); sfx.boom(); B.shake = Math.max(B.shake, 0.12); f.hp = 0; killFoe(f, null); } return true; }
    return false;
  }
  if (ai === 'shoot') {
    f.stT -= dt;
    if (f.stT <= 0 && m < 280) { f.stT = 4.2; B.foeShots.push({ x: f.x, y: f.y - 8, vx: dx / m * 100, vy: dy / m * 100, r: 6, dmg: 1, life: 3, gum: true }); fxAdd({ k: 'flash', x: f.x, y: f.y - 8, r: 10, life: 0.08, max: 0.08, col: '#FF8FD0' }); }
    if (m < 120) { f.x -= dx / m * f.spd * 0.6 * dt; f.y -= dy / m * f.spd * 0.6 * dt; return true; }    // 너무 가까우면 물러나요
    return m < 190;
  }
  /* dash */
  f.stT -= dt;
  if (f.st === 0 && f.stT <= 0 && m < 240) { const wt = 0.8 * DF().warn; f.st = 1; f.stT = wt; f.da = Math.atan2(dy, dx); B.telegraphs.push({ k: 'line', f, a: f.da, len: 170, life: wt, max: wt }); }
  else if (f.st === 1 && f.stT <= 0) { f.st = 2; f.stT = 0.42; }
  else if (f.st === 2) { f.x += Math.cos(f.da) * 340 * dt; f.y += Math.sin(f.da) * 340 * dt; if (f.stT <= 0) { f.st = 0; f.stT = 4.2; } return true; }
  return f.st === 1;
}
function bossThink(f, dt) {
  const p = B.p; f.stT -= dt;
  if (f.st === 0 && f.stT <= 0) {
    const r = Math.random();
    if (r < 0.4) { const wt = 1.4 * DF().warn; f.st = 1; f.stT = wt; f.tx = p.x; f.ty = p.y; B.telegraphs.push({ k: 'circle', x: p.x, y: p.y, r: 92, life: wt, max: wt }); sfx.warn(); }
    else if (r < 0.75) { f.st = 2; f.stT = 1.0; B.telegraphs.push({ k: 'ring', f, r: f.r + 26, life: 1.0, max: 1.0 }); sfx.warn(); }
    else { f.st = 0; f.stT = 4; for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283; spawnFoe('jelly', f.x + Math.cos(a) * 80, f.y + Math.sin(a) * 80); } }
  } else if (f.st === 1 && f.stT <= 0) {
    if ((p.x - f.tx) ** 2 + (p.y - f.ty) ** 2 < 92 * 92) hurtPlayer('slam');
    fxAdd({ k: 'ring', x: f.tx, y: f.ty, r: 20, to: 96, life: 0.3, max: 0.3, col: '#FF2E4D', w: 8 }); burst(f.tx, f.ty, '#FF6B7A', 16, 260); B.shake = 0.4; sfx.slam(); f.st = 0; f.stT = 3.2;
  } else if (f.st === 2 && f.stT <= 0) {
    for (let i = 0; i < 14; i++) { const a = i * 6.283 / 14 + Math.random() * 0.2; B.foeShots.push({ x: f.x, y: f.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, r: 8, dmg: 1, life: 3 }); }
    sfx.slam(); f.st = 0; f.stT = 3.4;
  }
}
/* 2막 보스 초코 분수 대왕: 세 번 연달아 내려찍기 / 소용돌이 탄 / 츄러스 부르기 */
function boss2Think(f, dt) {
  const p = B.p; f.stT -= dt;
  if (f.st === 0 && f.stT <= 0) {
    const r = Math.random();
    if (r < 0.4) { f.st = 1; f.n = 3; f.stT = 0; f.slams = []; }
    else if (r < 0.75) { f.st = 2; f.stT = 2.6; f.sa = Math.random() * 6.283; f.sT = 0; sfx.warn(); B.telegraphs.push({ k: 'ring', f, r: f.r + 20, life: 0.6, max: 0.6 }); }
    else { f.stT = 4.5; for (let i = 0; i < 4; i++) { const a = Math.random() * 6.283; spawnFoe('churro', f.x + Math.cos(a) * 90, f.y + Math.sin(a) * 90); } }
  } else if (f.st === 1) {
    if (f.n > 0 && f.stT <= 0) { const wt = 1.15 * DF().warn; f.n--; f.stT = 0.5; const T = { k: 'circle', x: p.x, y: p.y, r: 74, life: wt, max: wt }; B.telegraphs.push(T); f.slams.push({ x: p.x, y: p.y, t: wt }); sfx.warn(); }
    for (const sl of f.slams) { sl.t -= dt; if (sl.t <= 0 && !sl.done) { sl.done = true; if ((p.x - sl.x) ** 2 + (p.y - sl.y) ** 2 < 74 * 74) hurtPlayer('slam'); fxAdd({ k: 'ring', x: sl.x, y: sl.y, r: 16, to: 78, life: 0.3, max: 0.3, col: '#FF2E4D', w: 8 }); burst(sl.x, sl.y, '#8B5A3C', 14, 240); B.shake = 0.3; sfx.slam(); } }
    if (f.n <= 0 && f.slams.every(sl => sl.done)) { f.st = 0; f.stT = 3; }
  } else if (f.st === 2) {
    f.sT -= dt; if (f.stT < 2 && f.sT <= 0) { f.sT = 0.16; f.sa += 0.45; for (const k of [0, Math.PI]) B.foeShots.push({ x: f.x, y: f.y, vx: Math.cos(f.sa + k) * 150, vy: Math.sin(f.sa + k) * 150, r: 7, dmg: 1, life: 3 }); }
    if (f.stT <= 0) { f.st = 0; f.stT = 3.2; }
  }
}
/* 3막 보스 탄 설탕 마왕: 십자 불기둥(두 번) / 겹고리 탄 / 돌진 / 팝콘 부르기 */
/* 마카롱 여왕: 마카롱 비, 회오리 탄막, 크림 격자, 꿀벌 부르기를 번갈아 써요 */
function queenThink(f, dt) {
  const p = B.p; f.stT -= dt; const wt = DF().warn;
  if (f.st === 0 && f.stT <= 0) {
    const r = Math.random(); f.n = 0;
    if (r < 0.3) { f.st = 1; f.n = 7; f.stT = 0.05; if (!headless) toast('마카롱 비!'); }
    else if (r < 0.55) { f.st = 2; f.n = 18; f.sa = Math.random() * 6.283; f.stT = 0.6; B.telegraphs.push({ k: 'ring', f, r: f.r + 26, life: 0.6, max: 0.6 }); sfx.warn(); }
    else if (r < 0.8) { const horiz = Math.random() < 0.5; for (let k = -2; k <= 2; k++) { const o = k * 110 + rand(-20, 20); if (horiz) hazard({ k: 'l', x: p.x - 560, y: p.y + o, a: 0, len: 1120, w: 22, t: 1.5 * wt }); else hazard({ k: 'l', x: p.x + o, y: p.y - 560, a: 1.5708, len: 1120, w: 22, t: 1.5 * wt }); } f.st = 0; f.stT = 3.2; sfx.warn(); }
    else { for (let i = 0; i < 4 + Math.min(3, Math.floor(B.floor / 40)); i++) { const a = i * 1.571 + Math.random(); spawnFoe('bee', f.x + Math.cos(a) * 70, f.y + Math.sin(a) * 70); } f.st = 0; f.stT = 3.5; }
  } else if (f.st === 1 && f.stT <= 0) {      // 마카롱이 내 쪽으로 차례로 떨어져요
    const a = Math.random() * 6.283, d = f.n % 3 === 0 ? 0 : rand(40, 130); hazard({ k: 'c', x: p.x + Math.cos(a) * d + (p.moving ? p.dirX * 60 : 0), y: p.y + Math.sin(a) * d + (p.moving ? p.dirY * 60 : 0), r: 64, t: 1.2 * wt });
    f.n--; f.stT = 0.32; if (f.n <= 0) { f.st = 0; f.stT = 2.6; }
  } else if (f.st === 2 && f.stT <= 0) {      // 회오리 탄막: 돌면서 크림 방울을 뿌려요
    for (const k of [0, 2.094, 4.189]) { const a = f.sa + k; B.foeShots.push({ x: f.x, y: f.y - 20, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 7, dmg: 1, life: 3.4 }); }
    f.sa += 0.32; f.n--; f.stT = 0.11; if (f.n <= 0) { f.st = 0; f.stT = 2.8; sfx.slam(); }
    return true;
  }
  return f.st === 2;
}
function boss3Think(f, dt) {
  const p = B.p; f.stT -= dt;
  const beams = a0 => { const wt = 1.1 * DF().warn; f.ba = a0; for (let k = 0; k < 4; k++) B.telegraphs.push({ k: 'line', f, a: a0 + k * 1.5708, len: 460, w: 20, life: wt, max: wt }); f.stT = wt; sfx.warn(); };
  if (f.st === 0 && f.stT <= 0) {
    const r = Math.random(); f.dash = false;
    if (r < 0.3) { f.st = 1; f.n = 2; beams(Math.atan2(p.y - f.y, p.x - f.x)); }
    else if (r < 0.55) { f.st = 3; f.n = 2; f.stT = 0.9; B.telegraphs.push({ k: 'ring', f, r: f.r + 26, life: 0.9, max: 0.9 }); sfx.warn(); }
    else if (r < 0.82) { const wt = 0.9 * DF().warn; f.st = 4; f.stT = wt; f.da = Math.atan2(p.y - f.y, p.x - f.x); B.telegraphs.push({ k: 'line', f, a: f.da, len: 300, life: wt, max: wt }); sfx.warn(); }
    else { f.stT = 4.5; for (let i = 0; i < 5; i++) { const a = Math.random() * 6.283; spawnFoe('pop', f.x + Math.cos(a) * 100, f.y + Math.sin(a) * 100); } }
  } else if (f.st === 1 && f.stT <= 0) {       // 불기둥이 터져요
    for (let k = 0; k < 4; k++) { const a = f.ba + k * 1.5708, c = Math.cos(a), sn = Math.sin(a), rx = p.x - f.x, ry = p.y - f.y, along = rx * c + ry * sn, side = Math.abs(-rx * sn + ry * c); if (along > 0 && along < 460 && side < 20 + HERO_R) hurtPlayer('beam'); fxAdd({ k: 'bolt', foe: true, pts: [[f.x, f.y], [f.x + c * 460, f.y + sn * 460]], life: 0.22, max: 0.22 }); }
    B.shake = 0.3; sfx.slam(); f.n--;
    if (f.n > 0) beams(f.ba + 0.785); else { f.st = 0; f.stT = 3; }
  } else if (f.st === 3 && f.stT <= 0) {
    const off = f.n === 2 ? 0 : 0.196; for (let i = 0; i < 16; i++) { const a = i * 6.283 / 16 + off; B.foeShots.push({ x: f.x, y: f.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 8, dmg: 1, life: 3 }); }
    sfx.slam(); f.n--; if (f.n > 0) f.stT = 0.7; else { f.st = 0; f.stT = 3; }
  } else if (f.st === 4 && f.stT <= 0) { f.st = 2; f.dash = true; f.stT = 0.6; }
  else if (f.st === 2 && f.dash) { f.x += Math.cos(f.da) * 480 * dt; f.y += Math.sin(f.da) * 480 * dt; if (f.stT <= 0) { f.st = 0; f.dash = false; f.stT = 2.6; } return true; }
  return f.st === 1 || f.st === 4;
}
/* 2막 엘리트 얼음사탕 골렘: 멈춰서 주변 땅을 내려쳐요 (빨간 고리 예고) */
function golemThink(f, dt) {
  const p = B.p; f.stT -= dt; const R = f.minion ? 80 : 118;
  if (f.st === 0 && f.stT <= 0 && (p.x - f.x) ** 2 + (p.y - f.y) ** 2 < (R + 60) ** 2) { const wt = 1.0 * DF().warn; f.st = 1; f.stT = wt; B.telegraphs.push({ k: 'circle', x: f.x, y: f.y, r: R, life: wt, max: wt, f }); sfx.warn(); }
  else if (f.st === 1 && f.stT <= 0) { if ((p.x - f.x) ** 2 + (p.y - f.y) ** 2 < (R + HERO_R) ** 2) hurtPlayer('golem'); fxAdd({ k: 'ring', x: f.x, y: f.y, r: 20, to: R, life: 0.3, max: 0.3, col: '#FF2E4D', w: 8 }); burst(f.x, f.y, '#BFE6FF', 14, 220); B.shake = Math.max(B.shake, f.minion ? 0.1 : 0.3); sfx.slam(); f.st = 2; f.stT = 0.6; }
  else if (f.st === 2 && f.stT <= 0) { f.st = 0; f.stT = f.minion ? 3.5 : 2.6; }
  return f.st !== 0;
}
/* 3막 엘리트 불꽃 창기사: 내 자리에 빨간 원을 띄우고 뛰어올라 내려찍어요 */
function knightThink(f, dt) {
  const p = B.p; f.stT -= dt; const R = f.minion ? 56 : 72;
  if (f.st === 0 && f.stT <= 0 && (p.x - f.x) ** 2 + (p.y - f.y) ** 2 < 320 * 320) { const wt = 1.0 * DF().warn; f.st = 1; f.stT = wt; f.tx = p.x; f.ty = p.y; f.fx0 = f.x; f.fy0 = f.y; B.telegraphs.push({ k: 'circle', x: p.x, y: p.y, r: R, life: wt, max: wt }); sfx.warn(); }
  else if (f.st === 1) { const k = 1 - Math.max(0, f.stT) / (1.0 * DF().warn); if (k > 0.55) { const e = (k - 0.55) / 0.45; f.x = f.fx0 + (f.tx - f.fx0) * e; f.y = f.fy0 + (f.ty - f.fy0) * e; }
    if (f.stT <= 0) { f.x = f.tx; f.y = f.ty; if ((p.x - f.x) ** 2 + (p.y - f.y) ** 2 < (R + HERO_R) ** 2) hurtPlayer('knight'); fxAdd({ k: 'ring', x: f.x, y: f.y, r: 16, to: R, life: 0.3, max: 0.3, col: '#FF2E4D', w: 8 }); burst(f.x, f.y, '#FF9A3D', 14, 240); B.shake = Math.max(B.shake, f.minion ? 0.1 : 0.3); sfx.slam(); f.st = 2; f.stT = 0.5; } }
  else if (f.st === 2 && f.stT <= 0) { f.st = 0; f.stT = f.minion ? 3.8 : 2.8; }
  return f.st !== 0;
}
function eliteThink(f, dt) {
  const p = B.p; f.stT -= dt;
  if (f.st === 0 && f.stT <= 0) { const wt = 0.8 * DF().warn; f.st = 1; f.stT = wt; const a = Math.atan2(p.y - f.y, p.x - f.x); f.da = a; B.telegraphs.push({ k: 'line', f, a, len: 230, life: wt, max: wt }); sfx.warn(); }
  else if (f.st === 1 && f.stT <= 0) { f.st = 2; f.stT = 0.55; }
  else if (f.st === 2) { f.x += Math.cos(f.da) * 480 * dt; f.y += Math.sin(f.da) * 480 * dt; if (f.stT <= 0) { f.st = 0; f.stT = 4; } return true; }
  return f.st === 1;
}

function update(dt) {
  const p = B.p; B.t += dt; run.time = (run.time || 0) + dt;
  /* 이동 */
  let mx = 0, my = 0;
  if (B.auto) [mx, my] = autopilot(); else if (B.joy) { mx = B.joy.dx; my = B.joy.dy; }
  const mm = Math.hypot(mx, my); p.moving = mm > 0.12;
  if (p.moving) {
    const sp = 172 * B.st.spd * (1 + (B.hasteT > 0 ? B.st.hitHaste : 0) + (B.khT > 0 ? B.st.killHaste : 0) + (p.hp <= 1 ? B.st.lowHaste : 0)), k = Math.min(1, mm);
    const ux = mx / mm * sp * k * (B.spdK || 1), uy = my / mm * sp * k * (B.spdK || 1); if (B.slip) { B.ux = ux; B.uy = uy; } else { p.x += ux * dt; p.y += uy * dt; } p.dirX = mx / mm; p.dirY = my / mm; if (Math.abs(mx) > 0.1) p.face = mx > 0 ? 1 : -1; p.bob += dt * 12;
  }
  if (p.inv > 0) p.inv -= dt;
  if (B.st.guard && !p.shield) { B.guardT = (B.guardT ?? B.st.guard) - dt; if (B.guardT <= 0) { B.guardT = B.st.guard; p.shield = true; if (!headless) textAdd(p.x, p.y - 50, '방패!', '#59B8FF'); } }
  if (B.st.sp.flame && p.moving) { B.flT = (B.flT || 0) - dt; if (B.flT <= 0 && B.zones.length < 40) { B.flT = 0.3; B.zones.push({ x: p.x, y: p.y, r: 24, life: 1.5, tick: 0.1, dmg: 10 * B.st.sp.flame, w: { id: 'gear' }, fire: true }); } }
  if (B.st.sp.gust) { B.guT = (B.guT ?? 4) - dt; if (B.guT <= 0) { B.guT = 8 / B.st.sp.gust; for (const f of B.foes) { const dx = f.x - p.x, dy = f.y - p.y, m = Math.hypot(dx, dy) || 1; if (!f.dead && m < 150 && f !== B.big && !FOES[f.type].noKb) { f.kx = dx / m * 560; f.ky = dy / m * 560; } } fxAdd({ k: 'ring', x: p.x, y: p.y - 10, r: 16, to: 150, life: 0.3, max: 0.3, col: '#BFE6FF', w: 5 }); } }
  if (B.hasteT > 0) B.hasteT -= dt; if (B.khT > 0) B.khT -= dt; if (B.rushT > 0) { B.rushT -= dt; if (B.rushT <= 0) B.rushN = 0; }
  /* 적 등장 */
  const rate = (0.6 + 2.05 * Math.min(1, B.t / Math.min(80, B.dur))) * stageMul() * (B.big ? 0.5 : 1) * DF().spawn * 1.2 * (B.rateK || 1);
  if (!B.rush && B.t >= Math.min(120, B.dur * 0.67)) { B.rush = true; if (!headless) { toast('몰려와요! 적이 더 많아져요'); sfx.warn(); } }
  if (B.rush && !headless && ZOOM > 0.78) { ZOOM = Math.max(0.78, ZOOM - dt * 0.15); resize(); }     // 화면을 천천히 넓혀서 더 많이 보여요
  B.spawnAcc += rate * (B.rush ? 1.3 : 1) * dt;
  while (B.spawnAcc >= 1 && B.foes.length < (B.rush ? 220 : 168)) { B.spawnAcc -= 1; const pool = ['jelly', 'jelly']; const ramp = Math.min(80, B.dur); if (B.floor >= 1 || B.t > ramp * 0.5) pool.push('ice'); if (B.floor >= 2 || B.t > ramp * 0.75) pool.push('cookie'); if (B.floor >= 1.4) pool.push('pop'); if (B.floor >= 2.2 && Math.random() < 0.3 && B.foes.reduce((n, f) => n + (f.type === 'ginger'), 0) < 4 + Math.floor(B.floor / 2)) pool.push('ginger'); if (B.floor >= 3.8 && Math.random() < 0.6) pool.push('churro'); if (B.floor >= 3 && Math.random() < 0.35 && B.foes.reduce((n, f) => n + (f.type === 'zip'), 0) < 3 + Math.floor(B.floor / 6)) pool.push('zip'); if (B.stageN >= 200) { if (Math.random() < 0.28 && B.foes.reduce((n, f) => n + (f.type === 'jumper'), 0) < 6) pool.push('jumper'); if (Math.random() < 0.28 && B.foes.reduce((n, f) => n + (f.type === 'pudding'), 0) < 8) pool.push('pudding'); }      /* 200스테이지부터 새 몬스터 */
    if (B.stageN > 100) { if (Math.random() < 0.3) pool.push('puff'); if (Math.random() < 0.3 && B.foes.reduce((n, f) => n + (f.type === 'bee'), 0) < 4 + Math.floor((B.stageN - 100) / 6)) pool.push('bee'); } const mi = ACTS[B.act].minion; if (mi && Math.random() < 0.07 && B.foes.reduce((n, f) => n + (f.minion ? 1 : 0), 0) < 2 + B.act) spawnRing(mi, true); else spawnRing(pick(pool)); }
  if (B.spawnAcc > 3) B.spawnAcc = 3;
  gimUpdate(dt);
  if (B.eliteAt > 0 && B.t >= B.eliteAt && !B.big) { B.big = spawnRing(ACTS[B.act].elite); bigIntro(); }
  if (B.bossAt > 0 && B.t >= B.bossAt && !B.big) { B.big = spawnRing(B.bigType || ACTS[B.act].boss); bigIntro(); }
  /* 적 움직임 */
  for (const f of B.foes) {
    if (f.dead) continue;
    if (f.flash > 0) f.flash -= dt;
    if (f.slow > 0) f.slow -= dt; if (f.stun > 0) f.stun -= dt;
    if (f.acid > 0) { f.acidT -= dt; if (f.acidT <= 0) { f.acidT = 0.5; const d = f.acid * 0.9; f.hp -= d * B.st.dmg; { const D = run.dmg || (run.dmg = {}); D.acid = (D.acid || 0) + d * B.st.dmg; if (f === B.big) D.acidBig = (D.acidBig || 0) + d * B.st.dmg; } f.acid = Math.max(0, f.acid - 0.5); textAdd(f.x, f.y - f.r, Math.round(d), '#7FA81E'); if (f.hp <= 0) { killFoe(f, null); continue; } } }
    let busy = false;
    if (f.type === 'boss') bossThink(f, dt); else if (f.type === 'boss2') boss2Think(f, dt); else if (f.type === 'boss3') busy = boss3Think(f, dt); else if (f.type === 'queen') busy = queenThink(f, dt); else if (f.type === 'donut') busy = eliteThink(f, dt); else if (f.type === 'golem') busy = golemThink(f, dt); else if (f.type === 'knight') busy = knightThink(f, dt); else if (FOES[f.type].ai) busy = foeAI(f, dt, FOES[f.type].ai);
    const dx = p.x - f.x, dy = p.y - f.y, m = Math.hypot(dx, dy) || 1;
    if (f.sq > 0) f.sq = Math.max(0, f.sq - dt * 3);
    if (f.kx || f.ky) { f.x += f.kx * dt; f.y += f.ky * dt; const dec = Math.exp(-dt * 11); f.kx *= dec; f.ky *= dec; if (Math.abs(f.kx) + Math.abs(f.ky) < 8) f.kx = f.ky = 0; }
    if (!busy && !(f.stun > 0)) { const sp = f.spd * (f.slow > 0 ? 0.55 : 1) * (f.kx || f.ky ? 0.25 : 1) * (f === B.big ? 1 : (B.fspK || 1) * (B.pulseK || 1) * (B.sugarK || 1)), dir = f.flee ? -1 : 1; f.x += dx / m * sp * dt * dir; f.y += dy / m * sp * dt * dir; }
    f.ph += dt * 7;
    if (m < f.r + HERO_R && !f.flee && !f.air) hurtPlayer(f.type);
    if (m > 900) { const a = Math.random() * 6.283, R = Math.hypot(vw, vh) / 2 + 40; f.x = p.x + Math.cos(a) * R; f.y = p.y + Math.sin(a) * R; }   // 너무 멀어지면 다시 근처로
  }
  /* 서로 겹치지 않게 살짝 밀어내요 */
  const F = B.foes;
  for (let i = 0; i < F.length; i++) { const a = F[i]; if (a.dead) continue; for (let j = i + 1; j < F.length; j++) { const b = F[j]; if (b.dead) continue; const dx = b.x - a.x; if (dx > 40 || dx < -40) continue; const dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy; if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2), push = (rr - d) * 0.5 / d, wa = a === B.big ? 0 : b === B.big ? 2 : 1; a.x -= dx * push * wa; a.y -= dy * push * wa; b.x += dx * push * (2 - wa); b.y += dy * push * (2 - wa); } } }
  if (p.reshield > 0) { p.reshield -= dt; if (p.reshield <= 0) { p.shield = true; if (!headless) { textAdd(p.x, p.y - 46, '방패 복구!', '#7FE3FF'); sfx.block(); } } }
  fireWeapons(dt); legUpdate(dt); updateLobs(dt); petUpdate(dt);
  /* 내 탄 */
  for (const s of B.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.boom) {            // 부메랑 꼬치: 반쯤 날아가면 나에게 돌아와요
      if (!s.back && s.life < 0.75) { s.back = true; s.hit = new Set(); }
      if (s.back) { const dx = p.x - s.x, dy = p.y - 10 - s.y, d = Math.hypot(dx, dy) || 1; s.vx += (dx / d * 520 - s.vx) * Math.min(1, dt * 6); s.vy += (dy / d * 520 - s.vy) * Math.min(1, dt * 6); s.a = Math.atan2(s.vy, s.vx); if (d < 22) s.life = 0; }
    }
    if (!s.counted) { s.counted = true; if (s.w && s.w.id) accFire(s.w.id); }
    for (const f of B.foes) { if (f.dead || s.hit.has(f)) continue; if ((f.x - s.x) ** 2 + (f.y - s.y) ** 2 < (f.r + s.r) ** 2) { if (!s.landed) { s.landed = true; if (s.w && s.w.id) accHit(s.w.id); } s.hit.add(f); if (s.chill) f.slow = Math.max(f.slow || 0, 1); if (s.acid) f.acid = Math.min(f.acid + s.acid, 14 + 5 * (s.w ? s.w.lv : 1)); /* 산성은 무한히 쌓이지 않아요 */ hurtFoe(f, s.dmg, s.w, s.vx, s.vy);
      if (s.puddle && B.zones.length < 24) B.zones.push({ x: f.x, y: f.y, r: 34, life: 2.5, tick: 0.2, dmg: s.dmg * 0.25, w: s.w, cream: true });
      if (s.bounce > 0) {   // 튕기는 별사탕: 가까운 다른 적에게
        let nb = null, nd = 170 * 170; for (const g of B.foes) { if (g.dead || s.hit.has(g) || g === f) continue; const d2 = (g.x - s.x) ** 2 + (g.y - s.y) ** 2; if (d2 < nd) { nd = d2; nb = g; } }
        if (nb) { s.bounce--; const dx = nb.x - s.x, dy = nb.y - s.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(s.vx, s.vy); s.vx = dx / d * sp; s.vy = dy / d * sp; s.life = Math.max(s.life, 0.6); s.trail = []; fxAdd({ k: 'flash', x: s.x, y: s.y, r: 12, life: 0.08, max: 0.08, col: '#FFE45C' }); break; }
      }
      if (s.pierce-- <= 0) { s.life = 0; break; } } }
  }
  B.shots = B.shots.filter(s => s.life > 0);
  /* 꿀 장판 */
  for (const z of B.zones) { if (z.follow) { z.x = p.x; z.y = p.y; } z.life -= dt; z.tick -= dt; if (z.tick <= 0) { z.tick = 0.5; B.legPet = !!z.pet; if (z.w && z.w.id === 'honey') accFire('honey'); let n = 0; for (const f of B.foes) if (!f.dead && (f.x - z.x) ** 2 + (f.y - z.y) ** 2 < (z.r + f.r) ** 2) { f.slow = 0.7; if (z.sticky) { f.hny = Math.min(8, (f.hny || 0) + 1); hurtFoe(f, z.dmg * (1 + 0.25 * (f.hny - 1)), z.w, 0.001, 0.001); } else hurtFoe(f, z.dmg, z.w, 0.001, 0.001); n++; } if (n && z.w && z.w.id === 'honey') accHit('honey'); } }
  for (const z of B.zones) if (z.sticky && z.life <= 0) { let n = 0; for (const f of B.foes) if (!f.dead && f.hny) { const k = f.hny; f.hny = 0; hurtFoe(f, z.pop * k, z.w, f.x - z.x, f.y - z.y, 0.3); if (!headless && n++ < 40) fxAdd({ k: 'ring', x: f.x, y: f.y, r: 8, to: 24 + k * 4, life: 0.3, max: 0.3, col: '#FFC23D', w: 4 }); } if (n && !headless) { B.shake = Math.max(B.shake, 0.4); burst(z.x, z.y, '#FFC23D', 14, 260); } }      /* 꿀 폭발: 꿀이 많이 묻은 적일수록 세게 */
  B.legPet = false; B.zones = B.zones.filter(z => z.life > 0);
  /* 적의 탄 */
  for (const s of B.foeShots) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 < (s.r + HERO_R * 0.85) ** 2) { hurtPlayer(s.gum ? 'gum' : 'shot'); s.life = 0; } }
  B.foeShots = B.foeShots.filter(s => s.life > 0);
  for (const t of B.telegraphs) t.life -= dt; B.telegraphs = B.telegraphs.filter(t => t.life > 0 && !(t.f && t.f.dead));
  B.foes = B.foes.filter(f => !f.dead);
  /* 보석 */
  const pr2 = B.st.pickup ** 2;
  for (const g of B.gems) {
    const dx = p.x - g.x, dy = p.y - g.y, d2 = dx * dx + dy * dy;
    g.px = g.x; g.py = g.y; g.ph += dt * 5;
    if (g.vz != null) { g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; g.vz -= 700 * dt; if (g.z <= 0) { if (g.vz < -120) { g.vz *= -0.35; g.z = 0.1; g.vx *= 0.5; g.vy *= 0.5; } else { g.z = 0; g.vz = null; } } continue; }
    if (!g.pull && d2 < pr2) { g.pull = true; g.sp = -120; }
    if (g.pull) {
      const d = Math.sqrt(d2) || 1; g.sp = Math.min(d > 400 ? 1600 : 900, g.sp + 1500 * dt);     // 살짝 튕겨 나갔다가 빨려 들어와요
      g.x += dx / d * g.sp * dt; g.y += dy / d * g.sp * dt;
      if (d < 18) { g.got = true; { const xv = g.v * B.st.xp * (1 + 0.12 * B.floor); B.xp += xv; B.xpTot = (B.xpTot || 0) + xv; } B.gemCombo = B.gemT > 0 ? B.gemCombo + 1 : 0; B.gemT = 0.5; sfx.gem(B.gemCombo); B.xpFlash = 0.25;
        fxAdd({ k: 'flash', x: p.x, y: p.y - 26, r: 12, life: 0.12, max: 0.12, col: g.gold ? '#FFF6C0' : g.v >= 5 ? '#FFC2DA' : g.v >= 2 ? '#C9F7B8' : '#BFE6FF' });
        if (Math.random() < 0.5) fxAdd({ k: 'star', x: p.x + rand(-16, 16), y: p.y - rand(20, 50), vx: rand(-30, 30), vy: -70, life: 0.45, max: 0.45, col: '#FFFFFF', r: 5 }); }
    }
  }
  B.gems = B.gems.filter(g => !g.got); if (B.gems.length > 220) B.gems.splice(0, B.gems.length - 220);
  if (B.gemT > 0) B.gemT -= dt; if (B.xpFlash > 0) B.xpFlash -= dt;
  /* 자석: 먹으면 화면 밖까지 모든 보석이 빨려 와요 */
  for (const m of B.magnets) { m.ph += dt * 5; if ((p.x - m.x) ** 2 + (p.y - m.y) ** 2 < 26 * 26) { m.got = true; for (const g of B.gems) { g.vz = null; g.z = 0; if (!g.pull) { g.pull = true; g.sp = 200; } } sfx.magnet(); if (!headless) { toast('자석! 보석이 전부 모여요'); fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 20, to: 260, life: 0.5, max: 0.5, col: '#FF4F6B', w: 6 }); fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 10, to: 200, life: 0.4, max: 0.4, col: '#FFFFFF', w: 4 }); } } }
  if (B.magnets.some(m => m.got)) B.magnets = B.magnets.filter(m => !m.got);
  /* 폭탄: 먹으면 보스만 빼고 모든 몬스터가 터져 사라져요 (경험치 보석은 그대로 나와요) */
  for (const m of B.bombs) { m.ph += dt * 5; if ((p.x - m.x) ** 2 + (p.y - m.y) ** 2 < 26 * 26) { m.got = true; bombBlast(); } }
  if (B.bombs.some(m => m.got)) B.bombs = B.bombs.filter(m => !m.got);
  /* 걸을 때 발밑 먼지 */
  if (p.moving && !headless) { B.dustT = (B.dustT || 0) - dt; if (B.dustT <= 0) { B.dustT = 0.16; fxAdd({ k: 'dot', x: p.x + rand(-6, 6), y: p.y + 2, vx: -p.dirX * 30 + rand(-15, 15), vy: rand(-30, -10), life: 0.4, max: 0.4, col: 'rgba(200,150,90,.55)', r: rand(3, 5) }); } }
  while (B.xp >= B.need && !B.over && !B.paused && !B.lvlPending) levelUp();
  /* 연출 */
  epicUpdate(dt);
  for (const f of B.fx) { f.life -= dt; if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.g) f.vy += f.g * dt; else { f.vx *= 0.9; f.vy *= 0.9; } } } B.fx = B.fx.filter(f => f.life > 0);
  for (const t of B.texts) { t.life -= dt; t.x += t.vx * dt; t.y += t.vy * dt; t.vy += 380 * dt; } B.texts = B.texts.filter(t => t.life > 0);
  if (B.shake > 0) B.shake -= dt; if (B.hsCool > 0) B.hsCool -= dt; if (B.heartPop > 0) B.heartPop -= dt;
  for (const s of B.shots) if (s.k !== 'skewer') { s.trail = s.trail || []; s.trail.push(s.x, s.y); if (s.trail.length > 10) s.trail.splice(0, 2); }
  if (!B.over && B.t >= B.dur) endBattle(true);
}
function bombBlast() {
  const p = B.p; B.noSplit = true; B.bombing = true; let n = 0;
  for (const f of B.foes.slice()) { if (f.dead || f === B.big || f.immortal || /^boss|queen/.test(f.type)) continue; f.hp = 0; killFoe(f, null); n++; }
  B.noSplit = false; B.bombing = false; B.telegraphs = B.telegraphs.filter(t => !(t.f && t.f.dead));
  if (!headless) { sfx.boom(); sfx.bigKill(); B.shake = Math.max(B.shake, 0.6); B.flashScr = { col: '255,240,200', t: 0.45, max: 0.45 }; B.hitstop = Math.max(B.hitstop, 0.1); toast(n ? `폭탄! 몬스터 ${n}마리가 사라졌어요` : '폭탄!'); for (const [r, w, c] of [[40, 8, '#FFFFFF'], [150, 7, '#FFD23F'], [330, 6, '#FF8A3D'], [560, 5, '#FF4F6B']]) fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 10, to: r, life: 0.5, max: 0.5, col: c, w }); burst(p.x, p.y - 20, '#FFD23F', 30, 420); }
}
function bigIntro() { if (!['donut', 'golem', 'knight'].includes(B.big.type) && !headless) music('boss'); toast(`${FOES[B.big.type].name} 등장!`); sfx.boss(); if (!headless) { $('#bossBar').hidden = false; $('#bossName').textContent = FOES[B.big.type].name; } }

/* 테스트와 구경용 자동 조종: 가까운 적과 위험 표시에서 멀어지고, 보석 쪽으로 살짝 끌려요 */
function autopilot() {
  const p = B.p; let x = 0, y = 0;
  if (G('mines')) { const ci = Math.floor(p.x / MINE_C), cj = Math.floor(p.y / MINE_C); for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) { if (B.mineOff.has(i + ',' + j)) continue; const m = minePos(i, j); if (!m) continue; const dx = p.x - m[0], dy = p.y - m[1], d = Math.hypot(dx, dy) || 1; if (d < 95) { x += dx / d * 3 * (95 - d) / 95; y += dy / d * 3 * (95 - d) / 95; } } }
  if (G('balls')) for (const o of B.balls) { const d = Math.hypot(o.rx, o.ry) || 1; if (d < 110) { x -= o.rx / d * 4 * (110 - d) / 110; y -= o.ry / d * 4 * (110 - d) / 110; } }
  if (G('shrink')) { const d = Math.hypot(p.x, p.y) || 1; if (d > B.shrinkR * 0.7) return [-p.x / d, -p.y / d]; }
  for (const f of B.foes) { const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy) || 1, reach = 120 + f.r; if (d < reach) { const k = (reach - d) / reach; x += dx / d * k * 2; y += dy / d * k * 2; } }
  for (const s of B.foeShots) { const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy) || 1; if (d < 110) { const sv = Math.hypot(s.vx, s.vy) || 1, side = (dx * -s.vy + dy * s.vx) / sv >= 0 ? 1 : -1; x += -s.vy / sv * side * 2.5 + dx / d; y += s.vx / sv * side * 2.5 + dy / d; } }
  for (const t of B.telegraphs) if (t.k === 'line') { const c = Math.cos(t.a), sn = Math.sin(t.a), rx = p.x - t.f.x, ry = p.y - t.f.y, along = rx * c + ry * sn, side = -rx * sn + ry * c; if (along > -30 && along < t.len + 60 && Math.abs(side) < (t.w || t.f.r) + 50) { const sg = side >= 0 ? 1 : -1; x += -sn * sg * 4; y += c * sg * 4; } }
  for (const s of B.foes) if ((s.type === 'donut' || s.type === 'churro' || s.type === 'bee' || (s.type === 'boss3' && s.dash)) && s.st === 2) { const c = Math.cos(s.da), sn = Math.sin(s.da), rx = p.x - s.x, ry = p.y - s.y, side = -rx * sn + ry * c; if (rx * c + ry * sn > 0 && Math.abs(side) < s.r + 50) { const sg = side >= 0 ? 1 : -1; x += -sn * sg * 4; y += c * sg * 4; } }
  for (const t of B.telegraphs) if (t.k === 'circle') { const dx = p.x - t.x, dy = p.y - t.y, d = Math.hypot(dx, dy) || 1; if (d < t.r + 30) { x += dx / d * 3; y += dy / d * 3; } }
  let g = null, gd = 300 * 300; for (const q of B.gems) { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < gd) { gd = d; g = q; } }
  if (g) { const dx = g.x - p.x, dy = g.y - p.y, d = Math.hypot(dx, dy) || 1; x += dx / d * 1.1; y += dy / d * 1.1; }
  if (B.magnets.length && B.gems.length > 12) { const mg = B.magnets.reduce((a, b) => (a.x - p.x) ** 2 + (a.y - p.y) ** 2 < (b.x - p.x) ** 2 + (b.y - p.y) ** 2 ? a : b), dx = mg.x - p.x, dy = mg.y - p.y, d = Math.hypot(dx, dy) || 1; x += dx / d * 1.5; y += dy / d * 1.5; }
  if (Math.hypot(x, y) < 0.05) { x = Math.cos(B.t * 0.7); y = Math.sin(B.t * 0.7); }
  return [x, y];
}

function endBattle(won) {
  if (B.over) return; B.over = true;
  const info = { won, kind: B.kind, floor: B.floor, bigDead: B.bigDead, kills: B.kills, time: B.t };
  const fin = () => { info.xpGot = Math.round(B.xpTot || 0); };
  run.hp = Math.max(won ? 1 : 0, Math.min(run.maxHp, B.p.hp));
  if (won) {      /* 끌려오던 보석(자석 포함)은 전투가 끝나도 전부 받아요. 넘친 경험치로 오른 레벨은 전투 뒤에 골라요 */
    const all = B.kind === 'boss' && B.bigDead;      /* 보스를 잡으면 바닥에 남은 보석도 전부 받아요 */
    for (const g of B.gems) if (g.pull || all) { const xv = g.v * B.st.xp * (1 + 0.12 * B.floor); B.xp += xv; B.xpTot = (B.xpTot || 0) + xv; }
    B.gems = B.gems.filter(g => !g.pull && !all);
    while (B.xp >= B.need) { B.xp -= B.need; B.lvl++; B.need = needOf(B.lvl); run.lvl = B.lvl; if (headless) applyLevel(rollLevelOpts()[0]); else run.picks = (run.picks || 0) + 1; }
  }
  run.kills = (run.kills || 0) + B.kills; run.lvl = B.lvl; run.xp = B.xp;
  const cb = B.onEnd;
  if (B.lvlPending) { run.picks = (run.picks || 0) + 1; B.lvlPending = false; B.lvlLost = true; }
  fin(); if (headless) { B.result = info; return; }
  if (won) sfx.win(); else sfx.lose();
  setTimeout(() => { B = null; ZOOM = 1; cb(info); }, 900);
}

/* ───── 그리기: 낮은 해상도로 그린 뒤 크게 키우는 픽셀 화면. 화면 1칸 = 게임 속 길이 2 ───── */
const Q = 2;      /* 화면 픽셀 밀도: 낮은 해상도 1칸을 2×2 픽셀로 더 촘촘하게 그려요 */
const WP = 2, BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], INK = '#1A0E22';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
let pcx = 0, pcy = 0;
const X = v => Math.round(v / WP * Q) / Q - pcx, Y = v => Math.round(v / WP * Q) / Q - pcy;      /* 반 칸 단위로 움직여서 더 부드러워요 */
const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const backOut = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
/* 점을 섞어 찍은 타원 (빛, 장판, 기운). 한 번 만들면 다시 써요 */
const discs = new Map();
function dDisc(rx, ry, col, dens) {
  const key = rx + ',' + ry + col + dens; let c = discs.get(key); if (c) return c;
  const RX = rx * Q, RY = ry * Q; c = mk(RX * 2 + 1, RY * 2 + 1); const q = c.getContext('2d'); q.fillStyle = col; rx = RX; ry = RY;
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) { const d = (i * i) / (rx * rx) + (j * j) / (ry * ry); if (d <= 1 && BAYER[((j + 64) & 3) * 4 + ((i + 64) & 3)] < dens * (d > 0.6 ? 1 - (d - 0.6) * 1.6 : 1)) q.fillRect(i + rx, j + ry, 1, 1); }
  if (discs.size > 300) discs.clear(); discs.set(key, c); return c;
}
const putDisc = (x, y, rx, ry, col, dens) => { rx = Math.max(1, Math.round(rx)); ry = Math.max(1, Math.round(ry)); const c = dDisc(rx, ry, col, dens); ctx.drawImage(c, x - rx - 0.5 / Q, y - ry - 0.5 / Q, c.width / Q, c.height / Q); };
/* 동그라미·원은 크기와 색마다 한 번만 찍어 두고 도장처럼 붙여요 (그림은 똑같고 훨씬 가벼워요) */
const STAMP = new Map();
function stamp(key, S, paint) {
  let c = STAMP.get(key); if (c) return c; if (STAMP.size > 600) STAMP.clear();
  c = mk(Math.ceil(S * Q), Math.ceil(S * Q)); const q = c.getContext('2d'); q.setTransform(Q, 0, 0, Q, 0, 0); paint(q, S / 2 - 0.5); STAMP.set(key, c); return c;
}
function pdisc(x, y, r, col) {      /* 반 칸 줄로 찍어서 동그라미가 매끈해요 */
  if (r <= 0) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); return; } const S = Math.ceil(r) * 2 + 2;
  ctx.drawImage(stamp('d' + r + col, S, (q, cx) => { q.fillStyle = col; const H = 1 / Q, rr = (r + 0.5) * (r + 0.5); for (let j = -r - 0.5 + H / 2; j <= r + 0.5; j += H) { const w = Math.floor(Math.sqrt(Math.max(0, rr - j * j)) * Q) / Q; if (w > 0) q.fillRect(cx + 0.5 - w, cx + 0.5 + j - H / 2, w * 2, H); } }), x - (S / 2 - 0.5), y - (S / 2 - 0.5), S, S);
}
function pcircle(x, y, r, col, t = 1) {      /* 반 칸 간격으로 찍는 원 */
  const S = Math.ceil(r) * 2 + Math.ceil(t) * 2 + 2;
  ctx.drawImage(stamp('c' + r + col + t, S, (q, cx) => { q.fillStyle = col; const H = 1 / Q, R2 = Math.max(1, Math.round(r * Q)); let i = R2, j = 0, e = 1 - R2; const o = (t - H) / 2;
    while (i >= j) { for (const [a, b] of [[i, j], [j, i], [-i, j], [-j, i], [i, -j], [j, -i], [-i, -j], [-j, -i]]) q.fillRect(cx + 0.5 + a * H - o - H / 2, cx + 0.5 + b * H - o - H / 2, t, t); j++; if (e < 0) e += 2 * j + 1; else { i--; e += 2 * (j - i) + 1; } } }), x - (S / 2 - 0.5), y - (S / 2 - 0.5), S, S);
}
function pline(x0, y0, x1, y1, col, t = 1) {      /* 점들을 한 번에 칠해요 */
  ctx.fillStyle = col; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 0.5) * Q; ctx.beginPath();
  for (let i = 0; i <= n; i++) ctx.rect(Math.round((x0 + (x1 - x0) * i / n) * Q) / Q, Math.round((y0 + (y1 - y0) * i / n) * Q) / Q, t, t);
  ctx.fill();
}
function pstar(x, y, s, col) { ctx.fillStyle = col; const h = 1 / Q; ctx.fillRect(x - s, y + 0.5 - h / 2, s * 2 + 1, h); ctx.fillRect(x + 0.5 - h / 2, y - s, h, s * 2 + 1); ctx.fillRect(x, y, 1, 1); }      /* 반 칸 굵기의 가는 반짝임 */
/* 바닥: 초콜릿 타일 무늬를 한 번 그려 두고 이어 붙여요 */
/* 막마다 바닥 색이 달라요: 1막 초콜릿, 2막 얼음 민트, 3막 달궈진 오븐 */
const FLOOR_PAL = [null, ['#3A2030', '#43263A', '#2A1424', '#5A3450'], ['#1F3A4A', '#24465A', '#12222E', '#3E6E86'], ['#3E1A14', '#4A2218', '#1E0A08', '#7A3A20'], ['#2C2452', '#342B60', '#1A1538', '#5E50A8']];      /* 4막: 별빛 마카롱 궁전 */
const FLOORS = FLOOR_PAL.map(pal => {
  if (!pal) return null;
  const c = mk(64 * Q, 64 * Q), q = c.getContext('2d'), r = (col, x, y, w, h) => { q.fillStyle = col; q.fillRect(x * Q, y * Q, w * Q, h * Q); }, h = 1 / Q;      /* 2배 촘촘한 바닥: 반 칸 테두리와 빛 */
  for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) { const x = gx * 16, y = gy * 16; r((gx + gy) & 1 ? pal[0] : pal[1], x, y, 16, 16); r(pal[2], x, y + 15, 16, 1); r(pal[2], x + 15, y, 1, 16); r(pal[3], x + 0.5, y + 0.5, 15, h); r(pal[3], x + 0.5, y + 0.5, h, 14.5); r(pal[3], x + 1, y + 1, 3.5, h); r(pal[3], x + 1, y + 1.5, h, 2); q.globalAlpha = 0.35; r(pal[2], x + 14.5, y + 1, h, 14); r(pal[2], x + 1, y + 14.5, 14, h); q.globalAlpha = 1; }
  [[20, 10], [56, 36], [4, 30], [36, 52]].forEach(([x, y]) => { r(pal[2], x, y, 3, h); r(pal[2], x + 2.5, y + 0.5, 1.5, h); r(pal[2], x + 3.5, y + 1, 1, h); });
  return c;
});
/* 경험치 보석과 마카롱: 작은 픽셀 그림 */
function gemSprite(w, h, col, light, dark) {
  const c = mk(w * 2 + 3, h * 2 + 3), q = c.getContext('2d'), inside = (i, j) => Math.abs(i) * h + Math.abs(j) * w <= w * h;
  for (let j = -h - 1; j <= h + 1; j++) for (let i = -w - 1; i <= w + 1; i++) {
    if (inside(i, j)) q.fillStyle = i < 0 && j <= 0 ? light : i > 0 && j >= 0 ? dark : col;
    else if (inside(i - 1, j) || inside(i + 1, j) || inside(i, j - 1) || inside(i, j + 1)) q.fillStyle = INK; else continue;
    q.fillRect(i + w + 1, j + h + 1, 1, 1);
  }
  q.fillStyle = '#FFFFFF'; q.fillRect(w, h - Math.ceil(h / 2), 1, 1); return c;
}
const GEM = { s: gemSprite(2, 3, '#59B8FF', '#CFEFFF', '#2C7FC4'), m: gemSprite(3, 4, '#5CD66A', '#D9FFD0', '#2E9A3C'), l: gemSprite(4, 5, '#FF5C9E', '#FFD0E4', '#C92E6E'), y: gemSprite(4, 5, '#FFD23F', '#FFF6C0', '#C98A00') };
const GEM_COL = { s: '#59B8FF', m: '#5CD66A', l: '#FF5C9E', y: '#FFD23F' };
const gemKey = (v, yel) => yel ? 'y' : v >= 5 ? 'l' : v >= 2 ? 'm' : 's';     /* 노란 보석은 엘리트가 떨어뜨려요 */
const MAC = (() => { const c = mk(9, 8), q = c.getContext('2d'), r = (col, x, y, w, h) => { q.fillStyle = col; q.fillRect(x, y, w, h); }; r(INK, 1, 0, 7, 8); r(INK, 0, 1, 9, 6); r('#FF8FB8', 2, 1, 5, 1); r('#FF8FB8', 1, 2, 7, 1); r('#FFD0E2', 2, 2, 2, 1); r('#FFF3E0', 1, 3, 7, 2); r('#FF8FB8', 1, 5, 7, 1); r('#D9578A', 2, 6, 5, 1); return c; })();
let VIG = null;
function vignette() { if (VIG && VIG.width === lw && VIG.height === lh) return VIG; VIG = mk(lw, lh); const q = VIG.getContext('2d'); q.fillStyle = 'rgba(14,6,20,.6)'; for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) { const dx = (x - lw / 2) / (lw / 2), dy = (y - lh / 2) / (lh / 2), d = dx * dx + dy * dy; if (d > 0.9 && (d - 0.9) * 22 > BAYER[(y & 3) * 4 + (x & 3)]) q.fillRect(x, y, 1, 1); } return VIG; }
function spr(name, wx, wy, flip, white, lift = 0, fr = -1) {
  const s = (B && B.act > 1 && name !== 'hero' && IMG[name + '@' + B.act]) || IMG[name]; if (!s) return; const im = fr >= 0 && s.frames ? (white ? s.whites : s.frames)[fr % s.frames.length] : white ? s.white : s.im, k = s.k || 1, w = im.width / k, h = im.height / k, x = X(wx), y = Y(wy) - lift, hw = Math.round(w / 2 * Q) / Q;
  if (flip < 0) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(im, -hw, y - h, w, h); ctx.scale(-1, 1); ctx.translate(-x, 0); } else ctx.drawImage(im, x - hw, y - h, w, h);      /* 뒤집고 바로 되돌려요 (save/restore보다 가벼워요) */
}
/* 촘촘한 작은 그림: 2배 해상도로 한 번 찍어 두고 다시 써요. f(x, y)는 가운데 기준 좌표(칸)를 받아 색을 돌려줘요. 바깥에 반 칸 테두리 */
const HSPR = new Map();
function hiSpr(key, w, h, f, ink = INK) {
  let c = HSPR.get(key); if (c) return c; const W = Math.ceil(w * Q), H = Math.ceil(h * Q); w = W / Q; h = H / Q; c = mk(W, H); const q = c.getContext('2d'), fill = new Array(W * H).fill(null);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) fill[j * W + i] = f((i + 0.5) / Q - w / 2, (j + 0.5) / Q - h / 2);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const v = fill[j * W + i]; if (v) { q.fillStyle = v; q.fillRect(i, j, 1, 1); } else if (ink && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const x = i + a, y = j + b; return x >= 0 && y >= 0 && x < W && y < H && fill[y * W + x]; })) { q.fillStyle = ink; q.fillRect(i, j, 1, 1); } }
  HSPR.set(key, c); return c;
}
const putHi = (c, x, y, flip) => { const w = c.width / Q, h = c.height / Q; ctx.drawImage(c, Math.round((x - w / 2) * Q) / Q, Math.round((y - h / 2) * Q) / Q, w, h); };
const ball = (r, c0, c1, c2) => (x, y) => { const d = x * x + y * y; if (d > r * r) return null; const l = (x + y) / r; return d < (r * 0.35) ** 2 && x < 0 && y < 0 ? '#FFFFFF' : l < -0.55 ? c0 : l > 0.45 ? c2 : c1; };
const starPt = (r, rot) => (x, y) => { const a = Math.atan2(y, x) - rot, d = Math.hypot(x, y), k = ((a % (Math.PI * 0.4)) + Math.PI * 0.4) % (Math.PI * 0.4) / (Math.PI * 0.4), lim = r * (0.48 + 0.52 * Math.abs(1 - 2 * k) ** 1.6); if (d > lim) return null; return d < r * 0.25 ? '#FFFFFF' : (x + y < 0 ? '#FFF3B0' : y > r * 0.25 ? '#E0A000' : '#FFD23F'); };
const SHOT_COL = { cream: '#FFFFFF', lemon: '#F4E04D', star: '#FFD86B', shard: '#C9B6FF' };
/* 주인공 그리기 (전설 스킬 이펙트 위에도 한 번 더 그려요) */
const LSNAP = mk(1, 1);
function drawHeroLayer() {
  const p = B.p;
      const px = X(p.x), py = Y(p.y);
      if (IMG.hero && IMG.hero.aura) { const pu = 1 + 0.12 * Math.sin(B.t * 5); putDisc(px, py + 1, Math.round(17 * pu), Math.round(7 * pu), IMG.hero.aura, 9); if (IMG.hero.auraG >= 4 && Math.floor(B.t * 8) % 2) pstar(px + Math.round(Math.sin(B.t * 3) * 14), py - 14 - Math.round((B.t * 18) % 22), 1, '#FFFFFF'); }
      putDisc(px, py + 1, 10, 4, '#8A5A7A', 6); R('rgba(14,6,20,.55)', px - 4, py, 8, 2); R('rgba(14,6,20,.55)', px - 3, py + 2, 6, 1);
      if (B.rv) { const t = B.rv.t, fall = t < 0.6 ? (t / 0.6) ** 2 : t < 1.4 ? 1 : Math.max(0, 1 - (t - 1.4) / 0.55), a = fall * 1.5708 * (p.face || 1);      /* 쓰러졌다가 빛 속에서 일어나요 */
        ctx.save(); ctx.translate(px, py + 6); ctx.rotate(a); ctx.translate(-px, -py - 6); spr('hero', p.x, p.y + 6, p.face, t < 0.12 || (t > 1.85 && t < 2.2 && Math.floor(t * 20) % 2), 0, 3); ctx.restore(); }
      else if (!(p.inv > 0 && Math.floor(p.inv * 14) % 2)) spr('hero', p.x, p.y + 6, p.face, false, 0, p.moving ? Math.floor(p.bob / 1.6) % 4 : (Math.floor(B.t * 1.6) % 2 ? 4 : 3));
      if (p.shield) pcircle(px, py - 7, 12, Math.floor(B.t * 6) % 2 ? '#7FE3FF' : '#FFFFFF');
}
function drawFoeShots() {
  for (const s of B.foeShots) { const sx = X(s.x), sy = Y(s.y), pu = Math.floor(B.t * 8 + s.x) % 2; putDisc(sx, sy, pu ? 7 : 6, pu ? 7 : 6, '#FF2E4D', 6); putHi(hiSpr('foeShot' + pu, 11, 11, (x, y) => { const r = pu ? 4.4 : 4, d = Math.hypot(x, y); if (d > r) return null; return d < 1.2 && x + y < 0.5 ? '#FFFFFF' : d < r * 0.55 ? '#FFB0BE' : x + y > r * 0.5 ? '#B8102E' : '#FF2E4D'; }), sx, sy); }
}
function draw() {
  const p = B.p;
  ctx.setTransform(Q, 0, 0, Q, 0, 0); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
  const sk = B.shake > 0 ? Math.min(1, B.shake * 3) * 4 * LVK[shkLv()] : 0;
  pcx = Math.round(((p.x - vw / 2) / WP + rand(-sk, sk)) * Q) / Q; pcy = Math.round(((p.y - vh * 0.48) / WP + rand(-sk, sk)) * Q) / Q;
  /* 바닥 */
  for (let y = -(((pcy % 64) + 64) % 64); y < lh; y += 64) for (let x = -(((pcx % 64) + 64) % 64); x < lw; x += 64) ctx.drawImage(FLOORS[B.act] || FLOORS[1], x, y, 64, 64);
  /* 꿀 장판, 크림 웅덩이 */
  for (const z of B.zones) { const r = Math.round(z.r / WP), honey = !z.fire && !z.cream, col = z.fire ? (Math.floor(B.t * 4) % 2 ? '#FF7A3D' : '#F09030') : z.cream ? '#FFF3E6' : '#D9962A'; if (z.life < 0.5 && Math.floor(B.t * 14) % 2) continue;
    /* 꿀은 눈이 아프지 않게: 어두운 호박색을 성기게 찍고 테두리로 범위를 알려 줘요 */
    const zx = honey ? Math.round(z.x / WP / 4) * 4 - pcx : X(z.x), zy = honey ? Math.round(z.y / WP / 4) * 4 - pcy : Y(z.y);      /* 무늬를 바닥에 맞춰서 겹쳐도 진해지지 않아요 */
    putDisc(zx, zy, r, Math.round(r * 0.8), col, honey ? 3 : z.fire ? 5 : 9); if (honey && z.follow) pcircle(zx, zy, r, '#E8B84A');
    if (z.leg && honey) { const hs = 12, rr2 = r * 0.82;      /* 전설 꿀 바다: 벌집 무늬, 보글거리는 꿀, 꿀벌 */
      for (let gy = -rr2; gy <= rr2; gy += hs * 0.87) for (let gx = -rr2; gx <= rr2; gx += hs * 1.5) { const ox = gx + ((Math.round(gy / (hs * 0.87)) & 1) ? hs * 0.75 : 0), oy = gy; if ((ox / r) ** 2 + (oy / (r * 0.8)) ** 2 > 0.62) continue; const cx2 = Math.round(zx + ox), cy2 = Math.round(zy + oy * 0.8), hw = hs >> 1; pline(cx2 - hw, cy2, cx2 - (hw >> 1), cy2 - 4, '#E8B84A'); pline(cx2 - (hw >> 1), cy2 - 4, cx2 + (hw >> 1), cy2 - 4, '#E8B84A'); pline(cx2 + (hw >> 1), cy2 - 4, cx2 + hw, cy2, '#E8B84A'); pline(cx2 - hw, cy2, cx2 - (hw >> 1), cy2 + 4, '#E8B84A'); pline(cx2 - (hw >> 1), cy2 + 4, cx2 + (hw >> 1), cy2 + 4, '#E8B84A'); pline(cx2 + (hw >> 1), cy2 + 4, cx2 + hw, cy2, '#E8B84A'); }
      for (let i = 0; i < 6; i++) { const q = (B.t * 0.9 + i * 0.37) % 1, a = i * 1.7, d = r * 0.5 * ((i * 0.31) % 1 + 0.2); if (q < 0.8) pcircle(Math.round(zx + Math.cos(a) * d), Math.round(zy + Math.sin(a) * d * 0.7), Math.max(1, Math.round(q * 4)), '#FFE9A8'); else pstar(Math.round(zx + Math.cos(a) * d), Math.round(zy + Math.sin(a) * d * 0.7), 2, '#FFF3C0'); }
      for (let i = 0; i < 4; i++) { const a = B.t * (1.2 + i * 0.25) + i * 1.6; bee(zx + Math.cos(a) * r * 0.7, zy - 8 + Math.sin(a * 1.6) * r * 0.45, B.t + i, Math.sin(a + 1.57) > 0 ? -1 : 1); } }
    if (z.leg && z.fire) { for (let i = 0; i < 7; i++) { const q = (B.t * 1.1 + i * 0.29) % 1, a = i * 0.9, d = r * 0.55 * ((i * 0.43) % 1 + 0.15), bx3 = Math.round(zx + Math.cos(a) * d), by3 = Math.round(zy + Math.sin(a) * d * 0.7); if (q < 0.75) { pdisc(bx3, by3, Math.max(1, Math.round(q * 4)) + 1, '#3A1E0E'); pdisc(bx3, by3 - 1, Math.max(1, Math.round(q * 4)), '#8A5230'); R('#C08A5A', bx3 - 1, by3 - 2, 1, 1); } else R('#C08A5A', bx3, by3 - 4, 1, 1); }      /* 녹은 초코가 보글보글 */
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + B.t * 0.4, mx2 = Math.round(zx + Math.cos(a) * r * 0.35), my2 = Math.round(zy + Math.sin(a) * r * 0.25 + Math.sin(B.t * 3 + i) * 1.5); R(INK, mx2 - 4, my2 - 4, 9, 8); R('#FFFFFF', mx2 - 3, my2 - 3, 7, 6); R(i === 1 ? '#FFC9E4' : '#FFF3E6', mx2 - 3, my2 - 3, 7, 2); R('#E0D6C8', mx2 - 3, my2 + 2, 7, 1); } } }      /* 둥둥 뜬 마시멜로 */
  gimGround();
  /* 위험 예고 */
  for (const t of B.telegraphs) {
    const k = 1 - t.life / t.max, on = Math.floor(B.t * 10) % 2;
    if (t.k === 'circle') { const r = Math.round(t.r / WP); putDisc(X(t.x), Y(t.y), r, r, '#FF3B5C', 5); pcircle(X(t.x), Y(t.y), r, on ? '#FF3B5C' : '#FFD86B'); pcircle(X(t.x), Y(t.y), Math.round(r * k), '#FF3B5C'); }
    else if (t.k === 'ring') pcircle(X(t.f.x), Y(t.f.y), Math.round((t.r + k * 30) / WP), on ? '#FF3B5C' : '#FFD86B');
    else { const c = Math.cos(t.a), s = Math.sin(t.a), w = (t.w || t.f.r) / WP; for (const side of [-1, 1]) pline(X(t.f.x) - s * w * side, Y(t.f.y) + c * w * side, X(t.f.x + c * t.len) - s * w * side, Y(t.f.y + s * t.len) + c * w * side, on ? '#FF3B5C' : '#FFD86B'); for (let d = (B.t * 80) % 16; d < t.len; d += 16) R('#FF3B5C', X(t.f.x + c * d), Y(t.f.y + s * d), 2, 2); }
  }
  /* 보석 */
  for (const g of B.gems) {
    const key = gemKey(g.v, g.gold), G = GEM[key], bob = g.pull ? 0 : Math.round(Math.sin(g.ph) * 1.2 + 1.5), z = Math.round((g.z || 0) / WP) + bob, gx = X(g.x), gy = Y(g.y);
    R('rgba(14,6,20,.45)', gx - 2, gy + 2, 4, 1);
    if (g.pull) { ctx.globalAlpha = 0.6; R(GEM_COL[key], X(g.px - (g.x - g.px)), Y(g.py - (g.y - g.py)) - z, 2, 2); R(GEM_COL[key], X(g.px), Y(g.py) - z, 2, 2); ctx.globalAlpha = 1; }
    ctx.drawImage(scale2x(G), gx - (G.width >> 1), gy - z - (G.height >> 1), G.width, G.height);
    if (Math.sin(g.ph * 0.7 + g.x) > 0.95) pstar(gx + 2, gy - z - 3, 1, '#FFFFFF');
  }
  /* 자석 아이템 */
  for (const m of B.magnets) { const mx = X(m.x), my = Y(m.y) - 3 - Math.round(Math.abs(Math.sin(m.ph)) * 3), big = Math.floor(B.t * 4) % 2;
    putDisc(mx, my, big ? 11 : 9, big ? 8 : 6, '#FF4F6B', 6); R('rgba(14,6,20,.5)', mx - 4, Y(m.y) + 2, 8, 1);
    R(INK, mx - 6, my - 6, 13, 12); R('#E8323C', mx - 5, my - 5, 11, 9); R(INK, mx - 2, my - 5, 5, 6); R('#DDE3EA', mx - 5, my + 2, 3, 2); R('#DDE3EA', mx + 3, my + 2, 3, 2); R('#FF9AA6', mx - 4, my - 4, 2, 1);
    if (big) pstar(mx + 6, my - 7, 2, '#FFFFFF'); }
  /* 폭탄 아이템 */
  for (const m of B.bombs) { const bx = X(m.x), by = Y(m.y) - 4 - Math.round(Math.abs(Math.sin(m.ph)) * 3), blink = Math.floor(B.t * 6) % 2;
    putDisc(bx, by, blink ? 11 : 9, blink ? 9 : 7, '#FFB02E', 6); R('rgba(14,6,20,.5)', bx - 4, Y(m.y) + 2, 8, 1);
    pdisc(bx, by + 1, 6, INK); pdisc(bx, by + 1, 5, '#3A3550'); R('#6A6890', bx - 3, by - 2, 2, 2); R(INK, bx + 2, by - 7, 2, 3); R('#C98A3C', bx + 1, by - 8, 2, 2); R(blink ? '#FFFFFF' : '#FFD23F', bx + 3, by - 10, 2, 2); if (blink) pstar(bx + 4, by - 10, 2, '#FFE066'); }
  /* 적과 나를 아래쪽에 있는 것부터 겹쳐 그려요 */
  const list = B.foes.slice(); list.push(p); list.sort((a, b) => a.y - b.y);
  for (const o of list) {
    if (o === p) {
      drawHeroLayer();
    } else {
      const d = FOES[o.type], age = B.t - (o.born || 0), ox = X(o.x), oy = Y(o.y), rr = Math.round(o.r / WP);
      if (o === B.big) putDisc(ox, oy, Math.round(rr * 2.2), Math.round(rr * 1.6), '#C77DFF', Math.floor(B.t * 5) % 2 ? 4 : 3);
      R('rgba(140,12,44,.55)', ox - rr, oy + Math.round(rr * 0.6), rr * 2, 2);     // 적 발밑은 붉은 그림자
      if (o !== B.big && o.hp < o.max && o.max > 25) { const bw = rr * 2; R(INK, ox - rr - 1, oy + rr + 2, bw + 2, 3); R('#FF4F6B', ox - rr, oy + rr + 3, Math.max(0, Math.round(bw * o.hp / o.max)), 1); }
      const up = Math.sin(o.ph) > 0, hop = (o.type === 'jelly' && up ? 2 : 0) + (o.sq > 0.15 ? 1 : 0);
      if (o.immortal) putDisc(ox, oy - 6, 14, 14, '#7A3FC0', Math.floor(B.t * 8) % 2 ? 9 : 6);
      if (o.gold) putDisc(ox, oy - 6, 13, 13, '#FFD23F', Math.floor(B.t * 6) % 2 ? 7 : 5);
      if (o.coat > 0) putDisc(ox, oy - 6, 12, 12, '#EAF6FF', Math.floor(B.t * 5 + o.x) % 2 ? 8 : 5);      /* 설탕 코팅: 하얗게 반짝여요 */
      if (B.ghostA != null && o !== B.big) ctx.globalAlpha = B.ghostA;
      if (o.sc) { const gx = X(o.x), gy = Y(o.y + o.r * 0.7 - (o.zh || 0)); ctx.save(); ctx.translate(gx, gy); ctx.scale(o.sc, o.sc); ctx.translate(-gx, -gy); spr(d.img, o.x + (o.sq > 0.2 ? rand(-2, 2) : 0), o.y + o.r * 0.7 - (o.zh || 0), o.x > p.x ? -1 : 1, o.flash > 0 || age < 0.08, hop, up || o.sq > 0.2 ? 0 : 1); ctx.restore(); } else spr(d.img, o.x + (o.sq > 0.2 ? rand(-2, 2) : 0), o.y + o.r * 0.7 - (o.zh || 0), o.x > p.x ? -1 : 1, o.flash > 0 || age < 0.08, hop, up || o.sq > 0.2 ? 0 : 1);
      ctx.globalAlpha = 1;
      if (o.acid > 0) { R(INK, ox + rr - 1, oy - Math.round(d.h * 0.3) - 1, 4, 4); R('#B9F03E', ox + rr, oy - Math.round(d.h * 0.3), 2, 2); }
    }
  }
  /* 무기 */
  for (const w of B.weapons) if (w.id === 'macaron' && w.orbs) for (const [ox, oy] of w.orbs) { if (w.lv >= 10) putDisc(X(ox), Y(oy), 7, 7, '#FFD86B', Math.round(4 + 8 * (1 - Math.max(0, w.burstT) / 2.5))); ctx.drawImage(MAC, X(ox) - 4, Y(oy) - 4); }
  for (const P of B.pets || []) { const sp = petSpr(P.id), px = X(P.x), py = Y(P.y) - Math.round(Math.abs(Math.sin(P.t * 5)) * 2); R('rgba(14,6,20,.4)', px - 3, Y(P.y) + 6, 6, 1); const hs = sp, pw = sp.width / (sp.k || 1), ph = sp.height / (sp.k || 1); if (P.x > B.p.x) { ctx.save(); ctx.translate(px, 0); ctx.scale(-1, 1); ctx.drawImage(hs, -pw / 2, py - ph / 2, pw, ph); ctx.restore(); } else ctx.drawImage(hs, px - pw / 2, py - ph / 2, pw, ph); }
  for (const s of B.shots) {
    const sx = X(s.x), sy = Y(s.y);
    if (s.k === 'skewer') {
      const a = s.aw ? B.t * 18 : s.a, c = Math.cos(a), sn = Math.sin(a);
      if (!s.aw) for (let i = 1; i <= 4; i++) { ctx.globalAlpha = 0.5 - i * 0.1; R('#FFFFFF', Math.round(sx - c * (8 + i * 4)), Math.round(sy - sn * (8 + i * 4)), 2, 2); } ctx.globalAlpha = 1;
      pline(Math.round(sx - c * 9), Math.round(sy - sn * 9), Math.round(sx + c * 10), Math.round(sy + sn * 10), s.aw ? '#FFD86B' : '#D9A066');
      [['#FF7A80', '#E8323C', '#9C1E2C'], ['#E6F58A', '#B9DD52', '#6E9A1E'], ['#FFC870', '#FF9A1F', '#B8601A']].forEach((cs, i) => putHi(hiSpr('fruit' + i + (s.r > 10 ? 'b' : ''), s.r > 10 ? 8 : 6, s.r > 10 ? 8 : 6, ball(s.r > 10 ? 3.4 : 2.6, ...cs)), sx + c * (-5 + i * 5), sy + sn * (-5 + i * 5)));
      continue;
    }
    const col = SHOT_COL[s.k] || '#FFFFFF', t = s.trail;
    putDisc(sx, sy, 4, 4, '#FFF3D6', 4);
    if (t) for (let i = Math.max(0, t.length - 6); i < t.length; i += 2) { ctx.globalAlpha = 0.25 + 0.12 * (i - t.length + 6); R(s.aw ? '#FFD86B' : col, X(t[i]), Y(t[i + 1]), 1, 1); } ctx.globalAlpha = 1;
    if (s.k === 'star') { const rs = s.big ? 5 : 3.6, rot = Math.floor((B.t * 10 + s.x) % 8); putHi(hiSpr('star' + rs + '-' + rot, rs * 2 + 2, rs * 2 + 2, starPt(rs, rot * Math.PI * 0.05)), sx, sy); }
    else if (s.k === 'lemon') putHi(hiSpr('lemonShot', 7, 7, (x, y) => { const d = Math.hypot(x, y); if (d > 2.9) return null; if (d > 2.3) return '#E0C81E'; if (d < 0.5) return '#FFFBD0'; const a = Math.atan2(y, x); return Math.abs(Math.sin(a * 3)) < 0.18 ? '#FFFBD0' : x + y < -1 ? '#FFF7A0' : '#F4E04D'; }), sx, sy);
    else putHi(hiSpr('creamShot' + (s.r > 9 ? 'b' : ''), s.r > 9 ? 9 : 7, s.r > 9 ? 9 : 7, (x, y) => { const r = s.r > 9 ? 3.8 : 2.9, d = Math.hypot(x, y + Math.max(0, -y) * 0.25); if (d > r) return null; const sw = Math.sin(Math.atan2(y, x) * 2 + d * 1.6); return d < r * 0.3 && x < 0 ? '#FFFFFF' : sw > 0.6 ? '#FFD9E6' : x + y > r * 0.6 ? '#F3D8E0' : '#FFFFFF'; }), sx, sy);
  }
  drawFoeShots();
  /* 던진 초코 폭탄, 떨어지는 지팡이 사탕 */
  for (const L of B.lobs) {
    const k = Math.max(0, Math.min(1, L.t / L.dur)), tx0 = X(L.x), ty0 = Y(L.y);
    if (L.k === 'bomb') {
      const bx = Math.round(X(L.x0) + (tx0 - X(L.x0)) * k), by = Math.round(Y(L.y0) + (ty0 - Y(L.y0)) * k - Math.sin(k * Math.PI) * 26), s2 = L.mini ? 2 : 3;
      R('rgba(14,6,20,.5)', tx0 - 3, ty0 + 1, 6, 1); pcircle(tx0, ty0, Math.round(L.r / WP * k), 'rgba(255,107,61,.5)');
      putHi(hiSpr('bomb' + s2, s2 * 2 + 3, s2 * 2 + 4, (x, y) => { const r = s2 + 0.6, yy = y - 0.5; if (y < -r - 0.2 && Math.abs(x - 0.6) < 0.4) return '#C9A06A'; const d = Math.hypot(x, yy); if (d > r) return null; return d < r * 0.38 && x + yy < -0.3 ? '#D9A066' : x + yy > r * 0.5 ? '#3E1E0A' : '#6B3A1E'; }), bx + 0.5, by); if (Math.floor(B.t * 20) % 2) pstar(bx + 1, by - s2 - 2, 1, '#FFD23F');
    } else {
      if (L.t < 0) continue;
      const r = Math.round(L.r / WP); pcircle(tx0, ty0, Math.max(1, Math.round(r * (0.4 + 0.6 * k))), k > 0.7 ? '#FFFFFF' : '#FF8FA8');
      const cy0 = Math.round(ty0 - 90 * (1 - k)), sx = tx0;
      putHi(hiSpr('caneFall', 9, 24, (x, y) => { const sh = (y + 12), stripe = Math.floor((sh * 1.4 + x * 1.4) / 1.6) % 2 ? '#E8323C' : '#FFFFFF'; if (y > -7 && Math.abs(x + 1.5) < 1.4) return x < -2.2 ? '#FFD9DE' : stripe; const dx = x - 0.6, dy = y + 7, d = Math.hypot(dx, dy); if (dy < 0.5 && d < 3.5 && d > 0.9) return stripe; return null; }), sx + 1, cy0 - 9);
    }
  }
  legDim();
  /* 효과 */
  for (const f of B.fx) {
    const k = Math.max(0, f.life / f.max), fx = X(f.x), fy = Y(f.y);
    if (f.k === 'dot') { const s = Math.max(1 / Q, Math.round(f.r / WP * (0.5 + 0.5 * k) * Q) / Q); R(f.col, fx, fy, s, s); }
    else if (f.k === 'line') pline(fx, fy, X(f.x - f.vx * 0.04), Y(f.y - f.vy * 0.04), f.col);
    else if (f.k === 'star') pstar(fx, fy, k > 0.5 ? 2 : 1, f.col);
    else if (f.k === 'bolt') {   /* 솜사탕 번개: 지그재그 줄기 */
      for (let i = 1; i < f.pts.length; i++) { const [ax, ay] = f.pts[i - 1], [bx, by] = f.pts[i], mx = (ax + bx) / 2 + rand(-10, 10), my = (ay + by) / 2 + rand(-10, 10);
        for (const [c, t] of f.foe ? [['#FF2E4D', 5], ['#FFB020', 2]] : [[k > 0.5 ? '#FF8FD0' : '#C77DFF', 3], [k > 0.4 ? '#FFFFFF' : '#FFE7F0', 1]]) { pline(X(ax), Y(ay), X(mx), Y(my), c, t); pline(X(mx), Y(my), X(bx), Y(by), c, t); }
        pstar(X(bx), Y(by), 2, '#FFFFFF'); }
    }
    else if (f.k === 'slash') {   /* 치명타: 맞은 자리를 가르는 X자 섬광 */
      const L = Math.round(16 * (k > 0.5 ? 1 : k * 2)), a = f.a + 0.785;
      for (const b of [a, a + 1.571]) { const c = Math.cos(b), s2 = Math.sin(b); pline(Math.round(fx - c * L), Math.round(fy - s2 * L), Math.round(fx + c * L), Math.round(fy + s2 * L), INK, 3); pline(Math.round(fx - c * L), Math.round(fy - s2 * L), Math.round(fx + c * L), Math.round(fy + s2 * L), k > 0.6 ? '#FFFFFF' : '#FFD86B', 1); }
    }
    else if (f.k === 'pop') {    /* 처치: 8방향으로 뻗는 빛살 */
      const r0 = Math.round(f.r / WP * (1 - k) * 1.2), r1 = r0 + Math.max(2, Math.round(5 * k));
      for (let i = 0; i < 8; i++) { const b = i * 0.785, c = Math.cos(b), s2 = Math.sin(b); pline(Math.round(fx + c * r0), Math.round(fy + s2 * r0), Math.round(fx + c * r1), Math.round(fy + s2 * r1), i % 2 ? f.col : '#FFFFFF', k > 0.5 ? 2 : 1); }
      if (k > 0.7) pdisc(fx, fy, 2, '#FFFFFF');
    }
    else if (f.k === 'flash') { const r = Math.max(1, Math.round(f.r / WP * (1.2 - 0.5 * k))); pdisc(fx, fy, r, f.col); pstar(fx, fy, r + 2, f.col); }
    else if (f.k === 'ghost') { if (Math.floor(k * 8) % 2 === 0) spr(f.img, f.x, f.y, f.flip, true, Math.round((1 - k) * 5)); }
    else if (f.k === 'beam') {
      /* 레벨업 빛기둥 */
      const w = Math.max(1, Math.round(9 * Math.min(1, k * 1.6))) + (Math.floor(B.t * 20) % 2);
      ctx.globalAlpha = 0.45; R('#FFD86B', fx - w, 0, w * 2, fy + 2); ctx.globalAlpha = 1; R('#FFF3C0', fx - Math.ceil(w / 2), 0, w, fy + 2); R('#FFFFFF', fx - 1, 0, 2, fy + 2);
      putDisc(fx, fy + 1, 16 + Math.round((1 - k) * 14), 6 + Math.round((1 - k) * 4), '#FFD86B', 10);
    }
    else if (f.k === 'arc' || f.k === 'spin') {
      /* 롤링핀 궤적: 점으로 찍은 호와 앞쪽 끝의 방망이 */
      const e = 1 - k, spin = f.k === 'spin', a0 = spin ? f.a : f.a - 1.3, a1 = a0 + (spin ? 6.283 * Math.min(1, e * 1.6) : 2.6 * Math.min(1, e * 2.2)), rr = f.r * 0.82 / WP, cx0 = X(f.x), cy0 = Y(f.y - 12);
      for (let a = Math.max(a0, a1 - (spin ? 2.4 : 1.6)); a < a1; a += 0.6 / rr) { const near = a1 - a, sz = near < 0.5 ? 2.5 : near < 0.8 ? 2 : near < 1.3 ? 1.5 : 1; R(near < 0.5 ? '#FFFFFF' : spin ? '#FFD86B' : '#FFE1A8', Math.round((cx0 + Math.cos(a) * rr - sz / 2) * Q) / Q, Math.round((cy0 + Math.sin(a) * rr - sz / 2) * Q) / Q, sz, sz); if (near > 0.5 && near < 1.4) R(spin ? '#FFD86B' : '#FFE1A8', Math.round(cx0 + Math.cos(a) * (rr - 3)), Math.round(cy0 + Math.sin(a) * (rr - 3)), 1, 1); }
      const hx = cx0 + Math.cos(a1) * rr, hy = cy0 + Math.sin(a1) * rr, tx0 = -Math.sin(a1), ty0 = Math.cos(a1);
      pline(Math.round(hx - tx0 * 5), Math.round(hy - ty0 * 5), Math.round(hx + tx0 * 5), Math.round(hy + ty0 * 5), INK, 4); pline(Math.round(hx - tx0 * 4), Math.round(hy - ty0 * 4), Math.round(hx + tx0 * 4), Math.round(hy + ty0 * 4), spin ? '#FFD86B' : '#D9A066', 2);
    }
    else if (f.k === 'ray') { const c = Math.cos(f.a), sn = Math.sin(f.a), L = f.len / WP, x0 = X(f.x), y0 = Y(f.y), t = k > 0.5 ? 5 : 3; pline(x0, y0, Math.round(x0 + c * L), Math.round(y0 + sn * L), INK, t + 2); pline(x0, y0, Math.round(x0 + c * L), Math.round(y0 + sn * L), k > 0.6 ? '#FFFFFF' : f.col, t); }
    else { const r = Math.round((f.r + (f.to - f.r) * (1 - k * k)) / WP); if (r > 0) { pcircle(fx, fy, r, f.col, (f.w || 5) > 5 && k > 0.4 ? 2 : 1); if (k > 0.6 && r > 3) pcircle(fx, fy, r - 2, f.col); } }
  }
  /* 전설 이펙트는 반투명으로 겹치고, 그 위에 나와 적의 탄을 다시 그려서 피할 수 있게 해요 */
  if (B.lfx.length) { LSNAP.width !== cv.width && (LSNAP.width = cv.width, LSNAP.height = cv.height); const sq = LSNAP.getContext('2d'); sq.clearRect(0, 0, LSNAP.width, LSNAP.height); sq.drawImage(cv, 0, 0);
    legDraw(); ctx.globalAlpha = 1 - legAlpha(); if (ctx.globalAlpha > 0.01) ctx.drawImage(LSNAP, 0, 0, lw, lh);      /* 이펙트 위에 원래 화면을 (1-진하기)만큼 덮어서 옅게 해요. 100%면 덮지 않아요 */ ctx.globalAlpha = 1; drawFoeShots(); drawHeroLayer(); }
  epicDraw();      /* 별 조각은 전설 이펙트 위에 또렷하게 */
  if (B.rv) rvDraw();
  /* 가장자리 그늘, 떠다니는 설탕 가루 */
  ctx.drawImage(vignette(), 0, 0);
  gimOver();
  for (let i = 0; i < 14; i++) { const sx = Math.round(((i * 53 + B.t * (4 + i % 5 * 2)) % (lw + 10)) - 5), sy = Math.round(((i * 91 - B.t * (7 + i % 4 * 3)) % lh + lh) % lh); if (Math.sin(B.t * 2 + i) > -0.3) R(i % 3 ? 'rgba(255,231,240,.45)' : 'rgba(201,182,217,.45)', sx, sy, 1, 1); }
  /* 글자, 번쩍임, 조이스틱은 위에 겹친 선명한 판에 그려요 */
  const d = cv2.width / innerWidth, U = PZ * d; tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, cv2.width, cv2.height);
  if (B.flashScr) { const fk = B.flashScr.t / B.flashScr.max; if (fk <= 0) B.flashScr = null; else { tx.fillStyle = `rgba(${B.flashScr.col},${0.4 * fk})`; tx.fillRect(0, 0, cv2.width, cv2.height); } }
  tx.textAlign = 'center'; legBanner(U, d);
  for (const t of B.texts) {
    const e = 1 - t.life / t.max, pop = e < 0.12 ? 1 : 0, size = Math.round((t.big ? 12 : 10) * (PXS + pop) * d), sx = Math.round(X(t.x) * U), sy = Math.round(Y(t.y) * U);
    if (t.life < 0.15 && Math.floor(t.life * 40) % 2) continue;
    tx.font = `${size}px ${t.big ? 'Galmuri11B' : 'Galmuri11'}, sans-serif`; tx.fillStyle = INK;
    for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) tx.fillText(t.t, sx + a * U, sy + b * U);
    tx.fillStyle = t.col === '#4A2040' ? '#FFFFFF' : t.col; tx.fillText(t.t, sx, sy);
  }
  /* 화면 밖 자석과 폭탄: 가장자리에 방향 화살표 */
  for (const [m, bomb] of [...B.magnets.map(o => [o, 0]), ...B.bombs.map(o => [o, 1]), ...(B.epics || []).filter(o => o.t > EPIC_GATHER).map(o => [o, 2])]) {
    const sx = X(m.x) * U, sy = Y(m.y) * U, W = cv2.width, H = cv2.height, top = 118 * d, pad = 26 * d;
    if (sx > 0 && sx < W && sy > top - 40 * d && sy < H) continue;
    const ax = Math.max(pad, Math.min(W - pad, sx)), ay = Math.max(top, Math.min(H - pad * 1.6, sy)), a = Math.atan2(sy - ay, sx - ax), blink = Math.floor(B.t * 5) % 2, s = 9 * d;
    tx.save(); tx.translate(Math.round(ax), Math.round(ay));
    tx.fillStyle = INK; tx.fillRect(-s - U, -s - U, (s + U) * 2, (s + U) * 2);
    if (bomb === 2) { tx.fillStyle = blink ? '#FF4FD8' : '#9B3DFF'; tx.fillRect(-s, -s, s * 2, s * 2); tx.fillStyle = '#4FE8FF'; tx.beginPath(); tx.moveTo(0, -s * 0.85); tx.lineTo(s * 0.55, 0); tx.lineTo(0, s * 0.85); tx.lineTo(-s * 0.55, 0); tx.closePath(); tx.fill(); tx.fillStyle = '#FFFFFF'; tx.fillRect(-s * 0.12, -s * 0.5, s * 0.24, s * 0.5); }      // 별 조각 결정
    else if (bomb) { tx.fillStyle = blink ? '#FFB02E' : '#E8892E'; tx.fillRect(-s, -s, s * 2, s * 2); tx.fillStyle = INK; tx.beginPath(); tx.arc(0, s * 0.2, s * 0.62, 0, 6.283); tx.fill(); tx.fillStyle = '#6A6890'; tx.fillRect(-s * 0.35, -s * 0.2, s * 0.25, s * 0.25); tx.fillStyle = INK; tx.fillRect(s * 0.15, -s * 0.85, s * 0.3, s * 0.4); tx.fillStyle = blink ? '#FFFFFF' : '#FFD23F'; tx.fillRect(s * 0.3, -s * 1.0, s * 0.35, s * 0.35); }      // 작은 폭탄 그림
    else { tx.fillStyle = blink ? '#FF4F6B' : '#E8323C'; tx.fillRect(-s, -s, s * 2, s * 2);
    tx.fillStyle = INK; tx.fillRect(-s * 0.3, -s, s * 0.6, s * 1.2); tx.fillStyle = '#DDE3EA'; tx.fillRect(-s, s * 0.45, s * 0.7, s * 0.55); tx.fillRect(s * 0.3, s * 0.45, s * 0.7, s * 0.55); }      // 작은 자석 그림
    tx.rotate(a); tx.fillStyle = INK; tx.beginPath(); tx.moveTo(s * 2.9 + U, 0); tx.lineTo(s * 1.5 - U, -s - U); tx.lineTo(s * 1.5 - U, s + U); tx.closePath(); tx.fill();
    tx.fillStyle = blink ? '#FFD86B' : '#FFFFFF'; tx.beginPath(); tx.moveTo(s * 2.7, 0); tx.lineTo(s * 1.5, -s * 0.8); tx.lineTo(s * 1.5, s * 0.8); tx.closePath(); tx.fill();
    tx.restore();
  }
  if (B.joy) { const q = v => Math.round(v * d); tx.strokeStyle = 'rgba(255,243,230,.5)'; tx.lineWidth = U; tx.setLineDash([U * 2, U * 2]); tx.beginPath(); tx.arc(q(B.joy.ox), q(B.joy.oy), 46 * d, 0, 6.283); tx.stroke(); tx.setLineDash([]); const kx = q(B.joy.ox + B.joy.dx * 46), ky = q(B.joy.oy + B.joy.dy * 46), s = 16 * d; tx.fillStyle = INK; tx.fillRect(kx - s - U, ky - s - U, (s + U) * 2, (s + U) * 2); tx.fillStyle = '#FF4F9A'; tx.fillRect(kx - s, ky - s, s * 2, s * 2); tx.fillStyle = '#FFB0D2'; tx.fillRect(kx - s, ky - s, s * 2, U); }
  /* 위쪽 표시 */
  const left = Math.max(0, Math.ceil((B.bossAt > 0 && !B.big ? B.bossAt : B.dur) - B.t));
  if (left !== B.hudT) { B.hudT = left; $('#timer').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; }
  const hk = p.hp * 10 + p.max; if (hk !== B.hudHp) { const lost = B.hudHp > 0 && p.hp < Math.floor(B.hudHp / 10); B.hudHp = hk; const e = $('#hearts'); e.innerHTML = heartsHtml(p.hp, p.max); if (lost) { const off = e.children[p.hp]; if (off) off.classList.add('broke'); e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); } }
  const xpK = Math.round(clamp(B.xp / B.need, 0, 1) * 100); if (xpK !== B.hudXp) { B.hudXp = xpK; $('#xpBar').style.transform = `scaleX(${xpK / 100})`; $('#lvText').textContent = `Lv ${B.lvl}`; }
  const xf = B.xpFlash > 0; if (xf !== B.hudXf) { B.hudXf = xf; $('#xpMeter').classList.toggle('gain', xf); }
  if (B.big && !B.big.dead) $('#bossHp').style.transform = `scaleX(${clamp(B.big.hp / B.big.max, 0, 1)})`; else if (B.bigDead) $('#bossBar').hidden = true;
}
let last = 0;
function frame(now) {
  if (!B || headless) return;
  const raw = Math.min(0.05, (now - last) / 1000); last = now;
  if (B.flashScr) B.flashScr.t -= raw;
  if (B.hitstop > 0) B.hitstop -= raw;      // 타격 순간 아주 잠깐 멈춰요
  else {
    let dt = raw; if (B.slow > 0) { B.slow -= raw; dt *= 0.35 + 0.65 * Math.max(0, 1 - B.slow / 0.35); }
    if (B.rv) { if (!B.paused) rvTick(raw); } else for (let i = 0; i < (window.__dbg.speed || 1); i++) if (B && !B.paused && !B.over) update(dt);
  }
  if (B) { draw(); requestAnimationFrame(frame); }
}
/* 화면 어디든 누른 자리가 조이스틱 중심 */
cv.addEventListener('pointerdown', e => { if (!B || B.paused) return; B.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
cv.addEventListener('pointermove', e => { if (!B || !B.joy || B.joy.id !== e.pointerId) return; let dx = (e.clientX - B.joy.ox) / 46, dy = (e.clientY - B.joy.oy) / 46; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } B.joy.dx = dx; B.joy.dy = dy; });
['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, e => { if (B && B.joy && B.joy.id === e.pointerId) B.joy = null; }));
document.addEventListener('visibilitychange', () => { if (document.hidden && B && !B.paused && !B.over) pauseSheet(); });
function pauseSheet() {
  if (!B || B.over || B.paused) return; B.paused = true; B.joy = null;
  sheet(`<h2 id="cardTitle">잠깐 멈춤</h2><p>이어서 하려면 아래 버튼을 눌러요. 전투 도중에 앱을 끄면 이 전투는 처음부터 다시 해요.</p><button class="cta" type="button" data-act="go" data-pref>이어서 하기</button><button class="btn" type="button" data-act="sound">${S.muted ? '소리 켜기' : '소리 끄기'}</button>`,
    act => { if (act === 'sound') { S.muted = !S.muted; persist(); setMusicVol(); closeSheet(); B.paused = false; pauseSheet(); return; } closeSheet(); B.paused = false; last = performance.now(); });
}
$('#btnPause').addEventListener('click', pauseSheet);

/* ═════ 화면과 카드 창 ═════ */
function show(id) { ['title', 'map', 'battle'].forEach(s => { $('#' + s).hidden = s !== id; }); if (!headless) music(id === 'battle' ? 'battle' : 'map'); if (id !== 'title' && !headless) armBack(); }
/* 안드로이드 뒤로 가기: 게임이 꺼지는 대신 창 닫기 → 일시정지 → 메뉴. 처음 화면에서는 그대로 나가요 */
function armBack() { try { if (!(history.state && history.state.g)) history.pushState({ g: 1 }, ''); } catch (e) {} }
addEventListener('popstate', () => {
  const scr = ['title', 'map', 'battle'].find(s => !$('#' + s).hidden);
  if (scr === 'title' && overlay.hidden) return;
  armBack();
  if (!overlay.hidden) { const c = cardEl.querySelector('[data-act="close"],[data-act="leave"]'); if (c) c.click(); return; }
  if (scr === 'battle') { if (B && !B.over) pauseSheet(); } else if (scr === 'map') menuSheet(true);
});
const overlay = $('#overlay'), cardEl = $('#card');
let onCard = null;
function sheet(html, handler) { cardEl.className = 'card'; cardEl.innerHTML = html; overlay.hidden = false; onCard = handler; cardEl.scrollTop = 0; }
function closeSheet() { overlay.hidden = true; cardEl.innerHTML = ''; onCard = null; cardEl.classList.remove('reward', 'lvl'); }

/* ───── 보상 연출 ───── */
const fxLayer = $('#fx'), calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const CONF = ['#FF5C8A', '#FFD23F', '#86D44A', '#59B8FF', '#C77DFF', '#FFFFFF', '#FF9A1F'];
function confetti(n, x = innerWidth / 2, y = innerHeight * 0.4, spread = 1) {
  if (headless || calm()) return;
  for (let i = 0; i < n; i++) {
    const e = el('i', 'conf'); e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.background = pick(CONF);
    if (Math.random() < 0.3) e.style.borderRadius = '50%';
    fxLayer.appendChild(e);
    const a = rand(-Math.PI, 0), sp = rand(120, 340) * spread, dx = Math.cos(a) * sp, up = Math.sin(a) * sp, r = rand(-720, 720);
    e.animate([{ transform: 'translate(-50%,-50%) rotate(0deg) scale(.4)' }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${up}px)) rotate(${r / 2}deg) scale(1)`, offset: 0.3 }, { transform: `translate(calc(-50% + ${dx * 1.4}px), calc(-50% + ${up + rand(260, 460)}px)) rotate(${r}deg) scale(.9)`, opacity: 0 }],
      { duration: rand(1300, 1900), easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).onfinish = () => e.remove();
  }
}
/* 반짝이: 한 점에서 별가루가 퍼져요 */
function sparkle(x, y, n = 12) {
  if (headless || calm()) return;
  for (let i = 0; i < n; i++) {
    const e = el('i', 'spk'); e.style.left = x + 'px'; e.style.top = y + 'px'; fxLayer.appendChild(e);
    const a = i / n * 6.283 + rand(-.2, .2), d = rand(40, 90);
    e.animate([{ transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(1) rotate(180deg)`, opacity: 1, offset: .6 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.2}px), calc(-50% + ${Math.sin(a) * d * 1.2}px)) scale(0) rotate(240deg)`, opacity: 0 }],
      { duration: 700, easing: 'ease-out', fill: 'forwards' }).onfinish = () => e.remove();
  }
}
/* 카드 뒤집기: 뒷면으로 깔렸다가 하나씩 뒤집혀요. 희귀 카드는 반짝여요 */
function flipReveal() {
  const box = cardEl.querySelector('.opts'); if (!box) return;
  const list = [...box.querySelectorAll('.opt')];
  if (headless || calm()) { list.forEach(o => o.classList.add('shown')); return; }
  box.classList.add('flip', 'lock');
  list.forEach((o, i) => {
    const d = 350 + i * 260; o.style.setProperty('--d', d + 'ms');
    setTimeout(() => { if (o.isConnected) sfx.flip(); }, d + 120);
    setTimeout(() => { if (!o.isConnected) return; o.classList.add('shown'); if (o.classList.contains('r2') || o.classList.contains('lv5') || o.classList.contains('lv10')) { const r = o.getBoundingClientRect(), big = o.classList.contains('lv10'); sfx.rare(); sparkle(r.left + 36, r.top + r.height / 2, big ? 20 : 14); if (big) { sparkle(r.right - 40, r.top + r.height / 2, 14); confetti(24, r.left + r.width / 2, r.top + r.height / 2, .7); } } }, d + 300);
  });
  setTimeout(() => box.classList.remove('lock'), 350 + list.length * 260 + 250);
}
/* 승리 연출: 빛줄기, 큰 글자, 색종이, 골드가 위쪽 지갑으로 날아가요. 누르면 넘어가요 */
function winFx(title, gold, oldGold, next, big) {
  if (headless) { next(); return; }
  const wrap = el('div', 'win' + (big ? ' big' : ''), `<div class="rays"></div><div class="win-t">${title}</div>${gold ? `<div class="win-g"><i>${svg(ICON.coin)}</i>+${gold}</div>` : ''}`);
  fxLayer.appendChild(wrap); sfx.fanfare();
  confetti(big ? 90 : 46, innerWidth / 2, innerHeight * 0.38, big ? 1.4 : 1);
  if (big) setTimeout(() => confetti(60, innerWidth / 2, innerHeight * 0.3, 1.6), 450);
  const chip = $('#goldChip'), N = Math.min(12, Math.max(4, Math.round(gold / 4)));
  let shown = oldGold, done = false;
  const paint = () => { if (chip) chip.innerHTML = `<i>${svg(ICON.coin)}</i>${shown}`; };
  if (gold && chip && chip.offsetParent && !calm()) {
    paint(); const to = chip.getBoundingClientRect(), tx = to.left + 16, ty = to.top + to.height / 2;
    for (let i = 0; i < N; i++) {
      const c = el('i', 'fly', svg(ICON.coin)), sx = innerWidth / 2 + rand(-60, 60), sy = innerHeight * 0.5 + rand(-20, 30); fxLayer.appendChild(c);
      c.style.left = sx + 'px'; c.style.top = sy + 'px';
      const mx = (sx + tx) / 2 + rand(-80, 80), my = Math.min(sy, ty) - rand(20, 90);
      c.animate([{ transform: 'translate(-50%,-50%) scale(0)' }, { transform: 'translate(-50%,-50%) scale(1.2)', offset: .15 }, { transform: `translate(calc(-50% + ${mx - sx}px), calc(-50% + ${my - sy}px)) scale(1)`, offset: .6 }, { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) scale(.6)` }],
        { duration: 750, delay: 450 + i * 60, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'both' }).onfinish = () => {
          c.remove(); if (done) return;
          shown = i === N - 1 ? oldGold + gold : Math.min(oldGold + gold, shown + Math.ceil(gold / N)); paint(); sfx.coinTick();
          chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
        };
    }
  }
  const finish = () => { if (done) return; done = true; wrap.classList.add('out'); setTimeout(() => wrap.remove(), 250); if (gold && chip) { shown = oldGold + gold; paint(); } next(); };
  setTimeout(finish, big ? 2600 : 1900); wrap.addEventListener('pointerdown', finish, { once: true });
}

cardEl.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || !onCard) return; if (b.getAttribute('aria-disabled') === 'true') { sfx.no(); return; } onCard(b.dataset.act, b); });

/* ───── 지도 ───── */
const MAP_ROWS = 6;                      // 막마다 보스 앞까지 6층 (보스 칸 id는 ROWS*3)
/* 3막 구성. 난이도 값은 막이 바뀌어도 이어져요: 1막 0→5, 2막 6→11, 3막 12→17 */
const ACTS = [null,
  { name: '과자 도시', boss: 'boss', elite: 'donut', base: 0, span: 5 },
  { name: '얼음 디저트 나라', boss: 'boss2', elite: 'golem', minion: 'donut', base: 6, span: 5 },
  { name: '불타는 오븐 성', boss: 'boss3', elite: 'knight', minion: 'golem', base: 12, span: 5 },
  { name: '별빛 마카롱 궁전', boss: 'queen', elite: 'knight', minion: 'knight', base: 18, span: 5 }];
const actOf = () => { const n = (run && (run.cur || run.stage + 1)) || 1; return n > 100 ? 4 : n <= 30 ? 1 + Math.floor((n - 1) / 10) : [2, 3, 1][Math.floor((n - 31) / 10) % 3]; };      /* 100스테이지 뒤는 새 구역 */
const floorNo = () => (run && (run.cur || (run.stage || 0) + 1)) || 1;      // 지금 몇 번째 스테이지인지
let picked = null;
function renderBar() {
  run.maxHp = heartsMax(); run.hp = run.maxHp;
  $('#hpChip').innerHTML = heartsHtml(run.hp, run.maxHp);
  $('#goldChip').innerHTML = `Lv ${run.lvl}`;
  $('#potChip').innerHTML = '';
  $('#relics').innerHTML = SLOTS.map(s => { const it = eqOf()[s]; return `<button class="relic eqs${it ? ' g' + it.g : ' none'}" type="button" data-slot="${s}" aria-label="${SLOT[s].name}${it ? ': ' + it.nm : ' 없음'}">${eqImg(it, s)}</button>`; }).join('');
  renderDock();
}
/* 지도 아래 메뉴. 빨간 점: 배울 수 있는 특성, 지금보다 좋은 장비 */
function renderDock() {
  const d = $('#dock'); if (!d || !run) return;
  const tree = TREE.filter(t => canLearn(t) && S.meta.pts >= t.cost[M(t.id)]).length, better = (run.inv || []).filter(it => betterThanWorn(it)).length, pets = Object.keys(PETS).filter(id => petLv(id)).length;
  const btn = (act, icon, lab, dot, cls) => `<button type="button" data-dock="${act}"${cls ? ` class="${cls}"` : ''}>${dot ? `<i class="dot">${dot > 9 ? '9+' : dot}</i>` : ''}${svg(ICON[icon] || ICON.star)}<span>${lab}</span></button>`;
  d.innerHTML = btn('char', 'heart', '캐릭터') + btn('eq', 'pin', '장비', better) + (pets ? btn('pet', 'star', '펫') : '') + btn('tree', 'ench', '성장', tree) + (towerOpen() ? btn('tower', 'chest', `탑 ${towerNext()}층`, 0, 'tw') : '');
}
function renderMap() {
  const N = STAGES.length, rowH = 84, H = N * rowH + 60, xs = [50, 74, 50, 26], pos = i => [xs[i % 4], (H - 46 - i * rowH) / H * 100]; let lines = '';
  for (let i = 0; i < N - 1; i++) { const [a, b] = pos(i), [c, d] = pos(i + 1); lines += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}"${i + 2 <= run.stage ? ' class="walked"' : ''}/>`; }
  const m = $('#mapBox'); m.innerHTML = `<div class="map-in" style="height:${H}px"><svg class="roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${towerOpen() ? '' : '<p class="soon">다음 스테이지는 곧 열려요</p>'}</div>`;
  if (towerOpen()) { const b = el('button', 'node tower', `<span class="twi">🗼</span><b class="sn2">${towerNext()}층</b>`); b.type = 'button'; b.dataset.id = 'tw'; b.style.left = '50%'; b.style.top = '-10px'; b.setAttribute('aria-label', `무한의 탑 ${towerNext()}층`); m.firstElementChild.appendChild(b); }      /* 지도 맨 위: 무한의 탑 */
  STAGES.forEach((s, i) => {
    const n = i + 1, [x, y] = pos(i), dn = n <= run.stage, open = n === run.stage + 1;
    const b = el('button', `node${s.boss ? ' boss' : ''}${dn ? ' done' : ''}${open ? ' open' : ''}${!dn && !open ? ' lock' : ''}`, s.boss ? `<img src="img/${FOES[s.boss].img}.png" alt=""><b class="sn2">${n}</b>` : `<b class="sn">${n}</b>`);
    b.type = 'button'; b.dataset.id = n; b.style.left = x + '%'; b.style.top = y + '%'; b.setAttribute('aria-label', `스테이지 ${n} ${s.n}` + (dn ? ', 깬 곳' : open ? ', 지금 도전할 곳' : ', 아직 잠긴 곳'));
    m.firstElementChild.appendChild(b);
  });
  mapFocus();
}
/* 지금 도전할 칸이 지도 가운데쯤 오게 (아래 안내창 크기가 정해진 뒤에 한 번 더 맞춰요) */
function mapFocus() {
  const m = $('#mapBox'), t = m.querySelector('.node.open') || (towerOpen() && run.stage >= STAGES.length && m.querySelector('.node.tower')) || [...m.querySelectorAll('.node.done')].pop();
  if (t) m.scrollTo({ top: t.offsetTop + 56 - m.clientHeight * 0.55, behavior: 'instant' });
}
function info(html, goId) { $('#info').innerHTML = `<div>${html}</div>${goId != null ? `<button class="cta" type="button" id="btnGo" data-id="${goId}">들어가기</button>` : ''}`; }
function showMap() {
  show('map'); run.cur = null; renderBar(); picked = null; renderMap();
  if (!run.wpn.length && overlay.hidden) { starterPick(); return; }     // 첫 무기를 고르기 전에 앱을 껐다 켠 경우
  pickNode(Math.min(run.stage + 1, STAGES.length), true); requestAnimationFrame(mapFocus);
  setTimeout(() => { if (overlay.hidden && document.querySelector('#map:not([hidden])')) tipCheck(); }, 350);
}
/* ───── 다음 단계 안내: 한 단계를 다 끝내면 지도에서 한 번씩 알려줘요 ───── */
const cardsDone = () => Object.keys(WEAPONS).every(id => wLv(id) >= WMAX) && legAll() && (run.bonus.spd || 0) >= 6 && (run.bonus.dmg || 0) >= 10 && (run.bonus.crit || 0) >= 10 && (run.bonus.heart || 0) >= 1;
const TIPS = [
  { id: 'leg', when: () => legUnlocked(), title: '전설 스킬이 열렸어요!', icon: 'star',
    text: () => `기본 스킬 10개를 모두 Lv10으로 만들었어요. 이제 <b>전설 스킬</b>을 모을 수 있어요.<br><br><b>얻는 법</b><br>· 레벨업 카드에 '전설 조각'이 나와요. 같은 무기 조각을 ${LEG_N}개 모으면 각성해요.<br>· 보스를 처음 잡으면 조각을 2~3개 더 받아요.<br><br><b>각성하면</b><br>· 그 무기의 기본 공격이 화려한 전설 스킬로 바뀌어요. 몇 초마다 저절로 터지고 훨씬 세요.<br><br><b>더 세게</b><br>· 전설 등급 장비에는 스킬 강화가 붙어요. 같은 무기 강화 장비를 여러 개 끼면 더 세져요.` },
  { id: 'legAll', when: () => legAll(), title: '전설 스킬을 모두 모았어요!', icon: 'star',
    text: () => `이제 <b>전설 별 강화</b>로 더 키울 수 있어요.<br><br><b>얻는 법</b><br>· 몬스터를 잡다 보면 아주 가끔 <b>전설 별 조각</b>이 떨어져요. 보랏빛 기운이 모이고 빛기둥이 서요. 떨어지는 순간 바로 얻어요.<br>· 바닥에 남은 결정에 직접 닿으면 화면의 몬스터가 모두 사라져요.<br><br><b>강화하면</b><br>· 조각을 모으면 전설 스킬에 별이 붙어요 (★1~★5, 조각 1·2·3·4·5개).<br>· 별 하나마다 그 스킬 피해 +12%, ★3과 ★5에서는 쿨타임이 짧아져요.<br>· 진행도는 캐릭터 창 무기 목록에서 볼 수 있어요.${run.stage >= 100 ? '<br><br>지도 맨 위 <b>무한의 탑</b>도 올라 보세요. 층마다 꾸미기를 받아요.' : ''}` },
  { id: 'cards', when: () => cardsDone(), title: '레벨업 카드를 모두 채웠어요!', icon: 'chest',
    text: () => `더 고를 카드가 없어서, 이제부터는 <b>레벨업할 때마다 무기 장비</b>를 바로 받아요.<br><br>· 새 장비 칸 <b>무기</b>에 끼워요. 모든 공격 피해가 올라가요.<br>· 일반 80%, 희귀 15%, 유물 4%, 영웅 1%로 나와요. 같은 등급 5개를 합성하면 한 등급 올라가요.<br>· 지금은 영웅까지 있어요. 영웅 무기에는 고유 효과가 붙어요.` },
  { id: 'star5', when: () => legAll() && Object.keys(WEAPONS).every(id => lStar(id) >= LSTAR_MAX), title: '전설 별 강화를 모두 끝냈어요!', icon: 'star',
    text: () => `모든 전설 스킬이 ★5가 됐어요. 정말 대단해요!<br><br><b>남은 성장</b><br>· 레벨업마다 받는 무기 장비를 모아 합성해요.<br>· 무한의 탑을 올라 층마다 새 꾸미기를 모아요.<br>· 성장 트리에서 남은 특성을 배워요.` }
];
let rewarding = false;
let rewardT = 0;
function rewardLock(on) { rewarding = on; const m = $('#map'); if (m) m.classList.toggle('busy', on); clearTimeout(rewardT); if (on) rewardT = setTimeout(() => rewardLock(false), 90000); }      /* 혹시 막히면 90초 뒤 저절로 풀려요 */
function tipCheck() {
  if (!run || !overlay.hidden || rewarding) return; const T = run.tips || (run.tips = {}); const t = TIPS.find(x => !T[x.id] && x.when()); if (!t) return;
  T[t.id] = 1; persist(); sfx.rare(); noteSheet(t.title, t.text(), t.icon, () => setTimeout(tipCheck, 250));
}
function pickNode(id, quiet) {
  picked = id; const s = STAGES[id - 1], dn = id <= run.stage, lock = id > run.stage + 1;
  document.querySelectorAll('.node').forEach(b => b.classList.toggle('sel', +b.dataset.id === id));
  if (!quiet) sfx.tap();
  const what = s.boss ? `보스전. 45초 뒤에 ${FOES[s.boss].name}이(가) 나타나요. 잡으면 이기고 장비 5개를 받아요.${dn ? '' : ` <b>처음 잡으면 꾸미기나 펫도 받아요.${legUnlocked() && !legAll() ? ' 전설 조각 2~3개도 받아요.' : ''}</b>`}${id === 100 && !S.pet2On ? ' <b>여기를 깨면 펫을 두 마리 데리고 다닐 수 있어요!</b>' : ''}${id === 200 && !S.pet3On ? ' <b>여기를 깨면 펫을 세 마리 데리고 다닐 수 있어요!</b>' : ''}` : s.g.length ? s.g.map(k => `<b>${GIM[k].name}</b> ${GIM[k].desc}`).join(' ') + ' 2분을 버티면 이기고 장비 3개를 받아요.' : '특별한 일 없이 2분만 버티면 이기고 장비 3개를 받아요.';
  info(`<h3>${id}. ${s.n}</h3><p>${lock ? '앞 스테이지를 먼저 깨야 열려요.' : (dn ? '이미 깬 곳이에요. 다시 하면 경험치를 더 모을 수 있어요. ' : '<b>처음 깨면 이 판에서 얻은 경험치를 한 번 더 받아요.</b> ') + what}</p>`, lock ? null : id);
}
$('#mapBox').addEventListener('click', e => { const b = e.target.closest('.node'); if (b) { if (b.dataset.id === 'tw') pickTower(); else pickNode(+b.dataset.id); } });
$('#info').addEventListener('click', e => { const b = e.target.closest('#btnGo'); if (b) { if (b.dataset.id === 'tw') enterTower(); else enter(+b.dataset.id); } });
$('#relics').addEventListener('click', e => { const b = e.target.closest('.relic'); if (!b) return; sfx.tap(); eqSheet(b.dataset.slot); });

/* ───── 무기 보기 ───── */
function weaponSheet() {
  const st = battleStats(), list = run.wpn.map(w => `<div class="opt${w.lv >= 10 ? ' r2' : w.lv >= 5 ? ' r1' : ''}"><span class="ic">${svg(ICON[w.id])}</span><span class="tx"><b>${WEAPONS[w.id].name} Lv${w.lv}${w.lv >= WMAX ? ' (최고)' : ''}</b><span>${wDescFull(w.id)}</span></span></div>`).join('');
  sheet(`<h2 id="cardTitle">내 무기 ${run.wpn.length}개 · Lv ${run.lvl}</h2><p>공격력 ${Math.round(st.dmg * 100)}% · 치명타 ${Math.round(st.crit * 100)}% · 이동 속도 ${Math.round(st.spd * 100)}%</p><div class="opts">${list}</div><button class="cta" type="button" data-act="close" data-pref>닫기</button>`, () => closeSheet());
}
/* 내 캐릭터: 모습, 능력치, 장착한 장비, 무기 */
/* 지난 판 스킬별 피해: 기록의 마지막 판으로 막대를 그려요 */
function lastDmgHtml() {
  const r = (S.hist || [])[S.hist.length - 1]; if (!r || !r.w) return '<p class="eqsum">아직 기록된 판이 없어요. 한 판을 끝내면 여기에 나와요.</p>';
  const lg = r.lg || [], rows = r.w.map(([id, lv, d]) => ({ n: `${WEAPONS[id].name}${lg.includes(id) ? ` <i class="gn lg">${LEG[id].name}</i>` : ` Lv${lv}`}`, d: d + (id === 'lemon' ? r.ac || 0 : 0), c: lg.includes(id) ? '#FFD23F' : '#7FE3FF' }));
  if (r.pd) rows.push({ n: '펫 (별이 등)', d: r.pd, c: '#FF8FB8' }); const ex = Object.values(r.dx || {}).reduce((a, b) => a + b, 0); if (ex) rows.push({ n: '장비 효과', d: ex, c: '#B08CFF' });
  const tot = rows.reduce((a, b) => a + b.d, 0) || 1, mx = Math.max(...rows.map(x => x.d), 1), t = Math.max(1, r.t || 1), fmt = v => v >= 1e8 ? (v / 1e8).toFixed(1) + '억' : v >= 1e4 ? (v / 1e4).toFixed(1) + '만' : Math.round(v).toLocaleString('ko-KR');
  return `<p class="eqsum">${r.fl}번 스테이지 ${r.won ? '클리어' : '실패'} · ${Math.floor(t / 60)}분 ${t % 60}초 · 적 ${(r.k || 0).toLocaleString('ko-KR')}마리 · 전체 피해 ${fmt(tot)}</p><div class="dmgbars">${rows.sort((a, b) => b.d - a.d).map(x => `<div class="dmgrow"><span class="dn">${x.n}</span><span class="dt"><i style="width:${(x.d / mx * 100).toFixed(1)}%;background:${x.c}"></i></span><span class="dv">${fmt(x.d)} · ${Math.round(x.d / tot * 100)}%<br><small>초당 ${fmt(x.d / t)}</small></span></div>`).join('')}</div>`;
}
function charSheet() {
  const st = battleStats(), e = eqOf(), pc = v => `${Math.round(v * 100)}%`, row = (k, v, h) => `<div class="st"><span>${k}</span><b${h ? ' class="hi"' : ''}>${v}</b></div>`;
  const learned = TREE.filter(t => M(t.id)).map(t => `${t.name} ${M(t.id)}/${t.max}`).join(' · ') || '아직 배운 게 없어요';
  const stats = row('하트', `${heartsMax()}칸`) + row('공격력', pc(st.dmg), st.dmg > 1) + row('공격 속도', pc(st.atk), st.atk > 1) + row('이동 속도', pc(st.spd), st.spd > 1)
    + row('치명타 확률', pc(st.crit), st.crit > 0.05) + row('치명타 피해', pc(st.critMul), st.critMul > 1.8) + row('맞은 뒤 무적', `${(DF().inv * st.invK).toFixed(1)}초`, st.invK > 1)
    + row('방패', st.guard ? `${st.guard}초마다` : M('shield') ? '전투마다 1번' : '없음', !!st.guard) + row('무기 범위', pc(st.area), st.area > 1) + row('줍는 거리', pc(st.pickup / 88), st.pickup > 88) + row('경험치', pc(st.xp), st.xp > 1);
  const slots = SLOTS.map(sl => { const it = e[sl]; return it ? `<button class="opt eqi g${it.g}" type="button" data-act="eq" data-s="${sl}"><span class="ic">${eqImg(it)}</span><span class="tx"><b><i class="gn">${GRADES[it.g].name}</i> ${it.nm}</b><span>${statLine(it)}</span></span></button>` : `<button class="opt eqi empty" type="button" data-act="eq" data-s="${sl}"><span class="ic">${eqImg(null, sl)}</span><span class="tx"><b>${SLOT[sl].name}</b><span>비어 있어요. 눌러서 끼울 수 있어요.</span></span></button>`; }).join('');
  const wl = run.wpn.map(w => { const c = capeFor(w.id); return `<div class="opt${w.lv >= 10 ? ' r2' : w.lv >= 5 ? ' r1' : ''}"><span class="ic">${svg(ICON[w.id])}</span><span class="tx"><b>${WEAPONS[w.id].name} Lv${w.lv}${capeP(w.id) ? ` <i class="gn">+${capeP(w.id)}</i>` : ''}${isLeg(w.id) ? ` · <i class="gn lg">전설${lStarTxt(w.id)}</i>` : legUnlocked() ? ` · 조각 ${(run.shards || {})[w.id] || 0}/${LEG_N}` : ''}</b><span>${isLeg(w.id) ? `<b>${LEG[w.id].name}${lStarTxt(w.id)}</b>: ${LEG[w.id].desc} ${lStar(w.id) < LSTAR_MAX ? `<b>별 조각 ${((run.lsp || {})[w.id]) || 0}/${LSTAR_N[lStar(w.id)]}</b> (몬스터를 잡다 보면 가끔 떨어져요) ` : '<b>별 강화 완료!</b> '}` : ''}${wDescFull(w.id)}${c ? ` · 망토 효과 받는 중` : ''}</span></span></div>`; }).join('');
  sheet(`<h2 id="cardTitle">내 캐릭터</h2><div class="eqtop"><div class="eqhero"><img src="${heroUrl(4)}" alt="내 캐릭터"></div><div class="who"><b>Lv ${run.lvl}</b><span>스테이지 ${Math.min(run.stage + 1, STAGES.length)}에 도전 중</span><span>무기 ${run.wpn.length}개 · 장비 ${eqList().length}/5칸</span></div></div>
    <h3 class="sub3">능력치</h3><div class="stats">${stats}</div><h3 class="sub3">지난 판 스킬별 피해</h3>${lastDmgHtml()}<h3 class="sub3">배운 특성</h3><p class="eqsum">${learned}</p><h3 class="sub3">장착한 장비</h3><div class="opts">${slots}</div><h3 class="sub3">무기</h3><div class="opts">${wl}</div>
    <div class="row2"><button class="btn" type="button" data-act="eq">장비 바꾸기</button><button class="btn" type="button" data-act="tree">성장 트리 (별 ${S.meta.pts})</button></div><button class="cta" type="button" data-act="close" data-pref>닫기</button>`,
    (act, b) => { if (act === 'close') { closeSheet(); return; } if (act === 'tree') { treeSheet(() => charSheet()); return; } if (act === 'eq') eqSheet(b.dataset.s, () => charSheet()); });
}
$('#dock').addEventListener('click', e => { const b = e.target.closest('[data-dock]'); if (!b) return; const a = b.dataset.dock; sfx.tap();
  if (a === 'char') charSheet(); else if (a === 'eq') eqSheet(); else if (a === 'pet') petSheet(() => renderBar()); else if (a === 'tree') treeSheet(() => { closeSheet(); renderBar(); });
  else if (a === 'tower') { pickTower(); const n = $('#mapBox .node.tower'); if (n) $('#mapBox').scrollTo({ top: n.offsetTop - 40, behavior: 'smooth' }); } });

/* ───── 칸에 들어가기 ───── */
/* 스테이지에 들어갈 때: 하트를 가득 채우고, 이번 판 기록을 새로 시작해요 */
function stagePrep(n) {
  run.cur = n; run.maxHp = heartsMax(); run.hp = run.maxHp;
  run.potion = M('start2') > 0; run.rerolls = M('reroll'); run.petUsed = 0; run.kills = 0; run.elites = 0; run.dmg = {}; run.hits = 0; run.hitBy = {}; run.time = 0;
}
function enter(id) {
  if (id > run.stage + 1 || !STAGES[id - 1]) return; const s = STAGES[id - 1]; sfx.tap(); stagePrep(id); persist();
  startBattle(s.boss ? 'boss' : 'battle', stageDiff(id), r => afterBattle(id, r), s);
}
/* 보스 보너스: 캐릭터 꾸미기, 펫 꾸미기, 펫 중 하나 */
function bossBonus() {
  const hc = Object.keys(HERO_COS).filter(k => !(S.cos.hero || []).includes(k)), pc = Object.keys(PET_COS).filter(k => !(S.cos.pet || []).includes(k)), opts = ['pet'];
  if (hc.length) opts.push('hero'); if (pc.length) opts.push('pcos');
  const t = pick(opts);
  if (t === 'hero') { const k = pick(hc); S.cos.hero.push(k); return { t, k }; }
  if (t === 'pcos') { const k = pick(pc); S.cos.pet.push(k); return { t, k }; }
  return { t, g: gainPet() };
}
function bonusLine(b) {
  if (b.t === 'pet') return petLine(b.g);
  if (b.t === 'hero') return `<div class="opt r2 petget"><span class="ic"><img class="pxi" src="${cosPreview(b.k)}" alt=""></span><span class="tx"><b>캐릭터 꾸미기: ${HERO_COS[b.k].name}</b><span>장비 창의 꾸미기에서 바꿀 수 있어요.</span></span></div>`;
  return `<div class="opt r2 petget"><span class="ic">${cosPetIcon(S.pet && petLv(S.pet) ? S.pet : 'kong', b.k)}</span><span class="tx"><b>펫 꾸미기: ${PET_COS[b.k].name}</b><span>펫 창에서 씌워 줄 수 있어요.</span></span></div>`;
}
function cosPreview(k, t) { const look = lookNow(); look[t || cosType(k)] = k || null; const c = composeHero(HERO_RAW, eqOf(), look), o = mk(c.width * 2, c.height * 2), q = o.getContext('2d'); q.imageSmoothingEnabled = false; q.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL(); }
const itemRow = (it, i, o = {}) => `<button class="opt eqi g${it.g}${o.sel ? ' picked' : ''}${o.dim ? ' dim' : ''}" type="button" data-act="${o.act || 'item'}" data-i="${i}"${o.worn || o.sel ? ' aria-pressed="true"' : ''}>${o.sel ? '<em class="tag up">✔ 재료</em>' : o.worn ? '<em class="tag wt">착용 중</em>' : o.up ? '<em class="tag up">▲ 더 좋아요</em>' : ''}<span class="ic">${eqImg(it)}</span><span class="tx"><b><i class="gn">${GRADES[it.g].name}</i> ${it.nm}</b><span>${SLOT[it.s].name} · ${statLine(it)}</span></span></button>`;
function rewardSheet(items, bonus, title, next) {
  addItems(items); sfx.rare();
  const best = Math.max(...items.map(it => it.g));
  sheet(`<h2 id="cardTitle">${title}</h2><p>장비 ${items.length}개를 얻었어요.${best >= 3 ? ` <b>${GRADES[best].name}</b> 등급이 나왔어요!` : ''}</p><div class="opts">${items.map((it, i) => itemRow(it, i, { act: 'noop', up: betterThanWorn(it) })).join('')}${bonus ? bonusLine(bonus) : ''}</div><button class="cta" type="button" data-act="wear" data-pref>좋은 걸로 끼기 (희귀까지)</button><button class="btn" type="button" data-act="bag">가방에 넣기</button>`,
    (act, b) => { if (act === 'noop' || b.closest('.lock')) return; let msg = ''; if (act === 'wear') { const n = autoEquip(); if (n) { sfx.good(); msg = `${n}개를 바꿔 꼈어요`; } } const m = autoSynth(); if (m) msg += (msg ? ' · ' : '') + `자동 합성 ${m}번`; if (msg) toastSheetMsg(msg); persist(); closeSheet(); next(); });
  flipReveal(); if (!headless && best >= 3) setTimeout(() => confetti(best === 4 ? 60 : 30), 500);
}
function toastSheetMsg(t) { const e = $('#toast'); if (!e || headless) return; e.textContent = t; e.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { e.hidden = true; }, 1800); }
/* 장비 창: 위에는 내 모습과 칸 5개, 아래는 가방 */
function eqSheet(slot0, back) {
  let tab = slot0 || 'all';
  const draw = () => {
    const e = eqOf(), inv = (run.inv || []).filter(it => tab === 'all' || it.s === tab).sort((a, b) => b.g - a.g || itemScore(b) - itemScore(a)), st = battleStats();
    const sums = eqList().length ? `${eqList().length}칸 착용` : '아직 낀 장비가 없어요';
    const tr = [];
    sheet(`<h2 id="cardTitle">장비</h2><div class="eqtop"><div class="eqhero"><img src="${heroUrl(4)}" alt="내 캐릭터"></div><div class="eqslots">${SLOTS.map(s => { const it = e[s]; return `<button class="eqslot${it ? ' g' + it.g : ''}${tab === s ? ' on' : ''}" type="button" data-act="tab" data-s="${s}"><span class="ic">${eqImg(it, s)}</span><span class="sl">${SLOT[s].name}</span></button>`; }).join('')}</div></div>
      <p class="eqsum">${sums} · 자세한 능력치는 캐릭터 창에서 봐요</p>
      <div class="row2"><button class="btn" type="button" data-act="auto">좋은 걸로 끼기 (희귀까지)</button><button class="btn" type="button" data-act="synth">장비 합성</button></div>
      <div class="tabs"><button class="tb${tab === 'all' ? ' on' : ''}" type="button" data-act="tab" data-s="all">전체</button>${SLOTS.map(s => `<button class="tb${tab === s ? ' on' : ''}" type="button" data-act="tab" data-s="${s}">${SLOT[s].name}</button>`).join('')}</div>
      <div class="opts">${tab !== 'all' && e[tab] ? itemRow(e[tab], -1, { act: 'off', worn: true }) : ''}${inv.length ? inv.map((it, i) => itemRow(it, i, { up: betterThanWorn(it) })).join('') : '<p>가방이 비었어요. 스테이지를 깨면 장비를 받아요.</p>'}</div>
      <p class="eqsum">가방 ${(run.inv || []).length}개 · 안 쓰는 장비는 합성 재료로 쓸 수 있어요</p><button class="btn" type="button" data-act="cos">캐릭터 꾸미기</button><button class="cta" type="button" data-act="close" data-pref>닫기</button>`,
      (act, b) => {
        if (act === 'close') { closeSheet(); persist(); renderBar(); if (back) back(); return; }
        if (act === 'tab') { tab = b.dataset.s; sfx.tap(); draw(); return; }
        if (act === 'item') { equip(inv[+b.dataset.i]); sfx.good(); persist(); draw(); return; }
        if (act === 'off') { unequip(tab); sfx.tap(); persist(); draw(); return; }
        if (act === 'auto') { const n = autoEquip(); sfx.good(); persist(); draw(); toastSheetMsg(n ? `${n}개를 바꿔 꼈어요` : '바꿀 일반·희귀 장비가 없어요. 유물 이상은 직접 골라서 껴요'); return; }
        if (act === 'tidy') { const n = tidyItems(); sfx.tap(); persist(); draw(); toastSheetMsg(n ? `${n}개를 정리했어요` : '정리할 장비가 없어요'); return; }
        if (act === 'synth') { synthSheet(() => eqSheet(tab, back)); return; }
        if (act === 'cos') { cosSheet(() => eqSheet(tab, back)); }
      });
  };
  draw();
}
const SYN = 5;      /* 합성 재료 수 */
/* 장비 합성: 가방의 같은 등급 5개 → 한 등급 위 장비 1개. 다섯이 같은 칸이면 그 칸으로, 아니면 아무 칸이나 나와요 */
function synthItem(mats) {
  const g = mats[0].g, slot = mats.every(m => m.s === mats[0].s) ? mats[0].s : null, n = Math.max(...mats.map(m => m.n || 1));
  run.inv = run.inv.filter(it => !mats.includes(it));
  const it = rollItem(n, g + 1, slot); it.g = g + 1; if (it.g < 3) it.sp = null; if (it.g === 4) { rollLw(it); it.sp = null; } else delete it.lw; addItems([it]); return it;
}
/* 자동 합성: 고른 등급 이하 장비를 가방에서 전부, 일반 → 희귀 → 유물 → 영웅 순서로 차근차근 5개씩 합성해요.
   값 k(1~4) = 재료로 쓰는 가장 높은 등급이 k-1 (예: 2 = 희귀 이하). 합성 전에 낀 것보다 좋은 장비는 재료로 안 써요 (희귀까지는 먼저 껴요) */
function autoSynth() {
  const k = S.autoSynth || 0; if (!k || !run) return 0; let made = 0; autoEquip();
  for (let g = 0; g < Math.min(k, 4); g++) for (let guard = 0; guard < 400; guard++) {
    const pool = (run.inv || []).filter(it => it.g === g && !betterThanWorn(it) && !(it.s === 'weapon' && it.g >= WEP_MAXG)); if (pool.length < SYN) break;
    const by = {}; for (const it of pool) (by[it.s] = by[it.s] || []).push(it);
    const grp = Object.values(by).find(l => l.length >= SYN); synthItem((grp || pool).sort((a, b) => itemScore(a) - itemScore(b)).slice(0, SYN)); made++;
  }
  return made;
}
function synthSheet(back) {
  let sel = [];
  const draw = () => {
    const inv = (run.inv || []).filter(it => it.g < 4 && !(it.s === 'weapon' && it.g >= WEP_MAXG)).sort((a, b) => a.g - b.g || itemScore(a) - itemScore(b)), g = sel.length ? sel[0].g : -1, cnt = [0, 1, 2, 3].map(k => inv.filter(it => it.g === k).length);
    const same = sel.length === SYN && sel.every(m => m.s === sel[0].s);
    sheet(`<h2 id="cardTitle">장비 합성</h2><p>가방에서 <b>같은 등급 5개</b>를 고르면 한 등급 위 장비 1개가 돼요. 다섯 개가 같은 칸이면 그 칸 장비가 나오고, 섞으면 아무 칸이나 나와요. 낀 장비는 재료로 못 써요.</p>
      <p class="eqsum">${[0, 1, 2, 3].map(k => `<i class="gn g${k}">${GRADES[k].name}</i> ${cnt[k]}개`).join(' · ')}</p>
      <h3 class="sub3">자동 합성</h3><div class="tabs ctr">${[0, 1, 2, 3, 4].map(k => `<button class="tb${(S.autoSynth || 0) === k ? ' on' : ''}" type="button" data-act="autog" data-g="${k}">${k ? GRADES[k - 1].name + ' 이하' : '끔'}</button>`).join('')}</div><p class="eqsum">${S.autoSynth ? `보상을 받을 때마다 가방의 <b>${GRADES[S.autoSynth - 1].name} 이하 장비를 전부</b> 5개씩 차근차근 합성해요 (${GRADES[S.autoSynth].name}까지 올라가요). 합성 전에 낀 것보다 좋은 장비는 먼저 껴요.` : '켜 두면 보상을 받을 때마다 고른 등급 이하 장비를 전부 저절로 합성해요.'}</p>
      <div class="synth">${[0, 1, 2, 3, 4].map(i => `<span class="sslot${sel[i] ? ' g' + sel[i].g : ''}">${sel[i] ? eqImg(sel[i]) : '?'}</span>`).join('')}<b>→</b><span class="sslot res${g >= 0 ? ' g' + (g + 1) : ''}">${sel.length === SYN ? (same ? eqImg({ s: sel[0].s, g: g + 1, v: 0, fx: sel[0].fx, nm: '' }) : '?') : '?'}</span></div>
      <button class="cta" type="button" data-act="go"${sel.length === SYN ? '' : ' aria-disabled="true"'}>${sel.length === SYN ? `합성하기 → ${GRADES[g + 1].name} ${same ? SLOT[sel[0].s].name : '장비'}` : `재료 ${sel.length}/${SYN}`}</button>
      <button class="btn" type="button" data-act="quick">약한 것부터 자동으로 고르기</button>
      <div class="opts">${inv.length ? inv.map((it, i) => itemRow(it, i, { act: 'pick', sel: sel.includes(it), dim: g >= 0 && it.g !== g })).join('') : '<p>합성할 장비가 없어요.</p>'}</div><button class="btn" type="button" data-act="close">돌아가기</button>`,
      (act, b) => {
        if (act === 'close') { closeSheet(); back(); return; }
        if (act === 'autog') { S.autoSynth = +b.dataset.g; sel = []; const m = autoSynth(); persist(); sfx.tap(); draw(); if (m) { sfx.rare(); toastSheetMsg(`자동 합성 ${m}번 했어요`); } return; }
        if (act === 'pick') { const it = inv[+b.dataset.i]; if (sel.includes(it)) sel = sel.filter(x => x !== it); else if (sel.length < SYN && (g < 0 || it.g === g)) sel.push(it); else { sfx.no(); return; } sfx.tap(); const sc = cardEl.scrollTop; draw(); cardEl.scrollTop = sc; return; }
        if (act === 'quick') { const k = [0, 1, 2, 3].find(x => cnt[x] >= SYN); if (k == null) { sfx.no(); toastSheetMsg('같은 등급이 5개 모인 게 없어요'); return; } sel = inv.filter(it => it.g === k).slice(0, SYN); sfx.tap(); draw(); return; }
        if (act === 'go') { if (sel.length !== SYN) { sfx.no(); return; } const it = synthItem(sel); sel = []; persist(); sfx.rare();
          sheet(`<h2 id="cardTitle">합성 성공!</h2><div class="opts">${itemRow(it, 0, { act: 'noop', up: betterThanWorn(it) })}</div><button class="cta" type="button" data-act="more" data-pref>계속 합성하기</button>${betterThanWorn(it) ? '<button class="btn" type="button" data-act="wear">바로 끼기</button>' : ''}<button class="btn" type="button" data-act="close">돌아가기</button>`,
            (a2, b2) => { if (a2 === 'noop' || b2.closest('.lock')) return; if (a2 === 'wear') { equip(it); sfx.good(); persist(); } if (a2 === 'close') { closeSheet(); back(); return; } draw(); });
          flipReveal(); if (!headless && it.g >= 3) setTimeout(() => confetti(it.g === 4 ? 60 : 30), 500); }
      });
  };
  draw();
}
function cosSheet(back) {
  const draw = () => { const own = S.cos.hero || [], cur = lookNow();
    sheet(`<h2 id="cardTitle">캐릭터 꾸미기</h2><p>보스를 잡거나 무한의 탑을 오르면 꾸미기 아이템을 받아요. 머리 장식은 투구 대신, 날개는 망토 대신 보여요. 능력치는 그대로예요.</p><div class="eqhero cosme"><img src="${heroUrl(4)}" alt="내 캐릭터"></div>${COS_T.map(([t, lab]) => { const l = own.filter(k => cosType(k) === t); return `<h3 class="sub3">${lab}</h3><div class="cosrow big"><button class="cos${cur[t] ? '' : ' on'}" type="button" data-act="cos" data-t="${t}" data-id=""><img class="pxi" src="${cosPreview('', t)}" alt=""><span>${t === 'dye' ? '기본' : '없음'}</span></button>${l.map(k => `<button class="cos${cur[t] === k ? ' on' : ''}" type="button" data-act="cos" data-t="${t}" data-id="${k}"><img class="pxi" src="${cosPreview(k)}" alt=""><span>${HERO_COS[k].name}</span></button>`).join('')}</div>`; }).join('')}<button class="cta" type="button" data-act="close" data-pref>돌아가기</button>`,
      (act, b) => { if (act === 'close') { closeSheet(); back(); return; } const t = b.dataset.t, id = b.dataset.id || null; if (t === 'dye') S.heroCos = id; else S.heroLook[t] = id; heroDirty(); persist(); sfx.tap(); const sc = cardEl.scrollTop; draw(); cardEl.scrollTop = sc; }); };
  draw();
}
function afterBattle(id, r) {
  const s = STAGES[id - 1];
  if (!r.won) { gameOver(id, r); return; }
  const first = id > run.stage; if (first) run.stage = id;
  const stars = first ? (s.boss ? 6 : 3) + M('star') : 1; S.meta.pts += stars; S.meta.total += stars;
  /* 처음 깬 스테이지: 그 판에서 얻은 경험치를 한 번 더 받아요 */
  let xpBonus = 0, lvUp = 0; if (first && r.xpGot > 0) { xpBonus = r.xpGot; run.xp += xpBonus; while (run.xp >= needOf(run.lvl)) { run.xp -= needOf(run.lvl); run.lvl++; run.picks = (run.picks || 0) + 1; lvUp++; } }
  const pg = null; recordRun(true, stars, pg); if (s.boss && first) S.wins = (S.wins || 0) + 1;
  persist(); showMap();
  const steps = [next => winFx(s.boss ? '보스 격파!' : '스테이지 클리어!', 0, 0, next, !!s.boss)];
  { const items = Array.from({ length: s.boss ? 5 : 3 }, (_, k) => rollItem(id, s.boss && k === 0 ? 1 : 0)), bonus = s.boss && first ? bossBonus() : null; steps.push(next => rewardSheet(items, bonus, s.boss ? '보스 보상' : '클리어 보상', next)); }
  if (s.boss && first) { const sh = bossShards(); if (sh && sh.got.length) steps.push(next => noteSheet(`전설 조각 +${sh.got.length}개!`, `보스를 처음 잡은 보상이에요. ${[...new Set(sh.got)].map(w => `${WEAPONS[w].name} ${(run.shards || {})[w] || 0}/${LEG_N}`).join(', ')}.${sh.done.length ? ` <b>전설 스킬 완성: ${sh.done.map(w => LEG[w].name).join(', ')}!</b>` : ''}`, 'star', next)); }
  if (first && id === 200 && !S.pet3On) { S.pet3On = true; persist(); steps.push(next => noteSheet('펫 세 마리 해금!', '200스테이지를 처음 깼어요. 이제 펫을 세 마리까지 데리고 다닐 수 있어요. 펫 창에서 셋째 칸을 골라 줘요.', 'chest', next)); }
  if (first && id === 100 && !S.pet2On) { S.pet2On = true; persist(); steps.push(next => noteSheet('펫 두 마리 해금!', '100스테이지를 처음 깼어요. 이제 펫을 두 마리 데리고 다닐 수 있어요. 펫 창에서 둘째 칸을 골라 줘요.', 'chest', next)); }
  if (xpBonus) steps.push(next => noteSheet(`첫 클리어 보너스! 경험치 +${xpBonus}`, `처음 깬 스테이지라서 이번 판에서 얻은 경험치를 한 번 더 받았어요.${lvUp ? ` 레벨이 ${lvUp} 올랐어요!` : ''}`, 'star', next));
  for (let i = 0; i < (run.picks || 0); i++) steps.push(next => { run.picks--; levelSheet(rollLevelOpts(), next, run.lvl - run.picks); });
  steps.push(next => noteSheet(`설탕 별 +${stars}개`, `성장 트리에서 쓸 수 있어요. 지금 ${S.meta.pts}개 있어요.`, 'star', next));
  if (first && id === STAGES.length) steps.push(next => noteSheet('지금 열린 마지막 스테이지까지 깼어요!', '새 스테이지가 곧 열려요. 그동안 지도 맨 위의 무한의 탑을 올라 보세요. 층마다 꾸미기를 받아요.', 'chest', next));
  rewardLock(true); const go = () => { const st = steps.shift(); if (st) { try { st(go); } catch (e) { console.error(e); go(); } } else { rewardLock(false); persist(); showMap(); } };      /* 보상 창이 다 끝날 때까지 지도를 못 눌러요 */
  go();
}
/* ───── 무한의 탑: 100스테이지를 깨면 열려요. 층마다 기믹이 무작위로 섞이고, 처음 깨는 층마다 꾸미기를 하나씩 받아요 ───── */
const towerOpen = () => run && run.stage >= 100;
const towerNext = () => ((run.tw && run.tw.best) || 0) + 1;
const TW_BOSS = ['boss', 'golem', 'boss2', 'knight', 'boss3', 'queen'], TW_BAD = [['fog', 'blackout'], ['giant', 'swarm'], ['ice', 'wind'], ['shrink', 'vortex'], ['fog', 'ghost']];
function towerStage(f) {
  let sd = (f * 2654435761) >>> 0; const rr = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };      /* 층 번호로 정해지는 무작위: 같은 층은 늘 같은 구성 */
  const pool = Object.keys(GIM), g = [], want = f % 10 === 0 ? 1 : f <= 5 ? 1 : 2;
  while (g.length < want) { const k = pool[Math.floor(rr() * pool.length)]; if (g.includes(k) || TW_BAD.some(([a, b]) => (a === k && g.includes(b)) || (b === k && g.includes(a)))) continue; g.push(k); }
  return { n: `무한의 탑 ${f}층`, g, boss: f % 10 === 0 ? TW_BOSS[(f / 10 - 1) % TW_BOSS.length] : undefined, tower: f };
}
function pickTower() {
  picked = 'tw'; document.querySelectorAll('.node').forEach(b => b.classList.toggle('sel', b.dataset.id === 'tw')); sfx.tap();
  const f = towerNext(), s = towerStage(f), k = ensureTw('tw' + f), best = (run.tw && run.tw.best) || 0;
  const what = s.boss ? `보스층. 45초 뒤에 ${FOES[s.boss].name}이(가) 나타나요. ${s.g.map(x => `<b>${GIM[x].name}</b>`).join(' ')}` : s.g.map(x => `<b>${GIM[x].name}</b> ${GIM[x].desc}`).join(' ');
  info(`<h3>무한의 탑 ${f}층</h3><p>끝없이 올라가는 탑이에요. 층마다 기믹이 바뀌고 점점 강해져요. 지금까지 ${best}층까지 올랐어요. ${what}</p><div class="twrew"><img class="pxi" src="${cosPreview(k)}" alt=""><span>깨면 받는 꾸미기<br><b>${HERO_COS[k].name}</b></span></div>`, 'tw');
}
function enterTower() {
  if (!towerOpen()) return; const f = towerNext(), s = towerStage(f), n = 100 + f; sfx.tap(); stagePrep(n); persist();
  startBattle(s.boss ? 'boss' : 'battle', stageDiff(n), r => towerAfter(f, r), s);
}
function towerAfter(f, r) {
  const s = towerStage(f);
  if (!r.won) { S.meta.pts += 1; S.meta.total += 1; recordRun(false, 1, null); persist(); showMap();
    const steps = []; for (let i = 0; i < (run.picks || 0); i++) steps.push(next => { run.picks--; levelSheet(rollLevelOpts(), next, run.lvl - run.picks); });
    steps.push(() => sheet(`<div class="pic"><img src="img/${s.boss ? FOES[s.boss].img : 'jelly'}.png" alt=""></div><h2 id="cardTitle">쓰러졌어요</h2><p>무한의 탑 ${f}층에서 쓰러졌어요. 적 ${r.kills}마리를 잡았어요. 얻은 경험치와 레벨은 그대로 남아요.</p><p class="pts">설탕 별 <b>+1</b>개 · 지금 ${S.meta.pts}개</p><button class="cta" type="button" data-act="retry" data-pref>다시 도전하기</button><button class="btn" type="button" data-act="close">지도로</button>`,
      act => { closeSheet(); if (act === 'retry') enterTower(); else pickTower(); }));
    const go = () => { const st = steps.shift(); if (st) st(go); }; go(); return; }
  const tw = run.tw || (run.tw = { best: 0 }), first = f > tw.best; if (first) tw.best = f;
  const stars = first ? (s.boss ? 6 : 3) + M('star') : 1; S.meta.pts += stars; S.meta.total += stars;
  const k = ensureTw('tw' + f), got = first && !(S.cos.hero || []).includes(k); if (got) S.cos.hero.push(k);
  recordRun(true, stars, null); persist(); showMap();
  const steps = [next => winFx(s.boss ? '보스 격파!' : `탑 ${f}층 돌파!`, 0, 0, next, !!s.boss)];
  { const items = Array.from({ length: s.boss ? 5 : 3 }, (_, q) => rollItem(100 + f, s.boss && q === 0 ? 1 : 0)); steps.push(next => rewardSheet(items, got ? { t: 'hero', k } : null, `탑 ${f}층 보상`, next)); }
  for (let i = 0; i < (run.picks || 0); i++) steps.push(next => { run.picks--; levelSheet(rollLevelOpts(), next, run.lvl - run.picks); });
  steps.push(next => noteSheet(`설탕 별 +${stars}개`, `성장 트리에서 쓸 수 있어요. 지금 ${S.meta.pts}개 있어요.`, 'star', next));
  rewardLock(true); const go = () => { const st = steps.shift(); if (st) { try { st(go); } catch (e) { console.error(e); go(); } } else { rewardLock(false); persist(); showMap(); pickTower(); } }; go();
}
/* 막을 깼어요: 보상을 받고 다음 막의 새 지도로 */
function noteSheet(title, text, icon, next) {
  sheet(`<h2 id="cardTitle">${title}</h2><div class="opts"><div class="opt"><span class="ic">${svg(ICON[icon])}</span><span class="tx"><span>${text}</span></span></div></div><button class="cta" type="button" data-act="go" data-pref>확인</button>`, () => { closeSheet(); next(); });
}
/* 가진 무기 하나를 골라 1레벨 올려요 */

/* ───── 모험의 시작과 끝 ───── */
function newRun() {
  run = S.run = { v: 4, stage: 0, cur: null, hp: 1, maxHp: 1, gold: 0, potion: false, kills: 0, elites: 0,
    wpn: [], lvl: 1, xp: 0, bonus: { spd: 0, dmg: 0, crit: 0, heart: 0 }, rerolls: 0, relics: [], eq: {}, inv: [], iv: 2, dmg: {}, hits: 0, hitBy: {}, time: 0, petUsed: 0 };
  heroDirty(); persist(); showMap();
  sheet(`<div class="pic"><img src="${heroUrl(4)}" alt=""></div><h2 id="cardTitle">간식 왕국을 지켜요</h2><p>상한 간식들이 왕국을 차지했어요. 스테이지를 하나씩 깨며 나아가요. 5번째 스테이지마다 보스가 기다려요.</p><p>화면을 누른 채 끌어서 움직이기만 하면 돼요. 공격은 저절로 나가요. 레벨이 오르면 무기와 능력을 골라요. 스테이지를 깨면 장비를 받아요. 한 번 얻은 건 계속 이어지고, 쓰러져도 사라지지 않아요.</p><button class="cta" type="button" data-act="go" data-pref>출발하기</button>`, () => { sfx.tap(); starterPick(); });
}
/* 출발할 때 첫 무기를 골라요 (성장 트리에 따라 하나 더, 또는 Lv3으로) */
function starterPick() {
  const ids = shuffle(['pin', 'cream', 'lemon', 'skewer', 'choco', 'cotton', 'cane'].filter(id => !wLv(id))).slice(0, 3);     // 혼자서도 싸울 수 있는 무기 중에서
  sheet(`<h2 id="cardTitle">첫 무기 고르기</h2><p>무기 1개를 골라 들고 가요.</p><div class="opts">${ids.map((id, i) => wOpt(id, i)).join('')}</div>`,
    (act, b) => { if (act !== 'pick' || b.closest('.lock')) return; run.wpn.push({ id: ids[+b.dataset.i], lv: 1 }); persist(); sfx.good(); closeSheet(); showMap(); });
  flipReveal();
}
function endStars(r, won) { const n = sugarStars(r, won); S.meta.pts += n; S.meta.total += n; return n; }
function gameOver(id, r) {
  const s = STAGES[id - 1]; S.meta.pts += 1; S.meta.total += 1; recordRun(false, 1, null); persist(); showMap();
  const steps = []; for (let i = 0; i < (run.picks || 0); i++) steps.push(next => { run.picks--; levelSheet(rollLevelOpts(), next, run.lvl - run.picks); });
  steps.push(() => sheet(`<div class="pic"><img src="img/${s.boss ? FOES[s.boss].img : 'jelly'}.png" alt=""></div><h2 id="cardTitle">쓰러졌어요</h2><p>${id}. ${s.n}에서 쓰러졌어요. 적 ${r.kills}마리를 잡았어요. 이번에 얻은 경험치와 레벨은 그대로 남아요.</p><p class="pts">설탕 별 <b>+1</b>개 · 지금 ${S.meta.pts}개</p><button class="cta" type="button" data-act="retry" data-pref>다시 도전하기</button><button class="btn" type="button" data-act="tree">성장 트리에서 강해지기</button><button class="btn" type="button" data-act="go">스테이지 고르기</button>`, act => { closeSheet(); persist(); if (act === 'retry') enter(id); else if (act === 'tree') treeSheet(() => showMap()); else showMap(); }));
  const go = () => { const st = steps.shift(); if (st) st(go); };
  go();
}
/* 예전 저장(지도 모험)을 새 구조로 옮겨요: 무기와 레벨은 그대로, 스테이지는 1부터 */
function migrate() {
  if (S.meta.n && S.meta.n.hp) { const c = [45, 110, 220].slice(0, S.meta.n.hp).reduce((a, b) => a + b, 0); S.meta.pts += c; delete S.meta.n.hp; S.legNote = (S.legNote ? S.legNote + ' ' : '') + `성장 트리의 하트 칸이 없어지고 '아슬아슬 피하기'로 바뀌었어요. 하트 칸에 쓴 설탕 별 <b>${c}개</b>를 돌려줬어요.`; persist(); }      /* 트리의 하트 칸은 없어졌어요: 쓴 별을 돌려줘요 */
  if ((S.meta.tv || 1) < 2) { S.meta.pts = S.meta.total; S.meta.n = {}; S.meta.tv = 2; S.treeReset = S.meta.total > 0; persist(); }
  const o = S.run; if (!o) return; if (o.v === 3) { const conv = it => it && !it.fx ? rollItem(it.n || 1, it.g, it.s) : it; o.inv = (o.inv || []).map(conv); for (const s of Object.keys(o.eq || {})) { if (o.eq[s] && !o.eq[s].fx) { const ni = conv(o.eq[s]); ni.g = o.eq[s].g; o.eq[s] = ni; } } o.v = 4; persist(); return; } if (o.v === 4) return;
  /* 예전 유물은 같은 효과를 가진 영웅 장비로 바꿔서 가방에 넣어 줘요 */
  const inv = [], slotOf = { whisk: 'gloves', cup: 'helm', boots: 'shoes', sprinkle: 'cape', cloud: 'armor', apron: 'armor' };
  for (const id of (o.relics || [])) if (slotOf[id]) { const it = rollItem(Math.max(1, o.stage || 1), 3, slotOf[id]); it.g = 3; inv.push(it); }
  S.run = { v: 4, stage: o.v === 2 ? o.stage || 0 : 0, cur: null, hp: 3, maxHp: 3, gold: 0, potion: false, kills: 0, elites: 0, wpn: (o.wpn || []).filter(w => WEAPONS[w.id]), lvl: o.lvl || 1, xp: o.xp || 0,
    bonus: Object.assign({ spd: 0, dmg: 0, crit: 0, heart: 0 }, o.bonus || {}), rerolls: 0, relics: [], eq: {}, inv, dmg: {}, hits: 0, hitBy: {}, time: 0, petUsed: 0, picks: o.picks || 0 };
  run = S.run; autoEquip(); run = null; persist();
}
/* 예전에 모은 전설 조각은 조각 한 개당 무작위 기본 스킬 레벨업 1번으로 바꿔 줘요 (전설로 깨어난 것도 같아요). 이미 전부 마스터했으면 그대로 둬요 */
function convertShards() {
  const o = S.run; if (!o || !o.shards) return; const was = run; run = o;
  if (legUnlocked()) { run = was; return; }
  let n = Object.values(o.shards).reduce((a, b) => a + b, 0), done = 0; const got = {};
  while (n > 0) { const c = Object.keys(WEAPONS).filter(id => wLv(id) < WMAX); if (!c.length) break; const id = pick(c); applyLevel({ t: 'w', id }); got[id] = (got[id] || 0) + 1; n--; done++; }
  o.shards = null; o.leg = null; run = was; S.legNote = `전설 조각 ${done}개를 무작위 기본 스킬 레벨업으로 바꿔 줬어요: ${Object.entries(got).map(([id, k]) => `${WEAPONS[id].name} +${k}`).join(', ')}. 전설 조각은 기본 스킬 10개를 모두 Lv10으로 만든 뒤에 나와요.`; persist();
}
/* 예전 장비를 새 규칙으로: 옷은 등급별 방어 효과로, 망토는 치명타 피해 추가, 영웅 이상은 고유 효과 */
function fixLw() {      /* 예전에 얻은 전설 장비에도 스킬 강화를 붙여요 */
  const o = S.run; if (!o) return; const was = run; run = o; let ch = 0;
  for (const it of [...(o.inv || []), ...Object.values(o.eq || {})]) if (it && it.g === 4 && (!it.lw || it.sp)) { rollLw(it); it.sp = null; ch++; }
  run = was; if (ch) persist();
}
function upgradeItems() {
  const o = S.run; if (!o || o.iv >= 2) return; const was = run; run = o;
  for (const it of [...(o.inv || []), ...Object.values(o.eq || {})]) { if (!it || !it.fx) continue;
    if (it.s === 'armor') { const lk = 1 + 0.01 * ((it.n || 1) - 1); it.fx = {}; armorFx(it.fx, it.g, lk); }
    if (it.s === 'cape' && it.fx.critd == null) it.fx.critd = [6, 10, 15, 22, 30][it.g];
    if (!it.sp) rollSp(it); }
  o.iv = 2; run = was; persist();
}
function resetSheet() {
  sheet(`<h2 id="cardTitle">정말 처음부터 할까요?</h2><p>캐릭터의 레벨, 무기, 장비와 깬 스테이지 기록이 지워져요. 성장 트리, 펫, 꾸미기는 그대로 남아요. 실수로 누르지 않게 버튼은 잠깐 뒤에 눌려요.</p><button class="cta" type="button" data-act="no" data-pref>그만두기</button><div class="dzone"><button class="btn danger" type="button" data-act="yes" aria-disabled="true" data-wait="3">캐릭터만 지우기</button><button class="btn danger" type="button" data-act="all" aria-disabled="true" data-wait="3">전부 지우기 (트리·펫·꾸미기까지)</button></div>`, (act, b) => { if (b && b.getAttribute('aria-disabled') === 'true') { sfx.no(); return; } closeSheet(); if (act === 'yes') { run = S.run = null; heroDirty(); persist(); show('title'); renderTitle(); } if (act === 'all') allResetSheet(); });
  armDanger();
}
/* 위험한 버튼: 몇 초 기다려야 눌려요 (남은 초를 보여 줘요) */
function armDanger() {
  for (const b of cardEl.querySelectorAll('[data-wait]')) { const lab = b.textContent; let n = +b.dataset.wait; b.textContent = `${lab} (${n})`;
    const iv = setInterval(() => { if (!b.isConnected) { clearInterval(iv); return; } n--; if (n > 0) b.textContent = `${lab} (${n})`; else { clearInterval(iv); b.textContent = lab; b.removeAttribute('aria-disabled'); } }, 1000); }
}
function allResetSheet() {      /* 완전 초기화: 이 기기의 저장을 통째로 지워요 */
  sheet(`<h2 id="cardTitle">정말 전부 지울까요?</h2><p>레벨, 스테이지, 장비, 성장 트리, 하트, 펫, 꾸미기까지 이 기기의 기록이 모두 사라져요. 되돌릴 수 없어요.</p><button class="cta" type="button" data-act="no" data-pref>그만두기</button><div class="dzone"><button class="btn danger" type="button" data-act="yes" aria-disabled="true" data-wait="5">전부 지우기</button></div>`, (act, b) => { if (b && b.getAttribute('aria-disabled') === 'true') { sfx.no(); return; } closeSheet(); if (act === 'yes') { wiped = true; try { localStorage.setItem(WKEY, String(Date.now())); localStorage.removeItem(KEY); } catch (_) {} location.reload(); } });
  armDanger();
}
/* ───── 처음 화면, 메뉴, 설치 ───── */
let installEvt = null, newArmed = 0;
const isInstalled = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
/* 카톡·네이버·인스타 같은 앱 안 브라우저에서는 설치가 안 돼요. 안드로이드면 크롬으로 바로 넘겨 줘요 */
const UA = navigator.userAgent, inApp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp|; wv\)/i.test(UA), isAndroid = /Android/i.test(UA), isSamsung = /SamsungBrowser/i.test(UA), isIOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const chromeUrl = () => `intent://${location.host}${location.pathname}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(location.href)};end`;
function installHelp() {
  if (isIOS) {      /* 아이폰: 사파리 공유 버튼 → 홈 화면에 추가 */
    sheet(`<h2 id="cardTitle">홈 화면에 추가하기</h2><p>${inApp ? '지금은 <b>카카오톡 같은 앱 안의 브라우저</b>예요. 오른쪽 아래 점 세 개나 공유 버튼에서 <b>Safari로 열기</b>를 먼저 눌러 주세요.' : '아이폰은 <b>사파리</b>에서 하는 게 가장 확실해요.'}</p><div class="opts">
      <div class="opt"><span class="tx"><b>1. 공유 버튼</b><span>화면 아래 가운데의 <b>공유 버튼</b>(네모에서 화살표가 위로 나온 모양)을 눌러요.</span></span></div>
      <div class="opt"><span class="tx"><b>2. 홈 화면에 추가</b><span>목록을 아래로 내려서 <b>홈 화면에 추가</b>를 눌러요.</span></span></div>
      <div class="opt"><span class="tx"><b>3. 추가</b><span>오른쪽 위 <b>추가</b>를 누르면 바탕화면에 아이콘이 생겨요. 그다음부터는 아이콘으로 열어 주세요. 사파리와 아이콘은 기록이 따로 저장돼요.</span></span></div>
    </div><button class="btn" type="button" data-act="close">닫기</button>`, () => closeSheet());
    return;
  }
  const where = inApp ? '지금은 <b>카카오톡 같은 앱 안의 브라우저</b>로 열려 있어서 설치가 안 돼요. 아래 버튼으로 크롬에서 다시 열어 주세요.' : isSamsung ? '지금은 <b>삼성 인터넷</b>이에요.' : '지금은 <b>크롬</b>이에요.';
  const steps = isSamsung
    ? '<b>삼성 인터넷</b>: 아래쪽 줄 세 개 메뉴 → <b>현재 페이지 추가</b> → <b>홈 화면</b>. 안 되면 크롬으로 열어 주세요.'
    : '<b>크롬</b>: 오른쪽 위 점 세 개 메뉴 → <b>홈 화면에 추가</b> → <b>설치</b>. 메뉴에 <b>앱 설치</b>가 보이면 그걸 눌러도 돼요.';
  sheet(`<h2 id="cardTitle">홈 화면에 설치하기</h2><p>${where}</p><div class="opts">
    <div class="opt"><span class="tx"><b>1. 설치하기</b><span>${steps}</span></span></div>
    <div class="opt"><span class="tx"><b>2. 그래도 안 되면</b><span>홈 화면 빈 곳을 길게 눌러 <b>설정</b>에 들어가서 <b>홈 화면 레이아웃 잠금</b>을 꺼 주세요. 이게 켜져 있으면 아이콘이 안 생겨요.</span></span></div>
    <div class="opt"><span class="tx"><b>3. 그래도 안 되면</b><span>설정 → 애플리케이션 → Chrome에서 <b>홈 화면에 아이콘 추가</b> 같은 권한이 꺼져 있지 않은지 봐 주세요. 그 화면을 찍어 보내 주면 원인을 찾아볼게요.</span></span></div>
  </div>${isAndroid && !isSamsung ? `<a class="cta" href="${chromeUrl()}" data-act="none" style="display:flex;text-decoration:none">크롬으로 열기</a>` : ''}${installEvt ? '<button class="cta" type="button" data-act="install">지금 설치하기</button>' : ''}<button class="btn" type="button" data-act="close">닫기</button>`,
    act => { if (act === 'install') { installEvt.prompt(); installEvt = null; renderTitle(); } if (act !== 'none') closeSheet(); });
}
function renderTitle() {
  const going = !!S.run;
  $('#btnContinue').hidden = true;
  const b = $('#btnNew'); b.className = 'cta green'; b.textContent = going ? '모험 계속하기' : '모험 떠나기';
  $('#titleSub').textContent = going ? `스테이지 ${Math.min(S.run.stage + 1, STAGES.length)} · Lv ${S.run.lvl} · 무기 ${S.run.wpn.length}개` : '저절로 공격하는 전투. 스테이지를 하나씩 깨며 계속 강해져요.';
  $('#btnTree').textContent = `성장 트리 · 설탕 별 ${S.meta.pts}개`;
  $('#btnPet').textContent = S.pet ? `펫 · ${petTeam().map(id => `${PETS[id].name.split(' ').pop()} Lv${petLv(id)}`).join(' + ')}` : '펫';
  $('#btnInstall').hidden = isInstalled; $('#btnInstall').textContent = inApp ? '크롬에서 열어야 설치돼요' : installEvt ? '홈 화면에 앱으로 설치하기' : '홈 화면에 설치하는 방법'; clearTimeout(newArmed); newArmed = 0;
}
/* 지금 버전: 서비스 워커 파일에 적힌 이름(sweet-xxxx)을 처음 화면 아래에 작게 보여 줘요 */
fetch('sw.js', { cache: 'no-store' }).catch(() => fetch('sw.js')).then(r => r && r.text()).then(t => { const m = t && /sweet-([0-9a-f]+)/.exec(t); if (m) { window.__ver = m[1]; const e = $('#verTag'); if (e) e.textContent = '버전 ' + m[1].slice(0, 6); } }).catch(() => {});
$('#verTag') && $('#verTag').addEventListener('click', async () => {
  const e = $('#verTag'); e.textContent = '새 버전 확인 중…';
  try { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update(); const t = await (await fetch('sw.js', { cache: 'no-store' })).text(), m = /sweet-([0-9a-f]+)/.exec(t);
    if (m && window.__ver && m[1] !== window.__ver) { e.textContent = '새 버전을 받았어요. 다시 여는 중…'; setTimeout(() => location.reload(), 600); } else e.textContent = '최신 버전이에요 · ' + (window.__ver || '').slice(0, 6);
  } catch (err) { e.textContent = '인터넷이 연결되면 확인할 수 있어요'; }
});
$('#btnContinue').addEventListener('click', () => { run = S.run; sfx.tap(); showMap(); });
$('#btnTree').addEventListener('click', () => { sfx.tap(); treeSheet(() => renderTitle()); });
$('#btnPet').addEventListener('click', () => { sfx.tap(); petSheet(() => renderTitle()); });
$('#btnRec').addEventListener('click', () => { sfx.tap(); exportSheet(); });
$('#btnNew').addEventListener('click', () => { sfx.tap(); if (S.run) { run = S.run; showMap(); } else newRun(); });
function menuSheet(home) {
  const row = (act, t, d) => `<button class="opt" type="button" data-act="${act}"><span class="tx"><b>${t}</b><span>${d}</span></span></button>`;
  const draw = () => sheet(`<h2 id="cardTitle">${home ? '메뉴' : '설정'}</h2><div class="opts">` + row('sound', S.muted ? '소리 켜기' : '소리 끄기', `지금은 소리가 ${S.muted ? '꺼져' : '켜져'} 있어요.`)
    + (navigator.vibrate ? row('vib', `진동: ${LVN[vibLv()]}`, '누를 때마다 보통 → 줄임 → 끔 순서로 바뀌어요.') : '')
    + row('lega', `전설 이펙트 진하기: ${Math.round(legAlpha() * 100)}%`, '누를 때마다 20 → 40 → 60 → 80 → 100% 순서로 바뀌어요. 낮을수록 캐릭터와 적이 잘 보여요.')
    + row('shk', `화면 흔들림: ${LVN[shkLv()]}`, '누를 때마다 보통 → 줄임 → 끔 순서로 바뀌어요. 흔들림이 어지러우면 줄여요.')
    + row('music', S.music === false ? '배경음악 켜기' : '배경음악 끄기', `지금은 배경음악이 ${S.music === false ? '꺼져' : '켜져'} 있어요.`)
    + (home ? row('rec', '기록 보내기', '플레이 기록을 코드로 만들어 보내요.') + row('home', '처음 화면으로 가기', '모험은 저장돼 있어서 이어서 할 수 있어요.') : '') + `</div><button class="cta" type="button" data-act="close" data-pref>닫기</button>${home ? '' : '<button class="dlink" type="button" data-act="reset">기록 초기화…</button>'}`,      /* 초기화는 처음 화면 설정의 맨 아래, 닫기와 멀리 떨어진 작은 글씨로만 */
    act => { if (act === 'reset') { resetSheet(); return; } if (act === 'music') { S.music = S.music === false; persist(); setMusicVol(); sfx.tap(); draw(); return; } if (act === 'diff') { const k = Object.keys(DIFF); S.diff = k[(k.indexOf(S.diff) + 1) % k.length]; persist(); sfx.tap(); draw(); } else if (act === 'sound') { S.muted = !S.muted; persist(); setMusicVol(); sfx.tap(); draw(); } else if (act === 'vib') { S.vibK = (vibLv() + 2) % 3; persist(); buzz(20); draw(); } else if (act === 'lega') { const c = Math.round(legAlpha() * 100); S.legA = LEG_AS[(LEG_AS.indexOf(c) + 1) % LEG_AS.length]; persist(); sfx.tap(); draw(); } else if (act === 'shk') { S.shkK = (shkLv() + 2) % 3; persist(); sfx.tap(); draw(); } else if (act === 'rec') { exportSheet(); } else if (act === 'home') { closeSheet(); show('title'); renderTitle(); } else closeSheet(); });
  draw();
}
$('#btnMenu').addEventListener('click', () => menuSheet(true));
$('#btnSet').addEventListener('click', () => menuSheet(false));
addEventListener('pointerdown', () => { if (!headless && !S.muted) audio(); }, { once: true });
$('#btnInstall').addEventListener('click', () => { sfx.tap(); if (installEvt && !inApp) { installEvt.prompt(); installEvt.userChoice.then(c => { if (c && c.outcome !== 'accepted') installHelp(); }).catch(() => {}); installEvt = null; renderTitle(); } else installHelp(); });
addEventListener('appinstalled', () => { installEvt = null; renderTitle(); });
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; renderTitle(); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  /* 새 버전이 깔리면 전투 중이 아닐 때 저절로 새로 고쳐요 (예전엔 앱을 두 번 껐다 켜야 했어요) */
  const hadCtrl = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadCtrl || reloaded) return; const go = () => { if (B) { setTimeout(go, 2000); return; } reloaded = true; location.reload(); }; go(); });
  navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {});
}
document.addEventListener('gesturestart', e => e.preventDefault());

/* 테스트용: 화면을 그리지 않고 전투 하나를 끝까지 빨리 돌려요 */
window.__dbg = {
  simBattle(kind, floor) { headless = true; startBattle(kind, floor, () => {}); B.auto = true; for (let i = 0; i < 30 * 320 && !B.over; i++) update(1 / 30); const out = B.result; B = null; headless = false; return out; },
  simStage(n) { headless = true; stagePrep(n); const s = STAGES[n - 1]; startBattle(s.boss ? 'boss' : 'battle', stageDiff(n), () => {}, s); B.auto = true; for (let i = 0; i < 30 * 320 && !B.over; i++) update(1 / 30); const out = B.result; B = null; headless = false; return out; },
  auto(on) { if (B) B.auto = on; }
};

/* 제목과 지도 뒤의 배경: 해 질 녘 과자 도시를 낮은 해상도로 한 번 그려요 */
function drawBg() {
  const c = $('#bgCv'), px = Math.max(2, Math.round(innerWidth / 195)), W = Math.ceil(innerWidth / px), H = Math.ceil(innerHeight / px); c.width = W; c.height = H;
  const q = c.getContext('2d'), r = (col, x, y, w, h) => { q.fillStyle = col; q.fillRect(x, y, w, h); }, hz = Math.round(H * 0.62), stops = ['#1A0E3A', '#3A1858', '#7A2A6E', '#D9566E', '#FF9A6B'];
  for (let y = 0; y < hz; y++) for (let x = 0; x < W; x++) { const t = y / hz * (stops.length - 1), k = Math.floor(t); q.fillStyle = (t - k) * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? stops[Math.min(k + 1, stops.length - 1)] : stops[k]; q.fillRect(x, y, 1, 1); }
  for (let i = 0; i < 60; i++) r(i % 5 ? '#B9A2FF' : '#FFFFFF', (i * 37) % W, (i * 53) % Math.round(hz * 0.55), 1, 1);
  const mx = Math.round(W * 0.72), my = Math.round(H * 0.09); r('#FFE7B0', mx, my, 18, 18); r('#FFE7B0', mx - 2, my + 3, 22, 12); r('#FFE7B0', mx + 3, my - 2, 12, 22); r('#F4C98A', mx + 5, my + 5, 4, 4); r('#F4C98A', mx + 11, my + 10, 3, 3);
  let x = -4, i = 0; while (x < W) { const w = 12 + (i * 7) % 12, h = 40 + (i * 29) % 46; r('#4A1E5E', x, hz - h, w, h + 4); r('#4A1E5E', x + 2, hz - h - 4, w - 4, 4); r('#4A1E5E', x + (w >> 1) - 1, hz - h - 11, 2, 7); for (let k = 0; k < 5; k++) r((i + k) % 3 ? '#FF4F9A' : '#7FE3FF', x + 2 + (k * 5 + i * 3) % (w - 3), hz - h + 6 + (k * 11 + i * 5) % (h - 8), 1, 2); x += w + 3 + (i * 5) % 6; i++; }
  x = -6; i = 0; while (x < W) { const w = 20 + (i * 11) % 22, h = 14 + (i * 13) % 20; r('#2A0E38', x, hz - h, w, h + 4); for (let k = 0; k < w; k += 4) r('#2A0E38', x + k, hz - h - 2, 2, 2); for (let k = 0; k < 3; k++) r('#FFD86B', x + 3 + (k * 7 + i) % (w - 5), hz - h + 4 + (k * 5) % (h - 4), 2, 2); x += w + (i * 3) % 5; i++; }
  r('#1A0E22', 0, hz, W, H - hz); for (let k = 0; k < W; k += 2) r('#2A1838', k, hz, 1, 1);
}
addEventListener('resize', drawBg);
Promise.all([loadImages(), ...Object.values(ICON).concat(HEART_EMPTY).map(pixelIcon), ...(document.fonts ? ['12px Galmuri11', '12px Galmuri11B'].map(f => document.fonts.load(f, '가0').catch(() => {})) : [])]).then(() => { migrate(); upgradeItems(); convertShards(); fixLw(); if (S.treeReset || S.legNote) { const parts = []; if (S.treeReset) parts.push('<p>성장 트리가 새로워져서, 지금까지 쓴 설탕 별을 <b>모두 돌려줬어요</b>. 다시 골라서 배워요.</p>'); if (S.legNote) parts.push(`<p>${S.legNote}</p>`); const t = '게임이 새로워졌어요'; S.treeReset = false; S.legNote = null; persist(); setTimeout(() => sheet(`<h2 id="cardTitle">${t}</h2>${parts.join('')}<button class="cta" type="button" data-act="go" data-pref>확인</button>`, () => { closeSheet(); }), 400); } run = S.run; buildHero(); run = null; document.querySelector('.t-art .h').src = heroUrl(4); drawBg(); show('title'); renderTitle(); });
