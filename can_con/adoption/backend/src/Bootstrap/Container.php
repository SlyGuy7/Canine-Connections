<?php declare(strict_types=1);

namespace App\Bootstrap;

use App\Config\Config;
use App\Util\Logger;
use App\Http\Router;
use App\Infrastructure\Mysql\MysqlClient;
use App\Infrastructure\Messaging\RabbitMqClient;

final class Container
{
    private array $services = [];
    private array $config;

    public function __construct()
    {
        $this->config = Config::load();

        // Logger (safe to instantiate immediately)
        $logger = new Logger(
            $this->config['log_path'],
            $this->config['debug']
        );

        $this->services[Logger::class] = $logger;

        // Router (safe)
        $this->services[Router::class] = new Router(
            $this,
            $logger,
            $this->config['debug']
        );

    }

    public function get(string $id)
    {
        //Already created service
        if (isset($this->services[$id])) {
            return $this->services[$id];
        }

        //Lazy load MySQL
        if ($id === MysqlClient::class) {
            return $this->services[$id] = new MysqlClient();
        }

        //Lazy load RabbitMQ
        if ($id === RabbitMqClient::class) {
            return $this->services[$id] = new RabbitMqClient();
        }

        //Controllers (inject container)
        if (class_exists($id)) {
            return new $id($this);
        }

        throw new \RuntimeException("Service not found: {$id}");
    }

    public function config(): array
    {
        return $this->config;
    }

    public function middleware(string $class)
    {
        return new $class(
            $this->services[Logger::class]
        );
    }
}

