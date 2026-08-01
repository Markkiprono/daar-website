import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ViewSource } from "@/generated/prisma/client";

/**
 * Records a menu-item view.
 *
 * Aggregate only: we store an item id, a source and a timestamp. No cookie,
 * no IP, no fingerprint, nothing that identifies a visitor. That keeps the
 * site clear of consent-banner obligations and means this data can never
 * leak anything personal.
 *
 * Called from the client because item pages are statically generated — a
 * server-side count would only fire when the page regenerates, not per visit.
 */

/** Obvious automated traffic. Not exhaustive, and does not need to be. */
const BOT = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|preview|headless|lighthouse|pingdom|curl|wget/i;

export async function POST(request: Request) {
  // Same-origin only. Blocks other sites inflating your numbers.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  if (BOT.test(request.headers.get("user-agent") ?? "")) {
    // Silently accept so crawlers see nothing unusual.
    return NextResponse.json({ ok: true });
  }

  let payload: { slug?: unknown; source?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const slug = typeof payload.slug === "string" ? payload.slug.slice(0, 120) : null;
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

  const raw = String(payload.source ?? "").toUpperCase();
  const source = (Object.values(ViewSource) as string[]).includes(raw)
    ? (raw as ViewSource)
    : ViewSource.DIRECT;

  try {
    const item = await db.menuItem.findFirst({
      where: { slug, category: { isVisible: true } },
      select: { id: true },
    });
    // Unknown slug: accept without writing, so a stale link can't create noise.
    if (item) {
      await db.menuItemView.create({ data: { menuItemId: item.id, source } });
    }
  } catch {
    // Analytics must never break the page it is measuring.
  }

  return NextResponse.json({ ok: true });
}
