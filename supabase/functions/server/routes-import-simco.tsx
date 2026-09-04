// Simco CSV Import endpoint
import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
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

function parsePrice(s: string): number {
  const n = parseFloat((s || '').replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseStock(s: string): boolean {
  const lower = (s || '').toLowerCase();
  return lower.includes('in stock') || lower === 'yes' || lower.includes('low stock');
}

function parseImages(s: string): string[] {
  return (s || '').split('|').map(x => x.trim()).filter(Boolean);
}

function parseSpecs(s: string): Record<string, string> {
  const result: Record<string, string> = {};
  (s || '').split('|').forEach(part => {
    const idx = part.indexOf(':');
    if (idx > -1) {
      const k = part.substring(0, idx).trim();
      const v = part.substring(idx + 1).trim();
      if (k && v) result[k] = v;
    }
  });
  return result;
}

// POST /import-simco - accepts multipart CSV upload or raw CSV body
app.post('/', async (c) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let csvText = '';

  const contentType = c.req.header('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await c.req.formData();
    const file = form.get('file') as File | null;
    if (!file) return c.json({ error: 'No file uploaded. Use field name "file".' }, 400);
    csvText = await file.text();
  } else {
    csvText = await c.req.text();
  }

  if (!csvText.trim()) return c.json({ error: 'Empty CSV' }, 400);

  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return c.json({ error: 'CSV has no data rows' }, 400);

  // Normalize headers to lowercase with underscores for consistent access
  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));

  let imported = 0;
  let skipped = 0;
  const BATCH = 50;
  let batch: { key: string; value: any }[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    const { error } = await supabase.from('kv_store_577b3f26').upsert(batch, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    imported += batch.length;
    batch = [];
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = fields[idx] || ''; });

    const sku = row.sku || row.model || '';
    const name = row.name || '';
    // Skip rows where SKU looks like a product name (data error in CSV)
    if (!name || !sku || sku.length > 50) { skipped++; continue; }

    const price = parsePrice(row.price);
    if (!price) { skipped++; continue; }

    // CSV uses "Base Image URL" → base_image_url, "Addtional Image" → addtional_image
    const images = parseImages(row.all_images || row.addtional_image || row.base_image_url || row.image);
    const mainImage = row.base_image_url || images[0] || '';
    const allImages = [mainImage, ...images.filter(img => img !== mainImage)].filter(Boolean);

    const specs = parseSpecs(row.specifications || row.specification);
    const dimensionsStr = [row.width, row.depth, row.height].filter(Boolean).join(' x ');

    // Category: use "Attribute Set" column (attribute_set) as category if Category is empty
    const category = row.category || row.attribute_set || 'Commercial Kitchen';

    const product = {
      id: sku,
      code: sku,
      sku,
      name,
      brand: row.brand || 'Simco',
      category,
      categoryLevel1: category,
      categoryLevel2: row.subcategory || '',
      price,
      wasPrice: parsePrice(row.was_price || row.rap) || undefined,
      image: mainImage,
      mainImageUrl: mainImage,
      allImages,
      galleryImages: allImages,
      description: row.description || row.short_description || '',
      shortDescription: row.short_description || '',
      fullDescription: row.description || '',
      specifications: row.specifications || row.specification || '',
      features: row.features ? row.features.split('|').map((f: string) => f.trim()).filter(Boolean) : [],
      inStock: parseStock(row.in_stock),
      stockStatus: row.in_stock || '',
      storeAvailability: row.store_availability || '',
      dimensions: dimensionsStr || row.dimensions || '',
      weight: row.weight || specs['Weight'] || '',
      warranty: row.warranty || '',
      productUrl: row.product_url || row.url || '',
      url: row.product_url || row.url || '',
      importSource: 'simco',
      importedAt: new Date().toISOString(),
      status: true,
      rating: 0,
    };

    batch.push({ key: `products:${sku}`, value: product });
    if (batch.length >= BATCH) await flush();
  }

  await flush();

  return c.json({
    success: true,
    imported,
    skipped,
    total: lines.length - 1,
    message: `Imported ${imported} products. Run a CDN sync to push them live.`
  });
});

export default app;
