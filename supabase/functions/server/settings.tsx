import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';

const settings = new Hono();

// Bank Details Endpoints
settings.get('/bank-details', async (c) => {
  try {
    const bankDetails = await kv.get('bank_details');
    return c.json({ success: true, bankDetails });
  } catch (error) {
    console.error('Error fetching bank details:', error);
    return c.json({ success: false, error: 'Failed to fetch bank details' }, 500);
  }
});

settings.post('/bank-details', async (c) => {
  try {
    const { bankDetails } = await c.req.json();
    
    if (!bankDetails) {
      return c.json({ success: false, error: 'Bank details are required' }, 400);
    }
    
    await kv.set('bank_details', bankDetails);
    console.log('Bank details saved:', bankDetails);
    
    return c.json({ success: true, message: 'Bank details saved successfully' });
  } catch (error) {
    console.error('Error saving bank details:', error);
    return c.json({ success: false, error: 'Failed to save bank details' }, 500);
  }
});

// Company Info Endpoints
settings.get('/company-info', async (c) => {
  try {
    const companyInfo = await kv.get('company_info');
    return c.json({ success: true, companyInfo });
  } catch (error) {
    console.error('Error fetching company info:', error);
    return c.json({ success: false, error: 'Failed to fetch company info' }, 500);
  }
});

settings.post('/company-info', async (c) => {
  try {
    const { companyInfo } = await c.req.json();
    
    if (!companyInfo) {
      return c.json({ success: false, error: 'Company info is required' }, 400);
    }
    
    await kv.set('company_info', companyInfo);
    console.log('Company info saved:', companyInfo);
    
    return c.json({ success: true, message: 'Company info saved successfully' });
  } catch (error) {
    console.error('Error saving company info:', error);
    return c.json({ success: false, error: 'Failed to save company info' }, 500);
  }
});

// Payment Settings Endpoints
settings.get('/payment-settings', async (c) => {
  try {
    const paymentSettings = await kv.get('payment_settings');
    return c.json({ success: true, paymentSettings });
  } catch (error) {
    console.error('Error fetching payment settings:', error);
    return c.json({ success: false, error: 'Failed to fetch payment settings' }, 500);
  }
});

settings.post('/payment-settings', async (c) => {
  try {
    const { paymentSettings } = await c.req.json();

    if (!paymentSettings) {
      return c.json({ success: false, error: 'Payment settings are required' }, 400);
    }

    await kv.set('payment_settings', paymentSettings);
    console.log('Payment settings saved:', paymentSettings);

    return c.json({ success: true, message: 'Payment settings saved successfully' });
  } catch (error) {
    console.error('Error saving payment settings:', error);
    return c.json({ success: false, error: 'Failed to save payment settings' }, 500);
  }
});

// Menu Settings Endpoints
settings.get('/menu', async (c) => {
  try {
    const menuSettings = await kv.get('menu_settings') || {
      showPromotions: true,
      showBrands: true
    };
    return c.json({ success: true, menuSettings });
  } catch (error) {
    console.error('Error fetching menu settings:', error);
    return c.json({ success: false, error: 'Failed to fetch menu settings' }, 500);
  }
});

settings.post('/menu', async (c) => {
  try {
    const { menuSettings } = await c.req.json();

    if (!menuSettings) {
      return c.json({ success: false, error: 'Menu settings are required' }, 400);
    }

    await kv.set('menu_settings', menuSettings);
    console.log('Menu settings saved:', menuSettings);

    return c.json({ success: true, message: 'Menu settings saved successfully' });
  } catch (error) {
    console.error('Error saving menu settings:', error);
    return c.json({ success: false, error: 'Failed to save menu settings' }, 500);
  }
});

export default settings;
