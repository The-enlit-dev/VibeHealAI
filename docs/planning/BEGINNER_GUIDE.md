# BrixoAI — Beginner's Guide (Planning v3)

**Who this is for:** you, the project owner, and anyone new to building software. It explains what BrixoAI will be, how its parts fit together, what it costs, and what to set up.

**Status:** this guide describes the **plan** as of 2026-10-29. **BrixoAI doesn't exist yet as software.** Labels are defined in [DECISIONS.md](./DECISIONS.md).

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

## 4. What it costs

| Item | Cost |
|---|---|
| BrixoAI itself | **$0.** Free, open-source tools, no servers |
| AI help | **$0 extra.** You use your existing Claude Code subscription directly in Claude Code. Its normal usage limits apply |
| Accounts or sign-up for BrixoAI | **None needed** |
| Cloud storage, hosting, domains | **None** |
| GitHub | **$0** within free limits for a private repository. Check that no paid overage is enabled ([TECH_STACK.md §4](./TECH_STACK.md#4-zero-extra-cost-conflicts)) |

Things that *would* cost money, such as built-in AI via an API key, code-signing certificates or paid security reviews, are excluded or replaced with free alternatives.

## 5. Safety rules to remember
- BrixoAI works only inside the folder you choose.
- It never shows or copies the contents of `.env` or other secret files.
- It asks before running any script. Scripts are project code and run with your permissions.
- It takes a backup before a fix session, and you can always undo **file changes inside the project folder**.
- It **can't** see or undo commands your AI tool runs, or changes outside the project folder. Read Claude Code's own permission prompts carefully.
- A passing check means that check passed, not that the whole app is bug-free.

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
