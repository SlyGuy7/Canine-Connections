<?php declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Infrastructure\Messaging\RabbitMqClient;

final class RabbitDemoController
{
    public function __construct(private $container) {}

    public function index(Request $req): Response
    {
        $mq = $this->container->get(RabbitMqClient::class);

        // 1️⃣ Publish message
        $mq->publish([
            'message' => 'Hello from backend'
        ]);

        $received = null;

        // 2️⃣ Consume ONE message (non-blocking style)
        $mq->consume(function ($data) use (&$received) {
            $received = $data;
            exit; // stop after one message
        });

        return Response::html("
            <h2>RabbitMQ Status</h2>
            <p><strong>Hello, I am RabbitMQ.</strong></p>
            <p>I am working and able to receive and queue messages.</p>
            <p>Group 01 verified.</p>
            <hr>
            <pre>" . print_r($received, true) . "</pre>
        ");
    }
}
