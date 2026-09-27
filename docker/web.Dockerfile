# Builds the React site and serves it with nginx, which also forwards /ws to RabbitMQ
# (the same layout as production). Used by docker-compose.yml.
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# The restricted browser account from docker/rabbitmq/definitions.json (local development only).
ENV VITE_MQ_LOGIN=canine_web \
    VITE_MQ_PASSCODE=canine-dev-web
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
