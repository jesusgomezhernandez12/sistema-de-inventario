<?php

require_once __DIR__ . '/../config/turso.php';

session_set_cookie_params([
    'secure' => filter_var($_ENV['SESSION_SECURE'] ?? false, FILTER_VALIDATE_BOOLEAN),
    'httponly' => true,
    'samesite' => $_ENV['SESSION_SAMESITE'] ?? 'Lax',
]);
session_start();

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autenticado']);
    exit;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$input = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?? []);

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

        $imagenUrl = uploadMedicineImage();

        $result = tursoExecute(
            'INSERT INTO medicamentos (nombre, tipo, presentacion, concentracion, cantidad, unidad, fecha_caducidad, fecha_ingreso, observaciones, imagen_url, requiere_receta, es_controlado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$input['nombre'], $input['tipo'], $input['presentacion'] ?? '', $input['concentracion'] ?? '', (int)$input['cantidad'], $input['unidad'] ?? 'frascos', $input['fecha_caducidad'], $input['fecha_ingreso'] ?? date('Y-m-d'), $input['observaciones'] ?? '', $imagenUrl, (int)($input['requiere_receta'] ?? 0), (int)($input['es_controlado'] ?? 0)]
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

function uploadMedicineImage(): string
{
    if (!isset($_FILES['imagen']) || $_FILES['imagen']['error'] === UPLOAD_ERR_NO_FILE) {
        return '';
    }
    if ($_FILES['imagen']['error'] !== UPLOAD_ERR_OK || $_FILES['imagen']['size'] > 5 * 1024 * 1024) {
        throw new RuntimeException('La imagen no puede superar 5 MB');
    }

    $temporaryPath = $_FILES['imagen']['tmp_name'];
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($temporaryPath);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime])) {
        throw new RuntimeException('Solo se permiten imágenes JPG, PNG o WebP');
    }

    $directory = dirname(__DIR__, 2) . '/assets/uploads';
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        throw new RuntimeException('No se pudo preparar el almacenamiento de imágenes');
    }
    $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
    if (!move_uploaded_file($temporaryPath, $directory . '/' . $filename)) {
        throw new RuntimeException('No se pudo guardar la imagen');
    }

    return 'assets/uploads/' . $filename;
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

    if ($medicamentoId < 1 || !in_array($tipo, ['baja', 'salida', 'ajuste'], true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Operación o medicamento inválido']);
        return;
    }

    if ($tipo === 'baja') {
        $updateSql = 'UPDATE medicamentos SET cantidad = 0, updated_at = datetime(\'now\') WHERE id = ? AND cantidad > 0';
            $activityType = 'baja';
            $activityQuantity = 0;
            $activityPrefix = 'Baja de inventario: ';
    } elseif ($tipo === 'salida') {
        if ($cantidad === null || $cantidad < 1) {
            http_response_code(400);
            echo json_encode(['error' => 'La cantidad de salida debe ser mayor que cero']);
            return;
        }
        $updateSql = 'UPDATE medicamentos SET cantidad = cantidad - ?, updated_at = datetime(\'now\') WHERE id = ? AND cantidad >= ?';
        $activityType = 'salida';
        $activityQuantity = $cantidad;
        $activityPrefix = 'Salida de inventario: ';
    } else {
        if ($cantidad === null || $cantidad < 0) {
            http_response_code(400);
            echo json_encode(['error' => 'La cantidad ajustada no puede ser negativa']);
            return;
        }
        $updateSql = 'UPDATE medicamentos SET cantidad = ?, updated_at = datetime(\'now\') WHERE id = ?';
        $activityType = 'ajuste';
        $activityQuantity = $cantidad;
        $activityPrefix = 'Ajuste de inventario: ';
    }

    $updateArgs = $tipo === 'salida'
        ? [$cantidad, $medicamentoId, $cantidad]
        : ($tipo === 'ajuste' ? [$cantidad, $medicamentoId] : [$medicamentoId]);
    $activitySql = "INSERT INTO actividades (tipo, medicamento_id, medicamento, cantidad, descripcion, fecha, usuario)
        SELECT ?, id, nombre, ?, ? || nombre, datetime('now'), ?
        FROM medicamentos WHERE id = ? AND changes() > 0";
    $activityParams = [$activityType, $activityQuantity, $activityPrefix, $_SESSION['user_nombre'], $medicamentoId];

    $results = tursoExecuteBatch([
        [$updateSql, $updateArgs],
        [$activitySql, $activityParams],
        ['SELECT * FROM medicamentos WHERE id = ?', [$medicamentoId]],
        ['SELECT * FROM actividades WHERE medicamento_id = ? ORDER BY id DESC LIMIT 1', [$medicamentoId]],
    ]);

    if ((int)($results[0]['affected_row_count'] ?? 0) !== 1) {
        http_response_code(400);
        echo json_encode(['error' => $tipo === 'salida' ? 'La cantidad de salida supera el stock disponible' : 'El producto no tiene stock disponible']);
        return;
    }

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
    return "SELECT COUNT(*) AS total_medicamentos, SUM(CASE WHEN tipo = 'vacuna' THEN 1 ELSE 0 END) AS total_vacunas, SUM(CASE WHEN date(fecha_caducidad) < date('now') AND cantidad > 0 THEN 1 ELSE 0 END) AS caducados, SUM(CASE WHEN date(fecha_caducidad) BETWEEN date('now') AND date('now', '+30 days') AND cantidad > 0 THEN 1 ELSE 0 END) AS criticos, SUM(CASE WHEN date(fecha_caducidad) BETWEEN date('now', '+31 days') AND date('now', '+90 days') AND cantidad > 0 THEN 1 ELSE 0 END) AS advertencia FROM medicamentos";
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