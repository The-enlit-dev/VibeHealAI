# BrixoAI — Technical Stack and Cost Plan (Planning v3)

**Status:** Last updated 2026-10-31. Development dependencies were installed on 2026-10-31 for integration milestone IM1 (DEC-27). Versions and licences below were read from the installed packages that day. Labels are defined in [DECISIONS.md](./DECISIONS.md).

**Ground rule [Decision DEC-05]:** $0 in extra spending beyond the owner's existing Claude Code subscription. No API charges, paid hosting, databases, services, domains or subscriptions. Free and open-source tools and local storage only. No paid service is enabled and no free trial is assumed.

---

## 1. MVP stack

| Part | Choice | Purpose (plain English) | Expected licence | Cost |
|---|---|---|---|---|
| Desktop shell | **Electron 45.2.1** [Decision DEC-04] | Turns a web-style UI into a Windows app and includes its own Node.js runtime | MIT [Verified 2026-10-31, installed package] | $0 |
| UI | **React 19.1.10 + Vite 7.3.7 + TypeScript 5.9.3** [Decision DEC-04] | React builds the screens, Vite bundles them, TypeScript catches mistakes early | MIT / MIT / Apache-2.0 [Verified 2026-10-31] | $0 |
| Styling | **Plain CSS** (one stylesheet) [Changed 2026-10-31] | Minimal functional styling (DEC-10). Tailwind and shadcn/ui were not needed for IM1, so they were not added | — | $0 |
| Main-process logic | **Node.js built-ins** (fs, path, child_process, crypto) [Recommendation] | File checks, running scripts, hashing snapshots | Part of Node/Electron | $0 |
| Windows process control | `koffi` **only if** the Rakazo Job Object code is adopted after review ([REUSE.md](./REUSE.md)) | Lets JavaScript call Windows system functions for process-tree cleanup | MIT [Verified 2026-10-25 via npm package page and koffi.dev] | $0 |
| Package manager | **npm** [Decision DEC-14] | Installs development libraries | Bundled with Node | $0 |
| Unit tests | **Vitest 4.1.12** | Tests logic such as the registry, vault, redaction and API | MIT [Verified 2026-10-31] | $0 |
| App tests | Playwright (Electron support) [Recommendation] | Clicks through the real app like a user (U13) | Apache-2.0 [Assumption: verify] | $0 |
| Code checks | **ESLint 10.14.0 + typescript-eslint 8.72.1** + TypeScript compiler | Catch errors before running. ESLint import rules also enforce the architecture boundaries | MIT / MIT / Apache-2.0 [Verified 2026-10-31] | $0 |
| Storage | **Local JSON files** in the app data folder [Recommendation] | Settings, session summaries, snapshot manifests ([DATA_MODEL.md](./DATA_MODEL.md)) | — | $0 |
| Source control | Git + GitHub, **private** repository [Decision DEC-12] | Version history and review | — | $0 within free limits (§4) |
| Distribution (prototype) | Built installer shared via GitHub Releases on the private repo, or directly with testers [Recommendation] | Getting builds to testers | — | $0 (U10) |

### 1.1 Backend (added 2026-10-31, DEC-18)

| Part | Choice | Why | Cost |
|---|---|---|---|
| Runtime | **Node.js ≥ 22.12** (LTS) | Same language as the rest of the project. Built-in `fetch`, `crypto` and `http` | $0 |
| HTTP server | **Node's built-in `http` module**, no framework | About 10 routes; a framework would add dependencies and attack surface for little benefit. Can be swapped later if routing grows | $0 |
| Validation | **Small in-house validator** (`shared/validation.ts`) | Rejects unknown fields, checks types and lengths. Avoids a schema-library dependency (DEC-27) | $0 |
| Encryption | **Node `crypto`, AES-256-GCM** | Built-in, well-reviewed primitive; no custom cryptography | $0 |
| GitHub API | **Plain `fetch`** to api.github.com, with an RS256 App JWT signed by `crypto` | Avoids Octokit for five GET endpoints. Revisit if the GitHub feature set grows | $0 |
| Persistent data | **JSON files** in `.brixo-data/` behind repository interfaces | Local and free. A hosted backend would use a database implementation (P-10) | $0 |
| Hosting | **None.** Runs locally only (DEC-22) | — | $0 |

No backend runtime dependency was added: `server/` imports only Node built-ins. React and React DOM are the only runtime dependencies, and they are used by the desktop renderer.

**Known advisory (2026-10-31):**
- `npm audit` reports a moderate ReDoS advisory in `minimatch` (GHSA-g3hv-75wg-m249). It is pulled in by every current ESLint release.
- It affects development tooling only, which matches our own config globs, and nothing in the shipped app.
- Production dependencies: 0 advisories (`npm audit --omit=dev`).
- Re-check when ESLint updates.

**Install note:** with npm 10.9 in the build environment, adding Vitest 4.1.12 failed with an internal npm error (`Cannot read properties of null (reading 'edgesOut')`). npm 11 installed it. The resulting `package-lock.json` is lockfile v3 and works with npm 10.

**Licence check rule [Recommendation]:** before any dependency is installed (which needs separate approval), confirm its licence is compatible with Apache-2.0 and record it. Prefer few dependencies.

## 2. Removed from the MVP

| Previously proposed | Why removed | Revisit when |
|---|---|---|
| Next.js | No server-rendered pages needed in a desktop app | Only if a web product is ever planned |
| Netlify (as BrixoAI's host) | Nothing to host; would add cost risk. **Still removed** in v4. Netlify now appears only as a provider users may connect (DEC-19) | Same |
| Supabase (as BrixoAI's own database) | No accounts, sync or cloud data (DEC-07, DEC-09). **Still removed** in v4. Supabase now appears only as a provider users may connect (DEC-19) | Validation shows accounts are needed |
| Separate local helper + pairing | One desktop app is simpler and opens no ports. **Superseded in part 2026-10-31:** a separate *backend* now exists for integrations (DEC-18). It listens on loopback only, and there is still no pairing protocol | Hosting (P-9) |
| Claude Agent SDK + Anthropic API key | Requires API billing ([INTEGRATIONS.md](./INTEGRATIONS.md#2-why-brixoai-cannot-embed-ai-on-your-subscription)) | A permitted $0 path exists, or the budget changes |
| Sentry or other monitoring services | Sends data off the device (NP-1); possible cost | — |
| Domains, websites | Not needed for the MVP | — |

## 3. Costs at a glance

| Item | Cost |
|---|---|
| BrixoAI infrastructure | **$0**. The desktop app and the backend both run on the developer's own computer. Nothing is hosted (DEC-22) |
| AI usage | **$0 extra**. The user's own Claude Code subscription, used directly in Claude Code |
| Development tools | **$0**. Open-source |
| CI on a private repository | **$0** within GitHub's free quota (§4) |
| Code signing | **$0 only via a free programme** (§4); otherwise unsigned builds |

## 4. Zero-extra-cost conflicts

Every place where the plan could cost money, and how it's handled:

| Item | Conflict | Handling |
|---|---|---|
| Built-in AI (Agent SDK) | **Yes.** Needs paid API usage | Removed. Claude Code handoff instead (DEC-06) |
| GitHub Actions on a **private** repo | **Possible.** [Verified 2026-10-25, GitHub billing docs] GitHub Free includes 2,000 minutes a month for private repos, and Windows runners count **2×**. Public repos get standard runners free, but the repo stays private (DEC-12) | Keep CI small: Linux for most tests, Windows only for the Windows-specific suites. **The owner should check there's no payment method enabling overage, or that the Actions spending limit is $0.** GitHub states usage is blocked when the quota runs out and no valid payment method is on file |
| Windows code signing | **Yes.** Commercial certificates cost money | Prototype: unsigned builds (Windows SmartScreen will warn). Beta: SignPath Foundation's free signing for open-source projects reportedly needs an OSI licence, a **public** repo and free downloads (U9) [Assumption: verify eligibility]. That conflicts with DEC-12 for now |
| External security review | **Yes.** Usually paid | Free tools + documented self-review (SECURITY.md VR-4). The weaker assurance is stated openly |
| Automatic updates | Depend on signing and hosting | No auto-updates in the MVP (WN-6). Manual updates |
| Distribution | Private repo releases are visible only to people with access | Give testers repository access or share builds directly (U10) |
| Testing on others' projects with the owner's subscription | Unclear whether it counts as "ordinary, individual usage" | Testers use their own AI tools (U11) |
| Domains, hosting, databases, monitoring | Would cost money | Not used. The backend runs locally only (DEC-22) |
| **Hosting the backend later** (added 2026-10-31) | **Yes, likely.** Free tiers change and can convert to paid | Not done. Needs P-9, P-10, P-12 and a cost check at that time. Free tiers are not assumed to stay free |
| **GitHub App** | No. Registering an App is free | The owner registers it (P-11). No payment method needed |
| **Vercel / Netlify** (IM3) | Possible, depending on the user's own plan. API reads are expected to be free | Read-only; verify rate limits and terms first (U15). Never create deployments (DEC-21) |
| **Supabase / Figma / Notion / Slack** (IM4) | Possibly, depending on plan and API terms | Verify each provider's developer terms and rate limits before building (U15) |
| **Stripe** (IM4) | **Yes, if live mode were used** | Test mode only and read-only; live keys rejected (IN-11) |
| **Shopify** (IM4) | Possible: building may need a free Partner account and a development store | Owner decision when IM4 starts; read-only scopes only |

## 5. Requirements for developing BrixoAI (owner's machine)
- Windows 10/11 (the target platform), Node.js LTS, Git, and an editor. All free.
- Claude Code (existing subscription) to help write the code. That's ordinary use and adds no API cost.
- No Docker, cloud accounts or paid tools needed.
