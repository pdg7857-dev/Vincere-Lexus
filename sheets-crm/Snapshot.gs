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
