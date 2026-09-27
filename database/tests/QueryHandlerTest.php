<?php declare(strict_types=1);

namespace Database\Tests;

use Database\QueryHandler;

final class QueryHandlerTest extends DatabaseTestCase
{
    // Runs every queue with realistic input. Any query that references a missing column or
    // table surfaces here as a database error, which is how schema drift gets caught.
    public function testEveryQueueRunsAgainstTheSchema(): void
    {
        $user    = $this->user('owner@example.com');
        $admin   = $this->user('admin@example.com', 'super_admin');
        $shelter = $this->shelter();
        $dog     = $this->dog($shelter);
        $this->db()->query("INSERT INTO api_keys (shelter_id, api_key, is_active) VALUES ({$shelter}, 'k1', 1)");
        $this->db()->query("INSERT INTO quiz_questions (question_text) VALUES ('Energy?')");
        $this->db()->query("INSERT INTO quiz_options (question_id, option_text, maps_to_attribute, maps_to_value) VALUES (1, 'Lots', 'energy_level', 'high')");
        $app     = $this->ok('db.application.submit', ['user_id' => $user, 'dog_id' => $dog])['application_id'];
        $chat    = $this->ok('db.chat.start', ['user_id' => $user, 'shelter_id' => $shelter, 'dog_id' => $dog])['session_id'];
        $story   = $this->ok('db.stories.submit', ['user_id' => $user, 'dog_id' => $dog, 'title' => 'Home', 'story' => 'Happy'])['story_id'];
        $log     = $this->ok('db.adoption.log.create', ['user_id' => $user, 'dog_id' => $dog, 'log_type' => 'Note', 'title' => 'Vet'])['log_id'];
        $foster  = $this->ok('db.foster.apply', ['user_id' => $user, 'dog_id' => $dog, 'sponsorship_amount' => 10])['foster_id'];
        $meet    = $this->ok('db.meetgreet.schedule', ['user_id' => $user, 'dog_id' => $dog, 'shelter_id' => $shelter, 'scheduled_date' => '2026-10-01', 'scheduled_time' => '10:00'])['session_id'];
        $verifyToken = $this->db()->query("SELECT verification_token FROM users WHERE user_id = {$user}")->fetch_row()[0];

        $calls = [
            ['db.auth.login', ['email' => 'owner@example.com']],
            ['db.auth.refreshVerification', ['email' => 'owner@example.com']],
            ['db.auth.resetPassword', ['email' => 'owner@example.com', 'password_hash' => password_hash('new', PASSWORD_BCRYPT), 'new_password_plain' => 'new']],
            ['db.profile.update', ['user_id' => $user, 'first_name' => 'A', 'login_notifications' => true]],
            ['db.dogs.list', ['size' => 'medium', 'energy_level' => 'high', 'shelter_id' => $shelter, 'max_age' => 10]],
            ['db.dogs.get', ['dog_id' => $dog]],
            ['db.shelters.list', []],
            ['db.shelters.get', ['shelter_id' => $shelter]],
            ['db.shelters.upsert', ['name' => 'Imported', 'external_id' => 'org-1', 'latitude' => '40.7', 'longitude' => '']],
            ['db.api.key.get', ['shelter_id' => $shelter]],
            ['db.api.key.regenerate', ['shelter_id' => $shelter]],
            ['db.api.logs', ['shelter_id' => $shelter]],
            ['db.api.log', ['shelter_id' => $shelter, 'endpoint' => '/dogs', 'method' => 'POST']],
            ['db.application.status', ['application_id' => $app, 'user_id' => $user]],
            ['db.application.list', ['user_id' => $user]],
            ['db.application.list', ['shelter_id' => $shelter]],
            ['db.application.list', []],
            ['db.application.approve', ['application_id' => $app, 'reviewed_by' => $admin]],
            ['db.application.reject', ['application_id' => $app, 'reviewed_by' => $admin]],
            ['db.adoptions.finalize', ['application_id' => $app, 'finalized_by' => $admin, 'notes' => 'Done']],
            ['db.adoptions.list', ['user_id' => $user]],
            ['db.parks.list', []],
            ['db.resources.list', []],
            ['db.notifications.list', ['user_id' => $user]],
            ['db.notifications.read', ['user_id' => $user]],
            ['db.stories.list', ['include_pending' => true]],
            ['db.stories.approve', ['story_id' => $story, 'approved_by' => $admin]],
            ['db.badges.list', []],
            ['db.badges.mine', ['user_id' => $user]],
            ['db.chat.sessions', ['user_id' => $user]],
            ['db.chat.message', ['session_id' => $chat, 'sender_id' => $user, 'message' => 'Hi']],
            ['db.chat.history', ['session_id' => $chat, 'user_id' => $user]],
            ['db.enquiry.send', ['user_id' => $user, 'dog_id' => $dog, 'shelter_id' => $shelter, 'message' => 'Is Rex available?']],
            ['db.meetgreet.list', ['user_id' => $user]],
            ['db.meetgreet.cancel', ['session_id' => $meet, 'user_id' => $user]],
            ['db.foster.list', ['user_id' => $user]],
            ['db.foster.cancel', ['foster_id' => $foster, 'user_id' => $user]],
            ['db.adoption.log.list', ['user_id' => $user, 'dog_id' => $dog]],
            ['db.adoption.log.delete', ['log_id' => $log, 'user_id' => $user]],
            ['db.quiz.questions', []],
            ['db.quiz.submit', ['user_id' => $user, 'answers' => [1]]],
            ['db.quiz.results', ['user_id' => $user]],
            ['db.saved_dogs.add', ['user_id' => $user, 'dog_id' => $dog]],
            ['db.saved_dogs.list', ['user_id' => $user]],
            ['db.saved_dogs.remove', ['user_id' => $user, 'dog_id' => $dog]],
            ['db.auth.verify', ['token' => $verifyToken]],
            ['db.account.delete', ['user_id' => $user]],
        ];

        $covered = ['db.auth.register', 'db.api.dog.upsert', 'db.application.submit', 'db.chat.start', 'db.stories.submit',
                    'db.adoption.log.create', 'db.foster.apply', 'db.meetgreet.schedule', 'db.adoptions.get', 'db.resources.get',
                    'db.api.key.validate'];
        foreach ($calls as [$queue, $data]) {
            $result = $this->call($queue, $data);
            $this->assertNotSame('A database error occurred', $result['error'] ?? null, "{$queue}: " . implode(' | ', $this->logged));
            $covered[] = $queue;
        }
        $this->assertSame([], array_values(array_diff(QueryHandler::queues(), $covered)), 'Queues missing from this test');
    }

    public function testUnknownQueueIsRejected(): void
    {
        $this->assertSame(['success' => false, 'error' => 'Unknown request'], $this->call('db.drop.everything', []));
    }

    // ── Injection ───────────────────────────────────────────────────────────

    public function testHostileInputIsStoredLiterally(): void
    {
        $evil = "x'); DROP TABLE users; -- \\' \" `";
        $user = $this->user();
        $this->ok('db.profile.update', ['user_id' => $user, 'first_name' => $evil]);

        $stored = $this->db()->query("SELECT first_name FROM users WHERE user_id = {$user}")->fetch_row()[0];
        $this->assertSame($evil, $stored);
        $this->assertSame(1, (int)$this->db()->query('SELECT COUNT(*) FROM users')->fetch_row()[0]);
    }

    public function testFilterValuesCannotAlterTheQuery(): void
    {
        $this->dog($this->shelter());

        $result = $this->ok('db.dogs.list', ['breed' => "x' OR '1'='1"]);
        $this->assertSame([], $result['dogs']);
    }

    // ── Ownership: users only see and change their own rows ─────────────────

    public function testUserCannotReadSomeoneElsesChat(): void
    {
        $owner    = $this->user();
        $intruder = $this->user();
        $chat     = $this->ok('db.chat.start', ['user_id' => $owner, 'shelter_id' => $this->shelter()])['session_id'];
        $this->ok('db.chat.message', ['session_id' => $chat, 'sender_id' => $owner, 'message' => 'private']);

        $this->assertSame('Chat not found', $this->call('db.chat.history', ['session_id' => $chat, 'user_id' => $intruder])['error']);
        $this->assertCount(1, $this->ok('db.chat.history', ['session_id' => $chat, 'user_id' => $owner])['messages']);
    }

    public function testUserCannotPostIntoSomeoneElsesChat(): void
    {
        $owner = $this->user();
        $chat  = $this->ok('db.chat.start', ['user_id' => $owner, 'shelter_id' => $this->shelter()])['session_id'];

        $result = $this->call('db.chat.message', ['session_id' => $chat, 'sender_id' => $this->user(), 'message' => 'spam']);

        $this->assertFalse($result['success']);
        $this->assertSame(0, (int)$this->db()->query('SELECT COUNT(*) FROM chat_messages')->fetch_row()[0]);
    }

    public function testUserCannotReadSomeoneElsesApplication(): void
    {
        $owner = $this->user();
        $app   = $this->ok('db.application.submit', ['user_id' => $owner, 'dog_id' => $this->dog($this->shelter())])['application_id'];

        $this->assertFalse($this->call('db.application.status', ['application_id' => $app, 'user_id' => $this->user()])['success']);
        $this->assertTrue($this->call('db.application.status', ['application_id' => $app, 'user_id' => $owner])['success']);
    }

    public function testUserScopedListIgnoresShelterFilter(): void
    {
        $shelter = $this->shelter();
        $dog     = $this->dog($shelter);
        $this->ok('db.application.submit', ['user_id' => $this->user(), 'dog_id' => $dog]);
        $me = $this->user();

        $result = $this->ok('db.application.list', ['user_id' => $me, 'shelter_id' => $shelter]);

        $this->assertSame([], $result['applications']);
    }

    public function testUserCannotDeleteSomeoneElsesJournalEntry(): void
    {
        $owner = $this->user();
        $log   = $this->ok('db.adoption.log.create', ['user_id' => $owner, 'title' => 'Mine'])['log_id'];

        $this->assertSame('Log not found', $this->call('db.adoption.log.delete', ['log_id' => $log, 'user_id' => $this->user()])['error']);
        $this->ok('db.adoption.log.delete', ['log_id' => $log, 'user_id' => $owner]);
    }

    // ── Behaviour ───────────────────────────────────────────────────────────

    public function testListLimitIsCapped(): void
    {
        $user = $this->user();
        $this->db()->query('INSERT INTO success_stories (user_id, title, story, status) VALUES '
            . implode(',', array_fill(0, 105, "({$user}, 't', 's', 'approved')")));

        $this->assertCount(100, $this->ok('db.stories.list', ['limit' => 1000000])['stories']);
        $this->assertCount(1, $this->ok('db.stories.list', ['limit' => -5])['stories']);
    }

    // The browse and admin pages load the whole dog catalogue in one request (limit 500).
    public function testDogListAllowsTheWholeCatalogueButNoMore(): void
    {
        $shelter = $this->shelter();
        $this->db()->query('INSERT INTO dogs (shelter_id, name, status) VALUES '
            . implode(',', array_fill(0, 505, "({$shelter}, 'Dog', 'available')")));

        $this->assertCount(500, $this->ok('db.dogs.list', ['limit' => 500])['dogs']);
        $this->assertCount(500, $this->ok('db.dogs.list', ['limit' => 1000000])['dogs']);
    }

    public function testPublicStoriesExcludePendingButAdminsSeeThem(): void
    {
        $user = $this->user();
        $this->ok('db.stories.submit', ['user_id' => $user, 'title' => 'Pending one', 'story' => '...']);

        $this->assertSame([], $this->ok('db.stories.list', [])['stories']);
        $this->assertCount(1, $this->ok('db.stories.list', ['include_pending' => true])['stories']);
    }

    public function testFinalizingTwiceIsRejected(): void
    {
        $app = $this->ok('db.application.submit', ['user_id' => $this->user(), 'dog_id' => $this->dog($this->shelter())])['application_id'];

        $this->ok('db.adoptions.finalize', ['application_id' => $app]);

        $this->assertFalse($this->call('db.adoptions.finalize', ['application_id' => $app])['success']);
        $this->assertSame(1, (int)$this->db()->query('SELECT COUNT(*) FROM adoptions')->fetch_row()[0]);
    }

    public function testRegeneratedApiKeyIsTheOneReturnedToTheAdmin(): void
    {
        $shelter = $this->shelter();
        $this->db()->query("INSERT INTO api_keys (shelter_id, api_key, is_active) VALUES ({$shelter}, 'old', 1)");
        $key = str_repeat('ab', 32);

        $this->assertSame($key, $this->ok('db.api.key.regenerate', ['shelter_id' => $shelter, 'new_key' => $key])['api_key']);
        $this->assertTrue($this->call('db.api.key.validate', ['api_key' => $key])['valid']);
    }

    public function testAccountDeleteRemovesAllOfTheUsersData(): void
    {
        $user    = $this->user();
        $shelter = $this->shelter();
        $dog     = $this->dog($shelter);
        $chat    = $this->ok('db.chat.start', ['user_id' => $user, 'shelter_id' => $shelter])['session_id'];
        $this->ok('db.chat.message', ['session_id' => $chat, 'sender_id' => $user, 'message' => 'hi']);
        $this->ok('db.saved_dogs.add', ['user_id' => $user, 'dog_id' => $dog]);
        $this->ok('db.adoption.log.create', ['user_id' => $user, 'dog_id' => $dog]);
        $app = $this->ok('db.application.submit', ['user_id' => $user, 'dog_id' => $dog])['application_id'];
        $this->ok('db.adoptions.finalize', ['application_id' => $app]);

        $this->ok('db.account.delete', ['user_id' => $user]);

        foreach (['users', 'chat_sessions', 'chat_messages', 'saved_dogs', 'post_adoption_logs', 'adoptions', 'adoption_applications'] as $table) {
            $this->assertSame(0, (int)$this->db()->query("SELECT COUNT(*) FROM {$table}")->fetch_row()[0], $table);
        }
    }

    public function testRegistrationAlwaysCreatesAnAdopter(): void
    {
        $id = $this->ok('db.auth.register', ['email' => 'x@example.com', 'password_hash' => 'h', 'role' => 'super_admin'])['user_id'];

        $this->assertSame('adopter', $this->db()->query("SELECT role FROM users WHERE user_id = {$id}")->fetch_row()[0]);
    }

    public function testQuizMatchesDogsOnSelectedTraits(): void
    {
        $shelter = $this->shelter();
        $high = $this->dog($shelter, ['energy_level' => 'high']);
        $this->dog($shelter, ['energy_level' => 'low']);
        $this->db()->query("INSERT INTO quiz_questions (question_text) VALUES ('Energy?')");
        $this->db()->query("INSERT INTO quiz_options (question_id, option_text, maps_to_attribute, maps_to_value) VALUES (1, 'Lots', 'energy_level', 'high')");

        $result = $this->ok('db.quiz.submit', ['user_id' => $this->user(), 'answers' => [1, 'not-a-number']]);

        $this->assertSame([$high], $result['matched_dog_ids']);
    }

    public function testDatabaseErrorsAreNotLeakedToClients(): void
    {
        $result = $this->call('db.application.submit', ['user_id' => 999999, 'dog_id' => 999999]);

        $this->assertSame('A database error occurred', $result['error']);
        $this->assertNotEmpty($this->logged, 'the real error should be logged for operators');
    }
}
