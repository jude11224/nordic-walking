// Healthy Futures — registration and waiver form
//
// Fills the person's name and today's date into the waiver as they type,
// checks the form, and sends it to the Worker (POST /api/register), which
// emails it to Julie.
(function () {
  var form = document.getElementById('register-form');
  if (!form) return;

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  var nameInput = form.elements.name;
  var error = document.getElementById('register-error');
  var done = document.getElementById('register-done');
  var submit = form.querySelector('button[type="submit"]');

  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function fill(key, value) {
    var spots = document.querySelectorAll('[data-fill="' + key + '"]');
    for (var i = 0; i < spots.length; i++) spots[i].textContent = value;
  }

  function showName() { fill('name', nameInput.value.trim() || '(your name)'); }

  var now = new Date();
  fill('date', ordinal(now.getDate()) + ' day of ' + MONTHS[now.getMonth()] + ', in the year ' + now.getFullYear());
  showName();
  nameInput.addEventListener('input', showName);

  // Don't let anyone pick a birthday in the future.
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  form.elements.dob.max = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());

  function checkedClasses() {
    var out = [];
    var boxes = form.querySelectorAll('input[name="classes"]');
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) out.push(boxes[i].value);
    return out;
  }

  // Returns [message, field to focus] for the first problem, or null.
  function problem(data) {
    var f = form.elements;
    if (!data.classes.length) return ['Please choose at least one class.', form.querySelector('input[name="classes"]')];
    if (!data.name) return ['Please enter your full name.', f.name];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return ['Please enter a valid email address.', f.email];
    if (!data.phone) return ['Please enter your phone number.', f.phone];
    if (!data.dob) return ['Please enter your date of birth.', f.dob];
    if (!data.agree) return ['Please tick the box to agree to the waiver.', f.agree];
    if (!data.signature) return ['Please type your full name as your signature.', f.signature];
    return null;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var data = {
      classes: checkedClasses(),
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      phone: f.phone.value.trim(),
      dob: f.dob.value,
      health: f.health.value.trim(),
      agree: f.agree.checked,
      signature: f.signature.value.trim(),
      company: f.company.value,
    };

    var bad = problem(data);
    if (bad) {
      error.textContent = bad[0];
      bad[1].focus();
      return;
    }

    error.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Sending…';

    fetch('/api/register', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.error || 'Sorry, your form could not be sent. Please call Julie at 401.742.4553.');
      });
    }, function () {
      throw new Error('Could not connect. Please check your internet connection and try again.');
    }).then(function () {
      // Lock the filled-in form so it can be printed as the person's copy.
      var fields = form.querySelectorAll('input, textarea');
      for (var i = 0; i < fields.length; i++) fields[i].disabled = true;
      submit.parentNode.hidden = true;
      done.hidden = false;
      done.focus();
    }).catch(function (err) {
      error.textContent = err.message;
      submit.disabled = false;
      submit.textContent = 'Send to Julie';
    });
  });

  document.getElementById('register-print').addEventListener('click', function () { window.print(); });
})();
