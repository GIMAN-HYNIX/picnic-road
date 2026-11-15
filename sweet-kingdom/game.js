'use strict';
/* 쪈이의 디저트 대작전 — 전투는 이동만 하는 자동 공격, 전투 사이에는 갈림길을 고르고 카드 덱을 짜는 게임 */

const $ = s => document.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const rnd = n => Math.floor(Math.random() * n), rand = (a, b) => a + Math.random() * (b - a), pick = a => a[rnd(a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const svg = inner => `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${inner}</svg>`;

/* ───── 저장 (이 폰에만) ───── */
const KEY = 'sweet-kingdom-v1';
let S = { muted: false, vib: true, wins: 0, run: null };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
if (S.run && S.run.maxHp > 10) { const r = S.run, m = 3 + (r.relics || []).includes('apron'); r.hp = Math.max(1, Math.round(r.hp / r.maxHp * m)); r.maxHp = m; }
if (false) { r.maxHp = m; }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
let run = null;

/* ───── 그림 ───── */
const IMG = {};
const SPRITES = ['hero', 'jelly', 'cookie', 'ice', 'donut', 'boss'];
function loadImages() {
  return Promise.all(SPRITES.map(n => new Promise(res => {
    const im = new Image();
    im.onload = () => {      // 맞았을 때 번쩍이는 흰 실루엣도 같이 만들어 둬요
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      IMG[n] = { im, white: c, ratio: im.width / im.height }; res();
    };
    im.onerror = () => { IMG[n] = null; res(); };
    im.src = `img/${n}.png`;
  })));
}

/* ───── 소리와 진동 ───── */
let ac, bus, noiseBuf;
function audio() {
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); const comp = ac.createDynamicsCompressor(); bus = ac.createGain(); bus.gain.value = 0.8; bus.connect(comp); comp.connect(ac.destination); }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function voice(f, d, o = {}) {
  const a = audio(), t0 = a.currentTime + (o.at || 0), osc = a.createOscillator(), g = a.createGain();
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  osc.connect(g); g.connect(bus); osc.start(t0); osc.stop(t0 + d + 0.05);
}
function hiss(d, o = {}) {
  const a = audio(), t0 = a.currentTime + (o.at || 0);
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const src = a.createBufferSource(), flt = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf; src.loop = true; flt.type = o.type || 'bandpass'; flt.Q.value = o.q || 0.8; flt.frequency.setValueAtTime(o.f || 3000, t0);
  if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(flt); flt.connect(g); g.connect(bus); src.start(t0, Math.random() * 0.5); src.stop(t0 + d + 0.05);
}
const bell = (f, d, vol = 0.08, at = 0) => { voice(f, d, { vol, at }); voice(f * 2.76, d * 0.6, { vol: vol * 0.35, at }); };
let headless = false;                         // 테스트용 빠른 진행에서는 소리와 연출을 건너뛰어요
const lastPlayed = {};
function play(name, fn, gap = 0) {
  if (headless || S.muted) return;
  const now = performance.now(); if (gap && now - (lastPlayed[name] || 0) < gap) return; lastPlayed[name] = now;
  try { fn(); } catch (e) { if (window.__soundDebug) throw e; }
}
function buzz(p) { if (headless || !S.vib || !navigator.vibrate) return; try { navigator.vibrate(p); } catch (e) {} }
const sfx = {
  hit() { play('hit', () => { const k = rand(0.85, 1.2); hiss(.035, { type: 'highpass', f: 2600 * k, vol: .07 }); voice(170 * k, .07, { to: 70, vol: .12 }); voice(560 * k, .04, { to: 300, type: 'triangle', vol: .04 }); }, 40); },
  crit() { play('crit', () => { voice(1200, .07, { to: 1800, type: 'square', vol: .035 }); hiss(.06, { type: 'highpass', f: 4000, vol: .08 }); voice(130, .12, { to: 50, vol: .18 }); }, 70); },
  kill() { play('kill', () => { const k = rand(0.9, 1.15); voice(820 * k, .1, { to: 300, vol: .08 }); voice(210 * k, .12, { to: 60, vol: .16 }); hiss(.08, { f: 1500, to: 500, vol: .09 }); }, 45); buzz(8); },
  bigKill() { play('bigKill', () => { voice(90, .7, { to: 35, vol: .28 }); hiss(.6, { type: 'lowpass', f: 3000, to: 150, vol: .2 }); [784, 1047, 1318, 1568].forEach((f, i) => bell(f, .35, .07, .15 + i * .07)); }); buzz([30, 30, 90]); },
  gem() { play('gem', () => voice(980 + Math.random() * 300, .06, { vol: .045 }), 40); },
  swing() { play('swing', () => hiss(.12, { f: 900, to: 2600, vol: .07 }), 80); },
  shot() { play('shot', () => voice(640, .05, { to: 900, vol: .035 }), 90); },
  hurt() { play('hurt', () => { voice(220, .3, { to: 70, type: 'triangle', vol: .2 }); voice(110, .35, { to: 40, vol: .22 }); hiss(.2, { type: 'lowpass', f: 1600, to: 200, vol: .14 }); }); buzz([70, 40, 50]); },
  block() { play('block', () => { bell(1046, .25, .09); hiss(.06, { f: 5000, vol: .06 }); }); buzz(20); },
  level() { play('level', () => { [523, 659, 784, 1047].forEach((f, i) => bell(f, .3, .08, i * .07)); }); buzz([15, 30, 25]); },
  warn() { play('warn', () => { voice(330, .14, { type: 'square', vol: .05 }); voice(330, .14, { type: 'square', vol: .05, at: .2 }); }, 300); },
  slam() { play('slam', () => { voice(120, .4, { to: 45, vol: .24 }); hiss(.3, { type: 'lowpass', f: 2000, to: 200, vol: .16 }); }); buzz(60); },
  boss() { play('boss', () => { voice(98, .9, { to: 62, type: 'triangle', vol: .2 }); hiss(.9, { type: 'lowpass', f: 300, to: 1600, vol: .1 }); }); buzz(120); },
  revive() { play('revive', () => { [392, 523, 659, 784, 1047].forEach((f, i) => bell(f, .4, .09, i * .08)); }); buzz([40, 40, 80]); },
  tap() { play('tap', () => voice(660, .05, { to: 880, vol: .06 })); buzz(6); },
  coin() { play('coin', () => { bell(1318, .2, .07); bell(1760, .3, .07, .07); }); },
  good() { play('good', () => { [784, 1047, 1318].forEach((f, i) => bell(f, .4, .08, i * .08)); }); buzz([15, 30, 30]); },
  no() { play('no', () => { voice(200, .08, { to: 150, type: 'triangle', vol: .1 }); voice(160, .1, { to: 115, type: 'triangle', vol: .1, at: .09 }); }); },
  win() { play('win', () => { [523, 659, 784, 1047].forEach((f, i) => { voice(f, .45, { type: 'triangle', vol: .1, at: i * .11 }); }); bell(1568, 1, .08, .5); }); buzz([20, 40, 20, 40, 60]); },
  lose() { play('lose', () => { [392, 349, 294].forEach((f, i) => voice(f, .34, { type: 'triangle', vol: .11, at: i * .17 })); }); buzz([60, 40, 60]); }
};

/* ───── 카드 ───── */
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
  ench: `<path d="M50 8L60 40L92 50L60 60L50 92L40 60L8 50L40 40Z" fill="#B58CFF" stroke="#6A3FC0" stroke-width="3" stroke-linejoin="round"/>`
};
/* type w = 무기, p = 패시브. rar 0 일반 / 1 고급 / 2 희귀 */
const CARDS = {
  pin: { name: '롤링핀 휘두르기', type: 'w', rar: 0, desc: '가까운 적 쪽으로 롤링핀을 크게 휘둘러요.' },
  cream: { name: '휘핑크림 분사', type: 'w', rar: 0, desc: '가장 가까운 적에게 크림을 쏴요.' },
  star: { name: '별사탕 산탄', type: 'w', rar: 0, desc: '움직이는 방향으로 별사탕 3알을 뿌려요.' },
  macaron: { name: '마카롱 회전', type: 'w', rar: 1, desc: '마카롱 2개가 몸 주위를 돌며 부딪혀요.' },
  honey: { name: '꿀 장판', type: 'w', rar: 1, desc: '3초마다 발밑에 꿀을 깔아요. 적이 느려지고 다쳐요.' },
  lemon: { name: '레몬즙 물총', type: 'w', rar: 1, desc: '가까운 적에게 쏴서 산성을 2 쌓아요. 산성은 계속 피해를 줘요.' },
  skewer: { name: '탕후루 꼬치', type: 'w', rar: 2, desc: '움직이는 방향으로 적을 전부 꿰뚫는 꼬치를 던져요.' },
  hands: { name: '날쌘 손', type: 'p', rar: 1, desc: '쏘는 무기의 발사 수가 1 늘어요.' },
  sour: { name: '새콤 촉진', type: 'p', rar: 2, desc: '산성이 2배로 쌓여요.' },
  dough: { name: '든든한 반죽', type: 'p', rar: 1, desc: '전투 중 하트가 1칸 늘어요.' },
  magnet: { name: '설탕 자석', type: 'p', rar: 0, desc: '경험치 보석을 더 멀리서 끌어와요.' },
  glove: { name: '오븐 장갑', type: 'p', rar: 0, desc: '맞은 뒤 무적 시간이 50% 늘어요.' }
};
const ENCH = {
  pierce: { name: '관통', desc: '쏘는 무기는 적을 2마리 더 뚫고, 그 밖의 무기는 범위가 넓어져요.' },
  split: { name: '분열', desc: '이 무기로 적을 잡으면 파편 2개가 튀어 나가요.' },
  acid: { name: '산성 부여', desc: '이 무기에 맞은 적에게 산성이 1 쌓여요.' }
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
const cardLabel = c => CARDS[c.id].name + (c.plus ? '+' : '') + (c.ench ? ` (${ENCH[c.ench].name})` : '');
const cardDesc = c => CARDS[c.id].desc + (c.plus ? ' 강화돼서 더 세요.' : '') + (c.ench ? ' ' + ENCH[c.ench].desc : '');
const TYPE = { w: '무기', p: '패시브' }, RAR = ['일반', '고급', '희귀'];
function cardOpt(c, i, o = {}) {
  const d = CARDS[c.id];
  return `<button class="opt r${d.rar}${o.on ? ' on' : ''}" type="button" data-act="${o.act || 'pick'}" data-i="${i}"${o.off ? ' aria-disabled="true"' : ''}${o.pref ? ' data-pref' : ''}><span class="ic">${svg(ICON[c.id])}</span><span class="tx"><b>${cardLabel(c)}</b><span>${RAR[d.rar]} ${TYPE[d.type]}. ${cardDesc(c)}</span></span>${o.price != null ? `<em>${o.price}골드</em>` : ''}</button>`;
}
function rollCard(minRar = 0) {
  const have = new Set(run.deck.filter(c => CARDS[c.id].type === 'p').map(c => c.id));
  const x = Math.random(), rar = Math.max(minRar, x < 0.6 ? 0 : x < 0.9 ? 1 : 2);
  const pool = Object.keys(CARDS).filter(id => CARDS[id].rar === rar && !have.has(id));
  const all = Object.keys(CARDS).filter(id => !have.has(id));
  return { id: pick(pool.length ? pool : all), plus: false, ench: null };
}
function rollCards(n, minRar) { const out = []; for (let g = 0; out.length < n && g < 40; g++) { const c = rollCard(minRar); if (!out.some(o => o.id === c.id)) out.push(c); } return out; }
function rollRelic() { const pool = Object.keys(RELICS).filter(id => id !== 'cape' && !run.relics.includes(id)); return pool.length ? pick(pool) : null; }
function gainRelic(id) { run.relics.push(id); if (id === 'apron') { run.maxHp += 1; run.hp += 1; } }
const HEART_EMPTY = `<path d="M50 86C20 64 10 48 10 34C10 20 21 12 32 12C41 12 47 17 50 23C53 17 59 12 68 12C79 12 90 20 90 34C90 48 80 64 50 86Z" fill="none" stroke="#C99AAE" stroke-width="7"/>`;
const heartsHtml = (hp, max) => Array.from({ length: max }, (_, i) => `<i class="hrt${i < hp ? '' : ' off'}">${svg(i < hp ? ICON.heart : HEART_EMPTY)}</i>`).join('');
const has = id => run.relics.includes(id);
const goldGain = n => Math.round(n * (has('fortune') ? 1.3 : 1));

/* ───── 적 ───── */
const FOES = {
  jelly: { img: 'jelly', hp: 14, spd: 68, dmg: 7, r: 15, h: 38, xp: 1 },
  ice: { img: 'ice', hp: 9, spd: 118, dmg: 5, r: 12, h: 40, xp: 1 },
  cookie: { img: 'cookie', hp: 36, spd: 50, dmg: 11, r: 17, h: 42, xp: 2 },
  donut: { img: 'donut', hp: 520, spd: 78, dmg: 16, r: 28, h: 78, xp: 12, name: '딱딱 도넛 기사' },
  boss: { img: 'boss', hp: 1700, spd: 34, dmg: 20, r: 56, h: 150, xp: 0, name: '곰팡이 케이크' }
};

/* ═════ 전투 ═════ */
let B = null;                    // 지금 전투
const VIEW_W = 390;              // 화면 가로를 항상 이 길이로 봐요
const cv = $('#cv'), ctx = cv.getContext('2d');
let scale = 1, vw = 390, vh = 780;
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = window.innerWidth, h = window.innerHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  scale = cv.width / VIEW_W; vw = VIEW_W; vh = cv.height / scale;
}
addEventListener('resize', resize);

function battleStats() {
  const eq = run.equip.map(i => run.deck[i]).filter(Boolean), n = id => eq.filter(c => c.id === id).reduce((s, c) => s + (c.plus ? 1.5 : 1), 0);
  return {
    dmg: has('whisk') ? 1.15 : 1, xp: has('cup') ? 1.25 : 1, spd: has('boots') ? 1.12 : 1,
    proj: Math.round(n('hands')), acid: n('sour') ? 2 * (n('sour') > 1 ? 1.5 : 1) : 1, hpAdd: Math.floor(n('dough')),
    pickup: 46 * (1 + 0.6 * n('magnet')), invK: 1 + 0.5 * n('glove')
  };
}
function startBattle(kind, floor, onEnd) {
  const st = battleStats(), dur = kind === 'boss' ? 300 : 120;
  B = {
    kind, floor, onEnd, t: 0, dur, st, paused: false, over: false,
    p: { x: 0, y: 0, hp: run.hp + st.hpAdd, max: run.maxHp + st.hpAdd, inv: 0, face: 1, dirX: 0, dirY: -1, moving: false, bob: 0, shield: has('cloud') },
    foes: [], shots: [], foeShots: [], gems: [], zones: [], fx: [], texts: [], telegraphs: [],
    weapons: run.equip.map(i => run.deck[i]).filter(c => c && CARDS[c.id].type === 'w').map(c => ({ id: c.id, lv: 1 + (c.plus ? 1 : 0), ench: c.ench, cd: Math.random() * 0.5, ang: 0 })),
    lvl: 1, xp: 0, need: 6, kills: 0, spawnAcc: 0, shake: 0, buffDmg: 1, buffSpd: 1, hitstop: 0, hsCool: 0, slow: 0, flashScr: null, heartPop: 0,
    eliteAt: kind === 'elite' ? 60 : -1, bossAt: kind === 'boss' ? 180 : -1, big: null, bigDead: false, joy: null, hudT: -1, hudHp: -1, hudXp: -1
  };
  if (!headless) {
    show('battle'); resize();
    $('#bossBar').hidden = true; $('#potHud').innerHTML = run.potion ? svg(ICON.cocoa) : '';
    toast(kind === 'boss' ? '3분 뒤에 보스가 나타나요' : kind === 'elite' ? '1분 뒤에 엘리트가 나타나요' : '2분만 버텨요!');
    if (window.__dbg.autoAll) B.auto = true;
    last = performance.now(); requestAnimationFrame(frame);
  }
}
let toastTimer = 0;
function toast(t) { if (headless) return; const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { e.hidden = true; }, 2200); }

function spawnFoe(type, x, y) {
  const d = FOES[type], grow = 1 + 0.2 * B.floor + (B.t / 120) * 0.5;
  const big = type === 'donut' || type === 'boss';
  const f = { type, x, y, r: d.r, hp: d.hp * (big ? 1 + 0.12 * B.floor : grow), spd: d.spd, dmg: d.dmg * (1 + 0.1 * B.floor), flash: 0, acid: 0, acidT: 0, slow: 0, hitT: {}, ph: Math.random() * 6.28, st: 0, stT: big ? 3 : 0, vx: 0, vy: 0, kx: 0, ky: 0, sq: 0, dead: false };
  f.max = f.hp; B.foes.push(f); return f;
}
function spawnRing(type) {
  const a = Math.random() * 6.283, R = Math.hypot(vw, vh) / 2 + 40;
  return spawnFoe(type, B.p.x + Math.cos(a) * R, B.p.y + Math.sin(a) * R);
}
function fxAdd(o) { if (!headless && B.fx.length < 260) B.fx.push(o); }
function textAdd(x, y, t, col, big) { if (!headless && B.texts.length < 40) B.texts.push({ x: x + rand(-8, 8), y, vx: rand(-30, 30), vy: -150 - (big ? 40 : 0), t, col: col || '#4A2040', life: big ? 0.8 : 0.6, max: big ? 0.8 : 0.6, big: !!big }); }
/* 부스러기: 중력을 받아 튀었다 떨어져요 */
function burst(x, y, col, n = 6, sp = 150) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = rand(sp * 0.3, sp); fxAdd({ k: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, g: 420, life: rand(0.3, 0.55), max: 0.55, col, r: rand(2, 5) }); } }
/* 맞은 자리에 별 모양 섬광 */
function spark(x, y, a, col = '#FFFFFF', big) { fxAdd({ k: 'flash', x, y, r: big ? 26 : 16, life: 0.09, max: 0.09, col }); for (let i = 0; i < (big ? 6 : 4); i++) { const aa = a + rand(-1.1, 1.1), s = rand(220, 420); fxAdd({ k: 'line', x, y, vx: Math.cos(aa) * s, vy: Math.sin(aa) * s, life: rand(0.1, 0.18), max: 0.18, col, w: big ? 3.5 : 2.5 }); } }
const FOE_COL = { jelly: '#3FCF7A', cookie: '#B9783F', ice: '#9FDBFF', donut: '#FF8FB8', boss: '#C77DFF' };
function hitStop(t) { if (!headless && B.hsCool <= 0) { B.hitstop = Math.max(B.hitstop, t); B.hsCool = 0.12; } }

function hurtFoe(f, d, w, ax, ay) {
  if (f.dead) return;
  const crit = Math.random() < 0.12; if (crit) d *= 1.8;
  d *= B.st.dmg * B.buffDmg; f.hp -= d; f.flash = 0.08; f.sq = 0.35;
  if (w && w.ench === 'acid') f.acid += B.st.acid;
  /* 맞은 방향으로 밀려나요 (큰 적은 조금만) */
  let dx = ax, dy = ay; if (dx == null) { dx = f.x - B.p.x; dy = f.y - B.p.y; } const m = Math.hypot(dx, dy) || 1, kb = (f === B.big ? 40 : 230) * (crit ? 1.5 : 1);
  f.kx = dx / m * kb; f.ky = dy / m * kb;
  if (!headless) { const a = Math.atan2(dy, dx); spark(f.x - dx / m * f.r * 0.5, f.y - FOES[f.type].h * 0.35 - dy / m * f.r * 0.3, a, crit ? '#FFE066' : '#FFFFFF', crit); }
  textAdd(f.x, f.y - FOES[f.type].h * 0.8, Math.round(d) + (crit ? '!' : ''), crit ? '#FF9A1F' : '#4A2040', crit);
  if (crit) { sfx.crit(); hitStop(0.045); } else sfx.hit();
  if (f.hp <= 0) killFoe(f, w);
}
function killFoe(f, w) {
  f.dead = true; B.kills++;
  const d = FOES[f.type], col = FOE_COL[f.type], big = f === B.big;
  if (d.xp) B.gems.push({ x: f.x, y: f.y, v: d.xp, pull: false });
  burst(f.x, f.y - d.h * 0.3, col, big ? 40 : 10, big ? 320 : 190); burst(f.x, f.y - d.h * 0.3, '#FFFFFF', big ? 14 : 4, 120);
  fxAdd({ k: 'ghost', img: d.img, x: f.x, y: f.y + f.r * 0.7, h: d.h, flip: f.x > B.p.x ? -1 : 1, life: big ? 0.5 : 0.2, max: big ? 0.5 : 0.2 });
  fxAdd({ k: 'ring', x: f.x, y: f.y - d.h * 0.3, r: f.r * 0.6, to: f.r * (big ? 5 : 2.6), life: big ? 0.45 : 0.22, max: big ? 0.45 : 0.22, col: big ? '#FFC83D' : '#FFFFFF', w: big ? 8 : 4 });
  if (big) { sfx.bigKill(); B.hitstop = 0.18; B.slow = 0.6; B.shake = 0.6; B.flashScr = { col: '255,255,255', t: 0.25, max: 0.25 }; }
  else { sfx.kill(); hitStop(f.type === 'cookie' ? 0.035 : 0.02); B.shake = Math.max(B.shake, f.type === 'cookie' ? 0.1 : 0.05); }
  if (w && w.ench === 'split') for (let i = 0; i < 2; i++) { const a = Math.random() * 6.283; B.shots.push({ k: 'shard', x: f.x, y: f.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 5, dmg: 7, pierce: 0, life: 0.7, w: null, hit: new Set([f]) }); }
  if (big) { B.bigDead = true; if (B.kind === 'boss') endBattle(true); else toast('엘리트를 잡았어요!'); }
}
/* 하트 3칸: 무엇에 맞든 한 번에 1칸 */
function hurtPlayer(src) {
  const p = B.p; if (p.inv > 0 || B.over) return; if (window.__dbg) (window.__dbg.hits = window.__dbg.hits || {})[src || '?'] = ((window.__dbg.hits || {})[src || '?'] || 0) + 1;
  const push = (R, d) => B.foes.forEach(f => { const dx = f.x - p.x, dy = f.y - p.y, m = Math.hypot(dx, dy) || 1; if (m < R && f !== B.big) { f.kx = dx / m * d; f.ky = dy / m * d; } });
  if (p.shield) { p.shield = false; p.inv = 0.8; textAdd(p.x, p.y - 50, '막음!', '#59B8FF', true); sfx.block(); push(120, 400); fxAdd({ k: 'ring', x: p.x, y: p.y - 24, r: 30, to: 120, life: 0.3, max: 0.3, col: '#59B8FF', w: 6 }); return; }
  p.hp -= 1; p.inv = 1.3 * B.st.invK; B.shake = 0.35; B.hitstop = 0.12; B.slow = 0.35; B.flashScr = { col: '224,68,90', t: 0.35, max: 0.35 }; B.heartPop = 0.5;
  push(130, 520); burst(p.x, p.y - 30, '#E0445A', 12, 220); fxAdd({ k: 'ring', x: p.x, y: p.y - 24, r: 38, to: 140, life: 0.32, max: 0.32, col: '#E0445A', w: 5 });
  sfx.hurt();
  if (p.hp <= 0) {
    if (run.potion) {      // 따뜻한 코코아: 저절로 마시고 하트 1칸으로 다시 일어나요
      run.potion = false; p.hp = 1; p.inv = 2.2;
      push(200, 700);
      fxAdd({ k: 'ring', x: p.x, y: p.y, r: 10, to: 200, life: 0.5, max: 0.5, col: '#FFC83D', w: 8 }); toast('코코아를 마시고 다시 일어났어요!'); sfx.revive();
      if (!headless) $('#potHud').innerHTML = '';
    } else { p.hp = 0; endBattle(false); }
  }
}
function nearestFoe(range) { let best = null, bd = range * range; const p = B.p; for (const f of B.foes) { if (f.dead) continue; const d = (f.x - p.x) ** 2 + (f.y - p.y) ** 2; if (d < bd) { bd = d; best = f; } } return best; }
const wDmg = (w, base) => base * (1 + 0.28 * (w.lv - 1));
const area = w => w.ench === 'pierce' ? 1.25 : 1;

function fireWeapons(dt) {
  const p = B.p;
  for (const w of B.weapons) {
    w.cd -= dt;
    if (w.id === 'macaron') {            // 늘 돌고 있어요
      w.ang += dt * 3.2; const n = 2 + (w.lv >= 3 ? 1 : 0) + (w.lv >= 5 ? 1 : 0) + B.st.proj, R = 58 * area(w);
      w.orbs = [];
      for (let i = 0; i < n; i++) {
        const a = w.ang + i * 6.283 / n, ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R; w.orbs.push([ox, oy]);
        for (const f of B.foes) { if (f.dead) continue; if ((f.x - ox) ** 2 + (f.y - oy) ** 2 < (f.r + 11) ** 2 && (f.hitT.mac || 0) <= B.t) { f.hitT.mac = B.t + 0.45; hurtFoe(f, wDmg(w, 8), w, f.x - ox, f.y - oy); } }
      }
      continue;
    }
    if (w.cd > 0) continue;
    if (w.id === 'pin') {
      const R = (72 + 6 * w.lv) * area(w), t = nearestFoe(R + 30);
      if (!t) { w.cd = 0.15; continue; }
      const a = Math.atan2(t.y - p.y, t.x - p.x); w.cd = 1.05;
      for (const f of B.foes) { if (f.dead) continue; const dx = f.x - p.x, dy = f.y - p.y, m = Math.hypot(dx, dy); if (m < R + f.r) { let da = Math.abs(Math.atan2(dy, dx) - a); if (da > Math.PI) da = 6.283 - da; if (da < 1.25) hurtFoe(f, wDmg(w, 15), w, dx, dy); } }
      fxAdd({ k: 'arc', x: p.x, y: p.y, a, r: R, life: 0.22, max: 0.22 }); B.shake = Math.max(B.shake, 0.04); sfx.swing();
    } else if (w.id === 'cream' || w.id === 'lemon') {
      const t = nearestFoe(300); if (!t) { w.cd = 0.2; continue; }
      const a = Math.atan2(t.y - p.y, t.x - p.x), n = 1 + B.st.proj; w.cd = w.id === 'cream' ? 0.78 : 0.95;
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.16; if (i === 0) fxAdd({ k: 'flash', x: p.x + Math.cos(a) * 18, y: p.y - 10 + Math.sin(a) * 18, r: 11, life: 0.07, max: 0.07, col: w.id === 'cream' ? '#FFFFFF' : '#F4E04D' }); B.shots.push({ k: w.id, x: p.x, y: p.y - 10, vx: Math.cos(aa) * 330, vy: Math.sin(aa) * 330, r: 7, dmg: wDmg(w, w.id === 'cream' ? 10 : 5), acid: w.id === 'lemon' ? 2 : 0, pierce: w.ench === 'pierce' ? 2 : 0, life: 1.2, w, hit: new Set() }); }
      sfx.shot();
    } else if (w.id === 'star') {
      const a = Math.atan2(p.dirY, p.dirX), n = 3 + B.st.proj + (w.lv >= 4 ? 1 : 0); w.cd = 1.25;
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.22; B.shots.push({ k: 'star', x: p.x, y: p.y - 10, vx: Math.cos(aa) * 300, vy: Math.sin(aa) * 300, r: 7, dmg: wDmg(w, 7), pierce: w.ench === 'pierce' ? 2 : 0, life: 0.9, w, hit: new Set() }); }
      sfx.shot();
    } else if (w.id === 'skewer') {
      const a = Math.atan2(p.dirY, p.dirX), n = 1 + B.st.proj; w.cd = 1.5;
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.14; B.shots.push({ k: 'skewer', x: p.x, y: p.y - 10, vx: Math.cos(aa) * 430, vy: Math.sin(aa) * 430, r: 9, dmg: wDmg(w, 17), pierce: 99, life: 0.9, w, hit: new Set(), a: aa }); }
      sfx.shot();
    } else if (w.id === 'honey') {
      w.cd = 3; B.zones.push({ x: p.x, y: p.y, r: (52 + 4 * w.lv) * area(w), life: 3, tick: 0, dmg: wDmg(w, 5), w });
    }
  }
}

function levelUp() {
  B.lvl++; B.xp -= B.need; B.need = Math.round(6 + 4.5 * (B.lvl - 1));
  if (has('sprinkle')) { B.foes.forEach(f => { if (!f.dead && (f.x - B.p.x) ** 2 + (f.y - B.p.y) ** 2 < 130 * 130) hurtFoe(f, 30, null); }); fxAdd({ k: 'ring', x: B.p.x, y: B.p.y, r: 10, to: 130, life: 0.3, max: 0.3, col: '#FF8FB8', w: 6 }); }
  const ups = B.weapons.filter(w => w.lv < 6).map(w => ({ t: 'up', w, title: `${CARDS[w.id].name} 강화`, desc: `이번 전투 동안 Lv${w.lv} → Lv${w.lv + 1}. 더 세져요.`, icon: w.id }));
  const buffs = [
    ...(B.p.hp < B.p.max ? [{ t: 'heal', title: '달콤한 한 입', desc: '하트를 1칸 채워요.', icon: 'heart' }] : []),
    { t: 'dmg', title: '설탕 폭주', desc: '이번 전투 동안 주는 피해가 12% 늘어요.', icon: 'star' },
    { t: 'spd', title: '가벼운 발걸음', desc: '이번 전투 동안 10% 빨리 달려요.', icon: 'honey' }
  ];
  const opts = shuffle(ups).slice(0, 2).concat(shuffle(buffs)).slice(0, 3);
  const apply = o => { if (o.t === 'up') o.w.lv++; else if (o.t === 'heal') B.p.hp = Math.min(B.p.max, B.p.hp + 1); else if (o.t === 'dmg') B.buffDmg *= 1.12; else B.buffSpd *= 1.1; };
  if (headless) { apply(opts[0]); return; }
  B.paused = true; sfx.level();
  sheet(`<h2 id="cardTitle">레벨 ${B.lvl}!</h2><p>하나를 골라요. 이번 전투가 끝날 때까지 이어져요.</p><div class="opts">${opts.map((o, i) => `<button class="opt" type="button" data-act="pick" data-i="${i}"><span class="ic">${svg(ICON[o.icon])}</span><span class="tx"><b>${o.title}</b><span>${o.desc}</span></span></button>`).join('')}</div>`,
    (act, b) => { apply(opts[+b.dataset.i]); closeSheet(); sfx.tap(); B.paused = false; last = performance.now(); });
}

function bossThink(f, dt) {
  const p = B.p; f.stT -= dt;
  if (f.st === 0 && f.stT <= 0) {
    const r = Math.random();
    if (r < 0.4) { f.st = 1; f.stT = 1.4; f.tx = p.x; f.ty = p.y; B.telegraphs.push({ k: 'circle', x: p.x, y: p.y, r: 92, life: 1.4, max: 1.4 }); sfx.warn(); }
    else if (r < 0.75) { f.st = 2; f.stT = 1.0; B.telegraphs.push({ k: 'ring', f, r: f.r + 26, life: 1.0, max: 1.0 }); sfx.warn(); }
    else { f.st = 0; f.stT = 4; for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283; spawnFoe('jelly', f.x + Math.cos(a) * 80, f.y + Math.sin(a) * 80); } }
  } else if (f.st === 1 && f.stT <= 0) {
    if ((p.x - f.tx) ** 2 + (p.y - f.ty) ** 2 < 92 * 92) hurtPlayer('slam');
    fxAdd({ k: 'ring', x: f.tx, y: f.ty, r: 20, to: 96, life: 0.3, max: 0.3, col: '#9B59D0', w: 8 }); burst(f.tx, f.ty, '#9B59D0', 16, 260); B.shake = 0.4; sfx.slam(); f.st = 0; f.stT = 3.2;
  } else if (f.st === 2 && f.stT <= 0) {
    for (let i = 0; i < 14; i++) { const a = i * 6.283 / 14 + Math.random() * 0.2; B.foeShots.push({ x: f.x, y: f.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, r: 8, dmg: 1, life: 3 }); }
    sfx.slam(); f.st = 0; f.stT = 3.4;
  }
}
function eliteThink(f, dt) {
  const p = B.p; f.stT -= dt;
  if (f.st === 0 && f.stT <= 0) { f.st = 1; f.stT = 0.8; const a = Math.atan2(p.y - f.y, p.x - f.x); f.da = a; B.telegraphs.push({ k: 'line', f, a, len: 230, life: 0.8, max: 0.8 }); sfx.warn(); }
  else if (f.st === 1 && f.stT <= 0) { f.st = 2; f.stT = 0.55; }
  else if (f.st === 2) { f.x += Math.cos(f.da) * 480 * dt; f.y += Math.sin(f.da) * 480 * dt; if (f.stT <= 0) { f.st = 0; f.stT = 4; } return true; }
  return f.st === 1;
}

function update(dt) {
  const p = B.p; B.t += dt;
  /* 이동 */
  let mx = 0, my = 0;
  if (B.auto) [mx, my] = autopilot(); else if (B.joy) { mx = B.joy.dx; my = B.joy.dy; }
  const mm = Math.hypot(mx, my); p.moving = mm > 0.12;
  if (p.moving) {
    const sp = 150 * B.st.spd * B.buffSpd * (has('cape') && p.hp <= 1 ? 1.25 : 1), k = Math.min(1, mm);
    p.x += mx / mm * sp * k * dt; p.y += my / mm * sp * k * dt; p.dirX = mx / mm; p.dirY = my / mm; if (Math.abs(mx) > 0.1) p.face = mx > 0 ? 1 : -1; p.bob += dt * 12;
  }
  if (p.inv > 0) p.inv -= dt;
  /* 적 등장 */
  const rate = (0.85 + 2.05 * Math.min(1, B.t / 120)) * (1 + 0.12 * B.floor) * (B.big ? 0.5 : 1);
  B.spawnAcc += rate * dt;
  while (B.spawnAcc >= 1 && B.foes.length < 140) { B.spawnAcc -= 1; const pool = ['jelly', 'jelly']; if (B.floor >= 1 || B.t > 60) pool.push('ice'); if (B.floor >= 2 || B.t > 90) pool.push('cookie'); spawnRing(pick(pool)); }
  if (B.spawnAcc > 3) B.spawnAcc = 3;
  if (B.eliteAt > 0 && B.t >= B.eliteAt && !B.big) { B.big = spawnRing('donut'); bigIntro(); }
  if (B.bossAt > 0 && B.t >= B.bossAt && !B.big) { B.big = spawnRing('boss'); bigIntro(); }
  /* 적 움직임 */
  for (const f of B.foes) {
    if (f.dead) continue;
    if (f.flash > 0) f.flash -= dt;
    if (f.slow > 0) f.slow -= dt;
    if (f.acid > 0) { f.acidT -= dt; if (f.acidT <= 0) { f.acidT = 0.5; const d = f.acid * 0.9; f.hp -= d * B.st.dmg; f.acid = Math.max(0, f.acid - 0.5); textAdd(f.x, f.y - f.r, Math.round(d), '#7FA81E'); if (f.hp <= 0) { killFoe(f, null); continue; } } }
    let busy = false;
    if (f.type === 'boss') bossThink(f, dt); else if (f.type === 'donut') busy = eliteThink(f, dt);
    const dx = p.x - f.x, dy = p.y - f.y, m = Math.hypot(dx, dy) || 1;
    if (f.sq > 0) f.sq = Math.max(0, f.sq - dt * 3);
    if (f.kx || f.ky) { f.x += f.kx * dt; f.y += f.ky * dt; const dec = Math.exp(-dt * 11); f.kx *= dec; f.ky *= dec; if (Math.abs(f.kx) + Math.abs(f.ky) < 8) f.kx = f.ky = 0; }
    if (!busy) { const sp = f.spd * (f.slow > 0 ? 0.55 : 1) * (f.kx || f.ky ? 0.25 : 1); f.x += dx / m * sp * dt; f.y += dy / m * sp * dt; }
    f.ph += dt * 7;
    if (m < f.r + 13) hurtPlayer(f.type);
    if (m > 900) { const a = Math.random() * 6.283, R = Math.hypot(vw, vh) / 2 + 40; f.x = p.x + Math.cos(a) * R; f.y = p.y + Math.sin(a) * R; }   // 너무 멀어지면 다시 근처로
  }
  /* 서로 겹치지 않게 살짝 밀어내요 */
  const F = B.foes;
  for (let i = 0; i < F.length; i++) { const a = F[i]; if (a.dead) continue; for (let j = i + 1; j < F.length; j++) { const b = F[j]; if (b.dead) continue; const dx = b.x - a.x; if (dx > 40 || dx < -40) continue; const dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy; if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2), push = (rr - d) * 0.5 / d, wa = a === B.big ? 0 : b === B.big ? 2 : 1; a.x -= dx * push * wa; a.y -= dy * push * wa; b.x += dx * push * (2 - wa); b.y += dy * push * (2 - wa); } } }
  fireWeapons(dt);
  /* 내 탄 */
  for (const s of B.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    for (const f of B.foes) { if (f.dead || s.hit.has(f)) continue; if ((f.x - s.x) ** 2 + (f.y - s.y) ** 2 < (f.r + s.r) ** 2) { s.hit.add(f); if (s.acid) f.acid += s.acid * B.st.acid; hurtFoe(f, s.dmg, s.w, s.vx, s.vy); if (s.pierce-- <= 0) { s.life = 0; break; } } }
  }
  B.shots = B.shots.filter(s => s.life > 0);
  /* 꿀 장판 */
  for (const z of B.zones) { z.life -= dt; z.tick -= dt; if (z.tick <= 0) { z.tick = 0.5; for (const f of B.foes) if (!f.dead && (f.x - z.x) ** 2 + (f.y - z.y) ** 2 < (z.r + f.r) ** 2) { f.slow = 0.7; hurtFoe(f, z.dmg, z.w, 0.001, 0.001); } } }
  B.zones = B.zones.filter(z => z.life > 0);
  /* 적의 탄 */
  for (const s of B.foeShots) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 < (s.r + 11) ** 2) { hurtPlayer('shot'); s.life = 0; } }
  B.foeShots = B.foeShots.filter(s => s.life > 0);
  for (const t of B.telegraphs) t.life -= dt; B.telegraphs = B.telegraphs.filter(t => t.life > 0 && !(t.f && t.f.dead));
  B.foes = B.foes.filter(f => !f.dead);
  /* 보석 */
  const pr2 = B.st.pickup ** 2;
  for (const g of B.gems) {
    const dx = p.x - g.x, dy = p.y - g.y, d2 = dx * dx + dy * dy;
    if (!g.pull && d2 < pr2) g.pull = true;
    if (g.pull) { const d = Math.sqrt(d2) || 1, sp = 420; g.x += dx / d * sp * dt; g.y += dy / d * sp * dt; if (d < 16) { g.got = true; B.xp += g.v * B.st.xp; sfx.gem(); } }
  }
  B.gems = B.gems.filter(g => !g.got); if (B.gems.length > 220) B.gems.splice(0, B.gems.length - 220);
  while (B.xp >= B.need && !B.over && !B.paused) levelUp();
  /* 연출 */
  for (const f of B.fx) { f.life -= dt; if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.g) f.vy += f.g * dt; else { f.vx *= 0.9; f.vy *= 0.9; } } } B.fx = B.fx.filter(f => f.life > 0);
  for (const t of B.texts) { t.life -= dt; t.x += t.vx * dt; t.y += t.vy * dt; t.vy += 380 * dt; } B.texts = B.texts.filter(t => t.life > 0);
  if (B.shake > 0) B.shake -= dt; if (B.hsCool > 0) B.hsCool -= dt; if (B.heartPop > 0) B.heartPop -= dt;
  for (const s of B.shots) if (s.k !== 'skewer') { s.trail = s.trail || []; s.trail.push(s.x, s.y); if (s.trail.length > 10) s.trail.splice(0, 2); }
  if (!B.over && B.t >= B.dur) endBattle(true);
}
function bigIntro() { toast(`${FOES[B.big.type].name} 등장!`); sfx.boss(); if (!headless) { $('#bossBar').hidden = false; $('#bossName').textContent = FOES[B.big.type].name; } }

/* 테스트와 구경용 자동 조종: 가까운 적과 위험 표시에서 멀어지고, 보석 쪽으로 살짝 끌려요 */
function autopilot() {
  const p = B.p; let x = 0, y = 0;
  for (const f of B.foes) { const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy) || 1, reach = 120 + f.r; if (d < reach) { const k = (reach - d) / reach; x += dx / d * k * 2; y += dy / d * k * 2; } }
  for (const s of B.foeShots) { const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy) || 1; if (d < 70) { x += dx / d; y += dy / d; } }
  for (const t of B.telegraphs) if (t.k === 'line') { const c = Math.cos(t.a), sn = Math.sin(t.a), rx = p.x - t.f.x, ry = p.y - t.f.y, along = rx * c + ry * sn, side = -rx * sn + ry * c; if (along > -30 && along < t.len + 60 && Math.abs(side) < t.f.r + 50) { const sg = side >= 0 ? 1 : -1; x += -sn * sg * 4; y += c * sg * 4; } }
  for (const s of B.foes) if (s.type === 'donut' && s.st === 2) { const c = Math.cos(s.da), sn = Math.sin(s.da), rx = p.x - s.x, ry = p.y - s.y, side = -rx * sn + ry * c; if (rx * c + ry * sn > 0 && Math.abs(side) < s.r + 50) { const sg = side >= 0 ? 1 : -1; x += -sn * sg * 4; y += c * sg * 4; } }
  for (const t of B.telegraphs) if (t.k === 'circle') { const dx = p.x - t.x, dy = p.y - t.y, d = Math.hypot(dx, dy) || 1; if (d < t.r + 30) { x += dx / d * 3; y += dy / d * 3; } }
  let g = null, gd = 220 * 220; for (const q of B.gems) { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < gd) { gd = d; g = q; } }
  if (g) { const dx = g.x - p.x, dy = g.y - p.y, d = Math.hypot(dx, dy) || 1; x += dx / d * 0.6; y += dy / d * 0.6; }
  if (Math.hypot(x, y) < 0.05) { x = Math.cos(B.t * 0.7); y = Math.sin(B.t * 0.7); }
  return [x, y];
}

function endBattle(won) {
  if (B.over) return; B.over = true;
  const info = { won, kind: B.kind, floor: B.floor, bigDead: B.bigDead, kills: B.kills, time: B.t };
  run.hp = Math.max(won ? 1 : 0, Math.min(run.maxHp, B.p.hp));
  run.kills = (run.kills || 0) + B.kills;
  const cb = B.onEnd;
  if (headless) { B.result = info; return; }
  if (won) sfx.win(); else sfx.lose();
  setTimeout(() => { B = null; cb(info); }, 900);
}

/* ───── 그리기 ───── */
function drawSprite(name, x, y, h, flip, sq, white) {
  const s = IMG[name]; if (!s) { ctx.fillStyle = '#C77DFF'; ctx.beginPath(); ctx.arc(x, y - h / 2, h / 2.4, 0, 6.283); ctx.fill(); return; }
  const w = h * s.ratio, sx = 1 + sq, sy = 1 - sq;
  ctx.save(); ctx.translate(x, y); ctx.scale(flip * sx, sy); ctx.drawImage(white ? s.white : s.im, -w / 2, -h, w, h); ctx.restore();
}
function draw() {
  const p = B.p;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = '#FFE1EA'; ctx.fillRect(0, 0, vw, vh);
  const sk = B.shake > 0 ? Math.min(1, B.shake * 3) * 8 : 0, shx = rand(-sk, sk), shy = rand(-sk, sk);
  const cx = p.x - vw / 2 + shx, cy = p.y - vh * 0.48 + shy;
  /* 바닥: 스프링클이 뿌려진 반죽판 */
  const T = 130, x0 = Math.floor(cx / T) - 1, y0 = Math.floor(cy / T) - 1, cols = ['#FFB3C9', '#BFE9D6', '#FFE9A8', '#C9CCFF'];
  for (let gy = y0; gy < y0 + vh / T + 3; gy++) for (let gx = x0; gx < x0 + vw / T + 3; gx++) {
    let h = (gx * 73856093) ^ (gy * 19349663);
    for (let k = 0; k < 3; k++) { h = (h * 1103515245 + 12345) | 0; const ox = (h >>> 8) % T, oy = (h >>> 16) % T, rot = ((h >>> 4) % 628) / 100; ctx.save(); ctx.translate(gx * T + ox - cx, gy * T + oy - cy); ctx.rotate(rot); ctx.fillStyle = cols[(h >>> 21) & 3]; ctx.fillRect(-7, -2.5, 14, 5); ctx.restore(); }
  }
  ctx.translate(-cx, -cy);
  /* 꿀 장판 */
  for (const z of B.zones) { ctx.globalAlpha = Math.min(0.5, z.life * 0.5); ctx.fillStyle = '#F7B733'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
  /* 위험 예고 */
  for (const t of B.telegraphs) {
    const k = 1 - t.life / t.max; ctx.fillStyle = 'rgba(224,68,90,.22)'; ctx.strokeStyle = '#E0445A'; ctx.lineWidth = 2.5;
    if (t.k === 'circle') { ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(224,68,90,.3)'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r * k, 0, 6.283); ctx.fill(); }
    else if (t.k === 'ring') { ctx.beginPath(); ctx.arc(t.f.x, t.f.y, t.r + k * 30, 0, 6.283); ctx.stroke(); }
    else { ctx.save(); ctx.translate(t.f.x, t.f.y); ctx.rotate(t.a); ctx.fillRect(0, -t.f.r, t.len, t.f.r * 2); ctx.strokeRect(0, -t.f.r, t.len, t.f.r * 2); ctx.restore(); }
  }
  /* 보석 */
  ctx.fillStyle = '#59B8FF'; ctx.strokeStyle = '#2C7FC4'; ctx.lineWidth = 1.5;
  for (const g of B.gems) { ctx.beginPath(); ctx.moveTo(g.x, g.y - 6); ctx.lineTo(g.x + 5, g.y); ctx.lineTo(g.x, g.y + 6); ctx.lineTo(g.x - 5, g.y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  /* 적과 나를 아래쪽에 있는 것부터 겹쳐 그려요 */
  const list = B.foes.slice(); list.push(p); list.sort((a, b) => a.y - b.y);
  for (const o of list) {
    if (o === p) {
      ctx.fillStyle = 'rgba(74,32,64,.18)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 17, 6, 0, 0, 6.283); ctx.fill();
      if (p.inv > 0 && Math.floor(p.inv * 14) % 2) ctx.globalAlpha = 0.45;
      drawSprite('hero', p.x, p.y + 4 - (p.moving ? Math.abs(Math.sin(p.bob)) * 5 : 0), 60, p.face, p.moving ? Math.sin(p.bob * 2) * 0.04 : 0);
      ctx.globalAlpha = 1;
      if (p.shield) { ctx.strokeStyle = '#59B8FF'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y - 24, 34, 0, 6.283); ctx.stroke(); }
    } else {
      const d = FOES[o.type];
      ctx.fillStyle = 'rgba(74,32,64,.16)'; ctx.beginPath(); ctx.ellipse(o.x, o.y + o.r * 0.6, o.r, o.r * 0.34, 0, 0, 6.283); ctx.fill();
      drawSprite(d.img, o.x, o.y + o.r * 0.7, d.h, o.x > p.x ? -1 : 1, Math.sin(o.ph) * 0.06 + o.sq * Math.cos(o.sq * 30) * 0.6, o.flash > 0);
      if (o.acid > 0) { ctx.fillStyle = '#9BD61E'; ctx.beginPath(); ctx.arc(o.x + o.r * 0.7, o.y - d.h * 0.55, 4, 0, 6.283); ctx.fill(); }
    }
  }
  /* 무기 */
  for (const w of B.weapons) if (w.id === 'macaron' && w.orbs) for (const [ox, oy] of w.orbs) { ctx.fillStyle = '#FF8FB8'; ctx.beginPath(); ctx.ellipse(ox, oy - 3, 10, 6, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(ox, oy + 4, 10, 6, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#FFF3E0'; ctx.fillRect(ox - 9, oy - 1.5, 18, 3.5); }
  const SHOT_COL = { cream: '#FFFFFF', lemon: '#F4E04D', star: '#FFC83D', shard: '#C9B6FF' };
  ctx.lineCap = 'round';
  for (const s of B.shots) {
    if (s.k === 'skewer') {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
      const g = ctx.createLinearGradient(-70, 0, -10, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.85)');
      ctx.strokeStyle = g; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(-10, 0); ctx.stroke();
      ctx.strokeStyle = '#B9783F'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(22, 0); ctx.stroke();
      ['#E8323C', '#B9DD52', '#FF9A1F'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-9 + i * 10, 0, 6, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-11 + i * 10, -2, 2, 0, 6.283); ctx.fill(); });
      ctx.restore(); continue;
    }
    const col = SHOT_COL[s.k] || '#FFFFFF', t = s.trail;
    if (t && t.length >= 4) { for (let i = 0; i < t.length - 2; i += 2) { const k = (i + 2) / t.length; ctx.globalAlpha = k * 0.55; ctx.strokeStyle = col; ctx.lineWidth = s.r * 2 * k; ctx.beginPath(); ctx.moveTo(t[i], t[i + 1]); ctx.lineTo(t[i + 2], t[i + 3]); ctx.stroke(); } ctx.globalAlpha = 1; }
    ctx.fillStyle = col; ctx.strokeStyle = 'rgba(74,32,64,.6)'; ctx.lineWidth = 1.8;
    if (s.k === 'star') { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(B.t * 14); ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? s.r * 0.5 : s.r * 1.25, aa = i * Math.PI / 5; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(s.x - s.r * 0.35, s.y - s.r * 0.35, s.r * 0.32, 0, 6.283); ctx.fill(); }
  }
  ctx.fillStyle = '#7B3FA6'; for (const s of B.foeShots) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
  for (const f of B.fx) {
    const k = Math.max(0, f.life / f.max);
    if (f.k === 'dot') { ctx.globalAlpha = Math.min(1, k * 1.6); ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.5 + 0.5 * k), 0, 6.283); ctx.fill(); }
    else if (f.k === 'line') { ctx.globalAlpha = k; ctx.strokeStyle = f.col; ctx.lineWidth = f.w * k + 0.5; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * 0.05, f.y - f.vy * 0.05); ctx.stroke(); }
    else if (f.k === 'flash') { ctx.globalAlpha = k; ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.3 - 0.5 * k), 0, 6.283); ctx.fill(); }
    else if (f.k === 'ghost') { ctx.globalAlpha = k * 0.9; const sc = 1 + (1 - k) * 0.5; drawSprite(f.img, f.x, f.y, f.h * sc, f.flip, -(1 - k) * 0.3, true); }
    else if (f.k === 'arc') {
      /* 롤링핀: 굵은 하얀 궤적 + 앞쪽 끝의 반짝임 */
      const e = 1 - k, a0 = f.a - 1.3, a1 = f.a - 1.3 + 2.6 * Math.min(1, e * 2.2), rr = f.r * 0.82;
      ctx.globalAlpha = Math.min(1, k * 1.8) * 0.35; ctx.strokeStyle = '#FFE1A8'; ctx.lineWidth = 30; ctx.beginPath(); ctx.arc(f.x, f.y - 12, rr, a0, a1); ctx.stroke();
      ctx.globalAlpha = Math.min(1, k * 1.8); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 14 * k + 3; ctx.beginPath(); ctx.arc(f.x, f.y - 12, rr, Math.max(a0, a1 - 1.4), a1); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(f.x + Math.cos(a1) * rr, f.y - 12 + Math.sin(a1) * rr, 9 * k + 3, 0, 6.283); ctx.fill();
      ctx.save(); ctx.translate(f.x + Math.cos(a1) * rr, f.y - 12 + Math.sin(a1) * rr); ctx.rotate(a1); ctx.fillStyle = '#D9A066'; ctx.strokeStyle = '#8B5A3C'; ctx.lineWidth = 2; ctx.fillRect(-14, -5, 28, 10); ctx.strokeRect(-14, -5, 28, 10); ctx.restore();
    }
    else { ctx.globalAlpha = k; ctx.strokeStyle = f.col; ctx.lineWidth = (f.w || 5) * k + 1; ctx.beginPath(); ctx.arc(f.x, f.y, f.r + (f.to - f.r) * (1 - k * k), 0, 6.283); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#FFF9F0';
  for (const t of B.texts) { const e = 1 - t.life / t.max, sc = e < 0.15 ? 1 + (0.15 - e) / 0.15 * (t.big ? 1.2 : 0.7) : 1; ctx.globalAlpha = Math.min(1, t.life * 4); ctx.font = `${Math.round((t.big ? 22 : 15) * sc)}px Jua, sans-serif`; ctx.lineWidth = t.big ? 5 : 3.5; ctx.strokeText(t.t, t.x, t.y); ctx.fillStyle = t.col; ctx.fillText(t.t, t.x, t.y); }
  ctx.globalAlpha = 1;
  /* 조이스틱 */
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (B.flashScr) { const fk = B.flashScr.t / B.flashScr.max; if (fk <= 0) B.flashScr = null; else { const W = cv.width, H = cv.height, g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, `rgba(${B.flashScr.col},${0.12 * fk})`); g.addColorStop(1, `rgba(${B.flashScr.col},${0.55 * fk})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); } }
  if (B.joy) { const d = Math.min(2, window.devicePixelRatio || 1); ctx.strokeStyle = 'rgba(74,32,64,.35)'; ctx.lineWidth = 3 * d; ctx.beginPath(); ctx.arc(B.joy.ox * d, B.joy.oy * d, 46 * d, 0, 6.283); ctx.stroke(); ctx.fillStyle = 'rgba(255,79,134,.55)'; ctx.beginPath(); ctx.arc((B.joy.ox + B.joy.dx * 46) * d, (B.joy.oy + B.joy.dy * 46) * d, 20 * d, 0, 6.283); ctx.fill(); }
  /* 위쪽 표시 */
  const left = Math.max(0, Math.ceil((B.bossAt > 0 && !B.big ? B.bossAt : B.dur) - B.t));
  if (left !== B.hudT) { B.hudT = left; $('#timer').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; }
  const hk = p.hp * 10 + p.max; if (hk !== B.hudHp) { const lost = B.hudHp > 0 && p.hp < Math.floor(B.hudHp / 10); B.hudHp = hk; const e = $('#hearts'); e.innerHTML = heartsHtml(p.hp, p.max); if (lost) { const off = e.children[p.hp]; if (off) off.classList.add('broke'); e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); } }
  const xpK = Math.round(clamp(B.xp / B.need, 0, 1) * 100); if (xpK !== B.hudXp) { B.hudXp = xpK; $('#xpBar').style.transform = `scaleX(${xpK / 100})`; $('#lvText').textContent = `Lv ${B.lvl}`; }
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
    act => { if (act === 'sound') { S.muted = !S.muted; persist(); closeSheet(); B.paused = false; pauseSheet(); return; } closeSheet(); B.paused = false; last = performance.now(); });
}
$('#btnPause').addEventListener('click', pauseSheet);

/* ═════ 화면과 카드 창 ═════ */
function show(id) { ['title', 'map', 'battle'].forEach(s => { $('#' + s).hidden = s !== id; }); }
const overlay = $('#overlay'), cardEl = $('#card');
let onCard = null;
function sheet(html, handler) { cardEl.innerHTML = html; overlay.hidden = false; onCard = handler; cardEl.scrollTop = 0; }
function closeSheet() { overlay.hidden = true; cardEl.innerHTML = ''; onCard = null; }
cardEl.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || !onCard) return; if (b.getAttribute('aria-disabled') === 'true') { sfx.no(); return; } onCard(b.dataset.act, b); });

/* ───── 지도 ───── */
const NODE = {
  battle: { name: '전투', desc: '2분 동안 버텨요. 끝나면 카드 3장 중 1장을 골라요.', img: 'jelly' },
  elite: { name: '엘리트 전투', desc: '1분에 딱딱 도넛 기사가 나타나요. 잡으면 유물에 더해 인챈트도 받아요.', img: 'donut' },
  boss: { name: '보스: 곰팡이 케이크', desc: '3분에 보스가 나타나요. 잡거나 5분을 버티면 이겨요.', img: 'boss' },
  shop: { name: '상점', desc: '골드로 카드, 유물, 코코아를 사거나 카드를 덱에서 빼요.', icon: 'shop' },
  rest: { name: '휴식처', desc: '하트를 채우거나 카드 1장을 강화해요.', icon: 'rest' },
  event: { name: '수상한 일', desc: '무슨 일이 생길지 몰라요. 둘 중 하나를 골라요.', icon: 'event' },
  chest: { name: '보물 상자', desc: '유물 1개를 얻어요.', icon: 'chest' }
};
function genMap() {
  const ROWS = 7, on = Array.from({ length: ROWS }, () => [false, false, false]), E = new Set();
  for (let p = 0; p < 4; p++) { let c = p < 3 ? p : rnd(3); for (let r = 0; r < ROWS; r++) { on[r][c] = true; if (r === ROWS - 1) break; let nc = clamp(c + rnd(3) - 1, 0, 2); if (nc !== c && E.has(`${r},${nc}>${c}`)) nc = c; E.add(`${r},${c}>${nc}`); c = nc; } }
  const nodes = {};
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < 3; c++) if (on[r][c]) nodes[r * 3 + c] = { id: r * 3 + c, row: r, col: c, jx: rnd(9) - 4, type: 'battle', next: [] };
  E.forEach(k => { const [a, b] = k.split('>'), [r, c] = a.split(',').map(Number); nodes[r * 3 + c].next.push((r + 1) * 3 + Number(b)); });
  nodes[21] = { id: 21, row: 7, col: 1, jx: 0, type: 'boss', next: [] };
  const list = Object.values(nodes);
  list.forEach(n => {
    if (n.type === 'boss') return;
    if (n.row === 6) { n.type = 'rest'; n.next = [21]; return; }
    if (n.row === 0) return;
    const x = Math.random();
    n.type = x < 0.45 ? 'battle' : x < 0.6 ? (n.row >= 2 ? 'elite' : 'battle') : x < 0.76 ? 'event' : x < 0.87 ? 'shop' : x < 0.94 ? 'chest' : 'rest';
  });
  const need = (type, rows) => { if (list.some(n => n.type === type)) return; const pool = list.filter(n => n.type === 'battle' && rows.includes(n.row)); if (pool.length) pick(pool).type = type; };
  need('elite', [2, 3, 4, 5]); need('shop', [2, 3, 4, 5]); need('chest', [1, 2, 3, 4]); need('event', [1, 2, 3, 4, 5]);
  return { nodes };
}
const canGo = id => { const n = run.map.nodes[id]; if (run.done.includes(id)) return false; return run.at == null ? n.row === 0 : run.map.nodes[run.at].next.includes(id); };
const xy = n => [n.type === 'boss' ? 50 : [18, 50, 82][n.col] + n.jx, (1 - n.row / 7) * 100];
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
  const m = $('#mapBox'); m.innerHTML = `<div class="map-in"><svg class="roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg></div>`;
  Object.values(N).forEach(n => {
    const [x, y] = xy(n), d = NODE[n.type], dn = run.done.includes(n.id);
    const b = el('button', `node ${n.type}${dn ? ' done' : ''}${n.id === run.at ? ' here' : ''}${canGo(n.id) ? ' open' : ''}`, d.img ? `<img src="img/${d.img}.png" alt="">` : svg(ICON[d.icon]));
    b.type = 'button'; b.dataset.id = n.id; b.style.left = x + '%'; b.style.top = y + '%'; b.setAttribute('aria-label', d.name + (dn ? ', 지나온 곳' : canGo(n.id) ? ', 지금 갈 수 있는 곳' : ''));
    m.firstElementChild.appendChild(b);
  });
}
function info(html, goId) { $('#info').innerHTML = `<div>${html}</div>${goId != null ? `<button class="cta" type="button" id="btnGo" data-id="${goId}">들어가기</button>` : ''}`; }
function showMap() {
  show('map'); renderBar(); picked = null; renderMap();
  const open = Object.values(run.map.nodes).filter(n => canGo(n.id));
  if (open.length === 1) pickNode(open[0].id, true);
  else info(`<h3>${run.at == null ? '어느 길로 출발할까요?' : '다음엔 어디로 갈까요?'}</h3><p>분홍 테두리가 지금 갈 수 있는 곳이에요. 눌러 보면 어떤 곳인지 알려 줘요. 하트는 3칸이고, 무엇에 맞든 1칸씩 줄어요. 전투에서 이기면 1칸 차요.</p>`);
}
function pickNode(id, quiet) {
  picked = id; const n = run.map.nodes[id], d = NODE[n.type];
  document.querySelectorAll('.node').forEach(b => b.classList.toggle('sel', +b.dataset.id === id));
  if (!quiet) sfx.tap();
  info(`<h3>${d.name}</h3><p>${run.done.includes(id) ? '이미 지나온 곳이에요.' : d.desc}</p>`, canGo(id) ? id : null);
}
$('#mapBox').addEventListener('click', e => { const b = e.target.closest('.node'); if (b) pickNode(+b.dataset.id); });
$('#info').addEventListener('click', e => { const b = e.target.closest('#btnGo'); if (b) enter(+b.dataset.id); });
$('#relics').addEventListener('click', e => { const b = e.target.closest('.relic'); if (!b) return; const r = RELICS[b.dataset.relic]; sfx.tap(); info(`<h3>${r.name}</h3><p>유물. ${r.desc}</p>`); });
function arrive(id) { run.at = id; run.done.push(id); run.floor = run.map.nodes[id].row; persist(); }

/* ───── 장착 ───── */
function fixEquip() { run.equip = run.equip.filter(i => i < run.deck.length); if (run.deck.length <= 6) run.equip = run.deck.map((_, i) => i); }
function equipSheet(next) {
  fixEquip();
  if (run.deck.length <= 6) { next(); return; }
  const draw = () => sheet(`<h2 id="cardTitle">들고 갈 카드 고르기</h2><p>6장까지 들고 갈 수 있어요. 지금 ${run.equip.length}장 골랐어요.</p><div class="opts">${run.deck.map((c, i) => cardOpt(c, i, { act: 'toggle', on: run.equip.includes(i) })).join('')}</div><button class="cta" type="button" data-act="go" data-pref>전투 시작</button>`,
    (act, b) => {
      if (act === 'go') { if (!run.equip.some(i => CARDS[run.deck[i].id].type === 'w')) { sfx.no(); return; } closeSheet(); persist(); next(); return; }
      const i = +b.dataset.i, at = run.equip.indexOf(i);
      if (at >= 0) run.equip.splice(at, 1); else if (run.equip.length < 6) run.equip.push(i); else { sfx.no(); return; }
      sfx.tap(); const top = cardEl.scrollTop; draw(); cardEl.scrollTop = top;
    });
  draw();
}
function deckSheet() {
  sheet(`<h2 id="cardTitle">내 덱 ${run.deck.length}장</h2><p>6장이 넘으면 전투 전에 들고 갈 카드를 골라요.</p><div class="opts">${run.deck.map((c, i) => cardOpt(c, i, { act: 'none', on: run.equip.includes(i) })).join('')}</div><button class="cta" type="button" data-act="close" data-pref>닫기</button>`,
    act => { if (act === 'close') closeSheet(); });
}
$('#btnDeck').addEventListener('click', () => { sfx.tap(); fixEquip(); deckSheet(); });

/* ───── 칸에 들어가기 ───── */
function enter(id) {
  if (!canGo(id)) return; const n = run.map.nodes[id]; sfx.tap();
  if (n.type === 'battle' || n.type === 'elite' || n.type === 'boss') equipSheet(() => startBattle(n.type, n.row, r => afterBattle(id, r)));
  else if (n.type === 'rest') { arrive(id); showMap(); restSheet(); }
  else if (n.type === 'shop') { arrive(id); showMap(); shopSheet(); }
  else if (n.type === 'chest') { arrive(id); showMap(); const r = rollRelic(); if (r) relicSheet(r, '보물 상자를 열었어요', showMap); else { run.gold += 40; showMap(); } }
  else { arrive(id); showMap(); eventSheet(); }
}
function afterBattle(id, r) {
  if (!r.won) { gameOver(r); return; }
  arrive(id);
  const healed = run.hp < run.maxHp; run.hp = Math.min(run.maxHp, run.hp + 1 + (has('jar') && r.kind === 'elite' ? 1 : 0));
  const gold = goldGain(15 + 5 * r.floor + (r.kind === 'elite' ? 25 : 0)); run.gold += gold; persist();
  if (r.kind === 'boss') { victory(r); return; }
  showMap();
  const steps = [];
  steps.push(next => rewardCards(`전투 승리! 골드 ${gold}${healed ? ', 하트 +1' : ''}`, next));
  if (r.kind === 'elite') { const rel = rollRelic(); if (rel) steps.push(next => relicSheet(rel, '엘리트 전투 보상', next)); if (r.bigDead) steps.push(enchantSheet); else if (!run.potion && Math.random() < 0.5) steps.push(next => { run.potion = true; noteSheet('따뜻한 코코아를 얻었어요', '하트가 다 없어지면 저절로 마시고 하트 1칸으로 다시 일어나요.', 'cocoa', next); }); }
  const go = () => { const s = steps.shift(); if (s) s(go); else { persist(); showMap(); } };
  go();
}
function rewardCards(title, next) {
  const opts = rollCards(3);
  sheet(`<h2 id="cardTitle">${title}</h2><p>카드 1장을 덱에 넣어요. 건너뛰면 골드 10을 받아요.</p><div class="opts">${opts.map((c, i) => cardOpt(c, i)).join('')}</div><button class="btn" type="button" data-act="skip">건너뛰고 골드 10 받기</button>`,
    (act, b) => { if (act === 'skip') { run.gold += 10; sfx.coin(); } else { run.deck.push(opts[+b.dataset.i]); sfx.good(); } closeSheet(); fixEquip(); next(); });
}
function relicSheet(id, title, next) {
  const r = RELICS[id]; gainRelic(id); sfx.good();
  sheet(`<h2 id="cardTitle">${title}</h2><div class="opts"><div class="opt r2"><span class="ic">${svg(ICON[r.icon])}</span><span class="tx"><b>유물: ${r.name}</b><span>${r.desc} 이번 모험 내내 이어져요.</span></span></div></div><button class="cta" type="button" data-act="go" data-pref>받기</button>`,
    () => { closeSheet(); next(); });
}
function noteSheet(title, text, icon, next) {
  sheet(`<h2 id="cardTitle">${title}</h2><div class="opts"><div class="opt"><span class="ic">${svg(ICON[icon])}</span><span class="tx"><span>${text}</span></span></div></div><button class="cta" type="button" data-act="go" data-pref>확인</button>`, () => { closeSheet(); next(); });
}
function enchantSheet(next) {
  const kind = pick(Object.keys(ENCH)), list = run.deck.map((c, i) => [c, i]).filter(([c]) => CARDS[c.id].type === 'w' && !c.ench);
  if (!list.length) { next(); return; }
  sheet(`<h2 id="cardTitle">인챈트: ${ENCH[kind].name}</h2><p>엘리트를 잡아서 얻었어요. ${ENCH[kind].desc} 붙일 무기 1장을 골라요.</p><div class="opts">${list.map(([c, i]) => cardOpt(c, i)).join('')}</div>`,
    (act, b) => { run.deck[+b.dataset.i].ench = kind; sfx.good(); closeSheet(); next(); });
}
function restSheet() {
  const heal = has('icepack') ? 2 : 1, can = run.deck.map((c, i) => [c, i]).filter(([c]) => !c.plus);
  sheet(`<div class="pic">${svg(ICON.rest)}</div><h2 id="cardTitle">휴식처</h2><p>따뜻한 오븐 옆에서 쉬어 가요. 하나만 고를 수 있어요.</p><div class="opts"><button class="opt" type="button" data-act="heal" data-pref><span class="ic">${svg(ICON.heart)}</span><span class="tx"><b>푹 쉬기</b><span>하트를 ${heal}칸 채워요. 지금 ${run.hp}/${run.maxHp}칸.</span></span></button><button class="opt" type="button" data-act="up"${can.length ? '' : ' aria-disabled="true"'}><span class="ic">${svg(ICON.ench)}</span><span class="tx"><b>카드 1장 강화하기</b><span>고른 카드가 이번 모험 내내 더 세져요.</span></span></button></div>`,
    act => {
      if (act === 'heal') { run.hp = Math.min(run.maxHp, run.hp + heal); sfx.good(); closeSheet(); persist(); showMap(); return; }
      sheet(`<h2 id="cardTitle">강화할 카드</h2><p>카드마다 한 번만 강화할 수 있어요.</p><div class="opts">${can.map(([c, i]) => cardOpt(c, i)).join('')}</div>`, (a, b) => { run.deck[+b.dataset.i].plus = true; sfx.good(); closeSheet(); persist(); showMap(); });
    });
}
function shopSheet() {
  const stock = rollCards(3).map(c => ({ c, price: [40, 60, 90][CARDS[c.id].rar], sold: false })), rel = rollRelic(), state = { rel: rel ? { id: rel, price: 110, sold: false } : null, pot: !run.potion };
  const draw = () => sheet(`<div class="pic">${svg(ICON.shop)}</div><h2 id="cardTitle">상점</h2><p>가진 골드는 ${run.gold}이에요.</p><div class="opts">`
    + stock.map((s, i) => s.sold ? '' : cardOpt(s.c, i, { act: 'card', price: s.price, off: run.gold < s.price })).join('')
    + (state.rel && !state.rel.sold ? `<button class="opt r2" type="button" data-act="relic"${run.gold < state.rel.price ? ' aria-disabled="true"' : ''}><span class="ic">${svg(ICON[RELICS[state.rel.id].icon])}</span><span class="tx"><b>유물: ${RELICS[state.rel.id].name}</b><span>${RELICS[state.rel.id].desc}</span></span><em>${state.rel.price}골드</em></button>` : '')
    + (state.pot ? `<button class="opt" type="button" data-act="pot"${run.gold < 60 ? ' aria-disabled="true"' : ''}><span class="ic">${svg(ICON.cocoa)}</span><span class="tx"><b>따뜻한 코코아</b><span>하트가 다 없어지면 저절로 마시고 다시 일어나요. 하나만 들 수 있어요.</span></span><em>60골드</em></button>` : '')
    + (run.deck.length > 2 ? `<button class="opt" type="button" data-act="remove"${run.gold < 50 ? ' aria-disabled="true"' : ''}><span class="ic">${svg(ICON.event)}</span><span class="tx"><b>카드 1장 빼기</b><span>안 쓰는 카드를 덱에서 없애요.</span></span><em>50골드</em></button>` : '')
    + `</div><button class="cta" type="button" data-act="leave" data-pref>상점 나가기</button>`,
    (act, b) => {
      if (act === 'leave') { closeSheet(); fixEquip(); persist(); showMap(); return; }
      if (act === 'card') { const s = stock[+b.dataset.i]; run.gold -= s.price; s.sold = true; run.deck.push(s.c); }
      else if (act === 'relic') { run.gold -= state.rel.price; state.rel.sold = true; gainRelic(state.rel.id); }
      else if (act === 'pot') { run.gold -= 60; run.potion = true; state.pot = false; }
      else if (act === 'remove') {
        sheet(`<h2 id="cardTitle">뺄 카드</h2><p>고른 카드는 덱에서 사라져요.</p><div class="opts">${run.deck.map((c, i) => cardOpt(c, i)).join('')}</div><button class="btn" type="button" data-act="back">그만두기</button>`,
          (a, bb) => { if (a !== 'back') { const i = +bb.dataset.i; if (CARDS[run.deck[i].id].type === 'w' && run.deck.filter(c => CARDS[c.id].type === 'w').length <= 1) { sfx.no(); return; } run.deck.splice(i, 1); run.equip = []; run.gold -= 50; fixEquip(); sfx.coin(); } draw(); });
        return;
      }
      sfx.coin(); renderBar(); draw();
    });
  draw();
}
function eventSheet() {
  const up = run.deck.map((c, i) => [c, i]).filter(([c]) => !c.plus);
  const EVENTS = [
    { title: '수상한 오븐', text: '혼자 달궈진 오븐에서 좋은 냄새가 나요. 손을 넣으면 데일 것 같아요.', a: ['손을 넣어 꺼내기', '하트를 1칸 잃고 희귀 카드 1장을 얻어요. 마지막 1칸은 남아요.', () => { run.hp = Math.max(1, run.hp - 1); run.deck.push(rollCard(2)); }], b: ['그냥 지나가기', '바닥에 떨어진 골드 15만 주워요.', () => { run.gold += 15; }] },
    { title: '길 잃은 마카롱 상인', text: '보따리를 멘 마카롱이 물건 하나를 싸게 넘기겠다고 해요.', a: ['골드 45에 사기', '유물 1개를 얻어요.', () => { const r = rollRelic(); run.gold -= 45; if (r) gainRelic(r); }, () => run.gold >= 45 && !!rollRelic()], b: ['정중히 거절하기', '아무 일도 일어나지 않아요.', () => {}] },
    { title: '설탕 샘', text: '반짝이는 설탕물이 솟는 샘을 찾았어요. 한 가지만 할 수 있어요.', a: ['한 모금 마시기', '하트를 1칸 채워요.', () => { run.hp = Math.min(run.maxHp, run.hp + 1); }], b: ['카드를 담그기', '아무 카드 1장이 강화돼요.', () => { if (up.length) pick(up)[0].plus = true; }, () => up.length > 0] }
  ];
  const ev = pick(EVENTS), row = (k, o) => `<button class="opt" type="button" data-act="${k}"${o[3] && !o[3]() ? ' aria-disabled="true"' : ''}${k === 'b' ? ' data-pref' : ''}><span class="tx"><b>${o[0]}</b><span>${o[1]}</span></span></button>`;
  sheet(`<div class="pic">${svg(ICON.event)}</div><h2 id="cardTitle">${ev.title}</h2><p>${ev.text}</p><div class="opts">${row('a', ev.a)}${row('b', ev.b)}</div>`,
    act => { ev[act][2](); sfx.good(); closeSheet(); fixEquip(); persist(); showMap(); });
}

/* ───── 모험의 시작과 끝 ───── */
function newRun() {
  run = S.run = { map: genMap(), at: null, done: [], floor: 0, hp: 3, maxHp: 3, gold: 30, potion: true, kills: 0,
    deck: [{ id: 'pin', plus: false, ench: null }, { id: 'cream', plus: false, ench: null }, { id: 'magnet', plus: false, ench: null }], equip: [0, 1, 2], relics: ['cape'] };
  persist(); showMap();
  sheet(`<div class="pic"><img src="img/hero.png" alt=""></div><h2 id="cardTitle">간식 왕국을 지켜요</h2><p>곰팡이 케이크가 간식들을 상하게 만들고 있어요. 길을 골라 올라가서 케이크를 물리쳐요.</p><p>전투에서는 화면을 누른 채 끌어서 움직이기만 하면 돼요. 공격은 저절로 나가요. 처음엔 롤링핀과 휘핑크림, 코코아 한 잔을 들고, 무기 1장을 더 골라 출발해요.</p><button class="cta" type="button" data-act="go" data-pref>출발하기</button>`, () => { sfx.tap(); starterPick(); });
}
/* 출발할 때 무기 1장을 더 골라요 */
function starterPick() {
  const opts = shuffle(['star', 'macaron', 'honey', 'lemon']).slice(0, 3).map(id => ({ id, plus: false, ench: null }));
  sheet(`<h2 id="cardTitle">첫 무기 고르기</h2><p>롤링핀, 휘핑크림, 설탕 자석에 더해 무기 1장을 골라 들고 가요.</p><div class="opts">${opts.map((c, i) => cardOpt(c, i)).join('')}</div>`,
    (act, b) => { if (act !== 'pick') return; run.deck.push(opts[+b.dataset.i]); fixEquip(); persist(); sfx.good(); closeSheet(); });
}
function victory(r) {
  S.wins++; const kills = run.kills, deck = run.deck.length; run = S.run = null; persist();
  show('title'); renderTitle();
  sheet(`<div class="pic"><img src="img/hero.png" alt=""></div><h2 id="cardTitle">간식 왕국을 지켰어요!</h2><p>${r.bigDead ? '곰팡이 케이크를 물리쳤어요.' : '곰팡이 케이크의 공격을 끝까지 버텨 냈어요.'} 적 ${kills}마리를 잡았고, 카드 ${deck}장으로 끝까지 왔어요.</p><p>지금까지 ${S.wins}번 지켜 냈어요.</p><button class="cta" type="button" data-act="go" data-pref>처음 화면으로</button>`, () => { closeSheet(); });
}
function gameOver(r) {
  const kills = run.kills, floor = r.floor + 1; run = S.run = null; persist();
  show('title'); renderTitle();
  sheet(`<div class="pic"><img src="img/${r.kind === 'boss' ? 'boss' : r.kind === 'elite' ? 'donut' : 'jelly'}.png" alt=""></div><h2 id="cardTitle">쓰러졌어요</h2><p>${floor}층에서 쓰러졌어요. 적 ${kills}마리를 잡았어요. 다음엔 다른 길과 다른 카드로 가 봐요.</p><button class="cta" type="button" data-act="go" data-pref>처음 화면으로</button>`, () => { closeSheet(); });
}

/* ───── 처음 화면, 메뉴, 설치 ───── */
let installEvt = null, newArmed = 0;
const isInstalled = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function renderTitle() {
  const going = !!(S.run && S.run.map);
  $('#btnContinue').hidden = !going;
  const b = $('#btnNew'); b.className = going ? 'btn' : 'cta'; b.textContent = going ? '새 모험 떠나기' : '모험 떠나기';
  $('#titleSub').textContent = going ? `${(S.run.floor || 0) + 1}층까지 왔어요. 하트 ${S.run.hp}/${S.run.maxHp}칸, 카드 ${S.run.deck.length}장.` : S.wins ? `간식 왕국을 ${S.wins}번 지켜 냈어요.` : '자동으로 공격하는 전투와, 길을 고르고 카드를 모으는 모험.';
  $('#btnInstall').hidden = !installEvt || isInstalled; clearTimeout(newArmed); newArmed = 0;
}
$('#btnContinue').addEventListener('click', () => { run = S.run; fixEquip(); sfx.tap(); showMap(); });
$('#btnNew').addEventListener('click', () => {
  const b = $('#btnNew');
  if (S.run && S.run.map && !newArmed) { b.textContent = '한 번 더 누르면 지금 모험을 버리고 새로 떠나요'; newArmed = setTimeout(() => { newArmed = 0; b.textContent = '새 모험 떠나기'; }, 3000); return; }
  clearTimeout(newArmed); newArmed = 0; sfx.tap(); newRun();
});
function menuSheet(home) {
  const row = (act, t, d) => `<button class="opt" type="button" data-act="${act}"><span class="tx"><b>${t}</b><span>${d}</span></span></button>`;
  const draw = () => sheet(`<h2 id="cardTitle">메뉴</h2><div class="opts">` + row('sound', S.muted ? '소리 켜기' : '소리 끄기', `지금은 소리가 ${S.muted ? '꺼져' : '켜져'} 있어요.`)
    + (navigator.vibrate ? row('vib', S.vib ? '진동 끄기' : '진동 켜기', `지금은 진동이 ${S.vib ? '켜져' : '꺼져'} 있어요.`) : '')
    + (home ? row('home', '처음 화면으로 가기', '모험은 저장돼 있어서 이어서 할 수 있어요.') : '') + `</div><button class="cta" type="button" data-act="close" data-pref>닫기</button>`,
    act => { if (act === 'sound') { S.muted = !S.muted; persist(); sfx.tap(); draw(); } else if (act === 'vib') { S.vib = !S.vib; persist(); buzz(20); draw(); } else if (act === 'home') { closeSheet(); show('title'); renderTitle(); } else closeSheet(); });
  draw();
}
$('#btnMenu').addEventListener('click', () => menuSheet(true));
$('#btnSet').addEventListener('click', () => menuSheet(false));
$('#btnInstall').addEventListener('click', () => { if (!installEvt) return; installEvt.prompt(); installEvt = null; $('#btnInstall').hidden = true; });
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; renderTitle(); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
document.addEventListener('gesturestart', e => e.preventDefault());

/* 테스트용: 화면을 그리지 않고 전투 하나를 끝까지 빨리 돌려요 */
window.__dbg = {
  simBattle(kind, floor) { headless = true; startBattle(kind, floor, () => {}); B.auto = true; for (let i = 0; i < 30 * 320 && !B.over; i++) update(1 / 30); const out = B.result; B = null; headless = false; return out; },
  auto(on) { if (B) B.auto = on; }
};

loadImages().then(() => { show('title'); renderTitle(); });
