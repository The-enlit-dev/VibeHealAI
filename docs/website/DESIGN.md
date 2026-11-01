# Website design decisions

**Status:** implemented 2026-10-31. Applies to the public site (`website/`) and the admin dashboard (`waitlist/admin-ui/`).

## Direction
Premium but friendly, in a developer-tool style: strong type, generous whitespace, hairline borders, small radii and one dark band. Deliberately avoided:
- purple, blue and orange gradients;
- glow, neon and glassmorphism;
- heavily rounded cards and decorative animation.

## Palette

| Token | Hex | Use |
|---|---|---|
| Navy | `#14213D` | Body text, primary buttons, the "How it works" band, footer |
| Teal | `#1B998B` | Large accents only: step numbers, status-panel top border, chart bars, link-list borders |
| Ivory | `#F6F4EF` | Page background, text on navy |
| Slate | `#667085` | Secondary text on ivory or white |
| Amber | `#F4B942` | "Planned" chips, kicker on navy, eyebrow dot, callout border |
| Teal ink (derived) | `#0E6F64` | Links, kickers and tagline. A darker teal added for accessible text |

Colours live in `site/brand.json` and reach the CSS only through the generated `website/brand.css` custom properties.

### Contrast (WCAG 2.x, checked by `scripts/build-site.test.ts`)

| Pair | Ratio | Rule |
|---|---|---|
| Navy on ivory | 14.5:1 | Body text |
| Slate on ivory | 4.53:1 | Secondary text (just above the 4.5:1 AA limit, so it is never used smaller than 0.85rem) |
| Teal on ivory | 3.2:1 | **Fails** for normal text, so teal is used only for large text, borders and graphics (3:1 minimum) |
| Teal ink on ivory | 5.5:1 | Links and small teal text |
| Navy on amber | 9.0:1 | "Planned" chips |
| Ivory on navy | 14.5:1 | Text in dark sections; muted text there uses `#C8CDD6` (10:1) |

## Typography
- **System font stacks only:** no web fonts, no font licences, and no extra requests.
- **Headings:** heavy weight (750) with tight tracking.
- **Monospace for "instrument" text:** kickers, chips, step numbers and the status panel. This gives the developer-tool feel without images.

## Layout and components
- **Hero:** headline, tagline, lead paragraph and two calls to action, beside a **"Status at a glance" panel**. The panel replaces a fake product screenshot: it shows real status rather than invented UI.
- **Status chips:** every capability carries one of three statuses: "In development", "Planned" or "Exploring". A test checks this.
- **Cards** have a 6px radius and 1px borders, with no shadows.
- **Layout:**
  - **Mobile:** one column, below 640px.
  - **Tablet:** two columns from 640px.
  - **Desktop:** up to four columns from 900px.
  - **Phone header:** not sticky below 520px, because the wrapped navigation would cover too much of the screen.
- **Waitlist form:** same fields, IDs and behaviour as before. New planned-feature options were added, and the consent text no longer names a product.
- **FAQ:**
  - **Home page:** `<details>` previews.
  - **FAQ page:** every answer fully visible, with a table of contents.
- **Logo:** a navy tile holding three teal squares and an amber circle in a 2×2 grid ("building blocks"). It has no letters. An earlier triangle version was dropped because it read as a letter "A".

## Performance
- **No framework, no images in the page flow except the small SVG logo, and no third-party requests.** The home page loads `brand.css`, `styles.css`, `app.js` and the SVG mark.
- **JavaScript** is loaded only on the home page (for the form), with `defer`.
- **Content-Security-Policy:** `script-src 'self'` and `style-src 'self'`. There are no inline scripts except JSON-LD data blocks, which browsers do not execute.

## Admin dashboard
- **Styling:** same palette (it loads `/brand.css`), with a plain, dense layout suited to data.
- **Charts:** inline SVG for the 30-day trend and native `<progress>` bars for breakdowns. Neither needs inline styles, so the strict CSP still applies.
- **Accessibility:** every chart has a text alternative (an SVG label plus a table view).
