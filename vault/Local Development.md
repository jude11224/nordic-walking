# Local Development

## Windows checkout

The active Windows checkout is `C:\Users\jude0\Documents\GitHub\nordic-walking`, outside OneDrive. GitHub Desktop, this Codex project, and the open Obsidian vault use this local folder.

The former OneDrive checkout was archived at `C:\Users\jude0\Documents\Repository Backups\nordic-walking-from-OneDrive`. Use the active checkout for ongoing work; the archived folder is a backup. The migration preserved the newer Git history and the local untracked files.

## Managed cloud development

Use the existing `/workspace/nordic-walking` checkout. Cloud tasks are already isolated; create a Git worktree only if explicitly requested.

Onboarding used Node 24 and Wrangler 4.158.0, installed outside the checkout:

```bash
npm install --prefix /workspace/.nordic-walking-tools --no-audit --no-fund --save-exact wrangler@4.158.0
cd /workspace/nordic-walking
WRANGLER_LOG_PATH=/workspace/.nordic-walking-tools/logs WRANGLER_SEND_METRICS=false /workspace/.nordic-walking-tools/node_modules/.bin/wrangler dev --local --ip 127.0.0.1 --port 8787 --var ADMIN_PASSWORD:local-development-only
```

The password above is a public local test fixture. Local KV state is stored in ignored `.wrangler/state`. Running services must restart in a new task. Preserve inherited proxy and CA settings.

## Readiness checks

Use internal local HTTP requests to port 8787. Check that `/` serves HTML, `/api/events` returns an events array, and `/api/status` reports local KV bindings. Verify login, event creation, listing, editing, deletion, and logout. Remove only test events you created. Unauthorized event writes should return 401, invalid input 400, and cross-origin writes 403.

Onboarding passed those checks plus six static page/asset requests and readiness after restart. A `Request.cf` placeholder warning did not prevent those checks.

The local instance has no `REGISTRATION_SHEET_URL`. That is separate from the deployed integration, which the user confirms is working. Do not send real registrations during routine local checks.

See [[Project Log]] and [[Registration and Email]].
