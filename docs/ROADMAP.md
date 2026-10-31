# BrixoAI — Implementation Roadmap

> **Update (2026-10-29): superseded.** These phases (UI-first, waiting on Stitch screens) are not the current plan. The current milestones are in `docs/planning/ROADMAP.md`, and `docs/planning/DECISIONS.md` takes precedence over this file. This file is kept for history only.

**Status:** proposed phases. Adjust after repository inspection and receipt of the finished Stitch screens. No phase below implies that the feature already exists.

## Phase 0 — Reconnaissance and design handoff
- [ ] Inspect branch, git status, file tree, framework, package manager and scripts.
- [ ] Identify existing application code, tests and dependencies.
- [ ] Receive and review the finished Stitch screens and assets.
- [ ] Update docs/DESIGN.md with evidence from those screens.
- [ ] Agree on a first implementation slice and verify the current stack.

**Exit gate:** documented repository audit, approved design references and a small scoped plan.

## Phase 1 — UI foundation
- [ ] Build the application shell and navigation from approved Stitch references.
- [ ] Establish typography, colors, spacing, borders and reusable components.
- [ ] Implement responsive layouts and accessible keyboard behavior.
- [ ] Add real loading, empty, error, disconnected and unavailable states.
- [ ] Avoid controls that appear functional but do nothing.

**Exit gate:** core shell and reusable UI verified against supplied designs; relevant checks pass.

## Phase 2 — Core workspace experience
- [ ] Dashboard and recent activity.
- [ ] Projects list and project detail views.
- [ ] Chat workspace and conversation history UI.
- [ ] Agent list and create/edit configuration flows.
- [ ] Integrations and task/run history screens.
- [ ] Review and approval UI states.

**Exit gate:** coherent user flows with clear boundaries between implemented behavior and temporary preview state.

## Phase 3 — GitHub read-only MVP
- [ ] Secure GitHub authorization using an appropriate least-privilege mechanism.
- [ ] List repositories and let users select a project.
- [ ] Show connection status, permissions and repository metadata.
- [ ] Inspect supported project metadata and scripts without executing untrusted code on the application host.
- [ ] Handle revoked access, missing permissions and unsupported projects.

**Exit gate:** a user can connect, select and inspect a repository; permissions and failures are handled.

## Phase 4 — Tasks and verification
- [ ] Persist task runs and configuration snapshots.
- [ ] Track lifecycle transitions, timestamps, events and sanitized logs.
- [ ] Execute supported checks in an isolated, resource-limited worker.
- [ ] Display actual findings and check results.
- [ ] Support safe cancellation, bounded retries and failure recovery.

**Exit gate:** a user can launch a task, observe progress, inspect real results and understand failure.

## Phase 5 — Proposed code changes
- [ ] Generate a change proposal for a bounded supported task.
- [ ] Show changed files and a readable diff.
- [ ] Run relevant checks in isolation.
- [ ] Require explicit approval before branch/PR side effects according to the reviewed policy.
- [ ] Persist and display real pull-request references and outcomes.

**Exit gate:** code changes are reviewable, tested where possible and never silently merged.

## Phase 6 — Optional deployment visibility
- [ ] Add optional Netlify authorization.
- [ ] Associate a site with a project where supported.
- [ ] Display actual deployment state and preview links.
- [ ] Require explicit approval for production-impacting actions.

**Exit gate:** deployment data is real, clearly attributed and does not imply automatic production actions.

## Later, not MVP
Consider multi-user organizations, billing, broad framework coverage, Vercel, advanced event triggers and multi-agent coordination only after the core workflow is reliable and safe.

## Definition of done for every phase
- Acceptance criteria are met.
- Relevant lint/type/test/build checks actually run where available.
- Error, empty, permission and cancellation states are handled as applicable.
- Security and authorization boundaries are respected.
- No fake data is presented as live results.
- Limitations and unrun checks are documented.
