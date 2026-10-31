# BrixoAI — Design Handoff

> **Update (2026-10-29): superseded.** The Stitch design has been **rejected** (see `docs/planning/DECISIONS.md`, DEC-10). Stitch screens are **not** the source of truth and no new design work is planned for the MVP. Keep UI minimal and functional. The screen-state checklist at the end of this file (loading, empty, error, permission and keyboard states) still applies. The rest of this file is kept for history only.

**Status: PENDING — finished Stitch screens have not yet been supplied in this repository.**

The user's Stitch designs are the source of truth for the final interface. Do not invent detailed layouts or treat the general visual direction below as an approved design system.

## When the screens are ready
1. Add or upload the exported screens and supporting assets to the repository in a clearly named folder, such as design/stitch/.
2. Record which screen corresponds to each application route or user flow.
3. Inspect desktop and mobile variants, component states, typography, spacing, colors and interaction details.
4. Update this document with specific observations grounded in the supplied screens.
5. Note missing states or ambiguous interactions rather than silently inventing them.
6. Implement screen-by-screen and compare the result with the references.

## General direction only (not final specifications)
The previously discussed direction is a premium, restrained developer workspace: charcoal/graphite surfaces, neutral borders, crisp typography and a muted mint/teal accent. Finished Stitch screens may refine or supersede this direction.

Avoid generic AI decoration, purple gradients, glowing blobs, excessive glass effects, meaningless charts, repetitive oversized cards and fake activity.

## Design acceptance checklist
- [ ] Finished Stitch screens have been supplied.
- [ ] Routes and screen states are mapped.
- [ ] Responsive behavior is understood or explicitly planned.
- [ ] Loading, empty, error, disconnected and permission states are covered.
- [ ] Keyboard and focus behavior are considered.
- [ ] Reusable components match the supplied visual language.
- [ ] No missing design detail has been represented as user-approved.
