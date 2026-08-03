import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { setReservationStatus, deleteReservation } from "@/app/actions/reservations";
import { EmailNotice } from "@/components/admin/EmailNotice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Bookings must never be served stale. */
export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
} as const;

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function AdminReservationsPage() {
  // Must precede every query — see the note in menu/page.tsx.
  await requireAdmin();

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const [upcoming, past, pendingCount] = await Promise.all([
    db.reservation.findMany({
      where: { date: { gte: todayUtc } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    }),
    db.reservation.findMany({
      where: { date: { lt: todayUtc } },
      orderBy: [{ date: "desc" }, { time: "desc" }],
      take: 25,
    }),
    db.reservation.count({ where: { status: "PENDING", date: { gte: todayUtc } } }),
  ]);

  const Row = ({ r }: { r: (typeof upcoming)[number] }) => (
    <li className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{r.name}</p>
            <Badge
              variant={
                r.status === "CONFIRMED" ? "default" : r.status === "CANCELLED" ? "destructive" : "secondary"
              }
              className={r.status === "CONFIRMED" ? "bg-[#481819]" : undefined}
            >
              {STATUS_LABEL[r.status]}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-neutral-600">
            {formatDate(r.date)} · <span className="tabular-nums">{r.time}</span> ·{" "}
            {r.partySize} {r.partySize === 1 ? "guest" : "guests"}
          </p>

          <p className="mt-1 text-sm">
            <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="text-[#481819] hover:underline">
              {r.phone}
            </a>
            {r.email && (
              <>
                <span className="px-2 text-neutral-300">·</span>
                <a href={`mailto:${r.email}`} className="hover:underline">
                  {r.email}
                </a>
              </>
            )}
          </p>

          {r.occasion && <p className="mt-1 text-sm text-neutral-500">Occasion: {r.occasion}</p>}
          {r.notes && <p className="mt-1 text-sm text-neutral-500">“{r.notes}”</p>}
          <p className="mt-1 text-xs text-neutral-400">
            Ref DAAR-{r.id.slice(-6).toUpperCase()} · requested{" "}
            {r.createdAt.toLocaleDateString("en-GB")}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          {r.status !== "CONFIRMED" && (
            <form action={setReservationStatus}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="CONFIRMED" />
              <Button type="submit" size="sm" className="w-full text-xs">
                Confirm
              </Button>
            </form>
          )}
          {r.status !== "CANCELLED" && (
            <form action={setReservationStatus}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="CANCELLED" />
              <Button type="submit" size="sm" variant="outline" className="w-full text-xs">
                Decline
              </Button>
            </form>
          )}
          <form action={deleteReservation}>
            <input type="hidden" name="id" value={r.id} />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="w-full text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Delete
            </Button>
          </form>
        </div>
      </div>
    </li>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium">Reservations</h1>
        <p className="text-sm text-neutral-500">
          {pendingCount > 0
            ? `${pendingCount} awaiting your response`
            : "Nothing awaiting a response"}
        </p>
      </div>

      <EmailNotice what="bookings" />

      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-500">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            No upcoming bookings.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Past ({past.length})
          </h2>
          <ul className="space-y-2 opacity-70">
            {past.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
