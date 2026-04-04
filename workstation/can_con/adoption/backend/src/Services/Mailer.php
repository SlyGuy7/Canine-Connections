<?php declare(strict_types=1);

namespace App\Services;

final class Mailer
{
    public static function send(string $to, string $subject, string $body): bool
    {
        try {
            $client = \Resend::client($_ENV['RESEND_API_KEY']);
            $result = $client->emails->send([
                'from'    => $_ENV['MAIL_FROM'] ?? 'onboarding@resend.dev',
                'to'      => [$to],
                'subject' => $subject,
                'html'    => $body,
            ]);
            echo "[Mailer] Email sent to {$to} — ID: {$result->id}\n";
            return isset($result->id);
        } catch (\Throwable $e) {
            echo "[Mailer][ERROR] {$e->getMessage()}\n";
            return false;
        }
    }

    public static function welcome(string $to, string $firstName): bool
    {
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

    public static function passwordReset(string $to, string $firstName): bool
    {
        return self::send(
            $to,
            'Password Reset Successful — Canine Connections',
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
        return self::send(
            $to,
            'Application Received — Canine Connections',
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
        return self::send(
            $to,
            'Application Approved — Canine Connections',
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
        return self::send(
            $to,
            'Application Update — Canine Connections',
            "
            <div style='font-family:sans-serif;max-width:600px;margin:auto;padding:20px'>
                <h1 style='color:#b45309'>Application Update</h1>
                <p>Hi {$firstName},</p>
                <p>Unfortunately your adoption application for <strong>{$dogName}</strong> was not successful this time.</p>
                <p>Please browse our other available dogs — your perfect match is out there!</p>
                <br>
                <p style='color:#666'>The Canine Connections Team</p>
            </div>
            "
        );
    }

    public static function meetGreetConfirmed(string $to, string $firstName, string $dogName, string $date, string $time): bool
    {
        return self::send(
            $to,
            'Meet & Greet Confirmed — Canine Connections',
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
        return self::send(
            $to,
            'Adoption Complete — Canine Connections',
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