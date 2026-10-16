#!/usr/bin/env node
// One-command local backend: generates dev keys, starts Postgres/Auth/REST/Storage in Docker,
// applies supabase/migrations, creates an owner login and starts the gateway on :54321.
// Usage: node supabase/local-stack/setup.mjs [owner-email] [owner-password]
//        node supabase/local-stack/setup.mjs down
import { execSync, spawn } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const envFile = join(here, ".env");
const pidFile = join(here, ".gateway.pid");
const migrations = join(root, "supabase", "migrations");
const run = (cmd, opts = {}) => execSync(cmd, { cwd: here, stdio: "pipe", ...opts }).toString().trim();
const compose = (args) => run(`docker compose --env-file .env ${args}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function stopGateway() {
  try {
    process.kill(Number(readFileSync(pidFile, "utf8")));
  } catch {}
  if (existsSync(pidFile)) unlinkSync(pidFile);
}

if (process.argv[2] === "down") {
  stopGateway();
  if (existsSync(envFile)) compose("down");
  console.log("Local stack stopped. Data is kept; run setup again to resume.");
  process.exit(0);
}

const [email = "owner@example.test", password = randomBytes(9).toString("base64url")] = process.argv.slice(2);

// 1. Dev-only secrets, created once and reused.
if (!existsSync(envFile)) {
  const secret = randomBytes(32).toString("hex");
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const sign = (role) => {
    const head = b64({ alg: "HS256", typ: "JWT" });
    const body = b64({ role, iss: "supabase-local", exp: 2_000_000_000 });
    return `${head}.${body}.${createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url")}`;
  };
  writeFileSync(envFile, `POSTGRES_PASSWORD=postgres\nJWT_SECRET=${secret}\nANON_KEY=${sign("anon")}\nSERVICE_KEY=${sign("service_role")}\n`);
}
const env = Object.fromEntries(readFileSync(envFile, "utf8").trim().split("\n").map((l) => l.split("=")));

// 2. Start the containers and wait for the database to finish initialising.
console.log("Starting containers (the first run downloads images)…");
compose("up -d db");
const psql = (sql) =>
  compose(`exec -T -e PGPASSWORD=${env.POSTGRES_PASSWORD} db psql -h localhost -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -At -c "${sql}"`);
for (let i = 0; ; i++) {
  try {
    if (psql("select count(*) from pg_roles where rolname = 'supabase_auth_admin'") === "1") break;
  } catch {}
  if (i > 60) throw new Error("The database did not become ready.");
  await sleep(2000);
}

// The image creates the service roles with its own passwords; make them match ours.
psql(`alter role authenticator with password '${env.POSTGRES_PASSWORD}'; alter role supabase_auth_admin with password '${env.POSTGRES_PASSWORD}'; alter role supabase_storage_admin with password '${env.POSTGRES_PASSWORD}';`);
compose("up -d");

const waitFor = async (name, url, ok = (r) => r.ok) => {
  for (let i = 0; i < 60; i++) {
    try {
      if (ok(await fetch(url))) return;
    } catch {}
    await sleep(2000);
  }
  throw new Error(`${name} did not start. Check: docker compose -f supabase/local-stack/docker-compose.yml logs ${name}`);
};
await waitFor("auth", "http://localhost:54391/health");
await waitFor("rest", "http://localhost:54392/", (r) => r.status < 500);
await waitFor("storage", "http://localhost:54393/status");

// 3. Apply migrations once.
if (psql("select coalesce(to_regclass('public.staff')::text, '')") === "") {
  for (const file of readdirSync(migrations).filter((f) => f.endsWith(".sql")).sort()) {
    console.log(`Applying ${file}…`);
    run(`docker compose --env-file .env exec -T -e PGPASSWORD=${env.POSTGRES_PASSWORD} db psql -h localhost -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q`, {
      input: readFileSync(join(migrations, file)),
    });
  }
  psql("notify pgrst, 'reload schema'");
}

// 4. Gateway.
stopGateway();
mkdirSync(here, { recursive: true });
const gateway = spawn(process.execPath, [join(here, "gateway.mjs")], { detached: true, stdio: "ignore" });
gateway.unref();
writeFileSync(pidFile, String(gateway.pid));
await waitFor("gateway", "http://localhost:54321/auth/v1/health");

// 5. Owner login (skipped if it already exists).
const res = await fetch("http://localhost:54321/auth/v1/admin/users", {
  method: "POST",
  headers: { apikey: env.SERVICE_KEY, authorization: `Bearer ${env.SERVICE_KEY}`, "content-type": "application/json" },
  body: JSON.stringify({ email, password, email_confirm: true }),
});
const user = await res.json();
if (user.id) {
  psql(`insert into staff (user_id, role, name) values ('${user.id}', 'owner', 'Owner') on conflict do nothing`);
  console.log(`\nOwner login created:\n  email:    ${email}\n  password: ${password}`);
} else {
  console.log(`\nOwner login not created (${user.msg ?? user.message ?? "already exists"}).`);
}

console.log(`
Local backend is running. Put these in .env.local:

NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${env.ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${env.SERVICE_KEY}

Then run: npm run dev   and open http://localhost:3000/admin
Stop with: npm run stack:down`);
