<?php declare(strict_types=1);

namespace App\Services;

use App\Repositories\Contracts\ApplicationRepository;
use App\Domain\Applications\ApplicationStatus;
use App\Util\Logger;
use App\Infrastructure\Messaging\RabbitMqClient;

final class ApplicationService
{
    public function __construct(
        private ApplicationRepository $apps,
        private Logger $logger,
        private RabbitMqClient $mq
    ) {}

    public function submit(array $payload): array
    {
        $record = [
            'name' => (string)($payload['name'] ?? ''),
            'address' => (string)($payload['address'] ?? ''),
            'phone' => (string)($payload['phone'] ?? ''),
            'experience' => (string)($payload['experience'] ?? ''),
            'status' => ApplicationStatus::PENDING,
            'createdAt' => date('c'),
        ];

        $created = $this->apps->create($record);

        $this->logger->audit('application_submitted', ['id' => $created['id']]);
        $this->mq->publish('application.submitted', ['id' => $created['id']]); // placeholder

        return $created;
    }

    public function list(): array
    {
        return $this->apps->list();
    }

    public function approve(string $id): array
    {
        $updated = $this->apps->update($id, ['status' => ApplicationStatus::APPROVED]);
        if (!$updated) throw new \RuntimeException('not_found');

        $this->logger->audit('application_approved', ['id' => $id]);
        $this->mq->publish('application.status.updated', ['id' => $id, 'status' => ApplicationStatus::APPROVED]); // placeholder

        return $updated;
    }

    public function reject(string $id): array
    {
        $updated = $this->apps->update($id, ['status' => ApplicationStatus::REJECTED]);
        if (!$updated) throw new \RuntimeException('not_found');

        $this->logger->audit('application_rejected', ['id' => $id]);
        $this->mq->publish('application.status.updated', ['id' => $id, 'status' => ApplicationStatus::REJECTED]); // placeholder

        return $updated;
    }
}
