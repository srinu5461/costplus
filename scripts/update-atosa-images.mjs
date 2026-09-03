import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc2NjAwMiwiZXhwIjoyMDg4MzQyMDAyfQ.8fd11peyXK0aOcp0LJoPaqR4Zddku_w83AHawl5NssA';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE = 'https://simcogroup.com.au';

const PRODUCTS = [
  { key: 'products:AT80G4B-O-LPG', slug: 'at80g4b-o-lpg' },
  { key: 'products:AT80G4B-O-NG',  slug: 'at80g4b-o-ng' },
  { key: 'products:AT80G6B-O-LPG', slug: 'at80g6b-o-lpg' },
  { key: 'products:AT80G6B-O-NG',  slug: 'at80g6b-o-ng' },
  { key: 'products:AT80G8B-O-LPG', slug: 'at80g8b-o-lpg' },
  { key: 'products:AT80G8B-O-NG',  slug: 'at80g8b-o-ng' },
];

const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();

for (const { key, slug } of PRODUCTS) {
  const url = `${BASE}/${slug}.html`;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(1500);

    const img = await page.evaluate(() => {
      const candidates = [
        document.querySelector('.fotorama__img[src*="catalog/product"]'),
        document.querySelector('.product-image-photo[src*="catalog/product"]'),
        document.querySelector('img[src*="catalog/product"]'),
        document.querySelector('.fotorama__img'),
        document.querySelector('.product-image-photo'),
      ];
      for (const el of candidates) {
        if (el?.src && !el.src.includes('placeholder') && !el.src.includes('small_image')) return el.src;
      }
      const lazy = document.querySelector('img[data-src*="catalog/product"]');
      return lazy?.getAttribute('data-src') || '';
    });

    if (!img) { console.log(`✗ No image: ${key}`); continue; }

    const { data } = await supabase.from('kv_store_577b3f26').select('value').eq('key', key).single();
    if (!data) { console.log(`✗ Not in DB: ${key}`); continue; }

    await supabase.from('kv_store_577b3f26').update({
      value: { ...data.value, image: img, mainImageUrl: img, allImages: [img], galleryImages: [img] }
    }).eq('key', key);

    console.log(`✓ ${key} → ${img}`);
  } catch (e) {
    console.error(`✗ ${key}: ${e.message}`);
  }
}

await browser.close();
console.log('Done.');
