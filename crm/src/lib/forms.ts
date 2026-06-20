// FormData extraction helpers + the shared action result shape used with
// React's useActionState.
import type { z } from "zod";

export type FormState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

/** Trimmed string, or undefined when empty/missing. */
export function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

/** Number, or undefined when empty/non-numeric. Strips thousands separators. */
export function num(fd: FormData, key: string): number | undefined {
  const s = str(fd, key);
  if (s === undefined) return undefined;
  const n = Number(s.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/** Checkbox → boolean. */
export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

/** Comma-separated text → string[] (trimmed, de-duped, empties removed). */
export function list(fd: FormData, key: string): string[] {
  const s = str(fd, key);
  if (!s) return [];
  return [...new Set(s.split(",").map((x) => x.trim()).filter(Boolean))];
}

/** Convert a Zod error into a FormState. */
export function zodError(error: z.ZodError): FormState {
  return {
    error: "Please fix the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}
