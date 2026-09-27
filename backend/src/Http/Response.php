<?php declare(strict_types=1);

namespace App\Http;

final class Response
{
    public function __construct(
        private string $content,
        private int $status = 200,
        private array $headers = []
    ) {}

    public static function json(array $data, int $status = 200): self
    {
        return new self(
            json_encode($data),
            $status,
            ['Content-Type' => 'application/json']
        );
    }

    public static function html(string $html, int $status = 200): self
    {
        return new self(
            $html,
            $status,
            ['Content-Type' => 'text/html']
        );
    }

    // 303 See Other: after a form POST, the browser follows up with a GET to $location.
    public static function redirect(string $location, int $status = 303): self
    {
        return new self('', $status, ['Location' => $location]);
    }

    public function send(): void
    {
        http_response_code($this->status);

        foreach ($this->headers as $k => $v) {
            header("$k: $v");
        }

        echo $this->content;
    }
}

