/**
 * Vincere-Lexus CRM — ONE-CLICK BUILDER.
 *
 * Builds the entire formula-driven CRM described in CRM-DESIGN.md into the
 * current Google Sheet: all tabs, headers, formulas, named ranges, number
 * formats, and (optionally) a few sample rows so you can see it work.
 *
 * HOW TO USE
 *   1. Create a NEW blank Google Sheet (sheets.new).
 *   2. Extensions -> Apps Script. Delete any code, paste THIS whole file, Save.
 *   3. Pick `buildCRM` in the function dropdown, click Run, approve the prompt.
 *   4. Back in the sheet: a "Vincere CRM" menu also appears after reload.
 *
 * Re-running is safe: it clears and rebuilds every tab it owns.
 * Set INCLUDE_SAMPLE = false below if you don't want the demo rows.
 *
 * Google-only functions (QUERY/ARRAYFORMULA/LAMBDA/REDUCE/XLOOKUP) are written
 * straight into the cells here, so they work natively — which is exactly why a
 * .xlsx/.csv import can't do this and a script can.
 */

var INCLUDE_SAMPLE = true;

/** Optional menu so you can rebuild from the sheet UI. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Vincere CRM')
    .addItem('Build / Rebuild CRM', 'buildCRM')
    .addItem('Hide helper tabs', 'hideHelpers')
    .addToUi();
}

function hideHelpers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ['_AllVehicles', '_NewMatches', '_UsedMatches'].forEach(function (n) {
    var sh = ss.getSheetByName(n); if (sh) sh.hideSheet();
  });
}

function buildCRM() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ---- column headers ---------------------------------------------------
  var NEW_HEAD = ['Dealer', 'Order Number', 'Order Type', 'Status', 'VTN', 'VIN',
    'Model Year', 'Series', 'Model', 'Suffix', 'Color', 'Accessory',
    'ETA From', 'ETA To', 'Customer Name', 'Comments'];
  var USED_HEAD = ['In-Stock Date', 'Stk#', 'Year', 'Make', 'Model', 'Package',
    'Colour (ext/int)', 'Km', 'Retail Price', 'Description (Carfax / # owners)',
    'Status', '# of Keys', 'Recon Sent', 'Photo', 'Delivery Board', 'Tires'];
  var CLIENT_HEAD = ['Client Name', 'Phone', 'Email', 'Budget', 'Make', 'Model Year',
    'Series', 'Model', 'Color', 'Max Km', 'Status', 'Notes', 'Last Contact'];
  var PRICE_HEAD = ['Model Year', 'Series', 'Model', 'Suffix', 'MSRP', 'Trim Notes'];
  var FBLOG_HEAD = ['Stk#', 'Posted Date', 'Notes'];
  var MATCH_HEAD = ['Client Name', 'Client Status', 'Type', 'Stage/Source', 'Stk#/Order#',
    'VIN', 'Make', 'Year', 'Series', 'Model', 'Color', 'Km', 'Price',
    'Budget Fit', 'Vehicle Status', 'ETA From', 'ETA To', 'Comments/Description'];
  var UPSELL_HEAD = ['Customer Name', 'Current Vehicle', 'Suggested Vehicle', 'Type',
    'Stage/Source', 'Suggested Price', 'VIN/Stk#', 'Km', 'ETA From', 'ETA To'];
  var REPOST_HEAD = ['Stk#', 'Year', 'Make', 'Model', 'Last Posted', 'Next Due',
    'Days Over', 'Status', 'Add to Calendar'];
  var ALLVEH_HEAD = ['Stage'].concat(NEW_HEAD);

  // ---- sample data (set INCLUDE_SAMPLE = false to skip) -----------------
  var D = function (y, m, d) { return new Date(y, m - 1, d); };
  var sampleInv = INCLUDE_SAMPLE ? [
    ['Lexus Downtown', 'ORD1001', 'Stock', 'Available', '', 'JTXAAAA1', 2025, 'RX', 'RX350', 'A', 'Caviar', '', '', '', '', 'Demo sample — delete me']
  ] : [];
  var samplePipe = INCLUDE_SAMPLE ? [
    ['Lexus Downtown', 'ORD1002', 'Order', 'Ordered', '', '', 2025, 'NX', 'NX350', 'B', 'Nori Green', '', D(2026, 6, 25), D(2026, 7, 2), 'Existing Customer A', '']
  ] : [];
  var sampleDel = INCLUDE_SAMPLE ? [
    ['Lexus Downtown', 'ORD1003', 'Sold', 'Delivery', '', 'JTXBBBB2', 2024, 'ES', 'ES350', 'C', 'Silver', '', D(2026, 6, 28), D(2026, 6, 30), 'Existing Customer A', '']
  ] : [];
  var sampleUsed = INCLUDE_SAMPLE ? [
    [D(2026, 1, 1), 'U500', 2022, 'Toyota', 'RAV4', 'XLE', 'Blue / Black', 45000, 32000, 'Carfax clean / 1 owner', 'Available', 2, 'Yes', 'Yes', '', 'All-season'],
    [D(2026, 6, 20), 'U501', 2023, 'Lexus', 'RX350', 'Premium', 'Caviar / Black', 20000, 58000, 'Carfax clean / 1 owner', 'Available', 2, 'Yes', 'Yes', '', 'All-season']
  ] : [];
  var sampleClients = INCLUDE_SAMPLE ? [
    ['Jane Prospect', '555-0101', 'jane@example.com', 60000, '', '', 'RX', '', 'Caviar', '', 'Hot', 'Wants a caviar RX', D(2026, 6, 20)],
    ['Bob Shopper', '555-0102', 'bob@example.com', 30000, 'Toyota', 2022, '', 'RAV4', '', '', 'Cold', 'Budget used SUV', D(2026, 6, 10)]
  ] : [];
  var samplePricing = INCLUDE_SAMPLE ? [
    [2025, 'RX', 'RX350', 'A', 62000, ''],
    [2025, 'NX', 'NX350', 'B', 48000, ''],
    [2024, 'ES', 'ES350', 'C', 50000, '']
  ] : [];
  var sampleFb = INCLUDE_SAMPLE ? [
    ['U500', D(2026, 6, 1), 'Initial post']
  ] : [];

  // ---- create/clear the simple (header + data) tabs --------------------
  function build(name, head, sample, opts) {
    opts = opts || {};
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.clear();
    sh.getRange(1, 1, 1, head.length).setValues([head])
      .setFontWeight('bold').setBackground('#f1f3f4');
    sh.setFrozenRows(1);
    if (sample && sample.length) sh.getRange(2, 1, sample.length, head.length).setValues(sample);
    (opts.dateCols || []).forEach(function (c) {
      sh.getRange(2, c, sh.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd');
    });
    (opts.moneyCols || []).forEach(function (c) {
      sh.getRange(2, c, sh.getMaxRows() - 1, 1).setNumberFormat('$#,##0');
    });
    return sh;
  }

  build('Inventory', NEW_HEAD, sampleInv, { dateCols: [13, 14] });
  build('Pipeline', NEW_HEAD, samplePipe, { dateCols: [13, 14] });
  build('Delivery', NEW_HEAD, sampleDel, { dateCols: [13, 14] });
  build('Used', USED_HEAD, sampleUsed, { dateCols: [1], moneyCols: [9] });
  build('Clients', CLIENT_HEAD, sampleClients, { dateCols: [13], moneyCols: [4] });
  build('Pricing', PRICE_HEAD, samplePricing, { moneyCols: [5] });
  build('FB_Log', FBLOG_HEAD, sampleFb, { dateCols: [2] });
  build('Matches', MATCH_HEAD, [], { dateCols: [16, 17], moneyCols: [13] });
  build('Upsell', UPSELL_HEAD, [], { moneyCols: [6] });
  build('Reposting', REPOST_HEAD, [], { dateCols: [5, 6] });
  build('_AllVehicles', ALLVEH_HEAD, [], { dateCols: [14, 15] });
  build('_NewMatches', MATCH_HEAD, [], {});
  build('_UsedMatches', MATCH_HEAD, [], {});

  // ---- Config tab + named ranges ---------------------------------------
  var cfg = ss.getSheetByName('Config') || ss.insertSheet('Config');
  cfg.clear();
  cfg.getRange('A1:B1').setValues([['Setting', 'Value']]).setFontWeight('bold').setBackground('#f1f3f4');
  cfg.getRange('A2:B5').setValues([
    ['Used unavailable status regex', 'sold|pend|deposit|hold|wholesale|deliver|apprais|service'],
    ['New Make label', 'Lexus'],
    ['Upsell rule (OR / AND)', 'OR'],
    ['Repost interval (days)', 10]
  ]);
  cfg.getRange('D1:E1').setValues([['Series', 'Rank']]).setFontWeight('bold').setBackground('#f1f3f4');
  cfg.getRange('D2:E12').setValues([
    ['UX', 1], ['IS', 2], ['NX', 3], ['ES', 4], ['RZ', 4], ['RC', 5],
    ['RX', 6], ['GX', 7], ['LC', 8], ['LS', 9], ['LX', 10]
  ]);
  cfg.setFrozenRows(1);

  function named(name, a1) {
    ss.getNamedRanges().forEach(function (nr) { if (nr.getName() === name) nr.remove(); });
    ss.setNamedRange(name, cfg.getRange(a1));
  }
  named('UsedUnavailRegex', 'B2');
  named('NewMakeDefault', 'B3');
  named('UpsellMode', 'B4');
  named('RepostDays', 'B5');
  named('SeriesRankTbl', 'D2:E1000');

  // ---- the engine formulas (verbatim from CRM-DESIGN.md) ---------------
  setF('_AllVehicles', 'A2', F_ALLVEH);
  setF('_NewMatches', 'A2', F_NEWMATCH);
  setF('_UsedMatches', 'A2', F_USEDMATCH);
  setF('Matches', 'A2', F_MATCHES);
  setF('Upsell', 'A2', F_UPSELL);
  setF('Reposting', 'A2', F_REPOST);

  // ---- Dashboard --------------------------------------------------------
  buildDashboard(ss);

  // ---- finishing touches ------------------------------------------------
  hideHelpers();
  var leftover = ss.getSheetByName('Sheet1');
  if (leftover) ss.deleteSheet(leftover);
  var dash = ss.getSheetByName('Dashboard');
  ss.setActiveSheet(dash); ss.moveActiveSheet(1);
  SpreadsheetApp.getActiveSpreadsheet().toast('CRM built. Open the Dashboard tab.', 'Vincere CRM', 5);
}

/** Set a formula (string starting with "=") on one A1 cell. */
function setF(sheetName, a1, formula) {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName).getRange(a1).setFormula(formula);
}

function buildDashboard(ss) {
  var sh = ss.getSheetByName('Dashboard') || ss.insertSheet('Dashboard');
  sh.clear();
  var cells = {
    'A1': 'VINCERE-LEXUS — DAILY DASHBOARD',
    'A2': '=TEXT(NOW(),"ddd d mmm yyyy  h:mm")&"  ·  auto-recalculates on any change"',
    'A4': 'NEW — COUNTS',
    'A5': 'Inventory', 'B5': '=SUMPRODUCT((LEN(Inventory!B2:B)+LEN(Inventory!F2:F))>0)',
    'A6': 'Pipeline', 'B6': '=SUMPRODUCT((LEN(Pipeline!B2:B)+LEN(Pipeline!F2:F))>0)',
    'A7': 'Delivery', 'B7': '=SUMPRODUCT((LEN(Delivery!B2:B)+LEN(Delivery!F2:F))>0)',
    'A8': 'New total', 'B8': '=B5+B6+B7',
    'A10': 'USED — COUNTS',
    'A11': 'Total used', 'B11': '=SUMPRODUCT((LEN(Used!B2:B)+LEN(Used!I2:I))>0)',
    'A12': 'Available', 'B12': '=SUM(ARRAYFORMULA(((LEN(Used!B2:B)+LEN(Used!I2:I))>0)*NOT(REGEXMATCH(LOWER(TRIM(""&Used!K2:K)),UsedUnavailRegex))))',
    'A13': 'Aging >60d', 'B13': '=SUM(ARRAYFORMULA(((LEN(Used!B2:B)+LEN(Used!I2:I))>0)*NOT(REGEXMATCH(LOWER(TRIM(""&Used!K2:K)),UsedUnavailRegex))*(N(Used!A2:A)>0)*(N(Used!A2:A)<(TODAY()-60))))',
    'D4': 'CLIENTS',
    'D5': 'Hot', 'E5': '=SUM(ARRAYFORMULA(--(LOWER(TRIM(""&Clients!K2:K))="hot")))',
    'D6': 'Warm', 'E6': '=SUM(ARRAYFORMULA(--(LOWER(TRIM(""&Clients!K2:K))="warm")))',
    'D7': 'Cold', 'E7': '=SUM(ARRAYFORMULA(--(LOWER(TRIM(""&Clients!K2:K))="cold")))',
    'D8': 'Total', 'E8': '=COUNTA(Clients!A2:A)',
    'D10': 'UPSELL',
    'D11': 'Opportunities', 'E11': '=COUNTA(Upsell!A2:A)',
    'D12': 'Top suggested $', 'E12': '=IFERROR(MAX(Upsell!F2:F),0)',
    'G4': 'FB MARKETPLACE',
    'G5': 'Reposts due now', 'H5': '=SUMPRODUCT((LEN(Reposting!A2:A)>0)*(N(Reposting!F2:F)>0)*(N(Reposting!F2:F)<=TODAY()))',
    'G6': 'Never posted', 'H6': '=COUNTIF(Reposting!H2:H,"NEVER POSTED")',
    'A16': 'HOT CLIENTS WITH MATCHES (in-budget)',
    'A17': '=IFERROR(QUERY(Matches!A2:R,"select A,C,E,M where upper(B)=\'HOT\' and (N=\'In Budget\' or N=\'No Budget Set\') order by A label A \'Client\', C \'Type\', E \'Stk#/Order#\', M \'Price\'",0),"None yet")',
    'F16': 'UNMATCHED HOT CLIENTS (sourcing list)',
    'F17': '=IFERROR(FILTER(Clients!A2:A,ARRAYFORMULA((LOWER(TRIM(""&Clients!K2:K))="hot")*(LEN(Clients!A2:A)>0)*(COUNTIF(Matches!A:A,Clients!A2:A)=0))),"None")',
    'H15': 'AGING PIPELINE (ETA <= today+7)',
    'H16': 'Order#', 'I16': 'Series', 'J16': 'Model', 'K16': 'ETA To', 'L16': 'Customer',
    'H17': '=IFERROR(SORT(FILTER({Pipeline!B2:B,Pipeline!H2:H,Pipeline!I2:I,Pipeline!N2:N,Pipeline!O2:O},ARRAYFORMULA((LEN(Pipeline!B2:B)>0)*(N(Pipeline!N2:N)>0)*(N(Pipeline!N2:N)<=(TODAY()+7)))),4,TRUE),"None")',
    'N15': 'AGING USED (>60d, available)',
    'N16': 'Stk#', 'O16': 'Year', 'P16': 'Make', 'Q16': 'Model', 'R16': 'In-Stock', 'S16': 'Km', 'T16': 'Retail',
    'N17': '=IFERROR(SORT(FILTER({Used!B2:B,Used!C2:C,Used!D2:D,Used!E2:E,Used!A2:A,Used!H2:H,Used!I2:I},ARRAYFORMULA((LEN(Used!B2:B)>0)*NOT(REGEXMATCH(LOWER(TRIM(""&Used!K2:K)),UsedUnavailRegex))*(N(Used!A2:A)>0)*(N(Used!A2:A)<(TODAY()-60)))),5,TRUE),"None")',
    'A40': 'INVENTORY BY SERIES (on-lot)',
    'A41': '=IFERROR(QUERY(_AllVehicles!A2:Q,"select I, count(C) where A=\'Inventory\' group by I order by count(C) desc label I \'Series\', count(C) \'Units\'",0),"None")',
    'D40': 'USED BY MAKE / MODEL',
    'D41': '=IFERROR(QUERY(Used!A2:P,"select D, E, count(B) where B is not null group by D, E order by count(B) desc label D \'Make\', E \'Model\', count(B) \'Units\'",0),"None")',
    'H40': 'TOP UPSELL OPPORTUNITIES',
    'H41': '=IFERROR(QUERY(Upsell!A2:J,"select A, C, F where A is not null order by F desc limit 8 label A \'Customer\', C \'Suggested\', F \'Price\'",0),"None")',
    'A56': 'FB MARKETPLACE — REPOST DUE (Stk# · Year · Make · Model · Next Due · Status · add)',
    'A57': '=IFERROR(SORT(FILTER({Reposting!A2:A,Reposting!B2:B,Reposting!C2:C,Reposting!D2:D,Reposting!F2:F,Reposting!H2:H,Reposting!I2:I},ARRAYFORMULA((LEN(Reposting!A2:A)>0)*(N(Reposting!F2:F)>0)*(N(Reposting!F2:F)<=TODAY()))),5,TRUE),"Nothing due")'
  };
  Object.keys(cells).forEach(function (a1) {
    var v = cells[a1];
    if (typeof v === 'string' && v.charAt(0) === '=') sh.getRange(a1).setFormula(v);
    else sh.getRange(a1).setValue(v);
  });
  // light styling
  sh.getRange('A1').setFontSize(14).setFontWeight('bold');
  ['A4', 'A10', 'D4', 'D10', 'G4', 'A16', 'F16', 'H15', 'N15', 'A40', 'D40', 'H40', 'A56']
    .forEach(function (a1) { sh.getRange(a1).setFontWeight('bold'); });
  ['H16:L16', 'N16:T16'].forEach(function (r) { sh.getRange(r).setFontWeight('bold').setBackground('#f1f3f4'); });
  sh.setHiddenGridlines(true);
}

/* ====================================================================== *
 *  ENGINE FORMULAS — kept verbatim with CRM-DESIGN.md §6, §7, §8, §14.   *
 *  Backtick strings so the embedded " and ' need no escaping.           *
 * ====================================================================== */

var F_ALLVEH = `=LET(
  blk, LAMBDA(rng, stg, HSTACK(ARRAYFORMULA(IF(LEN(INDEX(rng,0,2))+LEN(INDEX(rng,0,6)), stg, )), rng)),
  all, VSTACK(
         blk(Inventory!A2:P, "Inventory"),
         blk(Pipeline!A2:P,  "Pipeline"),
         blk(Delivery!A2:P,  "Delivery")
       ),
  IFERROR(FILTER(all, ARRAYFORMULA(LEN(INDEX(all,0,3)) + LEN(INDEX(all,0,7)) > 0)), IF(SEQUENCE(1,17),""))
)`;

var F_NEWMATCH = `=LET(
  norm, LAMBDA(x, LOWER(TRIM(""&x))),
  col,  LAMBDA(v,h, IF(SEQUENCE(h), v)),
  C,    Clients!A2:M,
  nC,   COUNTA(Clients!A2:A),
  V,    _AllVehicles!A2:Q,
  pK,   IF(COUNTA(Pricing!A2:A)=0, "",
           ARRAYFORMULA(norm(Pricing!A2:A)&"|"&norm(Pricing!B2:B)&"|"&norm(Pricing!C2:C)&"|"&norm(Pricing!D2:D))),
  pV,   Pricing!E2:E,
  npK,  COUNTA(Pricing!A2:A),
  seed, IF(SEQUENCE(1,18), "__SEED__"),
  res,  IF(nC=0, seed,
    REDUCE(seed, SEQUENCE(nC), LAMBDA(acc, i,
      LET(
        cN, INDEX(C,i,1), cB, INDEX(C,i,4), cY, INDEX(C,i,6),
        cS, INDEX(C,i,7), cM, INDEX(C,i,8), cC, INDEX(C,i,9), cSt, INDEX(C,i,11),
        mask, ARRAYFORMULA(
                ( LEN(INDEX(V,0,3)) + LEN(INDEX(V,0,7)) > 0 ) *
                ( (norm(cY)="") + (norm(INDEX(V,0,8))=norm(cY)) > 0 ) *
                ( (norm(cS)="") + (norm(INDEX(V,0,9))=norm(cS)) > 0 ) *
                ( (norm(cM)="") + (norm(INDEX(V,0,10))=norm(cM)) > 0 ) *
                ( (norm(cC)="") + ISNUMBER(SEARCH(norm(cC), norm(INDEX(V,0,12)))) > 0 )
              ),
        hit, SUMPRODUCT(mask),
        IF(hit=0, acc, LET(
          M,    FILTER(V, mask),
          h,    ROWS(M),
          mk,   ARRAYFORMULA(norm(INDEX(M,0,8))&"|"&norm(INDEX(M,0,9))&"|"&norm(INDEX(M,0,10))&"|"&norm(INDEX(M,0,11))),
          msrp, IF(npK=0, col("",h), ARRAYFORMULA(IFERROR(XLOOKUP(mk, pK, pV), ""))),
          fit,  IF(cB="", col("No Budget Set",h),
                  ARRAYFORMULA(IF(msrp="", "No MSRP",
                    IF(N(msrp)<=N(cB), "In Budget", "Over by $"&TEXT(N(msrp)-N(cB),"#,##0"))))),
          blk,  HSTACK(
                  col(cN,h), col(cSt,h), col("New",h),
                  INDEX(M,0,1), INDEX(M,0,3), INDEX(M,0,7),
                  col(NewMakeDefault,h), INDEX(M,0,8), INDEX(M,0,9), INDEX(M,0,10),
                  INDEX(M,0,12), col("",h), msrp, fit, INDEX(M,0,5),
                  INDEX(M,0,14), INDEX(M,0,15), INDEX(M,0,17)),
          VSTACK(acc, blk)
        ))
      )
    ))),
  IFERROR(FILTER(res, INDEX(res,0,1)<>"__SEED__"), IF(SEQUENCE(1,18),""))
)`;

var F_USEDMATCH = `=LET(
  norm, LAMBDA(x, LOWER(TRIM(""&x))),
  col,  LAMBDA(v,h, IF(SEQUENCE(h), v)),
  C,    Clients!A2:M,
  nC,   COUNTA(Clients!A2:A),
  U,    Used!A2:P,
  avail, ARRAYFORMULA(
           ( LEN(INDEX(U,0,2)) + LEN(INDEX(U,0,9)) > 0 ) *
           ( NOT(REGEXMATCH(norm(INDEX(U,0,11)), UsedUnavailRegex)) )
         ),
  seed, IF(SEQUENCE(1,18), "__SEED__"),
  res,  IF(nC=0, seed,
    REDUCE(seed, SEQUENCE(nC), LAMBDA(acc, i,
      LET(
        cN, INDEX(C,i,1), cB, INDEX(C,i,4), cMk, INDEX(C,i,5), cY, INDEX(C,i,6),
        cM, INDEX(C,i,8), cC, INDEX(C,i,9), cKm, INDEX(C,i,10), cSt, INDEX(C,i,11),
        mask, ARRAYFORMULA(
                avail *
                ( (norm(cMk)="") + (norm(INDEX(U,0,4))=norm(cMk)) > 0 ) *
                ( (norm(cY)="")  + (norm(INDEX(U,0,3))=norm(cY))  > 0 ) *
                ( (norm(cM)="")  + (norm(INDEX(U,0,5))=norm(cM))  > 0 ) *
                ( (norm(cC)="")  + ISNUMBER(SEARCH(norm(cC), norm(INDEX(U,0,7)))) > 0 ) *
                ( (cKm="")       + (N(INDEX(U,0,8)) <= N(cKm))    > 0 )
              ),
        hit, SUMPRODUCT(mask),
        IF(hit=0, acc, LET(
          M,   FILTER(U, mask),
          h,   ROWS(M),
          fit, IF(cB="", col("No Budget Set",h),
                 ARRAYFORMULA(IF(N(INDEX(M,0,9))<=N(cB), "In Budget",
                   "Over by $"&TEXT(N(INDEX(M,0,9))-N(cB),"#,##0")))),
          blk, HSTACK(
                 col(cN,h), col(cSt,h), col("Used",h), col("Used",h),
                 INDEX(M,0,2), col("",h), INDEX(M,0,4), INDEX(M,0,3), col("",h),
                 INDEX(M,0,5), INDEX(M,0,7), INDEX(M,0,8), INDEX(M,0,9), fit,
                 INDEX(M,0,11), col("",h), col("",h), INDEX(M,0,10)),
          VSTACK(acc, blk)
        ))
      )
    ))),
  IFERROR(FILTER(res, INDEX(res,0,1)<>"__SEED__"), IF(SEQUENCE(1,18),""))
)`;

var F_MATCHES = `=LET(
  all, VSTACK(IFERROR(_NewMatches!A2:R, IF(SEQUENCE(1,18),"")),
              IFERROR(_UsedMatches!A2:R, IF(SEQUENCE(1,18),""))),
  f,   FILTER(all, ARRAYFORMULA(LEN(INDEX(all,0,1)) > 0)),
  IFERROR(SORT(f, 1, TRUE, 3, TRUE), IF(SEQUENCE(1,18),""))
)`;

var F_UPSELL = `=LET(
  norm, LAMBDA(x, LOWER(TRIM(""&x))),
  col,  LAMBDA(v,h, IF(SEQUENCE(h), v)),
  rank, LAMBDA(s, IFERROR(XLOOKUP(norm(s), ARRAYFORMULA(norm(INDEX(SeriesRankTbl,0,1))), INDEX(SeriesRankTbl,0,2), 0), 0)),
  V,    _AllVehicles!A2:Q,
  U,    Used!A2:P,
  pK,   IF(COUNTA(Pricing!A2:A)=0, "", ARRAYFORMULA(norm(Pricing!A2:A)&"|"&norm(Pricing!B2:B)&"|"&norm(Pricing!C2:C)&"|"&norm(Pricing!D2:D))),
  pV,   Pricing!E2:E,
  npK,  COUNTA(Pricing!A2:A),
  mode, UPPER(TRIM(""&UpsellMode)),
  uavail, ARRAYFORMULA( (LEN(INDEX(U,0,2))+LEN(INDEX(U,0,9))>0) * NOT(REGEXMATCH(norm(INDEX(U,0,11)), UsedUnavailRegex)) ),
  nCust,    IFERROR(ROWS(UNIQUE(FILTER(INDEX(V,0,16), LEN(INDEX(V,0,16))>0))), 0),
  custList, IFERROR(UNIQUE(FILTER(INDEX(V,0,16), LEN(INDEX(V,0,16))>0)), ""),
  seed, IF(SEQUENCE(1,10), "__SEED__"),
  res, IF(nCust=0, seed,
    REDUCE(seed, SEQUENCE(nCust), LAMBDA(acc, k,
      LET(
        cust, INDEX(custList, k, 1),
        own,  FILTER(V, ARRAYFORMULA(norm(INDEX(V,0,16))=norm(cust))),
        curY, MAX(ARRAYFORMULA(N(INDEX(own,0,8)))),
        curR, MAX(ARRAYFORMULA(rank(INDEX(own,0,9)))),
        curV, INDEX(SORT(own, 8, FALSE), 1, 0),
        curStr, TRIM(INDEX(curV,1,8) & " " & INDEX(curV,1,9) & " " & INDEX(curV,1,10)),
        qN, ARRAYFORMULA(
              (LEN(INDEX(V,0,3))+LEN(INDEX(V,0,7))>0) *
              (norm(INDEX(V,0,16))<>norm(cust)) *
              IF(mode="AND",
                 (N(INDEX(V,0,8))>curY) * (rank(INDEX(V,0,9))>curR),
                 ((N(INDEX(V,0,8))>curY) + (rank(INDEX(V,0,9))>curR) > 0))
            ),
        qU, ARRAYFORMULA( uavail * (N(INDEX(U,0,3))>curY) ),
        withN, IF(SUMPRODUCT(qN)=0, acc, LET(
                 M, FILTER(V, qN), h, ROWS(M),
                 mk, ARRAYFORMULA(norm(INDEX(M,0,8))&"|"&norm(INDEX(M,0,9))&"|"&norm(INDEX(M,0,10))&"|"&norm(INDEX(M,0,11))),
                 price, IF(npK=0, col("",h), ARRAYFORMULA(IFERROR(XLOOKUP(mk,pK,pV),""))),
                 sug, ARRAYFORMULA(TRIM(INDEX(M,0,8)&" "&INDEX(M,0,9)&" "&INDEX(M,0,10))),
                 VSTACK(acc, HSTACK(col(cust,h), col(curStr,h), sug, col("New",h), INDEX(M,0,1), price, INDEX(M,0,7), col("",h), INDEX(M,0,14), INDEX(M,0,15)))
               )),
        IF(SUMPRODUCT(qU)=0, withN, LET(
                 M, FILTER(U, qU), h, ROWS(M),
                 sug, ARRAYFORMULA(TRIM(INDEX(M,0,3)&" "&INDEX(M,0,4)&" "&INDEX(M,0,5))),
                 VSTACK(withN, HSTACK(col(cust,h), col(curStr,h), sug, col("Used",h), col("Used",h), INDEX(M,0,9), INDEX(M,0,2), INDEX(M,0,8), col("",h), col("",h)))
               ))
      )
    ))),
  IFERROR(SORT(FILTER(res, INDEX(res,0,1)<>"__SEED__"), 6, FALSE), IF(SEQUENCE(1,10),""))
)`;

var F_REPOST = `=LET(
  norm,  LAMBDA(x, LOWER(TRIM(""&x))),
  U,     Used!A2:P,
  avail, ARRAYFORMULA( (LEN(INDEX(U,0,2))+LEN(INDEX(U,0,9))>0) * NOT(REGEXMATCH(norm(INDEX(U,0,11)), UsedUnavailRegex)) ),
  A,     IFERROR(FILTER(U, avail), ""),
  stk,   INDEX(A,0,2),
  last,  MAP(stk, LAMBDA(s, IF(LEN(s)=0, "", IFERROR(MAXIFS(FB_Log!B:B, FB_Log!A:A, s), 0)))),
  due,   ARRAYFORMULA(IF(last="", "", IF(last=0, TODAY(), last + RepostDays))),
  over,  ARRAYFORMULA(IF(last="", "", TODAY() - due)),
  stat,  ARRAYFORMULA(IF(last="", "", IF(last=0, "NEVER POSTED", IF(TODAY()>=due, "REPOST DUE", "OK")))),
  subj,  ARRAYFORMULA("Repost "&stk&" "&INDEX(A,0,3)&" "&INDEX(A,0,4)&" "&INDEX(A,0,5)&" on FB Marketplace"),
  link,  MAP(stk, due, subj, LAMBDA(s,d,t, IF(LEN(s)=0, "",
            HYPERLINK("https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&allday=true&subject="
                      & ENCODEURL(t) & "&startdt=" & TEXT(d,"yyyy-mm-dd"), "➕ Outlook")))),
  lastD, ARRAYFORMULA(IF(last="", "", IF(last=0, "—", last))),
  out,   HSTACK(stk, INDEX(A,0,3), INDEX(A,0,4), INDEX(A,0,5), lastD, due, over, stat, link),
  IFERROR(SORT(FILTER(out, ARRAYFORMULA(LEN(stk)>0)), 6, TRUE), IF(SEQUENCE(1,9),""))
)`;
