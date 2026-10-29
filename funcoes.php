<?php
/* Funções de apoio usadas por index.php e ranking.php */

/** Escapa texto para exibir com segurança em HTML. */
function h($texto)
{
    return htmlspecialchars((string)$texto, ENT_QUOTES, 'UTF-8');
}

/** Rótulo da posição no ranking: 🥇 1º, 🥈 2º, 🥉 3º, 4º... ($indice começa em 0). */
function rotulo_posicao($indice)
{
    if ($indice === 0) return '🥇 1º';
    if ($indice === 1) return '🥈 2º';
    if ($indice === 2) return '🥉 3º';
    return ($indice + 1) . 'º';
}

/** Busca os melhores resultados. Retorna [] se não houver conexão ou der erro. */
function buscar_ranking($pdo, $limite = 10)
{
    if (!($pdo instanceof PDO)) {
        return [];
    }
    try {
        $stmt = $pdo->prepare("
            SELECT id, nome, pontos, DATE_FORMAT(dataRegistro, '%d/%m/%Y %H:%i') AS data
            FROM ranking
            ORDER BY pontos DESC, id ASC
            LIMIT :limite
        ");
        $stmt->bindValue(':limite', (int)$limite, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    } catch (Exception $e) {
        return [];
    }
}