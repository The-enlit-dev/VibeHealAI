# BrixoAI — Rakazo Reuse Register (Option B)

**Status:** Review notes only, last updated 2026-10-29. **No Rakazo code has been copied into BrixoAI.** [Decision DEC-03] BrixoAI is built independently. Small Rakazo parts may be reused only after their code, licence, security and compatibility are reviewed and the owner approves each one (owner decision P-5). Rakazo is not a foundation, a dependency or an integration. Labels are defined in [DECISIONS.md](./DECISIONS.md).

---

## 1. Source reviewed

| Item | Value |
|---|---|
| Repository | `The-enlit-dev/rakazo`, a fork of `elie222/rakazo` [Verified 2026-10-25] |
| Commit reviewed | `9c851fe` (read-only reference copy, not executed) [Verified] |
| Licence | Apache-2.0 (`LICENSE`; `"license": "Apache-2.0"` in `package.json`). Copyright line "Copyright 2026 Rakazo contributors" [Verified] |
| NOTICE file | None at that commit [Verified] |
| Method | Code reading only. No Rakazo tests were run, and nothing was installed or executed |

## 2. Licence and attribution rules

[Verified: Apache License 2.0, section 4] If any Rakazo file or substantial part is reused, BrixoAI must:
1. include a copy of the Apache-2.0 licence;
2. keep the original copyright and attribution notices;
3. add a prominent notice in each modified file stating that it was changed;
4. carry over any NOTICE content (none exists at the reviewed commit).

**Procedure [Recommendation]:**
- Record each adopted piece in §4 with the source path, commit and the BrixoAI destination.
- Add a header comment such as: `Adapted from Rakazo (https://github.com/elie222/rakazo), commit 9c851fe, path …, Apache-2.0. Modified by BrixoAI contributors: <what changed>.`
- Keep a `THIRD_PARTY_NOTICES` entry.
- Apache-2.0 grants **no trademark rights**: never use the Rakazo name or branding in BrixoAI's identity.
- BrixoAI's own LICENSE file is not created yet (DEC-15, P-4).

## 3. Candidates

Verdicts: **Reuse after review** (adapt, with tests, once approved) · **Study only** (learn the idea, write our own) · **Avoid**.

| # | Candidate | Path at `9c851fe` | What it does / why it may help | Dependencies and fit | Limitations | Verdict | Relevant to |
|---|---|---|---|---|---|---|---|
| 1 | Windows process-tree cleanup | `packages/adapters/src/desktop-process-tree.ts` (`spawnOwnedCommand`, line 116) | Puts each command in a Windows Job Object set to kill everything when closed. A wrapper waits until the job is set before starting the real command, so no child process escapes. Arguments and environment go through a private pipe, not the command line | `koffi` 3.3.4 (MIT [Verified via npm page]). Uses Electron-as-Node, so it fits Electron | Sets no memory/CPU limits. Native struct layouts need Windows x64 tests. No dedicated test file found | **Reuse after review** | CE-3, M2 |
| 2 | Windows path checks | `packages/adapters/src/desktop-sandbox-paths.ts` (`isAllowedDesktopPath`, line 13); helper `normalizeWorkspacePath` in `computer-support.ts` line 65 | Rejects device names, reserved characters, trailing dot/space, UNC paths, `..` segments | No dependencies. Has tests (`desktop-sandbox-paths.test.ts`) | Small. Must be combined with our own symlink and junction handling | **Reuse after review** | PB-1, PB-4, M1 |
| 3 | Swap-safe Windows file access | `packages/adapters/src/desktop-sandbox-win32-path.ts`; usage in `desktop-sandbox.ts` (`localWorkspaceTarget` line 463, `openContainedWorkspaceFile` line 570) | Opens files relative to a held folder handle via Windows system calls, refuses reparse points (junctions/symlinks), confirms the final path | `koffi`. Tightly tied to Rakazo's sandbox class. Has tests (`desktop-sandbox-write-containment.test.ts`) | Complex, low-level code; needs careful review | **Study now**; possibly adapt for the beta | PB-2, PB-3 |
| 4 | Minimal command environment | `packages/adapters/src/sandbox-command-environment.ts` (`hostCommandEnvironment`, line 86) | Passes only an allowlist of environment variables, matched case-insensitively on Windows | No dependencies. Has tests | Allows SSH-agent and proxy variables; decide whether BrixoAI wants those | **Reuse after review** | CE-4, M2 |
| 5 | Exact-value secret redaction | `packages/core/src/events.ts` (`redactSecrets` line 501, helper `redactedRanges` line 471) | Removes known secret values from text, including overlapping matches | No dependencies | Only catches values already known | **Reuse after review** | SE-2, M1 |
| 6 | Pattern-based log redaction | `packages/logging/src/redaction.ts` (`redactSensitiveText`, line 76) | Regex scrubbing of emails, Bearer tokens, `key=value` secrets, `sk-…` keys, JWTs | The package depends on Sentry and Axiom (do not import it) | Narrow patterns: no GitHub or AWS tokens, no private-key blocks | **Study only**; write a broader version | SE-2 |
| 7 | Approval and taint concepts | `packages/core/src/action-approval.ts` (`toolResultTaintsRun` line 206, `planActionGate` line 367) | Ideas: mark a run "tainted" after reading outside content; fail toward asking | Tied to Rakazo's agent rules | **Its defaults exempt shell and file writes from approval** (lines 3–27), the opposite of BrixoAI's model | **Study ideas, avoid code** | Future AI only |
| 8 | AI data-sharing consent pattern | `packages/adapters/src/ai-consent.ts` (`aiRecipient`, line 23); `docs/ai-data-sharing-review.md` | Consent tied to recipient, endpoint and disclosure version, with withdrawal rules | Depends on Rakazo's model catalogue. Used only in its mobile app | — | **Study only** | NP-2 (future) |
| 9 | Localhost bridge | `packages/adapters/src/host-computer-server.ts` | Token compared in constant time; rejects requests with an Origin header; size limits | — | Listens on **all network interfaces** and allows the **whole home folder** | **Avoid.** BrixoAI opens no ports (WN-2) | — |
| 10 | Claude subscription sign-in | `packages/adapters/src/pi-anthropic-oauth.ts`, `pi-oauth.ts` | Uses Claude Code's sign-in identity to obtain Claude Pro/Max tokens | — | Conflicts with Anthropic's terms ([INTEGRATIONS.md §2](./INTEGRATIONS.md#2-why-brixoai-cannot-embed-ai-on-your-subscription)) | **Avoid** | — |

## 4. Adopted pieces

| Candidate | BrixoAI destination | Approved by owner | Commit | Notes |
|---|---|---|---|---|
| — | — | — | — | **None yet** |

## 5. Open points
- [Assumption] `koffi` prebuilt binaries work in a packaged Electron app on Windows x64 (U5).
- [Unresolved] Whether to adopt candidates 1, 2, 4 and 5 or write equivalents. Decide per candidate during M1–M2 (P-5).
- [Recommendation] Re-check the Rakazo commit and licence at adoption time, since upstream changes daily.
