# FROM node:22 AS base
# RUN set -x \
# 	&& apt-get update \
# 	&& apt-get install -y net-tools build-essential python3 python3-pip valgrind

# FROM base AS development-env
# COPY ./package.json package-lock.json /app/
# WORKDIR /app
# RUN npm ci

# FROM base AS production-env
# COPY ./package.json package-lock.json /app/
# WORKDIR /app
# RUN npm ci --omit=dev

FROM mediasoup-server-dev AS build-env
COPY . /app
WORKDIR /app
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS production
RUN apt update && apt install libssl-dev -y --no-install-recommends

FROM production
COPY ./package.json package-lock.json /app/
COPY ./server.prod.js /app/server.js
COPY --from=mediasoup-server-prod /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY --from=build-env /app/app/generated/prisma/libquery_engine-debian-openssl-3.0.x.so.node /app/build/server/assets/libquery_engine-debian-openssl-3.0.x.so.node
WORKDIR /app
EXPOSE 3000
ENV PORT=3000
VOLUME /app/data
CMD ["npm", "run", "start"]