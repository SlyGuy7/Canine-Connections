<?php declare(strict_types=1);

namespace App\Infrastructure\Messaging;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Exception\AMQPTimeoutException;
use PhpAmqpLib\Message\AMQPMessage;
use PhpAmqpLib\Wire\AMQPTable;

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
        int $port = 5672,
        string $user = 'guest',
        string $pass = 'guest'
    ) {
        $host2 = $_ENV['RABBITMQ_HOST2'] ?? $host;
        $host3 = $_ENV['RABBITMQ_HOST3'] ?? $host;

        $hosts = [
            [
                'host' => $host,
                'port' => $port,
                'user' => $user,
                'password' => $pass,
                'vhost' => '/',
            ],
            [
                'host' => $host2,
                'port' => $port,
                'user' => $user,
                'password' => $pass,
                'vhost' => '/',
            ],
            [
                'host' => $host3,
                'port' => $port,
                'user' => $user,
                'password' => $pass,
                'vhost' => '/',
            ],
        ];

        $hosts = array_values(array_unique($hosts, SORT_REGULAR));

        $this->connection = AMQPStreamConnection::create_connection(
            $hosts,
            [
                'connection_timeout' => 10.0,
                'read_write_timeout' => 30.0,
                'heartbeat' => 0,
                'keepalive' => false,
                'channel_rpc_timeout' => 30.0,
            ]
        );

        $this->channel = $this->connection->channel();

        foreach ($this->queues as $queue) {
            $this->channel->queue_declare($queue, false, true, false, false);
        }
    }

    public function publish(
        string $queue,
        array $payload,
        ?string $correlationId = null,
        ?string $replyTo = null
    ): void {
        $props = [
            'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
            'content_type' => 'application/json',
        ];

        if ($correlationId !== null) {
            $props['correlation_id'] = $correlationId;
        }

        if ($replyTo !== null) {
            $props['reply_to'] = $replyTo;
        }

        $body = json_encode($payload, JSON_UNESCAPED_SLASHES);
        if ($body === false) {
            throw new \RuntimeException('Failed to encode RabbitMQ payload to JSON.');
        }

        $this->channel->basic_publish(
            new AMQPMessage($body, $props),
            '',
            $queue
        );

        echo "[MQ] → {$queue}" . ($correlationId ? " (corr:{$correlationId})" : '') . "\n";
    }

    public function publishAndWait(
        string $requestQueue,
        array $payload,
        string $correlationId,
        int $timeoutSeconds = 25
    ): ?array {
        $replyQueue = $requestQueue . '.reply.' . $correlationId;

        $this->channel->queue_declare(
            $replyQueue,
            false,
            false,
            false,
            true,
            false,
            new AMQPTable(['x-message-ttl' => 60000])
        );

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
            $queue,
            '',
            false,
            false,
            false,
            false,
            function ($msg) use ($callback, $queue) {
                $data = json_decode($msg->body, true) ?? [];
                $msgProps = $msg->get_properties();
                $corrId = $msgProps['correlation_id'] ?? null;

                echo "[MQ] ← {$queue}" . ($corrId ? " (corr:{$corrId})" : '') . "\n";

                $callback($data, $msg, $corrId);
            }
        );
    }

    public function wait(bool &$running = true): void
    {
        echo "[MQ] Event loop running...\n";

        while ($running && $this->channel->is_consuming()) {
            try {
                $this->channel->wait(null, false, 1);
            } catch (AMQPTimeoutException $e) {
                
            }

            if (function_exists('pcntl_signal_dispatch')) {
                pcntl_signal_dispatch();
            }
        }
    }

    public function afterFork(): void
    {
        try {
            $connectionReflection = new \ReflectionObject($this->connection);

            if (!$connectionReflection->hasProperty('io')) {
                return;
            }

            $ioProp = $connectionReflection->getProperty('io');
            $ioProp->setAccessible(true);
            $io = $ioProp->getValue($this->connection);

            if (!is_object($io)) {
                return;
            }

            $ioReflection = new \ReflectionObject($io);
            if (!$ioReflection->hasProperty('sock')) {
                return;
            }

            $sockProp = $ioReflection->getProperty('sock');
            $sockProp->setAccessible(true);
            $sock = $sockProp->getValue($io);

            if (is_resource($sock)) {
                fclose($sock);
            }
        } catch (\Throwable $e) {
            
        }
    }

    public function close(): void
    {
        try {
            $this->channel->close();
        } catch (\Throwable $e) {
        }

        try {
            $this->connection->close();
        } catch (\Throwable $e) {
        }
    }
}