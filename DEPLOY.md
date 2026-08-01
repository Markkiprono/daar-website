# Deploying Daar

Target: one VPS running Docker. Three containers — the app, PostgreSQL, and
Caddy for HTTPS. Only Caddy is exposed to the internet.

Everything below assumes a fresh Ubuntu/Debian box and root or sudo.

---

## 1. DNS — do this first

Caddy proves domain ownership before it can issue certificates, so the records
must resolve **before** you start the stack.

At your registrar, point all three at the VPS IP:

| Type | Name | Value |
|---|---|---|
| A | `@` | `<VPS-IP>` |
| A | `www` | `<VPS-IP>` |
| A | `admin` | `<VPS-IP>` |

Confirm before continuing:

```bash
dig +short daarbyizzi.com admin.daarbyizzi.com
```

---

## 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

---

## 3. Get the code onto the server

The repository is **private**, so the server needs its own read access. A
deploy key is the right tool: it grants read-only access to this one repo,
and it is not tied to your personal GitHub account.

On the VPS, generate a key:

```bash
ssh-keygen -t ed25519 -C "daar-vps" -f ~/.ssh/id_ed25519 -N ""
```

Print the public half:

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy that line, then in GitHub go to
**daar-website → Settings → Deploy keys → Add deploy key**. Paste it, name it
`daar-vps`, and leave "Allow write access" **unchecked** — the server only
ever needs to read.

Then clone over SSH:

```bash
ssh -T git@github.com   # accept the fingerprint, expect "successfully authenticated"
```

```bash
git clone git@github.com:Markkiprono/daar-website.git /srv/daar && cd /srv/daar
```

> A personal access token in the clone URL also works, but it ends up in
> `.git/config` in plaintext and carries your whole account's permissions.
> The deploy key is read-only and scoped to this repo.

---

## 4. Configure

```bash
cp .env.production.example .env
```

Fill in `.env`. Generate the two secrets:

```bash
openssl rand -base64 24
```

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

First is `POSTGRES_PASSWORD`, second is `AUTH_SECRET`.

**Do not reuse the development values.** The local database password
(`daar_dev_only`) and the local `AUTH_SECRET` have both been written to a
terminal and a chat transcript — treat them as public.

---

## 5. Start

```bash
docker compose up -d --build
```

The app applies migrations itself on boot (`prisma migrate deploy`), which only
runs already-generated migrations and never prompts or drops data.

Watch it come up:

```bash
docker compose logs -f app
```

---

## 6. Create the admin account

```bash
docker compose exec app npx tsx scripts/create-admin.ts you@daarbyizzi.com "a-long-password"
```

Then sign in at `https://admin.daarbyizzi.com`.

---

## 7. Seed the menu

Only if starting from an empty database:

```bash
docker compose exec app npx prisma db seed
```

**The seed contains invented placeholder items.** Replace them from the
dashboard, or edit `prisma/seed.ts` before running it.

---

## Health check

```bash
curl -fsS https://daarbyizzi.com/api/health
```

Returns `{"ok":true,"db":"up"}`. It verifies Postgres is actually reachable,
not merely that the process is alive — point an uptime monitor at it.

---

## Two cron jobs you must add

Neither runs on its own.

```bash
crontab -e
```

```cron
# Roll raw analytics into daily totals and prune. Without this the
# MenuItemView table grows without limit.
15 3 * * * cd /srv/daar && docker compose exec -T app npx tsx scripts/rollup-analytics.ts >> /srv/daar/logs/rollup.log 2>&1

# Nightly database dump, keeping 14 days.
30 3 * * * cd /srv/daar && docker compose exec -T db pg_dump -U daar daar | gzip > /srv/daar/backups/daar-$(date +\%F).sql.gz && find /srv/daar/backups -name '*.sql.gz' -mtime +14 -delete
```

```bash
mkdir -p /srv/daar/logs /srv/daar/backups
```

A backup you have never restored is not a backup. Test it once:

```bash
gunzip -c backups/daar-YYYY-MM-DD.sql.gz | head -40
```

---

## Deploying an update

```bash
cd /srv/daar && git pull && docker compose up -d --build
```

Because the deploy key is read-only, `git pull` works and an accidental
`git push` from the server cannot rewrite your repository.

Migrations apply automatically. Uploaded photos live on a Docker volume and
are untouched by rebuilds.

---

## Image storage

`STORAGE_DRIVER=local` (the default) keeps uploads on the `uploads` volume.
That is genuinely fine for one VPS and survives redeploys.

Switch to `STORAGE_DRIVER=s3` when you want a CDN in front of the photos.
**Cloudflare R2 is the recommendation** — S3-compatible with zero egress fees,
which matters for a photo-heavy menu served over Kenyan mobile data.

> The S3 driver has **not been exercised against a real bucket** — there was
> none to test with. The shape is standard and config is validated at startup,
> but treat your first upload after switching as the real test, and keep
> `local` working as a fallback.

Existing photos are **not** migrated automatically. Copy the volume contents
into the bucket and update `imageUrl` values before switching.

---

## Email notifications

Optional. Without `RESEND_API_KEY` the site works normally — you simply are
not emailed about new bookings and messages, which still appear in the
dashboard.

To enable: create a Resend account, verify `daarbyizzi.com` as a sending
domain, then set `RESEND_API_KEY`, `EMAIL_FROM` and `EMAIL_TO`.

Notifications are sent **after** the record is saved and can never fail a
guest's submission.

---

## Security checklist before going live

- [ ] `AUTH_SECRET` and `POSTGRES_PASSWORD` are fresh, not the dev values
- [ ] Admin password changed from whatever it was created with
- [ ] The `21st.dev` API key from development is rotated — it was pasted into
      a chat transcript and stored in plaintext on the dev machine
- [ ] Firewall allows only 22, 80, 443 (`ufw allow 22,80,443/tcp && ufw enable`)
- [ ] SSH key auth only, password auth disabled
- [ ] Backups confirmed running, and one restore tested
- [ ] `/api/health` wired to an uptime monitor

Postgres publishes no port to the host — it is reachable only from the app
container over Docker's internal network. Keep it that way.

---

## Reference

| | |
|---|---|
| Public site | `https://daarbyizzi.com` |
| Admin | `https://admin.daarbyizzi.com` |
| Logs | `docker compose logs -f app` |
| Restart | `docker compose restart app` |
| Shell | `docker compose exec app sh` |
| Postgres | `docker compose exec db psql -U daar daar` |
