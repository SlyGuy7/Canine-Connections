<?php declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Bootstrap\App;

$app = App::create();
$app->run();
