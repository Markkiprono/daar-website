-- Clear the accidental 0,0 coordinates.
--
-- Leaving the latitude and longitude boxes empty in the dashboard stored the
-- string "0" in both, because the validation coerced "" to the number 0 before
-- it ever reached its empty-string branch. The site then published
-- GeoCoordinates 0,0 to Google — a point in the Gulf of Guinea, some 500 km
-- off West Africa — in the same structured data that gives a Westlands street
-- address. `geo` feeds the local map pack, so a coordinate contradicting the
-- address is actively worse than none at all.
--
-- The intake is fixed and the output now refuses 0,0 regardless, but the bad
-- pair is already in the row; this clears it so the false location stops being
-- published the moment this deploys, rather than waiting for someone to open
-- Settings.
--
-- Only the exact 0/0 pair is touched. A latitude of zero is legitimate on its
-- own — the equator crosses this country — so the two are judged together,
-- and any real coordinate anyone has since entered is left alone.
UPDATE "SiteSettings"
SET "latitude" = NULL,
    "longitude" = NULL
WHERE "id" = 'singleton'
  AND ("latitude" IS NOT NULL AND "longitude" IS NOT NULL)
  AND CAST("latitude" AS DOUBLE PRECISION) = 0
  AND CAST("longitude" AS DOUBLE PRECISION) = 0;
