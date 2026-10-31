# BrixoAI — Technical Stack and Cost Plan (Planning v3)

**Status:** Provisional, last updated 2026-10-29. Nothing has been installed. Labels are defined in [DECISIONS.md](./DECISIONS.md).

**Ground rule [Decision DEC-05]:** $0 in extra spending beyond the owner's existing Claude Code subscription. No API charges, paid hosting, databases, services, domains or subscriptions. Free and open-source tools and local storage only. No paid service is enabled and no free trial is assumed.

---

## 1. MVP stack

| Part | Choice | Purpose (plain English) | Expected licence | Cost |
|---|---|---|---|---|
| Desktop shell | **Electron** [Decision DEC-04] | Turns a web-style UI into a Windows app and includes its own Node.js runtime | MIT [Assumption: verify at install] | $0 |
| UI | **React + Vite + TypeScript** [Decision DEC-04] | React builds the screens, Vite bundles them, TypeScript catches mistakes early | MIT / MIT / Apache-2.0 [Assumption: verify] | $0 |
| Styling | Tailwind CSS + shadcn/ui [Recommendation] | Quick, minimal, functional styling with no design work (DEC-10) | MIT [Assumption: verify] | $0 |
| Main-process logic | **Node.js built-ins** (fs, path, child_process, crypto) [Recommendation] | File checks, running scripts, hashing snapshots | Part of Node/Electron | $0 |
| Windows process control | `koffi` **only if** the Rakazo Job Object code is adopted after review ([REUSE.md](./REUSE.md)) | Lets JavaScript call Windows system functions for process-tree cleanup | MIT [Verified 2026-10-25 via npm package page and koffi.dev] | $0 |
| Package manager | **npm** [Decision DEC-14] | Installs development libraries | Bundled with Node | $0 |
| Unit tests | Vitest [Recommendation] | Tests small pieces of logic, such as path checks and redaction | MIT [Assumption: verify] | $0 |
| App tests | Playwright (Electron support) [Recommendation] | Clicks through the real app like a user (U13) | Apache-2.0 [Assumption: verify] | $0 |
| Code checks | ESLint + TypeScript compiler [Recommendation] | Catch errors before running | MIT / Apache-2.0 [Assumption: verify] | $0 |
| Storage | **Local JSON files** in the app data folder [Recommendation] | Settings, session summaries, snapshot manifests ([DATA_MODEL.md](./DATA_MODEL.md)) | — | $0 |
| Source control | Git + GitHub, **private** repository [Decision DEC-12] | Version history and review | — | $0 within free limits (§4) |
| Distribution (prototype) | Built installer shared via GitHub Releases on the private repo, or directly with testers [Recommendation] | Getting builds to testers | — | $0 (U10) |

**Licence check rule [Recommendation]:** before any dependency is installed (which needs separate approval), confirm its licence is compatible with Apache-2.0 and record it. Prefer few dependencies.

## 2. Removed from the MVP

| Previously proposed | Why removed | Revisit when |
|---|---|---|
| Next.js | No server-rendered pages needed in a desktop app | Only if a web product is ever planned |
| Netlify | Nothing to host; would add cost risk | Same |
| Supabase | No accounts, sync or cloud data (DEC-07, DEC-09) | Validation shows accounts are needed |
| Separate local helper + pairing | One desktop app is simpler and opens no ports | — |
| Claude Agent SDK + Anthropic API key | Requires API billing ([INTEGRATIONS.md](./INTEGRATIONS.md#2-why-brixoai-cannot-embed-ai-on-your-subscription)) | A permitted $0 path exists, or the budget changes |
| Sentry or other monitoring services | Sends data off the device (NP-1); possible cost | — |
| Domains, websites | Not needed for the MVP | — |

## 3. Costs at a glance

| Item | Cost |
|---|---|
| BrixoAI infrastructure | **$0**. There is none: the app runs entirely on the user's computer |
| AI usage | **$0 extra**. The user's own Claude Code subscription, used directly in Claude Code |
| Development tools | **$0**. Open-source |
| CI on a private repository | **$0** within GitHub's free quota (§4) |
| Code signing | **$0 only via a free programme** (§4); otherwise unsigned builds |

## 4. Zero-extra-cost conflicts

Every place where the plan could cost money, and how it's handled:

| Item | Conflict | Handling |
|---|---|---|
| Built-in AI (Agent SDK) | **Yes.** Needs paid API usage | Removed. Claude Code handoff instead (DEC-06) |
| GitHub Actions on a **private** repo | **Possible.** [Verified 2026-10-25, GitHub billing docs] GitHub Free includes 2,000 minutes a month for private repos, and Windows runners count **2×**. Public repos get standard runners free, but the repo stays private (DEC-12) | Keep CI small: Linux for most tests, Windows only for the Windows-specific suites. **The owner should check there's no payment method enabling overage, or that the Actions spending limit is $0.** GitHub states usage is blocked when the quota runs out and no valid payment method is on file |
| Windows code signing | **Yes.** Commercial certificates cost money | Prototype: unsigned builds (Windows SmartScreen will warn). Beta: SignPath Foundation's free signing for open-source projects reportedly needs an OSI licence, a **public** repo and free downloads (U9) [Assumption: verify eligibility]. That conflicts with DEC-12 for now |
| External security review | **Yes.** Usually paid | Free tools + documented self-review (SECURITY.md VR-4). The weaker assurance is stated openly |
| Automatic updates | Depend on signing and hosting | No auto-updates in the MVP (WN-6). Manual updates |
| Distribution | Private repo releases are visible only to people with access | Give testers repository access or share builds directly (U10) |
| Testing on others' projects with the owner's subscription | Unclear whether it counts as "ordinary, individual usage" | Testers use their own AI tools (U11) |
| Domains, hosting, databases, monitoring | Would cost money | Not used |

## 5. Requirements for developing BrixoAI (owner's machine)
- Windows 10/11 (the target platform), Node.js LTS, Git, and an editor. All free.
- Claude Code (existing subscription) to help write the code. That's ordinary use and adds no API cost.
- No Docker, cloud accounts or paid tools needed.
