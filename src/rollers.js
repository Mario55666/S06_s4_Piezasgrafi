/* Simulador CD 102 · diagrama interactivo de un cuerpo impresor.
   Batería de entintado y de mojado con flechas animadas (circulación de tinta y de agua), transferencia
   plancha → mantilla → pliego, y tres vistas ampliadas que muestran cómo la tinta, el agua y la presión
   afectan la plancha, la mantilla y el pliego. ES5. Expone window.ROLLERS. */
window.ROLLERS = (function () {
  "use strict";
  var count = 0;
  var P = { x: 360, y: 215 }, B = { x: 345, y: 327 }, I = { x: 352, y: 447 };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hexRgb(h) { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(a, b, t) { return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * t) + "," + Math.round(a[1] + (b[1] - a[1]) * t) + "," + Math.round(a[2] + (b[2] - a[2]) * t) + ")"; }
  function pt(c, r, deg) { var a = deg * Math.PI / 180; return [c.x + r * Math.cos(a), c.y + r * Math.sin(a)]; }
  function f1(v) { return Math.round(v * 10) / 10; }

  /* estado → efectos */
  function effects(st) {
    return {
      scum: st.water < 35 ? clamp((35 - st.water) / 30, 0, 1) : 0,
      wash: st.water > 55 ? clamp((st.water - 55) / 35, 0, 1) : 0,
      inkA: clamp(0.22 + 0.62 * st.ink, 0, 1),
      heavy: st.ink > 1.15 ? clamp((st.ink - 1.15) / 0.6, 0, 1) : 0,
      mottle: st.press < 0.1 ? clamp((0.1 - st.press) / 0.08, 0, 1) : 0,
      gain: st.press > 0.15 ? clamp((st.press - 0.15) / 0.1, 0, 1) : 0,
      dbl: st.press > 0.17 ? clamp((st.press - 0.17) / 0.08, 0, 1) : 0
    };
  }
  function diagnose(st) {
    var L = [];
    if (st.water < 35) L.push(["Falta agua", "<b>Plancha:</b> las zonas sin imagen quedan sin protección y aceptan tinta (velo). <b>Mantilla:</b> recoge ese velo y lo pasa al pliego como una mancha de color."]);
    if (st.water > 55) L.push(["Exceso de agua", "<b>Plancha:</b> la tinta se emulsiona con el agua y la imagen queda débil y moteada. <b>Mantilla:</b> recibe gotas de agua y transfiere menos tinta: el pliego sale lavado."]);
    if (st.ink < 0.85) L.push(["Poca tinta", "<b>Plancha:</b> película de tinta delgada. <b>Mantilla:</b> imagen pálida. <b>Pliego:</b> densidad baja."]);
    if (st.ink > 1.15) L.push(["Exceso de tinta", "<b>Plancha:</b> los puntos se empastan. <b>Mantilla:</b> se carga de tinta (empaste). <b>Pliego:</b> oscuro, con ganancia de punto y riesgo de repinte."]);
    if (st.press < 0.1) L.push(["Presión baja", "<b>Mantilla → pliego:</b> el contacto es insuficiente; la tinta no pasa completa y el pliego sale moteado."]);
    if (st.press > 0.15) L.push(["Presión alta", "<b>Mantilla → pliego:</b> el punto se aplasta: sube la ganancia" + (st.press > 0.17 ? " y aparece remosqueo (imagen doble)" : "") + "."]);
    if (!L.length) L.push(["Equilibrio agua-tinta correcto", "<b>Plancha:</b> la tinta se queda solo en la imagen y el agua protege el resto. <b>Mantilla:</b> recibe una imagen limpia, invertida. <b>Pliego:</b> nítido y con la densidad justa."]);
    return L;
  }

  /* ---------- vistas ampliadas ---------- */
  function drawImage(g, st, alpha, spread, col) {
    g.save();
    g.globalAlpha = alpha;
    g.fillStyle = col; g.strokeStyle = col;
    if (spread > 0) { g.shadowColor = col; g.shadowBlur = spread; }
    g.font = "900 96px Inter, Arial, sans-serif"; g.fillText("F", 16, 104);
    g.fillRect(118, 20, 84, 46);
    for (var x = 0; x < 12; x++) {
      var cov = 0.08 + x / 11 * 0.82, r = 3.6 * Math.sqrt(cov) + spread * 0.12;
      for (var y = 0; y < 4; y++) { g.beginPath(); g.arc(116 + x * 8, 84 + y * 8, Math.min(r, 4.6), 0, 6.283); g.fill(); }
    }
    g.restore();
  }
  function holes(g, W, H, amount, seed, size) {
    if (amount <= 0) return;
    var r = rng(seed), n = Math.round(70 * amount);
    g.save(); g.globalCompositeOperation = "destination-out";
    for (var i = 0; i < n; i++) { g.globalAlpha = 0.35 + 0.5 * r(); g.beginPath(); g.arc(r() * W, r() * H, (size || 3) + r() * (size || 3) * 1.6, 0, 6.283); g.fill(); }
    g.restore();
  }
  function specks(g, W, H, amount, col, seed, alpha) {
    if (amount <= 0) return;
    var r = rng(seed), n = Math.round(260 * amount);
    g.save(); g.fillStyle = col;
    for (var i = 0; i < n; i++) { g.globalAlpha = alpha * (0.4 + 0.6 * r()); g.beginPath(); g.arc(r() * W, r() * H, 0.6 + r() * 1.6, 0, 6.283); g.fill(); }
    g.restore();
  }
  var layer = null;
  function inset(cv, kind, st, fx) {
    var g = cv.getContext("2d"), W = cv.width, H = cv.height, col = st.hex, rgb = hexRgb(col);
    if (!layer) layer = document.createElement("canvas");
    layer.width = W; layer.height = H;
    var lg = layer.getContext("2d");
    g.clearRect(0, 0, W, H);
    if (kind === "plate") {
      g.fillStyle = "#cdd5db"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(255,255,255,.35)"; for (var y = 0; y < H; y += 3) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
      g.fillStyle = "rgba(95,179,232," + (0.06 + 0.4 * clamp(st.water / 75, 0, 1)) + ")"; g.fillRect(0, 0, W, H);
      specks(g, W, H, fx.scum, col, 11, 0.75);
      drawImage(lg, st, fx.inkA * (1 - 0.35 * fx.wash), fx.heavy * 3, col);
      holes(lg, W, H, fx.wash, 21, 3);
      g.drawImage(layer, 0, 0);
      if (fx.wash > 0) { var r = rng(5); for (var i = 0; i < 40 * fx.wash; i++) { var x = r() * W, yy = r() * H, rad = 1.5 + r() * 3; g.fillStyle = "rgba(160,215,245,.85)"; g.beginPath(); g.arc(x, yy, rad, 0, 6.283); g.fill(); g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.arc(x - rad * 0.3, yy - rad * 0.3, rad * 0.35, 0, 6.283); g.fill(); } }
    } else if (kind === "blanket") {
      g.fillStyle = "#7e8e9b"; g.fillRect(0, 0, W, H);
      specks(g, W, H, fx.scum * 0.85, col, 11, 0.7);
      lg.save(); lg.translate(W, 0); lg.scale(-1, 1);
      drawImage(lg, st, fx.inkA * 0.88 * (1 - 0.5 * fx.wash), fx.heavy * 5, col);
      lg.restore();
      holes(lg, W, H, fx.wash * 0.9, 31, 2.5);
      g.drawImage(layer, 0, 0);
      if (fx.heavy > 0) { g.fillStyle = mix(rgb, [0, 0, 0], 0.2); g.globalAlpha = 0.25 * fx.heavy; g.fillRect(0, 0, W, 5); g.fillRect(0, H - 5, W, 5); g.globalAlpha = 1; }
    } else {
      g.fillStyle = "#faf9f5"; g.fillRect(0, 0, W, H);
      if (fx.scum > 0) { g.fillStyle = "rgba(" + rgb.join(",") + "," + (0.1 * fx.scum) + ")"; g.fillRect(0, 0, W, H); specks(g, W, H, fx.scum * 0.7, col, 11, 0.55); }
      var a = fx.inkA * 0.95 * (1 - 0.55 * fx.wash) * (1 - 0.35 * fx.mottle);
      if (fx.dbl > 0) { lg.save(); lg.translate(0, 3 + 3 * fx.dbl); drawImage(lg, st, a * 0.4 * fx.dbl, 0, col); lg.restore(); }
      drawImage(lg, st, a, fx.heavy * 4 + fx.gain * 3.5, col);
      holes(lg, W, H, Math.max(fx.wash * 0.8, fx.mottle), 41, 3.5);
      g.drawImage(layer, 0, 0);
    }
  }
  function chip(kind, st, fx) {
    if (kind === "plate") return fx.scum ? ["n", "Con velo"] : fx.wash ? ["n", "Lavada"] : fx.heavy ? ["n", "Empastada"] : st.ink < 0.85 ? ["n", "Poca tinta"] : ["y", "Limpia y entintada"];
    if (kind === "blanket") return fx.scum ? ["n", "Recoge el velo"] : fx.wash ? ["n", "Con agua"] : fx.heavy ? ["n", "Cargada de tinta"] : st.ink < 0.85 ? ["n", "Imagen pálida"] : ["y", "Imagen limpia (invertida)"];
    return fx.scum ? ["n", "Velo de color"] : fx.wash ? ["n", "Lavado"] : fx.mottle ? ["n", "Moteado"] : (fx.heavy || fx.gain) ? ["n", fx.dbl ? "Remosqueo" : "Ganancia alta"] : st.ink < 0.85 ? ["n", "Débil"] : ["y", "Nítido"];
  }

  /* ---------- SVG ---------- */
  function roller(c, r, fill, spin, dash) {
    return '<circle cx="' + f1(c[0]) + '" cy="' + f1(c[1]) + '" r="' + r + '" fill="' + fill + '" stroke="#3b4045" stroke-width="1.2"/>' +
      '<circle class="spin' + (spin < 0 ? " rev" : "") + '" cx="' + f1(c[0]) + '" cy="' + f1(c[1]) + '" r="' + (r - 3) + '" fill="none" stroke="' + (dash || "rgba(255,255,255,.55)") + '" stroke-width="2" stroke-dasharray="5 6"/>';
  }
  function svg(id) {
    var inkers = [-120, -95, -70, -45].map(function (a) { return pt(P, 69, a); });
    var s = '<svg viewBox="0 0 760 530" class="roll-svg" role="img" aria-label="Cuerpo impresor: circulación de tinta y de agua por los rodillos hasta la plancha, la mantilla y el pliego">';
    s += '<defs><marker id="' + id + 'm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#555553"/></marker></defs>';
    // caminos (invisibles) que siguen las flechas
    s += '<path id="' + id + 'pInk" d="M586,42 L532,40 Q492,42 470,52 Q450,62 430,70 Q398,76 368,82 Q346,92 334,108 Q326,130 326,153" fill="none" class="rl-path ink"/>';
    s += '<path id="' + id + 'pInk2" d="M368,82 Q395,96 402,118 Q410,140 409,165" fill="none" class="rl-path ink"/>';
    var a0 = pt(P, 63, -120), a1 = pt(P, 63, 97);
    s += '<path id="' + id + 'pPlate" d="M' + f1(a0[0]) + ',' + f1(a0[1]) + ' A63,63 0 1 1 ' + f1(a1[0]) + ',' + f1(a1[1]) + '" fill="none" class="rl-path img"/>';
    var w0 = pt(P, 63, 180), w1 = pt(P, 63, 232);
    s += '<path id="' + id + 'pWater" d="M206,300 Q222,292 232,276 Q246,256 260,244 Q276,228 291,215 L' + f1(w0[0]) + ',' + f1(w0[1]) + ' A63,63 0 0 1 ' + f1(w1[0]) + ',' + f1(w1[1]) + '" fill="none" class="rl-path water"/>';
    var b0 = pt(B, 63, -82), b1 = pt(B, 61, 87);
    s += '<path id="' + id + 'pBlanket" d="M' + f1(b0[0]) + ',' + f1(b0[1]) + ' A62,62 0 1 0 ' + f1(b1[0]) + ',' + f1(b1[1]) + '" fill="none" class="rl-path img"/>';
    s += '<path id="' + id + 'pSheet" d="M362,374 L648,374" fill="none" class="rl-path img"/>';
    // tintero y batería de entintado
    s += '<path d="M540,16 L624,16 L606,66 L548,66 Z" fill="#3b4045"/><rect id="' + id + 'trough" x="552" y="26" width="58" height="30" fill="#1d1d1b"/>';
    s += '<g id="' + id + 'inkRollers">' + roller([512, 40], 18, "#9aa3ab", 1) + roller([470, 52], 11, "#6d747a", -1) + roller([430, 70], 15, "#6d747a", 1) + roller([368, 82], 13, "#6d747a", -1) +
      roller([334, 108], 17, "#6d747a", 1) + roller([402, 118], 17, "#6d747a", 1) + inkers.map(function (c, i) { return roller(c, 13, "#6d747a", -1); }).join("") + '</g>';
    // mojado
    s += '<rect x="190" y="282" width="92" height="30" rx="3" fill="#3b4045"/><rect id="' + id + 'pan" x="194" y="290" width="84" height="18" fill="#5fb3e8"/>';
    s += '<g id="' + id + 'wRollers">' + roller([291, 215], 13, "#a7b4bf", -1) + roller([260, 244], 12, "#a7b4bf", 1) + roller([232, 276], 14, "#7f8a93", -1) + '</g>';
    // cilindros
    s += '<circle cx="' + P.x + '" cy="' + P.y + '" r="56" fill="#cfd6dc" stroke="#555553" stroke-width="2.5"/><circle class="spin" cx="' + P.x + '" cy="' + P.y + '" r="50" fill="none" stroke="#7f8a93" stroke-width="4" stroke-dasharray="22 18"/>';
    s += '<circle cx="' + B.x + '" cy="' + B.y + '" r="56" fill="#2b3a4a"/><circle class="spin rev" cx="' + B.x + '" cy="' + B.y + '" r="50" fill="none" stroke="#7aa6c6" stroke-width="4" stroke-dasharray="22 18"/>';
    s += '<circle cx="' + I.x + '" cy="' + I.y + '" r="64" fill="#8f989f"/><circle class="spin" cx="' + I.x + '" cy="' + I.y + '" r="58" fill="none" stroke="#f3a100" stroke-width="5" stroke-dasharray="14 70"/>';
    s += '<text x="' + P.x + '" y="' + (P.y + 14) + '" text-anchor="middle" class="rl-f" fill="#1f4f6b" style="fill:#1f4f6b">F</text>';
    s += '<text x="' + B.x + '" y="' + (B.y + 14) + '" text-anchor="middle" class="rl-f" style="fill:#ffffff" transform="translate(' + (2 * B.x) + ' 0) scale(-1 1)">F</text>';
    s += '<rect x="96" y="380" width="568" height="5" fill="#ffffff" stroke="#868686" stroke-width="1"/>';
    s += '<text x="560" y="372" text-anchor="middle" class="rl-fs" id="' + id + 'sheetF">F</text>';
    // rótulos
    s += '<text x="540" y="11" class="rl-t">Tintero (tinta grasa)</text><text x="438" y="44" class="rl-t">Tomador</text><text x="250" y="80" class="rl-t">Distribuidores</text><text x="424" y="172" class="rl-t">Dadores</text>';
    s += '<text x="170" y="210" class="rl-t">Mojador</text><text x="164" y="252" class="rl-t">Dosificador</text><text x="196" y="328" class="rl-t">Batea: agua</text>';
    s += '<text x="424" y="226" class="rl-t b">Plancha · al derecho</text><text x="410" y="322" class="rl-t b">Mantilla · invertida</text><text x="424" y="470" class="rl-t">Cilindro de impresión</text><text x="100" y="372" class="rl-t b">Pliego →</text>';
    s += '<g id="' + id + 'arrows"></g>';
    s += '<g transform="translate(400,512)"><polygon points="0,-5 12,0 0,5" fill="#555553" id="' + id + 'lgInk"/><text x="18" y="4" class="rl-t">Tinta</text><circle cx="76" cy="0" r="5" fill="#2e9bff" stroke="#fff" stroke-width="1.4"/><text x="88" y="4" class="rl-t">Agua (gotas)</text><polygon points="200,-5 212,0 200,5" fill="#7a3db8"/><text x="218" y="4" class="rl-t">Imagen</text></g>';
    return s + '</svg>';
  }
  function arrowsSvg(id, st, paused) {
    if (paused) return "";
    var inkN = st.ink <= 0.05 ? 0 : Math.round(clamp(2 + 3.5 * st.ink, 2, 9)), inkDur = clamp(4.6 / (0.45 + st.ink), 1.8, 9);
    var watN = st.water <= 3 ? 0 : Math.round(clamp(1 + st.water / 13, 1, 9)), watDur = clamp(5 - st.water / 30, 1.8, 6);
    var inkSc = clamp(0.7 + 0.35 * st.ink, 0.6, 1.4), watSc = clamp(0.7 + st.water / 110, 0.6, 1.5), imgN = inkN ? Math.max(2, inkN - (st.water > 55 ? 2 : 0)) : 0;
    function run(path, n, dur, color, sc) {
      var o = "", drop = path === "pWater";
      for (var i = 0; i < n; i++) {
        o += (drop ? '<circle r="4.6" fill="' + color + '" stroke="#ffffff" stroke-width="1.4" transform="scale(' + f1(sc) + ')">' : '<polygon points="-6,-4 6,0 -6,4" fill="' + color + '" transform="scale(' + f1(sc) + ')">') + '<animateMotion dur="' + f1(dur) + 's" repeatCount="indefinite" rotate="auto" begin="-' + f1(dur * i / n) + 's"><mpath href="#' + id + path + '"/></animateMotion>' + (drop ? '</circle>' : '</polygon>');
      }
      return o;
    }
    return run("pInk", inkN, inkDur, st.hex, inkSc) + run("pInk2", Math.ceil(inkN / 2), inkDur * 0.6, st.hex, inkSc) +
      run("pWater", watN, watDur, "#2e9bff", watSc) +
      run("pPlate", imgN, inkDur * 0.9, "#7a3db8", 1) + run("pBlanket", imgN, inkDur * 0.9, "#7a3db8", 1) + run("pSheet", Math.max(0, imgN - 1), inkDur * 0.8, "#7a3db8", 1);
  }

  function create(host, opts) {
    opts = opts || {};
    var id = "rl" + (++count), paused = false, lastKey = "";
    var st = { ink: opts.ink != null ? opts.ink : 1, water: opts.water != null ? opts.water : 45, press: opts.press != null ? opts.press : 0.12, hex: opts.hex || "#1d1d1b", label: opts.label || "" };
    var ctl = opts.controls ?
      '<div class="rl-ctl"><div><label class="lb" for="' + id + 'ink">Tinta · apertura del tintero</label><div class="rng"><input type="range" id="' + id + 'ink" min="0" max="100" step="1" value="' + Math.round(st.ink * 50) + '"><output id="' + id + 'inkV"></output></div></div>' +
      '<div><label class="lb" for="' + id + 'wat">Agua · mojado</label><div class="rng"><input type="range" id="' + id + 'wat" min="0" max="100" step="1" value="' + st.water + '"><output id="' + id + 'watV"></output></div></div>' +
      '<div><label class="lb" for="' + id + 'prs">Presión mantilla–pliego</label><div class="rng"><input type="range" id="' + id + 'prs" min="0" max="0.3" step="0.01" value="' + st.press + '"><output id="' + id + 'prsV"></output></div></div>' +
      '<div class="rl-inks" role="group" aria-label="Color de tinta">' + [["K", "#1d1d1b"], ["C", "#00a0e3"], ["M", "#e6007e"], ["Y", "#ffd400"]].map(function (k) { return '<button type="button" data-hex="' + k[1] + '" aria-pressed="' + (k[1] === st.hex) + '" aria-label="Tinta ' + k[0] + '" style="background:' + k[1] + '">' + k[0] + '</button>'; }).join("") + '</div></div>' : "";
    host.innerHTML = '<div class="rl-head"><b id="' + id + 'lbl"></b><button type="button" class="btn btn-outline btn-sm" id="' + id + 'pause" aria-pressed="false">⏸ Pausar flechas</button></div>' + ctl +
      '<div class="rl-fig">' + svg(id) + '</div>' +
      '<div class="rl-insets"><figure><canvas id="' + id + 'cP" width="220" height="140"></canvas><figcaption><b>Plancha</b> · <span id="' + id + 'sP"></span></figcaption></figure>' +
      '<figure><canvas id="' + id + 'cB" width="220" height="140"></canvas><figcaption><b>Mantilla</b> · <span id="' + id + 'sB"></span></figcaption></figure>' +
      '<figure><canvas id="' + id + 'cS" width="220" height="140"></canvas><figcaption><b>Pliego</b> · <span id="' + id + 'sS"></span></figcaption></figure></div>' +
      '<div class="rl-diag" id="' + id + 'diag" aria-live="polite"></div>';
    function $(s) { return document.getElementById(id + s); }
    function render() {
      var fx = effects(st), rgb = hexRgb(st.hex);
      $("lbl").textContent = st.label;
      var key = [Math.round(st.ink * 10), Math.round(st.water / 5), st.hex, paused].join("|");
      if (key !== lastKey) { lastKey = key; $("arrows").innerHTML = arrowsSvg(id, st, paused); }
      var rollFill = mix([109, 116, 122], rgb, clamp(0.25 + 0.45 * st.ink, 0, 0.85));
      [].forEach.call($("inkRollers").querySelectorAll("circle:not(.spin)"), function (c, i) { if (i > 0) c.setAttribute("fill", rollFill); });
      $("trough").setAttribute("fill", st.hex); $("trough").setAttribute("height", f1(clamp(8 + 22 * st.ink / 1.6, 4, 30)));
      $("pan").setAttribute("y", f1(308 - clamp(st.water / 100 * 18, 1, 18))); $("pan").setAttribute("height", f1(clamp(st.water / 100 * 18, 1, 18)));
      $("lgInk").setAttribute("fill", st.hex);
      $("sheetF").style.fill = st.hex; $("sheetF").style.opacity = String(clamp(fx.inkA * (1 - 0.5 * fx.wash), 0.15, 1));
      inset($("cP"), "plate", st, fx); inset($("cB"), "blanket", st, fx); inset($("cS"), "sheet", st, fx);
      ["P", "B", "S"].forEach(function (k, i) { var c = chip(["plate", "blanket", "sheet"][i], st, fx), el = $("s" + k); el.textContent = (c[0] === "y" ? "✓ " : "⚠ ") + c[1]; el.className = c[0] === "y" ? "ok-t" : "warn-t"; });
      $("diag").innerHTML = diagnose(st).map(function (d) { return '<p><b class="' + (d[0].indexOf("correcto") > 0 ? "ok-t" : "warn-t") + '">' + d[0] + ':</b> ' + d[1] + '</p>'; }).join("");
      if (opts.controls) {
        $("inkV").textContent = Math.round(st.ink * 50) + " %" + (st.ink < 0.85 ? " · poca" : st.ink > 1.15 ? " · exceso" : " · justa");
        $("watV").textContent = st.water + " %" + (st.water < 35 ? " · poca" : st.water > 55 ? " · exceso" : " · justa");
        $("prsV").textContent = st.press.toFixed(2).replace(".", ",") + " mm";
      }
    }
    $("pause").addEventListener("click", function () {
      paused = !paused; this.setAttribute("aria-pressed", paused); this.textContent = paused ? "▶ Animar flechas" : "⏸ Pausar flechas";
      host.classList.toggle("paused", paused); render();
    });
    if (opts.controls) {
      $("ink").addEventListener("input", function () { st.ink = +this.value / 50; render(); if (opts.onChange) opts.onChange(st); });
      $("wat").addEventListener("input", function () { st.water = +this.value; render(); if (opts.onChange) opts.onChange(st); });
      $("prs").addEventListener("input", function () { st.press = Math.round(+this.value * 100) / 100; render(); if (opts.onChange) opts.onChange(st); });
      host.querySelector(".rl-inks").addEventListener("click", function (e) {
        var b = e.target.closest("[data-hex]"); if (!b) return;
        st.hex = b.getAttribute("data-hex");
        [].forEach.call(this.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", x === b); });
        render(); if (opts.onChange) opts.onChange(st);
      });
    }
    render();
    return {
      set: function (o) { for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) st[k] = o[k]; render(); },
      get: function () { return st; }
    };
  }

  return { create: create, effects: effects, diagnose: diagnose };
})();
