// Check what product keys exist for simco products
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } }
});

async function main() {
  // Get first 10 product keys to see format
  const { data, error } = await supabase
    .from('kv_store_577b3f26')
    .select('key, value')
    .like('key', 'products:%')
    .limit(10);

  if (error) { console.error(error.message); return; }

  console.log('Sample product keys:');
  for (const row of data) {
    console.log(`  key: ${row.key}`);
    console.log(`  id: ${row.value?.id}, sku: ${row.value?.sku}, importSource: ${row.value?.importSource}`);
    console.log();
  }

  // Count total products
  const { count } = await supabase
    .from('kv_store_577b3f26')
    .select('key', { count: 'exact', head: true })
    .like('key', 'products:%');

  console.log(`Total product keys: ${count}`);

  // Check specifically for simco- prefix
  const { count: simcoCount } = await supabase
    .from('kv_store_577b3f26')
    .select('key', { count: 'exact', head: true })
    .like('key', 'products:simco-%');

  console.log(`Keys with simco- prefix: ${simcoCount}`);
}

main().catch(err => { console.error(err); process.exit(1); });
