<?php declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use App\Config\Config;
use App\Infrastructure\Messaging\RabbitMqClient;
use App\Workers\FrontendWorker;

Config::loadEnv(__DIR__ . '/.env');

echo " Canine Connections — Frontend Worker\n";

pcntl_async_signals(true);

$running = true;
pcntl_signal(SIGINT,  function () use (&$running) { $running = false; echo "\n[FrontendWorker] Shutting down...\n"; });
pcntl_signal(SIGTERM, function () use (&$running) { $running = false; echo "\n[FrontendWorker] Shutting down...\n"; });

while ($running) {
    try {
        $mq = new RabbitMqClient(
            $_ENV['RABBITMQ_HOST'],
            (int)$_ENV['RABBITMQ_PORT'],
            $_ENV['RABBITMQ_USER'],
            $_ENV['RABBITMQ_PASS']
        );
        echo "[FrontendWorker] RabbitMQ connected\n";

        $worker = new FrontendWorker($mq);
        $worker->run($running);
    } catch (\Throwable $e) {
        if (!$running) break;
        echo "[FrontendWorker][ERROR] {$e->getMessage()}\n";
        echo "[FrontendWorker] Reconnecting in 2 seconds...\n";
        for ($i = 0; $i < 20 && $running; $i++) {
            usleep(100000);
        }
    }
}

echo "[FrontendWorker] Stopped.\n";