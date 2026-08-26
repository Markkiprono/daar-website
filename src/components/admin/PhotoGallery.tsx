"use client";

import { useActionState, useState } from "react";
import { addStoryPhoto, deleteStoryPhoto, moveStoryPhoto, type PhotoState } from "@/app/actions/site-photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rejectionReason, MAX_PHOTO_MB } from "@/lib/image-rules";

type Photo = { id: string; imageUrl: string; imageAlt: string | null };

const MAX_MB = MAX_PHOTO_MB;

export function StoryGallery({ photos }: { photos: Photo[] }) {
  const [state, formAction, pending] = useActionState<PhotoState, FormData>(addStoryPhoto, undefined);

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

      {/* Keyed on the gallery contents: a successful add changes it, React
          remounts this subtree, and the picked file, preview and any message
          clear themselves. Resetting that state in an effect instead is what
          the react-hooks/set-state-in-effect rule warns about. */}
      <AddPhotoForm key={photos.length} formAction={formAction} pending={pending} state={state} />
    </div>
  );
}

function AddPhotoForm({
  formAction,
  pending,
  state,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  state: PhotoState;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <>
      <form
        action={formAction}
        // The real gate. The change handler below is a convenience that gives
        // early feedback; this runs no matter what, so a bad file can never be
        // submitted even if that handler never fired.
        onSubmit={(e) => {
          const input = e.currentTarget.elements.namedItem("photo") as HTMLInputElement | null;
          const file = input?.files?.[0];
          const reason = file ? rejectionReason(file) : "Choose a photo first.";
          if (reason) {
            e.preventDefault();
            setFileError(reason);
            setPreview(null);
          }
        }}
        className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <h3 className="text-sm font-medium">Add a photo</h3>

        {preview && (
          <div className="relative aspect-[3/4] w-full max-w-[160px] overflow-hidden rounded-md bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="gallery-photo">Image</Label>
          {/* A raw <input type="file"> rather than the shadcn <Input>, whose
              file:* styling is tuned for the short controls elsewhere on this
              form. (An earlier note here claimed the Base UI primitive behind
              <Input> swallows a file input's onChange — it does not; the
              handler is chained through. Either element works.) */}
          <input
            id="gallery-photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            required
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm hover:file:bg-neutral-200"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setFileError(null);
              setPreview(null);
              if (!file) return;

              // Early feedback before the upload is attempted, so an oversized
              // file never reaches the server, where it blows the request body
              // limit and produces an error page instead of a message.
              const reason = rejectionReason(file);
              if (reason) {
                setFileError(reason);
                e.target.value = "";
                return;
              }
              setPreview(URL.createObjectURL(file));
            }}
          />
          <p className="text-xs text-neutral-500">JPG, PNG or WebP · up to {MAX_MB} MB.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gallery-alt">Description (optional)</Label>
          <Input id="gallery-alt" name="alt" maxLength={120} placeholder="e.g. The counter at Daar" />
        </div>

        {/* The red error is the reason the button is disabled. The button is
            never disabled without one of these on screen — a greyed-out button
            with no explanation is indistinguishable from a broken page. */}
        {fileError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {fileError}
          </p>
        )}
        {state?.ok && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{state.message}</p>}
        {state && !state.ok && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

        <Button type="submit" disabled={pending || fileError !== null}>
          {pending ? "Uploading…" : "Add to gallery"}
        </Button>
      </form>
    </>
  );
}
