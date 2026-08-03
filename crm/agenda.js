// Vincere Lexus CRM — your real Google Calendar + Todoist, pulled through Claude.
//
// The CRM is a static site, so it can't call the Google / Todoist APIs itself
// (that needs OAuth + secret keys that can't live in a public page). Instead,
// Claude reads your Calendar and Todoist through its connectors and writes them
// here. This file is auto-refreshed 6am / noon / 6pm (America/Toronto), and you
// can also just ask Claude to "refresh my agenda" any time.
//
// Dates are real (America/Toronto) and are NOT demo-shifted like the seed data.
window.CRM_AGENDA = {
  syncedAt: "2026-08-03",
  tz: "America/Toronto",
  source: "Google Calendar (pdg7857@gmail.com) + Todoist",

  // ---- Google Calendar -----------------------------------------------------
  calendar: [
    { title: "Zoe's birthday 🎂", date: "2026-08-03", allDay: true },
    { title: "Appointment: Mercedes C-Class", date: "2026-08-04", time: "9:00 AM", end: "10:00 AM", phone: "647-323-4845" },
    { title: "GTApreneurs Toronto Networking (1st Wed)", date: "2026-08-05", time: "6:00 PM", end: "8:00 PM" },
    { title: "Toronto Entrepreneur Networking Event", date: "2026-08-05", time: "7:00 PM", end: "10:00 PM" },
    { title: "Pay Lucky Mobile", date: "2026-08-08", allDay: true },
    { title: "CPA Ladies Group Posing Class", date: "2026-08-09", allDay: true },
    { title: "Me & Sydney — monthly anniversary 💕", date: "2026-08-09", allDay: true },
    { title: "Grayson Cup Charity Golf", date: "2026-08-15", allDay: true },
    { title: "Canfitpro Naturals (CPA physique)", date: "2026-08-15", allDay: true },
    { title: "Par For The Cause Charity Golf", date: "2026-08-17", allDay: true },
    { title: "Hockey Night in Brampton (charity)", date: "2026-08-19", allDay: true },
    { title: "Cedrik DJ set — Ottawa", date: "2026-08-22", time: "10:00 PM" },
    { title: "GTApreneurs Vaughan Networking (last Tue)", date: "2026-08-25", time: "5:00 PM", end: "8:00 PM" },
    { title: "Legends Super Cup (CPA physique)", date: "2026-08-29", allDay: true },
    { title: "GTApreneurs Toronto Networking (1st Wed)", date: "2026-09-02", time: "6:00 PM", end: "8:00 PM" },
    { title: "Canadian Computer Charity Golf Classic", date: "2026-09-03", allDay: true },
    { title: "Pay Lucky Mobile", date: "2026-09-08", allDay: true },
    { title: "Me & Sydney — monthly anniversary 💕", date: "2026-09-09", allDay: true },
    { title: "Canadian Apartment Investment Conference (CAIC)", date: "2026-09-09", allDay: true },
    { title: "Da Silva Memorial Golf Tournament", date: "2026-09-11", allDay: true },
    { title: "Niagara Falls Classic Open (CPA physique)", date: "2026-09-12", allDay: true },
    { title: "Golden Prairie Cup Open Championships (CPA)", date: "2026-09-12", allDay: true },
    { title: "Golden Prairie Cup Natural Championships (CPA)", date: "2026-09-12", allDay: true },
    { title: "Digital Leadership Day Ontario (Gov Innovation Week)", date: "2026-09-15", allDay: true },
    { title: "Pinball Classic Invitational Golf Tournament", date: "2026-09-15", allDay: true },
    { title: "RealREIT 2026", date: "2026-09-16", allDay: true },
    { title: "Government Innovation Showcase Ontario", date: "2026-09-16", allDay: true }
  ],

  // ---- Todoist -------------------------------------------------------------
  // p = Todoist priority (1 = highest / red … 4 = none). project = short tag.
  tasks: [
    { content: "Rafael (Instagram DMs) — make + send video", due: "2026-07-25", dueTime: "4:00 PM", p: 2, project: "CRM notes" },
    { content: "437-986-6680 — Follow up, match in-stock cars to his wants", due: "2026-07-31", dueTime: "9:00 AM", p: 2, project: "CRM notes", phone: "437-986-6680" },
    { content: "Create contacts for contactless clients (add to CRM/phone)", due: "2026-07-31", dueTime: "9:00 AM", p: 2, project: "CRM notes" },
    { content: "416-262-0034 — Follow up re: vehicles sent", due: "2026-07-31", dueTime: "9:00 AM", p: 2, project: "CRM notes", phone: "416-262-0034" },
    { content: "647-970-6134 — Follow up, get total loan amount (VW trade-in)", due: "2026-07-31", dueTime: "3:00 PM", p: 2, project: "CRM notes", phone: "647-970-6134" },
    { content: "416-731-7155 — Decola — Call re: TX + RX lease quotes", due: "2026-07-31", dueTime: "3:00 PM", p: 2, project: "CRM notes", phone: "416-731-7155" },
    { content: "Take Test E", due: "2026-08-01", dueTime: "8:00 AM", p: 2, project: "Personal", recurring: true },
    { content: "416-873-0258 — Follow up", due: "2026-08-02", dueTime: "10:00 AM", p: 2, project: "CRM notes", phone: "416-873-0258" },
    { content: "Desmond (Facebook Marketplace) — Follow up (confirm tax issue with mgmt first)", due: "2026-08-04", dueTime: "9:00 AM", p: 2, project: "CRM notes" },
    { content: "705-795-3098 — Mazda CX-9, send full price", due: "2026-08-04", dueTime: "10:00 AM", p: 2, project: "CRM notes", phone: "705-795-3098" },
    { content: "647-703-5612 — Used GX, follow up", due: "2026-08-04", dueTime: "10:00 AM", p: 2, project: "CRM notes", phone: "647-703-5612" },
    { content: "647-862-3556 — Follow up + have management call him", due: "2026-08-04", dueTime: "10:00 AM", p: 2, project: "CRM notes", phone: "647-862-3556" },
    { content: "Download DCC construction payments report (active contractors)", due: "2026-08-29", p: 2, project: "Inbox", recurring: true },
    { content: "Prospect — RX 350 Hybrid, Dark Blue/Beige, 2023+, 50–60k", p: 4, project: "CRM notes", phone: "416-894-5137" },
    { content: "Prospect — New RX 350 Hybrid Executive, White/Black, $400 biweekly", p: 4, project: "CRM notes", phone: "647-970-6134" }
  ]
};
