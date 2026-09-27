<?php declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Request;
use App\Util\Logger;

final class DebugMiddleware
{
    public function __construct(private Logger $logger) {}

    public function handle(Request $req): Request
    {
        $this->logger->debug('Incoming request', [
            'method' => $req->method,
            'path'   => $req->path
        ]);

        return $req;
    }
}

