
-- CreateTable
CREATE TABLE "CateringPage" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "headingSize" TEXT NOT NULL DEFAULT 'lg',
    "cardSize" TEXT NOT NULL DEFAULT 'md',
    "heroEyebrow" TEXT NOT NULL DEFAULT 'Catering',
    "heroHeading" TEXT NOT NULL DEFAULT 'Daar, wherever you gather',
    "heroBody" TEXT NOT NULL DEFAULT '',
    "heroPrimaryLabel" TEXT NOT NULL DEFAULT 'Start an enquiry',
    "heroSecondaryLabel" TEXT NOT NULL DEFAULT 'Explore',
    "heroImageUrl" TEXT,
    "heroImageAlt" TEXT,
    "corporateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "corporateNavLabel" TEXT NOT NULL DEFAULT 'Corporate',
    "corporateEyebrow" TEXT NOT NULL DEFAULT 'Corporate',
    "corporateHeading" TEXT NOT NULL DEFAULT '',
    "corporateBody" TEXT NOT NULL DEFAULT '',
    "corporatePrimaryLabel" TEXT NOT NULL DEFAULT 'Request a quote',
    "corporateSecondaryLabel" TEXT NOT NULL DEFAULT 'Download the catalogue',
    "catalogueUrl" TEXT,
    "hospitalityEnabled" BOOLEAN NOT NULL DEFAULT true,
    "hospitalityNavLabel" TEXT NOT NULL DEFAULT 'Hospitality',
    "hospitalityEyebrow" TEXT NOT NULL DEFAULT 'Hospitality',
    "hospitalityHeading" TEXT NOT NULL DEFAULT '',
    "hospitalityBody" TEXT NOT NULL DEFAULT '',
    "hospitalityTags" TEXT NOT NULL DEFAULT '',
    "hospitalityImageUrl" TEXT,
    "hospitalityImageAlt" TEXT,
    "stepsHeading" TEXT NOT NULL DEFAULT '',
    "hospitalityButtonLabel" TEXT NOT NULL DEFAULT 'Book a tasting',
    "supermarketEnabled" BOOLEAN NOT NULL DEFAULT true,
    "supermarketNavLabel" TEXT NOT NULL DEFAULT 'Supermarkets',
    "supermarketEyebrow" TEXT NOT NULL DEFAULT 'Supermarkets',
    "supermarketHeading" TEXT NOT NULL DEFAULT '',
    "supermarketBody" TEXT NOT NULL DEFAULT '',
    "supermarketButtonLabel" TEXT NOT NULL DEFAULT 'Become a stockist',
    "quoteEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quoteText" TEXT NOT NULL DEFAULT '',
    "quoteName" TEXT NOT NULL DEFAULT '',
    "enquiryEyebrow" TEXT NOT NULL DEFAULT 'Enquire',
    "enquiryHeading" TEXT NOT NULL DEFAULT '',
    "enquiryBody" TEXT NOT NULL DEFAULT '',
    "enquiryInterests" TEXT NOT NULL DEFAULT '',
    "enquiryButtonLabel" TEXT NOT NULL DEFAULT 'Send enquiry',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringItem" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "blurDataUrl" TEXT,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CateringItem_section_displayOrder_idx" ON "CateringItem"("section", "displayOrder");

-- Seed the page with the copy from the approved design, so /catering reads
-- correctly the moment this ships. Guarded so a re-run never overwrites
-- anything the café has since changed.
INSERT INTO "CateringPage" (
  "id", "heroBody", "heroImageUrl", "heroImageAlt",
  "corporateHeading", "corporateBody",
  "hospitalityHeading", "hospitalityBody", "hospitalityTags",
  "hospitalityImageUrl", "hospitalityImageAlt", "stepsHeading",
  "supermarketHeading", "supermarketBody",
  "quoteText", "quoteName",
  "enquiryHeading", "enquiryBody", "enquiryInterests",
  "updatedAt"
)
SELECT
  'singleton',
  'Corporate events at our Westlands home, outside catering for your office, and our viennoiserie and breads for your restaurant, hotel, school or supermarket.',
  '/brand/item-tart.jpg',
  'A raspberry tart from the Daar pastry kitchen',
  'Meetings, launches and celebrations',
  'From an early breakfast meeting to an evening reception, our chefs and event team plan the menu, set the space and look after every guest.',
  'Your bakery, without the bakery',
  'We create a pastry and bread menu for your restaurant, coffee shop, hotel or school, bake it fresh in our pastry section each night and deliver before you open.',
  E'Restaurants\nCoffee shops\nHotels\nSchools',
  '/brand/item-05.jpg',
  'A Daar baker holding an almond croissant',
  'From first tasting to your own menu',
  'Fresh bread. Better margins.',
  'Artisan loaves and pastries for independent stores and supermarket chains, under the Daar by Izzi name or your own private label.',
  'At Daar, our chefs keep it simple: great ingredients, thoughtful cooking, and food that makes you want another bite.',
  'Vikash Pandey · Executive Chef',
  'Tell us what you’re planning',
  'Our catering team replies within one working day with a proposal and, for larger orders, an invitation to taste at Daar.',
  E'An event at Daar\nOutside catering\nPastry and bread for my business\nStocking Daar in my store\nSomething else',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "CateringPage");

INSERT INTO "CateringItem" ("id", "section", "eyebrow", "title", "body", "details", "imageUrl", "imageAlt", "highlight", "displayOrder", "isVisible", "createdAt", "updatedAt")
SELECT * FROM (VALUES
  ('seed_cat_offer_events', 'offer', '', 'Events at Daar',
   'Host your team or clients on the fourth floor of The Mandrake. Breakfast meetings, half- and full-day sessions, cocktail receptions and celebration dinners, with screen, sound and a dedicated host.',
   E'Breakfast meeting from KES 2,200 per guest\nFull-day conference from KES 5,500 per guest\nCocktail reception from KES 4,500 per guest',
   '/brand/interior-01.jpg', 'The Daar dining room set for an event', false, 0, true, NOW(), NOW()),
  ('seed_cat_offer_outside', 'offer', '', 'Outside catering',
   'Cooked in our Westlands kitchen and delivered to your office or venue: boxed breakfasts and lunches, pastry and coffee breaks, buffets and staffed canapé receptions.',
   E'Breakfast box from KES 1,200\nDelivered buffet from KES 2,600 per guest\nStaffed buffet from KES 3,600 per guest',
   '/brand/packaging-marble.jpg', 'Daar boxes ready for delivery', false, 1, true, NOW(), NOW()),

  ('seed_cat_step_1', 'step', '', 'Discovery visit', 'We learn your customers, volumes and price points.', '', NULL, NULL, false, 0, true, NOW(), NOW()),
  ('seed_cat_step_2', 'step', '', 'Tasting at Daar', 'Your team tastes our range and shortlists favourites.', '', NULL, NULL, false, 1, true, NOW(), NOW()),
  ('seed_cat_step_3', 'step', '', 'Bespoke recipes', 'Sizes, fillings and a signature item made for you.', '', NULL, NULL, false, 2, true, NOW(), NOW()),
  ('seed_cat_step_4', 'step', '', 'Two-week pilot', 'Daily deliveries; we fine-tune against what sells.', '', NULL, NULL, false, 3, true, NOW(), NOW()),
  ('seed_cat_step_5', 'step', '', 'Your final menu', 'Agreed prices and schedule, refreshed each season.', '', NULL, NULL, false, 4, true, NOW(), NOW()),

  ('seed_cat_point_1', 'point', '', 'Our own ingredients', 'Real butter, quality flour and natural leaven, controlled by us from recipe to crate.', '', NULL, NULL, false, 0, true, NOW(), NOW()),
  ('seed_cat_point_2', 'point', '', 'Baked daily', 'Baked overnight in Westlands and on your shelves before your doors open.', '', NULL, NULL, false, 1, true, NOW(), NOW()),
  ('seed_cat_point_3', 'point', '', 'A real margin', 'Around 30% retailer margin at our suggested prices, with no distributor in between.', '', NULL, NULL, false, 2, true, NOW(), NOW()),

  ('seed_cat_option_a', 'option', 'Option A', 'Daar by Izzi label', 'Our brand and packaging, ready to stock in about two weeks. Low minimums, with in-store tastings to launch.', '', NULL, NULL, true, 0, true, NOW(), NOW()),
  ('seed_cat_option_b', 'option', 'Option B', 'Your private label', 'Your store brand on our bread, from recipes made to your spec. Exclusive to your stores.', '', NULL, NULL, false, 1, true, NOW(), NOW())
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM "CateringItem");

