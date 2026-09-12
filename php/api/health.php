<?php

require_once __DIR__ . '/../config/turso.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $rows = tursoQuery('SELECT 1 AS ok');
    echo json_encode(['ok' => ($rows[0]['ok'] ?? null) == 1]);
} catch (Throwable $exception) {
    http_response_code(503);
    echo json_encode(['ok' => false, 'error' => 'No se pudo conectar con la base de datos']);
}