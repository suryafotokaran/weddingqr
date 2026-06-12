/* ═══════════════════════════════════════════════════════
   Template 10 — Champagne Intro
   Interaction: press-and-hold (or drag up) the cork.
   At threshold the bottle pops and the reveal unfolds.
═══════════════════════════════════════════════════════ */

"use strict";

/* ─── Tuning constants ───────────────────────────────── */
const HOLD_MS        = 1150;  /* sustained hold → auto-pop          */
const DRAG_THRESHOLD = 54;    /* px upward drag → immediate pop      */
const IDLE_DELAY_MS  = 900;   /* ms before idle float starts         */
const CUE_DELAY_MS   = 1700;  /* ms before instruction cue animates  */

/* ─── Reduced motion ─────────────────────────────────── */
const rmq = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ─── DOM refs ───────────────────────────────────────── */
const introEl          = document.getElementById("intro");
const bScene           = document.getElementById("bScene");
const bStack           = document.getElementById("bStack");
const corkBtn          = document.getElementById("corkBtn");
const introCue         = document.getElementById("introCue");
const introSkip        = document.getElementById("introSkip");
const introFlash       = document.getElementById("introFlash");
const introFlashSpot   = document.getElementById("introFlashSpot");
const introBloom       = document.getElementById("introBloom");
const bNeckFoam        = document.getElementById("bNeckFoam");
const bMist            = document.getElementById("bMist");
const corkFizz         = document.getElementById("corkFizz");
const bgMusic          = document.getElementById("bgMusic");
const musicBtn         = document.getElementById("musicBtn");

/* ─── State ──────────────────────────────────────────── */
let popped     = false;
let pressing   = false;
let holdTimer  = null;
let tensionRaf = 0;
let pressY0    = 0;
let holdStart  = 0;
let currentLift = 0; /* current cork lift in px */


/* ═══════════════════════════════════════════════════════
   BACKGROUND MUSIC
   Unlocked on first user gesture (cork press / tap / skip).
   Played at the moment of the champagne pop.
   Button fades in after pop; toggles mute/unmute.
═══════════════════════════════════════════════════════ */

let _bgMusicUnlocked = false;

function _unlockBgMusic() {
  if (_bgMusicUnlocked || !bgMusic) return;
  _bgMusicUnlocked = true;
  /* Calling load() starts buffering from preload="none" */
  bgMusic.load();
  /* Play-then-immediately-pause unlocks the <audio> element on iOS Safari */
  const p = bgMusic.play();
  if (p) p.then(() => { bgMusic.pause(); bgMusic.currentTime = 0; }).catch(() => {});
}

function _startBgMusic() {
  if (!bgMusic || !musicBtn) return;
  bgMusic.play().catch(() => {});
  musicBtn.classList.add("is-visible");
}

/* Mute / unmute toggle */
if (musicBtn && bgMusic) {
  musicBtn.addEventListener("click", () => {
    bgMusic.muted = !bgMusic.muted;
    musicBtn.classList.toggle("is-muted", bgMusic.muted);
    musicBtn.setAttribute("aria-label", bgMusic.muted ? "Unmute music" : "Mute music");
  });
}


/* ═══════════════════════════════════════════════════════
   AUDIO — Web Audio API, pure synthesis, no files.

   iOS Safari local-network fix:
   ─ AudioContext created + resumed SYNCHRONOUSLY inside the
     pointerdown/touchstart gesture handler (onPressStart).
   ─ All nodes for the pop are PRE-BUILT during the gesture
     and stored. triggerPop() just calls .start() — no new
     node creation, no promise chains, no setTimeout delay.
   ─ This keeps us inside the iOS "trusted gesture" window
     for the entire audio lifecycle.
   ─ Silent buffer trick also applied to fully unlock on
     older iOS versions (12/13).
═══════════════════════════════════════════════════════ */

const Sound = (() => {
  let _ctx       = null;
  let _unlocked  = false;
  let _popArmed  = null; /* pre-built pop nodes, ready to fire */

  /* ── AudioContext — created once, synchronously in gesture ── */
  function getCtx() {
    if (!_ctx) {
      try {
        _ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_) {}
    }
    return _ctx;
  }

  /* ── Noise buffer helper ─────────────────────────────────── */
  function makeNoise(c, dur, shapeFn) {
    const len  = Math.floor(c.sampleRate * dur);
    const buf  = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * shapeFn(i / len);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    return src;
  }

  /* ── unlock() ────────────────────────────────────────────────
     Call SYNCHRONOUSLY inside pointerdown / touchstart.
     1. Creates AudioContext right here in the gesture.
     2. Resumes it synchronously (no .then()).
     3. Plays a silent buffer — required by iOS 12/13 to fully
        grant audio output permission.
     4. Pre-builds all pop nodes so triggerPop() can just .start().
  ── */
  function unlock() {
    if (_unlocked) return;
    _unlocked = true;

    const c = getCtx();
    if (!c) return;

    /* Synchronous resume — inside the gesture this works on iOS */
    try { c.resume(); } catch (_) {}

    /* Silent 1-sample buffer — iOS unlock requirement */
    try {
      const sb  = c.createBuffer(1, 1, c.sampleRate);
      const ss  = c.createBufferSource();
      ss.buffer = sb;
      ss.connect(c.destination);
      ss.start(0);
    } catch (_) {}

    /* Pre-arm the pop immediately while still in gesture context */
    _popArmed = _buildPop(c);
  }

  /* ── _buildPop() — constructs all nodes, does NOT start them ── */
  function _buildPop(c) {
    const master = c.createGain();
    master.gain.value = 1.0;
    master.connect(c.destination);

    /* Layer 1 — Deep pressure thud: 140→38 Hz sine sweep */
    const thud  = c.createOscillator();
    const thudG = c.createGain();
    thud.type = "sine";
    thudG.gain.value = 0; /* armed at 0, envelope set at fire time */
    thud.connect(thudG); thudG.connect(master);

    /* Layer 2 — Body resonance: 90→55 Hz */
    const body  = c.createOscillator();
    const bodyG = c.createGain();
    body.type = "sine";
    bodyG.gain.value = 0;
    body.connect(bodyG); bodyG.connect(master);

    /* Layer 3 — Sharp crack: HPF 3kHz impulse noise */
    const crack  = makeNoise(c, 0.04, t => Math.pow(1 - t, 2.4));
    const crackF = c.createBiquadFilter();
    crackF.type = "highpass"; crackF.frequency.value = 3000;
    const crackG = c.createGain();
    crackG.gain.value = 0;
    crack.connect(crackF); crackF.connect(crackG); crackG.connect(master);

    /* Layer 4 — Air burst: BPF 620 Hz gas escape */
    const air  = makeNoise(c, 0.06, t =>
      t < 0.1 ? t / 0.1 : Math.pow(1 - (t - 0.1) / 0.9, 1.2)
    );
    const airF = c.createBiquadFilter();
    airF.type = "bandpass"; airF.frequency.value = 620; airF.Q.value = 0.8;
    const airG = c.createGain();
    airG.gain.value = 0;
    air.connect(airF); airF.connect(airG); airG.connect(master);

    /* Layer 5 — Champagne fizz: 4.8kHz noise, 3.2s decay */
    const fizz  = makeNoise(c, 3.2, () => 1);
    const fizzF = c.createBiquadFilter();
    fizzF.type = "bandpass"; fizzF.frequency.value = 4800; fizzF.Q.value = 0.6;
    const fizzS = c.createBiquadFilter(); /* high shelf sparkle */
    fizzS.type = "highshelf"; fizzS.frequency.value = 8000; fizzS.gain.value = 6;
    const fizzG = c.createGain();
    fizzG.gain.value = 0;
    fizz.connect(fizzF); fizzF.connect(fizzS); fizzS.connect(fizzG);
    fizzG.connect(master);

    /* Layer 6 — Bottle resonance: 210→180 Hz hollow ring */
    const res  = c.createOscillator();
    const resG = c.createGain();
    res.type = "sine";
    resG.gain.value = 0;
    res.connect(resG); resG.connect(master);

    return { c, thud, thudG, body, bodyG, crack, crackG, air, airG,
             fizz, fizzG, res, resG };
  }

  /* ── firePop() — schedules envelopes and starts all nodes ── */
  function _firePop(n) {
    const { c, thud, thudG, body, bodyG, crack, crackG,
            air, airG, fizz, fizzG, res, resG } = n;
    const t = c.currentTime;

    /* Layer 1 */
    thud.frequency.setValueAtTime(140, t);
    thud.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    thudG.gain.setValueAtTime(0.0001, t);
    thudG.gain.linearRampToValueAtTime(0.72, t + 0.004);
    thudG.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    thud.start(t); thud.stop(t + 0.25);

    /* Layer 2 */
    body.frequency.setValueAtTime(90, t);
    body.frequency.exponentialRampToValueAtTime(55, t + 0.28);
    bodyG.gain.setValueAtTime(0.0001, t);
    bodyG.gain.linearRampToValueAtTime(0.38, t + 0.006);
    bodyG.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    body.start(t); body.stop(t + 0.35);

    /* Layer 3 */
    crackG.gain.setValueAtTime(0.55, t);
    crackG.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    crack.start(t);

    /* Layer 4 */
    airG.gain.setValueAtTime(0.42, t + 0.008);
    airG.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
    air.start(t + 0.008);

    /* Layer 5 */
    fizzG.gain.setValueAtTime(0.0001, t + 0.02);
    fizzG.gain.linearRampToValueAtTime(0.16, t + 0.12);
    fizzG.gain.setValueAtTime(0.16, t + 0.35);
    fizzG.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    fizz.start(t + 0.02);

    /* Layer 6 */
    res.frequency.setValueAtTime(210, t + 0.01);
    res.frequency.exponentialRampToValueAtTime(180, t + 0.55);
    resG.gain.setValueAtTime(0.0001, t + 0.01);
    resG.gain.linearRampToValueAtTime(0.18, t + 0.04);
    resG.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    res.start(t + 0.01); res.stop(t + 0.70);
  }

  return {

    unlock, /* called in onPressStart */

    /* ── creak — rubber-seal squeak on press ── */
    creak() {
      if (rmq) return;
      const c = getCtx();
      if (!c) return;
      try {
        const now = c.currentTime;
        const src = makeNoise(c, 0.18, t =>
          t < 0.08 ? t / 0.08 : Math.pow(1 - (t - 0.08) / 0.92, 1.4)
        );
        const f1 = c.createBiquadFilter();
        f1.type = "bandpass"; f1.frequency.value = 820; f1.Q.value = 2.8;
        const f2 = c.createBiquadFilter();
        f2.type = "bandpass"; f2.frequency.value = 1400; f2.Q.value = 1.6;
        const g  = c.createGain();
        g.gain.setValueAtTime(0.10, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        src.connect(f1); f1.connect(f2); f2.connect(g);
        g.connect(c.destination);
        src.start(now);
      } catch (_) {}
    },

    /* ── pop — fire the pre-armed nodes instantly ── */
    pop() {
      if (rmq) return;
      if (_popArmed) {
        /* Fire the pre-built nodes — no new allocations, no promises */
        try { _firePop(_popArmed); } catch (_) {}
        _popArmed = null;
      } else {
        /* Fallback: build + fire immediately (desktop / skip button path) */
        const c = getCtx();
        if (!c) return;
        try {
          if (c.state === "suspended") c.resume();
          _firePop(_buildPop(c));
        } catch (_) {}
      }
    }
  };
})();


/* ═══════════════════════════════════════════════════════
   TENSION SYSTEM
   Drives the visual feedback as user holds the cork.
   Cork lifts, stack compresses, cue dims.
═══════════════════════════════════════════════════════ */

function applyLift(px) {
  currentLift = Math.max(0, Math.min(DRAG_THRESHOLD, px));

  /* Cork rises — direct transform override */
  corkBtn.style.transform =
    `translateX(-50%) translateY(${-currentLift}px)`;

  /* Bottle stack compresses very subtly — adds physical weight */
  const t = currentLift / DRAG_THRESHOLD;
  bStack.style.transform = `scaleY(${(1 - t * 0.0055).toFixed(5)})`;
  bStack.style.transformOrigin = "bottom center";

  /* Instruction dims as cork rises */
  if (t > 0.25) {
    introCue.style.opacity = String(Math.max(0, 1 - (t - 0.25) / 0.75));
  }
}

function resetLift(animated) {
  if (animated) {
    corkBtn.style.transition =
      "transform 0.55s cubic-bezier(0.34, 1.42, 0.64, 1)";
    bStack.style.transition  =
      "transform 0.55s cubic-bezier(0.34, 1.42, 0.64, 1)";
  }
  corkBtn.style.transform    = "";
  bStack.style.transform     = "";
  bStack.style.transformOrigin = "";
  introCue.style.opacity     = "";
  currentLift = 0;

  if (animated) {
    setTimeout(() => {
      corkBtn.style.transition = "";
      bStack.style.transition  = "";
    }, 580);
  }
}


/* ═══════════════════════════════════════════════════════
   IDLE ANIMATION
═══════════════════════════════════════════════════════ */

function startIdle() {
  if (rmq || popped) return;
  bScene.classList.add("is-idle");
}

function stopIdle() {
  bScene.classList.remove("is-idle");
  /* Override so CSS animation can't re-engage */
  bScene.style.animationName = "none";
  /* Allow re-enable by removing after one frame */
  requestAnimationFrame(() => {
    bScene.style.animationName = "";
  });
}


/* ═══════════════════════════════════════════════════════
   POP SEQUENCE
   Fully time-sequenced. Each FX fires with a brief offset
   so the eruption feels multi-layered and physical.
═══════════════════════════════════════════════════════ */

function triggerPop() {
  if (popped) return;
  popped = true;

  clearTimeout(holdTimer);
  holdTimer = null;
  cancelAnimationFrame(tensionRaf);
  tensionRaf = 0;

  pressing = false;
  stopIdle();

  /* Lock current cork lift into CSS var for the fly animation */
  corkBtn.style.setProperty("--cork-lift", `${currentLift}px`);

  /* Freeze stack state before pop animations begin */
  bStack.style.transition     = "";
  bStack.style.transform      = "";
  bStack.style.transformOrigin = "";

  /* ① Cork flies off — immediate */
  corkBtn.classList.remove("is-charging");
  corkBtn.classList.add("is-popped");

  /* ① b — Hide cork fizz bubbles */
  if (corkFizz) corkFizz.classList.add("is-popped");

  /* ② Recoil on scene — 60ms lag so cork "leaves" first */
  setTimeout(() => {
    bScene.classList.remove("is-charging");
    bScene.classList.add("is-recoiling");
  }, 60);

  /* ③ Audio pop */
  Sound.pop();

  /* ④ FX cascade */
  setTimeout(() => { if (window._fireBurst) window._fireBurst(); }, 45);
  setTimeout(() => bNeckFoam.classList.add("is-active"),  55);
  setTimeout(() => bMist.classList.add("is-active"),     100);

  /* ④b Flash removed */
  /* ④c Flash removed */

  /* ④d Ivory bloom — post-flash overexposure, bridges intro→hero */
  setTimeout(() => {
    if (introBloom) introBloom.classList.add("is-blooming");
  }, 360);

  /* ④e Music blooms in with the ivory flash */
  setTimeout(() => _startBgMusic(), 1500);

  /* ⑤ Hide UI chrome immediately */
  introCue.classList.add("is-hidden");
  introSkip.classList.add("is-hidden");

  /* ⑥ Start cinematic exit — let burst fully bloom before dissolving */
  setTimeout(() => exitIntro(), 700);
}


/* ═══════════════════════════════════════════════════════
   INTERACTION — Pointer events (covers touch + mouse)
═══════════════════════════════════════════════════════ */

function onPressStart(e) {
  if (popped) return;
  e.preventDefault();

  /* Unlock AudioContext + bgMusic element on first gesture — critical for iOS Safari */
  Sound.unlock();
  _unlockBgMusic();

  pressing   = true;
  pressY0    = (e.touches ? e.touches[0] : e).clientY;
  holdStart  = performance.now();

  stopIdle();
  corkBtn.classList.add("is-charging");
  bScene.classList.add("is-charging");

  introCue.classList.add("is-charging");
  introCue.textContent = "Keep holding…";

  Sound.creak();

  /* Auto-pop after HOLD_MS of sustained contact */
  holdTimer = setTimeout(() => {
    if (pressing && !popped) triggerPop();
  }, HOLD_MS);

  /* Animate cork rising over the hold duration */
  function animateTension() {
    if (!pressing || popped) return;
    const elapsed  = performance.now() - holdStart;
    const progress = Math.min(1, elapsed / HOLD_MS);
    /* ease-in² — slow start, accelerates to make pressure feel real */
    applyLift(progress * progress * DRAG_THRESHOLD * 0.76);
    tensionRaf = requestAnimationFrame(animateTension);
  }
  tensionRaf = requestAnimationFrame(animateTension);
}

function onPressMove(e) {
  if (!pressing || popped) return;
  e.preventDefault();

  const clientY = (e.touches ? e.touches[0] : e).clientY;
  const dragUp  = pressY0 - clientY; /* positive = dragged upward */

  if (dragUp > 0) {
    const fromHold = Math.pow(
      Math.min(1, (performance.now() - holdStart) / HOLD_MS), 2
    ) * DRAG_THRESHOLD * 0.76;

    applyLift(Math.max(fromHold, dragUp));

    /* Immediate pop if drag crosses threshold */
    if (dragUp >= DRAG_THRESHOLD) triggerPop();
  }
}

function onPressEnd() {
  if (!pressing || popped) return;

  pressing = false;
  clearTimeout(holdTimer);
  holdTimer = null;
  cancelAnimationFrame(tensionRaf);
  tensionRaf = 0;

  /* Spring back — overshoot cubic-bezier gives a physical bounce */
  resetLift(true);

  corkBtn.classList.remove("is-charging");
  bScene.classList.remove("is-charging");
  introCue.classList.remove("is-charging");
  introCue.textContent = "Hold the cork to begin";
  introCue.style.opacity = "";

  setTimeout(() => {
    if (!popped) startIdle();
  }, 600);
}

/* Pointer events (unified mouse + touch on modern browsers) */
corkBtn.addEventListener("pointerdown",   onPressStart, { passive: false });
document.addEventListener("pointermove",  onPressMove,  { passive: false });
document.addEventListener("pointerup",    onPressEnd,   { passive: true });
document.addEventListener("pointercancel", onPressEnd,  { passive: true });

/*
  iOS Safari fallback — explicit touch events for older iOS.
  Guard: skip if a pointerdown already fired for this touch
  (modern iOS 13+ fires both; we only want one handler to run).
  We track this with a simple flag reset on touchend.
*/
let _pointerFired = false;
corkBtn.addEventListener("pointerdown", () => { _pointerFired = true; }, { passive: true, capture: true });

function _onTouchStart(e) {
  if (_pointerFired) { _pointerFired = false; return; }
  onPressStart(e);
}
function _onTouchMove(e) {
  if (pressing) e.preventDefault();
}

corkBtn.addEventListener("touchstart", _onTouchStart, { passive: false });
document.addEventListener("touchmove",  _onTouchMove,  { passive: false });
document.addEventListener("touchend",    onPressEnd, { passive: true });
document.addEventListener("touchcancel", onPressEnd, { passive: true });

/* Removed in exitIntro() so these scroll-blocking listeners don't persist */
function _removeIntroTouchListeners() {
  corkBtn.removeEventListener("touchstart", _onTouchStart);
  document.removeEventListener("touchmove",  _onTouchMove);
  document.removeEventListener("touchend",    onPressEnd);
  document.removeEventListener("touchcancel", onPressEnd);
  document.removeEventListener("pointermove",  onPressMove);
  document.removeEventListener("pointerup",    onPressEnd);
  document.removeEventListener("pointercancel", onPressEnd);
}


/* ═══════════════════════════════════════════════════════
   TAP ANYWHERE — any tap/click on the intro (outside the
   cork button itself) also triggers the pop. This keeps
   the cork drag interaction intact while giving users
   the simpler option of just tapping the screen.
═══════════════════════════════════════════════════════ */
introEl.addEventListener("click", (e) => {
  if (popped) return;
  /* Don't double-fire when the cork button itself is clicked */
  if (corkBtn.contains(e.target)) return;
  /* Don't fire on the skip button */
  if (introSkip.contains(e.target)) return;
  _unlockBgMusic();
  triggerPop();
});


/* ═══════════════════════════════════════════════════════
   SKIP & ENTER
═══════════════════════════════════════════════════════ */

introSkip.addEventListener("click", () => {
  _unlockBgMusic();
  if (!popped) {
    triggerPop();
  } else {
    exitIntro();
  }
});

function exitIntro() {
  if (exitIntro._fired) return;
  exitIntro._fired = true;

  /* Remove scroll-blocking intro touch/pointer listeners immediately */
  _removeIntroTouchListeners();

  /* Guarantee page starts at top — invite section stays below fold */
  window.scrollTo(0, 0);

  /* ── Phase 1: Fade out intro overlay ── */
  introEl.classList.add("is-done");
  document.body.classList.remove("intro-active");

  /* ── Phase 2: White line wipe — starts after intro begins dissolving ── */
  const wipeEl   = document.getElementById("heroWipe");
  const wipeLine = document.getElementById("heroWipeLine");

  setTimeout(() => {
    if (wipeEl)   wipeEl.classList.add("is-active");
    if (wipeLine) wipeLine.classList.add("is-animating");
  }, 200);

  /* ── Phase 3a: Start video — fades in only once first frame is ready ── */
  setTimeout(() => {
    const video = document.getElementById("heroVideo");
    if (!video) return;

    function showVideo() {
      video.style.transition = "opacity 1.0s ease";
      video.style.opacity    = "1";
    }

    function tryPlay() {
      const p = video.play();
      if (p !== undefined) {
        p.catch(() => { video.muted = true; video.play().catch(() => {}); });
      }
    }

    if (video.readyState >= 2) {
      /* First frame already in buffer — show immediately */
      showVideo();
      tryPlay();
    } else {
      /* Wait for first frame before making video visible */
      video.addEventListener("loadeddata", () => { showVideo(); tryPlay(); }, { once: true });
      /* Fallback: if video never loads, gradient background remains visible */
      tryPlay();
    }
  }, 350);

  /* ── Phase 3b: Remove intro DOM + clean up ── */
  setTimeout(() => {
    introEl.style.display = "none";

    /* Fade out ivory bloom as hero appears */
    if (introBloom) {
      introBloom.classList.remove("is-blooming");
      introBloom.classList.add("is-fading");
    }

    setTimeout(() => {
      if (wipeEl) wipeEl.style.display = "none";
    }, 900);

  }, 1100);

  /* ── Phase 4: Staggered text reveals — cinematic title frame sequence ── */
  const reveals = [
    { id: "htEyebrow", delay: 1700 },             // 1. eyebrow drifts in
    { id: "htBride",   delay: 2150, inner: true }, // 2. "James" rises & clears
    { id: "htGroom",   delay: 2480, inner: true }, // 3. "Catherine" follows
    { id: "htAmp",     delay: 2280 },              //    & between names
    { id: "htRule",    delay: 2950 },              // 4. ornament rule
    { id: "htDate",    delay: 3320 },              // 5. date (lower, slower)
    { id: "htVenue",   delay: 3620 },              // 6. venue last
  ];

  reveals.forEach(({ id, delay, inner }) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      if (inner) {
        const span = el.querySelector(".ht-name-inner");
        if (span) span.classList.add("is-in");
      } else {
        el.classList.add("is-in");
      }
    }, delay);
  });

  /* ── Phase 5: Reveal scroll cue after names fully settle ── */
  setTimeout(() => {
    const cue = document.getElementById("heroScrollCue");
    if (cue) {
      cue.style.pointerEvents = "auto";
      cue.classList.add("is-visible");
      cue._revealed = true;
    }
  }, rmq ? 300 : 4500);

  /* ── Phase 6: Reveal nav cluster once hero text is in ── */
  setTimeout(() => {
    const cluster = document.getElementById("navCluster");
    if (cluster) cluster.classList.add("is-visible");
  }, rmq ? 400 : 3800);
}


/* ═══════════════════════════════════════════════════════
   REDUCED MOTION — skip directly to reveal
═══════════════════════════════════════════════════════ */

if (rmq) {
  introCue.textContent = "Hold to begin";
  corkBtn.addEventListener("click", () => {
    if (!popped) triggerPop();
  }, { once: true });
}


/* ═══════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════ */

setTimeout(startIdle, IDLE_DELAY_MS);


/* ═══════════════════════════════════════════════════════
   DUST PARTICLES — Fix 4
   50 fine gold motes drift upward through the intro scene.
   Uses canvas for zero-DOM overhead. Respects prefers-reduced-motion.
   Loop kills itself once the bottle pops.
═══════════════════════════════════════════════════════ */
(function initDust() {
  if (rmq) return;

  const canvas = document.getElementById("dustCanvas");
  if (!canvas) return;
  const dc = canvas.getContext("2d");

  let W = 0, H = 0;
  const COUNT = 160;   /* enough to fill the full screen */
  const pts = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
  }

  function spawn() {
    /* Spawn across the full width AND across the full height range
       so motes appear everywhere — not just rising from the bottom */
    return {
      x:       Math.random() * W,
      y:       H + Math.random() * 60,       /* start below the fold */
      r:       0.5 + Math.random() * 1.8,    /* range: tiny to pearl-sized */
      vx:      (Math.random() - 0.5) * 0.22, /* gentle lateral drift */
      vy:      -(0.08 + Math.random() * 0.32),/* slow to moderate rise */
      life:    0,
      maxLife: 160 + Math.floor(Math.random() * 340), /* varied lifetimes */
      peak:    0.40 + Math.random() * 0.52,   /* noticeably brighter */
    };
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });

  /* Pre-scatter particles across the entire viewport so the scene
     is already alive on first frame — no "build-up" delay */
  for (let i = 0; i < COUNT; i++) {
    const p = spawn();
    p.y    = Math.random() * (H + 60);       /* spread vertically at start */
    p.life = Math.floor(Math.random() * p.maxLife);
    pts.push(p);
  }

  let dustRaf = 0;
  function tick() {
    if (popped) { dc.clearRect(0, 0, W, H); return; }

    dc.clearRect(0, 0, W, H);

    for (const p of pts) {
      p.x   += p.vx;
      p.y   += p.vy;
      p.life++;

      const t     = p.life / p.maxLife;
      /* Sine bell — smooth fade-in, hold, fade-out */
      const alpha = p.peak * Math.sin(Math.PI * t);

      if (alpha > 0.006) {
        dc.beginPath();
        dc.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        /* Slightly vary hue per particle: some lean more gold, some cream */
        const g = 190 + Math.floor(p.r * 12);
        dc.fillStyle = `rgba(232,${g},140,${alpha.toFixed(3)})`;
        dc.fill();
      }

      /* Respawn when lifetime ends or particle drifts off any edge */
      if (p.life >= p.maxLife || p.y < -12 || p.x < -10 || p.x > W + 10) {
        Object.assign(p, spawn());
      }
    }

    dustRaf = requestAnimationFrame(tick);
  }

  dustRaf = requestAnimationFrame(tick);
})();


/* ═══════════════════════════════════════════════════════
   FLOATING MIST — large soft smoke blobs on canvas.
   Uses createRadialGradient so edges feather to transparent
   naturally — zero rectangle artifacts.
   Blobs drift slowly across the mid-lower scene behind the bottle.
   Loop clears and exits once the bottle pops.
═══════════════════════════════════════════════════════ */
(function initMist() {
  if (rmq) return;

  const canvas = document.getElementById("mistCanvas");
  if (!canvas) return;
  const mc = canvas.getContext("2d");

  let W = 0, H = 0;
  const BLOB_COUNT = 8;
  const blobs = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
  }

  function spawnBlob(preScatter) {
    const maxLife = 480 + Math.floor(Math.random() * 360);
    return {
      x:       Math.random() * W,
      /* concentrate blobs in the mid-to-lower third where bottle sits */
      y:       preScatter
                 ? H * (0.30 + Math.random() * 0.50)
                 : H * (0.55 + Math.random() * 0.30),
      r:       90 + Math.random() * 130,         /* large, painterly blobs */
      vx:      (Math.random() - 0.5) * 0.20,    /* gentle lateral wander   */
      vy:      -(0.015 + Math.random() * 0.045), /* very slow rise          */
      life:    preScatter ? Math.floor(Math.random() * maxLife) : 0,
      maxLife,
      peak:    0.055 + Math.random() * 0.055,   /* keep it whisper-subtle  */
    };
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });

  /* Pre-scatter so mist is present from frame one */
  for (let i = 0; i < BLOB_COUNT; i++) blobs.push(spawnBlob(true));

  /* Glow — pulsing warm amber halo centered behind the bottle */
  let glowPhase = 0;

  function drawGlow() {
    /* Bottle now left-corner positioned: ~28% x, ~58% y */
    const cx = W * 0.28;
    const cy = H * 0.58;
    const rx = W * 0.38;   /* wide horizontal spread */
    const ry = H * 0.32;   /* moderate vertical spread */

    /* Pulse between 0.80 and 1.0 amplitude */
    glowPhase += 0.008;
    const pulse = 0.80 + 0.20 * Math.sin(glowPhase);

    /* Canvas doesn't support ellipse gradients natively —
       scale the context to squash a circle into an ellipse */
    mc.save();
    mc.scale(1, ry / rx);
    const scaledCy = cy * (rx / ry);

    const g = mc.createRadialGradient(cx, scaledCy, 0, cx, scaledCy, rx);
    g.addColorStop(0,    `rgba(201, 168,  76, ${(0.30 * pulse).toFixed(3)})`);
    g.addColorStop(0.30, `rgba(180, 130,  40, ${(0.13 * pulse).toFixed(3)})`);
    g.addColorStop(0.60, `rgba(140,  95,  25, ${(0.05 * pulse).toFixed(3)})`);
    g.addColorStop(1,    `rgba(100,  70,  15, 0)`);

    mc.beginPath();
    mc.arc(cx, scaledCy, rx, 0, Math.PI * 2);
    mc.fillStyle = g;
    mc.globalCompositeOperation = "screen";
    mc.fill();
    mc.globalCompositeOperation = "source-over";
    mc.restore();
  }

  function tick() {
    if (popped) { mc.clearRect(0, 0, W, H); return; }
    mc.clearRect(0, 0, W, H);

    drawGlow();

    for (const b of blobs) {
      b.x += b.vx;
      b.y += b.vy;
      b.life++;

      /* Sine-bell envelope — smooth fade in → hold → fade out */
      const t     = b.life / b.maxLife;
      const alpha = b.peak * Math.sin(Math.PI * t);

      if (alpha > 0.003) {
        const g = mc.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0,    `rgba(240, 232, 218, ${alpha.toFixed(4)})`);
        g.addColorStop(0.45, `rgba(220, 210, 195, ${(alpha * 0.45).toFixed(4)})`);
        g.addColorStop(1,    `rgba(200, 190, 175, 0)`);

        mc.beginPath();
        mc.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        mc.fillStyle = g;
        mc.fill();
      }

      /* Respawn when lifetime ends or blob wanders off-screen */
      if (b.life >= b.maxLife || b.y < -b.r || b.x < -b.r - 10 || b.x > W + b.r + 10) {
        Object.assign(b, spawnBlob(false));
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();


/* ═══════════════════════════════════════════════════════
   HERO → INVITE
   1. Scroll cue click → smooth-scroll to invite section.
   2. Scroll-driven parallax + fade on hero text as user
      scrolls down — text drifts up and dissolves, giving
      a cinematic handoff to the next section.
═══════════════════════════════════════════════════════ */

(function initHeroScroll() {
  const heroSection   = document.getElementById("heroSection");
  const heroText      = document.getElementById("heroText");
  const scrollCue     = document.getElementById("heroScrollCue");
  const inviteSection = document.getElementById("inviteSection");

  /* ── Click: scroll to invite ── */
  if (scrollCue && inviteSection) {
    scrollCue.addEventListener("click", () => {
      inviteSection.scrollIntoView({ behavior: "smooth" });
    });
  }

  /* ── Scroll-driven parallax ──
     progress = 0   → user is at top of hero (no change)
     progress = 1   → user has scrolled ~55% of hero height
     Hero text drifts 50px upward and fades to invisible.
  ── */
  if (rmq) return; /* skip animation for reduced-motion users */

  let heroH    = 0;
  let rafId    = 0;
  let lastY    = -1;

  function measureHero() {
    heroH = heroSection ? heroSection.offsetHeight : window.innerHeight;
  }
  measureHero();
  window.addEventListener("resize", measureHero, { passive: true });

  function applyParallax() {
    rafId = 0;
    const scrollY   = window.scrollY;
    if (scrollY === lastY) return;
    lastY = scrollY;

    const progress = Math.min(1, scrollY / (heroH * 0.55));

    /* Text parallax — drifts upward and dissolves */
    if (heroText) {
      heroText.style.transform = `translateY(${-(progress * 52).toFixed(2)}px)`;
      heroText.style.opacity   = String(
        Math.max(0, 1 - progress * 1.60).toFixed(3)
      );
    }

    /* Scroll cue — hide once user starts scrolling; only after revealed */
    if (scrollCue && scrollCue._revealed) {
      const cueOpacity = progress > 0.04 ? "0" : "1";
      if (scrollCue.style.opacity !== cueOpacity) {
        scrollCue.style.opacity      = cueOpacity;
        scrollCue.style.pointerEvents = cueOpacity === "0" ? "none" : "auto";
      }
    }
  }

  window.addEventListener("scroll", () => {
    if (!rafId) rafId = requestAnimationFrame(applyParallax);
  }, { passive: true });

  /* Run once on load in case page is already scrolled (e.g. refresh mid-page) */
  applyParallax();
})();


/* ═══════════════════════════════════════════════════════
   INVITE SECTION — Premium closed-cover opening animation

   Sequence:
   1. Section enters viewport → 600ms pause (card rests closed)
   2. Cover opens upward with 3D rotateX(-170deg), 2s duration
   3. Shadow element fades simultaneously
   4. 1.65s after open starts → text reveals bloom in, line by line
   5. Animation is one-shot; scrolling away keeps card open
   6. prefers-reduced-motion → instant final-open state
═══════════════════════════════════════════════════════ */

(function initInvite() {

  const section    = document.getElementById("inviteSection");
  const cover      = document.getElementById("invCover3d");
  const sceneWrap  = document.getElementById("invSceneWrap");
  const coverShadow = document.getElementById("invCoverShadow");
  const revealEls  = document.querySelectorAll(".inv-reveal");
  const namesWrap  = document.querySelector(".inv-names");
  const dateBlock  = document.querySelector(".inv-date-block");

  if (!section || !cover) return;

  /* ── Reduced motion: skip straight to the fully open state ── */
  if (rmq) {
    cover.classList.add("is-open");
    if (sceneWrap)   sceneWrap.classList.add("is-open");
    if (coverShadow) coverShadow.classList.add("is-open");
    revealEls.forEach(el => el.classList.add("is-in"));
    if (namesWrap) namesWrap.classList.add("is-in");
    if (dateBlock) dateBlock.classList.add("is-in");
    return;
  }

  let openTimers = [];
  let isOpen     = false;

  /* ── Close card instantly — clear all is-open / is-in classes ── */
  function closeCard() {
    openTimers.forEach(clearTimeout);
    openTimers = [];
    isOpen = false;

    cover.classList.remove("is-open");
    if (sceneWrap)   sceneWrap.classList.remove("is-open");
    if (coverShadow) coverShadow.classList.remove("is-open");
    revealEls.forEach(el => el.classList.remove("is-in"));
    if (namesWrap) namesWrap.classList.remove("is-in");
    if (dateBlock) dateBlock.classList.remove("is-in");
  }

  /* ── Open card — timed sequence matching original cadence ── */
  function openCard() {
    if (isOpen) return;
    isOpen = true;

    /* Brief pause — let guest see the closed card before it opens */
    openTimers.push(setTimeout(() => {

      /* ① Swing cover open — 3.2s ease-out */
      cover.classList.add("is-open");
      if (sceneWrap)   sceneWrap.classList.add("is-open");
      if (coverShadow) coverShadow.classList.add("is-open");

      /* ② Bloom text in while the cover is still sweeping open (~400ms in) */
      openTimers.push(setTimeout(() => {

        revealEls.forEach(el => {
          const delay = parseInt(el.dataset.delay || "0", 10);
          openTimers.push(setTimeout(() => el.classList.add("is-in"), Math.round(delay * 0.4)));
        });

        if (namesWrap) namesWrap.classList.add("is-in");
        if (dateBlock) dateBlock.classList.add("is-in");

      }, 400));

    }, 200));
  }

  /* ── Two-way observer: open on enter, close on leave ── */
  /* threshold 0.35 — fire when enough of the card is in view so
     the user actually sees the cover begin to open               */
  const invObs = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          openCard();
        } else {
          closeCard();
        }
      });
    },
    { threshold: 0.35 }
  );

  invObs.observe(section);

  /* ── Dove fade-in — appears after cover finishes opening (~3.5s) ── */
  const doveEl = section.querySelector(".inv-dove");
  if (doveEl) {
    const doveObs = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setTimeout(() => doveEl.classList.add("is-visible"), 300);
            doveObs.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );
    doveObs.observe(section);
  }

})();


/* ═══════════════════════════════════════════════════════
   CHAMPAGNE BURST — canvas physics particles.

   Four layers fired simultaneously on pop:
   1. Foam blobs  — large, cream-white, arc high then fall with gravity
   2. Gold stream — tight upward cone, amber colour, fast then slows
   3. Fine mist   — wide fan spray, tiny, fades quickly
   4. Bubbles     — tiny rings that float upward after the burst settles

   Origin is derived from bScene's live bounding rect so it works
   at every viewport size without hard-coded values.
═══════════════════════════════════════════════════════ */
(function initBurst() {
  if (rmq) return;

  const canvas = document.getElementById("burstCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0;
  const particles = [];
  let running = false;

  function resize() {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  /* Locate bottle mouth in screen coordinates.
     With the 13° CW tilt the neck is shifted ~60% across the bounding box. */
  function mouth() {
    const r = document.getElementById("bScene").getBoundingClientRect();
    return {
      x: r.left + r.width  * 0.60,
      y: r.top  + r.height * 0.08
    };
  }

  function push(opts) { particles.push(opts); }

  function spawn(ox, oy) {
    particles.length = 0;   /* clear any leftover from skip-path */

    /* ── 1. Golden champagne stream ────────────────────── */
    for (let i = 0; i < 45; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.55;
      const spd   = 7 + Math.random() * 11;
      push({
        x: ox, y: oy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        r: 1.5 + Math.random() * 4,
        grav: 0.16 + Math.random() * 0.08,
        drag: 0.968,
        life: 0, maxLife: 42 + Math.random() * 28,
        a: 0.60 + Math.random() * 0.35,
        r_: 215, g_: 178, b_: 95,    /* warm amber-gold */
        ring: false,
      });
    }

    /* ── 3. Fine mist spray ────────────────────────────── */
    for (let i = 0; i < 80; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.20;
      const spd   = 1.5 + Math.random() * 5.5;
      push({
        x: ox + (Math.random() - 0.5) * 8, y: oy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 0.6,
        r: 0.7 + Math.random() * 2.2,
        grav: 0.045 + Math.random() * 0.035,
        drag: 0.988,
        life: 0, maxLife: 28 + Math.random() * 28,
        a: 0.40 + Math.random() * 0.35,
        r_: 230, g_: 225, b_: 215,   /* off-white mist */
        ring: false,
      });
    }

    /* ── 4. Rising bubbles (staggered delay) ───────────── */
    for (let i = 0; i < 50; i++) {
      const delay = Math.floor(Math.random() * 35);
      push({
        x: ox + (Math.random() - 0.5) * 20,
        y: oy + Math.random() * 8,
        vx: (Math.random() - 0.5) * 0.55,
        vy: -(0.6 + Math.random() * 2.0),
        r: 1.2 + Math.random() * 2.8,
        grav: -0.009,   /* buoyancy — slight upward pull */
        drag: 0.994,
        life: -delay, maxLife: 75 + Math.random() * 85,
        a: 0.55 + Math.random() * 0.35,
        r_: 240, g_: 218, b_: 155,   /* pale gold ring */
        ring: true,
      });
    }
  }

  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    let alive = 0;

    for (const p of particles) {
      p.life++;
      if (p.life <= 0) { alive++; continue; } /* staggered bubble delay */

      p.vx  *= p.drag;
      p.vy   = p.vy * p.drag + p.grav;
      p.x   += p.vx;
      p.y   += p.vy;

      const t = p.life / p.maxLife;
      if (t >= 1) continue;
      alive++;

      /* Power-curve fade — stays bright, snaps off at end */
      const alpha = p.a * Math.pow(1 - t, 1.55);
      if (alpha < 0.004) continue;

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.r), 0, Math.PI * 2);

      if (p.ring) {
        ctx.strokeStyle = `rgba(${p.r_},${p.g_},${p.b_},${alpha.toFixed(3)})`;
        ctx.lineWidth   = 0.75;
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(${p.r_},${p.g_},${p.b_},${alpha.toFixed(3)})`;
        ctx.fill();
      }
    }

    if (alive > 0) {
      requestAnimationFrame(tick);
    } else {
      running = false;
      ctx.clearRect(0, 0, W, H);
    }
  }

  /* Called by triggerPop() */
  window._fireBurst = function () {
    const o = mouth();
    spawn(o.x, o.y);
    running = true;
    requestAnimationFrame(tick);
  };
})();



/* ═══════════════════════════════════════════════════════
   WEDDING CONFIG INJECTION — first IIFE in this deferred
   bundle. Runs before initEvents / initStory /           
   initThingsToKnow so those functions observe the rebuilt
   DOM, not the hardcoded placeholder cards.              
   window.__WEDDING_CONFIG__ is set in <head> by the      
   preview/site route before any script executes.         
═══════════════════════════════════════════════════════ */

window.applyWeddingConfig = function applyWeddingConfig(C) {
  /* First IIFE in this deferred bundle — all DOM elements are present
     (document fully parsed) and window.__WEDDING_CONFIG__ is already
     set from the <head> injection by the preview/site route.
     Runs before initEvents / initStory / initThingsToKnow so those
     functions observe the rebuilt DOM, not the hardcoded placeholders. */
  if (!C) return;
  window.__WEDDING_CONFIG__ = C;

  /* ── Helpers ── */
  function setText(el, v) { if (el && v) el.textContent = v; }

  /* ── Date utilities ── */
  var MONTHS      = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function ordinal(n) {
    var s = ['th','st','nd','rd'], v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  }
  function fmtDotDate(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return ordinal(+p[2]) + ' ' + MONTHS_SHORT[+p[1]-1] + ' ' + p[0];
  }
  function fmtLongDate(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return (+p[2]) + ' ' + MONTHS[+p[1]-1] + ' ' + p[0];
  }
  function fmtWeekday(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T12:00:00');
    return DAYS[d.getDay()];
  }
  function fmtTime(t24) {
    if (!t24) return '';
    var p = t24.split(':'), h = +p[0], m = p[1];
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ampm;
  }

  /* ── Event icon map (matches resolveEventIcon in preview-helpers.ts) ── */
  var ICON_MAP = {
    holy_matrimony:      'Wedding_Ceremony.webp',
    wedding_breakfast:   'Reception.webp',
    evening_celebration: 'After_Party.webp',
    bridal_shower:       'Bridal_Shower.webp',
    cocktail:            'Cocktail.webp',
    engagement:          'Engagement.webp',
    farewell_brunch:     'Farewell_Brunch.webp',
    welcome_dinner:      'Welcome_Dinner.webp',
  };

  /* ── TTK icon map ── */
  var TTK_ICON_MAP = {
    dresscode: 'Dress_Code.webp',
    parking:   'Parking.webp',
    hashtag:   'Wedding_Hashtag.webp',
    venue:     'Venue.webp',
    gifts:     'Gift_registry.webp',
    hotel:     'Stay_options.webp',
    food:      'Food.webp',
    weather:   'Weather.webp',
    transport: 'Transport.webp',
    kids:      'Kids_Welcome.webp',
    photos:    'Photography.webp',
    whatsapp:  'Whatsapp_group.webp',
  };

  var couple    = C.couple    || {};
  var invite    = C.invite    || {};
  var gallery   = C.gallery   || {};
  var story     = C.story     || {};
  var rsvp      = C.rsvp     || {};
  var music     = C.music     || {};
  var calUrls   = C.calendarUrls || {};
  var events    = C.events    || [];
  var ttkItems  = C.thingsToKnow || [];

    /* ──────────────────────────────────────
       HERO
    ────────────────────────────────────── */
    setText(document.querySelector('#htBride .ht-name-inner'), couple.bride);
    setText(document.querySelector('#htGroom .ht-name-inner'), couple.groom);
    var htDateEl = document.getElementById('htDate');
    if (htDateEl && couple.date) htDateEl.innerHTML = fmtDotDate(couple.date).replace(/·/g, '&middot;');
    setText(document.getElementById('htVenue'), couple.venue);

    /* Update aria-label on hero text */
    var heroText = document.getElementById('heroText');
    if (heroText && couple.bride && couple.groom) {
      heroText.setAttribute('aria-label', couple.bride + ' and ' + couple.groom + (couple.date ? ', ' + fmtLongDate(couple.date) : ''));
    }

    /* Bottle label initials */
    var initials = document.querySelectorAll('.bl-initial');
    if (initials.length >= 2 && couple.bride && couple.groom) {
      initials[0].textContent = couple.bride.charAt(0).toUpperCase();
      initials[initials.length - 1].textContent = couple.groom.charAt(0).toUpperCase();
    }

    /* ──────────────────────────────────────
       INVITATION
    ────────────────────────────────────── */
    /* Show / hide invite section */
    var inviteSectionEl = document.getElementById('inviteSection');
    if (invite.show === false && inviteSectionEl) { inviteSectionEl.style.display = 'none'; }

    /* Parent lines — join father & mother pairs */
    var p1Parts = [invite.brideFather, invite.brideMother].filter(Boolean);
    var p2Parts = [invite.groomFather, invite.groomMother].filter(Boolean);
    var brideParentsEl = document.getElementById('invBrideParents');
    var groomParentsEl = document.getElementById('invGroomParents');
    if (brideParentsEl && p1Parts.length) brideParentsEl.textContent = p1Parts.join(' & ');
    if (groomParentsEl && p2Parts.length) groomParentsEl.textContent = p2Parts.join(' & ');

    /* Grandparents — show block only when enabled */
    if (invite.showGrandparents) {
      var gp1Parts = [invite.brideGF, invite.brideGM].filter(Boolean);
      var gp2Parts = [invite.groomGF, invite.groomGM].filter(Boolean);
      if (gp1Parts.length || gp2Parts.length) {
        var gpSection = document.getElementById('invGrandparents');
        if (gpSection) {
          gpSection.style.display = '';
          setText(document.getElementById('invBrideGP'), gp1Parts.join(' & '));
          setText(document.getElementById('invGroomGP'), gp2Parts.join(' & '));
        }
      }
    }

    /* Blessing text — replaces the default formal request line if provided */
    var blessingEl = document.getElementById('invRequest');
    if (blessingEl && invite.blessing) {
      blessingEl.innerHTML = invite.blessing.replace(/\n/g, '<br>');
    }

    setText(document.getElementById('invName1'), couple.bride);
    setText(document.getElementById('invName2'), couple.groom);

    /* ──────────────────────────────────────
       EVENTS — rebuild from config if present
    ────────────────────────────────────── */
    var evGrid = document.getElementById('evGrid');
    if (evGrid && events.length > 0) { try {
      evGrid.innerHTML = '';
      events.forEach(function(ev, i) {
        var isOdd  = (i % 2 === 0);
        var delay  = i * 150;

        /* Resolve icon — ev.icon is the full URL from buildConfigData; fallback to local path */
        var iconSrc = ev.icon || ('assets/Events/' + (ICON_MAP[ev.id] || 'Custom_1.webp'));

        /* Maps link */
        var mapsHtml = ev.mapsLink
          ? '<a class="ev-card-maps" href="' + ev.mapsLink + '" target="_blank" rel="noopener">' +
            '<svg width="12" height="15" viewBox="0 0 9 11" fill="none" aria-hidden="true"><path d="M4.5 0C2.57 0 1 1.57 1 3.5C1 6.125 4.5 10.5 4.5 10.5S8 6.125 8 3.5C8 1.57 6.43 0 4.5 0ZM4.5 4.75C3.81 4.75 3.25 4.19 3.25 3.5C3.25 2.81 3.81 2.25 4.5 2.25C5.19 2.25 5.75 2.81 5.75 3.5C5.75 4.19 5.19 4.75 4.5 4.75Z" fill="currentColor"/></svg>Open in Maps</a>'
          : '';

        /* Description — styled as italic note between time and venue */
        var descHtml = ev.desc
          ? '<p class="ev-card-desc" style="font-size:1.12rem;color:rgba(60,42,12,0.58);line-height:1.65;margin:5px 0;padding:0 5%;font-style:italic;font-family:inherit;text-align:center;">' + ev.desc + '</p>'
          : '';

        /* Cupid decoration — alternates left / right */
        var cupidHtml = isOdd
          ? '<div class="ev-card-cupid" aria-hidden="true">' +
            '<div class="ev-cupid-clip"><img src="assets/Events/Cupid.webp" alt="" draggable="false" decoding="async" loading="lazy"></div>' +
            '<div class="ev-cupid-petal-wrap"><img class="ev-cupid-petal" src="assets/Events/petal.webp" alt="" draggable="false" decoding="async" loading="lazy"></div>' +
            '<div class="ev-cupid-petal-wrap"><img class="ev-cupid-petal" src="assets/Events/petal.webp" alt="" draggable="false" decoding="async" loading="lazy"></div>' +
            '<div class="ev-cupid-petal-wrap"><img class="ev-cupid-petal" src="assets/Events/petal.webp" alt="" draggable="false" decoding="async" loading="lazy"></div>' +
            '<div class="ev-cupid-petal-wrap"><img class="ev-cupid-petal" src="assets/Events/petal.webp" alt="" draggable="false" decoding="async" loading="lazy"></div>' +
            '<div class="ev-cupid-petal-wrap"><img class="ev-cupid-petal" src="assets/Events/petal.webp" alt="" draggable="false" decoding="async" loading="lazy"></div>' +
            '</div>'
          : '<div class="ev-card-cupid-right" aria-hidden="true">' +
            '<div class="ev-cupid-clip"><img src="assets/Events/Cupid_right.webp" alt="" draggable="false" decoding="async" loading="lazy"></div>' +
            '<div class="ev-cupid-arrow-wrap"><img class="ev-cupid-arrow" src="assets/Events/Arrow.webp" alt="" draggable="false" decoding="async" loading="lazy"></div>' +
            '</div>';

        var evDate = ev.date ? fmtLongDate(ev.date) : '';
        var evTime = ev.time ? fmtTime(ev.time) : '';

        var cardHtml =
          '<div class="ev-card-wrap ev-reveal" data-delay="' + delay + '">' +
          cupidHtml +
          '<div class="ev-card">' +
          '<img class="ev-card-img" src="assets/Events/Event_Card.webp" alt="" decoding="async" loading="lazy" draggable="false">' +
          '<div class="ev-card-body">' +
          '<div class="ev-card-illus"><img src="' + iconSrc + '" alt="' + (ev.name || '') + '" decoding="async" loading="lazy" draggable="false"></div>' +
          '<p class="ev-card-label">' + (ev.name || '') + '</p>' +
          '<p class="ev-card-date">' + evDate + '</p>' +
          '<div class="ev-card-rule" aria-hidden="true"></div>' +
          '<p class="ev-card-time">' + evTime + '</p>' +
          descHtml +
          '<p class="ev-card-venue">' + (ev.venue || '') + '</p>' +
          mapsHtml +
          '</div></div></div>';

        evGrid.insertAdjacentHTML('beforeend', cardHtml);
      });
    } catch(e){} }

    /* ──────────────────────────────────────
       STORY
    ────────────────────────────────────── */
    var storySection = document.getElementById('storySection');
    if (story.show === false) {
      if (storySection) storySection.style.display = 'none';
    } else {
      var storyMode = story.storyMode || 'story';
      var stLetterBody = document.getElementById('stLetterBody');

      if (storyMode === 'tags') {
        /* Tags mode — replace letter body with hashtag + personality tag chips */
        var stTags   = story.tags || [];
        var stHashtag = story.customHashtag || couple.hashtag ||
          (couple.bride && couple.groom
            ? '#' + couple.bride.replace(/\s+/g, '') + 'Wed' + couple.groom.replace(/\s+/g, '')
            : '');

        if (stLetterBody) {
          stLetterBody.innerHTML = '';

          /* Hashtag */
          if (stHashtag) {
            var hashEl = document.createElement('p');
            hashEl.className = 'st-signature';
            hashEl.style.marginBottom = '20px';
            hashEl.textContent = stHashtag;
            stLetterBody.appendChild(hashEl);
          }

          /* Tag chips */
          if (stTags.length > 0) {
            var tagsWrap = document.createElement('div');
            tagsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding:0 8px;margin-bottom:20px;';
            stTags.forEach(function(tag) {
              var chip = document.createElement('span');
              chip.style.cssText = 'display:inline-block;padding:6px 16px;border:1px solid rgba(148,118,76,0.45);border-radius:20px;font-size:0.83rem;color:rgba(60,42,12,0.72);background:rgba(201,168,76,0.07);letter-spacing:0.04em;font-family:inherit;';
              chip.textContent = tag;
              tagsWrap.appendChild(chip);
            });
            stLetterBody.appendChild(tagsWrap);
          }

          /* Signature */
          if (couple.bride && couple.groom) {
            var sigTagEl = document.createElement('p');
            sigTagEl.className = 'st-signature';
            sigTagEl.innerHTML = 'With love,<br>' + couple.bride + ' &amp; ' + couple.groom;
            stLetterBody.appendChild(sigTagEl);
          }
        }
      } else {
        /* Story mode — fill .st-line elements with sentences */
        var storyText = story.storyText || '';
        if (storyText) {
          var sentences = storyText.match(/[^.!?]+[.!?]?/g) || [storyText];
          sentences = sentences.map(function(s) { return s.trim(); }).filter(Boolean);
          var stLines = document.querySelectorAll('.st-line');
          stLines.forEach(function(line, idx) {
            if (sentences[idx] !== undefined) line.textContent = sentences[idx];
            else line.style.display = 'none';
          });
        }
        /* Signature — always update with couple names */
        var sigEl = document.querySelector('.st-signature');
        if (sigEl && couple.bride && couple.groom) {
          sigEl.innerHTML = 'With love,<br>' + couple.bride + ' &amp; ' + couple.groom;
        }
      }
    }

    /* ──────────────────────────────────────
       GALLERY
    ────────────────────────────────────── */
    var gallerySection = document.getElementById('gallerySection');
    if (gallery.show === false || gallery.layout === 'skip') {
      if (gallerySection) gallerySection.style.display = 'none';
    } else {
      /* Keep only real uploads — the builder pads the photos array with empty
         strings / sparse holes for un-filled slots (e.g. [url,"","",""] or
         [null,url]). Counting raw .length would leave demo frames showing. */
      var photos = (gallery.photos || []).filter(function(p) { return !!p; });
      /* Frames to show = number of real photos (1–4). The HTML hardcodes
         data-count="4"; without updating it the unfilled frames keep their
         Demo_2/3/4 images and demo photos leak into the user's gallery. When
         there are zero real photos we leave the 4 demo frames as a placeholder
         (matching the no-upload preview behaviour). */
      if (photos.length > 0) {
        var pcount = Math.min(4, photos.length);
        if (gallerySection) gallerySection.setAttribute('data-count', String(pcount));
        /* Fill order must match which frames CSS keeps visible per data-count
           (see .gallery[data-count="N"] rules in style.css):
             1 → hero            2 → hero + bottom
             3 → hero+left+right 4 → all four                          */
        var FILL_ORDER = {
          1: ['glHero'],
          2: ['glHero', 'glBottom'],
          3: ['glHero', 'glLeft', 'glRight'],
          4: ['glHero', 'glLeft', 'glRight', 'glBottom'],
        };
        FILL_ORDER[pcount].forEach(function(fid, i) {
          var frameEl = document.getElementById(fid);
          if (!frameEl) return;
          var img = frameEl.querySelector('img');
          if (img && photos[i]) { img.src = photos[i]; img.removeAttribute('onerror'); }
        });
      }
    }

    /* ──────────────────────────────────────
       THINGS TO KNOW
    ────────────────────────────────────── */
    var ttkSection = document.getElementById('ttkSection');
    var ttkGrid = document.getElementById('ttkGrid');
    if (C.showThingsToKnow === false) {
      if (ttkSection) ttkSection.style.display = 'none';
    } else if (ttkGrid) {
      ttkGrid.innerHTML = '';
      ttkItems.forEach(function(item, i) {
        var imgFile = item.iconKey || TTK_ICON_MAP[item.id] || 'Custom_1.webp';
        var num = String(i + 1).padStart(2, '0');
        var li = document.createElement('li');
        li.className = 'ttk-card';
        li.setAttribute('role', 'listitem');
        li.dataset.delay = String(i * 110);
        li.innerHTML =
          '<div class="ttk-card-shine" aria-hidden="true"></div>' +
          '<span class="ttk-card-num" aria-hidden="true">' + num + '</span>' +
          '<div class="ttk-card-inner">' +
          '<div class="ttk-card-icon-wrap" aria-hidden="true">' +
          '<span class="ttk-card-icon-ring"></span>' +
          '<span class="ttk-card-icon-ring ttk-card-icon-ring--outer"></span>' +
          '<div class="ttk-card-icon">' +
          '<img src="assets/TTK/' + imgFile + '" alt="" class="ttk-card-img" loading="lazy" draggable="false">' +
          '</div></div>' +
          '<p class="ttk-card-label">' + (item.label || '') + '</p>' +
          '<span class="ttk-card-rule" aria-hidden="true"></span>' +
          '<p class="ttk-card-body">' + (item.value || '') + '</p>' +
          '</div>';
        /* 3D tilt on hover */
        li.addEventListener('mousemove', function(e) {
          if (!li.classList.contains('is-in')) return;
          var r = li.getBoundingClientRect();
          var dx = (e.clientX - (r.left + r.width  * 0.5)) / (r.width  * 0.5);
          var dy = (e.clientY - (r.top  + r.height * 0.5)) / (r.height * 0.5);
          li.style.transform = 'translateY(-7px) perspective(700px) rotateX(' + (-dy * 4).toFixed(2) + 'deg) rotateY(' + (dx * 4).toFixed(2) + 'deg)';
        });
        li.addEventListener('mouseleave', function() { li.style.transform = ''; });
        ttkGrid.appendChild(li);
      });

      /* Re-wire IntersectionObserver for TTK cards */
      var ttkCards = ttkGrid.querySelectorAll('.ttk-card');
      var ttkObs = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var d = parseInt(el.dataset.delay || '0', 10);
          setTimeout(function() { el.classList.add('is-in'); }, d);
          ttkObs.unobserve(el);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      ttkCards.forEach(function(el) { ttkObs.observe(el); });
    }

    /* ──────────────────────────────────────
       RSVP
    ────────────────────────────────────── */
    setText(document.querySelector('.rsvp-title'), rsvp.heading);
    var rsvpBodyEl = document.querySelector('.rsvp-body');
    if (rsvpBodyEl && rsvp.subtext) {
      rsvpBodyEl.innerHTML = rsvp.subtext.replace(/\n/g, '<br>');
    }
    var rsvpBtn = document.querySelector('.rsvp-btn');
    var rsvpHelper = document.querySelector('.rsvp-helper');
    if (rsvpBtn) {
      if (rsvp.mode === 'form' && rsvp.form_url) {
        rsvpBtn.setAttribute('href', rsvp.form_url);
        if (rsvpHelper) rsvpHelper.textContent = "You'll be redirected to our RSVP form.";
      } else if (couple.whatsapp) {
        var waText = rsvp.waMessage || ('Hi ' + (couple.bride || '') + ' & ' + (couple.groom || '') + '! I would love to join your celebration!');
        var waMsg = encodeURIComponent(waText);
        rsvpBtn.setAttribute('href', 'https://wa.me/' + couple.whatsapp + '?text=' + waMsg);
        if (rsvpHelper) rsvpHelper.textContent = "You'll be redirected to WhatsApp to confirm your attendance.";
      }
      if (rsvp.btnText) rsvpBtn.textContent = rsvp.btnText;
    }
    /* Calendar buttons */
    var calBtns = document.querySelectorAll('.rsvp-cal-btn');
    if (calUrls.google && calBtns[0]) calBtns[0].setAttribute('href', calUrls.google);
    if (calUrls.apple  && calBtns[1]) {
      calBtns[1].setAttribute('href', calUrls.apple);
      var dn = ((couple.bride || '').replace(/\s+/g, '') + (couple.groom || '').replace(/\s+/g, '') + 'Wedding.ics');
      calBtns[1].setAttribute('download', dn);
    }

    /* ──────────────────────────────────────
       FOOTER
    ────────────────────────────────────── */
    var ftNames = document.querySelectorAll('.ft-name');
    if (ftNames[0] && couple.bride) ftNames[0].textContent = couple.bride;
    if (ftNames[1] && couple.groom) ftNames[1].textContent = couple.groom;
    var ftDateEl = document.querySelector('.ft-date');
    if (ftDateEl && couple.date) ftDateEl.innerHTML = fmtDotDate(couple.date).replace(/·/g, '&middot;');

    /* ──────────────────────────────────────
       MUSIC
    ────────────────────────────────────── */
    var bgMusicEl = document.getElementById('bgMusic');
    if (bgMusicEl && music.src) bgMusicEl.src = music.src;

    /* Update page title */
    if (couple.bride && couple.groom) {
      document.title = couple.bride + ' & ' + couple.groom + ' — A Christian Wedding';
    }

    /* Re-apply hero + footer date after DOMContentLoaded so this format wins
       over the server-injected preloader which fires its own DOMContentLoaded
       listener and overwrites #htDate with a plain "12 December 2026" string. */
    var _couple = couple;
    var _fmtDotDate = fmtDotDate;
    document.addEventListener('DOMContentLoaded', function() {
      if (_couple.date) {
        var _htDate = document.getElementById('htDate');
        if (_htDate) _htDate.innerHTML = _fmtDotDate(_couple.date);
        var _ftDate = document.querySelector('.ft-date');
        if (_ftDate) _ftDate.innerHTML = _fmtDotDate(_couple.date);
      }
    });
};
window.applyWeddingConfig(window.__WEDDING_CONFIG__);

/* ═══════════════════════════════════════════════════════
   EVENTS SECTION — Scroll-triggered reveals + cupid
═══════════════════════════════════════════════════════ */

window.initEvents = function initEvents() {
  const evSection = document.getElementById("eventsSection");
  if (!evSection) return;

  /* Card + header scroll reveals */
  const revealEls = evSection.querySelectorAll(".ev-reveal");
  revealEls.forEach(el => el.classList.remove("is-in"));

  const evObs = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el    = entry.target;
        const delay = parseInt(el.dataset.delay || "0", 10);
        setTimeout(() => el.classList.add("is-in"), delay);
        evObs.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  revealEls.forEach(el => evObs.observe(el));
};
window.initEvents();


/* ═══════════════════════════════════════════════════════
   STORY SECTION — Scroll-driven colour reveal

   All story text is always visible in a faded parchment tone.
   As the user scrolls and each element enters the reading zone,
   it "comes alive" with a colour fill animation + glow.

   Each element is observed individually so lines light up one
   by one as they scroll into view rather than all at once.
   When multiple lines enter view simultaneously (e.g. on first
   load or on a large screen) a 90ms index-based stagger makes
   them cascade top-to-bottom in a natural reading rhythm.
═══════════════════════════════════════════════════════ */

window.initStory = function initStory() {
  const stSection = document.getElementById("storySection");
  if (!stSection) return;

  /* ── Header reveals — unchanged staggered pattern ── */
  const headerEls = stSection.querySelectorAll(".st-reveal");
  headerEls.forEach(el => el.classList.remove("is-in"));

  const hObs = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el    = entry.target;
        const delay = parseInt(el.dataset.delay || "0", 10);
        setTimeout(() => el.classList.add("is-in"), delay);
        hObs.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  headerEls.forEach(el => hObs.observe(el));

  /* ── Story elements — individual colour-alive observers ── */
  const storyEls = stSection.querySelectorAll(
    ".st-line, .st-letter-divider, .st-signature"
  );
  storyEls.forEach(el => el.classList.remove("is-in"));

  /*
    Pre-assign a DOM-order stagger (90ms per element) so that when
    multiple elements enter the viewport at the same moment they
    cascade top-to-bottom rather than flashing all at once.
  */
  storyEls.forEach((el, i) => {
    el.dataset.stagger = String(i * 200);
  });

  const lineObs = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el      = entry.target;
        const stagger = parseInt(el.dataset.stagger || "0", 10);
        setTimeout(() => el.classList.add("is-in"), stagger);
        lineObs.unobserve(el);
      });
    },
    /*
      threshold 0.5  — fire when the element is half in the reading zone.
      rootMargin -60px bottom — elements trigger before hitting the very
      bottom edge of the viewport, so they light up while the user is
      actively reading them, not after they've scrolled past.
    */
    { threshold: 0.5, rootMargin: "0px 0px -60px 0px" }
  );

  storyEls.forEach(el => lineObs.observe(el));
};
window.initStory();


/* ═══════════════════════════════════════════════════════
   GALLERY SECTION — Sticky scroll-driven cinematic reveal

   The section is 230svh tall. .gl-stage is sticky.
   A single rAF-throttled scroll listener maps scroll
   progress (0–1) through the track to three animation
   acts, applying inline transforms directly — no CSS
   transitions involved (they would create lag).

   Acts:
     a1  (0.00–0.09)  Hero blooms from darkness
     a2  (0.09–0.54)  Hero scale settles; sides sweep in
     a3  (0.54–0.84)  Panorama rises from below

   Once p > 0.88 all inline styles are cleared and CSS
   float animations take over.  If user scrolls back the
   scroll driver resumes control.
═══════════════════════════════════════════════════════ */

(function initGallery() {
  const section = document.getElementById("gallerySection");
  if (!section) return;

  const stage = document.getElementById("glStage");

  /* ── Header scroll reveals — unchanged ── */
  const headerEls = section.querySelectorAll(".gl-reveal");
  const hObs = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el    = entry.target;
        const delay = parseInt(el.dataset.delay || "0", 10);
        setTimeout(() => el.classList.add("is-in"), delay);
        hObs.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  headerEls.forEach(el => hObs.observe(el));

  if (!stage) return;

  /* ── Reduced motion: show frames static, skip rotation ── */
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    /* Show all frames flat — reset their 3D positions */
    const frames = stage.querySelectorAll(".gl-frame");
    frames.forEach((f, i) => {
      f.style.position = "relative";
      f.style.transform = "none";
      f.style.margin = "0 auto 1rem";
      f.classList.add("is-glowing");
    });
    stage.style.height = "auto";
    stage.style.width = "100%";
    stage.style.display = "flex";
    stage.style.flexDirection = "column";
    stage.style.alignItems = "center";
    return;
  }

  /* ── Start carousel when section enters viewport, pause when it leaves ── */
  const carouselObs = new IntersectionObserver(
    ([entry]) => {
      if (!stage) return;
      if (entry.isIntersecting) {
        stage.style.animationPlayState = "running";
        /* Light up glow halos once carousel starts */
        stage.querySelectorAll(".gl-frame").forEach(f => f.classList.add("is-glowing"));
      } else {
        stage.style.animationPlayState = "paused";
      }
    },
    { threshold: 0.15 }
  );

  carouselObs.observe(section);
})();

/* ═══════════════════════════════════════════════════════
   THINGS TO KNOW — data-driven cards
   Each card: { icon (SVG path string), label, body }
   Add, remove or edit cards freely — the grid reflows.
═══════════════════════════════════════════════════════ */

(function initThingsToKnow() {

  const grid = document.getElementById("ttkGrid");
  if (!grid) return;

  /* applyWeddingConfig() is the first IIFE in this deferred bundle and
     runs before initThingsToKnow. When config is present it has already
     rebuilt the grid from the user's thingsToKnow — skip the hardcoded
     default build and jump straight to wiring up animation observers.
     Without config (direct file open) fall through and build the default cards. */
  if (!window.__WEDDING_CONFIG__) {

  /* ── Card data (image-based) ────────────────────────── */
  const TTK_CARDS = [
    { label: "Dress Code",    img: "Dress_Code.webp",    body: "Smart formal — florals and pastels for ladies, lounge suit for gentlemen. Please avoid all-white." },
    { label: "Venue",         img: "Venue.webp",         body: "Please be seated by 10:45 AM. Ceremony is at 11:00 AM sharp and is unplugged — kindly silence phones." },
    { label: "Stay Options",  img: "Stay_options.webp",  body: "Rooms reserved at Vivanta Goa. Mention the wedding when booking for special rates." },
    { label: "Gift Registry", img: "Gift_registry.webp", body: "Your presence is our greatest gift. A registry is available on request." },
  ];

  /* ── Build and inject each card ─────────────────────── */
  TTK_CARDS.forEach((card, i) => {
    const li = document.createElement("li");
    li.className  = "ttk-card";
    li.setAttribute("role", "listitem");
    li.dataset.delay = String(i * 110);

    const num = String(i + 1).padStart(2, "0");

    li.innerHTML = `
      <div  class="ttk-card-shine" aria-hidden="true"></div>
      <span class="ttk-card-num"   aria-hidden="true">${num}</span>
      <div  class="ttk-card-inner">
        <div class="ttk-card-icon-wrap" aria-hidden="true">
          <span class="ttk-card-icon-ring"></span>
          <span class="ttk-card-icon-ring ttk-card-icon-ring--outer"></span>
          <div  class="ttk-card-icon">
            <img src="assets/TTK/${card.img}" alt="" class="ttk-card-img" loading="lazy" draggable="false">
          </div>
        </div>
        <p   class="ttk-card-label">${card.label}</p>
        <span class="ttk-card-rule" aria-hidden="true"></span>
        <p   class="ttk-card-body">${card.body}</p>
      </div>
    `;

    /* ── 3D perspective tilt on mouse move ── */
    li.addEventListener("mousemove", e => {
      if (!li.classList.contains("is-in")) return;
      const r  = li.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width  * 0.5)) / (r.width  * 0.5);
      const dy = (e.clientY - (r.top  + r.height * 0.5)) / (r.height * 0.5);
      li.style.transform =
        `translateY(-7px) perspective(700px) rotateX(${(-dy * 4).toFixed(2)}deg) rotateY(${(dx * 4).toFixed(2)}deg)`;
    });

    li.addEventListener("mouseleave", () => {
      li.style.transform = "";
    });

    grid.appendChild(li);
  });

  } // end if (!window.__WEDDING_CONFIG__)


  /* ── Header reveals ─────────────────────────────────── */
  const section   = document.getElementById("ttkSection");
  const headerEls = section.querySelectorAll(".ttk-reveal");

  const hObs = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el    = entry.target;
        const delay = parseInt(el.dataset.delay || "0", 10);
        setTimeout(() => el.classList.add("is-in"), delay);
        hObs.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  headerEls.forEach(el => hObs.observe(el));


  /* ── Card reveals — staggered IntersectionObserver ──── */
  const cards = grid.querySelectorAll(".ttk-card");

  const cObs = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el    = entry.target;
        const delay = parseInt(el.dataset.delay || "0", 10);
        setTimeout(() => el.classList.add("is-in"), delay);
        cObs.unobserve(el);
      });
    },
    { threshold: 0.10, rootMargin: "0px 0px -30px 0px" }
  );

  cards.forEach(card => cObs.observe(card));

})();



/* ═══════════════════════════════════════════════════════
   RSVP SECTION
   — Full-bleed video: plays when section enters viewport,
     pauses when it leaves. Respects prefers-reduced-motion.
   — Cinematic text: each .rsvp-reveal element fades+slides
     up with its own data-delay, all triggered the moment
     the section crosses the intersection threshold.
═══════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const rsvpSection = document.getElementById("rsvpSection");
  if (!rsvpSection) return;

  const rsvpVideo   = document.getElementById("rsvpVideo");
  const revealEls   = rsvpSection.querySelectorAll(".rsvp-reveal");
  let   revealed    = false;   // fire text animations once only

  /* ── Reduced-motion preference ─────────────────────── */
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  // If reduced-motion: pause video after first frame, skip all animations
  if (rsvpVideo && prefersReduced.matches) {
    rsvpVideo.addEventListener("loadeddata", () => rsvpVideo.pause(), { once: true });
  }

  /* ── Reveal helper ──────────────────────────────────── */
  function triggerReveals() {
    if (revealed) return;
    revealed = true;
    revealEls.forEach(el => {
      const delay = parseInt(el.dataset.delay || "0", 10);
      setTimeout(() => el.classList.add("is-in"), delay);
    });
  }

  /* ── Single IntersectionObserver — video + text ─────── */
  // threshold 0.15 = fire when 15% of section is visible,
  // so the cake is already comfortably in frame when text starts.
  const obs = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {

          // ① Start cinematic text sequence (once)
          if (!prefersReduced.matches) triggerReveals();
          else revealEls.forEach(el => el.classList.add("is-in"));

          // ② Play video
          if (rsvpVideo && !prefersReduced.matches) {
            rsvpVideo.play().catch(() => {});
          }

        } else {
          // Pause video when section leaves viewport — saves battery/CPU
          if (rsvpVideo) rsvpVideo.pause();
        }
      });
    },
    { threshold: 0.15 }
  );

  obs.observe(rsvpSection);

})();


/* ═══════════════════════════════════════════════════════
   BOUQUET — Scroll-driven parallax + fade-in reveal
   Floats gently and moves at 40% of scroll speed giving
   a depth/parallax feel as the story section scrolls by.
═══════════════════════════════════════════════════════ */
(function initBouquet() {
  const wrap    = document.getElementById("stBouquetWrap");
  const section = document.getElementById("storySection");
  if (!wrap || !section) return;

  /* Fade in when it enters the viewport */
  const obs = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        wrap.classList.add("is-in");
        obs.unobserve(wrap);
      }
    },
    { threshold: 0.18 }
  );
  obs.observe(wrap);

  /* Scroll parallax — skip for reduced-motion users */
  if (rmq) return;

  let rafId = 0;

  function applyParallax() {
    rafId = 0;
    const rect  = section.getBoundingClientRect();
    const vh    = window.innerHeight;
    /* progress: 0 when section top hits viewport top, 1 when bottom exits */
    const range = rect.height + vh;
    const pos   = vh - rect.top;
    const t     = Math.max(0, Math.min(1, pos / range));
    /* Bouquet moves at 40% scroll speed — creates subtle depth */
    const shift = (t - 0.5) * -50;
    wrap.style.setProperty("--parallax-y", `${shift.toFixed(2)}px`);
  }

  window.addEventListener("scroll", () => {
    if (!rafId) rafId = requestAnimationFrame(applyParallax);
  }, { passive: true });

  applyParallax();
})();


/* ═══════════════════════════════════════════════════════
   STORY — Petal shower
   Spawns petal_1 (lavender) and petal_2 (white) alternately.
   Dual-wrapper trick: outer handles horizontal sway,
   inner handles vertical fall + rotation — avoids transform conflict.
═══════════════════════════════════════════════════════ */
(function initPetalShower() {
  const container = document.getElementById("stPetalShower");
  const section   = document.getElementById("storySection");
  if (!container || !section) return;
  if (rmq) return; /* respect prefers-reduced-motion */

  const SRCS = [
    "assets/Meet the couple/petal_1.webp",
    "assets/Meet the couple/petal_2.webp"
  ];

  let timer   = null;
  let running = false;

  function rnd(min, max) { return min + Math.random() * (max - min); }
  function pick(arr)     { return arr[Math.floor(Math.random() * arr.length)]; }
  function signed()      { return Math.random() > 0.5 ? 1 : -1; }

  function spawnPetal() {
    const outer = document.createElement("div");
    outer.className = "st-petal";

    const inner = document.createElement("div");
    inner.className = "st-petal-inner";

    const img = document.createElement("img");
    img.src       = pick(SRCS);
    img.alt       = "";
    img.draggable = false;

    const size    = rnd(20, 40);                               /* px  */
    const xStart  = rnd(0, 100);                              /* %   */
    const fallDur = rnd(12, 20);                              /* s — slow cinematic fall */
    const swayDur = rnd(3.5, 6.5);                            /* s — one full oscillation */
    const rotEnd  = signed() * rnd(120, 300);                 /* deg */
    const swayA   = (signed() * rnd(10, 24)).toFixed(1) + "px"; /* sine amplitude */

    img.style.width = size + "px";

    inner.style.cssText =
      `--petal-rot:${rotEnd}deg;` +
      `animation:stPetalFall ${fallDur.toFixed(2)}s linear forwards;`;

    outer.style.cssText =
      `left:${xStart.toFixed(1)}%;top:-55px;` +
      `--sway-a:${swayA};` +
      `animation:stPetalSway ${swayDur.toFixed(2)}s linear infinite;`;

    inner.appendChild(img);
    outer.appendChild(inner);
    container.appendChild(outer);

    setTimeout(() => outer.remove(), (fallDur + 0.6) * 1000);
  }

  function start() {
    if (running) return;
    running = true;
    spawnPetal();
    timer = setInterval(spawnPetal, 900);
  }

  function stop() {
    if (!running) return;
    running = false;
    clearInterval(timer);
    timer = null;
  }

  const obs = new IntersectionObserver(
    entries => entries.forEach(e => e.isIntersecting ? start() : stop()),
    { threshold: 0.08 }
  );
  obs.observe(section);
})();


/* ═══════════════════════════════════════════════════════
   NAVIGATION CLUSTER
   Slide-up section menu, fixed above the music button.
   Revealed via exitIntro(). Active item tracks viewport.
═══════════════════════════════════════════════════════ */

window.initNav = function initNav() {
  const cluster  = document.getElementById("navCluster");
  const toggle   = document.getElementById("navToggle");
  const menu     = document.getElementById("navMenu");
  const menuList = document.getElementById("navMenuList");
  if (!cluster || !toggle || !menu || !menuList) return;

  const SECTIONS = [
    { id: "heroSection",    label: "The Couple"     },
    { id: "inviteSection",  label: "Invitation"     },
    { id: "eventsSection",  label: "Events"         },
    { id: "storySection",   label: "Our Story"      },
    { id: "gallerySection", label: "Gallery"        },
    { id: "ttkSection",     label: "Things to Know" },
    { id: "rsvpSection",    label: "RSVP"           },
  ];

  /* ── Build menu items ── */
  menuList.innerHTML = "";
  let activeIndex = 1;
  SECTIONS.forEach((sec) => {
    const targetEl = document.getElementById(sec.id);
    if (targetEl && targetEl.style.display === 'none') return; // skip hidden sections

    const li  = document.createElement("li");
    const btn = document.createElement("button");
    btn.className      = "nav-item";
    btn.dataset.target = sec.id;
    btn.setAttribute("aria-label", `Scroll to ${sec.label}`);
    btn.innerHTML =
      `<span class="nav-num">${String(activeIndex++).padStart(2, "0")}</span>` +
      `<span class="nav-label">${sec.label}</span>`;

    btn.addEventListener("click", () => {
      const target = document.getElementById(sec.id);
      if (target) target.scrollIntoView({ behavior: "smooth" });
      closeMenu();
    });

    li.appendChild(btn);
    menuList.appendChild(li);
  });

  /* ── Open / close ── */
  let isOpen = false;

  function openMenu() {
    isOpen = true;
    menu.classList.add("is-open");
    toggle.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close navigation");
  }

  function closeMenu() {
    isOpen = false;
    menu.classList.remove("is-open");
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
  }

  // Clear previous listeners by replacing the elements with their clones
  const newToggle = toggle.cloneNode(true);
  toggle.parentNode.replaceChild(newToggle, toggle);
  newToggle.addEventListener("click", () => isOpen ? closeMenu() : openMenu());

  /* Close when clicking anywhere outside the cluster */
  if (!window.__nav_outside_click_registered__) {
    document.addEventListener("click", e => {
      const currentMenu = document.getElementById("navMenu");
      const currentToggle = document.getElementById("navToggle");
      const currentCluster = document.getElementById("navCluster");
      if (currentMenu && currentMenu.classList.contains("is-open") && currentCluster && !currentCluster.contains(e.target)) {
        currentMenu.classList.remove("is-open");
        if (currentToggle) {
          currentToggle.classList.remove("is-open");
          currentToggle.setAttribute("aria-expanded", "false");
          currentToggle.setAttribute("aria-label", "Open navigation");
        }
        isOpen = false;
      }
    }, { passive: true });
    window.__nav_outside_click_registered__ = true;
  }

  /* ── Active section tracker ── */
  if (window.__nav_observer__) {
    window.__nav_observer__.disconnect();
  }

  const navObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      const currentMenuList = document.getElementById("navMenuList");
      if (currentMenuList) {
        currentMenuList.querySelectorAll(".nav-item").forEach(btn => {
          btn.classList.toggle("is-active", btn.dataset.target === id);
        });
      }
    });
  }, { threshold: 0.35 });

  window.__nav_observer__ = navObs;

  SECTIONS.forEach(sec => {
    const el = document.getElementById(sec.id);
    if (el && el.style.display !== 'none') navObs.observe(el);
  });
};
window.initNav();


/* ═══════════════════════════════════════════════════════
   FOOTER — Staggered scroll reveal
═══════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const footer = document.getElementById("siteFooter");
  if (!footer) return;

  const revealEls = footer.querySelectorAll(".ft-reveal");
  let revealed = false;

  const obs = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting || revealed) return;
      revealed = true;

      revealEls.forEach(el => {
        const delay = parseInt(el.dataset.delay || "0", 10);
        setTimeout(() => el.classList.add("is-in"), delay);
      });

      obs.disconnect();
    },
    { threshold: 0.20 }
  );

  obs.observe(footer);
})();


/* ═══════════════════════════════════════════════════════
   COUNTDOWN — live ticking timer on the final "page".
   Target date comes from __WEDDING_CONFIG__.couple.date
   (ISO yyyy-mm-dd); falls back to the demo date so the
   gallery preview still animates. The builder's "Show
   Countdown" toggle hides the whole #heroCountdown section
   at the route level, so this just drives the numbers
   whenever the section is present.
═══════════════════════════════════════════════════════ */
window.initCountdown = function initCountdown() {
  var section = document.getElementById("heroCountdown");
  if (!section) return;

  var elDays     = document.getElementById("cdDays");
  var elHours    = document.getElementById("cdHours");
  var elMins     = document.getElementById("cdMins");
  var elSecs     = document.getElementById("cdSecs");
  var elGrid     = document.getElementById("cdGrid");
  var elFinished = document.getElementById("cdFinished");
  var elDate     = document.getElementById("cdDate");

  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  /* Resolve target date from config; fall back to the demo date in markup. */
  var C   = window.__WEDDING_CONFIG__ || {};
  var iso = (C.couple && C.couple.date) || '2026-12-12';
  var target = null;
  var p = iso.split('-');
  if (p.length === 3) {
    /* 11:00 local — same anchor used elsewhere to dodge TZ edge cases */
    target = new Date(+p[0], (+p[1]) - 1, +p[2], 11, 0, 0);
    if (elDate) elDate.innerHTML = (+p[2]) + ' &middot; ' + MONTHS[(+p[1]) - 1] + ' &middot; ' + p[0];
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  if (window.countdownTimer) {
    clearInterval(window.countdownTimer);
    window.countdownTimer = null;
  }

  function tick() {
    if (!target) return;
    var diff = target.getTime() - Date.now();
    if (diff <= 0) {
      if (elGrid)     elGrid.style.display = 'none';
      if (elFinished) elFinished.style.display = '';
      if (window.countdownTimer) { clearInterval(window.countdownTimer); window.countdownTimer = null; }
      return;
    }
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600);  s -= h * 3600;
    var m = Math.floor(s / 60);    s -= m * 60;
    if (elDays)  elDays.textContent  = pad(d);
    if (elHours) elHours.textContent = pad(h);
    if (elMins)  elMins.textContent  = pad(m);
    if (elSecs)  elSecs.textContent  = pad(s);
  }

  if (target) {
    tick();
    if (target.getTime() - Date.now() > 0) window.countdownTimer = setInterval(tick, 1000);
  }

  /* Scroll reveal for header + grid + date */
  var revealEls = section.querySelectorAll(".cd-reveal");
  revealEls.forEach(function(el) { el.classList.remove("is-in"); });

  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var delay = parseInt(el.dataset.delay || "0", 10);
      setTimeout(function() { el.classList.add("is-in"); }, delay);
      obs.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -40px 0px" });
  revealEls.forEach(function(el) { obs.observe(el); });
};
window.initCountdown();

/* ── Live Rerender message listener for real-time updates inside the builder ── */
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'UPDATE_DATA') {
    var data = event.data.data;
    if (data) {
      // 1. Re-apply the template 11 configuration mapping
      if (window.applyWeddingConfig) {
        window.applyWeddingConfig(data);
      }
      
      // 2. Re-initialize specific section observers and elements
      if (window.initEvents) {
        window.initEvents();
      }
      if (window.initStory) {
        window.initStory();
      }
      if (window.initCountdown) {
        window.initCountdown();
      }
      if (window.initNav) {
        window.initNav();
      }
    }
  }
});
