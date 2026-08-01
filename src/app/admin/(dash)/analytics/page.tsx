import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { getItemViews, getDailyTotals, getViewTotals } from "@/lib/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

/**
 * Charts are hand-built from divs and one SVG polyline rather than pulled
 * from a charting library — two bar lists and a sparkline do not justify
 * shipping ~100 KB of JavaScript to a dashboard used on a phone.
 */
export default async function AnalyticsPage() {
  // Must precede every query — see the note in menu/page.tsx.
  await requireAdmin();

  const [totals, daily, items] = await Promise.all([
    getViewTotals(),
    getDailyTotals(14),
    getItemViews(30),
  ]);

  const peak = Math.max(1, ...daily.map((d) => d.views));
  const topViews = Math.max(1, ...items.map((i) => i.views));
  const withViews = items.filter((i) => i.views > 0);
  const noViews = items.filter((i) => i.views === 0);

  // Sparkline geometry — 14 points across a 100x32 viewBox.
  const points = daily
    .map((d, i) => `${(i / (daily.length - 1)) * 100},${32 - (d.views / peak) * 28}`)
    .join(" ");

  const stats = [
    { label: "Today", value: totals.today },
    { label: "7 days", value: totals.week },
    { label: "30 days", value: totals.month },
    { label: "All time", value: totals.lifetime },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium">Analytics</h1>
        <p className="text-sm text-neutral-500">
          Menu item views. No cookies, no personal data — counts only.
        </p>
      </div>

      {/* ---------- totals ---------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-medium tabular-nums">{s.value.toLocaleString()}</div>
              <div className="mt-1 text-xs text-neutral-500">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ---------- 14-day trend ---------- */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Last 14 days</h2>
            <span className="text-xs text-neutral-500">
              peak {peak.toLocaleString()} / day
            </span>
          </div>

          {totals.month === 0 ? (
            <p className="mt-6 text-center text-sm text-neutral-500">
              No views recorded yet. Open a menu item on the public site and it will appear here.
            </p>
          ) : (
            <>
              <svg
                viewBox="0 0 100 32"
                preserveAspectRatio="none"
                className="mt-4 h-24 w-full"
                role="img"
                aria-label={`Daily views over the last 14 days, peaking at ${peak}`}
              >
                <polyline
                  points={points}
                  fill="none"
                  stroke="#481819"
                  strokeWidth={0.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Bars carry the readable detail; the line carries the shape. */}
              <div className="mt-2 flex items-end gap-1">
                {daily.map((d) => (
                  <div key={d.date} className="group flex-1" title={`${d.label}: ${d.views} views`}>
                    <div
                      className="w-full rounded-sm bg-[#481819]/15 transition-colors group-hover:bg-[#481819]/35"
                      style={{ height: `${Math.max(2, (d.views / peak) * 40)}px` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
                <span>{daily[0]?.label}</span>
                <span>{daily.at(-1)?.label}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ---------- per item ---------- */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-medium">Most viewed · last 30 days</h2>

          {withViews.length === 0 ? (
            <p className="mt-6 text-center text-sm text-neutral-500">Nothing viewed yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {withViews.map((item) => (
                <li key={item.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/admin/menu/${item.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    <span className="shrink-0 text-sm tabular-nums text-neutral-600">
                      {item.views.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-[#481819]"
                        style={{ width: `${(item.views / topViews) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 truncate text-right text-[11px] text-neutral-400">
                      {item.categoryName}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ---------- the useful negative ---------- */}
      {noViews.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-medium">No views in 30 days ({noViews.length})</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Worth a better photo, a clearer description, or dropping from the menu.
            </p>
            <ul className="mt-4 divide-y divide-neutral-100">
              {noViews.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                  <Link
                    href={`/admin/menu/${item.id}`}
                    className="truncate text-sm hover:underline"
                  >
                    {item.name}
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    {!item.isAvailable && <Badge variant="destructive">Sold out</Badge>}
                    <span className="text-[11px] text-neutral-400">{item.categoryName}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <p className="pb-4 text-center text-xs text-neutral-400">
        Raw view events are kept for 30 days, then rolled into daily totals.
      </p>
    </div>
  );
}
