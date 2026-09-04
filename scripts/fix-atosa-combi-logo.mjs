import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ATOSA_LOGO = 'https://simcogroup.com.au/pub/media/wysiwyg/gas_anim.png';

const skus = [
  'EPC-1011E2', 'AS-101', 'AS-5171', 'ASK-11', 'EPC-0511E1',
  'EPC-0711E2', 'EPC-0621E2', 'EPC-1021E3', 'ASR-5171', 'CEC11C',
  'ASR-62', 'ASK-21', 'CTCO-25', 'CTCO-50', 'CTCO-100'
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

  const updated = { ...data.value, brandLogoUrl: ATOSA_LOGO };
  const { error: upsertError } = await supabase
    .from('kv_store_577b3f26')
    .upsert({ key: `products:${sku}`, value: updated }, { onConflict: 'key' });

  if (upsertError) {
    console.log(`❌ Failed ${sku}: ${upsertError.message}`);
  } else {
    console.log(`✅ Updated brandLogoUrl for ${sku}`);
  }
}

console.log('\nDone.');
