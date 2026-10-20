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

## Registrations

The Register page (`/register.html`) saves each registration and waiver in
Cloudflare. To see them: Cloudflare dashboard -> Storage & databases ->
Workers KV -> `REGISTRATIONS`. Each entry is named by the date and time it was
sent.

Emailing them to julie7747@gmail.com is built in but switched off, because
Cloudflare Email Sending needs the Workers Paid plan ($5/month). To turn it on:

1. Upgrade to Workers Paid, then Cloudflare dashboard -> Compute -> Email
   Service -> Email Sending -> **Onboard Domain** -> pick
   `healthyfuturesnow.com` and add the records it suggests. Don't use Email
   Routing instead: it would take over the domain's MX records, and mail to
   the Namecheap Private Email inbox would stop arriving.
2. Add this to `wrangler.jsonc` and deploy:

       "send_email": [
         { "name": "REGISTRATION_EMAIL", "destination_address": "julie7747@gmail.com" }
       ]

3. Open `/api/status` on the live site and check `registrationEmail` is `true`.

The sending address (`registration@healthyfuturesnow.com`) is set at the top of
`src/worker.js`. The waiver wording lives in two places, `register.html` and
`WAIVER` in `src/worker.js`; change both together.

## Local preview

    npx wrangler dev --var ADMIN_PASSWORD:choose-a-test-password
