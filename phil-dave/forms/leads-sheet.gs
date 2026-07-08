/**
 * Phil Dave — lead capture → Google Sheet
 * ------------------------------------------------------------------
 * Receives form submissions from the website (Request a Car, Newsletter,
 * Lexus tool, The Lot) and appends one row per submission to your sheet.
 *
 * SETUP (one time):
 *  1. Open your Google Sheet. Make sure ROW 1 holds your column headers,
 *     spelled EXACTLY as in FIELD_MAP below (edit the map to match your
 *     real header text if they differ).
 *  2. Extensions → Apps Script. Delete anything there, paste this whole file.
 *  3. (Optional) set SHEET_NAME to the tab you want rows added to.
 *  4. Deploy → New deployment → type "Web app" →
 *        Execute as: Me   |   Who has access: Anyone
 *     Copy the /exec URL it gives you.
 *  5. Paste that URL into the website: js/data.js → formEndpoint: "<url>"
 *     (and newsletter.endpoint / members.endpoint if you want those too).
 *
 * The form posts JSON with text/plain (no CORS preflight); the row lands,
 * the site can't read the reply, so it just shows "thank you".
 */

var SHEET_NAME = "";        // "" = first tab, or e.g. "Leads"
var TOKEN = "";             // "" = no check. Set to require a matching token.

// form field name  ->  your sheet column header (matched to your row 1 exactly)
var FIELD_MAP = {
  captured_at:   "Date",
  name:          "Name",
  phone:         "Number",
  email:         "Email",
  dreamcar:      "Dream car",
  text_ok:       "Text?",
  gentype:       "General type",
  fuel:          "Gas/Hybrid/EV",
  make:          "Make",
  trim:          "Trim",
  factory_order: "Order?",
  exterior:      "Vehicle color",
  interior:      "Interior color",
  budget:        "$ range",
  timeline:      "Purchase timeline",
  business:      "Business name",
  met_how:       "Met how",
  notes:         "Notes"
  // Customer answers with no matching single column in your sheet
  // (new/used, email opt-in) are ignored for now. Internal columns
  // (Level, Buying, Buyer intent, Notes, Sale - …, etc.) stay blank
  // for you to fill in. Add a "Source" column later to tag each form.
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse(e.postData.contents);
    if (TOKEN && body.token !== TOKEN) return reply("forbidden");

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = (SHEET_NAME && ss.getSheetByName(SHEET_NAME)) || ss.getSheets()[0];
    var lastCol = sh.getLastColumn();
    var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];

    // header text -> form field name
    var rev = {};
    for (var k in FIELD_MAP) rev[FIELD_MAP[k]] = k;

    var row = headers.map(function (h) {
      var field = rev[String(h).trim()];
      if (!field) return "";
      var v = body[field];
      if (field === "captured_at") return v ? new Date(v) : new Date();
      return (v == null) ? "" : v;
    });

    sh.appendRow(row);
    return reply("ok");
  } catch (err) {
    return reply("error: " + err);
  } finally {
    lock.releaseLock();
  }
}

// lets you open the /exec URL in a browser to confirm it's live
function doGet() { return reply("Phil Dave lead endpoint is live."); }

function reply(s) {
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT);
}
