"use client";

import { useActionState, useState } from "react";
import { updateSettings, type SettingsState } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export type SettingsValues = {
  addressLine: string;
  phone: string;
  whatsapp: string;
  email: string;
  mapEmbedUrl: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  heroHeadline: string;
  heroSubcopy: string;
  storyTitle: string;
  storyBody: string;
  reservationsEnabled: boolean;
  maxPartySize: number;
  reservationNote: string;
  currency: string;
  logoMarkUrl: string;
  logoWordmarkUrl: string;
};

const MAX_LOGO_MB = 2;

/** One logo slot: preview, replace, remove. */
function LogoSlot({
  slot,
  label,
  hint,
  current,
}: {
  slot: "mark" | "wordmark";
  label: string;
  hint: string;
  current: string;
}) {
  const [preview, setPreview] = useState<string>(current);
  const [remove, setRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-md border border-neutral-200 p-4">
      <Label htmlFor={`logo-${slot}`}>{label}</Label>
      <p className="mt-1 text-xs text-neutral-500">{hint}</p>

      {preview && !remove && (
        <div className="mt-3 flex items-center gap-4">
          {/* Checkerboard reveals transparency; dark swatch shows how it
              looks in the navbar, which sits on near-black. */}
          <div
            className="grid h-16 w-24 place-items-center rounded border border-neutral-200"
            style={{
              backgroundImage:
                "linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)",
              backgroundSize: "12px 12px",
              backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={`${label} preview`} className="max-h-14 max-w-20 object-contain" />
          </div>
          <div className="grid h-16 w-24 place-items-center rounded bg-[#12100f]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" aria-hidden className="max-h-14 max-w-20 object-contain" />
          </div>
        </div>
      )}

      <input
        id={`logo-${slot}`}
        name={`logo-${slot}`}
        type="file"
        accept="image/svg+xml,image/png,image/webp,image/jpeg"
        disabled={remove}
        onChange={(e) => {
          const file = e.target.files?.[0];
          setError(null);
          if (!file) {
            setPreview(current);
            return;
          }
          if (file.size > MAX_LOGO_MB * 1024 * 1024) {
            setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_LOGO_MB} MB.`);
            e.target.value = "";
            setPreview(current);
            return;
          }
          setPreview(URL.createObjectURL(file));
        }}
        className="mt-3 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm disabled:opacity-50"
      />

      {error && (
        <p role="alert" className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {current && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            name={`remove-${slot}`}
            checked={remove}
            onChange={(e) => setRemove(e.target.checked)}
            className="h-4 w-4 accent-[#481819]"
          />
          Remove this logo
        </label>
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="font-medium">{title}</h2>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateSettings,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5 pb-28">
      <Section
        title="Logo"
        hint="SVG is best — it stays sharp at any size. PNG and WebP also work. Max 2 MB."
      >
        <p className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-600">
          The site tints the logo — tan on dark sections, oxblood on light ones. For that to work,
          export it <strong>monochrome with no baked-in fill colour</strong>. If your file has a
          colour fixed in it, it will always render that colour; upload it anyway and tell me, and
          I&apos;ll switch those spots to show it as-is. The two previews below show it on white and
          on the navbar&apos;s near-black.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <LogoSlot
            slot="mark"
            label="Door mark"
            hint="The icon alone. Used in the navbar, footer and admin login."
            current={values.logoMarkUrl}
          />
          <LogoSlot
            slot="wordmark"
            label="Wordmark (optional)"
            hint="“DAAR by izzi” lockup. Not used yet — reserved for larger brand moments."
            current={values.logoWordmarkUrl}
          />
        </div>
      </Section>

      <Section title="Contact" hint="Shown on Visit, Story and in the footer.">
        <div className="space-y-2">
          <Label htmlFor="addressLine">Address</Label>
          <Input id="addressLine" name="addressLine" defaultValue={values.addressLine} required maxLength={200} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={values.phone} placeholder="+254 7…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" name="whatsapp" type="tel" defaultValue={values.whatsapp} placeholder="+254 7…" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={values.email} />
        </div>
      </Section>

      <Section
        title="Map"
        hint="Paste a Google Maps EMBED link. Only google.com/maps/embed links are accepted."
      >
        <details className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-600">
          <summary className="cursor-pointer font-medium text-neutral-800">
            How to get the embed link
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>Open Google Maps and search for Daar.</li>
            <li>Click <strong>Share</strong>, then the <strong>Embed a map</strong> tab.</li>
            <li>Click <strong>COPY HTML</strong>.</li>
            <li>
              Paste it below — you can paste the whole <code>&lt;iframe…&gt;</code> tag and only the
              address inside <code>src=&quot;…&quot;</code> is what&apos;s needed, so copy just that part.
            </li>
          </ol>
          <p className="mt-2">It should look like: <code>https://www.google.com/maps/embed?pb=…</code></p>
        </details>
        <div className="space-y-2">
          <Label htmlFor="mapEmbedUrl">Map embed URL</Label>
          <Textarea
            id="mapEmbedUrl"
            name="mapEmbedUrl"
            defaultValue={values.mapEmbedUrl}
            rows={3}
            placeholder="https://www.google.com/maps/embed?pb=..."
            className="font-mono text-xs"
          />
          <p className="text-xs text-neutral-500">
            Leave empty to show the address panel with map buttons instead.
          </p>
        </div>
      </Section>

      <Section title="Social" hint="A full URL or just the handle — both work.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" name="instagram" defaultValue={values.instagram} placeholder="@daar" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tiktok">TikTok</Label>
            <Input id="tiktok" name="tiktok" defaultValue={values.tiktok} placeholder="@daar" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input id="facebook" name="facebook" defaultValue={values.facebook} />
          </div>
        </div>
      </Section>

      <Section title="Home page">
        <div className="space-y-2">
          <Label htmlFor="heroHeadline">Hero headline</Label>
          <Input id="heroHeadline" name="heroHeadline" defaultValue={values.heroHeadline} required maxLength={120} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="heroSubcopy">Hero subcopy</Label>
          <Input id="heroSubcopy" name="heroSubcopy" defaultValue={values.heroSubcopy} maxLength={300} />
        </div>
      </Section>

      <Section title="Story page" hint="Leave a blank line between paragraphs.">
        <div className="space-y-2">
          <Label htmlFor="storyTitle">Story title</Label>
          <Input id="storyTitle" name="storyTitle" defaultValue={values.storyTitle} required maxLength={120} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="storyBody">Story</Label>
          <Textarea id="storyBody" name="storyBody" defaultValue={values.storyBody} rows={10} maxLength={6000} />
        </div>
      </Section>

      <Section title="Reservations">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="reservationsEnabled">Accept online bookings</Label>
            <p className="text-xs text-neutral-500">Turn off to show a &ldquo;please call us&rdquo; message.</p>
          </div>
          <Switch
            id="reservationsEnabled"
            name="reservationsEnabled"
            defaultChecked={values.reservationsEnabled}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="maxPartySize">Max party size</Label>
            <Input
              id="maxPartySize"
              name="maxPartySize"
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              defaultValue={values.maxPartySize}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" name="currency" defaultValue={values.currency} maxLength={8} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reservationNote">Note above the booking form</Label>
          <Input
            id="reservationNote"
            name="reservationNote"
            defaultValue={values.reservationNote}
            maxLength={300}
            placeholder="Groups over 8, please call us."
          />
        </div>
      </Section>

      {/* Sticky so Save is always reachable on a phone without scrolling back. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          {state?.error && (
            <p role="alert" className="flex-1 truncate text-sm text-red-700">
              {state.error}
            </p>
          )}
          {state?.ok && <p className="flex-1 text-sm text-green-700">Saved.</p>}
          {!state && <span className="flex-1" />}
          <Button type="submit" disabled={pending} size="lg" className="h-11 px-8">
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </form>
  );
}
