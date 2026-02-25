<?php

//require __DIR__ . '/../vendor/autoload.php';

//use PhpAmqpLib\Connection\AMQPStreamConnection;

//$conn = new AMQPStreamConnection('127.0.0.1',5672,'guest','guest');
//$ch = $conn->channel();

//$ch->queue_declare('applications.review', false, true, false, false);

//echo "Waiting...\n";

//$ch->basic_consume('applications.review', '', false, true, false, false,
    //function ($msg) {
       // echo "Received: ".$msg->body."\n";
   // }
//);

//while ($ch->is_consuming()) {
    //$ch->wait();
//}

require __DIR__ . '/../vendor/autoload.php';

use App\Infrastructure\Messaging\RabbitMqClient;

$mq = new RabbitMqClient();

echo "Waiting...\n";

$mq->consume(function ($data) {
    echo "Received message:\n";
    print_r($data);
    echo "\n";
});

