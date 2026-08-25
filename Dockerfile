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
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src/shared ./src/shared
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/litestream.yml ./litestream.yml
COPY --from=build /app/scripts/start-container.sh ./scripts/start-container.sh
RUN chmod +x ./scripts/start-container.sh
EXPOSE 3000
CMD ["./scripts/start-container.sh"]
