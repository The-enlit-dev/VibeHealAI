# BrixoAI — Security and Privacy Requirements (Planning v3)

**Status:** Starting specification [Decision DEC-08], last updated 2026-10-29. **Every requirement below is _Proposed_. None is implemented or tested yet.** BrixoAI is not "secure" because this document exists. A control counts only when it has been built, tested and its status updated in §6. Labels are defined in [DECISIONS.md](./DECISIONS.md).

The older baseline in [../SECURITY.md](../SECURITY.md) still states valid principles (least privilege, untrusted repository content, no fabricated results, approval before consequential actions). This document turns them into testable requirements for the local desktop MVP.

---

## 1. What we are protecting against

| Threat | Example |
|---|---|
| **Escaping the project folder** | A path such as `..\..\Users\me\.ssh\id_rsa`, a symlink or Windows junction inside the project pointing elsewhere, or a reserved device name |
| **Unwanted or destructive file changes** | Overwriting or deleting files without the user realising |
| **Running untrusted code** | `package.json` scripts and install scripts are code written by whoever made the project. They run with the user's permissions |
| **Secrets leaking** | `.env` values, API keys or tokens appearing in the UI, logs, session summaries, backups or the handoff brief |
| **Prompt injection, indirectly** | Text in project files or error logs written to trick an AI tool. BrixoAI has no built-in AI, but the handoff brief and the user's own AI tool can still be targeted |
| **Actions by the user's external AI tool** | Claude Code (run by the user) may edit or delete files or run commands. BrixoAI cannot prevent this. It can detect and undo **file changes inside the project folder** |
| **Tampered app or updates** | A modified installer or update |

**Core principle [Decision DEC-08]:** enforcement lives in BrixoAI's application code: path checks, approval gates, process control and redaction. It never relies on instructions to an AI.

**Stages:** **P** = must be in place before the first prototype touches a real project · **B** = before a public beta · **L** = can safely wait.

## 2. Requirements

### 2.1 Project boundaries (PB)
| ID | Requirement | Stage |
|---|---|---|
| PB-1 | Every path BrixoAI reads or writes is resolved (following symlinks) and must sit inside the selected project folder. Reject `..` segments, absolute paths, UNC/network paths (`\\server\share`), Windows device names (`CON`, `NUL`, `COM1`…), reserved characters, and names ending in a dot or space. | P |
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
| FC-4 | Every write BrixoAI itself makes (undo, restore) is atomic: write a temporary file, then replace. It refuses if the file changed unexpectedly since review. | P |
| FC-5 | BrixoAI never changes project files except on an explicit user action (undo or restore), and records each change in a local audit log. | P |
| FC-6 | Handle files locked by another program (common on Windows) with a clear message and retry. | B |
| FC-7 | Warn about risky diff content: new dependencies, install scripts, network calls, obfuscated code. | L |

### 2.3 Command execution (CE)
| ID | Requirement | Stage |
|---|---|---|
| CE-1 | BrixoAI runs only scripts listed in the project's `package.json`, chosen by exact name, after explicit approval that shows the script's real command text. No arbitrary commands. | P |
| CE-2 | No shell. On Windows, run npm through `node` and npm's own JavaScript entry point, not through `cmd.exe`, to avoid argument-injection problems (unknown U4). | P |
| CE-3 | Every run has a timeout. Cancel stops the **whole process tree**. On Windows this uses a Job Object configured to kill everything when closed (a Rakazo candidate, see [REUSE.md](./REUSE.md)). | P |
| CE-4 | Commands get a minimal allowlisted environment, never BrixoAI's own variables. | P |
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
| SN-4 | The UI and docs state plainly that BrixoAI **cannot** stop, inspect or undo commands an external tool ran, or changes it made outside the project folder. | P |

### 2.5 Secrets (SE)
| ID | Requirement | Stage |
|---|---|---|
| SE-1 | Secret files are never read for display, briefs or summaries: `.env*` (except `.env.example`, whose variable **names** may be read), `*.pem`, `*.key`, `*.pfx`, `.npmrc`, `.pypirc`, credential JSON files, plus a user-editable list. | P |
| SE-2 | Redaction runs on everything shown, stored or copied. It catches common key and token formats (Anthropic, OpenAI-style `sk-…`, GitHub, AWS, Stripe, JWTs, Bearer tokens, private-key blocks), `KEY=value` lines with sensitive names, and exact values from `.env` files (matched in memory, never stored). | P |
| SE-3 | Warn if a reviewed change would add a likely secret to a tracked file. | B |
| SE-4 | BrixoAI stores no credentials in the MVP. It has no accounts and no API keys. | P |

### 2.6 Handoff brief (HB)
| ID | Requirement | Stage |
|---|---|---|
| HB-1 | The brief is built only from redacted data: error output, project facts, file paths. It contains no secret file contents. | P |
| HB-2 | The user sees the full brief before copying. BrixoAI only places it on the clipboard. It never sends it anywhere. | P |
| HB-3 | The brief tells the external AI tool to treat project content as untrusted, propose minimal changes, explain each change and avoid secret files. **This is guidance, not enforcement**, and the UI says so. | P |

### 2.7 Network and privacy (NP)
| ID | Requirement | Stage |
|---|---|---|
| NP-1 | The MVP makes **no network connections**: no telemetry, no crash reporting, no update checks, no cloud. Only commands the user approves (for example `npm install`) can reach the network, and the approval says so. | P |
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
| WN-2 | The app opens **no network ports**. The UI talks to the main process only through Electron's internal messaging. | P |
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

### 2.11 Deferred: built-in AI agent requirements
Only relevant if a permitted, zero-cost embedded-AI path is ever approved ([INTEGRATIONS.md §3](./INTEGRATIONS.md#3-ai-options-and-their-status)). The earlier design notes still apply as starting points [Verified 2026-10-25 against Claude Agent SDK docs]:
- remove all built-in tools (`tools: []`) and expose only BrixoAI's own mediated tools;
- don't load project settings (`settingSources: []`);
- don't persist sessions (`persistSession: false`);
- deny-by-default `PreToolUse` hooks;
- turn and budget limits;
- telemetry off.

## 3. Prompt injection: how the MVP limits it
- BrixoAI never acts on instructions found in project files or logs. It has no AI to follow them.
- The handoff brief marks project content as untrusted (HB-3), but the user's AI tool may still be influenced. The safety net makes resulting file changes **visible and undoable** (FC-2, FC-3, SN-1), and the UI is honest that external commands are out of reach (SN-4).

## 4. Release gates

**Prototype gate (P):** before BrixoAI touches any real project, all **P** requirements are **implemented and tested** on Windows: PB-1/2/4/5, FC-1 to FC-5, CE-1 to CE-7, SN-1 to SN-4, SE-1/2/4, HB-1 to HB-3, NP-1/3, LD-1 to LD-3, WN-1/2/3/6, VR-1 to VR-3.

**Beta gate (B):** all **B** requirements implemented and tested, the remaining limitations documented in plain language, and VR-4 completed.

## 5. Known residual risks (accepted only if documented to users)
- Approved scripts run with the user's own permissions. There is no operating-system sandbox on native Windows.
- The user's external AI tool can act outside the project folder or run commands BrixoAI never sees.
- Redaction can miss unusual secret formats.
- Without a signed installer (U9), Windows will show security warnings and users can't easily verify the download.

## 6. Control status

| Area | Status |
|---|---|
| All requirements in §2 | **Proposed. Not implemented, not tested** (2026-10-29) |
