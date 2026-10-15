# Running the OttoTHON website (no coding needed)

You can run the whole site from a web page, about 10 to 15 minutes a week. You never open a code editor.

The site lives at **https://ottothon-syr.github.io/OttoTHON-Wall-of-Miracles/** (update this line if the address changes).
The editor lives at the same address plus **/admin/**.

## The weekly routine

1. Open the editor (the site address plus `/admin/`) and sign in with your Google account. The button says "Login with GitHub"; ignore that, it opens Google.
2. **Why Wednesdays:** add this week's post (see below).
3. **Events:** OttoTHON events from the campus calendar appear on their own every day. Add anything that is not on the campus calendar. Old events move to "Where we've been" on their own.
4. Look at the open drafts. Publish what's ready, or ask someone to review it.

## How editing works

Every change is a **draft** first. In the editor:

1. Open a section (for example *Why Wednesdays*), change something, and press **Save**.
2. Press **Set status** and choose **In review**, then **Ready** when someone has checked it.
3. Press **Publish**, then **Publish now**.
4. Wait 1 to 2 minutes. The site updates by itself.

If anything looks wrong, don't publish. Delete the draft, or ask another admin.

## Common jobs

**Add a Why Wednesday.** *Why Wednesdays*, then *Add*. Fill in the title, who wrote it (type their name exactly as it appears in Meet the team so their photo shows), the date it should appear, and the post. Turn **Show on the site** on. A future date schedules it.

**Add a Miracle Kid.** Get the family's written approval first. Then *Miracle kids*, then *Add*. Use first name and last initial only, no medical details. Upload only an approved photo. Tick **Family consent and photo approval confirmed**, and turn **Show on the site** on. Both must be on or the kid stays hidden.

**Change who appears first on the wheel.** In *Miracle kids*, drag a kid to the top of the list. The order in the list is the order on the wheel.

**Add or change an event.** *Events*, then *Add*. Past events show up under "Where we've been" automatically. Events posted to the campus calendar (cuseactivities.syr.edu) under **OttoTHON at Syracuse University** are copied in by themselves every morning. To fix the wording of one of those, add it by hand with the same title and date and your version is used instead. To hide one, do the same and turn **Show on the site** off.

**Make the events update right now.** On GitHub, open the *Actions* tab, choose *Sync OttoTHON events*, then *Run workflow*.

**Add the Donate and Register buttons.** *Words, links and appearance*, then *Links and contact*. Paste the full web addresses (they start with `https://`). The buttons stay hidden until you do.

**Change the colors or fonts.** *Words, links and appearance*, then *Appearance*. Pick a color theme and font. Nothing else needs touching.

**Change any wording.** *Words, links and appearance*. Every sentence on every page is in there, grouped by page.

**Add or remove an editor.** In Cloudflare Zero Trust, Access, Applications, edit the Allow policy and add or remove their Google email (see [ADMIN-SETUP.md](ADMIN-SETUP.md)).

**Choose which part of a photo shows.** Photos are cropped to fit their frame, and sometimes someone gets cut off. Open the Photo Focus Tool at the site address plus `/admin/focus.html`, choose the same photo, and drag the box over the part that should show. Copy the two numbers into **Photo focus: left to right** and **Photo focus: top to bottom** on that person, kid, story or event, then publish. Leaving them empty uses the middle (a little above the middle for people, so faces stay in frame).

**Update the E-Board.** *E-Board*, then add, edit, or drag people into the order you want. For each person choose where they appear: **Executive Director** (full-width card at the top), **Director** (two-column grid), or **Team member** (three-column grid under their team). For team members type the team name the same way for everyone on it, for example *Finance Team*. For a director, type the team they lead so that team appears under them.

## The final test

Before you hand this over, give a new member this page and ask them to do these three things without help:

1. Add a Why Wednesday post and schedule it for next week.
2. Change which Miracle Kid shows first on the wheel.
3. Switch the color theme and publish it.

If they can, the site is ready to hand off.

## Ownership checklist (do this before graduating)

- [ ] The GitHub repository belongs to an OttoTHON or university **organization**, not a personal account. (Repository, Settings, scroll to *Transfer*.)
- [ ] At least **two** current members are organization owners.
- [ ] Settings, Pages, Source is set to **GitHub Actions**.
- [ ] The editor sign-in is set up and **two people have signed in successfully** ([ADMIN-SETUP.md](ADMIN-SETUP.md)). Write down who owns the bot GitHub account, the Cloudflare account, and the Google Cloud project.
- [ ] The list of allowed editor emails in Cloudflare Access is current.
- [ ] The Donate and Register links are filled in.
- [ ] Every E-Board member has an intro line.
- [ ] Someone other than you has run the site for a few weeks.
- [ ] The three-task test above has been passed.
- [ ] This list of accounts is saved where the next E-Board can find it: GitHub organization, sign-in helper account, any custom domain.

**Cost:** nothing. GitHub Pages is free, and the sign-in helper and Cloudflare Access normally fit free tiers (check current limits).

## If the editor is down

The editor is a convenience. You can always change the site directly on GitHub:

1. Open the repository on github.com and go to the `content` folder.
2. Click the file you want, for example `events.json`, then the pencil icon.
3. Copy an existing entry, paste it, and change the words between the quotes. Keep the commas and brackets exactly as they are. An entry looks like this:

```json
{
  "title": "Spirit night",
  "date": "2026-11-18",
  "place": "Schine, 7pm",
  "desc": "Come dance with us.",
  "link": "",
  "published": true
},
```

4. Press **Commit changes**. The site updates in 1 to 2 minutes.

If you make a mistake, the site checks the file before publishing. The **Actions** tab will show a red ✗ with a plain message saying which entry to fix, and the live site stays as it was.

## If the events stop updating

1. Open the *Actions* tab and look at the latest *Sync OttoTHON events* run. A red ✗ means the campus feed was down or changed; it usually fixes itself the next day, and the site keeps showing the last good events.
2. GitHub pauses scheduled jobs in a repository that has had no activity for 60 days. If the runs have stopped, open the *Sync OttoTHON events* workflow and press **Enable workflow**, then **Run workflow**.
3. Make sure your events are posted under the host name **OttoTHON at Syracuse University** on the campus calendar. Events under a different name are not picked up.

## Undoing a mistake

On GitHub, open the file, press **History**, find the last good version, and use the three dots menu to view it and copy it back. Or ask an admin to use **Revert** on the change in the *Pull requests* tab.

## Privacy rules

- Publish only photos and text that the family approved in writing.
- First name and last initial only. No medical details, no last names, no school or neighborhood.
- **This repository is public.** Drafts and hidden entries can still be read by anyone on GitHub. Enter a child's story only after the family approves it.
- Keep consent forms in a locked folder the E-Board owns, never in this repository.
