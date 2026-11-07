# Registration and Email

**Production status:** the user confirms Google Sheets and email delivery are already set up and working. No replacement setup is needed. Onboarding did not independently test the deployed integration.

## Data flow

1. `register.html` and `custom/js/register.js` collect the registration and waiver.
2. `POST /api/register` validates input in `src/worker.js`.
3. The Worker attempts a backup in `REGISTRATIONS` KV.
4. The Worker posts to the existing Google Apps Script endpoint, configured by the Cloudflare secret `REGISTRATION_SHEET_URL`.
5. `google-apps-script/Code.gs` appends to the first Sheet tab and sends an email notification to Julie. Replies go to the registrant.

The Worker reports success only after the Sheet endpoint returns JSON with `ok: true`. A delivery error returns 502 even if the backup was saved. Do not assume that a backup means an email was delivered.

The form supports Balance, Posture, Gait; Nordic Walking; and Stretch and Strengthen. It collects contact details, date of birth, health notes, consent, and a typed signature.

## Maintenance

- Keep waiver text aligned between `register.html` and `WAIVER` in `src/worker.js`.
- After an intentional Apps Script change, update its existing deployment to a new version so its URL stays the same.
- `/api/status` indicates whether bindings are present; it does not prove end-to-end delivery.
- Keep endpoint URLs, passwords, and registration records out of this vault.

The local development instance lacks the Sheet URL; that does not describe production configuration. See [[Local Development]], [[Deployment]], and the repository README for integration reference.
