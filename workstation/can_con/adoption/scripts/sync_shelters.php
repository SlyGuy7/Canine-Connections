<?php declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

foreach (file(__DIR__ . '/.env.import', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);

    if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
        continue;
    }

    [$key, $value] = explode('=', $line, 2);
    $_ENV[trim($key)] = trim($value);
}

$apiKey     = $_ENV['RESCUEGROUPS_API_KEY'] ?? 'REDACTED_RG_API_KEY';
$rabbitHost = $_ENV['RABBITMQ_HOST'] ?? '100.87.19.28';
$rabbitPort = (int)($_ENV['RABBITMQ_PORT'] ?? 5672);
$rabbitUser = $_ENV['RABBITMQ_USER'] ?? 'admin';
$rabbitPass = $_ENV['RABBITMQ_PASS'] ?? 'REDACTED';

$maxPages = 20;
$limit    = 25;

$connection = new AMQPStreamConnection($rabbitHost, $rabbitPort, $rabbitUser, $rabbitPass);
$channel    = $connection->channel();

$channel->queue_declare('db.shelters.upsert', false, true, false, false);
$channel->queue_declare('db.result.shelters.upsert', false, true, false, false);

echo "[ ShelterSync ] Connected to RabbitMQ\n";

function rgFetch(string $url, string $apiKey): ?array
{
    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: ' . $apiKey,
            'Content-Type: application/vnd.api+json',
        ],
        CURLOPT_TIMEOUT => 100,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error    = curl_error($ch);

    curl_close($ch);

    if ($response === false || $httpCode !== 200) {
        echo "[ ShelterSync ][API ERROR] HTTP {$httpCode} {$error}\n";
        return null;
    }

    $decoded = json_decode($response, true);

    if (!is_array($decoded)) {
        echo "[ ShelterSync ][API ERROR] Invalid JSON response\n";
        return null;
    }

    return $decoded;
}

function mqSend($channel, string $queue, array $payload, string $corrId): void
{
    $props = [
        'delivery_mode'  => AMQPMessage::DELIVERY_MODE_PERSISTENT,
        'content_type'   => 'application/json',
        'correlation_id' => $corrId,
    ];

    $msg = new AMQPMessage(json_encode($payload), $props);
    $channel->basic_publish($msg, '', $queue);
}

function mqWait($channel, string $queue, string $corrId, int $timeout = 100): ?array
{
    $start = time();

    while (time() - $start < $timeout) {
        $msg = $channel->basic_get($queue);

        if ($msg) {
            $messageCorrId = $msg->get_properties()['correlation_id'] ?? null;

            if ($messageCorrId === $corrId) {
                $result = json_decode($msg->body, true) ?? [];
                $channel->basic_ack($msg->getDeliveryTag());
                return $result;
            }

            $channel->basic_nack($msg->getDeliveryTag(), false, true);
        }

        usleep(100000);
    }

    return null;
}

$inserted = 0;
$updated  = 0;
$existing = 0;
$errors   = 0;
$seen     = [];

$page       = 1;
$totalPages = 1;

echo "[ ShelterSync ] Fetching shelters from RescueGroups...\n\n";

do {
    $url = "https://api.rescuegroups.org/v5/public/animals/search/available/dogs/?limit={$limit}&page={$page}&include=orgs";
    $data = rgFetch($url, $apiKey);

    if (!$data || empty($data['data'])) {
        echo "[ ShelterSync ] No data returned. Stopping.\n";
        break;
    }

    $totalPages = min((int)($data['meta']['pages'] ?? 1), $maxPages);

    echo "[ ShelterSync ] Page {$page}/{$totalPages}\n";

    foreach ($data['included'] ?? [] as $inc) {
        if (($inc['type'] ?? '') !== 'orgs') {
            continue;
        }

        $orgId = $inc['id'] ?? null;

        if (!$orgId) {
            continue;
        }

        if (isset($seen[$orgId])) {
            continue;
        }

        $seen[$orgId] = true;

        $attr = $inc['attributes'] ?? [];

        $name = trim($attr['name'] ?? '');

        if ($name === '') {
            continue;
        }

        $address = trim(
            ($attr['street'] ?? '') . ' ' .
            ($attr['street2'] ?? '')
        );

        $payload = [
            'name'        => substr(trim($attr['name'] ?? ''), 0, 255),
            'address'     => $address,
            'city'        => $attr['city'] ?? '',
            'state'       => $attr['state'] ?? '',
            'zip'         => $attr['postalcode'] ?? '',
            'latitude'    => $attr['lat'] ?? null,
            'longitude'   => $attr['lon'] ?? null,
            'phone'       => $attr['phone'] ?? '',
            'email'       => $attr['email'] ?? '',
            'website'     => $attr['url'] ?? '',
            'external_id' => 'rg_org_' . $orgId,
            'description' => $attr['description'] ?? '',
            'logo_url'    => $attr['logo'] ?? '',
            'is_active'   => 1,
        ];

        $corrId = uniqid('sh_', true);

        mqSend($channel, 'db.shelters.upsert', $payload, $corrId);

        $result = mqWait($channel, 'db.result.shelters.upsert', $corrId, 100);

        if ($result && !empty($result['success'])) {
            $action = $result['action'] ?? 'unknown';
            $shId   = $result['shelter_id'] ?? '?';

            if ($action === 'inserted') {
                echo "[ ShelterSync ] + NEW {$name} ({$payload['city']}, {$payload['state']}) shelter_id={$shId}\n";
                $inserted++;
            } elseif ($action === 'updated') {
                echo "[ ShelterSync ] * UPDATED {$name} shelter_id={$shId}\n";
                $updated++;
            } else {
                echo "[ ShelterSync ] ~ EXISTS {$name} shelter_id={$shId}\n";
                $existing++;
            }
        } else {
            echo "[ ShelterSync ][ERROR] {$name}: " . ($result['error'] ?? 'no response') . "\n";
            $errors++;
        }
    }

    $page++;

    usleep(300000);

} while ($page <= $totalPages);

$channel->close();
$connection->close();

echo "\n[ ShelterSync ] DONE\n";
echo "Inserted : {$inserted}\n";
echo "Updated  : {$updated}\n";
echo "Existing : {$existing}\n";
echo "Errors   : {$errors}\n";
