// CMS Backend - API for About page and other CMS content
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const cms = new Hono();

// Get About page HTML content
cms.get('/about-content', async (c) => {
  try {
    const aboutContent = await kv.get('about_page_html_content');

    if (aboutContent) {
      return c.json({
        success: true,
        content: aboutContent.content,
        lastUpdated: aboutContent.lastUpdated
      });
    } else {
      return c.json({
        success: true,
        content: '',
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Get about content error:', error);
    return c.json({ error: 'Failed to get about page content' }, 500);
  }
});

// Save About page HTML content
cms.post('/about-content', async (c) => {
  try {
    const { content, lastUpdated } = await c.req.json();

    await kv.set('about_page_html_content', {
      content,
      lastUpdated: lastUpdated || new Date().toISOString()
    });

    console.log('About page HTML content saved successfully');
    return c.json({ success: true });
  } catch (error) {
    console.error('Save about content error:', error);
    return c.json({ error: 'Failed to save about page content' }, 500);
  }
});

// Get About page structured content (old format)
cms.get('/about', async (c) => {
  try {
    const about = await kv.get('about_page_content');
    return c.json({ about: about || null });
  } catch (error) {
    console.error('Get about page error:', error);
    return c.json({ error: 'Failed to get about page content' }, 500);
  }
});

// Save About page structured content (old format)
cms.put('/about', async (c) => {
  try {
    const { about } = await c.req.json();
    await kv.set('about_page_content', about);
    console.log('About page content saved successfully');
    return c.json({ success: true });
  } catch (error) {
    console.error('Save about page error:', error);
    return c.json({ error: 'Failed to save about page content' }, 500);
  }
});

export default cms;
