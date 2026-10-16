-- Site-level key-value settings. Public read; staff write.
create table site_settings (
  key   text primary key,
  value jsonb not null default '{}'
);

alter table site_settings enable row level security;

create policy "public reads site_settings" on site_settings
  for select using (true);

create policy "staff inserts site_settings" on site_settings
  for insert to authenticated
  with check (is_staff());

create policy "staff updates site_settings" on site_settings
  for update to authenticated
  using (is_staff())
  with check (is_staff());

-- Default homepage content (mirrors the hardcoded fallback in code).
insert into site_settings (key, value) values (
  'homepage',
  jsonb_build_object(
    'hero_headline', 'Phones, laptops, audio and more —',
    'hero_accent',   'all genuine, delivered fast.',
    'hero_sub',      'Real products, real warranties, same-day delivery across Lagos. And we''re always a WhatsApp message away.',
    'trust', jsonb_build_array(
      jsonb_build_object('title', 'Genuine products',   'body', 'Every item is checked and verified before it is listed.'),
      jsonb_build_object('title', 'Warranty included',  'body', 'Manufacturer or store warranty, clearly stated on each product.'),
      jsonb_build_object('title', 'Lagos delivery',     'body', 'Same-day delivery on the mainland and island for most orders.'),
      jsonb_build_object('title', 'Inspect, then pay',  'body', 'Choose pay on delivery and check your item first.')
    )
  )
);
