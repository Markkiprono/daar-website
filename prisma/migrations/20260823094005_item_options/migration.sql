
-- CreateEnum
CREATE TYPE "OptionPricing" AS ENUM ('SURCHARGE', 'ABSOLUTE');

-- CreateEnum
CREATE TYPE "OptionSelect" AS ENUM ('ONE', 'MANY');

-- CreateTable
CREATE TABLE "OptionGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "select" "OptionSelect" NOT NULL DEFAULT 'ONE',
    "pricing" "OptionPricing" NOT NULL DEFAULT 'SURCHARGE',
    "helpText" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemOptionGroup" (
    "menuItemId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MenuItemOptionGroup_pkey" PRIMARY KEY ("menuItemId","groupId")
);

-- CreateIndex
CREATE UNIQUE INDEX "OptionGroup_slug_key" ON "OptionGroup"("slug");

-- CreateIndex
CREATE INDEX "OptionGroup_displayOrder_idx" ON "OptionGroup"("displayOrder");

-- CreateIndex
CREATE INDEX "Option_groupId_displayOrder_idx" ON "Option"("groupId", "displayOrder");

-- CreateIndex
CREATE INDEX "MenuItemOptionGroup_groupId_idx" ON "MenuItemOptionGroup"("groupId");

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemOptionGroup" ADD CONSTRAINT "MenuItemOptionGroup_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemOptionGroup" ADD CONSTRAINT "MenuItemOptionGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

