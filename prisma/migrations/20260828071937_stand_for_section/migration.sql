-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "standForCardSize" TEXT NOT NULL DEFAULT 'md',
ADD COLUMN     "standForEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "standForEyebrow" TEXT NOT NULL DEFAULT 'Why we do it this way',
ADD COLUMN     "standForHeading" TEXT NOT NULL DEFAULT 'What we stand for',
ADD COLUMN     "standForHeadingSize" TEXT NOT NULL DEFAULT 'lg';

-- CreateTable
CREATE TABLE "ValueCard" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "blurDataUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValueCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValueCard_displayOrder_idx" ON "ValueCard"("displayOrder");
