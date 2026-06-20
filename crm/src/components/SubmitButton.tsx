"use client";

import { useFormStatus } from "react-dom";
import { btnPrimary } from "@/lib/ui";

export function SubmitButton({
  children,
  className,
  pendingLabel = "Saving…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className ?? btnPrimary}>
      {pending ? pendingLabel : children}
    </button>
  );
}
