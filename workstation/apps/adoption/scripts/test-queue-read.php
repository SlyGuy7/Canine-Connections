#!/usr/bin/env php
<?php
require_once __DIR__ . '/../../vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;


$config = [
    'host' => 'localhost',
    'port' => 5672,
    'user' => 'guest',     
    'password' => 'guest',   
    'queue' => 'it490_test_queue'
];


if ($argc > 1) {
    $config['user'] = $argv[1];
}
if ($argc > 2) {
    $config['password'] = $argv[2];
}
if ($argc > 3) {
    $config['host'] = $argv[3];
}

echo "RabbitMQ Read Test\n";
echo "=================\n";
echo "Host: {$config['host']}:{$config['port']}\n";
echo "User: {$config['user']}\n";

try {
    $connection = new AMQPStreamConnection(
        $config['host'],
        $config['port'],
        $config['user'],
        $config['password']
    );
    
    $channel = $connection->channel();
    $channel->queue_declare($config['queue'], false, true, false, false);
    
    // Check queue size first
    $queue_info = $channel->queue_declare($config['queue'], true);
    $message_count = $queue_info[1];
    
    echo "Messages in queue: $message_count\n";
    
    if ($message_count > 0) {
        $message = $channel->basic_get($config['queue']);
        
        if ($message) {
            echo " Message received:\n";
            echo "   " . $message->body . "\n";
            $channel->basic_ack($message->delivery_info['delivery_tag']);
        }
    } else {
        echo "No messages in queue\n";
    }
    
    $channel->close();
    $connection->close();
    
} catch (Exception $e) {
    echo " Error: " . $e->getMessage() . "\n";
    exit(1);
}
