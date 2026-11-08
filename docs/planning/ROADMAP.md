# VibeHeal — Implementation Roadmap (Planning v4)

**Status:** Last updated 2026-10-31. Two tracks now run side by side (DEC-16, DEC-26):
- the **core safety-workflow track** (S0, M1–M6) has not started. Starting M1 needs separate approval (P-15).
- the **integration track** (IM1–IM4): IM1 is done and IM2 is built but not yet tested live (see the integration track below).

Milestones are listed in order, without dates. Labels are defined in [DECISIONS.md](./DECISIONS.md). Requirement IDs refer to [SECURITY.md](./SECURITY.md) and unknowns (U1–U17) to [ARCHITECTURE.md §9](./ARCHITECTURE.md#9-open-technical-questions).

**Rules for every milestone [Recommendation]:**
- small and testable;
- $0 extra cost (DEC-05);
- no real user project touched before the prototype gate;
- report only real test results;
- no merge or publishing without explicit approval.

---

## Integration track (added 2026-10-31)

The integration track gives the core workflow repository, deployment, design and project context. It must not get ahead of the core workflow: the recommended next step is IM3 **and** M1 together (P-15).

### IM1: Marketplace foundation (done 2026-10-31)
- **Includes:**
  - provider registry and common adapter interface;
  - connection, permission and approval services;
  - encrypted credential vault and repository interfaces;
  - audit log and backend API (`/v1`);
  - desktop marketplace UI with all nine providers and honest labels;
  - planned adapters for providers that are not built.
- **Tests:** 149 automated tests (Vitest), typecheck, lint and build all passed on 2026-10-31 (Linux). See [SECURITY.md §6](./SECURITY.md#6-control-status).
- **Not done:**
  - Electron window not launched (no display in the build environment);
  - no Windows test run;
  - audit retention (AU-3).

### IM2: GitHub, read-only (built; live test pending)
- **Includes:**
  - GitHub App installation flow with server-side verification (IN-10);
  - in-memory installation tokens;
  - read-only capabilities for repositories, repository details, branches, commits and pull requests;
  - a read-only repository context view in the desktop app.
- **Prerequisite for live testing:** the owner registers a GitHub App (P-11, [setup guide](../integrations/GITHUB_APP_SETUP.md)).
- **Done when:**
  - connect, read and disconnect work against the real GitHub API on Windows;
  - the GitHub facts marked U14 are checked against GitHub's documentation;
  - the results are recorded in the setup guide.

### IM3: Deployment providers (Vercel, Netlify), read-only
- **Includes:**
  - official docs review (auth, scopes, rate limits, terms; U15);
  - adapters for projects/sites, deployments and status.
- **Excluded:** creating, promoting or deleting deployments (DEC-21).
- **Prerequisites:** the owner creates the developer apps or integrations on their own accounts. Mocks only until then.

### IM4: Remaining providers (Supabase, Figma, Stripe, Shopify, Notion, Slack)
- **Includes:** one provider at a time, following [INTEGRATIONS.md §4.2](./INTEGRATIONS.md#42-how-a-provider-is-added-no-marketplace-or-connection-manager-changes).
- **Limits:** Stripe in test mode only (IN-11); Shopify read-only.
- **Done when:** each provider is tested against its real API before it is called complete.

### Before any hosting
P-9 (identity), P-10 (host and cost), P-12 (key management), AU-3 and a documented security review. No deployment without explicit owner approval.

---

## Core safety-workflow track (unchanged from v3)

## S0: Decisions and validation preparation (no code)
- **Objective:** confirm the problem is worth solving before building much.
- **Includes:** 10–15 interviews; define the test collection of about 20 broken sample projects; prepare a Windows 10/11 test machine; check the GitHub Actions spending setting ([TECH_STACK.md §4](./TECH_STACK.md#4-zero-extra-cost-conflicts)); optionally ask Anthropic about U1 (P-1).
- **Done when:** interview findings are summarised in the planning docs, and the owner records a go / narrow / change decision in [DECISIONS.md](./DECISIONS.md).
- **Risk:** weak demand signal. That's a valid outcome, not a failure.

## M1: Foundations, Project Gate and Project Inspector
- **Objective:** the core safety layer, testable without any UI.
- **Includes:** repository scaffold (npm, TypeScript, ESLint, Vitest). **Done 2026-10-31 as part of IM1**: the core modules go into the same repository; LICENSE/NOTICE decision (P-4); Project Gate (PB-1, PB-2, PB-4, PB-5); secret filter and redaction (SE-1, SE-2, SE-4); Project Inspector; review of the Rakazo path and redaction candidates ([REUSE.md](./REUSE.md)).
- **Prerequisites:** S0 decision; P-7 approval.
- **Tests:** path-escape tests on real Windows (`..`, symlinks, junctions, device names, UNC, case); planted-secret tests (VR-2).
- **Done when:** all M1 tests pass on Windows and the boundary rules are documented.
- **Risks:** Windows filesystem edge cases; scope creep.

## M2: Script Runner, error capture and offline explanations
- **Objective:** run one approved script safely and explain common errors.
- **Includes:** CE-1 to CE-7; npm through `node` without a shell (U4); process-tree cleanup (adopt or rewrite the Rakazo Job Object pattern, U5, P-5); the first offline explanation rules; measure coverage against the test collection (U2).
- **Tests:** timeout and cancel kill all child processes on Windows; minimal-environment test; output redaction test; rule tests per error family.
- **Done when:** scripts in the test collection run, cancel and time out correctly, and coverage is measured and reported honestly.
- **Risks:** npm entry-point differences between versions; native-module packaging.

## M3: Snapshot, change review, undo and handoff brief
- **Objective:** the safety net around the user's own AI tool.
- **Includes:** FC-1 to FC-5; SN-1 to SN-4; HB-1 to HB-3; change detection approach (U3); snapshot scope and performance (U8).
- **Tests:** snapshot → simulated external edit → review → undo, with hashes matching (VR-3); locked-file behaviour; brief contains no planted secrets.
- **Done when:** round-trip tests pass on Windows for every test-collection project.
- **Risks:** large projects; editors locking files.

## M4: Minimal Electron app
- **Note (2026-10-31):** a hardened Electron shell and a minimal renderer already exist for the marketplace (IM1). M4 adds the core-workflow screens to them.
- **Objective:** a usable, plain, functional Windows app (no design work, DEC-10).
- **Includes:** the window and main-process wiring through internal messaging only (WN-2); Electron hardening (WN-3); no network (NP-1, NP-3); local store with 30-day retention and delete (LD-1 to LD-3); no auto-update (WN-6); native Windows (WN-1).
- **Tests:** end-to-end flow on Windows; a no-outbound-connection test; an app test approach that fits the free CI quota (U13).
- **Done when:** the whole workflow in [PRODUCT.md §3](./PRODUCT.md#3-the-mvp-workflow-no-built-in-ai) works on the test collection, and the **prototype gate** in [SECURITY.md §4](./SECURITY.md#4-release-gates) is met with every P requirement implemented **and tested**.
- **Risks:** Electron packaging; unsigned-build warnings.

## M5: Prototype with 5–10 testers
- **Objective:** learn whether the MVP solves the real problem.
- **Includes:** testers use VibeHeal with **their own** AI tools on their own broken projects (U11); builds shared privately (U10); metrics from [PRODUCT.md §6](./PRODUCT.md#6-success-measures).
- **Done when:** results are recorded, there were zero safety incidents caused by VibeHeal, and the owner decides to continue, narrow or change direction.
- **Risk:** small sample size. Treat results as signals, not proof.

## M6: Beta hardening at $0
- **Objective:** make the app fit for a carefully scoped public beta without spending money.
- **Includes:** all **B** requirements (PB-3, FC-6, SE-3, LD-4, WN-4, WN-5, VR-4); free signing route or documented unsigned limitation (U9); plain-language limitations and privacy notes.
- **Done when:** the beta gate is met and the remaining risks are documented for users.

## Agent track (added 2026-11-08)
Source: [FEATURES.md](./FEATURES.md), DEC-33 and DEC-34. Every milestone needs separate owner approval. All of them depend on the core safety workflow (M1–M4), because the Agent Relay reuses its script runner, snapshots, diff review and handoff brief.

### A1: Agent connectors
- **Objective:** launch and supervise an AI coding tool the user already has, safely.
- **Includes:**
  - one connector first, for a tool whose terms clearly allow it to be driven (for example local models through Ollama, or Aider);
  - a sandboxed git worktree per run;
  - the referee rules (snapshots, protected paths, diff limits, approval for dependencies, network and deploy commands, secret redaction);
  - the run log.
- **Prerequisites:** a terms check for each vendor. **The Claude Code connector waits for P-1.**
- **Done when:** a run's changes stay inside the worktree until the user approves; undo restores the project exactly; and tests show secrets never appear in prompts or logs.

### A2: Agent Relay
- **Objective:** agents calling agents, with VibeHeal as referee.
- **Includes:**
  - Fixer → Reviewer → Tester, with configurable roles and round limits;
  - the live supervision timeline;
  - the **Heal** button from a captured error.
- **Done when:**
  - on the test collection, a Relay run either ends with green project checks and user approval, or stops safely with everything rolled back;
  - every agent-to-agent message is logged.

### A3: Supervise external agents, and project memory
- **Includes:**
  - a folder watch that auto-snapshots changes made by any agent (Hermes, OpenClaw and others) and flags risky ones;
  - a readable, editable project-memory file used in briefs.

### A4: Deploy watch and recipes
- **Includes:**
  - read-only deploy status from the IM3 adapters, offering a Heal run when a deploy breaks;
  - first-party Relay recipes.
- **Depends on:** A2 and IM3.

### A5: Stage 2, bring-your-own API keys
- **Includes:**
  - user keys in the OS keychain;
  - built-in explanations, a Reviewer role that needs no CLI, and a project chat.
- **Prerequisite:** the P-16 security review.

## Public beta (carefully scoped)
- **Scope:** Windows x64, JavaScript/TypeScript npm projects only, no built-in AI.
- **Prerequisites:** owner decisions on repository visibility (P-3), licence files (P-4) and distribution and signing.

## Later (not planned work)
macOS/Linux, stage 3 paid built-in AI (P-17; see DEC-34 and the agent track), other languages, accounts, design system, third-party marketplace plugins (DEC-17). *(GitHub integration moved into the integration track on 2026-10-31.)* Each needs its own decision ([PRODUCT.md §9](./PRODUCT.md#9-long-term-vision-parked-not-planned-work)).
