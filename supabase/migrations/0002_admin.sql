-- Admin support: atomic product saving, dashboard and analytics queries,
-- payment audit trail, and the product image bucket.

-- ---------------------------------------------------- payment audit trail
create function log_payment_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.payment_status is distinct from old.payment_status then
    insert into order_events (order_id, status, note, created_by)
    values (new.id, new.status, 'Payment: ' || old.payment_status || ' to ' || new.payment_status, auth.uid());
  end if;
  return new;
end $$;

create trigger orders_log_payment after update of payment_status on orders
  for each row execute function log_payment_change();

-- ------------------------------------------------------------ save_product
-- Saves a product with its options and variants in one transaction.
-- Stock is only set for NEW variants; changing stock later goes through
-- adjust_stock so every change is logged. Variants omitted from the payload are
-- deactivated, never deleted, because orders and stock history point at them.
create function save_product(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_slug text := trim(coalesce(p ->> 'slug', ''));
  v_name text := trim(coalesce(p ->> 'name', ''));
  v_status product_status := coalesce(nullif(p ->> 'status', ''), 'draft')::product_status;
  v_options jsonb := coalesce(p -> 'options', '[]'::jsonb);
  v_variants jsonb := coalesce(p -> 'variants', '[]'::jsonb);
  v_opt jsonb;
  v_var jsonb;
  v_value jsonb;
  v_option_id uuid;
  v_names text[] := '{}';
  v_pos integer;
  v_skus text[] := '{}';
  v_combos jsonb[] := '{}';
  v_keys text[];
  v_active integer := 0;
  v_kept uuid[] := '{}';
  v_vid uuid;
  v_price integer;
  v_compare integer;
  v_stock integer;
  v_constraint text;
begin
  if not is_staff() then
    raise exception 'forbidden';
  end if;
  if jsonb_typeof(p) is distinct from 'object' then
    raise exception 'invalid_payload';
  end if;
  if v_name = '' then
    raise exception 'name_required';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid_slug';
  end if;
  if not exists (select 1 from categories where id = (p ->> 'category_id')::uuid) then
    raise exception 'category_required';
  end if;
  if jsonb_typeof(v_options) <> 'array' or jsonb_array_length(v_options) > 3 then
    raise exception 'invalid_options';
  end if;
  if jsonb_typeof(v_variants) <> 'array' or jsonb_array_length(v_variants) < 1
     or jsonb_array_length(v_variants) > 200 then
    raise exception 'invalid_variants';
  end if;

  -- Options: unique non-empty names, each with unique non-empty values.
  for v_opt in select * from jsonb_array_elements(v_options) loop
    if trim(coalesce(v_opt ->> 'name', '')) = '' or lower(trim(v_opt ->> 'name')) = any (v_names) then
      raise exception 'invalid_options' using detail = 'option names must be unique and not empty';
    end if;
    v_names := v_names || lower(trim(v_opt ->> 'name'));
    if jsonb_typeof(v_opt -> 'values') is distinct from 'array'
       or jsonb_array_length(v_opt -> 'values') < 1
       or jsonb_array_length(v_opt -> 'values') > 30 then
      raise exception 'invalid_options' using detail = 'each option needs 1 to 30 values';
    end if;
    if (select count(distinct lower(trim(x))) from jsonb_array_elements_text(v_opt -> 'values') x)
       <> jsonb_array_length(v_opt -> 'values')
       or exists (select 1 from jsonb_array_elements_text(v_opt -> 'values') x where trim(x) = '') then
      raise exception 'invalid_options' using detail = 'option values must be unique and not empty';
    end if;
  end loop;

  -- Variants: valid combos, prices and unique SKUs, matching the options exactly.
  for v_var in select * from jsonb_array_elements(v_variants) loop
    if trim(coalesce(v_var ->> 'sku', '')) = '' or trim(v_var ->> 'sku') = any (v_skus) then
      raise exception 'invalid_variants' using detail = 'SKUs must be unique and not empty';
    end if;
    v_skus := v_skus || trim(v_var ->> 'sku');

    if jsonb_typeof(v_var -> 'option_values') is distinct from 'object' then
      raise exception 'invalid_variants' using detail = 'option_values must be an object';
    end if;
    select coalesce(array_agg(k order by k), '{}') into v_keys from jsonb_object_keys(v_var -> 'option_values') k;
    if v_keys is distinct from (
      select coalesce(array_agg(trim(o ->> 'name') order by trim(o ->> 'name')), '{}')
      from jsonb_array_elements(v_options) o
    ) then
      raise exception 'invalid_variants' using detail = 'variant options do not match the product options';
    end if;
    for v_opt in select * from jsonb_array_elements(v_options) loop
      if not exists (
        select 1 from jsonb_array_elements_text(v_opt -> 'values') x
        where trim(x) = (v_var -> 'option_values') ->> trim(v_opt ->> 'name')
      ) then
        raise exception 'invalid_variants' using detail = 'variant uses a value that is not in the option list';
      end if;
    end loop;
    if (v_var -> 'option_values') = any (v_combos) then
      raise exception 'duplicate_variant';
    end if;
    v_combos := v_combos || (v_var -> 'option_values');

    v_price := (v_var ->> 'price')::integer;
    v_compare := nullif(v_var ->> 'compare_at_price', '')::integer;
    if v_price is null or v_price < 0 or (v_compare is not null and v_compare < v_price) then
      raise exception 'invalid_price';
    end if;
    if coalesce((v_var ->> 'is_active')::boolean, true) then
      v_active := v_active + 1;
    end if;
  end loop;

  if v_status = 'published' and v_active = 0 then
    raise exception 'publish_needs_active_variant';
  end if;

  begin
    if v_id is null then
      insert into products (
        slug, name, brand_id, category_id, description, highlights, status, featured, condition,
        warranty_months, warranty_type, warranty_notes, authenticity_status, authenticity_notes,
        specs, kind, tone, seo_title, seo_description
      ) values (
        v_slug, v_name, nullif(p ->> 'brand_id', '')::uuid, (p ->> 'category_id')::uuid,
        coalesce(p ->> 'description', ''),
        coalesce(array(select jsonb_array_elements_text(coalesce(p -> 'highlights', '[]'::jsonb))), '{}'),
        v_status, coalesce((p ->> 'featured')::boolean, false),
        coalesce(nullif(p ->> 'condition', ''), 'new')::product_condition,
        coalesce((p ->> 'warranty_months')::integer, 0),
        coalesce(nullif(p ->> 'warranty_type', ''), 'none')::warranty_type,
        nullif(p ->> 'warranty_notes', ''),
        coalesce(nullif(p ->> 'authenticity_status', ''), 'unverified')::authenticity_status,
        nullif(p ->> 'authenticity_notes', ''),
        coalesce(p -> 'specs', '{}'::jsonb), nullif(p ->> 'kind', ''), nullif(p ->> 'tone', ''),
        nullif(p ->> 'seo_title', ''), nullif(p ->> 'seo_description', '')
      ) returning id into v_id;
    else
      update products set
        slug = v_slug, name = v_name, brand_id = nullif(p ->> 'brand_id', '')::uuid,
        category_id = (p ->> 'category_id')::uuid, description = coalesce(p ->> 'description', ''),
        highlights = coalesce(array(select jsonb_array_elements_text(coalesce(p -> 'highlights', '[]'::jsonb))), '{}'),
        status = v_status, featured = coalesce((p ->> 'featured')::boolean, false),
        condition = coalesce(nullif(p ->> 'condition', ''), 'new')::product_condition,
        warranty_months = coalesce((p ->> 'warranty_months')::integer, 0),
        warranty_type = coalesce(nullif(p ->> 'warranty_type', ''), 'none')::warranty_type,
        warranty_notes = nullif(p ->> 'warranty_notes', ''),
        authenticity_status = coalesce(nullif(p ->> 'authenticity_status', ''), 'unverified')::authenticity_status,
        authenticity_notes = nullif(p ->> 'authenticity_notes', ''),
        specs = coalesce(p -> 'specs', '{}'::jsonb), kind = nullif(p ->> 'kind', ''),
        tone = nullif(p ->> 'tone', ''), seo_title = nullif(p ->> 'seo_title', ''),
        seo_description = nullif(p ->> 'seo_description', '')
      where id = v_id;
      if not found then
        raise exception 'product_not_found';
      end if;
    end if;
  exception when unique_violation then
    raise exception 'slug_taken';
  end;

  -- Options are replaced wholesale; variants reference them by name, not id.
  delete from product_options where product_id = v_id;
  v_pos := 0;
  for v_opt in select * from jsonb_array_elements(v_options) loop
    insert into product_options (product_id, name, position)
    values (v_id, trim(v_opt ->> 'name'), v_pos) returning id into v_option_id;
    insert into product_option_values (option_id, value, position)
    select v_option_id, trim(x.value), x.ordinality - 1
    from jsonb_array_elements_text(v_opt -> 'values') with ordinality as x(value, ordinality);
    v_pos := v_pos + 1;
  end loop;

  begin
    for v_var in select * from jsonb_array_elements(v_variants) loop
      v_vid := nullif(v_var ->> 'id', '')::uuid;
      v_compare := nullif(v_var ->> 'compare_at_price', '')::integer;
      if v_vid is not null then
        update variants set
          sku = trim(v_var ->> 'sku'),
          option_values = v_var -> 'option_values',
          price = (v_var ->> 'price')::integer,
          compare_at_price = v_compare,
          low_stock_threshold = coalesce((v_var ->> 'low_stock_threshold')::integer, 3),
          is_active = coalesce((v_var ->> 'is_active')::boolean, true)
        where id = v_vid and product_id = v_id;
        if not found then
          raise exception 'variant_not_found';
        end if;
      else
        v_stock := coalesce((v_var ->> 'stock')::integer, 0);
        if v_stock < 0 then
          raise exception 'invalid_stock';
        end if;
        insert into variants (
          product_id, sku, option_values, price, compare_at_price, stock, low_stock_threshold, is_active
        ) values (
          v_id, trim(v_var ->> 'sku'), v_var -> 'option_values', (v_var ->> 'price')::integer,
          v_compare, v_stock, coalesce((v_var ->> 'low_stock_threshold')::integer, 3),
          coalesce((v_var ->> 'is_active')::boolean, true)
        ) returning id into v_vid;
      end if;
      v_kept := v_kept || v_vid;
    end loop;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'variants_sku_key' then
      raise exception 'sku_taken';
    end if;
    raise exception 'duplicate_variant';
  end;

  update variants set is_active = false where product_id = v_id and id <> all (v_kept) and is_active;

  return v_id;
end $$;

revoke all on function save_product from public, anon;
grant execute on function save_product to authenticated;

-- --------------------------------------------------------------- dashboard
-- Day boundaries follow Lagos time. "Booked" revenue counts every order that
-- has not been cancelled or refunded; "collected" counts only paid ones.
create function admin_dashboard(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
  v_from date := (now() at time zone 'Africa/Lagos')::date - (least(greatest(coalesce(p_days, 30), 1), 365) - 1);
  v_result jsonb;
begin
  if not is_staff() then
    raise exception 'forbidden';
  end if;

  with ranged as (
    select * from orders where (created_at at time zone 'Africa/Lagos')::date >= v_from
  ),
  live as (
    select * from ranged where status not in ('cancelled', 'refunded')
  )
  select jsonb_build_object(
    'days', v_days,
    'orders', (select count(*) from ranged),
    'booked_revenue', (select coalesce(sum(total), 0) from live),
    'collected_revenue', (select coalesce(sum(total), 0) from live where payment_status = 'paid'),
    'average_order', (select coalesce(round(avg(total)), 0) from live),
    'awaiting_confirmation', (select count(*) from orders where status = 'pending'),
    'awaiting_dispatch', (select count(*) from orders where status in ('confirmed', 'packed')),
    'out_for_delivery', (select count(*) from orders where status = 'out_for_delivery'),
    'by_status', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      from (select status, count(*) n from ranged group by status) s
    ),
    'daily', (
      select jsonb_agg(jsonb_build_object('date', d::date, 'orders', coalesce(x.n, 0), 'revenue', coalesce(x.r, 0)) order by d)
      from generate_series(v_from::timestamp, v_from::timestamp + make_interval(days => v_days - 1), interval '1 day') d
      left join (
        select (created_at at time zone 'Africa/Lagos')::date as day, count(*) n, sum(total) r
        from live group by 1
      ) x on x.day = d::date
    ),
    'top_products', (
      select coalesce(jsonb_agg(t order by t.units desc, t.revenue desc), '[]'::jsonb)
      from (
        select i.name, sum(i.qty)::integer as units, sum(i.qty * i.unit_price)::integer as revenue
        from order_items i join live o on o.id = i.order_id
        group by i.name order by sum(i.qty) desc, sum(i.qty * i.unit_price) desc limit 5
      ) t
    ),
    'low_stock', (
      select coalesce(jsonb_agg(l order by l.stock, l.name), '[]'::jsonb)
      from (
        select pr.name, v.sku, v.stock, v.id as variant_id,
               coalesce((
                 select string_agg(v.option_values ->> po.name, ' / ' order by po.position)
                 from product_options po where po.product_id = pr.id and v.option_values ? po.name
               ), '') as variant_label
        from variants v join products pr on pr.id = v.product_id
        where v.is_active and pr.status = 'published' and v.stock <= v.low_stock_threshold
        order by v.stock, pr.name limit 10
      ) l
    ),
    'recent_orders', (
      select coalesce(jsonb_agg(r order by r.created_at desc), '[]'::jsonb)
      from (
        select id, order_number, customer_name, total, status, payment_status, created_at
        from orders order by created_at desc limit 8
      ) r
    )
  ) into v_result;

  return v_result;
end $$;

-- --------------------------------------------------------------- analytics
create function admin_analytics(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
  v_from timestamptz := (
    ((now() at time zone 'Africa/Lagos')::date - (least(greatest(coalesce(p_days, 30), 1), 365) - 1))::timestamp
    at time zone 'Africa/Lagos'
  );
  v_result jsonb;
begin
  if not is_staff() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'days', v_days,
    'funnel', jsonb_build_object(
      'product_views', (select count(*) from analytics_events where event = 'product_view' and created_at >= v_from),
      'add_to_cart', (select count(*) from analytics_events where event = 'add_to_cart' and created_at >= v_from),
      'checkout_start', (select count(*) from analytics_events where event = 'checkout_start' and created_at >= v_from),
      'orders', (select count(*) from orders where created_at >= v_from and status not in ('cancelled', 'refunded')),
      'whatsapp_clicks', (select count(*) from analytics_events where event = 'whatsapp_click' and created_at >= v_from)
    ),
    'products', (
      select coalesce(jsonb_agg(t order by t.views desc, t.units desc), '[]'::jsonb)
      from (
        select pr.id, pr.name,
          (select count(*) from analytics_events e where e.product_id = pr.id and e.event = 'product_view' and e.created_at >= v_from)::integer as views,
          (select count(*) from analytics_events e where e.product_id = pr.id and e.event = 'add_to_cart' and e.created_at >= v_from)::integer as carts,
          coalesce((
            select sum(i.qty) from order_items i join orders o on o.id = i.order_id
            where i.product_id = pr.id and o.created_at >= v_from and o.status not in ('cancelled', 'refunded')
          ), 0)::integer as units
        from products pr
        where pr.status = 'published'
        order by 3 desc, 5 desc, pr.name limit 20
      ) t
    ),
    'order_sources', (
      select coalesce(jsonb_agg(s order by s.orders desc), '[]'::jsonb)
      from (
        select coalesce(source, 'direct') as source, count(*)::integer as orders, coalesce(sum(total), 0)::integer as revenue
        from orders
        where created_at >= v_from and status not in ('cancelled', 'refunded')
        group by 1 order by 2 desc limit 10
      ) s
    )
  ) into v_result;

  return v_result;
end $$;

revoke all on function admin_dashboard, admin_analytics from public, anon;
grant execute on function admin_dashboard, admin_analytics to authenticated;

-- ------------------------------------------------------------ image bucket
-- Only runs where Supabase Storage exists (not in the plain Postgres used by tests).
do $$
begin
  if to_regclass('storage.objects') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;

    execute $p$create policy "public reads product images" on storage.objects
      for select using (bucket_id = 'product-images')$p$;
    execute $p$create policy "content staff upload product images" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'product-images' and public.has_role(array['owner', 'staff', 'editor']::public.staff_role[]))$p$;
    execute $p$create policy "content staff update product images" on storage.objects
      for update to authenticated
      using (bucket_id = 'product-images' and public.has_role(array['owner', 'staff', 'editor']::public.staff_role[]))$p$;
    execute $p$create policy "content staff delete product images" on storage.objects
      for delete to authenticated
      using (bucket_id = 'product-images' and public.has_role(array['owner', 'staff', 'editor']::public.staff_role[]))$p$;
  end if;
end $$;
