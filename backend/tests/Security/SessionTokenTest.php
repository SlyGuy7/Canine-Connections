<?php declare(strict_types=1);

namespace Tests\Security;

use App\Security\SessionToken;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class SessionTokenTest extends TestCase
{
    protected function setUp(): void
    {
        $_ENV['APP_KEY'] = 'test-app-key-0123456789abcdef';
    }

    public function testIssuedTokenVerifiesAndReturnsClaims(): void
    {
        $token  = SessionToken::issue(SessionToken::TYPE_SESSION, ['uid' => 42, 'role' => 'adopter'], 60);
        $claims = SessionToken::verify($token, SessionToken::TYPE_SESSION);

        $this->assertSame(42, $claims['uid']);
        $this->assertSame('adopter', $claims['role']);
    }

    public function testTamperedPayloadIsRejected(): void
    {
        $token = SessionToken::issue(SessionToken::TYPE_SESSION, ['uid' => 42, 'role' => 'adopter'], 60);
        [, $sig] = explode('.', $token);
        $forged = rtrim(strtr(base64_encode(json_encode(
            ['uid' => 1, 'role' => 'super_admin', 'typ' => 'session', 'exp' => time() + 60]
        )), '+/', '-_'), '=');

        $this->assertNull(SessionToken::verify($forged . '.' . $sig, SessionToken::TYPE_SESSION));
    }

    public function testTokenSignedWithDifferentKeyIsRejected(): void
    {
        $token = SessionToken::issue(SessionToken::TYPE_SESSION, ['uid' => 42], 60);
        $_ENV['APP_KEY'] = 'another-key-that-is-long-enough';

        $this->assertNull(SessionToken::verify($token, SessionToken::TYPE_SESSION));
    }

    public function testExpiredTokenIsRejected(): void
    {
        $token = SessionToken::issue(SessionToken::TYPE_SESSION, ['uid' => 42], -1);

        $this->assertNull(SessionToken::verify($token, SessionToken::TYPE_SESSION));
    }

    public function testResetTokenCannotBeUsedAsSession(): void
    {
        $token = SessionToken::issue(SessionToken::TYPE_RESET, ['email' => 'a@b.c'], 60);

        $this->assertNull(SessionToken::verify($token, SessionToken::TYPE_SESSION));
        $this->assertNotNull(SessionToken::verify($token, SessionToken::TYPE_RESET));
    }

    public function testClaimsCannotOverrideTypeOrExpiry(): void
    {
        $token  = SessionToken::issue(SessionToken::TYPE_RESET, ['typ' => 'session', 'exp' => PHP_INT_MAX], 60);
        $claims = SessionToken::verify($token, SessionToken::TYPE_RESET);

        $this->assertNotNull($claims);
        $this->assertSame('reset', $claims['typ']);
        $this->assertLessThanOrEqual(time() + 60, $claims['exp']);
    }

    #[DataProvider('malformedTokens')]
    public function testMalformedTokensAreRejected(?string $token): void
    {
        $this->assertNull(SessionToken::verify($token, SessionToken::TYPE_SESSION));
    }

    public static function malformedTokens(): array
    {
        return [[null], [''], ['abc'], ['a.b.c'], ['.'], ['true']];
    }

    public function testMissingAppKeyFailsLoudly(): void
    {
        $_ENV['APP_KEY'] = '';
        putenv('APP_KEY');

        $this->expectException(\RuntimeException::class);
        SessionToken::issue(SessionToken::TYPE_SESSION, ['uid' => 1], 60);
    }
}
