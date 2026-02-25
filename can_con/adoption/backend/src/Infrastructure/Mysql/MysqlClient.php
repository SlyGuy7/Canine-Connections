<?php declare(strict_types=1);

namespace App\Infrastructure\Mysql;

use PDO;

final class MysqlClient
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = new PDO(
            "mysql:host=127.0.0.1;dbname=adoption_center;charset=utf8mb4",
            "adoption_user",
            "REDACTED",
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]
        );
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }
}
