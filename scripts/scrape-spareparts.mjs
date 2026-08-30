import { chromium } from 'playwright';
import { createWriteStream } from 'fs';

const BASE = 'https://simcogroup.com.au';
const START = `${BASE}/spare-parts.html`;

const out = createWriteStream('spareparts.csv');
out.write('name,sku,brand,price,image,url\n');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let pageNum = 1;
let total = 0;

while (true) {
  const url = pageNum === 1 ? START : `${START}?p=${pageNum}`;
  console.log(`Fetching page ${pageNum}: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const products = await page.evaluate(() => {
    const items = document.querySelectorAll('.product-item');
    return Array.from(items).map(item => {
      const name = item.querySelector('.product-item-name')?.textContent?.trim() || '';
      const sku = item.querySelector('.product-item-sku, [data-sku]')?.textContent?.trim() ||
                  item.getAttribute('data-sku') || '';
      const priceEl = item.querySelector('.price');
      const price = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '';
      const img = item.querySelector('img')?.src || item.querySelector('img')?.getAttribute('data-src') || '';
      const link = item.querySelector('a')?.href || '';
      return { name, sku, price, img, link };
    });
  });

  if (products.length === 0) {
    console.log('No more products found.');
    break;
  }

  for (const p of products) {
    // Try to get SKU from product URL if not found
    const skuMatch = p.link.match(/\/([A-Z0-9\-]+)\.html$/);
    const sku = p.sku || skuMatch?.[1] || '';
    const line = [p.name, sku, 'Simco', p.price, p.img, p.link]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
    out.write(line + '\n');
    total++;
  }

  console.log(`  Page ${pageNum}: ${products.length} products (total: ${total})`);

  // Check if there's a next page
  const hasNext = await page.$('.pages-item-next:not(.disabled)');
  if (!hasNext) break;
  pageNum++;
}

await browser.close();
out.end();
console.log(`\n✓ Done! Scraped ${total} spare parts → spareparts.csv`);
