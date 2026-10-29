-- Membership status must not mirror the order of anonymous submissions.
-- Changes only the filtered view; existing room JSON remains untouched.
begin;
create or replace function private.snapshot(r jsonb, uid text) returns jsonb language plpgsql set search_path='' as $$
declare players jsonb; subs jsonb; submitted jsonb; p text;
begin
 if not exists(select 1 from jsonb_array_elements(r->'players') x where x->>'id'=uid) then raise exception 'Você não participa desta sala.'; end if;
 p:=r->>'phase';
 select coalesce(jsonb_agg(case when x->>'id'=uid then x else jsonb_set(x,'{hand}','[]') end),'[]') into players from jsonb_array_elements(r->'players') x;
 select coalesce(jsonb_agg(x->'player' order by x->>'player'),'[]') into submitted from jsonb_array_elements(r->'submissions') x;
 select coalesce(jsonb_agg(case when p in ('result','finished') then x else jsonb_set(x,'{player}','""') end),'[]') into subs from jsonb_array_elements(r->'submissions') x;
 return (r-'deck'-'questions'-'votes') || jsonb_build_object('players',players,'custom',case when p='lobby' then r->'custom' else '[]'::jsonb end,'submissions',case when p in ('answering','lobby') then '[]'::jsonb else subs end,'submitted',submitted,'votes','{}'::jsonb,'voteCount',(select count(*) from jsonb_object_keys(r->'votes')),'myVote',r->'votes'->uid);
end $$;
revoke all on function private.snapshot(jsonb,text) from public,anon,authenticated;
commit;
