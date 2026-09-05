create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key
    references auth.users (id) on delete cascade,
  email text,
  full_name text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_length_check
    check (email is null or char_length(email) between 3 and 320),
  constraint profiles_full_name_length_check
    check (full_name is null or char_length(full_name) between 1 and 120)
);

create unique index profiles_email_unique_idx
  on public.profiles (lower(email))
  where email is not null;

create table public.app_admins (
  user_id uuid primary key
    references auth.users (id) on delete cascade,
  created_by uuid
    references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint app_admins_cannot_grant_self_check
    check (created_by is null or created_by <> user_id)
);

create index app_admins_created_by_idx
  on public.app_admins (created_by)
  where created_by is not null;

create table private.admin_email_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admin_email_allowlist_lowercase_check
    check (email = lower(email)),
  constraint admin_email_allowlist_length_check
    check (char_length(email) between 3 and 320)
);

alter table public.profiles enable row level security;
alter table public.app_admins enable row level security;
alter table private.admin_email_allowlist enable row level security;

grant select on table public.profiles, public.app_admins to authenticated;
grant update (full_name) on table public.profiles to authenticated;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.app_admins
      where app_admins.user_id = (select auth.uid())
    );
$$;

revoke all on function private.is_super_admin() from public, anon;
grant execute on function private.is_super_admin() to authenticated;

create policy profiles_authenticated_read
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_super_admin())
  );

create policy profiles_self_update
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy app_admins_authenticated_read
  on public.app_admins
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_super_admin())
  );

create or replace function private.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    email_confirmed_at,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    new.id,
    lower(new.email),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    new.email_confirmed_at,
    new.last_sign_in_at,
    new.created_at,
    new.updated_at
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      email_confirmed_at = excluded.email_confirmed_at,
      last_sign_in_at = excluded.last_sign_in_at,
      updated_at = excluded.updated_at;

  if new.email is not null and exists (
    select 1
    from private.admin_email_allowlist
    where admin_email_allowlist.email = lower(new.email)
  ) then
    insert into public.app_admins (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_auth_user_profile() from public, anon, authenticated;

create trigger sync_auth_user_profile
  after insert or update of
    email,
    raw_user_meta_data,
    email_confirmed_at,
    last_sign_in_at
  on auth.users
  for each row
  execute function private.sync_auth_user_profile();

insert into public.profiles (
  id,
  email,
  full_name,
  email_confirmed_at,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  users.id,
  lower(users.email),
  nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
  users.email_confirmed_at,
  users.last_sign_in_at,
  users.created_at,
  users.updated_at
from auth.users
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    email_confirmed_at = excluded.email_confirmed_at,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = excluded.updated_at;

alter table public.restaurants
  add constraint restaurants_slug_length_check
  check (char_length(slug) between 2 and 80);

create or replace function public.create_restaurant(
  restaurant_name text,
  restaurant_slug text,
  restaurant_description text default null
)
returns public.restaurants
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_name text := trim(restaurant_name);
  normalized_slug text := lower(trim(restaurant_slug));
  normalized_description text := nullif(trim(restaurant_description), '');
  created_restaurant public.restaurants;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if char_length(normalized_name) not between 1 and 120 then
    raise exception 'Restaurant name must have between 1 and 120 characters'
      using errcode = '22023';
  end if;

  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(normalized_slug) not between 2 and 80 then
    raise exception 'Invalid restaurant slug' using errcode = '22023';
  end if;

  insert into public.restaurants (
    name,
    slug,
    description,
    is_published
  )
  values (
    normalized_name,
    normalized_slug,
    normalized_description,
    false
  )
  returning * into created_restaurant;

  insert into public.restaurant_members (
    restaurant_id,
    user_id,
    role
  )
  values (
    created_restaurant.id,
    current_user_id,
    'owner'
  );

  return created_restaurant;
end;
$$;

revoke all on function public.create_restaurant(text, text, text)
  from public, anon;
grant execute on function public.create_restaurant(text, text, text)
  to authenticated;

create or replace function public.admin_delete_user(
  target_user_id uuid,
  delete_owned_restaurants boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null or not (select private.is_super_admin()) then
    raise exception 'Super administrator access required'
      using errcode = '42501';
  end if;

  if target_user_id = current_user_id then
    raise exception 'A super administrator cannot delete their own account'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.app_admins
    where app_admins.user_id = target_user_id
  ) then
    raise exception 'Super administrator accounts require manual revocation'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.restaurant_members
    where restaurant_members.user_id = target_user_id
      and restaurant_members.role = 'owner'
  ) and not delete_owned_restaurants then
    raise exception 'The user owns restaurants; confirm their deletion first'
      using errcode = '23514';
  end if;

  if delete_owned_restaurants then
    delete from public.restaurants
    where exists (
      select 1
      from public.restaurant_members
      where restaurant_members.restaurant_id = restaurants.id
        and restaurant_members.user_id = target_user_id
        and restaurant_members.role = 'owner'
    );
  end if;

  delete from auth.users
  where users.id = target_user_id;

  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_delete_user(uuid, boolean)
  from public, anon;
grant execute on function public.admin_delete_user(uuid, boolean)
  to authenticated;

grant delete on table public.restaurants to authenticated;

drop policy restaurants_authenticated_read on public.restaurants;
create policy restaurants_authenticated_read
  on public.restaurants
  for select
  to authenticated
  using (
    is_published
    or (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = restaurants.id
        and member.user_id = (select auth.uid())
    )
  );

drop policy restaurants_manage_update on public.restaurants;
create policy restaurants_manage_update
  on public.restaurants
  for update
  to authenticated
  using (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = restaurants.id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = restaurants.id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

create policy restaurants_super_admin_delete
  on public.restaurants
  for delete
  to authenticated
  using ((select private.is_super_admin()));

drop policy restaurant_members_read_own on public.restaurant_members;
create policy restaurant_members_authenticated_read
  on public.restaurant_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_super_admin())
  );

drop policy dining_tables_manage on public.dining_tables;
create policy dining_tables_manage
  on public.dining_tables
  for all
  to authenticated
  using (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = dining_tables.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = dining_tables.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

drop policy menus_authenticated_read on public.menus;
create policy menus_authenticated_read
  on public.menus
  for select
  to authenticated
  using (
    (select private.is_super_admin())
    or (
      is_active
      and exists (
        select 1
        from public.restaurants
        where restaurants.id = menus.restaurant_id
          and restaurants.is_published
      )
    )
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menus.restaurant_id
        and member.user_id = (select auth.uid())
    )
  );

drop policy menus_manage_insert on public.menus;
create policy menus_manage_insert
  on public.menus
  for insert
  to authenticated
  with check (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menus.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

drop policy menus_manage_update on public.menus;
create policy menus_manage_update
  on public.menus
  for update
  to authenticated
  using (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menus.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menus.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

drop policy menus_manage_delete on public.menus;
create policy menus_manage_delete
  on public.menus
  for delete
  to authenticated
  using (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menus.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

drop policy menu_categories_authenticated_read on public.menu_categories;
create policy menu_categories_authenticated_read
  on public.menu_categories
  for select
  to authenticated
  using (
    (select private.is_super_admin())
    or (
      is_active
      and exists (
        select 1
        from public.menus
        join public.restaurants
          on restaurants.id = menus.restaurant_id
        where menus.id = menu_categories.menu_id
          and menus.restaurant_id = menu_categories.restaurant_id
          and menus.is_active
          and restaurants.is_published
      )
    )
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_categories.restaurant_id
        and member.user_id = (select auth.uid())
    )
  );

drop policy menu_categories_manage_insert on public.menu_categories;
create policy menu_categories_manage_insert
  on public.menu_categories
  for insert
  to authenticated
  with check (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_categories.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

drop policy menu_categories_manage_update on public.menu_categories;
create policy menu_categories_manage_update
  on public.menu_categories
  for update
  to authenticated
  using (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_categories.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_categories.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

drop policy menu_categories_manage_delete on public.menu_categories;
create policy menu_categories_manage_delete
  on public.menu_categories
  for delete
  to authenticated
  using (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_categories.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

drop policy menu_items_authenticated_read on public.menu_items;
create policy menu_items_authenticated_read
  on public.menu_items
  for select
  to authenticated
  using (
    (select private.is_super_admin())
    or (
      is_available
      and exists (
        select 1
        from public.menu_categories
        join public.menus
          on menus.id = menu_categories.menu_id
          and menus.restaurant_id = menu_categories.restaurant_id
        join public.restaurants
          on restaurants.id = menus.restaurant_id
        where menu_categories.id = menu_items.category_id
          and menu_categories.restaurant_id = menu_items.restaurant_id
          and menu_categories.is_active
          and menus.is_active
          and restaurants.is_published
      )
    )
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_items.restaurant_id
        and member.user_id = (select auth.uid())
    )
  );

drop policy menu_items_manage_insert on public.menu_items;
create policy menu_items_manage_insert
  on public.menu_items
  for insert
  to authenticated
  with check (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_items.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

drop policy menu_items_manage_update on public.menu_items;
create policy menu_items_manage_update
  on public.menu_items
  for update
  to authenticated
  using (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_items.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_items.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

drop policy menu_items_manage_delete on public.menu_items;
create policy menu_items_manage_delete
  on public.menu_items
  for delete
  to authenticated
  using (
    (select private.is_super_admin())
    or exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_items.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );
