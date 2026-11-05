# Branding and how to change it

**The product name is VibeHeal** (decided 2026-11-05, see DEC-28 in [DECISIONS.md](../planning/DECISIONS.md)). The catch line is **"Just vibeheal it."** The public identity is set in one place, so a later change is a configuration change plus one command.

## Where the identity is set

All in `site/brand.json`:

| Field | Current value | Used for |
|---|---|---|
| `siteName` | "VibeHeal" | Header and footer text, title suffix, `og:site_name`, WebSite structured data, llms.txt |
| `nameIsTemporary` | `false` | When `true`, shows "is a working title" in the footer |
| `headline` | "Your AI assistant for vibe coders" | Home page `<h1>`, home title, social image |
| `tagline` | "Just vibeheal it." | Hero, footer, About page, social image |
| `description` | one-paragraph summary | Home meta description, About lead, WebSite description, llms.txt |
| `colors` | navy, teal, ivory, slate, amber, teal ink | Generated `website/brand.css` |
| `logo.path` | `/assets/logo.svg` | Header and footer mark |
| `favicon` | `/assets/favicon.svg` | Browser tab icon |
| `socialImage` | `/assets/og-image.png`, 1200×630, plus alt text | Open Graph and Twitter cards |
| `siteUrl` | `https://vibehealai.netlify.app` (free Netlify address) | Canonical URLs, sitemap, robots.txt, social URLs |
| `verification` | empty | Optional Google and Bing ownership tokens, home page only |
| `author` | empty | Optional author line on About and in structured data |
| `contactEmail` | empty | Optional removal contact on the privacy page |

Page copy that describes the product (capabilities, steps, principles, status, FAQ) lives in `site/content.json` and `site/faq.json`. Page structure lives in `site/pages/*.html`, which reference the brand fields as `{{ brand.siteName }}` and so on.

## The former name
The project was called BrixoAI until 2026-11-05. The repository, packages, environment variables (`VIBEHEAL_*`), the desktop bridge (`window.vibeheal`), the data folder (`.vibeheal-data`), the docs and the `marketing/` workspace now use VibeHeal. Two things keep the old name on purpose:

- the credential-encryption label `brixoai-credential:v1` in `server/credentials/encrypted-file-vault.ts`. It is part of every stored encrypted record, so changing it would make existing credentials unreadable;
- `.gitignore` and the ESLint ignore list still cover the old `.brixo-data/` folder, so old local data is never committed.

A test (`waitlist/site-safety.test.ts`) fails if "Brixo" appears in any published website file.

## How to change the name again

1. Edit `site/brand.json`: `siteName`, `headline`, `tagline`, `description`, `socialImage.alt` and, once decided, `siteUrl`. Set `nameIsTemporary` to `true` only while a name is provisional.
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
