# BrixoAI — Beginner's Guide (Planning v2)

**Who this is for:** you, if you have never built a complex application before. It explains what BrixoAI's parts are, why they exist, what you need to sign up for and install, and what Claude Code will help you build.

**Status:** this guide describes the **plan**. None of the BrixoAI software exists yet.

---

## 1. The whole idea, explained with a restaurant

| Restaurant | BrixoAI | Real technology |
|---|---|---|
| **Dining room and menu** — where customers order and see their food arrive | **Web app** — where you type tasks and watch progress | Next.js website hosted on Netlify |
| **Order board** — orders are pinned up, the kitchen picks them, status gets updated | **Database with live updates** | Supabase (Postgres + Realtime) |
| **Doorman with a guest list** — only you get into your table | **Login + Row Level Security** | Supabase Auth + RLS |
| **The kitchen** — where the actual cooking happens | **BrixoAI Helper on your computer** | A Node.js program you run |
| **The chef** — skilled, but follows house rules | **Claude Code** | Claude Agent SDK |
| **"Ask the customer before adding peanuts"** | **Approvals** — the agent asks before risky actions | `canUseTool` callback + approval cards |
| **The pantry the chef may use** — not your whole house | **Allowlisted project folders** | The helper's folder allowlist |
| **The bill** — each customer pays for their own meal | **Your own AI usage**, on your own Anthropic account | Your API key, stored on your computer |

The important part: **the cooking happens in your kitchen (your computer), not in BrixoAI's cloud.** That keeps costs near zero and your code private, but it also means your computer must be on for tasks to run. A "cloud kitchen" (cloud workers) is a later phase.

## 2. Glossary (terms used in the planning docs)

| Term | Plain-English meaning |
|---|---|
| **Frontend** | The part of an app you see in the browser |
| **Backend / server** | Code that runs on a computer in the cloud, where secrets can be kept safe |
| **Database** | Organised permanent storage for app data (like very powerful spreadsheets) |
| **Postgres** | A popular, free, open-source database. Supabase is built on it |
| **Authentication (auth)** | Proving who you are (logging in) |
| **Authorization** | Deciding what you're allowed to do once logged in |
| **RLS (Row Level Security)** | Database rules that make sure you only ever see your own rows |
| **API** | A way for programs to talk to each other ("send me this user's repositories") |
| **API key** | A secret password for a program to use an API. Treat it like a bank card PIN |
| **OAuth** | "Log in with GitHub and allow access" — you approve on GitHub's site; the app never sees your password |
| **Token** | A temporary pass that proves permission, often expiring |
| **Environment variable** | A setting given to a program at startup, often used for secrets so they're not written in code |
| **Repository (repo)** | A project folder tracked by Git, often stored on GitHub |
| **Git** | A tool that records every change to your code so you can review or undo it |
| **Branch** | A separate line of changes in Git, so experiments don't affect the main version |
| **Commit** | A saved snapshot of changes in Git |
| **Diff** | A view showing exactly which lines changed |
| **Pull request (PR)** | A request on GitHub to merge a branch, with a review page |
| **Deploy** | Putting a new version of a website live on the internet |
| **Preview deploy** | A private test version of your site at a temporary URL |
| **Serverless function** | Server code that runs only when needed, then stops. Cheap, but not for long jobs |
| **Realtime** | Instant push updates (no page refresh) |
| **CLI (command-line interface)** | A program you use by typing commands in a terminal |
| **Terminal** | The text window where you type commands (Terminal on Mac, PowerShell/WSL on Windows) |
| **Node.js** | Software that runs JavaScript/TypeScript programs on your computer |
| **npm** | The tool that installs JavaScript packages (comes with Node.js) |
| **TypeScript** | JavaScript with types, which catches many mistakes before you run the code |
| **Next.js** | A framework for building React websites with server code included |
| **React** | A library for building user interfaces out of components |
| **Tailwind CSS** | A quick way to style pages using small class names |
| **shadcn/ui** | Ready-made, editable UI components (buttons, dialogs) you copy into your project |
| **Supabase** | A hosted service giving you a database, logins, live updates and file storage |
| **Netlify** | A hosting service that puts websites online |
| **AI agent** | An AI that can take actions with tools (edit files, run commands), not just chat |
| **Claude Code** | Anthropic's coding agent, which BrixoAI uses as its engine |
| **Agent SDK** | The official library that lets programs like BrixoAI run Claude Code's agent |
| **Helper** | BrixoAI's small program on your computer that runs agent tasks |
| **Pairing** | Linking your helper to your BrixoAI account with a short code |
| **Allowlist** | A list of things that *are* allowed — here, the folders the agent may use |
| **Sandbox** | A walled-off area where commands can run without touching the rest of your computer |
| **Approval** | BrixoAI pausing to ask you "is this OK?" before a risky action |
| **MCP** | A standard plug for connecting AI agents to external tools |
| **Skill** | A saved set of instructions that teaches an agent how to do a specific job |
| **Prompt injection** | Hidden text in a file or web page that tries to trick the AI into doing something bad |
| **Redaction** | Blacking out secrets (keys, passwords) before anything is saved or shown |
| **CI (continuous integration)** | Automatic checks (tests, linting) that run on every code change |
| **Lint** | An automatic check for code style and common mistakes |
| **Unit test / end-to-end test** | A test of one small piece / a test that clicks through the real app like a user |
| **Migration** | A versioned script that changes the database's structure |
| **Monorepo** | One repository containing several related projects (web app, helper, shared code) |
| **Open source** | Code anyone can read, use and improve, under a licence (MIT, Apache-2.0, AGPL…) |

## 3. What each service does, and why you need it

| Service | What it does for BrixoAI | Do you need an account? | Cost to start |
|---|---|---|---|
| **GitHub** | Stores the BrixoAI code; runs automatic checks (CI); later lets agents open pull requests | **Yes** (you likely have one) | Free |
| **Supabase** | BrixoAI's database, login system and live updates | **Yes** — from milestone M2 | Free tier (pauses after ~7 days without use; just un-pause) |
| **Netlify** | Hosts the BrixoAI website on the internet | **Yes** — from M2, only when you approve the first deploy | Free tier (300 credits/month; sites pause if credits run out) |
| **Anthropic (Claude Console)** | Gives you an API key so Claude Code can do the work | **Yes** — from M1 | Pay-as-you-go. **Set a monthly spend limit** in the console |
| Docker Desktop | Runs a private copy of Supabase on your computer for safe testing | Optional (recommended from M2) | Free for personal use (check the licence terms for your situation) |
| Sentry | Error tracking | Optional, later | Free developer tier |

All prices and limits are summarised, with sources and verification status, in [TECH_STACK.md](./TECH_STACK.md).

## 4. What you install on your computer

| Install | Why | When |
|---|---|---|
| **Git** | Version control | Now (likely already installed) |
| **Node.js (LTS version)** | Runs the web app in development and the BrixoAI Helper. Includes npm | Before M0 |
| **Claude Code CLI** | You'll use it to *build* BrixoAI (and you already use Claude Code here) | Now |
| **A code editor** (e.g. VS Code) | To read and edit files | Optional but helpful |
| **Docker Desktop** | Local Supabase for testing database security rules | Before M2 (optional) |
| **Supabase CLI** | Manage database migrations and the local Supabase | M2 (installed when you approve) |
| **On Windows: WSL2** | Claude Code's safety sandbox doesn't work on native Windows; WSL2 gives a Linux environment where it does | Before M1, if you use Windows |

**Claude Code will never install packages or tools without asking you first** (project rule in [../../CLAUDE.md](../../CLAUDE.md)).

## 5. Who does what

| Task | You | Claude Code (helping you build BrixoAI) |
|---|---|---|
| Make product decisions (licence, sign-in method, scope) | ✅ | Explains options and recommends |
| Create accounts (GitHub, Supabase, Netlify, Anthropic) | ✅ | Gives step-by-step instructions |
| Create and store API keys and secrets | ✅ — in the right places only (password manager, Netlify env settings, helper keychain) | **Never asks you to paste keys into chat** |
| Write the code (web app, helper, database migrations, tests) | Review | ✅ in small milestones |
| Run tests and checks | Watch the results | ✅ runs them and reports the **actual** output |
| Approve installs, deploys, merges, paid services | ✅ always | Asks first |
| Supply the Stitch design screens | ✅ (export into `design/stitch/`) | Implements screens to match them |
| Test on your real computer (pairing, a real task) | ✅ | Gives a checklist |

## 6. The roadmap in plain English

1. **M0 — Set up the workshop.** An empty but tidy project with automatic checks.
2. **M1 — Teach the kitchen to cook.** The helper runs Claude Code on a folder from the terminal, asks before risky steps, and stops when you press Ctrl+C.
3. **M2 — Build the dining room and the order board.** A website where you log in and pair your computer.
4. **M3 — Take a real order end to end.** Type a task in the website; your computer does it; you watch live; approve or cancel; see the result. **This is the heart of BrixoAI.**
5. **M4 — Give the chefs names and personalities.** Saved AI teammates, conversations and cost display. **The MVP is done here.**
6. **M5–M9 — Expand the menu.** GitHub pull requests, skills, memory, website publishing, external tools.
7. **Later — Open more locations.** Cloud computers, schedules, browser use, voice and more.

Full details: [ROADMAP.md](./ROADMAP.md).

## 7. Safety rules to remember

- **Never paste API keys or passwords into chat, task prompts, documents or code files.** Each key has one proper place, and BrixoAI will tell you where.
- **Set a spend limit** on your Anthropic account before running agents.
- **Only allowlist project folders**, never your whole home folder.
- **Read approval cards** before clicking Approve. If you don't understand one, deny it. The agent will cope.
- **Use Git**, so you can always undo what an agent changed.
- **Only approve pairing codes you see on your own screen right now.**

## 8. Practical setup checklist

Do these in order. Don't skip ahead. Each milestone tells you when the next item is needed.

**Before M0 (now)**
- [ ] Read [README.md](./README.md) in this folder and decide on the items under "Decisions that need your approval".
- [ ] Install Git and confirm it works: `git --version`.
- [ ] Install Node.js LTS from the official nodejs.org website, then check: `node --version` and `npm --version`.
- [ ] (Windows users) Install WSL2 and do your BrixoAI work inside it.
- [ ] Make sure you can push to this GitHub repository.

**Before M1**
- [ ] Create an account in the Claude Console (platform.claude.com).
- [ ] **Set a monthly spend limit.**
- [ ] Create an API key. Keep it in a password manager. **Do not paste it into chat or any file.** In M1 you'll type it into the helper's hidden prompt, which saves it in your computer's keychain.
- [ ] Prepare a small **test project folder** (or let Claude Code create a sample) that you don't mind an agent editing.

**Before M2**
- [ ] Create a Supabase account and one free project named `brixo-dev`. Note the project URL. (The secret keys go into a local `.env` file that git ignores, and later into Netlify's environment settings. Claude Code will show you exactly where.)
- [ ] (Optional, recommended) Install Docker Desktop for local database testing.
- [ ] Create a Netlify account. Don't connect anything until Claude Code asks for your approval to deploy.

**Before M5 (later)**
- [ ] Register a GitHub App (Claude Code will provide the exact permission list).

**Before inviting other people to test**
- [ ] Confirm every item in the security gate in [SECURITY.md](./SECURITY.md#must-be-implemented-before-testing-with-real-users) is done.
- [ ] Consider upgrading Supabase to a paid plan (backups, no pausing).
- [ ] Choose and add an open-source licence (if not done in M0).

## 9. What to expect emotionally (honest advice)

- The first milestones produce things that look small (a terminal program, a login page). That's normal and good: they're the foundations everything else stands on.
- Things will break. Tests and small steps make breakages easy to find.
- If Claude Code ever claims something works without showing you a real test or a real result, ask it to prove it. The project rules require that.
