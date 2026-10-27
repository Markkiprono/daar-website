-- The page is now "For Business": an editable menu name, a note under the
-- corporate cards, and no prices on the page. Each wording update only
-- touches text that is still exactly as first seeded, so anything the café
-- has already changed is left alone.
ALTER TABLE "CateringPage" ADD COLUMN "navLabel" TEXT NOT NULL DEFAULT 'For Business',
ADD COLUMN "corporateNote" TEXT NOT NULL DEFAULT '';

UPDATE "CateringPage" SET "heroEyebrow" = 'Daar for business' WHERE "heroEyebrow" = 'Catering';
UPDATE "CateringPage" SET "corporatePrimaryLabel" = 'Request a proposal' WHERE "corporatePrimaryLabel" = 'Request a quote';
UPDATE "CateringPage" SET "corporateNote" = 'Every event is priced to your menu and guest numbers — tell us what you’re planning and we’ll send a proposal.' WHERE "corporateNote" = '';
UPDATE "CateringPage" SET "heroBody" = 'Corporate events at our Westlands home, catering delivered to your office, and our viennoiserie and breads for your restaurant, hotel, school or supermarket.'
  WHERE "heroBody" = 'Corporate events at our Westlands home, outside catering for your office, and our viennoiserie and breads for your restaurant, hotel, school or supermarket.';

UPDATE "CateringItem" SET "details" = E'Breakfast meetings and working lunches\nHalf- and full-day conferences\nCocktail receptions and celebration dinners'
  WHERE "id" = 'seed_cat_offer_events' AND "details" LIKE 'Breakfast meeting from KES 2,200%';
UPDATE "CateringItem" SET "details" = E'Boxed breakfasts and lunches\nPastry and coffee breaks\nDelivered or staffed buffets'
  WHERE "id" = 'seed_cat_offer_outside' AND "details" LIKE 'Breakfast box from KES 1,200%';
