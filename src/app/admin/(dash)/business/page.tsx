import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { Card, CardContent } from "@/components/ui/card";
import { CateringSectionForm, type CateringField } from "@/components/admin/CateringSectionForm";
import {
  CateringItemManager,
  type EditableCateringItem,
  type ItemShape,
} from "@/components/admin/CateringItemManager";
import type { CateringSection } from "@/lib/catering-shared";
import { DEFAULT_HEADING_SIZE, DEFAULT_CARD_SIZE } from "@/lib/home-sections";

export const dynamic = "force-dynamic";

function Block({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-1 font-medium">{title}</h2>
        <p className="mb-5 text-sm text-neutral-500">{intro}</p>
        {children}
      </CardContent>
    </Card>
  );
}

/** The For Business page (/business) — every word, photo and size on it. */
export default async function CateringAdminPage() {
  await requireAdmin();

  const [page, items] = await Promise.all([
    db.cateringPage.findUnique({ where: { id: "singleton" } }),
    db.cateringItem.findMany({ orderBy: { displayOrder: "asc" } }),
  ]);

  const p = page;
  const v = (key: keyof NonNullable<typeof p>, fallback = "") => {
    const value = p?.[key];
    return typeof value === "string" ? value : fallback;
  };
  // A photo the café uploaded, as opposed to the built-in brand artwork.
  const custom = (url: string | null | undefined) => Boolean(url && !url.startsWith("/brand/"));
  const flag = (key: keyof NonNullable<typeof p>) => (p ? Boolean(p[key]) : true);

  const listOf = (section: CateringSection): EditableCateringItem[] =>
    items
      .filter((i) => i.section === section)
      .map((i) => ({
        id: i.id,
        eyebrow: i.eyebrow,
        title: i.title,
        body: i.body,
        details: i.details,
        imageUrl: i.imageUrl,
        imageAlt: i.imageAlt,
        highlight: i.highlight,
        isVisible: i.isVisible,
      }));

  const list = (section: CateringSection, shape: ItemShape) => (
    <CateringItemManager section={section} shape={shape} items={listOf(section)} />
  );

  const eyebrow = (name: string, value: string): CateringField => ({
    name,
    label: "Small label above the heading",
    kind: "input",
    value,
    max: 60,
    hint: "The section number (01, 02…) is added for you. Leave empty for no label.",
  });
  const heading = (name: string, value: string): CateringField => ({
    name,
    label: "Heading",
    kind: "input",
    value,
    max: 120,
  });
  const comment = (name: string, value: string): CateringField => ({
    name,
    label: "Comment",
    kind: "textarea",
    value,
    max: 600,
  });
  const button = (name: string, value: string, label = "Button wording"): CateringField => ({
    name,
    label,
    kind: "input",
    value,
    max: 40,
    hint: "Leave empty to hide the button. It scrolls down to the enquiry form.",
  });
  const tab = (name: string, value: string): CateringField => ({
    name,
    label: "Name on the strip of tabs",
    kind: "input",
    value,
    max: 40,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">For Business</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Everything on the{" "}
          <a href="/business" target="_blank" rel="noreferrer" className="underline">
            For Business page
          </a>
          . Each box saves on its own and is live the moment you save. Enquiries sent from the page
          arrive in Messages.
        </p>
      </div>

      <Block title="The page" intro="Its name, whether it is shown, and how large headings and cards are.">
        <CateringSectionForm
          group="page"
          fields={[
            {
              name: "enabled",
              label: "Show this page",
              kind: "switch",
              value: flag("enabled"),
              hint: "Off hides the page and removes it from the menu bar and footer.",
            },
            {
              name: "navLabel",
              label: "Name in the menu bar and footer",
              kind: "input",
              value: v("navLabel", "For Business"),
              max: 40,
              placeholder: "For Business",
            },
          ]}
          sizes={{
            headingSize: v("headingSize", DEFAULT_HEADING_SIZE),
            cardSize: v("cardSize", DEFAULT_CARD_SIZE),
          }}
        />
      </Block>

      <Block title="The opening" intro="The top of the page: heading, introduction, two buttons and a photo.">
        <CateringSectionForm
          group="hero"
          fields={[
            { name: "heroEyebrow", label: "Small label above the heading", kind: "input", value: v("heroEyebrow"), max: 60 },
            { name: "heroHeading", label: "Heading", kind: "input", value: v("heroHeading"), max: 120 },
            { name: "heroBody", label: "Comment", kind: "textarea", value: v("heroBody"), max: 600 },
            button("heroPrimaryLabel", v("heroPrimaryLabel"), "First button (to the enquiry form)"),
            {
              name: "heroSecondaryLabel",
              label: "Second button (scrolls to the first section)",
              kind: "input",
              value: v("heroSecondaryLabel"),
              max: 40,
              hint: "Leave empty to hide it.",
            },
            { name: "heroImageAlt", label: "Photo description", kind: "input", value: v("heroImageAlt"), max: 160 },
          ]}
          photo={{
            currentUrl: p?.heroImageUrl ?? "/brand/item-tart.jpg",
            label: "Photo",
            removeLabel: custom(p?.heroImageUrl) ? "Go back to the original photo" : undefined,
          }}
        />
      </Block>

      <Block title="01 · Corporate" intro="Events at Daar and outside catering.">
        <CateringSectionForm
          group="corporate"
          fields={[
            { name: "corporateEnabled", label: "Show this section", kind: "switch", value: flag("corporateEnabled") },
            tab("corporateNavLabel", v("corporateNavLabel")),
            eyebrow("corporateEyebrow", v("corporateEyebrow")),
            heading("corporateHeading", v("corporateHeading")),
            comment("corporateBody", v("corporateBody")),
            button("corporatePrimaryLabel", v("corporatePrimaryLabel"), "Quote button"),
            {
              name: "corporateSecondaryLabel",
              label: "Catalogue button",
              kind: "input",
              value: v("corporateSecondaryLabel"),
              max: 40,
              hint: "Only shows once a catalogue is added below.",
            },
            {
              name: "corporateNote",
              label: "Line under the cards",
              kind: "textarea",
              value: v("corporateNote"),
              max: 300,
              hint: "e.g. how events are priced. Leave empty to hide it.",
            },
          ]}
          catalogue={{ currentUrl: p?.catalogueUrl ?? null }}
        />
        <h3 className="mb-3 mt-8 text-sm font-medium">The cards</h3>
        {list("offer", { noun: "Card", details: true, photo: true })}
      </Block>

      <Block title="02 · Hospitality" intro="Pastry and bread for restaurants, coffee shops, hotels and schools.">
        <CateringSectionForm
          group="hospitality"
          fields={[
            { name: "hospitalityEnabled", label: "Show this section", kind: "switch", value: flag("hospitalityEnabled") },
            tab("hospitalityNavLabel", v("hospitalityNavLabel")),
            eyebrow("hospitalityEyebrow", v("hospitalityEyebrow")),
            heading("hospitalityHeading", v("hospitalityHeading")),
            comment("hospitalityBody", v("hospitalityBody")),
            {
              name: "hospitalityTags",
              label: "Who it's for (small pills)",
              kind: "textarea",
              value: v("hospitalityTags"),
              max: 400,
              hint: "One per line.",
            },
            { name: "stepsHeading", label: "Heading above the steps", kind: "input", value: v("stepsHeading"), max: 120 },
            button("hospitalityButtonLabel", v("hospitalityButtonLabel")),
            { name: "hospitalityImageAlt", label: "Photo description", kind: "input", value: v("hospitalityImageAlt"), max: 160 },
          ]}
          photo={{
            currentUrl: p?.hospitalityImageUrl ?? "/brand/item-05.jpg",
            label: "Photo",
            removeLabel: custom(p?.hospitalityImageUrl) ? "Go back to the original photo" : undefined,
          }}
        />
        <h3 className="mb-3 mt-8 text-sm font-medium">The steps (numbered for you, in this order)</h3>
        {list("step", { noun: "Step" })}
      </Block>

      <Block title="03 · Supermarkets" intro="Bread and pastry for stores, under Daar's label or theirs.">
        <CateringSectionForm
          group="supermarket"
          fields={[
            { name: "supermarketEnabled", label: "Show this section", kind: "switch", value: flag("supermarketEnabled") },
            tab("supermarketNavLabel", v("supermarketNavLabel")),
            eyebrow("supermarketEyebrow", v("supermarketEyebrow")),
            heading("supermarketHeading", v("supermarketHeading")),
            comment("supermarketBody", v("supermarketBody")),
            button("supermarketButtonLabel", v("supermarketButtonLabel")),
            {
              name: "supermarketImageAlt",
              label: "Photo description",
              kind: "input",
              value: v("supermarketImageAlt"),
              max: 160,
            },
          ]}
          photo={{
            currentUrl: p?.supermarketImageUrl ?? null,
            label: "Wide photo under the heading (optional)",
            hint: "Wide landscape photos work best — e.g. bread on a shelf.",
            removeLabel: "Remove the photo",
          }}
        />
        <h3 className="mb-3 mt-8 text-sm font-medium">The reasons (row of cards)</h3>
        {list("point", { noun: "Reason", photo: true })}
        <h3 className="mb-3 mt-8 text-sm font-medium">The options</h3>
        {list("option", { noun: "Option", eyebrow: true, highlight: true, photo: true })}
      </Block>

      <Block title="The quote" intro="Off for now. Switch it on and write a quote to show a line in large italics above the enquiry form.">
        <CateringSectionForm
          group="quote"
          fields={[
            { name: "quoteEnabled", label: "Show the quote", kind: "switch", value: flag("quoteEnabled") },
            { name: "quoteText", label: "Quote", kind: "textarea", value: v("quoteText"), max: 400, hint: "No quote marks needed — they're added for you." },
            { name: "quoteName", label: "Who said it", kind: "input", value: v("quoteName"), max: 120, placeholder: "e.g. Vikash Pandey · Executive Chef" },
          ]}
        />
      </Block>

      <Block
        title="The enquiry form"
        intro="The form at the bottom. The phone, email and address beside it come from Settings."
      >
        <CateringSectionForm
          group="enquiry"
          fields={[
            { name: "enquiryEyebrow", label: "Small label above the heading", kind: "input", value: v("enquiryEyebrow"), max: 60 },
            heading("enquiryHeading", v("enquiryHeading")),
            comment("enquiryBody", v("enquiryBody")),
            {
              name: "enquiryQuestion",
              label: "Question above the choices",
              kind: "input",
              value: v("enquiryQuestion", "What can we help you with?"),
              max: 120,
            },
            {
              name: "enquiryInterests",
              label: "The choices",
              kind: "textarea",
              value: v("enquiryInterests"),
              max: 1000,
              placeholder: "An event at Daar | Meetings, launches and dinners in our Westlands home",
              hint: "One choice per line: the title, then a | and a short line explaining it. Each becomes a card on the form. Four reads best. The one someone picks is shown at the top of their message.",
            },
            { name: "enquiryButtonLabel", label: "Send button", kind: "input", value: v("enquiryButtonLabel"), max: 40 },
          ]}
        />
      </Block>
    </div>
  );
}
