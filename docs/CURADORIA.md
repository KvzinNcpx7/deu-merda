# Revisão atual — duas demonstrações relatadas

Esta revisão parte da main V3 e mantém as 580 cartas. Foram revistas 115 (56 respostas e 59 perguntas), preservadas 465 e todos os IDs. A nova amostra tem 120 casos com parecer por combinação. As respostas de até três palavras passaram de 54 para 81. As observações das duas demonstrações foram fornecidas pelo proprietário; o assistente não assistiu aos vídeos.

O relatório atual está em [DEMONSTRACOES.md](DEMONSTRACOES.md), com links para todas as decisões e avaliações. Foram criadas as migrações 009 (corrige a associação de autores pela ordem de status) e 010 (catálogo). Nenhuma foi aplicada remotamente nesta tarefa. A interface e as regras permanecem as existentes; a montagem da frase ganhou contrações na borda das lacunas.

O texto abaixo registra a revisão V3 anterior e suas métricas históricas.

---

## Histórico: curadoria V3 — o encaixe faz a piada

A V3 revisa as 580 cartas da V2: **140 mantidas, 280 ajustadas e 160 substituídas**, com os 580 IDs, seis pacotes e proporção 400 respostas / 150 simples / 30 duplas preservados. Nenhuma carta foi adicionada. A decisão foi melhorar o conjunto antes de perseguir 700.

## Direção editorial

Respostas passam a oferecer ingredientes, não roteiros fechados. A média caiu de 7,615 para 5,027 palavras, com mediana de oito para cinco. Há 54 respostas de até três palavras (antes cinco) e 382 de até sete (antes 191). Isso mede concisão, não graça. Foram mantidas cenas mais longas quando a imagem é forte ou o contraste justifica o tempo de leitura.

O humor alterna vergonha social, objetos banais, frases secas, ações reconhecíveis, escatologia, sátira política fictícia, absurdo curto e macabro opcional. Palavrões aparecem como voz de impaciência e constrangimento, sem virar obrigação em toda carta. Futebol, churrasco, transporte, escola, trabalho, grupos de família e burocracia fornecem situações reconhecíveis. Os alvos históricos autoritários são ridicularizados, nunca glorificados; não há colegas reais como alvo.

Exemplos de edição, com ID preservado:

| Antes                                                | Depois                              | Motivo                                                                                    |
| ---------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| Um joelho com sotaque francês.                       | Um joelho cabeludo.                 | Um detalhe corporal banal pode virar constrangimento conforme a pergunta.                 |
| A parte crocante da água.                            | Água mastigável.                    | Mantém um fragmento idiota de duas palavras como contraste, sem alongar a explicação.     |
| O departamento de urgências com prazo de nove meses. | A emergência agendada pra dezembro. | Situação de serviço reconhecível, sem o departamento personificado.                       |
| Uma capivara exigindo reconhecimento de firma.       | Uma capivara de chinelo.            | Remove o truque burocrático repetido, conserva uma imagem curta.                          |
| A atualização corrigiu bugs e acrescentou ________.  | Mantida.                            | Um cenário digital conhecido abre espaço tanto para objeto banal quanto para cena pesada. |

“Uma hemorroida com advogado, CNPJ e medida protetiva” não constava nessa fotografia do catálogo; não foi contada como remoção. Os números consideram os textos reais da main `d7375bc`.

## Repetições tratadas

As 400 respostas tinham 45 ocorrências de “que”; ficaram 11. As duas ocorrências de “conceito de” foram removidas. Capivaras passaram de três para uma. Esses são indicadores auxiliares, não uma proibição de linguagem natural.

Duplicações semânticas foram separadas: acenar para quem está atrás (quinta-a6/a46) virou, num dos IDs, declarar amor ao carro errado; imperador expulso pelo condomínio (brasil-a40/a48) ganhou uma imagem de roupa; a segunda ferradura invertida (brasil-a2/a47) virou simpatia com miojo; a segunda calculadora decepcionada (escola-a3/a45) virou uma pilha vazia; a segunda evacuação da feira (escola-q3/q21) virou advertência. Personificações administrativas e finais explicativos foram cortados em favor de situações e fragmentos.

O registro [REVISAO-V3.md](editorial/REVISAO-V3.md) cobre cada carta. O [JSON](editorial/REVISAO-V3.json) conserva objetos completos antes/depois, decisão e cinco critérios qualitativos: humor, originalidade, compatibilidade, naturalidade e variedade. São juízos editoriais do assistente, não notas de jogadores.

## Perguntas e compatibilidade

Foram revistos 107 enunciados/metadados de pergunta e 333 respostas. As perguntas usam situações curtas e reconhecíveis, com lacunas abertas: o RH pede uma explicação, a fiscalização abre a mala, o cirurgião encontra algo, a empresa chama algo de benefício. As 30 duplas continuam com seleção ordenada de duas respostas.

A gramática nominal é uma pista de curadoria, não um analisador de português. Infinitivos, falas e cenas não se encaixam perfeitamente em toda pergunta. O gerador conserva artigos e letras maiúsculas entre colchetes para expor, não esconder, contrações orais necessárias. Não foi alterado o renderizador nem criada correção automática de texto no jogo.

## Leitura de 120 combinações

`npm run cards:sample` agora gera 120 cruzamentos únicos com semente fixa: 60 sem Tabus, 60 com todos os pacotes. Cada pergunta e suas respostas vêm de pacotes diferentes; duplas usam três pacotes distintos. O sorteio cobre todos os pacotes, simples/duplas e fragmentos curtos/cenas, sem alterar o RNG de partidas.

A [amostra](COMBINACOES.md) foi lida individualmente: 14 apostas fortes, 51 medianas e 55 fracas segundo esta análise editorial. Foram anotados encaixe, surpresa, abertura, necessidade de explicar, repetição e leitura. Esses resultados não são taxa de risadas. Não escondemos os encaixes ruins: uma carta curta pode falhar por sentido, e uma combinação entre pacotes não é automaticamente boa.

As [120 notas](editorial/AVALIACAO-COMBINACOES-V3.md) mostram por que cada caso funcionou ou falhou. A leitura levou a ajustes no vagão “cheio de”, no complemento do tutorial, na apresentação de talentos e na justificativa da Morte. [Vinte combinações selecionadas](editorial/20-COMBINACOES-V3.md) ilustram a direção pretendida; foram escolhidas deliberadamente, não sorteadas nem testadas com público. O próximo passo editorial é observar pessoas lendo e jogando, sem lhes mostrar antes nossos rótulos.

## Pacotes e segurança de conteúdo

Humor Ácido e Tabus continua opcional, desativado por padrão, com o mesmo aviso 18+. Morte, religião e medicina constrangedora permanecem nesse pacote. Mudar um texto pode exigir reclassificar seu tema; os testes verificam temas válidos e a fronteira do pacote ácido. Referências à BOSTA3 são editoriais e não conectam ao seu backend.

## Referência e limites da pesquisa

A [descrição oficial de F.D.P., da Buró](https://www.burobrasil.com/produtos/fdp/) foi consultada nesta revisão. Ela apresenta a dinâmica pergunta/resposta e espaço para estilos como sutileza, ironia e caos. A inferência editorial é deixar a combinação produzir o contraste, em vez de carregar toda a piada na resposta. Não foram importadas nem transcritas cartas comerciais.

O [vídeo indicado](https://www.youtube.com/watch?v=clcPHwrYFfg) não pôde ser recuperado pelo navegador de pesquisa. Não houve observação de ritmo, pausas, risadas ou comportamento dos participantes. Um vídeo acessível de uma partida continua sendo uma etapa futura e não bloqueou a revisão atual.

## Banco e implantação futura

A migração nova é `202610290008_curadoria_v3.sql`. Ela atualiza somente `private.cards` pelos IDs estáveis. Migrações 001–007 foram preservadas; nenhum estado de sala é reescrito. Mãos, perguntas já sorteadas, fila de perguntas, placar, cartas próprias e envios ativos mantêm os textos guardados. Saves locais continuam restaurando seus textos antigos; partidas novas usam o catálogo V3.

Há teste que instala 001–007, inicia sala com três identidades, cria carta própria, distribui e envia resposta; aplica 008, compara o JSON integral, reconecta e segue até revelação. Isso roda em PGlite, não no Supabase hospedado. A 008 não foi aplicada remotamente nesta tarefa. Depois da aprovação, aplicar a migração antes do novo build do frontend para alinhar catálogos. Nenhum merge ou deploy é automático.

`cards:migration` exige destino inexistente e recusa sobrescrever revisões. Para esta V3, o delta exato foi comparado com a fotografia anterior e é validado pelos testes. O gerador genérico ainda compara com a fotografia 003, podendo incluir revisões já presentes; sempre revisar o SQL gerado e usar uma nova migração.
