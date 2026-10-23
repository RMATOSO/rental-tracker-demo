/**
 * Rental Tracker - daily arrears alert (Google Apps Script)
 * Portfolio demo by Rodrigo Matoso. Works with the "Rent Schedule" tab of Rental_Tracker_Demo.
 *
 * Setup (2 minutes):
 *  1. In Google Sheets: Extensions > Apps Script, paste this file, save.
 *  2. Change ALERT_EMAIL below.
 *  3. Run installDailyTrigger() once and accept the permissions.
 * The script only reads the spreadsheet and sends one e-mail to you. It never edits data.
 */

const ALERT_EMAIL = 'you@example.com';
const SHEET_NAME = 'Rent Schedule';
const FIRST_ROW = 5;          // first data row in Rent Schedule
const ACTION_STATUSES = ['Overdue', 'Partial', 'Fee due'];

function sendArrearsAlert() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  const last = sh.getLastRow();
  if (last < FIRST_ROW) return;
  // Columns A..M: Tenancy, Property, Tenant, Period, Due, Rent, Paid, Last pay, Days late, Fee due, Fee paid, Balance, Status
  const rows = sh.getRange(FIRST_ROW, 1, last - FIRST_ROW + 1, 13).getValues();
  const tz = Session.getScriptTimeZone();
  const items = rows
    .filter(r => ACTION_STATUSES.indexOf(r[12]) !== -1 && Number(r[11]) > 0)
    .map(r => ({
      property: r[1], tenant: r[2],
      period: Utilities.formatDate(new Date(r[3]), tz, 'MMM yyyy'),
      daysLate: r[8], balance: Number(r[11]), status: r[12]
    }));

  if (items.length === 0) return; // nothing to report = no e-mail

  const total = items.reduce((s, i) => s + i.balance, 0);
  const lines = items.map(i =>
    `<tr><td>${i.property}</td><td>${i.tenant}</td><td>${i.period}</td>` +
    `<td style="text-align:right">${i.daysLate}</td><td style="text-align:right">£${i.balance.toFixed(2)}</td><td>${i.status}</td></tr>`
  ).join('');
  const html =
    `<p><b>${items.length} item(s) need action. Total arrears: £${total.toFixed(2)}</b></p>` +
    `<table border="1" cellpadding="4" cellspacing="0">` +
    `<tr><th>Property</th><th>Tenant</th><th>Period</th><th>Days late</th><th>Balance</th><th>Status</th></tr>` +
    lines + `</table><p><a href="${SpreadsheetApp.getActive().getUrl()}">Open the tracker</a></p>`;

  MailApp.sendEmail({
    to: ALERT_EMAIL,
    subject: `Rent arrears: ${items.length} item(s), £${total.toFixed(0)}`,
    htmlBody: html
  });
}

function installDailyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'sendArrearsAlert')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendArrearsAlert').timeBased().everyDays(1).atHour(8).create();
}
