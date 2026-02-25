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

    public function send(): void
    {
        http_response_code($this->status);

        foreach ($this->headers as $k => $v) {
            header("$k: $v");
        }

        echo $this->content;
    }
}

