// Healthy Futures — registration forms to Google Sheet + email
//
// Paste this into the Apps Script editor of the "Healthy Futures
// Registrations" Google Sheet (Extensions -> Apps Script) and deploy it as a
// web app (see README). The website's Worker (src/worker.js) POSTs each
// registration here. This script adds it as a row in the Sheet and emails
// Julie. The email comes from the Gmail account that owns the Sheet, and
// replying goes to the person who signed up.

var EMAIL_TO = 'julie7747@gmail.com';

var COLUMNS = [
  ['Submitted', 'submitted'],
  ['Name', 'name'],
  ['Email', 'email'],
  ['Phone', 'phone'],
  ['Date of birth', 'dob'],
  ['Classes', 'classes'],
  ['Health notes', 'health'],
  ['Signature (typed)', 'signature'],
  ['Agreed to waiver', null],
  ['Reference', 'id'],
  ['Waiver', 'waiver'],
];

function doPost(e) {
  try {
    var reg = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS.map(function (c) { return c[0]; }));
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
    }
    sheet.appendRow(COLUMNS.map(function (c) { return c[1] ? cell(reg[c[1]]) : 'Yes'; }));

    MailApp.sendEmail({
      to: EMAIL_TO,
      replyTo: reg.email,
      name: 'Healthy Futures website',
      subject: reg.subject,
      body: reg.text,
      htmlBody: reg.html,
    });

    return reply({ ok: true });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: String(err && err.message || err) });
  }
}

// Plain text in a cell. Without the leading ' a phone number like "+1 401..."
// or anything starting with = would be treated as a formula.
function cell(value) {
  var text = value == null ? '' : String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function reply(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
