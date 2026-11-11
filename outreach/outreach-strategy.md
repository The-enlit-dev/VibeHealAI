# Outreach strategy (v2, 2026-11-11)

## Round 2 update (US/India open-source collaborators)
- Priority order: US maintainers, US designers, India maintainers, India designers. Professional and project criteria only.
- Verified so far: 8 US and 5 India collaborators (targets 20 and 10). Detail in `open-source-research-report.md` and `prospects.csv`.
- Every draft states the work is **unpaid and voluntary**, with no pay, equity, employment or future compensation. No evidence yet that any prospect volunteers for outside projects, so each approach is a respectful invitation with an easy opt-out.
- Domains: `https://vibeheal.online` is the official public site (product not public yet); `https://vibeheal.live` is the development, beta, contributor and feedback hub. Do not mix them.
- Send nothing (email, LinkedIn or DM) until the founder approves each recipient and message.

## Netlify failures on PR #16 (investigated)
- Could not read the Netlify deploy logs: the app.netlify.com pages need a login. So the log's text is **not** verified.
- Reproduced locally by running the site build the Netlify config uses (`node scripts/build-site.mjs`). It fails with `ReferenceError: page is not defined` at `scripts/build-site.mjs:592` (inside `renderPage`, which destructures `key`, `indexable`, `script` etc. but is later read as `page.key`, `page.indexable`, `page.script`).
- `scripts/` and `site/` are identical to `origin/main`, so the failure is not caused by this PR (which only adds `outreach/`). It affects both Netlify sites (`brixoai`, `vibehealai`).
- Not fixed: you asked me not to change unrelated website files. A founder or site owner should fix `build-site.mjs` in a separate PR, then compare with the Netlify log to confirm this is the same error.

## Round 1 notes (kept)

## Honest status vs. targets
| Target | Goal | Delivered |
|---|---|---|
| Collaborators | 15 | 3 verified + 1 low priority |
| Beta testers | 15 | 0 individuals (1 peer candidate) |
| Mentors | 10 | 3 |

I chose quality over quantity: every row in `prospects.csv` was confirmed from a public page I actually opened (GitHub profile, project README, personal site). The targets were **not** met. Public professional emails are rare: only **1 of 7** prospects has one (Fabio Salvadori, from his company site). No email was guessed. Nothing has been sent, and no Hostinger Mail tool call was made.

## Limits of this research
- Search results are partial; profile API calls were blocked in this environment, so I used public web pages only.
- Names/affiliations beyond those in the CSV were not verified. Several search hits (Reploxis, UndoMCP, VibeKit, Rewind) were not followed up.
- VibeGit's README says it has no licence; do not reuse its code.

## Principles
Transparent that VibeHealAI is early, unfunded and volunteer-only. Never pressure, never follow up more than once, no bulk sends. Do not claim a team, users or traction. Core workflow isn't built yet (only the integration platform and GitHub read-only adapter exist), so say so; do not offer downloads.

## Recommended channels (founder decides)
1. **Email** only where a public professional address exists (currently Fabio only).
2. **Opt-in community posts** for beta testers (founder-run, e.g. a post on own accounts or relevant communities following each community's self-promotion rules) with a waitlist on vibeheal.live. This is more respectful and scalable than cold email.
3. **GitHub issues/discussions** are public and unsolicited; only use for genuine, project-specific questions and with the maintainer's norms in mind.

## Founder decisions needed
- Approve/reject each prospect and draft (esp. Fabio, the only one sendable).
- Fill in the sender name and confirm vibeheal.live is live before anything goes out.
- Pick a channel for the no-email prospects, or drop them.
- Authorise me to continue research for more prospects (next: maintainers of Electron/React open-source projects, indie-hacker community members who have publicly invited feedback).

## Next steps I can take without sending anything
Expand verified prospects to the targets; draft a short public beta-call post; build a tracking view.
