"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createOptionGroup,
  createOption,
  deleteOption,
  deleteOptionGroup,
  moveOption,
  toggleOptionAvailability,
  updateOption,
  updateOptionGroup,
  type OptionState,
} from "@/app/actions/options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/config";

type ManagedOption = {
  id: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
};

export type ManagedGroup = {
  id: string;
  name: string;
  select: "ONE" | "MANY";
  pricing: "SURCHARGE" | "ABSOLUTE";
  helpText: string | null;
  itemCount: number;
  options: ManagedOption[];
};

/** Plain-English echo of the two switches, so the effect is never a guess. */
function describe(group: ManagedGroup): string {
  const pick = group.select === "ONE" ? "Pick one" : "Pick any number";
  const price =
    group.pricing === "ABSOLUTE"
      ? "each price replaces the item's own"
      : "each price is added on top";
  return `${pick} · ${price}`;
}

const selectClass =
  "h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm";

/**
 * Rename a group and change how it behaves.
 *
 * Renaming has to be possible in place: a group is attached to items, so
 * deleting and recreating it to fix a typo would silently strip the choices
 * off every item carrying it.
 */
function EditGroupForm({ group, onDone }: { group: ManagedGroup; onDone: () => void }) {
  const action = updateOptionGroup.bind(null, group.id);
  const [state, formAction, pending] = useActionState<OptionState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state?.ok, onDone]);

  return (
    <form action={formAction} className="mt-3 space-y-3 border-t border-neutral-100 pt-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`g-name-${group.id}`} className="text-xs">
            Name
          </Label>
          <Input id={`g-name-${group.id}`} name="name" required maxLength={60} defaultValue={group.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`g-help-${group.id}`} className="text-xs">
            Hint for customers
          </Label>
          <Input
            id={`g-help-${group.id}`}
            name="helpText"
            maxLength={120}
            defaultValue={group.helpText ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`g-select-${group.id}`} className="text-xs">
            How many can they pick?
          </Label>
          <select id={`g-select-${group.id}`} name="select" defaultValue={group.select} className={selectClass}>
            <option value="ONE">Just one — beans, size</option>
            <option value="MANY">Any number — extras, toppings</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`g-pricing-${group.id}`} className="text-xs">
            How does it price?
          </Label>
          <select id={`g-pricing-${group.id}`} name="pricing" defaultValue={group.pricing} className={selectClass}>
            <option value="SURCHARGE">Added on top — caramel +80</option>
            <option value="ABSOLUTE">Sets the price — large is 420</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Rename or reprice one choice without losing it from the items using it. */
function EditOptionForm({
  option,
  groupId,
  onDone,
}: {
  option: ManagedOption;
  groupId: string;
  onDone: () => void;
}) {
  const action = updateOption.bind(null, option.id);
  const [state, formAction, pending] = useActionState<OptionState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state?.ok, onDone]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="space-y-1">
        <Label htmlFor={`o-name-${option.id}`} className="text-xs">
          Name
        </Label>
        <Input
          id={`o-name-${option.id}`}
          name="name"
          required
          maxLength={60}
          defaultValue={option.name}
          className="h-9 w-44"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`o-price-${option.id}`} className="text-xs">
          Price
        </Label>
        <Input
          id={`o-price-${option.id}`}
          name="price"
          type="number"
          min={0}
          step={1}
          defaultValue={Math.round(option.priceCents / 100)}
          className="h-9 w-28"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        Cancel
      </Button>

      {state?.error && (
        <p role="alert" className="w-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

function OptionRow({
  option,
  group,
  first,
  last,
}: {
  option: ManagedOption;
  group: ManagedGroup;
  first: boolean;
  last: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-md border border-neutral-200 bg-white px-2 py-2">
        <EditOptionForm option={option} groupId={group.id} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1.5 text-sm">
      <span className={option.isAvailable ? "" : "text-neutral-400 line-through"}>{option.name}</span>
      <span className="text-xs text-neutral-500">
        {group.pricing === "ABSOLUTE"
          ? formatPrice(option.priceCents)
          : option.priceCents === 0
            ? "no extra charge"
            : `+${formatPrice(option.priceCents)}`}
      </span>

      <span className="ml-auto flex items-center gap-0.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setEditing(true)}
          className="h-7 px-2 text-xs"
        >
          Rename
        </Button>

        <form action={moveOption}>
          <input type="hidden" name="id" value={option.id} />
          <input type="hidden" name="direction" value="up" />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={first}
            aria-label={`Move ${option.name} up`}
            className="h-7 w-7 p-0"
          >
            ↑
          </Button>
        </form>
        <form action={moveOption}>
          <input type="hidden" name="id" value={option.id} />
          <input type="hidden" name="direction" value="down" />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={last}
            aria-label={`Move ${option.name} down`}
            className="h-7 w-7 p-0"
          >
            ↓
          </Button>
        </form>

        {/* Sold out for the afternoon without losing the price. */}
        <form action={toggleOptionAvailability}>
          <input type="hidden" name="id" value={option.id} />
          <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
            {option.isAvailable ? "Sold out" : "Restore"}
          </Button>
        </form>

        <form
          action={deleteOption}
          onSubmit={(e) => {
            if (!confirm(`Delete “${option.name}”?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={option.id} />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            aria-label={`Delete ${option.name}`}
            className="h-7 w-7 p-0 text-neutral-400 hover:bg-red-50 hover:text-red-600"
          >
            ×
          </Button>
        </form>
      </span>
    </li>
  );
}

function AddOptionForm({ group }: { group: ManagedGroup }) {
  const [state, formAction, pending] = useActionState<OptionState, FormData>(
    createOption,
    undefined,
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={ref} action={formAction} className="mt-3 border-t border-neutral-100 pt-3">
      <input type="hidden" name="groupId" value={group.id} />
      <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor={`opt-name-${group.id}`} className="text-xs">
            Add a choice
          </Label>
          <Input
            id={`opt-name-${group.id}`}
            name="name"
            required
            maxLength={60}
            placeholder={group.pricing === "ABSOLUTE" ? "e.g. Large" : "e.g. Caramel"}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`opt-price-${group.id}`} className="text-xs">
            {group.pricing === "ABSOLUTE" ? "Price" : "Extra"}
          </Label>
          <Input
            id={`opt-price-${group.id}`}
            name="price"
            type="number"
            min={0}
            step={1}
            defaultValue={0}
          />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>

      {state?.error && (
        <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

function GroupCard({ group }: { group: ManagedGroup }) {
  const [editing, setEditing] = useState(false);
  const locked = group.itemCount > 0;

  return (
    <li className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{group.name}</h3>
          <p className="mt-0.5 text-xs text-neutral-500">{describe(group)}</p>
          {group.helpText && (
            <p className="mt-1 text-xs italic text-neutral-400">&ldquo;{group.helpText}&rdquo;</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-neutral-400">
            {locked ? `on ${group.itemCount} item${group.itemCount === 1 ? "" : "s"}` : "unused"}
          </span>

          {/* Always available, even while the group is in use — renaming is
              exactly what you need when a group is already on the menu. */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing((v) => !v)}
            className="text-xs"
          >
            {editing ? "Close" : "Rename"}
          </Button>

          <form
            action={deleteOptionGroup}
            onSubmit={(e) => {
              if (locked || !confirm(`Delete “${group.name}” and its choices?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={group.id} />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              disabled={locked}
              title={locked ? "Untick it from every item first" : `Delete ${group.name}`}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Delete
            </Button>
          </form>
        </div>
      </div>

      {editing && <EditGroupForm group={group} onDone={() => setEditing(false)} />}

      {group.options.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-400">No choices yet.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {group.options.map((o, i) => (
            <OptionRow
              key={o.id}
              option={o}
              group={group}
              first={i === 0}
              last={i === group.options.length - 1}
            />
          ))}
        </ul>
      )}

      <AddOptionForm group={group} />
    </li>
  );
}

/**
 * Defines the choices a menu item can offer — beans, flavours, extras, sizes.
 *
 * Groups are shared rather than owned by one item: "Extras" is written once
 * and ticked onto every sandwich. Which of its choices a given item actually
 * offers is decided on the item itself, so the same group can serve a
 * croissant and a full breakfast without offering fries to both.
 */
export function OptionGroupManager({ groups }: { groups: ManagedGroup[] }) {
  const [state, formAction, pending] = useActionState<OptionState, FormData>(
    createOptionGroup,
    undefined,
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state?.ok]);

  return (
    <div className="space-y-6">
      {groups.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No option groups yet. Add one below, then tick it onto the items it applies to from the
          menu item form.
        </p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </ul>
      )}

      <form
        ref={ref}
        action={formAction}
        className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <h2 className="text-sm font-medium">Add a group</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              name="name"
              required
              maxLength={60}
              placeholder="e.g. Coffee beans"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-help">Hint for customers</Label>
            <Input
              id="group-help"
              name="helpText"
              maxLength={120}
              placeholder="e.g. Choose your origin"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-select">How many can they pick?</Label>
            <select id="group-select" name="select" defaultValue="ONE" className={selectClass}>
              <option value="ONE">Just one — beans, size</option>
              <option value="MANY">Any number — extras, toppings</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-pricing">How does it price?</Label>
            <select
              id="group-pricing"
              name="pricing"
              defaultValue="SURCHARGE"
              className={selectClass}
            >
              <option value="SURCHARGE">Added on top — caramel +80</option>
              <option value="ABSOLUTE">Sets the price — large is 420</option>
            </select>
          </div>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add group"}
        </Button>

        {state?.error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
