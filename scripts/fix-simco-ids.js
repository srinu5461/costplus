// Fix Simco product IDs - remove "simco-" prefix so URLs work correctly
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } }
});

async function main() {
  let offset = 0;
  const BATCH = 500;
  let fixed = 0;

  while (true) {
    const { data, error } = await supabase
      .from('kv_store_577b3f26')
      .select('key, value')
      .like('key', 'products:%')
      .eq('value->>importSource', 'simco')
      .range(offset, offset + BATCH - 1);

    if (error) { console.error(error.message); break; }
    if (!data || data.length === 0) break;

    const upserts = data.map(row => ({
      key: row.key,
      value: { ...row.value, id: row.value.sku || row.value.code }
    }));

    const { error: upErr } = await supabase
      .from('kv_store_577b3f26')
      .upsert(upserts, { onConflict: 'key' });

    if (upErr) { console.error(upErr.message); break; }

    fixed += upserts.length;
    offset += BATCH;
    process.stdout.write(`\r  Fixed ${fixed} products...`);
    if (data.length < BATCH) break;
  }

  console.log(`\n✓ Done! Fixed ${fixed} product IDs. Now run a CDN sync.`);
}

main().catch(err => { console.error(err); process.exit(1); });
