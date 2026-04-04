<?php declare(strict_types=1);

namespace App\Workers;

use App\Infrastructure\Messaging\RabbitMqClient;

final class DBridgeWorker
{
    public function __construct(private RabbitMqClient $mq)
    {
    }

    public function run(): void
    {
        echo "[DBridgeWorker] Registering consumers...\n";

        $this->mq->registerConsumer('bridge.auth.register',       [$this, 'handleAuthRegister']);
        $this->mq->registerConsumer('bridge.auth.login',          [$this, 'handleAuthLogin']);
        $this->mq->registerConsumer('bridge.auth.resetPassword',  [$this, 'handleResetPassword']);
        $this->mq->registerConsumer('bridge.profile.update',      [$this, 'handleProfileUpdate']);
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

        $this->mq->wait();
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
            try { $fn(); } catch (\Throwable $e) { echo "[DBridgeWorker][ERROR] {$e->getMessage()}\n"; }
            exit(0);
        }
        $msg->ack();
        pcntl_waitpid(-1, $status, WNOHANG);
    }

    private function relay(string $bridgeQueue, string $dbQueue, string $dbResultQueue, string $bridgeResultQueue, array $data, ?string $corrId): void
    {
        $mq = new RabbitMqClient(
            $_ENV['RABBITMQ_HOST'] ?? '100.87.19.28',
            (int)($_ENV['RABBITMQ_PORT'] ?? 5672),
            $_ENV['RABBITMQ_USER'] ?? 'admin',
            $_ENV['RABBITMQ_PASS'] ?? 'REDACTED'
        );
        echo "[DBridgeWorker] Relaying {$bridgeQueue} → {$dbQueue} (corr:{$corrId})\n";
        $mq->publish($dbQueue, $data, $corrId);
        $result = $mq->waitForResponse($dbResultQueue, $corrId);
        $mq->publish($bridgeResultQueue, $result ?? ['success' => false, 'error' => 'No response from database'], $corrId);
        echo "[DBridgeWorker] Done {$bridgeQueue} (corr:{$corrId})\n";
        $mq->close();
    }

    public function handleAuthRegister(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.auth.register', 'db.auth.register', 'db.result.auth.register', 'bridge.result.auth.register', $data, $corrId), $msg);
    }

    public function handleAuthLogin(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.auth.login', 'db.auth.login', 'db.result.auth.login', 'bridge.result.auth.login', $data, $corrId), $msg);
    }

    public function handleResetPassword(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.auth.resetPassword', 'db.auth.resetPassword', 'db.result.auth.resetPassword', 'bridge.result.auth.resetPassword', $data, $corrId), $msg);
    }

    public function handleProfileUpdate(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.profile.update', 'db.profile.update', 'db.result.profile.update', 'bridge.result.profile.update', $data, $corrId), $msg);
    }

    public function handleSheltersList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.shelters.list', 'db.shelters.list', 'db.result.shelters.list', 'bridge.result.shelters.list', $data, $corrId), $msg);
    }

    public function handleSheltersGet(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.shelters.get', 'db.shelters.get', 'db.result.shelters.get', 'bridge.result.shelters.get', $data, $corrId), $msg);
    }

    public function handleApiKeyGet(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.api.key.get', 'db.api.key.get', 'db.result.api.key.get', 'bridge.result.api.key.get', $data, $corrId), $msg);
    }

    public function handleApiKeyRegenerate(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.api.key.regenerate', 'db.api.key.regenerate', 'db.result.api.key.regenerate', 'bridge.result.api.key.regenerate', $data, $corrId), $msg);
    }

    public function handleApiLogs(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.api.logs', 'db.api.logs', 'db.result.api.logs', 'bridge.result.api.logs', $data, $corrId), $msg);
    }

    public function handleDogsList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.dogs.list', 'db.dogs.list', 'db.result.dogs.list', 'bridge.result.dogs.list', $data, $corrId), $msg);
    }

    public function handleDogsGet(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.dogs.get', 'db.dogs.get', 'db.result.dogs.get', 'bridge.result.dogs.get', $data, $corrId), $msg);
    }

    public function handleApplicationSubmit(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.application.submit', 'db.application.submit', 'db.result.application.submit', 'bridge.result.application.submit', $data, $corrId), $msg);
    }

    public function handleApplicationStatus(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.application.status', 'db.application.status', 'db.result.application.status', 'bridge.result.application.status', $data, $corrId), $msg);
    }

    public function handleApplicationList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.application.list', 'db.application.list', 'db.result.application.list', 'bridge.result.application.list', $data, $corrId), $msg);
    }

    public function handleApplicationApprove(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.application.approve', 'db.application.approve', 'db.result.application.approve', 'bridge.result.application.approve', $data, $corrId), $msg);
    }

    public function handleApplicationReject(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.application.reject', 'db.application.reject', 'db.result.application.reject', 'bridge.result.application.reject', $data, $corrId), $msg);
    }

    public function handleAdoptionsList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.adoptions.list', 'db.adoptions.list', 'db.result.adoptions.list', 'bridge.result.adoptions.list', $data, $corrId), $msg);
    }

    public function handleAdoptionsGet(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.adoptions.get', 'db.adoptions.get', 'db.result.adoptions.get', 'bridge.result.adoptions.get', $data, $corrId), $msg);
    }

    public function handleAdoptionsFinalize(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.adoptions.finalize', 'db.adoptions.finalize', 'db.result.adoptions.finalize', 'bridge.result.adoptions.finalize', $data, $corrId), $msg);
    }

    public function handleQuizQuestions(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.quiz.questions', 'db.quiz.questions', 'db.result.quiz.questions', 'bridge.result.quiz.questions', $data, $corrId), $msg);
    }

    public function handleQuizSubmit(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.quiz.submit', 'db.quiz.submit', 'db.result.quiz.submit', 'bridge.result.quiz.submit', $data, $corrId), $msg);
    }

    public function handleQuizResults(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.quiz.results', 'db.quiz.results', 'db.result.quiz.results', 'bridge.result.quiz.results', $data, $corrId), $msg);
    }

    public function handleAdoptionLogCreate(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.adoption.log.create', 'db.adoption.log.create', 'db.result.adoption.log.create', 'bridge.result.adoption.log.create', $data, $corrId), $msg);
    }

    public function handleAdoptionLogList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.adoption.log.list', 'db.adoption.log.list', 'db.result.adoption.log.list', 'bridge.result.adoption.log.list', $data, $corrId), $msg);
    }

    public function handleFosterApply(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.foster.apply', 'db.foster.apply', 'db.result.foster.apply', 'bridge.result.foster.apply', $data, $corrId), $msg);
    }

    public function handleFosterList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.foster.list', 'db.foster.list', 'db.result.foster.list', 'bridge.result.foster.list', $data, $corrId), $msg);
    }

    public function handleFosterCancel(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.foster.cancel', 'db.foster.cancel', 'db.result.foster.cancel', 'bridge.result.foster.cancel', $data, $corrId), $msg);
    }

    public function handleParksList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.parks.list', 'db.parks.list', 'db.result.parks.list', 'bridge.result.parks.list', $data, $corrId), $msg);
    }

    public function handleResourcesList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.resources.list', 'db.resources.list', 'db.result.resources.list', 'bridge.result.resources.list', $data, $corrId), $msg);
    }

    public function handleResourcesGet(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.resources.get', 'db.resources.get', 'db.result.resources.get', 'bridge.result.resources.get', $data, $corrId), $msg);
    }

    public function handleStoriesList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.stories.list', 'db.stories.list', 'db.result.stories.list', 'bridge.result.stories.list', $data, $corrId), $msg);
    }

    public function handleStoriesSubmit(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.stories.submit', 'db.stories.submit', 'db.result.stories.submit', 'bridge.result.stories.submit', $data, $corrId), $msg);
    }

    public function handleStoriesApprove(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.stories.approve', 'db.stories.approve', 'db.result.stories.approve', 'bridge.result.stories.approve', $data, $corrId), $msg);
    }

    public function handleBadgesList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.badges.list', 'db.badges.list', 'db.result.badges.list', 'bridge.result.badges.list', $data, $corrId), $msg);
    }

    public function handleBadgesMine(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.badges.mine', 'db.badges.mine', 'db.result.badges.mine', 'bridge.result.badges.mine', $data, $corrId), $msg);
    }

    public function handleEnquiry(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.enquiry.send', 'db.enquiry.send', 'db.result.enquiry.send', 'bridge.result.enquiry.send', $data, $corrId), $msg);
    }

    public function handleChatStart(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.chat.start', 'db.chat.start', 'db.result.chat.start', 'bridge.result.chat.start', $data, $corrId), $msg);
    }

    public function handleChatMessage(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.chat.message', 'db.chat.message', 'db.result.chat.message', 'bridge.result.chat.message', $data, $corrId), $msg);
    }

    public function handleChatHistory(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.chat.history', 'db.chat.history', 'db.result.chat.history', 'bridge.result.chat.history', $data, $corrId), $msg);
    }

    public function handleMeetGreetSchedule(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.meetgreet.schedule', 'db.meetgreet.schedule', 'db.result.meetgreet.schedule', 'bridge.result.meetgreet.schedule', $data, $corrId), $msg);
    }

    public function handleMeetGreetList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.meetgreet.list', 'db.meetgreet.list', 'db.result.meetgreet.list', 'bridge.result.meetgreet.list', $data, $corrId), $msg);
    }

    public function handleMeetGreetCancel(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.meetgreet.cancel', 'db.meetgreet.cancel', 'db.result.meetgreet.cancel', 'bridge.result.meetgreet.cancel', $data, $corrId), $msg);
    }

    public function handleNotificationsList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.notifications.list', 'db.notifications.list', 'db.result.notifications.list', 'bridge.result.notifications.list', $data, $corrId), $msg);
    }

    public function handleNotificationsRead(array $data, $msg, ?string $corrId): void
    {
        $this->fork(fn() => $this->relay('bridge.notifications.read', 'db.notifications.read', 'db.result.notifications.read', 'bridge.result.notifications.read', $data, $corrId), $msg);
    }
}