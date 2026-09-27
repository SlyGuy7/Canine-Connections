<?php declare(strict_types=1);

namespace App\Infrastructure\Messaging;

// The messaging operations the workers use. RabbitMqClient is the real implementation;
// tests substitute an in-memory bus.
interface MessageBus
{
    public function publish(string $queue, array $payload, ?string $correlationId = null, ?string $replyTo = null): void;

    // Publishes a request and blocks until the reply arrives; null on timeout.
    public function publishAndWait(string $requestQueue, array $payload, string $correlationId, int $timeoutSeconds = 25): ?array;

    // $callback receives (array $data, AMQPMessage $msg, ?string $correlationId, ?string $replyTo).
    public function registerConsumer(string $queue, callable $callback): void;

    public function wait(bool &$running = true): void;

    // Releases the parent's socket in a forked child so the two processes never share it.
    public function afterFork(): void;

    public function close(): void;
}
