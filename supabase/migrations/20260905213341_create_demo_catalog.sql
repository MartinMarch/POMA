create table public.restaurants (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text,
  currency_code text not null default 'EUR',
  locale text not null default 'es-ES',
  timezone text not null default 'Europe/Madrid',
  logo_url text,
  cover_image_url text,
  accent_color text not null default '#e4572e',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_slug_format_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint restaurants_name_length_check
    check (char_length(name) between 1 and 120),
  constraint restaurants_currency_code_check
    check (currency_code ~ '^[A-Z]{3}$'),
  constraint restaurants_accent_color_check
    check (accent_color ~ '^#[0-9a-fA-F]{6}$')
);

create table public.restaurant_members (
  restaurant_id bigint not null
    references public.restaurants (id) on delete cascade,
  user_id uuid not null
    references auth.users (id) on delete cascade,
  role text not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id),
  constraint restaurant_members_role_check
    check (role in ('owner', 'admin', 'manager', 'staff', 'kitchen'))
);

create index restaurant_members_user_id_idx
  on public.restaurant_members (user_id, restaurant_id);

create table public.dining_tables (
  id bigint generated always as identity primary key,
  restaurant_id bigint not null
    references public.restaurants (id) on delete cascade,
  name text not null,
  public_token uuid not null default gen_random_uuid() unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, restaurant_id),
  unique (restaurant_id, name),
  constraint dining_tables_name_length_check
    check (char_length(name) between 1 and 80)
);

create index dining_tables_restaurant_active_idx
  on public.dining_tables (restaurant_id, is_active);

create table public.menus (
  id bigint generated always as identity primary key,
  restaurant_id bigint not null
    references public.restaurants (id) on delete cascade,
  name text not null,
  is_active boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id),
  constraint menus_name_length_check
    check (char_length(name) between 1 and 120),
  constraint menus_active_published_check
    check (not is_active or published_at is not null)
);

create unique index menus_one_active_per_restaurant_idx
  on public.menus (restaurant_id)
  where is_active;

create table public.menu_categories (
  id bigint generated always as identity primary key,
  restaurant_id bigint not null,
  menu_id bigint not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, restaurant_id),
  foreign key (menu_id, restaurant_id)
    references public.menus (id, restaurant_id) on delete cascade,
  constraint menu_categories_name_length_check
    check (char_length(name) between 1 and 120),
  constraint menu_categories_sort_order_check
    check (sort_order >= 0)
);

create index menu_categories_catalog_idx
  on public.menu_categories (restaurant_id, menu_id, is_active, sort_order);

create table public.menu_items (
  id bigint generated always as identity primary key,
  restaurant_id bigint not null,
  category_id bigint not null,
  name text not null,
  description text,
  price_cents integer not null,
  emoji text,
  image_url text,
  allergens text[] not null default '{}',
  sort_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id),
  foreign key (category_id, restaurant_id)
    references public.menu_categories (id, restaurant_id) on delete cascade,
  constraint menu_items_name_length_check
    check (char_length(name) between 1 and 160),
  constraint menu_items_price_cents_check
    check (price_cents >= 0),
  constraint menu_items_sort_order_check
    check (sort_order >= 0)
);

create index menu_items_catalog_idx
  on public.menu_items (
    restaurant_id,
    category_id,
    is_available,
    sort_order
  );

alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.dining_tables enable row level security;
alter table public.menus enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

grant select on table public.restaurants to anon, authenticated;
grant update on table public.restaurants to authenticated;
grant select on table public.menus to anon, authenticated;
grant select on table public.menu_categories to anon, authenticated;
grant select on table public.menu_items to anon, authenticated;

grant select on table public.restaurant_members to authenticated;

grant select, insert, update, delete
  on table public.dining_tables,
    public.menus,
    public.menu_categories,
    public.menu_items
  to authenticated;

grant usage, select on all sequences in schema public to authenticated;

create policy restaurants_public_read
  on public.restaurants
  for select
  to anon
  using (is_published);

create policy restaurants_authenticated_read
  on public.restaurants
  for select
  to authenticated
  using (
    is_published
    or exists (
        select 1
        from public.restaurant_members as member
        where member.restaurant_id = restaurants.id
          and member.user_id = (select auth.uid())
    )
  );

create policy restaurants_manage_update
  on public.restaurants
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = restaurants.id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = restaurants.id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

create policy restaurant_members_read_own
  on public.restaurant_members
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy dining_tables_manage
  on public.dining_tables
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = dining_tables.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = dining_tables.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

create policy menus_public_read
  on public.menus
  for select
  to anon
  using (
    is_active
    and exists (
      select 1
      from public.restaurants
      where restaurants.id = menus.restaurant_id
        and restaurants.is_published
    )
  );

create policy menus_authenticated_read
  on public.menus
  for select
  to authenticated
  using (
    (
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

create policy menus_manage_insert
  on public.menus
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menus.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

create policy menus_manage_update
  on public.menus
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menus.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menus.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

create policy menus_manage_delete
  on public.menus
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menus.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

create policy menu_categories_public_read
  on public.menu_categories
  for select
  to anon
  using (
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
  );

create policy menu_categories_authenticated_read
  on public.menu_categories
  for select
  to authenticated
  using (
    (
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

create policy menu_categories_manage_insert
  on public.menu_categories
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_categories.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

create policy menu_categories_manage_update
  on public.menu_categories
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_categories.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_categories.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

create policy menu_categories_manage_delete
  on public.menu_categories
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_categories.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

create policy menu_items_public_read
  on public.menu_items
  for select
  to anon
  using (
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
  );

create policy menu_items_authenticated_read
  on public.menu_items
  for select
  to authenticated
  using (
    (
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

create policy menu_items_manage_insert
  on public.menu_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_items.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

create policy menu_items_manage_update
  on public.menu_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_items.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_items.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

create policy menu_items_manage_delete
  on public.menu_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.restaurant_members as member
      where member.restaurant_id = menu_items.restaurant_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'manager')
    )
  );

do $$
declare
  demo_restaurant_id bigint;
  demo_menu_id bigint;
  para_compartir_id bigint;
  principales_id bigint;
  bebidas_id bigint;
begin
  insert into public.restaurants (
    slug,
    name,
    description,
    accent_color,
    is_published
  )
  values (
    'demo',
    'DEMO',
    'Cocina honesta, producto local y una sobremesa sin prisas.',
    '#ef5b36',
    true
  )
  returning id into demo_restaurant_id;

  insert into public.dining_tables (
    restaurant_id,
    name,
    public_token
  )
  values (
    demo_restaurant_id,
    'Mesa 1',
    'c0ffee00-0000-4000-8000-000000000001'
  );

  insert into public.menus (
    restaurant_id,
    name,
    is_active,
    published_at
  )
  values (
    demo_restaurant_id,
    'Carta principal',
    true,
    now()
  )
  returning id into demo_menu_id;

  insert into public.menu_categories (
    restaurant_id,
    menu_id,
    name,
    description,
    sort_order
  )
  values (
    demo_restaurant_id,
    demo_menu_id,
    'Para compartir',
    'El mejor comienzo para el centro de la mesa.',
    10
  )
  returning id into para_compartir_id;

  insert into public.menu_categories (
    restaurant_id,
    menu_id,
    name,
    description,
    sort_order
  )
  values (
    demo_restaurant_id,
    demo_menu_id,
    'Principales',
    'Platos completos preparados al momento.',
    20
  )
  returning id into principales_id;

  insert into public.menu_categories (
    restaurant_id,
    menu_id,
    name,
    description,
    sort_order
  )
  values (
    demo_restaurant_id,
    demo_menu_id,
    'Bebidas',
    'Frías, locales y listas para brindar.',
    30
  )
  returning id into bebidas_id;

  insert into public.menu_items (
    restaurant_id,
    category_id,
    name,
    description,
    price_cents,
    emoji,
    allergens,
    sort_order
  )
  values
    (demo_restaurant_id, para_compartir_id, 'Bravas POMA', 'Patata crujiente, alioli suave y salsa brava ahumada.', 690, '🥔', array['huevo'], 10),
    (demo_restaurant_id, para_compartir_id, 'Croquetas de jamón', 'Cremosas por dentro, crujientes por fuera. Seis unidades.', 850, '🧆', array['gluten', 'leche'], 20),
    (demo_restaurant_id, para_compartir_id, 'Pan con tomate', 'Pan de coca tostado, tomate de colgar y aceite de oliva.', 390, '🍅', array['gluten'], 30),
    (demo_restaurant_id, principales_id, 'Smash burger', 'Doble carne, cheddar, cebolla encurtida y salsa de la casa.', 1390, '🍔', array['gluten', 'leche', 'huevo'], 10),
    (demo_restaurant_id, principales_id, 'Bowl mediterráneo', 'Falafel, hummus, verduras asadas, cuscús y hierbas frescas.', 1250, '🥗', array['gluten', 'sésamo'], 20),
    (demo_restaurant_id, principales_id, 'Pollo a la brasa', 'Medio pollo marinado, patatas y ensalada de temporada.', 1480, '🍗', array[]::text[], 30),
    (demo_restaurant_id, bebidas_id, 'Cerveza artesana', 'Lager local, fresca y ligera. 33 cl.', 320, '🍺', array['gluten'], 10),
    (demo_restaurant_id, bebidas_id, 'Vermut de la casa', 'Rojo, servido con naranja y aceituna.', 450, '🍊', array['sulfitos'], 20),
    (demo_restaurant_id, bebidas_id, 'Agua mineral', 'Botella de 50 cl.', 220, '💧', array[]::text[], 30);
end
$$;
