// Auth + the Data Access Layer (DAL) entry points.
//
// Password hashing uses bcryptjs (pure JS) so the app moves between
// Windows/Mac/Linux with no native rebuild. TOTP (optional 2FA) uses otplib.
import { cache } from "react";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { findSessionUser } from "@/lib/session";

const TOTP_ISSUER = "Vincere CRM";

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

// Memoized for the duration of a single server render / action so repeated
// calls don't re-hit the database.
export const getCurrentUser = cache(async () => findSessionUser());

/**
 * Require an authenticated user. Redirects to /login if there is none.
 * Call at the top of every protected page, layout, server action and route
 * handler — defense in depth, since layouts don't re-check on client nav.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// ── TOTP (optional 2FA) ──
export function generateTotpSecret() {
  return authenticator.generateSecret();
}

export function totpKeyUri(accountEmail: string, secret: string) {
  return authenticator.keyuri(accountEmail, TOTP_ISSUER, secret);
}

export function verifyTotp(secret: string, token: string) {
  try {
    return authenticator.verify({ token: token.replace(/\s+/g, ""), secret });
  } catch {
    return false;
  }
}
