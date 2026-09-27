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
    echo "[DogImporter][FATAL] .env.import not found\n";
    exit(1);
}
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
    [$key, $value] = explode('=', $line, 2);
    $_ENV[trim($key)] = trim($value);
    putenv(trim($key) . '=' . trim($value));
}

$apiKey        = $_ENV['DOG_API_KEY']              ?? '';
$shelterId     = (int)($_ENV['DEFAULT_SHELTER_ID'] ?? 1);
$rabbitHost    = $_ENV['RABBITMQ_HOST']            ?? '100.87.19.28';
$rabbitPort    = (int)($_ENV['RABBITMQ_PORT']      ?? 5672);
$rabbitUser    = $_ENV['RABBITMQ_USER']            ?? 'guest';
$rabbitPass    = $_ENV['RABBITMQ_PASS']            ?? 'guest';
$breedsToFetch = 172;
$imagesPerDog  = 3;

echo "\n[ DogImporter ] Started at: " . date('Y-m-d H:i:s') . "\n\n";

try {
    $connection = new AMQPStreamConnection($rabbitHost, $rabbitPort, $rabbitUser, $rabbitPass);
    $channel    = $connection->channel();
    echo "[ DogImporter ] RabbitMQ connected\n";
} catch (\Throwable $e) {
    echo "[ DogImporter ][FATAL] RabbitMQ: {$e->getMessage()}\n";
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
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ["x-api-key: {$apiKey}"],
        CURLOPT_TIMEOUT        => 15
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($httpCode !== 200 || !$response) return null;
    return json_decode($response, true);
}

function mapSize(?array $weight): string {
    if (empty($weight['imperial'])) return 'medium';

    $raw = $weight['imperial'];

    // Strip "Male: " / "Female: " prefixes e.g. "Male: 55-65; Female: 45-55"
    // Take only the first segment before any semicolon
    $raw = explode(';', $raw)[0];

    // Strip any label like "Male:" or "Female:"
    $raw = preg_replace('/[a-zA-Z]+\s*:/i', '', $raw);
    $raw = trim($raw);

    // Now parse the range e.g. "55-65" or "90"
    $parts = explode('-', $raw);
    $avg   = count($parts) === 2
        ? ((int)trim($parts[0]) + (int)trim($parts[1])) / 2
        : (int)trim($parts[0]);

    if ($avg < 15) return 'small';
    if ($avg < 50) return 'medium';
    if ($avg < 90) return 'large';
    return 'extra_large';
}

function mapEnergyLevel(?string $temperament): string {
    if (!$temperament) return 'medium';
    $t = strtolower($temperament);
    foreach (['energetic', 'active', 'playful', 'lively', 'spirited', 'athletic', 'work-focused', 'high-energy'] as $kw) if (str_contains($t, $kw)) return 'high';
    foreach (['calm', 'gentle', 'quiet', 'lazy', 'laid-back', 'easy-going', 'dignified', 'aloof'] as $kw) if (str_contains($t, $kw)) return 'low';
    return 'medium';
}

function mapTrainingLevel(?string $temperament): string {
    if (!$temperament) return 'basic';
    $t = strtolower($temperament);
    foreach (['intelligent', 'obedient', 'eager to please', 'trainable', 'responsive', 'quick learner'] as $kw) if (str_contains($t, $kw)) return 'advanced';
    foreach (['stubborn', 'independent', 'aloof', 'strong-willed', 'dominant'] as $kw) if (str_contains($t, $kw)) return 'none';
    return 'basic';
}

function mapIdealOwnerActivity(string $energy, ?string $breedGroup): string {
    if ($energy === 'high') return 'active';
    if ($energy === 'low')  return 'sedentary';
    if ($breedGroup) {
        $g = strtolower($breedGroup);
        foreach (['herding', 'sporting', 'working', 'terrier', 'hound'] as $wg) if (str_contains($g, $wg)) return 'active';
    }
    return 'moderate';
}

function mapRequiresYard(string $size, string $energy): bool {
    if (in_array($size, ['large', 'extra_large'])) return true;
    if ($size === 'medium' && $energy === 'high')   return true;
    return false;
}

function mapGoodWithKids(?string $temperament): bool {
    if (!$temperament) return true;
    $t = strtolower($temperament);
    foreach (['friendly', 'gentle', 'affectionate', 'playful', 'devoted', 'sweet', 'loving', 'cheerful'] as $kw) if (str_contains($t, $kw)) return true;
    foreach (['aggressive', 'dominant', 'protective', 'wary', 'independent', 'stubborn'] as $kw) if (str_contains($t, $kw)) return false;
    return true;
}

function mapApartmentFriendly(string $size, string $energy): bool {
    if ($size === 'small')       return true;
    if ($size === 'extra_large') return false;
    if ($size === 'large')       return false;
    if ($energy === 'high')      return false;
    return true;
}

$allBreeds  = [];
$pageSize   = 10;
$totalPages = (int)ceil($breedsToFetch / $pageSize);

echo "[ DogImporter ] Fetching breeds from TheDogAPI...\n";

for ($page = 0; $page < $totalPages; $page++) {
    $result = dogApiGet("/breeds?limit={$pageSize}&page={$page}", $apiKey);
    if (empty($result)) break;
    $allBreeds = array_merge($allBreeds, $result);
    if (count($result) < $pageSize) break;
    usleep(300000);
}

if (empty($allBreeds)) {
    echo "[ DogImporter ][FATAL] No breeds fetched from API.\n";
    exit(1);
}

echo "[ DogImporter ] Fetched " . count($allBreeds) . " breeds\n\n";

$imported = 0;
$updated  = 0;
$skipped  = 0;
$errors   = [];

foreach ($allBreeds as $breed) {
    $breedId   = $breed['id']   ?? null;
    $breedName = $breed['name'] ?? null;

    if (!$breedId || !$breedName) { $skipped++; continue; }

    $images = dogApiGet("/images/search?breed_ids={$breedId}&limit={$imagesPerDog}", $apiKey) ?? [];
    if (empty($images)) {
        echo "[ DogImporter ][SKIP] {$breedName} — no images\n";
        $skipped++;
        continue;
    }

    $photos = [];
    foreach ($images as $i => $img) {
        if (!empty($img['url'])) $photos[] = ['url' => $img['url'], 'is_primary' => ($i === 0), 'caption' => $breedName];
    }

    $temperament = $breed['temperament']  ?? null;
    $breedGroup  = $breed['breed_group']  ?? null;
    $weight      = $breed['weight']       ?? null;
    $size        = mapSize($weight);
    $energy      = mapEnergyLevel($temperament);
    $training    = mapTrainingLevel($temperament);
    $activity    = mapIdealOwnerActivity($energy, $breedGroup);
    $requireYard = mapRequiresYard($size, $energy);

    $desc = implode(' ', array_filter([
        $temperament                  ? "Temperament: {$temperament}."      : null,
        !empty($breed['bred_for'])    ? "Bred for: {$breed['bred_for']}."   : null,
        !empty($breed['breed_group']) ? "Group: {$breed['breed_group']}."   : null,
        !empty($breed['life_span'])   ? "Life span: {$breed['life_span']}." : null,
    ])) ?: "A wonderful {$breedName} looking for a loving home.";

    $payload = [
        'shelter_id'           => $shelterId,
        'external_id'          => 'dogapi_breed_' . $breedId,
        'name'                 => $breedName,
        'breed'                => $breedName,
        'age_years'            => rand(1, 8),
        'size'                 => $size,
        'gender'               => (rand(0, 1) === 0) ? 'male' : 'female',
        'description'          => $desc,
        'energy_level'         => $energy,
        'good_with_kids'       => mapGoodWithKids($temperament),
        'good_with_dogs'       => true,
        'good_with_cats'       => (bool)rand(0, 1),
        'apartment_friendly'   => mapApartmentFriendly($size, $energy),
        'requires_yard'        => $requireYard,
        'training_level'       => $training,
        'ideal_owner_activity' => $activity,
        'is_vaccinated'        => true,
        'is_spayed_neutered'   => (bool)rand(0, 1),
        'intake_date'          => date('Y-m-d', strtotime('-' . rand(1, 180) . ' days')),
        'status'               => 'available',
        'source'               => 'api',
        'photos'               => $photos,
    ];

    $corrId = uniqid('import_', true);
    mqPublish($channel, 'db.api.dog.upsert', $payload, $corrId);
    echo "[ DogImporter ] Published {$breedName} (size: {$size}, energy: {$energy}, yard: " . ($requireYard ? 'yes' : 'no') . ", training: {$training}) → RabbitMQ...\n";

    $result = mqWaitForResponse($channel, 'db.result.api.dog.upsert', $corrId, 15);

    if ($result && $result['success']) {
        if (($result['action'] ?? '') === 'inserted') {
            $imported++;
            echo "[ DogImporter ] ✓ NEW — {$breedName} dog_id={$result['dog_id']} (" . count($photos) . " photos)\n";
        } else {
            $updated++;
            echo "[ DogImporter ] ✓ UPD — {$breedName} dog_id={$result['dog_id']}\n";
        }
    } else {
        $skipped++;
        $err      = $result['error'] ?? 'No response — is mysql-worker.php running?';
        $errors[] = "{$breedName}: {$err}";
        echo "[ DogImporter ][ERROR] {$breedName}: {$err}\n";
    }

    usleep(250000);
}

$channel->close();
$connection->close();

echo "\n[ DogImporter ] DONE — " . date('Y-m-d H:i:s') . "\n";
echo "[ DogImporter ] New: {$imported} | Updated: {$updated} | Skipped: {$skipped} | Total: " . count($allBreeds) . "\n";

if (!empty($errors)) {
    echo "\n[ DogImporter ] ERRORS:\n";
    foreach ($errors as $err) echo "  - {$err}\n";
}

echo "\n[ DogImporter ] All done. Dogs are live in the database.\n\n";