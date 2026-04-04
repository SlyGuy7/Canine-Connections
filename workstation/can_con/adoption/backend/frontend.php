<?php declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use App\Config\Config;
use App\Infrastructure\Messaging\RabbitMqClient;
use App\Workers\FrontendWorker;

Config::loadEnv(__DIR__ . '/.env');

echo " Canine Connections — Frontend Worker\n";

try {
    $mq = new RabbitMqClient(
        $_ENV['RABBITMQ_HOST'],
        (int)$_ENV['RABBITMQ_PORT'],
        $_ENV['RABBITMQ_USER'],
        $_ENV['RABBITMQ_PASS']
    );
    echo "[FrontendWorker] RabbitMQ connected\n";
} catch (\Throwable $e) {
    echo "[FrontendWorker][FATAL] RabbitMQ connection failed: {$e->getMessage()}\n";
    exit(1);
}

pcntl_signal(SIGINT,  function () use ($mq) { $mq->close(); exit(0); });
pcntl_signal(SIGTERM, function () use ($mq) { $mq->close(); exit(0); });

$worker = new FrontendWorker($mq);
$worker->run();
