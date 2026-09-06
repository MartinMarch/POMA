alter table public.restaurants
  add column requires_table_token boolean not null default false;

update public.restaurants
set requires_table_token = true
where slug = 'demo';

create function private.resolve_table_context(
  restaurant_slug text,
  public_token uuid
)
returns table (
  restaurant_id bigint,
  table_id bigint,
  table_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    restaurant.id as restaurant_id,
    dining_table.id as table_id,
    dining_table.name as table_name
  from public.restaurants as restaurant
  inner join public.dining_tables as dining_table
    on dining_table.restaurant_id = restaurant.id
  where restaurant.slug = lower(btrim($1))
    and restaurant.is_published
    and dining_table.public_token = $2
    and dining_table.is_active;
$$;

revoke all on function private.resolve_table_context(text, uuid)
  from public, anon, authenticated, service_role;
grant usage on schema private to anon;
grant execute on function private.resolve_table_context(text, uuid)
  to anon, authenticated;

create function public.resolve_table_context(
  restaurant_slug text,
  public_token uuid
)
returns table (
  restaurant_id bigint,
  table_id bigint,
  table_name text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.resolve_table_context($1, $2);
$$;

revoke all on function public.resolve_table_context(text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.resolve_table_context(text, uuid)
  to anon, authenticated;
