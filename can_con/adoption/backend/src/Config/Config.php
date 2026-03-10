<?php declare(strict_types=1);

namespace App\Config;

final class Config
{
    public static function load(): array
    {
        return [
            'env'      => self::env('APP_ENV',   'dev'),
            'debug'    => self::env('APP_DEBUG',  'true') === 'true',
            'log_path' => __DIR__ . '/../../storage/logs/app.log',

            'rabbitmq' => [
                'host' => self::env('RABBITMQ_HOST', '100.87.19.28'),
                'port' => (int) self::env('RABBITMQ_PORT', '5672'),
                'user' => self::env('RABBITMQ_USER', 'admin'),
                'pass' => self::env('RABBITMQ_PASS', 'REDACTED'),
            ],

            'mysql' => [
                'host'     => self::env('DB_HOST', '100.80.193.50'),
                'port'     => (int) self::env('DB_PORT', '3306'),
                'dbname'   => self::env('DB_NAME', 'adoption_center'),
                'user'     => self::env('DB_USER', 'adoption_user'),
                'password' => self::env('DB_PASS', ''),
            ],
        ];
    }

    public static function loadEnv(string $path): void
    {
        if (!file_exists($path)) {
            throw new \RuntimeException(".env file not found at: {$path}");
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
    
            if (str_starts_with(trim($line), '#')) {
                continue;
            }

            if (!str_contains($line, '=')) {
                continue;
            }

            [$name, $value] = explode('=', $line, 2);

            $name  = trim($name);
            $value = trim($value);

            if (
                (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))
            ) {
                $value = substr($value, 1, -1);
            }

            $upperName = strtoupper($name);

            if (!array_key_exists($upperName, $_ENV)) {
                $_ENV[$upperName] = $value;
                putenv("{$upperName}={$value}");
            }
        }
    }

    private static function env(string $key, string $default = ''): string
    {
        return $_ENV[$key] ?? getenv($key) ?: $default;
    }
}