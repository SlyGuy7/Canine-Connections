<?php declare(strict_types=1);

// Loads Composer dependencies and project class autoloading.
require_once __DIR__ . '/vendor/autoload.php';

use App\Config\Config;
use App\Infrastructure\Messaging\RabbitMqClient;
use App\Workers\DBridgeWorker;

// Loads environment variables needed for RabbitMQ connection settings.
Config::loadEnv(__DIR__ . '/.env');

echo " Canine Connections — DBridge Worker\n";

// Enables asynchronous signal handling so the worker can shut down cleanly.
pcntl_async_signals(true);

$running = true;

// Stops the worker when CTRL+C is pressed in the terminal.
pcntl_signal(SIGINT,  function () use (&$running) { $running = false; echo "\n[DBridgeWorker] Shutting down...\n"; });

// Stops the worker when the operating system sends a termination signal.
pcntl_signal(SIGTERM, function () use (&$running) { $running = false; echo "\n[DBridgeWorker] Shutting down...\n"; });

// Keeps the DBridge worker alive as a long-running backend service.
while ($running) {
    try {
        // Creates the RabbitMQ client using values from the .env file.
        $mq = new RabbitMqClient(
            $_ENV['RABBITMQ_HOST'],
            (int)$_ENV['RABBITMQ_PORT'],
            $_ENV['RABBITMQ_USER'],
            $_ENV['RABBITMQ_PASS']
        );

        echo "[DBridgeWorker] RabbitMQ connected\n";

        // Creates and starts the bridge worker.
        // This worker relays messages between bridge queues and database queues.
        $worker = new DBridgeWorker($mq);
        $worker->run($running);
    } catch (\Throwable $e) {
        if (!$running) break;

        echo "[DBridgeWorker][ERROR] {$e->getMessage()}\n";
        echo "[DBridgeWorker] Reconnecting in 2 seconds...\n";

        // Short reconnect delay that can exit early if shutdown is requested.
        for ($i = 0; $i < 20 && $running; $i++) {
            usleep(100000);
        }
    }
}

echo "[DBridgeWorker] Stopped.\n";