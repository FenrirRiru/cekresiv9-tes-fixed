<?php
declare(strict_types=1);

// api_auth.php
use App\Database;

Database::init();

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
header('Content-Type: application/json; charset=utf-8');

// harus menghasilkan Database::Database::$conn (PDO) + mode error exception

const PHP_INPUT_STREAM = 'php://input';

function jsonOut($arr)
{
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}
function ok($extra = [])
{
    jsonOut(['status' => 200] + $extra);
}
function err($code, $msg)
{
    jsonOut(['status' => $code, 'message' => $msg]);
}

$action = $_GET['action'] ?? '';

/* Helpers */
function getUserSafe($row)
{
    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'role' => $row['role'],
        'created_at' => $row['created_at'] ?? null
    ];
}

/* ============ SIGNUP ============ */
if ($action === 'signup') {
    $in = json_decode(file_get_contents(PHP_INPUT_STREAM), true) ?? $_POST;
    $name = trim($in['name'] ?? '');
    $email = strtolower(trim($in['email'] ?? ''));
    $password = (string) ($in['password'] ?? '');

    if ($name === '' || $email === '' || $password === '') {
        err(400, 'Nama, email, dan password wajib.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        err(400, 'Format email tidak valid.');
    }
    if (strlen($password) < 6) {
        err(400, 'Password minimal 6 karakter.');
    }

    // cek duplikat
    $st = Database::$conn->prepare("SELECT id FROM users WHERE email=? LIMIT 1");
    $st->execute([$email]);
    if ($st->fetch()) {
        err(409, 'Email sudah terdaftar.');
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $ins = Database::$conn->prepare("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'user')");
    $ins->execute([$name, $email, $hash]);

    ok(['message' => 'Pendaftaran berhasil.']);
}

/* ============ LOGIN ============ */
if ($action === 'login') {
    $in = json_decode(file_get_contents(PHP_INPUT_STREAM), true) ?? $_POST;
    $email = strtolower(trim($in['email'] ?? ''));
    $password = (string) ($in['password'] ?? '');

    if ($email === '' || $password === '') {
        err(400, 'Email dan password wajib.');
    }
    $st = Database::$conn->prepare("SELECT * FROM users WHERE email=? LIMIT 1");
    $st->execute([$email]);
    $row = $st->fetch();
    if (!$row || !password_verify($password, $row['password_hash'])) {
        err(401, 'Email atau password salah.');
    }
    $_SESSION['user'] = getUserSafe($row);
    ok(['user' => $_SESSION['user']]);
}

/* ============ LOGOUT ============ */
if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    ok(['message' => 'Logged out']);
}

/* ============ ME (cek sesi) ============ */
if ($action === 'me') {
    if (!isset($_SESSION['user'])) {
        err(401, 'Not logged in');
    }
    ok(['user' => $_SESSION['user']]);
}

/* ============ UPDATE PROFILE (butuh password saat ini) ============ */
if ($action === 'update_profile') {
    if (!isset($_SESSION['user'])) {
        err(401, 'Login diperlukan');
    }
    $uid = (int) $_SESSION['user']['id'];

    $in = json_decode(file_get_contents(PHP_INPUT_STREAM), true) ?? [];
    $name = trim($in['name'] ?? '');
    $email = strtolower(trim($in['email'] ?? ''));
    $current = (string) ($in['current_password'] ?? '');
    $new = (string) ($in['new_password'] ?? '');

    if ($name === '' || $email === '' || $current === '') {
        err(400, 'Nama, email, dan password saat ini wajib.');
    }

    // ambil user
    $st = Database::$conn->prepare("SELECT * FROM users WHERE id=? LIMIT 1");
    $st->execute([$uid]);
    $user = $st->fetch();
    if (!$user) {
        err(404, 'User tidak ditemukan');
    }

    // verifikasi password lama
    if (!password_verify($current, $user['password_hash'])) {
        err(403, 'Password saat ini tidak cocok.');
    }

    // jika email diganti cek unik
    if ($email !== strtolower($user['email'])) {
        $chk = Database::$conn->prepare("SELECT id FROM users WHERE email=? AND id<>? LIMIT 1");
        $chk->execute([$email, $uid]);
        if ($chk->fetch()) {
            err(409, 'Email sudah digunakan.');
        }
    }

    // Build update
    $sql = "UPDATE users SET name=?, email=?";
    $params = [$name, $email];

    if ($new !== '') {
        if (strlen($new) < 6) {
            err(400, 'Password baru minimal 6 karakter.');
        }
        $sql .= ", password_hash=?";
        $params[] = password_hash($new, PASSWORD_DEFAULT);
    }
    $sql .= " WHERE id=?";
    $params[] = $uid;

    $up = Database::$conn->prepare($sql);
    $up->execute($params);

    // refresh sesi
    $st = Database::$conn->prepare("SELECT * FROM users WHERE id=?");
    $st->execute([$uid]);
    $_SESSION['user'] = getUserSafe($st->fetch());

    ok(['message' => 'Profil diperbarui', 'user' => $_SESSION['user']]);
}

/* ============ DELETE ACCOUNT (butuh password saat ini) ============ */
if ($action === 'delete_account') {
    if (!isset($_SESSION['user'])) {
        err(401, 'Login diperlukan');
    }
    $uid = (int) $_SESSION['user']['id'];

    $in = json_decode(file_get_contents(PHP_INPUT_STREAM), true) ?? [];
    $current = (string) ($in['current_password'] ?? '');
    if ($current === '') {
        err(400, 'Password saat ini wajib.');
    }

    // ambil user
    $st = Database::$conn->prepare("SELECT * FROM users WHERE id=? LIMIT 1");
    $st->execute([$uid]);
    $user = $st->fetch();
    if (!$user) {
        err(404, 'User tidak ditemukan');
    }

    // verifikasi
    if (!password_verify($current, $user['password_hash'])) {
        err(403, 'Password saat ini tidak cocok.');
    }

    // hapus data terkait (opsional, sesuaikan nama tabel)
    try {
        Database::$conn->beginTransaction();
        // hapus riwayat cek resi
        $del1 = Database::$conn->prepare("DELETE FROM cekresi WHERE user_id=?");
        $del1->execute([$uid]);
        // hapus pesan kontak
        if (Database::$conn->query("SHOW TABLES LIKE 'contact_messages'")->rowCount() > 0) {
            $del2 = Database::$conn->prepare("DELETE FROM contact_messages WHERE user_id=?");
            $del2->execute([$uid]);
        }
        // hapus user
        $delU = Database::$conn->prepare("DELETE FROM users WHERE id=?");
        $delU->execute([$uid]);
        Database::$conn->commit();
    } catch (Throwable $e) {
        if (Database::$conn->inTransaction()) {
            Database::$conn->rollBack();
        }
        err(500, 'Gagal menghapus akun: ' . $e->getMessage());
    }

    // logout
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();

    ok(['message' => 'Akun dihapus']);
}

/* default */
err(400, 'Invalid action');
