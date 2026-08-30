// Replace Polar and Thor menu brands with Simco Range
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } }
});

async function main() {
  // Fetch all KV keys that might contain menu brands
  const { data, error } = await supabase
    .from('kv_store_577b3f26')
    .select('key, value')
    .or('key.eq.menu_brands,key.eq.header,key.like.menu%,key.like.brand%,key.like.nav%');

  if (error) { console.error(error.message); process.exit(1); }

  console.log('Found keys:', data.map(r => r.key));

  for (const row of data) {
    const val = JSON.stringify(row.value);
    if (val.toLowerCase().includes('polar') || val.toLowerCase().includes('thor')) {
      console.log(`\nKey "${row.key}" contains Polar/Thor:`, JSON.stringify(row.value, null, 2));
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
