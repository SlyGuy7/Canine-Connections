<?php declare(strict_types=1);

namespace App\Util;

final class Logger
{
    public function __construct(
        private string $path,
        private bool $debug = false
    ) {}

    public function debug(string $msg, array $ctx = []): void
    {
        if (!$this->debug) return;
        $this->write('DEBUG', $msg, $ctx);
    }

    private function write(string $level, string $msg, array $ctx): void
    {
        $line = date('c') . " [$level] $msg " . json_encode($ctx) . PHP_EOL;
        file_put_contents($this->path, $line, FILE_APPEND);
    }
}

