# BrixoAI — AI Access and Future Integrations (Planning v3)

**Status:** Last updated 2026-10-29. This file previously planned GitHub, Netlify, Supabase and MCP integrations for a hosted product. Those are **not in the MVP** (§4). It now records how AI fits into BrixoAI under the $0 budget [Decision DEC-05] and why the MVP has no built-in AI [Decision DEC-06]. Labels are defined in [DECISIONS.md](./DECISIONS.md).

> **Plain English:** BrixoAI does not contain an AI. You use Claude Code yourself, as you already do. BrixoAI makes that safer: it captures the error, gives you a clean summary to paste, takes a backup first, shows you exactly what changed, and lets you undo.

---

## 1. The Claude Code handoff (the MVP's AI path)

[Recommendation]

1. BrixoAI builds a **handoff brief**: the redacted error, project facts (scripts, Node version, missing env-variable *names*), relevant file paths and safety instructions.
2. You see the whole brief, then copy it. BrixoAI only uses the clipboard and sends nothing anywhere ([SECURITY.md](./SECURITY.md) HB-1 to HB-3, NP-1).
3. You open Claude Code yourself, in the project folder, and paste it.
4. Afterwards, BrixoAI shows every file Claude Code changed and lets you keep or undo each one.

**Why this is allowed and free:** it's ordinary use of Claude Code, a native Anthropic application, under your own subscription. BrixoAI never touches your Claude credentials and never sends requests to Anthropic [Verified 2026-10-25 against the terms quoted in §2]. Your normal subscription usage limits still apply.

**Limitation:** BrixoAI can't control Claude Code's actions. Commands Claude Code runs, and changes outside the project folder, are outside BrixoAI's view ([SECURITY.md](./SECURITY.md) SN-4). Claude Code has its own permission prompts and checkpoint features. BrixoAI's review and undo is an extra, beginner-focused layer, not a replacement.

## 2. Why BrixoAI cannot embed AI on your subscription

Checked against official Anthropic documentation on 2026-10-25 [Verified]:

- **Subscription sign-in is for Anthropic's own apps:** "OAuth authentication is intended exclusively for purchasers of Claude Free, Pro, Max, Team, and Enterprise subscription plans and is designed to support ordinary use of Claude Code and other native Anthropic applications." ([Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance))
- **Products must use API keys:** "Developers building products or services that interact with Claude's capabilities, including those using the Agent SDK, should use API key authentication through Claude Console or a supported cloud provider." (same page)
- **No subscription routing or credential handling by third parties:** "Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, or Max plan credentials on behalf of their users. Moreover, developers may not collect, store, or intermediate Claude.ai credentials or session tokens." (same page)
- **Agent SDK note:** "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK." ([Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview))
- **Long-lived tokens are for your own scripts:** `claude setup-token` creates a one-year subscription token "for CI pipelines and scripts" ([Authentication](https://code.claude.com/docs/en/authentication)). Asking users to paste such a token into BrixoAI would be collecting credentials, which the rule above forbids.
- **API access is billed separately:** paid per token, with spend caps per usage tier ([Pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Rate limits](https://platform.claude.com/docs/en/api/rate-limits)). A Claude subscription does not include API credit.

**Grey area, treated as blocked:** the same legal page says the rules don't prevent "an end user from signing in to the unmodified Claude Code binary with their own Claude subscription, including where a platform hosts Claude Code". It also says running Claude Code inside a product requires agreeing to the Commercial Terms. Whether BrixoAI may *launch or drive* the user's own Claude Code is therefore **not confirmed** (unknown U1). Under DEC-05 (no workarounds), BrixoAI doesn't do it unless Anthropic confirms in writing (owner decision P-1).

## 3. AI options and their status

| Option | What it would mean | Cost to owner | Status |
|---|---|---|---|
| **A. No built-in AI + Claude Code handoff** | §1 above | $0 | **Chosen for the MVP** [Decision DEC-06] |
| B. Claude Agent SDK with the user's own API key | BrixoAI runs an AI agent inside the app | Pay-per-token API billing for anyone using it, including the owner | **Excluded** (DEC-05). The SDK remains the preferred engine *if* embedded AI is ever approved [Decision DEC-11] |
| C. BrixoAI launches or drives the user's own Claude Code | For example, starting `claude` in the project folder for the user | $0 if permitted | **Blocked** pending written confirmation (U1, P-1) |
| D. Subscription token or claude.ai login inside BrixoAI | BrixoAI handles subscription credentials | — | **Not permitted** (§2) |
| E. Free third-party providers (for example OpenRouter free models) | A different engine and provider | Free tiers have tight limits and some providers may train on prompts [Assumption, from 2026-10-25 research] | **Deferred.** Needs its own decision, a terms review and a privacy review |
| F. Local models (for example Ollama or LM Studio) | AI running on the user's own computer | $0, but needs capable hardware | **Deferred.** Needs its own decision and engine work |

## 4. Future integrations (not in the MVP)

| Integration | Possible future use | Prerequisite before planning | Cost note |
|---|---|---|---|
| GitHub | Branches and pull requests from reviewed fixes | MVP validated; an auth design (DEC-07 currently excludes accounts) | GitHub free tiers; check limits then |
| Hosting (Netlify or others) | Publishing websites | Owner decision; probably out of scope for the problem being solved | User's own accounts |
| MCP tools | External tools for an AI agent | Built-in AI approved | Depends on the tool |
| Email / GitHub sign-in | Accounts | Validation shows accounts are needed (DEC-07) | Auth services may cost money |
| Figma | Design input | Design direction decided (P-8) | — |
| Stitch | — | **Not planned.** The Stitch design was rejected (DEC-10) | — |

Rakazo is not an integration. It's a reference codebase for selective reuse; see [REUSE.md](./REUSE.md).
