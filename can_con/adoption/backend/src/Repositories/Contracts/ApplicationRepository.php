<?php declare(strict_types=1);

namespace App\Repositories\Contracts;

interface ApplicationRepository
{
    public function create(array $app): array;
    public function list(): array;
    public function get(string $id): ?array;
    public function update(string $id, array $patch): ?array;
    public function countByStatus(string $status): int;
}
