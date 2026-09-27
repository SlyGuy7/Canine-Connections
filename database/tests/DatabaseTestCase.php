<?php declare(strict_types=1);

namespace Database\Tests;

use Database\QueryHandler;
use mysqli;
use PHPUnit\Framework\TestCase;

// Runs QueryHandler against a real MySQL database built from sql/schema.sql, so the tests
// fail whenever a query and the schema disagree. The database is recreated once per run.
abstract class DatabaseTestCase extends TestCase
{
    private static ?mysqli $db = null;
    protected QueryHandler $handler;
    protected array $logged = [];

    public static function setUpBeforeClass(): void
    {
        if (self::$db !== null) {
            return;
        }
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
        $name = self::env('TEST_DB_NAME');
        try {
            $db = new mysqli(self::env('TEST_DB_HOST'), self::env('TEST_DB_USER'), self::env('TEST_DB_PASS'), '', (int)self::env('TEST_DB_PORT'));
        } catch (\mysqli_sql_exception $e) {
            self::markTestSkipped('MySQL test server not reachable: ' . $e->getMessage());
        }
        $db->set_charset('utf8mb4');
        $db->query("DROP DATABASE IF EXISTS `{$name}`");
        $db->query("CREATE DATABASE `{$name}`");
        $db->select_db($name);

        // Load the real schema, minus the lines that pick the production database name.
        $schema = (string)file_get_contents(__DIR__ . '/../sql/schema.sql');
        $schema = preg_replace('/^(CREATE DATABASE|USE)\b.*$/mi', '', $schema);
        $db->multi_query($schema);
        do {
            if ($result = $db->store_result()) $result->free();
        } while ($db->more_results() && $db->next_result());

        self::$db = $db;
    }

    // Every test starts from empty tables. (Per-test transactions would not isolate anything:
    // QueryHandler opens its own transactions, and MySQL commits the outer one when it does.)
    protected function setUp(): void
    {
        $db = self::$db;
        $db->query('SET FOREIGN_KEY_CHECKS = 0');
        foreach ($db->query('SHOW TABLES')->fetch_all() as [$table]) {
            $db->query("TRUNCATE TABLE `{$table}`");
        }
        $db->query('SET FOREIGN_KEY_CHECKS = 1');

        $this->logged  = [];
        $this->handler = new QueryHandler($db, function (string $msg) { $this->logged[] = $msg; });
    }

    protected function db(): mysqli
    {
        return self::$db;
    }

    protected function call(string $queue, array $data = []): array
    {
        return $this->handler->handle($queue, $data);
    }

    // Asserts the call succeeded; on failure, shows the logged database error.
    protected function ok(string $queue, array $data = []): array
    {
        $result = $this->call($queue, $data);
        $this->assertTrue($result['success'] ?? false, $queue . ' failed: ' . json_encode($result) . ' ' . implode(' | ', $this->logged));
        return $result;
    }

    // ── Fixtures ────────────────────────────────────────────────────────────

    protected function user(?string $email = null, string $role = 'adopter'): int
    {
        $email ??= 'user' . bin2hex(random_bytes(4)) . '@example.com';
        $id = $this->ok('db.auth.register', ['email' => $email, 'password_hash' => password_hash('pw', PASSWORD_BCRYPT)])['user_id'];
        if ($role !== 'adopter') {
            self::$db->query("UPDATE users SET role = '{$role}' WHERE user_id = {$id}");
        }
        return $id;
    }

    protected function shelter(): int
    {
        self::$db->query("INSERT INTO shelters (name, city, state) VALUES ('Test Shelter', 'Newark', 'NJ')");
        return self::$db->insert_id;
    }

    protected function dog(int $shelterId, array $overrides = []): int
    {
        return $this->ok('db.api.dog.upsert', $overrides + [
            'shelter_id' => $shelterId, 'name' => 'Rex', 'breed' => 'Beagle', 'size' => 'medium',
            'energy_level' => 'high', 'good_with_kids' => true, 'external_id' => 'ext-' . bin2hex(random_bytes(4)),
        ])['dog_id'];
    }

    private static function env(string $key): string
    {
        return (string)($_ENV[$key] ?? getenv($key) ?: '');
    }
}
