<?php declare(strict_types=1);

namespace App\Config;

final class Config
{
    public static function load(): array
    {
        return [
            'env' => 'dev',
            'debug' => true,
            'log_path' => __DIR__ . '/../../storage/logs/app.log',
        ];
    }
}
