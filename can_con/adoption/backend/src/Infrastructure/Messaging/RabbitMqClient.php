<?php declare(strict_types=1);

namespace App\Infrastructure\Messaging;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

final class RabbitMqClient
{
    private AMQPStreamConnection $connection;
    private $channel;

    private array $queues = [

        // Frontend rabbitmqWorker - Backend [request.*]

        // Auth
        'request.auth.register',
        'request.auth.login',

        // Shelters
        'request.shelters.list',
        'request.shelters.get',

        // API Keys 
        'request.api.key.get',
        'request.api.key.regenerate',
        'request.api.logs',

        // Dogs
        'request.dogs.list',
        'request.dogs.get',

        // Applications
        'request.application.submit',
        'request.application.status',
        'request.application.list',
        'request.application.approve',
        'request.application.reject',

        // Adoptions
        'request.adoptions.list',
        'request.adoptions.get',
        'request.adoptions.finalize',

        // Quiz
        'request.quiz.questions',
        'request.quiz.submit',
        'request.quiz.results',

        // Post Adoption Logs
        'request.adoption.log.create',
        'request.adoption.log.list',

        // Virtual Foster
        'request.foster.apply',
        'request.foster.list',
        'request.foster.cancel',

        // Pet Parks
        'request.parks.list',

        // Resources
        'request.resources.list',
        'request.resources.get',

        // Success Stories
        'request.stories.list',
        'request.stories.submit',
        'request.stories.approve',

        // Badges
        'request.badges.list',
        'request.badges.mine',

        // Chat
        'request.enquiry.send',
        'request.chat.start',
        'request.chat.message',
        'request.chat.history',

        // Meet & Greet
        'request.meetgreet.schedule',
        'request.meetgreet.list',
        'request.meetgreet.cancel',

        // Notifications
        'request.notifications.list',
        'request.notifications.read',

        // Backend rabbitmqWorker - Frontend [response.*]

        // Auth
        'response.auth.register',
        'response.auth.login',

        // Shelters
        'response.shelters.list',
        'response.shelters.get',

        // API Keys
        'response.api.key.get',
        'response.api.key.regenerate',
        'response.api.logs',

        // Dogs
        'response.dogs.list',
        'response.dogs.get',

        // Applications
        'response.application.submit',
        'response.application.status',
        'response.application.list',
        'response.application.decision',

        // Adoptions
        'response.adoptions.list',
        'response.adoptions.get',
        'response.adoptions.finalize',

        // Quiz
        'response.quiz.questions',
        'response.quiz.result',
        'response.quiz.results',

        // Post Adoption Logs
        'response.adoption.log.create',
        'response.adoption.log.list',

        // Virtual Foster
        'response.foster.apply',
        'response.foster.list',
        'response.foster.cancel',

        // Pet Parks
        'response.parks.list',

        // Resources
        'response.resources.list',
        'response.resources.get',

        // Success Stories
        'response.stories.list',
        'response.stories.submit',
        'response.stories.approve',

        // Badges
        'response.badges.list',
        'response.badges.mine',

        // Chat
        'response.enquiry.reply',
        'response.chat.start',
        'response.chat.message',
        'response.chat.history',

        // Meet & Greet
        'response.meetgreet.schedule',
        'response.meetgreet.list',
        'response.meetgreet.cancel',

        // Notifications
        'response.notifications.list',
        'response.notifications.read',
        'notifications',

        // Backend rabbitmqWorker - MySQL rabbitmqWorker

        // Auth
        'db.auth.register',
        'db.auth.login',

        // Shelters
        'db.shelters.list',
        'db.shelters.get',

        // API Keys
        'db.api.key.get',
        'db.api.key.regenerate',
        'db.api.key.validate',
        'db.api.logs',
        'db.api.log',
        'db.api.dog.upsert',

        // Dogs
        'db.dogs.list',
        'db.dogs.get',

        // Applications
        'db.application.submit',
        'db.application.status',
        'db.application.list',
        'db.application.approve',
        'db.application.reject',

        // Adoptions
        'db.adoptions.list',
        'db.adoptions.get',
        'db.adoptions.finalize',

        // Quiz
        'db.quiz.questions',
        'db.quiz.submit',
        'db.quiz.results',

        // Post Adoption Logs
        'db.adoption.log.create',
        'db.adoption.log.list',

        // Virtual Foster
        'db.foster.apply',
        'db.foster.list',
        'db.foster.cancel',

        // Pet Parks
        'db.parks.list',

        // Resources
        'db.resources.list',
        'db.resources.get',

        // Success Stories
        'db.stories.list',
        'db.stories.submit',
        'db.stories.approve',

        // Badges
        'db.badges.list',
        'db.badges.mine',

        // Chat
        'db.enquiry.send',
        'db.chat.start',
        'db.chat.message',
        'db.chat.history',

        // Meet & Greet
        'db.meetgreet.schedule',
        'db.meetgreet.list',
        'db.meetgreet.cancel',

        // Notifications
        'db.notifications.list',
        'db.notifications.read',

        // MySQL rabbitmqWorker

        // Auth
        'db.result.auth.register',
        'db.result.auth.login',

        // Shelters
        'db.result.shelters.list',
        'db.result.shelters.get',

        // API Keys
        'db.result.api.key.get',
        'db.result.api.key.regenerate',
        'db.result.api.key.validate',
        'db.result.api.logs',
        'db.result.api.dog.upsert',

        // Dogs
        'db.result.dogs.list',
        'db.result.dogs.get',

        // Applications
        'db.result.application.submit',
        'db.result.application.status',
        'db.result.application.list',
        'db.result.application.approve',
        'db.result.application.reject',

        // Adoptions
        'db.result.adoptions.list',
        'db.result.adoptions.get',
        'db.result.adoptions.finalize',

        // Quiz
        'db.result.quiz.questions',
        'db.result.quiz.submit',
        'db.result.quiz.results',

        // Post Adoption Logs
        'db.result.adoption.log.create',
        'db.result.adoption.log.list',

        // Virtual Foster
        'db.result.foster.apply',
        'db.result.foster.list',
        'db.result.foster.cancel',

        // Pet Parks
        'db.result.parks.list',

        // Resources
        'db.result.resources.list',
        'db.result.resources.get',

        // Success Stories
        'db.result.stories.list',
        'db.result.stories.submit',
        'db.result.stories.approve',

        // Badges
        'db.result.badges.list',
        'db.result.badges.mine',

        // Chat
        'db.result.enquiry.send',
        'db.result.chat.start',
        'db.result.chat.message',
        'db.result.chat.history',

        // Meet & Greet
        'db.result.meetgreet.schedule',
        'db.result.meetgreet.list',
        'db.result.meetgreet.cancel',

        // Notifications
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

    public function publish(string $queue, array $payload, ?string $correlationId = null): void
    {
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

    public function waitForResponse(string $queue, string $correlationId, int $timeoutSeconds = 10): ?array
    {
        $result    = null;
        $startTime = time();

        echo "[MQ] Waiting on {$queue} (corr:{$correlationId})...\n";

        while (true) {
            $msg = $this->channel->basic_get($queue);

            if ($msg) {
                $msgCorrId = $msg->get_properties()['correlation_id'] ?? null;

                if ($msgCorrId === $correlationId) {
                    $result = json_decode($msg->body, true) ?? [];
                    $this->channel->basic_ack($msg->getDeliveryTag());
                    echo "[MQ] ← {$queue} received\n";
                    break;
                }

                $this->channel->basic_nack($msg->getDeliveryTag(), false, true);
            }

            if ((time() - $startTime) >= $timeoutSeconds) {
                echo "[MQ][WARN] Timeout on {$queue} (corr:{$correlationId})\n";
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