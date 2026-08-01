"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCategory, type CategoryState } from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewCategoryForm() {
  const [state, formAction, pending] = useActionState<CategoryState, FormData>(
    createCategory,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful add so the owner can enter another.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="cat-name">Name</Label>
        <Input id="cat-name" name="name" required maxLength={80} placeholder="e.g. Smoothies" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cat-desc">Description (optional)</Label>
        <Input id="cat-desc" name="description" maxLength={300} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cat-order">Sort order</Label>
        <Input id="cat-order" name="displayOrder" type="number" inputMode="numeric" min={0} defaultValue={0} />
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Adding…" : "Add category"}
      </Button>
    </form>
  );
}
