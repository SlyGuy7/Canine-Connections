#!/usr/bin/env php
<?php
require_once __DIR__ . '/../vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

echo "Testing RabbitMQ Write...\n";

try {
    $connection = new AMQPStreamConnection(
        'localhost',
        5672,
        'admin',
        'REDACTED',
        '/'
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
