FROM node:20-alpine AS base
WORKDIR /app

# ─── Builder ───────────────────────────────────────────────────────────────
FROM base AS builder

COPY package*.json ./
RUN npm ci

COPY . .
# generate creates the Prisma client; migrate regenerates it too, so no --skip-generate
RUN npx prisma generate
RUN npm run build

# ─── Runner ────────────────────────────────────────────────────────────────
FROM base AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Standalone output (Next.js traces all runtime deps: @prisma/client,
# @prisma/adapter-pg, pg, next-auth, etc. into node_modules/)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Migrations are intentionally NOT run here — see T11.3 docs.
# Run before first deploy and after schema changes:
#   docker run --rm --network dokploy-network -e DATABASE_URL=... \
#     geo-web:<tag> node /app/node_modules/prisma/... migrate deploy
# OR: ssh + npx prisma migrate deploy from /root/geo-web on the host.
CMD ["node", "server.js"]
