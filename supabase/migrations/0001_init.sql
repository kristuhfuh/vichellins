-- Vichellins Nation: catalogue, orders, inventory, content, analytics.
-- Money is stored as whole naira (integer). Deliveries are Lagos only.

-- ---------------------------------------------------------------- enums
create type product_status as enum ('draft', 'published', 'archived');
create type product_condition as enum ('new', 'refurbished', 'used');
create type warranty_type as enum ('manufacturer', 'store', 'none');
create type authenticity_status as enum ('verified', 'unverified');
create type spec_type as enum ('text', 'number', 'select', 'boolean');
create type order_status as enum (
  'pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'
);
create type payment_status as enum ('unpaid', 'paid', 'failed', 'refunded');
create type payment_method as enum ('transfer', 'cod', 'card');
create type staff_role as enum ('owner', 'staff', 'editor');

-- ------------------------------------------------------------- catalogue
create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  slug text not null unique,
  description text not null default '',
  kind text not null default 'phone',
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  check (parent_id is distinct from id)
);
create index categories_parent_idx on categories (parent_id);

create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  logo_url text
);

-- Spec fields a category's products fill in. Children inherit their parent's.
create table spec_definitions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label text not null,
  type spec_type not null default 'text',
  unit text,
  options text[],
  filterable boolean not null default false,
  required boolean not null default false,
  sort_order integer not null default 0,
  unique (category_id, key)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (length(trim(name)) > 0),
  brand_id uuid references brands (id) on delete set null,
  category_id uuid not null references categories (id) on delete restrict,
  description text not null default '',
  highlights text[] not null default '{}',
  status product_status not null default 'draft',
  featured boolean not null default false,
  condition product_condition not null default 'new',
  warranty_months integer not null default 0 check (warranty_months >= 0),
  warranty_type warranty_type not null default 'none',
  warranty_notes text,
  authenticity_status authenticity_status not null default 'unverified',
  authenticity_notes text,
  specs jsonb not null default '{}',
  kind text,
  tone text,
  popularity integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on products (category_id);
create index products_status_idx on products (status);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  url text not null,
  alt text not null default '',
  sort_order integer not null default 0
);
create index product_images_product_idx on product_images (product_id, sort_order);

create table product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  unique (product_id, name)
);

create table product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references product_options (id) on delete cascade,
  value text not null,
  position integer not null default 0,
  unique (option_id, value)
);

create table variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  sku text not null unique,
  option_values jsonb not null default '{}',
  price integer not null check (price >= 0),
  compare_at_price integer check (compare_at_price is null or compare_at_price >= price),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index variants_product_options_idx on variants (product_id, option_values);

-- ----------------------------------------------------------------- sales
create table delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fee integer not null check (fee >= 0),
  eta text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  kind text not null check (kind in ('percent', 'fixed')),
  value integer not null check (value > 0 and (kind <> 'percent' or value <= 100)),
  min_subtotal integer not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true
);
create unique index discount_codes_code_idx on discount_codes (upper(code));

create sequence order_number_seq start 1001;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  status order_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  payment_method payment_method not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  address text not null,
  zone_id uuid references delivery_zones (id) on delete set null,
  zone_name text not null,
  delivery_fee integer not null check (delivery_fee >= 0),
  subtotal integer not null default 0 check (subtotal >= 0),
  discount_total integer not null default 0 check (discount_total >= 0),
  discount_code text,
  total integer not null default 0 check (total >= 0),
  notes text,
  internal_notes text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on orders (status, created_at desc);
create index orders_phone_idx on orders (customer_phone);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  variant_id uuid references variants (id) on delete set null,
  product_id uuid references products (id) on delete set null,
  -- Snapshots, so later edits to a product never change an old order.
  name text not null,
  variant_label text not null default '',
  sku text,
  unit_price integer not null check (unit_price >= 0),
  qty integer not null check (qty > 0),
  warranty_months integer not null default 0,
  warranty_type warranty_type not null default 'none'
);
create index order_items_order_idx on order_items (order_id);

create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  status order_status not null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on order_events (order_id, created_at);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  method payment_method not null,
  amount integer not null check (amount >= 0),
  status payment_status not null default 'unpaid',
  provider text,
  provider_ref text,
  proof_url text,
  created_at timestamptz not null default now()
);
create index payments_order_idx on payments (order_id);
create unique index payments_provider_ref_idx on payments (provider, provider_ref) where provider_ref is not null;

create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references variants (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('sale', 'restock', 'correction', 'return', 'cancel')),
  order_id uuid references orders (id) on delete set null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_idx on inventory_movements (variant_id, created_at desc);

-- --------------------------------------------------------------- content
create table content_blocks (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null default '',
  body jsonb not null default '{}',
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value jsonb not null default '{}'
);

create table staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role staff_role not null default 'staff',
  name text not null default ''
);

create table analytics_events (
  id bigint generated always as identity primary key,
  event text not null check (event in ('page_view', 'product_view', 'add_to_cart', 'checkout_start', 'whatsapp_click')),
  product_id uuid references products (id) on delete set null,
  session_id text check (session_id is null or length(session_id) <= 64),
  path text check (path is null or length(path) <= 300),
  source text check (source is null or length(source) <= 100),
  created_at timestamptz not null default now()
);
create index analytics_events_created_idx on analytics_events (created_at desc);
create index analytics_events_product_idx on analytics_events (product_id, event);

-- -------------------------------------------------------------- triggers
create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger products_updated before update on products
  for each row execute function set_updated_at();
create trigger orders_updated before update on orders
  for each row execute function set_updated_at();
create trigger content_blocks_updated before update on content_blocks
  for each row execute function set_updated_at();

-- ------------------------------------------------------- access helpers
create function has_role(roles staff_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid() and role = any (roles));
$$;

create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select has_role(array['owner', 'staff']::staff_role[]);
$$;

create function norm_phone(p text) returns text
language sql immutable as $$
  select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10);
$$;

-- ------------------------------------------------------------- order RPC
-- The only way customers create orders. Prices, stock and delivery fees are
-- read from the database inside one transaction; nothing numeric is trusted
-- from the browser. Variant rows are locked in id order so two shoppers buying
-- the last unit can't both succeed, and concurrent orders can't deadlock.
create function place_order(
  p_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_zone_id uuid,
  p_payment payment_method,
  p_notes text,
  p_items jsonb,
  p_discount_code text default null,
  p_source text default null
) returns table (order_id uuid, order_number text, total integer)
language plpgsql security definer set search_path = public as $$
declare
  v_zone delivery_zones%rowtype;
  v_variant variants%rowtype;
  v_product products%rowtype;
  v_code discount_codes%rowtype;
  v_line record;
  v_order_id uuid;
  v_number text;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_label text;
begin
  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'invalid_name';
  end if;
  if length(norm_phone(p_phone)) <> 10 then
    raise exception 'invalid_phone';
  end if;
  if length(trim(coalesce(p_address, ''))) < 8 then
    raise exception 'invalid_address';
  end if;
  if p_payment = 'card' then
    raise exception 'payment_method_unavailable';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid_items';
  end if;

  select * into v_zone from delivery_zones where id = p_zone_id and is_active;
  if not found then
    raise exception 'invalid_zone';
  end if;

  v_number := 'VN-' || lpad(nextval('order_number_seq')::text, 5, '0');

  insert into orders (
    order_number, payment_method, customer_name, customer_phone, customer_email,
    address, zone_id, zone_name, delivery_fee, notes, source
  ) values (
    v_number, p_payment, trim(p_name), trim(p_phone), nullif(trim(coalesce(p_email, '')), ''),
    trim(p_address), v_zone.id, v_zone.name, v_zone.fee, nullif(trim(coalesce(p_notes, '')), ''),
    nullif(trim(coalesce(p_source, '')), '')
  ) returning id into v_order_id;

  for v_line in
    select (e ->> 'variant_id')::uuid as variant_id, sum((e ->> 'qty')::integer)::integer as qty
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1
  loop
    if v_line.qty is null or v_line.qty < 1 or v_line.qty > 10 then
      raise exception 'invalid_quantity';
    end if;

    select * into v_variant from variants where id = v_line.variant_id and is_active for update;
    if not found then
      raise exception 'variant_unavailable';
    end if;

    select * into v_product from products where id = v_variant.product_id and status = 'published';
    if not found then
      raise exception 'variant_unavailable';
    end if;

    if v_variant.stock < v_line.qty then
      raise exception 'insufficient_stock' using detail = v_product.name;
    end if;

    update variants set stock = stock - v_line.qty where id = v_variant.id;

    -- Label in the product's own option order (Storage / Colour), matching the storefront.
    select coalesce(string_agg(v_variant.option_values ->> o.name, ' / ' order by o.position), '')
    into v_label
    from product_options o
    where o.product_id = v_product.id and v_variant.option_values ? o.name;

    insert into order_items (
      order_id, variant_id, product_id, name, variant_label, sku, unit_price, qty,
      warranty_months, warranty_type
    ) values (
      v_order_id, v_variant.id, v_product.id, v_product.name, v_label, v_variant.sku,
      v_variant.price, v_line.qty, v_product.warranty_months, v_product.warranty_type
    );

    insert into inventory_movements (variant_id, delta, reason, order_id)
    values (v_variant.id, -v_line.qty, 'sale', v_order_id);

    v_subtotal := v_subtotal + v_variant.price * v_line.qty;
  end loop;

  if coalesce(trim(p_discount_code), '') <> '' then
    select * into v_code from discount_codes
    where upper(code) = upper(trim(p_discount_code))
      and is_active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
      and (max_uses is null or used_count < max_uses)
    for update;
    if not found or v_subtotal < v_code.min_subtotal then
      raise exception 'invalid_discount';
    end if;
    v_discount := case v_code.kind
      when 'percent' then floor(v_subtotal * v_code.value / 100.0)::integer
      else least(v_code.value, v_subtotal)
    end;
    update discount_codes set used_count = used_count + 1 where id = v_code.id;
  end if;

  update orders
  set subtotal = v_subtotal,
      discount_total = v_discount,
      discount_code = case when v_discount > 0 then upper(trim(p_discount_code)) end,
      total = v_subtotal - v_discount + v_zone.fee
  where id = v_order_id;

  insert into order_events (order_id, status, note) values (v_order_id, 'pending', 'Order placed');

  return query select v_order_id, v_number, v_subtotal - v_discount + v_zone.fee;
end $$;

-- Lets a customer look up their own order. The phone number acts as the secret,
-- so the lookup returns nothing (not an error) when it doesn't match.
create function track_order(p_order_number text, p_phone text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order from orders
  where order_number = upper(trim(p_order_number))
    and norm_phone(customer_phone) = norm_phone(p_phone)
    and length(norm_phone(p_phone)) = 10;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'created_at', v_order.created_at,
    'zone_name', v_order.zone_name,
    'delivery_fee', v_order.delivery_fee,
    'subtotal', v_order.subtotal,
    'discount_total', v_order.discount_total,
    'total', v_order.total,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', i.name, 'variant_label', i.variant_label, 'qty', i.qty, 'unit_price', i.unit_price
      ) order by i.name), '[]'::jsonb)
      from order_items i where i.order_id = v_order.id
    ),
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'status', e.status, 'note', e.note, 'at', e.created_at
      ) order by e.created_at), '[]'::jsonb)
      from order_events e where e.order_id = v_order.id
    )
  );
end $$;

-- ------------------------------------------------------- staff order RPCs
create function set_order_status(p_order_id uuid, p_status order_status, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_item record;
begin
  if not is_staff() then
    raise exception 'forbidden';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  if not (
    (v_order.status = 'pending' and p_status in ('confirmed', 'cancelled')) or
    (v_order.status = 'confirmed' and p_status in ('packed', 'cancelled')) or
    (v_order.status = 'packed' and p_status in ('out_for_delivery', 'cancelled')) or
    (v_order.status = 'out_for_delivery' and p_status in ('delivered', 'cancelled')) or
    (v_order.status = 'delivered' and p_status = 'refunded')
  ) then
    raise exception 'invalid_transition' using detail = v_order.status || ' -> ' || p_status;
  end if;

  if p_status = 'cancelled' then
    -- Put reserved stock back, in variant id order to match place_order's lock order.
    for v_item in
      select variant_id, sum(qty)::integer as qty from order_items
      where order_id = v_order.id and variant_id is not null
      group by variant_id order by variant_id
    loop
      update variants set stock = stock + v_item.qty where id = v_item.variant_id;
      insert into inventory_movements (variant_id, delta, reason, order_id, created_by)
      values (v_item.variant_id, v_item.qty, 'cancel', v_order.id, auth.uid());
    end loop;
  end if;

  update orders
  set status = p_status,
      payment_status = case
        when p_status = 'refunded' then 'refunded'::payment_status
        when p_status = 'cancelled' and payment_status = 'paid' then 'refunded'::payment_status
        else payment_status
      end
  where id = v_order.id;

  insert into order_events (order_id, status, note, created_by)
  values (v_order.id, p_status, p_note, auth.uid());
end $$;

create function adjust_stock(p_variant_id uuid, p_delta integer, p_reason text, p_note text default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_stock integer;
begin
  if not is_staff() then
    raise exception 'forbidden';
  end if;
  if p_reason not in ('restock', 'correction', 'return') then
    raise exception 'invalid_reason';
  end if;
  if p_delta = 0 then
    raise exception 'invalid_delta';
  end if;

  update variants set stock = stock + p_delta where id = p_variant_id returning stock into v_stock;
  if not found then
    raise exception 'variant_not_found';
  end if;

  insert into inventory_movements (variant_id, delta, reason, note, created_by)
  values (p_variant_id, p_delta, p_reason, p_note, auth.uid());
  return v_stock;
end $$;

-- Initial stock entered with a new variant is logged as a restock.
create function log_initial_stock() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stock > 0 then
    insert into inventory_movements (variant_id, delta, reason, note, created_by)
    values (new.id, new.stock, 'restock', 'Initial stock', auth.uid());
  end if;
  return new;
end $$;

create trigger variants_initial_stock after insert on variants
  for each row execute function log_initial_stock();

-- Stock and order changes only go through the functions above.
revoke all on function place_order, track_order, set_order_status, adjust_stock from public;
grant execute on function place_order, track_order to anon, authenticated;
grant execute on function set_order_status, adjust_stock to authenticated;
-- Supabase grants new functions to anon by default; staff-only ones must not be callable anonymously.
revoke all on function set_order_status, adjust_stock from anon;
revoke all on function has_role, is_staff from public;
grant execute on function has_role, is_staff to anon, authenticated;

-- ------------------------------------------------------ row level security
alter table categories enable row level security;
alter table brands enable row level security;
alter table spec_definitions enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_options enable row level security;
alter table product_option_values enable row level security;
alter table variants enable row level security;
alter table delivery_zones enable row level security;
alter table discount_codes enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_events enable row level security;
alter table payments enable row level security;
alter table inventory_movements enable row level security;
alter table content_blocks enable row level security;
alter table settings enable row level security;
alter table staff enable row level security;
alter table analytics_events enable row level security;

-- Public storefront reads.
create policy "public reads active categories" on categories for select using (is_active);
create policy "public reads brands" on brands for select using (true);
create policy "public reads spec definitions" on spec_definitions for select using (true);
create policy "public reads published products" on products for select using (status = 'published');
create policy "public reads images of published products" on product_images for select
  using (exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy "public reads options of published products" on product_options for select
  using (exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy "public reads option values of published products" on product_option_values for select
  using (exists (
    select 1 from product_options o join products p on p.id = o.product_id
    where o.id = option_id and p.status = 'published'
  ));
create policy "public reads active variants of published products" on variants for select
  using (is_active and exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy "public reads active delivery zones" on delivery_zones for select using (is_active);
create policy "public reads published content" on content_blocks for select using (is_published);

-- Shoppers may record anonymous events but never read them.
create policy "anyone records analytics" on analytics_events for insert
  with check (true);

-- Editors manage catalogue content; owners and staff manage everything commercial.
create policy "content staff manage categories" on categories for all
  using (has_role(array['owner', 'staff', 'editor']::staff_role[]))
  with check (has_role(array['owner', 'staff', 'editor']::staff_role[]));
create policy "content staff manage brands" on brands for all
  using (has_role(array['owner', 'staff', 'editor']::staff_role[]))
  with check (has_role(array['owner', 'staff', 'editor']::staff_role[]));
create policy "content staff manage spec definitions" on spec_definitions for all
  using (has_role(array['owner', 'staff', 'editor']::staff_role[]))
  with check (has_role(array['owner', 'staff', 'editor']::staff_role[]));
create policy "content staff manage products" on products for all
  using (has_role(array['owner', 'staff', 'editor']::staff_role[]))
  with check (has_role(array['owner', 'staff', 'editor']::staff_role[]));
create policy "content staff manage images" on product_images for all
  using (has_role(array['owner', 'staff', 'editor']::staff_role[]))
  with check (has_role(array['owner', 'staff', 'editor']::staff_role[]));
create policy "content staff manage options" on product_options for all
  using (has_role(array['owner', 'staff', 'editor']::staff_role[]))
  with check (has_role(array['owner', 'staff', 'editor']::staff_role[]));
create policy "content staff manage option values" on product_option_values for all
  using (has_role(array['owner', 'staff', 'editor']::staff_role[]))
  with check (has_role(array['owner', 'staff', 'editor']::staff_role[]));
create policy "content staff manage content" on content_blocks for all
  using (has_role(array['owner', 'staff', 'editor']::staff_role[]))
  with check (has_role(array['owner', 'staff', 'editor']::staff_role[]));

create policy "staff manage variants" on variants for all
  using (is_staff()) with check (is_staff());
create policy "staff read all variants" on variants for select using (is_staff());
create policy "staff manage delivery zones" on delivery_zones for all
  using (is_staff()) with check (is_staff());
create policy "staff manage discount codes" on discount_codes for all
  using (is_staff()) with check (is_staff());

-- Orders are read and edited by staff only; status changes should use set_order_status.
create policy "staff read orders" on orders for select using (is_staff());
create policy "staff update orders" on orders for update using (is_staff()) with check (is_staff());
create policy "staff read order items" on order_items for select using (is_staff());
create policy "staff read order events" on order_events for select using (is_staff());
create policy "staff manage payments" on payments for all using (is_staff()) with check (is_staff());
create policy "staff read inventory movements" on inventory_movements for select using (is_staff());
create policy "staff read analytics" on analytics_events for select using (is_staff());

create policy "owner manages settings" on settings for all
  using (has_role(array['owner']::staff_role[])) with check (has_role(array['owner']::staff_role[]));
create policy "staff read own record" on staff for select using (user_id = auth.uid());
create policy "owner manages staff" on staff for all
  using (has_role(array['owner']::staff_role[])) with check (has_role(array['owner']::staff_role[]));

-- Column-level limits so the admin can't bypass the audited paths:
-- stock changes go through adjust_stock, order status through set_order_status.
revoke update on variants from anon, authenticated;
grant update (sku, option_values, price, compare_at_price, low_stock_threshold, is_active)
  on variants to authenticated;
revoke update on orders from anon, authenticated;
grant update (internal_notes, payment_status, customer_phone, customer_email, address, notes)
  on orders to authenticated;
