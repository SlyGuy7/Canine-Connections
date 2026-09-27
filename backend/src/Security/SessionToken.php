<?php declare(strict_types=1);

namespace App\Security;

// Signed, expiring tokens (HMAC-SHA256 over a JSON payload, keyed by APP_KEY).
// Used for login sessions and password-reset links. Every token carries a "typ" claim so a
// reset link can never be replayed as a session and vice versa.
//
// Format: base64url(json payload) . "." . base64url(signature)
final class SessionToken
{
    public const TYPE_SESSION = 'session';
    public const TYPE_RESET   = 'reset';

    public const SESSION_TTL = 7 * 24 * 3600;
    public const RESET_TTL   = 3600;

    // Creates a token of the given type carrying $claims, valid for $ttl seconds.
    public static function issue(string $type, array $claims, int $ttl): string
    {
        $payload = ['typ' => $type, 'exp' => time() + $ttl] + $claims;
        $body    = self::b64(json_encode($payload, JSON_UNESCAPED_SLASHES));
        return $body . '.' . self::b64(hash_hmac('sha256', $body, self::key(), true));
    }

    // Returns the claims when the signature is valid, the type matches and it has not expired; otherwise null.
    public static function verify(?string $token, string $type): ?array
    {
        if (!is_string($token) || substr_count($token, '.') !== 1) {
            return null;
        }
        [$body, $sig] = explode('.', $token);
        $expected = self::b64(hash_hmac('sha256', $body, self::key(), true));
        if (!hash_equals($expected, $sig)) {
            return null;
        }
        $claims = json_decode((string)self::unb64($body), true);
        if (!is_array($claims) || ($claims['typ'] ?? null) !== $type || (int)($claims['exp'] ?? 0) < time()) {
            return null;
        }
        return $claims;
    }

    // Signing key derived from APP_KEY (which must be identical on every node running the workers).
    // There is deliberately no fallback: a guessable default would let anyone forge sessions and reset links.
    // Deriving a separate key keeps token signing independent of APP_KEY's use for data encryption.
    private static function key(): string
    {
        $appKey = (string)($_ENV['APP_KEY'] ?? getenv('APP_KEY') ?: '');
        if (strlen($appKey) < 16) {
            throw new \RuntimeException('APP_KEY is missing or too short in .env — must be at least 16 characters');
        }
        return hash_hmac('sha256', 'canine-connections/signed-tokens/v1', $appKey, true);
    }

    private static function b64(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }

    private static function unb64(string $text): string|false
    {
        return base64_decode(strtr($text, '-_', '+/'), true);
    }
}
