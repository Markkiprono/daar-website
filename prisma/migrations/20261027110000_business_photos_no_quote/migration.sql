-- A photo slot for the Supermarkets section, and the chef's quote taken off
-- the For Business page (the slot stays in the dashboard, switched off).
ALTER TABLE "CateringPage" ADD COLUMN "supermarketImageUrl" TEXT,
ADD COLUMN "supermarketImageAlt" TEXT;

UPDATE "CateringPage" SET "quoteEnabled" = false, "quoteText" = '', "quoteName" = ''
  WHERE "quoteName" = 'Vikash Pandey · Executive Chef';

ALTER TABLE "CateringPage" ALTER COLUMN "quoteEnabled" SET DEFAULT false;
