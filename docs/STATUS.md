# Estado verificado — curadoria V3 — 29/10/2026

A main contém a V2 integrada pelo PR #2, no commit `d7375bcb5d5f1b2f810685162e701715ac6a9a2e`. A V3 parte dessa main na branch `feat/curadoria-humor-v3`. Nenhuma alteração desta tarefa foi feita diretamente na main; nenhum merge ou publicação foi realizado.

## Catálogo V3

- 580 cartas: 400 respostas, 150 perguntas simples e 30 duplas, nos seis pacotes existentes.
- 140 mantidas, 280 ajustadas, 160 substituídas; zero adicionadas/removidas; todos os IDs preservados.
- 333 respostas e 107 perguntas tiveram texto/metadados revistos. Média das respostas de 7,615 para 5,027 palavras; 54 de até três palavras e 382 de até sete.
- 120 combinações entre pacotes geradas e lidas: 14 fortes, 51 medianas e 55 fracas como juízo editorial, sem teste de risadas com pessoas.
- [Curadoria](CURADORIA.md), [registro das 580 decisões](editorial/REVISAO-V3.md), [120 avaliações](editorial/AVALIACAO-COMBINACOES-V3.md) e [20 combinações selecionadas](editorial/20-COMBINACOES-V3.md).

## Preservação

Interface, estilos, tipos do jogo, motor local, Auth, Realtime, RLS, RPCs, reconexão, modos e pontuação não foram modificados nesta V3. Tabus conserva o opt-in e aviso existentes. Nenhuma dependência foi alterada. As sete migrações anteriores estão intactas. A nova `202610290008_curadoria_v3.sql` atualiza somente o catálogo global, preservando o JSON de salas e os textos ativos.

## Validação

| Comando                | Resultado                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------- |
| npm ci                 | Concluído                                                                           |
| npm test               | 48 aprovados, incluindo contrato editorial e atualização de sala V2 ativa em PGlite |
| npm run build          | Aprovado                                                                            |
| npm run test:e2e       | 10 aprovados em Chromium, desktop e viewport mobile                                 |
| npm run format:check   | Aprovado                                                                            |
| npm run cards:validate | Aprovado: 580 e contagens 400/150/30                                                |
| npm run cards:sample   | 120 combinações únicas geradas                                                      |

Os testes não medem humor humano. PGlite não substitui Supabase Auth/PostgREST/Realtime hospedados; mobile E2E é viewport emulada, não dispositivo físico.

## Hospedagem e próximos passos

Na conversa anterior, o proprietário informou aplicar 001–007, habilitar Auth anônimo e configurar as variáveis públicas no GitHub. Mostrou o lobby de uma sala online criada após corrigir a URL base do Supabase. Isso confirma o fluxo de entrada/criação naquele teste manual; não demonstra partida completa com três identidades nem foi repetido por este agente na V3.

A migração 008 não foi aplicada no projeto remoto. Depois de revisar o PR V3: aplicar 008 no Supabase exclusivo do DEU MERDA!, conferir o catálogo, integrar o frontend aprovado e publicar manualmente; só então testar uma partida com três dispositivos/perfis conforme [VALIDACAO.md](VALIDACAO.md). Nenhum backend BOSTA3 foi usado. Não foram acessados ou alterados dados de salas hospedadas nesta revisão.

Permanecem pendentes sessões de humor com jogadores, análise de vídeo acessível, testes hospedados entre dispositivos/carga concorrente e modos Caos/Relâmpago/Torneio. Não houve expansão para 700: a prioridade desta entrega é a edição do conjunto existente.
