// Legal Pages Backend - API for Terms, Return Policy, and Privacy Policy
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const legal = new Hono();

// Get legal page content
legal.get('/:pageType', async (c) => {
  const pageType = c.req.param('pageType');

  try {
    const content = await kv.get(`legal_page_${pageType}`);

    if (content) {
      return c.json({
        success: true,
        content: content.content,
        lastUpdated: content.lastUpdated
      });
    } else {
      // Return empty content if not found (client will use default)
      return c.json({
        success: true,
        content: '',
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    return c.json({ error: 'Failed to get page content' }, 500);
  }
});

// Save legal page content
legal.post('/:pageType', async (c) => {
  const pageType = c.req.param('pageType');

  try {
    const { content, lastUpdated } = await c.req.json();

    await kv.set(`legal_page_${pageType}`, {
      content,
      lastUpdated: lastUpdated || new Date().toISOString()
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to save page content' }, 500);
  }
});

export default legal;