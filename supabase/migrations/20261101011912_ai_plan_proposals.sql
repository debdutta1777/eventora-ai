-- Generation records are owner-readable, but only the authenticated server can write them.
create table public.plan_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  request_key uuid not null,
  base_revision integer not null check(base_revision>0),
  base_record jsonb not null check(octet_length(base_record::text)<=250000),
  status text not null default 'generating' check(status in ('generating','ready','applied','failed')),
  proposal jsonb check(octet_length(proposal::text)<=100000),
  proposed_record jsonb check(octet_length(proposed_record::text)<=250000),
  error_code text,
  model text not null,
  prompt_version text not null default 'eventora-plan-v1',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id,request_key),
  foreign key(user_id,event_id) references public.events(user_id,id) on delete cascade
);
create index plan_runs_owner_time on public.plan_runs(user_id,created_at desc);
create index plan_runs_event on public.plan_runs(user_id,event_id,created_at desc);
alter table public.plan_runs enable row level security;
revoke all on public.plan_runs from public,anon,authenticated;
grant select on public.plan_runs to authenticated;
grant select,insert,update on public.plan_runs to service_role;
create policy plan_runs_read on public.plan_runs for select to authenticated using((select auth.uid())=user_id);
grant select,update on public.events to service_role;
grant execute on function public.eventora_valid_record(jsonb),public.eventora_money(jsonb) to service_role;

-- Caller must be the server's service role; p_user_id comes from getUser(token), never request JSON.
create function public.reserve_ai_plan(p_user_id uuid,p_event_id text,p_revision integer,p_request_key uuid,p_model text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare evt public.events; run public.plan_runs;
begin
  if p_user_id is null or p_request_key is null or p_model is null or length(p_model)>100 then raise exception 'Invalid planning input' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,41));
  select * into evt from public.events where user_id=p_user_id and id=p_event_id;
  if not found then raise exception 'Event unavailable' using errcode='P0002'; end if;
  if evt.revision<>p_revision then raise exception 'Event changed' using errcode='40001'; end if;
  select * into run from public.plan_runs where user_id=p_user_id and request_key=p_request_key;
  if found then
    if run.event_id<>p_event_id then raise exception 'Request key already used' using errcode='22023'; end if;
    return pg_catalog.jsonb_build_object('created',false,'run',pg_catalog.to_jsonb(run));
  end if;
  if exists(select 1 from public.plan_runs where user_id=p_user_id and event_id=p_event_id and status='generating' and created_at>now()-interval '2 minutes') then raise exception 'A proposal is already generating' using errcode='40001'; end if;
  if(select count(*) from public.plan_runs where user_id=p_user_id and created_at>now()-interval '24 hours')>=10 then raise exception 'Planning limit reached' using errcode='P0001'; end if;
  insert into public.plan_runs(user_id,event_id,request_key,base_revision,base_record,model)
  values(p_user_id,p_event_id,p_request_key,p_revision,evt.record,p_model) returning * into run;
  return pg_catalog.jsonb_build_object('created',true,'run',pg_catalog.to_jsonb(run));
end; $$;
revoke all on function public.reserve_ai_plan(uuid,text,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_ai_plan(uuid,text,integer,uuid,text) to service_role;

create function public.apply_ai_plan(p_user_id uuid,p_run_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare run public.plan_runs; evt public.events;
begin
  select * into run from public.plan_runs where id=p_run_id and user_id=p_user_id for update;
  if not found then raise exception 'Proposal unavailable' using errcode='P0002'; end if;
  select * into evt from public.events where user_id=p_user_id and id=run.event_id for update;
  if not found then raise exception 'Event unavailable' using errcode='P0002'; end if;
  if run.status='applied' then return pg_catalog.jsonb_build_object('record',evt.record,'revision',evt.revision); end if;
  if run.status<>'ready' or run.proposed_record is null then raise exception 'Proposal not ready' using errcode='22023'; end if;
  if evt.revision<>run.base_revision then raise exception 'Event changed; generate a fresh proposal' using errcode='40001'; end if;
  update public.events set record=run.proposed_record,revision=revision+1 where user_id=p_user_id and id=run.event_id returning * into evt;
  update public.plan_runs set status='applied' where id=run.id;
  return pg_catalog.jsonb_build_object('record',evt.record,'revision',evt.revision);
end; $$;
revoke all on function public.apply_ai_plan(uuid,uuid) from public,anon,authenticated;
grant execute on function public.apply_ai_plan(uuid,uuid) to service_role;
