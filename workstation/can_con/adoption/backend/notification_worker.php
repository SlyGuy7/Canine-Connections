<?php
require_once __DIR__ . '/vendor/autoload.php';

use App\Config\Config;
use App\Infrastructure\Messaging\RabbitMqClient;
use App\Workers\NotificationWorker;

// Use your application's built in configuration loader
Config::loadEnv(__DIR__ . '/.env');

$mq = new RabbitMqClient(
    $_ENV['RABBITMQ_HOST'],
    (int)$_ENV['RABBITMQ_PORT'],
    $_ENV['RABBITMQ_USER'],
    $_ENV['RABBITMQ_PASS']
);

$worker = new NotificationWorker($mq);
$worker->run();
