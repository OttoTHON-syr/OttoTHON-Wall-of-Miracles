# Google sign-in for the editor: Google Cloud steps

This is step 5 of [ADMIN-SETUP.md](ADMIN-SETUP.md) in detail. You are creating a "sign in with Google" credential that Cloudflare Access uses. Nothing here touches your website or your Google data.

Google's console is renamed and rearranged fairly often, so menu names below may differ slightly. The values you type in do not change. Cloudflare's reference: https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/google

## Before you start

- Finish step 4 of ADMIN-SETUP.md first so you know your Cloudflare **team domain**. It is in Cloudflare Zero Trust under *Settings, General, Team domain* and looks like `ottothon.cloudflareaccess.com`. Below, it is written `TEAM.cloudflareaccess.com`.
- Use a **shared OttoTHON Google account** to own this project, not a personal one, so it survives graduation. (A Google account can be made with any email address.)

## Steps

1. Go to **console.cloud.google.com** and sign in with the shared account. Accept the terms if asked.
2. Click the project picker at the top, then **New project**. Name it `OttoTHON editor sign-in` and create it. Make sure it is the selected project.
3. **Set up the consent screen.** Search for "Google Auth Platform" (older name: *APIs & Services, OAuth consent screen*) and click **Get started**.
   - App name: `OttoTHON site editor`
   - User support email: the shared email
   - Audience: **External**
   - Contact email: the shared email
   - Agree and create.
4. **Create the credential.** In *Clients* (older: *Credentials, Create credentials, OAuth client ID*) choose **Create client**.
   - Application type: **Web application**
   - Name: `Cloudflare Access`
   - Authorized JavaScript origins: `https://TEAM.cloudflareaccess.com`
   - Authorized redirect URIs: `https://TEAM.cloudflareaccess.com/cdn-cgi/access/callback`
   - Create. Copy the **Client ID** and the **Client secret** into your password manager. The secret works like a password: never put it in the repository or share it in chat.
5. **Publish the app** so anyone on your allowed list can sign in, not just "test users". In *Audience*, find *Publishing status* and choose **Publish app / In production**. The editor only asks Google for basic sign-in details (email and profile), so Google should not require a verification review.
6. **Give Cloudflare the credential.** In Cloudflare Zero Trust go to *Settings, Authentication, Login methods, Add new, Google*. Paste the Client ID into **App ID** and the secret into **Client secret**. Save, then use **Test** next to it and sign in with Google.
7. **Add a second owner.** In Google Cloud, *IAM & Admin, IAM, Grant access*, add another trusted member with the **Owner** role, so the project is not stuck with one person.

Then continue with step 6 of ADMIN-SETUP.md.

## If something goes wrong

| What you see | What it means |
| --- | --- |
| `redirect_uri_mismatch` | The redirect URI doesn't match exactly. Check `https`, the team name, no trailing slash, and the `/cdn-cgi/access/callback` ending. Google can take a few minutes to apply changes. |
| "Access blocked" or "app not verified" | The app is still in *Testing*. Publish it (step 5), or add the person under *Audience, Test users*. |
| `Error 401: deleted_client` | The client was deleted in Google. Create a new one and paste the new ID and secret into Cloudflare. |
| Signed in, but Cloudflare says access denied | Google worked. Their email just isn't on the Access allow list yet. |
| Can't find a menu | Use the search bar at the top of the Google Cloud console and type the name, for example "Google Auth Platform". |
