# Prompt: short video scripts and HyperFrames briefs

Videos are made with **Claude Code and HyperFrames**. This prompt produces a script and a production brief. It does **not** produce a video. Do not describe a video as made or rendered until it actually exists.

## Prompt

> Read `marketing/brand-guidelines.md` and the status section of `README.md`.
> Write [N] short video scripts (20 to 40 seconds each) for [start date] to [end date] from `marketing/content-calendar.md`.
> For each script, also write a HyperFrames production brief.
>
> Script rules:
> - One problem, one takeaway. Open with the problem in the first two seconds.
> - Plain words. No jargon without a quick explanation.
> - Say "planned" for any feature not built. End with a calm CTA that does not need a link unless the owner approved one.
> - Keep on-screen text short (under 8 words per line).
>
> HyperFrames brief rules:
> - Give the scene list with timings, the on-screen text, voiceover lines, and the visual elements to use (shapes, diagrams, text cards). Use only brand colours from `website/styles.css`.
> - Do not use third-party footage, logos, music or fonts unless the owner confirms a licence. Prefer generated or original shapes and text.
> - Name any asset the owner must provide (for example, a voiceover recording) as `[owner to provide]`.
> - Mark the output status as `brief only, not rendered`.

## Output fields (one block per video)

```
### [#] [Title]
- Platform: video (vertical 9:16 unless the owner says otherwise)
- Pillar:
- Topic:
- Target audience:
- Suggested date:
- Script (timed lines):
- On-screen text:
- Voiceover:
- HyperFrames brief:
  - Scenes (time, visual, text):
  - Colours and fonts (from brand guidelines):
  - Assets the owner must provide:
- CTA:
- Factual claims to verify:
- Status: draft, brief only, not rendered
```
