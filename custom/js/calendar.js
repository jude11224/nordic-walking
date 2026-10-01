// Healthy Futures — calendar
//
// Visitors can view events. The owner signs in (password checked by the
// Worker in src/worker.js) to add, edit and delete them.
//
//   <div id="calendar"></div>            full month calendar + owner tools
//   <div data-upcoming="5"></div>        short "next events" list
(function () {
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  var state = { events: [], owner: false, loaded: false, failed: false };
  var views = [];

  /* ---------- small helpers ---------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function parse(s) { var p = s.split('-'); return { y: +p[0], m: +p[1] - 1, d: +p[2] }; }
  function toDate(s) { var p = parse(s); return new Date(p.y, p.m, p.d); }
  function fromDate(dt) { return iso(dt.getFullYear(), dt.getMonth(), dt.getDate()); }
  function addDays(s, n) { var dt = toDate(s); dt.setDate(dt.getDate() + n); return fromDate(dt); }
  function todayISO() { return fromDate(new Date()); }

  function fmtTime(t) {
    if (!t) return '';
    var h = +t.slice(0, 2), m = t.slice(3);
    return (h % 12 || 12) + ':' + m + ' ' + (h < 12 ? 'AM' : 'PM');
  }
  function timeRange(e) {
    if (!e.start) return 'All day';
    return fmtTime(e.start) + (e.end ? ' – ' + fmtTime(e.end) : '');
  }
  function shortTime(t) {
    if (!t) return '';
    var h = +t.slice(0, 2), m = t.slice(3);
    return (h % 12 || 12) + (m === '00' ? '' : ':' + m) + (h < 12 ? 'a' : 'p');
  }

  /* Turn events (some repeating) into one entry per day inside [from, to]. */
  function occurrences(events, from, to) {
    var out = [];
    events.forEach(function (e) {
      var step = e.repeat === 'weekly' ? 7 : e.repeat === 'biweekly' ? 14 : 0;
      if (!step) {
        if (e.date >= from && e.date <= to) out.push({ event: e, date: e.date });
        return;
      }
      var last = e.until && e.until < to ? e.until : to;
      for (var d = e.date, guard = 0; d <= last && guard < 800; d = addDays(d, step), guard++) {
        if (d >= from) out.push({ event: e, date: d });
      }
    });
    out.sort(function (a, b) {
      return a.date === b.date
        ? (a.event.start || '').localeCompare(b.event.start || '')
        : a.date < b.date ? -1 : 1;
    });
    return out;
  }

  /* ---------- API ---------- */
  function api(path, options) {
    options = options || {};
    var init = { method: options.method || 'GET', credentials: 'same-origin', headers: {} };
    if (options.body) {
      init.body = JSON.stringify(options.body);
      init.headers['Content-Type'] = 'application/json';
    }
    return fetch(path, init).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error(data.error || 'Something went wrong. Please try again.');
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  function load() {
    return Promise.all([
      api('/api/events'),
      api('/api/session').catch(function () { return { owner: false }; }),
    ]).then(function (r) {
      state.events = r[0].events || [];
      state.owner = !!r[1].owner;
      state.loaded = true;
      state.failed = false;
    }).catch(function () {
      state.failed = true;
      state.loaded = true;
    }).then(renderAll);
  }

  function renderAll() { views.forEach(function (v) { v(); }); }

  /* ---------- shared list rendering ---------- */
  function listItem(occ, showActions, onEdit, onDelete) {
    var e = occ.event, dt = toDate(occ.date);
    var meta = [timeRange(e)];
    if (e.location) meta.push(e.location);
    if (e.repeat === 'weekly') meta.push('Every week');
    if (e.repeat === 'biweekly') meta.push('Every other week');

    var info = el('div', { class: 'cal-info' }, [
      el('h3', { text: e.title }),
      el('p', { class: 'cal-meta', text: meta.join(' · ') }),
      e.notes ? el('p', { class: 'cal-notes', text: e.notes }) : null,
    ]);

    var actions = null;
    if (showActions) {
      var edit = el('button', { type: 'button', class: 'btn btn-outline-navy btn-sm', text: 'Edit' });
      var del = el('button', { type: 'button', class: 'btn btn-outline-navy btn-sm', text: 'Delete' });
      edit.addEventListener('click', function () { onEdit(e); });
      del.addEventListener('click', function () { onDelete(e); });
      actions = el('div', { class: 'cal-actions' }, [edit, del]);
    }

    return el('li', { class: 'cal-item' }, [
      el('div', { class: 'cal-date', 'aria-hidden': 'true' }, [
        el('span', { class: 'm', text: MONTHS[dt.getMonth()].slice(0, 3) }),
        el('span', { class: 'd', text: String(dt.getDate()) }),
        el('span', { class: 'w', text: DOW[dt.getDay()] }),
      ]),
      info,
      actions,
    ]);
  }

  function longDate(s) {
    var dt = toDate(s);
    return DOW[dt.getDay()] + ', ' + MONTHS[dt.getMonth()] + ' ' + dt.getDate();
  }

  /* ---------- upcoming list ---------- */
  function mountUpcoming(root) {
    var count = parseInt(root.getAttribute('data-upcoming'), 10) || 5;
    views.push(function () {
      root.textContent = '';
      if (state.failed) {
        root.appendChild(el('p', { class: 'cal-empty', text: 'The schedule is unavailable right now. Please check back soon.' }));
        return;
      }
      var from = todayISO();
      var list = occurrences(state.events, from, addDays(from, 365)).slice(0, count);
      if (!list.length) {
        root.appendChild(el('p', { class: 'cal-empty', text: 'No upcoming events have been posted yet.' }));
        return;
      }
      var ul = el('ul', { class: 'cal-list' });
      list.forEach(function (o) { ul.appendChild(listItem(o, false)); });
      root.appendChild(ul);
    });
  }

  /* ---------- full calendar ---------- */
  function mountCalendar(root) {
    var now = new Date();
    var view = { y: now.getFullYear(), m: now.getMonth() };
    var form = buildEventDialog();
    var login = buildLoginDialog();
    document.body.appendChild(form.dialog);
    document.body.appendChild(login.dialog);

    function openAdd(date) { form.open(null, date); }
    function openEdit(e) { form.open(e); }
    function remove(e) {
      var what = e.repeat && e.repeat !== 'none' ? 'this repeating event and all of its dates' : 'this event';
      if (!window.confirm('Delete "' + e.title + '"? This removes ' + what + '.')) return;
      api('/api/events/' + encodeURIComponent(e.id), { method: 'DELETE' })
        .then(load)
        .catch(handleOwnerError);
    }
    function handleOwnerError(err) {
      if (err.status === 401) {
        state.owner = false;
        renderAll();
        window.alert('Your owner session has ended. Please log in again.');
      } else {
        window.alert(err.message);
      }
    }

    form.onSaved = load;
    form.onAuthLost = handleOwnerError;
    login.onSuccess = load;

    function shift(n) {
      var d = new Date(view.y, view.m + n, 1);
      view.y = d.getFullYear();
      view.m = d.getMonth();
      renderAll();
    }

    views.push(function () {
      root.textContent = '';
      if (state.failed) {
        root.appendChild(el('p', { class: 'cal-empty', text: 'The calendar is unavailable right now. Please check back soon.' }));
        return;
      }

      // Owner bar
      if (state.owner) {
        var add = el('button', { type: 'button', class: 'btn btn-accent btn-sm', text: '+ Add event' });
        var out = el('button', { type: 'button', class: 'btn btn-outline-navy btn-sm', text: 'Log out' });
        add.addEventListener('click', function () { openAdd(); });
        out.addEventListener('click', function () {
          api('/api/logout', { method: 'POST' }).catch(function () {}).then(load);
        });
        root.appendChild(el('div', { class: 'cal-owner-bar' }, [
          el('strong', { text: 'Owner mode' }),
          el('span', { text: 'Add, edit or delete events. Tap a day to add an event on that date.' }),
          el('span', { class: 'spacer' }), add, out,
        ]));
      }

      // Toolbar
      var prev = el('button', { type: 'button', class: 'btn btn-outline-navy', 'aria-label': 'Previous month', text: '‹' });
      var next = el('button', { type: 'button', class: 'btn btn-outline-navy', 'aria-label': 'Next month', text: '›' });
      var today = el('button', { type: 'button', class: 'btn btn-outline-navy', text: 'Today' });
      prev.addEventListener('click', function () { shift(-1); });
      next.addEventListener('click', function () { shift(1); });
      today.addEventListener('click', function () {
        var t = new Date(); view.y = t.getFullYear(); view.m = t.getMonth(); renderAll();
      });
      root.appendChild(el('div', { class: 'cal-toolbar' }, [
        el('h2', { class: 'cal-title', 'aria-live': 'polite', text: MONTHS[view.m] + ' ' + view.y }),
        el('span', { class: 'spacer' }),
        el('div', { class: 'cal-nav' }, [prev, today, next]),
      ]));

      // Month grid
      var first = new Date(view.y, view.m, 1);
      var gridStart = addDays(iso(view.y, view.m, 1), -first.getDay());
      var gridEnd = addDays(gridStart, 41);
      var occ = occurrences(state.events, gridStart, gridEnd);
      var byDay = {};
      occ.forEach(function (o) { (byDay[o.date] = byDay[o.date] || []).push(o); });

      var grid = el('div', { class: 'cal-grid', 'aria-hidden': 'true' });
      DOW.forEach(function (d) { grid.appendChild(el('div', { class: 'cal-dow', text: d })); });
      var todayStr = todayISO();
      for (var i = 0; i < 42; i++) {
        var ds = addDays(gridStart, i), p = parse(ds);
        var items = byDay[ds] || [];
        var cls = 'cal-day' + (p.m !== view.m ? ' out' : '') + (ds === todayStr ? ' today' : '') + (state.owner ? ' pickable' : '');
        var cell = el(state.owner ? 'button' : 'div', state.owner ? { class: cls, type: 'button', 'data-date': ds } : { class: cls });
        cell.appendChild(el('span', { class: 'num', text: String(p.d) }));
        items.slice(0, 2).forEach(function (o) {
          cell.appendChild(el('span', { class: 'cal-chip', text: (o.event.start ? shortTime(o.event.start) + ' ' : '') + o.event.title }));
        });
        if (items.length > 2) cell.appendChild(el('span', { class: 'cal-more', text: '+' + (items.length - 2) + ' more' }));
        if (items.length) {
          var dots = el('span', { class: 'cal-dots' });
          items.slice(0, 3).forEach(function () { dots.appendChild(el('i')); });
          cell.appendChild(dots);
        }
        if (state.owner) {
          cell.addEventListener('click', function () { openAdd(this.getAttribute('data-date')); });
        }
        grid.appendChild(cell);
      }
      root.appendChild(grid);

      // Month list
      var monthFrom = iso(view.y, view.m, 1);
      var monthTo = iso(view.y, view.m, new Date(view.y, view.m + 1, 0).getDate());
      var monthOcc = occurrences(state.events, monthFrom, monthTo);
      root.appendChild(el('h2', { class: 'h4 mt-5 mb-3', text: 'Events in ' + MONTHS[view.m] + ' ' + view.y }));
      if (!monthOcc.length) {
        root.appendChild(el('p', { class: 'cal-empty', text: 'No events this month.' }));
      } else {
        var ul = el('ul', { class: 'cal-list' });
        monthOcc.forEach(function (o) { ul.appendChild(listItem(o, state.owner, openEdit, remove)); });
        root.appendChild(ul);
      }

      // Owner login link
      if (!state.owner) {
        var link = el('button', { type: 'button', text: 'Owner login' });
        link.id = 'owner-login';
        link.addEventListener('click', function () { login.open(); });
        root.appendChild(el('div', { class: 'owner-link-row' }, [link]));
      }
    });

    // Footer "Owner login" links on every page point here.
    if (location.hash === '#login') {
      document.addEventListener('calendar:loaded', function () { if (!state.owner) login.open(); }, { once: true });
    }
  }

  /* ---------- dialogs ---------- */
  function field(label, input, optional) {
    var id = input.id;
    var lab = el('label', { for: id }, [document.createTextNode(label)]);
    if (optional) lab.appendChild(el('span', { class: 'opt', text: ' (optional)' }));
    return el('div', { class: 'field' }, [lab, input]);
  }

  function buildLoginDialog() {
    var api_ = { onSuccess: function () {} };
    var dialog = el('dialog', { class: 'cal-dialog', 'aria-labelledby': 'login-title' });
    var pw = el('input', { type: 'password', id: 'login-password', autocomplete: 'current-password', required: '' });
    var error = el('p', { class: 'form-error', role: 'alert' });
    var cancel = el('button', { type: 'button', class: 'btn btn-outline-navy', text: 'Cancel' });
    var submit = el('button', { type: 'submit', class: 'btn btn-accent', text: 'Log in' });
    var form = el('form', { method: 'dialog' }, [
      el('h2', { id: 'login-title', text: 'Owner login' }),
      field('Password', pw),
      error,
      el('div', { class: 'buttons' }, [cancel, submit]),
    ]);
    dialog.appendChild(form);
    cancel.addEventListener('click', function () { dialog.close(); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      error.textContent = '';
      submit.disabled = true;
      api('/api/login', { method: 'POST', body: { password: pw.value } })
        .then(function () { dialog.close(); return api_.onSuccess(); })
        .catch(function (err) { error.textContent = err.message; pw.select(); })
        .then(function () { submit.disabled = false; });
    });
    api_.dialog = dialog;
    api_.open = function () { pw.value = ''; error.textContent = ''; dialog.showModal(); pw.focus(); };
    return api_;
  }

  function buildEventDialog() {
    var ctl = { onSaved: function () {}, onAuthLost: function () {} };
    var editingId = null;
    var dialog = el('dialog', { class: 'cal-dialog', 'aria-labelledby': 'event-title' });

    var title = el('input', { type: 'text', id: 'ev-title', maxlength: '120', required: '' });
    var date = el('input', { type: 'date', id: 'ev-date', required: '' });
    var start = el('input', { type: 'time', id: 'ev-start' });
    var end = el('input', { type: 'time', id: 'ev-end' });
    var location = el('input', { type: 'text', id: 'ev-location', maxlength: '120' });
    var notes = el('textarea', { id: 'ev-notes', maxlength: '1000' });
    var repeat = el('select', { id: 'ev-repeat' }, [
      el('option', { value: 'none', text: 'Does not repeat' }),
      el('option', { value: 'weekly', text: 'Every week' }),
      el('option', { value: 'biweekly', text: 'Every other week' }),
    ]);
    var until = el('input', { type: 'date', id: 'ev-until' });
    var untilField = field('Repeat until', until);
    var heading = el('h2', { id: 'event-title' });
    var error = el('p', { class: 'form-error', role: 'alert' });
    var cancel = el('button', { type: 'button', class: 'btn btn-outline-navy', text: 'Cancel' });
    var submit = el('button', { type: 'submit', class: 'btn btn-accent', text: 'Save event' });

    var form = el('form', { method: 'dialog' }, [
      heading,
      field('Title', title),
      field('Date', date),
      el('div', { class: 'field-row' }, [field('Start time', start, true), field('End time', end, true)]),
      field('Location', location, true),
      field('Details', notes, true),
      field('Repeats', repeat),
      untilField,
      error,
      el('div', { class: 'buttons' }, [cancel, submit]),
    ]);
    dialog.appendChild(form);

    function syncRepeat() {
      var on = repeat.value !== 'none';
      untilField.style.display = on ? '' : 'none';
      until.required = on;
    }
    repeat.addEventListener('change', syncRepeat);
    cancel.addEventListener('click', function () { dialog.close(); });

    ctl.open = function (event, presetDate) {
      editingId = event ? event.id : null;
      heading.textContent = event ? 'Edit event' : 'Add event';
      title.value = event ? event.title : '';
      date.value = event ? event.date : (presetDate || todayISO());
      start.value = event ? event.start : '';
      end.value = event ? event.end : '';
      location.value = event ? event.location : '';
      notes.value = event ? event.notes : '';
      repeat.value = event ? event.repeat : 'none';
      until.value = event ? event.until : '';
      error.textContent = '';
      syncRepeat();
      dialog.showModal();
      title.focus();
    };

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      error.textContent = '';
      submit.disabled = true;
      var body = {
        title: title.value, date: date.value, start: start.value, end: end.value,
        location: location.value, notes: notes.value, repeat: repeat.value,
        until: repeat.value === 'none' ? '' : until.value,
      };
      var req = editingId
        ? api('/api/events/' + encodeURIComponent(editingId), { method: 'PUT', body: body })
        : api('/api/events', { method: 'POST', body: body });
      req.then(function () { dialog.close(); return ctl.onSaved(); })
        .catch(function (err) {
          if (err.status === 401) { dialog.close(); ctl.onAuthLost(err); }
          else error.textContent = err.message;
        })
        .then(function () { submit.disabled = false; });
    });

    ctl.dialog = dialog;
    return ctl;
  }

  /* ---------- boot ---------- */
  var calendarRoot = document.getElementById('calendar');
  if (calendarRoot) mountCalendar(calendarRoot);
  document.querySelectorAll('[data-upcoming]').forEach(mountUpcoming);
  if (views.length) {
    load().then(function () { document.dispatchEvent(new Event('calendar:loaded')); });
  }
})();
