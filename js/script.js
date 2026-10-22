document.addEventListener('DOMContentLoaded', () => {

    // Lista de personagens disponíveis.
    // Para adicionar outro, basta incluir um novo item aqui (e colocar as imagens em assets/).
    const PERSONAGENS = [
        {
            id: 'personagem1',
            nome: 'PERS. 1',
            img: 'assets/personagem.gif',
            gameOver: 'assets/game-over.jpg'
        },
        {
            id: 'personagem2',
            nome: 'PERS. 2',
            img: 'assets/personagem2.gif',
            gameOver: 'assets/game-over.jpg'
        }
    ];

    // Personagem escolhido (recupera a última escolha salva)
    const savedCharacterId = localStorage.getItem('nucles_jump_character');
    let currentCharacter =
        PERSONAGENS.find(p => p.id === savedCharacterId) || PERSONAGENS[0];

    // Elementos do jogo
    const personagem = document.querySelector('.personagem');
    const pipe = document.querySelector('.pipe');
    const gameBoard = document.getElementById('game-board');
    const hudPlayerName = document.getElementById('hud-player-name');
    const scoreDisplay = document.getElementById('score-display');
    const jumpTip = document.getElementById('jump-tip');

    // Telas e modais
    const startModal = document.getElementById('start-modal');
    const startForm = document.getElementById('start-form');
    const playerInput = document.getElementById('player-input');
    const btnViewRanking = document.getElementById('btn-view-ranking');

    const gameoverModal = document.getElementById('gameover-modal');
    const gameoverTitle = document.getElementById('gameover-title');
    const finalScoreBox = document.getElementById('final-score-box');
    const finalScoreValue = document.getElementById('final-score-value');
    const saveStatusMsg = document.getElementById('save-status-msg');
    const rankingBody = document.getElementById('ranking-body');
    const btnRestart = document.getElementById('btn-restart');
    const btnChangePlayer = document.getElementById('btn-change-player');

    // Verifica se os elementos essenciais existem
    if (!personagem || !pipe || !gameBoard || !startForm) {
        console.error(
            'Erro: confira os elementos personagem, pipe, game-board e start-form no HTML.'
        );
        return;
    }

    // Pré-carrega as imagens para não piscar
    PERSONAGENS.forEach(p => {
        new Image().src = p.img;
        new Image().src = p.gameOver;
    });

    // Estado do jogo
    let currentPlayer = '';
    let score = 0;
    let isPlaying = false;
    let gameLoop = null;
    let scoreLoop = null;

    // Carrega o último nome utilizado
    const savedName = localStorage.getItem('nucles_jump_player');

    if (savedName && playerInput) {
        playerInput.value = savedName;
    }

    // Mostra as opções de personagem na tela inicial
    const characterPicker = document.getElementById('character-picker');

    function renderCharacterPicker() {
        if (!characterPicker) return;

        characterPicker.innerHTML = '';

        PERSONAGENS.forEach(p => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'character-option';
            btn.dataset.id = p.id;

            if (p.id === currentCharacter.id) {
                btn.classList.add('selected');
            }

            const img = document.createElement('img');
            img.src = p.img;
            img.alt = p.nome;
            img.draggable = false;

            const label = document.createElement('span');
            label.textContent = p.nome;

            btn.appendChild(img);
            btn.appendChild(label);

            btn.addEventListener('click', () => selectCharacter(p.id));

            characterPicker.appendChild(btn);
        });
    }

    function selectCharacter(id) {
        const found = PERSONAGENS.find(p => p.id === id);
        if (!found) return;

        currentCharacter = found;
        localStorage.setItem('nucles_jump_character', found.id);

        // Atualiza o destaque e a prévia no tabuleiro
        characterPicker.querySelectorAll('.character-option').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.id === found.id);
        });

        if (!isPlaying) {
            personagem.src = found.img;
        }
    }

    // Prepara o jogo para uma nova rodada
    function resetElements() {
        gameBoard.classList.remove('running', 'game-over');

        personagem.classList.remove('jump');
        personagem.src = currentCharacter.img;

        // Força o navegador a recalcular o layout para as animações reiniciarem do zero
        void gameBoard.offsetWidth;

        if (jumpTip) {
            jumpTip.style.opacity = '1';
        }
    }

    // Inicia o jogo
    function startGame() {
        clearInterval(gameLoop);
        clearInterval(scoreLoop);

        isPlaying = false;
        resetElements();

        score = 0;
        scoreDisplay.textContent = '0';
        hudPlayerName.textContent = currentPlayer || 'Jogador';

        gameoverModal.classList.remove('active');

        // Tira o foco de botões para o ESPAÇO não ativar o botão clicado por último
        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }

        // Inicia as animações
        gameBoard.classList.add('running');
        isPlaying = true;

        // Soma 1 ponto a cada 100 milissegundos
        scoreLoop = setInterval(() => {
            if (isPlaying) {
                score++;
                scoreDisplay.textContent = score;
            }
        }, 100);

        // Verifica colisões
        gameLoop = setInterval(checkCollision, 10);
    }

    // Faz o personagem pular
    function jump() {
        if (!isPlaying) return;
        if (personagem.classList.contains('jump')) return;

        personagem.classList.add('jump');

        if (jumpTip) {
            jumpTip.style.opacity = '0';
        }
    }

    // Remove a classe de pulo quando a animação termina
    personagem.addEventListener('animationend', event => {
        if (event.animationName === 'jump-animation') {
            personagem.classList.remove('jump');
        }
    });

    // Verifica colisão entre o personagem e o obstáculo
    function checkCollision() {
        if (!isPlaying) return;

        const pipeRect = pipe.getBoundingClientRect();
        const charRect = personagem.getBoundingClientRect();

        // Margens para a colisão ser mais justa (ignora bordas transparentes das imagens)
        const charX = charRect.width * 0.2;
        const charY = charRect.height * 0.1;
        const pipeX = pipeRect.width * 0.1;
        const pipeY = pipeRect.height * 0.1;

        const collided =
            charRect.right - charX > pipeRect.left + pipeX &&
            charRect.left + charX < pipeRect.right - pipeX &&
            charRect.bottom - charY > pipeRect.top + pipeY &&
            charRect.top + charY < pipeRect.bottom - pipeY;

        if (collided) {
            triggerGameOver();
        }
    }

    // Finaliza a rodada
    function triggerGameOver() {
        if (!isPlaying) return;

        isPlaying = false;

        clearInterval(gameLoop);
        clearInterval(scoreLoop);

        // Congela as animações no lugar (cano, nuvens e personagem)
        gameBoard.classList.remove('running');
        gameBoard.classList.add('game-over');

        // Troca para a imagem de Game Over
        personagem.src = currentCharacter.gameOver;

        gameoverTitle.textContent = 'GAME OVER';
        finalScoreBox.classList.remove('hidden');
        finalScoreValue.textContent = score;
        saveStatusMsg.textContent = 'Salvando pontuação no banco...';
        saveStatusMsg.style.color = '#ffcc00';

        // Pequena pausa para o jogador ver onde bateu
        setTimeout(() => {
            gameoverModal.classList.add('active');
        }, 600);

        saveScore(currentPlayer, score);
    }

    // Faz a requisição e devolve o JSON, com mensagens de erro claras
    async function requestJson(url, options) {
        let response;

        try {
            response = await fetch(url, options);
        } catch (err) {
            throw new Error(
                'Sem conexão com o servidor. Abra o jogo pelo endereço do Laragon ' +
                '(ex: http://localhost/sua-pasta/index.php) e não pelo arquivo direto.'
            );
        }

        const text = await response.text();
        let data = null;

        try {
            data = JSON.parse(text);
        } catch (err) {
            data = null;
        }

        if (!response.ok || !data) {
            const detail = data && data.message
                ? data.message
                : text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);

            throw new Error('HTTP ' + response.status + ' em ' + url + (detail ? ': ' + detail : ''));
        }

        return data;
    }

    // Mostra uma mensagem dentro da tabela de ranking
    function showRankingMessage(message, isError = false) {
        if (!rankingBody) return;

        rankingBody.innerHTML = '';

        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 3;
        td.className = 'loading-cell';
        td.textContent = message;

        if (isError) {
            td.style.color = '#ef4444';
        }

        tr.appendChild(td);
        rankingBody.appendChild(tr);
    }

    // Salva a pontuação no MySQL
    async function saveScore(playerName, finalScore) {
        try {
            const data = await requestJson('salvar_ranking.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nome: playerName,
                    pontos: finalScore
                })
            });

            if (data.status !== 'success') {
                throw new Error(data.message || 'Erro ao registrar pontuação.');
            }

            saveStatusMsg.textContent = 'Pontuação registrada no banco!';
            saveStatusMsg.style.color = '#10b981';

            if (data.ranking) {
                renderRanking(data.ranking, playerName, finalScore);
            } else {
                fetchRanking();
            }
        } catch (error) {
            console.error('Erro ao salvar pontuação:', error);

            saveStatusMsg.textContent = 'Não foi possível salvar. ' + error.message;
            saveStatusMsg.style.color = '#ef4444';

            // Tenta mostrar o ranking mesmo assim
            fetchRanking();
        }
    }

    // Busca o ranking atualizado
    async function fetchRanking() {
        showRankingMessage('Carregando ranking...');

        try {
            const data = await requestJson('obter_ranking.php?t=' + Date.now());

            if (data.status !== 'success' || !data.ranking) {
                throw new Error(data.message || 'Resposta inválida do servidor.');
            }

            renderRanking(data.ranking);
        } catch (error) {
            console.error('Erro ao buscar ranking:', error);
            showRankingMessage('Não foi possível carregar o ranking. ' + error.message, true);
        }
    }

    // Mostra as pontuações na tabela
    function renderRanking(list, highlightName = null, highlightScore = null) {
        if (!rankingBody) return;

        rankingBody.innerHTML = '';

        if (!list || list.length === 0) {
            rankingBody.innerHTML =
                '<tr><td colspan="3" class="loading-cell">' +
                'Nenhuma pontuação gravada ainda. Jogue para ser o 1º!' +
                '</td></tr>';
            return;
        }

        let highlighted = false;

        list.forEach((item, index) => {
            const tr = document.createElement('tr');

            if (
                !highlighted &&
                highlightName &&
                item.nome === highlightName &&
                Number(item.pontos) === Number(highlightScore)
            ) {
                tr.classList.add('highlight-current');
                highlighted = true;
            }

            let medal = `${index + 1}º`;

            if (index === 0) medal = '🥇 1º';
            else if (index === 1) medal = '🥈 2º';
            else if (index === 2) medal = '🥉 3º';

            const tdPosition = document.createElement('td');
            tdPosition.className = 'ranking-pos';
            tdPosition.textContent = medal;

            const tdName = document.createElement('td');
            const strong = document.createElement('strong');
            strong.textContent = item.nome || 'Jogador';
            tdName.appendChild(strong);

            const tdScore = document.createElement('td');
            tdScore.textContent = `${Number(item.pontos) || 0} pts`;

            tr.appendChild(tdPosition);
            tr.appendChild(tdName);
            tr.appendChild(tdScore);

            rankingBody.appendChild(tr);
        });
    }

    // Monta o seletor e mostra o personagem escolhido no tabuleiro
    renderCharacterPicker();
    personagem.src = currentCharacter.img;

    // Iniciar jogo
    startForm.addEventListener('submit', event => {
        event.preventDefault();

        const nameValue = playerInput.value.trim();

        if (!nameValue) {
            playerInput.focus();
            return;
        }

        currentPlayer = nameValue;
        localStorage.setItem('nucles_jump_player', currentPlayer);

        startModal.classList.remove('active');
        startGame();
    });

    // Ver ranking (sem jogar)
    btnViewRanking.addEventListener('click', () => {
        fetchRanking();

        gameoverTitle.textContent = 'RANKING';
        finalScoreBox.classList.add('hidden');
        saveStatusMsg.textContent = '';

        startModal.classList.remove('active');
        gameoverModal.classList.add('active');
    });

    // Jogar novamente
    btnRestart.addEventListener('click', () => {
        gameoverModal.classList.remove('active');

        if (!currentPlayer) {
            startModal.classList.add('active');
            playerInput.focus();
        } else {
            startGame();
        }
    });

    // Trocar jogador
    btnChangePlayer.addEventListener('click', () => {
        clearInterval(gameLoop);
        clearInterval(scoreLoop);

        isPlaying = false;
        currentPlayer = '';

        gameoverModal.classList.remove('active');

        resetElements();

        hudPlayerName.textContent = '---';
        scoreDisplay.textContent = '0';

        startModal.classList.add('active');
        playerInput.value = '';
        playerInput.focus();
    });

    // Controles do teclado
    document.addEventListener('keydown', event => {
        if (event.code === 'Space' || event.code === 'ArrowUp') {
            if (isPlaying) {
                event.preventDefault();
                jump();
            }
        }
    });

    // Permite pular clicando/tocando no tabuleiro
    gameBoard.addEventListener('click', () => {
        if (isPlaying) {
            jump();
        }
    });

    // Avisos de imagem não encontrada
    personagem.addEventListener('error', () => {
        console.error(
            'Não foi possível carregar a imagem do personagem. ' +
            'Confira o nome e a pasta das imagens na lista PERSONAGENS (pasta assets/).'
        );
    });

});
