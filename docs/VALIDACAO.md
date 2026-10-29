# Roteiro do multiplayer hospedado

Execute depois de configurar um projeto Supabase novo. Não considere testes do motor/PGlite como validação de WebSocket ou de dispositivos reais.

1. Abra a aplicação em três navegadores/perfis independentes (idealmente, um computador e dois celulares). Anote versões dos navegadores, data e URL da prévia.
2. A crie a sala com apelido fictício e avatar. B entre pelo link; C pelo código. Todos devem ver os três participantes.
3. A selecione pacotes, meta de 5 e modo clássico. Crie, edite e desative uma carta própria, ative outra e inicie.
4. Nas ferramentas de rede de cada perfil, examine o retorno da RPC. Só a mão da identidade atual deve ter dez cartas; outras mãos devem estar vazias. Tabelas privadas devem negar SELECT. Nunca use service_role nesse teste.
5. O juiz não pode enviar. B/C escolham e confirmem respostas; antes da revelação, nenhum retorno deve conter o texto enviado pelo outro jogador. Tentar repetir envio deve falhar sem duplicação.
6. Em uma pergunta dupla, selecione duas cartas distintas na ordem desejada. Confirme que a revelação preserva essa ordem e que uma só carta/ID repetido é rejeitado no servidor.
7. Revele e navegue pelas respostas. A autoria deve estar vazia até a decisão. Escolha uma, confira um único ponto e o autor revelado. Tentar escolher novamente não pode dar outro ponto.
8. Avance: mãos voltam a dez, juiz muda e placar permanece. Continue até alguém atingir cinco. Confira a tela final e bloqueio de ações da rodada anterior.
9. Em outra sala, teste Democracia Duvidosa: ninguém vota em si mesmo ou duas vezes. O placar só muda após todos votarem. Um empate segue a ordem aleatória já fixada dos envios.
10. Envie reações em um celular. Os outros devem recebê-las. Duas reações da mesma pessoa em menos de dois segundos devem ser rejeitadas.
11. Atualize a página de um jogador: mesmo assento, mesma mão e sem duplicação. Feche o navegador do anfitrião por mais de 90 segundos; outro deve assumir. Faça o mesmo com o juiz e confira reinício sem perda das mãos.
12. Remova um ausente pela interface do anfitrião. Com só duas pessoas restantes, a sala deve voltar ao lobby; o jogador removido não deve continuar recebendo estado privado.
13. Interrompa o WebSocket e confira atualização pelo fallback de cinco segundos. Recupere a rede e confira o estado oficial, sem pontos duplicados.
14. Em uma sala com mais pessoas, envie respostas/votos quase simultaneamente. Confirme uma submissão por identidade e um ponto por rodada. Repita entrada até o limite de 12 e confirme rejeição da 13ª.

Registre os resultados reais, falhas e correções no PR. Não marque estes itens como aprovados sem executá-los no projeto hospedado.
