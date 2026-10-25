# BrixoAI — Technical Stack and Cost Plan (Planning v2)

**Status:** Proposed. Nothing has been installed. Labels are explained in [PRODUCT.md](./PRODUCT.md).

**About prices and limits.** Figures were researched in October 2026. Facts confirmed from official documentation are marked **Verified**. Figures found only through search results or third-party articles are marked **Needs verification**, because this planning environment could not open those vendors' pricing pages directly. **Re-check every number on the vendor's official pricing page before you rely on it.** No service runs a production product for free forever.

**Guiding rule:** the smallest reliable stack. Each technology must earn its place.

---

## Cost summary first

| Phase | Expected fixed monthly cost | Variable costs |
|---|---|---|
| Development (you building, M0–M4) | **$0** for BrixoAI infrastructure on free tiers | Your own Anthropic API usage while testing. Set a monthly spend limit in the Claude Console |
| Small private beta (≈10–50 users) | **Likely $0–$25** (Supabase free may be enough; the inactivity pause and lack of backups argue for Supabase Pro once real users depend on it) | Each user pays their own AI usage (required by Anthropic's terms — Verified) |
| Public open-source launch with a hosted instance | **~$25–$50+** (Supabase Pro + possibly a Netlify paid plan) | Grows with users; monitoring may need a paid plan |
| Cloud workers (Later) | **Usage-based, can be significant** | Per-minute compute per task |

**Biggest cost lever:** BrixoAI never pays for users' AI usage. That is both cost-saving and **required**: products that run Claude Code may not pay for, resell or intermediate Claude usage on users' behalf (Verified, Claude Code legal and compliance page).

## Free-tier categories

| Category | Examples in this plan |
|---|---|
| **Genuinely free (open-source software you run yourself)** | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Node.js, Zod, Vitest, Playwright, Supabase CLI, Git |
| **Free but usage-limited hosted tiers** (fine for development; pause or stop at limits) | Supabase Free, Netlify Free, GitHub Free (Actions minutes on private repos), Sentry developer tier (Needs verification) |
| **Trials / credits** | Some cloud-sandbox vendors offer starter credits (Needs verification per vendor). Not relied on |
| **Always paid (usage-based)** | Anthropic API (paid by each user), cloud workers (Later), custom domains (~$10–$20/year if you buy one; optional) |

---

## 1. Frontend and UI components

**Purpose in plain English:** what users see and click in their browser.

| Option | What it is | Fit for BrixoAI | Free limits | When you pay |
|---|---|---|---|---|
| **Next.js 16 + React + TypeScript** (**Recommended**) | A React framework that also lets you write server code in the same project | Your preference; good for an app with sign-in, server actions and realtime. 16.x is the current stable line (Needs verification of the exact patch; confirm with `npm view next version` at scaffold time) | Open source (MIT) | Never for the framework itself |
| Vite + React (single-page app) | Lighter, browser-only React setup | Simpler, but you would need a separate backend for privileged actions | Open source | Never |
| **Tailwind CSS** (**Recommended**) | Utility CSS classes for styling | Fast styling; maps cleanly to design tokens from Stitch | Open source | Never |
| **shadcn/ui** (**Recommended**) | Copy-paste React components (built on Radix) that you own and edit | Easy to restyle to match the Stitch screens; no lock-in | Open source | Never |
| A full UI kit (MUI, Chakra) | Pre-styled component libraries | Harder to make match a custom Stitch design | Open source | Never |

**Decision:** Next.js + TypeScript + Tailwind + shadcn/ui. The UI stays **provisional** (plain shadcn defaults) until the Stitch screens are supplied (see [../DESIGN.md](../DESIGN.md)).

## 2. Backend and API

**Purpose:** code that runs on a server, where secrets can be kept safely.

| Option | Fit | Free limits | When you pay |
|---|---|---|---|
| **Next.js Route Handlers and Server Actions on Netlify** (**Recommended**) | Same codebase as the UI. Used only for privileged actions (pairing, GitHub token exchange, Netlify API) | Counts against Netlify credits (see §6) | When credits run out |
| Supabase Edge Functions | Server functions hosted by Supabase (Deno runtime) | Free-tier invocation quota (Needs verification) | Beyond quota |
| Separate Node server (Express/Fastify) on a VPS | Full control; can hold long-lived connections | No meaningful free tier | ~$5+/month |

**Decision:** Next.js server code only. Most reads and writes go straight from the browser to Supabase, protected by Row Level Security, which keeps function usage low. Supabase Edge Functions stay an option for scheduled jobs later.

## 3. Database and authentication

**Purpose:** store data permanently and handle sign-in.

| Option | Fit | Free limits | When you pay |
|---|---|---|---|
| **Supabase** (Postgres + Auth + Realtime + Storage) (**Recommended**) | One service for four needs; open source; Postgres is a standard skill | 2 free projects, 500 MB database, 1 GB file storage, ~5 GB egress, 50,000 monthly active users, **projects pause after 7 days of inactivity**, no automatic backups on Free (all **Needs verification**: third-party sources). Realtime: **200 concurrent connections, 100 messages/second** on Free (**Verified**, Supabase Realtime limits page) | Pro plan, commonly reported at about $25/month per organisation (Needs verification). Recommended once real users depend on it (no pausing, backups) |
| Firebase | Google's app backend | NoSQL, not open source, harder to self-host | Usage-based |
| Neon (Postgres) + Clerk (auth) + Pusher (realtime) | Best-in-class parts | Three vendors, three dashboards, three sets of limits | Each separately |
| Self-hosted Supabase | Same features on your own server | Free software, but you run and secure the server | Server cost + your time |

**Decision:** Supabase. Note: Supabase announced that new projects need **explicit Postgres grants** for Data API access, with existing free projects affected from 30 October 2026 (Needs verification). Our migrations will include explicit `grant` statements from the start.

**Sign-in methods:** GitHub OAuth (natural for vibe coders, prepares for M5) **or** email magic link (friendlier for business owners). Both are free in Supabase Auth. → Decision needed.

## 4. Local desktop helper

**Purpose:** the program on the user's computer that runs AI coding work in allowed folders.

| Option | Fit | Cost | Trade-offs |
|---|---|---|---|
| **Node.js LTS command-line program in TypeScript** (**Recommended for MVP**) | Same language as the web app; the official Agent SDK has a TypeScript package (Verified). Distributed via npm (`npx brixo-helper`) | Free | Requires Node.js installed; terminal-based |
| Python CLI | The Agent SDK also has a Python package (Verified) | Free | Two languages in one project |
| Tauri desktop app (Rust + web UI) | Small native app with tray icon | Free | Rust learning curve; code signing costs (Apple Developer ~$99/year — Needs verification; Windows signing certificates vary) |
| Electron desktop app | Full desktop app in JavaScript | Free | Large downloads; signing costs as above |

**Decision:** Node.js CLI first (M1). Desktop packaging later, once the helper's behaviour is stable.

**Storing secrets locally:** the OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service) through a small, well-maintained Node library. Choose and verify the library in M1; options include `@napi-rs/keyring` or `keytar` (keytar is archived — Needs verification).

## 5. Claude Code integration

**Purpose:** the AI "engine" that actually reads, edits and runs code.

| Option | Fit | Cost | Notes |
|---|---|---|---|
| **Claude Agent SDK, TypeScript** (`@anthropic-ai/claude-agent-sdk`) (**Recommended**) | Official library that runs Claude Code's agent loop with permissions, `canUseTool` approvals, `interrupt()`, sessions, hooks and MCP (all Verified) | Free library; **AI usage billed to the user's own API key** | Anthropic requires API-key (or cloud-provider) authentication for products built on the SDK (Verified). Governed by Anthropic's Commercial Terms |
| Claude Code CLI as a subprocess (`claude -p --output-format stream-json`) | Lets a user use their own existing Claude Code login (Mode B) | User's own plan | **Needs verification with Anthropic** before advertising (see [ARCHITECTURE.md](./ARCHITECTURE.md#6-claude-authentication-modes)) |
| Anthropic Client SDK + home-made tool loop | Full control | User's API usage | You would rebuild file tools, permissions and safety yourself. Not recommended |
| Claude Managed Agents (Anthropic-hosted agent harness) | Hosted sandbox; candidate for future cloud execution (Verified that it exists) | API usage + hosting fees (Needs verification) | Later, for the cloud worker |

**Cost transparency:** Claude Code reports `total_cost_usd` and token usage per run. Anthropic describes these as **client-side estimates that can differ from the actual bill** (Verified). BrixoAI will always label them "estimated". For current per-model prices, see Anthropic's official pricing page. This plan does not copy prices that may change.

**Model names:** BrixoAI should not hard-code model names. It should list the models the runtime reports as available (exact SDK method to be verified in M1).

## 6. Hosting and deployment (of BrixoAI itself)

**Purpose:** where the BrixoAI web app lives on the internet.

| Option | Fit | Free limits | When you pay |
|---|---|---|---|
| **Netlify** (**Recommended**, your preference) | Supports Next.js; Git-based deploys; also the first provider for the user-site publishing feature (M8), so we learn one platform | **Free plan: 300 credits/month; when credits run out, all your sites pause** (show "Site not available") until the next cycle or an upgrade; 1 concurrent build (Needs verification: Netlify changelog and billing FAQ via search). Commercial use on Free appears allowed according to Netlify staff forum answers (Needs verification against the current Terms) | Personal ~$9/month (1,000 credits); Pro from ~$20/month (Needs verification) |
| Cloudflare Workers/Pages | Generous free tier; Next.js support via an adapter (OpenNext) | Free-tier request limits (Needs verification) | Paid Workers plan |
| Vercel | Made by the Next.js team | Hobby plan reported as **non-commercial only** (Needs verification) | Pro per seat |

**Decision:** Netlify. Watch credit usage in M2 (unknown U6). Supabase Realtime carries live updates, so we avoid polling Netlify functions.

## 7. Background tasks, scheduling and future cloud workers

**Purpose:** running work later, on a schedule, or when your laptop is closed.

| Need | MVP answer | Later options (all Needs verification on pricing and limits) |
|---|---|---|
| Long-running agent work | The local helper (no cloud cost) | Cloud worker |
| Expire stale queued tasks, mark lost helpers | Checked "lazily" when tasks are read, plus a small scheduled job | Supabase `pg_cron` (availability on Free to verify) or Netlify Scheduled Functions |
| User-defined schedules ("every morning") | Not in MVP | `pg_cron` / scheduled function **enqueues** a task; it runs on the helper if online, otherwise on a cloud worker |
| Cloud computers (persistent or per task) | Not in MVP | Claude Managed Agents (Anthropic-hosted or self-hosted sandbox); E2B; Modal; Fly.io Machines; Cloudflare Containers; Daytona. Compare on isolation, persistence, per-minute price and open-source friendliness when the time comes |
| Job queue | The `tasks` table *is* the queue (claimed atomically with a database function) | Postgres-based queues (e.g. `pgmq` in Supabase — Needs verification) before adding Redis or another vendor |

**Why no queue service in the MVP:** one user's helper processes one task at a time (proposal), so a database table with an atomic "claim" is enough. Adding Redis or a queue vendor would be popularity-driven complexity.

## 8. File storage and logs

| Data | Where | Free limits | Notes |
|---|---|---|---|
| Task events (sanitised summaries) | Supabase Postgres `task_events` | Counts toward the 500 MB database (Needs verification) | Throttled and size-capped per event (proposal: 8 KB each); old events pruned or archived |
| Full raw agent transcripts | **User's machine** (Claude Code keeps session transcripts locally — Verified) | Free | Not uploaded by default (privacy + storage) |
| Attachments (screenshots, documents) | Supabase Storage, private buckets with RLS policies | 1 GB on Free (Needs verification) | M5+ |
| Application logs (web/server) | Netlify function logs + Supabase logs | Short retention on free tiers (Supabase Free ~7 days — Needs verification) | Never log secrets; redact first |

## 9. Monitoring and testing

| Tool | Purpose (plain English) | Cost | When |
|---|---|---|---|
| **Vitest** | Fast unit tests ("does this function do what I think?") | Free (open source) | M0 |
| **Playwright** | End-to-end tests that drive a real browser like a user | Free (open source) | M2–M3 |
| **Supabase CLI local stack** | Runs a private copy of Supabase on your computer to test database rules safely | Free; **requires Docker Desktop or a compatible runtime** (Docker Desktop is free for personal and small business use — Needs verification of the licence threshold) | M2 |
| **ESLint + TypeScript `tsc`** | Catch mistakes before running code | Free | M0 |
| **GitHub Actions** | Runs the checks automatically on every pull request | Free for public repositories; limited minutes for private repos (Needs verification) | M0 |
| **Sentry** (optional) | Error tracking in production | Free developer tier with limited events (Needs verification) | Before the beta |
| Dependabot / `npm audit` | Warns about vulnerable dependencies | Free | M0 |

**Not needed in the MVP:** Kubernetes, Redis, microservices, a separate API server, a vector database (memory search can start with Postgres full-text search; `pgvector` is available in Supabase if needed later — Needs verification).

---

## Open-source considerations

- **Licence decision needed:** MIT or Apache-2.0 (maximum adoption; companies can build closed products on top) vs AGPL-3.0 (anyone offering a modified hosted version must share their changes). Apache-2.0 adds an explicit patent grant. → Decision needed.
- **Claude Code itself is not part of BrixoAI's open-source code.** Users install it, or it comes via the Agent SDK package under Anthropic's terms. BrixoAI must not modify the Claude Code binary or remove its authentication methods (Verified condition for products that run Claude Code).
- **Branding:** "Powered by Claude" is allowed. Calling a BrixoAI feature "Claude Code", or using Claude Code-style visuals, is not (Verified, Agent SDK branding guidelines).
- **Self-hosting:** the open-source design should let anyone run their own Supabase + Netlify (or other host) instance. Configuration comes from environment variables, with a placeholder-only `.env.example`.
