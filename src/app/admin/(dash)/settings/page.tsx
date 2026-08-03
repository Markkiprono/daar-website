import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { updateHours } from "@/app/actions/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { Button } from "@/components/ui/button";
import { DAY_NAMES } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Socials are free-form JSON; read one key defensively. */
function social(value: unknown, key: string): string {
  if (!value || typeof value !== "object") return "";
  const v = (value as Record<string, unknown>)[key];
  return typeof v === "string" ? v : "";
}

export default async function AdminSettingsPage() {
  // Must precede every query — see the note in menu/page.tsx.
  await requireAdmin();

  const [settings, hours] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
    db.openingHours.findMany({ orderBy: { dayOfWeek: "asc" } }),
  ]);

  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-medium">Settings</h1>
        <p className="text-sm text-neutral-500">
          Everything here appears on the public site.
        </p>
      </div>

      {/* Hours saves separately — seven rows in one submit. */}
      <form action={updateHours} className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="font-medium">Opening hours</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Used on Visit and to block bookings on days you&apos;re closed.
        </p>

        <div className="mt-4 space-y-2">
          {Array.from({ length: 7 }, (_, day) => {
            const h = byDay.get(day);
            return (
              <div key={day} className="flex flex-wrap items-center gap-3 border-b border-neutral-100 py-2 last:border-0">
                <span className="w-24 shrink-0 text-sm">{DAY_NAMES[day]}</span>

                <input
                  type="time"
                  name={`open-${day}`}
                  defaultValue={h?.openTime ?? "07:00"}
                  className="h-10 rounded-md border border-neutral-300 px-2 text-sm"
                  aria-label={`${DAY_NAMES[day]} opening time`}
                />
                <span className="text-neutral-400">—</span>
                <input
                  type="time"
                  name={`close-${day}`}
                  defaultValue={h?.closeTime ?? "21:00"}
                  className="h-10 rounded-md border border-neutral-300 px-2 text-sm"
                  aria-label={`${DAY_NAMES[day]} closing time`}
                />

                <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    name={`closed-${day}`}
                    defaultChecked={h?.isClosed ?? false}
                    className="h-4 w-4 accent-[#481819]"
                  />
                  Closed
                </label>
              </div>
            );
          })}
        </div>

        <Button type="submit" className="mt-4">
          Save hours
        </Button>
      </form>

      <SettingsForm
        values={{
          addressLine: settings?.addressLine ?? "",
          phone: settings?.phone ?? "",
          whatsapp: settings?.whatsapp ?? "",
          email: settings?.email ?? "",
          mapEmbedUrl: settings?.mapEmbedUrl ?? "",
          latitude: settings?.latitude ?? "",
          longitude: settings?.longitude ?? "",
          priceRange: settings?.priceRange ?? "",
          instagram: social(settings?.socials, "instagram"),
          tiktok: social(settings?.socials, "tiktok"),
          facebook: social(settings?.socials, "facebook"),
          heroHeadline: settings?.heroHeadline ?? "",
          heroSubcopy: settings?.heroSubcopy ?? "",
          storyTitle: settings?.storyTitle ?? "",
          storyBody: settings?.storyBody ?? "",
          reservationsEnabled: settings?.reservationsEnabled ?? true,
          maxPartySize: settings?.maxPartySize ?? 12,
          reservationNote: settings?.reservationNote ?? "",
          currency: settings?.currency ?? "KES",
          logoMarkUrl: settings?.logoMarkUrl ?? "",
          logoWordmarkUrl: settings?.logoWordmarkUrl ?? "",
        }}
      />
    </div>
  );
}
