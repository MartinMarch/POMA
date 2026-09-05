create function private.bootstrap_super_admin(target_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(target_email));
begin
  if char_length(normalized_email) not between 3 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid administrator email' using errcode = '22023';
  end if;

  insert into private.admin_email_allowlist (email)
  values (normalized_email)
  on conflict (email) do nothing;

  insert into public.app_admins (user_id)
  select users.id
  from auth.users
  where lower(users.email) = normalized_email
  on conflict (user_id) do nothing;

  return exists (
    select 1
    from public.app_admins
    join auth.users on users.id = app_admins.user_id
    where lower(users.email) = normalized_email
  );
end;
$$;

revoke all on function private.bootstrap_super_admin(text)
  from public, anon, authenticated, service_role;

create function private.revoke_super_admin(target_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(target_email));
begin
  delete from public.app_admins
  using auth.users
  where users.id = app_admins.user_id
    and lower(users.email) = normalized_email;

  delete from private.admin_email_allowlist
  where admin_email_allowlist.email = normalized_email;
end;
$$;

revoke all on function private.revoke_super_admin(text)
  from public, anon, authenticated, service_role;
