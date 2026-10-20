# BrixoAI — Product Requirements Document

**Status:** MVP planning  
**Product type:** AI-powered website operations and developer workspace  
**Implementation status:** Requirements only; features described here are not claims of existing functionality.

## 1. Product vision
BrixoAI helps developers operate and maintain websites through an interactive AI coding workspace and configurable agents that can perform defined tasks in the background. Instead of repeatedly prompting an AI to inspect a project, users can create an agent, assign it to a project, configure its tools and permissions, schedule its work, and review its results. The product combines conversational development, persistent agent configuration, project integrations, background execution and human-reviewed changes.

## 2. Target users
- Solo developers and indie hackers.
- Vibe coders building websites with AI.
- Student developers and early-stage founders.
- Small teams maintaining a limited number of web projects.

The initial experience should be approachable for beginners while retaining the clarity and controls expected by experienced developers.

## 3. Core user journey
1. User opens BrixoAI and sees the dashboard.
2. User connects GitHub and authorizes access.
3. User selects a repository and reviews detected project information.
4. User starts a conversation or creates a configurable agent.
5. User chooses an agent's instructions, tools, project, trigger and permission level.
6. The agent runs an allowed task and records its progress.
7. The user reviews findings, logs, checks and any proposed changes.
8. If code changes are proposed, the user reviews the diff and approves the appropriate next action.
9. The task history records the outcome.

Netlify is optional. Core GitHub repository inspection must not depend on a Netlify connection.

## 4. MVP scope

### P0 — Essential foundations
- Premium, responsive application shell.
- Dashboard and navigation.
- Projects list and project details.
- AI chat workspace UI.
- Agent list and create/edit agent UI.
- Integration management UI.
- Activity and task history UI.
- Code review and approval UI.
- Clear loading, empty, disconnected, error and permission states.
- Reusable design system based on approved Stitch references.

### P1 — First working integrations
- GitHub authorization using an appropriate, least-privilege integration.
- Repository listing and selection.
- Read-only repository inspection.
- Detection of supported project metadata and available scripts.
- A task model with explicit status, logs and results.
- Real build, lint or test execution for supported projects, using an isolated worker.
- Visible findings and verification results.

### P2 — Controlled code changes
- Generate a proposed patch for a supported issue.
- Review changed files and code diffs.
- Execute relevant checks in isolation.
- Create a separate branch and, after explicit approval, a pull request.
- Track pull-request status and task outcome.

### P3 — Deployment visibility
- Optional Netlify authorization.
- Site selection and repository association.
- Display actual deployment status and preview URLs when available.
- Require explicit approval for production-impacting actions.

Do not implement future phases as fake functionality just to make the interface look complete.

## 5. Agent requirements
Each saved agent should support:
- Name, icon and description.
- Role instructions.
- Assigned project or an explicitly defined project scope.
- Enabled tools.
- Trigger: manual first, then supported schedules and events.
- Permission level and approval policy.
- Execution limits and retry limits.
- Notification preferences.
- Active or paused state.
- Run history and last result.
- Edit, duplicate, pause, resume and delete actions.

An agent is a reusable configuration, not a continuously running process by default.

Suggested examples:
- **Code Doctor:** inspect issues and propose code fixes.
- **Blog Manager:** draft content and prepare changes for review.
- **Performance Watcher:** inspect available performance information and suggest improvements.

These are examples of configurable agents, not separate products.

## 6. Chat workspace requirements
The chat workspace should provide:
- Conversation history, project selector and agent selector.
- Message composer and attachment/context controls where supported.
- Readable code blocks and visible tool activity/progress.
- File-change summaries and actual test results.
- Proposed-change review.
- Links to real branches and pull requests when available.

Distinguish explanatory AI responses from actual tool executions. Do not display invented terminal output or fabricate successful actions.

## 7. Project requirements
A project should show, where information is actually available:
- Repository name and owner.
- GitHub connection state.
- Primary language and framework.
- Default branch.
- Assigned agents.
- Recent tasks and findings.
- Latest checks.
- Connected deployment provider and status.

Unknown information should be shown as unknown or unavailable, not guessed.

## 8. Background task requirements
Each run should record:
- Agent and project, and trigger source.
- Start time, completion time and current status.
- Progress events and sanitized logs.
- Findings and checks attempted with their results.
- Proposed changes and pull-request reference when created.
- Failure or cancellation reason.

The system must support bounded retries and cancellation where safe. Retries must not duplicate external side effects.

## 9. Integrations

### GitHub
- Authorize access securely and list repositories available to the installation or user.
- Display granted permissions and allow users to select/disconnect repositories.
- Read project metadata and run supported checks.
- Create branches and pull requests only through the implemented, authorized workflow.

### Netlify
- Optional connection.
- Display authorized sites and actual deployment information.
- Associate a site with a project where possible.
- Do not require Netlify for GitHub-only functionality.

### Future integrations
Vercel and other services may appear as clearly labelled future integrations, but must not be presented as operational.

## 10. Safety and trust requirements
- Use least-privilege permissions.
- Keep secrets server-side and redact them from logs.
- Isolate untrusted repository execution.
- Enforce resource and time limits.
- Do not execute arbitrary repository commands on the main application server.
- Never merge, publish or deploy to production without explicit approval.
- Keep an audit trail for meaningful external actions.
- Show whether an action is proposed, awaiting approval, running, verified or failed.
- Treat a passing check as evidence for that check, not proof that the entire application is flawless.

## 11. Non-goals for the initial MVP
- Fully autonomous production deployments.
- Unrestricted agents with arbitrary machine access.
- Complex multi-agent swarms.
- Billing and paid plans.
- Enterprise organization administration.
- Supporting every language and framework.
- Guaranteeing that AI-generated fixes are always correct.

## 12. Success criteria
The MVP is successful when a user can:
1. Understand the product and navigate its core screens.
2. Connect a supported GitHub repository.
3. Inspect the repository and see genuine check results.
4. Create, edit, pause and resume an agent configuration.
5. Launch and track a task.
6. Review findings and proposed changes.
7. Approve a clearly defined next action without bypassing safety controls.
8. Understand failures and verify what did or did not happen.

## 13. Definition of done
A feature is complete only when its intended behavior works, relevant states are handled, errors are understandable, permissions are respected, and applicable checks have been run.

A polished mockup is not proof of backend functionality. An API response is not proof that an external side effect succeeded. Report limitations honestly.
