-- Put the café's own photographs back on the panels.
--
-- The previous migration copied panelOne/Two/ThreeImageUrl into HomePanel,
-- and on the live site all three of those columns are NULL — the panels were
-- never set directly. They looked filled in because the page BORROWED other
-- slots: panel one showed the Story photograph, panel three showed the Visit
-- one, and panel two showed the hero film. Removing the borrowing is the
-- whole point of this change, but doing it alone would have swapped two real
-- photographs for repo artwork on deploy day, silently and with no way for
-- anyone to know what had been lost.
--
-- So the two that were showing a genuine photograph get it written into their
-- own row, where it is now visible and editable in the dashboard.
--
-- PANEL TWO IS DELIBERATELY LEFT ALONE. It was showing heroImageUrl, which
-- today holds a film — the same film as the hero, playing twice on one page.
-- That duplication is the bug this whole piece of work started from, and
-- backfilling it would reinstate it. The panel falls to brand artwork until
-- the café puts something of its own there, which they can now do.
--
-- The arch beside "Daar means home" is left alone for the same reason: it was
-- borrowing the Story photograph that panel one is keeping, so restoring it
-- would put the same picture on the page twice.
--
-- Guarded on imageUrl IS NULL so this can never overwrite a picture somebody
-- has since chosen, and re-running it is a no-op.
UPDATE "HomePanel" p
SET "imageUrl" = s."storyImageUrl"
FROM "SiteSettings" s
WHERE s."id" = 'singleton'
  AND p."id" = 'seed_panel_one'
  AND p."imageUrl" IS NULL
  AND s."storyImageUrl" IS NOT NULL;

UPDATE "HomePanel" p
SET "imageUrl" = s."visitImageUrl"
FROM "SiteSettings" s
WHERE s."id" = 'singleton'
  AND p."id" = 'seed_panel_three'
  AND p."imageUrl" IS NULL
  AND s."visitImageUrl" IS NOT NULL;
