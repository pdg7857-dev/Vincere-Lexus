/**
 * Vincere-Lexus CRM — OPTIONAL Apps Script.
 *
 * The formula-driven CRM (see CRM-DESIGN.md) needs NONE of this to work.
 * The ONLY thing formulas genuinely can't do is keep a frozen daily history,
 * because a formula always reflects the *current* source data. This script
 * appends a dated snapshot of the Dashboard's headline numbers to a "History"
 * tab so you can see trends over time.
 *
 * Install:
 *   1. Extensions → Apps Script, paste this file, Save.
 *   2. Run `snapshotDashboard` once and approve the permission prompt.
 *   3. Triggers (clock icon) → Add Trigger → function `snapshotDashboard`,
 *      event source "Time-driven", "Day timer", e.g. 7–8am. Save.
 *
 * That's it. Everything else in the CRM stays pure formula.
 */

/** Append one dated row of headline metrics to the "History" tab. */
function snapshotDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName('Dashboard');
  if (!dash) throw new Error('No "Dashboard" tab found.');

  // Pull the metric cells the dashboard already computes (see CRM-DESIGN.md §9).
  var inv      = dash.getRange('B5').getValue();
  var pipe     = dash.getRange('B6').getValue();
  var deliv    = dash.getRange('B7').getValue();
  var usedTot  = dash.getRange('B11').getValue();
  var usedAvl  = dash.getRange('B12').getValue();
  var usedAge  = dash.getRange('B13').getValue();
  var hot      = dash.getRange('E5').getValue();
  var warm     = dash.getRange('E6').getValue();
  var cold     = dash.getRange('E7').getValue();
  var upsell   = dash.getRange('E11').getValue();

  var hist = ss.getSheetByName('History');
  if (!hist) {
    hist = ss.insertSheet('History');
    hist.appendRow(['Date', 'Inventory', 'Pipeline', 'Delivery',
                    'Used total', 'Used available', 'Used aging>60d',
                    'Hot', 'Warm', 'Cold', 'Upsell opps']);
    hist.setFrozenRows(1);
  }

  var today = new Date();
  var stamp = Utilities.formatDate(today, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');

  // Idempotent: if today's row already exists, overwrite it instead of duplicating.
  var dates = hist.getRange(2, 1, Math.max(hist.getLastRow() - 1, 1), 1).getValues();
  var rowToWrite = -1;
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i][0];
    var ds = (d instanceof Date)
      ? Utilities.formatDate(d, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd')
      : String(d);
    if (ds === stamp) { rowToWrite = i + 2; break; }
  }

  var row = [stamp, inv, pipe, deliv, usedTot, usedAvl, usedAge, hot, warm, cold, upsell];
  if (rowToWrite > 0) {
    hist.getRange(rowToWrite, 1, 1, row.length).setValues([row]);
  } else {
    hist.appendRow(row);
  }
}

/** Convenience: hide the three helper tabs in one click. Run manually anytime. */
function hideHelperTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ['_AllVehicles', '_NewMatches', '_UsedMatches'].forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (sh) sh.hideSheet();
  });
}

/**
 * OPTIONAL — Facebook Marketplace repost reminders → GOOGLE CALENDAR only.
 * (CRM-DESIGN.md §14, "Option C". Outlook can't be written from Apps Script —
 *  for Outlook use the one-click ➕ links in the Reposting tab instead.)
 *
 * Reads the "Reposting" tab and creates an all-day event for every unit whose
 * Next Due (col F) is today or earlier. Idempotent: it tags events it creates
 * and won't duplicate them on re-run.
 *
 * Install (only if you want hands-free Google Calendar events):
 *   - Run once, approve the Calendar permission.
 *   - Optionally add a daily time-driven trigger on `createRepostEvents`.
 * This runs as YOU, in YOUR account — it grants no one else access.
 */
function createRepostEvents() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Reposting');
  if (!sh) throw new Error('No "Reposting" tab found.');

  var cal = CalendarApp.getDefaultCalendar();
  var last = sh.getLastRow();
  if (last < 2) return;

  // Reposting cols: A Stk# | B Year | C Make | D Model | E Last | F Next Due | G Over | H Status | I link
  var rows = sh.getRange(2, 1, last - 1, 6).getValues();
  var tz = ss.getSpreadsheetTimeZone();
  var today = new Date(); today.setHours(0, 0, 0, 0);

  rows.forEach(function (r) {
    var stk = r[0], due = r[5];
    if (!stk || !(due instanceof Date)) return;
    if (due > today) return;                       // not due yet

    var title = 'Repost ' + stk + ' ' + r[1] + ' ' + r[2] + ' ' + r[3] + ' — FB Marketplace';
    var tag = 'vincere-repost:' + stk + ':' +
              Utilities.formatDate(due, tz, 'yyyy-MM-dd');

    // Skip if we already created this exact reminder.
    var existing = cal.getEventsForDay(due, { search: stk });
    var dup = existing.some(function (e) { return e.getTag('vincere') === tag; });
    if (dup) return;

    var ev = cal.createAllDayEvent(title, due);
    ev.setTag('vincere', tag);
    ev.addPopupReminder(0);
  });
}
