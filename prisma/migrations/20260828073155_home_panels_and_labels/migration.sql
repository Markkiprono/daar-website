-- The three sliding panels become rows, and every fixed label on the home
-- page becomes a column.
--
-- ORDER MATTERS HERE. Prisma's generated version dropped panelOneImageUrl and
-- its siblings first, which would have thrown away photographs the café had
-- uploaded. The table is created and filled from those columns before
-- anything is dropped.

-- 1. Every label that used to be written into src/app/page.tsx.
ALTER TABLE "SiteSettings"
ADD COLUMN     "chefEyebrow" TEXT NOT NULL DEFAULT 'From the kitchen',
ADD COLUMN     "closingEyebrow" TEXT NOT NULL DEFAULT 'Come and see',
ADD COLUMN     "closingHeading" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "counterEyebrow" TEXT NOT NULL DEFAULT 'On the counter',
ADD COLUMN     "counterHeading" TEXT NOT NULL DEFAULT 'What today looks like',
ADD COLUMN     "featuredBadge" TEXT NOT NULL DEFAULT 'Chef''s Special',
ADD COLUMN     "heroEyebrow" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "heroPrimaryLabel" TEXT NOT NULL DEFAULT 'Explore the menu',
ADD COLUMN     "heroSecondaryLabel" TEXT NOT NULL DEFAULT 'Find us',
ADD COLUMN     "homeHeadingSize" TEXT NOT NULL DEFAULT 'lg',
ADD COLUMN     "storyEyebrow" TEXT NOT NULL DEFAULT 'Our story',
ADD COLUMN     "visitEyebrow" TEXT NOT NULL DEFAULT 'Come in',
ADD COLUMN     "visitHeading" TEXT NOT NULL DEFAULT 'Visit';

-- 2. The panels' new home.
CREATE TABLE "HomePanel" (
    "id" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL DEFAULT '',
    "line" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "blurDataUrl" TEXT,
    "linkOneLabel" TEXT NOT NULL DEFAULT '',
    "linkOneHref" TEXT NOT NULL DEFAULT '',
    "linkTwoLabel" TEXT NOT NULL DEFAULT '',
    "linkTwoHref" TEXT NOT NULL DEFAULT '',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomePanel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HomePanel_displayOrder_idx" ON "HomePanel"("displayOrder");

-- 3. Carry the three panels across: the sentences as they read on the live
--    site, each keeping whichever photograph or film the café had put in its
--    slot. Guarded on the table being empty so re-running is a no-op and can
--    never resurrect a panel somebody has since deleted.
INSERT INTO "HomePanel" ("id", "eyebrow", "line", "imageUrl", "imageAlt", "linkOneLabel", "linkOneHref", "linkTwoLabel", "linkTwoHref", "displayOrder", "isVisible", "createdAt", "updatedAt")
SELECT * FROM (
  SELECT
    'seed_panel_one' AS id,
    'Daar means home' AS eyebrow,
    'Daar means home.' AS line,
    (SELECT "panelOneImageUrl" FROM "SiteSettings" WHERE "id" = 'singleton') AS "imageUrl",
    'Inside Daar — brushed steel against the plaster wall' AS "imageAlt",
    '' AS "linkOneLabel", '' AS "linkOneHref", '' AS "linkTwoLabel", '' AS "linkTwoHref",
    0 AS "displayOrder", true AS "isVisible", NOW() AS "createdAt", NOW() AS "updatedAt"
  UNION ALL
  SELECT
    'seed_panel_two', '', 'One room. One idea.',
    (SELECT "panelTwoImageUrl" FROM "SiteSettings" WHERE "id" = 'singleton'),
    'Inside Daar',
    '', '', '', '',
    1, true, NOW(), NOW()
  UNION ALL
  SELECT
    'seed_panel_three', '', 'The things worth eating can’t be hurried.',
    (SELECT "panelThreeImageUrl" FROM "SiteSettings" WHERE "id" = 'singleton'),
    'Daar plates reading ‘Patience tastes better’',
    'See the menu', '/menu', 'Plan your visit', '/visit',
    2, true, NOW(), NOW()
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM "HomePanel");

-- 4. Only now that the photographs are safely copied.
ALTER TABLE "SiteSettings"
DROP COLUMN "panelOneImageUrl",
DROP COLUMN "panelTwoImageUrl",
DROP COLUMN "panelThreeImageUrl";
