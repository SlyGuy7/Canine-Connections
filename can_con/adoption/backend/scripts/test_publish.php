<?php
require __DIR__ . '/../vendor/autoload.php';

use App\Infrastructure\Messaging\RabbitMqClient;

$mq = new RabbitMqClient();
$mq->publish(['test' => 'Hello, its me RabbitMq I am receiving and queuing messages now']);

echo "Message published\n";
