# BrixoAI — Local Data Design (Planning v3)

**Status:** Proposed, last updated 2026-10-29. No data store exists. This file previously described a cloud (Supabase) database with server API routes. That design is **not used**: the MVP stores everything locally and has no server [Decision DEC-07, DEC-09]. Labels are defined in [DECISIONS.md](./DECISIONS.md).

---

## 1. Principles
- **Local only.** All data lives in BrixoAI's app data folder on the user's computer. No cloud storage, sync or accounts.
- **Minimal.** Store only what the workflow needs: settings, short session summaries, snapshots for undo, and an audit log.
- **Redacted.** Anything derived from project output is redacted before it is stored ([SECURITY.md](./SECURITY.md) SE-2, LD-3).
- **Deletable.** 30-day default retention, plus "delete this session" and "delete all history" [Decision DEC-09].
- **No secrets.** BrixoAI holds no credentials (SE-4) and never stores secret file contents (SE-1).

## 2. Where data lives

[Assumption, unknown U6] Electron's per-user data folder, expected at `%APPDATA%\BrixoAI\` on Windows. Exact path and default permissions to be confirmed.

```text
%APPDATA%\BrixoAI\
  settings.json                 user preferences
  projects.json                 recently opened project folders (local paths)
  sessions\
    <session-id>\
      session.json              summary, states, timestamps, results (redacted)
      output.txt                captured script output (redacted, size-capped)
      snapshot\
        manifest.json           path, size, SHA-256 hash for each backed-up file
        files\...               copies of in-scope project files
  logs\
    audit.log                   BrixoAI's own actions (redacted, rotated)
```

## 3. Records

| Record | Key fields | Retention |
|---|---|---|
| **Settings** | retention days (default 30), extra secret-file patterns, script timeout default, UI preferences | Until changed |
| **Project record** | local folder path, display name, last opened, detected facts (scripts, Node version requirement) | Until the user removes it or deletes all history |
| **Session** | id, project, timestamps, state ([ARCHITECTURE.md §4](./ARCHITECTURE.md#4-how-a-session-flows)), captured-error reference, explanation rule id (if matched), change-review result, verification result, user rating (optional) | 30 days |
| **Captured output** | redacted text, exit code, duration, whether it was cancelled or timed out | With its session |
| **Snapshot** | manifest (relative path, size, hash), file copies, excluded-path list | With its session. Deleted at the end of retention or on request |
| **Change review** | per file: added, modified, deleted, kept or undone, risk flags | With its session |
| **Handoff brief** | **not stored by default**. Only a note that a brief was copied, plus its redaction summary | With its session |
| **Audit log** | timestamp, action (run script, snapshot, restore, delete), outcome, no file contents | 30 days, rotated |

## 4. What is never stored
- Contents of secret files (`.env*` values, keys, certificates); see SE-1.
- API keys, tokens or passwords. BrixoAI has none to store.
- Anything belonging to the user's external AI tool (Claude Code keeps its own local data separately).

## 5. Snapshot scope [Recommendation]
- **Included:** source and config files inside the project folder that the user's tools are likely to change.
- **Excluded:** `node_modules`, `.git`, build outputs (`dist`, `.next`, `build`, …), very large files (limit to be measured, U8), and secret files. Changes to excluded secret files are **detected and warned about** but not backed up (SN-2).

## 6. Deletion and export
- **Delete this session:** removes its folder, including its snapshot.
- **Delete all history:** removes sessions, project records and logs. Settings are kept unless the user also chooses to reset them.
- **Export:** a redacted session summary as a text or JSON file the user saves themselves (LD-4, beta).

## 7. Internal interfaces (no network API)

There are no server routes. The window talks to the main process through Electron's internal messaging only (WN-2). Proposed messages [Recommendation]: `selectProject`, `inspectProject`, `runScript`, `cancelScript`, `createSnapshot`, `diffAgainstSnapshot`, `restoreFiles`, `buildBrief`, `listSessions`, `deleteSession`, `deleteAllHistory`. Every message that touches files or runs commands goes through the Project Gate ([ARCHITECTURE.md §3](./ARCHITECTURE.md#3-components-and-responsibilities)).
