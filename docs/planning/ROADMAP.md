# BrixoAI — Implementation Roadmap (Planning v2)

**Status:** Proposed. **No milestone has started.** This roadmap refines [../ROADMAP.md](../ROADMAP.md). The main difference is that it begins with a working end-to-end vertical slice (helper → Claude Code → web) instead of UI-first, because the Stitch screens are still pending. Labels are explained in [PRODUCT.md](./PRODUCT.md).

**Rules for every milestone**
- Small, testable steps. Each milestone ends in a demo of **real** behaviour.
- Lint, typecheck and tests run in CI and pass before moving on. Report actual commands and results.
- Every user-visible state is handled: loading, empty, error, offline, permission denied, cancelled.
- No fake data presented as live. Unbuilt features are hidden or clearly labelled "coming later".
- Security items from [SECURITY.md](./SECURITY.md) are delivered in the milestone that introduces the risk.
- No production deploy, merge or paid service without your explicit approval.

**Proposed repository layout** (created in M0 after approval):

```text
apps/
  web/        Next.js app (UI + server routes)
  helper/     BrixoAI Helper CLI (Node.js + TypeScript)
packages/
  shared/     Zod schemas, task-state machine, event types, redaction
supabase/
  migrations/ SQL migrations (reviewed)
  tests/      RLS tests
docs/         Existing + planning docs
```

## Overview

| Milestone | Name | Phase | Depends on |
|---|---|---|---|
| **M0** | Foundations and decisions | MVP | Your approval of the decisions in [README.md](./README.md#decisions-that-need-your-approval) |
| **M1** | Helper spike: Claude Code in the terminal | MVP | M0 |
| **M2** | Web skeleton, Supabase, pairing | MVP | M0 (parallel with M1 possible) |
| **M3** | **Vertical slice**: web → helper → result | MVP | M1, M2 |
| **M4** | AI teammates, conversations, usage | MVP | M3 |
| **M5** | Git and GitHub | Next | M4 |
| **M6** | Skills | Next | M4 |
| **M7** | Memory | Next | M4 |
| **M8** | Sites (Netlify publishing) | Next | M5 |
| **M9** | MCP tools | Next | M6 |
| **Later** | Schedules, cloud workers, browser use, voice, Figma/Stitch, GSC, multi-agent, desktop app | Long-term | M3–M9 |

---

## M0 — Foundations and decisions

- **Objective:** a clean, empty-but-working monorepo with CI, and your decisions recorded.
- **Features:** npm workspaces; TypeScript config; ESLint; Vitest; `packages/shared` with the task-state machine and its tests; LICENSE file; `.env.example` with placeholders; a GitHub Actions workflow (install, lint, typecheck, test); update the README "Development" section with real commands.
- **Dependencies:** decisions on licence, package manager, sign-in method, auth Mode A, local-first approach.
- **Likely files:** `package.json`, `tsconfig.base.json`, `.github/workflows/ci.yml`, `packages/shared/src/taskState.ts`, `LICENSE`, `.env.example`, `.gitignore`.
- **Tests:** state machine unit tests (every allowed and disallowed transition).
- **Acceptance criteria:** `npm install`, `npm run lint`, `npm run typecheck` and `npm test` all pass locally and in CI on a pull request.
- **Risks:** over-engineering the setup. Keep it minimal.
- **Exit gate:** CI green; decisions recorded in `docs/planning/README.md`.

## M1 — Helper spike: Claude Code in the terminal

- **Objective:** prove the riskiest technical piece — running Claude Code safely through the Agent SDK on a chosen folder, with approvals and cancel — **before any web UI exists**.
- **Features:**
  - `brixo-helper run --folder <path> "<prompt>"` (terminal-only).
  - Folder allowlist (`brixo-helper folders add/list/remove`) with symlink-safe checks.
  - API key setup into the OS keychain (`brixo-helper auth set-key`, hidden input).
  - Agent SDK `query()` with `cwd`, `settingSources: []`, `permissionMode: 'default'`, deny rules for secret paths, sandbox settings, and limits.
  - `canUseTool` → terminal yes/no prompt (later replaced by web approvals).
  - Ctrl+C → `interrupt()` → clean stop.
  - Map runtime messages → `packages/shared` event types → pretty terminal output.
  - Redaction function with a test corpus.
- **Dependencies:** M0; your own Anthropic API key with a spend limit (you enter it locally — never in chat).
- **Likely files:** `apps/helper/src/cli.ts`, `runner/claudeRunner.ts`, `config/allowlist.ts`, `secrets/keychain.ts`, `packages/shared/src/events.ts`, `packages/shared/src/redact.ts`.
- **Tests:** unit — allowlist (symlinks, `..`, home/root refusal), redaction corpus, message→event mapping with **recorded fixtures**; integration — a fake runner implementing the same interface (no API cost); manual — one real run on a sample project, documented with actual output.
- **Acceptance criteria:** a real task on a sample repo edits a file; a non-allowlisted command triggers a prompt; denying blocks it; Ctrl+C stops within 10 s; a planted fake secret in output is redacted; the API key is not printed anywhere.
- **Risks:** SDK option names differ from the docs (U3) → read the SDK reference at implementation time; keychain library problems on Linux; Windows behaviour (U8).
- **Exit gate:** the demo above, plus a written note resolving U3 and a decision on U8.

## M2 — Web skeleton, Supabase and pairing

- **Objective:** a signed-in user can pair a helper and see it online.
- **Features:**
  - Next.js app with a **provisional** shadcn UI (sign-in, Projects, Devices pages).
  - Supabase project (dev) + local Supabase via CLI.
  - Migrations: `profiles`, `workspaces`, `devices`, `device_pairings`, `projects`, `project_bindings`, `audit_log` + RLS + grants.
  - Pairing flow (helper `pair` command + web approve page) and device revoke.
  - Helper heartbeat; "online/offline" badge.
  - Project create; helper `link` command binds a local allowlisted folder to a project.
  - **Spike U1** (device-scoped Supabase token) and decide.
  - Deploy the dev web app to Netlify only after your approval; measure credit usage (U6).
- **Dependencies:** M0; Supabase and Netlify accounts (yours).
- **Likely files:** `apps/web/src/app/(auth)/…`, `apps/web/src/app/devices/…`, `apps/web/src/app/api/helper/pairings/…`, `supabase/migrations/0001_init.sql`, `supabase/tests/rls_isolation.sql` (or a TypeScript test), `apps/helper/src/pairing.ts`.
- **Tests:** RLS two-user isolation tests for every table; pairing unit tests (expiry, single use, rate limit); Playwright: sign in → approve pairing (helper simulated) → device shows online; revoke → helper rejected.
- **Acceptance criteria:** pairing works end to end on a real machine; revoke works immediately; user B cannot see user A's anything; the service-role key is not in the client bundle (checked by a build-output grep in CI).
- **Risks:** U1 complexity; the Supabase free project pausing during development (just un-pause it); auth redirect configuration mistakes.
- **Exit gate:** the demo plus all tests green; U1 decided and documented.

## M3 — Vertical slice: web → helper → result ⭐

- **Objective:** **the core promise works.** The user opens a project, submits a coding task, the helper runs Claude Code, progress streams live, approvals and cancel work in the browser, and the result returns.
- **Features:**
  - Migrations: `tasks`, `task_events`, `approval_requests` + database functions `claim_task`, `set_task_status`, `request_cancel`, `decide_approval`, `expire_stale`.
  - Web: project page with task composer, live event timeline, approval cards, cancel button, result panel (summary, changed files, checks run), task history list, minimal dashboard (projects, recent tasks, device status).
  - Helper: subscribe to its tasks, claim, run (from M1), batch and throttle events, relay approvals both ways, cancel via the database flag, report orphaned runs on restart.
  - Offline and expiry handling; time, turn and budget limits.
  - Onboarding risk notice.
- **Dependencies:** M1, M2.
- **Likely files:** `apps/helper/src/taskLoop.ts`, `apps/helper/src/approvalRelay.ts`, `apps/web/src/app/projects/[id]/…`, `apps/web/src/components/task/*`, `supabase/migrations/0002_tasks.sql`.
- **Tests:** state-transition tests in the database (illegal transitions rejected); Playwright end-to-end with the helper in **fake-runner mode** (deterministic events, approval, cancel, offline, expiry) — runs in CI at no API cost; planted-secret end-to-end test (secret never reaches the DB); a manual real-run checklist with actual results recorded in the PR.
- **Acceptance criteria:** MVP acceptance criteria 2–8 in [PRODUCT.md](./PRODUCT.md#10-mvp-acceptance-criteria) demonstrated.
- **Risks:** Realtime message limits (batch events); race conditions between cancel and approval (handled in database functions); helper reconnect gaps (re-read on reconnect).
- **Exit gate:** demo on a real machine + all tests green + the "before real users" checklist in [SECURITY.md](./SECURITY.md#must-be-implemented-before-testing-with-real-users) reviewed (the remaining items are listed with owners).

## M4 — AI teammates, conversations and usage

- **Objective:** turn one-off tasks into named teammates you can talk to repeatedly, with visible cost.
- **Features:** `agents` + `agent_versions` (create, edit, duplicate, pause, delete); preset agents (e.g. "Code Helper", "Bug Fixer", "Docs Writer") as starting templates; conversations and follow-up messages resuming the Claude session on the same device; model and effort selection from what the runtime supports; `usage_records` and an "estimated cost" display per task and per month; local diff viewer (from the helper, capped and redacted); **apply the Stitch design** if the screens have arrived.
- **Dependencies:** M3; U2 answer if Mode B is wanted.
- **Likely files:** `apps/web/src/app/agents/…`, `apps/web/src/app/conversations/…`, `supabase/migrations/0003_agents_conversations_usage.sql`, `apps/helper/src/runner/session.ts`.
- **Tests:** agent version immutability (editing creates a new version; running tasks keep theirs); conversation resume (fake runner + one manual real check); usage mapping from recorded result fixtures; UI states.
- **Acceptance criteria:** MVP acceptance criteria 1 and 9 met; the cost is labelled "estimate".
- **Risks:** session resume edge cases across helper restarts; model list API (U3).
- **Exit gate:** **MVP complete.** Run the security gate checklist fully before inviting any testers.

## M5 — Git and GitHub

- **Objective:** go from "changed files" to "pull request opened", safely.
- **Features:** branch-per-task (helper creates `brixo/<task-short-id>`); commit with approval; push using the user's local git credentials with approval; GitHub App connect, repo linking, opening a PR via the server with approval; PR link and status shown; a code-review preset agent; image/screenshot attachments (Supabase Storage).
- **Dependencies:** M4; a registered GitHub App (yours).
- **Likely files:** `apps/helper/src/git/*.ts`, `apps/web/src/server/integrations/github.ts`, `apps/web/src/app/api/github/*`, `supabase/migrations/0004_integrations.sql`.
- **Tests:** git operations against temporary repos; GitHub API calls mocked in unit tests; one manual real PR on a test repo; audit-log entries asserted; token encryption round-trip tests.
- **Acceptance criteria:** no push or PR without approval; PR URL comes from the real API response; disconnect revokes.
- **Risks:** git credential diversity on user machines; GitHub App token handling.
- **Exit gate:** demo + tests + security review of token storage.

## M6 — Skills

- **Objective:** reusable instructions for agents.
- **Features:** built-in skills library (documentation writer, tech-stack advisor, SEO/GEO/AEO on-page check, code review); user-created skills (name, description, instructions); versions; enable/disable; agents pin skill versions; helper writes the pinned skills as `SKILL.md` files into a BrixoAI-managed temp directory and passes them to the SDK (mechanism to verify: plugin directory or `additionalDirectories`); import from a GitHub URL as text with a mandatory review screen.
- **Dependencies:** M4.
- **Tests:** skill version pinning; import never executes content; size limits; a skill-loading integration test with the fake runner.
- **Acceptance criteria:** an agent with a skill demonstrably uses it in a real run; editing a skill doesn't change running tasks.
- **Risks:** malicious imported skills (review + no auto-enable); context bloat.
- **Exit gate:** demo + tests.

## M7 — Memory

- **Objective:** agents remember useful project facts and your preferences, transparently.
- **Features:** a memories page (view, edit, pin, delete); "remember this" on task results; optional automatic project summary after a task, **proposed for your approval** rather than saved silently; relevant memories injected via an appended system prompt (with a size cap); Postgres full-text search for retrieval first.
- **Dependencies:** M4.
- **Tests:** memory scoping (project vs global); deletion really removes it from future prompts; prompt-size cap.
- **Acceptance criteria:** the user can see exactly what an agent was told from memory for any task.
- **Risks:** stale or wrong memories; secrets saved into memory (run redaction on save).
- **Exit gate:** demo + tests.

## M8 — Sites (Netlify publishing)

- **Objective:** publish a project to the user's own Netlify account.
- **Features:** Netlify connect (OAuth or user token, encrypted); Sites list; link a project to a site or create one; build locally with approval; digest deploy as a **preview by default**; production deploy with typed confirmation; deploy status, logs summary and preview/live URLs from real API responses.
- **Dependencies:** M5 (integration framework); verification of Netlify API details.
- **Tests:** mocked Netlify API unit tests; one manual real preview deploy on a test site; idempotency (deploy ID recorded before reporting success).
- **Acceptance criteria:** no production deploy without explicit confirmation; URLs are real.
- **Risks:** the user's Netlify credits running out (warn first); build differences between local and Netlify.
- **Exit gate:** demo + tests + security review.

## M9 — MCP tools

- **Objective:** agents can use approved external tools.
- **Features:** per-agent MCP server configuration (remote HTTP first; local stdio with an install-style approval); per-tool approval with optional pre-approval of specific tools; a curated short list of suggested servers; OAuth for remote servers where needed.
- **Dependencies:** M6; MCP spec verification (2026-07-28 revision).
- **Tests:** tool calls route through approvals; a server's tools are never auto-approved with wildcard rules; a repository `.mcp.json` is never auto-loaded.
- **Acceptance criteria:** an MCP tool call is visible, approved and audited.
- **Risks:** malicious servers, prompt injection via tool output.
- **Exit gate:** demo + tests + security review.

## Later (long-term vision)

Each item gets its own plan before work starts:
- **Scheduled tasks and workflows** (hourly/daily), with limits, monitoring and pause controls; run on the helper when online.
- **Cloud workers** for background execution with the laptop closed (compare Claude Managed Agents, E2B, Modal, Fly.io Machines, Cloudflare Containers — pricing and isolation **Need verification**).
- **Browser automation** (sandboxed browser, site allowlists) — its own security review.
- **Voice input**; document input.
- **Figma** (via MCP), **Stitch** (if an API appears — U7), **Google Search Console**.
- **Multi-agent coordination**.
- **Desktop app** packaging (Tauri or Electron) with signed builds.
- **Teams / shared workspaces**; integration directory; more hosting providers; custom domains.
- **Time-saved estimates** with a published formula.

## What must be true before moving forward (summary)

| From | To | Gate |
|---|---|---|
| M0 | M1/M2 | CI green; decisions recorded |
| M1 | M3 | Safe local run with approvals, cancel and redaction demonstrated; U3/U8 resolved |
| M2 | M3 | Pairing + revoke + RLS isolation tests green; U1 resolved |
| M3 | M4 | Vertical slice demo; e2e tests green |
| M4 | Testers | **Full security gate** in [SECURITY.md](./SECURITY.md#must-be-implemented-before-testing-with-real-users) |
| M4 | M5–M9 | MVP accepted by you |
