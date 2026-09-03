# syntax=docker/dockerfile:1
# Frontend image: multi-stage pnpm build -> standalone Next.js server.
# The standalone bundle includes the BFF route handlers (app/api/**) and the
# server-only BACKEND_URL env is read at request time, not baked into the build.

# ---- Stage 1: deps + build ----
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Layer-cache the store first (pnpm-workspace.yaml carries pnpm 11 settings)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Build the standalone server (NEXT_TELEMETRY_DISABLED keeps logs clean)
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- Stage 2: runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user (node exists in the official image)
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000

# BFF echo through the backend health endpoint: the frontend is up when its
# login page renders; deeper checks go through the API proxy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["/bin/sh", "-c", "wget -qO- http://localhost:3000/login >/dev/null || exit 1"]

CMD ["node", "server.js"]
