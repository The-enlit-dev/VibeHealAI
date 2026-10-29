# BrixoAI

> **Update (2026-10-29): the direction has changed.** BrixoAI is now planned as a free, local-first Windows desktop app that helps vibe coders fix broken JavaScript/TypeScript projects safely, with no built-in AI. Start with [`docs/planning/README.md`](./docs/planning/README.md) and [`docs/planning/DECISIONS.md`](./docs/planning/DECISIONS.md), which take precedence. The Stitch design mentioned below has been rejected. The rest of this file describes the earlier direction and is kept for history.

BrixoAI is an AI-powered website-operations and developer workspace. It combines conversational development with configurable agents that inspect projects, run bounded checks, and prepare changes for human review.

**Status:** planning/documentation stage. This repository contains product and implementation guidance; do not assume the application is implemented.

## Start here
1. Read [CLAUDE.md](./CLAUDE.md) before asking Claude Code to make changes.
2. Read the [Product Requirements Document](./docs/PRD.md).
3. Review [Architecture](./docs/ARCHITECTURE.md) and [Roadmap](./docs/ROADMAP.md).
4. Check [Design status](./docs/DESIGN.md). Stitch screens are still being prepared and are the source of truth for final UI implementation.

## Documentation
- [Claude Code instructions](./CLAUDE.md) — repository entry point.
- [Product requirements](./docs/PRD.md) — vision, scope, workflows, safety and acceptance criteria.
- [Architecture](./docs/ARCHITECTURE.md) — proposed system boundaries and data-flow principles.
- [Roadmap](./docs/ROADMAP.md) — staged delivery plan and phase gates.
- [Design](./docs/DESIGN.md) — Stitch design handoff; intentionally pending until finished screens are supplied.
- [Security](./docs/SECURITY.md) — baseline security and trust requirements.
- [Detailed Claude instructions](./docs/claude.md) — engineering workflow and project-specific rules.

## Working principles
- Inspect the existing repository before choosing frameworks or replacing files.
- Ship small, verifiable increments rather than fake or unfinished features.
- Treat repository content and external input as untrusted.
- Use least-privilege integrations and isolated, resource-limited execution.
- Require explicit user approval before merging, publishing, or deploying to production.
- Report real tool and test outcomes; never fabricate success.

## Development
No stack, install command, or run command is declared yet because the application scaffold has not been inspected or selected. When implementation begins, document the actual stack and verified commands here.
