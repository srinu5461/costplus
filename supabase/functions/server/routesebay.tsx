/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EBAY AUSTRALIA INTEGRATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sells CostPlus100 products on eBay Australia marketplace.
 *
 * 📖 FLOW:
 *
 * 1️⃣  AUTH
 *     - OAuth 2.0 Client Credentials (app-level token) for inventory/listing
 *     - Token cached in KV, refreshed when expired
 *
 * 2️⃣  LIST PRODUCTS ON EBAY
 *     POST /ebay/sync-listings
 *     - Pulls products from KV store
 *     - Creates/updates eBay inventory items via Inventory API
 *     - Creates/updates eBay offers (listing with price & shipping)
 *     - Publishes offers to eBay AU marketplace
 *
 * 3️⃣  ORDER SYNC
 *     POST /ebay/sync-orders
 *     - Pulls recent eBay orders
 *     - Creates matching orders in CostPlus100 database
 *
 * 4️⃣  STOCK SYNC
 *     POST /ebay/sync-stock
 *     - Updates eBay inventory quantities from KV store stock data
 *
 * 🔑 REQUIRED ENV VARS (set in Supabase Edge Function secrets):
 *     EBAY_APP_ID        - Your eBay App ID (Client ID)
 *     EBAY_CERT_ID       - Your eBay Cert ID (Client Secret)
 *     EBAY_DEV_ID        - Your eBay Dev ID
 *     EBAY_FULFILLMENT_POLICY_ID  - eBay fulfillment policy ID
 *     EBAY_PAYMENT_POLICY_ID      - eBay payment policy ID
 *     EBAY_RETURN_POLICY_ID       - eBay return policy ID
 *     EBAY_MERCHANT_LOCATION_KEY  - Your warehouse/location key
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';

const ebay = new Hono();

const EBAY_API_BASE = 'https://api.ebay.com';
const EBAY_MARKETPLACE = 'EBAY_AU';
const EBAY_CURRENCY = 'AUD';
const TOKEN_KV_KEY = 'ebay:access_token';

// ─── Auth ────────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const cached = await kv.get(TOKEN_KV_KEY);
  if (cached?.token && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const appId = Deno.env.get('EBAY_APP_ID');
  const certId = Deno.env.get('EBAY_CERT_ID');

  if (!appId || !certId) {
    throw new Error('EBAY_APP_ID and EBAY_CERT_ID env vars are required');
  }

  const credentials = btoa(`${appId}:${certId}`);
  const res = await fetch(`${EBAY_API_BASE}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope%20https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope%2Fsell.inventory%20https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope%2Fsell.fulfillment',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay auth failed: ${err}`);
  }

  const data = await res.json();
  const token = data.access_token;
  const expiresAt = Date.now() + (data.expires_in - 60) * 1000;

  await kv.set(TOKEN_KV_KEY, { token, expiresAt });
  return token;
}

function ebayHeaders(token: string, extras: Record<string, string> = {}) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-EBAY-C-MARKETPLACE-ID': EBAY_MARKETPLACE,
    ...extras,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildInventoryItem(product: any) {
  return {
    availability: {
      shipToLocationAvailability: {
        quantity: product.inStock ? (product.stockLevel || 10) : 0,
      },
    },
    condition: 'NEW',
    product: {
      title: product.name?.substring(0, 80) || 'Product',
      description: product.description || product.name || '',
      imageUrls: product.image ? [product.image] : [],
      mpn: product.code || product.sku || '',
      brand: product.brand || 'Unbranded',
    },
  };
}

function buildOffer(product: any, inventoryItemKey: string) {
  const fulfillmentPolicyId = Deno.env.get('EBAY_FULFILLMENT_POLICY_ID') || '';
  const paymentPolicyId = Deno.env.get('EBAY_PAYMENT_POLICY_ID') || '';
  const returnPolicyId = Deno.env.get('EBAY_RETURN_POLICY_ID') || '';
  const merchantLocationKey = Deno.env.get('EBAY_MERCHANT_LOCATION_KEY') || '';

  return {
    sku: inventoryItemKey,
    marketplaceId: EBAY_MARKETPLACE,
    format: 'FIXED_PRICE',
    availableQuantity: product.inStock ? (product.stockLevel || 10) : 0,
    categoryId: mapCategoryToEbay(product.category),
    listingDescription: product.description || product.name || '',
    listingPolicies: {
      fulfillmentPolicyId,
      paymentPolicyId,
      returnPolicyId,
    },
    merchantLocationKey,
    pricingSummary: {
      price: {
        currency: EBAY_CURRENCY,
        value: String(product.price?.toFixed(2) || '0.00'),
      },
    },
    tax: {
      applyTax: true,
      vatPercentage: 10, // Australian GST
    },
  };
}

// Maps your category names to eBay category IDs for AU
function mapCategoryToEbay(category: string): string {
  if (!category) return '183469'; // default: Commercial Kitchen Equipment
  const c = category.toLowerCase();
  if (c.includes('refriger') || c.includes('fridge')) return '177788';
  if (c.includes('cooking') || c.includes('oven')) return '183469';
  if (c.includes('bakery') || c.includes('baking')) return '166722';
  if (c.includes('clothing') || c.includes('uniform')) return '57988';
  if (c.includes('footwear') || c.includes('shoe')) return '63889';
  if (c.includes('storage') || c.includes('shelv')) return '20625';
  if (c.includes('cleaning')) return '26678';
  if (c.includes('coffee') || c.includes('beverage')) return '183469';
  return '183469'; // default: Commercial Kitchen Equipment
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /ebay/status — check credentials and connection
ebay.get('/status', async (c) => {
  const appId = Deno.env.get('EBAY_APP_ID');
  const certId = Deno.env.get('EBAY_CERT_ID');

  if (!appId || !certId) {
    return c.json({ ok: false, error: 'EBAY_APP_ID and EBAY_CERT_ID not set in Supabase secrets' });
  }

  try {
    const token = await getAccessToken();
    const cached = await kv.get(TOKEN_KV_KEY);
    return c.json({
      ok: true,
      tokenObtained: !!token,
      tokenExpiresAt: cached?.expiresAt ? new Date(cached.expiresAt).toISOString() : null,
      marketplace: EBAY_MARKETPLACE,
      policies: {
        fulfillment: !!Deno.env.get('EBAY_FULFILLMENT_POLICY_ID'),
        payment: !!Deno.env.get('EBAY_PAYMENT_POLICY_ID'),
        return: !!Deno.env.get('EBAY_RETURN_POLICY_ID'),
        merchantLocation: !!Deno.env.get('EBAY_MERCHANT_LOCATION_KEY'),
      },
    });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message });
  }
});

// POST /ebay/sync-listings — push products to eBay (batch)
// Body: { limit?: number, offset?: number, codes?: string[] }
ebay.post('/sync-listings', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const limit = body.limit || 50;
    const offset = body.offset || 0;
    const filterCodes: string[] | undefined = body.codes;

    const token = await getAccessToken();

    // Load products from KV
    const allProducts: any[] = await kv.getByPrefix('products:');
    const products = filterCodes
      ? allProducts.filter((p) => filterCodes.includes(p.code || p.sku))
      : allProducts.slice(offset, offset + limit);

    const results = { listed: 0, updated: 0, failed: 0, errors: [] as string[] };

    for (const product of products) {
      const sku = `CP100-${product.code || product.id}`;

      try {
        // 1. Create/update inventory item
        const itemRes = await fetch(
          `${EBAY_API_BASE}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
          {
            method: 'PUT',
            headers: ebayHeaders(token),
            body: JSON.stringify(buildInventoryItem(product)),
          }
        );

        if (!itemRes.ok && itemRes.status !== 204) {
          const err = await itemRes.text();
          results.failed++;
          results.errors.push(`${sku}: inventory item failed - ${err.substring(0, 100)}`);
          continue;
        }

        // 2. Check if offer exists
        const offersRes = await fetch(
          `${EBAY_API_BASE}/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}&marketplace_id=${EBAY_MARKETPLACE}`,
          { headers: ebayHeaders(token) }
        );

        const offersData = offersRes.ok ? await offersRes.json() : null;
        const existingOffer = offersData?.offers?.[0];

        if (existingOffer) {
          // 3a. Update existing offer
          const updateRes = await fetch(
            `${EBAY_API_BASE}/sell/inventory/v1/offer/${existingOffer.offerId}`,
            {
              method: 'PUT',
              headers: ebayHeaders(token),
              body: JSON.stringify(buildOffer(product, sku)),
            }
          );
          if (updateRes.ok || updateRes.status === 204) {
            results.updated++;
          } else {
            const err = await updateRes.text();
            results.failed++;
            results.errors.push(`${sku}: offer update failed - ${err.substring(0, 100)}`);
          }
        } else {
          // 3b. Create new offer
          const createRes = await fetch(
            `${EBAY_API_BASE}/sell/inventory/v1/offer`,
            {
              method: 'POST',
              headers: ebayHeaders(token),
              body: JSON.stringify(buildOffer(product, sku)),
            }
          );

          if (!createRes.ok) {
            const err = await createRes.text();
            results.failed++;
            results.errors.push(`${sku}: offer create failed - ${err.substring(0, 100)}`);
            continue;
          }

          const offerData = await createRes.json();
          const offerId = offerData.offerId;

          // 4. Publish offer to make it live on eBay
          const publishRes = await fetch(
            `${EBAY_API_BASE}/sell/inventory/v1/offer/${offerId}/publish`,
            {
              method: 'POST',
              headers: ebayHeaders(token),
            }
          );

          if (publishRes.ok) {
            results.listed++;
          } else {
            const err = await publishRes.text();
            results.failed++;
            results.errors.push(`${sku}: publish failed - ${err.substring(0, 100)}`);
          }
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${sku}: ${err.message}`);
      }
    }

    return c.json({
      ok: true,
      processed: products.length,
      total: allProducts.length,
      offset,
      ...results,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// POST /ebay/sync-stock — update stock quantities on existing eBay listings
ebay.post('/sync-stock', async (c) => {
  try {
    const token = await getAccessToken();
    const allProducts: any[] = await kv.getByPrefix('products:');

    const results = { updated: 0, failed: 0, errors: [] as string[] };

    // Process in batches of 25 (eBay bulk inventory update limit)
    const batchSize = 25;
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);

      const requests = batch.map((product) => ({
        sku: `CP100-${product.code || product.id}`,
        shipToLocationAvailability: {
          quantity: product.inStock ? (product.stockLevel || 10) : 0,
        },
      }));

      const res = await fetch(
        `${EBAY_API_BASE}/sell/inventory/v1/bulk_update_price_quantity`,
        {
          method: 'POST',
          headers: ebayHeaders(token),
          body: JSON.stringify({ requests }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        for (const r of data.responses || []) {
          if (r.statusCode === 200 || r.statusCode === 204) {
            results.updated++;
          } else {
            results.failed++;
            results.errors.push(`${r.sku}: ${JSON.stringify(r.errors?.[0])}`);
          }
        }
      } else {
        const err = await res.text();
        results.failed += batch.length;
        results.errors.push(`Batch ${i}-${i + batchSize}: ${err.substring(0, 100)}`);
      }
    }

    return c.json({ ok: true, ...results });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// POST /ebay/sync-orders — pull eBay orders and save to KV
ebay.post('/sync-orders', async (c) => {
  try {
    const token = await getAccessToken();

    // Get orders from last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await fetch(
      `${EBAY_API_BASE}/sell/fulfillment/v1/order?filter=creationdate%3A%5B${encodeURIComponent(since)}..%5D&limit=50`,
      { headers: ebayHeaders(token) }
    );

    if (!res.ok) {
      const err = await res.text();
      return c.json({ ok: false, error: err }, 500);
    }

    const data = await res.json();
    const orders = data.orders || [];
    const saved: string[] = [];

    for (const order of orders) {
      const key = `ebay:order:${order.orderId}`;
      const existing = await kv.get(key);
      if (!existing) {
        // Map eBay order to CostPlus100 format
        const mappedOrder = {
          source: 'ebay',
          ebayOrderId: order.orderId,
          status: order.orderFulfillmentStatus,
          buyerUsername: order.buyer?.username,
          buyerEmail: order.buyer?.taxAddress?.email,
          createdAt: order.creationDate,
          total: order.pricingSummary?.total?.value,
          currency: order.pricingSummary?.total?.currency,
          shippingAddress: order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo,
          lineItems: order.lineItems?.map((item: any) => ({
            sku: item.sku,
            title: item.title,
            quantity: item.quantity,
            price: item.lineItemCost?.value,
          })),
        };
        await kv.set(key, mappedOrder);
        saved.push(order.orderId);
      }
    }

    return c.json({
      ok: true,
      total: orders.length,
      newOrders: saved.length,
      savedOrderIds: saved,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// GET /ebay/orders — list saved eBay orders
ebay.get('/orders', async (c) => {
  try {
    const orders = await kv.getByPrefix('ebay:order:');
    return c.json({ ok: true, count: orders.length, orders });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// GET /ebay/policies — list your eBay business policies (run once to get policy IDs)
ebay.get('/policies', async (c) => {
  try {
    const token = await getAccessToken();
    const [fulfillment, payment, returns] = await Promise.all([
      fetch(`${EBAY_API_BASE}/sell/account/v1/fulfillment_policy?marketplace_id=${EBAY_MARKETPLACE}`, { headers: ebayHeaders(token) }),
      fetch(`${EBAY_API_BASE}/sell/account/v1/payment_policy?marketplace_id=${EBAY_MARKETPLACE}`, { headers: ebayHeaders(token) }),
      fetch(`${EBAY_API_BASE}/sell/account/v1/return_policy?marketplace_id=${EBAY_MARKETPLACE}`, { headers: ebayHeaders(token) }),
    ]);

    return c.json({
      ok: true,
      fulfillmentPolicies: fulfillment.ok ? (await fulfillment.json()).fulfillmentPolicies : [],
      paymentPolicies: payment.ok ? (await payment.json()).paymentPolicies : [],
      returnPolicies: returns.ok ? (await returns.json()).returnPolicies : [],
    });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// GET /ebay/locations — list your merchant locations
ebay.get('/locations', async (c) => {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${EBAY_API_BASE}/sell/inventory/v1/location`, { headers: ebayHeaders(token) });
    const data = res.ok ? await res.json() : await res.text();
    return c.json({ ok: res.ok, data });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// POST /ebay/create-location — create a merchant location (run once)
ebay.post('/create-location', async (c) => {
  try {
    const token = await getAccessToken();
    const locationKey = 'costplus100-au';

    const res = await fetch(
      `${EBAY_API_BASE}/sell/inventory/v1/location/${locationKey}`,
      {
        method: 'POST',
        headers: ebayHeaders(token),
        body: JSON.stringify({
          location: {
            address: {
              addressLine1: '4 Spring Street',
              city: 'Mittagong',
              stateOrProvince: 'NSW',
              postalCode: '2575',
              country: 'AU',
            },
          },
          locationInstructions: 'Contact us for pickup arrangements',
          name: 'Cost Plus 100',
          merchantLocationStatus: 'ENABLED',
          locationTypes: ['WAREHOUSE'],
        }),
      }
    );

    const data = res.ok ? { locationKey } : await res.text();
    return c.json({ ok: res.ok, data });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

export default ebay;
