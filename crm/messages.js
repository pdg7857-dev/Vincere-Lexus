// Claude-managed conversation store for the Vincere Lexus CRM.
//
// This file is the AUTHORITATIVE record of real client conversations. The CRM
// loads it over the sample threads baked into data.js, and merges it with any
// messages you log inside the app on each device. Two ways it gets filled:
//
//   1. iPhone backup   ->  python3 scripts/import_iphone_backup.py   (overwrites this file)
//   2. Claude          ->  drop a Facebook Marketplace / iMessage screenshot into a
//                          Claude session on this repo and say who it's with; Claude
//                          reads it and appends the messages here, then pushes. Tap
//                          "Pull latest" in the CRM to see it.
//
// Shape:
//   window.CRM_MESSAGES = {
//     source: "claude-managed",
//     byDealId: {
//       "7": {                              // deal id from data.js (Nava Muru = 7)
//         source: "marketplace",            // "marketplace" | "imessage" | "sms"
//         contactName: "Nava Muru",
//         messages: [
//           { from: "them", text: "Is the RX still available?", ts: "2026-07-25T14:02" },
//           { from: "me",   text: "It is! Want to come see it this week?", ts: "2026-07-25T14:10" }
//         ]
//       }
//     },
//     contacts: { "7": { name: "Nava Muru", phones: ["4166241111"], emails: [] } }
//   };
//
// `from` is "me" (the salesperson) or "them" (the client). `ts` is local
// "YYYY-MM-DDTHH:MM". Add a deal's entry under byDealId to turn its sample thread
// into a real one (the SAMPLE badge disappears automatically).

window.CRM_MESSAGES = { source: "claude-managed", byDealId: {}, contacts: {} };
