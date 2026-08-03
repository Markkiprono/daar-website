import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { logout } from "@/app/actions/auth";
import { getLogo } from "@/lib/logo";
import { BrandMark } from "@/components/site/BrandMark";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/config";

/**
 * Every authenticated admin route nests under here, so the real
 * authorization check runs server-side on each of them. Proxy's cookie
 * check is only an optimisation — this is the gate that matters.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const [logo, unreadMessages, pendingBookings] = await Promise.all([
    getLogo("mark"),
    db.message.count({ where: { status: "UNREAD" } }),
    db.reservation.count({ where: { status: "PENDING", date: { gte: todayUtc } } }),
  ]);

  return (
    <div className="min-h-dvh bg-neutral-50">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2.5">
            <BrandMark logo={logo} id="admin" className="h-7 w-auto text-[#481819]" />
            <span className="leading-none">
              <span className="block font-[family-name:var(--font-display)] text-lg tracking-[0.06em] text-[#481819]">
                DAAR
              </span>
              <span className="mt-0.5 block font-[family-name:var(--font-label)] text-[0.55rem] uppercase tracking-[0.24em] text-neutral-400">
                Dashboard
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* An absolute URL, not "/": the dashboard is served from its own
                host, where the proxy maps "/" back onto /admin — so a relative
                link reopened the dashboard instead of the website. This is now
                the only route between the two, since the public footer no
                longer links here. */}
            <a
              href={SITE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs text-neutral-600 transition hover:border-[#481819] hover:text-[#481819]"
            >
              Daar by Izzi website ↗
            </a>
            <span className="hidden text-xs text-neutral-400 md:inline">{session.email}</span>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>

        <AdminNav counts={{ messages: unreadMessages, reservations: pendingBookings }} />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 pb-28">{children}</main>
    </div>
  );
}
