<?php

session_start();
require_once __DIR__ . '/../config/turso.php';

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autenticado']);
    exit;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];

try {
    if ($action === 'bootstrap' && $method === 'GET') {
        echo json_encode(bootstrapData());
        exit;
    }

    if ($action === 'stats' && $method === 'GET') {
        echo json_encode(stats());
        exit;
    }

    if ($action === 'medicamentos') {
        handleMedicamentos($method, $input);
        exit;
    }

    if ($action === 'actividades') {
        handleActividades($method, $input);
        exit;
    }

    if ($action === 'operacion' && $method === 'POST') {
        handleOperacion($input);
        exit;
    }

    http_response_code(404);
    echo json_encode(['error' => 'Endpoint no encontrado']);
} catch (Throwable $exception) {
    error_log($exception->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}

function requireWriteAccess(): void
{
    if (!in_array($_SESSION['user_rol'], ['admin', 'veterinario', 'tecnico'], true)) {
        http_response_code(403);
        echo json_encode(['error' => 'No tienes permisos para realizar esta operación']);
        exit;
    }
}

function handleMedicamentos(string $method, array $input): void
{
    if ($method === 'GET') {
        $rows = tursoQuery('SELECT * FROM medicamentos ORDER BY fecha_caducidad ASC');
        echo json_encode(['data' => $rows]);
        return;
    }

    requireWriteAccess();
    if ($method === 'POST') {
        $required = ['nombre', 'tipo', 'cantidad', 'fecha_caducidad'];
        foreach ($required as $field) {
            if (!isset($input[$field]) || $input[$field] === '') {
                http_response_code(400);
                echo json_encode(['error' => "Campo requerido: {$field}"]);
                return;
            }
        }

        $result = tursoExecute(
            'INSERT INTO medicamentos (nombre, tipo, presentacion, concentracion, cantidad, unidad, fecha_caducidad, fecha_ingreso, observaciones, requiere_receta, es_controlado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$input['nombre'], $input['tipo'], $input['presentacion'] ?? '', $input['concentracion'] ?? '', (int)$input['cantidad'], $input['unidad'] ?? 'frascos', $input['fecha_caducidad'], $input['fecha_ingreso'] ?? date('Y-m-d'), $input['observaciones'] ?? '', (int)($input['requiere_receta'] ?? 0), (int)($input['es_controlado'] ?? 0)]
        );
        $id = $result['last_insert_rowid'] ?? null;
        if ($id !== null) {
            tursoExecute(
                "INSERT INTO actividades (tipo, medicamento_id, medicamento, cantidad, descripcion, fecha, usuario) VALUES ('entrada', ?, ?, ?, ?, datetime('now'), ?)",
                [$id, $input['nombre'], (int)$input['cantidad'], "Alta de inventario: {$input['nombre']}", $_SESSION['user_nombre']]
            );
        }
        $row = $id === null ? null : (tursoQuery('SELECT * FROM medicamentos WHERE id = ?', [$id])[0] ?? null);
        echo json_encode($row);
        return;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}

function handleActividades(string $method, array $input): void
{
    if ($method === 'GET') {
        echo json_encode(['data' => tursoQuery('SELECT * FROM actividades ORDER BY fecha DESC LIMIT 50')]);
        return;
    }

    requireWriteAccess();
    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }

    foreach (['tipo', 'descripcion', 'fecha'] as $field) {
        if (!isset($input[$field]) || $input[$field] === '') {
            http_response_code(400);
            echo json_encode(['error' => "Campo requerido: {$field}"]);
            return;
        }
    }

    $result = tursoExecute(
        'INSERT INTO actividades (tipo, medicamento_id, medicamento, lote, cantidad, descripcion, fecha, usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [$input['tipo'], $input['medicamento_id'] ?? null, $input['medicamento'] ?? '', $input['lote'] ?? '', $input['cantidad'] ?? null, $input['descripcion'], $input['fecha'], $_SESSION['user_nombre']]
    );
    $id = $result['last_insert_rowid'] ?? null;
    echo json_encode($id === null ? null : (tursoQuery('SELECT * FROM actividades WHERE id = ?', [$id])[0] ?? null));
}

function handleOperacion(array $input): void
{
    requireWriteAccess();
    $medicamentoId = (int)($input['medicamento_id'] ?? 0);
    $tipo = $input['tipo'] ?? '';
    $cantidad = isset($input['cantidad']) ? (int)$input['cantidad'] : null;
    $medicamento = tursoQuery('SELECT * FROM medicamentos WHERE id = ?', [$medicamentoId])[0] ?? null;

    if (!$medicamento || !in_array($tipo, ['baja', 'salida', 'ajuste'], true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Operación o medicamento inválido']);
        return;
    }

    $stockActual = (int)$medicamento['cantidad'];
    if ($tipo === 'baja') {
        $nuevoStock = 0;
        $descripcion = "Baja de inventario: {$medicamento['nombre']}";
    } elseif ($tipo === 'salida') {
        if ($cantidad === null || $cantidad < 1 || $cantidad > $stockActual) {
            http_response_code(400);
            echo json_encode(['error' => 'La cantidad de salida debe estar entre 1 y el stock disponible']);
            return;
        }
        $nuevoStock = $stockActual - $cantidad;
        $descripcion = "Salida de inventario: {$medicamento['nombre']}";
    } else {
        if ($cantidad === null || $cantidad < 0) {
            http_response_code(400);
            echo json_encode(['error' => 'La cantidad ajustada no puede ser negativa']);
            return;
        }
        $nuevoStock = $cantidad;
        $descripcion = "Ajuste de inventario: {$medicamento['nombre']}";
    }

    $results = tursoExecuteBatch([
        ["UPDATE medicamentos SET cantidad = ?, updated_at = datetime('now') WHERE id = ?", [$nuevoStock, $medicamentoId]],
        ["INSERT INTO actividades (tipo, medicamento_id, medicamento, cantidad, descripcion, fecha, usuario) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)", [$tipo, $medicamentoId, $medicamento['nombre'], $cantidad ?? $stockActual, $descripcion, $_SESSION['user_nombre']]],
        ['SELECT * FROM medicamentos WHERE id = ?', [$medicamentoId]],
        ['SELECT * FROM actividades WHERE id = last_insert_rowid()'],
    ]);

    $activityId = $results[1]['last_insert_rowid'] ?? null;
    echo json_encode([
        'medicamento' => tursoRowsFromResult($results[2])[0] ?? null,
        'actividad' => tursoRowsFromResult($results[3])[0] ?? null,
    ]);
}

function stats(): array
{
    return statsFromRow(tursoQuery(statsSql())[0] ?? []);
}

function bootstrapData(): array
{
    [$medicamentos, $stats] = tursoQueryBatch([
        ['SELECT * FROM medicamentos ORDER BY fecha_caducidad ASC'],
        [statsSql()],
    ]);

    return [
        'medicamentos' => $medicamentos,
        'stats' => statsFromRow($stats[0] ?? []),
    ];
}

function statsSql(): string
{
    return "SELECT COUNT(*) AS total_medicamentos, SUM(CASE WHEN tipo = 'vacuna' THEN 1 ELSE 0 END) AS total_vacunas, SUM(CASE WHEN date(fecha_caducidad) < date('now') THEN 1 ELSE 0 END) AS caducados, SUM(CASE WHEN date(fecha_caducidad) BETWEEN date('now') AND date('now', '+30 days') THEN 1 ELSE 0 END) AS criticos, SUM(CASE WHEN date(fecha_caducidad) BETWEEN date('now', '+31 days') AND date('now', '+90 days') THEN 1 ELSE 0 END) AS advertencia FROM medicamentos";
}

function statsFromRow(array $row): array
{
    $result = [
        'totalMedicamentos' => (int)($row['total_medicamentos'] ?? 0),
        'totalVacunas' => (int)($row['total_vacunas'] ?? 0),
        'caducados' => (int)($row['caducados'] ?? 0),
        'criticos' => (int)($row['criticos'] ?? 0),
        'advertencia' => (int)($row['advertencia'] ?? 0),
    ];
    $result['proximosCaducar'] = $result['criticos'] + $result['advertencia'];
    return $result;
}