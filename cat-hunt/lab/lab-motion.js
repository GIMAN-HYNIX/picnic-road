'use strict';
/* =========================================================
   칼질 실험실 · 움직임
   같은 열쇠 자세(안무)를 여러 방식으로 풀어 봄
     A 뼈대 곡선     열쇠 자세를 부드러운 곡선으로 잇고, 몸 → 가슴 → 손 → 칼날 순서로 조금씩 늦게 따라오게 함
     B 손그림식      고른 장면만 뚝뚝 끊어 보여 주고(1초 12~15장), 베는 순간은 칼 잔상 한 장으로 건너뜀
     C 스프링        목표 자세를 던져 주고 용수철로 따라가게 함. 칼날이 출렁이며 지나쳤다 돌아옴
     D 섞기          A의 곡선 + 베는 구간 압축 + 맞는 순간 멈춤 + 흔들림
   시간 단위는 1/60초 (프레임)
   ========================================================= */
// 열쇠값 사이를 잇는 곡선 (단조 3차: 열쇠값을 넘어 튀지 않고, 꺾이는 곳에서만 속도가 0)
function wCurve(keys) {
  const n = keys.length, t = keys.map(k => k[0]), v = keys.map(k => k[1]), m = new Array(n).fill(0);
  if (n > 2) {
    const d = []; for (let i = 0; i < n - 1; i++) d[i] = (v[i + 1] - v[i]) / (t[i + 1] - t[i]);
    for (let i = 1; i < n - 1; i++) if (d[i - 1] * d[i] > 0) { const h0 = t[i] - t[i - 1], h1 = t[i + 1] - t[i], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
  }
  return x => {
    if (x <= t[0]) return v[0]; if (x >= t[n - 1]) return v[n - 1];
    let i = 0; while (x > t[i + 1]) i++;
    const h = t[i + 1] - t[i], s = (x - t[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * v[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * v[i + 1] + (s3 - s2) * h * m[i + 1];
  };
}
// [[시간, {채널: 값}], ...] → 채널마다 곡선. 열쇠에 없는 채널은 앞뒤 열쇠 사이를 그냥 이어 감
function wTrack(keys) {
  const T = {};
  for (const ch of W_CH) { const ks = []; for (const [t, o] of keys) if (o[ch] !== undefined) ks.push([t, o[ch]]); if (!ks.length) ks.push([0, W_GUARD[ch]]); T[ch] = wCurve(ks); }
  T.keys = keys; T.end = keys[keys.length - 1][0];
  return T;
}
const W_LAG = { lean: .5, bend: .8, cy: 1, head: .3, gx: 1.2, gy: 1.2, el: 1.2, a: 2, bl: 2, ed: 1.5 };   // 몸통 뒤에 따라오는 정도 (프레임)
function wPoseAt(T, t, lag) { const p = {}; for (const ch of W_CH) p[ch] = T[ch](t - (lag ? (W_LAG[ch] || 0) * lag : 0)); if (Math.abs(p.bl) < .12) p.bl = p.bl < 0 ? -.12 : .12; return p; }

/* ---------- 안무 1 · 기본: 내려베기 → 올려베기 → 뛰어올라 내려찍기 ---------- */
const G0 = W_GUARD;
const KEYS_S = [
  [0, G0],
  // 1타: 칼을 오른 어깨에 멨다가 한 발 내디디며 내려벰
  [10, { hx: -2.5, hy: -24.2, lean: -.04, bend: -.16, pyaw: .3, cy: .6, head: .08, nx: 6, ny: -3.4, na: -.2, fx: -6, fy: -2.2, fa: .12, gx: -5.5, gy: -7, a: -2.3, el: .5 }],
  [12, { hx: -2.6, lean: -.06, gx: -6, gy: -7.6, a: -2.45, ny: -3.6 }],
  [14, { hx: 0, hy: -24, lean: .05, bend: -.04, cy: .25, nx: 10, ny: -4, na: -.25, gx: 4, gy: -10, a: -2.1 }],
  [16, { hx: 3.5, hy: -23, lean: .2, bend: .12, cy: -.3, pyaw: -.15, nx: 13.5, ny: -2.2, na: 0, gx: 12.5, gy: -2, a: -.25, el: 0 }],
  [18, { hx: 5, hy: -22.4, lean: .3, bend: .22, cy: -.5, pyaw: -.2, head: .12, fa: .5, fy: -2.8, gx: 10.5, gy: 9.5, a: 1 }],
  [22, { hy: -22.8, lean: .26, bend: .18, gy: 8.5, a: .9, ed: 1, fx: -6 }],
  // 2타: 칼을 오른 허리 뒤로 끌었다가 올려벰
  [27, { fy: -3.8, ed: -1 }],
  [31, { hx: 5.5, hy: -22.4, lean: .22, bend: .12, pyaw: .2, cy: .55, head: .1, fx: 1.5, fy: -2.2, fa: 0, gx: -3.5, gy: 10.5, a: 2.7, nx: 13.5, ny: -2.2 }],
  [33, { a: 2.8, gx: -3.8 }],
  [35, { hx: 7.5, cy: .2, nx: 15.5, ny: -3.2, gx: 6, gy: 9, a: 2.3 }],
  [37, { hx: 9.5, hy: -23.5, lean: .16, bend: 0, cy: -.2, nx: 19, ny: -2.6, gx: 12.5, gy: 1.5, a: .4 }],
  [39, { hx: 11, hy: -25.8, lean: .06, bend: -.12, cy: -.35, pyaw: -.15, head: -.08, nx: 19.5, ny: -2.2, fa: .45, fy: -2.7, gx: 9, gy: -9.5, a: -1.15 }],
  [43, { hy: -25.4, gx: 7.5, gy: -10.5, a: -1.35, ed: -1, fx: 1.5 }],
  // 3타: 웅크렸다 뛰어올라 온몸으로 내려찍음
  [49, { ed: 1, fy: -3.6 }],
  [52, { hx: 11.5, hy: -21.5, lean: .18, bend: .05, pyaw: .25, cy: .5, head: .1, fx: 6, fy: -2.2, fa: 0, gx: -3, gy: -6, a: -2.8, el: .5, nx: 19.5, ny: -2.2, na: 0, sq: -.05 }],
  [55, { hx: 14, hy: -24.5, lean: .05, bend: -.12, gx: -5, gy: -7.5, a: -3.1, na: .5, fa: .6, fx: 6, fy: -2.2, sq: .04 }],
  [60, { hx: 19.5, hy: -36.5, lean: -.1, bend: -.28, cy: .65, gx: -6, gy: -8, a: -3.6, nx: 24, ny: -16, na: -.2, fx: 10.5, fy: -14, fa: .9, sq: .05 }],
  [63, { hx: 22.5, hy: -31, lean: .12, bend: -.02, cy: .2, gx: 5, gy: -10, a: -2.3, nx: 29.5, ny: -8, na: -.35, fx: 12, fy: -9 }],
  [65, { hx: 25, hy: -20.5, lean: .44, bend: .3, pyaw: -.25, cy: -.5, head: .15, gx: 11.5, gy: 9, a: .95, el: 0, nx: 33, ny: -2.2, na: 0, fx: 13, fy: -2.6, fa: .6, sq: -.06 }],
  [72, { hy: -20, a: .98, gy: 9.4, sq: 0, hx: 25.3 }],
  [84, { hx: 26.5, hy: -22.8, lean: .26, bend: .14, cy: -.1, gx: 10, gy: 8, a: .3, fx: 17, fy: -3.4, fa: .3 }],
  [98, Object.assign({}, G0, { hx: 27, nx: 34, fx: 21 })],
  [112, Object.assign({}, G0, { hx: 27, nx: 34, fx: 21 })],
];
const HITS_S = [{ name: '내려베기', cuts: [0, 11, 14, 16, 18, 23] }, { name: '올려베기', cuts: [27, 32, 35, 37, 39, 44] }, { name: '뛰어올라 내려찍기', cuts: [52, 57, 61, 64, 66, 86] }];

/* ---------- 안무 2 · 발 바꿔 딛기: 걸음마다 발을 바꿔 디디며 내려베기 → 올려베기 → 찌르기 (실제 긴칼 검술의 발놀림) ---------- */
const GE = Object.assign({}, G0, { hy: -25.4, lean: .06, bend: -.02, pyaw: .3, cy: .5, nx: -6.5, fx: 6.5, fa: 0, na: .1, gx: -1, gy: -2, a: -2, el: .2, head: .04 });
const KEYS_E = [
  [0, GE],
  [7, { hx: -1, lean: 0, bend: -.1, cy: .62, a: -2.3, gy: -2.8, nx: -6.5, ny: -2.2, na: .1, hy: -25 }],
  [10, { hx: 2.5, nx: -3, ny: -4.6, na: .5, gx: 2, gy: -7, a: -2.35, lean: .06, bend: -.06, cy: .4, pyaw: .15 }],
  [13, { hx: 6, hy: -24.6, nx: 8, ny: -4.4, na: -.25, gx: 9, gy: -7, a: -1.5, lean: .14, bend: .04, cy: 0, pyaw: -.1, fa: .2 }],
  [15, { hx: 8, hy: -23.4, nx: 15, ny: -2.4, na: -.2, gx: 13, gy: -1, a: -.15, lean: .2, bend: .12, cy: -.35, pyaw: -.3, el: 0, head: .08 }],
  [17, { hx: 9.5, hy: -22.8, nx: 16, ny: -2.2, na: 0, gx: 10.5, gy: 9.5, a: 1.02, lean: .26, bend: .2, cy: -.5, fa: .55, fy: -3, fx: 6.5 }],
  [22, { hy: -23.2, lean: .22, bend: .15, gy: 8.6, a: .9, ed: 1 }],
  // 2타: 왼발이 지나 나가며 올려벰
  [27, { ed: -1, gx: 2, gy: 11, a: 1.9, cy: -.1 }],
  [31, { hx: 11, hy: -23, lean: .2, bend: .1, cy: .45, pyaw: -.15, gx: -3, gy: 10.5, a: 2.65, fx: 8.5, fy: -4.6, fa: .6, nx: 16, na: 0, head: .1 }],
  [34, { hx: 15, hy: -24.4, fx: 19, fy: -4.6, fa: -.2, gx: 5, gy: 9, a: 2.3, cy: .25, pyaw: .1, lean: .16, na: .25 }],
  [36, { hx: 18.5, hy: -24, fx: 27.5, fy: -2.5, fa: -.2, gx: 12.5, gy: 1.5, a: .4, cy: -.1, pyaw: .25, lean: .12, bend: 0 }],
  [38, { hx: 20.5, hy: -25.6, fx: 28.5, fy: -2.2, fa: 0, gx: 9, gy: -9.5, a: -1.15, cy: -.3, pyaw: .3, lean: .05, bend: -.12, head: -.08, na: .55, ny: -3 }],
  [43, { hy: -25.2, gx: 7.5, gy: -10.4, a: -1.32, ed: -1, nx: 16 }],
  // 3타: 칼을 가슴 옆으로 당겼다가 오른발을 길게 내디디며 찌름
  [48, { ed: 1, gy: -4, a: -.9 }],
  [54, { hx: 20, hy: -23.4, lean: .12, bend: .04, cy: .7, pyaw: .35, head: .06, gx: -1.5, gy: 4.5, a: -.12, el: -.3, nx: 17.5, ny: -4.4, na: .55, fx: 28.5, fy: -2.2, fa: 0 }],
  [57, { hx: 21.5, gx: -2.4, a: -.1, nx: 22, ny: -5, na: .2 }],
  [60, { hx: 29, hy: -23, nx: 36, ny: -4.4, na: -.3, gx: 8, gy: 3, cy: .1, pyaw: 0, lean: .25, bend: .08, fa: .3 }],
  [62, { hx: 34.5, hy: -21.6, nx: 43.5, ny: -2.2, na: 0, gx: 15.4, gy: 1.6, a: .02, cy: -.65, pyaw: -.35, lean: .4, bend: .12, head: 0, el: 0, fa: .7, fy: -3.2, fx: 28.5 }],
  [68, { hx: 35, hy: -21.3, gx: 15.6, a: .03 }],
  [80, { hx: 34.5, hy: -23.4, lean: .2, bend: .06, cy: -.2, gx: 10.5, gy: 6, a: -.3, fx: 30, fy: -3.6, fa: .3 }],
  [94, Object.assign({}, G0, { hx: 36.5, nx: 43.5, fx: 30.5 })],
  [108, Object.assign({}, G0, { hx: 36.5, nx: 43.5, fx: 30.5 })],
];
const HITS_E = [{ name: '오른발 내디디며 내려베기', cuts: [0, 8, 12, 15, 18, 23] }, { name: '왼발 내디디며 올려베기', cuts: [28, 32, 35, 37, 39, 44] }, { name: '길게 내디디며 찌르기', cuts: [50, 56, 60, 63, 66, 82] }];

/* ---------- 안무 3 · 가로로 휩쓸기: 가로베기 → 되돌려 가로베기 → 웅크렸다 돌진 찌르기 ----------
   옆에서 보면 가로베기는 칼이 '짧아졌다 길어지는' 것으로 보임 (bl: 칼이 보이는 길이, 음수면 뒤를 향함) */
const KEYS_F = [
  [0, G0],
  [8, { hx: -3, hy: -23.6, lean: -.02, bend: -.08, pyaw: .5, cy: .95, head: .1, gx: -5, gy: 1.5, a: .12, bl: -.95, el: -.2, nx: 6.5, ny: -3.2, na: -.2 }],
  [11, { hx: -3.2, cy: 1, gx: -5.5, bl: -1 }],
  [13, { hx: 1, hy: -22.6, cy: .4, pyaw: .2, gx: 3, gy: 5, a: .05, bl: -.12, nx: 12, ny: -3.4, lean: .12, bend: .05 }],
  [15, { hx: 5, hy: -22, cy: -.5, pyaw: -.3, gx: 11.5, gy: 3.5, a: -.06, bl: 1, nx: 15, ny: -2.2, na: 0, lean: .24, bend: .1, el: 0 }],
  [17, { hx: 6, hy: -21.8, cy: -.95, pyaw: -.45, gx: 9, gy: 1, a: -.22, bl: .5, lean: .26, bend: .12, fa: .5, fy: -2.8 }],
  [21, { cy: -1, gx: 8, gy: .5, a: -.3, bl: .3, hy: -22.2 }],
  // 2타: 몸을 되돌리며 반대로
  [26, { hx: 6.5, cy: -1, bl: .28, a: -.3, gx: 7.5, fx: -6 }],
  [28, { fy: -3.8 }],
  [30, { hx: 9.5, hy: -22, cy: -.3, pyaw: 0, gx: 11.5, gy: 4, a: -.05, bl: 1, lean: .2, nx: 19, ny: -3, fx: 0, fy: -2.6, fa: .2 }],
  [32, { hx: 12, hy: -22.6, cy: .5, pyaw: .35, gx: 4, gy: 5.5, a: .06, bl: -.1, nx: 21, ny: -2.2, lean: .14, bend: 0 }],
  [34, { hx: 13, hy: -23.4, cy: .95, pyaw: .5, gx: -4.5, gy: 2.5, a: .2, bl: -.9, lean: .04, bend: -.08, head: .08, fx: 3, fy: -2.2, fa: 0 }],
  [38, { cy: 1, gx: -5.5, a: .3, bl: -1, hy: -23.2 }],
  // 3타: 낮게 웅크렸다 돌진 찌르기
  [43, { bl: -.4, a: .5, gx: -3, gy: 6 }],
  [49, { hx: 10.5, hy: -19.6, lean: .34, bend: .1, cy: .8, pyaw: .4, head: .16, gx: -2, gy: 7, a: -.06, bl: 1, el: -.3, nx: 21, ny: -2.2, na: 0, fx: 2, fy: -2.2, fa: 0, sq: -.07 }],
  [54, { hx: 10, hy: -19.2, gx: -3, lean: .36, sq: -.09, nx: 21, fx: 2 }],
  [56, { hx: 19, hy: -21, nx: 31, ny: -4, na: -.2, fx: 6, fy: -3, fa: .7, gx: 6, gy: 4, cy: .2, lean: .5, sq: .1 }],
  [58, { hx: 33, hy: -20.6, nx: 43.5, ny: -2.2, na: 0, fx: 24, fy: -3.4, fa: .8, gx: 15.6, gy: 1.2, a: .01, cy: -.75, pyaw: -.4, lean: .5, bend: .1, head: -.02, el: 0, sq: .06 }],
  [60, { hx: 35, hy: -20.4, fx: 26.5, sq: 0, gx: 15.8 }],
  [68, { hx: 35.4, hy: -20.6, fx: 27.5 }],
  [80, { hx: 35, hy: -23.2, lean: .2, bend: .06, cy: -.2, gx: 10.5, gy: 6, a: -.3, fx: 29.5, fy: -3.4, fa: .3 }],
  [94, Object.assign({}, G0, { hx: 36.5, nx: 43.5, fx: 30.5 })],
  [108, Object.assign({}, G0, { hx: 36.5, nx: 43.5, fx: 30.5 })],
];
const HITS_F = [{ name: '가로베기', cuts: [0, 9, 13, 15, 17, 22] }, { name: '되돌려 가로베기', cuts: [26, 29, 31, 33, 35, 39] }, { name: '웅크렸다 돌진 찌르기', cuts: [45, 52, 56, 58, 61, 82] }];

/* ---------- 방식 ---------- */
const TR_S = wTrack(KEYS_S), TR_E = wTrack(KEYS_E), TR_F = wTrack(KEYS_F);
const VARIANTS = [];
const stretch = (cuts, warp) => cuts.map(c => { let best = 0, bd = 1e9; for (let f = 0; f < 400; f++) { const d = Math.abs(warp(f) - c); if (d < bd) { bd = d; best = f; } } return best; });

// A · 뼈대 곡선 (1초 60장, 몸 → 칼 순서로 따라옴)
function mkSmooth(id, T, hits, lag) {
  const samp = t => wPoseAt(T, t, lag);
  return { id, N: T.end, hits, pose: samp, smearAt: f => ({ samp, t: f, tau: 1.25 }) };
}
// B · 손그림식: [원본 시각, 머무는 프레임 수, 과장 덧칠, 잔상 길이]
function mkStepped(id, T, list, hits) {
  const start = []; let n = 0; for (const e of list) { start.push(n); n += e[1]; }
  const idx = f => { let i = 0; while (i + 1 < list.length && start[i + 1] <= f) i++; return i; };
  const base = t => wPoseAt(T, t, 0), poseOf = i => Object.assign(base(list[i][0]), list[i][2] || {});
  // 잔상은 앞 장면에서 이 장면까지 건너뛴 구간 전체
  const smSamp = i => t => { const a = list[i][0] - list[i][3], k = clamp((t - a) / (list[i][3] || 1), 0, 1), p = base(t), q = list[i][2]; if (q) for (const ch in q) p[ch] += (q[ch] - base(list[i][0])[ch]) * k; return p; };
  const srcToF = c => { let best = 0, bd = 1e9; list.forEach((e, i) => { const d = Math.abs(e[0] - c); if (d < bd) { bd = d; best = start[i]; } }); return best; };
  return {
    id, N: n, stepped: true, pose: f => poseOf(idx(f)), snap: f => start[idx(f)],
    clothAt: f => { const i = idx(f), s = start[i], len = list[i][1], k = Math.floor((f - s) / 4); return Math.min(s + len - 1, s + k * 4 + 3); },
    smearAt: f => { const i = idx(f); return list[i][3] ? { samp: smSamp(i), t: list[i][0], tau: list[i][3] } : null; },
    hits: hits.map(h => ({ name: h.name, cuts: h.cuts.map(srcToF) })),
  };
}
// C · 스프링: 목표 자세를 순서대로 던지고 용수철이 따라감. 발과 앞으로 나가는 거리는 곡선 그대로(발이 미끄러지지 않게)
const SPR = { hy: [30, .8], lean: [28, .72], bend: [28, .7], pyaw: [30, .8], cy: [32, .68], head: [30, .9], gx: [40, .6], gy: [40, .6], a: [36, .5], bl: [40, 1], ed: [44, 1], el: [40, 1], sq: [30, .5] };
function mkSpring(id, T, cmds, hits, N, shift) {
  const st = {}, poses = [], P0 = wPoseAt(T, 0, 0);
  for (const ch in SPR) st[ch] = { x: P0[ch], v: 0 };
  let ci = 0, tgt = P0;
  for (let f = 0; f < N; f++) {
    while (ci < cmds.length && cmds[ci][0] <= f) { tgt = wPoseAt(T, cmds[ci][1], 0); ci++; }
    for (let s = 0; s < 4; s++) for (const ch in SPR) { const [w, z] = SPR[ch], q = st[ch]; q.v += (-w * w * (q.x - tgt[ch]) - 2 * z * w * q.v) / 240; q.x += q.v / 240; }
    const p = wPoseAt(T, f + shift, 0); for (const ch in SPR) p[ch] = st[ch].x;
    if (Math.abs(p.bl) < .12) p.bl = p.bl < 0 ? -.12 : .12;
    poses.push(p);
  }
  const samp = t => { const i = clamp(t, 0, N - 1), a = Math.floor(i), b = Math.min(N - 1, a + 1), k = i - a, p = {}; for (const ch of W_CH) p[ch] = lerp(poses[a][ch], poses[b][ch], k); return p; };
  return { id, N, hits: hits.map(h => ({ name: h.name, cuts: h.cuts.map(c => Math.round(c - shift + 2)) })), pose: samp, smearAt: f => ({ samp, t: f, tau: 1.25 }) };
}
// D · 섞기: 곡선 + 시간 비틀기(베는 구간은 두세 장으로 압축, 맞는 순간 잠깐 멈춤) + 멈춘 뒤 잔떨림
function mkWarp(id, T, warp, hits, hitsAt, lag) {
  const N = warp[warp.length - 1][0];
  const w = f => { if (f <= warp[0][0]) return warp[0][1]; for (let i = 0; i < warp.length - 1; i++) if (f <= warp[i + 1][0]) return lerp(warp[i][1], warp[i + 1][1], (f - warp[i][0]) / (warp[i + 1][0] - warp[i][0])); return warp[warp.length - 1][1]; };
  const samp = f => {
    const p = wPoseAt(T, w(f), lag);
    for (const [hf, amp] of hitsAt) { const d = f - hf; if (d > 0 && d < 22) { const e = Math.exp(-d * .22) * amp; p.a += Math.sin(d * 1.15) * .1 * e; p.lean += Math.sin(d * .9 + 1) * .035 * e; p.hy += Math.sin(d * 1.3) * .5 * e; p.head += Math.sin(d * 1.05) * .05 * e; } }
    return p;
  };
  return { id, N, hits: hits.map(h => ({ name: h.name, cuts: stretch(h.cuts.map(c => c + lag * 1.2), w) })), pose: samp, smearAt: f => ({ samp, t: f, tau: w(f) - w(f - 1) > 1.6 ? 1 : 1.25 }) };
}

VARIANTS.push(mkSmooth('A', TR_S, HITS_S, 1));
VARIANTS.push(mkStepped('B', TR_S, [
  [0, 4], [6, 4], [10, 5], [12, 5, { lean: -.12, a: -2.5, gy: -3.4, hy: -23.8 }], [15.2, 3, { sq: .05 }, 3.2], [17, 3, null, 1.8], [18, 5, { a: 1.18, hy: -21.6, lean: .34 }], [22, 5],
  [27, 4], [31, 4], [33, 5, { a: 2.95, lean: .28, hy: -21.8 }], [36.2, 3, { sq: .04 }, 3.2], [38.2, 3, null, 2], [39, 5, { a: -1.32, hy: -26.4, bend: -.18 }], [43, 5],
  [49, 4], [52, 6, { hy: -20.4, sq: -.08 }], [55, 3, { sq: .08 }], [58, 3], [60, 5], [61.4, 4, { a: -3.5, bend: -.3 }], [64, 3, { sq: .06 }, 2.6], [65, 3, null, 1], [66, 6, { sq: -.1, hy: -19.6 }], [72, 6], [84, 6], [91, 5], [98, 8],
], HITS_S));
VARIANTS.push(mkSpring('C', TR_S, [[2, 12], [11, 14.5], [13, 18], [25, 33], [33, 36.5], [35, 39], [45, 52], [52, 60], [60, 63.5], [62, 65], [78, 84], [88, 98]], HITS_S, 112, 0));
VARIANTS.push(mkWarp('D', TR_S, [[0, 0], [9, 10], [13, 12.4], [15, 17.6], [19, 18.4], [24, 23], [28, 27], [33, 31], [36, 33.2], [38, 38.6], [42, 39.4], [47, 44], [52, 49], [56, 52.6], [59, 55], [65, 60.4], [68, 61.6], [70, 65.6], [76, 66.6], [81, 72], [93, 84], [107, 98], [118, 112]], HITS_S, [[15, 1], [38, 1], [70, 1.6]], 1));
VARIANTS.push(mkWarp('E', TR_E, [[0, 0], [8, 7], [10, 8.4], [16, 17.4], [20, 18.2], [26, 24], [29, 27], [33, 31], [35, 32.2], [40, 38.6], [44, 39.4], [49, 44], [53, 48], [59, 54], [63, 57], [67, 62.6], [73, 64], [77, 68], [89, 80], [103, 94], [114, 108]], HITS_E, [[16, .8], [40, .8], [67, 1.2]], 1));
VARIANTS.push(mkStepped('F', TR_F, [
  [0, 4], [5, 4], [8, 5], [11, 5, { cy: 1.05, hy: -23.2, lean: -.06 }], [13.6, 3, { sq: .04 }, 2.6], [15.6, 3, null, 2], [17, 5, { hy: -21.4 }], [21, 5],
  [26, 4], [28, 3], [30.4, 3, { sq: .04 }, 4.4], [32.6, 3, null, 2.2], [34, 5, { lean: 0 }], [38, 5],
  [43, 4], [49, 5], [54, 7, { sq: -.11, hy: -18.8 }], [56.6, 3, { sq: .12 }, 1.6], [58, 3, { sq: .1 }, 1.4], [60, 6, { sq: -.03 }], [68, 6], [80, 6], [87, 5], [94, 8],
], HITS_F));

/* ---------- 굽기: 자세 → 관절 + 우비 자락 + 흔들리는 것들 + 칼 잔상 ---------- */
function wSpring(s, target, k, c, dt) { const a = -k * (s.x - target) - c * s.v; s.v += a * dt; s.x += s.v * dt; }
function wBake(V, bodyName) {
  const B = W_BODY[bodyName], out = [], dt = 1 / 60;
  let cl = null, prev = null; const hat = { x: 0, v: 0 }, rf = { x: 0, v: 0 }, sh = { x: 0, v: 0 };
  for (let f = -40; f < V.N; f++) {
    const ff = Math.max(0, f), S = wSolve(V.pose(ff), B);
    if (!cl) cl = clInit(S);
    if (prev) {
      const mid = V.stepped ? S : wSolve(V.pose(Math.max(0, f - .5)), B);   // 사이 자세로 한 번 더 밟아 천이 튀지 않게
      clStep(cl, f > 0 ? mid : S, dt / 2); clStep(cl, S, dt / 2);
      const dT = S.tilt - prev.tilt, dA = S.a2 - prev.a2, dvx = S.hip[0] - prev.hip[0], dhx = S.head[0] - prev.head[0];
      hat.x -= dT * .9 + dhx * .012; rf.x -= dA * .5 - dvx * .012; sh.x -= (S.a1 - prev.a1) * .8 + dvx * .05;
      for (let i = 0; i < 2; i++) { wSpring(hat, 0, 900, 26, dt / 2); wSpring(rf, 0, 420, 17, dt / 2); wSpring(sh, 0, 300, 9, dt / 2); }
      hat.x = clamp(hat.x, -.3, .3); rf.x = clamp(rf.x, -.3, .3); sh.x = clamp(sh.x, -.9, .9);
    }
    prev = S;
    if (f < 0) continue;
    const F = { S, cl: clCopy(cl), hat: hat.x, rifle: rf.x, sheath: sh.x, f }, sm = V.smearAt ? V.smearAt(ff) : null;
    if (sm) F.smear = wSmear(sm.samp, B, sm.t, sm.tau);
    out.push(F);
  }
  if (!V.stepped) return out;
  return out.map((F, f) => { const a = out[V.snap(f)], c = out[V.clothAt(f)]; return { S: a.S, smear: a.smear, cl: c.cl, hat: c.hat, rifle: c.rifle, sheath: c.sheath, f }; });
}
// 칼 잔상: 직전 τ프레임 동안 칼끝이 지나간 자리를 초승달 모양으로
function wSmear(samp, B, t, tau) {
  const n = 8, tips = [], inner = [];
  let len = 0;
  for (let i = 0; i <= n; i++) {
    const S = wSolve(samp(Math.max(0, t - tau * (1 - i / n))), B), k = .2 + .55 * (i / n);
    tips.push(S.tip); inner.push([S.G[0] + (S.tip[0] - S.G[0]) * k, S.G[1] + (S.tip[1] - S.G[1]) * k]);
    if (i) len += Math.hypot(tips[i][0] - tips[i - 1][0], tips[i][1] - tips[i - 1][1]);
  }
  let ar = 0; const poly = tips.concat(inner.slice().reverse()); for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; ar += a[0] * b[1] - b[0] * a[1]; }
  if (len < 13 || Math.abs(ar) / 2 < len * 2.2) return null;   // 찌르기처럼 한 줄로 지나가면 잔상 없음
  return { tips, inner, len };
}
