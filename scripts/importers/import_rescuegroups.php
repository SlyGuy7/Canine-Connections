<?php declare(strict_types=1);

$autoloader = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoloader)) {
    echo "[RGImporter][FATAL] vendor/autoload.php not found.\n";
    echo "[RGImporter] Run: composer require php-amqplib/php-amqplib\n\n";
    exit(1);
}
require_once $autoloader;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

$envFile = __DIR__ . '/.env.import';
if (!file_exists($envFile)) {
    echo "[RGImporter][FATAL] .env.import not found\n";
    exit(1);
}
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
    [$key, $value] = explode('=', $line, 2);
    $_ENV[trim($key)] = trim($value);
    putenv(trim($key) . '=' . trim($value));
}

$apiKey     = $_ENV['RESCUEGROUPS_API_KEY'] ?? '';
$rabbitHost = $_ENV['RABBITMQ_HOST'] ?? '100.87.19.28';
$rabbitPort = (int)($_ENV['RABBITMQ_PORT'] ?? 5672);
$rabbitUser = $_ENV['RABBITMQ_USER'] ?? 'admin';
$rabbitPass = $_ENV['RABBITMQ_PASS'] ?? '';
$maxPages   = 20;
$limit      = 25;

echo "\n[ RGImporter ] Started at: " . date('Y-m-d H:i:s') . "\n\n";

try {
    $connection = new AMQPStreamConnection($rabbitHost, $rabbitPort, $rabbitUser, $rabbitPass);
    $channel    = $connection->channel();
    echo "[ RGImporter ] RabbitMQ connected to {$rabbitHost}\n";
} catch (\Throwable $e) {
    echo "[ RGImporter ][FATAL] RabbitMQ: {$e->getMessage()}\n";
    exit(1);
}

$channel->queue_declare('db.api.dog.upsert',        false, true, false, false);
$channel->queue_declare('db.result.api.dog.upsert', false, true, false, false);
$channel->queue_declare('db.shelters.list',          false, true, false, false);

function mqPublish($channel, string $queue, array $payload, ?string $corrId = null): void {
    $props = ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT, 'content_type' => 'application/json'];
    if ($corrId !== null) $props['correlation_id'] = $corrId;
    $channel->basic_publish(new AMQPMessage(json_encode($payload), $props), '', $queue);
}

function mqWaitForResponse($channel, string $queue, string $corrId, int $timeout = 20): ?array {
    $result = null;
    $start  = time();
    while (true) {
        $msg = $channel->basic_get($queue);
        if ($msg) {
            if (($msg->get_properties()['correlation_id'] ?? null) === $corrId) {
                $result = json_decode($msg->body, true) ?? [];
                $channel->basic_ack($msg->getDeliveryTag());
                break;
            }
            $channel->basic_nack($msg->getDeliveryTag(), false, true);
        }
        if ((time() - $start) >= $timeout) break;
        usleep(100000);
    }
    return $result;
}

function rgFetch(string $url, string $apiKey): ?array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: ' . $apiKey,
            'Content-Type: application/vnd.api+json',
        ],
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_ENCODING       => 'gzip',
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($httpCode !== 200 || !$response) return null;
    return json_decode($response, true);
}

function mapSize(string $size): string {
    return match(strtolower(trim($size))) {
        'x-small', 'xs', 'tiny' => 'small',
        'small', 'sm'            => 'small',
        'medium', 'med', 'md'   => 'medium',
        'large', 'lg'            => 'large',
        'x-large', 'xl'          => 'extra_large',
        default => 'medium',
    };
}

function mapEnergy(string $level): string {
    $l = strtolower(trim($level));
    if (str_contains($l, 'low') || str_contains($l, 'slight') || str_contains($l, 'calm')) return 'low';
    if (str_contains($l, 'high') || str_contains($l, 'very') || str_contains($l, 'extreme')) return 'high';
    return 'medium';
}

function mapAge(string $ageGroup): float {
    return match(strtolower(trim($ageGroup))) {
        'baby'   => 0.5,
        'young'  => 1.5,
        'adult'  => 4.0,
        'senior' => 9.0,
        default  => 3.0,
    };
}

function cleanText(string $text): string {
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = strip_tags($text);
    $text = preg_replace('/\s+/', ' ', $text);
    return trim($text);
}

$shelterIdMap = [];

function getOrCreateShelterId($channel, string $orgId, array $orgAttr, array &$cache): int {
    if (isset($cache[$orgId])) return $cache[$orgId];

    $name    = substr(cleanText($orgAttr['name'] ?? 'Unknown Shelter'), 0, 255);
    $city    = $orgAttr['city']    ?? '';
    $state   = $orgAttr['state']   ?? '';
    $phone   = $orgAttr['phone']   ?? '';
    $email   = $orgAttr['email']   ?? '';
    $website = $orgAttr['url']     ?? '';

    $corrId  = uniqid('shelter_', true);
    $replyQ  = 'db.shelters.list.reply.' . $corrId;

    $channel->queue_declare($replyQ, false, false, false, true, false,
        new \PhpAmqpLib\Wire\AMQPTable(['x-message-ttl' => 30000])
    );

    $payload = ['action' => 'find_or_create', 'name' => $name, 'city' => $city, 'state' => $state,
                'phone' => $phone, 'email' => $email, 'website' => $website];

    $props = [
        'delivery_mode'  => AMQPMessage::DELIVERY_MODE_PERSISTENT,
        'content_type'   => 'application/json',
        'correlation_id' => $corrId,
        'reply_to'       => $replyQ,
    ];
    $channel->basic_publish(new AMQPMessage(json_encode($payload), $props), '', 'db.shelters.list');

    $start = time();
    while (time() - $start < 10) {
        $msg = $channel->basic_get($replyQ, true);
        if ($msg) {
            $result = json_decode($msg->body, true) ?? [];
            if (!empty($result['shelters'][0]['shelter_id'])) {
                $id = (int)$result['shelters'][0]['shelter_id'];
                $cache[$orgId] = $id;
                return $id;
            }
            break;
        }
        usleep(100000);
    }

    $cache[$orgId] = 1;
    return 1;
}

$imported = 0;
$skipped  = 0;
$errors   = 0;
$page     = 1;
$totalPages = 1;

echo "[ RGImporter ] Fetching dogs from RescueGroups.org...\n";
echo "[ RGImporter ] Max pages: {$maxPages} x {$limit} dogs = up to " . ($maxPages * $limit) . " dogs\n\n";

do {
    $url  = "https://api.rescuegroups.org/v5/public/animals/search/available/dogs/?limit={$limit}&page={$page}&include=orgs,pictures";
    $data = rgFetch($url, $apiKey);

    if (!$data || empty($data['data'])) {
        echo "[ RGImporter ] No more data on page {$page}.\n";
        break;
    }

    $totalPages = min((int)($data['meta']['pages'] ?? 1), $maxPages);
    echo "[ RGImporter ] Page {$page}/{$totalPages} — " . count($data['data']) . " animals\n";

    $orgMap     = [];
    $pictureMap = [];

    foreach ($data['included'] ?? [] as $inc) {
        if ($inc['type'] === 'orgs') {
            $orgMap[$inc['id']] = $inc['attributes'] ?? [];
        }
        if ($inc['type'] === 'pictures') {
            $animalId = $inc['relationships']['animal']['data']['id'] ?? null;
            if ($animalId) {
                $picUrl = $inc['attributes']['large']['url']
                    ?? $inc['attributes']['original']['url']
                    ?? $inc['attributes']['full']['url']
                    ?? null;
                if ($picUrl) $pictureMap[$animalId][] = $picUrl;
            }
        }
    }

    foreach ($data['data'] as $animal) {
        $attr     = $animal['attributes'] ?? [];
        $animalId = $animal['id'];
        $extId    = 'rg_' . $animalId;

        $name = cleanText($attr['name'] ?? '');
        if (empty($name)) { $skipped++; continue; }

        $breedPrimary   = $attr['breedPrimary'] ?? '';
        $breedSecondary = $attr['breedSecondary'] ?? '';
        $breed = $breedPrimary ?: 'Mixed';
        if ($breedSecondary && $breedSecondary !== $breedPrimary) {
            $breed .= ' / ' . $breedSecondary;
        }
        if ($attr['isBreedMixed'] ?? false) $breed .= ' Mix';

        $ageYears    = isset($attr['birthDate'])
            ? round((time() - strtotime($attr['birthDate'])) / 31536000, 1)
            : mapAge($attr['ageGroup'] ?? 'adult');
        $size        = mapSize($attr['sizeGroup'] ?? 'medium');
        $gender      = strtolower($attr['sex'] ?? 'male') === 'female' ? 'female' : 'male';
        $description = cleanText($attr['descriptionText'] ?? $attr['descriptionHtml'] ?? '');
        if (strlen($description) > 2000) $description = substr($description, 0, 2000);
        $energy      = mapEnergy($attr['energyLevel'] ?? $attr['activityLevel'] ?? 'medium');
        $goodKids    = (bool)($attr['isKidsOk'] ?? false);
        $goodDogs    = (bool)($attr['isDogsOk'] ?? false);
        $goodCats    = (bool)($attr['isCatsOk'] ?? false);
        $vaccinated  = (bool)($attr['isCurrentVaccinations'] ?? false);
        $spayed      = (bool)($attr['isAltered'] ?? false);
        $weightLbs   = isset($attr['sizeCurrent']) ? (float)$attr['sizeCurrent'] : null;

        $photos    = $pictureMap[$animalId] ?? [];
        $thumbnail = $attr['pictureThumbnailUrl'] ?? null;
        if (empty($photos) && $thumbnail) {
            $photos[] = str_replace('?width=100', '', $thumbnail);
        }

        $photoList = [];
        foreach (array_filter($photos) as $i => $photoUrl) {
            $photoList[] = ['url' => $photoUrl, 'is_primary' => ($i === 0), 'caption' => $name];
        }

        $orgId     = $animal['relationships']['orgs']['data'][0]['id'] ?? null;
        $orgAttr   = $orgId ? ($orgMap[$orgId] ?? []) : [];
        $shelterId = 1;

        if ($orgId && !empty($orgAttr)) {
            if (isset($shelterIdMap[$orgId])) {
                $shelterId = $shelterIdMap[$orgId];
            } else {
                $shelterName = substr(cleanText($orgAttr['name'] ?? 'Unknown'), 0, 255);
                echo "[ RGImporter ] New shelter: {$shelterName} ({$orgAttr['city']}, {$orgAttr['state']})\n";
                $shelterId = 1;
                $shelterIdMap[$orgId] = 1;
            }
        }

        $payload = [
            'shelter_id'           => $shelterId,
            'external_id'          => $extId,
            'name'                 => $name,
            'breed'                => substr($breed, 0, 100),
            'age_years'            => $ageYears,
            'size'                 => $size,
            'gender'               => $gender,
            'description'          => $description,
            'energy_level'         => $energy,
            'good_with_kids'       => $goodKids,
            'good_with_dogs'       => $goodDogs,
            'good_with_cats'       => $goodCats,
            'apartment_friendly'   => in_array($size, ['small', 'medium']) && $energy !== 'high',
            'requires_yard'        => in_array($size, ['large', 'extra_large']) || ($size === 'medium' && $energy === 'high'),
            'is_vaccinated'        => $vaccinated,
            'is_spayed_neutered'   => $spayed,
            'weight_lbs'           => $weightLbs,
            'intake_date'          => date('Y-m-d'),
            'status'               => 'available',
            'source'               => 'rescuegroups',
            'photos'               => $photoList,
        ];

        $corrId = uniqid('rg_', true);
        mqPublish($channel, 'db.api.dog.upsert', $payload, $corrId);
        echo "[ RGImporter ] Published: {$name} | {$breed} | {$size} | {$gender} | photos=" . count($photoList) . "\n";

        $result = mqWaitForResponse($channel, 'db.result.api.dog.upsert', $corrId, 45);

        if ($result && $result['success']) {
            $action = $result['action'] ?? 'inserted';
            $dogId  = $result['dog_id'] ?? '?';
            echo "[ RGImporter ] " . ($action === 'inserted' ? '+ NEW' : '~ UPD') . " {$name} dog_id={$dogId}\n";
            $imported++;
        } else {
            $err = $result['error'] ?? 'No response — is db_worker.php running?';
            echo "[ RGImporter ][ERROR] {$name}: {$err}\n";
            $errors++;
        }

        usleep(250000);
    }

    $page++;
    usleep(300000);

} while ($page <= $totalPages);

$channel->close();
$connection->close();

echo "\n[ RGImporter ] DONE — " . date('Y-m-d H:i:s') . "\n";
echo "[ RGImporter ] Imported : {$imported}\n";
echo "[ RGImporter ] Skipped  : {$skipped}\n";
echo "[ RGImporter ] Errors   : {$errors}\n";
echo "[ RGImporter ] All done. Dogs are live in the database.\n\n";
