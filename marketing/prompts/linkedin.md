# Prompt: LinkedIn posts and carousels

Use this with Claude Code, in a session where the repository is open, so it can check claims against `docs/planning/` and `marketing/brand-guidelines.md`.

## Prompt

> Read `marketing/brand-guidelines.md`, `marketing/content-strategy.md` and the status section of `README.md`.
> Draft [N] LinkedIn items for the dates in `marketing/content-calendar.md` from [start date] to [end date].
> Pillars to cover: [list].
> Audience: beginner vibe coders and indie developers.
>
> For each item, output the fields below. Save the batch as `marketing/content/drafts/[date]-batch.md`, with one section per item.
>
> Rules:
> - Friendly, plain, calm. Short sentences. Explain any jargon once.
> - No hype, no guarantees, no invented numbers, testimonials, dates, prices or integrations.
> - Say "planned" or "designed to" for anything not built. Check the status section first.
> - Do not add a link unless the owner approved a public address. Otherwise write `[link pending]`.
> - Do not use emojis as decoration. One or two is fine if it fits the post.
> - Keep a post under about 1,200 characters. Carousels: 5 to 8 slides, one idea per slide.
> - Do not publish. Do not schedule. Drafts only.

## Output fields (one block per item)

```
### [#] [Short title]
- Platform: LinkedIn (post | carousel)
- Pillar:
- Topic:
- Target audience:
- Suggested date:
- Draft copy:
- Carousel slides (if any):
- Visual direction:
- CTA:
- Factual claims to verify:
- Status: draft
```

## Example item (for reference only)

```
### 1. Which file broke the app?
- Platform: LinkedIn (post)
- Pillar: Relatable problem
- Topic: Reading an AI change when you cannot tell which file caused the error
- Target audience: Beginner vibe coders
- Suggested date: Mon 2 Nov 2026
- Draft copy: (write it here)
- Visual direction: none, or a plain text card
- CTA: Ask: how do you check what an AI tool changed?
- Factual claims to verify: none (general advice only)
- Status: draft
```
