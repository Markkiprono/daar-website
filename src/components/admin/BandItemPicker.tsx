"use client";

import { useActionState, useMemo, useState } from "react";
import { updateBandItems, type PhotoState } from "@/app/actions/site-photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type BandItem = {
  id: string;
  name: string;
  imageUrl: string;
  categoryName: string;
  isInBand: boolean;
};

/**
 * Tick the menu items that belong in the drifting band on the home page.
 *
 * Built for a long menu, not a short one. A café with a hundred and fifty
 * photographed items would otherwise get a hundred and fifty tiles laid out
 * down this page, roughly three thousand pixels of it, pushing the Story
 * page and the favicon somewhere nobody scrolls to — so this is folded away
 * behind a summary line, and the list inside it scrolls in its own box. The
 * section is exactly one line tall until it is opened, whatever the size of
 * the menu.
 *
 * Controlled rather than left to defaultChecked, for two reasons. The count
 * on the summary has to move as she ticks, before anything is saved — a list
 * of forty pastries with no running total is a form you cannot check your own
 * work on. And an uncontrolled box keeps whatever the browser last put in it
 * after the page revalidates, so a saved form would go on showing the ticks
 * it had before the save rather than the ones that landed.
 *
 * Only items that already have a photograph are offered. Ticking an item with
 * no picture would put a grey rectangle in the band, and explaining that
 * afterwards is worse than not offering it.
 */
export function BandItemPicker({ items }: { items: BandItem[] }) {
  const [state, formAction, pending] = useActionState<PhotoState, FormData>(
    updateBandItems,
    undefined,
  );
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.isInBand).map((i) => i.id)),
  );
  const [query, setQuery] = useState("");
  const [tickedOnly, setTickedOnly] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (tickedOnly && !picked.has(item.id)) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) || item.categoryName.toLowerCase().includes(q)
      );
    });
  }, [items, query, tickedOnly, picked]);

  /**
   * Ticks that the search has scrolled out of sight.
   *
   * The action reads the whole answer off the form — everything off, then the
   * posted ids back on — and a checkbox that is not rendered posts nothing.
   * Without these, filtering to "crois", ticking the croissant and saving
   * would silently untick the other seven items she chose a minute earlier.
   * They ride along as hidden fields so the form still describes the entire
   * choice and not just the part currently on screen.
   */
  const offScreenTicks = useMemo(() => {
    const shown = new Set(visible.map((i) => i.id));
    return items.filter((i) => picked.has(i.id) && !shown.has(i.id));
  }, [items, visible, picked]);

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
        No menu item has a photograph yet. Add photos to items under Menu and they will appear here
        to tick.
      </p>
    );
  }

  // Grouped so she is looking for "the pastries", not scrolling one long list.
  // Insertion order is the order the page handed them over, which is already
  // the menu's own order.
  const groups = new Map<string, BandItem[]>();
  for (const item of visible) {
    const list = groups.get(item.categoryName);
    if (list) list.push(item);
    else groups.set(item.categoryName, [item]);
  }

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form action={formAction}>
      <details className="rounded-lg border border-neutral-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm [&::-webkit-details-marker]:hidden">
          <span className="font-medium">Choose menu items</span>
          <span className="flex items-center gap-2 text-neutral-500">
            <span>
              {picked.size === 0
                ? "none ticked"
                : `${picked.size} ticked`}
            </span>
            <span aria-hidden className="text-xs">
              ▾
            </span>
          </span>
        </summary>

        <div className="space-y-3 border-t border-neutral-200 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${items.length} items…`}
              className="h-9 flex-1 min-w-[10rem]"
              aria-label="Search menu items"
            />
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-neutral-600">
              <input
                type="checkbox"
                checked={tickedOnly}
                onChange={(e) => setTickedOnly(e.target.checked)}
                className="size-4 accent-[#481819]"
              />
              Ticked only
            </label>
          </div>

          {/* Its own scroll box, so the page below stays where it is however
              long the menu gets. */}
          <div className="max-h-[24rem] space-y-4 overflow-y-auto pr-1">
            {visible.length === 0 ? (
              <p className="p-4 text-center text-sm text-neutral-500">
                {tickedOnly && picked.size === 0
                  ? "Nothing ticked yet."
                  : "No items match that search."}
              </p>
            ) : (
              [...groups].map(([category, list]) => (
                <fieldset key={category}>
                  <legend className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                    {category}
                  </legend>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((item) => {
                      const on = picked.has(item.id);
                      return (
                        <li key={item.id}>
                          {/* The whole tile is the label, so the tap target is
                              the photograph and the name rather than a 16px
                              box beside them — this is used on a phone. */}
                          <label
                            className={`flex cursor-pointer items-center gap-2.5 rounded-md border p-2 transition ${
                              on
                                ? "border-[#481819] bg-[#481819]/5"
                                : "border-neutral-200 hover:border-neutral-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              name="inBand"
                              value={item.id}
                              checked={on}
                              onChange={() => toggle(item.id)}
                              className="size-4 shrink-0 accent-[#481819]"
                            />
                            {/* Lazy, because a long menu is a hundred and
                                fifty thumbnails and she opened this to tick
                                three of them. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.imageUrl}
                              alt=""
                              loading="lazy"
                              className="size-11 shrink-0 rounded object-cover"
                            />
                            <span className="min-w-0 flex-1 text-xs leading-tight">
                              {item.name}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              ))
            )}
          </div>

          {offScreenTicks.map((item) => (
            <input key={item.id} type="hidden" name="inBand" value={item.id} />
          ))}

          <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save choices"}
            </Button>
            <p className="text-sm text-neutral-500">
              {picked.size === 0
                ? "Nothing ticked — the band uses your uploaded photos, or picks on its own if there are none."
                : `${picked.size} ${picked.size === 1 ? "item" : "items"} ticked.`}
            </p>
          </div>

          {state?.ok && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
              {state.message}
            </p>
          )}
          {state && !state.ok && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
        </div>
      </details>
    </form>
  );
}
