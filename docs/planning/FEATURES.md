# VibeHeal Feature Roadmap: the supervisor for your AI coders

**Status:** written 2026-11-08 from the owner's answers on the same day. Decisions: DEC-33 (positioning and Agent Relay) and DEC-34 (staged AI policy) in [DECISIONS.md](./DECISIONS.md). **Nothing in this document is built.** Each milestone (A1 to A5) needs its own owner approval before work starts, as CLAUDE.md requires.

Labels follow [DECISIONS.md](./DECISIONS.md): **[Decision]** the owner decided; **[Recommendation]** proposed, not yet decided; **[Unresolved]** open question.

---

## 1. Owner decisions behind this roadmap (2026-11-08)
- **[Decision] "Agent calling" means agents calling agents.** Several agents with roles (fixer, reviewer, tester) pass work to each other, and VibeHeal supervises every step.
- **[Decision] Specialist positioning.** VibeHeal stays the safety net for vibe coders. It is not a general personal agent.
- **[Decision] AI in three stages (DEC-34):**
  1. **Bring your own agent:** VibeHeal drives AI tools the user already has. $0 for us.
  2. **Then optional bring-your-own API keys:** the user pays their provider. $0 for us.
  3. **Later, a paid built-in AI tier:** needs a budget, pricing and hosting decision. Not scheduled.

---

## 2. Competitor snapshot
Researched 2026-11-08. Most sources are third-party write-ups that disagree on numbers (stars, skill counts, dates), so treat every figure as approximate and re-check primary sources before quoting them publicly.

| Product | What it is | Strength | Gap VibeHeal can own |
|---|---|---|---|
| **Hermes Agent** (Nous Research, MIT licence) | A self-improving general agent that runs persistently on your machine or server. Reachable from Telegram, Discord, Slack and WhatsApp. Uses Nous Portal or your own API keys. | Persistent local memory, skills it creates for itself, a very large community. | General purpose. Nothing guarantees that a change it makes to your project is reviewed, tested or reversible. |
| **OpenClaw** (formerly Clawdbot, MIT licence) | A local personal agent controlled mainly from chat apps. Runs shell commands. Thousands of community skills on ClawHub. | Reach (many chat apps) and a big skill ecosystem. | Every action runs with the machine's full credentials, and open community skills are a supply-chain risk. No safety net for your project. |
| **Grok Bot** (xAI, launched August 2026) | An always-on cloud team of named AI "coworkers" with roles, automations and MCP connectors. | Multi-agent roles that keep working while you are away. | Closed, paid and cloud-only: your code and keys live on their machine. More autonomy, but no independent supervisor. |
| **Dot** | New Computer's Dot (a memory-focused AI companion) shut down in October 2025. An unrelated "Dot" personal-assistant app now uses the name. | Memory and companionship. | Not a coding tool. |

**The gap:** all of these can *act*. None is built to make sure an AI change to *your project* is checked, explained, provably working and undoable. Multi-agent products add autonomy; nobody adds a referee.

Sources (accessed 2026-11-08):
- Hermes Agent: [hermes-agent.org/about](https://hermes-agent.org/about/), [dupple.com: What is Hermes Agent](https://dupple.com/learn/what-is-hermes-agent), [heyuan110.com review](https://www.heyuan110.com/posts/ai/2026-04-14-hermes-agent-guide)
- OpenClaw: [agentic-ai.readthedocs.io: OpenClaw](https://agentic-ai.readthedocs.io/en/latest/AgentPlatforms/openclaw/), [Herond: complete guide](https://blog.herond.org/what-is-openclaw-the-complete-guide-to-the-viral-open-source-ai-agent/), [DEV: set up OpenClaw](https://dev.to/kfuras/set-up-openclaw-as-your-personal-ai-agent-in-2026-h5o)
- Grok Bot: [xAI news](https://x.ai/news), [mem0: Grok Bot guide](https://mem0.ai/library/llms-and-models/grok-bot-guide)
- Dot: [Product Hunt: Dot by New Computer](https://www.producthunt.com/products/dot-3f3fdbab-5039-4dd7-9ae5-4303c4b11995/launches/dot-by-new-computer), [App Store: Dot - AI Personal Assistant](https://apps.apple.com/us/app/-/id6758647775)

---

## 3. Positioning [Decision, DEC-33]
**"VibeHeal is the supervisor for your AI coders."** Other agents do the work; VibeHeal makes it safe:
- every AI change gets a **snapshot, a review, a real test run and a one-click undo**;
- **agents check each other's work** before anything reaches you;
- it uses the **AI tools you already pay for**: no lock-in and no AI bill from us;
- **local-first:** your code and keys stay on your computer.

The catch line stays **"Just vibeheal it."**

---

## 4. The headline feature: the Agent Relay (agents calling agents)
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
- **Works under the competitors:** VibeHeal can supervise changes that Hermes, OpenClaw or any other agent makes to a project (feature 11).

---

## 5. Feature list (prioritised) [Recommendation]

### Tier 0: the safety core (milestones M1–M4, already planned; every agent feature depends on it)
1. **Project Gate and Inspector:** detects the stack, scripts and risky files.
2. **Script runner:** captures errors safely and explains them in plain language, using offline rules first.
3. **Snapshots before every change, plus one-click undo:** a git-backed shadow history.
4. **Change review:** a readable diff, grouped by file.
5. **Handoff brief:** a structured prompt for any AI tool.

### Tier 1: bring your own agent (stage 1, $0)
6. **Agent connectors:** launch and supervise AI coding tools already installed on the user's computer, each as a subprocess in a sandboxed worktree.
   - **Candidates:** Claude Code, OpenAI Codex CLI, Gemini CLI, Cursor's agent CLI, Aider, and local models through Ollama.
   - **Rules:** VibeHeal never holds or routes the user's logins, and uses each vendor's official tool, unmodified.
   - **[Unresolved] Terms check per vendor.** Driving the user's own Claude Code is **blocked until P-1** is answered: Anthropic must confirm in writing that it's allowed. Every other vendor's terms are checked before its connector is built. A1 can start with tools whose terms clearly allow it, such as local models through Ollama or Aider.
7. **Agent Relay:** Fixer → Reviewer → Tester with the VibeHeal referee (section 4). Roles, round limits and the agent for each role are configurable.
8. **Safety policies (guardrails as code):**
   - protected paths;
   - a maximum diff size;
   - no new dependencies, network or deploy commands without approval;
   - secret redaction in prompts and logs.
9. **Live supervision timeline:** each agent's steps, its diff, the check results and the agent-to-agent notes. Pause, approve, reject or roll back at any step.
10. **"Heal" button:** one click turns a captured error into a Relay run, ending in your approval.
11. **Supervise other agents:** watch a folder that another agent (Hermes, OpenClaw or anything else) is editing. VibeHeal auto-snapshots, flags risky changes and offers undo.

### Tier 2: project context and memory (stage 1, $0)
12. **Project memory:** a local, readable and editable file of decisions, known issues and what fixed things before. It is fed into every brief, so agents stop repeating mistakes. Unlike hidden memory, you can see and correct it.
13. **Integration context in briefs:** GitHub is built (IM2). Vercel, Netlify, Supabase and others follow (IM3–IM4). For example, a failing deploy log is attached to the Fixer's brief automatically.
14. **Deploy watch:** reads deploy status read-only (DEC-21). When a deploy breaks, it proposes a Heal run.
15. **Recipes:** reviewed Relay templates, such as "fix a failing build", "upgrade a dependency safely" and "add tests before refactoring". First-party or signed only: no open skill marketplace (DEC-17).

### Tier 3: reach and convenience
16. **Notifications:** a desktop notification when a Relay finishes or needs approval. Later, optional chat-app notifications (Telegram, Slack) that can only **approve or reject**; they never run commands sent from chat.
17. **Scheduled checks:** nightly "does it still build?" and "are dependencies safe?" runs, with a morning report.
18. **Website account link:** the website's Clerk account (DEC-31) could later sync settings or licences. Project code never leaves the computer.

### Tier 4: AI stages 2 and 3 (DEC-34)
19. **Stage 2, bring your own API key:**
    - **What:** the user adds their own Anthropic, OpenAI or OpenRouter key, stored in the operating system's keychain and never in the UI process (SECURITY.md CR rules).
    - **Enables:** built-in error explanations, a Reviewer role that needs no CLI, and a project chat.
    - **Cost:** the user pays their provider; $0 for us.
    - **[Unresolved] P-16:** needs a security review before it is built.
20. **Stage 3, paid built-in AI:** a hosted, metered AI tier for users with no agent or key. **[Unresolved] P-17:** needs budget, pricing, hosting, accounts and billing decisions. **Not scheduled.**

### Not doing (keeps VibeHeal different) [Recommendation]
- A general personal agent (email, calendar, shopping). Leave that to Hermes, OpenClaw and Grok Bot.
- An open community skill marketplace (supply-chain risk; DEC-17).
- Running commands sent from chat apps.
- Running user code in the cloud, until a hosted tier is decided.

---

## 6. Suggested sequence [Recommendation]
Each step needs separate owner approval.

| Order | Milestone | Depends on | Notes |
|---|---|---|---|
| 1 | **M1–M4 safety core** | (planned) | Unblocks everything below. P-15 asks to start M1. |
| 2 | **A1 Agent connectors** | M2, M3 | One terms-cleared tool first, then more. Sandboxed worktree, referee rules, snapshots. Claude Code only after P-1. |
| 3 | **A2 Agent Relay** | A1 | Fixer, Reviewer, Tester; supervision timeline; Heal button. |
| 4 | **A3 Supervise external agents + project memory** | A2 | Folder watch with automatic snapshots. |
| 5 | **A4 Deploy watch + recipes** | A2, IM3 | Uses the Vercel and Netlify read-only adapters. |
| 6 | **A5 Stage 2 bring-your-own API keys** | P-16 | Security review first. |
| Later | Chat-app notifications, scheduled checks, stage 3 decision | P-17 | Not scheduled. |

Details for A1–A5 are in [ROADMAP.md](./ROADMAP.md#agent-track-added-2026-11-08).

---

## 7. Constraints kept
- **$0** for stages 1 and 2 (DEC-05, DEC-22).
- **No claude.ai logins or subscription tokens** routed through VibeHeal. Agents run as their vendors' own tools on the user's computer, and only where the vendor's terms allow it (P-1).
- **Local-first:** project code stays on the user's computer.
- **Project content and agent output are untrusted.** Enforcement is in application code, never only in prompts.
- **Secrets are never sent to agents or written to logs.**
