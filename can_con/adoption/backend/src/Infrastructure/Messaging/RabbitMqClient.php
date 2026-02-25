<?php declare(strict_types=1);

namespace App\Infrastructure\Messaging;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

final class RabbitMqClient
{
    private AMQPStreamConnection $connection;
    private $channel;
    private string $queue = 'applications.review';

    public function __construct()
    {
        $this->connection = new AMQPStreamConnection(
            '127.0.0.1',
            5672,
            'guest',
            'guest'
        );

        $this->channel = $this->connection->channel();

        $this->channel->queue_declare(
            $this->queue,
            false,
            true,
            false,
            false
        );
    }

    // WRITE
    public function publish(array $payload): void
    {
        $msg = new AMQPMessage(
            json_encode($payload),
            ['delivery_mode' => 2]
        );

        $this->channel->basic_publish(
            $msg,
            '',
            $this->queue
        );
    }

    // READ
    public function consume(callable $callback): void
    {
        $this->channel->basic_consume(
            $this->queue,
            '',
            false,
            true,
            false,
            false,
            function ($msg) use ($callback) {
                $data = json_decode($msg->body, true);
                $callback($data);
            }
        );

        while ($this->channel->is_consuming()) {
            $this->channel->wait();
        }
    }
}
