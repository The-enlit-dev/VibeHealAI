// Motion graphics for the VibeHealAI home page, built with the "motion" library (pinned 14.5.0).
// Source: motion-src/. Built output: website/landing-motion.js (committed, same-origin, CSP-safe).
//
// Rules:
// - Only elements that are visible by default are animated, so if this script fails the page
//   is still complete and readable.
// - transform and opacity only. Inline styles set by the animations are cleared when each one
//   finishes, so CSS hover states keep working.
// - Nothing loops. Reduced motion: the script does nothing and the page shows its final state.

import { animate, inView, scroll, stagger } from "motion";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
const EASE = [0.2, 0.7, 0.2, 1];

function settle(controls, elements) {
  const list = Array.isArray(elements) ? elements : [elements];
  return controls.finished.then(function () {
    list.forEach(function (el) {
      if (!el) return;
      el.style.removeProperty("transform");
      el.style.removeProperty("opacity");
    });
  });
}

function $(selector, root) {
  return (root || document).querySelector(selector);
}

function $$(selector, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(selector));
}

function run() {
  // ---------- hero choreography ----------
  const words = $$(".hero-title .word");
  if (words.length) {
    settle(
      animate(words, { opacity: [0, 1], y: [22, 0] }, { duration: 0.8, delay: stagger(0.07, { startDelay: 0.35 }), ease: EASE }),
      words
    );
  }

  const panelBack = $(".panel-back");
  const panelFront = $(".panel-front");
  const toast = $(".toast");
  const cursor = $(".cursor");

  if (panelBack) settle(animate(panelBack, { opacity: [0, 0.92], y: [28, 0], scale: [0.985, 1] }, { duration: 0.9, delay: 0.7, ease: EASE }), panelBack);
  if (panelFront) settle(animate(panelFront, { opacity: [0, 1], y: [28, 0], scale: [0.985, 1] }, { duration: 0.9, delay: 0.95, ease: EASE }), panelFront);
  if (toast) settle(animate(toast, { opacity: [0, 1], y: [16, 0] }, { duration: 0.8, delay: 1.25, ease: EASE }), toast);
  if (cursor) settle(animate(cursor, { x: [-120, 0], y: [110, 0], opacity: [0, 1, 1] }, { duration: 1.6, delay: 2, ease: [0.45, 0, 0.2, 1] }), cursor);

  // Connected workflow: a line from the selected provider card to the details panel.
  const connector = $(".hero-connector");
  if (connector) {
    const path = $("path", connector);
    const nodes = $$("circle", connector);
    if (path && path.getTotalLength) {
      const length = path.getTotalLength();
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
      animate(path, { strokeDashoffset: [length, 0] }, { duration: 1.1, delay: 1.5, ease: EASE }).finished.then(function () {
        path.style.strokeDasharray = "";
        path.style.strokeDashoffset = "";
      });
    }
    nodes.forEach(function (node, i) {
      animate(node, { opacity: [0, 1], scale: [0, 1] }, { duration: 0.4, delay: 1.5 + i * 0.6, ease: EASE });
    });
  }

  // ---------- feature tiles: staggered entrance when the grid enters the view ----------
  const grid = $(".feature-grid");
  if (grid) {
    inView(
      grid,
      function () {
        const tiles = $$(".feature-tile", grid);
        settle(animate(tiles, { opacity: [0, 1], y: [24, 0] }, { duration: 0.6, delay: stagger(0.07), ease: EASE }), tiles);
        const bars = $$(".feature-visual span", grid);
        animate(bars, { scaleX: [0.3, 1] }, { duration: 0.6, delay: stagger(0.04, { startDelay: 0.25 }), ease: EASE });
      },
      { amount: 0.2 }
    );
  }

  // ---------- product layers: scroll-linked parallax ----------
  const layersBox = $(".layers");
  if (layersBox) {
    $$(".layer[data-depth]", layersBox).forEach(function (layer) {
      const depth = parseFloat(layer.getAttribute("data-depth")) || 0;
      const amount = 70 * depth;
      scroll(animate(layer, { y: [amount, -amount] }), { target: layersBox, offset: ["start end", "end start"] });
    });
  }

  // ---------- closing glow: scroll-linked, restrained ----------
  const finalCta = $(".final-cta");
  const glow = $(".final-glow");
  if (finalCta && glow) {
    scroll(animate(glow, { scale: [0.85, 1.08], opacity: [0.45, 1] }), { target: finalCta, offset: ["start end", "center center"] });
  }
}

if (!reduce.matches) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
}
