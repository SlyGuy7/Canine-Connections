<?php

require_once __DIR__ . '/../vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Dotenv\Dotenv;

function logMsg($msg) {
    echo "[" . date("H:i:s") . "] " . $msg . PHP_EOL;
}

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$host = $_ENV['RABBITMQ_HOST'];
$port = (int) $_ENV['RABBITMQ_PORT'];
$user = $_ENV['RABBITMQ_USER'];
$pass = $_ENV['RABBITMQ_PASS'];

logMsg("Connecting to RabbitMQ...");

$connection = new AMQPStreamConnection($host, $port, $user, $pass, "/");
$channel = $connection->channel();

logMsg("RabbitMQ connected");

logMsg("Connecting to MySQL...");

$db = new mysqli(
    $_ENV['DB_HOST'],
    $_ENV['DB_USER'],
    $_ENV['DB_PASS'],
    $_ENV['DB_NAME'],
    (int) $_ENV['DB_PORT']
);

if ($db->connect_error) {
    die("MySQL connection failed: " . $db->connect_error . PHP_EOL);
}

logMsg("MySQL connected");

$queues = [
    'db.auth.register',
    'db.auth.login',

    'db.shelters.list',
    'db.shelters.get',

    'db.api.key.get',
    'db.api.key.regenerate',
    'db.api.key.validate',
    'db.api.logs',
    'db.api.log',
    'db.api.dog.upsert',

    'db.dogs.list',
    'db.dogs.get',

    'db.application.submit',
    'db.application.status',
    'db.application.list',
    'db.application.approve',
    'db.application.reject',

    'db.adoptions.list',
    'db.adoptions.get',
    'db.adoptions.finalize',

    'db.quiz.questions',
    'db.quiz.submit',
    'db.quiz.results',

    'db.adoption.log.create',
    'db.adoption.log.list',

    'db.foster.apply',
    'db.foster.list',
    'db.foster.cancel',

    'db.parks.list',

    'db.resources.list',
    'db.resources.get',

    'db.stories.list',
    'db.stories.submit',
    'db.stories.approve',

    'db.badges.list',
    'db.badges.mine',

    'db.enquiry.send',
    'db.chat.start',
    'db.chat.message',
    'db.chat.history',

    'db.meetgreet.schedule',
    'db.meetgreet.list',
    'db.meetgreet.cancel',

    'db.notifications.list',
    'db.notifications.read'
];

logMsg("Declaring queues...");

foreach ($queues as $q) {
    $channel->queue_declare($q, false, true, false, false);
    logMsg("Queue ready: " . $q);
}

function fetchAllAssoc($result) {
    if (!$result) {
        return [];
    }
    return $result->fetch_all(MYSQLI_ASSOC);
}

function fetchOneAssoc($result) {
    if (!$result) {
        return null;
    }
    return $result->fetch_assoc();
}

function handleQuery($queue, $data, $db) {
    logMsg("Processing queue: " . $queue);
    logMsg("Payload: " . json_encode($data));

    switch ($queue) {

        case "db.auth.register":
            if (!isset($data["email"]) || !isset($data["password"])) {
                return [
                    "status" => "error",
                    "message" => "Missing email or password"
                ];
            }

            $email = $db->real_escape_string($data["email"]);
            $plainPassword = $data["password"];
            $passwordHash = $db->real_escape_string(password_hash($plainPassword, PASSWORD_BCRYPT));

            $sql = "INSERT INTO users (email, password_hash) VALUES ('$email', '$passwordHash')";
            logMsg("Executing SQL: " . $sql);

            if (!$db->query($sql)) {
                return [
                    "status" => "error",
                    "message" => $db->error
                ];
            }

            return [
                "status" => "registered",
                "user_id" => $db->insert_id
            ];

        case "db.auth.login":
            if (!isset($data["email"]) || !isset($data["password"])) {
                return [
                    "status" => "error",
                    "message" => "Missing email or password"
                ];
            }

            $email = $db->real_escape_string($data["email"]);
            $plainPassword = $data["password"];

            $sql = "SELECT user_id, email, password_hash, role, first_name, last_name
                    FROM users
                    WHERE email='$email'
                    LIMIT 1";
            logMsg("Executing SQL: " . $sql);

            $result = $db->query($sql);

            if (!$result || $result->num_rows === 0) {
                return [
                    "status" => "not_found",
                    "message" => "User not found"
                ];
            }

            $user = $result->fetch_assoc();

            if (!password_verify($plainPassword, $user["password_hash"])) {
                return [
                    "status" => "invalid_password",
                    "message" => "Invalid password"
                ];
            }

            unset($user["password_hash"]);

            return [
                "status" => "success",
                "user" => $user
            ];

        case "db.dogs.list":
            $sql = "SELECT * FROM dogs";
            logMsg("Executing SQL: " . $sql);
            $result = $db->query($sql);
            if (!$result) {
                return ["status" => "error", "message" => $db->error];
            }
            return [
                "status" => "success",
                "data" => fetchAllAssoc($result)
            ];

        case "db.dogs.get":
            if (!isset($data["id"])) {
                return ["status" => "error", "message" => "Missing dog id"];
            }

            $id = (int) $data["id"];
            $sql = "SELECT * FROM dogs WHERE dog_id='$id' LIMIT 1";
            logMsg("Executing SQL: " . $sql);
            $result = $db->query($sql);
            if (!$result) {
                return ["status" => "error", "message" => $db->error];
            }
            return [
                "status" => "success",
                "data" => fetchOneAssoc($result)
            ];

        case "db.shelters.list":
            $sql = "SELECT * FROM shelters";
            logMsg("Executing SQL: " . $sql);
            $result = $db->query($sql);
            if (!$result) {
                return ["status" => "error", "message" => $db->error];
            }
            return [
                "status" => "success",
                "data" => fetchAllAssoc($result)
            ];

        case "db.shelters.get":
            if (!isset($data["id"])) {
                return ["status" => "error", "message" => "Missing shelter id"];
            }

            $id = (int) $data["id"];
            $sql = "SELECT * FROM shelters WHERE shelter_id='$id' LIMIT 1";
            logMsg("Executing SQL: " . $sql);
            $result = $db->query($sql);
            if (!$result) {
                return ["status" => "error", "message" => $db->error];
            }
            return [
                "status" => "success",
                "data" => fetchOneAssoc($result)
            ];

        case "db.application.submit":
            if (!isset($data["user_id"]) || !isset($data["dog_id"])) {
                return [
                    "status" => "error",
                    "message" => "Missing user_id or dog_id"
                ];
            }

            $userId = (int) $data["user_id"];
            $dogId = (int) $data["dog_id"];

            $sql = "INSERT INTO adoption_applications (user_id, dog_id, status)
                    VALUES ('$userId', '$dogId', 'pending')";
            logMsg("Executing SQL: " . $sql);

            if (!$db->query($sql)) {
                return [
                    "status" => "error",
                    "message" => $db->error
                ];
            }

            return [
                "status" => "application submitted",
                "application_id" => $db->insert_id
            ];

        case "db.application.list":
            $sql = "SELECT * FROM adoption_applications";
            logMsg("Executing SQL: " . $sql);
            $result = $db->query($sql);
            if (!$result) {
                return ["status" => "error", "message" => $db->error];
            }
            return [
                "status" => "success",
                "data" => fetchAllAssoc($result)
            ];

        case "db.parks.list":
            $sql = "SELECT * FROM pet_parks";
            logMsg("Executing SQL: " . $sql);
            $result = $db->query($sql);
            if (!$result) {
                return ["status" => "error", "message" => $db->error];
            }
            return [
                "status" => "success",
                "data" => fetchAllAssoc($result)
            ];

        case "db.resources.list":
            $sql = "SELECT * FROM resources";
            logMsg("Executing SQL: " . $sql);
            $result = $db->query($sql);
            if (!$result) {
                return ["status" => "error", "message" => $db->error];
            }
            return [
                "status" => "success",
                "data" => fetchAllAssoc($result)
            ];

        case "db.resources.get":
            if (!isset($data["id"])) {
                return ["status" => "error", "message" => "Missing resource id"];
            }

            $id = (int) $data["id"];
            $sql = "SELECT * FROM resources WHERE resource_id='$id' LIMIT 1";
            logMsg("Executing SQL: " . $sql);
            $result = $db->query($sql);
            if (!$result) {
                return ["status" => "error", "message" => $db->error];
            }
            return [
                "status" => "success",
                "data" => fetchOneAssoc($result)
            ];

        case "db.notifications.list":
            if (!isset($data["user_id"])) {
                return ["status" => "error", "message" => "Missing user_id"];
            }

            $userId = (int) $data["user_id"];
            $sql = "SELECT * FROM notifications WHERE user_id='$userId'";
            logMsg("Executing SQL: " . $sql);
            $result = $db->query($sql);
            if (!$result) {
                return ["status" => "error", "message" => $db->error];
            }
            return [
                "status" => "success",
                "data" => fetchAllAssoc($result)
            ];

        case "db.api.dog.upsert":
            $shelterId   = (int)($data['shelter_id'] ?? 0);
            $externalId  = $db->real_escape_string($data['external_id'] ?? '');
            $name        = $db->real_escape_string($data['name'] ?? '');
            $breed       = $db->real_escape_string($data['breed'] ?? '');
            $ageYears    = (int)($data['age_years'] ?? 0);
            $size        = $db->real_escape_string($data['size'] ?? 'medium');
            $gender      = $db->real_escape_string($data['gender'] ?? 'male');
            $description = $db->real_escape_string($data['description'] ?? '');
            $energy      = $db->real_escape_string($data['energy_level'] ?? 'medium');
            $goodKids    = !empty($data['good_with_kids'])     ? 1 : 0;
            $goodDogs    = !empty($data['good_with_dogs'])     ? 1 : 0;
            $goodCats    = !empty($data['good_with_cats'])     ? 1 : 0;
            $apartment   = !empty($data['apartment_friendly']) ? 1 : 0;
            $vaccinated  = !empty($data['is_vaccinated'])      ? 1 : 0;
            $spayed      = !empty($data['is_spayed_neutered']) ? 1 : 0;
            $intakeDate  = $db->real_escape_string($data['intake_date'] ?? date('Y-m-d'));
            $status      = $db->real_escape_string($data['status'] ?? 'available');

            $dogId  = null;
            $action = 'inserted';

            if ($externalId) {
                $check = $db->query("SELECT dog_id FROM dogs WHERE shelter_id={$shelterId} AND external_id='{$externalId}' LIMIT 1");
                if ($check && $check->num_rows > 0) {
                    $dogId  = (int)$check->fetch_assoc()['dog_id'];
                    $action = 'updated';
                }
            }

            if ($dogId) {
                $sql = "UPDATE dogs SET
                    name='{$name}', breed='{$breed}', age_years={$ageYears},
                    size='{$size}', gender='{$gender}', description='{$description}',
                    energy_level='{$energy}', good_with_kids={$goodKids},
                    good_with_dogs={$goodDogs}, good_with_cats={$goodCats},
                    apartment_friendly={$apartment}, is_vaccinated={$vaccinated},
                    is_spayed_neutered={$spayed}, status='{$status}'
                    WHERE dog_id={$dogId}";
            } else {
                $sql = "INSERT INTO dogs (shelter_id, name, breed, age_years, size, gender,
                    description, energy_level, good_with_kids, good_with_dogs, good_with_cats,
                    apartment_friendly, is_vaccinated, is_spayed_neutered, intake_date,
                    status, external_id)
                    VALUES ({$shelterId}, '{$name}', '{$breed}', {$ageYears}, '{$size}',
                    '{$gender}', '{$description}', '{$energy}', {$goodKids}, {$goodDogs},
                    {$goodCats}, {$apartment}, {$vaccinated}, {$spayed}, '{$intakeDate}',
                    '{$status}', '{$externalId}')";
            }

            logMsg("Executing SQL: " . $sql);

            if (!$db->query($sql)) {
                return ["success" => false, "error" => $db->error];
            }

            if ($action === 'inserted') {
                $dogId = (int)$db->insert_id;
            }

            if (!empty($data['photos']) && is_array($data['photos'])) {
                $db->query("DELETE FROM dog_photos WHERE dog_id={$dogId}");
                $hasPrimary = false;
                foreach ($data['photos'] as $photo) {
                    if (empty($photo['url'])) continue;
                    $url       = $db->real_escape_string($photo['url']);
                    $caption   = $db->real_escape_string($photo['caption'] ?? '');
                    $isPrimary = (!$hasPrimary && !empty($photo['is_primary'])) ? 1 : 0;
                    if ($isPrimary) $hasPrimary = true;
                    $db->query("INSERT INTO dog_photos (dog_id, photo_url, is_primary, caption)
                                VALUES ({$dogId}, '{$url}', {$isPrimary}, '{$caption}')");
                }
            }

            logMsg("Dog {$action}: dog_id={$dogId} breed={$breed}");

            return ["success" => true, "dog_id" => $dogId, "action" => $action];

        default:
            logMsg("No SQL handler defined for " . $queue);
            return [
                "status" => "queue received",
                "queue" => $queue
            ];
    }
}

$callback = function($msg) use ($channel, $db) {
    $queue = $msg->delivery_info['routing_key'];
    logMsg("Message received from " . $queue);
    logMsg("Raw body: " . $msg->body);

    try {
        $data = json_decode($msg->body, true);

        if (!is_array($data)) {
            $data = [];
        }

        $result = handleQuery($queue, $data, $db);

    } catch (\Throwable $e) {
        logMsg("Worker error: " . $e->getMessage());
        $result = [
            "status" => "error",
            "message" => $e->getMessage()
        ];
    }

    $resultQueue = "db.result." . explode("db.", $queue)[1];

    logMsg("Sending result to " . $resultQueue);
    logMsg("Response: " . json_encode($result));

    $response = new AMQPMessage(
        json_encode($result),
        ['content_type' => 'application/json', 'delivery_mode' => 2]
    );

    $channel->basic_publish($response, '', $resultQueue);

    logMsg("Request processed\n");
};

foreach ($queues as $q) {
    $channel->basic_consume($q, '', false, true, false, false, $callback);
}

logMsg("Database worker is listening...");

while ($channel->is_consuming()) {
    $channel->wait();
}