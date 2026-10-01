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

## Local preview

    npx wrangler dev --var ADMIN_PASSWORD:choose-a-test-password
