# Revisão a partir das duas demonstrações relatadas

A referência desta entrega são as observações do proprietário: respostas curtas, assuntos muito diferentes, juiz lendo a preparação e escolhendo o melhor encaixe. O assistente não assistiu às duas gravações nem importou textos comerciais. A conclusão usada é que a resposta fornece um ingrediente e a pergunta cria a situação em que ele vira piada.

## Catálogo

Partimos da main `f977376`, com a V3 integrada. As 580 cartas foram reavaliadas e registradas em [REVISAO-DEMONSTRACOES.md](editorial/REVISAO-DEMONSTRACOES.md) e [JSON antes/depois](editorial/REVISAO-DEMONSTRACOES.json). Foram mantidas 465 e revistas 115: 56 respostas e 59 perguntas. Todos os IDs, pacotes e números de lacunas continuam os mesmos. Total: 400 respostas, 150 perguntas simples, 30 duplas. Tabus segue opcional, com o aviso existente.

A mudança principal é tornar concretos os encaixes fracos anotados na revisão anterior. Exemplos: “O conceito de quarta-feira” já havia saído na V3; seu sucessor “Quarta-feira, porra” virou “Banheiro de ônibus”. “A segunda via do nada” virou “RG de reserva”; “A carência da emergência” virou “Cirurgia adiada”; “Reiniciar o possuído” deu lugar a “Exorcismo malfeito”. São resumos do caminho editorial; os textos exatos antes/depois estão no registro por ID.

A média das respostas passa de 5,0275 para 4,8575 palavras. As de até três palavras aumentam de 54 para 81 (13,5% → 20,25%); as de até sete vão de 382 para 383. A média muda pouco porque a V3 já era curta: aqui, concretude e compatibilidade importam mais que cortar por cortar. Continuam algumas respostas nonsense, como “Água mastigável”, em contraste com objetos e situações comuns. CNPJ/advogado não constavam no ponto de partida desta entrega, portanto não foram inventadas remoções desse tipo.

Perguntas de compra, classificação e quantidade receberam atenção especial. Exemplos de preparação:

- A prefeitura interditou o prédio por causa de uma resposta.
- O trabalho premiado da turma era sobre uma resposta.
- No cartório, trocaram meu nome por uma resposta.
- O médico proibiu uma coisa; a família trouxe outra.
- O ditador exigiu uma coisa; a multidão respondeu com outra.

São descrições dos enunciados, não cartas extras. As duplas mantêm duas lacunas e a ordem selecionada. Não se tentou tornar toda resposta compatível com toda pergunta: uma ação pode não funcionar como objeto de compra, e isso continua sendo uma decisão social da mão do jogador.

## 120 combinações lidas

`npm run cards:sample` gera uma nova amostra reproduzível de 120 casos, sem sobrescrever os arquivos históricos AMOSTRA-V3 e AVALIACAO-COMBINACOES-V3. São 60 casos sem Tabus e 60 com todos os pacotes. Pergunta e respostas vêm de pacotes distintos, inclusive entre as duas cartas de uma dupla. O RNG de partidas não foi alterado.

A leitura está em [AVALIACAO-DEMONSTRACOES.md](editorial/AVALIACAO-DEMONSTRACOES.md): 26 apostas promissoras, 51 medianas e 43 fracas. Cada caso recebe observações de naturalidade/contraste, comprimento, repetição, gramática, sentido ou dependência de piada pronta. Os rótulos são juízos editoriais do assistente; não houve teste de humor com pessoas. A seleção de respostas mudou após a edição, portanto não se calcula melhora percentual de risadas nem se compara a contagem de rótulos com a amostra V3 como se fosse um experimento controlado.

Amostras promissoras:

- No cartório, trocaram meu nome por “Empada de ontem”: o objeto inocente vira consequência social absurda.
- O trabalho premiado da turma era sobre “Banheiro de aluguel”: contraste de prestígio com necessidade cotidiana.
- Meu exame veio com um alerta: “Quarenta tesouras de inauguração”: objeto político no contexto médico, sem história na resposta.
- Na porta do banheiro, alguém escreveu: “Fantasma no banheiro”: encontro direto de cotidiano e macabro.
- O ditador exigiu “Um pedido de desculpas em Comic Sans”. A multidão respondeu com “Um PDF molhado”: desmoralização por resposta material, com pausa entre as lacunas.

Amostras fracas mantidas no relatório: comprar “Abraçar um manequim” exige serviço omitido; gastar verba em uma sexta-feira azarada continua sendo metáfora; um tutorial que ensina purê e entrega um partido não cria uma técnica reconhecível. Cortar palavras e cruzar pacotes não garantem graça. O próximo teste é observar como pessoas leem, selecionam e reagem sem mostrar nossos rótulos antes.

## Revelação e falha de anonimato corrigida

O fluxo existente foi preservado: juiz apresenta a pergunta, outros escolhem uma ou duas cartas ordenadas, abrem-se os envios anônimos, o juiz navega pelo cursor compartilhado, todos veem a frase completa, o juiz decide, autores e ponto aparecem, mãos são repostas e o juiz roda.

Na inspeção, apareceu um vazamento indireto: `submitted` era montado na mesma ordem de `submissions`. Mesmo com `player` vazio nas respostas, era possível cruzar posições e associar autores. A correção faz `submitted` ter ordem canônica por ID de participante, independente da ordem aleatória das respostas. A UI só precisa testar inclusão/contagem, e o contrato de ações não muda.

A migração `202610290009_anonymous_status.sql` troca somente a função de visão filtrada e reafirma a proibição de execução direta. O motor local faz a mesma separação no seu filtro. Nenhum JSON de sala, placar, carta ou envio é reescrito. Autoria continua disponível após decisão. O modo de demonstração armazena o estado completo no próprio navegador e não é uma fronteira de segurança entre pessoas no mesmo dispositivo.

Testes forçam a ordem contrária dos autores e conferem status canônico, campos de autoria vazios e mãos alheias vazias. Também verificam cursor comum a três identidades, retorno para comparação, bloqueio de escolha por não juiz, ponto único, rotação e dez cartas por pessoa na rodada seguinte. São testes em PGlite/Chromium, não validação de três dispositivos reais com Supabase hospedado.

## Legibilidade sem redesenho

O formatador faz contrações apenas na borda da lacuna, como “de” + “O banheiro” → “do banheiro” e “a” + “As capivaras” → “às capivaras”. Artigos iniciais são minúsculos no meio da frase; siglas, texto citado e início de frase são preservados. Isso é apresentação, sem alterar cartas guardadas ou tentar corrigir toda semântica. Não é um analisador completo de português e não normaliza nomes próprios ou todos os substantivos automaticamente. A saída continua sendo texto renderizado pelo React, sem HTML de usuário.

Não foram modificados layout, CSS, componentes de interface, pontuação, modos, Auth, cliente Supabase, RLS de tabelas ou o mecanismo de sinais Realtime. A alteração de backend é apenas a visão filtrada necessária para corrigir a associação indevida. Migrações 001–008 permanecem intactas.

## Aplicação futura

A `202610290010_catalog_demonstracoes.sql` atualiza somente 115 registros do catálogo global pelos IDs. Testes instalam um catálogo anterior, iniciam a sala, enviam resposta e aplicam a sequência editorial/visão; comparam o estado integral e continuam a rodada. Mãos, pergunta, fila, placar, cartas próprias e respostas ativas conservam seus textos.

Nada foi aplicado no Supabase hospedado nesta entrega. Após revisar e aprovar o PR, aplicar apenas migrações pendentes em ordem: se o projeto está até 007, aplicar 008, depois 009 e 010; se já está em 008, aplicar 009 e 010. Só então integrar/publicar o frontend aprovado e testar com três identidades em dispositivos/perfis diferentes. Não há merge ou publicação automática.
