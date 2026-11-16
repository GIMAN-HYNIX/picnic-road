'use strict';
/* 쪈이의 디저트 대작전 — 전투는 이동만 하는 자동 공격, 전투 사이에는 갈림길을 고르고 카드 덱을 짜는 게임 */

const $ = s => document.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const rnd = n => Math.floor(Math.random() * n), rand = (a, b) => a + Math.random() * (b - a), pick = a => a[rnd(a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/* 아이콘: 벡터 그림을 16칸 픽셀 그림으로 바꿔 두고 써요 (바꾸기 전에는 벡터 그대로) */
const PXI = new Map();
const svg = inner => inner[0] === '@' ? `<img class="pxi" src="${PAPER.icon(inner.slice(1))}" alt="" aria-hidden="true">` : `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${inner}</svg>`;
function pixelIcon() { return Promise.resolve(); }

/* ───── 저장 (이 폰에만) ───── */
const KEY = 'sweet-kingdom-v1';
let S = { muted: false, vib: true, wins: 0, run: null };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
if (S.run && S.run.maxHp > 10) { const r = S.run, m = 3 + (r.relics || []).includes('apron'); r.hp = Math.max(1, Math.round(r.hp / r.maxHp * m)); r.maxHp = m; }
/* 난이도: 적이 나오는 수, 적 속도, 적 체력, 맞은 뒤 무적 시간, 엘리트·보스 공격 예고 시간 */
const DIFF = {
  easy: { name: '쉬움', spawn: 0.7, spd: 0.85, hp: 0.72, inv: 1.7, warn: 1.3, desc: '적이 적고 느려요. 맞은 뒤 무적 시간이 길어요.' },
  normal: { name: '보통', spawn: 1, spd: 1, hp: 1, inv: 1.3, warn: 1, desc: '원래 난이도예요.' },
  hard: { name: '어려움', spawn: 1.2, spd: 1.08, hp: 1.2, inv: 1.1, warn: 0.85, desc: '적이 많고 빨라요.' }
};
S.diff = 'normal';                 // 난이도는 보통으로 고정
const DF = () => DIFF.normal;
if (S.run && S.run.deck && !S.run.wpn) {   // 예전 덱 저장을 새 무기 방식으로 옮겨요
  const r = S.run, ids = [...new Set(r.deck.map(c => c.id))].filter(id => ['pin', 'cream', 'star', 'macaron', 'honey', 'lemon', 'skewer'].includes(id));
  r.wpn = (ids.length ? ids : ['pin']).map(id => ({ id, lv: 1 })); r.lvl = 1; r.xp = 0; r.bonus = { spd: 0, dmg: 0, crit: 0 }; r.rerolls = 0; delete r.deck; delete r.equip;
}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
let run = null;

/* ───── 펫: 모험이 끝날 때마다 하나를 얻어요. 같은 펫을 또 얻으면 레벨이 올라요 (최고 Lv5) ───── */
const PETS = {
  kong: { name: '젤리곰 콩이', desc: '가끔 멀리 있는 보석까지 한 번에 모아 와요.', lvDesc: lv => `${Math.max(2.5, 7 - lv).toFixed(1)}초마다, 반경 ${130 + 35 * lv}` },
  shu: { name: '천사 슈', desc: '하트가 다 닳는 순간 부활시켜 주고 적을 모두 없애요. 보스는 일부 피해만 받아요.', lvDesc: lv => `모험마다 ${lv >= 5 ? 3 : lv >= 3 ? 2 : 1}번, 하트 ${1 + (lv >= 2) + (lv >= 4)}칸으로 부활, 보스 체력 ${8 + 2 * lv}% 피해` },
  byul: { name: '별사탕 요정 별이', desc: '가까운 적에게 작은 별사탕을 쏴요.', lvDesc: lv => `${Math.max(0.35, 1.1 - 0.15 * lv).toFixed(2)}초마다, 피해 ${8 + 4 * lv}` }
};
const PMAX = 5;
if (!S.pets || typeof S.pets !== 'object') S.pets = {};
const petLv = id => Math.min(PMAX, S.pets[id] || 0);
/* 펫 꾸미기: 펫마다 모자, 얼굴, 목에 하나씩 */
if (!S.look || typeof S.look !== 'object') S.look = {};
const lookOf = id => S.look[id] || {};
const petImg = id => `<img src="${PAPER.petUrl(id, lookOf(id))}" alt="">`;
/* 모험이 끝나면 펫 하나 */
function gainPet() {
  const id = pick(Object.keys(PETS)), was = petLv(id);
  if (was >= PMAX) { S.meta.pts += 5; S.meta.total += 5; return { id, lv: was, extra: 5 }; }
  S.pets[id] = (S.pets[id] || 0) + 1; if (!S.pet) S.pet = id;
  return { id, lv: petLv(id), isNew: was === 0 };
}
function petLine(g) { return `<div class="opt r2 petget"><span class="ic">${petImg(g.id)}</span><span class="tx"><b>${g.isNew ? '새 펫' : '펫 레벨 업'}: ${PETS[g.id].name} Lv${g.lv}</b><span>${g.extra ? `이미 최고 레벨이라 설탕 별 ${g.extra}개로 바꿨어요.` : PETS[g.id].desc}</span></span></div>`; }
function petSheet(back) {
  const draw = () => { const cur = S.pet && petLv(S.pet) ? S.pet : null, lk = cur ? lookOf(cur) : {};
    sheet(`<h2 id="cardTitle">펫</h2><p>모험이 끝날 때마다 하나를 얻어요. 같은 펫이면 레벨이 올라요. 데리고 갈 펫을 고르고 옷을 입혀 봐요.</p>${cur ? `<div class="petroom"><img src="${PAPER.petUrl(cur, lk, 120)}" alt=""></div>${Object.entries(PAPER.ITEMS).map(([slot, s]) => `<div class="dress"><span>${s.name}</span><button class="dchip${lk[slot] ? '' : ' on'}" type="button" data-act="wear" data-slot="${slot}" data-id="">없음</button>${Object.entries(s.list).map(([id, [nm]]) => `<button class="dchip${lk[slot] === id ? ' on' : ''}" type="button" data-act="wear" data-slot="${slot}" data-id="${id}" aria-label="${nm}"><img src="${PAPER.itemIcon(slot, id)}" alt=""></button>`).join('')}</div>`).join('')}` : ''}<div class="opts">${Object.keys(PETS).map(id => { const lv = petLv(id); return `<button class="opt${S.pet === id ? ' on' : ''}" type="button" data-act="pet" data-id="${id}"${lv ? '' : ' aria-disabled="true"'}><span class="ic">${lv ? petImg(id) : '?'}</span><span class="tx"><b>${lv ? `${PETS[id].name} Lv${lv}` : '아직 못 만났어요'}</b><span>${lv ? `${PETS[id].desc} (${PETS[id].lvDesc(lv)})` : '모험을 끝내면 만날 수 있어요.'}</span></span></button>`; }).join('')}</div><button class="btn" type="button" data-act="close">닫기</button>`,
    (act, b) => { if (act === 'close') { closeSheet(); if (back) back(); return; }
      if (act === 'wear') { const l = S.look[S.pet] = { ...lookOf(S.pet) }; if (b.dataset.id) l[b.dataset.slot] = b.dataset.id; else delete l[b.dataset.slot]; persist(); sfx.tap(); draw(); return; }
      S.pet = b.dataset.id; persist(); sfx.tap(); draw(); }); };
  draw();
}
/* 전투 속 펫 */
function petStart() {
  const id = S.pet, lv = petLv(id); if (!lv) return null;
  return { id, lv, x: B.p.x - 20, y: B.p.y, cd: 2, t: 0, go: null };
}
function petUpdate(dt) {
  const P = B.pet; if (!P) return; const p = B.p; P.t += dt; P.cd -= dt;
  let tx = p.x - 22 * p.face, ty = p.y - 18;
  if (P.go) { tx = P.go.x; ty = P.go.y; P.go.t -= dt; if (P.go.t <= 0) P.go = null; }
  const k = Math.min(1, dt * (P.go ? 12 : 6)); P.x += (tx - P.x) * k; P.y += (ty - P.y) * k;
  if (P.id === 'kong' && P.cd <= 0) {
    P.cd = Math.max(2.5, 7 - P.lv); const R = 130 + 35 * P.lv;
    let best = null, bn = 0; for (const g of B.gems) { if (g.pull) continue; let n = 0; for (const h of B.gems) if (Math.abs(h.x - g.x) < 90 && Math.abs(h.y - g.y) < 90) n++; if (n > bn && (g.x - p.x) ** 2 + (g.y - p.y) ** 2 < 600 * 600) { bn = n; best = g; } }
    if (best) { P.go = { x: best.x, y: best.y, t: 0.35 }; for (const g of B.gems) if ((g.x - best.x) ** 2 + (g.y - best.y) ** 2 < R * R) { g.vz = null; g.z = 0; g.pull = true; g.sp = 300; } if (!headless) { fxAdd({ k: 'ring', x: best.x, y: best.y, r: 10, to: R, life: 0.35, max: 0.35, col: '#FF9A3D', w: 4 }); sfx.gem(6); } }
  }
  if (P.id === 'byul' && P.cd <= 0) {
    const t = nearestFoe(300, P); if (!t) { P.cd = 0.2; return; } P.cd = Math.max(0.35, 1.1 - 0.15 * P.lv);
    const a = Math.atan2(t.y - P.y, t.x - P.x); B.shots.push({ k: 'star', x: P.x, y: P.y, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, r: 5, dmg: 8 + 4 * P.lv, pierce: 0, life: 1, w: { id: 'pet' }, hit: new Set() });
  }
}
/* 천사 슈: 부활 + 적 전부 없애기 (보스는 일부만) */
function petRevive() {
  const P = B.pet; if (!P || P.id !== 'shu') return false;
  const uses = P.lv >= 5 ? 3 : P.lv >= 3 ? 2 : 1; if ((run.petUsed || 0) >= uses) return false;
  run.petUsed = (run.petUsed || 0) + 1; const p = B.p; p.hp = Math.min(p.max, 1 + (P.lv >= 2) + (P.lv >= 4)); p.inv = 2.5;
  for (const f of B.foes) { if (f.dead) continue; if (f === B.big) hurtFoe(f, f.max * (0.08 + 0.02 * P.lv) / B.st.dmg, { id: 'pet' }); else { f.hp = 0; killFoe(f, { id: 'pet' }); } }
  B.foeShots = []; B.telegraphs = [];
  if (!headless) { toast('천사 슈가 다시 일으켜 줬어요!'); sfx.revive(); sfx.bigKill(); B.flashScr = { col: '255,255,255', t: 0.6, max: 0.6 }; fxAdd({ k: 'beam', x: p.x, y: p.y, life: 0.9, max: 0.9 }); fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 20, to: 420, life: 0.6, max: 0.6, col: '#FFE45C', w: 8 }); }
  return true;
}
/* ───── 플레이 기록: 기기마다 저장하고, 코드로 바꿔 리포트 페이지에 붙여 넣어요 ───── */
if (!Array.isArray(S.hist)) S.hist = [];
if (!S.dev) S.dev = Math.random().toString(36).slice(2, 8);
function recordRun(won, stars, petGot) {
  const t = Math.round(run.time || 0), dmg = run.dmg || {};
  S.hist.push({ id: S.dev + '-' + Date.now().toString(36), dev: S.dev, nm: S.devName || '', at: Date.now(), won: won ? 1 : 0, act: actOf(), fl: floorNo(), rows: run.map.rows || 8, lv: run.lvl, k: run.kills || 0, t, hits: run.hits || 0, by: run.hitBy || {}, el: run.elites || 0,
    w: run.wpn.map(w => [w.id, w.lv, Math.round(dmg[w.id] || 0)]), pd: Math.round(dmg.pet || 0), ac: Math.round(dmg.acid || 0), b: run.bonus, hp: run.maxHp, pet: S.pet ? [S.pet, petLv(S.pet)] : null, pg: petGot ? petGot.id : null, st: stars, tree: S.meta.total - S.meta.pts, rel: run.relics.length });
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
const TREE = [
  { id: 'atk', name: '단단한 팔', desc: '모든 피해 +5%', max: 5, cost: [1, 2, 2, 3, 3], col: 0, row: 0, icon: 'star' },
  { id: 'hp', name: '포근한 앞치마', desc: '최대 하트 +1칸', max: 2, cost: [5, 10], col: 2, row: 0, icon: 'heart' },
  { id: 'spd', name: '가벼운 신발', desc: '이동 속도 +4%', max: 5, cost: [1, 2, 2, 3, 3], col: 4, row: 0, icon: 'honey' },
  { id: 'crit', name: '날카로운 눈', desc: '치명타 확률 +3%', max: 5, cost: [2, 2, 3, 3, 4], col: 0, row: 1, req: 'atk', icon: 'ench' },
  { id: 'guard', name: '설탕 갑옷', desc: '맞은 뒤 무적 시간 +15%', max: 3, cost: [2, 3, 4], col: 2, row: 1, req: 'hp', icon: 'dough' },
  { id: 'mag', name: '설탕 자석', desc: '보석 줍는 거리 +20%', max: 3, cost: [1, 2, 3], col: 4, row: 1, req: 'spd', icon: 'magnet' },
  { id: 'critd', name: '치명 한 방', desc: '치명타 피해 +25%', max: 3, cost: [3, 4, 5], col: 1, row: 2, req: 'crit', icon: 'pin' },
  { id: 'shield', name: '솜사탕 방패', desc: '전투마다 처음 맞는 공격 1번을 막아요', max: 1, cost: [6], col: 2, row: 2, req: 'guard', icon: 'cream' },
  { id: 'xp', name: '계량 노트', desc: '경험치 +8%', max: 5, cost: [2, 2, 3, 3, 4], col: 3, row: 2, req: 'mag', icon: 'cup' },
  { id: 'size', name: '큰 손', desc: '무기 범위 +8%', max: 3, cost: [3, 4, 5], col: 0, row: 3, req: 'critd', icon: 'glove' },
  { id: 'start2', name: '두 번째 무기', desc: '무기 1개를 더 들고 출발해요', max: 1, cost: [8], col: 2, row: 3, req: 'shield', icon: 'chest' },
  { id: 'gold', name: '행운 지갑', desc: '골드 +15%', max: 3, cost: [1, 2, 3], col: 4, row: 3, req: 'xp', icon: 'coin' },
  { id: 'choice', name: '넓은 선택', desc: '레벨업 선택지가 4장이 돼요', max: 1, cost: [10], col: 1, row: 4, req: 'size', icon: 'event' },
  { id: 'reroll', name: '다시 굽기', desc: '모험마다 레벨업 선택지를 다시 뽑는 기회 +2번', max: 2, cost: [4, 6], col: 3, row: 4, req: 'gold', icon: 'rest' },
  { id: 'veteran', name: '숙련 제빵사', desc: '처음 무기가 Lv3으로 시작해요', max: 1, cost: [12], col: 2, row: 5, req: 'start2', icon: 'ench' }
];
if (!S.meta || typeof S.meta !== 'object' || !S.meta.n) S.meta = { pts: 0, total: 0, n: {} };
const M = id => S.meta.n[id] || 0;
const TNODE = Object.fromEntries(TREE.map(t => [t.id, t]));
const canLearn = t => M(t.id) < t.max && (!t.req || M(t.req) > 0);
/* 모험이 끝나면 설탕 별을 받아요: 올라간 층, 잡은 적, 엘리트, 승리 */
function sugarStars(r, won) { return Math.max(1, Math.round(floorNo() * 1.5 + Math.min(8, (run.kills || 0) / 1500) + (run.elites || 0) * 2 + (won ? 10 : 0))     /* 3막까지 이기면 50개 남짓: 서너 번 이기면 트리를 다 배워요 */); }
function treeSheet(back) {
  let sel = null;
  const cell = 64, W = 5 * cell, H = 6 * 78 + 20, pos = t => [t.col * cell + cell / 2, t.row * 78 + 40];
  const draw = () => {
    let lines = ''; TREE.forEach(t => { if (!t.req) return; const [a, b] = pos(TNODE[t.req]), [c, d] = pos(t); lines += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" class="${M(t.req) ? 'on' : ''}"/>`; });
    const nodes = TREE.map(t => { const [x, y] = pos(t), r = M(t.id), st = r >= t.max ? 'max' : canLearn(t) ? 'can' : 'lock'; return `<button class="tn ${st}${r ? ' got' : ''}${sel === t.id ? ' sel' : ''}" type="button" data-act="node" data-id="${t.id}" style="left:${x}px; top:${y}px" aria-label="${t.name}"><span class="ti">${svg(ICON[t.icon])}</span><span class="tr">${r}/${t.max}</span></button>`; }).join('');
    const t = sel && TNODE[sel], r = t ? M(t.id) : 0, cost = t && r < t.max ? t.cost[r] : 0;
    const detail = t ? `<div class="td"><b>${t.name} ${r}/${t.max}</b><span>${t.desc}${t.max > 1 ? ` (1단계마다)` : ''}.${t.req && !M(t.req) ? ` 먼저 '${TNODE[t.req].name}'을 배워야 해요.` : ''}</span>${r < t.max ? `<button class="cta" type="button" data-act="learn"${canLearn(t) && S.meta.pts >= cost ? '' : ' aria-disabled="true"'}>배우기 · 설탕 별 ${cost}개</button>` : `<em>다 배웠어요</em>`}</div>` : `<div class="td"><span>칸을 눌러 보면 무엇을 키우는지 알려 줘요. 위에서부터 이어진 길을 따라 배워요.</span></div>`;
    sheet(`<h2 id="cardTitle">성장 트리</h2><p class="pts">설탕 별 <b>${S.meta.pts}</b>개</p><div class="tree" style="width:${W}px; height:${H}px"><svg class="tl" viewBox="0 0 ${W} ${H}" aria-hidden="true">${lines}</svg>${nodes}</div>${detail}<button class="btn" type="button" data-act="close">닫기</button>`,
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
const SPRITES = ['hero', 'jelly', 'cookie', 'ice', 'donut', 'boss', 'boss2', 'boss3', 'golem', 'knight'];
/* 움직임 프레임: 주인공은 다리를 번갈아 드는 4프레임 걷기, 적은 한 줄 눌린 2프레임 */
function whiteOf(im) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); c.lw = im.lw; c.lh = im.lh; c.pad = im.pad; return c; }
function loadImages() { PAPER.build(whiteOf); Object.assign(IMG, PAPER.IMG); return Promise.resolve(); }

/* ───── 소리와 진동: 옛날 게임기처럼 펄스파·삼각파·잡음으로만 만들어요 ───── */
let ac, bus, mbus, noiseBuf; const PW = {};
function audio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)(); const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    bus = ac.createGain(); bus.gain.value = 0.8; bus.connect(comp); mbus = ac.createGain(); mbus.gain.value = S.music === false ? 0 : 0.32; mbus.connect(comp); comp.connect(ac.destination);
    for (const d of [0.125, 0.25, 0.5]) { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * d); PW[d] = ac.createPeriodicWave(re, im); }
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function setWave(osc, type) { if (type === 'p12' || type === 'p25' || type === 'p50') { osc.setPeriodicWave(PW[{ p12: 0.125, p25: 0.25, p50: 0.5 }[type]]); return 0.42; } osc.type = type; return type === 'square' || type === 'sawtooth' ? 0.42 : 1; }
function voice(f, d, o = {}) {
  const a = audio(), t0 = o.t != null ? o.t : a.currentTime + (o.at || 0), osc = a.createOscillator(), g = a.createGain(), k = setWave(osc, o.type || 'p25'), v = (o.vol || 0.1) * k;
  osc.frequency.setValueAtTime(f, t0); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + d);
  if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 6; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(osc.frequency); l.start(t0 + 0.12); l.stop(t0 + d + 0.05); }
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.004);
  if (o.sus) { g.gain.setValueAtTime(v, t0 + d * 0.7); } g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  osc.connect(g); g.connect(o.music ? mbus : bus); osc.start(t0); osc.stop(t0 + d + 0.05);
}
function hiss(d, o = {}) {
  const a = audio(), t0 = o.t != null ? o.t : a.currentTime + (o.at || 0);
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch = noiseBuf.getChannelData(0); let v = 0; for (let i = 0; i < ch.length; i++) { if (i % 3 === 0) v = Math.random() * 2 - 1; ch[i] = v; } }
  const src = a.createBufferSource(), flt = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf; src.loop = true; flt.type = o.type || 'bandpass'; flt.Q.value = o.q || 0.8; flt.frequency.setValueAtTime(o.f || 3000, t0);
  if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(flt); flt.connect(g); g.connect(o.music ? mbus : bus); src.start(t0, Math.random() * 0.5); src.stop(t0 + d + 0.05);
}
const bell = (f, d, vol = 0.08, at = 0) => { voice(f, d, { vol, at, type: 'p25' }); voice(f * 2, d * 0.5, { vol: vol * 0.3, at: at + 0.01, type: 'p12' }); };
const arp = (fs, step, d, vol, type = 'p25', at = 0) => fs.forEach((f, i) => voice(f, d, { vol, type, at: at + i * step }));
let headless = false;                         // 테스트용 빠른 진행에서는 소리와 연출을 건너뛰어요
const lastPlayed = {};
function play(name, fn, gap = 0) {
  if (headless || S.muted) return;
  const now = performance.now(); if (gap && now - (lastPlayed[name] || 0) < gap) return; lastPlayed[name] = now;
  try { fn(); } catch (e) { if (window.__soundDebug) throw e; }
}
function buzz(p) { if (headless || !S.vib || !navigator.vibrate) return; try { navigator.vibrate(p); } catch (e) {} }
const sfx = {
  /* 때리는 소리: 짧은 잡음 + 아래로 떨어지는 펄스 = 퍽! */
  hit() { play('hit', () => { const k = rand(0.85, 1.2); hiss(.04, { f: 2800 * k, q: 1.2, vol: .1 }); voice(420 * k, .06, { to: 110, type: 'p50', vol: .12 }); voice(90, .05, { to: 45, type: 'triangle', vol: .22 }); }, 38); },
  crit() { play('crit', () => { hiss(.07, { type: 'highpass', f: 3500, vol: .12 }); voice(1400, .05, { to: 2400, type: 'p12', vol: .09 }); voice(150, .14, { to: 40, type: 'triangle', vol: .3 }); voice(600, .1, { to: 120, type: 'p50', vol: .1, at: .02 }); }, 60); buzz(12); },
  kill(type) { play('kill', () => {
    const k = rand(0.92, 1.1);
    if (type === 'cookie') { hiss(.1, { f: 1300, q: 2, vol: .16 }); hiss(.06, { f: 600, q: 3, vol: .12, at: .04 }); voice(180 * k, .12, { to: 50, type: 'triangle', vol: .28 }); }                  // 와삭
    else if (type === 'ice') { voice(1700 * k, .1, { to: 900, type: 'p12', vol: .08 }); voice(2300 * k, .08, { type: 'p12', vol: .05, at: .04 }); hiss(.08, { type: 'highpass', f: 5000, vol: .09 }); voice(100, .08, { to: 45, type: 'triangle', vol: .2 }); }  // 쨍그랑
    else { voice(520 * k, .12, { to: 70, type: 'p50', vol: .13 }); hiss(.07, { type: 'lowpass', f: 1400, to: 300, vol: .14 }); voice(110, .1, { to: 40, type: 'triangle', vol: .26 }); }  // 뿅 철퍽
  }, 42); buzz(8); },
  bigKill() { play('bigKill', () => { voice(110, .8, { to: 30, type: 'triangle', vol: .38 }); hiss(.7, { type: 'lowpass', f: 3200, to: 120, vol: .26 }); hiss(.25, { f: 900, q: 1, vol: .14, at: .05 }); arp([523, 659, 784, 1047, 1319, 1568], .06, .3, .08, 'p25', .2); }); buzz([30, 30, 90]); },
  gem(k = 0) { play('gem', () => { const f = 988 * Math.pow(2, Math.min(k, 12) / 12); voice(f, .05, { type: 'p25', vol: .06 }); voice(f * 1.5, .06, { type: 'p12', vol: .04, at: .035 }); }, 32); },
  swing() { play('swing', () => { hiss(.1, { f: 700, to: 3200, q: 1.5, vol: .1 }); voice(260, .08, { to: 520, type: 'p12', vol: .04 }); }, 80); },
  shot() { play('shot', () => voice(760 + rand(-60, 60), .045, { to: 1500, type: 'p12', vol: .06 }), 85); },
  hurt() { play('hurt', () => { voice(330, .1, { to: 160, type: 'p50', vol: .16 }); voice(250, .12, { to: 110, type: 'p50', vol: .14, at: .09 }); voice(120, .35, { to: 35, type: 'triangle', vol: .32 }); hiss(.25, { type: 'lowpass', f: 2200, to: 200, vol: .2 }); }); buzz([70, 40, 50]); },
  block() { play('block', () => { arp([1568, 2093], .05, .18, .08, 'p12'); hiss(.05, { type: 'highpass', f: 6000, vol: .08 }); }); buzz(20); },
  level() { play('level', () => { voice(196, .45, { to: 784, type: 'p50', vol: .07 }); hiss(.45, { f: 500, to: 7000, vol: .07 }); arp([523, 659, 784, 1047, 1319, 1568, 2093], .05, .22, .08, 'p25', .3); voice(65, .5, { to: 40, type: 'triangle', vol: .3, at: .3 }); }); buzz([15, 30, 25, 30, 60]); },
  warn() { play('warn', () => { voice(880, .09, { type: 'p50', vol: .07 }); voice(660, .09, { type: 'p50', vol: .07, at: .12 }); }, 300); },
  slam() { play('slam', () => { voice(140, .5, { to: 30, type: 'triangle', vol: .38 }); hiss(.4, { type: 'lowpass', f: 2400, to: 150, vol: .24 }); }); buzz(60); },
  boss() { play('boss', () => { [98, 92, 87, 82].forEach((f, i) => voice(f, .3, { type: 'p50', vol: .1, at: i * .22 })); voice(55, 1.1, { to: 41, type: 'triangle', vol: .32 }); hiss(1, { type: 'lowpass', f: 300, to: 1800, vol: .12 }); }); buzz(120); },
  revive() { play('revive', () => arp([392, 523, 659, 784, 1047, 1319], .07, .3, .08, 'p25')); buzz([40, 40, 80]); },
  flip() { play('flip', () => { hiss(.07, { f: 1500, to: 5000, vol: .08 }); voice(1200, .04, { to: 1800, type: 'p12', vol: .05, at: .05 }); }, 60); buzz(6); },
  rare() { play('rare', () => { arp([1047, 1319, 1568, 2093, 2637], .05, .3, .07, 'p12'); hiss(.3, { type: 'highpass', f: 7000, vol: .05 }); }); buzz([10, 20, 30]); },
  coinTick() { play('coinTick', () => { voice(1976, .04, { type: 'p25', vol: .05 }); voice(2637, .1, { type: 'p25', vol: .05, at: .04 }); }, 45); },
  fanfare() { play('fanfare', () => { arp([523, 523, 523], .1, .09, .1, 'p25'); voice(698, .12, { type: 'p25', vol: .1, at: .32 }); voice(784, .12, { type: 'p25', vol: .1, at: .44 }); voice(1047, .6, { type: 'p25', vol: .1, at: .56, vib: 1, sus: 1 }); [262, 330, 392].forEach((f, i) => voice(f, .7, { type: 'triangle', vol: .12, at: .56 })); hiss(.4, { type: 'highpass', f: 6000, vol: .05, at: .56 }); }); buzz([20, 30, 20, 30, 80]); },
  magnet() { play('magnet', () => { voice(300, .5, { to: 1200, type: 'p25', vol: .08 }); arp([784, 988, 1175, 1568], .05, .15, .06, 'p12', .3); hiss(.4, { f: 800, to: 5000, vol: .06 }); }); buzz([20, 20, 40]); },
  zap() { play('zap', () => { hiss(.12, { type: 'highpass', f: 3000, to: 8000, vol: .1 }); voice(1800, .1, { to: 300, type: 'p12', vol: .08 }); voice(120, .08, { to: 50, type: 'triangle', vol: .18 }); }, 90); },
  boom() { play('boom', () => { hiss(.25, { type: 'lowpass', f: 2200, to: 150, vol: .2 }); voice(120, .22, { to: 35, type: 'triangle', vol: .32 }); }, 60); buzz(10); },
  thud() { play('thud', () => { voice(600, .06, { to: 200, type: 'p25', vol: .08 }); voice(140, .16, { to: 40, type: 'triangle', vol: .3 }); hiss(.1, { f: 1200, vol: .12 }); }, 60); },
  tap() { play('tap', () => voice(880, .035, { to: 1320, type: 'p25', vol: .06 })); buzz(6); },
  coin() { play('coin', () => { voice(1976, .06, { type: 'p25', vol: .07 }); voice(2637, .25, { type: 'p25', vol: .07, at: .06 }); }); },
  good() { play('good', () => arp([784, 988, 1175, 1568], .055, .16, .07, 'p25')); buzz([15, 30, 30]); },
  no() { play('no', () => { voice(220, .08, { type: 'p50', vol: .08 }); voice(165, .12, { type: 'p50', vol: .08, at: .09 }); }); },
  win() { play('win', () => { arp([523, 659, 784, 1047], .1, .2, .1, 'p25'); voice(1047, .8, { type: 'p25', vol: .09, at: .42, vib: 1, sus: 1 }); voice(262, .9, { type: 'triangle', vol: .14, at: .42 }); }); buzz([20, 40, 20, 40, 60]); },
  lose() { play('lose', () => { [392, 370, 349, 330].forEach((f, i) => voice(f, .28, { type: 'p50', vol: .08, at: i * .2 })); voice(165, .8, { to: 82, type: 'triangle', vol: .16, at: .8 }); }); buzz([60, 40, 60]); }
};

/* ───── 배경음악: 직접 쓴 짧은 곡 3개를 16분음표 단위로 미리 예약해서 연주해요 ───── */
const NOTE = n => { const m = /^([A-G])(#?)(\d)$/.exec(n); return 440 * Math.pow(2, ({ C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0) + (m[3] - 4) * 12) / 12); };
const seq = s => s.replace(/\|/g, ' ').trim().split(/\s+/);      // 음 이름, '.' 쉼, '-' 이어서
const CH = { C: ['C3', 'E4', 'G4', 'C5'], Am: ['A2', 'C4', 'E4', 'A4'], F: ['F2', 'A3', 'C4', 'F4'], G: ['G2', 'B3', 'D4', 'G4'], Em: ['E2', 'G3', 'B3', 'E4'], E: ['E2', 'G#3', 'B3', 'E4'], Dm: ['D2', 'F3', 'A3', 'D4'] };
const SONGS = {
  /* 지도와 제목: 느긋한 오후 산책 */
  map: { bpm: 92, chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'], drums: 'calm',
    lead: seq(`A5 - - - C6 - A5 - G5 - - - F5 - - - | G5 - - - B5 - D6 - C6 - B5 - G5 - - - | E5 - - - G5 - B5 - A5 - G5 - E5 - - - | A5 - - - C6 - E6 - D6 - C6 - A5 - - -
               F5 - A5 - C6 - - - A5 - G5 - F5 - . . | G5 - B5 - D6 - - - C6 - B5 - G5 - . . | E5 - G5 - C6 - - - D6 - E6 - - - - - | C6 - - - - - - - . . . . . . . .`) },
  /* 전투: 신나는 행진 */
  battle: { bpm: 150, chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'], drums: 'beat',
    lead: seq(`E5 . G5 . C6 . G5 . E5 . G5 . A5 G5 E5 . | C5 . E5 . A5 . E5 . C6 . B5 . A5 . G5 . | A5 . C6 . F5 . A5 . C6 . D6 . C6 . A5 . | B5 . D6 . G5 . B5 . D6 - - - . . . .
               G5 - E5 - C5 . E5 G5 C6 - - . G5 . E5 . | A5 - E5 - C5 . E5 A5 C6 - B5 - A5 . E5 . | F5 . A5 . C6 . A5 . D6 - C6 - A5 . F5 . | G5 . B5 . D6 . F6 . E6 - D6 - B5 - G5 .`) },
  /* 보스: 긴박한 단조 */
  boss: { bpm: 164, chords: ['Am', 'F', 'G', 'E', 'Am', 'F', 'Dm', 'E'], drums: 'drive',
    lead: seq(`A4 . A4 . C5 . A4 . E5 . D5 . C5 . B4 . | A4 . A4 . C5 . F5 . E5 - D5 - C5 . A4 . | B4 . B4 . D5 . G5 . F5 - E5 - D5 . B4 . | G#4 . B4 . E5 . G#5 . B5 - - - A5 - G#5 -
               A5 . E5 . C5 . E5 . A5 . B5 . C6 . B5 . | A5 . F5 . C5 . F5 . A5 - G5 - F5 . E5 . | F5 . D5 . A4 . D5 . F5 - E5 - D5 . F5 . | E5 - - - G#5 - - - B5 - - - E6 - - -`) }
};
const MUS = { cur: null, step: 0, next: 0, timer: 0 };
function music(name) {
  if (MUS.cur === name) return; MUS.cur = name; MUS.step = 0; MUS.next = 0;
  if (!MUS.timer) MUS.timer = setInterval(musicTick, 30);
}
function musicTick() {
  if (!MUS.cur || headless || !ac || S.muted || S.music === false || document.hidden) { MUS.next = 0; return; }
  const song = SONGS[MUS.cur], t16 = 60 / song.bpm / 4, now = ac.currentTime; if (!MUS.next || MUS.next < now - 0.2) MUS.next = now + 0.06;
  while (MUS.next < now + 0.14) {
    const i = MUS.step % song.lead.length, bar = Math.floor(i / 16), pos = i % 16, ch = CH[song.chords[bar % song.chords.length]], t = MUS.next;
    /* 멜로디 */
    const n = song.lead[i]; if (n !== '.' && n !== '-') { let len = 1; while (song.lead[(i + len) % song.lead.length] === '-') len++; voice(NOTE(n), t16 * len * 0.95, { t, type: song.drums === 'calm' ? 'p50' : 'p25', vol: song.drums === 'calm' ? 0.07 : 0.085, music: 1, sus: 1, vib: len >= 4 }); }
    /* 반주: 화음을 쪼개서 빠르게 (아르페지오) */
    if (song.drums === 'calm') { if (pos % 2 === 0) voice(NOTE(ch[1 + (pos / 2) % 3]), t16 * 1.8, { t, type: 'p12', vol: 0.035, music: 1 }); }
    else voice(NOTE(ch[1 + pos % 3]) * 2, t16 * 0.9, { t, type: 'p12', vol: 0.022, music: 1 });
    /* 베이스: 삼각파 */
    const root = NOTE(ch[0]);
    if (song.drums === 'calm') { if (pos % 8 === 0) voice(root, t16 * 7.5, { t, type: 'triangle', vol: 0.16, music: 1, sus: 1 }); }
    else if (song.drums === 'beat') { if (pos % 2 === 0) voice(pos % 4 === 0 ? root : root * 2, t16 * 1.6, { t, type: 'triangle', vol: 0.17, music: 1, sus: 1 }); }
    else voice(pos % 2 ? root * 2 : root, t16 * 0.9, { t, type: 'triangle', vol: 0.17, music: 1, sus: 1 });
    /* 북: 킥은 삼각파가 뚝 떨어지는 소리, 스네어와 하이햇은 잡음 */
    const kick = () => voice(150, 0.12, { t, to: 40, type: 'triangle', vol: 0.32, music: 1 }), snare = () => hiss(0.12, { t, f: 1800, q: 0.7, vol: 0.12, music: 1 }), hat = v => hiss(0.03, { t, type: 'highpass', f: 7000, vol: v, music: 1 });
    if (song.drums === 'calm') { if (pos === 0) kick(); if (pos % 4 === 2) hat(0.03); }
    else if (song.drums === 'beat') { if (pos === 0 || pos === 8 || pos === 10) kick(); if (pos === 4 || pos === 12) snare(); if (pos % 2 === 0) hat(0.04); }
    else { if (pos % 4 === 0) kick(); if (pos === 4 || pos === 12) snare(); hat(pos % 2 ? 0.025 : 0.045); if (pos === 14 && bar % 2) snare(); }
    MUS.next += t16; MUS.step++;
  }
}
const setMusicVol = () => { if (mbus) mbus.gain.setTargetAtTime(S.muted || S.music === false ? 0 : 0.32, ac.currentTime, 0.05); };

/* ───── 카드 ───── */
/* 아이콘은 모두 색종이 그림 (paper.js). ICON.pin → '@pin' → 그림 주소 */
const ICON = new Proxy({}, { get: (_, k) => '@' + String(k) });
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
  spd: { name: '이동 속도 +5%', icon: 'honey' },
  dmg: { name: '공격력 +10%', icon: 'star' },
  crit: { name: '치명타 확률 +5%', icon: 'ench' },
  heart: { name: '하트 +1', icon: 'heart' }
};
const RELICS = {
  cape: { name: '슈크림 망토', desc: '하트가 1칸 남으면 더 빨리 달려요.', icon: 'cream' },
  whisk: { name: '황금 거품기', desc: '주는 피해가 15% 늘어요.', icon: 'star' },
  cup: { name: '계량컵', desc: '경험치를 25% 더 얻어요.', icon: 'ench' },
  boots: { name: '버터 장화', desc: '이동 속도가 12% 빨라져요.', icon: 'honey' },
  apron: { name: '두꺼운 앞치마', desc: '최대 하트가 1칸 늘어요.', icon: 'dough' },
  fortune: { name: '행운의 쿠키', desc: '골드를 30% 더 얻어요.', icon: 'coin' },
  icepack: { name: '얼음 주머니', desc: '휴식처에서 하트를 1칸 더 채워요.', icon: 'rest' },
  sprinkle: { name: '스프링클 통', desc: '레벨이 오르면 주변 적에게 피해를 줘요.', icon: 'sour' },
  jar: { name: '꿀단지', desc: '엘리트 전투를 이기면 하트를 1칸 더 채워요.', icon: 'honey' },
  cloud: { name: '솜사탕 구름', desc: '전투마다 처음 맞는 공격 한 번을 막아 줘요.', icon: 'cream' }
};
const HERO_R = 6.5;              // 주인공이 맞는 범위 (몸 크기보다 작게)
const wLv = id => { const w = run.wpn.find(x => x.id === id); return w ? w.lv : 0; };
const wDescFull = id => { const W = WEAPONS[id]; return `${W.desc} Lv5: ${W.s5} Lv10: ${W.s10}`; };
function wOpt(id, i, o = {}) {      // 무기 선택 줄
  const W = WEAPONS[id], lv = wLv(id), nx = lv + 1, sp = nx === 5 ? W.s5 : nx === 10 ? W.s10 : '';
  const title = lv ? `${W.name} Lv${lv} → Lv${nx}${nx === 5 || nx === 10 ? ' ★' : ''}` : `새 무기: ${W.name}`;
  const desc = lv ? (sp ? `특별 효과! ${sp} ${W.more}` : W.more) : wDescFull(id);
  return `<button class="opt${nx === 10 ? ' r2' : nx === 5 ? ' r1' : ''}" type="button" data-act="${o.act || 'pick'}" data-i="${i}"${o.off ? ' aria-disabled="true"' : ''}><span class="ic">${svg(ICON[id])}</span><span class="tx"><b>${title}</b><span>${desc}</span></span>${o.price != null ? `<em>${o.price}골드</em>` : ''}</button>`;
}
function rollRelic() { const pool = Object.keys(RELICS).filter(id => id !== 'cape' && !run.relics.includes(id)); return pool.length ? pick(pool) : null; }
function gainRelic(id) { run.relics.push(id); if (id === 'apron') { run.maxHp += 1; run.hp += 1; } }
const HEART_EMPTY = '@heartOff';
const heartsHtml = (hp, max) => Array.from({ length: max }, (_, i) => `<i class="hrt${i < hp ? '' : ' off'}">${svg(i < hp ? ICON.heart : HEART_EMPTY)}</i>`).join('');
const has = id => run.relics.includes(id);
const goldGain = n => Math.round(n * (has('fortune') ? 1.3 : 1));

/* ───── 적 ───── */
const FOES = {
  jelly: { img: 'jelly', hp: 14, spd: 68, dmg: 7, r: 15, h: 48, xp: 1 },
  ice: { img: 'ice', hp: 9, spd: 118, dmg: 5, r: 12, h: 56, xp: 1 },
  cookie: { img: 'cookie', hp: 36, spd: 50, dmg: 11, r: 17, h: 56, xp: 2 },
  donut: { img: 'donut', big: true, hp: 520, spd: 78, dmg: 16, r: 28, h: 88, xp: 12, name: '딱딱 도넛 기사' },
  pop: { img: 'pop', hp: 10, spd: 104, dmg: 1, r: 11, h: 30, xp: 1, ai: 'bomb' },          // 팝콘 폭탄: 달려와서 터져요
  gum: { img: 'gum', hp: 18, spd: 62, dmg: 1, r: 13, h: 30, xp: 2, ai: 'shoot' },          // 풍선껌: 멀리서 풍선을 쏴요
  ginger: { img: 'ginger', hp: 38, spd: 36, dmg: 1, r: 15, h: 32, xp: 3, noKb: true },   // 진저 병정: 맞아도 밀려나지 않고 꾸준히 걸어와요
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
let vw = 390, vh = 780, PXS = 2, PZ = 2, ZOOM = 1, lw = 195, lh = 390, SC = 2;      // PXS: 픽셀 한 칸의 화면 크기, PZ: 줌을 적용한 크기, lw·lh: 낮은 해상도 화면 크기
let RS = 1.5, slowT = 0;      // 화면 선명도. 폰이 버거워하면 스스로 낮춰요
function resize() {
  const w = window.innerWidth, h = window.innerHeight, d = Math.min(RS, window.devicePixelRatio || 1), W = Math.round(w * d), H = Math.round(h * d);
  PXS = Math.max(2, Math.round(w / 195)); PZ = PXS * ZOOM; lw = Math.ceil(w / PZ); lh = Math.ceil(h / PZ); SC = PZ * d;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } cv.style.width = w + 'px'; cv.style.height = h + 'px';
  vw = lw * 2; vh = lh * 2; cv2.width = W; cv2.height = H;
}
addEventListener('resize', resize);

function battleStats() {
  const b = run.bonus || { spd: 0, dmg: 0, crit: 0 };
  return {
    dmg: (has('whisk') ? 1.15 : 1) * (1 + 0.1 * b.dmg) * (1 + 0.05 * M('atk')),
    crit: 0.05 + 0.05 * b.crit + 0.03 * M('crit'), critMul: 1.8 + 0.25 * M('critd'),
    spd: (has('boots') ? 1.12 : 1) * (1 + 0.05 * b.spd) * (1 + 0.04 * M('spd')),
    xp: (has('cup') ? 1.25 : 1) * (1 + 0.08 * M('xp')), pickup: 88 * (1 + 0.2 * M('mag')), invK: 1 + 0.15 * M('guard'), area: 1 + 0.08 * M('size')
  };
}
const needOf = lvl => Math.round(5 + 3 * (lvl - 1) + 0.07 * (lvl - 1) ** 2);
function startBattle(kind, floor, onEnd) {
  const st = battleStats(), dur = kind === 'boss' ? 300 : 180;
  B = {
    kind, floor, act: actOf(), onEnd, t: 0, dur, st, paused: false, over: false,
    p: { x: 0, y: 0, hp: run.hp, max: run.maxHp, inv: 0, face: 1, dirX: 0, dirY: -1, moving: false, bob: 0, shield: has('cloud') || M('shield') > 0 },
    foes: [], shots: [], foeShots: [], gems: [], magnets: [], zones: [], fx: [], texts: [], telegraphs: [], lobs: [],
    weapons: run.wpn.map(x => ({ id: x.id, lv: x.lv, src: x, cd: 0.3 + Math.random() * 0.6, ang: 0 })),
    lvl: run.lvl, xp: run.xp, need: needOf(run.lvl), kills: 0, spawnAcc: 0, shake: 0, hitstop: 0, hsCool: 0, slow: 0, flashScr: null, heartPop: 0,
    eliteAt: kind === 'elite' ? 90 : -1, bossAt: kind === 'boss' ? 180 : -1, big: null, bigDead: false, joy: null, hudT: -1, hudHp: -1, hudXp: -1
  };
  B.pet = petStart();
  if (!headless) {
    ZOOM = 1; show('battle'); resize();
    $('#bossBar').hidden = true; $('#potHud').innerHTML = run.potion ? svg(ICON.cocoa) : '';
    toast(kind === 'boss' ? '3분 뒤에 보스가 나타나요' : kind === 'elite' ? '1분 30초 뒤에 엘리트가 나타나요' : '3분만 버텨요!');
    if (window.__dbg.autoAll) B.auto = true;
    last = performance.now(); requestAnimationFrame(frame);
  }
}
let toastTimer = 0;
function toast(t) { if (headless) return; const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { e.hidden = true; }, 2200); }

/* 판이 지날수록(층이 오를수록) 적이 확실히 많아져요: 첫 판 1배 → 보스 판 약 5배 */
const stageMul = () => Math.min(6.5, 0.8 + 0.5 * B.floor);
/* 2막부터는 적이 훨씬 단단해져요. 캐릭터가 무기를 다 키우는 속도에 맞춘 값 */
const lateMul = () => { const k = Math.max(0, B.floor - 5); return 1 + LATE * k + 0.006 * k * k; };
const LATE = 0.18;
function spawnFoe(type, x, y, minion) {
  const d = FOES[type], grow = (1 + 0.92 * Math.pow(B.floor, 0.8) + (B.t / 120) * 0.6) * lateMul();     /* 초반 판에서 빨리 단단해지고 뒤로 갈수록 완만하게 */
  const big = !!d.big && !minion;
  const f = { type, x, y, r: d.r, hp: d.hp * (big ? (1 + 0.2 * B.floor + 0.012 * B.floor * B.floor) * lateMul() : grow) * DF().hp, spd: d.spd * DF().spd * Math.min(1.5, 0.95 + 0.06 * B.floor), dmg: d.dmg * (1 + 0.1 * B.floor), flash: 0, acid: 0, acidT: 0, slow: 0, hitT: {}, ph: Math.random() * 6.28, st: 0, stT: big ? 3 : rand(0.8, 2.5), vx: 0, vy: 0, kx: 0, ky: 0, sq: 0, born: B.t, dead: false };
  if (minion) { f.minion = true; f.hp = d.hp * 0.15 * grow * DF().hp; f.r = d.r * 0.85; }     // 지난 막의 엘리트가 일반 몬스터로: 체력은 엘리트의 15%
  f.max = f.hp; B.foes.push(f); return f;
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
const FOE_COL = { golem: '#59B8FF', knight: '#FF6B3D', ginger: '#C9823E', boss2: '#8B5A3C', boss3: '#FF6B3D', jelly: '#3FCF7A', cookie: '#B9783F', ice: '#9FDBFF', donut: '#FF8FB8', boss: '#C77DFF', pop: '#FFF3C0', gum: '#FF8FD0', churro: '#C98A4E' };
function hitStop(t) { if (!headless && B.hsCool <= 0) { B.hitstop = Math.max(B.hitstop, t); B.hsCool = 0.12; } }

function hurtFoe(f, d, w, ax, ay, kbm = 1) {
  if (f.dead) return;
  const crit = Math.random() < B.st.crit; if (crit) d *= B.st.critMul;
  if (w && FOES[f.type].big && (w.id === 'pin' || w.id === 'macaron' || w.id === 'honey')) d *= 1.5;      // 근접 무기는 보스·엘리트에게 더 세게
  d *= B.st.dmg; f.hp -= d; f.flash = 0.08; f.sq = 0.35;
  if (w && w.id && run) { const D = run.dmg || (run.dmg = {}); D[w.id] = (D[w.id] || 0) + Math.min(d, f.hp + d); }
  /* 맞은 방향으로 밀려나요 (큰 적은 조금만) */
  let dx = ax, dy = ay; if (dx == null) { dx = f.x - B.p.x; dy = f.y - B.p.y; } const m = Math.hypot(dx, dy) || 1, kb = (f === B.big ? 40 : 230) * (crit ? 1.5 : 1) * kbm;
  if (!FOES[f.type].noKb) { f.kx = dx / m * kb; f.ky = dy / m * kb; }
  if (!headless) { const a = Math.atan2(dy, dx); spark(f.x - dx / m * f.r * 0.5, f.y - FOES[f.type].h * 0.35 - dy / m * f.r * 0.3, a, crit ? '#FFE066' : '#FFFFFF', crit); }
  textAdd(f.x, f.y - FOES[f.type].h * 0.8, Math.round(d) + (crit ? '!' : ''), crit ? '#FF9A1F' : '#4A2040', crit);
  if (crit) { sfx.crit(); hitStop(0.06); B.shake = Math.max(B.shake, 0.08); fxAdd({ k: 'slash', x: f.x, y: f.y - FOES[f.type].h * 0.4, a: Math.atan2(dy, dx), life: 0.16, max: 0.16 }); } else { sfx.hit(); if (f.hp > 0) hitStop(0.012); }
  if (f.hp <= 0) killFoe(f, w);
}
function killFoe(f, w) {
  f.dead = true; B.kills++;
  const d = FOES[f.type], col = FOE_COL[f.type], big = f === B.big;
  if (!big && B.magnets.length < 6 && Math.random() < 1 / 90) B.magnets.push({ x: f.x, y: f.y, ph: 0 });      // 가끔 자석을 떨어뜨려요 (여러 개가 같이 있을 수 있어요)
  if (big) B.magnets.push({ x: f.x + 20, y: f.y, ph: 0 });
  const elite = ['donut', 'golem', 'knight'].includes(f.type);
  if (d.xp) { const n = big ? 6 : 1; for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = big ? rand(60, 160) : rand(20, 60); B.gems.push({ gold: elite, x: f.x, y: f.y, v: big ? Math.ceil(d.xp / n) + 1 : elite ? 6 : d.xp, pull: false, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, z: 4, vz: rand(150, 230), ph: Math.random() * 6.28, px: f.x, py: f.y }); } }
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
  if (p.shield) { p.shield = false; p.inv = 0.8; textAdd(p.x, p.y - 50, '막음!', '#59B8FF', true); sfx.block(); push(120, 400); fxAdd({ k: 'ring', x: p.x, y: p.y - 24, r: 30, to: 120, life: 0.3, max: 0.3, col: '#59B8FF', w: 6 }); return; }
  run.hits = (run.hits || 0) + 1; const HB = run.hitBy || (run.hitBy = {}); HB[src || '?'] = (HB[src || '?'] || 0) + 1;
  p.hp -= 1; p.inv = DF().inv * B.st.invK; B.shake = 0.35; B.hitstop = 0.12; B.slow = 0.35; B.flashScr = { col: '224,68,90', t: 0.35, max: 0.35 }; B.heartPop = 0.5;
  push(130, 520); burst(p.x, p.y - 30, '#E0445A', 12, 220); fxAdd({ k: 'ring', x: p.x, y: p.y - 24, r: 38, to: 140, life: 0.32, max: 0.32, col: '#E0445A', w: 5 });
  sfx.hurt();
  if (p.hp <= 0) {
    if (run.potion) {      // 따뜻한 코코아: 저절로 마시고 하트 1칸으로 다시 일어나요
      run.potion = false; p.hp = 1; p.inv = 2.2;
      push(200, 700);
      fxAdd({ k: 'ring', x: p.x, y: p.y, r: 10, to: 200, life: 0.5, max: 0.5, col: '#FFC83D', w: 8 }); toast('코코아를 마시고 다시 일어났어요!'); sfx.revive();
      if (!headless) $('#potHud').innerHTML = '';
    } else if (!petRevive()) { p.hp = 0; endBattle(false); }
  }
}
function nearestFoe(range, from) { let best = null, bd = range * range; const p = from || B.p; for (const f of B.foes) { if (f.dead) continue; const d = (f.x - p.x) ** 2 + (f.y - p.y) ** 2; if (d < bd) { bd = d; best = f; } } return best; }
function nearFoes(range, n) { const p = B.p, r2 = range * range, l = B.foes.filter(f => !f.dead && (f.x - p.x) ** 2 + (f.y - p.y) ** 2 < r2); l.sort((a, b) => ((a.x - p.x) ** 2 + (a.y - p.y) ** 2) - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2)); return l.slice(0, n); }
const ar = () => B.st.area;
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
function fireWeapons(dt) {
  const p = B.p;
  for (const w of B.weapons) {
    const lv = w.lv, s5 = lv >= 5, s10 = lv >= 10; w.cd -= dt;
    if (w.id === 'macaron') {            /* 늘 돌고 있어요 */
      w.ang += dt * (s5 ? 4.2 : 3.2); w.pulse = ((w.pulse || 0) + dt) % 2.2;
      const near = nearestFoe(230), base = (s5 ? 84 : 66) * ar(), want = near ? Math.min(Math.hypot(near.x - p.x, near.y - p.y), base * 2.1) : base;   // 가까운 적까지 궤도를 넓혀요
      w.rad = (w.rad || base) + (Math.max(base, want) - (w.rad || base)) * Math.min(1, dt * 3);
      const n = 1 + lv, R = w.rad * (1 + 0.6 * Math.max(0, Math.sin(w.pulse / 0.7 * Math.PI)) * (w.pulse < 0.7 ? 1 : 0));
      if (s10) w.burstT = (w.burstT ?? 2) - dt;
      w.orbs = [];
      for (let i = 0; i < n; i++) {
        const a = w.ang + i * 6.283 / n; let ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R;
        /* 돌던 마카롱이 가까운 적에게 날아가 부딪히고 돌아와요 */
        const dr = (w.dr || (w.dr = []))[i] || (w.dr[i] = { m: 0, cd: i * 0.3, t: 0 }); dr.cd -= dt;
        if (dr.m === 0 && dr.cd <= 0) { const tg = nearestFoe(230, { x: ox, y: oy }); if (tg) { dr.m = 1; dr.t = 0; dr.tg = tg; accFire('macaron'); } else dr.cd = 0.2; }
        if (dr.m === 1) { dr.t += dt * 4.5; const e = Math.min(1, dr.t), tx2 = dr.tg.x, ty2 = dr.tg.y - 10; ox += (tx2 - ox) * e; oy += (ty2 - oy) * e; dr.lx = tx2; dr.ly = ty2;
          if (dr.t >= 1) { if (!dr.tg.dead) { hurtFoe(dr.tg, 20, w, dr.tg.x - p.x, dr.tg.y - p.y); accHit('macaron'); fxAdd({ k: 'flash', x: tx2, y: ty2, r: 10, life: 0.07, max: 0.07, col: '#FFD0E2' }); } dr.m = 2; dr.t = 0; } }
        else if (dr.m === 2) { dr.t += dt * 4.5; const e = Math.min(1, dr.t); ox = dr.lx + (ox - dr.lx) * e; oy = dr.ly + (oy - dr.ly) * e; if (dr.t >= 1) { dr.m = 0; dr.cd = s5 ? 0.9 : 1.2; } }
        w.orbs.push([ox, oy]);
        for (const f of B.foes) { if (f.dead) continue;
          if ((f.x - ox) ** 2 + (f.y - oy) ** 2 < (f.r + 11) ** 2 && (f.hitT.mac || 0) <= B.t) { f.hitT.mac = B.t + 0.28; hurtFoe(f, 23, w, f.x - ox, f.y - oy); } }
        if (s10 && w.burstT <= 0) blast(ox, oy, 52 * ar(), 22, w, '#FF8FB8');
      }
      if (s10 && w.burstT <= 0) { w.burstT = 2; sfx.swing(); B.shake = Math.max(B.shake, 0.08); }
      continue;
    }
    if (w.cd > 0) continue;
    if (w.id === 'pin') {
      const R = 108 * (s5 ? 1.25 : 1) * ar(), t = nearestFoe(R + 40);
      if (!t) { w.cd = 0.15; continue; }
      const a = Math.atan2(t.y - p.y, t.x - p.x), dirs = [a]; w.cd = 0.7;
      for (const g of nearFoes(R + 40, 12)) { if (dirs.length >= lv) break; const ga = Math.atan2(g.y - p.y, g.x - p.x); if (dirs.every(d => { let da = Math.abs(ga - d) % 6.283; if (da > Math.PI) da = 6.283 - da; return da > 0.9; })) dirs.push(ga); }   // 다른 적 쪽으로 먼저
      for (let i = 1; dirs.length < lv; i++) dirs.push(a + i * 6.283 / lv);
      accFire('pin', dirs.length); const hitDirs = new Set();
      for (const f of B.foes) { if (f.dead) continue; const dx = f.x - p.x, dy = f.y - p.y, m = Math.hypot(dx, dy); const fr = FOES[f.type].big ? f.r * 1.6 : f.r; if (m > R + fr && !(s10 && m < R * 1.7 + fr)) continue; dirs.forEach((d, di) => { let da = Math.abs(Math.atan2(dy, dx) - d) % 6.283; if (da > Math.PI) da = 6.283 - da; if (da < 1.1 && m <= R + fr) hitDirs.add(di); }); const fa = Math.atan2(dy, dx); const nIn = dirs.filter(d => { let da = Math.abs(fa - d) % 6.283; if (da > Math.PI) da = 6.283 - da; return da < 1.1; }).length, hitsN = Math.min(4, s10 ? Math.max(nIn, 3) : nIn); if (m <= R + fr && hitsN) { for (let h = 0; h < hitsN && !f.dead; h++) hurtFoe(f, 21, w, dx, dy, s5 ? 1.6 : 1); } else if (s10) hurtFoe(f, 14, w, dx, dy); }
      accHit('pin', s10 ? dirs.length : hitDirs.size);
      if (s10) { fxAdd({ k: 'spin', x: p.x, y: p.y, a, r: R, life: 0.3, max: 0.3 }); fxAdd({ k: 'ring', x: p.x, y: p.y - 12, r: R * 0.8, to: R * 1.7, life: 0.3, max: 0.3, col: '#FFE1A8', w: 6 }); }
      else dirs.forEach(d => fxAdd({ k: 'arc', x: p.x, y: p.y, a: d, r: R, life: 0.22, max: 0.22 }));
      B.shake = Math.max(B.shake, 0.04); sfx.swing();
    } else if (w.id === 'cream' || w.id === 'lemon') {
      const t = nearestFoe(320); if (!t) { w.cd = 0.2; continue; }
      const a = Math.atan2(t.y - p.y, t.x - p.x), n = lv, cream = w.id === 'cream'; w.cd = cream ? 0.8 : 0.95;
      fxAdd({ k: 'flash', x: p.x + Math.cos(a) * 18, y: p.y - 10 + Math.sin(a) * 18, r: 11, life: 0.07, max: 0.07, col: cream ? '#FFFFFF' : '#F4E04D' });
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.13; B.shots.push({ k: w.id, x: p.x, y: p.y - 10, vx: Math.cos(aa) * 340, vy: Math.sin(aa) * 340, r: cream && s10 ? 11 : 7, dmg: cream ? (s10 ? 14 : 11) : 9, acid: cream ? 0 : (s5 ? 7 : 3.5), pierce: cream && s10 ? 99 : 0, life: 1.2, w, hit: new Set(), aw: s10, puddle: cream && s5 }); }
      sfx.shot();
    } else if (w.id === 'star') {
      const tg = nearestFoe(340), a = tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : Math.atan2(p.dirY, p.dirX), n = 2 + lv; w.cd = 0.9;
      for (let i = 0; i < n; i++) { const aa = s10 ? a + i * 6.283 / n : a + (i - (n - 1) / 2) * 0.2; B.shots.push({ k: 'star', x: p.x, y: p.y - 10, vx: Math.cos(aa) * 310, vy: Math.sin(aa) * 310, r: 7, dmg: 34, pierce: 1, life: 1.0, w, hit: new Set(), aw: s10, bounce: s10 ? 3 : s5 ? 1 : 0 }); }
      sfx.shot();
    } else if (w.id === 'skewer') {
      const tg = nearestFoe(360), a = tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : Math.atan2(p.dirY, p.dirX), n = lv, sp = s5 ? 560 : 430; w.cd = 1.4;
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.12; B.shots.push({ k: 'skewer', x: p.x, y: p.y - 10, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, r: 9, dmg: 18, pierce: 99, life: s10 ? 1.5 : s5 ? 1.1 : 0.9, w, hit: new Set(), a: aa, aw: s10, boom: s10 }); }
      sfx.shot();
    } else if (w.id === 'honey') {
      w.cd = 3; const r = (s5 ? 64 : 50) * ar(), life = s5 ? 4 : 3;
      for (let i = 0; i < lv; i++) { let x = p.x, y = p.y; if (i) { const t = pick(nearFoes(220, 8)) || null; if (t) { x = t.x; y = t.y; } else { const a = Math.random() * 6.283, d = rand(60, 150); x += Math.cos(a) * d; y += Math.sin(a) * d; } } B.zones.push({ x, y, r, life, tick: 0, dmg: 6, w }); }
      if (s10 && !B.zones.some(z => z.follow)) B.zones.push({ x: p.x, y: p.y, r: 92 * ar(), life: 1e9, tick: 0, dmg: 8, w, follow: true });
    } else if (w.id === 'choco') {
      const ts = nearFoes(280, lv); if (!ts.length) { w.cd = 0.3; continue; } w.cd = 1.6;
      for (let i = 0; i < lv; i++) { const t = ts[i % ts.length], j = i >= ts.length ? 30 : 0; B.lobs.push({ k: 'bomb', x0: p.x, y0: p.y - 10, x: t.x + rand(-j, j), y: t.y + rand(-j, j), t: 0, dur: 0.45 + i * 0.04, r: (s5 ? 60 : 44) * ar(), dmg: 20, w, cluster: s10 }); }
      sfx.swing();
    } else if (w.id === 'cotton') {
      const ts = nearFoes(260, lv); if (!ts.length) { w.cd = 0.25; continue; } w.cd = s10 ? 0.75 : 1.3;
      const chain = s10 ? 8 : s5 ? 4 : 2;
      for (const t of ts) {
        const pts = [[p.x, p.y - 30]], hit = new Set(); let cur = t;
        for (let k = 0; k <= chain && cur; k++) { hit.add(cur); pts.push([cur.x, cur.y - FOES[cur.type].h * 0.4]); hurtFoe(cur, 12, w, cur.x - pts[pts.length - 2][0], cur.y - pts[pts.length - 2][1]); if (s10 && cur !== B.big) cur.stun = 0.6; let nb = null, nd = 120 * 120; for (const g of B.foes) { if (g.dead || hit.has(g)) continue; const d2 = (g.x - cur.x) ** 2 + (g.y - cur.y) ** 2; if (d2 < nd) { nd = d2; nb = g; } } if (!nb) { for (let e = 0; e < Math.min(3, chain - k) && !cur.dead; e++) hurtFoe(cur, 8, w, 0.001, 0.001); } cur = nb; }
        fxAdd({ k: 'bolt', pts, life: 0.16, max: 0.16 }); accFire('cotton'); accHit('cotton');
      }
      sfx.zap();
    } else if (w.id === 'cane') {
      w.cd = 2; const ts = B.foes.filter(f => !f.dead && Math.abs(f.x - p.x) < vw / 2 && Math.abs(f.y - p.y) < vh / 2);
      for (let i = 0; i < lv; i++) { const t = ts.length ? pick(ts) : null, x = t ? t.x : p.x + rand(-150, 150), y = t ? t.y : p.y + rand(-200, 200); B.lobs.push({ k: 'cane', x, y, t: -i * 0.07, dur: 0.38, r: (s5 ? 50 : 36) * ar(), dmg: 22, w, shards: s10 }); }
    }
  }
}
/* 던진 폭탄과 떨어지는 사탕: 정해진 시간 뒤에 터져요 */
function updateLobs(dt) {
  for (const L of B.lobs) {
    L.t += dt; if (L.t < L.dur) continue; L.done = true;
    if (L.k === 'bomb') {
      blast(L.x, L.y, L.r, L.dmg, L.w, '#8B5A3C'); sfx.boom();
      if (L.cluster && !L.mini) for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283, d = rand(40, 70); B.lobs.push({ k: 'bomb', mini: true, x0: L.x, y0: L.y, x: L.x + Math.cos(a) * d, y: L.y + Math.sin(a) * d, t: 0, dur: 0.3, r: L.r * 0.55, dmg: 10, w: L.w }); }
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
  const pool = Object.keys(WEAPONS).filter(id => wLv(id) < WMAX).map(id => ({ t: 'w', id })).concat(Object.keys(STATS).filter(id => id !== 'heart' || run.maxHp < 8).map(id => ({ t: 's', id })));
  return shuffle(pool).slice(0, M('choice') ? 4 : 3);
}
function applyLevel(o) {
  if (o.t === 's') { run.bonus[o.id] = (run.bonus[o.id] || 0) + 1; if (o.id === 'heart') { run.maxHp++; run.hp++; if (B) { B.p.max++; B.p.hp++; } } if (B) B.st = battleStats(); return; }
  let w = run.wpn.find(x => x.id === o.id);
  if (w) { w.lv++; const bw = B && B.weapons.find(x => x.src === w); if (bw) bw.lv = w.lv; if (B && (w.lv === 5 || w.lv === 10)) specialFx(w); }
  else { w = { id: o.id, lv: 1 }; run.wpn.push(w); if (B) B.weapons.push({ id: w.id, lv: 1, src: w, cd: 0.2, ang: 0 }); }
}
function levelSheet(opts, after, shown) {
  /* 짧게: 무기는 레벨만, 능력은 한 줄. Lv5·Lv10이 되는 카드는 색으로 구분 */
  const optHtml = (o, i) => {
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
    const sp = 172 * B.st.spd * (has('cape') && p.hp <= 1 ? 1.25 : 1), k = Math.min(1, mm);
    p.x += mx / mm * sp * k * dt; p.y += my / mm * sp * k * dt; p.dirX = mx / mm; p.dirY = my / mm; if (Math.abs(mx) > 0.1) p.face = mx > 0 ? 1 : -1; p.bob += dt * 12;
  }
  if (p.inv > 0) p.inv -= dt;
  /* 적 등장 */
  const rate = (0.6 + 2.05 * Math.min(1, B.t / Math.min(120, B.dur))) * stageMul() * (B.big ? 0.5 : 1) * DF().spawn * 1.2;
  if (!B.rush && B.t >= 120) { B.rush = true; if (!headless) { toast('몰려와요! 적이 더 많아져요'); sfx.warn(); } }
  if (B.rush && !headless && ZOOM > 0.78) { ZOOM = Math.max(0.78, ZOOM - dt * 0.15); resize(); }     // 화면을 천천히 넓혀서 더 많이 보여요
  B.spawnAcc += rate * (B.rush ? 1.3 : 1) * dt;
  while (B.spawnAcc >= 1 && B.foes.length < (B.rush ? 220 : 168)) { B.spawnAcc -= 1; const pool = ['jelly', 'jelly']; const ramp = Math.min(120, B.dur); if (B.floor >= 1 || B.t > ramp * 0.5) pool.push('ice'); if (B.floor >= 2 || B.t > ramp * 0.75) pool.push('cookie'); if (B.floor >= 1.4) pool.push('pop'); if (B.floor >= 2.2 && Math.random() < 0.3 && B.foes.reduce((n, f) => n + (f.type === 'ginger'), 0) < 4 + Math.floor(B.floor / 2)) pool.push('ginger'); if (B.floor >= 3.8 && Math.random() < 0.6) pool.push('churro'); const mi = ACTS[B.act].minion; if (mi && Math.random() < 0.07 && B.foes.reduce((n, f) => n + (f.minion ? 1 : 0), 0) < 2 + B.act) spawnRing(mi, true); else spawnRing(pick(pool)); }
  if (B.spawnAcc > 3) B.spawnAcc = 3;
  if (B.eliteAt > 0 && B.t >= B.eliteAt && !B.big) { B.big = spawnRing(ACTS[B.act].elite); bigIntro(); }
  if (B.bossAt > 0 && B.t >= B.bossAt && !B.big) { B.big = spawnRing(ACTS[B.act].boss); bigIntro(); }
  /* 적 움직임 */
  for (const f of B.foes) {
    if (f.dead) continue;
    if (f.flash > 0) f.flash -= dt;
    if (f.slow > 0) f.slow -= dt; if (f.stun > 0) f.stun -= dt;
    if (f.acid > 0) { f.acidT -= dt; if (f.acidT <= 0) { f.acidT = 0.5; const d = f.acid * 0.9; f.hp -= d * B.st.dmg; { const D = run.dmg || (run.dmg = {}); D.acid = (D.acid || 0) + d * B.st.dmg; } f.acid = Math.max(0, f.acid - 0.5); textAdd(f.x, f.y - f.r, Math.round(d), '#7FA81E'); if (f.hp <= 0) { killFoe(f, null); continue; } } }
    let busy = false;
    if (f.type === 'boss') bossThink(f, dt); else if (f.type === 'boss2') boss2Think(f, dt); else if (f.type === 'boss3') busy = boss3Think(f, dt); else if (f.type === 'donut') busy = eliteThink(f, dt); else if (f.type === 'golem') busy = golemThink(f, dt); else if (f.type === 'knight') busy = knightThink(f, dt); else if (FOES[f.type].ai) busy = foeAI(f, dt, FOES[f.type].ai);
    const dx = p.x - f.x, dy = p.y - f.y, m = Math.hypot(dx, dy) || 1;
    if (f.sq > 0) f.sq = Math.max(0, f.sq - dt * 3);
    if (f.kx || f.ky) { f.x += f.kx * dt; f.y += f.ky * dt; const dec = Math.exp(-dt * 11); f.kx *= dec; f.ky *= dec; if (Math.abs(f.kx) + Math.abs(f.ky) < 8) f.kx = f.ky = 0; }
    if (!busy && !(f.stun > 0)) { const sp = f.spd * (f.slow > 0 ? 0.55 : 1) * (f.kx || f.ky ? 0.25 : 1); f.x += dx / m * sp * dt; f.y += dy / m * sp * dt; }
    f.ph += dt * 7;
    if (m < f.r + HERO_R) hurtPlayer(f.type);
    if (m > 900) { const a = Math.random() * 6.283, R = Math.hypot(vw, vh) / 2 + 40; f.x = p.x + Math.cos(a) * R; f.y = p.y + Math.sin(a) * R; }   // 너무 멀어지면 다시 근처로
  }
  /* 서로 겹치지 않게 살짝 밀어내요 */
  const F = B.foes;
  for (let i = 0; i < F.length; i++) { const a = F[i]; if (a.dead) continue; for (let j = i + 1; j < F.length; j++) { const b = F[j]; if (b.dead) continue; const dx = b.x - a.x; if (dx > 40 || dx < -40) continue; const dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy; if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2), push = (rr - d) * 0.5 / d, wa = a === B.big ? 0 : b === B.big ? 2 : 1; a.x -= dx * push * wa; a.y -= dy * push * wa; b.x += dx * push * (2 - wa); b.y += dy * push * (2 - wa); } } }
  fireWeapons(dt); updateLobs(dt); petUpdate(dt);
  /* 내 탄 */
  for (const s of B.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.boom) {            // 부메랑 꼬치: 반쯤 날아가면 나에게 돌아와요
      if (!s.back && s.life < 0.75) { s.back = true; s.hit = new Set(); }
      if (s.back) { const dx = p.x - s.x, dy = p.y - 10 - s.y, d = Math.hypot(dx, dy) || 1; s.vx += (dx / d * 520 - s.vx) * Math.min(1, dt * 6); s.vy += (dy / d * 520 - s.vy) * Math.min(1, dt * 6); s.a = Math.atan2(s.vy, s.vx); if (d < 22) s.life = 0; }
    }
    if (!s.counted) { s.counted = true; if (s.w && s.w.id) accFire(s.w.id); }
    for (const f of B.foes) { if (f.dead || s.hit.has(f)) continue; if ((f.x - s.x) ** 2 + (f.y - s.y) ** 2 < (f.r + s.r) ** 2) { if (!s.landed) { s.landed = true; if (s.w && s.w.id) accHit(s.w.id); } s.hit.add(f); if (s.acid) f.acid = Math.min(f.acid + s.acid, 10 + 4 * (s.w ? s.w.lv : 1)); /* 산성은 무한히 쌓이지 않아요 */ hurtFoe(f, s.dmg, s.w, s.vx, s.vy);
      if (s.puddle && B.zones.length < 24) B.zones.push({ x: f.x, y: f.y, r: 34, life: 2.5, tick: 0.2, dmg: s.dmg * 0.25, w: s.w, cream: true });
      if (s.bounce > 0) {   // 튕기는 별사탕: 가까운 다른 적에게
        let nb = null, nd = 170 * 170; for (const g of B.foes) { if (g.dead || s.hit.has(g) || g === f) continue; const d2 = (g.x - s.x) ** 2 + (g.y - s.y) ** 2; if (d2 < nd) { nd = d2; nb = g; } }
        if (nb) { s.bounce--; const dx = nb.x - s.x, dy = nb.y - s.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(s.vx, s.vy); s.vx = dx / d * sp; s.vy = dy / d * sp; s.life = Math.max(s.life, 0.6); s.trail = []; fxAdd({ k: 'flash', x: s.x, y: s.y, r: 12, life: 0.08, max: 0.08, col: '#FFE45C' }); break; }
      }
      if (s.pierce-- <= 0) { s.life = 0; break; } } }
  }
  B.shots = B.shots.filter(s => s.life > 0);
  /* 꿀 장판 */
  for (const z of B.zones) { if (z.follow) { z.x = p.x; z.y = p.y; } z.life -= dt; z.tick -= dt; if (z.tick <= 0) { z.tick = 0.5; if (z.w && z.w.id === 'honey') accFire('honey'); let n = 0; for (const f of B.foes) if (!f.dead && (f.x - z.x) ** 2 + (f.y - z.y) ** 2 < (z.r + f.r) ** 2) { f.slow = 0.7; hurtFoe(f, z.dmg, z.w, 0.001, 0.001); n++; } if (n && z.w && z.w.id === 'honey') accHit('honey'); } }
  B.zones = B.zones.filter(z => z.life > 0);
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
      if (d < 18) { g.got = true; B.xp += g.v * B.st.xp * (1 + 0.12 * B.floor); B.gemCombo = B.gemT > 0 ? B.gemCombo + 1 : 0; B.gemT = 0.5; sfx.gem(B.gemCombo); B.xpFlash = 0.25;
        fxAdd({ k: 'flash', x: p.x, y: p.y - 26, r: 12, life: 0.12, max: 0.12, col: g.gold ? '#FFF6C0' : g.v >= 5 ? '#FFC2DA' : g.v >= 2 ? '#C9F7B8' : '#BFE6FF' });
        if (Math.random() < 0.5) fxAdd({ k: 'star', x: p.x + rand(-16, 16), y: p.y - rand(20, 50), vx: rand(-30, 30), vy: -70, life: 0.45, max: 0.45, col: '#FFFFFF', r: 5 }); }
    }
  }
  B.gems = B.gems.filter(g => !g.got); if (B.gems.length > 220) B.gems.splice(0, B.gems.length - 220);
  if (B.gemT > 0) B.gemT -= dt; if (B.xpFlash > 0) B.xpFlash -= dt;
  /* 자석: 먹으면 화면 밖까지 모든 보석이 빨려 와요 */
  for (const m of B.magnets) { m.ph += dt * 5; if ((p.x - m.x) ** 2 + (p.y - m.y) ** 2 < 26 * 26) { m.got = true; for (const g of B.gems) { g.vz = null; g.z = 0; if (!g.pull) { g.pull = true; g.sp = 200; } } sfx.magnet(); if (!headless) { toast('자석! 보석이 전부 모여요'); fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 20, to: 260, life: 0.5, max: 0.5, col: '#FF4F6B', w: 6 }); fxAdd({ k: 'ring', x: p.x, y: p.y - 20, r: 10, to: 200, life: 0.4, max: 0.4, col: '#FFFFFF', w: 4 }); } } }
  if (B.magnets.some(m => m.got)) B.magnets = B.magnets.filter(m => !m.got);
  /* 걸을 때 발밑 먼지 */
  if (p.moving && !headless) { B.dustT = (B.dustT || 0) - dt; if (B.dustT <= 0) { B.dustT = 0.16; fxAdd({ k: 'dot', x: p.x + rand(-6, 6), y: p.y + 2, vx: -p.dirX * 30 + rand(-15, 15), vy: rand(-30, -10), life: 0.4, max: 0.4, col: 'rgba(200,150,90,.55)', r: rand(3, 5) }); } }
  while (B.xp >= B.need && !B.over && !B.paused && !B.lvlPending) levelUp();
  /* 연출 */
  for (const f of B.fx) { f.life -= dt; if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.g) f.vy += f.g * dt; else { f.vx *= 0.9; f.vy *= 0.9; } } } B.fx = B.fx.filter(f => f.life > 0);
  for (const t of B.texts) { t.life -= dt; t.x += t.vx * dt; t.y += t.vy * dt; t.vy += 380 * dt; } B.texts = B.texts.filter(t => t.life > 0);
  if (B.shake > 0) B.shake -= dt; if (B.hsCool > 0) B.hsCool -= dt; if (B.heartPop > 0) B.heartPop -= dt;
  for (const s of B.shots) if (s.k !== 'skewer') { s.trail = s.trail || []; s.trail.push(s.x, s.y); if (s.trail.length > 10) s.trail.splice(0, 2); }
  if (!B.over && B.t >= B.dur) endBattle(true);
}
function bigIntro() { if (!['donut', 'golem', 'knight'].includes(B.big.type) && !headless) music('boss'); toast(`${FOES[B.big.type].name} 등장!`); sfx.boss(); if (!headless) { $('#bossBar').hidden = false; $('#bossName').textContent = FOES[B.big.type].name; } }

/* 테스트와 구경용 자동 조종: 가까운 적과 위험 표시에서 멀어지고, 보석 쪽으로 살짝 끌려요 */
function autopilot() {
  const p = B.p; let x = 0, y = 0;
  for (const f of B.foes) { const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy) || 1, reach = 120 + f.r; if (d < reach) { const k = (reach - d) / reach; x += dx / d * k * 2; y += dy / d * k * 2; } }
  for (const s of B.foeShots) { const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy) || 1; if (d < 110) { const sv = Math.hypot(s.vx, s.vy) || 1, side = (dx * -s.vy + dy * s.vx) / sv >= 0 ? 1 : -1; x += -s.vy / sv * side * 2.5 + dx / d; y += s.vx / sv * side * 2.5 + dy / d; } }
  for (const t of B.telegraphs) if (t.k === 'line') { const c = Math.cos(t.a), sn = Math.sin(t.a), rx = p.x - t.f.x, ry = p.y - t.f.y, along = rx * c + ry * sn, side = -rx * sn + ry * c; if (along > -30 && along < t.len + 60 && Math.abs(side) < (t.w || t.f.r) + 50) { const sg = side >= 0 ? 1 : -1; x += -sn * sg * 4; y += c * sg * 4; } }
  for (const s of B.foes) if ((s.type === 'donut' || s.type === 'churro' || (s.type === 'boss3' && s.dash)) && s.st === 2) { const c = Math.cos(s.da), sn = Math.sin(s.da), rx = p.x - s.x, ry = p.y - s.y, side = -rx * sn + ry * c; if (rx * c + ry * sn > 0 && Math.abs(side) < s.r + 50) { const sg = side >= 0 ? 1 : -1; x += -sn * sg * 4; y += c * sg * 4; } }
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
  run.hp = Math.max(won ? 1 : 0, Math.min(run.maxHp, B.p.hp));
  if (won) {      /* 끌려오던 보석(자석 포함)은 전투가 끝나도 전부 받아요. 넘친 경험치로 오른 레벨은 전투 뒤에 골라요 */
    for (const g of B.gems) if (g.pull) B.xp += g.v * B.st.xp * (1 + 0.12 * B.floor);
    B.gems = B.gems.filter(g => !g.pull);
    while (B.xp >= B.need) { B.xp -= B.need; B.lvl++; B.need = needOf(B.lvl); run.lvl = B.lvl; if (headless) applyLevel(rollLevelOpts()[0]); else run.picks = (run.picks || 0) + 1; }
  }
  run.kills = (run.kills || 0) + B.kills; run.lvl = B.lvl; run.xp = B.xp;
  const cb = B.onEnd;
  if (B.lvlPending) { run.picks = (run.picks || 0) + 1; B.lvlPending = false; B.lvlLost = true; }
  if (headless) { B.result = info; return; }
  if (won) sfx.win(); else sfx.lose();
  setTimeout(() => { B = null; ZOOM = 1; cb(info); }, 900);
}

/* ───── 그리기: 낮은 해상도로 그린 뒤 크게 키우는 픽셀 화면. 화면 1칸 = 게임 속 길이 2 ───── */
const WP = 2, INK = '#26242A';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
let pcx = 0, pcy = 0;
const X = v => v / WP - pcx, Y = v => v / WP - pcy;
const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const backOut = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
/* 종이 조각으로 그리는 기본 모양: 각진 원, 띠, 별 */
function poly(x, y, rx, ry, n, rot = 0.3) { ctx.beginPath(); for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rot; ctx.lineTo(x + Math.cos(a) * rx, y + Math.sin(a) * ry); } ctx.closePath(); }
const putDisc = (x, y, rx, ry, col, dens) => { const a = ctx.globalAlpha; ctx.globalAlpha = a * Math.min(0.8, dens / 14); ctx.fillStyle = col; poly(x, y, Math.max(1, rx), Math.max(1, ry), 12); ctx.fill(); ctx.globalAlpha = a; };
function pdisc(x, y, r, col) { ctx.fillStyle = col; poly(x, y, r, r, 10); ctx.fill(); }
function pcircle(x, y, r, col, t = 1) { if (r <= 0) return; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, t); ctx.lineJoin = 'miter'; poly(x, y, r, r, r > 20 ? 20 : 12); ctx.stroke(); }
function pline(x0, y0, x1, y1, col, t = 1) { ctx.strokeStyle = col; ctx.lineWidth = t; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
function pstar(x, y, s, col) { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * 0.785, q = i % 2 ? s * 0.35 : s + 0.5; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.fill(); }
function shade(x, y, rx, col) { ctx.fillStyle = col; poly(x, y, rx, rx * 0.36, 8, 0); ctx.fill(); }
/* 종이 그림 한 장을 가운데 맞춰 놓기 */
function ps(c, x, y, rot = 0, k = 1) { const w = c.lw * k, h = c.lh * k; if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(c, -w / 2, -h / 2, w, h); ctx.restore(); } else ctx.drawImage(c, x - w / 2, y - h / 2, w, h); }
/* 바닥: 막마다 다른 색 종이에 오린 조각을 흩뿌려요. 1막 풀빛, 2막 얼음빛, 3막 구운 벽돌빛 */
const FLOOR_PAL = [null, ['#7FA88A', '#73A07F', '#8CB396'], ['#8FB6C8', '#82ABBE', '#9EC3D3'], ['#9A5A48', '#8C4E3D', '#A96957']];
const FLOORS = FLOOR_PAL.map((pal, act) => {
  if (!pal) return null;
  const T = 96, c = mk(T * 4, T * 4), q = c.getContext('2d'), r = PAPER.rng(act * 77 + 5); q.fillStyle = pal[0]; q.fillRect(0, 0, T * 4, T * 4); q.scale(4, 4);
  for (let i = 0; i < 9; i++) { const x = r() * T, y = r() * T, s = 3 + r() * 5, a = r() * 6.283, n = r() < 0.5 ? 3 : 4, col = pal[1 + (i % 2)];
    for (const [dx, dy] of [[0, 0], [T, 0], [-T, 0], [0, T], [0, -T]]) for (const [ox, oy, cc] of [[0.5, 0.9, 'rgba(24,16,10,.2)'], [0, 0, col]]) { q.fillStyle = cc; q.beginPath(); for (let k = 0; k < n; k++) q.lineTo(x + dx + ox + Math.cos(a + k / n * 6.283) * s, y + dy + oy + Math.sin(a + k / n * 6.283) * s * (0.6 + 0.2 * ((k * 7 + i) % 3))); q.fill(); } }
  q.setTransform(1, 0, 0, 1, 0, 0); q.fillStyle = q.createPattern(PAPER.NOISE, 'repeat'); q.fillRect(0, 0, T * 4, T * 4); c.T = T; return c;
});
const GEM_COL = { s: '#3E9AE0', m: '#4FB85A', l: '#E0507A', y: '#F2C230' };
const gemKey = (v, yel) => yel ? 'y' : v >= 5 ? 'l' : v >= 2 ? 'm' : 's';     /* 노란 보석은 엘리트가 떨어뜨려요 */
function vignette() { const g = ctx.createRadialGradient(lw / 2, lh / 2, Math.min(lw, lh) * 0.45, lw / 2, lh / 2, Math.hypot(lw, lh) * 0.62); g.addColorStop(0, 'rgba(30,22,16,0)'); g.addColorStop(1, 'rgba(30,22,16,.34)'); ctx.fillStyle = g; ctx.fillRect(0, 0, lw, lh); }
function spr(name, wx, wy, flip, white, lift = 0, fr = -1) {
  const s = (B && B.act > 1 && name !== 'hero' && IMG[name + '@' + B.act]) || IMG[name]; if (!s) return; const im = fr >= 0 && s.frames ? (white ? s.whites : s.frames)[fr % s.frames.length] : white ? s.white : s.im, w = im.lw, h = im.lh, x = X(wx), y = Y(wy) - lift + im.pad;
  if (flip < 0) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, y - h, w, h); ctx.restore(); } else ctx.drawImage(im, x - w / 2, y - h, w, h);
}
const SHOT_COL = { cream: '#FFFFFF', lemon: '#EAD43C', star: '#F2C230', shard: '#A58CE0' };
function draw() {
  const p = B.p;
  ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
  const sk = B.shake > 0 ? Math.min(1, B.shake * 3) * 4 : 0;
  pcx = (p.x - vw / 2) / WP + rand(-sk, sk); pcy = (p.y - vh * 0.48) / WP + rand(-sk, sk);
  /* 바닥 */
  { const F = FLOORS[B.act] || FLOORS[1], T = F.T; for (let y = -(((pcy % T) + T) % T); y < lh; y += T) for (let x = -(((pcx % T) + T) % T); x < lw; x += T) ctx.drawImage(F, x, y, T + 0.3, T + 0.3); }
  /* 꿀 장판, 크림 웅덩이 */
  for (const z of B.zones) { const r = Math.round(z.r / WP), col = z.cream ? '#FFF3E6' : z.follow ? '#FFC23D' : '#F7B733'; if (z.life < 0.5 && Math.floor(B.t * 14) % 2) continue; putDisc(X(z.x), Y(z.y), r, Math.round(r * 0.8), col, z.cream ? 9 : 7); if (z.follow) pcircle(X(z.x), Y(z.y), r, '#FFE27A'); }
  /* 위험 예고 */
  for (const t of B.telegraphs) {
    const k = 1 - t.life / t.max, on = Math.floor(B.t * 10) % 2;
    if (t.k === 'circle') { const r = Math.round(t.r / WP); putDisc(X(t.x), Y(t.y), r, r, '#FF3B5C', 5); pcircle(X(t.x), Y(t.y), r, on ? '#FF3B5C' : '#FFD86B'); pcircle(X(t.x), Y(t.y), Math.round(r * k), '#FF3B5C'); }
    else if (t.k === 'ring') pcircle(X(t.f.x), Y(t.f.y), Math.round((t.r + k * 30) / WP), on ? '#FF3B5C' : '#FFD86B');
    else { const c = Math.cos(t.a), s = Math.sin(t.a), w = (t.w || t.f.r) / WP; for (const side of [-1, 1]) pline(X(t.f.x) - s * w * side, Y(t.f.y) + c * w * side, X(t.f.x + c * t.len) - s * w * side, Y(t.f.y + s * t.len) + c * w * side, on ? '#FF3B5C' : '#FFD86B'); for (let d = (B.t * 80) % 16; d < t.len; d += 16) R('#FF3B5C', X(t.f.x + c * d), Y(t.f.y + s * d), 2, 2); }
  }
  /* 보석 */
  for (const g of B.gems) {
    const key = gemKey(g.v, g.gold), bob = g.pull ? 0 : Math.sin(g.ph) * 1.2 + 1.5, z = (g.z || 0) / WP + bob, gx = X(g.x), gy = Y(g.y);
    if (gx < -8 || gy < -8 || gx > lw + 8 || gy > lh + 8) continue;
    shade(gx, gy + 3, 3, 'rgba(24,16,10,.28)');
    if (g.pull) { ctx.globalAlpha = 0.5; R(GEM_COL[key], X(g.px) - 1, Y(g.py) - z - 1, 2, 2); ctx.globalAlpha = 1; }
    ps(PAPER.ITEM['gem_' + key], gx, gy - z, Math.sin(g.ph * 0.5 + g.x) * 0.25);
  }
  /* 자석 아이템 */
  for (const m of B.magnets) { const mx = X(m.x), my = Y(m.y) - 5 - Math.abs(Math.sin(m.ph)) * 3, big = Math.floor(B.t * 4) % 2;
    putDisc(mx, Y(m.y) - 4, big ? 13 : 11, big ? 13 : 11, '#F7EFDC', 5); shade(mx, Y(m.y) + 3, 6, 'rgba(24,16,10,.32)'); ps(PAPER.ITEM.magnet, mx, my, Math.sin(m.ph) * 0.2);
    if (big) pstar(mx + 8, my - 8, 2.5, '#FFFFFF'); }
  /* 적과 나를 아래쪽에 있는 것부터 겹쳐 그려요 */
  const list = B.foes.slice(); list.push(p); list.sort((a, b) => a.y - b.y);
  for (const o of list) {
    if (o === p) {
      const px = X(p.x), py = Y(p.y);
      shade(px, py + 1, 9, 'rgba(24,16,10,.34)');
      if (!(p.inv > 0 && Math.floor(p.inv * 14) % 2)) spr('hero', p.x, p.y + 4, p.face, false, 0, p.moving ? Math.floor(p.bob / 1.6) % 4 : (Math.floor(B.t * 1.6) % 2 ? 4 : 3));
      if (p.shield) pcircle(px, py - 12, 17, Math.floor(B.t * 6) % 2 ? '#7FE3FF' : '#FFFFFF');
    } else {
      const d = FOES[o.type], age = B.t - (o.born || 0), ox = X(o.x), oy = Y(o.y), rr = Math.round(o.r / WP);
      if (o === B.big) putDisc(ox, oy, Math.round(rr * 2.2), Math.round(rr * 1.6), '#C77DFF', Math.floor(B.t * 5) % 2 ? 4 : 3);
      shade(ox, oy + rr * 0.7, rr, 'rgba(90,10,34,.38)');     // 적 발밑은 붉은 그림자
      if (o !== B.big && o.hp < o.max && o.max > 25) { const bw = rr * 2; R(INK, ox - rr - 1, oy + rr + 2, bw + 2, 3); R('#FF4F6B', ox - rr, oy + rr + 3, Math.max(0, Math.round(bw * o.hp / o.max)), 1); }
      const up = Math.sin(o.ph) > 0, hop = (o.type === 'jelly' && up ? 2 : 0) + (o.sq > 0.15 ? 1 : 0);
      spr(d.img, o.x + (o.sq > 0.2 ? rand(-2, 2) : 0), o.y + o.r * 0.7, o.x > p.x ? -1 : 1, o.flash > 0 || age < 0.08, hop, up || o.sq > 0.2 ? 0 : 1);
      if (o.acid > 0) { R(INK, ox + rr - 1, oy - Math.round(d.h * 0.3) - 1, 4, 4); R('#B9F03E', ox + rr, oy - Math.round(d.h * 0.3), 2, 2); }
    }
  }
  /* 무기 */
  for (const w of B.weapons) if (w.id === 'macaron' && w.orbs) for (const [ox, oy] of w.orbs) { if (w.lv >= 10) putDisc(X(ox), Y(oy), 7, 7, '#FFD86B', Math.round(4 + 8 * (1 - Math.max(0, w.burstT) / 2.5))); ps(PAPER.ITEM.macaron, X(ox), Y(oy)); }
  if (B.pet) { const P = B.pet, sp = PAPER.pet(P.id, lookOf(P.id)), px = X(P.x), py = Y(P.y) - Math.abs(Math.sin(P.t * 5)) * 2; shade(px, Y(P.y) + 8, 4, 'rgba(24,16,10,.3)'); ctx.save(); ctx.translate(px, py); if (P.x > B.p.x) ctx.scale(-1, 1); ctx.rotate(Math.sin(P.t * 5) * 0.08); ctx.drawImage(sp, -sp.lw / 2, -sp.lh / 2, sp.lw, sp.lh); ctx.restore(); }
  for (const s of B.shots) {
    const sx = X(s.x), sy = Y(s.y);
    if (s.k === 'skewer') { ps(s.aw ? PAPER.ITEM.skewerG : PAPER.ITEM.skewer, sx, sy, s.aw ? B.t * 18 : s.a, 1.1); continue; }
    const col = SHOT_COL[s.k] || '#FFFFFF', t = s.trail;
    if (t) for (let i = Math.max(0, t.length - 6); i < t.length; i += 2) { ctx.globalAlpha = 0.25 + 0.12 * (i - t.length + 6); R(s.aw ? '#F2C230' : col, X(t[i]) - 1, Y(t[i + 1]) - 1, 2, 2); } ctx.globalAlpha = 1;
    ps(PAPER.ITEM[s.k] || PAPER.ITEM.cream, sx, sy, s.k === 'star' ? B.t * 6 + s.x : Math.atan2(s.vy || 0, s.vx || 1), s.k === 'star' ? 1.1 : 1);
  }
  for (const s of B.foeShots) { const sx = X(s.x), sy = Y(s.y), pu = Math.floor(B.t * 8 + s.x) % 2; putDisc(sx, sy, pu ? 8 : 7, pu ? 8 : 7, '#E8323C', 5); ps(PAPER.ITEM.foeshot, sx, sy, B.t * 5 + s.x); }
  /* 던진 초코 폭탄, 떨어지는 지팡이 사탕 */
  for (const L of B.lobs) {
    const k = Math.max(0, Math.min(1, L.t / L.dur)), tx0 = X(L.x), ty0 = Y(L.y);
    if (L.k === 'bomb') {
      const bx = Math.round(X(L.x0) + (tx0 - X(L.x0)) * k), by = Math.round(Y(L.y0) + (ty0 - Y(L.y0)) * k - Math.sin(k * Math.PI) * 26), s2 = L.mini ? 2 : 3;
      shade(tx0, ty0 + 1, 4, 'rgba(24,16,10,.4)'); pcircle(tx0, ty0, L.r / WP * k, 'rgba(255,107,61,.6)');
      ps(PAPER.ITEM.bomb, bx, by, k * 8, L.mini ? 0.7 : 1);
    } else {
      if (L.t < 0) continue;
      const r = Math.round(L.r / WP); pcircle(tx0, ty0, Math.max(1, Math.round(r * (0.4 + 0.6 * k))), k > 0.7 ? '#FFFFFF' : '#FF8FA8');
      ps(PAPER.ITEM.cane, tx0, ty0 - 90 * (1 - k) - 11, 0.15);
    }
  }
  /* 효과 */
  for (const f of B.fx) {
    const k = Math.max(0, f.life / f.max), fx = X(f.x), fy = Y(f.y);
    if (f.k === 'dot') { const s = Math.max(1, Math.round(f.r / WP * (0.5 + 0.5 * k))); R(f.col, fx, fy, s, s); }
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
      for (let a = Math.max(a0, a1 - (spin ? 2.4 : 1.6)); a < a1; a += 1.5 / rr) { const near = a1 - a; R(near < 0.5 ? '#FFFFFF' : spin ? '#FFD86B' : '#FFE1A8', Math.round(cx0 + Math.cos(a) * rr), Math.round(cy0 + Math.sin(a) * rr), near < 0.8 ? 3 : 2, near < 0.8 ? 3 : 2); if (near > 0.5 && near < 1.4) R(spin ? '#FFD86B' : '#FFE1A8', Math.round(cx0 + Math.cos(a) * (rr - 3)), Math.round(cy0 + Math.sin(a) * (rr - 3)), 1, 1); }
      const hx = cx0 + Math.cos(a1) * rr, hy = cy0 + Math.sin(a1) * rr, tx0 = -Math.sin(a1), ty0 = Math.cos(a1);
      ps(spin ? PAPER.ITEM.pinG : PAPER.ITEM.pin, hx, hy, a1 + 1.571, 1.3);
    }
    else { const r = Math.round((f.r + (f.to - f.r) * (1 - k * k)) / WP); if (r > 0) { pcircle(fx, fy, r, f.col, (f.w || 5) > 5 && k > 0.4 ? 2 : 1); if (k > 0.6 && r > 3) pcircle(fx, fy, r - 2, f.col); } }
  }
  /* 가장자리 그늘, 떠다니는 설탕 가루 */
  vignette();
  for (let i = 0; i < 14; i++) { const sx = Math.round(((i * 53 + B.t * (4 + i % 5 * 2)) % (lw + 10)) - 5), sy = Math.round(((i * 91 - B.t * (7 + i % 4 * 3)) % lh + lh) % lh); if (Math.sin(B.t * 2 + i) > -0.3) R(i % 3 ? 'rgba(255,231,240,.45)' : 'rgba(201,182,217,.45)', sx, sy, 1, 1); }
  /* 글자, 번쩍임, 조이스틱은 위에 겹친 선명한 판에 그려요 */
  const d = cv2.width / innerWidth, U = PZ * d; tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, cv2.width, cv2.height);
  if (B.flashScr) { const fk = B.flashScr.t / B.flashScr.max; if (fk <= 0) B.flashScr = null; else { tx.fillStyle = `rgba(${B.flashScr.col},${0.4 * fk})`; tx.fillRect(0, 0, cv2.width, cv2.height); } }
  tx.textAlign = 'center';
  for (const t of B.texts) {
    const e = 1 - t.life / t.max, pop = e < 0.12 ? 1 : 0, size = Math.round((t.big ? 12 : 10) * (PXS + pop) * d), sx = Math.round(X(t.x) * U), sy = Math.round(Y(t.y) * U);
    if (t.life < 0.15 && Math.floor(t.life * 40) % 2) continue;
    tx.font = `${size}px DH, sans-serif`; tx.fillStyle = INK;
    for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) tx.fillText(t.t, sx + a * U, sy + b * U);
    tx.fillStyle = t.col === '#4A2040' ? '#FFFFFF' : t.col; tx.fillText(t.t, sx, sy);
  }
  /* 화면 밖 자석: 가장자리에 방향 화살표 */
  for (const m of B.magnets) {
    const sx = X(m.x) * U, sy = Y(m.y) * U, W = cv2.width, H = cv2.height, top = 118 * d, pad = 26 * d;
    if (sx > 0 && sx < W && sy > top - 40 * d && sy < H) continue;
    const ax = Math.max(pad, Math.min(W - pad, sx)), ay = Math.max(top, Math.min(H - pad * 1.6, sy)), a = Math.atan2(sy - ay, sx - ax), blink = Math.floor(B.t * 5) % 2, s = 9 * d;
    tx.save(); tx.translate(Math.round(ax), Math.round(ay));
    tx.fillStyle = INK; tx.fillRect(-s - U, -s - U, (s + U) * 2, (s + U) * 2); tx.fillStyle = blink ? '#FF4F6B' : '#E8323C'; tx.fillRect(-s, -s, s * 2, s * 2);
    tx.fillStyle = INK; tx.fillRect(-s * 0.3, -s, s * 0.6, s * 1.2); tx.fillStyle = '#DDE3EA'; tx.fillRect(-s, s * 0.45, s * 0.7, s * 0.55); tx.fillRect(s * 0.3, s * 0.45, s * 0.7, s * 0.55);      // 작은 자석 그림
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
  const gap = (now - last) / 1000, raw = Math.min(0.05, gap); last = now;
  if (RS > 1 && !B.paused && gap < 0.5 && (window.__dbg.speed || 1) === 1) { slowT = gap > 0.03 ? slowT + gap : Math.max(0, slowT - gap * 0.5); if (slowT > 2) { RS = 1; slowT = 0; resize(); } }
  if (B.flashScr) B.flashScr.t -= raw;
  if (B.hitstop > 0) B.hitstop -= raw;      // 타격 순간 아주 잠깐 멈춰요
  else {
    let dt = raw; if (B.slow > 0) { B.slow -= raw; dt *= 0.35 + 0.65 * Math.max(0, 1 - B.slow / 0.35); }
    for (let i = 0; i < (window.__dbg.speed || 1); i++) if (B && !B.paused && !B.over) update(dt);
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
const NODE = {
  battle: { name: '전투', desc: '3분 동안 버텨요. 이기면 골드와 하트 1칸을 받아요.', img: 'jelly' },
  elite: { name: '엘리트 전투', desc: '1분 30초에 딱딱 도넛 기사가 나타나요. 이기면 유물을 받아요.', img: 'donut' },
  boss: { name: '보스', desc: '3분에 보스가 나타나요. 잡거나 5분을 버티면 이겨요.', img: 'boss' },
  shop: { name: '상점', desc: '골드로 유물, 무기 손질, 케이크, 코코아를 사요.', icon: 'shop' },
  rest: { name: '휴식처', desc: '하트를 채우거나 무기 하나의 레벨을 올려요.', icon: 'rest' },
  event: { name: '수상한 일', desc: '무슨 일이 생길지 몰라요. 둘 중 하나를 골라요.', icon: 'event' },
  chest: { name: '보물 상자', desc: '유물 1개를 얻어요.', icon: 'chest' }
};
const MAP_ROWS = 6;                      // 막마다 보스 앞까지 6층 (보스 칸 id는 ROWS*3)
/* 3막 구성. 난이도 값은 막이 바뀌어도 이어져요: 1막 0→5, 2막 6→11, 3막 12→17 */
const ACTS = [null,
  { name: '과자 도시', boss: 'boss', elite: 'donut', base: 0, span: 5 },
  { name: '얼음 디저트 나라', boss: 'boss2', elite: 'golem', minion: 'donut', base: 6, span: 5 },
  { name: '불타는 오븐 성', boss: 'boss3', elite: 'knight', minion: 'golem', base: 12, span: 5 }];
const actOf = () => (run && run.act) || 1;
const diffOf = (row, rows) => ACTS[actOf()].base + row * ACTS[actOf()].span / rows;
const floorNo = () => (actOf() - 1) * MAP_ROWS + (run.floor || 0) + 1;      // 모험 전체에서 몇 번째 층인지
function genMap() {
  const ROWS = MAP_ROWS, on = Array.from({ length: ROWS }, () => [false, false, false]), E = new Set();
  for (let p = 0; p < 4; p++) { let c = p < 3 ? p : rnd(3); for (let r = 0; r < ROWS; r++) { on[r][c] = true; if (r === ROWS - 1) break; let nc = clamp(c + rnd(3) - 1, 0, 2); if (nc !== c && E.has(`${r},${nc}>${c}`)) nc = c; E.add(`${r},${c}>${nc}`); c = nc; } }
  const nodes = {};
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < 3; c++) if (on[r][c]) nodes[r * 3 + c] = { id: r * 3 + c, row: r, col: c, jx: rnd(9) - 4, type: 'battle', next: [] };
  E.forEach(k => { const [a, b] = k.split('>'), [r, c] = a.split(',').map(Number); nodes[r * 3 + c].next.push((r + 1) * 3 + Number(b)); });
  const BOSS = ROWS * 3; nodes[BOSS] = { id: BOSS, row: ROWS, col: 1, jx: 0, type: 'boss', next: [] };
  const list = Object.values(nodes), MID = Math.floor(ROWS / 2);
  list.forEach(n => {
    if (n.type === 'boss') return;
    if (n.row === ROWS - 1) { n.type = 'rest'; n.next = [BOSS]; return; }
    if (n.row === MID) { n.type = 'chest'; return; }
    if (n.row === 0) return;
    const x = Math.random();
    n.type = x < 0.45 ? 'battle' : x < 0.6 ? (n.row >= 2 ? 'elite' : 'battle') : x < 0.76 ? 'event' : x < 0.87 ? 'shop' : x < 0.94 ? 'chest' : 'rest';
  });
  const free = Array.from({ length: ROWS - 2 }, (_, i) => i + 1).filter(r => r !== MID);      // 종류를 바꿔도 되는 층
  const need = (type, rows) => { if (list.some(n => n.type === type)) return; const pool = list.filter(n => n.type === 'battle' && rows.includes(n.row)); if (pool.length) pick(pool).type = type; };
  need('elite', free.filter(r => r >= 2)); need('shop', free.filter(r => r >= 2)); need('event', free);
  return { nodes, rows: ROWS };
}
const canGo = id => { const n = run.map.nodes[id]; if (run.done.includes(id)) return false; return run.at == null ? n.row === 0 : run.map.nodes[run.at].next.includes(id); };
const mapRows = () => run.map.rows || 7;
const xy = n => [n.type === 'boss' ? 50 : [18, 50, 82][n.col] + n.jx, (1 - n.row / mapRows()) * 100];
let picked = null;
function renderBar() {
  $('#hpChip').innerHTML = heartsHtml(run.hp, run.maxHp);
  $('#goldChip').innerHTML = `<i>${svg(ICON.coin)}</i>${run.gold}`;
  $('#potChip').innerHTML = run.potion ? `<i>${svg(ICON.cocoa)}</i>` : '';
  $('#relics').innerHTML = run.relics.map(id => `<button class="relic" type="button" data-relic="${id}" aria-label="${RELICS[id].name}">${svg(ICON[RELICS[id].icon])}</button>`).join('');
}
function renderMap() {
  const N = run.map.nodes; let lines = '';
  Object.values(N).forEach(n => n.next.forEach(t => { const [a, b] = xy(n), [c, d] = xy(N[t]), walked = run.done.includes(n.id) && run.done.includes(t); lines += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}"${walked ? ' class="walked"' : ''}/>`; }));
  const m = $('#mapBox'); m.innerHTML = `<div class="map-in" style="height:${mapRows() * 92}px"><svg class="roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg></div>`;
  Object.values(N).forEach(n => {
    const [x, y] = xy(n), d = NODE[n.type], dn = run.done.includes(n.id);
    const b = el('button', `node ${n.type}${dn ? ' done' : ''}${n.id === run.at ? ' here' : ''}${canGo(n.id) ? ' open' : ''}`, d.img ? `<img src="${PAPER.url(d.img, 60)}" alt="">` : svg(ICON[d.icon]));
    b.type = 'button'; b.dataset.id = n.id; b.style.left = x + '%'; b.style.top = y + '%'; b.setAttribute('aria-label', d.name + (dn ? ', 지나온 곳' : canGo(n.id) ? ', 지금 갈 수 있는 곳' : ''));
    m.firstElementChild.appendChild(b);
  });
  /* 지금 갈 수 있는 칸이 화면 아래쪽 2/3 지점에 오도록 스크롤해요 */
  const t = m.querySelector('.node.open') || m.querySelector('.node.here');
  if (t) m.scrollTo({ top: t.offsetTop + 56 - m.clientHeight * 0.62, behavior: 'instant' });
}
function info(html, goId) { $('#info').innerHTML = `<div>${html}</div>${goId != null ? `<button class="cta" type="button" id="btnGo" data-id="${goId}">들어가기</button>` : ''}`; }
function showMap() {
  show('map'); renderBar(); picked = null; renderMap();
  if (!run.wpn.length && overlay.hidden) { starterPick(); return; }     // 첫 무기를 고르기 전에 앱을 껐다 켠 경우
  const open = Object.values(run.map.nodes).filter(n => canGo(n.id));
  if (open.length === 1) pickNode(open[0].id, true);
  else info(`<h3>${actOf()}막 ${ACTS[actOf()].name} · ${run.at == null ? '어느 길로 출발할까요?' : '다음엔 어디로 갈까요?'}</h3><p>금빛으로 빛나는 칸이 지금 갈 수 있는 곳이에요. 위아래로 밀어서 지도를 볼 수 있어요. 눌러 보면 어떤 곳인지 알려 줘요. 하트는 3칸이고, 무엇에 맞든 1칸씩 줄어요. 전투에서 이기면 1칸 차요.</p>`);
}
function pickNode(id, quiet) {
  picked = id; const n = run.map.nodes[id], d = n.type === 'elite' ? { ...NODE.elite, desc: `1분 30초에 ${FOES[ACTS[actOf()].elite].name}이(가) 나타나요. 이기면 유물을 받고, 잡으면 노란 경험치 보석이 쏟아져요.` } : n.type === 'boss' ? { ...NODE.boss, name: `${actOf()}막 보스: ${FOES[ACTS[actOf()].boss].name}`, desc: NODE.boss.desc + (actOf() < 3 ? ' 이기면 다음 막으로 가요.' : ' 마지막 보스예요.') } : NODE[n.type];
  document.querySelectorAll('.node').forEach(b => b.classList.toggle('sel', +b.dataset.id === id));
  if (!quiet) sfx.tap();
  info(`<h3>${d.name}</h3><p>${run.done.includes(id) ? '이미 지나온 곳이에요.' : d.desc}</p>`, canGo(id) ? id : null);
}
$('#mapBox').addEventListener('click', e => { const b = e.target.closest('.node'); if (b) pickNode(+b.dataset.id); });
$('#info').addEventListener('click', e => { const b = e.target.closest('#btnGo'); if (b) enter(+b.dataset.id); });
$('#relics').addEventListener('click', e => { const b = e.target.closest('.relic'); if (!b) return; const r = RELICS[b.dataset.relic]; sfx.tap(); info(`<h3>${r.name}</h3><p>유물. ${r.desc}</p>`); });
function arrive(id) { run.at = id; run.done.push(id); run.floor = run.map.nodes[id].row; persist(); }

/* ───── 무기 보기 ───── */
function weaponSheet() {
  const st = battleStats(), list = run.wpn.map(w => `<div class="opt${w.lv >= 10 ? ' r2' : w.lv >= 5 ? ' r1' : ''}"><span class="ic">${svg(ICON[w.id])}</span><span class="tx"><b>${WEAPONS[w.id].name} Lv${w.lv}${w.lv >= WMAX ? ' (최고)' : ''}</b><span>${wDescFull(w.id)}</span></span></div>`).join('');
  sheet(`<h2 id="cardTitle">내 무기 ${run.wpn.length}개 · Lv ${run.lvl}</h2><p>공격력 ${Math.round(st.dmg * 100)}% · 치명타 ${Math.round(st.crit * 100)}% · 이동 속도 ${Math.round(st.spd * 100)}%</p><div class="opts">${list}</div><button class="cta" type="button" data-act="close" data-pref>닫기</button>`, () => closeSheet());
}
$('#btnDeck').addEventListener('click', () => { sfx.tap(); weaponSheet(); });

/* ───── 칸에 들어가기 ───── */
function enter(id) {
  if (!canGo(id)) return; const n = run.map.nodes[id]; sfx.tap();
  if (n.type === 'battle' || n.type === 'elite' || n.type === 'boss') startBattle(n.type, diffOf(n.row, mapRows()), r => afterBattle(id, r));
  else if (n.type === 'rest') { arrive(id); showMap(); restSheet(); }
  else if (n.type === 'shop') { arrive(id); showMap(); shopSheet(); }
  else if (n.type === 'chest') { arrive(id); showMap(); const r = rollRelic(); if (r) relicSheet(r, '보물 상자를 열었어요', showMap); else { run.gold += 40; renderBar(); noteSheet('보물 상자를 열었어요', '유물을 다 모아서 대신 골드 40을 찾았어요.', 'coin', showMap); } }
  else { arrive(id); showMap(); eventSheet(); }
}
function afterBattle(id, r) {
  if (!r.won) { gameOver(r); return; }
  arrive(id); if (r.kind === 'elite' && r.bigDead) run.elites = (run.elites || 0) + 1;
  run.hp = Math.min(run.maxHp, run.hp + 1 + (has('jar') && r.kind === 'elite' ? 1 : 0));
  const gold = goldGain(18 + 6 * r.floor + (r.kind === 'elite' ? 25 : 0)), oldGold = run.gold; run.gold += gold; persist();
  if (r.kind === 'boss') { if (actOf() >= 3) victory(r); else actClear(r, gold, oldGold); return; }
  showMap();
  const steps = [next => winFx(r.kind === 'elite' ? '엘리트 격파!' : '승리!', gold, oldGold, next)];
  if (r.kind === 'elite') { const rel = rollRelic(); if (rel) steps.push(next => relicSheet(rel, '엘리트 전투 보상', next)); if (!run.potion && Math.random() < 0.5) steps.push(next => { run.potion = true; noteSheet('따뜻한 코코아를 얻었어요', '하트가 다 없어지면 저절로 마시고 하트 1칸으로 다시 일어나요.', 'cocoa', next); }); }
  for (let i = 0; i < (run.picks || 0); i++) steps.push(next => { run.picks--; levelSheet(rollLevelOpts(), next, run.lvl - run.picks); });
  const go = () => { const s = steps.shift(); if (s) s(go); else { persist(); showMap(); } };
  go();
}
/* 막을 깼어요: 보상을 받고 다음 막의 새 지도로 */
function actClear(r, gold, oldGold) {
  const was = actOf(), nextAct = was + 1; showMap();
  const steps = [next => winFx(`${was}막 클리어!`, gold, oldGold, next, true)];
  const rel = rollRelic(); if (rel) steps.push(next => relicSheet(rel, `${was}막 보스 보상`, next));
  for (let i = 0; i < (run.picks || 0); i++) steps.push(next => { run.picks--; levelSheet(rollLevelOpts(), next, run.lvl - run.picks); });
  steps.push(next => { run.hp = Math.min(run.maxHp, run.hp + 2); run.act = nextAct; run.map = genMap(); run.at = null; run.done = []; run.floor = 0; persist(); showMap();
    noteSheet(`${nextAct}막: ${ACTS[nextAct].name}`, `하트를 2칸 채웠어요. 무기와 레벨은 그대로 이어져요. 적이 더 많고 빨라지고, 색이 다른 변종이 나와요. 이 막의 보스는 ${FOES[ACTS[nextAct].boss].name}예요.`, 'chest', next); });
  const go = () => { const st = steps.shift(); if (st) st(go); else { persist(); showMap(); } };
  go();
}
function relicSheet(id, title, next) {
  const r = RELICS[id]; gainRelic(id); sfx.rare();
  sheet(`<h2 id="cardTitle">${title}</h2><div class="prize"><div class="rays"></div><div class="medal">${svg(ICON[r.icon])}</div></div><div class="opts"><div class="opt r2"><span class="ic">${svg(ICON[r.icon])}</span><span class="tx"><b>유물: ${r.name}</b><span>${r.desc} 이번 모험 내내 이어져요.</span></span></div></div><button class="cta" type="button" data-act="go" data-pref>받기</button>`,
    () => { closeSheet(); next(); });
  cardEl.classList.add('reward'); if (!headless) setTimeout(() => { const m = cardEl.querySelector('.medal'); if (m) { const q = m.getBoundingClientRect(); sparkle(q.left + q.width / 2, q.top + q.height / 2, 16); confetti(30, q.left + q.width / 2, q.top + q.height / 2, .8); } }, 260);
}
function noteSheet(title, text, icon, next) {
  sheet(`<h2 id="cardTitle">${title}</h2><div class="opts"><div class="opt"><span class="ic">${svg(ICON[icon])}</span><span class="tx"><span>${text}</span></span></div></div><button class="cta" type="button" data-act="go" data-pref>확인</button>`, () => { closeSheet(); next(); });
}
/* 가진 무기 하나를 골라 1레벨 올려요 */
function upWeaponSheet(title, done) {
  const can = run.wpn.filter(w => w.lv < WMAX);
  if (!can.length) { done(false); return; }
  sheet(`<h2 id="cardTitle">${title}</h2><p>고른 무기의 레벨이 1 올라요.</p><div class="opts">${can.map((w, i) => wOpt(w.id, i)).join('')}</div>`, (a, b) => { const w = can[+b.dataset.i]; w.lv++; sfx.good(); closeSheet(); done(true); });
}
function restSheet() {
  const heal = has('icepack') ? 3 : 2, can = run.wpn.some(w => w.lv < WMAX);
  sheet(`<div class="pic">${svg(ICON.rest)}</div><h2 id="cardTitle">휴식처</h2><p>따뜻한 오븐 옆에서 쉬어 가요. 하나만 고를 수 있어요.</p><div class="opts"><button class="opt" type="button" data-act="heal" data-pref><span class="ic">${svg(ICON.heart)}</span><span class="tx"><b>푹 쉬기</b><span>하트를 ${heal}칸 채워요. 지금 ${run.hp}/${run.maxHp}칸.</span></span></button><button class="opt" type="button" data-act="up"${can ? '' : ' aria-disabled="true"'}><span class="ic">${svg(ICON.ench)}</span><span class="tx"><b>무기 손질하기</b><span>가진 무기 하나의 레벨이 1 올라요.</span></span></button></div>`,
    act => {
      if (act === 'heal') { run.hp = Math.min(run.maxHp, run.hp + heal); sfx.good(); closeSheet(); persist(); showMap(); return; }
      upWeaponSheet('손질할 무기', () => { persist(); showMap(); });
    });
}
function shopSheet() {
  const rel = rollRelic(), state = { rel: rel ? { id: rel, price: 110, sold: false } : null, pot: !run.potion, heart: true, up: true };
  const row = (act, ic, t, d, price, off) => `<button class="opt" type="button" data-act="${act}"${off || run.gold < price ? ' aria-disabled="true"' : ''}><span class="ic">${svg(ICON[ic])}</span><span class="tx"><b>${t}</b><span>${d}</span></span><em>${price}골드</em></button>`;
  const draw = () => sheet(`<div class="pic">${svg(ICON.shop)}</div><h2 id="cardTitle">상점</h2><p>가진 골드는 ${run.gold}이에요.</p><div class="opts">`
    + (state.rel && !state.rel.sold ? row('relic', RELICS[state.rel.id].icon, `유물: ${RELICS[state.rel.id].name}`, RELICS[state.rel.id].desc, state.rel.price).replace('class="opt"', 'class="opt r2"') : '')
    + (state.up ? row('up', 'ench', '무기 손질', '가진 무기 하나의 레벨이 1 올라요.', 90, !run.wpn.some(w => w.lv < WMAX)) : '')
    + (state.heart ? row('heart', 'heart', '딸기 케이크 한 조각', '하트를 1칸 채워요.', 45, run.hp >= run.maxHp) : '')
    + (state.pot ? row('pot', 'cocoa', '따뜻한 코코아', '하트가 다 없어지면 저절로 마시고 다시 일어나요. 하나만 들 수 있어요.', 60) : '')
    + `</div><button class="cta" type="button" data-act="leave" data-pref>상점 나가기</button>`,
    act => {
      if (act === 'leave') { closeSheet(); persist(); showMap(); return; }
      if (act === 'relic') { run.gold -= state.rel.price; state.rel.sold = true; gainRelic(state.rel.id); }
      else if (act === 'pot') { run.gold -= 60; run.potion = true; state.pot = false; }
      else if (act === 'heart') { run.gold -= 45; run.hp = Math.min(run.maxHp, run.hp + 1); state.heart = false; }
      else if (act === 'up') { upWeaponSheet('손질할 무기', ok => { if (ok) { run.gold -= 90; state.up = false; sfx.coin(); } renderBar(); draw(); }); return; }
      sfx.coin(); renderBar(); draw();
    });
  draw();
}
function eventSheet() {
  const EVENTS = [
    { title: '수상한 오븐', text: '혼자 달궈진 오븐에서 좋은 냄새가 나요. 손을 넣으면 데일 것 같아요.', a: ['손을 넣어 꺼내기', '하트를 1칸 잃고 가진 무기 하나가 1레벨 올라요. 마지막 1칸은 남아요.', () => { run.hp = Math.max(1, run.hp - 1); const c = run.wpn.filter(w => w.lv < WMAX); if (c.length) pick(c).lv++; }], b: ['그냥 지나가기', '바닥에 떨어진 골드 15만 주워요.', () => { run.gold += 15; }] },
    { title: '길 잃은 마카롱 상인', text: '보따리를 멘 마카롱이 물건 하나를 싸게 넘기겠다고 해요.', a: ['골드 45에 사기', '유물 1개를 얻어요.', () => { const r = rollRelic(); run.gold -= 45; if (r) gainRelic(r); }, () => run.gold >= 45 && !!rollRelic()], b: ['정중히 거절하기', '아무 일도 일어나지 않아요.', () => {}] },
    { title: '설탕 샘', text: '반짝이는 설탕물이 솟는 샘을 찾았어요. 한 가지만 할 수 있어요.', a: ['한 모금 마시기', '하트를 2칸 채워요.', () => { run.hp = Math.min(run.maxHp, run.hp + 2); }], b: ['병에 담아 가기', '경험치 보석 한 움큼을 얻어요. 다음 전투가 시작되면 바로 들어와요.', () => { run.xp += needOf(run.lvl) * 0.8; }] }
  ];
  const ev = pick(EVENTS), row = (k, o) => `<button class="opt" type="button" data-act="${k}"${o[3] && !o[3]() ? ' aria-disabled="true"' : ''}${k === 'b' ? ' data-pref' : ''}><span class="tx"><b>${o[0]}</b><span>${o[1]}</span></span></button>`;
  sheet(`<div class="pic">${svg(ICON.event)}</div><h2 id="cardTitle">${ev.title}</h2><p>${ev.text}</p><div class="opts">${row('a', ev.a)}${row('b', ev.b)}</div>`,
    act => { ev[act][2](); sfx.good(); closeSheet(); persist(); showMap(); });
}

/* ───── 모험의 시작과 끝 ───── */
function newRun() {
  const hearts = 3 + M('hp');
  run = S.run = { map: genMap(), at: null, done: [], floor: 0, hp: hearts, maxHp: hearts, act: 1, gold: 30, potion: true, kills: 0, elites: 0,
    wpn: [], lvl: 1, xp: 0, bonus: { spd: 0, dmg: 0, crit: 0, heart: 0 }, rerolls: 2 * M('reroll'), relics: ['cape'], dmg: {}, hits: 0, hitBy: {}, time: 0, petUsed: 0 };
  persist(); showMap();
  sheet(`<div class="pic"><img src="${PAPER.url('hero')}" alt=""></div><h2 id="cardTitle">간식 왕국을 지켜요</h2><p>곰팡이 케이크와 그 뒤의 두 대왕이 간식들을 상하게 만들고 있어요. 길을 골라 올라가서 3막의 마지막 보스까지 물리쳐요.</p><p>전투에서는 화면을 누른 채 끌어서 움직이기만 하면 돼요. 공격은 저절로 나가요. 레벨이 오르면 무기와 능력을 골라요. 고른 것은 모험이 끝날 때까지 이어져요.</p><button class="cta" type="button" data-act="go" data-pref>출발하기</button>`, () => { sfx.tap(); starterPick(); });
}
/* 출발할 때 첫 무기를 골라요 (성장 트리에 따라 하나 더, 또는 Lv3으로) */
function starterPick(second) {
  const ids = shuffle(['pin', 'cream', 'lemon', 'skewer', 'choco', 'cotton', 'cane'].filter(id => !wLv(id))).slice(0, 3);     // 혼자서도 싸울 수 있는 무기 중에서
  sheet(`<h2 id="cardTitle">${second ? '두 번째 무기 고르기' : '첫 무기 고르기'}</h2><p>${second ? '성장 트리 덕분에 무기를 하나 더 들고 가요.' : `무기 1개를 골라 들고 가요.${M('veteran') ? ' 숙련 제빵사라서 Lv3으로 시작해요.' : ''}`}</p><div class="opts">${ids.map((id, i) => wOpt(id, i)).join('')}</div>`,
    (act, b) => {
      if (act !== 'pick' || b.closest('.lock')) return;
      run.wpn.push({ id: ids[+b.dataset.i], lv: !second && M('veteran') ? 3 : 1 }); persist(); sfx.good(); closeSheet();
      if (!second && M('start2')) starterPick(true); else showMap();
    });
  flipReveal();
}
function endStars(r, won) { const n = sugarStars(r, won); S.meta.pts += n; S.meta.total += n; return n; }
function victory(r) {
  const stars = endStars(r, true), pg = gainPet(); recordRun(true, stars, pg);
  S.wins++; const kills = run.kills, lvl = run.lvl, nw = run.wpn.length; run = S.run = null; persist();
  show('title'); renderTitle(); winFx('왕국을 지켰어요!', 0, 0, () => {}, true); setTimeout(() => confetti(50, innerWidth / 2, innerHeight * 0.3, 1.3), 1500);
  sheet(`<div class="pic"><img src="${PAPER.url('hero')}" alt=""></div><h2 id="cardTitle">간식 왕국을 지켰어요!</h2><p>${r.bigDead ? '3막의 탄 설탕 마왕까지 물리쳤어요.' : '탄 설탕 마왕의 공격을 끝까지 버텨 냈어요.'} 적 ${kills}마리를 잡았고, Lv ${lvl}, 무기 ${nw}개로 끝까지 왔어요.</p><p class="pts">설탕 별 <b>+${stars}</b>개 · 지금 ${S.meta.pts}개</p><div class="opts">${petLine(pg)}</div><button class="cta" type="button" data-act="tree" data-pref>성장 트리 열기</button><button class="btn" type="button" data-act="go">처음 화면으로</button>`, act => { closeSheet(); if (act === 'tree') treeSheet(); });
}
function gameOver(r) {
  const stars = endStars(r, false), pg = gainPet(); recordRun(false, stars, pg);
  const kills = run.kills, floor = `${actOf()}막 ${run.floor + 1}`; run = S.run = null; persist();
  show('title'); renderTitle();
  sheet(`<div class="pic"><img src="${PAPER.url(r.kind === 'boss' ? 'boss' : r.kind === 'elite' ? 'donut' : 'jelly')}" alt=""></div><h2 id="cardTitle">쓰러졌어요</h2><p>${floor}층에서 쓰러졌어요. 적 ${kills}마리를 잡았어요.</p><p class="pts">설탕 별 <b>+${stars}</b>개 · 지금 ${S.meta.pts}개</p><div class="opts">${petLine(pg)}</div><button class="cta" type="button" data-act="tree" data-pref>성장 트리에서 강해지기</button><button class="btn" type="button" data-act="go">처음 화면으로</button>`, act => { closeSheet(); if (act === 'tree') treeSheet(); });
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
  const going = !!(S.run && S.run.map);
  $('#btnContinue').hidden = !going;
  const b = $('#btnNew'); b.className = going ? 'btn' : 'cta green'; b.textContent = going ? '새 모험 떠나기' : '모험 떠나기';
  $('#titleSub').textContent = going ? `${S.run.act || 1}막 ${(S.run.floor || 0) + 1}층까지 왔어요. 하트 ${S.run.hp}/${S.run.maxHp}칸, Lv ${S.run.lvl}.` : S.wins ? `간식 왕국을 ${S.wins}번 지켜 냈어요.` : '자동으로 공격하는 전투와, 길을 골라 올라가는 모험.';
  $('#btnTree').textContent = `성장 트리 · 설탕 별 ${S.meta.pts}개`;
  $('#btnPet').textContent = S.pet ? `펫 · ${PETS[S.pet].name.split(' ').pop()} Lv${petLv(S.pet)}` : '펫';
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
$('#btnNew').addEventListener('click', () => {
  const b = $('#btnNew');
  if (S.run && S.run.map && !newArmed) { b.textContent = '한 번 더 누르면 지금 모험을 버리고 새로 떠나요'; newArmed = setTimeout(() => { newArmed = 0; b.textContent = '새 모험 떠나기'; }, 3000); return; }
  clearTimeout(newArmed); newArmed = 0; sfx.tap(); newRun();
});
function menuSheet(home) {
  const row = (act, t, d) => `<button class="opt" type="button" data-act="${act}"><span class="tx"><b>${t}</b><span>${d}</span></span></button>`;
  const draw = () => sheet(`<h2 id="cardTitle">메뉴</h2><div class="opts">` + row('sound', S.muted ? '소리 켜기' : '소리 끄기', `지금은 소리가 ${S.muted ? '꺼져' : '켜져'} 있어요.`)
    + (navigator.vibrate ? row('vib', S.vib ? '진동 끄기' : '진동 켜기', `지금은 진동이 ${S.vib ? '켜져' : '꺼져'} 있어요.`) : '')
    + row('music', S.music === false ? '배경음악 켜기' : '배경음악 끄기', `지금은 배경음악이 ${S.music === false ? '꺼져' : '켜져'} 있어요.`)
    + (home ? row('home', '처음 화면으로 가기', '모험은 저장돼 있어서 이어서 할 수 있어요.') : '') + `</div><button class="cta" type="button" data-act="close" data-pref>닫기</button>`,
    act => { if (act === 'music') { S.music = S.music === false; persist(); setMusicVol(); sfx.tap(); draw(); return; } if (act === 'diff') { const k = Object.keys(DIFF); S.diff = k[(k.indexOf(S.diff) + 1) % k.length]; persist(); sfx.tap(); draw(); } else if (act === 'sound') { S.muted = !S.muted; persist(); setMusicVol(); sfx.tap(); draw(); } else if (act === 'vib') { S.vib = !S.vib; persist(); buzz(20); draw(); } else if (act === 'home') { closeSheet(); show('title'); renderTitle(); } else closeSheet(); });
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
  auto(on) { if (B) B.auto = on; }
};

/* 제목과 지도 뒤의 배경: 해 질 녘 과자 도시를 낮은 해상도로 한 번 그려요 */
function drawBg() {
  const c = $('#bgCv'), d = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight; c.width = Math.round(W * d); c.height = Math.round(H * d);
  const q = c.getContext('2d'), r = PAPER.rng(11); q.scale(d, d); q.fillStyle = '#2F6F73'; q.fillRect(0, 0, W, H);
  const cut = (pts, col) => { for (const [oy, cc] of [[4, 'rgba(20,14,10,.22)'], [0, col]]) { q.fillStyle = cc; q.beginPath(); pts.forEach(([x, y]) => q.lineTo(x, y + oy)); q.fill(); } };
  cut(PAPER.ring(W * 0.76, H * 0.13, 36, 36, 11, 0.04), '#F3E2B0');
  for (const [x, y, s] of [[0.2, 0.1, 1], [0.55, 0.2, 0.7], [0.9, 0.27, 0.8]]) cut([[-46, 8], [-30, -8], [-8, -4], [6, -16], [30, -10], [48, 8]].map(([a, b]) => [W * x + a * s, H * y + b * s]), '#F7EFDC');
  const layer = (col, base, amp, n) => { const pts = [[0, H], [0, base]]; for (let i = 1; i < n; i++) pts.push([W * i / n, base + (r() - 0.5) * amp * 2]); pts.push([W, base], [W, H]); cut(pts, col); };
  layer('#3F8B8C', H * 0.36, 34, 7); layer('#7FA88A', H * 0.46, 26, 6); layer('#285E62', H * 0.56, 14, 8);
  q.setTransform(1, 0, 0, 1, 0, 0); q.fillStyle = q.createPattern(PAPER.NOISE, 'repeat'); q.fillRect(0, 0, c.width, c.height);
}
addEventListener('resize', drawBg);
Promise.all([loadImages(), ...Object.values(ICON).concat(HEART_EMPTY).map(pixelIcon), ...(document.fonts ? ['12px DH'].map(f => document.fonts.load(f, '가0').catch(() => {})) : [])]).then(() => { document.documentElement.style.setProperty('--grain', `url(${PAPER.NOISE.toDataURL()})`); for (const [c, n, px] of [['h', 'hero', 160], ['e1', 'jelly', 72], ['e2', 'cookie', 84]]) document.querySelector('.t-art .' + c).src = PAPER.url(n, px); drawBg(); show('title'); renderTitle(); });
