# GitHub App setup (for live GitHub testing)

**Status:** written 2026-10-31. **This is optional and only the owner can do it (P-11).** VibeHeal does not create accounts or apps for you (DEC-22). Until these steps are done, GitHub shows **Not configured** in the marketplace. Everything else keeps working.

**Cost:** registering a GitHub App is free. Nothing here enables billing. Do not add a payment method or enable paid features for this.

**Not yet verified:** docs.github.com could not be reached from the build environment on 2026-10-31. Check the setting names below against GitHub's current documentation before you rely on them (unknown U14):
- [Registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
- [About the setup URL](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-setup-url)
- [Generating a user access token for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)

## 1. Register the app

In GitHub, go to **Settings → Developer settings → GitHub Apps → New GitHub App** and fill in the form.

| Setting | Value |
|---|---|
| GitHub App name | Something unique, for example `vibeheal-dev-<yourname>`. The URL-friendly form of the name is the **slug** |
| Homepage URL | Any URL you control (it is required); the repository URL is fine |
| Callback URL | `http://127.0.0.1:8787/v1/callback/github` (must match `VIBEHEAL_PUBLIC_URL` + `/v1/callback/github`) |
| Request user authorization (OAuth) during installation | **Enabled.** VibeHeal uses the short-lived user authorization only to confirm you can access the installation, then revokes it (SECURITY.md IN-10) |
| Expire user authorization tokens | Enabled (default) |
| Setup URL | Leave empty; GitHub uses the callback URL when user authorization during installation is enabled [U14] |
| Webhook → Active | **Disabled.** VibeHeal does not use webhooks yet, and a local backend has no public URL |
| Where can this GitHub App be installed? | **Only on this account** |

## 2. Permissions (read-only only)

Repository permissions:

| Permission | Access | Used for |
|---|---|---|
| Metadata | Read-only (GitHub sets this automatically) | Repository list and details |
| Contents | Read-only | Branches and commits |
| Pull requests | Read-only | Pull request list |

**Set nothing else.** Leave organization and account permissions at **No access**. VibeHeal refuses to connect an installation that has any write or admin permission (`mapPermissions` in `server/providers/github/adapter.ts`).

## 3. Collect the settings

After you create the app:
1. Note the **App ID** and **Client ID** from the app's settings page.
2. Click **Generate a new client secret** and copy it. It is shown only once.
3. Under **Private keys**, click **Generate a private key**. A `.pem` file downloads.
   - Store it **outside** the repository, for example `C:\Users\you\vibeheal-secrets\github-app.pem` or `~/.vibeheal/github-app.pem`.
   - Never commit it. `*.pem` is git-ignored as a safety net.

## 4. Configure the backend

Edit your local `.env` (created by `npm run setup:env`, git-ignored):

```text
GITHUB_APP_ID=<App ID>
GITHUB_APP_SLUG=<app slug, as in https://github.com/apps/<slug>>
GITHUB_APP_CLIENT_ID=<Client ID>
GITHUB_APP_CLIENT_SECRET=<client secret>
GITHUB_APP_PRIVATE_KEY_PATH=<absolute path to the .pem file>
```

Restart the backend (`npm run dev:server`). The startup log line should say `"github":"configured"`. If a setting is malformed, the backend refuses to start and names the setting (never its value).

## 5. Connect

1. In the VibeHeal desktop app, open **Integrations → GitHub → Connect**. Your browser opens GitHub's installation page.
2. Choose **Only select repositories** and pick the ones VibeHeal may read.
3. After you approve, GitHub redirects to the local backend. The backend then:
   - verifies the authorization `state` (single use, 10-minute expiry);
   - confirms your account can access the installation;
   - revokes the temporary user token;
   - checks the installation is read-only.
4. The browser shows "Connected". The desktop app updates within a few seconds.

## 6. Disconnect and revoke

**Disconnect** in VibeHeal:
- deletes VibeHeal's record of the installation;
- revokes its current installation token.

**To remove access completely**, uninstall the app in GitHub (**Settings → Applications → Installed GitHub Apps**). VibeHeal links to that page from the connection details. Uninstalling automatically was deliberately left out (pending decision P-13).

## What has and has not been tested
- **Tested (automated, with a fake GitHub API):**
  - JWT signing;
  - the install-callback verification, including spoofed installation ids;
  - refusal of write permissions;
  - token caching and revocation;
  - input validation;
  - error mapping;
  - data minimisation.
- **Not tested:** any call to the real GitHub API. Report the results here once the steps above have been done.
