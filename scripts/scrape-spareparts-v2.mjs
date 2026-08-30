import { chromium } from 'playwright';
import { createWriteStream } from 'fs';

const BASE = 'https://simcogroup.com.au';
const START = `${BASE}/spare-parts.html`;

const out = createWriteStream('spareparts.csv');
out.write('name,sku,brand,price,image,url\n');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const listPage = await context.newPage();

// Collect all product URLs first
const allUrls = [];
let pageNum = 1;

while (true) {
  const url = pageNum === 1 ? START : `${START}?p=${pageNum}`;
  console.log(`Listing page ${pageNum}...`);
  await listPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await listPage.waitForTimeout(1500);

  const links = await listPage.evaluate(() => {
    return Array.from(document.querySelectorAll('.product-item-info a.product-item-photo, .product-item-name a'))
      .map(a => a.href)
      .filter((v, i, arr) => arr.indexOf(v) === i); // dedupe
  });

  if (links.length === 0) break;
  allUrls.push(...links);
  console.log(`  Found ${links.length} links (total: ${allUrls.length})`);

  const hasNext = await listPage.$('.pages-item-next:not(.disabled)');
  if (!hasNext) break;
  pageNum++;
}

await listPage.close();
console.log(`\nTotal product URLs: ${allUrls.length}. Now scraping details...\n`);

const detailPage = await context.newPage();
let done = 0;

for (const productUrl of allUrls) {
  try {
    await detailPage.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await detailPage.waitForTimeout(800);

    const product = await detailPage.evaluate(() => {
      const name = document.querySelector('.page-title span')?.textContent?.trim() || '';
      const sku = document.querySelector('.product.attribute.sku .value')?.textContent?.trim() || '';
      const priceEl = document.querySelector('.product-info-main .price');
      const price = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '';
      const img = document.querySelector('.fotorama__img')?.src ||
                  document.querySelector('.product-image-photo')?.src || '';
      const brand = document.querySelector('.product.attribute.brand .value')?.textContent?.trim() ||
                    document.querySelector('[itemprop="brand"]')?.textContent?.trim() || 'Simco';
      return { name, sku, brand, price, img };
    });

    // fallback SKU from URL
    if (!product.sku) {
      const m = productUrl.match(/\/([^/]+)\.html$/);
      product.sku = m ? m[1].toUpperCase() : '';
    }

    const line = [product.name, product.sku, product.brand, product.price, product.img, productUrl]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
    out.write(line + '\n');
    done++;
    process.stdout.write(`\r  ${done}/${allUrls.length} done...`);
  } catch (e) {
    console.error(`\nFailed: ${productUrl} — ${e.message}`);
  }
}

await browser.close();
out.end();
console.log(`\n\n✓ Done! ${done} spare parts saved to spareparts.csv`);
