<?php

declare(strict_types=1);

$fixtureRoot = dirname(__DIR__);
$config = require $fixtureRoot . '/config/test-sections.php';

if (!is_array($config) || empty($config['sections'])) {
    fwrite(STDERR, "No test sections configured.\n");
    return false;
}

echo 'Loaded ' . count($config['sections']) . " section(s).\n";

return true;
