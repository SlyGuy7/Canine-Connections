<?php declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;

final class AuthController
{
    public function __construct(private $container) {}

    public function login(Request $req): Response
    {
        $email = $req->body['email'] ?? '';
        $password = $req->body['password'] ?? '';

        if ($email === 'group01@local' && $password === 'group01') {
            return Response::json([
                'success' => true,
                'message' => 'Login successful'
            ]);
        }

        return Response::json([
            'success' => false,
            'message' => 'Invalid credentials'
        ], 401);
    }
}
