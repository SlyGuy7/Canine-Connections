<?php declare(strict_types=1);

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;

final class Mailer
{
    /** Emails captured when MAIL_DRIVER=log (used by tests and local development). */
    public static array $sent = [];

    public static function send(string $to, string $subject, string $body): bool
    {
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            echo "[Mailer][WARN] Skipped email with invalid recipient\n";
            return false;
        }
        // MAIL_DRIVER=log records emails instead of sending them over SMTP.
        if (($_ENV['MAIL_DRIVER'] ?? getenv('MAIL_DRIVER')) === 'log') {
            self::$sent[] = ['to' => $to, 'subject' => $subject, 'body' => $body];
            echo "[Mailer] (log) {$subject} -> {$to}\n";
            return true;
        }

        $attempts = 3;
        $lastError = '';
        for ($i = 1; $i <= $attempts; $i++) {
            try {
                $mail = new PHPMailer(true);
                $mail->isSMTP();
                $mail->Host       = $_ENV['SMTP_HOST'] ?? 'smtp.gmail.com';
                $mail->SMTPAuth   = true;
                $mail->Username   = $_ENV['SMTP_USER'] ?? '';
                $mail->Password   = $_ENV['SMTP_PASS'] ?? '';
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                $mail->Port       = (int)($_ENV['SMTP_PORT'] ?? 587);
                $mail->Timeout    = 60;
                $mail->setFrom(
                    $_ENV['SMTP_USER'] ?? '',
                    $_ENV['MAIL_FROM_NAME'] ?? 'Canine Connections'
                );
                $mail->addAddress($to);
                $mail->isHTML(true);
                $mail->Subject = $subject;
                $mail->Body    = $body;
                $mail->send();
                echo "[Mailer] Email sent to {$to}\n";
                return true;
            } catch (\Throwable $e) {
                $lastError = $e->getMessage();
                echo "[Mailer][WARN] Attempt {$i}/{$attempts} failed: {$lastError}\n";
                if ($i < $attempts) sleep(3);
            }
        }
        echo "[Mailer][ERROR] All {$attempts} attempts failed for {$to}: {$lastError}\n";
        return false;
    }

    // Values inserted into the HTML templates below come from users (names) or the database,
    // so they are escaped to keep them from injecting markup or links into our emails.
    private static function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function resetPasswordLink(string $to, string $firstName, string $resetUrl): bool
    {
        $firstName = self::escape($firstName);
        $resetUrl = self::escape($resetUrl);
        return self::send(
            $to,
            'Reset Your Password - Canine Connections',
            "<div style='font-family:sans-serif;max-width:600px;margin:auto;padding:20px'>
                <h1 style='color:#b45309'>Reset Your Password</h1>
                <p>Hi {$firstName},</p>
                <p>We received a request to reset your password. Click the button below to choose a new one.</p>
                <p style='color:#999;font-size:13px'>This link expires in 1 hour and can only be used once.</p>
                <div style='text-align:center;margin:32px 0'>
                    <a href='{$resetUrl}' style='background:#d97706;color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block'>Reset Password</a>
                </div>
                <p style='color:#999;font-size:13px'>If the button doesn't work, paste this into your browser:<br>{$resetUrl}</p>
                <p style='color:#999;font-size:13px'>If you didn't request a reset, you can safely ignore this email.</p>
                <br><p style='color:#666'>The Canine Connections Team</p>
            </div>"
        );
    }

    public static function welcome(string $to, string $firstName): bool
    {
        $firstName = self::escape($firstName);
        return self::send(
            $to,
            'Welcome to Canine Connections',
            "
            <div style='font-family:sans-serif;max-width:600px;margin:auto;padding:20px'>
                <h1 style='color:#b45309'>Welcome to Canine Connections!</h1>
                <p>Hi {$firstName},</p>
                <p>Your account has been created successfully. You can now browse dogs, take the compatibility quiz, and apply to adopt.</p>
                <p>We are excited to help you find your perfect companion.</p>
                <br>
                <p style='color:#666'>The Canine Connections Team</p>
            </div>
            "
        );
    }

    public static function verifyEmail(string $to, string $firstName, string $verifyUrl): bool
    {
        $firstName = self::escape($firstName);
        $verifyUrl = self::escape($verifyUrl);
        return self::send(
            $to,
            'Verify Your Email -Canine Connections',
            "
            <div style='font-family:sans-serif;max-width:600px;margin:auto;padding:20px'>
                <h1 style='color:#b45309'>Welcome to Canine Connections!</h1>
                <p>Hi {$firstName},</p>
                <p>Thanks for registering! Please verify your email address to activate your account.</p>
                <div style='text-align:center;margin:32px 0'>
                    <a href='{$verifyUrl}' style='background:#d97706;color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block'>Verify My Email</a>
                </div>
                <p style='color:#999;font-size:13px'>If the button doesn't work, copy this link into your browser:<br>{$verifyUrl}</p>
                <p style='color:#999;font-size:13px'>If you did not create an account, you can safely ignore this email.</p>
                <br>
                <p style='color:#666'>The Canine Connections Team</p>
            </div>
            "
        );
    }

    public static function loginAlert(string $to, string $firstName): bool
    {
        $firstName = self::escape($firstName);
        $time = date('F j, Y \a\t g:i A T');
        return self::send(
            $to,
            'New Login Detected -Canine Connections',
            "
            <div style='font-family:sans-serif;max-width:600px;margin:auto;padding:20px'>
                <h1 style='color:#b45309'>New Login Detected</h1>
                <p>Hi {$firstName},</p>
                <p>We noticed a new login to your Canine Connections account on <strong>{$time}</strong>.</p>
                <p>If this was you, no action is needed.</p>
                <p>If you did not log in, please change your password immediately by visiting your account settings.</p>
                <br>
                <p style='color:#666'>The Canine Connections Team</p>
            </div>
            "
        );
    }

    public static function passwordReset(string $to, string $firstName): bool
    {
        $firstName = self::escape($firstName);
        return self::send(
            $to,
            'Password Reset Successful -Canine Connections',
            "
            <div style='font-family:sans-serif;max-width:600px;margin:auto;padding:20px'>
                <h1 style='color:#b45309'>Password Reset Successful</h1>
                <p>Hi {$firstName},</p>
                <p>Your password has been successfully updated.</p>
                <p>If you did not make this change please contact us immediately.</p>
                <br>
                <p style='color:#666'>The Canine Connections Team</p>
            </div>
            "
        );
    }

    public static function applicationReceived(string $to, string $firstName, string $dogName): bool
    {
        $firstName = self::escape($firstName);
        $dogName = self::escape($dogName);
        return self::send(
            $to,
            'Application Received -Canine Connections',
            "
            <div style='font-family:sans-serif;max-width:600px;margin:auto;padding:20px'>
                <h1 style='color:#b45309'>Application Received</h1>
                <p>Hi {$firstName},</p>
                <p>We have received your adoption application for <strong>{$dogName}</strong>.</p>
                <p>Our team will review it and get back to you soon.</p>
                <br>
                <p style='color:#666'>The Canine Connections Team</p>
            </div>
            "
        );
    }

    public static function applicationApproved(string $to, string $firstName, string $dogName): bool
    {
        $firstName = self::escape($firstName);
        $dogName = self::escape($dogName);
        return self::send(
            $to,
            'Application Approved -Canine Connections',
            "
            <div style='font-family:sans-serif;max-width:600px;margin:auto;padding:20px'>
                <h1 style='color:#b45309'>Congratulations!</h1>
                <p>Hi {$firstName},</p>
                <p>Your adoption application for <strong>{$dogName}</strong> has been <strong>approved</strong>!</p>
                <p>Please contact the shelter to arrange pickup.</p>
                <br>
                <p style='color:#666'>The Canine Connections Team</p>
            </div>
            "
        );
    }

    public static function applicationRejected(string $to, string $firstName, string $dogName): bool
    {
        $firstName = self::escape($firstName);
        $dogName = self::escape($dogName);
        return self::send(
            $to,
            'Application Update -Canine Connections',
            "
            <div style='font-family:sans-serif;max-width:600px;margin:auto;padding:20px'>
                <h1 style='color:#b45309'>Application Update</h1>
                <p>Hi {$firstName},</p>
                <p>Unfortunately your adoption application for <strong>{$dogName}</strong> was not successful this time.</p>
                <p>Please browse our other available dogs -your perfect match is out there!</p>
                <br>
                <p style='color:#666'>The Canine Connections Team</p>
            </div>
            "
        );
    }

    public static function meetGreetConfirmed(string $to, string $firstName, string $dogName, string $date, string $time): bool
    {
        $firstName = self::escape($firstName);
        $dogName = self::escape($dogName);
        $date = self::escape($date);
        $time = self::escape($time);
        return self::send(
            $to,
            'Meet & Greet Confirmed -Canine Connections',
            "
            <div style='font-family:sans-serif;max-width:600px;margin:auto;padding:20px'>
                <h1 style='color:#b45309'>Meet & Greet Confirmed</h1>
                <p>Hi {$firstName},</p>
                <p>Your virtual meet & greet with <strong>{$dogName}</strong> is confirmed for <strong>{$date}</strong> at <strong>{$time}</strong>.</p>
                <p>Check your notifications for the video link.</p>
                <br>
                <p style='color:#666'>The Canine Connections Team</p>
            </div>
            "
        );
    }

    public static function adoptionComplete(string $to, string $firstName, string $dogName): bool
    {
        $firstName = self::escape($firstName);
        $dogName = self::escape($dogName);
        return self::send(
            $to,
            'Adoption Complete -Canine Connections',
            "
            <div style='font-family:sans-serif;max-width:600px;margin:auto;padding:20px'>
                <h1 style='color:#b45309'>Welcome to the Family!</h1>
                <p>Hi {$firstName},</p>
                <p>Your adoption of <strong>{$dogName}</strong> is now complete. Congratulations!</p>
                <p>Don't forget to log your journey in your post-adoption diary and share your story with the community.</p>
                <br>
                <p style='color:#666'>The Canine Connections Team</p>
            </div>
            "
        );
    }
}