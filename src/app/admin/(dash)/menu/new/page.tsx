import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { createMenuItem } from "@/app/actions/menu";
import { MenuItemForm } from "@/components/admin/MenuItemForm";
import { summarise } from "@/lib/options";

export default async function NewMenuItemPage() {
  // Must precede every query — see the note in menu/page.tsx.
  await requireAdmin();

  const [categories, tags, optionGroups] = await Promise.all([
    db.category.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
    db.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
    db.optionGroup.findMany({
      orderBy: { displayOrder: "asc" },
      include: { options: { orderBy: { displayOrder: "asc" } } },
    }),
  ]);

  const groupOptions = optionGroups.map((g) => ({
    id: g.id,
    name: g.name,
    summary: summarise(g.select, g.pricing),
    pricing: g.pricing,
    options: g.options.map((o) => ({ id: o.id, name: o.name, priceCents: o.priceCents })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/menu" className="text-sm text-neutral-500 hover:underline">
          ← Menu
        </Link>
        <h1 className="mt-2 text-2xl font-medium">New item</h1>
      </div>

      <MenuItemForm
        action={createMenuItem}
        categories={categories}
        tags={tags}
        optionGroups={groupOptions}
        submitLabel="Create item"
      />
    </div>
  );
}
