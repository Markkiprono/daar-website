"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toggleAvailability, setFeatured, deleteMenuItem } from "@/app/actions/menu";
import { formatPrice } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export type AdminItem = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  imageAlt: string | null;
  blurDataUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  tagNames: string[];
};

export type AdminCategory = { id: string; name: string; items: AdminItem[] };

function normalise(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function AdminMenuList({ categories }: { categories: AdminCategory[] }) {
  const [query, setQuery] = useState("");
  const [onlySoldOut, setOnlySoldOut] = useState(false);

  const filtered = useMemo(() => {
    const terms = normalise(query).split(/\s+/).filter(Boolean);
    return categories
      .map((c) => ({
        ...c,
        items: c.items.filter((item) => {
          if (onlySoldOut && item.isAvailable) return false;
          if (terms.length === 0) return true;
          const hay = normalise([item.name, item.description ?? "", c.name, ...item.tagNames].join(" "));
          return terms.every((t) => hay.includes(t));
        }),
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, query, onlySoldOut]);

  const total = filtered.reduce((n, c) => n + c.items.length, 0);
  const grandTotal = categories.reduce((n, c) => n + c.items.length, 0);

  return (
    <div className="space-y-5">
      <div className="sticky top-[104px] z-30 -mx-4 space-y-3 bg-neutral-50/95 px-4 py-3 backdrop-blur">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items…"
          autoComplete="off"
          className="h-11 text-[16px]"
          aria-label="Search menu items"
        />
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={onlySoldOut}
              onChange={(e) => setOnlySoldOut(e.target.checked)}
              className="h-4 w-4 accent-[#481819]"
            />
            Sold out only
          </label>
          <span className="text-xs text-neutral-500">
            {query || onlySoldOut ? `${total} of ${grandTotal}` : `${grandTotal} items`}
          </span>
        </div>
      </div>

      {total === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Nothing matches. <button type="button" onClick={() => { setQuery(""); setOnlySoldOut(false); }} className="underline">Clear</button>
        </p>
      ) : (
        filtered.map((category) => (
          <section key={category.id} className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-500">
              {category.name}
            </h2>

            <ul className="space-y-2">
              {category.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-neutral-100">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.imageAlt ?? item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                        {...(item.blurDataUrl
                          ? { placeholder: "blur" as const, blurDataURL: item.blurDataUrl }
                          : {})}
                      />
                    ) : (
                      <span className="grid h-full place-items-center text-[10px] text-neutral-400">
                        No photo
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/menu/${item.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-sm tabular-nums text-neutral-600">
                        {formatPrice(item.priceCents)}
                      </span>
                      {item.isFeatured && <Badge className="bg-[#481819]">Special</Badge>}
                      {!item.isAvailable && <Badge variant="destructive">Sold out</Badge>}
                      {item.tagNames.map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-1">
                    <form action={toggleAvailability}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant={item.isAvailable ? "outline" : "default"}
                        className="w-full text-xs"
                      >
                        {item.isAvailable ? "Mark sold out" : "Back in stock"}
                      </Button>
                    </form>

                    {!item.isFeatured && (
                      <form action={setFeatured}>
                        <input type="hidden" name="id" value={item.id} />
                        <Button type="submit" size="sm" variant="ghost" className="w-full text-xs">
                          Make special
                        </Button>
                      </form>
                    )}

                    <form
                      action={deleteMenuItem}
                      onSubmit={(e) => {
                        // Deleting is irreversible and the button sits next to
                        // the ones the owner taps constantly.
                        if (!confirm(`Delete “${item.name}”? This cannot be undone.`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="w-full text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
