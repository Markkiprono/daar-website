import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { SimilarItems, type SimilarItem } from "@/components/site/SimilarItems";
import { ViewTracker } from "@/components/site/ViewTracker";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/menu";
import { formatPrice, SITE } from "@/lib/config";

export const revalidate = 60;

/** Pre-render every item at build time; new ones fill in on demand. */
export async function generateStaticParams() {
  const items = await db.menuItem.findMany({
    where: { category: { isVisible: true } },
    select: { slug: true },
  });
  return items.map((i) => ({ slug: i.slug }));
}

const getItem = async (slug: string) =>
  db.menuItem.findFirst({
    // Hiding a category must hide its items' pages too, not just the listing.
    where: { slug, category: { isVisible: true } },
    include: { category: true, tags: { include: { tag: true } } },
  });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItem(slug);
  if (!item) return { title: "Not found" };

  const description =
    item.description ?? `${item.name} — ${formatPrice(item.priceCents)} at ${SITE.name}, ${SITE.city}.`;

  return {
    title: item.name,
    description,
    openGraph: {
      title: `${item.name} — ${SITE.name}`,
      description,
      type: "article",
      // Absolute URL so link previews resolve when shared.
      images: item.imageUrl ? [{ url: new URL(item.imageUrl, SITE.url).toString() }] : undefined,
    },
  };
}

export default async function MenuItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [item, settings] = await Promise.all([getItem(slug), getSettings()]);
  if (!item) notFound();

  const badges = item.tags.filter((t) => t.tag.kind === "BADGE");
  const dietary = item.tags.filter((t) => t.tag.kind === "DIETARY");

  // Same category first; if that category is thin, top up from elsewhere so
  // the carousel never renders with one lonely card.
  const sameCategory = await db.menuItem.findMany({
    where: { categoryId: item.categoryId, id: { not: item.id }, category: { isVisible: true } },
    orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }],
    take: 8,
    include: { category: { select: { name: true } } },
  });

  const filler =
    sameCategory.length >= 4
      ? []
      : await db.menuItem.findMany({
          where: {
            categoryId: { not: item.categoryId },
            id: { not: item.id },
            category: { isVisible: true },
            isAvailable: true,
          },
          orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
          take: 4 - sameCategory.length,
          include: { category: { select: { name: true } } },
        });

  const similar: SimilarItem[] = [...sameCategory, ...filler].slice(0, 8).map((i) => ({
    id: i.id,
    slug: i.slug,
    name: i.name,
    priceCents: i.priceCents,
    imageUrl: i.imageUrl,
    imageAlt: i.imageAlt,
    blurDataUrl: i.blurDataUrl,
    isAvailable: i.isAvailable,
    categoryName: i.category.name,
  }));

  return (
    <>
      <ViewTracker slug={item.slug} source="MENU" />
      <SiteHeader solid />

      <main className="flex-1 bg-daar-bone text-daar-ink">
        <div className="mx-auto max-w-[1240px] px-5 pt-8">
          {/* breadcrumb */}
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-label)] text-[0.7rem] uppercase tracking-[0.18em] text-daar-muted">
              <li>
                <Link href="/menu" className="transition-colors hover:text-daar-oxblood">
                  Menu
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link
                  href={`/menu#${item.category.slug}`}
                  className="transition-colors hover:text-daar-oxblood"
                >
                  {item.category.name}
                </Link>
              </li>
            </ol>
          </nav>
        </div>

        <article className="mx-auto max-w-[1240px] px-5 py-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            {/* ---------- photograph (rectangle: product, not atmosphere) ---------- */}
            <Reveal>
              <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-daar-mist">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.imageAlt ?? item.name}
                    fill
                    priority
                    sizes="(min-width: 1024px) 600px, 92vw"
                    className="object-cover"
                    {...(item.blurDataUrl
                      ? { placeholder: "blur" as const, blurDataURL: item.blurDataUrl }
                      : {})}
                  />
                ) : (
                  <div className="grid h-full place-items-center">
                    <span className="font-[family-name:var(--font-label)] text-[0.7rem] uppercase tracking-[0.18em] text-white/70">
                      Photo coming
                    </span>
                  </div>
                )}

                {!item.isAvailable && (
                  <div className="absolute inset-0 grid place-items-center bg-daar-ink/65">
                    <span className="border border-daar-bone px-5 py-2.5 font-[family-name:var(--font-label)] text-[0.75rem] uppercase tracking-[0.18em] text-daar-bone">
                      Sold out
                    </span>
                  </div>
                )}
              </div>
            </Reveal>

            {/* ---------- details ---------- */}
            <Reveal className="lg:pt-4">
              <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
                {item.category.name}
              </p>

              <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2rem,6vw,3.5rem)] leading-[1.02]">
                {item.name}
              </h1>

              <p className="mt-4 font-[family-name:var(--font-label)] text-[clamp(1.25rem,3vw,1.6rem)] tracking-[0.06em] text-daar-oxblood">
                {formatPrice(item.priceCents)}
              </p>

              {item.description && (
                <p className="mt-6 text-[1.05rem] font-light leading-relaxed text-daar-muted">
                  {item.description}
                </p>
              )}

              {(badges.length > 0 || dietary.length > 0) && (
                <div className="mt-7 flex flex-wrap gap-2">
                  {badges.map(({ tag }) => (
                    <span
                      key={tag.id}
                      className={[
                        "rounded-[2px] border px-3 py-1.5 font-[family-name:var(--font-label)] text-[10px] uppercase tracking-[0.14em]",
                        tag.slug === "bestseller"
                          ? "border-daar-oxblood bg-daar-oxblood text-daar-cream"
                          : tag.slug === "new"
                            ? "border-transparent bg-gradient-to-br from-daar-tan to-daar-ochre text-daar-ink"
                            : "border-daar-rule text-daar-muted",
                      ].join(" ")}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {dietary.map(({ tag }) => (
                    <span
                      key={tag.id}
                      className="rounded-[2px] border border-[#7B8B5A] px-3 py-1.5 font-[family-name:var(--font-label)] text-[10px] uppercase tracking-[0.14em] text-[#5F6E42]"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {!item.isAvailable && (
                <p className="mt-7 rounded-[3px] border border-daar-rule bg-white px-4 py-3 text-sm text-daar-muted">
                  This one has sold out for today — it&apos;s usually back tomorrow morning.
                </p>
              )}

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/reserve"
                  className="rounded-full bg-daar-oxblood px-8 py-4 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-cream transition hover:-translate-y-0.5 hover:bg-daar-ink"
                >
                  Reserve a table
                </Link>
                <Link
                  href="/menu"
                  className="rounded-full border border-daar-oxblood px-8 py-4 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-oxblood transition hover:-translate-y-0.5 hover:bg-daar-oxblood hover:text-daar-cream"
                >
                  Back to menu
                </Link>
              </div>

              {settings?.phone && (
                <p className="mt-6 text-sm text-daar-muted">
                  Want to order ahead?{" "}
                  <a
                    href={`tel:${settings.phone.replace(/\s/g, "")}`}
                    className="underline transition-colors hover:text-daar-oxblood"
                  >
                    {settings.phone}
                  </a>
                </p>
              )}
            </Reveal>
          </div>
        </article>

        <SimilarItems items={similar} heading={`More from ${item.category.name}`} />
      </main>

      <SiteFooter email={settings?.email} phone={settings?.phone} />
    </>
  );
}
