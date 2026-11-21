'use strict';
/* =========================================================
   아침 숲 소리 (모두 코드로 합성): 바람 · 개울 · 새소리 · 발소리
   브라우저 정책상 첫 클릭 뒤에 시작
   ========================================================= */
const SFX = (() => {
  let ac = null, out = null, on = true, streamG = null, stepBuf = null;
  const noise = sec => { const b = ac.createBuffer(1, Math.floor(ac.sampleRate * sec), ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    try { ac = new A(); } catch (e) { ac = null; return; }
    out = ac.createGain(); out.gain.value = on ? .6 : 0; out.connect(ac.destination);
    const nb = noise(3); stepBuf = noise(.1);
    // 바람: 낮은 잡음이 천천히 출렁
    const w = ac.createBufferSource(); w.buffer = nb; w.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = .5;
    const wg = ac.createGain(); wg.gain.value = .022;
    const lfo = ac.createOscillator(); lfo.frequency.value = .07; const lg = ac.createGain(); lg.gain.value = .016; lfo.connect(lg).connect(wg.gain); lfo.start();
    w.connect(bp).connect(wg).connect(out); w.start();
    // 개울: 높은 잡음, 가까울수록 크게
    const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; s.playbackRate.value = 1.3;
    const sf = ac.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 2300; sf.Q.value = .7;
    streamG = ac.createGain(); streamG.gain.value = 0;
    s.connect(sf).connect(streamG).connect(out); s.start();
  }
  function tone(t0, f0, f1, dur, vol, pan, type) {
    const o = ac.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .008); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g);
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p).connect(out); } else g.connect(out);
    o.start(t0); o.stop(t0 + dur + .03);
  }
  // 새 종류마다 다른 울음: 박새 '쯔삐 쯔삐', 참새 '짹짹', 까치 '깍깍'
  function chirp(sp, pan, vol) {
    if (!ac || !on || vol < .02) return;
    const t = ac.currentTime + .02;
    if (sp === 'tit') { const n = 2 + (Math.random() * 2 | 0); for (let i = 0; i < n; i++) { tone(t + i * .27, 6100, 5600, .07, vol * .32, pan); tone(t + i * .27 + .11, 4300, 4050, .09, vol * .3, pan); } }
    else if (sp === 'sparrow') { const n = 2 + (Math.random() * 3 | 0); let tt = t; for (let i = 0; i < n; i++) { tone(tt, 4700 + Math.random() * 600, 3100, .055, vol * .28, pan); tt += .12 + Math.random() * .07; } }
    else { for (let i = 0; i < 3 + (Math.random() * 2 | 0); i++) tone(t + i * .13, 1350, 1100, .06, vol * .07, pan, 'square'); }
  }
  function step(kind) {
    if (!ac || !on) return;
    const t = ac.currentTime, src = ac.createBufferSource(); src.buffer = stepBuf; src.playbackRate.value = .8 + Math.random() * .3;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'path' ? 520 : kind === 'bridge' ? 1000 : 780;
    const g = ac.createGain(); g.gain.setValueAtTime(kind === 'bridge' ? .1 : .06, t); g.gain.exponentialRampToValueAtTime(.0001, t + .09);
    src.connect(f).connect(g).connect(out); src.start(t);
    if (kind === 'bridge') tone(t, 170, 120, .07, .05, 0, 'triangle');
  }
  function setStream(v) { if (streamG) streamG.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * .05, ac.currentTime, .3); }
  function toggle() { on = !on; if (out) out.gain.setTargetAtTime(on ? .6 : 0, ac.currentTime, .05); return on; }
  return { init, chirp, step, setStream, toggle, get on() { return on; }, get ready() { return !!ac; } };
})();
