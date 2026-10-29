# Estado, segurança e limites do MVP

## Dois caminhos explícitos

`src/lib/engine.ts` executa uma demonstração em um único navegador. Seu documento completo fica em `localStorage`, com versão `1`. Esse caminho não é uma fronteira de segurança entre pessoas que compartilham o dispositivo.

No online, o cliente não usa o motor local para alterar a partida. `src/lib/client.ts` autentica anonimamente e chama `public.game(code, action)`. O JWT do Supabase fornece `auth.uid()`; um ID de jogador enviado no corpo da requisição não altera essa identidade.

## Modelo de dados

O MVP usa um documento por sala em `private.rooms.state` (JSONB):

| Campo                             | Conteúdo                                                           |
| --------------------------------- | ------------------------------------------------------------------ |
| code, host, version               | Identificação, dono e versão do contrato                           |
| players                           | Identidade, apelido, avatar, pontos, última presença e mão privada |
| phase, mode, target, round, judge | Partida corrente e regra de transição                              |
| prompt, questions                 | Pergunta atual e fila privada de perguntas                         |
| submissions                       | ID aleatório do envio, autoria privada e cartas ordenadas          |
| votes                             | Mapa privado de eleitor para envio                                 |
| winner                            | Vencedor da rodada após a decisão                                  |
| custom                            | Cartas da sala com tipo e ativação                                 |
| reactions                         | Eventos curtos predefinidos                                        |

`private.cards` mantém o catálogo global. `private.rate_limits` mantém a janela de requisições por identidade. `public.room_signals` contém somente código e revisão; nenhum dado de mão, voto ou autoria é transmitido pelo Realtime.

A estrutura favorece uma implementação transacional pequena para salas de até 12 participantes. Pontos, mãos e rodada são gravados juntos. Ela não é uma modelagem normalizada para análise/histórico: esse recurso fica para uma migração futura, sem substituir o estado ativo às cegas.

## Transações e validação

`public.game` bloqueia o contador da identidade com `FOR UPDATE`. A função interna bloqueia a sala com `SELECT ... FOR UPDATE` antes de validar e alterar seu documento. Requisições simultâneas da mesma sala são serializadas pelo PostgreSQL; um segundo envio ou uma segunda escolha encontra o novo estado e é rejeitado. Uma falha desfaz a ação inteira, incluindo distribuição, placar e troca de rodada.

A função pública captura erros da ação em uma subtransação e devolve `{error, code}`. Assim o contador de abuso é preservado mesmo em tentativas inválidas. O cliente converte esse envelope em erro de interface. O limite é de 100 chamadas por minuto por identidade, incluindo consultas, e de uma reação a cada dois segundos. O cliente limita consultas Realtime repetidas e mantém recuperação a cada cinco segundos.

Somente o anfitrião pode configurar/iniciar/avançar e administrar cartas próprias. O servidor valida fase, limite da sala, quantidade de respostas, posse da mão, IDs distintos, ausência do juiz nos envios, voto único e voto que não seja no próprio envio. Os pontos só mudam depois de escolha válida ou conclusão da votação. Empates em democracia seguem a ordem aleatória, já fixada, dos envios.

Perguntas têm fila embaralhada, refeita quando acaba. Respostas usadas saem das mãos na próxima rodada; a reposição sorteia do conjunto disponível, excluindo todas as cartas ainda nas mãos. O MVP não mantém um descarte separado por partida; uma resposta usada pode reaparecer em sorteios posteriores. Nunca há dois exemplares do mesmo ID simultaneamente nas mãos.

## Privacidade e RLS

As tabelas privadas têm RLS e não têm grants para `anon` ou `authenticated`. Funções internas não permitem execução por esses papéis. A função pública é `SECURITY DEFINER`, tem `search_path=''` e constrói uma visão filtrada no servidor.

- A visão inclui a mão de `auth.uid()` e mãos vazias para as outras pessoas.
- Perguntas futuras e o estado completo não saem do banco.
- Antes da revelação, os textos enviados não aparecem na visão.
- Durante a revelação, envios têm identificador aleatório e campo `player` vazio.
- A autoria aparece apenas quando a rodada tem decisão.
- Votos de outras pessoas nunca aparecem; só contagem e o voto da própria identidade.
- A RLS dos sinais permite leitura apenas por membros da sala.

O catálogo público não é segredo. Textos e apelidos são renderizados pelo React como texto, sem `dangerouslySetInnerHTML`, e são limitados em tamanho no servidor. Não há chat ou HTML de usuário.

## Reconexão e ausências

O Auth persiste no mesmo navegador. O código da sala é guardado localmente; ao atualizar, a aplicação tenta recuperar o mesmo assento sem redistribuir a mão. Um convite para outra sala tem precedência sobre a restauração da anterior.

O heartbeat ocorre a cada cinco segundos, também ao recuperar foco. Uma ausência só é considerada após 90 segundos. O assento fica reservado; o primeiro membro ativo assume o anfitrião quando necessário. Um juiz ausente é substituído e a rodada reiniciada sem descartar as mãos. O anfitrião pode remover ausentes. Com menos de três pessoas, a sala volta ao lobby e zera a partida. Ao avançar, a rotação prefere juízes conectados.

As alterações de presença detectadas em ping são vistas pelo fallback dos outros clientes; o ping não emite sinal, evitando ciclos de atualizações. A detecção depende de pelo menos um cliente ativo consultando o servidor. Não há tarefa agendada de presença.

## Limites conhecidos

- O administrador do projeto Supabase tem acesso ao estado privado, como é esperado de um operador de backend.
- Rate limit por identidade não substitui controle de criação de contas. Auth rate limits e, para lançamento amplo, integração de CAPTCHA são necessários.
- Salas antigas não têm limpeza automática. Remover o último participante apaga a sala. Um operador pode planejar uma rotina de retenção futura.
- Não há histórico permanente, prazo para resposta, torneio ou recuperação entre dispositivos.
- Não há alegação de teste de WebSocket hospedado ou teste físico entre celulares. O teste de banco usa o PostgreSQL embarcado PGlite, e o de interface usa Chromium.

## Contrato V2

`revealIndex` é opcional para compatibilidade com salas e saves v1. Ausência equivale a zero; nova rodada zera o cursor. A ação `browse` é aceita somente do juiz durante revelação e valida índice inteiro e limites. Emite o mesmo sinal de revisão sem textos privados; cada cliente busca sua visão filtrada por RPC. Mesmo que o WebSocket falhe, o fallback recupera o cursor.

A interface envia `expectedRound` nas ações. O servidor compara o número dentro do bloqueio da sala e rejeita uma requisição atrasada. O campo é opcional para manter compatibilidade com clientes anteriores; essa proteção não substitui validações de fase, posse e identidade nem é uma chave de idempotência. Envio/voto/escolha repetidos continuam bloqueados pelas regras existentes. Ao mudar o cursor, a interface fecha uma confirmação aberta para não escolher outra resposta por engano. Falhas de refresh obsoleto são ignoradas após outra ação.

`private.finish_democracy` conclui a votação quando todos os presentes votaram e existem ao menos dois votos de pessoas presentes. É chamada sob o bloqueio existente, inclusive em ping/sync; ao mudar para resultado deixa de conceder pontos. Votos válidos de ausentes continuam contados. Presença usa o relógio do servidor e 90 segundos, sem cron. Conclusões em ping chegam aos demais pelo fallback de até cinco segundos. A expulsão/saída durante revelação continua reiniciando a rodada conforme a regra anterior.
