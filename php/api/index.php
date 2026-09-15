<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Load .env if available
if (file_exists(__DIR__ . '/../.env.php')) {
    $env = parse_ini_file(__DIR__ . '/../.env.php');
    foreach ($env as $k => $v) $_ENV[$k] = $v;
}

// Load .env as INI
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $val) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($val);
    }
}

require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Handle direct endpoint routing (e.g., /api/medicamentos, /api/actividades, /api/stats)
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// /api/medicamentos or /api/actividades or /api/stats
if (isset($pathParts[0]) && $pathParts[0] === 'api' && isset($pathParts[1])) {
    $action = $pathParts[1];
}

// Check auth for protected actions
if (!in_array($action, ['login', 'stats']) && $action !== '') {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (strpos($authHeader, 'Bearer ') !== 0) {
        http_response_code(401);
        echo json_encode(['error' => 'No autorizado']);
        exit();
    }
    $token = substr($authHeader, 7);
    // Simple token validation - in production use proper JWT verification
    if (empty($token)) {
        http_response_code(401);
        echo json_encode(['error' => 'Token inválido']);
        exit();
    }
}

try {
    $db = Database::getInstance();
    
    switch ($action) {
        case 'medicamentos':
            handleMedicamentos($db, $method);
            break;
        case 'actividades':
            handleActividades($db, $method);
            break;
        case 'stats':
            handleStats($db);
            break;
        case 'login':
            handleLogin($db);
            break;
        case 'check':
            handleCheck();
            break;
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint no encontrado: ' . $action]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleLogin($db) {
    global $method;
    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email y password requeridos']);
        return;
    }
    
    $stmt = $db->prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciales inválidas']);
        return;
    }
    
    // Password check - PHP bcrypt hashes start with $2y$ or $2a$
    // Turso stores them as plain text or bcrypt
    if (password_verify($password, $user['password'])) {
        // Generate simple JWT-like token
        $token = base64_encode(json_encode([
            'id' => $user['id'],
            'nombre' => $user['nombre'],
            'email' => $user['email'],
            'rol' => $user['rol']
        ]));
        
        echo json_encode([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'nombre' => $user['nombre'],
                'email' => $user['email'],
                'rol' => $user['rol']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciales inválidas']);
    }
}

function handleMedicamentos($db, $method) {
    global $method, $_GET;
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;
            if ($id) {
                $stmt = $db->prepare('SELECT * FROM medicamentos WHERE id = ?');
                $stmt->execute([$id]);
                $medicamento = $stmt->fetch();
                if ($medicamento) {
                    echo json_encode($medicamento);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Medicamento no encontrado']);
                }
            } else {
                $search = $_GET['search'] ?? '';
                $tipo = $_GET['tipo'] ?? '';
                $page = max(1, intval($_GET['page'] ?? 1));
                $limit = min(100, max(1, intval($_GET['limit'] ?? 50)));
                $offset = ($page - 1) * $limit;

                $where = 'WHERE 1=1';
                $params = [];
                
                if ($search) {
                    $where .= ' AND (nombre LIKE ? OR lote LIKE ? OR laboratorio LIKE ?)';
                    $searchTerm = "%$search%";
                    $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
                }
                
                if ($tipo) {
                    $where .= ' AND tipo = ?';
                    $params[] = $tipo;
                }

                $stmt = $db->prepare("SELECT * FROM medicamentos $where ORDER BY fecha_caducidad ASC LIMIT ? OFFSET ?");
                $params[] = $limit;
                $params[] = $offset;
                $stmt->execute($params);
                $medicamentos = $stmt->fetchAll();
                
                // Get total count
                $whereCount = rtrim($where, ' ');
                $whereCount = preg_replace('/ORDER BY.*$/', '', $whereCount);
                $countStmt = $db->prepare("SELECT COUNT(*) FROM medicamentos $where");
                $countParams = array_slice($params, 0, -2);
                $countStmt->execute($countParams);
                $total = $countStmt->fetchColumn();

                echo json_encode([
                    'data' => $medicamentos,
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'total' => $total,
                        'pages' => ceil($total / $limit)
                    ]
                ]);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            // Normalize field names: accept both camelCase and snake_case
            $input['fecha_caducidad'] = $input['fecha_caducidad'] ?? $input['fechaCaducidad'] ?? null;
            $input['fecha_ingreso'] = $input['fecha_ingreso'] ?? $input['fechaIngreso'] ?? null;
            $input['requiere_receta'] = $input['requiere_receta'] ?? $input['requiereReceta'] ?? 0;
            $input['es_controlado'] = $input['es_controlado'] ?? $input['esControlado'] ?? 0;
            
            $required = ['nombre', 'tipo', 'cantidad', 'fecha_caducidad'];
            
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Campo requerido: $field"]);
                    return;
                }
            }

            $stmt = $db->prepare('
                INSERT INTO medicamentos (nombre, tipo, presentacion, concentracion, cantidad, unidad, fecha_caducidad, fecha_ingreso, observaciones, requiere_receta, es_controlado, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))
            ');
            
            $stmt->execute([
                $input['nombre'],
                $input['tipo'],
                $input['presentacion'] ?? '',
                $input['concentracion'] ?? '',
                $input['cantidad'],
                $input['unidad'] ?? 'frascos',
                $input['fecha_caducidad'],
                $input['fecha_ingreso'] ?? date('Y-m-d'),
                $input['observaciones'] ?? '',
                $input['requiere_receta'] ?? 0,
                $input['es_controlado'] ?? 0
            ]);

            $id = $db->lastInsertId();
            if (!$id) {
                // If lastInsertId doesn't work, try a different approach
                $stmt = $db->prepare('SELECT last_insert_rowid() as id');
                $stmt->execute();
                $row = $stmt->fetch();
                $id = $row['id'] ?? 1;
            }
            $stmt = $db->prepare('SELECT * FROM medicamentos WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode($stmt->fetch());
            break;

        case 'PUT':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                return;
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            $fields = [];
            $params = [];
            $allowed = ['nombre', 'tipo', 'presentacion', 'concentracion', 'cantidad', 'unidad', 'fecha_caducidad', 'observaciones', 'requiere_receta', 'es_controlado'];
            
            foreach ($allowed as $field) {
                if (array_key_exists($field, $input)) {
                    $fields[] = "$field = ?";
                    $params[] = $input[$field];
                }
            }
            
            if (empty($fields)) {
                http_response_code(400);
                echo json_encode(['error' => 'No hay campos para actualizar']);
                return;
            }
            
            $fields[] = "updated_at = datetime('now')";
            $params[] = $id;
            
            $stmt = $db->prepare("UPDATE medicamentos SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($params);
            
            $stmt = $db->prepare('SELECT * FROM medicamentos WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode($stmt->fetch());
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requerido']);
                return;
            }
            
            $stmt = $db->prepare('DELETE FROM medicamentos WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;
    }
}

function handleActividades($db, $method) {
    global $method, $_GET;
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;
            if ($id) {
                $stmt = $db->prepare('SELECT * FROM actividades WHERE id = ?');
                $stmt->execute([$id]);
                echo json_encode($stmt->fetch());
            } else {
                $page = max(1, intval($_GET['page'] ?? 1));
                $limit = min(100, max(1, intval($_GET['limit'] ?? 50)));
                $offset = ($page - 1) * $limit;
                
                $stmt = $db->prepare('SELECT * FROM actividades ORDER BY fecha DESC LIMIT ? OFFSET ?');
                $stmt->execute([$limit, $offset]);
                $actividades = $stmt->fetchAll();
                
                $countStmt = $db->query('SELECT COUNT(*) FROM actividades');
                $total = $countStmt->fetchColumn();

                echo json_encode([
                    'data' => $actividades,
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'total' => $total,
                        'pages' => ceil($total / $limit)
                    ]
                ]);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $required = ['tipo', 'descripcion', 'fecha'];
            
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Campo requerido: $field"]);
                    return;
                }
            }

            $stmt = $db->prepare('
                INSERT INTO actividades (tipo, medicamento_id, medicamento, cantidad, descripcion, fecha, usuario, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))
            ');
            
            $stmt->execute([
                $input['tipo'],
                $input['medicamento_id'] ?? null,
                $input['medicamento'] ?? '',
                $input['cantidad'] ?? null,
                $input['descripcion'],
                $input['fecha'],
                $input['usuario'] ?? 'Sistema'
            ]);

            $id = $db->lastInsertId();
            if (!$id) {
                $stmt = $db->prepare('SELECT last_insert_rowid() as id');
                $stmt->execute();
                $row = $stmt->fetch();
                $id = $row['id'] ?? 1;
            }
            $stmt = $db->prepare('SELECT * FROM actividades WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode($stmt->fetch());
            break;
    }
}

        case 'operacion':
            handleOperacion($db);
            return;
    }
}

function handleOperacion($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    $medicamentoId = intval($input['medicamento_id'] ?? 0);
    $tipo = $input['tipo'] ?? '';
    $cantidad = isset($input['cantidad']) ? intval($input['cantidad']) : null;

    if ($medicamentoId < 1 || !in_array($tipo, ['baja', 'salida', 'ajuste'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Operación o medicamento inválido']);
        return;
    }

    $activityType = $tipo === 'baja' ? 'baja' : ($tipo === 'salida' ? 'salida' : 'ajuste');
    $activityPrefix = $tipo === 'baja' ? 'Baja de inventario: ' : ($tipo === 'salida' ? 'Salida de inventario: ' : 'Ajuste de inventario: ');

    if ($tipo === 'baja') {
        $stmt = $db->prepare('SELECT * FROM medicamentos WHERE id = ? AND cantidad > 0');
        $stmt->execute([$medicamentoId]);
    } else {
        $stmt = $db->prepare('SELECT * FROM medicamentos WHERE id = ?');
        $stmt->execute([$medicamentoId]);
    }
    
    $medicamento = $stmt->fetch();
    if (!$medicamento) {
        http_response_code(404);
        echo json_encode(['error' => $tipo === 'salida' ? 'La cantidad de salida supera el stock disponible' : 'El producto no tiene stock disponible']);
        return;
    }

    if ($tipo === 'salida') {
        if (!$cantidad || $cantidad < 1) {
            http_response_code(400);
            echo json_encode(['error' => 'La cantidad de salida debe ser mayor que cero']);
            return;
        }
        if ($cantidad > $medicamento['cantidad']) {
            http_response_code(400);
            echo json_encode(['error' => 'La cantidad de salida supera el stock disponible']);
            return;
        }
        $nuevaCantidad = $medicamento['cantidad'] - $cantidad;
        $stmt = $db->prepare('UPDATE medicamentos SET cantidad = ?, updated_at = datetime(\'now\') WHERE id = ?');
        $stmt->execute([$nuevaCantidad, $medicamentoId]);
        $activityQuantity = $cantidad;
    } elseif ($tipo === 'ajuste') {
        if ($cantidad === null || $cantidad < 0) {
            http_response_code(400);
            echo json_encode(['error' => 'La cantidad ajustada no puede ser negativa']);
            return;
        }
        $stmt = $db->prepare('UPDATE medicamentos SET cantidad = ?, updated_at = datetime(\'now\') WHERE id = ?');
        $stmt->execute([$cantidad, $medicamentoId]);
        $activityQuantity = $cantidad;
    } else { // baja
        $stmt = $db->prepare('UPDATE medicamentos SET cantidad = 0, updated_at = datetime(\'now\') WHERE id = ?');
        $stmt->execute([$medicamentoId]);
        $activityQuantity = 0;
    }

    // Register activity
    $stmt = $db->prepare('INSERT INTO actividades (tipo, medicamento_id, medicamento, cantidad, descripcion, fecha, usuario, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))');
    $stmt->execute([
        $activityType,
        $medicamentoId,
        $medicamento['nombre'],
        $activityQuantity,
        $activityPrefix . $medicamento['nombre'],
        date('Y-m-d H:i:s'),
        'Sistema'
    ]);

    // Get updated medicamento
    $stmt = $db->prepare('SELECT * FROM medicamentos WHERE id = ?');
    $stmt->execute([$medicamentoId]);
    $updated = $stmt->fetch();

    // Get activity
    $stmt = $db->prepare('SELECT * FROM actividades WHERE medicamento_id = ? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$medicamentoId]);
    $actividad = $stmt->fetch();

    echo json_encode([
        'medicamento' => $updated,
        'actividad' => $actividad
    ]);
}

function handleStats($db) {
    $stmt = $db->query('SELECT COUNT(*) as total FROM medicamentos');
    $totalMedicamentos = $stmt->fetchColumn();
    
    $stmt = $db->query("SELECT COUNT(*) as total FROM medicamentos WHERE tipo = 'vacuna'");
    $totalVacunas = $stmt->fetchColumn();
    
    $stmt = $db->query("SELECT COUNT(*) as total FROM medicamentos WHERE date(fecha_caducidad) < date('now')");
    $caducados = $stmt->fetchColumn();
    
    $stmt = $db->query("SELECT COUNT(*) as total FROM medicamentos WHERE date(fecha_caducidad) BETWEEN date('now') AND date('now', '+30 days')");
    $criticos = $stmt->fetchColumn();
    
    $stmt = $db->query("SELECT COUNT(*) as total FROM medicamentos WHERE date(fecha_caducidad) BETWEEN date('now', '+31 days') AND date('now', '+90 days')");
    $advertencia = $stmt->fetchColumn();

    echo json_encode([
        'totalMedicamentos' => (int)$totalMedicamentos,
        'totalVacunas' => (int)$totalVacunas,
        'caducados' => (int)$caducados,
        'criticos' => (int)$criticos,
        'advertencia' => (int)$advertencia,
        'proximosCaducar' => (int)($criticos + $advertencia)
    ]);
}

function handleCheck() {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (strpos($authHeader, 'Bearer ') !== 0) {
        echo json_encode(['authenticated' => false]);
        return;
    }
    
    $token = substr($authHeader, 7);
    if (empty($token)) {
        echo json_encode(['authenticated' => false]);
        return;
    }
    
    // Simple base64 decode token check
    $decoded = base64_decode($token);
    if (!$decoded) {
        echo json_encode(['authenticated' => false]);
        return;
    }
    
    $payload = json_decode($decoded, true);
    if (!$payload || !isset($payload['id'])) {
        echo json_encode(['authenticated' => false]);
        return;
    }
    
    echo json_encode([
        'authenticated' => true,
        'user' => [
            'id' => $payload['id'],
            'nombre' => $payload['nombre'] ?? '',
            'email' => $payload['email'] ?? '',
            'rol' => $payload['rol'] ?? ''
        ]
    ]);
}