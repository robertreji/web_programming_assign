<?php

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('X-Content-Type-Options: nosniff');

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Handle preflight OPTIONS request
if ($requestMethod === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($requestMethod !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'code' => 405,
        'message' => 'Method Not Allowed. Only GET requests are supported by this data service.'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$dataPath = __DIR__ . '/data.json';

if (!file_exists($dataPath)) {
    http_response_code(404);
    echo json_encode([
        'status' => 'error',
        'code' => 404,
        'message' => 'Dataset file (data.json) was not found on the server.'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$rawContent = file_get_contents($dataPath);
if ($rawContent === false) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'code' => 500,
        'message' => 'Unable to read the data file from the filesystem.'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$decodedData = json_decode($rawContent, true);
if ($decodedData === null && json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'code' => 500,
        'message' => 'Failed to parse JSON dataset: ' . json_last_error_msg()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$responseGraph = $decodedData['graph'] ?? [];

if (isset($_GET['id']) && trim($_GET['id']) !== '') {
    $targetId = trim($_GET['id']);
    $filtered = array_values(array_filter($responseGraph, function ($item) use ($targetId) {
        return isset($item['id']) && strtolower($item['id']) === strtolower($targetId);
    }));

    if (empty($filtered)) {
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'code' => 404,
            'message' => "Movie with id '{$targetId}' not found."
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }

    $decodedData['graph'] = $filtered;
}

if (isset($_GET['category']) && trim($_GET['category']) !== '') {
    $cat = trim($_GET['category']);
    if (strtolower($cat) !== 'all') {
        $decodedData['graph'] = array_values(array_filter($decodedData['graph'], function ($item) use ($cat) {
            return isset($item['category']) && strtolower($item['category']) === strtolower($cat);
        }));
    }
}

http_response_code(200);
echo json_encode($decodedData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
