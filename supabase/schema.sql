-- ============================================================
-- Alany Boutique · Schema Supabase
-- Roles: developer | admin | staff
-- ============================================================

-- Extensiones
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES (usuarios)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  whatsapp text,
  role text not null default 'admin'
    check (role in ('developer', 'admin', 'staff')),
  active_business_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfiles de usuarios. full_name se usa para vendedora/quien registró.';

-- ============================================================
-- 2. BUSINESSES
-- ============================================================
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text,
  facebook text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. BUSINESS_MEMBERS (relación usuario ↔ negocio)
-- ============================================================
create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'admin'
    check (role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

-- FK de profiles.active_business_id
alter table public.profiles
  drop constraint if exists profiles_active_business_id_fkey;

alter table public.profiles
  add constraint profiles_active_business_id_fkey
  foreign key (active_business_id) references public.businesses(id)
  on delete set null;

-- ============================================================
-- 4. PRODUCTS
-- ============================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,                          -- Nombre prenda
  brand text,                                  -- Marca
  category text not null default 'otro',       -- Tipo de ropa: blusas, vestidos, pantalones, etc.
  tags text[] default '{}',                    -- Etiquetas: Verano, Invierno, Otoño, Navideño, Escolar...
  presentation text,                           -- Talla / presentación simple (ej. "M", "Unitalla")
  cost_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  initial_stock integer not null default 0,
  stock integer not null default 0,
  min_stock integer not null default 0,
  image_url text,                              -- Cloudinary
  is_active boolean not null default true,
  purchase_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_business_id_idx on public.products(business_id);
create index if not exists products_is_active_idx on public.products(is_active);
create index if not exists products_tags_idx on public.products using gin(tags);

-- ============================================================
-- 5. CLIENTS
-- ============================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  whatsapp text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_business_id_idx on public.clients(business_id);

-- ============================================================
-- 6. ORDERS + ORDER_ITEMS
-- ============================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  seller_id uuid references public.profiles(id) on delete set null,  -- Quién vendió (auto)
  order_number serial,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'en_proceso', 'entregado', 'pagado', 'cancelado')),
  total_sale numeric(12,2) not null default 0,
  total_cost numeric(12,2) not null default 0,
  total_profit numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Numeración por negocio (opcional, se puede mejorar con trigger)
create index if not exists orders_business_id_idx on public.orders(business_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  sale_price numeric(12,2) not null default 0,
  cost_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- ============================================================
-- 7. EXPENSES + EXPENSE_ITEMS
-- ============================================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,  -- Quién registró
  expense_number serial,
  category text not null default 'General',
  total_amount numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_business_id_idx on public.expenses(business_id);

create table if not exists public.expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  concept text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists expense_items_expense_id_idx on public.expense_items(expense_id);

-- ============================================================
-- 8. INVENTORY_MOVEMENTS
-- ============================================================
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null
    check (movement_type in ('entrada', 'salida', 'ajuste')),
  quantity integer not null check (quantity > 0),
  stock_before integer,
  stock_after integer,
  reference_type text,          -- 'order' | 'product' | 'adjustment'
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_business_id_idx on public.inventory_movements(business_id);
create index if not exists inventory_movements_product_id_idx on public.inventory_movements(product_id);
create index if not exists inventory_movements_created_at_idx on public.inventory_movements(created_at desc);

-- ============================================================
-- 9. BUSINESS_GOALS (metas opcionales)
-- ============================================================
create table if not exists public.business_goals (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  daily_sales_goal numeric(12,2) not null default 500,
  monthly_profit_goal numeric(12,2) not null default 5000,
  goal_mode text not null default 'manual' check (goal_mode in ('manual', 'auto')),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 10. APP_MODULES (panel Developer)
-- ============================================================
create table if not exists public.app_modules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  icon text,
  path text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed de módulos iniciales
insert into public.app_modules (key, name, description, icon, path, is_active, sort_order)
values
  ('dashboard', 'Dashboard', 'KPIs y resumen', 'home', '/dashboard', true, 1),
  ('products', 'Productos', 'Catálogo e inventario', 'package', '/productos', true, 2),
  ('orders', 'Pedidos', 'Ventas y pedidos', 'shopping-bag', '/pedidos', true, 3),
  ('clients', 'Clientes', 'Directorio de clientes', 'users', '/clientes', true, 4),
  ('expenses', 'Gastos', 'Control de gastos', 'wallet', '/gastos', true, 5),
  ('reports', 'Reportes', 'PDF y Excel', 'file-text', '/reportes', true, 6)
on conflict (key) do nothing;

-- ============================================================
-- 11. TRIGGER: crear profile al registrarse
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, whatsapp, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Usuario'),
    new.raw_user_meta_data->>'whatsapp',
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 12. TRIGGER: updated_at automático
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'businesses', 'products', 'clients', 'orders', 'expenses', 'app_modules']
  loop
    execute format('
      drop trigger if exists set_updated_at on public.%I;
      create trigger set_updated_at
        before update on public.%I
        for each row execute function public.set_updated_at();
    ', t, t);
  end loop;
end;
$$;

-- ============================================================
-- 13. TRIGGER: recalcular totales de pedido al cambiar items
-- (opcional, se puede hacer desde el cliente; aquí dejamos helper)
-- ============================================================
create or replace function public.recalc_order_totals(p_order_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_sale numeric(12,2);
  v_cost numeric(12,2);
begin
  select
    coalesce(sum(quantity * sale_price), 0),
    coalesce(sum(quantity * cost_price), 0)
  into v_sale, v_cost
  from public.order_items
  where order_id = p_order_id;

  update public.orders
  set
    total_sale = v_sale,
    total_cost = v_cost,
    total_profit = v_sale - v_cost,
    updated_at = now()
  where id = p_order_id;
end;
$$;

-- ============================================================
-- 14. ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.products enable row level security;
alter table public.clients enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.business_goals enable row level security;
alter table public.app_modules enable row level security;

-- Helper: ¿es developer?
create or replace function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'developer' and is_active = true
  );
$$;

-- Helper: negocios del usuario
create or replace function public.user_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.business_members where user_id = auth.uid()
  union
  select active_business_id from public.profiles
  where id = auth.uid() and active_business_id is not null;
$$;

-- ---- PROFILES ----
create policy "profiles_select_own_or_developer"
  on public.profiles for select
  using (id = auth.uid() or public.is_developer());

create policy "profiles_update_own_or_developer"
  on public.profiles for update
  using (id = auth.uid() or public.is_developer());

create policy "profiles_insert_developer"
  on public.profiles for insert
  with check (public.is_developer() or id = auth.uid());

-- ---- BUSINESSES ----
create policy "businesses_select_member_or_developer"
  on public.businesses for select
  using (
    public.is_developer()
    or id in (select public.user_business_ids())
  );

create policy "businesses_all_developer"
  on public.businesses for all
  using (public.is_developer())
  with check (public.is_developer());

-- ---- BUSINESS_MEMBERS ----
create policy "members_select_own_or_developer"
  on public.business_members for select
  using (user_id = auth.uid() or public.is_developer());

create policy "members_all_developer"
  on public.business_members for all
  using (public.is_developer())
  with check (public.is_developer());

-- ---- PRODUCTS ----
create policy "products_select_member"
  on public.products for select
  using (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  );

create policy "products_insert_member"
  on public.products for insert
  with check (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  );

create policy "products_update_member"
  on public.products for update
  using (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  );

create policy "products_delete_member"
  on public.products for delete
  using (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  );

-- ---- CLIENTS ----
create policy "clients_all_member"
  on public.clients for all
  using (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  )
  with check (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  );

-- ---- ORDERS ----
create policy "orders_all_member"
  on public.orders for all
  using (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  )
  with check (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  );

-- ---- ORDER_ITEMS ----
create policy "order_items_all_via_order"
  on public.order_items for all
  using (
    public.is_developer()
    or exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.business_id in (select public.user_business_ids())
    )
  )
  with check (
    public.is_developer()
    or exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.business_id in (select public.user_business_ids())
    )
  );

-- ---- EXPENSES ----
create policy "expenses_all_member"
  on public.expenses for all
  using (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  )
  with check (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  );

-- ---- EXPENSE_ITEMS ----
create policy "expense_items_all_via_expense"
  on public.expense_items for all
  using (
    public.is_developer()
    or exists (
      select 1 from public.expenses e
      where e.id = expense_id
        and e.business_id in (select public.user_business_ids())
    )
  )
  with check (
    public.is_developer()
    or exists (
      select 1 from public.expenses e
      where e.id = expense_id
        and e.business_id in (select public.user_business_ids())
    )
  );

-- ---- INVENTORY_MOVEMENTS ----
create policy "inventory_all_member"
  on public.inventory_movements for all
  using (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  )
  with check (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  );

-- ---- BUSINESS_GOALS ----
create policy "goals_all_member"
  on public.business_goals for all
  using (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  )
  with check (
    public.is_developer()
    or business_id in (select public.user_business_ids())
  );

-- ---- APP_MODULES (todos leen, solo developer escribe) ----
create policy "modules_select_authenticated"
  on public.app_modules for select
  to authenticated
  using (true);

create policy "modules_all_developer"
  on public.app_modules for all
  using (public.is_developer())
  with check (public.is_developer());

-- ============================================================
-- 15. SEED: negocio Alany Boutique (ejecutar una vez)
-- ============================================================
-- Descomenta y ejecuta después de crear tu usuario developer:
/*
insert into public.businesses (id, name, whatsapp, facebook)
values (
  '00000000-0000-0000-0000-000000000001',
  'Alany Boutique',
  '8716079531',
  'Alany boutique'
);

-- Asigna el negocio a tu perfil developer (reemplaza TU_USER_ID):
-- update public.profiles
-- set active_business_id = '00000000-0000-0000-0000-000000000001',
--     role = 'developer'
-- where id = 'TU_USER_ID';

-- insert into public.business_members (business_id, user_id, role)
-- values (
--   '00000000-0000-0000-0000-000000000001',
--   'TU_USER_ID',
--   'admin'
-- );
*/

-- ============================================================
-- FIN DEL SCHEMA
-- ============================================================
