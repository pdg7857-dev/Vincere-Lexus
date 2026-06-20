import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NavLink } from "@/components/NavLink";
import { logoutAction } from "@/lib/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/customers", label: "Customers", icon: "👥" },
  { href: "/inventory", label: "Inventory", icon: "🚗" },
  { href: "/pipeline", label: "Pipeline", icon: "📋" },
  { href: "/intake", label: "Intake", icon: "📥" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const pendingIntake = await prisma.intakeEvent.count({
    where: { status: "PENDING" },
  });

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-5 py-5">
          <p className="text-lg font-bold tracking-tight">Vincere</p>
          <p className="text-xs text-slate-400">Sales CRM</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href}>
              <span aria-hidden>{n.icon}</span>
              {n.label}
              {n.href === "/intake" && pendingIntake > 0 && (
                <span className="ml-auto rounded-full bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {pendingIntake}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <p className="truncate px-2 pb-2 text-xs text-slate-400" title={user.email}>
            {user.email}
          </p>
          <form action={logoutAction}>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="grow overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
