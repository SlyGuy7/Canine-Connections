<?php declare(strict_types=1);

namespace Tests\Security;

use App\Security\LoginThrottle;
use PHPUnit\Framework\TestCase;

final class LoginThrottleTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/canine-throttle-' . bin2hex(random_bytes(4));
        mkdir($this->dir);
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->dir . '/*') ?: []);
        rmdir($this->dir);
    }

    public function testLocksAfterMaxAttempts(): void
    {
        $throttle = new LoginThrottle($this->dir);

        for ($i = 1; $i < LoginThrottle::MAX_ATTEMPTS; $i++) {
            $this->assertSame($i, $throttle->fail('acct:a@b.c'));
            $this->assertNull($throttle->lockedUntil('acct:a@b.c'));
        }
        $throttle->fail('acct:a@b.c');

        $until = $throttle->lockedUntil('acct:a@b.c');
        $this->assertNotNull($until);
        $this->assertGreaterThan(time(), $until);
    }

    public function testKeysAreIndependent(): void
    {
        $throttle = new LoginThrottle($this->dir);
        for ($i = 0; $i < LoginThrottle::MAX_ATTEMPTS; $i++) {
            $throttle->fail('acct:a@b.c');
        }

        $this->assertNull($throttle->lockedUntil('acct:other@b.c'));
        $this->assertNull($throttle->lockedUntil('ip:1.2.3.4'));
    }

    public function testClearResetsCount(): void
    {
        $throttle = new LoginThrottle($this->dir);
        $throttle->fail('ip:1.2.3.4');
        $throttle->clear('ip:1.2.3.4');

        $this->assertSame(1, $throttle->fail('ip:1.2.3.4'));
    }

    public function testCountResetsAfterWindow(): void
    {
        $throttle = new LoginThrottle($this->dir);
        for ($i = 0; $i < LoginThrottle::MAX_ATTEMPTS; $i++) {
            $throttle->fail('ip:1.2.3.4');
        }
        foreach (glob($this->dir . '/*') as $file) {
            touch($file, time() - LoginThrottle::WINDOW - 1);
        }

        $this->assertNull($throttle->lockedUntil('ip:1.2.3.4'));
        $this->assertSame(1, $throttle->fail('ip:1.2.3.4'));
    }

    public function testKeyIsHashedSoPathCannotEscapeDirectory(): void
    {
        $throttle = new LoginThrottle($this->dir);
        $throttle->fail('ip:../../etc/passwd');

        $files = glob($this->dir . '/*');
        $this->assertCount(1, $files);
        $this->assertMatchesRegularExpression('/canine-attempts-[0-9a-f]{64}$/', $files[0]);
    }
}
