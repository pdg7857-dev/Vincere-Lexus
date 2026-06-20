"use client";

import { useActionState } from "react";
import Image from "next/image";
import {
  begin2fa,
  enable2fa,
  disable2fa,
  changePassword,
} from "@/lib/actions/security";
import { SubmitButton } from "@/components/SubmitButton";
import { input, label, btnGhost } from "@/lib/ui";
import type { FormState } from "@/lib/forms";

function ChangePassword() {
  const [state, action] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-3">
      <h3 className="font-semibold text-slate-800">Change password</h3>
      {state?.ok && <p className="text-sm text-emerald-700">Password updated.</p>}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div>
        <label className={label}>Current password</label>
        <input className={input} name="current" type="password" autoComplete="current-password" />
      </div>
      <div>
        <label className={label}>New password (min 8 chars)</label>
        <input className={input} name="next" type="password" autoComplete="new-password" />
      </div>
      <SubmitButton>Update password</SubmitButton>
    </form>
  );
}

function TwoFactor({ enabled }: { enabled: boolean }) {
  const [setup, beginAction] = useActionState(begin2fa, null);
  const [enableState, enableAction] = useActionState<FormState, FormData>(enable2fa, {});
  const [disableState, disableAction] = useActionState<FormState, FormData>(disable2fa, {});

  if (enabled) {
    return (
      <form action={disableAction} className="space-y-3">
        <h3 className="font-semibold text-slate-800">
          Two-factor authentication <span className="text-emerald-600">· on</span>
        </h3>
        {disableState?.error && <p className="text-sm text-red-600">{disableState.error}</p>}
        <p className="text-sm text-slate-500">
          Enter your password to turn 2FA off.
        </p>
        <input className={input} name="password" type="password" placeholder="Current password" />
        <SubmitButton className={btnGhost}>Turn off 2FA</SubmitButton>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-800">Two-factor authentication</h3>
      {enableState?.ok ? (
        <p className="text-sm text-emerald-700">2FA is now enabled. 🎉</p>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Add a TOTP authenticator (Google Authenticator, 1Password, etc.).
          </p>
          {!setup || !("ok" in setup) ? (
            <form action={beginAction}>
              <SubmitButton className={btnGhost}>Start setup</SubmitButton>
            </form>
          ) : (
            <div className="space-y-3">
              <Image
                src={setup.qr}
                alt="Scan this QR code"
                width={180}
                height={180}
                unoptimized
                className="rounded border border-slate-200"
              />
              <p className="text-xs text-slate-400 break-all">
                Or enter this key manually: <code>{setup.secret}</code>
              </p>
              <form action={enableAction} className="flex items-end gap-2">
                <div>
                  <label className={label}>Enter the 6-digit code</label>
                  <input className={input} name="code" inputMode="numeric" placeholder="123456" />
                </div>
                <SubmitButton>Verify & enable</SubmitButton>
              </form>
              {enableState?.error && (
                <p className="text-sm text-red-600">{enableState.error}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function SecurityPanel({ totpEnabled }: { totpEnabled: boolean }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <ChangePassword />
      <TwoFactor enabled={totpEnabled} />
    </div>
  );
}
