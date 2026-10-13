# Setting up the editor sign-in (one time, about an hour)

The editor at `/admin` is [Decap CMS](https://decapcms.org). It saves edits as commits to this GitHub repository, so people sign in with their GitHub accounts.

GitHub Pages is a static host with no server, so GitHub's sign-in needs a small helper that holds a secret. That helper is the one piece you set up. It is a few lines of code on a free hosting tier. **Someone comfortable with GitHub should do this once**, ideally before the people who built the site graduate.

> Decap's own pages change over time. Where this guide says "see Decap's docs", follow their current steps:
> - GitHub backend: https://decapcms.org/docs/github-backend/
> - Sign-in helpers ("external OAuth clients"): https://decapcms.org/docs/external-oauth-clients/

## Steps

1. **Move the repository to an organization** (recommended). Create a GitHub organization for OttoTHON, then in the repository go to *Settings, Transfer*. Then update `repo:` in `admin/config.yml` and the two addresses in the same file (`site_url`, `display_url`).
2. **Create a GitHub OAuth App** (in the organization: *Settings, Developer settings, OAuth Apps, New*). Use the site address as the homepage URL. The callback URL comes from the helper you choose in the next step.
3. **Deploy a sign-in helper.** Decap's docs list community helpers. Free options include small Cloudflare Workers made for Decap. Follow the helper's README: it will ask for the OAuth App's *Client ID* and *Client secret*, which you store as the helper's secrets (never in this repository).
4. **Point the editor at the helper.** In `admin/config.yml`, replace `https://YOUR-OAUTH-PROXY.example` with the helper's address. Commit.
5. **Give editors access.** Add each editor as a collaborator (or organization member) with **write** access to the repository.
6. **Test.** Open `/admin/`, choose *Login with GitHub*, make a small change, press *Save*, then publish it. Confirm the live site changes.
7. **Have a second person do the same test** from their own account.

## Making approval mandatory (recommended)

The editor already makes every change a draft before it goes live. To require a second pair of eyes on everything, protect the `main` branch: *Settings, Branches, Add rule, main, Require a pull request before merging, Require approvals (1)*. Editors then need an admin to approve a change before it can be published.

> The daily events sync saves its file straight to `main`. If you turn this rule on, allow the **github-actions[bot]** to bypass it (in the branch rule, add it to the bypass list), or the sync will fail with a permissions error.

## Who owns what

Write these down in the handoff checklist:

- The GitHub organization and its owners.
- The OAuth App (lives under the organization or whoever created it).
- The helper's hosting account (for example, the Cloudflare account) and where its secrets are stored.

If the person who set this up leaves, the helper can be redeployed in minutes from its README, using a new OAuth App.

## If you want something simpler

[Sveltia CMS](https://github.com/sveltia/sveltia-cms) is a drop-in replacement for Decap that reads the same `config.yml`. It can sign in with a personal access token, so no helper is needed. The trade-off is that each editor has to create and keep a token, which is harder for non-coders and riskier to lose. If you try it, swap the script in `admin/index.html` and follow Sveltia's README.

## Without any of this

You can always edit the files in `content/` directly on github.com. See "If the editor is down" in [HANDOFF.md](HANDOFF.md).
