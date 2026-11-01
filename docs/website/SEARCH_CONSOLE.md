# Google Search Console setup (owner steps)

**Nothing here has been done.** The site has not been submitted to Google Search Console, and no account, property or DNS record has been created. These are the steps for the owner once a domain is chosen and the site is approved for deployment. Google's interface changes over time, so follow the current on-screen wording if it differs. This guide could not be checked against Google's live documentation from the build environment.

## 0. Before you start
1. Choose and register the domain (a separate cost decision).
2. Set `siteUrl` in `site/brand.json` to the final HTTPS origin, run `npm run build:site`, run `npm run check`, and confirm that pages now say `index, follow`:

   ```bash
   grep -h 'name="robots"' website/index.html website/faq/index.html
   ```

3. Deploy the approved build, then confirm these open in a browser:
   - `https://YOUR-DOMAIN/robots.txt` (its last line names the sitemap);
   - `https://YOUR-DOMAIN/sitemap.xml`;
   - `https://YOUR-DOMAIN/faq/`.

## 1. Add a property
1. Sign in at https://search.google.com/search-console with the Google account that will own the site.
2. Choose **Add property**.
3. Pick a property type:
   - **Domain** (recommended): covers `https`, `http`, `www` and all subdomains. It needs DNS verification.
   - **URL prefix**: covers one exact origin such as `https://www.example.org/`. It allows other verification methods.

## 2. Verify ownership with DNS (Domain property)
1. Search Console shows a TXT record value that starts with `google-site-verification=`.
2. In your domain registrar's or DNS provider's dashboard, add a **TXT** record:
   - **Host / name:** `@` (the root of the domain). Some providers want the bare domain or leave it blank.
   - **Value:** the full `google-site-verification=...` string.
   - **TTL:** the default is fine.
3. Save, wait for DNS to update (minutes to a day or two), then press **Verify** in Search Console.
4. Leave the TXT record in place permanently. Removing it can un-verify the property.

The verification token is not a secret, but it belongs in DNS, not in this repository.

## 3. Submit the sitemap
1. In the verified property, open **Sitemaps**.
2. Enter `sitemap.xml` (the full URL is `https://YOUR-DOMAIN/sitemap.xml`) and submit.
3. Check that the status becomes **Success** and that the discovered page count matches the sitemap: currently 4 pages (home, FAQ, About and Privacy).
4. When pages change, update `brand.lastUpdated`, rebuild and redeploy. You do not need to resubmit the sitemap for normal updates.

## 4. URL inspection and indexing checks
1. Use **URL inspection** with `https://YOUR-DOMAIN/`.
2. Run **Test live URL**. Confirm:
   - "URL is available to Google";
   - **Indexing allowed** says yes. If it says "No: 'noindex' detected", the placeholder `siteUrl` is still set;
   - the **user-declared canonical** matches the URL;
   - **View tested page** shows the full content, which proves the content is crawlable without JavaScript.
3. Choose **Request indexing** for the home page and `/faq/`. Indexing is not guaranteed and can take days or weeks.
4. Repeat for `/about/` and `/privacy/` if they are not discovered on their own.

## 5. Ongoing checks
- **Pages** report: look for "Excluded by noindex", "Duplicate without user-selected canonical" or "Not found (404)".
- **Enhancements:** structured data issues, if Google reports any.
- After any redesign or domain change, re-run URL inspection on the home page.

## What not to do
- Don't buy SEO tools or paid indexing services. Search Console is free.
- Don't submit the placeholder domain or Netlify deploy-preview URLs.
- Don't add verification meta tags or files with tokens to the repository unless you choose that method deliberately. DNS verification needs no code change.
