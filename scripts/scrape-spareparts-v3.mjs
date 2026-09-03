import { chromium } from 'playwright';
import { createWriteStream } from 'fs';

const BASE = 'https://simcogroup.com.au';
const START = `${BASE}/spare-parts.html`;

const out = createWriteStream('spareparts-v3.csv');
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
  await listPage.waitForTimeout(2000);

  const links = await listPage.evaluate(() => {
    return Array.from(document.querySelectorAll('.product-item-info a.product-item-photo, .product-item-name a'))
      .map(a => a.href)
      .filter((v, i, arr) => arr.indexOf(v) === i);
  });

  if (links.length === 0) break;
  allUrls.push(...links);
  console.log(`  Found ${links.length} links (total: ${allUrls.length})`);

  const hasNext = await listPage.$('.pages-item-next:not(.disabled)');
  if (!hasNext) break;
  pageNum++;
}

await listPage.close();
console.log(`\nTotal: ${allUrls.length} URLs. Scraping details...\n`);

const detailPage = await context.newPage();
let done = 0;

for (const productUrl of allUrls) {
  try {
    await detailPage.goto(productUrl, { waitUntil: 'networkidle', timeout: 25000 });
    await detailPage.waitForTimeout(1000);

    const product = await detailPage.evaluate(() => {
      const name = document.querySelector('.page-title span')?.textContent?.trim() || '';
      const sku = document.querySelector('.product.attribute.sku .value')?.textContent?.trim() || '';
      const priceEl = document.querySelector('.product-info-main .price');
      const price = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '';

      // Try multiple image selectors, skip placeholders
      let img = '';
      const imgCandidates = [
        document.querySelector('.fotorama__img[src*="catalog/product"]'),
        document.querySelector('.product-image-photo[src*="catalog/product"]'),
        document.querySelector('img[src*="catalog/product"]'),
        document.querySelector('.fotorama__img'),
        document.querySelector('.product-image-photo'),
      ];
      for (const el of imgCandidates) {
        if (el?.src && !el.src.includes('placeholder') && !el.src.includes('small_image')) {
          img = el.src;
          break;
        }
      }

      // Try data-src as fallback
      if (!img) {
        const lazyImg = document.querySelector('img[data-src*="catalog/product"]');
        img = lazyImg?.getAttribute('data-src') || '';
      }

      const brand = document.querySelector('.product.attribute.brand .value')?.textContent?.trim() || 'Simco';
      return { name, sku, brand, price, img };
    });

    if (!product.sku) {
      const m = productUrl.match(/\/([^/]+)\.html$/);
      product.sku = m ? m[1] : '';
    }

    const line = [product.name, product.sku, product.brand, product.price, product.img, productUrl]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
    out.write(line + '\n');
    done++;
    process.stdout.write(`\r  ${done}/${allUrls.length} — ${product.name.slice(0, 40)}`);
  } catch (e) {
    console.error(`\nFailed: ${productUrl} — ${e.message}`);
  }
}

await browser.close();
out.end();
console.log(`\n\n✓ Done! ${done} spare parts → spareparts-v3.csv`);
