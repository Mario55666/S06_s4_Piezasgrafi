/* Simulador CD 102 · módulo de impresión.
   Preimpresión (formatos, imposición, revisión), separación CMYK, planchas CTP y simulación del pliego impreso
   (densidad, agua, presión, registro, zonas de tintero) con cuentahílos de trama.
   ES5 sin dependencias. Expone window.PRINTSIM. */
window.PRINTSIM = (function () {
  "use strict";

  var S = 1.2;                    // píxeles por milímetro en los búferes del pliego
  var PAPER = [250, 249, 245];    // blanco del papel estucado simulado
  var GRIP = 10;                  // pinza del pliego (mm): la ficha CD 102 indica 10–12 mm; se simula el mínimo
  var LEAD = 43, LEAD_OPT = 52;   // borde delantero de la plancha → inicio de impresión (mm), estándar / opcional (ficha CD 102)
  var ZONES = 12;                 // zonas de tintero simplificadas para la simulación
  var LPMM = 6.9;                 // lineatura ≈ 175 lpi (líneas por mm)

  /* Densidades meta: valores de referencia didácticos para papel estucado (densidad de masa).
     Usa las de tu taller o las de la norma que aplique (ISO 12647-2 fija metas en CIELAB). */
  var INKS = {
    K: { name: "Negro", hex: "#1d1d1b", rgb: [29, 29, 27], target: 1.80, tol: 0.10, ang: 45 },
    C: { name: "Cian", hex: "#00a0e3", rgb: [0, 160, 227], target: 1.45, tol: 0.08, ang: 15 },
    M: { name: "Magenta", hex: "#e6007e", rgb: [230, 0, 126], target: 1.40, tol: 0.08, ang: 75 },
    Y: { name: "Amarillo", hex: "#ffd400", rgb: [255, 212, 0], target: 1.00, tol: 0.08, ang: 0 }
  };
  var ORDER = ["K", "C", "M", "Y"];  // secuencia de cuerpos: negro, cian, magenta, amarillo

  /* Formatos de plancha. CD 102 y SM 74: datos técnicos de Heidelberg (TDB_CD102_en, sm74);
     SM 52 es un valor de referencia para comparar: verificar con la ficha de la máquina. */
  var PLATES = [
    { id: "cd102", press: "Speedmaster CD 102 (70 × 100)", w: 1030, h: 790, thick: "0,20–0,30 mm",
      sheetMax: [1020, 720], sheetMin: [480, 340], print: [1020, 710], ref: false, lead: LEAD, leadOpt: LEAD_OPT,
      blanket: "840 × 1052 mm · 1,95 mm, con barras metálicas", grip: "10–12 mm",
      src: "Ficha técnica Heidelberg Speedmaster CD 102" },
    { id: "sm74", press: "Speedmaster SM 74 (50 × 70)", w: 745, h: 605, thick: "0,25–0,30 mm",
      sheetMax: [740, 530], sheetMin: [280, 210], print: [740, 510], ref: false, lead: 59.5,
      blanket: "627 × 772 mm · 1,95 mm (armada)", grip: "8–10 mm",
      src: "Datos técnicos Heidelberg Speedmaster SM 74" },
    { id: "sm52", press: "Speedmaster SM 52 (35 × 50)", w: 525, h: 459, thick: "—",
      sheetMax: [520, 370], sheetMin: [145, 105], print: [520, 360], ref: true,
      src: "Valor de referencia: verificar con la ficha de la máquina" }
  ];

  var TECH = [
    { id: "thermal", name: "CTP térmica (830 nm)", coat: [31, 92, 122] },
    { id: "violet", name: "CTP violeta (405 nm)", coat: [62, 44, 120] },
    { id: "processless", name: "CTP sin procesado", coat: [92, 120, 140] },
    { id: "conv", name: "Convencional (insolada con fotolito)", coat: [36, 96, 66] }
  ];

  /* w = lado que cruza la máquina (ancho), h = sentido de avance del pliego. */
  var SHEETS = [
    { id: "700x1000", w: 1000, h: 700, label: "70 × 100 cm" },
    { id: "720x1020", w: 1020, h: 720, label: "72 × 102 cm" },
    { id: "650x900", w: 900, h: 650, label: "65 × 90 cm" },
    { id: "610x860", w: 860, h: 610, label: "61 × 86 cm" },
    { id: "500x700", w: 700, h: 500, label: "50 × 70 cm" },
    { id: "750x1050", w: 1050, h: 750, label: "75 × 105 cm" },
    { id: "320x450", w: 450, h: 320, label: "32 × 45 cm" }
  ];

  function byId(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function r2(v) { return Math.round(v * 100) / 100; }

  /* ---------- ruido (textura de papel, velo, moteado) ---------- */
  var noiseCache = {};
  function valueNoise(w, h, cell, seed) {
    var r = rng(seed), gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, grid = new Float32Array(gw * gh), out = new Uint8Array(w * h), x, y;
    for (var i = 0; i < grid.length; i++) grid[i] = r();
    for (y = 0; y < h; y++) {
      var gy = y / cell, y0 = gy | 0, fy = gy - y0; fy = fy * fy * (3 - 2 * fy);
      for (x = 0; x < w; x++) {
        var gx = x / cell, x0 = gx | 0, fx = gx - x0; fx = fx * fx * (3 - 2 * fx);
        var k = y0 * gw + x0, a = grid[k], b = grid[k + 1], c = grid[k + gw], d = grid[k + gw + 1];
        out[y * w + x] = ((a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy) * 255;
      }
    }
    return out;
  }
  function noises(w, h) {
    var key = w + "x" + h;
    if (!noiseCache[key]) noiseCache[key] = { lf: valueNoise(w, h, 48, 11), md: valueNoise(w, h, 10, 23), hf: valueNoise(w, h, 2, 37) };
    return noiseCache[key];
  }

  /* ---------- arte final ---------- */
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }

  /* Afiche A3 de muestra («Feria de Diseño»): colores planos, sobreimpresiones CMY, foto simulada, texto fino y negro enriquecido. */
  function sampleArt(logo) {
    var W = 1240, H = 1754, c = document.createElement("canvas"); c.width = W; c.height = H;
    var g = c.getContext("2d"), F = "Inter, 'Segoe UI', Arial, sans-serif";
    g.fillStyle = "#f7f1e6"; g.fillRect(0, 0, W, H);
    // foto simulada: atardecer sobre montañas
    g.save(); roundRect(g, 80, 80, W - 160, 560, 34); g.clip();
    var sky = g.createLinearGradient(0, 80, 0, 640); sky.addColorStop(0, "#2a3f8f"); sky.addColorStop(0.45, "#e6007e"); sky.addColorStop(0.8, "#f3a100"); sky.addColorStop(1, "#ffd400");
    g.fillStyle = sky; g.fillRect(80, 80, W - 160, 560);
    g.fillStyle = "#fff3b0"; g.beginPath(); g.arc(W * 0.66, 470, 120, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1b2a52"; g.beginPath(); g.moveTo(80, 640); g.lineTo(80, 470); g.lineTo(300, 330); g.lineTo(470, 470); g.lineTo(640, 360); g.lineTo(900, 520); g.lineTo(1050, 430); g.lineTo(W - 80, 500); g.lineTo(W - 80, 640); g.fill();
    g.fillStyle = "#0e1631"; g.beginPath(); g.moveTo(80, 640); g.lineTo(80, 560); g.lineTo(380, 470); g.lineTo(700, 580); g.lineTo(W - 80, 540); g.lineTo(W - 80, 640); g.fill();
    g.restore();
    // círculos de proceso en sobreimpresión
    g.globalCompositeOperation = "multiply";
    [[470, 900, "#00a0e3"], [770, 900, "#e6007e"], [620, 1120, "#ffd400"]].forEach(function (k) { g.fillStyle = k[2]; g.beginPath(); g.arc(k[0], k[1], 210, 0, Math.PI * 2); g.fill(); });
    g.globalCompositeOperation = "source-over";
    // título
    g.fillStyle = "#1d1d1b"; g.font = "800 132px " + F; g.fillText("FERIA DE", 80, 1360); g.fillText("DISEÑO", 80, 1480);
    g.fillStyle = "#0072b9"; g.font = "800 64px " + F; g.fillText("IDC · 2026", 820, 1475);
    g.fillStyle = "#3a3a38"; g.font = "500 25px " + F;
    g.fillText("Exposición de proyectos · Talleres de impresión · Charlas con estudios gráficos", 82, 1528);
    g.font = "400 17px " + F;
    g.fillText("Texto de 6 pt para revisar registro y nitidez: si se ve con halos de color, el registro está corrido.", 82, 1556);
    // banda de negro enriquecido
    g.fillStyle = "#141414"; g.fillRect(0, 1590, W, H - 1590);
    g.fillStyle = "#ffffff"; g.font = "700 38px " + F; g.fillText("Impreso en offset · 4 colores", 80, 1660);
    g.font = "500 26px " + F; g.fillStyle = "#f3a100"; g.fillText("Speedmaster CD 102 · pliego 70 × 100 cm", 80, 1706);
    if (logo && logo.naturalWidth) {
      var lw = 300, lh = lw * logo.naturalHeight / logo.naturalWidth;
      g.fillStyle = "#ffffff"; roundRect(g, W - lw - 110, 1612, lw + 30, lh + 24, 12); g.fill();
      g.drawImage(logo, W - lw - 95, 1624, lw, lh);
    }
    return { canvas: c, pxW: 0, pxH: 0, vector: true, sample: true, name: "Afiche «Feria de Diseño» (muestra)" };
  }

  function artFromDataURL(url, name, vector) {
    return new Promise(function (ok, bad) {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || 0, h = img.naturalHeight || 0;
        if (vector && (!w || !h)) { w = 1240; h = 1754; }
        if (!w || !h) { bad(new Error("dimensiones")); return; }
        var maxSide = vector ? 2400 : 3000, k = vector ? maxSide / Math.max(w, h) : Math.min(1, maxSide / Math.max(w, h));
        var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
        var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        ok({ canvas: c, pxW: vector ? 0 : w, pxH: vector ? 0 : h, vector: !!vector, sample: false, name: name || "arte", dataURL: url });
      };
      img.onerror = function () { bad(new Error("imagen")); };
      img.src = url;
    });
  }

  function loadArtFile(file) {
    return new Promise(function (ok, bad) {
      if (!file) { bad(new Error("archivo")); return; }
      if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) { bad(new Error("tipo")); return; }
      var fr = new FileReader();
      fr.onerror = function () { bad(new Error("lectura")); };
      fr.onload = function () { artFromDataURL(fr.result, file.name, file.type === "image/svg+xml").then(ok, bad); };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- imposición y revisión de preimpresión ---------- */
  function layout(o) {
    var sh = byId(SHEETS, o.sheet) || SHEETS[0], press = PLATES[0];
    var printW = Math.min(sh.w, press.print[0]);
    var mx = Math.max(o.marks ? 10 : 3, (sh.w - printW) / 2 + 3);
    var top = o.marks ? 12 : 3;
    var zx = mx, zy = top, zw = sh.w - 2 * mx, zh = sh.h - GRIP - 2 - top;
    var b = Math.max(0, +o.bleed || 0), w = +o.w || 0, h = +o.h || 0, pw = w + 2 * b, ph = h + 2 * b;
    function fit(cw, chh, rot) {
      var c = cw > 0 ? Math.max(0, Math.floor(zw / cw)) : 0, r = chh > 0 ? Math.max(0, Math.floor(zh / chh)) : 0;
      return { cols: c, rows: r, n: c * r, rot: rot, iw: cw, ih: chh };
    }
    var A = fit(pw, ph, false), B = fit(ph, pw, true);
    var best = B.n > A.n ? "B" : "A";
    var ch = o.orient === "B" ? B : o.orient === "A" ? A : (best === "B" ? B : A);
    var bw = ch.cols * ch.iw, bh = ch.rows * ch.ih, bx = zx + (zw - bw) / 2, by = zy + (zh - bh) / 2, pieces = [];
    for (var r = 0; r < ch.rows; r++) for (var c = 0; c < ch.cols; c++) pieces.push({ x: bx + c * ch.iw, y: by + r * ch.ih, w: ch.iw, h: ch.ih, rot: ch.rot });
    var rm = Math.max(5, mx / 2);
    return {
      sheet: sh, A: A, B: B, best: best, chosen: ch, pieces: pieces, bleed: b, marks: !!o.marks, w: w, h: h,
      zone: { x: zx, y: zy, w: zw, h: zh }, block: { x: bx, y: by, w: bw, h: bh },
      regMarks: [{ x: rm, y: sh.h / 2 }, { x: sh.w - rm, y: sh.h / 2 }]
    };
  }

  function effPpi(art, w, h) { if (!art || art.vector || !art.pxW || !w || !h) return Infinity; return Math.min(art.pxW / (w / 25.4), art.pxH / (h / 25.4)); }

  function preflight(o, art, L) {
    var pl = byId(PLATES, o.plate), sh = L.sheet, press = PLATES[0], out = [];
    out.push({ id: "plate", ok: !!pl && pl.id === "cd102", label: "Plancha compatible con la CD 102",
      detail: !pl ? "Elige un formato de plancha." : pl.id === "cd102" ? "790 × 1030 mm, como indica la ficha técnica de la CD 102." :
        "La plancha de " + pl.w + " × " + pl.h + " mm es de la " + pl.press.split(" (")[0] + ": no calza en los cilindros portaplancha de la CD 102 (790 × 1030 mm)." });
    var sOk = sh.w <= press.sheetMax[0] && sh.h <= press.sheetMax[1] && sh.w >= press.sheetMin[0] && sh.h >= press.sheetMin[1];
    out.push({ id: "sheet", ok: sOk, label: "Pliego dentro del rango de la máquina",
      detail: sOk ? sh.label + ": dentro del rango de la CD 102 (de 34 × 48 cm a 72 × 102 cm)." : sh.label + " está fuera del rango de la CD 102 (mín. 34 × 48 cm, máx. 72 × 102 cm)." });
    var bOk = L.bleed >= 3;
    out.push({ id: "bleed", ok: bOk, label: "Sangrado mínimo de 3 mm",
      detail: bOk ? L.bleed + " mm por lado: el corte no dejará filetes blancos." : "Sin sangrado, un desvío de 1 mm en la guillotina deja un filete blanco en el borde." });
    var n = L.chosen.n;
    out.push({ id: "fit", ok: n >= 1 && sOk, label: "El arte con sangrado cabe en el área imprimible",
      detail: n >= 1 ? n + (n === 1 ? " copia" : " copias") + " por pliego (" + L.chosen.cols + " × " + L.chosen.rows + ") dentro de " + Math.round(L.zone.w) + " × " + Math.round(L.zone.h) + " mm útiles." :
        "El arte (" + (L.w + 2 * L.bleed) + " × " + (L.h + 2 * L.bleed) + " mm con sangrado) no entra en el área útil (" + Math.round(L.zone.w) + " × " + Math.round(L.zone.h) + " mm)." });
    var mx = Math.max(L.A.n, L.B.n), oOk = !!o.orient && L[o.orient].n === mx && mx > 0;
    out.push({ id: "orient", ok: oOk, label: "Orientación con el mejor aprovechamiento",
      detail: !o.orient ? "Elige la orientación A o B." : oOk ? "Elegiste la que da más copias por pliego (" + mx + ")." : "La otra orientación da " + mx + " copias; la tuya, " + L[o.orient].n + "." });
    var ppi = effPpi(art, L.w, L.h), pOk = ppi === Infinity ? true : ppi >= 300 ? true : ppi >= 200 ? "warn" : false;
    out.push({ id: "ppi", ok: pOk, label: "Resolución efectiva de 300 ppp o más",
      detail: ppi === Infinity ? "Arte vectorial o de muestra: no pierde nitidez al escalar." : Math.round(ppi) + " ppp al tamaño final" +
        (pOk === "warn" ? ": aceptable, pero las fotos se verán algo blandas." : pOk ? "." : ": insuficiente; reduce el tamaño final o usa un archivo de mayor resolución.") });
    out.push({ id: "marks", ok: !!o.marks, label: "Marcas de corte y registro, y tira de control",
      detail: o.marks ? "El maquinista podrá medir densidades y revisar el registro." : "Sin marcas no se puede controlar el registro ni medir la tira de control." });
    return out;
  }

  /* Vista previa del pliego (imposición) para la interfaz. */
  function drawPreview(cv, L, art) {
    var Wd = Math.max(280, Math.round(cv.clientWidth || 560)), k = Wd / L.sheet.w, Hd = Math.round(L.sheet.h * k);
    cv.width = Wd; cv.height = Hd;
    var g = cv.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, Wd, Hd);
    // pinza
    g.save(); g.beginPath(); g.rect(0, (L.sheet.h - GRIP) * k, Wd, GRIP * k); g.clip();
    g.strokeStyle = "rgba(243,161,0,.75)"; g.lineWidth = 2;
    for (var x = -Hd; x < Wd + Hd; x += 9) { g.beginPath(); g.moveTo(x, Hd); g.lineTo(x + GRIP * k + 4, (L.sheet.h - GRIP) * k - 4); g.stroke(); }
    g.restore();
    // área útil
    g.setLineDash([5, 4]); g.strokeStyle = "#0072b9"; g.lineWidth = 1;
    g.strokeRect(L.zone.x * k, L.zone.y * k, L.zone.w * k, L.zone.h * k); g.setLineDash([]);
    // piezas
    L.pieces.forEach(function (p) {
      g.save();
      if (art && art.canvas) {
        if (p.rot) { g.translate((p.x + p.w) * k, p.y * k); g.rotate(Math.PI / 2); g.drawImage(art.canvas, 0, 0, p.h * k, p.w * k); }
        else g.drawImage(art.canvas, p.x * k, p.y * k, p.w * k, p.h * k);
      } else { g.fillStyle = "#dfe9f2"; g.fillRect(p.x * k, p.y * k, p.w * k, p.h * k); }
      g.restore();
      if (L.bleed > 0) { g.strokeStyle = "rgba(230,0,126,.8)"; g.lineWidth = 1; g.strokeRect((p.x + L.bleed) * k, (p.y + L.bleed) * k, (p.w - 2 * L.bleed) * k, (p.h - 2 * L.bleed) * k); }
    });
    if (L.marks) {
      var cols = ["#00a0e3", "#e6007e", "#ffd400", "#1d1d1b"];
      for (var i = 0, xx = L.zone.x; xx < L.zone.x + L.zone.w - 6; xx += 6, i++) { g.fillStyle = cols[i % 4]; g.fillRect(xx * k, 3 * k, 6 * k - 0.5, 6 * k); }
      g.strokeStyle = "#1d1d1b"; g.lineWidth = 1;
      L.regMarks.forEach(function (m) { g.beginPath(); g.arc(m.x * k, m.y * k, 3 * k + 1.5, 0, 7); g.moveTo((m.x - 5) * k, m.y * k); g.lineTo((m.x + 5) * k, m.y * k); g.moveTo(m.x * k, (m.y - 5) * k); g.lineTo(m.x * k, (m.y + 5) * k); g.stroke(); });
    }
    g.strokeStyle = "#555553"; g.lineWidth = 1; g.strokeRect(0.5, 0.5, Wd - 1, Hd - 1);
    g.fillStyle = "#8a5a00"; g.font = "600 11px 'JetBrains Mono', Consolas, monospace";
    g.fillText("PINZA " + GRIP + " mm (10–12) · entra primero", 8, Hd - 3);
    g.fillStyle = "#00517f"; g.textAlign = "right"; g.fillText("Pliego " + L.sheet.w + " × " + L.sheet.h + " mm · área útil " + Math.round(L.zone.w) + " × " + Math.round(L.zone.h) + " mm", Wd - 8, 22); g.textAlign = "left";
  }

  /* Miniatura de una orientación (A o B) para el selector. */
  function drawOrient(cv, L, which) {
    var f = L[which], W = cv.width, H = cv.height, k = Math.min((W - 8) / L.sheet.w, (H - 8) / L.sheet.h), ox = (W - L.sheet.w * k) / 2, oy = (H - L.sheet.h * k) / 2;
    var g = cv.getContext("2d"); g.clearRect(0, 0, W, H);
    g.fillStyle = "#fff"; g.fillRect(ox, oy, L.sheet.w * k, L.sheet.h * k); g.strokeStyle = "#868686"; g.strokeRect(ox + 0.5, oy + 0.5, L.sheet.w * k - 1, L.sheet.h * k - 1);
    g.fillStyle = "rgba(243,161,0,.45)"; g.fillRect(ox, oy + (L.sheet.h - GRIP) * k, L.sheet.w * k, GRIP * k);
    var bw = f.cols * f.iw, bh = f.rows * f.ih, bx = L.zone.x + (L.zone.w - bw) / 2, by = L.zone.y + (L.zone.h - bh) / 2;
    for (var r = 0; r < f.rows; r++) for (var c = 0; c < f.cols; c++) {
      g.fillStyle = (r + c) % 2 ? "#5aa7d8" : "#0072b9"; g.fillRect(ox + (bx + c * f.iw) * k + 1, oy + (by + r * f.ih) * k + 1, f.iw * k - 2, f.ih * k - 2);
    }
  }

  /* ---------- pliego, separación y planchas ---------- */
  function line(m, x1, y1, x2, y2) { m.moveTo(x1 * S, y1 * S); m.lineTo(x2 * S, y2 * S); }
  function regMark(m, x, y) { m.beginPath(); m.arc(x * S, y * S, 3 * S, 0, Math.PI * 2); line(m, x - 4.5, y, x + 4.5, y); line(m, x, y - 4.5, x, y + 4.5); m.stroke(); }

  function buildSheet(art, L) {
    var W = Math.round(L.sheet.w * S), H = Math.round(L.sheet.h * S);
    var rgb = document.createElement("canvas"); rgb.width = W; rgb.height = H;
    var g = rgb.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    var mk = document.createElement("canvas"); mk.width = W; mk.height = H;
    var m = mk.getContext("2d");
    L.pieces.forEach(function (p) {
      g.save();
      if (p.rot) { g.translate((p.x + p.w) * S, p.y * S); g.rotate(Math.PI / 2); g.drawImage(art.canvas, 0, 0, p.h * S, p.w * S); }
      else g.drawImage(art.canvas, p.x * S, p.y * S, p.w * S, p.h * S);
      g.restore();
    });
    if (L.marks) {
      m.strokeStyle = "#000"; m.lineWidth = Math.max(1, 0.25 * S);
      var b = L.bleed, bl = L.block, ch = L.chosen, len = 5, off = b + 1.5, xs = [], ys = [], c, r;
      for (c = 0; c < ch.cols; c++) { xs.push(bl.x + c * ch.iw + b); xs.push(bl.x + (c + 1) * ch.iw - b); }
      for (r = 0; r < ch.rows; r++) { ys.push(bl.y + r * ch.ih + b); ys.push(bl.y + (r + 1) * ch.ih - b); }
      m.beginPath();
      xs.forEach(function (x) { line(m, x, bl.y - off - len, x, bl.y - off); line(m, x, bl.y + bl.h + off, x, bl.y + bl.h + off + len); });
      ys.forEach(function (y) { line(m, bl.x - off - len, y, bl.x - off, y); line(m, bl.x + bl.w + off, y, bl.x + bl.w + off + len, y); });
      m.stroke();
      L.regMarks.forEach(function (rm) { regMark(m, rm.x, rm.y); });
    }
    return { rgb: rgb, marks: mk, W: W, H: H };
  }

  var BAR = [{ C: 255 }, { M: 255 }, { Y: 255 }, { K: 255 }, { C: 128 }, { M: 128 }, { Y: 128 }, { K: 128 }, { C: 128, M: 100, Y: 100 }];
  function colorBar(sep, L) {
    var x0 = Math.round(L.zone.x * S), x1 = Math.round((L.zone.x + L.zone.w) * S), y0 = Math.round(3 * S), y1 = Math.round(9 * S), pw = Math.round(6 * S);
    for (var x = x0; x < x1; x++) {
      var p = BAR[Math.floor((x - x0) / pw) % BAR.length];
      for (var y = y0; y < y1; y++) { var i = y * sep.w + x; sep.C[i] = p.C || 0; sep.M[i] = p.M || 0; sep.Y[i] = p.Y || 0; sep.K[i] = p.K || 0; }
    }
  }

  /* Separación RGB → CMYK simplificada (GCR total). Las marcas de registro van al 100 % en las cuatro planchas. */
  function separate(sb, L) {
    var W = sb.W, H = sb.H, N = W * H;
    var px = sb.rgb.getContext("2d").getImageData(0, 0, W, H).data, mk = sb.marks.getContext("2d").getImageData(0, 0, W, H).data;
    var C = new Uint8ClampedArray(N), M = new Uint8ClampedArray(N), Y = new Uint8ClampedArray(N), K = new Uint8ClampedArray(N);
    for (var i = 0, j = 0; i < N; i++, j += 4) {
      if (mk[j + 3] > 100) { C[i] = 255; M[i] = 255; Y[i] = 255; K[i] = 255; continue; }
      var r = px[j] / 255, g = px[j + 1] / 255, b = px[j + 2] / 255, mxv = r > g ? (r > b ? r : b) : (g > b ? g : b), k = 1 - mxv;
      if (k > 0.995) { K[i] = 255; continue; }
      var d = 1 - k;
      C[i] = (1 - r - k) / d * 255; M[i] = (1 - g - k) / d * 255; Y[i] = (1 - b - k) / d * 255; K[i] = k * 255;
    }
    var sep = { w: W, h: H, C: C, M: M, Y: Y, K: K, L: L };
    if (L.marks) colorBar(sep, L);
    return sep;
  }

  function plateCanvas(sep, ink, techId, job) {
    var pl = PLATES[0], tech = byId(TECH, techId) || TECH[0], k = 0.6, W = Math.round(pl.w * k), H = Math.round(pl.h * k);
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var g = c.getContext("2d"), id = g.createImageData(W, H), d = id.data, ch = sep[ink], N = noises(W, H);
    /* El borde inferior del lienzo es el borde delantero de la plancha (el que sujeta la mordaza):
       la imagen empieza a LEAD mm de ese borde y coincide con el inicio de impresión del pliego (pinza + GRIP). */
    var offX = (pl.w - sep.L.sheet.w) / 2, offY = (pl.h - LEAD) - (sep.L.sheet.h - GRIP), base = [205, 212, 218], co = tech.coat, contrast = techId === "processless" ? 0.55 : 1;
    for (var y = 0; y < H; y++) {
      var sy = ((y / k - offY) * S) | 0;
      for (var x = 0; x < W; x++) {
        var sx = ((x / k - offX) * S) | 0, v = 0;
        if (sx >= 0 && sy >= 0 && sx < sep.w && sy < sep.h) v = ch[sy * sep.w + sx] / 255 * contrast;
        var gr = (N.hf[y * W + x] - 128) / 128 * 6, o = (y * W + x) * 4;
        d[o] = base[0] + (co[0] - base[0]) * v + gr; d[o + 1] = base[1] + (co[1] - base[1]) * v + gr; d[o + 2] = base[2] + (co[2] - base[2]) * v + gr; d[o + 3] = 255;
      }
    }
    g.putImageData(id, 0, 0);
    g.fillStyle = "rgba(60,64,70,.85)";
    [0.3, 0.7].forEach(function (f) { roundRect(g, W * f - 10, H - 9, 20, 5, 2); g.fill(); });
    g.fillStyle = "rgba(30,35,40,.8)"; g.font = "600 10px 'JetBrains Mono', Consolas, monospace";
    g.fillText("CD 102 · 790×1030 mm · " + INKS[ink].name.toUpperCase() + " (" + ink + ") · " + tech.name + " · 175 lpi" + (job ? " · " + job : ""), 10, 14);
    g.fillStyle = INKS[ink].hex; g.beginPath(); g.arc(W - 16, 12, 7, 0, 7); g.fill();
    g.strokeStyle = "rgba(0,0,0,.35)"; g.stroke();
    // blancos de mordaza (delantero y de cola) y área máxima de impresión
    var yLead = H - LEAD * k, yTail = (pl.h - LEAD - pl.print[1]) * k, xs = (pl.w - pl.print[0]) / 2 * k;
    g.save(); g.setLineDash([6, 4]); g.strokeStyle = "rgba(0,81,127,.55)"; g.lineWidth = 1;
    g.strokeRect(xs, yTail, W - 2 * xs, yLead - yTail); g.restore();
    g.fillStyle = "rgba(243,161,0,.16)"; g.fillRect(0, yLead, W, H - yLead); g.fillRect(0, 0, W, yTail);
    g.fillStyle = "rgba(60,40,0,.75)"; g.font = "600 9px 'JetBrains Mono', Consolas, monospace";
    g.fillText("BLANCO DE MORDAZA " + LEAD + " mm · borde delantero", 10, H - 12);
    g.fillText("BLANCO DE COLA " + (pl.h - LEAD - pl.print[1]) + " mm", W - 150, yTail - 4 > 20 ? yTail - 4 : 26);
    return c;
  }

  /* Superficie entintada de un cilindro (plancha o mantilla) para la vista 3D: muestra cómo el agua y la tinta
     de un cuerpo quedan en la plancha y pasan, invertidas, a la mantilla. */
  function cylSurface(sep, ink, P, kind) {
    var pl = PLATES[0], k = 0.42, W = Math.round(pl.w * k), H = Math.round(pl.h * k), blanket = kind === "blanket";
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var g = c.getContext("2d"), id = g.createImageData(W, H), d = id.data, ch = sep[ink], N = noises(W, H), p = P.inks[ink], col = INKS[ink].rgb;
    var offX = (pl.w - sep.L.sheet.w) / 2, offY = (pl.h - LEAD) - (sep.L.sheet.h - GRIP);
    var base = blanket ? [124, 138, 152] : [205, 212, 218], water = p.water == null ? 45 : p.water;
    var film = clamp((water - 20) / 70, 0, 1), sA = Math.min(1, 0.35 + 0.65 * p.s) * (blanket ? 0.85 : 0.95);
    for (var y = 0; y < H; y++) {
      var sy = ((y / k - offY) * S) | 0;
      for (var x = 0; x < W; x++) {
        var xx = blanket ? W - 1 - x : x, sx = ((xx / k - offX) * S) | 0, v = 0, i = y * W + x, o = i * 4;
        if (sx >= 0 && sy >= 0 && sx < sep.w && sy < sep.h) v = ch[sy * sep.w + sx] / 255;
        var r = base[0], gg = base[1], b = base[2], a = v * sA;
        if (p.wash && v > 0.05 && N.md[i] > 255 * (1 - p.wash * 0.5)) a *= 0.45;
        if (v < 0.08) {
          if (!blanket) { r += (170 - r) * film * 0.5; gg += (205 - gg) * film * 0.5; b += (232 - b) * film * 0.5; }
          if (p.scum && N.lf[i] > 255 * (1 - p.scum * 0.75)) a = Math.max(a, 0.18 + 0.3 * p.scum);
          if (blanket && p.wash && N.hf[i] > 230) { r = 225; gg = 232; b = 238; }
        }
        r += (col[0] - r) * a; gg += (col[1] - gg) * a; b += (col[2] - b) * a;
        var gr = (N.hf[i] - 128) / 128 * (blanket ? 3 : 5);
        d[o] = r + gr; d[o + 1] = gg + gr; d[o + 2] = b + gr; d[o + 3] = 255;
      }
    }
    g.putImageData(id, 0, 0);
    if (blanket) { g.fillStyle = "rgba(30,35,40,.7)"; g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6); }
    return c;
  }

  /* Diagrama acotado de la plancha y el pliego. mode: "plate" | "sheet" | "both". */
  function dimSvg(plateId, sheetId, mode) {
    var pl = byId(PLATES, plateId) || PLATES[0], sh = byId(SHEETS, sheetId) || SHEETS[0], k = 400 / pl.w;
    var x0 = 140, y0 = 64, w = pl.w * k, h = pl.h * k, H = Math.round(y0 + h + 92), detail = !!pl.lead;
    function n(v) { return String(v).replace(".", ","); }
    function dimH(xa, xb, y, t) { return '<line x1="' + xa + '" y1="' + y + '" x2="' + xb + '" y2="' + y + '" class="dl" marker-start="url(#dA)" marker-end="url(#dA)"/><text x="' + (xa + xb) / 2 + '" y="' + (y - 6) + '" text-anchor="middle" class="dt">' + t + '</text>'; }
    function dimV(x, ya, yb, t, side) { var tx = side === "r" ? x + 8 : x - 8; return '<line x1="' + x + '" y1="' + ya + '" x2="' + x + '" y2="' + yb + '" class="dl" marker-start="url(#dA)" marker-end="url(#dA)"/><text x="' + tx + '" y="' + ((ya + yb) / 2 + 4) + '" text-anchor="' + (side === "r" ? "start" : "end") + '" class="dt">' + t + '</text>'; }
    var s = '<svg viewBox="0 0 760 ' + H + '" class="dim-svg" role="img" aria-label="Medidas de la plancha ' + pl.w + ' × ' + pl.h + ' mm y del pliego ' + sh.label + '">';
    s += '<defs><marker id="dA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9z" fill="#00517f"/></marker>' +
      '<pattern id="hA" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#fff4e0"/><line x1="0" y1="0" x2="0" y2="7" stroke="#f3a100" stroke-width="2.5"/></pattern>' +
      '<pattern id="hG" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#eceef0"/><line x1="0" y1="0" x2="0" y2="7" stroke="#9aa3ab" stroke-width="2.5"/></pattern>' +
      '<pattern id="hO" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="6" height="6" fill="#fde3cf"/><line x1="0" y1="0" x2="0" y2="6" stroke="#e05a00" stroke-width="2"/></pattern></defs>';
    var plateOp = mode === "sheet" ? 0.35 : 1;
    s += '<g opacity="' + plateOp + '"><rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" fill="#cfd6dc" stroke="#555553" stroke-width="2"/>';
    if (detail) {
      var tail = pl.h - pl.lead - pl.print[1], side = (pl.w - pl.print[0]) / 2;
      s += '<rect x="' + x0 + '" y="' + (y0 + h - pl.lead * k) + '" width="' + w + '" height="' + pl.lead * k + '" fill="url(#hA)"/>';
      s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + tail * k + '" fill="url(#hG)"/>';
      s += '<rect x="' + (x0 + side * k) + '" y="' + (y0 + tail * k) + '" width="' + pl.print[0] * k + '" height="' + pl.print[1] * k + '" fill="none" stroke="#0072b9" stroke-width="1.5" stroke-dasharray="7 5"/>';
      if (mode === "plate") s += '<text x="' + (x0 + w / 2) + '" y="' + (y0 + h / 2) + '" text-anchor="middle" class="dt">Área máxima de impresión ' + pl.print[0] + ' × ' + pl.print[1] + ' mm</text>';
      s += '<text x="' + (x0 + w + 12) + '" y="' + (y0 + h - pl.lead * k / 2 + 4) + '" class="dt am">Mordaza ' + n(pl.lead) + ' mm' + (pl.leadOpt ? ' (' + pl.leadOpt + ' opc.)' : '') + '</text>';
      s += '<text x="' + (x0 + w + 12) + '" y="' + (y0 + tail * k / 2 + 4) + '" class="dt">Cola ' + n(tail) + ' mm (deducido)</text>';
      s += '<text x="' + (x0 + w + 12) + '" y="' + (y0 + h / 2 + 4) + '" class="dt az">Laterales ' + n(side) + ' mm</text>';
    } else {
      s += '<text x="' + (x0 + w / 2) + '" y="' + (y0 + h / 2) + '" text-anchor="middle" class="dt">Sin datos de mordaza: consulta la ficha técnica.</text>';
    }
    s += dimH(x0, x0 + w, y0 - 26, "Plancha " + pl.w + " mm (ancho)") + dimV(x0 - 24, y0, y0 + h, pl.h + " mm", "l") + '</g>';
    if (mode !== "plate") {
      var sx = x0 + (pl.w - sh.w) / 2 * k, lead = detail ? pl.lead - GRIP : (pl.h - sh.h) / 2, sb = y0 + h - lead * k, st = sb - sh.h * k;
      s += '<rect x="' + sx + '" y="' + st + '" width="' + sh.w * k + '" height="' + sh.h * k + '" fill="rgba(255,255,255,' + (mode === "sheet" ? 0.95 : 0.55) + ')" stroke="#e05a00" stroke-width="2"/>';
      s += '<rect x="' + sx + '" y="' + (sb - GRIP * k) + '" width="' + sh.w * k + '" height="' + GRIP * k + '" fill="url(#hO)"/>';
      s += '<text x="' + (sx + 8) + '" y="' + (st + 18) + '" class="dt or">Pliego ' + sh.label + '</text>';
      s += '<text x="' + (sx + sh.w * k / 2) + '" y="' + (sb - GRIP * k - 6) + '" text-anchor="middle" class="dt or">Pinza del pliego ' + GRIP + ' mm (ficha: ' + (pl.grip || "—") + ')</text>';
      s += dimH(sx, sx + sh.w * k, y0 + h + 30, sh.w + " mm") + dimV(x0 - 80, st, sb, sh.h + " mm", "l");
    }
    s += '<text x="' + (x0 + w / 2) + '" y="' + (H - 14) + '" text-anchor="middle" class="dt">▼ Borde delantero: entra primero a la máquina (mordaza de la plancha · pinzas del pliego)</text>';
    return s + '</svg>';
  }

  /* ---------- modelo de impresión ---------- */
  function makeSeed(n) {
    var r = rng(n || ((Date.now() & 0xffffff) + 7)), s = { ideal: {}, prof: {}, reg: {} };
    function sg() { return r() < 0.5 ? -1 : 1; }
    ORDER.forEach(function (k) {
      s.ideal[k] = Math.round(44 + r() * 16);
      var ph = r() * 6.28, f = 1 + r() * 1.5, amp = 0.12 + r() * 0.06, a = [];
      for (var z = 0; z < ZONES; z++) a.push(+(1 + amp * Math.sin(ph + f * 6.283 * z / ZONES)).toFixed(3));
      s.prof[k] = a;
      if (k !== "K") s.reg[k] = [r2(sg() * (0.15 + r() * 0.45)), r2(sg() * (0.10 + r() * 0.40))];
    });
    return s;
  }

  /* ctl = {feed:[4], water:[4], press, cip3, reg:{C:[circ,lat],M,Y}} en orden de cuerpos K, C, M, Y. */
  function measure(ctl, seed) {
    var p = ctl.press, out = { inks: {}, press: p, ok: true };
    var mottle = p < 0.10 ? clamp((0.10 - p) / 0.08, 0, 1) : 0, gain = p > 0.15 ? clamp((p - 0.15) / 0.10, 0, 1) * 0.12 : 0, dbl = p > 0.17 ? clamp((p - 0.17) / 0.08, 0, 1) : 0;
    out.mottle = mottle; out.gain = gain; out.dbl = dbl; out.pressOk = p >= 0.0999 && p <= 0.1501;
    ORDER.forEach(function (k, i) {
      var ink = INKS[k], f = ctl.feed[i], w = ctl.water[i], film = f / seed.ideal[k];
      var s = (1 - Math.exp(-1.7 * film)) / (1 - Math.exp(-1.7)), wash = 0, scum = 0;
      if (w > 55) { s *= 1 - (w - 55) / 90; wash = clamp((w - 55) / 35, 0, 1); }
      if (w < 35) { scum = clamp((35 - w) / 30, 0, 1); s *= 1 + (35 - w) / 250; }
      s *= 1 - 0.25 * mottle;
      var prof = ctl.cip3 ? null : seed.prof[k], pmin = 1, pmax = 1;
      if (prof) { pmin = Math.min.apply(null, prof); pmax = Math.max.apply(null, prof); }
      var D = r2(ink.target * s), Dmin = r2(D * pmin), Dmax = r2(D * pmax), tvi = Math.round(clamp(14 + 18 * (s - 1) + 100 * gain, 4, 40));
      var reg = k === "K" ? [0, 0] : [r2(seed.reg[k][0] + ctl.reg[k][0]), r2(seed.reg[k][1] + ctl.reg[k][1])];
      var res = { k: k, s: s, D: D, Dmin: Dmin, Dmax: Dmax, tvi: tvi, scum: scum, wash: wash, reg: reg, prof: prof, feed: f, water: w };
      res.dOk = Math.abs(D - ink.target) <= ink.tol + 0.0001;
      res.uOk = r2(Dmax - Dmin) <= 0.10;
      res.wOk = w >= 35 && w <= 55;
      res.tOk = tvi >= 11 && tvi <= 17;
      res.rOk = Math.abs(reg[0]) <= 0.05 && Math.abs(reg[1]) <= 0.05;
      res.ok = res.dOk && res.uOk && res.wOk && res.tOk && res.rOk;
      if (!res.ok) out.ok = false;
      out.inks[k] = res;
    });
    if (!out.pressOk) out.ok = false;
    return out;
  }

  function paramsFrom(m) {
    var P = { inks: {}, gain: m.gain, mottle: m.mottle, dbl: m.dbl };
    ORDER.forEach(function (k) { var r = m.inks[k]; P.inks[k] = { s: r.s, prof: r.prof, scum: r.scum, wash: r.wash, water: r.water, dy: r.reg[0], dx: r.reg[1] }; });
    return P;
  }
  function idealParams() {
    var P = { inks: {}, gain: 0, mottle: 0, dbl: 0 };
    ORDER.forEach(function (k) { P.inks[k] = { s: 1, prof: null, scum: 0, wash: 0, water: 45, dx: 0, dy: 0 }; });
    return P;
  }

  function buildLuts(P, inks) {
    var L = {};
    inks.forEach(function (k) {
      var ink = INKS[k], p = P.inks[k], T = [0, 1, 2].map(function (c) { return Math.max(0.03, ink.rgb[c] / PAPER[c]); }), zl = [];
      for (var z = 0; z < ZONES; z++) {
        var s = p.s * (p.prof ? p.prof[z] : 1), a0 = Math.min(1, 0.3 + 0.7 * s), e = Math.max(0.5, s);
        var t = [Math.pow(T[0], e), Math.pow(T[1], e), Math.pow(T[2], e)], lut = new Float32Array(768);
        for (var v = 0; v < 256; v++) { var a = v / 255 * a0; lut[v * 3] = 1 - a + a * t[0]; lut[v * 3 + 1] = 1 - a + a * t[1]; lut[v * 3 + 2] = 1 - a + a * t[2]; }
        zl.push(lut);
      }
      L[k] = zl;
    });
    return L;
  }

  /* Pliego impreso simulado. opt: {w: ancho de salida, inks: subconjunto (para los cuerpos), exag: ampliación de desplazamientos, canvas}. */
  function composite(sep, P, opt) {
    opt = opt || {};
    var inks = opt.inks || ORDER, ow = Math.round(opt.w || sep.w), oh = Math.round(ow * sep.h / sep.w), fx = sep.w / ow, fy = sep.h / oh, exag = opt.exag || 1;
    var cv = opt.canvas || document.createElement("canvas"); cv.width = ow; cv.height = oh;
    var g = cv.getContext("2d"), id = g.createImageData(ow, oh), d = id.data, N = noises(sep.w, sep.h), luts = buildLuts(P, inks);
    var W = sep.w, H = sep.h, zw = W / ZONES, gain = P.gain || 0, mot = P.mottle || 0, dbl = P.dbl || 0, dpx = Math.max(1, Math.round(1.4 * S * exag));
    var dr = P.dblRegion ? [P.dblRegion.x0 * S, P.dblRegion.x1 * S, P.dblRegion.y0 * S, P.dblRegion.y1 * S] : null;
    var Ls = inks.map(function (k) {
      var p = P.inks[k], sr = p.scumRegion;
      return { ch: sep[k], lut: luts[k], dx: Math.round((p.dx || 0) * S * exag), dy: Math.round((p.dy || 0) * S * exag), scum: (p.scum || 0) * 95, wash: p.wash || 0,
        sr: sr ? [sr.x0 * S, sr.x1 * S, sr.y0 * S, sr.y1 * S] : null };
    });
    var nI = Ls.length, lf = N.lf, md = N.md;
    for (var oy = 0; oy < oh; oy++) {
      var y = (oy * fy) | 0;
      for (var ox = 0; ox < ow; ox++) {
        var x = (ox * fx) | 0, i = y * W + x, z = (x / zw) | 0, R = 1, G = 1, B = 1;
        if (z >= ZONES) z = ZONES - 1;
        for (var n = 0; n < nI; n++) {
          var s = Ls[n], xx = x - s.dx, yy = y - s.dy, v = 0;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H) {
            v = s.ch[yy * W + xx];
            if (dbl && yy >= dpx && (!dr || (x >= dr[0] && x < dr[1] && y >= dr[2] && y < dr[3]))) { var v2 = s.ch[(yy - dpx) * W + xx] * 0.55 * dbl; if (v2 > v) v = v2; }
          }
          if (s.scum && (!s.sr || (x >= s.sr[0] && x < s.sr[1] && y >= s.sr[2] && y < s.sr[3]))) { var sc = s.scum * (0.35 + 0.65 * lf[i] / 255); if (sc > v) v = sc; }
          if (v > 0) {
            if (gain) v += gain * 4 * v * (255 - v) / 255;
            if (mot) v *= 1 - mot * 0.55 * md[i] / 255;
            if (s.wash && md[i] > 255 * (1 - s.wash * 0.4)) v *= 0.5;
            if (v > 255) v = 255;
          }
          var q = (v | 0) * 3, lut = s.lut[z];
          R *= lut[q]; G *= lut[q + 1]; B *= lut[q + 2];
        }
        var o = (oy * ow + ox) * 4;
        d[o] = PAPER[0] * R; d[o + 1] = PAPER[1] * G; d[o + 2] = PAPER[2] * B; d[o + 3] = 255;
      }
    }
    g.putImageData(id, 0, 0);
    if (P.hickeys) P.hickeys.forEach(function (hk) {
      var cx = hk.x * S / fx, cy = hk.y * S / fy, rr = Math.max(2, hk.r * S / fx);
      g.fillStyle = "rgb(250,249,245)"; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill();
      g.fillStyle = "rgba(20,20,20,.92)"; g.beginPath(); g.arc(cx, cy, rr * 0.38, 0, 7); g.fill();
    });
    return cv;
  }

  /* ---------- cuentahílos ---------- */
  function sampleCh(ch, W, H, x, y) {
    if (x < 0 || y < 0 || x >= W - 1 || y >= H - 1) return 0;
    var x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * W + x0;
    return (ch[i] * (1 - fx) + ch[i + 1] * fx) * (1 - fy) + (ch[i + W] * (1 - fx) + ch[i + W + 1] * fx) * fy;
  }
  var layerCv = null;
  function loupe(cv, sep, P, mmX, mmY, opt) {
    opt = opt || {};
    var g = cv.getContext("2d"), Wc = cv.width, R = Wc / 2, ppm = opt.ppm || 40, cell = ppm / LPMM, exag = opt.exag || 1;
    if (!layerCv) layerCv = document.createElement("canvas");
    layerCv.width = Wc; layerCv.height = Wc;
    var lg = layerCv.getContext("2d"), luts = buildLuts(P, ORDER), zw = sep.w / ZONES, N = noises(sep.w, sep.h);
    g.save(); g.clearRect(0, 0, Wc, Wc); g.beginPath(); g.arc(R, R, R - 3, 0, Math.PI * 2); g.clip();
    g.fillStyle = "rgb(" + PAPER.join(",") + ")"; g.fillRect(0, 0, Wc, Wc);
    var hk = null;
    if (P.hickeys) P.hickeys.forEach(function (h) { if (Math.abs(h.x - mmX) < 40 && Math.abs(h.y - mmY) < 40) hk = h; });
    ORDER.forEach(function (k) {
      var p = P.inks[k], ink = INKS[k], a = ink.ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), n = Math.ceil(Wc / cell) + 2;
      var z = clamp((mmX * S / zw) | 0, 0, ZONES - 1), lut = luts[k][z], sr = p.scumRegion;
      lg.clearRect(0, 0, Wc, Wc);
      lg.fillStyle = "rgb(" + Math.round(PAPER[0] * lut[765]) + "," + Math.round(PAPER[1] * lut[766]) + "," + Math.round(PAPER[2] * lut[767]) + ")";
      for (var i = -n; i <= n; i++) for (var j = -n; j <= n; j++) {
        var u = i * cell, w = j * cell, px = R + u * ca - w * sa, py = R + u * sa + w * ca;
        if (px < -cell || py < -cell || px > Wc + cell || py > Wc + cell) continue;
        var mx = mmX + (px - R) / ppm, my = mmY + (py - R) / ppm;
        var v = sampleCh(sep[k], sep.w, sep.h, (mx - (p.dx || 0) * exag) * S, (my - (p.dy || 0) * exag) * S);
        if (P.dbl && (!P.dblRegion || (mx >= P.dblRegion.x0 && mx < P.dblRegion.x1 && my >= P.dblRegion.y0 && my < P.dblRegion.y1))) {
          var v2 = sampleCh(sep[k], sep.w, sep.h, (mx - (p.dx || 0) * exag) * S, (my - (p.dy || 0) * exag - 1.4 * exag) * S) * 0.55 * P.dbl; if (v2 > v) v = v2;
        }
        var ii = ((my * S) | 0) * sep.w + ((mx * S) | 0);
        if (p.scum && (!sr || (mx >= sr.x0 && mx < sr.x1 && my >= sr.y0 && my < sr.y1))) { var sc = p.scum * 95 * (0.35 + 0.65 * (N.lf[ii] || 0) / 255); if (sc > v) v = sc; }
        v /= 255;
        if (P.gain) v += P.gain * 4 * v * (1 - v);
        if (P.mottle) v *= 1 - P.mottle * 0.55 * (N.md[ii] || 0) / 255;
        if (hk && Math.pow(mx - hk.x, 2) + Math.pow(my - hk.y, 2) < hk.r * hk.r) v = Math.pow(mx - hk.x, 2) + Math.pow(my - hk.y, 2) < Math.pow(hk.r * 0.38, 2) ? (k === "K" ? 1 : 0) : 0;
        if (v < 0.02) continue;
        var rad = cell * Math.sqrt(v / Math.PI); if (rad > cell * 0.75) rad = cell * 0.75;
        lg.beginPath(); lg.arc(px, py, rad, 0, 6.2832); lg.fill();
      }
      g.globalCompositeOperation = "multiply"; g.drawImage(layerCv, 0, 0); g.globalCompositeOperation = "source-over";
    });
    g.restore();
    g.strokeStyle = "rgba(40,40,40,.85)"; g.lineWidth = 5; g.beginPath(); g.arc(R, R, R - 3, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(R - 30, Wc - 26, 60, 16);
    g.fillStyle = "#1d1d1b"; g.font = "600 10px 'JetBrains Mono', Consolas, monospace"; g.textAlign = "center"; g.fillText("1 mm", R, Wc - 14); g.textAlign = "left";
    g.fillRect(R - ppm / 2, Wc - 30, ppm, 2);
  }

  /* Cuentahílos sobre la cruz de registro: regs = {C:[circ, lat], ...} en mm respecto del negro. */
  function regLoupe(cv, regs, opt) {
    var g = cv.getContext("2d"), W = cv.width, R = W / 2, ppm = (opt && opt.ppm) || 18;
    g.save(); g.clearRect(0, 0, W, W); g.beginPath(); g.arc(R, R, R - 3, 0, Math.PI * 2); g.clip();
    g.fillStyle = "rgb(" + PAPER.join(",") + ")"; g.fillRect(0, 0, W, W);
    g.globalCompositeOperation = "multiply"; g.lineWidth = Math.max(2, 0.22 * ppm);
    ORDER.forEach(function (k) {
      var r = regs[k] || [0, 0], cx = R + r[1] * ppm, cy = R + r[0] * ppm;
      g.strokeStyle = INKS[k].hex; g.beginPath(); g.arc(cx, cy, 3 * ppm, 0, Math.PI * 2);
      g.moveTo(cx - 4.5 * ppm, cy); g.lineTo(cx + 4.5 * ppm, cy); g.moveTo(cx, cy - 4.5 * ppm); g.lineTo(cx, cy + 4.5 * ppm); g.stroke();
    });
    g.restore();
    g.strokeStyle = "rgba(40,40,40,.85)"; g.lineWidth = 5; g.beginPath(); g.arc(R, R, R - 3, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#1d1d1b"; g.fillRect(R - ppm / 2, W - 24, ppm, 2);
    g.font = "600 10px 'JetBrains Mono', Consolas, monospace"; g.textAlign = "center"; g.fillText("1 mm", R, W - 10); g.textAlign = "left";
  }

  /* ---------- color: ΔE aproximado entre prueba y pliego ---------- */
  function lab(r, g, b) {
    function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    var R = lin(r), G = lin(g), B = lin(b);
    var X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    function f(t) { return t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116; }
    var fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  function deltaE(a, b) {
    var w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
    var da = a.getContext("2d").getImageData(0, 0, w, h).data, db = b.getContext("2d").getImageData(0, 0, w, h).data, sum = 0, n = 0;
    for (var y = 0; y < h; y += 3) for (var x = 0; x < w; x += 3) {
      var o = (y * w + x) * 4;
      if (da[o] + da[o + 1] + da[o + 2] > 735) continue;
      var A = lab(da[o], da[o + 1], da[o + 2]), B = lab(db[o], db[o + 1], db[o + 2]);
      sum += Math.sqrt((A[0] - B[0]) * (A[0] - B[0]) + (A[1] - B[1]) * (A[1] - B[1]) + (A[2] - B[2]) * (A[2] - B[2])); n++;
    }
    return n ? sum / n : 0;
  }

  /* ---------- el pliego defectuoso de anoche ---------- */
  function hotSpot(sep, piece) {
    var best = null, bv = -1, step = 15;
    for (var y = piece.y + 12; y < piece.y + piece.h - 12; y += step) for (var x = piece.x + 12; x < piece.x + piece.w - 12; x += step) {
      var sx = Math.round(x * S), sy = Math.round(y * S), v = 0, cnt = 0;
      for (var dy = -6; dy <= 6; dy += 3) for (var dx = -6; dx <= 6; dx += 3) { var i = (sy + Math.round(dy * S)) * sep.w + sx + Math.round(dx * S); v += sep.K[i] + 0.4 * (sep.C[i] + sep.M[i] + sep.Y[i]); cnt++; }
      v /= cnt; if (v > bv) { bv = v; best = { x: x, y: y }; }
    }
    return best || { x: piece.x + piece.w / 2, y: piece.y + piece.h / 2 };
  }
  function ghost(sep) {
    var L = sep.L, P = idealParams(), last = L.pieces[L.pieces.length - 1];
    P.inks.C.s = 0.93; P.inks.C.dy = -0.9; P.inks.Y.dx = 1.0; P.inks.Y.dy = 0.4;
    var sr = { x0: L.block.x + L.block.w + 8, x1: L.sheet.w - 16, y0: 30, y1: 290 };
    if (sr.x1 - sr.x0 < 20) { sr.x0 = L.sheet.w - 60; sr.x1 = L.sheet.w - 16; }
    P.inks.M.scum = 0.9; P.inks.M.scumRegion = sr;
    P.dbl = 1; P.dblRegion = { x0: last.x, x1: last.x + last.w, y0: last.y, y1: last.y + last.h };
    P.gain = 0.03;
    var hk = hotSpot(sep, L.pieces[0]);
    P.hickeys = [{ x: hk.x, y: hk.y, r: 7 }];
    var zones = [
      { id: "hick", x: hk.x, y: hk.y, r: 22 },
      { id: "reg", x: L.regMarks[0].x, y: L.regMarks[0].y, r: 26 },
      { id: "reg", x: L.regMarks[1].x, y: L.regMarks[1].y, r: 26 },
      { id: "scum", x: (sr.x0 + sr.x1) / 2, y: (sr.y0 + sr.y1) / 2, r: Math.max(45, (sr.y1 - sr.y0) / 2) },
      { id: "dbl", x: last.x + last.w / 2, y: last.y + last.h / 2, r: Math.min(last.w, last.h) * 0.45, rect: [last.x, last.y, last.x + last.w, last.y + last.h] }
    ];
    return { P: P, zones: zones };
  }

  return {
    S: S, GRIP: GRIP, LEAD: LEAD, LEAD_OPT: LEAD_OPT, ZONES: ZONES, INKS: INKS, ORDER: ORDER, PLATES: PLATES, TECH: TECH, SHEETS: SHEETS,
    byId: byId, sampleArt: sampleArt, loadArtFile: loadArtFile, artFromDataURL: artFromDataURL,
    layout: layout, preflight: preflight, effPpi: effPpi, drawPreview: drawPreview, drawOrient: drawOrient,
    buildSheet: buildSheet, separate: separate, plateCanvas: plateCanvas, cylSurface: cylSurface, dimSvg: dimSvg,
    makeSeed: makeSeed, measure: measure, paramsFrom: paramsFrom, idealParams: idealParams,
    composite: composite, loupe: loupe, regLoupe: regLoupe, deltaE: deltaE, ghost: ghost
  };
})();
