# Resenha Escolar — referências internas

27 respostas novas, sem editar nenhuma das 580 cartas anteriores: 12 nomes individuais e 15 situações fictícias. O catálogo passa a 607 cartas (427 respostas, 150 perguntas simples, 30 duplas); Resenha Escolar passa a 124 cartas (94 respostas e 30 perguntas).

As personagens escolares são caricaturas fictícias. As cenas políticas são sátiras inventadas, sem alegação de acontecimentos reais. A referência ao financiamento da cantina usa dinheiro de Banco Imobiliário para explicitar o absurdo. Nomes individuais permitem combinações curtas; as situações acrescentam identidade ao pacote sem exigir uma história completa.

## Instalação

Depois de revisar e fazer merge do PR, aplicar somente a nova migração `supabase/migrations/202610290011_resenha_escolar.sql`, sobre um banco que já recebeu as migrações até 010. Depois executar o workflow de Pages na main. Este PR não aplica SQL ao projeto remoto nem publica o site.

A migração insere somente os 27 novos IDs, de `escola-a68` a `escola-a94`, e pode ser reaplicada sem duplicação. Não altera cartas existentes nem o JSON de salas. Partidas em andamento conservam suas mãos e baralhos; criar uma nova partida para usar as adições. Filtros de temas continuam valendo, inclusive para sátira política e escatologia.

## Verificação

57 testes automatizados cobrem o catálogo preservado, os nomes solicitados, a distribuição local, o catálogo e as permissões da RPC PostgreSQL, a reaplicação da migração e a preservação de salas em andamento. Build, validação do catálogo e formatação também foram executados. A suíte de navegador cobre desktop e celular. Essas verificações usam PostgreSQL embarcado e servidor local; não substituem uma partida em dispositivos reais no Supabase hospedado.

## Cartas adicionadas

- `escola-a68` — Heide
- `escola-a69` — Érika
- `escola-a70` — Cristiane
- `escola-a71` — Natália
- `escola-a72` — Priscila
- `escola-a73` — Márcia
- `escola-a74` — Xirley
- `escola-a75` — Iara
- `escola-a76` — Michelle
- `escola-a77` — Bolsonaro
- `escola-a78` — Lula
- `escola-a79` — Vorcaro
- `escola-a80` — A Heide gritando “QUE PORRA É ESSA?!”
- `escola-a81` — A Cristiane dando bronca no projetor.
- `escola-a82` — A Érika da Galera convocando reunião de emergência.
- `escola-a83` — A Natália interrompendo a apresentação.
- `escola-a84` — A Priscila confiscando o último pão de queijo.
- `escola-a85` — A Márcia tentando controlar o caos.
- `escola-a86` — A Xirley presidindo a CPI do recreio.
- `escola-a87` — A Iara berrando “IARARARA!” no microfone.
- `escola-a88` — A Michelle, filha da Xirley, no caos do recreio.
- `escola-a89` — Bolsonaro disputando a presidência do grêmio.
- `escola-a90` — Lula prometendo merenda em dobro.
- `escola-a91` — Vorcaro financiando a cantina com dinheiro de Banco Imobiliário.
- `escola-a92` — A Heide no telão sem explicação.
- `escola-a93` — Cristiane descobrindo a cagada do século.
- `escola-a94` — Érika convocando a assembleia do banheiro entupido.
