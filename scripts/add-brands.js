// Add Atosa and Cookrite brand logos to menu brands
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } }
});

const NOW = new Date().toISOString();

const BRANDS = [
  {
    id: 'brand-atosa',
    name: 'Atosa',
    slug: 'atosa',
    logoUrl: 'https://simcogroup.com.au/pub/media/wysiwyg/gas_anim.png',
    sortOrder: 10,
    enabled: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'brand-cookrite',
    name: 'Cookrite',
    slug: 'cookrite',
    logoUrl: 'https://simcogroup.com.au/pub/media/wysiwyg/gefegerator_anim.png',
    sortOrder: 11,
    enabled: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

async function main() {
  // Fetch existing brand list
  const { data: listData } = await supabase
    .from('kv_store_577b3f26')
    .select('value')
    .eq('key', 'menu-brands:list')
    .single();

  const existingList = Array.isArray(listData?.value) ? listData.value : [];
  console.log(`Existing brands: ${existingList.length}`, existingList);

  const upserts = BRANDS.map(brand => ({ key: `menu-brand:${brand.id}`, value: brand }));

  const { error } = await supabase.from('kv_store_577b3f26').upsert(upserts, { onConflict: 'key' });
  if (error) { console.error('Upsert error:', error.message); process.exit(1); }

  // Add to list if not already there
  const newIds = BRANDS.map(b => b.id).filter(id => !existingList.includes(id));
  const updatedList = [...existingList, ...newIds];

  const { error: listErr } = await supabase.from('kv_store_577b3f26')
    .upsert({ key: 'menu-brands:list', value: updatedList }, { onConflict: 'key' });
  if (listErr) { console.error('List update error:', listErr.message); process.exit(1); }

  console.log('✓ Added Atosa and Cookrite brand logos.');
  console.log('Updated list:', updatedList);
}

main().catch(err => { console.error(err); process.exit(1); });
