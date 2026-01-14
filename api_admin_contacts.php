<?php
declare(strict_types=1);
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

function require_admin()
{
    if (!isset($_SESSION['user']) || ($_SESSION['user']['role'] ?? '') !== 'admin') {
        http_response_code(401);
        echo json_encode(['status' => 401, 'message' => 'Unauthorized']);
        exit;
    }
}

$action = $_GET['action'] ?? '';
$raw = file_get_contents('php://input');
$body = $raw ? json_decode($raw, true) : [];

try {
    if ($action === 'list_public') {
        $st = $conn->query("SELECT id,label,type,value,created_at,updated_at FROM admin_contacts ORDER BY label ASC, type ASC, id DESC");
        echo json_encode($st->fetchAll(), JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'list') {
        require_admin();
        $st = $conn->query("SELECT id,label,type,value,created_at,updated_at FROM admin_contacts ORDER BY id DESC");
        echo json_encode($st->fetchAll(), JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'create') {
        require_admin();
        $label = trim($body['label'] ?? '');
        $type = strtolower(trim($body['type'] ?? 'other'));
        $value = trim($body['value'] ?? '');
        if ($label === '' || $value === '') {
            echo json_encode(['status' => 422, 'message' => 'Label & nilai wajib diisi']);
            exit;
        }

        $st = $conn->prepare("INSERT INTO admin_contacts(label,type,value,created_at) VALUES (?,?,?,NOW())");
        $st->execute([$label, $type, $value]);
        echo json_encode(['status' => 200, 'id' => $conn->lastInsertId()]);
        exit;
    }

    if ($action === 'update') {
        require_admin();
        $id = (int) ($body['id'] ?? 0);
        $label = trim($body['label'] ?? '');
        $type = strtolower(trim($body['type'] ?? 'other'));
        $value = trim($body['value'] ?? '');
        if ($id <= 0) {
            echo json_encode(['status' => 422, 'message' => 'ID tidak valid']);
            exit;
        }
        if ($label === '' || $value === '') {
            echo json_encode(['status' => 422, 'message' => 'Label & nilai wajib diisi']);
            exit;
        }

        $st = $conn->prepare("UPDATE admin_contacts SET label=?, type=?, value=?, updated_at=NOW() WHERE id=?");
        $st->execute([$label, $type, $value, $id]);
        echo json_encode(['status' => 200]);
        exit;
    }

    if ($action === 'delete') {
        require_admin();
        $ids = $body['ids'] ?? [];
        if (!is_array($ids) || empty($ids)) {
            echo json_encode(['status' => 422, 'message' => 'IDs kosong']);
            exit;
        }
        $ids = array_values(array_filter(array_map('intval', $ids)));
        $in = implode(',', array_fill(0, count($ids), '?'));
        $st = $conn->prepare("DELETE FROM admin_contacts WHERE id IN ($in)");
        $st->execute($ids);
        echo json_encode(['status' => 200, 'deleted' => $st->rowCount()]);
        exit;
    }

    echo json_encode(['status' => 400, 'message' => 'Invalid action']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 500, 'message' => 'DB error: ' . $e->getMessage()]);
}
