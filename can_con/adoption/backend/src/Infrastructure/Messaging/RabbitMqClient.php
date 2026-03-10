<?php declare(strict_types=1);

namespace App\Infrastructure\Messaging;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

final class RabbitMqClient
{
    private AMQPStreamConnection $connection;
    private $channel;

    private array $queues = [
        'request.auth.register',
        'request.auth.login',
        'request.dogs.list',
        'request.dogs.get',
        'request.application.submit',
        'request.application.status',
        'request.application.list',
        'request.application.approve',
        'request.application.reject',
        'request.enquiry.send',
        'request.quiz.submit',
        'request.foster.apply',

        'response.auth.register',
        'response.auth.login',
        'response.dogs.list',
        'response.dogs.get',
        'response.application.submit',
        'response.application.status',
        'response.application.list',
        'response.application.decision',
        'response.enquiry.reply',
        'response.quiz.result',
        'response.foster.apply',
        'notifications',

        'db.auth.register',
        'db.auth.login',
        'db.dogs.list',
        'db.dogs.get',
        'db.application.submit',
        'db.application.status',
        'db.application.list',
        'db.application.approve',
        'db.application.reject',
        'db.enquiry.send',
        'db.quiz.submit',
        'db.foster.apply',

        'db.result.auth.register',
        'db.result.auth.login',
        'db.result.dogs.list',
        'db.result.dogs.get',
        'db.result.application.submit',
        'db.result.application.status',
        'db.result.application.list',
        'db.result.application.approve',
        'db.result.application.reject',
        'db.result.enquiry.send',
        'db.result.quiz.submit',
        'db.result.foster.apply',
    ];

    public function __construct(
        string $host = '127.0.0.1',
        int    $port = 5672,
        string $user = 'guest',
        string $pass = 'guest'
    ) {
        $this->connection = new AMQPStreamConnection($host, $port, $user, $pass);
        $this->channel    = $this->connection->channel();

        foreach ($this->queues as $queue) {
            $this->channel->queue_declare($queue, false, true, false, false);
        }
    }

    public function publish(
        string  $queue,
        array   $payload,
        ?string $correlationId = null
    ): void {
        $props = [
            'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
            'content_type'  => 'application/json',
        ];

        if ($correlationId !== null) {
            $props['correlation_id'] = $correlationId;
        }

        $this->channel->basic_publish(
            new AMQPMessage(json_encode($payload), $props),
            '',
            $queue
        );

        echo "[MQ] → {$queue}" . ($correlationId ? " (corr:{$correlationId})" : '') . "\n";
    }

    public function registerConsumer(string $queue, callable $callback): void
    {
        $this->channel->basic_qos(null, 1, null);

        $this->channel->basic_consume(
            $queue, '', false, false, false, false,
            function ($msg) use ($callback, $queue) {
                $data   = json_decode($msg->body, true) ?? [];
                $corrId = $msg->get_properties()['correlation_id'] ?? null;

                echo "[MQ] ← {$queue}" . ($corrId ? " (corr:{$corrId})" : '') . "\n";

                $callback($data, $msg, $corrId);
            }
        );
    }

    public function waitForResponse(
        string $queue,
        string $correlationId,
        int    $timeoutSeconds = 10
    ): ?array {
        $result    = null;
        $startTime = time();

        echo "[MQ] Waiting for response on {$queue} (corr:{$correlationId})...\n";

        while (true) {
            $msg = $this->channel->basic_get($queue);

            if ($msg) {
                $msgCorrId = $msg->get_properties()['correlation_id'] ?? null;

                if ($msgCorrId === $correlationId) {
                    $result = json_decode($msg->body, true) ?? [];
                    $this->channel->basic_ack($msg->getDeliveryTag());
                    echo "[MQ] ← {$queue} response received\n";
                    break;
                }

                $this->channel->basic_nack($msg->getDeliveryTag(), false, true);
            }

            if ((time() - $startTime) >= $timeoutSeconds) {
                echo "[MQ][WARN] Timeout waiting on {$queue} (corr:{$correlationId})\n";
                break;
            }

            usleep(100000); 
        }

        return $result;
    }

    public function wait(): void
    {
        echo "[MQ] Event loop running...\n";

        while ($this->channel->is_consuming()) {
            $this->channel->wait();
            pcntl_signal_dispatch();
        }
    }

    public function close(): void
    {
        $this->channel->close();
        $this->connection->close();
    }
}