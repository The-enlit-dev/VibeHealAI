#!/usr/bin/env python3
"""Writes index.html for reels 02-05 from one shared shell (brand tokens, word splitter, end card).

Reel 01 is hand-written. Edit a reel's scenes in reels.py, then run:
    python3 marketing/reels/tools/build.py
"""
from pathlib import Path

from reels import REELS

ROOT = Path(__file__).resolve().parent.parent

VARIABLES = """[
    {"id":"color-ground","type":"color","label":"Background","default":"#080B10"},
    {"id":"color-ink","type":"color","label":"Text","default":"#F4F6F8"},
    {"id":"color-accent","type":"color","label":"Accent","default":"#2684FF"},
    {"id":"color-ice","type":"color","label":"Highlight","default":"#38BDF8"},
    {"id":"cta-url","type":"string","label":"Waitlist URL","default":"vibeheal.online"}
  ]"""

BASE_CSS = """
      :root {
        --color-ground: #080b10;
        --color-ink: #f4f6f8;
        --color-accent: #2684ff;
        --color-ice: #38bdf8;
        --graphite: #111923;
        --elevated: #17212d;
        --muted: #9aa5b1;
        --red: #ff5c5c;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: var(--color-ground); }
      body { font-family: "Inter", sans-serif; color: var(--color-ink); }
      #root { position: absolute; inset: 0; overflow: hidden; background: var(--color-ground); }
      .scene { position: absolute; inset: 0; overflow: hidden; }
      .fill { position: absolute; inset: 0; }
      /* Every word lives in this band: clear of the status bar, caption area and action rail. */
      .band {
        position: absolute; left: 90px; right: 150px; top: 210px; bottom: 610px;
        display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
      }
      .xl { font-weight: 900; font-size: 168px; line-height: 0.93; letter-spacing: -0.045em; }
      .l { font-weight: 900; font-size: 128px; line-height: 0.95; letter-spacing: -0.04em; }
      .m { font-weight: 900; font-size: 96px; line-height: 1; letter-spacing: -0.035em; }
      .s { font-weight: 700; font-size: 60px; line-height: 1.15; letter-spacing: -0.02em; }
      .mono { font-family: "JetBrains Mono", monospace; }
      .w, .c { display: inline-block; }
      .ice { color: var(--color-ice); }
      .red { color: var(--red); }
      .muted { color: var(--muted); }
      .ink { color: var(--color-ink); }
      .dark { color: var(--color-ground); }
      .g-obsidian { background: var(--color-ground); }
      .g-graphite { background: var(--graphite); }
      .g-elevated { background: var(--elevated); }
      .g-blue { background: var(--color-accent); }
      .g-ice { background: var(--color-ice); }
      .flood { clip-path: circle(0% at 50% 45%); }

      /* end card */
      .end-mark { width: 260px; height: auto; margin-bottom: 26px; }
      .end-name { font-weight: 900; font-size: 150px; letter-spacing: -0.05em; line-height: 1; white-space: nowrap; }
      .end-tag { font-weight: 700; font-size: 58px; color: var(--color-ice); margin: 18px 0 70px; letter-spacing: -0.02em; }
      .end-cta { font-weight: 900; font-size: 74px; letter-spacing: -0.03em; line-height: 1.05; }
      .end-url { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 58px; color: var(--color-ice); margin-top: 26px; position: relative; padding-bottom: 12px; }
      .end-url-line { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: var(--color-ice); transform-origin: left center; }
      .end-bio { font-weight: 700; font-size: 40px; color: var(--muted); margin-top: 22px; }
      .end-floor { position: absolute; left: 0; right: 0; top: 1390px; height: 530px; background: var(--color-accent); transform-origin: left center; }
"""

SPLIT_AND_HELPERS = r"""
      // Split marked text into word (.w) or letter (.c) spans. Deterministic, runs once before the timeline is built.
      document.querySelectorAll("[data-split]").forEach((el) => {
        const chars = el.getAttribute("data-split") === "chars";
        const walk = (node) => {
          [...node.childNodes].forEach((n) => {
            if (n.nodeType === 3) {
              const frag = document.createDocumentFragment();
              const parts = chars ? [...n.textContent] : n.textContent.split(/(\s+)/);
              parts.forEach((p) => {
                if (!p) return;
                if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(chars ? " " : p)); return; }
                const s = document.createElement("span");
                s.className = chars ? "c" : "w";
                s.textContent = p;
                frag.appendChild(s);
              });
              node.replaceChild(frag, n);
            } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
          });
        };
        walk(el);
      });

      const tl = gsap.timeline({ paused: true });
      const blurIn = (sel, t, stagger = 0.067) =>
        tl.fromTo(sel, { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.14, ease: "power4.out", stagger }, t);
      const blurOut = (sel, t) =>
        tl.fromTo(sel, { opacity: 1, filter: "blur(0px)" }, { opacity: 0, filter: "blur(8px)", duration: 0.16, ease: "power2.in", immediateRender: false }, t);
      const inkIn = (sel, t, from = "#3a4756", to = "#f4f6f8", stagger = 0.085) =>
        tl.fromTo(sel, { color: from }, { color: to, duration: 0.12, ease: "none", stagger }, t);
      const flood = (sel, t, at = "50% 45%") =>
        tl.fromTo(sel, { clipPath: `circle(0% at ${at})` }, { clipPath: `circle(150% at ${at})`, duration: 0.4, ease: "power2.inOut" }, t);
      // Show a block for a window (hard cut in and out); used by montages and the pause game.
      const flash = (sel, t, dur) => {
        tl.fromTo(sel, { opacity: 0 }, { opacity: 1, duration: 0.001, ease: "none" }, t);
        tl.fromTo(sel, { opacity: 1 }, { opacity: 0, duration: 0.001, ease: "none", immediateRender: false }, t + dur);
      };
"""


def end_card_html(start, duration, cta):
    return f"""
      <!-- end · {start:g}-{start + duration:g} · end card, holds 2 s+ -->
      <div id="end" class="clip scene g-obsidian" data-start="{start:g}" data-duration="{duration:g}" data-track-index="1" data-track-kind="graphics">
        <div class="end-floor" data-layout-ignore></div>
        <div class="band">
          <img class="end-mark" src="assets/logo-mark.png" alt="VibeHeal mark" />
          <div class="end-name" data-split="chars">VibeHeal</div>
          <div class="end-tag">Just vibeheal it.</div>
          <div class="end-cta">{cta}</div>
          <div class="end-url"><span data-var-text="cta-url">vibeheal.online</span><div class="end-url-line"></div></div>
          <div class="end-bio">link in bio</div>
        </div>
      </div>
"""


def end_card_js(t):
    return f"""
      // end card
      tl.fromTo(".end-floor", {{ scaleX: 0 }}, {{ scaleX: 1, duration: 0.5, ease: "expo.out" }}, {t:g});
      tl.fromTo("#end .end-mark", {{ scale: 0.6, opacity: 0, filter: "blur(12px)" }}, {{ scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.5, ease: "expo.out" }}, {t + 0.05:g});
      tl.fromTo("#end .end-name .c", {{ opacity: 0.12 }}, {{ opacity: 1, duration: 0.08, stagger: 0.06, ease: "none" }}, {t + 0.2:g});
      blurIn("#end .end-tag", {t + 0.55:g});
      blurIn("#end .end-cta", {t + 0.75:g});
      blurIn("#end .end-url", {t + 0.9:g});
      tl.fromTo("#end .end-url-line", {{ scaleX: 0 }}, {{ scaleX: 1, duration: 0.4, ease: "expo.out" }}, {t + 1.0:g});
      blurIn("#end .end-bio", {t + 1.1:g});
"""


def page(reel):
    end_start = reel["end"]
    duration = round(end_start + 3.2, 2)
    return f"""<!doctype html>
<html
  lang="en"
  data-composition-variables='{VARIABLES}'
>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>{reel["title"]}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>{BASE_CSS}{reel["css"]}    </style>
  </head>
  <body>
    <!-- Generated by marketing/reels/tools/build.py from tools/reels.py. Edit there, then rebuild. -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="{duration:g}" data-width="1080" data-height="1920">
{reel["html"]}{end_card_html(end_start, 3.2, reel["cta"])}    </div>

    <script>{SPLIT_AND_HELPERS}{reel["js"]}{end_card_js(end_start)}
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""


if __name__ == "__main__":
    for reel in REELS:
        out = ROOT / reel["dir"] / "index.html"
        out.write_text(page(reel))
        print("wrote", out.relative_to(ROOT.parent.parent))
