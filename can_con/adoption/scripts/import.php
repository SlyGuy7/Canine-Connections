<?php declare(strict_types=1);

$autoloader = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoloader)) {
    echo "[DogImporter][FATAL] vendor/autoload.php not found.\n";
    echo "[DogImporter] Run: composer require php-amqplib/php-amqplib\n\n";
    exit(1);
}
require_once $autoloader;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

$envFile = __DIR__ . '/.env.import';
if (!file_exists($envFile)) {
    echo "[DogImporter][FATAL] .env not found\n";
    exit(1);
}
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
    [$key, $value] = explode('=', $line, 2);
    $_ENV[trim($key)] = trim($value);
    putenv(trim($key) . '=' . trim($value));
}

$apiKey        = $_ENV['DOG_API_KEY']              ?? 'REDACTED_DOG_API_KEY';
$shelterId     = (int)($_ENV['DEFAULT_SHELTER_ID'] ?? 1);
$rabbitHost    = $_ENV['RABBITMQ_HOST']            ?? '100.87.19.28';
$rabbitPort    = (int)($_ENV['RABBITMQ_PORT']      ?? 5672);
$rabbitUser    = $_ENV['RABBITMQ_USER']            ?? 'guest';
$rabbitPass    = $_ENV['RABBITMQ_PASS']            ?? 'guest';
$breedsToFetch = 50;
$imagesPerDog  = 3;

echo "\n[ DogImporter API ] Started at: " . date('Y-m-d H:i:s') . "\n\n";

try {
    $connection = new AMQPStreamConnection($rabbitHost, $rabbitPort, $rabbitUser, $rabbitPass);
    $channel    = $connection->channel();
    echo "[ DogImporter API ] RabbitMQ connected\n";
} catch (\Throwable $e) {
    echo "[ DogImporter API ][FATAL] RabbitMQ: {$e->getMessage()}\n";
    exit(1);
}

$channel->queue_declare('db.api.dog.upsert',        false, true, false, false);
$channel->queue_declare('db.result.api.dog.upsert', false, true, false, false);
$channel->queue_declare('db.api.log',               false, true, false, false);

function mqPublish($channel, string $queue, array $payload, ?string $corrId = null): void {
    $props = ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT, 'content_type' => 'application/json'];
    if ($corrId !== null) $props['correlation_id'] = $corrId;
    $channel->basic_publish(new AMQPMessage(json_encode($payload), $props), '', $queue);
}

function mqWaitForResponse($channel, string $queue, string $corrId, int $timeout = 15): ?array {
    $result = null; $start = time();
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

function dogApiGet(string $endpoint, string $apiKey): ?array {
    $ch = curl_init("https://api.thedogapi.com/v1{$endpoint}");
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => ["x-api-key: {$apiKey}"], CURLOPT_TIMEOUT => 15]);
    $response = curl_exec($ch); $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($httpCode !== 200 || !$response) return null;
    return json_decode($response, true);
}

function mapEnergyLevel(?string $t): string {
    if (!$t) return 'medium'; $t = strtolower($t);
    foreach (['energetic','active','playful','lively','spirited'] as $kw) if (str_contains($t,$kw)) return 'high';
    foreach (['calm','gentle','quiet','lazy','laid-back'] as $kw) if (str_contains($t,$kw)) return 'low';
    return 'medium';
}

function mapSize(?array $w): string {
    if (empty($w['imperial'])) return 'medium';
    $p = explode('-', $w['imperial']);
    $avg = count($p) === 2 ? ((int)trim($p[0])+(int)trim($p[1]))/2 : (int)trim($p[0]);
    if ($avg < 15) return 'small'; if ($avg < 50) return 'medium'; if ($avg < 90) return 'large'; return 'xlarge';
}

function mapGoodWithKids(?string $t): bool {
    if (!$t) return true; $t = strtolower($t);
    foreach (['friendly','gentle','affectionate','playful','devoted','sweet'] as $kw) if (str_contains($t,$kw)) return true;
    return false;
}

function mapApartment(string $size, string $energy): bool {
    if ($size === 'small') return true; if ($size === 'xlarge') return false;
    if ($size === 'medium' && $energy !== 'high') return true; return false;
}

function randomName(): string {
    $n = ['Buddy','Max','Charlie','Cooper','Milo','Bear','Rocky','Duke','Zeus','Beau','Finn','Tucker','Luna','Bella','Daisy','Molly','Sadie','Rosie','Lily','Zoe','Nala','Chloe','Penny','Ruby','Jack','Oscar','Toby','Winston','Lola','Coco','Roxy','Abby'];
    return $n[array_rand($n)];
}

$allBreeds = []; $pageSize = 10; $totalPages = (int)ceil($breedsToFetch / $pageSize);
echo "[ DogImporter API ] Fetching breeds...\n";
for ($page = 0; $page < $totalPages; $page++) {
    $r = dogApiGet("/breeds?limit={$pageSize}&page={$page}", $apiKey);
    if (empty($r)) break;
    $allBreeds = array_merge($allBreeds, $r);
    if (count($r) < $pageSize) break;
    usleep(300000);
}

if (empty($allBreeds)) { echo "[ DogImporter API ][FATAL] No breeds fetched.\n"; exit(1); }
echo "[ DogImporter API ] Got " . count($allBreeds) . " breeds\n\n";

$imported = 0; $updated = 0; $skipped = 0; $errors = [];

foreach ($allBreeds as $breed) {
    $breedId = $breed['id'] ?? null; $breedName = $breed['name'] ?? null;
    if (!$breedId || !$breedName) { $skipped++; continue; }

    $images = dogApiGet("/images/search?breed_ids={$breedId}&limit={$imagesPerDog}", $apiKey) ?? [];
    if (empty($images)) { echo "[ DogImporter API ][SKIP] {$breedName}\n"; $skipped++; continue; }

    $photos = [];
    foreach ($images as $i => $img) if (!empty($img['url'])) $photos[] = ['url' => $img['url'], 'is_primary' => ($i === 0), 'caption' => $breedName];

    $temperament = $breed['temperament'] ?? null;
    $size        = mapSize($breed['weight'] ?? null);
    $energy      = mapEnergyLevel($temperament);

    $desc = implode(' ', array_filter([
        $temperament ? "Temperament: {$temperament}." : null,
        !empty($breed['bred_for'])    ? "Bred for: {$breed['bred_for']}."   : null,
        !empty($breed['breed_group']) ? "Group: {$breed['breed_group']}."   : null,
        !empty($breed['life_span'])   ? "Life span: {$breed['life_span']}." : null,
    ])) ?: "A wonderful {$breedName} looking for a loving home.";

    $payload = [
        'shelter_id' => $shelterId, 'external_id' => 'dogapi_breed_'.$breedId,
        'name' => randomName(), 'breed' => $breedName, 'age_years' => rand(1,8),
        'size' => $size, 'gender' => (rand(0,1)===0)?'male':'female',
        'description' => $desc, 'energy_level' => $energy,
        'good_with_kids' => mapGoodWithKids($temperament), 'good_with_dogs' => true,
        'good_with_cats' => (bool)rand(0,1), 'apartment_friendly' => mapApartment($size,$energy),
        'is_vaccinated' => true, 'is_spayed_neutered' => (bool)rand(0,1),
        'intake_date' => date('Y-m-d', strtotime('-'.rand(1,180).' days')),
        'status' => 'available', 'photos' => $photos,
    ];

    $corrId = uniqid('import_', true);
    mqPublish($channel, 'db.api.dog.upsert', $payload, $corrId);
    echo "[ DogImporter API ] Published {$breedName} → RabbitMQ...\n";

    $result = mqWaitForResponse($channel, 'db.result.api.dog.upsert', $corrId, 15);

    if ($result && $result['success']) {
        if (($result['action'] ?? '') === 'inserted') { $imported++; echo "[ DogImporter API ] NEW — {$breedName} dog_id={$result['dog_id']} (".count($photos)." photos)\n"; }
        else { $updated++; echo "[ DogImporter API ] UPD — {$breedName} dog_id={$result['dog_id']}\n"; }
    } else {
        $skipped++; $err = $result['error'] ?? 'No response — is mysql-worker.php running?';
        $errors[] = "{$breedName}: {$err}"; echo "[ DogImporter API ][ERROR] {$breedName}: {$err}\n";
    }
    usleep(250000);
}

$channel->close(); $connection->close();

echo "\n[ DogImporter API ] DONE — " . date('Y-m-d H:i:s') . "\n";
echo "[ DogImporter API ] New: {$imported} | Updated: {$updated} | Skipped: {$skipped} | Total: ".count($allBreeds)."\n";
if (!empty($errors)) { foreach ($errors as $err) echo "  - {$err}\n"; }
echo "[ DogImporter API ] Frontend loads dogs via request.dogs.list\n\n";
