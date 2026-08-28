"use client";

import { useActionState, useState } from "react";
import {
  addHomePanel,
  updateHomePanel,
  deleteHomePanel,
  moveHomePanel,
  type PanelState,
} from "@/app/actions/home-panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { rejectionReason, MAX_PHOTO_MB, MAX_VIDEO_MB } from "@/lib/image-rules";
import { isVideoUrl } from "@/lib/media";

export type EditablePanel = {
  id: string;
  eyebrow: string;
  line: string;
  imageUrl: string | null;
  imageAlt: string | null;
  linkOneLabel: string;
  linkOneHref: string;
  linkTwoLabel: string;
  linkTwoHref: string;
  isVisible: boolean;
};

/**
 * The full-screen panels that slide over one another below the hero.
 *
 * Each panel is one form, saved on its own — the same reasoning as the value
 * cards: one Save for everything means a slip on the third panel throws away
 * edits to the first two.
 *
 * Media here accepts film as well as photographs, because these slots always
 * have. The preview switches to a <video> for one, so the owner can see at a
 * glance which panels are carrying a loop.
 */
export function HomePanelManager({ panels }: { panels: EditablePanel[] }) {
  return (
    <div className="space-y-5">
      {panels.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          No panels — this part of the home page is hidden until you add one.
        </p>
      ) : (
        <ul className="space-y-4">
          {panels.map((panel, i) => (
            <li key={panel.id}>
              <PanelEditor panel={panel} index={i} total={panels.length} />
            </li>
          ))}
        </ul>
      )}

      <AddPanelForm key={panels.length} />
    </div>
  );
}

function MediaField({
  id,
  currentUrl,
  onError,
  hint,
}: {
  id: string;
  currentUrl?: string | null;
  onError: (message: string | null) => void;
  hint: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [previewIsVideo, setPreviewIsVideo] = useState(false);

  const shown = preview ?? currentUrl ?? null;
  const showingVideo = preview ? previewIsVideo : isVideoUrl(currentUrl);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Background photo or film</Label>
      <div className="flex items-start gap-3">
        {shown &&
          (showingVideo ? (
            <video
              key={shown}
              src={shown}
              muted
              loop
              playsInline
              controls
              className="aspect-video w-32 shrink-0 rounded-md bg-neutral-900 object-cover"
            />
          ) : (
            <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shown} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        <div className="min-w-0 flex-1 space-y-1">
          <input
            id={id}
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm hover:file:bg-neutral-200"
            onChange={(e) => {
              const file = e.target.files?.[0];
              onError(null);
              setPreview(null);
              if (!file) return;
              // "media" applies the right limit for whichever kind arrived —
              // 12 MB for a photograph is right and absurd for a film.
              const reason = rejectionReason(file, "media");
              if (reason) {
                onError(reason);
                e.target.value = "";
                return;
              }
              setPreviewIsVideo(file.type.startsWith("video/"));
              setPreview(URL.createObjectURL(file));
            }}
          />
          <p className="text-xs text-neutral-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function LinkFields({
  idPrefix,
  values,
}: {
  idPrefix: string;
  values?: {
    linkOneLabel: string;
    linkOneHref: string;
    linkTwoLabel: string;
    linkTwoHref: string;
  };
}) {
  return (
    <fieldset className="space-y-3 rounded-md border border-neutral-200 p-3">
      <legend className="px-1 text-xs font-medium text-neutral-600">Buttons (optional)</legend>
      <p className="text-xs text-neutral-500">
        Both boxes must be filled in for a button to appear. Use a path like{" "}
        <code className="rounded bg-neutral-100 px-1">/menu</code> for a page on this site.
      </p>
      {(["One", "Two"] as const).map((n) => (
        <div key={n} className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-link${n}Label`} className="text-xs">
              Button {n === "One" ? "1" : "2"} text
            </Label>
            <Input
              id={`${idPrefix}-link${n}Label`}
              name={`link${n}Label`}
              defaultValue={values?.[`link${n}Label` as const] ?? ""}
              maxLength={40}
              placeholder={n === "One" ? "See the menu" : "Plan your visit"}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-link${n}Href`} className="text-xs">
              Button {n === "One" ? "1" : "2"} link
            </Label>
            <Input
              id={`${idPrefix}-link${n}Href`}
              name={`link${n}Href`}
              defaultValue={values?.[`link${n}Href` as const] ?? ""}
              maxLength={200}
              placeholder={n === "One" ? "/menu" : "/visit"}
            />
          </div>
        </div>
      ))}
    </fieldset>
  );
}

function Feedback({ state, fileError }: { state: PanelState; fileError: string | null }) {
  return (
    <>
      {fileError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {fileError}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">{state.message}</p>
      )}
      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      )}
    </>
  );
}

const MEDIA_HINT = `Landscape works best. Photo up to ${MAX_PHOTO_MB} MB, or an MP4/WebM film up to ${MAX_VIDEO_MB} MB. A film plays silently on a loop.`;

function PanelEditor({
  panel,
  index,
  total,
}: {
  panel: EditablePanel;
  index: number;
  total: number;
}) {
  const [state, formAction, pending] = useActionState<PanelState, FormData>(
    updateHomePanel,
    undefined,
  );
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.14em] text-neutral-400">
          Panel {index + 1}
          {!panel.isVisible && " · hidden"}
        </span>
        <div className="flex items-center gap-1">
          <form action={moveHomePanel}>
            <input type="hidden" name="id" value={panel.id} />
            <input type="hidden" name="direction" value="up" />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              disabled={index === 0}
              aria-label="Move panel earlier"
            >
              ↑
            </Button>
          </form>
          <form action={moveHomePanel}>
            <input type="hidden" name="id" value={panel.id} />
            <input type="hidden" name="direction" value="down" />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              disabled={index === total - 1}
              aria-label="Move panel later"
            >
              ↓
            </Button>
          </form>
          <form
            action={deleteHomePanel}
            onSubmit={(e) => {
              if (!confirm("Delete this panel? This cannot be undone.")) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={panel.id} />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
          </form>
        </div>
      </div>

      <form
        action={formAction}
        onSubmit={(e) => {
          const input = e.currentTarget.elements.namedItem("photo") as HTMLInputElement | null;
          const file = input?.files?.[0];
          const reason = file ? rejectionReason(file, "media") : null;
          if (reason) {
            e.preventDefault();
            setFileError(reason);
          }
        }}
        className="space-y-3"
      >
        <input type="hidden" name="id" value={panel.id} />

        <div className="space-y-2">
          <Label htmlFor={`eyebrow-${panel.id}`}>Small label above the sentence</Label>
          <Input
            id={`eyebrow-${panel.id}`}
            name="eyebrow"
            defaultValue={panel.eyebrow}
            maxLength={60}
            placeholder="Usually empty"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`line-${panel.id}`}>Sentence</Label>
          <Textarea
            id={`line-${panel.id}`}
            name="line"
            defaultValue={panel.line}
            required
            rows={2}
            maxLength={160}
            placeholder="e.g. One room. One idea."
          />
          <p className="text-xs text-neutral-500">
            Set very large across the whole screen. Short reads best — a sentence, not a paragraph.
          </p>
        </div>

        <MediaField id={`photo-${panel.id}`} currentUrl={panel.imageUrl} onError={setFileError} hint={`${MEDIA_HINT} Leave empty to keep the current one.`} />

        <div className="space-y-2">
          <Label htmlFor={`alt-${panel.id}`}>Photo description</Label>
          <Input
            id={`alt-${panel.id}`}
            name="alt"
            defaultValue={panel.imageAlt ?? ""}
            maxLength={160}
            placeholder="What the photo shows"
          />
        </div>

        <LinkFields idPrefix={panel.id} values={panel} />

        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            name="isVisible"
            defaultChecked={panel.isVisible}
            className="h-4 w-4 accent-[#481819]"
          />
          Show this panel on the website
        </label>

        <Feedback state={state} fileError={fileError} />

        <Button type="submit" size="sm" disabled={pending || fileError !== null}>
          {pending ? "Saving…" : "Save panel"}
        </Button>
      </form>
    </div>
  );
}

function AddPanelForm() {
  const [state, formAction, pending] = useActionState<PanelState, FormData>(
    addHomePanel,
    undefined,
  );
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const input = e.currentTarget.elements.namedItem("photo") as HTMLInputElement | null;
        const file = input?.files?.[0];
        const reason = file ? rejectionReason(file, "media") : null;
        if (reason) {
          e.preventDefault();
          setFileError(reason);
        }
      }}
      className="space-y-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4"
    >
      <h3 className="text-sm font-medium">Add a panel</h3>

      <div className="space-y-2">
        <Label htmlFor="new-panel-eyebrow">Small label above the sentence</Label>
        <Input id="new-panel-eyebrow" name="eyebrow" maxLength={60} placeholder="Usually empty" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-panel-line">Sentence</Label>
        <Textarea
          id="new-panel-line"
          name="line"
          required
          rows={2}
          maxLength={160}
          placeholder="e.g. The things worth eating can’t be hurried."
        />
      </div>

      <MediaField id="new-panel-photo" onError={setFileError} hint={MEDIA_HINT} />

      <div className="space-y-2">
        <Label htmlFor="new-panel-alt">Photo description</Label>
        <Input id="new-panel-alt" name="alt" maxLength={160} placeholder="What the photo shows" />
      </div>

      <LinkFields idPrefix="new-panel" />

      <Feedback state={state} fileError={fileError} />

      <Button type="submit" disabled={pending || fileError !== null}>
        {pending ? "Adding…" : "Add panel"}
      </Button>
    </form>
  );
}
