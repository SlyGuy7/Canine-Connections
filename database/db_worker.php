<?php

require_once __DIR__ . '/vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Dotenv\Dotenv;

date_default_timezone_set('America/New_York');

// Every failed query throws, so errors are never silently ignored (QueryHandler relies on this).
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function logMsg($msg) {
    echo "[" . date("H:i:s") . "] " . $msg . PHP_EOL;
}

$dotenv = Dotenv::createImmutable(__DIR__);
// Without a .env file (e.g. in Docker), settings come from the process environment.
$dotenv->safeLoad();
foreach (getenv() as $name => $value) { $_ENV[$name] ??= $value; }

$port = (int) $_ENV['RABBITMQ_PORT'];
$user = $_ENV['RABBITMQ_USER'];
$pass = $_ENV['RABBITMQ_PASS'];

$rmqHosts = array_values(array_filter([
    $_ENV['RABBITMQ_HOST']  ?? null,
    $_ENV['RABBITMQ_HOST2'] ?? null,
    $_ENV['RABBITMQ_HOST3'] ?? null,
]));

logMsg("Connecting to RabbitMQ...");
logMsg("[CLUSTER] RabbitMQ nodes: " . implode(', ', $rmqHosts));

$connection = null;
foreach ($rmqHosts as $i => $rmqHost) {
    try {
        if ($i > 0) logMsg("[CLUSTER] Trying RabbitMQ node " . ($i + 1) . " (SECONDARY): " . $rmqHost . " ...");
        $connection = new AMQPStreamConnection($rmqHost, $port, $user, $pass, "/");
        logMsg("[CLUSTER] RabbitMQ connected — now using node " . ($i + 1) . ($i === 0 ? " (PRIMARY)" : " (SECONDARY)") . ": " . $rmqHost);
        break;
    } catch (\Throwable $e) {
        logMsg("[CLUSTER] RabbitMQ node " . ($i + 1) . " (" . $rmqHost . ") is down — trying next node in cluster...");
    }
}

if (!$connection) {
    die("[CLUSTER] All RabbitMQ nodes unreachable — cluster is down" . PHP_EOL);
}

$channel = $connection->channel();
$channel->basic_qos(0, 1, false);
logMsg("[CLUSTER] RabbitMQ channel ready");

logMsg("Connecting to MySQL...");

$dbHosts = array_values(array_filter([
    $_ENV['DB_HOST']   ?? null,
    $_ENV['DB_HOST_2'] ?? null,
    $_ENV['DB_HOST_3'] ?? null,
]));

logMsg("[CLUSTER] MySQL nodes: " . implode(', ', $dbHosts));

function connectDb(string $host, string $user, string $pass, string $name, int $port): ?mysqli {
    try {
        $conn = mysqli_init();
        $conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 3);
        if (!$conn->real_connect($host, $user, $pass, $name, $port)) return null;
    } catch (\Throwable $e) {
        return null;
    }
    if ($conn->connect_error) return null;
    $conn->set_charset('utf8mb4');
    $conn->query("SET SESSION wait_timeout=28800");
    $conn->query("SET SESSION interactive_timeout=28800");
    // A standalone server (no Group Replication, e.g. local Docker) is used as long as it is writable.
    try {
        $gr = $conn->query("SELECT COUNT(*) AS n FROM information_schema.PLUGINS WHERE PLUGIN_NAME = 'group_replication' AND PLUGIN_STATUS = 'ACTIVE'");
        if ($gr && (int)$gr->fetch_assoc()['n'] === 0) {
            $ro = $conn->query("SELECT @@super_read_only AS ro")->fetch_assoc();
            if ((int)($ro['ro'] ?? 0) === 1) { $conn->close(); return null; }
            return $conn;
        }
    } catch (\Throwable $e) {
        // Fall through to the cluster checks below.
    }
    // In a cluster, only connect to the active Group Replication PRIMARY (ONLINE).
    try {
        $grResult = $conn->query(
            "SELECT MEMBER_ROLE FROM performance_schema.replication_group_members " .
            "WHERE MEMBER_ID = @@server_uuid AND MEMBER_STATE = 'ONLINE'"
        );
        $grRow = $grResult ? $grResult->fetch_assoc() : null;
        if (!$grRow || $grRow['MEMBER_ROLE'] !== 'PRIMARY') {
            $conn->close();
            return null;
        }
    } catch (\Throwable $e) {
    
        // GRANT SELECT ON performance_schema.replication_group_members TO 'adoption_user'@'%';
        logMsg("[CLUSTER] WARNING: Cannot read group replication status on " . $host . " (" . $e->getMessage() . ") — falling back to super_read_only check");
        $roResult = $conn->query("SELECT @@super_read_only as ro");
        if ($roResult) {
            $roRow = $roResult->fetch_assoc();
            if ((int)($roRow['ro'] ?? 0) === 1) {
                $conn->close();
                return null;
            }
        }
    }
    return $conn;
}

$db = null;
foreach ($dbHosts as $i => $dbHost) {
    logMsg("[CLUSTER] Trying MySQL node " . ($i + 1) . ": " . $dbHost . " ...");
    $db = connectDb($dbHost, $_ENV['DB_USER'], $_ENV['DB_PASS'], $_ENV['DB_NAME'], (int)$_ENV['DB_PORT']);
    if ($db) {
        logMsg("[CLUSTER] MySQL connected (PRIMARY) — now using node " . ($i + 1) . ": " . $dbHost);
        break;
    }
    logMsg("[CLUSTER] MySQL node " . ($i + 1) . " (" . $dbHost . ") is unavailable (down or secondary) — trying next node...");
}

if (!$db) {
    die("[CLUSTER] All MySQL nodes unreachable — cluster is down" . PHP_EOL);
}

$db->query("CREATE TABLE IF NOT EXISTS `id_verifications` (
    `id` int NOT NULL AUTO_INCREMENT,
    `user_id` int NOT NULL,
    `id_one_data` mediumtext,
    `id_one_filename` varchar(255) DEFAULT NULL,
    `id_two_data` mediumtext,
    `id_two_filename` varchar(255) DEFAULT NULL,
    `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`), KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$queues = QueryHandler::queues();

logMsg("Declaring " . count($queues) . " queues...");
foreach ($queues as $q) {
    $channel->queue_declare($q, false, true, false, false);
}
logMsg("All " . count($queues) . " queues declared and ready");

function reconnectDb(array $dbHosts, string $dbUser, string $dbPass, string $dbName, int $dbPort): ?mysqli {
    foreach ($dbHosts as $i => $dbHost) {
        logMsg("[CLUSTER] Trying MySQL node " . ($i + 1) . ": " . $dbHost . " ...");
        $conn = connectDb($dbHost, $dbUser, $dbPass, $dbName, $dbPort);
        if ($conn) {
            logMsg("[CLUSTER] MySQL reconnected (PRIMARY) — now using node " . ($i + 1) . ": " . $dbHost);
            return $conn;
        }
        logMsg("[CLUSTER] MySQL node " . ($i + 1) . " (" . $dbHost . ") is unavailable (down or secondary) — trying next node...");
    }
    logMsg("[CLUSTER] All MySQL nodes unreachable");
    return null;
}

function reconnectRmq(array $rmqHosts, int $port, string $user, string $pass): ?AMQPStreamConnection {
    foreach ($rmqHosts as $i => $rmqHost) {
        try {
            logMsg("[CLUSTER] Trying RabbitMQ node " . ($i + 1) . ($i === 0 ? " (PRIMARY)" : " (SECONDARY)") . ": " . $rmqHost . " ...");
            $conn = new AMQPStreamConnection($rmqHost, $port, $user, $pass, "/");
            logMsg("[CLUSTER] RabbitMQ reconnected — now using node " . ($i + 1) . ($i === 0 ? " (PRIMARY)" : " (SECONDARY)") . ": " . $rmqHost);
            return $conn;
        } catch (\Throwable $e) {
            logMsg("[CLUSTER] RabbitMQ node " . ($i + 1) . " (" . $rmqHost . ") is down — trying next node in cluster...");
        }
    }
    logMsg("[CLUSTER] All RabbitMQ nodes unreachable");
    return null;
}

$callback = function($msg) use ($channel, &$db, &$connection, $dbHosts, $rmqHosts, $port, $user, $pass) {
    $queue         = $msg->delivery_info['routing_key'];
    $body          = $msg->body;
    $msgProps      = $msg->get_properties();
    $correlationId = $msgProps['correlation_id'] ?? null;
    $replyTo       = $msgProps['reply_to'] ?? '';

    // Only the queue name is logged: payloads contain password hashes, personal data and ID images.
    $started = microtime(true);
    $data = json_decode($body, true);
    if (!is_array($data)) $data = [];

    try {
        if (!$db->ping()) {
            logMsg("[CLUSTER] MySQL ping failed — connection lost, reconnecting...");
            $db = reconnectDb($dbHosts, $_ENV['DB_USER'], $_ENV['DB_PASS'], $_ENV['DB_NAME'], (int)$_ENV['DB_PORT']);
            if (!$db) { logMsg("[CLUSTER] Could not reconnect to any MySQL node — dropping message"); return; }
        }

        $result = (new QueryHandler($db, 'logMsg'))->handle($queue, $data);

    } catch (\Throwable $e) {
        logMsg("[CLUSTER] Query failed: " . $e->getMessage() . " — reconnecting to next MySQL node...");
        $db = reconnectDb($dbHosts, $_ENV['DB_USER'], $_ENV['DB_PASS'], $_ENV['DB_NAME'], (int)$_ENV['DB_PORT']);
        if ($db) {
            try {
                $result = (new QueryHandler($db, 'logMsg'))->handle($queue, $data);
                logMsg("[CLUSTER] Query succeeded after MySQL failover");
            } catch (\Throwable $e2) {
                logMsg("[CLUSTER] Retry failed: " . $e2->getMessage());
                $result = ['success' => false, 'error' => 'The database is temporarily unavailable'];
            }
        } else {
            logMsg("[CLUSTER] All MySQL nodes unreachable — returning error");
            $result = ['success' => false, 'error' => "All MySQL nodes unreachable"];
        }
    }

    $resultQueue = ($replyTo !== '') ? $replyTo : ("db.result." . substr($queue, strlen("db.")));
    $props = ['content_type' => 'application/json', 'delivery_mode' => 2];
    if ($correlationId) $props['correlation_id'] = $correlationId;

    logMsg(sprintf("%s -> %s (%d ms)", $queue, ($result['success'] ?? true) ? 'ok' : 'error', (microtime(true) - $started) * 1000));

    try {
        $channel->basic_publish(new AMQPMessage(json_encode($result), $props), '', $resultQueue);
    } catch (\Throwable $e) {
        logMsg("[CLUSTER] RabbitMQ publish failed — reconnecting: " . $e->getMessage());
        $connection = reconnectRmq($rmqHosts, $port, $user, $pass);
        if ($connection) {
            $channel = $connection->channel();
            $channel->basic_publish(new AMQPMessage(json_encode($result), $props), '', $resultQueue);
            logMsg("[CLUSTER] Published via secondary RabbitMQ node");
        } else {
            logMsg("[CLUSTER] All RabbitMQ nodes unreachable — reply lost");
        }
    }

};

foreach ($queues as $q) {
    $channel->basic_consume($q, '', false, true, false, false, $callback);
}

logMsg("[CLUSTER] RabbitMQ primary: " . $rmqHosts[0]);
logMsg("[CLUSTER] MySQL primary: " . $dbHosts[0]);
logMsg("DATABASE IS RUNNING VERSION 3.1 — 3-Node Cluster Active");

while ($channel->is_consuming()) {
    try {
        $channel->wait();
    } catch (\Throwable $e) {
        logMsg("[CLUSTER] RabbitMQ connection lost: " . $e->getMessage());
        logMsg("[CLUSTER] Attempting RabbitMQ reconnect...");
        $connection = reconnectRmq($rmqHosts, $port, $user, $pass);
        if (!$connection) { die("[CLUSTER] All RabbitMQ nodes unreachable — cluster is down" . PHP_EOL); }
        $channel = $connection->channel();
        $channel->basic_qos(0, 1, false);
        $declared = false;
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            try {
                foreach ($queues as $q) {
                    $channel->queue_declare($q, false, true, false, false);
                    $channel->basic_consume($q, '', false, true, false, false, $callback);
                }
                $declared = true;
                break;
            } catch (\Throwable $de) {
                logMsg("[CLUSTER] Queue declare attempt {$attempt} failed: " . $de->getMessage() . " — retrying in 3s...");
                sleep(3);
                try {
                    $connection = reconnectRmq($rmqHosts, $port, $user, $pass);
                    if ($connection) { $channel = $connection->channel(); $channel->basic_qos(0, 1, false); }
                } catch (\Throwable $re) {}
            }
        }
        if (!$declared) { die("[CLUSTER] Could not re-register queues after 5 attempts — exiting" . PHP_EOL); }
        logMsg("[CLUSTER] RabbitMQ reconnected and consumers re-registered");
    }
}