# Temporary branding and how to rename later

**The permanent product name has not been decided.** The public website uses a neutral working identity. It is set in one place, so a rebrand is a configuration change plus one command.

## What is temporary

All in `site/brand.json`:

| Field | Current value | Used for |
|---|---|---|
| `siteName` | "AI assistant for vibe coders" | Header and footer text, title suffix, `og:site_name`, WebSite structured data, llms.txt |
| `nameIsTemporary` | `true` | Shows "is a working title" in the footer and on the About page |
| `headline` | "Your AI assistant for vibe coders" | Home page `<h1>`, home title, social image |
| `tagline` | "Build more. Automate more. Stay in control." | Hero, footer, social image |
| `description` | one-paragraph summary | Home meta description, About lead, WebSite description, llms.txt |
| `colors` | navy, teal, ivory, slate, amber, teal ink | Generated `website/brand.css` |
| `logo.path` | `/assets/logo.svg` | Header and footer mark |
| `favicon` | `/assets/favicon.svg` | Browser tab icon |
| `socialImage` | `/assets/og-image.png`, 1200×630, plus alt text | Open Graph and Twitter cards |
| `siteUrl` | `https://your-domain.example` (placeholder) | Canonical URLs, sitemap, robots.txt, social URLs |
| `author` | empty | Optional author line on About and in structured data |
| `contactEmail` | empty | Optional removal contact on the privacy page |

Page copy that describes the product (capabilities, steps, principles, status, FAQ) lives in `site/content.json` and `site/faq.json`. Page structure lives in `site/pages/*.html`, which reference the brand fields as `{{ brand.siteName }}` and so on.

## What is NOT renamed
The repository, packages, internal identifiers, the desktop app, the backend, `docs/planning/` and the `marketing/` workspace keep their current names (including "BrixoAI" where it already appears). Only the public website uses the neutral identity. A test (`waitlist/site-safety.test.ts`) fails if "Brixo" appears in any published website file.

## How to rename the website

1. Edit `site/brand.json`: `siteName`, `headline`, `tagline`, `description`, `socialImage.alt` and, once decided, `siteUrl`. Set `nameIsTemporary` to `false` when the name is final.
2. If the logo changes, replace `website/assets/logo.svg` and `website/assets/favicon.svg`, and update `logo.description`.
3. Regenerate the pages:

   ```bash
   npm run build:site
   ```

4. Re-render the social sharing image (optional tool; needs Playwright with Chromium):

   ```bash
   NODE_PATH="$(npm root -g)" node scripts/render-social-image.mjs
   ```

5. Search the page bodies for hard-coded wording that should change: `grep -rn "vibe coders" site/pages site/*.json`.
6. Run `npm run check`. Tests confirm the output is fresh, metadata is complete, links resolve, contrast passes and structured data is valid.
7. Update `brand.lastUpdated` so the sitemap `lastmod` and the "Updated" dates are correct.

If the colours change, re-check contrast. The test in `scripts/build-site.test.ts` encodes the pairs the CSS uses and will fail if a pair drops below WCAG AA. The test also pins the current palette values, so update that expectation deliberately.
