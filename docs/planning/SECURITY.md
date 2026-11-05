# VibeHeal — Security and Privacy Requirements (Planning v3)

**Status:** Starting specification [Decision DEC-08], last updated 2026-10-31. Requirements are _Proposed_ unless §6 says otherwise. §2.12 to §2.15 were added on 2026-10-31 for the backend-managed integration marketplace [Decision DEC-18, DEC-20, DEC-21]. Some of them are now implemented and tested on Linux; see §6. VibeHeal is not "secure" because this document exists. A control counts only when it has been built, tested and its status updated in §6. Labels are defined in [DECISIONS.md](./DECISIONS.md).

The older baseline in [../SECURITY.md](../SECURITY.md) still states valid principles (least privilege, untrusted repository content, no fabricated results, approval before consequential actions). This document turns them into testable requirements for the local desktop MVP.

---

## 1. What we are protecting against

| Threat | Example |
|---|---|
| **Escaping the project folder** | A path such as `..\..\Users\me\.ssh\id_rsa`, a symlink or Windows junction inside the project pointing elsewhere, or a reserved device name |
| **Unwanted or destructive file changes** | Overwriting or deleting files without the user realising |
| **Running untrusted code** | `package.json` scripts and install scripts are code written by whoever made the project. They run with the user's permissions |
| **Secrets leaking** | `.env` values, API keys or tokens appearing in the UI, logs, session summaries, backups or the handoff brief |
| **Prompt injection, indirectly** | Text in project files or error logs written to trick an AI tool. VibeHeal has no built-in AI, but the handoff brief and the user's own AI tool can still be targeted |
| **Actions by the user's external AI tool** | Claude Code (run by the user) may edit or delete files or run commands. VibeHeal cannot prevent this. It can detect and undo **file changes inside the project folder** |
| **Tampered app or updates** | A modified installer or update |
| **Stolen provider credentials** (added 2026-10-31) | Tokens leaking through the desktop app, logs, errors, the data folder, Git or the bundle. Addressed by CR-1 to CR-6 and BK-9 |
| **Forged or replayed authorization callbacks** (added 2026-10-31) | An attacker completing a connection with their own account, or a spoofed GitHub `installation_id`. Addressed by IN-5 and IN-10 |
| **Local web pages attacking the backend** (added 2026-10-31) | A website in the user's browser calling `127.0.0.1:8787` (CSRF, DNS rebinding). Addressed by BK-2 and BK-3 |
| **Over-privileged integrations** (added 2026-10-31) | An integration that can push code, deploy or move money. Addressed by IN-2, IN-4, IN-11 and DEC-21 |
| **Malicious provider content** (added 2026-10-31) | Commit messages or PR titles crafted to mislead a user or an AI tool. Addressed by IN-7: rendered as plain text, never treated as instructions |

**Core principle [Decision DEC-08]:** enforcement lives in VibeHeal's application code: path checks, approval gates, process control and redaction. It never relies on instructions to an AI.

**Stages:** **P** = must be in place before the first prototype touches a real project · **B** = before a public beta · **L** = can safely wait.

## 2. Requirements

### 2.1 Project boundaries (PB)
| ID | Requirement | Stage |
|---|---|---|
| PB-1 | Every path VibeHeal reads or writes is resolved (following symlinks) and must sit inside the selected project folder. Reject `..` segments, absolute paths, UNC/network paths (`\\server\share`), Windows device names (`CON`, `NUL`, `COM1`…), reserved characters, and names ending in a dot or space. | P |
| PB-2 | Don't follow symlinks or Windows junctions found inside the project when reading or writing. Report them instead. | P |
| PB-3 | Writes resist swap attacks: open relative to an already-opened folder handle and re-check the final path after opening (a pattern exists in Rakazo, see [REUSE.md](./REUSE.md)). | B |
| PB-4 | Normalise Windows paths (backslashes, letter case, short `8.3` names, trailing separators) **before** any check. | P |
| PB-5 | Refuse a drive root, the user's whole profile folder, or system folders as a project. | P |

### 2.2 File changes, snapshots and undo (FC)
| ID | Requirement | Stage |
|---|---|---|
| FC-1 | Before a protected fix session, snapshot the files that could change, stored locally with a manifest (path, size, hash). Excluded: `node_modules`, `.git`, build outputs, and secret files (see SE-1; changes to those are detected and warned, not backed up). | P |
| FC-2 | Change review shows every added, modified and deleted file, with a plain-language summary and a line-by-line diff. Deletions and overwrites are prominent. | P |
| FC-3 | Undo restores the snapshot exactly (verified by hash) per file or for the whole session. | P |
| FC-4 | Every write VibeHeal itself makes (undo, restore) is atomic: write a temporary file, then replace. It refuses if the file changed unexpectedly since review. | P |
| FC-5 | VibeHeal never changes project files except on an explicit user action (undo or restore), and records each change in a local audit log. | P |
| FC-6 | Handle files locked by another program (common on Windows) with a clear message and retry. | B |
| FC-7 | Warn about risky diff content: new dependencies, install scripts, network calls, obfuscated code. | L |

### 2.3 Command execution (CE)
| ID | Requirement | Stage |
|---|---|---|
| CE-1 | VibeHeal runs only scripts listed in the project's `package.json`, chosen by exact name, after explicit approval that shows the script's real command text. No arbitrary commands. | P |
| CE-2 | No shell. On Windows, run npm through `node` and npm's own JavaScript entry point, not through `cmd.exe`, to avoid argument-injection problems (unknown U4). | P |
| CE-3 | Every run has a timeout. Cancel stops the **whole process tree**. On Windows this uses a Job Object configured to kill everything when closed (a Rakazo candidate, see [REUSE.md](./REUSE.md)). | P |
| CE-4 | Commands get a minimal allowlisted environment, never VibeHeal's own variables. | P |
| CE-5 | `npm install` is a separate action with a plain warning that install scripts run code from the internet. | P |
| CE-6 | Output is size-capped and redacted (SE-2) before display or storage. | P |
| CE-7 | Only one command runs at a time per project, and its live status (running, cancelled, timed out, exit code) is shown honestly. | P |
| CE-8 | Optional memory/CPU limits and an option to block network access during checks. | L |

### 2.4 Safety net around external tools (SN)
| ID | Requirement | Stage |
|---|---|---|
| SN-1 | Change detection compares the project against the snapshot, not just file-watcher events (unknown U3). | P |
| SN-2 | Changes to secret files or files outside the snapshot scope are reported as "changed, not backed up". | P |
| SN-3 | Ending a protected session without reviewing changes requires confirmation. | P |
| SN-4 | The UI and docs state plainly that VibeHeal **cannot** stop, inspect or undo commands an external tool ran, or changes it made outside the project folder. | P |

### 2.5 Secrets (SE)
| ID | Requirement | Stage |
|---|---|---|
| SE-1 | Secret files are never read for display, briefs or summaries: `.env*` (except `.env.example`, whose variable **names** may be read), `*.pem`, `*.key`, `*.pfx`, `.npmrc`, `.pypirc`, credential JSON files, plus a user-editable list. | P |
| SE-2 | Redaction runs on everything shown, stored or copied. It catches common key and token formats (Anthropic, OpenAI-style `sk-…`, GitHub, AWS, Stripe, JWTs, Bearer tokens, private-key blocks), `KEY=value` lines with sensitive names, and exact values from `.env` files (matched in memory, never stored). | P |
| SE-3 | Warn if a reviewed change would add a likely secret to a tracked file. | B |
| SE-4 | ~~VibeHeal stores no credentials in the MVP. It has no accounts and no API keys.~~ **Superseded 2026-10-31 by CR-1 to CR-6:** provider credentials are now stored, by the backend only, encrypted. The desktop app still stores no credentials. | — |

### 2.6 Handoff brief (HB)
| ID | Requirement | Stage |
|---|---|---|
| HB-1 | The brief is built only from redacted data: error output, project facts, file paths. It contains no secret file contents. | P |
| HB-2 | The user sees the full brief before copying. VibeHeal only places it on the clipboard. It never sends it anywhere. | P |
| HB-3 | The brief tells the external AI tool to treat project content as untrusted, propose minimal changes, explain each change and avoid secret files. **This is guidance, not enforcement**, and the UI says so. | P |

### 2.7 Network and privacy (NP)
| ID | Requirement | Stage |
|---|---|---|
| NP-1 | **Amended 2026-10-31:** the *core safety workflow* still makes no network connections. Integration features connect only to the VibeHeal backend and, through it, to providers the user has chosen to connect (DEC-18). Original text: The MVP makes **no network connections**: no telemetry, no crash reporting, no update checks, no cloud. Only commands the user approves (for example `npm install`) can reach the network, and the approval says so. | P |
| NP-2 | Any future network feature needs informed consent that names the recipient, the data, the purpose and any cost. Declining keeps all local features working. | B (if any network feature is added) |
| NP-3 | A test confirms the app makes no unexpected outbound connections during a full session. | P |

### 2.8 Local data (LD)
| ID | Requirement | Stage |
|---|---|---|
| LD-1 | Settings, session summaries, snapshots and logs live only in the app's local data folder ([DATA_MODEL.md](./DATA_MODEL.md)). | P |
| LD-2 | 30-day default retention with automatic clean-up. **Delete all history** and **delete this session** actions. Behaviour documented in the app and in BEGINNER_GUIDE.md [Decision DEC-09]. | P |
| LD-3 | Logs are redacted, size-capped and rotated, and contain no file contents by default. | P |
| LD-4 | Export of session summaries (redacted). | B |

### 2.9 Windows and app hardening (WN)
| ID | Requirement | Stage |
|---|---|---|
| WN-1 | Native Windows operation with no WSL2. Handle long paths, letter case and line endings correctly. | P |
| WN-2 | The **desktop app** opens no network ports. The UI talks to the main process only through Electron's internal messaging. **Amended 2026-10-31:** the separate backend listens on loopback only (BK-1). | P |
| WN-3 | Electron hardening: context isolation on, renderer sandboxed, no Node.js in the renderer, strict content security policy, no remote content, navigation and new windows blocked. | P |
| WN-4 | Per-user install with no administrator rights. | B |
| WN-5 | Signed installer and integrity checks. Must be achievable at $0 (unknown U9); otherwise documented as a limitation. | B |
| WN-6 | No automatic updates in the MVP. Users update manually from a trusted source. | P |

### 2.10 Verification (VR)
| ID | Requirement | Stage |
|---|---|---|
| VR-1 | Every requirement has an ID, at least one test, and a status in §6 (Proposed → Implemented → Tested). | P |
| VR-2 | Boundary tests on a real Windows machine: `..`, symlinks, junctions, device names, UNC paths, letter-case tricks. Plus planted-secret tests (a fake key must never appear in the UI, logs, summaries or briefs) and process-tree-kill tests. | P |
| VR-3 | Undo round-trip tests: snapshot → external change → undo → hashes match. | P |
| VR-4 | Before a beta: free tooling (dependency audit, static analysis) plus a documented self-review. A paid external review conflicts with DEC-05, so that gap is stated openly. | B |

### 2.12 Backend and API (BK)
| ID | Requirement | Stage |
|---|---|---|
| BK-1 | The backend listens on `127.0.0.1` by default and **refuses** a non-loopback address unless `VIBEHEAL_ALLOW_NON_LOOPBACK=true` is set (reserved for a future deployment behind TLS). | P |
| BK-2 | Every route except `/v1/health` and the provider callback requires `Authorization: Bearer <local access token>`. The token is at least 32 random bytes, generated on the developer's machine, and compared in constant time. | P |
| BK-3 | The `Host` header must match the configured address (DNS-rebinding protection). Authenticated routes reject requests that carry a browser `Origin` header. | P |
| BK-4 | Input is validated at the boundary: route parameters against strict patterns, JSON bodies only, body size capped (64 KiB), unknown fields rejected, capability inputs validated by each capability. | P |
| BK-5 | Errors return a safe code and message only. No stack traces, provider response bodies, tokens or internal paths. | P |
| BK-6 | Security headers on every response: `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `Referrer-Policy: no-referrer`. | P |
| BK-7 | Configuration comes only from environment variables, validated at startup. Missing or weak secrets stop the server. `.env` is git-ignored, and `.env.example` contains placeholders only. | P |
| BK-8 | Outbound provider calls use HTTPS to fixed base URLs, have timeouts, and do not follow redirects. | P |
| BK-9 | The logger redacts every message and drops fields whose names suggest secrets (`token`, `secret`, `password`, `authorization`, `key`, `cookie`). | P |

### 2.13 Integrations and authorization (IN)
| ID | Requirement | Stage |
|---|---|---|
| IN-1 | Only first-party adapters compiled into the backend can be registered. The registry validates metadata (unique ids, declared permissions, planned adapters expose no capabilities). No plugin code is downloaded or executed (DEC-17). | P |
| IN-2 | Least privilege: each provider requests the minimum permissions for its implemented capabilities, read-only first. The UI shows each permission in plain language with its access level. | P |
| IN-3 | Per-action authorization: every capability call checks that the connection is connected, that its granted permissions cover the capability, and that the capability exists for that provider. Allowed and denied calls are both audited. | P |
| IN-4 | `write` and `sensitive` capabilities need an explicit approval bound to the connection, capability and input digest. It is single use and expires after 5 minutes. None is implemented yet (DEC-21). | P |
| IN-5 | Authorization `state` values are 256-bit random, single use, bound to one provider and expire after 10 minutes. | P |
| IN-6 | The desktop app opens authorization URLs only in the system browser, and only if they use `https` and a host declared in that provider's `authorizationHosts`. | P |
| IN-7 | Provider data is minimised: adapters return only whitelisted fields. Text from providers (commit messages, PR titles, descriptions) is untrusted data. It is rendered as text and never treated as instructions. | P |
| IN-8 | A connection is shown as **Connected** only after the callback was verified server-side. Unimplemented providers are **Coming soon**, and missing configuration is **Not configured**. No fake success. | P |
| IN-9 | Provider rate limits are respected and surfaced as `rate_limited` errors, without automatic retry storms. | P |
| IN-10 | GitHub: the installation callback is verified with a short-lived user authorization (the installation must appear in the user's accessible installations) before it is trusted. The user token is then discarded. **[Assumption U14: flow to be confirmed against GitHub docs.]** | P |
| IN-11 | Stripe (future): test mode only. Live-mode keys are rejected. No payments, refunds, payouts or account changes (DEC-21). | P (before the Stripe adapter) |

### 2.14 Credentials (CR)
| ID | Requirement | Stage |
|---|---|---|
| CR-1 | Provider credentials (client secrets, private keys, access and refresh tokens) exist only on the backend. The desktop app never receives them. | P |
| CR-2 | Credentials are encrypted at rest with AES-256-GCM: a random IV per record, AAD binding the record id and provider, and a key id. Tampered or mismatched records fail closed. | P |
| CR-3 | The encryption key comes from `VIBEHEAL_ENCRYPTION_KEY` (32 random bytes, base64), is never stored with the data, and is generated locally by `npm run setup:env`. | P |
| CR-4 | In-memory secret values are wrapped so serialisation, string conversion and inspection print `[REDACTED]`. | P |
| CR-5 | Disconnect deletes the stored credential and attempts provider-side revocation. The result is reported honestly; a failed revocation is shown, not hidden. | P |
| CR-6 | No secrets in source code, Git history, frontend bundles or test fixtures. Tests generate keys at runtime. The build fails if the renderer bundle contains secret-like strings or backend-only variable names. | P |

### 2.15 Audit (AU)
| ID | Requirement | Stage |
|---|---|---|
| AU-1 | Audit entries are written for: connection started, completed, failed and disconnected; capability allowed and denied; approval created and approved. | P |
| AU-2 | Audit entries pass through redaction, are size-capped and contain no credential values. | P |
| AU-3 | The audit log is append-only. 30-day retention with clean-up (matching DEC-09). | B |

### 2.11 Deferred: built-in AI agent requirements
Only relevant if a permitted, zero-cost embedded-AI path is ever approved ([INTEGRATIONS.md §3](./INTEGRATIONS.md#3-ai-options-and-their-status)). The earlier design notes still apply as starting points [Verified 2026-10-25 against Claude Agent SDK docs]:
- remove all built-in tools (`tools: []`) and expose only VibeHeal's own mediated tools;
- don't load project settings (`settingSources: []`);
- don't persist sessions (`persistSession: false`);
- deny-by-default `PreToolUse` hooks;
- turn and budget limits;
- telemetry off.

## 3. Prompt injection: how the MVP limits it
- VibeHeal never acts on instructions found in project files or logs. It has no AI to follow them.
- The handoff brief marks project content as untrusted (HB-3), but the user's AI tool may still be influenced. The safety net makes resulting file changes **visible and undoable** (FC-2, FC-3, SN-1), and the UI is honest that external commands are out of reach (SN-4).

## 4. Release gates

**Prototype gate (P):** before VibeHeal touches any real project, all **P** requirements are **implemented and tested** on Windows: PB-1/2/4/5, FC-1 to FC-5, CE-1 to CE-7, SN-1 to SN-4, SE-1/2/4, HB-1 to HB-3, NP-1/3, LD-1 to LD-3, WN-1/2/3/6, VR-1 to VR-3.

**Integration gate (IM, added 2026-10-31):** before any provider is used with a real account, BK-1 to BK-9, IN-1 to IN-10, CR-1 to CR-6 and AU-1/2 are implemented and tested. Before the backend is hosted anywhere: P-9 (identity), P-12 (key management) and a documented security review.

**Beta gate (B):** all **B** requirements implemented and tested, the remaining limitations documented in plain language, and VR-4 completed.

## 5. Known residual risks (accepted only if documented to users)
- **Added 2026-10-31:** whoever can read the developer's `.env` file can decrypt stored credentials. That is acceptable for local development only. Hosting needs a key-management decision (P-12).
- **Added 2026-10-31:** the local access token protects the backend from other local users and from websites. It does not protect against malware already running as the same user.
- Approved scripts run with the user's own permissions. There is no operating-system sandbox on native Windows.
- The user's external AI tool can act outside the project folder or run commands VibeHeal never sees.
- Redaction can miss unusual secret formats.
- Without a signed installer (U9), Windows will show security warnings and users can't easily verify the download.

## 6. Control status

Status values: **Proposed** → **Implemented** → **Tested** (VR-1). "Tested" here means automated tests ran and passed on 2026-10-31 on **Linux** (the build container), with **fake provider APIs**. Nothing was tested on Windows or against a live provider.

| Requirement | Status (2026-10-31) | Evidence |
|---|---|---|
| BK-1 loopback only | **Tested** | `server/config.test.ts` |
| BK-2 bearer token, constant-time | **Tested** | `server/http/app.test.ts`, `server/security/security.test.ts` |
| BK-3 Host check, browser rejection | **Tested** | `server/http/app.test.ts` |
| BK-4 input validation, size cap, unknown fields | **Tested** | `server/http/app.test.ts`, `shared/validation.test.ts`, GitHub input tests |
| BK-5 safe errors | **Tested** | `server/http/app.test.ts`, `server/providers/github/github.test.ts` |
| BK-6 security headers | **Tested** | `server/http/app.test.ts` |
| BK-7 env configuration, fail fast | **Tested** | `server/config.test.ts` |
| BK-8 HTTPS fixed hosts, timeouts, no redirects | **Tested** (GitHub client) | `server/providers/github/github.test.ts` |
| BK-9 redacting logger | **Tested** | `server/security/security.test.ts`, planted-token check in `app.test.ts` |
| IN-1 first-party registry validation | **Tested** | `server/integrations/registry.test.ts` |
| IN-2 least privilege, read-only first | **Tested** | registry tests (all read-only), GitHub write-permission refusal |
| IN-3 per-action authorization | **Tested** | `server/integrations/platform.test.ts` |
| IN-4 approval gate | **Tested** in the backend. No desktop approval UI yet, because no write action exists | `platform.test.ts` |
| IN-5 state: random, single use, expiring, hashed | **Tested** | `platform.test.ts`, `app.test.ts` |
| IN-6 authorization URL host check | **Tested** (desktop handlers and backend) | `desktop/desktop.test.ts`, `connection-manager.ts` |
| IN-7 data minimisation | **Tested** (GitHub) | `github.test.ts` |
| IN-8 honest availability | **Tested** | `platform.test.ts`, `registry.test.ts`; observed in the running UI |
| IN-9 rate limits surfaced | **Tested** (mapping only; there is no automatic retry) | `github.test.ts` |
| IN-10 GitHub install verification | **Tested with a fake GitHub API only.** Not verified live (U14) | `github.test.ts` |
| IN-11 Stripe test mode only | Proposed (no Stripe adapter yet) | — |
| CR-1 credentials only on the backend | **Tested** | `platform.test.ts`, `app.test.ts`, `desktop.test.ts` |
| CR-2 AES-256-GCM, AAD, fail closed | **Tested** | `server/credentials/encrypted-file-vault.test.ts` |
| CR-3 key from env, generated locally | **Tested** | `config.test.ts`; `npm run setup:env` run manually |
| CR-4 `Secret` wrapper | **Tested** | `security.test.ts` |
| CR-5 disconnect deletes and revokes | **Tested** | `platform.test.ts`, `github.test.ts` |
| CR-6 no secrets in source, bundle or fixtures | **Tested** (bundle check runs in `npm run build`, and was shown to fail on a planted string). Test keys are generated at runtime | `scripts/check-bundle.mjs` |
| AU-1 audit events | **Tested** | `platform.test.ts`, `app.test.ts` |
| AU-2 audit redaction | **Tested** | `platform.test.ts` |
| AU-3 audit retention | Proposed | — |
| WN-3 Electron hardening (marketplace window) | **Implemented, not tested.** Electron could not be launched in the build environment | `desktop/main/main.ts`, `desktop/renderer/index.html` |
| All core-workflow requirements (PB, FC, CE, SN, SE, HB, NP, LD, WN-1/2/4/5/6, VR) | **Proposed. Not implemented, not tested** | — |
