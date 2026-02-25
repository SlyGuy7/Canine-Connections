<?php declare(strict_types=1);

namespace App\Bootstrap;

use App\Http\Request;
use App\Http\Response;
use App\Http\Router;

final class App
{
    private Container $container;
    private Router $router;

    private function __construct(Container $container, Router $router)
    {
        $this->container = $container;
        $this->router = $router;
    }

    public static function create(): self
    {
        $container = new Container();

        $router = $container->get(Router::class);

        if (!$router instanceof Router) {
            throw new \RuntimeException('Router failed to initialize');
        }

        self::routes($router);

        return new self($container, $router);
    }

    public function run(): void
    {
        try {
            $request = Request::capture();
            $response = $this->router->dispatch($request);
            $response->send();
        } catch (\RuntimeException $e) {
            Response::html('<h1>404 Not Found</h1>', 404)->send();
        } catch (\Throwable $e) {
            Response::html('<h1>500 Internal Server Error</h1>', 500)->send();
        }
    }

    private static function routes(Router $r): void
    {
        // Default route → Admin Login
        $r->get('/', \App\Controllers\AdminController::class, 'login');

        // Health endpoint
        $r->get('/health', \App\Controllers\HealthController::class, 'index');

        // Admin login
        $r->get('/admin/login', \App\Controllers\AdminController::class, 'login');
        $r->post('/admin/login', \App\Controllers\AdminController::class, 'authenticate');

        // Admin dashboard
	$r->get('/admin/dashboard', \App\Controllers\AdminController::class, 'dashboard');
	$r->post('/applications', \App\Controllers\ApiApplicationsController::class, 'store');

	//rabbitmq
	$r->get('/admin/rabbit-test', \App\Controllers\RabbitDemoController::class, 'index');
    }
} 
