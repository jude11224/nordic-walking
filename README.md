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

## Registration emails: one-time setup

The Register page (`/register.html`) emails each registration and waiver to
julie7747@gmail.com. It uses Cloudflare Email Service (still in beta), which
has to be switched on once for the site's domain:

1. Cloudflare dashboard -> Compute -> Email Service -> Email Sending ->
   **Onboard Domain** -> pick `healthyfuturesnow.com`. Cloudflare adds the DNS
   records it needs by itself.
2. If Cloudflare asks to verify julie7747@gmail.com, Julie clicks the link in
   the email it sends her.
3. Deploy, then open `/api/status` on the live site and check that
   `registrationEmail` and `registrationsStorage` both say `true`.

Every form is also saved as a backup, even if the email fails. To see them:
Cloudflare dashboard -> Storage & Databases -> Workers KV -> `REGISTRATIONS`.

The sending address (`registration@healthyfuturesnow.com`) is set at the top of
`src/worker.js`. The waiver wording lives in two places, `register.html` and
`WAIVER` in `src/worker.js`; change both together.

## Local preview

    npx wrangler dev --var ADMIN_PASSWORD:choose-a-test-password
