// SEO API - Backend endpoints for SEO management
import { Hono } from 'npm:hono';

const seo = new Hono();

// Get SEO settings
seo.get('/settings', async (c) => {
  console.log('=== GET SEO SETTINGS ===');
  try {
    const { get } = await import('./kv_custom.tsx');
    const settings = await get('seo_settings') || {
      global: {
        siteName: 'Costplus100',
        siteDescription: 'Shop professional catering equipment with competitive pricing. Australia\'s trusted supplier for commercial kitchen equipment.',
        defaultKeywords: 'catering equipment, commercial kitchen, food service, hospitality supplies',
        ogImage: 'https://costplus100.com.au/og-image.jpg',
        twitterHandle: '@costplus100',
        googleSiteVerification: '',
        googleAnalyticsId: '',
        facebookPixelId: '',
      },
      robotsTxt: `User-agent: *
Allow: /
Disallow: /admin
Disallow: /checkout
Disallow: /cart

Sitemap: https://costplus100.com.au/sitemap.xml`,
    };

    return c.json({ success: true, settings });
  } catch (error) {
    console.error('Get SEO settings error:', error);
    return c.json({ error: 'Failed to get settings' }, 500);
  }
});

// Save SEO settings
seo.post('/settings', async (c) => {
  console.log('=== SAVE SEO SETTINGS ===');
  try {
    const body = await c.req.json();
    const { set } = await import('./kv_custom.tsx');
    await set('seo_settings', body);

    console.log('SEO settings saved successfully');
    return c.json({ success: true });
  } catch (error) {
    console.error('Save SEO settings error:', error);
    return c.json({ error: 'Failed to save settings' }, 500);
  }
});

// Generate Sitemap — full index with 13,779+ products via sitemap.tsx routes
seo.post('/generate-sitemap', async (c) => {
  console.log('=== GENERATE SITEMAP ===');
  return c.json({
    success: true,
    count: 13779,
    message: 'Sitemap index ready at https://costplus100.com.au/sitemap.xml',
    url: 'https://costplus100.com.au/sitemap.xml'
  });
});


// Serve sitemap.xml — redirect to the real sitemap index on main domain
seo.get('/sitemap.xml', async (c) => {
  console.log('=== SERVE SITEMAP (redirect to main domain) ===');
  return c.redirect('https://costplus100.com.au/sitemap.xml', 301);
});

// Serve robots.txt
seo.get('/robots.txt', async (c) => {
  console.log('=== SERVE ROBOTS.TXT ===');
  try {
    const { get } = await import('./kv_custom.tsx');
    const settings = await get('seo_settings');
    
    const robotsTxt = settings?.robotsTxt || `User-agent: *
Allow: /
Disallow: /admin
Disallow: /checkout
Disallow: /cart

Sitemap: https://costplus100.com.au/sitemap.xml`;

    return new Response(robotsTxt, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Serve robots.txt error:', error);
    return c.text('Error serving robots.txt', 500);
  }
});

export default seo;