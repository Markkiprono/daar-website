import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { OptionGroupManager, type ManagedGroup } from "@/components/admin/OptionGroupManager";

export default async function AdminOptionsPage() {
  // Must precede every query — see the note in menu/page.tsx.
  await requireAdmin();

  const groups = await db.optionGroup.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      options: { orderBy: { displayOrder: "asc" } },
      _count: { select: { items: true } },
    },
  });

  const managed: ManagedGroup[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    select: g.select,
    pricing: g.pricing,
    helpText: g.helpText,
    itemCount: g._count.items,
    options: g.options.map((o) => ({
      id: o.id,
      name: o.name,
      priceCents: o.priceCents,
      isAvailable: o.isAvailable,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium">Options</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-neutral-500">
          Choices a customer makes on an item — beans, flavours, extras, sizes. A cappuccino stays
          one menu item with one photograph; the price moves as they choose. Groups are shared, so
          write &ldquo;Extras&rdquo; once and tick it onto every item it belongs to from the item
          form.
        </p>
      </div>

      <OptionGroupManager groups={managed} />
    </div>
  );
}
