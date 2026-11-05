# VibeHeal — Product Definition (Planning v3)

**Status:** MVP definition, last updated 2026-10-31. The core workflow below is **not implemented yet**. The integration marketplace (§10) has a first implementation (IM1, IM2). Labels such as **[Decision]**, **[Verified]**, **[Recommendation]**, **[Assumption]** and **[Unresolved]** are defined in [DECISIONS.md](./DECISIONS.md).

---

## 1. One-paragraph summary

VibeHeal is a free, local-first Windows desktop app for **vibe coders** whose AI-built JavaScript/TypeScript project has stopped working [Decision DEC-01, DEC-02]. It helps them:
- see what is broken and explain the error in plain English,
- capture the failing output safely,
- prepare a safe summary to give to their own AI tool,
- review every file change before keeping it,
- undo changes, and check whether the fix actually worked.

**In the MVP, VibeHeal contains no built-in AI** [Decision DEC-06]. The user runs Claude Code (or another AI tool they already have) separately, and VibeHeal is the careful, honest safety net around that work. That is because no officially supported way exists for VibeHeal to use the owner's Claude subscription at no extra cost [Verified 2026-10-25, see [INTEGRATIONS.md](./INTEGRATIONS.md#2-why-vibeheal-cannot-embed-ai-on-your-subscription)], and paid API access is excluded by the $0 budget [Decision DEC-05].

**Added 2026-10-31 [Decision DEC-16 to DEC-19]:** VibeHeal also has an **integration marketplace** of first-party integrations, such as GitHub and Vercel. A small VibeHeal backend manages them and keeps credentials away from the desktop app. They exist to feed useful context into the workflow below. They are not a separate product. See §10.

> **Term: vibe coder.** Someone who builds software mostly by instructing AI tools, often without fully understanding the code those tools write.

## 2. The problem

| | Description |
|---|---|
| **Target user** [Decision] | A beginner or intermediate vibe coder on **Windows** with a JavaScript/TypeScript web project (for example Next.js, React or Vite), usually built with AI tools such as Cursor, Lovable, Bolt, v0 or Claude. |
| **Frustrating situation** [Assumption, to validate] | The project used to work. Now `npm run dev` or `npm run build` fails, or the page crashes. They don't understand the error, can't tell which file is really at fault, and fear that letting an AI "fix" it will break something else. Many don't use git, so they have no easy way back. |
| **Trigger** [Assumption] | A failing command or red error screen after a change, a dependency update, copying the project to another computer, or a new environment variable. |
| **Current workarounds** [Assumption] | Paste the error into a chat AI with no project context. Let an agentic tool make changes they can't follow. Ask on Discord or Reddit. Restore an old copy. Start over. |
| **Why these may fall short** [Assumption, to validate] | General tools don't put **understand → capture safely → review every change → undo → verify** first, in beginner language. **Biggest risk:** existing tools such as Claude Code (which has its own checkpoints) may already be good enough for this audience. Validation must test this directly. |

## 3. The MVP workflow (no built-in AI)

[Recommendation] Each step says who does it.

| # | Step | Who |
|---|---|---|
| 1 | Open VibeHeal and choose **one** project folder. VibeHeal refuses to work outside it ([SECURITY.md](./SECURITY.md) PB-1 to PB-5). | User + VibeHeal |
| 2 | VibeHeal inspects the project locally, without running it: `package.json` scripts, Node/npm version requirements, lockfile, whether `node_modules` exists, and environment-variable **names** that are expected but missing (from `.env.example`). Secret file *contents* are never read. | VibeHeal |
| 3 | Capture the error: paste it, **or** approve running one listed `package.json` script (for example `build`). The script runs with VibeHeal's safety controls (CE-1 to CE-7) and the output is captured and redacted. | User approves, VibeHeal runs |
| 4 | VibeHeal matches the error against **built-in offline explanations** (§5) and shows a plain-English explanation, likely files and suggested checks. If nothing matches, it says so honestly. | VibeHeal |
| 5 | **Start a protected fix session.** VibeHeal snapshots the project files that could change (FC-1). | User + VibeHeal |
| 6 | **Optional AI help.** VibeHeal prepares a *handoff brief*: the redacted error, project facts, relevant file paths and safety instructions such as "propose minimal changes, explain each one, don't touch .env". The user previews it and copies it themselves. VibeHeal sends nothing anywhere (HB-1 to HB-3, NP-1). | VibeHeal prepares, user copies |
| 7 | The user works with **their own** Claude Code (or other tool), outside VibeHeal. VibeHeal cannot control that tool's actions (SN-4). | User |
| 8 | **Review changes.** VibeHeal shows every file that changed since the snapshot: a plain summary plus a line-by-line diff. Risky changes are flagged, such as deleted files, `package.json`/lockfile edits, new scripts, or changes to config or secret files. | VibeHeal |
| 9 | The user **keeps** or **undoes** changes, per file or all at once. | User |
| 10 | **Verify.** With approval, VibeHeal re-runs the same script and reports pass or fail honestly. "Pass" means only that this check passed. | User approves, VibeHeal runs |
| 11 | VibeHeal stores a short, redacted session summary locally, kept 30 days and deletable at any time (DEC-09). | VibeHeal |

## 4. MVP scope

| In the MVP [Decision DEC-02 + Recommendation] | Not in the MVP |
|---|---|
| Windows 10/11 x64 desktop app, no WSL2 needed | macOS, Linux, Windows on ARM |
| One project folder per session | Workspaces, multiple projects at once |
| JavaScript/TypeScript projects with `package.json` and npm | Other languages, pnpm/yarn/bun |
| Paste an error, or run one approved `package.json` script | Arbitrary shell commands, long-running dev-server supervision |
| Offline rule-based error explanations | Built-in AI or any model calls (DEC-06) |
| Handoff brief for the user's own AI tool (copy only) | VibeHeal launching or driving Claude Code (blocked, unknown U1) |
| Snapshot → review changes → keep or undo → verify | Automatic fixes, autonomous agents, multi-agent systems |
| `npm install` only as a separate, clearly warned, approved action | Automatic dependency changes |
| Local settings, session summaries, backups, 30-day retention, delete all | Cloud storage, sync, accounts, sign-in (DEC-07) |
| Minimal functional UI (DEC-10) | New design system, Stitch, polish |
| Read-only provider context through the integration marketplace (§10), added 2026-10-31 | Provider write actions (deploys, pushes, payments), skills, MCP, memory, schedules, business-owner features, voice, browser automation, third-party plugins |

## 5. Built-in error explanations (offline)

[Recommendation] A small, versioned set of rules that recognise common error patterns and explain them in plain English. Initial candidates, to be confirmed against the validation test collection:

| Error family | Example signal | Typical explanation |
|---|---|---|
| Missing package | `Cannot find module 'x'`, `Module not found: Can't resolve` | The package isn't installed, or the import path is wrong |
| Wrong filename case | Import works on another machine, fails here | Windows and macOS treat letter case differently from Linux hosts |
| Port in use | `EADDRINUSE` | Another program is already using that port |
| Missing environment variable | `undefined` config value; `.env.example` lists a name `.env` lacks | A required setting is missing. VibeHeal shows the **name only** |
| Node version mismatch | `engines` field vs installed Node; `ERR_REQUIRE_ESM`; unsupported syntax | The installed Node.js version doesn't match the project |
| TypeScript error | `TS2307`, `TS2322`, … | The code's types don't match. Shows file and line |
| Damaged install | Lockfile and `node_modules` out of sync | Dependencies need a clean reinstall (an approved action) |

**Unknown U2:** how much real-world coverage these rules achieve. They will be measured, not promised.

## 6. Success measures

[Recommendation] Initial targets for the first 5–10 testers:

| Measure | Target | How measured |
|---|---|---|
| Time to first useful result (error captured and explained) | ≤ 15 minutes from install for 70% of testers | Local session timestamps (shared by testers voluntarily) |
| "I understood what was wrong" | ≥ 4 out of 5 in 70% of sessions | Short in-app rating, stored locally, shared voluntarily |
| Rule-based explanation coverage | Measured against the test collection; target set after the first measurement | Test collection results |
| Fix confirmed by re-running the check | Reported honestly; no target until data exists | Verification results |
| Unapproved file changes made **by VibeHeal** | **0** | Automated tests + local audit log |
| Reads outside the chosen folder; secret contents shown or stored | **0** | Automated tests (SECURITY.md VR-1 to VR-3) |
| Undo restores files exactly | 100% in tests | Automated tests |
| Would use it again for the next breakage | ≥ 40% of testers within two weeks | Follow-up interview |
| Extra cost to the owner | **$0** | DEC-05 |

## 7. Validation plan ($0)

[Recommendation] Validate demand before building much.

1. **Interviews (10–15):** in vibe-coder communities, ask "Tell me about the last time your project broke. What did you try? What did it cost you?" No pitching. Free.
2. **Concierge tests (about 5):** walk testers through the exact workflow by hand on their broken project, with their consent. **They use their own AI tools.** The owner's subscription is not used to diagnose other people's projects (unknown U11).
3. **Test collection (about 20 projects):** deliberately broken sample projects covering the error families in §5. Used to measure rule coverage and to test snapshot, review and undo. Stays on the owner's machine.
4. **Prototype test (5–10 users):** only after the prototype security gate in [SECURITY.md §4](./SECURITY.md#4-release-gates) passes.

Decision point after validation: continue, narrow further, or change direction. Results are recorded in [DECISIONS.md](./DECISIONS.md).

## 8. Assumptions and unresolved questions

- [Assumption] The pain is frequent and serious enough for vibe coders to install a separate tool.
- [Assumption] A safety net around the user's own AI tool is valuable even though VibeHeal contains no AI.
- [Assumption] Most target users are on Windows and use npm.
- [Unresolved] U1 (may VibeHeal launch or drive Claude Code for the user?), U2 (rule coverage) and U11 (testing with others' projects). See [ARCHITECTURE.md §9](./ARCHITECTURE.md#9-open-technical-questions).

## 9. Long-term vision (parked, not planned work)

The original ambition remains a direction, not a commitment. It may be revisited only after the MVP is validated, and each item needs its own decision and cost check:
- AI teammates,
- embedded AI (if a permitted, affordable path exists),
- GitHub workflows,
- website publishing,
- skills and MCP tools,
- memory, schedules, cloud execution,
- business-owner automation.

## 10. Integration marketplace (added 2026-10-31)

[Decision DEC-16 to DEC-21]

| Aspect | Decision |
|---|---|
| Purpose | Give the broken-project workflow relevant context. Examples: which branch and commits a project is on (GitHub); whether the last deployment failed (Vercel, Netlify); the intended design (Figma); a spec (Notion) |
| Providers | GitHub, Vercel, Netlify, Supabase, Figma, Stripe, Shopify, Notion, Slack. All nine appear in the catalog with honest labels |
| Who maintains them | VibeHeal only (first-party). No third-party plugins, submissions, downloads or monetisation in the MVP |
| Access | Read-only first. Any write or sensitive action needs separate approval to build, and explicit approval each time it runs |
| Where credentials live | On the VibeHeal backend, encrypted. Never in the desktop app |
| Hosting | None for now. The backend runs locally for development (DEC-22) |

**What a user sees today (2026-10-31):**
- the catalog, search and filters;
- details for each provider, including what it would access, in plain English;
- GitHub as **Not configured** until the backend owner registers a GitHub App;
- the other eight providers as **Coming soon**.

**Success measures (to add once live):**
- time to connect GitHub;
- the share of sessions where provider context helped the user understand the problem;
- **0** provider tokens visible anywhere in the desktop app (CR-1).
