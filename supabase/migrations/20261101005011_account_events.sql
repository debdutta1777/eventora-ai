-- Small event plans are owned aggregates. All nested planning records share that owner.
-- No service key, public data access, elevated RPC, or client-supplied owner is required.
create function public.eventora_money(value jsonb) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select case when pg_catalog.jsonb_typeof(value) = 'number'
    then value::text ~ '^[0-9]+$' and (value::text)::numeric <= 9007199254740991
    else false end;
$$;

create function public.eventora_valid_record(value jsonb) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare b jsonb; budget jsonb; item jsonb; child jsonb; part jsonb; field text; ids text[];
begin
  if pg_catalog.jsonb_typeof(value) is distinct from 'object'
    or pg_catalog.octet_length(value::text) > 250000
    or pg_catalog.jsonb_typeof(value->'id') is distinct from 'string'
    or pg_catalog.length(value->>'id') not between 1 and 100
    or value->'isSample' is distinct from 'false'::jsonb then return false; end if;
  ids := array[value->>'id'];
  b := value->'brief'; budget := value->'budget';
  if pg_catalog.jsonb_typeof(b) is distinct from 'object' or pg_catalog.jsonb_typeof(budget) is distinct from 'object' then return false; end if;
  foreach field in array array['name','type','date','city','theme','foodPreference','accessibility','notes'] loop
    if pg_catalog.jsonb_typeof(b->field) is distinct from 'string' then return false; end if;
  end loop;
  if pg_catalog.length(pg_catalog.btrim(b->>'name')) < 2 or pg_catalog.length(pg_catalog.btrim(b->>'city')) < 2
    or b->>'type' not in ('wedding','birthday','community')
    or b->>'date' !~ '^\d{4}-\d{2}-\d{2}$'
    or pg_catalog.to_char((b->>'date')::date,'YYYY-MM-DD') <> b->>'date'
    or not public.eventora_money(b->'totalBudgetPaise') or (b->>'totalBudgetPaise')::numeric < 1
    or not public.eventora_money(b->'guestCount') or (b->>'guestCount')::numeric < 1
    or pg_catalog.jsonb_typeof(b->'priorities') is distinct from 'array'
    or pg_catalog.jsonb_array_length(b->'priorities') > 12 then return false; end if;
  for part in select * from pg_catalog.jsonb_array_elements(b->'priorities') loop
    if pg_catalog.jsonb_typeof(part) <> 'string' then return false; end if;
  end loop;
  if not public.eventora_money(budget->'contingencyPaise')
    or pg_catalog.jsonb_typeof(budget->'contingencyLabel') is distinct from 'string'
    or pg_catalog.jsonb_typeof(budget->'categories') is distinct from 'array'
    or pg_catalog.jsonb_array_length(budget->'categories') not between 1 and 30 then return false; end if;
  for item in select * from pg_catalog.jsonb_array_elements(budget->'categories') loop
    if pg_catalog.jsonb_typeof(item->'id') is distinct from 'string' or pg_catalog.length(item->>'id') not between 1 and 100
      or pg_catalog.jsonb_typeof(item->'name') is distinct from 'string' or pg_catalog.length(pg_catalog.btrim(item->>'name')) < 1
      or not public.eventora_money(item->'allocatedPaise') or pg_catalog.jsonb_typeof(item->'expenses') is distinct from 'array'
      or pg_catalog.jsonb_array_length(item->'expenses') > 500 then return false; end if;
    ids := pg_catalog.array_append(ids,item->>'id');
    for child in select * from pg_catalog.jsonb_array_elements(item->'expenses') loop
      if pg_catalog.jsonb_typeof(child->'id') is distinct from 'string' or pg_catalog.length(child->>'id') not between 1 and 100
        or pg_catalog.jsonb_typeof(child->'label') is distinct from 'string' or pg_catalog.length(pg_catalog.btrim(child->>'label')) < 1
        or not public.eventora_money(child->'amountPaise') then return false; end if;
      ids := pg_catalog.array_append(ids,child->>'id');
    end loop;
  end loop;
  if pg_catalog.jsonb_typeof(value->'tasks') is distinct from 'array' or pg_catalog.jsonb_array_length(value->'tasks') > 500 then return false; end if;
  for item in select * from pg_catalog.jsonb_array_elements(value->'tasks') loop
    if pg_catalog.jsonb_typeof(item->'id') is distinct from 'string' or pg_catalog.length(item->>'id') not between 1 and 100
      or pg_catalog.jsonb_typeof(item->'title') is distinct from 'string' or pg_catalog.length(pg_catalog.btrim(item->>'title')) < 1
      or item->>'category' not in ('Venue','Food','Decor','Guests','Program','Logistics','Finance','Publicity')
      or pg_catalog.jsonb_typeof(item->'category') is distinct from 'string'
      or pg_catalog.jsonb_typeof(item->'completed') is distinct from 'boolean'
      or pg_catalog.jsonb_typeof(item->'dueDate') is distinct from 'string'
      or item->>'dueDate' !~ '^\d{4}-\d{2}-\d{2}$'
      or pg_catalog.to_char((item->>'dueDate')::date,'YYYY-MM-DD') <> item->>'dueDate' then return false; end if;
    ids := pg_catalog.array_append(ids,item->>'id');
  end loop;
  if pg_catalog.jsonb_typeof(value->'vendorGroups') is distinct from 'array' or pg_catalog.jsonb_array_length(value->'vendorGroups') > 30 then return false; end if;
  for item in select * from pg_catalog.jsonb_array_elements(value->'vendorGroups') loop
    if pg_catalog.jsonb_typeof(item->'id') is distinct from 'string' or pg_catalog.length(item->>'id') not between 1 and 100
      or pg_catalog.jsonb_typeof(item->'name') is distinct from 'string'
      or pg_catalog.jsonb_typeof(item->'items') is distinct from 'array' or pg_catalog.jsonb_array_length(item->'items') > 50 then return false; end if;
    ids := pg_catalog.array_append(ids,item->>'id');
    for child in select * from pg_catalog.jsonb_array_elements(item->'items') loop
      if pg_catalog.jsonb_typeof(child->'id') is distinct from 'string' or pg_catalog.length(child->>'id') not between 1 and 100
        or pg_catalog.jsonb_typeof(child->'done') is distinct from 'boolean'
        or child->>'status' not in ('needed','researching','contacted','confirmed') then return false; end if;
      foreach field in array array['title','note','status'] loop
        if pg_catalog.jsonb_typeof(child->field) is distinct from 'string' then return false; end if;
      end loop;
      ids := pg_catalog.array_append(ids,child->>'id');
    end loop;
  end loop;
  if pg_catalog.jsonb_typeof(value->'ideas') is distinct from 'array' or pg_catalog.jsonb_array_length(value->'ideas') > 100 then return false; end if;
  for item in select * from pg_catalog.jsonb_array_elements(value->'ideas') loop
    if pg_catalog.jsonb_typeof(item->'id') is distinct from 'string' or pg_catalog.length(item->>'id') not between 1 and 100
      or pg_catalog.jsonb_typeof(item->'saved') is distinct from 'boolean'
      or pg_catalog.jsonb_typeof(item->'steps') is distinct from 'array' or pg_catalog.jsonb_array_length(item->'steps') > 20 then return false; end if;
    foreach field in array array['title','explanation','costRangeLabel'] loop
      if pg_catalog.jsonb_typeof(item->field) is distinct from 'string' then return false; end if;
    end loop;
    for part in select * from pg_catalog.jsonb_array_elements(item->'steps') loop
      if pg_catalog.jsonb_typeof(part) <> 'string' then return false; end if;
    end loop;
    ids := pg_catalog.array_append(ids,item->>'id');
  end loop;
  foreach field in array array['createdAt','updatedAt'] loop
    if pg_catalog.jsonb_typeof(value->field) is distinct from 'string' then return false; end if;
    perform (value->>field)::timestamptz;
  end loop;
  return pg_catalog.cardinality(ids) = (select count(distinct identifier) from pg_catalog.unnest(ids) as identifier);
exception when others then return false;
end; $$;
revoke all on function public.eventora_money(jsonb),public.eventora_valid_record(jsonb) from public,anon;
grant execute on function public.eventora_money(jsonb),public.eventora_valid_record(jsonb) to authenticated;

create table public.events (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 100),
  record jsonb not null check (public.eventora_valid_record(record) and record->>'id'=id),
  revision integer not null default 1 check (revision>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,id)
);
-- Composite primary key indexes owner-scoped listing and saves.
alter table public.events enable row level security;
revoke all on public.events from anon,authenticated;
grant select,insert,update,delete on public.events to authenticated;
create policy events_select on public.events for select to authenticated using ((select auth.uid())=user_id);
create policy events_insert on public.events for insert to authenticated with check ((select auth.uid())=user_id);
create policy events_update on public.events for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy events_delete on public.events for delete to authenticated using ((select auth.uid())=user_id);

create function public.eventora_revision_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP='UPDATE' then
    if new.user_id<>old.user_id or new.id<>old.id then raise exception 'Event identity cannot change' using errcode='42501'; end if;
    if new.revision<>old.revision+1 then raise exception 'Event revision conflict' using errcode='40001'; end if;
    new.created_at:=old.created_at;
  elsif new.revision<>1 then raise exception 'New events start at revision one' using errcode='23514'; end if;
  new.updated_at:=pg_catalog.now();
  return new;
end; $$;
revoke all on function public.eventora_revision_guard() from public,anon;
create trigger eventora_revision before insert or update on public.events for each row execute function public.eventora_revision_guard();

-- Runs as the caller: RLS remains active, including for direct RPC calls.
create function public.save_event(p_record jsonb,p_expected_revision integer) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare saved public.events;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_expected_revision is null or p_expected_revision<0 then raise exception 'Invalid revision' using errcode='22023'; end if;
  if p_expected_revision=0 then
    insert into public.events(user_id,id,record,revision) values(auth.uid(),p_record->>'id',p_record,1)
      on conflict(user_id,id) do nothing returning * into saved;
  else
    update public.events set record=p_record,revision=revision+1
      where user_id=auth.uid() and id=p_record->>'id' and revision=p_expected_revision returning * into saved;
  end if;
  if saved.id is null then raise exception 'Event revision conflict' using errcode='40001'; end if;
  return pg_catalog.jsonb_build_object('record',saved.record,'revision',saved.revision);
end; $$;
revoke all on function public.save_event(jsonb,integer) from public,anon;
grant execute on function public.save_event(jsonb,integer) to authenticated;
