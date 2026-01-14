<?php
// db.php
$host = "localhost";
$db = "cekresiv9";
$user = "root";
$pass = "fenrir1234";

try {
    $conn = new PDO(
        "mysql:host=$host;dbname=$db;charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    die(json_encode(["status" => 500, "message" => "DB connect fail: " . $e->getMessage()]));
}
