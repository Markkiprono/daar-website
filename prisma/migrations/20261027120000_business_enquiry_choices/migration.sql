-- The enquiry form's choices become cards with a short explanation each,
-- under an editable question. Only replaces the list if it is unchanged.
ALTER TABLE "CateringPage" ADD COLUMN "enquiryQuestion" TEXT NOT NULL DEFAULT 'What can we help you with?';

UPDATE "CateringPage" SET "enquiryInterests" = E'An event at Daar | Meetings, launches and dinners in our Westlands home\nCatering delivered to you | Boxed meals, coffee breaks and buffets at your office\nBread and pastry for my business | For restaurants, coffee shops, hotels and schools\nStocking Daar in my store | For supermarkets and independent shops'
  WHERE "enquiryInterests" = E'An event at Daar\nOutside catering\nPastry and bread for my business\nStocking Daar in my store\nSomething else';
