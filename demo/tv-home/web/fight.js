// Stick-figure fights for the Crypt look: green line figures acting out the famous moves of the
// films (the bullet-time lean, the dojo flurry, the raised palm that stops bullets, the beckon,
// the rooftop leap). Drawn on a canvas in the terminal green, with afterimages and code sparks.
//
//   var f = window.cryptFight.mount(canvas, { small: false });   // plays the scenes in turn
//   f.stop();
//
// Used by the screensaver (saver.js, taking turns with the clock) and by the home's rotating
// clock window (crypt.js). Nothing here touches the network.
(function () {
  "use strict";

  var D = Math.PI / 180;
  var L = { torso: 0.30, head: 0.07, ua: 0.16, fa: 0.15, th: 0.21, sh: 0.21 };
  var KEYS = ["tx", "aA", "fA", "aB", "fB", "lA", "sA", "lB", "sB"];

  // poses: torso (0 up, + leans forward), arms and legs (0 straight down, + forward), degrees
  function P(tx, aA, fA, aB, fB, lA, sA, lB, sB) { return { tx: tx, aA: aA, fA: fA, aB: aB, fB: fB, lA: lA, sA: sA, lB: lB, sB: sB }; }
  var POSE = {
    stand:   P(0, 12, 8, -12, -8, 6, 3, -6, -3),
    guard:   P(8, 45, 150, 25, 165, 22, 8, -22, -14),
    jab:     P(15, 88, 90, 20, 160, 25, 10, -25, -18),
    cross:   P(22, 40, 150, 88, 90, 25, 5, -28, -20),
    blockA:  P(2, 70, 178, 25, 160, 20, 8, -22, -14),
    blockB:  P(2, 35, 150, 70, 178, 20, 8, -22, -14),
    kick:    P(-35, 30, 150, -40, -10, 100, 95, -10, -8),
    hit:     P(-30, -30, -60, -50, -80, 20, 0, -20, -30),
    limbo:   P(-80, -100, -130, -150, -170, 78, -6, 62, -12),
    limbo2:  P(-80, -150, -175, -95, -120, 78, -6, 62, -12),
    palm:    P(-4, 85, 108, -12, -6, 10, 5, -12, -8),
    beckon1: P(4, 72, 82, -40, -120, 18, 6, -18, -12),
    beckon2: P(4, 72, 150, -40, -120, 18, 6, -18, -12),
    behind:  P(6, 50, 150, -40, -120, 20, 6, -20, -12),
    crouch:  P(32, -20, 20, -30, 10, 72, -22, 40, -45),
    flykick: P(-25, 20, 120, -60, -20, 95, 92, -20, -120),
    run1:    P(22, 70, 140, -50, 20, 60, -10, -35, -80),
    run2:    P(22, -50, 20, 70, 140, -35, -80, 60, -10),
    tuck:    P(30, 60, 160, 40, 150, 110, -20, 95, -40),
    land:    P(30, 40, 90, -40, -10, 70, -25, 30, -50),
    lying:   P(-90, -150, -160, -120, -130, 88, 92, 80, 85),
    // Trinity in the air: arms raised and spread like a crane's wings, wrists dropped, the front knee
    // drawn up high and the back leg folded under her
    crane:   P(-6, 100, 112, -100, -112, 112, 18, 30, -100),
    craneK:  P(-22, 96, 108, -96, -108, 104, 100, 28, -90),
    gun:     P(0, 90, 90, -10, -6, 8, 3, -10, -6),
    gun2:    P(0, 90, 90, 92, 92, 8, 3, -10, -6),
    wheel:   P(0, 90, 90, 180, 180, 42, 42, -42, -42),
    duck:    P(40, 90, 90, -30, 10, 80, -20, 40, -60),
    gunDown: P(6, 58, 58, -10, -6, 8, 3, -10, -6),
    graze:   P(-60, -60, -110, -150, -175, 70, -8, 58, -14),
    propped: P(-62, -150, -112, -118, -128, 82, 88, 74, 82),
    pluck:   P(-4, 85, 108, 80, 84, 10, 5, -12, -8),
    study:   P(-2, 85, 108, 30, 148, 10, 5, -12, -8),
    letgo:   P(-4, 85, 108, 55, 75, 10, 5, -12, -8),
    lookDn:  P(14, 10, 6, -10, -6, 8, 3, -8, -3),
    // the dojo: "i know kung fu." ... "show me." Neo runs through his stances before he goes in
    salute:  P(2, 48, 128, 52, 124, 8, 3, -10, -6),           // fist into palm in front of the chest
    horse1:  P(4, 78, 98, 28, 122, 46, -24, -44, 22),          // low and wide, one palm out, the other guarding the chest
    horse2:  P(4, 28, 122, 78, 98, 46, -24, -44, 22),          // the hands roll over and swap
    sweep:   P(10, 120, 150, -40, 40, 52, -30, -46, 26),       // the high hand sweeps round, low in the stance
    kneeUp:  P(-2, 96, 150, 40, 112, 104, 14, -2, 2),          // up on one leg, the knee raised, a palm out
    ready:   P(6, 68, 128, 52, 132, 22, -8, -24, 10),
    sweepLow: P(44, 70, 40, 40, 20, 90, 92, -20, -125),
    airK1:   P(-24, 40, 128, -52, -18, 102, 97, 28, -92),
    lowJoin: P(6, 52, 122, 56, 118, 46, -24, -44, 22),          // low, the hands brought together in front
    wing:    P(-2, 88, 96, -150, -172, 34, -14, -32, 12),       // one palm straight out, the other arm raised high behind
    armHigh: P(0, 172, 176, 14, 44, 8, 3, -10, -6),             // Morpheus: one arm swept up overhead
    wideKick: P(12, 96, 100, -50, 10, 84, 88, -40, 30),         // Morpheus: down wide, the front leg out straight, a hand out over it
    chop:    P(-6, 168, 140, 40, 118, 30, -10, -26, 8),         // a strike coming down from overhead
    blockLow: P(14, 40, 70, 20, 60, 20, -8, -22, 8),            // a parry down low
    leanBack: P(-26, 70, 150, 30, 140, 18, -6, -30, 10),
    throwP:  P(42, 130, 165, 110, 150, 40, -20, -30, 10),       // Morpheus bent forward, pulling him over his shoulder
    lookUp:  P(-18, 60, 120, 40, 130, 14, -6, -18, 8),          // leaning back, watching him go over
    stanceHigh: P(4, 165, 172, 20, 70, 34, -14, -32, 12),      // the stance: one hand raised high, the other low across
    grapple: P(14, 75, 95, 70, 100, 20, -6, -24, 8),            // locked up close, hands on each other
    sitWall: P(-14, -25, 5, -38, -8, 88, 92, 84, 88),            // slumped against the wall, legs out on the floor          // in the air: the front leg out high, the other tucked
    airK2:   P(-24, 52, 138, -40, -8, 28, -92, 102, 97)          // down low, the front leg swung out along the floor           // set: weight back, both hands up and open
  };

  // ---------- geometry ----------
  // the crane's wrists: dropped, the fingers pointing down like a bird's head
  POSE.crane.wA = 40; POSE.crane.wB = -40; POSE.craneK.wA = 40; POSE.craneK.wB = -40;

  function joints(p, x, y, f) {
    var s = function (a) { return Math.sin(a * D); }, c = function (a) { return Math.cos(a * D); };
    var hip = [x, y];
    var neck = [x + L.torso * s(p.tx) * f, y + L.torso * c(p.tx)];
    var head = [neck[0] + (L.head + 0.02) * s(p.tx) * f, neck[1] + (L.head + 0.02) * c(p.tx)];
    var limb = function (o, a, len) { return [o[0] + len * s(a) * f, o[1] - len * c(a)]; };
    var sh = [x + (L.torso - 0.035) * s(p.tx) * f, y + (L.torso - 0.035) * c(p.tx)];   // the shoulders, just under the neck
    var eA = limb(sh, p.aA, L.ua), hA = limb(eA, p.fA, L.fa);
    var eB = limb(sh, p.aB, L.ua), hB = limb(eB, p.fB, L.fa);
    var wA = limb(hA, p.wA == null ? p.fA : p.wA, 0.045), wB = limb(hB, p.wB == null ? p.fB : p.wB, 0.045);   // the hands (a bent wrist)
    var kA = limb(hip, p.lA, L.th), ftA = limb(kA, p.sA, L.sh);
    var kB = limb(hip, p.lB, L.th), ftB = limb(kB, p.sB, L.sh);
    return { hip: hip, neck: neck, sh: sh, wA: wA, wB: wB, head: head, eA: eA, hA: hA, eB: eB, hB: hB, kA: kA, fA: ftA, kB: kB, fB: ftB };
  }
  // the whole figure turned about the hip (a cartwheel): r degrees, + turns the head forward
  function turned(s) {
    var j = joints(s.p, s.x, s.y, s.f);
    if (!s.r) return j;
    var t = s.r * s.f * D, c = Math.cos(t), n = Math.sin(t);
    for (var k in j) {
      var dx = j[k][0] - s.x, dy = j[k][1] - s.y;
      j[k] = [s.x + dx * c + dy * n, s.y - dx * n + dy * c];
    }
    return j;
  }
  function groundY(p) {
    var j = joints(p, 0, 0, 1), m = 0;
    for (var k in j) m = Math.min(m, k === "head" ? j[k][1] - L.head : j[k][1]);
    return -m;
  }
  function ease(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }

  // smooth motion: a curve through the keyframes (cubic Hermite with Fritsch-Carlson tangents), so
  // a move flows into the next instead of stopping dead at every pose; holds and turnarounds still
  // settle (the tangent goes to zero there) and nothing overshoots into a broken joint
  function slope(keys, i, get) {
    var n = keys.length;
    if (i <= 0 || i >= n - 1) return 0;
    var a = keys[i - 1], b = keys[i], c = keys[i + 1];
    var d0 = b.t > a.t ? (get(b) - get(a)) / (b.t - a.t) : 0, d1 = c.t > b.t ? (get(c) - get(b)) / (c.t - b.t) : 0;
    if (d0 * d1 <= 0) return 0;
    return 2 / (1 / d0 + 1 / d1);   // harmonic mean: never overshoots
  }
  function herm(keys, i, get, u) {
    var a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)], h = b.t - a.t;
    if (h <= 0) return get(b);
    var y0 = get(a), y1 = get(b), m0 = slope(keys, i, get) * h, m1 = slope(keys, i + 1, get) * h;
    var u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * m1;
  }
  function poseOf(k) { return POSE[k.p] || k.p; }
  // a figure's place at time t, from its keyframes [{t, p, x, y?, arc?, f?}]
  function at(keys, t) {
    var i = 0;
    while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
    var a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    var u = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 1;
    var e = ease(u);
    var pa = poseOf(a), pb = poseOf(b), p = {};
    KEYS.forEach(function (k) { p[k] = herm(keys, i, function (q) { return poseOf(q)[k]; }, u); });
    ["wA", "wB"].forEach(function (k) {   // a wrist only bends in the poses that say so; otherwise it follows the forearm
      var f = k === "wA" ? "fA" : "fB";
      if (pa[k] == null && pb[k] == null) return;
      var wa = pa[k] == null ? pa[f] : pa[k], wb = pb[k] == null ? pb[f] : pb[k];
      p[k] = wa + (wb - wa) * e;
    });
    var x = herm(keys, i, function (q) { return q.x; }, u);
    var y;
    if (a.y == null && b.y == null) y = groundY(p);
    else {
      var ya = a.y == null ? groundY(pa) : a.y, yb = b.y == null ? groundY(pb) : b.y;
      y = ya + (yb - ya) * u + (b.arc || 0) * Math.sin(Math.PI * u);
    }
    var r = (a.r || 0) + ((b.r || 0) - (a.r || 0)) * e;
    return { p: p, x: x, y: y, f: b.f || a.f || 1, r: r, g: a.g && b.g };
  }

  // ---------- helpers that write keyframes ----------
  // a run as a real gait, not two poses flicked back and forth: thighs swing on a sine, the knee folds
  // as the leg comes through and straightens to land, the arms swing against the legs, and the
  // stride matches the ground covered so the feet don't skate. Sampled finely; the spline smooths it.
  function gait(ph) {
    var d = function (q) { return Math.sin(q); };
    var leg = function (q) {
      var th = 20 + 42 * d(q), fwd = Math.max(0, Math.cos(q + 1.0));   // the knee folds most just after the leg is furthest back
      return [th, th - (8 + 95 * Math.pow(fwd, 1.4))];
    };
    var A = leg(ph), B = leg(ph + Math.PI);
    var arm = function (q) { var u = 10 - 38 * d(q); return [u, u + 85]; };
    var aA = arm(ph), aB = arm(ph + Math.PI);
    return P(22 + 3 * Math.sin(2 * ph), aA[0], aA[1], aB[0], aB[1], A[0], A[1], B[0], B[1]);
  }
  // a run built from where the feet are: the foot on the ground stays put while the body passes
  // over it, the back heel kicks up, the knee drives through, the body rises in the flight between
  // steps and dips as each foot takes the weight; the legs are worked out from the feet (two-bone IK)
  function legTo(fx, fy) {
    var Lg = L.th, d = Math.min(Math.sqrt(fx * fx + fy * fy), 2 * Lg - 0.001);
    var base = Math.atan2(fx, -fy) / D, al = Math.acos(d / (2 * Lg)) / D;
    return [base + al, base - al];   // thigh, shin: the knee forward
  }
  function stride(ph, v, T) {   // ph 0..1 through one full stride; v the speed; T the seconds a stride takes
    var c = 0.4, S = v * T, A = S * c / 2, lift = Math.min(0.2, 0.09 + S * 0.22);
    var hipY = 0.392 + 0.014 * Math.cos(4 * Math.PI * (ph - c / 2 - 0.25));   // low mid-step, high in the flight
    var foot = function (q) {
      q = ((q % 1) + 1) % 1;
      if (q < c) return [A - 2 * A * q / c, -hipY];                       // on the ground: still, the body passing over it
      var u = (q - c) / (1 - c), e = u * u * (3 - 2 * u);
      return [-A + 2 * A * e - 0.1 * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u),
        -hipY + lift * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 1.2)];   // the heel up behind, then the knee through
    };
    var fa = foot(ph), fb = foot(ph + 0.5), a = legTo(fa[0], fa[1]), b = legTo(fb[0], fb[1]);
    var arm = function (q) { var w = Math.cos(2 * Math.PI * q); return [4 - 42 * w, 4 - 42 * w + 92 + 18 * Math.max(0, -w)]; };
    var aA = arm(ph + 0.5), aB = arm(ph);   // each arm swings with the opposite leg
    return { p: P(15 + 2 * Math.sin(4 * Math.PI * ph), aA[0], aA[1], aB[0], aB[1], a[0], a[1], b[0], b[1]), y: hipY };
  }
  function gait(ph) { return stride(ph / (2 * Math.PI), 0.6, 0.72).p; }
  function run(keys, t0, t1, x0, x1, f) {
    var v = Math.abs(x1 - x0) / (t1 - t0);
    var T = Math.max(0.62, Math.min(0.8, 0.45 / Math.max(0.01, v)));   // seconds per stride: a longer stride when faster
    var n = Math.max(6, Math.round((t1 - t0) / 0.035));
    for (var k = 0; k <= n; k++) {
      var t = t0 + (t1 - t0) * k / n, s = stride((t - t0) / T, v, T);
      keys.push({ t: t, p: s.p, y: s.y, x: x0 + (x1 - x0) * k / n, f: f, g: 1 });
    }
  }
  // a walk: the same idea, slower, with a foot always down
  function walk(keys, t0, t1, x0, x1, f, pose) {
    var v = Math.abs(x1 - x0) / (t1 - t0), T = 1.1, n = Math.max(6, Math.round((t1 - t0) / 0.05));
    for (var k = 0; k <= n; k++) {
      var t = t0 + (t1 - t0) * k / n, ph = (t - t0) / T, c = 0.62, S = v * T, A = S * c / 2;
      var hy = 0.405 + 0.006 * Math.cos(4 * Math.PI * (ph - 0.15));
      var foot = function (q) {
        q = ((q % 1) + 1) % 1;
        if (q < c) return [A - 2 * A * q / c, -hy];
        var u = (q - c) / (1 - c); return [-A + 2 * A * u * u * (3 - 2 * u), -hy + 0.05 * Math.sin(Math.PI * u)];
      };
      var fa = foot(ph), fb = foot(ph + 0.5), a = legTo(fa[0], fa[1]), b = legTo(fb[0], fb[1]);
      var w = Math.cos(2 * Math.PI * ph), base = POSE[pose || "stand"];
      var p = pose ? P(base.tx, base.aA, base.fA, base.aB, base.fB, a[0], a[1], b[0], b[1])
        : P(3, -14 * w, -10 * w + 12, 14 * w, 14 * w + 12, a[0], a[1], b[0], b[1]);
      keys.push({ t: t, p: p, y: hy, x: x0 + (x1 - x0) * k / n, f: f, g: 1 });
    }
  }

  // ---------- the scenes ----------
  // the rooftop: the agent fires, Neo bends back under the bullets in slow motion, arms wheeling;
  // time comes back and the last two catch his shoulder and thigh, he goes down; the agent walks up
  // to finish it and Trinity puts her gun to his head: "dodge this."
  function sceneBulletTime() {
    var hero = [
      { t: 0, p: "stand", x: -0.38 }, { t: 1.0, p: "guard", x: -0.38 }, { t: 5.2, p: "guard", x: -0.38 },
      { t: 6.1, p: "limbo", x: -0.42 }];   // he only bends back as the first bullet reaches him
    for (var k = 0; k < 4; k++) hero.push({ t: 6.6 + k * 0.5, p: k % 2 ? "limbo" : "limbo2", x: -0.42 });
    hero.push({ t: 8.6, p: "limbo", x: -0.42 }, { t: 8.85, p: "graze", x: -0.46 }, { t: 9.45, p: "lying", x: -0.62, y: 0.05 },
      { t: 11.4, p: "lying", x: -0.62, y: 0.05 }, { t: 12.3, p: "propped", x: -0.62, y: 0.07 }, { t: 14.5, p: "propped", x: -0.62, y: 0.07 });
    var gun = P(0, 90, 90, -10, -6, 8, 3, -10, -6);
    var foe = [{ t: 0, p: "stand", x: 1.25, f: -1 }, { t: 1.4, p: gun, x: 1.25, f: -1 }, { t: 8.9, p: gun, x: 1.25, f: -1 }, { t: 9.3, p: "stand", x: 1.25, f: -1 }];
    walk(foe, 9.5, 11.4, 1.25, 0.12, -1);
    foe.push({ t: 11.9, p: "gunDown", x: 0.12, f: -1 }, { t: 12.55, p: "gunDown", x: 0.12, f: -1 },
      { t: 12.75, p: "hit", x: 0.02, f: -1, y: 0.42 }, { t: 13.5, p: "lying", x: -0.1, f: 1, y: 0.05, r: 10 }, { t: 14.5, p: "lying", x: -0.1, f: 1, y: 0.05 });
    var tri = [{ t: 0, p: "stand", x: 2.2, f: -1 }, { t: 10.4, p: "stand", x: 2.2, f: -1 }];
    walk(tri, 10.5, 12.0, 2.2, 0.5, -1, "gun");
    tri.push({ t: 12.2, p: gun, x: 0.48, f: -1 }, { t: 14.5, p: gun, x: 0.48, f: -1 });
    var bullets = [0, 1, 2, 3, 4].map(function (k) { return { t0: 2.3 + k * 0.5, x0: 0.95, y: [0.66, 0.6, 0.72, 0.57, 0.64][k], vx: -0.3, rings: true }; });
    bullets.push({ t0: 7.0, x0: 0.95, y: 0.5, vx: -0.3, rings: true, fast: 8.6 }, { t0: 7.4, x0: 0.95, y: 0.3, vx: -0.3, rings: true, fast: 8.6 });
    return { name: "bullet_time.exe", len: 14.5, figs: [hero, foe, tri], bullets: bullets, slow: [2.3, 8.6],
      hits: [{ t: 8.78, x: -0.4, y: 0.5, small: true }, { t: 8.84, x: -0.36, y: 0.3, small: true }, { t: 12.6, x: 0.2, y: 0.76, big: true }],
      shots: [{ t: 12.6, fig: 2 }] };
  }

  // the sparring program: the pivotal moments of the dojo fight cut together. Neo's stances, then
  // Morpheus's; the wide shot, Neo on the right; Neo charges in from overhead and throws his hands,
  // all parried; Morpheus beckons him on; the jumping triple kick, each one turned aside; Morpheus's
  // kick puts him back; Neo somersaults over him, runs up the wall and flips high across the room to
  // the far side, and Morpheus's side kick sends him into the opposite wall. the end
  function sceneFlurry() {
    // (built with Neo on the left, then mirrored at the end)
    var hero = [{ t: 0, p: "lowJoin", x: -1.0 }, { t: 0.6, p: "horse1", x: -1.02 }, { t: 1.2, p: "horse2", x: -1.02 },
      { t: 1.8, p: "wing", x: -1.0 }, { t: 5.3, p: "wing", x: -1.0 }, { t: 5.5, p: "guard", x: -1.0 }];
    var foe = [{ t: 0, p: "guard", x: 0.34, f: -1 }, { t: 2.2, p: "guard", x: 0.34, f: -1 }, { t: 2.7, p: "armHigh", x: 0.34, f: -1 },
      { t: 3.3, p: "lowJoin", x: 0.34, f: -1 }, { t: 3.9, p: "wideKick", x: 0.36, f: -1 }, { t: 4.7, p: "ready", x: 0.34, f: -1 },
      { t: 5.9, p: "ready", x: 0.34, f: -1 }, { t: 6.15, p: "guard", x: 0.33, f: -1 }];
    run(hero, 5.6, 6.3, -1.0, -0.4, 1);
    var hits = [], t = 6.35;
    var hp = function (dt, p, x, y, f, r) { hero.push({ t: t + dt, p: p, x: x, y: y, f: f, r: r }); };
    var fp = function (dt, p, x, y, r) { foe.push({ t: t + dt, p: p, x: x, y: y, f: -1, r: r }); };
    var hit = function (dt, x, y, small, big, dust) { hits.push({ t: t + dt, x: x, y: y, small: small, big: big, dust: dust }); };
    // in from overhead, then the hands, every one parried
    hp(0, "chop", -0.35); hp(0.18, "cross", -0.3); fp(0.18, "blockA", 0.34); hit(0.18, 0.02, 0.84, true);
    t += 0.35;
    for (var k = 0; k < 8; k++) {
      hp(0, "guard", -0.31); hp(0.1, k % 2 ? "cross" : "jab", -0.27);
      fp(0, "guard", 0.33); fp(0.1, k % 2 ? "blockB" : "blockA", 0.34);
      hit(0.1, 0.04, 0.66 + (k % 3) * 0.04, true);
      t += 0.22;
    }
    hp(0.4, "ready", -0.55, 0.45); hp(0.8, "guard", -0.62);   // he springs back out
    fp(0.4, "ready", 0.34);
    t += 0.9;
    // the beckon
    for (var c = 0; c < 3; c++) fp(0.1 + c * 0.32, c % 2 ? "beckon2" : "beckon1", 0.34);
    fp(1.15, "guard", 0.34); hp(1.0, "guard", -0.85);
    t += 1.2;
    // the charge and the jumping kicks
    run(hero, t, t + 0.6, -0.85, -0.56, 1);
    t += 0.65;
    hp(0.08, "crouch", -0.53); hp(0.34, "airK1", -0.43, 0.8); hp(0.5, "tuck", -0.37, 0.92); hp(0.66, "airK2", -0.31, 0.9);
    hp(0.9, "airK1", -0.25, 0.82); hp(1.22, "land", -0.2); hp(1.55, "guard", -0.22);
    fp(0.08, "guard", 0.34); fp(0.34, "blockA", 0.36); fp(0.66, "blockB", 0.4); fp(0.9, "leanBack", 0.44); fp(1.3, "guard", 0.42);
    hit(0.34, -0.12, 0.92, true); hit(0.66, 0.0, 0.98, true); hit(0.9, 0.1, 0.9, true);
    t += 1.6;
    // Morpheus answers with a kick to the chest that puts him back across the floor
    fp(0.15, "guard", 0.4); fp(0.4, "kick", 0.3); fp(0.85, "guard", 0.32);
    hp(0.15, "guard", -0.22); hp(0.4, "hit", -0.28, 0.5); hp(0.8, "land", -0.6); hp(1.05, "guard", -0.62);
    hit(0.4, -0.08, 0.66, false, true);
    t += 1.1;
    // as the film has it: Neo somersaults over Morpheus as he ducks, lands behind him and runs at the
    // wall, up it, and off it high across the room in a long flip, landing on the far side; Morpheus
    // watches him all the way, turns, and his side kick sends Neo into the opposite wall and down
    var tw = t;
    run(hero, t + 0.1, t + 0.5, -0.62, -0.38, 1);
    hp(0.65, "crouch", -0.34); hp(0.95, "tuck", -0.05, 1.05, 1, -120); hp(1.2, "tuck", 0.3, 1.3, 1, -220);
    hp(1.45, "tuck", 0.6, 1.0, 1, -330); hp(1.7, "land", 0.8, null, 1, -360);
    fp(0.6, "guard", 0.32); fp(0.9, "duck", 0.32); fp(1.45, "guard", 0.32);
    run(hero, t + 1.85, t + 2.35, 0.8, 1.06, 1);
    hp(2.5, "run1", 1.1, 0.48, 1, -72); hp(2.68, "run2", 1.09, 0.78, 1, -82); hp(2.86, "run1", 1.08, 0.98, 1, -88);
    hp(3.05, "tuck", 0.92, 1.1, -1, 0); hp(3.4, "tuck", 0.5, 1.22, -1, -120); hp(3.75, "tuck", 0.0, 1.12, -1, -240);
    hp(4.1, "tuck", -0.45, 0.9, -1, -330); hp(4.35, "land", -0.66, null, -1, -360); hp(4.65, "guard", -0.66, null, 1, -360);
    foe.push({ t: t + 1.8, p: "guard", x: 0.32, f: 1 }, { t: t + 2.7, p: "lookUp", x: 0.32, f: 1 }, { t: t + 3.6, p: "lookUp", x: 0.32, f: -1 },
      { t: t + 4.3, p: "guard", x: 0.3, f: -1 }, { t: t + 4.75, p: "crouch", x: 0.2, f: -1 }, { t: t + 5.0, p: "kick", x: 0.04, f: -1 },
      { t: t + 5.6, p: "guard", x: 0.08, f: -1 }, { t: t + 6.4, p: "stand", x: 0.08, f: -1 }, { t: t + 8.4, p: "stand", x: 0.08, f: -1 });
    hp(4.85, "guard", -0.5, null, 1, -360); hp(5.02, "hit", -0.56, 0.62, 1, -360); hp(5.35, "hit", -1.1, 0.74, 1, -340);
    hp(5.6, "hit", -1.08, 0.5, 1, -330); hp(6.0, "lying", -0.98, 0.05, 1, -360); hp(8.4, "lying", -0.98, 0.05, 1, -360);
    hit(5.0, -0.36, 0.68, false, true); hit(5.35, -1.25, 0.74, false, true); hit(6.0, -0.98, 0.03, true, false, true);
    t += 8.4;
    // Neo is on the right of the room as the film opens: mirror it all
    [hero, foe].forEach(function (keys) { keys.forEach(function (q) { q.x = -q.x; q.f = -(q.f || 1); }); });
    hits.forEach(function (h) { h.x = -h.x; });
    var tb = 6.35 + 0.35 + 8 * 0.22 + 0.9;   // the beckon
    var cams = [[0, 0.95, 0, 1.5], [2.0, 0.95, 0, 1.5], [2.25, -0.34, 0, 1.5], [4.4, -0.34, 0, 1.5], [4.65, 0.33, 0, 1.0], [5.6, 0.33, 0, 1.0],
      [6.4, 0, 0, 1.2], [tb - 0.1, 0, 0, 1.2], [tb + 0.1, -0.34, 0, 1.5], [tb + 1.1, -0.34, 0, 1.5], [tb + 1.3, 0.2, 0, 1.0], [tw + 1.6, 0.0, 0, 1.0], [tw + 2.3, -0.55, 0.15, 1.0], [tw + 3.0, -0.5, 0.25, 1.0],
      [tw + 3.8, 0.1, 0.25, 1.0], [tw + 4.8, 0.45, 0, 1.0], [tw + 5.6, 0.62, 0, 1.0], [99, 0.62, 0, 1.0]];
    return { name: "dojo.flurry", len: t, figs: [hero, foe], bullets: [], hits: hits, shots3: cams, wall: [-1.2, 1.25] };
  }





  // the corridor at the end of the first film: "no." the hand comes up and the bullets stop in the
  // air; he takes one, turns it over, lets it fall, then lowers his hand and the rest drop with it
  function sceneStop() {
    var hero = [{ t: 0, p: "stand", x: -0.45 }, { t: 1.4, p: "stand", x: -0.45 }, { t: 2.0, p: "palm", x: -0.45 },
      { t: 4.3, p: "palm", x: -0.45 }, { t: 4.9, p: "pluck", x: -0.43 }, { t: 5.6, p: "study", x: -0.45 }, { t: 7.0, p: "study", x: -0.45 },
      { t: 7.4, p: "letgo", x: -0.45 }, { t: 8.0, p: "palm", x: -0.45 }, { t: 8.6, p: "palm", x: -0.45 }, { t: 9.3, p: "stand", x: -0.45 }, { t: 12, p: "stand", x: -0.45 }];
    var gun = P(0, 90, 90, 92, 92, 8, 3, -10, -6);
    var foe = [{ t: 0, p: gun, x: 1.3, f: -1 }, { t: 5, p: gun, x: 1.3, f: -1 }, { t: 6.5, p: "stand", x: 1.3, f: -1 }, { t: 12, p: "stand", x: 1.3, f: -1 }];
    var bullets = [0, 1, 2, 3, 4, 5].map(function (k) {
      return { t0: 1.1 + k * 0.16, x0: 1.05, y: [0.7, 0.62, 0.55, 0.76, 0.66, 0.5][k], stop: -0.02 + k * 0.07, drop: 9.0 + k * 0.07 };
    });
    bullets[0].pick = [4.9, 7.35];
    return { name: "stop.cmd", len: 12, figs: [hero, foe], bullets: bullets, hits: [] };
  }

  // the subway, from where Neo gets up and takes his stance (as in the film, Neo on the right): he
  // raises a hand high in his stance, then beckons Smith in; they run at each other and meet in the
  // air; a fast trade of hands, a clinch face to face, Neo's combination puts Smith back; Smith drives
  // him into the wall and hammers him there, Neo slips the last punch and it goes through the tiles;
  // Smith's kick sends him down the platform as the train comes through
  function sceneBeckon() {
    // (built with Neo on the left, then mirrored at the end)
    var hero = [{ t: 0, p: "crouch", x: -0.85 }, { t: 0.9, p: "crouch", x: -0.85 }, { t: 1.5, p: "stand", x: -0.85 },
      { t: 2.0, p: "stanceHigh", x: -0.86 }, { t: 2.9, p: "stanceHigh", x: -0.86 }];
    for (var k = 0; k < 5; k++) hero.push({ t: 3.2 + k * 0.38, p: k % 2 ? "beckon2" : "beckon1", x: -0.85 });
    hero.push({ t: 5.2, p: "guard", x: -0.85 });
    var foe = [{ t: 0, p: "stand", x: 0.85, f: -1 }, { t: 4.9, p: "stand", x: 0.85, f: -1 }, { t: 5.2, p: "guard", x: 0.85, f: -1 }];
    run(hero, 5.35, 6.25, -0.85, -0.3, 1); run(foe, 5.35, 6.25, 0.85, 0.3, -1);
    var hits = [], t = 6.3;
    var hp = function (dt, p, x, y, f, r) { hero.push({ t: t + dt, p: p, x: x, y: y, f: f, r: r }); };
    var fp = function (dt, p, x, y, f, r) { foe.push({ t: t + dt, p: p, x: x, y: y, f: f || -1, r: r }); };
    var hit = function (dt, x, y, small, big, dust) { hits.push({ t: t + dt, x: x, y: y, small: small, big: big, dust: dust }); };
    // up into the air at each other, and the collision
    hp(0.15, "crouch", -0.27); hp(0.55, "flykick", -0.1, 0.62, 1); hp(1.05, "land", -0.24); hp(1.35, "guard", -0.22);
    fp(0.15, "crouch", 0.27); fp(0.55, "flykick", 0.1, 0.62); fp(1.05, "land", 0.24); fp(1.35, "guard", 0.22);
    hit(0.55, 0, 0.82, false, true);
    t += 1.45;
    // the trade: hands both ways, all checked
    for (var m = 0; m < 8; m++) {
      var nAtt = m % 2 === 0;
      hp(0, "guard", -0.21); fp(0, "guard", 0.21);
      if (nAtt) { hp(0.09, m % 4 ? "cross" : "jab", -0.17); fp(0.09, m % 4 ? "blockB" : "blockA", 0.22); }
      else { fp(0.09, m % 4 === 1 ? "jab" : "cross", 0.17); hp(0.09, m % 4 === 1 ? "blockA" : "blockB", -0.22); }
      hit(0.09, nAtt ? 0.04 : -0.04, 0.68 + (m % 3) * 0.04, true);
      t += 0.2;
    }
    // the clinch, face to face, then pushed apart
    hp(0.1, "grapple", -0.12); fp(0.1, "grapple", 0.12); hp(0.9, "grapple", -0.12); fp(0.9, "grapple", 0.12);
    hp(1.1, "guard", -0.26); fp(1.1, "guard", 0.26);
    t += 1.2;
    // Neo's combination puts him back
    hp(0.1, "jab", -0.2); fp(0.1, "hit", 0.3); hit(0.1, 0.06, 0.74);
    hp(0.32, "cross", -0.18); fp(0.32, "hit", 0.36); hit(0.32, 0.1, 0.72);
    hp(0.6, "kick", -0.16); fp(0.6, "hit", 0.5, 0.5); fp(1.0, "land", 0.6); fp(1.3, "guard", 0.56); hit(0.6, 0.18, 0.6, false, true);
    hp(0.95, "guard", -0.2);
    t += 1.4;
    // Smith comes back and drives him into the wall, and hammers him there
    run(foe, t, t + 0.45, 0.56, 0.05, -1);
    fp(0.55, "cross", -0.2); hp(0.55, "hit", -0.5, 0.5); hp(0.85, "hit", -0.92); hit(0.55, -0.22, 0.7, false, true); hit(0.85, -1.08, 0.72);
    fp(0.85, "guard", -0.62);
    t += 0.95;
    for (var p = 0; p < 5; p++) {
      fp(0, "guard", -0.66); fp(0.1, p % 2 ? "cross" : "jab", -0.7);
      hp(0, "guard", -0.94); hp(0.1, "hit", -0.97);
      hit(0.1, -0.86, 0.76 - (p % 2) * 0.06, false, false);
      t += 0.24;
    }
    // he slips the last one and it goes through the tiles; Neo hits back and gets out past him
    hp(0.1, "duck", -0.92); fp(0.15, "cross", -0.74); hit(0.15, -1.1, 0.78, false, true, true);
    hp(0.45, "cross", -0.86); fp(0.45, "hit", -0.6);
    hp(0.75, "tuck", -0.6, 0.3); hp(1.0, "land", -0.35, null, 1); hp(1.2, "guard", -0.35, null, -1);
    fp(0.85, "guard", -0.62); fp(1.15, "guard", -0.62, null, 1);
    t += 1.3;
    // Smith's kick sends him down the platform, and the train comes through
    fp(0.1, "crouch", -0.56, null, 1); fp(0.35, "kick", -0.5, null, 1); fp(0.9, "guard", -0.52, null, 1); fp(2.0, "stand", -0.52, null, 1);
    hp(0.35, "hit", -0.28, 0.55, -1); hp(0.9, "hit", 0.55, 0.45, -1); hp(1.25, "lying", 0.85, 0.05, -1); hp(4.0, "lying", 0.85, 0.05, -1);
    fp(4.0, "stand", -0.52, null, 1);
    hit(0.35, -0.34, 0.66, false, true); hit(1.25, 0.85, 0.03, true, false, true);
    var train = t + 1.4;
    t += 4.0;
    // Neo is on the right, as in the film: mirror it all
    [hero, foe].forEach(function (keys) { keys.forEach(function (q) { q.x = -q.x; q.f = -(q.f || 1); }); });
    hits.forEach(function (h) { h.x = -h.x; });
    var cams = [[0, 0.82, 0, 1.45], [4.9, 0.82, 0, 1.45], [5.3, 0, 0, 1.0], [6.3, 0, 0, 1.0], [7.8, 0, 0, 1.2], [11.6, 0.1, 0, 1.15],
      [12.6, 0.62, 0, 1.15], [15.4, 0.62, 0, 1.15], [16.3, 0.1, 0, 1.0], [99, 0.1, 0, 1.0]];
    return { name: "beckon.exe", len: t, figs: [hero, foe], bullets: [], hits: hits, shots3: cams, wall: 1.1, train: train };
  }


  // the jump program: two towers, a street far below between them. Morpheus runs and clears the
  // gap; "free your mind." Neo runs, jumps, and drops: the camera follows him all the way down to the
  // street, which gives like rubber and throws him back up, twice, before he lies still
  function sceneLeap() {
    var STREET = -3.1;
    var mo = [{ t: 0, p: "stand", x: -1.0 }, { t: 0.6, p: "stand", x: -1.0 }];
    run(mo, 0.8, 1.9, -1.0, -0.56, 1);
    mo.push({ t: 2.1, p: "crouch", x: -0.52 }, { t: 2.8, p: "tuck", x: 0.1, y: 1.0, arc: 0.35 }, { t: 3.5, p: "land", x: 0.9 },
      { t: 4.2, p: "stand", x: 0.9 }, { t: 4.7, p: "stand", x: 0.9, f: -1 }, { t: 11.5, p: "stand", x: 0.9, f: -1 });
    var hero = [{ t: 0, p: "stand", x: -1.35 }, { t: 4.4, p: "stand", x: -1.35 }];
    run(hero, 4.6, 5.9, -1.35, -0.56, 1);
    hero.push({ t: 6.1, p: "crouch", x: -0.52 }, { t: 6.6, p: "tuck", x: -0.2, y: 0.6, arc: 0.1 });
    for (var k = 1; k <= 8; k++) {   // the drop, faster and faster, flailing
      var u = k / 8;
      hero.push({ t: 6.6 + u * 1.3, p: k % 2 ? "flykick" : "hit", x: -0.2 + u * 0.28, y: 0.6 + (STREET - 0.6) * u * u, r: u * 60 });
    }
    // the street takes him and throws him back up
    hero.push({ t: 8.15, p: "lying", x: 0.1, y: STREET - 0.17, r: 30 }, { t: 8.5, p: "lying", x: 0.12, y: STREET + 0.55, r: -20 },
      { t: 8.95, p: "lying", x: 0.13, y: STREET - 0.05, r: 15 }, { t: 9.2, p: "lying", x: 0.14, y: STREET + 0.16, r: -6 },
      { t: 9.45, p: "lying", x: 0.14, y: STREET + 0.03 }, { t: 11.5, p: "lying", x: 0.14, y: STREET + 0.05 });
    var land = 7.9;
    return { name: "rooftop.leap", len: 11.5, figs: [hero, mo], bullets: [], depth: 3.9,
      cam: function (t) {   // stays on the roofs, then goes down with him
        if (t < 6.7) return 0;
        var u = Math.min(1, (t - 6.7) / 1.3); return (STREET - 0.2) * u * u * (3 - 2 * u);
      },
      street: { y: STREET, x: 0.1, dip: function (t) {
        if (t < land) return 0;
        var d = t - land; return 0.24 * Math.exp(-2 * d) * Math.sin(d * 6.5);
      } },
      hits: [{ t: 3.5, x: 0.9, y: 0.02, dust: true }, { t: land, x: 0.1, y: STREET + 0.02, dust: true, big: true },
        { t: 8.95, x: 0.13, y: STREET + 0.02, dust: true }], gap: [-0.45, 0.6] };
  }

  // the leap that hangs in the air: up into the crane, time stops, the camera circles, then the kick
  function sceneFreezeKick() {
    var hero = [{ t: 0, p: "guard", x: -0.6 }, { t: 1.0, p: "guard", x: -0.6 }, { t: 1.5, p: "crouch", x: -0.55 },
      { t: 2.2, p: "crane", x: -0.42, y: 0.78, arc: 0.12 }, { t: 5.6, p: "crane", x: -0.4, y: 0.79 },
      { t: 6.0, p: "craneK", x: -0.22, y: 0.7 }, { t: 6.5, p: "kick", x: -0.12, y: 0.5 }, { t: 7.1, p: "land", x: -0.1 },
      { t: 8.2, p: "guard", x: -0.1 }, { t: 10, p: "guard", x: -0.1 }];
    var foe = [{ t: 0, p: "guard", x: 0.35, f: -1 }, { t: 1.6, p: "jab", x: 0.3, f: -1 }, { t: 2.2, p: "guard", x: 0.32, f: -1 },
      { t: 5.9, p: "guard", x: 0.32, f: -1 }, { t: 6.15, p: "hit", x: 0.4, f: -1, y: 0.5 },
      { t: 7.0, p: "hit", x: 1.08, f: -1, y: 0.55, arc: 0.2 }, { t: 7.6, p: "lying", x: 0.88, f: -1, y: 0.05 }, { t: 10, p: "lying", x: 0.88, f: -1, y: 0.05 }];
    return { name: "freeze.kick", len: 10, figs: [hero, foe], bullets: [], freeze: [2.25, 5.6, -0.42, 0.95],
      hits: [{ t: 6.15, x: 0.22, y: 0.82, big: true }, { t: 7.0, x: 1.28, y: 0.55, big: true }], wall: 1.32 };
  }


  // ---------- the sets: a backdrop for each scene, from the films (opt.scenery) ----------
  // Drawn once per scene on its own canvas behind the fighters, in thin dim outlines, so it costs
  // nothing frame to frame. A few small things move (the helicopter's rotor, the train) and those
  // are drawn with the fighters.
  var SETS = {
    // the hotel room at the start of the first film: peeling wall, the window with its blinds,
    // a chair, and torch beams coming in through the doorway on the right
    "freeze.kick": function (g, d) {
      var X = d.X, Y = d.Y, W = d.W;
      d.line(g, 0.12); g.beginPath(); g.moveTo(0, Y(1.55)); g.lineTo(W, Y(1.55)); g.stroke();             // ceiling line
      d.line(g, 0.08); g.beginPath();
      for (var x = -2.2; x < 1.3; x += 0.16) { g.moveTo(X(x), Y(1.55)); g.lineTo(X(x), Y(0.95 + Math.sin(x * 7) * 0.12)); }   // wallpaper strips, torn
      g.stroke();
      d.rect(g, -1.45, 0.55, -0.85, 1.35, 0.22);                                                          // the window
      d.line(g, 0.13); g.beginPath();
      for (var b = 0.62; b < 1.32; b += 0.07) { g.moveTo(X(-1.43), Y(b)); g.lineTo(X(-0.87), Y(b - (b > 1.0 ? 0.04 : 0))); }   // blinds, one bent
      g.stroke();
      d.line(g, 0.2); g.beginPath();                                                                       // a chair
      g.moveTo(X(-1.05), Y(0)); g.lineTo(X(-1.05), Y(0.3)); g.lineTo(X(-0.8), Y(0.3)); g.lineTo(X(-0.8), Y(0));
      g.moveTo(X(-1.05), Y(0.3)); g.lineTo(X(-1.07), Y(0.62)); g.stroke();
      d.rect(g, 1.4, 0, 1.8, 1.3, 0.22);                                                                   // the doorway
      var bg = g.createLinearGradient(X(1.5), 0, X(0.2), 0);
      bg.addColorStop(0, "rgba(200,255,216,0.2)"); bg.addColorStop(1, "rgba(200,255,216,0)");
      g.fillStyle = bg; g.beginPath(); g.moveTo(X(1.45), Y(1.0)); g.lineTo(X(0.3), Y(0.05)); g.lineTo(X(0.0), Y(0.3)); g.lineTo(X(1.45), Y(1.1)); g.fill();   // torch beams
      g.beginPath(); g.moveTo(X(1.45), Y(0.8)); g.lineTo(X(0.6), Y(-0.02)); g.lineTo(X(0.35), Y(0.05)); g.lineTo(X(1.45), Y(0.88)); g.fill();
    },
    // the rooftop: a water tower on its legs, air vents, a railing, the skyline beyond
    "bullet_time.exe": function (g, d) {
      var X = d.X, Y = d.Y;
      d.skyline(g, 0.55, 0.07);
      d.line(g, 0.22); g.beginPath();                                                                     // the water tower
      g.moveTo(X(-1.55), Y(0)); g.lineTo(X(-1.45), Y(0.75)); g.moveTo(X(-1.05), Y(0)); g.lineTo(X(-1.15), Y(0.75));
      g.moveTo(X(-1.5), Y(0.4)); g.lineTo(X(-1.1), Y(0.4)); g.moveTo(X(-1.52), Y(0.1)); g.lineTo(X(-1.12), Y(0.62));
      g.stroke();
      d.rect(g, -1.55, 0.75, -1.05, 1.25, 0.22);
      g.beginPath(); g.moveTo(X(-1.58), Y(1.25)); g.lineTo(X(-1.3), Y(1.42)); g.lineTo(X(-1.02), Y(1.25)); g.stroke();
      d.line(g, 0.1); g.beginPath(); for (var b = 0.82; b < 1.25; b += 0.08) { g.moveTo(X(-1.55), Y(b)); g.lineTo(X(-1.05), Y(b)); } g.stroke();
      d.rect(g, 0.45, 0, 0.75, 0.22, 0.2); d.rect(g, 0.52, 0.22, 0.68, 0.3, 0.2);                           // air vents
      d.rect(g, -0.85, 0, -0.65, 0.16, 0.18);
      d.line(g, 0.14); g.beginPath(); g.moveTo(X(-2.4), Y(0.28)); g.lineTo(X(2.4), Y(0.28));             // the railing at the edge
      for (var r = -2.4; r < 2.4; r += 0.2) { g.moveTo(X(r), Y(0)); g.lineTo(X(r), Y(0.28)); } g.stroke();
    },
    // the dojo program: paper screens all along the back, a scroll, the floorboards
    "dojo.flurry": function (g, d) {
      var X = d.X, Y = d.Y, W = d.W;
      for (var p = -2.2; p < 2.2; p += 0.55) {
        d.rect(g, p, 0.1, p + 0.5, 1.45, 0.2);
        d.line(g, 0.09); g.beginPath();
        for (var gy2 = 0.3; gy2 < 1.45; gy2 += 0.22) { g.moveTo(X(p), Y(gy2)); g.lineTo(X(p + 0.5), Y(gy2)); }
        for (var gx2 = p + 0.125; gx2 < p + 0.5; gx2 += 0.125) { g.moveTo(X(gx2), Y(0.1)); g.lineTo(X(gx2), Y(1.45)); }
        g.stroke();
      }
      d.rect(g, -0.12, 0.6, 0.12, 1.25, 0.25);                                                            // a scroll
      d.line(g, 0.18); g.beginPath(); g.moveTo(X(-0.06), Y(1.1)); g.lineTo(X(0.06), Y(1.0)); g.moveTo(X(0), Y(0.95)); g.lineTo(X(0), Y(0.72)); g.stroke();
      d.line(g, 0.1); g.beginPath();                                                                       // floorboards, running to the front
      for (var f = -3; f <= 3; f += 0.3) { g.moveTo(X(f * 0.55), Y(0.02)); g.lineTo(X(f), d.Hh); }
      g.stroke();
    },
    // the corridor: one long hallway, doors down both sides and the ceiling lights running away
    "stop.cmd": function (g, d) {
      var W = d.W, Hh = d.Hh, vx = d.X(0.4), vy = d.Y(0.75), fl = d.Y(0);
      d.line(g, 0.14); g.beginPath();
      [[0, 0], [W, 0], [0, fl + (Hh - fl) * 0.6], [W, fl + (Hh - fl) * 0.6]].forEach(function (c) { g.moveTo(c[0], c[1]); g.lineTo(vx, vy); });
      g.stroke();
      for (var k = 1; k < 7; k++) {                                                                       // door frames and lights, closer to the
        var u = 1 - Math.pow(0.72, k), lx = vx * u, rx = W - (W - vx) * u, ty = vy * u, by = vy + (fl + (Hh - fl) * 0.6 - vy) * (1 - u);
        d.line(g, 0.16 * (1 - k / 9)); g.beginPath();                                                    // vanishing point they shrink
        g.moveTo(lx, ty + (by - ty) * 0.25); g.lineTo(lx, by); g.moveTo(rx, ty + (by - ty) * 0.25); g.lineTo(rx, by);
        g.stroke();
        g.fillStyle = "rgba(200,255,216," + (0.3 * (1 - k / 8)) + ")";
        var lw2 = (rx - lx) * 0.12; g.fillRect((lx + rx) / 2 - lw2 / 2, ty + 2, lw2, Math.max(2, (by - ty) * 0.012));
      }
    },
    // the subway station: tiled wall, pillars, a bench, the warning line at the platform edge
    "beckon.exe": function (g, d) {
      var X = d.X, Y = d.Y;
      d.line(g, 0.07); g.beginPath();
      for (var ty = 0.45; ty < 1.5; ty += 0.09) { g.moveTo(X(-2.4), Y(ty)); g.lineTo(X(2.4), Y(ty)); }
      for (var tx = -2.4; tx < 2.4; tx += 0.18) { g.moveTo(X(tx), Y(0.45)); g.lineTo(X(tx), Y(1.5)); }
      g.stroke();
      d.line(g, 0.18); g.beginPath(); g.moveTo(X(-2.4), Y(0.45)); g.lineTo(X(2.4), Y(0.45)); g.stroke(); // where the tiles meet the track
      d.rect(g, -0.4, 1.05, 0.4, 1.28, 0.22);                                                            // the station sign
      d.text(g, "MEGA CITY  - 4TH ST", 0, 1.165, 0.07, 0.3);
      [-1.6, 1.4].forEach(function (px) { d.rect(g, px, 0, px + 0.16, 1.55, 0.2); });                     // pillars
      d.line(g, 0.18); g.beginPath(); g.moveTo(X(1.7), Y(0.22)); g.lineTo(X(2.2), Y(0.22));              // a bench
      g.moveTo(X(1.75), Y(0)); g.lineTo(X(1.75), Y(0.22)); g.moveTo(X(2.15), Y(0)); g.lineTo(X(2.15), Y(0.22)); g.stroke();
      g.fillStyle = "rgba(57,255,122,0.4)"; g.fillRect(0, Y(0) + d.H * 0.035, d.W, d.H * 0.012);         // the warning stripe
    },
    // the jump program: two rooftops and the drop between, the city far below
    "rooftop.leap": function (g, d) {
      var X = d.X, Y = d.Y, S = -3.1;
      d.skyline(g, S, 0.04);                                                                              // the city behind, down at street level
      [[-3, -0.45], [0.6, 3]].forEach(function (b) {
        var edge = b[0] < 0 ? b[1] : b[0];
        d.line(g, 0.24); g.beginPath(); g.moveTo(X(edge), Y(0.06)); g.lineTo(X(edge), Y(S)); g.stroke();   // the tower's face, all the way down
        d.rect(g, Math.min(edge, edge + (b[0] < 0 ? -0.5 : 0)), 0, Math.max(edge, edge + (b[0] < 0 ? 0 : 0.5)), 0.06, 0.16);   // the parapet
        d.line(g, 0.08); g.beginPath();
        for (var wy = -0.2; wy > S + 0.1; wy -= 0.17) for (var wx = b[0]; wx < b[1]; wx += 0.17) {
          if (Math.abs(wx) > 2.8 || Math.abs(wx - edge) < 0.05) continue;
          g.rect(X(wx + 0.04), Y(wy), d.H * 0.065, d.H * 0.08);
        }
        g.stroke();
      });
      d.line(g, 0.1); g.beginPath();   // the water tank on Morpheus's roof
      g.rect(X(1.3), Y(0.42), d.H * 0.22, d.H * 0.3); g.moveTo(X(1.33), Y(0.12)); g.lineTo(X(1.33), Y(0)); g.moveTo(X(1.49), Y(0.12)); g.lineTo(X(1.49), Y(0));
      g.stroke();
    }
  };
  function makeSet(name, cv, X, Y, H, W, Hh) {
    var g = cv.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, Hh);
    var draw = SETS[name];
    if (!draw) return;
    var d = { X: X, Y: Y, H: H, W: W, Hh: Hh,
      line: function (c, a) { c.strokeStyle = "rgba(57,255,122," + Math.min(0.7, a * 2.4) + ")"; c.lineWidth = Math.max(1.5, H * 0.008); },
      rect: function (c, x0, y0, x1, y1, a) { this.line(c, a); c.strokeRect(X(x0), Y(y1), X(x1) - X(x0), Y(y0) - Y(y1)); },
      text: function (c, t, x, y, size, a) { c.font = Math.round(H * size) + "px VT323, monospace"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillStyle = "rgba(57,255,122," + Math.min(0.7, a * 2) + ")"; c.fillText(t, X(x), Y(y)); c.textAlign = "start"; c.textBaseline = "alphabetic"; },
      skyline: function (c, base, a) {   // a row of towers, their tops broken up by the antenna and setbacks
        var seed = 7; var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
        this.line(c, a + 0.06); c.beginPath();
        for (var x = -3; x < 3; ) {
          var w = 0.18 + rnd() * 0.25, h = 0.25 + rnd() * 0.9;
          c.moveTo(X(x), Y(base)); c.lineTo(X(x), Y(base + h)); c.lineTo(X(x + w * 0.3), Y(base + h));
          if (rnd() < 0.3) { c.lineTo(X(x + w * 0.3), Y(base + h + 0.15)); c.lineTo(X(x + w * 0.35), Y(base + h + 0.15)); c.lineTo(X(x + w * 0.35), Y(base + h)); }
          c.lineTo(X(x + w), Y(base + h)); c.lineTo(X(x + w), Y(base));
          x += w + 0.02;
        }
        c.stroke();
        c.fillStyle = "rgba(57,255,122," + Math.min(0.6, a * 3) + ")";
        for (var k = 0; k < 120; k++) c.fillRect(X(-3 + rnd() * 6), Y(base + rnd() * 0.9), H * 0.012, H * 0.016);
      }
    };
    draw(g, d);
  }

  var SCENES = [sceneFreezeKick, sceneFlurry, sceneLeap, sceneBulletTime, sceneBeckon, sceneStop];   // in the order the film has them
  var GLYPHS = "01アイウエオカキクケコサシスセソタ";

  function mount(canvas, opt) {
    opt = opt || {};
    var ctx = canvas.getContext("2d"), dpr = Math.min(1.5, window.devicePixelRatio || 1), last = performance.now();
    var flying = [], shotDone = {}, W = 0, Hh = 0, live = true, idx = opt.start || 0, scene = SCENES[idx % SCENES.length](), t0 = performance.now(), sparks = [], fired = {};
    var css = getComputedStyle(document.documentElement);
    var green = (css.getPropertyValue("--c-green") || "#39ff7a").trim() || "#39ff7a";
    var bright = (css.getPropertyValue("--c-bone") || "#c8ffd8").trim() || "#c8ffd8";
    var font = (css.getPropertyValue("--c-term") || "monospace").trim() || "monospace";
    var set = null, setFor = "", nf = 0;
    if (opt.scenery && canvas.parentNode) {   // the backdrop: a canvas under this one, the same size and place
      set = document.createElement("canvas");
      var cs = getComputedStyle(canvas);
      set.style.cssText = "position:" + (cs.position === "fixed" ? "fixed" : "absolute") + ";left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:" + cs.zIndex;
      canvas.parentNode.insertBefore(set, canvas);
    }
    function size() {
      var r = canvas.getBoundingClientRect();
      W = Math.max(10, Math.round(r.width * dpr)); Hh = Math.max(10, Math.round(r.height * dpr));
      if (canvas.width !== W || canvas.height !== Hh) { canvas.width = W; canvas.height = Hh; setFor = ""; }
      var sh = Hh + Math.round((scene.depth || 0) * Math.min(Hh * (opt.small ? 0.66 : 0.6), W / 2.9));   // a deep scene: the set goes on down
      if (set && (set.width !== W || set.height !== sh)) { set.width = W; set.height = sh; set.style.height = (sh / dpr) + "px"; setFor = ""; }
    }
    size();
    var Hb = function () { return Math.min(Hh * (opt.small ? 0.66 : 0.6), W / 2.9); };
    var camX = 0, camZ = 1;   // the camera: across, and how close (1 is the usual wide shot)
    var H = function () { return Hb() * camZ; };
    var gy = function () { return Hh * (opt.small ? 0.9 : 0.84); };
    var camY = 0;   // the camera's height: below 0 it looks down past the rooftops (the jump program)
    var X = function (x) { return W / 2 + (x - camX) * H(); }, Y = function (y) { return gy() - (y - camY) * H(); };
    var X0 = function (x) { return W / 2 + x * Hb(); }, Y0 = function (y) { return gy() - y * Hb(); };   // the set is drawn once, without the camera, and slid with it

    // the glow is a wide faint stroke under the line, not shadowBlur, which the TV can't keep up with
    function drawFig(s, colour, lw) {
      var j = turned(s);
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.shadowBlur = 0;
      ctx.beginPath();
      if (s.p.wA != null) { ctx.moveTo(X(j.wA[0]), Y(j.wA[1])); ctx.lineTo(X(j.hA[0]), Y(j.hA[1])); } else ctx.moveTo(X(j.hA[0]), Y(j.hA[1]));
      ctx.lineTo(X(j.eA[0]), Y(j.eA[1])); ctx.lineTo(X(j.sh[0]), Y(j.sh[1]));
      ctx.lineTo(X(j.eB[0]), Y(j.eB[1])); ctx.lineTo(X(j.hB[0]), Y(j.hB[1]));
      if (s.p.wB != null) ctx.lineTo(X(j.wB[0]), Y(j.wB[1]));
      ctx.moveTo(X(j.neck[0]), Y(j.neck[1])); ctx.lineTo(X(j.hip[0]), Y(j.hip[1]));
      ctx.moveTo(X(j.fA[0]), Y(j.fA[1])); ctx.lineTo(X(j.kA[0]), Y(j.kA[1])); ctx.lineTo(X(j.hip[0]), Y(j.hip[1]));
      ctx.lineTo(X(j.kB[0]), Y(j.kB[1])); ctx.lineTo(X(j.fB[0]), Y(j.fB[1]));
      var hx = X(j.head[0]), hy = Y(j.head[1]), hr = L.head * H();
      ctx.moveTo(hx + hr, hy); ctx.arc(hx, hy, hr, 0, Math.PI * 2);
      ctx.strokeStyle = colour;
      ctx.globalAlpha = 0.1; ctx.lineWidth = lw * 2.8; ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = lw; ctx.stroke();
    }
    function burst(h) {
      if (opt.onHit && !h.small) opt.onHit(!!h.big);
      var n = h.big ? 26 : h.small ? 5 : 14;
      for (var k = 0; k < n; k++) {
        var a = Math.random() * Math.PI * 2, v = (h.big ? 1.3 : 0.7) * (0.4 + Math.random());
        sparks.push({ x: h.x, y: h.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * (h.dust ? 0.3 : 1) + (h.dust ? 0.3 : 0),
          c: GLYPHS.charAt((Math.random() * GLYPHS.length) | 0), life: h.small ? 0.35 : 0.8 });
      }
    }
    function caption(t) {
      var txt = "> RUN " + scene.name, shown = Math.min(txt.length, Math.floor(t * 18));
      var fs = Math.round(Hh * (opt.small ? 0.075 : 0.032));
      ctx.shadowBlur = 0; ctx.fillStyle = green; ctx.globalAlpha = 0.8;
      ctx.font = fs + "px " + font;
      var cur = Math.floor(t * 2) % 2 ? "_" : " ";
      ctx.fillText(txt.slice(0, shown) + (shown < txt.length || t < 3 ? cur : ""), opt.small ? fs * 0.4 : W * 0.06, opt.small ? fs * 1.1 : Hh * 0.1);
      var frozen = scene.freeze && t > scene.freeze[0] && t < scene.freeze[1];
      if (frozen || (scene.slow && t > scene.slow[0] && t < scene.slow[1])) {
        ctx.globalAlpha = 0.55 + 0.3 * Math.sin(t * 5);
        var s = frozen ? "[ TIME FROZEN ]" : "[ SLOW-MO x0.02 ]";
        ctx.fillText(s, W - ctx.measureText(s).width - (opt.small ? fs * 0.4 : W * 0.06), opt.small ? fs * 1.1 : Hh * 0.1);
      }
      ctx.globalAlpha = 1;
    }
    function frame(now) {
      if (!live) return;
      var t = (now - t0) / 1000, dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));   // the same speed at 30 or 60 fps
      last = now;
      if (t > scene.len && opt.once) { live = false; if (set) set.remove(); if (opt.onDone) opt.onDone(scene.name); return; }
      if (t > scene.len) {
        idx++; scene = SCENES[idx % SCENES.length](); t0 = now; t = 0; fired = {}; sparks = []; flying = []; shotDone = {};
        ctx.clearRect(0, 0, W, Hh);
        if (opt.onScene) opt.onScene(scene.name);
      }
      camY = scene.cam ? scene.cam(t) : 0; camX = 0; camZ = 1;
      if (scene.shots3) {   // camera moves: [t, x, y, zoom], eased from one to the next
        var ck = scene.shots3, ci = 0;
        while (ci < ck.length - 2 && t > ck[ci + 1][0]) ci++;
        var ca = ck[ci], cb = ck[Math.min(ci + 1, ck.length - 1)], cu = cb[0] > ca[0] ? Math.max(0, Math.min(1, (t - ca[0]) / (cb[0] - ca[0]))) : 1;
        cu = cu * cu * (3 - 2 * cu);
        camX = ca[1] + (cb[1] - ca[1]) * cu; camY = ca[2] + (cb[2] - ca[2]) * cu; camZ = ca[3] + (cb[3] - ca[3]) * cu;
      }
      if (set) {
        if (setFor !== scene.name) { size(); setFor = scene.name; makeSet(scene.name, set, X0, Y0, Hb(), W, Hh); set.style.transform = ""; }
        if (scene.cam || scene.shots3) {   // the set slides and scales with the camera
          set.style.transformOrigin = (W / 2 / dpr) + "px " + (gy() / dpr) + "px";
          set.style.transform = "scale(" + camZ.toFixed(3) + ") translate(" + (-camX * Hb() / dpr).toFixed(1) + "px," + (camY * Hb() / dpr).toFixed(1) + "px)";
        }
        if (nf++ % 15 === 0) set.style.opacity = getComputedStyle(canvas).opacity;   // fades in and out with the fight
      }
      // afterimages: the last frames fade instead of vanishing
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0," + (opt.small ? 0.42 : 0.3) + ")";
      ctx.fillRect(0, 0, W, Hh);
      ctx.globalCompositeOperation = "source-over";
      var lw = Math.max(2, H() * 0.02);

      // the sets' moving parts: the helicopter over the rooftop, the train through the station
      if (set && scene.name === "bullet_time.exe") {
        var hx = X(1.55 + Math.sin(t * 0.4) * 0.05), hy = Y(1.32 + Math.sin(t * 0.9) * 0.03), hs = H();
        ctx.strokeStyle = "rgba(57,255,122,0.35)"; ctx.lineWidth = Math.max(1, hs * 0.006); ctx.beginPath();
        ctx.ellipse(hx, hy, hs * 0.16, hs * 0.07, 0, 0, Math.PI * 2);
        ctx.moveTo(hx + hs * 0.15, hy); ctx.lineTo(hx + hs * 0.42, hy - hs * 0.03); ctx.lineTo(hx + hs * 0.45, hy - hs * 0.09);
        ctx.moveTo(hx, hy - hs * 0.07); ctx.lineTo(hx, hy - hs * 0.1);
        var rl = hs * 0.3 * Math.abs(Math.cos(t * 26));   // the rotor, spinning
        ctx.moveTo(hx - rl, hy - hs * 0.1); ctx.lineTo(hx + rl, hy - hs * 0.1);
        ctx.moveTo(hx - hs * 0.1, hy + hs * 0.09); ctx.lineTo(hx + hs * 0.12, hy + hs * 0.09);
        ctx.stroke();
      }
      if (set && scene.name === "beckon.exe" && t > (scene.train || 8.2)) {
        var tx0 = X(3.2 - (t - (scene.train || 8.2)) * 4.2), tw = H() * 4.5, ty0 = Y(0.44), th = H() * 0.38;
        ctx.strokeStyle = "rgba(57,255,122,0.4)"; ctx.lineWidth = Math.max(1, H() * 0.007); ctx.strokeRect(tx0, ty0, tw, th);
        ctx.fillStyle = "rgba(200,255,216,0.18)";
        for (var wn = 0; wn < 14; wn++) ctx.fillRect(tx0 + tw * (0.03 + wn * 0.07), ty0 + th * 0.2, tw * 0.045, th * 0.3);
      }

      // the ground, a dotted terminal line (with a gap for the leap)
      ctx.shadowBlur = 0; ctx.fillStyle = green; ctx.globalAlpha = 0.5;
      for (var gx = 0; gx < W; gx += lw * 3) {
        var wx = (gx - W / 2) / H() + camX;
        if (scene.gap && wx > scene.gap[0] && wx < scene.gap[1]) continue;
        ctx.fillRect(gx, Y(0) + lw, lw * 1.4, lw * 0.6);
      }
      ctx.globalAlpha = 1;
      if (scene.street) {   // the street far below, which gives like rubber where he lands and springs back
        var st0 = scene.street, sd = st0.dip(t), sy = st0.y;
        ctx.strokeStyle = green; ctx.lineWidth = lw * 0.8; ctx.globalAlpha = 0.7; ctx.beginPath();
        for (var sx = -3; sx <= 3; sx += 0.04) {
          var dd = sd * Math.exp(-Math.pow((sx - st0.x) / 0.32, 2));
          if (sx <= -3) ctx.moveTo(X(sx), Y(sy - dd)); else ctx.lineTo(X(sx), Y(sy - dd));
        }
        ctx.stroke(); ctx.globalAlpha = 1;
      }

      scene.figs.forEach(function (keys, k) {
        var st = at(keys, t);
        // fighters on their feet breathe and bounce a little, so a held stance never freezes stiff
        var frozen = scene.freeze && t > scene.freeze[0] && t < scene.freeze[1];
        if (!frozen && !st.g && st.y < 0.46 && Math.abs(st.p.tx) < 45) {
          var bob = Math.sin(t * 5.2 + k * 2.1);
          st.y -= 0.006 * (1 + bob); st.p.lA += 2.5 * bob; st.p.lB -= 2.5 * bob; st.p.sA -= 4 * bob; st.p.sB += 2 * bob;
          st.p.aA += 2 * bob; st.p.aB -= 2 * bob;
        }
        drawFig(st, k ? green : bright, lw);
      });

      // bullets, with the rings of air they push in slow motion
      scene.bullets.forEach(function (b) {
        if (t < b.t0) return;
        var dt = t - b.t0, x, y = b.y, spin = 0;
        if (b.stop != null) x = b.stop + (b.x0 - b.stop) * Math.exp(-1.7 * dt);
        else x = b.x0 + b.vx * dt;
        if (b.fast && t > b.fast) x = b.x0 + b.vx * (b.fast - b.t0) + b.vx * 14 * (t - b.fast);   // time comes back
        if (b.pick && t > b.pick[0] - 0.3) {   // taken out of the air between finger and thumb, looked at, let go
          var hj = turned(at(scene.figs[0], Math.min(t, b.pick[1]))), hb = hj.hB;
          var w = Math.min(1, (t - b.pick[0] + 0.3) / 0.3);
          x = x + (hb[0] + 0.012 - x) * w; y = y + (hb[1] - y) * w; spin = w * -1.2;
          if (t > b.pick[1]) { var fd = t - b.pick[1]; y = Math.max(0.015, hb[1] - 2.4 * fd * fd); spin = -1.2 + fd * 3; }
        }
        if (b.drop && t > b.drop && !b.pick) { var dd = t - b.drop; y = Math.max(0.015, b.y - 2.4 * dd * dd); spin = Math.min(1, dd * 2) * 1.4; }
        if (x < -1.7) return;
        ctx.save(); ctx.translate(X(x), Y(y)); ctx.rotate(spin);
        ctx.strokeStyle = bright; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.moveTo(-H() * 0.028, 0); ctx.lineTo(H() * 0.028, 0);
        ctx.globalAlpha = 0.15; ctx.lineWidth = lw * 3; ctx.stroke(); ctx.globalAlpha = 0.75; ctx.lineWidth = lw * 0.9; ctx.stroke(); ctx.globalAlpha = 1;
        ctx.restore();
        var still = b.stop != null && dt > 1.6 && !(b.drop && t > b.drop) && !(b.pick && t > b.pick[0] - 0.3);
        if (b.rings || still) {
          ctx.strokeStyle = green; ctx.lineWidth = Math.max(1, lw * 0.35); ctx.shadowBlur = 0;
          for (var r = 1; r <= 3; r++) {
            var ph = ((t * 1.2 + r / 3) % 1);
            ctx.globalAlpha = (1 - ph) * 0.6;
            ctx.beginPath();
            var rx = b.rings ? X(x + 0.06 * r) : X(x), rr = H() * (b.rings ? 0.02 + 0.012 * r : 0.02 + ph * 0.05);
            ctx.ellipse(rx, Y(y), rr * (b.rings ? 0.45 : 1), rr, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      });

      // gunfire: from the gun hand, along the forearm, with a muzzle flash
      (scene.shots || []).forEach(function (sh, k) {
        if (shotDone[k] || t < sh.t) return;
        shotDone[k] = 1;
        var st = at(scene.figs[sh.fig], t), j = turned(st), useB = st.p.aB > 80 && k % 2;
        var hand = useB ? j.hB : j.hA, elb = useB ? j.eB : j.eA;
        var dx = hand[0] - elb[0], dy = hand[1] - elb[1], n = Math.sqrt(dx * dx + dy * dy) || 1;
        var spread = sh.fig ? (Math.random() - 0.5) * 0.35 : 0;
        dx = dx / n; dy = dy / n + spread;
        flying.push({ x: hand[0], y: hand[1], vx: dx, vy: dy, born: t });
        sparks.push({ x: hand[0] + dx * 0.03, y: hand[1] + dy * 0.03, vx: 0, vy: 0, c: "*", life: 0.12 });
        if (opt.onHit && !sh.fig) opt.onHit(false);
      });
      var slowNow = scene.slow && t > scene.slow[0] && t < scene.slow[1];
      ctx.strokeStyle = bright; ctx.shadowBlur = 0; ctx.lineWidth = lw * 0.7;
      flying = flying.filter(function (b) {
        var v = (slowNow ? 0.9 : 3.2) * dt;
        b.x += b.vx * v; b.y += b.vy * v;
        if (b.x < -2 || b.x > 2 || b.y < 0 || b.y > 1.6) return false;
        ctx.beginPath(); ctx.moveTo(X(b.x), Y(b.y)); ctx.lineTo(X(b.x - b.vx * 0.07), Y(b.y - b.vy * 0.07)); ctx.stroke();
        return true;
      });

      // time stops: the figure just hangs in the air (the caption says so)
      // the wall someone is about to meet
      if (scene.wall) {
        ctx.fillStyle = green; ctx.globalAlpha = 0.45; ctx.shadowBlur = 0;
        [].concat(scene.wall).forEach(function (wx2) { for (var wy = 0; wy < 1.4; wy += 0.04) ctx.fillRect(X(wx2), Y(wy), lw * 0.6, lw * 1.4); });
        ctx.globalAlpha = 1;
      }

      // hits throw sparks of code
      scene.hits.forEach(function (h, k) { if (!fired[k] && t >= h.t) { fired[k] = 1; burst(h); } });
      var fs = Math.round(H() * 0.06);
      ctx.font = fs + "px " + font; ctx.fillStyle = bright; ctx.shadowBlur = 0;
      sparks = sparks.filter(function (s) {
        s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy -= 1.2 * dt;
        if (s.life <= 0) return false;
        ctx.globalAlpha = Math.min(0.7, s.life * 1.4);
        ctx.fillText(s.c, X(s.x), Y(s.y));
        return true;
      });
      ctx.globalAlpha = 1;
      caption(t);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    var onResize = function () { size(); };
    window.addEventListener("resize", onResize);
    return { stop: function () { live = false; window.removeEventListener("resize", onResize); ctx.clearRect(0, 0, W, Hh); if (set) set.remove(); } };
  }

  // the pieces the finale (final.js) builds its own film from
  var kit = { P: P, POSE: POSE, at: at, turned: turned, groundY: groundY, gait: gait, L: L };
  window.cryptFight = { mount: mount, kit: kit, scenes: SCENES.length, names: function () { return SCENES.map(function (f) { return f().name; }); } };
})();
