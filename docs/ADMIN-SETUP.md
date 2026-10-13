# Making the editor work: sign in with Google

The editor at `/admin` ([Decap CMS](https://decapcms.org)) saves edits to this GitHub repository. With this setup **editors sign in with a Google account and never need GitHub**.

## How it works

1. An editor opens `/admin` and clicks the login button. (It says "Login with GitHub". That label is built into the editor and can't be changed. It will open a Google sign-in.)
2. **Cloudflare Access** asks them to sign in with Google and checks their email is on your allowed list.
3. A small helper (`cloudflare/editor-auth`) sees the approved login and gives the editor one shared GitHub **bot** token.
4. The editor saves changes as commits by the bot. The site redeploys by itself.

To add or remove an editor you change one list of emails in Cloudflare. No GitHub account, no passwords for you to manage.

**Things to know first**
- Everyone on the allowed list can edit and publish. Edits show in GitHub as made by the bot, not by the person. Cloudflare's Access logs record which Google account signed in.
- The helper fails closed: without a valid Cloudflare Access login it hands out nothing. Its logic is covered by `node cloudflare/editor-auth/test.mjs`.
- This setup involves three accounts (GitHub bot, Cloudflare, Google Cloud). Write down who owns each. See the checklist at the end.
- I have tested the helper's code offline. The full flow across Cloudflare, Google and the editor can only be confirmed on your accounts, so run the test in step 8 before relying on it.

## Part 1. The GitHub bot (about 10 minutes)

1. Create a new free GitHub account just for this, such as `ottothon-editor`, using a shared OttoTHON email address (not someone's personal one).
2. Give it **Write** access to this repository (repository *Settings, Collaborators*, or add it to a team that has Write access).
3. Signed in as the bot: *Settings, Developer settings, Personal access tokens, Tokens (classic), Generate new token*. Tick only **public_repo**. Choose "No expiration" if GitHub offers it, otherwise set a calendar reminder to replace the token before it expires. Copy the token. You will paste it once in step 6.

## Part 2. Cloudflare and Google

4. **Create a free Cloudflare account** (cloudflare.com) and open **Zero Trust**. Choose a team name. This gives you an address like `ottothon.cloudflareaccess.com`: that is your `TEAM_DOMAIN`. Cloudflare may ask for a payment method even on the free plan, which covers up to 50 users (check their current pricing page).
5. **Turn on Google sign-in.** (Detailed click-by-click version: [GOOGLE-SIGNIN.md](GOOGLE-SIGNIN.md).) In Google Cloud Console create a project, set up the OAuth consent screen, then *Credentials, Create credentials, OAuth client ID, Web application*. Add this as an authorized redirect URI: `https://YOUR-TEAM.cloudflareaccess.com/cdn-cgi/access/callback`. Copy the client ID and secret. In Cloudflare Zero Trust go to *Settings, Authentication, Login methods, Add new, Google* and paste them in.
   *Simpler alternative:* skip Google and use Cloudflare's built-in **One-time PIN**, which emails a code. Editors then need no Google account at all.
6. **Deploy the helper (dashboard route).** In Cloudflare: *Workers & Pages, Create, Start with Hello World*, name it `ottothon-editor-auth`, deploy, then *Edit code*, replace everything with the contents of `cloudflare/editor-auth/index.js`, and deploy again. Its address is `https://ottothon-editor-auth.YOUR-SUBDOMAIN.workers.dev`. Then open the Worker's *Settings, Variables and Secrets* and add:
   - `GITHUB_BOT_TOKEN`: type **Secret**, the bot token from step 3.
   - `SITE_ORIGIN`: type Text, the website's address with no path, for example `https://ottothon-syr.github.io`.
   (Prefer the command line? Edit `cloudflare/editor-auth/wrangler.toml` and run `npx wrangler deploy`, then `npx wrangler secret put GITHUB_BOT_TOKEN`.)
7. **Put Cloudflare Access in front of the helper.** In the Worker's *Settings, Domains & Routes*, find the `workers.dev` row, open its **...** menu and choose **Enable Cloudflare Access**. The dialog that appears shows two values: copy the **team domain** and the **AUD tag** and add them as Variables named `TEAM_DOMAIN` and `POLICY_AUD` (the helper accepts the team domain with or without `https://`). Then choose **Manage Cloudflare Access** and edit the policy: **Allow**, **Include: Emails**, and list your editors' Google emails (start with your own). Make sure Google is an allowed login method for the application. Deploy the Worker again after adding the variables.
8. **Point the editor at the helper and test.** In `admin/config.yml` set `base_url:` to the helper's address (no trailing slash) and commit. First open `https://YOUR-HELPER.workers.dev/auth` in your browser: you should be sent to Google, then see a plain "Signing in" page. A different Google account that is not on the list must be refused. Then open `/admin/`, click *Login with GitHub*, sign in with Google, make a small change, and publish it. Confirm the live site updates. Then try signing in with a Google account that is **not** on the list and confirm it is refused.

## Adding and removing editors

- **Add:** Zero Trust, *Access, Applications*, open the application, *Policies*, edit the Allow policy, and add the person's email. They can sign in right away.
- **Remove:** delete their email from the same list. They are locked out at their next sign-in, and existing sessions expire on Cloudflare's schedule (you can also revoke sessions there).
- **Tip:** put the emails in an Access **group** called Editors so it is one place to look.

## Optional: require a second person to approve

Everyone on the list can publish. If you want a second check, protect the `main` branch (*Settings, Branches, Require a pull request, Require approvals*) and keep one or two admins with GitHub accounts who approve changes. Editors then draft and an admin approves. Allow **github-actions[bot]** to bypass the rule so the daily events sync still works.

## If someone leaves or a token leaks

- Remove their email from the Access list.
- If an admin who knew the bot token leaves, create a new token (step 3), update the `GITHUB_BOT_TOKEN` secret, and revoke the old one.

## Who owns what (write this down)

- The shared email address used for the bot and Cloudflare, and who can read it.
- The GitHub bot account, and the repository's organization owners.
- The Cloudflare account (Worker, Access list, and the bot token secret).
- The Google Cloud project that holds the sign-in credentials.

## Without any of this

You can always edit the files in `content/` directly on github.com (see "If the editor is down" in [HANDOFF.md](HANDOFF.md)). To have editors use their own GitHub accounts instead, see [ADMIN-SETUP-GITHUB.md](ADMIN-SETUP-GITHUB.md).
