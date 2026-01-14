<?php
// Load .env (simple loader)
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
  foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (str_starts_with(trim($line), '#'))
      continue;
    [$k, $v] = explode('=', $line, 2);
    putenv(trim($k) . '=' . trim($v));
  }
}

declare(strict_types=1);
if (session_status() === PHP_SESSION_NONE)
  session_start();
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

function out($a)
{
  echo json_encode($a, JSON_UNESCAPED_UNICODE);
  exit;
}
function ok($obj = [])
{
  out(['status' => 200] + $obj);
}
function err($c, $m)
{
  out(['status' => $c, 'message' => $m]);
}

$action = $_GET['action'] ?? '';

// Map kurir front-end → kode binderbyte
function mapCourier($k)
{
  $k = strtolower(trim($k));
  $map = [
    'jnt' => 'jnt',
    'jne' => 'jne',
    'sicepat' => 'sicepat',
    'spx' => 'spx',
    'shopee' => 'spx',
    'pos' => 'pos',
    'anteraja' => 'anteraja',
    'wahana' => 'wahana',
    'ninja' => 'ninja',
    'lionparcel' => 'lion',
    'idexpress' => 'ide',
    'ide' => 'ide'
  ];
  return $map[$k] ?? $k;
}

// TRACKING (save optional)
if ($action === 'cekResi') {
  $in = json_decode(file_get_contents('php://input'), true) ?? [];
  $resi = trim($in['resi'] ?? '');
  $kurirRaw = trim($in['kurir'] ?? '');
  $save = (int) ($in['save'] ?? 0);
  if ($resi === '' || $kurirRaw === '')
    err(400, 'Resi dan kurir wajib.');

  $kurir = mapCourier($kurirRaw);

  $apiKey = getenv('BINDERBYTE_API_KEY');
  if (!$apiKey) {
    err(500, 'API key Binderbyte belum dikonfigurasi');
  }

  $apiUrl = "https://api.binderbyte.com/v1/track?api_key={$apiKey}&courier={$kurir}&awb={$resi}";

  $ch = curl_init($apiUrl);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true
  ]);
  $response = curl_exec($ch);
  if (curl_errno($ch))
    err(500, "Gagal akses API: " . curl_error($ch));
  curl_close($ch);

  $data = json_decode($response, true);
  if (!$data)
    err(500, 'Gagal parse respons API');

  if (($data['status'] ?? 500) != 200 || !isset($data['data'])) {
    err($data['status'] ?? 500, $data['message'] ?? 'Gagal mengambil data');
  }

  //  Simpan bila diminta & login
  if ($save === 1 && isset($_SESSION['user'])) {
    $uid = (int) $_SESSION['user']['id'];
    $json = json_encode($data['data'], JSON_UNESCAPED_UNICODE);

    $st = $conn->prepare("SELECT id FROM cekresi WHERE user_id=? AND resi=? AND kurir=? LIMIT 1");
    $st->execute([$uid, $resi, $kurirRaw]);

    if ($st->fetch()) {
      $up = $conn->prepare("UPDATE cekresi SET response_json=?, created_at=CURRENT_TIMESTAMP WHERE user_id=? AND resi=? AND kurir=?");
      $up->execute([$json, $uid, $resi, $kurirRaw]);
    } else {
      $ins = $conn->prepare("INSERT INTO cekresi (user_id,resi,kurir,response_json) VALUES (?,?,?,?)");
      $ins->execute([$uid, $resi, $kurirRaw, $json]);
    }
  }

  ok(['message' => 'Berhasil', 'data' => $data['data']]);
}

// GET HISTORY (user only)
if ($action === 'getcekresi') {
  if (!isset($_SESSION['user']))
    err(401, 'Login diperlukan');
  $uid = (int) $_SESSION['user']['id'];
  try {
    $st = $conn->prepare("SELECT id,resi,kurir,response_json,created_at FROM cekresi WHERE user_id=? ORDER BY id DESC");
    $st->execute([$uid]);
    $rows = $st->fetchAll();
    out($rows);
  } catch (PDOException $e) {
    err(500, 'DB: ' . $e->getMessage());
  }
}

// DELETE SELECTED (user only)
if ($action === 'deletecekresi') {
  if (!isset($_SESSION['user']))
    err(401, 'Login diperlukan');
  $uid = (int) $_SESSION['user']['id'];
  $in = json_decode(file_get_contents('php://input'), true) ?? [];
  $ids = $in['ids'] ?? [];
  if (!is_array($ids) || count($ids) === 0)
    err(400, 'IDs kosong');

  $place = implode(',', array_fill(0, count($ids), '?'));
  $params = array_map('intval', $ids);
  array_unshift($params, $uid);

  try {
    $sql = "DELETE FROM cekresi WHERE user_id=? AND id IN ($place)";
    $st = $conn->prepare($sql);
    $st->execute($params);
    ok(['message' => 'Terhapus', 'deleted' => $st->rowCount()]);
  } catch (PDOException $e) {
    err(500, 'DB: ' . $e->getMessage());
  }
}

// default
err(400, 'Aksi tidak valid');
