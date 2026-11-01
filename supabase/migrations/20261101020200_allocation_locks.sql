-- Optional lock metadata is backward compatible; ownership and save revision guards remain active.
create function public.eventora_valid_locks(value jsonb) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare item jsonb;
begin
  if pg_catalog.jsonb_typeof(value->'budget'->'categories') is distinct from 'array' then return false; end if;
  for item in select * from pg_catalog.jsonb_array_elements(value->'budget'->'categories') loop
    if item ? 'locked' and pg_catalog.jsonb_typeof(item->'locked') is distinct from 'boolean' then return false; end if;
  end loop;
  if value->'aiPlan' ? 'needsRefresh' and pg_catalog.jsonb_typeof(value->'aiPlan'->'needsRefresh') is distinct from 'boolean' then return false; end if;
  return true;
end; $$;
revoke all on function public.eventora_valid_locks(jsonb) from public,anon;
grant execute on function public.eventora_valid_locks(jsonb) to authenticated,service_role;
alter table public.events add constraint events_valid_locks check (public.eventora_valid_locks(record));
