<?php

function loadEnvironment(string $path): void
{
    if (!is_readable($path)) {
        return;
    }

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if ($value !== '' && (($value[0] ?? '') === '"' || ($value[0] ?? '') === "'")) {
            $value = trim($value, "\"'");
        }

        $_ENV[$key] = $value;
    }
}

loadEnvironment(dirname(__DIR__, 2) . '/.env');

function tursoEndpoint(): string
{
    $url = $_ENV['TURSO_DATABASE_URL'] ?? '';
    if (str_starts_with($url, 'libsql://')) {
        return 'https://' . substr($url, 9) . '/v2/pipeline';
    }

    if (str_starts_with($url, 'https://')) {
        return rtrim($url, '/') . '/v2/pipeline';
    }

    throw new RuntimeException('TURSO_DATABASE_URL no está configurada correctamente');
}

function tursoRequest(array $requests): array
{
    $token = $_ENV['TURSO_AUTH_TOKEN'] ?? '';
    if ($token === '') {
        throw new RuntimeException('TURSO_AUTH_TOKEN no está configurado');
    }

    foreach ($requests as &$request) {
        $args = $request['stmt']['args'] ?? [];
        $request['stmt']['args'] = array_map('tursoArgument', $args);
    }
    unset($request);

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nAuthorization: Bearer {$token}\r\n",
            'content' => json_encode(['requests' => $requests], JSON_THROW_ON_ERROR),
            'timeout' => 15,
            'ignore_errors' => true,
        ],
    ]);

    $response = file_get_contents(tursoEndpoint(), false, $context);
    $statusLine = $http_response_header[0] ?? '';
    preg_match('/\s(\d{3})\s/', $statusLine, $matches);
    $status = (int)($matches[1] ?? 0);

    if ($response === false || $status < 200 || $status >= 300) {
        throw new RuntimeException('Turso no pudo procesar la solicitud');
    }

    $data = json_decode($response, true, 512, JSON_THROW_ON_ERROR);
    if (isset($data['error'])) {
        throw new RuntimeException('Turso rechazó la solicitud');
    }

    return $data;
}

function tursoArgument(mixed $value): array
{
    if ($value === null) {
        return ['type' => 'null'];
    }
    if (is_bool($value)) {
        return ['type' => 'integer', 'value' => $value ? '1' : '0'];
    }
    if (is_int($value)) {
        return ['type' => 'integer', 'value' => (string)$value];
    }
    if (is_float($value)) {
        return ['type' => 'float', 'value' => (string)$value];
    }
    return ['type' => 'text', 'value' => (string)$value];
}

function tursoQuery(string $sql, array $args = []): array
{
    $data = tursoRequest([[
        'type' => 'execute',
        'stmt' => ['sql' => $sql, 'args' => $args],
    ]]);

    $result = $data['results'][0]['response']['result'] ?? [];
    $columns = $result['cols'] ?? [];
    $rows = $result['rows'] ?? [];

    return array_map(static function (array $row) use ($columns): array {
        $record = [];
        foreach ($columns as $index => $column) {
            $name = is_array($column) ? ($column['name'] ?? '') : $column;
            $value = $row[$index] ?? null;
            $record[$name] = is_array($value) ? ($value['value'] ?? null) : $value;
        }
        return $record;
    }, $rows);
}

function tursoExecute(string $sql, array $args = []): array
{
    $data = tursoRequest([[
        'type' => 'execute',
        'stmt' => ['sql' => $sql, 'args' => $args],
    ]]);

    return $data['results'][0]['response']['result'] ?? [];
}