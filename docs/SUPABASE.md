# Configuração de um Supabase novo

## 1. Criar o projeto

No painel Supabase, crie um projeto novo, por exemplo `deu-merda`, na organização desejada. Escolha uma região próxima dos jogadores e guarde a senha do banco em local seguro. Aguarde a inicialização. Não use o projeto, as chaves, o banco ou as configurações da BOSTA3.

Este repositório não cria projetos externos nem contém credenciais reais.

## 2. Autenticação anônima

Em **Authentication → Sign In / Providers** (o rótulo pode variar no painel), habilite **Anonymous Sign-Ins**. Não é necessário habilitar e-mail para participar deste jogo. O cliente chama `signInAnonymously()` e recebe uma identidade real do Auth, com o papel `authenticated`.

Em **Authentication → URL Configuration**, defina a Site URL futura como `https://kvzinncpx7.github.io/deu-merda/` e autorize também a URL da sua prévia Codespaces, caso use redirecionamentos. O fluxo anônimo atual não depende de callback de e-mail ou OAuth.

Mantenha os limites de autenticação do Supabase habilitados. O MVP limita ações por identidade no banco, mas uma pessoa que crie muitas identidades pode contornar esse limite individual. CAPTCHA/Turnstile antes do login anônimo é uma próxima camada para abertura ampla ao público; exige configurar o provedor e adaptar `signInAnonymously({options:{captchaToken}})`. Não ative uma exigência de CAPTCHA sem integrar seu token no cliente, pois isso bloquearia a entrada.

## 3. Executar as migrações no SQL Editor

Abra **SQL Editor → New query** no projeto novo. Execute os arquivos inteiros, uma vez, nesta ordem:

1. `supabase/migrations/202610280001_game.sql`
2. `supabase/migrations/202610280002_cards.sql`
3. `supabase/migrations/202610280003_humor.sql`
4. `supabase/migrations/202610290004_editorial.sql`
5. `supabase/migrations/202610290005_reveal.sql`
6. `supabase/migrations/202610290006_catalog_v2.sql`
7. `supabase/migrations/202610290007_democracy_presence.sql`

A 001 cria schema, salas, limites, RPC e sinais; 002 e 003 instalam o catálogo inicial e os filtros; 004 faz a revisão editorial anterior. A 005 acrescenta cursor compartilhado, validação de lacunas próprias e proteção de rodada; 006 acrescenta 220 cartas com IDs novos; 007 conclui democracia quando todos os presentes votaram, com no mínimo dois votos presentes. Pontos são concedidos dentro da transação e do bloqueio da sala. Votos já recebidos de quem caiu continuam valendo; o assento é reservado. Se o juiz cair, continua valendo o reinício de rodada existente.

Numa instalação anterior, aplique somente as migrações ainda não aplicadas, sempre em ordem. Uma instalação até 004 recebe 005–007. Não reexecute 001 nem reescreva arquivos já aplicados. As migrações V2 não alteram diretamente o JSON de partidas existentes: uma sala antiga usa cursor zero até navegar, e perguntas já sorteadas/mãos guardam seus textos.

Para uma implantação inicial, pode usar uma transação em cada arquivo (`begin;` antes e `commit;` depois), no SQL Editor, para não deixar uma aplicação parcial se um comando falhar. Se usar Supabase CLI em um projeto novo, aplique os mesmos arquivos com o fluxo de migrações do CLI, verificando explicitamente o project ref antes de vincular. Não vincule um projeto já usado pela BOSTA3.

Verifique o catálogo sem expor dados de sala:

```sql
select pick, count(*) from private.cards group by pick order by pick;
-- 0: 400 respostas; 1: 150 perguntas; 2: 30 perguntas
```

## 4. Realtime e API

A migração adiciona **somente `public.room_signals`** à publicação `supabase_realtime`. Se o painel pedir configuração adicional, habilite essa tabela na publicação em **Database → Publications** / configurações de Realtime. Não publique `private.rooms` nem mãos, envios ou votos.

Confira:

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime';
```

A API deve expor o schema **public**. Mantenha **private fora dos Exposed schemas**. O cliente só precisa de `public.game` por RPC e leitura dos sinais da própria sala. O schema `private` tem RLS sem políticas de leitura para jogadores, tabelas sem grants e funções internas sem execução pública. Não afrouxe essas permissões para resolver um erro de configuração.

## 5. Project URL e chave pública

Em **Project Settings → API / API Keys**, copie a **Project URL** e a chave **publishable** (`sb_publishable_...`). Projetos com chaves legadas podem usar a chave `anon` pública. Não copie `service_role` ou uma chave secreta.

No Codespace:

```bash
cp .env.example .env
```

Edite `.env`:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO-NOVO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
```

Reinicie `npm run dev -- --host 0.0.0.0`. `.env` é ignorado pelo Git. A chave pública sozinha não libera as tabelas privadas: as regras do banco usam a identidade assinada do Auth.

## 6. Testar com amigos

Crie uma sala online e copie o link. Abra-o em dois outros navegadores/perfis independentes ou dispositivos. Todos precisam chegar à mesma aplicação e usar o mesmo backend. Abas normais compartilham o Auth e não são jogadores separados.

A aplicação assina os sinais pelo WebSocket e também consulta o estado a cada cinco segundos como recuperação. Se o Realtime estiver indisponível, a partida pode atualizar com esse atraso. O heartbeat também determina as ausências após 90 segundos. Fechar uma aba não provoca saída imediata; há tempo para reconectar.

Execute [VALIDACAO.md](VALIDACAO.md), especialmente as verificações de privacidade na rede e reconexão.

## 7. GitHub Actions

Em `KvzinNcpx7/deu-merda`, configure duas **Repository variables**, não chaves privadas:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

O workflow de verificação executa testes e build sem backend real. O workflow de Pages usa as duas variáveis somente quando iniciado manualmente. Mudar variáveis do GitHub não muda um bundle já publicado: será necessário um novo build manual quando você decidir publicar.

## Diagnóstico

| Mensagem/sintoma                                | Verificação                                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| Online aguardando configuração                  | `.env` ausente, variável vazia ou URL inválida; reinicie o Vite                     |
| Não foi possível entrar                         | Auth anônimo habilitado, rede e eventual CAPTCHA no painel                          |
| RPC game não encontrada                         | Primeira migração aplicada, schema public exposto e projeto correto                 |
| permission denied                               | Migração completa, grants originais e identidade authenticated; não liberar private |
| Sala não encontrada                             | Código, URL/chave do mesmo projeto e existência da sala                             |
| Outro dispositivo não atualiza instantaneamente | room_signals na publicação, WebSocket permitido e Auth válido                       |
| Muitas ações                                    | Limite de 100 requisições por minuto por identidade; aguarde a janela               |
| Não consigo iniciar com um pacote               | São necessárias pelo menos 10 respostas por jogador; ative mais pacotes             |

A recuperação automática depende dos dados do Auth no mesmo navegador. Limpar armazenamento, usar aba anônima diferente ou trocar de dispositivo gera uma identidade nova. Não há login por apelido que permita assumir o assento de outra pessoa.

## V3 editorial — somente após aprovação

A branch `feat/curadoria-humor-v3` acrescenta `202610290008_curadoria_v3.sql`. O projeto já instalado até 007 precisa apenas dessa nova migração para receber a curadoria. Ela altera somente o catálogo global por ID; não troca textos de mãos, perguntas ou filas já guardadas no JSON das salas.

Depois da aprovação da V3, aplique 008 antes do build do frontend V3 e confirme as contagens 400/150/30. Não reaplique 001–007. Teste uma nova sala para receber os textos revistos; salas antigas mantêm os textos ativos. Esta tarefa não executou a migração no Supabase remoto nem publicou o site.

## Revisão pelas demonstrações — migrações 009 e 010

Após aprovação dessa revisão, aplicar somente os arquivos pendentes, em ordem. Se o banco ainda está em 007, aplicar 008 antes de 009/010. Se já recebeu a V3, aplicar `202610290009_anonymous_status.sql` e `202610290010_catalog_demonstracoes.sql`.

A 009 corrige a associação indireta de autores que a ordem de `submitted` permitia; a lista de status passa a ser canônica por participante, independentemente das combinações. A 010 atualiza só o catálogo global. Nenhuma reescreve JSON de salas. Depois, publicar o frontend aprovado e repetir o roteiro com três identidades. Nenhum desses arquivos foi executado remotamente nesta tarefa.
