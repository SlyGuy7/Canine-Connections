<?php declare(strict_types=1);

namespace App\Security;

// Decides who may call each request.* queue and rewrites identity fields from the session token.
//
// The browser can put anything in a message, so user_id, sender_id, reviewed_by, etc. are never
// trusted from the payload: they are overwritten with the user ID from the verified session token.
// Queues not listed as public require a login (default deny).
final class AccessPolicy
{
    public const ADMIN_ROLES = ['super_admin', 'shelter_admin'];

    // Callable without logging in.
    private const PUBLIC = [
        'request.auth.register',
        'request.auth.login',
        'request.auth.verify',
        'request.auth.forgotPassword',
        'request.auth.setNewPassword',
        'request.auth.resendVerification',
        'request.shelters.list',
        'request.shelters.get',
        'request.dogs.list',
        'request.dogs.get',
        'request.quiz.questions',
        'request.parks.list',
        'request.resources.list',
        'request.resources.get',
        'request.stories.list',
        'request.badges.list',
    ];

    // Admin-only queues, mapped to the payload field that records which admin acted.
    private const ADMIN = [
        'request.application.approve' => 'reviewed_by',
        'request.application.reject'  => 'reviewed_by',
        'request.adoptions.finalize'  => 'finalized_by',
        'request.stories.approve'     => 'approved_by',
        'request.api.dog.upsert'      => null,
        'request.api.key.get'         => null,
        'request.api.key.regenerate'  => null,
        'request.api.logs'            => null,
    ];

    // Logged-in queues where admins may query any user (e.g. the admin applications screen).
    private const ADMIN_MAY_QUERY_OTHERS = [
        'request.application.list',
    ];

    // Returns ['ok' => true, 'data' => sanitized payload, 'session' => claims|null]
    // or      ['ok' => false, 'code' => 'auth_required'|'forbidden', 'error' => message].
    public static function check(string $queue, array $data): array
    {
        $token = $data['_token'] ?? null;
        unset($data['_token']);

        if (in_array($queue, self::PUBLIC, true)) {
            return ['ok' => true, 'data' => $data, 'session' => null];
        }

        $session = SessionToken::verify(is_string($token) ? $token : null, SessionToken::TYPE_SESSION);
        if ($session === null) {
            return ['ok' => false, 'code' => 'auth_required', 'error' => 'Please log in to continue.'];
        }

        $userId  = (int)$session['uid'];
        $isAdmin = in_array($session['role'] ?? '', self::ADMIN_ROLES, true);

        if (array_key_exists($queue, self::ADMIN)) {
            if (!$isAdmin) {
                return ['ok' => false, 'code' => 'forbidden', 'error' => 'Admin privileges required.'];
            }
            $actorField = self::ADMIN[$queue];
            if ($actorField !== null) {
                $data[$actorField] = $userId;
            }
            return ['ok' => true, 'data' => $data, 'session' => $session];
        }

        if (!($isAdmin && in_array($queue, self::ADMIN_MAY_QUERY_OTHERS, true))) {
            $data['user_id'] = $userId;
        }
        if ($queue === 'request.chat.message') {
            $data['sender_id'] = $userId;
        }
        // Handlers email the user (confirmations) or look them up by email (password change):
        // always the logged-in account's address, never one from the payload.
        $data['email'] = (string)($session['email'] ?? '');

        return ['ok' => true, 'data' => $data, 'session' => $session];
    }

    public static function isAdminRole(?string $role): bool
    {
        return in_array($role, self::ADMIN_ROLES, true);
    }
}
