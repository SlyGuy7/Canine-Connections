<?php declare(strict_types=1);

namespace App\Services;

use App\Util\Logger;

final class AdminAuthService
{
    public function __construct(private array $adminCfg, private Logger $logger) {}

    public function login(string $email, string $password): bool
    {
        $ok = hash_equals((string)$this->adminCfg['email'], $email)
            && hash_equals((string)$this->adminCfg['password'], $password);

        if ($ok) {
            $_SESSION['role'] = 'admin';
            $_SESSION['admin_email'] = $email;
            $this->logger->audit('admin_login', ['email' => $email]);
            return true;
        }

        $this->logger->audit('admin_login_failed', ['email' => $email]);
        return false;
    }

    public function logout(): void
    {
        $email = $_SESSION['admin_email'] ?? null;
        $this->logger->audit('admin_logout', ['email' => $email]);
        unset($_SESSION['role'], $_SESSION['admin_email']);
    }
}
