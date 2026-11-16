/* 주인공 종이인형: 몸·머리·옷·장갑·신발·투구·망토를 층으로 나눠 그려서, 낀 장비가 그대로 몸에 입혀져 보여요.
   글자 한 칸 = 픽셀 하나. 왼쪽 절반(12칸)만 적고 오른쪽은 거울로 채워요. 줄 번호는 머리 꼭대기가 0. */
const DOLL = (() => {
  const OFF = 4, W = 24, H = 40;                 /* 투구가 위로 솟을 자리 4줄 */
  const INK = '#1A0E22';
  /* 몸: 기본은 누더기 */
  const BASE = [
    [0, '......aaaaaa'], [1, '....aaabbbbb'], [2, '...aabbbbccb'], [3, '...abbbbcccb'], [4, '...abbbbbbbb'], [5, '...abbbbbbbb'], [6, '...abbbbbbbd'], [7, '...abbbbbbdd'], [8, '...abbbbbddd'], [9, '...abbbbdddd'],
    [10, '...abbbdddddd'.slice(0, 12)], [11, '...abbbdwedd'], [12, '...abbbdeedd'], [13, '...abbbdeedd'], [14, '...abbbppddd'], [15, '...abbbddddm'], [16, '....abbgdggg'], [17, '....abb....g'],
    [18, '......ttrrrr'], [19, '.....ttrrrrr'], [20, '.....ttrrrrr'], [21, '.....ffrrrrr'], [22, '.....ffrrrtr'], [23, '.....ffrrrrr'], [24, '.....ddtrrrr'], [25, '.....ddrrrrr'], [26, '.......tttrt'], [27, '.......t.t.t'],
    [28, '........fffg'], [29, '........fffg'], [30, '........fffg'], [31, '........fffg'], [32, '........fffg'], [33, '........fffg'], [34, '.......dddd.'], [35, '.......dddd.']
  ];
  /* 옷 3종: 제빵 앞치마, 레이스 원피스, 설탕 갑옷 */
  const ARMOR = [
    [[18, '......BBBBBB'], [19, '.....BBBBABB'], [20, '.....BBBBAAA'], [21, '.......BAAAA'], [22, '.......BAAAA'], [23, '.......BAAAA'], [24, '.......BAAAA'], [25, '.......BAAAA'], [26, '......BBAAAA'], [27, '......TTTTTT']],
    [[18, '......BBBBBB'], [19, '....BBBBBBBB'], [20, '....BBBBBBAA'], [21, '....WWBBBBAA'], [22, '.......BBBBA'], [23, '.......BBBAA'], [24, '.......TTTTT'], [25, '......BBBBBB'], [26, '.....BBBBBBB'], [27, '....BBBBBBBB'], [28, '...BBBBBBBBB'], [29, '...WAWAWAWAW']],
    [[17, '...CAAA.....'], [18, '..CAAAABBBBB'], [19, '..CBBBBBBBBB'], [20, '...CCBBBAAAA'], [21, '.....CBBAAAA'], [22, '.......BAAAA'], [23, '.......BAAAA'], [24, '.......BBBBB'], [25, '.......GGGGG'], [26, '......BBBBBB'], [27, '......BCBCBC']]
  ];
  /* 장갑 3종: 오븐 장갑, 크림 장갑(긴 장갑), 쿠키 건틀릿 */
  const GLOVES = [
    [[22, '....BBB.....'], [23, '....BBB.....'], [24, '....BBB.....'], [25, '....ABB.....'], [26, '....CCC.....']],
    [[21, '.....WW.....'], [22, '.....AA.....'], [23, '.....AA.....'], [24, '.....AA.....'], [25, '.....AA.....'], [26, '.....BB.....']],
    [[21, '....CCC.....'], [22, '....BBB.....'], [23, '....CCC.....'], [24, '....BBB.....'], [25, '....BBB.....'], [26, '....CCC.....']]
  ];
  /* 신발 3종: 버터 장화, 초코 운동화, 솜사탕 구두 */
  const SHOES = [
    [[31, '........AAA.'], [32, '........BBB.'], [33, '........BBB.'], [34, '.......BBBB.'], [35, '.......CCCC.']],
    [[33, '........WWW.'], [34, '.......BBBA.'], [35, '.......WWWW.']],
    [[33, '.......WW...'], [34, '......ABBBB.'], [35, '......CCCCC.']]
  ];
  /* 투구 3종: 쿠키 투구, 머랭 모자, 도넛 헬멧 (줄 번호가 마이너스면 머리 위로 솟아요) */
  const HELM = [
    [[0, '.....CCCCCCC'], [1, '...CCBBBBBBB'], [2, '..CBBAABBBBB'], [3, '..CBAABBBDBB'], [4, '..CBBBBBBBBB'], [5, '..CBBBBDBBBB'], [6, '..CBBBBBBBBB'], [7, '..TTTTTTTTTT'], [8, '..CC........']],
    [[-4, '...........W'], [-3, '..........AA'], [-2, '.........BBB'], [-1, '........AAAA'], [0, '.......BBBBB'], [1, '......AAAAAA'], [2, '.....BBBBBBB'], [3, '....AAAAAAAA'], [4, '...BBBBBBBBB'], [5, '..TTTTTTTTTT']],
    [[-1, '.....CCCCCCC'], [0, '...CCBBBBBBB'], [1, '..CBBBBBBBBB'], [2, '..CBBGBBWBBA'], [3, '..CBBBBBBBBB'], [4, '.CYYYYYYYYYY'], [5, '.CYYYYYYYYYY'], [6, '..TTTTTTTTTT']]
  ];
  /* 망토: 몸 뒤에. H는 무기 색 끝단 */
  const CAPE = [[18, '.....BBBBBBB'], [19, '....BBBBBBBB'], [20, '....BBBBBBBB'], [21, '...BBBBBBBBB'], [22, '...BBBBBBBBB'], [23, '..BBBBBBBBBB'], [24, '..BBBBBBBBBB'], [25, '..BBBBBBBBBB'], [26, '..BBBBBBBBBB'], [27, '.CBBBBBBBBBB'], [28, '.CBBBBBBBBBB'], [29, '.HHHHHHHHHHH']];
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const ramp = g => GRADES[g].ramp;
  function pal(it, hairRamp) {
    const base = { a: hairRamp[2], b: hairRamp[1], c: hairRamp[0], d: '#FFE4D6', f: '#FAC8B4', g: '#E8A898', e: '#2A1420', w: '#FFFFFF', p: '#FF9AA8', m: '#C0485A', r: RAGS[0], t: RAGS[1], u: RAGS[2], W: '#FFFFFF', G: '#FFD23F', D: '#5A3418', Y: '#E3B36A', y: '#C08544', K: INK, S: '#C5CED8', M: '#8E9AA8' };
    if (it) { const r = ramp(it.g); base.A = r[0]; base.B = r[1]; base.C = r[2]; base.T = it.g >= 2 ? '#FFD23F' : r[2]; }
    return base;
  }
  function paint(px, layer, p, dy = 0) { for (const [y, row] of layer) { const full = row.padEnd(12, '.'), s = full + [...full].reverse().join(''); for (let x = 0; x < W; x++) { const ch = s[x]; if (ch !== '.' && p[ch]) { const yy = y + OFF + dy; if (yy >= 0 && yy < H) px[yy * W + x] = p[ch]; } } } }
  /* 낀 장비를 입힌 그림 한 장 (검은 윤곽선까지) */
  function compose(eq, dye) {
    const hair = dye && HERO_COS[dye] ? HERO_COS[dye].ramp : ['#B8683A', '#8A4520', '#5A2A14'], px = new Array(W * H).fill(null), V = it => it ? varOf(it) : 0;
    if (eq.cape) { const p = pal(eq.cape, hair); p.H = WCOL[fxOf(eq.cape).w] || ramp(eq.cape.g)[0]; paint(px, CAPE, p); }
    paint(px, BASE, pal(null, hair));
    if (eq.shoes) paint(px, SHOES[V(eq.shoes)], pal(eq.shoes, hair));
    if (eq.armor) paint(px, ARMOR[V(eq.armor)], pal(eq.armor, hair));
    if (eq.cape) paint(px, [[18, '...........G']], pal(eq.cape, hair));
    if (eq.armor && eq.armor.g >= 3) { const p = pal(eq.armor, hair); paint(px, [[17, '...TTA......'], [18, '..TAAA......']], p); }
    if (eq.gloves) paint(px, GLOVES[V(eq.gloves)], pal(eq.gloves, hair));
    if (eq.helm) { paint(px, HELM[V(eq.helm)], pal(eq.helm, hair)); if (eq.helm.g >= 3) paint(px, [[-3 + (V(eq.helm) === 1 ? 0 : 3), '...........G']], pal(eq.helm, hair)); }
    /* 맨 위 빈 줄은 잘라요 */
    let top = 0; while (top < H - 1 && px.slice(top * W, top * W + W).every(v => !v)) top++;
    const h2 = H - top, c = mk(W + 2, h2 + 2), q = c.getContext('2d'), on = (x, y) => x >= 0 && y >= 0 && x < W && y < h2 && px[(y + top) * W + x];
    for (let y = -1; y <= h2; y++) for (let x = -1; x <= W; x++) { const col = on(x, y); if (col) q.fillStyle = col; else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) q.fillStyle = INK; else continue; q.fillRect(x + 1, y + 1, 1, 1); }
    /* 반짝이는 장비(전설)는 흰 점 */
    if ([eq.armor, eq.helm, eq.cape, eq.gloves, eq.shoes].some(it => it && it.g === 4)) { q.fillStyle = '#FFFFFF'; for (const [x, y] of [[9, 20], [14, 23], [7, 31], [17, 12]]) { const yy = y + OFF - top + 1; if (yy > 0 && yy < h2 && px[(y + OFF) * W + x]) q.fillRect(x + 1, yy, 1, 1); } }
    return c;
  }
  return { compose };
})();
