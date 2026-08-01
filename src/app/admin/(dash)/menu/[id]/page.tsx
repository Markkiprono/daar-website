import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { updateMenuItem } from "@/app/actions/menu";
import { MenuItemForm } from "@/components/admin/MenuItemForm";

export default async function EditMenuItemPage({ params }: { params: Promise<{ id: string }> }) {
  // Must precede every query — see the note in menu/page.tsx.
  await requireAdmin();

  // Next 15+ : route params are async.
  const { id } = await params;

  const [item, categories, tags] = await Promise.all([
    db.menuItem.findUnique({ where: { id }, include: { tags: true } }),
    db.category.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
    db.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
  ]);

  if (!item) notFound();

  // Bind the id so the form's action keeps the (prevState, formData) shape.
  const action = updateMenuItem.bind(null, item.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/menu" className="text-sm text-neutral-500 hover:underline">
          ← Menu
        </Link>
        <h1 className="mt-2 text-2xl font-medium">{item.name}</h1>
      </div>

      <MenuItemForm
        action={action}
        categories={categories}
        tags={tags}
        submitLabel="Save changes"
        values={{
          name: item.name,
          description: item.description,
          price: item.priceCents / 100,
          categoryId: item.categoryId,
          isAvailable: item.isAvailable,
          isFeatured: item.isFeatured,
          displayOrder: item.displayOrder,
          imageUrl: item.imageUrl,
          tagIds: item.tags.map((t) => t.tagId),
        }}
      />
    </div>
  );
}
