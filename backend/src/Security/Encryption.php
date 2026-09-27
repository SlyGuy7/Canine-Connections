<?php declare(strict_types=1);

namespace App\Security;

final class Encryption
{
    private const CIPHER = 'AES-256-CBC';
    private string $key;

    public function __construct()
    {
        $key = $_ENV['APP_KEY'] ?? getenv('APP_KEY') ?? null;

        if (!$key || strlen($key) < 16) {
            throw new \RuntimeException(
                'APP_KEY is missing or too short in .env — must be at least 16 characters'
            );
        }

        $this->key = substr(str_pad($key, 32, '0'), 0, 32);
    }

    public function encrypt(string $value): string
    {
        $iv        = random_bytes(openssl_cipher_iv_length(self::CIPHER));
        $encrypted = openssl_encrypt($value, self::CIPHER, $this->key, 0, $iv);

        if ($encrypted === false) {
            throw new \RuntimeException('Encryption failed');
        }

        return base64_encode($iv) . '::' . $encrypted;
    }

    public function decrypt(string $value): string
    {
        if (!str_contains($value, '::')) {
            return $value;
        }

        [$iv64, $encrypted] = explode('::', $value, 2);
        $iv = base64_decode($iv64);

        $decrypted = openssl_decrypt($encrypted, self::CIPHER, $this->key, 0, $iv);

        if ($decrypted === false) {
            throw new \RuntimeException('Decryption failed — wrong key or corrupted data');
        }

        return $decrypted;
    }

    public function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    public function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    public function isEncrypted(string $value): bool
    {
        return str_contains($value, '::');
    }
}