/* =========================================================
   NUCLES JUMP — lógica do jogo
   Depende de: index.php (IDs do HTML), css/style.css,
               salvar_ranking.php e obter_ranking.php
   ========================================================= */
(function () {
    'use strict';

    /* ---------------------------------------------------------
       CONFIGURAÇÃO (mantenha igual às variáveis do style.css)
       Unidades: pixels e segundos. "y" = altura acima do chão.
       --------------------------------------------------------- */
    var CFG = {
        playerX: 70,   // --player-x
        playerW: 72,   // --player-w
        playerH: 72,   // --player-h
        pipeW: 64,     // --pipe-w
        pipeH: 90,     // --pipe-h
        moedaTam: 36,  // --moeda

        gravidade: 2600,
        impulsoPulo: 950,   // altura máx. do pulo ≈ 173 px (cano tem 90 px)
        bufferPulo: 0.12,   // aceita o pulo apertado logo antes de aterrissar

        velInicial: 340,    // px/s (partida ligeiramente mais suave)
        velAceleracao: 10,  // px/s a cada segundo (aceleração gradual e equilibrada)
        velBonusMoeda: 10,  // px/s a cada moeda coletada
        velMaxima: 850,     // limite máximo confortável de velocidade

        pontosMoeda: 10,
        pontosObstaculo: 5,

        // Caixas de colisão (um pouco menores que as imagens, para ser justo)
        hitPlayerLado: 16,
        hitPlayerBaixo: 4,
        hitPlayerCima: 8,
        hitPipeLado: 3,
        hitPipeTopo: 2,
        hitMoedaMargem: 4
    };

    var PERSONAGENS = {
        mimi: { nome: 'Mimi' },
        luna: { nome: 'Luna' }
    };
    var PERSONAGEM_PADRAO = 'mimi';

    /* ---------------------------------------------------------
       ELEMENTOS DO HTML
       --------------------------------------------------------- */
    function $(id) { return document.getElementById(id); }

    var el = {
        container:    $('game-container'),
        board:        $('game-board'),
        chao:         $('chao'),
        personagem:   $('personagem'),
        jumpTip:      $('jump-tip'),
        hudNome:      $('hud-player-name'),
        hudPontos:    $('score-display'),
        hudMoedas:    $('coin-display'),

        startModal:   $('start-modal'),
        startForm:    $('start-form'),
        inputNome:    $('player-input'),
        picker:       $('character-picker'),
        btnVerRank:   $('btn-view-ranking'),
        statusDot:    $('status-dot'),
        statusText:   $('status-text'),

        overModal:    $('gameover-modal'),
        overTitle:    $('gameover-title'),
        scoreBox:     $('final-score-box'),
        finalPontos:  $('final-score-value'),
        finalMoedas:  $('final-coins-value'),
        saveMsg:      $('save-status-msg'),
        btnRetry:     $('btn-retry-save'),
        rankBody:     $('ranking-body'),
        btnRestart:   $('btn-restart'),
        btnTrocar:    $('btn-change-player'),
        btnVoltar:    $('btn-back-menu')
    };

    // Se algum ID do HTML estiver errado, avisa no console em vez de quebrar em silêncio
    var faltando = Object.keys(el).filter(function (k) { return !el[k]; });
    if (faltando.length) {
        console.error('[Nucles Jump] Elementos não encontrados no HTML:', faltando.join(', '));
        return;
    }

    /* ---------------------------------------------------------
       ESTADO
       --------------------------------------------------------- */
    var estado = 'menu';          // 'menu' | 'jogando' | 'fim'
    var jogador = { nome: '', personagem: PERSONAGEM_PADRAO };
    var run = null;               // dados da partida atual

    /* ---------------------------------------------------------
       UTILITÁRIOS
       --------------------------------------------------------- */
    function aleatorio(min, max) { return min + Math.random() * (max - min); }

    function guardar(chave, valor) {
        try { localStorage.setItem(chave, valor); } catch (e) { /* ignora */ }
    }
    function ler(chave) {
        try { return localStorage.getItem(chave); } catch (e) { return null; }
    }

    // Usa a imagem embutida (js/imagens.js); se não existir, cai no arquivo da pasta assets/
    function imagem(caminho) {
        return (window.IMAGENS && window.IMAGENS[caminho]) || caminho;
    }

    function caminhoSprite(id, quadro) {
        return imagem('assets/personagens/' + id + '_' + quadro + '.png');
    }

    function trocarSprite(quadro) {
        var url = caminhoSprite(jogador.personagem, quadro);
        if (el.personagem.getAttribute('data-quadro') !== jogador.personagem + quadro) {
            el.personagem.src = url;
            el.personagem.setAttribute('data-quadro', jogador.personagem + quadro);
        }
    }

    // Pré-carrega as imagens para não piscar nem gerar atraso na troca de quadros
    Object.keys(PERSONAGENS).forEach(function (id) {
        ['1', '2', 'pulo'].forEach(function (q) { new Image().src = caminhoSprite(id, q); });
    });
    new Image().src = imagem('assets/moeda.png');
    new Image().src = imagem('assets/pipe.png');

    function rotuloPosicao(i) {
        if (i === 0) return '🥇 1º';
        if (i === 1) return '🥈 2º';
        if (i === 2) return '🥉 3º';
        return (i + 1) + 'º';
    }

    /* ---------------------------------------------------------
       RANKING / SERVIDOR
       --------------------------------------------------------- */
    function marcarServidor(online) {
        el.statusDot.className = 'status-dot ' + (online ? 'online' : 'offline');
        el.statusText.textContent = online
            ? 'Conectado ao MySQL'
            : 'Sem conexão com o MySQL — a pontuação não será salva';
    }

    function renderRanking(lista, destaqueId) {
        el.rankBody.innerHTML = '';

        if (!lista || !lista.length) {
            var trVazio = document.createElement('tr');
            var tdVazio = document.createElement('td');
            tdVazio.colSpan = 3;
            tdVazio.className = 'loading-cell';
            tdVazio.textContent = 'Nenhuma pontuação gravada ainda. Jogue para ser o 1º!';
            trVazio.appendChild(tdVazio);
            el.rankBody.appendChild(trVazio);
            return;
        }

        lista.forEach(function (item, i) {
            var tr = document.createElement('tr');
            if (destaqueId && Number(item.id) === Number(destaqueId)) tr.className = 'destaque';

            var tdPos = document.createElement('td');
            tdPos.className = 'ranking-pos';
            tdPos.textContent = rotuloPosicao(i);

            var tdNome = document.createElement('td');
            var forte = document.createElement('strong');
            forte.textContent = item.nome;          // textContent: seguro contra HTML injetado
            tdNome.appendChild(forte);

            var tdPts = document.createElement('td');
            tdPts.textContent = Number(item.pontos) + ' pts';

            tr.appendChild(tdPos);
            tr.appendChild(tdNome);
            tr.appendChild(tdPts);
            el.rankBody.appendChild(tr);
        });
    }

    function lerJson(resposta) {
        return resposta.text().then(function (texto) {
            try { return JSON.parse(texto); }
            catch (e) { throw new Error('resposta inválida do servidor'); }
        });
    }

    function carregarRanking() {
        return fetch('obter_ranking.php', { cache: 'no-store' })
            .then(lerJson)
            .then(function (dados) {
                if (dados.status !== 'success') throw new Error(dados.message || 'erro');
                marcarServidor(true);
                renderRanking(dados.ranking);
                return true;
            })
            .catch(function () {
                marcarServidor(false);
                return false;
            });
    }

    function definirStatusSalvar(texto, tipo) {
        el.saveMsg.textContent = texto;
        el.saveMsg.className = 'save-status' + (tipo ? ' ' + tipo : '');
    }

    function salvarPontuacao(partida) {
        if (partida.salvando || partida.salvo) return;
        partida.salvando = true;
        el.btnRetry.hidden = true;
        definirStatusSalvar('Salvando pontuação...', '');

        fetch('salvar_ranking.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: partida.nome, pontos: partida.pontos })
        })
            .then(function (resp) {
                return lerJson(resp).then(function (dados) {
                    if (!resp.ok || dados.status !== 'success') {
                        throw new Error(dados.message || ('erro ' + resp.status));
                    }
                    return dados;
                });
            })
            .then(function (dados) {
                partida.salvo = true;
                marcarServidor(true);
                renderRanking(dados.ranking, dados.id);

                if (run !== partida) return;   // jogador já começou outra partida
                definirStatusSalvar('Pontuação salva no ranking!', 'ok');

                var pos = -1;
                (dados.ranking || []).forEach(function (r, i) {
                    if (Number(r.id) === Number(dados.id)) pos = i;
                });
                if (partida.pontos > 0 && pos === 0) {
                    el.overTitle.textContent = 'NOVO RECORDE! 🎉';
                    el.overTitle.classList.add('vitoria');
                } else if (partida.pontos > 0 && pos > 0) {
                    el.overTitle.textContent = 'VOCÊ ENTROU NO TOP 10!';
                    el.overTitle.classList.add('vitoria');
                }
            })
            .catch(function (err) {
                if (partida.salvo) { console.error(err); return; }   // salvou, mas falhou ao desenhar
                marcarServidor(false);
                if (run !== partida) return;
                definirStatusSalvar('Não foi possível salvar: ' + err.message, 'erro');
                el.btnRetry.hidden = false;
            })
            .then(function () { partida.salvando = false; });
    }

    /* ---------------------------------------------------------
       TELAS (modais)
       --------------------------------------------------------- */
    function abrirModal(m)  { m.classList.add('active'); }
    function fecharModal(m) { m.classList.remove('active'); }

    // 'fim' = tela de Game Over | 'ranking' = só a tabela, aberta pelo menu
    function configurarModalFinal(modo) {
        var soRanking = (modo === 'ranking');
        el.scoreBox.hidden   = soRanking;
        el.btnRestart.hidden = soRanking;
        el.btnTrocar.hidden  = soRanking;
        el.btnVoltar.hidden  = !soRanking;
        el.overTitle.classList.remove('vitoria');
        if (soRanking) el.overTitle.textContent = 'RANKING';
    }

    function mostrarMenu() {
        estado = 'menu';
        limparEntidades();
        el.personagem.style.transform = '';
        trocarSprite('1');
        el.container.classList.add('parado');
        fecharModal(el.overModal);
        abrirModal(el.startModal);
        el.inputNome.focus();
    }

    /* ---------------------------------------------------------
       PARTIDA
       --------------------------------------------------------- */
    function limparEntidades() {
        var itens = el.board.querySelectorAll('.pipe, .moeda, .ponto-flutuante');
        for (var i = 0; i < itens.length; i++) itens[i].remove();
    }

    function novaPartida() {
        return {
            nome: jogador.nome,
            y: 0, vy: 0, noChao: true, buffer: 0,
            pontos: 0, moedas: 0,
            tempo: 0, velocidade: CFG.velInicial, distancia: 0,
            animT: 0,
            proxSpawn: 0, padroes: 0,
            canos: [], moedasLista: [],
            ultimo: 0, raf: 0,
            salvando: false, salvo: false
        };
    }

    function atualizarHud() {
        el.hudPontos.textContent = run.pontos;
        el.hudMoedas.textContent = run.moedas;
    }

    function iniciar(nome, personagem) {
        if (run && run.raf) cancelAnimationFrame(run.raf);

        jogador.nome = nome;
        jogador.personagem = PERSONAGENS[personagem] ? personagem : PERSONAGEM_PADRAO;
        guardar('nj_nome', jogador.nome);
        guardar('nj_personagem', jogador.personagem);

        el.hudNome.textContent = jogador.nome;
        limparEntidades();
        run = novaPartida();
        atualizarHud();
        trocarSprite('1');

        el.jumpTip.classList.remove('oculta');
        fecharModal(el.startModal);
        fecharModal(el.overModal);
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

        el.container.classList.remove('parado');
        estado = 'jogando';
        run.raf = requestAnimationFrame(loop);
    }

    function pular() {
        if (estado !== 'jogando') return;
        el.jumpTip.classList.add('oculta');
        if (run.noChao) {
            run.vy = CFG.impulsoPulo;
            run.noChao = false;
        } else {
            run.buffer = CFG.bufferPulo;
        }
    }

    /* ---------- Criação de obstáculos e moedas ---------- */
    function criarCano(x) {
        var img = document.createElement('img');
        img.src = imagem('assets/pipe.png');
        img.className = 'pipe';
        img.alt = '';
        img.draggable = false;
        el.board.appendChild(img);
        run.canos.push({ el: img, x: x, passou: false });
    }

    function criarMoeda(x, y) {
        var box = document.createElement('div');
        box.className = 'moeda';
        var img = document.createElement('img');
        img.src = imagem('assets/moeda.png');
        img.alt = '';
        img.draggable = false;
        box.appendChild(img);
        el.board.appendChild(box);
        run.moedasLista.push({ el: box, x: x, y: y, coletada: false, tColeta: 0 });
    }

    // Cada "padrão" posiciona obstáculo/moedas a partir de x0 e devolve a largura ocupada
    function padraoCanoComArco(x0) {
        criarCano(x0);
        var centro = x0 + CFG.pipeW / 2;
        var t = CFG.moedaTam;
        // arco de 3 moedas logo acima do cano: recompensa quem pula na hora certa
        criarMoeda(centro - 52 - t / 2, 112);
        criarMoeda(centro - t / 2,      142);
        criarMoeda(centro + 52 - t / 2, 112);
        return CFG.pipeW + 60;
    }

    function padraoFileiraNoChao(x0) {
        for (var i = 0; i < 4; i++) criarMoeda(x0 + i * 48, 8);
        return 4 * 48;
    }

    function padraoArcoAlto(x0) {
        var alturas = [16, 70, 96, 70, 16];
        for (var i = 0; i < alturas.length; i++) criarMoeda(x0 + i * 52, alturas[i]);
        return alturas.length * 52;
    }

    function gerarPadrao() {
        var x0 = el.board.clientWidth + 40;
        var sorteio = Math.random();
        var largura;

        if (run.padroes === 0 || sorteio < 0.6) largura = padraoCanoComArco(x0);
        else if (sorteio < 0.8)                 largura = padraoFileiraNoChao(x0);
        else                                    largura = padraoArcoAlto(x0);

        run.padroes++;
        // distância até o próximo padrão cresce com a velocidade (tempo de reação constante)
        run.proxSpawn = largura + run.velocidade * aleatorio(1.25, 1.9);
    }

    /* ---------- Colisões ---------- */
    function colide(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x &&
               a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function caixaPlayer() {
        return {
            x: CFG.playerX + CFG.hitPlayerLado,
            y: run.y + CFG.hitPlayerBaixo,
            w: CFG.playerW - CFG.hitPlayerLado * 2,
            h: CFG.playerH - CFG.hitPlayerBaixo - CFG.hitPlayerCima
        };
    }

    function caixaCano(c) {
        return {
            x: c.x + CFG.hitPipeLado,
            y: 0,
            w: CFG.pipeW - CFG.hitPipeLado * 2,
            h: CFG.pipeH - CFG.hitPipeTopo
        };
    }

    function caixaMoeda(m) {
        return {
            x: m.x + CFG.hitMoedaMargem,
            y: m.y + CFG.hitMoedaMargem,
            w: CFG.moedaTam - CFG.hitMoedaMargem * 2,
            h: CFG.moedaTam - CFG.hitMoedaMargem * 2
        };
    }

    function pontoFlutuante(x, y, texto) {
        var s = document.createElement('span');
        s.className = 'ponto-flutuante';
        s.textContent = texto;
        s.style.left = x + 'px';
        s.style.marginBottom = y + 'px';
        el.board.appendChild(s);
        setTimeout(function () { s.remove(); }, 750);
    }

    function coletarMoeda(m) {
        if (m.coletada) return;      // garante que a moeda só conta uma vez
        m.coletada = true;
        m.el.classList.add('coletada');
        run.moedas += 1;
        run.pontos += CFG.pontosMoeda;
        pontoFlutuante(m.x, m.y, '+' + CFG.pontosMoeda);
        atualizarHud();
    }

    /* ---------- Atualização por quadro ---------- */
    function atualizar(dt) {
        var i;

        run.tempo += dt;

        // CÁLCULO DA VELOCIDADE: aumenta gradualmente com o TEMPO + BÔNUS MODERADO DE MOEDAS
        run.velocidade = Math.min(
            CFG.velMaxima, 
            CFG.velInicial + (CFG.velAceleracao * run.tempo) + (run.moedas * CFG.velBonusMoeda)
        );

        var dx = run.velocidade * dt;
        run.distancia += dx;

        // Física do pulo
        if (!run.noChao) {
            run.vy -= CFG.gravidade * dt;
            run.y += run.vy * dt;
            if (run.y <= 0) {
                run.y = 0;
                run.vy = 0;
                run.noChao = true;
                if (run.buffer > 0) {          // pulo apertado um instante antes de pousar
                    run.vy = CFG.impulsoPulo;
                    run.noChao = false;
                }
            }
        }
        if (run.buffer > 0) run.buffer -= dt;

        // Novos obstáculos / moedas
        run.proxSpawn -= dx;
        if (run.proxSpawn <= 0) gerarPadrao();

        // Movimento do mundo
        for (i = 0; i < run.canos.length; i++) run.canos[i].x -= dx;
        for (i = 0; i < run.moedasLista.length; i++) run.moedasLista[i].x -= dx;

        // Obstáculos: pontua ao passar, detecta batida
        var player = caixaPlayer();
        for (i = 0; i < run.canos.length; i++) {
            var c = run.canos[i];
            if (!c.passou && c.x + CFG.pipeW < CFG.playerX) {
                c.passou = true;
                run.pontos += CFG.pontosObstaculo;
                atualizarHud();
            }
            if (colide(player, caixaCano(c))) {
                fimDeJogo();
                return;
            }
        }

        // Moedas
        for (i = 0; i < run.moedasLista.length; i++) {
            var m = run.moedasLista[i];
            if (m.coletada) {
                m.tColeta += dt;
            } else if (colide(player, caixaMoeda(m))) {
                coletarMoeda(m);
            }
        }

        // Remove o que saiu da tela (ou moedas já coletadas há 0,35 s)
        run.canos = run.canos.filter(function (c) {
            if (c.x < -CFG.pipeW - 20) { c.el.remove(); return false; }
            return true;
        });
        run.moedasLista = run.moedasLista.filter(function (m) {
            if (m.x < -CFG.moedaTam - 20 || (m.coletada && m.tColeta > 0.35)) {
                m.el.remove();
                return false;
            }
            return true;
        });

        // Animação do personagem
        run.animT += dt;
        if (!run.noChao) trocarSprite('pulo');
        else trocarSprite(Math.floor(run.animT / 0.12) % 2 === 0 ? '1' : '2');
    }

    function desenhar() {
        var i;
        el.personagem.style.transform = 'translate3d(0,' + (-run.y).toFixed(1) + 'px,0)';
        for (i = 0; i < run.canos.length; i++) {
            run.canos[i].el.style.transform = 'translate3d(' + run.canos[i].x.toFixed(1) + 'px,0,0)';
        }
        for (i = 0; i < run.moedasLista.length; i++) {
            var m = run.moedasLista[i];
            m.el.style.transform = 'translate3d(' + m.x.toFixed(1) + 'px,' + (-m.y) + 'px,0)';
        }
        el.chao.style.backgroundPositionX = (-(run.distancia % 96)).toFixed(1) + 'px';
    }

    function loop(agora) {
        if (estado !== 'jogando') return;
        if (!run.ultimo) run.ultimo = agora;
        var dt = Math.min((agora - run.ultimo) / 1000, 0.033);
        run.ultimo = agora;

        atualizar(dt);
        if (estado !== 'jogando') return;      // bateu neste quadro
        desenhar();
        run.raf = requestAnimationFrame(loop);
    }

    /* ---------- Fim de jogo ---------- */
    function fimDeJogo() {
        estado = 'fim';
        cancelAnimationFrame(run.raf);
        el.container.classList.add('parado');
        desenhar();

        var partida = run;
        el.finalPontos.textContent = partida.pontos;
        el.finalMoedas.textContent = partida.moedas;
        configurarModalFinal('fim');
        el.overTitle.textContent = 'GAME OVER';
        el.btnRetry.hidden = true;
        definirStatusSalvar('Salvando pontuação...', '');
        salvarPontuacao(partida);

        // pequena pausa para o jogador ver onde bateu
        setTimeout(function () {
            if (run !== partida || estado !== 'fim') return;
            abrirModal(el.overModal);
            setTimeout(function () {
                if (run === partida && estado === 'fim') el.btnRestart.focus();
            }, 600);
        }, 450);
    }

    /* ---------------------------------------------------------
       EVENTOS
       --------------------------------------------------------- */
    // Teclado: ESPAÇO, seta para cima ou W
    document.addEventListener('keydown', function (e) {
        if (estado !== 'jogando') return;
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            e.preventDefault();                 // impede rolar a página
            if (!e.repeat) pular();
        }
    });

    // Mouse / toque no cenário
    el.board.addEventListener('pointerdown', function (e) {
        if (estado !== 'jogando') return;
        e.preventDefault();
        pular();
    });

    // Escolha de personagem: mostra a selecionada no cenário
    el.picker.addEventListener('change', function (e) {
        if (e.target && e.target.name === 'personagem' && PERSONAGENS[e.target.value]) {
            jogador.personagem = e.target.value;
            trocarSprite('1');
        }
    });

    // INICIAR JOGO
    el.startForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nome = el.inputNome.value.trim();
        if (!nome) {
            el.inputNome.value = '';
            el.inputNome.reportValidity();
            return;
        }
        var marcado = el.startForm.querySelector('input[name="personagem"]:checked');
        iniciar(nome, marcado ? marcado.value : PERSONAGEM_PADRAO);
    });

    // VER RANKING (a partir do menu)
    el.btnVerRank.addEventListener('click', function () {
        configurarModalFinal('ranking');
        fecharModal(el.startModal);
        abrirModal(el.overModal);
        carregarRanking();
    });

    el.btnVoltar.addEventListener('click', mostrarMenu);

    // JOGAR NOVAMENTE (mesmo jogador e personagem)
    el.btnRestart.addEventListener('click', function () {
        iniciar(jogador.nome, jogador.personagem);
    });

    // TROCAR JOGADOR (volta ao menu)
    el.btnTrocar.addEventListener('click', mostrarMenu);

    // Tentar salvar de novo após uma falha
    el.btnRetry.addEventListener('click', function () {
        if (run && estado === 'fim') salvarPontuacao(run);
    });

    /* ---------------------------------------------------------
       INICIALIZAÇÃO
       --------------------------------------------------------- */
    (function init() {
        // Troca as imagens do HTML pelas embutidas (evita imagem quebrada / só o texto "alt")
        var imgs = document.querySelectorAll('img[src^="assets/"]');
        for (var k = 0; k < imgs.length; k++) {
            imgs[k].src = imagem(imgs[k].getAttribute('src'));
        }
        el.chao.style.backgroundImage = 'url("' + imagem('assets/chao.png') + '")';
        var icone = document.querySelector('link[rel="icon"]');
        if (icone) icone.href = imagem('assets/moeda.png');

        var nomeSalvo = ler('nj_nome');
        if (nomeSalvo) el.inputNome.value = nomeSalvo.slice(0, 30);

        var persSalvo = ler('nj_personagem');
        if (!PERSONAGENS[persSalvo]) persSalvo = PERSONAGEM_PADRAO;
        var radio = el.startForm.querySelector('input[name="personagem"][value="' + persSalvo + '"]');
        if (radio) radio.checked = true;
        jogador.personagem = persSalvo;
        trocarSprite('1');

        el.container.classList.add('parado');   // nuvens paradas até começar
        carregarRanking();                      // atualiza a bolinha de status e a tabela
    })();
})();