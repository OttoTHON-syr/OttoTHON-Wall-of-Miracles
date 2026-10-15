# OttoTHON website

The main site for OttoTHON, Syracuse University's student-run dance marathon benefiting Upstate Golisano Children's Hospital.

Plain HTML, CSS and JavaScript. No framework, no build step, no packages to install. Hosted free on GitHub Pages.

**Not a coder?** Read [docs/HANDOFF.md](docs/HANDOFF.md). Everything on the site can be changed from the editor at `/admin`.

## How it works

```
index.html, events.html, wall-of-miracles.html,
get-involved.html, about.html, meet-the-team.html   Six tiny page shells. Each one just loads the script.
assets/site.js        Draws every page from the files in /content
assets/site.css       The design (colors and fonts come from content/settings.json)
assets/img/           Logos
assets/uploads/       Photos uploaded through the editor
content/              ALL the words, stories, people and events, as JSON files
admin/                The editor (Decap CMS). config.yml defines every form
cloudflare/editor-auth/   Small sign-in helper that lets Google-signed-in editors use the editor (tested by test.mjs)
admin/focus-widget.js   Adds the draggable photo focus box to the editor's photo fields
scripts/validate-content.mjs   Checks content before each deploy
scripts/sync-events.mjs        Copies OttoTHON events from the campus calendar feed (runs daily)
.github/workflows/static.yml   Deploys to GitHub Pages
```

The page shells never change. To change what the site says, you change a file in `content/`.

| File | What it holds |
| --- | --- |
| `content/settings.json` | Every page's wording, donate and register links, menu labels, color theme, stats |
| `content/kids.json` | Miracle kids on the Wall of Miracles wheel |
| `content/stories.json` | Success stories |
| `content/wednesdays.json` | Why Wednesdays posts (a future date schedules a post) |
| `content/board.json` | Executive board, in the order shown |
| `content/events.json` | Events (they sort into upcoming and past by date) |
| `content/events-feed.json` | OttoTHON events copied from the campus calendar every day. Written by a script, so do not edit it by hand |
| `content/ways.json` | The cards on Get involved |
| `content/faq.json` | FAQ questions and answers |

### Rules the site enforces

- A **kid or story** shows only if `published` is true **and** `approved` (family consent) is true.
- A **Why Wednesday** shows only on or after its date.
- Links must start with `https://`. Photos must live in `assets/`.
- If a content file is broken, the deploy stops and the live site stays as it was (`scripts/validate-content.mjs`).

## Events sync (daily)

`.github/workflows/sync-events.yml` runs once a day (and on demand from the Actions tab). It reads the Syracuse University public events feed (`https://cuseactivities.syr.edu/events.rss`), keeps only events hosted by **OttoTHON at Syracuse University**, skips cancelled ones, converts times to Syracuse time, and saves them to `content/events-feed.json`. If anything changed it commits the file and redeploys the site. If the feed is down, the run fails and the site keeps the last good copy.

- The feed lists every public student event on campus, so events are matched on the host name. To change the match, edit `MATCH` at the top of `scripts/sync-events.mjs`.
- The feed only looks about three months ahead. The script remembers finished events (up to 60) so "Where we've been" fills up over time. An upcoming event that disappears from the feed is treated as cancelled and removed.
- Events you add by hand in the editor win over synced ones with the same title and date. To hide a synced event, add the same title and date by hand and turn **Show on the site** off.
- Try it locally: `node scripts/sync-events.mjs` (or `--file saved-feed.xml` to test with a saved copy).

## Run it on your computer

The pages load their content with `fetch`, so open them through a local server, not by double-clicking.

```bash
python3 -m http.server 8000      # then visit http://localhost:8000
node scripts/validate-content.mjs   # optional: check the content files
```

To try the editor locally without signing in, also run `npx decap-server` in a second terminal and visit `http://localhost:8000/admin/`.

## Deploying

Push to `main`. The workflow in `.github/workflows/static.yml` checks the content and publishes the site. One-time setting: **Settings > Pages > Build and deployment > Source: GitHub Actions**.

The editor's sign-in (editors use a Google account, no GitHub needed) needs a one-time setup. See [docs/ADMIN-SETUP.md](docs/ADMIN-SETUP.md). Until then, content can still be edited directly on GitHub (see [docs/HANDOFF.md](docs/HANDOFF.md)).

## Privacy

This repository is public, so every file in it, including drafts and unpublished entries, can be read by anyone. Never store consent forms, medical details, last names, or anything private here. Enter a child's story only after the family has approved it.

## Moving from the old version of this repo

The old version had `pages/`, `assets/main.js`, `assets/styles.css`, `assets/eboard-photos/`, and two loose images in `assets/`. All of those are replaced. Easiest path: delete everything in your local copy except `.git`, copy this folder's contents in, then commit and push.
