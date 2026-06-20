// Enum option lists (for <select>s) and the default seed data for the two
// editable picklists. Keep these in sync with prisma/schema.prisma enums.

export const CUSTOMER_TYPES = [
  "EXPORTER",
  "DEALER",
  "FLIPPER",
  "FLEET",
  "PERSONAL",
] as const;

export const CUSTOMER_STATUSES = ["LEAD", "ACTIVE", "VIP", "DORMANT"] as const;

export const PAYMENT_METHODS = ["CASH", "FINANCE", "WIRE"] as const;

export const CONDITIONS = ["NEW", "USED", "CPO", "ANY"] as const;

export const VEHICLE_STATUSES = [
  "ON_ORDER",
  "IN_TRANSIT",
  "ARRIVED",
  "IN_STOCK",
  "ALLOCATED",
  "SOLD",
] as const;

export const VEHICLE_SOURCES = [
  "TRADE",
  "ALLOCATION",
  "AUCTION",
  "TRANSFER",
] as const;

export const ACTIVITY_TYPES = ["CALL", "EMAIL", "NOTE", "MEETING", "TEXT"] as const;

export const MATCH_STATUSES = [
  "NEW",
  "NOTIFIED",
  "INTERESTED",
  "PASSED",
  "SOLD",
] as const;

// Default pipeline stages (brief §5). Order matters; the last two are terminal.
export const DEFAULT_STAGES: {
  name: string;
  order: number;
  isTerminal?: boolean;
  isWon?: boolean;
}[] = [
  { name: "New lead", order: 1 },
  { name: "Contacted", order: 2 },
  { name: "Qualified", order: 3 },
  { name: "Vehicle matched", order: 4 },
  { name: "Offer/quote", order: 5 },
  { name: "Deposit", order: 6 },
  { name: "Delivered", order: 7, isWon: true },
  { name: "Lost", order: 8, isTerminal: true },
  { name: "Dormant", order: 9, isTerminal: true },
];

// Default lead sources (brief §6), editable in Settings.
export const DEFAULT_LEAD_SOURCES = [
  "Walk-in",
  "Repeat customer",
  "Referral",
  "Phone-in",
  "Website/internet lead",
  "Third-party listing (AutoTrader / CarGurus / Kijiji)",
  "Social media",
  "Manufacturer lead",
  "Trade-in",
  "Email campaign",
  "Other",
];
