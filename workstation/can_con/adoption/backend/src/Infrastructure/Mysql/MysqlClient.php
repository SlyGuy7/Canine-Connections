<?php declare(strict_types=1);

namespace App\Infrastructure\Mysql;

use PDO;

final class MysqlClient
{
    private PDO $pdo;

    public function __construct(array $config = [])
    {
        $host   = $config['host']     ?? $_ENV['DB_HOST'] ?? '100.80.193.50';
        $port   = $config['port']     ?? $_ENV['DB_PORT'] ?? 3306;
        $dbname = $config['dbname']   ?? $_ENV['DB_NAME'] ?? 'adoption_center';
        $user   = $config['user']     ?? $_ENV['DB_USER'] ?? 'adoption_user';
        $pass   = $config['password'] ?? $_ENV['DB_PASS'] ?? '';

        $this->pdo = new PDO(
            "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
        $this->pdo->exec("SET time_zone = 'America/New_York'");
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }
}