// The Crypt screensaver's clock, date and weather (saver.html). Reads the home's settings
// (config.js): home.clock for 12 or 24 hours, home.language for the date, weather for the place.
// The weather comes straight from Open-Meteo (free, no key) every 30 minutes, the same call the
// home makes with no computer; with ?mock=1 it is a made-up reading, for a preview.
(function () {
  "use strict";
  var cfg = window.COUCH_CONFIG || {}, home = cfg.home || {}, wxc = cfg.weather || {};
  var q = location.search;
  var arg = function (n) { var m = q.match(new RegExp("[?&]" + n + "=([^&]*)")); return m ? decodeURIComponent(m[1]) : null; };
  var lang = home.language || (navigator.language || "en").slice(0, 2);
  var locale = lang === "en" ? "en-AU" : lang;   // the home's own English is Australian: Sunday 8 November
  var clock24 = (arg("clock") || home.clock) ? (arg("clock") || home.clock) === "24h" : ["it", "de", "tr"].indexOf(lang) >= 0;
  var $ = function (id) { return document.getElementById(id); };
  var weather = null;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function draw() {
    var d = new Date(), h = d.getHours();
    $("time").innerHTML = clock24 ? pad(h) + ":" + pad(d.getMinutes())
      : (h % 12 || 12) + ":" + pad(d.getMinutes()) + "<small>" + (h < 12 ? "am" : "pm") + "</small>";
    var day = d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" }).replace(",", "");
    if (document.documentElement.classList.contains("crypt-slick")) {   // the terminal date, SUN 08 NOV
      day = d.toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "short" }).replace(/[,.]/g, "").toUpperCase();
    }
    $("dline").textContent = day;
    var w = weather, parts = [];
    if (w) {
      parts.push(wxc.place || arg("place") || "", w.temp + "°");
      if (w.high != null) parts.push("HIGH " + w.high + "°");
      if (w.humidity != null) parts.push("HUM " + w.humidity + "%");
      if (w.rain != null) parts.push("RAIN " + w.rain + "%");
    }
    $("cwx").innerHTML = parts.length ? "<i>&gt; </i>" + parts.filter(Boolean).join("  ").replace(/[<>&]/g, "") : "";
  }

  function fetchWeather() {
    if (arg("mock")) { weather = { temp: 27, high: 31, humidity: 70, rain: 40 }; draw(); return; }
    if (!isFinite(wxc.lat) || !isFinite(wxc.lon)) return;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + wxc.lat + "&longitude=" + wxc.lon +
      "&current=temperature_2m,relative_humidity_2m&daily=temperature_2m_max,precipitation_probability_max" +
      "&timezone=" + encodeURIComponent(wxc.timezone || "auto") + "&forecast_days=1";
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var c = j.current || {}, dd = j.daily || {};
      var first = function (k) { var v = dd[k] && dd[k][0]; return v == null ? null : Math.round(v); };
      weather = { temp: Math.round(c.temperature_2m), humidity: c.relative_humidity_2m == null ? null : Math.round(c.relative_humidity_2m),
        high: first("temperature_2m_max"), rain: first("precipitation_probability_max") };
      draw();
    }, function () {});
  }

  // the terminal window drifts to a new spot every minute, so nothing marks the screen
  function drift() {
    var rem = innerWidth / 120;
    var dx = (Math.random() * 2 - 1) * 26 * rem, dy = (Math.random() * 30 - 7) * rem;
    $("stage").style.transform = "translate(" + Math.round(dx) + "px," + Math.round(dy) + "px)";
  }

  if (window.crypt) {
    window.crypt.start();
    var fr = document.querySelector(".crypt-frame");
    if (fr) $("stage").insertBefore(fr, $("stage").firstChild);   // the window moves with the clock
  }
  draw();
  setInterval(draw, 10000);
  fetchWeather();
  setInterval(fetchWeather, 30 * 60000);
  setTimeout(drift, 20000);
  setInterval(drift, 60000);

  // ---------- what the screensaver does over time ----------
  // The rain spells the time, then (home.crypt_fight "saver") one stick-figure scene, then the time
  // again, with the next scene each round. Between the two the edges go dark. The idle counter sits
  // small in a corner, and moves corner every few minutes. Now and then the screen goes black and
  // types "Wake up, <name>..." (just that line). The darkening is only after midnight. The Govee
  // lights breathe with it.
  var crypt = window.crypt || {}, started = Date.now();
  var fast = function (n, d) { var v = arg(n); return v ? +v * 1000 : d; };
  var fightOn = home.crypt_fight === "saver" || !!arg("fight");
  var phases = fightOn ? [["spell", fast("spellfor", 30000)], ["fight", 0]] : [["spell", 60000]];
  var at = -1, phaseTimer = null, fightNow = null, waking = false, spellTick = null;
  function nextScene() {
    var n = 0;   // the next scene in order, starting from the first (the freeze kick)
    try { n = +localStorage.getItem("crypt.scene.next") || 0; localStorage.setItem("crypt.scene.next", String(n + 1)); } catch (x) {}
    if (crypt.anniversary && crypt.anniversary()) {   // 31 March: the day starts with bullet time (scene 1)
      var today = new Date().toDateString(), done = "";
      try { done = localStorage.getItem("crypt.anniv") || ""; localStorage.setItem("crypt.anniv", today); } catch (x) {}
      if (done !== today) return 1;
    }
    return arg("scene") ? +arg("scene") : n;
  }
  $("stage").style.display = "none";   // no clock window: the rain is the clock

  function timeText() {
    var d = new Date(), h = d.getHours(), m = pad(d.getMinutes());
    return clock24 ? pad(h) + ":" + m : (h % 12 || 12) + ":" + m;
  }
  function weatherText() {
    return weather ? ((wxc.place || arg("place") || "").toUpperCase() + " " + weather.temp + "°").trim() : timeText();
  }
  function clear() {
    if (fightNow) { fightNow.stop(); fightNow = null; }
    clearInterval(spellTick);
    document.documentElement.classList.remove("s-fight");
    if (crypt.spell) crypt.spell(null);
  }
  // between the time and a scene: the edges (and the lights) go dark for a moment
  function dark(ms) {
    var r = document.documentElement;
    r.classList.add("s-dark");
    if (lightsOn()) L.bright(1);
    setTimeout(function () { r.classList.remove("s-dark"); }, ms);
  }
  function phase() {
    if (waking) return;
    at = (at + 1) % phases.length;
    var p = phases[at][0];
    clear();
    dark(1800);
    setTimeout(function () {
      if (waking || phases[at][0] !== p) return;
      if (p === "fight" && window.cryptFight) {
        document.documentElement.classList.add("s-fight");
        var sc = nextScene() % window.cryptFight.scenes;
        try { localStorage.setItem("crypt.fight.last", JSON.stringify({ i: sc, at: Date.now() })); } catch (x) {}   // for the line after it
        fightNow = window.cryptFight.mount($("fight"), { start: sc, onHit: hitLights, once: true,
          scenery: home.crypt_scenery === true || !!arg("scenery"),   // the film sets behind them
          onDone: function () { fightNow = null; if (!waking && phases[at][0] === "fight") { clearTimeout(phaseTimer); phase(); } } });
      }
      if (p === "spell" && crypt.spell) {
        crypt.spell(timeText());
        spellTick = setInterval(function () { crypt.spell(timeText()); }, 15000);   // keeps the minute right
      }
    }, 1200);
    // a fight ends itself when its scene is done (40 s at most, in case)
    phaseTimer = setTimeout(phase, (phases[at][1] || 40000) + 1200);
  }
  $("stage").style.transition = "transform 3s ease-in-out, opacity 1.5s ease";

  // the idle counter: small, in a corner, a different corner every 4 minutes (nothing stays put)
  var corners = [["6rem", null, null, "5rem"], [null, "6rem", null, "5rem"], [null, "6rem", "5rem", null], ["6rem", null, "5rem", null]], ci = 0;
  function idle() {
    var s = Math.floor((Date.now() - started) / 1000);
    $("corner").textContent = "> SYSTEM IDLE " + pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60);
  }
  function moveCorner() {
    var c = corners[ci++ % corners.length], st = $("corner").style;
    st.left = c[0] || "auto"; st.right = c[1] || "auto"; st.top = c[2] || "auto"; st.bottom = c[3] || "auto";
  }
  setInterval(idle, 1000); idle(); moveCorner(); setInterval(moveCorner, 240000);

  // darker the longer it runs, any time of day: bright for the first 5 minutes, then down to half
  // brightness by 30 minutes; after midnight (12am to 6am) it goes darker still, to 80% over the hour
  var dimNow = 0;
  function dim() {
    var mins = (Date.now() - started) / 60000 * (arg("dim") === "fast" ? 60 : 1), h = new Date().getHours();
    var d = Math.min(0.5, Math.max(0, mins - 5) / 25 * 0.5);
    if (h < 6) d = Math.max(d, Math.min(0.8, 0.45 + Math.max(0, mins / 60) * 0.35));
    dimNow = d;
    $("dim").style.opacity = d.toFixed(2);
  }
  setInterval(dim, 15000); dim();

  // the lights: a slow green (or red) breath, dimmer as the screen dims, a flash on a big hit
  var L = crypt.lights, breathUp = false;
  function lightsOn() { return L && L.on(); }
  function hitLights(big) {
    if (waking) return;
    // the Govee lights watch the screen with their camera: a big hit lights the screen's edges for a
    // moment, which they pick up; with LAN control on (home.govee), they're told directly as well
    if (big && crypt.edgePulse) crypt.edgePulse([235, 245, 255], 160);
    if (!lightsOn()) return;
    L.colour([255, 255, 255]); L.bright(100);
    setTimeout(function () { L.colour(L.base()); }, big ? 220 : 120);
  }
  if (L && home.govee) {
    L.start();
    setInterval(function () {
      if (!lightsOn() || waking) return;
      breathUp = !breathUp;
      L.bright(Math.max(3, Math.round((breathUp ? 55 : 15) * (1 - dimNow))));
    }, 3000);
  }

  // "Wake up, <name>..." every 6 to 12 minutes: just that line, then back to the rain. It never
  // takes the red pill: that only ever happens on the home, with the code.
  function wake() {
    if (!crypt.takeover) return;
    waking = true;
    clearTimeout(phaseTimer); clear();
    crypt.takeover(crypt.wakeLines().slice(0, 1), function () {
      crypt.takeOff();
      if (lightsOn()) L.colour(L.base());
      waking = false;
      at = phases.length - 1; phase();
      nextWake();
    }, { hold: 3500 });
  }
  function nextWake() { setTimeout(wake, fast("wake", 360000 + Math.random() * 360000)); }

  if (crypt.crtOn) crypt.crtOn();
  phase();
  nextWake();
})();
