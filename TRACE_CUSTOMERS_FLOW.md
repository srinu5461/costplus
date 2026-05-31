# COMPLETE TRACE: What Happens When You Click "Customers" Tab

## 📍 STEP 1: FRONTEND COMPONENT LOADS
**File**: `/src/app/pages/admin/CustomersManager.tsx`

```typescript
// Line 12: API endpoint configuration
const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;
// Resolves to: https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049

// Line 40: useEffect runs on component mount → calls fetchCustomers()
useEffect(() => {
  fetchCustomers();
}, []);

// Line 55-77: fetchCustomers function executes
const fetchCustomers = async () => {
  // Makes GET request to: 
  // https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/customers
  const response = await fetch(`${API_URL}/customers`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
    }
  });
}
```

**Request Details:**
- **Method**: GET
- **URL**: `https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/customers`
- **Headers**: Authorization with anon key

---

## 📍 STEP 2: SUPABASE ROUTES TO EDGE FUNCTION
**Supabase Edge Function**: `make-server-d1fbc049`
- Supabase sees the URL path and routes to the deployed Edge Function

---

## 📍 STEP 3: EDGE FUNCTION INDEX ROUTER
**File**: `/supabase/functions/server/index.tsx`

```typescript
// Line 8: Import customers router
import customers from './customers.tsx';

// Line 3304: Route setup
app.route('/make-server-d1fbc049/customers', customers);
```

**What this does:**
- When request comes to `/make-server-d1fbc049/customers`
- Routes it to the `customers` router (from customers.tsx)

---

## 📍 STEP 4: CUSTOMERS ROUTER HANDLER
**File**: `/supabase/functions/server/customers.tsx`

```typescript
// Line 3: Import KV store module
import * as kv from './kv_store.tsx';
// ⚠️ CRITICAL: This points to kv_store.tsx which uses table kv_store_d1fbc049

// Line 17: GET '/' handler - this catches GET /customers requests
customers.get('/', async (c) => {
  // Line 24: Fetch from Supabase Auth (for auth-based customers)
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  
  // Line 62: Fetch from KV store (for KV-based customers)
  const kvCustomersColon = await kv.getByPrefix('customer:');
  // ⚠️ THIS IS THE CRITICAL LINE - calls getByPrefix with 'customer:'
});
```

---

## 📍 STEP 5: KV STORE MODULE EXECUTES QUERY
**File**: `/supabase/functions/server/kv_store.tsx`

```typescript
// Lines 4-7: Table schema definition
/* Table schema:
CREATE TABLE kv_store_d1fbc049 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
*/

// Lines 80-86: getByPrefix function
export const getByPrefix = async (prefix: string): Promise<any[]> => {
  const supabase = client()
  const { data, error } = await supabase
    .from("kv_store_d1fbc049")  // ⚠️ TABLE NAME
    .select("key, value")        // ⚠️ COLUMNS SELECTED
    .like("key", prefix + "%");  // ⚠️ WHERE CLAUSE
  if (error) throw new Error(error.message);
  return data?.map((d) => d.value) ?? [];  // ⚠️ RETURNS ONLY VALUES
}
```

**When called with prefix = 'customer:':**

---

## 📍 STEP 6: DATABASE QUERY EXECUTES

**Database**: Supabase PostgreSQL
**Table**: `kv_store_d1fbc049`
**Columns**: 
  - `key` (TEXT PRIMARY KEY)
  - `value` (JSONB)

**SQL Query Executed**:
```sql
SELECT key, value 
FROM kv_store_d1fbc049 
WHERE key LIKE 'customer:%'
```

**What this returns** (example):
```
key                              | value
---------------------------------|---------------------------------------
customer:abc123                  | {"id":"abc123","email":"john@...",...}
customer:def456                  | {"id":"def456","email":"jane@...",...}
customer:email:john@example.com  | "abc123"  <-- STRING, not object!
customer:email:jane@example.com  | "def456"  <-- STRING, not object!
customer:list                    | ["abc123", "def456"]  <-- ARRAY!
```

The `getByPrefix` function returns ONLY the `value` column (line 86), so it returns:
```javascript
[
  {"id":"abc123","email":"john@...",...},  // ✅ Customer object
  {"id":"def456","email":"jane@...",...},  // ✅ Customer object
  "abc123",                                // ❌ Email index string
  "def456",                                // ❌ Email index string
  ["abc123", "def456"]                     // ❌ Customer list array
]
```

---

## 📍 STEP 7: FILTERING IN CUSTOMERS ROUTER
**File**: `/supabase/functions/server/customers.tsx`

```typescript
// Lines 66-76: Filter the results
const actualKvCustomers = kvCustomersColon.filter(item => {
  // Email indexes are just UUID strings, not customer objects
  // customer:list is an array, not an object with id
  // We only want customer objects with id and email properties
  return typeof item === 'object' && 
         item !== null && 
         item.id && 
         typeof item.email === 'string' &&
         !Array.isArray(item);
});
```

**After filtering**, only actual customer objects remain:
```javascript
[
  {"id":"abc123","email":"john@example.com",...},
  {"id":"def456","email":"jane@example.com",...}
]
```

---

## 📍 STEP 8: RESPONSE SENT TO FRONTEND
**File**: `/supabase/functions/server/customers.tsx`

```typescript
// Line 124: Return JSON response
return c.json({ customers: sortedCustomers });
```

**Response**:
```json
{
  "customers": [
    {
      "id": "abc123",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "can_see_cost_price": false,
      "discount_percentage": 0,
      "created_at": "2024-01-01T00:00:00Z",
      "source": "kv"
    },
    ...
  ]
}
```

---

## 📍 STEP 9: FRONTEND UPDATES STATE
**File**: `/src/app/pages/admin/CustomersManager.tsx`

```typescript
// Lines 110-111: Update React state
setCustomers(data.customers || []);
setFilteredCustomers(data.customers || []);
// Component re-renders with customer data
```

---

## 🔍 SUMMARY: THE COMPLETE DATA FLOW

1. **Browser** → GET `https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/customers`
2. **Supabase** → Routes to Edge Function `make-server-d1fbc049`
3. **index.tsx** → Routes `/make-server-d1fbc049/customers` to `customers` router
4. **customers.tsx** → Calls `kv.getByPrefix('customer:')`
5. **kv_store.tsx** → Queries database:
   ```sql
   SELECT key, value FROM kv_store_d1fbc049 WHERE key LIKE 'customer:%'
   ```
6. **Database** → Returns all rows with keys starting with `customer:`
7. **kv_store.tsx** → Returns only the `value` column (JSONB)
8. **customers.tsx** → Filters out email indexes and customer list array
9. **customers.tsx** → Merges with Auth users, sorts, and returns JSON
10. **Browser** → Updates state and displays customers in table

---

## ⚠️ KEY FILES & THEIR ROLES

| File | Purpose | What It Does |
|------|---------|--------------|
| `/src/app/pages/admin/CustomersManager.tsx` | Frontend UI | Makes GET request to API |
| `/supabase/functions/server/index.tsx` | Router | Routes `/customers` to customers.tsx |
| `/supabase/functions/server/customers.tsx` | API Handler | Fetches from Auth + KV, filters, returns JSON |
| `/supabase/functions/server/kv_store.tsx` | Database Interface | Executes SQL queries on `kv_store_d1fbc049` |
| **Database Table**: `kv_store_d1fbc049` | Data Storage | Stores customer data as key-value pairs |

---

## 📊 DATABASE TABLE STRUCTURE

**Table**: `kv_store_d1fbc049`

| Column | Type | Description |
|--------|------|-------------|
| `key` | TEXT PRIMARY KEY | Unique identifier (e.g., "customer:abc123") |
| `value` | JSONB | JSON data (customer object, string, or array) |

**Example Data**:
```
key                              | value
---------------------------------|---------------------------------------
customer:abc123                  | {"id":"abc123","first_name":"John",...}
customer:email:john@example.com  | "abc123"
customer:list                    | ["abc123", "def456"]
```
