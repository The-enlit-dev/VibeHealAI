# VibeHeal marketing workspace

This folder holds the marketing plan, the prompts that make drafts, and the draft batches. **Nothing here publishes anything.** Every draft needs the owner's review and approval before it goes anywhere.

> **Note (2026-11-05):** the product name is now **VibeHeal**, with the catch line "Just vibeheal it." The public website uses the headline "Your AI assistant for vibe coders" and a broader positioning: code safety is one feature, not the whole product. Some drafts in this folder still describe VibeHeal only as a "safety net". Review them against [docs/website/BRANDING.md](../docs/website/BRANDING.md) before posting.

## Structure

| Path | What it is |
|---|---|
| `brand-guidelines.md` | Voice, words to avoid, the verified product status, and the pre-publication checklist |
| `content-strategy.md` | Goals, cadence, the batch workflow, and the free-first publishing rules |
| `content-calendar.md` | Suggested dates and status for each item in a batch |
| `prompts/` | Reusable prompts for LinkedIn, X, Reddit, video scripts and HyperFrames briefs, and poster and ChatGPT Images prompts |
| `content/drafts/` | Draft batches written by Claude Code (`YYYY-MM-DD-batch.md`) |
| `content/approved/` | Items the owner has approved, one file per item |
| `content/published/` | Items that are live, with the link and the date |
| `analytics/` | Monthly review notes (copy `monthly-review-template.md` for each month) |

## The loop

1. **Plan** the next two weeks in `content-calendar.md`.
2. **Draft** in one Claude Code session. Paste a prompt from `prompts/` and name the dates and pillars.
3. **Verify** every claim against `brand-guidelines.md` and `README.md`.
4. **Review and approve.** Move approved items to `content/approved/`.
5. **Schedule and publish manually** with the platform's own scheduler, if the account offers one.
6. **Record** what went live in `content/published/`.
7. **Review monthly** with the template in `analytics/`.

## Rules
- No automatic posting, no third-party schedulers that need a paid plan, no scraping, no bots, no platform API calls for basic drafting.
- No invented numbers, testimonials, launch dates, prices or integrations.
- Factual claims about the product must match the status in `brand-guidelines.md`.
- No waitlist link until the owner approves a public address.
- Videos and posters are **briefs and prompts** until someone actually makes them. Do not describe them as made before they exist.
- Personal data (emails, school details, real users' data) never goes in this folder.
