# Auditoria e entrega V2 — 29/10/2026

## Integração confirmada

[PR #1](https://github.com/KvzinNcpx7/deu-merda/pull/1) integrado com merge commit `a835f4f26ac41f90383e3c403c7c596dbf7913d5`. A origem `feat/deu-merda-mvp`, em `9207b66c506c4673e00a75f50c142b60bbba8799`, permanece disponível. Antes do merge foram repetidos `npm ci`, 34 testes, build, formatação e oito E2E. A main recebeu conteúdo idêntico ao MVP, sem divergências ou perda de arquivos. A V2 foi criada a partir desse merge, em `feat/deu-merda-v2`.

## Problemas encontrados e correções

| Problema observado                                                      | Correção                                                                                                | Evidência                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Navegação da revelação era estado React individual                      | Cursor na sala, ação RPC `browse`, juiz e fase validados, índice inteiro e limitado                     | Testes locais, três identidades em PGlite e E2E desktop/mobile         |
| Ação atrasada podia chegar em outra rodada                              | Cliente envia `expectedRound`; comparação ocorre sob lock PostgreSQL                                    | Regressões do motor e RPC                                              |
| Refresh antigo podia mostrar erro depois de outra ação                  | Mesmo controle de época usado para respostas e erros                                                    | Revisão do fluxo assíncrono; não foi simulado atraso em Auth hospedado |
| Mudança de resposta podia deixar confirmação referindo-se a outra carta | Fechar confirmação quando cursor muda                                                                   | Revisão e E2E do fluxo de decisão                                      |
| Votação aguardava indefinidamente eleitor ausente                       | Concluir após todos os presentes votarem, com dois votos presentes no mínimo; ponto dentro da transação | Teste de ausência e consultas repetidas sem ponto duplicado            |
| Lacuna própria com nove sublinhados era aceita como uma                 | Rejeitar sublinhados residuais em cartas próprias, nos dois motores                                     | Casos inválidos em motor e banco                                       |
| Resultado mostrava cartas separadas sem frase montada                   | Frase completa na revelação, resultado e tela final, renderizada como texto                             | Teste de montagem e E2E sem lacunas restantes                          |
| Gerador podia sobrescrever a migração editorial 004                     | Exigir caminho de migração nova e recusar destino existente                                             | Tentativa de sobrescrever 004 rejeitada; originais sem diff            |
| Seleção das cartas sem estado acessível                                 | `aria-pressed` nas cartas selecionáveis e `aria-current` no cursor                                      | Revisão de componentes; fluxos Chromium                                |

## Áreas verificadas e limites

Foram examinados motor, contrato de tipos, cliente Auth/RPC, componentes, fluxo de sincronização do App, CSS responsivo/movimento reduzido, catálogo, migrações e workflows. Testes existentes cobrem mãos de dez IDs únicos, 3–12 jogadores, lacunas duplas, juiz, pontuação/rotação/reposição, voto próprio/repetido, ausência/reconexão, anfitrião, cartas próprias e limites por identidade. Foram preservados layout, cores, fontes, animações, modos e navegação geral.

RLS, grants e funções internas negam acesso direto aos jogadores; RPC deriva identidade de `auth.uid()`. A visão filtrada entrega somente a mão atual e omite perguntas futuras, votos e autoria durante revelação. Os sinais Realtime levam código/revisão, sem mãos ou textos. Ações da mesma sala usam `FOR UPDATE`; isso foi revisado e exercitado sequencialmente no banco embarcado, mas **não houve carga concorrente em conexões PostgreSQL independentes**. Testes PGlite usam identidade de papel/JWT simulada no banco e não validam JWTs emitidos pelo Auth real.

Não foram encontrados arquivos `.env` reais na árvore versionada atual, nem padrões de chaves privadas na busca realizada. Só há `.env.example` com placeholders. Isso não é uma investigação de todo o histórico de segredos. `npm audit` retornou zero vulnerabilidades conhecidas nesta execução; dependências existentes foram mantidas.

A base Vite continua `/deu-merda/`; convites usam `?sala=` sob essa base. Build e testes exercitam essa rota. O workflow CI agora também valida catálogo e formatação. Pages continua exclusivamente manual e não foi executado. Hospedagem GitHub Pages e seus recursos reais ainda não foram exercitados remotamente.

## Catálogo final

| Pacote              | Respostas | Simples | Duplas | Total |
| ------------------- | --------: | ------: | -----: | ----: |
| 5ª série sem freio  |        67 |      25 |      5 |    97 |
| Brasil insano       |        67 |      25 |      5 |    97 |
| Resenha escolar     |        67 |      25 |      5 |    97 |
| Economia do caos    |        67 |      25 |      5 |    97 |
| Memes lendários     |        66 |      25 |      5 |    96 |
| Humor Ácido e Tabus |        66 |      25 |      5 |    96 |
| Total               |       400 |     150 |     30 |   580 |

Foram acrescentadas 220 cartas. Os 360 IDs, textos e metadados anteriores foram comparados e preservados. Tabus segue desativado por padrão. A validação confere lacunas, IDs/textos duplicados, contagens, metadados e distribuição temática; testes também verificam similaridade lexical e variedade de começos. A amostra reproduzível de 48 combinações foi atualizada. Avaliação coletiva de humor continua recomendada; não se atribui aos testes uma medida de graça. O vídeo indicado não foi acessado nesta execução.

## Estado real do multiplayer e Supabase

Implementação preparada para configurar **projeto novo e exclusivo**. Nenhum projeto foi criado, vinculado ou modificado; nenhum backend BOSTA3 foi usado. Não há credenciais hospedadas disponíveis nesta execução. **Não foi validada partida entre dispositivos, Supabase Auth/PostgREST hospedados ou WebSocket Realtime real.** Não considerar o jogo liberado para amigos apenas pelos testes locais.

[SUPABASE.md](SUPABASE.md) descreve criação do projeto, Auth anônimo, sete migrações, publicação apenas de `room_signals`, schema `private` fora da API e variáveis públicas. Se já instalou até 004, aplicar somente 005, 006 e 007. As quatro migrações anteriores foram preservadas byte a byte; testes verificam que as novas não alteram JSON de partidas existentes.

Para jogar com amigos depois da configuração: iniciar uma prévia acessível com `npm run dev -- --host 0.0.0.0`, abrir `/deu-merda/`, criar sala e compartilhar o convite com dois perfis/dispositivos independentes. Todos devem usar o mesmo bundle/backend. Seguir [VALIDACAO.md](VALIDACAO.md) antes de aprovar publicação. Somente URL e chave pública publishable/anon podem aparecer no frontend; nunca `service_role`.

## Validação desta execução

- `npm ci`: concluído nas duas etapas.
- MVP: 34 testes e oito E2E aprovados; build e formatação aprovados.
- V2: 42 testes aprovados, incluindo SQL real em PGlite; build aprovado.
- Catálogo: 580 cartas, contagens 400/150/30, sem erro na validação.
- E2E V2: dez aprovados, em Chromium desktop e viewport mobile.
- `npm run format:check`: aprovado.
- `npm audit`: zero vulnerabilidades conhecidas.
- E2E usou Chromium do sistema por `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`; o CDN Playwright foi bloqueado pela política de rede. Não se tratou de execução em iPhone físico.

## Pendências e publicação futura

Caos, Relâmpago e Torneio foram adiados para estabilizar o multiplayer; nenhum botão sem implementação foi acrescentado. Permanecem para uma próxima etapa: validação hospedada com três identidades, concorrência real sob PostgREST, teste físico mobile, configuração/ensaio Pages, CAPTCHA para abertura ampla, retenção de salas/contadores, descarte permanente e recuperação de identidade entre dispositivos.

No modo democracia, menos de dois votos presentes mantém a espera; o anfitrião pode remover ausentes (a saída durante revelação reinicia rodada conforme regra existente). Quedas do juiz reiniciam rodada sem gastar mãos. Sinais em ping não são emitidos, mas o fallback recupera o resultado em até cinco segundos. Esses compromissos devem ser exercitados com amigos antes da publicação.

Após revisar e integrar a V2 manualmente, configurar as variáveis públicas no GitHub e executar a validação hospedada. Só então, por decisão do proprietário, habilitar Pages via Actions e iniciar o workflow manual. URL prevista: `https://kvzinncpx7.github.io/deu-merda/`. Nenhum deploy foi realizado nesta tarefa. O segundo PR deve permanecer aberto para revisão, sem merge automático.
