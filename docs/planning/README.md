# BrixoAI Planning Set (v3)

**Status:** Proposed plan, last updated 2026-10-29. **No application code exists.** This is documentation only, reviewed through the draft pull request [The-enlit-dev/BrixoAI#1](https://github.com/The-enlit-dev/BrixoAI/pull/1).

**Start with [DECISIONS.md](./DECISIONS.md).** It records the owner's decisions and takes precedence over every other document.

## 1. Current direction in brief
- **Who:** vibe coders on Windows with a broken JavaScript/TypeScript project [Decision DEC-01, DEC-02].
- **What:** a free, local-first Windows desktop app that captures and explains errors, takes backups, shows every change, offers undo and re-runs checks [Decision DEC-02, DEC-04].
- **AI:** **no built-in AI in the MVP.** The user runs their own Claude Code separately. There is no officially supported way for BrixoAI to use the owner's subscription inside the app [Verified 2026-10-25], and paid API use is excluded [Decision DEC-05, DEC-06].
- **Cost:** $0 beyond the owner's existing Claude Code subscription [Decision DEC-05].
- **Foundation:** independent app with selectively reviewed Rakazo reuse, Option B [Decision DEC-03].
- **No** accounts, cloud, Next.js, Netlify, Supabase or new design work for the MVP [Decision DEC-07, DEC-10].

## 2. Documents

| Document | What it answers |
|---|---|
| [DECISIONS.md](./DECISIONS.md) | What the owner decided, what changed, what's pending (P-1 to P-8) |
| [PRODUCT.md](./PRODUCT.md) | The problem, the user, the MVP workflow and scope, success measures, validation plan |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Components, data flow, Windows approach, AI status summary, open technical questions (U1–U13) |
| [SECURITY.md](./SECURITY.md) | Security and privacy requirements with IDs and stages, release gates, residual risks |
| [DATA_MODEL.md](./DATA_MODEL.md) | Local data: what is stored, where, for how long, and how to delete it |
| [TECH_STACK.md](./TECH_STACK.md) | Free tools chosen, what was removed, every possible cost conflict |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | AI access (Claude Code handoff, why embedding isn't permitted, options) and future integrations |
| [REUSE.md](./REUSE.md) | Rakazo review: candidates, verdicts, licence and attribution rules (nothing copied yet) |
| [ROADMAP.md](./ROADMAP.md) | S0 and milestones M1–M6, prototype and beta gates |
| [BEGINNER_GUIDE.md](./BEGINNER_GUIDE.md) | Plain-English explanation, costs, safety rules, setup checklist |

**Labels:** [Decision], [Verified], [Recommendation], [Assumption], [Unresolved]. They are defined in [DECISIONS.md](./DECISIONS.md).

## 3. What changed from planning v2
The v2 set (2026-10-25) planned:
- a hosted web app (Next.js on Netlify) with a Supabase database;
- a paired local helper;
- an embedded AI agent using the user's own Anthropic API key;
- broader features (named agents, GitHub, publishing).

v3 replaces that with the narrow, local-only, $0 MVP above. The reasons are recorded in [DECISIONS.md §2](./DECISIONS.md#2-status-of-the-earlier-decisions-round-1-recorded-2026-10-25). `DATA_MODEL.md` and `INTEGRATIONS.md` keep their names but now cover the local data design and AI access.

## 4. Older documents and recommended follow-up changes

The original files outside `docs/planning/` predate these decisions.
- `CLAUDE.md`, `docs/claude.md` and the root `README.md` were **rewritten** on 2026-10-30 to match the current direction (approved by the owner).
- The other older files have a short, dated banner at the top pointing here. Their text below the banner is unchanged and kept for history (DEC-13).

| File | Status | Remaining recommended change (needs separate approval, P-2) |
|---|---|---|
| `CLAUDE.md`, `docs/claude.md` | Rewritten 2026-10-30 | — |
| `README.md` (root) | Rewritten 2026-10-30 | — |
| `docs/DESIGN.md` | Banner: Stitch rejected; screen-state checklist still applies | — |
| `docs/PRD.md` | Banner: superseded by `PRODUCT.md` | Archive later |
| `docs/ARCHITECTURE.md` | Banner: superseded by `ARCHITECTURE.md` | Archive later |
| `docs/ROADMAP.md` | Banner: superseded by `ROADMAP.md` | Archive later |
| `docs/SECURITY.md` | Banner: principles apply, requirements in `SECURITY.md` | Merge principles into `docs/planning/SECURITY.md` later |
| `.github/PULL_REQUEST_TEMPLATE.md` | Banner, as a hidden comment, so it doesn't appear in rendered PR descriptions | Replace the "Stitch references" checkbox with "Keeps the UI minimal and functional" |

**No files are renamed or archived.** Any archiving (for example moving old documents into `docs/archive/`) will be proposed separately.

## 5. Next step
The owner reviews this draft PR. Implementation (milestone M1) needs separate approval (P-7). Nothing is merged or published without explicit approval.
