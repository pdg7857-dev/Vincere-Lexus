/**
 * Vincere CRM — create the phone lead-capture Google Form.
 *
 * Run this ONCE (Apps Script → paste → Run → approve). It builds a Google Form
 * whose questions match the CRM, plus a linked responses spreadsheet.
 *
 * After running, open "Executions" (or View → Logs) to get:
 *   - FORM link  → share/bookmark this on your phone to add leads
 *   - RESPONSES sheet → this is what you import into the CRM
 *
 * Bringing leads into the (local) CRM on your laptop:
 *   A) Open the responses sheet → File → Download → CSV →
 *      in the CRM: Settings → Import → "Google Form leads" → pick the CSV.
 *      (Re-importing is safe — only NEW responses are added; duplicates skipped.)
 *   B) Or in a Claude Cowork session, ask Claude to pull new responses into your CRM.
 *
 * Keep the Form responses sheet PRIVATE (don't publish to web) — it holds customer info.
 */
function createLeadForm() {
  var form = FormApp.create('Vincere — New Lead');
  form.setDescription('Quick lead capture for the Lexus CRM. Fill from your phone.');
  form.setCollectEmail(false);

  form.addTextItem().setTitle('Client name').setRequired(true);
  form.addTextItem().setTitle('Phone');
  form.addTextItem().setTitle('Email');
  form.addMultipleChoiceItem().setTitle('Interest level').setChoiceValues(['Hot', 'Warm', 'Cold']);
  form.addMultipleChoiceItem().setTitle('Buying').setChoiceValues(['New', 'Used']);
  form.addTextItem().setTitle('Budget');
  form.addTextItem().setTitle('Make');                 // used vehicles (e.g. Toyota)
  form.addTextItem().setTitle('Year');
  form.addTextItem().setTitle('Series');               // e.g. RX, NX
  form.addTextItem().setTitle('Model');                // e.g. RX 350
  form.addTextItem().setTitle('Exterior colour');
  form.addTextItem().setTitle('Interior colour');
  form.addTextItem().setTitle('Package / trim');
  form.addParagraphTextItem().setTitle('Must-have features');
  form.addTextItem().setTitle('Currently drives (year make model)');   // for trade-in / upsell
  form.addParagraphTextItem().setTitle('Notes');

  var ss = SpreadsheetApp.create('Vincere — Lead Form responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('✅ Form created.');
  Logger.log('FORM (open on phone):  ' + form.getPublishedUrl());
  Logger.log('EDIT form:             ' + form.getEditUrl());
  Logger.log('RESPONSES sheet:       ' + ss.getUrl());
}
