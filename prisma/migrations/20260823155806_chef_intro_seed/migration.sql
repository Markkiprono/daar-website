-- Backfill the chef introduction so the section keeps rendering after this
-- deploy instead of quietly disappearing until someone fills the form in.
--
-- COALESCE, so this only ever writes into a field that is still empty: run it
-- twice, or edit the words in the dashboard and redeploy, and nothing here
-- overwrites what the café has said. The wording is a placeholder written for
-- them, not by them — it is expected to be replaced from Settings.
UPDATE "SiteSettings"
SET
  "chefName"  = COALESCE("chefName", 'Vikash Pandey'),
  "chefRole"  = COALESCE("chefRole", 'Executive Chef'),
  "chefQuote" = COALESCE(
    "chefQuote",
    'Everything that leaves this kitchen has been through my hands or my team''s. We cook the way we would at home, for people we are glad to see. Come hungry, and stay as long as you like.'
  )
WHERE "id" = 'singleton';
