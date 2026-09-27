<?php
$apiKey = getenv('DOG_API_KEY') ?: '';
$ch = curl_init("https://api.thedogapi.com/v1/breeds?limit=5&page=0");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ["x-api-key: {$apiKey}"],
    CURLOPT_TIMEOUT        => 15
]);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);

foreach ($response as $breed) {
    echo $breed['name'] . "\n";
    echo "  weight: " . json_encode($breed['weight'] ?? 'MISSING') . "\n";
    echo "  height: " . json_encode($breed['height'] ?? 'MISSING') . "\n\n";
}
