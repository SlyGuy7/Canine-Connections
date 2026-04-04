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

    private function fork(callable $fn, $msg): void
    {
        $pid = pcntl_fork();
        if ($pid === -1) {
            echo "[FrontendWorker][ERROR] Fork failed\n";
            $msg->ack();
            return;
        }
        if ($pid === 0) {
            try { $fn(); } catch (\Throwable $e) { echo "[FrontendWorker][ERROR] {$e->getMessage()}\n"; }
            exit(0);
        }
        $msg->ack();
        pcntl_waitpid(-1, $status, WNOHANG);
    }

    public function handleRegister(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleRegister: {$data['email']}\n";
            try {
                if (empty($data['email']) || empty($data['password'])) {
                    $this->respond('response.auth.register', ['success' => false, 'error' => 'email and password are required'], $corrId);
                    return;
                }
                $this->mq->publish('bridge.auth.register', [
                    'email'         => $data['email'],
                    'password_hash' => $this->enc->hashPassword($data['password']),
                    'first_name'    => $this->encryptIfPresent($data['first_name'] ?? ''),
                    'last_name'     => $this->encryptIfPresent($data['last_name']  ?? ''),
                    'phone'         => $this->encryptIfPresent($data['phone']      ?? ''),
                    'address'       => $this->encryptIfPresent($data['address']    ?? ''),
                    'role'          => 'adopter',
                ], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.auth.register', $corrId);
                if (!$result || empty($result['success'])) {
                    $this->respond('response.auth.register', ['success' => false, 'error' => $result['message'] ?? $result['error'] ?? 'Registration failed'], $corrId);
                    return;
                }
                $this->respond('response.auth.register', [
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
                $this->fail('response.auth.register', 'Registration failed', $corrId);
            }
        }, $msg);
    }

    public function handleLogin(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleLogin: {$data['email']}\n";
            try {
                if (empty($data['email']) || empty($data['password'])) {
                    $this->fail('response.auth.login', 'email and password are required', $corrId);
                    return;
                }
                $this->mq->publish('bridge.auth.login', ['email' => $data['email']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.auth.login', $corrId);
                if (!$result || ($result['success'] ?? false) !== true || !isset($result['user'])) {
                    $this->respond('response.auth.login', ['success' => false, 'error' => 'User not found'], $corrId);
                    return;
                }
                $user = $result['user'];
                if (!password_verify($data['password'], $user['password_hash'])) {
                    $this->respond('response.auth.login', ['success' => false, 'error' => 'Invalid password'], $corrId);
                    return;
                }
                unset($user['password_hash']);
                $user['first_name'] = $user['first_name'] ? $this->dec($user['first_name']) : '';
                $user['last_name']  = $user['last_name']  ? $this->dec($user['last_name'])  : '';
                $this->respond('response.auth.login', ['success' => true, 'user' => $user], $corrId);
            } catch (\Throwable $e) {
                echo "[FrontendWorker][ERROR] handleLogin: {$e->getMessage()}\n";
                $this->fail('response.auth.login', 'Login failed', $corrId);
            }
        }, $msg);
    }

    public function handleResetPassword(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleResetPassword: {$data['email']}\n";
            try {
                if (empty($data['email']) || empty($data['oldPassword']) || empty($data['newPassword'])) {
                    $this->fail('response.auth.resetPassword', 'All fields are required', $corrId);
                    return;
                }
                $this->mq->publish('bridge.auth.login', ['email' => $data['email']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.auth.login', $corrId);
                if (!$result || empty($result['user'])) {
                    $this->fail('response.auth.resetPassword', 'User not found', $corrId);
                    return;
                }
                $user = $result['user'];
                if (!password_verify($data['oldPassword'], $user['password_hash'])) {
                    $this->fail('response.auth.resetPassword', 'Old password is incorrect', $corrId);
                    return;
                }
                $this->mq->publish('bridge.auth.resetPassword', [
                    'email'         => $data['email'],
                    'password_hash' => $this->enc->hashPassword($data['newPassword']),
                ], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.auth.resetPassword', $corrId);
                if (!$result || empty($result['success'])) {
                    $this->fail('response.auth.resetPassword', $result['error'] ?? 'Reset failed', $corrId);
                    return;
                }
                $this->respond('response.auth.resetPassword', ['success' => true, 'message' => 'Password updated successfully'], $corrId);
                Mailer::passwordReset($data['email'], $user['first_name'] ?? '');
            } catch (\Throwable $e) {
                echo "[FrontendWorker][ERROR] handleResetPassword: {$e->getMessage()}\n";
                $this->fail('response.auth.resetPassword', 'Reset failed', $corrId);
            }
        }, $msg);
    }

    public function handleSheltersList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleSheltersList\n";
            try {
                $this->mq->publish('bridge.shelters.list', ['search' => $data['search'] ?? null, 'limit' => $data['limit'] ?? 50, 'offset' => $data['offset'] ?? 0], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.shelters.list', $corrId);
                $this->respond('response.shelters.list', $result ?? ['success' => false, 'error' => 'Could not load shelters'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.shelters.list', 'Could not load shelters', $corrId); }
        }, $msg);
    }

    public function handleSheltersGet(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleSheltersGet: shelter_id={$data['shelter_id']}\n";
            try {
                $this->mq->publish('bridge.shelters.get', ['shelter_id' => $data['shelter_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.shelters.get', $corrId);
                $this->respond('response.shelters.get', $result ?? ['success' => false, 'error' => 'Shelter not found'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.shelters.get', 'Could not load shelter', $corrId); }
        }, $msg);
    }

    public function handleApiKeyGet(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleApiKeyGet: shelter_id={$data['shelter_id']}\n";
            try {
                $this->mq->publish('bridge.api.key.get', ['shelter_id' => $data['shelter_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.api.key.get', $corrId);
                $this->respond('response.api.key.get', $result ?? ['success' => false, 'error' => 'Could not load API key'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.api.key.get', 'Could not load API key', $corrId); }
        }, $msg);
    }

    public function handleApiKeyRegenerate(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleApiKeyRegenerate: shelter_id={$data['shelter_id']}\n";
            try {
                $newKey = bin2hex(random_bytes(32));
                $this->mq->publish('bridge.api.key.regenerate', ['shelter_id' => $data['shelter_id'], 'new_key' => $newKey], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.api.key.regenerate', $corrId);
                if (!empty($result['success'])) $result['api_key'] = $newKey;
                $this->respond('response.api.key.regenerate', $result ?? ['success' => false, 'error' => 'Could not regenerate key'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.api.key.regenerate', 'Could not regenerate key', $corrId); }
        }, $msg);
    }

    public function handleApiLogs(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleApiLogs: shelter_id={$data['shelter_id']}\n";
            try {
                $this->mq->publish('bridge.api.logs', ['shelter_id' => $data['shelter_id'], 'limit' => $data['limit'] ?? 50, 'offset' => $data['offset'] ?? 0], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.api.logs', $corrId);
                $this->respond('response.api.logs', $result ?? ['success' => false, 'error' => 'Could not load logs'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.api.logs', 'Could not load logs', $corrId); }
        }, $msg);
    }

    public function handleDogsList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleDogsList\n";
            try {
                $this->mq->publish('bridge.dogs.list', [
                    'status'       => $data['status']       ?? 'available',
                    'breed'        => $data['breed']        ?? null,
                    'size'         => $data['size']         ?? null,
                    'energy_level' => $data['energy_level'] ?? null,
                    'shelter_id'   => $data['shelter_id']   ?? null,
                    'limit'        => $data['limit']        ?? 20,
                    'offset'       => $data['offset']       ?? 0,
                ], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.dogs.list', $corrId);
                $this->respond('response.dogs.list', $result ?? ['success' => false, 'error' => 'Could not load dogs'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.dogs.list', 'Could not load dogs', $corrId); }
        }, $msg);
    }

    public function handleDogsGet(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleDogsGet: dog_id={$data['dog_id']}\n";
            try {
                $this->mq->publish('bridge.dogs.get', ['dog_id' => $data['dog_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.dogs.get', $corrId);
                $this->respond('response.dogs.get', $result ?? ['success' => false, 'error' => 'Dog not found'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.dogs.get', 'Could not load dog', $corrId); }
        }, $msg);
    }

    public function handleApplicationSubmit(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleApplicationSubmit: user_id={$data['user_id']}\n";
            try {
                $this->mq->publish('bridge.application.submit', [
                    'user_id'                => $data['user_id'],
                    'dog_id'                 => $data['dog_id'],
                    'full_name'              => $this->enc($data['full_name'] ?? ''),
                    'address'                => $this->enc($data['address']   ?? ''),
                    'phone'                  => $this->enc($data['phone']     ?? ''),
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
                $result = $this->mq->waitForResponse('bridge.result.application.submit', $corrId);
                $this->respond('response.application.submit', $result ?? ['success' => false, 'error' => 'Could not submit application'], $corrId);
                if (!empty($result['success'])) {
                    $this->notify($data['user_id'], 'application_received', 'Your adoption application has been received and is pending review.');
                    Mailer::applicationReceived($data['email'] ?? '', $data['first_name'] ?? '', $data['dog_name'] ?? 'your chosen dog');
                }
            } catch (\Throwable $e) { $this->fail('response.application.submit', 'Could not submit application', $corrId); }
        }, $msg);
    }

    public function handleApplicationStatus(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleApplicationStatus\n";
            try {
                $this->mq->publish('bridge.application.status', ['application_id' => $data['application_id'], 'user_id' => $data['user_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.application.status', $corrId);
                if (!empty($result['application']['full_name'])) {
                    $result['application']['full_name'] = $this->dec($result['application']['full_name']);
                }
                $this->respond('response.application.status', $result ?? ['success' => false, 'error' => 'Could not fetch status'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.application.status', 'Could not fetch status', $corrId); }
        }, $msg);
    }

    public function handleApplicationList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleApplicationList\n";
            try {
                $this->mq->publish('bridge.application.list', ['status' => $data['status'] ?? null, 'shelter_id' => $data['shelter_id'] ?? null], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.application.list', $corrId);
                if (!empty($result['applications'])) {
                    foreach ($result['applications'] as &$app) {
                        $app['full_name']  = $this->dec($app['full_name']  ?? '');
                        $app['phone']      = $this->dec($app['phone']      ?? '');
                        $app['first_name'] = $this->dec($app['first_name'] ?? '');
                        $app['last_name']  = $this->dec($app['last_name']  ?? '');
                    }
                }
                $this->respond('response.application.list', $result ?? ['success' => false, 'error' => 'Could not fetch applications'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.application.list', 'Could not fetch applications', $corrId); }
        }, $msg);
    }

    public function handleApplicationApprove(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleApplicationApprove\n";
            try {
                $this->mq->publish('bridge.application.approve', ['application_id' => $data['application_id'], 'reviewed_by' => $data['reviewed_by'] ?? null, 'reviewer_notes' => $data['reviewer_notes'] ?? null], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.application.approve', $corrId);
                $this->respond('response.application.decision', $result ?? ['success' => false, 'error' => 'Could not approve'], $corrId);
                if (!empty($result['success']) && !empty($result['user_id'])) {
                    $this->notify($result['user_id'], 'application_approved', 'Congratulations! Your adoption application has been approved.');
                    Mailer::applicationApproved($result['email'] ?? '', $result['first_name'] ?? '', $result['dog_name'] ?? 'your chosen dog');
                }
            } catch (\Throwable $e) { $this->fail('response.application.decision', 'Could not approve', $corrId); }
        }, $msg);
    }

    public function handleApplicationReject(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleApplicationReject\n";
            try {
                $this->mq->publish('bridge.application.reject', ['application_id' => $data['application_id'], 'reviewed_by' => $data['reviewed_by'] ?? null, 'reviewer_notes' => $data['reviewer_notes'] ?? null], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.application.reject', $corrId);
                $this->respond('response.application.decision', $result ?? ['success' => false, 'error' => 'Could not reject'], $corrId);
                if (!empty($result['success']) && !empty($result['user_id'])) {
                    $this->notify($result['user_id'], 'application_rejected', 'Your adoption application was not successful this time.');
                    Mailer::applicationRejected($result['email'] ?? '', $result['first_name'] ?? '', $result['dog_name'] ?? 'your chosen dog');
                }
            } catch (\Throwable $e) { $this->fail('response.application.decision', 'Could not reject', $corrId); }
        }, $msg);
    }

    public function handleAdoptionsList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleAdoptionsList: user_id={$data['user_id']}\n";
            try {
                $this->mq->publish('bridge.adoptions.list', ['user_id' => $data['user_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.adoptions.list', $corrId);
                $this->respond('response.adoptions.list', $result ?? ['success' => false, 'error' => 'Could not load adoptions'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.adoptions.list', 'Could not load adoptions', $corrId); }
        }, $msg);
    }

    public function handleAdoptionsGet(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleAdoptionsGet: adoption_id={$data['adoption_id']}\n";
            try {
                $this->mq->publish('bridge.adoptions.get', ['adoption_id' => $data['adoption_id'], 'user_id' => $data['user_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.adoptions.get', $corrId);
                $this->respond('response.adoptions.get', $result ?? ['success' => false, 'error' => 'Not found'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.adoptions.get', 'Could not load adoption', $corrId); }
        }, $msg);
    }

    public function handleAdoptionsFinalize(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleAdoptionsFinalize: application_id={$data['application_id']}\n";
            try {
                $this->mq->publish('bridge.adoptions.finalize', ['application_id' => $data['application_id'], 'finalized_by' => $data['finalized_by'] ?? null, 'notes' => $data['notes'] ?? null], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.adoptions.finalize', $corrId);
                $this->respond('response.adoptions.finalize', $result ?? ['success' => false, 'error' => 'Could not finalize adoption'], $corrId);
                if (!empty($result['success']) && !empty($result['user_id'])) {
                    $this->notify($result['user_id'], 'adoption_finalized', 'Your adoption is now complete! Welcome to the family.');
                    Mailer::adoptionComplete($result['email'] ?? '', $result['first_name'] ?? '', $result['dog_name'] ?? 'your dog');
                    $this->mq->publish('bridge.badges.mine', ['user_id' => $result['user_id'], 'auto_award' => 'adoption_complete'], $corrId . '_badge');
                }
            } catch (\Throwable $e) { $this->fail('response.adoptions.finalize', 'Could not finalize adoption', $corrId); }
        }, $msg);
    }

    public function handleQuizQuestions(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleQuizQuestions\n";
            try {
                $this->mq->publish('bridge.quiz.questions', [], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.quiz.questions', $corrId);
                $this->respond('response.quiz.questions', $result ?? ['success' => false, 'error' => 'Could not load quiz'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.quiz.questions', 'Could not load quiz', $corrId); }
        }, $msg);
    }

    public function handleQuiz(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleQuiz: user_id={$data['user_id']}\n";
            try {
                $this->mq->publish('bridge.quiz.submit', ['user_id' => $data['user_id'], 'answers' => $data['answers'] ?? []], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.quiz.submit', $corrId);
                $this->respond('response.quiz.result', $result ?? ['success' => false, 'error' => 'Quiz failed'], $corrId);
                if (!empty($result['success'])) {
                    $this->mq->publish('bridge.badges.mine', ['user_id' => $data['user_id'], 'auto_award' => 'quiz_complete'], $corrId . '_badge');
                }
            } catch (\Throwable $e) { $this->fail('response.quiz.result', 'Quiz failed', $corrId); }
        }, $msg);
    }

    public function handleQuizResults(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleQuizResults: user_id={$data['user_id']}\n";
            try {
                $this->mq->publish('bridge.quiz.results', ['user_id' => $data['user_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.quiz.results', $corrId);
                $this->respond('response.quiz.results', $result ?? ['success' => false, 'error' => 'Could not load results'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.quiz.results', 'Could not load results', $corrId); }
        }, $msg);
    }

    public function handleAdoptionLogCreate(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleAdoptionLogCreate\n";
            try {
                $this->mq->publish('bridge.adoption.log.create', ['user_id' => $data['user_id'], 'dog_id' => $data['dog_id'], 'log_type' => $data['log_type'] ?? 'general', 'title' => $data['title'] ?? '', 'notes' => $data['notes'] ?? '', 'log_date' => $data['log_date'] ?? date('Y-m-d')], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.adoption.log.create', $corrId);
                $this->respond('response.adoption.log.create', $result ?? ['success' => false, 'error' => 'Could not save log'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.adoption.log.create', 'Could not save log', $corrId); }
        }, $msg);
    }

    public function handleAdoptionLogList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleAdoptionLogList\n";
            try {
                $this->mq->publish('bridge.adoption.log.list', ['user_id' => $data['user_id'], 'dog_id' => $data['dog_id'], 'log_type' => $data['log_type'] ?? null], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.adoption.log.list', $corrId);
                $this->respond('response.adoption.log.list', $result ?? ['success' => false, 'error' => 'Could not load logs'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.adoption.log.list', 'Could not load logs', $corrId); }
        }, $msg);
    }

    public function handleFosterApply(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleFosterApply\n";
            try {
                $this->mq->publish('bridge.foster.apply', ['user_id' => $data['user_id'], 'dog_id' => $data['dog_id'], 'sponsorship_amount' => $data['sponsorship_amount'] ?? 0, 'start_date' => $data['start_date'] ?? date('Y-m-d')], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.foster.apply', $corrId);
                $this->respond('response.foster.apply', $result ?? ['success' => false, 'error' => 'Foster failed'], $corrId);
                if (!empty($result['success'])) {
                    $this->notify($data['user_id'], 'foster_active', 'Your virtual foster sponsorship is now active!');
                }
            } catch (\Throwable $e) { $this->fail('response.foster.apply', 'Foster failed', $corrId); }
        }, $msg);
    }

    public function handleFosterList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleFosterList\n";
            try {
                $this->mq->publish('bridge.foster.list', ['user_id' => $data['user_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.foster.list', $corrId);
                $this->respond('response.foster.list', $result ?? ['success' => false, 'error' => 'Could not load sponsorships'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.foster.list', 'Could not load sponsorships', $corrId); }
        }, $msg);
    }

    public function handleFosterCancel(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleFosterCancel\n";
            try {
                $this->mq->publish('bridge.foster.cancel', ['foster_id' => $data['foster_id'], 'user_id' => $data['user_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.foster.cancel', $corrId);
                $this->respond('response.foster.cancel', $result ?? ['success' => false, 'error' => 'Could not cancel'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.foster.cancel', 'Could not cancel sponsorship', $corrId); }
        }, $msg);
    }

    public function handleParksList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleParksList\n";
            try {
                $this->mq->publish('bridge.parks.list', ['shelter_id' => $data['shelter_id'] ?? null, 'lat' => $data['lat'] ?? null, 'lng' => $data['lng'] ?? null, 'radius_km' => $data['radius_km'] ?? 10], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.parks.list', $corrId);
                $this->respond('response.parks.list', $result ?? ['success' => false, 'error' => 'Could not load parks'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.parks.list', 'Could not load parks', $corrId); }
        }, $msg);
    }

    public function handleResourcesList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleResourcesList\n";
            try {
                $this->mq->publish('bridge.resources.list', ['topic' => $data['topic'] ?? null, 'type' => $data['type'] ?? null, 'search' => $data['search'] ?? null, 'limit' => $data['limit'] ?? 20, 'offset' => $data['offset'] ?? 0], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.resources.list', $corrId);
                $this->respond('response.resources.list', $result ?? ['success' => false, 'error' => 'Could not load resources'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.resources.list', 'Could not load resources', $corrId); }
        }, $msg);
    }

    public function handleResourcesGet(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleResourcesGet\n";
            try {
                $this->mq->publish('bridge.resources.get', ['resource_id' => $data['resource_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.resources.get', $corrId);
                $this->respond('response.resources.get', $result ?? ['success' => false, 'error' => 'Not found'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.resources.get', 'Could not load resource', $corrId); }
        }, $msg);
    }

    public function handleStoriesList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleStoriesList\n";
            try {
                $this->mq->publish('bridge.stories.list', ['limit' => $data['limit'] ?? 10, 'offset' => $data['offset'] ?? 0], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.stories.list', $corrId);
                $this->respond('response.stories.list', $result ?? ['success' => false, 'error' => 'Could not load stories'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.stories.list', 'Could not load stories', $corrId); }
        }, $msg);
    }

    public function handleStoriesSubmit(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleStoriesSubmit\n";
            try {
                $this->mq->publish('bridge.stories.submit', ['user_id' => $data['user_id'], 'dog_id' => $data['dog_id'] ?? null, 'title' => $data['title'] ?? '', 'story' => $data['story'] ?? '', 'photo_url' => $data['photo_url'] ?? null], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.stories.submit', $corrId);
                $this->respond('response.stories.submit', $result ?? ['success' => false, 'error' => 'Could not submit story'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.stories.submit', 'Could not submit story', $corrId); }
        }, $msg);
    }

    public function handleStoriesApprove(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleStoriesApprove\n";
            try {
                $this->mq->publish('bridge.stories.approve', ['story_id' => $data['story_id'], 'approved_by' => $data['approved_by'] ?? null], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.stories.approve', $corrId);
                $this->respond('response.stories.approve', $result ?? ['success' => false, 'error' => 'Could not approve story'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.stories.approve', 'Could not approve story', $corrId); }
        }, $msg);
    }

    public function handleBadgesList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleBadgesList\n";
            try {
                $this->mq->publish('bridge.badges.list', [], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.badges.list', $corrId);
                $this->respond('response.badges.list', $result ?? ['success' => false, 'error' => 'Could not load badges'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.badges.list', 'Could not load badges', $corrId); }
        }, $msg);
    }

    public function handleBadgesMine(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleBadgesMine\n";
            try {
                $this->mq->publish('bridge.badges.mine', ['user_id' => $data['user_id'], 'auto_award' => null], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.badges.mine', $corrId);
                $this->respond('response.badges.mine', $result ?? ['success' => false, 'error' => 'Could not load badges'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.badges.mine', 'Could not load badges', $corrId); }
        }, $msg);
    }

    public function handleEnquiry(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleEnquiry\n";
            try {
                $this->mq->publish('bridge.enquiry.send', ['user_id' => $data['user_id'], 'dog_id' => $data['dog_id'], 'shelter_id' => $data['shelter_id'], 'message' => $data['message'] ?? ''], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.enquiry.send', $corrId);
                $this->respond('response.enquiry.reply', $result ?? ['success' => false, 'error' => 'Could not send message'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.enquiry.reply', 'Could not send message', $corrId); }
        }, $msg);
    }

    public function handleChatStart(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleChatStart\n";
            try {
                $this->mq->publish('bridge.chat.start', ['user_id' => $data['user_id'], 'dog_id' => $data['dog_id'], 'shelter_id' => $data['shelter_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.chat.start', $corrId);
                $this->respond('response.chat.start', $result ?? ['success' => false, 'error' => 'Could not start chat'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.chat.start', 'Could not start chat', $corrId); }
        }, $msg);
    }

    public function handleChatMessage(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleChatMessage\n";
            try {
                $this->mq->publish('bridge.chat.message', ['session_id' => $data['session_id'], 'sender_id' => $data['sender_id'], 'message' => $data['message'] ?? ''], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.chat.message', $corrId);
                $this->respond('response.chat.message', $result ?? ['success' => false, 'error' => 'Could not send message'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.chat.message', 'Could not send message', $corrId); }
        }, $msg);
    }

    public function handleChatHistory(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleChatHistory\n";
            try {
                $this->mq->publish('bridge.chat.history', ['session_id' => $data['session_id'], 'user_id' => $data['user_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.chat.history', $corrId);
                $this->respond('response.chat.history', $result ?? ['success' => false, 'error' => 'Could not load chat'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.chat.history', 'Could not load chat', $corrId); }
        }, $msg);
    }

    public function handleMeetGreetSchedule(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleMeetGreetSchedule\n";
            try {
                $this->mq->publish('bridge.meetgreet.schedule', ['user_id' => $data['user_id'], 'dog_id' => $data['dog_id'], 'shelter_id' => $data['shelter_id'], 'scheduled_date' => $data['scheduled_date'], 'scheduled_time' => $data['scheduled_time'], 'video_link' => $data['video_link'] ?? null], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.meetgreet.schedule', $corrId);
                $this->respond('response.meetgreet.schedule', $result ?? ['success' => false, 'error' => 'Could not schedule meeting'], $corrId);
                if (!empty($result['success'])) {
                    $this->notify($data['user_id'], 'meetgreet_scheduled', "Your meet & greet is confirmed for {$data['scheduled_date']} at {$data['scheduled_time']}.");
                    Mailer::meetGreetConfirmed($data['email'] ?? '', $data['first_name'] ?? '', $data['dog_name'] ?? 'your chosen dog', $data['scheduled_date'], $data['scheduled_time']);
                }
            } catch (\Throwable $e) { $this->fail('response.meetgreet.schedule', 'Could not schedule meeting', $corrId); }
        }, $msg);
    }

    public function handleMeetGreetList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleMeetGreetList\n";
            try {
                $this->mq->publish('bridge.meetgreet.list', ['user_id' => $data['user_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.meetgreet.list', $corrId);
                $this->respond('response.meetgreet.list', $result ?? ['success' => false, 'error' => 'Could not load meetings'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.meetgreet.list', 'Could not load meetings', $corrId); }
        }, $msg);
    }

    public function handleMeetGreetCancel(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleMeetGreetCancel\n";
            try {
                $this->mq->publish('bridge.meetgreet.cancel', ['session_id' => $data['session_id'], 'user_id' => $data['user_id']], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.meetgreet.cancel', $corrId);
                $this->respond('response.meetgreet.cancel', $result ?? ['success' => false, 'error' => 'Could not cancel meeting'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.meetgreet.cancel', 'Could not cancel meeting', $corrId); }
        }, $msg);
    }

    public function handleNotificationsList(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleNotificationsList\n";
            try {
                $this->mq->publish('bridge.notifications.list', ['user_id' => $data['user_id'], 'unread' => $data['unread'] ?? false], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.notifications.list', $corrId);
                $this->respond('response.notifications.list', $result ?? ['success' => false, 'error' => 'Could not load notifications'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.notifications.list', 'Could not load notifications', $corrId); }
        }, $msg);
    }

    public function handleNotificationsRead(array $data, $msg, ?string $corrId): void
    {
        $this->fork(function () use ($data, $corrId) {
            echo "[FrontendWorker] handleNotificationsRead\n";
            try {
                $this->mq->publish('bridge.notifications.read', ['user_id' => $data['user_id'], 'notification_id' => $data['notification_id'] ?? null], $corrId);
                $result = $this->mq->waitForResponse('bridge.result.notifications.read', $corrId);
                $this->respond('response.notifications.read', $result ?? ['success' => false, 'error' => 'Could not mark as read'], $corrId);
            } catch (\Throwable $e) { $this->fail('response.notifications.read', 'Could not mark as read', $corrId); }
        }, $msg);
    }

    private function respond(string $queue, array $payload, ?string $corrId): void
    {
        $this->mq->publish($queue, $payload, $corrId);
    }

    private function fail(string $queue, string $error, ?string $corrId): void
    {
        $this->mq->publish($queue, ['success' => false, 'error' => $error], $corrId);
    }

    private function notify(int $userId, string $event, string $message): void
    {
        $this->mq->publish('notifications', ['event' => $event, 'user_id' => $userId, 'message' => $message]);
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