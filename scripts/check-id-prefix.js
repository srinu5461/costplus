const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } }
});

async function main() {
  let offset = 0;
  let wrongCount = 0;
  let rightCount = 0;
  const wrong = [];

  while (true) {
    const { data, error } = await supabase
      .from('kv_store_577b3f26')
      .select('key, value')
      .like('key', 'products:%')
      .range(offset, offset + 99);

    if (error) { console.error(error.message); break; }
    if (!data || data.length === 0) break;

    for (const row of data) {
      const id = row.value?.id || '';
      if (id.startsWith('simco-')) {
        wrongCount++;
        if (wrong.length < 5) wrong.push({ key: row.key, id });
      } else {
        rightCount++;
      }
    }

    offset += 100;
    if (data.length < 100) break;
  }

  console.log(`Correct IDs: ${rightCount}`);
  console.log(`Wrong IDs (simco- prefix): ${wrongCount}`);
  if (wrong.length) console.log('Samples:', wrong);
}

main().catch(err => { console.error(err); process.exit(1); });
