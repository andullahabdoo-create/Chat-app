# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.21.1

FROM node:${NODE_VERSION}-slim AS client-build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:${NODE_VERSION}-slim AS server-build

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --include=dev
COPY server/ ./
RUN npm run build
RUN npm prune --omit=dev

FROM node:${NODE_VERSION}-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV CLIENT_DIR=/app/public

COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/package.json
COPY --from=client-build /app/client/dist ./public

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
