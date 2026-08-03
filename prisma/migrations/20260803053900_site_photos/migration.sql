-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "faviconUrl" TEXT,
ADD COLUMN     "visitImageUrl" TEXT;

-- CreateTable
CREATE TABLE "StoryPhoto" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageAlt" TEXT,
    "blurDataUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryPhoto_displayOrder_idx" ON "StoryPhoto"("displayOrder");
