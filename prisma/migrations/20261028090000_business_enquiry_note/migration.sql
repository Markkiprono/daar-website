-- A gentle line on the enquiry form explaining why every field is asked for.
ALTER TABLE "CateringPage" ADD COLUMN "enquiryNote" TEXT NOT NULL DEFAULT 'We kindly ask for each detail below. It helps us come back to you with something that truly fits, and saves you a second round of questions. Thank you for taking a moment.';
