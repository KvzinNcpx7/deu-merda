# Humor Ácido e Tabus — V4

Base conferida: `main` no commit `425446a`, integração do PR #5. Branch de trabalho: `feat/humor-acido-v4`. Não houve edição direta da main, aplicação de SQL remoto, merge nem publicação nesta tarefa.

## Conteúdo entregue

| Catálogo                 | Antes | Depois |
| ------------------------ | ----: | -----: |
| Total                    |   607 |    727 |
| Respostas                |   427 |    507 |
| Perguntas simples        |   150 |    180 |
| Perguntas duplas         |    30 |     40 |
| Pacote ácido             |    96 |    216 |
| Respostas ácidas         |    66 |    146 |
| Perguntas ácidas simples |    25 |     55 |
| Perguntas ácidas duplas  |     5 |     15 |
| Resenha Escolar          |   124 |    124 |

Foram criadas **120 cartas novas**: 80 respostas, 30 perguntas simples e 10 duplas. Foram revistas **20 antigas**, todas ácidas: 16 respostas e quatro perguntas. Os IDs e metadados dessas revisões permanecem os mesmos. Nenhuma carta foi removida. As outras 587 cartas anteriores permanecem idênticas, incluindo integralmente as 124 escolares e as 27 adições do PR #5.

As novas respostas alternam medicina, morte, ditadores ridicularizados, religião fictícia, escatologia e situações brasileiras banais. Entre as 80 respostas, 44 têm de duas a cinco palavras e 36 têm de seis a nove; não foi necessário incluir histórias longas. A concisão é um controle editorial, não uma nota de humor. As cenas religiosas e históricas são caricaturas inventadas; não apresentam alegações sobre pessoas do ambiente escolar nem defendem regimes autoritários.

- [Catálogo completo, com as 727 cartas](DEU-MERDA-CARTAS.md).
- [As 20 revisões, com antes/depois e motivo](editorial/REVISAO-ACIDO-V4.md).
- [20 apostas de combinações, com frase completa e comentário](editorial/20-COMBINACOES-ACIDO-V4.md).

## Leitura das combinações

`npm run cards:sample` gera duas amostras independentes e reproduzíveis:

1. **120 cruzamentos dedicados ao ácido**, seed `0xac1d04`: 60 perguntas ácidas com respostas dos outros cinco pacotes e 60 perguntas dos outros pacotes com ao menos uma resposta ácida. São 80 simples e 40 duplas. Nas duplas, as três cartas são de pacotes distintos e as respostas conservam a ordem.
2. **120 casos gerais**, seed `0xdecaf`: 60 sem Tabus e 60 com os seis pacotes disponíveis, para conferir também a separação do opt-in.

A [amostra dedicada](editorial/AMOSTRA-ACIDO-V4.md) recebeu [parecer individual nos 120 casos](editorial/AVALIACAO-ACIDO-V4.md): **27 promissores, 50 médios e 43 fracos**. São julgamentos editoriais assistidos, sem sessão de jogo com público. Não medem taxa de riso nem demonstram superioridade experimental à versão anterior. Os relatórios históricos não foram sobrescritos.

Exemplos promissores do sorteio:

- **ACIDO-V4-041:** O prêmio principal do congresso de medicina era [Um desentupidor de estimação]. Contraste imediato entre prestígio científico e banheiro.
- **ACIDO-V4-083:** A direção achou [Caixão com travesseiro] no armário de troféus. Um objeto simples desloca o prestígio escolar para o macabro.
- **ACIDO-V4-115:** O corretor transformou uma declaração de amor em [Dívida de defunto]. Troca de tom curta e compreensível.

Exemplos fracos conservados no relatório:

- **ACIDO-V4-068:** A turma organizou uma vaquinha pra comprar [Mussolini barrado no próprio fã-clube]. A pergunta pede objeto; a cena de uma pessoa sendo barrada exige esforço sintático.
- **ACIDO-V4-110:** O tutorial ensinava [O potinho de fezes na marmita]. Eu consegui apenas [Uma vírgula no lugar errado]. Ensinar um potinho não equivale a ensinar uma ação; a segunda resposta dispersa o tema.
- **ACIDO-V4-118:** A mascote da escola foi substituída por [Herdar o papagaio fofoqueiro]. A resposta verbal não funciona bem como substituto nominal.

Não há garantia de encaixe perfeito entre qualquer par. As quatro perguntas antigas revistas ganharam estruturas de citação mais abertas; as novas misturam citações, objetos, ações e preparações curtas. Algumas respostas verbais permanecem para perguntas que as comportem. Não foram reescritas perguntas dos outros pacotes para esconder os casos fracos. O montador de frases existente corrige contrações de artigo na borda da lacuna; não é um analisador sintático e conserva a capitalização de fragmentos sem artigo inicial. As 20 apostas foram escolhidas intencionalmente e não são uma seleção estatística dos 120 sorteios.

## Regras, interface e dados

O pacote continua sendo o único `acido`, opcional e desativado inicialmente, com o aviso 18+ existente. O anfitrião mantém controle de seleção e filtros de tema. Nenhum componente visual, estilo, regra, contrato de RPC ou função SQL foi alterado. As contagens da interface já são calculadas pelo catálogo desde o PR #5.

A nova migração contém somente 140 upserts de conteúdo: 120 adições e 20 revisões autorizadas. Não altera RLS, grants, funções, sinais de salas ou tabelas de salas. Migrações 001–011 permanecem intactas.

Mãos, perguntas já armazenadas, placares e cartas próprias de salas não são reescritos pela migração. Reposição futura no servidor continua consultando o catálogo autorizado e os filtros; portanto pode usar adições quando houver reposição. Para testar a expansão completa, crie uma sala nova. O modo local conserva o JSON de sessões salvas; novas salas usam o novo catálogo.

## Verificação executada

| Comando                                                             | Resultado                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------- |
| `npm ci`                                                            | Concluído com o lockfile                                      |
| `npm test`                                                          | 66 testes aprovados em oito arquivos                          |
| `npm run build`                                                     | TypeScript e Vite concluídos                                  |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e` | 12 aprovados, desktop e celular                               |
| `npm run format:check`                                              | Aprovado                                                      |
| `npm run cards:validate`                                            | 727 IDs/textos únicos, 507/180/40 e metadados/lacunas válidos |
| `npm run cards:sample`                                              | 120 gerais + 120 cruzamentos com ácido gerados                |

A suíte SQL usa PostgreSQL embarcado (PGlite) com as migrações e a RPC reais. Confere paridade de todos os textos com o cliente, opt-in e temas, novas cartas acessíveis pela RPC, duas cartas distintas em ordem, cursor compartilhado, autoria oculta antes da decisão, mãos privadas e pontuação. Para provar disponibilidade sem depender da sorte, um teste limita temporariamente o catálogo de uma transação às respostas ácidas novas e desfaz a transação ao terminar.

Outro teste recompõe o catálogo 011, inicia uma sala ácida, mantém uma pergunta de texto antigo, concede um ponto pela decisão do juiz e aplica 012 duas vezes. O JSON inteiro da sala permanece idêntico, enquanto o catálogo passa à V4. Reconexão, privacidade da mão e rotação do juiz continuam funcionando. A cadeia histórica V2 → V3 → demonstrações → escolar → V4 também é exercitada. Os testes editoriais antigos consultam seus textos históricos; um contrato novo compara a V4 às 607 cartas anteriores para autorizar somente as 20 revisões ácidas.

O primeiro rascunho apresentou uma resposta duplicada do catálogo, identificada pelos validadores e substituída antes da versão final. O ambiente usa Chromium instalado no sistema para o comando E2E; a configuração existente já aceita esse caminho. Não houve teste contra o Supabase hospedado ou uma sessão real de múltiplos dispositivos nesta tarefa.

## Aplicar no Supabase hospedado

1. Revisar o PR e fazer merge apenas quando aprovado. Confirmar que o projeto **Deu-Merda** já recebeu as migrações até `202610290011_resenha_escolar.sql`; aplicar eventuais pendentes em ordem. Não usar o projeto da BOSTA3 nem recriar o banco.
2. Abrir o arquivo novo [`202610300012_humor_acido_v4.sql`](../supabase/migrations/202610300012_humor_acido_v4.sql), copiar o conteúdo inteiro e executar em **SQL Editor → New query → Run** do projeto existente. Não executar novamente 001–011 só para instalar a V4. Se houver erro, guardar a mensagem e corrigir antes de publicar.
3. Conferir:

```sql
select pick, count(*)
from private.cards
group by pick
order by pick;
-- 0 = 507; 1 = 180; 2 = 40

select pack, pick, count(*)
from private.cards
where pack in ('acido', 'escola')
group by pack, pick
order by pack, pick;
-- acido: 0 = 146; 1 = 55; 2 = 15
-- escola: 0 = 94; 1 = 25; 2 = 5
```

4. Executar manualmente o workflow de Pages na `main`, conservando as variáveis públicas do projeto. Não usar `/rest/v1/` em `VITE_SUPABASE_URL`.
5. Criar sala nova e conferir primeiro que Tabus começa desligado. Ativar como anfitrião, experimentar filtros e convidar duas pessoas em dispositivos ou perfis independentes. Testar uma pergunta dupla, a revelação anônima, escolha, placar e próximo juiz.

A migração é transacional e pode ser reaplicada sem duplicar IDs. Ela não foi aplicada ao projeto remoto por este PR e Pages não foi publicado automaticamente.

## Arquivos alterados

Catálogo e SQL:

- `src/data/cards.json`
- `supabase/migrations/202610300012_humor_acido_v4.sql`

Amostragem e validação:

- `scripts/sample-combinations.mjs`
- `scripts/validate-catalog.mjs`

Testes:

- `src/lib/acid-v4.test.ts`
- `src/lib/catalog.test.ts`
- `src/lib/demonstrations.test.ts`
- `src/lib/engine.test.ts`
- `src/lib/school.test.ts`
- `src/lib/server.test.ts`
- `e2e/game.spec.ts`

Documentação e evidências:

- `docs/HUMOR-ACIDO-V4.md`
- `docs/DEU-MERDA-CARTAS.md`
- `docs/COMBINACOES.md`
- `docs/STATUS.md`
- `docs/CURADORIA.md`
- `docs/SUPABASE.md`
- `docs/VALIDACAO.md`
- `README.md`
- `docs/editorial/CATALOGO-PRE-V4.json`
- `docs/editorial/REVISAO-ACIDO-V4.json`
- `docs/editorial/REVISAO-ACIDO-V4.md`
- `docs/editorial/AMOSTRA-V4-GERAL.json`
- `docs/editorial/AMOSTRA-ACIDO-V4.json`
- `docs/editorial/AMOSTRA-ACIDO-V4.md`
- `docs/editorial/AVALIACAO-ACIDO-V4.json`
- `docs/editorial/AVALIACAO-ACIDO-V4.md`
- `docs/editorial/20-COMBINACOES-ACIDO-V4.json`
- `docs/editorial/20-COMBINACOES-ACIDO-V4.md`
