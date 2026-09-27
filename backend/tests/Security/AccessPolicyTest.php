<?php declare(strict_types=1);

namespace Tests\Security;

use App\Security\AccessPolicy;
use App\Security\SessionToken;
use PHPUnit\Framework\TestCase;

final class AccessPolicyTest extends TestCase
{
    protected function setUp(): void
    {
        $_ENV['APP_KEY'] = 'test-app-key-0123456789abcdef';
    }

    private function token(int $uid, string $role = 'adopter', string $email = 'user@example.com'): string
    {
        return SessionToken::issue(SessionToken::TYPE_SESSION, ['uid' => $uid, 'role' => $role, 'email' => $email], 60);
    }

    public function testPublicQueueNeedsNoToken(): void
    {
        $result = AccessPolicy::check('request.dogs.list', ['size' => 'small']);

        $this->assertTrue($result['ok']);
        $this->assertSame(['size' => 'small', '_viewer_is_admin' => false], $result['data']);
    }

    public function testViewerAdminFlagComesFromTokenOnly(): void
    {
        $spoofed = AccessPolicy::check('request.stories.list', ['_viewer_is_admin' => true]);
        $adopter = AccessPolicy::check('request.stories.list', ['_token' => $this->token(5)]);
        $admin   = AccessPolicy::check('request.stories.list', ['_token' => $this->token(2, 'super_admin')]);

        $this->assertFalse($spoofed['data']['_viewer_is_admin']);
        $this->assertFalse($adopter['data']['_viewer_is_admin']);
        $this->assertTrue($admin['data']['_viewer_is_admin']);
    }

    public function testTokenIsStrippedFromForwardedData(): void
    {
        $result = AccessPolicy::check('request.dogs.list', ['_token' => 'x', 'size' => 'small']);

        $this->assertArrayNotHasKey('_token', $result['data']);
    }

    public function testUnknownQueueRequiresLogin(): void
    {
        $result = AccessPolicy::check('request.some.new.feature', []);

        $this->assertFalse($result['ok']);
        $this->assertSame('auth_required', $result['code']);
    }

    public function testUserQueueRejectsMissingOrForgedToken(): void
    {
        $this->assertSame('auth_required', AccessPolicy::check('request.account.delete', ['user_id' => 7])['code']);
        $this->assertSame('auth_required', AccessPolicy::check('request.account.delete', ['user_id' => 7, '_token' => 'forged.token'])['code']);
    }

    public function testUserIdComesFromTokenNotPayload(): void
    {
        $result = AccessPolicy::check('request.account.delete', ['_token' => $this->token(5), 'user_id' => 999]);

        $this->assertTrue($result['ok']);
        $this->assertSame(5, $result['data']['user_id']);
    }

    public function testChatSenderIsTheLoggedInUser(): void
    {
        $result = AccessPolicy::check('request.chat.message', ['_token' => $this->token(5), 'sender_id' => 999, 'session_id' => 3]);

        $this->assertSame(5, $result['data']['sender_id']);
        $this->assertSame(3, $result['data']['session_id']);
    }

    public function testEmailComesFromToken(): void
    {
        $result = AccessPolicy::check('request.auth.resetPassword', ['_token' => $this->token(5, 'adopter', 'me@example.com'), 'email' => 'victim@example.com']);

        $this->assertSame('me@example.com', $result['data']['email']);
    }

    public function testAdopterCannotCallAdminQueue(): void
    {
        $result = AccessPolicy::check('request.application.approve', ['_token' => $this->token(5), 'application_id' => 1]);

        $this->assertFalse($result['ok']);
        $this->assertSame('forbidden', $result['code']);
    }

    public function testAdminActionRecordsActingAdmin(): void
    {
        $result = AccessPolicy::check('request.application.approve', ['_token' => $this->token(2, 'super_admin'), 'application_id' => 1, 'reviewed_by' => 999]);

        $this->assertTrue($result['ok']);
        $this->assertSame(2, $result['data']['reviewed_by']);
        $this->assertSame(1, $result['data']['application_id']);
    }

    public function testAdopterApplicationListIsScopedToSelf(): void
    {
        $result = AccessPolicy::check('request.application.list', ['_token' => $this->token(5), 'user_id' => null, 'status' => 'pending']);

        $this->assertSame(5, $result['data']['user_id']);
    }

    public function testAdminMayListAllApplications(): void
    {
        $result = AccessPolicy::check('request.application.list', ['_token' => $this->token(2, 'shelter_admin'), 'status' => 'pending']);

        $this->assertTrue($result['ok']);
        $this->assertArrayNotHasKey('user_id', $result['data']);
    }

    public function testAdminActsAsThemselvesOnUserQueues(): void
    {
        $result = AccessPolicy::check('request.account.delete', ['_token' => $this->token(2, 'super_admin'), 'user_id' => 999]);

        $this->assertSame(2, $result['data']['user_id']);
    }
}
