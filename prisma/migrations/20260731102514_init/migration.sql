-- CreateEnum
CREATE TYPE "TagKind" AS ENUM ('DIETARY', 'BADGE');

-- CreateEnum
CREATE TYPE "ViewSource" AS ENUM ('MENU', 'HOME', 'DIRECT');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "blurDataUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "TagKind" NOT NULL DEFAULT 'BADGE',
    "colorHex" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemTag" (
    "menuItemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "MenuItemTag_pkey" PRIMARY KEY ("menuItemId","tagId")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "heroHeadline" TEXT NOT NULL DEFAULT 'Patience tastes better',
    "heroSubcopy" TEXT NOT NULL DEFAULT 'Proved slowly. Baked the same morning it''s served.',
    "heroImageUrl" TEXT,
    "heroVideoUrl" TEXT,
    "storyTitle" TEXT NOT NULL DEFAULT 'A door on Ngong Road',
    "storyBody" TEXT NOT NULL DEFAULT '',
    "storyImageUrl" TEXT,
    "addressLine" TEXT NOT NULL DEFAULT 'Nairobi, Kenya',
    "mapEmbedUrl" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "socials" JSONB NOT NULL DEFAULT '{}',
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningHours" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT,
    "closeTime" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OpeningHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemView" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "source" "ViewSource" NOT NULL DEFAULT 'MENU',
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyItemStat" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyItemStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_displayOrder_idx" ON "Category"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_slug_key" ON "MenuItem"("slug");

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_displayOrder_idx" ON "MenuItem"("categoryId", "displayOrder");

-- CreateIndex
CREATE INDEX "MenuItem_isAvailable_idx" ON "MenuItem"("isAvailable");

-- CreateIndex
CREATE INDEX "MenuItem_isFeatured_idx" ON "MenuItem"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_kind_idx" ON "Tag"("kind");

-- CreateIndex
CREATE INDEX "MenuItemTag_tagId_idx" ON "MenuItemTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningHours_dayOfWeek_key" ON "OpeningHours"("dayOfWeek");

-- CreateIndex
CREATE INDEX "MenuItemView_menuItemId_viewedAt_idx" ON "MenuItemView"("menuItemId", "viewedAt");

-- CreateIndex
CREATE INDEX "MenuItemView_viewedAt_idx" ON "MenuItemView"("viewedAt");

-- CreateIndex
CREATE INDEX "DailyItemStat_date_idx" ON "DailyItemStat"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyItemStat_menuItemId_date_key" ON "DailyItemStat"("menuItemId", "date");

-- CreateIndex
CREATE INDEX "PageView_date_idx" ON "PageView"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PageView_path_date_key" ON "PageView"("path", "date");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemTag" ADD CONSTRAINT "MenuItemTag_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemTag" ADD CONSTRAINT "MenuItemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemView" ADD CONSTRAINT "MenuItemView_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyItemStat" ADD CONSTRAINT "DailyItemStat_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
