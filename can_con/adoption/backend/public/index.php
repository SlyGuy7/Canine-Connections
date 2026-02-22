
<?php
require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

header('Content-Type: application/json');

$dsn = sprintf(
	"mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4",
	$_ENV['db_host'], $_ENV['db_port'], $_ENV['db_name']
);

$pdo = new PDO($dsn, $_ENV['db_user'], $_ENV['db_pass'], [
	PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

echo json_encode(["ok" => true, "msg" => "backend up"]);



