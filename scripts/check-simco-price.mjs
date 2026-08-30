import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data, error } = await supabase
  .from('kv_store_577b3f26')
  .select('key, value')
  .like('key', 'products:%')
  .eq('value->>importSource', 'simco')
  .limit(3);

if (error) { console.error(error.message); process.exit(1); }

for (const row of data) {
  console.log(`${row.key}`);
  console.log(`  name: ${row.value.name}`);
  console.log(`  price: $${row.value.price}`);
  console.log(`  wasPrice: $${row.value.wasPrice}`);
  console.log();
}
