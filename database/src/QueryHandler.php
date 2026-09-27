<?php declare(strict_types=1);

namespace Database;

use mysqli;
use mysqli_sql_exception;
use mysqli_stmt;

// Executes the db.* requests the bridge layer forwards to the database worker.
//
// Every query is a prepared statement: values are bound as parameters and never concatenated
// into SQL. Queries on per-user data are filtered by user_id (set by the frontend worker from
// the verified session), so a user can only read or change their own rows.
final class QueryHandler
{
    // Largest page a list request may ask for. The dog list is larger because the browse and
    // admin pages load the whole catalogue (up to ~500 imported dogs) in one request.
    private const MAX_LIMIT      = 100;
    private const MAX_DOGS_LIMIT = 500;

    // MySQL errors that mean the connection or node is unusable (gone away, lost, read-only
    // secondary after a failover). These are rethrown so db_worker.php can fail over.
    private const CONNECTION_ERRORS = [2002, 2003, 2006, 2013, 1290, 1836, 3100];

    private const ROUTES = [
        'db.auth.register'            => 'authRegister',
        'db.auth.login'               => 'authLogin',
        'db.auth.resetPassword'       => 'authResetPassword',
        'db.auth.refreshVerification' => 'authRefreshVerification',
        'db.auth.verify'              => 'authVerify',
        'db.profile.update'           => 'profileUpdate',
        'db.account.delete'           => 'accountDelete',
        'db.dogs.list'                => 'dogsList',
        'db.dogs.get'                 => 'dogsGet',
        'db.shelters.list'            => 'sheltersList',
        'db.shelters.upsert'          => 'sheltersUpsert',
        'db.shelters.get'             => 'sheltersGet',
        'db.api.key.get'              => 'apiKeyGet',
        'db.api.key.regenerate'       => 'apiKeyRegenerate',
        'db.api.key.validate'         => 'apiKeyValidate',
        'db.api.logs'                 => 'apiLogs',
        'db.api.log'                  => 'apiLog',
        'db.api.dog.upsert'           => 'apiDogUpsert',
        'db.application.submit'       => 'applicationSubmit',
        'db.application.status'       => 'applicationStatus',
        'db.application.list'         => 'applicationList',
        'db.application.approve'      => 'applicationApprove',
        'db.application.reject'       => 'applicationReject',
        'db.parks.list'               => 'parksList',
        'db.resources.list'           => 'resourcesList',
        'db.resources.get'            => 'resourcesGet',
        'db.notifications.list'       => 'notificationsList',
        'db.notifications.read'       => 'notificationsRead',
        'db.stories.list'             => 'storiesList',
        'db.stories.submit'           => 'storiesSubmit',
        'db.stories.approve'          => 'storiesApprove',
        'db.badges.list'              => 'badgesList',
        'db.badges.mine'              => 'badgesMine',
        'db.chat.start'               => 'chatStart',
        'db.chat.sessions'            => 'chatSessions',
        'db.chat.message'             => 'chatMessage',
        'db.chat.history'             => 'chatHistory',
        'db.meetgreet.schedule'       => 'meetGreetSchedule',
        'db.meetgreet.list'           => 'meetGreetList',
        'db.meetgreet.cancel'         => 'meetGreetCancel',
        'db.foster.apply'             => 'fosterApply',
        'db.foster.list'              => 'fosterList',
        'db.foster.cancel'            => 'fosterCancel',
        'db.adoption.log.create'      => 'adoptionLogCreate',
        'db.adoption.log.list'        => 'adoptionLogList',
        'db.adoption.log.delete'      => 'adoptionLogDelete',
        'db.quiz.questions'           => 'quizQuestions',
        'db.quiz.submit'              => 'quizSubmit',
        'db.quiz.results'             => 'quizResults',
        'db.adoptions.list'           => 'adoptionsList',
        'db.adoptions.get'            => 'adoptionsGet',
        'db.adoptions.finalize'       => 'adoptionsFinalize',
        'db.enquiry.send'             => 'enquirySend',
        'db.saved_dogs.list'          => 'savedDogsList',
        'db.saved_dogs.add'           => 'savedDogsAdd',
        'db.saved_dogs.remove'        => 'savedDogsRemove',
    ];

    /** @var callable(string): void */
    private $log;

    public function __construct(private mysqli $db, ?callable $log = null)
    {
        $this->log = $log ?? static function (string $msg): void {};
    }

    /** Queue names this handler serves; db_worker.php consumes exactly these. */
    public static function queues(): array
    {
        return array_keys(self::ROUTES);
    }

    public function handle(string $queue, array $data): array
    {
        $method = self::ROUTES[$queue] ?? null;
        if ($method === null) {
            return ['success' => false, 'error' => 'Unknown request'];
        }
        try {
            return $this->{$method}($data);
        } catch (mysqli_sql_exception $e) {
            if (in_array($e->getCode(), self::CONNECTION_ERRORS, true)) {
                throw $e;
            }
            // Details go to the worker log only; clients get a generic message.
            ($this->log)("[DB][ERROR] {$queue}: [{$e->getCode()}] {$e->getMessage()}");
            return ['success' => false, 'error' => 'A database error occurred'];
        }
    }

    // ── Auth ────────────────────────────────────────────────────────────────

    private function authRegister(array $d): array
    {
        if (!isset($d['email'], $d['password_hash'])) return $this->fail('Missing email or password_hash');
        if ($this->one('SELECT user_id FROM users WHERE email = ? LIMIT 1', [$d['email']])) {
            return $this->fail('Email already registered');
        }
        $token = bin2hex(random_bytes(32));
        $this->transaction(function () use ($d, $token, &$userId) {
            $userId = $this->insert(
                'INSERT INTO users (email, password_hash, first_name, last_name, phone, address, role, email_verified, verification_token)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
                [$d['email'], $d['password_hash'], $d['first_name'] ?? '', $d['last_name'] ?? '',
                 $d['phone'] ?? '', $d['address'] ?? '', 'adopter', $token]
            );
            if (!empty($d['id_one_b64']) || !empty($d['id_two_b64'])) {
                $this->insert(
                    'INSERT INTO id_verifications (user_id, id_one_data, id_one_filename, id_two_data, id_two_filename) VALUES (?, ?, ?, ?, ?)',
                    [$userId, $d['id_one_b64'] ?? '', $d['id_one_name'] ?? '', $d['id_two_b64'] ?? '', $d['id_two_name'] ?? '']
                );
            }
        });
        return ['success' => true, 'user_id' => $userId, 'verification_token' => $token];
    }

    private function authLogin(array $d): array
    {
        if (!isset($d['email'])) return $this->fail('Missing email');
        $user = $this->one(
            'SELECT user_id, email, password_hash, role, first_name, last_name, phone, address, email_verified, login_notifications
             FROM users WHERE email = ? LIMIT 1',
            [$d['email']]
        );
        return $user ? ['success' => true, 'user' => $user] : ['success' => false, 'user' => null];
    }

    private function authResetPassword(array $d): array
    {
        if (!isset($d['email'], $d['password_hash'])) return $this->fail('Missing email or password_hash');
        if (isset($d['new_password_plain'])) {
            $current = $this->one('SELECT password_hash FROM users WHERE email = ? LIMIT 1', [$d['email']]);
            if ($current && password_verify((string)$d['new_password_plain'], $current['password_hash'])) {
                return $this->fail('New password cannot be the same as your current password.');
            }
        }
        $changed = $this->exec('UPDATE users SET password_hash = ? WHERE email = ?', [$d['password_hash'], $d['email']]);
        return $changed ? ['success' => true] : $this->fail('User not found');
    }

    private function authRefreshVerification(array $d): array
    {
        if (!isset($d['email'])) return $this->fail('Missing email');
        $row = $this->one('SELECT user_id, first_name FROM users WHERE email = ? AND email_verified = 0 LIMIT 1', [$d['email']]);
        if (!$row) return $this->fail('Not found or already verified');
        $token = bin2hex(random_bytes(32));
        $this->exec('UPDATE users SET verification_token = ? WHERE user_id = ?', [$token, (int)$row['user_id']]);
        return ['success' => true, 'verification_token' => $token, 'first_name' => $row['first_name']];
    }

    private function authVerify(array $d): array
    {
        if (empty($d['token']) || !is_string($d['token'])) return $this->fail('Missing token');
        $row = $this->one('SELECT user_id FROM users WHERE verification_token = ? AND email_verified = 0 LIMIT 1', [$d['token']]);
        if (!$row) return $this->fail('Invalid or expired verification link');
        $userId = (int)$row['user_id'];
        $this->exec('UPDATE users SET email_verified = 1, verification_token = NULL WHERE user_id = ?', [$userId]);
        ($this->log)("Email verified for user_id={$userId}");
        return ['success' => true, 'user_id' => $userId];
    }

    // ── Account ─────────────────────────────────────────────────────────────

    private function profileUpdate(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $sets   = 'first_name = ?, last_name = ?, phone = ?, address = ?';
        $params = [$d['first_name'] ?? '', $d['last_name'] ?? '', $d['phone'] ?? '', $d['address'] ?? ''];
        if (array_key_exists('login_notifications', $d)) {
            $sets    .= ', login_notifications = ?';
            $params[] = $d['login_notifications'] ? 1 : 0;
        }
        $params[] = (int)$d['user_id'];
        $this->exec("UPDATE users SET {$sets} WHERE user_id = ?", $params);
        return ['success' => true];
    }

    private function accountDelete(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $id = (int)$d['user_id'];
        if (!$this->one('SELECT user_id FROM users WHERE user_id = ? LIMIT 1', [$id])) return $this->fail('User not found');

        // Child rows go first (foreign keys); all-or-nothing so a failure never leaves a half-deleted account.
        $this->transaction(function () use ($id) {
            foreach ([
                'DELETE FROM user_badges WHERE user_id = ?',
                'DELETE FROM quiz_results WHERE user_id = ?',
                'DELETE FROM virtual_foster WHERE user_id = ?',
                'DELETE FROM meet_greet_sessions WHERE user_id = ?',
                'DELETE FROM saved_dogs WHERE user_id = ?',
                'DELETE FROM chat_messages WHERE session_id IN (SELECT session_id FROM chat_sessions WHERE user_id = ?)',
                'DELETE FROM chat_messages WHERE sender_id = ?',
                'DELETE FROM chat_sessions WHERE user_id = ?',
                'DELETE FROM notifications WHERE user_id = ?',
                'DELETE FROM id_verifications WHERE user_id = ?',
                'UPDATE success_stories SET approved_by = NULL WHERE approved_by = ?',
                'DELETE FROM success_stories WHERE user_id = ?',
                'UPDATE adoption_applications SET reviewed_by = NULL WHERE reviewed_by = ?',
                'DELETE FROM post_adoption_logs WHERE user_id = ?',
                'DELETE FROM post_adoption_logs WHERE adoption_id IN (SELECT adoption_id FROM adoptions WHERE user_id = ?)',
                'DELETE FROM adoptions WHERE user_id = ?',
                'DELETE FROM adoption_applications WHERE user_id = ?',
                'DELETE FROM users WHERE user_id = ?',
            ] as $sql) {
                $this->exec($sql, [$id]);
            }
        });
        return ['success' => true];
    }

    // ── Dogs & shelters ─────────────────────────────────────────────────────

    private function dogsList(array $d): array
    {
        $where  = ['d.status = ?'];
        $params = [(string)($d['status'] ?? 'available')];
        foreach (['breed', 'size', 'energy_level'] as $col) {
            if (!empty($d[$col])) { $where[] = "d.{$col} = ?"; $params[] = (string)$d[$col]; }
        }
        if (!empty($d['shelter_id'])) { $where[] = 'd.shelter_id = ?'; $params[] = (int)$d['shelter_id']; }
        if (isset($d['max_age']) && $d['max_age'] !== '') { $where[] = 'd.age_years <= ?'; $params[] = (int)$d['max_age']; }
        $params[] = $this->limit($d, 20, self::MAX_DOGS_LIMIT);
        $params[] = $this->offset($d);

        $dogs = $this->all(
            'SELECT d.*, GROUP_CONCAT(p.photo_url ORDER BY p.is_primary DESC) AS photos
             FROM dogs d LEFT JOIN dog_photos p ON d.dog_id = p.dog_id
             WHERE ' . implode(' AND ', $where) . '
             GROUP BY d.dog_id ORDER BY RAND() LIMIT ? OFFSET ?',
            $params
        );
        return ['success' => true, 'dogs' => $dogs];
    }

    private function dogsGet(array $d): array
    {
        if (!isset($d['dog_id'])) return $this->fail('dog_id is required');
        $id  = (int)$d['dog_id'];
        $dog = $this->one('SELECT * FROM dogs WHERE dog_id = ? LIMIT 1', [$id]);
        if (!$dog) return $this->fail('Dog not found');
        $dog['photos'] = $this->all('SELECT * FROM dog_photos WHERE dog_id = ? ORDER BY is_primary DESC', [$id]);
        return ['success' => true, 'dog' => $dog];
    }

    private function sheltersList(array $d): array
    {
        return ['success' => true, 'shelters' => $this->all('SELECT * FROM shelters ORDER BY name ASC')];
    }

    private function sheltersUpsert(array $d): array
    {
        if (!isset($d['name'])) return $this->fail('Missing name');
        $coord = static fn ($v) => isset($v) && $v !== '' ? (float)$v : null;
        $this->exec(
            'INSERT INTO shelters (name, address, city, state, zip, latitude, longitude, phone, email, website, external_id, description, logo_url, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name = VALUES(name), address = VALUES(address), city = VALUES(city), state = VALUES(state),
               zip = VALUES(zip), latitude = VALUES(latitude), longitude = VALUES(longitude), phone = VALUES(phone),
               email = VALUES(email), website = VALUES(website), description = VALUES(description),
               logo_url = VALUES(logo_url), is_active = VALUES(is_active)',
            [substr((string)$d['name'], 0, 255), $d['address'] ?? '', $d['city'] ?? '', $d['state'] ?? '', $d['zip'] ?? '',
             $coord($d['latitude'] ?? null), $coord($d['longitude'] ?? null), $d['phone'] ?? '', $d['email'] ?? '',
             $d['website'] ?? '', $d['external_id'] ?? '', $d['description'] ?? '', $d['logo_url'] ?? '',
             isset($d['is_active']) ? (int)$d['is_active'] : 1]
        );
        $action = $this->db->affected_rows === 1 ? 'inserted' : 'updated';
        $row    = $this->one('SELECT shelter_id FROM shelters WHERE external_id = ? LIMIT 1', [$d['external_id'] ?? '']);
        return ['success' => true, 'shelter_id' => $row['shelter_id'] ?? $this->db->insert_id, 'action' => $action];
    }

    private function sheltersGet(array $d): array
    {
        if (!isset($d['shelter_id'])) return $this->fail('Missing shelter_id');
        $shelter = $this->one('SELECT * FROM shelters WHERE shelter_id = ? LIMIT 1', [(int)$d['shelter_id']]);
        return $shelter ? ['success' => true, 'shelter' => $shelter] : $this->fail('Shelter not found');
    }

    // ── Shelter API keys ────────────────────────────────────────────────────

    private function apiKeyGet(array $d): array
    {
        if (!isset($d['shelter_id'])) return $this->fail('Missing shelter_id');
        $key = $this->one('SELECT * FROM api_keys WHERE shelter_id = ? AND is_active = 1 LIMIT 1', [(int)$d['shelter_id']]);
        return $key ? ['success' => true, 'key' => $key] : $this->fail('No active API key found');
    }

    private function apiKeyRegenerate(array $d): array
    {
        if (!isset($d['shelter_id'])) return $this->fail('Missing shelter_id');
        // Store the key the frontend worker generated (and returns to the admin), so both match.
        $newKey = is_string($d['new_key'] ?? null) && preg_match('/^[0-9a-f]{64}$/', $d['new_key'])
            ? $d['new_key']
            : bin2hex(random_bytes(32));
        $this->exec('UPDATE api_keys SET api_key = ?, updated_at = NOW() WHERE shelter_id = ?', [$newKey, (int)$d['shelter_id']]);
        return ['success' => true, 'api_key' => $newKey];
    }

    private function apiKeyValidate(array $d): array
    {
        if (!isset($d['api_key'])) return $this->fail('Missing api_key');
        $row = $this->one('SELECT shelter_id FROM api_keys WHERE api_key = ? AND is_active = 1 LIMIT 1', [(string)$d['api_key']]);
        if (!$row) return ['valid' => false];
        $this->exec('UPDATE api_keys SET last_used_at = NOW() WHERE api_key = ?', [(string)$d['api_key']]);
        return ['valid' => true, 'shelter_id' => $row['shelter_id']];
    }

    private function apiLogs(array $d): array
    {
        if (!isset($d['shelter_id'])) return $this->fail('Missing shelter_id');
        $logs = $this->all(
            'SELECT * FROM api_logs WHERE shelter_id = ? ORDER BY called_at DESC LIMIT ? OFFSET ?',
            [(int)$d['shelter_id'], $this->limit($d, 50), $this->offset($d)]
        );
        return ['success' => true, 'logs' => $logs];
    }

    private function apiLog(array $d): array
    {
        $this->exec(
            'INSERT INTO api_logs (key_id, shelter_id, endpoint, method, payload_summary, response_status, ip_address, called_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [(int)($d['key_id'] ?? 0), (int)($d['shelter_id'] ?? 0), $d['endpoint'] ?? '', $d['method'] ?? 'POST',
             $d['payload_summary'] ?? '', (int)($d['response_status'] ?? 200), $d['ip_address'] ?? '']
        );
        return ['success' => true];
    }

    private function apiDogUpsert(array $d): array
    {
        $flag       = static fn ($k) => !empty($d[$k]) ? 1 : 0;
        $externalId = (string)($d['external_id'] ?? '');
        $dogId      = null;
        $action     = 'inserted';

        if ($externalId !== '') {
            $row = $this->one('SELECT dog_id FROM dogs WHERE external_id = ? LIMIT 1', [$externalId]);
            if ($row) { $dogId = (int)$row['dog_id']; $action = 'updated'; }
        }
        if (!$dogId && (int)($d['dog_id'] ?? 0) > 0) { $dogId = (int)$d['dog_id']; $action = 'updated'; }

        $fields = [
            'name' => $d['name'] ?? '', 'breed' => $d['breed'] ?? '', 'age_years' => (int)($d['age_years'] ?? 0),
            'size' => $d['size'] ?? 'medium', 'gender' => $d['gender'] ?? 'male', 'description' => $d['description'] ?? '',
            'energy_level' => $d['energy_level'] ?? 'medium', 'training_level' => $d['training_level'] ?? 'basic',
            'ideal_owner_activity' => $d['ideal_owner_activity'] ?? 'moderate',
            'good_with_kids' => $flag('good_with_kids'), 'good_with_dogs' => $flag('good_with_dogs'),
            'good_with_cats' => $flag('good_with_cats'), 'apartment_friendly' => $flag('apartment_friendly'),
            'requires_yard' => $flag('requires_yard'), 'is_vaccinated' => $flag('is_vaccinated'),
            'is_spayed_neutered' => $flag('is_spayed_neutered'),
            'status' => $d['status'] ?? 'available', 'source' => $d['source'] ?? 'api',
        ];

        $this->transaction(function () use (&$dogId, $action, $fields, $d, $externalId) {
            if ($action === 'updated') {
                $sets = implode(', ', array_map(fn ($c) => "{$c} = ?", array_keys($fields)));
                $this->exec("UPDATE dogs SET {$sets}, last_synced_at = NOW() WHERE dog_id = ?", [...array_values($fields), $dogId]);
            } else {
                $cols = array_merge(['shelter_id'], array_keys($fields), ['intake_date', 'external_id']);
                $vals = array_merge([(int)($d['shelter_id'] ?? 0)], array_values($fields), [$d['intake_date'] ?? date('Y-m-d'), $externalId]);
                $marks = implode(', ', array_fill(0, count($cols), '?'));
                $dogId = $this->insert('INSERT INTO dogs (' . implode(', ', $cols) . ", last_synced_at) VALUES ({$marks}, NOW())", $vals);
            }
            if (!empty($d['photos']) && is_array($d['photos'])) {
                $this->exec('DELETE FROM dog_photos WHERE dog_id = ?', [$dogId]);
                $hasPrimary = false;
                foreach ($d['photos'] as $photo) {
                    if (empty($photo['url'])) continue;
                    $isPrimary = !$hasPrimary && !empty($photo['is_primary']) ? 1 : 0;
                    $hasPrimary = $hasPrimary || $isPrimary === 1;
                    $this->insert('INSERT INTO dog_photos (dog_id, photo_url, is_primary, caption) VALUES (?, ?, ?, ?)',
                        [$dogId, (string)$photo['url'], $isPrimary, (string)($photo['caption'] ?? '')]);
                }
            }
        });
        ($this->log)("Dog {$action}: dog_id={$dogId}");
        return ['success' => true, 'dog_id' => $dogId, 'action' => $action];
    }

    // ── Applications & adoptions ────────────────────────────────────────────

    private function applicationSubmit(array $d): array
    {
        if (!isset($d['user_id'], $d['dog_id'])) return $this->fail('Missing user_id or dog_id');
        $id = $this->insert(
            'INSERT INTO adoption_applications (user_id, dog_id, full_name, address, phone, housing_type, has_yard, has_other_pets,
               other_pets_description, has_children, children_ages, prior_pet_experience, reason_for_adopting, vet_reference, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'pending\')',
            [(int)$d['user_id'], (int)$d['dog_id'], $d['full_name'] ?? '', $d['address'] ?? '', $d['phone'] ?? '',
             $d['housing_type'] ?? 'house', (int)($d['has_yard'] ?? 0), (int)($d['has_other_pets'] ?? 0),
             $d['other_pets_description'] ?? '', (int)($d['has_children'] ?? 0), $d['children_ages'] ?? '',
             $d['prior_pet_experience'] ?? '', $d['reason_for_adopting'] ?? '', $d['vet_reference'] ?? '']
        );
        return ['success' => true, 'application_id' => $id];
    }

    private function applicationStatus(array $d): array
    {
        if (!isset($d['application_id'])) return $this->fail('Missing application_id');
        $app = $this->one(
            'SELECT * FROM adoption_applications WHERE application_id = ? AND user_id = ? LIMIT 1',
            [(int)$d['application_id'], (int)($d['user_id'] ?? 0)]
        );
        return $app ? ['success' => true, 'application' => $app] : $this->fail('Application not found');
    }

    // Adopters always arrive with user_id set to themselves (AccessPolicy), so that filter wins;
    // admins may filter by shelter or see everything.
    private function applicationList(array $d): array
    {
        $base = 'SELECT aa.*, u.email, u.first_name, u.last_name, u.phone, d.name AS dog_name
                 FROM adoption_applications aa JOIN users u ON aa.user_id = u.user_id LEFT JOIN dogs d ON aa.dog_id = d.dog_id';
        if (!empty($d['user_id'])) {
            $rows = $this->all("{$base} WHERE aa.user_id = ? ORDER BY aa.application_id DESC", [(int)$d['user_id']]);
        } elseif (!empty($d['shelter_id'])) {
            $rows = $this->all("{$base} WHERE d.shelter_id = ? ORDER BY aa.application_id DESC", [(int)$d['shelter_id']]);
        } else {
            $rows = $this->all("{$base} ORDER BY aa.application_id DESC");
        }
        return ['success' => true, 'applications' => $rows];
    }

    private function applicationApprove(array $d): array
    {
        return $this->decideApplication($d, 'approved');
    }

    private function applicationReject(array $d): array
    {
        return $this->decideApplication($d, 'rejected');
    }

    private function decideApplication(array $d, string $status): array
    {
        if (!isset($d['application_id'])) return $this->fail('Missing application_id');
        $id = (int)$d['application_id'];
        $this->exec(
            'UPDATE adoption_applications SET status = ?, reviewed_by = ?, reviewer_notes = ? WHERE application_id = ?',
            [$status, isset($d['reviewed_by']) ? (int)$d['reviewed_by'] : null, $d['reviewer_notes'] ?? '', $id]
        );
        $row = $this->one(
            'SELECT aa.user_id, u.email, u.first_name, d.name AS dog_name FROM adoption_applications aa
             JOIN users u ON aa.user_id = u.user_id JOIN dogs d ON aa.dog_id = d.dog_id WHERE aa.application_id = ?',
            [$id]
        );
        if (!$row) return $this->fail('Application not found');
        return ['success' => true, 'user_id' => $row['user_id'], 'email' => $row['email'] ?? '',
                'first_name' => $row['first_name'] ?? '', 'dog_name' => $row['dog_name'] ?? ''];
    }

    private function adoptionsList(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $rows = $this->all(
            'SELECT a.*, d.name AS dog_name, d.breed FROM adoptions a JOIN dogs d ON a.dog_id = d.dog_id
             WHERE a.user_id = ? ORDER BY a.adoption_id DESC',
            [(int)$d['user_id']]
        );
        return ['success' => true, 'adoptions' => $rows];
    }

    private function adoptionsGet(array $d): array
    {
        if (!isset($d['adoption_id'])) return $this->fail('Missing adoption_id');
        $row = $this->one(
            'SELECT a.*, d.name AS dog_name FROM adoptions a JOIN dogs d ON a.dog_id = d.dog_id
             WHERE a.adoption_id = ? AND a.user_id = ? LIMIT 1',
            [(int)$d['adoption_id'], (int)($d['user_id'] ?? 0)]
        );
        return $row ? ['success' => true, 'adoption' => $row] : $this->fail('Not found');
    }

    private function adoptionsFinalize(array $d): array
    {
        if (!isset($d['application_id'])) return $this->fail('Missing application_id');
        $appId = (int)$d['application_id'];
        $app   = $this->one('SELECT * FROM adoption_applications WHERE application_id = ? LIMIT 1', [$appId]);
        if (!$app) return $this->fail('Application not found');
        if ($app['status'] === 'finalized') return $this->fail('This adoption has already been finalized');

        $this->transaction(function () use ($app, $appId, $d) {
            $this->insert(
                'INSERT INTO adoptions (user_id, dog_id, application_id, finalized_by, notes, adopted_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [(int)$app['user_id'], (int)$app['dog_id'], $appId, isset($d['finalized_by']) ? (int)$d['finalized_by'] : null, $d['notes'] ?? '']
            );
            $this->exec("UPDATE dogs SET status = 'adopted' WHERE dog_id = ?", [(int)$app['dog_id']]);
            $this->exec("UPDATE adoption_applications SET status = 'finalized' WHERE application_id = ?", [$appId]);
        });
        return ['success' => true, 'user_id' => $app['user_id'], 'dog_id' => $app['dog_id']];
    }

    // ── Content ─────────────────────────────────────────────────────────────

    private function parksList(array $d): array
    {
        return ['success' => true, 'parks' => $this->all('SELECT * FROM pet_parks')];
    }

    private function resourcesList(array $d): array
    {
        return ['success' => true, 'resources' => $this->all('SELECT * FROM resources ORDER BY created_at DESC')];
    }

    private function resourcesGet(array $d): array
    {
        if (!isset($d['resource_id'])) return $this->fail('Missing resource_id');
        $row = $this->one('SELECT * FROM resources WHERE resource_id = ? LIMIT 1', [(int)$d['resource_id']]);
        return $row ? ['success' => true, 'resource' => $row] : $this->fail('Not found');
    }

    // The public sees approved stories; admins (include_pending, set by the frontend worker
    // from the verified session) also see pending ones so they can review them.
    private function storiesList(array $d): array
    {
        $filter = !empty($d['include_pending']) ? '' : "WHERE ss.status = 'approved'";
        $rows = $this->all(
            "SELECT ss.*, u.first_name, u.last_name FROM success_stories ss JOIN users u ON ss.user_id = u.user_id
             {$filter} ORDER BY ss.created_at DESC LIMIT ? OFFSET ?",
            [$this->limit($d, 10), $this->offset($d)]
        );
        return ['success' => true, 'stories' => $rows];
    }

    private function storiesSubmit(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $id = $this->insert(
            "INSERT INTO success_stories (user_id, dog_id, title, story, photo_url, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', NOW())",
            [(int)$d['user_id'], isset($d['dog_id']) ? (int)$d['dog_id'] : null, $d['title'] ?? '', $d['story'] ?? '', $d['photo_url'] ?? '']
        );
        return ['success' => true, 'story_id' => $id];
    }

    private function storiesApprove(array $d): array
    {
        if (!isset($d['story_id'])) return $this->fail('Missing story_id');
        $this->exec(
            "UPDATE success_stories SET status = 'approved', approved_by = ? WHERE story_id = ?",
            [isset($d['approved_by']) ? (int)$d['approved_by'] : null, (int)$d['story_id']]
        );
        return ['success' => true];
    }

    private function badgesList(array $d): array
    {
        return ['success' => true, 'badges' => $this->all('SELECT * FROM badges ORDER BY badge_id ASC')];
    }

    private function badgesMine(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $rows = $this->all(
            'SELECT b.*, ub.earned_at FROM user_badges ub JOIN badges b ON ub.badge_id = b.badge_id
             WHERE ub.user_id = ? ORDER BY ub.earned_at DESC',
            [(int)$d['user_id']]
        );
        return ['success' => true, 'badges' => $rows];
    }

    private function notificationsList(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $rows = $this->all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [(int)$d['user_id']]);
        return ['success' => true, 'notifications' => $rows];
    }

    private function notificationsRead(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        if (!empty($d['notification_id'])) {
            $this->exec('UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?', [(int)$d['notification_id'], (int)$d['user_id']]);
        } else {
            $this->exec('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [(int)$d['user_id']]);
        }
        return ['success' => true];
    }

    // ── Chat ────────────────────────────────────────────────────────────────

    private function chatStart(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $userId    = (int)$d['user_id'];
        $shelterId = (int)($d['shelter_id'] ?? 0);
        $dogId     = !empty($d['dog_id']) ? (int)$d['dog_id'] : null;

        $existing = $this->one(
            "SELECT session_id FROM chat_sessions WHERE user_id = ? AND dog_id <=> ? AND shelter_id = ? AND status = 'open' LIMIT 1",
            [$userId, $dogId, $shelterId]
        );
        if ($existing) return ['success' => true, 'session_id' => $existing['session_id']];

        $id = $this->insert("INSERT INTO chat_sessions (user_id, dog_id, shelter_id, status) VALUES (?, ?, ?, 'open')", [$userId, $dogId, $shelterId]);
        return ['success' => true, 'session_id' => $id];
    }

    private function chatSessions(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $rows = $this->all(
            'SELECT cs.session_id, cs.shelter_id, cs.dog_id, cs.status, cs.started_at, s.name AS shelter_name, s.city, s.state, s.phone, s.email,
                    (SELECT cm.message FROM chat_messages cm WHERE cm.session_id = cs.session_id ORDER BY cm.sent_at DESC LIMIT 1) AS last_message,
                    (SELECT cm.sent_at FROM chat_messages cm WHERE cm.session_id = cs.session_id ORDER BY cm.sent_at DESC LIMIT 1) AS last_message_at
             FROM chat_sessions cs JOIN shelters s ON cs.shelter_id = s.shelter_id
             WHERE cs.user_id = ? ORDER BY cs.started_at DESC',
            [(int)$d['user_id']]
        );
        return ['success' => true, 'sessions' => $rows];
    }

    // Only the owner of a chat session can post to it.
    private function chatMessage(array $d): array
    {
        if (!isset($d['session_id'], $d['sender_id'])) return $this->fail('Missing fields');
        $message = trim((string)($d['message'] ?? ''));
        if ($message === '') return $this->fail('Message cannot be empty');
        $senderId = (int)$d['sender_id'];
        $owned = $this->one('SELECT session_id FROM chat_sessions WHERE session_id = ? AND user_id = ? LIMIT 1', [(int)$d['session_id'], $senderId]);
        if (!$owned) return $this->fail('Chat not found');
        $id = $this->insert('INSERT INTO chat_messages (session_id, sender_id, message, sent_at) VALUES (?, ?, ?, NOW())', [(int)$d['session_id'], $senderId, $message]);
        return ['success' => true, 'message_id' => $id];
    }

    // Only the owner of a chat session can read it.
    private function chatHistory(array $d): array
    {
        if (!isset($d['session_id'])) return $this->fail('Missing session_id');
        $owned = $this->one('SELECT session_id FROM chat_sessions WHERE session_id = ? AND user_id = ? LIMIT 1', [(int)$d['session_id'], (int)($d['user_id'] ?? 0)]);
        if (!$owned) return $this->fail('Chat not found');
        $rows = $this->all(
            'SELECT cm.*, u.first_name, u.last_name FROM chat_messages cm JOIN users u ON cm.sender_id = u.user_id
             WHERE cm.session_id = ? ORDER BY cm.sent_at ASC',
            [(int)$d['session_id']]
        );
        return ['success' => true, 'messages' => $rows];
    }

    private function enquirySend(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $userId = (int)$d['user_id'];
        $this->transaction(function () use ($d, $userId, &$sessionId) {
            $sessionId = $this->insert(
                "INSERT INTO chat_sessions (user_id, dog_id, shelter_id, status) VALUES (?, ?, ?, 'open')",
                [$userId, !empty($d['dog_id']) ? (int)$d['dog_id'] : null, (int)($d['shelter_id'] ?? 0)]
            );
            $this->insert('INSERT INTO chat_messages (session_id, sender_id, message, sent_at) VALUES (?, ?, ?, NOW())', [$sessionId, $userId, (string)($d['message'] ?? '')]);
        });
        return ['success' => true, 'session_id' => $sessionId];
    }

    // ── Meet & greet, fostering, journal ────────────────────────────────────

    private function meetGreetSchedule(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $id = $this->insert(
            "INSERT INTO meet_greet_sessions (user_id, dog_id, shelter_id, scheduled_date, scheduled_time, video_link, status)
             VALUES (?, ?, ?, ?, ?, ?, 'scheduled')",
            [(int)$d['user_id'], (int)($d['dog_id'] ?? 0), (int)($d['shelter_id'] ?? 0),
             $d['scheduled_date'] ?? null, $d['scheduled_time'] ?? null, $d['video_link'] ?? '']
        );
        return ['success' => true, 'session_id' => $id];
    }

    private function meetGreetList(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $rows = $this->all(
            'SELECT mg.*, d.name AS dog_name FROM meet_greet_sessions mg JOIN dogs d ON mg.dog_id = d.dog_id
             WHERE mg.user_id = ? ORDER BY mg.scheduled_date ASC',
            [(int)$d['user_id']]
        );
        return ['success' => true, 'sessions' => $rows];
    }

    private function meetGreetCancel(array $d): array
    {
        if (!isset($d['session_id'])) return $this->fail('Missing session_id');
        $this->exec("UPDATE meet_greet_sessions SET status = 'cancelled' WHERE session_id = ? AND user_id = ?", [(int)$d['session_id'], (int)($d['user_id'] ?? 0)]);
        return ['success' => true];
    }

    private function fosterApply(array $d): array
    {
        if (!isset($d['user_id'], $d['dog_id'])) return $this->fail('Missing fields');
        $id = $this->insert(
            "INSERT INTO virtual_foster (user_id, dog_id, sponsorship_amount, status, start_date) VALUES (?, ?, ?, 'active', ?)",
            [(int)$d['user_id'], (int)$d['dog_id'], (float)($d['sponsorship_amount'] ?? 0), $d['start_date'] ?? date('Y-m-d')]
        );
        return ['success' => true, 'foster_id' => $id];
    }

    private function fosterList(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $rows = $this->all(
            'SELECT vf.*, d.name AS dog_name FROM virtual_foster vf JOIN dogs d ON vf.dog_id = d.dog_id
             WHERE vf.user_id = ? ORDER BY vf.start_date DESC',
            [(int)$d['user_id']]
        );
        return ['success' => true, 'fosters' => $rows];
    }

    private function fosterCancel(array $d): array
    {
        if (!isset($d['foster_id'])) return $this->fail('Missing foster_id');
        $this->exec("UPDATE virtual_foster SET status = 'cancelled' WHERE foster_id = ? AND user_id = ?", [(int)$d['foster_id'], (int)($d['user_id'] ?? 0)]);
        return ['success' => true];
    }

    private function adoptionLogCreate(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $id = $this->insert(
            'INSERT INTO post_adoption_logs (user_id, dog_id, log_type, title, notes, log_date) VALUES (?, ?, ?, ?, ?, ?)',
            [(int)$d['user_id'], (int)($d['dog_id'] ?? 0), $d['log_type'] ?? 'general', $d['title'] ?? '', $d['notes'] ?? '', $d['log_date'] ?? date('Y-m-d')]
        );
        return ['success' => true, 'log_id' => $id];
    }

    private function adoptionLogList(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $rows = $this->all(
            'SELECT * FROM post_adoption_logs WHERE user_id = ? AND dog_id = ? ORDER BY log_date DESC',
            [(int)$d['user_id'], (int)($d['dog_id'] ?? 0)]
        );
        return ['success' => true, 'logs' => $rows];
    }

    private function adoptionLogDelete(array $d): array
    {
        if (!isset($d['log_id'])) return $this->fail('Missing log_id');
        $deleted = $this->exec('DELETE FROM post_adoption_logs WHERE log_id = ? AND user_id = ?', [(int)$d['log_id'], (int)($d['user_id'] ?? 0)]);
        return $deleted ? ['success' => true] : $this->fail('Log not found');
    }

    // ── Quiz ────────────────────────────────────────────────────────────────

    private function quizQuestions(array $d): array
    {
        $questions = $this->all('SELECT * FROM quiz_questions ORDER BY question_id ASC');
        $byQuestion = [];
        foreach ($this->all('SELECT * FROM quiz_options ORDER BY question_id ASC, option_id ASC') as $opt) {
            $byQuestion[$opt['question_id']][] = $opt;
        }
        foreach ($questions as &$q) {
            $q['options'] = $byQuestion[$q['question_id']] ?? [];
        }
        return ['success' => true, 'questions' => $questions];
    }

    // Scores available dogs by how many of the traits picked in the quiz they match.
    private function quizSubmit(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $answers = array_values(array_map('intval', array_filter((array)($d['answers'] ?? []), 'is_numeric')));
        $matched = [];

        if ($answers) {
            $marks  = implode(',', array_fill(0, count($answers), '?'));
            $traits = [];
            foreach ($this->all("SELECT maps_to_attribute, maps_to_value FROM quiz_options WHERE option_id IN ({$marks})", $answers) as $opt) {
                if (!empty($opt['maps_to_attribute']) && ($opt['maps_to_value'] ?? '') !== '') {
                    $traits[$opt['maps_to_attribute']] = $opt['maps_to_value'];
                }
            }

            // Column names come from this fixed list only; the values are bound parameters.
            $textTraits = ['energy_level', 'size', 'gender'];
            $flagTraits = ['good_with_kids', 'apartment_friendly', 'good_with_dogs', 'good_with_cats', 'requires_yard', 'is_vaccinated'];
            $parts = [];
            $params = [];
            foreach ($textTraits as $col) {
                if (!empty($traits[$col])) { $parts[] = "({$col} = ?)"; $params[] = (string)$traits[$col]; }
            }
            foreach ($flagTraits as $col) {
                if (isset($traits[$col]) && $traits[$col] !== '') { $parts[] = "({$col} = ?)"; $params[] = (int)$traits[$col]; }
            }

            if ($parts) {
                $params[] = (int)ceil(count($parts) * 0.6);
                $rows = $this->all(
                    "SELECT dog_id, (" . implode(' + ', $parts) . ") AS match_score FROM dogs
                     WHERE status = 'available' HAVING match_score >= ? ORDER BY match_score DESC LIMIT 10",
                    $params
                );
            } else {
                $rows = $this->all("SELECT dog_id FROM dogs WHERE status = 'available' LIMIT 10");
            }
            $matched = array_map('intval', array_column($rows, 'dog_id'));
        }

        $this->insert(
            'INSERT INTO quiz_results (user_id, answers_json, matched_dog_ids) VALUES (?, ?, ?)',
            [(int)$d['user_id'], json_encode($answers), json_encode($matched)]
        );
        return ['success' => true, 'matched_dog_ids' => $matched];
    }

    private function quizResults(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $row = $this->one('SELECT * FROM quiz_results WHERE user_id = ? ORDER BY result_id DESC LIMIT 1', [(int)$d['user_id']]);
        return $row ? ['success' => true, 'result' => $row] : $this->fail('No results found');
    }

    // ── Saved dogs ──────────────────────────────────────────────────────────

    private function savedDogsList(array $d): array
    {
        if (!isset($d['user_id'])) return $this->fail('Missing user_id');
        $rows = $this->all(
            'SELECT d.*, GROUP_CONCAT(p.photo_url ORDER BY p.is_primary DESC) AS photos
             FROM saved_dogs sd JOIN dogs d ON sd.dog_id = d.dog_id LEFT JOIN dog_photos p ON d.dog_id = p.dog_id
             WHERE sd.user_id = ? GROUP BY d.dog_id, sd.created_at ORDER BY sd.created_at DESC',
            [(int)$d['user_id']]
        );
        return ['success' => true, 'dogs' => $rows];
    }

    private function savedDogsAdd(array $d): array
    {
        if (!isset($d['user_id'], $d['dog_id'])) return $this->fail('Missing user_id or dog_id');
        $this->exec('INSERT IGNORE INTO saved_dogs (user_id, dog_id) VALUES (?, ?)', [(int)$d['user_id'], (int)$d['dog_id']]);
        return ['success' => true];
    }

    private function savedDogsRemove(array $d): array
    {
        if (!isset($d['user_id'], $d['dog_id'])) return $this->fail('Missing user_id or dog_id');
        $this->exec('DELETE FROM saved_dogs WHERE user_id = ? AND dog_id = ?', [(int)$d['user_id'], (int)$d['dog_id']]);
        return ['success' => true];
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function fail(string $error): array
    {
        return ['success' => false, 'error' => $error];
    }

    private function limit(array $d, int $default, int $max = self::MAX_LIMIT): int
    {
        return max(1, min($max, (int)($d['limit'] ?? $default)));
    }

    private function offset(array $d): int
    {
        return max(0, (int)($d['offset'] ?? 0));
    }

    // Prepares and executes $sql with $params bound by PHP type (int → i, float → d, else s).
    private function run(string $sql, array $params = []): mysqli_stmt
    {
        $stmt = $this->db->prepare($sql);
        if ($params) {
            $types  = '';
            $values = [];
            foreach ($params as $p) {
                if (is_bool($p)) $p = (int)$p;
                $types   .= is_int($p) ? 'i' : (is_float($p) ? 'd' : 's');
                $values[] = $p === null || is_int($p) || is_float($p) ? $p : (string)$p;
            }
            $stmt->bind_param($types, ...$values);
        }
        $stmt->execute();
        return $stmt;
    }

    private function all(string $sql, array $params = []): array
    {
        $result = $this->run($sql, $params)->get_result();
        return $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    }

    private function one(string $sql, array $params = []): ?array
    {
        $result = $this->run($sql, $params)->get_result();
        return $result ? ($result->fetch_assoc() ?: null) : null;
    }

    /** Returns the number of affected rows. */
    private function exec(string $sql, array $params = []): int
    {
        return (int)$this->run($sql, $params)->affected_rows;
    }

    /** Returns the new auto-increment id. */
    private function insert(string $sql, array $params = []): int
    {
        return (int)$this->run($sql, $params)->insert_id;
    }

    private function transaction(callable $work): void
    {
        $this->db->begin_transaction();
        try {
            $work();
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw $e;
        }
    }
}
