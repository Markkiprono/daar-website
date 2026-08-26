-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "closingImageUrl" TEXT,
ADD COLUMN     "panelOneImageUrl" TEXT,
ADD COLUMN     "panelThreeImageUrl" TEXT,
ADD COLUMN     "panelTwoImageUrl" TEXT,
ADD COLUMN     "storyBandImageUrl" TEXT;

-- CreateTable
CREATE TABLE "HomePhoto" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageAlt" TEXT,
    "blurDataUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomePhoto_displayOrder_idx" ON "HomePhoto"("displayOrder");
