<?php

session_start();
require_once __DIR__ . '/../config/turso.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'login':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido']);
                break;
            }

            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $email = strtolower(trim((string)($input['email'] ?? '')));
            $password = (string)($input['password'] ?? '');
            $user = tursoQuery('SELECT * FROM usuarios WHERE email = ? AND activo = 1', [$email])[0] ?? null;

            if (!$user || !password_verify($password, $user['password'])) {
                http_response_code(401);
                echo json_encode(['error' => 'Credenciales inválidas']);
                break;
            }

            session_regenerate_id(true);
            $_SESSION['user_id'] = (int)$user['id'];
            $_SESSION['user_nombre'] = $user['nombre'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_rol'] = $user['rol'];
            tursoExecute('UPDATE usuarios SET ultimo_acceso = datetime("now") WHERE id = ?', [$user['id']]);

            echo json_encode(['authenticated' => true, 'user' => currentUser()]);
            break;

        case 'check':
            echo json_encode([
                'authenticated' => isset($_SESSION['user_id']),
                'user' => isset($_SESSION['user_id']) ? currentUser() : null,
            ]);
            break;

        case 'logout':
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
            }
            session_destroy();
            echo json_encode(['success' => true]);
            break;

        case 'request-reset':
            requestPasswordReset();
            break;

        case 'reset-password':
            resetPassword();
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint no encontrado']);
    }
} catch (Throwable $exception) {
    error_log($exception->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}

function currentUser(): array
{
    return [
        'id' => $_SESSION['user_id'],
        'nombre' => $_SESSION['user_nombre'],
        'email' => $_SESSION['user_email'],
        'rol' => $_SESSION['user_rol'],
    ];
}

function requestPasswordReset(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $email = strtolower(trim((string)($input['email'] ?? '')));
    $message = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => true, 'message' => $message]);
        return;
    }

    $user = tursoQuery('SELECT id, nombre, email FROM usuarios WHERE email = ? AND activo = 1', [$email])[0] ?? null;
    if (!$user) {
        echo json_encode(['success' => true, 'message' => $message]);
        return;
    }

    tursoExecute('UPDATE password_reset_tokens SET used_at = datetime("now") WHERE usuario_id = ? AND used_at IS NULL', [$user['id']]);
    $token = bin2hex(random_bytes(32));
    tursoExecute('INSERT INTO password_reset_tokens (usuario_id, token_hash, expires_at) VALUES (?, ?, datetime("now", "+1 hour"))', [$user['id'], hash('sha256', $token)]);

    $appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
    $link = $appUrl . '/restablecer.html?token=' . urlencode($token);
    $subject = 'Recuperación de contraseña - Inventario Ganadero';
    $body = "Hola {$user['nombre']},\n\nRecibimos una solicitud para cambiar tu contraseña. Usa este enlace dentro de una hora:\n\n{$link}\n\nSi no solicitaste este cambio, puedes ignorar este correo.\n";
    $from = $_ENV['MAIL_FROM'] ?? 'no-reply@inventario-ganadero.local';
    $headers = "From: {$from}\r\nContent-Type: text/plain; charset=UTF-8\r\n";

    if (!mail($user['email'], $subject, $body, $headers)) {
        error_log('No se pudo enviar el correo de recuperación a ' . $user['email']);
    }

    echo json_encode(['success' => true, 'message' => $message]);
}

function resetPassword(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $token = trim((string)($input['token'] ?? ''));
    $password = (string)($input['password'] ?? '');
    if (!preg_match('/^[a-f0-9]{64}$/', $token) || strlen($password) < 8) {
        http_response_code(400);
        echo json_encode(['error' => 'El enlace o la contraseña no son válidos']);
        return;
    }

    $reset = tursoQuery(
        'SELECT usuario_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime("now")',
        [hash('sha256', $token)]
    )[0] ?? null;
    if (!$reset) {
        http_response_code(400);
        echo json_encode(['error' => 'El enlace no es válido o ya expiró']);
        return;
    }

    tursoExecute('UPDATE usuarios SET password = ?, updated_at = datetime("now") WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $reset['usuario_id']]);
    tursoExecute('UPDATE password_reset_tokens SET used_at = datetime("now") WHERE token_hash = ?', [hash('sha256', $token)]);
    echo json_encode(['success' => true]);
}