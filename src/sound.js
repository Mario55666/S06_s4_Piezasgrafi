/* Simulador CD 102 · sonido sintetizado con Web Audio (sin archivos de audio).
   Motor y rodillos (según la velocidad), golpeteo de cilindros (una vuelta por pliego), sopladores y succión del
   marcador, entrada de cada pliego («fsss» + tic de las escuadras), bocina de aviso y paro de emergencia.
   Solo suena después de que el usuario lo activa (política de reproducción de los navegadores). ES5. Expone window.SOUND. */
window.SOUND = (function () {
  "use strict";
  var ctx = null, master = null, noiseBuf = null, on = false, vol = 0.6, nodes = {}, timer = null, nextBeat = 0;
  var st = { run: false, speed: 0, air: false, feed: false, imp: false };

  function supported() { return !!(window.AudioContext || window.webkitAudioContext); }
  function ensure() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    noiseBuf = makeNoise(); buildBeds(); timer = setInterval(schedule, 50);
    return true;
  }
  function makeNoise() {
    var len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.5 + last * 3; }
    return b;
  }
  function loopNoise() { var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(); return s; }
  function filt(type, f, q) { var x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q != null) x.Q.value = q; return x; }
  function gain(v) { var g = ctx.createGain(); g.gain.value = v; return g; }
  function buildBeds() {
    // motor principal
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = filt("lowpass", 320), g = gain(0);
    o1.type = "sawtooth"; o2.type = "triangle"; o1.frequency.value = 40; o2.frequency.value = 80;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master); o1.start(); o2.start();
    nodes.motor = { o1: o1, o2: o2, lp: lp, g: g };
    // rodadura de rodillos y cadenas
    var n2 = loopNoise(), lp2 = filt("lowpass", 180), gr = gain(0);
    n2.connect(lp2); lp2.connect(gr); gr.connect(master);
    nodes.rumble = { g: gr, lp: lp2 };
    // sopladores y succión del marcador (aire), con pulsos al ritmo de los pliegos
    var n = loopNoise(), hp = filt("highpass", 700), bp = filt("bandpass", 2200, 0.6), ga = gain(0), lfo = ctx.createOscillator(), lfoG = gain(0);
    n.connect(hp); hp.connect(bp); bp.connect(ga); ga.connect(master);
    lfo.frequency.value = 1; lfo.connect(lfoG); lfoG.connect(ga.gain); lfo.start();
    nodes.air = { g: ga, lfo: lfo, lfoG: lfoG };
  }
  function ramp(param, v, tc) { param.cancelScheduledValues(ctx.currentTime); param.setTargetAtTime(v, ctx.currentTime, tc || 0.15); }
  function apply() {
    if (!ctx) return;
    var k = st.run ? Math.min(1, st.speed / 15000) : 0, moving = st.run && st.speed > 50;
    ramp(master.gain, on ? vol : 0, 0.08);
    ramp(nodes.motor.g.gain, moving ? 0.05 + 0.1 * k : (st.run ? 0.03 : 0), 0.35);
    ramp(nodes.motor.o1.frequency, 28 + 42 * k, 0.5); ramp(nodes.motor.o2.frequency, 56 + 90 * k, 0.5); ramp(nodes.motor.lp.frequency, 200 + 520 * k, 0.5);
    ramp(nodes.rumble.g.gain, moving ? 0.05 + 0.17 * k : 0, 0.35); ramp(nodes.rumble.lp.frequency, 140 + 260 * k, 0.5);
    var air = st.air && st.run;
    ramp(nodes.air.g.gain, air ? 0.09 : 0, 0.25);
    ramp(nodes.air.lfoG.gain, air && st.feed ? 0.05 : 0, 0.25);
    ramp(nodes.air.lfo.frequency, Math.max(0.4, st.speed / 3600), 0.3);
  }
  function burst(t, dur, freq, type, q, g0, offset) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = filt(type, freq, q), g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(g0, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, offset != null ? offset : Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  function tone(t, f, dur, type, g0) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(g0, t + 0.01); g.gain.setValueAtTime(g0, t + dur - 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  /* golpeteo de cilindros: una vuelta (un pliego) cada 3600 / velocidad segundos */
  function schedule() {
    if (!ctx || !on || !st.run || st.speed < 300) { nextBeat = 0; return; }
    var period = 3600 / st.speed, now = ctx.currentTime;
    if (!nextBeat || nextBeat < now) nextBeat = now + 0.05;
    while (nextBeat < now + 0.15) { burst(nextBeat, 0.06, 850, "bandpass", 2.2, st.imp ? 0.14 : 0.08); nextBeat += period; }
  }
  function sheetIn() {
    if (!ctx || !on) return;
    var t = ctx.currentTime;
    burst(t, 0.2, 2800, "highpass", 0.7, 0.2);           // fsss del pliego al deslizar por la mesa
    burst(t, 0.09, 4200, "bandpass", 1.2, 0.08);          // soplo que lo separa de la pila
    tone(t + 0.13, 1500, 0.04, "square", 0.04);           // tic contra las escuadras
  }
  function horn() {
    if (!on || !ensure()) return false;
    var t = ctx.currentTime;
    for (var i = 0; i < 3; i++) { tone(t + i * 0.4, 660, 0.18, "square", 0.08); tone(t + i * 0.4 + 0.2, 520, 0.18, "square", 0.08); }
    return true;
  }
  function stopHit() { if (!ctx || !on) return; var t = ctx.currentTime; burst(t, 0.35, 220, "lowpass", 0.8, 0.3); tone(t, 90, 0.3, "sine", 0.12); }

  return {
    supported: supported,
    setEnabled: function (v) { on = !!v; if (on) ensure(); apply(); return on; },
    isOn: function () { return on; },
    setVolume: function (v) { vol = Math.max(0, Math.min(1, v)); apply(); },
    update: function (s) { for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) st[k] = s[k]; apply(); },
    sheetIn: sheetIn, horn: horn, stopHit: stopHit
  };
})();
