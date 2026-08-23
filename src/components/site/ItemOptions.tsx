"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/config";
import {
  chosenOptions,
  toggle,
  totalCents,
  type PickerGroup,
  type Selection,
} from "@/lib/options";

/**
 * Build-your-own price on an item page.
 *
 * Nothing is selected when the page opens, so the number under the chips is
 * the same one the menu card advertised — the customer adds to it rather than
 * discovering they were quoted a configuration they never chose.
 *
 * State is local on purpose. There is no cart and nothing to persist: leaving
 * the page throws the selection away and the price returns to the plain item
 * price, which is exactly what a menu should do. It also means every tap is
 * instant with no request, so this keeps working when the service worker is
 * serving the menu offline.
 */
export function ItemOptions({
  baseCents,
  groups,
}: {
  baseCents: number;
  groups: PickerGroup[];
}) {
  const [selection, setSelection] = useState<Selection>({});

  const total = totalCents(baseCents, groups, selection);
  const chosen = chosenOptions(groups, selection);
  const changed = total !== baseCents || chosen.length > 0;

  return (
    <div className="mt-10 border-t border-daar-rule pt-8">
      <div className="space-y-7">
        {groups.map((group) => {
          const picked = selection[group.id] ?? [];

          return (
            <fieldset key={group.id}>
              <legend className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
                {group.name}
                <span className="ml-2 normal-case tracking-normal text-daar-muted/70">
                  {group.select === "ONE" ? "choose one" : "choose any"}
                </span>
              </legend>

              {group.helpText && (
                <p className="mt-1.5 text-sm font-light text-daar-muted">{group.helpText}</p>
              )}

              <div
                // role="radio" children need a radiogroup parent to be
                // announced as a set; checkboxes stand alone and must not.
                role={group.select === "ONE" ? "radiogroup" : undefined}
                aria-label={group.select === "ONE" ? group.name : undefined}
                className="mt-3 flex flex-wrap gap-2"
              >
                {group.options.map((option) => {
                  const active = picked.includes(option.id);
                  const soldOut = !option.isAvailable;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={soldOut}
                      // Radios and checkboxes rendered as chips: the role tells
                      // a screen reader which of the two this actually is.
                      role={group.select === "ONE" ? "radio" : "checkbox"}
                      aria-checked={active}
                      onClick={() => setSelection((s) => toggle(s, group, option.id))}
                      className={[
                        "rounded-full border px-4 py-2.5 text-left transition",
                        soldOut
                          ? "cursor-not-allowed border-daar-rule bg-daar-rule/20 text-daar-muted/50 line-through"
                          : active
                            ? "border-daar-oxblood bg-daar-oxblood text-daar-cream"
                            : "border-daar-rule bg-white text-daar-ink hover:border-daar-tan",
                      ].join(" ")}
                    >
                      <span className="text-sm">{option.name}</span>
                      {option.priceCents !== 0 && (
                        <span
                          className={[
                            "ml-2 text-xs",
                            active ? "text-daar-tan" : "text-daar-muted",
                          ].join(" ")}
                        >
                          {group.pricing === "ABSOLUTE"
                            ? formatPrice(option.priceCents)
                            : `+${formatPrice(option.priceCents, { withCode: false })}`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      {/* The running total. Announced politely so it is not read out on every
          single tap while someone is still choosing. */}
      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-daar-rule pt-5">
        <div>
          <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
            {changed ? "Your order" : "Price"}
          </p>
          {chosen.length > 0 && (
            <p className="mt-1 text-sm font-light text-daar-muted">
              {chosen.map((o) => o.name).join(" · ")}
            </p>
          )}
        </div>

        <p aria-live="polite" className="font-[family-name:var(--font-display)] text-3xl">
          {formatPrice(total)}
        </p>
      </div>

      {changed && (
        <button
          type="button"
          onClick={() => setSelection({})}
          className="mt-3 text-xs uppercase tracking-[0.18em] text-daar-muted underline underline-offset-4 transition hover:text-daar-ink"
        >
          Start again
        </button>
      )}

      <p className="mt-6 text-xs font-light text-daar-muted">
        Prices are for reference — order at the counter.
      </p>
    </div>
  );
}
