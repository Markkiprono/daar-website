
-- CreateTable
CREATE TABLE "MenuItemOptionChoice" (
    "menuItemId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "MenuItemOptionChoice_pkey" PRIMARY KEY ("menuItemId","optionId")
);

-- CreateIndex
CREATE INDEX "MenuItemOptionChoice_optionId_idx" ON "MenuItemOptionChoice"("optionId");

-- AddForeignKey
ALTER TABLE "MenuItemOptionChoice" ADD CONSTRAINT "MenuItemOptionChoice_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemOptionChoice" ADD CONSTRAINT "MenuItemOptionChoice_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE CASCADE ON UPDATE CASCADE;

