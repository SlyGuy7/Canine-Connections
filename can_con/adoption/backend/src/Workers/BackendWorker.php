<?php declare(strict_types=1);

namespace App\Workers;

use App\Infrastructure\Messaging\RabbitMqClient;
use App\Security\Encryption;

final class BackendWorker
{
    private Encryption $enc;

    public function __construct(private RabbitMqClient $mq)
    {
        $this->enc = new Encryption();
    }

    public function run(): void
    {
        echo "[Backend] Registering consumers...\n";

        // Auth 
        $this->mq->registerConsumer('request.auth.register',       [$this, 'handleRegister']);
        $this->mq->registerConsumer('request.auth.login',          [$this, 'handleLogin']);

        // Shelters
        $this->mq->registerConsumer('request.shelters.list',       [$this, 'handleSheltersList']);
        $this->mq->registerConsumer('request.shelters.get',        [$this, 'handleSheltersGet']);

        // API Keys 
        $this->mq->registerConsumer('request.api.key.get',         [$this, 'handleApiKeyGet']);
        $this->mq->registerConsumer('request.api.key.regenerate',  [$this, 'handleApiKeyRegenerate']);
        $this->mq->registerConsumer('request.api.logs',            [$this, 'handleApiLogs']);

        // Dogs 
        $this->mq->registerConsumer('request.dogs.list',           [$this, 'handleDogsList']);
        $this->mq->registerConsumer('request.dogs.get',            [$this, 'handleDogsGet']);

        // Applications 
        $this->mq->registerConsumer('request.application.submit',  [$this, 'handleApplicationSubmit']);
        $this->mq->registerConsumer('request.application.status',  [$this, 'handleApplicationStatus']);
        $this->mq->registerConsumer('request.application.list',    [$this, 'handleApplicationList']);
        $this->mq->registerConsumer('request.application.approve', [$this, 'handleApplicationApprove']);
        $this->mq->registerConsumer('request.application.reject',  [$this, 'handleApplicationReject']);

        // Adoptions 
        $this->mq->registerConsumer('request.adoptions.list',      [$this, 'handleAdoptionsList']);
        $this->mq->registerConsumer('request.adoptions.get',       [$this, 'handleAdoptionsGet']);
        $this->mq->registerConsumer('request.adoptions.finalize',  [$this, 'handleAdoptionsFinalize']);

        // Quiz 
        $this->mq->registerConsumer('request.quiz.questions',      [$this, 'handleQuizQuestions']);
        $this->mq->registerConsumer('request.quiz.submit',         [$this, 'handleQuiz']);
        $this->mq->registerConsumer('request.quiz.results',        [$this, 'handleQuizResults']);

        // Post Adoption Logs
        $this->mq->registerConsumer('request.adoption.log.create', [$this, 'handleAdoptionLogCreate']);
        $this->mq->registerConsumer('request.adoption.log.list',   [$this, 'handleAdoptionLogList']);

        // Virtual Foster 
        $this->mq->registerConsumer('request.foster.apply',        [$this, 'handleFosterApply']);
        $this->mq->registerConsumer('request.foster.list',         [$this, 'handleFosterList']);
        $this->mq->registerConsumer('request.foster.cancel',       [$this, 'handleFosterCancel']);

        // Pet Parks 
        $this->mq->registerConsumer('request.parks.list',          [$this, 'handleParksList']);

        // Resources 
        $this->mq->registerConsumer('request.resources.list',      [$this, 'handleResourcesList']);
        $this->mq->registerConsumer('request.resources.get',       [$this, 'handleResourcesGet']);

        // Success Stories 
        $this->mq->registerConsumer('request.stories.list',        [$this, 'handleStoriesList']);
        $this->mq->registerConsumer('request.stories.submit',      [$this, 'handleStoriesSubmit']);
        $this->mq->registerConsumer('request.stories.approve',     [$this, 'handleStoriesApprove']);

        // Badges 
        $this->mq->registerConsumer('request.badges.list',         [$this, 'handleBadgesList']);
        $this->mq->registerConsumer('request.badges.mine',         [$this, 'handleBadgesMine']);

        // Chat 
        $this->mq->registerConsumer('request.enquiry.send',        [$this, 'handleEnquiry']);
        $this->mq->registerConsumer('request.chat.start',          [$this, 'handleChatStart']);
        $this->mq->registerConsumer('request.chat.message',        [$this, 'handleChatMessage']);
        $this->mq->registerConsumer('request.chat.history',        [$this, 'handleChatHistory']);

        // Meet & Greet 
        $this->mq->registerConsumer('request.meetgreet.schedule',  [$this, 'handleMeetGreetSchedule']);
        $this->mq->registerConsumer('request.meetgreet.list',      [$this, 'handleMeetGreetList']);
        $this->mq->registerConsumer('request.meetgreet.cancel',    [$this, 'handleMeetGreetCancel']);

        // Notifications 
        $this->mq->registerConsumer('request.notifications.list',  [$this, 'handleNotificationsList']);
        $this->mq->registerConsumer('request.notifications.read',  [$this, 'handleNotificationsRead']);

        echo "[Backend] All consumers registered — listening\n";

        $this->mq->wait();
    }

    // AUTH
    
    public function handleRegister(array $data, $msg, ?string $corrId): void
{
    echo "[Backend] handleRegister: {$data['email']}\n";

    try {
        if (empty($data['email']) || empty($data['password'])) {
            $this->fail('response.auth.register', 'email and password are required', $corrId);
            $msg->ack();
            return;
        }

        if (!$corrId) {
            $corrId = uniqid('register_', true);
        }

        $this->mq->publish('db.auth.register', [
            'email' => $data['email'],
            'password' => $data['password'],
            'first_name' => $this->enc($data['first_name'] ?? ''),
            'last_name' => $this->enc($data['last_name'] ?? ''),
            'phone' => $this->enc($data['phone'] ?? ''),
            'address' => $this->enc($data['address'] ?? ''),
            'role' => 'adopter',
        ], $corrId);

        $result = $this->mq->waitForResponse('db.result.auth.register', $corrId);

        if (!$result || !($result['success'] ?? false)) {
            $this->fail(
                'response.auth.register',
                $result['error'] ?? 'Registration failed',
                $corrId
            );
            $msg->ack();
            return;
        }

        $this->respond('response.auth.register', [
            'success' => true,
            'user_id' => $result['user_id'] ?? null,
            'email' => $data['email'],
            'first_name' => $data['first_name'] ?? '',
            'last_name' => $data['last_name'] ?? '',
            'role' => 'adopter',
        ], $corrId);

        $msg->ack();
    } catch (\Throwable $e) {
        echo "[Backend][ERROR] handleRegister: {$e->getMessage()}\n";
        $this->fail('response.auth.register', 'Registration failed', $corrId);
        $msg->nack(false, true);
    }
}


        public function handleLogin(array $data, $msg, ?string $corrId): void
{
    echo "[Backend] handleLogin: {$data['email']}\n";

    try {
        if (empty($data['email']) || empty($data['password'])) {
            $this->fail('response.auth.login', 'email and password are required', $corrId);
            $msg->ack();
            return;
        }

        if (!$corrId) {
            $corrId = uniqid('login_', true);
        }

        $this->mq->publish('db.auth.login', [
            'email' => $data['email'],
            'password' => $data['password'],
        ], $corrId);

        $result = $this->mq->waitForResponse('db.result.auth.login', $corrId);

        if (!$result || empty($result['user'])) {
            $this->fail('response.auth.login', 'Invalid email or password', $corrId);
            $msg->ack();
            return;
        }

        $user = $result['user'];

        if (!$this->enc->verifyPassword($data['password'], $user['password_hash'])) {
            $this->fail('response.auth.login', 'Invalid email or password', $corrId);
            $msg->ack();
            return;
        }

        $this->respond('response.auth.login', [
            'success' => true,
            'token' => bin2hex(random_bytes(32)),
            'user_id' => $user['user_id'],
            'email' => $user['email'],
            'first_name' => $this->dec($user['first_name'] ?? ''),
            'last_name' => $this->dec($user['last_name'] ?? ''),
            'role' => $user['role'],
        ], $corrId);

        $msg->ack();
    } catch (\Throwable $e) {
        echo "[Backend][ERROR] handleLogin: {$e->getMessage()}\n";
        $this->fail('response.auth.login', 'Login failed', $corrId);
        $msg->nack(false, true);
    }
}

    // SHELTERS

    public function handleSheltersList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleSheltersList\n";
        try {
            $this->mq->publish('db.shelters.list', [
                'search' => $data['search'] ?? null,
                'limit'  => $data['limit']  ?? 50,
                'offset' => $data['offset'] ?? 0,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.shelters.list', $corrId);
            $this->respond('response.shelters.list', $result ?? ['success' => false, 'error' => 'Could not load shelters'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.shelters.list', 'Could not load shelters', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleSheltersGet(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleSheltersGet: shelter_id={$data['shelter_id']}\n";
        try {
            $this->mq->publish('db.shelters.get', ['shelter_id' => $data['shelter_id']], $corrId);
            $result = $this->mq->waitForResponse('db.result.shelters.get', $corrId);
            $this->respond('response.shelters.get', $result ?? ['success' => false, 'error' => 'Shelter not found'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.shelters.get', 'Could not load shelter', $corrId);
            $msg->nack(false, true);
        }
    }

    // API KEYS 

    public function handleApiKeyGet(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleApiKeyGet: shelter_id={$data['shelter_id']}\n";
        try {
            $this->mq->publish('db.api.key.get', ['shelter_id' => $data['shelter_id']], $corrId);
            $result = $this->mq->waitForResponse('db.result.api.key.get', $corrId);
            $this->respond('response.api.key.get', $result ?? ['success' => false, 'error' => 'Could not load API key'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.api.key.get', 'Could not load API key', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleApiKeyRegenerate(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleApiKeyRegenerate: shelter_id={$data['shelter_id']}\n";
        try {
            $newKey = bin2hex(random_bytes(32));
            $this->mq->publish('db.api.key.regenerate', [
                'shelter_id' => $data['shelter_id'],
                'new_key'    => $newKey,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.api.key.regenerate', $corrId);
            if (!empty($result['success'])) {
                $result['api_key'] = $newKey;
            }
            $this->respond('response.api.key.regenerate', $result ?? ['success' => false, 'error' => 'Could not regenerate key'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.api.key.regenerate', 'Could not regenerate key', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleApiLogs(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleApiLogs: shelter_id={$data['shelter_id']}\n";
        try {
            $this->mq->publish('db.api.logs', [
                'shelter_id' => $data['shelter_id'],
                'limit'      => $data['limit']  ?? 50,
                'offset'     => $data['offset'] ?? 0,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.api.logs', $corrId);
            $this->respond('response.api.logs', $result ?? ['success' => false, 'error' => 'Could not load logs'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.api.logs', 'Could not load logs', $corrId);
            $msg->nack(false, true);
        }
    }

    // DOGS

    public function handleDogsList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleDogsList\n";
        try {
            $this->mq->publish('db.dogs.list', [
                'status'       => $data['status']       ?? 'available',
                'breed'        => $data['breed']        ?? null,
                'size'         => $data['size']         ?? null,
                'energy_level' => $data['energy_level'] ?? null,
                'shelter_id'   => $data['shelter_id']   ?? null,
                'limit'        => $data['limit']        ?? 20,
                'offset'       => $data['offset']       ?? 0,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.dogs.list', $corrId);
            $this->respond('response.dogs.list', $result ?? ['success' => false, 'error' => 'Could not load dogs'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.dogs.list', 'Could not load dogs', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleDogsGet(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleDogsGet: dog_id={$data['dog_id']}\n";
        try {
            $this->mq->publish('db.dogs.get', ['dog_id' => $data['dog_id']], $corrId);
            $result = $this->mq->waitForResponse('db.result.dogs.get', $corrId);
            $this->respond('response.dogs.get', $result ?? ['success' => false, 'error' => 'Dog not found'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.dogs.get', 'Could not load dog', $corrId);
            $msg->nack(false, true);
        }
    }

    // APPLICATIONS

    public function handleApplicationSubmit(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleApplicationSubmit: user_id={$data['user_id']}\n";
        try {
            $this->mq->publish('db.application.submit', [
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
            $result = $this->mq->waitForResponse('db.result.application.submit', $corrId);
            $this->respond('response.application.submit', $result ?? ['success' => false, 'error' => 'Could not submit application'], $corrId);
            if (!empty($result['success'])) {
                $this->notify($data['user_id'], 'application_received', 'Your adoption application has been received and is pending review.');
            }
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.application.submit', 'Could not submit application', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleApplicationStatus(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleApplicationStatus\n";
        try {
            $this->mq->publish('db.application.status', [
                'application_id' => $data['application_id'],
                'user_id'        => $data['user_id'],
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.application.status', $corrId);
            if (!empty($result['application']['full_name'])) {
                $result['application']['full_name'] = $this->dec($result['application']['full_name']);
            }
            $this->respond('response.application.status', $result ?? ['success' => false, 'error' => 'Could not fetch status'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.application.status', 'Could not fetch status', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleApplicationList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleApplicationList\n";
        try {
            $this->mq->publish('db.application.list', [
                'status'     => $data['status']     ?? null,
                'shelter_id' => $data['shelter_id'] ?? null,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.application.list', $corrId);
            if (!empty($result['applications'])) {
                foreach ($result['applications'] as &$app) {
                    $app['full_name']  = $this->dec($app['full_name']  ?? '');
                    $app['phone']      = $this->dec($app['phone']      ?? '');
                    $app['first_name'] = $this->dec($app['first_name'] ?? '');
                    $app['last_name']  = $this->dec($app['last_name']  ?? '');
                }
            }
            $this->respond('response.application.list', $result ?? ['success' => false, 'error' => 'Could not fetch applications'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.application.list', 'Could not fetch applications', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleApplicationApprove(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleApplicationApprove\n";
        try {
            $this->mq->publish('db.application.approve', [
                'application_id' => $data['application_id'],
                'reviewed_by'    => $data['reviewed_by']    ?? null,
                'reviewer_notes' => $data['reviewer_notes'] ?? null,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.application.approve', $corrId);
            $this->respond('response.application.decision', $result ?? ['success' => false, 'error' => 'Could not approve'], $corrId);
            if (!empty($result['success']) && !empty($result['user_id'])) {
                $this->notify($result['user_id'], 'application_approved', 'Congratulations! Your adoption application has been approved.');
            }
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.application.decision', 'Could not approve', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleApplicationReject(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleApplicationReject\n";
        try {
            $this->mq->publish('db.application.reject', [
                'application_id' => $data['application_id'],
                'reviewed_by'    => $data['reviewed_by']    ?? null,
                'reviewer_notes' => $data['reviewer_notes'] ?? null,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.application.reject', $corrId);
            $this->respond('response.application.decision', $result ?? ['success' => false, 'error' => 'Could not reject'], $corrId);
            if (!empty($result['success']) && !empty($result['user_id'])) {
                $this->notify($result['user_id'], 'application_rejected', 'Your adoption application was not successful this time.');
            }
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.application.decision', 'Could not reject', $corrId);
            $msg->nack(false, true);
        }
    }

    // ADOPTIONS [the finalized records]

    public function handleAdoptionsList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleAdoptionsList: user_id={$data['user_id']}\n";
        try {
            $this->mq->publish('db.adoptions.list', ['user_id' => $data['user_id']], $corrId);
            $result = $this->mq->waitForResponse('db.result.adoptions.list', $corrId);
            $this->respond('response.adoptions.list', $result ?? ['success' => false, 'error' => 'Could not load adoptions'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.adoptions.list', 'Could not load adoptions', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleAdoptionsGet(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleAdoptionsGet: adoption_id={$data['adoption_id']}\n";
        try {
            $this->mq->publish('db.adoptions.get', [
                'adoption_id' => $data['adoption_id'],
                'user_id'     => $data['user_id'],
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.adoptions.get', $corrId);
            $this->respond('response.adoptions.get', $result ?? ['success' => false, 'error' => 'Not found'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.adoptions.get', 'Could not load adoption', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleAdoptionsFinalize(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleAdoptionsFinalize: application_id={$data['application_id']}\n";
        try {
            $this->mq->publish('db.adoptions.finalize', [
                'application_id' => $data['application_id'],
                'finalized_by'   => $data['finalized_by'] ?? null,
                'notes'          => $data['notes']        ?? null,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.adoptions.finalize', $corrId);
            $this->respond('response.adoptions.finalize', $result ?? ['success' => false, 'error' => 'Could not finalize adoption'], $corrId);
            if (!empty($result['success']) && !empty($result['user_id'])) {
                $this->notify($result['user_id'], 'adoption_finalized', 'Your adoption is now complete! Welcome to the family.');
                $this->mq->publish('db.badges.mine', [
                    'user_id'    => $result['user_id'],
                    'auto_award' => 'adoption_complete',
                ], $corrId . '_badge');
            }
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.adoptions.finalize', 'Could not finalize adoption', $corrId);
            $msg->nack(false, true);
        }
    }

    // QUIZ

    public function handleQuizQuestions(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleQuizQuestions\n";
        try {
            $this->mq->publish('db.quiz.questions', [], $corrId);
            $result = $this->mq->waitForResponse('db.result.quiz.questions', $corrId);
            $this->respond('response.quiz.questions', $result ?? ['success' => false, 'error' => 'Could not load quiz'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.quiz.questions', 'Could not load quiz', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleQuiz(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleQuiz: user_id={$data['user_id']}\n";
        try {
            $this->mq->publish('db.quiz.submit', [
                'user_id' => $data['user_id'],
                'answers' => $data['answers'] ?? [],
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.quiz.submit', $corrId);
            $this->respond('response.quiz.result', $result ?? ['success' => false, 'error' => 'Quiz failed'], $corrId);
            if (!empty($result['success'])) {
                $this->mq->publish('db.badges.mine', [
                    'user_id'    => $data['user_id'],
                    'auto_award' => 'quiz_complete',
                ], $corrId . '_badge');
            }
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.quiz.result', 'Quiz failed', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleQuizResults(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleQuizResults: user_id={$data['user_id']}\n";
        try {
            $this->mq->publish('db.quiz.results', ['user_id' => $data['user_id']], $corrId);
            $result = $this->mq->waitForResponse('db.result.quiz.results', $corrId);
            $this->respond('response.quiz.results', $result ?? ['success' => false, 'error' => 'Could not load results'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.quiz.results', 'Could not load results', $corrId);
            $msg->nack(false, true);
        }
    }

    // POST ADOPTION LOGS

    public function handleAdoptionLogCreate(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleAdoptionLogCreate\n";
        try {
            $this->mq->publish('db.adoption.log.create', [
                'user_id'  => $data['user_id'],
                'dog_id'   => $data['dog_id'],
                'log_type' => $data['log_type'] ?? 'general',
                'title'    => $data['title']    ?? '',
                'notes'    => $data['notes']    ?? '',
                'log_date' => $data['log_date'] ?? date('Y-m-d'),
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.adoption.log.create', $corrId);
            $this->respond('response.adoption.log.create', $result ?? ['success' => false, 'error' => 'Could not save log'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.adoption.log.create', 'Could not save log', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleAdoptionLogList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleAdoptionLogList\n";
        try {
            $this->mq->publish('db.adoption.log.list', [
                'user_id'  => $data['user_id'],
                'dog_id'   => $data['dog_id'],
                'log_type' => $data['log_type'] ?? null,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.adoption.log.list', $corrId);
            $this->respond('response.adoption.log.list', $result ?? ['success' => false, 'error' => 'Could not load logs'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.adoption.log.list', 'Could not load logs', $corrId);
            $msg->nack(false, true);
        }
    }

    // VIRTUAL FOSTER

    public function handleFosterApply(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleFosterApply\n";
        try {
            $this->mq->publish('db.foster.apply', [
                'user_id'            => $data['user_id'],
                'dog_id'             => $data['dog_id'],
                'sponsorship_amount' => $data['sponsorship_amount'] ?? 0,
                'start_date'         => $data['start_date'] ?? date('Y-m-d'),
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.foster.apply', $corrId);
            $this->respond('response.foster.apply', $result ?? ['success' => false, 'error' => 'Foster failed'], $corrId);
            if (!empty($result['success'])) {
                $this->notify($data['user_id'], 'foster_active', 'Your virtual foster sponsorship is now active!');
            }
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.foster.apply', 'Foster failed', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleFosterList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleFosterList\n";
        try {
            $this->mq->publish('db.foster.list', ['user_id' => $data['user_id']], $corrId);
            $result = $this->mq->waitForResponse('db.result.foster.list', $corrId);
            $this->respond('response.foster.list', $result ?? ['success' => false, 'error' => 'Could not load sponsorships'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.foster.list', 'Could not load sponsorships', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleFosterCancel(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleFosterCancel\n";
        try {
            $this->mq->publish('db.foster.cancel', [
                'foster_id' => $data['foster_id'],
                'user_id'   => $data['user_id'],
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.foster.cancel', $corrId);
            $this->respond('response.foster.cancel', $result ?? ['success' => false, 'error' => 'Could not cancel'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.foster.cancel', 'Could not cancel sponsorship', $corrId);
            $msg->nack(false, true);
        }
    }

    // PET PARKS

    public function handleParksList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleParksList\n";
        try {
            $this->mq->publish('db.parks.list', [
                'shelter_id' => $data['shelter_id'] ?? null,
                'lat'        => $data['lat']        ?? null,
                'lng'        => $data['lng']        ?? null,
                'radius_km'  => $data['radius_km']  ?? 10,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.parks.list', $corrId);
            $this->respond('response.parks.list', $result ?? ['success' => false, 'error' => 'Could not load parks'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.parks.list', 'Could not load parks', $corrId);
            $msg->nack(false, true);
        }
    }

    // RESOURCES

    public function handleResourcesList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleResourcesList\n";
        try {
            $this->mq->publish('db.resources.list', [
                'topic'  => $data['topic']  ?? null,
                'type'   => $data['type']   ?? null,
                'search' => $data['search'] ?? null,
                'limit'  => $data['limit']  ?? 20,
                'offset' => $data['offset'] ?? 0,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.resources.list', $corrId);
            $this->respond('response.resources.list', $result ?? ['success' => false, 'error' => 'Could not load resources'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.resources.list', 'Could not load resources', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleResourcesGet(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleResourcesGet\n";
        try {
            $this->mq->publish('db.resources.get', ['resource_id' => $data['resource_id']], $corrId);
            $result = $this->mq->waitForResponse('db.result.resources.get', $corrId);
            $this->respond('response.resources.get', $result ?? ['success' => false, 'error' => 'Not found'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.resources.get', 'Could not load resource', $corrId);
            $msg->nack(false, true);
        }
    }

    // SUCCESS STORIES

    public function handleStoriesList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleStoriesList\n";
        try {
            $this->mq->publish('db.stories.list', [
                'limit'  => $data['limit']  ?? 10,
                'offset' => $data['offset'] ?? 0,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.stories.list', $corrId);
            $this->respond('response.stories.list', $result ?? ['success' => false, 'error' => 'Could not load stories'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.stories.list', 'Could not load stories', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleStoriesSubmit(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleStoriesSubmit\n";
        try {
            $this->mq->publish('db.stories.submit', [
                'user_id'   => $data['user_id'],
                'dog_id'    => $data['dog_id']    ?? null,
                'title'     => $data['title']     ?? '',
                'story'     => $data['story']     ?? '',
                'photo_url' => $data['photo_url'] ?? null,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.stories.submit', $corrId);
            $this->respond('response.stories.submit', $result ?? ['success' => false, 'error' => 'Could not submit story'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.stories.submit', 'Could not submit story', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleStoriesApprove(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleStoriesApprove\n";
        try {
            $this->mq->publish('db.stories.approve', [
                'story_id'    => $data['story_id'],
                'approved_by' => $data['approved_by'] ?? null,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.stories.approve', $corrId);
            $this->respond('response.stories.approve', $result ?? ['success' => false, 'error' => 'Could not approve story'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.stories.approve', 'Could not approve story', $corrId);
            $msg->nack(false, true);
        }
    }

    // BADGES

    public function handleBadgesList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleBadgesList\n";
        try {
            $this->mq->publish('db.badges.list', [], $corrId);
            $result = $this->mq->waitForResponse('db.result.badges.list', $corrId);
            $this->respond('response.badges.list', $result ?? ['success' => false, 'error' => 'Could not load badges'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.badges.list', 'Could not load badges', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleBadgesMine(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleBadgesMine\n";
        try {
            $this->mq->publish('db.badges.mine', [
                'user_id'    => $data['user_id'],
                'auto_award' => null,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.badges.mine', $corrId);
            $this->respond('response.badges.mine', $result ?? ['success' => false, 'error' => 'Could not load badges'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.badges.mine', 'Could not load badges', $corrId);
            $msg->nack(false, true);
        }
    }

    // CHAT 

    public function handleEnquiry(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleEnquiry\n";
        try {
            $this->mq->publish('db.enquiry.send', [
                'user_id'    => $data['user_id'],
                'dog_id'     => $data['dog_id'],
                'shelter_id' => $data['shelter_id'],
                'message'    => $data['message'] ?? '',
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.enquiry.send', $corrId);
            $this->respond('response.enquiry.reply', $result ?? ['success' => false, 'error' => 'Could not send message'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.enquiry.reply', 'Could not send message', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleChatStart(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleChatStart\n";
        try {
            $this->mq->publish('db.chat.start', [
                'user_id'    => $data['user_id'],
                'dog_id'     => $data['dog_id'],
                'shelter_id' => $data['shelter_id'],
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.chat.start', $corrId);
            $this->respond('response.chat.start', $result ?? ['success' => false, 'error' => 'Could not start chat'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.chat.start', 'Could not start chat', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleChatMessage(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleChatMessage\n";
        try {
            $this->mq->publish('db.chat.message', [
                'session_id' => $data['session_id'],
                'sender_id'  => $data['sender_id'],
                'message'    => $data['message'] ?? '',
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.chat.message', $corrId);
            $this->respond('response.chat.message', $result ?? ['success' => false, 'error' => 'Could not send message'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.chat.message', 'Could not send message', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleChatHistory(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleChatHistory\n";
        try {
            $this->mq->publish('db.chat.history', [
                'session_id' => $data['session_id'],
                'user_id'    => $data['user_id'],
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.chat.history', $corrId);
            $this->respond('response.chat.history', $result ?? ['success' => false, 'error' => 'Could not load chat'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.chat.history', 'Could not load chat', $corrId);
            $msg->nack(false, true);
        }
    }

    // MEET & GREET

    public function handleMeetGreetSchedule(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleMeetGreetSchedule\n";
        try {
            $this->mq->publish('db.meetgreet.schedule', [
                'user_id'        => $data['user_id'],
                'dog_id'         => $data['dog_id'],
                'shelter_id'     => $data['shelter_id'],
                'scheduled_date' => $data['scheduled_date'],
                'scheduled_time' => $data['scheduled_time'],
                'video_link'     => $data['video_link'] ?? null,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.meetgreet.schedule', $corrId);
            $this->respond('response.meetgreet.schedule', $result ?? ['success' => false, 'error' => 'Could not schedule meeting'], $corrId);
            if (!empty($result['success'])) {
                $this->notify($data['user_id'], 'meetgreet_scheduled', "Your meet & greet is confirmed for {$data['scheduled_date']} at {$data['scheduled_time']}.");
            }
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.meetgreet.schedule', 'Could not schedule meeting', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleMeetGreetList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleMeetGreetList\n";
        try {
            $this->mq->publish('db.meetgreet.list', ['user_id' => $data['user_id']], $corrId);
            $result = $this->mq->waitForResponse('db.result.meetgreet.list', $corrId);
            $this->respond('response.meetgreet.list', $result ?? ['success' => false, 'error' => 'Could not load meetings'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.meetgreet.list', 'Could not load meetings', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleMeetGreetCancel(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleMeetGreetCancel\n";
        try {
            $this->mq->publish('db.meetgreet.cancel', [
                'session_id' => $data['session_id'],
                'user_id'    => $data['user_id'],
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.meetgreet.cancel', $corrId);
            $this->respond('response.meetgreet.cancel', $result ?? ['success' => false, 'error' => 'Could not cancel meeting'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.meetgreet.cancel', 'Could not cancel meeting', $corrId);
            $msg->nack(false, true);
        }
    }

    // NOTIFICATIONS

    public function handleNotificationsList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleNotificationsList\n";
        try {
            $this->mq->publish('db.notifications.list', [
                'user_id' => $data['user_id'],
                'unread'  => $data['unread'] ?? false,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.notifications.list', $corrId);
            $this->respond('response.notifications.list', $result ?? ['success' => false, 'error' => 'Could not load notifications'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.notifications.list', 'Could not load notifications', $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleNotificationsRead(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleNotificationsRead\n";
        try {
            $this->mq->publish('db.notifications.read', [
                'user_id'         => $data['user_id'],
                'notification_id' => $data['notification_id'] ?? null,
            ], $corrId);
            $result = $this->mq->waitForResponse('db.result.notifications.read', $corrId);
            $this->respond('response.notifications.read', $result ?? ['success' => false, 'error' => 'Could not mark as read'], $corrId);
            $msg->ack();
        } catch (\Throwable $e) {
            $this->fail('response.notifications.read', 'Could not mark as read', $corrId);
            $msg->nack(false, true);
        }
    }

    // Helpers

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
        $this->mq->publish('notifications', [
            'event'   => $event,
            'user_id' => $userId,
            'message' => $message,
        ]);
    }

    private function enc(string $value): string
    {
        return $value !== '' ? $this->enc->encrypt($value) : '';
    }

    private function dec(string $value): string
    {
        return $value !== '' ? $this->enc->decrypt($value) : '';

    }

    private function encryptIfPresent($value) {
        return !empty($value) ? $value : ''; 
}
}
