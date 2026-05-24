# syntax=docker/dockerfile:1.7

# ----- deps stage: install all deps including dev (for build) -----------------
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ----- prod deps stage: runtime deps used by pre-deploy migrations ------------
FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ----- build stage: produce the Next.js standalone output ---------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ----- runtime stage: minimal image with just what's needed to run ------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN addgroup -S app && adduser -S app -G app
# Copy the standalone server bundle, public assets, and static files.
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
# Migrations need to ship into the image so the migrate command can run them.
COPY --from=build --chown=app:app /app/src/db/migrations ./src/db/migrations
COPY --from=build --chown=app:app /app/scripts ./scripts
USER app
EXPOSE 3000
CMD ["node", "server.js"]
