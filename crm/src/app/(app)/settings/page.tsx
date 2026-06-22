import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { StagesManager } from "@/components/settings/StagesManager";
import { LeadSourcesManager } from "@/components/settings/LeadSourcesManager";
import { SecurityPanel } from "@/components/settings/SecurityPanel";
import { SubmitButton } from "@/components/SubmitButton";
import { pollEmailNow } from "@/lib/actions/intake";
import { runFeedNow } from "@/lib/actions/feed";
import { syncDealerNow, reimportSnapshotNow } from "@/lib/actions/dealer";
import { getLastPolled, imapConfigured } from "@/lib/imap";
import { feedDir, feedConfigured } from "@/lib/inventoryFeed";
import { scraperAvailable } from "@/lib/dealerSync";
import { aiEnabled } from "@/lib/ai";
import { formatDateTime } from "@/lib/format";
import { card, btnGhost, btnPrimary } from "@/lib/ui";

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

  const lastPolled = await getLastPolled();
  const imapOn = imapConfigured();
  const aiOn = aiEnabled();
  const bridgeOn = Boolean(process.env.INTAKE_API_TOKEN);
  const baseUrl = process.env.CRM_BASE_URL || "http://localhost:3000";

  const feedPath = feedDir();
  const feedOn = feedConfigured();
  const feedCron = process.env.FEED_CRON || "*/10 * * * *";
  const feedRuns = await prisma.feedRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const scraperOn = scraperAvailable();
  const dealerSyncCron = process.env.DEALER_SYNC_CRON || "";
  const dealerRuns = await prisma.feedRun.findMany({
    where: { source: { startsWith: "Northwest" } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const remoteHosts = (process.env.REMOTE_HOSTNAMES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

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

      <section className={card}>
        <h2 className="mb-2 font-semibold text-slate-800">AI &amp; intake status</h2>
        <ul className="space-y-1 text-sm text-slate-600">
          <li>
            Anthropic API (signature parsing + summaries):{" "}
            <strong>{aiOn ? "configured ✓" : "not configured"}</strong>
            {!aiOn && " — set ANTHROPIC_API_KEY in .env"}
          </li>
          <li>
            Claude bridge token:{" "}
            <strong>{bridgeOn ? "set ✓" : "not set"}</strong>
            {!bridgeOn && " — set INTAKE_API_TOKEN in .env"}
          </li>
        </ul>
      </section>

      <section className={card}>
        <h2 className="mb-1 font-semibold text-slate-800">Email intake (IMAP)</h2>
        <p className="mb-3 text-sm text-slate-500">
          {imapOn
            ? "Inbox connection configured in .env."
            : "Set IMAP_HOST / IMAP_USER / IMAP_PASSWORD in .env to enable."}{" "}
          Last polled: {lastPolled ? formatDateTime(lastPolled) : "never"}.
        </p>
        <form action={pollEmailNow}>
          <SubmitButton className={btnGhost} pendingLabel="Polling…">
            Poll inbox now
          </SubmitButton>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          For automatic polling, run <code>npm run worker</code> alongside the app.
        </p>
      </section>

      <section className={card}>
        <h2 className="mb-1 font-semibold text-slate-800">Inventory feed (auto-import)</h2>
        <p className="mb-3 text-sm text-slate-500">
          Drop inventory <code>.csv</code> exports (or point your DMS export) into{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 break-all">{feedPath}</code>{" "}
          and they import automatically — same columns as the manual import.
          Processed files move to <code>processed/</code>; parse failures to{" "}
          <code>failed/</code>.{" "}
          {feedOn ? (
            <span className="text-emerald-700">Folder ready ✓</span>
          ) : (
            <span>Click “Run import now” once to create the folder.</span>
          )}
        </p>
        <form action={runFeedNow}>
          <SubmitButton className={btnGhost} pendingLabel="Importing…">
            Run import now
          </SubmitButton>
        </form>
        {feedRuns.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            {feedRuns.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">
                  {f.status === "OK" ? "✓" : "✗"} <span className="font-medium">{f.source}</span>
                  {f.status === "OK"
                    ? ` — ${f.created} new, ${f.updated} updated${f.skipped ? `, ${f.skipped} skipped` : ""}`
                    : ` — ${f.message ?? "failed"}`}
                </span>
                <span className="shrink-0 text-slate-400">{formatDateTime(f.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-400">
          For automatic pickup, run <code>npm run worker</code> (scans on{" "}
          <code>{feedCron}</code>).
        </p>
      </section>

      <section className={card}>
        <h2 className="mb-1 font-semibold text-slate-800">Dealer inventory (Northwest Lexus)</h2>
        <p className="mb-3 text-sm text-slate-500">
          Pull live new &amp; pre-owned stock from northwestlexus.com, then import it
          and refresh matches. The dealer site is behind Cloudflare, so this only
          works from your <strong>home network</strong> (not a datacentre/VPN) and needs{" "}
          <code>python3</code>. A scrape takes a few minutes; a blocked run leaves your
          current snapshot untouched.{" "}
          {scraperOn ? "" : <span className="text-amber-700">Scraper script not found.</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          <form action={syncDealerNow}>
            <SubmitButton className={btnPrimary} pendingLabel="Syncing… (a few min)">
              Sync from Northwest Lexus
            </SubmitButton>
          </form>
          <form action={reimportSnapshotNow}>
            <SubmitButton className={btnGhost} pendingLabel="Importing…">
              Re-import latest snapshot
            </SubmitButton>
          </form>
        </div>
        {dealerRuns.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            {dealerRuns.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">
                  {f.status === "OK" ? "✓" : "✗"} <span className="font-medium">{f.source}</span>
                  {f.status === "OK"
                    ? ` — ${f.created} new, ${f.updated} updated${f.skipped ? `, ${f.skipped} skipped` : ""}`
                    : ` — ${f.message ?? "failed"}`}
                </span>
                <span className="shrink-0 text-slate-400">{formatDateTime(f.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-400">
          {dealerSyncCron
            ? `Auto-sync scheduled in the worker (${dealerSyncCron}).`
            : "To auto-sync, set DEALER_SYNC_CRON in .env and run npm run worker — or npm run sync:inventory from a cron."}
        </p>
      </section>

      <section className={card}>
        <h2 className="mb-1 font-semibold text-slate-800">Claude bridge (text updates)</h2>
        <p className="mb-3 text-sm text-slate-500">
          Add this to Claude Desktop’s <code>claude_desktop_config.json</code>, then tell
          Claude things like “log a call with Mr. Tan — wants a white RX 350 under $80k”.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
          {`{
  "mcpServers": {
    "vincere-crm": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/crm/mcp/server.ts"],
      "env": {
        "INTAKE_API_TOKEN": "<copy from .env>",
        "CRM_BASE_URL": "${baseUrl}"
      }
    }
  }
}`}
        </pre>
      </section>

      <section className={card}>
        <h2 className="mb-1 font-semibold text-slate-800">Remote access (Tailscale)</h2>
        <p className="mb-2 text-sm text-slate-500">
          Use the CRM from your phone while it stays private. Tailscale puts your phone
          and this machine on one encrypted network — nothing is exposed to the public
          internet, and the app keeps binding to <code>localhost</code>.
        </p>
        <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>
            Install Tailscale on this machine and your phone, sign into the same account
            (<code>tailscale up</code>).
          </li>
          <li>
            Share the app over your tailnet (HTTPS, stays local):{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">tailscale serve 3000</code>
          </li>
          <li>
            Put that MagicDNS name in <code>.env</code> as{" "}
            <code>REMOTE_HOSTNAMES</code> and restart, so logins/forms work remotely.
          </li>
          <li>
            On your phone, open <code>https://&lt;your-machine&gt;.ts.net</code>.
          </li>
        </ol>
        <p className="text-sm">
          {remoteHosts.length > 0 ? (
            <span className="text-emerald-700">
              Configured for: {remoteHosts.join(", ")} ✓
            </span>
          ) : (
            <span className="text-slate-500">
              <code>REMOTE_HOSTNAMES</code> not set — Server Actions (login, forms) will be
              rejected from a remote hostname until you set it. See{" "}
              <code>crm/README.md</code> → “Remote access”.
            </span>
          )}
        </p>
      </section>
    </div>
  );
}
