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

        'request.shelters.list',
        'request.shelters.get',

        'request.api.key.get',
        'request.api.key.regenerate',
        'request.api.logs',

        'request.dogs.list',
        'request.dogs.get',

        'request.application.submit',
        'request.application.status',
        'request.application.list',
        'request.application.approve',
        'request.application.reject',

        'request.adoptions.list',
        'request.adoptions.get',
        'request.adoptions.finalize',

        'request.quiz.questions',
        'request.quiz.submit',
        'request.quiz.results',

        'request.adoption.log.create',
        'request.adoption.log.list',

        'request.foster.apply',
        'request.foster.list',
        'request.foster.cancel',

        'request.parks.list',

        'request.resources.list',
        'request.resources.get',

        'request.stories.list',
        'request.stories.submit',
        'request.stories.approve',

        'request.badges.list',
        'request.badges.mine',

        'request.enquiry.send',
        'request.chat.start',
        'request.chat.message',
        'request.chat.history',

        'request.meetgreet.schedule',
        'request.meetgreet.list',
        'request.meetgreet.cancel',

        'request.notifications.list',
        'request.notifications.read',

        'response.auth.register',
        'response.auth.login',

        'response.shelters.list',
        'response.shelters.get',

        'response.api.key.get',
        'response.api.key.regenerate',
        'response.api.logs',

        'response.dogs.list',
        'response.dogs.get',

        'response.application.submit',
        'response.application.status',
        'response.application.list',
        'response.application.decision',

        'response.adoptions.list',
        'response.adoptions.get',
        'response.adoptions.finalize',

        'response.quiz.questions',
        'response.quiz.result',
        'response.quiz.results',

        'response.adoption.log.create',
        'response.adoption.log.list',

        'response.foster.apply',
        'response.foster.list',
        'response.foster.cancel',

        'response.parks.list',

        'response.resources.list',
        'response.resources.get',

        'response.stories.list',
        'response.stories.submit',
        'response.stories.approve',

        'response.badges.list',
        'response.badges.mine',

        'response.enquiry.reply',
        'response.chat.start',
        'response.chat.message',
        'response.chat.history',

        'response.meetgreet.schedule',
        'response.meetgreet.list',
        'response.meetgreet.cancel',

        'response.notifications.list',
        'response.notifications.read',
        'notifications',

        'db.auth.register',
        'db.auth.login',

        'db.shelters.list',
        'db.shelters.get',

        'db.api.key.get',
        'db.api.key.regenerate',
        'db.api.key.validate',
        'db.api.logs',
        'db.api.log',
        'db.api.dog.upsert',

        'db.dogs.list',
        'db.dogs.get',

        'db.application.submit',
        'db.application.status',
        'db.application.list',
        'db.application.approve',
        'db.application.reject',

        'db.adoptions.list',
        'db.adoptions.get',
        'db.adoptions.finalize',

        'db.quiz.questions',
        'db.quiz.submit',
        'db.quiz.results',

        'db.adoption.log.create',
        'db.adoption.log.list',

        'db.foster.apply',
        'db.foster.list',
        'db.foster.cancel',

        'db.parks.list',

        'db.resources.list',
        'db.resources.get',

        'db.stories.list',
        'db.stories.submit',
        'db.stories.approve',

        'db.badges.list',
        'db.badges.mine',

        'db.enquiry.send',
        'db.chat.start',
        'db.chat.message',
        'db.chat.history',

        'db.meetgreet.schedule',
        'db.meetgreet.list',
        'db.meetgreet.cancel',

        'db.notifications.list',
        'db.notifications.read',

        'db.result.auth.register',
        'db.result.auth.login',

        'db.result.shelters.list',
        'db.result.shelters.get',

        'db.result.api.key.get',
        'db.result.api.key.regenerate',
        'db.result.api.key.validate',
        'db.result.api.logs',
        'db.result.api.dog.upsert',

        'db.result.dogs.list',
        'db.result.dogs.get',

        'db.result.application.submit',
        'db.result.application.status',
        'db.result.application.list',
        'db.result.application.approve',
        'db.result.application.reject',

        'db.result.adoptions.list',
        'db.result.adoptions.get',
        'db.result.adoptions.finalize',

        'db.result.quiz.questions',
        'db.result.quiz.submit',
        'db.result.quiz.results',

        'db.result.adoption.log.create',
        'db.result.adoption.log.list',

        'db.result.foster.apply',
        'db.result.foster.list',
        'db.result.foster.cancel',

        'db.result.parks.list',

        'db.result.resources.list',
        'db.result.resources.get',

        'db.result.stories.list',
        'db.result.stories.submit',
        'db.result.stories.approve',

        'db.result.badges.list',
        'db.result.badges.mine',

        'db.result.enquiry.send',
        'db.result.chat.start',
        'db.result.chat.message',
        'db.result.chat.history',

        'db.result.meetgreet.schedule',
        'db.result.meetgreet.list',
        'db.result.meetgreet.cancel',

        'db.result.notifications.list',
        'db.result.notifications.read',
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

    public function publish(string $queue, array $payload, ?string $correlationId = null, ?string $replyTo = null): void
    {
        $props = [
            'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
            'content_type'  => 'application/json',
        ];

        if ($correlationId !== null) {
            $props['correlation_id'] = $correlationId;
        }

        if ($replyTo !== null) {
            $props['reply_to'] = $replyTo;
        }

        $this->channel->basic_publish(
            new AMQPMessage(json_encode($payload), $props),
            '',
            $queue
        );

        echo "[MQ] -> {$queue}" . ($correlationId ? " (corr:{$correlationId})" : '') . "\n";
    }

    public function publishAndWait(string $queue, array $payload, ?string $correlationId = null, int $timeoutSeconds = 30): ?array
    {
        if ($correlationId === null) {
            $correlationId = uniqid('req_', true);
        }

        $replyQueue = $queue . '.reply.' . $correlationId;

        // CRITICAL FIX: Declare the temporary reply queue before publishing
        $this->channel->queue_declare($replyQueue, false, false, false, true);

        // Publish and pass the explicit replyQueue so the worker knows where to respond
        $this->publish($queue, $payload, $correlationId, $replyQueue);

        // Wait for the response
        $result = $this->waitForResponse($replyQueue, $correlationId, $timeoutSeconds);

        // Clean up the temporary queue
        $this->channel->queue_delete($replyQueue);

        return $result;
    }

    public function registerConsumer(string $queue, callable $callback): void
    {
        $this->channel->basic_qos(null, 1, null);

        $this->channel->basic_consume(
            $queue, '', false, false, false, false,
            function ($msg) use ($callback, $queue) {
                $data     = json_decode($msg->body, true) ?? [];
                $msgProps = $msg->get_properties();
                $corrId   = $msgProps['correlation_id']
                         ?? ($msgProps['headers']['correlation_id']
                         ?? ($msgProps['headers']['correlation-id']
                         ?? null));
                $replyTo  = $msgProps['reply_to']
                         ?? ($msgProps['headers']['reply-to']
                         ?? null);
                echo "[MQ] ← {$queue}" . ($corrId ? " (corr:{$corrId})" : '') . "\n";
                $callback($data, $msg, $corrId, $replyTo);
            }
        );
    }

    public function waitForResponse(string $queue, string $correlationId, int $timeoutSeconds = 30): ?array
    {
        $startTime = time();
        echo "[MQ] Waiting on {$queue} (corr:{$correlationId})...\n";

        while (true) {
            $msg = $this->channel->basic_get($queue, true);

            if ($msg) {
                $msgProps  = $msg->get_properties();
                $msgCorrId = $msgProps['correlation_id']
                          ?? ($msgProps['headers']['correlation_id']
                          ?? ($msgProps['headers']['correlation-id']
                          ?? null));

                if ($msgCorrId === $correlationId) {
                    $result = json_decode($msg->body, true) ?? [];
                    echo "[MQ] ← {$queue} received\n";
                    return $result;
                }
            }

            if ((time() - $startTime) >= $timeoutSeconds) {
                echo "[MQ][WARN] Timeout on {$queue}\n";
                break;
            }

            usleep(100000);
        }

        return null;
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