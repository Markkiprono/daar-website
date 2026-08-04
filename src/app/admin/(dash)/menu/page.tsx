import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { AdminMenuList } from "@/components/admin/AdminMenuList";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminMenuPage() {
  // MUST come before any query. Next renders layout and page concurrently,
  // so a check that lives only in the layout does not stop this page from
  // fetching — and the rendered payload leaks in the redirect body.
  await requireAdmin();

  const categories = await db.category.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      items: {
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        include: { tags: { include: { tag: true } } },
      },
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium">Menu</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/print-menu"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Print / PDF
          </Link>
          <Link href="/admin/menu/new" className={buttonVariants({ size: "lg" })}>
            Add item
          </Link>
        </div>
      </div>

      <AdminMenuList
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          items: c.items.map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            priceCents: i.priceCents,
            imageUrl: i.imageUrl,
            imageAlt: i.imageAlt,
            blurDataUrl: i.blurDataUrl,
            isAvailable: i.isAvailable,
            isFeatured: i.isFeatured,
            tagNames: i.tags.map((t) => t.tag.name),
          })),
        }))}
      />
    </div>
  );
}
