-- Finish democracy once all connected participants have voted (minimum two votes).
-- Called inside the existing room lock; no timer or client score calculation.
begin;
create or replace function private.finish_democracy(r jsonb) returns jsonb language plpgsql set search_path='' as $$
declare chosen text; winner text; players jsonb; score int;
 now_ms bigint := (extract(epoch from clock_timestamp())*1000)::bigint;
begin
 if r->>'mode'<>'democracy' or r->>'phase'<>'revealing' then return r;end if;
 if (select count(*) from jsonb_each_text(r->'votes') v join jsonb_array_elements(r->'players') p on p->>'id'=v.key where (p->>'seen')::bigint>=now_ms-90000)<2 then return r;end if;
 if exists(select 1 from jsonb_array_elements(r->'players') p where (p->>'seen')::bigint>=now_ms-90000 and not (r->'votes' ? (p->>'id'))) then return r;end if;
 select x->>'id' into chosen from jsonb_array_elements(r->'submissions') with ordinality q(x,ord)
 order by (select count(*) from jsonb_each_text(r->'votes') v where v.value=x->>'id') desc,ord asc limit 1;
 select x->>'player' into winner from jsonb_array_elements(r->'submissions') x where x->>'id'=chosen;
 if winner is null then return r;end if;
 select jsonb_agg(case when x->>'id'=winner then jsonb_set(x,'{score}',to_jsonb((x->>'score')::int+1)) else x end) into players from jsonb_array_elements(r->'players') x;
 select (x->>'score')::int into score from jsonb_array_elements(players) x where x->>'id'=winner;
 return r||jsonb_build_object('players',players,'winner',winner,'phase',case when score>=(r->>'target')::int then 'finished' else 'result' end);
end $$;
revoke all on function private.finish_democracy(jsonb) from public,anon,authenticated;
-- Extend the current function without changing any installed earlier migration.
create or replace function private.apply_game(p_code text, p_action jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid text:=auth.uid()::text; r jsonb; act text:=p_action->>'type'; v_code text:=upper(trim(p_code));
 idx int; p jsonb; players jsonb; subs jsonb; hand jsonb; card jsonb; cards jsonb; v_submission jsonb; winner text;
 n int; target int; pick int; txt text; key text; is_host boolean; phase text; now_ms bigint:=(extract(epoch from clock_timestamp())*1000)::bigint;
 chosen text;
begin
 if uid is null then raise exception 'Entre com autenticação anônima.';end if;
 if p_action is null or pg_column_size(p_action)>24000 then raise exception 'Requisição inválida.';end if;
 if act='create' then
 if (select count(*) from private.rooms where state->>'host'=uid and updated_at>now()-interval '24 hours')>=3 then raise exception 'Limite de três salas por dia. Reutilize uma sala existente.';end if;
 loop
 v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
 begin
 insert into private.rooms(code,state) values(v_code,'{}'::jsonb);
 exit;
 exception when unique_violation then null;
 end;
 end loop;
 r:=jsonb_build_object('version',1,'code',v_code,'host',uid,'players','[]'::jsonb,'phase','lobby','packs',jsonb_build_array('quinta','brasil','escola','economia','memes'),'target',5,'mode','classic','round',0,'judge','','prompt',null,'submissions','[]'::jsonb,'votes','{}'::jsonb,'winner',null,'questions','[]'::jsonb,'custom','[]'::jsonb,'reactions','[]'::jsonb);
 act:='join';
 else
 if v_code !~ '^[A-Z0-9]{6}$' then raise exception 'O código tem seis letras ou números.';end if;
 select state into r from private.rooms where private.rooms.code=v_code for update;
 if r is null then raise exception 'Sala não encontrada. Confira o código.' using errcode='DM001';end if;
 end if;
 select (ordinality-1)::int,value into idx,p from jsonb_array_elements(r->'players') with ordinality where value->>'id'=uid;
 phase:=r->>'phase';is_host:=r->>'host'=uid;
 if p is not null and p_action ? 'expectedRound' and p_action->'expectedRound' is distinct from r->'round' then
 raise exception 'A rodada mudou. Atualize a sala antes de tentar novamente.';
 end if;
 if act='join' and p is null then
 if phase<>'lobby' or jsonb_array_length(r->'players')>=12 then raise exception 'A sala começou ou está lotada.';end if;
 txt:=trim(p_action->>'name');
 if txt is null or length(txt) not between 2 and 24 then raise exception 'Use um apelido de 2 a 24 caracteres.';end if;
 if not coalesce(p_action->>'emoji'=any(array['💀','🤡','🦆','👽','🐸','🧻','🔥','🦖','🪩','🛸','🍄','🐀']),false) then raise exception 'Avatar inválido.';end if;
 p:=jsonb_build_object('id',uid,'name',txt,'emoji',p_action->>'emoji','score',0,'hand','[]'::jsonb,'seen',now_ms);
 r:=jsonb_set(r,'{players}',(r->'players')||jsonb_build_array(p));
 elsif p is null then raise exception 'Você não participa desta sala.' using errcode='DM002';
 else r:=jsonb_set(r,array['players',idx::text,'seen'],to_jsonb(now_ms));
 end if;
 -- Após 90s sem heartbeat, transfere anfitrião. Assentos são preservados para reconexão.
 if exists(select 1 from jsonb_array_elements(r->'players') x where x->>'id'=r->>'host' and (x->>'seen')::bigint<now_ms-90000) then
 select x->>'id' into key from jsonb_array_elements(r->'players') x where (x->>'seen')::bigint>=now_ms-90000 limit 1;
 if key is not null then r:=jsonb_set(r,'{host}',to_jsonb(key));end if;
 end if;
 is_host:=r->>'host'=uid;
 if act in ('config','custom','editCustom','toggleCustom','deleteCustom','start','next','kick') and not is_host then raise exception 'Só o anfitrião pode fazer isso.';end if;
 if act in ('config','custom','editCustom','toggleCustom','deleteCustom','start') and phase<>'lobby' then raise exception 'Disponível somente no lobby.';end if;
 case act
 when 'join','ping','sync' then null;
 when 'config' then
 if jsonb_typeof(p_action->'packs') is distinct from 'array' or jsonb_array_length(p_action->'packs')=0 or exists(select 1 from jsonb_array_elements_text(p_action->'packs') x where x not in ('quinta','brasil','escola','economia','memes','acido')) then raise exception 'Baralhos inválidos.';end if;
 target:=(p_action->>'target')::int;if target is null or target not in (5,7,10) then raise exception 'Pontuação inválida.';end if;
 if p_action->>'mode' is null or p_action->>'mode' not in ('classic','democracy') then raise exception 'Modo inválido.';end if;
 r:=r||jsonb_build_object('packs',p_action->'packs','target',target,'mode',p_action->>'mode');
 if p_action ? 'excludedThemes' then
 if jsonb_typeof(p_action->'excludedThemes') is distinct from 'array' then raise exception 'Temas inválidos.';end if;
 if exists(select 1 from jsonb_array_elements(p_action->'excludedThemes') x where jsonb_typeof(x)<>'string' or trim(both '"' from x::text) not in ('absurdo','vergonha','escatologia','nonsense','burocracia','supersticao','historia','estudante','politica','memes','religiao','morte','medicina')) then raise exception 'Temas inválidos.';end if;
 r:=jsonb_set(r,'{excludedThemes}',p_action->'excludedThemes');
 end if;
 when 'custom','editCustom' then
 txt:=trim(p_action->>'text');pick:=(p_action->>'pick')::int;
 if txt is null or length(txt) not between 3 and 180 or pick is null or pick not in (0,1,2) or (length(txt)-length(replace(txt,'________','')))/8<>pick or replace(txt,'________','') like '%\_%' escape '\' or (act='custom' and jsonb_array_length(r->'custom')>=100) then raise exception 'Use 3–180 caracteres e ________ para cada lacuna. Limite: 100 cartas.';end if;
 if act='custom' then
 r:=jsonb_set(r,'{custom}',(r->'custom')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'text',txt,'pick',pick,'pack','custom','active',true)));
 else
 if not exists(select 1 from jsonb_array_elements(r->'custom') x where x->>'id'=p_action->>'id') then raise exception 'Carta inexistente.';end if;
 select jsonb_agg(case when x->>'id'=p_action->>'id' then x||jsonb_build_object('text',txt,'pick',pick) else x end) into cards from jsonb_array_elements(r->'custom') x;
 r:=jsonb_set(r,'{custom}',cards);
 end if;
 when 'toggleCustom' then
 if not exists(select 1 from jsonb_array_elements(r->'custom') x where x->>'id'=p_action->>'id') then raise exception 'Carta inexistente.';end if;
 select jsonb_agg(case when x->>'id'=p_action->>'id' then jsonb_set(x,'{active}',to_jsonb(not coalesce((x->>'active')::boolean,true))) else x end) into cards from jsonb_array_elements(r->'custom') x;
 r:=jsonb_set(r,'{custom}',cards);
 when 'deleteCustom' then
 if not exists(select 1 from jsonb_array_elements(r->'custom') x where x->>'id'=p_action->>'id') then raise exception 'Carta inexistente.';end if;
 select coalesce(jsonb_agg(x),'[]') into cards from jsonb_array_elements(r->'custom') x where x->>'id'<>p_action->>'id';r:=jsonb_set(r,'{custom}',cards);
 when 'start' then
 if jsonb_array_length(r->'players')<3 then raise exception 'Chame ao menos três jogadores.';end if;
 select jsonb_agg(x||jsonb_build_object('hand','[]'::jsonb,'score',0)) into players from jsonb_array_elements(r->'players') x;
 r:=r||jsonb_build_object('players',players,'judge',players->0->>'id','round',0,'questions','[]'::jsonb);
 r:=private.new_round(private.refill(r));
 when 'submit' then
 if phase<>'answering' or r->>'judge'=uid then raise exception 'Você não pode enviar agora.';end if;
 if exists(select 1 from jsonb_array_elements(r->'submissions') x where x->>'player'=uid) then raise exception 'Você já enviou.';end if;
 cards:=p_action->'cards';pick:=(r->'prompt'->>'pick')::int;
 if jsonb_typeof(cards) is distinct from 'array' or jsonb_array_length(cards)<>pick or (select count(distinct value) from jsonb_array_elements_text(cards))<>pick then raise exception 'Selecione as cartas exigidas, sem repetir.';end if;
 hand:='[]';
 for key in select value from jsonb_array_elements_text(cards) loop
 select x into card from jsonb_array_elements(p->'hand') x where x->>'id'=key;
 if card is null then raise exception 'Essa carta não é sua.';end if;
 hand:=hand||jsonb_build_array(card);
 end loop;
 subs:=(r->'submissions')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'player',uid,'cards',hand));
 select jsonb_agg(x order by random()) into subs from jsonb_array_elements(subs) x;r:=jsonb_set(r,'{submissions}',subs);
 when 'reveal' then
 if phase<>'answering' or r->>'judge'<>uid then raise exception 'Somente o juiz revela.';end if;
 if exists(select 1 from jsonb_array_elements(r->'players') x where x->>'id'<>r->>'judge' and (x->>'seen')::bigint>=now_ms-90000 and not exists(select 1 from jsonb_array_elements(r->'submissions') s where s->>'player'=x->>'id')) then raise exception 'Ainda faltam respostas dos jogadores conectados.';end if;
 if jsonb_array_length(r->'submissions')<2 then raise exception 'São necessárias duas respostas. Aguarde reconexão ou volte ao lobby removendo ausentes.';end if;
 r:=r||jsonb_build_object('phase','revealing','revealIndex',0);
 when 'browse' then
 if phase<>'revealing' or r->>'judge'<>uid then raise exception 'Somente o juiz conduz a revelação.';end if;
 if jsonb_typeof(p_action->'index') is distinct from 'number' or (p_action->>'index') !~ '^[0-9]+$' then raise exception 'Resposta inválida.';end if;
 n:=(p_action->>'index')::int;
 if n<0 or n>=jsonb_array_length(r->'submissions') then raise exception 'Resposta inválida.';end if;
 r:=jsonb_set(r,'{revealIndex}',to_jsonb(n));
 when 'choose','vote' then
 if phase<>'revealing' then raise exception 'A revelação não começou.';end if;
 chosen:=p_action->>'id';select x into v_submission from jsonb_array_elements(r->'submissions') x where x->>'id'=chosen;
 if v_submission is null then raise exception 'Resposta inexistente.';end if;
 if act='choose' then
 if r->>'mode'<>'classic' or r->>'judge'<>uid then raise exception 'Somente o juiz escolhe neste modo.';end if;
 else
 if r->>'mode'<>'democracy' or r->'votes' ? uid or v_submission->>'player'=uid then raise exception 'Voto inválido, repetido ou na própria resposta.';end if;
 r:=jsonb_set(r,array['votes',uid],to_jsonb(chosen));
 if (select count(*) from jsonb_object_keys(r->'votes'))<jsonb_array_length(r->'players') then chosen:=null;
 else select x->>'id' into chosen from jsonb_array_elements(r->'submissions') with ordinality q(x,ord) order by (select count(*) from jsonb_each_text(r->'votes') v where v.value=x->>'id') desc,ord asc limit 1;end if;
 end if;
 if chosen is not null then
 select x->>'player' into winner from jsonb_array_elements(r->'submissions') x where x->>'id'=chosen;
 select jsonb_agg(case when x->>'id'=winner then jsonb_set(x,'{score}',to_jsonb((x->>'score')::int+1)) else x end) into players from jsonb_array_elements(r->'players') x;
 select (x->>'score')::int into n from jsonb_array_elements(players) x where x->>'id'=winner;
 r:=r||jsonb_build_object('players',players,'winner',winner,'phase',case when n>=(r->>'target')::int then 'finished' else 'result' end);
 end if;
 when 'next' then
 if phase<>'result' then raise exception 'A rodada não terminou.';end if;
 players:='[]';
 for p in select x from jsonb_array_elements(r->'players') x loop
 select coalesce(jsonb_agg(h),'[]') into hand from jsonb_array_elements(p->'hand') h where not exists(select 1 from jsonb_array_elements(r->'submissions') s,jsonb_array_elements(s->'cards') c where s->>'player'=p->>'id' and c->>'id'=h->>'id');
 players:=players||jsonb_build_array(jsonb_set(p,'{hand}',hand));end loop;
 select (ordinality::int)%jsonb_array_length(players) into n from jsonb_array_elements(players) with ordinality where value->>'id'=r->>'judge';
 -- Prefere um juiz conectado; não remove o assento de quem caiu.
 select x->>'id' into key from jsonb_array_elements(players) with ordinality q(x,i) where (x->>'seen')::bigint>=now_ms-90000 order by ((i::int-1-n+jsonb_array_length(players))%jsonb_array_length(players)) limit 1;
 r:=r||jsonb_build_object('players',players,'judge',coalesce(key,players->n->>'id'));r:=private.new_round(private.refill(r));
 when 'reaction' then
 txt:=p_action->>'text';
 if phase not in ('revealing','result') or not coalesce(txt=any(array['💀','😂','😭','🤡','🤯','KKKKKKK!','CARAI BORRACHA!','NÃO TANKO!','LÁ ELE!','RECEBA!']),false) then raise exception 'Reação inválida.';end if;
 if exists(select 1 from jsonb_array_elements(r->'reactions') x where split_part(x->>'id',':',1)=uid and (x->>'at')::bigint>now_ms-2000) then raise exception 'Respira! Uma reação a cada dois segundos.';end if;
 select coalesce(jsonb_agg(x),'[]') into cards from jsonb_array_elements(r->'reactions') x where (x->>'at')::bigint>now_ms-6000;
 r:=jsonb_set(r,'{reactions}',cards||jsonb_build_array(jsonb_build_object('id',uid||':'||gen_random_uuid()::text,'text',txt,'at',now_ms)));
 when 'leave','kick' then
 key:=case when act='leave' then uid else p_action->>'id' end;
 if act='kick' and not exists(select 1 from jsonb_array_elements(r->'players') x where x->>'id'=key and (x->>'seen')::bigint<now_ms-90000) then raise exception 'Só é possível remover quem está desconectado há 90 segundos.';end if;
 select coalesce(jsonb_agg(x),'[]') into players from jsonb_array_elements(r->'players') x where x->>'id'<>key;
 if jsonb_array_length(players)=0 then
 delete from private.rooms where private.rooms.code=v_code;delete from public.room_signals where public.room_signals.code=v_code;return null;
 end if;
 r:=jsonb_set(r,'{players}',players);
 if r->>'host'=key then r:=jsonb_set(r,'{host}',players->0->'id');end if;
 if phase in ('answering','revealing','result') then
 if jsonb_array_length(players)<3 then
 select jsonb_agg(x||jsonb_build_object('hand','[]'::jsonb,'score',0)) into players from jsonb_array_elements(players) x;
 r:=r||jsonb_build_object('phase','lobby','players',players,'submissions','[]'::jsonb,'prompt',null);
 elsif r->>'judge'=key or phase='revealing' then r:=jsonb_set(r,'{judge}',players->0->'id');r:=private.new_round(r);
 else select coalesce(jsonb_agg(x),'[]') into subs from jsonb_array_elements(r->'submissions') x where x->>'player'<>key;r:=jsonb_set(r,'{submissions}',subs);end if;
 end if;
 else raise exception 'Ação desconhecida.';
 end case;
 -- Juiz ausente: refaz a rodada sem gastar as cartas enviadas.
 if r->>'phase' in ('answering','revealing') and exists(select 1 from jsonb_array_elements(r->'players') x where x->>'id'=r->>'judge' and (x->>'seen')::bigint<now_ms-90000) then
 select x->>'id' into key from jsonb_array_elements(r->'players') x where (x->>'seen')::bigint>=now_ms-90000 limit 1;
 if key is not null then r:=private.new_round(jsonb_set(r,'{judge}',to_jsonb(key)));end if;
 end if;
 r:=private.finish_democracy(r);
 insert into private.rooms(code,state) values(v_code,r) on conflict on constraint rooms_pkey do update set state=excluded.state,updated_at=now();
 -- sync/ping não geram eventos recursivos. Clientes usam heartbeat + fallback de leitura.
 if act not in ('sync','ping') then
 insert into public.room_signals(code) values(v_code) on conflict on constraint room_signals_pkey do update set revision=public.room_signals.revision+1;
 end if;
 if act='leave' then return null;end if;
 return private.snapshot(r,uid);
end $$;
revoke all on function private.apply_game(text,jsonb) from public,anon,authenticated;
commit;
