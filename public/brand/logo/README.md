# Drop your real Daar logo files here

The site currently uses a **hand-traced approximation** of the door mark that I
made from `daar by izzi.pdf`. It is close but not exact — replace it.

## Put files here with these exact names

| File | What it is | Used for |
|---|---|---|
| `mark.svg` | The door mark alone, no text | Navbar, footer, admin login, favicon |
| `wordmark.svg` | "DAAR" + "by izzi" lockup, no mark | Optional — larger brand moments |
| `full.svg` | Mark + wordmark together | Optional |

**SVG is strongly preferred** — it stays sharp at every size and weighs almost
nothing. `.png` also works (use at least 1000px wide, transparent background)
— just name it `mark.png` etc.

## Important: make the artwork monochrome

The site tints the logo in code — tan on dark sections, oxblood on light ones.
For that to work, export the SVG so its shapes have **no hard-coded fill
colour**, or use a single flat colour. If your SVG has `fill="#d2af8a"` baked
in, it will always be tan and will disappear on a tan background.

If you can only export a coloured version, that is fine — drop it in and tell
me, and I will switch those components to render it as-is instead of tinting.

## After you drop the files

Nothing else to do. The site checks for these files when it renders and uses
them automatically; if they are missing it falls back to the traced version.
Restart the dev server (or rebuild) so the change is picked up.

## Where the logo appears

- Navbar, top-left, every page
- Footer, centred
- Admin login screen
- Browser tab icon (favicon) — needs `mark.svg`
