<?php
define('XML_FILE', 'usuarios.xml');

function cargarUsuarios() {
    if (!file_exists(XML_FILE)) {
        die('El archivo de usuarios no existe.');
    }
    return simplexml_load_file(XML_FILE);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuario = trim($_POST['usuario']);
    $contrasena = $_POST['contrasena'];

    $xml = cargarUsuarios();

    foreach ($xml->usuario as $u) {
        if ((string)$u->nombre === $usuario && password_verify($contrasena, (string)$u->contrasena)) {
            header('Location: inicio.html');
            exit();
        }
    }

    echo "<script>alert('Usuario o contraseña incorrectos');</script>";
    echo "<script>window.location.href='index.html';</script>";
    exit();
}
