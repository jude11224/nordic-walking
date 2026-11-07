# Project Log

## 2026-11-06 — Environment onboarding

- Prepared local development with Node 24 and Wrangler 4.158.0.
- Verified static pages/assets, local KV bindings, owner login/logout, calendar CRUD, invalid-input handling, and origin protection.
- Confirmed server readiness after restart and a clean repository checkout.
- Saved reusable environment installation and startup instructions.
- User confirmed the deployed Google Sheets/email integration is already set up and working. Local absence of its binding must not be interpreted as a production issue.

## 2026-11-06 — Vault created

Created linked site documentation outside the checkout. Notes describe the inspected repository and session observations; they are not an automated synchronization or a fresh production audit.

## 2026-11-06 — Agent workflow connected

Added `/workspace/AGENTS.md` to require consulting this vault before site work and updating relevant notes afterward. This is an agent workflow instruction, not a background synchronization service.

## 2026-11-06 — Vault added to repository

Copied all 21 notes and Obsidian settings into `vault/`. Added repository-root `AGENTS.md` with relative paths so agents can consult and update the vault after cloning or pulling. Excluded the vault and agent instructions from Cloudflare static assets. The former workspace copy is an archive; `vault/` is now authoritative.

## 2026-11-06 — Main branch publication

Prepared the vault and root agent instructions for main at the user’s request. Validated all 21 note links and Obsidian JSON settings. The remote main branch has a newer media-only commit; preserve it when integrating these documentation changes.
