// The Crypt look (home.look "crypt", Home settings, Look): the Night layout in green code rain,
// with the clock in a 90s terminal window. app.js puts html.theme-crypt on and calls
// crypt.start(); everything else is here and in crypt.css. Nothing here runs in the other looks.
//
// The tiles and the room play along:
//   - the code above the focused tile falls faster, in that app's own colour, and lands on it
//   - a focused app's name decodes from scrambled glyphs, terminal style
//   - the screen's edges glow in the focused app's colour (green otherwise), so lights that follow
//     the picture (a Govee, Philips Hue Sync or other TV backlight) take on that colour too
//   - OK on an app floods the rain and flashes the edges just before the app opens
(function () {
  "use strict";
  var GREEN = [57, 255, 122];
  // brand colours for the edge glow and the rain over a focused app, by the start of its name
  var BRAND = [
    [/^netflix/i, [229, 9, 20]], [/^youtube music/i, [255, 0, 51]], [/^youtube/i, [255, 0, 51]],
    [/^disney/i, [17, 60, 207]], [/^prime/i, [0, 168, 225]], [/^stan/i, [11, 108, 242]],
    [/^binge/i, [122, 53, 255]], [/^kayo/i, [0, 230, 118]], [/^abc|^iview/i, [43, 191, 182]],
    [/^sbs/i, [255, 193, 7]], [/^apple/i, [235, 235, 245]], [/^paramount/i, [10, 100, 255]],
    [/^9now/i, [12, 127, 176]], [/^7plus/i, [230, 30, 60]], [/^10\b|^10 play/i, [255, 255, 255]],
    [/^foxtel/i, [255, 90, 0]], [/^hbo|^max\b/i, [80, 70, 255]], [/^spotify/i, [30, 215, 96]],
    [/^twitch/i, [145, 70, 255]], [/^plex/i, [229, 160, 13]], [/^crunchyroll/i, [244, 117, 33]]
  ];
  var GLYPHS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$+-*/=%#&<>[]{}|^~:;?!";
  var root = document.documentElement;
  var started = false, cv, ctx, W = 0, H = 0, cell = 16, focusRect = null, focusEl = null;
  var RED = [255, 40, 60];
  var tint = GREEN, burstUntil = 0, timer = null, edge;
  var redPill = false, frozenUntil = 0, opMode = false;
  // an app is in front: on a TV the page is never "hidden", so app.js tells us (couch-pause/resume)
  var away = false;
  // (or the screensaver is up, or a program covers the home: the rain stops so the fight has the TV to itself)
  function gone() { return document.hidden || away || !!saverEl || !!(progEl && progEl.classList.contains("go")); }
  function base() { return redPill ? RED : GREEN; }
  // the weather sets how hard it rains: a factor for how many near columns fall and how fast
  var wx = { density: 1, speed: 1, storm: false };
  // after an app closes, the rain keeps its colour for a few seconds
  var linger = null, lingerUntil = 0;
  // "reduce motion" (a computer's accessibility setting) calms the effects; motion=1 in the address
  // (the browser demo) shows them all anyway
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches && !/[?&]motion=1/.test(location.search);

  function el(tag, cls, html) { var n = document.createElement(tag); n.className = cls; if (html) n.innerHTML = html; return n; }
  function rgb(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (a == null ? 1 : a) + ")"; }
  function pick() { return GLYPHS.charAt((Math.random() * GLYPHS.length) | 0); }

  // ---------- the frame: the clock in a 90s terminal window ----------
  function frameSVG() {
    var btn = "";
    [1262, 1300, 1338].forEach(function (x, i) {
      btn += '<rect class="btn" x="' + x + '" y="160" width="28" height="26"/>' +
        ['<path d="M' + (x + 7) + ' 179H' + (x + 21) + '"/>', '<rect x="' + (x + 7) + '" y="167" width="14" height="12"/>',
         '<path d="M' + (x + 8) + ' 167L' + (x + 20) + ' 179M' + (x + 20) + ' 167L' + (x + 8) + ' 179"/>'][i];
    });
    return '<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect class="nave" x="520" y="150" width="880" height="450"/>' +
      '<g class="lines">' +
      '<rect x="520" y="150" width="880" height="450"/><rect class="thin" x="530" y="196" width="860" height="394"/>' +
      '<rect class="bar" x="520" y="150" width="880" height="46"/>' +
      '<text x="546" y="182">C:\\TIME.EXE</text>' + btn +
      "</g></svg>";
  }

  // ---------- the rain ----------
  // Slick (the default): two layers for depth, a faint slow far one of small glyphs and a sparse
  // brighter near one, and the rain thins out behind the clock window and the apps. Classic
  // (home.crypt_style "classic"): the first version, one even layer.
  var slick = true, layers = [], quiet = [];
  function size() {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    var spec = slick ? [{ n: 110, alpha: 0.38, speed: 0.55, density: 1, near: false },
                        { n: 52, alpha: 1, speed: 1, density: 0.42, near: true }]
                     : [{ n: 64, alpha: 1, speed: 1, density: 1, near: true }];
    layers = spec.map(function (L) {
      var c = Math.max(8, Math.round(W / L.n)), cols = [];
      for (var i = 0; i < Math.ceil(W / c); i++) {
        cols.push({ on: Math.random() < L.density, r: Math.random(), y: Math.random() * -H / c, v: 0.25 + Math.random() * 0.55 });
      }
      return { cell: c, alpha: L.alpha, speed: L.speed, near: L.near, cols: cols, font: c + "px VT323, monospace" };
    });
    cell = layers[layers.length - 1].cell;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "top";
  }
  // the clock window, where the SVG draws it (1920x1080 units, scaled to cover the screen)
  function windowRect() {
    var k = Math.max(W / 1920, H / 1080), ox = (W - 1920 * k) / 2, oy = (H - 1080 * k) / 2;
    return { left: ox + 520 * k, top: oy + 150 * k, right: ox + 1400 * k, bottom: oy + 600 * k };
  }
  function inQuiet(x, y) {
    for (var i = 0; i < quiet.length; i++) {
      var q = quiet[i];
      if (x > q.left && x < q.right && y > q.top && y < q.bottom) return true;
    }
    return false;
  }
  function frame() {
    timer = null;
    if (gone()) return;
    var now = Date.now(), burst = now < burstUntil;
    if (now < frozenUntil) { timer = setTimeout(frame, 66); return; }   // bullet time: the rain hangs
    ctx.fillStyle = "rgba(0,0,0," + (burst ? 0.06 : 0.1) + ")";
    ctx.fillRect(0, 0, W, H);
    // colours worked out once a frame, not once a glyph (parsing a colour string is not free)
    var trailCol = now < lingerUntil ? linger : base(), headRGB = redPill ? "255,200,205" : "200,255,216", sty = {};
    var style = function (kind, a) {
      var key = kind + a;
      return sty[key] || (sty[key] = kind === 0 ? rgb(tint, a) : kind === 1 ? rgb(trailCol, 0.75 * a) :
        kind === 2 ? "rgba(255,255,255," + a + ")" : "rgba(" + headRGB + "," + a + ")");
    };
    for (var l = 0; l < layers.length; l++) {
      var L = layers[l], c0 = L.cell;
      ctx.font = L.font;
      var fx1 = focusRect && L.near ? focusRect.left - 2 * c0 : -1, fx2 = focusRect && L.near ? focusRect.right + 2 * c0 : -1;
      for (var i = 0; i < L.cols.length; i++) {
        var c = L.cols[i], x = i * c0, over = x + c0 > fx1 && x < fx2;
        var dens = wx.density * (opMode ? 1.8 : 1);   // the operator's station: the raw feed, thick
        var on = c.on || (L.near && c.r < (dens - 1) * 0.5);   // heavier weather: more columns
        if (L.near && dens < 1 && c.r > dens) on = false;   // lighter weather: fewer
        if (!on && !over && !burst) continue;
        var py = Math.floor(c.y) * c0;
        c.y += c.v * L.speed * wx.speed * (opMode ? 1.3 : 1) * (burst ? 3 : over ? 2.2 : 1);
        var y = Math.floor(c.y) * c0;
        var a = L.alpha * (slick && !over && inQuiet(x, y) ? 0.22 : 1);
        if (y !== py && py >= 0) {   // the cell the head just left turns into its trail
          ctx.fillStyle = style(over ? 0 : 1, a);
          drawGlyph(x, py, c0);
        }
        ctx.fillStyle = style(over ? 2 : burst ? 0 : 3, a);
        drawGlyph(x, y, c0);
        // a drop over the focused tile lands on its top edge; the others run off the bottom
        var floor = over && focusRect ? focusRect.top - c0 : H;
        if (y > floor || (y > H * 0.4 && Math.random() > 0.985)) { c.y = Math.random() * -12; c.v = 0.25 + Math.random() * 0.55; }
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);   // drawGlyph leaves the last glyph's mirror in place
    if (spellMask) spellDraw();
    if (slick && !root.classList.contains("saver") && !reduced) traceDraw(now);
    timer = setTimeout(frame, 66);   // about 15 frames a second: enough for rain, easy on a TV stick
  }

  // ---------- the home's edge: two short streaks of light running round the screen ----------
  // Drawn into the rain's own canvas, which is redrawn anyway; its fade leaves each streak a tail.
  function tracePoint(d, inset) {
    var w = W - 2 * inset, h = H - 2 * inset, p = 2 * (w + h);
    d = ((d % p) + p) % p;
    if (d < w) return [inset + d, inset];
    d -= w; if (d < h) return [W - inset, inset + d];
    d -= h; if (d < w) return [W - inset - d, H - inset];
    d -= w; return [inset, H - inset - d];
  }
  function traceDraw(now) {
    var inset = Math.max(2, cell * 0.35), per = 2 * (W + H), len = per * 0.06, lap = 14000;
    var idle = root.classList.contains("crypt-idle");
    ctx.save();
    ctx.lineWidth = Math.max(2, cell * 0.18);
    ctx.lineCap = "round";
    ctx.strokeStyle = rgb(traceCol, idle ? 0.45 : 0.9);
    for (var s2 = 0; s2 < 2; s2++) {
      var head = (now % lap) / lap * per + s2 * per / 2;
      ctx.beginPath();
      for (var k = 0; k <= 10; k++) {
        var q = tracePoint(head - len + len * k / 10, inset);
        if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- the rain spells words (the screensaver): the time, then the weather ----------
  // The text is drawn once onto a small grid, one cell per glyph of the near layer; every frame a
  // few of those cells light up bright, so the words keep forming out of the falling code.
  var spellMask = null, spellCells = [];
  function spell(text) {
    if (!text) { spellMask = null; spellCells = []; return; }
    // the finest layer's cells, so the letters have enough glyphs to read clearly
    var c0 = Math.max(8, Math.round(W / 120)), cols = Math.ceil(W / c0), rows = Math.ceil(H / c0);
    var g = document.createElement("canvas"); g.width = cols; g.height = rows;
    var x = g.getContext("2d");
    var size = Math.floor(rows * 0.5);
    x.font = size + "px VT323, monospace";
    while (x.measureText(text).width > cols * 0.86 && size > 4) { size--; x.font = size + "px VT323, monospace"; }
    x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#fff";
    x.fillText(text, cols / 2, rows / 2);
    var d = x.getImageData(0, 0, cols, rows).data;
    spellCells = [];
    for (var i = 0; i < cols * rows; i++) if (d[i * 4 + 3] > 110) spellCells.push([(i % cols) * c0, Math.floor(i / cols) * c0]);
    spellMask = { cell: c0, font: c0 + "px VT323, monospace" };
  }
  function spellDraw() {
    ctx.font = spellMask.font;
    var n = Math.max(12, Math.round(spellCells.length / 2.5));
    var col = rgb(base(), 0.9);
    for (var k = 0; k < n; k++) {
      var p = spellCells[(Math.random() * spellCells.length) | 0];
      ctx.fillStyle = Math.random() < 0.2 ? "rgba(255,255,255,0.95)" : col;
      drawGlyph(p[0], p[1], spellMask.cell);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function drawGlyph(x, y, c0) {
    // mirrored, as on the film's screens (one transform, not a save and restore per glyph: the
    // caller puts the transform back once it has drawn them all)
    ctx.setTransform(-1, 0, 0, 1, x + c0, y); ctx.fillText(pick(), 0, 0);
  }
  // with "reduce motion" switched on (a computer's accessibility setting; some Windows PCs have it on
  // by default) the rain still falls, but as a slow drizzle at a third of the pace
  function run() { if (!timer) timer = setTimeout(frame, reduced ? 200 : 66); }

  // ---------- focus: what the tiles do ----------
  function brand(name) {
    for (var i = 0; i < BRAND.length; i++) if (BRAND[i][0].test(name)) return BRAND[i][1];
    return null;
  }
  // Any other app: its icon's own strongest colour, read from the icon (the TV serves icons to the
  // page with CORS allowed, for Glass app icons). Grey or dark icons stay green.
  var iconTint = {};
  function tintOf(img) {
    var src = img && img.getAttribute("src");
    if (!src) return null;
    if (iconTint[src] !== undefined) return iconTint[src];
    // The dock's own <img> has no crossorigin, so a canvas may not read it. A second copy asked
    // for with crossOrigin (the TV serves icons with CORS allowed) can be read; the answer comes
    // a moment later, and track() picks it up on its next look.
    iconTint[src] = null;
    var im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = function () { iconTint[src] = measure(im); };
    im.onerror = function () { iconTint[src] = null; };
    im.src = src;
    return null;
  }
  function measure(img) {
    try {
      var cvs = document.createElement("canvas"), n = 24;
      cvs.width = cvs.height = n;
      var x = cvs.getContext("2d");
      x.drawImage(img, 0, 0, n, n);
      var d = x.getImageData(0, 0, n, n).data, sum = [0, 0, 0], wsum = 0;
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        var w = a / 255 * (mx - mn) * (mx > 50 ? 1 : 0);   // colourful, not dark, not see-through
        sum[0] += r * w; sum[1] += g * w; sum[2] += b * w; wsum += w;
      }
      if (wsum < 2000) return null;   // a grey or dark icon: stays green
      var c = sum.map(function (v) { return v / wsum; });
      var top = Math.max(c[0], c[1], c[2]) || 1;   // full brightness, same hue
      return c.map(function (v) { return Math.round(v * 255 / top); });
    } catch (e) {
      return null;   // an icon the page may not read
    }
  }
  function tintFor(f) {
    var label = f.querySelector(".label");
    var name = label ? (label.getAttribute("data-real") || label.textContent) : "";
    return brand(name) || tintOf(f.querySelector(".face img")) || GREEN;
  }
  var traceCol = GREEN;
  function setEdge(c, strong) {
    if (c === GREEN) c = base();
    if (!strong) traceCol = c;
    var sv = root.classList.contains("saver");   // the screensaver keeps its glow (the Govee camera follows it)
    // the home: a thin line traced around the screen (crypt-trace) and only a breath of glow, except in a flash
    if (sv && !strong)   // the screensaver: a fine lit rim fading into a soft falloff (layered, so no flat band of colour)
      edge.style.boxShadow = "inset 0 0 0 0.12rem " + rgb(c, 0.55) + ", inset 0 0 1.2rem 0.1rem " + rgb(c, 0.45) +
        ", inset 0 0 5rem 0.5rem " + rgb(c, 0.22) + ", inset 0 0 14rem 1rem " + rgb(c, 0.1);
    else edge.style.boxShadow = "inset 0 0 " + (strong ? (sv ? "16rem 6rem " : "12rem 4rem ") : "3rem 0.25rem ") +
      rgb(c, strong ? (sv ? 0.95 : 0.8) : 0.18);
    if (c === GREEN) c = base();
    root.style.setProperty("--c-tint", rgb(c, 0.85));   // the focused app's glow (slick)
    if (!strong && !gv.breath) gColour(c);   // the Govee lights, when there are some
  }
  function decode(label) {
    var real = label.getAttribute("data-real") || label.textContent;
    label.setAttribute("data-real", real);
    var step = 0, n = 10;
    (function tick() {
      if (!label.isConnected) return;
      var out = "";
      for (var i = 0; i < real.length; i++) out += real.charAt(i) === " " || i < real.length * step / n ? real.charAt(i) : pick();
      label.textContent = out;
      if (++step <= n) setTimeout(tick, 40);
    })();
  }
  var trackN = 0;
  function track() {
    if (gone()) return;   // an app or the screensaver in front: no point measuring the home
    var f = document.querySelector(".tile.focus, .ncard.focus, .qbtn.focus, .people.focus, .prow.focus");
    if (f !== focusEl) {
      focusEl = f;
      var label = f && f.classList.contains("app") ? f.querySelector(".label") : null;
      tint = label ? tintFor(f) : GREEN;
      setEdge(tint, false);
      if (label && !reduced) decode(label);
      if (f) { f.classList.remove("crypt-in"); void f.offsetWidth; f.classList.add("crypt-in"); }
      if (f) command(commandFor(f));
      if (f && root.classList.contains("crypt-sound")) click();
    }
    else if (f && f.classList.contains("app") && tint === GREEN) {
      var again = tintFor(f);   // the icon may have finished loading since
      if (again !== GREEN) { tint = again; setEdge(tint, false); }
    }
    focusRect = f && f.getBoundingClientRect ? f.getBoundingClientRect() : null;
    if (trackN++ % 8 === 0 || f !== quiet.f) {   // the quiet areas move rarely: about once a second is plenty
      var grid = document.getElementById("grid");
      quiet = [windowRect()].concat(grid && !root.classList.contains("crypt-idle") ? [grid.getBoundingClientRect()] : []);
      quiet.f = f;
    }
  }

  // ---------- slick: the clock types itself, a boot line on Home, an idle mode ----------
  // The time retypes, one character after another, whenever the minute changes.
  function watchClock() {
    var t = document.getElementById("time");
    if (!t || !window.MutationObserver) return;
    var last = t.textContent;
    new MutationObserver(function () {
      if (t.textContent === last) return;
      var first = !last;
      last = t.textContent;
      if (first || reduced) return;
      t.classList.remove("crypt-type"); void t.offsetWidth; t.classList.add("crypt-type");
    }).observe(t, { childList: true, characterData: true, subtree: true });
  }
  // A short start-up whenever the home comes on screen: Home pressed, or back from an app.
  var bootEl = null;
  // the TV coming on (the first start, or back after a long time away): a 90s power-on check first
  function anniversary() {
    var m = location.search.match(/[?&]date=(\d{4})/), d = new Date();
    var md = m ? m[1] : ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
    return md === "0331";
  }
  var biosAt = 0;
  // one start-up at a time: a newer one takes over the screen and the older one's timers stand down
  var bootGen = 0, bootUntil = 0, lastCrt = 0;
  function biosBoot() {
    if (reduced || !bootEl) return boot();
    biosAt = Date.now();
    var gen = ++bootGen, S = 1.35;   // a touch slower, so each line can be read
    bootEl.innerHTML = "";
    bootEl.classList.add("on", "bios");
    var add = function (t) { var d = el("div", ""); d.textContent = t; bootEl.appendChild(d); return d; };
    var cores = navigator.hardwareConcurrency || 4;
    var steps = [
      [0, "CRYPT BIOS v4.51PG  (C) 1999 CONSTRUCT SYSTEMS INC."],
      [450, "CPU: NEURAL-ARM x" + cores + " @ 1.90GHZ"],
      [900, "MEMORY TEST: ", "mem"],
      [2300, "VIDEO: " + panelRes() + " ... OK"],
      [2750, "FDD A: 1.44MB ........ OK"],
      [3200, "HDD C: CONSTRUCT ..... OK"],
      [3650, "BOOTING CRYPT OS 9.0 FROM C: ..."]
    ];
    if (anniversary()) steps.push([4100, "FIRST RUN 31.03.1999 ... HAPPY BIRTHDAY, MATRIX"]);
    steps.push([anniversary() ? 4550 : 4100, "READY_"]);
    steps.forEach(function (st) {
      setTimeout(function () {
        if (gen !== bootGen) return;
        var d = add(st[1]);
        if (st[2] === "mem") {
          var k = 0;
          (function count() {
            k = Math.min(640, k + 64);
            d.textContent = "MEMORY TEST: " + k + "K" + (k === 640 ? " OK" : "");
            if (k < 640) setTimeout(count, 160);
          })();
        }
      }, st[0] * S);
    });
    var end = (anniversary() ? 4550 : 4100) * S + 2000;   // READY_ holds a moment, then the home
    bootUntil = Date.now() + end;
    setTimeout(function () { if (gen !== bootGen) return; bootEl.classList.remove("on", "bios"); crtOn(); gPulse(); }, end);
  }
  // an old tube coming on: a bright line that opens into the picture
  function crtOn() {
    if (reduced || Date.now() - lastCrt < 3000) return;   // never twice in a row
    lastCrt = Date.now();
    root.classList.remove("crypt-crton"); void root.offsetWidth; root.classList.add("crypt-crton");
    setTimeout(function () { root.classList.remove("crypt-crton"); }, 1000);
  }
  // the TV's own panel (4K on the BRAVIA) from the app, not the 1080p the home is drawn at
  function panelRes() {
    var j = sysInfo();
    if (j.panel) return j.panel + (j.hz ? " @" + j.hz + "HZ" : "");
    return Math.round(screen.width * (devicePixelRatio || 1)) + "x" + Math.round(screen.height * (devicePixelRatio || 1));
  }
  function boot() {
    if (reduced || !bootEl || Date.now() < bootUntil) return;   // a start-up is already on screen
    var gen = ++bootGen, step = 600, hold = 1800;
    var lines = ["CRYPT OS 9.0", "LINK ............ OK", "DISPLAY ......... " + panelRes(),
      "WEATHER ......... OK", "READY_"];
    bootEl.innerHTML = "";
    bootEl.classList.add("on");
    gPulse();
    lines.forEach(function (txt, i) {
      setTimeout(function () { if (gen !== bootGen) return; var d = el("div", ""); d.textContent = "> " + txt; bootEl.appendChild(d); }, 150 + i * step);
    });
    // the lines hold a moment to be read, then clear, and the home snaps in like an old tube
    bootUntil = Date.now() + 150 + lines.length * step + hold;
    setTimeout(function () { if (gen !== bootGen) return; bootEl.classList.remove("on"); crtOn(); }, 150 + lines.length * step + hold);
  }
  // Idle: after 30 s with no button, the apps and Keep watching fade away, leaving the rain, the
  // clock and the network chatter. The first button only wakes the home; it does nothing else.
  var IDLE_MS = 30000, idleTimer = null;
  function busy() {
    return ["setting", "gearing", "apping", "expanded", "lifting"].some(function (c) { return root.classList.contains(c); });
  }
  function armIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      // never while the red pill has the remote (the takeover, the pills, the broken construct)
      if (!busy() && !gone() && !swallow && !broken && !hrun && !consoleIsOpen()) {
        root.classList.add("crypt-idle");
        setEdge(GREEN, false); gColour(base(), true);   // idle: the edges (and the room) go back to green
        gBreathe(true);
      } else armIdle();
    }, IDLE_MS);
  }
  // ---------- the command line under the clock: what the remote is on, as a command ----------
  var cmdEl = null, cmdTimer = null, cmdHold = 0;
  function slug(t) { return String(t || "").toLowerCase().replace(/\+/g, "plus").replace(/[^a-z0-9]+/g, ""); }
  function nameOf(f) {
    var l = f.querySelector(".label, b");
    return l ? (l.getAttribute("data-real") || l.textContent) : "";
  }
  function commandFor(f) {
    if (f.classList.contains("app")) {
      var n = nameOf(f), k = f.querySelector(".face.tool") && !f.querySelector("img");
      if (/^(settings|more apps)$/i.test(n)) return "open " + slug(n) + ".sys";
      if (k && /^pc$/i.test(n)) return "connect hdmi4 --pc";
      return "run " + slug(n) + ".exe";
    }
    if (f.classList.contains("ncard")) {
      var title = (f.querySelector("b") || {}).textContent || "", ep = (f.querySelector("i") || {}).textContent || "";
      return 'play "' + title + '"' + (ep ? " " + ep.toLowerCase().replace(/\s+/g, "") : "");
    }
    if (f.classList.contains("qbtn")) return "open " + slug(f.textContent || f.id.replace(/^q-/, "")) + ".sys";
    if (f.classList.contains("person") || f.classList.contains("prow") || f.classList.contains("people")) return "login " + slug(f.textContent);
    return "";
  }
  // types the line out, a character at a time, ending on a blinking cursor
  function command(text, keep) {
    if (!cmdEl || !text) return;
    if (Date.now() < cmdHold && !keep) return;   // a session line is still showing
    clearTimeout(cmdTimer);
    var full = text, i = 0;
    // a long line shrinks to fit the window (down to 60%), and wraps onto a second line past that
    cmdEl.style.fontSize = ""; cmdEl.classList.remove("wrap");
    cmdEl.textContent = full;
    // only a long line is measured (measuring makes the TV lay the page out there and then; the
    // everyday lines, an app's name, always fit)
    if (full.length > 30 && cmdEl.scrollWidth > cmdEl.clientWidth + 1) {
      var fs = parseFloat(getComputedStyle(cmdEl).fontSize), k = cmdEl.clientWidth / cmdEl.scrollWidth * 0.97;
      cmdEl.style.fontSize = (fs * Math.max(0.6, k)) + "px";
      if (k < 0.6) cmdEl.classList.add("wrap");
    }
    (function type() {
      cmdEl.textContent = full.slice(0, i);
      if (i++ < full.length) cmdTimer = setTimeout(type, reduced ? 0 : 28);
    })();
  }
  // ---------- sessions: when an app is opened, and the line when the home comes back ----------
  var session = null;
  function opened(f) {
    session = { name: nameOf(f), at: Date.now(), tint: tint };
    if (cmdEl) {   // a 1999 modem, then the program (set at once: the app is in front within a second)
      clearTimeout(cmdTimer);
      cmdEl.textContent = "ATDT 555-01" + (10 + ((Math.random() * 89) | 0)) + " ... CONNECT 56000";
      cmdTimer = setTimeout(function () { cmdEl.textContent = "executing " + slug(session ? session.name : "") + ".exe ..."; }, 450);
      cmdHold = Date.now() + 3000;
    }
    setTimeout(gSync, 700);   // after the flash, the lights go back to following the screen
  }
  function back() {
    if (!session) return;
    var s = session, mins = Math.round((Date.now() - s.at) / 60000);
    session = null;
    if (Date.now() - s.at < 5000) return;   // in and straight back out: nothing to report
    var dur = mins >= 60 ? Math.floor(mins / 60) + "h" + ("0" + (mins % 60)).slice(-2) + "m" : Math.max(1, mins) + "m";
    var line = slug(s.name).toUpperCase() + ".EXE ... SESSION " + dur + " CLOSED";
    try {
      var day = new Date().toDateString(), log = JSON.parse(localStorage.getItem("crypt.log") || "{}");
      if (log.day !== day) log = { day: day, apps: {} };
      var key = slug(s.name).toUpperCase();
      log.apps[key] = (log.apps[key] || 0) + Math.max(1, mins);
      localStorage.setItem("crypt.log", JSON.stringify(log));
    } catch (x) {}
    var after = Math.max(1300, bootUntil - Date.now() + 500);   // once the boot lines have cleared
    cmdHold = Date.now() + after + 8000;
    setTimeout(function () { command(line, true); }, after);
    linger = s.tint === GREEN ? base() : s.tint; lingerUntil = Date.now() + 6000;
    setEdge(linger, false);
    setTimeout(function () { if (Date.now() >= lingerUntil) setEdge(tint, false); }, 6100);
    var hhmm = function (t) { var d = new Date(t); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); };
    var total = 0, count = 0;
    try { var lg = JSON.parse(localStorage.getItem("crypt.log") || "{}"); for (var k in lg.apps || {}) { total += lg.apps[k]; count++; } } catch (x) {}
    var app = slug(s.name).toUpperCase();
    logSession([
      "== SESSION CLOSED ==",
      "PROCESS ...... " + app + ".EXE",
      "OPENED ....... " + hhmm(s.at),
      "CLOSED ....... " + hhmm(Date.now()),
      "DURATION ..... " + dur,
      "STREAM ....... ~" + Math.max(0.1, mins * (0.02 + Math.random() * 0.03)).toFixed(1) + " GB IN",
      "TODAY ........ " + hm(total) + " / " + count + " APP" + (count === 1 ? "" : "S"),
      "EXIT CODE .... 0",
      "RETURNING TO NETWORK MONITOR ..."
    ]);
  }
  // ---------- the weather: how hard it rains, and lightning in a storm ----------
  var flashEl = null, stormTimer = null;
  function weather(w) {
    if (!w || w.code == null) return;
    var c = +w.code;
    var rain = (c >= 51 && c <= 67) || (c >= 80 && c <= 82);
    var storm = c >= 95;
    wx = storm ? { density: 2.1, speed: 1.7, storm: true }
      : rain ? { density: 1.8, speed: 1.5, storm: false }
      : c <= 1 ? { density: 0.55, speed: 0.75, storm: false }
      : { density: 1, speed: 1, storm: false };
    clearTimeout(stormTimer);
    if (wx.storm) lightning();
  }
  function lightning() {
    stormTimer = setTimeout(function () {
      if (!gone() && flashEl && !reduced) {
        flashEl.classList.remove("on"); void flashEl.offsetWidth; flashEl.classList.add("on");
        root.classList.add("crypt-glitch");
        edge.style.boxShadow = "inset 0 0 18rem 8rem rgba(235,245,255,0.95)";   // the room flashes too
        gFlash();
        setTimeout(function () { root.classList.remove("crypt-glitch"); setEdge(tint, false); }, 260);
      }
      if (wx.storm) lightning();
    }, 7000 + Math.random() * 16000);
  }
  // ---------- the red pill: up up down down left right left right on the remote ----------
  // Green: the code runs the takeover (the screen goes black and types the opening lines), then
  // the home shatters into code and rebuilds red, and the lights strobe and hold blood red.
  // Red: the code brings up the choice, RED to break everything, BLUE to go back to green. Green or
  // red, agents turn up (every minute or two in red, every 5 to 9 minutes in green: a warning
  // flashes and the rain hangs for a moment),
  // and every 5 to 9 minutes the proximity alarm sounds and ends in the EMP.
  var CODE = "ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight", lastKeys = [];
  var takeEl = null, choiceEl = null, choiceAt = 0, agentTimer = null, swallow = false;
  function who() {
    var cfg = window.COUCH_CONFIG || {}, h = cfg.home || {}, p = (cfg.people || [])[0];
    var m = location.search.match(/[?&]names=([^,&]+)/);
    return h.wake_name || (p && p.name) || (m && decodeURIComponent(m[1])) || "Neo";
  }
  function wakeLines() { var n = who(); return ["Wake up, " + n + "...", "The Matrix has you...", "Follow the white rabbit.", "Knock, knock, " + n + "."]; }
  // the black screen and the slow typing; cb() when the last line is done
  function takeover(lines, cb, opts) {
    opts = opts || {};
    if (!takeEl) { takeEl = el("div", "crypt-take"); document.body.appendChild(takeEl); }
    takeEl.innerHTML = "";
    takeEl.classList.add("on");
    gBright(15);
    var li = 0;
    function nextLine() {
      if (li >= lines.length) { setTimeout(function () { cb && cb(); }, opts.hold || 700); return; }
      var d = el("div", "tline"), txt = lines[li], k = 0;
      if (opts.onLine) opts.onLine(li);
      takeEl.appendChild(d);
      if (li > 0 && takeEl.children.length > 1 && !opts.stack) takeEl.removeChild(takeEl.children[0]);
      (function type() {
        d.textContent = txt.slice(0, ++k);
        if (k === 1) fitTake();
        if (k % 3 === 0) click();
        if (k < txt.length) setTimeout(type, txt.charAt(k - 1) === "." ? 260 : 85);
        else { li++; gBright(li === lines.length ? 100 : 35 + li * 10); setTimeout(nextLine, li === lines.length ? 500 : 1500); }
      })();
    }
    setTimeout(nextLine, opts.wait == null ? 900 : opts.wait);
  }
  function fitTake() {   // the oldest lines scroll away rather than the newest running off the bottom
    if (!takeEl) return;
    while (takeEl.children.length > 1 && takeEl.scrollHeight > takeEl.clientHeight + 2) takeEl.removeChild(takeEl.firstChild);
  }
  function takeOff() { if (takeEl) takeEl.classList.remove("on"); }
  // everything on the home falls apart into glyphs, then comes back
  function shatter(col, hold) {
    col = col || RED; hold = hold || 1200;
    var c = el("canvas", "crypt-shard"), g = c.getContext("2d"), dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    document.body.appendChild(c);
    var bits = [], step = cell * 1.1;
    Array.prototype.forEach.call(document.querySelectorAll(".app .face, .ncard, .time, .date, .crypt-cmd, .qbtn, .crypt-log"), function (n) {
      var r = n.getBoundingClientRect();
      if (r.width < 2 || r.bottom < 0 || r.top > innerHeight) return;
      for (var y = r.top; y < r.bottom; y += step) for (var x = r.left; x < r.right; x += step) {
        if (Math.random() > 0.55) continue;
        bits.push({ x: x, y: y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 4, c: pick(), d: Math.random() * 300 });
      }
    });
    root.classList.add("crypt-shattered");
    var t0 = performance.now();
    (function draw(now) {
      var t = now - t0;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, innerWidth, innerHeight);
      g.font = Math.round(cell * 1.2) + "px " + getComputedStyle(root).getPropertyValue("--c-term");
      bits.forEach(function (b) {
        if (t < b.d) { g.fillStyle = "rgba(255,255,255,.9)"; g.fillText(b.c, b.x, b.y); return; }
        b.vy += 0.45; b.x += b.vx; b.y += b.vy;
        g.fillStyle = Math.random() > 0.9 ? "#fff" : rgb(col, Math.max(0, 1 - t / (hold + 600)));
        g.fillText(Math.random() > 0.8 ? pick() : b.c, b.x, b.y);
      });
      if (t > hold) root.classList.remove("crypt-shattered");
      if (t < hold + 700) requestAnimationFrame(draw); else c.remove();
    })(t0);
  }
  function strobe(done) {
    var k = 0;
    (function step() {
      gColour(k % 2 ? RED : [255, 255, 255], true);
      if (++k < 10) setTimeout(step, 110); else { gBright(100); gColour(RED, true); done && done(); }
    })();
  }
  function setRed(on, quiet) {
    redPill = on;
    try { localStorage.setItem("crypt.redpill", on ? "1" : ""); } catch (x) {}
    root.classList.toggle("crypt-red", on);
    root.classList.add("crypt-glitch");
    setTimeout(function () { root.classList.remove("crypt-glitch"); }, 900);
    burstUntil = Date.now() + 1400;
    setEdge(tint, true);
    setTimeout(function () { setEdge(tint, false); }, 1400);
    if (cmdEl) { command(on ? "SYSTEM COMPROMISED ... TRACE PROGRAM RUNNING" : "back to the construct ...", true); cmdHold = Date.now() + 4000; }
    if (on) { if (!quiet) { shatter(); strobe(); } else gColour(RED, true); bugsOn(); }
    else { gColour(GREEN, true); bugsOff(); }
    if (!root.classList.contains("saver")) agents();   // agents come more often in red, less in green
  }
  function crash() {
    flashEl.classList.remove("on"); void flashEl.offsetWidth; flashEl.classList.add("on");
    takeOff();
    setRed(true);
    setTimeout(agentSeen, 20000);   // they notice within seconds
  }
  function wakeUp() {
    swallow = true;
    takeover(wakeLines(), function () { crash(); swallow = false; wakeHome(); }, { stack: true });
  }
  // agents: a warning, the rain hangs, the room flashes
  function agentSeen() {
    if (window.console) console.log("crypt: agent " + new Date().toLocaleTimeString());
    // any time on the home, green or red; not over the takeover, the pills or the broken construct
    if (gone() || broken || alarmOn || swallow || hrun) return;
    var a = el("div", "crypt-agent", "!! AGENT DETECTED !!<small>TRACE " + hex(4) + "-" + hex(4) + " ... SECTOR " + ((Math.random() * 90) | 0) + "</small>");
    document.body.appendChild(a);
    frozenUntil = Date.now() + 1400;
    root.classList.add("crypt-glitch");
    gColour([255, 255, 255], true);
    setTimeout(function () { gColour(base(), true); root.classList.remove("crypt-glitch"); }, 250);
    logPush("!! AGENT TRACE " + hex(8) + " DETECTED");
    setTimeout(function () { a.remove(); if (Date.now() - lastKeyAt < 60000) hardlineRun(); else phoneTrace(); }, 2300);
    agentsToday++;
  }
  // green: they take turns, 9 minutes apart: an agent at 9 minutes on the home, the proximity alarm
  // at 18, an agent at 27, and so on (each one every 18 minutes). Red: an agent every 1 to 2 minutes.
  var CYCLE = 540000;
  function agents(again) {
    clearTimeout(agentTimer);
    var m = location.search.match(/[?&]agent=(\d+)/), gap = m ? +m[1] * 1000 : redPill ? 60000 + Math.random() * 60000 : again ? CYCLE * 2 : CYCLE;
    agentTimer = setTimeout(function () { agentSeen(); agents(true); }, gap);
  }
  // the choice: two pills, left and right
  function choice() {
    if (!choiceEl) {
      choiceEl = el("div", "crypt-choice",
        '<div class="cq">&gt; THIS IS YOUR LAST CHANCE.</div>' +
        '<div class="pills"><div class="pill red"><i></i><b>RED</b><span>STAY. SEE HOW DEEP IT GOES.</span></div>' +
        '<div class="pill blue"><i></i><b>BLUE</b><span>WAKE UP BACK IN THE GREEN.</span></div></div>' +
        '<div class="ch">&#9664; &#9654; TO CHOOSE &nbsp; OK TO TAKE IT</div>');
      document.body.appendChild(choiceEl);
    }
    choiceAt = 0; paintChoice();
    choiceEl.classList.add("on");
    swallow = true;
  }
  function paintChoice() {
    choiceEl.querySelector(".red").classList.toggle("sel", choiceAt === 0);
    choiceEl.querySelector(".blue").classList.toggle("sel", choiceAt === 1);
    gColour(choiceAt ? [40, 90, 255] : RED, true);
  }
  function choiceKey(k) {
    if (k === "ArrowLeft" || k === "ArrowRight") { choiceAt = k === "ArrowLeft" ? 0 : 1; click(); paintChoice(); return; }
    var take = k === "Enter" || k === " ";
    if (take || k === "Escape" || k === "Backspace" || k === "GoBack" || k === "BrowserBack") {
      choiceEl.classList.remove("on");
      if (take && choiceAt === 1) { swallow = false; uncorrupt(); setRed(false); wakeHome(); return; }
      if (take && !broken) { mirror(corrupt); return; }   // the mirror takes you first, then you wake up unplugged
      if (take) { corrupt(); return; }
      swallow = !!broken;   // Back: nothing changes; still broken if it was
      gColour(RED, true);
      if (!broken) wakeHome();
    }
  }
  function secret(e) {
    lastKeyAt = Date.now();
    if (empKey) { e.preventDefault(); e.stopImmediatePropagation(); empKey(e.key); return; }   // the EMP waits for the OK
    if (momentKey && !swallow) { var mk = momentKey; if (mk(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); return; } }
    if (hrun) { e.preventDefault(); e.stopImmediatePropagation(); runKey(e.key); return; }
    if (progEl) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (/^(Escape|Backspace|GoBack|BrowserBack)$/.test(e.key)) programEnd();
      else if (progNow && progNow.key) progNow.key(e.key);   // the interactive Last Stand takes the rest
      return;
    }
    if (consoleIsOpen()) { e.preventDefault(); e.stopImmediatePropagation(); consoleKey(e.key); return; }
    if (swallow) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (choiceEl && choiceEl.classList.contains("on")) { choiceKey(e.key); return; }
      if (locked) { lockKey(e.key); return; }
      if (!broken) return;
      // broken: every key is dead, except the code, which brings the pills back
      lastKeys.push(e.key);
      if (lastKeys.length > 8) lastKeys.shift();
      if (lastKeys.join(" ") === CODE) { lastKeys = []; choice(); }
      else noise(0.08);
      return;
    }
    lastKeys.push(e.key);   // the last eight presses, so presses before the code do not matter
    if (lastKeys.length > 8) lastKeys.shift();
    if (lastKeys.join(" ") !== CODE) return;
    lastKeys = [];
    e.preventDefault(); e.stopImmediatePropagation();
    if (redPill) choice(); else wakeUp();
  }

  // back from the red pill: the home fully awake, apps bright, nothing left faded or knocked about
  function wakeHome() {
    root.classList.remove("crypt-idle", "crypt-shattered", "crypt-glitch");
    gBreathe(false);
    armIdle();
  }

  // ---------- RED, again: the construct breaks. Nothing works until the code is entered ----------
  var broken = null;
  var ERRORS = ["FATAL 0x{h}: CONSTRUCT CORRUPT", "SEGMENT FAULT AT 0x{h}", "KERNEL PANIC ... NOT SYNCING", "MEMORY {h} OVERWRITTEN",
    "SIGNAL LOST ... RETRY ... RETRY", "!! ANOMALY DETECTED IN SECTOR {n}", "CORE DUMP ... 0x{h}", "REALITY.SYS NOT FOUND",
    "THE MATRIX CANNOT BE RESTORED", "ACCESS DENIED", "STACK OVERFLOW 0x{h}", "SOURCE UNREACHABLE"];
  function noise(len) {
    if (!root.classList.contains("crypt-sound")) return;
    var a = audio();
    if (!a) return;
    var n = Math.floor(a.sampleRate * len), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() > 0.7 ? 1 : 0.2);
    var src = a.createBufferSource(), g = a.createGain();
    g.gain.value = 0.07; src.buffer = buf; src.connect(g); g.connect(a.destination); src.start();
  }
  function scrambleText() {
    Array.prototype.forEach.call(document.querySelectorAll(".time, .date .dline, .date .cwx, .shelf-head h2, .ncard .t, .crypt-cmd, .crypt-log div, .app .label, .crypt-panel pre"), function (n) {
      if (n.__orig == null) n.__orig = n.innerHTML;
      if (Math.random() > 0.55) return;
      var t = n.textContent || "", out = "";
      for (var i = 0; i < t.length; i++) out += t.charAt(i) === " " || Math.random() > 0.45 ? (Math.random() > 0.8 ? pick() : t.charAt(i)) : pick();
      n.textContent = out.length ? out : pick() + pick() + pick();
    });
  }
  function shakeTiles() {
    Array.prototype.forEach.call(document.querySelectorAll(".app, .ncard, .qbtn, .time, .date, .crypt-frame, .crypt-cmd"), function (n) {
      var r = Math.random();
      // moved, tipped and dimmed only (filters on every tile were too much for the TV)
      n.style.transform = "translate(" + ((Math.random() - 0.5) * 3).toFixed(1) + "rem," + ((Math.random() - 0.5) * 1.5).toFixed(1) + "rem) rotate(" +
        ((Math.random() - 0.5) * (r > 0.85 ? 14 : 4)).toFixed(1) + "deg)";
      n.style.opacity = (0.35 + Math.random() * 0.65).toFixed(2);
    });
  }
  function tear() {
    broken.tears.forEach(function (b) {
      var on = Math.random() > 0.35;
      b.style.display = on ? "block" : "none";
      if (!on) return;
      b.style.top = (Math.random() * 100).toFixed(1) + "vh";
      b.style.height = (0.3 + Math.random() * (Math.random() > 0.8 ? 14 : 3)).toFixed(1) + "vh";
      b.style.transform = "translateX(" + ((Math.random() - 0.5) * 30).toFixed(1) + "vw)";
      var t = "";
      for (var i = 0; i < 60; i++) t += pick();
      b.textContent = t;
    });
  }
  function popError() {
    var e = el("div", "crypt-err");
    e.textContent = "!! " + ERRORS[(Math.random() * ERRORS.length) | 0].replace("{h}", hex(4)).replace("{n}", (Math.random() * 99) | 0);
    e.style.left = (3 + Math.random() * 60).toFixed(1) + "vw";
    e.style.top = (5 + Math.random() * 80).toFixed(1) + "vh";
    document.body.appendChild(e);
    broken.errs.push(e);
    if (broken.errs.length > 4) broken.errs.shift().remove();
    noise(0.15);
  }
  function flickerLights() {
    if (!broken) return;
    var r = Math.random();
    if (r < 0.25) { gColour([255, 255, 255], true); gBright(100); }
    else if (r < 0.45) gBright(1);
    else { gColour(RED, true); gBright(r > 0.8 ? 100 : 30); }
    broken.lt = setTimeout(flickerLights, 400 + Math.random() * 800);
  }
  function corrupt() {
    if (broken) {   // red again while broken: it breaks harder
      flashEl.classList.remove("on"); void flashEl.offsetWidth; flashEl.classList.add("on");
      for (var i = 0; i < 4; i++) setTimeout(popError, i * 120);
      swallow = true;
      return;
    }
    swallow = true;
    if (!redPill) setRed(true, true);
    takeover(["> YOU TOOK THE RED PILL.", "> UNPLUGGING ...", "> ERROR. ERROR. ERROR."], function () {
      takeOff();
      flashEl.classList.remove("on"); void flashEl.offsetWidth; flashEl.classList.add("on");
      shatter(); strobe();
      root.classList.add("crypt-corrupt", "crypt-glitch");
      broken = { tears: [], errs: [], iv: [], lt: null };
      // calmer than it was (it overloaded the TV): three tears, and every effect at a slower beat
      for (var k = 0; k < 3; k++) { var b = el("div", "crypt-tear"); document.body.appendChild(b); broken.tears.push(b); }
      broken.iv.push(setInterval(scrambleText, 450));
      broken.iv.push(setInterval(shakeTiles, 1100));
      broken.iv.push(setInterval(tear, 320));
      broken.iv.push(setInterval(popError, 2200));
      broken.iv.push(setInterval(function () { burstUntil = Date.now() + (Math.random() > 0.5 ? 400 : 0); frozenUntil = Math.random() > 0.85 ? Date.now() + 500 : 0; }, 700));
      broken.iv.push(setInterval(function () { if (cmdEl && Math.random() > 0.6) { cmdEl.__orig = null; command("ESCAPE CODE REQUIRED", true); } }, 9000));
      setTimeout(flickerLights, 1300);
      for (var e = 0; e < 3; e++) setTimeout(popError, 200 + e * 180);
      setTimeout(function () { if (broken) proximity(true); }, 20000);   // and then the sentinels come
      noise(0.6);
    }, { stack: true, hold: 500 });
  }
  function uncorrupt() {
    if (!broken) return;
    broken.iv.forEach(clearInterval);
    clearTimeout(broken.lt);
    broken.tears.concat(broken.errs).forEach(function (n) { n.remove(); });
    Array.prototype.forEach.call(document.querySelectorAll(".app, .ncard, .qbtn, .time, .date, .crypt-frame, .crypt-cmd"), function (n) {
      n.style.transform = ""; n.style.opacity = ""; n.style.filter = "";
    });
    Array.prototype.forEach.call(document.querySelectorAll("*"), function (n) {
      if (n.__orig != null) { if (n.isConnected) n.innerHTML = n.__orig; n.__orig = null; }
    });
    root.classList.remove("crypt-corrupt", "crypt-glitch");
    burstUntil = 0; frozenUntil = 0;
    broken = null;
    gBright(100);
  }

  // ---------- red: the proximity alarm. Sentinels closing in, then the EMP ----------
  var empKey = null, alarmTimer = null, alarmOn = false, alarmStop = null, alarmGap = 0, alarmDueAt = 0, empCharge = 100, empAt = 0;
  function siren(ms) {
    if (!root.classList.contains("crypt-sound")) return;
    var a = audio();
    if (!a) return;
    var o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(), now = a.currentTime;
    o.type = "square"; f.type = "lowpass"; f.frequency.value = 1400; g.gain.value = 0.045;
    for (var t = 0; t < ms / 1000; t += 0.9) { o.frequency.setValueAtTime(520, now + t); o.frequency.linearRampToValueAtTime(880, now + t + 0.45); o.frequency.linearRampToValueAtTime(520, now + t + 0.9); }
    o.connect(f); f.connect(g); g.connect(a.destination); o.start(); o.stop(now + ms / 1000);
  }
  function proximity(theatre) {
    if (gone() || alarmOn) return;
    if (!theatre && (broken || swallow || hrun)) return;
    alarmOn = true;
    var T = theatre ? 9800 : 7600;   // the second red takes its time
    var a = el("div", "crypt-alarm", '<div class="ab">!! PROXIMITY WARNING !!</div><div class="as"></div><pre class="ao"></pre>');
    document.body.appendChild(a);
    root.classList.add("crypt-alarming");
    siren(T);
    var dist = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.15, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002], i = 0, step = T / 12;
    var tick = setInterval(function () {
      var d = dist[Math.min(i, dist.length - 1)];
      a.querySelector(".as").textContent = "SENTINELS INBOUND ... " + (d < 0.01 ? d.toFixed(3) : d.toFixed(2)) + " KM ... " + (6 + i * 3) + " CONTACTS";
      i++;
      burstUntil = Date.now() + 500;
    }, step);
    // the EMP console: charging, armed, the count, the discharge
    var out = a.querySelector(".ao"), lines = [];
    var put = function (k, text) { lines[k] = text; out.textContent = lines.filter(function (x) { return x != null; }).join("\n"); click(); };
    [[0.04, 0, "> SENTINEL SWARM ... ON APPROACH"], [0.16, 1, "> EMP CHARGING ...  20%"], [0.26, 1, "> EMP CHARGING ...  40%"],
     [0.36, 1, "> EMP CHARGING ...  60%"], [0.46, 1, "> EMP CHARGING ...  80%"], [0.55, 1, "> EMP CHARGING ... 100%"],
     [0.60, 2, "> EMP ARMED"]].forEach(function (st) { setTimeout(function () { if (a.isConnected) put(st[1], st[2]); }, st[0] * T); });
    var beacon = 0, lt = setInterval(function () { beacon++; gColour(RED, true); gBright(beacon % 2 ? 100 : 8); }, 380);
    var fire;
    alarmStop = function () {   // the TV went to standby (or an app opened) mid-alarm: it never happened
      clearInterval(tick); clearInterval(lt); clearTimeout(fire);
      a.remove(); root.classList.remove("crypt-alarming");
      alarmOn = false; alarmStop = null;
    };
    if (theatre) alarmStop = null;   // the second red's alarm runs its course
    // armed: the EMP is yours to fire. OK fires it; wait too long and the operator fires it for you.
    var armed = setTimeout(function () {
      if (!a.isConnected) return;
      put(3, "> FIRE THE EMP?   PRESS OK");
      out.classList.add("ask");
      var late = setTimeout(function () { if (empKey) { empKey = null; put(3, "> operator: they're on us. firing it myself."); fire = setTimeout(discharge, 900); } }, 12000);
      empKey = function (k) {
        if (k !== "Enter" && k !== " ") return;   // only OK; everything else waits
        empKey = null; clearTimeout(late); out.classList.remove("ask");
        put(3, "> FIRING ...");
        fire = setTimeout(discharge, 450);
      };
    }, T * 0.66);
    var stopArmed = alarmStop;
    alarmStop = function () { clearTimeout(armed); empKey = null; if (stopArmed) stopArmed(); };
    if (theatre) alarmStop = null;
    function discharge() {
      put(4, "> DISCHARGE");
      alarmStop = null;
      clearInterval(tick); clearInterval(lt);
      // the EMP: white, then nothing, then the system comes back
      empCharge = 0; empAt = Date.now();   // spent: it charges back up over about three minutes
      a.classList.add("emp");
      gColour([255, 255, 255], true); gBright(100);
      setTimeout(function () {
        a.classList.add("dark"); gBright(1);
        if (theatre) gSend("turn", { value: 0 });
        var down = el("div", "crypt-down", "&gt; EMP DISCHARGED ... ALL SYSTEMS DOWN");   // in the dark, then gone
        document.body.appendChild(down);
        setTimeout(function () { down.classList.add("off"); }, 1800);
        setTimeout(function () { down.remove(); }, 3200);
      }, 260);
      if (theatre) { setTimeout(function () { theatreWake(a); }, 5600); return; }   // a long, long dark
      setTimeout(function () {
        a.remove(); root.classList.remove("crypt-alarming");
        boot(); gColour(base(), true); gBright(100);
        alarmOn = false;
      }, 3400);
    }
  }

  // ---------- after the EMP: the dark, the wake-up, and the code to get back in ----------
  var locked = false, lockKeys = [], lockLine = null;
  function theatreWake(alarmEl) {
    uncorrupt();
    setRed(false, true);
    gSend("turn", { value: 0 });   // the room stays dark
    root.classList.remove("crypt-alarming");
    swallow = true; locked = true; lockKeys = [];
    takeover(wakeLines().slice(0, 1), function () {   // just "Wake up, Neo..." then the code
      lockLine = el("div", "tline");
      lockLine.textContent = "> ACCESS CODE: ";
      takeEl.appendChild(lockLine);
      fitTake();
    }, { stack: true, hold: 1600, wait: 600 });
    setTimeout(function () { alarmEl.remove(); alarmOn = false; }, 400);
  }
  function lockKey(k) {
    if (!lockLine) return;   // still typing
    lockKeys.push(k);
    click();
    lockLine.textContent = "> ACCESS CODE: " + new Array(lockKeys.length + 1).join("*");
    if (lockKeys.length < 8) return;
    var ok = lockKeys.join(" ") === CODE;
    lockKeys = [];
    if (!ok) {
      noise(0.25);
      lockLine.textContent = "> ACCESS DENIED";
      var l = lockLine; lockLine = null;
      setTimeout(function () { lockLine = l; l.textContent = "> ACCESS CODE: "; }, 1400);
      return;
    }
    locked = false;
    lockLine.textContent = "> ACCESS GRANTED.";
    var l2 = lockLine; lockLine = null;
    ["> RELOADING CONSTRUCT ...", "> WELCOME BACK, " + who().toUpperCase() + "."].forEach(function (t, i) {
      setTimeout(function () { var d = el("div", "tline"); d.textContent = t; takeEl.appendChild(d); fitTake(); click(); }, 900 + i * 1300);
    });
    setTimeout(function () {
      takeOff(); swallow = false; wakeHome(); boot();
      gSend("turn", { value: 1 });
      [10, 30, 60, 100].forEach(function (b, i) { setTimeout(function () { gColour(GREEN, true); gBright(b); }, 300 + i * 450); });
    }, 3900);
    void l2;
  }

  function alarms() {
    clearTimeout(alarmTimer);
    var m = location.search.match(/[?&]alarm=(\d+)/), gap = m ? +m[1] * 1000 : CYCLE * 2;
    alarmGap = gap; alarmDueAt = Date.now() + gap;
    alarmTimer = setTimeout(function () { proximity(); alarms(); }, gap);
  }

  // the screensaver can take the red pill for you; the home finds out when it is back
  function redFromSaver() {
    var now = false;
    try { now = localStorage.getItem("crypt.redpill") === "1"; } catch (x) {}
    if (now && !redPill) setTimeout(function () { setRed(true); }, 1200);
  }

  // ---------- (preview) ASCII Keep watching: [██████░░░░] 61% ----------
  function asciiBars() {
    var shelf = document.getElementById("shelf");
    if (!shelf || !window.MutationObserver) return;
    function draw() {
      Array.prototype.forEach.call(shelf.querySelectorAll(".ncard"), function (c) {
        var i = c.querySelector(".nbar i"), t = c.querySelector(".t");
        if (!i || !t || t.querySelector(".abar")) return;
        var pct = Math.max(0, Math.min(100, parseFloat(i.style.width) || 0)), n = 12, on = Math.round(pct / 100 * n);
        var a = el("span", "abar");
        a.textContent = "[" + new Array(on + 1).join("\u2588") + new Array(n - on + 1).join("\u2591") + "] " + Math.round(pct) + "%";
        t.appendChild(a);
      });
    }
    draw();
    new MutationObserver(draw).observe(shelf, { childList: true, subtree: true });
  }
  // ---------- the clock window takes turns: TIME, then SYSTEM ----------
  // It holds on the clock in red, and steps aside for the trace after an agent. The command line
  // under the window stays put whatever the window shows.
  var panelEl = null, panelAt = 0, bornAt = Date.now(), panelLock = null, agentsToday = 0;
  function hm(m) { return m >= 60 ? Math.floor(m / 60) + "h" + ("0" + m % 60).slice(-2) + "m" : m + "m"; }
  var sysCache = null, sysAt = 0;
  function sysInfo() {
    if (sysCache && Date.now() - sysAt < 30000) return sysCache;   // asking the TV is a trip across to the app: twice a minute at most
    var j = {};
    try { j = JSON.parse(window.TVOS && window.TVOS.system ? window.TVOS.system() : "{}") || {}; } catch (e) {}
    if (!j.panel && /[?&]mock\b/.test(location.search)) {
      j = { panel: "3840x2160", hz: 60, ui: "1920x1080", model: "Sony BRAVIA", android: "12", memTotal: 3072, memFree: 1210, cores: 4, uptime: 197 };
    }
    sysCache = j; sysAt = Date.now();
    return j;
  }
  function panelHTML(which) {
    var esc = function (t) { return String(t).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); };
    var row = function (k, v) { return "  " + k + " " + new Array(Math.max(2, 10 - k.length)).join(".") + " " + v; };
    if (which === "sys") {
      var j = sysInfo(), up = Math.round((Date.now() - bornAt) / 60000), apps = 0;
      try { var lg = JSON.parse(localStorage.getItem("crypt.log") || "{}"); if (lg.day === new Date().toDateString()) apps = Object.keys(lg.apps || {}).length; } catch (x) {}
      var weatherMode = wx.storm ? "STORM" : wx.density > 1 ? "RAIN" : wx.density < 1 ? "CLEAR" : "CLOUD";
      var left = [
        row("MODEL", esc(String(j.model || "ANDROID TV").toUpperCase())),
        row("PANEL", j.panel ? j.panel + (j.hz ? " @" + j.hz + "HZ" : "") : "?"),
        row("UI", j.ui || Math.round(screen.width * (devicePixelRatio || 1)) + "x" + Math.round(screen.height * (devicePixelRatio || 1))),
        row("ANDROID", j.android || "?"),
        row("CPU", (j.cores || navigator.hardwareConcurrency || "?") + " CORES"),
        row("MEMORY", j.memTotal ? (j.memFree / 1024).toFixed(1) + "/" + (j.memTotal / 1024).toFixed(1) + " GB" : "?")
      ];
      var right = [
        row("TV UP", j.uptime != null ? hm(j.uptime) : "?"),
        row("HOME UP", hm(up)),
        row("LINK", logMe + " OK"),
        row("LIGHTS", gv.ips.length ? gv.ips.length + " GOVEE LINKED" : "NONE ON LAN"),
        row("WEATHER", weatherMode + " MODE"),
        row("TODAY", apps + " APPS / " + agentsToday + " AGENTS")
      ];
      return '<div class="phead">&gt; SYSTEM ' + (redPill ? '<i class="pbad">INTEGRITY ' + (40 + ((Math.random() * 30) | 0)) + "%</i>" : "INTEGRITY 100%") +
        '</div><div class="pcols"><pre class="psys">' + left.join("\n") + '</pre><pre class="psys">' + right.join("\n") + "</pre></div>";
    }
    if (which === "ship") {
      var due = alarmDueAt ? Math.max(0, alarmDueAt - Date.now()) : alarmGap, near = alarmGap ? Math.round((1 - due / alarmGap) * 14) : 0;
      var emp = Math.min(100, Math.round(empCharge + (Date.now() - empAt) / 1800));
      var people = ((window.COUCH_CONFIG || {}).people || []).length || 2;
      var rows = [row("VESSEL", "NEB-III HOVERCRAFT"), row("DEPTH", "BROADCAST " + (0.8 + (bornAt % 7) / 10).toFixed(1) + " KM"),
        row("HOVER PADS", "NOMINAL"), row("EMP", emp >= 100 ? "CHARGED 100%" : "CHARGING " + emp + "%"),
        row("CREW", people + " ABOARD"),
        row("SENTINELS", (near >= 10 ? '<i class="pbad">' : "") + near + " IN RANGE" + (near >= 10 ? " !!</i>" : ""))];
      return '<div class="phead">&gt; SHIP STATUS // OPERATOR ONLINE</div><pre class="psys">' + rows.join("\n") + "</pre>";
    }
    if (which === "feed") {
      var lines = [];
      for (var f = 0; f < 6; f++) { var ln = ""; for (var g = 0; g < 26; g++) ln += pick(); lines.push(ln); }
      return '<div class="phead">&gt; RAW FEED // MATRIX</div><pre class="psys pfeed">' + lines.join("\n") + "</pre>";
    }
    return "";
  }
  var feedIv = null;
  function panelSet(which) {
    root.classList.toggle("crypt-p1", which !== "time");
    if (which !== "time" && which !== "keep") panelEl.innerHTML = panelHTML(which);
    clearInterval(feedIv);
    if (which === "feed") feedIv = setInterval(function () { if (!panelLock && !gone()) panelEl.innerHTML = panelHTML("feed"); }, 350);
  }
  function panels(opt) {
    panelEl = el("div", "crypt-panel");
    document.body.appendChild(panelEl);
    var only = (location.search.match(/[?&]panels=([a-z]+)/) || [])[1];
    var turn = ["time", "sys"];
    if (only === "sys") turn = ["sys"];
    if (turn.length === 1) { panelSet(turn[0]); return; }
    setInterval(function () {
      if (panelLock || gone()) return;                         // the trace has the window; or nobody is looking
      if (redPill) { panelAt = 0; panelSet("time"); return; }  // red: the clock stays
      panelAt++;
      var t = opMode ? ["time", "ship", "feed"] : turn;          // the operator: the ship and the raw feed
      panelSet(t[panelAt % t.length]);
    }, /[?&]panels=fast/.test(location.search) ? 3000 : 20000);
  }
  // after an agent: the window drops the clock and runs a trace for the nearest hardline
  function phoneTrace() {
    if (broken || swallow || panelLock === "trace" || root.classList.contains("saver")) return;
    if (!panelEl) { panelEl = el("div", "crypt-panel"); document.body.appendChild(panelEl); }
    var n = "555-01" + (10 + ((Math.random() * 89) | 0));
    var lines = ["&gt; TRACE hardline --nearest", "  SCANNING EXCHANGES ......... OK", "  CARRIER FOUND ...... SECTOR " + (1 + ((Math.random() * 9) | 0)) + String.fromCharCode(65 + ((Math.random() * 8) | 0)),
      "  HARDLINE ..... " + n + " ... 0." + (2 + ((Math.random() * 7) | 0)) + " KM", "  ROUTE ...... 2 BLOCKS N, 1 BLOCK E", "  <i class=\"pbad\">!! AGENT ON ROUTE ... REROUTING</i>",
      "  PHONE RINGING ... ANSWER IT"];
    panelLock = "trace";
    root.classList.add("crypt-p1");
    panelEl.innerHTML = '<pre class="psys ptrace"></pre>';
    command("trace hardline --nearest", true);
    cmdHold = Date.now() + 16000;
    var box = panelEl.firstChild;
    lines.forEach(function (l, i) {
      setTimeout(function () { if (panelLock === "trace") { box.innerHTML += (i ? "\n" : "") + l; click(); } }, 600 + i * 1300);
    });
    setTimeout(function () {
      if (panelLock !== "trace") return;
      panelLock = null;
      panelSet(redPill ? "time" : "time");
      command("hardline connected ... exit secure", true);
    }, 600 + lines.length * 1300 + 4000);
  }

  // ---------- the screensaver, now (the Screensaver quick button) ----------
  // The same page the TV shows when idle, over the home; any button closes it.
  var saverEl = null, saverAt = 0;
  // a line from the film after each fight (the scenes in fight.js's order), on the command line
  // when the screensaver is woken during or after one, or a console program ends
  var FIGHT_QUOTES = ["no, lieutenant. your men are already dead.", "stop trying to hit me and hit me.", "nobody makes the first jump.",
    "dodge this.", "my name ... is neo.", "no.  ...  he is the one."];
  function fightQuote(since) {
    try {
      var l = JSON.parse(localStorage.getItem("crypt.fight.last") || "null");
      if (l && l.at >= since && FIGHT_QUOTES[l.i]) { localStorage.removeItem("crypt.fight.last"); return FIGHT_QUOTES[l.i]; }
    } catch (x) {}
    return "";
  }
  function saverNow() {
    if (saverEl) return;
    saverAt = Date.now();
    saverEl = el("iframe", "crypt-saverframe");
    saverEl.setAttribute("tabindex", "-1");
    saverEl.src = "saver.html" + location.search;
    document.body.appendChild(saverEl);
    humOn(false);
  }
  addEventListener("keydown", function (e) {
    if (!saverEl) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var f = saverEl; saverEl = null;
    f.classList.add("off");   // the old tube going off: down to a line, then a dot
    var q = fightQuote(saverAt);
    setTimeout(function () { f.remove(); crtOn(); if (q) { command(q, true); cmdHold = Date.now() + 7000; } }, 420);
    if (root.classList.contains("crypt-sound")) humOn(true);
    gBright(100); gColour(tint === GREEN ? base() : tint, true);
    armIdle(); run();
  }, true);

  // the agents' and the sentinels' clocks only run while the home is on screen: off (standby, an
  // app) they stop, and anything half-way through is called off; back on screen they start afresh
  function eventsPause() {
    clearTimeout(agentTimer); clearTimeout(alarmTimer); clearTimeout(momentTimer);
    if (alarmStop) alarmStop();
    if (hrun) { runEnd(); panelLock = null; if (panelEl) panelSet("time"); }
    var ag = document.querySelector(".crypt-agent"); if (ag) ag.remove();
    if (panelLock === "trace") { panelLock = null; if (panelEl) panelSet("time"); }
  }
  function eventsResume() {
    if (root.classList.contains("saver")) return;
    agents(); alarms(); moments();
  }

  // ---------- the hardline run: after an agent, the operator calls the way to the phone ----------
  // Each call is an arrow to press before the time bar runs out (a wrong turn costs a second); the
  // last is the phone itself: OK to answer. Run out of time and the agent has you: the construct
  // reloads (black, SIGNAL LOST, the BIOS start-up). Green: 5 calls of 3 s; red: 7 calls of 2.2 s.
  // Only when someone is there (a button pressed in the last minute); otherwise just the trace.
  var hrun = null, lastKeyAt = 0, runAfter = null;
  // after a run, the result shows for a few seconds and then the clock returns, unless a new run
  // has started by then (that used to wipe the new run's panel while it carried on unseen)
  function afterRun(ms, fn) {
    clearTimeout(runAfter);
    runAfter = setTimeout(function () { runAfter = null; if (momentKey === again) momentKey = null; if (!hrun) fn(); }, ms);
  }
  // training: OK on the result screen goes again straight away (other buttons work as normal)
  function again(k) {
    if (/^(Escape|GoBack|Backspace|BrowserBack)$/.test(k)) {   // BACK on the result: put the clock back now
      momentKey = null; clearTimeout(runAfter); runAfter = null; panelLock = null; panelSet("time");
      return true;
    }
    if (k !== "Enter" && k !== " ") return false;
    momentKey = null; lastKeyAt = Date.now();
    setTimeout(function () { hardlineRun(true); }, 250);
    return true;
  }
  function againKey() { if (!momentKey) momentKey = again; }
  var CALLS = { ArrowLeft: ["← LEFT", "left, down the hall", "left, past the lifts", "left at the stairwell"],
    ArrowRight: ["→ RIGHT", "right, through the door", "right, into the kitchen", "right, along the corridor"],
    ArrowUp: ["↑ UP", "up the stairs", "up to the roof", "up the fire escape"],
    ArrowDown: ["↓ DOWN", "down the fire escape", "down into the subway", "down the service stairs"] };
  function hardlineRun(training) {
    if (hrun || broken || swallow || gone() || root.classList.contains("saver")) return;
    clearTimeout(runAfter); runAfter = null;
    if (momentKey === again) momentKey = null;
    if (!panelEl) { panelEl = el("div", "crypt-panel"); document.body.appendChild(panelEl); }
    var keys = Object.keys(CALLS), seq = [], n = redPill ? 7 : 5, last = "";
    for (var i = 0; i < n; i++) { var k; do { k = keys[(Math.random() * 4) | 0]; } while (k === last); seq.push(k); last = k; }
    seq.push("Enter");   // the phone
    hrun = { seq: seq, at: 0, per: redPill ? 2200 : 3000, left: 0, dist: 0.6 + Math.random() * 0.3, iv: null, training: !!training, t0: Date.now() };
    panelLock = "hrun";
    root.classList.add("crypt-p1", "crypt-running");
    panelEl.innerHTML = '<div class="prun"><div class="phead">&gt; OPERATOR // HARDLINE ' + (training ? "TRAINING" : "RUN") + '</div><div class="pcall"></div>' +
      '<div class="pbar"><i></i></div><div class="pinfo"></div></div>';
    runStep();
    hrun.iv = setInterval(function () {
      if (!hrun) return;
      hrun.left -= 100;
      var bar = panelEl.querySelector(".pbar i");
      if (bar) bar.style.width = Math.max(0, hrun.left / hrun.per * 100) + "%";
      if (hrun.left <= 0) runFail();
    }, 100);
  }
  function runStep() {
    var k = hrun.seq[hrun.at], last = hrun.at === hrun.seq.length - 1;
    hrun.left = last ? 3000 : hrun.per;
    var c = CALLS[k];
    panelEl.querySelector(".pcall").textContent = last ? "☎ ANSWER IT" : c[0];
    panelEl.querySelector(".pcall").classList.toggle("phone", last);
    panelEl.querySelector(".pinfo").textContent = (last ? "PHONE RINGING ... PRESS OK" : "CALL " + (hrun.at + 1) + "/" + (hrun.seq.length - 1)) +
      "   AGENT " + Math.max(0.05, hrun.dist - hrun.at * 0.08).toFixed(2) + " KM";
    command("operator: " + (last ? "the phone, answer it!" : c[1 + ((Math.random() * 3) | 0)]), true);
    cmdHold = Date.now() + 60000;
  }
  function runKey(k) {
    if (!hrun) return;
    if (k === " ") k = "Enter";
    if (/^(Escape|GoBack|Backspace|BrowserBack)$/.test(k)) {   // BACK: training stops there; a real run ignores it
      if (!hrun.training) return;
      runEnd();
      if (panelEl) panelEl.innerHTML = '<pre class="psys ptrace">&gt; TRAINING ABORTED\n  operator: come back when you\'re ready.</pre>';
      gColour(base(), true); gBright(100);
      afterRun(2200, function () { panelLock = null; panelSet("time"); });
      return;
    }
    var want = hrun.seq[hrun.at];
    if (k === want) {
      click();
      var call = panelEl.querySelector(".pcall");
      call.classList.remove("ok"); void call.offsetWidth; call.classList.add("ok");
      gColour(base(), true); gBright(100);
      hrun.at++;
      if (hrun.at >= hrun.seq.length) return runWin();
      return runStep();
    }
    if (/^Arrow|^Enter$/.test(k)) {   // a wrong turn: it costs a second
      hrun.left -= 1000;
      noise(0.08);
      var cl = panelEl.querySelector(".pcall");
      cl.classList.remove("bad"); void cl.offsetWidth; cl.classList.add("bad");
    }
  }
  function runEnd() {
    clearInterval(hrun.iv);
    hrun = null;
    root.classList.remove("crypt-running");
  }
  function runWin() {
    if (hrun.training) {   // training: the time, and the record
      var secs = (Date.now() - hrun.t0) / 1000, best = 0;
      try { best = +localStorage.getItem("crypt.hlbest") || 0; } catch (x) {}
      var rec = !best || secs < best;
      if (rec) { try { localStorage.setItem("crypt.hlbest", secs.toFixed(1)); } catch (x) {} }
      runEnd();
      panelEl.innerHTML = '<pre class="psys ptrace">&gt; TRAINING COMPLETE\n  TIME ....... ' + secs.toFixed(1) + "s\n  RECORD ..... " +
        (rec ? secs.toFixed(1) + "s  NEW RECORD" : best.toFixed(1) + "s") + "\n\n  OK TO GO AGAIN</pre>";
      againKey();
      command(rec ? "new record: " + secs.toFixed(1) + "s" : "record: " + best.toFixed(1) + "s", true);
      cmdHold = Date.now() + 6000;
      afterRun(6000, function () { panelLock = null; panelSet("time"); });
      return;
    }
    runEnd();
    panelEl.innerHTML = '<pre class="psys ptrace">&gt; CONNECTED ... CARRIER OK\n&gt; EXIT SECURE\n\n  operator: you\'re out.</pre>';
    command("hardline connected ... exit secure", true);
    cmdHold = Date.now() + 5000;
    [0, 300, 600].forEach(function (t, i) { setTimeout(function () { gColour(i % 2 ? [255, 255, 255] : base(), true); }, t); });
    afterRun(5000, function () { gColour(base(), true); panelLock = null; panelSet("time"); });
  }
  function runFail() {
    if (hrun.training) {   // training: no agent, no reload
      runEnd();
      panelEl.innerHTML = '<pre class="psys ptrace"><i class="pbad">&gt; TRAINING FAILED</i>\n  operator: again. faster.\n\n  OK TO GO AGAIN</pre>';
      againKey();
      noise(0.2);
      afterRun(4000, function () { panelLock = null; panelSet("time"); });
      return;
    }
    runEnd();
    swallow = true;
    var a = el("div", "crypt-agent", "!! AGENT CONTACT !!<small>YOU'VE BEEN FOUND</small>");
    document.body.appendChild(a);
    frozenUntil = Date.now() + 1600;
    root.classList.add("crypt-glitch");
    gColour([255, 255, 255], true);
    setTimeout(function () { gColour(RED, true); }, 200);
    setTimeout(function () {
      a.remove(); root.classList.remove("crypt-glitch");
      flashEl.classList.remove("on"); void flashEl.offsetWidth; flashEl.classList.add("on");
      gBright(1);
      takeover(["> SIGNAL LOST", "> RELOADING CONSTRUCT ..."], function () {
        takeOff();
        panelLock = null; panelSet("time");
        swallow = false;
        biosBoot();
        gColour(base(), true); gBright(100);
        if (cmdEl) {   // the reload wipes the command line too; a fresh line once the start-up clears
          clearTimeout(cmdTimer); cmdEl.textContent = ""; cmdEl.style.fontSize = ""; cmdHold = 0;
          setTimeout(function () { command("construct reloaded ... you got lucky.", true); cmdHold = Date.now() + 5000; },
            Math.max(600, bootUntil - Date.now() + 500));
        }
      }, { stack: true, wait: 1600, hold: 1400 });
    }, 1800);
  }

  // ---------- red (the first time): the construct starts to fail ----------
  // A STDERR pane on the left pours out faults, things on the home glitch by themselves, and the
  // clock stays put. Ten seconds in, the first agent.
  var bugEl = null, bugIv = null, bugGlitch = null;
  var FAULTS = ["E0x{h} PAGE FAULT IN construct.dll", "WARN  frame {n} dropped ... resync", "E0x{h} null ref: reality.sys:{n}",
    "!! TRACE PROGRAM RUNNING", "WARN  checksum {h} != {h}", "E0x{h} heap corrupt at 0x{h}{h}", "!! SIGNAL INTRUSION SECTOR {n}",
    "WARN  deja vu detected (cat, x2)", "E0x{h} unhandled exception", "!! CARRIER UNSTABLE ... {n}%", "WARN  sentinel ping {n}ms"];
  function fault() { return FAULTS[(Math.random() * FAULTS.length) | 0].replace(/\{h\}/g, function () { return hex(4); }).replace(/\{n\}/g, function () { return (Math.random() * 99) | 0; }); }
  function bugsOn() {
    if (bugEl || root.classList.contains("saver")) return;
    bugEl = el("div", "crypt-stderr", "<b>STDERR // CONSTRUCT</b>");
    document.body.appendChild(bugEl);
    for (var i = 0; i < 12; i++) bugEl.appendChild(el("div", "")).textContent = fault();
    bugIv = setInterval(function () {
      if (gone()) return;
      if (bugEl.children.length > 16) bugEl.removeChild(bugEl.children[1]);
      bugEl.appendChild(el("div", "new")).textContent = fault();
    }, 420);
    bugGlitch = setInterval(function () {
      if (gone() || broken) return;
      var all = document.querySelectorAll(".app, .ncard, .time, .date, .qbtn");
      var n = all[(Math.random() * all.length) | 0];
      if (!n) return;
      n.classList.add("crypt-bug");
      setTimeout(function () { n.classList.remove("crypt-bug"); }, 380);
      if (Math.random() > 0.7) { root.classList.add("crypt-glitch"); setTimeout(function () { root.classList.remove("crypt-glitch"); }, 220); }
    }, 1800);
    if (panelEl && !panelLock) panelSet("time");
  }
  function bugsOff() {
    if (!bugEl) return;
    clearInterval(bugIv); clearInterval(bugGlitch);
    bugEl.remove(); bugEl = null;
  }

  // ---------- Govee lights on the Wi-Fi (home.govee): the room follows the home exactly ----------
  // Govee's LAN API through the TV app (Govee.kt): "LAN Control" on for each light in the Govee app.
  // On the home: the chosen app's exact colour, a pulse with the boot line, a slow green breath when
  // idle, a white flash with lightning. Opening an app hands the lights back to their own screen
  // sync. Govee has no official command for that, so this sends the light's own "video mode" packet
  // the way the Govee app does; on a light that ignores it, sync has to be switched on in the app.
  var gv = { ips: [], last: "", at: 0, breath: null, pending: null };
  function gOn() { return gv.ips.length > 0 && window.TVGOVEE; }
  function gSend(cmd, data) {
    if (!gOn()) return;
    var j = JSON.stringify({ msg: { cmd: cmd, data: data } });
    gv.ips.forEach(function (ip) { try { window.TVGOVEE.send(ip, j); } catch (e) {} });
  }
  function gColour(c, force) {
    if (!gOn() || gone()) return;
    var k = c.join(",");
    if (k === gv.last && !force) return;
    clearTimeout(gv.pending);
    var wait = Math.max(0, 160 - (Date.now() - gv.at));   // at most about six changes a second
    gv.pending = setTimeout(function () {
      gv.last = k; gv.at = Date.now();
      gSend("colorwc", { color: { r: c[0], g: c[1], b: c[2] }, colorTemInKelvin: 0 });
    }, wait);
  }
  function gBright(v) { gSend("brightness", { value: v }); }
  function gPulse() {
    if (!gOn()) return;
    gColour(base(), true);
    [[0, 100], [220, 35], [450, 100], [700, 70]].forEach(function (s) { setTimeout(function () { gBright(s[1]); }, s[0]); });
  }
  function gBreathe(on) {
    clearInterval(gv.breath);
    gv.breath = null;
    if (!gOn()) return;
    if (!on) { gBright(70); return; }
    gColour(base(), true);
    var up = false;
    gv.breath = setInterval(function () { up = !up; gBright(up ? 60 : 20); }, 2600);
  }
  // the light's own "video mode" (screen sync): a 20 byte packet, 0x33 0x05 0x00 ... and an XOR check byte
  function gSync() {
    if (!gOn()) return;
    clearInterval(gv.breath); gv.breath = null;
    var b = [0x33, 0x05, 0x00, 0x00];
    while (b.length < 19) b.push(0);
    b.push(b.reduce(function (x, y) { return x ^ y; }, 0));
    gBright(100);
    gSend("ptReal", { command: [btoa(String.fromCharCode.apply(null, b))] });
    gv.last = "";
  }
  function gFlash() {
    if (!gOn()) return;
    gColour([235, 245, 255], true);
    setTimeout(function () { gColour(tint === GREEN ? base() : tint, true); }, 300);
  }
  function goveeStart() {
    if (!window.TVGOVEE) return;
    try { window.TVGOVEE.scan(); } catch (e) { return; }
    var tries = 0;
    (function wait() {
      var busy = true;
      try { busy = window.TVGOVEE.scanning(); } catch (e) {}
      if (busy && tries++ < 20) { setTimeout(wait, 400); return; }
      try { gv.ips = JSON.parse(window.TVGOVEE.devices()).map(function (d) { return d.ip; }); } catch (e) { gv.ips = []; }
      console.log("crypt: govee lights found: " + gv.ips.join(", "));
      logPush(gv.ips.length ? "GOVEE ... " + gv.ips.length + " LIGHTS LINKED" : "GOVEE ... NO LIGHTS ON LAN");
      if (gOn() && !gone()) { gPulse(); setTimeout(function () { gColour(tint === GREEN ? base() : tint, true); }, 900); }
    })();
  }

  // ---------- (preview) sound: a soft key click as you move, a faint CRT hum on the home ----------
  var au = null, hum = null;
  function audio() {
    if (au) return au;
    try { au = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { au = null; }
    return au;
  }
  function click() {
    if (!root.classList.contains("crypt-sound")) return;
    var a = audio();
    if (!a) return;
    var n = Math.floor(a.sampleRate * 0.03), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
    var src = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = 2400; g.gain.value = 0.25;
    src.buffer = buf; src.connect(f); f.connect(g); g.connect(a.destination); src.start();
  }
  function humOn(on) {
    var a = audio();
    if (!a) return;
    if (on && !hum) {
      var o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain();
      o.frequency.value = 50; o2.frequency.value = 100; g.gain.value = 0.012;
      o.connect(g); o2.connect(g); g.connect(a.destination); o.start(); o2.start();
      hum = [o, o2];
    } else if (!on && hum) { hum.forEach(function (o) { o.stop(); }); hum = null; }
  }

  function startSlick() {
    try { redPill = localStorage.getItem("crypt.redpill") === "1"; } catch (x) {}
    root.classList.toggle("crypt-red", redPill);
    if (!root.classList.contains("saver") && window.TVOS && window.TVOS.ground) { try { window.TVOS.ground("#000000"); } catch (e) {} }   // black behind the page
    if (redPill) setEdge(GREEN, false);   // the edges come back red too
    if (!root.classList.contains("saver")) { agents(); alarms(); moments(); }   // agents and sentinels: any time, green or red
    if (redPill && !root.classList.contains("saver")) setTimeout(bugsOn, 50);
    if (!root.classList.contains("saver")) document.body.appendChild(el("div", "crypt-trace"));   // the faint line round the edge
    flashEl = el("div", "crypt-flash");
    document.body.appendChild(flashEl);
    if (!root.classList.contains("saver")) {
      cmdEl = el("div", "crypt-cmd");
      document.body.appendChild(cmdEl);
      cmdEl.textContent = "";
      document.addEventListener("keydown", secret, true);
    }
    watchClock();
    var opt = (window.COUCH_CONFIG || {}).home || {};
    if (opt.govee && !root.classList.contains("saver")) setTimeout(goveeStart, 1500);
    if (opt.crypt_sound || /[?&]sound=1/.test(location.search)) root.classList.add("crypt-sound");
    if ((opt.crypt_sound || /[?&]sound=1/.test(location.search)) && !root.classList.contains("saver")) {
      humOn(true);
      document.addEventListener("visibilitychange", function () { humOn(!document.hidden); });
    }
    if (opt.crypt_ascii || /[?&]ascii=1/.test(location.search)) { root.classList.add("crypt-ascii"); asciiBars(); }
    if ((opt.crypt_panels || /[?&]panels=/.test(location.search)) && !root.classList.contains("saver")) panels(opt);
    bootEl = el("div", "crypt-boot");
    document.body.appendChild(bootEl);
    if (!root.classList.contains("saver")) {
      document.addEventListener("keydown", function (e) {
        if (root.classList.contains("crypt-idle")) {
          root.classList.remove("crypt-idle");
          gBreathe(false); setEdge(tint, false); gColour(tint === GREEN ? base() : tint, true);   // awake: the app's colour again
          e.preventDefault(); e.stopImmediatePropagation();
        }
        armIdle();
      }, true);
      // an app in front, then the home back: from the page's own visibility (a browser) or from the
      // launcher (a TV, through app.js), whichever comes; each happens once per trip
      var awayAt = 0;
      var goneAway = function () {
        if (away) return;
        away = true; awayAt = Date.now();
        eventsPause();
        // a moment later (the app is in front by then) the home goes black behind it, so coming back
        // starts from black and runs straight into the boot lines, never a flash of the old home
        setTimeout(function () { if (away && bootEl) { bootEl.innerHTML = ""; bootEl.classList.add("on"); } }, 1200);
        humOn(false);
        gSync();   // an app is on: the lights follow the screen again
      };
      var lastBack = 0, standbyBack = false;
      var cameBack = function () {
        if (!away && !session) return;
        // the launcher and the page can both say "back" (couch-resume, visibilitychange): once is enough
        if (!away && Date.now() - lastBack < 10000) return;
        away = false; lastBack = Date.now();
        if (root.classList.contains("crypt-sound")) humOn(true);
        // away for 20 minutes or more (the TV was off, or asleep): the full power-on; otherwise the short one
        root.classList.remove("crypt-idle"); gBreathe(false);
        var long = awayAt && Date.now() - awayAt > 20 * 60000, report = session && Date.now() - session.at >= 5000;
        if (Date.now() < bootUntil) { /* a start-up is already running (the TV just came on) */ }
        else if (long) biosBoot(); else boot();
        // the command line starts clean: no left-over line from before; then a fresh one after the boot
        // (back() writes the session line when there is one)
        if (cmdEl) {
          clearTimeout(cmdTimer); cmdEl.textContent = ""; cmdEl.style.fontSize = ""; cmdHold = 0;
          var fq = fightQuote(awayAt || 0);   // the screensaver was showing a fight: its line first
          if (!report || fq) {
            var fresh = fq || (long || standbyBack ? "power restored ... welcome back, " + who().toLowerCase() : "ready.");
            setTimeout(function () { command(fresh, true); cmdHold = Date.now() + 5000; }, Math.max(600, bootUntil - Date.now() + 500));
          }
        }
        standbyBack = false;
        armIdle(); back(); redFromSaver(); run(); eventsResume();
        setTimeout(function () { gColour(tint === GREEN ? base() : tint, true); }, 900);
      };
      document.addEventListener("visibilitychange", function () { if (document.hidden) goneAway(); else cameBack(); });
      document.addEventListener("couch-pause", goneAway);
      // the TV switched on (the launcher hears the screen come on): the full 90s start-up, every time
      document.addEventListener("couch-screen-on", function () {
        if (!swallow && Date.now() - biosAt >= 9000) biosBoot();
        standbyBack = true;
        // back from standby: everything wakes (the rain, the idle fade), and the agents' and sentinels'
        // clocks start now, not in the dark
        if (away) cameBack();
        else {
          eventsResume(); run(); standbyBack = false;
          if (cmdEl) {
            clearTimeout(cmdTimer); cmdEl.textContent = ""; cmdHold = 0;
            setTimeout(function () { command("power restored ... welcome back, " + who().toLowerCase(), true); cmdHold = Date.now() + 5000; },
              Math.max(600, bootUntil - Date.now() + 500));
          }
        }
      });
      document.addEventListener("couch-screen-off", function () { goneAway(); });   // standby: as good as away
      document.addEventListener("keydown", extrasKey, true);
      document.addEventListener("couch-who", whoChanged);
      document.addEventListener("couch-who-again", function () { if (opMode) consoleOpen(); });
      if (amOperator()) setOp(true);
      cats();
      document.addEventListener("couch-resume", cameBack);
      armIdle();
      biosBoot();   // the page starting is the TV coming on
      // previews: ?redpill=wake runs the takeover, ?redpill=choice shows the pills
      var rp = (location.search.match(/[?&]redpill=([a-z]+)/) || [])[1];
      if (rp === "wake") setTimeout(function () { setRed(false, true); wakeUp(); }, 2500);
      if (rp === "choice") setTimeout(function () { setRed(true, true); choice(); }, 2500);
      if (rp === "corrupt") setTimeout(function () { setRed(true, true); corrupt(); }, 2500);
      if (rp === "alarm") setTimeout(function () { setRed(true, true); proximity(); }, 2500);
      var mo = location.search.match(/[?&]moment=([a-z]+)/);
      if (mo) setTimeout(function () { moment(mo[1]); }, 6000);
      var rn = location.search.match(/[?&]run=(\d+)/);
      if (rn) setTimeout(function () { lastKeyAt = Date.now(); agentSeen(); }, +rn[1] * 1000);
    }
  }

  // ---------- little things: the deja vu cat, the spoon, who is watching ----------
  var CAT = [[" /\\_/\\ ", "( o.o )", " > ^ < ", " /   \\ "], [" /\\_/\\ ", "( o.o )", " > ^ < ", "  | |  "]];
  function catWalk(again) {
    if (gone() || swallow || broken) return;
    var c = el("pre", "crypt-cat"), f = 0;
    document.body.appendChild(c);
    var legs = setInterval(function () { f = 1 - f; c.textContent = CAT[f].join("\n"); }, 260);
    c.textContent = CAT[0].join("\n");
    // it walks along the top of the clock window, like a cat on a shelf
    var fr = document.querySelector(".crypt-frame .bar") || document.querySelector(".crypt-frame");
    var r = fr ? fr.getBoundingClientRect() : null;
    if (r && r.width > 50) {
      c.style.left = r.left + "px";
      c.style.top = (r.top - c.getBoundingClientRect().height) + "px";
      c.style.setProperty("--walk", Math.max(0, r.width - c.getBoundingClientRect().width) + "px");
    }
    if (again) {   // the second cat: the glitch, and the message as it walks in
      root.classList.add("crypt-glitch"); setTimeout(function () { root.classList.remove("crypt-glitch"); }, 200);
      command("deja vu ... a glitch in the matrix", true); logPush("!! DEJA VU: FELIS CATUS x2");
      cmdHold = Date.now() + 9000;   // it stays up while the cat walks
    }
    setTimeout(function () { c.classList.add("go"); }, 30);
    setTimeout(function () {
      clearInterval(legs); c.remove();
      if (!again) setTimeout(function () { catWalk(true); }, 2500);   // deja vu: the same cat, the same walk
    }, 9200);
  }
  function cats() {
    var m = location.search.match(/[?&]cat=(\d+)/);
    setTimeout(function () { catWalk(false); if (!m) cats(); }, m ? +m[1] * 1000 : 2700000 + Math.random() * 2700000);   // every 45 to 90 min
  }
  // little commands on the remote, quick presses (each within 1.5 s of the last):
  //   down x6 = the spoon · up x6 = the cat
  var keySeq = [], keyAt = 0;
  function extrasKey(e) {
    if (swallow) return;
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") { keySeq = []; return; }
    if (Date.now() - keyAt > 1500) keySeq = [];
    keyAt = Date.now();
    keySeq.push(e.key === "ArrowDown" ? "D" : e.key === "ArrowUp" ? "U" : "x");
    if (keySeq.length > 6) keySeq.shift();
    var k = keySeq.join("");
    if (k === "DDDDDD") { keySeq = []; spoon(); }
    else if (k === "UUUUUU") { keySeq = []; catWalk(false); }
  }
  function spoon() {
    if (panelEl && !panelLock) {   // the clock has to be showing for it to bend
      panelLock = "spoon"; panelSet("time");
      setTimeout(function () { if (panelLock === "spoon") panelLock = null; }, 5000);
    }
    root.classList.remove("crypt-spoon"); void root.offsetWidth; root.classList.add("crypt-spoon");
    command("there is no spoon", true);
    cmdHold = Date.now() + 5000;
    setTimeout(function () {
      root.classList.remove("crypt-spoon");
      root.classList.add("crypt-glitch");
      setTimeout(function () { root.classList.remove("crypt-glitch"); }, 220);
    }, 3200);
  }
  function whoChanged(e) {
    var d = e.detail || {};
    if (!d.name) return;
    setOp(d.name.toLowerCase() === "operator");
    if (d.first) setTimeout(transmission, 3500);   // a note the operator left, after the greeting
    var n = d.name.toLowerCase();
    command(d.first ? "welcome back, " + n : n === "operator" ? "operator online ... standing by" : "operator: " + n + " logged in", true);
    cmdHold = Date.now() + 4000;
  }

  // ---------- moments: small scenes from the story, now and then ----------
  var momentKey = null, momentOn = false;
  var MOMENTS = {
    vase: ["the vase", vase], bricks: ["they changed something", bricked], code: ["i can see the code", seeCode],
    phone: ["the phone rings", phoneRing], sentinels: ["sentinels overhead", sentinels], agentface: ["an agent speaks", agentFace],
    reddress: ["the red dress", redDress], rabbit: ["the white rabbit", whiteRabbit], cat: ["deja vu (the cat)", function () { catWalk(false); }]
  };
  function tryMoment(name, tries) {   // from the console: if something is still finishing, try again shortly
    if (!moment(name) && tries > 0) setTimeout(function () { tryMoment(name, tries - 1); }, 600);
  }
  function moment(name) {
    if (momentOn || broken || swallow || hrun || gone() || alarmOn) return false;
    var m = MOMENTS[name];
    if (!m) return false;
    m[1]();
    return true;
  }
  function frameBar() {
    var fr = document.querySelector(".crypt-frame .bar") || document.querySelector(".crypt-frame");
    return fr ? fr.getBoundingClientRect() : null;
  }
  // the mirror (straight after taking the red pill): the clock window ripples like glass, then
  // liquid chrome crawls out of the clock window and swallows the screen; white, black, and
  // then whatever comes next (the unplugging)
  function mirror(next) {
    momentOn = true;
    swallow = true;
    command("the mirror ... it's moving.", true);
    cmdHold = Date.now() + 12000;
    logPush("!! BODY SIGNAL UNSTABLE ... TRACE STARTED");
    root.classList.add("crypt-mirror");
    gColour([200, 215, 230], true);
    var f = document.querySelector(".time"), fb = f ? f.getBoundingClientRect() : null;   // the clock window is the mirror
    var ox = fb ? fb.left + fb.width / 2 : innerWidth / 2, oy = fb ? fb.top + fb.height / 2 : innerHeight * 0.75;
    var c = el("canvas", "crypt-chrome"), g = c.getContext("2d"), q = 0.5;   // half resolution: smooth on the TV
    c.width = Math.ceil(innerWidth * q); c.height = Math.ceil(innerHeight * q);
    document.body.appendChild(c);
    var far = Math.hypot(Math.max(ox, innerWidth - ox), Math.max(oy, innerHeight - oy)) * 1.15;
    var N = 90, ph = []; for (var i = 0; i < 6; i++) ph.push(Math.random() * 6.3);
    var t0 = performance.now() + 2200, grow = 8000, fin = false;
    setTimeout(function () { command("it's cold ... it's cold.", true); }, 5500);
    (function draw(now) {
      if (fin) return;
      var t = Math.max(0, now - t0), k = Math.min(1, t / grow), e = k * k;   // it creeps, then it takes everything
      g.setTransform(q, 0, 0, q, 0, 0);
      g.clearRect(0, 0, innerWidth, innerHeight);
      if (t > 0) {
        var R = far * e + 20, sec = now / 1000;
        g.beginPath();
        for (var j = 0; j <= N; j++) {   // a wobbling, dripping edge
          var a = j / N * Math.PI * 2;
          var w = 1 + 0.16 * Math.sin(a * 3 + ph[0] + sec * 1.3) + 0.1 * Math.sin(a * 7 + ph[1] - sec * 2.1) + 0.035 * Math.sin(a * 13 + ph[2] + sec * 3);
          var x = ox + Math.cos(a) * R * w, y = oy + Math.sin(a) * R * w * 1.1;
          j ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath();
        var lg = g.createLinearGradient(ox - R, oy - R, ox + R, oy + R);
        lg.addColorStop(0, "#5d6670"); lg.addColorStop(0.3, "#dfe6ee"); lg.addColorStop(0.5, "#8c96a1");
        lg.addColorStop(0.7, "#f4f8fc"); lg.addColorStop(1, "#4a525b");
        g.fillStyle = lg; g.fill();
        g.save(); g.clip();
        for (var b = 0; b < 5; b++) {   // light sliding over the surface
          var yy = oy - R + ((sec * 160 + b * R * 0.45 + ph[b] * 80) % (2 * R + 1));
          var hg = g.createLinearGradient(0, yy - 40, 0, yy + 40);
          hg.addColorStop(0, "rgba(255,255,255,0)"); hg.addColorStop(0.5, "rgba(255,255,255,0.55)"); hg.addColorStop(1, "rgba(255,255,255,0)");
          g.fillStyle = hg; g.fillRect(ox - R * 1.3, yy - 40, R * 2.6, 80);
        }
        for (var r2 = 0; r2 < 4; r2++) {   // ripples running out from where it started
          var rr = ((sec * 220 + r2 * 140) % Math.max(60, R));
          g.strokeStyle = "rgba(40,48,56," + (0.35 * (1 - rr / Math.max(60, R))) + ")"; g.lineWidth = 6;
          g.beginPath(); g.ellipse(ox, oy, rr, rr * 1.1, 0, 0, Math.PI * 2); g.stroke();
        }
        g.restore();
        g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 3; g.stroke();   // the bright wet rim
      }
      if (k < 1) requestAnimationFrame(draw);
      else {   // fully under: a white flash, black, then the home snaps back like an old tube
        fin = true;
        g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
        setTimeout(function () {
          g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
          root.classList.remove("crypt-mirror");
        }, 250);
        setTimeout(function () {
          momentOn = false;
          if (next) { next(); setTimeout(function () { c.remove(); }, 900); return; }
          c.remove(); crtOn(); swallow = false;
          gColour(base(), true); gBright(100);
        }, 1700);
      }
    })(performance.now());
  }
  // 1. the vase: on the clock window; a button knocks it off
  function vase() {
    momentOn = true;
    var v = el("pre", "crypt-vase", "  .--.\n (    )\n  )  (\n /    \\\n(______)"), r = frameBar();
    document.body.appendChild(v);
    // inside the clock window, to the right of the time, like an ornament on a shelf
    var vb = v.getBoundingClientRect();
    if (r) { v.style.left = (r.right - vb.width - r.width * 0.08) + "px"; v.style.top = (r.bottom + r.width * 0.05) + "px"; }
    command("don't worry about the vase.", true);
    cmdHold = Date.now() + 8000;
    var done = false;
    var end = function (smash) {
      if (done) return;
      done = true; momentKey = null;
      if (smash) {
        v.classList.add("fall");
        setTimeout(function () {
          var b = v.getBoundingClientRect();
          for (var i = 0; i < 14; i++) {
            var p = el("span", "crypt-chip", pick());
            p.style.left = (b.left + b.width / 2) + "px"; p.style.top = (b.bottom) + "px";
            p.style.setProperty("--dx", ((Math.random() - 0.5) * 18).toFixed(1) + "rem");
            p.style.setProperty("--dy", (4 + Math.random() * 8).toFixed(1) + "rem");
            document.body.appendChild(p);
            setTimeout(function (n) { return function () { n.remove(); }; }(p), 1400);
          }
          v.remove();
          logPush("VASE.OBJ ... DESTROYED");
          command("what vase?", true);
          cmdHold = Date.now() + 5000;
          momentOn = false;
        }, 650);
      } else { v.classList.add("gone"); setTimeout(function () { v.remove(); momentOn = false; }, 1200); }
    };
    momentKey = function () { end(true); return false; };   // the button still does its job
    setTimeout(function () { end(false); }, 14000);
  }
  // 2. they changed something: one tile bricked up for a while
  function bricked() {
    var tiles = Array.prototype.filter.call(document.querySelectorAll(".app"), function (n) { return !n.classList.contains("focus"); });
    var t = tiles[(Math.random() * tiles.length) | 0];
    if (!t) return;
    momentOn = true;
    root.classList.add("crypt-glitch");
    setTimeout(function () { root.classList.remove("crypt-glitch"); }, 220);
    t.classList.add("crypt-brick");   // pops forward like it was picked, bricked up
    logPush("!! CONSTRUCT EDITED ... " + slug(nameOf(t) || "door").toUpperCase());
    command("they changed something ...", true);
    cmdHold = Date.now() + 8000;
    setTimeout(function () {   // then a glitch and it slides back into the row as it was
      root.classList.add("crypt-glitch");
      setTimeout(function () { root.classList.remove("crypt-glitch"); t.classList.remove("crypt-brick"); }, 220);
      setTimeout(function () { momentOn = false; }, 800);
    }, 6000);
  }
  // 3. i can see the code: the screen floods with code and every word on the home turns to it
  function seeCode() {
    momentOn = true;
    command("i can see the code.", true);
    cmdHold = Date.now() + 7000;
    root.classList.add("crypt-codeview");
    burstUntil = Date.now() + 4200;
    var c = el("canvas", "crypt-flood"), g = c.getContext("2d"), dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    document.body.appendChild(c);
    var sz = Math.max(10, cell * 0.9) * dpr, cols = Math.ceil(c.width / sz), ys = [];
    for (var i = 0; i < cols; i++) ys.push(-Math.random() * c.height / sz);
    var texts = Array.prototype.filter.call(document.querySelectorAll(".time, .date .dline, .date .cwx, .shelf-head h2, .ncard .t, .crypt-cmd, .crypt-log div, .app .label, .qbtn span, .people-wrap button, .crypt-panel pre"),
      function (n) { return n !== cmdEl; });
    texts.forEach(function (n) { n.__orig = n.innerHTML; });
    var t0 = performance.now(), iv = setInterval(function () {
      texts.forEach(function (n) { var t = n.textContent || "", o = ""; for (var j = 0; j < t.length; j++) o += t.charAt(j) === " " ? " " : pick(); n.textContent = o; });
    }, 110);
    (function draw(now) {
      var t = now - t0;
      g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, 0, c.width, c.height);
      g.font = sz + "px " + getComputedStyle(root).getPropertyValue("--c-term");
      for (var k = 0; k < cols; k++) {
        ys[k] += 0.9;
        g.fillStyle = Math.random() > 0.92 ? "#eafff0" : "rgba(57,255,122,0.85)";
        g.fillText(pick(), k * sz, ys[k] * sz);
        if (ys[k] * sz > c.height && Math.random() > 0.9) ys[k] = 0;
      }
      if (t < 4000) requestAnimationFrame(draw);
      else {
        clearInterval(iv);
        texts.forEach(function (n) { if (n.__orig != null && n.isConnected) n.innerHTML = n.__orig; n.__orig = null; });
        c.classList.add("off");
        root.classList.remove("crypt-codeview");
        setTimeout(function () { c.remove(); momentOn = false; }, 700);
      }
    })(t0);
  }
  // 4. the phone rings: OK answers it; let it ring out and the line is traced
  function phoneRing() {
    momentOn = true;
    var r = el("div", "crypt-ring", "☎ RINGING ... OK TO ANSWER");
    document.body.appendChild(r);
    var k = 0, lt = setInterval(function () { gBright(++k % 2 ? 100 : 25); }, 700);
    var done = false, end = function (answered) {
      if (done) return;
      done = true; momentKey = null; clearInterval(lt); gBright(100); r.remove();
      if (answered) {
        logPush("HARDLINE ... CALL ANSWERED");
        showTransmission(MESSAGES[(Math.random() * MESSAGES.length) | 0]);
      } else logPush("MISSED CALL ... LINE TRACED");
      momentOn = false;
    };
    momentKey = function (key) { if (key === "Enter" || key === " ") { end(true); return true; } return false; };
    setTimeout(function () { end(false); }, 12000);
  }
  // 5. sentinels overhead: the ship goes dark and still while they search. Press anything and they
  // find you (the proximity warning); keep still and they pass
  function sentinels() {
    momentOn = true;
    root.classList.add("crypt-godark");
    frozenUntil = Date.now() + 15000;   // the rain holds its breath
    command("!! sentinels overhead ... go dark. don't move.", true);
    cmdHold = Date.now() + 16000;
    logPush("SENTINEL PATROL ... OVERHEAD ... SYSTEMS DARK");
    gColour(RED, true); gBright(6);
    var lights = el("div", "crypt-search", "<i></i><i></i>");
    document.body.appendChild(lights);
    var art = "       .-\"\"\"\"\"\"-.\n     .'  @    @  '.\n    (  @  .--.  @  )\n     '. @ '--' @ .'\n      /|/|/||\\|\\|\\\n     //|/ |||| \\|\\\\\n    // |  ||||  | \\\\\n   //  |  ||||  |  \\\\\n  '    '  ''''  '    '";
    var made = [];
    // [top rem, size rem, delay s]: they keep coming for the whole 15 seconds
    [[4, 2.6, 0.2], [20, 1.8, 1.6], [10, 3.2, 3.4], [24, 2.2, 5.2], [6, 2, 6.6]].forEach(function (a) {
      var sEl = el("pre", "crypt-sentinel", art.replace(/@/g, "<b>@</b>"));   // a dark shape; only the eyes burn
      sEl.style.top = a[0] + "rem"; sEl.style.fontSize = a[1] + "rem"; sEl.style.animationDelay = a[2] + "s";
      document.body.appendChild(sEl); made.push(sEl);
    });
    var done = false, end = function (caught) {
      if (done) return;
      done = true; momentKey = null;
      made.forEach(function (n) { n.remove(); }); lights.remove();
      root.classList.remove("crypt-godark"); frozenUntil = 0;
      momentOn = false;
      if (caught) {
        command("!! detected", true);
        logPush("!! SENTINEL LOCK ... HULL BREACH IMMINENT");
        setTimeout(function () { proximity(); }, 600);
      } else {
        command("sentinels passed ... all clear.", true);
        logPush("SENTINEL PATROL ... GONE ... ALL CLEAR");
        gColour(base(), true); gBright(100);
      }
    };
    momentKey = function () { end(true); return true; };   // any button: they hear it
    setTimeout(function () { end(false); }, 15000);
  }
  // 6. an agent speaks: a line on the command line, a trace in the log
  function agentFace() {
    momentOn = true;
    var lines = ["mr. " + who().toLowerCase() + " ...", "we've been expecting you.", "never send a human to do a machine's job.",
      "you hear that? the sound of inevitability.", "the system is our home now."];
    root.classList.add("crypt-glitch");
    setTimeout(function () { root.classList.remove("crypt-glitch"); }, 200);
    command("agent: " + lines[(Math.random() * lines.length) | 0], true);
    cmdHold = Date.now() + 8000;
    logPush("TRACE DETECTED ... LOST");
    setTimeout(function () { momentOn = false; }, 8000);
  }
  // 7. the red dress: the world goes grey and a figure in red walks by
  function redDress() {
    momentOn = true;
    root.classList.add("crypt-grey");
    var c = el("canvas", "crypt-dress");
    document.body.appendChild(c);
    // a strip along the bottom only, at screen resolution, no blur: cheap enough to start at once on the TV
    var hgt = innerHeight * 0.22, band = hgt * 1.15, g = c.getContext("2d");
    c.width = innerWidth; c.height = Math.round(band);
    c.style.cssText = "top:auto;bottom:0;height:" + Math.round(band) + "px";
    var t0 = performance.now(), dur = 9000, off = innerHeight - band;
    gColour(RED, true);
    command("were you looking at her?", true);
    cmdHold = Date.now() + 10000;
    (function step(now) {
      var t = (now - t0) / dur;
      g.setTransform(1, 0, 0, 1, 0, -off);
      g.clearRect(0, off, innerWidth, band);
      if (t < 1) {
        var x = -hgt + t * (innerWidth + 2 * hgt), y = innerHeight * 0.97, sw = Math.sin(t * 60) * 0.5;
        g.strokeStyle = "#ff2a3c"; g.fillStyle = "rgba(255,42,60,0.85)"; g.lineWidth = Math.max(2, hgt * 0.035); g.lineCap = "round";
        var hip = [x, y - hgt * 0.42], neck = [x, y - hgt * 0.78];
        g.beginPath();   // the dress: a triangle from the waist
        g.moveTo(x - hgt * 0.02, y - hgt * 0.62); g.lineTo(x - hgt * 0.16, y - hgt * 0.34); g.lineTo(x + hgt * 0.16, y - hgt * 0.34); g.closePath(); g.fill();
        g.beginPath();
        g.moveTo(neck[0], neck[1]); g.lineTo(x, y - hgt * 0.6);
        g.moveTo(x, y - hgt * 0.36); g.lineTo(x + sw * hgt * 0.22, y);   // legs
        g.moveTo(x, y - hgt * 0.36); g.lineTo(x - sw * hgt * 0.22, y);
        g.moveTo(neck[0], neck[1] + hgt * 0.04); g.lineTo(x - sw * hgt * 0.16, y - hgt * 0.5);   // arms
        g.moveTo(neck[0], neck[1] + hgt * 0.04); g.lineTo(x + sw * hgt * 0.16, y - hgt * 0.5);
        g.stroke();
        g.beginPath(); g.arc(x, y - hgt * 0.87, hgt * 0.08, 0, Math.PI * 2); g.stroke();
        void hip;
        requestAnimationFrame(step);
      } else {
        c.remove(); root.classList.remove("crypt-grey"); gColour(base(), true); momentOn = false;
      }
    })(t0);
  }
  // 8. the white rabbit: hops along the bottom of the home; OK while it is out, and you follow it
  function whiteRabbit() {
    momentOn = true;
    var r = el("pre", "crypt-rabbit", "(\\(\\\n( -.-)\no_(\")(\")");
    document.body.appendChild(r);
    // it hops along the top of the clock window, clear of the tiles
    var bar = frameBar(), rb = r.getBoundingClientRect(), x0 = bar ? bar.left - rb.width : -rb.width, x1 = bar ? bar.right : innerWidth;
    var y0 = bar ? bar.top - rb.height : 40, t0 = performance.now(), dur = 10000;
    (function hop(now) {
      if (!r.isConnected) return;
      var t = Math.min(1, (now - t0) / dur), x = x0 + (x1 - x0) * t, y = y0 - Math.abs(Math.sin(t * Math.PI * 12)) * rb.height * 0.45;
      r.style.transform = "translate(" + x + "px," + y + "px)";
      r.style.opacity = t < 0.05 ? t / 0.05 : t > 0.95 ? (1 - t) / 0.05 : 1;
      if (t < 1) requestAnimationFrame(hop);
    })(t0);
    logPush("WHITE RABBIT ... SIGHTED");
    // the message on the command line as it appears, like the other events; nothing to press
    command("follow the white rabbit.", true);
    cmdHold = Date.now() + 10000;
    gColour([255, 255, 255], true);
    setTimeout(function () { gColour(base(), true); }, 1500);
    setTimeout(function () { r.remove(); momentOn = false; }, 10500);
  }

  // now and then, one of the chosen ones (home.crypt_moments), while the home is on screen
  var momentTimer = null;
  function moments() {
    clearTimeout(momentTimer);
    var pool = (window.COUCH_CONFIG && window.COUCH_CONFIG.home && window.COUCH_CONFIG.home.crypt_moments) || [];
    if (!pool.length) return;
    momentTimer = setTimeout(function () { moment(pool[(Math.random() * pool.length) | 0]); moments(); }, 300000 + Math.random() * 300000);   // every 5 to 10 minutes on the home
  }

  // ---------- the operator ----------
  // The Operator profile turns the home into the operator's station (denser rain, the tiles pulled
  // back, the ship and the raw feed in the window) and opens the console: programs (the fight
  // scenes, on demand), events on cue, hardline training, and messages for the first person.
  // OK on the Operator button opens it again; Back closes it.
  var conEl = null, conAt = 0, conItems = [], conMode = "main", progEl = null, progNow = null;
  var PROGRAMS = [["FREEZE KICK", 0, "freeze"], ["COMBAT TRAINING", 1, "dojo"], ["THE JUMP", 2, "rooftop"], ["BULLET TIME", 3, "bullet"],
    ["THE CHALLENGE", 4, "beckon"], ["STOP", 5, "stop"]];   // in the order the film has them
  var MESSAGES = ["the phones are being traced. stay off the main lines.", "watch for deja vu. it means they changed something.",
    "the oracle will see you soon.", "an agent was seen near your sector. keep moving.", "i've got your exit. just say the word.",
    "nice moves today. you're getting faster."];
  function amOperator() {
    var cfg = window.COUCH_CONFIG || {}, ppl = cfg.people || [], id = "";
    try { id = localStorage.getItem("tvhome.who") || ""; } catch (x) {}
    for (var i = 0; i < ppl.length; i++) if ((ppl[i].id || "") === id) return String(ppl[i].name || "").toLowerCase() === "operator";
    return false;
  }
  function setOp(on) {
    if (on === opMode) return;
    opMode = on;
    root.classList.toggle("crypt-op", on);
    if (on) setTimeout(function () { consoleOpen(); }, 1200);
    else consoleClose();
  }
  function conLine(t, cls) { return '<div class="' + (cls || "") + '">' + t + "</div>"; }
  function consoleBuild() {
    var items = [];
    if (conMode === "main") {
      items.push(["h", "PROGRAMS"]);
      PROGRAMS.forEach(function (p, i) { items.push(["prog", "load " + p[2] + ".prg ... " + p[0], i]); });
      if (window.cryptFinal) {
        items.push(["h", "FINALE"]);
        items.push(["fin", "load final.prg ... THE LAST STAND", "play"]);
      }
      items.push(["h", "EVENTS"]);
      [["agent", "agent + hardline run"], ["alarm", "proximity warning"], ["red", "wake up"], ["pills", "the pill choice"], ["cat", "deja vu (the cat)"],
       ["spoon", "the spoon"], ["saver", "screensaver"]].forEach(function (e) { items.push(["ev", e[1], e[0]]); });
      Object.keys(MOMENTS).forEach(function (k) { if (k !== "cat") items.push(["mo", MOMENTS[k][0], k]); });   // the moments, with the events
      items.push(["h", "TRAINING"]);
      var best = 0; try { best = +localStorage.getItem("crypt.hlbest") || 0; } catch (x) {}
      items.push(["train", "hardline training" + (best ? "   record " + best.toFixed(1) + "s" : "")]);
      items.push(["h", "MESSAGES"]);
      items.push(["msgs", "leave a message for " + who().toLowerCase() + " ..."]);
    } else if (conMode === "help") {
      items.push(["h", "THE RED EVENTS"]);
      ["1. WAKE UP. the construct wakes up: the screen is taken over,",
       "   the glass shatters, everything turns red. system compromised.",
       "   in red the agents come every 1-2 minutes, not every 18.",
       "2. THE PILL CHOICE. Morpheus holds out both pills.",
       "   blue: back to the green.  red: the mirror takes you, then the",
       "   construct breaks apart (tearing, errors, flickering lights).",
       "   run the pill choice again and take blue to put it back together."].forEach(function (t) { items.push(["n", t]); });
      items.push(["h", "BY THEMSELVES"]);
      ["while the home is on, the moments come every 5-10 minutes; an agent",
       "and the proximity warning take turns every 9 minutes. they stop",
       "while an app or the screensaver is on. this console runs any of them now."].forEach(function (t) { items.push(["n", t]); });
      items.push(["back", "< back"]);
    } else {
      items.push(["h", "MESSAGE FOR " + who().toUpperCase()]);
      MESSAGES.forEach(function (m, i) { items.push(["msg", m, i]); });
      items.push(["back", "< back"]);
    }
    conItems = items;
    var sel = items.map(function (it, i) { return it[0] === "h" || it[0] === "n" ? -1 : i; }).filter(function (i) { return i >= 0; });
    if (sel.indexOf(conAt) < 0) conAt = sel[0];
    var body = items.map(function (it, i) {
      return it[0] === "h" ? conLine("// " + it[1], "ch") : it[0] === "n" ? conLine(it[1].replace(/ /g, "&nbsp;"), "cn") : conLine((i === conAt ? "&gt; " : "&nbsp; ") + it[1], i === conAt ? "cs" : "");
    }).join("");
    conEl.innerHTML = '<div class="cbar">OPERATOR CONSOLE // NEB-III</div><div class="cwrap"><div class="cbody">' + body +
      '</div><div class="ctrack"><div class="cthumb"></div></div></div><div class="cfoot">↑↓ choose &nbsp; OK run &nbsp; BACK close</div>';
    var cur = conEl.querySelector(".cs"), cb = conEl.querySelector(".cbody");
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" });
    if (cb.scrollTop < 40 && cur === cb.querySelector(".cs") && sel[0] === conAt) cb.scrollTop = 0;   // the top item: show the heading above it
    conBar(); cb.addEventListener("scroll", conBar);
  }
  function conBar() {   // the scroll bar: thumb size is how much shows, its place is how far down
    var cb = conEl && conEl.querySelector(".cbody"), tr = conEl && conEl.querySelector(".ctrack"), th = tr && tr.firstChild;
    if (!th) return;
    var all = cb.scrollHeight, see = cb.clientHeight, room = tr.clientHeight;
    tr.style.display = all > see + 2 ? "" : "none";
    var h = Math.max(room * 0.08, room * see / all);
    th.style.height = h + "px";
    th.style.top = ((room - h) * (cb.scrollTop / Math.max(1, all - see))) + "px";
  }
  function consoleOpen() {
    if (!opMode || broken || swallow || hrun || gone() || root.classList.contains("saver")) return;
    if (!conEl) { conEl = el("div", "crypt-console"); document.body.appendChild(conEl); }
    conMode = "main"; consoleBuild();
    conEl.classList.add("on");
    command("operator console online", true);
  }
  function consoleClose() { if (conEl) conEl.classList.remove("on"); }
  function consoleIsOpen() { return conEl && conEl.classList.contains("on"); }
  function consoleKey(k) {
    var sel = conItems.map(function (it, i) { return it[0] === "h" || it[0] === "n" ? -1 : i; }).filter(function (i) { return i >= 0; });
    var at = sel.indexOf(conAt);
    if (k === "ArrowDown") { conAt = sel[Math.min(sel.length - 1, at + 1)]; click(); return consoleBuild(); }
    if (k === "ArrowUp") { conAt = sel[Math.max(0, at - 1)]; click(); return consoleBuild(); }
    if (k === "Escape" || k === "Backspace" || k === "GoBack" || k === "BrowserBack") {
      if (conMode !== "main") { conMode = "main"; conAt = 0; return consoleBuild(); }
      return consoleClose();
    }
    if (k !== "Enter" && k !== " ") return;
    var it = conItems[conAt];
    if (it[0] === "msgs") { conMode = "msgs"; conAt = 0; return consoleBuild(); }
    if (it[0] === "help") { conMode = "help"; conAt = 0; return consoleBuild(); }
    if (it[0] === "back") { conMode = "main"; conAt = 0; return consoleBuild(); }
    if (it[0] === "msg") {
      try { localStorage.setItem("crypt.msg", MESSAGES[it[2]]); } catch (x) {}
      command("message queued for " + who().toLowerCase(), true);
      conMode = "main"; conAt = 0; return consoleBuild();
    }
    consoleClose();
    if (it[0] === "prog") return loadProgram(it[2]);
    if (it[0] === "fin") return loadFinal(it[2]);
    if (it[0] === "mo") return setTimeout(function () { tryMoment(it[2], 6); }, 500);
    if (it[0] === "train") { lastKeyAt = Date.now(); return setTimeout(function () { hardlineRun(true); }, 400); }
    var e = it[2];
    setTimeout(function () {
      if (e === "agent") { lastKeyAt = Date.now(); agentSeen(); }
      else if (e === "alarm") proximity();
      else if (e === "red") wakeUp();
      else if (e === "pills") { if (!redPill) setRed(true, true); choice(); }
      else if (e === "cat") catWalk(false);
      else if (e === "spoon") spoon();
      else if (e === "saver") saverNow();
    }, 400);
  }
  // a program: "loading ...", the scene full screen, then "i know kung fu."
  function loadProgram(i) {
    if (progEl || !window.cryptFight) return;
    var p = PROGRAMS[i];
    progScene = p[1];
    swallow = true;
    progEl = el("div", "crypt-program", '<div class="pl">&gt; LOADING ' + p[0] + " ...</div><canvas></canvas>");
    document.body.appendChild(progEl);
    command("load " + p[2] + ".prg", true);
    setTimeout(function () {
      progEl.classList.add("go");
      progNow = window.cryptFight.mount(progEl.querySelector("canvas"), { start: p[1], once: true,
        scenery: ((window.COUCH_CONFIG || {}).home || {}).crypt_scenery === true || /[?&]scenery=1/.test(location.search), onHit: function () { gColour([255, 255, 255], true); setTimeout(function () { gColour(base(), true); }, 150); },
        onDone: programEnd });
    }, 1600);
  }
  var progScene = -1;
  function programEnd() {
    var fin = progEl && progEl.classList.contains("crypt-finale");
    if (progNow) { progNow.stop(); progNow = null; }
    if (progEl) { progEl.remove(); progEl = null; }
    swallow = false; wakeHome(); run();   // the rain starts again
    if (fin) crtOn();   // the finale ends like a reload: the tube comes back on
    command(fin ? "end of line." : FIGHT_QUOTES[progScene] || "i know kung fu.", true);
    cmdHold = Date.now() + 7000;
  }
  // the finale (final.js): the last fight as a short film, from the console only, never by itself
  function loadFinal(mode) {
    if (progEl || !window.cryptFinal) return;
    swallow = true;
    progEl = el("div", "crypt-program crypt-finale", '<div class="pl">&gt; LOADING final.prg ...</div><canvas></canvas>');
    document.body.appendChild(progEl);
    command("load final.prg", true);
    setTimeout(function () {
      if (!progEl) return;
      progEl.classList.add("go");
      progNow = window.cryptFinal.mount(progEl.querySelector("canvas"), { onDone: programEnd });
    }, 1600);
  }
  // the operator's note, typed in when the first person comes back
  function transmission() {
    var m = "";
    try { m = localStorage.getItem("crypt.msg") || ""; localStorage.removeItem("crypt.msg"); } catch (x) {}
    if (m) showTransmission(m);
  }
  function showTransmission(m) {
    command("incoming transmission ...", true);
    cmdHold = Date.now() + 18000;
    logPush("TRANSMISSION RECEIVED ... HARDLINE");
    if (!panelEl) { panelEl = el("div", "crypt-panel"); document.body.appendChild(panelEl); }
    if (panelLock) return command("operator: " + m.slice(0, 40), true);
    panelLock = "msg";   // the clock window carries the message, whole
    root.classList.add("crypt-p1");
    panelEl.innerHTML = '<div class="phead">&gt; INCOMING TRANSMISSION // OPERATOR</div><div class="psys pmsg"></div>';
    var box = panelEl.querySelector(".pmsg"), k = 0;
    (function type() {
      box.textContent = m.slice(0, ++k);
      if (k < m.length) setTimeout(type, 45);
    })();
    setTimeout(function () { if (panelLock === "msg") { panelLock = null; panelSet("time"); command("transmission ends", true); } }, 15000);
  }

  // ---------- network chatter: two faint log panes beside the clock ----------
  // Made-up traffic for the look: home addresses (this TV's own, from config.json, when it has one),
  // and the documentation-only ranges 192.0.2.x, 198.51.100.x and 203.0.113.x for the far end, so
  // no real outside address is ever shown. Nothing here touches the network.
  var LOG_LINES = 16, logs = [];
  function oct() { return 2 + ((Math.random() * 250) | 0); }
  function home() { return "192.168.1." + oct(); }
  function far() { return ["192.0.2.", "198.51.100.", "203.0.113."][(Math.random() * 3) | 0] + oct(); }
  function hex(n) { var s = ""; while (s.length < n) s += ((Math.random() * 16) | 0).toString(16); return s.toUpperCase(); }
  function mac() { var m = []; for (var i = 0; i < 6; i++) m.push(hex(2)); return m.join(":"); }
  function port() { return [22, 53, 80, 123, 443, 554, 1883, 5353, 8008, 8009, 8123][(Math.random() * 11) | 0]; }
  function logLine(me) {
    if (redPill && Math.random() < 0.18) {
      return ["TRACE PROGRAM RUNNING ... " + hex(6), "!! INTRUSION " + far() + " > " + me, "SENTINEL SWEEP " + hex(4) + " ... HOLD",
        "CARRIER LOST ... RETRY", "KEYMAKER " + hex(8) + " ACCEPTED"][(Math.random() * 5) | 0];
    }
    var ms = 1 + ((Math.random() * 40) | 0), r = (Math.random() * 9) | 0;
    return [
      "PING " + far() + " seq=" + ((Math.random() * 900) | 0) + " " + ms + "ms",
      "TCP  " + me + ":" + (40000 + ((Math.random() * 20000) | 0)) + " > " + far() + ":" + port() + " ESTAB",
      "UDP  " + home() + ":5353 > 224.0.0.251:5353 MDNS",
      "ARP  " + home() + " is-at " + mac(),
      "DHCP ACK " + home() + " lease 86400s",
      "TRACE " + (1 + ((Math.random() * 12) | 0)) + "  " + far() + "  " + ms + ".0" + ((Math.random() * 9) | 0) + "ms",
      "DNS  A? " + ["cdn", "edge", "api", "time", "relay"][(Math.random() * 5) | 0] + hex(3).toLowerCase() + ".lan > " + home(),
      "0x" + hex(4) + "  " + hex(8) + " " + hex(8) + " " + hex(8),
      "LINK " + me + " wlan0 rx " + ((Math.random() * 900) | 0) + "kB/s"
    ][r];
  }
  function logPush(text) {
    logs.forEach(function (box) {
      if (box.children.length > 1) box.removeChild(box.children[1]);
      var line = el("div", "new");
      line.textContent = text;
      box.appendChild(line);
    });
  }
  // after an app: the pane turns into the session report for a while, then the chatter comes back
  var logPausedUntil = 0, logHead = "TRAFFIC wlan0";
  function logSession(lines) {
    var box = logs[0];
    if (!box) return;
    logPausedUntil = Date.now() + 16000;
    root.classList.add("crypt-logshow");
    box.firstChild.textContent = "SESSION.LOG";
    while (box.children.length > 1) box.removeChild(box.children[1]);
    lines.forEach(function (t, i) {
      setTimeout(function () { var d = el("div", "new"); d.textContent = t; box.appendChild(d); }, 1500 + i * 260);
    });
    setTimeout(function () {
      if (Date.now() < logPausedUntil - 100) return;
      root.classList.remove("crypt-logshow");
      box.firstChild.textContent = logHead;
      while (box.children.length > 1) box.removeChild(box.children[1]);
      for (var i = 0; i < LOG_LINES; i++) box.appendChild(el("div", "")).textContent = logLine(logMe);
    }, 16000);
  }
  var logMe = "192.168.1.50";
  function startLogs() {
    var cfg = window.COUCH_CONFIG || {}, tvs = cfg.tvs || [];
    var mine = (tvs.filter(function (t) { return t.id === cfg.default_tv; })[0] || tvs[0] || {}).ip;
    var me = /^\d+\.\d+\.\d+\.\d+$/.test(mine || "") ? mine : "192.168.1.50";
    logMe = me;
    ["right"].forEach(function (side) {
      var box = el("div", "crypt-log " + side);
      box.innerHTML = '<b>' + (side === "left" ? "NETSTAT " + me : "TRAFFIC wlan0") + "</b>";
      document.body.insertBefore(box, document.querySelector(".crypt-edge"));
      logs.push(box);
      for (var i = 0; i < LOG_LINES; i++) box.appendChild(el("div", "", "")).textContent = logLine(me);
    });
    setInterval(function () {
      if (gone() || Date.now() < logPausedUntil) return;
      var box = logs[(Math.random() * logs.length) | 0];
      box.removeChild(box.children[1]);
      var line = el("div", "new");
      line.textContent = logLine(me);
      box.appendChild(line);
    }, 650);
  }

  function start() {
    if (started) return;
    started = true;
    var home = (window.COUCH_CONFIG || {}).home || {};
    slick = home.crypt_style !== "classic";
    root.classList.toggle("crypt-slick", slick);
    cv = el("canvas", "crypt-rain");
    ctx = cv.getContext("2d");
    var fr = el("div", "crypt-frame", frameSVG());
    edge = el("div", "crypt-edge");
    document.body.insertBefore(edge, document.body.firstChild);
    document.body.insertBefore(fr, edge);
    document.body.insertBefore(cv, fr);
    document.body.appendChild(el("div", "crypt-crt"));
    size();
    setEdge(GREEN, false);
    addEventListener("resize", size);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) run(); });
    // OK or Enter on an app: the rain floods and the edges flash in its colour as it opens
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.keyCode !== 23 && e.keyCode !== 13) return;
      if (root.classList.contains("crypt-idle")) return;   // that press only wakes the home
      if (!focusEl || !focusEl.classList.contains("app")) return;
      if (slick) opened(focusEl);
      burstUntil = Date.now() + 900;
      setEdge(tint, true);
      focusEl.classList.add("crypt-go");
      var it = focusEl;
      setTimeout(function () { it.classList.remove("crypt-go"); setEdge(tint, false); }, 900);
    }, true);
    startLogs();
    if (slick) startSlick();
    setInterval(track, 120);
    // for the TV's log (adb logcat): the page must be exactly as wide as the screen
    setTimeout(function () {
      var de = document.documentElement, w = document.querySelector(".crypt-frame svg") || de;
      console.log("crypt: screen " + innerWidth + "x" + innerHeight + ", page " + de.scrollWidth + "x" + de.scrollHeight +
        ", clock window " + JSON.stringify(w.getBoundingClientRect()));
    }, 4000);
    track();
    // the rain waits for the terminal font, so its first glyphs are not the fallback font
    if (document.fonts && document.fonts.load) document.fonts.load("16px VT323").then(function () {}, function () {});
    run();
  }

  window.crypt = {
    start: start, weather: function (w) { weather(w); }, spell: function (t) { spell(t); },
    // for the screensaver
    edgePulse: function (c, ms) { setEdge(c, true); setTimeout(function () { setEdge(tint, false); }, ms || 160); },
    // shortcuts for a demo or the console: start an event now
    demo: { agent: function () { agentSeen(); }, alarm: function () { proximity(); }, finale: function () { loadFinal("play"); },
      redpill: function () { if (swallow || broken) return; if (!redPill) wakeUp(); else choice(); },
      wake: function () { if (!swallow && !broken) wakeUp(); },
      pills: function () { if (swallow) return; if (!redPill) setRed(true, true); choice(); } },
    saver: saverNow, crtOn: crtOn, moment: function (n) { return moment(n); }, anniversary: anniversary,
    takeover: takeover, takeOff: takeOff, wakeLines: wakeLines, isRed: function () { return redPill; },
    setRed: function (on) { setRed(on, true); }, flash: function () { flashEl.classList.remove("on"); void flashEl.offsetWidth; flashEl.classList.add("on"); },
    freeze: function (ms) { frozenUntil = Date.now() + ms; },
    lights: { start: goveeStart, colour: function (c) { gColour(c, true); }, bright: gBright, base: function () { return base(); },
      on: function () { return !!gOn(); } }
  };
})();
