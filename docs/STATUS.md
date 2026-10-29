# Estado verificado — 29/10/2026

O MVP foi integrado pelo [PR #1](https://github.com/KvzinNcpx7/deu-merda/pull/1). Main confirmada em `a835f4f26ac41f90383e3c403c7c596dbf7913d5`, com todos os arquivos do MVP. A branch original `feat/deu-merda-mvp` permanece em `9207b66`. Desenvolvimento V2 em `feat/deu-merda-v2`, criada a partir dessa main; merge V2 depende de revisão do proprietário.

## Entrega V2

580 cartas (400 respostas, 150 perguntas simples, 30 duplas), seis pacotes e Tabus opcional. Os 360 IDs/textos/metadados anteriores foram preservados. Revelação com cursor da sala conduzido pelo juiz, frase completa, ações da interface com número de rodada, confirmação fechada ao mudar resposta, correção de refresh obsoleto, lacunas próprias exatas e conclusão da democracia após ausência. Interface original, modo local explícito, sons, reações e modos clássico/democracia preservados.

Novas migrações incrementais 005–007; 001–004 intactas. Gerador de catálogo recusa sobrescrever migrações existentes. CI inclui validação de catálogo e formatação.

## Resultados repetidos

| Verificação            | MVP antes do merge       | V2                                  |
| ---------------------- | ------------------------ | ----------------------------------- |
| npm ci                 | Concluído                | Concluído                           |
| npm test               | 34 aprovados             | 42 aprovados                        |
| npm run build          | Aprovado                 | Aprovado                            |
| npm run test:e2e       | 8 aprovados              | 10 aprovados                        |
| npm run format:check   | Aprovado                 | Aprovado                            |
| npm run cards:validate | Não existia              | 580, contagens 400/150/30, aprovado |
| npm audit              | Não executado na etapa A | Zero vulnerabilidades conhecidas    |

Os E2E usam Chromium do sistema por variável documentada; o download Playwright foi bloqueado pela rede. Mobile é viewport emulada. O banco dos testes é PGlite; não houve Supabase hospedado, WebSocket real ou partida entre dispositivos. As validações não constituem certificação exaustiva de segurança ou concorrência.

## Próxima ação externa

Criar Supabase **novo e exclusivo**, aplicar as sete migrações na ordem (só pendentes em instalações existentes), habilitar Auth anônimo e Realtime apenas em `room_signals`, preencher URL/chave públicas. Nenhuma credencial foi criada ou inventada; o backend BOSTA3 não foi utilizado. Seguir [SUPABASE.md](SUPABASE.md) e testar com três perfis/dispositivos pelo roteiro [VALIDACAO.md](VALIDACAO.md).

Caos, Relâmpago e Torneio seguem pendentes, assim como carga concorrente real, CAPTCHA para abertura ampla e retenção automática. Não houve publicação no Pages nem merge automático da V2. Diagnóstico, correções, contagens e limites completos em [AUDITORIA.md](AUDITORIA.md).
