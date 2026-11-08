# Calendar Operations

Everyone can view events. Owner login is required to create, edit, or delete them. The deployed owner password is the `ADMIN_PASSWORD` Cloudflare secret. Changing it invalidates existing sessions.

| Route | Purpose |
| --- | --- |
| `GET /api/events` | List events |
| `GET /api/session` | Check owner session |
| `POST /api/login` | Sign in |
| `POST /api/logout` | Sign out |
| `POST /api/events` | Create event |
| `PUT /api/events/:id` | Edit event |
| `DELETE /api/events/:id` | Delete event |

Events are kept in the `EVENTS` KV binding under `events`. Event data includes title, date, start/end times, location, notes, repeat mode, and repeat end date. Repeat modes are none, weekly, and biweekly. The Worker limits storage to 1,000 events.

Sources: `calendar.html`, `custom/js/calendar.js`, `src/worker.js`.

## November 2026 Wednesday walks

Julie's November 5 follow-up resolves the November 18 location. The email gives dates and locations. It gives no start or end times.

| Date | Location |
| --- | --- |
| November 4 | Moore Woods |
| November 11 | Grills Preserve, Westerly |
| November 18 | Spellman Park, Stonington |
| November 25 | Roaring Brook Trail, Hopkinton |

On November 8, the live calendar showed no November events. Adding the four walks requires an owner session. [Julie's schedule email](https://mail.google.com/mail/u/0/#all/1a1ac669db4c8ac8).

See [[Local Development]] and [[Deployment]].
