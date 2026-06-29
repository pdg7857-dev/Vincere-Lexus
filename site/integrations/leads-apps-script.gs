/**
 * Phil Dave leads -> Google Sheet
 * ================================
 * Receives the website contact form and appends each lead as a row, then
 * emails a notification. The Sheet is the source you cross-match against
 * inventory.
 *
 * SETUP (about 5 minutes):
 *  1. Create a new Google Sheet (e.g. "Phil Dave Leads").
 *  2. In that Sheet: Extensions -> Apps Script.
 *  3. Delete the default code, paste THIS whole file, click Save.
 *  4. Deploy -> New deployment -> gear icon -> Web app.
 *       - Description: anything
 *       - Execute as: Me
 *       - Who has access: Anyone
 *     Click Deploy, then Authorize access (allow the permissions).
 *  5. Copy the Web app URL (it ends with /exec).
 *  6. Paste that URL into site/app.js -> initForm() -> SCRIPT_URL
 *     (or send it over and it gets dropped in).
 *
 * To re-deploy after editing: Deploy -> Manage deployments -> edit -> Deploy.
 */

var NOTIFY_EMAIL = 'pdg7857@gmail.com';   // set to '' to turn email off
var SHEET_NAME   = 'Leads';
var HEADERS = ['Timestamp', 'Name', 'Email', 'Phone', 'Budget', 'Car', 'Details'];

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

    var p = (e && e.parameter) ? e.parameter : {};
    sheet.appendRow([
      new Date(),
      p.name || '',
      p.email || '',
      p.phone || '',
      p.budget || '',
      p.car || '',
      p.details || ''
    ]);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: 'New car brief from phildave.com',
        replyTo: p.email || NOTIFY_EMAIL,
        body: [
          'Name:    ' + (p.name || ''),
          'Email:   ' + (p.email || ''),
          'Phone:   ' + (p.phone || ''),
          'Budget:  ' + (p.budget || ''),
          'Car:     ' + (p.car || ''),
          'Details: ' + (p.details || '')
        ].join('\n')
      });
    }
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Lets you open the /exec URL in a browser to confirm it is live.
function doGet() {
  return ContentService.createTextOutput('Phil Dave lead endpoint is live.');
}
