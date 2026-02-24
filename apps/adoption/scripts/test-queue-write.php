#!/usr/bin/env php
<?php
require_once __DIR__ . '/../vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

// Load environmental variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

echo "Testing RabbitMQ Write...\n";

try {
    $connection = new AMQPStreamConnection(
        $_ENV['RABBITMQ_HOST'] ?? 'localhost',
        $_ENV['RABBITMQ_PORT'] ?? 5672,
        $_ENV['RABBITMQ_USER'] ?? 'guest',
        $_ENV['RABBITMQ_PASSWORD'] ?? 'guest',
        $_ENV['RABBITMQ_VHOST'] ?? '/'
    );
    
    $channel = $connection->channel();
    $channel->queue_declare('it490_test_queue', false, true, false, false);
    
    $data = json_encode([
        'from' => 'backend',
        'message' => 'Hello from Backend!',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    $msg = new AMQPMessage($data);
    $channel->basic_publish($msg, '', 'it490_test_queue');
    
    echo "Message written to queue: $data\n";
    
    $channel->close();
    $connection->close();
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
