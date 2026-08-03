"use client";

import { useActionState, useState } from "react";
import { updateCategoryImage, type CategoryPhotoState } from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import { rejectionReason, MAX_PHOTO_MB } from "@/lib/image-rules";

/**
 * The marketing photo on a category row. Optional — with none set the home
 * page keeps borrowing a photo from one of the category's items.
 *
 * Collapsed to a thumbnail until clicked so the categories list stays a list.
 */
export function CategoryPhoto({
  id,
  name,
  current,
}: {
  id: string;
  name: string;
  current: string | null;
}) {
  const [state, formAction, pending] = useActionState<CategoryPhotoState, FormData>(
    updateCategoryImage,
    undefined,
  );
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(current);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={current ? `Change the photo for ${name}` : `Add a photo for ${name}`}
        className="grid h-12 w-12 place-items-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 transition hover:border-neutral-400"
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg leading-none text-neutral-400">+</span>
        )}
      </button>

      {open && (
        <form
          action={formAction}
          // The real gate — runs even if the change handler below never did.
          onSubmit={(e) => {
            if ((e.currentTarget.elements.namedItem("remove") as HTMLInputElement | null)?.checked) return;
            const input = e.currentTarget.elements.namedItem("photo") as HTMLInputElement | null;
            const file = input?.files?.[0];
            const reason = file ? rejectionReason(file) : "Choose a photo first.";
            if (reason) {
              e.preventDefault();
              setError(reason);
              setPreview(current);
            }
          }}
          className="mt-2 w-64 space-y-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"
        >
          <input type="hidden" name="id" value={id} />

          <div className="aspect-[4/3] w-full overflow-hidden rounded-md bg-neutral-100">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-xs text-neutral-400">
                No photo — an item photo is used
              </div>
            )}
          </div>

          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setError(null);
              if (!file) {
                setPreview(current);
                return;
              }
              // Rejected files are dropped so there is nothing left to upload,
              // and the red message below disables Save until it is resolved.
              const reason = rejectionReason(file);
              if (reason) {
                setError(reason);
                e.target.value = "";
                setPreview(current);
                return;
              }
              setPreview(URL.createObjectURL(file));
            }}
            className="block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-neutral-100 file:px-2 file:py-1.5 file:text-xs"
          />
          <p className="text-[0.7rem] text-neutral-500">JPG, PNG or WebP · up to {MAX_PHOTO_MB} MB.</p>

          {current && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-600">
              {/* Clearing the error too, so a rejected file can't leave Save
                  disabled with no way to just remove the photo instead. */}
              <input type="checkbox" name="remove" onChange={() => setError(null)} className="h-3.5 w-3.5 accent-[#481819]" />
              Remove this photo
            </label>
          )}

          {error && <p role="alert" className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</p>}
          {state?.ok && <p className="rounded-md bg-green-50 px-2 py-1.5 text-xs text-green-800">{state.message}</p>}
          {state && !state.ok && (
            <p role="alert" className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">{state.error}</p>
          )}

          {/* Disabled only while a red message above says why — never silently. */}
          <Button type="submit" size="sm" disabled={pending || error !== null} className="w-full">
            {pending ? "Saving…" : "Save photo"}
          </Button>
        </form>
      )}
    </div>
  );
}
