<?php declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Services\ApplicationService;

final class ApplicationsAdminController
{
    public function __construct(private ApplicationService $apps) {}

    // JSON list (admin can use it for future React UI)
    public function list(Request $req): Response
    {
        return Response::json(['applications' => $this->apps->list()]);
    }

    // POST approve (used by UI forms)
    public function approve(Request $req): Response
    {
        $id = (string)$req->params['id'];
        $this->apps->approve($id);
        return Response::redirect('/admin/ui');
    }

    // POST reject (used by UI forms)
    public function reject(Request $req): Response
    {
        $id = (string)$req->params['id'];
        $this->apps->reject($id);
        return Response::redirect('/admin/ui');
    }
}
