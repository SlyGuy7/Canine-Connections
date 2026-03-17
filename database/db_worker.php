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
    if (!$result) return [];
    return $result->fetch_all(MYSQLI_ASSOC);
}

function fetchOneAssoc($result) {
    if (!$result) return null;
    return $result->fetch_assoc();
}

function handleQuery($queue, $data, $db) {
    logMsg("Processing queue: " . $queue);
    logMsg("Payload: " . json_encode($data));

    switch ($queue) {
        case "db.auth.register":
            if (!isset($data["email"]) || !isset($data["password_hash"])) {
                return ["success" => false, "error" => "Missing email or password_hash"];
            }

            // Escaping all fields to prevent SQL injection
            $email        = $db->real_escape_string($data["email"]);
            $passwordHash = $db->real_escape_string($data["password_hash"]);
            $firstName    = $db->real_escape_string($data["first_name"] ?? '');
            $lastName     = $db->real_escape_string($data["last_name"] ?? '');
            $phone        = $db->real_escape_string($data["phone"] ?? '');
            $address      = $db->real_escape_string($data["address"] ?? '');
            $role         = $db->real_escape_string($data["role"] ?? 'adopter');

            // 1. Check if the user already exists
            $check = $db->query("SELECT user_id FROM users WHERE email='{$email}' LIMIT 1");
            if ($check && $check->num_rows > 0) {
                return ["success" => false, "error" => "Email already registered"];
            }

            // 2. Insert the new user with all profile fields
            $sql = "INSERT INTO users (email, password_hash, first_name, last_name, phone, address, role)
                    VALUES ('{$email}', '{$passwordHash}', '{$firstName}', '{$lastName}', '{$phone}', '{$address}', '{$role}')";
            
            logMsg("Executing SQL: " . $sql);

            if (!$db->query($sql)) {
                return ["success" => false, "error" => $db->error];
            }

            // 3. Return the success and the new user_id (This fixes the BackendWorker warning)
            return ["success" => true, "user_id" => $db->insert_id];

        case "db.auth.login":
            if (!isset($data["email"]) || !isset($data["password"])) {
                return ["success" => false, "error" => "Missing email or password"];
            }

            $email = $db->real_escape_string($data["email"]);
            $plainPassword = $data["password"];

            $sql = "SELECT user_id, email, password_hash, role, first_name, last_name
                    FROM users
                    WHERE email='{$email}'
                    LIMIT 1";
            logMsg("Executing SQL: " . $sql);

            $result = $db->query($sql);

            if (!$result || $result->num_rows === 0) {
                return ["success" => false, "error" => "Invalid email or password"];
            }

            $user = $result->fetch_assoc();

            if (!password_verify($plainPassword, $user["password_hash"])) {
                return ["success" => false, "error" => "Invalid email or password"];
            }
            return ["success" => true, "user" => $user];

        case "db.dogs.list":
            $sql = "SELECT d.*, GROUP_CONCAT(p.photo_url ORDER BY p.is_primary DESC) as photos
                    FROM dogs d
                    LEFT JOIN dog_photos p ON d.dog_id = p.dog_id
                    WHERE d.status = 'available'
                    GROUP BY d.dog_id";
            logMsg("Executing SQL: " . $sql);
            $result = $db->query($sql);
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "dogs" => fetchAllAssoc($result)];

        case "db.dogs.get":
            if (!isset($data["dog_id"])) return ["success" => false, "error" => "Missing dog_id"];
            $id = (int)$data["dog_id"];
            $result = $db->query("SELECT * FROM dogs WHERE dog_id={$id} LIMIT 1");
            if (!$result) return ["success" => false, "error" => $db->error];
            $dog = fetchOneAssoc($result);
            if ($dog) {
                $photos = $db->query("SELECT * FROM dog_photos WHERE dog_id={$id} ORDER BY is_primary DESC");
                $dog['photos'] = fetchAllAssoc($photos);
            }
            return $dog ? ["success" => true, "dog" => $dog] : ["success" => false, "error" => "Dog not found"];

        case "db.shelters.list":
            $result = $db->query("SELECT * FROM shelters");
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "shelters" => fetchAllAssoc($result)];

        case "db.shelters.get":
            if (!isset($data["shelter_id"])) return ["success" => false, "error" => "Missing shelter_id"];
            $id = (int)$data["shelter_id"];
            $result = $db->query("SELECT * FROM shelters WHERE shelter_id={$id} LIMIT 1");
            if (!$result) return ["success" => false, "error" => $db->error];
            $shelter = fetchOneAssoc($result);
            return $shelter ? ["success" => true, "shelter" => $shelter] : ["success" => false, "error" => "Shelter not found"];

        case "db.application.submit":
            if (!isset($data["user_id"]) || !isset($data["dog_id"])) {
                return ["success" => false, "error" => "Missing user_id or dog_id"];
            }
            $userId = (int)$data["user_id"];
            $dogId = (int)$data["dog_id"];
            $sql = "INSERT INTO adoption_applications (user_id, dog_id, status) VALUES ({$userId}, {$dogId}, 'pending')";
            logMsg("Executing SQL: " . $sql);
            if (!$db->query($sql)) return ["success" => false, "error" => $db->error];
            return ["success" => true, "application_id" => $db->insert_id];

        case "db.application.list":
            $result = $db->query("SELECT * FROM adoption_applications ORDER BY application_id DESC");
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "applications" => fetchAllAssoc($result)];

        case "db.application.approve":
            if (!isset($data["application_id"])) return ["success" => false, "error" => "Missing application_id"];
            $id = (int)$data["application_id"];
            $db->query("UPDATE adoption_applications SET status='approved' WHERE application_id={$id}");
            $row = fetchOneAssoc($db->query("SELECT user_id FROM adoption_applications WHERE application_id={$id}"));
            return ["success" => true, "user_id" => $row['user_id'] ?? null];

        case "db.application.reject":
            if (!isset($data["application_id"])) return ["success" => false, "error" => "Missing application_id"];
            $id = (int)$data["application_id"];
            $db->query("UPDATE adoption_applications SET status='rejected' WHERE application_id={$id}");
            $row = fetchOneAssoc($db->query("SELECT user_id FROM adoption_applications WHERE application_id={$id}"));
            return ["success" => true, "user_id" => $row['user_id'] ?? null];

        case "db.parks.list":
            $result = $db->query("SELECT * FROM pet_parks");
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "parks" => fetchAllAssoc($result)];

        case "db.resources.list":
            $result = $db->query("SELECT * FROM resources ORDER BY created_at DESC");
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "resources" => fetchAllAssoc($result)];

        case "db.resources.get":
            if (!isset($data["resource_id"])) return ["success" => false, "error" => "Missing resource_id"];
            $id = (int)$data["resource_id"];
            $result = $db->query("SELECT * FROM resources WHERE resource_id={$id} LIMIT 1");
            if (!$result) return ["success" => false, "error" => $db->error];
            $resource = fetchOneAssoc($result);
            return $resource ? ["success" => true, "resource" => $resource] : ["success" => false, "error" => "Not found"];

        case "db.notifications.list":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            $result = $db->query("SELECT * FROM notifications WHERE user_id={$userId} ORDER BY created_at DESC LIMIT 50");
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "notifications" => fetchAllAssoc($result)];

        case "db.notifications.read":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            if (!empty($data["notification_id"])) {
                $nid = (int)$data["notification_id"];
                $db->query("UPDATE notifications SET is_read=1 WHERE notification_id={$nid} AND user_id={$userId}");
            } else {
                $db->query("UPDATE notifications SET is_read=1 WHERE user_id={$userId}");
            }
            return ["success" => true];

        case "db.stories.list":
            $limit = (int)($data['limit'] ?? 10);
            $offset = (int)($data['offset'] ?? 0);
            $result = $db->query("SELECT ss.*, u.first_name, u.last_name FROM success_stories ss JOIN users u ON ss.user_id = u.user_id WHERE ss.status='approved' ORDER BY ss.created_at DESC LIMIT {$limit} OFFSET {$offset}");
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "stories" => fetchAllAssoc($result)];

        case "db.stories.submit":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            $dogId = isset($data["dog_id"]) ? (int)$data["dog_id"] : "NULL";
            $title = $db->real_escape_string($data["title"] ?? '');
            $story = $db->real_escape_string($data["story"] ?? '');
            $photoUrl = $db->real_escape_string($data["photo_url"] ?? '');
            $dogIdVal = is_int($dogId) ? $dogId : "NULL";
            $db->query("INSERT INTO success_stories (user_id, dog_id, title, story, photo_url, status, created_at) VALUES ({$userId}, {$dogIdVal}, '{$title}', '{$story}', '{$photoUrl}', 'pending', NOW())");
            return ["success" => true, "story_id" => $db->insert_id];

        case "db.stories.approve":
            if (!isset($data["story_id"])) return ["success" => false, "error" => "Missing story_id"];
            $id = (int)$data["story_id"];
            $approvedBy = isset($data["approved_by"]) ? (int)$data["approved_by"] : "NULL";
            $db->query("UPDATE success_stories SET status='approved', approved_by={$approvedBy} WHERE story_id={$id}");
            return ["success" => true];

        case "db.badges.list":
            $result = $db->query("SELECT * FROM badges ORDER BY badge_id ASC");
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "badges" => fetchAllAssoc($result)];

        case "db.badges.mine":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            if (!empty($data["auto_award"])) {
                $trigger = $db->real_escape_string($data["auto_award"]);
                $badge = fetchOneAssoc($db->query("SELECT * FROM badges WHERE trigger_name='{$trigger}' LIMIT 1"));
                if ($badge) {
                    $hasIt = fetchOneAssoc($db->query("SELECT 1 FROM user_badges WHERE user_id={$userId} AND badge_id={$badge['badge_id']} LIMIT 1"));
                    if (!$hasIt) {
                        $db->query("INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES ({$userId}, {$badge['badge_id']}, NOW())");
                    }
                }
            }
            $result = $db->query("SELECT b.*, ub.earned_at FROM user_badges ub JOIN badges b ON ub.badge_id = b.badge_id WHERE ub.user_id={$userId} ORDER BY ub.earned_at DESC");
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "badges" => fetchAllAssoc($result)];

        case "db.chat.start":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            $dogId = (int)($data["dog_id"] ?? 0);
            $shelterId = (int)($data["shelter_id"] ?? 0);
            $existing = fetchOneAssoc($db->query("SELECT session_id FROM chat_sessions WHERE user_id={$userId} AND dog_id={$dogId} AND shelter_id={$shelterId} AND status='open' LIMIT 1"));
            if ($existing) return ["success" => true, "session_id" => $existing["session_id"]];
            $db->query("INSERT INTO chat_sessions (user_id, dog_id, shelter_id, status) VALUES ({$userId}, {$dogId}, {$shelterId}, 'open')");
            return ["success" => true, "session_id" => $db->insert_id];

        case "db.chat.message":
            if (!isset($data["session_id"]) || !isset($data["sender_id"])) return ["success" => false, "error" => "Missing fields"];
            $sessionId = (int)$data["session_id"];
            $senderId = (int)$data["sender_id"];
            $message = $db->real_escape_string($data["message"] ?? '');
            $db->query("INSERT INTO chat_messages (session_id, sender_id, message, created_at) VALUES ({$sessionId}, {$senderId}, '{$message}', NOW())");
            return ["success" => true, "message_id" => $db->insert_id];

        case "db.chat.history":
            if (!isset($data["session_id"])) return ["success" => false, "error" => "Missing session_id"];
            $sessionId = (int)$data["session_id"];
            $result = $db->query("SELECT cm.*, u.first_name, u.last_name FROM chat_messages cm JOIN users u ON cm.sender_id = u.user_id WHERE cm.session_id={$sessionId} ORDER BY cm.created_at ASC");
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "messages" => fetchAllAssoc($result)];

        case "db.meetgreet.schedule":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            $dogId = (int)($data["dog_id"] ?? 0);
            $shelterId = (int)($data["shelter_id"] ?? 0);
            $date = $db->real_escape_string($data["scheduled_date"] ?? '');
            $time = $db->real_escape_string($data["scheduled_time"] ?? '');
            $link = $db->real_escape_string($data["video_link"] ?? '');
            $db->query("INSERT INTO meet_greet_sessions (user_id, dog_id, shelter_id, scheduled_date, scheduled_time, video_link, status) VALUES ({$userId}, {$dogId}, {$shelterId}, '{$date}', '{$time}', '{$link}', 'scheduled')");
            return ["success" => true, "session_id" => $db->insert_id];

        case "db.meetgreet.list":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            $result = $db->query("SELECT mg.*, d.name as dog_name FROM meet_greet_sessions mg JOIN dogs d ON mg.dog_id = d.dog_id WHERE mg.user_id={$userId} ORDER BY mg.scheduled_date ASC");
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "sessions" => fetchAllAssoc($result)];

        case "db.meetgreet.cancel":
            if (!isset($data["session_id"])) return ["success" => false, "error" => "Missing session_id"];
            $id = (int)$data["session_id"];
            $userId = (int)($data["user_id"] ?? 0);
            $db->query("UPDATE meet_greet_sessions SET status='cancelled' WHERE session_id={$id} AND user_id={$userId}");
            return ["success" => true];

        case "db.foster.apply":
            if (!isset($data["user_id"]) || !isset($data["dog_id"])) return ["success" => false, "error" => "Missing fields"];
            $userId = (int)$data["user_id"];
            $dogId = (int)$data["dog_id"];
            $amount = (float)($data["sponsorship_amount"] ?? 0);
            $startDate = $db->real_escape_string($data["start_date"] ?? date('Y-m-d'));
            $db->query("INSERT INTO virtual_foster (user_id, dog_id, sponsorship_amount, status, start_date) VALUES ({$userId}, {$dogId}, {$amount}, 'active', '{$startDate}')");
            return ["success" => true, "foster_id" => $db->insert_id];

        case "db.foster.list":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            $result = $db->query("SELECT vf.*, d.name as dog_name FROM virtual_foster vf JOIN dogs d ON vf.dog_id = d.dog_id WHERE vf.user_id={$userId} ORDER BY vf.start_date DESC");
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "fosters" => fetchAllAssoc($result)];

        case "db.foster.cancel":
            if (!isset($data["foster_id"])) return ["success" => false, "error" => "Missing foster_id"];
            $id = (int)$data["foster_id"];
            $userId = (int)($data["user_id"] ?? 0);
            $db->query("UPDATE virtual_foster SET status='cancelled' WHERE foster_id={$id} AND user_id={$userId}");
            return ["success" => true];

        case "db.adoption.log.create":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            $dogId = (int)$data["dog_id"] ?? 0;
            $logType = $db->real_escape_string($data["log_type"] ?? 'general');
            $title = $db->real_escape_string($data["title"] ?? '');
            $notes = $db->real_escape_string($data["notes"] ?? '');
            $logDate = $db->real_escape_string($data["log_date"] ?? date('Y-m-d'));
            $db->query("INSERT INTO post_adoption_logs (user_id, dog_id, log_type, title, notes, log_date) VALUES ({$userId}, {$dogId}, '{$logType}', '{$title}', '{$notes}', '{$logDate}')");
            return ["success" => true, "log_id" => $db->insert_id];

        case "db.adoption.log.list":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            $dogId = (int)$data["dog_id"] ?? 0;
            $result = $db->query("SELECT * FROM post_adoption_logs WHERE user_id={$userId} AND dog_id={$dogId} ORDER BY log_date DESC");
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "logs" => fetchAllAssoc($result)];

        case "db.quiz.questions":
            $questions = fetchAllAssoc($db->query("SELECT * FROM quiz_questions ORDER BY question_id ASC"));
            $options = fetchAllAssoc($db->query("SELECT * FROM quiz_options ORDER BY question_id ASC, option_id ASC"));
            $optMap = [];
            foreach ($options as $opt) $optMap[$opt['question_id']][] = $opt;
            foreach ($questions as &$q) $q['options'] = $optMap[$q['question_id']] ?? [];
            return ["success" => true, "questions" => $questions];

        case "db.quiz.submit":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            $answers = $data["answers"] ?? [];
            $matched = [];
            if (!empty($answers)) {
                $placeholders = implode(',', array_fill(0, count($answers), '?'));
                $stmt = $db->prepare("SELECT * FROM quiz_options WHERE option_id IN ({$placeholders})");
                $types = str_repeat('i', count($answers));
                $stmt->bind_param($types, ...array_values($answers));
                $stmt->execute();
                $opts = fetchAllAssoc($stmt->get_result());
                $traitScores = [];
                foreach ($opts as $opt) if (!empty($opt['trait_key'])) $traitScores[$opt['trait_key']] = $opt['trait_value'];
                $sql = "SELECT dog_id FROM dogs WHERE status='available'";
                if (!empty($traitScores['energy_level'])) { $sql .= " AND energy_level='".$db->real_escape_string($traitScores['energy_level'])."'"; }
                if (!empty($traitScores['size'])) { $sql .= " AND size='".$db->real_escape_string($traitScores['size'])."'"; }
                if (isset($traitScores['good_with_kids'])) { $sql .= " AND good_with_kids=".(int)$traitScores['good_with_kids']; }
                if (isset($traitScores['apartment_friendly'])) { $sql .= " AND apartment_friendly=".(int)$traitScores['apartment_friendly']; }
                $sql .= " LIMIT 10";
                $result = $db->query($sql);
                $matched = array_column(fetchAllAssoc($result), 'dog_id');
            }
            $answersJson = $db->real_escape_string(json_encode($answers));
            $matchedJson = $db->real_escape_string(json_encode($matched));
            $db->query("INSERT INTO quiz_results (user_id, answers_json, matched_dog_ids) VALUES ({$userId}, '{$answersJson}', '{$matchedJson}') ON DUPLICATE KEY UPDATE answers_json='{$answersJson}', matched_dog_ids='{$matchedJson}'");
            return ["success" => true, "matched_dog_ids" => $matched];

        case "db.quiz.results":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            $result = fetchOneAssoc($db->query("SELECT * FROM quiz_results WHERE user_id={$userId} ORDER BY result_id DESC LIMIT 1"));
            return $result ? ["success" => true, "result" => $result] : ["success" => false, "error" => "No results found"];

        case "db.adoptions.list":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            $result = $db->query("SELECT a.*, d.name as dog_name, d.breed FROM adoptions a JOIN dogs d ON a.dog_id = d.dog_id WHERE a.user_id={$userId} ORDER BY a.adoption_id DESC");
            if (!$result) return ["success" => false, "error" => $db->error];
            return ["success" => true, "adoptions" => fetchAllAssoc($result)];

        case "db.adoptions.finalize":
            if (!isset($data["application_id"])) return ["success" => false, "error" => "Missing application_id"];
            $appId = (int)$data["application_id"];
            $app = fetchOneAssoc($db->query("SELECT * FROM adoption_applications WHERE application_id={$appId} LIMIT 1"));
            if (!$app) return ["success" => false, "error" => "Application not found"];
            $finalizedBy = isset($data["finalized_by"]) ? (int)$data["finalized_by"] : "NULL";
            $notes = $db->real_escape_string($data["notes"] ?? '');
            $db->query("INSERT INTO adoptions (user_id, dog_id, application_id, finalized_by, notes, adopted_at) VALUES ({$app['user_id']}, {$app['dog_id']}, {$appId}, {$finalizedBy}, '{$notes}', NOW())");
            $db->query("UPDATE dogs SET status='adopted' WHERE dog_id={$app['dog_id']}");
            $db->query("UPDATE adoption_applications SET status='finalized' WHERE application_id={$appId}");
            return ["success" => true, "user_id" => $app["user_id"], "dog_id" => $app["dog_id"]];

        case "db.enquiry.send":
            if (!isset($data["user_id"])) return ["success" => false, "error" => "Missing user_id"];
            $userId = (int)$data["user_id"];
            $dogId = (int)($data["dog_id"] ?? 0);
            $shelterId = (int)($data["shelter_id"] ?? 0);
            $message = $db->real_escape_string($data["message"] ?? '');
            $db->query("INSERT INTO chat_sessions (user_id, dog_id, shelter_id, status) VALUES ({$userId}, {$dogId}, {$shelterId}, 'open')");
            $sessionId = $db->insert_id;
            $db->query("INSERT INTO chat_messages (session_id, sender_id, message, created_at) VALUES ({$sessionId}, {$userId}, '{$message}', NOW())");
            return ["success" => true, "session_id" => $sessionId];

        case "db.api.dog.upsert":
            $shelterId = (int)($data['shelter_id'] ?? 0);
            $externalId = $db->real_escape_string($data['external_id'] ?? '');
            $name = $db->real_escape_string($data['name'] ?? '');
            $breed = $db->real_escape_string($data['breed'] ?? '');
            $ageYears = (int)($data['age_years'] ?? 0);
            $size = $db->real_escape_string($data['size'] ?? 'medium');
            $gender = $db->real_escape_string($data['gender'] ?? 'male');
            $description = $db->real_escape_string($data['description'] ?? '');
            $energy = $db->real_escape_string($data['energy_level'] ?? 'medium');
            $goodKids = !empty($data['good_with_kids']) ? 1 : 0;
            $goodDogs = !empty($data['good_with_dogs']) ? 1 : 0;
            $goodCats = !empty($data['good_with_cats']) ? 1 : 0;
            $apartment = !empty($data['apartment_friendly']) ? 1 : 0;
            $vaccinated = !empty($data['is_vaccinated']) ? 1 : 0;
            $spayed = !empty($data['is_spayed_neutered']) ? 1 : 0;
            $intakeDate = $db->real_escape_string($data['intake_date'] ?? date('Y-m-d'));
            $status = $db->real_escape_string($data['status'] ?? 'available');

            $dogId = null;
            $action = 'inserted';

            if ($externalId) {
                $check = $db->query("SELECT dog_id FROM dogs WHERE shelter_id={$shelterId} AND external_id='{$externalId}' LIMIT 1");
                if ($check && $check->num_rows > 0) {
                    $dogId = (int)$check->fetch_assoc()['dog_id'];
                    $action = 'updated';
                }
            }

            if ($dogId) {
                $sql = "UPDATE dogs SET name='{$name}', breed='{$breed}', age_years={$ageYears},
                        size='{$size}', gender='{$gender}', description='{$description}',
                        energy_level='{$energy}', good_with_kids={$goodKids}, good_with_dogs={$goodDogs},
                        good_with_cats={$goodCats}, apartment_friendly={$apartment},
                        is_vaccinated={$vaccinated}, is_spayed_neutered={$spayed}, status='{$status}'
                        WHERE dog_id={$dogId}";
            } else {
                $sql = "INSERT INTO dogs (shelter_id, name, breed, age_years, size, gender, description,
                        energy_level, good_with_kids, good_with_dogs, good_with_cats, apartment_friendly,
                        is_vaccinated, is_spayed_neutered, intake_date, status, external_id)
                        VALUES ({$shelterId}, '{$name}', '{$breed}', {$ageYears}, '{$size}', '{$gender}',
                        '{$description}', '{$energy}', {$goodKids}, {$goodDogs}, {$goodCats}, {$apartment},
                        {$vaccinated}, {$spayed}, '{$intakeDate}', '{$status}', '{$externalId}')";
            }

            logMsg("Executing SQL: " . $sql);
            if (!$db->query($sql)) return ["success" => false, "error" => $db->error];
            if ($action === 'inserted') $dogId = (int)$db->insert_id;

            if (!empty($data['photos']) && is_array($data['photos'])) {
                $db->query("DELETE FROM dog_photos WHERE dog_id={$dogId}");
                $hasPrimary = false;
                foreach ($data['photos'] as $photo) {
                    if (empty($photo['url'])) continue;
                    $url = $db->real_escape_string($photo['url']);
                    $caption = $db->real_escape_string($photo['caption'] ?? '');
                    $isPrimary = (!$hasPrimary && !empty($photo['is_primary'])) ? 1 : 0;
                    if ($isPrimary) $hasPrimary = true;
                    $db->query("INSERT INTO dog_photos (dog_id, photo_url, is_primary, caption) VALUES ({$dogId}, '{$url}', {$isPrimary}, '{$caption}')");
                }
            }

            logMsg("Dog {$action}: dog_id={$dogId} breed={$breed}");
            return ["success" => true, "dog_id" => $dogId, "action" => $action];

        default:
            logMsg("No SQL handler defined for " . $queue);
            return ["status" => "queue received", "queue" => $queue];
    }
}

$callback = function($msg) use ($channel, $db) {
    $queue = $msg->delivery_info['routing_key'];
    logMsg("Message received from " . $queue);
    logMsg("Raw body: " . $msg->body);

    try {
        $data = json_decode($msg->body, true);
        if (!is_array($data)) $data = [];
        $result = handleQuery($queue, $data, $db);
    } catch (\Throwable $e) {
        logMsg("Worker error: " . $e->getMessage());
        $result = ["success" => false, "error" => $e->getMessage()];
    }

    $resultQueue = "db.result." . explode("db.", $queue)[1];
    $correlationId = $msg->get_properties()['correlation_id'] ?? null;
    $props = ['content_type' => 'application/json', 'delivery_mode' => 2];
    if ($correlationId) $props['correlation_id'] = $correlationId;

    logMsg("Sending result to " . $resultQueue);
    logMsg("Response: " . json_encode($result));

    $channel->basic_publish(new AMQPMessage(json_encode($result), $props), '', $resultQueue);

    logMsg("Request processed\n");
};

foreach ($queues as $q) {
    $channel->basic_consume($q, '', false, true, false, false, $callback);
}

logMsg("DATABASE IS RUNNING VERSION 2.0");

while ($channel->is_consuming()) {
    $channel->wait();
}