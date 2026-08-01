import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { formatPrice } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminOverview() {
  // Must precede every query — see the note in menu/page.tsx.
  await requireAdmin();

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const [itemCount, categoryCount, soldOut, featured, recent, unreadMessages, pendingBookings] =
    await Promise.all([
      db.menuItem.count(),
      db.category.count(),
      db.menuItem.count({ where: { isAvailable: false } }),
      db.menuItem.findFirst({ where: { isFeatured: true }, select: { name: true } }),
      db.menuItem.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { category: { select: { name: true } } },
      }),
      db.message.count({ where: { status: "UNREAD" } }),
      db.reservation.count({ where: { status: "PENDING", date: { gte: todayUtc } } }),
    ]);

  const stats = [
    { label: "Menu items", value: itemCount },
    { label: "Categories", value: categoryCount },
    { label: "Sold out", value: soldOut },
  ];

  // Things waiting on the owner, surfaced first.
  const inbox = [
    unreadMessages > 0 && {
      href: "/admin/messages",
      label: `${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"}`,
    },
    pendingBookings > 0 && {
      href: "/admin/reservations",
      label: `${pendingBookings} booking${pendingBookings === 1 ? "" : "s"} awaiting a reply`,
    },
  ].filter((x): x is { href: string; label: string } => Boolean(x));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Overview</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <Link href="/admin/menu/new" className={buttonVariants({ size: "lg" })}>
          Add item
        </Link>
      </div>

      {inbox.length > 0 && (
        <ul className="space-y-2">
          {inbox.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                className="flex items-center justify-between rounded-lg border border-[#481819]/25 bg-[#481819]/5 px-4 py-3 text-sm font-medium text-[#481819] transition hover:bg-[#481819]/10"
              >
                {i.label}
                <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-medium tabular-nums">{s.value}</div>
              <div className="mt-1 text-xs text-neutral-500">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-neutral-500">Chef&apos;s Special</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {featured ? (
            <p className="text-lg">{featured.name}</p>
          ) : (
            <p className="text-sm text-neutral-500">
              None set. Mark an item as featured and it appears on the home page.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-neutral-500">Recently updated</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="divide-y divide-neutral-100">
            {recent.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/admin/menu/${item.id}`} className="block truncate hover:underline">
                    {item.name}
                  </Link>
                  <span className="text-xs text-neutral-500">{item.category.name}</span>
                </div>
                <span className="whitespace-nowrap text-sm tabular-nums text-neutral-600">
                  {formatPrice(item.priceCents)}
                </span>
              </li>
            ))}
            {recent.length === 0 ? (
              <li className="py-3 text-sm text-neutral-500">No items yet.</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
