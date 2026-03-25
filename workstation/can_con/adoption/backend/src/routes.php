<?php declare(strict_types=1);

use App\Http\Router;

return function (Router $r): void {
    $r->get('/health', \App\Controllers\HealthController::class, 'index');
    $r->post('/auth/login', \App\Controllers\AuthController::class, 'login');

    $r->get('/admin/overview', \App\Controllers\AdminController::class, 'overview', ['admin']);
    $r->get('/admin/applications', \App\Controllers\ApplicationsAdminController::class, 'list', ['admin']);
    $r->patch('/admin/applications/{id}/approve', \App\Controllers\ApplicationsAdminController::class, 'approve', ['admin']);
    $r->patch('/admin/applications/{id}/reject', \App\Controllers\ApplicationsAdminController::class, 'reject', ['admin']);

    $r->post('/applications', \App\Controllers\ApplicationsAdminController::class, 'submit');
};
