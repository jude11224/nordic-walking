// Healthy Futures — calendar and registration API
//
// Everything except /api/* is served as static files by Cloudflare. This
// Worker only handles the calendar and the registration form:
//
//   GET    /api/events        public   list all events
//   GET    /api/session       public   { owner: true|false }
//   GET    /api/status        public   setup check (no secret values)
//   POST   /api/login         public   { password } -> sets owner cookie
//   POST   /api/logout        public   clears owner cookie
//   POST   /api/register      public   registration + waiver -> emailed to Julie
//   POST   /api/events        owner    add an event
//   PUT    /api/events/:id    owner    update an event
//   DELETE /api/events/:id    owner    remove an event
//
// Setup (once): set the owner password as a secret named ADMIN_PASSWORD.
//   npx wrangler secret put ADMIN_PASSWORD
// Events are stored in the EVENTS KV namespace (created automatically on
// deploy from wrangler.jsonc). Registrations are kept in REGISTRATIONS, and
// also emailed when a REGISTRATION_EMAIL binding is set (off for now, see README).

const COOKIE = 'hf_owner';
const SESSION_SECONDS = 60 * 60 * 24 * 14; // stay signed in for 14 days
const EVENTS_KEY = 'events';
const MAX_EVENTS = 1000;

// Registration emails go from an address on the site's own domain to Julie.
const REGISTRATION_FROM = 'registration@healthyfuturesnow.com';
const REGISTRATION_TO = 'julie7747@gmail.com';

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
  if (pathname === '/api/status' && method === 'GET') {
    // Setup check: shows whether the password and storage are visible to this
    // Worker, plus the names (never the values) of everything it can see.
    return json({
      passwordConfigured: !!env.ADMIN_PASSWORD,
      eventsStorage: !!env.EVENTS,
      registrationEmail: !!env.REGISTRATION_EMAIL,
      registrationsStorage: !!env.REGISTRATIONS,
      bindingNames: Object.keys(env).sort(),
    });
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
  if (pathname === '/api/register' && method === 'POST') return register(request, env);

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

/* ---------- registration and waiver ---------- */

const CLASSES = ['Balance, Posture, Gait', 'Nordic Walking', 'Stretch and Strengthen'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

// Keep this wording in step with the waiver shown in register.html.
const WAIVER = [
  'I {name} agree, waive, discharge, and covenant not to sue Healthy Futures and its officers and employees from any and all liability, claims, demands, actions, and causes of action whatsoever arising out of or relating to any loss, damage or injury, including death, that may be sustained by me, or to any property belonging to me, whether caused by negligence of officers or employees, while participating in Nordic Walking, Stretch and Strengthen, Balance, Posture, Gait or while in, on, or upon the premises where these classes take place or are connected to.',
  'In signing this release, I acknowledge and represent that:',
  '- I have read the foregoing release, understand it and sign it voluntarily as my own free act and intent.',
  '- I execute this release for full, adequate, and complete consideration fully intending to be bound by the same.',
  'I hereby set my hand and seal this {date}.',
];

// One line of text: no line breaks (they would end up in the email subject).
function line(value, max) {
  return text(value, max).replace(/\s+/g, ' ');
}

function validateRegistration(input) {
  if (!input || typeof input !== 'object') return { error: 'Invalid request' };
  const classes = Array.isArray(input.classes) ? CLASSES.filter((c) => input.classes.includes(c)) : [];
  if (!classes.length) return { error: 'Please choose at least one class.' };

  const name = line(input.name, 120);
  if (!name) return { error: 'Please enter your full name.' };
  const email = line(input.email, 200);
  if (!EMAIL_RE.test(email)) return { error: 'Please enter a valid email address.' };
  const phone = line(input.phone, 40);
  if (!phone) return { error: 'Please enter your phone number.' };
  if (!validDate(input.dob) || input.dob < '1900-01-01' || input.dob > new Date().toISOString().slice(0, 10)) {
    return { error: 'Please enter a valid date of birth.' };
  }
  if (input.agree !== true) return { error: 'Please tick the box to agree to the waiver.' };
  const signature = line(input.signature, 120);
  if (!signature) return { error: 'Please type your full name as your signature.' };

  return {
    value: { classes, name, email, phone, dob: input.dob, health: text(input.health, 2000), signature },
  };
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function longDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

async function register(request, env) {
  const body = await readJson(request);
  // Hidden "company" field: people never see it, spam bots fill it in.
  // Pretend it worked so the bot moves on.
  if (body && body.company) return json({ ok: true });

  const parsed = validateRegistration(body);
  if (parsed.error) return json({ error: parsed.error }, 400);
  const reg = parsed.value;

  const now = new Date();
  const id = crypto.randomUUID();
  // Julie is in Rhode Island, so dates on the waiver use Eastern time.
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  const signedOn = `${ordinal(Number(parts.day))} day of ${MONTH_NAMES[Number(parts.month) - 1]}, in the year ${parts.year}`;
  const submitted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', dateStyle: 'long', timeStyle: 'short',
  }).format(now) + ' (Eastern)';
  const waiver = WAIVER.map((p) => p.replace('{name}', () => reg.name).replace('{date}', signedOn));

  const record = { id, submittedAt: now.toISOString(), ...reg, agreed: true, waiver };

  let saved = false;
  let emailed = false;
  try {
    if (env.REGISTRATIONS) {
      await env.REGISTRATIONS.put(`${record.submittedAt}-${id}`, JSON.stringify(record));
      saved = true;
    }
  } catch (err) {
    console.error('Saving registration failed', err);
  }
  try {
    if (env.REGISTRATION_EMAIL) {
      await env.REGISTRATION_EMAIL.send({
        from: REGISTRATION_FROM,
        to: REGISTRATION_TO,
        replyTo: reg.email,
        subject: `Registration and waiver: ${reg.name}`,
        ...registrationEmail(reg, waiver, submitted, id),
      });
      emailed = true;
    }
  } catch (err) {
    console.error('Emailing registration failed', err);
  }

  if (!saved && !emailed) {
    return json({ error: 'Sorry, your form could not be sent. Please call Julie at 401.742.4553.' }, 500);
  }
  if (env.REGISTRATION_EMAIL && !emailed) console.error(`Registration ${id} was saved but not emailed`);
  return json({ ok: true });
}

function registrationEmail(reg, waiver, submitted, id) {
  const rows = [
    ['Classes', reg.classes.join('; ')],
    ['Name', reg.name],
    ['Email', reg.email],
    ['Phone', reg.phone],
    ['Date of birth', longDate(reg.dob)],
    ['Physical limitations or health issues', reg.health || 'None listed'],
  ];
  const signed = [
    ['Agreed to the waiver', 'Yes'],
    ['Signature (typed)', reg.signature],
    ['Name printed', reg.name],
    ['Submitted', submitted],
    ['Reference', id],
  ];

  const plain = (list) => list.map(([k, v]) => `${k}: ${v}`).join('\n');
  const textBody = [
    'New registration and waiver from the Healthy Futures website.',
    'Reply to this email to answer ' + reg.name + '.',
    '',
    'REGISTRATION',
    plain(rows),
    '',
    'WAIVER OF LIABILITY',
    waiver.join('\n\n'),
    '',
    plain(signed),
  ].join('\n');

  const table = (list) => '<table cellpadding="6" style="border-collapse:collapse">' + list.map(([k, v]) =>
    `<tr><th align="left" valign="top" style="padding-right:16px">${esc(k)}</th><td style="white-space:pre-wrap">${esc(v)}</td></tr>`,
  ).join('') + '</table>';
  const html = [
    '<div style="font-family:Arial,sans-serif;font-size:15px;color:#16332b">',
    '<p>New registration and waiver from the Healthy Futures website. Reply to this email to answer ' + esc(reg.name) + '.</p>',
    '<h2 style="font-size:18px">Registration</h2>',
    table(rows),
    '<h2 style="font-size:18px">Waiver of Liability</h2>',
    waiver.map((p) => `<p>${esc(p)}</p>`).join(''),
    table(signed),
    '</div>',
  ].join('');

  return { text: textBody, html };
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
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
