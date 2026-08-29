"use client";

import { useActionState, useState } from "react";
import { updateHeroVideo, type PhotoState } from "@/app/actions/site-photos";
import { Button } from "@/components/ui/button";
import { rejectionReason, MAX_VIDEO_MB } from "@/lib/image-rules";

/**
 * The looping film near the foot of the home page.
 *
 * Deliberately a sibling of PhotoSlot rather than a mode of it: the guidance,
 * the preview and the accepted types all differ, and folding a third kind into
 * that component would mean three branches in every line of it.
 *
 * A still photograph sits under the film — it is the poster frame while the
 * video loads, the fallback when a browser blocks autoplay, and what a visitor
 * on Reduce Motion or Save-Data sees instead. Removing the video removes the
 * whole section, so there is never a stranded still.
 */
export function HeroVideoSlot({ current }: { current: string | null }) {
  // The action's own result lives out here so it survives the remount below —
  // otherwise "Video removed" would flash away the instant it was true.
  const [state, formAction, pending] = useActionState<PhotoState, FormData>(
    updateHeroVideo,
    undefined,
  );

  /**
   * Keyed on what is currently stored, which strands nobody.
   *
   * The form below keeps three pieces of state the server knows nothing
   * about — the chosen file's preview, a validation message, and whether the
   * "remove" box is ticked. A successful save changes `current` (a removal
   * nulls it; an upload mints a new filename), and without a remount those
   * three carried over into a page describing something that no longer
   * existed.
   *
   * Removing the film was a dead end because of it. The box was ticked, the
   * film was deleted, `current` became null — and the tickbox only renders
   * while there is something to remove, so it vanished still ticked. Its
   * `remove` state stayed true, which disabled the file input, so the owner
   * could neither untick it nor choose a video; and with no checkbox in the
   * DOM the next Save posted no "remove" field at all, so the action looked
   * for a file, found none, and answered "Choose a video first." Nothing but
   * a page refresh got out of it.
   *
   * Remounting on `current` is the same trick PhotoGallery uses on its add
   * form, and for the same reason: it resets that state without an effect
   * reaching in to do it.
   */
  return (
    <HeroVideoForm
      key={current ?? "empty"}
      current={current}
      state={state}
      formAction={formAction}
      pending={pending}
    />
  );
}

function HeroVideoForm({
  current,
  state,
  formAction,
  pending,
}: {
  current: string | null;
  state: PhotoState;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-medium">Film</h3>
      <p className="mt-1 text-xs text-neutral-500">
        A short loop, full width, near the foot of the home page. Plays silently
        and repeats, so a few seconds is plenty. Remove it and that section
        disappears entirely.
      </p>

      <form
        action={formAction}
        // The real gate — runs even if the change handler below never did.
        onSubmit={(e) => {
          if (remove) return; // removing the section needs no file
          const input = e.currentTarget.elements.namedItem(
            "video",
          ) as HTMLInputElement | null;
          const file = input?.files?.[0];
          const reason = file
            ? rejectionReason(file, "video")
            : "Choose a video first.";
          if (reason) {
            e.preventDefault();
            setError(reason);
            setPreview(current);
          }
        }}
        className="mt-4 space-y-3"
      >
        {preview && !remove ? (
          <video
            key={preview}
            src={preview}
            muted
            loop
            playsInline
            controls
            className="aspect-[16/9] w-full rounded-md bg-neutral-900 object-cover"
          />
        ) : (
          <div className="grid aspect-[16/9] w-full place-items-center rounded-md border border-dashed border-neutral-300 bg-neutral-50">
            <span className="text-xs text-neutral-400">
              {remove
                ? "Section will be hidden"
                : "No video — the section is hidden"}
            </span>
          </div>
        )}

        <input
          type="file"
          name="video"
          accept="video/mp4,video/webm"
          disabled={remove}
          onChange={(e) => {
            const file = e.target.files?.[0];
            setError(null);
            if (!file) {
              setPreview(current);
              return;
            }
            // Early feedback before the upload starts. The file MUST be cleared
            // on rejection — see the note in PhotoSlot: an oversized file left
            // attached kills the request mid-stream and the owner gets a server
            // error instead of the warning sitting right here.
            const reason = rejectionReason(file, "video");
            if (reason) {
              setError(reason);
              e.target.value = "";
              setPreview(current);
              return;
            }
            setPreview(URL.createObjectURL(file));
          }}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm disabled:opacity-50"
        />

        <p className="text-xs text-neutral-400">
          MP4 or WebM, up to {MAX_VIDEO_MB} MB. A phone&apos;s .mov needs
          converting first. Keep it small — everyone visiting on mobile data
          downloads it.
        </p>

        {current && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              name="remove"
              checked={remove}
              onChange={(e) => {
                setRemove(e.target.checked);
                setError(null);
              }}
              className="h-4 w-4 accent-[#481819]"
            />
            Remove and hide the section
          </label>
        )}

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
        {state?.ok && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">
            {state.message}
          </p>
        )}
        {state && !state.ok && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {state.error}
          </p>
        )}

        <Button type="submit" size="sm" disabled={pending || error !== null}>
          {pending ? "Uploading…" : "Save"}
        </Button>
      </form>
    </div>
  );
}
