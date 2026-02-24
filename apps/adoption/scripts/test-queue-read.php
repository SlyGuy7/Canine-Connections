#!/usr/bin/env php
<?php
require_once __DIR__ . '/../vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;

echo "Testing RabbitMQ Read...\n";

try {
    $connection = new AMQPStreamConnection(
        'localhost',
        5672,
        'admin',
        'REDACTED', // password
        '/'
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
