# VibeHeal waitlist reels (Instagram)

**Status:** draft for owner review. Five 9:16 reels made with [HyperFrames](https://hyperframes.heygen.com) (HTML rendered to MP4). They show no product UI, because the product is still in development. They aim to get waitlist signups and beta testers, and to explain why VibeHeal exists.

| # | Folder | Length | Idea | The interactive part |
|---|---|---|---|---|
| 1 | `01-it-worked/` | 21.6 s | POV: it worked 5 minutes ago. Errors pile up, you type "fix it pls", the AI changes 14 files. Which one broke it? | "Comment the worst error you've ever seen" |
| 2 | `02-why-we-built-it/` | 22.2 s | Why we're building it: AI made building easy, fixing is still a loop (break, ask, guess, break, repeat), and beginners are left stuck | "Tag a friend whose app broke this week" |
| 3 | `03-fix-build-automate/` | 22.9 s | A slot machine rolls "fix my app / build a site / automate stuff" and lands on "do all three". One scene for each job | Poll in the comments: "Comment 1, 2 or 3" |
| 4 | `04-open-or-cloud/` | 20.0 s | Open source or cloud? Why not both: a free open-source version you run yourself, and a paid cloud version we run for you | "Team OPEN or Team CLOUD? Comment yours" |
| 5 | `05-pause-game/` | 18.8 s | Pause to find your vibe-coder type: 16 full-screen cards flash past at 0.4 s each | Pause, then comment your type or screenshot it for your story |

Every reel ends on the same card: the VibeHeal mark, "Just vibeheal it.", the call to action (waitlist or beta testers), **vibeheal.online** and "link in bio".

## What the reels claim, and what they don't
- Everything about the product is phrased as **being built** or **planned**. That covers "fix, build, automate" and the open-source and paid cloud versions, all from the owner's brief.
- There are no prices, dates, user counts, testimonials, third-party logos, screenshots or detailed unbuilt features.
- The error messages, "14 files" and the vibe-coder types are jokes. They are not product output or statistics.
- **Check before posting:** the waitlist form at vibeheal.online must be live and working (DEC-29, DEC-31), and the Instagram bio must link to it.

## Posting checklist
1. **Add sound in Instagram.** The MP4s are silent on purpose. Pick a trending sound in the Reels editor and keep it quiet behind the type. Business accounts only get Instagram's royalty-free library, which is fine. HyperFrames could not add music here (no music source in this environment).
2. **Cover:** frame 0 of each reel is designed as the thumbnail, with the hook already on screen. Keep the default first frame, or pick it in "Edit cover".
3. **Pin a comment** that repeats the ask, so the first comment people see invites theirs (examples below).
4. **Reply to early comments** within the first hour. Replies count as engagement and start threads.
5. Suggested order, one every 2–3 days: **1 → 5 → 3 → 2 → 4.** Lead with relatable pain, then the game, the poll, the story and the open-source question.
6. Optional: share each reel to your Story with a **poll sticker** (reel 3: Fix / Build / Automate; reel 4: Open source / Cloud). That gives a second way to interact.
7. Optional: post a reel as a **trial reel** first, so it is shown to non-followers before your followers.

## Captions (copy and paste)

**Reel 1: It worked 5 minutes ago**
> It worked. Then you asked your AI to "fix one thing". 💀
> We're building VibeHeal to help vibe coders fix, understand and undo what AI changes.
> 👇 Drop the worst error you've ever seen. Waitlist: link in bio.
> #vibecoding #buildinpublic #webdev #aicoding #indiehackers

Pinned comment: `Mine: "Hydration failed" at 2am the night before a demo. Yours? 👇`

**Reel 2: Why we're building it**
> AI made building apps easy. Fixing them is still a loop: break, ask, guess, break again.
> That's why we're building VibeHeal: one place to fix, build and automate, made for vibe coders.
> We're building in public and looking for beta testers. Link in bio.
> #vibecoding #buildinpublic #startup #nocode #aicoding

Pinned comment: `Tag the friend who has said "it was working yesterday" this week 😅`

**Reel 3: Fix. Build. Automate.**
> Fix a broken project. Build a website. Automate the boring stuff.
> VibeHeal is in the works. Help us choose what to ship first:
> 1️⃣ Fix  2️⃣ Build  3️⃣ Automate. Comment your number 👇
> #vibecoding #automation #webdesign #buildinpublic #indiehackers

Pinned comment: `Most-voted gets built first. Comment 1, 2 or 3 👇`

**Reel 4: Open source or cloud?**
> Open source or cloud? VibeHeal is planned to come in both:
> 🛠️ a free open-source version you run yourself
> ☁️ a paid cloud version we run for you
> Team OPEN or Team CLOUD? Tell us why 👇 Waitlist in bio.
> #opensource #vibecoding #buildinpublic #devtools #selfhosted

Pinned comment: `Team OPEN or Team CLOUD? Wrong answers only 😄`

**Reel 5: Pause game**
> ⏸️ Pause to find your vibe-coder type. No skipping ahead.
> Comment what you got, or screenshot it for your story and tag us.
> Every type gets stuck sometimes. We're building VibeHeal for all of them. Beta testers wanted: link in bio.
> #vibecoding #codinghumor #programmerhumor #buildinpublic #aicoding

Pinned comment: `I got "The Never-Commits Rebel" and I feel attacked 😭 What did you get?`

## Editing and re-rendering
HyperFrames is not a dependency of this repository. It runs through `npx`, pinned to the version these files were made with.

- **Reel 1** is hand-written: edit `01-it-worked/index.html`.
- **Reels 2–5** are generated from one shared shell (brand colours, word splitter and end card). Edit `tools/reels.py`, then rebuild:

```bash
python3 marketing/reels/tools/build.py
```

Preview in the browser (from a reel folder):

```bash
npx --yes hyperframes@0.9.19 preview
```

Check for broken timing, layout and contrast:

```bash
npx --yes hyperframes@0.9.19 check
```

Render the MP4:

```bash
npx --yes hyperframes@0.9.19 render -o ../renders/reel.mp4
```

Each reel declares its colours and the waitlist URL as variables, so you can change them in the preview's Variables panel. Rendered MP4s go to `renders/`, which Git ignores.

See `SPEC.md` for the look and the rules, and `REVIEW.md` for what was checked.
