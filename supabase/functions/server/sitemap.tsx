/**
 * Sitemap Index Generator
 *
 * Uses sitemap index pattern to handle 13,000+ products without memory issues
 * - sitemap.xml: Index file referencing all sitemaps
 * - sitemap-static.xml: Pages, real brands and categories from KV
 * - sitemap-products-{page}.xml: Paginated product chunks (1000 per file)
 */

const PRODUCTS_PER_SITEMAP = 1000;
const BASE_URL = 'https://costplus100.com.au';
const SELF_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049';

export function registerSitemapRoute(app: any, kv: any) {

  // Main sitemap index
  app.get('/make-server-d1fbc049/sitemap.xml', async (c) => {
    console.log('🗺️ Generating sitemap index...');

    const numProductSitemaps = 14; // ~13,779 products / 1000 per sitemap
    const today = new Date().toISOString().split('T')[0];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    xml += '  <sitemap>\n';
    xml += `    <loc>${SELF_URL}/sitemap-static.xml</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '  </sitemap>\n';

    for (let i = 1; i <= numProductSitemaps; i++) {
      xml += '  <sitemap>\n';
      xml += `    <loc>${SELF_URL}/sitemap-products-${i}.xml</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += '  </sitemap>\n';
    }

    xml += '</sitemapindex>';

    console.log(`✅ Sitemap index generated (${numProductSitemaps + 1} sitemaps)`);

    return c.text(xml, 200, {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
  });

  // Static sitemap — pages, dynamic brands from DB, dynamic categories from KV
  app.get('/make-server-d1fbc049/sitemap-static.xml', async (c) => {
    console.log('🗺️ Generating static sitemap...');

    const today = new Date().toISOString().split('T')[0];

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch distinct brands directly from the products table
    const { data: brandRows } = await supabase
      .from('cms_products')
      .select('brand')
      .not('brand', 'is', null)
      .neq('brand', '');

    const brandSlugs: string[] = [...new Set(
      (brandRows || []).map((r: any) => r.brand).filter(Boolean)
    )].map((brand: string) => brand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));

    // Fetch category tree from KV and convert fullPath to slug
    const categoryTree = await kv.get('category_tree').catch(() => []);

    function categoryToSlug(path: string): string {
      return path.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    const categorySlugs: string[] = [];
    function extractCategories(nodes: any[]) {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        const path = node.fullPath || node.name;
        if (path) categorySlugs.push(categoryToSlug(path));
        if (node.children) extractCategories(node.children);
      }
    }
    if (Array.isArray(categoryTree)) extractCategories(categoryTree);

    console.log(`📦 Found ${brandSlugs.length} brands, ${categorySlugs.length} categories`);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    // Homepage
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}/</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';

    // Static pages
    const pages = [
      { path: '/products', priority: '0.9', changefreq: 'daily' },
      { path: '/brands', priority: '0.8', changefreq: 'weekly' },
      { path: '/about', priority: '0.7', changefreq: 'monthly' },
      { path: '/contact', priority: '0.7', changefreq: 'monthly' },
      { path: '/delivery-information', priority: '0.6', changefreq: 'monthly' },
      { path: '/privacy-policy', priority: '0.5', changefreq: 'monthly' },
      { path: '/terms-and-conditions', priority: '0.5', changefreq: 'monthly' },
      { path: '/return-refund-policy', priority: '0.6', changefreq: 'monthly' },
    ];

    pages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // Real brand pages from KV
    brandSlugs.forEach(slug => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/brands/${slug}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });

    // Real category pages from category tree
    categorySlugs.forEach(slug => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/products/c/${slug}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    console.log(`✅ Static sitemap generated`);

    return c.text(xml, 200, {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
  });

  // Product sitemaps (paginated — 1000 per file)
  app.get('/make-server-d1fbc049/sitemap-products-:page.xml', async (c) => {
    const page = parseInt(c.req.param('page') || '1');
    const offset = (page - 1) * PRODUCTS_PER_SITEMAP;

    console.log(`🗺️ Generating product sitemap page ${page} (offset: ${offset})...`);

    try {
      const { createClient } = await import('jsr:@supabase/supabase-js@2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: products, error } = await supabase
        .from('cms_products')
        .select('id, brand')
        .range(offset, offset + PRODUCTS_PER_SITEMAP - 1)
        .order('id');

      if (error) throw error;

      console.log(`📦 Fetched ${products?.length || 0} products for page ${page}`);

      const today = new Date().toISOString().split('T')[0];

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

      products?.forEach(product => {
        if (!product.id) return;

        const brand = (product.brand || '').toLowerCase();
        let priority = '0.7';
        if (brand.includes('polar')) priority = '0.9';
        else if (brand.includes('thor') || brand.includes('apuro')) priority = '0.85';

        xml += '  <url>\n';
        xml += `    <loc>${BASE_URL}/products/${encodeURIComponent(product.id)}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += `    <priority>${priority}</priority>\n`;
        xml += '  </url>\n';
      });

      xml += '</urlset>';

      console.log(`✅ Product sitemap page ${page} generated`);

      return c.text(xml, 200, {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
    } catch (error) {
      console.error(`❌ Error generating product sitemap page ${page}:`, error);
      return c.text('Error generating product sitemap', 500);
    }
  });
}
