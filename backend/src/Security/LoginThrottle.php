<?php declare(strict_types=1);

namespace App\Security;

// Counts failed logins per key (client IP, account email) in small files so the count is shared
// by the forked worker processes. After MAX_ATTEMPTS failures a key is locked for WINDOW seconds.
//
// The IP comes from the browser (clientIp) and can be spoofed, which is why logins are also
// throttled per account: rotating fake IPs does not bypass the account limit.
final class LoginThrottle
{
    public const MAX_ATTEMPTS = 5;
    public const WINDOW       = 3600;

    public function __construct(private string $dir = '/tmp')
    {
    }

    // Unix time the lock on $key ends, or null when $key is not locked.
    public function lockedUntil(string $key): ?int
    {
        [$attempts, $since] = $this->read($key);
        if ($attempts < self::MAX_ATTEMPTS) {
            return null;
        }
        $until = $since + self::WINDOW;
        return $until > time() ? $until : null;
    }

    // Records a failure and returns the number of failures in the current window.
    public function fail(string $key): int
    {
        [$attempts, $since] = $this->read($key);
        if ($since + self::WINDOW <= time()) {
            $attempts = 0;
        }
        $attempts++;
        @file_put_contents($this->path($key), (string)$attempts, LOCK_EX);
        return $attempts;
    }

    public function clear(string $key): void
    {
        @unlink($this->path($key));
    }

    // [attempt count, time of last failure]; a missing file means no failures.
    private function read(string $key): array
    {
        $path = $this->path($key);
        if (!is_file($path)) {
            return [0, 0];
        }
        clearstatcache(true, $path);
        return [(int)@file_get_contents($path), (int)@filemtime($path)];
    }

    private function path(string $key): string
    {
        return rtrim($this->dir, '/\\') . '/canine-attempts-' . hash('sha256', $key);
    }
}
