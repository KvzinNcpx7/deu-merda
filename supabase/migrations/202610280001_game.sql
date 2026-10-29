-- Projeto NOVO e exclusivo do DEU MERDA. Não executar na BOSTA3.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table private.cards (id text primary key, text text not null, pack text not null, pick int not null check(pick between 0 and 2));
create table private.rooms (code text primary key, state jsonb not null, updated_at timestamptz not null default now());
create table private.rate_limits (uid uuid primary key, last_call timestamptz not null default now(), window_at timestamptz not null default now(), calls int not null default 0);
create table public.room_signals (code text primary key, revision bigint not null default 0);
alter table private.cards enable row level security;
alter table private.rooms enable row level security;
alter table private.rate_limits enable row level security;
alter table public.room_signals enable row level security;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on public.room_signals from public, anon, authenticated;
grant select on public.room_signals to authenticated;

create function private.member(c text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.rooms r, jsonb_array_elements(r.state->'players') p where r.code=c and p->>'id'=auth.uid()::text)
$$;
revoke all on function private.member(text) from public;
grant execute on function private.member(text) to authenticated;
create policy members_read_signals on public.room_signals for select to authenticated using(private.member(code));

create function private.snapshot(r jsonb, uid text) returns jsonb language plpgsql set search_path='' as $$
declare players jsonb; subs jsonb; submitted jsonb; p text;
begin
 if not exists(select 1 from jsonb_array_elements(r->'players') x where x->>'id'=uid) then raise exception 'Você não participa desta sala.'; end if;
 p:=r->>'phase';
 select coalesce(jsonb_agg(case when x->>'id'=uid then x else jsonb_set(x,'{hand}','[]') end),'[]') into players from jsonb_array_elements(r->'players') x;
 select coalesce(jsonb_agg(x->'player'),'[]') into submitted from jsonb_array_elements(r->'submissions') x;
 select coalesce(jsonb_agg(case when p in ('result','finished') then x else jsonb_set(x,'{player}','""') end),'[]') into subs from jsonb_array_elements(r->'submissions') x;
 return (r-'deck'-'questions'-'votes') || jsonb_build_object('players',players,'custom',case when p='lobby' then r->'custom' else '[]'::jsonb end,'submissions',case when p in ('answering','lobby') then '[]'::jsonb else subs end,'submitted',submitted,'votes','{}'::jsonb,'voteCount',(select count(*) from jsonb_object_keys(r->'votes')),'myVote',r->'votes'->uid);
end $$;

create function private.refill(r jsonb) returns jsonb language plpgsql set search_path='' as $$
declare pool jsonb; players jsonb:='[]'; p jsonb; hand jsonb; card jsonb;
begin
 select coalesce(jsonb_agg(c order by random()),'[]') into pool from (
 select to_jsonb(c) c from private.cards c where c.pick=0 and r->'packs' ? c.pack
 union all select x from jsonb_array_elements(r->'custom') x where (x->>'pick')::int=0 and coalesce((x->>'active')::boolean,true)
 ) q where not exists(select 1 from jsonb_array_elements(r->'players') held_player,jsonb_array_elements(held_player->'hand') held_card where held_card->>'id'=c->>'id');
 for p in select x from jsonb_array_elements(r->'players') x loop
 hand:=p->'hand';
 while jsonb_array_length(hand)<10 loop
 card:=pool->0;if card is null then raise exception 'Ative mais baralhos: são necessárias dez respostas por jogador.';end if;
 hand:=hand||jsonb_build_array(card);pool:=pool-0;
 end loop;
 players:=players||jsonb_build_array(jsonb_set(p,'{hand}',hand));
 end loop;
 return jsonb_set(r,'{players}',players);
end $$;

create function private.new_round(r jsonb) returns jsonb language plpgsql set search_path='' as $$
declare qs jsonb;
begin
 qs:=r->'questions';
 if jsonb_array_length(qs)=0 then
 select coalesce(jsonb_agg(c order by random()),'[]') into qs from (
 select to_jsonb(c) c from private.cards c where c.pick>0 and r->'packs' ? c.pack
 union all select x from jsonb_array_elements(r->'custom') x where (x->>'pick')::int>0 and coalesce((x->>'active')::boolean,true)
 ) q;
 end if;
 if jsonb_array_length(qs)=0 then raise exception 'Adicione perguntas.';end if;
 return r||jsonb_build_object('round',(r->>'round')::int+1,'phase','answering','prompt',qs->0,'questions',qs-0,'submissions','[]'::jsonb,'votes','{}'::jsonb,'winner',null);
end $$;

create function private.apply_game(p_code text, p_action jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if jsonb_typeof(p_action->'packs') is distinct from 'array' or jsonb_array_length(p_action->'packs')=0 or exists(select 1 from jsonb_array_elements_text(p_action->'packs') x where x not in ('quinta','brasil','escola','economia','memes')) then raise exception 'Baralhos inválidos.';end if;
 target:=(p_action->>'target')::int;if target is null or target not in (5,7,10) then raise exception 'Pontuação inválida.';end if;
 if p_action->>'mode' is null or p_action->>'mode' not in ('classic','democracy') then raise exception 'Modo inválido.';end if;
 r:=r||jsonb_build_object('packs',p_action->'packs','target',target,'mode',p_action->>'mode');
 when 'custom','editCustom' then
 txt:=trim(p_action->>'text');pick:=(p_action->>'pick')::int;
 if txt is null or length(txt) not between 3 and 180 or pick is null or pick not in (0,1,2) or (length(txt)-length(replace(txt,'________','')))/8<>pick or (act='custom' and jsonb_array_length(r->'custom')>=100) then raise exception 'Use 3–180 caracteres e ________ para cada lacuna. Limite: 100 cartas.';end if;
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
 r:=jsonb_set(r,'{phase}','"revealing"');
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
 insert into private.rooms(code,state) values(v_code,r) on conflict on constraint rooms_pkey do update set state=excluded.state,updated_at=now();
 -- sync/ping não geram eventos recursivos. Clientes usam heartbeat + fallback de leitura.
 if act not in ('sync','ping') then
 insert into public.room_signals(code) values(v_code) on conflict on constraint room_signals_pkey do update set revision=public.room_signals.revision+1;
 end if;
 if act='leave' then return null;end if;
 return private.snapshot(r,uid);
end $$;
-- Mantém o contador mesmo quando a ação é inválida: o erro da ação é
-- capturado em uma subtransação, depois da atualização do rate limit.
create function public.game(p_code text, p_action jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_window_at timestamptz; v_calls int;
begin
 if auth.uid() is null then raise exception 'Entre com autenticação anônima.';end if;
 insert into private.rate_limits(uid) values(auth.uid()) on conflict do nothing;
 select l.window_at,l.calls into v_window_at,v_calls from private.rate_limits l where l.uid=auth.uid() for update;
 if now()-v_window_at>interval '1 minute' then v_window_at:=now();v_calls:=0;end if;
 if v_calls>=100 then return jsonb_build_object('error','Muitas ações. Aguarde um minuto.','code','RATE_LIMIT');end if;
 update private.rate_limits set calls=v_calls+1,window_at=v_window_at,last_call=now() where private.rate_limits.uid=auth.uid();
 begin
 return private.apply_game(p_code,p_action);
 exception when others then
 return jsonb_build_object('error',sqlerrm,'code',case sqlstate when 'DM001' then 'ROOM_GONE' when 'DM002' then 'NOT_MEMBER' else 'GAME_ACTION_REJECTED' end);
 end;
end $$;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.member(text) to authenticated;
revoke all on function public.game(text,jsonb) from public,anon;
grant execute on function public.game(text,jsonb) to authenticated;
-- Apenas sinais sem cartas/autores são publicados.
alter publication supabase_realtime add table public.room_signals;
