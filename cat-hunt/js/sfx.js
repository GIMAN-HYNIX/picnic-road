'use strict';
/* =========================================================
   아침 숲 소리 (모두 코드로 합성)
   바람 · 개울 · 새소리 · 발소리(낙엽/흙길/풀/다리) · 고사리 스침
   다람쥐 경고음 · 청설모 울음 · 딱다구리 · 날갯짓 · 멀리 멧비둘기
   브라우저 정책상 첫 클릭 뒤에 시작
   ========================================================= */
const SFX = (() => {
  let ac = null, out = null, on = true, streamG = null, nb = null, stepBuf = null;
  const noise = sec => { const b = ac.createBuffer(1, Math.floor(ac.sampleRate * sec), ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    try { ac = new A(); } catch (e) { ac = null; return; }
    out = ac.createGain(); out.gain.value = on ? .6 : 0; out.connect(ac.destination);
    nb = noise(3); stepBuf = noise(.25);
    // 바람: 높은 나뭇잎이 쏴아 하고 천천히 출렁
    const w = ac.createBufferSource(); w.buffer = nb; w.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = .45;
    const wg = ac.createGain(); wg.gain.value = .026;
    const lfo = ac.createOscillator(); lfo.frequency.value = .06; const lg = ac.createGain(); lg.gain.value = .02; lfo.connect(lg).connect(wg.gain); lfo.start();
    w.connect(bp).connect(wg).connect(out); w.start();
    // 개울
    const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; s.playbackRate.value = 1.3;
    const sf = ac.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 2300; sf.Q.value = .7;
    streamG = ac.createGain(); streamG.gain.value = 0;
    s.connect(sf).connect(streamG).connect(out); s.start();
  }
  function pan(node, p) { if (ac.createStereoPanner) { const s = ac.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p || 0)); node.connect(s); return s; } return node; }
  function tone(t0, f0, f1, dur, vol, p, type) {
    const o = ac.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .008); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); pan(g, p).connect(out);
    o.start(t0); o.stop(t0 + dur + .03);
  }
  function burst(t0, dur, f, q, vol, p, type, rate) {
    const src = ac.createBufferSource(); src.buffer = stepBuf; src.playbackRate.value = rate || 1;
    const fl = ac.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.value = f; fl.Q.value = q || 1;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    src.connect(fl).connect(g); pan(g, p).connect(out); src.start(t0); src.stop(t0 + dur + .02);
  }
  // 새 종류마다 다른 울음
  function chirp(sp, p, vol) {
    if (!ac || !on || vol < .02) return;
    const t = ac.currentTime + .02;
    if (sp === 'tit') { const n = 2 + (Math.random() * 2 | 0); for (let i = 0; i < n; i++) { tone(t + i * .27, 6100, 5600, .07, vol * .3, p); tone(t + i * .27 + .11, 4300, 4050, .09, vol * .28, p); } }
    else if (sp === 'vtit') { const n = 3 + (Math.random() * 2 | 0); for (let i = 0; i < n; i++) tone(t + i * .19, 3300, 3100, .12, vol * .14, p, 'triangle'); }
    else if (sp === 'sparrow') { const n = 2 + (Math.random() * 3 | 0); let tt = t; for (let i = 0; i < n; i++) { tone(tt, 4700 + Math.random() * 600, 3100, .055, vol * .26, p); tt += .12 + Math.random() * .07; } }
    else if (sp === 'magpie') { for (let i = 0; i < 3 + (Math.random() * 3 | 0); i++) { tone(t + i * .13, 1350, 1100, .06, vol * .06, p, 'square'); burst(t + i * .13, .06, 1800, 2, vol * .05, p); } }
  }
  function step(kind, k = 1) {
    if (!ac || !on) return;
    const t = ac.currentTime;
    if (kind === 'litter') { burst(t, .09, 1700, .8, .05 * k, 0, 'bandpass', .9 + Math.random() * .3); burst(t + .02, .06, 3600, 1.2, .02 * k, 0); burst(t, .07, 300, .7, .05 * k, 0, 'lowpass'); }
    else if (kind === 'grass') { burst(t, .12, 2600, .6, .03 * k, 0, 'bandpass', 1.1); burst(t, .06, 320, .7, .04 * k, 0, 'lowpass'); }
    else if (kind === 'bridge') { burst(t, .08, 900, 1, .07 * k, 0, 'lowpass'); tone(t, 170, 120, .08, .05 * k, 0, 'triangle'); }
    else burst(t, .08, 520, .9, .07 * k, 0, 'lowpass', .8 + Math.random() * .3);
  }
  function rustle(vol) { if (!ac || !on) return; const t = ac.currentTime; burst(t, .32, 3000 + Math.random() * 1200, .5, .035 * vol, (Math.random() - .5) * .3, 'bandpass', .7 + Math.random() * .2); burst(t + .08, .22, 5200, .8, .015 * vol, 0); }
  function chip(p, vol) { if (!ac || !on || vol < .02) return; const t = ac.currentTime + .01; for (let i = 0; i < 3; i++) tone(t + i * .16, 5600, 4200, .045, vol * .18, p); }
  function chatter(p, vol) { if (!ac || !on || vol < .02) return; const t = ac.currentTime + .01, n = 6 + (Math.random() * 6 | 0); for (let i = 0; i < n; i++) { burst(t + i * .07, .05, 2600, 3, vol * .07, p); tone(t + i * .07, 1900, 1500, .04, vol * .04, p, 'sawtooth'); } }
  function drum(p, vol) { if (!ac || !on || vol < .02) return; const t = ac.currentTime + .01, n = 14 + (Math.random() * 6 | 0); for (let i = 0; i < n; i++) { const tt = t + i * (.05 + i * .0012); burst(tt, .03, 700, 2.5, vol * .16 * (1 - i / n * .5), p); tone(tt, 420, 300, .025, vol * .06, p, 'triangle'); } }
  function flutter(p, vol) { if (!ac || !on || vol < .02) return; const t = ac.currentTime; for (let i = 0; i < 6; i++) burst(t + i * .045, .04, 1200, .8, vol * .05 * (1 - i / 7), p, 'bandpass', .6); }
  function dove(p, vol) { if (!ac || !on) return; const t = ac.currentTime + .05, v = vol * .05; tone(t, 520, 480, .32, v, p); tone(t + .42, 560, 500, .5, v * 1.1, p); tone(t + 1.05, 520, 470, .3, v * .9, p); tone(t + 1.45, 540, 480, .45, v, p); }
  function setStream(v) { if (streamG) streamG.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * .05, ac.currentTime, .3); }
  function toggle() { on = !on; if (out) out.gain.setTargetAtTime(on ? .6 : 0, ac.currentTime, .05); return on; }
  return { init, chirp, step, rustle, chip, chatter, drum, flutter, dove, setStream, toggle, get on() { return on; }, get ready() { return !!ac; } };
})();
