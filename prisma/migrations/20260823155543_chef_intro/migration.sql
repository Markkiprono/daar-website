
-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "chefImageUrl" TEXT,
ADD COLUMN     "chefName" TEXT,
ADD COLUMN     "chefQuote" TEXT,
ADD COLUMN     "chefRole" TEXT DEFAULT 'Executive Chef';

