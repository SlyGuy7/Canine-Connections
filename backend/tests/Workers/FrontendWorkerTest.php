<?php declare(strict_types=1);

namespace Tests\Workers;

use App\Security\Encryption;
use App\Security\LoginThrottle;
use App\Security\SessionToken;
use App\Services\Mailer;
use App\Workers\FrontendWorker;
use PHPUnit\Framework\TestCase;
use Tests\Support\FakeBus;

final class FrontendWorkerTest extends TestCase
{
    private FakeBus $bus;
    private string $throttleDir;
    private string $passwordHash;

    protected function setUp(): void
    {
        $_ENV['APP_KEY']     = 'test-app-key-0123456789abcdef';
        $_ENV['APP_URL']     = 'https://canineconnections.org';
        $_ENV['MAIL_DRIVER'] = 'log';
        Mailer::$sent = [];

        $this->throttleDir = sys_get_temp_dir() . '/canine-worker-' . bin2hex(random_bytes(4));
        mkdir($this->throttleDir);

        $this->bus = new FakeBus();
        (new FrontendWorker($this->bus, false, new LoginThrottle($this->throttleDir)))->registerConsumers();

        // A stored account the bridge returns for owner@example.com.
        $this->passwordHash = password_hash('correct-horse', PASSWORD_BCRYPT, ['cost' => 4]);
        $firstName = (new Encryption())->encrypt('Ada');
        $this->bus->respondTo('bridge.auth.login', fn (array $p) => $p['email'] === 'owner@example.com'
            ? ['success' => true, 'user' => [
                'user_id' => 5, 'email' => 'owner@example.com', 'password_hash' => $this->passwordHash,
                'role' => 'adopter', 'first_name' => $firstName, 'last_name' => '', 'phone' => '', 'address' => '',
                'email_verified' => 1, 'login_notifications' => 0,
              ]]
            : ['success' => false, 'user' => null]);
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->throttleDir . '/*') ?: []);
        rmdir($this->throttleDir);
    }

    private function token(int $uid, string $role = 'adopter'): string
    {
        return SessionToken::issue(SessionToken::TYPE_SESSION, ['uid' => $uid, 'role' => $role, 'email' => "u{$uid}@example.com"], 60);
    }

    private function login(string $email, string $password): array
    {
        return $this->bus->deliver('request.auth.login', ['email' => $email, 'password' => $password, 'clientIp' => '203.0.113.9']);
    }

    // ── Access control ──────────────────────────────────────────────────────

    public function testProtectedRequestWithoutTokenNeverReachesTheBridge(): void
    {
        $reply = $this->bus->deliver('request.account.delete', ['user_id' => 5]);

        $this->assertSame('auth_required', $reply['code']);
        $this->assertSame([], $this->bus->requests);
    }

    public function testUserIdForwardedToTheBridgeComesFromTheToken(): void
    {
        $this->bus->deliver('request.saved_dogs.add', ['_token' => $this->token(5), 'user_id' => 99, 'dog_id' => 3]);

        $this->assertSame([['user_id' => 5, 'dog_id' => 3]], $this->bus->requestsTo('bridge.saved_dogs.add'));
    }

    public function testAdopterCannotApproveApplications(): void
    {
        $reply = $this->bus->deliver('request.application.approve', ['_token' => $this->token(5), 'application_id' => 1]);

        $this->assertSame('forbidden', $reply['code']);
        $this->assertSame([], $this->bus->requestsTo('bridge.application.approve'));
    }

    public function testAdminApprovalIsRecordedAgainstTheAdmin(): void
    {
        $this->bus->deliver('request.application.approve', ['_token' => $this->token(2, 'super_admin'), 'application_id' => 1, 'reviewed_by' => 999]);

        $this->assertSame(2, $this->bus->requestsTo('bridge.application.approve')[0]['reviewed_by']);
    }

    public function testAdminsAreAskedForPendingStoriesAndVisitorsAreNot(): void
    {
        $this->bus->deliver('request.stories.list', []);
        $this->bus->deliver('request.stories.list', ['_token' => $this->token(2, 'shelter_admin')]);

        $requests = $this->bus->requestsTo('bridge.stories.list');
        $this->assertFalse($requests[0]['include_pending']);
        $this->assertTrue($requests[1]['include_pending']);
    }

    public function testJournalDeleteIsHandled(): void
    {
        $reply = $this->bus->deliver('request.adoption.log.delete', ['_token' => $this->token(5), 'log_id' => 7]);

        $this->assertTrue($reply['success']);
        $this->assertSame([['log_id' => 7, 'user_id' => 5]], $this->bus->requestsTo('bridge.adoption.log.delete'));
    }

    // ── Login ───────────────────────────────────────────────────────────────

    public function testSuccessfulLoginReturnsAWorkingSessionToken(): void
    {
        $reply = $this->login('owner@example.com', 'correct-horse');

        $this->assertTrue($reply['success']);
        $this->assertArrayNotHasKey('password_hash', $reply['user']);
        $this->assertSame('Ada', $reply['user']['first_name']);
        $claims = SessionToken::verify($reply['token'], SessionToken::TYPE_SESSION);
        $this->assertSame(5, $claims['uid']);
        $this->assertSame('adopter', $claims['role']);
    }

    public function testWrongPasswordAndUnknownEmailGetTheSameMessage(): void
    {
        $wrongPassword = $this->login('owner@example.com', 'nope');
        $unknownEmail  = $this->bus->deliver('request.auth.login', ['email' => 'ghost@example.com', 'password' => 'nope', 'clientIp' => '198.51.100.7']);

        $this->assertSame('Invalid email or password. 4 attempts remaining.', $wrongPassword['error']);
        $this->assertSame($wrongPassword['error'], $unknownEmail['error']);
        $this->assertArrayNotHasKey('token', $wrongPassword);
    }

    public function testLockoutBlocksEvenTheCorrectPassword(): void
    {
        for ($i = 0; $i < LoginThrottle::MAX_ATTEMPTS; $i++) {
            $reply = $this->login('owner@example.com', 'wrong');
        }
        $this->assertArrayHasKey('locked_until', $reply);

        $afterLockout = $this->login('owner@example.com', 'correct-horse');
        $this->assertFalse($afterLockout['success']);
        $this->assertArrayHasKey('locked_until', $afterLockout);
    }

    public function testRotatingTheClaimedIpDoesNotBypassTheAccountLockout(): void
    {
        for ($i = 0; $i < LoginThrottle::MAX_ATTEMPTS; $i++) {
            $this->bus->deliver('request.auth.login', ['email' => 'owner@example.com', 'password' => 'wrong', 'clientIp' => "10.0.0.{$i}"]);
        }

        $reply = $this->bus->deliver('request.auth.login', ['email' => 'owner@example.com', 'password' => 'correct-horse', 'clientIp' => '10.9.9.9']);
        $this->assertArrayHasKey('locked_until', $reply);
    }

    // ── Password reset ──────────────────────────────────────────────────────

    public function testResetLinkUsesServerUrlAndWorksExactlyOnce(): void
    {
        $this->bus->respondTo('bridge.auth.resetPassword', function (array $p) {
            $this->passwordHash = $p['password_hash'];
            return ['success' => true];
        });

        $reply = $this->bus->deliver('request.auth.forgotPassword', ['email' => 'owner@example.com', 'app_url' => 'https://evil.example']);
        $this->assertSame(['success' => true], $reply);

        $this->assertCount(1, Mailer::$sent);
        $this->assertStringNotContainsString('evil.example', Mailer::$sent[0]['body']);
        $this->assertMatchesRegularExpression('#https://canineconnections\.org/reset-password\?token=([\w.%-]+)#', Mailer::$sent[0]['body']);
        preg_match('#reset-password\?token=([\w.%-]+)#', Mailer::$sent[0]['body'], $m);
        $token = rawurldecode($m[1]);

        $first  = $this->bus->deliver('request.auth.setNewPassword', ['token' => $token, 'newPassword' => 'brand-new-pass']);
        $second = $this->bus->deliver('request.auth.setNewPassword', ['token' => $token, 'newPassword' => 'another-pass-1']);

        $this->assertTrue($first['success']);
        $this->assertFalse($second['success']);
        $this->assertStringContainsString('already been used', $second['error']);
    }

    public function testForgotPasswordForUnknownEmailLooksIdenticalAndSendsNothing(): void
    {
        $reply = $this->bus->deliver('request.auth.forgotPassword', ['email' => 'ghost@example.com']);

        $this->assertSame(['success' => true], $reply);
        $this->assertSame([], Mailer::$sent);
    }

    public function testSessionTokenCannotBeUsedAsResetLink(): void
    {
        $reply = $this->bus->deliver('request.auth.setNewPassword', ['token' => $this->token(5), 'newPassword' => 'brand-new-pass']);

        $this->assertFalse($reply['success']);
        $this->assertSame([], $this->bus->requestsTo('bridge.auth.resetPassword'));
    }

    // ── Registration & email ────────────────────────────────────────────────

    public function testRegistrationEncryptsPersonalDataAndEmailsAVerificationLink(): void
    {
        $this->bus->respondTo('bridge.auth.register', fn () => ['success' => true, 'user_id' => 8, 'verification_token' => 'abc123']);

        $reply = $this->bus->deliver('request.auth.register', [
            'email' => 'new@example.com', 'password' => 'long-enough', 'firstName' => '<b>Eve</b>', 'app_url' => 'https://evil.example',
        ]);

        $this->assertTrue($reply['success']);
        $sentToBridge = $this->bus->requestsTo('bridge.auth.register')[0];
        $this->assertNotSame('<b>Eve</b>', $sentToBridge['first_name']);
        $this->assertStringStartsWith('$2y$', $sentToBridge['password_hash']);

        $body = Mailer::$sent[0]['body'];
        $this->assertStringContainsString('https://canineconnections.org/verify-email?token=abc123', $body);
        $this->assertStringContainsString('&lt;b&gt;Eve&lt;/b&gt;', $body);
        $this->assertStringNotContainsString('<b>Eve</b>', $body);
    }

    public function testShortPasswordsAreRejected(): void
    {
        $reply = $this->bus->deliver('request.auth.register', ['email' => 'new@example.com', 'password' => 'short']);

        $this->assertFalse($reply['success']);
        $this->assertSame([], $this->bus->requestsTo('bridge.auth.register'));
    }

    public function testBridgeTimeoutStillAnswersTheBrowser(): void
    {
        $this->bus->respondTo('bridge.dogs.list', fn () => null);

        $reply = $this->bus->deliver('request.dogs.list', []);

        $this->assertSame(['success' => false, 'error' => 'Could not load dogs'], $reply);
    }
}
