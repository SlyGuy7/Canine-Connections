<?php declare(strict_types=1);

namespace App\Services;

use App\Repositories\Contracts\ApplicationRepository;
use App\Domain\Applications\ApplicationStatus;

final class AdminService
{
    public function __construct(private ApplicationRepository $apps) {}

    public function overview(): array
    {
        return [
            'totalApplications' => count($this->apps->list()),
            'pending'  => $this->apps->countByStatus(ApplicationStatus::PENDING),
            'approved' => $this->apps->countByStatus(ApplicationStatus::APPROVED),
            'rejected' => $this->apps->countByStatus(ApplicationStatus::REJECTED),
            'systemStatus' => 'Operational',
        ];
    }
}
