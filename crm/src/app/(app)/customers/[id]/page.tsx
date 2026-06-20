import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  archiveCustomer,
  purgeCustomer,
  setConsent,
} from "@/lib/actions/customers";
import { archiveWant } from "@/lib/actions/wants";
import { archiveActivity } from "@/lib/actions/activities";
import { WantForm } from "@/components/forms/WantForm";
import { NoteForm } from "@/components/forms/NoteForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { card, badge, statusColor, btnGhost, btnDanger } from "@/lib/ui";
import { formatMoney, formatDate, humanize, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function wantLabel(w: {
  make: string | null;
  model: string | null;
  trim: string | null;
}) {
  return [w.make, w.model, w.trim].filter(Boolean).join(" ") || "Any vehicle";
}

export default async function CustomerProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await prisma.customer.findFirst({
    where: { id, archivedAt: null },
    include: {
      leadSource: true,
      wants: {
        where: { archivedAt: null },
        orderBy: [{ active: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
      },
      activities: {
        where: { archivedAt: null },
        orderBy: { occurredAt: "desc" },
        take: 50,
      },
      deals: {
        where: { archivedAt: null },
        include: { stage: true, vehicle: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!c) notFound();

  const isExporter = c.type === "EXPORTER";
  const amlFlag = c.paymentMethod === "CASH" || c.paymentMethod === "WIRE";

  return (
    <div className="space-y-6">
      <Link href="/customers" className="text-sm text-slate-500 hover:underline">
        ← Customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{c.name}</h1>
            <span className={badge + " " + (statusColor[c.status] ?? "")}>
              {humanize(c.status)}
            </span>
            <span className={badge + " bg-slate-100 text-slate-600"}>
              {humanize(c.type)}
            </span>
          </div>
          {c.businessName && <p className="text-slate-500">{c.businessName}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/customers/${c.id}/edit`} className={btnGhost}>
            Edit
          </Link>
          <a href={`/api/customers/${c.id}/export`} className={btnGhost}>
            Export data
          </a>
          <form action={setConsent.bind(null, c.id, !c.consentToContact)}>
            <button className={btnGhost}>
              {c.consentToContact ? "Mark opt-out" : "Mark opt-in"}
            </button>
          </form>
          <ConfirmSubmit
            action={archiveCustomer.bind(null, c.id)}
            confirm="Archive this customer? They’ll be hidden but not deleted."
            className={btnGhost}
          >
            Archive
          </ConfirmSubmit>
          <ConfirmSubmit
            action={purgeCustomer.bind(null, c.id)}
            confirm="PERMANENTLY delete this customer and ALL their data (PIPEDA erasure)? This cannot be undone."
            className={btnDanger}
          >
            Delete (PIPEDA)
          </ConfirmSubmit>
        </div>
      </div>

      {c.needsReview && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠ This record was auto-created/updated and needs review.
          {c.aiUnverifiedFields.length > 0 && (
            <> Unverified: {c.aiUnverifiedFields.join(", ")}.</>
          )}{" "}
          Open <Link href={`/customers/${c.id}/edit`} className="underline">Edit</Link> to confirm.
        </div>
      )}

      {isExporter && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          🚢 Exporter — watch the OEM <strong>new-vehicle export-restriction window</strong>.
          OEMs (incl. Lexus/Toyota) can charge back the selling dealer for new units
          exported too early. Confirm your store’s policy before quoting new stock.
        </div>
      )}

      {amlFlag && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          💵 Payment method is <strong>{humanize(c.paymentMethod)}</strong> — keep clear
          AML records for large cash/wire transactions.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={card + " lg:col-span-1"}>
          <h2 className="mb-3 font-semibold text-slate-800">Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Info label="Phone" value={c.phone} />
            <Info label="Email" value={c.email} />
            <Info label="Preferred channel" value={c.preferredChannel} />
            <Info label="Language" value={c.language} />
            <Info label="Lead source" value={c.leadSource?.name} />
            <Info label="Payment" value={c.paymentMethod ? humanize(c.paymentMethod) : null} />
            <Info
              label="Consent"
              value={
                c.consentToContact
                  ? `Yes${c.consentDate ? ` · ${formatDate(c.consentDate)}` : ""}`
                  : "No"
              }
            />
            <Info label="Source" value={humanize(c.source)} />
          </dl>
          {c.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {c.tags.map((t) => (
                <span key={t} className={badge + " bg-slate-100 text-slate-600"}>
                  {t}
                </span>
              ))}
            </div>
          )}
          {(c.whatTheyDoWithCars ||
            c.exportDestination ||
            c.typicalVolume ||
            c.buyingCadence) && (
            <dl className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <Info label="What they do with cars" value={c.whatTheyDoWithCars} />
              <Info label="Export destination" value={c.exportDestination} />
              <Info label="Typical volume" value={c.typicalVolume} />
              <Info label="Buying cadence" value={c.buyingCadence} />
            </dl>
          )}
        </section>

        <div className="space-y-6 lg:col-span-2">
          {/* Wants */}
          <section className={card}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Wants</h2>
              <span className="text-xs text-slate-400">{c.wants.length}</span>
            </div>
            <ul className="space-y-2">
              {c.wants.map((w) => (
                <li
                  key={w.id}
                  className="flex items-start justify-between rounded-lg border border-slate-100 p-3"
                >
                  <div className="text-sm">
                    <p className="font-medium text-slate-800">
                      {wantLabel(w)}{" "}
                      {!w.active && (
                        <span className="text-xs text-slate-400">(inactive)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[
                        w.yearMin || w.yearMax
                          ? `${w.yearMin ?? "?"}–${w.yearMax ?? "?"}`
                          : null,
                        w.condition !== "ANY" ? humanize(w.condition) : null,
                        w.priceMax ? `≤ ${formatMoney(w.priceMax)}` : null,
                        w.mileageMax ? `≤ ${w.mileageMax.toLocaleString()} km` : null,
                        w.colorExterior.length ? w.colorExterior.join("/") : null,
                        w.quantity > 1 ? `×${w.quantity}` : null,
                        w.recurring ? "recurring" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Any spec"}
                    </p>
                    {w.optionsRequired.length > 0 && (
                      <p className="text-xs text-slate-400">
                        Must have: {w.optionsRequired.join(", ")}
                      </p>
                    )}
                  </div>
                  <ConfirmSubmit
                    action={archiveWant.bind(null, w.id, c.id)}
                    confirm="Remove this want?"
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    ✕
                  </ConfirmSubmit>
                </li>
              ))}
              {c.wants.length === 0 && (
                <li className="text-sm text-slate-400">No standing wants yet.</li>
              )}
            </ul>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-600">
                + Add a want
              </summary>
              <div className="mt-3">
                <WantForm customerId={c.id} />
              </div>
            </details>
          </section>

          {/* Deals */}
          <section className={card}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Deals</h2>
              <Link
                href={`/pipeline/new?customerId=${c.id}`}
                className="text-sm text-slate-600 hover:underline"
              >
                + New deal
              </Link>
            </div>
            <ul className="space-y-2">
              {c.deals.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {d.title || d.stage.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {d.stage.name}
                      {d.vehicle && ` · ${[d.vehicle.year, d.vehicle.make, d.vehicle.model].filter(Boolean).join(" ")}`}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-700">
                    {formatMoney(d.value)}
                  </span>
                </li>
              ))}
              {c.deals.length === 0 && (
                <li className="text-sm text-slate-400">No deals yet.</li>
              )}
            </ul>
          </section>

          {/* Activity timeline */}
          <section className={card}>
            <h2 className="mb-3 font-semibold text-slate-800">Activity</h2>
            <NoteForm customerId={c.id} />
            <ul className="mt-5 space-y-4">
              {c.activities.map((a) => (
                <li key={a.id} className="border-l-2 border-slate-200 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {humanize(a.type)}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-slate-400">
                      {timeAgo(a.occurredAt)}
                      <ConfirmSubmit
                        action={archiveActivity.bind(null, a.id, c.id)}
                        confirm="Delete this activity from the timeline?"
                        className="hover:text-red-600"
                      >
                        ✕
                      </ConfirmSubmit>
                    </span>
                  </div>
                  {a.summary && (
                    <p className="mt-1 text-sm font-medium text-slate-700">{a.summary}</p>
                  )}
                  {a.body && (
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">
                      {a.body}
                    </p>
                  )}
                </li>
              ))}
              {c.activities.length === 0 && (
                <li className="text-sm text-slate-400">Nothing logged yet.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
