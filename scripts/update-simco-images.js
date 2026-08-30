// Updates Simco subcategory images in category_tree
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } }
});

const BASE = 'https://simcogroup.com.au/pub/media/wysiwyg/home_page/';

const BASE2 = 'https://simcogroup.com.au/pub/media/wysiwyg/home_page/';

const IMAGES = {
  'SC-CAKE-CURVE': BASE + 'category_curvedglasscakedisplay.webp',
  'SC-CAKE-SQ':    BASE + 'category_squareglasscakedisplay.webp',
  'SC-BAIN':       BASE + 'category_bainmarie.webp',
  'SC-SOUP':       BASE + 'category_soupkettle.webp',
  'SC-GN-SS':      BASE + 'category_gnpans.webp',
  'SC-GN':         BASE + 'category_gnpans.webp',
  'SC-BAR-F':      BASE + 'category_barfridges.webp',
  'SC-PREP-F':     BASE + 'category_prepfridges.webp',
  'SC-PIZZA-P':    BASE + 'category_pizzaprep.webp',
  'SC-SALAD':      BASE + 'category_saladbars.webp',
  'SC-UPRIGHT-S':  BASE + 'category_uprightfridgefreezers.webp',
  'SC-UPRIGHT-D':  BASE + 'category_uprightdisplayfridgefreezers.webp',
  'SC-UB-FRIDGE':  BASE + 'category_underbenchfridgefreezers.webp',
  // Stainless product
  'SC-BENCH-SP':   BASE2 + 'category_stainlesssteel_02.webp',
  'SC-SINK-D':     BASE2 + 'category_stainlesssteel_03.webp',
  'SC-BENCH-F':    BASE2 + 'category_stainlesssteel_04.webp',
  'SC-SINK-S':     BASE2 + 'Single-Sink-Bench.webp',
  // Gas equipment
  'SC-GAS':        BASE2 + 'category_gasstoves.webp',
};

async function main() {
  const { data, error } = await supabase
    .from('kv_store_577b3f26')
    .select('value')
    .eq('key', 'category_tree')
    .single();

  if (error) { console.error(error.message); process.exit(1); }

  const tree = data.value;
  let updated = 0;

  const newTree = tree.map(node => {
    if (IMAGES[node.id]) {
      updated++;
      return { ...node, image: IMAGES[node.id], imageUrl: IMAGES[node.id] };
    }
    return node;
  });

  const { error: saveErr } = await supabase
    .from('kv_store_577b3f26')
    .upsert({ key: 'category_tree', value: newTree }, { onConflict: 'key' });

  if (saveErr) { console.error(saveErr.message); process.exit(1); }

  console.log(`✓ Updated images for ${updated} subcategories.`);
  console.log('Refresh the site (or hit the cache clear URL) to see changes.');
}

main().catch(err => { console.error(err); process.exit(1); });
