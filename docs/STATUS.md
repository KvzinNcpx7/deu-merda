# Estado atual — Humor Ácido V4

Base `main` `425446a`, branch `feat/humor-acido-v4`. 120 adições e 20 revisões somente no ácido; 727 cartas totais, 216 ácidas. Resenha Escolar preservado integralmente. 66 testes, 12 E2E, build e validações aprovados. Migração nova 012, sem aplicação remota, merge ou publicação.

[Relatório completo, contagens, evidências e instalação](HUMOR-ACIDO-V4.md). [Todas as cartas](DEU-MERDA-CARTAS.md).

---

## Histórico anterior

# Estado verificado — revisão por demonstrações — 29/10/2026

Base: main `f977376`, com V3 integrada pelo PR #3. Desenvolvimento em `feat/revisao-demonstracoes-fdp`. Não houve alteração direta na main, merge, publicação ou aplicação de SQL remoto nesta tarefa.

## Entrega

- As 580 cartas foram reavaliadas: 465 mantidas e 115 revistas (56 respostas e 59 perguntas). Permanecem 400 respostas, 150 simples, 30 duplas e seis pacotes, com todos os IDs estáveis.
- Respostas de até três palavras: 54 → 81. Média: 5,0275 → 4,8575 palavras. Situações cotidianas substituem parte das abstrações da V3; alguns nonsense permanecem para contraste.
- Nova amostra de 120 combinações entre pacotes e leitura individual: 26 promissoras, 51 medianas, 43 fracas. Rótulos editoriais, sem teste com público e sem comparação experimental com a amostra anterior.
- Vazamento indireto corrigido: o status de quem enviou não segue mais a ordem das respostas anônimas. Cursor compartilhado, mãos privadas, autoria após decisão, ponto único, reposição e rotação conferidos em testes.
- Contrações na borda das lacunas melhoram a leitura, sem alterar textos armazenados ou o layout.

## Migrações

009 `anonymous_status`: visão filtrada, sem reescrever salas ou alterar regras.
010 `catalog_demonstracoes`: somente os registros do catálogo revistos.

001–008 preservadas byte a byte. Mãos, pergunta/fila, placar, respostas e cartas próprias de salas ativas mantêm os dados. Aplicar apenas as migrações pendentes, em ordem, depois de aprovação. O Supabase exclusivo já foi configurado pelo proprietário na conversa anterior; não houve acesso a dados de salas hospedadas nesta revisão.

## Validação

| Comando                | Resultado                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| npm ci                 | Concluído                                                                |
| npm test               | 54 aprovados, com contrato editorial e regressão do vazamento de autoria |
| npm run build          | Aprovado                                                                 |
| npm run cards:validate | Aprovado: 580, contagens 400/150/30                                      |
| npm run cards:sample   | 120 casos gerados                                                        |
| npm run format:check   | Aprovado                                                                 |
| npm run test:e2e       | 10 aprovados em desktop e viewport mobile                                |

E2E usa Chromium do sistema por `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`, em desktop e viewport mobile. PGlite simula as identidades no banco e não substitui Auth/PostgREST/Realtime hospedados. Não foi repetida partida com três dispositivos reais. Os testes não medem graça.

Relatório: [DEMONSTRACOES.md](DEMONSTRACOES.md). Decisões das 580 cartas e leitura das 120 combinações estão vinculadas ali. Pendências: revisão do proprietário, aplicação das migrações aprovadas e teste social/hospedado completo. Nenhum deploy é automático.
