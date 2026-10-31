# BrixoAI — Decision Log

**Status:** Authoritative record of the project owner's decisions. Last updated 2026-10-29.
**Precedence:** where any other document in this repository conflicts with this log, this log wins. Other planning documents explain *how* these decisions are carried out.

**Labels used across the planning set**

| Label | Meaning |
|---|---|
| **[Decision]** | Explicitly decided by the project owner. Recorded here. |
| **[Verified]** | Checked against inspected code, repository content or official documentation on the date given. Re-check before relying on time-sensitive facts. |
| **[Recommendation]** | A professional proposal. Not decided until the owner approves it. |
| **[Assumption]** | Believed but not verified. Must be checked. |
| **[Unresolved]** | An open question. Listed in [ARCHITECTURE.md §9](./ARCHITECTURE.md#9-open-technical-questions) (technical) or in [§3 below](#3-pending-owner-decisions) (owner decisions). |

---

## 1. Current decisions

| ID | Date | Decision | Consequence in the planning set |
|---|---|---|---|
| DEC-01 | 2026-10-25 | **Primary audience: vibe coders**, including beginners who don't fully understand AI-generated code. Business owners are a possible future audience, not the MVP focus. | [PRODUCT.md](./PRODUCT.md) targets vibe coders only. |
| DEC-02 | 2026-10-25 | **MVP problem:** a Windows desktop app for beginner and intermediate vibe coders with a broken JavaScript/TypeScript project. It helps them understand the error, investigate safely, review proposed changes, approve before files change, verify where possible, and undo. Keep it narrow: no business-owner features, cloud hosting, GitHub integration, multiple languages or complex agent systems. The use case is a **hypothesis to validate**. | [PRODUCT.md](./PRODUCT.md), [ROADMAP.md](./ROADMAP.md) |
| DEC-03 | 2026-10-25 | **Foundation: Option B.** Build BrixoAI independently. Selectively reuse small Rakazo parts only after reviewing their code, licence, security and compatibility. Do not fork Rakazo. Copy no code before a specific part is reviewed and approved. Keep BrixoAI's own architecture and identity. | [REUSE.md](./REUSE.md) |
| DEC-04 | 2026-10-25 | **Architecture direction:** investigate a local-first Windows desktop app using Electron, React, Vite and TypeScript, with no mandatory WSL2. Keep unnecessary infrastructure out of the MVP. | [ARCHITECTURE.md](./ARCHITECTURE.md), [TECH_STACK.md](./TECH_STACK.md) |
| DEC-05 | 2026-10-25 | **Budget: $0** beyond the owner's existing Claude Code subscription. No Anthropic API charges or credits. No paid hosting, databases, services, domains or subscriptions. Prefer free/open-source tools and local storage. Don't enable paid services, create billable resources or assume free trials. **No unofficial authentication workarounds or bypassing provider restrictions.** | Embedded AI is excluded from the MVP (see DEC-06). Every cost conflict is listed in [TECH_STACK.md §4](./TECH_STACK.md#4-zero-extra-cost-conflicts). |
| DEC-06 | 2026-10-25 | **If no officially supported zero-cost way exists to use the owner's subscription inside BrixoAI, do not switch to API billing.** Instead, BrixoAI works **without embedded AI**: local project inspection, error explanation, safety checks, diff review, backups and undo. The user runs Claude Code separately for AI-assisted diagnosis. | No supported zero-cost path was found ([INTEGRATIONS.md §2](./INTEGRATIONS.md#2-why-brixoai-cannot-embed-ai-on-your-subscription), [Verified] 2026-10-25). The MVP is the **no-embedded-AI** design. |
| DEC-07 | 2026-10-25 | **No BrixoAI account or sign-in in the MVP.** Avoid authentication infrastructure unless validation shows it is essential. Email and GitHub sign-in stay possible future options. | No auth system in [ARCHITECTURE.md](./ARCHITECTURE.md). |
| DEC-08 | 2026-10-25 | **Security:** the proposed requirements are the **starting specification, not proof of safety**. Priorities: project-folder boundaries, blocked secret files, read-only investigation, explicit approval before changes, visible diffs, backups, undo, controlled command execution, cancellation, honest verification. Don't run untrusted project scripts or touch real projects without safety controls and explicit approval. Enforce security in application code, not just prompts. | [SECURITY.md](./SECURITY.md) |
| DEC-09 | 2026-10-25 | **Local data:** local storage for settings, session summaries and backups. 30-day history retention as a starting point, provided users can delete history and the behaviour is documented. No cloud storage. | [DATA_MODEL.md](./DATA_MODEL.md) |
| DEC-10 | 2026-10-25 | **UI and design:** don't return to Stitch and don't create a new design. Keep UI minimal and functional for the MVP. Validate the problem, architecture and safety workflow before polish. | [PRODUCT.md](./PRODUCT.md), [ARCHITECTURE.md](./ARCHITECTURE.md) |
| DEC-11 | 2026-10-25 | **AI engine for a future embedded-AI prototype:** the Claude Agent SDK is the preferred candidate, and the Pi-versus-SDK comparison is skipped. **Under DEC-05/DEC-06 it is not part of the MVP**, because the SDK requires API-key (or cloud-provider) authentication for third-party products, which means API billing. | Recorded in [INTEGRATIONS.md §3](./INTEGRATIONS.md#3-ai-options-and-their-status). |
| DEC-12 | 2026-10-29 | **Repository stays private** for now. Visibility is reconsidered only after the MVP direction, documentation, security approach and licensing are reviewed. The GitHub Actions allowance is not a reason to make it public. | CI must fit the private-repo free quota ([TECH_STACK.md §4](./TECH_STACK.md#4-zero-extra-cost-conflicts)). |
| DEC-13 | 2026-10-29 | **Documentation changes** are made on the planning pull request ([The-enlit-dev/BrixoAI#1](https://github.com/The-enlit-dev/BrixoAI/pull/1)), which stays a **draft**. Approved scope: the 9 `docs/planning/` documents, this log, `REUSE.md`, and short banners in `CLAUDE.md` and `docs/claude.md`. Later the same day, banners were also approved for the remaining older documents (`docs/DESIGN.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/SECURITY.md`, root `README.md`, `.github/PULL_REQUEST_TEMPLATE.md`). On 2026-10-30 the owner approved rewriting the bodies of `CLAUDE.md`, `docs/claude.md` and the root `README.md`. On 2026-10-31 the owner approved replacing the PR template's Stitch checkbox. No renames or archiving without asking. No merge, publishing or application code. | This update. |
| DEC-14 | 2026-10-25 | **Package manager: npm.** No broad package-manager migration based on Rakazo's setup. | [TECH_STACK.md](./TECH_STACK.md) |
| DEC-15 | 2026-10-25 | **Licence intent: Apache-2.0.** The LICENSE file is **not** created yet. That requires separate approval. | [REUSE.md §2](./REUSE.md#2-licence-and-attribution-rules) |

## 2. Status of the earlier decisions (round 1, recorded 2026-10-25)

| Earlier decision | Status now |
|---|---|
| D1 Local-first AI execution | **Kept**, refined: local-first desktop app (DEC-04). The MVP has no embedded AI (DEC-06). |
| D2 User-provided API keys; investigate free AI via OpenRouter and others | **Superseded for the MVP** by DEC-05/DEC-06: no API keys and no paid model access. Free and local model providers are **deferred** ([INTEGRATIONS.md §3](./INTEGRATIONS.md#3-ai-options-and-their-status)). |
| D3 Apache-2.0 | **Kept** as intent (DEC-15). No LICENSE file yet. |
| D4 New design direction; Stitch rejected | **Kept** (DEC-10). No design work for the MVP. |
| D5 npm | **Kept** (DEC-14). |
| D6 Email and GitHub sign-in eventually | **Kept as "eventually".** Not in the MVP (DEC-07). |
| D7 Native Windows, no mandatory WSL2 | **Kept** (DEC-04). |
| D8 Ask per task before uploading review information | **Kept and simplified.** The MVP uploads nothing to any BrixoAI service. Nothing leaves the device except what the user chooses to paste into their own tools ([SECURITY.md](./SECURITY.md) NP-1 to NP-3). |
| D9 Reconcile documentation before consolidating | **Kept.** This update is the reconciliation step. Consolidating or archiving older documents is a later, separately approved step. |
| D10 Next.js, Tailwind, shadcn/ui, Netlify, Supabase, Node helper (provisional) | **Revised:** Next.js, Netlify, Supabase and the separate helper are **not in the MVP**. Tailwind and shadcn/ui remain candidates for a minimal UI (DEC-04, DEC-10). |

## 3. Pending owner decisions

| ID | Question | Recommended default [Recommendation] |
|---|---|---|
| P-1 | Ask Anthropic in writing whether BrixoAI may launch or drive the user's own, unmodified Claude Code with their own subscription (unknown U1)? | Optional. Until there's a written answer, the option stays **blocked**. |
| P-2 | Further changes to older files outside `docs/planning/`, beyond the banners approved 2026-10-29 (see [README.md §4](./README.md#4-older-documents-and-recommended-follow-up-changes)) | Approve separately, file by file. No renames or archiving without asking. |
| P-3 | Revisit repository visibility (DEC-12) | After the MVP direction, docs, security approach and licensing are reviewed. |
| P-4 | When to add the Apache-2.0 LICENSE and NOTICE files | Before any code is shared outside the owner's account. |
| P-5 | Which Rakazo candidates to adopt ([REUSE.md](./REUSE.md)) | Decide per candidate after the code review in M1–M3. Each needs approval before copying. |
| P-6 | Whether the MVP reads git information at all (security unknown U7) | No git features in the first prototype. Revisit after U7 is resolved. |
| P-7 | Start implementation (milestone M1) | Separate explicit approval required. |
| P-8 | A future design direction | Deferred until validation results exist. |
