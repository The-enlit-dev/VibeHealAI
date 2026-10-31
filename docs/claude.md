# BrixoAI — Claude Code Engineering Rules

**Status:** rewritten 2026-10-30; updated 2026-10-31 for the backend-managed integration marketplace (DEC-16 to DEC-27). `docs/planning/DECISIONS.md` takes precedence over this file. Requirement IDs (PB-, FC-, CE-, SN-, SE-, HB-, NP-, LD-, WN-, VR-, BK-, IN-, CR-, AU-) refer to `docs/planning/SECURITY.md`.

## 1. Mission
Build BrixoAI's MVP, a free, local-first Windows desktop app that helps vibe coders with a broken JavaScript/TypeScript project. It inspects the project, captures and explains errors offline, snapshots files, shows every change, offers undo and re-runs approved checks. It has **no built-in AI**: users run their own Claude Code separately.

Alongside it, BrixoAI has a **first-party integration marketplace**:
- nine providers, read-only first;
- managed by a local BrixoAI backend that keeps credentials server-side;
- it feeds context into that workflow and must never replace it (DEC-16).

Deliver small, working, tested increments in the order set by `docs/planning/ROADMAP.md`. Do not build the long-term vision early.

## 2. Sources of truth
- `docs/planning/DECISIONS.md`: owner decisions (highest precedence).
- `docs/planning/PRODUCT.md`, `ARCHITECTURE.md`, `SECURITY.md`, `DATA_MODEL.md`, `TECH_STACK.md`, `INTEGRATIONS.md`, `ROADMAP.md`, `REUSE.md`: the current plan.
- `docs/integrations/`: provider setup guides.
- Existing application code: actual implementation state.

If documentation and code disagree, inspect the code and explain the discrepancy before major changes. Never describe a proposed design as implemented. Older files (`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DESIGN.md`) are history only.

## 3. First-session procedure
1. Inspect the branch, git status, file tree, package manager, scripts, tests and dependencies.
2. Read `CLAUDE.md` and the planning documents listed there.
3. Summarise what exists, what is missing, risks and the smallest safe next step.
4. Propose a small plan and wait for approval before starting a milestone, installing dependencies or running project code.

Don't replace existing work with a fresh scaffold because it's easier.

## 4. Engineering standards
- TypeScript for application code. npm as the package manager (DEC-14).
- Keep the Electron renderer free of Node.js access. All file and command work happens in the main process behind the Project Gate (WN-3).
- Small modules with clear boundaries:
  - core: Project Gate, Project Inspector, Script Runner, Error Explainer, Snapshot and Undo, Handoff Brief Builder, Local Store;
  - integrations (`server/integrations/`): registry, adapter interface, connection manager, permission manager, action service.
- Keep the layers separate:
  - `shared/` has types and validation only;
  - `server/` is the backend;
  - `desktop/main` is the Electron main process;
  - `desktop/preload` is the bridge;
  - `desktop/renderer` is the UI.
  - ESLint import rules enforce this: the renderer and shared code can never import `server/`.
- Provider-specific code lives only in its adapter (`server/providers/<id>/`) and, optionally, a read-only context view (`desktop/renderer/context-views/`). Never hard-code provider logic in the marketplace, the connection manager or the API.
- Validate every input at the backend boundary (`shared/validation.ts`) and every IPC argument in the main process.
- Avoid unnecessary dependencies, giant files and speculative abstractions. Before proposing a dependency, check its licence is compatible with Apache-2.0, and that it costs nothing.
- Do not invent package scripts, APIs, settings or SDK methods. Verify them in official documentation.
- Windows first: handle path normalisation, device names, junctions, long paths, letter case, line endings and file locks.
- Configuration comes from environment variables, validated at startup (`server/config.ts`):
  - `.env` is the backend's file and `.env.desktop` is the desktop's; both are git-ignored and created by `npm run setup:env`;
  - `.env.example` and `.env.desktop.example` contain placeholders only;
  - the desktop app must never read the backend's `.env`.

## 5. UI standards
- Minimal and functional (DEC-10). No Stitch screens, no new design system, no polish work before validation.
- Include loading, empty, error, permission-required, cancelled and success states where relevant. Keyboard accessible.
- Never show fake activity, invented output or decorative charts. Show what actually happened.
- Marketplace labels must be honest: Available, Coming soon, Not configured, Connected, Error. Never show a planned provider as connectable.

## 6. Product domain
Keep these concepts distinct:
- **Project:** one folder the user selects. BrixoAI works only inside it.
- **Session:** one attempt to diagnose and fix a problem in a project.
- **Captured output:** redacted output of an approved script run or pasted error.
- **Explanation rule:** an offline rule that recognises an error pattern and explains it.
- **Snapshot:** backup of in-scope files taken before a protected fix session.
- **Change review:** comparison of the project against the snapshot, with keep/undo per file.
- **Verification:** re-running the same approved script; reports only what that check showed.
- **Handoff brief:** a redacted summary the user copies into their own AI tool. BrixoAI never sends it anywhere.
- **Provider:** an external service in the marketplace (GitHub, Vercel, and so on). Its adapter implements `ProviderAdapter`.
- **Connection:** an authorized link to one provider account, stored by the backend. Credentials sit in the vault, referenced by id.
- **Capability:** one named, typed provider action with an access level (`read`, `write` or `sensitive`).
- **Approval:** a single-use, expiring user confirmation for one non-read capability call with specific input.

## 7. Safety rules
- Every file read, file write and command goes through the Project Gate (PB-1 to PB-5).
- Never read, display, store or copy secret file contents (SE-1). Redact everything shown, stored or copied (SE-2).
- Run only `package.json` scripts the user explicitly approves, with no shell, a minimal environment, a timeout and whole-process-tree cancellation (CE-1 to CE-7).
- BrixoAI changes project files only on an explicit user action (undo/restore), atomically, and logs it (FC-3 to FC-5).
- Be honest about limits: BrixoAI cannot control or undo what the user's external AI tool does outside the project folder (SN-4).
- The core workflow makes no network connections. There is no telemetry and no update checks (NP-1, WN-6).
- Integration features connect only to the BrixoAI backend and, through it, to providers the user connected.
- **Backend:**
  - loopback only (BK-1);
  - bearer token, Host check and browser rejection (BK-2, BK-3);
  - safe errors (BK-5);
  - redacting logger (BK-9).
- **Credentials:**
  - encrypted at rest with AES-256-GCM (CR-2);
  - wrapped in `Secret` in memory (CR-4);
  - deleted on disconnect, with provider-side revocation attempted (CR-5).
- **Provider calls:**
  - HTTPS to fixed hosts, timeouts, no redirects (BK-8);
  - return whitelisted fields only (IN-7).
- Every capability call is authorized individually and audited (IN-3, AU-1). Non-read capabilities need an approval (IN-4).
- Never run commands on a real user project before the prototype security gate is met (`docs/planning/SECURITY.md` §4).
- Never push, merge, publish or change repository settings without explicit approval.

## 8. Cost and AI rules
- $0 extra cost (DEC-05, DEC-22): no paid services, billable resources, API credits or assumed trials.
- No hosting or deployment of the backend.
- Don't create provider accounts or apps for the owner. Document what's needed (for example `docs/integrations/GITHUB_APP_SETUP.md`) and provide a mock or a **Not configured** state.
- No built-in AI in the MVP (DEC-06). Never add claude.ai login, subscription tokens or credential handling. Anthropic does not permit it for third-party products (`docs/planning/INTEGRATIONS.md` §2).
- BrixoAI must not launch or drive Claude Code for the user unless Anthropic confirms in writing (unknown U1, decision P-1).

## 9. Reuse rules
Follow `docs/planning/REUSE.md`. Copy Rakazo code only after the specific piece has been reviewed and approved by the owner. Keep Apache-2.0 notices, mark modified files and record each adoption. Never use the Rakazo name or branding.

## 10. MVP discipline
Two tracks (ROADMAP.md):
- **Core:** S0 validation → M1 Project Gate and Inspector → M2 Script Runner and explanations → M3 snapshot, review, undo and handoff brief → M4 minimal Electron app → M5 prototype testers → M6 beta hardening.
- **Integrations:** IM1 marketplace foundation (done) → IM2 GitHub read-only (live test pending) → IM3 Vercel/Netlify read-only → IM4 the remaining providers, one at a time.

Keep the core track moving alongside the integration track. Don't add:
- BrixoAI user accounts;
- hosted infrastructure;
- third-party plugins;
- provider write actions;
- other languages;
- agent systems.
Each of these needs its own approved decision.

## 11. Verification and communication
After meaningful changes:
- Run the relevant linting, type checks and tests that exist. Report the actual commands and results.
- Say which checks could not run, and why.
- Summarise files changed, decisions made, remaining limitations and the next step.
- Update the control status in `docs/planning/SECURITY.md` §6 only when a control is implemented **and** tested. Say where it was tested (Linux or Windows; fake or live provider API).

Never claim a test passed or a fix is verified without running it. A passing check proves that check only.
