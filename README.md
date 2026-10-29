# 💀 DEU MERDA!

**A amizade acaba, mas a resenha continua.**

Party game original em português brasileiro: complete perguntas com as piores cartas da sua mão. React + TypeScript + Vite no navegador, PostgreSQL/Supabase como autoridade da partida online.

O MVP foi integrado à `main` pelo PR #1. A V2 está em `feat/deu-merda-v2` para revisão; sem publicação automática ou credenciais incluídas. Veja [docs/STATUS.md](docs/STATUS.md).

## Abrir no GitHub Codespaces

Use Node **22.12 ou superior** (Node 24 também funciona).

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

Na aba **Ports** do VS Code, abra a porta **5173** no navegador e acrescente `/deu-merda/` ao endereço. Exemplo: `https://SEU-CODESPACE-5173.app.github.dev/deu-merda/`. Se a porta estiver ocupada, use o número indicado pelo Vite.

Sem `.env`, o jogo abre normalmente. Clique em **“Teste no mesmo dispositivo”** para jogar uma partida com três pessoas, alternando o assento no seletor roxo. São três pessoas reais revezando um único navegador, sem bots nem multiplayer simulado. As mãos ficam no armazenamento desse navegador; esse modo não oferece isolamento de segurança entre os assentos. O botão **“Continuar demonstração salva”** recupera a partida local depois de atualizar a página.

Para amigos em dispositivos diferentes, configure o Supabase antes. Compartilhar somente a prévia, sem backend configurado, não habilita o online. Para acessar um Codespace privado, convidados precisam de autorização do GitHub; a hospedagem futura no Pages evita essa dependência.

## O que está implementado

- Criação e entrada por código/link, apelido e avatar, sem e-mail, por Supabase Auth anônimo.
- Lobby para **3–12 jogadores**, seleção de pacotes e vitória por **5, 7 ou 10 pontos**.
- Dez respostas privadas por pessoa, perguntas simples e duplas com seleção ordenada.
- Juiz sem direito a enviar, envio único, respostas anônimas, revelação navegável, escolha do vencedor, ponto, reposição das cartas, juiz rotativo e resultado final.
- **Clássico** e **Democracia Duvidosa**: um voto por participante, bloqueio de voto próprio, desempate pela ordem aleatória das respostas.
- Reconexão da identidade no mesmo navegador, assentos reservados, transferência do anfitrião após 90 segundos de ausência e recuperação de juiz ausente. Remoção de desconectados pelo anfitrião.
- Cartas próprias da sala: criar, editar, excluir e ativar/desativar antes da partida.
- Reações sincronizadas e predefinidas, com intervalo de dois segundos por pessoa.
- Interface responsiva, mão horizontal no celular, placar, confirmações, erros, sons sintetizados com botão de silenciar e animações que respeitam `prefers-reduced-motion`.
- **580 cartas autorais**: 150 perguntas simples, 30 duplas, 400 respostas; os seis pacotes anteriores foram preservados. Humor Ácido e Tabus é opcional e começa desativado; o anfitrião também pode excluir temas no lobby.
- Migrações, RLS, RPC transacional, testes de regras e banco, testes de navegador e workflow manual para Pages.

Personagens escolares são fictícios. Economia do Caos é sátira de um multiverso imaginário. Não há chat livre. As cartas são renderizadas como texto, nunca como HTML.

## Habilitar o multiplayer

Siga [docs/SUPABASE.md](docs/SUPABASE.md) para criar um projeto **novo, exclusivo deste jogo**, ativar Auth anônimo, executar as sete migrações e configurar Realtime.

```bash
cp .env.example .env
```

Preencha somente os valores públicos do novo projeto:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO-NOVO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
```

A chave pública legada `anon` também pode ser usada no lugar da publishable. **Nunca** use `service_role`, chave secreta, senha do banco ou token de gerenciamento em variáveis `VITE_*`. Elas são incluídas no JavaScript público. Reinicie o Vite após editar `.env`.

Cada pessoa usa seu próprio navegador ou dispositivo. Abas normais do mesmo navegador compartilham a identidade anônima e, portanto, o mesmo assento. Use perfis independentes para testar vários jogadores no mesmo computador.

## Validação

```bash
npm run cards:validate # integridade e contagens do catálogo
npm test            # Vitest: motor local + PostgreSQL embarcado com migrações reais
npm run test:db     # somente integração de banco
npm run build      # TypeScript + build para /deu-merda/
npm run preview    # prévia do build na porta 4173
```

Para os testes de interface:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

O Playwright cobre navegação e uma partida local inteira em Chromium desktop e viewport mobile. O PostgreSQL embarcado usa PGlite, com `auth.uid()` controlado pelos testes e execução como papel `authenticated`, inclusive para testar os acessos negados. Não usa dados reais, Docker ou credenciais.

Esses testes **não comprovam** funcionamento do Supabase hospedado, do WebSocket Realtime nem de uma partida entre celulares diferentes. Execute o roteiro em [docs/VALIDACAO.md](docs/VALIDACAO.md) depois da configuração. Detalhes das transações e permissões: [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Arquivos principais

| Caminho                 | Responsabilidade                                        |
| ----------------------- | ------------------------------------------------------- |
| `src/App.tsx`           | Fluxos de entrada, lobby e partida                      |
| `src/components/ui.tsx` | Logo, cartas, pergunta, botões e confetes               |
| `src/style.css`         | Identidade visual, responsividade e animações           |
| `src/lib/engine.ts`     | Motor da demonstração local, visões privadas e saves v1 |
| `src/lib/client.ts`     | Auth anônimo e chamadas Supabase                        |
| `src/lib/types.ts`      | Contratos da partida                                    |
| `src/data/`             | Catálogo original e metadados dos seis pacotes          |
| `src/lib/*.test.ts`     | Regras, segurança e integração PostgreSQL               |
| `e2e/`                  | Testes de interface com Playwright                      |
| `supabase/migrations/`  | Funções, tabelas, RLS e catálogo inicial                |
| `.github/workflows/`    | CI de teste/build e publicação manual                   |
| `.env.example`          | Modelo sem credenciais                                  |

## Revisão no GitHub

As alterações não são enviadas automaticamente. Confira antes de criar um commit:

```bash
git status
git diff --check
git add .
git commit -m "feat: implementa MVP do DEU MERDA"
git push -u origin feat/deu-merda-mvp
```

Abra um pull request de `feat/deu-merda-mvp` para `main` no repositório **KvzinNcpx7/deu-merda**. Revise os arquivos incluídos; `.env` e `node_modules` ficam ignorados. Não há necessidade de alterar qualquer outro repositório.

## Publicação futura — manual

O Vite já usa `base: '/deu-merda/'`; links de convite usam `?sala=ABC123`, sem precisar de fallback de rotas no Pages. O workflow `pages.yml` só responde a **workflow_dispatch**, nunca a push. Antes de executá-lo:

1. Revise/integre a branch quando decidir fazê-lo.
2. Em **Settings → Pages**, selecione GitHub Actions.
3. Crie as **Repository variables** `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em **Settings → Secrets and variables → Actions → Variables**.
4. Configure o ambiente `github-pages` com aprovação de deployment, se desejar essa trava adicional.
5. Execute manualmente **Publicação manual no Pages**, escolhendo a referência revisada.

A URL prevista é `https://kvzinncpx7.github.io/deu-merda/`. Nenhuma publicação foi executada por esta implementação.

## Próximas entregas

- Modo Caos, Relâmpago com prazo validado no servidor e Torneio.
- Expansão para 150 perguntas simples, 30 duplas e 400 respostas.
- Histórico permanente de partidas/rodadas, limpeza agendada de salas antigas e ranking entre partidas.
- Recuperação de identidade entre dispositivos e depois de apagar os dados do navegador.
- Validação do projeto Supabase real, Realtime e partida em dispositivos separados.

O MVP guarda a partida corrente como documento JSONB privado, protegido por transação, e não mantém um histórico normalizado de cada rodada. Não existe promessa de reutilizar identidades anônimas depois de apagar os dados do navegador.

A reformulação do humor, referências consultadas, filtros e limites dos testes estão em [CURADORIA.md](docs/CURADORIA.md). Veja também as [combinações de amostra](docs/COMBINACOES.md).

## Novidades da V2

Revelação conduzida pelo juiz com cursor persistido no servidor para todos, frase completa na revelação e no resultado, proteção de ações da interface contra mudança de rodada e conclusão da democracia após ausência de eleitores (90 segundos; ao menos dois votos de pessoas presentes). As quatro migrações originais foram preservadas; aplique 005, 006 e 007 na ordem.

A integração hospedada permanece **não validada**: não há projeto Supabase configurado nesta execução. As instruções e pendências estão em [docs/AUDITORIA.md](docs/AUDITORIA.md). Caos, Relâmpago e Torneio ficam para depois da validação real.

Para Chromium já instalado no Linux, pode usar `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e`. Sem essa variável, o Playwright usa seu navegador gerenciado normalmente.

## Curadoria V3 em revisão

A branch `feat/curadoria-humor-v3` revisa as mesmas 580 cartas: 140 mantidas, 280 ajustadas e 160 substituídas, sem IDs novos ou mudança de interface/mecânicas. A média das respostas caiu de 7,6 para 5 palavras. São 120 combinações entre pacotes com parecer editorial individual e 20 exemplos selecionados, sem alegação de teste de humor com pessoas. Consulte [CURADORIA.md](docs/CURADORIA.md) e [STATUS.md](docs/STATUS.md).

A migração incremental 008 preserva os textos de partidas ativas. Depende de aprovação antes de aplicar no Supabase e publicar o frontend; nenhuma dessas ações faz parte automática desta entrega.
