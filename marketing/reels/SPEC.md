# VibeHeal reels: series spec

Status: **draft for owner review.** No product UI appears in any reel because the product is still in development.

```text
GOAL:    a vibe coder who has been burned by a broken AI-built project feels seen, comments,
         and joins the beta waitlist at vibeheal.online.
OUTPUT:  HyperFrames, 1080 x 1920 (9:16, Instagram Reels), 30 fps, five separate projects.
TIME:    18-21 s each (540-630 frames). No music in the file: add a trending sound in the
         Instagram editor (see README.md).
LOOK:    the site's own brand (site/brand.json): ground #080B10 obsidian, panels #111923 graphite
         and #17212D elevated, ink #F4F6F8, secondary #9AA5B1, accent #2684FF (colour floods,
         the payoff word), ice #38BDF8 (one highlighted word per shot, the URL).
         Error red #FF5C5C only on error text.
         Display: Inter 900, 120-170 px, tracking -0.04em, line-height 0.95, left-aligned.
         Body: Inter 700, 56-84 px. Code and URL: JetBrains Mono 400/700, 34-56 px.
         The medium is the phone feed itself: full-bleed colour fields, hard cuts and giant type.
         No glow, particles, gradients or glass.
SAFE:    every word between y 168 and 1330, x 90 to 930 (clear of the right-hand action rail).
         Below 1330, only decoration.
OBJECTS: real-looking error lines (generic Node/React errors, not product output); a chat
         bubble; a slot-machine counter; a cracked line that heals; wireframe blocks that stack
         into a web page; a calendar of repeating tasks; a pause icon; the VibeHeal mark.
MOTION:  arrival expo.out / power4.out; colour flood power2.inOut 0.4 s; exits power2.in,
         40-50% shorter than entrances. Words blur in 8 px -> 0 in 0.14 s, 0.067 s apart.
         Names go letter by letter, 0.06 s apart. Slot rolls are about 0.1 s each. Springs
         use back.out(1.4-1.6) on position and scale only, never on opacity.
SHOTS:   see each project's index.html. Each scene is one timed .clip with one hero move.
BANNED:  product screenshots or mock product UI; claims about features that are not built;
         prices, dates and user counts; third-party logos; "unlock", "seamless", "10x",
         "game-changing", "revolutionary"; a docked corner logo; every element fading up;
         three cards in a row; centred-everything layouts; breathing or floating loops.
QA:      frame 0 of every reel reads as a thumbnail with its hook on screen; every line holds
         for at least 0.5 s plus 0.3 s a word; the end card holds at least 2 s; no text below
         y 1330 or under the action rail; the text is readable at 360 px wide.
```

## Honesty rules used in the copy

- Everything about the product is phrased as being built or planned: "we're building", "planned".
- What the reels say VibeHeal will do comes from the owner's own brief: **fix, build websites and automate**, with an **open-source version** and a **paid cloud version**. They never name an unbuilt feature in detail, a price or a date.
- The error messages, "14 files" and the vibe-coder types are illustrative jokes, not product output or statistics.
