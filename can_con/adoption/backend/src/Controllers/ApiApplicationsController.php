<?php declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Bootstrap\Container;
use App\Infrastructure\Mysql\MysqlClient;
use App\Infrastructure\Messaging\RabbitMqClient;

final class ApiApplicationsController
{
    private Container $container;

    public function __construct(Container $container)
    {
        $this->container = $container;
    }

    public function store(Request $req): Response
    {
        $body = $req->body ?? [];

        if (!isset($body['name'], $body['email'])) {
            return Response::json([
                'error' => 'Invalid payload'
            ], 400);
        }

        $db = $this->container->get(MysqlClient::class)->pdo();
        $mq = $this->container->get(RabbitMqClient::class);

        // Insert into MySQL
        $stmt = $db->prepare(
            "INSERT INTO applications (name,email) VALUES (?,?)"
        );

        $stmt->execute([
            $body['name'],
            $body['email']
        ]);

        // Publish to RabbitMQ
        $mq->publish([
            'type' => 'application_submitted',
            'email' => $body['email']
        ]);

        return Response::json([
            'status' => 'submitted'
        ]);
    }
}

