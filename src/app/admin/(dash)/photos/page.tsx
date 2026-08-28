import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { Card, CardContent } from "@/components/ui/card";
import { PhotoSlot } from "@/components/admin/PhotoSlot";
import { HeroVideoSlot } from "@/components/admin/HeroVideoSlot";
import { PhotoGallery } from "@/components/admin/PhotoGallery";
import {
  addStoryPhoto,
  deleteStoryPhoto,
  moveStoryPhoto,
  addHomePhoto,
  deleteHomePhoto,
  moveHomePhoto,
} from "@/app/actions/site-photos";

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

  const [settings, gallery, band] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
    db.storyPhoto.findMany({ orderBy: { displayOrder: "asc" } }),
    db.homePhoto.findMany({ orderBy: { displayOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Photos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Replace the images across the public site. Leave any empty to keep the built-in brand
          photo. Uploads are resized and optimised automatically.
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          Most of these take a short video as well as a photo. A film plays silently, repeats, and
          never starts for anyone who has asked their phone to reduce motion or save data — they
          keep the photo instead. A film plays in the one place you put it and nowhere else.
        </p>
      </div>

      <Section title="Home page — the opening">
        <div className="space-y-6">
          <PhotoSlot
            slot="hero"
            title="Hero background"
            description="The full-screen photo behind the headline — the first thing anyone sees. Landscape works best. Put a short film here instead and it plays silently at the top of the page, on a loop."
            current={settings?.heroImageUrl ?? null}
            aspect="aspect-[16/9]"
            allowVideo
          />
          <PhotoSlot
            slot="chef"
            title="The chef"
            description="Portrait beside the welcome on the home page. Upright works best. The words themselves live under Settings."
            current={settings?.chefImageUrl ?? null}
            aspect="aspect-[3/4]"
            allowVideo
          />
          <PhotoSlot
            slot="storyBand"
            title="“Daar means home” photo"
            description="The arch-shaped photo beside the story on the home page. Has its own brand photo until you set one — it used to repeat the Story page photo."
            current={settings?.storyBandImageUrl ?? null}
            aspect="aspect-[3/4]"
            allowVideo
          />
        </div>
      </Section>

      <Section title="Home page — the closing band">
        <div className="space-y-6">
          <PhotoSlot
            slot="closing"
            title="“Patience tastes better” background"
            description="The last full-screen section before the address. Setting anything here makes the section appear even without a film below."
            current={settings?.closingImageUrl ?? null}
            aspect="aspect-[16/9]"
            allowVideo
          />
          <HeroVideoSlot current={settings?.heroVideoUrl ?? null} />
        </div>
      </Section>

      <Section title="Home page — “What today looks like”">
        <p className="-mt-2 mb-4 text-sm text-neutral-500">
          The band of pictures that drifts across the home page. Left empty it fills itself with
          menu photographs, picked afresh on every visit. Add one photo here and it shows exactly
          what you choose instead, in this order.
        </p>
        <PhotoGallery
          photos={band.map((p) => ({ id: p.id, imageUrl: p.imageUrl, imageAlt: p.imageAlt }))}
          addAction={addHomePhoto}
          deleteAction={deleteHomePhoto}
          moveAction={moveHomePhoto}
          emptyMessage="No photos chosen — the band is picking menu photographs at random."
          addTitle="Add a photo to the band"
          submitLabel="Add to the band"
          confirmMessage="Remove this photo from the band?"
        />
      </Section>

      <Section title="Story page">
        <div className="space-y-6">
          <PhotoSlot
            slot="story"
            title="Main story photo"
            description="The large photo near the top of the Story page."
            current={settings?.storyImageUrl ?? null}
            aspect="aspect-[16/10]"
            allowVideo
          />
          <div>
            <h3 className="mb-1 text-sm font-medium">Gallery</h3>
            <p className="mb-4 text-xs text-neutral-500">
              The grid of photos further down the Story page. Drag order with the arrows.
            </p>
            <PhotoGallery
              photos={gallery.map((p) => ({ id: p.id, imageUrl: p.imageUrl, imageAlt: p.imageAlt }))}
              addAction={addStoryPhoto}
              deleteAction={deleteStoryPhoto}
              moveAction={moveStoryPhoto}
              emptyMessage="No gallery photos yet — the Story page uses default brand images until you add some."
              confirmMessage="Remove this photo from the gallery?"
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
          allowVideo
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
