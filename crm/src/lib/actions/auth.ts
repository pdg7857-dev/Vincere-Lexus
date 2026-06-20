"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword, verifyTotp } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import { str, type FormState } from "@/lib/forms";

export async function loginAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: str(fd, "email"),
    password: str(fd, "password"),
    totp: str(fd, "totp"),
  });
  if (!parsed.success) return { error: "Enter your email and password." };

  const { email, password, totp } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Don't reveal which half was wrong.
  const invalid: FormState = { error: "Invalid email or password." };
  if (!user) return invalid;
  if (!(await verifyPassword(password, user.passwordHash))) return invalid;

  if (user.totpEnabled) {
    if (!totp)
      return {
        error: "Enter your 6-digit authenticator code.",
        fieldErrors: { totp: ["Required"] },
      };
    if (!user.totpSecret || !verifyTotp(user.totpSecret, totp))
      return {
        error: "That authenticator code didn't match.",
        fieldErrors: { totp: ["Invalid"] },
      };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
