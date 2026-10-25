# BrixoAI — Integrations (Planning v2)

**Status:** Proposed. No integration is implemented. Labels are explained in [PRODUCT.md](./PRODUCT.md).

> **Term — integration:** a connection between BrixoAI and another service (GitHub, Netlify, etc.) so an agent can use it on your behalf.
>
> **Term — OAuth:** the "Log in with X and allow access" flow. You approve specific permissions on the other service's website, and BrixoAI receives a token instead of your password.
>
> **Term — scope / permission:** exactly what a token is allowed to do (e.g. "read repository contents" but not "delete repository").

## Priority overview

| Integration | Priority | Milestone | Difficulty |
|---|---|---|---|
| Claude Code (via Agent SDK) | **P0 — MVP core** | M1 | Medium |
| Supabase | **P0 — MVP core** | M2 | Medium |
| GitHub | **P1 — Next** | M5 | Medium–High |
| Netlify | **P1 — Next** | M8 | Medium |
| MCP (user-configured servers) | **P2 — Next** | M9 | Medium–High (mostly security) |
| Browser automation | **P3 — Long-term** | Later | High (security) |
| Figma | P3 — Long-term | Later | Medium |
| Stitch | P3 — Long-term | Later | **Unknown** (no confirmed public API) |
| Google Search Console | P3 — Long-term | Later | Medium–High (Google OAuth verification) |
| Others (Slack, email, calendars, Notion, Vercel, Cloudflare) | P4 — Long-term | Later | Varies |

---

## 1. Claude Code

| Aspect | Details |
|---|---|
| **Purpose** | The engine that plans and performs coding work: reading and editing files, running commands, using skills and MCP tools |
| **How BrixoAI uses it** | The local helper calls the **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`, TypeScript), which runs Claude Code's agent loop on the user's machine (Verified: the SDK "runs the Claude Code binary" with built-in tools, permissions, sessions and hooks) |
| **Setup (user)** | Install Node.js LTS and the BrixoAI Helper. Create an Anthropic API key in the Claude Console with a **monthly spend limit**. Enter it into the helper, which stores it in the OS keychain |
| **Authentication** | **Mode A (MVP): user's own API key** — clearly permitted. **Mode B: user's own Claude Code subscription login via the unmodified CLI** — Needs verification with Anthropic. **Mode C: Bedrock / Google Cloud / Foundry** — Later. Details and quoted policy in [ARCHITECTURE.md](./ARCHITECTURE.md#6-claude-authentication-modes) |
| **Hard rules (Verified)** | No "Sign in with Claude.ai" in BrixoAI. Never collect, store or proxy Claude.ai credentials or session tokens. BrixoAI may not pay for, resell or intermediate users' Claude usage. Do not modify the Claude Code binary or remove its built-in authentication methods. Branding: "Powered by Claude" OK; do not call features "Claude Code" or mimic its visuals |
| **Permissions BrixoAI configures** | `cwd` = the allowlisted project folder. `settingSources: []` for untrusted projects (so repository hooks, `.mcp.json` and settings do not auto-load — Verified risk). `permissionMode: 'default'`. Scoped `allowedTools` for safe reads. `disallowedTools` / deny rules for secret paths (e.g. `Read(//Users/*/.ssh/**)` style rules; exact patterns to verify). `canUseTool` callback → BrixoAI approval cards. Claude Code command sandbox enabled with `failIfUnavailable: true` and `allowUnsandboxedCommands: false` on macOS/Linux/WSL2 (Verified settings) |
| **Cost** | Library free. AI usage pay-as-you-go on the **user's** Anthropic account. Per-run cost reported as an estimate (Verified) |
| **Difficulty** | Medium. The SDK does the heavy lifting; the work is relaying events and approvals reliably and safely |
| **Priority** | **P0 (M1)** |
| **Open questions** | Exact TS option names for turn/budget limits, effort and model listing (U3); Mode B acceptability (U2) |

## 2. GitHub

| Aspect | Details |
|---|---|
| **Purpose** | Link projects to repositories; list repos; open branches and pull requests from completed tasks; later, react to issues |
| **Two different jobs** | (1) **Local git** (commit, branch, diff) happens on the user's machine through the helper with the user's existing git setup — no GitHub token in BrixoAI's cloud. (2) **GitHub API** actions (list repos, open PRs) use a GitHub App |
| **Recommended mechanism** | **GitHub App** rather than an OAuth App or personal access tokens. A GitHub App has fine-grained permissions, the user chooses which repositories it may access, and installation tokens are **short-lived (1 hour — Verified)** and can be narrowed to specific permissions per request (Verified) |
| **Setup (you, once)** | Register a GitHub App in your GitHub account settings: name, callback URL, webhook (optional at first), permissions. Store the App's **private key** and client secret only in Netlify environment variables — never in the repository |
| **Setup (user)** | Click "Connect GitHub", then install the BrixoAI GitHub App on chosen repositories |
| **Authentication** | Server-side: App JWT → installation access token (1 h). User-to-server tokens for actions "as the user" (lifetime and refresh behaviour Needs verification) |
| **Minimum permissions (proposal)** | M5 start: Metadata (read), Contents (read). For PRs: Contents (read & write) on selected repos, Pull requests (read & write). No Administration, no Workflows write, no Secrets |
| **Pushing code** | Proposed: the helper pushes using the user's **own local git credentials** (they already push from their machine), and BrixoAI's GitHub App only opens the PR and reads status. This keeps write tokens off the user's machine and out of agent reach. Alternative: a short-lived installation token handed to the helper for one push. Decide in M5 |
| **Approvals** | Every push and PR creation requires explicit approval. **Merging is never done by BrixoAI in the MVP/Next phases** |
| **Cost** | Free for public and private repos within GitHub's free plan limits |
| **Difficulty** | Medium–High (token handling, webhook verification later) |
| **Priority** | **P1 (M5)** |

## 3. Supabase

| Aspect | Details |
|---|---|
| **Purpose** | BrixoAI's own database, sign-in, live updates and file storage. Not a user-facing integration in the MVP |
| **Setup (you)** | Create a Supabase account and **two** free projects: `brixo-dev` and later `brixo-prod` (the Free plan allows 2 — Needs verification). Install the Supabase CLI for local development (requires Docker for the local stack) |
| **Authentication** | Browser: anon/publishable key + user session (safe to expose; RLS protects data). Server: **service role / secret key only in Netlify environment variables**, never in the browser or the helper. Helper: device-scoped credential (approach to be decided — unknown U1 in [ARCHITECTURE.md](./ARCHITECTURE.md#10-open-unknowns)) |
| **Permissions** | Row Level Security on **every** table, plus explicit grants (new-project Data API change — Needs verification) |
| **Cost** | Free tier for development. Pro (~$25/month, Needs verification) recommended before relying on it for real users, because Free projects pause after 7 days of inactivity and lack automatic backups (Needs verification) |
| **Difficulty** | Medium (RLS policies must be designed and tested carefully) |
| **Priority** | **P0 (M2)** |
| **Future user-facing angle** | Vibe coders often build on Supabase. A Supabase MCP server could let agents manage the *user's own* Supabase projects — Later, under MCP rules |

## 4. Netlify

| Aspect | Details |
|---|---|
| **Purpose (two roles)** | (1) Hosting the BrixoAI web app itself (see [TECH_STACK.md](./TECH_STACK.md#6-hosting-and-deployment-of-brixoai-itself)). (2) **Sites feature (M8):** deploy users' websites to **their own** Netlify accounts |
| **Deploy API** | Netlify's API supports deploying with a **file digest** (list of file paths + SHA1 hashes, then uploading only the files Netlify asks for) or a **ZIP upload**; functions use SHA256 and a separate upload (Needs verification against current Netlify API docs; found via Netlify docs search results) |
| **Recommended flow** | The helper builds the site locally (an approved command), computes the digest, and asks the BrixoAI server to create the deploy using the user's Netlify token. The server returns the required file list; the helper uploads files via the server or with a short-lived upload grant (decide in M8). **Preview (draft) deploys by default; production deploys require explicit approval** |
| **Authentication** | Netlify OAuth application (register as a developer) or a user-supplied personal access token. Tokens are stored **encrypted server-side**, never in the browser or helper (Needs verification of current OAuth app registration steps) |
| **Permissions** | Netlify tokens are typically account-wide (Needs verification). Show the user clearly what the connection allows; support disconnect |
| **Cost** | The user's own Netlify plan. Free plan: 300 credits/month, sites pause when exhausted (Needs verification). Deploys consume the **user's** credits — tell them before deploying |
| **Difficulty** | Medium |
| **Priority** | **P1 (M8)** |

## 5. MCP (Model Context Protocol)

| Aspect | Details |
|---|---|
| **Purpose** | Let agents use external tools (databases, design tools, browsers, SaaS apps) through one standard |
| **Spec status** | Latest specification revision found: **2026-07-28**. It removes protocol-level sessions and the initialize handshake (stateless requests carrying version and capabilities in `_meta`) (Needs verification against the official spec pages; found via the spec changelog in search). Authorization is based on OAuth 2.1 (introduced in the 2025-03-26 revision; current details Needs verification) |
| **How BrixoAI uses it** | The Agent SDK accepts MCP servers through its `mcpServers` option (Verified). BrixoAI stores which servers an agent may use; the helper passes them per task |
| **Transports** | Local servers (stdio — runs a program on the user's machine) and remote servers (HTTP). Local stdio servers execute code on the user's computer, so they are treated like installing software |
| **Setup (user)** | Add a server from a curated list (Later) or by URL/command (advanced, with warnings) |
| **Authentication** | Remote servers: OAuth handled per server. Tokens stored like other integration tokens; local-only servers keep credentials on the device |
| **Permissions** | Each MCP tool call goes through BrixoAI approval unless the user explicitly pre-approves that specific tool. Allow rules must name a specific server (Verified: unanchored `mcp__*` allow rules are ignored by Claude Code) |
| **Risks** | Tool descriptions and outputs are untrusted (prompt injection); a malicious server can exfiltrate data. Never auto-load a repository's `.mcp.json` (Verified risk with default settings) |
| **Cost** | Free protocol; individual servers may cost money |
| **Difficulty** | Medium–High, mostly security and UX |
| **Priority** | **P2 (M9)** |

## 6. Future integrations

| Integration | Purpose | Setup and auth | Permissions | Cost | Difficulty | Priority / notes |
|---|---|---|---|---|---|---|
| **Browser automation** | Agents that visit websites, fill forms, check pages | Likely a Playwright-based MCP server in a sandbox; never the user's main browser profile by default | Per-site allowlist; approval before submitting forms, purchases or logins | Free software; cloud browsers cost money | High | Long-term. Needs its own security review (logins, payments, prompt injection from pages). Note: Claude Code's sandbox does not support Chromium by default (Verified limitation) |
| **Figma** | Read designs to guide UI implementation | Figma OAuth or personal access token; Figma offers an official MCP server (Needs verification of current availability and plan requirements) | Read-only file access | Depends on the user's Figma plan (Needs verification) | Medium | Long-term, via MCP (M9 foundation) |
| **Stitch** | Import design screens | **Unknown** — no confirmed public API found during planning. Interim: the user exports screens and adds them to `design/stitch/` as described in [../DESIGN.md](../DESIGN.md) | — | — | Unknown | Research later (U7) |
| **Google Search Console** | Real search performance data for the SEO agent | Google Cloud project + OAuth consent screen; scopes like read-only Search Console; Google app verification may be required for sensitive scopes (Needs verification) | Read-only | Free API with quotas (Needs verification) | Medium–High | Long-term. Until then, the SEO agent works only on local files and public pages |
| **Vercel / Cloudflare Pages** | More hosting choices for Sites | Provider OAuth/tokens | Deploy-only | User's plan | Medium each | Long-term |
| **Slack / email / calendar / Notion** | Business-owner automations and notifications | OAuth per provider; often via MCP | Narrow scopes | Varies | Medium each | Long-term; consider MCP servers before building custom integrations |

## Integration framework (shared design)

To avoid rebuilding the same plumbing per provider (Proposed):
- One `integrations` table row per connection: provider, status, granted scopes, external account ID, connected/revoked timestamps. **Tokens are never in this table.** They live encrypted in a separate server-only store (see [DATA_MODEL.md](./DATA_MODEL.md#4-what-lives-where)).
- One server-side adapter module per provider (`apps/web/src/server/integrations/<provider>.ts`) that normalises errors and permission checks.
- A connection screen showing exactly what was granted, with **Disconnect** (revokes on the provider side when the API allows it).
- Every external side effect (push, PR, deploy) writes an `audit_log` row with who approved it and the provider's actual response.
