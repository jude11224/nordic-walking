# Healthy Futures

Static site (HTML/CSS) served by Cloudflare, plus a small Worker (`src/worker.js`)
that powers the owner-only calendar at `/calendar.html`.

## Calendar: one-time setup

Anyone can view the calendar. Only the owner can add, edit or delete events.

1. Deploy as usual. Cloudflare creates the `EVENTS` storage namespace automatically
   (declared in `wrangler.jsonc`).
2. Set the owner password (a secret, never stored in the repo):
   - Cloudflare dashboard -> Workers & Pages -> `healthy-futures` -> Settings ->
     Variables and Secrets -> add a **Secret** named `ADMIN_PASSWORD`, or
   - `npx wrangler secret put ADMIN_PASSWORD`
3. Open the site, click **Owner login** (bottom of the Calendar page or the footer),
   and sign in. Changing the secret signs everyone out.

Until `ADMIN_PASSWORD` is set, nobody can log in and the calendar is read-only.

## Registrations: one-time setup

The Register page (`/register.html`) sends each registration and waiver to a
Google Sheet, and Julie gets an email (to julie7747@gmail.com) for every one.
A small Google Apps Script attached to the Sheet does both. The email comes
from the Gmail account that owns the Sheet; replying goes to the person who
signed up.

1. In your Google account, make a new Google Sheet called
   "Healthy Futures Registrations". Click **Share**, add julie7747@gmail.com.
2. In the Sheet: **Extensions -> Apps Script**. Delete what's in the editor,
   paste in everything from `google-apps-script/Code.gs`, and click Save.
3. **Deploy -> New deployment**. Click the gear, pick **Web app**. Set
   "Execute as" to **Me** and "Who has access" to **Anyone**, then **Deploy**.
   Google asks you to allow access: pick your account, then **Advanced ->
   Go to ... (unsafe)** (that's normal for your own script) -> **Allow**.
   Copy the **Web app URL**.
4. Cloudflare dashboard -> Workers & Pages -> `healthy-futures` -> Settings ->
   Variables and Secrets -> **Add**. Type **Secret**, name
   `REGISTRATION_SHEET_URL`, value = the Web app URL.
5. Open `/api/status` on the live site and check `registrationSheet` is `true`.

Until step 4 is done, the form tells people it couldn't be sent and to call
Julie.

Good to know:
- Treat the Web app URL like a password: anyone with it can add rows.
- If you change `Code.gs` later, use **Deploy -> Manage deployments -> Edit ->
  Version: New version** so the URL stays the same.
- Gmail lets a script send about 100 emails a day, which is plenty.
- Julie can add the Sheet owner's Gmail address to her contacts so these never
  land in spam.
- Every form is also saved as a backup in Cloudflare: dashboard -> Storage &
  databases -> Workers KV -> `REGISTRATIONS`, named by the date and time it
  was sent.
- The waiver wording lives in two places, `register.html` and `WAIVER` in
  `src/worker.js`; change both together.

## Local preview

    npx wrangler dev --var ADMIN_PASSWORD:choose-a-test-password
