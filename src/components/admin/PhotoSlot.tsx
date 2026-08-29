"use client";

import { useActionState, useState } from "react";
import { updateSitePhoto, updateFavicon, type PhotoState } from "@/app/actions/site-photos";
import { Button } from "@/components/ui/button";
import { rejectionReason, isVideoFile, MAX_VIDEO_MB } from "@/lib/image-rules";
import { isVideoUrl } from "@/lib/media";

/**
 * A single replaceable site photo (hero, story, visit) or the favicon.
 * Preview the current image, choose a new one, or remove it to restore the
 * built-in default.
 *
 * With `allowVideo` the same box also takes a short film, because the owner
 * thinks of it as "the picture in that section" and should not have to know
 * which sections were built to hold moving pictures. Whichever kind is
 * uploaded lands in the same column; the site reads back which one it got
 * from the file extension.
 */
export function PhotoSlot({
  slot,
  title,
  description,
  current,
  aspect = "aspect-[16/9]",
  favicon = false,
  allowVideo = false,
}: {
  slot: string;
  title: string;
  description: string;
  current: string | null;
  aspect?: string;
  favicon?: boolean;
  allowVideo?: boolean;
}) {
  const action = favicon ? updateFavicon : updateSitePhoto;
  // Held out here so the result survives the remount below, rather than
  // flashing away the moment the save it describes succeeds.
  const [state, formAction, pending] = useActionState<PhotoState, FormData>(action, undefined);

  /**
   * Keyed on what is currently stored — see the long note in HeroVideoSlot.
   *
   * The same dead end lived here. Tick "remove", save, and the stored URL
   * becomes null; the tickbox only renders while there is something to
   * remove, so it disappeared while its state stayed ticked, which left the
   * file input disabled and posted no "remove" field on the next attempt.
   * The slot could not be used again until the page was reloaded.
   */
  return (
    <PhotoSlotForm
      key={current ?? "empty"}
      slot={slot}
      title={title}
      description={description}
      current={current}
      aspect={aspect}
      favicon={favicon}
      allowVideo={allowVideo}
      state={state}
      formAction={formAction}
      pending={pending}
    />
  );
}

function PhotoSlotForm({
  slot,
  title,
  description,
  current,
  aspect,
  favicon,
  allowVideo,
  state,
  formAction,
  pending,
}: {
  slot: string;
  title: string;
  description: string;
  current: string | null;
  aspect: string;
  favicon: boolean;
  allowVideo: boolean;
  state: PhotoState;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  /* Tracked rather than derived from the preview URL: a freshly chosen file
     previews as a blob: URL, which carries no extension to read. */
  const [previewIsVideo, setPreviewIsVideo] = useState(isVideoUrl(current));

  const kind = favicon ? "favicon" : allowVideo ? "media" : "photo";
  const noun = allowVideo ? "photo or video" : "photo";

  const accept = favicon
    ? "image/png,image/svg+xml,image/x-icon,.ico"
    : allowVideo
      ? "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
      : "image/jpeg,image/png,image/webp,image/avif";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-xs text-neutral-500">{description}</p>
      {allowVideo && (
        <p className="mt-1 text-xs text-neutral-400">
          A photo, or an MP4/WebM of a few seconds (up to {MAX_VIDEO_MB} MB). Film plays silently
          and repeats, and the built-in photo shows underneath while it loads.
        </p>
      )}

      <form
        action={formAction}
        // The real gate — runs even if the change handler below never did.
        onSubmit={(e) => {
          if (remove) return; // restoring the default needs no file
          const input = e.currentTarget.elements.namedItem("photo") as HTMLInputElement | null;
          const file = input?.files?.[0];
          const reason = file
            ? rejectionReason(file, kind)
            : `Choose ${favicon ? "an icon" : `a ${noun}`} first.`;
          if (reason) {
            e.preventDefault();
            setError(reason);
            setPreview(current);
          }
        }}
        className="mt-4 space-y-3"
      >
        <input type="hidden" name="slot" value={slot} />

        {preview && !remove ? (
          <div className={`relative w-full overflow-hidden rounded-md bg-neutral-100 ${favicon ? "aspect-square max-w-[96px]" : aspect}`}>
            {previewIsVideo ? (
              // Muted and looping so the preview behaves like the page does,
              // and controls so the owner can actually check what they picked.
              <video
                src={preview}
                muted
                loop
                autoPlay
                playsInline
                controls
                className="h-full w-full object-cover"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={preview} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        ) : (
          <div className={`grid w-full place-items-center rounded-md border border-dashed border-neutral-300 bg-neutral-50 ${favicon ? "aspect-square max-w-[96px]" : aspect}`}>
            <span className="text-xs text-neutral-400">
              {remove ? "Will use default" : `No custom ${favicon ? "icon" : noun}`}
            </span>
          </div>
        )}

        <input
          type="file"
          name="photo"
          accept={accept}
          disabled={remove}
          onChange={(e) => {
            const file = e.target.files?.[0];
            setError(null);
            if (!file) {
              setPreview(current);
              setPreviewIsVideo(isVideoUrl(current));
              return;
            }
            // Early feedback before the upload is attempted. The file MUST be
            // cleared on rejection: leaving it attached let Save submit it
            // anyway, and a file past the proxy's body limit killed the request
            // mid-form — the owner got a server error page instead of the
            // warning that was sitting right there.
            const reason = rejectionReason(file, kind);
            if (reason) {
              setError(reason);
              e.target.value = "";
              setPreview(current);
              setPreviewIsVideo(isVideoUrl(current));
              return;
            }
            setPreviewIsVideo(isVideoFile(file));
            setPreview(URL.createObjectURL(file));
          }}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm disabled:opacity-50"
        />

        {current && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              name="remove"
              checked={remove}
              // Clearing the error too: a rejected file otherwise leaves Save
              // disabled with no way to fall back to the default photo.
              onChange={(e) => {
                setRemove(e.target.checked);
                setError(null);
              }}
              className="h-4 w-4 accent-[#481819]"
            />
            Remove and use the default
          </label>
        )}

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        {state?.ok && <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">{state.message}</p>}
        {state && !state.ok && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>}

        {/* Disabled only while a red message above says why — never silently. */}
        <Button type="submit" size="sm" disabled={pending || error !== null}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
    </div>
  );
}
