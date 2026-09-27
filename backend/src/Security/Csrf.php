<?php declare(strict_types=1);

namespace App\Security;

final class Csrf
{
    public static function token(): string
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        if (!isset($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(16));
        }

        return (string)$_SESSION['csrf'];
    }

    public static function verify(?string $token): bool
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        $expected = $_SESSION['csrf'] ?? null;
        if (!is_string($expected) || !is_string($token)) return false;

        return hash_equals($expected, $token);
    }
}
