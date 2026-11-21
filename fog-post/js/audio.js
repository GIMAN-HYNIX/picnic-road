'use strict';
/* =========================================================
   소리: 전부 코드로 만든 소리 (라이선스 걱정 없음)
   ========================================================= */
const AU = { ac: null, bus: null, lp: null, mus: null, muted: false, started: false };
function auInit() {
  if (AU.ac) { if (AU.ac.state === 'suspended') AU.ac.resume(); return; }
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    AU.ac = ac; AU.lp = ac.createBiquadFilter(); AU.lp.type = 'lowpass'; AU.lp.frequency.value = 16000;
    AU.bus = ac.createGain(); AU.bus.gain.value = .5; AU.bus.connect(AU.lp); AU.lp.connect(ac.destination);
    AU.mus = ac.createGain(); AU.mus.gain.value = .5; AU.mus.connect(AU.lp);
    startMusic(); startAmbience();
  } catch (e) { AU.ac = null; }
}
function tone(f, d, type = 'sine', v = .15, slide = 0, delay = 0, out) {
  const ac = AU.ac; if (!ac || AU.muted) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .012); g.gain.exponentialRampToValueAtTime(.0008, t + d);
  o.connect(g); g.connect(out || AU.bus); o.start(t); o.stop(t + d + .05);
}
function noise(d, v, freq, type = 'lowpass', q = .7, delay = 0) {
  const ac = AU.ac; if (!ac || AU.muted) return;
  const t = ac.currentTime + delay, n = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, n, ac.sampleRate), a = b.getChannelData(0);
  for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain(); g.gain.value = v; s.connect(f); f.connect(g); g.connect(AU.bus); s.start(t);
}
let _stepAlt = 0;
const SFX = {
  step() { _stepAlt ^= 1; noise(.045, .04, _stepAlt ? 2100 : 1700, 'bandpass', 1.4); },
  jump() { tone(340, .14, 'triangle', .1, 240); },
  land() { noise(.08, .09, 650); },
  slide() { noise(.55, .07, 2600, 'bandpass', .8); tone(300, .25, 'triangle', .04, -120); },
  splash(b = 1) { noise(.38, .2 * b, 1300); tone(200, .16, 'sine', .05 * b, -80); },
  leap() { noise(.3, .13, 2000, 'bandpass', .6); tone(430, .2, 'triangle', .07, 380); },
  bubble() { tone(520 + Math.random() * 520, .07, 'sine', .035, 520); },
  valve() { tone(660, .45, 'sine', .12); tone(990, .6, 'sine', .09, 0, .08); tone(1320, .8, 'sine', .06, 0, .16); noise(.3, .06, 3000, 'bandpass', 4); },
  shutter() { for (let i = 0; i < 9; i++) noise(.06, .07, 900 + i * 40, 'bandpass', 3, i * .11); tone(70, 1.1, 'sawtooth', .04, -20); },
  stamp() { tone(880, .14, 'triangle', .09); tone(1320, .22, 'triangle', .07, 0, .07); tone(1760, .3, 'sine', .05, 0, .14); },
  fog() { noise(.8, .09, 800, 'bandpass', .5); },
  hurt() { noise(.55, .14, 500); tone(220, .45, 'sine', .08, -130); },
  check() { tone(523, .18, 'triangle', .09); tone(784, .32, 'triangle', .09, 0, .1); },
  bell() { tone(988, .9, 'sine', .11); tone(784, 1.2, 'sine', .11, 0, .42); },
  clunk() { noise(.1, .2, 380); tone(140, .16, 'square', .06, -40); },
  quack() { tone(560, .07, 'square', .05, -200); tone(500, .09, 'square', .05, -220, .1); },
  coo() { tone(300, .18, 'sine', .07, -40); tone(270, .26, 'sine', .07, -30, .2); },
  flap() { for (let i = 0; i < 4; i++) noise(.05, .06, 1500, 'bandpass', 1.2, i * .07); },
  meow() { tone(620, .35, 'triangle', .06, 260); tone(880, .3, 'triangle', .05, -380, .18); },
  puddle() { noise(.12, .08, 2400, 'bandpass', 1.5); },
  talk() { tone(380 + Math.random() * 160, .045, 'square', .025); },
  runStep() { _stepAlt ^= 1; noise(.035, .035, _stepAlt ? 2400 : 2000, 'bandpass', 1.6); noise(.03, .025, 2200, 'bandpass', 1.6, .06); },
  skid() { noise(.32, .09, 3200, 'bandpass', 1.2); tone(520, .25, 'triangle', .03, -260); },
  grab() { tone(260, .08, 'triangle', .07, 60); tone(330, .12, 'triangle', .06, 80, .2); noise(.06, .06, 900, 'lowpass', .7, .2); },
  shake() { for (let i = 0; i < 8; i++) noise(.05, .05, 1800 + (i % 2) * 600, 'bandpass', 1.5, i * .08); },
  bump() { noise(.08, .1, 600); tone(180, .12, 'square', .04, -60); },
  yay() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .35, 'triangle', .08, 0, i * .09)); },
};
/* 오르골 음악: C - Am - F - G 진행 위 5음계 */
const CH = [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]];
const PENTA = [523.3, 587.3, 659.3, 784, 880, 1046.5];
let _mi = 2, _beat = 0;
function startMusic() {
  setInterval(() => {
    if (!AU.ac || AU.muted || !AU.started) return;
    const bar = Math.floor(_beat / 8) % 4, b = _beat % 8, ch = CH[bar];
    if (b === 0) { ch.forEach((f, i) => tone(f / 2, 2.8, 'sine', .045, 0, i * .02, AU.mus)); tone(ch[0] / 4, 2.8, 'triangle', .05, 0, 0, AU.mus); }
    if (b % 2 === 0 || Math.random() < .35) {
      _mi = clamp(_mi + pick([-2, -1, -1, 0, 1, 1, 2]), 0, PENTA.length - 1);
      const f = (b === 0 && Math.random() < .5) ? ch[2] * 2 : PENTA[_mi];
      tone(f, 1.3, 'triangle', .04, 0, 0, AU.mus); tone(f * 2, .4, 'sine', .012, 0, 0, AU.mus);
    }
    _beat++;
  }, 340);
}
/* 아침 새소리와 먼 도시 소리 */
function startAmbience() {
  setInterval(() => {
    if (!AU.ac || AU.muted || !AU.started) return;
    if (Math.random() < .5) { const f = 2400 + Math.random() * 1400, n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) tone(f + Math.random() * 300, .06, 'sine', .018, 600, i * .09); }
    if (Math.random() < .2) noise(1.6, .02, 220, 'lowpass');
  }, 1900);
}
function setUnderwater(on) { if (AU.lp && AU.ac) AU.lp.frequency.setTargetAtTime(on ? 600 : 16000, AU.ac.currentTime, .06); }
