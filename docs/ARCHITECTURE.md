# BrixoAI — Proposed Architecture

**Status:** conceptual guidance, not a selected or implemented stack. Inspect the repository and agree on the implementation plan before committing to technologies.

## 1. Architectural goals
- Keep the interactive workspace responsive while long-running tasks execute asynchronously.
- Separate user-facing UI, product logic, integration adapters and untrusted code execution.
- Make task progress and outcomes observable and auditable.
- Keep credentials and privileged operations server-side.
- Allow GitHub-only workflows; Netlify remains optional.
- Make each capability testable independently.

## 2. Logical components
### Web application
Owns navigation, project views, conversations, agent configuration, task history, findings and approval/review screens. It displays real backend state and must not imply that a click performed an action unless the server confirms it.

### Application/API layer
Authenticates users, enforces authorization, validates requests, manages projects and agent configurations, creates task records, and coordinates integrations. All privileged actions must be authorized server-side.

### Persistence layer
Stores users/workspaces, integration references, projects, agent configurations, run snapshots, task events, findings, change proposals and external action references. Choose the database and schema only after repository reconnaissance.

### Queue and scheduler
Dispatches long-running tasks outside the web request lifecycle. Scheduled triggers enqueue bounded runs and must not bypass the same authorization and approval checks as manual runs.

### Task orchestrator
Coordinates lifecycle, cancellation, bounded retries, timeouts, progress events, verification and failure handling. Retries must be idempotent or guarded against duplicated side effects.

### Integration adapters
Wrap provider operations such as GitHub repository listing, metadata reads, branch/PR operations and optional Netlify deployment reads. Normalize errors and permission checks; do not leak provider credentials to clients.

### Isolated execution worker
Runs approved, supported repository checks in a separate, resource-limited environment. It must not share unrestricted host access or secrets with untrusted repository code. Never run arbitrary repository commands on the main application server.

## 3. Core domain entities
Names are conceptual; final schemas should follow the chosen stack and reviewed migrations.
- **User / Workspace:** identity and ownership boundary.
- **Integration:** provider, external account/install reference, granted scopes and connection status. Never persist raw credentials in ordinary application records.
- **Project:** workspace, provider, repository identity and optional deployment association.
- **AgentConfig:** instructions, project scope, allowed tools, trigger, approval policy and execution limits.
- **TaskRun:** immutable configuration snapshot, initiating user/trigger, status, timestamps, cancellation and outcome.
- **TaskEvent:** timestamped progress and sanitized diagnostic event.
- **Finding:** severity, source, evidence and suggested next step.
- **ChangeProposal:** proposed patch, changed files, verification results and approval state.
- **ExternalAction:** type, provider reference, actor, approval evidence and result for auditability.

## 4. Task lifecycle
A run may use states such as:

queued → analyzing → checking → diagnosing → fixing → testing → proposing → pull_request_open → completed

Failure and cancellation can occur at safe transition points. Use only states that correspond to real operations in the implementation. Validate and persist each transition. Record when the run began and ended, what was attempted, checks and their actual results, and why a run failed or was cancelled. A state name alone is not proof that an external action succeeded.

## 5. Approval boundaries
- Repository metadata reads and read-only inspection can be allowed within granted integration permissions.
- Code changes should first be presented as a reviewable proposal and tested in isolation.
- Creating branches or pull requests must follow an explicit, documented authorization policy.
- Merge, production publish and production deployment always require explicit user approval.
- Verify the provider response and persist the external reference before showing success.

## 6. Security boundaries
- Enforce workspace/project authorization on every server-side operation.
- Use least-privilege provider permissions and support disconnect/revocation.
- Treat repository files, issue text, commit messages, logs and external content as untrusted data.
- Keep secrets out of prompts where possible, client bundles, task output and logs.
- Apply time, CPU, memory, storage and network limits to worker jobs.
- Restrict worker egress and credentials; never expose broad host credentials to repository code.
- Sanitize rendered markdown, logs and filenames.
- Audit approvals and external side effects without recording secrets.
- Use bounded retries, cancellation and deduplication for side-effecting actions.

## 7. Suggested implementation order
1. Inspect the repository and document its actual stack.
2. Establish core application shell and authenticated workspace boundaries.
3. Implement persistence and integration connection state.
4. Implement GitHub repository listing and read-only inspection.
5. Add task/run records and observable progress.
6. Add isolated check execution and honest result reporting.
7. Add change proposals, diff review and approval-gated pull requests.
8. Add optional Netlify read-only deployment visibility.

Do not treat this proposal as permission to install a particular database, queue, sandbox, or framework. Choose tools based on existing code, operational constraints and explicit implementation planning.
