// Shared Tailwind class strings so every screen looks consistent.

export const input =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400";

export const label = "block text-sm font-medium text-slate-700 mb-1";

export const hint = "text-xs text-slate-400 font-normal";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

export const btnDanger =
  "inline-flex items-center justify-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50";

export const card = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";

export const badge =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

// Status → badge colors.
export const statusColor: Record<string, string> = {
  LEAD: "bg-blue-50 text-blue-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  VIP: "bg-amber-50 text-amber-800",
  DORMANT: "bg-slate-100 text-slate-500",
};

export const vehicleStatusColor: Record<string, string> = {
  ON_ORDER: "bg-violet-50 text-violet-700",
  IN_TRANSIT: "bg-sky-50 text-sky-700",
  ARRIVED: "bg-teal-50 text-teal-700",
  IN_STOCK: "bg-emerald-50 text-emerald-700",
  ALLOCATED: "bg-amber-50 text-amber-800",
  SOLD: "bg-slate-100 text-slate-500",
};
