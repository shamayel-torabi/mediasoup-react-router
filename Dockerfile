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
#RUN npx prisma db push
#RUN npx prisma migrate deploy
RUN npm run build

FROM mediasoup-server-prod
COPY ./package.json package-lock.json server.js /app/
COPY ./prisma /app/prisma
COPY --from=build-env /app/build /app/build
COPY --from=build-env /app/app/generated/prisma /app/app/generated/prisma
COPY ./server-lib /app/server-lib
WORKDIR /app
EXPOSE 3000
ENV PORT=3000
VOLUME /app/data
CMD ["npm", "run", "start"]