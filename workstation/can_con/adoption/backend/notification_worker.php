<?php
require_once __DIR__ . '/vendor/autoload.php';

use App\Infrastructure\Messaging\RabbitMqClient;
use App\Workers\NotificationWorker;
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$mq = new RabbitMqClient($_ENV['RABBITMQ_HOST'], (int)$_ENV['RABBITMQ_PORT'], $_ENV['RABBITMQ_USER'], $_ENV['RABBITMQ_PASS']);
$worker = new NotificationWorker($mq);
$worker->run();