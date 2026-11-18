/* 주인공 종이인형: 몸·머리·옷·장갑·신발·투구·망토를 층으로 나눠 그려서, 낀 장비가 그대로 몸에 입혀져 보여요.
   글자 한 칸 = 픽셀 하나. 왼쪽 절반(13칸)만 적고 오른쪽은 거울로 채워요. 줄 번호는 머리 꼭대기가 0.
   장비 아이콘도 같은 그림에서 그 조각만 떼어 써요. */
const DOLL = (() => {
  const OFF = 7, HW = 13, MG = 3, W = (HW + MG) * 2, H = 34 + OFF + (34 + OFF) % 2, DW = W, DH = H, INK = '#1A0E22';
  const rows = (y0, list) => list.map((r, i) => [y0 + i, r]);
  /* 몸: 머리 큰 2등신. 기본 옷은 기운 자국이 있는 누더기 */
  const BASE = rows(0, [
    '........jhhhh', '.....jhhhhhhh', '...jhhhHHHHhh', '..jhhHHHhhhhh', '.jhhHHhhhhhhh', '.jhhHhhhhhhhh', 'jhhhhhhhhhhhh', 'jhhhhhhhhhhhh', 'jhhhhhhhhhhhh', 'jhhhhjhhhhjhh',
    'jhhhjsjhhjssj', 'jhjhsssjjssss', 'jhjSsssweSsss', 'jhjSssseessss', 'jhjskksEEssss', 'jhjSsssssssmm', '.jhjSssssssss', '.jhj.SSssssss',
    '.jhj......SSS', '.jj..ttrrrrrr', '.....sSrrrtrr', '.....sSrrrrrr', '.....sSrRrrrr', '.....ssrrrrrr', '......rrrrRrr', '.....rrrrrrrr', '.....rRrrrrRr', '......R.rR.rR',
    '.........SSSS', '.........sssS', '.........sssS', '.........sssS', '........ssssS', '........SSSS.'
  ]);
  /* 머리 장식: 투구를 안 썼을 때만 보이는 빨간 리본 (왼쪽에만) */
  const BOW = [[2, 3, 'q'], [3, 3, 'q'], [1, 4, 'q'], [2, 4, 'Q'], [3, 4, 'q'], [4, 4, 'q'], [2, 5, 'q'], [3, 5, 'Q'], [1, 5, 'Q'], [4, 5, 'Q'], [2, 6, 'Q'], [3, 6, 'Q']];
  /* 옷 3종: 제빵 앞치마(원피스 위에 크림색 앞치마), 레이스 원피스(넓은 치마와 리본), 설탕 갑옷(어깨 보호대와 판금) */
  const ARMOR = [
    rows(18, ['.........WW..', '....ABBBBWBBW', '....BBCBBWWWW', '.......CBWWWW', '.......CBWWWW', '.......TTTTTT', '......BBWWWWW', '.....ABBWWVVW', '....ABBCWWVVW', '....BCCCVVVVV']),
    rows(18, ['.........WWW.', '....ABBBBBTTC', '....BCBBBBBTB', '.......BBBBBB', '.......CBBBBB', '......ABBBBBB', '.....ABBBBBBB', '....ABBCBBBCB', '...ABBBCBBBCB', '...WWWWWWWWWW', '...W.W.W.W.W.']),
    rows(18, ['.........CBBB', '...CAAACBBABB', '...CBBBCBABBB', '....CCCCBBBBA', '.......CBBBBB', '.......TTTTTT', '......BBCBBCB', '.....ABBCABCA', '.....BBCCBBCB', '.....CC.CCC.C'])
  ];
  /* 장갑 3종: 오븐 장갑(두툼한 벙어리), 크림 장갑(긴 흰 장갑), 쿠키 건틀릿(각진 손등 보호대) */
  const GLOVES = [
    rows(21, ['....WWW......', '....BBB......', '...ABBB......', '...BBBC......', '....CC.......']),
    rows(20, ['.....TT......', '.....AB......', '.....AB......', '.....AB......', '.....BB......']),
    rows(20, ['....TTT......', '....ABC......', '....ABC......', '...ABBC......', '...CBBC......'])
  ];
  /* 신발 3종: 버터 장화, 초코 운동화, 솜사탕 구두 */
  const SHOES = [
    rows(30, ['........WWWW.', '.........ABC.', '.......ABBBC.', '.......CCCCC.']),
    rows(31, ['.........WWW.', '.......WABBB.', '.......WWWWW.']),
    rows(31, ['.........WWW.', '.......ABTBB.', '.......CCCCC.'])
  ];
  /* 투구 3종: 쿠키 투구(초코칩 박힌 둥근 모자), 머랭 모자(3단으로 말아 올린 뾰족 모자), 도넛 헬멧(아이싱과 스프링클) */
  const HELM = [
    rows(-1, ['......CBBBBBB', '....CBBAAABBB', '...CBAAABBBBB', '..CBABBBBDBBB', '.CBABBBBBBBBB', '.CABBDBBBBBBB', 'CBBBBBBBBBDBB', 'CBBBBBBBBBBBB', 'CCCCCCCCCCCCC', 'TTTTTTTTTTTTT']),
    rows(-6, ['............A', '...........AA', '..........AAB', '.........AABB', '.......CCCCCC', '......AAAABBB', '.....AAABBBBB', '....CCCCCCCCC', '...AAAABBBBBB', '..AAABBBBBBBB', '.CCCCCCCCCCCC', '.AAABBBBBBBBB', 'TTTTTTTTTTTTT']),
    rows(-1, ['.....CBBBBBBB', '...CBBAABBBBB', '..CBAABBWBBBB', '.CBBBBBBBBGBB', '.CBBWBBBBBBBB', 'CBBBBBBBNBBBB', 'CYBBYYBBYBBYB', 'YYYYYYYYYYYYY', 'yyyyyyyyyyyyy', '.yyyyyyyyyyyy'])
  ];
  /* 망토: 몸 뒤에서 양옆과 다리 사이로 보여요. H는 무기 색 끝단 */
  const CAPE = rows(19, ['....BBBBBBBBB', '...ABBBBBBBBB', '...ABBBBBBBBB', '..ABBBBBBBBBB', '..ABBCBBBBBBB', '..ABBCBBBBBBB', '.ABBBCBBBBBBB', '.ABBBCBBCBBBB', '.ABBCBBBCBBBB', '.ABBCBBBCBBBB', '.BBBCBBBCBBBB', '.HHHHHHHHHHHH', '..HH.HHH.HHH.']);
  const COS = {
    bigbow: { t: 'head', L: rows(-4, ['....qqqq.....', '...qqqqqqq...', '...qQqqqqqqQQ', '...qqQqqqqqQQ', '....qqqqqq.QQ', '.....qqq.....']) },
    catears: { t: 'head', L: rows(-3, ['....ee.......', '...eeke......', '...ekkee.....', '..eekkkee....', '..eeeeeee....']) },
    bunny: { t: 'head', L: rows(-7, ['.....WW......', '....WWWW.....', '....WkkW.....', '....WkkW.....', '....WkkW.....', '....WkkW.....', '.....WWW.....', '.....WWW.....']) },
    halo: { t: 'head', L: rows(-5, ['.......GGGGGG', '.....GG......', '.......GGGGGG']) },
    flower: { t: 'head', L: rows(0, ['....k...W...k', '...kGkLWGWLkG', '....k...W...k']) },
    shades: { t: 'face', L: rows(12, ['...eeeeeeeeee', '.....eNeee...', '......eee....']) },
    specs: { t: 'face', L: rows(11, ['......GGGG...', '.....G....GGG', '.....G....G..', '.....G....G..', '......GGGG...']) },
    hearts: { t: 'face', L: rows(14, ['....qkq......', '.....q.......']) },
    angel: { t: 'back', wide: 1, L: rows(14, ['..WW............', '.WWWW...........', 'WWVWWW..........', 'WVWWVWW.........', 'WWVWWVWW........', '.WWVWWVWW.......', '..WWVWWWW.......', '...WWVWWW.......', '....WWWW........', '.....WW.........']) },
    devil: { t: 'back', wide: 1, L: rows(14, ['.U..............', 'UUU.............', 'UuUUU...........', 'UuuUUUU.........', 'U.UuuUUU........', '..U.UuUUU.......', '....U.UUU.......', '......UUU.......']) }
  };
  let shadesOn = false;
  const LAYER = { armor: ARMOR, gloves: GLOVES, shoes: SHOES, helm: HELM };
  const ramp = g => GRADES[g].ramp;
  function pal(it, hair) {
    const p = { j: hair[2], h: hair[1], H: hair[0], s: '#FFE2D2', S: '#F2B9A6', k: '#FF9FAE', e: '#2E1A2A', E: '#7A4A5E', w: '#FFFFFF', m: '#D9606E', r: RAGS[0], t: '#C0AE8E', R: RAGS[1], q: '#F0445A', Q: '#B02A44',
      W: '#FFFFFF', V: '#E6D9C4', G: '#FFD23F', D: '#5A3418', Y: '#E9BE7A', y: '#C08A48', N: '#59B8FF', L: '#5CD66A', U: '#8A4FD0', u: '#4A2380' };
    if (it) { const r = ramp(it.g); p.A = r[0]; p.B = r[1]; p.C = r[2]; p.T = it.g >= 2 ? '#FFD23F' : r[2]; }
    return p;
  }
  /* wide: 여백까지 쓰는 넓은 줄(16칸, 날개용) */
  function paint(px, layer, p, wide) { const n = wide ? HW + MG : HW, x0 = wide ? 0 : MG; for (const [y, row] of layer) { const full = row.padEnd(n, '.').slice(0, n), s = full + [...full].reverse().join(''); for (let x = 0; x < s.length; x++) { const ch = s[x]; if (ch !== '.' && p[ch]) { const yy = y + OFF; if (yy >= 0 && yy < H) px[yy * W + x + x0] = p[ch]; } } } }
  /* 픽셀 판 → 윤곽선을 두른 그림 (빈 가장자리는 잘라요) */
  function toCanvas(px, cropX, W = DW, H = DH) {
    let top = 0, bot = H - 1, l = 0, r = W - 1; const rowE = y => px.slice(y * W, y * W + W).every(v => !v), colE = x => { for (let y = 0; y < H; y++) if (px[y * W + x]) return false; return true; };
    while (top < bot && rowE(top)) top++; while (bot > top && rowE(bot)) bot--; if (cropX) { while (l < r && colE(l)) l++; while (r > l && colE(r)) r--; if (cropX === 'sym') { l = Math.min(l, W - 1 - r); r = W - 1 - l; } }
    const w2 = r - l + 1, h2 = bot - top + 1, c = mk(w2 + 2, h2 + 2), q = c.getContext('2d'), on = (x, y) => x >= 0 && y >= 0 && x < w2 && y < h2 && px[(y + top) * W + x + l];
    for (let y = -1; y <= h2; y++) for (let x = -1; x <= w2; x++) { const col = on(x, y); if (col) q.fillStyle = col; else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) q.fillStyle = INK; else continue; q.fillRect(x + 1, y + 1, 1, 1); }
    c.top = top; return c;
  }
  const sparkle = (q, pts) => { q.fillStyle = '#FFFFFF'; for (const [x, y] of pts) q.fillRect(x, y, 1, 1); };
  /* 등급 장식: 유물부터 투구 깃, 영웅부터 어깨 금장식 */
  function extras(px, eq, hair, V) {
    if (eq.helm && eq.helm.g >= 3) { const v = V(eq.helm), y = v === 1 ? -3 : -3; paint(px, v === 1 ? [[4, 'G............'], [3, 'G............']] : [[y, '...........GG'], [y + 1, '...........GT'], [y + 2, '............G']], pal(eq.helm, hair)); }
    if (eq.armor && eq.armor.g >= 3) paint(px, [[19, '....G........']], pal(eq.armor, hair));
  }
  function compose(eq, look) {
    look = typeof look === 'string' ? { dye: look } : look || {};
    const dye = look.dye, hair = dye && HERO_COS[dye] && HERO_COS[dye].ramp ? HERO_COS[dye].ramp : ['#C9794A', '#9A4E28', '#5E2A16'], px = new Array(W * H).fill(null), V = it => it ? varOf(it) : 0;
    const cp = (c, b) => c.col ? { ...b, ...c.col } : b;      /* 무한의 탑 꾸미기는 같은 모양에 색만 바꿔요 */
    const cs = k => look[k] && COS[look[k]] && COS[look[k]].t === k ? COS[look[k]] : null, head = cs('head'), face = cs('face'), back = cs('back'), base = pal(null, hair);
    if (back) paint(px, back.L, cp(back, base), true);
    else if (eq.cape) { const p = pal(eq.cape, hair); p.H = WCOL[fxOf(eq.cape).w] || p.A; paint(px, CAPE, p); }
    paint(px, BASE, base);
    if (!eq.helm && !head) for (const [x, y, ch] of BOW) px[(y + OFF) * W + x + MG] = base[ch];
    if (eq.shoes) paint(px, SHOES[V(eq.shoes)], pal(eq.shoes, hair));
    if (eq.armor) paint(px, ARMOR[V(eq.armor)], pal(eq.armor, hair));
    if (eq.cape && !back) paint(px, [[18, '........TT...']], pal(eq.cape, hair));
    if (eq.gloves) { const p = pal(eq.gloves, hair); if (V(eq.gloves) === 1) { p.A = '#FFFFFF'; p.B = ramp(eq.gloves.g)[0]; } paint(px, GLOVES[V(eq.gloves)], p); }
    if (eq.helm && !head) { paint(px, HELM[V(eq.helm)], pal(eq.helm, hair)); }
    extras(px, head ? { ...eq, helm: null } : eq, hair, V);
    if (face) paint(px, face.L, cp(face, base));
    if (head) paint(px, head.L, cp(head, base));
    shadesOn = look.face === 'shades' || !!(face && face.shades);
    const c = toCanvas(px, 'sym'), q = c.getContext('2d'); c.mini = shrink(px); shadesOn = false;
    if (SLOTS.some(s => eq[s] && eq[s].g === 4)) { const cx = c.width >> 1; sparkle(q, [[cx - 5, 22 + OFF - c.top], [cx + 4, 25 + OFF - c.top], [cx - 8, 3 + OFF - c.top], [cx + 7, 1 + OFF - c.top]].filter(([, y]) => y > 0 && y < c.height - 1)); }
    return c;
  }
  /* 전투용 작은 그림: 2×2칸을 한 칸으로 줄여요 (가장 많은 색). 눈은 따로 찍어요 */
  function shrink(px) {
    const mw = W / 2, mh = H / 2, out = new Array(mw * mh).fill(null);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const cnt = {}; let n = 0, best = null, bn = 0; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const c = px[(y * 2 + dy) * W + x * 2 + dx]; if (c) { n++; cnt[c] = (cnt[c] || 0) + 1; if (cnt[c] > bn) { bn = cnt[c]; best = c; } } } if (n >= 2) out[y * mw + x] = best; }
    const ey = Math.floor((13 + OFF) / 2), e0 = (7 + MG) >> 1; for (const ex of [e0, mw - 1 - e0]) { if (!shadesOn) out[ey * mw + ex] = '#2E1A2A'; }
    return toCanvas(out, 'sym', mw, mh);
  }
  /* 장비 아이콘: 캐릭터가 입는 그 조각만 떼어서 */
  const icons = new Map();
  function icon(s, v, g, w) {
    const key = [s, v, g, w].join(); let u = icons.get(key); if (u) return u;
    const it = { g, s }, px = new Array(W * H).fill(null), p = pal(it, ['#C9794A', '#9A4E28', '#5E2A16']);
    if (s === 'cape') { p.H = WCOL[w] || p.A; paint(px, CAPE, p); paint(px, [[18, '.......BBBBBB'], [18, '........TT...'], [17, '.........CBBB']], p); }
    else { if (s === 'gloves' && v === 1) { p.A = '#FFFFFF'; p.B = ramp(g)[0]; } paint(px, LAYER[s][v] || LAYER[s][0], p); if (s === 'gloves' || s === 'shoes') for (let y = 0; y < H; y++) for (let x = HW + MG; x < W; x++) px[y * W + x] = null; }
    const c = toCanvas(px, true), k = 4, o = mk(c.width * k, c.height * k), q = o.getContext('2d'); q.imageSmoothingEnabled = false; q.drawImage(c, 0, 0, o.width, o.height);
    if (g === 4) { q.fillStyle = '#FFFFFF'; q.fillRect(o.width - 3 * k, k, k, 3 * k); q.fillRect(o.width - 4 * k, 2 * k, 3 * k, k); }
    u = o.toDataURL(); icons.set(key, u); return u;
  }
  return { compose, icon, COS };
})();
