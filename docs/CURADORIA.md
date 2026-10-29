# Curadoria do humor — catálogo v2

580 cartas autorais: seis pacotes com 25 perguntas simples e cinco duplas cada; quatro têm 67 respostas e Memes/Ácido têm 66. As alterações mantêm os IDs dos cinco pacotes anteriores; mãos já salvas conservam seus textos, placares e cartas próprias. A nova seleção vale ao iniciar uma partida no lobby.

## Referências consultadas

A [página oficial da Buró sobre F.D.P.](https://www.burobrasil.com/produtos/fdp/) descreve a combinação entre pergunta e resposta, com espaço para ironia, sutileza e caos. A proporção pública das expansões (10 perguntas para 40 respostas) também favorece a variedade de respostas; este projeto conserva sua proporção anterior de 20 para 40 por pacote para manter as mecânicas e o tamanho das mãos.

A construção editorial privilegia uma situação reconhecível, uma lacuna aberta a substantivos e uma resposta que muda a escala, a lógica ou a expectativa. Alternam-se respostas mínimas (“Gelatina.”), conceitos (“A textura de um feriado.”), objetos (“Um PDF molhado.”) e cenas (“Um tirano derrubado pela própria estátua na inauguração.”). Não houve importação de catálogo nem transcrição de cartas comerciais.

Limitações da pesquisa: o [vídeo indicado](https://www.youtube.com/watch?v=clcPHwrYFfg) não pôde ser recuperado pelo navegador de pesquisa, e o link de manual na página oficial levou a um arquivo removido no Dropbox. Portanto, não se atribui a esses materiais uma análise de demonstração ou de regras completas que não foi possível realizar.

## Distribuição e seleção

- **5ª série sem freio**: escatologia, vergonha, absurdo e nonsense. Mantém a identidade do jogo sem concentrar tudo em gases ou banheiro.
- **Brasil insano**: cartório, superstições, história e cotidiano impossível.
- **Resenha escolar**: estudo, falhas sociais fictícias e absurdos de sala de aula.
- **Economia do caos**: sátira política e corrupção fictícia, trabalho e negócios sem sentido.
- **Memes lendários**: hábitos reconhecíveis da internet brasileira, vergonha e nonsense, sem exigir que o jogador conheça um bordão específico.
- **Humor Ácido e Tabus**: morte, medicina constrangedora, sátira religiosa e história com tiranos ridicularizados. Começa desativado; traz aviso 18+ antes da escolha. Religiões e pacientes reais não são os alvos; o humor vem de procedimentos, instituições e situações fictícias. Referências nazistas são exclusivamente depreciativas.

O anfitrião escolhe pacotes e pode excluir temas no lobby. Os temas disponíveis acompanham os pacotes selecionados. Uma exclusão fica guardada se o pacote for desligado e religado. Ela afeta perguntas e respostas do catálogo nos dois motores. Cartas próprias continuam sob controle separado do anfitrião, com os botões existentes de ativação; não recebem classificação automática.

Nenhum tema supera 30% das respostas no catálogo completo. O equilíbrio é editorial, não uma garantia de cotas em cada mão: o embaralhamento continua aleatório. Selecionar apenas um tema ou um pacote deliberadamente reduz a diversidade. Dez respostas por pessoa continuam obrigatórias; seleções pequenas podem exigir mais pacotes para iniciar.

## Metadados e verificações

Cada carta tem `theme`, `tone` e `grammar`. `nominal` indica resposta nominal; `nominal-slots` indica que as lacunas aceitam sintagmas nominais sem exigir gênero específico. São pistas para curadoria, não um parser de português. Na leitura em voz alta, os jogadores podem fazer a contração natural de artigos (“de” + “o” → “do”).

`npm run cards:sample` regenera [48 combinações](COMBINACOES.md) com semente fixa, incluindo simples, duplas e cruzamentos de pacotes, com e sem tabus. Os testes verificam integridade das lacunas, IDs, tamanho de leitura, distribuição de temas, diversidade de começos e similaridade lexical. Esses testes detectam regressões de conteúdo e montagem; não demonstram graça ou correção gramatical universal. A leitura humana das amostras continua necessária.

O script legado `scripts/generate-catalog-migration.mjs` gerou a migração 003 a partir do catálogo, dos temas e das funções da migração 001. Ele foi mantido como histórico; não deve ser executado para esta revisão. Na revisão histórica anterior, `npm run cards:migration` gerava a migração editorial 004; na V2 exige um caminho novo. Depois de aplicada em um ambiente, futuras alterações precisam de outra migração; não se deve reescrever histórico já aplicado.

## Supabase

A migração 003 adiciona metadados, atualiza o catálogo por ID e estende as funções privadas para aceitar o pacote `acido` e `excludedThemes`. Não modifica registros de salas nem ativa o novo pacote em salas existentes. As permissões privadas são reafirmadas; Auth, RPC e sinais Realtime continuam com a estrutura anterior. A demonstração aceita sessões v1 sem o novo campo opcional.

A migração e os fluxos foram testados em PostgreSQL embarcado (PGlite). Não foi aplicado SQL em projeto remoto nem validada uma partida entre dispositivos com um Supabase externo nesta entrega.

## Revisão editorial de 29/10/2026

A revisão mantém as 360 cartas e todos os IDs, diversificando respostas com fragmentos curtos, falas constrangedoras, corrupção fictícia, superstição e humor macabro. A sátira de supremacistas ridiculariza a ideologia e suas credenciais imaginárias, sem sugerir hierarquias genéticas. Perguntas que exigiam interlocutores ou concordância de gênero foram abertas a respostas nominais mais diversas.

A amostragem agora usa a escala completa do gerador pseudoaleatório para selecionar índices, evitando depender apenas dos bits inferiores. Os testes conferem também o texto montado contra as cartas atuais e a unicidade de textos e IDs. A amostra continua sendo uma ferramenta de revisão editorial, sem promessa de graça ou concordância universal.

A migração **004** contém somente as revisões do catálogo; a 003 foi preservada. A 004 é histórica e não deve mais ser gerada novamente. O script compara o catálogo com a fotografia da migração 003. Depois de aplicada, revisões seguintes exigem uma nova migração. Mãos, perguntas já sorteadas, placares e cartas próprias ficam no JSON das salas, que não é alterado pela migração. Um teste de banco verifica essa preservação integral durante uma partida.

## Expansão V2 desta execução

Foram acrescentadas 160 respostas, 54 perguntas simples e seis duplas. Total: 400/150/30. IDs anteriores e textos das 360 cartas anteriores foram preservados. A migração 006 insere o novo catálogo sem modificar salas. Os novos textos combinam escatologia, burocracia, escola, vergonha, superstição, sátira política fictícia, medicina e morte fictícia. Referências a tiranos os ridicularizam; Tabus segue opcional. As novas referências à BOSTA3 são apenas cartas, sem conexão com seu backend.

A amostra de 48 combinações foi regenerada. A validação mede contagens, unicidade, metadados, lacunas e distribuição; não mede graça nem garante concordância universal. As perguntas continuam aceitando respostas nominais. Recomenda-se sessão editorial com jogadores antes de publicar. Nesta execução não foi acessado nem assistido o vídeo de referência; a pesquisa anterior acima permanece registrada como histórica.

O gerador `cards:migration` agora exige um caminho novo e recusa sobrescrever arquivos. Exemplo para uma revisão futura: `npm run cards:migration -- supabase/migrations/202610300008_editorial.sql`. Ele compara com a fotografia 003 e pode incluir revisões já presentes na 004/006; revise o SQL antes de aplicar. Nunca gere novamente uma migração já aplicada.
