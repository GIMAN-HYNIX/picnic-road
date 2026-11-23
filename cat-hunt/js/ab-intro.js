'use strict';
/* =========================================================
   컨셉아트북 '처음 이야기': 게임 초반 세계관을 열두 장면으로
   240×135, 화면 픽셀 좌표 (아래쪽 +y)
   ========================================================= */
const IW = 240, IH = 135;
const KF = { sky: [[0, '#a9b8b3'], [.6, '#93a6a1'], [1, '#7f928d']], fog: '#a2b3ae', far: '#71877f', mid: '#4f635b', near: '#2f3631', floor: '#4b5b48', floor2: '#3f4f3e', fern: '#3d6646', moss: '#4b6f3f', path: '#7d735a' };
const TF = edPal('#1e2a34');

AB.INTRO = [
  ['잊힌 것들이 내리는 비', '누군가에게 잊힌 물건과 약속이 쌓이면 하늘이 무거워져서 비가 돼요. 어느 때부터 이 비가 그치지 않게 됐어요.'],
  ['물에 잠긴 마을', '산 아래 낮은 마을은 물이 먼저 찼어요. 사람들은 집을 두고 숲으로 피했어요. 방랑자도 그중 한 사람이었어요.'],
  ['혼자 지낸 석 달', '방랑자는 숲에서 혼자 지내며 먹을 것을 찾아다녀요. 나무에 그은 날짜 표시가 하나씩 늘어 가요.'],
  ['리본에 감긴 고양이', '어느 날 낡은 빨간 리본에 몸이 감긴 채 떨고 있는 고양이를 만나요. 리본 끝은 나무뿌리에 걸려 있었어요.'],
  ['리본을 매 주다', '방랑자는 리본을 풀어서 고양이 목에 다시 매 줘요. 그날부터 둘이 같이 걸어요.'],
  ['털을 세우는 솔', '솔은 물그림자를 눈으로 보지 못해요. 그런데 가까이 오면 느끼고 털을 부풀려요. 목에 맨 리본이 같은 기운을 전해 주기 때문이에요.'],
  ['멈칫하는 물그림자', '리본은 아직 해방되지 않은 잊힌 물건이에요. 물그림자는 리본을 보면 동족인 줄 알고 잠깐 멈칫해요. 싸움을 쉽게 만들 정도는 아니에요.'],
  ['총소리', '총알은 귀해서 마지막에만 써요. 쏘면 솔은 놀라 멀리 달아나 숨었다가, 조용해지면 슬금슬금 돌아와요.'],
  ['훼손된 냄비', '물그림자를 물로 돌려보내면 가끔 물건이 남아요. 대부분은 사냥하다 망가진 물건이에요. 찌그러진 냄비는 물을 한 번 끓이면 부서져 사라져요.'],
  ['온전한 냄비', '드물게 온전한 냄비가 남아요. 쓰임대로 물을 끓여 주면 미련이 풀려요. 해방한 냄비는 도감에 남고 계속 쓸 수 있어요.'],
  ['텐트와 밥', '지치면 텐트를 칠 자리를 찾아요. 솔이 잡아 온 참새와 채집한 버섯을 구워 둘이 나눠 먹어요.'],
  ['다시 걷기', '텐트를 접어 지고 다시 걸어요. 먹을 것을 찾는 길에 물그림자를 만나고 잊힌 물건을 해방해요. 둘의 하루는 이렇게 흘러가요.'],
];

/* ---------- 공용 ---------- */
function forest(o = {}) {
  const pb = new PB(IW, IH), gy = o.gy ?? 108, sd = o.seed || 3;
  AB.sky(pb, o.sky || KF.sky, 0, IH, 6);
  const far = AB.layer(IW, IH, R => { const r = RNG(sd); for (let i = 0; i < 9; i++) { const x = 6 + i * 28 + r() * 12; R.K2(x, gy + 4, x + (r() - .5) * 4, -6, 3.5 + r() * 3, 3, TF(KF.far), { g: 'f' + i }); } }, AB_FAR);
  AB.fog(far, KF.fog, .5, .3); AB.over(pb, far);
  AB.mist(pb, gy - 20, 22, KF.fog, .7, sd);
  if (o.mid !== false) {
    const mid = AB.layer(IW, IH, R => { const r = RNG(sd + 9); for (let i = 0; i < 3; i++) { const x = 30 + i * 80 + r() * 30; AB.trunk(R, x, gy + 2, 8 + r() * 3, 6, TF(KF.mid), { bark: TF(mix(KF.mid, '#0a0a0a', .2)), g: 'm' + i, nr: 3, moss: TF(KF.moss) }); } }, abLine(mix(INK, KF.fog, .5)));
    AB.fog(mid, KF.fog, .3, .15); AB.over(pb, mid);
  }
  const gr = AB.layer(IW, IH, R => R.P([[0, gy], [IW, gy - 2], [IW, IH], [0, IH]], TF(KF.floor), R.pat({ g: 'gr', flat: 1, alts: [TF(KF.floor2)], alt: (x, y) => (vnoise(x * .06, y * .15, 4) > .56 ? 0 : -1) })), AB_FAR);
  AB.fog(gr, KF.fog, .35, 0, gy, gy + 30); AB.over(pb, gr);
  return pb;
}
function finish(pb, o = {}) { if (o.rain !== false) AB.rain(pb, { n: o.n || 140, len: 9, seed: o.seed || 11 }); grain(pb, .04, o.seed || 7); return pb; }
function catAt2(pb, fn, s, k, x, y, flip) { const W = Math.ceil(44 * k) + 8, H = Math.ceil(34 * k) + 8; AB.put(pb, AB.spr(W, H, Math.round(W / 2), H - 4, k, R => fn(R, s)), x, y, flip); }
// 물그림자 예시 (모양은 물방울 쥐를 빌림, 속에는 생활 물건인 냄비)
const potObj = R => potRig(R, -.8, -2.4, .5, {});
function monLayer(x, y, k, o = {}) {
  const M = AB.MON[0], prep = R => { if (o.flip) R.m[0] = -R.m[0]; R.scl(k); if (o.rot) R.rotate(o.rot); };
  const b = hiBake(IW, IH, x, y, R => { prep(R); M.body(R); }, abLine(WINK));
  const ob = hiBake(IW, IH, x, y, R => { prep(R); (o.obj || M.obj)(R); }, ED);
  seeThrough(b, ob, .55);
  return b;
}
function potRig(R, x, y, s, o = {}) {
  const ST = o.dent ? ['#4a4640', '#7a7468', '#a8a092'] : ['#4a5058', '#8e96a0', '#e4eaf0'], DK = ['#22262c', '#3a3e46'];
  R.push(); R.translate(x, y); R.scl(s);
  R.K2(-6.4, -5.8, -9, -5.8, .8, .8, DK, { g: 'ph1', ol: 1 }); R.K2(6.4, -5.8, 9, -5.8, .8, .8, DK, { g: 'ph2', ol: 1 });
  const body = o.dent ? [[-6, -7], [5.6, -7.4], [6.4, -4.4], [4.6, -2.6], [5.2, -.6], [1.2, 0], [-2, -1.6], [-5, -.2], [-6.4, -3]] : [[-6, -7], [6, -7], [6, -1.2], [5, 0], [-5, 0], [-6, -1.2]];
  R.P(body, ST, o.dent ? R.pat({ g: 'pb', ol: 1, alts: [['#5a3a24', '#8a5a34']], alt: (X, Y) => (hash2(Math.round(X * 2), Math.round(Y * 2)) > .78 ? 0 : -1) }) : { g: 'pb', ol: 1 });
  R.E(0, -7, 6.4, 1.5, 0, ST, { g: 'prim', ol: 1 });
  R.E(0, -7, 5.2, 1, 0, DK, { g: 'pin' });
  if (o.dent) { R.DL(-2, -6, -.6, -3.6, '#2a2620'); R.DL(-.6, -3.6, -1.6, -1.6, '#2a2620'); R.DL(3, -5.6, 4, -4, '#2a2620'); }
  R.pop();
}
function fireRig(R, x, y, s) {
  R.push(); R.translate(x, y); R.scl(s);
  const LOG = ['#3a2416', '#6a4228'];
  R.K2(-6, -.6, 6, -2, 1.2, 1.2, LOG, { g: 'lg1', ol: 1 }); R.K2(-6, -2, 6, -.6, 1.2, 1.2, LOG, { g: 'lg2', ol: 1 });
  R.P([[-3.6, -1.6], [-1.6, -6], [0, -10], [1.8, -6], [3.6, -1.6]], ['#c8441a', '#f08a2a', '#ffd060'], { g: 'fl', cast: 0 });
  R.P([[-1.8, -1.8], [0, -6.4], [1.8, -1.8]], ['#f0b030', '#ffe080', '#fff6c0'], { g: 'fl2', cast: 0 });
  R.pop();
}
function smokeFx(pb, x, y) { for (let i = 0; i < 4; i++) pb.ellipse(x + i * 2, y - i * 7, 2.4 + i, 1.8 + i * .6, mix('#93a6a1', '#d8dee4', .5 - i * .1)); }
function bowRig(R, x, y, s) {
  const RED = WT('#b8402e', .18), RED2 = WT('#8a2a1e');
  R.P([[x, y], [x - 3.6 * s, y - 2.2 * s], [x - 4 * s, y + 1.6 * s]], RED, { g: 'bl', ol: 1 });
  R.P([[x, y], [x + 3.6 * s, y - 2.2 * s], [x + 4 * s, y + 1.6 * s]], RED, { g: 'br', ol: 1 });
  R.P([[x - .4 * s, y], [x - 2 * s, y + 4.4 * s], [x - .8 * s, y + 4 * s]], RED2, { g: 'bt1', ol: 1 });
  R.P([[x + .4 * s, y], [x + 2 * s, y + 4.2 * s], [x + .8 * s, y + 3.8 * s]], RED2, { g: 'bt2', ol: 1 });
  R.E(x, y, s, .9 * s, 0, RED2, { g: 'bk', ol: 1 });
}
// 비에 섞여 내리는 잊힌 물건들
const JUNK = ['letter', 'umbrella', 'button', 'key', 'cup', 'spoon', 'ribbon', 'boat'];
function junk(R, kind, x, y, s, rot, g) {
  R.push(); R.translate(x, y); R.rotate(rot); R.scl(s);
  const ol = { g, ol: 1 };
  if (kind === 'letter') { R.B(0, 0, 8, 5.4, 0, ['#c8c0a8', '#ece4d0'], ol); R.DL(-3.6, -2.4, 0, .4, '#a89a80'); R.DL(3.6, -2.4, 0, .4, '#a89a80'); }
  else if (kind === 'umbrella') { R.P([[-5, 0], [-4, -2.6], [0, -3.8], [4, -2.6], [5, 0]], ['#8a3a30', '#c05a48'], ol); R.K2(0, 0, 0, 4, .5, .5, ['#3a2a20', '#5a4030'], { g: g + 'h' }); R.K2(0, 4, -1.2, 5, .5, .5, ['#3a2a20', '#5a4030'], { g: g + 'h' }); }
  else if (kind === 'button') R.E(0, 0, 2.6, 2.6, 0, ['#2a5aa0', '#5a8ad0'], ol);
  else if (kind === 'key') { R.E(-3, 0, 1.8, 1.8, 0, ['#8a6a20', '#d8b040'], ol); R.K2(-1.4, 0, 4, 0, .6, .6, ['#8a6a20', '#d8b040'], { g: g + 's' }); R.K2(3.2, 0, 3.2, 1.4, .5, .5, ['#8a6a20', '#d8b040'], { g: g + 's' }); }
  else if (kind === 'cup') { R.B(0, 0, 5, 5.4, 0, ['#a8b4c0', '#e0e8ee'], ol); R.E(3.4, 0, 1.4, 1.8, 0, ['#a8b4c0', '#e0e8ee'], { g: g + 'h', ol: 1 }); }
  else if (kind === 'spoon') { R.K2(-4, 0, 1.6, 0, .5, .5, ['#8a929c', '#c8d0d8'], { g }); R.E(3, 0, 1.8, 1.2, 0, ['#8a929c', '#c8d0d8'], ol); }
  else if (kind === 'ribbon') { R.P([[0, 0], [-3.4, -2], [-3.6, 1.6]], ['#8a2a1e', '#c84a36'], ol); R.P([[0, 0], [3.4, -2], [3.6, 1.6]], ['#8a2a1e', '#c84a36'], { g: g + 'b', ol: 1 }); }
  else if (kind === 'boat') { R.P([[-4.4, 0], [4.4, 0], [2.8, 2], [-2.8, 2]], ['#c8c0a8', '#f4efe2'], ol); R.P([[-1.4, 0], [.2, -3.4], [1.8, 0]], ['#c8c0a8', '#f4efe2'], { g: g + 's', ol: 1 }); }
  R.pop();
}
// 등을 세우고 털을 부풀린 솔 (오른쪽을 봄)
function catPuff(R) {
  const F = CP.F;
  R.chain([[-7, -11], [-9, -16], [-9.4, -21], [-8.6, -25]], [2, 2.6, 2.6, 2], F, R.pat({ g: 'ct', ol: 1, alts: [CP.S], alt: (x, y, t) => ((t > .3 && t < .5) || (t > .7 && t < .85) ? 0 : -1) }));
  R.K2(-4.6, -10, -5.4, -1.2, 1.4, 1.2, F, { g: 'fl1', b: -.25 }); R.K2(4.4, -10, 5, -1.2, 1.4, 1.2, F, { g: 'fl2', b: -.25 });
  R.E(-4.4, -12, 4.6, 4.2, 0, F, R.pat({ g: 'cb', alts: [CP.S], alt: catStripe(-4.4, -12.2) }));
  R.E(.2, -14.4, 5.4, 4.6, 0, F, R.pat({ g: 'cb', alts: [CP.S], alt: catStripe(.2, -14.6) }));
  R.E(4.6, -12, 4.4, 4.2, 0, F, R.pat({ g: 'cb', alts: [CP.S], alt: catStripe(4.6, -12.2) }));
  for (let k = -7; k <= 8; k += 2.2) { const yy = -14.4 - 4.6 * Math.sqrt(Math.max(0, 1 - (k / 9.5) ** 2)); R.P([[k - 1, yy + 1.4], [k + .3, yy - 1.8], [k + 1.2, yy + 1.4]], F, { g: 'cb' }); }
  R.K2(-4, -10, -4.4, -1.2, 1.5, 1.3, F, { g: 'nl1', ol: 2 }); R.E(-4, -1, 1.6, 1, 0, CP.W, { g: 'np1' });
  R.K2(5, -10, 5.8, -1.2, 1.5, 1.3, F, { g: 'nl2', ol: 2 }); R.E(6.2, -1, 1.6, 1, 0, CP.W, { g: 'np2' });
  R.K2(7.4, -12.6, 8.2, -15, 1, 1, CP.COL, { g: 'ccol' });
  const hx = 10.6, hy = -12.4;
  R.P([[hx - 1, hy - 2.6], [hx - 4.4, hy - 4.2], [hx - 1.6, hy - 1.2]], F, { g: 'e1', b: -.25 });
  R.E(hx, hy, 3.8, 3.3, 0, F, R.pat({ g: 'ch', alts: [CP.S], alt: (x, y) => (y < hy - 1.6 && mod(Math.round(x - hx), 2) === 0 ? 0 : -1) }));
  R.P([[hx - 2.6, hy - 2.2], [hx - 5.8, hy - 3.2], [hx - 2.4, hy - .6]], F, { g: 'e2' });
  R.E(hx + 2.6, hy + .9, 1.8, 1.4, 0, CP.W, { g: 'cmuz' });
  R.stamp(hx + 1.2, hy - 1, ['wI', 'IP'], { w: '#fffaf0', I: CP.EYE, P: '#141010' });
  R.stamp(hx + 4.2, hy + .2, ['N'], { N: CP.NOSE });
  R.stamp(hx + 3, hy + 1.8, ['MwM'], { M: INK, w: '#fffaf0' });
}

/* ---------- 장면 ---------- */
const PANELS = [
  function () { // 잊힌 것들이 내리는 비
    const pb = new PB(IW, IH);
    AB.sky(pb, [[0, '#5e6878'], [.5, '#7a8696'], [1, '#93a0ae']], 0, IH, 7);
    const cl = AB.layer(IW, IH, R => { const r = RNG(2); for (let i = 0; i < 14; i++) R.E(r() * IW, 4 + r() * 22, 22 + r() * 18, 9 + r() * 6, 0, TF('#6a7484'), { g: 'cl' }); }, AB_FAR);
    AB.over(pb, cl);
    const ins = AB.layer(IW, IH, R => { const r = RNG(5); for (let i = 0; i < 9; i++) junk(R, JUNK[i % JUNK.length], 14 + i * 26 + r() * 8, 12 + r() * 14, 1, r() * 2 - 1, 'in' + i); }, AB_FAR);
    AB.fog(ins, '#6a7484', .7); AB.over(pb, ins);
    const fo = AB.layer(IW, IH, R => { const r = RNG(8); for (let i = 0; i < 15; i++) { const x = i * 17 + r() * 8; R.E(x, 116 - r() * 8, 12 + r() * 6, 14 + r() * 6, 0, TF('#3e5048'), { g: 'fo' }); } R.P([[0, 120], [IW, 118], [IW, IH], [0, IH]], TF('#34443c'), { g: 'fo', flat: 1 }); }, AB_FAR);
    AB.fog(fo, '#93a0ae', .3, 0); AB.over(pb, fo);
    AB.rain(pb, { n: 260, len: 10, seed: 3 });
    const fall = AB.layer(IW, IH, R => { const r = RNG(9); for (let i = 0; i < 13; i++) { const x = 10 + r() * 220, y = 40 + r() * 64; junk(R, JUNK[i % JUNK.length], x, y, 1.1, r() * 2.4 - 1.2, 'j' + i); } });
    AB.fog(fall, '#c8d2dc', .25);
    { const r = RNG(9); for (let i = 0; i < 13; i++) { const x = 10 + r() * 220, y = 40 + r() * 64; r(); for (let k = 0; k < 3; k++) AB.tline(pb, x - 2 + k * 3, y - 15, x - 4 + k * 3, y - 6, '#e0e8f0', .35); } }
    AB.over(pb, fall);
    grain(pb, .04, 21);
    return pb;
  },
  function () { // 물에 잠긴 마을
    const pb = new PB(IW, IH), WL = 84;
    AB.sky(pb, [[0, '#6a7686'], [1, '#8a96a6']], 0, WL, 6);
    const mt = AB.layer(IW, IH, R => R.P([[0, WL], [30, 46], [70, 22], [110, 40], [150, 30], [190, 52], [240, 44], [240, WL]], TF('#5a6676'), { g: 'mt', side: .5 }), AB_FAR);
    AB.fog(mt, '#8a96a6', .4); AB.over(pb, mt);
    AB.sky(pb, [[0, '#6e8090'], [1, '#4e6070']], WL, IH, 5);
    const roofs = AB.layer(IW, IH, R => {
      [[34, WL + 4, 18, 10], [72, WL + 7, 16, 9], [106, WL + 3, 20, 11], [58, WL + 1, 9, 5]].forEach(([x, y, w, h], i) => AB.roof(R, x, y, w, h, TF('#3c444e'), TF('#4a525c'), 'r' + i, TF('#56763c')));
      R.K2(130, WL + 6, 130, WL - 22, .9, .8, TF('#4a3a2e'), { g: 'pole' }); R.K2(124, WL - 18, 136, WL - 18, .6, .6, TF('#4a3a2e'), { g: 'pole' });
    }, abLine(mix(INK, '#8a96a6', .3)));
    AB.clipBelow(roofs, WL + 1); AB.over(pb, roofs); AB.reflect(pb, roofs, WL + 1, '#4e6070', .4, null, 1, 2);
    const sl = AB.layer(IW, IH, R => {
      R.P([[140, IH], [178, 98], [214, 70], [240, 58], [240, IH]], TF('#4b5b48'), R.pat({ g: 'sl', flat: 1, alts: [TF('#3f4f3e')], alt: (x, y) => (vnoise(x * .08, y * .12, 3) > .55 ? 0 : -1) }));
      const r = RNG(4); for (let i = 0; i < 8; i++) { const x = 200 + r() * 40, y = 70 - (x - 200) * .4 + r() * 12; AB.fir(R, x, y, 18 + r() * 10, TF('#34503e'), 'fr' + i); }
    }, abLine(mix(INK, '#8a96a6', .2)));
    AB.over(pb, sl);
    const ppl = AB.layer(IW, IH, R => {
      [[164, 116], [173, 107], [182, 99], [191, 92], [200, 85]].forEach(([x, y], i) => {
        R.K2(x, y, x + .4, y - 6, 1.8, 1.4, TF(['#5a6a8a', '#8a5a4a', '#6a7a5a', '#7a6a8a', '#5a5a5a'][i]), { g: 'p' + i });
        R.E(x + .6, y - 7.6, 1.4, 1.4, 0, TF('#d8b090'), { g: 'h' + i });
        R.E(x + .4, y - 9.6, 4, 1.6, 0, TF(['#3a4a6a', '#a04a3a', '#3a5a4a', '#6a4a7a', '#2a2a2a'][i]), { g: 'u' + i, ol: 1 });
      });
    });
    AB.over(pb, ppl);
    AB.put(pb, AB.hero(.17, 0, { cat: false }), 152, 128, true);
    AB.rings(pb, 40, 3, [0, WL + 4, 140, 50], '#c8d8e4', .4);
    AB.rain(pb, { n: 320, len: 11, seed: 5 });
    grain(pb, .04, 22);
    return pb;
  },
  function () { // 혼자 지낸 석 달
    const pb = forest({ seed: 5, mid: false });
    const L = AB.layer(IW, IH, R => {
      AB.trunk(R, 34, 112, 20, 16, TF(KF.near), { bark: TF('#252a26'), moss: TF(KF.moss), g: 'big', nr: 4, mossH: 30 });
      R.P([[150, 110], [176, 76], [204, 110]], TF('#b09a68', .14), { g: 'tent', ol: 1 }); R.P([[170, 110], [176, 90], [182, 110]], ['#2a2420', '#3a3028'], { g: 'door' });
      fireRig(R, 128, 112, 1.3);
      AB.tuft(R, 98, 114, 8, TF(KF.fern), 3); AB.tuft(R, 222, 114, 10, TF(KF.fern), 4);
    });
    AB.over(pb, L);
    const tc = '#d8ccb0'; let n = 0;
    for (let row = 0; row < 4; row++) for (let g = 0; g < 5 && n < 18; g++, n++) { const x0 = 22 + g * 6, y0 = 40 + row * 10; for (let k = 0; k < 4; k++) pb.vl(x0 + k, y0, y0 + 6, tc); pb.line(x0 - 1, y0 + 5, x0 + 4, y0 + 1, tc); }
    AB.glow(pb, 128, 106, 16, '#ffc070', .4); smokeFx(pb, 128, 96);
    AB.put(pb, AB.hero(.3, 0, { view: 'front' }), 78, 116);
    return finish(pb, { n: 120, seed: 12 });
  },
  function () { // 리본에 감긴 고양이
    const pb = forest({ seed: 7, mid: false });
    const L = AB.layer(IW, IH, R => { AB.fern(R, 214, 118, 34, TF(KF.fern, .12), 6, { n: 7 }); R.K2(160, 116, 198, 106, 2.2, 1.4, TF('#4a3a2e'), { g: 'root', ol: 1 }); R.K2(198, 106, 216, 110, 1.4, 1, TF('#4a3a2e'), { g: 'root', ol: 1 }); });
    AB.over(pb, L);
    const cx = 140, cy = 118, f = 1.3 / 2.4;
    catAt2(pb, catLoafHi, { peek: true }, 1.3, cx, cy);
    const rb = AB.layer(IW, IH, R => {
      const RED = WT('#b8402e', .18);
      const q = (x, y) => [cx + x * f, cy + y * f];
      R.chain([q(-15, -10), q(-4, -2), q(7, -9), q(15, -3)], [.7, .7, .7, .7], RED, { g: 'rb1', ol: 1 });
      R.chain([q(-12, -1), q(-2, -11), q(10, -2)], [.7, .7, .7], RED, { g: 'rb2', ol: 1 });
      R.chain([q(14, -4), [cx + 22, cy - 8], [cx + 38, cy - 10], [cx + 56, cy - 11]], [.7, .7, .7, .6], RED, { g: 'rb3', ol: 1 });
    });
    AB.over(pb, rb);
    for (const [x, y] of [[cx - 14, cy - 12], [cx + 10, cy - 14], [cx - 15, cy - 5]]) { pb.line(x, y, x + 2, y - 1, '#e8eef4'); pb.line(x + 1, y + 2, x + 3, y + 1, '#e8eef4'); }
    AB.put(pb, AB.hero(.55, 0, { cat: false }), 70, 122);
    for (let i = 0; i < 3; i++) pb.rect(74 + i * 3, 30, 2, 2, '#f4f0e6');
    return finish(pb, { n: 140, seed: 13 });
  },
  function () { // 리본을 매 주다 (가까이)
    const pb = new PB(IW, IH);
    AB.sky(pb, [[0, '#a6b4b0'], [1, '#8a9c98']], 0, IH, 6);
    const far = AB.layer(IW, IH, R => { const r = RNG(4); for (let i = 0; i < 7; i++) { const x = 10 + i * 36 + r() * 10; R.K2(x, 140, x, -5, 7 + r() * 5, 6, TF('#6a7e78'), { g: 'f' + i }); } }, AB_FAR);
    AB.fog(far, KF.fog, .55); AB.over(pb, far);
    pb.rect(0, 118, IW, 17, '#56664f'); pb.dith(0, 118, IW, 17, '#4b5b48', .4);
    const k = 3.6, cx = 120, cy = 131, ny = cy - 8.4 * k;
    catAt2(pb, catSitHi, {}, k, cx, cy);
    const L = AB.layer(IW, IH, R => {
      R.K2(50, 160, 96, ny + 8, 17, 13, WPAL.PON, R.pat({ g: 'sl', ol: 1, alts: [WPAL.PONS], alt: ponchoAlt }));
      R.K2(190, 160, 144, ny + 8, 17, 13, WPAL.PON, R.pat({ g: 'sr', ol: 1, alts: [WPAL.PONS], alt: ponchoAlt }));
      R.E(102, ny + 2, 12, 9, .35, WPAL.SK, { g: 'hl', ol: 1 }); R.E(138, ny + 2, 12, 9, -.35, WPAL.SK, { g: 'hr', ol: 1 });
      R.E(110, ny - 3, 3, 2.4, .6, WPAL.SK, { g: 'tl', ol: 1 }); R.E(130, ny - 3, 3, 2.4, -.6, WPAL.SK, { g: 'tr', ol: 1 });
      R.chain([[cx - 4, ny + 1], [105, ny - 1]], [1.3, 1.3], WT('#b8402e', .18), { g: 'e1', ol: 1 });
      R.chain([[cx + 4, ny + 1], [135, ny - 1]], [1.3, 1.3], WT('#b8402e', .18), { g: 'e2', ol: 1 });
      bowRig(R, cx, ny + 1, 2.4);
    });
    AB.over(pb, L);
    return finish(pb, { n: 70, seed: 14 });
  },
  function () { // 털을 세우는 솔
    const pb = forest({ seed: 9, mid: false });
    pb.ellipse(186, 117, 26, 5, '#6a8288'); pb.ellipse(182, 116, 16, 1.4, '#a8c0c8');
    const mon = monLayer(186, 125, 1.7, { obj: potObj, flip: true });
    AB.clipBelow(mon, 117); AB.fog(mon, KF.fog, .35); AB.over(pb, mon);
    AB.put(pb, AB.hero(.55, 0, { cat: false }), 46, 122);
    catAt2(pb, catPuff, {}, 1.3, 108, 121);
    for (const [x, y, dx, dy] of [[100, 84, -2, -3], [108, 81, 0, -4], [116, 84, 2, -3]]) pb.line(x, y, x + dx, y + dy, '#f4f0e6');
    return finish(pb, { n: 130, seed: 15 });
  },
  function () { // 멈칫하는 물그림자
    const pb = forest({ seed: 11, mid: false });
    pb.ellipse(172, 118, 18, 3.6, '#6a8288');
    AB.over(pb, monLayer(172, 119, 1.7, { obj: potObj, flip: true }));
    catAt2(pb, catSideHi, { pose: 'stand' }, 2.4, 78, 118);
    const nx = 78 + 5.2 * 2.4, ny = 118 - 11.2 * 2.4;
    AB.over(pb, AB.layer(IW, IH, R => bowRig(R, nx, ny, 1.3)));
    AB.glow(pb, nx, ny, 10, '#ff9a80', .35);
    const px = 172 + .8 * 1.7, py = 119 - 4.6 * 1.7;
    for (let t = .14; t < .9; t += .06) { const x = lerp(nx, px, t), y = lerp(ny, py, t) - Math.sin(t * Math.PI) * 16; pb.tint(x, y, .65, '#ffe8d0'); pb.tint(x + 1, y, .3, '#ffe8d0'); }
    for (let i = 0; i < 3; i++) pb.rect(166 + i * 4, 88, 2, 2, '#f4f0e6');
    for (const r of [14, 17]) for (let a = -2.7; a < -.4; a += .07) pb.tint(172 + Math.cos(a) * r, 109 + Math.sin(a) * r * .75, .35, '#e0eef8');
    return finish(pb, { n: 120, seed: 16 });
  },
  function () { // 총소리
    const pb = forest({ seed: 13, mid: false });
    AB.over(pb, AB.layer(IW, IH, R => AB.leaves(R, 208, 104, 28, 15, TF(KF.fern, .1), 3, { g: 'bush', n: 8 })));
    pb.poly([[198, 99], [199, 93], [203, 98]], '#978672'); pb.poly([[207, 98], [210, 93], [211, 99]], '#978672');
    pb.rect(200, 100, 2, 2, '#b8d860'); pb.rect(207, 100, 2, 2, '#b8d860'); pb.px(201, 100, '#141010'); pb.px(208, 100, '#141010');
    for (let i = 0; i < 9; i++) { const x = 74 + i * 13, y = 119 - i * 1.4 + (i % 2) * 3; pb.ellipse(x, y, 2, 1.2, '#26302a'); pb.ellipse(x + 3, y + 1, 2, 1.2, '#26302a'); }
    for (let i = 0; i < 3; i++) pb.line(64, 106 + i * 3, 80, 106 + i * 3, '#e8eef4');
    AB.put(pb, AB.hero(.3, 0, { cat: false }), 44, 116);
    const tx = 44 + 14 * 1.08 * .3, ty = 116 - 130 * 1.08 * .3;
    for (let i = 0; i < 4; i++) pb.ellipse(tx + 4 + i * 4, ty - 2 - i * 3, 2.6 + i, 2 + i * .6, mix('#a2b3ae', '#f4f4f4', .6 - i * .1));
    star4(pb, Math.round(tx + 1), Math.round(ty), '#fff4c0', true);
    return finish(pb, { n: 120, seed: 17 });
  },
  () => potPanel(false),
  () => potPanel(true),
  function () { // 텐트와 밥
    const src = AB.tentOut(), pb = new PB(IW, IH);
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) pb.d[y * IW + x] = src.d[(y + 12) * 240 + x];
    AB.over(pb, AB.layer(IW, IH, R => {
      fireRig(R, 72, 110, 1.3);
      R.K2(58, 100, 86, 96, .5, .5, ['#5a3e28', '#7a5a38'], { g: 'sk' });
      [[65, 99], [71, 98.2], [77, 97.4]].forEach(([x, y], i) => R.E(x, y, 2.2, 1.6, -.15, ['#7a4020', '#b0682e', '#d8944a'], { g: 'm' + i, ol: 1 }));
      R.E(94, 112, 4.4, 2, 0, TF('#8a6a44'), { g: 'bk', ol: 1 }); R.E(92, 109.6, 1.6, 1.2, 0, ['#c8b090', '#e8d8b8'], { g: 'ms1', ol: 1 }); R.E(96, 109.4, 1.4, 1.1, 0, ['#a87a5a', '#d0a07a'], { g: 'ms2', ol: 1 });
    }));
    AB.glow(pb, 72, 104, 18, '#ffc070', .45);
    AB.put(pb, AB.hero(.3, 0, { cat: false }), 40, 112);
    grain(pb, .03, 30);
    return pb;
  },
  function () { // 다시 걷기
    const pb = forest({ seed: 21, gy: 100 });
    AB.over(pb, AB.layer(IW, IH, R => R.P([[114, 100], [124, 100], [168, IH], [76, IH]], TF(KF.path), R.pat({ g: 'path', flat: 1, alts: [TF('#6a624c')], alt: (x, y) => (vnoise(x * .12, y * .3, 8) > .62 ? 0 : -1) })), AB_FAR));
    AB.glow(pb, 119, 92, 32, '#f6f2dc', .5);
    AB.put(pb, AB.hero(.3, 0, { view: 'pack' }), 118, 124);
    catAt2(pb, catBackHi, {}, .78, 134, 126);
    AB.over(pb, AB.layer(IW, IH, R => { AB.fern(R, 20, 138, 30, TF(KF.fern, .12), 2); AB.fern(R, 222, 138, 34, TF(KF.fern, .12), 4); }));
    return finish(pb, { n: 140, seed: 18 });
  },
];
function potPanel(intact) {
  const pb = forest({ seed: intact ? 17 : 15, mid: false });
  pb.ellipse(58, 114, 28, 5, '#6a8288'); pb.ellipse(54, 113, 15, 1.4, '#a8c0c8');
  AB.over(pb, AB.layer(IW, IH, R => {
    potRig(R, 58, 114, 2, { dent: !intact });
    R.K2(150, 117, 166, 70, .9, .8, TF('#5a3e28'), { g: 'st1', ol: 1 }); R.K2(196, 117, 180, 70, .9, .8, TF('#5a3e28'), { g: 'st2', ol: 1 });
    R.K2(158, 73, 188, 73, .8, .8, TF('#5a3e28'), { g: 'bar', ol: 1 });
    R.DL(173, 73, 173, 90, '#2a2018');
    fireRig(R, 173, 117, 1.5);
    potRig(R, 173, 102, 1.3, { dent: !intact });
  }));
  AB.glow(pb, 173, 107, 18, '#ffc070', .45);
  for (let i = 0; i < 3; i++) { const x0 = 168 + i * 5; for (let y = 88; y > 60; y -= 2) pb.tint(x0 + Math.sin(y * .3 + i) * 2, y, .5 * (y - 58) / 30, '#f0f4f8'); }
  const r = RNG(intact ? 4 : 5);
  if (intact) {
    for (let i = 0; i < 16; i++) { const x = 156 + r() * 34, y = 52 + r() * 38; pb.tint(x, y, .8, '#fff2b0'); if (i % 4 === 0) star4(pb, Math.round(x), Math.round(y), '#fff6c8'); }
    AB.glow(pb, 173, 96, 14, '#fff0c0', .35); AB.spark(pb, 66, 98, '#fffbe0', true);
  } else {
    for (let i = 0; i < 7; i++) { const x = 164 + r() * 18, y = 106 + r() * 10; pb.poly([[x, y], [x + 2, y + 1], [x + 1, y + 3]], '#7a7468'); }
    for (let i = 0; i < 10; i++) pb.tint(160 + r() * 26, 96 + r() * 20, .5, '#c8c0b0');
  }
  AB.rings(pb, 10, 7, [30, 110, 56, 8], '#e0ecf2', .45);
  finish(pb, { n: 90, seed: intact ? 19 : 18 });
  pb.rect(118, 0, 2, IH, '#1a2028');
  pb.poly([[114, 62], [124, 67], [114, 72]], '#f4f0e6');
  return pb;
}
AB.intro = i => PANELS[i]();
