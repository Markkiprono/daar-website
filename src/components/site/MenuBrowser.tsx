"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { MenuItemCard, type MenuItemForCard } from "./MenuItemCard";
import { Reveal } from "./Reveal";
import { expandQuery, matches, normalise, SUGGESTED_SEARCHES } from "@/lib/search-terms";

export type BrowserCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  items: MenuItemForCard[];
};

/**
 * Menu search + category filter.
 *
 * Deliberately client-side: a café menu is tens of items, so the whole thing
 * ships with the page and filtering is instant — no request per keystroke,
 * which matters on mobile data. Items are still server-rendered in the
 * initial HTML, so search engines and no-JS visitors see the full menu.
 *
 * Matching runs through src/lib/search-terms.ts, which maps what people type
 * ("lunch", "hot drink", "no meat") onto the words the menu actually uses.
 */
export function MenuBrowser({ categories }: { categories: BrowserCategory[] }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [scrolledCat, setScrolledCat] = useState<string | null>(categories[0]?.slug ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Drag-to-scroll for the category strip.
   *
   * The strip scrolls horizontally but its scrollbar is hidden, which is right
   * on a phone — you swipe it. On a desktop there was then no scrollbar, no
   * drag and no affordance, so once the café had more categories than fit the
   * width, the ones past the edge were simply unreachable with a mouse.
   *
   * Mouse only: touch already scrolls natively and hijacking it would break
   * the thing that works. The fades are rendered only on a side that has more
   * to show, so a strip that fits looks untouched.
   */
  const stripRef = useRef<HTMLElement>(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const [dragging, setDragging] = useState(false);
  const [edges, setEdges] = useState({ left: false, right: false });

  const readEdges = () => {
    const el = stripRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 });
  };

  useEffect(() => {
    readEdges();
    const el = stripRef.current;
    if (!el) return;
    // Categories can arrive or the window can change width; either can turn a
    // strip that fitted into one that does not.
    const ro = new ResizeObserver(readEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [categories]);

  const deferredQuery = useDeferredValue(query);
  const searching = deferredQuery.trim().length > 0;
  const filtering = searching || activeCat !== null;

  /**
   * Keep the highlighted chip on screen.
   *
   * The highlight tracks the section being read, so on a long menu it walks
   * off the end of the strip and the "you are here" marker vanishes exactly
   * when it is most useful. This nudges the strip by the smallest amount that
   * brings the chip back into view — scrollBy on the strip itself, never
   * scrollIntoView, which would drag the whole page around under the reader.
   */
  const activeSlug = filtering ? activeCat : scrolledCat;

  useEffect(() => {
    const el = stripRef.current;
    if (!el || !activeSlug) return;
    // Never yank the strip out from under someone mid-drag.
    if (drag.current.active) return;

    const chip = el.querySelector<HTMLElement>(`[data-cat="${CSS.escape(activeSlug)}"]`);
    if (!chip) return;

    // Enough to clear the edge fade, so the chip is readable and not half
    // under a gradient.
    const PAD = 48;
    const view = el.clientWidth;
    const box = chip.getBoundingClientRect();
    const strip = el.getBoundingClientRect();

    // Absolute target, not a relative nudge. The highlight can change several
    // times during one flick of the page, and a relative scrollBy issued while
    // the previous smooth scroll is still animating measures a moving target
    // and compounds. Recomputing an absolute position converges instead.
    const chipStart = box.left - strip.left + el.scrollLeft;
    const chipEnd = chipStart + box.width;

    let target = el.scrollLeft;
    if (chipStart - PAD < el.scrollLeft) target = chipStart - PAD;
    else if (chipEnd + PAD > el.scrollLeft + view) target = chipEnd + PAD - view;

    target = Math.max(0, Math.min(target, el.scrollWidth - view));
    if (Math.abs(target - el.scrollLeft) < 2) return;

    el.scrollTo({
      left: target,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [activeSlug]);

  /**
   * Build the searchable text once per item.
   *
   * Includes the category name and every tag, so "vegetarian" or "pastries"
   * find things even when the words appear nowhere in the item itself.
   */
  const indexed = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        items: c.items.map((item) => ({
          item,
          haystack: normalise(
            [
              item.name,
              item.description ?? "",
              c.name,
              c.description ?? "",
              ...item.tags.map((t) => t.tag.name),
              // "caramel" should find the cappuccino, even though no item is
              // called that — the flavour only exists as one of its choices.
              ...item.optionNames,
              item.isAvailable ? "available" : "sold out",
            ].join(" "),
          ),
        })),
      })),
    [categories],
  );

  const results = useMemo(() => {
    const groups = expandQuery(deferredQuery);
    return indexed
      .filter((c) => activeCat === null || c.slug === activeCat)
      .map((c) => ({
        ...c,
        items: c.items.filter(({ haystack }) => matches(haystack, groups)).map(({ item }) => item),
      }))
      .filter((c) => c.items.length > 0);
  }, [indexed, deferredQuery, activeCat]);

  const count = results.reduce((n, c) => n + c.items.length, 0);

  // "/" focuses search, Escape clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typingElsewhere =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typingElsewhere) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && typingElsewhere) {
        setQuery("");
        // Drop the category latch too — see the note on clearAll. Leaving it
        // set here is what stops the chips jumping ever again.
        setActiveCat(null);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Track which section is on screen — only meaningful while browsing.
  useEffect(() => {
    if (filtering) return;
    const els = categories
      .map((c) => document.getElementById(c.slug))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setScrolledCat(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [categories, filtering]);

  /**
   * Both at once, and every path that clears the search must use it.
   *
   * A chip does one of two things depending on the mode: while searching it
   * filters, while browsing it jumps down the page. activeCat is what decides,
   * and it could only ever be set from the searching branch — so clearing the
   * query while leaving activeCat set stranded the strip in filter mode with
   * nothing on screen to say so. From then on every chip highlighted and
   * nothing scrolled, and the only way out was tapping the same chip a second
   * time to unlatch it, which nobody would guess.
   */
  const clearAll = () => {
    setQuery("");
    setActiveCat(null);
  };

  return (
    <>
      {/* ---------- sticky search + categories ---------- */}
      <div className="sticky top-[73px] z-30 border-b border-daar-rule bg-daar-bone/95 backdrop-blur-md">
        <div className="mx-auto max-w-[1240px] px-5 pt-4">
          <label htmlFor="menu-search" className="sr-only">
            Search the menu
          </label>
          <div className="relative">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-daar-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>

            <input
              ref={inputRef}
              id="menu-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                // Emptying the field means the visitor has stopped searching,
                // so the chips go back to being a way to jump down the page.
                if (e.target.value === "") setActiveCat(null);
              }}
              placeholder="Search the menu"
              autoComplete="off"
              className="h-12 w-full rounded-full border border-daar-rule bg-white pl-11 pr-11 text-[16px] text-daar-ink outline-none transition placeholder:text-daar-muted focus:border-daar-tan focus:ring-2 focus:ring-daar-tan/30"
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  clearAll();
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-daar-muted transition hover:bg-daar-rule/50 hover:text-daar-ink"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Category chips. No "All" — an active chip toggles itself off. */}
          <div className="relative -mx-1">
          <nav
            ref={stripRef}
            aria-label="Menu categories"
            onScroll={readEdges}
            onPointerDown={(e) => {
              // Unconditionally, before any early return. This flag suppresses
              // the click at the end of a drag, and a drag that ends anywhere
              // without producing a click — over a gap, past the edge, on the
              // scrollbar — never reaches the handler that clears it. It then
              // ate the next genuine tap instead, which is the tap someone
              // makes immediately after dragging the strip to find a category.
              drag.current.moved = false;
              if (e.pointerType !== "mouse") return;
              const el = stripRef.current;
              if (!el || el.scrollWidth <= el.clientWidth) return;
              drag.current = {
                active: true,
                startX: e.clientX,
                startScroll: el.scrollLeft,
                moved: false,
              };
              setDragging(true);
              // Throws if the pointer is already gone; losing capture just
              // means the drag ends at the element edge, which is survivable.
              try {
                el.setPointerCapture(e.pointerId);
              } catch {}
            }}
            onPointerMove={(e) => {
              if (!drag.current.active) return;
              const el = stripRef.current;
              if (!el) return;
              const dx = e.clientX - drag.current.startX;
              // A few pixels of slop, so a slightly shaky click is still a click.
              if (Math.abs(dx) > 4) drag.current.moved = true;
              el.scrollLeft = drag.current.startScroll - dx;
            }}
            onPointerUp={(e) => {
              if (!drag.current.active) return;
              drag.current.active = false;
              setDragging(false);
              try {
                stripRef.current?.releasePointerCapture(e.pointerId);
              } catch {}
              // The click, if there is one, fires before this runs — so it
              // still gets suppressed — and the flag is clear afterwards
              // whether a click happened or not. Belt and braces with the
              // reset above: that one covers a pointer, this one covers a
              // keyboard press arriving next with no pointerdown at all.
              window.setTimeout(() => {
                drag.current.moved = false;
              }, 0);
            }}
            onPointerCancel={() => {
              drag.current.active = false;
              setDragging(false);
            }}
            onClickCapture={(e) => {
              // Let go after dragging across a chip and you meant to scroll,
              // not to filter by whatever happened to be under the cursor.
              if (drag.current.moved) {
                e.preventDefault();
                e.stopPropagation();
                drag.current.moved = false;
              }
            }}
            className={[
              "daar-noscrollbar flex gap-2 overflow-x-auto px-1 py-3",
              edges.left || edges.right ? "cursor-grab" : "",
              dragging ? "cursor-grabbing select-none" : "",
            ].join(" ")}
          >
            {categories.map((c) => {
              const isActive = filtering ? activeCat === c.slug : scrolledCat === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  data-cat={c.slug}
                  onClick={() => {
                    if (searching || activeCat !== null) {
                      // Filtering: tapping the active chip clears it.
                      setActiveCat((prev) => (prev === c.slug ? null : c.slug));
                    } else {
                      // Browsing: chips jump to the section.
                      document.getElementById(c.slug)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  aria-pressed={isActive}
                  className={[
                    "shrink-0 whitespace-nowrap rounded-full border px-5 py-2.5 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] transition",
                    isActive
                      ? "border-daar-oxblood bg-daar-oxblood text-daar-cream"
                      : "border-daar-rule bg-white text-daar-muted hover:border-daar-tan hover:text-daar-ink",
                  ].join(" ")}
                >
                  {c.name}
                </button>
              );
            })}
          </nav>

          {/* Only on a side that actually has more to show. */}
          {edges.left && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-daar-bone to-transparent"
            />
          )}
          {edges.right && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-daar-bone to-transparent"
            />
          )}
          </div>
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {searching ? `${count} result${count === 1 ? "" : "s"} for ${deferredQuery}` : ""}
      </div>

      {filtering && (
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3 px-5 pt-8">
          <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
            {count} {count === 1 ? "item" : "items"}
            {searching ? ` matching “${deferredQuery.trim()}”` : ""}
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-oxblood underline underline-offset-4 transition hover:text-daar-ink"
          >
            Clear
          </button>
        </div>
      )}

      {count === 0 ? (
        <div className="mx-auto max-w-[1240px] px-5 py-20 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl">Nothing matches that.</p>
          <p className="mt-3 text-sm text-daar-muted">Try one of these instead:</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SUGGESTED_SEARCHES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setActiveCat(null);
                  setQuery(s);
                }}
                className="rounded-full border border-daar-rule bg-white px-4 py-2 text-sm text-daar-muted transition hover:border-daar-tan hover:text-daar-ink"
              >
                {s}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={clearAll}
            className="mt-7 rounded-full border border-daar-oxblood px-7 py-3 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-oxblood transition hover:bg-daar-oxblood hover:text-daar-cream"
          >
            Show the whole menu
          </button>
        </div>
      ) : (
        results.map((category, ci) => (
          <section key={category.id} id={category.slug} className="scroll-mt-44 px-5 py-10">
            <div className="mx-auto max-w-[1240px]">
              {/* Category header — a hairline rule and the item count are
                  enough to read as a section divider rather than a dish. */}
              <header className="border-t border-daar-rule pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,4.5vw,2.5rem)] leading-none">
                    {category.name}
                  </h2>
                  <span className="font-[family-name:var(--font-label)] text-[0.7rem] uppercase tracking-[0.18em] text-daar-muted">
                    {category.items.length} {category.items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                {category.description && !filtering && (
                  <p className="mt-2 text-sm text-daar-muted">{category.description}</p>
                )}
              </header>

              <div
                // Two columns from 30rem rather than Tailwind's sm (40rem).
                // A tablet is rarely full-screen: an iPad in Split View is
                // about 507px, and Safari at 150% zoom about 512px — both
                // land under 40rem and dropped the menu to a single column on
                // a screen with obvious room for two.
                className="mt-8 grid gap-x-5 gap-y-12 min-[30rem]:grid-cols-2 lg:grid-cols-3"
              >
                {category.items.map((item, ii) => (
                  <Reveal key={item.id}>
                    <MenuItemCard item={item} priority={ci === 0 && ii < 3} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        ))
      )}
    </>
  );
}
