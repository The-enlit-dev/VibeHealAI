# Prompt: poster copy and ChatGPT Images prompts

Posters are made with **ChatGPT Images**. This prompt produces the copy and the image prompt. It does **not** produce an image. Do not describe a poster as generated until the owner has made it and saved it.

## Prompt

> Read `marketing/brand-guidelines.md`.
> Write [N] poster concepts for [start date] to [end date] from `marketing/content-calendar.md`.
> For each concept, write the poster copy and a ChatGPT Images prompt.
>
> Copy rules:
> - Headline under 8 words. Subline under 16 words. One call to action at most.
> - Friendly and calm. No hype, guarantees or fake claims.
> - Do not use real people's faces, brand logos or third-party trademarks in the image prompt.
>
> Image prompt rules:
> - Describe a clean, flat, calm composition with generous white space.
> - Colours: calm teal `#0F6B6B`, warm white `#F7F9FB`, ink `#15212B`. Accent colour optional.
> - Include the exact text to appear on the poster, in quotes, and ask for it to be spelled exactly.
> - Ask for a safety-net or workflow motif (for example, a simple shield over a folder of files), not a fake product screenshot.
> - Aspect ratio: square (1:1) for LinkedIn and X, vertical (4:5) for Instagram-style posts if the owner wants them.
> - Add a negative prompt in plain text: no logos, no watermarks, no real people, no fake UI, no fake numbers.
> - Status: prompt only, not generated.

## Output fields (one block per poster)

```
### [#] [Title]
- Platform:
- Pillar:
- Suggested date:
- Poster headline:
- Poster subline:
- CTA (optional):
- ChatGPT Images prompt:
- Negative prompt (text to avoid):
- Text that must appear exactly:
- Factual claims to verify:
- Status: draft, prompt only, not generated
```
