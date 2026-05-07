<?php declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use App\Config\Config;
use App\Infrastructure\Messaging\RabbitMqClient;
use App\Workers\DBridgeWorker;

Config::loadEnv(__DIR__ . '/.env');

date_default_timezone_set('America/New_York');

echo " Canine Connections — DBridge Worker\n";

pcntl_async_signals(true);

$running = true;
pcntl_signal(SIGINT,  function () use (&$running) { $running = false; echo "\n[DBridgeWorker] Shutting down...\n"; });
pcntl_signal(SIGTERM, function () use (&$running) { $running = false; echo "\n[DBridgeWorker] Shutting down...\n"; });

while ($running) {
    try {
        $mq = new RabbitMqClient(
            $_ENV['RABBITMQ_HOST'],
            (int)$_ENV['RABBITMQ_PORT'],
            $_ENV['RABBITMQ_USER'],
            $_ENV['RABBITMQ_PASS']
        );
        echo "[DBridgeWorker] RabbitMQ connected\n";

        $worker = new DBridgeWorker($mq);
        $worker->run($running);
    } catch (\Throwable $e) {
        if (!$running) break;
        echo "[DBridgeWorker][ERROR] {$e->getMessage()}\n";
        echo "[DBridgeWorker] Reconnecting in 2 seconds...\n";
        for ($i = 0; $i < 20 && $running; $i++) {
            usleep(100000);
        }
    }
}

echo "[DBridgeWorker] Stopped.\n";