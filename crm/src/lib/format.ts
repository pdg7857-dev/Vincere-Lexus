// Small presentation helpers shared across screens.
import type { Prisma } from "@prisma/client";

type Money = number | string | Prisma.Decimal | null | undefined;

export function formatMoney(value: Money, currency = "CAD"): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value.toString());
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-CA").format(n);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const secs = Math.round((Date.now() - date.getTime()) / 1000);
  const table: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
  ];
  let unit = "s";
  let val = secs;
  for (const [step, label] of table) {
    if (Math.abs(val) < step) {
      unit = label;
      break;
    }
    val = Math.round(val / step);
    unit = label;
  }
  if (unit === "d" && Math.abs(val) >= 7) return formatDate(date);
  return val <= 0 ? "just now" : `${val}${unit} ago`;
}

// SNAKE_CASE / lower → "Title case" for enum display.
export function humanize(s: string | null | undefined): string {
  if (!s) return "—";
  const lower = s.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
