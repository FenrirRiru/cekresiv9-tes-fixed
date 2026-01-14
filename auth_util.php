<?php
if (session_status() === PHP_SESSION_NONE)
    session_start();

function currentUser()
{
    return $_SESSION['user'] ?? null;
}

function requireLoginJson()
{
    if (!isset($_SESSION['user'])) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['status' => 401, 'message' => 'Login diperlukan']);
        exit;
    }
}
function requireAdminJson()
{
    if (!isset($_SESSION['user']) || (($_SESSION['user']['role'] ?? 'user') !== 'admin')) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['status' => 403, 'message' => 'Hanya admin']);
        exit;
    }
}
function requireLoginPage()
{
    if (!isset($_SESSION['user'])) {
        header('Location: login.html');
        exit;
    }
}
function requireAdminPage()
{
    if (!isset($_SESSION['user']) || (($_SESSION['user']['role'] ?? 'user') !== 'admin')) {
        header('Location: login.html');
        exit;
    }
}
