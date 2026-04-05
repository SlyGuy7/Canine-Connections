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

    public function run(): void
    {
        echo "[FrontendWorker] Registering consumers...\n";

        $this->mq->registerConsumer('request.auth.register',       [$this, 'handleRegister']);
        $this->mq->registerConsumer('request.auth.login',          [$this, 'handleLogin']);
        $this->mq->registerConsumer('request.auth.resetPassword',  [$this, 'handleResetPassword']);
        $this->mq->registerConsumer('request.profile.update',      [$this, 'handleProfileUpdate']);
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

        $this->mq->wait();
    }

    private function childMq(): RabbitMqClient
    {
        return new RabbitMqClient(
            $_ENV['RABBITMQ_HOST'],
            (int)$_ENV['RABBITMQ_PORT'],
            $_ENV['RABBITMQ_USER'],
            $_ENV['RABBITMQ_PASS']
        );
    }

    private function fork(callable $fn, $msg): void
    {
        $pid = pcntl_fork();
        if ($pid === -1) {
            echo "[FrontendWorker][ERROR] Fork failed\n";
            $msg->ack();
            return;
        }
        if ($pid === 0) {
            try {
                $mq = $this->childMq();
                $fn($mq);
                $mq->close();
            } catch (\Throwable $e) {
                echo "[FrontendWorker][ERROR] {$e->getMessage()}\n";
            }
            exit(0);
        }
        $msg->ack();
        pcntl_waitpid(-1, $status, WNOHANG);
    }

    private function replyTo($msg): string
    {
        $props = $msg->get_properties();
        $headers = $props['application_headers'] ?? [];
        if (isset($headers['reply-to'])) {
            $val = $headers['reply-to'];
            return is_object($val) ? $val->getValue() : (string)$val;
        }
        return '';
    }

    private function respond(RabbitMqClient $mq, string $fallbackQueue, string $replyTo, array $payload, ?string $corrId): void
    {
        $queue = $replyTo !== '' ? ltrim($replyTo, '/queue/') : $fallbackQueue;
        if (str_starts_with($replyTo, '/queue/')) {
            $queue = substr($replyTo, strlen('/queue/'));
        }
        $mq->publish($queue, $payload, $corrId);
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
                $mq->publish('bridge.auth.register', [
                    'email'         => $data['email'],
                    'password_hash' => $this->enc->hashPassword($data['password']),
                    'first_name'    => $this->encryptIfPresent($data['first_name'] ?? ''),
                    'last_name'     => $this->encryptIfPresent($data['last_name']  ?? ''),
                    'phone'         => $this->encryptIfPresent($data['phone']      ?? ''),
                    'address'       => $this->encryptIfPresent($data['address']    ?? ''),
                    'role'          => 'adopter',
                ], $corrId);
                $result = $mq->waitForResponse('bridge.result.auth.register', $corrId);
                if (!$result || empty($result['success'])) {
                    $this->respond($mq, 'response.auth.register', $replyTo, ['success' => false, 'error' => $result['error'] ?? 'Registration failed'], $corrId);
                    return;
                }
                $this->respond($mq, 'response.auth.register', $replyTo, [
                    'success'    => true,
                    'user_id'    => $result['user_id'] ?? null,
                    'email'      => $data['email'],
                    'first_name' => $data['first_name'] ?? '',
                    'last_name'  => $data['last_name']  ?? '',
                    'role'       => 'adopter',
                ], $corrId);
                Mailer::welcome($data['email'], $data['first_name'] ?? '');
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
                $mq->publish('bridge.auth.login', ['email' => $data['email']], $corrId);
                $result = $mq->waitForResponse('bridge.result.auth.login', $corrId);
                if (!$result || ($result['success'] ?? false) !== true || !isset($result['user'])) {
                    $this->respond($mq, 'response.auth.login', $replyTo, ['success' => false, 'error' => 'User not found'], $corrId);
                    return;
                }
                $user = $result['user'];
                if (!password_verify($data['password'], $user['password_hash'])) {
                    $this->respond($mq, 'response.auth.login', $replyTo, ['success' => false, 'error' => 'Invalid password'], $corrId);
                    return;
                }
                unset($user['password_hash']);
                $user['first_name'] = !empty($user['first_name']) ? $this->dec($user['first_name']) : '';
                $user['last_name']  = !empty($user['last_name'])  ? $this->dec($user['last_name'])  : '';
                $this->respond($mq, 'response.auth.login', $replyTo, ['success' => true, 'user' => $user], $corrId);
            } catch (\Throwable $e) {
                echo "[FrontendWorker][ERROR] handleLogin: {$e->getMessage()}\n";
                $this->respond($mq, 'response.auth.login', $replyTo, ['success' => false, 'error' => 'Login failed'], $corrId);
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
                $mq->publish('bridge.auth.login', ['email' => $data['email']], $corrId);
                $result = $mq->waitForResponse('bridge.result.auth.login', $corrId);
                if (!$result || empty($result['user'])) {
                    $this->respond($mq, 'response.auth.resetPassword', $replyTo, ['success' => false, 'error' => 'User not found'], $corrId);
                    return;
                }
                $user = $result['user'];
                if (!password_verify($data['oldPassword'], $user['password_hash'])) {
                    $this->respond($mq, 'response.auth.resetPassword', $replyTo, ['success' => false, 'error' => 'Old password is incorrect'], $corrId);
                    return;
                }
                $mq->publish('bridge.auth.resetPassword', [
                    'email'         => $data['email'],
                    'password_hash' => $this->enc->hashPassword($data['newPassword']),
                ], $corrId);
                $result = $mq->waitForResponse('bridge.result.auth.resetPassword', $corrId);
                if (!$result || empty($result['success'])) {
                    $this->respond($mq, 'response.auth.resetPassword', $replyTo, ['success' => false, 'error' => $result['error'] ?? 'Reset failed'], $corrId);
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
                $mq->publish('bridge.profile.update', [
                    'user_id'    => $userId,
                    'first_name' => $this->encryptIfPresent($data['first_name'] ?? ''),
                    'last_name'  => $this->encryptIfPresent($data['last_name']  ?? ''),
                    'phone'      => $this->encryptIfPresent($data['phone']      ?? ''),
                    'address'    => $this->encryptIfPresent($data['address']    ?? ''),
                ], $corrId);
                $result = $mq->waitForResponse('bridge.result.profile.update', $corrId);
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
            echo "[FrontendWorker] handleSheltersList\n";
            try {
                $mq->publish('bridge.shelters.list', ['search' => $data['search'] ?? null, 'limit' => $data['limit'] ?? 50, 'offset' => $data['offset'] ?? 0], $corrId);
                $result = $mq->waitForResponse('bridge.result.shelters.list', $corrId);
                $this->respond($mq, 'response.shelters.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load shelters'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.shelters.list', $replyTo, ['success' => false, 'error' => 'Could not load shelters'], $corrId); }
        }, $msg);
    }

    public function handleSheltersGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            $shelterId = $data['shelter_id'] ?? null;
            echo "[FrontendWorker] handleSheltersGet: shelter_id={$shelterId}\n";
            try {
                if (empty($shelterId)) {
                    $this->respond($mq, 'response.shelters.get', $replyTo, ['success' => false, 'error' => 'shelter_id is required'], $corrId);
                    return;
                }
                $mq->publish('bridge.shelters.get', ['shelter_id' => $shelterId], $corrId);
                $result = $mq->waitForResponse('bridge.result.shelters.get', $corrId);
                $this->respond($mq, 'response.shelters.get', $replyTo, $result ?? ['success' => false, 'error' => 'Shelter not found'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.shelters.get', $replyTo, ['success' => false, 'error' => 'Could not load shelter'], $corrId); }
        }, $msg);
    }

    public function handleApiKeyGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleApiKeyGet\n";
            try {
                $mq->publish('bridge.api.key.get', ['shelter_id' => $data['shelter_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.api.key.get', $corrId);
                $this->respond($mq, 'response.api.key.get', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load API key'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.api.key.get', $replyTo, ['success' => false, 'error' => 'Could not load API key'], $corrId); }
        }, $msg);
    }

    public function handleApiKeyRegenerate(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleApiKeyRegenerate\n";
            try {
                $newKey = bin2hex(random_bytes(32));
                $mq->publish('bridge.api.key.regenerate', ['shelter_id' => $data['shelter_id'] ?? null, 'new_key' => $newKey], $corrId);
                $result = $mq->waitForResponse('bridge.result.api.key.regenerate', $corrId);
                if (!empty($result['success'])) $result['api_key'] = $newKey;
                $this->respond($mq, 'response.api.key.regenerate', $replyTo, $result ?? ['success' => false, 'error' => 'Could not regenerate key'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.api.key.regenerate', $replyTo, ['success' => false, 'error' => 'Could not regenerate key'], $corrId); }
        }, $msg);
    }

    public function handleApiLogs(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleApiLogs\n";
            try {
                $mq->publish('bridge.api.logs', ['shelter_id' => $data['shelter_id'] ?? null, 'limit' => $data['limit'] ?? 50, 'offset' => $data['offset'] ?? 0], $corrId);
                $result = $mq->waitForResponse('bridge.result.api.logs', $corrId);
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
                $mq->publish('bridge.dogs.list', [
                    'status'       => $data['status']       ?? 'available',
                    'breed'        => $data['breed']        ?? null,
                    'size'         => $data['size']         ?? null,
                    'energy_level' => $data['energy_level'] ?? null,
                    'shelter_id'   => $data['shelter_id']   ?? null,
                    'limit'        => $data['limit']        ?? 20,
                    'offset'       => $data['offset']       ?? 0,
                ], $corrId);
                $result = $mq->waitForResponse('bridge.result.dogs.list', $corrId);
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
                $mq->publish('bridge.dogs.get', ['dog_id' => $dogId], $corrId);
                $result = $mq->waitForResponse('bridge.result.dogs.get', $corrId);
                $this->respond($mq, 'response.dogs.get', $replyTo, $result ?? ['success' => false, 'error' => 'Dog not found'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.dogs.get', $replyTo, ['success' => false, 'error' => 'Could not load dog'], $corrId); }
        }, $msg);
    }

    public function handleApplicationSubmit(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            $userId = $data['user_id'] ?? null;
            $dogId  = $data['dog_id']  ?? null;
            echo "[FrontendWorker] handleApplicationSubmit: user_id={$userId}\n";
            try {
                if (empty($userId) || empty($dogId)) {
                    $this->respond($mq, 'response.application.submit', $replyTo, ['success' => false, 'error' => 'user_id and dog_id are required'], $corrId);
                    return;
                }
                $mq->publish('bridge.application.submit', [
                    'user_id'                => $userId,
                    'dog_id'                 => $dogId,
                    'full_name'              => $this->enc($data['full_name']  ?? ''),
                    'address'                => $this->enc($data['address']    ?? ''),
                    'phone'                  => $this->enc($data['phone']      ?? ''),
                    'housing_type'           => $data['housing_type']           ?? null,
                    'has_yard'               => $data['has_yard']               ?? false,
                    'has_other_pets'         => $data['has_other_pets']         ?? false,
                    'other_pets_description' => $data['other_pets_description'] ?? null,
                    'has_children'           => $data['has_children']           ?? false,
                    'children_ages'          => $data['children_ages']          ?? null,
                    'prior_pet_experience'   => $data['prior_pet_experience']   ?? null,
                    'reason_for_adopting'    => $data['reason_for_adopting']    ?? null,
                    'vet_reference'          => $data['vet_reference']          ?? null,
                ], $corrId);
                $result = $mq->waitForResponse('bridge.result.application.submit', $corrId);
                $this->respond($mq, 'response.application.submit', $replyTo, $result ?? ['success' => false, 'error' => 'Could not submit application'], $corrId);
                if (!empty($result['success'])) {
                    $mq->publish('notifications', ['event' => 'application_received', 'user_id' => $userId, 'message' => 'Your adoption application has been received.']);
                    Mailer::applicationReceived($data['email'] ?? '', $data['first_name'] ?? '', $data['dog_name'] ?? 'your chosen dog');
                }
            } catch (\Throwable $e) { $this->respond($mq, 'response.application.submit', $replyTo, ['success' => false, 'error' => 'Could not submit application'], $corrId); }
        }, $msg);
    }

    public function handleApplicationStatus(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleApplicationStatus\n";
            try {
                $mq->publish('bridge.application.status', ['application_id' => $data['application_id'] ?? null, 'user_id' => $data['user_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.application.status', $corrId);
                if (!empty($result['application']['full_name'])) $result['application']['full_name'] = $this->dec($result['application']['full_name']);
                $this->respond($mq, 'response.application.status', $replyTo, $result ?? ['success' => false, 'error' => 'Could not fetch status'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.application.status', $replyTo, ['success' => false, 'error' => 'Could not fetch status'], $corrId); }
        }, $msg);
    }

    public function handleApplicationList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleApplicationList\n";
            try {
                $mq->publish('bridge.application.list', ['status' => $data['status'] ?? null, 'shelter_id' => $data['shelter_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.application.list', $corrId);
                if (!empty($result['applications'])) {
                    foreach ($result['applications'] as &$app) {
                        $app['full_name']  = $this->dec($app['full_name']  ?? '');
                        $app['phone']      = $this->dec($app['phone']      ?? '');
                        $app['first_name'] = $this->dec($app['first_name'] ?? '');
                        $app['last_name']  = $this->dec($app['last_name']  ?? '');
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
            echo "[FrontendWorker] handleApplicationApprove\n";
            try {
                if (empty($data['application_id'])) {
                    $this->respond($mq, 'response.application.decision', $replyTo, ['success' => false, 'error' => 'application_id is required'], $corrId);
                    return;
                }
                $mq->publish('bridge.application.approve', ['application_id' => $data['application_id'], 'reviewed_by' => $data['reviewed_by'] ?? null, 'reviewer_notes' => $data['reviewer_notes'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.application.approve', $corrId);
                $this->respond($mq, 'response.application.decision', $replyTo, $result ?? ['success' => false, 'error' => 'Could not approve'], $corrId);
                if (!empty($result['success']) && !empty($result['user_id'])) {
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
            echo "[FrontendWorker] handleApplicationReject\n";
            try {
                if (empty($data['application_id'])) {
                    $this->respond($mq, 'response.application.decision', $replyTo, ['success' => false, 'error' => 'application_id is required'], $corrId);
                    return;
                }
                $mq->publish('bridge.application.reject', ['application_id' => $data['application_id'], 'reviewed_by' => $data['reviewed_by'] ?? null, 'reviewer_notes' => $data['reviewer_notes'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.application.reject', $corrId);
                $this->respond($mq, 'response.application.decision', $replyTo, $result ?? ['success' => false, 'error' => 'Could not reject'], $corrId);
                if (!empty($result['success']) && !empty($result['user_id'])) {
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
            echo "[FrontendWorker] handleAdoptionsList\n";
            try {
                $mq->publish('bridge.adoptions.list', ['user_id' => $data['user_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.adoptions.list', $corrId);
                $this->respond($mq, 'response.adoptions.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load adoptions'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.adoptions.list', $replyTo, ['success' => false, 'error' => 'Could not load adoptions'], $corrId); }
        }, $msg);
    }

    public function handleAdoptionsGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleAdoptionsGet\n";
            try {
                $mq->publish('bridge.adoptions.get', ['adoption_id' => $data['adoption_id'] ?? null, 'user_id' => $data['user_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.adoptions.get', $corrId);
                $this->respond($mq, 'response.adoptions.get', $replyTo, $result ?? ['success' => false, 'error' => 'Not found'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.adoptions.get', $replyTo, ['success' => false, 'error' => 'Could not load adoption'], $corrId); }
        }, $msg);
    }

    public function handleAdoptionsFinalize(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleAdoptionsFinalize\n";
            try {
                if (empty($data['application_id'])) {
                    $this->respond($mq, 'response.adoptions.finalize', $replyTo, ['success' => false, 'error' => 'application_id is required'], $corrId);
                    return;
                }
                $mq->publish('bridge.adoptions.finalize', ['application_id' => $data['application_id'], 'finalized_by' => $data['finalized_by'] ?? null, 'notes' => $data['notes'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.adoptions.finalize', $corrId);
                $this->respond($mq, 'response.adoptions.finalize', $replyTo, $result ?? ['success' => false, 'error' => 'Could not finalize adoption'], $corrId);
                if (!empty($result['success']) && !empty($result['user_id'])) {
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
            echo "[FrontendWorker] handleQuizQuestions\n";
            try {
                $mq->publish('bridge.quiz.questions', [], $corrId);
                $result = $mq->waitForResponse('bridge.result.quiz.questions', $corrId);
                $this->respond($mq, 'response.quiz.questions', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load quiz'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.quiz.questions', $replyTo, ['success' => false, 'error' => 'Could not load quiz'], $corrId); }
        }, $msg);
    }

    public function handleQuiz(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            $userId = $data['user_id'] ?? null;
            echo "[FrontendWorker] handleQuiz: user_id={$userId}\n";
            try {
                $mq->publish('bridge.quiz.submit', ['user_id' => $userId, 'answers' => $data['answers'] ?? []], $corrId);
                $result = $mq->waitForResponse('bridge.result.quiz.submit', $corrId);
                $this->respond($mq, 'response.quiz.result', $replyTo, $result ?? ['success' => false, 'error' => 'Quiz failed'], $corrId);
                if (!empty($result['success']) && $userId) {
                    $mq->publish('bridge.badges.mine', ['user_id' => $userId, 'auto_award' => 'quiz_complete'], $corrId . '_badge');
                }
            } catch (\Throwable $e) { $this->respond($mq, 'response.quiz.result', $replyTo, ['success' => false, 'error' => 'Quiz failed'], $corrId); }
        }, $msg);
    }

    public function handleQuizResults(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleQuizResults\n";
            try {
                $mq->publish('bridge.quiz.results', ['user_id' => $data['user_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.quiz.results', $corrId);
                $this->respond($mq, 'response.quiz.results', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load results'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.quiz.results', $replyTo, ['success' => false, 'error' => 'Could not load results'], $corrId); }
        }, $msg);
    }

    public function handleAdoptionLogCreate(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleAdoptionLogCreate\n";
            try {
                $mq->publish('bridge.adoption.log.create', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'log_type' => $data['log_type'] ?? 'general', 'title' => $data['title'] ?? '', 'notes' => $data['notes'] ?? '', 'log_date' => $data['log_date'] ?? date('Y-m-d')], $corrId);
                $result = $mq->waitForResponse('bridge.result.adoption.log.create', $corrId);
                $this->respond($mq, 'response.adoption.log.create', $replyTo, $result ?? ['success' => false, 'error' => 'Could not save log'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.adoption.log.create', $replyTo, ['success' => false, 'error' => 'Could not save log'], $corrId); }
        }, $msg);
    }

    public function handleAdoptionLogList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleAdoptionLogList\n";
            try {
                $mq->publish('bridge.adoption.log.list', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'log_type' => $data['log_type'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.adoption.log.list', $corrId);
                $this->respond($mq, 'response.adoption.log.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load logs'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.adoption.log.list', $replyTo, ['success' => false, 'error' => 'Could not load logs'], $corrId); }
        }, $msg);
    }

    public function handleFosterApply(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleFosterApply\n";
            try {
                $mq->publish('bridge.foster.apply', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'sponsorship_amount' => $data['sponsorship_amount'] ?? 0, 'start_date' => $data['start_date'] ?? date('Y-m-d')], $corrId);
                $result = $mq->waitForResponse('bridge.result.foster.apply', $corrId);
                $this->respond($mq, 'response.foster.apply', $replyTo, $result ?? ['success' => false, 'error' => 'Foster failed'], $corrId);
                if (!empty($result['success']) && !empty($data['user_id'])) {
                    $mq->publish('notifications', ['event' => 'foster_active', 'user_id' => $data['user_id'], 'message' => 'Your virtual foster sponsorship is now active!']);
                }
            } catch (\Throwable $e) { $this->respond($mq, 'response.foster.apply', $replyTo, ['success' => false, 'error' => 'Foster failed'], $corrId); }
        }, $msg);
    }

    public function handleFosterList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleFosterList\n";
            try {
                $mq->publish('bridge.foster.list', ['user_id' => $data['user_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.foster.list', $corrId);
                $this->respond($mq, 'response.foster.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load sponsorships'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.foster.list', $replyTo, ['success' => false, 'error' => 'Could not load sponsorships'], $corrId); }
        }, $msg);
    }

    public function handleFosterCancel(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleFosterCancel\n";
            try {
                $mq->publish('bridge.foster.cancel', ['foster_id' => $data['foster_id'] ?? null, 'user_id' => $data['user_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.foster.cancel', $corrId);
                $this->respond($mq, 'response.foster.cancel', $replyTo, $result ?? ['success' => false, 'error' => 'Could not cancel'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.foster.cancel', $replyTo, ['success' => false, 'error' => 'Could not cancel sponsorship'], $corrId); }
        }, $msg);
    }

    public function handleParksList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleParksList\n";
            try {
                $mq->publish('bridge.parks.list', ['shelter_id' => $data['shelter_id'] ?? null, 'lat' => $data['lat'] ?? null, 'lng' => $data['lng'] ?? null, 'radius_km' => $data['radius_km'] ?? 10], $corrId);
                $result = $mq->waitForResponse('bridge.result.parks.list', $corrId);
                $this->respond($mq, 'response.parks.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load parks'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.parks.list', $replyTo, ['success' => false, 'error' => 'Could not load parks'], $corrId); }
        }, $msg);
    }

    public function handleResourcesList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleResourcesList\n";
            try {
                $mq->publish('bridge.resources.list', ['topic' => $data['topic'] ?? null, 'type' => $data['type'] ?? null, 'search' => $data['search'] ?? null, 'limit' => $data['limit'] ?? 20, 'offset' => $data['offset'] ?? 0], $corrId);
                $result = $mq->waitForResponse('bridge.result.resources.list', $corrId);
                $this->respond($mq, 'response.resources.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load resources'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.resources.list', $replyTo, ['success' => false, 'error' => 'Could not load resources'], $corrId); }
        }, $msg);
    }

    public function handleResourcesGet(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleResourcesGet\n";
            try {
                $mq->publish('bridge.resources.get', ['resource_id' => $data['resource_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.resources.get', $corrId);
                $this->respond($mq, 'response.resources.get', $replyTo, $result ?? ['success' => false, 'error' => 'Not found'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.resources.get', $replyTo, ['success' => false, 'error' => 'Could not load resource'], $corrId); }
        }, $msg);
    }

    public function handleStoriesList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleStoriesList\n";
            try {
                $mq->publish('bridge.stories.list', ['limit' => $data['limit'] ?? 10, 'offset' => $data['offset'] ?? 0], $corrId);
                $result = $mq->waitForResponse('bridge.result.stories.list', $corrId);
                $this->respond($mq, 'response.stories.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load stories'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.stories.list', $replyTo, ['success' => false, 'error' => 'Could not load stories'], $corrId); }
        }, $msg);
    }

    public function handleStoriesSubmit(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleStoriesSubmit\n";
            try {
                $mq->publish('bridge.stories.submit', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'title' => $data['title'] ?? '', 'story' => $data['story'] ?? '', 'photo_url' => $data['photo_url'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.stories.submit', $corrId);
                $this->respond($mq, 'response.stories.submit', $replyTo, $result ?? ['success' => false, 'error' => 'Could not submit story'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.stories.submit', $replyTo, ['success' => false, 'error' => 'Could not submit story'], $corrId); }
        }, $msg);
    }

    public function handleStoriesApprove(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleStoriesApprove\n";
            try {
                if (empty($data['story_id'])) {
                    $this->respond($mq, 'response.stories.approve', $replyTo, ['success' => false, 'error' => 'story_id is required'], $corrId);
                    return;
                }
                $mq->publish('bridge.stories.approve', ['story_id' => $data['story_id'], 'approved_by' => $data['approved_by'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.stories.approve', $corrId);
                $this->respond($mq, 'response.stories.approve', $replyTo, $result ?? ['success' => false, 'error' => 'Could not approve story'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.stories.approve', $replyTo, ['success' => false, 'error' => 'Could not approve story'], $corrId); }
        }, $msg);
    }

    public function handleBadgesList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleBadgesList\n";
            try {
                $mq->publish('bridge.badges.list', [], $corrId);
                $result = $mq->waitForResponse('bridge.result.badges.list', $corrId);
                $this->respond($mq, 'response.badges.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load badges'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.badges.list', $replyTo, ['success' => false, 'error' => 'Could not load badges'], $corrId); }
        }, $msg);
    }

    public function handleBadgesMine(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleBadgesMine\n";
            try {
                $mq->publish('bridge.badges.mine', ['user_id' => $data['user_id'] ?? null, 'auto_award' => null], $corrId);
                $result = $mq->waitForResponse('bridge.result.badges.mine', $corrId);
                $this->respond($mq, 'response.badges.mine', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load badges'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.badges.mine', $replyTo, ['success' => false, 'error' => 'Could not load badges'], $corrId); }
        }, $msg);
    }

    public function handleEnquiry(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleEnquiry\n";
            try {
                $mq->publish('bridge.enquiry.send', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'shelter_id' => $data['shelter_id'] ?? null, 'message' => $data['message'] ?? ''], $corrId);
                $result = $mq->waitForResponse('bridge.result.enquiry.send', $corrId);
                $this->respond($mq, 'response.enquiry.reply', $replyTo, $result ?? ['success' => false, 'error' => 'Could not send message'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.enquiry.reply', $replyTo, ['success' => false, 'error' => 'Could not send message'], $corrId); }
        }, $msg);
    }

    public function handleChatStart(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleChatStart\n";
            try {
                $mq->publish('bridge.chat.start', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'shelter_id' => $data['shelter_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.chat.start', $corrId);
                $this->respond($mq, 'response.chat.start', $replyTo, $result ?? ['success' => false, 'error' => 'Could not start chat'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.chat.start', $replyTo, ['success' => false, 'error' => 'Could not start chat'], $corrId); }
        }, $msg);
    }

    public function handleChatMessage(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleChatMessage\n";
            try {
                $mq->publish('bridge.chat.message', ['session_id' => $data['session_id'] ?? null, 'sender_id' => $data['sender_id'] ?? null, 'message' => $data['message'] ?? ''], $corrId);
                $result = $mq->waitForResponse('bridge.result.chat.message', $corrId);
                $this->respond($mq, 'response.chat.message', $replyTo, $result ?? ['success' => false, 'error' => 'Could not send message'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.chat.message', $replyTo, ['success' => false, 'error' => 'Could not send message'], $corrId); }
        }, $msg);
    }

    public function handleChatHistory(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleChatHistory\n";
            try {
                $mq->publish('bridge.chat.history', ['session_id' => $data['session_id'] ?? null, 'user_id' => $data['user_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.chat.history', $corrId);
                $this->respond($mq, 'response.chat.history', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load chat'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.chat.history', $replyTo, ['success' => false, 'error' => 'Could not load chat'], $corrId); }
        }, $msg);
    }

    public function handleMeetGreetSchedule(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleMeetGreetSchedule\n";
            try {
                $mq->publish('bridge.meetgreet.schedule', ['user_id' => $data['user_id'] ?? null, 'dog_id' => $data['dog_id'] ?? null, 'shelter_id' => $data['shelter_id'] ?? null, 'scheduled_date' => $data['scheduled_date'] ?? '', 'scheduled_time' => $data['scheduled_time'] ?? '', 'video_link' => $data['video_link'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.meetgreet.schedule', $corrId);
                $this->respond($mq, 'response.meetgreet.schedule', $replyTo, $result ?? ['success' => false, 'error' => 'Could not schedule meeting'], $corrId);
                if (!empty($result['success']) && !empty($data['user_id'])) {
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
            echo "[FrontendWorker] handleMeetGreetList\n";
            try {
                $mq->publish('bridge.meetgreet.list', ['user_id' => $data['user_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.meetgreet.list', $corrId);
                $this->respond($mq, 'response.meetgreet.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load meetings'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.meetgreet.list', $replyTo, ['success' => false, 'error' => 'Could not load meetings'], $corrId); }
        }, $msg);
    }

    public function handleMeetGreetCancel(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleMeetGreetCancel\n";
            try {
                $mq->publish('bridge.meetgreet.cancel', ['session_id' => $data['session_id'] ?? null, 'user_id' => $data['user_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.meetgreet.cancel', $corrId);
                $this->respond($mq, 'response.meetgreet.cancel', $replyTo, $result ?? ['success' => false, 'error' => 'Could not cancel meeting'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.meetgreet.cancel', $replyTo, ['success' => false, 'error' => 'Could not cancel meeting'], $corrId); }
        }, $msg);
    }

    public function handleNotificationsList(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleNotificationsList\n";
            try {
                $mq->publish('bridge.notifications.list', ['user_id' => $data['user_id'] ?? null, 'unread' => $data['unread'] ?? false], $corrId);
                $result = $mq->waitForResponse('bridge.result.notifications.list', $corrId);
                $this->respond($mq, 'response.notifications.list', $replyTo, $result ?? ['success' => false, 'error' => 'Could not load notifications'], $corrId);
            } catch (\Throwable $e) { $this->respond($mq, 'response.notifications.list', $replyTo, ['success' => false, 'error' => 'Could not load notifications'], $corrId); }
        }, $msg);
    }

    public function handleNotificationsRead(array $data, $msg, ?string $corrId): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (RabbitMqClient $mq) use ($data, $corrId, $replyTo) {
            echo "[FrontendWorker] handleNotificationsRead\n";
            try {
                $mq->publish('bridge.notifications.read', ['user_id' => $data['user_id'] ?? null, 'notification_id' => $data['notification_id'] ?? null], $corrId);
                $result = $mq->waitForResponse('bridge.result.notifications.read', $corrId);
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
        return !empty($value) ? $this->enc->encrypt($value) : '';
    }
}