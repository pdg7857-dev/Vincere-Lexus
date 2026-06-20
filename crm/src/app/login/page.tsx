import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/forms/LoginForm";
import { card } from "@/lib/ui";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Vincere CRM</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your workspace</p>
        </div>
        <div className={card}>
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Local &amp; private · runs on your machine only
        </p>
      </div>
    </div>
  );
}
