import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

const text = readFileSync('sparepartsv3.csv', 'utf8');
const lines = text.split('\n').filter(l => l.trim());
const headers = parseLine(lines[0]);

let updated = 0, skipped = 0;
const BATCH = 50;
let batch = [];

const flush = async () => {
  if (!batch.length) return;
  const seen = new Map();
  for (const item of batch) seen.set(item.key, item);
  const { error } = await supabase.from('kv_store_577b3f26').upsert([...seen.values()], { onConflict: 'key' });
  if (error) throw new Error(error.message);
  updated += seen.size;
  batch = [];
};

for (let i = 1; i < lines.length; i++) {
  const fields = parseLine(lines[i]);
  const row = {};
  headers.forEach((h, idx) => row[h] = fields[idx] || '');

  const image = row.image?.trim();
  if (!image || image.includes('placeholder')) { skipped++; continue; }

  // Derive the key the same way import-spareparts.mjs did
  let sku = row.sku?.trim();
  if (!sku || sku === row.name) {
    const m = row.url?.match(/\/([^/]+)\.html$/);
    sku = m ? m[1].toUpperCase() : row.name.replace(/\s+/g, '-').toUpperCase();
  }
  const safeId = `SP-${sku.replace(/[^A-Za-z0-9\-_]/g, '').slice(0, 60)}`;
  const key = `products:${safeId}`;

  // Fetch existing record
  const { data } = await supabase.from('kv_store_577b3f26').select('value').eq('key', key).single();
  if (!data) { skipped++; continue; }

  batch.push({
    key,
    value: { ...data.value, image, mainImageUrl: image, allImages: [image], galleryImages: [image] }
  });

  if (batch.length >= BATCH) await flush();
}

await flush();
console.log(`✓ Updated ${updated} images, skipped ${skipped}`);
console.log('Run CDN sync to go live.');
