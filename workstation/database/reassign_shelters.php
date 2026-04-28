<?php declare(strict_types=1);

$autoloader = __DIR__ . '/../can_con/adoption/backend/vendor/autoload.php';
if (!file_exists($autoloader)) {
    die("vendor/autoload.php not found — run composer install in backend/\n");
}
require_once $autoloader;

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/../can_con/adoption/backend');
$dotenv->load();

$db = new mysqli(
    $_ENV['DB_HOST'],
    $_ENV['DB_USER'],
    $_ENV['DB_PASS'],
    $_ENV['DB_NAME'],
    (int)$_ENV['DB_PORT']
);
if ($db->connect_error) die("MySQL failed: " . $db->connect_error . "\n");
$db->set_charset('utf8mb4');

echo "Connected to MySQL\n";

$apiKey   = 'REDACTED_RG_API_KEY';
$limit    = 25;
$maxPages = 20;
$updated  = 0;
$skipped  = 0;
$errors   = 0;
$page     = 1;
$totalPages = 1;

echo "Fetching org→animal mappings from RescueGroups...\n\n";

do {
    $url = "https://api.rescuegroups.org/v5/public/animals/search/available/dogs/?limit={$limit}&page={$page}&include=orgs";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: ' . $apiKey,
            'Content-Type: application/vnd.api+json',
        ],
        CURLOPT_TIMEOUT        => 30,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        echo "HTTP {$httpCode} on page {$page} — stopping\n";
        break;
    }

    $data = json_decode($response, true);
    if (empty($data['data'])) {
        echo "No more data on page {$page}\n";
        break;
    }

    $totalPages = min((int)($data['meta']['pages'] ?? 1), $maxPages);
    echo "Page {$page}/{$totalPages} — " . count($data['data']) . " animals\n";

    $orgMap = [];
    foreach ($data['included'] ?? [] as $inc) {
        if ($inc['type'] === 'orgs') {
            $orgMap[$inc['id']] = trim($inc['attributes']['name'] ?? '');
        }
    }

    foreach ($data['data'] as $animal) {
        $animalId  = $animal['id'];
        $externalId = 'rg_' . $animalId;
        $orgId     = $animal['relationships']['orgs']['data'][0]['id'] ?? null;

        if (!$orgId || !isset($orgMap[$orgId])) {
            $skipped++;
            continue;
        }

        $orgName = $db->real_escape_string($orgMap[$orgId]);

        $shelterResult = $db->query("SELECT shelter_id FROM shelters WHERE name='{$orgName}' LIMIT 1");
        if (!$shelterResult || $shelterResult->num_rows === 0) {
            echo "  [MISS] No shelter found for: {$orgMap[$orgId]}\n";
            $skipped++;
            continue;
        }
        $shelterId = (int)$shelterResult->fetch_assoc()['shelter_id'];

        $extEsc = $db->real_escape_string($externalId);
        $db->query("UPDATE dogs SET shelter_id={$shelterId} WHERE external_id='{$extEsc}' AND source='rescuegroups'");

        if ($db->affected_rows > 0) {
            echo "  Updated rg_{$animalId} → shelter_id={$shelterId} ({$orgMap[$orgId]})\n";
            $updated++;
        } else {
            $skipped++;
        }
    }

    $page++;
    usleep(300000);

} while ($page <= $totalPages);

$db->close();

echo "\nDONE\n";
echo "Updated : {$updated}\n";
echo "Skipped : {$skipped}\n";
echo "Errors  : {$errors}\n";

$result = (new mysqli(
    $_ENV['DB_HOST'], $_ENV['DB_USER'], $_ENV['DB_PASS'], $_ENV['DB_NAME'], (int)$_ENV['DB_PORT']
))->query("SELECT shelter_id, COUNT(*) as cnt FROM dogs WHERE source='rescuegroups' GROUP BY shelter_id ORDER BY cnt DESC LIMIT 10");
echo "\nTop 10 shelters by dog count:\n";
while ($row = $result->fetch_assoc()) {
    echo "  shelter_id={$row['shelter_id']} — {$row['cnt']} dogs\n";
}
