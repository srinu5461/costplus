import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CSV_PATH = '/root/.claude/uploads/27ab8173-c6f3-5eab-a5c8-0f9547275b00/17aa1ddd-SimcoListProducts20260825_065600.csv';

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parsePrice(s) {
  const n = parseFloat((s || '').replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseImages(s) {
  return (s || '').split('|').map(x => x.trim()).filter(Boolean);
}

const csvText = readFileSync(CSV_PATH, 'utf-8');
const lines = csvText.split(/\r?\n/).filter(l => l.trim());

// Normalize headers to lowercase
const rawHeaders = parseCsvLine(lines[0]);
const headers = rawHeaders.map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));

console.log('Headers:', headers.join(', '));

const batch = [];
let skipped = 0;

for (let i = 1; i < lines.length; i++) {
  const fields = parseCsvLine(lines[i]);
  const row = {};
  headers.forEach((h, idx) => { row[h] = fields[idx] || ''; });

  // Only include Atosa Combi Ovens
  const attributeSet = row.attribute_set || '';
  const brand = row.brand || '';
  const sku = row.sku || '';
  const name = row.name || '';

  if (
    brand.toLowerCase() !== 'atosa' ||
    attributeSet.toLowerCase() !== 'combi oven'
  ) {
    continue;
  }

  if (!sku || !name || sku.length > 50) { skipped++; continue; }

  const price = parsePrice(row.price);
  if (!price) { skipped++; continue; }

  const mainImage = row.base_image_url || '';
  const additionalImages = parseImages(row.addtional_image);
  const allImages = [mainImage, ...additionalImages.filter(img => img !== mainImage)].filter(Boolean);

  const dimensionsStr = [row.width, row.depth, row.height].filter(Boolean).join(' x ');

  const product = {
    id: sku,
    code: sku,
    sku,
    name,
    brand: row.brand || 'Atosa',
    brandLogoUrl: 'https://simcogroup.com.au/pub/media/wysiwyg/gas_anim.png',
    category: 'Combi Oven',
    categoryId: 'SC-COMBI',
    categoryLevel1: 'Simco Equipment',
    categoryLevel2: 'Combi Oven',
    price,
    image: mainImage,
    mainImageUrl: mainImage,
    allImages,
    galleryImages: allImages,
    description: name,
    shortDescription: name,
    fullDescription: '',
    specifications: '',
    features: [],
    inStock: true,
    stockStatus: 'In Stock',
    dimensions: dimensionsStr,
    weight: row.weight || '',
    warranty: row.warranty || '',
    productUrl: row.product_url || '',
    url: row.product_url || '',
    importSource: 'simco',
    importedAt: new Date().toISOString(),
    status: true,
    rating: 0,
  };

  batch.push({ key: `products:${sku}`, value: product });
  console.log(`  Queued: ${sku} - ${name} ($${price})`);
}

console.log(`\nQueued ${batch.length} Atosa combi ovens. Skipped ${skipped}.`);

if (batch.length === 0) {
  console.log('Nothing to import.');
  process.exit(0);
}

const { error } = await supabase.from('kv_store_577b3f26').upsert(batch, { onConflict: 'key' });
if (error) {
  console.error('Error inserting:', error.message);
  process.exit(1);
}

console.log(`\nSuccessfully imported ${batch.length} Atosa combi oven products into the database.`);
