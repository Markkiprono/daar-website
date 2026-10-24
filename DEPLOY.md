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

A one-shot `migrate` service runs `prisma migrate deploy` first, and `app` only
starts once it has completed successfully — so migrations are always applied
before any request is served. `migrate deploy` only runs already-generated
migrations and never prompts or drops data.

The app image deliberately ships without the Prisma CLI, so it cannot run
migrations itself; the `migrate` service uses the build stage, which has the
full dependency tree. See the comment in the Dockerfile before moving this.

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

---

## WhatsApp booking alerts

Bookings email the café already. This adds a WhatsApp message to a staff phone
the moment a table is requested, because the inbox gets read between services
and the phone gets read during one.

Entirely optional. With none of it configured the site behaves exactly as
before — the code no-ops, and a guest can never see a booking fail because
Meta was down or a token expired.

### 1. A number you are willing to lose

Meta consumes the number you register. **A number on the Cloud API can no
longer be used in the normal WhatsApp or WhatsApp Business app on a handset.**

Do not register the number printed on the website — guests message that one,
and registering it would take it away from whoever answers them. Use a
separate SIM that does nothing but send alerts.

This is the sender only. Staff receive alerts on their own ordinary WhatsApp,
which is untouched.

### 2. Meta setup

1. developers.facebook.com → create an app → **Business** type.
2. Add the **WhatsApp** product. Note the **Phone number ID** on the API Setup
   page — that is `WHATSAPP_PHONE_NUMBER_ID`. It is an id, not a phone number.
3. Register the alert SIM under **Add phone number** and verify it by SMS.
4. Business Settings → Users → **System Users** → add one → **Generate token**
   with `whatsapp_business_messaging` and `whatsapp_business_management`, and
   set it to never expire. That is `WHATSAPP_TOKEN`.

   The token the API Setup page hands you first expires in 24 hours. Using it
   means alerts work in testing, then stop the next day for no visible reason.

### 3. The message template

Business-initiated messages cannot be free text. Create this under
**WhatsApp Manager → Message templates**:

- **Name:** `daar_booking`
- **Category:** Utility — *not* Marketing. Marketing costs more, is throttled,
  and can be muted by the recipient, which defeats the point.
- **Language:** English (`en`)
- **Body:**

  ```
  Daar — booking {{1}}

  Guest: {{2}}
  Party: {{3}}
  When: {{4}}
  Phone: {{5}}
  Ref: {{6}}

  Open the dashboard to confirm.
  ```

Approval is usually well under an hour. The six parameters are filled in that
order by `src/lib/whatsapp.ts`; `{{1}}` is `REQUEST` for a new booking and
`CHANGED` when a guest amends one. Changing the wording is free, but **adding
or removing a `{{n}}` means changing that file too**, or every send fails with
a 132000-series parameter-count error.

### 4. Who gets alerted

Set in the dashboard, **Settings → Contact → WhatsApp alerts for bookings**.
Country code first, no plus, commas between several:

```
254727117355, 254712345678
```

Put more than one person on it. A single recipient is how bookings got missed
in the first place.

`WHATSAPP_ALERT_TO` in the environment is only a fallback for when that field
is empty, so the alerts keep working before anyone has visited the dashboard.

### 5. Recipients must opt in once

Meta will not deliver to a number that has never accepted messages from the
business. Each member of staff sends any message — "hi" is enough — to the
alert number once, from the phone they will receive on. After that they are
opted in permanently.

While the app is in Meta's **test** mode you must also add each staff number
under API Setup → recipients, up to five. Five is often enough for a café, and
test mode is free.

### 6. Check it

Make a booking on `/reserve`. Within a few seconds the alert should arrive.

If nothing does, the server log has the reason — every failure is logged with
Meta's own error body:

```bash
docker compose logs --tail=50 web | grep whatsapp
```

The usual causes, in the order they actually happen: the template is still
pending approval; the token was the 24-hour one; the recipient never sent that
first message; the number is missing its country code.
