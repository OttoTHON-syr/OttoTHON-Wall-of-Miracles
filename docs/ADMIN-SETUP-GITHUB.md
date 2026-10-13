# Alternative: editors sign in with their own GitHub accounts

> The main guide, [ADMIN-SETUP.md](ADMIN-SETUP.md), lets editors sign in with **Google** and never touch GitHub. Use this page only if you would rather have every editor use a personal GitHub account.

The editor at `/admin` is [Decap CMS](https://decapcms.org). It saves every edit as a commit to this GitHub repository. That means:

- **People sign in with a GitHub account.** There is no separate list of emails and passwords inside the editor. A GitHub account *is* an email and password (plus optional two-step sign-in), and GitHub manages it.
- **"Adding a user" means giving a GitHub account write access to the repository.**

GitHub Pages has no server, so GitHub sign-in needs one small helper (a "sign-in proxy") that holds a secret. You set it up once.

Decap's reference: https://decapcms.org/docs/backends-overview/ (see "Using GitHub with an OAuth proxy").

## Part 1. One-time setup (about an hour)

**1. Move the repository to an organization** (recommended, so it outlives any one student).
GitHub, then *Your organizations, New organization* (free plan). In the repository: *Settings, scroll to Danger Zone, Transfer*. Afterwards update `repo:`, `site_url` and `display_url` in `admin/config.yml`.

**2. Create a free Cloudflare account** (cloudflare.com). The helper runs there as a Worker.

**3. Deploy the helper.** Use the open-source `decap-proxy` Cloudflare Worker (github.com/sterlingwes/decap-proxy) and follow its README. In short: copy it, set its name and web address in `wrangler.toml`, and deploy it. It is meant to live on its own address, separate from the website.

**4. Create a GitHub OAuth App.** GitHub, then *Settings (the organization's, if you moved it), Developer settings, OAuth Apps, New OAuth App*.
- *Homepage URL*: the website address.
- *Authorization callback URL*: the helper's address followed by `/callback` (the helper's README shows the exact form).
- Save, then copy the **Client ID** and generate a **Client secret**.

**5. Give the helper the two keys.** In Cloudflare open the Worker, then *Settings, Variables and Secrets*. Add two **Secrets**: `GITHUB_OAUTH_ID` (the Client ID) and `GITHUB_OAUTH_SECRET` (the Client secret). Never put these in the repository.

**6. Point the editor at the helper.** In `admin/config.yml` replace `https://YOUR-OAUTH-PROXY.example` with the helper's address and commit.

**7. Test.** Open `/admin/`, choose *Login with GitHub*, approve the app, make a small change, and publish it. Confirm the live site changes in a minute or two.

## Part 2. Adding a person (each time)

1. **They create a GitHub account** at github.com/signup with their email address and a password, and should turn on two-step sign-in (*Settings, Password and authentication*).
2. **You give them access.**
   - Organization: *People, Invite member*, using their GitHub username or email.
   - Easiest to manage: create a team called **Editors** (*Teams, New team*), give it **Write** access to this repository (*repository Settings, Collaborators and teams*), and add people to the team.
   - Not using an organization? *Repository, Settings, Collaborators, Add people*, role **Write**.
3. **They accept the invitation** from the email GitHub sends.
4. **They sign in** at `/admin/` with *Login with GitHub* and approve the app. If your organization restricts third-party apps, an organization owner must first approve the OAuth App (*Organization settings, Third-party access*).

**Removing a person:** remove them from the Editors team (or the collaborator list). Their access stops immediately.

**Who can do what:** anyone with Write access can edit and publish. To require a second person's approval first, protect the `main` branch: *Settings, Branches, Add rule, main, Require a pull request before merging, Require approvals (1)*. The daily events sync saves straight to `main`, so also add **github-actions[bot]** to that rule's bypass list.

## Who owns what (write this down)

- The GitHub organization and its owners (at least two).
- The OAuth App, and which account created it.
- The Cloudflare account that hosts the helper, and where the two secrets are stored. If the person who set this up leaves, the helper can be redeployed from its README with a new OAuth App.

## If you need your own email-and-password list instead

Decap has no built-in user database. The only Decap route with an "invite by email, they choose a password" screen is Netlify Identity with Git Gateway, which means hosting the editor through Netlify. I haven't checked Netlify's current plans for it, so confirm it is still supported before building a handoff on it. The other option is a different editor with its own user management, which means rebuilding the forms.

## Without any of this

You can always edit the files in `content/` directly on github.com. See "If the editor is down" in [HANDOFF.md](HANDOFF.md).
