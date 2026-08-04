"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import type { ActionState } from "@/app/actions/menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { rejectionReason, MAX_PHOTO_MB } from "@/lib/image-rules";

type Option = { id: string; name: string };
type TagOption = Option & { kind: string };

export type MenuItemFormValues = {
  name?: string;
  description?: string | null;
  /** Whole shillings, not minor units — this is what the owner types. */
  price?: number;
  categoryId?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
  imageUrl?: string | null;
  tagIds?: string[];
};

export function MenuItemForm({
  action,
  categories,
  tags,
  values,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Option[];
  tags: TagOption[];
  values?: MenuItemFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);
  const [preview, setPreview] = useState<string | null>(values?.imageUrl ?? null);
  const [fileError, setFileError] = useState<string | null>(null);

  const MAX_MB = MAX_PHOTO_MB;

  const dietary = tags.filter((t) => t.kind === "DIETARY");
  const badges = tags.filter((t) => t.kind === "BADGE");

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={values?.name} required maxLength={120} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={values?.description ?? ""}
          rows={3}
          maxLength={600}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price (KES)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            inputMode="decimal"
            min={0}
            step={10}
            defaultValue={values?.price ?? ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayOrder">Sort order</Label>
          <Input
            id="displayOrder"
            name="displayOrder"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={values?.displayOrder ?? 0}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId">Category</Label>
        {/* Native select: works better on a phone than any custom widget. */}
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={values?.categoryId ?? ""}
          required
          className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm"
        >
          <option value="" disabled>
            Choose a category…
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Photo</Label>
        <Input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Reject bad files here, before they can be submitted. The server
            // rejects them too, but only after the whole file has uploaded —
            // and past the body limit the request dies before the action runs,
            // which surfaces as an unexplained error page instead of a message.
            // On a bad file the selection is cleared so there is nothing left
            // to upload, and the red warning below disables Save.
            // `accept` only filters the picker — it is bypassed by choosing
            // "All files", and phones hand over HEIC that sharp cannot read.
            const reason = file ? rejectionReason(file) : null;
            if (reason) {
              setFileError(reason);
              e.target.value = "";
              setPreview(values?.imageUrl ?? null);
              return;
            }
            setFileError(null);
            setPreview(file ? URL.createObjectURL(file) : (values?.imageUrl ?? null));
          }}
        />
        <p className="text-xs text-neutral-500">
          Up to {MAX_MB} MB. Resized and converted to WebP automatically.
          {values?.imageUrl ? " Leave empty to keep the current photo." : ""}
        </p>
        {fileError ? (
          <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{fileError}</p>
            {/* The photo is optional, so the disabled Save below must not trap
                anyone who only wanted to fix the other fields. */}
            <button
              type="button"
              onClick={() => setFileError(null)}
              className="mt-1 underline underline-offset-2"
            >
              Continue without a photo
            </button>
          </div>
        ) : null}

        {preview ? (
          <div className="relative mt-2 aspect-[4/3] w-full max-w-xs overflow-hidden rounded-md bg-neutral-100">
            {preview.startsWith("blob:") ? (
              // Local object URL — next/image can't optimise it.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Selected photo preview" className="h-full w-full object-cover" />
            ) : (
              <Image src={preview} alt="Current photo" fill sizes="320px" className="object-cover" />
            )}
          </div>
        ) : null}
      </div>

      {/* Both sections used to render as a bare heading with nothing beneath
          it when no labels existed, which reads as broken rather than empty.
          One line pointing at where they are made replaces the void. */}
      {tags.length === 0 && (
        <p className="rounded-md border border-dashed border-neutral-300 px-3 py-2.5 text-sm text-neutral-500">
          No badges or dietary labels exist yet. Create them under{" "}
          <a href="/admin/categories" className="text-[#481819] underline underline-offset-2">
            Categories
          </a>
          , then they&apos;ll appear here as tick boxes.
        </p>
      )}

      {badges.length > 0 && (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Badges</legend>
        <div className="flex flex-wrap gap-2">
          {badges.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-neutral-300 px-3 py-1.5 text-sm has-[:checked]:border-[#481819] has-[:checked]:bg-[#481819] has-[:checked]:text-white"
            >
              <input
                type="checkbox"
                name="tagIds"
                value={t.id}
                defaultChecked={values?.tagIds?.includes(t.id)}
                className="sr-only"
              />
              {t.name}
            </label>
          ))}
        </div>
      </fieldset>
      )}

      {dietary.length > 0 && (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Dietary</legend>
        <div className="flex flex-wrap gap-2">
          {dietary.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-neutral-300 px-3 py-1.5 text-sm has-[:checked]:border-green-700 has-[:checked]:bg-green-700 has-[:checked]:text-white"
            >
              <input
                type="checkbox"
                name="tagIds"
                value={t.id}
                defaultChecked={values?.tagIds?.includes(t.id)}
                className="sr-only"
              />
              {t.name}
            </label>
          ))}
        </div>
      </fieldset>
      )}

      <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="isAvailable">Available</Label>
            <p className="text-xs text-neutral-500">Turn off to show &ldquo;Sold out&rdquo;.</p>
          </div>
          <Switch id="isAvailable" name="isAvailable" defaultChecked={values?.isAvailable ?? true} />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-4">
          <div>
            <Label htmlFor="isFeatured">Chef&apos;s Special</Label>
            <p className="text-xs text-neutral-500">Shows on the home page. Only one at a time.</p>
          </div>
          <Switch id="isFeatured" name="isFeatured" defaultChecked={values?.isFeatured ?? false} />
        </div>
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || fileError !== null} className="h-12 w-full text-base">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
