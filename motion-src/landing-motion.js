/* global document, window, IntersectionObserver */
// Motion for the VibeHealAI home page, built with the "motion" library (pinned 14.5.0).
// Source: motion-src/. Built output: website/landing-motion.js (committed, same-origin, CSP-safe).
//
// 1. The 3D scroll story: one CSS 3D scene (real perspective, depth and rotation). The section is
//    pinned for five chapters, and the camera and every object move between keyframed poses as you
//    scroll: a broken project is inspected, explained, recovered and connected.
// 2. Scroll-linked 3D entrances elsewhere on the page.
//
// Rules: transform and opacity only; one requestAnimationFrame loop that runs only while the story
// is on screen; nothing loops on its own. Reduced motion: none of this runs, and the page shows its
// static 3D composition and final states.

import { animate, inView, scroll, stagger } from "motion";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(pointer: fine)");
const EASE = [0.2, 0.7, 0.2, 1];

function $(selector, root) {
  return (root || document).querySelector(selector);
}

function $$(selector, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(selector));
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// Scene keyframes. One pose per chapter: [x, y, z, rotateX, rotateY, rotateZ, scale, opacity].
// Chapters: 0 broken (hero), 1 inspect, 2 explain, 3 recover, 4 connect.
// ---------------------------------------------------------------------------
const HIDDEN = (x, y, z) => [x, y, z, 0, 0, 0, 0.8, 0];

const POSES = {
  tree: [
    [-260, -30, -220, 6, 22, -8, 1, 0.95],
    [-90, -10, 150, 0, 10, 0, 1.04, 1],
    [-330, 70, -170, 0, 24, 0, 0.95, 0.4],
    HIDDEN(-280, 160, -260),
    HIDDEN(-300, 220, -400),
  ],
  err: [
    [80, -190, -60, 8, -16, 6, 1, 1],
    [190, -150, 30, 0, -10, 0, 1, 1],
    [20, -20, 250, 0, 180, 0, 1.08, 1],
    [0, -360, -300, 0, 180, 0, 0.8, 0],
    [0, -360, -300, 0, 180, 0, 0.8, 0],
  ],
  diff: [
    [160, 150, 60, -4, -22, -5, 1, 1],
    [230, 210, -230, 0, -10, 0, 0.95, 0.25],
    [290, 240, -210, 0, -14, 0, 0.9, 0.25],
    [0, -40, 150, 0, 0, 0, 1.02, 1],
    HIDDEN(0, 280, -320),
  ],
  f1: [
    [-300, 190, -120, 0, 10, 16, 1, 0.9],
    [-340, -240, -320, 0, 0, 0, 0.9, 0.35],
    [-390, -210, -330, 0, 0, 0, 0.9, 0.22],
    [-260, 200, 0, -12, 0, 0, 0.95, 1],
    [-370, 250, -430, 0, 0, 0, 0.8, 0.12],
  ],
  f2: [
    [330, -40, -300, 0, -10, -14, 1, 0.85],
    [390, 70, -420, 0, 0, 0, 0.9, 0.3],
    [410, 30, -430, 0, 0, 0, 0.9, 0.2],
    [0, 200, 0, -12, 0, 0, 0.95, 1],
    [0, 310, -470, 0, 0, 0, 0.8, 0.12],
  ],
  f3: [
    [-40, -310, -380, 0, 0, 10, 1, 0.7],
    [-20, 270, -370, 0, 0, 0, 0.9, 0.3],
    [0, 310, -390, 0, 0, 0, 0.9, 0.2],
    [260, 200, 0, -12, 0, 0, 0.95, 1],
    [370, 250, -430, 0, 0, 0, 0.8, 0.12],
  ],
  path: [
    HIDDEN(20, -60, 80),
    [20, -70, 90, 0, 0, 0, 1, 1],
    HIDDEN(20, -70, 90),
    HIDDEN(20, -70, 90),
    HIDDEN(20, -70, 90),
  ],
  mark: [
    [300, -300, 120, 0, 0, 0, 0.8, 0.35],
    [330, -310, -220, 0, 0, 0, 0.6, 0.15],
    [310, -310, -270, 0, 0, 0, 0.6, 0.12],
    [0, -260, 90, 0, 0, 0, 1.1, 1],
    [0, -10, 70, 0, 0, 0, 1.35, 1],
  ],
  ring: [
    [0, 10, -200, 72, 0, 0, 0.5, 0],
    [0, 10, -200, 72, 0, 0, 0.5, 0],
    [0, 10, -200, 72, 0, 0, 0.5, 0],
    [0, 10, -100, 72, 0, 0, 0.7, 0],
    [0, 10, 0, 72, 0, 0, 1, 1],
  ],
  t1: [HIDDEN(-140, -60, -520), HIDDEN(-140, -60, -520), HIDDEN(-140, -60, -520), HIDDEN(-200, -90, -300), [-290, -120, 40, 0, 0, 0, 1, 1]],
  t2: [HIDDEN(140, -60, -520), HIDDEN(140, -60, -520), HIDDEN(140, -60, -520), HIDDEN(200, -110, -300), [280, -150, -40, 0, 0, 0, 1, 1]],
  t3: [HIDDEN(-140, 60, -520), HIDDEN(-140, 60, -520), HIDDEN(-140, 60, -520), HIDDEN(-200, 110, -300), [-260, 150, -20, 0, 0, 0, 1, 1]],
  t4: [HIDDEN(140, 60, -520), HIDDEN(140, 60, -520), HIDDEN(140, 60, -520), HIDDEN(200, 110, -300), [290, 140, 60, 0, 0, 0, 1, 1]],
};

// Camera: [rotateX, rotateY, x, y, z] per chapter.
const CAMERA = [
  [10, -18, 0, 0, 0],
  [6, -8, 0, 0, 60],
  [4, 10, 0, 0, 120],
  [18, 0, 0, 20, 40],
  [14, 16, 0, 0, 40],
];

const CHAPTERS = 5;

function pose(frames, c) {
  const i = Math.min(frames.length - 2, Math.floor(c));
  // Hold each pose briefly, then ease to the next one.
  const t = smooth(clamp((c - i - 0.18) / 0.64, 0, 1));
  const a = frames[i];
  const b = frames[i + 1];
  return a.map((v, k) => v + (b[k] - v) * t);
}

function startStory() {
  const story = $("[data-story]");
  if (!story) return;
  const camera = $("[data-camera]", story);
  const stage = $(".story-stage", story);
  const floor = $(".story-floor", story);
  const sky = $(".story-sky", story);
  const caps = $$(".story-cap", story);
  const rail = $$(".story-rail li", story);
  const objects = $$("[data-obj]", story).map((el) => ({
    el,
    frames: POSES[el.getAttribute("data-obj")],
    faces: el.classList.contains("s3-flip") ? $$(".s3-face", el) : null,
    cur: null,
  }));

  document.documentElement.classList.add("story-on");

  let pointerX = 0;
  let pointerY = 0;
  if (finePointer.matches) {
    story.addEventListener("pointermove", (event) => {
      pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    });
  }

  const camCur = CAMERA[0].slice();
  let ptrX = 0;
  let ptrY = 0;
  let activeCap = -1;
  let running = false;
  let last = 0;

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const k = 1 - Math.exp(-dt * 9); // frame-rate independent damping

    const rect = story.getBoundingClientRect();
    const span = Math.max(1, rect.height - window.innerHeight);
    const progress = clamp(-rect.top / span, 0, 1);
    const c = progress * (CHAPTERS - 1);

    // Objects
    for (const obj of objects) {
      if (!obj.frames) continue;
      const target = pose(obj.frames, c);
      if (!obj.cur) obj.cur = target.slice();
      for (let n = 0; n < target.length; n++) obj.cur[n] += (target[n] - obj.cur[n]) * k;
      const [x, y, z, rx, ry, rz, s, o] = obj.cur;
      obj.el.style.transform =
        "translate(-50%, -50%) translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px," + z.toFixed(1) + "px) rotateX(" +
        rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) rotateZ(" + rz.toFixed(2) + "deg) scale(" + s.toFixed(3) + ")";
      // Opacity below 1 on a preserve-3d parent flattens it, so the flip card fades its faces instead.
      if (obj.faces) obj.faces.forEach((f) => (f.style.opacity = o.toFixed(3)));
      else obj.el.style.opacity = o.toFixed(3);
    }

    // Camera, with a gentle pointer parallax
    const camTarget = pose(CAMERA, c);
    for (let n = 0; n < camTarget.length; n++) camCur[n] += (camTarget[n] - camCur[n]) * k;
    ptrX += (pointerX - ptrX) * k * 0.6;
    ptrY += (pointerY - ptrY) * k * 0.6;
    const scale = clamp(stage.clientWidth / 980, 0.5, 1.12);
    camera.style.transform =
      "scale(" + scale.toFixed(3) + ") translate3d(" + camCur[2].toFixed(1) + "px," + camCur[3].toFixed(1) + "px," + camCur[4].toFixed(1) + "px) rotateX(" +
      (camCur[0] - ptrY * 2.5).toFixed(2) + "deg) rotateY(" + (camCur[1] + ptrX * 3.5).toFixed(2) + "deg)";

    // Floor moves toward the viewer; the light drifts across the sky.
    floor.style.setProperty("--floor-shift", (progress * 1440).toFixed(0) + "px");
    sky.style.setProperty("--sky-x", (78 - progress * 30).toFixed(1) + "%");

    // Captions, rail and state classes
    const active = Math.round(c);
    if (active !== activeCap) {
      activeCap = active;
      caps.forEach((cap, n) => {
        cap.classList.toggle("is-active", n === active);
        cap.classList.toggle("is-before", n < active);
      });
      rail.forEach((li, n) => li.classList.toggle("is-active", n === active));
    }
    story.classList.toggle("is-healed", c >= 2.55);
    story.classList.toggle("is-scrolled", progress > 0.02);

    window.requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
  }

  // Only animate while the story is on screen.
  new IntersectionObserver((entries) => {
    entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
  }, { rootMargin: "100px 0px" }).observe(story);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (story.getBoundingClientRect().bottom > 0) start();
  });

  // Headline entrance
  const words = $$(".hero-title .word", story);
  if (words.length) {
    animate(words, { opacity: [0, 1], y: [24, 0] }, { duration: 0.8, delay: stagger(0.07, { startDelay: 0.15 }), ease: EASE }).finished.then(() => {
      words.forEach((w) => {
        w.style.removeProperty("transform");
        w.style.removeProperty("opacity");
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Scroll-linked 3D entrances and depth elsewhere on the page.
// ---------------------------------------------------------------------------
function startPageEffects() {
  const bar = $(".scroll-progress span");
  if (bar) scroll(animate(bar, { scaleX: [0, 1] }, { ease: "linear" }));

  // Feature tiles tip up out of the floor as they scroll in.
  $$(".feature-tile").forEach((tile) => {
    scroll(animate(tile, { rotateX: [24, 0], y: [80, 0], opacity: [0.15, 1] }, { ease: "linear" }), {
      target: tile,
      offset: ["start end", "start 62%"],
    });
  });
  const grid = $(".feature-grid");
  if (grid) {
    inView(grid, () => {
      animate($$(".feature-visual span", grid), { scaleX: [0.3, 1] }, { duration: 0.6, delay: stagger(0.04, { startDelay: 0.25 }), ease: EASE });
    }, { amount: 0.2 });
  }

  // The interactive preview rises like a screen being lifted toward you.
  const demo = $(".demo");
  if (demo) {
    scroll(animate(demo, { rotateX: [28, 0], scale: [0.9, 1], y: [90, 0] }, { ease: "linear" }), {
      target: demo,
      offset: ["start end", "start 25%"],
    });
  }

  // Product layers: depth parallax.
  const layersBox = $(".layers");
  if (layersBox) {
    $$(".layer[data-depth]", layersBox).forEach((layer) => {
      const amount = 90 * (parseFloat(layer.getAttribute("data-depth")) || 0);
      scroll(animate(layer, { y: [amount, -amount], rotateX: [8, -4] }), { target: layersBox, offset: ["start end", "end start"] });
    });
  }

  // Closing glow grows as the call to action arrives.
  const finalCta = $(".final-cta");
  const glow = $(".final-glow");
  if (finalCta && glow) {
    scroll(animate(glow, { scale: [0.8, 1.12], opacity: [0.35, 1] }), { target: finalCta, offset: ["start end", "center center"] });
  }
}

function run() {
  startStory();
  startPageEffects();
}

if (!reduce.matches) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
}
