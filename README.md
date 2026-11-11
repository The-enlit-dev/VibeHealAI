# VibeHeal

**Just vibeheal it.**

VibeHeal helps vibe coders, especially beginners, safely understand, fix and manage a **broken JavaScript/TypeScript project**:
- understand the error and capture failing output safely;
- back up files before trying a fix;
- review every change;
- undo changes and re-run checks to see whether the fix really worked.

There is **no built-in AI**. Users run their own AI tool, such as Claude Code, and VibeHeal is the careful, honest safety net around that work.

**Integration marketplace (new, 2026-10-31).** VibeHeal connects to services you already use, with first-party integrations maintained by VibeHeal, to bring relevant context into that workflow:
- **Providers:** GitHub, Vercel, Netlify, Supabase, Figma, Stripe, Shopify, Notion and Slack.
- **Credentials:** a VibeHeal backend holds them, encrypted. The desktop app never sees them.
- **Access:** every integration starts read-only.

## Status (2026-10-31)

| Part | State |
|---|---|
| Integration marketplace (IM1): registry, adapter interface, connection, permission and approval services, encrypted vault, audit log, backend API, desktop catalog UI | **Implemented and tested** with automated tests (Linux). Desktop window not yet launched on Windows |
| GitHub (IM2): read-only GitHub App integration | **Implemented and tested against a fake GitHub API only.** Shows **Not configured** until a GitHub App is registered ([setup](./docs/integrations/GITHUB_APP_SETUP.md)). **Not tested live** |
| Vercel, Netlify, Supabase, Figma, Stripe, Shopify, Notion, Slack | **Coming soon:** catalog entries only, and they cannot be connected |
| Core broken-project workflow (Project Gate, script runner, snapshots, diff review, undo, handoff brief) | **Not implemented yet** (milestones M1–M4) |
| **V1 Error Explainer** at `/fix/` (paste an error: offline rule-based explanation, secret redaction, copy-ready AI brief) | **Built; tested locally** (browser test + unit tests). **Not deployed.** See [docs/V1.md](./docs/V1.md) |
| Hosting | **None.** The backend runs locally only. Nothing is deployed |

## Local setup

**Requirements:** Node.js 22.12 or newer (LTS), npm, Git.

Install the dependencies (one time):

```bash
npm install
```

Create `.env` and `.env.desktop` with freshly generated secrets. Both files are git-ignored, and the command never overwrites existing files:

```bash
npm run setup:env
```

Build and start the backend on `127.0.0.1:8787`:

```bash
npm run dev:server
```

In a second terminal, build and open the desktop app:

```bash
npm run dev:desktop
```

If npm 11 skipped Electron's install script, so `npm run dev:desktop` reports a missing Electron binary, fetch it once:

```bash
node node_modules/electron/install.js
```

Without GitHub App settings, the marketplace shows GitHub as **Not configured**, and that's expected. To test GitHub live, follow [docs/integrations/GITHUB_APP_SETUP.md](./docs/integrations/GITHUB_APP_SETUP.md).

### Checks

| Command | What it runs |
|---|---|
| `npm run typecheck` | TypeScript for backend, Electron main, preload and renderer |
| `npm run lint` | ESLint, including architecture-boundary import rules |
| `npm test` | Vitest unit and API tests |
| `npm run build` | Builds everything, then fails if the renderer bundle contains secret-like content |
| `npm run check` | All of the above |

### Configuration
- [`.env.example`](./.env.example): backend settings. Placeholders only.
- [`.env.desktop.example`](./.env.desktop.example): desktop settings. Only the backend URL and the local access token.

## Project layout

```text
shared/     Types and validation shared by desktop and backend (no secrets)
server/     Backend API: integration platform, provider adapters, vault, storage, audit
  integrations/  registry, adapter interface, connection manager, permissions, approvals
  providers/     github/ (real, read-only) and planned catalog entries
  credentials/   CredentialVault + AES-256-GCM file implementation
  storage/       repository interfaces, JSON-file storage, audit log
  http/          /v1 routes (Node http module, no framework)
desktop/    Electron app: main (IPC, backend client), preload (window.vibeheal), renderer (React UI)
scripts/    setup-env and the bundle secret check
docs/       Planning set, decisions and integration setup guides
site/      Source for the public website: temporary brand config, content, FAQ and page templates
website/   Generated public website (static, published as-is) with the early-access waitlist form
waitlist/  Waitlist service, private admin dashboard (admin-ui/), demand report and CSV export (Node built-ins only)
marketing/ Marketing plan, prompts and draft batches. Nothing is published automatically
```

## Public website, waitlist and admin dashboard (local preview)

The public website is a separate static site. Its name and catch line ("VibeHeal. Just vibeheal it.") are set in `site/brand.json`. On Netlify, the waitlist form submits to **Netlify Forms** (form `waitlist`). The owner must turn on form detection once in the Netlify UI. On the local preview below, the same form submits to the local waitlist service instead.

```bash
npm install
npm run build:site        # regenerate website/ from site/
npm run site:dev          # http://127.0.0.1:8790/ (and /admin/ once configured)
npm run waitlist:report   # private demand summary, counts only
npm run waitlist:export   # private CSV with email addresses, keep local
```

Local-preview signups are stored in `waitlist-data/` (git-ignored); Netlify signups are in the Netlify dashboard (Forms). Details, including admin setup, branding, SEO and Search Console: [docs/website/README.md](./docs/website/README.md). Content workflow: [marketing/README.md](./marketing/README.md).

## Documentation
1. [docs/planning/DECISIONS.md](./docs/planning/DECISIONS.md): the owner's decisions. They take precedence over every other document.
2. [docs/planning/README.md](./docs/planning/README.md): index of the planning documents.
3. [docs/planning/BEGINNER_GUIDE.md](./docs/planning/BEGINNER_GUIDE.md): plain-English overview, costs and setup.
4. [docs/planning/ARCHITECTURE.md](./docs/planning/ARCHITECTURE.md): desktop, backend, integration platform and core components.
5. [docs/planning/SECURITY.md](./docs/planning/SECURITY.md): requirements, with tested status in §6.
6. [docs/planning/INTEGRATIONS.md](./docs/planning/INTEGRATIONS.md): provider plan and how to add a provider.
7. [CLAUDE.md](./CLAUDE.md): instructions for Claude Code sessions.

Older documents (`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DESIGN.md`) describe an earlier direction and are kept for history. `docs/SECURITY.md` keeps the baseline security principles.

## Working principles
- **$0 extra cost.** No paid services, hosting, databases or APIs. Nothing is deployed.
- **Credentials stay on the backend,** encrypted. They never appear in the desktop app, logs, source or bundles.
- **Read-only first.** Sensitive actions need explicit approval.
- **Honest status.** Coming soon, Not configured, Connected and Error mean exactly that. No fabricated success.
- **Small, testable steps,** with explicit approval before merging, publishing or deploying.

## Licence
Apache-2.0 is the intended licence. The LICENSE file has not been added yet, and will be added with the owner's approval.
