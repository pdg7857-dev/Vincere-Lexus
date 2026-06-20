import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { StagesManager } from "@/components/settings/StagesManager";
import { LeadSourcesManager } from "@/components/settings/LeadSourcesManager";
import { SecurityPanel } from "@/components/settings/SecurityPanel";
import { card } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const [stages, sources, counts] = await Promise.all([
    prisma.stage.findMany({ where: { archivedAt: null }, orderBy: { order: "asc" } }),
    prisma.leadSource.findMany({
      where: { archivedAt: null },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.deal.groupBy({
      by: ["stageId"],
      where: { archivedAt: null },
      _count: true,
    }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.stageId, c._count]));
  const stageData = stages.map((s) => ({
    id: s.id,
    name: s.name,
    isTerminal: s.isTerminal,
    isWon: s.isWon,
    dealCount: countMap[s.id] ?? 0,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <section className={card}>
        <h2 className="mb-1 font-semibold text-slate-800">Pipeline stages</h2>
        <p className="mb-4 text-sm text-slate-500">
          Rename, reorder, or add stages. “Won” marks closed-won; “terminal” closes
          the deal (Lost / Dormant).
        </p>
        <StagesManager stages={stageData} />
      </section>

      <section className={card}>
        <h2 className="mb-1 font-semibold text-slate-800">Lead sources</h2>
        <p className="mb-4 text-sm text-slate-500">The picklist shown on customers.</p>
        <LeadSourcesManager sources={sources} />
      </section>

      <section className={card}>
        <h2 className="mb-4 font-semibold text-slate-800">Security</h2>
        <SecurityPanel totpEnabled={user.totpEnabled} />
      </section>

      <section className={card}>
        <h2 className="mb-2 font-semibold text-slate-800">Backup &amp; data</h2>
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            Encrypted backup (run from the <code>crm/</code> folder):{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run backup</code>
          </p>
          <p>
            Restore is documented in <code>crm/README.md</code>. Moving to the Mac
            mini = copy the repo + restore a dump.
          </p>
          <p className="text-amber-700">
            🔒 Enable <strong>BitLocker</strong> (full-disk encryption) on this laptop.
            Without it, a lost laptop exposes the whole customer list.
          </p>
          <p className="text-slate-500">
            ⚠ Privacy: in Phase 2, email bodies &amp; notes are sent to the Anthropic
            API for parsing/summaries (PII in transit).
          </p>
        </div>
      </section>

      <section className={card + " opacity-70"}>
        <h2 className="mb-2 font-semibold text-slate-800">
          Email &amp; Claude intake <span className="text-xs text-slate-400">(Phase 2)</span>
        </h2>
        <p className="text-sm text-slate-500">
          IMAP inbox connection, forwarded-address intake, AI signature parsing, and
          the local Claude bridge (text updates → CRM) land in Phase 2.
        </p>
      </section>
    </div>
  );
}
