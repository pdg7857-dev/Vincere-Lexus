"use client";

// Submits a (bound) server action after a native confirm() — used for archive
// and the PIPEDA hard-delete.
export function ConfirmSubmit({
  action,
  children,
  confirm,
  className,
}: {
  action: () => Promise<void>;
  children: React.ReactNode;
  confirm: string;
  className?: string;
}) {
  return (
    <form action={action} className="inline">
      <button
        type="submit"
        className={className}
        onClick={(e) => {
          if (!window.confirm(confirm)) e.preventDefault();
        }}
      >
        {children}
      </button>
    </form>
  );
}
