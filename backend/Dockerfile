# ── CraveExpress API — multi-stage build ──────────────────────────────────────
# Stage 1 compiles TypeScript; stage 2 ships only production deps + compiled JS,
# giving a smaller, reproducible runtime image.

# ---- Stage 1: build ----
FROM node:20-alpine AS build
WORKDIR /app

# Install ALL deps (incl. dev) for the TypeScript compile.
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Stage 2: runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only production dependencies in the final image.
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Compiled output from the build stage.
COPY --from=build /app/dist ./dist

# Run as the built-in unprivileged node user (never root).
USER node

EXPOSE 4000
CMD ["node", "dist/index.js"]
