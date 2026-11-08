# VibeHeal Feature Roadmap: the safe agent platform

**Status:** written 2026-11-08 and revised the same day from the owner's feature list and answers. Decisions: DEC-33 (Agent Relay), DEC-34 (staged AI), DEC-35 (hybrid safe agent platform) and DEC-36 (reviewed marketplace and Pro cloud) in [DECISIONS.md](./DECISIONS.md). **Nothing in this document is built.** Each milestone needs its own owner approval before work starts, as CLAUDE.md requires.

Labels follow [DECISIONS.md](./DECISIONS.md): **[Decision]** the owner decided; **[Recommendation]** proposed, not yet decided; **[Unresolved]** open question.

---

## 1. Owner decisions behind this roadmap (2026-11-08)
- **[Decision] Hybrid: a safe agent platform (DEC-35).** Anyone can build and run agents (in plain words, with blocks, or by talking), with a marketplace, integrations and ready-made automation agents. **Safety by design is the core promise and the differentiator.** The vibe-coder safety net stays the first, flagship use case.
- **[Decision] "Agent calling" means agents calling agents** (DEC-33): role-based agents pass work to each other, and VibeHeal referees every step.
- **[Decision] The automation list is product features:** ready-made agents users get (section 6).
- **[Decision] Marketplace: reviewed and sandboxed (DEC-36).** Anyone may publish. Every agent is reviewed and signed, declares its permissions up front, and runs sandboxed.
- **[Decision] AI in three stages (DEC-34):**
  1. Bring your own agent ($0 for us).
  2. Bring your own API key, the free plan's AI ($0 for us).
  3. A paid built-in AI later.
- **[Decision] Pro cloud is designed now and built later (DEC-36).** Agents that keep running while the laptop sleeps need servers, so they are built only once Pro pricing covers the cost. Until then everything runs on the user's computer.

---

## 2. Competitor snapshot
Researched 2026-11-08. Most sources are third-party write-ups that disagree on numbers (stars, skill counts, dates), so treat every figure as approximate and re-check primary sources before quoting them publicly.

| Product | What it is | Strength | Gap VibeHeal can own |
|---|---|---|---|
| **Hermes Agent** (Nous Research, MIT licence) | A self-improving general agent that runs persistently on your machine or server. Reachable from Telegram, Discord, Slack and WhatsApp. Uses Nous Portal or your own API keys. | Persistent local memory, skills it creates for itself, a very large community. | General purpose. Nothing guarantees that a change it makes to your project is reviewed, tested or reversible. |
| **OpenClaw** (formerly Clawdbot, MIT licence) | A local personal agent controlled mainly from chat apps. Runs shell commands. Thousands of community skills on ClawHub. | Reach (many chat apps) and a big skill ecosystem. | Every action runs with the machine's full credentials, and open community skills are a supply-chain risk. No safety net for your project. |
| **Grok Bot** (xAI, launched August 2026) | An always-on cloud team of named AI "coworkers" with roles, automations and MCP connectors. | Multi-agent roles that keep working while you are away. | Closed, paid and cloud-only: your code and keys live on their machine. More autonomy, but no independent supervisor. |
| **Dot** | New Computer's Dot (a memory-focused AI companion) shut down in October 2025. An unrelated "Dot" personal-assistant app now uses the name. | Memory and companionship. | Not a coding tool. |

**The gap:** all of these can *act*, and the open ones (Hermes, OpenClaw) run with the whole machine's access. None is built so that you choose exactly what an agent can touch, see every action before it matters, and undo it afterwards. Multi-agent products add autonomy; nobody adds a referee.

Sources (accessed 2026-11-08):
- Hermes Agent: [hermes-agent.org/about](https://hermes-agent.org/about/), [dupple.com: What is Hermes Agent](https://dupple.com/learn/what-is-hermes-agent), [heyuan110.com review](https://www.heyuan110.com/posts/ai/2026-04-14-hermes-agent-guide)
- OpenClaw: [agentic-ai.readthedocs.io: OpenClaw](https://agentic-ai.readthedocs.io/en/latest/AgentPlatforms/openclaw/), [Herond: complete guide](https://blog.herond.org/what-is-openclaw-the-complete-guide-to-the-viral-open-source-ai-agent/), [DEV: set up OpenClaw](https://dev.to/kfuras/set-up-openclaw-as-your-personal-ai-agent-in-2026-h5o)
- Grok Bot: [xAI news](https://x.ai/news), [mem0: Grok Bot guide](https://mem0.ai/library/llms-and-models/grok-bot-guide)
- Dot: [Product Hunt: Dot by New Computer](https://www.producthunt.com/products/dot-3f3fdbab-5039-4dd7-9ae5-4303c4b11995/launches/dot-by-new-computer), [App Store: Dot - AI Personal Assistant](https://apps.apple.com/us/app/-/id6758647775)

---

## 3. Positioning [Decision, DEC-35]
**"Agents you can trust with your stuff."** VibeHeal lets anyone build and run agents, and makes them safe by design.
- **You choose what an agent can touch.** Pick a file or folder (and a website or account); the agent cannot see or change anything else. That is enforced by the app, not by a prompt.
- **You see everything first.** Sensitive actions (sending, publishing, deleting, paying, installing) wait for your approval. Changes get a snapshot and a one-click undo.
- **Your private data stays on your laptop.** Keys go in the operating system's keychain, data stays local, and it works offline with local models where possible.
- **Bring your own AI.** Use Claude Code, Codex, local models or your own API key. No AI bill from us on the free plan.
- **For vibe coders first:** the safety net for AI-built projects (snapshots, review, tests, undo, Heal) is the flagship use case.

The catch line stays **"Just vibeheal it."**

---

## 4. The safety model (applies to every feature) [Recommendation]
1. **Permission manifest:** every agent (built-in, user-made or from the marketplace) declares exactly what it needs: folders, files, websites, accounts, tools, and whether it can send or publish. The user sees it in plain words before the first run.
2. **Scoped access:** the user picks the files and folders an agent may use. The runtime blocks everything else (deny by default), including reads.
3. **Sandboxed runs:** each agent runs in a separate process with no network access except the hosts in its manifest. Code-changing agents work in an isolated git worktree.
4. **Approval gates:** sending email, posting, publishing, uploading, deleting, paying and installing always ask first, unless the user turns on auto-approve for that one agent and that one action, with limits.
5. **Snapshots and undo:** taken before every change to files.
6. **Local vault:** secrets live in the OS keychain, never in the UI process, logs or prompts. Secrets are redacted from everything sent to a model.
7. **Activity log:** every action, tool call and agent-to-agent message, viewable in the dashboard.
8. **Kill switch:** one click stops every agent.

---

## 5. Agent calling: the Agent Relay
A local orchestrator in the desktop app runs a **relay** of role-based agents on one task. VibeHeal is the referee between every step.

| Step | Who | What happens |
|---|---|---|
| 1. Brief | VibeHeal | Builds the handoff brief: the captured error, recent changes, project facts and project memory. Secrets are redacted. |
| 2. Fix | **Fixer** agent | Works in an **isolated git worktree**, never in the real project folder. |
| 3. Review | **Reviewer** agent (ideally a different vendor or model) | Reads the Fixer's diff against the brief. It can **send the work back** to the Fixer with notes, up to a set number of rounds. |
| 4. Test | **Tester** (VibeHeal's script runner) | Runs the project's own checks: test, build, lint. Real results decide "done", not an agent's claim. |
| 5. Approve | **You** | See the diff, the review notes and the check results. Approve to apply the change to the real project, or reject and roll back. |

**The referee (VibeHeal itself, not an AI) enforces the rules at every step:**
- a snapshot before each step;
- diff-size limits;
- protected paths (`.env`, lockfiles, CI config) need approval;
- no new dependencies, network or deploy commands without approval;
- secrets redacted from everything sent to an agent;
- every agent-to-agent message logged and shown.

**Why it wins:**
- **Mixing vendors catches more:** agents from different vendors check each other, which reduces single-model blind spots.
- **Proof, not trust:** the Tester's real results are the gate.
- **Always recoverable:** worktrees and snapshots make every step reversible.
- **Works under the competitors:** VibeHeal can supervise changes that Hermes, OpenClaw or any other agent makes to a project (feature F4).
- **Not only code:** the same relay pattern works for any agent. For example, a Blog writer drafts, an SEO checker reviews, and you approve.

---

## 6. Feature list [Recommendation]

### Foundations (build first; everything depends on them)
- **F1 Safety core:** Project Gate, script runner, snapshots and undo, change review, handoff brief (milestones M1–M4).
- **F2 Permission system:** the manifest, folder and file picker, deny-by-default runtime, approval gates and kill switch (section 4). *Owner items: "better permissions", "select a file/folder that is what is accessed".*
- **F3 Local vault and private data:** OS keychain, local storage, redaction. *Owner item: "private info stored on laptop".*
- **F4 Supervise other agents:** watch folders that any agent (Hermes, OpenClaw, Claude Code) edits; auto-snapshot, flag risks, offer undo.
- **F5 Claude Code permission notifications:** a VibeHeal notification (desktop now, phone later) when Claude Code is waiting for permission or has finished. It uses the hooks the user installs in their own Claude Code settings; VibeHeal does not drive Claude Code. A quick, $0 win. **[Unresolved]** confirm the hook events in Claude Code's current documentation before building.

### Agent runtime
- **F6 Agent calling (Agent Relay):** section 5.
- **F7 Tool calling:** agents call tools through the Model Context Protocol (MCP) and VibeHeal's built-in tools (files, browser check, HTTP, email draft, and so on). Each tool is permission-gated and logged.
- **F8 Bring your own agent or API:** connectors for local AI tools (stage 1). User API keys (Anthropic, OpenAI, OpenRouter) are the free plan's AI (stage 2, P-16 security review first). The Claude Code connector waits for P-1.
- **F9 Offline mode:** where possible, runs with local models (Ollama) and local speech, with no internet. Features that need the internet (email, publishing) are marked as such.

### Building and talking to agents
- **F10 Make an agent in plain words:** describe it ("every Monday, check my site's SEO and email me a summary"). VibeHeal drafts the agent, its permission manifest and schedule, and shows them for approval before saving.
- **F11 Block builder:** a Scratch-style editor (for example Google's open-source Blockly) where triggers, steps, tools and approvals are blocks. Plain-words agents open in it for editing.
- **F12 Talk to the bot:** voice in and out. Local speech-to-text (such as whisper.cpp) and the operating system's text-to-speech come first, for $0 and offline use.

### Workspace
- **F13 Dashboard:** agents, runs, approvals waiting, schedules, an activity log, and each agent's permissions in one place.
- **F14 Integrations:** the existing first-party marketplace (GitHub built; Vercel, Netlify, Supabase, Figma, Stripe, Shopify, Notion and Slack planned), read-only first. Adds email, YouTube and other channels the automation agents need, each with the user's own login (OAuth) and approvals.
- **F15 Apps inside the app:** sandboxed mini-apps in a side panel, starting with music (Spotify through its official player and Web API, with the user's own account). Each mini-app has a permission manifest like an agent.
- **F16 Agent marketplace:** reviewed, signed and sandboxed (DEC-36).
  - Publishers declare permissions, and VibeHeal reviews them before listing.
  - Updates are re-reviewed, and listings show the permissions in plain words.
  - The ready-made agents in section 7 launch there first.

### Plans and cloud
- **F17 Free plan:** runs on the user's computer with their own agent or API key.
- **F18 Pro cloud (paid, built later):** agents keep running while the laptop sleeps.
  - The same permission manifest applies.
  - Secrets go to the cloud only with the user's explicit consent.
  - **[Unresolved] P-17:** needs pricing, hosting, accounts and billing decisions before it is built.

---

## 7. Ready-made automation agents (product features) [Recommendation]
Each one is a first-party marketplace agent with a permission manifest. Anything that sends, posts or publishes asks for approval by default.

| Agent | What it does | Permissions and safeguards |
|---|---|---|
| **SEO, GEO and AEO checker** | Audits a website for search engines and AI answer engines: titles, meta tags, structured data, sitemaps, robots, llms.txt, headings, broken links, speed hints. Produces a fix list, and can fix pages in a chosen folder with approval. | Reads the site URL; writes only in a chosen folder. Reuses the checks already built for vibeheal.online (`scripts/build-site.test.ts`). |
| **Blog writer** | Drafts posts from a topic or notes, in the user's voice, with SEO metadata. | Saves drafts only. Publishing needs approval. No made-up facts: claims need a source or a "check this" flag. |
| **Audit** | Code, dependency and security audit of a project: outdated or vulnerable packages, secrets committed by mistake, risky settings. | Read-only on the chosen project folder. |
| **QA testing** | Opens the user's app in a real browser (Playwright), clicks through the main flows, takes screenshots and reports what broke. Can hand failures to a Heal run. | Runs locally against the URLs the user gives. |
| **Find prospects** | Builds a list of potential customers from public sources and the user's own data, with reasons why each fits. | Respects each site's terms (no scraping where it's forbidden, such as LinkedIn). Keeps data local. **[Unresolved]** privacy-law review (GDPR and others) before launch. |
| **Cold emailing** | Writes personalised email drafts and sequences, then sends from the user's own email account. | Approval before sending. Daily limits. Unsubscribe link and sender details included. **[Unresolved]** legal review (CAN-SPAM, GDPR, PECR) before it can send. |
| **Daily update** | A morning digest: runs, approvals waiting, deploy and site health, new comments and emails, and what changed in the user's projects. | Read-only. |
| **Finding features** | Collects feature ideas from user feedback, reviews, support emails and competitor changelogs, and ranks them. | Read-only on the sources the user connects. |
| **Making videos** | Turns a script, screenshots or a screen recording into a short video with captions (for example with Remotion and local text-to-speech). AI video generation only with the user's own key. | Writes only in a chosen folder. |
| **Uploading videos** | Uploads finished videos to YouTube and others through their official APIs, with the user's own login. | Approval before every upload. Respects platform quotas and terms. |
| **Replying to comments and emails** | Drafts replies to comments (YouTube, GitHub, the blog) and emails. | Drafts only by default. Sending needs approval, or a per-agent auto-approve rule that the user sets. |

---

## 8. Suggested sequence [Recommendation]
Each phase needs separate owner approval.

| Phase | Builds | Cost |
|---|---|---|
| **1. Safe local foundation** | F1 safety core (M1–M4), F2 permissions, F3 vault, F5 Claude Code notifications, F13 dashboard v1 | $0 |
| **2. Agent runtime** | F7 tool calling (MCP), F8 bring-your-own agent and API key (after P-16), F6 Agent Relay, F9 offline mode | $0 |
| **3. First automation agents** | QA testing, Audit, SEO/GEO/AEO checker, Daily update, Blog writer (drafts) | $0 (the user's own AI) |
| **4. Build and talk** | F10 plain-words agents, F11 block builder, F12 voice | $0 |
| **5. Ecosystem** | F14 more integrations, F16 reviewed marketplace, F15 apps panel (music first) | Review effort; hosting the marketplace listing may need budget |
| **6. Outreach and media agents** | Find prospects, Cold emailing, Replying, Making and uploading videos | Legal and privacy review first |
| **7. Pro cloud** | F18, once pricing covers servers (P-17) | Paid |

Milestone details: [ROADMAP.md](./ROADMAP.md#agent-track-added-2026-11-08).

---

## 9. Constraints kept
- **$0** for phases 1–4, which run locally with the user's own AI (DEC-05, DEC-22). Paid only where a later decision approves a budget (Pro cloud, P-17).
- **No claude.ai logins or subscription tokens** routed through VibeHeal. Agents run as their vendors' own tools on the user's computer, and only where the vendor's terms allow it (P-1).
- **Local-first:** private data and project code stay on the user's computer unless the user explicitly sends them somewhere (Pro cloud needs consent).
- **Project content and agent output are untrusted.** Enforcement is in application code, never only in prompts.
- **Secrets are never sent to agents or written to logs.**
- **No unsolicited bulk messaging and no platform-terms violations:** outreach agents send only from the user's own account, with approval, limits and legal review.
