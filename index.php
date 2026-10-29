<?php
// Mantém a página abrindo mesmo se o MySQL estiver desligado
define('CONEXAO_SILENCIOSA', true);
require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/funcoes.php';

// Busca inicial do ranking para carregar rápido na primeira abertura
$rankingInicial = buscar_ranking($pdo, 10);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nucles Jump - Jogo com Ranking MySQL</title>
    <link rel="icon" type="image/png" href="assets/moeda.png">
    <link rel="stylesheet" href="css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&family=Press+Start+2P&display=swap" rel="stylesheet">
</head>
<body>

    <div class="game-container" id="game-container">

        <header class="hud-bar">
            <div class="hud-item player-info">
                <span class="label">JOGADOR</span>
                <span class="value" id="hud-player-name">---</span>
            </div>
            <div class="hud-item coin-info">
                <span class="label">MOEDAS</span>
                <span class="value value-coin">
                    <img src="assets/moeda.png" class="icon-moeda" alt="" draggable="false">
                    <span id="coin-display">0</span>
                </span>
            </div>
            <div class="hud-item score-info">
                <span class="label">PONTOS</span>
                <span class="value" id="score-display">0</span>
            </div>
        </header>

        <main class="game-board" id="game-board">
            <img src="assets/clouds.png" class="clouds" alt="" draggable="false">
            <div class="chao" id="chao"></div>
            <img src="assets/personagens/mimi_1.png" class="personagem" id="personagem" alt="Personagem" draggable="false">
            <span class="jump-tip" id="jump-tip">Pressione ESPAÇO ou toque na tela para pular</span>
        </main>
    </div>

    <!-- 1. TELA DE INÍCIO / INSERIR NOME E ESCOLHER PERSONAGEM -->
    <div class="modal-overlay active" id="start-modal">
        <div class="modal-card">
            <div class="modal-header">
                <h1 class="game-title">NUCLES JUMP</h1>
                <p class="game-subtitle">Corra, colete moedas, desvie dos obstáculos e dispute o topo do ranking!</p>
            </div>

            <form class="start-form" id="start-form">
                <div class="input-group">
                    <label for="player-input">DIGITE SEU NOME:</label>
                    <input
                        type="text"
                        id="player-input"
                        placeholder="Ex: Seu Nome"
                        maxlength="30"
                        required
                        autocomplete="off"
                        autofocus
                    >
                </div>

                <fieldset class="input-group character-fieldset">
                    <legend>ESCOLHA SUA PERSONAGEM:</legend>
                    <div class="character-picker" id="character-picker">
                        <label class="char-option">
                            <input type="radio" name="personagem" value="mimi" checked>
                            <span class="char-card">
                                <img src="assets/personagens/mimi_1.png" alt="" draggable="false">
                                <span class="char-name">Mimi</span>
                            </span>
                        </label>
                        <label class="char-option">
                            <input type="radio" name="personagem" value="luna">
                            <span class="char-card">
                                <img src="assets/personagens/luna_1.png" alt="" draggable="false">
                                <span class="char-name">Luna</span>
                            </span>
                        </label>
                    </div>
                </fieldset>

                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary" id="btn-start">INICIAR JOGO</button>
                    <button type="button" class="btn btn-secondary" id="btn-view-ranking">VER RANKING</button>
                </div>
            </form>

            <div class="server-status" id="server-status">
                <span class="status-dot <?= ($pdo instanceof PDO) ? 'online' : 'offline' ?>" id="status-dot"></span>
                <span id="status-text"><?= ($pdo instanceof PDO) ? 'Conectado ao MySQL' : 'Sem conexão com o MySQL' ?></span>
            </div>

            <p class="ranking-link-wrap">
                <a class="ranking-link" href="ranking.php" target="_blank" rel="noopener">Abrir ranking em outra página</a>
            </p>
        </div>
    </div>

    <!-- 2. TELA DE GAME OVER & RANKING -->
    <div class="modal-overlay" id="gameover-modal">
        <div class="modal-card gameover-card">
            <div class="modal-header">
                <h2 class="gameover-title" id="gameover-title">GAME OVER</h2>
                <div class="final-score-box" id="final-score-box">
                    <div class="final-score-label">SUA PONTUAÇÃO</div>
                    <div class="final-score-num" id="final-score-value">0</div>
                    <div class="final-coins">
                        <img src="assets/moeda.png" class="icon-moeda" alt="" draggable="false">
                        <span><span id="final-coins-value">0</span> moedas coletadas</span>
                    </div>
                    <div class="save-status" id="save-status-msg" role="status" aria-live="polite"></div>
                    <button type="button" class="btn btn-small" id="btn-retry-save" hidden>TENTAR SALVAR DE NOVO</button>
                </div>
            </div>

            <!-- Tabela com o TOP 10 -->
            <div class="ranking-container">
                <h3 class="ranking-title">🏆 TOP 10 MELHORES PONTUAÇÕES</h3>
                <div class="table-wrapper">
                    <table class="ranking-table">
                        <thead>
                            <tr>
                                <th>POS</th>
                                <th>JOGADOR</th>
                                <th>PONTUAÇÃO</th>
                            </tr>
                        </thead>
                        <tbody id="ranking-body">
                            <?php if (!empty($rankingInicial)): ?>
                                <?php foreach ($rankingInicial as $i => $row): ?>
                                    <tr>
                                        <td class="ranking-pos"><?= h(rotulo_posicao($i)) ?></td>
                                        <td><strong><?= h($row['nome']) ?></strong></td>
                                        <td><?= (int)$row['pontos'] ?> pts</td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="3" class="loading-cell">Nenhuma pontuação gravada ainda. Jogue para ser o 1º!</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="modal-actions">
                <button type="button" class="btn btn-primary" id="btn-restart">JOGAR NOVAMENTE</button>
                <button type="button" class="btn btn-secondary" id="btn-change-player">TROCAR JOGADOR</button>
                <button type="button" class="btn btn-secondary" id="btn-back-menu" hidden>VOLTAR AO MENU</button>
            </div>
        </div>
    </div>

    <script src="js/imagens.js" defer></script>
    <script src="js/script.js" defer></script>
</body>
</html>