# VibeHeal brand guidelines

**Status:** draft for owner review. Last updated 2026-10-31.

## Names
- **Brand:** VibeHeal (one word, capital B and capital AI).
- **Community:** VibeHeal Builders. The platform is **not chosen yet**. WhatsApp is preferred for now, but no post, page or feature may require it.

## Core message
- **Positioning:** "Your safety net for AI-generated code."
- **Supporting line:** "Build with AI. Stay in control."
- **Headline used on the site:** "Your code deserves a safety net."

## Personality
- Friendly, helpful, beginner-friendly, trustworthy, calm, empowering.
- We talk like a patient friend who has been burned by a broken build before. We do not talk like a hype launch.

## Voice rules
- Plain words. Short sentences. Explain jargon the first time (for example: "a *build* is the step that checks your project compiles").
- Speak to the reader as capable. "You can check what changed" beats "Don't worry, you're not dumb."
- Say what is true **today**. Use "planned", "designed to" or "aims to" for anything not built.
- Be specific and honest about limits. Admit when you do not know something.
- Celebrate small wins and admit mistakes in public (build-in-public).

## Words to avoid
- Hype: "revolutionary", "game-changing", "10x", "unlock", "supercharge", "the future of coding".
- Vague AI-marketing filler: "seamlessly", "leverage", "empower your workflow", "robust solution", "in today's fast-paced world".
- Guarantees: "never breaks", "100% safe", "fully secure", "guaranteed recovery". VibeHeal is not built yet, and nothing can promise that.
- Fake social proof: testimonials, user counts, "thousands of developers", "trusted by". Only use real numbers from real records.
- Dates and prices we have not decided. Do not hint at a launch date.

## Claims that must be checked before publication
Any sentence about the product must match `docs/planning/DECISIONS.md` and the implementation status on the site. Current, verified status (as of 2026-10-31):
- **Not available to download.** No release date. No price.
- **Working in development:** a local backend and an integration foundation with automated tests run by the developer. The GitHub integration was tested only against a fake API, not live.
- **Planned, not built:** project inspection, error explanations, handoff brief, change review, backups and undo.
- **No built-in AI.** Users keep using their own tool (for example Claude Code or Cursor).

## Visual identity
- Calm teal primary (`#0F6B6B`) on warm white (`#F7F9FB`) with a deep ink text (`#15212B`). The website's CSS tokens are the source of truth. See `website/styles.css`.
- Typography: the system UI font stack. No paid or licensed fonts.
- Style: clean cards, generous spacing, one clear action per section.
- Imagery: simple diagrams of the workflow (inspect → explain → review → back up), a calm "safety net" motif, and posters with short copy. Avoid stock photos of people at laptops and avoid fake code screenshots that look like real product output.
- Logos: wordmark only ("VibeHeal" in bold). No third-party logos (for example Claude, Cursor or GitHub logos) in marketing graphics unless the owner has checked the terms for that use.

## Audience
1. **Primary:** beginner vibe coders using Claude Code, Cursor and other AI coding tools.
2. **Secondary:** indie hackers and independent developers.
3. **Later:** business owners. Not a focus now.

## Content pillars
1. **Relatable problems:** "Your AI changed three files. Which one broke the app?"
2. **Education:** short, practical tips for checking AI-made changes (backups, reading diffs, reading an error message).
3. **Build in public:** what was built, what failed, what is next. Use the status above.
4. **Founder journey:** the owner's own story, told in their words. Never invented.
5. **Community:** questions, polls and discussion prompts.

## Pre-publication checklist
- [ ] Every product claim matches the verified status above.
- [ ] No invented numbers, testimonials, dates, prices or integrations.
- [ ] No private email, token, personal address or school details.
- [ ] Links point to the public site only once the owner has approved hosting. Otherwise, use no link.
- [ ] Third-party names are used accurately and not as endorsements.
- [ ] Reddit: the subreddit's rules were read on the day of posting. No self-promotion where it is not allowed.
- [ ] The owner has reviewed and approved the draft (status moved to `content/approved/`).
