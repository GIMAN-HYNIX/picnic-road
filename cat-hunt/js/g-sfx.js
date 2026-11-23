'use strict';
/* =========================================================
   소리 (모두 코드로 합성)
   빗소리(세기 3단계) · 개울 · 모닥불 · 발소리(풀/흙/물/낙엽) · 칼 · 총(메아리) · 노리쇠
   솔: 야옹 · 짧은 대답 · 가르랑 · 하악 · 으르렁 · 채터링 · 그르렁(골골)
   물그림자: 뽀글 · 덮치기 · 물로 돌아감
   브라우저 정책상 첫 입력 뒤에 시작
   ========================================================= */
const GSFX = (() => {
  let ac = null, out = null, on = true, nb = null, sb = null, rainG, rainF, patG, brookG, fireG, purrG;
  const noise = sec => { const b = ac.createBuffer(1, Math.floor(ac.sampleRate * sec), ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  function loop(buf, type, f, q, rate) { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate || 1; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ac.createGain(); g.gain.value = 0; s.connect(fl).connect(g).connect(out); s.start(); return [g, fl]; }
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    try { ac = new A(); } catch (e) { ac = null; return; }
    out = ac.createGain(); out.gain.value = on ? .7 : 0; out.connect(ac.destination);
    nb = noise(3); sb = noise(.3);
    [rainG, rainF] = loop(nb, 'bandpass', 3200, .4, 1); [patG] = loop(nb, 'lowpass', 520, .5, .7); [brookG] = loop(nb, 'bandpass', 2100, .8, 1.3); [fireG] = loop(nb, 'bandpass', 900, .6, .5);
    [purrG] = loop(nb, 'lowpass', 190, 1.2, .5);
    const lfo = ac.createOscillator(); lfo.type = 'sawtooth'; lfo.frequency.value = 24; const lg = ac.createGain(); lg.gain.value = 0; lfo.connect(lg).connect(purrG.gain); lfo.start(); purrG._lfo = lg;
  }
  const ok = () => ac && on;
  function pan(node, p) { if (ac.createStereoPanner) { const s = ac.createStereoPanner(); s.pan.value = clamp(p || 0, -1, 1); node.connect(s); return s; } return node; }
  function tone(t0, f0, f1, dur, vol, p, type, at) {
    const o = ac.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + (at || .008)); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); pan(g, p).connect(out); o.start(t0); o.stop(t0 + dur + .03);
  }
  function burst(t0, dur, f, q, vol, p, type, rate, f1) {
    const s = ac.createBufferSource(); s.buffer = sb; s.playbackRate.value = rate || 1; s.loop = dur > .28;
    const fl = ac.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(f, t0); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur); fl.Q.value = q || 1;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    s.connect(fl).connect(g); pan(g, p).connect(out); s.start(t0); s.stop(t0 + dur + .02);
  }
  // 목소리: 톱니파를 두 개의 울림통(포먼트)에 통과
  function voice(t0, pts, dur, vol, p, trem) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(pts[0], t0); pts.forEach((f, i) => { if (i) o.frequency.linearRampToValueAtTime(f, t0 + dur * i / (pts.length - 1)); });
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * .18); g.gain.setValueAtTime(vol, t0 + dur * .6); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    const dst = pan(g, p); dst.connect(out);
    for (const [f, q, a] of [[1150, 5, 1], [2700, 7, .5]]) { const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = ac.createGain(); bg.gain.value = a; o.connect(b).connect(bg).connect(g); }
    if (trem) { const l = ac.createOscillator(); l.frequency.value = trem; const lg = ac.createGain(); lg.gain.value = vol * .6; l.connect(lg).connect(g.gain); l.start(t0); l.stop(t0 + dur); }
    o.start(t0); o.stop(t0 + dur + .03);
  }
  const T = () => ac.currentTime + .01;
  const S = {
    init, toggle() { on = !on; if (out) out.gain.setTargetAtTime(on ? .7 : 0, ac.currentTime, .05); return on; }, get on() { return on; },
    rain(v) { if (!ac) return; rainG.gain.setTargetAtTime(.012 + v * .05, ac.currentTime, 1.2); rainF.frequency.setTargetAtTime(2600 + v * 1800, ac.currentTime, 1.2); patG.gain.setTargetAtTime(v * v * .09, ac.currentTime, 1.2); },
    brook(v) { if (ac) brookG.gain.setTargetAtTime(clamp(v, 0, 1) * .05, ac.currentTime, .3); },
    fire(v) { if (ac) fireG.gain.setTargetAtTime(v * .03, ac.currentTime, .4); },
    purr(v) { if (ac) { purrG.gain.setTargetAtTime(v * .05, ac.currentTime, .4); purrG._lfo.gain.setTargetAtTime(v * .04, ac.currentTime, .4); } },
    crackle() { if (ok()) burst(T(), .03, 2400 + Math.random() * 2000, 3, .05, (Math.random() - .5) * .4); },
    step(kind, k = 1) {
      if (!ok()) return; const t = T();
      if (kind === 'water') { burst(t, .16, 1500, .7, .08 * k, 0, 'bandpass', .8 + Math.random() * .3); burst(t + .03, .1, 3400, 1, .03 * k, 0); }
      else if (kind === 'dirt') { burst(t, .08, 480, .9, .07 * k, 0, 'lowpass', .8 + Math.random() * .3); burst(t, .05, 2200, 1.4, .012 * k, 0); }
      else if (kind === 'litter') { burst(t, .09, 1700, .8, .04 * k, 0, 'bandpass', .9 + Math.random() * .3); burst(t, .07, 300, .7, .05 * k, 0, 'lowpass'); }
      else if (kind === 'wood') { burst(t, .07, 800, 1.2, .07 * k, 0, 'lowpass'); tone(t, 180, 130, .07, .04 * k, 0, 'triangle'); }
      else { burst(t, .11, 2400, .6, .028 * k, 0, 'bandpass', 1.1); burst(t, .06, 320, .7, .04 * k, 0, 'lowpass'); }
    },
    paw(k = 1) { if (ok()) burst(T(), .03, 900, 1, .012 * k, 0, 'lowpass'); },
    rustle(v = 1) { if (ok()) { const t = T(); burst(t, .3, 3000 + Math.random() * 1200, .5, .03 * v, (Math.random() - .5) * .3, 'bandpass', .7 + Math.random() * .2); } },
    swish(n = 0) { if (ok()) burst(T(), .13, 1800 + n * 500, 1.6, .09, 0, 'bandpass', 1.4, 5200); },
    slash() { if (ok()) { const t = T(); burst(t, .12, 900, .8, .16, 0, 'bandpass', .9); burst(t, .2, 2600, .7, .07, 0); tone(t, 320, 120, .12, .08, 0, 'triangle'); } },
    dodge() { if (ok()) { const t = T(); burst(t, .2, 700, .7, .06, 0, 'bandpass', .7, 1800); burst(t + .16, .1, 420, .9, .06, 0, 'lowpass'); } },
    shot() {
      if (!ok()) return; const t = T();
      burst(t, .2, 5200, .4, .5, 0, 'lowpass', 1, 380); tone(t, 150, 38, .34, .5, 0, 'sine'); burst(t, .05, 3000, .6, .3, 0, 'highpass');
      for (const [d, v, f] of [[.19, .12, 1400], [.42, .07, 900], [.74, .04, 650], [1.1, .022, 500]]) burst(t + d, .3, f, .5, v, (Math.random() - .5) * 1.2, 'lowpass');
    },
    bolt() { if (ok()) { const t = T(); burst(t, .03, 2600, 4, .09, 0); tone(t, 1300, 900, .03, .04, 0, 'square'); burst(t + .16, .04, 1900, 4, .1, 0); tone(t + .16, 800, 600, .04, .05, 0, 'square'); } },
    dry() { if (ok()) { tone(T(), 1100, 800, .03, .05, 0, 'square'); burst(T(), .02, 3000, 4, .06, 0); } },
    hurt() { if (ok()) { const t = T(); tone(t, 170, 60, .2, .3, 0, 'sine'); burst(t, .12, 600, .8, .14, 0, 'lowpass'); } },
    pick() { if (ok()) { const t = T(); tone(t, 620, 930, .07, .09, 0, 'triangle'); tone(t + .06, 930, 1240, .09, .07, 0, 'triangle'); } },
    deny() { if (ok()) { const t = T(); tone(t, 240, 200, .09, .07, 0, 'square'); tone(t + .1, 200, 170, .12, .06, 0, 'square'); } },
    hammer() { if (ok()) { const t = T(); burst(t, .05, 1200, 2, .16, 0, 'bandpass'); tone(t, 420, 300, .05, .09, 0, 'triangle'); } },
    cloth() { if (ok()) burst(T(), .35, 900, .5, .07, 0, 'bandpass', .6, 2200); },
    eat() { if (ok()) { const t = T(); for (let i = 0; i < 3; i++) burst(t + i * .16, .06, 1400, 2, .05, 0); } },
    release() { if (ok()) { const t = T(); [660, 880, 990, 1320].forEach((f, i) => tone(t + i * .16, f, f, .7, .06, 0, 'sine', .04)); } },
    // 솔
    meow(p, v = 1) { if (ok()) voice(T(), [560, 820, 760, 520], .5, .09 * v, p); },
    mew(p, v = 1) { if (ok()) voice(T(), [700, 940, 860], .2, .07 * v, p); },
    trill(p, v = 1) { if (ok()) voice(T(), [420, 640, 780], .26, .08 * v, p, 30); },
    hiss(p, v = 1) { if (ok()) { const t = T(); burst(t, .6, 5200, .5, .12 * v, p, 'highpass', 1.2); burst(t, .5, 2400, .8, .05 * v, p); } },
    growl(p, v = 1) { if (ok()) { const t = T(); const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(96, t); o.frequency.linearRampToValueAtTime(118, t + .5); o.frequency.linearRampToValueAtTime(90, t + .9); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.1 * v, t + .15); g.gain.exponentialRampToValueAtTime(.0001, t + .95); const l = ac.createOscillator(); l.frequency.value = 23; const lg = ac.createGain(); lg.gain.value = .05 * v; l.connect(lg).connect(g.gain); o.connect(f).connect(g); pan(g, p).connect(out); o.start(t); l.start(t); o.stop(t + 1); l.stop(t + 1); } },
    chatter(p, v = 1) { if (ok()) { const t = T(); for (let i = 0; i < 7; i++) { burst(t + i * .07, .025, 2600, 5, .05 * v, p); tone(t + i * .07, 1500, 1200, .03, .02 * v, p, 'square'); } } },
    punch(p) { if (ok()) { const t = T(); burst(t, .05, 1100, 1.2, .1, p, 'bandpass', 1.3); burst(t, .09, 2800, .9, .05, p); } },
    shake(p) { if (ok()) { const t = T(); for (let i = 0; i < 5; i++) burst(t + i * .05, .05, 1500 + i * 200, .8, .035, p); } },
    // 물그림자
    blob(p, v = 1) { if (ok()) { const t = T(); for (let i = 0; i < 3; i++) tone(t + i * .09 + Math.random() * .03, 260 + i * 90, 520 + i * 140, .09, .06 * v, p); } },
    wind(p) { if (ok()) { const t = T(); tone(t, 180, 420, .5, .07, p, 'sine', .3); burst(t, .5, 900, 1.5, .03, p, 'bandpass', .6, 2200); } },
    lunge(p) { if (ok()) { const t = T(); burst(t, .26, 500, .7, .13, p, 'bandpass', .8, 2600); } },
    splash(p, v = 1) { if (ok()) { const t = T(); burst(t, .3, 1300, .5, .14 * v, p, 'bandpass', .8); burst(t + .04, .35, 3600, .6, .07 * v, p); tone(t, 220, 90, .22, .12 * v, p); } },
    dissolve(p) { if (ok()) { const t = T(); burst(t, .7, 1500, .4, .13, p, 'bandpass', .7, 500); for (let i = 0; i < 6; i++) tone(t + .1 + i * .08, 900 - i * 90, 500 - i * 50, .1, .04, p); } },
    drip(p) { if (ok()) tone(T(), 1400 + Math.random() * 500, 700, .05, .02, p); },
    chirp(p, v) { if (ok() && v > .02) { const t = T(), n = 2 + (Math.random() * 3 | 0); let tt = t; for (let i = 0; i < n; i++) { tone(tt, 4700 + Math.random() * 600, 3100, .055, v * .22, p); tt += .12 + Math.random() * .07; } } },
    flutter(p, v) { if (ok() && v > .02) { const t = T(); for (let i = 0; i < 6; i++) burst(t + i * .045, .04, 1200, .8, v * .05 * (1 - i / 7), p, 'bandpass', .6); } },
  };
  return S;
})();
