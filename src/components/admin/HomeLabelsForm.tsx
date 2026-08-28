"use client";

import { useActionState } from "react";
import { updateHomeLabels, type PanelState } from "@/app/actions/home-panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HEADING_SIZE_OPTIONS } from "@/lib/home-sections";

const selectClass = "h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm";

export type HomeLabelValues = {
  heroEyebrow: string;
  heroPrimaryLabel: string;
  heroSecondaryLabel: string;
  counterEyebrow: string;
  counterHeading: string;
  chefEyebrow: string;
  featuredBadge: string;
  storyEyebrow: string;
  closingEyebrow: string;
  closingHeading: string;
  visitEyebrow: string;
  visitHeading: string;
  homeHeadingSize: string;
};

/**
 * Every remaining word on the home page that used to be in the source.
 *
 * Grouped by where each one appears as you scroll, not by the column name —
 * the café is looking for "the bit above Visit", not for `visitEyebrow`. Each
 * group says which part of the page it controls, because a form of thirteen
 * text boxes with no map is not editable in any sense that matters.
 */
export function HomeLabelsForm({ values }: { values: HomeLabelValues }) {
  const [state, formAction, pending] = useActionState<PanelState, FormData>(
    updateHomeLabels,
    undefined,
  );

  const field = (
    name: keyof HomeLabelValues,
    label: string,
    placeholder: string,
    hint?: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={values[name]} placeholder={placeholder} />
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );

  return (
    <form action={formAction} className="space-y-6">
      <Group
        title="The opening"
        note="The first screen. The big headline and the sentence under it are on the Settings page."
      >
        {field(
          "heroEyebrow",
          "Small label above the headline",
          "Westlands, Nairobi · Café & Bakery",
          "Leave empty to use the area and city from the site configuration.",
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("heroPrimaryLabel", "First button", "Explore the menu")}
          {field("heroSecondaryLabel", "Second button", "Find us")}
        </div>
      </Group>

      <Group title="The drifting band of photos">
        {field("counterEyebrow", "Small label", "On the counter")}
        {field("counterHeading", "Heading", "What today looks like")}
      </Group>

      <Group title="The chef, and the featured dish">
        {field("chefEyebrow", "Small label above the chef’s words", "From the kitchen")}
        {field("featuredBadge", "Badge on the featured dish", "Chef’s Special")}
      </Group>

      <Group title="The story band">
        {field(
          "storyEyebrow",
          "Small label",
          "Our story",
          "The heading and the words themselves are on the Settings page.",
        )}
      </Group>

      <Group title="The closing band" note="The last full-screen section, before the address.">
        {field("closingEyebrow", "Small label", "Come and see")}
        {field(
          "closingHeading",
          "Heading",
          "Patience tastes better",
          "Leave empty to use the site’s tagline.",
        )}
      </Group>

      <Group title="Visit">
        {field("visitEyebrow", "Small label", "Come in")}
        {field("visitHeading", "Heading", "Visit")}
      </Group>

      <Group
        title="Size"
        note="Applies to every section heading down the home page at once, so the page stays consistent."
      >
        <div className="space-y-2">
          <Label htmlFor="homeHeadingSize">Section heading size</Label>
          <select
            id="homeHeadingSize"
            name="homeHeadingSize"
            defaultValue={values.homeHeadingSize}
            className={selectClass}
          >
            {HEADING_SIZE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-500">
            {HEADING_SIZE_OPTIONS.map((o) => `${o.label} — ${o.hint}`).join("  ·  ")}
          </p>
        </div>
      </Group>

      {state?.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{state.message}</p>
      )}
      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save wording"}
      </Button>
    </form>
  );
}

function Group({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3 rounded-md border border-neutral-200 p-4">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      {note && <p className="text-xs text-neutral-500">{note}</p>}
      {children}
    </fieldset>
  );
}
