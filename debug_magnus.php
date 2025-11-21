<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/vendor/autoload.php';
use magnusbilling\api\magnusBilling;

// Your main logic
try {
    echo "Initializing MagnusBilling client...\n";
    $magnusBilling = new MagnusBilling('8c0f89a45a4e485ab75babad914d33d0', 'dc59cbbf25ab420ea9e6bff05479dc68');
    $magnusBilling->public_url = "https://voice.epic.dm";
    echo "Client initialized.\n";

    // Enable debug mode to log to a file
    $magnusBilling->debug = true;
    $magnusBilling->debug_log_file = '/tmp/php_debug.log';
    echo "Debug mode enabled. Log file: /tmp/php_debug.log\n";

    echo "Attempting to read users...\n";
    $result = $magnusBilling->read('user');
    echo "API call finished.\n";

    echo "Result:\n";
    print_r($result);

} catch (\Throwable $th) {
    echo "An error occurred: " . $th->getMessage() . "\n";
    echo "Stack trace:\n" . $th->getTraceAsString() . "\n";
}
?>
