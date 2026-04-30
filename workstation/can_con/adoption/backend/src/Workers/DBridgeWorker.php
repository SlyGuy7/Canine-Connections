<?php declare(strict_types=1);

namespace App\Workers;

use App\Infrastructure\Messaging\RabbitMqClient;

final class DBridgeWorker
{
    public function __construct(private RabbitMqClient $mq)
    {
    }

    public function run(bool &$running = true): void
    {
        echo "[DBridgeWorker] Registering consumers...\n";

        $this->mq->registerConsumer('bridge.auth.register',       [$this, 'handleAuthRegister']);
        $this->mq->registerConsumer('bridge.auth.login',          [$this, 'handleAuthLogin']);
        $this->mq->registerConsumer('bridge.auth.verify',         [$this, 'handleAuthVerify']);
        $this->mq->registerConsumer('bridge.auth.resetPassword',  [$this, 'handleResetPassword']);
        $this->mq->registerConsumer('bridge.profile.update',      [$this, 'handleProfileUpdate']);
        $this->mq->registerConsumer('bridge.account.delete',      [$this, 'handleAccountDelete']);
        $this->mq->registerConsumer('bridge.shelters.list',       [$this, 'handleSheltersList']);
        $this->mq->registerConsumer('bridge.shelters.get',        [$this, 'handleSheltersGet']);
        $this->mq->registerConsumer('bridge.api.key.get',         [$this, 'handleApiKeyGet']);
        $this->mq->registerConsumer('bridge.api.key.regenerate',  [$this, 'handleApiKeyRegenerate']);
        $this->mq->registerConsumer('bridge.api.logs',            [$this, 'handleApiLogs']);
        $this->mq->registerConsumer('bridge.dogs.list',           [$this, 'handleDogsList']);
        $this->mq->registerConsumer('bridge.dogs.get',            [$this, 'handleDogsGet']);
        $this->mq->registerConsumer('bridge.application.submit',  [$this, 'handleApplicationSubmit']);
        $this->mq->registerConsumer('bridge.application.status',  [$this, 'handleApplicationStatus']);
        $this->mq->registerConsumer('bridge.application.list',    [$this, 'handleApplicationList']);
        $this->mq->registerConsumer('bridge.application.approve', [$this, 'handleApplicationApprove']);
        $this->mq->registerConsumer('bridge.application.reject',  [$this, 'handleApplicationReject']);
        $this->mq->registerConsumer('bridge.adoptions.list',      [$this, 'handleAdoptionsList']);
        $this->mq->registerConsumer('bridge.adoptions.get',       [$this, 'handleAdoptionsGet']);
        $this->mq->registerConsumer('bridge.adoptions.finalize',  [$this, 'handleAdoptionsFinalize']);
        $this->mq->registerConsumer('bridge.quiz.questions',      [$this, 'handleQuizQuestions']);
        $this->mq->registerConsumer('bridge.quiz.submit',         [$this, 'handleQuizSubmit']);
        $this->mq->registerConsumer('bridge.quiz.results',        [$this, 'handleQuizResults']);
        $this->mq->registerConsumer('bridge.adoption.log.create', [$this, 'handleAdoptionLogCreate']);
        $this->mq->registerConsumer('bridge.adoption.log.list',   [$this, 'handleAdoptionLogList']);
        $this->mq->registerConsumer('bridge.foster.apply',        [$this, 'handleFosterApply']);
        $this->mq->registerConsumer('bridge.foster.list',         [$this, 'handleFosterList']);
        $this->mq->registerConsumer('bridge.foster.cancel',       [$this, 'handleFosterCancel']);
        $this->mq->registerConsumer('bridge.parks.list',          [$this, 'handleParksList']);
        $this->mq->registerConsumer('bridge.resources.list',      [$this, 'handleResourcesList']);
        $this->mq->registerConsumer('bridge.resources.get',       [$this, 'handleResourcesGet']);
        $this->mq->registerConsumer('bridge.stories.list',        [$this, 'handleStoriesList']);
        $this->mq->registerConsumer('bridge.stories.submit',      [$this, 'handleStoriesSubmit']);
        $this->mq->registerConsumer('bridge.stories.approve',     [$this, 'handleStoriesApprove']);
        $this->mq->registerConsumer('bridge.badges.list',         [$this, 'handleBadgesList']);
        $this->mq->registerConsumer('bridge.badges.mine',         [$this, 'handleBadgesMine']);
        $this->mq->registerConsumer('bridge.enquiry.send',        [$this, 'handleEnquiry']);
        $this->mq->registerConsumer('bridge.chat.start',          [$this, 'handleChatStart']);
        $this->mq->registerConsumer('bridge.chat.message',        [$this, 'handleChatMessage']);
        $this->mq->registerConsumer('bridge.chat.history',        [$this, 'handleChatHistory']);
        $this->mq->registerConsumer('bridge.meetgreet.schedule',  [$this, 'handleMeetGreetSchedule']);
        $this->mq->registerConsumer('bridge.meetgreet.list',      [$this, 'handleMeetGreetList']);
        $this->mq->registerConsumer('bridge.meetgreet.cancel',    [$this, 'handleMeetGreetCancel']);
        $this->mq->registerConsumer('bridge.notifications.list',  [$this, 'handleNotificationsList']);
        $this->mq->registerConsumer('bridge.notifications.read',  [$this, 'handleNotificationsRead']);

        echo "[DBridgeWorker] All consumers registered — listening\n";

        $this->mq->wait($running);
    }

    private function fork(callable $fn, $msg): void
    {
        $pid = pcntl_fork();
        if ($pid === -1) {
            echo "[DBridgeWorker][ERROR] Fork failed\n";
            $msg->ack();
            return;
        }
        if ($pid === 0) {
            $this->mq->afterFork();
            try {
                $fn();
            } catch (\Throwable $e) {
                echo "[DBridgeWorker][ERROR] " . $e->getMessage() . "\n";
            }
            exit(0);
        }
        $msg->ack();
        pcntl_waitpid(-1, $status, WNOHANG);
    }

    private function getReplyTo($msg): ?string
    {
        try {
            $props = $msg->get_properties();
            if (isset($props['reply_to']) && $props['reply_to'] !== '') {
                return (string)$props['reply_to'];
            }
            return null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function newMq(): RabbitMqClient
    {
        $hosts = array_values(array_filter([
            $_ENV['RABBITMQ_HOST3'] ?? null,
            $_ENV['RABBITMQ_HOST2'] ?? null,
            $_ENV['RABBITMQ_HOST']  ?? null,
        ]));
        $lastErr = null;
        foreach ($hosts as $i => $host) {
            try {
                $label = $i === 0 ? 'LOCAL' : 'SECONDARY';
                echo "[DBridgeWorker][RELAY] Connecting to RabbitMQ " . $label . ": " . $host . "\n";
                $mq = new RabbitMqClient(
                    $host,
                    (int)($_ENV['RABBITMQ_PORT'] ?? 5672),
                    $_ENV['RABBITMQ_USER'] ?? 'admin',
                    $_ENV['RABBITMQ_PASS'] ?? 'REDACTED',
                    false
                );
                echo "[DBridgeWorker][RELAY] Connected to RabbitMQ " . $label . ": " . $host . "\n";
                return $mq;
            } catch (\Throwable $e) {
                echo "[DBridgeWorker][RELAY] RabbitMQ " . $host . " failed — trying next...\n";
                $lastErr = $e;
            }
        }
        throw $lastErr ?? new \RuntimeException('All RabbitMQ nodes unreachable');
    }

    private function relay(
        string $bridgeQueue,
        string $dbQueue,
        array $data,
        ?string $corrId,
        ?string $replyTo
    ): void {
        $mq = $this->newMq();

        echo "[DBridgeWorker] Relaying {$bridgeQueue} -> {$dbQueue} (corr:{$corrId})\n";

        // Pass the frontend reply queue directly to the database worker
        // Note: Using publish() instead of publishAndWait()
        $mq->publish($dbQueue, $data, $corrId, $replyTo);

        $mq->close();
    }

    public function handleAccountDelete(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.account.delete', 'db.account.delete', $data, $corrId, $replyTo), $msg);
    }

    public function handleAuthRegister(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.auth.register', 'db.auth.register', $data, $corrId, $replyTo), $msg);
    }

    public function handleAuthLogin(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.auth.login', 'db.auth.login', $data, $corrId, $replyTo), $msg);
    }

    public function handleAuthVerify(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.auth.verify', 'db.auth.verify', $data, $corrId, $replyTo), $msg);
    }

    public function handleResetPassword(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.auth.resetPassword', 'db.auth.resetPassword', $data, $corrId, $replyTo), $msg);
    }

    public function handleProfileUpdate(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.profile.update', 'db.profile.update', $data, $corrId, $replyTo), $msg);
    }

    public function handleSheltersList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.shelters.list', 'db.shelters.list', $data, $corrId, $replyTo), $msg);
    }

    public function handleSheltersGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.shelters.get', 'db.shelters.get', $data, $corrId, $replyTo), $msg);
    }

    public function handleApiKeyGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.api.key.get', 'db.api.key.get', $data, $corrId, $replyTo), $msg);
    }

    public function handleApiKeyRegenerate(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.api.key.regenerate', 'db.api.key.regenerate', $data, $corrId, $replyTo), $msg);
    }

    public function handleApiLogs(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.api.logs', 'db.api.logs', $data, $corrId, $replyTo), $msg);
    }

    public function handleDogsList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.dogs.list', 'db.dogs.list', $data, $corrId, $replyTo), $msg);
    }

    public function handleDogsGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.dogs.get', 'db.dogs.get', $data, $corrId, $replyTo), $msg);
    }

    public function handleApplicationSubmit(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.application.submit', 'db.application.submit', $data, $corrId, $replyTo), $msg);
    }

    public function handleApplicationStatus(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.application.status', 'db.application.status', $data, $corrId, $replyTo), $msg);
    }

    public function handleApplicationList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.application.list', 'db.application.list', $data, $corrId, $replyTo), $msg);
    }

    public function handleApplicationApprove(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.application.approve', 'db.application.approve', $data, $corrId, $replyTo), $msg);
    }

    public function handleApplicationReject(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.application.reject', 'db.application.reject', $data, $corrId, $replyTo), $msg);
    }

    public function handleAdoptionsList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.adoptions.list', 'db.adoptions.list', $data, $corrId, $replyTo), $msg);
    }

    public function handleAdoptionsGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.adoptions.get', 'db.adoptions.get', $data, $corrId, $replyTo), $msg);
    }

    public function handleAdoptionsFinalize(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.adoptions.finalize', 'db.adoptions.finalize', $data, $corrId, $replyTo), $msg);
    }

    public function handleQuizQuestions(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.quiz.questions', 'db.quiz.questions', $data, $corrId, $replyTo), $msg);
    }

    public function handleQuizSubmit(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.quiz.submit', 'db.quiz.submit', $data, $corrId, $replyTo), $msg);
    }

    public function handleQuizResults(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.quiz.results', 'db.quiz.results', $data, $corrId, $replyTo), $msg);
    }

    public function handleAdoptionLogCreate(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.adoption.log.create', 'db.adoption.log.create', $data, $corrId, $replyTo), $msg);
    }

    public function handleAdoptionLogList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.adoption.log.list', 'db.adoption.log.list', $data, $corrId, $replyTo), $msg);
    }

    public function handleFosterApply(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.foster.apply', 'db.foster.apply', $data, $corrId, $replyTo), $msg);
    }

    public function handleFosterList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.foster.list', 'db.foster.list', $data, $corrId, $replyTo), $msg);
    }

    public function handleFosterCancel(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.foster.cancel', 'db.foster.cancel', $data, $corrId, $replyTo), $msg);
    }

    public function handleParksList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.parks.list', 'db.parks.list', $data, $corrId, $replyTo), $msg);
    }

    public function handleResourcesList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.resources.list', 'db.resources.list', $data, $corrId, $replyTo), $msg);
    }

    public function handleResourcesGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.resources.get', 'db.resources.get', $data, $corrId, $replyTo), $msg);
    }

    public function handleStoriesList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.stories.list', 'db.stories.list', $data, $corrId, $replyTo), $msg);
    }

    public function handleStoriesSubmit(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.stories.submit', 'db.stories.submit', $data, $corrId, $replyTo), $msg);
    }

    public function handleStoriesApprove(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.stories.approve', 'db.stories.approve', $data, $corrId, $replyTo), $msg);
    }

    public function handleBadgesList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.badges.list', 'db.badges.list', $data, $corrId, $replyTo), $msg);
    }

    public function handleBadgesMine(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.badges.mine', 'db.badges.mine', $data, $corrId, $replyTo), $msg);
    }

    public function handleEnquiry(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.enquiry.send', 'db.enquiry.send', $data, $corrId, $replyTo), $msg);
    }

    public function handleChatStart(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.chat.start', 'db.chat.start', $data, $corrId, $replyTo), $msg);
    }

    public function handleChatMessage(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.chat.message', 'db.chat.message', $data, $corrId, $replyTo), $msg);
    }

    public function handleChatHistory(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.chat.history', 'db.chat.history', $data, $corrId, $replyTo), $msg);
    }

    public function handleMeetGreetSchedule(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.meetgreet.schedule', 'db.meetgreet.schedule', $data, $corrId, $replyTo), $msg);
    }

    public function handleMeetGreetList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.meetgreet.list', 'db.meetgreet.list', $data, $corrId, $replyTo), $msg);
    }

    public function handleMeetGreetCancel(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.meetgreet.cancel', 'db.meetgreet.cancel', $data, $corrId, $replyTo), $msg);
    }

    public function handleNotificationsList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.notifications.list', 'db.notifications.list', $data, $corrId, $replyTo), $msg);
    }

    public function handleNotificationsRead(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->getReplyTo($msg);
        $this->fork(fn() => $this->relay('bridge.notifications.read', 'db.notifications.read', $data, $corrId, $replyTo), $msg);
    }
}