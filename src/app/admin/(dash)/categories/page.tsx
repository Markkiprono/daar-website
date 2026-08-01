import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { deleteCategory, moveCategory } from "@/app/actions/categories";
import { NewCategoryForm } from "@/components/admin/NewCategoryForm";
import { Button } from "@/components/ui/button";

export default async function AdminCategoriesPage() {
  // Must precede every query — see the note in menu/page.tsx.
  await requireAdmin();

  const categories = await db.category.findMany({
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium">Categories</h1>

      <ul className="space-y-2">
        {categories.map((c, i) => (
          <li
            key={c.id}
            className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.name}</p>
              <p className="text-xs text-neutral-500">
                {c._count.items} item{c._count.items === 1 ? "" : "s"}
                {c.description ? ` · ${c.description}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <form action={moveCategory}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="direction" value="up" />
                <Button type="submit" size="sm" variant="ghost" disabled={i === 0} aria-label={`Move ${c.name} up`}>
                  ↑
                </Button>
              </form>
              <form action={moveCategory}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="direction" value="down" />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  disabled={i === categories.length - 1}
                  aria-label={`Move ${c.name} down`}
                >
                  ↓
                </Button>
              </form>

              {/* Guarded server-side: deleting a category with items is refused. */}
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={c.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  disabled={c._count.items > 0}
                  title={
                    c._count.items > 0
                      ? "Move or delete its items first"
                      : `Delete ${c.name}`
                  }
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Delete
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium">Add a category</h2>
        <NewCategoryForm />
      </div>
    </div>
  );
}
