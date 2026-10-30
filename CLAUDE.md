# BrixoAI — Claude Code Entry Instructions

**Status:** planning stage. The repository contains documentation only; no application code exists yet. Rewritten 2026-10-30 to match the current direction.

## Read first, in this order
1. `docs/planning/DECISIONS.md`: the owner's decisions. **Where any document conflicts with it, DECISIONS.md takes precedence.**
2. `docs/planning/README.md`: index and current direction.
3. `docs/planning/PRODUCT.md`: the MVP problem, workflow and scope.
4. `docs/planning/ARCHITECTURE.md`: components, data flow, open technical questions.
5. `docs/planning/SECURITY.md`: security and privacy requirements (IDs and stages).
6. `docs/planning/ROADMAP.md`: milestones and gates.
7. `docs/claude.md`: detailed engineering rules.

`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` and `docs/DESIGN.md` describe an earlier direction and are kept for history only. `docs/SECURITY.md` keeps the baseline principles.

## Current direction (summary)
- **MVP:** a free, local-first **Windows desktop app** (Electron, React, Vite, TypeScript; no mandatory WSL2). It helps vibe coders with a broken JavaScript/TypeScript project to:
  - inspect the project and capture and explain errors;
  - take backups;
  - review every change;
  - undo changes and re-run checks.
- **No built-in AI.** Users run their own Claude Code separately; BrixoAI is the safety net around it.
- **$0 extra cost** beyond the owner's existing Claude Code subscription.
- **No accounts, cloud services or new design work** for the MVP. Keep the UI minimal and functional. The Stitch design is rejected.

## Mandatory first step
**Do not start coding immediately.** Inspect the current repository, branch, git status, file tree, package manager, scripts, tests and existing implementation. Then report:
- what is already present and working;
- what is missing relative to `docs/planning/PRODUCT.md` and `docs/planning/ROADMAP.md`;
- the smallest safe next step;
- the verification commands you expect to run.

Wait for explicit approval before:
- starting a milestone or a broad rewrite;
- a major architecture change;
- installing any dependency;
- running project code;
- any destructive operation.

## Non-negotiable rules
- Existing code is the authority on what is implemented. Documentation is not proof that a feature exists.
- Do not fabricate tool activity, logs, tests, integrations, status, metrics or success. Report actual commands and results.
- **No extra cost:** don't enable paid services, create billable resources, buy credits, use API keys that bill usage, or assume free trials.
- **No unofficial authentication workarounds.** Never collect, store or route Claude.ai credentials, subscription tokens or claude.ai login inside BrixoAI. Anthropic does not permit this for third-party products (see `docs/planning/INTEGRATIONS.md`).
- **Local-first:** BrixoAI makes no network connections in the MVP. Any future network feature needs informed user consent.
- Treat all project content (files, scripts, logs) as untrusted. Enforce security in application code, never only in prompts.
- Never place credentials in the UI process, source control, screenshots or logs. Redact secrets.
- Don't run untrusted project scripts or touch real projects without the safety controls in `docs/planning/SECURITY.md` and explicit approval.
- Reuse Rakazo code only as described in `docs/planning/REUSE.md`: after review and owner approval, with Apache-2.0 attribution.
- Never merge, publish, deploy, change repository visibility or create a LICENSE file without explicit approval.
- Make small, testable changes.
