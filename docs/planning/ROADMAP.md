# BrixoAI — Implementation Roadmap (Planning v3)

**Status:** Proposed, last updated 2026-10-29. **No milestone has started.** Starting M1 needs separate approval (owner decision P-7). Milestones are listed in order, without dates. Labels are defined in [DECISIONS.md](./DECISIONS.md). Requirement IDs refer to [SECURITY.md](./SECURITY.md) and unknowns (U1–U13) to [ARCHITECTURE.md §9](./ARCHITECTURE.md#9-open-technical-questions).

**Rules for every milestone [Recommendation]:**
- small and testable;
- $0 extra cost (DEC-05);
- no real user project touched before the prototype gate;
- report only real test results;
- no merge or publishing without explicit approval.

---

## S0: Decisions and validation preparation (no code)
- **Objective:** confirm the problem is worth solving before building much.
- **Includes:** 10–15 interviews; define the test collection of about 20 broken sample projects; prepare a Windows 10/11 test machine; check the GitHub Actions spending setting ([TECH_STACK.md §4](./TECH_STACK.md#4-zero-extra-cost-conflicts)); optionally ask Anthropic about U1 (P-1).
- **Done when:** interview findings are summarised in the planning docs, and the owner records a go / narrow / change decision in [DECISIONS.md](./DECISIONS.md).
- **Risk:** weak demand signal. That's a valid outcome, not a failure.

## M1: Foundations, Project Gate and Project Inspector
- **Objective:** the core safety layer, testable without any UI.
- **Includes:** repository scaffold (npm, TypeScript, ESLint, Vitest), after approving dependency installs; LICENSE/NOTICE decision (P-4); Project Gate (PB-1, PB-2, PB-4, PB-5); secret filter and redaction (SE-1, SE-2, SE-4); Project Inspector; review of the Rakazo path and redaction candidates ([REUSE.md](./REUSE.md)).
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
- **Objective:** a usable, plain, functional Windows app (no design work, DEC-10).
- **Includes:** the window and main-process wiring through internal messaging only (WN-2); Electron hardening (WN-3); no network (NP-1, NP-3); local store with 30-day retention and delete (LD-1 to LD-3); no auto-update (WN-6); native Windows (WN-1).
- **Tests:** end-to-end flow on Windows; a no-outbound-connection test; an app test approach that fits the free CI quota (U13).
- **Done when:** the whole workflow in [PRODUCT.md §3](./PRODUCT.md#3-the-mvp-workflow-no-built-in-ai) works on the test collection, and the **prototype gate** in [SECURITY.md §4](./SECURITY.md#4-release-gates) is met with every P requirement implemented **and tested**.
- **Risks:** Electron packaging; unsigned-build warnings.

## M5: Prototype with 5–10 testers
- **Objective:** learn whether the MVP solves the real problem.
- **Includes:** testers use BrixoAI with **their own** AI tools on their own broken projects (U11); builds shared privately (U10); metrics from [PRODUCT.md §6](./PRODUCT.md#6-success-measures).
- **Done when:** results are recorded, there were zero safety incidents caused by BrixoAI, and the owner decides to continue, narrow or change direction.
- **Risk:** small sample size. Treat results as signals, not proof.

## M6: Beta hardening at $0
- **Objective:** make the app fit for a carefully scoped public beta without spending money.
- **Includes:** all **B** requirements (PB-3, FC-6, SE-3, LD-4, WN-4, WN-5, VR-4); free signing route or documented unsigned limitation (U9); plain-language limitations and privacy notes.
- **Done when:** the beta gate is met and the remaining risks are documented for users.

## Public beta (carefully scoped)
- **Scope:** Windows x64, JavaScript/TypeScript npm projects only, no built-in AI.
- **Prerequisites:** owner decisions on repository visibility (P-3), licence files (P-4) and distribution and signing.

## Later (not planned work)
macOS/Linux, built-in AI (only via a permitted $0 path or a changed budget), other languages, GitHub integration, accounts, design system. Each needs its own decision ([PRODUCT.md §9](./PRODUCT.md#9-long-term-vision-parked-not-planned-work)).
