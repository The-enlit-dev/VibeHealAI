# BrixoAI Planning Set (v2)

**Status:** Proposed, awaiting your approval. Written October 2026. **No application code exists yet.** The repository contains documentation only.

This folder contains the detailed MVP plan for BrixoAI as a **local-first AI-agent workspace**. It was produced after inspecting the repository and checking official documentation where this environment could reach it.

## Documents

| # | Document | What it answers |
|---|---|---|
| 1 | [PRODUCT.md](./PRODUCT.md) | What we are building, for whom, and what is in or out of the MVP. Includes the A–G feature classification |
| 2 | [ARCHITECTURE.md](./ARCHITECTURE.md) | How the parts fit together, how tasks, approvals and cancellation flow, local vs cloud, Claude authentication modes |
| 3 | [TECH_STACK.md](./TECH_STACK.md) | Which technologies, why, free-tier limits and when you'd pay |
| 4 | [INTEGRATIONS.md](./INTEGRATIONS.md) | Claude Code, GitHub, Supabase, Netlify, MCP and future integrations |
| 5 | [SECURITY.md](./SECURITY.md) | Permissions, secrets, pairing, untrusted content, and the gate before real users |
| 6 | [DATA_MODEL.md](./DATA_MODEL.md) | Tables, what stays on your device, API routes, task states |
| 7 | [ROADMAP.md](./ROADMAP.md) | Milestones M0–M9 + Later, each with tests and exit gates |
| 8 | [BEGINNER_GUIDE.md](./BEGINNER_GUIDE.md) | Plain-English explanations, glossary and setup checklist |

**Labels used throughout:** **Verified** (checked against official docs during planning), **Needs verification**, **Proposed**, **Unknown**. Details in [PRODUCT.md](./PRODUCT.md).

## Relationship to the existing documents

The earlier documents in `docs/` ([PRD](../PRD.md), [ARCHITECTURE](../ARCHITECTURE.md), [ROADMAP](../ROADMAP.md), [SECURITY](../SECURITY.md), [DESIGN](../DESIGN.md), [claude.md](../claude.md)) were **not modified**. Their safety principles (no fabricated results, least privilege, approval before merge or deploy, untrusted repository content, secrets server-side) are carried forward unchanged. This planning set **differs** from them in these places:

| # | Topic | Existing docs | This planning set | Status |
|---|---|---|---|---|
| 1 | Where code runs | A cloud "isolated worker" runs repository checks | The **BrixoAI Helper on the user's computer** runs Claude Code. Cloud workers come later | Needs your approval |
| 2 | First milestone | UI foundation first, waiting on Stitch screens | **Helper vertical slice first**, with a provisional UI that gets restyled when the Stitch screens arrive | Needs your approval |
| 3 | Audience | Developers doing website operations | Vibe coders first, then beginners. Business owners served mostly from the Next phase | Needs your approval |
| 4 | Task states | Workflow-specific (`analyzing`, `checking`, …, `pull_request_open`) | Generic: `queued`, `claimed`, `running`, `awaiting_approval`, `succeeded`, `failed`, `cancelled`, `expired`. Workflow phases are recorded as events | Proposed |
| 5 | GitHub timing | GitHub connection in the first working phase | Local folders first. GitHub in M5 | Proposed |

If you approve, a follow-up change should update `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` and `CLAUDE.md` to point to this planning set, so there is one source of truth.

## Consistency review

The eight documents were checked against one another for:
- **Task states:** the same eight states everywhere. The canonical definition is in [ARCHITECTURE.md §4.1](./ARCHITECTURE.md#41-task-states-canonical-list-used-across-all-planning-docs).
- **Milestones:** M0–M9 + Later. The MVP is M0–M4 in PRODUCT, ROADMAP and BEGINNER_GUIDE.
- **Claude auth:** Mode A (own API key) is the MVP default everywhere. Mode B (own Claude Code login) is "Needs verification with Anthropic" everywhere.
- **Table names:** the same in DATA_MODEL, ARCHITECTURE, SECURITY and ROADMAP.
- **Secrets placement:** the API key stays on the device, provider tokens are encrypted server-side, and the service-role key is server-only. Consistent across SECURITY, DATA_MODEL and INTEGRATIONS.

**Conflicting requirements and unrealistic assumptions found:**
1. **"Use my Claude subscription" vs Anthropic's terms.** Third-party apps may not offer Claude.ai login or route subscription credentials for their users (Verified). This limits a beginner-friendly "just log in" experience. Mode A requires an API key and pay-as-you-go billing. Mode B is unresolved.
2. **"Easy for beginners" vs "local helper + API key + terminal".** The MVP still needs Node.js, a terminal and an API key. The BEGINNER_GUIDE and onboarding reduce the pain. A packaged desktop app comes Later.
3. **"Keep working when the laptop is closed" vs "near-zero cost".** These conflict. Background execution needs paid cloud compute, so it is deferred.
4. **"Business owners' repetitive work" vs MVP scope.** Most of it needs browser automation and integrations, which are high risk and deferred.
5. **"Free" hosting.** Supabase Free pauses inactive projects and lacks backups, and Netlify Free pauses sites when credits run out (both Need verification of the current terms). Fine for development, not for dependable production.
6. **Windows.** Claude Code's command sandbox doesn't run on native Windows (Verified), so Windows users need WSL2 or stricter approvals.
7. **Stitch.** No confirmed public API, and the design screens are still pending. The UI stays provisional until they arrive.

## Top 5 technical risks

| # | Risk | Why it matters | Mitigation |
|---|---|---|---|
| 1 | **Agent damages files or leaks secrets on the user's machine** | Real computers, real consequences | Layered defences: folder allowlist, `settingSources: []`, deny rules for credential paths, approvals via `canUseTool`, OS sandbox, limits, redaction, Git branches ([SECURITY.md](./SECURITY.md)) |
| 2 | **Claude authentication policy limits the product** | Many vibe coders have subscriptions, not API keys | Build on Mode A (clearly permitted). Ask Anthropic in writing about Mode B before advertising it |
| 3 | **Reliable helper ↔ web communication** (pairing, device-scoped tokens, reconnects, races between cancel and approval) | The core loop must never hang or lie | M1 spike, U1 spike in M2, database-enforced state transitions, re-sync on reconnect, end-to-end tests with a fake runner |
| 4 | **Malicious repositories, skills and MCP servers (prompt injection)** | Untrusted text can steer the agent | Don't auto-load project hooks or MCP. Review screens for skills and MCP. Approvals for side effects. Treat all content as data |
| 5 | **Free-tier limits and vendor changes** (Realtime connection caps, project pausing, credit-based billing, SDK changes) | Surprise outages or costs | Batch events, measure usage in M2, pin SDK versions, read SDK changelogs, plan a Supabase Pro upgrade before real users |

## Decisions that need your approval

These need your answer before coding starts (M0):

| # | Decision | Recommendation |
|---|---|---|
| D1 | Accept **local-first execution** (the helper on your computer) as the MVP worker, changing the existing PRD's cloud worker | **Yes** |
| D2 | Claude authentication: **Mode A only (own API key)** for the MVP, and contact Anthropic about Mode B | **Mode A only for now** |
| D3 | **Open-source licence**: MIT, Apache-2.0 or AGPL-3.0 | **Apache-2.0** (permissive + patent grant). Choose AGPL-3.0 if you want hosted forks to share their changes |
| D4 | Build a **provisional UI** before the Stitch screens arrive, and restyle later | **Yes** |
| D5 | **Package manager**: npm workspaces or pnpm | **npm** (no extra install) |
| D6 | **Sign-in method**: GitHub OAuth, email magic link, or both | **Both** (GitHub for coders, email for business owners). Cheap with Supabase |
| D7 | **Windows policy**: require WSL2, or support native Windows with stricter approvals | **Require WSL2 for the MVP** |
| D8 | Store a **capped, redacted diff** in the cloud for the review UI (on by default, can be disabled per project) | **Yes** |
| D9 | Update the existing `docs/*` and `CLAUDE.md` to point to this planning set | **Yes, as a follow-up docs PR** |
| D10 | Tech stack as proposed: Next.js 16, Supabase, Netlify, Node/TS helper, Claude Agent SDK | **Yes** |

## Recommended next milestone

**M0 — Foundations and decisions** (immediately followed by **M1 — Helper spike**).

M0 is tiny: record your decisions, create the monorepo skeleton with CI, and write the task-state machine with tests. M1 then proves the riskiest part (running Claude Code safely with approvals and cancel) in the terminal before any web UI exists. Details in [ROADMAP.md](./ROADMAP.md).

## What you should do next

1. Read [BEGINNER_GUIDE.md](./BEGINNER_GUIDE.md) first, then skim [PRODUCT.md](./PRODUCT.md) and [ROADMAP.md](./ROADMAP.md).
2. Answer decisions D1–D10 above. A short reply such as "D1 yes, D3 MIT, …" is enough.
3. Do the "Before M0" and "Before M1" items in the BEGINNER_GUIDE checklist (install Node.js LTS; create an Anthropic Console account with a spend limit). **Don't paste any keys into chat.**
4. Keep working on your Stitch screens. When they're ready, export them into `design/stitch/` as described in [../DESIGN.md](../DESIGN.md).
5. Ask Claude Code to start **M0**.

## Sources consulted during planning

Official (fetched directly):
- Claude Agent SDK overview, auth note and branding — https://code.claude.com/docs/en/agent-sdk/overview
- Claude Code legal and compliance (credential use, offering Claude Code in products) — https://code.claude.com/docs/en/legal-and-compliance
- Run Claude Code programmatically (`-p`, stream-json, permissions, bare mode, SIGTERM) — https://code.claude.com/docs/en/headless
- Agent SDK permissions — https://code.claude.com/docs/en/agent-sdk/permissions
- Agent SDK Claude Code features (`settingSources`) — https://code.claude.com/docs/en/agent-sdk/claude-code-features
- Claude Code sandboxing — https://code.claude.com/docs/en/sandboxing

Found through web search (official pages that could not be opened directly from this environment, or third-party summaries; treat as **Needs verification**):
- Supabase Realtime limits — https://supabase.com/docs/guides/realtime/limits
- Supabase free-tier summaries (third-party), e.g. https://makerkit.dev/blog/md/saas/supabase-pricing
- Netlify credit-based plans — https://www.netlify.com/changelog/netlify-pricing-update-introducing-credit-based-plans/ and billing FAQ https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans.md
- Netlify free plan commercial use (staff forum answer) — https://answers.netlify.com/t/can-we-use-netlify-free-plan-for-commercial-purposes/41545
- Netlify API get started (deploy methods) — https://docs.netlify.com/api/get-started
- GitHub App installation access tokens — https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app
- MCP specification changelog (2026-07-28) — https://modelcontextprotocol.io/specification/2026-07-28/changelog
- Next.js release information — https://en.wikipedia.org/wiki/Next.js (confirm on nextjs.org / npm)
