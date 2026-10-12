FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# Prisma CLI and the CSS build tools are needed even when a hosting provider
# supplies NODE_ENV=production. Runtime migrations also need the installed CLI.
RUN npm ci --include=dev
COPY . .
# No database credentials or live database connection are required at build time.
# This syntactically valid placeholder is confined to these build commands.
RUN DATABASE_URL=mysql://build_only:build_only@127.0.0.1:3306/build_only node node_modules/prisma/build/index.js generate
RUN DATABASE_URL=mysql://build_only:build_only@127.0.0.1:3306/build_only npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* && chown node:node /app
COPY --from=builder --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["node", "scripts/docker-start.mjs"]
