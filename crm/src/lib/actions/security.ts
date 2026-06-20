"use server";

import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import {
  requireUser,
  verifyPassword,
  hashPassword,
  verifyTotp,
  generateTotpSecret,
  totpKeyUri,
} from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { str, type FormState } from "@/lib/forms";

type TotpSetupState =
  | { ok: true; qr: string; secret: string }
  | { error: string }
  | null;

/** Generate (and persist, but not yet enable) a TOTP secret; return a QR code. */
export async function begin2fa(_prev: TotpSetupState): Promise<TotpSetupState> {
  const user = await requireUser();
  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabled: false },
  });
  const uri = totpKeyUri(user.email, secret);
  const qr = await QRCode.toDataURL(uri);
  return { ok: true, qr, secret };
}

export async function enable2fa(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const code = str(fd, "code");
  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh?.totpSecret)
    return { error: "Start setup first (scan the QR code)." };
  if (!code || !verifyTotp(fresh.totpSecret, code))
    return { error: "That code didn't match. Try the current one." };

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function disable2fa(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const password = str(fd, "password");
  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh) return { error: "User not found." };
  if (!password || !(await verifyPassword(password, fresh.passwordHash)))
    return { error: "Enter your current password to turn off 2FA." };

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function changePassword(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const current = str(fd, "current");
  const next = str(fd, "next");
  if (!next || next.length < 8)
    return { error: "New password must be at least 8 characters." };

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh) return { error: "User not found." };
  if (!current || !(await verifyPassword(current, fresh.passwordHash)))
    return { error: "Your current password is incorrect." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });
  return { ok: true, error: undefined };
}
