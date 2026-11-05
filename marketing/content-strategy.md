# VibeHeal content strategy

**Status:** draft for owner review. Last updated 2026-10-31.

## Goal
Build a small, genuine audience of beginner vibe coders and indie developers, and learn whether they want what VibeHeal is designed to do. Growth is secondary. Every post should either help someone right now or teach them something about working safely with AI-generated code.

## Constraints that shape the plan
- The owner is a student with hackathons and cricket. Content is **batched**: one session prepares about two weeks of drafts, and the owner reviews them in short sittings.
- Budget is **$0**. No paid scheduling tools, ads, design subscriptions or paid AI APIs. Content is drafted with Claude Code and images are made with ChatGPT Images under the owner's own free or existing accounts.
- **Nothing is published automatically.** Every draft is reviewed and approved by the owner first.
- Only publish claims that are verified (see `brand-guidelines.md`).

## Channels and cadence (starting point)

| Channel | Purpose | Cadence | Format |
|---|---|---|---|
| LinkedIn | Founder journey, education, build-in-public | 2 posts and 1 carousel per week | Text posts, carousels |
| X | Quick tips, relatable problems, threads | 3 to 4 posts and 1 thread per week | Single posts, threads |
| Reddit | Discussion, questions, learning from others | 1 thoughtful post per week at most | Discussion posts, no links |
| Video | Short explainers for beginners | 1 short video per week | 20–40 seconds, vertical |
| Posters | Shareable graphics | 1 poster per week | Square and vertical images |

Start small. Increase only when the owner has the time.

## Content pillars
1. Relatable problems (about 30%)
2. Education and developer tips (about 30%)
3. Build in public, including what is not working (about 20%)
4. Founder journey (about 10%)
5. Community questions and polls (about 10%)

## Batch workflow

1. **Plan** (once a fortnight, about 45 minutes): update `content-calendar.md`. Pick topics from the pillars. Check the status in `brand-guidelines.md`.
2. **Draft** (one Claude Code session, about 30 to 60 minutes): ask Claude Code to fill the templates in `prompts/` for the chosen dates. Save the output in `content/drafts/` as one file per batch, for example `content/drafts/2026-11-02-batch.md`.
3. **Verify**: read the "Factual claims to verify" list for each item. Check each claim against the repo and the status in `brand-guidelines.md`. Remove anything you cannot confirm.
4. **Review** (about 20 minutes): the owner edits, then moves each approved item into `content/approved/` (for example `content/approved/2026-11-02-linkedin-problem.md`). Rejected items stay in `drafts/` with a short note.
5. **Schedule** (manual, free): use the platform's own scheduling feature, when the account offers one. See the publishing rules below.
6. **Publish and record**: once an item is live, move it to `content/published/` and add the link and date. Do not record anything you did not publish.
7. **Review monthly**: fill `analytics/monthly-review-template.md` from the platforms' own analytics pages. Do not invent numbers. Leave a field empty if the data is not available.

## Publishing rules (free-first)
- Use **native scheduling** inside LinkedIn and X when the account offers it. Check on the day whether the option is available to your account. Do not assume it is.
- Do not use third-party social schedulers that need a paid plan, and do not use scraping, automation scripts or bots.
- Do not use platform APIs for basic posting. Basic content preparation needs no API keys.
- Do not post the same text on every platform. Adapt each post to the platform and the audience.
- Never post more than the platform allows for a normal account, and never buy or swap engagement.

## Links and the waitlist
- The waitlist page is **not hosted yet**. Its address is not decided, and no hosting is approved. Do not include the waitlist link in any post until the owner approves a public address. Until then, use phrases like "a waitlist is coming" in drafts, and mark those items "link pending".

## What to measure (honestly)
- Replies, saves and questions (quality of engagement).
- Waitlist signups, once the form is publicly reachable (counted from the owner's private report, not from platform numbers).
- Which pillar and format produced the most useful discussion.

Never publish signup numbers, follower counts or engagement figures that have not been read from the real analytics.

## Risks to watch
- Overpromising. The product is not built. Keep every claim tied to the status.
- Burnout. Skip a week if school or a hackathon needs it. The calendar can slip.
- Sharing private data. Never include a student's personal details, school details, or any real user's data in a post.
- Community platform. WhatsApp is preferred for "VibeHeal Builders", but the platform is not chosen. Do not promise a community date or link.
