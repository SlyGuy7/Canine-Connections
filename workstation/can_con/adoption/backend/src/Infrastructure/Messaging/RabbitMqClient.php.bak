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
        'request.auth.resetPassword',
        'request.profile.update',
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
        'notifications',
        'bridge.auth.register',
        'bridge.auth.login',
        'bridge.auth.resetPassword',
        'bridge.profile.update',
        'bridge.shelters.list',
        'bridge.shelters.get',
        'bridge.api.key.get',
        'bridge.api.key.regenerate',
        'bridge.api.logs',
        'bridge.dogs.list',
        'bridge.dogs.get',
        'bridge.application.submit',
        'bridge.application.status',
        'bridge.application.list',
        'bridge.application.approve',
        'bridge.application.reject',
        'bridge.adoptions.list',
        'bridge.adoptions.get',
        'bridge.adoptions.finalize',
        'bridge.quiz.questions',
        'bridge.quiz.submit',
        'bridge.quiz.results',
        'bridge.adoption.log.create',
        'bridge.adoption.log.list',
        'bridge.foster.apply',
        'bridge.foster.list',
        'bridge.foster.cancel',
        'bridge.parks.list',
        'bridge.resources.list',
        'bridge.resources.get',
        'bridge.stories.list',
        'bridge.stories.submit',
        'bridge.stories.approve',
        'bridge.badges.list',
        'bridge.badges.mine',
        'bridge.enquiry.send',
        'bridge.chat.start',
        'bridge.chat.message',
        'bridge.chat.history',
        'bridge.meetgreet.schedule',
        'bridge.meetgreet.list',
        'bridge.meetgreet.cancel',
        'bridge.notifications.list',
        'bridge.notifications.read',
        'db.auth.register',
        'db.auth.login',
        'db.auth.resetPassword',
        'db.profile.update',
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

        echo "[MQ] → {$queue}" . ($correlationId ? " (corr:{$correlationId})" : '') . "\n";
    }

    public function publishAndWait(string $requestQueue, array $payload, string $correlationId, int $timeoutSeconds = 25): ?array
    {
        $replyQueue = $requestQueue . '.reply.' . $correlationId;

        $this->channel->queue_declare($replyQueue, false, false, true, true);

        $this->publish($requestQueue, $payload, $correlationId, $replyQueue);

        echo "[MQ] Waiting on {$replyQueue} (corr:{$correlationId})...\n";

        $startTime = time();
        while (true) {
            $msg = $this->channel->basic_get($replyQueue, true);
            if ($msg) {
                $result = json_decode($msg->body, true) ?? [];
                echo "[MQ] ← {$replyQueue} received\n";
                return $result;
            }
            if ((time() - $startTime) >= $timeoutSeconds) {
                echo "[MQ][WARN] Timeout on {$replyQueue}\n";
                break;
            }
            usleep(50000);
        }

        return null;
    }

    public function registerConsumer(string $queue, callable $callback): void
    {
        $this->channel->basic_qos(null, 1, null);

        $this->channel->basic_consume(
            $queue, '', false, false, false, false,
            function ($msg) use ($callback, $queue) {
                $data     = json_decode($msg->body, true) ?? [];
                $msgProps = $msg->get_properties();
                $corrId   = $msgProps['correlation_id'] ?? null;
                echo "[MQ] ← {$queue}" . ($corrId ? " (corr:{$corrId})" : '') . "\n";
                $callback($data, $msg, $corrId);
            }
        );
    }

    public function waitForResponse(string $queue, string $correlationId, int $timeoutSeconds = 25): ?array
    {
        $startTime = time();
        echo "[MQ] Waiting on {$queue} (corr:{$correlationId})...\n";

        while (true) {
            $msg = $this->channel->basic_get($queue, true);
            if ($msg) {
                $msgProps  = $msg->get_properties();
                $msgCorrId = $msgProps['correlation_id'] ?? null;
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
            usleep(50000);
        }

        return null;
    }

    public function wait(bool &$running = true): void
    {
        echo "[MQ] Event loop running...\n";
        while ($running && $this->channel->is_consuming()) {
            try { $this->channel->wait(null, false, 1); } catch (\PhpAmqpLib\Exception\AMQPTimeoutException $e) {}
            pcntl_signal_dispatch();
        }
    }

    public function close(): void
    {
        $this->channel->close();
        $this->connection->close();
    }
}