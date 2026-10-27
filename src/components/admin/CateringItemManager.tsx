"use client";

import { useActionState, useState } from "react";
import {
  addCateringItem,
  updateCateringItem,
  deleteCateringItem,
  moveCateringItem,
  type CateringState,
} from "@/app/actions/catering";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { rejectionReason, MAX_PHOTO_MB } from "@/lib/image-rules";
import type { CateringSection } from "@/lib/catering-shared";

export type EditableCateringItem = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  details: string;
  imageUrl: string | null;
  imageAlt: string | null;
  highlight: boolean;
  isVisible: boolean;
};

/** Which fields a list shows, and what to call one of its entries. */
export type ItemShape = {
  noun: string;
  eyebrow?: boolean;
  details?: boolean;
  photo?: boolean;
  highlight?: boolean;
};

/**
 * A list on the For Business page — the corporate cards, the tasting steps, the
 * supermarket reasons or the label options. Each entry saves on its own.
 */
export function CateringItemManager({
  section,
  shape,
  items,
}: {
  section: CateringSection;
  shape: ItemShape;
  items: EditableCateringItem[];
}) {
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          Nothing here yet — this part is hidden on the website until you add one.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li key={item.id}>
              <ItemEditor section={section} shape={shape} item={item} index={i} total={items.length} />
            </li>
          ))}
        </ul>
      )}
      <ItemForm key={items.length} section={section} shape={shape} />
    </div>
  );
}

function Fields({
  prefix,
  shape,
  item,
  onFileError,
}: {
  prefix: string;
  shape: ItemShape;
  item?: EditableCateringItem;
  onFileError: (m: string | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <>
      {shape.eyebrow && (
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-eyebrow`}>Small label</Label>
          <Input
            id={`${prefix}-eyebrow`}
            name="eyebrow"
            defaultValue={item?.eyebrow ?? ""}
            maxLength={40}
            placeholder="e.g. Option A"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-title`}>Heading</Label>
        <Input id={`${prefix}-title`} name="title" defaultValue={item?.title ?? ""} required maxLength={90} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-body`}>Comment</Label>
        <Textarea id={`${prefix}-body`} name="body" defaultValue={item?.body ?? ""} rows={3} maxLength={600} />
      </div>
      {shape.details && (
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-details`}>What&apos;s included</Label>
          <Textarea
            id={`${prefix}-details`}
            name="details"
            defaultValue={item?.details ?? ""}
            rows={3}
            maxLength={600}
            placeholder={"One per line, e.g.\nBreakfast meetings and working lunches"}
          />
          <p className="text-xs text-neutral-500">
            Each line becomes a bullet.
          </p>
        </div>
      )}
      {shape.photo && (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-photo`}>Photo</Label>
            <div className="flex items-start gap-3">
              {(preview || item?.imageUrl) && (
                <div className="aspect-[16/10] w-28 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview ?? item!.imageUrl!} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <input
                  id={`${prefix}-photo`}
                  name="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm hover:file:bg-neutral-200"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    onFileError(null);
                    setPreview(null);
                    if (!file) return;
                    const reason = rejectionReason(file);
                    if (reason) {
                      onFileError(reason);
                      e.target.value = "";
                      return;
                    }
                    setPreview(URL.createObjectURL(file));
                  }}
                />
                <p className="text-xs text-neutral-500">
                  Landscape photos work best · up to {MAX_PHOTO_MB} MB.
                  {item ? " Leave empty to keep the current one." : ""}
                </p>
                {item?.imageUrl && (
                  <label className="flex items-center gap-2 text-xs text-neutral-600">
                    <input type="checkbox" name="removePhoto" className="h-4 w-4 accent-[#481819]" />
                    Remove the photo
                  </label>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-alt`}>Photo description</Label>
            <Input
              id={`${prefix}-alt`}
              name="alt"
              defaultValue={item?.imageAlt ?? ""}
              maxLength={160}
              placeholder="What the photo shows, for visitors who can't see it"
            />
          </div>
        </>
      )}
      {shape.highlight && (
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            name="highlight"
            defaultChecked={item?.highlight ?? false}
            className="h-4 w-4 accent-[#481819]"
          />
          Gold border (the one you recommend)
        </label>
      )}
    </>
  );
}

function Messages({ state, fileError }: { state: CateringState; fileError: string | null }) {
  return (
    <>
      {fileError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{fileError}</p>}
      {state?.ok && <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">{state.message}</p>}
      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}
    </>
  );
}

function ItemEditor({
  section,
  shape,
  item,
  index,
  total,
}: {
  section: CateringSection;
  shape: ItemShape;
  item: EditableCateringItem;
  index: number;
  total: number;
}) {
  const [state, formAction, pending] = useActionState<CateringState, FormData>(updateCateringItem, undefined);
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.14em] text-neutral-400">
          {shape.noun} {index + 1}
          {!item.isVisible && " · hidden"}
        </span>
        <div className="flex items-center gap-1">
          {(["up", "down"] as const).map((dir) => (
            <form key={dir} action={moveCateringItem}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="direction" value={dir} />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                disabled={dir === "up" ? index === 0 : index === total - 1}
                aria-label={`Move ${item.title} ${dir === "up" ? "earlier" : "later"}`}
              >
                {dir === "up" ? "↑" : "↓"}
              </Button>
            </form>
          ))}
          <form
            action={deleteCateringItem}
            onSubmit={(e) => {
              if (!confirm(`Delete “${item.title}”? This cannot be undone.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={item.id} />
            <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600 hover:bg-red-50">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="section" value={section} />
        <Fields prefix={`ci-${item.id}`} shape={shape} item={item} onFileError={setFileError} />
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" name="isVisible" defaultChecked={item.isVisible} className="h-4 w-4 accent-[#481819]" />
          Show on the website
        </label>
        <Messages state={state} fileError={fileError} />
        <Button type="submit" size="sm" disabled={pending || fileError !== null}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
    </div>
  );
}

function ItemForm({ section, shape }: { section: CateringSection; shape: ItemShape }) {
  const [state, formAction, pending] = useActionState<CateringState, FormData>(addCateringItem, undefined);
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4"
    >
      <h3 className="text-sm font-medium">Add a {shape.noun.toLowerCase()}</h3>
      <input type="hidden" name="section" value={section} />
      <Fields prefix={`ci-new-${section}`} shape={shape} onFileError={setFileError} />
      <Messages state={state} fileError={fileError} />
      <Button type="submit" disabled={pending || fileError !== null}>
        {pending ? "Adding…" : `Add ${shape.noun.toLowerCase()}`}
      </Button>
    </form>
  );
}
