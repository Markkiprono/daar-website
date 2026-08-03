"use client";

import { useActionState, useRef, useEffect } from "react";
import { addStoryPhoto, deleteStoryPhoto, moveStoryPhoto, type PhotoState } from "@/app/actions/site-photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Photo = { id: string; imageUrl: string; imageAlt: string | null };

export function StoryGallery({ photos }: { photos: Photo[] }) {
  const [state, formAction, pending] = useActionState<PhotoState, FormData>(addStoryPhoto, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  return (
    <div className="space-y-5">
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-md border border-neutral-200 bg-white">
              <div className="relative aspect-[3/4] bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={p.imageAlt ?? ""} className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                <div className="flex gap-1">
                  <form action={moveStoryPhoto}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="direction" value="up" />
                    <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={i === 0} aria-label="Move up">↑</Button>
                  </form>
                  <form action={moveStoryPhoto}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="direction" value="down" />
                    <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={i === photos.length - 1} aria-label="Move down">↓</Button>
                  </form>
                </div>
                <form
                  action={deleteStoryPhoto}
                  onSubmit={(e) => {
                    if (!confirm("Remove this photo from the gallery?")) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={p.id} />
                  <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600 hover:bg-red-50">Delete</Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          No gallery photos yet — the Story page uses default brand images until you add some.
        </p>
      )}

      <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="text-sm font-medium">Add a photo</h3>
        <div className="space-y-2">
          <Label htmlFor="gallery-photo">Image</Label>
          <Input id="gallery-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gallery-alt">Description (optional)</Label>
          <Input id="gallery-alt" name="alt" maxLength={120} placeholder="e.g. The counter at Daar" />
        </div>
        {state?.ok && <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">{state.message}</p>}
        {state && !state.ok && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>}
        <Button type="submit" disabled={pending}>{pending ? "Uploading…" : "Add to gallery"}</Button>
      </form>
    </div>
  );
}
