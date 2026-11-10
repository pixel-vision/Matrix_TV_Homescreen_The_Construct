// The finale (the operator console's "final.prg"): the last fight of the trilogy as a short film in
// the Crypt look. A street in a storm, an army of identical agents watching, a fast fight on the
// ground, a climb up through the clouds and two clashes in the sky, the hammer blow and the fall
// back to earth, the crater, the beating and the getting up again, and the copy. It ends in light:
// the copy breaks open, every agent shatters, the rain stops, dawn.
//
// You fight it: an arrow flashes up on some of the blows (hit it to land yours or block his), you
// charge into the clashes in the sky (→), you tap OK to make him get up each time he's put down,
// and at the end you press OK to let the agent in. Miss and the agent gets through; the story
// still ends the same way. With no one pressing anything it plays itself out.
//
//   var f = window.cryptFinal.mount(canvas, { env: true, say: fn, onDone: fn });   // interactive: false to just watch
//   f.key(k);   // every key the remote sends while it runs (Back is the caller's: stop it)
//   f.stop();
//
// Drawn with the stick-figure pieces from fight.js (cryptFight.kit) on one canvas (the world, with
// afterimage trails) and a second one over it (flashes, light, titles, letterbox bars: cleared every
// frame). A moving camera, slow motion on the big hits, lightning, clouds, shockwaves, a crater.
// Nothing here touches the network.
(function () {
  "use strict";
  var K = null;

  // ---------- poses this film needs on top of fight.js's (torso, arms, legs; degrees) ----------
  function poses() {
    var P = K.P;
    return {
      hover: P(-5, 50, 150, 30, 160, 25, -10, -10, -32),
      rise: P(0, 175, 178, 170, 176, 2, 0, -4, -8),           // flying straight up, arms overhead
      fly: P(0, 165, 172, 160, 168, 4, 0, -4, 0),
      punchAir: P(6, 96, 94, 30, 160, 20, -5, -15, -26),
      hammer: P(-14, 176, 182, 172, 180, 22, 0, -20, -12),
      hammerDown: P(42, 120, 92, 118, 90, 20, 0, -20, -12),
      fallHit: P(-62, -160, -170, -138, -150, 40, 20, 10, -22),
      hook: P(20, 60, 120, 30, 150, 25, 8, -28, -20),
      upper: P(-10, 150, 172, 20, 160, 25, 10, -25, -18),
      launched: P(-45, -70, -100, -40, -80, 25, 0, -15, -35),
      faceDown: P(88, 150, 170, 120, 150, -88, -90, -84, -92),
      pushUp: P(66, 4, 0, 10, 6, -76, -86, -70, -86),
      allFours: P(78, 2, 0, 8, 4, 8, -88, -4, -90),
      kneel: P(16, 30, 70, -20, -10, 85, 0, 10, -92),
      slump: P(38, 8, 2, -6, -4, 85, 0, 10, -92),           // on one knee, head down, arms hanging
      wobble: P(-8, 20, 30, -25, -20, 10, 4, -12, -6),
      surrender: P(0, 24, 18, -24, -18, 4, 2, -4, -2),
      reach: P(10, 84, 90, -15, -10, 15, 5, -15, -8),
      stomp: P(-10, 40, 120, -30, -60, 70, 40, -15, -10),
      cross: P(0, 90, 90, -90, -90, 3, 1, -3, -1)            // arms straight out: carried away in the light
    };
  }
  // a walk: like fight.js's run, smaller and slower
  function walkPose(ph) {
    var s = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
    var leg = function (v, q) { var th = 4 + 20 * v, bend = 6 + 30 * Math.max(0, Math.cos(q + 1.2)); return [th, th - bend]; };
    var A = leg(s, ph), B = leg(s2, ph + Math.PI);
    return K.P(4, 6 - 16 * s, 16 - 10 * s, 6 - 16 * s2, 16 - 10 * s2, A[0], A[1], B[0], B[1]);
  }
  function walk(keys, t0, t1, x0, x1, f) {
    var n = Math.max(4, Math.round((t1 - t0) / 0.08)), T = 1.05;
    for (var k = 0; k <= n; k++) {
      var t = t0 + (t1 - t0) * k / n;
      keys.push({ t: t, p: walkPose(2 * Math.PI * (t - t0) / T), x: x0 + (x1 - x0) * k / n, f: f });
    }
  }
  function sortKeys(keys) { keys.sort(function (a, b) { return a.t - b.t; }); return keys; }

  // ---------- the script (seconds of film time; slow motion stretches it on screen) ----------
  var SKY = 4.6;   // how high they fight: well above the clouds
  function script(play) {
    var Q = poses(), N = [], S = [], hits = [], slow = [], say = [], bolts = [], shaky = [];
    var qte = [], taps = [], hold = null;   // the interactive version: prompts, get-up sections, and the choice
    var key = function (arr, t, p, x, extra) { var o = { t: t, p: p, x: x }; for (var k in extra || {}) o[k] = extra[k]; arr.push(o); };
    var nk = function (t, p, x, e) { key(N, t, p, x, e); }, sk = function (t, p, x, e) { e = e || {}; e.f = -1; key(S, t, p, x, e); };

    // the setup: an empty, wrecked street in the rain. The agent waits alone in the middle of it; the
    // copies of him watch from both sides. He has the Oracle's sight now. Neo walks in.
    sk(0, "stand", 0.45); sk(14.5, "stand", 0.45);
    walk(N, 3.0, 9.2, -1.9, -0.75, 1);
    nk(9.5, "stand", -0.75); nk(14.5, "stand", -0.75); nk(15.6, "guard", -0.7); nk(17.8, "guard", -0.32);
    sk(15.6, "guard", 0.42); sk(17.8, "guard", 0.32);
    say.push([0.6, "run final.prg"], [3.2, "smith.exe ... instances: 1,000,000+"], [6.4, "smith.exe ... oracle.dll loaded ... foresight: online"],
      [10.0, "smith: mr. anderson. welcome back."], [13.0, "smith: i've seen how this ends. with you on the ground."]);
    bolts.push(2.2, 7.8, 12.6);

    // the exchange: fast, a blur of blows; two land hard (and only those slow down)
    var nb = -0.32, sb = 0.32, t = 18.2;
    for (var k = 0; k < 18; k++) {
      var neoHits = k % 2 === 0, big = k === 8 || k === 17;
      var A = neoHits ? N : S, D = neoHits ? S : N, ab = neoHits ? nb : sb, db = neoHits ? sb : nb, dir = neoHits ? 1 : -1, af = neoHits ? 1 : -1;
      key(A, t, "guard", ab, { f: af }); key(A, t + 0.11, ["jab", "cross", "jab", Q.hook][k % 4], ab + dir * 0.05, { f: af }); key(A, t + 0.3, "guard", ab, { f: af });
      key(D, t, "guard", db, { f: -af });
      if (play && !big && [1, 2, 4, 5, 7, 10, 12, 14, 15].indexOf(k) >= 0) {
        // your call: on Neo's blows, hit the arrow to land it; on the agent's, hit it to block
        (function (D, db, dir, af, t, neoHits) {
          qte.push({ t: t - 0.12, key: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"][(Math.random() * 4) | 0], label: neoHits ? "STRIKE" : "BLOCK",
            done: function (ok) {
              var landed = neoHits ? ok : !ok;   // a hit lands on whoever is being hit
              key(D, t + 0.13, landed ? "hit" : (dir > 0 ? "blockA" : "blockB"), db + dir * (landed ? 0.09 : 0.02), { f: -af });
              key(D, t + 0.5, "guard", db, { f: -af });
              D.sort(function (a, b) { return a.t - b.t; });
              hits.push({ t: t + 0.11, x: dir * 0.04, y: 0.66, big: landed, small: !landed, live: true });
              return neoHits ? (ok ? "HIT" : "BLOCKED") : (ok ? "BLOCKED" : "TAKEN");
            } });
        })(D, db, dir, af, t, neoHits);
      } else {
        key(D, t + 0.13, big ? "hit" : (k % 2 ? "blockA" : "blockB"), db + dir * (big ? 0.12 : 0.02), { f: -af });
        key(D, t + (big ? 0.7 : 0.36), "guard", db, { f: -af });
        hits.push({ t: t + 0.11, x: dir * 0.04, y: 0.66, big: big, small: !big });
      }
      if (big) { slow.push([t + 0.07, t + 0.45, 0.25]); t += 0.55; }
      t += 0.48 - Math.min(0.12, k * 0.008);
    }
    bolts.push(21.5, 25.5);
    // the blow that puts him through the wall
    var wl = t + 0.2;
    sk(wl, "guard", sb); sk(wl + 0.25, "crouch", 0.1); sk(wl + 0.45, "cross", -0.05); sk(wl + 1.2, "guard", 0.0);
    nk(wl, "guard", nb); nk(wl + 0.5, "hit", -0.4, { y: 0.5 }); nk(wl + 0.85, "hit", -1.22, { y: 0.45, r: 20 });
    nk(wl + 1.3, "lying", -1.5, { y: 0.03 }); nk(wl + 2.2, "lying", -1.5); nk(wl + 2.9, "crouch", -1.45);
    hits.push({ t: wl + 0.47, x: -0.25, y: 0.66, big: true }, { t: wl + 0.85, x: -1.25, y: 0.5, big: true, wall: true });
    slow.push([wl + 0.42, wl + 1.0, 0.3]);
    say.push([wl + 1.8, "!! structural failure ... sector 9"]);
    var wall = { x: -1.25, t: wl + 0.85 };
    // up into the sky: he launches out of the rubble, the agent after him
    var up = wl + 3.2;
    nk(up, "crouch", -1.45); sk(up, "crouch", 0.0);
    nk(up + 0.4, Q.rise, -1.2, { y: 1.2 }); sk(up + 0.4, Q.rise, 0.2, { y: 1.2 });
    nk(up + 2.2, Q.rise, -0.8, { y: SKY - 0.2 }); sk(up + 2.3, Q.rise, 0.8, { y: SKY - 0.1 });
    nk(up + 2.9, Q.hover, -0.85, { y: SKY }); sk(up + 3.0, Q.hover, 0.85, { y: SKY + 0.05 });
    var c1 = up + 4.2, c2 = c1 + 3.4;
    nk(c1 - 1.0, Q.hover, -0.85, { y: SKY }); sk(c1 - 1.0, Q.hover, 0.85, { y: SKY + 0.05 });
    nk(c1 - 0.1, Q.fly, -0.1, { y: SKY + 0.05, r: 78 }); nk(c1, Q.punchAir, -0.07, { y: SKY + 0.05, r: 25 });
    sk(c1 - 0.1, Q.fly, 0.1, { y: SKY + 0.05, r: 78 }); sk(c1, Q.punchAir, 0.07, { y: SKY + 0.05, r: 25 });
    var after1 = [{ t: c1 + 1.4, p: Q.hover, x: -0.9, y: SKY - 0.05, r: 0 }, { t: c1 + 1.4, p: Q.hover, x: 0.9, y: SKY, r: 0, f: -1 }];
    N.push(after1[0]); S.push(after1[1]);
    nk(c2 - 1.0, Q.hover, -0.9, { y: SKY }); sk(c2 - 1.0, Q.hover, 0.9, { y: SKY });
    nk(c2 - 0.1, Q.fly, -0.1, { y: SKY, r: 78 }); nk(c2, Q.punchAir, -0.07, { y: SKY, r: 22 });
    sk(c2 - 0.1, Q.fly, 0.1, { y: SKY + 0.02, r: 78 }); sk(c2, Q.punchAir, 0.07, { y: SKY + 0.02, r: 22 });
    hits.push({ t: c1, x: 0, y: SKY + 0.2, big: true, air: true }, { t: c2, x: 0, y: SKY + 0.17, big: true, air: true, huge: true });
    if (play) [c1, c2].forEach(function (c, i) {
      qte.push({ t: c - 0.55, key: "ArrowRight", label: "CHARGE", wide: true, done: function (ok) {
        if (i === 0) { after1[0].x = ok ? -0.7 : -1.15; after1[1].x = ok ? 1.15 : 0.75; }
        return ok ? "YOU HIT HARDER" : "HE HIT HARDER";
      } });
    });
    slow.push([c1 - 0.05, c1 + 0.7, 0.25], [c2 - 0.05, c2 + 0.9, 0.2]);
    bolts.push(c1, c2, c1 + 1.8);
    // a quick trade in the air, then he's above, and the hammer
    var tr = c2 + 0.9;
    nk(tr, Q.hover, -0.2, { y: SKY - 0.05 }); sk(tr, Q.hover, 0.2, { y: SKY });
    for (var a = 0; a < 4; a++) {
      var at = tr + 0.2 + a * 0.3;
      if (a % 2) { sk(at, Q.punchAir, 0.12, { y: SKY }); nk(at + 0.05, "hit", -0.24, { y: SKY - 0.05 }); }
      else { nk(at, Q.punchAir, -0.12, { y: SKY - 0.05 }); sk(at + 0.05, "hit", 0.24, { y: SKY }); }
      hits.push({ t: at + 0.04, x: 0, y: SKY + 0.25, small: true });
    }
    var hm = tr + 1.6;
    nk(hm, Q.hover, -0.12, { y: SKY - 0.1 }); nk(hm + 0.9, Q.hover, -0.1, { y: SKY - 0.1 });
    sk(hm, Q.hover, 0.05, { y: SKY + 0.5 }); sk(hm + 0.5, Q.hammer, 0.0, { y: SKY + 0.75 }); sk(hm + 0.9, Q.hammer, -0.02, { y: SKY + 0.65 });
    var hit = hm + 1.05;
    sk(hit, Q.hammerDown, -0.05, { y: SKY + 0.35 }); sk(hit + 1.0, Q.hover, 0.2, { y: SKY + 0.4 });
    hits.push({ t: hit, x: -0.08, y: SKY + 0.1, big: true, air: true });
    // the fall: straight down from the sky, fast, into the street
    var land = hit + 0.75;
    nk(hit + 0.02, Q.fallHit, -0.08, { y: SKY - 0.2 }); nk(land, "lying", 0.02, { y: 0.02, r: 0 });
    hits.push({ t: land, x: 0.02, y: 0.05, big: true, mega: true, crater: true });
    slow.push([land - 0.04, land + 1.1, 0.22]);
    bolts.push(land, land + 0.4);
    say.push([land + 0.5, "neo.exe ... signal critical"]);
    sk(land + 1.4, Q.hover, 0.4, { y: 1.6 }); sk(land + 3.0, "land", 0.6); sk(land + 3.8, "stand", 0.6);

    // the beating. he gets up; he is put down; he gets up.
    var b = land + 3.2;
    nk(b - 1.5, "lying", 0.02); nk(b, "lying", 0.02);
    nk(b + 0.9, Q.faceDown, 0.0); nk(b + 1.8, Q.pushUp, 0.0); nk(b + 2.3, Q.faceDown, 0.0);
    nk(b + 3.3, Q.pushUp, 0.0); nk(b + 4.2, Q.allFours, 0.02); nk(b + 5.2, Q.slump, 0.04); nk(b + 6.4, Q.wobble, 0.06);
    shaky.push([b + 0.9, b + 7.6, 1]);
    sk(b + 0.6, "stand", 0.6); walk(S, b + 1.0, b + 6.2, 0.6, 0.34, -1); sk(b + 6.5, "guard", 0.32);
    say.push([b + 1.2, "smith: why, mr. anderson? why do you keep getting up?"], [b + 4.6, "smith: freedom? truth? peace? illusions, all of them."]);
    var cmb = b + 6.9;
    nk(cmb - 0.2, Q.wobble, 0.06);
    [["jab", 0.27], ["cross", 0.25], [Q.hook, 0.26], [Q.upper, 0.28]].forEach(function (m, i) {
      var at = cmb + i * 0.3;
      sk(at, m[0], m[1]); sk(at + 0.18, "guard", 0.32);
      if (i < 3) { nk(at + 0.04, "hit", 0.0 - i * 0.03); nk(at + 0.2, Q.wobble, -0.02 - i * 0.03); }
      hits.push({ t: at + 0.04, x: 0.15, y: i === 3 ? 0.55 : 0.68, big: i === 3, small: i < 3 });
    });
    var upc = cmb + 0.9;
    nk(upc + 0.04, Q.launched, -0.1, { y: 0.6 }); nk(upc + 0.9, "lying", -0.65, { y: 0.03, arc: 0.45 });
    slow.push([upc - 0.02, upc + 0.6, 0.3]);
    shaky.push([upc + 1.2, upc + 6.2, 1.4]);
    var g = upc + 1.4;
    nk(g + 0.6, "lying", -0.65); nk(g + 1.4, Q.faceDown, -0.66); nk(g + 2.4, Q.pushUp, -0.66); nk(g + 2.8, Q.faceDown, -0.66);
    nk(g + 3.8, Q.allFours, -0.64); nk(g + 4.8, Q.slump, -0.62);
    sk(g, "guard", 0.32); walk(S, g + 0.5, g + 4.4, 0.32, -0.32, -1); sk(g + 4.7, "guard", -0.34);
    say.push([g + 1.0, "smith: love? a human invention. as empty as the rest."]);
    var kk = g + 5.2;
    sk(kk - 0.2, "guard", -0.34); sk(kk, "kick", -0.36); sk(kk + 0.6, "stand", -0.34);
    nk(kk + 0.04, "hit", -0.66, { y: 0.48 }); nk(kk + 0.8, "lying", -1.0, { y: 0.03, arc: 0.25 });
    hits.push({ t: kk + 0.03, x: -0.52, y: 0.5, big: true });
    slow.push([kk - 0.02, kk + 0.5, 0.3]);
    say.push([kk + 1.3, "smith: why, mr. anderson? why? why do you persist?"]);
    var s2 = kk + 2.0;
    nk(s2, "lying", -1.0); nk(s2 + 1.2, Q.faceDown, -1.0); nk(s2 + 2.4, Q.pushUp, -1.0); nk(s2 + 3.5, Q.allFours, -0.98);
    nk(s2 + 4.7, Q.slump, -0.96); nk(s2 + 6.2, Q.wobble, -0.94); nk(s2 + 7.2, "stand", -0.94);
    shaky.push([s2 + 1.2, s2 + 7.6, 1.2]);
    sk(s2, "stand", -0.34); sk(s2 + 6.8, "stand", -0.34);
    say.push([s2 + 7.4, "because i choose to."]);
    // one more, then the agent sees it: his foresight fails at this very moment
    var last = s2 + 8.6;
    walk(S, last - 1.3, last - 0.25, -0.34, -0.62, -1); sk(last - 0.15, "guard", -0.63); sk(last, "cross", -0.68); sk(last + 0.5, "stand", -0.64);
    nk(last + 0.04, "hit", -1.02); nk(last + 0.7, Q.slump, -1.08); nk(last + 2.4, Q.slump, -1.08); nk(last + 3.6, "stand", -1.06);
    nk(last + 4.4, Q.surrender, -1.05);
    hits.push({ t: last + 0.03, x: -0.87, y: 0.68, big: true });
    slow.push([last - 0.02, last + 0.6, 0.3]);
    shaky.push([last + 2.4, last + 4.2, 0.8]);
    say.push([last + 1.4, "smith.exe ... foresight: ERR ... nothing past this moment"], [last + 4.6, "smith: wait ... i've stood here before. this is where it ends."],
      [last + 7.8, "smith: everything that has a beginning has an end, neo."]);
    var cp = last + 10.0;   // the copy
    sk(last + 4.3, "stand", -0.64); sk(last + 8.6, "stand", -0.64);
    walk(S, last + 8.7, cp - 0.3, -0.64, -0.77, -1);
    sk(cp - 0.1, Q.reach, -0.77);
    say.push([cp + 0.1, "smith.exe ... copying into neo.exe"]);
    hits.push({ t: cp, x: -0.98, y: 0.62, big: true, touch: true }, { t: cp + 1.0, x: -0.98, y: 0.62, small: true, beat: true },
      { t: cp + 1.9, x: -0.98, y: 0.62, small: true, beat: true });   // the hand goes in, then his heart, twice
    slow.push([cp - 0.12, cp + 0.9, 0.2]);
    var E = cp + 2.8;   // the copy is complete: now it runs through every copy of him, with Neo's face
    var PU = E + 5.8;   // and then the Source answers: the purge
    say.push([E + 0.6, "smith.exe ... all instances: neo.exe"], [E + 4.2, "smith: is it over?"], [PU, "machine city ... hardline open ... source: purge smith.exe"]);
    // the light: gold, from the Source, through him, into every one of them
    var burst = PU + 4.5;
    nk(burst, Q.surrender, -1.05); nk(burst + 1.2, "lying", -1.05, { y: 0.05 });
    sk(burst, Q.reach, -0.77); sk(burst + 40, Q.reach, -0.77);
    // and his body is lifted into the light, arms out, and carried away
    var lift = burst + 5.5;
    nk(lift, "lying", -1.05, { y: 0.05 }); nk(lift + 1.5, Q.cross, -1.05, { y: 0.3, r: -88 }); nk(lift + 6, Q.cross, -1.05, { y: 1.6, r: -90 });
    nk(lift + 40, Q.cross, -1.05, { y: 1.6, r: -90 });
    say.push([burst + 0.4, "deleting all instances ..."], [lift + 0.5, "neo.exe ... carried home"], [lift + 6.5, "source reloaded ... it's over."]);
    bolts.push(E + 0.4, b + 3, g + 2, s2 + 3, last + 6);
    if (play) {
      // getting up is up to you: the film holds while he's down, and each OK gets him a little further
      taps.push([b + 0.7, b + 6.4], [g + 1.0, g + 4.8], [s2 + 0.8, s2 + 7.2]);
      hold = { t: last + 4.3, label: "PRESS OK TO LET HIM IN" };   // and in the end, the choice is yours
    }
    return { qte: qte, taps: taps, hold: hold,
      N: sortKeys(N), S: sortKeys(S), hits: hits, slow: slow, say: say, bolts: bolts, shaky: shaky, wall: wall,
      copy: [cp, E], purge: PU, burst: burst, lift: lift, end: lift + 15, fall: [hit, land], up: up,
      beats: { wl: wl, b: b, upc: upc, kk: kk, s2: s2, last: last } };
  }

  // the camera: [film time, x, y, zoom]. Built from the script's own times, so it follows the action.
  function camera(sc) {
    var B = sc.beats, up = sc.up, E = sc.copy[1], f = sc.fall, L = sc.lift;
    return [
      [0, 0.2, 0.75, 0.62], [3, 0.0, 0.62, 0.72], [9.5, -0.15, 0.55, 0.9], [12.5, 0.35, 0.6, 1.4], [14.0, 0.0, 0.55, 1.0], [17.8, 0, 0.55, 1.18],
      [B.wl, 0, 0.58, 1.2], [B.wl + 0.9, -0.85, 0.55, 1.05], [B.wl + 2.6, -1.1, 0.55, 1.15],
      [up + 0.5, -0.5, 1.2, 0.95], [up + 2.4, 0, SKY - 0.1, 0.9], [up + 3.2, 0, SKY, 1.0],
      [f[0] - 3.5, 0, SKY + 0.02, 1.08], [f[0] - 1.6, 0, SKY + 0.1, 1.0], [f[0] - 0.6, 0, SKY + 0.35, 0.92], [f[0], 0, SKY + 0.2, 0.95],
      [f[1] + 0.15, 0, 0.55, 0.95], [f[1] + 1.3, 0, 0.45, 0.8], [f[1] + 3.0, 0.2, 0.5, 1.0],
      [B.b + 2, 0.05, 0.55, 1.3], [B.b + 6.0, 0.12, 0.55, 1.25], [B.upc, 0.12, 0.55, 1.15], [B.upc + 1.4, -0.35, 0.5, 1.1],
      [B.kk - 1.5, -0.5, 0.52, 1.3], [B.kk + 1.0, -0.75, 0.48, 1.15], [B.s2 + 3, -0.95, 0.5, 1.4], [B.s2 + 7.4, -0.85, 0.55, 1.3],
      [B.last + 1.0, -0.85, 0.5, 1.15], [B.last + 4.6, -0.75, 0.62, 1.45], [B.last + 8.4, -0.85, 0.6, 1.35],
      [sc.copy[0] - 0.6, -0.9, 0.62, 1.55], [sc.copy[0] + 0.05, -0.97, 0.66, 2.5], [sc.copy[0] + 1.6, -0.99, 0.64, 2.7],   // the hand, the chest
      [E - 0.3, -0.98, 0.55, 2.2],
      [E + 0.5, -1.7, 0.42, 1.65], [E + 1.4, -2.05, 0.4, 1.75],            // along the left: they're turning
      [E + 2.0, 0.3, 0.42, 1.55], [E + 3.4, 1.85, 0.4, 1.7],               // whip across to the right as it reaches them
      [E + 4.6, -0.3, 0.6, 0.55], [E + 5.4, -0.4, 0.6, 0.55],               // pull back: all of them, his face
      [sc.purge, -0.92, 0.6, 1.25], [sc.purge + 3.5, -0.92, 0.58, 1.4], [sc.burst + 2.5, -0.7, 0.55, 0.8], [L, -0.9, 0.55, 1.0],
      [L + 6, -0.95, 1.1, 0.95], [L + 15, -0.8, 1.0, 0.85]];
  }
  function camAt(list, t) {
    var i = 0;
    while (i < list.length - 1 && list[i + 1][0] <= t) i++;
    var a = list[i], b = list[Math.min(i + 1, list.length - 1)];
    var u = b[0] > a[0] ? Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0]))) : 1;
    u = u * u * (3 - 2 * u);
    return { x: a[1] + (b[1] - a[1]) * u, y: a[2] + (b[2] - a[2]) * u, z: a[3] + (b[3] - a[3]) * u };
  }

  function mount(canvas, opt) {
    opt = opt || {};
    K = window.cryptFight && window.cryptFight.kit;
    if (!K) return { stop: function () {}, time: function () { return 0; } };
    var env = opt.env !== false;
    var play = opt.interactive !== false;   // you fight it (pass interactive: false to just watch)
    var sc = script(play), cams = camera(sc);
    // the interactive version's state: the prompt on screen, the result, the taps banked, the choice
    var prompt = null, result = null, bank = 0, lastTap = 0, holding = false, gateIdle = 0;
    var ctx = canvas.getContext("2d"), dpr = Math.min(1.5, window.devicePixelRatio || 1);
    var W = 0, Hh = 0, live = true, st = 0, last = performance.now(), cam = camAt(cams, 0), shake = 0, flash = 0, flashCol = "220,235,225";
    var css = getComputedStyle(document.documentElement);
    var green = (css.getPropertyValue("--c-green") || "").trim() || "#39ff7a";
    var bone = (css.getPropertyValue("--c-bone") || "").trim() || "#c8ffd8";
    var font = (css.getPropertyValue("--c-term") || "").trim() || "monospace";
    var GLY = "01アイウエオカキクケコサシスセソタ";
    var ov = document.createElement("canvas");   // the overlay, laid exactly over the film
    ov.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none";
    if (canvas.parentNode) canvas.parentNode.insertBefore(ov, canvas.nextSibling);
    var octx = ov.getContext("2d");
    function size() {
      var r = canvas.getBoundingClientRect();
      W = Math.max(10, Math.round(r.width * dpr)); Hh = Math.max(10, Math.round(r.height * dpr));
      if (canvas.width !== W || canvas.height !== Hh) { canvas.width = W; canvas.height = Hh; }
      if (ov.width !== W || ov.height !== Hh) { ov.width = W; ov.height = Hh; }
    }
    size();
    var U = function () { return Math.min(Hh * 0.5, W / 3.4); };
    var depth = 1;   // 1: the street; under 1: further back, so it moves less as the camera moves
    var Z = function () { return U() * (1 + (cam.z - 1) * depth); };
    var X = function (x) { return W / 2 + (x - cam.x * depth) * Z(); };
    var Y = function (y) { return Hh * 0.6 - (y - cam.y * depth - 0.45 * (1 - depth)) * Z(); };

    // ---------- the world ----------
    var crater = { at: -1, x: 0.02, w: 0.48, d: 0.17 };
    function craterAt(x) {
      if (crater.at < 0 || st < crater.at) return 0;
      var grow = Math.min(1, (st - crater.at) / 0.12), q = (x - crater.x) / crater.w;
      return crater.d * grow * Math.exp(-q * q * 2.2);
    }
    var crowd = [];
    [-1, 1].forEach(function (side) {
      for (var row = 0; row < 3; row++) for (var i = 0; i < 9; i++) {
        crowd.push({ x: side * (1.0 + i * 0.15 + row * 0.06 + (row % 2) * 0.05), row: row, s: 0.5 - row * 0.1, f: -side, side: side,
          sway: Math.random() * 6.3, gone: -1, delay: Math.random() });
      }
    });
    var drops = [];
    for (var d = 0; d < 260; d++) drops.push({ x: Math.random() * 1.2, y: Math.random(), v: 0.9 + Math.random() * 0.8, l: 0.02 + Math.random() * 0.03, px: 0 });
    var clouds = [];   // three layers of storm cloud between the street and the sky fight
    for (var cl = 0; cl < 3; cl++) for (var ci = 0; ci < 9; ci++)
      clouds.push({ y: 1.9 + cl * 0.75 + Math.random() * 0.2, x: -2.4 + ci * 0.6 + Math.random() * 0.3, rx: 0.35 + Math.random() * 0.3, ry: 0.08 + Math.random() * 0.06 });
    // the wrecked street: a skyline of broken buildings behind the crowd (further back, so it moves
    // less), and the wall he goes through
    var towers = [];
    for (var tw = -5; tw < 5; tw += 0.35 + Math.random() * 0.25) {
      var th = 0.35 + Math.random() * 0.7, cut = [];
      for (var cq = 0; cq < 5; cq++) cut.push(Math.random() * 0.25);   // the broken top edge
      var win = [];
      for (var wy = 0.08; wy < th - 0.12; wy += 0.09) for (var wx = 0.05; wx < 0.26; wx += 0.07) if (Math.random() < 0.35) win.push([wx, wy]);
      towers.push({ x: tw, w: 0.28 + Math.random() * 0.12, h: th, cut: cut, win: win });
    }
    var chunks = [];
    var GOLD = "255,205,110";
    var rings = [], sparks = [], bolt = null, fired = {}, said = {}, bolted = {}, sub = null, glow = null, beam = null, blowAt = -1;
    var stormOn = 1;   // 1: raining; falls to 0 at dawn
    var abber = 0;

    // how fast the film runs for you: slow while a prompt waits, held while he's down until you tap
    function gate(dt, now) {
      if (!play) return 1;
      if (prompt) {
        if (now - prompt.at > prompt.win) resolve(false, now);
        return 0.22;
      }
      if (!prompt) {
        var q = null;
        for (var i = 0; i < sc.qte.length; i++) if (!sc.qte[i].shown && st >= sc.qte[i].t) { q = sc.qte[i]; break; }
        if (q) { q.shown = true; prompt = { q: q, at: now, win: q.wide ? 1600 : 1150 }; return 0.22; }
      }
      if (sc.hold && !sc.hold.done && st >= sc.hold.t) {
        holding = true;
        if (!sc.hold.at) sc.hold.at = now;
        if (now - sc.hold.at > 20000) { sc.hold.done = true; holding = false; return 1; }   // nobody chose: he does
        return 0;
      }
      for (var w = 0; w < sc.taps.length; w++) {
        var T = sc.taps[w];
        if (st >= T[0] && st < T[1]) {
          if (bank > 0) { bank -= dt; gateIdle = now; return 1; }
          if (now - lastTap > 8000 && now - (gateIdle || now) > 8000) return 0.35;   // nobody tapping: he gets up anyway, slowly
          if (!gateIdle) gateIdle = now;
          return 0;
        }
      }
      gateIdle = 0;
      return 1;
    }
    function resolve(ok, now) {
      var text = prompt.q.done(ok);
      result = { text: text, ok: ok, at: now };
      prompt = null;
    }
    function keyIn(k) {
      if (!play) return false;
      var now = performance.now();
      if (prompt) { resolve(k === prompt.q.key, now); return true; }
      if (k !== "Enter" && k !== " ") return false;
      if (sc.hold && !sc.hold.done && holding) { sc.hold.done = true; holding = false; return true; }
      for (var w = 0; w < sc.taps.length; w++) if (st >= sc.taps[w][0] && st < sc.taps[w][1]) { bank = Math.min(1.5, bank + 0.6); lastTap = now; gateIdle = now; return true; }
      return true;
    }
    function rate(t) {
      for (var i = 0; i < sc.slow.length; i++) if (t >= sc.slow[i][0] && t < sc.slow[i][1]) return sc.slow[i][2];
      return 1;
    }
    function slowNow() { return rate(st) < 0.5; }

    // ---------- drawing the figures ----------
    function strokeFig(j, colour, lw, alpha, s, ox, oy) {
      var P = function (q) { return [X(ox + q[0] * s), Y(oy + q[1] * s)]; };
      var hip = P(j.hip), neck = P(j.neck), eA = P(j.eA), hA = P(j.hA), eB = P(j.eB), hB = P(j.hB), kA = P(j.kA), fA = P(j.fA), kB = P(j.kB), fB = P(j.fB), hd = P(j.head);
      ctx.beginPath();
      ctx.moveTo(hA[0], hA[1]); ctx.lineTo(eA[0], eA[1]); ctx.lineTo(neck[0], neck[1]); ctx.lineTo(eB[0], eB[1]); ctx.lineTo(hB[0], hB[1]);
      ctx.moveTo(neck[0], neck[1]); ctx.lineTo(hip[0], hip[1]);
      ctx.moveTo(fA[0], fA[1]); ctx.lineTo(kA[0], kA[1]); ctx.lineTo(hip[0], hip[1]); ctx.lineTo(kB[0], kB[1]); ctx.lineTo(fB[0], fB[1]);
      var hr = K.L.head * Z() * s;
      ctx.moveTo(hd[0] + hr, hd[1]); ctx.arc(hd[0], hd[1], hr, 0, Math.PI * 2);
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = colour;
      ctx.globalAlpha = alpha * 0.12; ctx.lineWidth = lw * 3; ctx.stroke();
      ctx.globalAlpha = alpha; ctx.lineWidth = lw; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function shakyAmp() {
      for (var i = 0; i < sc.shaky.length; i++) if (st >= sc.shaky[i][0] && st < sc.shaky[i][1]) return sc.shaky[i][2];
      return 0;
    }
    function hero(keys, isNeo) {
      var s = K.at(keys, st);
      if (s.y < 0.5) s.y -= craterAt(s.x);   // on the ground: down into the crater where it is
      var amp = isNeo ? shakyAmp() : 0;
      if (amp) {   // hurt: he trembles, sways, and his arms shake taking the weight
        var w = Math.sin(st * 7.3) * 0.6 + Math.sin(st * 13.1) * 0.4;
        s.p.tx += w * 5 * amp; s.p.aA += Math.sin(st * 21) * 4 * amp; s.p.aB += Math.sin(st * 19) * 4 * amp;
        s.p.lA += w * 3 * amp; s.x += Math.sin(st * 2.3) * 0.008 * amp;
      }
      return s;
    }
    function drawHero(s, colour, lw, alpha) {
      var j = K.turned({ p: s.p, x: 0, y: 0, f: s.f, r: s.r });
      if (abber > 0) {   // the picture tears into red and cyan for a moment after a big hit
        var o = abber * 0.014;
        strokeFig(j, "#ff4060", lw, 0.35 * alpha, 1, s.x - o, s.y);
        strokeFig(j, "#40e0ff", lw, 0.35 * alpha, 1, s.x + o, s.y);
      }
      strokeFig(j, colour, lw, alpha, 1, s.x, s.y);
      return j;
    }
    function drawSmall(c, colour, lw, alpha) {
      var p = K.POSE.stand, sw = Math.sin(st * 1.3 + c.sway);
      var pose = { tx: p.tx + sw * 2, aA: p.aA, fA: p.fA, aB: p.aB, fB: p.fB, lA: p.lA, sA: p.sA, lB: p.lB, sB: p.sB };
      var push = 0;
      if (blowAt >= 0 && st > blowAt) {   // the blast from the crater throws them back, and they straighten up again
        var age = st - blowAt, k = Math.exp(-age * 1.6) * Math.min(1, age * 12) / (1 + c.row * 0.6);
        push = 0.22 * k * c.side; pose.tx -= 40 * k;
      }
      var j = K.turned({ p: pose, x: 0, y: K.groundY(pose), f: c.f, r: 0 });
      depth = 0.75 - c.row * 0.12;
      strokeFig(j, colour, lw * c.s, alpha, c.s, c.x + push, 0.12 + c.row * 0.1);
      depth = 1;
    }

    // ---------- effects ----------
    function impact(h) {
      var big = h.big, huge = h.huge, mega = h.mega;
      shake = Math.max(shake, mega ? 1.6 : huge ? 1 : big ? 0.6 : 0.15);
      if (big) { abber = mega ? 2.2 : 1; flash = Math.max(flash, mega ? 0.55 : huge ? 0.5 : 0.32); flashCol = "235,245,240"; }
      rings.push({ x: h.x, y: h.y, t0: st, big: big, huge: huge, mega: mega, ground: !!h.crater, air: !!h.air });
      if (mega) {
        rings.push({ x: h.x, y: h.y, t0: st + 0.12, big: true, mega: true, ground: true }, { x: h.x, y: h.y, t0: st + 0.3, big: true, huge: true, ground: true });
        beam = { x: h.x, t0: st };   // a column of light where he hit
        blowAt = st;
        drops.forEach(function (dr) { dr.px = (dr.x - 0.6) * 1.8; });   // the rain is blown away from the blast
      }
      var n = mega ? 160 : huge ? 60 : h.crater ? 70 : big ? 30 : 6;
      for (var k = 0; k < n; k++) {
        var a = h.crater ? Math.PI * (0.06 + 0.88 * Math.random()) : Math.random() * Math.PI * 2, v = (mega ? 2.6 : huge ? 1.6 : 1) * (0.3 + Math.random());
        sparks.push({ x: h.x, y: h.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: mega && k % 3 === 0 ? "#" : GLY.charAt((Math.random() * GLY.length) | 0),
          life: 0.6 + Math.random() * (mega ? 1.6 : 0.8), g: h.crater ? 1.6 : 0.5, white: mega && k % 2 === 0 });
      }
      if (h.crater) crater.at = st;
      if (h.touch) { flash = Math.max(flash, 0.4); flashCol = "200,255,215"; abber = 2.5; shake = Math.max(shake, 0.8); }
      if (h.beat) { abber = Math.max(abber, 0.8); shake = Math.max(shake, 0.25); }
      if (h.wall) for (var w = 0; w < 26; w++)   // the wall comes apart in blocks
        chunks.push({ x: sc.wall.x + (Math.random() - 0.5) * 0.06, y: 0.1 + Math.random() * 0.8, vx: -0.6 - Math.random() * 1.6, vy: Math.random() * 1.2 - 0.2,
          s: 0.025 + Math.random() * 0.045, r: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    }
    // lightning: a jagged bolt all the way down, with forks, that strikes twice (the flicker real
    // lightning has), and lights the whole sky
    function jag(x0, y0, y1, step, wob) {
      var pts = [[x0, y0]], x = x0, y = y0;
      while (y < y1) { y += Hh * (step + Math.random() * step); x += (Math.random() - 0.5) * W * wob; pts.push([x, Math.min(y, y1)]); }
      return pts;
    }
    function makeBolt() {
      var main = jag(W * (0.12 + Math.random() * 0.76), 0, Hh * (0.75 + Math.random() * 0.15), 0.035, 0.05), forks = [];
      for (var f = 0; f < 3; f++) {
        var from = main[1 + ((Math.random() * (main.length - 3)) | 0)];
        if (from) forks.push(jag(from[0], from[1], from[1] + Hh * (0.12 + Math.random() * 0.2), 0.03, 0.07));
      }
      bolt = { main: main, forks: forks, t0: st, wall: performance.now() };
      flash = Math.max(flash, 0.5); flashCol = "225,240,255";
    }

    function frame(now) {
      if (!live) return;
      var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      st += dt * rate(st) * gate(dt, now);
      if (st > sc.end) { finish(); if (opt.onDone) opt.onDone("light"); return; }
      cam = camAt(cams, st);
      shake *= Math.pow(0.04, dt); abber = Math.max(0, abber - dt * 2.5); flash = Math.max(0, flash - dt * 1.8);

      sc.say.forEach(function (s, i) { if (!said[i] && st >= s[0]) { said[i] = 1; sub = { text: s[1], wall: now }; if (opt.say) opt.say(s[1]); } });
      sc.bolts.forEach(function (b, i) { if (env && !bolted[i] && st >= b) { bolted[i] = 1; makeBolt(); } });
      sc.hits.forEach(function (h, i) { if (!fired[i] && st >= h.t) { fired[i] = 1; impact(h); } });

      var n = hero(sc.N, true), s = hero(sc.S, false);
      // the fall: the camera drops with him, all the way down
      if (st > sc.fall[0] && st < sc.fall[1] + 0.12) cam.y = Math.max(0.55, Math.min(cam.y, n.y + 0.15));

      // the afterimage: last frames fade, so fast moves leave a trail
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0," + (slowNow() ? 0.18 : 0.42) + ")";
      ctx.fillRect(0, 0, W, Hh);
      ctx.globalCompositeOperation = "source-over";
      ctx.setTransform(1, 0, 0, 1, (Math.random() - 0.5) * shake * W * 0.02, (Math.random() - 0.5) * shake * Hh * 0.025);

      var lw = Math.max(2, U() * cam.z * 0.02);
      if (st > sc.burst + 0.4) stormOn = Math.max(0, 1 - (st - sc.burst - 0.4) / 2);   // the rain stops

      // the storm: slanted rain, hanging still in the slow moments; blown aside by the blast
      if (env && stormOn > 0) {
        var still = slowNow(), fall = still ? 0.04 : 1;
        ctx.strokeStyle = "rgba(160,210,180," + (0.26 * stormOn) + ")"; ctx.lineWidth = Math.max(1, W / 1400);
        ctx.beginPath();
        for (var i = 0; i < drops.length; i++) {
          var dr = drops[i];
          dr.y += dr.v * dt * 1.6 * fall; dr.x += (-dr.v * 0.25 * fall + dr.px) * dt; dr.px *= Math.pow(0.2, dt);
          if (dr.y > 1) { dr.y -= 1.05; dr.x = Math.random() * 1.2; }
          if (dr.x < -0.1) dr.x += 1.25; else if (dr.x > 1.2) dr.x -= 1.25;
          var x0 = dr.x * W, y0 = dr.y * Hh, len = dr.l * Hh * (still ? 0.4 : 1);
          ctx.moveTo(x0, y0); ctx.lineTo(x0 + len * (0.16 - dr.px * 0.3), y0 - len);
        }
        ctx.stroke();
      }
      // the clouds they climb through (only on screen when the camera is up there)
      if (env && cam.y > 1.2) {
        var lit = bolt && (now - bolt.wall) < 450 ? 0.14 : 0;   // the clouds light up from inside
        clouds.forEach(function (c) {
          var cx = X(c.x + Math.sin(st * 0.1 + c.y) * 0.05), cy = Y(c.y);
          if (cy < -Hh * 0.3 || cy > Hh * 1.3) return;
          ctx.fillStyle = "rgba(130,160,145," + (0.07 + lit) + ")";
          ctx.beginPath(); ctx.ellipse(cx, cy, c.rx * Z(), c.ry * Z(), 0, 0, Math.PI * 2); ctx.fill();
        });
      }

      // the skyline: dark broken towers with a few lit windows, far back
      if (env && cam.y < 2.6) {
        depth = 0.4;
        ctx.lineWidth = Math.max(1, lw * 0.5);
        towers.forEach(function (T) {   // each a dark block (it hides the rain behind it) with a broken top
          var x0 = T.x, x1 = T.x + T.w, n = T.cut.length;
          ctx.beginPath(); ctx.moveTo(X(x0), Y(0.35)); ctx.lineTo(X(x0), Y(0.35 + T.h - T.cut[0]));
          for (var q = 1; q < n; q++) ctx.lineTo(X(x0 + T.w * q / (n - 1)), Y(0.35 + T.h - T.cut[q]));
          ctx.lineTo(X(x1), Y(0.35)); ctx.closePath();
          ctx.fillStyle = "rgba(0,8,3,0.5)"; ctx.fill();
          ctx.strokeStyle = "rgba(57,255,122,0.16)"; ctx.stroke();
        });
        ctx.fillStyle = "rgba(57,255,122,0.1)";
        towers.forEach(function (T) { T.win.forEach(function (w) { ctx.fillRect(X(T.x + w[0]), Y(0.35 + w[1]), lw * 1.2, lw * 1.4); }); });
        depth = 1;
      }
      // the digital sunrise: a gold sun in scanlines, coming up behind the street
      if (st > sc.burst + 2) {
        var su = Math.min(1, (st - sc.burst - 2) / 10), sr = 0.55, scy = -0.35 + su * 0.6;
        depth = 0.4;
        var sx2 = X(0.3), sy2 = Y(0.35 + scy), srad = sr * Z();
        ctx.save(); ctx.beginPath(); ctx.rect(-W, -Hh, W * 3, Y(0.35) + Hh); ctx.clip();
        for (var ln = -srad; ln < srad; ln += srad / 9) {
          var hw = Math.sqrt(Math.max(0, srad * srad - ln * ln)), gap = ln > 0 ? srad / 9 * (0.15 + 0.5 * ln / srad) : srad / 9 * 0.12;
          ctx.fillStyle = "rgba(" + GOLD + "," + (0.35 * su) + ")"; ctx.fillRect(sx2 - hw, sy2 + ln, hw * 2, srad / 9 - gap);
        }
        ctx.restore();
        depth = 1;
      }
      // the wall he goes through: whole, then a broken stub, and the blocks flying
      if (env) {
        // a concrete wall: solid, in staggered blocks
        var wx0 = sc.wall.x, broke = st >= sc.wall.t, wh = broke ? 0.3 : 1.0, ww = 0.11;
        ctx.beginPath(); ctx.moveTo(X(wx0 - ww), Y(0)); ctx.lineTo(X(wx0 - ww), Y(wh));
        if (broke) { ctx.lineTo(X(wx0 - 0.06), Y(wh - 0.08)); ctx.lineTo(X(wx0 - 0.01), Y(wh + 0.05)); ctx.lineTo(X(wx0 + 0.05), Y(wh - 0.12)); }
        ctx.lineTo(X(wx0 + ww), Y(broke ? wh - 0.06 : wh)); ctx.lineTo(X(wx0 + ww), Y(0)); ctx.closePath();
        ctx.fillStyle = "rgba(0,14,6,0.85)"; ctx.fill();
        ctx.strokeStyle = "rgba(57,255,122,0.45)"; ctx.lineWidth = lw * 0.7; ctx.stroke();
        ctx.strokeStyle = "rgba(57,255,122,0.18)"; ctx.lineWidth = Math.max(1, lw * 0.4); ctx.beginPath();
        for (var by = 0.1, row2 = 0; by < wh - 0.06; by += 0.1, row2++) {
          ctx.moveTo(X(wx0 - ww), Y(by)); ctx.lineTo(X(wx0 + ww), Y(by));
          var off = row2 % 2 ? 0 : ww / 2;
          for (var bx = wx0 - ww + off + ww / 2; bx < wx0 + ww; bx += ww) { ctx.moveTo(X(bx), Y(by)); ctx.lineTo(X(bx), Y(by + 0.1)); }
        }
        ctx.stroke();
        chunks = chunks.filter(function (c) {
          var rt = rate(st);
          c.vy -= 3 * dt * rt; c.x += c.vx * dt * rt; c.y += c.vy * dt * rt; c.r += c.vr * dt * rt;
          if (c.y < c.s) { c.y = c.s; c.vy = -c.vy * 0.3; c.vx *= 0.6; c.vr *= 0.5; }
          ctx.save(); ctx.translate(X(c.x), Y(c.y)); ctx.rotate(c.r);
          ctx.strokeStyle = "rgba(57,255,122,0.5)"; ctx.lineWidth = Math.max(1, lw * 0.5);
          var cs = c.s * Z(); ctx.strokeRect(-cs / 2, -cs / 2, cs, cs * 0.7);
          ctx.restore();
          return Math.abs(c.vx) > 0.02 || c.y > c.s + 0.001 || st - sc.wall.t < 6;
        });
      }

      // the street, with the crater once it's made
      ctx.fillStyle = green; ctx.globalAlpha = 0.45;
      for (var gx = -3; gx < 3; gx += 0.025) ctx.fillRect(X(gx), Y(-craterAt(gx)) + lw, lw * 1.3, lw * 0.6);
      ctx.globalAlpha = 1;
      if (crater.at >= 0 && st > crater.at) {   // the broken edge of the crater
        ctx.strokeStyle = green; ctx.globalAlpha = 0.5; ctx.lineWidth = lw * 0.7; ctx.beginPath();
        [-1, 1].forEach(function (sd) {
          for (var q = 0; q < 3; q++) {
            var ex = crater.x + sd * crater.w * (0.75 + q * 0.12);
            ctx.moveTo(X(ex), Y(0)); ctx.lineTo(X(ex + sd * 0.04), Y(0.04 - q * 0.01)); ctx.lineTo(X(ex + sd * 0.08), Y(0.005));
          }
        });
        ctx.stroke(); ctx.globalAlpha = 1;
      }

      // the crowd of him, watching (and at the end, shattering one after another)
      if (env) {
        var appear = Math.min(1, st / 4);
        crowd.forEach(function (c) {
          if (st > sc.burst && c.gone < 0 && st > sc.burst + Math.abs(c.x + 1.05) * 0.7 + c.delay * 0.6) {
            c.gone = st;
            for (var k = 0; k < 10; k++) sparks.push({ x: c.x, y: 0.12 + c.row * 0.14 + 0.25 * c.s, vx: (Math.random() - 0.5) * 0.8, vy: Math.random() * 0.8 + 0.3,
              c: GLY.charAt((Math.random() * GLY.length) | 0), life: 1.2, g: -0.2, gold: true });
          }
          if (c.gone >= 0) return;
          // after the copy, a ripple runs through them: every one of them is wearing his face
          var E2 = sc.copy[1], neoNow = st > E2 + Math.abs(c.x + 1.05) * 0.9;
          if (neoNow && !c.turned) {   // the moment it reaches him: a flash and a spit of code
            c.turned = st;
            for (var tk = 0; tk < 5; tk++) sparks.push({ x: c.x * 0.8, y: 0.15 + c.row * 0.1 + 0.3 * c.s, vx: (Math.random() - 0.5) * 0.4, vy: Math.random() * 0.5,
              c: GLY.charAt((Math.random() * GLY.length) | 0), life: 0.6, g: 0.3, white: true });
          }
          var flare = c.turned ? Math.max(0, 1 - (st - c.turned) / 0.5) : 0;
          drawSmall(c, flare > 0.3 ? "#ffffff" : neoNow ? bone : green, lw * (1 + flare * 0.6), Math.min(1, (0.1 + 0.07 * (2 - c.row)) * appear * (neoNow ? 1.5 : 1) + flare * 0.6));
        });
      }

      // the two of them
      var smithGone = st > sc.burst;
      if (!smithGone) drawHero(s, green, lw, 0.85);
      else if (!fired.smith) {
        fired.smith = 1;
        for (var k2 = 0; k2 < 60; k2++) sparks.push({ x: s.x, y: s.y + 0.2 + Math.random() * 0.6, vx: (Math.random() - 0.5) * 1.6, vy: (Math.random() - 0.2) * 1.4, c: GLY.charAt((Math.random() * GLY.length) | 0), life: 1.8, g: -0.1, gold: true });
      }
      var cpv = Math.max(0, Math.min(1, (st - sc.copy[0] - 0.2) / (sc.copy[1] - sc.copy[0] - 0.2)));
      if (st > sc.burst) cpv = 0;   // himself again, lying in the street
      var nAlpha = st > sc.lift + 3.5 ? Math.max(0, 1 - (st - sc.lift - 3.5) / 2.5) : 0.85;
      if (st > sc.lift + 3.5 && Math.random() < 0.6) sparks.push({ x: n.x + (Math.random() - 0.5) * 0.5, y: n.y + (Math.random() - 0.5) * 0.15, vx: 0, vy: 0.4 + Math.random() * 0.4,
        c: GLY.charAt((Math.random() * GLY.length) | 0), life: 1.2, g: -0.3, gold: true });   // he goes up into the light as code
      var nj = drawHero(n, st > sc.burst ? "rgb(" + GOLD + ")" : bone, lw, Math.min(0.85, nAlpha));
      if (cpv > 0) {   // the copy: the agent's colour climbing up him like ink
        var top = Y(n.y + 0.85 * cpv - 0.45);
        ctx.save(); ctx.beginPath(); ctx.rect(-W, top, W * 3, Hh * 2); ctx.clip();
        strokeFig(nj, green, lw * 1.15, 0.95, 1, n.x, n.y);
        ctx.restore();
        ctx.fillStyle = green; ctx.globalAlpha = 0.6; ctx.font = Math.round(lw * 4) + "px " + font;
        for (var g = 0; g < 4; g++) ctx.fillText(GLY.charAt((Math.random() * GLY.length) | 0), X(n.x + (Math.random() - 0.5) * 0.18), top + (Math.random() - 0.5) * lw * 6);
        ctx.globalAlpha = 1;
      }
      // the copy cracks and light pours out of him, then out of the agent
      var E = sc.copy[1];
      if (st > sc.purge && st < sc.burst + 0.9) {
        var cr = Math.min(1, (st - sc.purge) / (sc.burst - sc.purge)), ox = n.x, oy = n.y + 0.35;
        if (st > sc.purge + 0.4 && env) {   // the light runs out of him along threads, into every copy of him
          var thr = Math.min(1, (st - sc.purge - 0.4) / 2.2);
          ctx.strokeStyle = "rgba(" + GOLD + "," + (0.25 * thr) + ")"; ctx.lineWidth = Math.max(1, lw * 0.4); ctx.beginPath();
          crowd.forEach(function (c, ci) {
            if (ci % 2) return;
            depth = 0.75 - c.row * 0.12; var tx = X(c.x), ty = Y(0.12 + c.row * 0.1 + 0.3 * c.s); depth = 1;
            var fx = X(ox), fy = Y(oy);
            ctx.moveTo(fx, fy); ctx.lineTo(fx + (tx - fx) * thr, fy + (ty - fy) * thr);
          });
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(" + GOLD + "," + (0.5 + 0.5 * cr) + ")"; ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        for (var r = 0; r < 14; r++) {
          var ang = r / 14 * Math.PI * 2 + 0.3, len2 = (0.1 + 0.9 * cr) * (0.25 + (r % 3) * 0.12) * (1 + Math.sin(st * 9 + r) * 0.08);
          ctx.moveTo(X(ox), Y(oy)); ctx.lineTo(X(ox + Math.cos(ang) * len2), Y(oy + Math.sin(ang) * len2));
        }
        if (st > sc.purge + 1.9) for (var r2 = 0; r2 < 9; r2++) { var a2 = r2 / 9 * Math.PI * 2; ctx.moveTo(X(s.x), Y(s.y + 0.35)); ctx.lineTo(X(s.x + Math.cos(a2) * 0.3 * cr), Y(s.y + 0.35 + Math.sin(a2) * 0.3 * cr)); }
        ctx.stroke();
        glow = [X(ox), Y(oy), Z() * (0.2 + cr), cr];
      }

      // speed lines: across the screen as they charge, up and down on the climb and the fall
      var charge = sc.hits.filter(function (h) { return h.air && h.big && st > h.t - 0.5 && st < h.t; }).length;
      var climbing = st > sc.up + 0.3 && st < sc.up + 2.4, falling = st > sc.fall[0] && st < sc.fall[1];
      if (charge || climbing || falling) {
        ctx.strokeStyle = "rgba(200,255,216," + (falling ? 0.5 : 0.35) + ")"; ctx.lineWidth = lw * 0.5; ctx.beginPath();
        for (var sl = 0; sl < (falling ? 26 : 14); sl++) {
          if (charge) {
            var yy = cam.y + 0.2 + Math.random() * 0.55, side = sl % 2 ? -1 : 1, xs = side * (0.2 + Math.random() * 0.8);
            ctx.moveTo(X(xs), Y(yy)); ctx.lineTo(X(xs + side * 0.35), Y(yy));
          } else {
            var vx = (Math.random() - 0.5) * W * 0.9 + W / 2, vy = Math.random() * Hh, vl = Hh * (falling ? 0.25 : 0.15);
            ctx.moveTo(vx, vy); ctx.lineTo(vx, vy + (falling ? -vl : vl));
          }
        }
        ctx.stroke();
      }

      // shockwaves
      rings = rings.filter(function (rg) {
        if (st < rg.t0) return true;
        var age = st - rg.t0, life = rg.mega ? 2.2 : rg.huge ? 1.6 : 1.1;
        if (age > life) return false;
        var rr = (rg.mega ? 3.6 : rg.huge ? 1.5 : rg.big ? 0.9 : 0.25) * (age / life), fade = 1 - age / life, zz = Z();
        var ry = rg.ground ? 0.18 : rg.air ? 0.95 : 0.7, rx = rg.ground ? 1.4 : 1;
        ctx.strokeStyle = "rgba(220,255,230," + (0.75 * fade) + ")"; ctx.lineWidth = lw * (rg.mega ? 3 : rg.huge ? 2 : 1.2) * fade + 1;
        ctx.beginPath(); ctx.ellipse(X(rg.x), Y(rg.y), rr * zz * rx, rr * zz * ry, 0, 0, Math.PI * 2); ctx.stroke();
        if (rg.huge || rg.mega || rg.ground) {   // a second, softer ring behind the first
          ctx.strokeStyle = "rgba(57,255,122," + (0.4 * fade) + ")"; ctx.beginPath();
          ctx.ellipse(X(rg.x), Y(rg.y), rr * 0.7 * zz * rx, rr * 0.7 * zz * ry, 0, 0, Math.PI * 2); ctx.stroke();
        }
        return true;
      });

      // sparks of code
      var fs = Math.round(Z() * 0.045);
      ctx.font = fs + "px " + font;
      sparks = sparks.filter(function (sp) {
        sp.life -= dt; var rt = rate(st);
        sp.x += sp.vx * dt * rt; sp.y += sp.vy * dt * rt; sp.vy -= sp.g * dt * rt * 1.5;
        if (sp.life <= 0) return false;
        ctx.globalAlpha = Math.min(0.8, sp.life); ctx.fillStyle = sp.gold ? "rgb(" + GOLD + ")" : sp.white ? "#eafff0" : bone;
        ctx.fillText(sp.c, X(sp.x), Y(sp.y));
        return true;
      });
      ctx.globalAlpha = 1;

      // ---------- on the screen, not in the world: the overlay, cleared every frame so light and
      // flashes never pile up in the trails ----------
      var wctx = ctx;
      ctx = octx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, Hh);
      if (glow) {
        var bloom = ctx.createRadialGradient(glow[0], glow[1], 0, glow[0], glow[1], glow[2]);
        bloom.addColorStop(0, "rgba(" + GOLD + "," + (0.45 * glow[3]) + ")"); bloom.addColorStop(1, "rgba(" + GOLD + ",0)");
        ctx.fillStyle = bloom; ctx.fillRect(0, 0, W, Hh); glow = null;
      }
      if (beam && st - beam.t0 < 2.4) {   // the column of light from the crater, and the dust that rolls out of it
        var bage = st - beam.t0, bk = bage < 0.15 ? bage / 0.15 : Math.max(0, 1 - (bage - 0.15) / 2.25), bx = X(beam.x), bw = W * (0.04 + bage * 0.05);
        var bg = ctx.createLinearGradient(bx - bw, 0, bx + bw, 0);
        bg.addColorStop(0, "rgba(220,255,230,0)"); bg.addColorStop(0.5, "rgba(235,255,240," + (0.55 * bk) + ")"); bg.addColorStop(1, "rgba(220,255,230,0)");
        ctx.fillStyle = bg; ctx.fillRect(bx - bw, 0, bw * 2, Y(0));
        var dust = ctx.createRadialGradient(bx, Y(0), 0, bx, Y(0), Z() * (0.3 + bage * 0.9));
        dust.addColorStop(0, "rgba(150,190,165," + (0.35 * bk) + ")"); dust.addColorStop(1, "rgba(150,190,165,0)");
        ctx.fillStyle = dust; ctx.fillRect(0, 0, W, Hh);
      }
      if (bolt) {
        var bt = (now - bolt.wall) / 1000;
        var on = bt < 0.07 ? 1 : bt < 0.12 ? 0.15 : bt < 0.5 ? 1 - (bt - 0.12) / 0.38 : 0;   // strike, gap, strike, fade
        if (bt > 0.12 && bt < 0.16) flash = Math.max(flash, 0.42);   // the second strike lights the sky again
        if (on > 0) {
          var path = function (pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (var q = 1; q < pts.length; q++) ctx.lineTo(pts[q][0], pts[q][1]); };
          ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.beginPath(); path(bolt.main); bolt.forks.forEach(path);
          ctx.strokeStyle = "rgba(170,210,255," + (0.18 * on) + ")"; ctx.lineWidth = Math.max(10, W / 120); ctx.stroke();   // the glow round it
          ctx.strokeStyle = "rgba(220,240,255," + (0.45 * on) + ")"; ctx.lineWidth = Math.max(4, W / 380); ctx.stroke();
          ctx.beginPath(); path(bolt.main);
          ctx.strokeStyle = "rgba(255,255,255," + on + ")"; ctx.lineWidth = Math.max(2, W / 900); ctx.stroke();   // the white-hot core
          ctx.beginPath(); bolt.forks.forEach(path);
          ctx.strokeStyle = "rgba(240,248,255," + (0.8 * on) + ")"; ctx.lineWidth = Math.max(1, W / 1500); ctx.stroke();
        } else if (bt > 0.6) bolt = null;
      }
      if (st > sc.lift - 0.5 && st < sc.end) {   // the beam he is carried up in
        var la = Math.min(1, (st - sc.lift + 0.5) / 1.5) * Math.max(0, Math.min(1, (sc.lift + 9 - st) / 3));
        var lx = X(n.x), lwid = W * 0.07;
        var lg = ctx.createLinearGradient(lx - lwid, 0, lx + lwid, 0);
        lg.addColorStop(0, "rgba(" + GOLD + ",0)"); lg.addColorStop(0.5, "rgba(" + GOLD + "," + (0.3 * la) + ")"); lg.addColorStop(1, "rgba(" + GOLD + ",0)");
        ctx.fillStyle = lg; ctx.fillRect(lx - lwid, 0, lwid * 2, Y(0));
      }
      if (flash > 0) { ctx.fillStyle = "rgba(" + flashCol + "," + Math.min(0.55, flash) + ")"; ctx.fillRect(0, 0, W, Hh); }
      // the white-out as every agent goes, then it clears to the dawn
      var B = sc.burst;
      if (st > B - 0.2 && st < B + 5.4) {
        var wo = st < B + 0.6 ? (st - B + 0.2) / 0.8 : Math.max(0, 1 - (st - B - 0.6) / 4.8);
        ctx.fillStyle = "rgba(255,236,190," + (0.6 * wo) + ")"; ctx.fillRect(0, 0, W, Hh);   // a gold white-out
      }
      if (st > B + 1.4) {   // dawn: warm from the bottom
        var dawn = Math.min(1, (st - B - 1.4) / 6) * (st > sc.end - 3 ? Math.max(0, (sc.end - st) / 3) : 1);
        var gr = ctx.createLinearGradient(0, Hh, 0, Hh * 0.2);
        gr.addColorStop(0, "rgba(255,160,80," + (0.32 * dawn) + ")"); gr.addColorStop(0.35, "rgba(255,120,90," + (0.12 * dawn) + ")"); gr.addColorStop(1, "rgba(40,60,120,0)");
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, Hh);
      }
      // the copy: the edges close in, and the overwrite counts up beside him
      var C0 = sc.copy[0], C1 = sc.copy[1];
      if (st > C0 - 0.4 && st < sc.purge) {
        var vg = Math.min(1, (st - C0 + 0.4) / 0.6) * Math.min(1, (sc.purge - st) / 1.0);
        var vgr = ctx.createRadialGradient(W / 2, Hh / 2, Hh * 0.25, W / 2, Hh / 2, Hh * 0.95);
        vgr.addColorStop(0, "rgba(0,0,0,0)"); vgr.addColorStop(1, "rgba(0,0,0," + (0.7 * vg) + ")");
        ctx.fillStyle = vgr; ctx.fillRect(0, 0, W, Hh);
        if (st < C1 + 0.8) {
          var pc = Math.max(0, Math.min(1, (st - C0) / (C1 - C0))), cells = Math.round(pc * 16);
          var rd = "> OVERWRITING neo.exe  [" + new Array(cells + 1).join("#") + new Array(17 - cells).join(".") + "]  " + Math.round(pc * 100) + "%";
          ctx.font = Math.round(Hh * 0.03) + "px " + font; ctx.textAlign = "center";
          ctx.fillStyle = "rgba(57,255,122," + (0.85 * vg) + ")"; ctx.fillText(rd, W / 2, Hh * 0.2);
          ctx.textAlign = "start";
        } else if (st < C1 + 4.6) {
          var nN = Math.min(1000000, Math.round(Math.pow(Math.min(1, (st - C1 - 0.8) / 3.4), 2) * 1000000));
          ctx.font = Math.round(Hh * 0.03) + "px " + font; ctx.textAlign = "center";
          ctx.fillStyle = "rgba(200,255,216," + (0.85 * vg) + ")"; ctx.fillText("> INSTANCES OVERWRITTEN  " + nN.toLocaleString("en-AU") + " / 1,000,000+", W / 2, Hh * 0.2);
          ctx.textAlign = "start";
        }
      }
      // the title
      if (st > 1.2 && st < 6.5) {
        var tt = Math.min(1, (st - 1.2) / 0.8) * Math.min(1, (6.5 - st) / 1.0), shown = "THE LAST STAND".slice(0, Math.floor((st - 1.2) * 9));
        ctx.font = Math.round(Hh * 0.06) + "px " + font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(200,255,216," + (0.8 * tt) + ")"; ctx.fillText(shown, W / 2, Hh * 0.42);
        ctx.font = Math.round(Hh * 0.025) + "px " + font; ctx.fillStyle = "rgba(57,255,122," + (0.6 * tt) + ")";
        ctx.fillText("> RUN final.prg", W / 2, Hh * 0.5);
        ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
      }
      if (slowNow()) {   // the time readout in the corner while it hangs
        ctx.font = Math.round(Hh * 0.022) + "px " + font; ctx.fillStyle = "rgba(57,255,122,0.6)";
        var lab = "[ TIME x" + rate(st).toFixed(2) + " ]";
        ctx.fillText(lab, W - ctx.measureText(lab).width - W * 0.06, Hh * 0.17);
      }
      if (play) drawPlay(now);
      // letterbox bars, and the line typed in the bottom one like subtitles on a terminal
      var tight = st > sc.copy[0] - 0.6 && st < sc.purge + 0.5 ? Math.min(1, (st - sc.copy[0] + 0.6) / 0.8) * Math.min(1, (sc.purge + 0.5 - st) / 0.8) : 0;
      var bar = Hh * (0.11 + 0.05 * tight) * Math.min(1, st / 1.5) * Math.min(1, Math.max(0, (sc.end - st) / 1.5));   // the frame narrows for the copy
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, Hh - bar, W, bar);
      if (sub && bar > Hh * 0.05) {
        var age = (now - sub.wall) / 1000, life = 5.5;
        if (age < life) {
          var typed = sub.text.slice(0, Math.floor(age * 25));   // typed in real time, even in slow motion
          ctx.font = Math.round(Hh * 0.032) + "px " + font; ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(79,217,130," + (0.85 * Math.min(1, (life - age) / 0.8)) + ")";
          ctx.fillText("C:\\> " + typed + (Math.floor(now / 500) % 2 ? "_" : " "), W * 0.08, Hh - bar / 2);
          ctx.textBaseline = "alphabetic";
        }
      }
      ctx = wctx;
      requestAnimationFrame(frame);
    }
    // the prompts: a key in a box with a ring running out, the result after, and the tap and choice bars
    var ARROW = { ArrowUp: "\u2191", ArrowDown: "\u2193", ArrowLeft: "\u2190", ArrowRight: "\u2192" };
    function drawPlay(now) {
      var cx = W / 2, cy = Hh * 0.26, s = Hh * 0.075;   // up in the sky, clear of the fighters
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (prompt) {
        var left = Math.max(0, 1 - (now - prompt.at) / prompt.win);
        ctx.fillStyle = "rgba(0,10,4,0.82)"; ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
        ctx.strokeStyle = "rgba(57,255,122,0.9)"; ctx.lineWidth = Math.max(2, s * 0.05); ctx.strokeRect(cx - s, cy - s, s * 2, s * 2);
        ctx.beginPath(); ctx.arc(cx, cy, s * 1.45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
        ctx.strokeStyle = left < 0.3 ? "rgba(255,90,110,0.9)" : "rgba(200,255,216,0.85)"; ctx.lineWidth = Math.max(3, s * 0.08); ctx.stroke();
        var ang = { ArrowUp: -Math.PI / 2, ArrowDown: Math.PI / 2, ArrowLeft: Math.PI, ArrowRight: 0 }[prompt.q.key];
        if (ang != null) {   // the arrow drawn, not typed, so it sits dead centre in the box
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
          ctx.strokeStyle = "#e8fff0"; ctx.lineWidth = Math.max(3, s * 0.14); ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.beginPath(); ctx.moveTo(-s * 0.55, 0); ctx.lineTo(s * 0.5, 0);
          ctx.moveTo(s * 0.12, -s * 0.4); ctx.lineTo(s * 0.55, 0); ctx.lineTo(s * 0.12, s * 0.4); ctx.stroke();
          ctx.restore();
        } else {
          ctx.fillStyle = "#e8fff0"; ctx.font = Math.round(s * 0.9) + "px " + font;
          ctx.fillText("OK", cx, cy + s * 0.06);
        }
        ctx.font = Math.round(Hh * 0.03) + "px " + font; ctx.fillStyle = "rgba(57,255,122,0.9)";
        ctx.fillText(prompt.q.label, cx, cy + s * 1.9);
      } else if (result && now - result.at < 900) {
        var ra = 1 - (now - result.at) / 900;
        ctx.font = Math.round(Hh * 0.05) + "px " + font;
        ctx.fillStyle = result.ok ? "rgba(200,255,216," + ra + ")" : "rgba(255,110,125," + ra + ")";
        ctx.fillText(result.text, cx, cy - (1 - ra) * Hh * 0.04);
      }
      var inTap = null;
      for (var w = 0; w < sc.taps.length; w++) if (st >= sc.taps[w][0] && st < sc.taps[w][1]) inTap = sc.taps[w];
      if (inTap && !prompt) {
        var pr = (st - inTap[0]) / (inTap[1] - inTap[0]), bw = W * 0.26, bx = cx - bw / 2, by = cy + Hh * 0.02;
        var pulse = 0.6 + 0.4 * Math.abs(Math.sin(now / 220));
        ctx.font = Math.round(Hh * 0.034) + "px " + font; ctx.fillStyle = "rgba(200,255,216," + pulse + ")";
        ctx.fillText("TAP OK  -  GET UP", cx, by - Hh * 0.04);
        ctx.strokeStyle = "rgba(57,255,122,0.7)"; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, Hh * 0.018);
        ctx.fillStyle = "rgba(57,255,122,0.85)"; ctx.fillRect(bx + 2, by + 2, (bw - 4) * pr, Hh * 0.018 - 4);
      }
      if (holding && sc.hold && !sc.hold.done) {
        var hp = 0.55 + 0.45 * Math.abs(Math.sin(now / 400));
        ctx.font = Math.round(Hh * 0.04) + "px " + font; ctx.fillStyle = "rgba(200,255,216," + hp + ")";
        ctx.fillText(sc.hold.label, cx, cy);
      }
      ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    }
    function finish() {
      live = false; window.removeEventListener("resize", onResize);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, Hh); ov.remove();
    }
    requestAnimationFrame(frame);
    var onResize = function () { size(); };
    window.addEventListener("resize", onResize);
    return { key: keyIn, time: function () { return st; },
      // what the player is being asked for right now (for tests and previews)
      asking: function () { return prompt ? prompt.q.key : holding ? "hold" : sc.taps.some(function (T) { return st >= T[0] && st < T[1]; }) ? "tap" : ""; }, length: sc.end, marks: { up: sc.up, fall: sc.fall, beats: sc.beats, copy: sc.copy, burst: sc.burst, lift: sc.lift, end: sc.end }, stop: finish };
  }

  window.cryptFinal = { mount: mount };
})();
