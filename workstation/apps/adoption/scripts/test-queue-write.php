#!/usr/bin/env php
<?php
require_once __DIR__ . '/../../vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;


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

echo "RabbitMQ Write Test\n";
echo "==================\n";
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
    
    $data = json_encode([
        'from' => 'backend',
        'message' => 'Hello from Backend!',
        'timestamp' => date('Y-m-d H:i:s'),
        'server' => gethostname()
    ]);
    
    $msg = new AMQPMessage($data);
    $channel->basic_publish($msg, '', $config['queue']);
    
    echo "Message sent: $data\n";
    
    $channel->close();
    $connection->close();
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
