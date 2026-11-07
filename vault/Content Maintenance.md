# Content Maintenance

Use [[Site Map]] to locate a page. The site is edited directly in HTML, with shared styles in `custom/css/style.css` and shared browser behavior in `custom/js/site.js`.

## Editing checklist

- Check page headings, navigation, contact links, and mobile layout.
- Shared navigation and footers appear in multiple HTML files; keep edits consistent where applicable.
- Use web-optimized media from `img/web/` and meaningful image alternative text.
- Keep waiver text aligned in `register.html` and `src/worker.js`.
- Check calendar and registration behavior when changing their markup or scripts.

`.assetsignore` excludes original media, tooling, and server source from static uploads. Cloudflare rejects individual uploaded assets over 25 MiB, as noted in the repository ignore file.

The old `strength_and_fitness` URL redirects to `balance_posture_gait` through `_redirects`.

Use [[Change Note]] as a template for recording changes. See [[Deployment]] before publishing.
