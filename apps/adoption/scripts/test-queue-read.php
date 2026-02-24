#!/usr/bin/env php
<?php
require_once __DIR__ . '/../../vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;

// Load environmental variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

echo "Testing RabbitMQ Read...\n";

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
    
    $message = $channel->basic_get('it490_test_queue');
    
    if ($message) {
        echo "Message read from queue: " . $message->body . "\n";
        $channel->basic_ack($message->delivery_info['delivery_tag']);
    } else {
        echo "No messages in queue\n";
    }
    
    $channel->close();
    $connection->close();
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
