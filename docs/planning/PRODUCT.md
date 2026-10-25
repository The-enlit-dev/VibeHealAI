# BrixoAI — Product Definition (Planning v2)

**Status:** Proposed. Nothing in this document exists as working software yet. The repository currently contains documentation only (no application code, no tests). See [README.md](./README.md) for how this planning set relates to the earlier documents in `docs/`.

**How to read the labels used across the planning set**

| Label | Meaning |
|---|---|
| **Verified** | Checked against official documentation during planning (October 2026). Still re-check before implementation, because vendors change things. |
| **Needs verification** | Plausible and based on research, but not confirmed from an official primary source. Must be checked before relying on it. |
| **Proposed** | A design decision we are recommending. Not built. Needs your approval. |
| **Unknown** | We do not know yet. A milestone includes a task to find out. |

---

## 1. Vision in one paragraph

BrixoAI is an open-source workspace where you work with **AI teammates** — named AI agents that each have a job, instructions and access to specific tools — and ask them to do real work, not just produce text. The first version focuses on one thing done well: **you pick a project folder on your own computer, describe a coding task in the web app, and an AI agent (running through Claude Code on your machine) does the work, asks your permission before anything risky, and reports back honestly.** Over time, BrixoAI grows into GitHub workflows, website publishing, reusable skills, memory, scheduled automations and eventually cloud computers that keep working when your laptop is closed.

> **Term — AI agent:** a program that uses an AI model to plan steps and call tools (read files, run commands, edit code) until a task is finished. A chatbot only answers; an agent acts.

> **Term — Claude Code:** Anthropic's coding agent. It can read and edit files and run terminal commands. BrixoAI will *use* it; BrixoAI is not Claude Code and must not be branded as Claude Code (see [INTEGRATIONS.md](./INTEGRATIONS.md#1-claude-code)).

## 2. Target users

| User | What they want | What they struggle with today | MVP priority |
|---|---|---|---|
| **Vibe coders** — people who build software mostly by instructing AI | Ask for a change, see it done, review it, ship it | Juggling terminals, losing track of what the AI changed, fear of the AI breaking things | **Primary (MVP)** |
| **Beginners** who want powerful AI without complicated setup | Guided setup, plain-English explanations, safe defaults | Jargon, API keys, terminals, unclear costs | **Primary (MVP)** — shapes every UX decision |
| **Business owners** who want repetitive digital work automated | "Update my site's blog weekly", "check my SEO", "summarise my inbox" | Most of these need browser access, many integrations and always-on scheduling | **Secondary** — served gradually from the Next phase onward |

Why business owners are not the MVP focus: almost everything they want requires **browser automation, third-party integrations and background scheduling** — the three hardest and riskiest capabilities. Building a reliable coding workflow first creates the foundation (tasks, approvals, logs, memory) those later features reuse.

## 3. The primary problem

AI coding tools are powerful but scattered and intimidating. A beginner using Claude Code in a terminal has:
- no single place to see **what the AI is doing right now**, what it **did**, and what it **wants permission** to do;
- no persistent **teammates** with saved instructions per project;
- no easy path from "code changed" to "pull request opened" to "website published";
- no clear picture of **cost**.

**BrixoAI's answer:** one calm web workspace that controls a trusted helper on your own computer, shows every step truthfully, asks before risky actions, and remembers your projects and preferences.

## 4. Main user journey (MVP)

1. **Sign up** on the BrixoAI web app.
2. **Install the BrixoAI Helper** (a small program for your computer) and **pair** it with your account by typing a short code shown in the terminal into the web app. (Pairing explained in [SECURITY.md](./SECURITY.md#3-local-helper-pairing-and-connection-security).)
3. In the helper, **choose which project folders** BrixoAI may access. Nothing else on your computer is shared.
4. **Connect your AI access** on your own machine: you provide your own Anthropic API key (stored in your computer's secure keychain, never sent to BrixoAI). See the auth discussion in [ARCHITECTURE.md](./ARCHITECTURE.md#6-claude-authentication-modes).
5. In the web app, **open a project** and type a task: *"Add a contact form to the homepage and make the tests pass."*
6. Watch **live progress**: files read, commands run, edits made — each shown as a real event from the helper, never invented.
7. When the agent wants to do something sensitive (run a command not on the safe list, edit outside the project, use the network), BrixoAI shows an **approval card**. You approve or deny.
8. You can **cancel** at any time.
9. When finished, you see a **summary**, the **files changed (diff)**, the **checks that actually ran** and their results, and the **estimated cost** where available.
10. The task is saved in **task history**.

Later journeys (not MVP): open a GitHub pull request from the result (M5), deploy to Netlify (M8), save the agent as a reusable teammate with skills and memory (M4, M6, M7), run it on a schedule (Later).

## 5. Inspired by Grok Bot — without copying

- BrixoAI is **inspired by the capability set you described** for Grok Bot: persistent AI teammates, computer/browser access, coding, publishing, integrations, memory, skills and automations.
- **We have not independently verified Grok Bot's actual features, design or implementation.** The planning set treats your feature list (Section 6) as the requirements, not anything copied from another product.
- BrixoAI will **not** copy proprietary source code, names, logos, screenshots, UI layouts, copywriting, icons or other protected design assets from Grok Bot or any other product.
- BrixoAI's visual design comes from **your own Stitch screens** (pending — see [../DESIGN.md](../DESIGN.md)).
- Generic ideas (chat + agents + approvals + task history) are common industry patterns and are fine to build independently.

## 6. Feature classification

**Columns:** *Phase* — **MVP** (milestones M0–M4), **Next** (M5–M9), **Long-term** (Later). *Dependencies* point to other features or milestones in [ROADMAP.md](./ROADMAP.md).

### A. AI teammates and conversations

| Feature | Phase | Why | Dependencies |
|---|---|---|---|
| Named agents with job, instructions, preferences, project context | **MVP (M4)** | Core identity of the product; cheap once tasks work | Tasks (M3), `agents` + `agent_versions` tables |
| Persistent conversations | **MVP (M4)** | Needed to give follow-up instructions | Tasks, Claude session resume |
| Useful long-term memory | **Next (M7)** | Valuable but easy to get wrong (stale or leaked facts). Needs editing/deletion UI first | Conversations, memory review UI |
| Text and code input | **MVP (M3)** | The basic task input | — |
| Image/screenshot input | **Next (M5–M6)** | Very useful for UI fixes; needs upload storage and passing images to the agent (needs verification of the best supported method) | Supabase Storage, attachments |
| Document input (PDF etc.) | **Next** | Same plumbing as images | Attachments |
| Voice input | **Long-term** | Nice-to-have; browser speech APIs vary | Stable chat UX |
| Model choice from supported providers | **MVP (M4), Claude only** | The helper can list models the runtime supports (needs verification of exact SDK method). Other providers later | Helper, Claude auth |
| Configurable effort (where supported) | **MVP (M4) if exposed by the runtime** | Claude Code supports an effort setting (`/effort` accepts a value in `-p` mode — Verified). SDK option name needs verification | Helper |
| Progress, cancellation, errors, approvals, task history | **MVP (M1–M3)** | This is the trust foundation of the product | Helper, Realtime |
| Shared workspace for agents and projects | **MVP (single user)**; multi-user **Long-term** | Data model includes `workspaces` from day one so teams can be added later without migration pain | Auth, RLS |

### B. Computer and browser capabilities

| Feature | Phase | Why | Dependencies |
|---|---|---|---|
| Local helper with user-selected folders | **MVP (M1–M3)** | Local-first means low cost and the user's code stays on their machine | Pairing, folder allowlist |
| Claude Code integration via supported methods | **MVP (M1)** | Through the official Claude Agent SDK using the user's own credential — Verified as a supported pattern | Helper |
| Terminal and file access with permissions | **MVP (M1)** | Delivered via Claude Code's built-in tools + permission system + BrixoAI approvals | Helper, approvals |
| Browser access for approved website tasks | **Long-term** (experiment in Next) | High risk (logins, payments, prompt injection from web pages). Could start with a Playwright MCP server in a sandbox. Needs separate security review | MCP (M9), security review |
| Isolated, persistent cloud computers | **Long-term** | Costs real money per hour and needs strong isolation. Options listed in [TECH_STACK.md](./TECH_STACK.md#7-background-tasks-scheduling-and-future-cloud-workers) | Stable task model, billing decisions |
| Clear separation of local vs cloud execution | **MVP (design), Long-term (cloud)** | Every task records *where* it runs (`execution_target`) from day one | Data model |

### C. Vibe-coding features

| Feature | Phase | Why | Dependencies |
|---|---|---|---|
| Code inspection, editing, debugging, testing | **MVP (M3)** | What Claude Code already does well | Helper |
| Local diff view of changed files | **MVP (M4)** / **Next (M5)** | Users must see what changed. Uses local `git diff` | Git installed locally |
| Branches and commits (local) | **Next (M5)** | Side effect on the user's repo, so it needs approval UX | Approvals |
| GitHub repo connection + pull requests | **Next (M5)** | Requires GitHub App setup and token security | GitHub App, encrypted token storage |
| Code review agent | **Next (M5)** | A preset agent + skill; reuses tasks | Agents, skills |
| Screenshot-based UI/UX help | **Next** | Needs image input | Attachments |
| Figma integration | **Long-term** | Official API + MCP server exist (needs verification of current access terms) | MCP (M9) |
| Stitch integration | **Long-term** | We have not found a confirmed public API for Stitch — **Unknown**. For now, the user exports screens manually | Research |
| Documentation agent (PRD, specs, test plans) | **Next (M6)** | A preset agent + built-in skill. Cheap once skills exist | Skills |
| Tech-stack recommendation agent | **Next (M6)** | Same as above | Skills |
| SEO / GEO / AEO agent | **Next (M6)** (on-page checks of a local project) | Works on files the agent can read | Skills |
| Google Search Console integration | **Long-term** | OAuth with Google, sensitive scopes, app verification may be needed | Integrations framework |

> **Terms:** **SEO** = search-engine optimisation. **GEO** = generative-engine optimisation (being cited by AI answer engines). **AEO** = answer-engine optimisation (structuring content to be picked as a direct answer). GEO and AEO are emerging practices without official standards.

### D. Skills and extensibility

| Feature | Phase | Why | Dependencies |
|---|---|---|---|
| Built-in skills library | **Next (M6)** | Claude Code natively supports skills as `SKILL.md` files (Verified), so BrixoAI can write skill files the helper passes to the agent | Helper, agents |
| User-created skills (name, description, instructions) | **Next (M6)** | Same mechanism | Skills UI |
| Import skills from GitHub repos | **Next (M6, late)** | Imported skills are untrusted instructions — they need review before enabling | Security review UI |
| Skill versions, permissions, validation, enable/disable | **Next (M6)** | `skill_versions` table; agents pin a version | Data model |
| MCP support for compatible external tools | **Next (M9)** | The SDK supports MCP servers (Verified). Each server is a new trust boundary | Approvals, security review |
| Integration directory | **Long-term** | Needs a curated, reviewed list | MCP |

> **Term — MCP (Model Context Protocol):** an open standard that lets AI agents use external tools through a common plug format. Think of it as "USB for AI tools".

### E. Website publishing

| Feature | Phase | Why | Dependencies |
|---|---|---|---|
| Sites section | **Next (M8)** | Lists sites linked to projects | Projects |
| Deploy via the user's existing hosting account | **Next (M8)** | User pays their own hosting; BrixoAI never hosts user sites in the MVP | Netlify OAuth/token |
| Netlify as first provider | **Next (M8)** | Official deploy API exists (Verified via Netlify docs search; re-check details) | Encrypted token storage |
| Deploy logs, status, preview and live URLs | **Next (M8)** | Shown only from real Netlify API responses | Netlify integration |
| More providers, custom domains | **Long-term** | Each provider = new integration to maintain | Integrations framework |
| BrixoAI-managed subdomains | **Long-term** | Means BrixoAI becomes a host: abuse handling, costs, legal terms. Defer | Business decision |

### F. Memory, workflows and automations

| Feature | Phase | Why | Dependencies |
|---|---|---|---|
| Project memory and summaries | **Next (M7)** | Must be visible, editable and deletable | Conversations |
| User-editable preferences / stored instructions | **MVP (M4)** as agent instructions; richer in **M7** | Simple text fields first | Agents |
| Reusable workflows | **Long-term** (skills cover the basics in M6) | A workflow engine is a big build | Skills, tasks |
| Daily/hourly scheduled tasks | **Long-term** | Needs a reliable always-on runner. Locally only works while the computer is on and the helper is running | Scheduler, limits, monitoring |
| Multi-agent coordination | **Long-term** | Complex, costly, hard to debug. Claude Code subagents exist and may be used inside a single task earlier | Stable single-agent flow |
| Background execution with laptop closed | **Long-term** | Requires a cloud worker | Cloud worker decision |

### G. Dashboard and quality of life

| Feature | Phase | Why | Dependencies |
|---|---|---|---|
| Minimal dashboard: projects, recent activity, task progress, connected services | **MVP (M3–M4)** | Shows real data only | Tasks |
| Usage/token reporting | **MVP (M4)** | The runtime reports token usage and an estimated cost per run (`total_cost_usd` — Verified as a *client-side estimate*) | Helper |
| Transparent estimated API cost | **MVP (M4)**, labelled "estimate" | Must say clearly it may differ from the bill | Usage records |
| Progress reports and completed-task summaries | **MVP (M3)** | The agent's final message + list of real events | Tasks |
| Time-saved estimates | **Long-term** | Must explain the formula; easy to mislead. Needs real usage data first | Usage history |
| Music integration | **Long-term / optional** | Unrelated to the core value | — |
| Offline capabilities | **Long-term / optional** | The helper needs the AI provider online anyway; only UI caching is realistic | — |

## 7. MVP scope

**MVP = milestones M0–M4** in [ROADMAP.md](./ROADMAP.md).

Included:
1. Web app with sign-in, a projects list, a task view with live progress, approvals, cancellation, task history and a minimal dashboard. Provisional UI until the Stitch screens arrive.
2. BrixoAI Helper (a command-line program) for macOS, Linux and Windows via WSL2. Native Windows support depends on decision D7 in [README.md](./README.md#decisions-that-need-your-approval), because Claude Code's command sandbox is not available there (Verified).
3. Secure pairing between helper and account, with revocation.
4. Folder allowlist; Claude Code execution through the official Agent SDK using the user's own Anthropic API key.
5. Named agents with instructions, model choice and an agent-version snapshot per task.
6. Conversations (follow-ups on the same task session).
7. Token and estimated-cost display.

## 8. Explicit MVP exclusions

- GitHub pull requests, Netlify deploys, skills, MCP, long-term memory: Next phase.
- Browser automation, cloud computers, scheduling, multi-agent, voice, integrations directory: Long-term.
- Billing, paid plans, teams and organisations.
- Hosting user websites on BrixoAI infrastructure.
- BrixoAI paying for users' AI usage. This is **not allowed** under Anthropic's terms for products that run Claude Code: each user must use their own credential (Verified — see [INTEGRATIONS.md](./INTEGRATIONS.md#1-claude-code)).
- Offering "Sign in with Claude.ai" inside BrixoAI. **Not permitted** for third-party apps (Verified).
- Native desktop app (Electron/Tauri). The helper starts as a CLI; packaging comes Later.
- Any feature that would display fake activity, logs or success.

## 9. Success metrics

Early-stage metrics (measured honestly, with consent, with privacy-respecting analytics or manual tracking):

| Metric | Target for first 10–20 test users | How measured |
|---|---|---|
| Time from sign-up to first completed task | < 20 minutes, with the beginner guide | Timestamps: account created → first `succeeded` task |
| Setup completion rate | ≥ 70% reach a paired helper | Count `devices` rows per user |
| Task success rate (user-judged) | ≥ 60% of tasks marked "useful" by user | Thumbs up/down on the task result |
| Unapproved sensitive actions | **0** | Audit log review; security tests |
| Honest reporting | 0 cases of UI showing an action that did not happen | Bug reports, e2e tests |
| Cancellation reliability | 100% of cancels stop the run within 10 s | e2e test + manual test |

## 10. MVP acceptance criteria

The MVP is accepted when **all** of these are true and demonstrated on a real machine:

1. A new user can sign up, install and pair the helper, allowlist a folder and add their API key by following [BEGINNER_GUIDE.md](./BEGINNER_GUIDE.md) without help.
2. The user can submit a coding task in the web app; the helper runs it; live events appear within ~2 s of happening on the machine.
3. A tool call that needs approval pauses the task (`awaiting_approval`). Approving continues it; denying blocks that action. No response within the timeout counts as deny.
4. Cancel stops the agent and marks the task `cancelled`.
5. If the helper is offline, the UI says so, and the queued task expires with a clear message instead of hanging forever.
6. The final result shows a summary, the real changed files, the commands that ran with exit status, and estimated cost labelled as an estimate.
7. One user cannot read or change another user's projects, tasks or devices (automated row-level security tests pass).
8. No API key, token or secret appears in the database, the logs or the browser (automated redaction tests + manual check).
9. Named agents can be created, edited and selected; each task records which agent version it used.
10. Every milestone's listed tests pass in CI.
