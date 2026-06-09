// Creates the four one-click demo personas as real Supabase auth users, then
// elevates their (trigger-created) profile rows to the right role/vendor.
//
// This is the ONLY place the service_role key is used, and it never reaches the
// browser. Run AFTER the migrations + seed.sql:
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:users
//
// (or put SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local — see .env.example)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// Allow values to come from a local .env.local without extra deps.
function loadEnvLocal() {
  try {
    for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {
    /* no .env.local — rely on inline env */
  }
}
loadEnvLocal();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    '\nMissing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Find them in Supabase → Settings → API (use the service_role secret).\n' +
      'Run:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:users\n',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Must match the Fern Hollow id in seed.sql.
const FERN_HOLLOW_ID = 'a0000000-0000-4000-8000-000000000001';
const PASSWORD = 'demo1234';

const PERSONAS = [
  { email: 'shopper@riverbend.demo', full_name: 'Casey Shopper', role: 'shopper', vendor_id: null },
  { email: 'vendor@riverbend.demo', full_name: 'Fern Hollow Farm', role: 'vendor', vendor_id: FERN_HOLLOW_ID },
  { email: 'admin@riverbend.demo', full_name: 'Dana — Market Manager', role: 'admin', vendor_id: null },
  { email: 'owner@riverbend.demo', full_name: 'Lodestone (Platform Owner)', role: 'superadmin', vendor_id: null },
];

async function ensureUser(p) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: p.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: p.full_name },
  });
  if (error && !/already.*registered|exists/i.test(error.message)) {
    throw new Error(`createUser(${p.email}): ${error.message}`);
  }
  if (data?.user) return data.user.id;

  // Already existed — find it (and make sure the password is the known one).
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw new Error(`listUsers: ${listErr.message}`);
  const existing = list.users.find((u) => u.email?.toLowerCase() === p.email.toLowerCase());
  if (!existing) throw new Error(`Could not locate existing user ${p.email}`);
  await supabase.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true });
  return existing.id;
}

async function run() {
  for (const p of PERSONAS) {
    const id = await ensureUser(p);
    // The on_auth_user_created trigger created a shopper profile; elevate it.
    const { error } = await supabase
      .from('profiles')
      .update({ role: p.role, full_name: p.full_name, vendor_id: p.vendor_id })
      .eq('id', id);
    if (error) throw new Error(`profiles.update(${p.email}): ${error.message}`);
    console.log(`  ✓ ${p.role.padEnd(11)} ${p.email}`);
  }
  console.log(`\nAll demo personas ready. Password for every one: "${PASSWORD}".\n`);
}

run().catch((e) => {
  console.error('\nSeeding failed:', e.message, '\n');
  process.exit(1);
});
