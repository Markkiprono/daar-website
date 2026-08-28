-- Seed the four "What we stand for" cards.
--
-- These four were hardcoded in src/app/page.tsx when the section was built,
-- which was the bug: the café could not change a word of their own home page
-- without a deploy. They now live in ValueCard, and this backfill puts the
-- existing wording into the table so the section looks identical the moment
-- this ships and the café edits from there.
--
-- Guarded on the table being empty rather than on each row: once anybody has
-- touched these cards — added a fifth, deleted one, rewritten all four — this
-- must never reintroduce the originals. Re-running it is therefore a no-op,
-- which is what `migrate deploy` needs it to be.
INSERT INTO "ValueCard" ("id", "title", "body", "imageUrl", "imageAlt", "displayOrder", "isVisible", "createdAt", "updatedAt")
SELECT * FROM (VALUES
  (
    'seed_value_craft',
    'Craft',
    E'Not one step — the whole of it.\nTime, temperature, repetition,\nuntil the hands stop having to think.',
    '/brand/item-04.jpg',
    'Coffee brewing at Daar',
    0, true, NOW(), NOW()
  ),
  (
    'seed_value_proved',
    'Proved slowly',
    E'Dough is given the hours it asks for.\nThere is no version that goes faster,\nand we have stopped looking for one.',
    '/brand/patience-plates.jpg',
    'Daar plates reading ‘Patience tastes better’',
    1, true, NOW(), NOW()
  ),
  (
    'seed_value_baked',
    'Baked this morning',
    E'Everything on the counter was made here today.\nWhat sells out, sells out —\nwe would rather run short than bake ahead.',
    '/brand/item-05.jpg',
    'A baker at Daar holding an almond croissant',
    2, true, NOW(), NOW()
  ),
  (
    'seed_value_room',
    'Room to sit',
    E'The whole fourth floor, in Westlands.\nCome for a coffee,\nstay for the afternoon.',
    '/brand/interior-01.jpg',
    'The room at Daar — brushed steel against plaster',
    3, true, NOW(), NOW()
  )
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM "ValueCard");
