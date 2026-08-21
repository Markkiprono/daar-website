"use client";

import { useActionState, useState } from "react";
import { updateCategory, type CategoryState } from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Category = {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  itemCount: number;
};

/**
 * Renaming a category, in place.
 *
 * The updateCategory action has existed since the dashboard was built, but
 * nothing ever called it — the list was read-only, so the only way to change
 * a name was to empty the category, delete it and start again. That meant
 * re-entering every item to fix a typo.
 */
export function EditCategoryForm({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<CategoryState, FormData>(
    async (prev, formData) => {
      const result = await updateCategory(category.id, prev, formData);
      // Collapse here rather than in an effect: closing is a consequence of
      // the save, not of the state landing. A rejected name keeps the form
      // open so the message has something to sit under.
      if (result?.ok) setOpen(false);
      return result;
    },
    undefined,
  );

  if (!open) {
    return (
      <div className="min-w-0 flex-1 pt-1">
        <p className="truncate font-medium">{category.name}</p>
        <p className="text-xs text-neutral-500">
          {category.itemCount} item{category.itemCount === 1 ? "" : "s"}
          {category.description ? ` · ${category.description}` : ""}
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(true)}
          className="-ml-2 mt-1 h-7 text-xs text-neutral-600"
        >
          Rename
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="min-w-0 flex-1 space-y-3 pt-1">
      <div className="space-y-1.5">
        <Label htmlFor={`name-${category.id}`}>Name</Label>
        <Input
          id={`name-${category.id}`}
          name="name"
          required
          maxLength={80}
          defaultValue={category.name}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`desc-${category.id}`}>Description (optional)</Label>
        <Input
          id={`desc-${category.id}`}
          name="description"
          maxLength={300}
          defaultValue={category.description ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`order-${category.id}`}>Sort order</Label>
        <Input
          id={`order-${category.id}`}
          name="displayOrder"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={category.displayOrder}
          className="w-28"
        />
      </div>

      {/* The action re-slugs from the name, so say so plainly rather than let
          someone wonder why a bookmarked menu link stopped landing. */}
      <p className="text-xs text-neutral-500">
        The items stay where they are. The menu&apos;s link for this section changes to match
        the new name.
      </p>

      {state?.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
