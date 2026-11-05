# Sign-in on the public website (Clerk)

**Status (2026-11-05):** live on https://vibeheal.online. All five Clerk DNS records resolve, and the sign-up window opens on the live site. Decisions: DEC-31 (sign-in) and DEC-32 (account, members, studio, waitlist link). If Clerk's scripts ever fail to load, the header simply shows no account controls; the rest of the site, including the waitlist form, is unaffected.

## What it does
- Every page loads Clerk's browser SDK from the Frontend API host `clerk.vibeheal.online`, then `website/auth.js`. Clerk's telemetry is turned off.
- **Header:** signed-out visitors see **Sign in** and **Sign up**, which open Clerk's windows. Signed-in visitors see:
  - a **Members** link;
  - a **Studio** link, for admins only;
  - Clerk's user button, whose "Manage account" option opens `/account/`.
- **`/account/`:** Clerk's profile component, where users change their email, password and connected accounts, see active devices, and delete their account. It also shows whether this account joined the waitlist.
- **`/members/`:** early-access updates (the latest blog posts) and the user's waitlist status, shown only after sign-in. **Not a security boundary:** the content is in the public HTML, so nothing secret may go there.
- **`/studio/`:** the content studio for accounts with `publicMetadata.role = "admin"` (see [BLOG.md](./BLOG.md)).
- **Waitlist link:** when a signed-in user opens the waitlist form, their email and name are filled in. After they join, `waitlistJoinedAt` is saved in their Clerk `unsafeMetadata`, so the account and members pages can show it. Users can edit this metadata themselves, so it is only a display hint: Netlify Forms remains the record of who joined.
- Signed-out visitors to `/account/`, `/members/` or `/studio/` get Clerk's sign-in form in the page. These pages are `noindex` and are not in the sitemap.
- An account gives **no product access yet**.

## Configuration
| Where | What |
|---|---|
| `site/brand.json` → `auth.clerkPublishableKey` | The **publishable** key (`pk_live_...` for vibeheal.online). It is public by design: it appears in every page's source. Empty turns sign-in off everywhere. |
| `netlify.toml` → `Content-Security-Policy` | Allows `https://clerk.vibeheal.online`, `https://challenges.cloudflare.com` (bot check), `https://*.protect.clerk.com` (fraud protection), `https://img.clerk.com` (avatars), `worker-src blob:` and `style-src 'unsafe-inline'` (Clerk's components inject styles). One `sha256-...` hash allows the single inline script that Clerk's fraud-protection frame runs. If the browser console reports a new hash after a Clerk update, replace it. `script-src` still has no `'unsafe-inline'` or `'unsafe-eval'`. |
| Clerk application | `app_3Lh3rRWGnIOZBd8TqFnC1RMMczr` (production instance for `vibeheal.online`) |

The build derives the Frontend API host from the key. Tests check that the CSP allows exactly that host, that only Clerk's two scripts are loaded from outside the site, and that no secret key (`sk_...`) appears in any published file.

**Never put the secret key (`sk_live_...` / `sk_test_...`) in this repository, the website or a chat.** This static site does not need it.

## Owner steps
1. **DNS: done** (2026-11-05). All five records (`clerk`, `accounts`, `clkmail`, `clk._domainkey`, `clk2._domainkey`) resolve to Clerk.
2. **Rename the application** in the Clerk Dashboard (**Settings → General**): the sign-in box currently says "Vibe Heal AI".
3. **Make yourself an admin:** after signing up on https://vibeheal.online, open the Clerk Dashboard → **Users** → your user → **Metadata** → **Public**, set `{"role": "admin"}` and save. The **Studio** link then appears in the header.
4. **Google and GitHub sign-in (optional).** Clerk's production instance needs your own OAuth credentials. These are free, but only you can create them:
   - **Google:** in Google Cloud Console, create a project, configure the OAuth consent screen (set it to **In production**), and create an **OAuth client ID** of type *Web application*. Copy the **Authorized redirect URI** from Clerk Dashboard → **User & authentication → SSO connections → Google**, and paste the client ID and secret back into Clerk.
   - **GitHub:** go to GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**. Set the homepage to `https://vibeheal.online` and the callback URL to the one Clerk shows under **SSO connections → GitHub**, then paste the client ID and secret into Clerk.

   The secrets go only into the Clerk Dashboard, never into this repository or a chat. The sign-in and sign-up windows show the new buttons automatically; no code change is needed.
5. **Decide retention** for account data, and add it to the privacy notice.

## Limits and notes
- **Deploy previews and `*.netlify.app`:** a production key only works on `vibeheal.online`, so previews show no sign-in controls. To test on previews, use a development instance key (`pk_test_...`) in a branch, never merged.
- **Cost:** Clerk's Hobby plan is free up to 50,000 monthly retained users per app (checked 2026-11-05 on clerk.com/pricing). Paid add-ons are not used.
- **Roles are display-only on this static site.** Real access control (for example, protecting data) needs server code that verifies Clerk session tokens with the secret key. That is deliberately not built (owner decision 2026-11-05: no server code).
- **Turning it off:** set `auth.clerkPublishableKey` to `""`, run `npm run build:site`, and tighten the CSP in `netlify.toml` back to `'self'`.
- The desktop app and the local backend do not use these accounts (DEC-23).
