# PHP 8.3 image for the three workers (frontend, dbridge, db). Used by docker-compose.yml.
FROM php:8.3-cli

RUN apt-get update \
 && apt-get install -y --no-install-recommends unzip \
 && rm -rf /var/lib/apt/lists/* \
 && docker-php-ext-install pcntl sockets mysqli bcmath

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY backend/composer.json backend/composer.lock backend/
COPY database/composer.json database/composer.lock database/
RUN composer install -d backend --no-dev --no-interaction --no-progress --no-autoloader \
 && composer install -d database --no-dev --no-interaction --no-progress --no-autoloader

COPY backend/ backend/
COPY database/ database/
RUN composer dump-autoload -d backend --optimize --no-dev \
 && composer dump-autoload -d database --optimize --no-dev
