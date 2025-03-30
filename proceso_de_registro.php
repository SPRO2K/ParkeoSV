<?php
define('XML_FILE', 'usuarios.xml');

function cargarUsuarios() {
    if (!file_exists(XML_FILE)) {
        $xml = new SimpleXMLElement('<usuarios></usuarios>');
        $xml->asXML(XML_FILE);
    }
    return simplexml_load_file(XML_FILE);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuario = trim($_POST['usuario']);
    $contrasena = $_POST['contrasena'];

    if (strlen($usuario) < 4 || strlen($contrasena) < 6) {
        echo "<script>alert('El nombre de usuario debe tener al menos 4 caracteres y la contraseña al menos 6.');</script>";
        echo "<script>window.location.href='registro.html';</script>";
        exit();
    }

    $xml = cargarUsuarios();

    foreach ($xml->usuario as $u) {
        if ((string)$u->nombre === $usuario) {
            echo "<script>alert('El usuario ya existe. Intenta con otro nombre de usuario.');</script>";
            echo "<script>window.location.href='registro.html';</script>";
            exit();
        }
    }

    $nuevoUsuario = $xml->addChild('usuario');
    $nuevoUsuario->addChild('nombre', $usuario);
    $nuevoUsuario->addChild('contrasena', password_hash($contrasena, PASSWORD_BCRYPT));
    $xml->asXML(XML_FILE);

    echo "<script>alert('Registro exitoso. Ahora puedes iniciar sesión.');</script>";
    echo "<script>window.location.href='index.html';</script>";
    exit();
}
