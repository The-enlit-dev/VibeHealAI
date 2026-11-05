# BrixoAI — Security Baseline

> **Update (2026-10-29).** The principles below still apply. The detailed, testable requirements for the current local desktop MVP are in `docs/planning/SECURITY.md`. Statements here about isolated cloud workers and server-side credentials reflect the earlier cloud design: the MVP has no server and stores no credentials. `docs/planning/DECISIONS.md` takes precedence over this file.
>
> **Name (2026-11-05):** the product was renamed from BrixoAI to **VibeHeal** (see DEC-28 in `docs/planning/DECISIONS.md`). The old name below is kept as written.

**Status:** required design and implementation principles, not a claim of security certification or completed controls.

## Identity and authorization
- Authenticate users and enforce server-side authorization for every workspace, project, run and integration operation.
- Apply least-privilege permissions to provider integrations.
- Make connected accounts and granted permissions visible; support disconnect and revocation.
- Do not rely on hidden UI controls as an authorization boundary.

## Secrets and sensitive data
- Keep credentials server-side and out of source control, browser storage, client bundles, prompts when avoidable, and logs.
- Use environment variables or a suitable secrets manager according to the chosen deployment environment.
- Commit only placeholder values in example environment files.
- Redact tokens and sensitive values from exceptions, task output and audit events.

## Untrusted repository execution
- Treat repository content, issue text, pull-request descriptions and external files as untrusted input.
- Never execute arbitrary repository commands on the main application server.
- Run checks in isolated, resource-limited workers with explicit time, CPU, memory, disk and network boundaries.
- Do not expose application credentials or broad provider tokens to untrusted build/test code.
- Validate paths and sanitize user-visible logs and rendered content.

## Approval and external side effects
- Separate suggestions from executed actions.
- Require explicit approval for merge, production publishing and production deployment.
- Record who approved a consequential action, what was approved and the provider's actual response.
- Verify external state before claiming an action succeeded.
- Make retries safe against duplicated side effects; support cancellation where possible.

## Reliability and auditability
- Use bounded retries and timeouts.
- Store task transitions and sanitized events sufficient to understand failures.
- Do not log secrets to make debugging easier.
- Report check results precisely; passing one check is not proof of total application correctness.

## Claims and compliance
Do not claim SOC 2 certification, a security audit, production-grade isolation, or compliance with a standard unless independently verified and actually achieved. Specific sandbox technologies, identity controls and compliance programs are future design choices, not current capabilities.
