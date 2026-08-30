import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseCsv(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const fields = parseLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = fields[i] || '');
    return row;
  });
}

function parseLine(line) {
  const fields = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  fields.push(cur.trim());
  return fields;
}

const csv = readFileSync('spareparts.csv', 'utf8');
const rows = parseCsv(csv);
console.log(`Parsed ${rows.length} rows`);

let imported = 0, skipped = 0;
const BATCH = 50;
let batch = [];

const flush = async () => {
  if (!batch.length) return;
  // Deduplicate by key — keep last occurrence
  const seen = new Map();
  for (const item of batch) seen.set(item.key, item);
  const deduped = [...seen.values()];
  const { error } = await supabase.from('kv_store_577b3f26').upsert(deduped, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  imported += deduped.length;
  batch = [];
};

for (const row of rows) {
  const name = row.name?.trim();
  const price = parseFloat(row.price) || 0;
  if (!name || !price) { skipped++; continue; }

  // Use SKU if it looks like a real code, otherwise derive from URL
  let sku = row.sku?.trim();
  if (!sku || sku === name) {
    const m = row.url?.match(/\/([^/]+)\.html$/);
    sku = m ? m[1].toUpperCase().replace(/-/g, '') : name.replace(/\s+/g, '-').toUpperCase();
  }

  // Make key safe
  const key = `products:SP-${sku.replace(/[^A-Za-z0-9\-_]/g, '').slice(0, 60)}`;

  const product = {
    id: `SP-${sku.replace(/[^A-Za-z0-9\-_]/g, '').slice(0, 60)}`,
    code: sku,
    sku,
    name,
    brand: row.brand || 'Simco',
    category: 'Simco Equipment',
    categoryLevel1: 'Simco Equipment',
    categoryLevel2: 'Spare Parts',
    categoryId: 'SC-SPARE',
    categoryName: 'Spare Parts',
    wholePath: 'Simco Equipment > Spare Parts',
    price,
    wasPrice: undefined,
    image: row.image || '',
    mainImageUrl: row.image || '',
    allImages: row.image ? [row.image] : [],
    galleryImages: row.image ? [row.image] : [],
    description: name,
    shortDescription: name,
    inStock: true,
    stockStatus: 'In Stock',
    importSource: 'simco',
    importedAt: new Date().toISOString(),
    productUrl: row.url || '',
    url: row.url || '',
    status: true,
    rating: 0,
  };

  batch.push({ key, value: product });
  if (batch.length >= BATCH) await flush();
}

await flush();
console.log(`\n✓ Done! Imported: ${imported}, Skipped: ${skipped}`);
console.log('Now run CDN sync from admin panel.');
