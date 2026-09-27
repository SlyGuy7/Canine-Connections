<?php declare(strict_types=1);

namespace Tests\Support;

use App\Infrastructure\Messaging\MessageBus;

// In-memory MessageBus: records everything published and answers bridge requests from
// per-queue responder callbacks, so a worker can be driven end to end without RabbitMQ.
final class FakeBus implements MessageBus
{
    /** @var array<string, callable> */
    public array $consumers = [];
    /** @var list<array{queue: string, payload: array}> */
    public array $published = [];
    /** @var list<array{queue: string, payload: array}> bridge requests, in order */
    public array $requests = [];
    /** @var array<string, callable(array): ?array> */
    private array $responders = [];

    public function respondTo(string $queue, callable $responder): void
    {
        $this->responders[$queue] = $responder;
    }

    // Delivers a message the way RabbitMQ would and returns the reply the worker published.
    public function deliver(string $queue, array $data): ?array
    {
        $msg = new FakeMessage('reply.' . $queue . '.' . bin2hex(random_bytes(4)));
        ($this->consumers[$queue])($data, $msg, 'corr-1', $msg->replyTo);
        if (!$msg->acked) {
            throw new \LogicException("{$queue}: message was never acked");
        }
        foreach ($this->published as $p) {
            if ($p['queue'] === $msg->replyTo) return $p['payload'];
        }
        return null;
    }

    public function requestsTo(string $queue): array
    {
        return array_values(array_map(fn ($r) => $r['payload'], array_filter($this->requests, fn ($r) => $r['queue'] === $queue)));
    }

    public function publish(string $queue, array $payload, ?string $correlationId = null, ?string $replyTo = null): void
    {
        $this->published[] = ['queue' => $queue, 'payload' => $payload];
    }

    public function publishAndWait(string $requestQueue, array $payload, string $correlationId, int $timeoutSeconds = 25): ?array
    {
        $this->requests[] = ['queue' => $requestQueue, 'payload' => $payload];
        $responder = $this->responders[$requestQueue] ?? null;
        return $responder ? $responder($payload) : ['success' => true];
    }

    public function registerConsumer(string $queue, callable $callback): void
    {
        $this->consumers[$queue] = $callback;
    }

    public function wait(bool &$running = true): void
    {
    }

    public function afterFork(): void
    {
    }

    public function close(): void
    {
    }
}
