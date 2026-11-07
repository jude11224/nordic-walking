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

See [[Local Development]] and [[Deployment]].
