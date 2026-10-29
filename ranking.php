<?php
// Página própria do ranking (link "Abrir ranking em outra página" do menu inicial)
define('CONEXAO_SILENCIOSA', true);
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/funcoes.php';

$ranking = buscar_ranking($pdo, 50);
$temBanco = ($pdo instanceof PDO);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ranking - Nucles Jump</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&family=Press+Start+2P&display=swap" rel="stylesheet">
</head>
<body class="ranking-page">

    <main class="modal-card ranking-card">
        <div class="modal-header">
            <h1 class="game-title">RANKING</h1>
            <p class="game-subtitle">As 50 melhores pontuações do Nucles Jump</p>
        </div>

        <div class="ranking-container">
            <div class="table-wrapper table-wrapper-tall">
                <table class="ranking-table">
                    <thead>
                        <tr>
                            <th>POS</th>
                            <th>JOGADOR</th>
                            <th>PONTUAÇÃO</th>
                            <th class="col-data">DATA</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (!empty($ranking)): ?>
                            <?php foreach ($ranking as $i => $row): ?>
                                <tr>
                                    <td class="ranking-pos"><?= h(rotulo_posicao($i)) ?></td>
                                    <td><strong><?= h($row['nome']) ?></strong></td>
                                    <td><?= (int)$row['pontos'] ?> pts</td>
                                    <td class="col-data"><?= h($row['data']) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="4" class="loading-cell">
                                    <?= $temBanco
                                        ? 'Nenhuma pontuação gravada ainda. Jogue para ser o 1º!'
                                        : 'Não foi possível conectar ao MySQL. Verifique se o Laragon está iniciado.' ?>
                                </td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="modal-actions">
            <a class="btn btn-primary" href="index.php">VOLTAR AO JOGO</a>
        </div>
    </main>

</body>
</html>