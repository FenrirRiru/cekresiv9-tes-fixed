<?php
namespace App;

class Database
{
    public static $conn;

    public static function init()
    {
        if (self::$conn) return;

        // Load .env (simple loader)
        $envFile = __DIR__ . '/.env';
        if (file_exists($envFile)) {
            foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                if (str_starts_with(trim($line), '#')) {
                    continue;
                }
                [$k, $v] = explode('=', $line, 2);
                putenv(trim($k) . '=' . trim($v));
            }
        }

        $host = "localhost";
        $db = "cekresiv9";
        $user = "root";
        $pass = getenv('secret');

        try {
            self::$conn = new PDO(
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
    }
}

