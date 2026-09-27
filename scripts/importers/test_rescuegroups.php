<?php

$apiKey     = getenv('RESCUEGROUPS_API_KEY') ?: '';
$limit      = 25;
$maxPages   = 5;
$sheltersSeen = [];
$animalCount  = 0;

echo str_repeat("=", 80) . PHP_EOL;
echo "RESCUEGROUPS.ORG API — WIDE NET TEST" . PHP_EOL;
echo "Fetching up to {$maxPages} pages of {$limit} dogs each" . PHP_EOL;
echo str_repeat("=", 80) . PHP_EOL;

for ($page = 1; $page <= $maxPages; $page++) {
    $url = "https://api.rescuegroups.org/v5/public/animals/search/available/dogs/?limit={$limit}&page={$page}&include=orgs,pictures";

    echo PHP_EOL . "Fetching page {$page}..." . PHP_EOL;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: ' . $apiKey,
            'Content-Type: application/vnd.api+json',
        ],
        CURLOPT_TIMEOUT => 30,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        echo "HTTP {$httpCode} — stopping." . PHP_EOL;
        echo $response . PHP_EOL;
        break;
    }

    $data = json_decode($response, true);

    if (empty($data['data'])) {
        echo "No more animals." . PHP_EOL;
        break;
    }

    if ($page === 1) {
        echo PHP_EOL . "META (from page 1):" . PHP_EOL;
        echo str_repeat("-", 40) . PHP_EOL;
        print_r($data['meta'] ?? []);
    }

    $orgMap     = [];
    $pictureMap = [];

    foreach ($data['included'] ?? [] as $inc) {
        if ($inc['type'] === 'orgs') {
            $orgMap[$inc['id']] = $inc['attributes'];
        }
        if ($inc['type'] === 'pictures') {
            $animalId = $inc['relationships']['animal']['data']['id'] ?? null;
            if ($animalId) {
                $pictureMap[$animalId][] = $inc['attributes']['original']['url'] ?? null;
            }
        }
    }

    foreach ($data['data'] as $animal) {
        $animalCount++;
        $attr   = $animal['attributes'] ?? [];
        $orgId  = $animal['relationships']['orgs']['data'][0]['id'] ?? null;
        $org    = $orgId ? ($orgMap[$orgId] ?? []) : [];

        $orgKey = $orgId ?? 'none';
        if (!isset($sheltersSeen[$orgKey])) {
            $sheltersSeen[$orgKey] = $org;

            echo PHP_EOL . str_repeat("=", 80) . PHP_EOL;
            echo "NEW SHELTER FOUND (org_id: {$orgKey})" . PHP_EOL;
            echo str_repeat("-", 60) . PHP_EOL;
            foreach ($org as $key => $val) {
                if (is_array($val)) {
                    echo "  {$key}: " . json_encode($val) . PHP_EOL;
                } else {
                    echo "  {$key}: " . var_export($val, true) . PHP_EOL;
                }
            }
        }

        echo PHP_EOL . "  ANIMAL (ID: {$animal['id']}) from shelter {$orgKey}:" . PHP_EOL;
        echo str_repeat("-", 40) . PHP_EOL;
        foreach ($attr as $key => $val) {
            if (is_array($val)) {
                echo "    {$key}: " . json_encode($val) . PHP_EOL;
            } else {
                echo "    {$key}: " . var_export($val, true) . PHP_EOL;
            }
        }

        $photos = array_filter($pictureMap[$animal['id']] ?? []);
        if (!empty($photos)) {
            echo "    PHOTOS:" . PHP_EOL;
            foreach ($photos as $p) {
                echo "      - {$p}" . PHP_EOL;
            }
        } else {
            echo "    PHOTOS: none" . PHP_EOL;
        }
    }

    $totalPages = $data['meta']['totalPages'] ?? 1;
    if ($page >= $totalPages) {
        echo PHP_EOL . "Reached last page ({$totalPages})." . PHP_EOL;
        break;
    }
}

echo PHP_EOL . str_repeat("=", 80) . PHP_EOL;
echo "SUMMARY" . PHP_EOL;
echo str_repeat("-", 40) . PHP_EOL;
echo "Total animals seen: {$animalCount}" . PHP_EOL;
echo "Unique shelters found: " . count($sheltersSeen) . PHP_EOL;
echo PHP_EOL . "SHELTER LIST:" . PHP_EOL;
foreach ($sheltersSeen as $orgId => $org) {
    $name  = $org['name']  ?? 'Unknown';
    $city  = $org['city']  ?? '';
    $state = $org['state'] ?? '';
    echo "  [{$orgId}] {$name} — {$city}, {$state}" . PHP_EOL;
}
