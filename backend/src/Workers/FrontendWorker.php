<?php declare(strict_types=1);

namespace App\Workers;

use App\Infrastructure\Messaging\MessageBus;
use App\Infrastructure\Messaging\RabbitMqClient;
use App\Security\AccessPolicy;
use App\Security\Encryption;
use App\Security\LoginThrottle;
use App\Security\SessionToken;
use App\Services\Mailer;

// FrontendWorker is the frontend-facing backend worker.
// It consumes request.* queues, checks access (AccessPolicy), validates input, encrypts personal
// data, and forwards work to the bridge.* queues. Each request runs in a forked child process so a
// slow request never blocks the consumer loop.
final class FrontendWorker
{
    private Encryption $enc;
    private LoginThrottle $throttle;

    // $forkRequests=false handles requests inline on $mq (used by the tests; pcntl is Linux-only).
    public function __construct(
        private MessageBus $mq,
        private bool $forkRequests = true,
        ?LoginThrottle $throttle = null,
    ) {
        $this->enc      = new Encryption();
        $this->throttle = $throttle ?? new LoginThrottle();
    }

    public function run(bool &$running = true): void
    {
        echo "[FrontendWorker] Registering consumers...\n";
        $this->registerConsumers();
        echo "[FrontendWorker] All consumers registered — listening\n";
        $this->mq->wait($running);
    }

    public function registerConsumers(): void
    {
        // Authentication
        $this->on('request.auth.register',           'handleRegister');
        $this->on('request.auth.login',              'handleLogin');
        $this->on('request.auth.verify',             'handleVerifyEmail');
        $this->on('request.auth.resetPassword',      'handleResetPassword');
        $this->on('request.auth.forgotPassword',     'handleForgotPassword');
        $this->on('request.auth.setNewPassword',     'handleSetNewPassword');
        $this->on('request.auth.resendVerification', 'handleResendVerification');
        // Account
        $this->on('request.profile.update',          'handleProfileUpdate');
        $this->on('request.account.delete',          'handleAccountDelete');
        // Shelters & dogs
        $this->on('request.shelters.list',           'handleSheltersList');
        $this->on('request.shelters.get',            'handleSheltersGet');
        $this->on('request.api.key.get',             'handleApiKeyGet');
        $this->on('request.api.key.regenerate',      'handleApiKeyRegenerate');
        $this->on('request.api.logs',                'handleApiLogs');
        $this->on('request.dogs.list',               'handleDogsList');
        $this->on('request.dogs.get',                'handleDogsGet');
        $this->on('request.api.dog.upsert',          'handleApiDogUpsert');
        // Applications & adoptions
        $this->on('request.application.submit',      'handleApplicationSubmit');
        $this->on('request.application.status',      'handleApplicationStatus');
        $this->on('request.application.list',        'handleApplicationList');
        $this->on('request.application.approve',     'handleApplicationApprove');
        $this->on('request.application.reject',      'handleApplicationReject');
        $this->on('request.adoptions.list',          'handleAdoptionsList');
        $this->on('request.adoptions.get',           'handleAdoptionsGet');
        $this->on('request.adoptions.finalize',      'handleAdoptionsFinalize');
        // Quiz & journal
        $this->on('request.quiz.questions',          'handleQuizQuestions');
        $this->on('request.quiz.submit',             'handleQuiz');
        $this->on('request.quiz.results',            'handleQuizResults');
        $this->on('request.adoption.log.create',     'handleAdoptionLogCreate');
        $this->on('request.adoption.log.list',       'handleAdoptionLogList');
        $this->on('request.adoption.log.delete',     'handleAdoptionLogDelete');
        // Fostering, parks, content
        $this->on('request.foster.apply',            'handleFosterApply');
        $this->on('request.foster.list',             'handleFosterList');
        $this->on('request.foster.cancel',           'handleFosterCancel');
        $this->on('request.parks.list',              'handleParksList');
        $this->on('request.resources.list',          'handleResourcesList');
        $this->on('request.resources.get',           'handleResourcesGet');
        $this->on('request.stories.list',            'handleStoriesList');
        $this->on('request.stories.submit',          'handleStoriesSubmit');
        $this->on('request.stories.approve',         'handleStoriesApprove');
        $this->on('request.badges.list',             'handleBadgesList');
        $this->on('request.badges.mine',             'handleBadgesMine');
        // Messaging, meet & greets, notifications, saved dogs
        $this->on('request.enquiry.send',            'handleEnquiry');
        $this->on('request.chat.start',              'handleChatStart');
        $this->on('request.chat.message',            'handleChatMessage');
        $this->on('request.chat.history',            'handleChatHistory');
        $this->on('request.chat.sessions',           'handleChatSessions');
        $this->on('request.meetgreet.schedule',      'handleMeetGreetSchedule');
        $this->on('request.meetgreet.list',          'handleMeetGreetList');
        $this->on('request.meetgreet.cancel',        'handleMeetGreetCancel');
        $this->on('request.notifications.list',      'handleNotificationsList');
        $this->on('request.notifications.read',      'handleNotificationsRead');
        $this->on('request.saved_dogs.list',         'handleSavedDogsList');
        $this->on('request.saved_dogs.add',          'handleSavedDogsAdd');
        $this->on('request.saved_dogs.remove',       'handleSavedDogsRemove');
    }

    // ── Plumbing ────────────────────────────────────────────────────────────

    // Registers a consumer whose messages pass through AccessPolicy before reaching the handler.
    // Unauthenticated or unauthorized requests are answered here and never reach the bridge layer.
    private function on(string $queue, string $method): void
    {
        $this->mq->registerConsumer($queue, function (array $data, $msg, ?string $corrId) use ($queue, $method) {
            $access = AccessPolicy::check($queue, $data);
            if (!$access['ok']) {
                echo "[FrontendWorker][DENY] {$queue}: {$access['code']}\n";
                $this->respond($this->mq, 'response.error', $this->replyTo($msg), [
                    'success' => false,
                    'code'    => $access['code'],
                    'error'   => $access['error'],
                ], $corrId);
                $msg->ack();
                return;
            }
            $this->{$method}($access['data'], $msg, $corrId);
        });
    }

    // Runs $fn in a forked child with its own broker connection, then acks the message.
    private function fork(callable $fn, $msg): void
    {
        if (!$this->forkRequests) {
            $fn($this->mq);
            $msg->ack();
            return;
        }
        $pid = pcntl_fork();
        if ($pid === -1) {
            echo "[FrontendWorker][ERROR] Fork failed\n";
            $msg->ack();
            return;
        }
        if ($pid === 0) {
            // Child processes must not share the parent's RabbitMQ socket.
            $this->mq->afterFork();
            try {
                $mq = $this->newMq();
                $fn($mq);
                $mq->close();
            } catch (\Throwable $e) {
                echo "[FrontendWorker][ERROR] Child exception: " . $e->getMessage() . "\n";
            }
            exit(0);
        }
        $msg->ack();
        pcntl_waitpid(-1, $status, WNOHANG);
    }

    // Creates a fresh RabbitMQ connection for a child process, trying each configured broker host.
    private function newMq(): MessageBus
    {
        $hosts = array_filter([$_ENV['RABBITMQ_HOST'] ?? null, $_ENV['RABBITMQ_HOST2'] ?? null, $_ENV['RABBITMQ_HOST3'] ?? null]);
        $lastErr = new \RuntimeException('No RABBITMQ_HOST configured');
        foreach ($hosts as $host) {
            try {
                return new RabbitMqClient($host, (int)$_ENV['RABBITMQ_PORT'], $_ENV['RABBITMQ_USER'], $_ENV['RABBITMQ_PASS'], false);
            } catch (\Throwable $e) {
                $lastErr = $e;
            }
        }
        throw $lastErr;
    }

    private function replyTo($msg): string
    {
        $props = $msg->get_properties();
        return isset($props['reply_to']) && $props['reply_to'] !== '' ? (string)$props['reply_to'] : '';
    }

    // Publishes to the request's reply-to queue, or to $fallbackQueue when there is none.
    private function respond(MessageBus $mq, string $fallbackQueue, string $replyTo, array $payload, ?string $corrId): void
    {
        $queue = $replyTo === '' ? $fallbackQueue
            : (str_starts_with($replyTo, '/queue/') ? substr($replyTo, strlen('/queue/')) : $replyTo);
        $mq->publish($queue, $payload, $corrId);
    }

    // Handles a request in a child process. $work(MessageBus $mq, callable $after) returns the
    // response payload; tasks passed to $after (emails, notifications) run once the response is sent,
    // so a slow mail server never delays the browser. A null result or an exception is answered
    // with ['success' => false, 'error' => $error].
    private function handle($msg, ?string $corrId, string $responseQueue, string $error, callable $work): void
    {
        $replyTo = $this->replyTo($msg);
        $this->fork(function (MessageBus $mq) use ($work, $responseQueue, $replyTo, $corrId, $error) {
            $afterResponse = [];
            $after = function (callable $task) use (&$afterResponse) { $afterResponse[] = $task; };
            try {
                $result = $work($mq, $after);
            } catch (\Throwable $e) {
                echo "[FrontendWorker][ERROR] {$responseQueue}: {$e->getMessage()}\n";
                $result = null;
            }
            $this->respond($mq, $responseQueue, $replyTo, $result ?? self::fail($error), $corrId);
            foreach ($afterResponse as $task) {
                try {
                    $task();
                } catch (\Throwable $e) {
                    echo "[FrontendWorker][ERROR] {$responseQueue} follow-up: {$e->getMessage()}\n";
                }
            }
        }, $msg);
    }

    // The common case: forward $payload to $bridgeQueue and send back whatever it returns.
    private function relay($msg, ?string $corrId, string $bridgeQueue, array $payload, string $responseQueue, string $error): void
    {
        $this->handle($msg, $corrId, $responseQueue, $error,
            fn (MessageBus $mq) => $mq->publishAndWait($bridgeQueue, $payload, (string)$corrId));
    }

    // Answers immediately without contacting the bridge (input validation failures).
    private function reject($msg, ?string $corrId, string $responseQueue, string $error): void
    {
        $this->handle($msg, $corrId, $responseQueue, $error, fn () => self::fail($error));
    }

    private static function fail(string $error): array
    {
        return ['success' => false, 'error' => $error];
    }

    // ── Authentication ──────────────────────────────────────────────────────

    // Validates input, hashes the password, encrypts personal fields and creates the account.
    public function handleRegister(array $data, $msg, ?string $corrId): void
    {
        $this->handle($msg, $corrId, 'response.auth.register', 'Registration failed', function (MessageBus $mq, callable $after) use ($data, $corrId) {
            if (empty($data['email']) || empty($data['password'])) return self::fail('email and password are required');
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) return self::fail('Please enter a valid email address');
            if (strlen((string)$data['password']) < 8) return self::fail('Password must be at least 8 characters');

            $firstName = (string)($data['firstName'] ?? $data['first_name'] ?? '');
            $lastName  = (string)($data['lastName']  ?? $data['last_name']  ?? '');
            $result = $mq->publishAndWait('bridge.auth.register', [
                'email'         => $data['email'],
                'password_hash' => $this->enc->hashPassword((string)$data['password']),
                'first_name'    => $this->enc($firstName),
                'last_name'     => $this->enc($lastName),
                'phone'         => $this->enc((string)($data['phone'] ?? '')),
                'address'       => $this->enc((string)($data['address'] ?? '')),
                'id_one_b64'    => $data['id_one_b64']  ?? null,
                'id_one_name'   => $data['id_one_name'] ?? null,
                'id_two_b64'    => $data['id_two_b64']  ?? null,
                'id_two_name'   => $data['id_two_name'] ?? null,
            ], (string)$corrId);
            if (!$result || empty($result['success'])) return self::fail($result['error'] ?? 'Registration failed');

            if (!empty($result['verification_token'])) {
                $link = $this->appUrl() . '/verify-email?token=' . $result['verification_token'];
                $after(fn () => Mailer::verifyEmail((string)$data['email'], $firstName, $link));
            }
            return [
                'success' => true, 'user_id' => $result['user_id'] ?? null, 'email' => $data['email'],
                'first_name' => $firstName, 'last_name' => $lastName, 'role' => 'adopter',
            ];
        });
    }

    // Checks lockouts, verifies the password, and issues a session token.
    public function handleLogin(array $data, $msg, ?string $corrId): void
    {
        $this->handle($msg, $corrId, 'response.auth.login', 'Login failed', function (MessageBus $mq, callable $after) use ($data, $corrId) {
            if (empty($data['email']) || empty($data['password'])) return self::fail('email and password are required');

            $srcIp = (string)($data['clientIp'] ?? 'unknown');
            if (str_starts_with($srcIp, '::ffff:')) $srcIp = substr($srcIp, 7);
            $srcIp = preg_replace('/[^a-zA-Z0-9._:-]/', '', $srcIp);

            // Lockouts are enforced before the password is checked, per IP and per account.
            $keys   = ['ip:' . $srcIp, 'acct:' . strtolower(trim((string)$data['email']))];
            $locked = max(array_map(fn ($k) => $this->throttle->lockedUntil($k) ?? 0, $keys));
            if ($locked > 0) {
                return ['success' => false, 'error' => 'Too many failed attempts. Try again later.', 'locked_until' => $locked];
            }

            $result = $mq->publishAndWait('bridge.auth.login', ['email' => $data['email']], (string)$corrId);
            if (!$result) return self::fail('Service temporarily unavailable. Please try again in a moment.');
            $user = ($result['success'] ?? false) === true ? ($result['user'] ?? null) : null;

            // Unknown emails and wrong passwords get the same answer so accounts cannot be enumerated.
            if (!$user || !password_verify((string)$data['password'], (string)$user['password_hash'])) {
                // The src_ip field is what Fail2Ban matches on (infra/fail2ban).
                echo "[SECURITY_ALERT] Auth failure for: " . $data['email'] . " src_ip=" . $srcIp . "\n";
                $attempts  = max(array_map(fn ($k) => $this->throttle->fail($k), $keys));
                $remaining = max(0, LoginThrottle::MAX_ATTEMPTS - $attempts);
                if ($remaining === 0) {
                    return ['success' => false, 'error' => 'Locked out for 1 hour.', 'locked_until' => time() + LoginThrottle::WINDOW];
                }
                return self::fail("Invalid email or password. {$remaining} attempt" . ($remaining === 1 ? '' : 's') . ' remaining.');
            }
            if (isset($user['email_verified']) && (int)$user['email_verified'] === 0) {
                return self::fail('Please verify your email before logging in. Check your inbox for the verification link.');
            }
            foreach ($keys as $k) $this->throttle->clear($k);

            unset($user['password_hash']);
            foreach (['first_name', 'last_name', 'phone', 'address'] as $field) {
                $user[$field] = $this->dec((string)($user[$field] ?? ''));
            }
            $token = SessionToken::issue(SessionToken::TYPE_SESSION, [
                'uid'   => (int)$user['user_id'],
                'role'  => (string)($user['role'] ?? 'adopter'),
                'email' => (string)$user['email'],
            ], SessionToken::SESSION_TTL);

            if (!empty($user['login_notifications'])) {
                $after(fn () => Mailer::loginAlert((string)$user['email'], $user['first_name']));
            }
            return ['success' => true, 'user' => $user, 'token' => $token];
        });
    }

    public function handleVerifyEmail(array $data, $msg, ?string $corrId): void
    {
        if (empty($data['token'])) {
            $this->reject($msg, $corrId, 'response.auth.verify', 'Verification token is required');
            return;
        }
        $this->relay($msg, $corrId, 'bridge.auth.verify', ['token' => $data['token']], 'response.auth.verify', 'Verification failed');
    }

    // Changes the password of the logged-in user (email comes from the session).
    public function handleResetPassword(array $data, $msg, ?string $corrId): void
    {
        $this->handle($msg, $corrId, 'response.auth.resetPassword', 'Reset failed', function (MessageBus $mq, callable $after) use ($data, $corrId) {
            if (empty($data['email']) || empty($data['oldPassword']) || empty($data['newPassword'])) return self::fail('All fields are required');
            if (strlen((string)$data['newPassword']) < 8) return self::fail('Password must be at least 8 characters');

            $result = $mq->publishAndWait('bridge.auth.login', ['email' => $data['email']], (string)$corrId);
            $user = $result['user'] ?? null;
            if (!$user) return self::fail('User not found');
            if (!password_verify((string)$data['oldPassword'], (string)$user['password_hash'])) return self::fail('Old password is incorrect');

            $reset = $mq->publishAndWait('bridge.auth.resetPassword', [
                'email'         => $data['email'],
                'password_hash' => $this->enc->hashPassword((string)$data['newPassword']),
            ], $corrId . '_reset');
            if (!$reset || empty($reset['success'])) return self::fail($reset['error'] ?? 'Reset failed');

            $firstName = $this->dec((string)($user['first_name'] ?? '')) ?: 'there';
            $after(fn () => Mailer::passwordReset((string)$data['email'], $firstName));
            return ['success' => true, 'message' => 'Password updated successfully'];
        });
    }

    // Emails a single-use reset link. Answers success before looking the account up, so neither
    // the reply nor its timing reveals whether an account exists.
    public function handleForgotPassword(array $data, $msg, ?string $corrId): void
    {
        $email = (string)($data['email'] ?? '');
        if ($email === '') {
            $this->reject($msg, $corrId, 'response.auth.forgotPassword', 'Email is required');
            return;
        }
        $this->handle($msg, $corrId, 'response.auth.forgotPassword', '', function (MessageBus $mq, callable $after) use ($email, $corrId) {
            $after(function () use ($mq, $email, $corrId) {
                $user = $mq->publishAndWait('bridge.auth.login', ['email' => $email], (string)$corrId)['user'] ?? null;
                if (!$user) return;
                $token = SessionToken::issue(SessionToken::TYPE_RESET, [
                    'email' => $email,
                    'pv'    => $this->passwordVersion((string)$user['password_hash']),
                ], SessionToken::RESET_TTL);
                $firstName = $this->dec((string)($user['first_name'] ?? '')) ?: 'there';
                Mailer::resetPasswordLink($email, $firstName, $this->appUrl() . '/reset-password?token=' . rawurlencode($token));
            });
            return ['success' => true];
        });
    }

    // Sets a new password from a reset link. Links are single-use: they carry a fingerprint of the
    // password they were issued against and stop working once it changes.
    public function handleSetNewPassword(array $data, $msg, ?string $corrId): void
    {
        $this->handle($msg, $corrId, 'response.auth.setNewPassword', 'Reset failed', function (MessageBus $mq, callable $after) use ($data, $corrId) {
            $newPassword = (string)($data['newPassword'] ?? '');
            if (empty($data['token']) || $newPassword === '') return self::fail('Token and password are required');
            if (strlen($newPassword) < 8) return self::fail('Password must be at least 8 characters');

            $claims = SessionToken::verify((string)$data['token'], SessionToken::TYPE_RESET);
            if ($claims === null) return self::fail('Invalid or expired link. Please request a new one.');
            $email = (string)$claims['email'];

            $current = $mq->publishAndWait('bridge.auth.login', ['email' => $email], $corrId . '_check');
            $currentHash = (string)($current['user']['password_hash'] ?? '');
            if ($currentHash === '' || !hash_equals($this->passwordVersion($currentHash), (string)($claims['pv'] ?? ''))) {
                return self::fail('This reset link has already been used. Please request a new one.');
            }

            $result = $mq->publishAndWait('bridge.auth.resetPassword', [
                'email'              => $email,
                'password_hash'      => $this->enc->hashPassword($newPassword),
                'new_password_plain' => $newPassword,
            ], $corrId . '_reset');
            if (!$result || empty($result['success'])) return self::fail($result['error'] ?? 'Could not update password');

            $firstName = $this->dec((string)($current['user']['first_name'] ?? '')) ?: 'there';
            $after(fn () => Mailer::passwordReset($email, $firstName));
            return ['success' => true];
        });
    }

    // Answers success before doing anything, so accounts cannot be enumerated.
    public function handleResendVerification(array $data, $msg, ?string $corrId): void
    {
        $email = (string)($data['email'] ?? '');
        $this->handle($msg, $corrId, 'response.auth.resendVerification', '', function (MessageBus $mq, callable $after) use ($email, $corrId) {
            if ($email !== '') {
                $after(function () use ($mq, $email, $corrId) {
                    $result = $mq->publishAndWait('bridge.auth.refreshVerification', ['email' => $email], (string)$corrId);
                    if (empty($result['success'])) return;
                    Mailer::verifyEmail($email, $this->dec((string)($result['first_name'] ?? '')),
                        $this->appUrl() . '/verify-email?token=' . $result['verification_token']);
                });
            }
            return ['success' => true];
        });
    }

    // ── Account ─────────────────────────────────────────────────────────────

    public function handleProfileUpdate(array $data, $msg, ?string $corrId): void
    {
        $payload = [
            'user_id'    => $data['user_id'],
            'first_name' => $this->enc((string)($data['first_name'] ?? '')),
            'last_name'  => $this->enc((string)($data['last_name']  ?? '')),
            'phone'      => $this->enc((string)($data['phone']      ?? '')),
            'address'    => $this->enc((string)($data['address']    ?? '')),
        ];
        if (array_key_exists('login_notifications', $data)) {
            $payload['login_notifications'] = $data['login_notifications'] ? 1 : 0;
        }
        $this->relay($msg, $corrId, 'bridge.profile.update', $payload, 'response.profile.update', 'Could not update profile');
    }

    public function handleAccountDelete(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.account.delete', ['user_id' => $data['user_id']], 'response.account.delete', 'Could not delete account');
    }

    // ── Shelters & dogs ─────────────────────────────────────────────────────

    public function handleSheltersList(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.shelters.list',
            ['search' => $data['search'] ?? null, 'limit' => $data['limit'] ?? 50, 'offset' => $data['offset'] ?? 0],
            'response.shelters.list', 'Could not load shelters');
    }

    public function handleSheltersGet(array $data, $msg, ?string $corrId): void
    {
        if (empty($data['shelter_id'])) {
            $this->reject($msg, $corrId, 'response.shelters.get', 'shelter_id is required');
            return;
        }
        $this->relay($msg, $corrId, 'bridge.shelters.get', ['shelter_id' => $data['shelter_id']], 'response.shelters.get', 'Could not load shelter');
    }

    public function handleApiKeyGet(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.api.key.get', ['shelter_id' => $data['shelter_id'] ?? null], 'response.api.key.get', 'Could not load API key');
    }

    public function handleApiKeyRegenerate(array $data, $msg, ?string $corrId): void
    {
        $this->handle($msg, $corrId, 'response.api.key.regenerate', 'Could not regenerate key', function (MessageBus $mq) use ($data, $corrId) {
            $newKey = bin2hex(random_bytes(32));
            $result = $mq->publishAndWait('bridge.api.key.regenerate', ['shelter_id' => $data['shelter_id'] ?? null, 'new_key' => $newKey], (string)$corrId);
            if (!empty($result['success'])) $result['api_key'] = $newKey;
            return $result;
        });
    }

    public function handleApiLogs(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.api.logs',
            ['shelter_id' => $data['shelter_id'] ?? null, 'limit' => $data['limit'] ?? 50, 'offset' => $data['offset'] ?? 0],
            'response.api.logs', 'Could not load logs');
    }

    public function handleApiDogUpsert(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.api.dog.upsert', $data, 'response.api.dog.upsert', 'Could not update dog');
    }

    public function handleDogsList(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.dogs.list', [
            'status'       => $data['status']       ?? 'available',
            'breed'        => $data['breed']        ?? null,
            'size'         => $data['size']         ?? null,
            'energy_level' => $data['energy_level'] ?? null,
            'shelter_id'   => $data['shelter_id']   ?? null,
            'max_age'      => $data['max_age']      ?? null,
            'limit'        => $data['limit']        ?? 20,
            'offset'       => $data['offset']       ?? 0,
        ], 'response.dogs.list', 'Could not load dogs');
    }

    public function handleDogsGet(array $data, $msg, ?string $corrId): void
    {
        if (($data['dog_id'] ?? null) === null || $data['dog_id'] === '') {
            $this->reject($msg, $corrId, 'response.dogs.get', 'dog_id is required');
            return;
        }
        $this->relay($msg, $corrId, 'bridge.dogs.get', ['dog_id' => $data['dog_id']], 'response.dogs.get', 'Could not load dog');
    }

    // ── Applications & adoptions ────────────────────────────────────────────

    public function handleApplicationSubmit(array $data, $msg, ?string $corrId): void
    {
        $this->handle($msg, $corrId, 'response.application.submit', 'Could not submit application', function (MessageBus $mq, callable $after) use ($data, $corrId) {
            if (empty($data['dog_id'])) return self::fail('dog_id is required');
            $result = $mq->publishAndWait('bridge.application.submit', [
                'user_id' => $data['user_id'], 'dog_id' => $data['dog_id'],
                'full_name' => $this->enc((string)($data['full_name'] ?? '')),
                'address'   => $this->enc((string)($data['address'] ?? '')),
                'phone'     => $this->enc((string)($data['phone'] ?? '')),
                'housing_type' => $data['housing_type'] ?? null, 'has_yard' => $data['has_yard'] ?? false,
                'has_other_pets' => $data['has_other_pets'] ?? false, 'other_pets_description' => $data['other_pets_description'] ?? null,
                'has_children' => $data['has_children'] ?? false, 'children_ages' => $data['children_ages'] ?? null,
                'prior_pet_experience' => $data['prior_pet_experience'] ?? null,
                'reason_for_adopting' => $data['reason_for_adopting'] ?? null, 'vet_reference' => $data['vet_reference'] ?? null,
            ], (string)$corrId);
            if (!empty($result['success'])) {
                $after(function () use ($mq, $data) {
                    $mq->publish('notifications', ['event' => 'application_received', 'user_id' => $data['user_id'], 'message' => 'Your adoption application has been received.']);
                    Mailer::applicationReceived((string)$data['email'], (string)($data['first_name'] ?? ''), (string)($data['dog_name'] ?? 'your chosen dog'));
                });
            }
            return $result;
        });
    }

    public function handleApplicationStatus(array $data, $msg, ?string $corrId): void
    {
        $this->handle($msg, $corrId, 'response.application.status', 'Could not fetch status', function (MessageBus $mq) use ($data, $corrId) {
            $result = $mq->publishAndWait('bridge.application.status', ['application_id' => $data['application_id'] ?? null, 'user_id' => $data['user_id']], (string)$corrId);
            if (isset($result['application']['full_name'])) {
                $result['application']['full_name'] = $this->dec((string)$result['application']['full_name']);
            }
            return $result;
        });
    }

    public function handleApplicationList(array $data, $msg, ?string $corrId): void
    {
        $this->handle($msg, $corrId, 'response.application.list', 'Could not fetch applications', function (MessageBus $mq) use ($data, $corrId) {
            $result = $mq->publishAndWait('bridge.application.list',
                ['user_id' => $data['user_id'] ?? null, 'status' => $data['status'] ?? null, 'shelter_id' => $data['shelter_id'] ?? null], (string)$corrId);
            foreach ($result['applications'] ?? [] as $i => $app) {
                foreach (['full_name', 'phone', 'first_name', 'last_name'] as $field) {
                    $result['applications'][$i][$field] = $this->dec((string)($app[$field] ?? ''));
                }
            }
            return $result;
        });
    }

    public function handleApplicationApprove(array $data, $msg, ?string $corrId): void
    {
        $this->decideApplication($data, $msg, $corrId, 'approve');
    }

    public function handleApplicationReject(array $data, $msg, ?string $corrId): void
    {
        $this->decideApplication($data, $msg, $corrId, 'reject');
    }

    private function decideApplication(array $data, $msg, ?string $corrId, string $decision): void
    {
        $this->handle($msg, $corrId, 'response.application.decision', "Could not {$decision}", function (MessageBus $mq, callable $after) use ($data, $corrId, $decision) {
            if (empty($data['application_id'])) return self::fail('application_id is required');
            $result = $mq->publishAndWait("bridge.application.{$decision}", [
                'application_id' => $data['application_id'], 'reviewed_by' => $data['reviewed_by'], 'reviewer_notes' => $data['reviewer_notes'] ?? null,
            ], (string)$corrId);
            if (!empty($result['success']) && isset($result['user_id'])) {
                $after(function () use ($mq, $result, $decision) {
                    $approved = $decision === 'approve';
                    $mq->publish('notifications', [
                        'event'   => $approved ? 'application_approved' : 'application_rejected',
                        'user_id' => $result['user_id'],
                        'message' => $approved ? 'Your adoption application has been approved.' : 'Your adoption application was not successful.',
                    ]);
                    // first_name is stored encrypted; the old code emailed the ciphertext.
                    $firstName = $this->dec((string)($result['first_name'] ?? ''));
                    $to        = (string)($result['email'] ?? '');
                    $dogName   = (string)($result['dog_name'] ?? 'your chosen dog');
                    $approved ? Mailer::applicationApproved($to, $firstName, $dogName) : Mailer::applicationRejected($to, $firstName, $dogName);
                });
            }
            return $result;
        });
    }

    public function handleAdoptionsList(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.adoptions.list', ['user_id' => $data['user_id']], 'response.adoptions.list', 'Could not load adoptions');
    }

    public function handleAdoptionsGet(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.adoptions.get', ['adoption_id' => $data['adoption_id'] ?? null, 'user_id' => $data['user_id']], 'response.adoptions.get', 'Could not load adoption');
    }

    public function handleAdoptionsFinalize(array $data, $msg, ?string $corrId): void
    {
        $this->handle($msg, $corrId, 'response.adoptions.finalize', 'Could not finalize adoption', function (MessageBus $mq, callable $after) use ($data, $corrId) {
            if (empty($data['application_id'])) return self::fail('application_id is required');
            $result = $mq->publishAndWait('bridge.adoptions.finalize',
                ['application_id' => $data['application_id'], 'finalized_by' => $data['finalized_by'], 'notes' => $data['notes'] ?? null], (string)$corrId);
            if (!empty($result['success']) && isset($result['user_id'])) {
                $after(function () use ($mq, $result) {
                    $mq->publish('notifications', ['event' => 'adoption_finalized', 'user_id' => $result['user_id'], 'message' => 'Your adoption is now complete!']);
                    Mailer::adoptionComplete((string)($result['email'] ?? ''), $this->dec((string)($result['first_name'] ?? '')), (string)($result['dog_name'] ?? 'your dog'));
                });
            }
            return $result;
        });
    }

    // ── Quiz & journal ──────────────────────────────────────────────────────

    public function handleQuizQuestions(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.quiz.questions', [], 'response.quiz.questions', 'Could not load quiz');
    }

    public function handleQuiz(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.quiz.submit', ['user_id' => $data['user_id'], 'answers' => $data['answers'] ?? []], 'response.quiz.result', 'Quiz failed');
    }

    public function handleQuizResults(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.quiz.results', ['user_id' => $data['user_id']], 'response.quiz.results', 'Could not load results');
    }

    public function handleAdoptionLogCreate(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.adoption.log.create', [
            'user_id' => $data['user_id'], 'dog_id' => $data['dog_id'] ?? null, 'log_type' => $data['log_type'] ?? 'general',
            'title' => $data['title'] ?? '', 'notes' => $data['notes'] ?? '', 'log_date' => $data['log_date'] ?? date('Y-m-d'),
        ], 'response.adoption.log.create', 'Could not save log');
    }

    public function handleAdoptionLogList(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.adoption.log.list',
            ['user_id' => $data['user_id'], 'dog_id' => $data['dog_id'] ?? null, 'log_type' => $data['log_type'] ?? null],
            'response.adoption.log.list', 'Could not load logs');
    }

    public function handleAdoptionLogDelete(array $data, $msg, ?string $corrId): void
    {
        if (empty($data['log_id'])) {
            $this->reject($msg, $corrId, 'response.adoption.log.delete', 'log_id is required');
            return;
        }
        $this->relay($msg, $corrId, 'bridge.adoption.log.delete', ['log_id' => $data['log_id'], 'user_id' => $data['user_id']], 'response.adoption.log.delete', 'Could not delete log');
    }

    // ── Fostering, parks, content ───────────────────────────────────────────

    public function handleFosterApply(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.foster.apply', [
            'user_id' => $data['user_id'], 'dog_id' => $data['dog_id'] ?? null,
            'sponsorship_amount' => $data['sponsorship_amount'] ?? 0, 'start_date' => $data['start_date'] ?? date('Y-m-d'),
        ], 'response.foster.apply', 'Foster failed');
    }

    public function handleFosterList(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.foster.list', ['user_id' => $data['user_id']], 'response.foster.list', 'Could not load sponsorships');
    }

    public function handleFosterCancel(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.foster.cancel', ['foster_id' => $data['foster_id'] ?? null, 'user_id' => $data['user_id']], 'response.foster.cancel', 'Could not cancel sponsorship');
    }

    public function handleParksList(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.parks.list', [
            'shelter_id' => $data['shelter_id'] ?? null, 'lat' => $data['lat'] ?? null, 'lng' => $data['lng'] ?? null, 'radius_km' => $data['radius_km'] ?? 10,
        ], 'response.parks.list', 'Could not load parks');
    }

    public function handleResourcesList(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.resources.list', [
            'topic' => $data['topic'] ?? null, 'type' => $data['type'] ?? null, 'search' => $data['search'] ?? null,
            'limit' => $data['limit'] ?? 20, 'offset' => $data['offset'] ?? 0,
        ], 'response.resources.list', 'Could not load resources');
    }

    public function handleResourcesGet(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.resources.get', ['resource_id' => $data['resource_id'] ?? null], 'response.resources.get', 'Could not load resource');
    }

    // Admins also receive pending stories so they can review them (flag set by AccessPolicy).
    public function handleStoriesList(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.stories.list', [
            'limit' => $data['limit'] ?? 10, 'offset' => $data['offset'] ?? 0, 'include_pending' => !empty($data['_viewer_is_admin']),
        ], 'response.stories.list', 'Could not load stories');
    }

    public function handleStoriesSubmit(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.stories.submit', [
            'user_id' => $data['user_id'], 'dog_id' => $data['dog_id'] ?? null, 'title' => $data['title'] ?? '',
            'story' => $data['story'] ?? '', 'photo_url' => $data['photo_url'] ?? null,
        ], 'response.stories.submit', 'Could not submit story');
    }

    public function handleStoriesApprove(array $data, $msg, ?string $corrId): void
    {
        if (empty($data['story_id'])) {
            $this->reject($msg, $corrId, 'response.stories.approve', 'story_id is required');
            return;
        }
        $this->relay($msg, $corrId, 'bridge.stories.approve', ['story_id' => $data['story_id'], 'approved_by' => $data['approved_by']], 'response.stories.approve', 'Could not approve story');
    }

    public function handleBadgesList(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.badges.list', [], 'response.badges.list', 'Could not load badges');
    }

    public function handleBadgesMine(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.badges.mine', ['user_id' => $data['user_id']], 'response.badges.mine', 'Could not load badges');
    }

    // ── Messaging, meet & greets, notifications, saved dogs ─────────────────

    public function handleEnquiry(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.enquiry.send', [
            'user_id' => $data['user_id'], 'dog_id' => $data['dog_id'] ?? null, 'shelter_id' => $data['shelter_id'] ?? null, 'message' => $data['message'] ?? '',
        ], 'response.enquiry.reply', 'Could not send message');
    }

    public function handleChatStart(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.chat.start',
            ['user_id' => $data['user_id'], 'dog_id' => $data['dog_id'] ?? null, 'shelter_id' => $data['shelter_id'] ?? null],
            'response.chat.start', 'Could not start chat');
    }

    public function handleChatMessage(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.chat.message',
            ['session_id' => $data['session_id'] ?? null, 'sender_id' => $data['sender_id'], 'message' => $data['message'] ?? ''],
            'response.chat.message', 'Could not send message');
    }

    public function handleChatHistory(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.chat.history', ['session_id' => $data['session_id'] ?? null, 'user_id' => $data['user_id']], 'response.chat.history', 'Could not load chat');
    }

    public function handleChatSessions(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.chat.sessions', ['user_id' => $data['user_id']], 'response.chat.sessions', 'Could not load sessions');
    }

    public function handleMeetGreetSchedule(array $data, $msg, ?string $corrId): void
    {
        $this->handle($msg, $corrId, 'response.meetgreet.schedule', 'Could not schedule meeting', function (MessageBus $mq, callable $after) use ($data, $corrId) {
            $date = (string)($data['scheduled_date'] ?? '');
            $time = (string)($data['scheduled_time'] ?? '');
            $result = $mq->publishAndWait('bridge.meetgreet.schedule', [
                'user_id' => $data['user_id'], 'dog_id' => $data['dog_id'] ?? null, 'shelter_id' => $data['shelter_id'] ?? null,
                'scheduled_date' => $date, 'scheduled_time' => $time, 'video_link' => $data['video_link'] ?? null,
            ], (string)$corrId);
            if (!empty($result['success'])) {
                $after(function () use ($mq, $data, $date, $time) {
                    $mq->publish('notifications', ['event' => 'meetgreet_scheduled', 'user_id' => $data['user_id'], 'message' => "Your meet & greet is confirmed for {$date} at {$time}."]);
                    Mailer::meetGreetConfirmed((string)$data['email'], (string)($data['first_name'] ?? ''), (string)($data['dog_name'] ?? 'your chosen dog'), $date, $time);
                });
            }
            return $result;
        });
    }

    public function handleMeetGreetList(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.meetgreet.list', ['user_id' => $data['user_id']], 'response.meetgreet.list', 'Could not load meetings');
    }

    public function handleMeetGreetCancel(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.meetgreet.cancel', ['session_id' => $data['session_id'] ?? null, 'user_id' => $data['user_id']], 'response.meetgreet.cancel', 'Could not cancel meeting');
    }

    public function handleNotificationsList(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.notifications.list', ['user_id' => $data['user_id'], 'unread' => $data['unread'] ?? false], 'response.notifications.list', 'Could not load notifications');
    }

    public function handleNotificationsRead(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.notifications.read', ['user_id' => $data['user_id'], 'notification_id' => $data['notification_id'] ?? null], 'response.notifications.read', 'Could not mark as read');
    }

    public function handleSavedDogsList(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.saved_dogs.list', ['user_id' => $data['user_id']], 'response.saved_dogs.list', 'Could not load saved dogs');
    }

    public function handleSavedDogsAdd(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.saved_dogs.add', ['user_id' => $data['user_id'], 'dog_id' => $data['dog_id'] ?? null], 'response.saved_dogs.add', 'Could not save dog');
    }

    public function handleSavedDogsRemove(array $data, $msg, ?string $corrId): void
    {
        $this->relay($msg, $corrId, 'bridge.saved_dogs.remove', ['user_id' => $data['user_id'], 'dog_id' => $data['dog_id'] ?? null], 'response.saved_dogs.remove', 'Could not remove saved dog');
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    // Base URL for links in emails. Comes from server config, never from the request: a
    // client-supplied URL would let an attacker send real reset emails that leak tokens to their site.
    private function appUrl(): string
    {
        return rtrim((string)($_ENV['APP_URL'] ?? 'https://canineconnections.org'), '/');
    }

    // Short fingerprint of the stored password hash; embedded in reset links to make them single-use.
    private function passwordVersion(string $passwordHash): string
    {
        return substr(hash('sha256', $passwordHash), 0, 16);
    }

    // Personal fields are stored encrypted; empty values stay empty.
    private function enc(string $value): string
    {
        return $value !== '' ? $this->enc->encrypt($value) : '';
    }

    private function dec(string $value): string
    {
        return $value !== '' ? $this->enc->decrypt($value) : '';
    }
}
