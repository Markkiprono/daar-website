import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { Card, CardContent } from "@/components/ui/card";
import { StandForSectionForm } from "@/components/admin/StandForSectionForm";
import { ValueCardManager } from "@/components/admin/ValueCardManager";
import { HomePanelManager } from "@/components/admin/HomePanelManager";
import { HomeLabelsForm } from "@/components/admin/HomeLabelsForm";
import { DEFAULT_HEADING_SIZE, DEFAULT_CARD_SIZE } from "@/lib/home-sections";

export const dynamic = "force-dynamic";

/**
 * Home page sections whose content is more than a photograph.
 *
 * Its own page rather than another card on Photos or Settings: this is words,
 * pictures and ordering together, and it will grow — every future section that
 * is a list of things belongs here rather than making Settings longer.
 */
export default async function SectionsPage() {
  // Must precede every query — see the note in menu/page.tsx.
  await requireAdmin();

  const [settings, cards, panels] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
    db.valueCard.findMany({ orderBy: { displayOrder: "asc" } }),
    db.homePanel.findMany({ orderBy: { displayOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Sections</h1>
        <p className="mt-1 text-sm text-neutral-500">
          The parts of the home page that are made of words and pictures together. Everything here
          is live on the site the moment you save it — no one needs to redeploy anything.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-1 font-medium">The sliding panels</h2>
          <p className="mb-5 text-sm text-neutral-500">
            The full-screen panels just below the opening, which slide up over one another as you
            scroll. Each one is a sentence over a photograph — or over a short film, if you upload
            one.
          </p>
          <HomePanelManager
            panels={panels.map((p) => ({
              id: p.id,
              eyebrow: p.eyebrow,
              line: p.line,
              imageUrl: p.imageUrl,
              imageAlt: p.imageAlt,
              linkOneLabel: p.linkOneLabel,
              linkOneHref: p.linkOneHref,
              linkTwoLabel: p.linkTwoLabel,
              linkTwoHref: p.linkTwoHref,
              isVisible: p.isVisible,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-1 font-medium">&ldquo;What we stand for&rdquo;</h2>
          <p className="mb-5 text-sm text-neutral-500">
            The strip of cards partway down the home page. On a phone they can be swiped through
            one at a time; on a computer they sit in a row.
          </p>

          <StandForSectionForm
            values={{
              enabled: settings?.standForEnabled ?? true,
              eyebrow: settings?.standForEyebrow ?? "",
              heading: settings?.standForHeading ?? "What we stand for",
              headingSize: settings?.standForHeadingSize ?? DEFAULT_HEADING_SIZE,
              cardSize: settings?.standForCardSize ?? DEFAULT_CARD_SIZE,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-1 font-medium">The cards</h2>
          <p className="mb-5 text-sm text-neutral-500">
            Each card is saved on its own, so you can fix one word without touching the rest. Use
            the arrows to change the order they appear in.
          </p>

          <ValueCardManager
            cards={cards.map((c) => ({
              id: c.id,
              title: c.title,
              body: c.body,
              imageUrl: c.imageUrl,
              imageAlt: c.imageAlt,
              isVisible: c.isVisible,
            }))}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-1 font-medium">Every other word on the home page</h2>
          <p className="mb-5 text-sm text-neutral-500">
            The small labels and headings above each section. These used to be written into the
            page itself, so changing one meant a developer. They are yours now.
          </p>
          <HomeLabelsForm
            values={{
              heroEyebrow: settings?.heroEyebrow ?? "",
              heroPrimaryLabel: settings?.heroPrimaryLabel ?? "",
              heroSecondaryLabel: settings?.heroSecondaryLabel ?? "",
              counterEyebrow: settings?.counterEyebrow ?? "",
              counterHeading: settings?.counterHeading ?? "",
              chefEyebrow: settings?.chefEyebrow ?? "",
              featuredBadge: settings?.featuredBadge ?? "",
              storyEyebrow: settings?.storyEyebrow ?? "",
              closingEyebrow: settings?.closingEyebrow ?? "",
              closingHeading: settings?.closingHeading ?? "",
              visitEyebrow: settings?.visitEyebrow ?? "",
              visitHeading: settings?.visitHeading ?? "",
              homeHeadingSize: settings?.homeHeadingSize ?? DEFAULT_HEADING_SIZE,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
