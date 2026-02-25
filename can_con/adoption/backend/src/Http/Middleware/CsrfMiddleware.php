<?php declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Request;
use App\Security\Csrf;

final class CsrfMiddleware
{
    public function handle(Request $req): Request
    {
        if ($req->method === 'POST' || $req->method === 'PATCH' || $req->method === 'DELETE') {
            $token = $req->body['_csrf'] ?? null;
            if (!Csrf::verify(is_string($token) ? $token : null)) {
                throw new \RuntimeException('forbidden');
            }
        }
        return $req;
    }
}
