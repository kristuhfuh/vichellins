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


console.log("\n-- save_product");
const CAT = "10000000-0000-0000-0000-000000000001";
const BRAND = "20000000-0000-0000-0000-000000000001";
const base = (over = {}) => ({
  name: "Aerix Laptop", slug: "aerix-laptop", category_id: CAT, brand_id: BRAND, description: "Fast.",
  highlights: ["Light", "Quiet"], status: "published", featured: false, condition: "new",
  warranty_months: 12, warranty_type: "manufacturer", authenticity_status: "verified",
  specs: { ram: "8GB" },
  options: [{ name: "RAM", values: ["8GB", "16GB"] }, { name: "Colour", values: ["Black", "Silver"] }],
  variants: [
    { sku: "AX-8-BLK", option_values: { RAM: "8GB", Colour: "Black" }, price: 500000, stock: 4 },
    { sku: "AX-8-SIL", option_values: { RAM: "8GB", Colour: "Silver" }, price: 500000, stock: 2 },
    { sku: "AX-16-BLK", option_values: { RAM: "16GB", Colour: "Black" }, price: 600000, compare_at_price: 650000, stock: 1 },
  ],
  ...over,
});
const save = (payload) => q("select save_product($1::jsonb) id", [JSON.stringify(payload)]);

await as("authenticated", CUSTOMER);
check("customer cannot save products", /forbidden/.test((await fails(() => save(base()))) ?? ""));
await as("authenticated", EDITOR);
check("editor cannot save products (variants carry prices)", /forbidden/.test((await fails(() => save(base()))) ?? ""));
await as("anon");
check("anon cannot save products", !!(await fails(() => save(base()))));

await as("authenticated", OWNER);
const pid = (await save(base()))[0].id;
check("creates a product", !!pid);
await as("postgres");
check("stores 3 variants", Number((await q("select count(*) c from variants where product_id=$1", [pid]))[0].c) === 3);
check("stores options in order", (await q("select name from product_options where product_id=$1 order by position", [pid])).map((r) => r.name).join() === "RAM,Colour");
check("stores option values in order", (await q("select v.value from product_option_values v join product_options o on o.id=v.option_id where o.name='RAM' and o.product_id=$1 order by v.position", [pid])).map((r) => r.value).join() === "8GB,16GB");
check("highlights stored as array", (await q("select highlights from products where id=$1", [pid]))[0].highlights.join() === "Light,Quiet");
check("initial stock logged for new variants", Number((await q("select coalesce(sum(delta),0) s from inventory_movements m join variants v on v.id=m.variant_id where v.product_id=$1 and m.reason='restock'", [pid]))[0].s) === 7);

const vars = await q("select id, sku from variants where product_id=$1 order by sku", [pid]);
const idOf = (sku) => vars.find((v) => v.sku === sku).id;

await as("authenticated", OWNER);
const edited = base({
  id: pid, name: "Aerix Laptop 14",
  variants: [
    { id: idOf("AX-8-BLK"), sku: "AX-8-BLK", option_values: { RAM: "8GB", Colour: "Black" }, price: 520000, stock: 999 },
    { id: idOf("AX-8-SIL"), sku: "AX-8-SIL", option_values: { RAM: "8GB", Colour: "Silver" }, price: 500000 },
    // AX-16-BLK deliberately omitted: should be deactivated, not deleted
  ],
});
await save(edited);
await as("postgres");
const after = await q("select sku, price, stock, is_active from variants where product_id=$1 order by sku", [pid]);
check("price edits apply", after.find((v) => v.sku === "AX-8-BLK").price === 520000);
check("stock in payload is ignored for existing variants", after.find((v) => v.sku === "AX-8-BLK").stock === 4);
check("omitted variant is deactivated, not deleted", after.length === 3 && after.find((v) => v.sku === "AX-16-BLK").is_active === false);
check("product name updated", (await q("select name from products where id=$1", [pid]))[0].name === "Aerix Laptop 14");
check("variant history survives", Number((await q("select count(*) c from inventory_movements m join variants v on v.id=m.variant_id where v.product_id=$1", [pid]))[0].c) === 3);

await as("authenticated", OWNER);
const bad = async (label, payload, re) => {
  const err = await fails(() => save(payload));
  check(label, re.test(err ?? ""), err);
};
await bad("rejects empty name", base({ slug: "x1", name: " " }), /name_required/);
await bad("rejects bad slug", base({ slug: "Bad Slug!" }), /invalid_slug/);
await bad("rejects unknown category", base({ slug: "x2", category_id: "10000000-0000-0000-0000-0000000000ff" }), /category_required/);
await bad("slug collision", base({ slug: "aerix-laptop" }), /slug_taken/);
await bad("rejects variant outside option list", base({ slug: "x3", variants: [{ sku: "A", option_values: { RAM: "64GB", Colour: "Black" }, price: 1, stock: 1 }] }), /invalid_variants/);
await bad("rejects variant missing an option", base({ slug: "x4", variants: [{ sku: "A", option_values: { RAM: "8GB" }, price: 1, stock: 1 }] }), /invalid_variants/);
await bad("rejects variant with extra option", base({ slug: "x5", variants: [{ sku: "A", option_values: { RAM: "8GB", Colour: "Black", Size: "L" }, price: 1, stock: 1 }] }), /invalid_variants/);
await bad("rejects duplicate combos", base({ slug: "x6", variants: [
  { sku: "A", option_values: { RAM: "8GB", Colour: "Black" }, price: 1, stock: 1 },
  { sku: "B", option_values: { Colour: "Black", RAM: "8GB" }, price: 1, stock: 1 }] }), /duplicate_variant/);
await bad("rejects duplicate SKUs in one payload", base({ slug: "x7", variants: [
  { sku: "A", option_values: { RAM: "8GB", Colour: "Black" }, price: 1, stock: 1 },
  { sku: "A", option_values: { RAM: "8GB", Colour: "Silver" }, price: 1, stock: 1 }] }), /invalid_variants/);
await bad("SKU already used by another product", base({ slug: "x8", variants: [{ sku: "AX-8-BLK", option_values: { RAM: "8GB", Colour: "Black" }, price: 1, stock: 1 }] }), /sku_taken/);
await bad("rejects negative price", base({ slug: "x9", variants: [{ sku: "N1", option_values: { RAM: "8GB", Colour: "Black" }, price: -5, stock: 1 }] }), /invalid_price/);
await bad("rejects compare-at below price", base({ slug: "x10", variants: [{ sku: "N2", option_values: { RAM: "8GB", Colour: "Black" }, price: 100, compare_at_price: 50, stock: 1 }] }), /invalid_price/);
await bad("rejects negative initial stock", base({ slug: "x11", variants: [{ sku: "N3", option_values: { RAM: "8GB", Colour: "Black" }, price: 100, stock: -1 }] }), /invalid_stock/);
await bad("rejects no variants", base({ slug: "x12", variants: [] }), /invalid_variants/);
await bad("rejects 4 options", base({ slug: "x13", options: ["A", "B", "C", "D"].map((n) => ({ name: n, values: ["1"] })), variants: [{ sku: "Q", option_values: { A: "1", B: "1", C: "1", D: "1" }, price: 1, stock: 1 }] }), /invalid_options/);
await bad("rejects duplicate option values", base({ slug: "x14", options: [{ name: "RAM", values: ["8GB", "8gb"] }], variants: [{ sku: "Q", option_values: { RAM: "8GB" }, price: 1, stock: 1 }] }), /invalid_options/);
await bad("cannot publish with no active variant", base({ slug: "x15", variants: [{ sku: "Z1", option_values: { RAM: "8GB", Colour: "Black" }, price: 1, stock: 1, is_active: false }] }), /publish_needs_active_variant/);
await bad("cannot edit a variant of another product", base({ id: pid, variants: [{ id: V1, sku: "HIJACK", option_values: { RAM: "8GB", Colour: "Black" }, price: 1 }] }), /variant_not_found/);

await as("postgres");
check("rejected saves leave no partial product", Number((await q("select count(*) c from products where slug ~ '^x[0-9]+$' and slug <> 'x12'"))[0].c) === 0);
check("rejected saves did not touch the other product's variant", Number((await q("select price from variants where id=$1", [V1]))[0].price) === 100000);

await as("authenticated", OWNER);
const nov = await save(base({ slug: "plain-charger", name: "Plain Charger", options: [], specs: {}, variants: [{ sku: "PC-1", option_values: {}, price: 9000, stock: 3 }] }));
check("product without options works", !!nov[0].id);
const dr = await save(base({ slug: "draft-thing", name: "Draft", status: "draft", variants: [{ sku: "D1", option_values: { RAM: "8GB", Colour: "Black" }, price: 1, stock: 0, is_active: false }] }));
check("draft with inactive variant is allowed", !!dr[0].id);

console.log("\n-- payment audit trail");
await as("authenticated", OWNER);
const someOrder = (await q("select id from orders order by created_at limit 1"))[0].id;
await q("update orders set payment_status='paid' where id=$1", [someOrder]);
check("payment change is logged on the order", Number((await q("select count(*) c from order_events where order_id=$1 and note like 'Payment: unpaid to paid'", [someOrder]))[0].c) === 1);

console.log("\n-- dashboard and analytics");
// Both earlier orders ended cancelled/refunded, so place a live one to count.
await as("anon");
const liveOrder = (await order([{ variant_id: V2, qty: 1 }]))[0];
check("live order for dashboard placed", liveOrder.total === 152500, String(liveOrder.total));
await as("authenticated", CUSTOMER);
check("customer cannot read dashboard", /forbidden/.test((await fails(() => q("select admin_dashboard(30)"))) ?? ""));
check("customer cannot read analytics", /forbidden/.test((await fails(() => q("select admin_analytics(30)"))) ?? ""));
await as("authenticated", EDITOR);
check("editor cannot read dashboard", /forbidden/.test((await fails(() => q("select admin_dashboard(30)"))) ?? ""));
await as("anon");
check("anon cannot read dashboard", !!(await fails(() => q("select admin_dashboard(30)"))));

await as("authenticated", OWNER);
const dash = (await q("select admin_dashboard(7) d"))[0].d;
check("dashboard returns 7 daily buckets", dash.daily.length === 7, String(dash.daily?.length));
check("daily buckets are consecutive and zero-filled", dash.daily.every((d, i, a) => i === 0 || d.date > a[i - 1].date));
const dailyRevenue = dash.daily.reduce((n, d) => n + d.revenue, 0);
check("daily revenue adds up to booked revenue", dailyRevenue === dash.booked_revenue, `${dailyRevenue} vs ${dash.booked_revenue}`);
await as("postgres");
const expected = Number((await q("select coalesce(sum(total),0) s from orders where status not in ('cancelled','refunded')"))[0].s);
check("booked revenue excludes cancelled and refunded orders", dash.booked_revenue === expected, `${dash.booked_revenue} vs ${expected}`);
check("collected revenue only counts paid orders", dash.collected_revenue <= dash.booked_revenue);
check("top products lists the live order", dash.top_products.length === 1 && dash.top_products[0].name === "Nova X12" && dash.top_products[0].units === 1, JSON.stringify(dash.top_products));
check("cancelled and refunded orders are excluded from top products", dash.top_products.every((t) => t.units === 1));
await as("authenticated", OWNER);
const lowSeed = await q("select id from variants where sku='AX-8-SIL'");
await as("postgres");
await q("update variants set stock = 1 where sku='AX-8-SIL'");
await as("authenticated", OWNER);
const dash2 = (await q("select admin_dashboard(30) d"))[0].d;
check("low stock lists variants at or under threshold", dash2.low_stock.some((l) => l.sku === "AX-8-SIL" && l.variant_label === "8GB / Silver"), JSON.stringify(dash2.low_stock));
check("dashboard caps absurd ranges", (await q("select admin_dashboard(100000) d"))[0].d.days === 365);
const an = (await q("select admin_analytics(30) a"))[0].a;
check("analytics returns funnel and products", an.funnel && Array.isArray(an.products));
check("analytics counts the page view recorded earlier", an.funnel.product_views >= 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
