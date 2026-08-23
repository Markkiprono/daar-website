"use client";

import { useActionState, useState } from "react";
import { updateHeroVideo, type PhotoState } from "@/app/actions/site-photos";
import { Button } from "@/components/ui/button";
import { rejectionReason, MAX_VIDEO_MB } from "@/lib/image-rules";

/**
 * The looping film behind the hero.
 *
 * Deliberately a sibling of PhotoSlot rather than a mode of it: the guidance,
 * the preview and the accepted types all differ, and folding a third kind into
 * that component would mean three branches in every line of it.
 *
 * The hero photo is never replaced by this. It is the poster frame while the
 * video loads, the fallback when a browser blocks autoplay, and what a visitor
 * on Reduce Motion sees instead — so removing the video is always safe.
 */
export function HeroVideoSlot({ current }: { current: string | null }) {
  const [state, formAction, pending] = useActionState<PhotoState, FormData>(
    updateHeroVideo,
    undefined,
  );
  const [preview, setPreview] = useState<string | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-medium">Hero video</h3>
      <p className="mt-1 text-xs text-neutral-500">
        A short loop behind the headline on the home page. Plays silently and repeats, so a few
        seconds is plenty — the hero photo above stays as the still frame underneath it.
      </p>

      <form
        action={formAction}
        // The real gate — runs even if the change handler below never did.
        onSubmit={(e) => {
          if (remove) return; // going back to the photo needs no file
          const input = e.currentTarget.elements.namedItem("video") as HTMLInputElement | null;
          const file = input?.files?.[0];
          const reason = file ? rejectionReason(file, "video") : "Choose a video first.";
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
              {remove ? "Will use the hero photo" : "No video — the hero photo is used"}
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
          MP4 or WebM, up to {MAX_VIDEO_MB} MB. A phone&apos;s .mov needs converting first. Keep it
          small — everyone visiting on mobile data downloads it.
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
            Remove and use the hero photo
          </label>
        )}

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        {state?.ok && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">{state.message}</p>
        )}
        {state && !state.ok && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
        )}

        <Button type="submit" size="sm" disabled={pending || error !== null}>
          {pending ? "Uploading…" : "Save"}
        </Button>
      </form>
    </div>
  );
}
