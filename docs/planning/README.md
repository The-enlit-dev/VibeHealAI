# VibeHeal Planning Set (v4)

**Status:** last updated 2026-10-31.
- v4 adds the **backend-managed integration marketplace**. Its first implementation (IM1 marketplace foundation, IM2 GitHub read-only) is on the implementation branch `claude/nice-brown-7edqmx`.
- The v3 planning set is reviewed in the draft pull request [The-enlit-dev/VibeHealAI#1](https://github.com/The-enlit-dev/VibeHealAI/pull/1). That PR is left untouched (DEC-25).

**Start with [DECISIONS.md](./DECISIONS.md).** It records the owner's decisions and takes precedence over every other document. Its [§4](./DECISIONS.md#4-round-3-backend-managed-integration-marketplace-recorded-2026-10-31) explains what changed in v4 and why.

## 1. Current direction in brief
- **Who:** vibe coders, especially beginners, with a broken JavaScript/TypeScript project [DEC-01, DEC-16].
- **What (core, still the centre):**
  - a desktop app that captures and explains errors, takes backups, shows every change, offers undo and re-runs checks [DEC-02, DEC-04];
  - **not built yet** (milestones M1–M4).
- **What (new, 2026-10-31):** an extensible **integration marketplace** of first-party integrations [DEC-17, DEC-19]:
  - providers: GitHub, Vercel, Netlify, Supabase, Figma, Stripe, Shopify, Notion and Slack;
  - read-only first [DEC-21];
  - managed by a VibeHeal **backend** that holds credentials, encrypted [DEC-18, DEC-20].
- **AI:** staged [DEC-34]: (1) VibeHeal drives AI tools the user already has, (2) optional user-provided API keys, (3) a paid built-in tier later. No AI billing for us in stages 1 and 2.
- **Positioning (2026-11-08):** "the supervisor for your AI coders", with the **Agent Relay** (agents calling agents, refereed by VibeHeal) as the headline feature [DEC-33, [FEATURES.md](./FEATURES.md)].
- **Cost:** $0. The backend runs locally only: no hosting, paid APIs, databases or domains [DEC-05, DEC-22].
- **Not in scope:** VibeHeal user accounts (DEC-07, DEC-23), third-party plugins (DEC-17), provider write actions (DEC-21), deployment of the backend (DEC-22).

## 2. Documents

| Document | What it answers |
|---|---|
| [DECISIONS.md](./DECISIONS.md) | What the owner decided, what changed, what's pending (P-1 to P-17) |
| [FEATURES.md](./FEATURES.md) | Feature roadmap (2026-11-08): positioning against Hermes, OpenClaw, Grok Bot and Dot; the Agent Relay; prioritised features; the agent track A1–A5 |
| [PRODUCT.md](./PRODUCT.md) | The problem, the user, the MVP workflow and scope, success measures, validation plan |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Desktop app, backend API, integration platform, provider adapters, credentials; core components; open questions (U1–U17) |
| [SECURITY.md](./SECURITY.md) | Security and privacy requirements with IDs and stages, release gates, residual risks |
| [DATA_MODEL.md](./DATA_MODEL.md) | Desktop local data (core workflow) and backend integration data (connections, encrypted credentials, audit log) |
| [TECH_STACK.md](./TECH_STACK.md) | Free tools chosen, what was removed, every possible cost conflict |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | AI access (Claude Code handoff, why embedding isn't permitted, options) and the **integration marketplace** (provider plan, how to add a provider) |
| [../integrations/GITHUB_APP_SETUP.md](../integrations/GITHUB_APP_SETUP.md) | Owner steps to register a read-only GitHub App for live testing (P-11) |
| [REUSE.md](./REUSE.md) | Rakazo review: candidates, verdicts, licence and attribution rules (nothing copied yet) |
| [ROADMAP.md](./ROADMAP.md) | Integration track IM1–IM4 and core track S0, M1–M6; gates |
| [BEGINNER_GUIDE.md](./BEGINNER_GUIDE.md) | Plain-English explanation, costs, safety rules, setup checklist |

**Labels:** [Decision], [Verified], [Recommendation], [Assumption], [Unresolved]. They are defined in [DECISIONS.md](./DECISIONS.md).

## 3a. What changed in v4 (2026-10-31)
See [DECISIONS.md §4](./DECISIONS.md#4-round-3-backend-managed-integration-marketplace-recorded-2026-10-31). In short:
- a backend and an integration marketplace were added;
- the "no network / no ports / no credentials" rules now apply to the core workflow only;
- new security requirement families: BK, IN, CR and AU.

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
| `CLAUDE.md`, `docs/claude.md` | Rewritten 2026-10-30; updated 2026-10-31 for the marketplace (DEC-25) | — |
| `README.md` (root) | Rewritten 2026-10-30; updated 2026-10-31 with local setup | — |
| `docs/DESIGN.md` | Banner: Stitch rejected; screen-state checklist still applies | — |
| `docs/PRD.md` | Banner: superseded by `PRODUCT.md` | Archive later |
| `docs/ARCHITECTURE.md` | Banner: superseded by `ARCHITECTURE.md` | Archive later |
| `docs/ROADMAP.md` | Banner: superseded by `ROADMAP.md` | Archive later |
| `docs/SECURITY.md` | Banner: principles apply, requirements in `SECURITY.md` | Merge principles into `docs/planning/SECURITY.md` later |
| `.github/PULL_REQUEST_TEMPLATE.md` | Updated 2026-10-31: the Stitch checkbox is replaced with "Keeps the UI minimal and functional" | Optional: its "Related requirement" hint still mentions "the PRD section" |

**No files are renamed or archived.** Any archiving (for example moving old documents into `docs/archive/`) will be proposed separately.

## 5. Next step
Recommended next steps (each needs owner approval):
1. Review the implementation pull request for IM1/IM2.
2. Optionally register a GitHub App to test GitHub live (P-11).
3. Start **M1** (Project Gate, P-15) and **IM3** (Vercel and Netlify, read-only) together, so the core workflow keeps pace with integrations.

Nothing is merged, published or deployed without explicit approval.
