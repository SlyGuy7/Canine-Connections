<?php

require_once __DIR__ . '/../../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->load();

// Get RabbitMQ credentials from environment
$rabbitmq_host = $_ENV['RABBITMQ_HOST'] ?? 'localhost';
$rabbitmq_port = $_ENV['RABBITMQ_PORT'] ?? 5672;
$rabbitmq_user = $_ENV['RABBITMQ_USER'] ?? 'guest';
$rabbitmq_pass = $_ENV['RABBITMQ_PASSWORD'] ?? 'guest';
$rabbitmq_vhost = $_ENV['RABBITMQ_VHOST'] ?? '/';


//create a new php data object connection to the mysql database
$pdo = new PDO(
	"mysql:host=localhost;dbname=adoption_cent", //tells php which database to connect to
	"deryk", //dbname
	"REDACTED" //db password
);

echo "Backend running. DB connected SUCCESSFULLY."; //a simple msg to comfirm its up and running


echo "\n\n--- RabbitMQ API Available ---\n";



// Set JSON headers for API endpoints
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');


use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

// Only process API requests if they have an 'action' parameter
if (isset($_GET['action'])) {
    $action = $_GET['action'];
    
    // Clear any previous output (your echo message) when handling API requests
    ob_clean();
    
    switch ($action) {
        case 'hello':
            echo json_encode([
                'message' => 'Hello World!!!',
                'from' => 'Backend API',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            break;
            
        case 'send-to-queue':
            $data = $_POST['data'] ?? 'Hello from API';
            
            try {
                // ===== Using environment variables =====
                $connection = new AMQPStreamConnection(
                    $rabbitmq_host, 
                    $rabbitmq_port, 
                    $rabbitmq_user, 
                    $rabbitmq_pass, 
                    $rabbitmq_vhost
                );
                $channel = $connection->channel();
                $channel->queue_declare('it490_queue', false, true, false, false);
                
                $msg = new AMQPMessage(json_encode([
                    'data' => $data,
                    'timestamp' => date('Y-m-d H:i:s')
                ]));
                
                $channel->basic_publish($msg, '', 'it490_queue');
                $channel->close();
                $connection->close();
                
                echo json_encode(['success' => true, 'message' => 'Sent to queue']);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
            break;
            
        case 'read-from-queue':
            try {
                // ===== environment variables =====
                $connection = new AMQPStreamConnection(
                    $rabbitmq_host, 
                    $rabbitmq_port, 
                    $rabbitmq_user, 
                    $rabbitmq_pass, 
                    $rabbitmq_vhost
                );
                $channel = $connection->channel();
                $channel->queue_declare('it490_queue', false, true, false, false);
                
                $message = $channel->basic_get('it490_queue');
                
                if ($message) {
                    $data = json_decode($message->body, true);
                    $channel->basic_ack($message->delivery_info['delivery_tag']);
                    echo json_encode(['success' => true, 'data' => $data]);
                } else {
                    echo json_encode(['success' => true, 'message' => 'No messages']);
                }
                
                $channel->close();
                $connection->close();
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
            break;
            
        default:
            echo json_encode(['error' => 'Unknown action']);
    }
    exit; 
}
