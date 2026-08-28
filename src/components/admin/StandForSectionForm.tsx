"use client";

import { useActionState } from "react";
import { updateStandForSection, type CardState } from "@/app/actions/value-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  HEADING_SIZE_OPTIONS,
  CARD_SIZE_OPTIONS,
  type SizeOption,
} from "@/lib/home-sections";

const selectClass = "h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm";

export type StandForValues = {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  headingSize: string;
  cardSize: string;
};

/**
 * A size control, with the reason for each choice written next to it.
 *
 * The hint under the dropdown changes with the selection rather than listing
 * every option's meaning at once. Someone choosing "Small" wants to know what
 * small does here, not to read four descriptions and work out which applies —
 * and on a phone, four lines of explanation under every control is most of the
 * screen.
 */
function SizeField<T extends string>({
  id,
  name,
  label,
  options,
  value,
}: {
  id: string;
  name: string;
  label: string;
  options: SizeOption<T>[];
  value: string;
}) {
  const current = options.find((o) => o.value === value) ?? options[0]!;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} name={name} defaultValue={current.value} className={selectClass}>
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
 * The wording and sizing of the "What we stand for" section.
 *
 * Separate from the cards below it and saved on its own: changing the heading
 * should not mean re-saving four cards, and a slip in one card should not stop
 * the heading being fixed.
 */
export function StandForSectionForm({ values }: { values: StandForValues }) {
  const [state, formAction, pending] = useActionState<CardState, FormData>(
    updateStandForSection,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-md border border-neutral-200 bg-white p-3">
        <div>
          <Label htmlFor="standForEnabled">Show this section</Label>
          <p className="text-xs text-neutral-500">
            Turn off to hide the whole strip from the home page without deleting the cards.
          </p>
        </div>
        <Switch id="standForEnabled" name="enabled" defaultChecked={values.enabled} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="standForEyebrow">Small label above the heading</Label>
        <Input
          id="standForEyebrow"
          name="eyebrow"
          defaultValue={values.eyebrow}
          maxLength={60}
          placeholder="e.g. Why we do it this way"
        />
        <p className="text-xs text-neutral-500">Leave empty for no label.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="standForHeading">Heading</Label>
        <Input
          id="standForHeading"
          name="heading"
          defaultValue={values.heading}
          required
          maxLength={90}
          placeholder="e.g. What we stand for"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SizeField
          id="standForHeadingSize"
          name="headingSize"
          label="Heading size"
          options={HEADING_SIZE_OPTIONS}
          value={values.headingSize}
        />
        <SizeField
          id="standForCardSize"
          name="cardSize"
          label="Card size"
          options={CARD_SIZE_OPTIONS}
          value={values.cardSize}
        />
      </div>

      {state?.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{state.message}</p>
      )}
      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save section"}
      </Button>
    </form>
  );
}
