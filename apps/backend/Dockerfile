# Production image for the backend. Build from the repository root:
#   docker build -f apps/backend/Dockerfile -t worktrack-backend .

# --- build ----------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /repo

# Only the manifests first, so dependencies stay cached while source changes.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --include-workspace-root --workspace=apps/backend

COPY apps/backend apps/backend
RUN npm run build --workspace=apps/backend

# --- runtime --------------------------------------------------------------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --omit=dev --include-workspace-root --workspace=apps/backend \
  && npm cache clean --force

COPY --from=build /repo/apps/backend/dist apps/backend/dist

USER node
WORKDIR /repo/apps/backend
EXPOSE 3001

CMD ["node", "dist/main"]
