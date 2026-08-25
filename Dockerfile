FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ARG APP_REVISION=unknown
ENV APP_REVISION=$APP_REVISION
COPY package.json package-lock.json ./
# Runtime receives only packages the server actually needs; test/build tooling stays behind.
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src/shared ./src/shared
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/litestream.yml ./litestream.yml
COPY --from=build /app/scripts/start-container.sh ./scripts/start-container.sh
RUN chmod +x ./scripts/start-container.sh
EXPOSE 3000
CMD ["./scripts/start-container.sh"]
