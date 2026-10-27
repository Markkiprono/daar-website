"use client";

import { useActionState, useState } from "react";
import { updateCateringPage, type CateringState } from "@/app/actions/catering";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { HEADING_SIZE_OPTIONS, CARD_SIZE_OPTIONS, type SizeOption } from "@/lib/home-sections";
import { rejectionReason, MAX_PHOTO_MB } from "@/lib/image-rules";

export type CateringField = {
  name: string;
  label: string;
  kind: "input" | "textarea" | "switch";
  value: string | boolean;
  max?: number;
  hint?: string;
  placeholder?: string;
};

const selectClass = "h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm";

function SizeSelect({
  name,
  label,
  options,
  value,
}: {
  name: string;
  label: string;
  options: SizeOption<string>[];
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`cat-${name}`}>{label}</Label>
      <select id={`cat-${name}`} name={name} defaultValue={value} className={selectClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-neutral-500">
        {options.map((o) => `${o.label} — ${o.hint}`).join("  ·  ")}
      </p>
    </div>
  );
}

/**
 * One group of the Catering page's wording, saved on its own.
 * `photo` adds a photo slot; `sizes` adds the heading and card size controls;
 * `catalogue` adds the downloadable PDF.
 */
export function CateringSectionForm({
  group,
  fields,
  photo,
  sizes,
  catalogue,
  saveLabel = "Save",
}: {
  group: string;
  fields: CateringField[];
  photo?: { currentUrl: string | null; label: string; hint?: string; removeLabel?: string };
  sizes?: { headingSize: string; cardSize: string };
  catalogue?: { currentUrl: string | null };
  saveLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<CateringState, FormData>(
    updateCateringPage,
    undefined,
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const id = (name: string) => `cat-${group}-${name}`;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="group" value={group} />

      {fields.map((f) =>
        f.kind === "switch" ? (
          <div
            key={f.name}
            className="flex items-center justify-between gap-4 rounded-md border border-neutral-200 bg-white p-3"
          >
            <div>
              <Label htmlFor={id(f.name)}>{f.label}</Label>
              {f.hint && <p className="text-xs text-neutral-500">{f.hint}</p>}
            </div>
            <Switch id={id(f.name)} name={f.name} defaultChecked={Boolean(f.value)} />
          </div>
        ) : (
          <div key={f.name} className="space-y-2">
            <Label htmlFor={id(f.name)}>{f.label}</Label>
            {f.kind === "textarea" ? (
              <Textarea
                id={id(f.name)}
                name={f.name}
                defaultValue={String(f.value)}
                maxLength={f.max}
                rows={4}
                placeholder={f.placeholder}
              />
            ) : (
              <Input
                id={id(f.name)}
                name={f.name}
                defaultValue={String(f.value)}
                maxLength={f.max}
                placeholder={f.placeholder}
              />
            )}
            {f.hint && <p className="text-xs text-neutral-500">{f.hint}</p>}
          </div>
        ),
      )}

      {sizes && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SizeSelect
            name="headingSize"
            label="Heading size"
            options={HEADING_SIZE_OPTIONS}
            value={sizes.headingSize}
          />
          <SizeSelect name="cardSize" label="Card size" options={CARD_SIZE_OPTIONS} value={sizes.cardSize} />
        </div>
      )}

      {photo && (
        <div className="space-y-2">
          <Label htmlFor={id("photo")}>{photo.label}</Label>
          <div className="flex items-start gap-3">
            {(preview || photo.currentUrl) && (
              <div className="aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview ?? photo.currentUrl!} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <input
                id={id("photo")}
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm hover:file:bg-neutral-200"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setFileError(null);
                  setPreview(null);
                  if (!file) return;
                  const reason = rejectionReason(file);
                  if (reason) {
                    setFileError(reason);
                    e.target.value = "";
                    return;
                  }
                  setPreview(URL.createObjectURL(file));
                }}
              />
              <p className="text-xs text-neutral-500">
                {photo.hint ?? "Landscape photos work best."} JPG, PNG or WebP · up to {MAX_PHOTO_MB} MB.
                Leave empty to keep the current photo.
              </p>
              {photo.currentUrl && photo.removeLabel && (
                <label className="flex items-center gap-2 pt-1 text-xs text-neutral-600">
                  <input type="checkbox" name="removePhoto" className="h-4 w-4 accent-[#481819]" />
                  {photo.removeLabel}
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {catalogue && (
        <div className="space-y-3 rounded-md border border-neutral-200 bg-white p-3">
          <Label>Catalogue (for the download button)</Label>
          {catalogue.currentUrl ? (
            <p className="text-xs text-neutral-600">
              Current:{" "}
              <a href={catalogue.currentUrl} target="_blank" rel="noreferrer" className="underline">
                {catalogue.currentUrl.split("/").pop()}
              </a>
            </p>
          ) : (
            <p className="text-xs text-neutral-500">
              None yet — the download button stays hidden until you add one.
            </p>
          )}
          <input
            name="catalogue"
            type="file"
            accept="application/pdf"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm hover:file:bg-neutral-200"
          />
          <Input name="catalogueLink" placeholder="…or paste a link, e.g. https://drive.google.com/…" maxLength={500} />
          {catalogue.currentUrl && (
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <input type="checkbox" name="removeCatalogue" className="h-4 w-4 accent-[#481819]" />
              Remove the catalogue
            </label>
          )}
          <p className="text-xs text-neutral-500">PDF up to 20 MB.</p>
        </div>
      )}

      {fileError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {fileError}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{state.message}</p>
      )}
      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : saveLabel}
      </Button>
    </form>
  );
}
