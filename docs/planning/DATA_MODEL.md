# VibeHeal — Data Design (Planning v4)

**Status:** Last updated 2026-10-31.
- §1 to §7 describe the **desktop app's local data** for the core safety workflow. That design is proposed, and none of it is implemented yet.
- §8 is new and describes the **backend's integration data** [Decision DEC-18, DEC-20], which is **implemented** for local development.
- History: the earlier cloud (Supabase) database design is still not used. VibeHeal does not use Supabase or any hosted database for its own data (DEC-22). Supabase appears only as a provider users may connect.

Labels are defined in [DECISIONS.md](./DECISIONS.md).

---

## 1. Principles
- **Local only.** All data lives in VibeHeal's app data folder on the user's computer. No cloud storage, sync or accounts.
- **Minimal.** Store only what the workflow needs: settings, short session summaries, snapshots for undo, and an audit log.
- **Redacted.** Anything derived from project output is redacted before it is stored ([SECURITY.md](./SECURITY.md) SE-2, LD-3).
- **Deletable.** 30-day default retention, plus "delete this session" and "delete all history" [Decision DEC-09].
- **No secrets on the desktop.** The desktop app holds no provider credentials (CR-1) and never stores secret file contents (SE-1). Provider credentials live only in the backend vault (§8), encrypted.

## 2. Where data lives

[Assumption, unknown U6] Electron's per-user data folder, expected at `%APPDATA%\VibeHeal\` on Windows. Exact path and default permissions to be confirmed.

```text
%APPDATA%\VibeHeal\
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
    audit.log                   VibeHeal's own actions (redacted, rotated)
```

## 3. Records

| Record | Key fields | Retention |
|---|---|---|
| **Settings** | retention days (default 30), extra secret-file patterns, script timeout default, UI preferences | Until changed |
| **Project record** | local folder path, display name, last opened, detected facts (scripts, Node version requirement) | Until the user removes it or deletes all history |
| **Session** | id, project, timestamps, state ([ARCHITECTURE.md §3.1](./ARCHITECTURE.md#31-how-a-core-session-flows-planned-from-v3)), captured-error reference, explanation rule id (if matched), change-review result, verification result, user rating (optional) | 30 days |
| **Captured output** | redacted text, exit code, duration, whether it was cancelled or timed out | With its session |
| **Snapshot** | manifest (relative path, size, hash), file copies, excluded-path list | With its session. Deleted at the end of retention or on request |
| **Change review** | per file: added, modified, deleted, kept or undone, risk flags | With its session |
| **Handoff brief** | **not stored by default**. Only a note that a brief was copied, plus its redaction summary | With its session |
| **Audit log** | timestamp, action (run script, snapshot, restore, delete), outcome, no file contents | 30 days, rotated |

## 4. What is never stored
- Contents of secret files (`.env*` values, keys, certificates); see SE-1.
- API keys, tokens or passwords. VibeHeal has none to store.
- Anything belonging to the user's external AI tool (Claude Code keeps its own local data separately).

## 5. Snapshot scope [Recommendation]
- **Included:** source and config files inside the project folder that the user's tools are likely to change.
- **Excluded:** `node_modules`, `.git`, build outputs (`dist`, `.next`, `build`, …), very large files (limit to be measured, U8), and secret files. Changes to excluded secret files are **detected and warned about** but not backed up (SN-2).

## 6. Deletion and export
- **Delete this session:** removes its folder, including its snapshot.
- **Delete all history:** removes sessions, project records and logs. Settings are kept unless the user also chooses to reset them.
- **Export:** a redacted session summary as a text or JSON file the user saves themselves (LD-4, beta).

## 7. Internal interfaces (no network API)

For the core workflow there are no server routes (the backend API in [ARCHITECTURE.md §5](./ARCHITECTURE.md#5-backend-api) serves integrations only). The window talks to the main process through Electron's internal messaging only (WN-2). Proposed messages [Recommendation]: `selectProject`, `inspectProject`, `runScript`, `cancelScript`, `createSnapshot`, `diffAgainstSnapshot`, `restoreFiles`, `buildBrief`, `listSessions`, `deleteSession`, `deleteAllHistory`. Every message that touches files or runs commands goes through the Project Gate ([ARCHITECTURE.md §3](./ARCHITECTURE.md#3-components-and-responsibilities)).

## 8. Backend integration data (implemented 2026-10-31, local development)

### 8.1 Where it lives
The backend stores everything under `VIBEHEAL_DATA_DIR` (default `./.vibeheal-data/`, git-ignored). The directory is created with owner-only permissions and every file is written atomically with mode `0600` (on Windows the user profile's default permissions apply; see U6).

```text
.vibeheal-data/
  connections.json            connection records (no secrets)
  authorization-states.json   pending authorizations, keyed by SHA-256 of the state value
  approvals.json              pending/approved approvals for non-read actions
  credentials.json            encrypted credential records (AES-256-GCM)
  audit.jsonl                 append-only, redacted audit log
```

Each file sits behind a repository interface (`Collection`, `CredentialVault` and `AuditLog` in `server/storage/` and `server/credentials/`). A hosted backend would implement these on a database and a key-management service, with no changes to the services that use them (P-10, P-12).

### 8.2 Records

| Record | Key fields | Never contains | Retention |
|---|---|---|---|
| **Connection** | id, providerId, status (`connected`/`error`), externalAccountId (for example a GitHub installation id), accountLabel, grantedPermissions, credentialId (vault reference or null), connectedAt, updatedAt, manageUrl, lastError (safe code and message) | Tokens, secrets | Until disconnected |
| **Authorization state** | id = SHA-256(state), providerId, createdAt, expiresAt (10 minutes) | The raw state value | Removed when used; expired ones pruned on the next connect |
| **Approval** | id, connectionId, capabilityId, access level, SHA-256 of the canonical input, status, createdAt, expiresAt (5 minutes) | The input itself | Removed when used; expired ones are rejected |
| **Credential** | id, providerId, keyId, iv, auth tag, ciphertext, createdAt | Plaintext | Deleted on disconnect |
| **Audit entry** | id, at, action, outcome (`success`/`denied`/`failure`), providerId, connectionId, capabilityId, redacted message (500 characters max) | Credential values, provider response bodies | 30-day clean-up planned (AU-3, not implemented yet) |

### 8.3 What the desktop app receives
Only the API views in `shared/api.ts`:
- `ProviderSummary`, `ProviderDetail`, `ConnectionView`, `ActivityEntry`;
- results of read-only capabilities, which contain only whitelisted fields (IN-7).

The desktop keeps the local access token for the backend in `.env.desktop`, in the main process only. It holds no provider credentials.

### 8.4 GitHub specifically
- VibeHeal stores the installation id, the account login and the granted permissions.
- **No GitHub token is stored on disk.** Installation tokens last 1 hour, are minted on demand and are cached in memory only. The temporary user token from the install flow is revoked immediately.
- Commit author email addresses are not returned or stored.

### 8.5 Deleting
- **Disconnect** deletes the connection record and its vault entry, and attempts provider-side revocation.
- Deleting `.vibeheal-data/` removes all backend data.
- Changing `VIBEHEAL_ENCRYPTION_KEY` makes existing credentials unreadable. They fail closed, and the provider must be reconnected.
