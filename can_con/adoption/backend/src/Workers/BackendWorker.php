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

        $this->mq->registerConsumer('request.auth.register',       [$this, 'handleRegister']);
        $this->mq->registerConsumer('request.auth.login',          [$this, 'handleLogin']);
        $this->mq->registerConsumer('request.dogs.list',           [$this, 'handleDogsList']);
        $this->mq->registerConsumer('request.dogs.get',            [$this, 'handleDogsGet']);
        $this->mq->registerConsumer('request.application.submit',  [$this, 'handleApplicationSubmit']);
        $this->mq->registerConsumer('request.application.status',  [$this, 'handleApplicationStatus']);
        $this->mq->registerConsumer('request.application.list',    [$this, 'handleApplicationList']);
        $this->mq->registerConsumer('request.application.approve', [$this, 'handleApplicationApprove']);
        $this->mq->registerConsumer('request.application.reject',  [$this, 'handleApplicationReject']);
        $this->mq->registerConsumer('request.enquiry.send',        [$this, 'handleEnquiry']);
        $this->mq->registerConsumer('request.quiz.submit',         [$this, 'handleQuiz']);
        $this->mq->registerConsumer('request.foster.apply',        [$this, 'handleFosterApply']);

        echo "[Backend] All consumers registered — listening\n";

        $this->mq->wait();
    }

    public function handleRegister(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleRegister: {$data['email']}\n";

        try {
            if (empty($data['email']) || empty($data['password'])) {
                $this->respond('response.auth.register', [
                    'success' => false,
                    'error'   => 'email and password are required',
                ], $corrId);
                $msg->ack();
                return;
            }

            $this->mq->publish('db.auth.register', [
                'email'         => $data['email'],
                'password_hash' => $this->enc->hashPassword($data['password']),
                'first_name'    => $this->encryptIfPresent($data['first_name'] ?? ''),
                'last_name'     => $this->encryptIfPresent($data['last_name']  ?? ''),
                'phone'         => $this->encryptIfPresent($data['phone']      ?? ''),
                'address'       => $this->encryptIfPresent($data['address']    ?? ''),
                'role'          => 'adopter',
            ], $corrId);

            $result = $this->mq->waitForResponse('db.result.auth.register', $corrId);

            if (!$result || !$result['success']) {
                $this->respond('response.auth.register', [
                    'success' => false,
                    'error'   => $result['error'] ?? 'Registration failed',
                ], $corrId);
                $msg->ack();
                return;
            }

            $this->respond('response.auth.register', [
                'success'    => true,
                'user_id'    => $result['user_id'],
                'email'      => $data['email'],
                'first_name' => $data['first_name'] ?? '',
                'last_name'  => $data['last_name']  ?? '',
                'role'       => 'adopter',
            ], $corrId);

            $msg->ack();

        } catch (\Throwable $e) {
            echo "[Backend][ERROR] handleRegister: {$e->getMessage()}\n";
            $this->respond('response.auth.register', [
                'success' => false,
                'error'   => 'Registration failed — please try again',
            ], $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleLogin(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleLogin: {$data['email']}\n";

        try {
            if (empty($data['email']) || empty($data['password'])) {
                $this->respond('response.auth.login', [
                    'success' => false,
                    'error'   => 'email and password are required',
                ], $corrId);
                $msg->ack();
                return;
            }

            $this->mq->publish('db.auth.login', [
                'email' => $data['email'],
            ], $corrId);

            $result = $this->mq->waitForResponse('db.result.auth.login', $corrId);

            if (!$result || empty($result['user'])) {
                $this->respond('response.auth.login', [
                    'success' => false,
                    'error'   => 'Invalid email or password',
                ], $corrId);
                $msg->ack();
                return;
            }

            $user = $result['user'];

            if (!$this->enc->verifyPassword($data['password'], $user['password_hash'])) {
                $this->respond('response.auth.login', [
                    'success' => false,
                    'error'   => 'Invalid email or password',
                ], $corrId);
                $msg->ack();
                return;
            }

            $this->respond('response.auth.login', [
                'success'    => true,
                'token'      => bin2hex(random_bytes(32)),
                'user_id'    => $user['user_id'],
                'email'      => $user['email'],
                'first_name' => $this->decryptIfPresent($user['first_name'] ?? ''),
                'last_name'  => $this->decryptIfPresent($user['last_name']  ?? ''),
                'role'       => $user['role'],
            ], $corrId);

            $msg->ack();
            echo "[Backend] Login success: user_id={$user['user_id']}\n";

        } catch (\Throwable $e) {
            echo "[Backend][ERROR] handleLogin: {$e->getMessage()}\n";
            $this->respond('response.auth.login', [
                'success' => false,
                'error'   => 'Login failed — please try again',
            ], $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleDogsList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleDogsList\n";

        try {
            $this->mq->publish('db.dogs.list', [
                'status'       => $data['status']       ?? 'available',
                'breed'        => $data['breed']        ?? null,
                'size'         => $data['size']         ?? null,
                'energy_level' => $data['energy_level'] ?? null,
                'limit'        => $data['limit']        ?? 20,
                'offset'       => $data['offset']       ?? 0,
            ], $corrId);

            $result = $this->mq->waitForResponse('db.result.dogs.list', $corrId);

            $this->respond('response.dogs.list', $result ?? [
                'success' => false,
                'error'   => 'Could not load dogs',
            ], $corrId);

            $msg->ack();

        } catch (\Throwable $e) {
            echo "[Backend][ERROR] handleDogsList: {$e->getMessage()}\n";
            $this->respond('response.dogs.list', ['success' => false, 'error' => 'Could not load dogs'], $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleDogsGet(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleDogsGet: dog_id={$data['dog_id']}\n";

        try {
            $this->mq->publish('db.dogs.get', ['dog_id' => $data['dog_id']], $corrId);

            $result = $this->mq->waitForResponse('db.result.dogs.get', $corrId);

            $this->respond('response.dogs.get', $result ?? [
                'success' => false, 'error' => 'Dog not found',
            ], $corrId);

            $msg->ack();

        } catch (\Throwable $e) {
            echo "[Backend][ERROR] handleDogsGet: {$e->getMessage()}\n";
            $this->respond('response.dogs.get', ['success' => false, 'error' => 'Could not load dog'], $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleApplicationSubmit(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleApplicationSubmit: user_id={$data['user_id']}\n";

        try {
            $this->mq->publish('db.application.submit', [
                'user_id'                => $data['user_id'],
                'dog_id'                 => $data['dog_id'],
                'full_name'              => $this->encryptIfPresent($data['full_name'] ?? ''),
                'address'                => $this->encryptIfPresent($data['address']   ?? ''),
                'phone'                  => $this->encryptIfPresent($data['phone']     ?? ''),
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

            $this->respond('response.application.submit', $result ?? [
                'success' => false, 'error' => 'Could not submit application',
            ], $corrId);

            if (!empty($result['success'])) {
                $this->mq->publish('notifications', [
                    'event'   => 'application_received',
                    'user_id' => $data['user_id'],
                    'message' => 'Your adoption application has been received and is pending review.',
                ]);
            }

            $msg->ack();

        } catch (\Throwable $e) {
            echo "[Backend][ERROR] handleApplicationSubmit: {$e->getMessage()}\n";
            $this->respond('response.application.submit', ['success' => false, 'error' => 'Could not submit application'], $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleApplicationStatus(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleApplicationStatus: application_id={$data['application_id']}\n";

        try {
            $this->mq->publish('db.application.status', [
                'application_id' => $data['application_id'],
                'user_id'        => $data['user_id'],
            ], $corrId);

            $result = $this->mq->waitForResponse('db.result.application.status', $corrId);

            if (!empty($result['application']['full_name'])) {
                $result['application']['full_name'] = $this->decryptIfPresent($result['application']['full_name']);
            }

            $this->respond('response.application.status', $result ?? [
                'success' => false, 'error' => 'Could not fetch status',
            ], $corrId);

            $msg->ack();

        } catch (\Throwable $e) {
            echo "[Backend][ERROR] handleApplicationStatus: {$e->getMessage()}\n";
            $this->respond('response.application.status', ['success' => false, 'error' => 'Could not fetch status'], $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleApplicationList(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleApplicationList\n";

        try {
            $this->mq->publish('db.application.list', [
                'status' => $data['status'] ?? null,
            ], $corrId);

            $result = $this->mq->waitForResponse('db.result.application.list', $corrId);

            if (!empty($result['applications'])) {
                foreach ($result['applications'] as &$app) {
                    $app['full_name']  = $this->decryptIfPresent($app['full_name']  ?? '');
                    $app['phone']      = $this->decryptIfPresent($app['phone']      ?? '');
                    $app['first_name'] = $this->decryptIfPresent($app['first_name'] ?? '');
                    $app['last_name']  = $this->decryptIfPresent($app['last_name']  ?? '');
                }
            }

            $this->respond('response.application.list', $result ?? [
                'success' => false, 'error' => 'Could not fetch applications',
            ], $corrId);

            $msg->ack();

        } catch (\Throwable $e) {
            echo "[Backend][ERROR] handleApplicationList: {$e->getMessage()}\n";
            $this->respond('response.application.list', ['success' => false, 'error' => 'Could not fetch applications'], $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleApplicationApprove(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleApplicationApprove: application_id={$data['application_id']}\n";

        try {
            $this->mq->publish('db.application.approve', [
                'application_id' => $data['application_id'],
                'reviewed_by'    => $data['reviewed_by']    ?? null,
                'reviewer_notes' => $data['reviewer_notes'] ?? null,
            ], $corrId);

            $result = $this->mq->waitForResponse('db.result.application.approve', $corrId);

            $this->respond('response.application.decision', $result ?? [
                'success' => false, 'error' => 'Could not approve application',
            ], $corrId);

            if (!empty($result['success']) && !empty($result['user_id'])) {
                $this->mq->publish('notifications', [
                    'event'   => 'application_approved',
                    'user_id' => $result['user_id'],
                    'message' => 'Congratulations! Your adoption application has been approved.',
                ]);
            }

            $msg->ack();

        } catch (\Throwable $e) {
            echo "[Backend][ERROR] handleApplicationApprove: {$e->getMessage()}\n";
            $this->respond('response.application.decision', ['success' => false, 'error' => 'Could not approve'], $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleApplicationReject(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleApplicationReject: application_id={$data['application_id']}\n";

        try {
            $this->mq->publish('db.application.reject', [
                'application_id' => $data['application_id'],
                'reviewed_by'    => $data['reviewed_by']    ?? null,
                'reviewer_notes' => $data['reviewer_notes'] ?? null,
            ], $corrId);

            $result = $this->mq->waitForResponse('db.result.application.reject', $corrId);

            $this->respond('response.application.decision', $result ?? [
                'success' => false, 'error' => 'Could not reject application',
            ], $corrId);

            if (!empty($result['success']) && !empty($result['user_id'])) {
                $this->mq->publish('notifications', [
                    'event'   => 'application_rejected',
                    'user_id' => $result['user_id'],
                    'message' => 'Your adoption application was not successful this time.',
                ]);
            }

            $msg->ack();

        } catch (\Throwable $e) {
            echo "[Backend][ERROR] handleApplicationReject: {$e->getMessage()}\n";
            $this->respond('response.application.decision', ['success' => false, 'error' => 'Could not reject'], $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleEnquiry(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleEnquiry: user_id={$data['user_id']}\n";

        try {
            $this->mq->publish('db.enquiry.send', [
                'user_id'    => $data['user_id'],
                'dog_id'     => $data['dog_id'],
                'shelter_id' => $data['shelter_id'],
                'message'    => $data['message'] ?? '',
            ], $corrId);

            $result = $this->mq->waitForResponse('db.result.enquiry.send', $corrId);

            $this->respond('response.enquiry.reply', $result ?? [
                'success' => false, 'error' => 'Could not send message',
            ], $corrId);

            $msg->ack();

        } catch (\Throwable $e) {
            echo "[Backend][ERROR] handleEnquiry: {$e->getMessage()}\n";
            $this->respond('response.enquiry.reply', ['success' => false, 'error' => 'Could not send message'], $corrId);
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

            $this->respond('response.quiz.result', $result ?? [
                'success' => false, 'error' => 'Quiz processing failed',
            ], $corrId);

            $msg->ack();

        } catch (\Throwable $e) {
            echo "[Backend][ERROR] handleQuiz: {$e->getMessage()}\n";
            $this->respond('response.quiz.result', ['success' => false, 'error' => 'Quiz failed'], $corrId);
            $msg->nack(false, true);
        }
    }

    public function handleFosterApply(array $data, $msg, ?string $corrId): void
    {
        echo "[Backend] handleFosterApply: user_id={$data['user_id']}\n";

        try {
            $this->mq->publish('db.foster.apply', [
                'user_id'            => $data['user_id'],
                'dog_id'             => $data['dog_id'],
                'sponsorship_amount' => $data['sponsorship_amount'] ?? 0,
                'start_date'         => $data['start_date']         ?? date('Y-m-d'),
            ], $corrId);

            $result = $this->mq->waitForResponse('db.result.foster.apply', $corrId);

            $this->respond('response.foster.apply', $result ?? [
                'success' => false, 'error' => 'Could not process foster application',
            ], $corrId);

            if (!empty($result['success'])) {
                $this->mq->publish('notifications', [
                    'event'   => 'foster_active',
                    'user_id' => $data['user_id'],
                    'message' => 'Your virtual foster sponsorship is now active!',
                ]);
            }

            $msg->ack();

        } catch (\Throwable $e) {
            echo "[Backend][ERROR] handleFosterApply: {$e->getMessage()}\n";
            $this->respond('response.foster.apply', ['success' => false, 'error' => 'Foster failed'], $corrId);
            $msg->nack(false, true);
        }
    }


    private function respond(string $queue, array $payload, ?string $corrId): void
    {
        $this->mq->publish($queue, $payload, $corrId);
    }

    private function encryptIfPresent(string $value): string
    {
        return $value !== '' ? $this->enc->encrypt($value) : '';
    }

    private function decryptIfPresent(string $value): string
    {
        return $value !== '' ? $this->enc->decrypt($value) : '';
    }
}