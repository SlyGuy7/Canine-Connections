<?php declare(strict_types=1);

namespace App\Workers;

use App\Infrastructure\Messaging\RabbitMqClient;
use App\Services\Mailer;

final class NotificationWorker
{
    public function __construct(private RabbitMqClient $mq) {}

    public function run(bool &$running = true): void
    {
        echo "[NotificationWorker] Listening for notifications...\n";
        $this->mq->registerConsumer('notifications', [$this, 'handleNotification']);
        $this->mq->wait();
    }

    public function handleNotification(array $data, $msg, ?string $corrId): void
    {
        echo "[NotificationWorker] Processing: " . ($data['event'] ?? 'unknown') . "\n";
        try {
            if (($data['event'] ?? '') === 'welcome_email') {
                if (!empty($_ENV['RESEND_API_KEY']) && $_ENV['RESEND_API_KEY'] !== 'test_key_disable_me_later') {
                    Mailer::welcome($data['email'], $data['first_name'] ?? '');
                } else {
                    echo "[NotificationWorker] Skipped email (No valid RESEND_API_KEY)\n";
                }
            }
        } catch (\Throwable $e) {
            echo "[NotificationWorker][ERROR] " . $e->getMessage() . "\n";
        }
        
        $msg->ack();
    }
}
