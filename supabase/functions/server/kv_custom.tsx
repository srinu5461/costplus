import { createClient } from "jsr:@supabase/supabase-js@2";

const client = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Using the old table that already has data and great indexes
const TABLE_NAME = "kv_store_577b3f26";

export const set = async (key: string, value: any): Promise<void> => {
  const supabase = client();
  
  // Log the size of the value being saved
  const valueStr = JSON.stringify(value);
  const sizeKB = (valueStr.length / 1024).toFixed(2);
  console.log(`KV Set: key="${key}", size=${sizeKB}KB`);
  
  // Add timeout to the database operation itself
  const { error } = await Promise.race([
    supabase.from(TABLE_NAME).upsert({
      key,
      value,
      updated_at: new Date().toISOString()
    }),
    new Promise<{ error: any }>((_, reject) => 
      setTimeout(() => reject(new Error(`Database operation timeout for key="${key}"`)), 10000)
    )
  ]);
  
  if (error) {
    console.error(`KV Set Error for key="${key}":`, error);
    throw new Error(`KV Set Error: ${error.message}`);
  }
  
  console.log(`KV Set successful for key="${key}"`);
};

export const get = async (key: string): Promise<any> => {
  const supabase = client();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw new Error(`KV Get Error: ${error.message}`);
  }

  // Log when fetching products to debug caching issues
  if (key.startsWith('products:')) {
    console.log(`KV Get: key="${key}", found=${!!data}, updated_at=${data?.updated_at}`);
  }

  return data?.value;
};

export const del = async (key: string): Promise<void> => {
  const supabase = client();
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("key", key);
  
  if (error) {
    throw new Error(`KV Del Error: ${error.message}`);
  }
};

export const mset = async (keys: string[], values: any[]): Promise<void> => {
  const supabase = client();
  const records = keys.map((k, i) => ({
    key: k,
    value: values[i],
    updated_at: new Date().toISOString()
  }));
  
  // Log the batch size
  const totalSizeKB = (JSON.stringify(records).length / 1024).toFixed(2);
  console.log(`KV MSet: ${keys.length} records, total size=${totalSizeKB}KB`);
  
  // Add timeout protection
  const { error } = await Promise.race([
    supabase.from(TABLE_NAME).upsert(records),
    new Promise<{ error: any }>((_, reject) => 
      setTimeout(() => reject(new Error(`Database batch upsert timeout for ${keys.length} records`)), 15000)
    )
  ]);
  
  if (error) {
    console.error(`KV MSet Error for ${keys.length} records:`, error);
    throw new Error(`KV MSet Error: ${error.message}`);
  }
  
  console.log(`KV MSet successful for ${keys.length} records`);
};

export const mget = async (keys: string[]): Promise<any[]> => {
  const supabase = client();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("value")
    .in("key", keys);
  
  if (error) {
    throw new Error(`KV MGet Error: ${error.message}`);
  }
  return data?.map(d => d.value) || [];
};

export const mdel = async (keys: string[]): Promise<void> => {
  const supabase = client();
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .in("key", keys);
  
  if (error) {
    throw new Error(`KV MDel Error: ${error.message}`);
  }
};

// Find a single product by a code field without loading all products into memory
export const findProductByCode = async (code: string): Promise<{ key: string; value: any } | null> => {
  const supabase = client();
  // Try each common code field via PostgREST JSON filtering
  for (const field of ['code', 'sku', 'productCode', 'id']) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('key, value')
      .like('key', 'products:%')
      .filter(`value->>` + field, 'eq', code)
      .limit(1)
      .maybeSingle();
    if (!error && data) return { key: data.key, value: data.value };
  }
  return null;
};

// Count products without loading values
export const countByPrefix = async (prefix: string): Promise<number> => {
  const supabase = client();
  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select('key', { count: 'exact', head: true })
    .like('key', `${prefix}%`);
  if (error) throw new Error(`KV CountByPrefix Error: ${error.message}`);
  return count || 0;
};

// Paginated fetch — returns one page of values
export const getByPrefixPaged = async (prefix: string, offset: number, limit: number): Promise<any[]> => {
  const supabase = client();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('value')
    .like('key', `${prefix}%`)
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`KV GetByPrefixPaged Error: ${error.message}`);
  return (data || []).map(d => d.value);
};

export const getByPrefix = async (prefix: string): Promise<any[]> => {
  const supabase = client();
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let page = 0;
  let hasMore = true;

  console.log(`KV GetByPrefix: Starting fetch for prefix="${prefix}"`);

  while (hasMore) {
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("key, value, updated_at")
      .like("key", `${prefix}%`)
      .range(start, end)
      .order('updated_at', { ascending: false }); // Get most recently updated first

    if (error) {
      throw new Error(`KV GetByPrefix Error: ${error.message}`);
    }

    if (data && data.length > 0) {
      console.log(`KV GetByPrefix: Page ${page} - fetched ${data.length} records, most recent update: ${data[0]?.updated_at}`);
      allData = allData.concat(data.map(d => d.value));
      hasMore = data.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`KV GetByPrefix: Completed - total ${allData.length} records for prefix="${prefix}"`);
  return allData;
};

export const getByPrefixWithKeys = async (prefix: string): Promise<Array<{ key: string; value: any }>> => {
  const supabase = client();
  const PAGE_SIZE = 1000;
  let allData: Array<{ key: string; value: any }> = [];
  let page = 0;
  let hasMore = true;
  
  while (hasMore) {
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("key, value")
      .like("key", `${prefix}%`)
      .range(start, end);
    
    if (error) {
      throw new Error(`KV GetByPrefix Error: ${error.message}`);
    }
    
    if (data && data.length > 0) {
      allData = allData.concat(data);
      hasMore = data.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }
  
  return allData;
};
// ===== PRODUCT FILTERING HELPERS =====

// Helper function to check if an item is a valid product (not sections/categories/metadata)
export const isValidProduct = (item: any): boolean => {
  if (!item || typeof item !== 'object') {
    return false;
  }

  // Must have a valid name (not empty, not "Unnamed Product")
  if (!item.name || item.name === '' || item.name === 'Unnamed Product' || item.name === 'New Product') {
    return false;
  }

  // Must have at least one identifier
  if (!item.code && !item.id && !item.sku && !item.productCode) {
    return false;
  }

  // Must have price field defined (can be 0, but must exist)
  if (item.price === undefined || item.price === null) {
    return false;
  }

  // If it has "sections" or "categories" fields, it's metadata
  if (item.sections || item.categories || item.sectionsConfig || item.featured || item.popular || item.promotion) {
    return false;
  }

  return true;
};

// Get only valid products (excludes sections/categories/metadata)
export const getProducts = async (): Promise<any[]> => {
  const allData = await getByPrefix('products:');
  return allData.filter(isValidProduct);
};
