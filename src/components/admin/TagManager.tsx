"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createTag, deleteTag, addDefaultTags, type TagState } from "@/app/actions/tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Tag = { id: string; name: string; kind: string; itemCount: number };

function TagGroup({ label, list, hint }: { label: string; list: Tag[]; hint: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-0.5 text-xs text-neutral-400">{hint}</p>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-400">None yet.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {list.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white py-1 pl-3 pr-1 text-sm"
            >
              <span>{t.name}</span>
              <span className="text-xs text-neutral-400">
                {t.itemCount > 0 ? `${t.itemCount} item${t.itemCount === 1 ? "" : "s"}` : "unused"}
              </span>
              <form
                action={deleteTag}
                onSubmit={(e) => {
                  const msg =
                    t.itemCount > 0
                      ? `Remove “${t.name}” from ${t.itemCount} item${t.itemCount === 1 ? "" : "s"}? The items themselves are kept.`
                      : `Delete “${t.name}”?`;
                  if (!confirm(msg)) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={t.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${t.name}`}
                  className="h-6 w-6 p-0 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Creates the badges and dietary labels the menu item form offers.
 *
 * Without this there was no way to make one: the item form read them from the
 * database and simply rendered two empty headings, so a fresh install could
 * never label anything vegan or gluten-free.
 */
export function TagManager({ tags }: { tags: Tag[] }) {
  const [state, formAction, pending] = useActionState<TagState, FormData>(createTag, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState("BADGE");

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  const badges = tags.filter((t) => t.kind === "BADGE");
  const dietary = tags.filter((t) => t.kind === "DIETARY");

  return (
    <div className="space-y-5">
      <TagGroup label="Badges" list={badges} hint="Marketing labels — Bestseller, New, Seasonal." />
      <TagGroup
        label="Dietary"
        list={dietary}
        hint="What's in it — Vegan, Gluten-free, Contains nuts."
      />

      {tags.length === 0 && (
        <form action={addDefaultTags}>
          <Button type="submit" variant="outline" size="sm">
            Add the usual set
          </Button>
          <span className="ml-2 text-xs text-neutral-500">
            Creates Bestseller, New, Seasonal, To order, Vegetarian, Vegan, Gluten-free and
            Contains nuts.
          </span>
        </form>
      )}

      <form ref={formRef} action={formAction} className="space-y-3 border-t border-neutral-200 pt-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Add a label</Label>
            <Input id="tag-name" name="name" required maxLength={40} placeholder="e.g. Contains nuts" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag-kind">Type</Label>
            {/* Native select: the form posts this, and it works on a phone. */}
            <select
              id="tag-kind"
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm sm:w-36"
            >
              <option value="BADGE">Badge</option>
              <option value="DIETARY">Dietary</option>
            </select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>

        {state?.error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
