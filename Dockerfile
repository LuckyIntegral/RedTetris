# Production images for the workspace packages, built from the repo root:
#   docker build --target server -t red-tetris-server .
#   docker build --target client -t red-tetris-client --build-arg VITE_SERVER_URL=https://tetris.example.com .
#
# Runtime stages are distroless (no shell, no package manager) and run as a non-root user.
# Base images are pinned by digest; Dependabot keeps the digests current.

FROM node:25-bookworm-slim@sha256:81db02c4b671288a03915da9534dbd54f96d0e7c24d80ccc54f5b36b2e684370 AS base
RUN npm install -g pnpm@10.34.9
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/
COPY server/package.json server/

FROM base AS deps
RUN pnpm install --frozen-lockfile

FROM deps AS server-build
COPY server/ server/
RUN pnpm --filter=server build

FROM deps AS client-build
# Vite inlines these into the bundle, so they are fixed per image
ARG VITE_SERVER_URL
ARG VITE_SENTRY_DSN
COPY client/ client/
RUN --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
    pnpm --filter=client build

FROM base AS server-modules
RUN pnpm install --frozen-lockfile --prod --filter=server

FROM base AS client-modules
RUN pnpm install --frozen-lockfile --prod --filter=client

FROM gcr.io/distroless/nodejs24-debian12:nonroot@sha256:14d42e2511532589a7c7e01a753667a74fcc96266e137e8125006b87b0c32d0a AS server
ENV NODE_ENV=production
# runMigrations() reads ./migrations relative to the working directory
WORKDIR /app/server
COPY --from=server-modules /app /app
COPY --from=server-build /app/server/dist dist
COPY server/migrations migrations
EXPOSE 3002
CMD ["dist/app.js"]

FROM gcr.io/distroless/nodejs24-debian12:nonroot@sha256:14d42e2511532589a7c7e01a753667a74fcc96266e137e8125006b87b0c32d0a AS client
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
WORKDIR /app/client
COPY --from=client-modules /app /app
COPY --from=client-build /app/client/build build
EXPOSE 3001
CMD ["node_modules/@react-router/serve/bin.js", "build/server/index.js"]
