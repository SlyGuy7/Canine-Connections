<?php

require_once __DIR__ . '/../vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Dotenv\Dotenv;

date_default_timezone_set('America/New_York');

function logMsg($msg) {
    echo "[" . date("H:i:s") . "] " . $msg . PHP_EOL;
}

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

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
    $conn = new mysqli($host, $user, $pass, $name, $port);
    if ($conn->connect_error) return null;
    $conn->set_charset('utf8mb4');
    $conn->query("SET SESSION wait_timeout=28800");
    $conn->query("SET SESSION interactive_timeout=28800");
    return $conn;
}

$db = null;
foreach ($dbHosts as $i => $dbHost) {
    if ($i > 0) logMsg("[CLUSTER] Trying MySQL node " . ($i + 1) . " (SECONDARY): " . $dbHost . " ...");
    $db = connectDb($dbHost, $_ENV['DB_USER'], $_ENV['DB_PASS'], $_ENV['DB_NAME'], (int)$_ENV['DB_PORT']);
    if ($db) {
        logMsg("[CLUSTER] MySQL connected — now using node " . ($i + 1) . ($i === 0 ? " (PRIMARY)" : " (SECONDARY)") . ": " . $dbHost);
        break;
    }
    logMsg("[CLUSTER] MySQL node " . ($i + 1) . " (" . $dbHost . ") is down — trying next node in cluster...");
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

$queues = [
    'db.auth.register','db.auth.login','db.auth.resetPassword','db.auth.verify','db.profile.update','db.account.delete',
    'db.shelters.list','db.shelters.get','db.shelters.upsert',
    'db.api.key.get','db.api.key.regenerate','db.api.key.validate','db.api.logs','db.api.log','db.api.dog.upsert',
    'db.dogs.list','db.dogs.get',
    'db.application.submit','db.application.status','db.application.list','db.application.approve','db.application.reject',
    'db.adoptions.list','db.adoptions.get','db.adoptions.finalize',
    'db.quiz.questions','db.quiz.submit','db.quiz.results',
    'db.adoption.log.create','db.adoption.log.list','db.adoption.log.delete',
    'db.foster.apply','db.foster.list','db.foster.cancel',
    'db.parks.list','db.resources.list','db.resources.get',
    'db.stories.list','db.stories.submit','db.stories.approve',
    'db.badges.list','db.badges.mine',
    'db.enquiry.send',
    'db.chat.start','db.chat.message','db.chat.history',
    'db.meetgreet.schedule','db.meetgreet.list','db.meetgreet.cancel',
    'db.notifications.list','db.notifications.read'
];

logMsg("Declaring " . count($queues) . " queues...");
foreach ($queues as $q) {
    $channel->queue_declare($q, false, true, false, false);
}
logMsg("All " . count($queues) . " queues declared and ready");

function fetchAllAssoc($result) {
    if (!$result) return [];
    return $result->fetch_all(MYSQLI_ASSOC);
}

function fetchOneAssoc($result) {
    if (!$result) return null;
    return $result->fetch_assoc();
}

function reconnectDb(array $dbHosts, string $dbUser, string $dbPass, string $dbName, int $dbPort): ?mysqli {
    foreach ($dbHosts as $i => $dbHost) {
        logMsg("[CLUSTER] Trying MySQL node " . ($i + 1) . ($i === 0 ? " (PRIMARY)" : " (SECONDARY)") . ": " . $dbHost . " ...");
        $conn = connectDb($dbHost, $dbUser, $dbPass, $dbName, $dbPort);
        if ($conn) {
            logMsg("[CLUSTER] MySQL reconnected — now using node " . ($i + 1) . ($i === 0 ? " (PRIMARY)" : " (SECONDARY)") . ": " . $dbHost);
            return $conn;
        }
        logMsg("[CLUSTER] MySQL node " . ($i + 1) . " (" . $dbHost . ") is down — trying next node in cluster...");
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

function handleQuery($queue, $data, $db) {
    logMsg("Processing queue: " . $queue);
    logMsg("Payload: " . json_encode($data));

    switch ($queue) {
        case "db.auth.register":
            if (!isset($data["email"]) || !isset($data["password_hash"])) return ["success" => false, "error" => "Missing email or password_hash"];
            $email=$db->real_escape_string($data["email"]); $passwordHash=$db->real_escape_string($data["password_hash"]);
            $firstName=$db->real_escape_string($data["first_name"]??''); $lastName=$db->real_escape_string($data["last_name"]??'');
            $phone=$db->real_escape_string($data["phone"]??''); $address=$db->real_escape_string($data["address"]??'');
            $role=$db->real_escape_string($data["role"]??'adopter');
            $check=$db->query("SELECT user_id FROM users WHERE email='{$email}' LIMIT 1");
            if ($check && $check->num_rows>0) return ["success"=>false,"error"=>"Email already registered"];
            $token=$db->real_escape_string(bin2hex(random_bytes(32)));
            $sql="INSERT INTO users (email,password_hash,first_name,last_name,phone,address,role,email_verified,verification_token) VALUES ('{$email}','{$passwordHash}','{$firstName}','{$lastName}','{$phone}','{$address}','{$role}',0,'{$token}')";
            logMsg("Executing SQL: ".$sql);
            if (!$db->query($sql)) return ["success"=>false,"error"=>$db->error];
            $newUserId=$db->insert_id;
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
            if (!empty($data["id_one_b64"]) || !empty($data["id_two_b64"])) {
                $id1=$db->real_escape_string($data["id_one_b64"]??'');
                $id1n=$db->real_escape_string($data["id_one_name"]??'');
                $id2=$db->real_escape_string($data["id_two_b64"]??'');
                $id2n=$db->real_escape_string($data["id_two_name"]??'');
                $db->query("INSERT INTO id_verifications (user_id,id_one_data,id_one_filename,id_two_data,id_two_filename) VALUES ({$newUserId},'{$id1}','{$id1n}','{$id2}','{$id2n}')");
            }
            return ["success"=>true,"user_id"=>$newUserId,"verification_token"=>$token];

        case "db.auth.login":
            if (!isset($data["email"])) return ["success"=>false,"error"=>"Missing email"];
            $email=$db->real_escape_string($data["email"]);
            $sql="SELECT user_id,email,password_hash,role,first_name,last_name,email_verified,login_notifications FROM users WHERE email='{$email}' LIMIT 1";
            logMsg("Executing SQL: ".$sql);
            $result=$db->query($sql);
            if (!$result||$result->num_rows===0) return ["success"=>false,"user"=>null];
            return ["success"=>true,"user"=>$result->fetch_assoc()];

        case "db.auth.resetPassword":
            if (!isset($data["email"])||!isset($data["password_hash"])) return ["success"=>false,"error"=>"Missing email or password_hash"];
            $email=$db->real_escape_string($data["email"]); $passwordHash=$db->real_escape_string($data["password_hash"]);
            if (isset($data["new_password_plain"])) {
                $cur=$db->query("SELECT password_hash FROM users WHERE email='{$email}' LIMIT 1");
                if ($cur&&$cur->num_rows>0) {
                    $curHash=$cur->fetch_assoc()["password_hash"];
                    if (password_verify($data["new_password_plain"],$curHash)) return ["success"=>false,"error"=>"New password cannot be the same as your current password."];
                }
            }
            $db->query("UPDATE users SET password_hash='{$passwordHash}' WHERE email='{$email}'");
            if ($db->affected_rows===0) return ["success"=>false,"error"=>"User not found"];
            return ["success"=>true];

        case "db.auth.refreshVerification":
            if (!isset($data["email"])) return ["success"=>false,"error"=>"Missing email"];
            $email=$db->real_escape_string($data["email"]);
            $check=$db->query("SELECT user_id,first_name FROM users WHERE email='{$email}' AND email_verified=0 LIMIT 1");
            if (!$check||$check->num_rows===0) return ["success"=>false,"error"=>"Not found or already verified"];
            $row=$check->fetch_assoc();
            $newToken=$db->real_escape_string(bin2hex(random_bytes(32)));
            $db->query("UPDATE users SET verification_token='{$newToken}' WHERE user_id={$row['user_id']}");
            if ($db->affected_rows===0) return ["success"=>false,"error"=>"Could not refresh token"];
            return ["success"=>true,"verification_token"=>$newToken,"first_name"=>$row['first_name']];

        case "db.auth.verify":
            if (!isset($data["token"])) return ["success"=>false,"error"=>"Missing token"];
            $token=$db->real_escape_string($data["token"]);
            $result=$db->query("SELECT user_id FROM users WHERE verification_token='{$token}' AND email_verified=0 LIMIT 1");
            if (!$result||$result->num_rows===0) return ["success"=>false,"error"=>"Invalid or expired verification link"];
            $row=$result->fetch_assoc();
            $userId=(int)$row['user_id'];
            $db->query("UPDATE users SET email_verified=1,verification_token=NULL WHERE user_id={$userId}");
            if ($db->affected_rows===0) return ["success"=>false,"error"=>"Verification failed"];
            logMsg("Email verified for user_id={$userId}");
            return ["success"=>true,"user_id"=>$userId];

        case "db.profile.update":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"]; $firstName=$db->real_escape_string($data["first_name"]??'');
            $lastName=$db->real_escape_string($data["last_name"]??''); $phone=$db->real_escape_string($data["phone"]??'');
            $address=$db->real_escape_string($data["address"]??'');
            $setParts=["first_name='{$firstName}'","last_name='{$lastName}'","phone='{$phone}'","address='{$address}'"];
            if (array_key_exists("login_notifications",$data)) $setParts[]="login_notifications=".((int)$data["login_notifications"]);
            $sql="UPDATE users SET ".implode(",",$setParts)." WHERE user_id={$userId}";
            logMsg("Executing SQL: ".$sql); $db->query($sql);
            return ["success"=>true];

        case "db.account.delete":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"];
            $check=$db->query("SELECT user_id FROM users WHERE user_id={$userId} LIMIT 1");
            if (!$check||$check->num_rows===0) return ["success"=>false,"error"=>"User not found"];
            // Delete child rows in FK-constraint order before removing the user
            $db->query("DELETE FROM user_badges WHERE user_id={$userId}");
            $db->query("DELETE FROM quiz_results WHERE user_id={$userId}");
            $db->query("DELETE FROM virtual_foster WHERE user_id={$userId}");
            $db->query("DELETE FROM meet_greet_sessions WHERE user_id={$userId}");
            $db->query("DELETE FROM chat_messages WHERE session_id IN (SELECT session_id FROM chat_sessions WHERE user_id={$userId})");
            $db->query("DELETE FROM chat_sessions WHERE user_id={$userId}");
            $db->query("DELETE FROM notifications WHERE user_id={$userId}");
            $db->query("DELETE FROM id_verifications WHERE user_id={$userId}");
            $db->query("UPDATE success_stories SET approved_by=NULL WHERE approved_by={$userId}");
            $db->query("DELETE FROM success_stories WHERE user_id={$userId}");
            $db->query("UPDATE adoption_applications SET reviewed_by=NULL WHERE reviewed_by={$userId}");
            $db->query("DELETE FROM adoption_applications WHERE user_id={$userId}");
            $db->query("DELETE FROM post_adoption_logs WHERE adoption_id IN (SELECT adoption_id FROM adoptions WHERE user_id={$userId})");
            $db->query("DELETE FROM adoptions WHERE user_id={$userId}");
            $db->query("DELETE FROM users WHERE user_id={$userId}");
            return ["success"=>true];

        case "db.dogs.list":
            $status=$db->real_escape_string($data['status']??'available');
            $breed=isset($data['breed'])&&$data['breed']?$db->real_escape_string($data['breed']):null;
            $size=isset($data['size'])&&$data['size']?$db->real_escape_string($data['size']):null;
            $energyLevel=isset($data['energy_level'])&&$data['energy_level']?$db->real_escape_string($data['energy_level']):null;
            $shelterId=isset($data['shelter_id'])&&$data['shelter_id']?(int)$data['shelter_id']:null;
            $limit=isset($data['limit'])?(int)$data['limit']:20; $offset=isset($data['offset'])?(int)$data['offset']:0;
            $where=["d.status='{$status}'"]; if($breed)$where[]="d.breed='{$breed}'"; if($size)$where[]="d.size='{$size}'";
            if($energyLevel)$where[]="d.energy_level='{$energyLevel}'"; if($shelterId)$where[]="d.shelter_id={$shelterId}";
            $whereClause=implode(' AND ',$where);
            $sql="SELECT d.*,GROUP_CONCAT(p.photo_url ORDER BY p.is_primary DESC) as photos FROM dogs d LEFT JOIN dog_photos p ON d.dog_id=p.dog_id WHERE {$whereClause} GROUP BY d.dog_id LIMIT {$limit} OFFSET {$offset}";
            logMsg("Executing SQL: ".$sql); $result=$db->query($sql);
            if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"dogs"=>fetchAllAssoc($result)];

        case "db.dogs.get":
            if (!isset($data["dog_id"])) return ["success"=>false,"error"=>"dog_id is required"];
            $id=(int)$data["dog_id"]; $result=$db->query("SELECT * FROM dogs WHERE dog_id={$id} LIMIT 1");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            $dog=fetchOneAssoc($result);
            if ($dog) { $photos=$db->query("SELECT * FROM dog_photos WHERE dog_id={$id} ORDER BY is_primary DESC"); $dog['photos']=fetchAllAssoc($photos); }
            return $dog?["success"=>true,"dog"=>$dog]:["success"=>false,"error"=>"Dog not found"];

        case "db.shelters.list":
            $result=$db->query("SELECT * FROM shelters ORDER BY name ASC");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"shelters"=>fetchAllAssoc($result)];

        case "db.shelters.upsert":
            if (!isset($data["name"])) return ["success"=>false,"error"=>"Missing name"];
            $name        = $db->real_escape_string(substr($data["name"] ?? '', 0, 255));
            $address     = $db->real_escape_string($data["address"]     ?? '');
            $city        = $db->real_escape_string($data["city"]        ?? '');
            $state       = $db->real_escape_string($data["state"]       ?? '');
            $zip         = $db->real_escape_string($data["zip"]         ?? '');
            $latitude    = isset($data["latitude"])  && $data["latitude"]  !== '' ? (float)$data["latitude"]  : 'NULL';
            $longitude   = isset($data["longitude"]) && $data["longitude"] !== '' ? (float)$data["longitude"] : 'NULL';
            $phone       = $db->real_escape_string($data["phone"]       ?? '');
            $email       = $db->real_escape_string($data["email"]       ?? '');
            $website     = $db->real_escape_string($data["website"]     ?? '');
            $externalId  = $db->real_escape_string($data["external_id"] ?? '');
            $description = $db->real_escape_string($data["description"] ?? '');
            $logoUrl     = $db->real_escape_string($data["logo_url"]    ?? '');
            $isActive    = isset($data["is_active"]) ? (int)$data["is_active"] : 1;
            $sql = "INSERT INTO shelters (name,address,city,state,zip,latitude,longitude,phone,email,website,external_id,description,logo_url,is_active) VALUES ('{$name}','{$address}','{$city}','{$state}','{$zip}',{$latitude},{$longitude},'{$phone}','{$email}','{$website}','{$externalId}','{$description}','{$logoUrl}',{$isActive}) ON DUPLICATE KEY UPDATE name=VALUES(name),address=VALUES(address),city=VALUES(city),state=VALUES(state),zip=VALUES(zip),latitude=VALUES(latitude),longitude=VALUES(longitude),phone=VALUES(phone),email=VALUES(email),website=VALUES(website),description=VALUES(description),logo_url=VALUES(logo_url),is_active=VALUES(is_active)";
            logMsg("Executing SQL: " . $sql);
            if (!$db->query($sql)) return ["success"=>false,"error"=>$db->error];
            $shelterIdResult = $db->query("SELECT shelter_id FROM shelters WHERE external_id='{$externalId}' LIMIT 1");
            $shelterRow = $shelterIdResult ? $shelterIdResult->fetch_assoc() : null;
            return ["success"=>true,"shelter_id"=>$shelterRow["shelter_id"]??$db->insert_id,"action"=>$db->affected_rows===1?"inserted":"updated"];

        case "db.shelters.get":
            if (!isset($data["shelter_id"])) return ["success"=>false,"error"=>"Missing shelter_id"];
            $id=(int)$data["shelter_id"]; $result=$db->query("SELECT * FROM shelters WHERE shelter_id={$id} LIMIT 1");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            $shelter=fetchOneAssoc($result);
            return $shelter?["success"=>true,"shelter"=>$shelter]:["success"=>false,"error"=>"Shelter not found"];

        case "db.api.key.get":
            if (!isset($data["shelter_id"])) return ["success"=>false,"error"=>"Missing shelter_id"];
            $id=(int)$data["shelter_id"]; $result=$db->query("SELECT * FROM api_keys WHERE shelter_id={$id} AND is_active=1 LIMIT 1");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            $key=fetchOneAssoc($result);
            return $key?["success"=>true,"key"=>$key]:["success"=>false,"error"=>"No active API key found"];

        case "db.api.key.regenerate":
            if (!isset($data["shelter_id"])) return ["success"=>false,"error"=>"Missing shelter_id"];
            $id=(int)$data["shelter_id"]; $newKey=$db->real_escape_string(bin2hex(random_bytes(32)));
            $db->query("UPDATE api_keys SET api_key='{$newKey}',updated_at=NOW() WHERE shelter_id={$id}");
            return ["success"=>true,"api_key"=>$newKey];

        case "db.api.key.validate":
            if (!isset($data["api_key"])) return ["success"=>false,"error"=>"Missing api_key"];
            $key=$db->real_escape_string($data["api_key"]);
            $result=$db->query("SELECT shelter_id FROM api_keys WHERE api_key='{$key}' AND is_active=1 LIMIT 1");
            if (!$result||$result->num_rows===0) return ["valid"=>false];
            $row=$result->fetch_assoc(); $db->query("UPDATE api_keys SET last_used_at=NOW() WHERE api_key='{$key}'");
            return ["valid"=>true,"shelter_id"=>$row["shelter_id"]];

        case "db.api.logs":
            if (!isset($data["shelter_id"])) return ["success"=>false,"error"=>"Missing shelter_id"];
            $id=(int)$data["shelter_id"]; $limit=(int)($data["limit"]??50); $offset=(int)($data["offset"]??0);
            $result=$db->query("SELECT * FROM api_logs WHERE shelter_id={$id} ORDER BY called_at DESC LIMIT {$limit} OFFSET {$offset}");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"logs"=>fetchAllAssoc($result)];

        case "db.api.log":
            $shelterId=(int)($data["shelter_id"]??0); $endpoint=$db->real_escape_string($data["endpoint"]??'');
            $method=$db->real_escape_string($data["method"]??'POST'); $summary=$db->real_escape_string($data["payload_summary"]??'');
            $status=(int)($data["response_status"]??200); $ip=$db->real_escape_string($data["ip_address"]??'');
            $db->query("INSERT INTO api_logs (shelter_id,endpoint,method,payload_summary,response_status,ip_address,called_at) VALUES ({$shelterId},'{$endpoint}','{$method}','{$summary}',{$status},'{$ip}',NOW())");
            return ["success"=>true];

        case "db.application.submit":
            if (!isset($data["user_id"])||!isset($data["dog_id"])) return ["success"=>false,"error"=>"Missing user_id or dog_id"];
            $userId=(int)$data["user_id"]; $dogId=(int)$data["dog_id"];
            $fullName=$db->real_escape_string($data["full_name"]??''); $address=$db->real_escape_string($data["address"]??'');
            $phone=$db->real_escape_string($data["phone"]??''); $housing=$db->real_escape_string($data["housing_type"]??'house');
            $yard=(int)($data["has_yard"]??0); $otherPets=(int)($data["has_other_pets"]??0);
            $petsDesc=$db->real_escape_string($data["other_pets_description"]??''); $children=(int)($data["has_children"]??0);
            $childAges=$db->real_escape_string($data["children_ages"]??''); $exp=$db->real_escape_string($data["prior_pet_experience"]??'');
            $reason=$db->real_escape_string($data["reason_for_adopting"]??''); $vetRef=$db->real_escape_string($data["vet_reference"]??'');
            $sql="INSERT INTO adoption_applications (user_id,dog_id,full_name,address,phone,housing_type,has_yard,has_other_pets,other_pets_description,has_children,children_ages,prior_pet_experience,reason_for_adopting,vet_reference,status) VALUES ({$userId},{$dogId},'{$fullName}','{$address}','{$phone}','{$housing}',{$yard},{$otherPets},'{$petsDesc}',{$children},'{$childAges}','{$exp}','{$reason}','{$vetRef}','pending')";
            logMsg("Executing SQL: ".$sql);
            if (!$db->query($sql)) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"application_id"=>$db->insert_id];

        case "db.application.status":
            if (!isset($data["application_id"])) return ["success"=>false,"error"=>"Missing application_id"];
            $id=(int)$data["application_id"]; $result=$db->query("SELECT * FROM adoption_applications WHERE application_id={$id} LIMIT 1");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            $app=fetchOneAssoc($result);
            return $app?["success"=>true,"application"=>$app]:["success"=>false,"error"=>"Application not found"];

        case "db.application.list":
            $userId=(int)($data["user_id"]??0); $shelterId=(int)($data["shelter_id"]??0);
            if ($shelterId) {
                $sql="SELECT aa.*,u.email,u.first_name,u.last_name FROM adoption_applications aa JOIN users u ON aa.user_id=u.user_id WHERE EXISTS (SELECT 1 FROM dogs WHERE dog_id=aa.dog_id AND shelter_id={$shelterId}) ORDER BY aa.application_id DESC";
            } else {
                $sql="SELECT aa.*,u.email,u.first_name,u.last_name FROM adoption_applications aa JOIN users u ON aa.user_id=u.user_id WHERE aa.user_id={$userId} ORDER BY aa.application_id DESC";
            }
            $result=$db->query($sql); if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"applications"=>fetchAllAssoc($result)];

        case "db.application.approve":
            if (!isset($data["application_id"])) return ["success"=>false,"error"=>"Missing application_id"];
            $id=(int)$data["application_id"]; $reviewedBy=isset($data["reviewed_by"])?(int)$data["reviewed_by"]:"NULL";
            $notes=$db->real_escape_string($data["reviewer_notes"]??'');
            $db->query("UPDATE adoption_applications SET status='approved',reviewed_by={$reviewedBy},reviewer_notes='{$notes}' WHERE application_id={$id}");
            $row=fetchOneAssoc($db->query("SELECT aa.user_id,u.email,u.first_name,d.name as dog_name FROM adoption_applications aa JOIN users u ON aa.user_id=u.user_id JOIN dogs d ON aa.dog_id=d.dog_id WHERE aa.application_id={$id}"));
            return ["success"=>true,"user_id"=>$row['user_id']??null,"email"=>$row['email']??'',"first_name"=>$row['first_name']??'',"dog_name"=>$row['dog_name']??''];

        case "db.application.reject":
            if (!isset($data["application_id"])) return ["success"=>false,"error"=>"Missing application_id"];
            $id=(int)$data["application_id"]; $reviewedBy=isset($data["reviewed_by"])?(int)$data["reviewed_by"]:"NULL";
            $notes=$db->real_escape_string($data["reviewer_notes"]??'');
            $db->query("UPDATE adoption_applications SET status='rejected',reviewed_by={$reviewedBy},reviewer_notes='{$notes}' WHERE application_id={$id}");
            $row=fetchOneAssoc($db->query("SELECT aa.user_id,u.email,u.first_name,d.name as dog_name FROM adoption_applications aa JOIN users u ON aa.user_id=u.user_id JOIN dogs d ON aa.dog_id=d.dog_id WHERE aa.application_id={$id}"));
            return ["success"=>true,"user_id"=>$row['user_id']??null,"email"=>$row['email']??'',"first_name"=>$row['first_name']??'',"dog_name"=>$row['dog_name']??''];

        case "db.parks.list":
            $result=$db->query("SELECT * FROM pet_parks"); if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"parks"=>fetchAllAssoc($result)];

        case "db.resources.list":
            $result=$db->query("SELECT * FROM resources ORDER BY created_at DESC"); if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"resources"=>fetchAllAssoc($result)];

        case "db.resources.get":
            if (!isset($data["resource_id"])) return ["success"=>false,"error"=>"Missing resource_id"];
            $id=(int)$data["resource_id"]; $result=$db->query("SELECT * FROM resources WHERE resource_id={$id} LIMIT 1");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            $resource=fetchOneAssoc($result);
            return $resource?["success"=>true,"resource"=>$resource]:["success"=>false,"error"=>"Not found"];

        case "db.notifications.list":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"]; $result=$db->query("SELECT * FROM notifications WHERE user_id={$userId} ORDER BY created_at DESC LIMIT 50");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"notifications"=>fetchAllAssoc($result)];

        case "db.notifications.read":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"];
            if (!empty($data["notification_id"])) { $nid=(int)$data["notification_id"]; $db->query("UPDATE notifications SET is_read=1 WHERE notification_id={$nid} AND user_id={$userId}"); }
            else { $db->query("UPDATE notifications SET is_read=1 WHERE user_id={$userId}"); }
            return ["success"=>true];

        case "db.stories.list":
            $limit=(int)($data['limit']??10); $offset=(int)($data['offset']??0);
            $result=$db->query("SELECT ss.*,u.first_name,u.last_name FROM success_stories ss JOIN users u ON ss.user_id=u.user_id WHERE ss.status='approved' ORDER BY ss.created_at DESC LIMIT {$limit} OFFSET {$offset}");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"stories"=>fetchAllAssoc($result)];

        case "db.stories.submit":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"]; $dogId=isset($data["dog_id"])?(int)$data["dog_id"]:"NULL";
            $title=$db->real_escape_string($data["title"]??''); $story=$db->real_escape_string($data["story"]??'');
            $photoUrl=$db->real_escape_string($data["photo_url"]??''); $dogIdVal=is_int($dogId)?$dogId:"NULL";
            $db->query("INSERT INTO success_stories (user_id,dog_id,title,story,photo_url,status,created_at) VALUES ({$userId},{$dogIdVal},'{$title}','{$story}','{$photoUrl}','pending',NOW())");
            return ["success"=>true,"story_id"=>$db->insert_id];

        case "db.stories.approve":
            if (!isset($data["story_id"])) return ["success"=>false,"error"=>"Missing story_id"];
            $id=(int)$data["story_id"]; $approvedBy=isset($data["approved_by"])?(int)$data["approved_by"]:"NULL";
            $db->query("UPDATE success_stories SET status='approved',approved_by={$approvedBy} WHERE story_id={$id}");
            return ["success"=>true];

        case "db.badges.list":
            $result=$db->query("SELECT * FROM badges ORDER BY badge_id ASC"); if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"badges"=>fetchAllAssoc($result)];

        case "db.badges.mine":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"];
            if (!empty($data["auto_award"])) {
                $trigger=$db->real_escape_string($data["auto_award"]);
                $badge=fetchOneAssoc($db->query("SELECT * FROM badges WHERE trigger_name='{$trigger}' LIMIT 1"));
                if ($badge) { $hasIt=fetchOneAssoc($db->query("SELECT 1 FROM user_badges WHERE user_id={$userId} AND badge_id={$badge['badge_id']} LIMIT 1")); if (!$hasIt) { $db->query("INSERT INTO user_badges (user_id,badge_id,earned_at) VALUES ({$userId},{$badge['badge_id']},NOW())"); } }
            }
            $result=$db->query("SELECT b.*,ub.earned_at FROM user_badges ub JOIN badges b ON ub.badge_id=b.badge_id WHERE ub.user_id={$userId} ORDER BY ub.earned_at DESC");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"badges"=>fetchAllAssoc($result)];

        case "db.chat.start":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"]; $dogId=(int)($data["dog_id"]??0); $shelterId=(int)($data["shelter_id"]??0);
            $existing=fetchOneAssoc($db->query("SELECT session_id FROM chat_sessions WHERE user_id={$userId} AND dog_id={$dogId} AND shelter_id={$shelterId} AND status='open' LIMIT 1"));
            if ($existing) return ["success"=>true,"session_id"=>$existing["session_id"]];
            $db->query("INSERT INTO chat_sessions (user_id,dog_id,shelter_id,status) VALUES ({$userId},{$dogId},{$shelterId},'open')");
            return ["success"=>true,"session_id"=>$db->insert_id];

        case "db.chat.message":
            if (!isset($data["session_id"])||!isset($data["sender_id"])) return ["success"=>false,"error"=>"Missing fields"];
            $sessionId=(int)$data["session_id"]; $senderId=(int)$data["sender_id"]; $message=$db->real_escape_string($data["message"]??'');
            $db->query("INSERT INTO chat_messages (session_id,sender_id,message,created_at) VALUES ({$sessionId},{$senderId},'{$message}',NOW())");
            return ["success"=>true,"message_id"=>$db->insert_id];

        case "db.chat.history":
            if (!isset($data["session_id"])) return ["success"=>false,"error"=>"Missing session_id"];
            $sessionId=(int)$data["session_id"];
            $result=$db->query("SELECT cm.*,u.first_name,u.last_name FROM chat_messages cm JOIN users u ON cm.sender_id=u.user_id WHERE cm.session_id={$sessionId} ORDER BY cm.created_at ASC");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"messages"=>fetchAllAssoc($result)];

        case "db.meetgreet.schedule":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"]; $dogId=(int)($data["dog_id"]??0); $shelterId=(int)($data["shelter_id"]??0);
            $date=$db->real_escape_string($data["scheduled_date"]??''); $time=$db->real_escape_string($data["scheduled_time"]??'');
            $link=$db->real_escape_string($data["video_link"]??'');
            $db->query("INSERT INTO meet_greet_sessions (user_id,dog_id,shelter_id,scheduled_date,scheduled_time,video_link,status) VALUES ({$userId},{$dogId},{$shelterId},'{$date}','{$time}','{$link}','scheduled')");
            return ["success"=>true,"session_id"=>$db->insert_id];

        case "db.meetgreet.list":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"];
            $result=$db->query("SELECT mg.*,d.name as dog_name FROM meet_greet_sessions mg JOIN dogs d ON mg.dog_id=d.dog_id WHERE mg.user_id={$userId} ORDER BY mg.scheduled_date ASC");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"sessions"=>fetchAllAssoc($result)];

        case "db.meetgreet.cancel":
            if (!isset($data["session_id"])) return ["success"=>false,"error"=>"Missing session_id"];
            $id=(int)$data["session_id"]; $userId=(int)($data["user_id"]??0);
            $db->query("UPDATE meet_greet_sessions SET status='cancelled' WHERE session_id={$id} AND user_id={$userId}");
            return ["success"=>true];

        case "db.foster.apply":
            if (!isset($data["user_id"])||!isset($data["dog_id"])) return ["success"=>false,"error"=>"Missing fields"];
            $userId=(int)$data["user_id"]; $dogId=(int)$data["dog_id"]; $amount=(float)($data["sponsorship_amount"]??0);
            $startDate=$db->real_escape_string($data["start_date"]??date('Y-m-d'));
            $db->query("INSERT INTO virtual_foster (user_id,dog_id,sponsorship_amount,status,start_date) VALUES ({$userId},{$dogId},{$amount},'active','{$startDate}')");
            return ["success"=>true,"foster_id"=>$db->insert_id];

        case "db.foster.list":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"];
            $result=$db->query("SELECT vf.*,d.name as dog_name FROM virtual_foster vf JOIN dogs d ON vf.dog_id=d.dog_id WHERE vf.user_id={$userId} ORDER BY vf.start_date DESC");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"fosters"=>fetchAllAssoc($result)];

        case "db.foster.cancel":
            if (!isset($data["foster_id"])) return ["success"=>false,"error"=>"Missing foster_id"];
            $id=(int)$data["foster_id"]; $userId=(int)($data["user_id"]??0);
            $db->query("UPDATE virtual_foster SET status='cancelled' WHERE foster_id={$id} AND user_id={$userId}");
            return ["success"=>true];

        case "db.adoption.log.create":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"]; $dogId=(int)($data["dog_id"]??0);
            $logType=$db->real_escape_string($data["log_type"]??'general'); $title=$db->real_escape_string($data["title"]??'');
            $notes=$db->real_escape_string($data["notes"]??''); $logDate=$db->real_escape_string($data["log_date"]??date('Y-m-d'));
            $db->query("INSERT INTO post_adoption_logs (user_id,dog_id,log_type,title,notes,log_date) VALUES ({$userId},{$dogId},'{$logType}','{$title}','{$notes}','{$logDate}')");
            return ["success"=>true,"log_id"=>$db->insert_id];

        case "db.adoption.log.list":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"]; $dogId=(int)($data["dog_id"]??0);
            $result=$db->query("SELECT * FROM post_adoption_logs WHERE user_id={$userId} AND dog_id={$dogId} ORDER BY log_date DESC");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"logs"=>fetchAllAssoc($result)];

        case "db.adoption.log.delete":
            if (!isset($data["log_id"])) return ["success"=>false,"error"=>"Missing log_id"];
            $logId=(int)$data["log_id"]; $userId=(int)($data["user_id"]??0);
            $db->query("DELETE FROM post_adoption_logs WHERE log_id={$logId} AND user_id={$userId}");
            if ($db->affected_rows===0) return ["success"=>false,"error"=>"Log not found"];
            return ["success"=>true];

        case "db.quiz.questions":
            $questions=fetchAllAssoc($db->query("SELECT * FROM quiz_questions ORDER BY question_id ASC"));
            $options=fetchAllAssoc($db->query("SELECT * FROM quiz_options ORDER BY question_id ASC,option_id ASC"));
            $optMap=[]; foreach($options as $opt) $optMap[$opt['question_id']][]=$opt;
            foreach($questions as &$q) $q['options']=$optMap[$q['question_id']]??[];
            return ["success"=>true,"questions"=>$questions];

        case "db.quiz.submit":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"]; $answers=$data["answers"]??[]; $matched=[];
            if (!empty($answers)) {
                $placeholders=implode(',',array_fill(0,count($answers),'?'));
                $stmt=$db->prepare("SELECT * FROM quiz_options WHERE option_id IN ({$placeholders})");
                $types=str_repeat('i',count($answers)); $stmt->bind_param($types,...array_values($answers)); $stmt->execute();
                $opts=fetchAllAssoc($stmt->get_result()); $traitScores=[];
                foreach($opts as $opt) { $key=!empty($opt['maps_to_attribute'])?$opt['maps_to_attribute']:''; $val=isset($opt['maps_to_value'])?$opt['maps_to_value']:''; if(!empty($key)&&$val!=='') $traitScores[$key]=$val; }
                $scoreParts=[];
                if(!empty($traitScores['energy_level'])) $scoreParts[]="(energy_level='".$db->real_escape_string($traitScores['energy_level'])."')";
                if(!empty($traitScores['size'])) $scoreParts[]="(size='".$db->real_escape_string($traitScores['size'])."')";
                if(isset($traitScores['good_with_kids'])&&$traitScores['good_with_kids']!=='') $scoreParts[]="(good_with_kids=".(int)$traitScores['good_with_kids'].")";
                if(isset($traitScores['apartment_friendly'])&&$traitScores['apartment_friendly']!=='') $scoreParts[]="(apartment_friendly=".(int)$traitScores['apartment_friendly'].")";
                if(isset($traitScores['good_with_dogs'])&&$traitScores['good_with_dogs']!=='') $scoreParts[]="(good_with_dogs=".(int)$traitScores['good_with_dogs'].")";
                if(isset($traitScores['good_with_cats'])&&$traitScores['good_with_cats']!=='') $scoreParts[]="(good_with_cats=".(int)$traitScores['good_with_cats'].")";
                if(isset($traitScores['requires_yard'])&&$traitScores['requires_yard']!=='') $scoreParts[]="(requires_yard=".(int)$traitScores['requires_yard'].")";
                if(!empty($traitScores['gender'])) $scoreParts[]="(gender='".$db->real_escape_string($traitScores['gender'])."')";
                if(isset($traitScores['is_vaccinated'])&&$traitScores['is_vaccinated']!=='') $scoreParts[]="(is_vaccinated=".(int)$traitScores['is_vaccinated'].")";
                $total=count($scoreParts); $threshold=$total>0?ceil($total*0.6):1;
                if(!empty($scoreParts)) { $scoreExpr=implode(" + ",$scoreParts); $sql="SELECT dog_id,({$scoreExpr}) as match_score FROM dogs WHERE status='available' HAVING match_score>={$threshold} ORDER BY match_score DESC LIMIT 10"; }
                else { $sql="SELECT dog_id FROM dogs WHERE status='available' LIMIT 10"; }
                logMsg("Quiz SQL: ".$sql); $result=$db->query($sql); $matched=array_column(fetchAllAssoc($result),'dog_id');
            }
            $answersJson=$db->real_escape_string(json_encode($answers)); $matchedJson=$db->real_escape_string(json_encode($matched));
            $db->query("INSERT INTO quiz_results (user_id,answers_json,matched_dog_ids) VALUES ({$userId},'{$answersJson}','{$matchedJson}') ON DUPLICATE KEY UPDATE answers_json='{$answersJson}',matched_dog_ids='{$matchedJson}'");
            return ["success"=>true,"matched_dog_ids"=>$matched];

        case "db.quiz.results":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"];
            $result=fetchOneAssoc($db->query("SELECT * FROM quiz_results WHERE user_id={$userId} ORDER BY result_id DESC LIMIT 1"));
            return $result?["success"=>true,"result"=>$result]:["success"=>false,"error"=>"No results found"];

        case "db.adoptions.list":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"];
            $result=$db->query("SELECT a.*,d.name as dog_name,d.breed FROM adoptions a JOIN dogs d ON a.dog_id=d.dog_id WHERE a.user_id={$userId} ORDER BY a.adoption_id DESC");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            return ["success"=>true,"adoptions"=>fetchAllAssoc($result)];

        case "db.adoptions.get":
            if (!isset($data["adoption_id"])) return ["success"=>false,"error"=>"Missing adoption_id"];
            $id=(int)$data["adoption_id"]; $userId=(int)($data["user_id"]??0);
            $result=$db->query("SELECT a.*,d.name as dog_name FROM adoptions a JOIN dogs d ON a.dog_id=d.dog_id WHERE a.adoption_id={$id} AND a.user_id={$userId} LIMIT 1");
            if (!$result) return ["success"=>false,"error"=>$db->error];
            $row=fetchOneAssoc($result);
            return $row?["success"=>true,"adoption"=>$row]:["success"=>false,"error"=>"Not found"];

        case "db.adoptions.finalize":
            if (!isset($data["application_id"])) return ["success"=>false,"error"=>"Missing application_id"];
            $appId=(int)$data["application_id"];
            $app=fetchOneAssoc($db->query("SELECT * FROM adoption_applications WHERE application_id={$appId} LIMIT 1"));
            if (!$app) return ["success"=>false,"error"=>"Application not found"];
            $finalizedBy=isset($data["finalized_by"])?(int)$data["finalized_by"]:"NULL"; $notes=$db->real_escape_string($data["notes"]??'');
            $db->query("INSERT INTO adoptions (user_id,dog_id,application_id,finalized_by,notes,adopted_at) VALUES ({$app['user_id']},{$app['dog_id']},{$appId},{$finalizedBy},'{$notes}',NOW())");
            $db->query("UPDATE dogs SET status='adopted' WHERE dog_id={$app['dog_id']}");
            $db->query("UPDATE adoption_applications SET status='finalized' WHERE application_id={$appId}");
            return ["success"=>true,"user_id"=>$app["user_id"],"dog_id"=>$app["dog_id"]];

        case "db.enquiry.send":
            if (!isset($data["user_id"])) return ["success"=>false,"error"=>"Missing user_id"];
            $userId=(int)$data["user_id"]; $dogId=(int)($data["dog_id"]??0); $shelterId=(int)($data["shelter_id"]??0);
            $message=$db->real_escape_string($data["message"]??'');
            $db->query("INSERT INTO chat_sessions (user_id,dog_id,shelter_id,status) VALUES ({$userId},{$dogId},{$shelterId},'open')");
            $sessionId=$db->insert_id;
            $db->query("INSERT INTO chat_messages (session_id,sender_id,message,created_at) VALUES ({$sessionId},{$userId},'{$message}',NOW())");
            return ["success"=>true,"session_id"=>$sessionId];

        case "db.api.dog.upsert":
            $shelterId=(int)($data['shelter_id']??0); $externalId=$db->real_escape_string($data['external_id']??'');
            $name=$db->real_escape_string($data['name']??''); $breed=$db->real_escape_string($data['breed']??'');
            $ageYears=(int)($data['age_years']??0); $size=$db->real_escape_string($data['size']??'medium');
            $gender=$db->real_escape_string($data['gender']??'male'); $description=$db->real_escape_string($data['description']??'');
            $energy=$db->real_escape_string($data['energy_level']??'medium'); $training=$db->real_escape_string($data['training_level']??'basic');
            $activity=$db->real_escape_string($data['ideal_owner_activity']??'moderate');
            $goodKids=!empty($data['good_with_kids'])?1:0; $goodDogs=!empty($data['good_with_dogs'])?1:0;
            $goodCats=!empty($data['good_with_cats'])?1:0; $apartment=!empty($data['apartment_friendly'])?1:0;
            $yard=!empty($data['requires_yard'])?1:0; $vaccinated=!empty($data['is_vaccinated'])?1:0;
            $spayed=!empty($data['is_spayed_neutered'])?1:0; $intakeDate=$db->real_escape_string($data['intake_date']??date('Y-m-d'));
            $status=$db->real_escape_string($data['status']??'available'); $source=$db->real_escape_string($data['source']??'api');
            $dogId=null; $action='inserted';
            if ($externalId) { $check=$db->query("SELECT dog_id FROM dogs WHERE external_id='{$externalId}' LIMIT 1"); if($check&&$check->num_rows>0){$dogId=(int)$check->fetch_assoc()['dog_id'];$action='updated';} }
            if ($dogId) {
                $sql="UPDATE dogs SET name='{$name}',breed='{$breed}',age_years={$ageYears},size='{$size}',gender='{$gender}',description='{$description}',energy_level='{$energy}',training_level='{$training}',ideal_owner_activity='{$activity}',good_with_kids={$goodKids},good_with_dogs={$goodDogs},good_with_cats={$goodCats},apartment_friendly={$apartment},requires_yard={$yard},is_vaccinated={$vaccinated},is_spayed_neutered={$spayed},status='{$status}',source='{$source}',last_synced_at=NOW() WHERE dog_id={$dogId}";
            } else {
                $sql="INSERT INTO dogs (shelter_id,name,breed,age_years,size,gender,description,energy_level,training_level,ideal_owner_activity,good_with_kids,good_with_dogs,good_with_cats,apartment_friendly,requires_yard,is_vaccinated,is_spayed_neutered,intake_date,status,source,external_id,last_synced_at) VALUES ({$shelterId},'{$name}','{$breed}',{$ageYears},'{$size}','{$gender}','{$description}','{$energy}','{$training}','{$activity}',{$goodKids},{$goodDogs},{$goodCats},{$apartment},{$yard},{$vaccinated},{$spayed},'{$intakeDate}','{$status}','{$source}','{$externalId}',NOW())";
            }
            logMsg("Executing SQL: ".$sql); if (!$db->query($sql)) return ["success"=>false,"error"=>$db->error];
            if ($action==='inserted') $dogId=(int)$db->insert_id;
            if (!empty($data['photos'])&&is_array($data['photos'])) {
                $db->query("DELETE FROM dog_photos WHERE dog_id={$dogId}"); $hasPrimary=false;
                foreach($data['photos'] as $photo) { if(empty($photo['url']))continue; $url=$db->real_escape_string($photo['url']); $caption=$db->real_escape_string($photo['caption']??''); $isPrimary=(!$hasPrimary&&!empty($photo['is_primary']))?1:0; if($isPrimary)$hasPrimary=true; $db->query("INSERT INTO dog_photos (dog_id,photo_url,is_primary,caption) VALUES ({$dogId},'{$url}',{$isPrimary},'{$caption}')"); }
            }
            logMsg("Dog {$action}: dog_id={$dogId} breed={$breed}");
            return ["success"=>true,"dog_id"=>$dogId,"action"=>$action];

        default:
            logMsg("No SQL handler defined for ".$queue);
            return ["status"=>"queue received","queue"=>$queue];
    }
}

$callback = function($msg) use ($channel, &$db, &$connection, $dbHosts, $rmqHosts, $port, $user, $pass) {
    $queue         = $msg->delivery_info['routing_key'];
    $body          = $msg->body;
    $msgProps      = $msg->get_properties();
    $correlationId = $msgProps['correlation_id'] ?? null;
    $replyTo       = $msgProps['reply_to'] ?? '';

    logMsg("Message received from " . $queue);
    logMsg("Raw body: " . $body);

    try {
        if (!$db->ping()) {
            logMsg("[CLUSTER] MySQL ping failed — connection lost, reconnecting...");
            $db = reconnectDb($dbHosts, $_ENV['DB_USER'], $_ENV['DB_PASS'], $_ENV['DB_NAME'], (int)$_ENV['DB_PORT']);
            if (!$db) { logMsg("[CLUSTER] Could not reconnect to any MySQL node — dropping message"); return; }
        }

        $data = json_decode($body, true);
        if (!is_array($data)) $data = [];
        $result = handleQuery($queue, $data, $db);

    } catch (\Throwable $e) {
        logMsg("[CLUSTER] Query failed: " . $e->getMessage() . " — reconnecting to next MySQL node...");
        $db = reconnectDb($dbHosts, $_ENV['DB_USER'], $_ENV['DB_PASS'], $_ENV['DB_NAME'], (int)$_ENV['DB_PORT']);
        if ($db) {
            try {
                $data = json_decode($body, true);
                if (!is_array($data)) $data = [];
                $result = handleQuery($queue, $data, $db);
                logMsg("[CLUSTER] Query succeeded after MySQL failover");
            } catch (\Throwable $e2) {
                logMsg("[CLUSTER] Retry failed: " . $e2->getMessage());
                $result = ['success' => false, 'error' => $e2->getMessage()];
            }
        } else {
            logMsg("[CLUSTER] All MySQL nodes unreachable — returning error");
            $result = ['success' => false, 'error' => "All MySQL nodes unreachable"];
        }
    }

    $resultQueue = ($replyTo !== '') ? $replyTo : ("db.result." . substr($queue, strlen("db.")));
    $props = ['content_type' => 'application/json', 'delivery_mode' => 2];
    if ($correlationId) $props['correlation_id'] = $correlationId;

    logMsg("Sending result to " . $resultQueue);
    logMsg("Response: " . json_encode($result));

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

    logMsg("Request processed");
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