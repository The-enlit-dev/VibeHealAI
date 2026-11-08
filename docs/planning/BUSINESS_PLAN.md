# VibeHeal Business Plan ($0, run by a 13-year-old founder)

**Status:** written 2026-11-08. It covers everything the business needs that the owner can do for free, plus a **one-week Diwali sprint** to ship the first product, **VibeHeal Guard 0.1** (DEC-37), and a school-friendly routine afterwards.
Related: [FEATURES.md](./FEATURES.md) (the long-term product), [../../marketing/GTM.md](../../marketing/GTM.md) (marketing and sales), [DECISIONS.md](./DECISIONS.md).

> **Ground rules (same as GTM.md §0):**
> - A parent or guardian is involved in anything legal or money-related.
> - Only use platforms you're old enough for.
> - Keep personal details private.
> - No cold outreach to strangers.
> - Be honest about what exists.

---

## 1. The business on one page

| | |
|---|---|
| **Mission** | Let anyone use AI agents on their own stuff safely. |
| **Problem** | AI tools change files people don't understand. When something breaks, they can't see what changed or get back to a working version. |
| **Customer** | Beginner and hobby "vibe coders" on Windows who build with Claude Code, Cursor and similar tools (GTM.md §2). |
| **Product now** | **VibeHeal Guard:** watches a project folder you choose, snapshots every change any AI tool makes, shows what changed, and undoes it in one click. Free, offline, no AI needed. |
| **Product later** | The safe agent platform: the Agent Relay, automation agents, a marketplace (FEATURES.md). |
| **Why us** | Safe by design: you choose what is touched; everything is visible and undoable; data stays on your laptop; it works with the AI you already use. |
| **Business model** | **Free** (local, bring your own AI) → **Pro** later (cloud agents and power features). Price **not decided** (P-17). |
| **Costs today** | **$0**, apart from renewing the `vibeheal.online` domain each year (a family decision). |
| **Goals (90 days)** | Guard 0.1 shipped; 300 waitlist signups; 20 active testers; 15 real conversations. |

---

## 2. Everything the business needs, and how to do it for free

### 2.1 Legal and admin (with a parent)
| Item | What to do | Free? | Who |
|---|---|---|---|
| **Business entity** | Not needed while there's no revenue. When money starts, your parent sets it up (for example as a sole proprietor in their name), with an accountant's advice. | Yes, until revenue | Parent |
| **Terms of Use** for the app | A short, plain-language page: the app is provided as is, it's in early beta, you're responsible for your own projects, and Guard keeps local copies (snapshots) of your files. Your parent reads it before it is published. | Yes | You draft (Claude Code can help); parent reviews |
| **Privacy policy** | The website already has a privacy notice. Add an **app section**: Guard sends nothing anywhere, and snapshots stay on your computer. | Yes | You plus parent |
| **Licence** | Decide whether the app is open source. Apache-2.0 was the intent (DEC-15), but the LICENSE file needs your explicit approval (P-4). Open source also unlocks free code signing (see 2.4). | Yes | You decide |
| **Trademark** | Search "VibeHeal" for free on IP India's public search (and USPTO/WIPO if you sell abroad). Filing a trademark costs money, so do it later. | The search is free | You plus parent |
| **Money tracking** | A Google Sheet with columns: date, what, amount in, amount out. Keep it even while everything is $0. | Yes | You |
| **Age rules** | Check each platform's minimum age (LinkedIn 16+; Stripe and payments need an adult). | Yes | You |

### 2.2 Branding (already strong; finish and keep it consistent)
- **Already done:** name, catch line ("Just vibeheal it."), colours, voice rules ([brand-guidelines.md](../../marketing/brand-guidelines.md)), and the logo files from PR #9 (`website/assets/logo-mark.png`, `logo-lockup.png`).
- **To do (about 2 hours):**
  - [ ] **One-page brand kit** in `marketing/brand-kit.md`: logo files, when to use the mark or the lockup, the colours, a one-line description, and a 50-word description.
  - [ ] **Same handle everywhere** you're allowed to sign up (for example `@vibeheal`; check availability yourself on each platform). Same bio, same logo, and the `vibeheal.online` link.
  - [ ] **App icon:** the logo mark exported as a Windows `.ico` (free tools such as GIMP or an online converter).
  - [ ] **Screenshots and a 30-second demo video** of Guard, made after the sprint (free screen recorder).
  - [ ] **Rename the Clerk app** from "Vibe Heal AI" to "VibeHeal" (Clerk Dashboard → Settings).

### 2.3 Website (already live; small updates)
- [ ] **First, fix `main`.** The site generator has crashed since the PR #9 merge, so no website update can deploy. The verified fix is in the PR #14 comment. **You decide whether to apply it.**
- [ ] A **Download Guard** section on the home page and an `/download/` page: Windows only, an honest "early beta" label, system requirements, and how to install an unsigned app (see 2.4).
- [ ] Update the capability status on the site: Guard becomes **available (beta)** only once it's really downloadable.
- [ ] A launch blog post written in `/studio/`: "VibeHeal Guard 0.1: undo for your AI coder".
- [ ] Google Search Console and Bing setup (owner steps in `docs/website/SEARCH_CONSOLE.md`).

### 2.4 Development and release (details in §3)
- **Tools, all free:** Windows, Node.js 22 LTS, Git, VS Code, and Claude Code (your existing subscription).
- **Distributing the installer:**
  - **[Recommendation]** a separate **public** GitHub repository just for releases (for example `vibeheal-releases`). Its Releases page hosts the installer for free and counts downloads. Your main code repository stays private (DEC-12); changing that needs your decision (P-3).
  - Alternative: host the file on Netlify. Large downloads use Netlify credits, so GitHub Releases is better.
- **Code signing:** an unsigned Windows app shows a "Windows protected your PC" (SmartScreen) warning.
  - Paid certificates cost money, so **0.1 ships unsigned**, with clear install steps on the download page.
  - If the app becomes open source, **SignPath Foundation offers free code signing for open-source projects**. Check their current rules first.
- **Updates:** for 0.1, a simple "new version available" link that checks the releases page. Automatic updates come later.

### 2.5 Support and community (free)
- **Feedback:** a "Send feedback" button in Guard that opens a website form (Netlify Forms, like the waitlist). The app itself sends nothing automatically.
- **FAQ:** add Guard questions to `site/faq.json`.
- **Discord "VibeHeal Builders":** start it when there are about 20 testers.
- **Bug reports:** from the feedback form or Discord, tracked in a GitHub issue list (private repo) or a sheet.

### 2.6 Measuring (honest and private)
- **Downloads:** GitHub Releases download counts.
- **Waitlist:** Netlify Forms. **Accounts:** the Clerk dashboard. **Feedback:** the form.
- **No tracking inside the app.** That is part of the promise.

### 2.7 Marketing and sales
See [GTM.md](../../marketing/GTM.md): free channels, the weekly routine, self-serve sales, and no cold outreach.

---

## 3. The Diwali sprint: ship VibeHeal Guard 0.1 in 7 days
**What Guard 0.1 does:**
1. You pick **one project folder**. Guard only ever looks inside it, and skips `node_modules`, `.git`, build output and very large files.
2. Whenever files change (from Claude Code, Cursor, Hermes, you, anything), Guard waits until the burst of changes stops, then saves a **snapshot**.
3. A **timeline** shows each snapshot: time, files changed, lines added and removed.
4. A **readable diff** shows what changed in each file.
5. **Undo:** restore one file or a whole snapshot. Guard takes a safety snapshot first, so even the undo can be undone.
6. **Claude Code notifications:** a Windows notification when Claude Code is waiting for your permission or has finished. This uses hooks you add to your own Claude Code settings; Guard does not control Claude Code. **[Verify]** the hook event names in Claude Code's current documentation.
7. **Pause** and **resume** watching. Everything is stored locally in your user data folder. No network, no account, no AI.

**Not in 0.1:**
- the Agent Relay, automation agents, the marketplace and cloud;
- macOS and Linux;
- automatic updates.

**How the work is split:** Claude Code writes most of the code from small, clear tasks. You test on real projects, decide, and approve. Each day ends with `npm run check` passing and a commit.

### Day 0 (about 2 hours, before the sprint)
- [ ] Decide on the `main` fix (2.3) so the website can deploy again.
- [ ] Approve this plan and the small set of new dependencies. CLAUDE.md requires approval for each one.
  - a **diff** library (for example `diff`, BSD licence);
  - **electron-builder** (MIT) for the Windows installer.
  - **Recommendation:** use Node's built-in `fs.watch` (recursive on Windows) and a simple built-in snapshot store, so nothing else is needed.
- [ ] On Windows: install Node 22 LTS, Git and VS Code. Clone the repo, then `npm ci` and `npm run check`.
- [ ] Gather **3 test projects**: one small working app, one you break on purpose, and one real project. Copy them first, and never test on your only copy.

### Day 1: folder picker and safe watching
- Add a "Choose project folder" screen. Remember the choice locally.
- Watch only that folder, with ignore rules (`node_modules`, `.git`, `dist`, files over 5 MB).
- **Tests:**
  - only the chosen folder is read;
  - ignored folders never trigger snapshots;
  - symlinks that point outside the folder are not followed.

### Day 2: snapshot engine
- Wait for about 2 seconds of quiet, then record the changed files.
- Store each file's content once, by its hash, in the app's data folder, plus a small snapshot record (time, files, sizes).
- A storage limit (for example 1 GB or 200 snapshots) with the oldest removed first, and a note in settings.
- **Secrets:** `.env`-style files are snapshotted (so undo works) but **never shown** in the diff view. They are masked, and they stay local.
- **Tests:** create, change, delete and rename files; restore them exactly; check that the storage limit works.

### Day 3: timeline and diff view
- A timeline list (newest first) and a file list per snapshot.
- A side-by-side or unified diff view, with plain-language labels ("3 files changed, 42 lines added").
- An empty state: "No changes yet. Start your AI tool and Guard will record every change."

### Day 4: undo
- "Restore this file" and "Restore everything to this point", each with a confirmation.
- A safety snapshot is always taken before restoring.
- **Tests on real projects:** break the app on purpose, restore, and check the app runs again.

### Day 5: Claude Code notifications, pause and settings
- A small notify helper plus copy-paste setup steps for the user's own Claude Code hooks. Windows notifications through Electron's main-process `Notification`.
- Pause and resume, a storage setting, and "Open data folder".
- A first-run screen: what Guard does, what it never does, and the privacy summary.

### Day 6: installer and testing
- A Windows installer with electron-builder, using the app icon and name.
- Install it on a clean Windows user account and run through all 3 test projects.
- Fix the top bugs. Write `docs/guard/README.md`: how to install, use, undo, set up notifications, and the known limits.

### Day 7: release
- Publish Guard 0.1 on the public releases repository (2.4).
- Update the website: the download page, the honest beta label, the FAQ and the launch blog post.
- Record a 30-second demo video (break → see the change → one-click undo).
- Email the **first 10–20 waitlist signups** (they agreed to early-access emails) with the download link and the feedback form.
- Post the launch update on your allowed channels (GTM.md).

**If you fall behind:** cut in this order:
1. Claude Code notifications;
2. installer polish (ship a zip instead);
3. the storage settings.

**Never cut:** folder-only access, safety snapshots before undo, and secret masking.

---

## 4. After Diwali: school mode (about 4 hours a week)

| When | What | Time |
|---|---|---|
| Weekly | The GTM routine: posts, replies, waitlist answers (GTM.md §7) | 3.5 hours |
| Weekly | Read feedback and pick **one** bug or small improvement for Claude Code | 30 min |
| Every 2–3 weeks | Release a Guard update (0.1.x) with a short changelog post | 1 hour |
| Monthly | Update the money sheet and metrics; one "what I learned" post | 30 min |
| Exam weeks | Only reply to messages. Nothing else. | 15 min |

**Next big step (a future holiday):** Error healer and project memory, then the Agent Relay (FEATURES.md, phase 2). Each needs your approval first.

---

## 5. Risks and how to handle them

| Risk | Plan |
|---|---|
| The sprint runs late | Use the cut order above. Shipping a smaller 0.1 beats shipping nothing. |
| A bug loses someone's work | Safety snapshot before every restore; tests with real projects; "back up first" advice; an honest beta label. |
| SmartScreen warning scares users | Clear install steps on the download page; explore free signing if the app goes open source. |
| Too little time during school | The fixed 4-hour routine and exam-week mode. |
| Netlify free credits run out | Few merges per month (about 20 deploys); installer downloads hosted on GitHub Releases. |
| Online safety | GTM.md §0 rules; a parent for money, contracts and calls. |

---

## 6. Decisions needed from you

| ID | Decision | Recommendation |
|---|---|---|
| Fix `main` | Apply the verified fix from PR #14's comment so the website can deploy again. | Yes, before the sprint. |
| Dependencies | Approve `diff` and `electron-builder`. | Yes, both. |
| P-3 | Create a **separate public** `vibeheal-releases` repository for installers; the code repository stays private. | Yes. |
| P-4 | Open-source licence (Apache-2.0) now or later. | Later; ship 0.1 first. |
| Legal pages | You and a parent review the Terms of Use and the app privacy section before Day 7. | Yes. |
