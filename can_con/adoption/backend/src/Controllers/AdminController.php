<?php declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Infrastructure\Messaging\RabbitMqClient;

final class AdminController
{
    public function __construct(private $container) {}

    public function login(Request $req): Response
    {
        return Response::html($this->layout("
            <h2>Admin Login</h2>
            <form method='POST' action='/admin/login'>
                <input name='email' placeholder='Email' required />
                <input type='password' name='password' placeholder='Password' required />
                <button>Login</button>
            </form>
        "));
    }

    public function authenticate(Request $req): Response
    {
        if (($req->body['email'] ?? '') === 'group01@local'
            && ($req->body['password'] ?? '') === 'group01') {

            header("Location: /admin/dashboard");
            exit;
        }

        return Response::html($this->layout("
            <h2>Login Failed</h2>
            <a href='/admin/login'>Try again</a>
        "));
    }

    public function dashboard(Request $req): Response
    {
        return Response::html($this->layout("
            <h2>Admin Dashboard</h2>
            <div class='grid'>
                <a class='card' href='/health'>Health Status</a>
                <a class='card' href='/admin/rabbit-test'>RabbitMQ Test</a>
                <a class='card' href='#'>Post Adoption</a>
                <a class='card' href='#'>Quiz Results</a>
                <a class='card' href='#'>Applications</a>
            </div>
        "));
    }

    public function rabbitTest(Request $req): Response
    {
        try {
            $mq = $this->container->get(RabbitMqClient::class);

            // Publish test message
            $mq->publish([
                'group' => '01',
                'message' => 'RabbitMQ verification successful'
            ]);

            $received = null;

            // Consume once
            $mq->consumeOnce(function ($data) use (&$received) {
                $received = $data;
            });

            return Response::html($this->layout("
                <h2>RabbitMQ Status</h2>
                <p style='color:#2ecc71;'>
                    Hello, I am RabbitMQ. I am working and able to receive and queue messages. Thank you Group 01.
                </p>
                <pre>" . print_r($received, true) . "</pre>
                <a href='/admin/dashboard'>Back to Dashboard</a>
            "));
        } catch (\Throwable $e) {
            return Response::html($this->layout("
                <h2 style='color:red;'>RabbitMQ Error</h2>
                <pre>{$e->getMessage()}</pre>
                <a href='/admin/dashboard'>Back</a>
            "));
        }
    }

    private function layout(string $content): string
    {
        return "
        <html>
        <head>
            <style>
                body { font-family: Arial; background:#111; color:#fff; padding:40px; }
                input { display:block; margin:10px 0; padding:10px; width:250px; }
                button { padding:10px 20px; background:#2ecc71; border:none; cursor:pointer; }
                .grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:20px; margin-top:30px; }
                .card {
                    background:#1f1f1f;
                    padding:30px;
                    text-align:center;
                    text-decoration:none;
                    color:white;
                    border-radius:10px;
                }
                .card:hover { background:#333; }
            </style>
        </head>
        <body>
            $content
        </body>
        </html>
        ";
    }
}
