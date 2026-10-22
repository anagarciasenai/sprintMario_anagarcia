<?php
/* Endpoint para salvar a pontuação do jogador no banco de dados */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/conexao.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método não permitido']);
    exit;
}

// Aceita JSON ou form-data / POST padrão
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

$nome   = isset($input['nome']) ? trim((string)$input['nome']) : '';
$pontos = isset($input['pontos']) ? (int)$input['pontos'] : 0;

if ($nome === '') {
    $nome = 'Jogador Anônimo';
}

// Mesmo limite do campo no formulário (30 caracteres)
$nome = mb_substr($nome, 0, 30);

// Evita valores negativos ou absurdos
$pontos = max(0, min($pontos, 1000000));

try {
    $stmt = $pdo->prepare("INSERT INTO ranking (nome, pontos) VALUES (:nome, :pontos)");
    $stmt->execute([
        ':nome'   => $nome,
        ':pontos' => $pontos,
    ]);

    // Busca o TOP 10 atualizado
    $stmtRanking = $pdo->prepare("
        SELECT id, nome, pontos, DATE_FORMAT(dataRegistro, '%d/%m/%Y %H:%i') AS data
        FROM ranking
        ORDER BY pontos DESC, id ASC
        LIMIT 10
    ");
    $stmtRanking->execute();
    $ranking = $stmtRanking->fetchAll();

    echo json_encode([
        'status'  => 'success',
        'message' => 'Pontuação registrada com sucesso!',
        'ranking' => $ranking,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Erro ao salvar no banco: ' . $e->getMessage(),
    ]);
}