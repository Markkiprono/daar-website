# Daar Cafe & Bakery

Brand site, picture-led digital menu, and a private admin dashboard for
**Daar & Bakery**, Nairobi. Single location.

> *Patience tastes better.*

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | Static-first; a menu site is overwhelmingly cacheable |
| Styling | Tailwind CSS + CSS custom properties | Design tokens live in `design/tokens.css` |
| Database | **PostgreSQL 17 — in dev *and* prod** | No SQLite anywhere; avoids provider-switch bugs that only surface after deploy |
| ORM | Prisma 7 (`@prisma/adapter-pg`) | v7 requires an explicit driver adapter |
| Auth | Credentials, single admin | Phase 2 |
| Images | S3-compatible (Cloudflare R2 / MinIO) | Deliberately **not** Vercel Blob — the app must run on a VPS |
| Deploy | Docker on a VPS, CDN in front | Vercel also works; no platform lock-in |

---

## Running locally

**Prerequisites:** Node 20+, PostgreSQL 17 running locally.

```bash
npm install
```

Copy the env template and fill in your database URL:

```bash
cp .env.example .env
```

Create the database (once):

```bash
psql -U postgres -c "CREATE DATABASE daar;"
```

Apply migrations, generate the client, and seed:

```bash
npx prisma migrate dev
```

```bash
npx prisma generate
```

```bash
npx prisma db seed
```

Start the dev server:

```bash
npm run dev
```

### Windows / PowerShell note

PowerShell's execution policy blocks npm's `.ps1` shims. Use the `.cmd`
variants — `npm.cmd`, `npx.cmd` — or run from `cmd.exe`.

npm also blocks package install scripts by default. Prisma, sharp and
esbuild genuinely need theirs. Approve with:

```bash
npm.cmd approve-scripts prisma @prisma/engines sharp esbuild unrs-resolver
```

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `NEXT_PUBLIC_SITE_URL` | yes | Public origin, no trailing slash |
| `ADMIN_HOST` | yes | Host serving the dashboard; sessions scope to it |
| `NEXT_PUBLIC_CURRENCY` | no | Defaults to `KES` |
| `AUTH_SECRET` | Phase 2 | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `S3_*` | Phase 2 | Any S3-compatible store |

---

## Useful commands

```bash
npx tsx scripts/verify-db.ts
```

Prints the seeded menu grouped by category with prices, badges and
sold-out state — a fast check that the database is wired up correctly.

```bash
npx prisma studio
```

---

## Data model

- **Category** → **MenuItem** (one-to-many)
- **MenuItem** ↔ **Tag** via **MenuItemTag**. `TagKind` is `DIETARY`
  (vegetarian, vegan, gluten-free) or `BADGE` (bestseller, new,
  seasonal, limited).
- **SiteSettings** — a single `singleton` row holding hero, story,
  contact and socials, all editable from the dashboard.
- **OpeningHours** — one row per weekday, `0 = Sunday`.
- **AdminUser** — created in Phase 2.

### Prices

Stored as `priceCents` (integer minor units) — never a float. KES is
quoted in whole shillings, so `formatPrice()` in `src/lib/config.ts`
rounds on display while the storage format stays currency-agnostic.
Changing currency is one variable.

### Analytics

Per-item view counts, **aggregate only** — no cookies, no visitor
identity, no third-party tracker. Raw `MenuItemView` events roll up
nightly into `DailyItemStat` and are then pruned, so the table cannot
grow unbounded on a small VPS. This also keeps the site clear of
consent-banner obligations.

---

## Admin dashboard

Served from its own subdomain (`ADMIN_HOST`), same codebase, host-based
routing in **`src/proxy.ts`** (Next 16 renamed Middleware to Proxy).

Create or reset the single admin account:

```bash
npx tsx scripts/create-admin.ts you@example.com "a-long-password"
```

Local URLs (`localtest.me` resolves to 127.0.0.1, no hosts-file edit):

- Public — `http://localtest.me:3000`
- Admin — `http://admin.localtest.me:3000`

Owner capabilities: menu CRUD with image upload from a phone, category
management and reordering, one-tap sold-out toggle, badge editing, and
Chef's Special selection. Site-content editing lands in Phase 6.

### Security model — read before changing admin pages

Authorization lives in the **Data Access Layer** (`src/lib/dal.ts`), not
in Proxy and *not only* in a layout.

Proxy performs an optimistic cookie-presence check to redirect early. It
never queries the database, because it runs on every request including
prefetches. It is an optimisation, not a gate.

**Every protected page must `await requireAdmin()` before its first
query.** Next renders layouts and pages *concurrently* — a check that
lives only in the layout does not stop the page from fetching, and the
rendered payload is then served in the redirect body where `curl` can
read it. This was a real bug caught during Phase 2 testing; the redirect
returned `307` while leaking 88 KB of menu data.

Server Actions call `assertAdmin()`, which throws rather than redirects.

Verify the boundary at any time:

```bash
curl -s -H "Cookie: daar_admin_session=garbage" http://admin.localtest.me:3000/menu | grep -c "Mark sold out"
```

That must print `0`.

---

## Swapping image storage

Uploads go through a storage adapter, so switching providers is a config
change rather than a rewrite. Implement the adapter interface in
`src/lib/storage/` and point the `S3_*` variables at the new bucket.

Cloudflare R2 is the recommended default — S3-compatible with zero
egress fees, which matters for a photo-heavy site serving mobile data in
Kenya. MinIO on the VPS works identically.

**Do not use the local filesystem in production.** On serverless it is
ephemeral and read-only; uploads would silently vanish on the next
deploy.

---

## Deployment

Target is a Docker container on a paid VPS with a CDN (Cloudflare)
in front. Because the public site is static-first, the database is only
touched on admin writes and analytics rollups — a modest box absorbs
very large traffic. Do not over-provision.

---

## Project layout

```
prisma/          schema, migrations, seed
scripts/         image pipeline, db verification
design/          Phase 0 style board — tokens, prototype pages
src/app/         routes
src/lib/         db client, config
src/generated/   Prisma client (git-ignored)
```

`design/` is reference material, not shipped code. Open
`design/index.html` and `design/menu.html` in a browser to see the
agreed visual direction.
