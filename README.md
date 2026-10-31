# BrixoAI

BrixoAI is a planned free, local-first **Windows desktop app** for vibe coders whose AI-built JavaScript/TypeScript project has stopped working. It helps them:
- understand the error;
- capture failing output safely;
- back up files before trying a fix;
- review every change;
- undo changes and re-run checks to see whether the fix really worked.

The first version contains **no built-in AI**. Users run their own AI tool, such as Claude Code, separately, and BrixoAI is the careful, honest safety net around that work.

**Status:** planning stage. This repository currently contains documentation only; **no application code exists yet**. Plans are proposals until implemented and tested.

## Start here
1. [docs/planning/DECISIONS.md](./docs/planning/DECISIONS.md): the owner's decisions. Takes precedence over every other document.
2. [docs/planning/README.md](./docs/planning/README.md): index of the planning documents.
3. [docs/planning/BEGINNER_GUIDE.md](./docs/planning/BEGINNER_GUIDE.md): plain-English overview, costs and setup checklist.
4. [CLAUDE.md](./CLAUDE.md): instructions for Claude Code sessions working on this repository.

## Documentation
- [Product](./docs/planning/PRODUCT.md): problem, target user, MVP workflow, scope, success measures, validation plan.
- [Architecture](./docs/planning/ARCHITECTURE.md): components, data flow, Windows approach, open questions.
- [Security and privacy](./docs/planning/SECURITY.md): requirements with IDs and release stages (proposed, not yet implemented).
- [Local data](./docs/planning/DATA_MODEL.md): what is stored on the user's computer and for how long.
- [Tech stack and costs](./docs/planning/TECH_STACK.md): free tools and every possible cost conflict.
- [AI access and integrations](./docs/planning/INTEGRATIONS.md): why the MVP has no built-in AI; future integrations.
- [Reuse register](./docs/planning/REUSE.md): reviewed Rakazo candidates and attribution rules.
- [Roadmap](./docs/planning/ROADMAP.md): milestones and gates.
- [Engineering rules](./docs/claude.md): detailed rules for building BrixoAI.

Older documents (`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DESIGN.md`) describe an earlier direction and are kept for history. `docs/SECURITY.md` keeps the baseline security principles.

## Working principles
- Local-first: everything stays on the user's computer. No accounts or cloud services in the MVP.
- $0 extra cost: free and open-source tools only.
- Security enforced in code: project-folder boundaries, blocked secret files, approval before running scripts or changing files, backups and undo.
- Honest results: report what actually happened. Never fabricate success.
- Small, testable steps, with explicit approval before installing dependencies, merging or publishing.

## Development
Not started. The planned stack is Electron, React, Vite and TypeScript with npm, on native Windows (see [TECH_STACK.md](./docs/planning/TECH_STACK.md)). Install and run commands will be documented here once implementation begins and they have been verified.

## Licence
Apache-2.0 is the intended licence. The LICENSE file has not been added yet, and will be added with the owner's approval.
