<?php
if (session_status() === PHP_SESSION_NONE)
    session_start();

function current_user()
{
    return $_SESSION['user'] ?? null;
}

function require_login_json()
{
    if (!isset($_SESSION['user'])) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['status' => 401, 'message' => 'Login diperlukan']);
        exit;
    }
}
function require_admin_json()
{
    if (!isset($_SESSION['user']) || (($_SESSION['user']['role'] ?? 'user') !== 'admin')) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['status' => 403, 'message' => 'Hanya admin']);
        exit;
    }
}
function require_login_page()
{
    if (!isset($_SESSION['user'])) {
        header('Location: login.html');
        exit;
    }
}
function require_admin_page()
{
    if (!isset($_SESSION['user']) || (($_SESSION['user']['role'] ?? 'user') !== 'admin')) {
        header('Location: login.html');
        exit;
    }
}
