<?php declare(strict_types=1);

namespace App\Http;

use App\Bootstrap\Container;
use App\Util\Logger;
use App\Http\Middleware\DebugMiddleware;

final class Router
{
    private array $routes = [];

    public function __construct(
        private Container $container,
        private Logger $logger,
        private bool $debug
    ) {}

    public function get(string $path, string $controller, string $method, array $mw = []): void
    {
        $this->routes[] = ['GET', $path, $controller, $method, $mw];
    }

    public function post(string $path, string $controller, string $method, array $mw = []): void
    {
        $this->routes[] = ['POST', $path, $controller, $method, $mw];
    }

    public function patch(string $path, string $controller, string $method, array $mw = []): void
    {
        $this->routes[] = ['PATCH', $path, $controller, $method, $mw];
    }

    public function dispatch(Request $req): Response
    {
        foreach ($this->routes as [$httpMethod, $pattern, $controllerClass, $handler, $mw]) {
            if ($httpMethod !== $req->method) continue;

            $params = $this->match($pattern, $req->path);
            if ($params === null) continue;

            $req2 = $req->withParams($params);

            if ($this->debug) {
                $req2 = (new DebugMiddleware($this->logger))->handle($req2);
            }

            foreach ($mw as $m) {
                $req2 = $this->container->middleware($m)->handle($req2);
            }

            $controller = $this->container->get($controllerClass);
            return $controller->$handler($req2);
        }

        throw new \RuntimeException('not_found');
    }

    private function match(string $pattern, string $path): ?array
    {
        $p = explode('/', trim($pattern, '/'));
        $u = explode('/', trim($path, '/'));

        if (count($p) !== count($u)) return null;

        $params = [];
        foreach ($p as $i => $seg) {
            if (preg_match('/^\{([a-zA-Z0-9_]+)\}$/', $seg, $m)) {
                $params[$m[1]] = $u[$i];
                continue;
            }
            if ($seg !== $u[$i]) return null;
        }
        return $params;
    }
}
