<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

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
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint no encontrado']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleMedicamentos($db, $method) {
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;
            if ($id) {
                $stmt = $db->prepare('SELECT * FROM medicamentos WHERE id = ?');
                $stmt->execute([$id]);
                $medicamento = $stmt->fetch(PDO::FETCH_ASSOC);
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
                    $where .= ' AND (nombre LIKE ? OR presentacion LIKE ? OR concentracion LIKE ?)';
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
                $medicamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $countStmt = $db->prepare("SELECT COUNT(*) FROM medicamentos $where");
                $countStmt->execute(array_slice($params, 0, -2));
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
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
                $input['requiere_receta'] ?? false,
                $input['es_controlado'] ?? false
            ]);

            $id = $db->lastInsertId();
            $stmt = $db->prepare('SELECT * FROM medicamentos WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
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
            
            $fields[] = 'updated_at = NOW()';
            $params[] = $id;
            
            $stmt = $db->prepare("UPDATE medicamentos SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($params);
            
            $stmt = $db->prepare('SELECT * FROM medicamentos WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
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
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;
            if ($id) {
                $stmt = $db->prepare('SELECT * FROM actividades WHERE id = ?');
                $stmt->execute([$id]);
                echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
            } else {
                $page = max(1, intval($_GET['page'] ?? 1));
                $limit = min(100, max(1, intval($_GET['limit'] ?? 50)));
                $offset = ($page - 1) * $limit;
                
                $stmt = $db->prepare('SELECT * FROM actividades ORDER BY fecha DESC LIMIT ? OFFSET ?');
                $stmt->execute([$limit, $offset]);
                $actividades = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
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
                INSERT INTO actividades (tipo, medicamento_id, medicamento, lote, cantidad, descripcion, fecha, usuario, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ');
            
            $stmt->execute([
                $input['tipo'],
                $input['medicamento_id'] ?? null,
                $input['medicamento'] ?? '',
                $input['lote'] ?? '',
                $input['cantidad'] ?? null,
                $input['descripcion'],
                $input['fecha'],
                $input['usuario'] ?? 'Sistema'
            ]);

            $id = $db->lastInsertId();
            $stmt = $db->prepare('SELECT * FROM actividades WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
            break;
    }
}

function handleStats($db) {
    $stmt = $db->query('SELECT COUNT(*) as total FROM medicamentos');
    $totalMedicamentos = $stmt->fetchColumn();
    
    $stmt = $db->query("SELECT COUNT(*) as total FROM medicamentos WHERE tipo = 'vacuna'");
    $totalVacunas = $stmt->fetchColumn();
    
    $stmt = $db->query("SELECT COUNT(*) as total FROM medicamentos WHERE fecha_caducidad < CURDATE()");
    $caducados = $stmt->fetchColumn();
    
    $stmt = $db->query("SELECT COUNT(*) as total FROM medicamentos WHERE fecha_caducidad BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)");
    $criticos = $stmt->fetchColumn();
    
    $stmt = $db->query("SELECT COUNT(*) as total FROM medicamentos WHERE fecha_caducidad BETWEEN DATE_ADD(CURDATE(), INTERVAL 31 DAY) AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)");
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