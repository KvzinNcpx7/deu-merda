# Estado desta entrega — 29/10/2026

Branch: `feat/deu-merda-mvp`. Alterações locais para revisão; sem merge, push ou publicação realizados pelo agente.

## Verificações executadas

| Comando                  | Resultado observado                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`               | 34 testes aprovados (motor local e migrações/RPC/RLS em PostgreSQL PGlite)                                                                |
| `npm run build`          | TypeScript e build Vite aprovados, base `/deu-merda/`                                                                                     |
| `npm run test:e2e`       | 8 testes aprovados em Chromium: navegação, partida local completa, cartas próprias e seleção de tabus/temas, em desktop e viewport mobile |
| `npx prettier --check .` | Arquivos verificados aprovados                                                                                                            |
| `git diff --check`       | Sem erros de espaços no diff                                                                                                              |

O teste de partida local percorreu distribuição, envio, revelação, decisão, reposição, rotação do juiz, pontuação, vitória e recuperação do save. O teste de banco executou as migrações e ações como usuários distintos do papel `authenticated`, validando também leituras negadas e o limite de 12 participantes.

A viewport mobile foi emulada no Chromium. Não representa teste físico em um iPhone. Os testes de banco não incluem Supabase Auth hospedado, PostgREST hospedado ou Realtime WebSocket.

## Disponível agora

Demonstração no mesmo dispositivo, catálogo revisado de 360 cartas em seis pacotes, modo clássico e democracia, interface responsiva, cartas próprias com edição/ativação, reações, sons, ranking e resultado final. A implementação online tem RPC transacional, visões privadas, RLS, Auth anônimo, assinatura Realtime, fallback e reconexão.

## Ação externa necessária

Criar um projeto Supabase novo exclusivo, aplicar as migrações, habilitar Auth anônimo e Realtime, preencher as variáveis públicas e executar o roteiro em `VALIDACAO.md`. Não foram criadas credenciais nem reutilizado o backend da BOSTA3. Não foi validada uma partida entre dispositivos diferentes.

## Fora desta entrega

Caos, Relâmpago, Torneio, catálogo ampliado de 580 cartas, histórico permanente, descarte separado, limpeza agendada de salas, CAPTCHA integrado e recuperação de identidade entre dispositivos. Consulte o README e `ARQUITETURA.md` para os limites atuais.

## Reformulação do baralho

Catálogo atualizado para 360 cartas autorais em seis pacotes, com Humor Ácido e Tabus desativado por padrão e filtros por tema no lobby. A migração 003 preserva as salas e estende a seleção no servidor. A 004 refina 51 cartas por ID sem modificar partidas em andamento; essa preservação foi verificada em banco. Veja [CURADORIA.md](CURADORIA.md) e [COMBINACOES.md](COMBINACOES.md). Nenhuma migração foi aplicada remotamente e não houve publicação nesta revisão.
