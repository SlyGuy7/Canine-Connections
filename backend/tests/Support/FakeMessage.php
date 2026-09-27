<?php declare(strict_types=1);

namespace Tests\Support;

// Stands in for an AMQPMessage delivered to a consumer.
final class FakeMessage
{
    public bool $acked = false;

    public function __construct(public string $replyTo)
    {
    }

    public function get_properties(): array
    {
        return ['reply_to' => $this->replyTo];
    }

    public function ack(): void
    {
        $this->acked = true;
    }
}
