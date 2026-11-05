# Sign-in on the public website (Clerk)

**Status (2026-11-05):** code implemented and tested (automated tests, plus a browser check against a stand-in for Clerk). **Sign-in does not work on the live site yet**, because Clerk's DNS records for `vibeheal.online` don't exist. Until they do, Clerk's scripts fail to load and the header simply shows no account controls; the rest of the site, including the waitlist form, is unaffected. Decision: DEC-31.

## What it does
- Every page loads Clerk's browser SDK from the Frontend API host `clerk.vibeheal.online`, then `website/auth.js`.
- The header shows **Sign in** and **Sign up** buttons, which open Clerk's sign-in and sign-up windows. Once signed in, the buttons are replaced by Clerk's user button (account settings and sign out).
- An account gives **no product access yet**. It is separate from the waitlist.
- Clerk's telemetry is turned off in `auth.js`.

## Configuration
| Where | What |
|---|---|
| `site/brand.json` → `auth.clerkPublishableKey` | The **publishable** key (`pk_live_...` for vibeheal.online). It is public by design: it appears in every page's source. Empty turns sign-in off everywhere. |
| `netlify.toml` → `Content-Security-Policy` | Allows `https://clerk.vibeheal.online`, `https://challenges.cloudflare.com` (bot check), `https://*.protect.clerk.com` (fraud protection), `https://img.clerk.com` (avatars), `worker-src blob:` and `style-src 'unsafe-inline'` (Clerk's components inject styles). `script-src` still has no `'unsafe-inline'` or `'unsafe-eval'`. |
| Clerk application | `app_3Lh3rRWGnIOZBd8TqFnC1RMMczr` (production instance for `vibeheal.online`) |

The build derives the Frontend API host from the key. Tests check that the CSP allows exactly that host, that only Clerk's two scripts are loaded from outside the site, and that no secret key (`sk_...`) appears in any published file.

**Never put the secret key (`sk_live_...` / `sk_test_...`) in this repository, the website or a chat.** This static site does not need it.

## Owner steps to make sign-in work
1. **Add Clerk's DNS records.** In the Clerk Dashboard, open the production instance → **Domains**. It lists CNAME records (typically `clerk`, `accounts`, `clkmail`, `clk._domainkey` and `clk2._domainkey`). In Netlify, open **Domains → vibeheal.online → DNS settings** and add each record exactly as shown. Wait for Clerk to show them as verified; Clerk then issues the certificates. Or run `npx -y clerk@latest deploy status` from your own terminal after `npx -y clerk@latest auth login` and follow what it prints.
2. **Choose sign-in methods** (email, Google, GitHub and so on) in the Clerk Dashboard → **User & authentication**. Social providers in production need your own OAuth credentials.
3. **Check it:** open https://vibeheal.online, choose **Sign up**, and create your account. The profile icon should replace the buttons.
4. **Decide retention** for account data, and add it to the privacy notice.

## Limits and notes
- **Deploy previews and `*.netlify.app`:** a production key only works on `vibeheal.online`, so previews show no sign-in controls. To test on previews, use a development instance key (`pk_test_...`) in a branch, never merged.
- **Cost:** Clerk's Hobby plan is free up to 50,000 monthly retained users per app (checked 2026-11-05 on clerk.com/pricing). Paid add-ons are not used.
- **Turning it off:** set `auth.clerkPublishableKey` to `""`, run `npm run build:site`, and tighten the CSP in `netlify.toml` back to `'self'`.
- The desktop app and the local backend do not use these accounts (DEC-23).
