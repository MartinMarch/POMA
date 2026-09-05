alter function public.create_restaurant(text, text, text)
  set schema private;

revoke all on function private.create_restaurant(text, text, text)
  from public, anon;
grant execute on function private.create_restaurant(text, text, text)
  to authenticated;

create function public.create_restaurant(
  restaurant_name text,
  restaurant_slug text,
  restaurant_description text default null
)
returns public.restaurants
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.create_restaurant(
    restaurant_name,
    restaurant_slug,
    restaurant_description
  );
end;
$$;

revoke all on function public.create_restaurant(text, text, text)
  from public, anon;
grant execute on function public.create_restaurant(text, text, text)
  to authenticated;

alter function public.admin_delete_user(uuid, boolean)
  set schema private;

revoke all on function private.admin_delete_user(uuid, boolean)
  from public, anon;
grant execute on function private.admin_delete_user(uuid, boolean)
  to authenticated;

create function public.admin_delete_user(
  target_user_id uuid,
  delete_owned_restaurants boolean default false
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.admin_delete_user(
    target_user_id,
    delete_owned_restaurants
  );
$$;

revoke all on function public.admin_delete_user(uuid, boolean)
  from public, anon;
grant execute on function public.admin_delete_user(uuid, boolean)
  to authenticated;

create policy admin_email_allowlist_deny_clients
  on private.admin_email_allowlist
  for all
  to anon, authenticated
  using (false)
  with check (false);
