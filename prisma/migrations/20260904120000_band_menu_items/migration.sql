-- The drifting band on the home page ("What today looks like") becomes a
-- choice the café makes rather than a random draw plus six photographs
-- hard-coded into the page source.
--
-- Default false so this migration changes nothing on its own: with nothing
-- ticked the band keeps drawing at random, exactly as before. The first tick
-- in the dashboard is what takes it over.
ALTER TABLE "MenuItem" ADD COLUMN "isInBand" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "MenuItem_isInBand_idx" ON "MenuItem"("isInBand");
