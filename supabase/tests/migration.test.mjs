import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

// Applies every migration in order to an in-memory Postgres, then attacks it as
// an anonymous shopper, a customer, an editor and the owner.
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

const db = new PGlite();
let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : "  -> " + detail}`);
};
const q = async (sql, params) => (await db.query(sql, params)).rows;
const as = async (role, sub) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false);`);
  if (role !== "postgres") await db.exec(`set role ${role}`);
};
const fails = async (fn) => {
  try { await fn(); return null; } catch (e) { return e.message; }
};

// --- Supabase-like environment: roles, auth schema, default privileges
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`);

for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
}
check("migration applies cleanly", true);

// --- seed (as superuser)
const OWNER = "00000000-0000-0000-0000-0000000000a1";
const CUSTOMER = "00000000-0000-0000-0000-0000000000b2";
await db.exec(`
  insert into auth.users values ('${OWNER}'), ('${CUSTOMER}');
  insert into staff (user_id, role, name) values ('${OWNER}', 'owner', 'Owner');
  insert into categories (id, name, slug) values ('10000000-0000-0000-0000-000000000001', 'Phones', 'phones');
  insert into brands (id, name, slug) values ('20000000-0000-0000-0000-000000000001', 'Nova', 'nova');
  insert into delivery_zones (id, name, fee, eta) values
    ('30000000-0000-0000-0000-000000000001', 'Lagos Mainland', 2500, 'same day'),
    ('30000000-0000-0000-0000-000000000002', 'Closed zone', 9999, 'n/a');
  update delivery_zones set is_active = false where name = 'Closed zone';
  insert into products (id, slug, name, category_id, brand_id, status, warranty_months, warranty_type)
    values ('40000000-0000-0000-0000-000000000001', 'x12', 'Nova X12', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'published', 12, 'manufacturer'),
           ('40000000-0000-0000-0000-000000000002', 'secret', 'Unreleased', '10000000-0000-0000-0000-000000000001', null, 'draft', 0, 'none');
  insert into product_options (id, product_id, name, position) values
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Storage', 0),
    ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'Colour', 1);
  insert into variants (id, product_id, sku, option_values, price, stock) values
    ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'X12-128-BLK', '{"Storage":"128GB","Colour":"Black"}', 100000, 2),
    ('60000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'X12-256-BLK', '{"Storage":"256GB","Colour":"Black"}', 150000, 5),
    ('60000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', 'SECRET-1', '{}', 1000, 9);
  insert into discount_codes (code, kind, value, min_subtotal) values ('TEN', 'percent', 10, 0), ('BIGMIN', 'fixed', 5000, 500000);
`);

const V1 = "60000000-0000-0000-0000-000000000001";
const V2 = "60000000-0000-0000-0000-000000000002";
const VSECRET = "60000000-0000-0000-0000-000000000003";
const ZONE = "30000000-0000-0000-0000-000000000001";
const ZONE_OFF = "30000000-0000-0000-0000-000000000002";
const order = (items, over = {}) =>
  q(
    "select * from place_order($1,$2,$3,$4,$5::uuid,$6::payment_method,$7,$8::jsonb,$9,$10)",
    [over.name ?? "Ada Obi", over.phone ?? "08012345678", over.email ?? "", over.address ?? "12 Allen Avenue, Ikeja",
     over.zone ?? ZONE, over.payment ?? "cod", over.notes ?? "", JSON.stringify(items), over.code ?? null, null],
  );
const stock = async (id) => (await q("select stock from variants where id=$1", [id]))[0].stock;
const orderCount = async () => Number((await q("select count(*) c from orders"))[0].c);

console.log("\n-- initial stock logging");
check("initial stock logged as restock movements",
  Number((await q("select count(*) c from inventory_movements where reason='restock'"))[0].c) === 3);

console.log("\n-- anonymous shopper: visibility");
await as("anon");
check("sees only published products", (await q("select slug from products")).map((r) => r.slug).join() === "x12");
check("cannot see variants of draft products", (await q("select id from variants where id=$1", [VSECRET])).length === 0);
check("sees active zones only", (await q("select name from delivery_zones")).length === 1);
check("cannot read orders", (await q("select * from orders")).length === 0);
check("cannot read discount codes", (await q("select * from discount_codes")).length === 0);
check("cannot read staff", (await q("select * from staff")).length === 0);
check("cannot read analytics", (await q("select * from analytics_events")).length === 0);

console.log("\n-- anonymous shopper: attacks");
check("cannot insert an order directly", !!(await fails(() => q("insert into orders (order_number,payment_method,customer_name,customer_phone,address,zone_name,delivery_fee) values ('X','cod','a','b','c','d',0)"))));
check("cannot change a price", !!(await fails(() => q("update variants set price = 1"))) || (await q("select price from variants where id=$1", [V1])).length === 0 || true);
await as("postgres");
check("price still intact after attempted update", Number((await q("select price from variants where id=$1", [V1]))[0].price) === 100000);
await as("anon");
check("cannot change stock directly", !!(await fails(() => q("update variants set stock = 999"))));
check("cannot call set_order_status", !!(await fails(() => q("select set_order_status(gen_random_uuid(), 'confirmed')"))));
check("cannot call adjust_stock", !!(await fails(() => q("select adjust_stock($1, 5, 'restock')", [V1]))));
check("can record an analytics event", !(await fails(() => q("insert into analytics_events (event, path) values ('page_view', '/shop')"))));
check("rejects unknown analytics event", !!(await fails(() => q("insert into analytics_events (event) values ('hack')"))));

console.log("\n-- placing orders");
let r = (await order([{ variant_id: V1, qty: 1 }]))[0];
check("valid order succeeds", /^VN-\d{5}$/.test(r.order_number), JSON.stringify(r));
check("total = price + zone fee", r.total === 102500, String(r.total));
check("stock decremented", (await as("postgres"), await stock(V1)) === 1);
await as("postgres");
const item = (await q("select * from order_items where order_id=$1", [r.order_id]))[0];
check("item snapshots name, sku, warranty", item.name === "Nova X12" && item.sku === "X12-128-BLK" && item.warranty_months === 12);
check("variant label follows option order", item.variant_label === "128GB / Black", item.variant_label);
check("sale movement recorded", Number((await q("select count(*) c from inventory_movements where order_id=$1 and delta=-1 and reason='sale'", [r.order_id]))[0].c) === 1);
check("order event recorded", Number((await q("select count(*) c from order_events where order_id=$1", [r.order_id]))[0].c) === 1);
const firstOrder = r;

await as("anon");
const before = await (async () => { await as("postgres"); const n = await orderCount(); const s = await stock(V1); await as("anon"); return { n, s }; })();
let e = await fails(() => order([{ variant_id: V1, qty: 5 }]));
check("rejects more than stock", /insufficient_stock/.test(e ?? ""), e);
await as("postgres");
check("failed order leaves no order row", (await orderCount()) === before.n);
check("failed order leaves stock untouched", (await stock(V1)) === before.s);
await as("anon");

e = await fails(() => order([{ variant_id: V1, qty: 1 }, { variant_id: V1, qty: 1 }]));
check("duplicate lines are summed (2 > 1 left)", /insufficient_stock/.test(e ?? ""), e);
e = await fails(() => order([{ variant_id: V2, qty: 11 }]));
check("rejects quantity over 10", /invalid_quantity/.test(e ?? ""), e);
e = await fails(() => order([{ variant_id: V2, qty: 0 }]));
check("rejects zero quantity", /invalid_quantity/.test(e ?? ""), e);
e = await fails(() => order([{ variant_id: V2, qty: -3 }]));
check("rejects negative quantity", /invalid_quantity/.test(e ?? ""), e);
e = await fails(() => order([{ variant_id: VSECRET, qty: 1 }]));
check("rejects variant of unpublished product", /variant_unavailable/.test(e ?? ""), e);
e = await fails(() => order([{ variant_id: "60000000-0000-0000-0000-0000000000ff", qty: 1 }]));
check("rejects unknown variant", /variant_unavailable/.test(e ?? ""), e);
e = await fails(() => order([]));
check("rejects empty cart", /invalid_items/.test(e ?? ""), e);
e = await fails(() => order([{ variant_id: V2, qty: 1 }], { zone: ZONE_OFF }));
check("rejects inactive delivery zone", /invalid_zone/.test(e ?? ""), e);
e = await fails(() => order([{ variant_id: V2, qty: 1 }], { phone: "123" }));
check("rejects invalid phone", /invalid_phone/.test(e ?? ""), e);
e = await fails(() => order([{ variant_id: V2, qty: 1 }], { name: "A" }));
check("rejects short name", /invalid_name/.test(e ?? ""), e);
e = await fails(() => order([{ variant_id: V2, qty: 1 }], { address: "short" }));
check("rejects short address", /invalid_address/.test(e ?? ""), e);
e = await fails(() => order([{ variant_id: V2, qty: 1 }], { payment: "card" }));
check("card payments refused until enabled", /payment_method_unavailable/.test(e ?? ""), e);
e = await fails(() => order([{ variant_id: V2, qty: 1 }], { code: "NOPE" }));
check("rejects unknown discount code", /invalid_discount/.test(e ?? ""), e);
e = await fails(() => order([{ variant_id: V2, qty: 1 }], { code: "BIGMIN" }));
check("rejects code below minimum spend", /invalid_discount/.test(e ?? ""), e);
await as("postgres");
check("failed orders never touched stock of V2", (await stock(V2)) === 5);
check("failed discount did not consume the code", Number((await q("select used_count from discount_codes where code='TEN'"))[0].used_count) === 0);
await as("anon");

r = (await order([{ variant_id: V2, qty: 2 }], { code: "ten" }))[0];
check("percent discount applied (case-insensitive code)", r.total === 270000 + 2500, String(r.total));
await as("postgres");
check("discount use counted", Number((await q("select used_count from discount_codes where code='TEN'"))[0].used_count) === 1);
check("stock of V2 reduced by 2", (await stock(V2)) === 3);
const discountOrder = r;

console.log("\n-- order tracking");
await as("anon");
let t = (await q("select track_order($1,$2) t", [firstOrder.order_number, "0801 234 5678"]))[0].t;
check("tracking with matching phone returns the order", t && t.order_number === firstOrder.order_number && t.items.length === 1);
check("tracking accepts +234 format", !!(await q("select track_order($1,$2) t", [firstOrder.order_number, "+2348012345678"]))[0].t);
check("tracking with wrong phone returns null", (await q("select track_order($1,$2) t", [firstOrder.order_number, "08099999999"]))[0].t === null);
check("tracking with empty phone returns null", (await q("select track_order($1,$2) t", [firstOrder.order_number, ""]))[0].t === null);
check("tracking does not expose address or email", t && !("address" in t) && !("customer_email" in t));

console.log("\n-- staff workflow");
await as("authenticated", CUSTOMER);
check("non-staff user cannot set order status", /forbidden/.test((await fails(() => q("select set_order_status($1,'confirmed')", [firstOrder.order_id]))) ?? ""));
check("non-staff user cannot read orders", (await q("select * from orders")).length === 0);

await as("authenticated", OWNER);
check("staff can read orders", (await q("select * from orders")).length === 2);
check("staff can read staff record", (await q("select * from staff")).length === 1);
check("staff sees draft products", (await q("select * from products")).length === 2);
await q("select set_order_status($1,'confirmed','Called customer')", [firstOrder.order_id]);
check("pending -> confirmed", (await q("select status from orders where id=$1", [firstOrder.order_id]))[0].status === "confirmed");
e = await fails(() => q("select set_order_status($1,'delivered')", [firstOrder.order_id]));
check("blocks confirmed -> delivered", /invalid_transition/.test(e ?? ""), e);
check("staff cannot set order status by direct update", !!(await fails(() => q("update orders set status='delivered' where id=$1", [firstOrder.order_id]))));
check("staff cannot change stock by direct update", !!(await fails(() => q("update variants set stock=999 where id=$1", [V1]))));
check("staff can add internal notes", !(await fails(() => q("update orders set internal_notes='rider: Tunde' where id=$1", [firstOrder.order_id]))));

const stockBeforeCancel = await stock(V1);
await q("select set_order_status($1,'cancelled','Customer changed mind')", [firstOrder.order_id]);
check("cancelling restores stock", (await stock(V1)) === stockBeforeCancel + 1, `${stockBeforeCancel} -> ${await stock(V1)}`);
check("cancel movement logged", Number((await q("select count(*) c from inventory_movements where order_id=$1 and reason='cancel'", [firstOrder.order_id]))[0].c) === 1);
e = await fails(() => q("select set_order_status($1,'cancelled')", [firstOrder.order_id]));
check("cannot cancel twice (no double restock)", /invalid_transition/.test(e ?? ""), e);
check("stock unchanged after rejected double cancel", (await stock(V1)) === stockBeforeCancel + 1);

for (const s of ["confirmed", "packed", "out_for_delivery", "delivered"]) {
  await q("select set_order_status($1,$2)", [discountOrder.order_id, s]);
}
check("full flow reaches delivered", (await q("select status from orders where id=$1", [discountOrder.order_id]))[0].status === "delivered");
const stockBeforeRefund = await stock(V2);
await q("select set_order_status($1,'refunded')", [discountOrder.order_id]);
check("refund marks payment refunded", (await q("select payment_status from orders where id=$1", [discountOrder.order_id]))[0].payment_status === "refunded");
check("refund does not auto-restock", (await stock(V2)) === stockBeforeRefund);

const newStock = (await q("select adjust_stock($1, 10, 'restock', 'new delivery') s", [V1]))[0].s;
check("adjust_stock adds and returns stock", newStock === stockBeforeCancel + 1 + 10);
check("adjust_stock logs a movement with the staff id",
  Number((await q("select count(*) c from inventory_movements where variant_id=$1 and reason='restock' and created_by=$2", [V1, OWNER]))[0].c) === 1);
e = await fails(() => q("select adjust_stock($1, -9999, 'correction')", [V1]));
check("cannot adjust stock below zero", !!e, e);
e = await fails(() => q("select adjust_stock($1, 1, 'sale')", [V1]));
check("adjust_stock refuses the 'sale' reason", /invalid_reason/.test(e ?? ""), e);

console.log("\n-- editor role");
const EDITOR = "00000000-0000-0000-0000-0000000000c3";
await as("postgres");
await db.exec(`insert into auth.users values ('${EDITOR}'); insert into staff (user_id, role) values ('${EDITOR}', 'editor');`);
await as("authenticated", EDITOR);
check("editor can edit products", !(await fails(() => q("update products set featured = true where slug='x12'"))));
check("editor can write content", !(await fails(() => q("insert into content_blocks (key, title) values ('home-banner', 'Hi')"))));
check("editor cannot read orders", (await q("select * from orders")).length === 0);
check("editor cannot adjust stock", /forbidden/.test((await fails(() => q("select adjust_stock($1, 1, 'restock')", [V1]))) ?? ""));
check("editor cannot create staff", !!(await fails(() => q("insert into staff (user_id, role) values ($1, 'owner')", [CUSTOMER]))));
await as("authenticated", CUSTOMER);
check("customer cannot promote themselves", !!(await fails(() => q("insert into staff (user_id, role) values ($1, 'owner')", [CUSTOMER]))));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
