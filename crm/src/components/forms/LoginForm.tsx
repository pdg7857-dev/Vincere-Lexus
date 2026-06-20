"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { input, label, hint, btnPrimary } from "@/lib/ui";
import type { FormState } from "@/lib/forms";

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div>
        <label className={label}>Email</label>
        <input
          className={input}
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </div>
      <div>
        <label className={label}>Password</label>
        <input
          className={input}
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <label className={label}>
          Authenticator code <span className={hint}>(only if 2FA is on)</span>
        </label>
        <input
          className={input}
          name="totp"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123 456"
        />
      </div>
      <SubmitButton className={btnPrimary + " w-full"} pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
