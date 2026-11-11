# Open-source collaborator research report (round 2)

Date: 2026-11-11. Research and drafts only: **nothing has been sent** to anyone. Source of truth for data: `prospects.csv` (updated in place; round-1 rows kept).

## Counts (verified only)
| | Target | Verified | Tier A | Tier B | Tier C |
|---|---|---|---|---|---|
| US collaborators | 20 | **8** | 4 | 3 | 1 |
| India collaborators | 10 | **5** | 2 | 1 | 2 |

Round-1 prospects (mentors, one beta-tester peer, and non-US/India developers) remain in the CSV but are not counted toward these targets. Targets were **not met**; I did not pad the list. "Verified" means I opened the person's public GitHub profile and confirmed name, location and the listed repositories. I did not verify commit-level contributions beyond what the profile and repo pages show.

Tiers: A = verified open-source work and relevant skills. B = relevant, limited evidence of fit or availability. C = weak relevance or thin evidence. The tier does not mean willingness; see below.

## Strongest prospects
- **Sumant Tirkey (India, A)**: builds Shrike, an MIT-licensed open-source debugger for vibe coders where fixes apply only after user approval. Closest audience and philosophy match. README says contributions are welcome. Also lists AsyncAPI mentorship and merged PRs in juspay/xyne-spaces.
- **Sahil Ahuja (US, A)**: CTO/founder; hexokit (TypeScript) and fab-kit (spec-driven workflow for AI coding agents); works on AI plus design tools.
- **Ricardo Accioly (US, A)**: docguard enforces documentation for AI-assisted projects. Fills our documentation/DX gap.
- **Jackie McDoniel (US, A)**: maintainer of nest-commander, testing-nestjs, nestjs-spelunker (hundreds to ~3k stars). Sustained TypeScript/Node maintenance.
- **Arvind Ram Singh Kishore (US, A)**: extract-design-system (284 stars); design-token tooling.
- **Saurabh / starc007 (India, A)**: beUI animated React components (~2k stars); motion and UI skills.
- **Christian Baroni (US, B)**: designer-engineer on rainbow-me/rainbow (4.4k stars) and react-native-turbo-haptics; the best UI/UX candidate but not yet drafted.

## Publicly evidenced interest in volunteering
**None of the 13 has publicly said they volunteer for other people's early-stage projects.** The closest signals:
- Sumant Tirkey: his own Shrike README says "contributions are welcome" (about his project, not ours).
- Zuhed Shaikh (India, C): README says "I'm looking to collaborate on MERN Stack."
- Ankit Jain (India, C): bio says "Mentoring Next-Gen engineers."

Everyone else is a respectful cold invitation, which is why every draft says clearly that the work is unpaid and voluntary and that no reply is needed. Hailey's and Arvind's pages show a Sponsor button; that is how people fund themselves, so I treated it as a caution, not evidence.

## Contact information
- Public email found for only **2 of 13**: Sumant Tirkey and Zuhed Shaikh, both reported from their GitHub profile README and both personal Gmail addresses (not clearly "professional"). **Re-check the README before use**; I read it through a page summary and did not re-open it.
- Everyone else: no email shown. Many list a personal website that I did not search for a contact form. No address was guessed.

## Missing information and limitations
- Targets missed (8/20 US, 5/10 India). The GitHub user-profile API was unavailable here, so I verified profiles by opening public pages one by one, which is slow.
- No US-based designers were verified beyond Christian Baroni; no India-based designers were verified. This is the biggest gap.
- Search results skewed toward AI-agent tool authors; plain open-source maintainers and designers need other discovery routes (contributor lists of large projects, design communities).
- Locations come from profile fields. Names are as shown on GitHub; confirm preferred names (e.g. Jackie/Jay McDoniel).
- One otherwise promising Indian profile belongs to a high-school student (self-described); I excluded them and recommend not contacting minors for this.
- Prospects outside the US/India (e.g. Spain, UK, Netherlands, Sweden, Finland) were found and not listed as collaborators in this round.
- Page summaries came from an automated fetch tool, so spot-check before approving any message.

## Recommended first five to approach
Ranked by fit, with a US-first bias but noting reachability:
1. **Sumant Tirkey** (India): best fit, and the only verified contact method. Still check that the email is current.
2. **Sahil Ahuja** (US): dev-tools and design-tools founder; needs a channel (check shll.ai / doku.dev for a contact method).
3. **Ricardo Accioly** (US): documentation/DX is a real need.
4. **Jackie McDoniel** (US): maintainer experience; confirm the name.
5. **Arvind Ram Singh Kishore** (US): design-token/UI guidance.

Next in line: Saurabh (starc007) for motion, and Christian Baroni for design (draft still needed).
Drafts for 1-5 and Saurabh are in `collaborator-emails.md`, with the correct domains.

## Netlify checks on PR #16
See `outreach-strategy.md` for the cause found and the limits of that finding.
