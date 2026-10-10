/* Simulador CD 102 · prensa offset 3D esquemática.
   three.js r128 (global THREE) + anime.js 3 (global anime, opcional). Modelo didáctico: no reproduce
   el diseño industrial ni la marca del fabricante. Numeración de partes = catálogo «Speedmaster CD 102».
   Incluye: zoom (rueda, botones, regulador) y paneo, transparencia graduable de las carcasas, flechas de
   circulación de agua y tinta en cada cuerpo, mantilla entintada, alimentación e impresión separadas y velocidad variable.
   ES5. Expone window.PRESS3D. */
window.PRESS3D = (function () {
  "use strict";
  var T = null, A = null, renderer, scene, camera, root, stage, labelsEl, canvas, clock, ray, mouse;
  var ready = false, visible = true, idle = true, run = false, feeding = false, impression = false, printing = false, reduced = false;
  var runSpeed = 0, spawnT = 0, pendingSheets = 0, liveSheets = 0, onPrinted = null, xray = 0, flowsOn = false, lastZoomSent = 0;
  var orbit = { theta: 1.6, phi: 1.28, r: 36, tx: 0.8, ty: 1.3, tz: 0 };
  var HOME = { theta: 0.6, phi: 1.1, r: 24, tx: 0.9, ty: 1.2, tz: 0 };
  var rotors = [], units = [], anchors = {}, anatAnchors = {}, labelEls = {}, anatEls = {};
  var pickables = [], partMeshes = {}, shellMats = [], dryerMats = [], hl = {}, hooks = {}, ptrs = {}, drag = null, pinchD = 0, pinchMid = null;
  var sheets = [], curve = null, stageTex = [null, null, null, null, null];
  var pile = null, pileTop = null, pileH = 0.5, screenCv = null, screenTex = null, spot = null, feederHead = null, camAnim = null;
  var UNIT_X = [-5.4, -3.4, -1.4, 0.6], COAT_X = 2.6, ROLL_IDLE = 0x6d747a, SW = 2.24, SH = 1.58, BASIS = null, FZ = 1.418;
  var WATER_HEX = 0x7fd8ff;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function V(x, y, z) { return new T.Vector3(x, y, z); }
  function mats(me) { return Array.isArray(me.material) ? me.material : [me.material]; }

  function mt(color, o) {
    o = o || {};
    var m = new T.MeshStandardMaterial({ color: color, metalness: o.m != null ? o.m : 0.3, roughness: o.r != null ? o.r : 0.55 });
    if (o.e != null) { m.emissive = new T.Color(o.e); m.emissiveIntensity = o.ei != null ? o.ei : 1; }
    if (o.t != null) { m.transparent = true; m.opacity = o.t; }
    return m;
  }
  function add(me, parent, x, y, z) { me.position.set(x || 0, y || 0, z || 0); me.castShadow = true; me.receiveShadow = true; (parent || root).add(me); return me; }
  function box(w, h, d, m, parent, x, y, z) { return add(new T.Mesh(new T.BoxGeometry(w, h, d), m), parent, x, y, z); }
  function cyl(r, len, m, parent, x, y, z, seg) { var me = add(new T.Mesh(new T.CylinderGeometry(r, r, len, seg || 24), m), parent, x, y, z); me.rotation.x = Math.PI / 2; return me; }
  function vcyl(r, len, m, parent, x, y, z, seg) { return add(new T.Mesh(new T.CylinderGeometry(r, r, len, seg || 16), m), parent, x, y, z); }
  function tag(list, id) {
    list.forEach(function (me) {
      me.userData.part = id;
      if (!me.userData.own && !Array.isArray(me.material)) me.material = me.material.clone();
      me.userData.own = true;
      pickables.push(me);
      (partMeshes[id] = partMeshes[id] || []).push(me);
    });
  }
  function shell(list) { list.forEach(function (me) { mats(me).forEach(function (m) { if (shellMats.indexOf(m) < 0) shellMats.push(m); }); }); }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }

  /* ---------- animación: anime.js si está disponible; si no, aplica el valor final ---------- */
  function tw(target, props, dur, ease, done) {
    if (A && !reduced) return A(Object.assign({ targets: target, duration: dur, easing: ease || "easeInOutSine", complete: done || null }, props));
    for (var k in props) if (Object.prototype.hasOwnProperty.call(props, k)) target[k] = props[k];
    if (done) done();
    return null;
  }

  /* ---------- construcción ---------- */
  function sheetMesh() {
    var me = new T.Mesh(new T.PlaneGeometry(SW, SH), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, side: T.DoubleSide }));
    if (!BASIS) BASIS = new T.Matrix4().makeBasis(V(0, 0, -1), V(-1, 0, 0), V(0, 1, 0));
    me.quaternion.setFromRotationMatrix(BASIS);
    me.receiveShadow = true;
    return me;
  }
  function airMat() {
    var c = document.createElement("canvas"); c.width = 128; c.height = 128;
    var g = c.getContext("2d"); g.fillStyle = "#39434b"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#7fd0ff";
    for (var y = 8; y < 128; y += 16) for (var x = 8 + ((y / 16) % 2) * 8; x < 128; x += 16) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 5);
    var m = mt(0xffffff, { m: 0.3, r: 0.5, e: 0x0b2a40, ei: 1 }); m.map = t; return m;
  }
  function drawUnitLabel(u, letter, hex) {
    var g = u.labCv.getContext("2d"); g.clearRect(0, 0, 256, 64);
    g.fillStyle = "rgba(255,255,255,.94)"; rr(g, 2, 2, 252, 60, 12); g.fill();
    g.fillStyle = "#1d1d1b"; g.font = "700 26px Inter, Arial, sans-serif"; g.fillText("CUERPO " + (u.i + 1), 16, 42);
    g.fillStyle = hex || "#c9cfd4"; g.beginPath(); g.arc(214, 32, 21, 0, 7); g.fill();
    g.fillStyle = letter === "Y" ? "#3a2600" : "#ffffff"; g.font = "800 22px Inter, Arial, sans-serif"; g.textAlign = "center"; g.fillText(letter || "–", 214, 40); g.textAlign = "left";
    u.labTex.needsUpdate = true;
  }

  function buildFeeder() {
    var g = new T.Group(); g.position.x = -9.3; root.add(g);
    var fr = mt(0xd9dcdf), dk = mt(0x3b4045, { m: 0.4, r: 0.5 }), frame = [];
    [[-0.95, 1.45], [-0.95, -1.45], [0.95, 1.45], [0.95, -1.45]].forEach(function (p) { frame.push(box(0.16, 3.0, 0.16, fr, g, p[0], 1.5, p[1])); });
    var roof = box(2.1, 0.24, 3.1, mt(0xd9dcdf), g, 0, 3.0, 0);
    var board = box(1.75, 0.1, 2.5, dk, g, 0, 0.3, 0);
    var pal = box(1.7, 0.18, 2.4, mt(0x8a6a45, { m: 0, r: 0.9 }), g, 0, 0.12, 0);
    var pl = box(1.58, 1.08, 2.24, mt(0xfbfbf7, { m: 0, r: 0.95 }), g, 0, 0.9, 0);
    var rake = [];
    for (var i = -3; i <= 3; i++) rake.push(box(1.9, 0.03, 0.05, mt(0xf3a100, { m: 0.5, r: 0.4 }), g, 0, 0.38, i * 0.34));
    feederHead = box(1.1, 0.26, 2.1, mt(0x0072b9, { m: 0.3, r: 0.45 }), g, 0.25, 1.78, 0);
    var cups = [];
    [-0.7, -0.25, 0.25, 0.7].forEach(function (z) { cups.push(vcyl(0.05, 0.22, dk, g, 0.62, 1.58, z)); });
    var blow = [];
    [-0.8, 0.8].forEach(function (z) { blow.push(box(0.12, 0.3, 0.1, mt(0x9aa3ab), g, -0.82, 1.5, z)); });
    tag(rake.concat([board, pal]), 1);
    tag(frame.concat([roof, pl, feederHead]).concat(cups, blow), 2);
    shell([roof]);
    anchors[1] = V(-9.3, 0.5, 1.5); anchors[2] = V(-9.1, 2.15, 0.9);
  }

  function buildTable() {
    var g = new T.Group(); root.add(g);
    var fr = mt(0xd9dcdf), top = box(1.95, 0.06, 2.4, mt(0xc4cad0, { m: 0.5, r: 0.35 }), g, -7.25, 1.27, 0);
    top.rotation.z = -0.215;
    var legs = [box(0.12, 1.2, 0.12, fr, g, -7.9, 0.66, 1.15), box(0.12, 1.2, 0.12, fr, g, -7.9, 0.66, -1.15), box(0.12, 0.95, 0.12, fr, g, -6.6, 0.52, 1.15), box(0.12, 0.95, 0.12, fr, g, -6.6, 0.52, -1.15)];
    var lays = [];
    [-0.75, -0.25, 0.25, 0.75].forEach(function (z) { lays.push(box(0.05, 0.12, 0.08, mt(0xf3a100), g, -6.32, 1.14, z)); });
    lays.push(box(0.3, 0.1, 0.05, mt(0xf3a100), g, -6.75, 1.22, 1.17));
    var sens = [];
    [-0.55, 0.55].forEach(function (z) { sens.push(add(new T.Mesh(new T.SphereGeometry(0.05, 12, 8), mt(0xff3b30, { e: 0xff2a1a, ei: 0.9 })), g, -7.65, 1.44, z)); });
    sens.push(box(0.14, 0.06, 2.3, mt(0x3b4045), g, -7.65, 1.52, 0));
    tag([top].concat(legs, lays), 3); tag(sens, 4);
    anchors[3] = V(-6.55, 1.32, 1.3); anchors[4] = V(-7.65, 1.6, -0.75);
  }

  /* Flechas que recorren un camino (curva en el plano del cuerpo, junto a los extremos de los rodillos). */
  function flowPath(u, pts, n, color, kind) {
    var c = new T.CatmullRomCurve3(pts.map(function (p) { return V(p[0], p[1], FZ); }), false, "centripetal");
    var mat = new T.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.95 }), arrows = [];
    var geo = kind === "water" ? new T.SphereGeometry(0.032, 12, 10) : new T.ConeGeometry(0.028, 0.085, 10);  // agua = gotas, tinta = flechas
    for (var i = 0; i < n; i++) { var a = new T.Mesh(geo, mat); a.visible = false; u.g.add(a); arrows.push(a); }
    var f = { curve: c, arrows: arrows, mat: mat, kind: kind, t: 0, scale: 1, on: true };
    u.flows.push(f);
    return f;
  }
  function arc(cx, cy, r, a0, a1, steps) {
    var out = [];
    for (var i = 0; i <= steps; i++) { var a = (a0 + (a1 - a0) * i / steps) * Math.PI / 180; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return out;
  }
  function buildFlows(u, px, py, bx, by) {
    u.flows = [];
    // tinta: tintero → rodillo del tintero → tomador → distribuidores → dadores → plancha (gira en sentido horario)
    flowPath(u, [[px + 0.25, py + 1.0], [px - 0.03, py + 1.04], [px - 0.17, py + 0.86], [px - 0.3, py + 0.62], [px + 0.03, py + 0.68], [px + 0.34, py + 0.55], [px + 0.25, py + 0.37], [px + 0.16, py + 0.24]], 10, 0x555555, "ink");
    flowPath(u, arc(px, py, 0.272, 55, -100, 8), 6, 0x555555, "plate");
    // agua: batea → rodillo de batea → dosificador → mojador → plancha (antes que la tinta)
    flowPath(u, [[px - 0.58, py - 0.25], [px - 0.6, py - 0.08], [px - 0.48, py + 0.05], [px - 0.34, py + 0.1]].concat(arc(px, py, 0.272, 165, 118, 4)), 7, WATER_HEX, "water");
    // imagen entintada: mantilla (gira en sentido antihorario) → pliego
    flowPath(u, arc(bx, by, 0.272, 80, 278, 9).concat([[0.1, 0.99], [0.55, 0.95]]), 10, 0x555555, "blanket");
  }

  function buildUnit(i) {
    var ux = UNIT_X[i], g = new T.Group(); g.position.x = ux; root.add(g);
    var u = { i: i, x: ux, g: g, inkOn: false, plateOn: false, inkRel: 1, waterRel: 1, inkHex: 0x555555 };
    var frOp = box(1.6, 3.0, 0.14, mt(0xd9dcdf), g, 0, 1.5, 1.5), frDr = box(1.6, 3.0, 0.14, mt(0xd9dcdf), g, 0, 1.5, -1.5);
    var plinth = box(1.62, 0.3, 3.16, mt(0x2c3136, { m: 0.3, r: 0.6 }), g, 0, 0.15, 0);
    var hood = box(1.56, 0.2, 3.0, mt(0xeceef0, { m: 0.2, r: 0.5 }), g, 0, 3.1, 0);
    var band = box(1.58, 0.14, 0.04, mt(0x9aa3ab, { m: 0.2, r: 0.5 }), g, 0, 2.9, 1.59);
    var lc = document.createElement("canvas"); lc.width = 256; lc.height = 64;
    u.labCv = lc; u.labTex = new T.CanvasTexture(lc);
    var lab = new T.Mesh(new T.PlaneGeometry(1.2, 0.3), new T.MeshBasicMaterial({ map: u.labTex, transparent: true }));
    lab.position.set(0, 2.62, 1.58); g.add(lab);
    drawUnitLabel(u, "–", null);
    var imp = cyl(0.4, 2.86, mt(0x8f989f, { m: 0.7, r: 0.32 }), g, 0, 0.62, 0, 48);
    var gb = new T.Mesh(new T.BoxGeometry(0.05, 2.8, 0.07), mt(0xf3a100, { m: 0.5, r: 0.4 })); gb.position.set(0.4, 0, 0); imp.add(gb);
    var bx = -0.113, by = 1.26, blanket = cyl(0.25, 2.8, mt(0x2b3a4a, { m: 0.05, r: 0.85 }), g, bx, by, 0, 40);
    var bb = new T.Mesh(new T.BoxGeometry(0.03, 2.75, 0.05), mt(0x111418)); bb.position.set(0.25, 0, 0); blanket.add(bb);
    var px = bx + 0.087, py = by + 0.492;
    var plateCyl = cyl(0.25, 2.8, mt(0xc8d0d6, { m: 0.65, r: 0.3 }), g, px, py, 0, 48);
    var pg = new T.Mesh(new T.BoxGeometry(0.03, 2.75, 0.05), mt(0x30353a)); pg.position.set(0.25, 0, 0); plateCyl.add(pg);
    // batería de entintado (arriba y a la derecha de la plancha)
    var rm = mt(ROLL_IDLE, { m: 0.25, r: 0.5 }), rl = [];
    [55, 80, 105, 130].forEach(function (a) { var t = a * Math.PI / 180; rl.push(cyl(0.065, 2.7, rm, g, px + 0.315 * Math.cos(t), py + 0.315 * Math.sin(t), 0, 18)); });
    [[-0.3, 0.5, 0.09], [0.03, 0.57, 0.09], [0.33, 0.45, 0.08], [-0.17, 0.78, 0.06]].forEach(function (q) { rl.push(cyl(q[2], 2.7, rm, g, px + q[0], py + q[1], 0, 18)); });
    var fRoll = cyl(0.1, 2.7, mt(0x9aa3ab, { m: 0.7, r: 0.3 }), g, px - 0.05, py + 0.92, 0, 28);
    var trough = box(0.5, 0.06, 2.62, mt(0x3b4045), g, px + 0.2, py + 0.9, 0); trough.rotation.z = 0.5;
    var back = box(0.06, 0.28, 2.62, mt(0x3b4045), g, px + 0.43, py + 1.05, 0);
    var inkGeo = new T.BoxGeometry(0.34, 0.2, 2.5); inkGeo.translate(0, 0.1, 0);
    var ink = add(new T.Mesh(inkGeo, mt(0x1d1d1b, { m: 0.1, r: 0.25 })), g, px + 0.24, py + 0.93, 0); ink.scale.y = 0.05; ink.visible = false;
    // mojado Alcolor (a la izquierda: la plancha recibe agua antes que tinta)
    var dm = mt(0xa7b4bf, { m: 0.4, r: 0.35 }), dl = [];
    var a165 = 165 * Math.PI / 180;
    dl.push(cyl(0.07, 2.7, dm, g, px + 0.32 * Math.cos(a165), py + 0.32 * Math.sin(a165), 0, 18));
    dl.push(cyl(0.065, 2.7, dm, g, px - 0.43, py - 0.02, 0, 18));
    dl.push(cyl(0.075, 2.7, mt(0x7f8a93, { m: 0.6, r: 0.3 }), g, px - 0.56, py - 0.15, 0, 18));
    var pan = box(0.36, 0.14, 2.6, mt(0x3b4045), g, px - 0.58, py - 0.29, 0);
    var water = box(0.32, 0.06, 2.5, mt(0x5fb3e8, { t: 0.75, m: 0, r: 0.1 }), g, px - 0.58, py - 0.24, 0);
    var drum = cyl(0.3, 2.8, mt(0x7d868e, { m: 0.6, r: 0.35 }), g, 1.0, 0.55, 0, 40);
    var db = new T.Mesh(new T.BoxGeometry(0.05, 2.75, 0.06), mt(0xf3a100, { m: 0.5, r: 0.4 })); db.position.set(0.3, 0, 0); drum.add(db);
    var air = box(0.9, 0.04, 2.6, airMat(), g, 1.0, 0.2, 0);
    rotors.push({ o: imp, w: -1 / 0.4 }, { o: blanket, w: 1 / 0.25 }, { o: plateCyl, w: -1 / 0.25 }, { o: drum, w: 1 / 0.3 }, { o: fRoll, w: 0.3 });
    rl.forEach(function (r, k) { rotors.push({ o: r, w: (k % 2 ? -1 : 1) * 3.4 }); });
    dl.forEach(function (r, k) { rotors.push({ o: r, w: (k % 2 ? -1 : 1) * 3.4 }); });
    tag([frOp, frDr, plinth, hood, band, imp, blanket, drum], 5);
    tag([plateCyl], 6);
    tag(rl.concat(dl, [pan, water]), 8);
    tag([fRoll, trough, back, ink], 9);
    tag([air], 7);
    shell([frOp, frDr, hood]);
    u.plateCyl = plateCyl; u.plateMat = plateCyl.material; u.blanketMat = blanket.material; u.px = px; u.py = py;
    u.rollMats = rl.map(function (r) { return r.material; });
    u.bandMat = band.material; u.ink = ink; u.nipX = ux - 0.07;
    buildFlows(u, px, py, bx, by);
    units.push(u);
  }

  function buildCoater() {
    var g = new T.Group(); g.position.x = COAT_X; root.add(g);
    var frOp = box(1.6, 3.0, 0.14, mt(0xd9dcdf), g, 0, 1.5, 1.5), frDr = box(1.6, 3.0, 0.14, mt(0xd9dcdf), g, 0, 1.5, -1.5);
    var plinth = box(1.62, 0.3, 3.16, mt(0x2c3136, { m: 0.3, r: 0.6 }), g, 0, 0.15, 0), hood = box(1.56, 0.2, 3.0, mt(0xeceef0, { m: 0.2, r: 0.5 }), g, 0, 3.1, 0);
    var band = box(1.58, 0.14, 0.04, mt(0xcfe3ee, { m: 0.3, r: 0.2 }), g, 0, 2.9, 1.59);
    var imp = cyl(0.4, 2.86, mt(0x8f989f, { m: 0.7, r: 0.32 }), g, 0, 0.62, 0, 48);
    var coat = cyl(0.25, 2.8, mt(0x6b7f8d, { m: 0.2, r: 0.6 }), g, -0.113, 1.26, 0, 40);
    var anilox = cyl(0.12, 2.7, mt(0x5a4636, { m: 0.6, r: 0.45 }), g, 0.12, 1.66, 0, 24);
    var chamber = box(0.22, 0.3, 2.65, mt(0x0072b9, { m: 0.3, r: 0.45 }), g, 0.33, 1.86, 0); chamber.rotation.z = -0.6;
    rotors.push({ o: imp, w: -2.5 }, { o: coat, w: 4 }, { o: anilox, w: -6 });
    tag([frOp, frDr, plinth, hood, band, imp, coat, anilox, chamber], 10);
    shell([frOp, frDr, hood]);
    anchors[10] = V(COAT_X, 3.4, 1.5);
  }

  function buildDelivery() {
    var g = new T.Group(); root.add(g);
    var fr = mt(0xd9dcdf), dk = mt(0x3b4045), frame = [];
    frame.push(box(6.2, 0.16, 0.1, dk, g, 6.5, 2.2, 1.4), box(6.2, 0.16, 0.1, dk, g, 6.5, 2.2, -1.4));
    var sideOp = box(6.2, 0.9, 0.12, mt(0xd9dcdf), g, 6.5, 2.65, 1.52), sideDr = box(6.2, 0.9, 0.12, mt(0xd9dcdf), g, 6.5, 2.65, -1.52), cover = box(6.2, 0.1, 3.1, mt(0xeceef0), g, 6.5, 3.15, 0);
    [4.0, 9.4].forEach(function (x) { [1.45, -1.45].forEach(function (z) { frame.push(box(0.16, 2.2, 0.16, fr, g, x, 1.1, z)); }); });
    var dry = [];
    [4.9, 6.1].forEach(function (x) {
      dry.push(box(1.0, 0.36, 2.7, mt(0x5b646c, { m: 0.4, r: 0.4 }), g, x, 2.88, 0));
      var lamp = mt(0x4a1a10, { e: 0xff5a1f, ei: 0.25 });
      [-0.3, 0, 0.3].forEach(function (dx) { dry.push(cyl(0.035, 2.6, lamp, g, x + dx, 2.64, 0, 12)); });
    });
    var stat = [cyl(0.045, 2.7, mt(0x9ad1ff, { e: 0x2a7fff, ei: 0.6 }), g, 7.05, 1.62, 0, 12)];
    var brakes = [];
    [-0.8, -0.27, 0.27, 0.8].forEach(function (z) { brakes.push(cyl(0.07, 0.3, mt(0x2b3a4a), g, 7.65, 1.48, z, 16)); });
    var pal = box(1.7, 0.18, 2.4, mt(0x8a6a45, { m: 0, r: 0.9 }), g, 8.4, 0.12, 0);
    var plGeo = new T.BoxGeometry(1.58, 1, 2.24); plGeo.translate(0, 0.5, 0);
    pile = add(new T.Mesh(plGeo, mt(0xfbfbf7, { m: 0, r: 0.95 })), g, 8.4, 0.21, 0); pile.scale.y = pileH;
    pileTop = sheetMesh(); pileTop.position.set(8.4, 0.21 + pileH + 0.004, 0); g.add(pileTop);
    var cons = box(0.5, 0.7, 0.3, mt(0x3b4045), g, 9.6, 1.25, 1.65);
    var disp = box(0.36, 0.26, 0.02, mt(0x0b2a40, { e: 0x2a8fd8, ei: 0.7 }), g, 9.6, 1.4, 1.81);
    var jog = cyl(0.06, 0.04, mt(0xf3a100), g, 9.6, 1.1, 1.81, 18);
    tag(dry, 11); tag(brakes, 12); tag(stat, 13);
    tag(frame.concat([sideOp, sideDr, cover, pal, pile, cons, disp, jog]), 14);
    dry.forEach(function (me) { if (me.geometry.type === "CylinderGeometry") dryerMats.push(me.material); });
    shell([sideOp, sideDr, cover]);
    anchors[11] = V(5.5, 3.35, 1.3); anchors[12] = V(7.65, 1.55, 1.35); anchors[13] = V(7.05, 1.7, -1.45); anchors[14] = V(8.7, 1.3, 1.55);
  }

  function drawScreen(d) {
    if (!screenCv) return;
    var g = screenCv.getContext("2d"), W = 512;
    g.fillStyle = "#0e1a24"; g.fillRect(0, 0, W, 300);
    g.fillStyle = "#0072b9"; g.fillRect(0, 0, W, 42);
    g.fillStyle = "#ffffff"; g.font = "700 20px Inter, Arial, sans-serif"; g.fillText("Pupitre · densidades", 14, 28);
    g.fillStyle = "#f3a100"; g.font = "600 15px Inter, Arial, sans-serif"; g.textAlign = "right"; g.fillText((d && d.status) || "Esperando trabajo", W - 14, 27); g.textAlign = "left";
    if (!d || !d.rows) {
      g.fillStyle = "#9fb3c4"; g.font = "500 17px Inter, Arial, sans-serif"; g.fillText("Monta planchas y carga tintas", 24, 130); g.fillText("para medir la tira de control.", 24, 156);
    } else {
      d.rows.forEach(function (r, i) {
        var x = 34 + i * 118, base = 262, sc = 88, bw = 64;
        g.fillStyle = "#1c2a35"; g.fillRect(x, 58, bw, base - 58);
        var ty = base - (r.target + r.tol) * sc, by2 = base - (r.target - r.tol) * sc;
        g.fillStyle = "rgba(60,190,120,.35)"; g.fillRect(x - 6, ty, bw + 12, by2 - ty);
        g.fillStyle = r.hex; g.fillRect(x + 10, base - Math.min(2.25, r.D) * sc, bw - 20, Math.min(2.25, r.D) * sc);
        g.fillStyle = "#ffffff"; g.font = "700 15px Inter, Arial, sans-serif"; g.textAlign = "center";
        g.fillText(r.k + " " + r.D.toFixed(2), x + bw / 2, base + 20); g.textAlign = "left";
        g.fillStyle = r.ok ? "#5fd08d" : "#f3a100"; g.beginPath(); g.arc(x + bw / 2, 48, 6, 0, 7); g.fill();
      });
    }
    if (screenTex) screenTex.needsUpdate = true;
  }

  function buildDesk() {
    var g = new T.Group(); g.position.set(11.4, 0, 1.4); g.rotation.y = -0.85; root.add(g);
    var dk = mt(0x3b4045, { m: 0.3, r: 0.5 });
    var body = box(1.6, 0.9, 0.8, dk, g, 0, 0.45, 0);
    var top = box(1.7, 0.08, 0.95, mt(0xd9dcdf), g, 0, 0.94, 0.05); top.rotation.x = 0.12;
    var arm = box(0.1, 0.9, 0.1, dk, g, 0, 1.4, -0.3);
    screenCv = document.createElement("canvas"); screenCv.width = 512; screenCv.height = 300; screenTex = new T.CanvasTexture(screenCv);
    var face = new T.MeshBasicMaterial({ map: screenTex });
    var scr = add(new T.Mesh(new T.BoxGeometry(1.5, 0.9, 0.06), [dk, dk, dk, dk, face, dk]), g, 0, 1.85, -0.26);
    drawScreen(null);
    tag([body, top, arm, scr], 15);
    anchors[15] = V(11.4, 2.55, 1.4);
  }

  function buildLube() {
    var g = new T.Group(); root.add(g);
    var tank = box(0.5, 0.6, 0.3, mt(0xf3a100, { m: 0.3, r: 0.45 }), g, -2.4, 0.62, -1.75);
    var pipe = add(new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 9.2, 8), mt(0x3b4045)), g, -1.7, 0.98, -1.62); pipe.rotation.z = Math.PI / 2;
    var drops = [];
    UNIT_X.concat([COAT_X]).forEach(function (x) { drops.push(vcyl(0.03, 0.5, mt(0xf3a100, { m: 0.3, r: 0.45 }), g, x, 1.2, -1.62, 8)); });
    tag([tank, pipe].concat(drops), 16);
    anchors[16] = V(-2.4, 1.0, -1.85);
  }

  function buildCurve() {
    var P = [[-9.3, 1.48], [-8.4, 1.55], [-7.25, 1.33], [-6.3, 1.12], [-5.47, 1.03], [-4.4, 0.86], [-3.47, 1.03], [-2.4, 0.86], [-1.47, 1.03],
      [-0.4, 0.86], [0.53, 1.03], [1.6, 0.86], [2.53, 1.03], [3.5, 1.65], [4.6, 2.3], [6.2, 2.34], [7.3, 1.98], [8.4, 0.78]];
    curve = new T.CatmullRomCurve3(P.map(function (p) { return V(p[0], p[1], 0); }), false, "centripetal");
    for (var i = 0; i < 9; i++) {
      var grp = new T.Group(), me = sheetMesh(); grp.add(me); grp.visible = false; root.add(grp);
      sheets.push({ grp: grp, mesh: me, t: 0, on: false, stage: -1, forced: false });
    }
  }

  function build() {
    scene = new T.Scene();
    scene.fog = new T.Fog(0xf6f5f2, 34, 70);
    camera = new T.PerspectiveCamera(40, 1, 0.1, 200);
    root = new T.Group(); scene.add(root);
    var ground = new T.Mesh(new T.PlaneGeometry(70, 46), new T.MeshLambertMaterial({ color: 0xebe9e4 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
    var grid = new T.GridHelper(70, 70, 0x0072b9, 0xc9d3dc); grid.position.y = 0.003; grid.material.transparent = true; grid.material.opacity = 0.35; root.add(grid);
    scene.add(new T.HemisphereLight(0xffffff, 0xb9b4a8, 0.55));
    scene.add(new T.AmbientLight(0xffffff, 0.22));
    var dir = new T.DirectionalLight(0xffffff, 0.72); dir.position.set(6, 15, 11); dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    var sc = dir.shadow.camera; sc.left = -17; sc.right = 17; sc.top = 11; sc.bottom = -11; sc.near = 1; sc.far = 45;
    scene.add(dir);
    spot = new T.SpotLight(0xffffff, 0.9, 34, Math.PI / 6, 0.45); spot.position.set(0, 10, 7); spot.castShadow = true;
    spot.target.position.set(0, 1, 0); scene.add(spot); scene.add(spot.target);
    buildFeeder(); buildTable(); for (var i = 0; i < 4; i++) buildUnit(i); buildCoater(); buildDelivery(); buildDesk(); buildLube(); buildCurve();
    anchors[5] = V(UNIT_X[1], 3.45, 1.5); anchors[6] = V(UNIT_X[0] - 0.03, 1.78, 1.62); anchors[7] = V(UNIT_X[0] + 1.0, 0.28, 1.4);
    anchors[8] = V(UNIT_X[2] - 0.1, 2.25, 1.62); anchors[9] = V(UNIT_X[3] + 0.15, 2.85, 1.4);
    var u1 = UNIT_X[1];
    anatAnchors = { A: V(u1 - 0.03, 1.76, 1.35), B: V(u1 - 0.12, 1.26, 1.35), C: V(u1 - 0.25, 0.42, 1.35), D: V(u1 + 1.0, 0.55, 1.35), E: V(u1 + 0.15, 2.3, 1.35), F: V(u1 - 0.62, 1.55, 1.35) };
  }

  /* ---------- etiquetas HTML ---------- */
  function buildLabels(parts, anat) {
    labelsEl.innerHTML = "";
    parts.forEach(function (p) {
      var b = document.createElement("button"); b.type = "button"; b.className = "v-lbl"; b.setAttribute("data-part", p.id);
      b.setAttribute("aria-label", "Parte " + p.id + ": " + p.name);
      b.innerHTML = "<b>" + p.id + "</b><span>" + p.short + "</span>";
      b.addEventListener("click", function (e) { e.stopPropagation(); if (hooks.onPart) hooks.onPart(p.id); });
      labelsEl.appendChild(b); labelEls[p.id] = b;
    });
    anat.forEach(function (a) {
      var b = document.createElement("button"); b.type = "button"; b.className = "v-lbl anat"; b.hidden = true;
      b.setAttribute("aria-label", "Anatomía " + a.id + ": " + a.name);
      b.innerHTML = "<b>" + a.id + "</b><span>" + a.short + "</span>";
      b.addEventListener("click", function (e) { e.stopPropagation(); if (hooks.onAnat) hooks.onAnat(a.id); });
      labelsEl.appendChild(b); anatEls[a.id] = b;
    });
  }
  var pv = null, tv = null;
  function place(el, a, w, h) {
    pv.copy(a).project(camera);
    var out = pv.z > 1 || pv.x < -1.05 || pv.x > 1.05 || pv.y < -1.05 || pv.y > 1.05;
    el.style.visibility = out ? "hidden" : "visible";
    if (out) return;
    el.style.transform = "translate(" + ((pv.x * 0.5 + 0.5) * w).toFixed(1) + "px," + ((-pv.y * 0.5 + 0.5) * h).toFixed(1) + "px) translate(-50%,-50%)";
    tv.set(orbit.tx, orbit.ty, orbit.tz);
    el.classList.toggle("far", camera.position.distanceTo(a) > camera.position.distanceTo(tv) + 2.2);
  }
  function updateLabels() {
    var w = stage.clientWidth, h = stage.clientHeight, k;
    for (k in labelEls) if (anchors[k]) place(labelEls[k], anchors[k], w, h);
    if (xray >= 0.35) for (k in anatEls) place(anatEls[k], anatAnchors[k], w, h);
  }

  /* ---------- cámara, zoom y paneo ---------- */
  function updateCamera() {
    var o = orbit, sp = Math.sin(o.phi);
    camera.position.set(o.tx + o.r * sp * Math.sin(o.theta), o.ty + o.r * Math.cos(o.phi), o.tz + o.r * sp * Math.cos(o.theta));
    camera.lookAt(o.tx, o.ty, o.tz);
  }
  function stopIdle() { idle = false; }
  function flyTo(o, dur) {
    if (camAnim && camAnim.pause) camAnim.pause();
    var th = o.theta, cur = orbit.theta;
    while (th - cur > Math.PI) th -= 2 * Math.PI;
    while (cur - th > Math.PI) th += 2 * Math.PI;
    camAnim = tw(orbit, { theta: th, phi: o.phi, r: o.r, tx: o.tx, ty: o.ty, tz: o.tz }, dur || 1300, "easeInOutCubic");
  }
  /* En visores angostos (celular, columna lateral) la cámara se aleja para que la máquina quepa. */
  function fitK(base) { var asp = camera ? camera.aspect : 1.6; return clamp(base / asp, 1, 2.2); }
  function home() { return { theta: HOME.theta, phi: HOME.phi, r: HOME.r * fitK(1.7), tx: HOME.tx, ty: HOME.ty, tz: HOME.tz }; }
  function viewFor(spec) {
    var k = fitK(1.35);
    if (spec === "home") return home();
    if (spec === "units") return { tx: -2.4, ty: 1.5, tz: 0, r: 11.5 * k, theta: 0.3, phi: 1.22 };
    if (spec && typeof spec === "object" && spec.unit != null) { var u = units[spec.unit]; return { tx: u.x - 0.1, ty: 1.65, tz: 0.3, r: 5.4 * k, theta: 0.12, phi: 1.32 }; }
    var a = anchors[spec]; if (!a) return home();
    var backSide = a.z < -0.5;
    return { tx: a.x, ty: Math.max(1.0, a.y - 0.25), tz: a.z * 0.4, r: (spec === 15 ? 6.4 : 7) * k, theta: backSide ? Math.PI - 0.45 : 0.42, phi: 1.18 };
  }
  function focus(spec, dur) { if (!ready) return; idle = false; flyTo(viewFor(spec), dur); }
  var R_MIN = 2.6, R_MAX = 52;
  function zoom(f) { if (!ready) return; idle = false; if (camAnim && camAnim.pause) camAnim.pause(); orbit.r = clamp(orbit.r * f, R_MIN, R_MAX); }
  function getZoom() { return home().r / orbit.r; }
  function setZoom(z) { if (!ready) return; idle = false; if (camAnim && camAnim.pause) camAnim.pause(); orbit.r = clamp(home().r / z, R_MIN, R_MAX); }
  function pan(dx, dy) {
    var s = orbit.r * 0.0017, ct = Math.cos(orbit.theta), st = Math.sin(orbit.theta);
    orbit.tx += (-dx * ct) * s; orbit.tz += (dx * st) * s;
    orbit.ty = clamp(orbit.ty + dy * s, 0.2, 4.5);
    orbit.tx = clamp(orbit.tx, -11, 13); orbit.tz = clamp(orbit.tz, -4, 4);
  }

  function hit(e) {
    var r = canvas.getBoundingClientRect();
    mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(mouse, camera);
    var hits = ray.intersectObjects(pickables, false);
    for (var i = 0; i < hits.length; i++) {
      var o = hits[i].object;
      if (xray >= 0.35 && shellMats.indexOf(o.material) >= 0) continue;
      if (o.userData.part) return o.userData.part;
    }
    return 0;
  }
  function bindPointer() {
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    canvas.addEventListener("pointerdown", function (e) {
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(ptrs);
      if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); pinchMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; drag = null; return; }
      drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, th: orbit.theta, ph: orbit.phi, moved: false, id: e.pointerId, touch: e.pointerType === "touch", pan: e.button === 2 || e.shiftKey };
      idle = false; if (camAnim && camAnim.pause) camAnim.pause();
      try { canvas.setPointerCapture(e.pointerId); } catch (er) { }
    });
    canvas.addEventListener("pointermove", function (e) {
      if (ptrs[e.pointerId]) { ptrs[e.pointerId].x = e.clientX; ptrs[e.pointerId].y = e.clientY; }
      var ids = Object.keys(ptrs);
      if (ids.length === 2 && pinchD) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (d > 10) { orbit.r = clamp(orbit.r * pinchD / d, R_MIN, R_MAX); pinchD = d; }
        if (pinchMid) pan(mid.x - pinchMid.x, mid.y - pinchMid.y);
        pinchMid = mid;
        return;
      }
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
      if (drag.pan) { pan(e.clientX - drag.lx, e.clientY - drag.ly); drag.lx = e.clientX; drag.ly = e.clientY; return; }
      orbit.theta = drag.th - dx * 0.007;
      if (!drag.touch) orbit.phi = clamp(drag.ph - dy * 0.005, 0.35, 1.52);
    });
    function up(e) {
      var mine = drag && drag.id === e.pointerId;
      if (mine && !drag.moved && !drag.pan && e.type === "pointerup") { var id = hit(e); if (id && hooks.onPart) hooks.onPart(id); }
      delete ptrs[e.pointerId];
      if (Object.keys(ptrs).length < 2) { pinchD = 0; pinchMid = null; }
      if (mine) drag = null;
    }
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("dblclick", function (e) { var id = hit(e); if (id) focus(id); else focus("home"); });
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      zoom(e.deltaY > 0 ? 1.12 : 0.89);
    }, { passive: false });
  }

  /* ---------- pliegos en movimiento ---------- */
  function setSheetStage(s, st) {
    if (s.stage === st) return;
    s.stage = st; s.mesh.material.map = stageTex[st] || null; s.mesh.material.needsUpdate = true;
  }
  function spawnSheet(forced) {
    for (var i = 0; i < sheets.length; i++) if (!sheets[i].on) {
      var s = sheets[i]; s.on = true; s.t = 0; s.stage = -1; s.forced = !!forced; s.grp.visible = true; setSheetStage(s, 0); liveSheets++;
      if (hooks.onSheet) hooks.onSheet();
      return;
    }
  }
  function arrive() {
    if (stageTex[4]) { pileTop.material.map = stageTex[4]; pileTop.material.needsUpdate = true; }
    pileH = Math.min(1.05, pileH + 0.01); pile.scale.y = pileH; pileTop.position.y = 0.21 + pileH + 0.004;
    if (printing && liveSheets === 0 && pendingSheets === 0) {
      printing = false;
      var cb = onPrinted; onPrinted = null; if (cb) cb();
    }
  }
  function moving() { return (run && runSpeed > 0.01) || printing; }
  function vSpeed() { return printing && runSpeed < 0.6 ? 0.9 : runSpeed; }
  function updateSheets(dt) {
    var sp = 0.2 * vSpeed();
    for (var i = 0; i < sheets.length; i++) {
      var s = sheets[i]; if (!s.on) continue;
      s.t += dt * sp;
      if (s.t >= 1) { s.on = false; s.grp.visible = false; liveSheets--; arrive(); continue; }
      var p = curve.getPointAt(s.t), tg = curve.getTangentAt(s.t);
      s.grp.position.set(p.x, p.y + 0.012, 0);
      s.grp.rotation.z = Math.atan2(tg.y, tg.x);
      var st = 0;
      if (s.forced || impression) for (var u = 0; u < 4; u++) if (p.x > units[u].nipX + 0.05 && stageTex[u + 1]) st = u + 1;
      setSheetStage(s, st);
    }
  }

  /* ---------- flechas de circulación ---------- */
  var upY = null, tmpV = null;
  function updateFlows(dt) {
    var show = flowsOn, adv = dt * (moving() ? Math.max(0.3, vSpeed()) : 0.35) * 0.22;
    units.forEach(function (u) {
      u.flows.forEach(function (f) {
        var on = show && f.on;
        if (!on) { if (f.vis !== false) { f.arrows.forEach(function (a) { a.visible = false; }); f.vis = false; } return; }
        f.vis = true;
        f.t = (f.t + adv * (f.kind === "water" ? 1.25 : 1)) % 1;
        var n = f.arrows.length;
        for (var i = 0; i < n; i++) {
          var t = (f.t + i / n) % 1, a = f.arrows[i];
          f.curve.getPointAt(t, a.position);
          f.curve.getTangentAt(t, tmpV);
          a.quaternion.setFromUnitVectors(upY, tmpV);
          var sc = f.scale * (0.75 + 0.25 * Math.sin(t * Math.PI));
          a.scale.set(sc, sc, sc);
          a.visible = true;
        }
      });
    });
  }
  function refreshFlowState(u) {
    u.flows.forEach(function (f) {
      if (f.kind === "water") { f.on = u.waterRel > 0.05; f.scale = clamp(0.55 + 0.55 * u.waterRel, 0.4, 1.6); }
      else {
        f.on = u.inkOn && (f.kind === "ink" || u.plateOn);
        f.scale = clamp(0.5 + 0.55 * u.inkRel, 0.4, 1.7) * (f.kind === "blanket" ? 0.9 : 1);
        f.mat.color.setHex(u.inkHex);
      }
    });
  }

  function pulse(t) {
    var k = 0.2 + 0.16 * Math.sin(t * 5);
    for (var id in hl) {
      (partMeshes[id] || []).forEach(function (me) {
        mats(me).forEach(function (m) {
          if (!m.emissive) return;
          if (m.userData.e0 == null) { m.userData.e0 = m.emissive.getHex(); m.userData.ei0 = m.emissiveIntensity; }
          m.emissive.setRGB(0.95 * k, 0.63 * k, 0); m.emissiveIntensity = 1;
        });
      });
    }
  }

  function tick() {
    requestAnimationFrame(tick);
    var dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
    if (!visible || document.hidden) return;
    if (idle && !drag && !reduced) orbit.theta += dt * 0.05;
    if (moving()) {
      var vs = vSpeed();
      for (var i = 0; i < rotors.length; i++) rotors[i].o.rotation.y += rotors[i].w * vs * dt * 1.1;
      spawnT += dt;
      if (spawnT > 0.8 / Math.max(vs, 0.25)) {
        spawnT = 0;
        if (pendingSheets > 0) { spawnSheet(true); pendingSheets--; }
        else if (run && feeding) spawnSheet(false);
      }
      if (feederHead) feederHead.position.y = 1.78 + (feeding ? Math.sin(t * 9 * vs) * 0.03 : 0);
    }
    var glow = run ? 0.85 + 0.15 * Math.sin(t * 7) : 0.22;
    for (var j = 0; j < dryerMats.length; j++) if (!hl[11]) dryerMats[j].emissiveIntensity = glow;
    updateSheets(dt); updateFlows(dt); pulse(t);
    updateCamera(); updateLabels();
    if (hooks.onZoom) { var z = getZoom(); if (Math.abs(z - lastZoomSent) > 0.01) { lastZoomSent = z; hooks.onZoom(z); } }
    renderer.render(scene, camera);
  }

  function roam() {
    if (!A || reduced) return;
    A({ targets: spot.position, x: rnd(-9, 9), y: rnd(7, 11), z: rnd(-5, 9), duration: 3400, easing: "easeInOutSine", complete: roam });
  }

  /* ---------- API ---------- */
  function init(o) {
    stage = o.stage; labelsEl = o.labels; hooks = o.hooks || {}; reduced = !!o.reduced;
    T = window.THREE; A = window.anime || null;
    if (!T) return Promise.reject(new Error("three"));
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return Promise.reject(e); }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    canvas = renderer.domElement; canvas.className = "v-canvas"; canvas.setAttribute("aria-hidden", "true");
    stage.insertBefore(canvas, stage.firstChild);
    clock = new T.Clock(); ray = new T.Raycaster(); mouse = new T.Vector2(); pv = new T.Vector3(); tv = new T.Vector3(); upY = new T.Vector3(0, 1, 0); tmpV = new T.Vector3();
    build(); buildLabels(o.parts || [], o.anat || []); bindPointer();
    ready = true; resize(); updateCamera();
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(stage);
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", function () { setTimeout(resize, 60); });
    tick();
    var h0 = home();
    if (reduced || !A) { for (var k in h0) orbit[k] = h0[k]; }
    else { tw(orbit, { theta: h0.theta, phi: h0.phi, r: h0.r }, 2600, "easeOutCubic"); roam(); }
    return Promise.resolve();
  }
  function resize() {
    if (!ready) return;
    var w = stage.clientWidth || 600, h = stage.clientHeight || 360;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  /* Transparencia de carcasas, laterales y tapas: 0 = opaca, 1 = casi invisible. No mueve la cámara. */
  function setXray(level) {
    xray = clamp(level || 0, 0, 1);
    shellMats.forEach(function (m) { m.transparent = xray > 0.01; m.opacity = 1 - 0.9 * xray; m.depthWrite = xray < 0.3; m.needsUpdate = true; });
    var show = xray >= 0.35;
    for (var k in anatEls) anatEls[k].hidden = !show;
    labelsEl.classList.toggle("cut", show);
  }
  function setFlows(on) { flowsOn = !!on; }
  function setFlowLevels(i, o) {
    if (!ready) return;
    var u = units[i]; if (!u) return;
    if (o.inkRel != null) u.inkRel = o.inkRel;
    if (o.waterRel != null) u.waterRel = o.waterRel;
    if (o.inkOn != null) u.inkOn = o.inkOn;
    if (o.plateOn != null) u.plateOn = o.plateOn;
    if (o.inkHex) u.inkHex = new T.Color(o.inkHex).getHex();
    refreshFlowState(u);
  }
  function highlight(ids) {
    for (var id in hl) {
      (partMeshes[id] || []).forEach(function (me) {
        mats(me).forEach(function (m) { if (m.userData.e0 != null) { m.emissive.setHex(m.userData.e0); m.emissiveIntensity = m.userData.ei0; } });
      });
    }
    hl = {};
    (ids || []).forEach(function (i) { hl[i] = true; });
    for (var k in labelEls) labelEls[k].classList.toggle("on", !!hl[k]);
  }
  /* run = la máquina gira; speed = factor de velocidad visual (1 ≈ 8 000 pl/h). */
  function setRunning(on, speed) { run = !!on; if (speed != null) runSpeed = Math.max(0, speed); idle = false; }
  function setSpeed(speed) { runSpeed = Math.max(0, speed); }
  function setFeeding(on) { feeding = !!on; }
  function setImpression(on) { impression = !!on; }
  function mapTex(cv) { var tex = new T.CanvasTexture(cv); tex.center.set(0.5, 0.5); tex.rotation = Math.PI / 2; return tex; }
  function setPlate(i, cv, letter, hex, animate) {
    if (!ready) return Promise.resolve();
    var u = units[i], tex = mapTex(cv);
    function apply() {
      if (u.plateMat.map) u.plateMat.map.dispose();
      u.plateMat.map = tex; u.plateMat.color.setHex(0xffffff); u.plateMat.needsUpdate = true;
      u.bandMat.color.set(hex); drawUnitLabel(u, letter, hex);
      u.plateOn = true; refreshFlowState(u);
    }
    if (!animate || reduced || !A) { apply(); return Promise.resolve(); }
    return new Promise(function (ok) {
      /* anime.js se pausa si la pestaña queda oculta: el tiempo límite asegura que el montaje termine igual. */
      var applied = false, finished = false;
      function applyOnce() { if (!applied) { applied = true; apply(); } }
      function finish() { if (finished) return; finished = true; applyOnce(); if (pm.parent) root.remove(pm); ok(); }
      focus({ unit: i }, 900);
      var pm = new T.Mesh(new T.BoxGeometry(0.9, 0.012, 2.27), new T.MeshStandardMaterial({ color: 0xc9d1d7, metalness: 0.6, roughness: 0.35, emissive: new T.Color(hex), emissiveIntensity: 0.15 }));
      root.add(pm); pm.position.set(u.x + 0.55, u.py + 0.42, 3.8); pm.rotation.z = -0.55;
      setTimeout(finish, 3600);
      tw(pm.position, { z: 0 }, 1100, "easeOutCubic", function () {
        applyOnce();
        tw(pm.scale, { x: 0.01 }, 700, "easeInQuad", function () { if (pm.parent) root.remove(pm); });
        tw(u.plateCyl.rotation, { y: u.plateCyl.rotation.y - Math.PI * 2 }, 1300, "easeInOutSine", finish);
      });
    });
  }
  function setPlateSurface(i, cv) {
    if (!ready || !cv) return;
    var u = units[i]; if (u.plateMat.map) u.plateMat.map.dispose();
    u.plateMat.map = mapTex(cv); u.plateMat.color.setHex(0xffffff); u.plateMat.needsUpdate = true;
  }
  function setBlanket(i, cv) {
    if (!ready) return;
    var u = units[i]; if (u.blanketMat.map) { u.blanketMat.map.dispose(); u.blanketMat.map = null; }
    if (cv) { u.blanketMat.map = mapTex(cv); u.blanketMat.color.setHex(0xffffff); } else u.blanketMat.color.setHex(0x2b3a4a);
    u.blanketMat.needsUpdate = true;
  }
  function clearPlate(i) {
    if (!ready) return;
    var u = units[i]; if (u.plateMat.map) { u.plateMat.map.dispose(); u.plateMat.map = null; }
    u.plateMat.color.setHex(0xc8d0d6); u.plateMat.needsUpdate = true; u.bandMat.color.setHex(0x9aa3ab); drawUnitLabel(u, "–", null);
    u.plateOn = false; refreshFlowState(u);
  }
  function setInk(i, hex, level, animate) {
    if (!ready) return;
    var u = units[i], ink = u.ink;
    if (!hex) { ink.visible = false; u.rollMats.forEach(function (m) { m.color.setHex(ROLL_IDLE); }); u.inkOn = false; refreshFlowState(u); return; }
    ink.visible = true; ink.material.color.set(hex);
    u.inkOn = true; u.inkHex = new T.Color(hex).getHex(); refreshFlowState(u);
    var target = new T.Color(ROLL_IDLE).lerp(new T.Color(hex), 0.65), lv = Math.max(0.05, (level || 0) / 100);
    if (animate && A && !reduced) {
      u.rollMats.forEach(function (m) { tw(m.color, { r: target.r, g: target.g, b: target.b }, 900); });
      tw(ink.scale, { y: lv }, 900, "easeOutCubic");
    } else { u.rollMats.forEach(function (m) { m.color.copy(target); }); ink.scale.y = lv; }
  }
  function setStages(cvs) {
    for (var i = 1; i <= 4; i++) { if (stageTex[i]) stageTex[i].dispose(); stageTex[i] = cvs && cvs[i - 1] ? new T.CanvasTexture(cvs[i - 1]) : null; }
  }
  function printSheets(n, cvs) {
    if (!ready) return Promise.resolve();
    if (cvs) setStages(cvs);
    idle = false;
    return new Promise(function (ok) {
      pendingSheets += n; printing = true;
      var prev = onPrinted; onPrinted = function () { if (prev) prev(); ok(); };
    });
  }
  function setPile(cv) {
    if (!ready || !cv) return;
    var tex = new T.CanvasTexture(cv);
    if (stageTex[4]) stageTex[4].dispose();
    stageTex[4] = tex; pileTop.material.map = tex; pileTop.material.needsUpdate = true;
  }

  return {
    init: init, resize: resize, focus: focus, zoom: zoom, getZoom: getZoom, setZoom: setZoom, setXray: setXray, setFlows: setFlows, setFlowLevels: setFlowLevels,
    highlight: highlight, setRunning: setRunning, setSpeed: setSpeed, setFeeding: setFeeding, setImpression: setImpression,
    setPlate: setPlate, setPlateSurface: setPlateSurface, setBlanket: setBlanket, clearPlate: clearPlate, setInk: setInk, setStages: setStages,
    printSheets: printSheets, setPile: setPile, setScreen: drawScreen, stopIdle: stopIdle,
    isReady: function () { return ready; }, getXray: function () { return xray; }, flowsOn: function () { return flowsOn; }
  };
})();
