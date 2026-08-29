"use client";

import { useActionState, useState } from "react";
import {
  addValueCard,
  updateValueCard,
  deleteValueCard,
  moveValueCard,
  type CardState,
} from "@/app/actions/value-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { rejectionReason, MAX_PHOTO_MB } from "@/lib/image-rules";

export type EditableCard = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  imageAlt: string | null;
  isVisible: boolean;
};

/**
 * The cards in the home page's "What we stand for" strip.
 *
 * Each card is its own form, saved on its own. One big form holding every
 * card would mean a single Save that either writes all of them or none, and a
 * validation slip on the fourth card would throw away edits to the first
 * three — which is exactly the shape of thing the café would hit while
 * changing one word.
 */
export function ValueCardManager({ cards }: { cards: EditableCard[] }) {
  return (
    <div className="space-y-5">
      {cards.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          No cards yet — the section is hidden until you add one.
        </p>
      ) : (
        <ul className="space-y-4">
          {cards.map((card, i) => (
            <li key={card.id}>
              <CardEditor card={card} index={i} total={cards.length} />
            </li>
          ))}
        </ul>
      )}

      {/* Keyed on the count: a successful add remounts this, which clears the
          typed words, the chosen file and the preview without an effect
          reaching in to reset them. */}
      <AddCardForm key={cards.length} />
    </div>
  );
}

/** Shared between the add and edit forms so they cannot drift apart. */
function PhotoField({
  id,
  currentUrl,
  required,
  onError,
  label,
  hint,
}: {
  id: string;
  currentUrl?: string | null;
  required?: boolean;
  onError: (message: string | null) => void;
  label: string;
  hint: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-start gap-3">
        {(preview || currentUrl) && (
          <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview ?? currentUrl!} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <input
            id={id}
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            required={required}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm hover:file:bg-neutral-200"
            onChange={(e) => {
              const file = e.target.files?.[0];
              onError(null);
              setPreview(null);
              if (!file) return;
              // Early feedback: an oversized file that reaches the server blows
              // the request body limit and returns an error page instead of a
              // message anyone can act on.
              const reason = rejectionReason(file);
              if (reason) {
                onError(reason);
                e.target.value = "";
                return;
              }
              setPreview(URL.createObjectURL(file));
            }}
          />
          <p className="text-xs text-neutral-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function Feedback({
  state,
  fileError,
  onDismiss,
}: {
  state: CardState;
  fileError: string | null;
  /** Clears the file error, re-enabling Save without choosing another file. */
  onDismiss: () => void;
}) {
  return (
    <>
      {fileError && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <p>{fileError}</p>
          {/* Save is disabled while this is showing, and nothing else clears
              it — cancelling the picker fires no event, and the rejected file
              has already been cleared off the input. Without a way out, one
              photo the browser will not take locks the whole form and the
              only escape is reloading and losing the edit.
              A card can be saved without touching its picture, so a file
              the browser refuses must not hold the words hostage.
              MenuItemForm has carried this same button for the same reason. */}
          <button
            type="button"
            onClick={onDismiss}
            className="mt-1 underline underline-offset-2"
          >
            Continue without a photo
          </button>
        </div>
      )}
      {state?.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">{state.message}</p>
      )}
      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      )}
    </>
  );
}

function CardEditor({
  card,
  index,
  total,
}: {
  card: EditableCard;
  index: number;
  total: number;
}) {
  const [state, formAction, pending] = useActionState<CardState, FormData>(
    updateValueCard,
    undefined,
  );
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.14em] text-neutral-400">
          Card {index + 1}
          {!card.isVisible && " · hidden"}
        </span>

        <div className="flex items-center gap-1">
          <form action={moveValueCard}>
            <input type="hidden" name="id" value={card.id} />
            <input type="hidden" name="direction" value="up" />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              disabled={index === 0}
              aria-label={`Move ${card.title} earlier`}
            >
              ↑
            </Button>
          </form>
          <form action={moveValueCard}>
            <input type="hidden" name="id" value={card.id} />
            <input type="hidden" name="direction" value="down" />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              disabled={index === total - 1}
              aria-label={`Move ${card.title} later`}
            >
              ↓
            </Button>
          </form>
          <form
            action={deleteValueCard}
            onSubmit={(e) => {
              if (!confirm(`Delete the “${card.title}” card? This cannot be undone.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={card.id} />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
          </form>
        </div>
      </div>

      <form
        action={formAction}
        onSubmit={(e) => {
          const input = e.currentTarget.elements.namedItem("photo") as HTMLInputElement | null;
          const file = input?.files?.[0];
          // A photo is optional here — the card already has one, or is happy
          // without. Only an unusable file is a reason to stop.
          const reason = file ? rejectionReason(file) : null;
          if (reason) {
            e.preventDefault();
            setFileError(reason);
          }
        }}
        className="space-y-3"
      >
        <input type="hidden" name="id" value={card.id} />

        <div className="space-y-2">
          <Label htmlFor={`title-${card.id}`}>Heading</Label>
          <Input
            id={`title-${card.id}`}
            name="title"
            defaultValue={card.title}
            required
            maxLength={60}
            placeholder="e.g. Baked this morning"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`body-${card.id}`}>Comment</Label>
          <Textarea
            id={`body-${card.id}`}
            name="body"
            defaultValue={card.body}
            rows={4}
            maxLength={400}
            placeholder={"One line per line.\nPress return for a new line.\nThree or four reads best."}
          />
          <p className="text-xs text-neutral-500">
            Each line you type is set on its own line on the card. Three or four short lines look
            best; long paragraphs get cut off on a phone.
          </p>
        </div>

        <PhotoField
          id={`photo-${card.id}`}
          currentUrl={card.imageUrl}
          onError={setFileError}
          label="Photo"
          hint={`Upright photos work best. JPG, PNG or WebP · up to ${MAX_PHOTO_MB} MB. Leave empty to keep the current one.`}
        />

        <div className="space-y-2">
          <Label htmlFor={`alt-${card.id}`}>Photo description</Label>
          <Input
            id={`alt-${card.id}`}
            name="alt"
            defaultValue={card.imageAlt ?? ""}
            maxLength={160}
            placeholder="e.g. A baker holding an almond croissant"
          />
          <p className="text-xs text-neutral-500">
            Read aloud to visitors who cannot see the photo, and shown if it fails to load.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            name="isVisible"
            defaultChecked={card.isVisible}
            className="h-4 w-4 accent-[#481819]"
          />
          Show this card on the website
        </label>

        <Feedback state={state} fileError={fileError} onDismiss={() => setFileError(null)} />

        <Button type="submit" size="sm" disabled={pending || fileError !== null}>
          {pending ? "Saving…" : "Save card"}
        </Button>
      </form>
    </div>
  );
}

function AddCardForm() {
  const [state, formAction, pending] = useActionState<CardState, FormData>(addValueCard, undefined);
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const input = e.currentTarget.elements.namedItem("photo") as HTMLInputElement | null;
        const file = input?.files?.[0];
        const reason = file ? rejectionReason(file) : null;
        if (reason) {
          e.preventDefault();
          setFileError(reason);
        }
      }}
      className="space-y-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4"
    >
      <h3 className="text-sm font-medium">Add a card</h3>

      <div className="space-y-2">
        <Label htmlFor="new-title">Heading</Label>
        <Input id="new-title" name="title" required maxLength={60} placeholder="e.g. Craft" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-body">Comment</Label>
        <Textarea
          id="new-body"
          name="body"
          rows={4}
          maxLength={400}
          placeholder={"One line per line.\nPress return for a new line."}
        />
      </div>

      <PhotoField
        id="new-photo"
        onError={setFileError}
        label="Photo (optional)"
        hint={`Upright photos work best. JPG, PNG or WebP · up to ${MAX_PHOTO_MB} MB. Without one the card uses brand artwork.`}
      />

      <div className="space-y-2">
        <Label htmlFor="new-alt">Photo description</Label>
        <Input id="new-alt" name="alt" maxLength={160} placeholder="What the photo shows" />
      </div>

      <Feedback state={state} fileError={fileError} onDismiss={() => setFileError(null)} />

      <Button type="submit" disabled={pending || fileError !== null}>
        {pending ? "Adding…" : "Add card"}
      </Button>
    </form>
  );
}
