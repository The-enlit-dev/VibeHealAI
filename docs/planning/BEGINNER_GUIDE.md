# BrixoAI — Beginner's Guide (Planning v3)

**Who this is for:** you, the project owner, and anyone new to building software. It explains what BrixoAI will be, how its parts fit together, what it costs, and what to set up.

**Status:** updated 2026-10-31. The **integration marketplace** now exists as early software you can run on your own computer (see §8). The **broken-project safety workflow** in §1 is still a plan. Labels are defined in [DECISIONS.md](./DECISIONS.md).

---

## 1. BrixoAI in one minute

You built a website or app with AI help, and now it's broken. BrixoAI is a free Windows program that:
1. looks at **one** project folder you choose, and nothing else on your computer;
2. runs the check you approve (for example "build") and shows the error;
3. explains common errors in plain English;
4. prepares a safe summary you can paste into Claude Code yourself;
5. takes a **backup** before you try a fix;
6. shows you **exactly what changed** afterwards;
7. lets you **undo** any change;
8. re-runs the check and tells you honestly whether it now passes.

BrixoAI has **no built-in AI** in its first version. That keeps it free and within Anthropic's rules ([INTEGRATIONS.md](./INTEGRATIONS.md)).

**New (2026-10-31): integrations.** BrixoAI can also connect to services you use, such as GitHub, to show helpful context. For example: which branch you're on and what changed recently. To do this safely, BrixoAI has two parts:
- the **desktop app**, which you look at;
- a small **backend**, which holds the keys to your connected services. The desktop app never sees those keys.

For now the backend runs only on your own computer.

## 2. An analogy: the garage

| Garage | BrixoAI |
|---|---|
| The **inspection bay** where the car is examined and photographed before work starts | BrixoAI captures the error and takes a backup snapshot |
| The **mechanic** you already pay for | Claude Code, on your existing subscription, which you run yourself |
| The **work order** you hand the mechanic | The handoff brief (redacted, previewed, copied by you) |
| The **after-photos** compared with the before-photos | BrixoAI's change review (the diff) |
| "Put that part back the way it was" | Undo |
| The **test drive** | Re-running the check |

## 3. Words you'll see

| Term | Meaning |
|---|---|
| **Project folder** | The folder containing your app's code |
| **`package.json`** | A file in JavaScript projects listing the project's scripts (like `build` and `dev`) and its libraries |
| **Script** | A named command in `package.json`, such as `npm run build` |
| **Snapshot / backup** | Copies of your project files taken before a fix, so they can be restored |
| **Diff** | A view showing exactly which lines were added or removed |
| **Undo / restore** | Putting files back exactly as they were in the snapshot |
| **Redaction** | Hiding secrets (passwords, API keys) before anything is shown, saved or copied |
| **Secret file** | A file such as `.env` that holds passwords or keys. BrixoAI never shows or copies its contents |
| **Electron** | A free toolkit for building desktop apps with web technologies |
| **React / Vite / TypeScript** | Free tools for building the app's screens and catching coding mistakes early |
| **Local-first** | Everything happens and is stored on your computer, not on the internet |
| **WSL2** | A Linux system inside Windows. BrixoAI **doesn't** require it |
| **API key** | A paid credential for programs to use an AI service directly. BrixoAI's first version doesn't use one |
| **Claude Code** | Anthropic's coding assistant, which you already subscribe to |
| **Prompt injection** | Hidden text in files that tries to trick an AI into doing something harmful |
| **Pull request (PR)** | A proposed change on GitHub, waiting for review before it's merged |
| **Backend** | A program that runs behind the scenes. BrixoAI's backend stores connection keys and talks to GitHub and other services for the desktop app |
| **Integration / provider** | A service BrixoAI can connect to, such as GitHub or Vercel |
| **Marketplace** | The list of integrations inside BrixoAI, with what each can access and whether it's ready |
| **GitHub App** | GitHub's official way for a tool to access only the repositories you pick, with only the permissions it needs |
| **OAuth / authorization** | The "Allow BrixoAI to access…" screen a service shows you. You approve there, not inside BrixoAI |
| **Access token** | A temporary key a service gives BrixoAI after you approve. BrixoAI keeps it on the backend, encrypted |
| **Encryption at rest** | Stored data is scrambled with a secret key, so the file is useless without that key |
| **Read-only** | BrixoAI can look but not change anything |

## 4. What it costs

| Item | Cost |
|---|---|
| BrixoAI itself | **$0.** Free, open-source tools, no servers |
| AI help | **$0 extra.** You use your existing Claude Code subscription directly in Claude Code. Its normal usage limits apply |
| Accounts or sign-up for BrixoAI | **None needed** |
| Cloud storage, hosting, domains | **None** |
| GitHub | **$0** within free limits for a private repository. Check that no paid overage is enabled ([TECH_STACK.md §4](./TECH_STACK.md#4-zero-extra-cost-conflicts)) |
| BrixoAI backend | **$0.** It runs on your computer. Nothing is hosted, and no domain or database service is used |
| Registering a GitHub App (optional, for live GitHub testing) | **$0.** Don't add a payment method |
| Other providers (later) | Usually $0 for read-only developer access, but **each is checked before it's built** ([TECH_STACK.md §4](./TECH_STACK.md#4-zero-extra-cost-conflicts)). Stripe is test mode only |

Things that *would* cost money, such as built-in AI via an API key, code-signing certificates or paid security reviews, are excluded or replaced with free alternatives.

## 5. Safety rules to remember
- BrixoAI works only inside the folder you choose.
- It never shows or copies the contents of `.env` or other secret files.
- It asks before running any script. Scripts are project code and run with your permissions.
- It takes a backup before a fix session, and you can always undo **file changes inside the project folder**.
- It **can't** see or undo commands your AI tool runs, or changes outside the project folder. Read Claude Code's own permission prompts carefully.
- A passing check means that check passed, not that the whole app is bug-free.
- **Integrations:**
  - each one starts **read-only**;
  - anything that would change data needs your explicit approval every time;
  - connection keys stay on the backend, encrypted;
  - **Disconnect** deletes them. For GitHub, also uninstall the app in GitHub's settings to remove access completely.
- **Never** paste passwords, API keys or tokens into the desktop app. Integrations use the service's own approval screen.

## 6. Who does what

| Task | You | Claude Code (helping build BrixoAI) |
|---|---|---|
| Decide scope, approve plans and changes | ✅ | Explains options, recommends, flags costs |
| Talk to potential users (validation interviews) | ✅ | Prepares interview questions |
| Write BrixoAI's code and tests (after approval) | Review | ✅ in small milestones |
| Run tests and report results | Read the results | ✅ reports **actual** output only |
| Approve installs, merges, publishing | ✅ always | Asks first |
| Keep the repository private (DEC-12) | ✅ | Never changes visibility |

## 7. Setup checklist (for developing BrixoAI)

**Now (no cost)**
- [ ] Read [DECISIONS.md](./DECISIONS.md) and [PRODUCT.md](./PRODUCT.md).
- [ ] Make sure you have a Windows 10/11 computer for testing.
- [ ] Install **Node.js LTS** from nodejs.org and **Git** (both free). Check with `node --version` and `git --version`.
- [ ] Keep using **Claude Code** with your existing subscription.
- [ ] In GitHub settings, check that Actions can't create charges (no payment method for overage, or a $0 spending limit).

**Validation (S0)**
- [ ] Interview 10–15 vibe coders about the last time their project broke.
- [ ] Collect or create about 20 small, deliberately broken sample projects for testing.

**Before any code is written**
- [ ] Approve milestone M1 separately ([ROADMAP.md](./ROADMAP.md)).
- [ ] Decide when to add the Apache-2.0 LICENSE file (P-4).

**Never needed for the MVP:** an Anthropic API key, a cloud account, a domain, Docker, or any paid service.

## 8. Running the marketplace on your computer (added 2026-10-31)

You need **Node.js 22 LTS or newer** and **Git**. Then, in the project folder:

1. `npm install`: downloads the free tools (one time).
2. `npm run setup:env`: creates two private settings files with new random secrets: `.env` for the backend and `.env.desktop` for the app. They are never committed to Git.
3. `npm run dev:server`: starts the backend. Leave this window open.
4. In a second window, run `npm run dev:desktop` to open the BrixoAI desktop app.

You'll see nine integrations:
- **GitHub** says **Not configured**. That's expected until a GitHub App is registered ([GitHub App setup](../integrations/GITHUB_APP_SETUP.md)).
- The others say **Coming soon**.

If the app says **Backend not reachable**, step 3 isn't running.

To check everything still works after a change: `npm run check` (types, lint, tests and build).
