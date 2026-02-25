<?php declare(strict_types=1);

namespace App\Repositories\InMemory;

use App\Repositories\Contracts\ApplicationRepository;
use App\Util\Id;

final class InMemoryApplicationRepository implements ApplicationRepository
{
    private array $apps = [];

    public function __construct()
    {
        // Seed demo data so UI isn't empty
        $this->create([
            'name' => 'John Doe',
            'address' => '123 Main St',
            'phone' => '9735551111',
            'experience' => 'Had dogs before',
            'status' => 'pending',
            'createdAt' => date('c'),
        ]);

        $this->create([
            'name' => 'Jane Smith',
            'address' => '77 Market St',
            'phone' => '2015552222',
            'experience' => 'First time adopter',
            'status' => 'approved',
            'createdAt' => date('c'),
        ]);
    }

    public function create(array $app): array
    {
        $id = Id::uuid();
        $app['id'] = $id;
        $this->apps[$id] = $app;
        return $app;
    }

    public function list(): array
    {
        $items = array_values($this->apps);
        usort($items, fn($a, $b) => strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? '')));
        return $items;
    }

    public function get(string $id): ?array
    {
        return $this->apps[$id] ?? null;
    }

    public function update(string $id, array $patch): ?array
    {
        if (!isset($this->apps[$id])) return null;
        $this->apps[$id] = array_merge($this->apps[$id], $patch);
        return $this->apps[$id];
    }

    public function countByStatus(string $status): int
    {
        return count(array_filter($this->apps, fn($a) => ($a['status'] ?? '') === $status));
    }
}
