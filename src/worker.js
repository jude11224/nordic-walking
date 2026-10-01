// Healthy Futures — calendar API
//
// Everything except /api/* is served as static files by Cloudflare. This
// Worker only handles the calendar:
//
//   GET    /api/events        public   list all events
//   GET    /api/session       public   { owner: true|false }
//   POST   /api/login         public   { password } -> sets owner cookie
//   POST   /api/logout        public   clears owner cookie
//   POST   /api/events        owner    add an event
//   PUT    /api/events/:id    owner    update an event
//   DELETE /api/events/:id    owner    remove an event
//
// Setup (once): set the owner password as a secret named ADMIN_PASSWORD.
//   npx wrangler secret put ADMIN_PASSWORD
// Events are stored in the EVENTS KV namespace (created automatically on
// deploy from wrangler.jsonc).

const COOKIE = 'hf_owner';
const SESSION_SECONDS = 60 * 60 * 24 * 14; // stay signed in for 14 days
const EVENTS_KEY = 'events';
const MAX_EVENTS = 1000;

const enc = new TextEncoder();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    try {
      return await route(request, env, url);
    } catch (err) {
      console.error(err);
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  },
};

async function route(request, env, url) {
  const { pathname } = url;
  const method = request.method;

  if (pathname === '/api/events' && method === 'GET') {
    return json({ events: await loadEvents(env) });
  }
  if (pathname === '/api/session' && method === 'GET') {
    return json({ owner: await isOwner(request, env) });
  }

  // Everything below changes state. Browsers send an Origin header on these
  // requests; refuse any that come from another site.
  if (method !== 'GET') {
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return json({ error: 'Forbidden' }, 403);
  }

  if (pathname === '/api/login' && method === 'POST') return login(request, env, url);
  if (pathname === '/api/logout' && method === 'POST') {
    return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0, url) });
  }

  const match = pathname.match(/^\/api\/events(?:\/([A-Za-z0-9-]{1,64}))?$/);
  if (match) {
    if (!(await isOwner(request, env))) return json({ error: 'Owner login required' }, 401);
    const id = match[1];

    if (method === 'POST' && !id) {
      const parsed = validate(await readJson(request));
      if (parsed.error) return json({ error: parsed.error }, 400);
      const events = await loadEvents(env);
      if (events.length >= MAX_EVENTS) return json({ error: 'Too many events' }, 400);
      const event = { id: crypto.randomUUID(), ...parsed.value };
      events.push(event);
      await saveEvents(env, events);
      return json({ event }, 201);
    }

    if (method === 'PUT' && id) {
      const parsed = validate(await readJson(request));
      if (parsed.error) return json({ error: parsed.error }, 400);
      const events = await loadEvents(env);
      const i = events.findIndex((e) => e.id === id);
      if (i < 0) return json({ error: 'Event not found' }, 404);
      events[i] = { id, ...parsed.value };
      await saveEvents(env, events);
      return json({ event: events[i] });
    }

    if (method === 'DELETE' && id) {
      const events = await loadEvents(env);
      const next = events.filter((e) => e.id !== id);
      if (next.length === events.length) return json({ error: 'Event not found' }, 404);
      await saveEvents(env, next);
      return json({ ok: true });
    }
  }

  return json({ error: 'Not found' }, 404);
}

/* ---------- storage ---------- */

async function loadEvents(env) {
  if (!env.EVENTS) return [];
  const stored = await env.EVENTS.get(EVENTS_KEY, 'json');
  return Array.isArray(stored) ? stored : [];
}

async function saveEvents(env, events) {
  if (!env.EVENTS) throw new Error('EVENTS KV namespace is not bound');
  await env.EVENTS.put(EVENTS_KEY, JSON.stringify(events));
}

/* ---------- validation ---------- */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const REPEATS = ['none', 'weekly', 'biweekly'];

function validDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validate(input) {
  if (!input || typeof input !== 'object') return { error: 'Invalid request' };
  const title = text(input.title, 120);
  if (!title) return { error: 'Please enter a title.' };
  if (!validDate(input.date)) return { error: 'Please choose a valid date.' };

  const start = text(input.start, 5);
  const end = text(input.end, 5);
  if (start && !TIME_RE.test(start)) return { error: 'Start time is not valid.' };
  if (end && !TIME_RE.test(end)) return { error: 'End time is not valid.' };
  if (end && !start) return { error: 'Add a start time before an end time.' };
  if (start && end && end < start) return { error: 'End time must be after the start time.' };

  const repeat = REPEATS.includes(input.repeat) ? input.repeat : 'none';
  let until = '';
  if (repeat !== 'none') {
    until = text(input.until, 10);
    if (!validDate(until)) return { error: 'Please choose a date for the repeat to end on.' };
    if (until < input.date) return { error: 'The repeat must end on or after the first date.' };
  }

  return {
    value: {
      title,
      date: input.date,
      start,
      end,
      location: text(input.location, 120),
      notes: text(input.notes, 1000),
      repeat,
      until,
    },
  };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/* ---------- owner authentication ---------- */

async function login(request, env, url) {
  if (!env.ADMIN_PASSWORD) {
    return json({ error: 'Owner password has not been set up yet.' }, 503);
  }
  const body = await readJson(request);
  const password = body && typeof body.password === 'string' ? body.password : '';

  // Compare hashes so the check takes the same time however many characters match.
  const [a, b] = await Promise.all([sha256(password), sha256(env.ADMIN_PASSWORD)]);
  const ok = timingSafeEqual(a, b);
  await new Promise((resolve) => setTimeout(resolve, 400)); // slow down guessing
  if (!ok) return json({ error: 'That password is not correct.' }, 401);

  const token = await sign(env, String(Math.floor(Date.now() / 1000) + SESSION_SECONDS));
  return json({ owner: true }, 200, { 'Set-Cookie': cookie(token, SESSION_SECONDS, url) });
}

async function isOwner(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const header = request.headers.get('Cookie') || '';
  const found = header.split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE + '='));
  if (!found) return false;
  const token = found.slice(COOKIE.length + 1);
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const expires = token.slice(0, dot);
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now() / 1000) return false;
  const expected = await sign(env, expires);
  return timingSafeEqual(enc.encode(token), enc.encode(expected));
}

async function sign(env, expires) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(env.ADMIN_PASSWORD),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode('owner.' + expires));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return expires + '.' + hex;
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function cookie(value, maxAge, url) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}
