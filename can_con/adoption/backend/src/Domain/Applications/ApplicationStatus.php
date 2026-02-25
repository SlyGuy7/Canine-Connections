<?php declare(strict_types=1);

namespace App\Domain\Applications;

final class ApplicationStatus
{
    public const PENDING  = 'pending';
    public const APPROVED = 'approved';
    public const REJECTED = 'rejected';
}
