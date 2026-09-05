import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const skus = [
  'AT65G2B-C-LPG',
  'AT65G2B-C-NG',
  'AT80G2B-F-LPG',
  'AT80G2B-F-NG',
  'ATHP-12-2-NG',
  'ATHP-12-2-LPG',
  'AT80G4B-F-LPG',
  'AT80G4B-F-NG',
];

for (const sku of skus) {
  const { data, error } = await supabase
    .from('kv_store_577b3f26')
    .select('key, value')
    .eq('key', `products:${sku}`)
    .single();

  if (error || !data) {
    console.log(`❌ NOT FOUND: ${sku}`);
    continue;
  }

  const updated = {
    ...data.value,
    inStock: true,
    stockStatus: 'In Stock',
    backOrderAvailable: false,
  };

  const { error: upsertError } = await supabase
    .from('kv_store_577b3f26')
    .upsert({ key: `products:${sku}`, value: updated }, { onConflict: 'key' });

  if (upsertError) {
    console.log(`❌ Failed ${sku}: ${upsertError.message}`);
  } else {
    console.log(`✅ ${sku} → In Stock`);
  }
}

console.log('\nDone.');
