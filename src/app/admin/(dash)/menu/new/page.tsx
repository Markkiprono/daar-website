import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { createMenuItem } from "@/app/actions/menu";
import { MenuItemForm } from "@/components/admin/MenuItemForm";

export default async function NewMenuItemPage() {
  // Must precede every query — see the note in menu/page.tsx.
  await requireAdmin();

  const [categories, tags] = await Promise.all([
    db.category.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
    db.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
  ]);

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
        submitLabel="Create item"
      />
    </div>
  );
}
