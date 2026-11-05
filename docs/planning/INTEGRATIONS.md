# VibeHeal — AI Access and Integration Marketplace (Planning v4)

**Status:** Last updated 2026-10-31.
- §1 to §3 (AI access) are unchanged from v3: the MVP has **no built-in AI** and the Claude Code handoff stays [Decision DEC-06, DEC-24].
- §4 is new and describes the **first-party integration marketplace** [Decision DEC-17 to DEC-21].
- §5 keeps the v3 "future integrations" table for history. It is superseded.

Labels are defined in [DECISIONS.md](./DECISIONS.md).

> **Plain English:** VibeHeal does not contain an AI. You use Claude Code yourself, as you already do. VibeHeal makes that safer: it captures the error, gives you a clean summary to paste, takes a backup first, shows you exactly what changed, and lets you undo.

---

## 1. The Claude Code handoff (the MVP's AI path)

[Recommendation]

1. VibeHeal builds a **handoff brief**: the redacted error, project facts (scripts, Node version, missing env-variable *names*), relevant file paths and safety instructions.
2. You see the whole brief, then copy it. VibeHeal only uses the clipboard and sends nothing anywhere ([SECURITY.md](./SECURITY.md) HB-1 to HB-3, NP-1).
3. You open Claude Code yourself, in the project folder, and paste it.
4. Afterwards, VibeHeal shows every file Claude Code changed and lets you keep or undo each one.

**Why this is allowed and free:** it's ordinary use of Claude Code, a native Anthropic application, under your own subscription. VibeHeal never touches your Claude credentials and never sends requests to Anthropic [Verified 2026-10-25 against the terms quoted in §2]. Your normal subscription usage limits still apply.

**Limitation:** VibeHeal can't control Claude Code's actions. Commands Claude Code runs, and changes outside the project folder, are outside VibeHeal's view ([SECURITY.md](./SECURITY.md) SN-4). Claude Code has its own permission prompts and checkpoint features. VibeHeal's review and undo is an extra, beginner-focused layer, not a replacement.

## 2. Why VibeHeal cannot embed AI on your subscription

Checked against official Anthropic documentation on 2026-10-25 [Verified]:

- **Subscription sign-in is for Anthropic's own apps:** "OAuth authentication is intended exclusively for purchasers of Claude Free, Pro, Max, Team, and Enterprise subscription plans and is designed to support ordinary use of Claude Code and other native Anthropic applications." ([Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance))
- **Products must use API keys:** "Developers building products or services that interact with Claude's capabilities, including those using the Agent SDK, should use API key authentication through Claude Console or a supported cloud provider." (same page)
- **No subscription routing or credential handling by third parties:** "Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, or Max plan credentials on behalf of their users. Moreover, developers may not collect, store, or intermediate Claude.ai credentials or session tokens." (same page)
- **Agent SDK note:** "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK." ([Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview))
- **Long-lived tokens are for your own scripts:** `claude setup-token` creates a one-year subscription token "for CI pipelines and scripts" ([Authentication](https://code.claude.com/docs/en/authentication)). Asking users to paste such a token into VibeHeal would be collecting credentials, which the rule above forbids.
- **API access is billed separately:** paid per token, with spend caps per usage tier ([Pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Rate limits](https://platform.claude.com/docs/en/api/rate-limits)). A Claude subscription does not include API credit.

**Grey area, treated as blocked:** the same legal page says the rules don't prevent "an end user from signing in to the unmodified Claude Code binary with their own Claude subscription, including where a platform hosts Claude Code". It also says running Claude Code inside a product requires agreeing to the Commercial Terms. Whether VibeHeal may *launch or drive* the user's own Claude Code is therefore **not confirmed** (unknown U1). Under DEC-05 (no workarounds), VibeHeal doesn't do it unless Anthropic confirms in writing (owner decision P-1).

## 3. AI options and their status

| Option | What it would mean | Cost to owner | Status |
|---|---|---|---|
| **A. No built-in AI + Claude Code handoff** | §1 above | $0 | **Chosen for the MVP** [Decision DEC-06] |
| B. Claude Agent SDK with the user's own API key | VibeHeal runs an AI agent inside the app | Pay-per-token API billing for anyone using it, including the owner | **Excluded** (DEC-05). The SDK remains the preferred engine *if* embedded AI is ever approved [Decision DEC-11] |
| C. VibeHeal launches or drives the user's own Claude Code | For example, starting `claude` in the project folder for the user | $0 if permitted | **Blocked** pending written confirmation (U1, P-1) |
| D. Subscription token or claude.ai login inside VibeHeal | VibeHeal handles subscription credentials | — | **Not permitted** (§2) |
| E. Free third-party providers (for example OpenRouter free models) | A different engine and provider | Free tiers have tight limits and some providers may train on prompts [Assumption, from 2026-10-25 research] | **Deferred.** Needs its own decision, a terms review and a privacy review |
| F. Local models (for example Ollama or LM Studio) | AI running on the user's own computer | $0, but needs capable hardware | **Deferred.** Needs its own decision and engine work |

## 4. Integration marketplace (added 2026-10-31)

> **Plain English:** VibeHeal can connect to services you already use, such as GitHub, to show useful context while you fix a broken project. VibeHeal's own backend keeps the keys, and the desktop app never sees them. Each integration starts read-only.

### 4.1 Provider plan

Status uses the marketplace labels: **Not configured** means real code exists but needs setup; **Coming soon** means a catalog entry only.

| # | Provider | Milestone | Status on 2026-10-31 | First, read-only scope | Out of scope until separately approved |
|---|---|---|---|---|---|
| 1 | GitHub | IM2 | **Adapter built and unit-tested with a fake API. Not configured** until the owner registers a GitHub App (P-11). **Not tested live** | Repositories, repository details, branches, commits, pull requests | Pushing, branches, PR creation, merging, deleting, issues |
| 2 | Vercel | IM3 | Coming soon | Projects, deployments, deployment status | Creating, promoting or deleting deployments; env vars |
| 3 | Netlify | IM3 | Coming soon | Sites, deploys, deploy status | Creating, publishing or deleting deploys; env vars |
| 4 | Supabase | IM4 | Coming soon | Project list and status | Queries, schema changes, keys |
| 5 | Figma | IM4 | Coming soon | File outline (pages, frames) | Editing files, comments |
| 6 | Stripe | IM4 | Coming soon | **Test mode only:** products and prices | Live mode, payments, refunds, payouts, account changes (never planned) |
| 7 | Shopify | IM4 | Coming soon | Store details, product titles and handles | Orders, customers, any write |
| 8 | Notion | IM4 | Coming soon | Pages explicitly shared with VibeHeal | Editing pages |
| 9 | Slack | IM4 | Coming soon | Channel names | Posting (a later write action, needs per-message approval) |

The permission names for providers 2 to 9 are **intended scope only**. They have not been checked against each provider's official documentation (U15), and the UI says so.

### 4.2 How a provider is added (no marketplace or connection-manager changes)
1. **Review the provider's official docs:** auth model, scopes, rate limits, data handling and terms. Record findings here and resolve U15 for that provider.
2. **Write metadata** (`server/providers/<id>/metadata.ts`):
   - permissions with plain-English descriptions and access levels;
   - capabilities and the permissions they require;
   - authorization hosts and notes.
3. **Implement the adapter** (`ProviderAdapter` in `server/integrations/adapter.ts`):
   - `configuration()`, `beginConnect()`, `completeConnect()` and `revoke()`;
   - read-only capabilities with input validators and whitelisted output.
4. **Register it** in `server/providers/index.ts` in place of its planned adapter. The registry validates it at startup, and the contract tests in `server/integrations/registry.test.ts` run against it automatically.
5. **Add provider-specific tests** with a fake HTTP layer. Never commit real responses that contain tokens.
6. **Optional:** add a read-only context view in `desktop/renderer/context-views/`.
7. **Status:** mark the provider complete only after its real API integration has been tested (DEC-21).

### 4.3 Rules every integration follows
- First-party only. No plugin downloads or third-party code (DEC-17, IN-1).
- Read-only first. Any write or sensitive action needs:
  - owner approval to build it;
  - per-action user approval at runtime (IN-4).
- Credentials stay in the backend vault. The desktop app never sees them (CR-1).
- Official authentication only. No routing of another service's subscription credentials, and no unofficial workarounds (DEC-24).
- Honest status: Coming soon, Not configured, Available, Connected or Error (IN-8).
- Each integration must say how it helps the broken-project workflow (`contextUse`, DEC-16).

### 4.4 Third-party plugins (future, not planned work)
The registry and adapter interface are the extension point. Opening them to third parties would need, at minimum:
- signed declarative manifests;
- out-of-process execution with per-plugin permissions;
- a review and takedown process;
- a security review.

All of that is out of scope for the MVP (DEC-17).

## 5. History: v3 "future integrations" table (superseded 2026-10-31)

The table below was written when integrations were out of the MVP. It is kept for history; §4 replaces it.


| Integration | Possible future use | Prerequisite before planning | Cost note |
|---|---|---|---|
| GitHub | Branches and pull requests from reviewed fixes | MVP validated; an auth design (DEC-07 currently excludes accounts) | GitHub free tiers; check limits then |
| Hosting (Netlify or others) | Publishing websites | Owner decision; probably out of scope for the problem being solved | User's own accounts |
| MCP tools | External tools for an AI agent | Built-in AI approved | Depends on the tool |
| Email / GitHub sign-in | Accounts | Validation shows accounts are needed (DEC-07) | Auth services may cost money |
| Figma | Design input | Design direction decided (P-8) | — |
| Stitch | — | **Not planned.** The Stitch design was rejected (DEC-10) | — |

Rakazo is not an integration. It's a reference codebase for selective reuse; see [REUSE.md](./REUSE.md).
