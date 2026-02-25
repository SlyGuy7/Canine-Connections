<?php declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Request;

final class AdminSessionMiddleware
{
    public function handle(Request $req): Request
    {
        $role = $_SESSION['role'] ?? null;
        if ($role !== 'admin') {
            throw new \RuntimeException('unauthorized');
        }
        return $req;
    }
}
