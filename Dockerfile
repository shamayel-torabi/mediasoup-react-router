FROM node:22 AS base-development
RUN set -x \
	&& apt-get update \
	&& apt-get install -y net-tools build-essential python3 python3-pip valgrind

FROM base-development AS development-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci

FROM base-development AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM development-dependencies-env AS build-env
COPY . /app
RUN npm run build

FROM node:22
COPY ./package.json package-lock.json server.js /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY ./server-lib /app/server-lib
COPY ./prisma /app/prisma
WORKDIR /app
EXPOSE 3000
VOLUME /app/prisma
CMD ["npm", "run", "start"]