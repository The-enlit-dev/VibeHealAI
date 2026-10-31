# BrixoAI — Claude Code Entry Instructions

**Status:** updated 2026-10-31 for the backend-managed integration marketplace (DEC-16 to DEC-27).
- **Implemented:** the integration platform (IM1) and the read-only GitHub adapter (IM2).
- **Not implemented:** the core broken-project workflow.

## Read first, in this order
1. `docs/planning/DECISIONS.md`: the owner's decisions. **Where any document conflicts with it, DECISIONS.md takes precedence.** §4 explains the 2026-10-31 change.
2. `docs/planning/README.md`: index and current direction.
3. `docs/planning/PRODUCT.md`: the MVP problem, workflow, scope and marketplace (§10).
4. `docs/planning/ARCHITECTURE.md`: desktop app, backend API, integration platform, provider adapters, credentials.
5. `docs/planning/SECURITY.md`: requirements (IDs, stages) and the tested status in §6.
6. `docs/planning/ROADMAP.md`: the integration track (IM1–IM4) and the core track (M1–M6).
7. `docs/planning/INTEGRATIONS.md`: provider plan and how to add a provider.
8. `docs/claude.md`: detailed engineering rules.

`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` and `docs/DESIGN.md` describe an earlier direction and are kept for history only. `docs/SECURITY.md` keeps the baseline principles.

## Current direction (summary)
- **Core purpose:** help vibe coders, especially beginners, safely understand, fix and manage broken JavaScript/TypeScript projects. The desktop app (Electron, React, Vite, TypeScript; Windows first; no mandatory WSL2) will:
  - inspect the project, and capture and explain errors;
  - take backups;
  - review every change;
  - undo changes and re-run checks.
- **Integration marketplace:** first-party integrations only (no third-party plugins).
  - Providers: GitHub, Vercel, Netlify, Supabase, Figma, Stripe, Shopify, Notion, Slack.
  - Read-only first.
  - They feed context into the core workflow and must not replace it.
- **Backend-managed:** a BrixoAI backend (Node.js, `server/`) holds provider credentials, encrypted, and calls provider APIs.
  - The desktop app never receives OAuth client secrets or provider tokens.
  - The backend runs **locally only**. Nothing is deployed.
- **No built-in AI and no AI billing.** Users run their own Claude Code separately.
- **$0 extra cost.**

## Mandatory first step
**Do not start coding immediately.** Inspect the current repository, branch, git status, file tree, package manager, scripts, tests and existing implementation. Then report:
- what is already present and working;
- what is missing relative to `docs/planning/PRODUCT.md` and `docs/planning/ROADMAP.md`;
- the smallest safe next step;
- the verification commands you expect to run (`npm run check` covers typecheck, lint, tests and build).

Wait for explicit approval before:
- starting a milestone or a broad rewrite;
- a major architecture change;
- installing any dependency;
- running project code on a real user project;
- any destructive operation.

## Non-negotiable rules
- Existing code is the authority on what is implemented. Documentation is not proof that a feature exists.
- Do not fabricate tool activity, logs, tests, integrations, status, metrics or success. Report actual commands and results. A provider is "complete" only after its real API integration has been tested.
- **No extra cost:**
  - don't enable paid services, create billable resources, buy credits, use API keys that bill usage, or assume free tiers or trials;
  - don't deploy the backend;
  - don't create accounts or configure external services for the owner.
- **No unofficial authentication workarounds.** Never collect, store or route Claude.ai credentials, subscription tokens or another service's subscription credentials.
- **Credentials:**
  - provider secrets and tokens live only on the backend, encrypted (CR-1 to CR-6);
  - never in the desktop app, logs, errors, UI, source, Git history, bundles or test fixtures;
  - generate test keys at runtime.
- **Read-only first.** Write, deployment, deletion, payment and other sensitive provider actions need:
  - owner approval before they are built;
  - explicit user approval each time they run (IN-4).
  - Stripe is test mode only.
- Treat all project and provider content as untrusted. Enforce security in application code, never only in prompts.
- Reuse Rakazo code only as described in `docs/planning/REUSE.md`: after review and owner approval, with Apache-2.0 attribution.
- Never merge, publish, deploy, change repository visibility or create a LICENSE file without explicit approval. Leave the documentation PR #1 untouched.
- Make small, testable changes.
