<?php
require_once 'db.php';
session_start();
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

function me()
{
  if (!isset($_SESSION['user']))
    return null;
  return $_SESSION['user']; // berisi: id, name, email, role
}

/* helper */
function json_out($arr)
{
  echo json_encode($arr);
  exit;
}

try {
  if ($action === 'me') {
    $u = me();
    if (!$u)
      json_out(["status" => 401, "message" => "Unauthorized"]);
    json_out(["status" => 200, "user" => $u]);
  }

  /*  =================
      USER: kirim pesan 
      ================= */
  if ($action === 'send') {
    $u = me();
    if (!$u)
      json_out(["status" => 401, "message" => "Unauthorized"]);
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $subject = trim($input['subject'] ?? '');
    $message = trim($input['message'] ?? '');
    if ($subject === '' || $message === '') {
      json_out(["status" => 422, "message" => "Subjek dan pesan wajib diisi."]);
    }
    $stmt = $conn->prepare("INSERT INTO contact_messages (user_id, subject, message, status) VALUES (?, ?, ?, 'open')");
    $stmt->execute([$u['id'], $subject, $message]);
    json_out(["status" => 200, "message" => "Terkirim"]);
  }

  /* USER: daftar pesan miliknya */
  if ($action === 'my_messages') {
    $u = me();
    if (!$u)
      json_out(["status" => 401, "message" => "Unauthorized"]);
    $stmt = $conn->prepare("SELECT id, subject, message, status, reply_text, created_at, updated_at
                            FROM contact_messages
                            WHERE user_id = ?
                            ORDER BY id DESC");
    $stmt->execute([$u['id']]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    json_out(["status" => 200, "data" => $rows]);
  }

  /* =======================
     ADMIN (opsional/lanjutan)
  ========================*/

  // Daftar semua pesan (admin)
  if ($action === 'list' || $action === 'list_all') {
    $u = me();
    if (!$u || $u['role'] !== 'admin')
      json_out(["status" => 401, "message" => "Unauthorized"]);
    $stmt = $conn->query("SELECT cm.*, u.name, u.email
                          FROM contact_messages cm
                          LEFT JOIN users u ON u.id = cm.user_id
                          ORDER BY cm.id DESC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    json_out(["status" => 200, "data" => $rows]);
  }

  // Balas (admin)
  if ($action === 'reply') {
    $u = me();
    if (!$u || $u['role'] !== 'admin')
      json_out(["status" => 401, "message" => "Unauthorized"]);
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $id = (int) ($input['id'] ?? 0);
    $reply = trim($input['reply_text'] ?? '');
    if ($id <= 0 || $reply === '')
      json_out(["status" => 422, "message" => "Data tidak valid"]);
    $stmt = $conn->prepare("UPDATE contact_messages SET reply_text = ?, status='replied', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->execute([$reply, $id]);
    json_out(["status" => 200, "message" => "Tersimpan"]);
  }

  // Hapus (admin)
  if ($action === 'delete') {
    $u = me();
    if (!$u || $u['role'] !== 'admin')
      json_out(["status" => 401, "message" => "Unauthorized"]);
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0)
      json_out(["status" => 422, "message" => "ID tidak valid"]);
    $stmt = $conn->prepare("DELETE FROM contact_messages WHERE id = ?");
    $stmt->execute([$id]);
    json_out(["status" => 200, "message" => "Dihapus"]);
  }

  // fallback
  json_out(["status" => 400, "message" => "Aksi tidak valid"]);
} catch (Throwable $e) {
  json_out(["status" => 500, "message" => "Server error: " . $e->getMessage()]);
}
