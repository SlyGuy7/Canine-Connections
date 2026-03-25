<?php declare(strict_types=1);

namespace App\Http;

use App\Util\Logger;

final class ErrorHandler
{
    public function __construct(private Logger $logger, private bool $debug) {}

    public function handle(callable $fn): Response
    {
        try {
            $res = $fn();
            if (!$res instanceof Response) {
                return Response::json(['error' => 'internal_error', 'message' => 'Invalid response type'], 500);
            }
            return $res;
        } catch (\RuntimeException $e) {
            $msg = $e->getMessage();

            // Map known runtime exceptions to status codes
            if ($msg === 'unauthorized') return Response::json(['error' => 'unauthorized'], 401);
            if ($msg === 'forbidden')    return Response::json(['error' => 'forbidden'], 403);
            if ($msg === 'not_found')    return Response::json(['error' => 'not_found'], 404);
            if ($msg === 'bad_request')  return Response::json(['error' => 'bad_request'], 400);

            return Response::json(['error' => 'bad_request', 'message' => $msg], 400);
        } catch (\Throwable $e) {
            $this->logger->error('Unhandled exception', [
                'message' => $e->getMessage(),
                'trace' => $this->debug ? $e->getTraceAsString() : 'hidden',
            ]);

            if ($this->debug) {
                return Response::json([
                    'error' => 'internal_error',
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ], 500);
            }

            return Response::json(['error' => 'internal_error'], 500);
        }
    }
}
