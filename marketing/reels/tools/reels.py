"""Scene markup, styles and timelines for reels 02-05. Times are seconds on the root timeline."""

# ---------------------------------------------------------------------------
# 02 · Why we built it: type carries the argument, a montage of the fix loop
# ---------------------------------------------------------------------------
R02 = {
    "dir": "02-why-we-built-it",
    "title": "VibeHeal reel 02: Why we're building it",
    "cta": "Beta testers wanted",
    "end": 19.0,
    "css": """
      .loop .band { justify-content: center; }
      .r2-repeat div { font-weight: 900; font-size: 168px; line-height: 0.95; letter-spacing: -0.045em; color: var(--color-ground); }
      .r2-lines .m { margin-bottom: 8px; }
      .r2-verbs { margin-top: 46px; }
      .r2-verbs .l { color: #9cc7ff; }
      .r2-made { margin-top: 40px; color: #ffffff; }
""",
    "html": """
      <!-- s1 · 0-3.4 · the hook is on screen at frame 0, then the turn -->
      <div id="s1" class="clip scene g-obsidian" data-start="0" data-duration="3.4" data-track-index="1" data-track-kind="graphics">
        <div class="band">
          <div class="l">AI made<br />building apps <span class="ice">easy.</span></div>
          <div class="m r2-turn" data-split style="margin-top: 70px">Fixing them?<br /><span class="red">Not so much.</span></div>
        </div>
      </div>

      <!-- s2-s6 · 3.4-9.2 · the loop every vibe coder knows, one card a second -->
      <div id="s2" class="clip scene g-obsidian loop" data-start="3.4" data-duration="1.15" data-track-index="1" data-track-kind="graphics">
        <div class="band"><div class="xl r2-in">Your app<br /><span class="red">breaks.</span></div></div>
      </div>
      <div id="s3" class="clip scene g-graphite loop" data-start="4.55" data-duration="1.15" data-track-index="1" data-track-kind="graphics">
        <div class="band"><div class="xl r2-in">You ask<br />for help.</div></div>
      </div>
      <div id="s4" class="clip scene g-elevated loop" data-start="5.7" data-duration="1.15" data-track-index="1" data-track-kind="graphics">
        <div class="band"><div class="xl r2-in">The AI<br /><span class="ice">guesses.</span></div></div>
      </div>
      <div id="s5" class="clip scene g-obsidian loop" data-start="6.85" data-duration="1.15" data-track-index="1" data-track-kind="graphics">
        <div class="band"><div class="l r2-in">Something<br />else<br /><span class="red">breaks.</span></div></div>
      </div>
      <div id="s6" class="clip scene g-ice loop" data-start="8" data-duration="1.2" data-track-index="1" data-track-kind="graphics">
        <div class="band r2-repeat"><div>Repeat.</div><div>Repeat.</div><div>Repeat.</div></div>
      </div>

      <!-- s7 · 9.2-12.2 · the gap we saw -->
      <div id="s7" class="clip scene g-graphite" data-start="9.2" data-duration="3" data-track-index="1" data-track-kind="graphics">
        <div class="band r2-lines">
          <div class="m r2-gap" data-split>Beginners get stuck,</div>
          <div class="m r2-gap" data-split>and nobody explains</div>
          <div class="m r2-gap" data-split><span>why.</span></div>
        </div>
      </div>

      <!-- s8 · 12.2-16.4 · colour flood, the name and the plan -->
      <div id="s8" class="clip scene g-graphite" data-start="12.2" data-duration="4.2" data-track-index="1" data-track-kind="graphics">
        <div class="fill g-blue flood r2-flood"></div>
        <div class="band">
          <div class="s r2-kick" data-split>That's why we're building</div>
          <div class="end-name r2-name" data-split="chars" style="margin-top: 14px">VibeHeal</div>
          <div class="r2-verbs">
            <div class="l r2-v1">Fix.</div>
            <div class="l r2-v2">Build.</div>
            <div class="l r2-v3">Automate.</div>
          </div>
          <div class="s r2-made" data-split>Made for vibe coders.</div>
        </div>
      </div>

      <!-- s9 · 16.4-19.0 · the interactive ask -->
      <div id="s9" class="clip scene g-obsidian" data-start="16.4" data-duration="2.6" data-track-index="1" data-track-kind="graphics">
        <div class="band">
          <div class="l r2-tag" data-split>Tag a friend whose app <span class="red">broke</span> this week</div>
        </div>
      </div>
""",
    "js": """
      // s1 · the turn
      blurIn(".r2-turn .w", 1.3, 0.09);

      // s2-s6 · each card whips in from alternating sides and lands sharp
      [["#s2", -1], ["#s3", 1], ["#s4", -1], ["#s5", 1]].forEach(([id, dir], i) => {
        tl.fromTo(`${id} .r2-in`, { x: 220 * dir, opacity: 0, filter: "blur(14px)" }, { x: 0, opacity: 1, filter: "blur(0px)", duration: 0.22, ease: "power3.out" }, 3.4 + i * 1.15);
      });
      tl.fromTo(".r2-repeat div", { opacity: 0, scale: 1.25, transformOrigin: "0% 50%" }, { opacity: 1, scale: 1, duration: 0.16, ease: "power3.out", stagger: 0.18 }, 8.02);

      // s7 · grey to ink, word by word
      inkIn(".r2-gap .w", 9.3, "#3a4756", "#f4f6f8", 0.11);
      tl.fromTo(".r2-gap:last-child .w", { color: "#3a4756" }, { color: "#ff5c5c", duration: 0.12, ease: "none", immediateRender: false }, 10.1);

      // s8 · flood, name, verbs
      flood(".r2-flood", 12.2, "50% 40%");
      blurIn(".r2-kick .w", 12.55);
      tl.fromTo(".r2-name .c", { opacity: 0.12 }, { opacity: 1, duration: 0.08, stagger: 0.06, ease: "none" }, 12.95);
      inkIn(".r2-v1", 13.8, "#9cc7ff", "#ffffff");
      inkIn(".r2-v2", 14.15, "#9cc7ff", "#ffffff");
      inkIn(".r2-v3", 14.5, "#9cc7ff", "#080b10");
      blurIn(".r2-made .w", 15.0);

      // s9 · the ask
      blurIn(".r2-tag .w", 16.45, 0.08);
""",
}

# ---------------------------------------------------------------------------
# 03 · Fix. Build. Automate.: a slot machine, then one world per job
# ---------------------------------------------------------------------------
R03 = {
    "dir": "03-fix-build-automate",
    "title": "VibeHeal reel 03: Fix. Build. Automate.",
    "cta": "Join the beta waitlist",
    "end": 19.7,
    "css": """
      .r3-slot { height: 132px; overflow: hidden; margin-top: 20px; }
      .r3-strip div { height: 132px; font-weight: 900; font-size: 104px; line-height: 132px; letter-spacing: -0.04em; color: var(--color-ice); white-space: nowrap; }
      .r3-strip div:last-child { color: var(--color-ink); }

      .r3-crack { position: relative; width: 840px; height: 220px; margin: 70px 0 80px; }
      .r3-seg { position: absolute; top: 99px; width: 280px; height: 22px; border-radius: 11px; background: var(--red); }

      .r3-site { position: relative; width: 840px; height: 600px; margin: 50px 0 60px; border: 6px solid #3a4756; border-radius: 28px; overflow: hidden; }
      .r3-bar { position: absolute; left: 0; right: 0; top: 0; height: 64px; background: #1e2a38; }
      .r3-dot { position: absolute; top: 22px; width: 20px; height: 20px; border-radius: 50%; background: #3a4756; }
      .r3-blk { position: absolute; border-radius: 16px; background: #2a3a4d; }
      .r3-hero { background: var(--color-accent); }
      .r3-cta { background: var(--color-ice); }

      .r3-cal { position: relative; width: 840px; height: 430px; margin: 50px 0 60px; }
      .r3-card { position: absolute; left: 100px; top: 70px; width: 640px; height: 290px; border-radius: 30px; background: #22303f; padding: 40px 48px; }
      .r3-day { height: 64px; overflow: hidden; }
      .r3-days div { height: 64px; font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 52px; line-height: 64px; color: var(--color-ice); }
      .r3-task { font-weight: 700; font-size: 46px; white-space: nowrap; line-height: 1.25; margin-top: 26px; }
      .r3-ring { position: absolute; left: 0; top: 0; width: 840px; height: 430px; }

      .r3-three .xl { color: #9cc7ff; }
      .r3-pick { margin-top: 30px; }
      .r3-opt { display: flex; align-items: baseline; gap: 34px; margin: 6px 0; }
      .r3-opt b { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 110px; color: var(--color-ice); }
      .r3-opt span { font-weight: 900; font-size: 110px; letter-spacing: -0.04em; }
""",
    "html": """
      <!-- s1 · 0-3.2 · hook on frame 0; the slot rolls through the three jobs -->
      <div id="s1" class="clip scene g-obsidian" data-start="0" data-duration="3.2" data-track-index="1" data-track-kind="graphics">
        <div class="band">
          <div class="m">Today I need to</div>
          <div class="r3-slot" data-layout-allow-overflow>
            <div class="r3-strip">
              <div>fix my app</div><div>build a site</div><div>automate stuff</div>
              <div>fix my app</div><div>build a site</div><div>automate stuff</div>
              <div>do all three.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- s2 · 3.2-6.8 · FIX: a cracked line heals -->
      <div id="s2" class="clip scene g-obsidian" data-start="3.2" data-duration="3.6" data-track-index="1" data-track-kind="graphics">
        <div class="band">
          <div class="l r3-fix-q" data-split>Broken project?</div>
          <div class="r3-crack" data-layout-allow-overflow>
            <div class="r3-seg r3-seg1" style="left: 0px"></div>
            <div class="r3-seg r3-seg2" style="left: 280px"></div>
            <div class="r3-seg r3-seg3" style="left: 560px"></div>
          </div>
          <div class="xl ice r3-fix-a" data-split>Fix it.</div>
        </div>
      </div>

      <!-- s3 · 6.8-10.4 · BUILD: blocks stack into a web page -->
      <div id="s3" class="clip scene g-graphite" data-start="6.8" data-duration="3.6" data-track-index="1" data-track-kind="graphics">
        <div class="band">
          <div class="l r3-build-q" data-split>Got an idea?</div>
          <div class="r3-site">
            <div class="r3-bar"></div>
            <div class="r3-dot" style="left: 26px"></div><div class="r3-dot" style="left: 58px"></div><div class="r3-dot" style="left: 90px"></div>
            <div class="r3-blk r3-b1" style="left: 30px; top: 92px; width: 768px; height: 54px"></div>
            <div class="r3-blk r3-hero r3-b2" style="left: 30px; top: 170px; width: 768px; height: 210px"></div>
            <div class="r3-blk r3-cta r3-b3" style="left: 30px; top: 404px; width: 250px; height: 66px"></div>
            <div class="r3-blk r3-b4" style="left: 30px; top: 494px; width: 372px; height: 78px"></div>
            <div class="r3-blk r3-b5" style="left: 426px; top: 494px; width: 372px; height: 78px"></div>
          </div>
          <div class="xl ice r3-build-a" data-split>Build it.</div>
        </div>
      </div>

      <!-- s4 · 10.4-14.0 · AUTOMATE: the same task every day, then the loop closes -->
      <div id="s4" class="clip scene g-elevated" data-start="10.4" data-duration="3.6" data-track-index="1" data-track-kind="graphics">
        <div class="band">
          <div class="l r3-auto-q" data-split>Same task every day?</div>
          <div class="r3-cal" data-layout-allow-overflow>
            <svg class="r3-ring" viewBox="0 0 840 430" data-layout-ignore>
              <rect class="r3-ring-path" x="70" y="30" width="700" height="370" rx="60" fill="none" stroke="#38BDF8" stroke-width="12" stroke-linecap="round" />
            </svg>
            <div class="r3-card">
              <div class="r3-day" data-layout-allow-overflow>
                <div class="r3-days"><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>MON</div><div>TUE</div><div>WED</div><div>EVERY DAY</div></div>
              </div>
              <div class="r3-task">copy → paste → send</div>
            </div>
          </div>
          <div class="xl ice r3-auto-a" data-split>Automate it.</div>
        </div>
      </div>

      <!-- s5 · 14.0-16.7 · all three, one platform -->
      <div id="s5" class="clip scene g-blue" data-start="14" data-duration="2.7" data-track-index="1" data-track-kind="graphics">
        <div class="band r3-three">
          <div class="xl r3-t1">Fix.</div>
          <div class="xl r3-t2">Build.</div>
          <div class="xl r3-t3">Automate.</div>
          <div class="s ink r3-one" data-split style="margin-top: 50px">One platform. In the works.</div>
        </div>
      </div>

      <!-- s6 · 16.7-19.7 · the poll in the comments -->
      <div id="s6" class="clip scene g-obsidian" data-start="16.7" data-duration="3" data-track-index="1" data-track-kind="graphics">
        <div class="band">
          <div class="m r3-ask" data-split>Which do you need first?</div>
          <div class="r3-pick">
            <div class="r3-opt r3-o1"><b>1</b><span>Fix</span></div>
            <div class="r3-opt r3-o2"><b>2</b><span>Build</span></div>
            <div class="r3-opt r3-o3"><b>3</b><span>Automate</span></div>
          </div>
          <div class="s muted r3-cmt" data-split style="margin-top: 30px">Comment 1, 2 or 3</div>
        </div>
      </div>
""",
    "js": """
      // s1 · slot machine lands on "do all three."
      tl.fromTo(".r3-strip", { y: 0 }, { y: -6 * 132, duration: 1.5, ease: "power3.inOut" }, 0.7);

      // s2 · cracked segments snap straight and turn blue
      blurIn(".r3-fix-q .w", 3.25);
      tl.fromTo(".r3-seg1", { rotation: -14, y: 30, x: -10 }, { rotation: 0, y: 0, x: 0, duration: 0.5, ease: "back.out(1.5)" }, 4.4);
      tl.fromTo(".r3-seg2", { rotation: 11, y: -46, x: 18 }, { rotation: 0, y: 0, x: 0, duration: 0.5, ease: "back.out(1.5)" }, 4.47);
      tl.fromTo(".r3-seg3", { rotation: -8, y: 22, x: 34 }, { rotation: 0, y: 0, x: 0, duration: 0.5, ease: "back.out(1.5)" }, 4.54);
      tl.fromTo(".r3-seg", { backgroundColor: "#ff5c5c" }, { backgroundColor: "#38bdf8", duration: 0.2, ease: "none" }, 4.85);
      blurIn(".r3-fix-a .w", 5.2, 0.1);

      // s3 · wireframe blocks drop in and settle
      blurIn(".r3-build-q .w", 6.85);
      tl.fromTo(".r3-b1, .r3-b2, .r3-b3, .r3-b4, .r3-b5", { y: -90, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "back.out(1.4)", stagger: 0.12 }, 7.55);
      blurIn(".r3-build-a .w", 8.8, 0.1);

      // s4 · the days roll by, then the loop closes around the task
      blurIn(".r3-auto-q .w", 10.45);
      tl.fromTo(".r3-days", { y: 0 }, { y: -8 * 64, duration: 1.6, ease: "power2.inOut" }, 10.9);
      tl.fromTo(".r3-ring-path", { strokeDasharray: 2200, strokeDashoffset: 2200 }, { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut" }, 12.2);
      blurIn(".r3-auto-a .w", 12.6, 0.1);

      // s5 · the three words land, light blue to white
      inkIn(".r3-t1", 14.1, "#9cc7ff", "#ffffff");
      inkIn(".r3-t2", 14.35, "#9cc7ff", "#ffffff");
      inkIn(".r3-t3", 14.6, "#9cc7ff", "#080b10");
      blurIn(".r3-one .w", 15.0);

      // s6 · the poll
      blurIn(".r3-ask .w", 16.75);
      tl.fromTo(".r3-opt", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.3, ease: "expo.out", stagger: 0.12 }, 17.25);
      blurIn(".r3-cmt .w", 17.8);
""",
}

# ---------------------------------------------------------------------------
# 04 · Open source or cloud?: split screen to one, and back
# ---------------------------------------------------------------------------
R04 = {
    "dir": "04-open-or-cloud",
    "title": "VibeHeal reel 04: Open source or cloud?",
    "cta": "Join the beta waitlist",
    "end": 16.8,
    "css": """
      .half { position: absolute; left: 0; right: 0; }
      .top { top: 0; height: 790px; }
      .bot { top: 790px; bottom: 0; }
      .half-text { position: absolute; left: 90px; right: 150px; }
      .top .half-text { bottom: 70px; }
      .bot .half-text { top: 80px; }
      .seam { position: absolute; left: 90px; top: 718px; height: 144px; padding: 0 44px; border-radius: 30px; background: var(--color-ink); color: var(--color-ground); display: flex; align-items: center; font-weight: 900; font-size: 84px; letter-spacing: -0.03em; white-space: nowrap; }
      .seam-slot { height: 144px; overflow: hidden; }
      .seam-strip div { height: 144px; line-height: 144px; text-align: center; }
      .r4-head { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 52px; letter-spacing: 0.02em; margin-bottom: 34px; }
      .r4-slot { height: 260px; overflow: hidden; }
      .r4-strip div { height: 260px; font-weight: 900; font-size: 124px; line-height: 0.98; letter-spacing: -0.04em; display: flex; align-items: flex-start; }
      .r4-note { margin-top: 40px; }
""",
    "html": """
      <!-- s1 · 0-3.0 · split frame on frame 0; "or" rolls to "why not both?" -->
      <div id="s1" class="clip scene g-obsidian" data-start="0" data-duration="3" data-track-index="1" data-track-kind="graphics">
        <div class="half top g-obsidian"><div class="half-text l">Open<br />source</div></div>
        <div class="half bot g-blue"><div class="half-text l">Cloud?</div></div>
        <div class="seam r4-seam" data-layout-allow-overflow>
          <div class="seam-slot"><div class="seam-strip"><div>or</div><div data-layout-allow-occlusion>Why not both?</div></div></div>
        </div>
      </div>

      <!-- s2 · 3.0-7.0 · the open-source world -->
      <div id="s2" class="clip scene g-obsidian" data-start="3" data-duration="4" data-track-index="1" data-track-kind="graphics">
        <div class="band">
          <div class="r4-head ice">OPEN SOURCE</div>
          <div class="r4-slot" data-layout-allow-overflow>
            <div class="r4-strip r4-strip-a"><div>Free to use.</div><div>Run it yourself.</div><div>Read every line.</div></div>
          </div>
        </div>
      </div>

      <!-- s3 · 7.0-11.0 · the cloud world -->
      <div id="s3" class="clip scene g-blue" data-start="7" data-duration="4" data-track-index="1" data-track-kind="graphics">
        <div class="band">
          <div class="r4-head ink">CLOUD</div>
          <div class="r4-slot" data-layout-allow-overflow>
            <div class="r4-strip r4-strip-b"><div>We host it.</div><div>Nothing to set up.</div><div>Paid plan.</div></div>
          </div>
        </div>
      </div>

      <!-- s4 · 11.0-13.8 · same product, your choice -->
      <div id="s4" class="clip scene g-obsidian" data-start="11" data-duration="2.8" data-track-index="1" data-track-kind="graphics">
        <div class="band">
          <div class="xl r4-same" data-split>Same VibeHeal.</div>
          <div class="xl ice r4-choice" data-split style="margin-top: 20px">Your choice.</div>
          <div class="s muted r4-note" data-split>Both versions are planned.</div>
        </div>
      </div>

      <!-- s5 · 13.8-16.8 · pick a team in the comments -->
      <div id="s5" class="clip scene g-obsidian" data-start="13.8" data-duration="3" data-track-index="1" data-track-kind="graphics">
        <div class="half top g-obsidian"><div class="half-text l r4-team-a" data-split>Team<br />OPEN</div></div>
        <div class="half bot g-blue r4-bot"><div class="half-text l r4-team-b" data-split>Team<br />CLOUD</div></div>
        <div class="seam r4-seam2" data-layout-allow-overflow>Comment yours</div>
      </div>
""",
    "js": """
      // s1 · the seam badge rolls from "or" to "Why not both?"
      tl.fromTo(".seam-strip", { y: 0 }, { y: -144, duration: 0.35, ease: "expo.out" }, 1.4);

      // s2 · three reasons roll through one slot
      tl.fromTo(".r4-head", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.14, ease: "power4.out" }, 3.05);
      tl.fromTo(".r4-strip-a", { y: 260 }, { y: 0, duration: 0.35, ease: "expo.out" }, 3.2);
      tl.fromTo(".r4-strip-a", { y: 0 }, { y: -260, duration: 0.3, ease: "expo.out", immediateRender: false }, 4.45);
      tl.fromTo(".r4-strip-a", { y: -260 }, { y: -520, duration: 0.3, ease: "expo.out", immediateRender: false }, 5.7);

      // s3 · the cloud reasons
      tl.fromTo(".r4-strip-b", { y: 260 }, { y: 0, duration: 0.35, ease: "expo.out" }, 7.2);
      tl.fromTo(".r4-strip-b", { y: 0 }, { y: -260, duration: 0.3, ease: "expo.out", immediateRender: false }, 8.45);
      tl.fromTo(".r4-strip-b", { y: -260 }, { y: -520, duration: 0.3, ease: "expo.out", immediateRender: false }, 9.7);

      // s4 · same product, your choice
      blurIn(".r4-same .w", 11.05);
      blurIn(".r4-choice .w", 11.6);
      blurIn(".r4-note .w", 12.3);

      // s5 · the two teams land, then the ask on the seam
      tl.fromTo(".r4-bot", { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: "expo.out" }, 13.8);
      blurIn(".r4-team-a .w", 13.9, 0.08);
      blurIn(".r4-team-b .w", 14.2, 0.08);
      tl.fromTo(".r4-seam2", { scale: 0.6, opacity: 0, transformOrigin: "0% 50%" }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.6)" }, 14.6);
""",
}

# ---------------------------------------------------------------------------
# 05 · Pause game: stop the video on your vibe-coder type
# ---------------------------------------------------------------------------
TYPES = [
    ("The 3am Deployer", "Ships at 3:00. Fixes it at 3:05."),
    ("The 47-Tabs Debugger", "One of them has the answer."),
    ("The “fix it pls” Prompter", "Same prompt. Seventh time."),
    ("The Copy-Paste Wizard", "Doesn't read it. Ships it."),
    ("The Works-On-My-Machine", "Somehow that's never enough."),
    ("The Never-Commits Rebel", "Git? Never met her."),
    ("The Start-Over Hero", "project_v14_FINAL_final"),
    ("The Screenshot Sender", "Error message? Here's a photo."),
]
# Ground and text colour per card, cycling the brand palette.
SKINS = [("g-obsidian", "ink", "ice"), ("g-blue", "ink", "dark"), ("g-graphite", "ink", "ice"), ("g-ice", "dark", "dark")]
CARD_T0, CARD_DUR = 2.7, 0.4
ORDER = list(range(8)) + [3, 6, 1, 4, 7, 0, 5, 2]  # two passes, the second shuffled by hand

cards_html = []
cards_js = []
for i, k in enumerate(ORDER):
    title, line = TYPES[k]
    ground, ink, num = SKINS[i % 4]
    cards_html.append(
        f"""        <div class="fill {ground} r5-card r5-card{i}">
          <div class="band">
            <div class="r5-num mono {num}">TYPE #{k + 1}</div>
            <div class="l {ink} r5-title">{title}</div>
            <div class="s {ink} r5-line">{line}</div>
          </div>
        </div>"""
    )
    cards_js.append(f'      flash(".r5-card{i}", {CARD_T0 + i * CARD_DUR:.2f}, {CARD_DUR});')
CARDS_END = CARD_T0 + len(ORDER) * CARD_DUR  # 9.1

R05 = {
    "dir": "05-pause-game",
    "title": "VibeHeal reel 05: Pause to find your vibe coder type",
    "cta": "Beta testers wanted",
    "end": 15.6,
    "css": """
      .r5-pause { display: flex; gap: 34px; height: 210px; margin-bottom: 56px; position: relative; }
      .r5-bar { width: 66px; height: 210px; border-radius: 14px; background: var(--color-ice); }
      .r5-count { position: absolute; left: 0; top: -40px; font-weight: 900; font-size: 280px; line-height: 1; letter-spacing: -0.05em; color: var(--color-ice); }
      .r5-card { opacity: 0; }
      .r5-num { font-weight: 700; font-size: 52px; margin-bottom: 30px; }
      .r5-title { margin-bottom: 40px; }
      .r5-line { font-size: 64px; }
""",
    "html": f"""
      <!-- s1 · 0-2.7 · hook on frame 0, then a 3-2-1 count -->
      <div id="s1" class="clip scene g-obsidian" data-start="0" data-duration="2.7" data-track-index="1" data-track-kind="graphics">
        <div class="band">
          <div class="r5-pause" data-layout-allow-overlap>
            <div class="r5-bar r5-bars"></div><div class="r5-bar r5-bars"></div>
            <div class="r5-count r5-c3">3</div><div class="r5-count r5-c2">2</div><div class="r5-count r5-c1">1</div>
          </div>
          <div class="xl">Pause</div>
          <div class="m" style="margin-top: 14px">to find your</div>
          <div class="m ice">vibe coder type</div>
        </div>
      </div>

      <!-- s2 · {CARD_T0:g}-{CARDS_END:g} · 16 full-screen cards, 0.4 s each: every frame reads when paused -->
      <div id="s2" class="clip scene" data-start="{CARD_T0:g}" data-duration="{CARDS_END - CARD_T0:.1f}" data-track-index="1" data-track-kind="graphics" data-layout-allow-overlap>
{chr(10).join(cards_html)}
      </div>

      <!-- s3 · {CARDS_END:g}-12.0 · the ask -->
      <div id="s3" class="clip scene g-obsidian" data-start="{CARDS_END:g}" data-duration="{12.0 - CARDS_END:.1f}" data-track-index="1" data-track-kind="graphics">
        <div class="band">
          <div class="xl r5-got" data-split>Got yours?</div>
          <div class="m ice r5-cmt" data-split style="margin-top: 40px">Comment your type</div>
          <div class="s muted r5-shot" data-split style="margin-top: 30px">or screenshot it for your story</div>
        </div>
      </div>

      <!-- s4 · 12.0-15.6 · every type gets stuck; the reveal -->
      <div id="s4" class="clip scene g-obsidian" data-start="12" data-duration="3.6" data-track-index="1" data-track-kind="graphics">
        <div class="fill g-blue flood r5-flood"></div>
        <div class="band r5-stuck" data-layout-allow-overlap>
          <div class="l" data-split>Every type gets stuck sometimes.</div>
        </div>
        <div class="band r5-reveal" data-layout-allow-overlap>
          <div class="s" data-split>So we're building</div>
          <div class="end-name r5-name" data-split="chars" style="margin-top: 14px">VibeHeal</div>
          <div class="s r5-for" data-split style="margin-top: 30px">for every one of them.</div>
        </div>
      </div>
""",
    "js": f"""
      // s1 · the pause icon becomes a countdown
      tl.fromTo(".r5-bars", {{ opacity: 1 }}, {{ opacity: 0, duration: 0.1, ease: "none", immediateRender: false }}, 1.65);
      flash(".r5-c3", 1.7, 0.33);
      flash(".r5-c2", 2.03, 0.33);
      flash(".r5-c1", 2.36, 0.34);

      // s2 · the cards, hard cuts every {CARD_DUR} s
{chr(10).join(cards_js)}

      // s3 · the ask
      blurIn(".r5-got .w", {CARDS_END + 0.05:.2f}, 0.1);
      blurIn(".r5-cmt .w", {CARDS_END + 0.6:.2f});
      blurIn(".r5-shot .w", {CARDS_END + 1.2:.2f});

      // s4 · blue flood, the line, then the reveal through a blur swap
      flood(".r5-flood", 12.0);
      blurIn(".r5-stuck .w", 12.3);
      blurOut(".r5-stuck", 13.75);
      blurIn(".r5-reveal .s .w", 13.9);
      tl.fromTo(".r5-name .c", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.08, stagger: 0.06, ease: "none" }}, 14.15);
      blurIn(".r5-for .w", 14.75);
""",
}

REELS = [R02, R03, R04, R05]
