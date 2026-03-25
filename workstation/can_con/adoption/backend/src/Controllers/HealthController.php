<?php declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;

final class HealthController
{
    public function index(Request $req): Response
    {
        return Response::json([
            'ok' => true,
            'service' => 'adoption-backend',
            'timestamp' => date('c')
        ]);
    }
}

