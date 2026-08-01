# syntax=docker/dockerfile:1
#
# Daar — production image.
#
# Multi-stage so the shipped layer contains only the standalone server, not
# the toolchain. Debian slim rather than Alpine: sharp and Prisma's engines
# both want glibc, and fighting musl is not worth the few megabytes saved.

# ---------- deps ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install scripts are needed here: Prisma downloads its query engine and sharp
# fetches its native binaries during postinstall.
RUN npm ci --ignore-scripts=false

# ---------- build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The Prisma client is generated code and is git-ignored, so it must be
# generated inside the image rather than copied in.
RUN npx prisma generate

# A DATABASE_URL must exist for the build to typecheck and prerender.
# It is never connected to — real values arrive at runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-time-placeholder-not-used-at-runtime"
RUN npm run build

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Uploads live on a mounted volume, never inside the image.
ENV UPLOADS_DIR=/data/uploads

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrations and the Prisma CLI, so the container can migrate itself on boot.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.bin ./node_modules/.bin

RUN mkdir -p /data/uploads && chown -R nextjs:nodejs /data
VOLUME ["/data"]

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
