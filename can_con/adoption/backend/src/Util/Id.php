<?php declare(strict_types=1);

namespace App\Util;

final class Id
{
    public static function uuid(): string
    {
        return bin2hex(random_bytes(16));
    }
}
