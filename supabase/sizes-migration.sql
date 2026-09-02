-- Tallas por producto + talla en partidas de pedido
-- Pegar en SQL Editor de Supabase y Run

alter table public.products
  add column if not exists audience text default 'mujer';

alter table public.products
  add column if not exists sizes jsonb default '{}'::jsonb;

alter table public.order_items
  add column if not exists size text;

-- Opcional: índice
create index if not exists products_audience_idx on public.products (audience);

comment on column public.products.audience is 'mujer | hombre | nino | nina | unisex';
comment on column public.products.sizes is 'Ej: {"CH":2,"M":1,"7":3}';
comment on column public.order_items.size is 'Talla vendida, ej. 7 o CH';
