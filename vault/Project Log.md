# Project Log

## 2026-11-08 — November walks published

- Added Julie's four November walks through the live owner calendar. Verified the dates and locations on the public API, with blank times as supplied and both October events still present.

## 2026-11-08 — Julie's page updates published

- Pushed commit `160cce3` to GitHub `main`. The connected Cloudflare Workers build passed and deployed to healthyfuturesnow.com.
- Verified the live homepage, biography, gallery, walking locations and ACTIVATOR brochure. Checked that the two video assets and portrait are served and the internal email audit is excluded. The live status endpoint reports that the calendar and registration bindings are present.
- Opened the owner sign-in for the four November calendar entries. The public calendar still had two October events when checked after deployment.

## 2026-11-08 — Julie email audit

- Reviewed 45 messages from Julie dated October 25 through November 8. Confirmed the October 31 homepage copy and layout requests in the checkout and matched that photo and video batch to its site placements.
- Restored the November 5 navigation, branding, location, bio, gallery and brochure edits from the email checklist. Kept the portrait supplied in the follow-up. Located the missing standing stretch clip in Downloads and added a browser compatible copy. Removed the audio track from the Wednesday walking clip.
- Verified 10 HTML pages, 321 local references, media responses, the calendar API and the internal report exclusion through local Wrangler. Confirmed the moved and updated videos decode. The Cloudflare deployment dry run passed.
- The live site still serves the older pages. The local Wrangler CLI has no Cloudflare login. The live calendar has no November events and Brave showed the owner sign-in button. Recorded all four dates and locations in [[Calendar Operations]] pending owner access.

## 2026-11-06 — Windows repository moved out of OneDrive

- Confirmed Windows Documents resolves to `C:\Users\jude0\Documents`.
- Reconciled the local checkout with the newer OneDrive Git history at `7a5f0ab`, preserving local working files and a branch pointing to the former local main revision.
- Compared all 120 source working files with the active Documents copy; no files were missing and contents matched after accounting for line endings. Extra local photos and notes were preserved.
- Archived the former OneDrive checkout in `C:\Users\jude0\Documents\Repository Backups\nordic-walking-from-OneDrive`.
- Used GitHub Desktop's Locate action to point its existing repository entry to `C:\Users\jude0\Documents\GitHub\nordic-walking`. Confirmed Codex and Obsidian already use that local folder. No website deployment was performed.

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


## 2026-11-19 — Approved gallery reconciliation, local only

- Audited the live site and Julie's gallery emails before approval, then implemented the approved 41-photo plan locally. Added six absent photos, descriptive canonical filenames and specific alt text; updated references across all ten HTML pages. Preserved all existing media and archived all photo originals, including the Glacier Park HEIC and both crops of the November 11 footbridge photograph.
- Converted Glacier Park to a web JPEG, placed it immediately before the water-strider image in an unbreakable column group, and used the exact caption “Water Strider found at Glacier Park”. Removed the repeated gallery header photo. Updated the Nordic Walking gallery teaser and four-week class wording.
- Verified 41 unique photo paths/file hashes/decoded-pixel hashes, 41 original-to-web visual matches, all 316 local HTML references, 43 successful JPEG responses/decodes including posters, and exclusion of originals/internal documentation from static serving. All 89 pre-existing media files remain byte-for-byte unchanged.
- Browser QA passed at desktop 1267 × 943 and mobile 390 × 844: all 41 photos loaded, the pair stayed consecutive in one column, and neither layout overflowed horizontally. Recorded the full mapping and source provenance in `docs/gallery-photo-inventory.md` and JSON.
- Corrected the calendar note: the earlier live audit now shows 11:00 AM for all four November walks, rather than the older recorded all-day display. Calendar data was not changed. Carried the optional YMCA photo, ambient-audio question and unreconciled video emails into Tasks.
- No commit, push or deployment was performed. Google Sheets/email remains user-confirmed working in production; no registrations were submitted.
