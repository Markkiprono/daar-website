import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { Card, CardContent } from "@/components/ui/card";
import { PhotoSlot } from "@/components/admin/PhotoSlot";
import { HeroVideoSlot } from "@/components/admin/HeroVideoSlot";
import { StoryGallery } from "@/components/admin/StoryGallery";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-5 font-medium">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

export default async function PhotosPage() {
  // Must precede every query — see the note in menu/page.tsx.
  await requireAdmin();

  const [settings, gallery] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
    db.storyPhoto.findMany({ orderBy: { displayOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Photos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Replace the images across the public site. Leave any empty to keep the built-in brand
          photo. Uploads are resized and optimised automatically.
        </p>
      </div>

      <Section title="Home page">
        <div className="space-y-6">
          <PhotoSlot
            slot="hero"
            title="Hero background"
            description="The full-screen photo behind the headline on the home page. Landscape works best. Kept as the still frame under any video below."
            current={settings?.heroImageUrl ?? null}
            aspect="aspect-[16/9]"
          />
          <HeroVideoSlot current={settings?.heroVideoUrl ?? null} />
        </div>
      </Section>

      <Section title="Story page">
        <div className="space-y-6">
          <PhotoSlot
            slot="story"
            title="Main story photo"
            description="The large photo near the top of the Story page."
            current={settings?.storyImageUrl ?? null}
            aspect="aspect-[16/10]"
          />
          <div>
            <h3 className="mb-1 text-sm font-medium">Gallery</h3>
            <p className="mb-4 text-xs text-neutral-500">
              The grid of photos further down the Story page. Drag order with the arrows.
            </p>
            <StoryGallery
              photos={gallery.map((p) => ({ id: p.id, imageUrl: p.imageUrl, imageAlt: p.imageAlt }))}
            />
          </div>
        </div>
      </Section>

      <Section title="Visit & Reserve pages">
        <PhotoSlot
          slot="visit"
          title="Interior photo"
          description="Shown on both the Visit and Reserve pages. Portrait orientation."
          current={settings?.visitImageUrl ?? null}
          aspect="aspect-[3/4]"
        />
      </Section>

      <Section title="Browser tab icon (favicon)">
        <PhotoSlot
          slot="favicon"
          favicon
          title="Favicon"
          description="The small icon in the browser tab. A square PNG or SVG, ideally 512×512. Defaults to the Daar door mark."
          current={settings?.faviconUrl ?? null}
        />
      </Section>
    </div>
  );
}
