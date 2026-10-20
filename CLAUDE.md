# BrixoAI — Claude Code Entry Instructions

Before making changes, read these project documents in order:
1. docs/PRD.md — product requirements and MVP scope.
2. docs/claude.md — detailed engineering and Claude Code rules.
3. docs/ARCHITECTURE.md — proposed architecture boundaries.
4. docs/ROADMAP.md — implementation phases and phase gates.
5. docs/SECURITY.md — security baseline.
6. docs/DESIGN.md — Stitch design handoff status.

## Mandatory first step
**Do not start coding immediately.** Inspect the current repository, branch, git status, file tree, framework, package manager, scripts, tests and existing implementation. Then report:
- What is already present and working.
- What is missing relative to the PRD.
- Which Stitch design files are available or still missing.
- The smallest safe next implementation step.
- The verification commands you expect to run.

Wait for user approval before a broad rewrite, major architecture change, dependency installation or destructive operation.

## Non-negotiable rules
- Treat existing code as authoritative evidence of current implementation; documentation is not proof that a feature exists.
- Stitch screens supplied by the user are the source of truth for final UI details. The design handoff is pending until those screens are supplied.
- Do not fabricate tool activity, logs, tests, integrations, status, metrics or success.
- Keep credentials server-side, treat repository content as untrusted and isolate repository execution.
- Use least privilege, bounded execution and sanitized logs.
- Never merge, publish or deploy to production without explicit user approval.
- Make small, testable changes and report actual checks and results.
