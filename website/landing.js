/* global document, window */
// Motion for the home page. Dependency-free. Everything here is progressive enhancement:
// without this script the page shows its final, readable state.
// Rules: transform and opacity only, requestAnimationFrame for scroll work, no looping animation,
// and nothing moves when the visitor prefers reduced motion.
// The demo uses sample data only; it does not connect to any service or account.

(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var fineQuery = window.matchMedia("(pointer: fine)");
  var stickyQuery = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
  var parallaxQuery = window.matchMedia("(min-width: 721px) and (prefers-reduced-motion: no-preference)");
  var reduceMotion = reduceQuery.matches;

  // ---------- reveals on scroll ----------
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal-up"));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    reveals.forEach(function (el) { revealObserver.observe(el); });
  }

  // ---------- scroll-linked work: parallax layers and sticky workflow ----------
  var layers = Array.prototype.slice.call(document.querySelectorAll(".layer[data-depth]"));
  var layersBox = document.querySelector(".layers");
  var flowTrack = document.querySelector("[data-flow]");
  var flowSteps = flowTrack ? Array.prototype.slice.call(flowTrack.querySelectorAll(".flow-step")) : [];
  var flowRail = flowTrack ? flowTrack.querySelector(".flow-rail") : null;
  var activeStep = -1;

  function setActiveStep(index) {
    if (index === activeStep) return;
    activeStep = index;
    flowSteps.forEach(function (step, i) {
      step.classList.toggle("is-active", i === index);
    });
  }

  function onScrollFrame() {
    var vh = window.innerHeight;

    if (layersBox && parallaxQuery.matches) {
      var box = layersBox.getBoundingClientRect();
      if (box.bottom > -200 && box.top < vh + 200) {
        var offset = (box.top + box.height / 2 - vh / 2) / vh; // about -1 .. 1 near the centre
        layers.forEach(function (layer) {
          var depth = parseFloat(layer.getAttribute("data-depth")) || 0;
          layer.style.transform = "translate3d(0," + (offset * depth * -60).toFixed(1) + "px,0)";
        });
      }
    }

    if (flowTrack && stickyQuery.matches) {
      var rect = flowTrack.getBoundingClientRect();
      var span = rect.height - vh;
      var progress = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 0;
      if (flowRail) flowRail.style.setProperty("--p", progress.toFixed(3));
      setActiveStep(Math.min(flowSteps.length - 1, Math.floor(progress * flowSteps.length * 0.999)));
    }
  }

  var frameQueued = false;
  function requestFrame() {
    if (frameQueued) return;
    frameQueued = true;
    window.requestAnimationFrame(function () {
      frameQueued = false;
      onScrollFrame();
    });
  }

  if (!reduceMotion) {
    window.addEventListener("scroll", requestFrame, { passive: true });
    window.addEventListener("resize", requestFrame);
    requestFrame();
  } else if (flowSteps.length) {
    flowSteps.forEach(function (step) { step.classList.add("is-active"); });
  }

  // ---------- pointer spotlight on cards (fine pointers only) ----------
  if (fineQuery.matches && !reduceMotion) {
    Array.prototype.forEach.call(document.querySelectorAll(".feature-tile"), function (tile) {
      tile.addEventListener("pointermove", function (event) {
        var r = tile.getBoundingClientRect();
        tile.style.setProperty("--mx", (event.clientX - r.left) + "px");
        tile.style.setProperty("--my", (event.clientY - r.top) + "px");
      });
    });
  }

  // ---------- interactive preview ----------
  var demo = document.querySelector("[data-demo]");
  if (demo) {
    var tabs = Array.prototype.slice.call(demo.querySelectorAll('[role="tab"]'));

    function selectTab(tab, focus) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", selected ? "true" : "false");
        t.setAttribute("tabindex", selected ? "0" : "-1");
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { selectTab(tab, false); });
      tab.addEventListener("keydown", function (event) {
        var next = null;
        if (event.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (event.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (event.key === "Home") next = tabs[0];
        if (event.key === "End") next = tabs[tabs.length - 1];
        if (next) {
          event.preventDefault();
          selectTab(next, true);
        }
      });
    });

    var search = document.getElementById("demo-search");
    var category = document.getElementById("demo-category");
    var status = document.getElementById("demo-status");
    var list = document.getElementById("demo-list");
    var cards = Array.prototype.slice.call(list.querySelectorAll(".demo-card"));
    var emptyNote = null;

    function applyFilters() {
      var q = (search.value || "").trim().toLowerCase();
      var cat = category.value;
      var st = status.value;
      var visible = 0;
      cards.forEach(function (card) {
        var text = (card.getAttribute("data-name") + " " + card.getAttribute("data-summary")).toLowerCase();
        var ok =
          (!q || text.indexOf(q) !== -1) &&
          (!cat || card.getAttribute("data-category") === cat) &&
          (!st || card.getAttribute("data-status") === st);
        card.parentElement.hidden = !ok;
        if (ok) visible += 1;
      });
      if (!emptyNote) {
        emptyNote = document.createElement("li");
        emptyNote.className = "demo-empty-list";
        emptyNote.textContent = "No integrations match your filters.";
        list.appendChild(emptyNote);
      }
      emptyNote.hidden = visible !== 0;
    }

    search.addEventListener("input", applyFilters);
    category.addEventListener("change", applyFilters);
    status.addEventListener("change", applyFilters);

    var details = {
      empty: document.getElementById("demo-empty"),
      body: document.getElementById("demo-body"),
      mono: document.getElementById("demo-mono"),
      name: document.getElementById("demo-name"),
      cat: document.getElementById("demo-cat"),
      badge: document.getElementById("demo-badge"),
      sum: document.getElementById("demo-sum"),
      perms: document.getElementById("demo-perms"),
      note: document.getElementById("demo-note")
    };

    function showDetails(card) {
      var status = card.getAttribute("data-status");
      var permissions = (card.getAttribute("data-permissions") || "").split("|").filter(Boolean);

      details.empty.hidden = true;
      details.body.hidden = false;
      details.mono.textContent = card.querySelector(".monogram").textContent;
      details.name.textContent = card.getAttribute("data-name");
      details.cat.textContent = card.getAttribute("data-category");
      details.badge.textContent = card.getAttribute("data-status-label");
      details.badge.className = "badge badge-" + status;
      details.sum.textContent = card.getAttribute("data-summary");

      details.perms.textContent = "";
      if (permissions.length) {
        permissions.forEach(function (text) {
          var li = document.createElement("li");
          var label = document.createElement("span");
          label.textContent = text;
          var access = document.createElement("span");
          access.className = "access";
          access.textContent = "Read only";
          li.appendChild(label);
          li.appendChild(access);
          details.perms.appendChild(li);
        });
        details.perms.hidden = false;
      } else {
        details.perms.hidden = true;
      }

      details.note.textContent =
        status === "available"
          ? "Sample view. Nothing is connected to an account, and the buttons on this page change nothing."
          : "This integration is not built yet and cannot be connected.";

      details.body.classList.remove("is-swapping");
      void details.body.offsetWidth;
      if (!reduceMotion) details.body.classList.add("is-swapping");
    }

    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        cards.forEach(function (other) {
          other.setAttribute("aria-pressed", other === card ? "true" : "false");
        });
        showDetails(card);
      });
    });

    // Show one provider on load so the preview is never empty.
    if (cards[0]) {
      cards[0].setAttribute("aria-pressed", "true");
      showDetails(cards[0]);
    }
  }
})();
