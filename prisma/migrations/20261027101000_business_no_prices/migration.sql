-- No prices or margins on the page. Only rewrites the seeded wording.
UPDATE "CateringItem" SET "title" = 'Straight from us', "body" = 'Baked and delivered by Daar, with no distributor in between.'
  WHERE "id" = 'seed_cat_point_3' AND "title" = 'A real margin';
