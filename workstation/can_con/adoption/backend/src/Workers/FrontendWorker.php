<?php declare(strict_types=1);

namespace App\Workers;

use App\Infrastructure\Messaging\RabbitMqClient;
use App\Security\Encryption;
use App\Services\Mailer;

final class FrontendWorker
{
    private Encryption $enc;

    public function __construct(private RabbitMqClient $mq)
    {
        $this->enc = new Encryption();
    }

    public function run(bool &$running = true): void
    {
        echo "[FrontendWorker] Registering consumers...\n";

        $this->mq->registerConsumer('request.auth.register',       [$this, 'handleRegister']);
        $this->mq->registerConsumer('request.auth.login',          [$this, 'handleLogin']);
        $this->mq->registerConsumer('request.auth.verify',         [$this, 'handleVerifyEmail']);
        $this->mq->registerConsumer('request.auth.resetPassword',  [$this, 'handleResetPassword']);
        $this->mq->registerConsumer('request.profile.update',      [$this, 'handleProfileUpdate']);
        $this->mq->registerConsumer('request.account.delete',      [$this, 'handleAccountDelete']);
        $this->mq->registerConsumer('request.shelters.list',       [$this, 'handleSheltersList']);
        $this->mq->registerConsumer('request.shelters.get',        [$this, 'handleSheltersGet']);
        $this->mq->registerConsumer('request.api.key.get',         [$this, 'handleApiKeyGet']);
        $this->mq->registerConsumer('request.api.key.regenerate',  [$this, 'handleApiKeyRegenerate']);
        $this->mq->registerConsumer('request.api.logs',            [$this, 'handleApiLogs']);
        $this->mq->registerConsumer('request.dogs.list',           [$this, 'handleDogsList']);
        $this->mq->registerConsumer('request.dogs.get',            [$this, 'handleDogsGet']);
        $this->mq->registerConsumer('request.application.submit',  [$this, 'handleApplicationSubmit']);
        $this->mq->registerConsumer('request.application.status',  [$this, 'handleApplicationStatus']);
        $this->mq->registerConsumer('request.application.list',    [$this, 'handleApplicationList']);
        $this->mq->registerConsumer('request.application.approve', [$this, 'handleApplicationApprove']);
        $this->mq->registerConsumer('request.application.reject',  [$this, 'handleApplicationReject']);
        $this->mq->registerConsumer('request.adoptions.list',      [$this, 'handleAdoptionsList']);
        $this->mq->registerConsumer('request.adoptions.get',       [$this, 'handleAdoptionsGet']);
        $this->mq->registerConsumer('request.adoptions.finalize',  [$this, 'handleAdoptionsFinalize']);
        $this->mq->registerConsumer('request.quiz.questions',      [$this, 'handleQuizQuestions']);
        $this->mq->registerConsumer('request.quiz.submit',         [$this, 'handleQuiz']);
        $this->mq->registerConsumer('request.quiz.results',        [$this, 'handleQuizResults']);
        $this->mq->registerConsumer('request.adoption.log.create', [$this, 'handleAdoptionLogCreate']);
        $this->mq->registerConsumer('request.adoption.log.list',   [$this, 'handleAdoptionLogList']);
        $this->mq->registerConsumer('request.foster.apply',        [$this, 'handleFosterApply']);
        $this->mq->registerConsumer('request.foster.list',         [$this, 'handleFosterList']);
        $this->mq->registerConsumer('request.foster.cancel',       [$this, 'handleFosterCancel']);
        $this->mq->registerConsumer('request.parks.list',          [$this, 'handleParksList']);
        $this->mq->registerConsumer('request.resources.list',      [$this, 'handleResourcesList']);
        $this->mq->registerConsumer('request.resources.get',       [$this, 'handleResourcesGet']);
        $this->mq->registerConsumer('request.stories.list',        [$this, 'handleStoriesList']);
        $this->mq->registerConsumer('request.stories.submit',      [$this, 'handleStoriesSubmit']);
        $this->mq->registerConsumer('request.stories.approve',     [$this, 'handleStoriesApprove']);
        $this->mq->registerConsumer('request.badges.list',         [$this, 'handleBadgesList']);
        $this->mq->registerConsumer('request.badges.mine',         [$this, 'handleBadgesMine']);
        $this->mq->registerConsumer('request.enquiry.send',        [$this, 'handleEnquiry']);
        $this->mq->registerConsumer('request.chat.start',          [$this, 'handleChatStart']);
        $this->mq->registerConsumer('request.chat.message',        [$this, 'handleChatMessage']);
        $this->mq->registerConsumer('request.chat.history',        [$this, 'handleChatHistory']);
        $this->mq->registerConsumer('request.meetgreet.schedule',  [$this, 'handleMeetGreetSchedule']);
        $this->mq->registerConsumer('request.meetgreet.list',      [$this, 'handleMeetGreetList']);
        $this->mq->registerConsumer('request.meetgreet.cancel',    [$this, 'handleMeetGreetCancel']);
        $this->mq->registerConsumer('request.notifications.list',  [$this, 'handleNotificationsList']);
        $this->mq->registerConsumer('request.notifications.read',  [$this, 'handleNotificationsRead']);

        echo "[FrontendWorker] All consumers registered — listening\n";

        $this->mq->wait($running);
    }

    private function newMq(): RabbitMqClient
    {
        $hosts = array_filter([
            $_ENV['RABBITMQ_HOST3'] ?? null,
            $_ENV['RABBITMQ_HOST2'] ?? null,
            $_ENV['RABBITMQ_HOST']  ?? null,
        ]);
        $lastErr = null;
        foreach ($hosts as $host) {
            try {
                return new RabbitMqClient(
                    $host,
                    (int)$_ENV['RABBITMQ_PORT'],
                    $_ENV['RABBITMQ_USER'],
                    $_ENV['RABBITMQ_PASS'],
                    false
                );
            } catch (\Throwable $e) {
                $lastErr = $e;
            }
        }
        throw $lastErr;
    }

    private function fork(callable $fn, $msg): void
    {
        echo "[FrontendWorker][FORK] Attempting fork...\n";
        $pid = pcntl_fork();
        if ($pid === -1) {
            echo "[FrontendWorker][ERROR] Fork failed\n";
            $msg->ack();
            return;
        }
        if ($pid === 0) {
            echo "[FrontendWorker][FORK] Child process started (PID: " . getmypid() . ")\n";
            $this->mq->afterFork();
            try {
                echo "[FrontendWorker][FORK] Child connecting to RabbitMQ...\n";
                $mq = $this->newMq();
                echo "[FrontendWorker][FORK] Child connected — executing handler\n";
                $fn($mq);
                $mq->close();
                echo "[FrontendWorker][FORK] Child done\n";
            } catch (\Throwable $e) {
                echo "[FrontendWorker][ERROR] Child exception: " . $e->getMessage() . "\n";
                echo "[FrontendWorker][ERROR] " . $e->getTraceAsString() . "\n";
            }
            exit(0);
        }
        echo "[FrontendWorker][FORK] Parent acking message, child PID: {$pid}\n";
        $msg->ack();
        pcntl_waitpid(-1, $status, WNOHANG);
    }

    private function replyTo($msg): string
    {
        $props = $msg->get_properties();
        if (isset($props['reply_to']) && $props['reply_to'] !== '') {
            return (string)$props['reply_to'];
        }
        return '';
    }

    private function respond(RabbitMqClient $mq, string $fallbackQueue, string $replyTo, array $payload, ?string $corrId): void
    {
        $queue = $fallbackQueue;
        if ($replyTo !== '') {
            $queue = str_starts_with($replyTo, '/queue/')
                ? substr($replyTo, strlen('/queue/'))
                : $replyTo;
        }
        $mq->publish($queue, $payload, $corrId);
    }

    public function handleAccountDelete(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleAccountDelete: user_id=" . ($data['user_id'] ?? 'none') . "\n";
            try {
                if (empty($data['user_id'])) {
                    $this->respond($mq, 'response.account.delete', $replyTo, ['success' => false, 'error' => 'user_id is required'], $corrId);
                    return;
                }
                $result = $mq->publishAndWait('bridge.account.delete', ['user_id' => $data['user_id']], $corrId);
                $this->respond($mq, 'response.account.delete', $replyTo, $result ?? ['success' => false, 'error' => 'Could not delete account'], $corrId);
            } catch (\Throwable $e) {
                echo "[FrontendWorker][ERROR] handleAccountDelete: {$e->getMessage()}\n";
                $this->respond($mq, 'response.account.delete', $replyTo, ['success' => false, 'error' => 'Could not delete account'], $corrId);
            }
        }, $msg);
    }

    public function handleRegister(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleRegister: " . ($data['email'] ?? 'no email') . "\n";
            try {
                if (empty($data['email']) || empty($data['password'])) {
                    $this->respond($mq, 'response.auth.register', $replyTo, ['success' => false, 'error' => 'email and password are required'], $corrId);
                    return;
                }
                if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                    $this->respond($mq, 'response.auth.register', $replyTo, ['success' => false, 'error' => 'Please enter a valid email address'], $corrId);
                    return;
                }
                $firstName = $data['firstName'] ?? $data['first_name'] ?? '';
                $lastName  = $data['lastName']  ?? $data['last_name']  ?? '';
                $result = $mq->publishAndWait('bridge.auth.register', [
                    'email'         => $data['email'],
                    'password_hash' => $this->enc->hashPassword($data['password']),
                    'first_name'    => $this->encryptIfPresent($firstName),
                    'last_name'     => $this->encryptIfPresent($lastName),
                    'phone'         => $this->encryptIfPresent($data['phone']    ?? ''),
                    'address'       => $this->encryptIfPresent($data['address']  ?? ''),
                    'role'          => 'adopter',
                ], $corrId);
                if (!$result || empty($result['success'])) {
                    $this->respond($mq, 'response.auth.register', $replyTo, ['success' => false, 'error' => $result['error'] ?? 'Registration failed'], $corrId);
                    return;
                }
                $this->respond($mq, 'response.auth.register', $replyTo, [
                    'success'    => true,
                    'user_id'    => $result['user_id'] ?? null,
                    'email'      => $data['email'],
                    'first_name' => $firstName,
                    'last_name'  => $lastName,
                    'role'       => 'adopter',
                ], $corrId);
                $token  = $result['verification_token'] ?? null;
                $appUrl = rtrim($data['app_url'] ?? 'http://localhost:7012', '/');
                if ($token) {
                    Mailer::verifyEmail($data['email'], $firstName, "{$appUrl}/verify-email?token={$token}");
                }
            } catch (\Throwable $e) {
                echo "[FrontendWorker][ERROR] handleRegister: {$e->getMessage()}\n";
                $this->respond($mq, 'response.auth.register', $replyTo, ['success' => false, 'error' => 'Registration failed'], $corrId);
            }
        }, $msg);
    }

    public function handleLogin(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleLogin: " . ($data['email'] ?? 'no email') . "\n";
            try {
                if (empty($data['email']) || empty($data['password'])) {
                    $this->respond($mq, 'response.auth.login', $replyTo, ['success' => false, 'error' => 'email and password are required'], $corrId);
                    return;
                }
                $result = $mq->publishAndWait('bridge.auth.login', ['email' => $data['email']], $corrId);
                if (!$result || ($result['success'] ?? false) !== true || !isset($result['user'])) {
                    $this->respond($mq, 'response.auth.login', $replyTo, ['success' => false, 'error' => 'User not found'], $corrId);
                    return;
                }
                $user = $result['user'];
                if (isset($user['email_verified']) && (int)$user['email_verified'] === 0) {
                    $this->respond($mq, 'response.auth.login', $replyTo, ['success' => false, 'error' => 'Please verify your email before logging in. Check your inbox for the verification link.'], $corrId);
                    return;
                }
                if (!password_verify($data['password'], $user['password_hash'])) {
                    // CRITICAL: Security log for Fail2Ban monitoring
                    echo "[SECURITY_ALERT] Auth failure for: " . $data['email'] . "\n";
                    
                    $this->respond($mq, 'response.auth.login', $replyTo, ['success' => false, 'error' => 'Invalid password'], $corrId);
                    return;
                }
                unset($user['password_hash']);
                $user['first_name'] = isset($user['first_name']) && $user['first_name'] !== '' ? $this->dec($user['first_name']) : '';
                $user['last_name']  = isset($user['last_name'])  && $user['last_name']  !== '' ? $this->dec($user['last_name'])  : '';
                $this->respond($mq, 'response.auth.login', $replyTo, ['success' => true, 'user' => $user], $corrId);
                if (!empty($user['login_notifications'])) {
                    Mailer::loginAlert($user['email'] ?? $data['email'], $user['first_name']);
                }
            } catch (\Throwable $e) {
                echo "[FrontendWorker][ERROR] handleLogin: {$e->getMessage()}\n";
                $this->respond($mq, 'response.auth.login', $replyTo, ['success' => false, 'error' => 'Login failed'], $corrId);
            }
        }, $msg);
    }

    public function handleVerifyEmail(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                if (empty($data['token'])) {
                    $this->respond($mq, 'response.auth.verify', $replyTo, ['success' => false, 'error' => 'Verification token is required'], $corrId);
                    return;
                }
                $result = $mq->publishAndWait('bridge.auth.verify', ['token' => $data['token']], $corrId);
                $this->respond($mq, 'response.auth.verify', $replyTo, $result ?? ['success' => false, 'error' => 'Verification failed'], $corrId);
            } catch (\Throwable $e) {
                echo "[FrontendWorker][ERROR] handleVerifyEmail: {$e->getMessage()}\n";
                $this->respond($mq, 'response.auth.verify', $replyTo, ['success' => false, 'error' => 'Verification failed'], $corrId);
            }
        }, $msg);
    }

    public function handleResetPassword(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleResetPassword: " . ($data['email'] ?? 'no email') . "\n";
            try {
                if (empty($data['email']) || empty($data['oldPassword']) || empty($data['newPassword'])) {
                    $this->respond($mq, 'response.auth.resetPassword', $replyTo, ['success' => false, 'error' => 'All fields are required'], $corrId);
                    return;
                }
                $result = $mq->publishAndWait('bridge.auth.login', ['email' => $data['email']], $corrId);
                if (!$result || empty($result['user'])) {
                    $this->respond($mq, 'response.auth.resetPassword', $replyTo, ['success' => false, 'error' => 'User not found'], $corrId);
                    return;
                }
                $user = $result['user'];
                if (!password_verify($data['oldPassword'], $user['password_hash'])) {
                    $this->respond($mq, 'response.auth.resetPassword', $replyTo, ['success' => false, 'error' => 'Old password is incorrect'], $corrId);
                    return;
                }
                $result2 = $mq->publishAndWait('bridge.auth.resetPassword', [
                    'email'         => $data['email'],
                    'password_hash' => $this->enc->hashPassword($data['newPassword']),
                ], $corrId . '_reset');
                if (!$result2 || empty($result2['success'])) {
                    $this->respond($mq, 'response.auth.resetPassword', $replyTo, ['success' => false, 'error' => $result2['error'] ?? 'Reset failed'], $corrId);
                    return;
                }
                $this->respond($mq, 'response.auth.resetPassword', $replyTo, ['success' => true, 'message' => 'Password updated successfully'], $corrId);
                Mailer::passwordReset($data['email'], $user['first_name'] ?? '');
            } catch (\Throwable $e) {
                echo "[FrontendWorker][ERROR] handleResetPassword: {$e->getMessage()}\n";
                $this->respond($mq, 'response.auth.resetPassword', $replyTo, ['success' => false, 'error' => 'Reset failed'], $corrId);
            }
        }, $msg);
    }

    public function handleProfileUpdate(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            $userId = $data['user_id'] ?? null;
            echo "[FrontendWorker] handleProfileUpdate: user_id={$userId}\n";
            try {
                if (empty($userId)) {
                    $this->respond($mq, 'response.profile.update', $replyTo, ['success' => false, 'error' => 'user_id is required'], $corrId);
                    return;
                }
                $payload = [
                    'user_id'    => $userId,
                    'first_name' => $this->encryptIfPresent($data['first_name'] ?? ''),
                    'last_name'  => $this->encryptIfPresent($data['last_name']  ?? ''),
                    'phone'      => $this->encryptIfPresent($data['phone']      ?? ''),
                    'address'    => $this->encryptIfPresent($data['address']    ?? ''),
                ];
                if (array_key_exists('login_notifications', $data)) {
                    $payload['login_notifications'] = $data['login_notifications'] ? 1 : 0;
                }
                $result = $mq->publishAndWait('bridge.profile.update', $payload, $corrId);
                $this->respond($mq, 'response.profile.update', $replyTo, $result ?? ['success' => false, 'error' => 'Could not update profile'], $corrId);
            } catch (\Throwable $e) {
                echo "[FrontendWorker][ERROR] handleProfileUpdate: {$e->getMessage()}\n";
                $this->respond($mq, 'response.profile.update', $replyTo, ['success' => false, 'error' => 'Could not update profile'], $corrId);
            }
        }, $msg);
    }

    public function handleSheltersList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.shelters.list', ['search' => $data['search'] ?? null, 'limit' => $data['limit'] ?? 50, 'offset' => $data['offset'] ?? 0], $corrId);
                $this->respond($mq, 'response.shelters.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load shelters'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.shelters.list', $replyTo, ['success' => false, 'error' => 'Could not load shelters'], $corrId); }
        }, $msg);
    }

    public function handleSheltersGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                if (empty($data['shelter_id'])) { $this->respond($mq, 'response.shelters.get', $replyTo, ['success' => false, 'error' => 'shelter_id is required'], $corrId); return; }
                $result = $mq->publishAndWait('bridge.shelters.get', ['shelter_id' => $data['shelter_id']], $corrId);
                $this->respond($mq, 'response.shelters.get', $replyTo, $result ?? ['success' => false, 'error' => 'Shelter not found'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.shelters.get', $replyTo, ['success' => false, 'error' => 'Could not load shelter'], $corrId); }
        }, $msg);
    }

    public function handleApiKeyGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.api.key.get', ['shelter_id' => $data['shelter_id'] ?? null], $corrId);
                $this->respond($mq, 'response.api.key.get', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load API key'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.api.key.get', $replyTo, ['success' => false, 'error' => 'Could not load API key'], $corrId); }
        }, $msg);
    }

    public function handleApiKeyRegenerate(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $newKey = bin2hex(random_bytes(32));
                $result = $mq->publishAndWait('bridge.api.key.regenerate', ['shelter_id' => $data['shelter_id'] ?? null, 'new_key' => $newKey], $corrId);
                if (isset($result['success']) && $result['success']) $result['api_key'] = $newKey;
                $this->respond($mq, 'response.api.key.regenerate', $replyTo, $result ?? ['success' => false, 'error' => 'Could not regenerate key'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.api.key.regenerate', $replyTo, ['success' => false, 'error' => 'Could not regenerate key'], $corrId); }
        }, $msg);
    }

    public function handleApiLogs(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.api.logs', ['shelter_id' => $data['shelter_id'] ?? null, 'limit' => $data['limit'] ?? 50, 'offset' => $data['offset'] ?? 0], $corrId);
                $this->respond($mq, 'response.api.logs', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load logs'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.api.logs', $replyTo, ['success' => false, 'error' => 'Could not load logs'], $corrId); }
        }, $msg);
    }

    public function handleDogsList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleDogsList\n";
            try {
                $result = $mq->publishAndWait('bridge.dogs.list', [
                    'status'       => $data['status']       ?? 'available',
                    'breed'        => $data['breed']        ?? null,
                    'size'         => $data['size']         ?? null,
                    'energy_level' => $data['energy_level'] ?? null,
                    'shelter_id'   => $data['shelter_id']   ?? null,
                    'limit'        => $data['limit']        ?? 20,
                    'offset'       => $data['offset']       ?? 0,
                ], $corrId);
                $this->respond($mq, 'response.dogs.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load dogs'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.dogs.list', $replyTo, ['success' => false, 'error' => 'Could not load dogs'], $corrId); }
        }, $msg);
    }

    public function handleDogsGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            $dogId = $data['dog_id'] ?? null;
            echo "[FrontendWorker] handleDogsGet: dog_id={$dogId}\n";
            try {
                if ($dogId === null || $dogId === '') {
                    $this->respond($mq, 'response.dogs.get', $replyTo, ['success' => false, 'error' => 'dog_id is required'], $corrId);
                    return;
                }
                $result = $mq->publishAndWait('bridge.dogs.get', ['dog_id' => $dogId], $corrId);
                $this->respond($mq, 'response.dogs.get', $replyTo, $result ?? ['success' => false, 'error' => 'Dog not found'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.dogs.get', $replyTo, ['success' => false, 'error' => 'Could not load dog'], $corrId); }
        }, $msg);
    }

    public function handleApplicationSubmit(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                if (empty($data['user_id']) || empty($data['dog_id'])) { $this->respond($mq, 'response.application.submit', $replyTo, ['success' => false, 'error' => 'user_id and dog_id are required'], $corrId); return; }
                $result = $mq->publishAndWait('bridge.application.submit', [
                    'user_id' => $data['user_id'], 'dog_id' => $data['dog_id'],
                    'full_name' => $this->enc($data['full_name'] ?? ''), 'address' => $this->enc($data['address'] ?? ''), 'phone' => $this->enc($data['phone'] ?? ''),
                    'housing_type' => $data['housing_type'] ?? null, 'has_yard' => $data['has_yard'] ?? false, 'has_other_pets' => $data['has_other_pets'] ?? false,
                    'other_pets_description' => $data['other_pets_description'] ?? null, 'has_children' => $data['has_children'] ?? false,
                    'children_ages' => $data['children_ages'] ?? null, 'prior_pet_experience' => $data['prior_pet_experience'] ?? null,
                    'reason_for_adopting' => $data['reason_for_adopting'] ?? null, 'vet_reference' => $data['vet_reference'] ?? null,
                ], $corrId);
                $this->respond($mq, 'response.application.submit', $replyTo, $result ?? ['success' => false, 'error' => 'Could not submit application'], $corrId);
                if (isset($result['success']) && $result['success']) {
                    $mq->publish('notifications', ['event' => 'application_received', 'user_id' => $data['user_id'], 'message' => 'Your adoption application has been received.']);
                    Mailer::applicationReceived($data['email'] ?? '', $data['first_name'] ?? '', $data['dog_name'] ?? 'your chosen dog');
                }
            } catch (\Throwable $e) { $this->respond($mq, 'response.application.submit', $replyTo, ['success' => false, 'error' => 'Could not submit application'], $corrId); }
        }, $msg);
    }

    public function handleApplicationStatus(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.application.status', ['application_id' => $data['application_id'] ?? null, 'user_id' => $data['user_id'] ?? null], $corrId);
                if (isset($result['application']['full_name']) && $result['application']['full_name'] !== '') $result['application']['full_name'] = $this->dec($result['application']['full_name']);
                $this->respond($mq, 'response.application.status', $replyTo, $result ?? ['success' => false, 'error' => 'Could not fetch status'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.application.status', $replyTo, ['success' => false, 'error' => 'Could not fetch status'], $corrId); }
        }, $msg);
    }

    public function handleApplicationList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.application.list', ['status' => $data['status'] ?? null, 'shelter_id' => $data['shelter_id'] ?? null], $corrId);
                if (isset($result['applications']) && is_array($result['applications'])) {
                    foreach ($result['applications'] as &$app) {
                        $app['full_name']  = isset($app['full_name'])  && $app['full_name']  !== '' ? $this->dec($app['full_name'])  : '';
                        $app['phone']      = isset($app['phone'])      && $app['phone']      !== '' ? $this->dec($app['phone'])      : '';
                        $app['first_name'] = isset($app['first_name']) && $app['first_name'] !== '' ? $this->dec($app['first_name']) : '';
                        $app['last_name']  = isset($app['last_name'])  && $app['last_name']  !== '' ? $this->dec($app['last_name'])  : '';
                    }
                }
                $this->respond($mq, 'response.application.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not fetch applications'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.application.list', $replyTo, ['success' => false, 'error' => 'Could not fetch applications'], $corrId); }
        }, $msg);
    }

    public function handleApplicationApprove(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                if (empty($data['application_id'])) { $this->respond($mq, 'response.application.decision', $replyTo, ['success' => false, 'error' => 'application_id is required'], $corrId); return; }
                $result = $mq->publishAndWait('bridge.application.approve', ['application_id' => $data['application_id'], 'reviewed_by' => $data['reviewed_by'] ?? null, 'reviewer_notes' => $data['reviewer_notes'] ?? null], $corrId);
                $this->respond($mq, 'response.application.decision', $replyTo, $result ?? ['success' => false, 'error' => 'Could not approve'], $corrId);
                if (isset($result['success']) && $result['success'] && isset($result['user_id'])) {
                    $mq->publish('notifications', ['event' => 'application_approved', 'user_id' => $result['user_id'], 'message' => 'Your adoption application has been approved.']);
                    Mailer::applicationApproved($result['email'] ?? '', $result['first_name'] ?? '', $result['dog_name'] ?? 'your chosen dog');
                }
            } catch (\Throwable $e) { $this->respond($mq, 'response.application.decision', $replyTo, ['success' => false, 'error' => 'Could not approve'], $corrId); }
        }, $msg);
    }

    public function handleApplicationReject(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                if (empty($data['application_id'])) { $this->respond($mq, 'response.application.decision', $replyTo, ['success' => false, 'error' => 'application_id is required'], $corrId); return; }
                $result = $mq->publishAndWait('bridge.application.reject', ['application_id' => $data['application_id'], 'reviewed_by' => $data['reviewed_by'] ?? null, 'reviewer_notes' => $data['reviewer_notes'] ?? null], $corrId);
                $this->respond($mq, 'response.application.decision', $replyTo, $result ?? ['success' => false, 'error' => 'Could not reject'], $corrId);
                if (isset($result['success']) && $result['success'] && isset($result['user_id'])) {
                    $mq->publish('notifications', ['event' => 'application_rejected', 'user_id' => $result['user_id'], 'message' => 'Your adoption application was not successful.']);
                    Mailer::applicationRejected($result['email'] ?? '', $result['first_name'] ?? '', $result['dog_name'] ?? 'your chosen dog');
                }
            } catch (\Throwable $e) { $this->respond($mq, 'response.application.decision', $replyTo, ['success' => false, 'error' => 'Could not reject'], $corrId); }
        }, $msg);
    }

    public function handleAdoptionsList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.adoptions.list', ['user_id' => $data['user_id'] ?? null], $corrId);
                $this->respond($mq, 'response.adoptions.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load adoptions'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.adoptions.list', $replyTo, ['success' => false, 'error' => 'Could not load adoptions'], $corrId); }
        }, $msg);
    }

    public function handleAdoptionsGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.adoptions.get', ['adoption_id' => $data['adoption_id'] ?? null, 'user_id' => $data['user_id'] ?? null], $corrId);
                $this->respond($mq, 'response.adoptions.get', $replyTo, $result ?? ['success' => false, 'error' => 'Not found'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.adoptions.get', $replyTo, ['success' => false, 'error' => 'Could not load adoption'], $corrId); }
        }, $msg);
    }

    public function handleAdoptionsFinalize(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                if (empty($data['application_id'])) { $this->respond($mq, 'response.adoptions.finalize', $replyTo, ['success' => false, 'error' => 'application_id is required'], $corrId); return; }
                $result = $mq->publishAndWait('bridge.adoptions.finalize', ['application_id' => $data['application_id'], 'finalized_by' => $data['finalized_by'] ?? null, 'notes' => $data['notes'] ?? null], $corrId);
                $this->respond($mq, 'response.adoptions.finalize', $replyTo, $result ?? ['success' => false, 'error' => 'Could not finalize adoption'], $corrId);
                if (isset($result['success']) && $result['success'] && isset($result['user_id'])) {
                    $mq->publish('notifications', ['event' => 'adoption_finalized', 'user_id' => $result['user_id'], 'message' => 'Your adoption is now complete!']);
                    Mailer::adoptionComplete($result['email'] ?? '', $result['first_name'] ?? '', $result['dog_name'] ?? 'your dog');
                }
            } catch (\Throwable $e) { $this->respond($mq, 'response.adoptions.finalize', $replyTo, ['success' => false, 'error' => 'Could not finalize adoption'], $corrId); }
        }, $msg);
    }

    public function handleQuizQuestions(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.quiz.questions', [], $corrId);
                $this->respond($mq, 'response.quiz.questions', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load quiz'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.quiz.questions', $replyTo, ['success' => false, 'error' => 'Could not load quiz'], $corrId); }
        }, $msg);
    }

    public function handleQuiz(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.quiz.submit', ['user_id' => $data['user_id'] ?? null, 'answers' => $data['answers'] ?? []], $corrId);
                $this->respond($mq, 'response.quiz.result', $replyTo, $result ?? ['success' => false, 'error' => 'Quiz failed'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.quiz.result', $replyTo, ['success' => false, 'error' => 'Quiz failed'], $corrId); }
        }, $msg);
    }

    public function handleQuizResults(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.quiz.results', ['user_id' => $data['user_id'] ?? null], $corrId);
                $this->respond($mq, 'response.quiz.results', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load results'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.quiz.results', $replyTo, ['success' => false, 'error' => 'Could not load results'], $corrId); }
        }, $msg);
    }

    public function handleAdoptionLogCreate(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.adoption.log.create', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'log_type' => $data['log_type'] ?? 'general', 'title' => $data['title'] ?? '', 'notes' => $data['notes'] ?? '', 'log_date' => $data['log_date'] ?? date('Y-m-d')], $corrId);
                $this->respond($mq, 'response.adoption.log.create', $replyTo, $result ?? ['success' => false, 'error' => 'Could not save log'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.adoption.log.create', $replyTo, ['success' => false, 'error' => 'Could not save log'], $corrId); }
        }, $msg);
    }

    public function handleAdoptionLogList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.adoption.log.list', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'log_type' => $data['log_type'] ?? null], $corrId);
                $this->respond($mq, 'response.adoption.log.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load logs'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.adoption.log.list', $replyTo, ['success' => false, 'error' => 'Could not load logs'], $corrId); }
        }, $msg);
    }

    public function handleFosterApply(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.foster.apply', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'sponsorship_amount' => $data['sponsorship_amount'] ?? 0, 'start_date' => $data['start_date'] ?? date('Y-m-d')], $corrId);
                $this->respond($mq, 'response.foster.apply', $replyTo, $result ?? ['success' => false, 'error' => 'Foster failed'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.foster.apply', $replyTo, ['success' => false, 'error' => 'Foster failed'], $corrId); }
        }, $msg);
    }

    public function handleFosterList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.foster.list', ['user_id' => $data['user_id'] ?? null], $corrId);
                $this->respond($mq, 'response.foster.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load sponsorships'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.foster.list', $replyTo, ['success' => false, 'error' => 'Could not load sponsorships'], $corrId); }
        }, $msg);
    }

    public function handleFosterCancel(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.foster.cancel', ['foster_id' => $data['foster_id'] ?? null, 'user_id' => $data['user_id'] ?? null], $corrId);
                $this->respond($mq, 'response.foster.cancel', $replyTo, $result ?? ['success' => false, 'error' => 'Could not cancel'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.foster.cancel', $replyTo, ['success' => false, 'error' => 'Could not cancel sponsorship'], $corrId); }
        }, $msg);
    }

    public function handleParksList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.parks.list', ['shelter_id' => $data['shelter_id'] ?? null, 'lat' => $data['lat'] ?? null, 'lng' => $data['lng'] ?? null, 'radius_km' => $data['radius_km'] ?? 10], $corrId);
                $this->respond($mq, 'response.parks.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load parks'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.parks.list', $replyTo, ['success' => false, 'error' => 'Could not load parks'], $corrId); }
        }, $msg);
    }

    public function handleResourcesList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.resources.list', ['topic' => $data['topic'] ?? null, 'type' => $data['type'] ?? null, 'search' => $data['search'] ?? null, 'limit' => $data['limit'] ?? 20, 'offset' => $data['offset'] ?? 0], $corrId);
                $this->respond($mq, 'response.resources.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load resources'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.resources.list', $replyTo, ['success' => false, 'error' => 'Could not load resources'], $corrId); }
        }, $msg);
    }

    public function handleResourcesGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.resources.get', ['resource_id' => $data['resource_id'] ?? null], $corrId);
                $this->respond($mq, 'response.resources.get', $replyTo, $result ?? ['success' => false, 'error' => 'Not found'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.resources.get', $replyTo, ['success' => false, 'error' => 'Could not load resource'], $corrId); }
        }, $msg);
    }

    public function handleStoriesList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.stories.list', ['limit' => $data['limit'] ?? 10, 'offset' => $data['offset'] ?? 0], $corrId);
                $this->respond($mq, 'response.stories.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load stories'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.stories.list', $replyTo, ['success' => false, 'error' => 'Could not load stories'], $corrId); }
        }, $msg);
    }

    public function handleStoriesSubmit(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.stories.submit', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'title' => $data['title'] ?? '', 'story' => $data['story'] ?? '', 'photo_url' => $data['photo_url'] ?? null], $corrId);
                $this->respond($mq, 'response.stories.submit', $replyTo, $result ?? ['success' => false, 'error' => 'Could not submit story'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.stories.submit', $replyTo, ['success' => false, 'error' => 'Could not submit story'], $corrId); }
        }, $msg);
    }

    public function handleStoriesApprove(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                if (empty($data['story_id'])) { $this->respond($mq, 'response.stories.approve', $replyTo, ['success' => false, 'error' => 'story_id is required'], $corrId); return; }
                $result = $mq->publishAndWait('bridge.stories.approve', ['story_id' => $data['story_id'], 'approved_by' => $data['approved_by'] ?? null], $corrId);
                $this->respond($mq, 'response.stories.approve', $replyTo, $result ?? ['success' => false, 'error' => 'Could not approve story'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.stories.approve', $replyTo, ['success' => false, 'error' => 'Could not approve story'], $corrId); }
        }, $msg);
    }

    public function handleBadgesList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.badges.list', [], $corrId);
                $this->respond($mq, 'response.badges.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load badges'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.badges.list', $replyTo, ['success' => false, 'error' => 'Could not load badges'], $corrId); }
        }, $msg);
    }

    public function handleBadgesMine(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.badges.mine', ['user_id' => $data['user_id'] ?? null, 'auto_award' => null], $corrId);
                $this->respond($mq, 'response.badges.mine', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load badges'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.badges.mine', $replyTo, ['success' => false, 'error' => 'Could not load badges'], $corrId); }
        }, $msg);
    }

    public function handleEnquiry(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.enquiry.send', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'shelter_id' => $data['shelter_id'] ?? null, 'message' => $data['message'] ?? ''], $corrId);
                $this->respond($mq, 'response.enquiry.reply', $replyTo, $result ?? ['success' => false, 'error' => 'Could not send message'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.enquiry.reply', $replyTo, ['success' => false, 'error' => 'Could not send message'], $corrId); }
        }, $msg);
    }

    public function handleChatStart(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.chat.start', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'shelter_id' => $data['shelter_id'] ?? null], $corrId);
                $this->respond($mq, 'response.chat.start', $replyTo, $result ?? ['success' => false, 'error' => 'Could not start chat'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.chat.start', $replyTo, ['success' => false, 'error' => 'Could not start chat'], $corrId); }
        }, $msg);
    }

    public function handleChatMessage(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.chat.message', ['session_id' => $data['session_id'] ?? null, 'sender_id' => $data['sender_id'] ?? null, 'message' => $data['message'] ?? ''], $corrId);
                $this->respond($mq, 'response.chat.message', $replyTo, $result ?? ['success' => false, 'error' => 'Could not send message'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.chat.message', $replyTo, ['success' => false, 'error' => 'Could not send message'], $corrId); }
        }, $msg);
    }

    public function handleChatHistory(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.chat.history', ['session_id' => $data['session_id'] ?? null, 'user_id' => $data['user_id'] ?? null], $corrId);
                $this->respond($mq, 'response.chat.history', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load chat'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.chat.history', $replyTo, ['success' => false, 'error' => 'Could not load chat'], $corrId); }
        }, $msg);
    }

    public function handleMeetGreetSchedule(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.meetgreet.schedule', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'shelter_id' => $data['shelter_id'] ?? null, 'scheduled_date' => $data['scheduled_date'] ?? '', 'scheduled_time' => $data['scheduled_time'] ?? '', 'video_link' => $data['video_link'] ?? null], $corrId);
                $this->respond($mq, 'response.meetgreet.schedule', $replyTo, $result ?? ['success' => false, 'error' => 'Could not schedule meeting'], $corrId);
                if (isset($result['success']) && $result['success'] && isset($data['user_id'])) {
                    $mq->publish('notifications', ['event' => 'meetgreet_scheduled', 'user_id' => $data['user_id'], 'message' => "Your meet & greet is confirmed for {$data['scheduled_date']} at {$data['scheduled_time']}."]);
                    Mailer::meetGreetConfirmed($data['email'] ?? '', $data['first_name'] ?? '', $data['dog_name'] ?? 'your chosen dog', $data['scheduled_date'] ?? '', $data['scheduled_time'] ?? '');
                }
            } catch (\Throwable $e) { $this->respond($mq, 'response.meetgreet.schedule', $replyTo, ['success' => false, 'error' => 'Could not schedule meeting'], $corrId); }
        }, $msg);
    }

    public function handleMeetGreetList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.meetgreet.list', ['user_id' => $data['user_id'] ?? null], $corrId);
                $this->respond($mq, 'response.meetgreet.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load meetings'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.meetgreet.list', $replyTo, ['success' => false, 'error' => 'Could not load meetings'], $corrId); }
        }, $msg);
    }

    public function handleMeetGreetCancel(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.meetgreet.cancel', ['session_id' => $data['session_id'] ?? null, 'user_id' => $data['user_id'] ?? null], $corrId);
                $this->respond($mq, 'response.meetgreet.cancel', $replyTo, $result ?? ['success' => false, 'error' => 'Could not cancel meeting'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.meetgreet.cancel', $replyTo, ['success' => false, 'error' => 'Could not cancel meeting'], $corrId); }
        }, $msg);
    }

    public function handleNotificationsList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.notifications.list', ['user_id' => $data['user_id'] ?? null, 'unread' => $data['unread'] ?? false], $corrId);
                $this->respond($mq, 'response.notifications.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load notifications'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.notifications.list', $replyTo, ['success' => false, 'error' => 'Could not load notifications'], $corrId); }
        }, $msg);
    }

    public function handleNotificationsRead(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            try {
                $result = $mq->publishAndWait('bridge.notifications.read', ['user_id' => $data['user_id'] ?? null, 'notification_id' => $data['notification_id'] ?? null], $corrId);
                $this->respond($mq, 'response.notifications.read', $replyTo, $result ?? ['success' => false, 'error' => 'Could not mark as read'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.notifications.read', $replyTo, ['success' => false, 'error' => 'Could not mark as read'], $corrId); }
        }, $msg);
    }

    private function enc(string $value): string
    {
        return $value !== '' ? $this->enc->encrypt($value) : '';
    }

    private function dec(string $value): string
    {
        return $value !== '' ? $this->enc->decrypt($value) : '';
    }

    private function encryptIfPresent($value): string
    {
        return ($value !== null && $value !== '') ? $this->enc->encrypt($value) : '';
    }
}