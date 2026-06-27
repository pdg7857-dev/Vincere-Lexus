# Vincere‑Lexus — Google Sheets Dealership CRM

A **formula‑first** CRM that sits on top of your pasted inventory exports and auto‑matches
clients to vehicles, surfaces upsell opportunities, and drives a one‑screen daily dashboard.

> **Design stance:** everything below is live formulas (`ARRAYFORMULA` / `QUERY` / `FILTER` /
> `XLOOKUP` / `REDUCE`+`VSTACK`). **No Apps Script is required for any deliverable.** A single
> *optional* script (daily snapshot history) is provided at the end and clearly flagged as optional.
> Modern Sheets functions used: `LET`, `LAMBDA`, `REDUCE`, `MAP`, `VSTACK`, `HSTACK`, `XLOOKUP`,
> `SEQUENCE`. These are all available in current Google Sheets.

---

## 1. Tab map

| Tab | Type | You edit? | Purpose |
|---|---|---|---|
| `Inventory` | raw input (given) | paste | New, on lot now — cols A–P |
| `Pipeline` | raw input (given) | paste | New, ordered/incoming — cols A–P |
| `Delivery` | raw input (given) | paste | New, going out — cols A–P |
| `Used` | raw input (given) | paste | Used multi‑brand — cols A–P |
| `Clients` | reference | edit | Prospects actively looking |
| `Pricing` | reference | edit | MSRP table for NEW vehicles |
| `Config` | reference | edit rules | Editable rules: availability regex, series ranking, upsell rule, repost interval |
| `FB_Log` | input | add 1 row/post | Facebook Marketplace post log: `Stk#` + date posted (see §14) |
| **`Matches`** | **output** | never | Unified client↔vehicle matches (New + Used) |
| **`Upsell`** | **output** | never | Existing customers ↔ upgrade vehicles |
| **`Reposting`** | **output** | never | Used repost tracker: last post, next‑due (+N days), 1‑click "add to calendar" (§14) |
| **`Dashboard`** | **output** | never | One‑screen daily view (incl. "reposts due today") |
| `_AllVehicles` | hidden helper | never | The 3 NEW sheets stacked + a `Stage` column |
| `_NewMatches` | hidden helper | never | NEW matching engine output |
| `_UsedMatches` | hidden helper | never | USED matching engine output |

**Why the hidden helpers (and why the split):**
- `_AllVehicles` exists so new‑vehicle logic is written **once**, not copy‑pasted 3×. Matches, Upsell
  and the Dashboard all read from it.
- I split the match engine into `_NewMatches` + `_UsedMatches` (each hidden) and then **union them into
  one visible `Matches` list**. You still get *one unified list per client* (the requirement), but the
  two code paths stay separate because NEW and USED genuinely differ: NEW matches on **Series** and
  pulls **MSRP** from `Pricing`; USED matches on **Make**, uses **Retail** directly, adds a **Km cap**,
  and has its own **availability** rule. One mega‑formula trying to do both would be unmaintainable and
  hard to extend — exactly what you asked to avoid. The thin `Matches` tab just stacks + sorts them.

To hide a helper: right‑click its tab → **Hide sheet**. Nothing references a tab by visibility, so
hiding is cosmetic and safe.

---

## 2. Conventions used everywhere

- **Case‑insensitive + trimmed matching:** every comparison runs through `LOWER(TRIM(""&x))`.
  The `""&` coerces numbers/blanks to text so a blank never throws.
- **Wildcards:** a blank client field (Year/Series/Model/Color/Make/Max Km) means "match anything"
  for that field. Implemented as `(clientField is blank) OR (vehicleField = clientField)`.
- **Color is a "contains" match** (`SEARCH`), because Used stores `Colour (ext/int)` as one combined
  string. So a client Color of `Caviar` matches a Used colour of `Caviar / Black`. Same lenient rule is
  applied to NEW for consistency.
- **Empty‑sheet safety:** every output formula is wrapped so that before any data exists you get a
  blank cell or a friendly word ("None"), never `#REF!`/`#N/A` spam. The pattern is
  `IFERROR( …, IF(SEQUENCE(1,N),"") )` for array outputs and `IFERROR( …, "None")` for single blocks.
- **Auto‑update:** there is **nothing to refresh**. Every output is a single live array formula in the
  top‑left cell of its block; add/paste/delete a row in any source and the outputs recompute instantly.

---

## 3. `Config` tab — editable rules (you set these once)

Lay it out exactly like this, then create the **named ranges** in the last column.

| Cell | Value (default) | Named range to create | Meaning |
|---|---|---|---|
| `A1` | `Setting` | — | header |
| `B1` | `Value` | — | header |
| `A2` | `Used unavailable status regex` | — | label |
| `B2` | `sold\|pend\|deposit\|hold\|wholesale\|deliver\|apprais\|service` | **`UsedUnavailRegex`** | a Used unit is **available** unless its Status matches this (case‑insensitive). |
| `A3` | `New Make label` | — | label |
| `B3` | `Lexus` | **`NewMakeDefault`** | Make shown for NEW rows (new sheets have no Make column). |
| `A4` | `Upsell rule` | — | label |
| `B4` | `OR` | **`UpsellMode`** | `OR` = newer **year** *or* higher **series** qualifies; `AND` = must be both. |
| `A5` | `Repost interval (days)` | — | label |
| `B5` | `10` | **`RepostDays`** | Days after a Facebook Marketplace post before it's due to repost (§14). |

Series ranking table (anywhere to the right, e.g. D:E):

| Cell | | |
|---|---|---|
| `D1` `Series` | `E1` `Rank` | header |
| `D2` `UX` | `E2` `1` | |
| `D3` `IS` | `E3` `2` | |
| `D4` `NX` | `E4` `3` | |
| `D5` `ES` | `E5` `4` | |
| `D6` `RZ` | `E6` `4` | |
| `D7` `RC` | `E7` `5` | |
| `D8` `RX` | `E8` `6` | |
| `D9` `GX` | `E9` `7` | |
| `D10` `LC` | `E10` `8` | |
| `D11` `LS` | `E11` `9` | |
| `D12` `LX` | `E12` `10` | |

Create named range **`SeriesRankTbl`** → `Config!$D$2:$E$1000`.
Higher rank = "more premium" for the upsell rule. **Edit these numbers** to match how *you* think about
the ladder — they are the entire definition of "higher series". Rows you don't list rank as `0`.

> **Create named ranges:** Data → Named ranges. Name them exactly `UsedUnavailRegex`, `NewMakeDefault`,
> `UpsellMode`, `RepostDays`, `SeriesRankTbl`. The formulas below reference these names directly.

---

## 4. `Clients` tab (reference — you maintain)

Headers in row 1, data from row 2. **Leave a field blank to make it a wildcard.**

| Col | Header | Notes |
|---|---|---|
| A | Client Name | |
| B | Phone | |
| C | Email | |
| D | Budget | **number** (no `$`/commas as text). Blank = no budget constraint. |
| E | Make | used‑matching only; blank = any. For an all‑Lexus new shopper leave blank or put `Lexus`. |
| F | Model Year | blank = any |
| G | Series | NEW matching (e.g. `RX`, `NX`); blank = any |
| H | Model | blank = any |
| I | Color | blank = any; "contains" match |
| J | Max Km | used only; blank = no cap; **number** |
| K | Status | `Hot` / `Warm` / `Cold` |
| L | Notes | |
| M | Last Contact | date |

---

## 5. `Pricing` tab (reference — you maintain) — NEW MSRP only

Headers row 1, data row 2+. Keyed on **Year + Series + Model + Suffix** (matches the NEW sheets' cols
G/H/I/J).

| Col | Header |
|---|---|
| A | Model Year |
| B | Series |
| C | Model |
| D | Suffix |
| E | MSRP (number) |
| F | Trim Notes |

A NEW vehicle whose Year/Series/Model/Suffix isn't found here shows Price = blank and Budget Fit =
`No MSRP` (so you can see the gap). Used needs no Pricing — it carries its own Retail price.

---

## 6. `_AllVehicles` hidden helper — stack the 3 NEW sheets once

This is the backbone for all NEW logic. **Row 1 = headers, one formula in `A2`.**

**`_AllVehicles!A1:Q1`** (type as literals):

```
Stage | Dealer | Order Number | Order Type | Status | VTN | VIN | Model Year | Series | Model | Suffix | Color | Accessory | ETA From | ETA To | Customer Name | Comments
```

**`_AllVehicles!A2`** (single formula — stacks Inventory→Pipeline→Delivery, tags each with its Stage,
and drops empty rows):

```
=LET(
  blk, LAMBDA(rng, stg, HSTACK(ARRAYFORMULA(IF(LEN(INDEX(rng,0,2))+LEN(INDEX(rng,0,6)), stg, )), rng)),
  all, VSTACK(
         blk(Inventory!A2:P, "Inventory"),
         blk(Pipeline!A2:P,  "Pipeline"),
         blk(Delivery!A2:P,  "Delivery")
       ),
  IFERROR(FILTER(all, ARRAYFORMULA(LEN(INDEX(all,0,3)) + LEN(INDEX(all,0,7)) > 0)), IF(SEQUENCE(1,17),""))
)
```

How it works:
- `blk(rng,stg)` prepends a Stage column: it writes the stage label on any row that has an Order Number
  (orig col B → `INDEX(rng,0,2)`) or a VIN (orig col F → `INDEX(rng,0,6)`), blank otherwise.
- `VSTACK` stacks the three blocks (each 17 cols: Stage + A–P).
- `FILTER … > 0` keeps only real rows (Order# **or** VIN present), so trailing blanks from open‑ended
  `A2:P` ranges are dropped.
- `IFERROR(…, IF(SEQUENCE(1,17),""))` → if all three sheets are empty you get one blank row, never an error.

After this, `_AllVehicles` columns are: **1**Stage **2**Dealer **3**Order# **4**OrderType **5**Status
**6**VTN **7**VIN **8**Year **9**Series **10**Model **11**Suffix **12**Color **13**Accessory
**14**ETA From **15**ETA To **16**Customer **17**Comments. (Referenced by number throughout.)

---

## 7. The match engines

Both engines produce the **same 18 columns** so they can be stacked. Column order (this is the
`Matches` schema):

`1`Client Name `2`Client Status `3`Type `4`Stage/Source `5`Stk#/Order# `6`VIN `7`Make `8`Year
`9`Series `10`Model `11`Color `12`Km `13`Price `14`Budget Fit `15`Vehicle Status `16`ETA From
`17`ETA To `18`Comments/Description

**How the engine works (both share the shape):** iterate clients with `REDUCE`. For each client build a
boolean **mask** over every vehicle (wildcard‑aware, trimmed, case‑insensitive). If the mask has any
hits, `FILTER` the vehicles down to the matches in one shot, build that client's block of output rows
with `HSTACK`, and `VSTACK` it onto the accumulator. A client with zero matches contributes nothing.
Result: **one row per (client, vehicle) match**, variable length, fully dynamic — no fixed N×M grid, no
blank padding. A throwaway `"__SEED__"` row seeds the accumulator and is filtered out at the very end
(it also guarantees a valid shape when there are no matches at all).

### 7a. `_NewMatches` (hidden)

**Row 1** = the 18 headers above (type as literals). **`_NewMatches!A2`:**

```
=LET(
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
)
```

Notes:
- `mask` factors, in order: row is real (Order# or VIN) · Year wildcard‑or‑equal · Series · Model ·
  Color contains. Each factor is `(blank) + (equal) > 0`, multiplied together = logical AND.
- `msrp` is a per‑row `XLOOKUP` on the composite key `Year|Series|Model|Suffix`; misses → `""` → Budget
  Fit `No MSRP`.
- `fit`: blank budget → `No Budget Set`; else `In Budget` or `Over by $X`.
- `col(v,h)` makes an `h×1` constant column so every `HSTACK` piece is the same height.

### 7b. `_UsedMatches` (hidden)

**Row 1** = the same 18 headers. **`_UsedMatches!A2`:**

```
=LET(
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
)
```

Notes:
- `avail` (computed once): real row (Stk# or Retail present) **and** Status does **not** match
  `UsedUnavailRegex`. Blank Status counts as available — edit the regex if you'd rather exclude blanks.
- Km cap: `(cKm="") + (Km<=cKm) > 0` — wildcard when no cap; a blank Km on the unit reads as `0` so it
  passes any cap (you can't filter what isn't recorded).
- Used has no VIN/Series/ETA/MSRP → those columns are blank; **Price = Retail** (`INDEX(M,0,9)`),
  **Description** comes from the Carfax/owners column (`INDEX(M,0,10)`).

### 7c. `Matches` (visible output) — the unified list

**Row 1** = the 18 headers. **`Matches!A2`:**

```
=LET(
  all, VSTACK(IFERROR(_NewMatches!A2:R, IF(SEQUENCE(1,18),"")),
              IFERROR(_UsedMatches!A2:R, IF(SEQUENCE(1,18),""))),
  f,   FILTER(all, LEN(INDEX(all,0,1)) > 0),
  IFERROR(SORT(f, 1, TRUE, 3, TRUE), IF(SEQUENCE(1,18),""))
)
```

Stacks both engines, drops blank rows, sorts by **Client Name** then **Type**. To group by hotness
instead, change the sort (see §11). This is the *only* visible Matches formula — the heavy lifting lives
in the two hidden engines.

---

## 8. `Upsell` (visible output) — existing customers → upgrade vehicles

**Existing customers** = the distinct, non‑blank names in **Customer Name** (col O) across the 3 NEW
sheets (i.e. `_AllVehicles` col 16).

**"Newer / better" rule (editable via `Config!B4` = `UpsellMode`):** for a customer, take their current
**best** unit = highest Model Year they own, and its **series rank** (from `SeriesRankTbl`). A candidate
vehicle qualifies when:
- `OR` mode (default): candidate **Model Year > current** *or* **series rank > current rank**, **or**
- `AND` mode: candidate is **both** newer year **and** higher series rank.

NEW candidates must not already be assigned to that customer. USED candidates (no series, no owner) are
judged on **year only** and must be **available** (`UsedUnavailRegex`). Suggested Price = MSRP (new) /
Retail (used).

**Row 1 headers** (10 cols): `Customer Name | Current Vehicle | Suggested Vehicle | Type | Stage/Source |
Suggested Price | VIN/Stk# | Km | ETA From | ETA To`. **`Upsell!A2`:**

```
=LET(
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
)
```

Notes:
- `curY` / `curR` = the customer's best (max) owned year and series rank. `curStr` = their newest owned
  unit as `Year Series Model`, shown in **Current Vehicle**.
- `rank()` reads `SeriesRankTbl`; an unlisted series ranks `0`, so it can still be beaten on year.
- Final `SORT(…, 6, FALSE)` = highest **Suggested Price** first (best upgrade $ at top). Change to taste.
- Two `IF(SUMPRODUCT(q…)=0, …)` guards mean a customer with no NEW (or no USED) candidate simply
  contributes nothing on that side — no blank/error rows.

---

## 9. `Dashboard` (visible output) — one screen, labeled blocks

Type the **labels** (bold) and **headers** in the cells shown; paste each **formula** into the single
anchor cell noted. The list formulas spill downward, so the blocks are laid out in separate column bands
with vertical gaps. Move blocks freely — only the anchor cell holds a formula.

### Top metrics band (rows 1–13)

| Cell | Content |
|---|---|
| `A1` | `VINCERE‑LEXUS — DAILY DASHBOARD` (title) |
| `A2` | `=TEXT(NOW(),"ddd d mmm yyyy  h:mm")&"  ·  auto‑recalculates on any change"` |
| `A4` | `NEW — COUNTS` (label) |
| `A5` | `Inventory` · `B5` `=SUMPRODUCT((LEN(Inventory!B2:B)+LEN(Inventory!F2:F))>0)` |
| `A6` | `Pipeline` · `B6` `=SUMPRODUCT((LEN(Pipeline!B2:B)+LEN(Pipeline!F2:F))>0)` |
| `A7` | `Delivery` · `B7` `=SUMPRODUCT((LEN(Delivery!B2:B)+LEN(Delivery!F2:F))>0)` |
| `A8` | `New total` · `B8` `=B5+B6+B7` |
| `A10` | `USED — COUNTS` (label) |
| `A11` | `Total used` · `B11` `=SUMPRODUCT((LEN(Used!B2:B)+LEN(Used!I2:I))>0)` |
| `A12` | `Available` · `B12` `=SUM(ARRAYFORMULA(((LEN(Used!B2:B)+LEN(Used!I2:I))>0)*NOT(REGEXMATCH(LOWER(TRIM(""&Used!K2:K)),UsedUnavailRegex))))` |
| `A13` | `Aging >60d` · `B13` `=SUM(ARRAYFORMULA(((LEN(Used!B2:B)+LEN(Used!I2:I))>0)*NOT(REGEXMATCH(LOWER(TRIM(""&Used!K2:K)),UsedUnavailRegex))*(N(Used!A2:A)>0)*(N(Used!A2:A)<(TODAY()-60))))` |
| `D4` | `CLIENTS` (label) |
| `D5` | `Hot` · `E5` `=SUM(ARRAYFORMULA(--(LOWER(TRIM(""&Clients!K2:K))="hot")))` |
| `D6` | `Warm` · `E6` `=SUM(ARRAYFORMULA(--(LOWER(TRIM(""&Clients!K2:K))="warm")))` |
| `D7` | `Cold` · `E7` `=SUM(ARRAYFORMULA(--(LOWER(TRIM(""&Clients!K2:K))="cold")))` |
| `D8` | `Total` · `E8` `=COUNTA(Clients!A2:A)` |
| `D10` | `UPSELL` (label) |
| `D11` | `Opportunities` · `E11` `=COUNTA(Upsell!A2:A)` |
| `D12` | `Top suggested $` · `E12` `=IFERROR(MAX(Upsell!F2:F),0)` |
| `G4` | `FB MARKETPLACE` (label) |
| `G5` | `Reposts due now` · `H5` `=SUMPRODUCT((LEN(Reposting!A2:A)>0)*(N(Reposting!F2:F)>0)*(N(Reposting!F2:F)<=TODAY()))` |
| `G6` | `Never posted` · `H6` `=COUNTIF(Reposting!H2:H,"NEVER POSTED")` |

### List band 1 (headers in row 16, formulas in row 17)

**`A16`** `HOT CLIENTS WITH MATCHES (in‑budget)` — **`A17`:**
```
=IFERROR(QUERY(Matches!A2:R,
 "select A,C,E,M where upper(B)='HOT' and (N='In Budget' or N='No Budget Set') order by A
  label A 'Client', C 'Type', E 'Stk#/Order#', M 'Price'", 0), "None yet")
```

**`F16`** `UNMATCHED HOT CLIENTS (sourcing list)` — **`F17`:**
```
=IFERROR(FILTER(Clients!A2:A,
  ARRAYFORMULA((LOWER(TRIM(""&Clients!K2:K))="hot") * (LEN(Clients!A2:A)>0) * (COUNTIF(Matches!A:A, Clients!A2:A)=0))),
  "None")
```

**`H16:L16`** headers `Order# | Series | Model | ETA To | Customer` — **`H17`** `AGING PIPELINE (ETA ≤ today+7):`
```
=IFERROR(SORT(FILTER({Pipeline!B2:B, Pipeline!H2:H, Pipeline!I2:I, Pipeline!N2:N, Pipeline!O2:O},
  ARRAYFORMULA((LEN(Pipeline!B2:B)>0) * (N(Pipeline!N2:N)>0) * (N(Pipeline!N2:N)<=(TODAY()+7)))), 4, TRUE), "None")
```

**`N16:T16`** headers `Stk# | Year | Make | Model | In‑Stock | Km | Retail` — **`N17`** `AGING USED (>60d, available):`
```
=IFERROR(SORT(FILTER({Used!B2:B, Used!C2:C, Used!D2:D, Used!E2:E, Used!A2:A, Used!H2:H, Used!I2:I},
  ARRAYFORMULA((LEN(Used!B2:B)>0) * NOT(REGEXMATCH(LOWER(TRIM(""&Used!K2:K)),UsedUnavailRegex)) * (N(Used!A2:A)>0) * (N(Used!A2:A)<(TODAY()-60)))), 5, TRUE), "None")
```

### List band 2 (anchors at row 40 — move down if a list above is long)

**`A40`** `INVENTORY BY SERIES (on‑lot)` — **`A41`:**
```
=IFERROR(QUERY(_AllVehicles!A2:Q,
  "select I, count(C) where A='Inventory' group by I order by count(C) desc label I 'Series', count(C) 'Units'", 0),
  "None")
```
*(Drop `where A='Inventory'` to count every new unit by series instead of just on‑lot.)*

**`D40`** `USED BY MAKE / MODEL` — **`D41`:**
```
=IFERROR(QUERY(Used!A2:P,
  "select D, E, count(B) where B is not null group by D, E order by count(B) desc label D 'Make', E 'Model', count(B) 'Units'", 0),
  "None")
```

**`H40`** `TOP UPSELL OPPORTUNITIES` — **`H41`:**
```
=IFERROR(QUERY(Upsell!A2:J,
  "select A, C, F where A is not null order by F desc limit 8 label A 'Customer', C 'Suggested', F 'Price'", 0),
  "None")
```

### List band 3 — Facebook Marketplace reposts (anchor row 56)

**`A56`** `FB MARKETPLACE — REPOST DUE (Stk# · Year · Make · Model · Next Due · Status · ➕ add)` — **`A57`:**
```
=IFERROR(SORT(FILTER({Reposting!A2:A, Reposting!B2:B, Reposting!C2:C, Reposting!D2:D, Reposting!F2:F, Reposting!H2:H, Reposting!I2:I},
  ARRAYFORMULA((LEN(Reposting!A2:A)>0) * (N(Reposting!F2:F)>0) * (N(Reposting!F2:F)<=TODAY()))), 5, TRUE), "Nothing due")
```
This is your daily repost worklist — every available used unit whose 10‑day timer has elapsed (or that
was never posted), soonest first, each row ending in a one‑click **➕ Outlook** link (§14).

> **Dates:** the aging blocks use `TODAY()`, which rolls over automatically each day the sheet is open
> (and on any edit). For ETA/In‑Stock filters to work, those columns must hold **real dates**, not text —
> if a pasted column shows left‑aligned, select it → Format → Number → Date, or wrap the source in
> `DATEVALUE`. `NOW()` in `A2` is just a freshness stamp; delete it if you dislike volatile recalcs.

---

## 10. How to use (one‑time setup, ~15 min)

1. **Create the tabs** (exact names): `Inventory`, `Pipeline`, `Delivery`, `Used`, `Clients`, `Pricing`,
   `Config`, `FB_Log`, `Matches`, `Upsell`, `Reposting`, `Dashboard`, `_AllVehicles`, `_NewMatches`,
   `_UsedMatches`. *(`FB_Log` + `Reposting` are only for the Facebook Marketplace tracker, §14 — skip
   them if you don't need it.)*
2. **Paste raw data** into `Inventory` / `Pipeline` / `Delivery` / `Used` (headers row 1, data row 2+).
   Never reformat their columns — the formulas address them positionally.
3. **Fill `Config`** (§3) and create the 4 **named ranges** (`UsedUnavailRegex`, `NewMakeDefault`,
   `UpsellMode`, `SeriesRankTbl`). This is the single most common setup miss — do it before testing.
4. **Build `Clients` and `Pricing`** headers (§4, §5). Add a couple of rows to test.
5. **Paste the one formula** into each helper/output **anchor cell**: `_AllVehicles!A2`, `_NewMatches!A2`,
   `_UsedMatches!A2`, `Matches!A2`, `Upsell!A2`, then the Dashboard cells (§9). Type the header rows.
6. **Hide** `_AllVehicles`, `_NewMatches`, `_UsedMatches` (right‑click tab → Hide sheet).
7. Done. From now on you only ever touch the 4 raw tabs + `Clients`/`Pricing`. Everything else is live.

**Daily flow:** paste fresh inventory/used exports over the raw tabs → open `Dashboard`. Hot clients with
in‑budget matches, your sourcing list, aging units, and upsell $ are all current. Drill into `Matches`
/ `Upsell` for the per‑row detail.

## 11. How to extend (each is a one‑line edit)

| Want | Do this |
|---|---|
| **Package** in used matching | Add `Clients` col `N` = *Package*. In `_UsedMatches`, add `cPk, INDEX(C,i,14)` and a mask factor `* ((norm(cPk)="")+ISNUMBER(SEARCH(norm(cPk),norm(INDEX(U,0,6))))>0)` (Used Package = col 6). |
| **Tires** in used matching | Same pattern against Used col 16: `…SEARCH(norm(cTire),norm(INDEX(U,0,16)))…`. |
| **Second budget tier** | Add `Clients` col *Stretch Budget*; in the `fit` step, return `In Budget` / `Stretch` / `Over` by comparing against both numbers. |
| **Km‑range preference** | Add `Clients` *Min Km*; add factor `* ((cMin="")+(N(INDEX(U,0,8))>=N(cMin))>0)`. |
| **Exact color** (not "contains") | Replace `ISNUMBER(SEARCH(norm(cC),norm(INDEX(…,0,col))))` with `(norm(INDEX(…,0,col))=norm(cC))`. |
| **Exclude sold NEW units** | Add to the `_NewMatches` mask: `* NOT(REGEXMATCH(norm(INDEX(V,0,5)),"sold|cancel"))` (col 5 = Status). |
| **Upsell only unassigned units** | In `Upsell` `qN`, change `(norm(INDEX(V,0,16))<>norm(cust))` to `(LEN(INDEX(V,0,16))=0)`. |
| **Group Matches by hotness** | Add a status‑rank `XLOOKUP` and change `Matches!A2` `SORT` to sort on it first. |
| **Re‑rank the series ladder** | Edit the numbers in `Config!E:E` (`SeriesRankTbl`). Nothing else changes. |

## 12. Troubleshooting

- **`#NAME?`** → a named range (`UsedUnavailRegex` etc.) doesn't exist yet, or the account's Sheets is
  too old for `LET`/`REDUCE`/`XLOOKUP` (use a current Google Workspace/Gmail account).
- **A `norm(column)` returns one value instead of a whole column** (rare, on some older builds the
  `norm` LAMBDA doesn't broadcast inside `ARRAYFORMULA`) → replace that spot's `norm(INDEX(V,0,8))`
  with the inlined `ARRAYFORMULA(LOWER(TRIM(INDEX(V,0,8)&"")))`. The `norm` shorthand is only a
  convenience; inlining it changes nothing else.
- **A condition multiplies to a number and `FILTER` complains** → wrap the condition as `(… )=1`. The
  multiplicative masks here resolve to `1`/`0`, which `FILTER` reads as `TRUE`/`FALSE` on current Sheets;
  the `=1` form is the explicit fallback.
- **`Matches` empty but data exists** → (a) the client is over‑specified (every blank field is a
  wildcard, so filling all of them narrows hard); (b) Status text on Used trips `UsedUnavailRegex`;
  (c) for NEW budget, the `Pricing` key `Year|Series|Model|Suffix` doesn't match → Fit shows `No MSRP`.
- **Wrong/odd matches** → remember color is "contains" and matching is trimmed+lowercased; check for
  stray characters in the pasted source, not the formulas.
- **Slow recalc** → the two match engines and Upsell scan every vehicle per client/customer. That's fine
  for a few hundred units × ~100 clients. Past that, narrow the open ranges (e.g. `_AllVehicles!A2:Q5000`)
  or adopt the optional snapshot script so heavy views are computed on a schedule, not continuously.

## 13. Apps Script — NOT required; one optional add‑on

**Everything above is pure formula. No script is needed for any of the three deliverables.** The only
thing a formula genuinely *cannot* do is **append‑and‑freeze a daily history** (formulas always reflect
*current* data; they can't keep yesterday's numbers once the source changes). If you want trend history
— "how many Hot‑with‑match did I have each day", lot‑age trends — use the optional, clearly‑isolated
script in [`Snapshot.gs`](./Snapshot.gs). That file holds three **optional** functions: `snapshotDashboard`
(daily history), `hideHelperTabs` (one‑click tab hider), and `createRepostEvents` (hands‑free Google
Calendar repost reminders — see §14 Option C). Install only what you want; the CRM works fully without any
of them.

See `Snapshot.gs` for the code and install steps.

---

## 14. Facebook Marketplace reposting + calendar reminders

Goal: know the **date you last posted** each used unit, and get a reminder to **repost after N days**
(default 10, editable in `Config!B5` / `RepostDays`). Plus a privacy‑safe way to push those reminders to
your calendar.

### 14.1 `FB_Log` — your post log (tiny input tab)

Headers row 1, then **append one row every time you post or repost** a unit:

| Col | Header | Notes |
|---|---|---|
| A | Stk# | must match the Used `Stk#` (col B) |
| B | Posted Date | the date you posted. Shortcut: select the cell and press **Ctrl + ;** to drop in today's date |
| C | Notes | optional (price, which photos, etc.) |

Append‑style (a new row per post) keeps your full posting history; the tracker always uses the **most
recent** date per unit. No script needed to log — just type the date (or Ctrl + ;).

### 14.2 `Reposting` — the auto tracker (one formula)

**Row 1 headers:** `Stk# | Year | Make | Model | Last Posted | Next Due | Days Over | Status | Add to Calendar`.
**`Reposting!A2`:**

```
=LET(
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
)
```

What it does, per **available** used unit:
- `last` = most recent post date from `FB_Log` (`MAXIFS`), `0` if never posted.
- `Next Due` = `last + RepostDays`; never‑posted → due **today**.
- `Status` = `NEVER POSTED` / `REPOST DUE` (today ≥ due) / `OK`.
- `Add to Calendar` = a one‑click **➕ Outlook** link (see 14.3).
- Sorted by `Next Due` ascending, so overdue/never sit at the top.

Format column **E** and **F** as dates (Format → Number → Date). The Dashboard's *List band 3* (§9) shows
just the due ones, and the top band shows the **reposts‑due‑now** and **never‑posted** counts.

### 14.3 Calendar — three options, and the privacy point

First, the important clarification: **putting events on your calendar from the sheet does *not* require
giving me (Claude) access to your Outlook work account.** Any script you install runs as *you*, under
*your* login. I never touch your account. That said, here are three paths, easiest/safest first:

**Option A — One‑click "Add to Calendar" link (recommended, zero access, already built above).**
The `Add to Calendar` column is a formula that builds an Outlook "compose event" web link, pre‑filled with
the unit and the due date. You click it → Outlook opens with the event already filled in → you press
**Save**. No API, no permissions, no script, nothing connected to anyone. It works with your existing
Outlook session in the browser. This is the privacy‑safe "directly from the sheet" answer.
- Prefer Google Calendar? Swap the URL for:
  `HYPERLINK("https://calendar.google.com/calendar/render?action=TEMPLATE&text="&ENCODEURL(t)&"&dates="&TEXT(d,"yyyymmdd")&"/"&TEXT(d+1,"yyyymmdd"), "➕ Google")`.

**Option B — Daily in‑sheet reminders only (zero tech).** Don't link a calendar at all. The Dashboard's
*FB MARKETPLACE — REPOST DUE* block **is** your daily reminder: open the sheet each morning, work the
list, log the new date in `FB_Log`. This is exactly the "remind me in the daily view" fallback you
described — and it needs no scripts and no accounts.

**Option C — Fully automatic event creation (optional, needs a script under *your* account).** If you want
events to appear with **no clicking**:
- **Google Calendar:** a tiny Apps Script (`createRepostEvents`, included in `Snapshot.gs`) reads the
  `Reposting` tab and creates all‑day reminders for due units. Runs as you; I don't see it.
- **Outlook / Microsoft 365:** Google Apps Script can't write to Outlook. You'd use **Office Scripts +
  Power Automate** (a "When a row… create event" flow) — but corporate M365 tenants often disable these,
  and it's more setup. Given you'd rather not wire up the work account, **Option A is the better fit**:
  same end result (event on your Outlook calendar), one extra click, nothing connected.

> **Bottom line for your situation:** stay on **Option A** (one‑click ➕ Outlook links) backed by
> **Option B** (the daily Dashboard list). You get reminders with real due dates pushed onto your Outlook
> calendar on demand, you keep full control, and nothing is ever granted access to your work account.

### 14.4 Excel or Google Sheets for this?

**Recommendation: stay in Google Sheets.** Reasons specific to this project:

- **It's already built and working here.** The engine uses Sheets‑native `QUERY`, `ARRAYFORMULA`, and the
  modern `LET`/`LAMBDA`/`REDUCE`/`VSTACK` stack. Excel (Microsoft 365) *does* now have `LET`/`LAMBDA`/
  `REDUCE`/`VSTACK`/`XLOOKUP`/`FILTER`/`SORT`/`UNIQUE`, so ~80% would port — but you'd rewrite every
  `QUERY` (use `FILTER`/`SORT`/`GROUPBY`), drop `ARRAYFORMULA` (Excel spills natively), and swap
  `REGEXMATCH` for Excel's newer `REGEXTEST`. That's real rework for no functional gain.
- **"Big project" here means logic complexity, not row count.** A dealership's inventory + clients is a
  few thousand rows — trivial for Sheets (limit ~10M cells). You're nowhere near needing Excel's larger
  grid. The only real performance factor is the `REDUCE` match engine scanning vehicles per client, and
  that's identical in both tools (mitigation in §12).
- **Calendar + sharing favor Sheets.** One‑click calendar links work the same, but *automatic* event
  creation is a 10‑line Apps Script in Google vs. Office Scripts + Power Automate (often blocked on work
  tenants) in Excel. And sharing a live link with your desk/manager is simpler in Sheets.

**When Excel would win:** your dealership standardizes on Excel/SharePoint, you need Power BI dashboards,
or you must keep everything inside the Microsoft tenant for IT policy. None of those are blocking here —
and notably, **keeping the CRM in Google Sheets actually helps your privacy goal**, because the calendar
piece never has to touch your Microsoft work account at all.

