-- Take every mention of prices and margins off the page. Only rewrites
-- text that is still exactly as seeded.
UPDATE "CateringPage" SET "supermarketHeading" = 'Fresh bread, on your shelves every morning.'
  WHERE "supermarketHeading" = 'Fresh bread. Better margins.';
UPDATE "CateringPage" SET "corporateNote" = 'Every event is planned around your menu and guest numbers — tell us what you’re planning and we’ll send a proposal.'
  WHERE "corporateNote" LIKE 'Every event is priced to your menu%';
UPDATE "CateringItem" SET "body" = 'We learn your customers, volumes and what sells.'
  WHERE "id" = 'seed_cat_step_1' AND "body" = 'We learn your customers, volumes and price points.';
UPDATE "CateringItem" SET "body" = 'An agreed range and delivery schedule, refreshed each season.'
  WHERE "id" = 'seed_cat_step_5' AND "body" = 'Agreed prices and schedule, refreshed each season.';
