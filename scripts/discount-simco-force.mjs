import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let offset = 0;
let updated = 0;
const BATCH = 100;

while (true) {
  const { data, error } = await supabase
    .from('kv_store_577b3f26')
    .select('key, value')
    .like('key', 'products:%')
    .range(offset, offset + BATCH - 1);

  if (error) { console.error(error.message); break; }
  if (!data || data.length === 0) break;

  const simco = data.filter(row => {
    const v = row.value;
    return (
      v?.importSource === 'simco' ||
      v?.category === 'Simco Equipment' ||
      String(v?.wholePath).toLowerCase().includes('simco')
    );
  });

  if (simco.length > 0) {
    const upserts = simco.map(row => {
      const v = row.value;
      // Use originalPrice field if we set it, otherwise use current price
      const basePrice = v.originalPrice || v.price || 0;
      const discounted = Math.round(basePrice * 0.9 * 100) / 100;
      return {
        key: row.key,
        value: {
          ...v,
          originalPrice: basePrice,  // store the true original
          wasPrice: basePrice,
          price: discounted,
        }
      };
    });

    const { error: upErr } = await supabase
      .from('kv_store_577b3f26')
      .upsert(upserts, { onConflict: 'key' });
    if (upErr) { console.error('Upsert error:', upErr.message); break; }
    updated += upserts.length;
  }

  process.stdout.write(`\r  Processed ${offset + data.length}, updated ${updated}...`);
  if (data.length < BATCH) break;
  offset += BATCH;
}

console.log(`\n✓ Done! Applied -10% to ${updated} Simco products. Run CDN sync.`);
