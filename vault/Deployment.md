# Deployment

Cloudflare Worker name: `healthy-futures`.
Configuration: `wrangler.jsonc`.
Worker entry: `src/worker.js`.
Compatibility date in the checkout: `2026-09-26`.

| Binding | Role |
| --- | --- |
| `ASSETS` | Static website files |
| `EVENTS` | Calendar data |
| `REGISTRATIONS` | Registration backups |
| `ADMIN_PASSWORD` | Owner login secret |
| `REGISTRATION_SHEET_URL` | Existing Google Apps Script endpoint secret |

`keep_vars: true` preserves dashboard-managed variables during deployment. Do not remove existing production bindings. The Google Sheets/email integration is already working, per the user.

Routine vault maintenance and local development do not deploy the site. For an explicitly requested deployment, use the repository configuration and existing authorized Cloudflare access; inspect the resulting deployment and perform appropriate checks. Do not recreate the Sheet or rotate credentials as a default setup step.

Cloud development environment publication is separate from deploying the website. The saved environment install/start instructions prepare future development tasks.

See [[Architecture]], [[Registration and Email]], and [[Local Development]].
